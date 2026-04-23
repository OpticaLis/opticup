# SPEC — P21_AUTOMATION_OVERHAUL

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — event management is unusable without these fixes
> **Origin:** Daniel's QA feedback on P20 confirmation modal + automation rules

---

## 1. Goal

Fix two critical usability problems in the CRM automation system that make
event management unworkable at scale:

**Problem A — Confirmation modal doesn't scale.** The P20 modal renders a card
per recipient×channel. With 200 attendees × 2 channels = 400 cards in a single
scrollable column. Unusable. Daniel wants a two-tab layout: Tab 1 shows the
messages (SMS text + email preview), Tab 2 shows the recipient list (name +
phone + email + event/board).

**Problem B — Recipient filtering too rigid.** The rule editor offers only 5
fixed recipient buckets (`trigger_lead`, `tier2`, `tier2_excl_registered`,
`attendees`, `attendees_waiting`). There is no way to filter recipients by
lead status (e.g., "only Tier 2 leads in status 'waiting'") or attendee status
within an event. A rule configured to send to "כל Tier 2" sends to everyone
in `waiting`, `invited`, `confirmed`, and `confirmed_verified` — including
people who already confirmed. Daniel needs to target specific lead statuses
within a tier.

---

## 2. Tracks

### Track A — Redesign Confirmation Modal (2-tab layout)

File: `modules/crm/crm-confirm-send.js` (currently 165L → target ~200L)

**A1. Replace the per-card layout with a two-tab modal**

New layout:

```
┌──────────────────────────────────────────────────┐
│  📩 אישור שליחת הודעות (X הודעות ל-Y נמענים)     │
│  חוק: "שינוי סטטוס: נפתחה הרשמה"                │
│──────────────────────────────────────────────────│
│  [ 📝 הודעות ]  [ 👥 נמענים (Y) ]                │
│──────────────────────────────────────────────────│
│                                                  │
│  ── TAB 1: הודעות ──                             │
│  ┌────────────────────────────────────────────┐   │
│  │ 📱 SMS                                    │   │
│  │ ─────────────────────────────────────────  │   │
│  │ היי %name%, ההרשמה לאירוע %event_name%    │   │
│  │ אושרה. נתראה ב-%event_date%!             │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ ✉️ אימייל                                 │   │
│  │ ─────────────────────────────────────────  │   │
│  │ עדכון הרשמה לאירוע המותגים - אופטיקה...   │   │
│  │ [first 3 lines + ...]                     │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  ── TAB 2: נמענים ──                             │
│  ┌────────────────────────────────────────────┐   │
│  │ שם          │ טלפון      │ מייל     │ אירוע│   │
│  │─────────────│────────────│──────────│──────│   │
│  │ דנה כהן     │ 053-788... │ dana@... │ SS25 │   │
│  │ יוסי לוי    │ 050-334... │ yosi@... │ SS25 │   │
│  │ ...         │            │          │      │   │
│  │ מציג 1-50 מתוך 200               [1][2]▸ │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│         ┌──────────┐  ┌────────┐                 │
│         │ אשר ושלח │  │  בטל   │                 │
│         └──────────┘  └────────┘                 │
└──────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Messages tab (default):** Show one card per channel (SMS, Email), NOT per
  recipient. The message body is the SAME for all recipients (template-based),
  so showing it once per channel is sufficient. Use `%name%` placeholders in
  preview text rather than substituting a specific recipient.
- **Recipients tab:** Sortable table with columns: שם מלא, טלפון, מייל, אירוע.
  Paginated at 50 per page. Show total count prominently.
- **Tab switching:** CSS-only tabs (no additional library). Active tab has
  indigo underline, matching existing CRM style.
- **Header:** Show both message count and unique recipient count. Group info
  by rule name above the tabs.
- **If multiple rules fired:** Show rule name as a subheader before each rule's
  messages tab. Recipients tab combines all rules' recipients (deduplicated by
  lead_id — if a lead appears in two rules, show once with a note).

**A2. Update `renderBodyPreview` to use template text with %var% placeholders**

Currently the modal shows `composedBody` (already substituted for a specific
recipient). For the message-first layout, show the raw template body with
`%var%` markers intact, since the preview represents ALL recipients, not one.
Fall back to the first item's `composedBody` if template body isn't available.

**A3. Preserve approve/cancel logic unchanged**

The `approveAndSend()` and `writePendingReviewRows()` functions stay as-is.
Only the visual rendering changes. The `sendPlan` data structure is unchanged.

### Track B — Add recipient status filter to rule editor

File: `modules/crm/crm-messaging-rules.js` (currently 311L → target ~340L)

**B1. Add a "סינון נמענים" (recipient filter) field to the rule editor**

After the existing "נמענים" dropdown, add a new optional field:

```
┌─────────────────────────────────────────┐
│  נמענים *                               │
│  ┌───────────────────────────────────┐   │
│  │ כל Tier 2                    ▼   │   │
│  └───────────────────────────────────┘   │
│                                         │
│  סינון לפי סטטוס (אופציונלי)            │
│  ┌───────────────────────────────────┐   │
│  │ ☑ ממתין לאירוע (waiting)         │   │
│  │ ☐ הוזמן (invited)               │   │
│  │ ☐ אישר הגעה (confirmed)         │   │
│  │ ☐ אומת (confirmed_verified)     │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Behavior:**

