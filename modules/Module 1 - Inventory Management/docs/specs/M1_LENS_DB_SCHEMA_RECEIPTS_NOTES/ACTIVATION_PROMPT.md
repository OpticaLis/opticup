# ACTIVATION_PROMPT — SPEC 3: M1_LENS_DB_SCHEMA_RECEIPTS_NOTES

**Paste into a NEW Claude Code session on Daniel's Windows desktop.** Open in **terminal #2**, parallel to terminal #1 (SPEC 2).

---

You are **opticup-executor**. Execute the SPEC authored at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/SPEC.md
```

The SPEC was authored 2026-05-17 by the Foreman. Parent Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`.

## Important — Foreman pre-flight discovery

The SPEC author (opticup-strategic) ran a DB pre-flight that revealed:
- **Brief originally named `lens_variant_stock_entries`** — table doesn't exist. Actual receipt-event table is `purchase_receipt` (from Lens-1A).
- **3 of the 4 columns the Brief named are already present** on `purchase_receipt`.
- **ALTER scope reduced from 4 columns to 1.**

SPEC §0 documents the verified column list. Trust the SPEC, NOT the Brief, for column names.

## Bootstrap

1. Load skill `opticup-executor`. Run First Action protocol.
2. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --pipeline M1_LENS_DB_SCHEMA_RECEIPTS_NOTES --files-owned "supabase/migrations/**,docs/GLOBAL_SCHEMA.sql,docs/DB_TABLES_REFERENCE.md,modules/Module 1/docs/db-schema.sql" --branch develop
   ```
3. **Important parallel-session awareness:** SPEC 2 (`M1_5_SHARED_COMPONENTS_PHASE_0`) is running concurrently in terminal #1. Its `files_owned_globs` are JS/CSS/HTML in `shared/**` + `modules/Module 1.5/**`. There should be NO overlap. Verify before claiming.

## Execute SPEC

Read `SPEC.md` in full + run §0 pre-flight one more time live (don't trust author's claim without re-verification per Iron Rule 31 + Step 1.5 Cross-Reference Check).

SPEC scope (~2h):
- 1 ALTER on `purchase_receipt` (only the 1 missing column — verify which via §0)
- CREATE TABLE `lens_variant_notes` + tenant_isolation RLS (canonical Iron Rule 15 pattern: JWT claims, NOT auth.uid)
- 2 permission keys: `inventory.view_cost_price` + `lens_pricing.edit`
- Update `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` + Module 1 db-schema.sql

## DB Autonomy Level

This SPEC is **SQL Autonomy Level 3** (schema changes). Daniel has authorized this SPEC's DB changes via the parent Brief — execute without per-migration approval. BUT:
- Apply via Supabase MCP (`apply_migration`)
- Verify advisors clean after each migration (`scripts/audit/advisors-for-objects.mjs` if available, else `get_advisors` MCP)
- Log to MIGRATION.md in the SPEC folder per Executor SKILL Step 2 (E1 pattern)

## No time budget

Per Brief §"No time budget" — quality wins. If the SPEC needs 3h instead of 2, that's correct.

## Stop-on-deviation triggers

- §0 pre-flight reveals SCHEMA DIFFERENCE from SPEC text → STOP, write findings, escalate
- Coordination collision with SPEC 2 → STOP
- Advisor returns HIGH after any migration → STOP, do not proceed
- Iron Rule 14 (tenant_id) or 15 (RLS) or 18 (UNIQUE tenant_id) ambiguity → STOP

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md in SPEC folder
2. MIGRATION.md applied-log
3. Update Module 1 SESSION_CONTEXT + CHANGELOG + db-schema.sql
4. Commit + push to `origin/develop`
5. Release lock
6. Notify Daniel: schema delta, advisor results, blockers

**This is a critical DEPENDENCY for SPEC 4a (Inventory Quick Receipt integration) and SPEC 5 (Pricing rebuild — notes table consumer).** Close it cleanly.
