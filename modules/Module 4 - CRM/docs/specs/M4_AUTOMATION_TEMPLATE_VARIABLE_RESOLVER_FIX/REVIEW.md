# REVIEW — M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX

**Reviewed commit:** `1281b71`.
**Verdict:** 🟢 APPROVED.

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 9 (no hardcoded business values) | ✅ | Currency symbol stays in DB-stored template bodies; new helpers don't hardcode any business value. |
| 12 (file size) | ✅ | _shared/event-variables.ts = 75 lines. send-message/event-variables.ts grew by ~10 lines (still ~240). prepare-plan.ts grew by ~15 lines (still under 350). |
| 21 (no duplicates) | ✅ | helpers extracted to _shared; send-message imports + re-exports for back-compat (re-exports don't count as duplicate definitions). |
| 22 (defense-in-depth) | ✅ | All DB SELECTs explicit `tenant_id` filter. |
| 23 (no secrets) | ✅ | No secrets in code; service-role key still env-only. |
| 31 (integrity gate) | ✅ | pre-commit ran clean. |
| 32 (destructive ops) | ✅ | SPEC §4 declares None. The demo SQL UPDATE during verification was 2 single-row tenant-scoped updates, not in Rule 32's destructive enumeration. |

## Code observations

### O-1 — Shared module pattern is correct
The extraction to `_shared/event-variables.ts` mirrors the prior `_shared/template-validation.ts` extraction (commit `14e64eb`). Pattern consistency wins.

### O-2 — `formatDepositAmount` doesn't include currency
SPEC §2.2 documents the decision. Reviewer agrees: matching templates' existing convention beats Brief's literal text.

### O-3 — `prepare-plan.ts` always re-fetches event (intentional change)
The browser-path shape-B optimization is dropped. Cost: 1 extra single-row DB query per status-change rule fire. Benefit: eliminates a silent-bad-substitution failure mode. Worth it.

### O-4 — Re-export from send-message preserves back-compat
`export { hebrewDayOfWeek, formatDepositAmount, formatMaxAttendees } from "../_shared/event-variables.ts"` keeps callers that imported these from send-message working. Future SPECs can deprecate the re-export.

## Demo verification reviewed

End-to-end trace in EXECUTION_REPORT confirms: yesterday's exact scenario (run on event #28, lead 01269ab9, rule "שינוי סטטוס: נפתחה הרשמה") that produced `unsubstituted_placeholder` rejection now produces successful dispatch. That's the definitive proof.

## Permission to proceed to SPEC 4

✅ APPROVED.
