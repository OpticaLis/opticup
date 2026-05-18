# FOREMAN_REVIEW — M1_LENS_PRICING_REBUILD

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRICING_REBUILD/FOREMAN_REVIEW.md`
> **Written by:** opticup-architect (Cowork session)
> **Written on:** 2026-05-17 (night, post-Group A close)
> **Commits reviewed:** `cee4994..fb7ed46` (4 commits + 1 hotfix, ~2.5h execution)

---

## 1. Verdict

🟢 **CLOSED.** All structural success criteria PASS. Tier C VFV live (4 screenshots, `effectivePrices.size=41`, real price ₪85). View-mode toggle + readonly mode verified. Notes UI ships but CREATE blocked by FK gap (F-1). F-5 resolver code-correct but demo data incomplete.

## 2. SPEC Quality Audit

**What worked exceptionally:**
- **F-5 isolation in Commit 2** (`cee4994`) — sell-price resolver shipped + verified BEFORE pricing screen rebuild. Architectural win. Tier C proved resolver works via 41-row pricing-screen consumer.
- Step 1.6 + 1.7 caught phantom paths at author time (2 finds, resolved in §0).
- 4-commit decomposition: Foreman seal → F-5 isolation → main rebuild → Tier C hotfix.

**What missed:**
- §0 didn't probe `lens_variant_notes.author_id` FK target. SPEC 3 created it pointing to `auth.users(id)`. Project uses PIN auth → no `auth.users` rows → CREATE notes silently blocked. Caught only at Tier C.
- §0 didn't note demo `stock_lot` has 0 rows with `supplier_offering_id` → F-5 cross-tab verification couldn't run end-to-end on Inventory lots-table.

**SPEC quality:** 7/10. F-5 isolation was brilliant; FK + demo-data probes missed.

## 3. Execution Quality Audit

4 atomic commits + 1 hotfix (`070a30d` — suppliers `.eq('is_deleted')` on non-existent column). Hotfix absorbed correctly mid-Tier-C, finding logged. Iron Rules clean. Executor self-score 9.2/10 — concur.

**Execution quality:** 9.7/10. F-5 isolation pattern should be promoted to a project-wide best practice.

## 4. Findings Processing

| Code | Severity | Disposition |
|---|---|---|
| F-1 lens_variant_notes.author_id FK to auth.users | **MEDIUM** | **NEW_SPEC** `M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX` (~30 min) — drop FK, re-add → `employees(id) ON DELETE SET NULL`. Notes table empty → zero risk. **Dispatch BEFORE any Group B/C SPEC writes to lens_variant_notes.** |
| F-2 demo stock_lot.supplier_offering_id all NULL | INFO | **OPTIONAL** `M1_DEMO_BACKFILL_STOCK_LOT_OFFERING_IDS` (~30 min) OR wait for natural Quick Receipt fill |
| F-3 (ABSORBED) suppliers .eq('is_deleted') bug | LOW | **RESOLVED** in hotfix `070a30d` — no follow-up |

## 5. Self-Improvement Proposals

### Author-skill (opticup-strategic)

**A-1 — FK target probe in §0.** When a SPEC's first-consumer SPEC writes to a table for the first time, §0 must include `pg_constraint` query showing all FK targets. Any FK to `auth.users(id)` → STOP, schema needs fix BEFORE consumer ships. Caught F-1.

**A-2 — Demo-data baseline probe in §0.** When a SPEC's consumer wiring depends on N rows of a specific column existing, §0 must include `SELECT count(*) FROM table WHERE col IS NOT NULL` baseline. Would have surfaced F-2 at author time.

### Executor-skill (opticup-executor)

**E-1 — Schema-column verification before `.eq()`.** Before any `.eq(column, value)` on a table not in the SPEC's recent-touch list, probe `information_schema.columns`. Silent-empty filters are invisible bugs. Caught F-3.

**E-2 — FK target verification on first CRUD path.** Before first INSERT/UPDATE through any new RPC or table, run `pg_constraint` grep for FK targets. Any FK to `auth.users(id)` in a PIN-auth project → STOP, escalate.

## 6. Strategic Flag for Daniel

**F-5 sub-check truth:** Resolver code is correct (proven 41-row). But Inventory lots-table cells still show '—' because demo `stock_lot.supplier_offering_id` is NULL on all 19 rows. Daniel must decide if F-2 demo-backfill is worth the ~30 min, or if natural Quick Receipt usage will fill the gap organically.

## 7. Verdict

🟢 **CLOSED.** Largest SPEC of the 6. F-5 architectural decoupling is a project-pattern worth preserving. F-1 + F-2 well-scoped follow-ups.
