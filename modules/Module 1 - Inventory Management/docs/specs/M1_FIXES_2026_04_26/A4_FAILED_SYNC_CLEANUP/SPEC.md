# SPEC — A4: Cleanup `failed-sync-files` bucket

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T5, Tier 2)
> **Created:** 2026-04-27
> **Severity:** LOW (housekeeping)
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row A4

## Goal

Delete all CSV leftovers from the `failed-sync-files` bucket. These are sync-failure artifacts (one ~0.20 KB CSV per failed sync attempt) accumulated since 2026-03-11. No code change.

## Pre-flight (verified 2026-04-27)

- 189 files (54 KB total) in the bucket.
- All `.csv` with timestamp-pattern names (`YYYYMMDD_HHMMSS_NNNN.csv`).
- Most recent file: 2026-04-26 15:41 — sync failures still happen occasionally; deleting clears the backlog but small re-accumulation is expected.

## Execution

Service-role list + batch-remove via supabase-js, batches of 100.

## Result (2026-04-27)

- Listed: 189 files.
- Deleted: 189 (100/100 + 89/89).
- Failed: 0.
- Post-delete count: **0 files, 0 KB**. ✅

## Out-of-Scope

- Stopping the underlying sync-failure leakage. The watcher / sync service is still producing these files; a follow-up SPEC could investigate root cause and either fix the sync or add an automatic cleanup policy on the bucket.
- Other buckets — A3 (supplier-docs demo cleanup) is the next task, separate SPEC.

## Commit Plan

Single commit (docs only): `chore(storage): clean failed-sync-files bucket (A4)`.

---

*End of SPEC.*
