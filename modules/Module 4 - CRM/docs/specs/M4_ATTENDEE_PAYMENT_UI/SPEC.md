# SPEC — M4_ATTENDEE_PAYMENT_UI

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_UI/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Payment lifecycle UI, SPEC 2 of 3
> **Predecessor SPECs (closed today):** `CRM_UX_REDESIGN_TEMPLATES` (`626c72e`), `CRM_UX_REDESIGN_AUTOMATION` (`8c3343f`), F1 fix (`2c22eef`), `M4_ATTENDEE_PAYMENT_SCHEMA` (`ddad783`)
> **Successor SPEC:** `M4_ATTENDEE_PAYMENT_AUTOMATION` (SPEC #3) — depends on this closing first

**Executor TL;DR (1 sentence):** Add a colored payment-status pill column to attendee tables, build a single payment-actions panel on the attendee card with 4 action buttons (mark paid / refund-requested / refunded / credit-pending) gated by current status + the 48h hard rule, build a notification bell on `crm.html` showing credit-expiry warnings (≤30 days), highlight tier2 board rows with expiring credit in amber, and auto-fire `payment_received` SMS+Email when "mark paid" is clicked with the "send confirmation" checkbox on (default on).

---

## 1. Goal

Make the payment-lifecycle data Daniel can interact with daily:

1. **Visibility everywhere attendees appear:** every attendee row in every table gets a colored payment-status pill in a new dedicated column.
2. **Action panel on the attendee card:** one new section "ניהול תשלום" with 4 conditional buttons — `סמן שולם`, `מגיע החזר`, `החזר בוצע / קרדיט פתוח` (split into 2 sub-buttons after refund-requested). Each button is enabled only when the current `payment_status` allows the transition.
3. **48-hour hard rule (no manager override yet):** when event is in <48h or already passed, "מגיע החזר" button is disabled with a clear tooltip ("עברו 48 שעות — לא ניתן לבטל ללא אישור מיוחד"). Daniel chose to keep it simple — no PIN gate today; if he needs override later it's a follow-up.
4. **Notification bell on `crm.html` topbar:** badge counter showing how many leads have credit_pending with `credit_expires_at` ≤ 30 days from now. Click → modal with the list of leads, each row clickable to open the lead's card.
5. **Tier 2 board row highlight:** any lead with at least one attendee in `credit_pending` whose `credit_expires_at` ≤ 30 days gets a soft amber background + a tiny "💳 קרדיט פג בעוד X ימים" subtitle on the lead row.
6. **`payment_received` template auto-send on mark-paid:** the "סמן שולם" button has a paired checkbox "ושלח אישור ללקוח" (default ON). When checked, marking paid also fires SMS+Email from the `payment_received` template via the existing dispatch path.

The DB schema is **NOT** modified (closed in SPEC #1). The engine is **NOT** modified. Automations are **NOT** added (SPEC #3 territory).

---

## 2. Background & Motivation

### 2.1 What SPEC #1 left us with

After SPEC #1 (`M4_ATTENDEE_PAYMENT_SCHEMA`, closed `ddad783`), the DB has:
- `payment_status` (7 values: `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used`).
- `paid_at`, `refund_requested_at`, `refunded_at`, `credit_expires_at`, `credit_used_for_attendee_id`.
- `transfer_credit_to_new_attendee(uuid, uuid)` RPC (used by SPEC #3, NOT this SPEC).
- 4 `payment_received` template rows on demo + prizma.

But the UI shows none of it. Today, the only payment indicator on screen is the legacy `💰` icon (which read `booking_fee_paid`, now reads `payment_status='paid'` after carve-out). The 7 statuses are invisible. There's no UI to mark a refund, no UI for credits, no UI for `unpaid`. SPEC #1 deliberately stopped at schema; this SPEC turns the schema on.

### 2.2 Daniel's strategic decisions for this SPEC

| # | Decision | Source |
|---|---|---|
| Q1 | **Status pill in attendee tables + full action panel on attendee card** | Daniel approved option (ג) |
| Q2 | **No manager-PIN gate yet** — 48h rule is a hard UI disable with tooltip. Override is a future SPEC if needed. | Daniel approved (simplification) |
| Q3 | **Notification bell + amber row highlight on tier 2 board, both** | Daniel approved option (א+ב combined) |
| Q4 | **`payment_received` auto-send via paired checkbox, default ON** | Daniel approved option (ג) |

### 2.3 Why this is SPEC #2 (UI) before #3 (automations)

UI surfaces interaction patterns that automations should respect. If we built automations first, we'd risk auto-firing messages from triggers that the UI later contradicts (e.g., automation marks `unpaid` while staff is mid-flow on a refund). Schema → UI → automations is the safe order. Confirmed in SPEC #1's FOREMAN_REVIEW §9.

### 2.4 The Rule 12 challenge (why this SPEC needs careful file sizing)

Pre-flight (verified 2026-04-25 via `wc -l`):
- `modules/crm/crm-events-detail.js` — **344 lines** (6 lines from cap)
- `modules/crm/crm-event-day-manage.js` — **340 lines** (10 from cap)
- `modules/crm/crm-event-day.js` — 195 lines (155 from cap)
- `modules/crm/crm-event-day-checkin.js` — 217 lines (133 from cap)
- `modules/crm/crm-leads-tab.js` — 323 lines (27 from cap)
- `modules/crm/crm-leads-detail.js` — **349 lines** (1 from cap, ALREADY at limit)

This SPEC adds payment-status rendering + action handlers in 4-5 of these files. Naive expansion will breach Rule 12 in 3 files. The SPEC mandates a **shared payment helper module** (`crm-payment-helpers.js`) that owns the rendering + action wiring; the per-file changes are only "import + call" (~5-10 lines per file). This keeps every existing file under 350.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor reports each value in `EXECUTION_REPORT.md §2`.

### 3.1 File & repo state

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | exactly 5 | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 3 | New `crm-payment-helpers.js` size | between 200 and 320 lines | `wc -l modules/crm/crm-payment-helpers.js` |
| 4 | New `crm-notifications-bell.js` size | between 120 and 220 lines | `wc -l modules/crm/crm-notifications-bell.js` |
| 5 | New `crm-payment-helpers.js` exists | exit 0 | `test -f modules/crm/crm-payment-helpers.js` |
| 6 | New `crm-notifications-bell.js` exists | exit 0 | `test -f modules/crm/crm-notifications-bell.js` |
| 7 | `crm.html` script tags added | 2 new `<script>` tags, both before `crm-events-detail.js` | grep `crm.html` |
| 8 | `crm.html` bell anchor in DOM | 1 new element `<div id="crm-notifications-bell">` in topbar | grep `crm.html` |
| 9 | Integrity Gate (Iron Rule 31) | exit 0 (clean) | `npm run verify:integrity; echo $?` → `0` |
| 10 | Pre-commit hooks pass on each commit | all pass without `--no-verify` | `git commit` succeeds |
| 11 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | `find modules/crm -name '*.js' -exec wc -l {} + \| awk '$1>350'` |
| 12 | Modified files stay near pre-SPEC sizes | every modified existing file grew by ≤15 lines | per-file `wc -l` before/after |

### 3.2 Behavioral — pill column in tables

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 13 | Event detail attendees table has new "תשלום" column | new `<th>` + per-row `<td>` with status pill | QA path 1 |
| 14 | Event-day-manage table has the same column | same | QA path 2 |
| 15 | Event-day-checkin search-result rows show status pill | next to attendee name | QA path 3 |
| 16 | Pill colors match payment_status taxonomy | sky=pending, emerald=paid, slate=unpaid, amber=refund_requested, gray=refunded, violet=credit_pending, slate-light=credit_used | visual verify per QA path |
| 17 | All 13 demo attendees render with correct pill | 1 emerald (paid for דנה כהן), 12 sky (pending) | QA path 1 |

### 3.3 Behavioral — action panel on attendee card

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 18 | Attendee card opens with new "ניהול תשלום" section | section visible, current status shown as labeled pill at top | QA path 4 |
| 19 | Buttons enabled-state matches transition matrix | see §8.3 matrix; 4 specific status combos tested | QA path 4 |
| 20 | "סמן שולם" with checkbox ON → fires payment_received SMS+Email | row in `crm_message_log` with template_slug=`payment_received_*_he`, status sent OR queued | QA path 5 |
| 21 | "סמן שולם" with checkbox OFF → no message sent | 0 new rows in `crm_message_log` for that lead/event | QA path 5 |
| 22 | "מגיע החזר" button disabled when event is <48h away | tooltip text "עברו 48 שעות..." appears on hover | QA path 6 |
| 23 | "מגיע החזר" button disabled when event already passed | same tooltip, button visually disabled | QA path 6 |
| 24 | After "מגיע החזר" clicked, 2 sub-buttons appear | "סמן הוחזר" + "פתח קרדיט עד..." (date input default = today + 6 months) | QA path 7 |
| 25 | "פתח קרדיט" sets payment_status=`credit_pending` + `credit_expires_at` | SQL row updated | QA path 7 |

### 3.4 Behavioral — notification bell + tier2 highlight

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 26 | Bell icon rendered in `crm.html` topbar | visible, no console errors | QA path 8 |
| 27 | Bell badge shows count of leads with credit_expires_at ≤ 30d | numeric badge if >0; hidden if 0 | QA path 8 |
| 28 | Bell click opens modal with list of leads | each row: lead name + days-until-expiry + clickable | QA path 8 |
| 29 | Tier 2 board renders amber background on at-risk leads | row has `bg-amber-50` class + small subtitle | QA path 9 |
| 30 | Click on at-risk row's subtitle opens lead card | lead detail modal opens | QA path 9 |

### 3.5 Backward-compat

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 31 | The `💰` legacy paid indicator still works | the existing icon for `payment_status='paid'` still renders alongside the new pill (backward visual aid) — OR removed, executor decides | QA path 10 |
| 32 | All 13 demo attendees still load in every table | UI loads attendees tab without error in event-detail, event-day, event-day-manage | QA path 10 |
| 33 | No regression on the 2 closed UX SPECs | templates editor + automation editor still work as before | QA spot-check |
| 34 | `crm-automation-engine.js` untouched | no diff in this SPEC's range | git verify |
| 35 | DB schema untouched | no migrations added | git verify |

### 3.6 Documentation

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 36 | New entry in MODULE_MAP.md for both new files | 2 new entries under "Payment lifecycle (UI)" | grep |
| 37 | SESSION_CONTEXT updated | new Phase History row | grep |
| 38 | CHANGELOG updated | new section at top | grep |
| 39 | EXECUTION_REPORT.md present | exit 0 | `test -f` |
| 40 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 41 | Push to origin | exit 0, HEAD synced | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file in the repo (Level 1).
- Run read-only SQL on demo + prizma (Level 1).
- Edit `modules/crm/*.js` files within bounds of §8.
- Create `modules/crm/crm-payment-helpers.js` and `modules/crm/crm-notifications-bell.js`.
- Edit `crm.html` to add 2 script tags + 1 bell-anchor div.
- Edit `modules/Module 4 - CRM/docs/MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md`.
- Commit and push to `develop` per the §9 commit plan.
- Create QA test attendees on demo via the new UI flow (Level 2 write — bounded: only attendees for QA event of the executor's choice + a non-Prizma-impacting lead). Soft-disable / hard-delete at QA close per §12.
- Decide internal helper-function names, internal class constants, internal state shape — anything not externally visible.
- Apply minor visual deviations from the design spec in §8 (e.g., exact border radius, exact tooltip positioning) as long as the visual taxonomy in §3.2 #16 is preserved.

### 4.2 What REQUIRES stopping and reporting

- **Any DDL.** No schema changes in this SPEC. STOP if needed.
- **Any change to `crm-automation-engine.js`.** STOP.
- **Any new automation rule added to `crm_automation_rules`.** STOP — that's SPEC #3 territory.
- **Any change to the `transfer_credit_to_new_attendee` RPC.** It was built in SPEC #1 to be consumed by SPEC #3, not this SPEC. STOP if you find yourself using or modifying it.
- **Any edit to a file outside the §8 list.**
- **Any edit that pushes a CRM JS file ≥350 lines.** Critical — see §2.4 Rule 12 challenge. If your edit would breach 350, STOP and report; the §8 design assumes the helper module absorbs the bulk.
- **Pre-commit hook failure** that you cannot diagnose in one read.
- **Integrity gate (Iron Rule 31) failure.** STOP.
- **Any `payment_received` template content change.** Template body is content-as-data; not the executor's concern. If the template seems wrong, log a finding, don't edit.
- **Any production tenant write.** Prizma is off-limits for QA (read-only verification OK). All QA attendees on demo only.
- **The dispatch path fires on a phone NOT in allowlist (0537889878 / 0503348349).** The 3-layer phone allowlist is the safety net. If a QA send goes to a different phone, that's a real bug → STOP.

### 4.3 SQL autonomy

- **Level 1 (read-only):** unrestricted.
- **Level 2 (writes on demo only):** allowed for QA via UI flow (mark paid, mark refund, etc. on test attendees you create). Direct SQL writes only for cleanup.
- **Level 3 (DDL):** NEVER. STOP if needed.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **A button is enabled when the transition matrix in §8.3 says it shouldn't be.** Test exhaustively on a `pending_payment` attendee, a `paid` attendee, a `refund_requested` attendee. If any shows an action button outside the allowed set → STOP.
2. **The 48h check uses client-side time without considering event timezone.** All events on demo are Israel time. The check must use the event's `event_date + event_time` as the deadline reference, not browser local time. If the executor implements `Date.now()` vs event time without timezone awareness → STOP.
3. **A real SMS/Email gets sent to a phone that's not 0537889878 or 0503348349.** Catastrophic. STOP and document.
4. **`crm.html` header structure breaks the existing tab navigation.** The bell goes ALONGSIDE the existing topbar, not inside it in a way that displaces the existing tabs. Test that all 6+ tabs still render.
5. **Mobile breakpoint (390x844) — the action panel overflows or buttons are unclickable.** The new section must work on mobile. If desktop-only, STOP and add responsive handling.
6. **Tailwind CDN tag accidentally moved.** Same trigger as predecessor SPECs. `grep "cdn.tailwindcss.com" crm.html | wc -l` must be 1, before and after.
7. **More than 5 commits, OR fewer than 5.** §9 commit plan is exact.
8. **The `payment_received` SMS/Email send is fired before the DB update is confirmed.** Order matters: UPDATE first (with `paid_at = now()`), THEN dispatch the message. If the dispatch fires first and the UPDATE fails, the customer gets a confirmation for an unpaid state. STOP if you implement reverse order.

---

## 6. Rollback Plan

```
git reset --hard ddad783   # SPEC #1 close commit
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

For DB cleanup (only if QA created stale `qa_payment_test_*` rows):
```sql
-- Reset any QA-modified attendees back to pre-SPEC state
UPDATE crm_event_attendees
   SET payment_status = 'pending_payment',
       paid_at = NULL,
       refund_requested_at = NULL,
       refunded_at = NULL,
       credit_expires_at = NULL,
       credit_used_for_attendee_id = NULL
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND id IN ('<qa_attendee_ids>');
-- Hard-delete any QA-created attendees
DELETE FROM crm_event_attendees
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND lead_id IN (SELECT id FROM crm_leads WHERE name LIKE 'QA Payment Test%');
```

Force-pushing to `develop` requires Daniel's explicit authorization.

---

## 7. Out of Scope (explicit)

- **Manager PIN override for <48h refunds** — Daniel explicitly deferred. If/when needed, follow-up SPEC adds a role check + PIN gate. Out of scope.
- **Automations** — "event completed → unpaid", credit-transfer-on-registration. SPEC #3.
- **Payment integration** — Stripe/Tranzila. Future SPEC.
- **Audit history of payment status changes** — useful but not MVP. Existing `crm_activity_log` may capture some events; full payment-history view is a follow-up.
- **`crm-automation-engine.js`** — untouched. SPEC #3 territory if it needs changes.
- **Editing `payment_received` template body** — content-as-data, not in scope.
- **Renaming the legacy `💰` indicator** — executor decides whether to keep it alongside the new pill or remove it. Both are fine; document in EXECUTION_REPORT §4.
- **Renaming `purchase_amount` or `cancelled_at`** — orthogonal columns, untouched.
- **Multi-tenant rendering differences** — same UI everywhere. If a future tenant wants tenant-specific hidden buttons, that's a `tenant_config` SPEC.

### Forward-flags for future SPECs

- **SPEC #3 (`M4_ATTENDEE_PAYMENT_AUTOMATION`)** will use the `transfer_credit_to_new_attendee` RPC inside an automation triggered by "lead registers for new event". The UI in this SPEC must NOT call that RPC directly (the orchestration is the automation's job).
- **SPEC #3 will also need a "send payment_link template" automation** that fires when a new attendee is created with `payment_status='pending_payment'`. The link itself is in the existing registration-confirmation template (per Daniel's clarification — no new template needed).
- **Notifications infrastructure:** the bell built here is single-purpose (credit expiry). If/when other notification types arise (e.g., "attendee unpaid for 24h"), the bell architecture should generalize. For now it's hard-coded to the credit-expiry query.
- **Payment dashboard:** "show me all events with unpaid attendees in the next 7 days" — useful staff view, not built here.

---

## 8. Expected Final State

### 8.1 New file: `modules/crm/crm-payment-helpers.js` — target 240–290 lines

Module pattern: IIFE registering `window.CrmPayment`. Owns the per-status pill rendering, the action-panel HTML + wiring, the "send payment_received template" trigger, and the transition-matrix logic.

Public API (consumed by the 4-5 modified files):

```javascript
window.CrmPayment = {
  // Render a small status pill. Returns HTML string.
  renderStatusPill: function (paymentStatus, opts) { ... },

  // Render the full action panel into a host element. Wires all buttons.
  renderActionPanel: function (hostEl, attendeeRow, eventRow, callbacks) { ... },

  // Programmatic update: mark paid, fire payment_received if requested.
  // Used by the action panel's button handlers; exposed for testability.
  markPaid: async function (attendeeId, sendConfirmation) { ... },

  // Mark refund requested (auto-suggested for >48h cancellations).
  markRefundRequested: async function (attendeeId) { ... },

  // Mark refunded (must come after refund_requested).
  markRefunded: async function (attendeeId) { ... },

  // Open credit (must come after refund_requested). Sets credit_expires_at.
  openCredit: async function (attendeeId, expiresAt) { ... },

  // Helper: returns true if the event is >48h away from now.
  // Uses event_date + event_time as the deadline reference, NOT browser-now.
  isRefundEligibleByTime: function (eventRow) { ... },

  // Helper: returns the array of allowed action keys for a given current status.
  // E.g., 'pending_payment' → ['mark_paid', 'mark_refund_requested'] (if >48h).
  allowedActions: function (paymentStatus, eventRow) { ... },

  // Constants for color theme.
  STATUS_COLORS: { pending_payment: 'sky', paid: 'emerald', ... },
  STATUS_LABELS: { pending_payment: 'ממתין לתשלום', paid: 'שולם', ... }
};
```

### 8.2 New file: `modules/crm/crm-notifications-bell.js` — target 140–200 lines

Module pattern: IIFE registering `window.CrmNotificationsBell`. Owns the bell icon, badge counter, modal list, and click-through to lead card.

Public API:

```javascript
window.CrmNotificationsBell = {
  // Render the bell into a host element. Lazy-loads the credit-expiry query.
  render: function (hostEl) { ... },

  // Returns count of leads with credit_expires_at within the next 30 days.
  // Used internally; exposed for spot-testing.
  countExpiring: async function () { ... },

  // Forces a refresh of the bell badge (call after any payment action that may change credit state).
  refresh: function () { ... }
};
```

The bell:
- Renders an icon (emoji 🔔 or SVG inline) + a badge (rounded number) when count > 0.
- On click → opens a modal/popover with up to 50 lead rows (paginated if more).
- Each row: name, days-until-expiry, "פתח כרטיס" link.
- The query uses indexed `idx_crm_attendees_credit_pending` (added in SPEC #1 §8.1) for efficiency.

### 8.3 Transition matrix (the action panel's logic)

| Current `payment_status` | Allowed actions | UI |
|---|---|---|
| `pending_payment` | `mark_paid`, `mark_refund_requested`* | "סמן שולם" + "מגיע החזר" (latter disabled if event ≤48h away) |
| `paid` | `mark_refund_requested`* | only "מגיע החזר" (disabled if event ≤48h) |
| `unpaid` | `mark_paid` | only "סמן שולם" (no checkbox auto-send — לקוח כבר עבר אירוע, לא נשלח אישור) |
| `refund_requested` | `mark_refunded`, `open_credit` | "סמן הוחזר" + "פתח קרדיט עד..." (date picker) |
| `refunded` | (terminal) | no action buttons; status is terminal |
| `credit_pending` | (system-managed; no UI buttons) | text shows "קרדיט פתוח עד <date>" + "ימים שנותרו" |
| `credit_used` | (terminal) | text shows "קרדיט מומש לאירוע <event_link>" |

*Disabled by §3.3 #22-23 when event_date + event_time is within 48h of now.

### 8.4 Modified files — small surgical edits using the helper module

These 4 files get a "+ pill column" + a "+ action panel call" — typically 5-10 lines each. Specifics:

#### `modules/crm/crm-events-detail.js` — currently 344 lines, target 348-352 → MUST stay ≤350
- In the attendees table render, add a `<th>` and per-row `<td>` calling `window.CrmPayment.renderStatusPill(row.payment_status)`.
- In the per-attendee detail modal opener, add a host div for the action panel and call `window.CrmPayment.renderActionPanel(hostEl, attendeeRow, eventRow, { onUpdate: refresh })`.
- **TIGHT BUDGET** — 1 line over breaks Rule 12. May need to compress an existing comment.

#### `modules/crm/crm-event-day-manage.js` — currently 340 lines, target 345-348
- Same pattern: add a column + call helper.
- 10-line headroom.

#### `modules/crm/crm-event-day-checkin.js` — currently 217 lines, target 222-225
- Add status pill next to attendee name in search results.
- Generous headroom.

#### `modules/crm/crm-leads-tab.js` — currently 323 lines, target 330-340
- Tier 2 board row rendering: detect "any attendee in credit_pending with expires ≤30d" and apply `bg-amber-50` + subtitle.
- Reasonable headroom.

#### `crm.html` — currently 384 lines, target 387-388
- Add 2 `<script>` tags above `crm-events-detail.js`.
- Add 1 `<div id="crm-notifications-bell"></div>` in the topbar (specific position: alongside the tab nav, right side).
- HTML, no Rule 12 concern.

### 8.5 Files NOT modified

- `crm-leads-detail.js` (349 lines, 1 from cap) — DO NOT TOUCH. The lead-card view of payment status is read from the `attendees` sub-section (rendered by other code), not this file. If the executor finds the lead-card needs payment status display, the rendering is delegated to `CrmPayment.renderStatusPill()` called from wherever the attendee row is rendered, NOT from this file.
- `crm-messaging-templates.js` (343 lines, post-SPEC #1 carve-out) — untouched.
- `crm-rule-editor.js` (273 lines) — untouched.
- `crm-automation-engine.js` — untouched.
- All other `crm-*.js` files — untouched unless explicitly listed.

### 8.6 New retrospective files

- `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_UI/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_UI/FINDINGS.md` (only if findings exist)

### 8.7 File-size projection summary

| File | Currently | Projected after | Rule 12 headroom |
|---|---|---|---|
| `crm-payment-helpers.js` | (new) | 240–290 | 60–110 lines |
| `crm-notifications-bell.js` | (new) | 140–200 | 150–210 lines |
| `crm-events-detail.js` | 344 | 348–352 | **0–2 lines (TIGHT)** |
| `crm-event-day-manage.js` | 340 | 345–348 | 2–5 lines |
| `crm-event-day-checkin.js` | 217 | 222–225 | 125–128 lines |
| `crm-leads-tab.js` | 323 | 330–340 | 10–20 lines |
| `crm.html` | 384 | 387–388 | n/a (HTML exempt) |

If `crm-events-detail.js` projects above 350 mid-execution, the executor moves more rendering logic into `crm-payment-helpers.js` and reduces the in-file footprint to a single helper-call line. Don't silently grow past 350.

### 8.8 Docs that DO NOT need updating

- `docs/GLOBAL_MAP.md` — `CrmPayment` and `CrmNotificationsBell` are internal-to-CRM helpers. Add at next Integration Ceremony.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.
- `docs/FILE_STRUCTURE.md` — already stale per Sentinel `M4-DOC-08`, deferred.
- `MASTER_ROADMAP.md` — phase status updated only when SPEC #3 closes the trio.

---

## 9. Commit Plan

Exactly 5 commits. Order matters: helpers first (importable), bell second, table integrations third, action panel fourth, retrospective fifth.

### Commit 1 — `feat(crm): add CrmPayment helper module (status pills + action panel + transitions)`

- Files: `modules/crm/crm-payment-helpers.js` (new), `crm.html` (1 script tag).
- Self-contained: registers `window.CrmPayment` but isn't yet consumed.
- Pre-commit hooks must pass.

### Commit 2 — `feat(crm): add CrmNotificationsBell module + topbar anchor`

- Files: `modules/crm/crm-notifications-bell.js` (new), `crm.html` (1 script tag + 1 anchor div).
- The bell renders, badge appears (probably 0 in pre-flight, since no attendees on demo are in credit_pending yet).
- Verify bell is visible on `crm.html?t=demo`.

### Commit 3 — `feat(crm): add payment status pill column to attendee tables`

- Files: `crm-events-detail.js`, `crm-event-day-manage.js`, `crm-event-day-checkin.js` (3 files modified).
- Each file gets minimum-viable changes: 1 `<th>` + 1 `<td>` per table = ~5 lines.
- Verify all 13 demo attendees show correct pills in all 3 views.
- Tight Rule 12 watch on `crm-events-detail.js`.

### Commit 4 — `feat(crm): add payment action panel to attendee card + tier2 credit warning + bell wiring`

- Files: `crm-events-detail.js` (action panel call inside attendee detail modal), `crm-leads-tab.js` (tier2 amber row + subtitle).
- The action buttons fire `CrmPayment.markPaid/markRefundRequested/etc`.
- `payment_received` SMS+Email auto-fires from "סמן שולם" with checkbox ON.
- Bell badge refreshes after any payment action.
- Verify end-to-end: mark a test attendee paid → message appears in `crm_message_log`.

### Commit 5 — `chore(spec): close M4_ATTENDEE_PAYMENT_UI with retrospective`

- Files: `EXECUTION_REPORT.md` (new), `FINDINGS.md` (new if any), `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` (modified).
- NO code changes here.

If any commit fails its pre-commit hook, fix the underlying issue (not bypass) and re-create a NEW commit (NOT amend).

---

## 10. Test Subjects (Pinned)

All work on demo tenant only. Pre-flight verified 2026-04-25.

### 10.1 Tenant
- **demo** — `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`.

### 10.2 Pre-flight verification (executor MUST run before commit 1)

```sql
-- Total attendees on demo
SELECT count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted=false;
-- Expected: 13

-- Per-status breakdown (post-SPEC-#1 baseline)
SELECT payment_status, count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted=false
 GROUP BY payment_status ORDER BY payment_status;
-- Expected:
--   paid: 1
--   pending_payment: 12

-- The pinned paid attendee (from SPEC #1 retro)
SELECT id, lead_id, event_id, payment_status, paid_at FROM crm_event_attendees
 WHERE id='69eedb90-…' (use full id from SPEC #1 EXECUTION_REPORT);
-- Expected: payment_status='paid', paid_at IS NOT NULL.

-- payment_received templates ready
SELECT count(*) FROM crm_message_templates
 WHERE slug LIKE 'payment_received_%' AND is_active=true
   AND tenant_id IN ('8d8cfa7e-ef58-49af-9702-a862d459cccb', (SELECT id FROM tenants WHERE slug='prizma'));
-- Expected: 4 (2 templates × 2 tenants).
```

### 10.3 Phones for QA
- Only `0537889878` and `0503348349` are in the allowlist.
- Demo's 13 attendees may have other phones — the executor MUST NOT trigger a real send to any other phone.
- For QA path 5 (mark_paid + send confirmation), the executor must EITHER:
  - Pick an attendee whose lead phone is one of the 2 allowed numbers, OR
  - Create a temporary lead with phone `0537889878`, register it as an attendee, then run the QA on it.
- Document the choice in EXECUTION_REPORT §4.

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-04-25 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/FILE_STRUCTURE.md`, all `modules/Module 4 - CRM/docs/MODULE_MAP.md`. **Result: 0 collisions.**

- `CrmPayment` global — does not exist (verified via repo-wide grep).
- `CrmNotificationsBell` global — does not exist.
- `crm-payment-helpers.js` and `crm-notifications-bell.js` filenames — do not exist.

Lessons applied from recent FOREMAN_REVIEWs:

1. **FROM `M4_ATTENDEE_PAYMENT_SCHEMA/FOREMAN_REVIEW.md §6 Proposal 1 (criteria-vs-§8 sync check)** → APPLIED: §3 criterion counts cross-checked against §8 file lists. 5 commits in §9 = 5 in criterion 2 = 5 file-list groupings in §8.
2. **FROM `M4_ATTENDEE_PAYMENT_SCHEMA/FOREMAN_REVIEW.md §6 Proposal 2 (schema migration pattern)** → NOT APPLICABLE here (no schema change), but the discipline of "minimum-viable per-file changes + helper module absorbs bulk" is borrowed.
3. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §6 Proposal 2 (Executor TL;DR)** → APPLIED at top.
4. **FROM `CRM_UX_REDESIGN_AUTOMATION/FOREMAN_REVIEW.md §7 Proposal 1 (co-staged file pre-flight)** → APPLIED in §9: commit 3 stages 3 files at once. The executor must inspect their IIFE-local helper names BEFORE committing 3 to avoid the rule-21-orphans hook trap. Specifically, `toast`, `logWrite`, `escapeHtml` may collide if defined in 2+ of the touched files.
5. **FROM `CRM_UX_REDESIGN_AUTOMATION/FOREMAN_REVIEW.md §7 Proposal 2 (behavioral preservation)** → APPLIED in §3.5 (backward-compat criteria) + §8.4 ("don't silently shed existing fields/icons").
6. **General lesson — Rule 12 pre-flight (file size budgeting at SPEC author time)** → APPLIED in §2.4 + §8.7. Three files are within 10 lines of cap; SPEC explicitly designs to keep them under by routing logic to the helper module.
7. **General lesson — pin test-subject IDs at author time** → APPLIED in §10.2.

---

## 12. Foreman QA Protocol (post-execution)

The Foreman delegates §12 execution to Claude Code on Windows desktop (Cowork-VM-cannot-reach-localhost limitation, canonical workflow per all 3 prior SPECs).

### 12.1 Path 1 — Pill column in event-detail attendees table
Navigate `crm.html?t=demo` → אירועים → open any event with attendees → verify new "תשלום" column with correct pill colors. The 1 paid attendee shows emerald, 12 others show sky.

### 12.2 Path 2 — Pill column in event-day-manage table
Navigate to event-day-manage view of the same event. Same column, same colors.

### 12.3 Path 3 — Pill in event-day-checkin search
Search for an attendee in checkin → result row shows status pill next to name.

### 12.4 Path 4 — Action panel on attendee card
Open the paid attendee's card → "ניהול תשלום" section visible → status shown as emerald pill → ONLY "מגיע החזר" button visible (since paid attendees can only request refund). Open a pending_payment attendee → "סמן שולם" + "מגיע החזר" buttons visible.

### 12.5 Path 5 — Mark paid + send confirmation
Pre-test SQL snapshot of `crm_message_log` count for demo. Mark a test attendee (with allowlisted phone) as paid with checkbox ON. Verify:
- Attendee `payment_status='paid'`, `paid_at IS NOT NULL`.
- 1+ new row in `crm_message_log` with `template_slug LIKE 'payment_received_%'`.
- Status of the message row: `sent`, `queued`, or appropriate per dispatch path.

Then mark another test attendee as paid with checkbox OFF. Verify NO new row in `crm_message_log` for that attendee.

### 12.6 Path 6 — 48h rule enforcement
Find or create an event scheduled within next 48h. Open an attendee on it → verify "מגיע החזר" disabled with tooltip. Find or create an event >48h away → verify button enabled.

### 12.7 Path 7 — Refund request → refunded OR credit
Mark an attendee `refund_requested`. Verify state. Then test both branches:
- Click "סמן הוחזר" → status=`refunded`, `refunded_at IS NOT NULL`.
- (separate attendee) Click "פתח קרדיט עד..." with default date (+6 months) → status=`credit_pending`, `credit_expires_at` set.

### 12.8 Path 8 — Bell visibility + badge + modal
- Bell visible in topbar on `crm.html?t=demo`.
- Badge shows count = number of leads with credit_expires_at ≤ 30 days (initially likely 0).
- Create a test attendee with credit_pending and `credit_expires_at = now() + 20 days` → badge increments to 1.
- Click bell → modal opens → row shows test lead with "20 ימים".
- Click on row → lead card opens.

### 12.9 Path 9 — Tier 2 board amber highlight
Navigate to "רשומים" tab. The lead with the test credit (from Path 8) should have amber background + subtitle.

### 12.10 Path 10 — Backward-compat smoke
- Templates editor still works (open a template, sees 3 sections).
- Automation rules editor still works (board picker, conditional fields).
- All 13 demo attendees load in event-detail without errors.
- Console clean (no new errors).

### 12.11 Path 11 — Final cleanup
Reset all QA-modified attendees back to baseline (`pending_payment`, all timestamps NULL, credit fields NULL). Soft-delete or hard-delete any QA-created leads. Verify:
```sql
SELECT count(*) FROM crm_event_attendees
 WHERE tenant_id='8d8cfa7e-…' AND payment_status NOT IN ('paid', 'pending_payment');
-- Expected: 0 (back to baseline of 1 paid + 12 pending).
```

```bash
npm run verify:integrity   # exit 0
git status                 # clean
git log origin/develop..HEAD --oneline  # empty
grep -c "cdn.tailwindcss.com" crm.html  # exactly 1
```

---

## 13. Pre-Merge Checklist (Executor Closure)

Every item must pass before commit 5.

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate:** `npm run verify:integrity` returns exit 0.
- [ ] `git status --short` empty (clean tree, ignoring `docs/guardian/*`).
- [ ] HEAD pushed to `origin/develop` (commits 1-4 individually; commit 5 at end).
- [ ] `EXECUTION_REPORT.md` written with all standard sections + 2 executor-skill improvement proposals.
- [ ] `FINDINGS.md` written if any findings.
- [ ] `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` updated.
- [ ] All CRM JS files ≤350 lines (Rule 12) — verified per file in §8.7 projection.
- [ ] No new orphan globals (Rule 21).
- [ ] `crm-automation-engine.js` untouched.
- [ ] No DB migrations added.
- [ ] `grep "cdn.tailwindcss.com" crm.html | wc -l` = 1.
- [ ] No real SMS/Email sent to any phone other than 0537889878 / 0503348349.

After commit 5 push, executor signals: `EXECUTOR DONE`. Foreman delegates §12 to Claude Code.

---

## 14. Dependencies / Preconditions

- Branch `develop` is current with `origin/develop`.
- `M4_ATTENDEE_PAYMENT_SCHEMA` is closed (commit `ddad783`). ✓
- Local dev server reachable at `http://localhost:3000` for QA. If not, Foreman pings Daniel before §12.
- Demo tenant has 13 attendees with 1 paid + 12 pending_payment (per §10.2).
- The 4 `payment_received` template rows exist on demo + prizma (per SPEC #1 §3.3).
- Phone allowlist active (only 0537889878 / 0503348349 receive real sends).

---

*End of SPEC.*

*This SPEC is ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
