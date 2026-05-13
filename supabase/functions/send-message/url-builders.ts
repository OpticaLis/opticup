// HMAC-signed tokens + short-link wrapping for send-message.
//
// Token format: b64url(payload) + "." + b64url(HMAC-SHA256(SERVICE_ROLE_KEY, payload)).
// Payloads:
//   unsubscribe  = `${lead_id}:${tenant_id}:${exp}`              (verified by unsubscribe EF)
//   registration = `${lead_id}:${tenant_id}:${event_id}:${exp}`  (verified by event-register EF)
// TTL: 90 days — long enough that an old email link still works.
// 2026-05-06 (M4_HARDCODED_PRIZMA_REMOVAL): hardcoded STOREFRONT_ORIGIN
// replaced with tenant-scoped lookup via loadTenantConfig(). The two public
// builders fetch the tenant's storefront_url once and thread it down into
// createShortLink — 1 extra SELECT per builder call (negligible at our scale).
//
// 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING): createShortLink now returns
// { url, id } so the caller can capture the short_link row id and link it
// back to crm_message_log via UPDATE once the log row exists (see
// dispatch.ts writeDispatchAndSend). buildRegistrationUrl + buildUnsubscribeUrl
// likewise return { url, id }.

import { loadTenantConfig } from "../_shared/tenant-config.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const TOKEN_TTL_SECONDS = 90 * 24 * 3600;

export interface ShortLinkResult {
  url: string;
  id: string | null;  // null when createShortLink fell back to the long URL
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payload)),
  );
  return `${b64urlEncode(enc.encode(payload))}.${b64urlEncode(sig)}`;
}

async function createShortLink(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  targetUrl: string,
  linkType: string,
  leadId: string,
  eventId: string | null,
  storefrontOrigin: string,
): Promise<ShortLinkResult> {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const genCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  };
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    code: genCode(),
    target_url: targetUrl,
    link_type: linkType,
    lead_id: leadId,
    event_id: eventId,
    expires_at: expiresAt,
  };

  const { data, error } = await db
    .from("short_links")
    .insert(row)
    .select("id, code")
    .single();
  if (error) {
    // Astronomically unlikely 8-char collision — retry once with a new code.
    row.code = genCode();
    const res2 = await db
      .from("short_links")
      .insert(row)
      .select("id, code")
      .single();
    if (res2.error) {
      console.warn(
        "short_links insert failed twice, falling back to long URL:",
        res2.error.message,
      );
      return { url: targetUrl, id: null };
    }
    return { url: `${storefrontOrigin}/r/${res2.data.code}`, id: res2.data.id };
  }
  return { url: `${storefrontOrigin}/r/${data.code}`, id: data.id };
}

export async function buildUnsubscribeUrl(
  // deno-lint-ignore no-explicit-any
  db: any, leadId: string, tenantId: string,
): Promise<ShortLinkResult> {
  const cfg = await loadTenantConfig(db, tenantId);
  const origin = cfg?.storefront_url;
  if (!origin) throw new Error("tenant_storefront_unconfigured");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${exp}`);
  const fullUrl = `${origin}/unsubscribe?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "unsubscribe", leadId, null, origin);
}

export async function buildRegistrationUrl(
  // deno-lint-ignore no-explicit-any
  db: any, leadId: string, tenantId: string, eventId: string,
): Promise<ShortLinkResult> {
  const cfg = await loadTenantConfig(db, tenantId);
  const origin = cfg?.storefront_url;
  if (!origin) throw new Error("tenant_storefront_unconfigured");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${eventId}:${exp}`);
  const fullUrl = `${origin}/event-register?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "registration", leadId, eventId, origin);
}
