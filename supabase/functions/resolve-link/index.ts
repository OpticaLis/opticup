import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTenantConfig } from "../_shared/tenant-config.ts";

// verify_jwt=false — public redirect endpoint, no auth needed.
// Security: the short link wraps an HMAC-signed URL; the destination EF
// (event-register / unsubscribe) validates the token on arrival.
//
// 2026-05-06 (M4_HARDCODED_PRIZMA_REMOVAL): hardcoded STOREFRONT_ORIGIN
// removed. Fallback URL is now derived per-row from the tenant's
// ui_config.storefront_url when the row exists (expired-row branch).
//
// 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING): every successful redirect
// also records one row in short_link_clicks. Fire-and-forget so the 302
// redirect timing is unaffected.
//
// 2026-05-14 (M3_UTM_TRIPLE_LAYER_PERSISTENCE, Phase 1 P1.1): every
// successful redirect ALSO records one row in crm_lead_touchpoints with
// touchpoint_type='short_link_click'. Parses UTM query-string from the
// short link's target_url. lead_id is filled from short_links.lead_id
// when present (per-recipient broadcast SMS) — otherwise NULL. Same
// fire-and-forget pattern as short_link_clicks INSERT; the dedupe_key
// uses a 30-second time bucket to mirror the existing dedup window.
// The two tables coexist by design: short_link_clicks is the hot-path
// per-click ledger; crm_lead_touchpoints is the journey-level abstraction
// also covering lead_submit and event_register.

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

function parseUtmFromUrl(target: string | null): Record<string, string | null> {
  const out: Record<string, string | null> = {
    utm_source: null, utm_medium: null, utm_campaign: null,
    utm_content: null, utm_term: null, utm_campaign_id: null,
  };
  if (!target) return out;
  try {
    const u = new URL(target);
    for (const k of Object.keys(out)) {
      const v = u.searchParams.get(k);
      if (v) out[k] = v;
    }
  } catch (_e) {
    // malformed URL — return all-null bag, do not throw
  }
  return out;
}

// deno-lint-ignore no-explicit-any
function recordClickAsync(
  db: any,
  shortLinkId: string,
  tenantId: string,
  rawIp: string,
  userAgent: string | null,
  referer: string | null,
  broadcastId: string | null,
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
          // 2026-05-14 M4_BROADCAST_ID_PROPAGATION (P1.2) — X1 chain hop. Read
          // from short_links.broadcast_id at click time. NULL when the clicked
          // short_link wasn't from a broadcast.
          broadcast_id: broadcastId,
        });
      if (insErr) {
        console.warn("short_link_clicks insert failed:", insErr.message);
      }
    } catch (e) {
      console.warn("recordClickAsync exception:", (e as Error).message);
    }
  })();
}

// M3_UTM_TRIPLE_LAYER_PERSISTENCE — fire-and-forget touchpoint recorder.
// dedupe_key = 'click:' + short_link_id + ':' + ip_hash_short + ':' +
// minute_bucket. The 30-second bucket mirrors the existing short_link_clicks
// dedup window so accidental double-clicks within 30s fold gracefully.
// deno-lint-ignore no-explicit-any
function recordTouchpointAsync(
  db: any,
  shortLinkId: string,
  shortLinkCode: string,
  tenantId: string,
  leadId: string | null,
  eventId: string | null,
  targetUrl: string | null,
  refererHdr: string | null,
  rawIp: string,
  broadcastId: string | null,
): void {
  (async () => {
    try {
      const utms = parseUtmFromUrl(targetUrl);
      let bucketKey: string;
      if (rawIp) {
        const ipHash = await sha256Hex(rawIp);
        bucketKey = ipHash.slice(0, 12);
      } else {
        bucketKey = "noip";
      }
      const bucket = Math.floor(Date.now() / 1000 / DEDUP_WINDOW_SECONDS);
      const dedupeKey = `click:${shortLinkId}:${bucketKey}:${bucket}`;

      const { error } = await db.rpc("_record_touchpoint", {
        p_tenant_id: tenantId,
        p_lead_id: leadId,
        p_phone_normalized: null,
        p_touchpoint_type: "short_link_click",
        p_event_id: eventId,
        p_attendee_id: null,
        p_short_link_id: shortLinkId,
        p_short_link_code: shortLinkCode,
        // 2026-05-14 M4_BROADCAST_ID_PROPAGATION (P1.2) — replaces the P1.1
        // placeholder. Read from short_links.broadcast_id at click time.
        p_broadcast_id: broadcastId,
        p_utm_source: utms.utm_source,
        p_utm_medium: utms.utm_medium,
        p_utm_campaign: utms.utm_campaign,
        p_utm_content: utms.utm_content,
        p_utm_term: utms.utm_term,
        p_utm_campaign_id: utms.utm_campaign_id,
        p_referrer_url: refererHdr,
        p_landing_url: targetUrl,
        p_dedupe_key: dedupeKey,
      });
      if (error) {
        console.warn("crm_lead_touchpoints insert failed:", error.message);
      }
    } catch (e) {
      console.warn("recordTouchpointAsync exception:", (e as Error).message);
    }
  })();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code || code.length < 4 || code.length > 16) {
    return fallback404OrRedirect();
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("short_links")
    .select("target_url, expires_at, id, click_count, tenant_id, lead_id, event_id, broadcast_id")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return fallback404OrRedirect();
  }

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

  // Fire-and-forget: increment legacy click_count.
  db.from("short_links")
    .update({ click_count: (data.click_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  // Fire-and-forget: short_link_clicks ledger.
  const rawIp = getClientIp(req);
  const ua = truncate(req.headers.get("user-agent"), UA_REF_MAX);
  const ref = truncate(req.headers.get("referer"), UA_REF_MAX);
  recordClickAsync(db, data.id, data.tenant_id, rawIp, ua, ref, data.broadcast_id || null);

  // Fire-and-forget: M3_UTM_TRIPLE_LAYER_PERSISTENCE touchpoint capture.
  // 2026-05-14 M4_BROADCAST_ID_PROPAGATION — broadcast_id forwarded as the
  // X1-chain hop from short_links into both the per-click ledger AND the
  // journey-level touchpoint row.
  recordTouchpointAsync(
    db,
    data.id,
    code,
    data.tenant_id,
    data.lead_id || null,
    data.event_id || null,
    data.target_url,
    ref,
    rawIp,
    data.broadcast_id || null,
  );

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: data.target_url },
  });
});
