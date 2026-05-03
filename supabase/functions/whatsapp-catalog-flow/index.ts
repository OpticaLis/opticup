import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// whatsapp-catalog-flow — Edge Function for Make scenario 8464122
// Module 4 CRM — replaces Monday-board lookup in WhatsApp inbound flow
// SPEC: modules/Module 4 - CRM/docs/specs/WHATSAPP_CATALOG_FLOW_EF/SPEC.md
// ============================================================
// Two operations, single EF:
//   op=lookup    → resolve phone → action verdict + lead name
//   op=mark_sent → set crm_leads.catalog_sent_at = now() for a given lead_id
// Make calls Green API for actual WhatsApp delivery; this EF only owns
// the decision + the timestamp.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ ok: false, error }, status);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/**
 * Normalize a phone number to E.164. Copied verbatim from
 * supabase/functions/lead-intake/index.ts so storefront-created leads
 * (whose phone is normalized at intake) match WhatsApp lookups here.
 */
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let e164: string;

  if (hasPlus) {
    e164 = "+" + digits;
  } else if (digits.startsWith("972")) {
    e164 = "+" + digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    e164 = "+972" + digits.slice(1);
  } else {
    return null;
  }

  const withoutPlus = e164.slice(1);
  if (!/^\d{10,15}$/.test(withoutPlus)) return null;

  return e164;
}

async function resolveTenant(
  db: ReturnType<typeof createClient>,
  tenantSlug: string,
): Promise<{ tenantId: string | null; status: number; error: string | null }> {
  const { data: tenant, error } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (error || !tenant) return { tenantId: null, status: 400, error: "invalid_tenant" };
  if (!tenant.is_active) return { tenantId: null, status: 403, error: "tenant_inactive" };
  return { tenantId: tenant.id as string, status: 200, error: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }

  const op = trimOrNull(body.op);
  if (op !== "lookup" && op !== "mark_sent") {
    return errorResponse("invalid_op", 400);
  }

  const tenantSlug = trimOrNull(body.tenant_slug);
  if (!tenantSlug) return errorResponse("invalid_tenant", 400);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tenantRes = await resolveTenant(db, tenantSlug);
  if (!tenantRes.tenantId) return errorResponse(tenantRes.error!, tenantRes.status);
  const tenantId = tenantRes.tenantId;

  if (op === "lookup") {
    const phoneRaw = trimOrNull(body.phone);
    if (!phoneRaw) return errorResponse("invalid_phone", 400);
    const phone = normalizePhone(phoneRaw);
    if (!phone) return errorResponse("invalid_phone", 400);

    const { data: lead, error: leadErr } = await db
      .from("crm_leads")
      .select("id, full_name, catalog_sent_at")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (leadErr) {
      console.error("Lookup error:", leadErr);
      return errorResponse("database_error", 500);
    }

    if (!lead) {
      return jsonResponse({
        ok: true,
        action: "send_register_prompt",
        lead_id: null,
        name: null,
        phone_normalized: phone,
      });
    }

    const action = lead.catalog_sent_at ? "send_repeat" : "send_first";
    return jsonResponse({
      ok: true,
      action,
      lead_id: lead.id,
      name: lead.full_name,
      phone_normalized: phone,
    });
  }

  // op === "mark_sent"
  const leadId = trimOrNull(body.lead_id);
  if (!leadId) return errorResponse("invalid_lead_id", 400);

  const { data: updated, error: updErr } = await db
    .from("crm_leads")
    .update({ catalog_sent_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .eq("is_deleted", false)
    .select("catalog_sent_at")
    .maybeSingle();

  if (updErr) {
    console.error("mark_sent error:", updErr);
    return errorResponse("database_error", 500);
  }
  if (!updated) {
    return errorResponse("lead_not_found", 404);
  }

  return jsonResponse({
    ok: true,
    catalog_sent_at: updated.catalog_sent_at,
  });
});
