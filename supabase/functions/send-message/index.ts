import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  injectAutoUrls,
  injectEventVariables,
  scanForPaymentUrlMismatch,
  scanForUnsubstitutedPlaceholders,
  withDisplayPhone,
} from "./event-variables.ts";
import { injectLeadVariables } from "./lead-variables.ts";
import { writeDispatchAndSend } from "./dispatch.ts";
import { phoneAllowed, emailAllowed, whatsappAllowed } from "./allowlists.ts";

// send-message — CRM message dispatch (P3c+P4 Architecture v3).
// Flow: POST {tenant_id, lead_id, channel, template_slug|body, variables} →
// validate → fetch template → substitute vars → log(pending) → Make webhook
// → log(sent|failed) → return. Make is a 3-module send-only pipe (Webhook →
// Router → SMS|Email); all business logic lives here.
//
// Test-mode allowlists for SMS (tenants.test_mode_sms_allowlist, C001 2026-05-03)
// and email (tenants.ui_config.test_mode_email_allowlist, DEMO_EMAIL_ALLOWLIST_INFRA
// 2026-05-11) live in ./allowlists.ts. Empty/NULL = production mode (send to all);
// non-empty = filter recipients; fail-CLOSED on lookup error or malformed JSON.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Make "Optic Up — Send Message" (scenario 9104395, webhook 4068609). Same
// URL as MAKE_SEND_WEBHOOK in crm-messaging-config.js. Override via secret
// MAKE_SEND_MESSAGE_WEBHOOK_URL to point at staging without a redeploy.
const MAKE_WEBHOOK_URL_DEFAULT =
  "https://hook.eu2.make.com/n7y5m7x9m9yn4uqo3ielqsobdn8s5nui";
const MAKE_WEBHOOK_URL =
  Deno.env.get("MAKE_SEND_MESSAGE_WEBHOOK_URL") || MAKE_WEBHOOK_URL_DEFAULT;

const DEFAULT_LANGUAGE = "he";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Helpers ---

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ ok: false, error: message }, status);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/**
 * Replace %name% / %phone% / ... placeholders with values from `vars`.
 * Missing keys are left as-is (e.g., "%unset%") so they are visible if
 * a caller forgot to pass a variable — easier to spot than an empty string.
 */
