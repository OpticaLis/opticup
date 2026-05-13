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
//
// 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING): every successful redirect
// also records one row in short_link_clicks. The insert is async-fire-and-
// forget so it does not block the 302 response — redirect timing target is
// unchanged at <200ms (was ~30ms; goal is no meaningful regression). The
// ip_hash is sha256-hex (never raw IP) and user_agent + referer are
// truncated to 200 chars. A 30-second idempotency window per
// (short_link_id, ip_hash) deduplicates rapid double-clicks.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FALLBACK_URL = Deno.env.get("SHORT_LINK_FALLBACK_URL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UA_REF_MAX = 200;
const DEDUP_WINDOW_SECONDS = 30;

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

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "";
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(hashBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function truncate(value: string | null, max: number): string | null {
  if (value == null) return null;
  if (value.length <= max) return value;
  return value.slice(0, max);
}

// Async fire-and-forget click recorder. Returns immediately; the sha256
// hash AND the dedup-SELECT + INSERT all happen off the redirect's critical
// path. A 30-second idempotency window per (short_link_id, ip_hash) is
// enforced via a SELECT-then-INSERT pattern. Race window (two clicks
// landing within microseconds from the same IP) is accepted as negligible
// — the cost of a rare duplicate row is lower than the cost of adding a
// stronger lock to an analytics writer. Privacy: the raw IP is hashed
// inside this function and never written to logs or DB; only the sha256
// hex digest is inserted into short_link_clicks.
// deno-lint-ignore no-explicit-any
function recordClickAsync(
  db: any,
  shortLinkId: string,
  tenantId: string,
  rawIp: string,
  userAgent: string | null,
  referer: string | null,
): void {
  (async () => {
    try {
      const ipHash = rawIp ? await sha256Hex(rawIp) : null;
      if (ipHash) {
        const sinceIso = new Date(Date.now() - DEDUP_WINDOW_SECONDS * 1000).toISOString();
        const { data: existing, error: dupErr } = await db
          .from("short_link_clicks")
          .select("id")
          .eq("short_link_id", shortLinkId)
          .eq("ip_hash", ipHash)
          .gte("clicked_at", sinceIso)
          .limit(1);
        if (dupErr) {
          console.warn("short_link_clicks dedup query failed:", dupErr.message);
          // fall through and insert anyway — analytics overcounting is
          // better than dropping a click silently
        } else if (existing && existing.length > 0) {
          return;
        }
      }
      const { error: insErr } = await db
        .from("short_link_clicks")
        .insert({
          short_link_id: shortLinkId,
          tenant_id: tenantId,
          ip_hash: ipHash,
          user_agent: userAgent,
          referer,
        });
      if (insErr) {
        console.warn("short_link_clicks insert failed:", insErr.message);
      }
    } catch (e) {
      console.warn("recordClickAsync exception:", (e as Error).message);
    }
  })();
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

  // Fire-and-forget: increment legacy click_count (kept for backward compat
  // with consumers reading short_links.click_count). Per-click rows now live
  // in short_link_clicks (see M4_MESSAGE_PERFORMANCE_TRACKING, 2026-05-14).
  db.from("short_links")
    .update({ click_count: (data.click_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  // Fire-and-forget: record one row in short_link_clicks per click.
  // Privacy: sha256 IP hash (computed inside recordClickAsync, off the
  // critical path, so the redirect timing is unaffected).
  const rawIp = getClientIp(req);
  const ua = truncate(req.headers.get("user-agent"), UA_REF_MAX);
  const ref = truncate(req.headers.get("referer"), UA_REF_MAX);
  recordClickAsync(db, data.id, data.tenant_id, rawIp, ua, ref);

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: data.target_url },
  });
});
