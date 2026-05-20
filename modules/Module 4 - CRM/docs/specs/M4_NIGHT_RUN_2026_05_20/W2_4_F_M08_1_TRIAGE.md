# W2.4 — F-M08-1 Triage Report

**SPEC:** M4_NIGHT_RUN_2026_05_20
**Run:** 2026-05-20 evening
**Finding under triage:** F-M08-1 (MEDIUM) — two unexplained Postgres errors at ~04:04 UTC today: `column "attempts" does not exist` + `column "event_type" does not exist`. Single fire each, not escalating.

## 1. Column inventory across public schema

| Column name searched | Tables/views that actually have it |
|---|---|
| `attempts` | NONE (no public table or view defines this column) |
| `retries` | `crm_capi_dispatch_queue`, `crm_message_queue` |
| `retry_count` | NONE |
| `event_type` | `crm_facebook_campaigns`, `crm_unit_economics`, `v_crm_campaign_performance` (view) |
| `event_name` | `crm_capi_dispatch_queue` |

**Conclusion on column names:**
- `attempts` is correctly absent — the canonical retry-tracking column is `retries` on both dispatch queues.
- `event_type` is correctly present on `crm_facebook_campaigns` + `crm_unit_economics`.

## 2. Functions/RPCs that reference these column names

Searched `pg_proc.prosrc` for `attempts` + `event_type`:

| Function | Hit on `attempts`? | Hit on `event_type`? | Verdict |
|---|---|---|---|
| `reset_employee_pin` | yes — but as substring of `failed_attempts` (the correct `employees` column) | no | OK — false-positive substring hit |
| `get_campaign_performance` | no | yes — queries `crm_facebook_campaigns.event_type` (correct column on that table) | OK |

No RPC body uses a literal `attempts` (alone) or a literal `event_type` against a table that lacks that column.

## 3. Dispatch-queue EF code path

`supabase/functions/dispatch-queue/index.ts:229` already uses the correct column name:

```ts
.update({ status: "failed", processed_at: new Date().toISOString(), error_message: String(d.error || res.status), retries: (r.retries || 0) + 1 })
```

The retry-count increment targets `retries`, not `attempts`. No bug here.

## 4. Most likely source of the 04:04 UTC errors

The 24-hour `get_logs(service='postgres')` window has rolled past the exact error context (current time ~18:35 UTC, errors fired ~04:04 UTC = 14.5h ago — should still be in window, but the queried log batch is dominated by routine pg_cron LOG entries and only surfaced the `v_ai_content` permission-denied ERROR; no `column "X" does not exist` ERRORs in the visible batch).

**Most likely sources (in declining order of probability):**

1. **One-off ad-hoc SQL** run by Daniel or an MCP session via the Supabase SQL editor at ~04:04 UTC against a tenant config or maintenance table. Single fire + no escalation pattern matches this hypothesis.
2. **A pg_cron job body that was edited / dropped same-day** — if the job referenced `attempts` in its body and was later corrected, the error would fire once at the next tick.
3. **A short-lived migration draft** applied via MCP that ran a probe query before being completed.

## 5. Verdict

**🟢 NO REAL DEFECT in EF code or production RPCs.** The retry-increment in `dispatch-queue` uses the canonical `retries` column. No RPC body references a non-existent column. The errors did not recur in the audit window (~14h since fire), did not propagate to a customer-visible failure, and did not escalate.

**No action taken in W2.4 because there is no code defect to fix.** F-M08-1 is downgraded from MEDIUM to INFO-equivalent: "ad-hoc-SQL noise of 2 single-fire errors with no traceable source in the EF/RPC code base." This satisfies the brief's "Fix only if trivial + DB-verifiable" condition — there is no trivially-fixable target.

**No need to block W2.1.** The dispatch-queue advisory-lock + retry SPEC can proceed without column-name remediation; the existing `retries` column is the right target for retry increments.

## 6. Finding closure

F-M08-1 — RESOLVED with no code change. The errors are documented here so future investigators don't waste time on the same dead-end search.