function substituteVariables(
  text: string,
  vars: Record<string, unknown>,
): string {
  return text.replace(/%(\w+)%/g, (match, key) => {
    const v = vars[key];
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return match;
  });
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // --- Parse body ---
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const tenantId = trimOrNull(payload.tenant_id);
  const leadId = trimOrNull(payload.lead_id);
  const eventId = trimOrNull(payload.event_id);
  const runId = trimOrNull(payload.run_id);
  // 2026-05-14 M4_BROADCAST_ID_PROPAGATION (P1.2) — propagated from dispatch-queue
  // when this dispatch was triggered by draining a broadcast queue row. NULL for
  // automation runs, manual sends, event-register lead-intake auto-message.
  const broadcastId = trimOrNull(payload.broadcast_id);
  const channel = trimOrNull(payload.channel);
  const templateSlug = trimOrNull(payload.template_slug);
  const rawBody = trimOrNull(payload.body);
  const rawSubject = trimOrNull(payload.subject);
  const language = trimOrNull(payload.language) || DEFAULT_LANGUAGE;
  const variables =
    payload.variables && typeof payload.variables === "object"
      ? (payload.variables as Record<string, unknown>)
      : {};

  // --- Validate ---
  if (!tenantId) return errorResponse("Missing tenant_id", 400);
  if (!leadId) return errorResponse("Missing lead_id", 400);
  if (!channel || !["sms", "email", "whatsapp"].includes(channel)) {
    return errorResponse("Invalid channel (must be sms, email, or whatsapp)", 400);
  }
  if (!templateSlug && !rawBody) {
    return errorResponse("Missing template_slug or body", 400);
  }
  if (templateSlug && rawBody) {
    return errorResponse("Provide template_slug OR body, not both", 400);
  }

  // --- Service-role DB client (bypasses RLS, internal-only) ---
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Inject lead vars (P31 commit 2): name, phone, email, lead_id from
  // crm_leads. Caller-wins — only fills gaps. Unconditional on every dispatch
  // (not gated on event_id) so direct-send paths can never produce a message
  // with literal %name%. Returns the lead's suppression fields for the gate
  // immediately below.
  const supRow = await injectLeadVariables(db, leadId, tenantId, variables);

  // Suppression: Layer 1 per-lead (M4_UNSUB_SUPPRESSION_CRIT — CAN-SPAM, IR22) +
  // Layer 2 contact (M4_SUPPRESSION_LIST 2026-05-22 — blocks NEW lead with prior opt-out's email/phone).
  async function rejectLog(err: string) {
    await db.from("crm_message_log").insert({ tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId, broadcast_id: broadcastId, template_id: null, channel, content: "", status: "rejected", error_message: err });
    return jsonResponse({ ok: false, error: err }, 200);
  }
  if (supRow && (supRow.unsubscribed_at != null || supRow.status === "unsubscribed")) return rejectLog("lead_unsubscribed");
  if (supRow && (supRow.email || supRow.phone)) {
    const sc = await db.rpc("crm_check_contact_suppressed", { p_tenant_id: tenantId, p_email: supRow.email ?? null, p_phone: supRow.phone ?? null });
    if (sc.data === true) return rejectLog("contact_suppressed");
  }

  // --- Inject auto URLs (unsubscribe + registration) and event-derived vars ---
  // Rung 1 (P5_V2_REBUILD_RUNG1_PLUMBING): URL injectors moved to event-variables.ts
  // alongside event-bound substitutions to keep index.ts under Rule 12 cap.
  //
  // 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING): injectAutoUrls now returns
  // the short_link ids it created so we can link them to the crm_message_log
  // row after dispatch.ts inserts it.
  const shortLinkIds = await injectAutoUrls(db, leadId, tenantId, eventId, variables, broadcastId);
  if (eventId) {
    try {
      await injectEventVariables(db, eventId, tenantId, variables);
    } catch (e) {
      console.warn("injectEventVariables failed:", (e as Error).message);
    }
  }
  // displayVars: same as variables, but %phone% reformatted E.164 → Israeli
  // local (0XXXXXXXXX) for customer-facing body/subject. ORIGINAL `variables`
  // stays untouched so the recipientPhone passed to Make/global-sms below
  // remains E.164 (the wire format the SMS vendor expects).
  const displayVars = withDisplayPhone(variables);

  // --- Resolve template or use raw body ---
  let finalBody: string;
  let finalSubject: string | null = null;
  let templateId: string | null = null;

  if (templateSlug) {
    const fullSlug = `${templateSlug}_${channel}_${language}`;
    const { data: tpl, error: tplErr } = await db
      .from("crm_message_templates")
      .select("id, body, subject, required_variables, whatsapp_template_name")
      .eq("tenant_id", tenantId)
      .eq("slug", fullSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (tplErr) {
      console.error("Template lookup failed:", tplErr);
      return errorResponse("Database error on template lookup", 500);
    }

    if (!tpl) {
      const errMsg = `template_not_found: ${fullSlug}`;
      await db.from("crm_message_log").insert({
        tenant_id: tenantId,
        lead_id: leadId,
        event_id: eventId,
        run_id: runId,
        broadcast_id: broadcastId,
        channel,
        content: "",
        status: "failed",
        error_message: errMsg,
      });
      return jsonResponse(
        { ok: false, error: "template_not_found", slug: fullSlug },
        404,
      );
    }

    // P31 commit 3: validate required_variables AFTER all auto-injects + caller
    // merge, BEFORE substituteVariables. Missing/empty values that the template
    // declares as required = HTTP 400 + failed row in crm_message_log.
    const required = Array.isArray(tpl.required_variables) ? tpl.required_variables : [];
    const missing: string[] = [];
    for (const k of required) {
      if (typeof k !== "string") continue;
      const v = (displayVars as Record<string, unknown>)[k];
      if (v == null || v === "") missing.push(k);
    }
    if (missing.length > 0) {
      const errMsg = "missing_required_variable: " + missing.join(",");
      await db.from("crm_message_log").insert({
        tenant_id: tenantId,
        lead_id: leadId,
        event_id: eventId,
        run_id: runId,
        template_id: tpl.id,
        broadcast_id: broadcastId,
        channel,
        content: "",
        status: "failed",
        error_message: errMsg,
      });
      return jsonResponse(
        { ok: false, error: "missing_required_variable", missing, template: fullSlug },
        400,
      );
    }

    finalBody = substituteVariables(tpl.body, displayVars);
    finalSubject = tpl.subject ? substituteVariables(tpl.subject, displayVars) : null;
    templateId = tpl.id;
  } else {
    finalBody = substituteVariables(rawBody!, displayVars);
    finalSubject = rawSubject ? substituteVariables(rawSubject, displayVars) : null;
  }

  // --- Rung 1 Pattern P12 loud failure: any %payment_url_<digits>% remaining
  // after substitution = missing or mismatched tenants.payment_links entry.
  // Send must fail; log row records the failure for operator visibility.
  const paymentUrlError = scanForPaymentUrlMismatch(finalBody);
  if (paymentUrlError) {
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
      template_id: templateId, broadcast_id: broadcastId, channel, content: finalBody,
      status: "failed", error_message: paymentUrlError,
    });
    return jsonResponse({ ok: false, error: paymentUrlError }, 422);
  }

  // --- P33 Fix B universal placeholder guard: scan body+subject for ANY
  // remaining %X% literal. If found, reject so the customer never sees a
  // half-rendered template. This is the safety net that closes the bug
  // class P32-001 surfaced (%coupon_code% literal reached customer).
  const unsubstituted = scanForUnsubstitutedPlaceholders(
    finalBody + (finalSubject ? " " + finalSubject : "")
  );
  if (unsubstituted.length > 0) {
    const errMsg = "unsubstituted_placeholder: " + unsubstituted.join(",");
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
      template_id: templateId, broadcast_id: broadcastId, channel, content: finalBody,
      status: "failed", error_message: errMsg,
    });
    return jsonResponse(
      { ok: false, error: "unsubstituted_placeholder", missing: unsubstituted,
        template: templateSlug ? `${templateSlug}_${channel}_${language}` : null },
      400,
    );
  }

  // --- Determine recipient ---
  const recipientPhone = typeof variables.phone === "string" ? variables.phone : null;
  const recipientEmail = typeof variables.email === "string" ? variables.email : null;
  if (channel === "sms" && !recipientPhone) {
    return errorResponse("Missing variables.phone for SMS channel", 400);
  }
  if (channel === "email" && !recipientEmail) {
    return errorResponse("Missing variables.email for email channel", 400);
  }
  if (channel === "whatsapp" && !recipientPhone) {
    return errorResponse("Missing variables.phone for WhatsApp channel", 400);
  }

  // --- Allowlist gate (layer 1) ---
  // SMS allowlist source: tenants.test_mode_sms_allowlist (C001 2026-05-03).
  // Email allowlist source: tenants.ui_config.test_mode_email_allowlist
  // (DEMO_EMAIL_ALLOWLIST_INFRA 2026-05-11). Both fail-CLOSED on lookup error
  // or malformed JSON. Empty/NULL allowlist on the tenant → send to all.
  if (channel === "sms" && !(await phoneAllowed(db, tenantId, recipientPhone))) {
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
      template_id: templateId, broadcast_id: broadcastId, channel, content: finalBody,
      status: "rejected", error_message: "phone_not_allowed: " + recipientPhone,
    });
    return jsonResponse({ ok: false, error: "phone_not_allowed" }, 200);
  }
  if (channel === "email" && !(await emailAllowed(db, tenantId, recipientEmail))) {
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
      template_id: templateId, broadcast_id: broadcastId, channel, content: finalBody,
      status: "rejected", error_message: "email_not_allowed: " + recipientEmail,
    });
    return jsonResponse({ ok: false, error: "email_not_allowed" }, 200);
  }
  if (channel === "whatsapp" && !(await whatsappAllowed(db, tenantId, recipientPhone))) {
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
      template_id: templateId, broadcast_id: broadcastId, channel, content: finalBody,
      status: "rejected", error_message: "whatsapp_not_allowed: " + recipientPhone,
    });
    return jsonResponse({ ok: false, error: "whatsapp_not_allowed" }, 200);
  }

  // WhatsApp template vars: map CRM %name% etc. to positional {{1}} params
  const waTemplateName = channel === "whatsapp" && tpl ? (tpl as any).whatsapp_template_name : null;
  const waVarMap = displayVars as Record<string, unknown>;
  const waTemplateVars = channel === "whatsapp" && waTemplateName
    ? [waVarMap.name, waVarMap.event_name, waVarMap.event_date].filter(Boolean).map(String) : [];

  // --- Final-stage dispatch ---
  return await writeDispatchAndSend(
    db,
    {
      tenantId, leadId, eventId, runId, templateId,
      broadcastId,
      channel: channel as "sms" | "email" | "whatsapp",
      finalBody, finalSubject, recipientPhone, recipientEmail,
      shortLinkIds,
      whatsappTemplateName: waTemplateName,
      whatsappTemplateVars: waTemplateVars,
    },
    MAKE_WEBHOOK_URL,
    jsonResponse,
  );
});
