// event-variables.ts — Rung 1 (P5_V2_REBUILD_RUNG1_PLUMBING)
// Helpers for substitution variables that depend on the bound event:
//   - %event_max_attendees%  → alias of crm_events.max_capacity
//   - %event_deposit_amount% → alias of crm_events.booking_fee (integer)
//   - %event_day_of_week%    → Hebrew weekday computed from event_date (Israel TZ)
//   - %payment_url_<fee>%    → tenants.payment_links[<fee>] — LOUD FAILURE on miss
//   - %unsubscribe_url% / %registration_url% — auto URL injection (moved from
//     index.ts during Rung 1 to keep index.ts under Rule 12 cap).
//
// Pattern P12 (locked 2026-04-28 by Daniel):
// "עדיף לא לשלוח מאשר לשלוח שבור" — when a template references a payment_url
// for a fee that has no entry in tenants.payment_links, the send MUST FAIL.
// No fallback URL, no silent substitution.

import {
  buildRegistrationUrl,
  buildUnsubscribeUrl,
} from "./url-builders.ts";

const HEBREW_DOW = [
  "יום ראשון",  // Sunday
  "יום שני",    // Monday
  "יום שלישי",  // Tuesday
  "יום רביעי",  // Wednesday
  "יום חמישי",  // Thursday
  "יום שישי",   // Friday
  "שבת",        // Saturday
];

/**
 * Compute Hebrew weekday for an Israel-local event_date.
 * The date is stored as PostgreSQL `date` (no time component); we anchor at
 * Israel-local midnight (`+03:00` in May 2026 — outside DST shifts).
 */
export function hebrewDayOfWeek(eventDateIsoYmd: string): string {
  const d = new Date(eventDateIsoYmd + "T00:00:00+03:00");
  return HEBREW_DOW[d.getUTCDay()];
}

/**
 * Inject event-derived variables AND lookup payment_url for the event's fee.
 * Mutates `vars` in place. Returns the resolved fee key (e.g. "50") so the
 * post-substitution scan can detect mismatches with the deployed template.
 *
 * If event lookup fails → returns null (caller continues; downstream will
 * either substitute available vars or surface missing %X% in render-verify).
 *
 * If payment_links lookup fails → does NOT throw — the post-substitution
 * scan handles loud failure when (and only when) the template body actually
 * references %payment_url_<fee>%.
 */
