# M5_UI_CUSTOMER_LIST — Findings

## F-LIST-PHONE-VIEW — `v_customer_for_exam` does not expose `phone`

**Severity:** LOW (resolved in code).
**Location:** `v_customer_for_exam` (M5_SCHEMA).
**Description:** During the first list-render smoke (S1) the phone column was "—" for all 19 customers because the primary list view `v_customer_for_exam` (15 cols) does not surface `phone`. Caught immediately by the a11y snapshot. Fix: merge phone (+email/city/id_number) into the list rows from the parallel `v_customer_full` fetch (which the page already does for `lifecycle_stage`).
**Decision:** Resolved in code (`customer-list.js` merge step). For richer per-customer display, M5 could ship a dedicated list-shaped view (`v_customer_for_list`) that exposes the union of v_customer_for_exam composite-display + phone + email. Logged here as a future TECH_DEBT — non-blocking.

## F-LIST-PHONE-NORMALIZE — Phone storage is `+972` E.164, search must normalize client-side

**Severity:** LOW (resolved in code).
**Location:** Search bar in customer-list.js + `normalizePhoneQuery` in customer-list-filters.js.
**Description:** All demo customer phones stored as `+972…` (international E.164). A user typing `050-3348349` or `0503348349` would not match against `+972503348349` with a naive ILIKE. Fixed by client-side normalization: strip non-digits + strip a leading `0` + ILIKE `%<digits>%` against the stored phone. Suffix match works across both local and E.164 formats.
**Decision:** Resolved in code. A future schema follow-up could add `customers.phone_e164_suffix` as a generated column for server-side index + faster Prizma-scale search; logged as TECH_DEBT (not blocking demo or Prizma scale).

## F-LIST-MOCKUP-COLUMNS — Mockup row design includes aspirational columns

**Severity:** LOW (documented out-of-scope).
**Location:** Mockup `M5_CUSTOMERS_LIST_MOCKUPS.html` Sketch 2 vs. live `customer-list.js` rowHtml.
**Description:** The mockup row template includes: club tier pill (e.g. "⭐ Gold"), id_number + age subtext, email-verified subtext, health-fund pill ("פלטינום"), last-exam-date + optometrist name, last-order number + amount, action buttons (📅 💬 📞). None of these are wired in Phase E because:
- Club tier — M13 Loyalty (not built).
- Age — requires `birth_date`; demo customers have it NULL.
- Email-verified — `customers.email` exists but no verification state column.
- Last-exam — requires `v_exam_for_customer` join (M6 — works in principle; out-of-scope for the list render this SPEC).
- Last-order — requires `orders` aggregation (M7 — out-of-scope this SPEC).
- 📅 💬 📞 row-action buttons — coming-soon (M14 / M12 / telephony).

**Decision:** Documented out-of-scope (per memory `feedback_no_polish_by_validation`: ship only what's wired). The Phase E row template renders the wired subset: avatar + name + lifecycle pill + customer_number_display + phone + health_fund_name + "פתח כרטיס". A future SPEC adds the aspirational columns once the data exists.

## F-LIST-RESIDUAL-CUSTOMER — Pre-Phase-E demo state has 1 unexpected customer

**Severity:** INFO (not introduced by this SPEC).
**Location:** demo `customers` table.
**Description:** Pre-smoke count of demo customers was 20 (not the 19 captured in M5_SCHEMA EXECUTION_REPORT). The +1 row likely originated from an earlier Phase D smoke or LeadsMigration re-run that left 1 row in place. The Phase E smokes did not create this row; my S7 cleanup removed only the row I created (`dd1e7b93-...`). Post-smoke count remains 20.
**Decision:** Out of scope — Phase E neither created nor removed this row. Logged for visibility; a future demo-state cleanup SPEC can prune it if desired.

## F-LIST-TRACE-RACE — Smoke-harness `create_customer_resolved` trace event race

**Severity:** INFO (test-only).
**Location:** S7 smoke harness in TEST_REPORT.
**Description:** The smoke checked the trace at +400ms after submit, before the `create_customer_resolved` event was pushed (the RPC roundtrip + event push completed at ~427ms based on S8 timing). DB delta confirmed the create succeeded; the trace was correct, just queried too early. Not a code bug — a smoke-harness timing race.
**Decision:** Dismiss (test artifact). Future smokes can wait longer (~800ms) before reading the trace.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-LIST-PHONE-VIEW | LOW | Resolved in `customer-list.js`. TECH_DEBT for future list view. |
| F-LIST-PHONE-NORMALIZE | LOW | Resolved in `customer-list-filters.js`. Future TECH_DEBT for server-side phone index. |
| F-LIST-MOCKUP-COLUMNS | LOW | Documented out-of-scope. Future SPEC after M6/M7/M13. |
| F-LIST-RESIDUAL-CUSTOMER | INFO | Not introduced by Phase E. Dismiss. |
| F-LIST-TRACE-RACE | INFO | Test-only artifact. Dismiss. |

No reopener-class findings. The list + create-mode are functional + dedup-safe + Iron-Rule-34 closure evidence is complete.
