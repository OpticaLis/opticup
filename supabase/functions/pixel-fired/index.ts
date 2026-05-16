import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// pixel-fired — thank-you-page back-wire for Pixel-fire detection.
// SPEC M3_FUNNEL_PIXEL_BACKWIRE (Phase 2 P2.1 measurement-loop completion).
// verify_jwt=false; Origin-allowlisted (mirrors submit-lead byte-for-byte).
// D6: NO crm_message_log row — observational, console.log only.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response("forbidden origin", { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return jsonResponse({ ok: false, error: "forbidden_origin" }, 403, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "invalid_json" }, 400, origin); }

  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : "";

  if (!UUID_RE.test(eventId))  return jsonResponse({ ok: false, error: "invalid_event_id" },  400, origin);
  if (!UUID_RE.test(tenantId)) return jsonResponse({ ok: false, error: "invalid_tenant_id" }, 400, origin);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotent UPDATE: only sets fb_pixel_fired_at if currently NULL.
  // Second call for same event_id returns updated=0 (D4).
  // Iron Rule 22: explicit .eq('tenant_id', ...) defense-in-depth.
  const { data, error } = await db
    .from("crm_leads")
    .update({ fb_pixel_fired_at: new Date().toISOString() })
    .eq("fb_event_id", eventId)
    .eq("tenant_id", tenantId)
    .is("fb_pixel_fired_at", null)
    .select("id");

  if (error) {
    console.error("pixel-fired: update error:", error);
    return jsonResponse({ ok: false, error: "db_error" }, 500, origin);
  }

  const updated = data?.length ?? 0;
  console.log(`pixel-fired: event_id=${eventId} tenant_id=${tenantId} updated=${updated}`);
  return jsonResponse({ ok: true, updated }, 200, origin);
});
