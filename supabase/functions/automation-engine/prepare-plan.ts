// prepare-plan.ts — per-rule plan preparation.
// Port of prepareRulePlan + buildVariables + fetchTemplate + substituteVars
// from modules/crm/crm-automation-engine.js. Service-role DB; explicit
// tenant_id filter on every query (Iron Rule 22).

import { resolveRecipients, type Lead } from "./recipients.ts";
import { prepareQueueSend } from "./queue-send.ts";
// M4_TEMPLATE_VALIDATION_UNIFIED (2026-05-14 Phase 2 P2.3): pre-enqueue
// scan so doomed templates (any %unsubstituted_var% surviving plan-time
// substitution) never reach crm_message_queue. Closes KNOWLEDGE_MAP Layer 6
// gap; replicates send-message's at-dispatch fail-CLOSED gate at plan-time.
import { validateTemplateOutput, type ValidationResult } from "../_shared/template-validation.ts";
// M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX (2026-05-19, SPEC 3): close the
// pre-enqueue rejection gap by populating event_day_of_week, event_deposit_amount,
// event_max_attendees from the same helpers send-message uses at dispatch time.
import {
  hebrewDayOfWeek,
  formatDepositAmount,
  formatMaxAttendees,
} from "../_shared/event-variables.ts";

export interface PreparedPlan {
  items: unknown[];
  skipped: number;
  resolvedLeadIds: string[];
  queued: number;
  // M4_TEMPLATE_VALIDATION_UNIFIED — number of plan items rejected pre-enqueue
  // by validateTemplateOutput. Counted SEPARATELY from `skipped` so callers
  // can tell apart "no recipients / no template / channel skip" (skipped)
  // vs "doomed template would have produced unsubstituted_placeholder"
  // (validation_failures). Engine layer aggregates these into
  // EvaluateResult.validation_failures and writes a per-rule last_error.
  validation_failures?: number;
  // String summary for the rule's last_error column (engine layer reads this
  // and writes to crm_automation_rules.last_error WHERE id=rule.id AND
  // tenant_id=tenantId). Format: 'unsubstituted_placeholder: X,Y (slug=foo)'
  // or 'payment_url_mismatch: payment_link_missing_or_mismatch:50 (slug=foo)'.
  // Null/undefined when no validation failure occurred for this rule.
  validation_error_summary?: string | null;
}

// deno-lint-ignore no-explicit-any
type Db = any;

interface Rule {
  id: string;
  name?: string;
  action_type: string;
  // deno-lint-ignore no-explicit-any
  action_config: any;
}

// Mirror of CrmHelpers.formatDate (DD.MM.YYYY) — used by browser
// buildVariables. Date format unified per SESSION_CONTEXT (2026-05-01 B3).
function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(ymd);
  return `${m[3]}.${m[2]}.${m[1]}`;
}

async function buildVariables(
  db: Db, tenantId: string,
  triggerData: Record<string, unknown>, lead: Lead,
  // M4_SCE_CONSUMER_RACE_FIX (2026-05-21): optional pre-loaded event row.
  // The eventId is identical for every lead in an event-status-change trigger,
  // so the caller (prepareRulePlan) loads the event ONCE and passes it here.
  // Avoids N×SELECT-by-id at scale (was 5,000 round-trips on the 5K-lead
  // race verification; now 1).
  // deno-lint-ignore no-explicit-any
  cachedEvent?: any,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    lead_id: lead.id || "",
    unsubscribe_url: "[קישור הסרה — יצורף אוטומטית]",
  };
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  // deno-lint-ignore no-explicit-any
  let evt: any = cachedEvent || null;
  if (!evt && eventId) {
    const r = await db.from("crm_events")
      .select("name, event_date, start_time, location_address, registration_form_url, max_capacity, booking_fee")
      .eq("id", eventId).eq("tenant_id", tenantId).single();
    if (!r.error) evt = r.data;
  }
  // If no eventId but caller pre-loaded a partial event (legacy callers with
  // no DB roundtrip available), fall back to the partial object — event-context
  // vars will be empty for missing columns, safer than dropping the whole run.
  if (!evt) evt = (triggerData as any).event;
  if (evt) {
    vars.event_name = evt.name || "";
    vars.event_date = formatDate(evt.event_date) || "";
    vars.event_time = evt.start_time || "";
    vars.event_location = evt.location_address || "";
    // SPEC 3: the 3 keys that were unresolved pre-fix. Shared helpers handle
    // NULL/non-numeric gracefully (return "" rather than "NaN" / "null").
    vars.event_day_of_week    = evt.event_date ? hebrewDayOfWeek(evt.event_date) : "";
    vars.event_deposit_amount = formatDepositAmount(evt.booking_fee);
    vars.event_max_attendees  = formatMaxAttendees(evt.max_capacity);
    const regUrl = evt.registration_form_url || "";
    const isLegacyUrl = regUrl.indexOf("r.html") !== -1 || regUrl.indexOf("app.opticalis") !== -1;
    if (regUrl && !isLegacyUrl) {
      vars.registration_url = regUrl;
    } else if (eventId) {
      vars.registration_url = "[קישור הרשמה — יצורף אוטומטית]";
    }
  }
  return vars;
}

