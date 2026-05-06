import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTenantConfig } from "../_shared/tenant-config.ts";

// verify_jwt=false — public redirect endpoint, no auth needed.
// Security: the short link wraps an HMAC-signed URL; the destination EF
// (event-register / unsubscribe) validates the token on arrival.
//
// 2026-05-06 (M4_HARDCODED_PRIZMA_REMOVAL): hardcoded STOREFRONT_ORIGIN
// removed. Fallback URL is now derived per-row from the tenant's
// ui_config.storefront_url when the row exists (expired-row branch);
// for the no-row / no-code case (no tenant context to derive from) we
// fall back to env SHORT_LINK_FALLBACK_URL, and if that is unset return
// HTTP 404 rather than redirecting to a tenant-specific URL we cannot
// authoritatively choose.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FALLBACK_URL = Deno.env.get("SHORT_LINK_FALLBACK_URL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function fallback404OrRedirect(): Response {
  if (FALLBACK_URL) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: FALLBACK_URL },
    });
  }
  return new Response("Not found", {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Invalid or missing code — no tenant context to redirect to
  if (!code || code.length < 4 || code.length > 16) {
    return fallback404OrRedirect();
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("short_links")
    .select("target_url, expires_at, id, click_count, tenant_id")
    .eq("code", code)
    .maybeSingle();

  // No row — no tenant context to redirect to
  if (error || !data) {
    return fallback404OrRedirect();
  }

  // Expired — we DO have tenant_id from the row; redirect to that tenant's homepage
  if (new Date(data.expires_at) < new Date()) {
    const cfg = data.tenant_id ? await loadTenantConfig(db, data.tenant_id) : null;
    const tenantHome = cfg?.storefront_url;
    if (tenantHome) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: tenantHome },
      });
    }
    return fallback404OrRedirect();
  }

  // Fire-and-forget: increment click count (non-blocking, ok to lose on race)
  db.from("short_links")
    .update({ click_count: (data.click_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: data.target_url },
  });
});
