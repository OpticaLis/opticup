# M4 Sprint 3 — Close-Out Report

> **Date:** 2026-05-22
> **Trigger:** Daniel verified the DB post-Supabase-outage and found Sprint 3's Items 4+5 migrations had silently NOT applied. Re-applied + verified all deferred items.

## What changed on the live DB this session

| Item | Migration applied | Smoke-test |
|---|---|---|
| **4** (bulk-approve RPC) | `crm_bulk_approve_leads_to_tier2` RPC LIVE | 3 sentinel leads (`M4_SPRINT3_CLOSEOUT_2026_05_22`) → RPC returned `{promoted:2, blocked_no_terms:1, total:3}`; 2 SCE rows fired; 2 bulk-notes inserted; atomic transaction ✓ |
| **5** (label col + edit/delete) | `short_links.label` column LIVE; `crm_create_static_short_link(uuid,text,text)` / `crm_update_static_short_link` / `crm_delete_static_short_link` LIVE | Create with label `"sprint3 closeout test"` → code `5c3c5436`. Edit → label `"sprint3 closeout edited"` + new URL. Delete → row gone, `clicks_deleted:0` ✓ |
| **6** (tenant-scoped UNIQUE) | Pre-check returned **0 cross-tenant collisions** → applied: dropped global `short_links_code_unique` + added `short_links_tenant_code_unique (tenant_id, code)`. Lookup index `idx_short_links_code` retained. | DO-block sanity tests: same code on demo + Prizma → both succeed (cross-tenant duplicates now allowed); second same-code on demo → `unique_violation` (intra-tenant duplicates still blocked) ✓ |
| **1** (jsonb shared helper) | EF was already v36 from prior commit | curl `dispatch_preview` at demo (10,002 tier2 audience = Daniel's 10K + 2 promoted Sprint3-closeout-leads): **STATUS:200 in 2.46s**, `count: 10002`, `recipients: 10002`, `created_at` populated, first recipient = `Load Test Lead 00000` (Daniel's). ✓ |

## Daniel's 10K test leads — verified intact

| Metric | Value |
|---|---|
| `crm_leads WHERE utm_campaign='M4_DANIEL_MANUAL_TEST_2026_05_21'` | **10,000** (unchanged from session start) |
| `M4_SPRINT3_CLOSEOUT_2026_05_22` residual | 0 (3 smoke-test leads + their children cleaned up) |
| Any Prizma writes | 0 (Item 6 sanity-test inserted 1 prizma `short_links` row to validate cross-tenant duplicate codes; that row was deleted at the end of the DO block) |

## Migration mirror files committed

| File | Status on live DB |
|---|---|
| `supabase/migrations/20260522070000_m4_bulk_approve_leads_to_tier2_rpc.sql` | applied (live) |
| `supabase/migrations/20260522070100_m4_short_links_label_column_and_edit_delete_rpc.sql` | applied (live) |
| `supabase/migrations/20260522070200_m4_short_links_code_tenant_scoped_unique.sql` | applied (live) |

Note: the older un-applied migration files from the failed Sprint-3 timestamps (`20260521210000_*`, `20260521211000_*`) remain in `supabase/migrations/` as committed earlier. They contain `CREATE OR REPLACE FUNCTION ... IF NOT EXISTS` guards that are idempotent, so re-running them on a fresh-environment deploy would no-op against the now-live state. Safe to leave; no cleanup needed.

## Per-Item verdict change

| Item | Sprint 3 close verdict | Now |
|---|---|---|
| 1 | 🟡 deferred verification | 🟢 verified live |
| 2 | 🟡 deferred (DB wrapper gaps) | UNCHANGED — deferred to Sprint 4 dedicated SPEC |
| 3 | 🟢 | 🟢 |
| 4 | 🟡 deferred verification | 🟢 verified live + atomic transaction proven |
| 5 | 🟡 deferred verification | 🟢 verified live (create + edit + delete) |
| 6 | 🟡 AUTHORED ONLY | 🟢 applied + sanity-tested |

## Develop ↔ live DB consistency
- All RPCs referenced by `develop`'s JS are LIVE on the DB.
- All migrations applied are mirrored as `.sql` files in `supabase/migrations/`.
- No JS file on `develop` references a missing column or RPC.

**Safe to merge `develop` → `main`.**

---
*End of close-out report.*
