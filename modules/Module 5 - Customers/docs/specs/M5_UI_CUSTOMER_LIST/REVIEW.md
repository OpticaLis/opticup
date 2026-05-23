# M5_UI_CUSTOMER_LIST — Code Review

> **Reviewer:** opticup-reviewer · **Date:** 2026-05-23
> **Subject:** 3 commits on develop: `d423940` (SPEC seal) → `e7e18b0` (build) → (close)
> **Scope:** 4 new page JS + 4 additive edits (customers.html, css/customers.css, customer-card.js list-mode branch, customer-card-coming-soon.js registry additions).

## Review Report — M5 Phase E — Customer List + Create-Mode

### Iron Rule Compliance

✅ **All hard rules satisfied** (no violations). Soft audits clean.

| Rule | Verdict | Spot-check |
|---|---|---|
| 5 — FIELD_MAP | ✅ | No new fields rendered beyond Phase D's M5 FIELD_MAP entries. |
| 7 — DB via helpers | ✅ | `grep -n "sb\.from" modules/customers/customer-list*.js modules/customers/customer-create.js` → 0 hits. All reads via `DB.select`; the create via `DB.rpc('create_customer', {p_tenant_id, p_payload}, opts)` (named-key signature). |
| 8 — sanitization | ✅ | escapeHtml on every dynamic interpolation in all 4 new files. Verified by manual spot-check of customer-list.js rowHtml + customer-create.js existingCustomerSurface + customer-list-sidebar.js. |
| 9 — no hardcoded business values | ✅ | tenant name + branch from `sessionStorage.tenant_name_cache` / `tenant_location`. No literal tenant strings. |
| 10 — no name collisions | ✅ | Pre-flight sweep verified. All new globals (`renderCustomerList`/`mountCustomerList`/`renderListSidebar`/`bindListSidebar`/`normalizePhoneQuery`/`CUSTOMER_LIST_PILLS`/`applyListSearch`/`applyListPillFilter`/`renderListFilterPills`/`openCustomerCreateModal`) are unique. |
| 12 — file size | ✅ | Largest new file: customer-list.js 271 lines (well under 300 target). |
| 21 — no orphans/duplicates | ✅ | ONE `showComingSoon` handler reused; 11 keys added to existing registry (additive). Reuses `Toast.*` / `escapeHtml()` / `getTenantId()` / `DB.*` / `bindComingSoon` / `loadSession` from Phase D. |
| 22 — defense in depth | ✅ | `DB.*` wrapper auto-injects `tenant_id`; `create_customer` RPC call passes `p_tenant_id: getTenantId()` explicitly. |
| 23 — no secrets | ✅ | No hardcoded credentials. |
| 31 — integrity gate | ✅ | exit 0 across all commits (52 files scanned). |
| 32 — destructive ops | ✅ | Declared additive ops + S7 single-row INSERT+DELETE on demo. Pre-commit hook 0 violations across all 8 staged files. |
| 34 — Chrome MCP closure | ✅ | 4 JPEGs + trace event order for both create paths + DB-write evidence (pre/post counts) + mockup-vs-live notes. |

### Security & SaaS Integrity

✅ **No security issues.**

- **RLS:** all reads through `DB.*` wrapper auto-inject tenant_id. List view fetches go through `v_customer_for_exam` + `v_customer_full` which use security_invoker. The PIN-issued JWT carries tenant_id → RLS engages correctly. Verified by S1 (only demo rows render — no cross-tenant leak).
- **Auth flow:** reuses Phase D's `loadSession()` page-boot pattern. No new auth surface.
- **`create_customer` RPC:** server-side Block A JWT validation already in place (verified from RPC body in §0 pre-flight). The UI passes `p_tenant_id: getTenantId()` explicitly — Block A then re-validates against the JWT claim. Defense in depth maintained.
- **Cross-tenant write attempt:** would be rejected by Block A (42501) before reaching the INSERT. Not smoke-tested directly because the PIN-issued JWT can't claim a tenant_id different from its own; tested by code review.

### Code Quality

Findings (none block-class):

1. **F-LIST-PHONE-VIEW (already in FINDINGS.md):** the parallel-zip pattern for phone/email/city/id_number works but is 1 extra fetch + a merge step. A future `v_customer_for_list` view would reduce this to 1 round-trip and is logged as TECH_DEBT.

2. **F-LIST-PHONE-NORMALIZE (already in FINDINGS.md):** client-side normalization is correct for now. Server-side phone-suffix index (generated column) would let Prizma-scale search filter at the DB instead of after-fetch — logged as TECH_DEBT.

3. **F-LIST-MOCKUP-COLUMNS (already in FINDINGS.md):** documented out-of-scope per `feedback_no_polish_by_validation`. Acceptable.

4. **`customer-list.js` exposes `window.__customerListState` + `window.__customerListFetch` + `window.__customerListRerender`** — these are intentional cross-module hand-offs (customer-create.js reads `__customerListState.branches` for the default branch). Reasonable but slightly leaky. A future cleanup could move these into a `window.M5CardList = { ... }` namespaced object similar to `window.M5Card`. Cosmetic; not a blocker.

5. **Pagination is fetch-bounded (limit=50) but no UI "load more" yet** — for demo (19 rows) this is fine; the SPEC §3 #14 documents this. A Prizma-scale rollout will need a "load more" button or infinite scroll; logged in TECH_DEBT as F-LIST-PAGINATION-UI.

### Recommendations

#### Priority fixes (before close)
None.

#### Nice-to-have (defer to follow-ups)
1. **F-LIST-PAGINATION-UI** — add "load more" or infinite scroll for the list when count > PAGE_SIZE.
2. **F-LIST-PHONE-VIEW** — ship `v_customer_for_list` consolidating composite + phone + email in one fetch.
3. **F-LIST-PHONE-NORMALIZE** — `customers.phone_e164_suffix` generated column for server-side indexed search.
4. **F-LIST-MOCKUP-COLUMNS** — incremental enrichment once M6/M7/M13 ship (last_exam, last_order, loyalty tier).
5. **F-LIST-STATE-NAMESPACE** — wrap `__customerListState` / `__customerListFetch` etc. into `window.M5CardList`.

### Verdict

🟢 **PASS — proceed to Foreman closure.**

The list + create-mode are functional, dedup-safe, RLS-isolated, file-size-compliant, and Iron-Rule-34-evidenced. **M5's screen layer is complete.** The pattern is now established for M6 (next module) to copy: same shared.js + DB.* + escapeHtml + showComingSoon discipline + Chrome MCP closure recipe. Reviewer has no blocking findings.
