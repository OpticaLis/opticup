import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildRegistrationUrl,
  buildUnsubscribeUrl,
} from "./url-builders.ts";

// send-message — CRM message dispatch (P3c+P4 Architecture v3).
// Flow: POST {tenant_id, lead_id, channel, template_slug|body, variables} →
// validate → fetch template → substitute vars → log(pending) → Make webhook
// → log(sent|failed) → return. Make is a 3-module send-only pipe (Webhook →
// Router → SMS|Email); all business logic lives here.

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

// OVERNIGHT_M4_SCALE_AND_UI Phase 1 — 3-layer phone allowlist (layer 1 of 3).
// Hardcoded for the overnight scale-test window so runaway blasts during
// queue/retry tests cannot send real SMS to strangers. Layer 2 is the queue
// gate in dispatch-queue EF; layer 3 is the CRM UI guard. Remove after P7
// cutover and replace with a tenant-level test_mode flag.
const ALLOWED_PHONES = ["0537889878", "0503348349"];
function normalizePhone(p: string): string {
  const d = p.replace(/[\s+\-]/g, "");
  return d.startsWith("972") ? "0" + d.slice(3) : d;
}
function phoneAllowed(phone: string | null): boolean {
  if (!phone) return true;
  const n = normalizePhone(phone);
  return ALLOWED_PHONES.some(a => normalizePhone(a) === n);
}

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
  if (!channel || (channel !== "sms" && channel !== "email")) {
    return errorResponse("Invalid channel (must be sms or email)", 400);
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

  // --- Inject unsubscribe + registration URLs ---
  // unsubscribe_url: injected when caller didn't pass a string value, OR when
  // the caller passed a placeholder (preview text starting with "["). The
  // placeholder convention is used by crm-automation-engine.js buildVariables
  // so the confirm-send modal can show something readable before the EF
  // generates the real signed link.
  const isPlaceholder = (v: unknown) =>
    typeof v === "string" && v.startsWith("[");
  if (typeof variables.unsubscribe_url !== "string" || isPlaceholder(variables.unsubscribe_url)) {
    try {
      variables.unsubscribe_url = await buildUnsubscribeUrl(db, leadId, tenantId);
    } catch (e) {
      console.warn("unsubscribe_url generation failed:", (e as Error).message);
    }
  }
  // registration_url: canonical server-side injection when event_id is known.
  // The URL depends on lead+tenant+event which only the server can sign, so
  // any client-supplied value is ignored unless the caller already provided a
  // real URL (http/https) — that branch is for the per-event override stored
  // in crm_events.registration_form_url (passed through by buildVariables).
  if (eventId) {
    const hasOverride =
      typeof variables.registration_url === "string" &&
      /^https?:\/\//i.test(variables.registration_url);
    if (!hasOverride) {
      try {
        variables.registration_url = await buildRegistrationUrl(db, leadId, tenantId, eventId);
      } catch (e) {
        console.warn("registration_url generation failed:", (e as Error).message);
      }
    }
  }

  // --- Resolve template or use raw body ---
  let finalBody: string;
  let finalSubject: string | null = null;
  let templateId: string | null = null;

  if (templateSlug) {
    const fullSlug = `${templateSlug}_${channel}_${language}`;
    const { data: tpl, error: tplErr } = await db
      .from("crm_message_templates")
      .select("id, body, subject")
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

    finalBody = substituteVariables(tpl.body, variables);
    finalSubject = tpl.subject ? substituteVariables(tpl.subject, variables) : null;
    templateId = tpl.id;
  } else {
    finalBody = substituteVariables(rawBody!, variables);
    finalSubject = rawSubject ? substituteVariables(rawSubject, variables) : null;
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

  // --- Allowlist gate (layer 1) ---
  if (channel === "sms" && !phoneAllowed(recipientPhone)) {
    await db.from("crm_message_log").insert({
      tenant_id: tenantId, lead_id: leadId, event_id: eventId,
      template_id: templateId, channel, content: finalBody,
      status: "rejected", error_message: "phone_not_allowed: " + recipientPhone,
    });
    return jsonResponse({ ok: false, error: "phone_not_allowed" }, 200);
  }

  // --- Write log (pending) ---
  const { data: logRow, error: logErr } = await db
    .from("crm_message_log")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      event_id: eventId,
      template_id: templateId,
      channel,
      content: finalBody,
      status: "pending",
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    console.error("Log insert failed:", logErr);
    return errorResponse("Could not create log entry", 500);
  }

  // --- Call Make webhook ---
  if (!MAKE_WEBHOOK_URL) {
    await db
      .from("crm_message_log")
      .update({
        status: "failed",
        error_message: "make_webhook_url_not_configured",
      })
      .eq("id", logRow.id);
    return jsonResponse(
      { ok: false, error: "make_webhook_url_not_configured", log_id: logRow.id },
      500,
    );
  }

  const makePayload = {
    channel,
    recipient_phone: recipientPhone,
    recipient_email: recipientEmail,
    subject: finalSubject,
    body: finalBody,
  };

  try {
    const makeRes = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makePayload),
    });

    if (!makeRes.ok) {
      const errText = await makeRes.text().catch(() => "");
      await db
        .from("crm_message_log")
        .update({
          status: "failed",
          error_message: `make_webhook_${makeRes.status}: ${errText.slice(0, 200)}`,
        })
        .eq("id", logRow.id);
      return jsonResponse(
        {
          ok: false,
          error: "make_webhook_error",
          status: makeRes.status,
          log_id: logRow.id,
        },
        502,
      );
    }

    await db
      .from("crm_message_log")
      .update({ status: "sent" })
      .eq("id", logRow.id);

    return jsonResponse(
      { ok: true, log_id: logRow.id, channel, template_id: templateId },
      200,
    );
  } catch (e) {
    const msg = (e as Error).message || String(e);
    await db
      .from("crm_message_log")
      .update({
        status: "failed",
        error_message: `make_call_exception: ${msg.slice(0, 200)}`,
      })
      .eq("id", logRow.id);
    return jsonResponse(
      {
        ok: false,
        error: "make_call_exception",
        message: msg,
        log_id: logRow.id,
      },
      500,
    );
  }
});
