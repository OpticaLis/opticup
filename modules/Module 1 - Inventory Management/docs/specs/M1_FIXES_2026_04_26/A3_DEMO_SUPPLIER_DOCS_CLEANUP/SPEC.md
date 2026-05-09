# SPEC — A3: Cleanup demo tenant supplier-docs

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T6, Tier 2)
> **Created:** 2026-04-27
> **Severity:** LOW (housekeeping)
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row A3

## Goal

Delete 119 PDFs (~64 MB) from the `supplier-docs` Storage bucket scoped to the demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). Leave Prizma's 1 PDF (`6ad0781b-...` prefix) untouched.

## Pre-flight (verified 2026-04-27)

- 120 total files in bucket: 119 demo + 1 Prizma + 0 ambiguous.
- Path scoping: tenant UUID is the top-level path prefix (`<tenant_uuid>/<subfolder>/<file>.pdf`).
- All 119 demo files are March-April 2026 OCR test artifacts.

## Execution

Self-deleting one-off script (`scripts/t6-delete-demo-supplier-docs.mjs`) using supabase-js + service role:

1. Recursive list (SDK's `list()` doesn't recurse — walk subfolders manually).
2. Filter paths by demo prefix; **abort** if any path doesn't match demo OR prizma prefix (zero ambiguity tolerance).
3. Batch-remove demo paths in chunks of 100.
4. Verify post-delete count via SQL.

## Result (2026-04-27)

- Total paths discovered: 120.
- Demo (deleted): 119 (100/100 + 19/19).
- Prizma (untouched): 1. ✅
- Ambiguous: 0.
- Post-delete bucket state: **1 file (Prizma's 0.27 MB), 0 demo files**. ✅

## Out-of-Scope

- Stopping the underlying OCR test pattern that produced these PDFs. The demo tenant is the QA tenant; ongoing OCR test runs may produce more files, which is expected. A separate housekeeping policy (auto-purge of demo PDFs older than N days) could close the loop if needed.
- Other Storage buckets — A4 (failed-sync-files) already done.

## Commit Plan

Single commit (docs only): `chore(storage): clean demo supplier-docs PDFs (A3)`.

---

*End of SPEC.*
