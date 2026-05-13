# SPEC: M4 updated_at Backfill

**SPEC version:** v1
**Date:** 2026-05-14
**Module:** Module 4 — CRM
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_UPDATED_AT_BACKFILL_BRIEF.md`
**Safety tag:** `pre-m4-updated-at-backfill-2026-05-14`
**Author:** Foreman (opticup-strategic, Full Auto Pipeline)
**Pipeline:** Standard Full Auto, Sonnet model
**Commit budget:** 2–3 (cap 4)

---

## 1. Purpose

Close Audit Rec 8: three CRM tables flagged as missing `updated_at`. Bring all three to the canonical pattern: `updated_at timestamptz NOT NULL DEFAULT now()` + `BEFORE UPDATE` trigger that auto-stamps `updated_at = now()` on every row mutation, using the project-shared trigger function `public.update_updated_at()` (Rule 21 — REUSE, do not duplicate).

## 2. Scope (post-discovery)

Pre-flight introspection on the live DB (`pg_proc`, `pg_trigger`, `information_schema.columns`) revealed that **`crm_automation_rules` is already complete** — column present, trigger `crm_automation_rules_set_updated_at_trg` attached, 0 NULL rows. Adding the column or trigger again would violate Rule 21 and fail at the DDL level. So the actual work reduces to two tables:

| Table | Column present? | Trigger present? | Action |
|---|---|---|---|
| `crm_lead_notes` | ❌ | ❌ | ADD COLUMN + backfill + CREATE TRIGGER |
| `crm_event_attendees` | ❌ | ❌ | ADD COLUMN + backfill + CREATE TRIGGER |
| `crm_automation_rules` | ✅ | ✅ | VERIFY-ONLY (no DDL) |

End-state of the Brief (all 3 tables have updated_at + auto-stamp trigger) is achieved.

### 2.1 Trigger function — reuse the project-shared utility

`public.update_updated_at()` already exists project-wide and is in use on `brands`, `inventory`, `purchase_orders`, `suppliers`, `crm_automation_rules`. Definition:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
```

We do NOT create a new function. Rule 21.

### 2.2 Trigger naming

Follow the recent CRM convention established by `crm_automation_rules_set_updated_at_trg`:
- `crm_lead_notes_set_updated_at_trg`
- `crm_event_attendees_set_updated_at_trg`

## 3. Pre-flight row counts (baseline)

| Table | Demo | Prizma |
|---|---|---|
| `crm_lead_notes` | 67 | 110 |
| `crm_event_attendees` | 47 | 234 |
| `crm_automation_rules` | 23 | 17 |

Post-flight invariant: **all six (table × tenant) counts MUST equal these exactly**. We add a column; we do not add or remove rows. Delta ≠ 0 on any table → STOP per Brief §3.7.

## 4. Destructive Operations

This SPEC performs the following destructive operations. NO others.

1. `ALTER TABLE public.crm_lead_notes ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()` — DDL ADD COLUMN (pre-approved per Brief §3.2).
2. `ALTER TABLE public.crm_event_attendees ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()` — DDL ADD COLUMN (pre-approved per Brief §3.2).
3. `UPDATE public.crm_lead_notes SET updated_at = created_at` — semantic no-op DML backfill of one new column; per-table, no cross-tenant `WHERE` (every row of this table gets the same operation; RLS-bypass executed as DDL migration). Defense-in-depth: Rule 22 not applicable since this is column initialization, not a tenant-scoped business write.
4. `UPDATE public.crm_event_attendees SET updated_at = created_at` — same as #3.
5. `CREATE TRIGGER crm_lead_notes_set_updated_at_trg BEFORE UPDATE ON public.crm_lead_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()` — trigger create (pre-approved per Brief §3.2).
6. `CREATE TRIGGER crm_event_attendees_set_updated_at_trg BEFORE UPDATE ON public.crm_event_attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()` — trigger create (pre-approved per Brief §3.2).

