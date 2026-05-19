# REVIEW — M4_ENQUEUE_REGRESSION_FIX

**Reviewed commit:** `1909450`.
**Verdict:** 🟢 APPROVED.

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 12 (file size) | ✅ | dispatch.ts grew from 78 → 110 lines (well under 300 soft target). crm-queue-live.js unchanged effective LOC. |
| 21 (no orphans, no duplicates) | ✅ | No new duplicates. The log-row insert pattern mirrors queue-send.ts and prepare-plan.ts's existing rejection-log pattern — consistent code style across all 3 enqueue paths. |
| 22 (defense-in-depth on writes) | ✅ | Every new DB insert in dispatch.ts explicitly sends `tenant_id` on the log rows. Migration's partial index includes `tenant_id` as the first key column — tenant isolation preserved. |
| 23 (no secrets) | ✅ | No secrets in the migration or EF code. |
| 31 (integrity gate) | ✅ | Pre-commit ran clean (8 files scanned, 0 violations). |
| 32 (destructive ops) | ✅ | SPEC §3 declares the DROP+CREATE INDEX as authorized destructive op per Brief §5. The destructive_ops_declared.mjs hook reads the SPEC's §"Destructive Operations" section — verified by pre-commit. |

## Code review observations

### O-1 — Per-row failure logging is the right granularity
Each item in the chunk gets its own `crm_message_log` row on failure. This matches what the prepare-plan rejection path does (per-row log entry) and means operators don't need to mentally aggregate per-chunk errors. Clean.

### O-2 — Migration design preserves intent
The new partial index keeps `tenant_id` first (RLS-friendly indexing) and adds `run_id` second. The intent of "prevent cron double-tick from double-inserting" is preserved at the right level. Cross-run re-sends are explicitly allowed — which matches the operator's natural workflow.

### O-3 — Defense-in-depth pattern
queue-send.ts's application-level idempotency check still works against the new constraint shape because it checks for existing rows in active statuses with the broader (event, lead, template, channel) filter — which IS still a uniqueness intent at the application level. The DB constraint is now narrower (per-run) but the application is wider (per-event). Both layers protect against different failure modes.

### Nitpick (N-1) — Migration filename includes date+time
`20260519061500_m4_enqueue_idempotency_per_run.sql` — date prefix follows the existing supabase/migrations convention. Good.

### Nitpick (N-2) — UI fmt() unchanged caller surface
`fmt()` returns a string. Callers like `'<td>' + fmt(...)` work unchanged. New format `DD/MM HH:MM:SS` is wider — may cause column wrap on narrow screens. Acceptable.

## Live verification reviewed

Reviewer confirms 2 toggles 65s and 93s after status update produced `crm_message_log status='sent'` rows. The run row's `total_recipients=2` matches the actual lead resolution. No `unsubstituted_placeholder` rejections.

## Permission to close

✅ APPROVED. Continuation chain + regression hunt all 🟢.
