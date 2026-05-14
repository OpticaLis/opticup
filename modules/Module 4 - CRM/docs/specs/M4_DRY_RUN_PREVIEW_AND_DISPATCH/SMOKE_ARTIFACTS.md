# Smoke Artifacts — M4_DRY_RUN_PREVIEW_AND_DISPATCH

Generated 2026-05-14 (overnight Full Auto Pipeline run, Phase 8).
All smokes on demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
Zero Prizma writes throughout (verified by pre/post counts at SPEC bottom).

---

## Phase 2 smoke — EF `mode='dispatch_preview'`

**Call:**
```
POST /functions/v1/automation-engine
{
  "tenant_id": "8d8cfa7e-...",
  "mode": "dispatch_preview",
  "trigger_type": "event_status_change",
  "trigger_data": {
    "eventId": "4fdd7821-c70c-453e-ba57-76a53bce815b",
    "newStatus": "registration_open"
  }
}
```

**Response:**
- `fired: 2` — 2 rules matched (`שינוי סטטוס: נפתחה הרשמה` + `אירוע פתח להרשמה - הזמנת רשימת המתנה`).
- `queued: 0`, `skipped: 0` — no side effects.
- `run_id: afb79da2-971c-4559-9e88-832bd48be3d7` — audit row only.
- `channels: ["sms", "email"]`.
- `recipients_by_lead`: 1 entry — P55 Daniel Secondary (phone `+972503348349`, email `danylis92@gmail.com`).
  - `message_body_sms` populated with Hebrew final body (name substituted, event date `20.05.2026`, time `09:00:00`).
  - `message_body_email` populated with full HTML source (subject placeholder, body with name interpolated).
  - `last_message_sent_at` / `last_template_slug`: per-recipient history populated where present.
  - `prior_active_attendee_count`, `attended_event_count`, `created_at`: populated for chip filters.

**DB chain (queue + log unchanged; runs +1):**

| Tenant | Table | Pre-smoke | Post-smoke | Delta |
|---|---|---|---|---|
| demo | crm_message_queue | 10 | 10 | 0 ✅ |
| demo | crm_message_log | 349 | 349 | 0 ✅ |
| demo | crm_automation_runs | 92 | 93 | +1 (audit) |
| prizma | crm_message_queue | 3463 | 3463 | 0 ✅ |
| prizma | crm_message_log | 4713 | 4713 | 0 ✅ |
| prizma | crm_automation_runs | 146 | 146 | 0 ✅ |

✅ Phase 2 acceptance criterion met.

---

## Phase 4 smoke — `exclude_lead_ids`

**Call:**
```
POST /functions/v1/automation-engine
{
  "tenant_id": "8d8cfa7e-...",
  "mode": "dispatch",
  "trigger_type": "event_status_change",
  "trigger_data": { "eventId": "4fdd7821-...", "newStatus": "registration_open" },
  "exclude_lead_ids": ["efc0bd54-c6ed-4430-9552-018935a7ebbc"],
  "dispatch_messages": true
}
```

**Response:** `fired: 2, queued: 0` — P55 was the only recipient; excluding them produced 0 queue rows.

