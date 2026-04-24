import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// verify_jwt=false — public redirect endpoint, no auth needed.
// Security: the short link wraps an HMAC-signed URL; the destination EF
// (event-register / unsubscribe) validates the token on arrival.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STOREFRONT_ORIGIN = "https://prizma-optic.co.il";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Invalid or missing code → homepage
  if (!code || code.length < 4 || code.length > 16) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("short_links")
    .select("target_url, expires_at, id, click_count")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
  }

  // Expired → homepage
  if (new Date(data.expires_at) < new Date()) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
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
