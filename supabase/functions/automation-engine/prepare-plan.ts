// prepare-plan.ts — per-rule plan preparation.
// Port of prepareRulePlan + buildVariables + fetchTemplate + substituteVars
// from modules/crm/crm-automation-engine.js. Service-role DB; explicit
// tenant_id filter on every query (Iron Rule 22).

import { resolveRecipients, type Lead } from "./recipients.ts";
import { prepareQueueSend } from "./queue-send.ts";

export interface PreparedPlan {
  items: unknown[];
  skipped: number;
  resolvedLeadIds: string[];
  queued: number;
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
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    lead_id: lead.id || "",
    unsubscribe_url: "[קישור הסרה — יצורף אוטומטית]",
  };
  // deno-lint-ignore no-explicit-any
  let evt = (triggerData as any).event;
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  if (!evt && eventId) {
    const r = await db.from("crm_events")
      .select("name, event_date, start_time, location_address, registration_form_url")
      .eq("id", eventId).eq("tenant_id", tenantId).single();
    if (!r.error) evt = r.data;
  }
  if (evt) {
    vars.event_name = evt.name || "";
    vars.event_date = formatDate(evt.event_date) || "";
    vars.event_time = evt.start_time || "";
    vars.event_location = evt.location_address || "";
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

export async function prepareRulePlan(
  db: Db, tenantId: string,
  rule: Rule, triggerData: Record<string, unknown>,
  tplCache: Map<string, unknown>, runId: string | null,
  mode: "evaluate" | "dispatch" = "dispatch",
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
  const resolvedLeadIds = leads.map((l) => l.id);
  if (!leads.length) return { items: [], skipped: 0, resolvedLeadIds, queued: 0 };
  if (!tplBase) return { items: [], skipped: 0, resolvedLeadIds, queued: 0 };

  const items: unknown[] = [];
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  for (const lead of leads) {
    const vars = await buildVariables(db, tenantId, triggerData, lead);
    for (const ch of channels) {
      if (ch === "email" && !lead.email) continue;
      if (ch === "sms"   && !lead.phone) continue;
      const tpl = await fetchTemplate(db, tenantId, tplCache, tplBase, ch, language);
      const composedBody = tpl
        ? substituteVars(tpl.body, vars)
        : `[תבנית לא נמצאה: ${tplBase}_${ch}_${language}]`;
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
  return { items, skipped: 0, resolvedLeadIds, queued: 0 };
}
