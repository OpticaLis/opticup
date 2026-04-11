# Tier C Investigation Query Results — 2026-04-11

**Source:** A0 of `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` (v1.1)
**Status:** PARTIAL — client portion complete, Dashboard portion pending Daniel (§5.6 Sanity Check)

## Artifacts

| File | Status | Produced by |
|---|---|---|
| `tier_c_results_client.json` | ✅ COMMITTED (this SPEC, A0 step 4) | Claude Code |
| `tier_c_manual_queries.sql` | ✅ COMMITTED (this SPEC, A0 step 5) | Claude Code |
| `tier_c_results_2026-04-11.md` (this file) | ✅ COMMITTED (this SPEC, A0 step 6) | Claude Code |
| `tier_c_results_manual.json` | ⏳ PENDING | Daniel — §5.6 Sanity Check |

## Interpretation note — SPEC labels vs Discovery §4.7 literal Q1-Q8

The SPEC A0 step 3 "specific guidance" uses labels (`Q1a`, `Q1b`, `Q2`) that do
not map 1:1 to Discovery §4.7's literal Q1-Q8. A superset interpretation was
adopted: both (a) SPEC-added queries and (b) Discovery §4.7 literal Q1-Q8 are
classified and included, so neither source's expectations are violated. Full
reasoning is in `phase_a_execution_log_2026-04-11.md` under
"A0 interpretation note".

## Query status

| Label | Source | Category | Status |
|---|---|---|---|
| `Q1a_view_columns` | SPEC add-on | CLIENT | ✅ in `tier_c_results_client.json` (21/22 views; `v_cms_blocks` is a gap — populated from Q1b) |
| `Q1a_anon_grants` | SPEC add-on | CLIENT | ✅ in `tier_c_results_client.json` (22/22 views respond without error) |
| `Q1b_view_bodies` | Discovery §4.7 Q1 | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q2_content_translations_check` | SPEC add-on | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q2_table_columns` | Discovery §4.7 Q2 | CLIENT | ✅ in `tier_c_results_client.json` (19/20 tables; `storefront_media` confirmed nonexistent) |
| `Q3_rls_policies` | Discovery §4.7 Q3 | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q4_rpc_definitions` | Discovery §4.7 Q4 | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q5_tenant_id_indexes` | Discovery §4.7 Q5 | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q6_unique_constraints` | Discovery §4.7 Q6 | DASHBOARD (deferred) | ⏳ in `tier_c_manual_queries.sql` (deferred from client: `information_schema.table_constraints` not reliably exposed via PostgREST) |
| `Q7_rls_enabled` | Discovery §4.7 Q7 | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |
| `Q8_storefront_media_exists` | Discovery §4.7 Q8 (HF3 reuse) | CLIENT | ✅ in `tier_c_results_client.json` — confirms HF3 finding (table does not exist) |
| `dependency_graph` | SPEC add-on (step 5) | DASHBOARD | ⏳ in `tier_c_manual_queries.sql` |

## Client output strategy

The client script uses **PostgREST OpenAPI spec** (`GET /rest/v1/` with
service_role apikey) for column metadata rather than `information_schema`
queries. Rationale: PostgREST exposes OpenAPI 2.0 for all routed schemas
regardless of the caller's role; service_role sees all objects. This avoids
the `information_schema` PostgREST routing uncertainty noted in SPEC A0 step
4's fallback clause. Result: 108 definitions fetched in a single request,
columns + types extracted for 21/22 views and 19/20 tables.

GRANT inference uses anon client head-only selects per view. 22/22 views
respond without error under anon — note that `v_cms_blocks` responds to the
anon probe without error but is missing from OpenAPI definitions; the column
list for `v_cms_blocks` will be populated from Q1b view body during cleanup.

## Reuses from Hotfix

- **Q1b partial (`v_storefront_pages` body):** NOT DIRECTLY REUSABLE.
  HF4's sanity-check step verified the new column `translation_group_id`
  is present on the view but did not capture the full view body SQL. That
  verification is sufficient for A1 step 2's HF4 precondition — see
  `Q1a_view_columns.v_storefront_pages.columns[].column_name` in
  `tier_c_results_client.json` (confirmed 15 columns including
  `translation_group_id`). The view body itself is queued for Q1b.
- **Q8 (`storefront_media`):** HF3 step 2 probed `information_schema.tables`
  for `storefront_media` and variants. Result: table does not exist. This
  SPEC's A0 reused that finding via OpenAPI definitions absence + anon
  probe; both sources agree.

## HF4 verification (blocks A1 start)

- **Check:** `Q1a_view_columns.v_storefront_pages` includes a
  `translation_group_id` entry.
- **Result:** ✅ PASS — 15 columns total, `translation_group_id` present.
- **Consequence:** A1 may proceed. If this had failed, SPEC A1 step 2 would
  have required STOP.

## Impact on Phase A items

Phase A items that depend on Dashboard-only results write partial content now
and get the gaps filled in a later cleanup round. Each gap is marked with an
HTML comment `<!-- TIER-C-PENDING: <what's missing> -->` at the exact location
it's needed.

| Phase A item | Gap | Marker location |
|---|---|---|
| **A1 VIEW_CONTRACTS** | Purpose (requires Q1b view body SELECT clause) | Each view entry, top of block |
| **A1 VIEW_CONTRACTS** | `v_cms_blocks` column list (not in OpenAPI — needs Q1b) | Inside the `v_cms_blocks` entry columns table |
| **A1 VIEW_CONTRACTS** | Golden Reference subqueries (requires Q1b view body) | Inside each view's Golden Reference subsection |
| **A1 VIEW_CONTRACTS** | Rule 29 dependency chain (requires `dependency_graph`) | Inside each view's "Dependencies" and "Rule 29 DROP order" subsections |
| **A3 ARCHITECTURE** | Full DROP/CREATE order across all views (requires `dependency_graph`) | Inside the "View dependency chain" section |
| **A4 SCHEMAS** | `content_translations.entity_type` CHECK verification (requires `Q2_content_translations_check`) | Inside the CHECK constraint subsection |
| **A6 TROUBLESHOOTING** | Byte-match of Golden Reference blocks vs live view bodies (requires Q1b) | Inside §1 above the Golden Reference block |

## Cleanup path

After Daniel runs `tier_c_manual_queries.sql` in Dashboard during §5.6 Sanity
Check and commits `tier_c_results_manual.json`, a later cleanup round reads
the manual results and fills in every `<!-- TIER-C-PENDING -->` marker.
Options for when this cleanup runs:

1. Preamble to `MODULE_3_B_SPEC_saas_core_2026-04-12.md` — first step of
   Phase B is "fill TIER-C-PENDING markers from `tier_c_results_manual.json`".
2. Dedicated mini-SPEC `MODULE_3_A_CLEANUP_SPEC_tier_c_fill_2026-04-12.md` —
   runs between Phase A Sanity Check and Phase B start.
3. **Daniel's choice** — the Phase B SPEC will specify which path is taken.

**The cleanup is NOT blocking for Phase B's main work.** Phase B can begin
with the markers still present as long as the SaaS hardening work it performs
does not touch the marked sections.

## Summary counters (from `tier_c_results_client.json`)

```
views_with_columns:    21 / 22  (v_cms_blocks missing — cleanup from Q1b)
views_anon_granted:    22 / 22
tables_with_columns:   19 / 20  (storefront_media missing — confirmed nonexistent)
openapi_definitions:   108 total
```
