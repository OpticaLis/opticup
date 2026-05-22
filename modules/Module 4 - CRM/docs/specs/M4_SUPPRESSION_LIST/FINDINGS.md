# FINDINGS — M4_SUPPRESSION_LIST

## F-01 (resolved) — Contact-level suppression now live
**Severity:** N/A (Daniel's directive).
**Resolution:** `crm_suppressions` table + 2-layer gate in send-message + recipient-resolver filters + DB trigger + resubscribe RPC. 4 live smokes passed.

## F-02 (CRITICAL — Sprint 4 immediate next) — FB CAPI dispatch leaks suppressed contacts
**Severity:** HIGH (GDPR / Israeli Privacy).
**What:** `supabase/functions/fb-capi-dispatch/index.ts` sends 4 event types to Meta (Lead, CompleteRegistration, EventAttended, Purchase) with hashed email + phone. No `unsubscribed_at` / `marketing_consent` / `crm_suppressions` check. A suppressed contact's PII still goes to Meta after opt-out.
**Volume:** small — fires on conversion events only, not bulk. But each fire is a privacy violation under GDPR Art. 7(3) + Israeli Privacy Law equivalent.
**Recommended SPEC:** `M4_FB_CAPI_SUPPRESSION_GATE_2026_05_23` — add the same contact-suppression check before Meta dispatch + per-lead gate.

## F-03 (deferred clean) — WhatsApp catalog flow is NOT a sender
**Severity:** N/A.
**What:** `whatsapp-catalog-flow/index.ts` only sets `crm_leads.catalog_sent_at` as a tracking marker. The actual WhatsApp message is sent by the operator manually outside the system. NOT a suppression hole. Clean defer.

## F-04 (INFO) — Allowlist normalizers differ from suppression normalizer (by design)
**Severity:** INFO.
**What:** 5 existing `normalizePhone` functions in EFs canonicalize to LOCAL `0XXX` (allowlist comparison). Suppression uses E.164 `+972XXX` (matches DB-stored phone column directly). Intentional split — different use cases. Documented in SPEC §3 + Phase 1 findings.

## F-05 (INFO) — DB trigger source-label is 'in_app_status_change' for unsubscribe-EF path
**Severity:** INFO.
**What:** The unsubscribe EF inserts FIRST with `source='unsubscribe_ef'` then runs UPDATE which fires the trigger → trigger tries to insert with `source='in_app_status_change'` → ON CONFLICT DO NOTHING. Net result: unsubscribe-EF path correctly labeled. All other paths (UI status setter, admin SQL, RPC) get the trigger's label.

## F-06 (INFO) — Existing `crm_unsubscribes` table left untouched
**Severity:** N/A.
**What:** Empty (0 rows), lead_id-keyed, harmless. Per Decision 1, left as legacy. Future Sprint can drop after verification it has zero readers.

## F-07 (Sprint 4 candidate) — Resubscribe button visibility for contacts suppressed via OTHER lead
**Severity:** LOW (UX gap, not a security hole).
**What:** Display fix shows button when lead.status='unsubscribed' OR unsubscribed_at IS NOT NULL. But: if a contact (email/phone) is in suppression because a DIFFERENT lead row was unsubscribed, the CURRENT lead row may show neither flag. The button won't show. Operator can't unblock from this lead row's view.
**Recommended SPEC:** `M4_LEAD_DETAIL_SUPPRESSION_BANNER` — show a "(contact suppressed — click to re-enable)" banner when any of lead.email/lead.phone is in suppression, regardless of current lead row state.

---
*End of findings.*
