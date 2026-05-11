// allowlists.ts — co-located test-mode allowlists for send-message EF.
//
// Extracted from index.ts in DEMO_EMAIL_ALLOWLIST_INFRA (2026-05-11) to keep
// index.ts under Iron Rule 12's 350-line cap once the email-channel gate
// was added. SMS body is byte-identical to the C001 (2026-05-03) version
// that lived inline in index.ts v21 — no behavior change.
//
// Contract (parity across both helpers):
//   - Empty / NULL allowlist on the tenant   → return true  (production mode; send to all)
//   - Non-empty array                        → recipient must match an entry; else false
//   - DB lookup error or malformed allowlist → return false (fail-CLOSED — never blast strangers)
//
// SMS source: tenants.test_mode_sms_allowlist          (top-level jsonb column, C001 2026-05-03)
// Email source: tenants.ui_config.test_mode_email_allowlist (jsonb path inside existing ui_config column)
//
// Architectural note: SMS uses a dedicated column because it predates the
// ui_config convention. New test-mode allowlists (email, future channels)
// live under ui_config so a future SaaS tenant can configure them through
// the same tenant-config UI used for brand/cookie/whatsapp settings.

export function normalizePhone(p: string): string {
  const d = p.replace(/[\s+\-]/g, "");
  return d.startsWith("972") ? "0" + d.slice(3) : d;
}

// Email comparison: case-insensitive + whitespace-trimmed. RFC 5321 makes
// local-part technically case-sensitive but every real provider treats it
// case-insensitively, and our allowlist entries are stored in lowercase.
export function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

// deno-lint-ignore no-explicit-any
export async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
  if (!phone) return true;
  const { data: tenant, error } = await db
    .from("tenants")
    .select("test_mode_sms_allowlist")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
    return false;
  }
  const allowlist = tenant?.test_mode_sms_allowlist;
  if (allowlist == null) return true;  // production mode
  if (!Array.isArray(allowlist)) {
    console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
    return false;
  }
  const n = normalizePhone(phone);
  return allowlist.some((a: unknown) =>
    typeof a === "string" && normalizePhone(a) === n
  );
}

// deno-lint-ignore no-explicit-any
export async function emailAllowed(db: any, tenantId: string, email: string | null): Promise<boolean> {
  if (!email) return true;
  const { data: tenant, error } = await db
    .from("tenants")
    .select("ui_config")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.warn("emailAllowed: tenant lookup failed; failing CLOSED for safety", error);
    return false;
  }
  const ui = tenant?.ui_config;
  // ui_config may itself be null (older tenants) — treat same as missing key.
  const allowlist = ui && typeof ui === "object" ? (ui as Record<string, unknown>).test_mode_email_allowlist : null;
  if (allowlist == null) return true;  // production mode (key absent = send to all)
  if (!Array.isArray(allowlist)) {
    console.warn("emailAllowed: malformed allowlist on tenant", tenantId);
    return false;
  }
  const n = normalizeEmail(email);
  return allowlist.some((a: unknown) =>
    typeof a === "string" && normalizeEmail(a) === n
  );
}
