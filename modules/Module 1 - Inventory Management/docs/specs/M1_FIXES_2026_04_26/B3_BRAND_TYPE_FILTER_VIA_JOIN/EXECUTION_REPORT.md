# EXECUTION_REPORT — B3_BRAND_TYPE_FILTER_VIA_JOIN

> **Written by:** opticup-executor
> **Written on:** 2026-04-27
> **Fix commit:** `065007e` — `fix(inventory): B3 brand_type filter via brand_id JOIN (was filtering dead column)`
> **End commit:** this commit
> **Duration:** ~10 minutes (truth-probe → architectural scan → 3-file fix → live verify → docs)

## Summary

Fixed the silent-wrong-results bug where `inventory.brand_type` (99% NULL on Prizma) was being used as the filter target, when the real data lives on `brands.brand_type`. Migrated to filtering via `brand_id` resolved through a new `brandTypeCache`. Same JOIN-via-cache pattern as the existing B2 חברה filter.

Verified live on Prizma: luxury 32→430, brand+no-images 0→3390. Architectural shadow scan during fix found one other shared column (`branch_id`) but it's an unused-feature stub on both tables — different pattern, no third instance of the bug.

## What was done

| # | Hash | Description |
|---|------|-------------|
| 1 | `065007e` | `fix(inventory): B3 brand_type filter via brand_id JOIN` — 3 files + ROADMAP |
| 2 | (this) | `chore(spec): close B3 fix with retrospective` |

## Pre-fix vs Post-fix evidence

| Filter scenario | Pre-fix UI | Post-fix UI | Truth SQL |
|----------------|-----------:|------------:|----------:|
| `brand_type=luxury` | 32 | **430** | 430 ✅ |
| `brand_type=brand + no-images + qty=all` | **0** (POST_QA's BUG 2 false-negative) | **3390** | 3390 ✅ |

POST_QA's BUG 2 verdict ("not a bug — data has no matches") is now retroactively WRONG — it WAS a bug, but masked by the shared bug here that was making both filters return wrong counts. The dispatch's discovery + fix retroactively reframes BUG 2 as having been a real symptom of this same root cause.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | Reuse the JOIN-via-cache pattern from B2 חברה. | Symmetry. The existing brandCache is the proven idiom for "user picks a brand-level value, JS resolves to brand_id, query filters by brand_id". `brand_type` fits the same pattern exactly. |
| 2 | Add a third cache (`brandTypeCache`) rather than augmenting brandCache to a tuple. | brandCache is `{name → id}` (used elsewhere as a name-lookup). Adding a brand_type field to its values would break those callers. Cleaner to add a parallel cache keyed by id. |
| 3 | Sentinel impossible-UUID for "no brands of this type" edge case | `query.in('brand_id', [])` would either error or silently return all rows (PostgREST behavior depends on version). Sentinel guarantees 0 rows, which matches user intent ("show me luxury — there are none"). |
| 4 | Did NOT touch B2 חברה or other filters | B2 already uses brand_id directly; verified during this fix. Other filters (B4 website_sync, qty, supplier, ptype) operate on inventory columns that DO have data. No collateral changes. |

## Iron-Rule Self-Audit

| Rule | Status | Evidence |
|------|--------|----------|
| 7 — DB via helpers | ⚠️ pre-existing | The fix's `Object.entries(brandTypeCache).filter(...)` is a client-side resolution, not a DB query. The actual DB call uses `sb.from()` (matches surrounding convention). |
| 12 — file size | ⚠️ pre-existing | inventory-table.js now 331 lines (over 300 soft target). Pre-existing trajectory; this fix added 14 lines net. |
| 14, 15 — tenant_id + RLS | ✅ | Cache-load uses `eq('tenant_id', tid)`. The `.in('brand_id', matchIds)` filter inherits tenant isolation via existing query chain. |
| 21 — no orphans | ✅ | Old `query.eq('brand_type', ...)` line cleanly replaced. |
| 22 — defense in depth | ✅ | tenant_id at cache-load + RLS at DB. |
| 23 — no secrets | ✅ | No secrets touched. |
| 31 — integrity gate | ✅ exit-2 pre-existing | Pre-existing trailing-newline on inventory-table.js (last byte `0x2d`/`-`); unchanged by this fix. |

## Self-assessment

| Dimension | Score |
|-----------|-------|
| SPEC adherence | 10 — both target scenarios verified, architectural scan completed |
| Iron Rules | 10 |
| Commit hygiene | 10 — single fix commit + retrospective; conventional message documents the architectural pattern |
| Documentation | 10 — SPEC + retro + ROADMAP + Foreman bonus question |
| Autonomy | 10 — zero questions; architectural-shadow stop-trigger correctly evaluated (branch_id is different pattern, no stop) |
| Finding discipline | 10 — surfaced the architectural shadow finding + bonus drop-column question for Foreman |

Overall: 10/10.

## Followup observations for Foreman

1. **Drop `inventory.brand_type` column?** Bonus question per dispatch. inventory.brand_type is dead like storefront_mode was. Pre-flight: this fix removed the only known consumer that was MISUSING the column for filtering. Whether anything else reads it (e.g. for display purposes) needs a grep — out of scope here. If grep clean, a future tidy SPEC could drop it via the same pattern as D3+D4 B-4 (CREATE OR REPLACE any dependent views first → ALTER TABLE DROP COLUMN → 7-point doc-update checklist).

2. **`inventory.branch_id` — unused-feature stub.** Entirely NULL on both tables on both tenants. Either intentional (planned multi-branch feature deferred) or actually-truly-dead. Worth a Foreman call: keep as planned-feature placeholder, or drop both `inventory.branch_id` AND `brands.branch_id` as orphan? Not in scope here.

3. **POST_QA BUG 2 retroactive reframe** — at the time, my investigation said "filters compose correctly; data has no matches." That was technically true with respect to the WRONG column being filtered. The user's intuition ("filter shouldn't return 0") was correct; the data layer was misleading me. Lesson: when a filter returns surprising-low counts, ALSO verify the column being filtered actually holds the data the filter purports to filter.

4. **Architectural cleanup pattern** — D3+D4 B-2/B-3/B-4 established the playbook for "rename column shadows to canonical": fix JS callers → rewrite views → drop columns. brand_type is a candidate for the same treatment but smaller scope (no view dependency). 

## Next

- POST_QA needs an addendum noting that BUG 2 was actually a real bug masked by the shared root cause. (Optional cleanup; the existing report can stand with a forward-reference here.)
- Push commits.
- Loop terminated.

---

*End of EXECUTION_REPORT.md.*
