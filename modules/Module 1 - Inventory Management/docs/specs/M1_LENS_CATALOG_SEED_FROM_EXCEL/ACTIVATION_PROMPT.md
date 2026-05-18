# ACTIVATION_PROMPT — M1_LENS_CATALOG_SEED_FROM_EXCEL

**For:** opticup-executor, Path X sequential. **Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_SEED_FROM_EXCEL/SPEC.md`

## Pre-flight (verify before starting)

- `tests/קטלוג-עדשות-18.5.26.xls` exists (715 KB, 2904 data rows confirmed 2026-05-18)
- `python -c "import xlrd, openpyxl"` succeeds (both installed earlier in this session)
- Constraints checked: `supplier_brand_distribution` + `supplier_catalog_offering` lack logical UNIQUEs — SPEC §4 includes 2 ADD CONSTRAINT DDLs
- Demo tenant has 38 existing suppliers; 9 will UPSERT by (name, tenant_id) — some likely already exist by name
- Demo tenant has 41 existing `supplier_catalog_offering` rows — coexist with 2904 new (UPSERT semantics)

## Bounded Autonomy

- §3: 18 measurable criteria
- §4: 2 DDLs + 9 bulk-UPSERT operations declared
- §5 PRIZMA seed GATED on Daniel explicit auth (single message, STOP-and-wait)

## Execution sequence

1. Apply 2 ADD CONSTRAINT migrations (Commit 1)
2. Write parsing script + generate seed SQL
3. Execute demo seed via Supabase MCP (commit demo data + execution log) (Commit 2)
4. Run Tier C verification (S4-S15)
5. **STOP — emit "Demo seeded clean. Authorize Prizma seed?" message to Daniel**
6. If Daniel says go → execute Prizma seed (Commit 3a)
7. If Daniel says wait → skip Prizma (Commit 3b)
8. Close SPEC (Final commit)

## Stop-on-deviation

- Excel row count != 2904
- Brand count post-dedup != 11
- Supplier count != 9
- Any UPSERT fails
- Any NULL violation
- Prizma INSERT attempted before Daniel auth (CRITICAL)
- get_advisors returns new ERROR

## Constraints

- All Iron Rules enforced. No bypass.
- No edits to JS/UI files (those belong to paired SPEC A)
- No edits to RLS policies or RPCs

## Final report

- Commits + git status
- Row counts per table (S4-S9)
- Re-run idempotency proof (S10)
- Prizma authorization outcome (executed vs deferred)
- get_advisors status
- Paired SPEC A: ready to run Pass 2 Tier C

---

**END ACTIVATION_PROMPT**
