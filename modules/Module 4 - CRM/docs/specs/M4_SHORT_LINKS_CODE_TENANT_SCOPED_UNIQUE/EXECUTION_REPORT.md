# EXECUTION_REPORT — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

> **Date:** 2026-05-21 — Sprint 3 Item 6 of 6.
> **Status:** 🟡 **AUTHORED ONLY — EXECUTION DEFERRED.**

## Summary
Authored the migration to convert `short_links_code_unique` from a global UNIQUE constraint to a tenant-scoped `UNIQUE (tenant_id, code)`. Did NOT apply — the mandatory cross-tenant collision pre-check requires DB access, which was repeatedly returning timeout errors during this Sprint. Per IR32 + Daniel's explicit "if any exist, surface them and STOP" instruction, applying a destructive constraint change without the pre-check is forbidden.

## What was done
| Step | Result |
|---|---|
| Pipeline lock | claimed |
| Migration drafted | 1 file at `supabase/migrations/20260521213000_m4_short_links_code_tenant_scoped_unique.sql` with inline pre-check + apply + post-check |
| Pre-check attempt | `SELECT code, count(DISTINCT tenant_id) FROM short_links GROUP BY code HAVING count > 1` returned `Connection terminated due to connection timeout` |
| Migration NOT applied | per IR32 + Daniel's instruction |
| Iron Rule 31 gate | exit 0 (no DDL run; only file authored) |

## When to resume
1. Confirm Supabase responsive (`SELECT 1` returns 1).
2. Run the pre-check query (see migration file header).
3. **If 0 rows returned:** proceed with `apply_migration` of this file. Confirm via post-check.
4. **If any rows returned:** STOP. Surface the collisions to Daniel. Plan per-collision resolution (likely rename one side's code via the Sprint-3-Item-5 edit RPC). Re-run pre-check until 0.

## Iron Rule audit
- R7/R12/R14/R15/R22 — N/A (no JS / no RPC body / no runtime change).
- R18 — UNRESOLVED at this Sprint. The migration that resolves it is authored but unapplied.
- R31 — exit 0 (no destructive ops executed).
- R32 — explicitly honored: destructive op declared, pre-check required, execution gated.
- R33 — demo + Prizma both untouched at this Sprint.
- R34 — N/A.

## Self-assessment 6/10/10/10
6 on speed: scope couldn't be completed due to external blocker. Honest deferral is the right call.

## Skill improvement proposals
- **P-EXEC-1:** for constraint-shape SPECs that need a destructive ALTER, ALWAYS require a non-zero-rows pre-check that, if it returns any rows, blocks apply. Document this as a category-wide pattern (similar to "destructive ops require declared section").
- **P-EXEC-2:** when Supabase has a multi-step outage that blocks several SPECs, authored-but-not-applied is a valid final state. Document the resume path in EXECUTION_REPORT so the next session can pick up cleanly.

---
*End of report.*
