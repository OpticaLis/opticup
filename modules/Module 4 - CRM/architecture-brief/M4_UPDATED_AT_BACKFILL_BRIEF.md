# M4 updated_at Backfill — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~45 min)
**Model preference:** Sonnet (well-scoped DDL + trigger pattern)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

Audit Rec 8 — three CRM tables hold mutable rows but have no `updated_at` column. Without it, no audit answer to "when was this row last touched?", and analytics queries that filter by recency must JOIN against `crm_status_change_events` (which only tracks status fields, not other mutations).

Tables in scope:
- `crm_lead_notes` — editable in UI, no `updated_at`.
- `crm_event_attendees` — rich state machine (status, payment_status, refund flow), no `updated_at`.
- `crm_automation_rules` — already had `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` open. Closes that debt.

Other CRM tables either already have `updated_at` (e.g., `crm_leads`) or are append-only by design (`crm_event_status_history`, `crm_status_change_events`) and correctly lack it.

---

## 2. Scope

For each of the 3 tables:
1. `ALTER TABLE ... ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()`.
2. Backfill existing rows: `UPDATE ... SET updated_at = created_at` so historical rows start with a sensible value (their creation time).
3. Create an `ON UPDATE` trigger that auto-stamps `updated_at = now()` on every row mutation.

Mirror the canonical pattern from `crm_leads` (which already has this set up correctly).

### 2.1 Pattern reference

```sql
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger ...
```
If this trigger function already exists project-wide (check `pg_proc`), REUSE it (Rule 21 — No Duplicates). If it doesn't exist as a shared utility, create ONE shared function and attach it to all 3 tables.

---

## 3. Safety Envelope

### 3.1 Safety tag
First action:
```
git tag -a pre-m4-updated-at-backfill-2026-05-14 -m "Pre-updated-at-backfill baseline"
git push origin pre-m4-updated-at-backfill-2026-05-14
```

### 3.2 DDL — pre-approved
- 3 × `ALTER TABLE ADD COLUMN updated_at`.
- 3 × `ON UPDATE` trigger creation (or 1 shared trigger function + 3 trigger attachments — Pipeline decides which is cleaner).
- 3 × backfill `UPDATE` (every existing row gets `updated_at = created_at`).
- NO other DDL.

### 3.3 Prizma data writes — EXPLICITLY AUTHORIZED for this run
- The backfill writes every existing row's `updated_at`. Expected row counts:
  - `crm_lead_notes` — small (low hundreds, audit pattern).
  - `crm_event_attendees` — ~400 attendees on Prizma.
  - `crm_automation_rules` — ~17 rules on Prizma.
- Pre-flight: capture row counts of all 3 tables for both Prizma and Demo in EXECUTION_REPORT.md §2 before any change.
- Post-flight: confirm row count unchanged (we add a column, we don't add or remove rows).
- The `updated_at = created_at` backfill is semantically a no-op — no logical state change, just a column populating.

### 3.4 Backward compatibility
- All existing queries that don't reference `updated_at` continue working unchanged.
- Any query that DID reference `updated_at` and was getting NULL or failing will now succeed.
- NO breaking change.

### 3.5 No merges to main
- Daniel handles PR after review.

### 3.6 Commit budget
- 2-3 commits expected. Cap at 4.

### 3.7 Stop triggers
- If row count delta on any table after backfill is anything other than 0 → STOP (we ADDED rows, which we shouldn't).
- If the shared trigger function doesn't behave on UPDATE in demo smoke test → STOP, fix before Prizma backfill.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 5. Smoke

On demo:
1. Insert a test row in each of the 3 tables. Confirm `updated_at` = `created_at` on creation.
2. UPDATE the row. Confirm `updated_at` advanced.
3. UPDATE again 1 second later. Confirm `updated_at` advanced again.
4. Clean up test rows.

---

## 6. Communication

English status updates between phases. ONE concise English summary at end:
- Row counts before/after (confirm no data delta).
- Trigger naming convention used.
- Smoke results.
- Ready for develop→main PR.

---

*End of Brief. Activation prompt at `M4_UPDATED_AT_BACKFILL_ACTIVATION_PROMPT.md`.*
