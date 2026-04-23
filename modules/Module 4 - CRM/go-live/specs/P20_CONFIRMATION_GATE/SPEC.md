# SPEC — P20_CONFIRMATION_GATE

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P20_CONFIRMATION_GATE/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — prevents accidental mass-sends during Prizma cutover
> **Origin:** Daniel's request: "לא לשלוח הודעות אוטומטית ישר בהחלפת סטטוס,
>   אלא לשים חלון עם PREVIEW של ההודעה והאנשים שהיא תישלח אליהם שצריך לאשר או לבטל"

---

## 1. Goal

Add a Confirmation Gate to ALL automated message dispatches. When an
automation rule fires (event status change, registration, etc.), instead
of sending immediately, show a preview modal with:

- The full message text (after variable substitution)
- The list of recipients (name + phone/email)
- The channel (SMS / Email)
- "אשר ושלח" (approve) and "בטל" (cancel) buttons

**If approved** → send as before.
**If cancelled** → write a `crm_message_log` row with `status='pending_review'`
so the message is preserved. The user can later find it in the message log,
edit if needed, and resend manually.

This applies to ALL automated dispatches — event status changes, registration
confirmations, and any future automation rules. It does NOT apply to:
- Manual sends from the send dialog (already user-initiated)
- Broadcast wizard (already has a step-by-step flow with preview)

---

## 2. Tracks

### Track A — Confirmation Modal UI

File: NEW `modules/crm/crm-confirm-send.js` (estimated ~200 lines)

**A1. Create `CrmConfirmSend.show(sendPlan)` function**

`sendPlan` is an array of objects prepared by the automation engine:
```javascript
[{
  rule_name: 'הרשמה: אישור הרשמה',
  template_slug: 'event_registration_confirmation',
  channel: 'sms',
  recipient: { name: 'דנה כהן', phone: '+972537889878', email: 'dana@test.com' },
  variables: { name: 'דנה כהן', event_name: 'SuperSale 25', ... },
  composedBody: 'היי דנה כהן, ההרשמה לאירוע SuperSale 25 אושרה...',
  lead_id: 'uuid',
  event_id: 'uuid'
}]
```

**A2. Modal layout**

```
┌──────────────────────────────────────────────┐
│  📩 אישור שליחת הודעות (X הודעות)            │
│──────────────────────────────────────────────│
│                                              │
│  חוק: "הרשמה: אישור הרשמה"                  │
│                                              │
│  ┌────────────────────────────────────────┐   │
│  │ SMS → דנה כהן (053-788-9878)          │   │
│  │ ─────────────────────────────────────  │   │
│  │ היי דנה כהן, ההרשמה לאירוע SuperSale  │   │
│  │ 25 אושרה. נתראה ב-15/05/2026!        │   │
│  └────────────────────────────────────────┘   │
│                                              │
│  ┌────────────────────────────────────────┐   │
│  │ Email → דנה כהן (dana@test.com)       │   │
│  │ ─────────────────────────────────────  │   │
│  │ [HTML preview truncated to 3 lines]   │   │
│  └────────────────────────────────────────┘   │
│                                              │
│         ┌──────────┐  ┌────────┐             │
│         │ אשר ושלח │  │  בטל   │             │
│         └──────────┘  └────────┘             │
└──────────────────────────────────────────────┘
```

- Group by rule name
- Each message in a card with channel icon, recipient, and body preview
- SMS body shown in full; Email body shown first 3 lines + "..." truncation
- RTL layout
- Tailwind classes matching CRM style (indigo/slate palette)
- Modal uses the existing `Modal.show` pattern or a custom overlay

**A3. Approve flow**

When "אשר ושלח" is clicked:
```javascript
for each item in sendPlan:
  CrmMessaging.sendMessage({ ...item })
```
Then show Toast "נשלחו X הודעות" (existing pattern).

**A4. Cancel flow**

When "בטל" is clicked:
- Write a `crm_message_log` row for each planned message with:
  - `status = 'pending_review'`
  - `channel`, `template_slug`, `lead_id`, `event_id` — all preserved
  - `content = composedBody`
  - `metadata = { rule_name, cancelled_by: 'user', cancelled_at: ISO }`
- Show Toast "ההודעות בוטלו ונשמרו בלוג — ניתן לערוך ולשלוח מחדש"
- Close modal

### Track B — Wire Automation Engine to Confirmation Gate

File: `modules/crm/crm-automation-engine.js` (228L)

**B1. Change `fireRule` to prepare a send plan instead of dispatching**

Current flow:
```
evaluate() → fireRule() → CrmMessaging.sendMessage() immediately
```

New flow:
```
evaluate() → fireRule() → returns sendPlan[] (no send)
              ↓
CrmConfirmSend.show(allPlans) → user approves → CrmMessaging.sendMessage()
                               → user cancels → log as pending_review
```

**B2. Modify `evaluate()` return**

Currently returns `{ fired, sent, failed, skipped }`.
Change to:
- If `CrmConfirmSend` is available (modal loaded):
  collect all send plans across all matching rules, then call
  `CrmConfirmSend.show(combinedPlan)`. Return `{ fired, pending_confirm: true }`.
- If `CrmConfirmSend` is NOT available (e.g., Edge Function context):
  fall through to the existing immediate-dispatch behavior. This ensures
  server-side dispatch (lead-intake EF) is unaffected.

**B3. Preserve existing callers**

Callers (`crm-event-actions.js`, `crm-event-register.js`) currently do:
```javascript
CrmAutomation.evaluate('event_status_change', { ... });
```
These callers fire-and-forget — they don't use the return value. The modal
will appear as a side effect of `evaluate()`. No caller changes needed.

