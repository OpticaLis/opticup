import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// send-message — Edge Function for CRM message dispatch
// Module 4 CRM — Go-Live Phase P3c+P4 (Architecture v3)
// ============================================================
// Flow: POST { tenant_id, lead_id, channel, template_slug | body,
//              variables } → validate → fetch template (or use
//              raw body) → substitute variables → INSERT
//              crm_message_log(pending) → call Make webhook →
//              UPDATE log to sent/failed → return result.
//
// Make's role is a send-only pipe (3 modules: Webhook → Router
// → SMS | Email). All business logic lives here.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_SEND_MESSAGE_WEBHOOK_URL") || "";

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