**Explicitly NOT performed (Rule 21):**
- No ADD COLUMN on `crm_automation_rules` (column already present).
- No CREATE TRIGGER on `crm_automation_rules` (trigger already attached).
- No backfill UPDATE on `crm_automation_rules` (column has 0 NULL rows, already stamped via existing DEFAULT + trigger).
- No new trigger function. `public.update_updated_at()` is reused.
- No `DROP`, no `TRUNCATE`, no `DELETE`, no rename, no `git rebase` / `reset --hard` / `push --force`, no merge to main, no `git rm`, no file deletes, no governance-file deletions. NO other DDL.

## 5. Backward compatibility

Adding a `NOT NULL DEFAULT now()` column is a non-breaking change. Postgres backfills the default for existing rows atomically; our explicit `UPDATE … SET updated_at = created_at` then overwrites that default with the more meaningful creation-time value. All existing queries that don't reference `updated_at` continue working unchanged.

## 6. Stop triggers

Per Brief §3.7:

1. **Row count delta ≠ 0** on any of the 6 (table × tenant) buckets after the migration → STOP, write escalation, do not commit.
2. **Trigger doesn't fire** on UPDATE in demo smoke test (i.e. `updated_at` does not advance after an UPDATE) → STOP.
3. **Any unexpected DDL surfaces** in `pg_proc` / `pg_trigger` diff → STOP.

## 7. Smoke (demo tenant only)

For each of the 2 newly-instrumented tables AND for `crm_automation_rules` (regression check that the existing pattern still fires):

1. Insert a test row with the minimum required columns + `tenant_id = demo`.
2. Confirm `updated_at = created_at` at insertion.
3. UPDATE a benign field (e.g., a free-text column). Confirm `updated_at` advances past `created_at`.
4. UPDATE again (separate statement). Confirm `updated_at` advances again.
5. DELETE the test row (or hard delete via service role — these are smoke-only rows).

Test rows tagged with an obviously-fake string so they can be cleaned regardless of trigger result.

## 8. Iron Rule compliance

- **Rule 12 (file size):** SPEC + reports are markdown; not subject. Migration SQL is one cohesive transaction; no source file grows above 350 lines.
- **Rule 15 (RLS):** Tables already have RLS; we add a column, not a new table. No new policy needed. Existing tenant-isolation policies continue to apply.
- **Rule 21 (no orphans/duplicates):** Reuse `public.update_updated_at()`. Skip `crm_automation_rules` (already done). Documented above.
- **Rule 22 (defense-in-depth on writes):** Migration backfill is a DDL-companion DML — not a tenant-scoped business write. Not in scope.
- **Rule 31 (integrity gate):** `npm run verify:integrity` runs before commit.
- **Rule 32 (destructive ops gate):** This §4 declaration satisfies the gate.

## 9. Commits planned

1. `feat(m4,db): add updated_at + auto-stamp trigger to crm_lead_notes and crm_event_attendees` — migration only (no app code changes).
2. `chore(m4,spec): close M4_UPDATED_AT_BACKFILL with EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW` — retro artifacts.

Cap at 4. NO merge to main — Daniel handles PR.

## 10. Rollback

Single tag rollback point: `pre-m4-updated-at-backfill-2026-05-14`. If post-flight reveals any anomaly:

```sql
DROP TRIGGER IF EXISTS crm_lead_notes_set_updated_at_trg ON public.crm_lead_notes;
DROP TRIGGER IF EXISTS crm_event_attendees_set_updated_at_trg ON public.crm_event_attendees;
ALTER TABLE public.crm_lead_notes DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.crm_event_attendees DROP COLUMN IF EXISTS updated_at;
```

Then `git reset --hard pre-m4-updated-at-backfill-2026-05-14` and `git push --force origin develop` — and **only after Daniel's explicit go-ahead**, per CLAUDE.md §9 #7.

---

*End of SPEC.*
