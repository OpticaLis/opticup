// _shared/event-variables.ts — Iron-Rule-21 shared helpers for event-context
// variables used by BOTH automation-engine and send-message EFs. Established
// by M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX (2026-05-19, SPEC 3 of the
// overnight continuation chain) following the M4_TEMPLATE_VALIDATION_UNIFIED
// 2026-05-14 pattern that extracted template validation to _shared.
//
// Before this extraction: hebrewDayOfWeek lived only in send-message/event-variables.ts;
// automation-engine's prepare-plan.ts had its own composer that didn't know
// about the helper, so pre-enqueue validation rejected every template using
// %event_day_of_week% / %event_deposit_amount% / %event_max_attendees% with
// `unsubstituted_placeholder`. This file fixes the gap by giving both EFs
// access to the same formatters.

// Behavior preserved byte-identical to the prior send-message/event-variables.ts
// implementation. Templates that use %event_day_of_week% expect "יום X" form
// (with the "יום" prefix); "שבת" is the only exception (no prefix).
const HEBREW_DOW = [
  "יום ראשון",   // Sunday    — getUTCDay() === 0
  "יום שני",     // Monday    — 1
  "יום שלישי",   // Tuesday   — 2
  "יום רביעי",   // Wednesday — 3
  "יום חמישי",   // Thursday  — 4
  "יום שישי",    // Friday    — 5
  "שבת",         // Saturday  — 6
];

/**
 * Compute Hebrew weekday for an event_date stored as PostgreSQL `date`
 * (YYYY-MM-DD, naive YMD — no time/zone). Output: one of "יום ראשון",
 * "יום שני", ..., "יום שישי", or "שבת".
 *
 * Off-by-one was tuned by commit 468b090 (2026-05-01, B8 hot-fix). Logic
 * preserved byte-identical to the prior send-message/event-variables.ts:36
 * implementation.
 */
export function hebrewDayOfWeek(eventDateIsoYmd: string): string {
  if (!eventDateIsoYmd) return "";
  const [yearStr, monthStr, dayStr] = eventDateIsoYmd.split("-");
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return HEBREW_DOW[dt.getUTCDay()] || "";
}

/**
 * Format booking_fee as a plain integer string (NO currency symbol).
 *
 * IMPORTANT — symbol placement is the TEMPLATE's responsibility, not the
 * variable's. Active Prizma templates encode the currency symbol AFTER the
 * placeholder (e.g. `דמי שריון %event_deposit_amount% ₪`), per Iron Rule 9
 * (currency comes from template/config, not hardcoded). Returning a symbol-
 * prefixed string here would produce double-symbol output ("₪50 ₪") and
 * break every active template.
 *
 * Behavior preserved byte-identical to send-message/event-variables.ts:111
 * (`Math.round(Number(ev.booking_fee))`), with two improvements: (a) NULL
 * input returns "" instead of NaN; (b) explicit Number.isFinite guard.
 *
 * Examples: formatDepositAmount(50) → "50"
 *           formatDepositAmount(0)  → "0"
 *           formatDepositAmount(null) → ""
 *           formatDepositAmount("invalid") → ""
 */
export function formatDepositAmount(
  bookingFee: number | string | null | undefined,
): string {
  if (bookingFee == null || bookingFee === "") return "";
  const n = Math.round(Number(bookingFee));
  if (!Number.isFinite(n)) return "";
  return String(n);
}

/**
 * Format max_capacity as a display string (plain integer, no symbol).
 * Returns "" for null/empty/non-numeric input.
 *
 * Behavior preserved from send-message/event-variables.ts:108
 * (`vars.event_max_attendees = ev.max_capacity`), with NULL-safety
 * (currently the send-message implementation passes through NULL, which
 * becomes the string "null" at substitution — minor bug fixed here).
 *
 * Examples: formatMaxAttendees(50) → "50"
 *           formatMaxAttendees(null) → ""
 */
export function formatMaxAttendees(
  maxCapacity: number | string | null | undefined,
): string {
  if (maxCapacity == null || maxCapacity === "") return "";
  const n = Number(maxCapacity);
  if (!Number.isFinite(n)) return "";
  return String(Math.trunc(n));
}
