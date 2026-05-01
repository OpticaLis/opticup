# P34 — Quick Post-P33 Verification on Prizma Production

> **Status:** authored 2026-05-01 by opticup-executor under Daniel's dispatch
> **Type:** verification-only (no code changes)
> **Scope:** ~30 min targeted checks of P33 fix-pair landing in production

---

## 1. Goal

Five targeted scenarios:

1. **P32-001 fix verification** — re-trigger event_coupon_delivery on Prizma. Verify message_log content has `V4-40268` literal, NOT `%coupon_code%`.
2. **Universal scan triggers HTTP 400** — manual EF call with `body` containing `%fake_unknown_var%`. Verify 400 response + failed log row.
3. **Failed-msg UI end-to-end** — chip + filter + section + retry button. Click retry on the historical P32-001 row → verify success now.
4. **Regression check** — one normal lead-intake-new dispatch. Verify substitution clean.
5. **Null coupon_code edge case** — query for any null-coupon events; if any exist, document substitution behavior.

## 2. Hard Constraints

- ONLY phone `0537889878` + email `daniel@prizma-optic.co.il`
- No code changes, no DB schema changes, no deletion
- No `--no-verify`

## 3. Pre-flight Status (verified 2026-05-01)

- ✅ send-message EF v14 deployed (post-P33). Source includes coupon_code SELECT + injection AND scanForUnsubstitutedPlaceholders import + invocation
- ✅ crm-message-error-labels.js returns 200 on app.opticalis.co.il (UI live)
- ✅ Test lead `a262bc0e` reusable (phone + email match)

## 4. Stop Triggers

- Recipient leak beyond Daniel's contacts → STOP
- Scenario 1 still produces `%coupon_code%` literal → STOP, P33 Fix A didn't land
- Scenario 2 doesn't return 400 → STOP, P33 Fix B didn't land

## 5. Outputs

- `SPEC.md` (this)
- `EXECUTION_REPORT.md`
- `VERIFICATION_RESULTS.md`
- `screenshots/`

## 6. Final Summary Format

```
P34 verification complete. {N}/5 scenarios green.
P32-001 fix VERIFIED LIVE: {YES/NO}
Universal scan VERIFIED LIVE: {YES/NO}
Failed-msg UI VERIFIED LIVE: {YES/NO}
```