### Track C — Resend from Message Log

File: `modules/crm/crm-messaging-log.js` (151L)

**C1. Show "pending_review" rows with a yellow badge**

In the log table, `status='pending_review'` should render with a yellow/amber
badge (like the existing status chips) labeled "ממתין לאישור".

**C2. Add "שלח מחדש" button on pending_review rows**

When the user clicks expand on a `pending_review` row, show a "שלח מחדש"
button. Clicking it:
1. Opens the send dialog (`CrmSendDialog`) pre-filled with:
   - The saved `content` from the log row
   - The `channel` from the log row
   - The `lead_id` from the log row
2. User can edit the message if needed, then send
3. On successful send, update the old log row to `status='superseded'`

### Track D — Add `<script>` tag

File: `crm.html`

Add `<script src="modules/crm/crm-confirm-send.js"></script>` after
`crm-automation-engine.js` in the script loading order.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | Event status change opens confirmation modal | Visual: modal appears with message preview |
| 2 | Registration confirmation opens modal | Visual: modal appears |
| 3 | Approve sends messages | `crm_message_log` rows with `status='sent'` |
| 4 | Cancel writes pending_review rows | `crm_message_log` rows with `status='pending_review'` |
| 5 | Pending_review rows visible in log with amber badge | Visual check |
| 6 | Resend button on pending_review rows | Visual + functional test |
| 7 | Broadcast wizard NOT affected | Still sends directly (no modal) |
| 8 | Manual send dialog NOT affected | Still sends directly |
| 9 | `wc -l` all modified/new files | ≤ 350 each |
| 10 | Zero new console errors | On demo tenant |

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** with one checkpoint:

- **Checkpoint 1 (after Track A+B):** Report: "Modal wired. Event status
  change shows preview. Approve/cancel work."
- Then continue Tracks C–D without stopping.

---

## 5. Stop-on-Deviation Triggers

1. Any CRM file would exceed 350 lines after edits
2. The automation engine's existing callers break (fire-and-forget pattern
   must be preserved)
3. The modal blocks the UI thread and prevents status changes from completing
4. Server-side dispatch (lead-intake EF) behavior changes

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| NEW `modules/crm/crm-confirm-send.js` | A | ~200L, confirmation modal |
| `modules/crm/crm-automation-engine.js` (228L) | B | Change fireRule to prepare plan, show modal |
| `modules/crm/crm-messaging-log.js` (151L) | C | Yellow badge + resend button for pending_review |
| `crm.html` | D | +1 script tag |

---

## 7. Out of Scope

- Editing message text in the confirmation modal itself (edit happens via
  resend from the log — simpler UX, less modal complexity)
- Batch approve/reject for multiple rules (all-or-nothing for now)
- Confirmation gate for server-side dispatches (lead-intake EF — runs
  without UI, cannot show a modal)
- Confirmation gate for broadcast wizard (already has its own multi-step
  preview flow)
- Database schema changes (uses existing `crm_message_log` table)
- New status values need to be compatible with existing log queries

---

## 8. Expected Final State

```
crm-confirm-send.js     — ~200L (new)
crm-automation-engine.js — ~250L (+22 for plan collection + modal call)
crm-messaging-log.js     — ~170L (+19 for pending_review badge + resend)
crm.html                 — +1 script tag
```

2 commits:
1. `feat(crm): add confirmation gate — preview modal before automated sends`
2. `feat(crm): pending_review resend from message log`

---

## 9. Rollback Plan

1. Revert commits.
2. Automation engine reverts to immediate-dispatch behavior.
3. Any `pending_review` rows in the log become orphaned but harmless
   (they can be manually deleted or left as historical).

---

## 10. Commit Plan

See §8. Two commits: modal + engine wiring → log resend.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Automation engine dispatches immediately today | **VERIFIED** — `crm-automation-engine.js:179`: `calls.push(CrmMessaging.sendMessage({...}))` directly in `fireRule` |
| `crm_message_log` has a `status` column | **VERIFIED** — used by send-message EF (`status='pending'` → `status='sent'`/`status='failed'`) |
| `crm_message_log` has `content`, `channel`, `lead_id`, `event_id` columns | **VERIFIED** — send-message EF inserts all of these |
| Broadcast wizard does NOT use `CrmAutomation.evaluate` | **VERIFIED** — `crm-messaging-broadcast.js` calls `CrmMessaging.sendMessage` directly in `doWizardSend` |
| Send dialog does NOT use `CrmAutomation.evaluate` | **VERIFIED** — `crm-send-dialog.js` calls `CrmMessaging.sendMessage` directly |
| `CrmConfirmSend` name unused in repo | **VERIFIED** — grep = 0 hits |
| `pending_review` status unused in repo | **VERIFIED** — grep = 0 hits |
| Cross-Reference: no `crm-confirm-send.js` exists | **VERIFIED** — 0 hits in FILE_STRUCTURE.md and filesystem |

---

## 12. Lessons Already Incorporated

- **From P18 FOREMAN_REVIEW proposal 2:** Function name verification — all
  function names in this SPEC were grepped against the actual codebase.
- **From P17 FOREMAN_REVIEW proposal 1:** Copy sanity check — all Hebrew
  copy in this SPEC has been proofread for matching parentheses and quotes.
- **From P15 FOREMAN_REVIEW:** Line-budget preflight — target files have
  sufficient headroom (engine 228L + ~22 = ~250, log 151L + ~19 = ~170).

---

*End of SPEC — P20_CONFIRMATION_GATE*