// deno-lint-ignore no-explicit-any
export async function injectEventVariables(
  db: any,
  eventId: string,
  tenantId: string,
  vars: Record<string, unknown>,
): Promise<{ feeKey: string | null }> {
  const { data: ev, error: evErr } = await db
    .from("crm_events")
    .select("name, event_date, start_time, location_address, max_capacity, booking_fee, coupon_code")
    .eq("id", eventId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (evErr || !ev) {
    if (evErr) console.warn("injectEventVariables: event lookup failed", evErr);
    return { feeKey: null };
  }

  // Basic event variables — caller (CRM UI engine) usually provides these via
  // buildVariables, but server-side callers (lead-intake EF, dispatch-queue,
  // ad-hoc test harnesses) don't. Inject only when caller didn't already set.
  if (vars.event_name == null) vars.event_name = ev.name || "";
  if (vars.event_date == null && ev.event_date) {
    // DD/MM/YYYY (CrmHelpers.formatDate convention) — server-side formatter:
    const [y, m, d] = String(ev.event_date).split("-");
    vars.event_date = `${d}/${m}/${y}`;
  }
  if (vars.event_time == null) vars.event_time = ev.start_time || "";
  if (vars.event_location == null) vars.event_location = ev.location_address || "";

  if (vars.event_max_attendees == null) {
    vars.event_max_attendees = ev.max_capacity;
  }
  if (vars.event_deposit_amount == null) {
    vars.event_deposit_amount = Math.round(Number(ev.booking_fee));
  }
  if (vars.event_day_of_week == null && ev.event_date) {
    vars.event_day_of_week = hebrewDayOfWeek(ev.event_date);
  }
  // P33 Fix A — closes P32-001 (%coupon_code% literal reached customer in
  // event_coupon_delivery_email_he). P31 declared coupon_code was auto-filled
  // but this injection was never written. Caller-wins: if the caller already
  // set vars.coupon_code, do not overwrite.
  if (vars.coupon_code == null) {
    vars.coupon_code = ev.coupon_code || "";
  }

  // payment_url_<fee> resolution
  const fee = Math.round(Number(ev.booking_fee));
  if (!Number.isFinite(fee) || fee <= 0) return { feeKey: null };
  const feeKey = String(fee);

  const { data: tenant, error: tErr } = await db
    .from("tenants")
    .select("payment_links")
    .eq("id", tenantId)
    .maybeSingle();

  if (tErr) {
    console.warn("injectEventVariables: tenant lookup failed", tErr);
    return { feeKey };
  }

  const links: Record<string, string> = (tenant?.payment_links ?? {}) as Record<string, string>;
  const url = links[feeKey];
  if (typeof url === "string" && url.length > 0) {
    vars[`payment_url_${feeKey}`] = url;
  }
  // If url is missing AND template body references %payment_url_<feeKey>% →
  // the post-substitution scan in scanForPaymentUrlMismatch fires loud-failure.
  return { feeKey };
}

/**
 * Build a new variables object with `phone` reformatted from canonical E.164
 * (+972...) to Israeli local (0XXXXXXXXX, no dashes) for customer-facing
 * template substitution. DB storage stays in E.164. The ORIGINAL `vars`
 * object is left untouched so the caller can still use `vars.phone` as the
 * Make/global-sms routing value (which requires E.164).
 *
 * Non-Israeli E.164 numbers stay as-is so future SaaS tenants in other
 * countries are not silently mangled. Idempotent.
 *
 * Called from send-message index.ts to produce a `displayVars` for body +
 * subject substitution only.
 */
export function withDisplayPhone(vars: Record<string, unknown>): Record<string, unknown> {
  const p = vars.phone;
  if (typeof p !== "string") return vars;
  const m = p.match(/^\+972(\d{9})$/);
  if (!m) return vars;
  return { ...vars, phone: "0" + m[1] };
}

/**
 * Post-substitution scan for un-resolved payment_url placeholders.
 * Runs on the FINAL body after substituteVariables. If any %payment_url_\d+%
 * remains, the send must fail loudly per Pattern P12.
 *
 * Returns null if clean, or an error code string if a placeholder was found.
 */
export function scanForPaymentUrlMismatch(body: string): string | null {
  const m = body.match(/%payment_url_(\d+)%/);
  if (!m) return null;
  return `payment_link_missing_or_mismatch:${m[1]}`;
}

/**
 * Inject unsubscribe_url + registration_url (when event_id present).
 * Caller-provided values are preserved unless they are placeholders ("[...").
 * Best-effort: errors are logged but never throw.
 */
const isPlaceholder = (v: unknown) =>
  typeof v === "string" && v.startsWith("[");

// deno-lint-ignore no-explicit-any
export async function injectAutoUrls(
  db: any,
  leadId: string,
  tenantId: string,
  eventId: string | null,
  vars: Record<string, unknown>,
): Promise<void> {
  if (typeof vars.unsubscribe_url !== "string" || isPlaceholder(vars.unsubscribe_url)) {
    try {
      vars.unsubscribe_url = await buildUnsubscribeUrl(db, leadId, tenantId);
    } catch (e) {
      console.warn("unsubscribe_url generation failed:", (e as Error).message);
    }
  }
  if (eventId) {
    const hasOverride =
      typeof vars.registration_url === "string" &&
      /^https?:\/\//i.test(vars.registration_url);
    if (!hasOverride) {
      try {
        vars.registration_url = await buildRegistrationUrl(db, leadId, tenantId, eventId);
      } catch (e) {
        console.warn("registration_url generation failed:", (e as Error).message);
      }
    }
  }
}
