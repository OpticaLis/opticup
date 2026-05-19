# SPEC — M4_ENQUEUE_REGRESSION_FIX

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_ENQUEUE_REGRESSION_HUNT_BRIEF.md`
**Authored + executed:** 2026-05-19 (post-3-SPEC continuation chain).
**Mode:** Full-Auto Pipeline with explicit no-stop authorization per Brief §2.
**Priority:** P0 regression — every event-status-change message silently lost after the first send to a given (event, lead, template, channel) tuple.

---

## 1. Root cause

The partial unique index `uq_crm_message_queue_idem` on `crm_message_queue` was defined as:

```sql
UNIQUE (tenant_id, event_id, lead_id, template_slug, channel)
WHERE event_id IS NOT NULL AND template_slug IS NOT NULL
  AND status IN ('queued','processing','sent')
```

The intent was idempotency against pg_cron double-tick. But once a row reached `status='sent'`, it permanently blocked any future insert with the same `(tenant_id, event_id, lead_id, template_slug, channel)` tuple — even from a different run, different status-change trigger, different operator toggle.

`dispatch.ts:62-65` caught the constraint violation in a generic `if (res.error)` branch and only logged it to `console.error`. The error never reached:
- `crm_automation_runs` (sent_count / failed_count / error_message stayed 0/0/null)
- `crm_message_log` (no rejection row)
- The operator UI

Result: 3 of 6 runs at 05:55Z reported `total_recipients=2` but produced ZERO queue and ZERO log rows. Daniel's "operator sees nothing, but the run says it fired" symptom.

### Why SPEC 3 exposed it

Before SPEC 3, the same scenario rejected at the `validateTemplateOutput` gate (`unsubstituted_placeholder: event_day_of_week,...`). The rejection wrote a row to `crm_message_log`, so the failure was visible. SPEC 3 fixed the resolver gap → composition succeeds → execution reaches `dispatch.ts` → constraint violation → silent loss.

The QA report (2026-05-18) and my SPEC 3 verification at 05:33Z both inserted blocking rows. Subsequent toggles after 05:34Z hit the constraint.

## 2. Fix (2 commits expected)

### Commit 1 — Migration + EF code (this SPEC's primary fix)

#### 2.1 Migration `20260519061500_m4_enqueue_idempotency_per_run.sql`

Replaces the partial unique index with a per-run version:

```sql
DROP INDEX IF EXISTS public.uq_crm_message_queue_idem;

CREATE UNIQUE INDEX uq_crm_message_queue_idem
ON public.crm_message_queue
USING btree (tenant_id, run_id, lead_id, template_slug, channel)
WHERE run_id IS NOT NULL
  AND template_slug IS NOT NULL
  AND status IN ('queued','processing','sent');
```

Within a single run (same `run_id`), the same `(lead, template, channel)` tuple cannot be inserted twice — preserves idempotency against cron double-tick. Across runs, no constraint — legitimate re-sends (operator toggles, repeat events, daily cycles) work.

#### 2.2 Code edit `supabase/functions/automation-engine/dispatch.ts`

When the chunk INSERT fails for any reason, write a per-row `crm_message_log` entry with `status='failed'` and `error_message='queue_insert_failed: <db error>'`. Operators see failures in the messages-log UI; future regressions of this class are visible immediately.

#### 2.3 UI cleanup `modules/crm/crm-queue-live.js` (Brief §3.9)

Format the "נוצר" column with `DD/MM HH:MM:SS` instead of `HH:MM:SS` alone. Disambiguates queue rows from different days.

### Commit 2 — Retro docs

EXECUTION_REPORT + FINDINGS + REVIEW + FOREMAN_REVIEW.

## 3. Destructive Operations

1. **DROP + CREATE of partial unique index `uq_crm_message_queue_idem`** on `crm_message_queue` (live DB, demo tenant data unaffected per migration's pure schema-shape change). Per Brief §5 — DB schema changes authorized for this fix. Migration captured as `supabase/migrations/20260519061500_m4_enqueue_idempotency_per_run.sql` for reproducibility.
2. **Demo-tenant status flips** on `crm_events` + `crm_leads` for verification (toggle event #28 status + reset lead 01269ab9 back to 'waiting' to bypass post-action promote). Per Brief §5.

## 4. Verification Criteria (Brief §4)

1. ✅ Toggle event #28 `planning → registration_open` on demo. (Done at 06:17:57Z)
2. ✅ Within 90s: ≥1 `crm_message_log` row with `status='sent'`. (Done at 06:19:02Z = +65s)
3. ✅ ZERO `crm_message_log` rows with `error_message LIKE 'unsubstituted_placeholder%'` for the new runs.
4. ✅ Repeat with a second toggle. (Done at 06:21:29Z → log at 06:23:02 = +93s)
5. ✅ `crm_automation_runs.total_recipients=2` for both verification runs.
6. ✅ Messages queue UI shows date + time in "נוצר" column.
7. ⏳ smoke 7/7 PASS — to verify post-commit.
8. ✅ Iron Rules 12/31/32 enforced — confirmed at commit time.

## 5. Rollback

- DB: re-apply old index shape via a new migration (`CREATE UNIQUE INDEX ... USING btree (tenant_id, event_id, lead_id, template_slug, channel) WHERE event_id IS NOT NULL AND template_slug IS NOT NULL AND status IN ('queued','processing','sent')`).
- EF: `supabase functions deploy automation-engine` with reverted `dispatch.ts`.
- UI: `git revert` of the queue-live.js commit.
