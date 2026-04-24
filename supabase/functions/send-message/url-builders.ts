// HMAC-signed tokens + short-link wrapping for send-message.
//
// Token format: b64url(payload) + "." + b64url(HMAC-SHA256(SERVICE_ROLE_KEY, payload)).
// Payloads:
//   unsubscribe  = `${lead_id}:${tenant_id}:${exp}`              (verified by unsubscribe EF)
//   registration = `${lead_id}:${tenant_id}:${event_id}:${exp}`  (verified by event-register EF)
// TTL: 90 days — long enough that an old email link still works.
// STOREFRONT_FORMS P-A: both URLs hardcoded to prizma-optic.co.il; SaaS-ification
// via tenants.storefront_domain is out of scope per the SPEC.
//
// SHORT_LINKS SPEC: buildUnsubscribeUrl / buildRegistrationUrl now wrap the
// long HMAC URL in a short `/r/<code>` redirect stored in short_links. The
// destination EF still validates the token — short links are wrappers, not
// replacements for the security model.

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const TOKEN_TTL_SECONDS = 90 * 24 * 3600;
export const STOREFRONT_ORIGIN = "https://prizma-optic.co.il";

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
  db: any,
  tenantId: string,
  targetUrl: string,
  linkType: string,
  leadId: string,
  eventId: string | null,
): Promise<string> {
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

  const { error } = await db.from("short_links").insert(row);
  if (error) {
    // Astronomically unlikely 8-char collision — retry once with a new code.
    row.code = genCode();
    const res2 = await db.from("short_links").insert(row);
    if (res2.error) {
      console.warn(
        "short_links insert failed twice, falling back to long URL:",
        res2.error.message,
      );
      return targetUrl;
    }
    return `${STOREFRONT_ORIGIN}/r/${row.code}`;
  }
  return `${STOREFRONT_ORIGIN}/r/${row.code}`;
}

export async function buildUnsubscribeUrl(
  db: any, leadId: string, tenantId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${exp}`);
  const fullUrl = `${STOREFRONT_ORIGIN}/unsubscribe?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "unsubscribe", leadId, null);
}

export async function buildRegistrationUrl(
  db: any, leadId: string, tenantId: string, eventId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${eventId}:${exp}`);
  const fullUrl = `${STOREFRONT_ORIGIN}/event-register?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "registration", leadId, eventId);
}
