import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// submit-lead — Edge Function for storefront "Notify Me" form
// SECURITY_HOTFIX_2026_05_13 §6.5 — front-door for submit_storefront_lead RPC
// ============================================================
// Replaces direct anon RPC call from storefront NotifyMe.astro. After this
// EF is live and storefront cutover lands, the RPC's anon EXECUTE is revoked
// in §6.7; from then on, the only path to insert storefront_leads is via
// this EF using service_role.
//
// Security model:
//   - verify_jwt = false at deploy time. Anonymous storefront browsers
//     have no Supabase user JWT. Authentication is via Origin allowlist.
//   - Origin header MUST be in ALLOWED_ORIGINS. Unknown origin = 403.
//   - Body validates tenant_id (UUID), inventory_id (UUID), contact_type
//     ('phone'|'email'), contact_value (non-empty).
//   - All DB I/O via service_role (bypasses RLS). The RPC's own row-scoping
//     WHERE clauses are the second layer of defense.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Origin allowlist. Adjust when adding tenants or moving storefront hosts.
// Wildcard pattern at the end matches Vercel preview deployments
// (opticup-storefront-{branch}-{hash}.vercel.app).
const ALLOWED_ORIGINS_EXACT = new Set<string>([
  "https://prizma-optic.co.il",
  "https://www.prizma-optic.co.il",
  "https://opticalis.co.il",
  "https://www.opticalis.co.il",
  "https://opticup-storefront.vercel.app",
  // Dev / smoke-test origins
  "http://localhost:4321",
  "http://localhost:3000",
  "http://127.0.0.1:4321",
  "http://127.0.0.1:3000",
]);

const VERCEL_PREVIEW_RE = /^https:\/\/opticup-storefront-[a-z0-9-]+\.vercel\.app$/;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS_EXACT.has(origin)) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  // Echo back ONLY allowlisted origins. Browsers will reject a wildcard
  // when credentials are involved; here we never use credentials so an
  // explicit echo keeps things tight without breaking CORS.
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTACT_TYPES = new Set(["phone", "email"]);
const MAX_CONTACT_VALUE_LEN = 200;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return new Response("forbidden origin", { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ ok: false, error: "forbidden_origin" }, 403, origin);
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400, origin);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : "";
  const inventoryId = typeof body.inventory_id === "string" ? body.inventory_id : "";
  const contactType = typeof body.contact_type === "string" ? body.contact_type : "";
  const contactValueRaw = typeof body.contact_value === "string" ? body.contact_value : "";
  const contactValue = contactValueRaw.trim();

  if (!UUID_RE.test(tenantId))    return jsonResponse({ ok: false, error: "invalid_tenant_id" },    400, origin);
  if (!UUID_RE.test(inventoryId)) return jsonResponse({ ok: false, error: "invalid_inventory_id" }, 400, origin);
  if (!CONTACT_TYPES.has(contactType)) return jsonResponse({ ok: false, error: "invalid_contact_type" }, 400, origin);
  if (contactValue.length === 0 || contactValue.length > MAX_CONTACT_VALUE_LEN) {
    return jsonResponse({ ok: false, error: "invalid_contact_value" }, 400, origin);
  }

  // --- Service-role DB client ---
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Verify tenant is active (defense-in-depth; the RPC also tenant-scopes) ---
  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantErr) {
    console.error("submit-lead: tenant lookup error:", tenantErr);
    return jsonResponse({ ok: false, error: "db_error" }, 500, origin);
  }
  if (!tenant)            return jsonResponse({ ok: false, error: "tenant_not_found" }, 404, origin);
  if (!tenant.is_active)  return jsonResponse({ ok: false, error: "tenant_inactive" }, 403, origin);

  // --- Call the underlying RPC as service_role ---
  const { data: leadId, error: rpcErr } = await db.rpc("submit_storefront_lead", {
    p_tenant_id:     tenantId,
    p_inventory_id:  inventoryId,
    p_contact_type:  contactType,
    p_contact_value: contactValue,
  });

  if (rpcErr) {
    console.error("submit-lead: RPC error:", rpcErr);
    return jsonResponse({ ok: false, error: "rpc_error", detail: rpcErr.message }, 500, origin);
  }

  return jsonResponse({ ok: true, lead_id: leadId }, 200, origin);
});