interface Template { id: string; slug: string; body: string; subject: string; }

async function fetchTemplate(
  db: Db, tenantId: string,
  cache: Map<string, unknown>,
  base: string, channel: string, language: string,
): Promise<Template | null> {
  const lang = language || "he";
  const key = `${base}|${channel}|${lang}`;
  if (cache.has(key)) return cache.get(key) as Template | null;
  const fullSlug = `${base}_${channel}_${lang}`;
  const r = await db.from("crm_message_templates")
    .select("id, slug, body, subject")
    .eq("tenant_id", tenantId).eq("slug", fullSlug).eq("is_active", true)
    .maybeSingle();
  const tpl = (!r.error && r.data) ? r.data as Template : null;
  cache.set(key, tpl);
  return tpl;
}

function substituteVars(text: string, vars: Record<string, string>): string {
  let out = String(text || "");
  Object.keys(vars).forEach((k) => {
    out = out.replace(new RegExp(`%${k}%`, "g"), String(vars[k] == null ? "" : vars[k]));
  });
  return out;
}

// M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21): optional opts for the lazy preview
// path. skipBodyComposition stops the inner template-substitution + validation
// loop (items return with composedBody=null). leadIdFilter narrows to a single
// lead. channelFilter narrows to a single channel. All three are no-ops when
// undefined — existing callers (engine.ts evaluate/dispatch) get the prior
// behavior with zero changes.
export interface PrepareRulePlanOpts {
  skipBodyComposition?: boolean;
  leadIdFilter?: string;
  channelFilter?: string;
}