**DB chain:**
- `crm_message_queue` (demo): 10 → 10 (no rows inserted because the only recipient was excluded).
- `crm_message_log`: unchanged (excluded leads don't reach send-message).

✅ Phase 4 acceptance criterion met — operator deselection successfully short-circuits the dispatch.

---

## Phase 5 smoke — `recipient_subset`

**Call:**
```
POST /functions/v1/automation-engine
{
  "tenant_id": "8d8cfa7e-...",
  "mode": "dispatch",
  "trigger_type": "event_status_change",
  "trigger_data": { "eventId": "4fdd7821-...", "newStatus": "registration_open" },
  "recipient_subset": ["efc0bd54-c6ed-4430-9552-018935a7ebbc"],
  "dispatch_messages": true
}
```

**Response:** `fired: 2, queued: 2, run_id: 3cab9091-ff88-4c85-9502-dd1a738716d8`.

**Insert chain:** 2 rows added to `crm_message_queue` under `run_id=3cab9091-...` (1 SMS + 1 email for P55).

✅ Phase 5 acceptance criterion met — `recipient_subset` correctly narrows the resolved recipient set.

---

## Phase 6 smoke — cancel-by-run_id

**SQL (mirror of `CrmBroadcastCancel.cancelByRunId`):**
```sql
UPDATE crm_message_queue
SET status='cancelled', error_message='operator_cancelled'
WHERE tenant_id='8d8cfa7e-...'::uuid
  AND run_id='3cab9091-ff88-4c85-9502-dd1a738716d8'::uuid
  AND processed_at IS NULL
RETURNING id, lead_id, channel, status, error_message;
```

**Result:** 2 rows updated. Both rows now `status='cancelled', error_message='operator_cancelled'`.

Cancellation beat the pg_cron drain (cron interval 60s; cancel issued ~5s after dispatch). `crm_message_log` count delta = 0 — no actual SMS or email left the system. Demo recipient P55 received nothing.

✅ Phase 6 acceptance criterion met — UPDATE-WHERE-processed_at-IS-NULL semantics work as designed.

---

## Final state — end of Phase 8

| Tenant | Table | Phase-0 baseline | Post-Phase-8 | Delta |
|---|---|---|---|---|
| demo | crm_message_queue | 10 | 12 | +2 (both cancelled — Smoke A's rows, status='cancelled') |
| demo | crm_message_queue.status='cancelled' | 0 | 2 | +2 ✅ |
| demo | crm_message_log | 349 | 349 | 0 ✅ |
| demo | crm_automation_runs | 92 | 95 | +3 (audit rows for: Phase 2 preview + Smoke A + Smoke B) |
| prizma | crm_message_queue | 3463 | 3463 | 0 ✅ |
| prizma | crm_message_log | 4713 | 4713 | 0 ✅ |
| prizma | crm_automation_runs | 146 | 146 | 0 ✅ |

✅ Zero Prizma writes throughout — Brief §4.3 + SPEC G5 satisfied.

---

## Browser UI smoke — deferred to Daniel's morning review

Per Brief §6, each phase ideally captures: (1) DOM snapshot via Chrome MCP, (2) DB chain, (3) recipient inbox, (4) cancellation chain.

This Phase 8 smoke covered (2) and (4) end-to-end via the EF surface — the contracts that the modal calls. (3) is not exercised because Smoke A's queue rows were cancelled before the cron drain (by design — proves the cancel path).

(1) — the actual modal-in-Chrome flow — is **deferred to Daniel's morning hands-on review**. Pipeline cannot fully verify modal interactivity (search field focus retention across rerenders, expand-on-click animation smoothness, chip-filter additive composition) without UI smoke. The DOM is rendered server-authoritatively from EF JSON we've verified, so the risk is bounded to client-side rendering bugs.

Recommended Daniel-side morning smoke (~5 minutes):
1. Open http://localhost:3000/crm.html, go to Events tab.
2. Flip an event to `registration_open` (e.g., the event `4fdd7821-c70c-453e-ba57-76a53bce815b`).
3. Confirm modal opens with "🔄 מחשב נמענים..." → resolves to recipient list.
4. Try search, chips, expand-on-click body preview, checkbox uncheck.
5. Click "📤 שלח טסט ל-3 הראשונים" (will be disabled if <3 recipients; demo currently has 1 — so this smoke is informational only).
6. Click "אישור ושלח הודעות" — verify the cancel toast appears post-dispatch.
7. Click "ביטול שליחה" — verify the queue rows flip to `status='cancelled'` (visible by querying `crm_message_queue` immediately after).
8. Reopen modal for the same rule — verify previous selection state restored from sessionStorage.

Pipeline's go/no-go verdict: GREEN on EF + DB + cancel chains; AMBER on UI surface pending Daniel's hands-on. Recommendation: GREEN to merge to main contingent on the ~5-minute hands-on smoke above.

---

## Master safety tag

`pre-dry-run-preview-2026-05-14` at commit `6e64118`. Rollback procedure documented in `SPEC.md §9`.

Commits made by this run on develop:
- `ad3d0e6` — Phase 2 EF mode='dispatch_preview' (preview.ts + consumer.ts + index.ts + engine.ts + SPEC.md)
- `50fe633` — Phase 3 modal scaffolding (v2 + client routing)
- `3800078` — Phase 4 search + body preview + checkboxes
- `d9d9ee8` — Phase 5 test-send to first 3
- `9abcf5c` — Phase 6 queue-side cancellation helper
- `e4e1330` — Phase 7 QoL — chip filters + history line + sessionStorage + incremental count

Total: 6 commits on develop, zero on main.
