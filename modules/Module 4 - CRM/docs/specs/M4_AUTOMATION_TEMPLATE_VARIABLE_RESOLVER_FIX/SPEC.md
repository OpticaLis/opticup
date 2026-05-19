# SPEC — M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX (amended)

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX_BRIEF.md`
**Amendment source:** `outputs/M4_RESOLVER_GAP_VERIFICATION_2026_05_19.md` Investigation (read-only audit before authoring).
**Authored:** 2026-05-19 (continuation chain, Pipeline lock `M4_CONTINUATION_2026_05_19_continuation-2026-05-19`).
**Mode:** Full-Auto Pipeline.
**Scope amendment:** ARCHITECTURAL FIX — extract `hebrewDayOfWeek` + `formatDepositAmount` + `formatMaxAttendees` to `supabase/functions/_shared/event-variables.ts` (mirroring the 2026-05-14 `_shared/template-validation.ts` pattern by commit `14e64eb`). Both `send-message` and `automation-engine` EFs now import from the same shared module. Closes the gap permanently — any future event-context variable benefits both EFs automatically.

---

## 1. Goal

Close the `unsubstituted_placeholder: event_day_of_week,event_deposit_amount,event_max_attendees` pre-enqueue rejection in automation-engine. After this SPEC:

- An event status change on demo (e.g. event #28 `planning → registration_open`) produces `crm_message_log` rows with `status='sent'` (or 'skipped_no_token' for FB CAPI, but NOT `'rejected' WHERE error_message LIKE 'unsubstituted_placeholder%'`).
- The fix is DRY: send-message and automation-engine share the helpers, so future drift is prevented.
- Prizma's resolver gap closes automatically (EFs are shared across tenants); no Prizma writes.

## 2. Scope

### 2.1 In-scope (files created or modified)

| Path | Action | Notes |
|------|--------|-------|
| `supabase/functions/_shared/event-variables.ts` | CREATE | New shared module. 3 exported helpers + Hebrew DOW const. |
| `supabase/functions/send-message/event-variables.ts` | EDIT | Remove inline `HEBREW_DOW` + `hebrewDayOfWeek`. Import from `_shared/`. Update `injectEventVariables` to use shared formatters for the 3 vars. Re-export shared helpers for backward compat with in-process callers. |
| `supabase/functions/automation-engine/prepare-plan.ts` | EDIT | Import shared helpers. Add `max_capacity, booking_fee` to `crm_events` SELECT. Always re-fetch event (drop shape-B partial reliance). Inject the 3 new keys via shared formatters. |
| `tests/smoke/automation-resolver-test.mjs` | CREATE | Regression test: iterates all active demo rules, composes each template with synthesized vars, asserts zero `unsubstituted_placeholder` (excluding the `payment_url_<digits>` class which is handled separately by `scanForPaymentUrlMismatch`). |
| `modules/Module 4 - CRM/docs/specs/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX/SPEC.md` | CREATE | This file. |

### 2.2 Critical decision: deposit-amount format — NO currency symbol

The Brief originally specified `event_deposit_amount` format as `₪N`. Investigation (Q4 of M4_RESOLVER_GAP_VERIFICATION) revealed ALL 7 active Prizma templates that use `%event_deposit_amount%` already append the `₪` symbol AFTER the placeholder (e.g. `דמי שריון %event_deposit_amount% ₪`). Returning `₪50` from the helper would produce `₪50 ₪` (double symbol) — visible regression for live customers.

**Decision:** the helper returns the raw integer string (`"50"`). Templates encode the currency symbol explicitly. This preserves byte-identical behavior with `send-message/event-variables.ts:111` (`Math.round(Number(ev.booking_fee))`) and avoids a behavior change for production traffic. Iron Rule 9 compliance: the currency literal `₪` is in template rows in `crm_message_templates` (which is config/DB), not in JS code.

### 2.3 Out-of-scope

- `%payment_url_<digits>%` placeholders — handled by `scanForPaymentUrlMismatch` + `tenants.payment_links` lookup. Not in this SPEC.
- Currency-symbol UX upgrade ("₪50" vs "50") — future SPEC if Daniel wants it. Requires template body updates to remove redundant trailing `₪`.
- Format alignment between `event_date` (AE: `dd.mm.yyyy`, SM: `dd/mm/yyyy`) and `event_time` (AE: `start_time` raw, SM: `HH:MM - HH:MM` canonical) — observed in Q4 but out of SPEC 3 scope; flag for QA review.

## 3. Steps

1. Author `_shared/event-variables.ts` with 3 helpers + HEBREW_DOW (byte-identical to prior send-message implementation).
2. Edit `send-message/event-variables.ts`: import shared helpers, remove inline duplicates, switch injection block to shared formatters, re-export for back-compat.
3. Edit `automation-engine/prepare-plan.ts`: import shared helpers, extend SELECT, inject 3 new keys, drop shape-B partial-evt reliance (always re-fetch when eventId is provided).
4. Author `tests/smoke/automation-resolver-test.mjs` regression test.
5. Run `npm run verify:integrity` + run the new regression test locally + run `npm run smoke`.
6. Commit local changes (Iron Rules 21/31/32 pre-commit clean).
7. Deploy `automation-engine` + `send-message` EFs via MCP `deploy_edge_function`. Fallback to CLI per master prompt OPEN-021 if `InternalServerErrorException`.
8. Demo manual verification: toggle event #28 status `planning → registration_open` (NO prod customer impact — demo is allowlist-protected). Wait 60-90s for pg_cron consumer. Query `crm_message_log` for newly-created rows with status='sent'.
9. Write retro docs.

## 4. Destructive Operations

**None.**

EF redeploy is not destructive in Iron Rule 32's sense — Supabase keeps EF version history. The smoke verification triggers a status change on demo (writes to `crm_status_change_events` via DB trigger, writes to `crm_message_queue` and `crm_message_log` via consumer + send-message), but these are non-destructive standard test traffic per Brief §4.

## 5. Verification Criteria

1. ✅ `_shared/event-variables.ts` exists with 3 exported helpers + HEBREW_DOW const.
2. ✅ `send-message/event-variables.ts` no longer defines `HEBREW_DOW` or `hebrewDayOfWeek` locally; imports from `_shared/`.
3. ✅ `automation-engine/prepare-plan.ts` SELECT now includes `max_capacity, booking_fee`; the 3 new `vars.*` lines present.
4. ✅ Regression test 25/25 PASS locally (executed BEFORE deploy — proves local logic correct).
5. ✅ `npm run verify:integrity` exit 0.
6. ✅ Pre-commit gates Iron Rules 21/31/32 all clean.
7. ✅ EF deploy succeeds — both `automation-engine` and `send-message` redeployed (versions bumped from 16 + 26).
8. ✅ Demo manual smoke: status change on event #28 produces `crm_message_log` rows with `status IN ('sent','queued','skipped_no_token')` — NOT `'rejected' WHERE error_message LIKE 'unsubstituted_placeholder%'`.
9. ✅ Prizma's resolver gap closed automatically (no separate Prizma verification needed; EF is shared).
10. ✅ `npm run smoke` 7/7 PASS post-deploy.

## 6. Rollback

Per master prompt §"Rollback procedures (partial) SPEC 3":
- Re-deploy old `automation-engine` EF from `_archive/m4-overnight-2026-05-18/ef-snapshots/automation-engine-*.ts` (12 files, captured 2026-05-19T03:30Z, version 16).
- Re-deploy old `send-message` EF: NOT captured in pre-overnight snapshots (only automation-engine + dispatch-queue were). However, version 26 source can be re-fetched via Supabase MCP `get_edge_function` if Daniel needs the exact pre-fix bytes.
- Git revert the SPEC 3 commits.

Because the AE fix is purely additive (NEW SELECT columns + NEW var keys + NEW imports — no removals), rollback risk is LOW. The send-message edit is more delicate (replaces inline impl with import-and-re-export); revert via git is clean.

## 7. Foreman skill-harvest proposals (filled at close)

Per master prompt §"Final report" — 4 proposals at FOREMAN_REVIEW.md.
