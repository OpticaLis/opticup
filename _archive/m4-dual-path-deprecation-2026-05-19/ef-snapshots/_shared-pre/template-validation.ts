// _shared/template-validation.ts — Iron-Rule-22 fail-CLOSED validation of
// template output for any EF that composes a body+subject from
// `crm_message_templates` variables. Replaces previously local copies in
// `send-message/event-variables.ts` (M4_TEMPLATE_VALIDATION_UNIFIED, 2026-05-14
// — Phase 2 P2.3 of FUNNEL_ROADMAP).
//
// Two scans (lifted byte-for-byte from event-variables.ts so post-extraction
// behavior is bit-identical at the send-message dispatch path):
//   1. scanForUnsubstitutedPlaceholders(text) → array of every %lowercase_var%
//      that survived substitution. Lowercase-first-char rule excludes
//      URL-encoded hex sequences like %D7% in wa.me click-to-chat URLs.
//   2. scanForPaymentUrlMismatch(body) → loud-failure code when a
//      %payment_url_<digits>% remains after substitution (Pattern P12,
//      locked 2026-04-28 by Daniel: "עדיף לא לשלוח מאשר לשלוח שבור").
//
// Plus a NEW top-level orchestrator validateTemplateOutput(body, subject?)
// that runs both scans against `body + (subject||'')` and returns a
// uniform structured result. Callers wanting the at-send-message-time
// fine-grained per-scan error path keep importing the individual helpers;
// callers wanting "did this composed message survive the gate?" (e.g.
// automation-engine pre-enqueue, Phase 2 P2.3) import validateTemplateOutput.

export type ValidationError =
  | "unsubstituted_placeholder"
  | "payment_url_mismatch";

export interface ValidationResult {
  ok: boolean;
  error?: ValidationError;
  /** Distinct placeholder names found when error='unsubstituted_placeholder'. */
  missing?: string[];
  /** Full error code (e.g. 'payment_link_missing_or_mismatch:50') when error='payment_url_mismatch'. */
  message?: string;
}

/**
 * Post-substitution scan for un-resolved payment_url placeholders.
 * If any %payment_url_\d+% remains, the send must fail loudly per Pattern P12.
 * Returns null if clean, or an error code string if a placeholder was found.
 */
export function scanForPaymentUrlMismatch(body: string): string | null {
  const m = body.match(/%payment_url_(\d+)%/);
  if (!m) return null;
  return `payment_link_missing_or_mismatch:${m[1]}`;
}

/**
 * Universal post-substitution placeholder scan (P33 Fix B). After
 * substituteVariables runs, ANY remaining %lowercase_var% literal means a
 * placeholder failed to substitute. The dispatch MUST be rejected so the
 * literal never reaches the customer.
 *
 * Returns array of distinct placeholder names found (empty array if clean).
 * URL-encoded hex sequences like %D7% (Hebrew in wa.me click-to-chat URLs)
 * are excluded by the lowercase-first-char rule.
 */
export function scanForUnsubstitutedPlaceholders(text: string): string[] {
  const seen = new Set<string>();
  const re = /%([a-z][a-z0-9_]*)%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) seen.add(m[1]);
  return Array.from(seen).sort();
}

/**
 * Combined post-substitution validation. Runs both scans against the
 * body and optional subject concatenation. Returns a single structured
 * verdict so callers can fail-CLOSED in one branch without importing
 * both helpers.
 *
 * Scan order matches send-message/index.ts (M4_BROADCAST_ID_PROPAGATION
 * 2026-05-14): payment_url first, then universal — so a body that
 * references a payment_url for a fee with no tenants.payment_links
 * entry yields the more-specific 'payment_url_mismatch' error rather
 * than 'unsubstituted_placeholder' (the payment_url placeholder
 * survives substitution in that exact case, so both scans would
 * otherwise flag it).
 *
 * If body+subject are clean, returns {ok:true}.
 */
export function validateTemplateOutput(
  body: string,
  subject?: string | null,
): ValidationResult {
  const combined = body + (subject ? " " + subject : "");

  const paymentErr = scanForPaymentUrlMismatch(combined);
  if (paymentErr) {
    return { ok: false, error: "payment_url_mismatch", message: paymentErr };
  }

  const missing = scanForUnsubstitutedPlaceholders(combined);
  if (missing.length > 0) {
    return { ok: false, error: "unsubstituted_placeholder", missing };
  }

  return { ok: true };
}
