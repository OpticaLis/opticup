# ACTIVATION_PROMPT — M1_LENS_CATALOG_SEED_FROM_EXCEL (RESUMPTION)

**Paste into Claude Code on Daniel's Windows desktop.** Fresh session OK.

---

You are **opticup-executor**. Resume execution of the SPEC at:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/SPEC.md
```

This is a **MID-SPEC RESUMPTION** — a prior Claude Code session paused cleanly mid-execution after Daniel's "Choice 2" decision. SPEC B's §14 "Resumption State" is the authoritative pickup point. Demo DB pause-state was re-verified from Cowork right before this dispatch and matches §14 exactly (see below).

## Bootstrap (compressed — §14 has full context)

1. Load skill `opticup-executor`. First Action protocol.
2. Read `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/SPEC.md` IN FULL — pay special attention to §3 (entity model), §6 (data transformations), §14 (resumption state).
3. Pre-Action Collision Check:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_CATALOG_SEED_FROM_EXCEL --files-owned-globs "tests/seed-sql/**,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/**" --branch develop
   ```

## Pause-state (verified by Cowork-Architect 2026-05-18 late evening before dispatch)

| Table | Pause count | Target after this run | Delta |
|---|---|---|---|
| `lens_brand` (`owner_tenant_id IS NULL`) | 25 | 25 | 0 — already complete |
| `lens_design` (global) | 145 | 145 | 0 — already complete |
| `lens_variant` (global) | 321 | **683** | **+362** (batch 002 + 003) |
| `suppliers` (tenant=demo) | 38 | **47** | **+9** |
| `supplier_brand_distribution` (tenant=demo) | 0 | **17** | **+17** |
| `supplier_catalog_offering` (tenant=demo) | 41 | **658** | **+617** |

## Execute SPEC §14 step sequence (verbatim, no deviation)

Run via Supabase MCP `execute_sql` (NOT `apply_migration` — these are idempotent DML, not DDL):

1. **Verify pause counts** match the table above. If any count differs → STOP, escalate. (Cowork has already verified — counts WILL match unless something happened in the gap.)
2. Apply `tests/seed-sql/03_variants_batch_002.sql` (250 rows).
3. Apply `tests/seed-sql/03_variants_batch_003.sql` (112 rows).
4. Verify `lens_variant WHERE owner_tenant_id IS NULL` count = 683.
5. Apply `tests/seed-sql/04_suppliers_demo.sql` (9 rows).
6. Verify `suppliers WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` count = 47.
7. Apply `tests/seed-sql/05_distribution_demo.sql` (17 rows).
8. Verify `supplier_brand_distribution WHERE tenant_id = '8d8cfa7e-...'` count = 17.
9. Apply `tests/seed-sql/06_offerings_demo_batch_001.sql` (250 rows).
10. Apply `tests/seed-sql/06_offerings_demo_batch_002.sql` (250 rows).
11. Apply `tests/seed-sql/06_offerings_demo_batch_003.sql` (117 rows).
12. Verify `supplier_catalog_offering WHERE tenant_id = '8d8cfa7e-...'` count = 658.
13. Run `get_advisors(security)` via Supabase MCP — confirm clean (no new advisories from the seed run).
14. **Idempotency check** — re-apply `01_brands.sql` + `02_designs.sql` + `03_variants_batch_001.sql` → assert delta = 0 rows on each of the 3 affected tables. (Counts MUST be unchanged from step 12.)
15. Commit SPEC B closure docs (next section).
16. **STOP** — emit Hebrew line to Daniel: *"דמו זרוע נקי. הרשאת זריעת פריזמה?"* + wait for Daniel's authorization.
17. If Daniel says **go on Prizma** → generate Prizma-tenant variants of `04` + `05` + `06_offerings_*` SQL files (Prizma tenant UUID is in `tenants` table — query for `slug = 'prizma'`). Apply, verify counts, commit. **DO NOT skip the wait at step 16.** Prizma is gated behind explicit Daniel auth — that gate is non-negotiable per the SPEC.
18. If Daniel says **wait** → SPEC B closes 🟢 with Prizma deferred + log deferral in FINDINGS.md.

## Stop triggers (any one → halt, escalate)

- Any count mismatch at verification steps 4 / 6 / 8 / 12.
- `get_advisors` returns a new HIGH/CRITICAL advisory traceable to this run.
- Idempotency check returns non-zero delta (means the ON CONFLICT clauses are broken — major finding).
- Any SQL file fails to apply (constraint violation, FK missing, etc.).

## SPEC B Closure docs (step 15)

Write inside `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/`:

- `EXECUTION_REPORT.md` — final counts, applied files, idempotency result, advisor scan result, Prizma decision pending/applied
- `FINDINGS.md` — any anomalies, deferred items (Prizma if applicable), notes for paired SPEC A pickup
- `FOREMAN_REVIEW.md` placeholder — single line: `_Pending Foreman (Cowork-Architect) review — do not edit, do not delete._`

Then:

```
git add tests/seed-sql/  modules/Module\ 1\ -\ Inventory\ Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/
git commit -m "feat(lens-catalog): SPEC B seed complete — demo populated 9 suppliers / 11 brands / 612 variants / 617 offerings + idempotency verified"
git push origin develop
```

(Per `feedback_no_polish_by_validation.md` mandate: this SPEC SHIPS CODE/DATA CHANGES — applying the seed SQL files IS the work product. Do not close 🟢 without the commit + push completing.)

## After SPEC B closes 🟢 (next paired step — DO NOT execute, just report)

Per SPEC B §14 "Paired SPEC A — also mid-state":
- SPEC A Commit 3 is next (private catalog rewrite, ~1.5h)
- Then SPEC A Commit 4 (Tier C VFV against real seeded data)
- Then SPEC A Commit 5 (closure docs)

When SPEC B is 🟢, emit a Hebrew status line to Daniel listing:
- final counts (variants/suppliers/distribution/offerings)
- Prizma authorization status (granted/deferred)
- commit hash
- next step: "מוכן ל-SPEC A Commit 3 (כתיבה מחדש של הקטלוג הפרטי)?"

…and wait for Daniel before starting SPEC A Commit 3. This is the only legitimate stop here (a real human-in-the-loop decision point, not energy management).

## NO polish-by-validation

If at any point you observe "the existing seed data already covers this" or "the SQL file's row count seems off but I'll proceed anyway" — STOP. SPEC B explicitly mandates idempotent re-application with measurable delta=0 on re-run, and target counts on first-run. Empirical counts ARE the verification. Do not self-certify based on file inspection.

**Bounded Autonomy. Path X. Stop on deviation. No wind-down proposals — pace is Daniel's call.**
