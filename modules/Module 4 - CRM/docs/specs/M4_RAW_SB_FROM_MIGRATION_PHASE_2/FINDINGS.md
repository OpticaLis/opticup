# FINDINGS — M4_RAW_SB_FROM_MIGRATION_PHASE_2

## F-01 (key blocker) — DB.select missing `head: true` support
**Severity:** MEDIUM.
**What:** PostgREST `head: true` (count-only HEAD request) is the canonical efficient way to get a row count without fetching rows. Used in dashboard's `leadsCountQ` + `returningQ`, and in many other "X total" displays. `DB.select` in `shared/js/supabase-client.js` doesn't currently surface this option — must add `head: true` to the `query.select(cols, { count, head })` call.
**Resolution:** part of `M4_DB_WRAPPER_EXTENSION` SPEC.

## F-02 — DB.select doesn't auto-handle chained `.in()`, `.not()`, `.is()`
**Severity:** LOW-MEDIUM.
**What:** Many migration targets use `.in('col', list)` or `.is('col', null)` chains. `DB.select` requires falling through to `rawFilters: (q) => q.in(...).is(...)` which defeats the readability win. Could be addressed by extending DB.select to accept `in: { col: list }`, `is: { col: null }`, etc.

## F-03 — RPC return-shape variants
**Severity:** LOW.
**What:** `DB.rpc(...)` exists but Item 1's experience with the jsonb-shape fallback showed RPC callers need defensive parsing. A second wrapper helper (`DB.rpcJsonbArray`) that combines `DB.rpc` + `unwrapJsonbArray` would close the loop.

## F-04 (INFO) — Supabase outage during this run
**Severity:** INFO.
**What:** Direct DB.select call returned `upstream request timeout` after 179 s. Same outage symptom as Item 1's verification window. Not a wrapper or code defect.

---
*End of findings.*