- The checkboxes appear only when `recipient_type` is `tier2` or
  `tier2_excl_registered` (the two audience types that query `crm_leads.status`).
- If NO checkboxes are checked → send to ALL statuses in that tier (current
  behavior — backwards compatible).
- If one or more are checked → filter recipients to ONLY leads with those
  statuses.
- The checked statuses are stored in `action_config.recipient_status_filter`
  as an array: `["waiting"]` or `["waiting", "invited"]`.
- For `attendees` and `attendees_waiting` → the filter section is hidden (those
  already filter by attendee status, not lead status).
- For `trigger_lead` → hidden (single lead, no filtering needed).

**B2. Wire the filter into `readForm()` and `openRuleModal()`**

- `readForm()`: collect checked status checkboxes into
  `action_config.recipient_status_filter`.
- `openRuleModal()`: when editing an existing rule, pre-check the saved
  statuses. Show/hide the filter block based on recipient type.
- Add a `change` listener on the recipient select to show/hide the filter.

### Track C — Wire recipient filter into automation engine

File: `modules/crm/crm-automation-engine.js` (currently 296L → target ~310L)

**C1. Update `resolveRecipients()` to respect `recipient_status_filter`**

In the `tier2` / `tier2_excl_registered` branches (lines 89–102):

Current:
```javascript
.in('status', tier2)
```

Change to:
```javascript
var statusList = (cfg.recipient_status_filter && cfg.recipient_status_filter.length)
  ? cfg.recipient_status_filter
  : tier2;
.in('status', statusList)
```

Where `cfg` is `rule.action_config` — pass it through from `prepareRulePlan`.

**C2. Pass `action_config` to `resolveRecipients()`**

Currently `resolveRecipients` signature is:
```javascript
resolveRecipients(recipientType, tenantId, triggerData)
```

Add a 4th parameter for the full `action_config`:
```javascript
resolveRecipients(recipientType, tenantId, triggerData, actionConfig)
```

The new parameter is optional — if not provided, behavior is unchanged
(backwards compatible for any external callers).

### Track D — Fix file truncation + docs refresh

**D1. Restore truncated files**

The Cowork session truncated `crm-automation-engine.js` (296→222L) and
`crm-messaging-log.js` (201→148L) on disk. Before ANY code changes, restore
from git:

```bash
git show 0a78aa4:modules/crm/crm-automation-engine.js > modules/crm/crm-automation-engine.js
git show 0a78aa4:modules/crm/crm-messaging-log.js > modules/crm/crm-messaging-log.js
```

Verify line counts match 296 and 201 before proceeding.

**D2. Update MODULE_MAP.md**

Add all files missing from `modules/Module 4 - CRM/docs/MODULE_MAP.md`:
`crm-automation-engine.js`, `crm-messaging-log.js`, `crm-activity-log.js`,
`crm-send-dialog.js`, `crm-confirm-send.js`, and any others found via
`ls modules/crm/*.js` that aren't in the map.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | Confirmation modal has 2 tabs | Visual: "הודעות" and "נמענים" tabs visible |
| 2 | Messages tab shows 1 card per channel, not per recipient | With 10 recipients × 2 channels → 2 cards, not 20 |
| 3 | Recipients tab shows sortable table with name, phone, email, event | Visual check |
| 4 | Recipients tab paginates at 50 | With >50 recipients → pagination controls appear |
| 5 | Rule editor shows status filter checkboxes when tier2 selected | Visual: checkboxes for waiting/invited/confirmed/confirmed_verified |
| 6 | Status filter hidden when recipient_type is trigger_lead/attendees | Visual: no checkboxes |
| 7 | Rule saved with `recipient_status_filter: ["waiting"]` | DB: `select action_config from crm_automation_rules where name='...'` shows filter |
| 8 | Engine filters recipients by selected statuses | With filter=["waiting"], only leads with status='waiting' are in sendPlan |
| 9 | Empty filter → all tier statuses (backwards compat) | Existing rules without filter still work |
| 10 | `wc -l` all modified files | ≤ 350 each |
| 11 | Zero new console errors on `crm.html?t=demo` | Manual browser check |
| 12 | Truncated files restored | `wc -l crm-automation-engine.js` = 296+changes, `wc -l crm-messaging-log.js` = 201 |
| 13 | MODULE_MAP.md lists all `modules/crm/*.js` files | `ls modules/crm/*.js | wc -l` matches MODULE_MAP entry count |

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** with one checkpoint:

- **Checkpoint 1 (after Track A + D1):** Report: "Modal redesigned with 2 tabs.
  Truncated files restored. Ready for Track B+C."
- Then continue Tracks B, C, D2 without stopping.

---

## 5. Stop-on-Deviation Triggers

1. Any CRM file would exceed 350 lines after edits
2. `resolveRecipients` existing callers break (backwards compat must be preserved)
3. The rule editor's save/load cycle loses existing rule data (regression)
4. File restoration from git fails (truncation still present)
5. Pre-commit hook fails on any file

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| `modules/crm/crm-confirm-send.js` (165L) | A | Rewrite modal layout → 2-tab design (~200L) |
| `modules/crm/crm-messaging-rules.js` (311L) | B | Add status filter checkboxes + readForm/openRuleModal changes (~340L) |
| `modules/crm/crm-automation-engine.js` (296L) | C, D1 | Restore truncation + add status filter to resolveRecipients (~310L) |
| `modules/crm/crm-messaging-log.js` (201L) | D1 | Restore truncation only (no code changes) |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | D2 | Add missing file entries |

---

## 7. Out of Scope

- Adding new recipient types beyond the existing 5 (e.g., custom segments)
- Editing message text inside the confirmation modal (edit via resend from log)
- Rule ordering/priority UI (sort_order exists in DB but no P21 UI for it)
- Conditional channels per rule (e.g., "SMS only if no email")
- Adding `metadata` JSONB column to `crm_message_log` (deferred M4-SPEC-P20-01)
- Language per-rule configuration
- Attendee status filtering for `attendees` / `attendees_waiting` recipient types
  (those already filter by attendee status — different axis than lead status)

---

## 8. Expected Final State

```
crm-confirm-send.js       — ~200L (redesigned modal with 2 tabs)
crm-messaging-rules.js    — ~340L (status filter checkboxes)
crm-automation-engine.js  — ~310L (restored + status filter wiring)
crm-messaging-log.js      — 201L (restored, no code changes)
MODULE_MAP.md             — updated with all crm/*.js files
```

3 commits:
1. `fix(crm): restore truncated automation engine and messaging log files`
2. `feat(crm): redesign confirmation modal with message/recipient tabs`
3. `feat(crm): add recipient status filter to automation rules`

---

## 9. Rollback Plan

1. Revert commits 2 and 3.
2. Commit 1 (file restoration) should NOT be reverted — those files need to
   be intact regardless.
3. Existing rules without `recipient_status_filter` continue to work (empty
   filter = all statuses).

---

## 10. Commit Plan

See §8. Three commits:
1. File restoration (prerequisite — must land first)
2. Modal redesign (Track A — visual only, no behavior change)
3. Status filter (Tracks B + C + D2 — new feature)

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Modal renders per-recipient cards (current) | **VERIFIED** — `crm-confirm-send.js:34-49`: `renderCard()` creates one div per plan item with recipient name + body |
| Rule editor has 5 fixed recipient types | **VERIFIED** — `crm-messaging-rules.js:24-29`: RECIPIENT_TYPES object with 5 keys |
| `resolveRecipients` uses hardcoded `tier2` status list | **VERIFIED** — `crm-automation-engine.js:91`: `.in('status', tier2)` where `tier2 = TIER2_STATUSES` |
| TIER2_STATUSES = waiting, invited, confirmed, confirmed_verified | **VERIFIED** — `crm-helpers.js:89-92` |
| `action_config` has no `recipient_status_filter` field today | **VERIFIED** — grep = 0 hits in repo |
| `crm_automation_rules.action_config` is JSONB | **VERIFIED** — `001_crm_schema.sql:308`: `action_config jsonb NOT NULL DEFAULT '{}'` |
| Files are truncated on disk | **VERIFIED** — `wc -l` = 222 and 148 vs git = 296 and 201 |
| Cross-Reference: `recipient_status_filter` unused in repo | **VERIFIED** — grep = 0 hits |

---

## 12. Lessons Already Incorporated

- **From P20 FOREMAN_REVIEW proposal 1:** Column-existence verification — all
  write targets verified against migration schema.
- **From P20 FOREMAN_REVIEW proposal 2:** QA Owner — criteria #11 explicitly
  states "manual browser check" (QA Owner: Daniel, post-execution).
- **From P19 FOREMAN_REVIEW proposal 2:** Script-tag grep pattern — N/A for
  this SPEC (no HTML file changes).
- **From P19 FOREMAN_REVIEW proposal 1:** Sample-content self-test — all
  success criteria cross-checked against SPEC examples.
- **Cross-Reference Check completed 2026-04-23:** `recipient_status_filter`
  0 hits repo-wide. No collisions.

---

*End of SPEC — P21_AUTOMATION_OVERHAUL*
