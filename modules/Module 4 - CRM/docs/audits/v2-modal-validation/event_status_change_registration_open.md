# Per-Rule Validation — `event.status_change` (registration_open, MULTI-RULE + CANCEL)

**Rules:** #3 `b53f6ea5-...` (sort=20) "נפתחה הרשמה" + #4 `a06be5d8-...` (sort=25) "הזמנת רשימת המתנה" — both fire on `status_equals: 'registration_open'`.
**Tier:** A | **Status:** ✅ GREEN
**Channels:** SMS+Email (both rules) | **Run ID (dispatch):** `73e2cbec-6328-4640-98d8-7b517b604f43`
**Test method:** Direct `CrmAutomationClient.evaluate('event_status_change', { eventId, newStatus: 'registration_open', event: {...} })` — same code path the operator UI takes via `crm-event-actions.js:217`.

## Setup adjustments

- Temporarily set VALIDATION lead status='waitlist' → makes it a rule-4 recipient.
- Temporarily set P55 (lead `efc0bd54`) status='lead_new' → removes from rule 4 to avoid dispatching to non-Brief-whitelisted email `danylis92@gmail.com`. Restored to status='waitlist' in Phase 4 cleanup.

## Modal interaction

| Check | Observed |
|---|---|
| Modal opens (v2) | ✅ Header says "2 חוקים" (multi-rule combined preview) |
| Rule names | "שינוי סטטוס: נפתחה הרשמה + אירוע פתח להרשמה - הזמנת רשימת המתנה" |
| Channels | SMS + Email |
| Recipient count | 1 (only VALIDATION lead since P55 was temporarily out of waitlist) |
| Multi-rule firing | ✅ Both rule 3 and rule 4 included in preview as `pv.rules.length === 2` |
| Approve dispatch | ✅ |

## Cancel-toast verification (Brief §3.2 — cancel test target #1)

After clicking "אישור ושלח הודעות":

```
🟢 2 הודעות בתור — מסירה תוך ~1 דקות.  [ ביטול שליחה ] [ × ]
```

| Check | Observed |
|---|---|
| Cancel toast appears | ✅ within ~200ms post-dispatch |
| Toast shows correct queued count | ✅ "2 הודעות בתור" |
| Toast has cancel button labeled "ביטול שליחה" | ✅ |
| Click cancel triggers confirm dialog | ✅ (verified by code inspection of `crm-broadcast-cancel.js:101`) |
| cancelByRunId() flips pending rows → cancelled | ✅ Validated separately (see "Synthetic cancel test" below) |
| cancelByRunId() reports already-processed rows | ✅ Returned `{ok:true, cancelled:0, alreadyProcessed:2, total:2}` because cron drained both rows before cancel click (~5s after dispatch, faster than 60s cron) |

### Synthetic cancel test (Brief §3.2: "queue rows flip to status='cancelled'")

Because the dispatch-queue cron drained the actual run within 5–10s, validating the cancel SQL semantics required a synthetic test:

```sql
-- Inserted 4 pending rows for fake run_id 60d566c4-... with scheduled_at = now() + 5min
-- (so dispatch-queue cron won't drain mid-test)
```

```js
await CrmBroadcastCancel.cancelByRunId('60d566c4-7b33-4f76-b8b2-d114057ef743');
// → {ok: true, cancelled: 4, alreadyProcessed: 0, total: 4}
```

DB after cancel:

| field | value |
|---|---|
| status | `cancelled` (all 4 rows) |
| error_message | `operator_cancelled` |
| processed_at | NULL (cron will skip these) |

Verified the dispatch-queue EF selects `status='queued'` only (`supabase/functions/dispatch-queue/index.ts:104`); cancelled rows are skipped on the next tick (no need to wait for an empirical second-tick check — the SQL predicate is unambiguous).

## DB chain (real dispatch — rule 3+4 multi-rule fire)

```sql
SELECT * FROM crm_message_queue WHERE run_id='73e2cbec-...';
```

| field | row 1 | row 2 |
|---|---|---|
| channel | sms | email |
| status | sent | sent |
| processed_at | 03:12:02.426Z | 03:12:02.471Z |
| rule_name (via runs join) | "שינוי סטטוס: נפתחה הרשמה + אירוע פתח להרשמה - הזמנת רשימת המתנה" | (same) |

✅ Both messages delivered through the chain.

## Findings

None blocking. Multi-rule combined preview works correctly. Cancel UI works correctly.

Operational note: the dispatch-queue cron drains faster than a human can practically click cancel for a 1-recipient (or ~2-message) dispatch. For larger broadcasts (60+ messages at 1msg/sec drain rate), the cancel window is wider and partial-delivery semantics will manifest naturally. The cancel SQL is correct in both regimes (verified by synthetic test).
