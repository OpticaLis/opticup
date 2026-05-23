# M5_SCHEMA — Findings

> Captures observations during execution that are not deviations but warrant Foreman attention. Per the FOREMAN_REVIEW protocol, each finding gets a decision: (a) new SPEC, (b) TECH_DEBT entry, or (c) dismiss with reasoning.

## F1 — `customers` columns count

The SPEC §0 said "24 added"; actual is 26 (first_name + last_name not counted by author). Foreman next-cycle action: this counting error suggests the SPEC author should produce a per-column manifest in §0 baseline subsection, not a number-of-columns total. Proposal P-AUTHOR-3 below.

**Decision:** dismiss for this SPEC (cosmetic; documented in EXECUTION_REPORT §2). Apply as author-skill improvement (see FOREMAN_REVIEW).

## F2 — Demo branch `tenant_location` rows are M1A smoke leftovers

The demo tenant has 2 active rows in `tenant_location`: `Smoke Loc A (M1A)` (id=e6f26ba3-...; short_code=STA) and `Smoke Loc B (M1A)`. Neither is marked `is_default=true`. M5 smoke used STA as home_branch_id.

**Decision:** dismiss; document in TECH_DEBT as a longer-term cleanup. Demo should have an actual "Demo Optic Store" branch with `is_default=true` for future M5 UI screens to anchor on. Cleanup is one INSERT — file under M5 UI SPEC pre-flight, not this SPEC.

## F3 — Legacy `customers.health_fund` (text) column kept alongside new `health_fund_id` FK

Per SPEC D5 decision (zero-rows everywhere = safe to add new FK without dropping legacy text). M5_MIGRATION SPEC will dual-write from OpticPlus `kupa` text → both columns, then drop the legacy after verification.

**Decision:** dismiss; M5_MIGRATION SPEC handles the drop with explicit Iron Rule 32 declaration.

## F4 — Legacy `prescriptions` table (0 rows, flat shape) still in DB

Pre-M6 stub from earlier project era. NOT used by M6 (M6 builds `prescriptions_glasses` + `prescription_glasses_eyes` pair pattern). The `merge_customers` RPC reassigns the legacy FK as a courtesy (defensive code; will never fire because there are 0 rows).

**Decision:** TECH_DEBT entry — schedule legacy-table cleanup once M6 ships and confirms no consumers. Author will add cleanup to M6_SCHEMA's §7 Out-of-Scope as a future SPEC.

## F5 — Legacy `work_orders` table (0 rows) still in DB

Same as F4 — pre-M7 stub. Will be addressed by M7.

**Decision:** TECH_DEBT entry. Future M7 SPEC.

## F6 — `compute_lifecycle_dormant_sweep` is a stub returning 0

The function exists with a stable signature for future cron scheduling but has no body. Per SPEC §3 Out-of-Scope: "Build the function, don't schedule it." Body will be added in M7 SPEC once orders.created_at is queryable.

**Decision:** dismiss; explicit deferred-by-design.

## F7 — Block A header is duplicated across all 8 functions

The canonical Block A header from `JWT_VALIDATION_HEADER.sql` is currently inlined verbatim in each function (8 copies × ~6 lines each). DRY would suggest a helper SECURITY DEFINER function `assert_tenant_match(uuid)` that the others call. However:
- Inline avoids cross-function call overhead in hot paths.
- Per `SECURITY_HOTFIX_2` lessons, inlining the canonical text is preferred over abstraction because the abstraction has been a source of NULL-comparison bugs in the past.

**Decision:** dismiss; inline duplication is intentional. The canonical reference file (`JWT_VALIDATION_HEADER.sql`) is the source of truth — if it ever changes, run a project-wide `sed`/edit + advisor verification.

## F8 — RPC tests in DO blocks under MCP run as `postgres` superuser

The SQL probes set `request.jwt.claims` via `SET LOCAL`, then invoke the RPC. The RPC's Block A header reads the JWT claims and either bypasses (service_role) or strictly checks. Because the underlying connection is `postgres` superuser, RLS on `customers` etc. does NOT engage in DO blocks even when JWT claims simulate authenticated. This is a smoke-environment limitation: RLS structural verification was done via `pg_policy` queries (16 policies confirmed). True RLS engagement would require a PostgREST round-trip with an anon key.

**Decision:** dismiss; structural verification via `pg_policy` is the canonical Optic Up pattern for SPEC-level RLS smoke (matches how M1A/M1B0 functional smoke ran).

## F9 — Concurrent-Pipeline awareness

This chain ran solo. `scripts/pipeline-coordination.mjs` not invoked (no other Pipeline session running concurrently on the same on-disk repo). Per CLAUDE.md §9 Parallel Pipeline Coordination, this is acceptable for a single-Pipeline session.

**Decision:** dismiss.

## Summary

| # | Severity | Decision |
|---|---|---|
| F1 | Cosmetic | Dismiss + author-improvement proposal |
| F2 | Low | TECH_DEBT (demo branch seed cleanup) |
| F3 | Low | M5_MIGRATION addresses |
| F4 | Low | TECH_DEBT (legacy prescriptions cleanup) |
| F5 | Low | TECH_DEBT (legacy work_orders cleanup) |
| F6 | None | Deferred-by-design |
| F7 | None | Intentional inline |
| F8 | None | Smoke environment limitation, documented |
| F9 | None | N/A — single Pipeline |

No findings require reopening the SPEC. Verdict candidate: 🟢 CLOSED.