export async function prepareRulePlan(
  db: Db, tenantId: string,
  rule: Rule, triggerData: Record<string, unknown>,
  tplCache: Map<string, unknown>, runId: string | null,
  mode: "evaluate" | "dispatch" = "dispatch",
  opts: PrepareRulePlanOpts = {},
): Promise<PreparedPlan> {
  const cfg = rule.action_config || {};

  if (rule.action_type === "queue_send") {
    // ATOMIC_CONFIRMATION_FLOW Part A: queue_send writes to crm_message_queue.
    // Skip in evaluate mode — those writes are side effects gated on operator
    // confirmation. Modal preview doesn't show queue_send items anyway.
    if (mode === "evaluate") {
      return { items: [], skipped: 0, resolvedLeadIds: [], queued: 0 };
    }
    try {
      const qs = await prepareQueueSend(db, tenantId, rule, triggerData, runId);
      return { items: [], skipped: 0, resolvedLeadIds: qs.leadIds, queued: qs.queued };
    } catch (e) {
      console.error("automation-engine queue_send:", (e as Error).message);
      return { items: [], skipped: 1, resolvedLeadIds: [], queued: 0 };
    }
  }

  if (rule.action_type !== "send_message") {
    console.warn("automation-engine: unsupported action_type", rule.action_type);
    return { items: [], skipped: 1, resolvedLeadIds: [], queued: 0 };
  }

  const tplBase: string | null = cfg.template_slug || null;
  const channels: string[] = Array.isArray(cfg.channels)
    ? cfg.channels
    : (cfg.channel ? [cfg.channel] : ["sms"]);
  const recipientType: string = cfg.recipient_type || "trigger_lead";
  const language: string = cfg.language || "he";
  const hasPostAction = !!cfg.post_action_status_update;

  if (!tplBase && !hasPostAction) {
    console.warn("automation-engine: rule has no template_slug and no post_action_status_update", rule.id);
    return { items: [], skipped: 1, resolvedLeadIds: [], queued: 0 };
  }

  let leads: Lead[];
  try {
    leads = await resolveRecipients(db, tenantId, recipientType, triggerData, cfg);
  } catch (e) {
    console.error("automation-engine prepareRulePlan recipients:", (e as Error).message);
    return { items: [], skipped: 0, resolvedLeadIds: [], queued: 0 };
  }
  // M4_DISPATCH_PREVIEW_LAZY_ROWS: narrow to a single lead when leadIdFilter set
  // (for previewRecipientBody's per-row build path).
  if (opts.leadIdFilter) {
    leads = leads.filter((l) => l.id === opts.leadIdFilter);
  }
  const resolvedLeadIds = leads.map((l) => l.id);
  if (!leads.length) return { items: [], skipped: 0, resolvedLeadIds, queued: 0 };
  if (!tplBase) {
    return { items: [], skipped: 0, resolvedLeadIds, queued: 0 };
  }

  const items: unknown[] = [];
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;

  // M4_SCE_CONSUMER_RACE_FIX (2026-05-21): pre-load the event row ONCE per
  // prepareRulePlan invocation (the eventId is identical for every lead in an
  // event-status-change trigger). Replaces per-lead SELECT inside
  // buildVariables. At 5,000 leads × 2 channels the prior shape did 5,000
  // SELECT-by-id round-trips inside the EF, blowing past the function timeout.
  // deno-lint-ignore no-explicit-any
  let cachedEvent: any = null;
  if (!opts.skipBodyComposition && eventId) {
    const r = await db.from("crm_events")
      .select("name, event_date, start_time, location_address, registration_form_url, max_capacity, booking_fee")
      .eq("id", eventId).eq("tenant_id", tenantId).single();
    if (!r.error) cachedEvent = r.data;
  }

  // M4_TEMPLATE_VALIDATION_UNIFIED: per-rule accumulators for pre-enqueue
  // validation failures. We rejection-log to crm_message_log AND surface the
  // missing-placeholder set on the rule's last_error column (via engine.ts).
  let validationFailures = 0;
  const failedMissing = new Set<string>();
  let firstPaymentError: string | null = null;
  for (const lead of leads) {
    // M4_DISPATCH_PREVIEW_LAZY_ROWS: skip the expensive buildVariables call too
    // when bodies aren't being composed — buildVariables hits the event row
    // for every lead via fetchTemplate's parent context. Empty vars are fine
    // when composedBody stays null.
    const vars = opts.skipBodyComposition
      ? {} as Record<string, string>
      : await buildVariables(db, tenantId, triggerData, lead, cachedEvent);
    for (const ch of channels) {
      if (ch === "email" && !lead.email) continue;
      if (ch === "sms"   && !lead.phone) continue;
      // M4_DISPATCH_PREVIEW_LAZY_ROWS: narrow to a single channel when channelFilter set.
      if (opts.channelFilter && ch !== opts.channelFilter) continue;
      // M4_DISPATCH_PREVIEW_LAZY_ROWS: in skipBodyComposition mode, push the
      // recipient row with composedBody=null + no template fetch + no validation.
      // The modal calls previewRecipientBody per-row click to materialize the body.
      if (opts.skipBodyComposition) {
        items.push({
          rule_name: rule.name || "",
          template_slug: tplBase,
          template_id: null,
          channel: ch,
          recipient: { name: lead.full_name || "", phone: lead.phone || "", email: lead.email || "" },
          variables: {},
          composedBody: null,
          lead_id: lead.id,
          event_id: eventId,
          language,
          skip_auto_promote: hasPostAction || cfg.skip_auto_promote === true,
        });
        continue;
      }
      const tpl = await fetchTemplate(db, tenantId, tplCache, tplBase, ch, language);
      const composedBody = tpl
        ? substituteVars(tpl.body, vars)
        : `[תבנית לא נמצאה: ${tplBase}_${ch}_${language}]`;
      // Subject substitution is not performed at plan-time today (send-message
      // EF re-substitutes from vars at dispatch); however the queue row stores
      // a frozen body for the send_message path. Scan body only — matches the
      // surface dispatchPlanDirect freezes onto the queue.
      const verdict: ValidationResult = validateTemplateOutput(composedBody);
      if (!verdict.ok) {
        // Per-failure crm_message_log row — same shape as send-message at-dispatch
        // failure path. Iron Rule 22 defense-in-depth: explicit tenant_id on insert.
        const errMsg = verdict.error === "unsubstituted_placeholder"
          ? `unsubstituted_placeholder: ${(verdict.missing || []).join(",")}`
          : (verdict.message || "validation_failed");
        try {
          await db.from("crm_message_log").insert({
            tenant_id: tenantId,
            lead_id: lead.id,
            event_id: eventId,
            run_id: runId,
            template_id: tpl ? tpl.id : null,
            channel: ch,
            content: composedBody,
            status: "rejected",
            error_message: errMsg,
          });
        } catch (e) {
          console.error("automation-engine validate-reject log:", (e as Error).message);
        }
        validationFailures += 1;
        if (verdict.error === "unsubstituted_placeholder") {
          (verdict.missing || []).forEach((k) => failedMissing.add(k));
        } else if (verdict.error === "payment_url_mismatch" && !firstPaymentError) {
          firstPaymentError = verdict.message || "payment_url_mismatch";
        }
        // Do NOT push to items — this is the whole point: doomed messages
        // never reach crm_message_queue.
        continue;
      }
      items.push({
        rule_name: rule.name || "",
        template_slug: tplBase,
        template_id: tpl ? tpl.id : null,
        channel: ch,
        recipient: { name: lead.full_name || "", phone: lead.phone || "", email: lead.email || "" },
        variables: vars,
        composedBody,
        lead_id: lead.id,
        event_id: eventId,
        language,
        skip_auto_promote: hasPostAction || cfg.skip_auto_promote === true,
      });
    }
  }
  // Build the rule-level last_error string. Engine layer will UPDATE the rule
  // (or CLEAR to NULL when validationFailures === 0). Format chosen for
  // operator readability — slug + concrete missing-var names.
  let summary: string | null = null;
  if (validationFailures > 0) {
    if (firstPaymentError) {
      summary = `${firstPaymentError} (slug=${tplBase})`;
    } else {
      const missingList = Array.from(failedMissing).sort().join(",");
      summary = `unsubstituted_placeholder: ${missingList} (slug=${tplBase})`;
    }
  }
  return {
    items,
    skipped: 0,
    resolvedLeadIds,
    queued: 0,
    validation_failures: validationFailures,
    validation_error_summary: summary,
  };
}
