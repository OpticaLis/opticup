# P24 — Payment Lifecycle Cleanup (coupon = paid, single panel, multi-status filter, credit indicator)

> **Status:** authored 2026-04-29 by opticup-strategic (Foreman)
> **Origin:** Daniel surfaced 5 distinct UX/data issues during P23+P23.1 close-out QA. They share a single underlying theme: the payment lifecycle and the cancellation lifecycle were modeled as one column (`payment_status`) with manual admin transitions, but the actual business flow is "send coupon = customer paid the deposit", with cancellation as a separate decision. P24 aligns the code with the business flow.
> **Module:** 4 — CRM
> **Position in roadmap:** post-P23.1, parallel to P5_V2 cutover prep. NOT a cutover blocker.
> **Why this is one SPEC, not five:** the 5 issues touch the same 2-3 files and the same 4 user actions. Splitting would cause merge conflicts and re-work. They ship as one transaction.

---

## 1. Goal

Bring the CRM payment + cancellation lifecycle in line with the actual business flow, by 5 coordinated changes:

1. **Send-coupon = sets `payment_status='paid'` atomically.** When the admin clicks "שלח" (send coupon), the same DB UPDATE that sets `coupon_sent=true` also sets `payment_status='paid'` and `paid_at=now()`. This is the moment the admin has confirmed they saw the deposit in the bank account.
2. **Strip the events-detail attendees panel down to "send coupon" only.** The current modal exposes `mark_paid`, `mark_refund_requested`, `mark_refunded`, `open_credit` — these were the legacy admin-driven flow before P23. With P24's new "send coupon = paid" model, the only action needed in this surface is the same coupon-send flow used in Event Day "ניהול". All cancellation/refund flows go through Event Day "ניהול" exclusively.
3. **Add a "↪ קרדיט" indicator** that surfaces alongside the `paid` pill when the attendee's `paid` status came from `transfer_credit_to_new_attendee` (i.e., they brought a credit from a previous event). Today this transition silently flips the new attendee to `paid` without any visual cue, leading Daniel to be surprised when he registered a freshly-created event and saw "שולם" immediately.
4. **Multi-select status filter on Event Day "ניהול".** The current single-select dropdown's "כל הסטטוסים" hides `cancelled` rows by design (a P23 decision); cancelled attendees vanish from view. Replace with a chip-based multi-select that shows ALL statuses present in the event, each with its row count, none hidden by default.
5. **Preserve the legacy admin flow as an opt-in feature flag** so it can be re-enabled when the payment-link → automatic-paid integration ships.

---

## 2. Background — Live State Probed 2026-04-29

### 2.1 Reproduce-the-bug evidence (live measurements)

| Claim | Evidence |
|---|---|
| `register_lead_to_event` does NOT write `payment_status` | `pg_get_functiondef` returned function body — only writes `status`, `is_deleted`, `registration_method`. `payment_status` defaults to `'pending_payment'` (column default). |
| `transfer_credit_to_new_attendee` writes `payment_status='paid'` + `paid_at=now()` | function body lines: `UPDATE crm_event_attendees SET payment_status = 'paid', paid_at = now() WHERE id = p_new_attendee_id`. **THIS** is the source of "freshly-registered → already paid" surprise. |
| Coupon-send flow does NOT touch `payment_status` | `crm-event-day-coupon.js:113-115` UPDATE only sets `coupon_sent` + `coupon_sent_at`. |
| `payment_status='paid'` is written from 4 sites in code | `markPaid` (crm-payment-helpers.js:185), `transfer_credit_to_new_attendee` RPC (DB), nothing else. |
| `payment_status='unpaid'` is written automatically when event flips to `completed` | `crm-payment-automation.js:40` for any `pending_payment` attendee with no check-in. |
| `payment_status` CHECK constraint enumerates exactly 7 values | `pg_constraint` query confirmed: `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used`. (Per P23.1 design, `no_refund_due` is NOT in this enum — it's a separate boolean column.) |
| Filter "כל הסטטוסים" hides `cancelled` | `crm-event-day-manage.js:94`: `if (!_statusFilter && r.status === 'cancelled') return false;` — explicit by-design hide. |
| `data-pay-attendee-id` is wired in 2 surfaces | `crm-events-detail.js:206` (attendee row in events-detail) + `crm-event-day-manage.js:112` (payment pill in Event Day "ניהול"). Both go through the same `openActionModal` which renders the legacy panel. |
| `openActionModal` is THE consumer of `renderActionPanel` | `crm-payment-helpers.js:241` — single function, both surfaces share it. |
| `renderActionPanel` exposes 4 actions | lines 115–134: `mark_paid`, `mark_paid_no_confirm`, `mark_refund_requested`, `mark_refunded`, `open_credit` — all of which become "legacy" under P24. |
| `paid_via_credit` / `came_from_credit` etc. — column does NOT exist | `grep` returned 0 hits across the repo. New name. |

### 2.2 Current line counts (verifier method — `node -e split('\n').length`)

| File | Lines | Note |
|---|---|---|
| crm-event-day-manage.js | 275 | filter logic + delegating wires; comfortable headroom |
| crm-event-day-coupon.js | 141 | toggleCoupon UPDATE site |
| crm-attendee-cancel.js | 138 | unchanged in P24 |
| crm-payment-helpers.js | 271 | renderActionPanel + helpers |
| crm-events-detail.js | 342 | already at hard cap (350); event row includes pill+chip+move button |
| crm-payment-automation.js | 101 | unchanged in P24 |

Critical: `crm-events-detail.js` at 342 has 8 lines headroom. Adding the credit indicator wraps `renderStatusPill` in a 3-arg helper and likely sheds 1-2 lines if anything.

### 2.3 What `data-pay-attendee-id` does today (the legacy modal flow)

Click `[data-pay-attendee-id]` → document body delegate (`crm-payment-helpers.js:265`) → `openActionModal(aid)` → fetches attendee + event → renders a Modal with `renderActionPanel`. The panel decides which buttons to show via `allowedActions(payment_status, event)`. Daniel wants this surface stripped down to JUST "send coupon" — same UX as the Event Day coupon column.

### 2.4 What "↪ קרדיט" means visually

When a row's `payment_status` transitioned to `paid` via `transfer_credit_to_new_attendee` (NOT via `markPaid` or the new coupon-send flow), it inherited the paid state from a prior event. Daniel wants a small chip next to the existing green "שולם" pill, e.g.:

```
[💚 שולם] [💳 קרדיט מאירוע #98390]
```

The chip is informational only — it does not change behavior.

### 2.5 Test data state

- Test contact: `T5 Canary Post-Shorten` (lead_id `f49d4d8e-...`, phone `+972537889878`)
- Currently has `payment_status='credit_used'` on attendee `ce1e02a9-...` (the v4 Edge volume canary), credit was transferred to `aaaaaaaa-...` (the v4 F14 src registration).
- New attendee on event #68376 (v4 Edge concurrent B): `payment_status='paid'` via `transfer_credit_to_new_attendee` — this is the row Daniel observed in his screenshot.
- 0 rows currently have `paid_via_credit=true` (column doesn't exist).

---

## 3. Success Criteria — Each Measurable

### 3.1 DB criteria

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 1 | New column `crm_event_attendees.paid_via_credit BOOLEAN NOT NULL DEFAULT false` exists | row in information_schema | `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_event_attendees' AND column_name='paid_via_credit'` |
| 2 | View `v_crm_event_attendees_full` exposes `paid_via_credit` | column present | `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='v_crm_event_attendees_full' AND column_name='paid_via_credit'` |
| 3 | RPC `transfer_credit_to_new_attendee` updated to set `paid_via_credit=true` on the new attendee, in the same UPDATE that sets `payment_status='paid'` | grep `pg_get_functiondef` for the RPC | DB |
| 4 | `payment_status` CHECK constraint UNCHANGED — still exactly the 7 original slugs | `pg_get_constraintdef` | DB |
| 5 | Existing attendees historically transitioned via credit transfer are correctly backfilled — every row with a non-NULL `credit_used_for_attendee_id` has its CORRESPONDING new attendee marked `paid_via_credit=true` | DB query: `SELECT count(*) FROM crm_event_attendees old JOIN crm_event_attendees new ON old.credit_used_for_attendee_id=new.id WHERE new.paid_via_credit=false` returns 0 | DB |

### 3.2 Code criteria — coupon-send flow

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 6 | `crm-event-day-coupon.js:toggleCoupon` UPDATE writes `coupon_sent=true`, `coupon_sent_at=nowIso`, AND `payment_status='paid'` AND `paid_at=nowIso` in the same UPDATE — but ONLY when the current `payment_status='pending_payment'` (do not overwrite `credit_used`, `paid`, `refund_requested`, etc.) | grep + DB query post-action | code review + smoke |
| 7 | `crm-event-day-coupon.js:toggleCoupon` UPDATE includes `tenant_id` filter (Rule 22) | grep | code review |
| 8 | After successful coupon dispatch on a `pending_payment` attendee, `paid_at` and `coupon_sent_at` are equal (set in same UPDATE statement) | DB | smoke |
| 9 | After successful coupon dispatch on a `paid` attendee (already paid via credit), `paid_at` is NOT overwritten (stays as the credit-transfer timestamp) | DB | smoke |
| 10 | After successful coupon dispatch on a `credit_used` or `refund_requested` attendee, `payment_status` is NOT overwritten | DB | smoke |
| 11 | Activity log entry on coupon send includes `payment_status_after` and `paid_at_changed: bool` | grep on `couponLog` | code review |

### 3.3 Code criteria — events-detail panel simplification

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 12 | New optional `mode` parameter on `renderActionPanel(hostEl, attendeeRow, eventRow, callbacks, mode)`. `mode='legacy'` keeps current behavior; `mode='coupon_only'` shows ONLY a "שלח קופון" button (or status pill if already sent), no `mark_paid`, no refund/credit | grep + smoke | code review |
| 13 | New feature flag `window.CrmFeatureFlags.legacyPaymentPanel` (default `false`) controls whether `data-pay-attendee-id` clicks render in `legacy` mode or `coupon_only` mode | grep `CrmFeatureFlags` | code review |
| 14 | Default behavior (flag `false`): clicking `[data-pay-attendee-id]` opens the modal in `coupon_only` mode | smoke: clicking the pill in events-detail opens a modal showing only the coupon flow | manual |
| 15 | When flag is `true`, the existing 4 actions (`mark_paid`, etc.) all show — exact P23.1 behavior | smoke: set flag → reload → click pill → see 4 buttons | manual |
| 16 | `coupon_only` mode reuses the SAME `CrmEventDayCoupon.toggleCoupon` flow (don't duplicate dispatch logic) | grep | code review |
| 17 | Comments in `crm-payment-helpers.js` document that legacy-mode is preserved for the future "automatic payment-link → paid" integration | grep | code review |

### 3.4 Code criteria — credit indicator

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 18 | New helper `CrmPayment.renderCreditIndicator(attendeeRow)` returns chip HTML when `paid_via_credit=true`, empty string otherwise | grep | code review |
| 19 | The chip is rendered next to `renderStatusPill` everywhere the pill appears: events-detail row, event-day manage table, action panel modal header | grep callers; visual smoke | code review + manual |
| 20 | Chip text reads "💳 קרדיט מאירוע" (no event number — the source event is recoverable from `credit_used_for_attendee_id` chain but not exposed in the UI yet — Daniel can hover for tooltip in a future small SPEC) | smoke | manual |
| 21 | Chip color: muted violet (matches existing `credit_pending` styling: `bg-violet-100 text-violet-700`) | smoke | DOM inspection |

### 3.5 Code criteria — multi-status filter

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 22 | Replace `<select id="crm-eventday-manage-status">` with a chip group `<div id="crm-eventday-manage-status-chips">` rendering one chip per distinct status present in `state.attendees` | grep | code review |
| 23 | Each chip shows: status label (Hebrew via `getStatusInfo`), count of attendees with that status, and a checkmark when active. Format: `[✓ חדש (3)]` `[רשימת המתנה (1)]` etc. | DOM | smoke |
| 24 | Multi-select: clicking a chip toggles inclusion in the active filter set (instance var `_statusFilters: string[]`) | smoke: click 2 chips → both highlighted → table shows union | manual |
| 25 | Default state: ALL chips active (no filter applied; cancelled rows shown). The previous "hide cancelled by default" rule is REMOVED. | smoke: open Event Day "ניהול" → cancelled rows visible | manual |
| 26 | Empty filter state (no chips active) shows "אין משתתפים להצגה" | DOM | smoke |
| 27 | Status counts update live when an attendee's status changes (e.g., after cancel) | smoke: cancel an attendee → chip "ביטל (n+1)" updates | manual |
| 28 | Chips render in `crm_statuses.sort_order` ascending — so "חדש" first, "ביטל" near the end | DOM: read order; compare to `SELECT slug, sort_order FROM crm_statuses WHERE entity_type='attendee' ORDER BY sort_order` | manual |

### 3.6 Cross-cutting

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 29 | All commits on `develop`, repo clean at end | `git status` = "nothing to commit" | shell |
| 30 | Zero console errors during smoke testing | DevTools | manual |
| 31 | Iron Rule 22 — every UPDATE/INSERT carries `tenant_id` (new RPC + new code paths) | network log + code review | manual |
| 32 | Iron Rule 12 — no file exceeds 350 lines after P24 | `node -e split` count on every modified file | shell |
| 33 | Down-migration provided for the new column + RPC update | files exist | filesystem |
| 34 | All 5 changes (sections 3.1–3.5) work together: smoke a full lifecycle (register → coupon-send → cancel) without breaking any P23/P23.1 behavior | end-to-end | manual |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**

- Author the migration SQL (up + down). Daniel will approve before execution.
- Update `transfer_credit_to_new_attendee` RPC body to also set `paid_via_credit=true` on the new attendee.
- Backfill `paid_via_credit` for historical rows that were transitioned via credit transfer (any row whose `payment_status='paid'` AND has a corresponding row with `credit_used_for_attendee_id` pointing at it).
- Recreate `v_crm_event_attendees_full` to expose the new column.
- Modify `crm-event-day-coupon.js:toggleCoupon` to add the `payment_status` + `paid_at` fields to the same UPDATE — gated on `payment_status='pending_payment'` so we don't overwrite credit/paid/refund states.
- Add a `mode` param to `renderActionPanel` and a feature flag `window.CrmFeatureFlags`.
- Default the `data-pay-attendee-id` delegate to `coupon_only` mode (legacy hidden by default).
- Add the credit-indicator helper + wire it everywhere `renderStatusPill` is rendered (4 sites max).
- Replace the status dropdown with chip multi-select in `crm-event-day-manage.js`.
- Run all smoke scenarios on demo tenant + targeted DB-only verification on Prizma per the QA-tenant override (§10).

**Executor MUST stop and ask:**

- If running the migration is required by the executor — ASK Daniel explicitly: "Daniel, ready for me to run the P24 migration on the live DB? Y/N." This is Level 3.
- If `crm-events-detail.js` (currently 342 lines) is projected to exceed 345 after the change. Reach for the next file extraction step instead.
- If the grep for `renderStatusPill` callers returns >5 sites (current is 4). Centralize the pill+credit chip pair in one helper rather than touching N caller sites.
- If `pg_constraint` shows new constraints we didn't anticipate.
- If any historical row exists where `credit_used_for_attendee_id` points at a now-deleted attendee — backfill must handle this gracefully (skip + log).

**Executor MAY NOT under any circumstances:**

- Touch `payment_status` CHECK constraint.
- Modify `markPaid`, `markRefundRequested`, `markRefunded`, `openCredit` function bodies (they remain legacy-mode behavior).
- Remove or rename existing `payment_status` values.
- Remove any existing automation rule.
- Use `--no-verify` on any commit.

---

## 5. Stop-on-Deviation Triggers

| Trigger | Action |
|---|---|
| Migration fails at run time | STOP — investigate, do not proceed to UI changes |
| Backfill query returns >50 rows OR finds inconsistent data (e.g., orphaned credit_used pointers) | STOP — Daniel decides whether to backfill anyway, fix data manually, or skip |
| Coupon-send UPDATE accidentally overwrites `paid_at` for a credit-paid attendee | STOP — the gating `payment_status='pending_payment'` is wrong somewhere; investigate |
| `crm-events-detail.js` post-edit ≥350 lines | STOP — extract before adding |
| `renderStatusPill` callers >5 sites | STOP — centralize first |
| Multi-status filter UI breaks the existing "מספר מקומות פנויים" / capacity count display | STOP — investigate render order |
| Pre-commit gate fails | STOP — never `--no-verify` |
| Smoke test: clicking "שלח" on a `pending_payment` attendee leaves `payment_status='pending_payment'` | STOP — coupon-send UPDATE didn't fire; investigate |
| Smoke test: clicking "שלח" on a `credit_used` attendee changes the credit_used row | STOP — gating is wrong; investigate |

---

## 6. Out of Scope (Explicit)

- Re-enabling the legacy admin-driven payment panel BY DEFAULT. P24 hides it behind a feature flag; turning it back on is a separate decision (and probably never — the SaaS direction is "send coupon = paid").
- Showing the source event number/name in the credit chip ("מאירוע #98390"). Future small SPEC; needs join logic + denormalization decisions.
- Notifying customers about `paid_via_credit` (no SMS/email change).
- Auditing who triggered each `paid_via_credit=true` (the timestamp `paid_at` is the only audit trail).
- Migrating the `move_attendee_between_events` RPC — that one carries `payment_status` forward but doesn't set `paid_via_credit` because moves are not credit transfers (they're event swaps with the same payment state). Out of scope.
- Removing the `(payment_status='credit_used')` row's chip — credit_used has its own info-line text already; we don't add a chip to it.
- Fixing the pre-existing 4 `tid()` Rule-21 collisions (still pending P23.3).
- Fixing the verifier line-count discrepancy (still pending Finding 2).
- The events-detail cancel button (still pending P23.2).

---

## 7. Expected Final State

**DB:**
- `crm_event_attendees.paid_via_credit BOOLEAN NOT NULL DEFAULT false` exists.
- `transfer_credit_to_new_attendee` RPC sets `paid_via_credit=true` alongside `payment_status='paid'` in its UPDATE.
- `v_crm_event_attendees_full` exposes `paid_via_credit`.
- Historical rows backfilled (any row whose `payment_status='paid'` AND another row points at it via `credit_used_for_attendee_id` → `paid_via_credit=true`).
- `payment_status` CHECK constraint UNCHANGED.

**Files modified:**
- `modules/Module 4 - CRM/migrations/2026_04_29_paid_via_credit_up.sql` (new)
- `modules/Module 4 - CRM/migrations/2026_04_29_paid_via_credit_down.sql` (new)
- `modules/crm/crm-event-day-coupon.js` (~2 lines: extend the UPDATE with payment_status + paid_at)
- `modules/crm/crm-payment-helpers.js` (~+15 lines: `mode` param on `renderActionPanel`, `CrmFeatureFlags` global, `renderCreditIndicator` helper, comment block)
- `modules/crm/crm-event-day-manage.js` (~+25/-10 lines: replace dropdown with chip multi-select, drop the "hide cancelled" rule)
- `modules/crm/crm-events-detail.js` (~+1 line: render credit chip alongside pill)
- `modules/crm/crm-event-day.js` (~+1 line: render credit chip in arrived column display, if applicable)
- `crm.html` (0 lines — no new files)

**Behavior:**
- Click "שלח" on a `pending_payment` attendee → coupon dispatched + status flips to `paid` atomically.
- Open events-detail attendees → click pill → modal shows only "שלח קופון" (legacy 4 buttons hidden).
- Attendee on a new event with credit transferred → row shows "שולם" + "💳 קרדיט מאירוע" chip.
- Event Day "ניהול" filter: chips per status with live counts, multi-select, cancelled rows visible by default.

---

## 8. Commit Plan

| # | Commit | Files | Note |
|---|---|---|---|
| 1 | `migrations(crm): add paid_via_credit boolean + update transfer_credit_to_new_attendee RPC` | up.sql + down.sql | Level-3; combined DDL + RPC + view recreation + backfill in one atomic migration |
| 2 | `feat(crm): coupon send flips pending_payment → paid atomically` | crm-event-day-coupon.js | Adds payment_status + paid_at to the existing UPDATE; gated on current pending_payment |
| 3 | `feat(crm): show credit indicator next to paid pill` | crm-payment-helpers.js (new helper) + crm-event-day-manage.js + crm-events-detail.js + crm-event-day.js | Wire renderCreditIndicator at all pill render sites |
| 4 | `feat(crm): events-detail panel coupon-only mode + legacy feature flag` | crm-payment-helpers.js | New `mode` param, `CrmFeatureFlags.legacyPaymentPanel`, default coupon-only |
| 5 | `feat(crm): multi-status chip filter on event day manage` | crm-event-day-manage.js | Replace dropdown; drop hide-cancelled-by-default rule |
| 6 | `chore(crm): MODULE_MAP + CHANGELOG for P24` | module docs | Integration ceremony |

Each commit must build clean; `verify.mjs --staged` and `npm run verify:integrity` green before commit. Push at end, not between commits.

**No `--no-verify`. No exceptions.**

---

## 9. Rollback Plan

P24 has DDL — rollback is multi-stage:

1. **Code rollback:** revert commits 6 → 5 → 4 → 3 → 2 in reverse. The coupon-send flow reverts to setting only `coupon_sent` (P23 behavior). The events-detail panel returns to the 4-button legacy mode. The credit indicator is removed.
2. **DB rollback:** run `down.sql`. It (a) drops the `paid_via_credit` column from the table and view, (b) restores the `transfer_credit_to_new_attendee` RPC body to its pre-P24 form (no `paid_via_credit` write).
3. **Net result of full rollback:** identical to immediate-post-P23.1 state. Daniel's 5 surfaced issues all return.

---

## 10. QA Plan

**QA tenant override (Daniel directive 2026-04-29):** smoke on Prizma for the data-touching paths, demo for the UI-rendering paths (P2 split per P23.1). Only test contacts: phone `0537889878` or `0503348349`, email `daniel@prizma-optic.co.il`.

| # | Scenario | Where | Setup | Action | Expected |
|---|---|---|---|---|---|
| 1 | Migration smoke | Prizma | pre: column not exist | run migration | column exists with default false; backfill query reports the count of historical credit-transferred rows updated |
| 2 | RPC smoke | Prizma | new attendee created with `pending_payment` | run `transfer_credit_to_new_attendee` | new attendee has `payment_status='paid'` AND `paid_via_credit=true` in single UPDATE; backfilled row matches |
| 3 | Coupon-send flips paid | Prizma DB | pending_payment attendee on test contact | execute coupon dispatch | `payment_status='paid'`, `paid_at` set, `coupon_sent=true`, `coupon_sent_at` equals `paid_at` |
| 4 | Coupon-send no-overwrite (paid) | Prizma DB | attendee already `paid` (e.g., via credit), `coupon_sent=false` | execute coupon dispatch | `payment_status` stays `paid`, `paid_at` UNCHANGED (not overwritten); `coupon_sent=true` set |
| 5 | Coupon-send no-overwrite (credit_used) | Prizma DB | attendee with `payment_status='credit_used'` | execute coupon dispatch | `payment_status` stays `credit_used`; `coupon_sent=true` set |
| 6 | Coupon-only modal — events-detail | Demo | open events-detail, click pill on attendee | observe modal | only "שלח קופון" / "📨 נשלח" / "✓ הגיע" / "⚠️ לא הגיע" rendered; no `mark_paid`/`refund`/`credit` buttons |
| 7 | Legacy flag re-enables old panel | Demo | `window.CrmFeatureFlags.legacyPaymentPanel = true; reload` | click pill | all 4 legacy buttons appear (mark_paid, refund, etc.) |
| 8 | Credit indicator visible | Demo | attendee with `paid_via_credit=true` | open Event Day "ניהול" + events-detail | row shows green "שולם" pill AND violet "💳 קרדיט מאירוע" chip side-by-side |
| 9 | Credit indicator absent | Demo | regular `paid` attendee (paid via coupon-send, not credit) | open same screens | only green pill, no chip |
| 10 | Multi-status filter — defaults | Demo | open Event Day "ניהול" with attendees in mixed statuses (registered, cancelled, waiting_list) | observe chip group | all 3 chips active by default; cancelled rows visible in table |
| 11 | Multi-status filter — toggle | Demo | from #10 | click "ביטל" chip to deactivate | cancelled rows disappear; chip count unchanged |
| 12 | Multi-status filter — counts | Demo | cancel one attendee | observe chip "ביטל" | count incremented live |
| 13 | Multi-status filter — empty state | Demo | deactivate all chips | observe table | "אין משתתפים להצגה" |
| 14 | Iron Rule 22 | Demo | network tab | run any UPDATE-touching scenario | every PATCH includes `tenant_id` query param |
| 15 | Console clean | Demo | all scenarios | DevTools | zero errors |
| 16 | Restore test data | Both | after smoke | revert any modifications to test contact | exact pre-P24 snapshot |

**Test data discipline:** all test scenarios must restore to pre-P24 state at the end. Document which row(s) were touched and their pre-state in EXECUTION_REPORT.

---

## 11. Lessons Already Incorporated

- **Step 0 reproduce-the-bug**: every claim in §2.1 was queried live (pg_get_functiondef, grep counts, column-existence queries). No assumptions.
- **CHECK-constraint pre-flight** (P23 review Author Proposal 1): §2.1 rows verified `payment_status` constraint AND queried for any constraint on the new column. No surprises.
- **Verifier-method line counts** (P23 review Author Proposal 2): §2.2 used `node -e split('\n').length`. Headroom math is honest.
- **Cross-Reference Check** (Rule 21): grepped `paid_via_credit`, `renderCreditIndicator`, `CrmFeatureFlags`, `legacyPaymentPanel` — 0 collisions. New names unique. Existing `tid()` collisions still out of scope (P23.3).
- **Per-consumer enumeration** for `renderStatusPill`: 4 callers identified pre-authoring. Decision: centralize the pill+chip pair in a small helper (Proposal 1 from P23 review applies here too — "if callers >5 centralize").
- **Inter-commit dependency**: commit 1 (migration) lands before commit 2 (UI uses new column). Commit 4 (panel-mode flag) before commit 5 (chip filter) so that QA can isolate failures.
- **Reversibility**: down.sql mandated; backfill is restorable since `paid_via_credit` is added not modified — drop column gives identical pre-state.
- **Rule 21 process improvement** (this SPEC's first entry): semantic-only references (log strings, comments) are not in the "expected sites" enumeration. The §5 stop trigger covers data-write/read sites only.
- **DDL + tenant override clarifier** (P23.1 review Author Proposal 2): §10 explicitly notes that the migration is non-tenant-scoped (Prizma + demo both gain the column) while UI scenarios are tenant-bound to demo. Pre-empted.
- **Mid-SPEC lesson from this thread**: "send coupon = paid" was a *business-flow assumption* not surfaced in P23. Foreman missed asking "what does paid mean operationally?" P24 fixes this by making the assumption explicit and testable. The skill improvement is in §13.

---

## 12. After Execution

The executor writes:
- `EXECUTION_REPORT.md` — what was done, commits, deviations
- `FINDINGS.md` — anything observed but out-of-scope

Foreman then writes `FOREMAN_REVIEW.md` per Post-Execution Review Protocol.

---

## 13. Author-Skill Improvement Proposal (preliminary — to land in FOREMAN_REVIEW after execution)

P23 + P23.1 + this thread surfaced a class of mistake the SPEC author didn't catch: **assumed business semantics for existing fields**. Specifically `payment_status='paid'` was assumed to mean "money confirmed received", but the actual write-sites in code (`markPaid` admin button, `transfer_credit_to_new_attendee` RPC) are not the only paths Daniel cares about — the natural admin flow (send coupon) bypasses both. Going forward:

**Proposed addition to `.claude/skills/opticup-strategic/SKILL.md` Step 0 / Pre-Authoring Sweep:**
> **Business-semantics mapping (when SPEC touches a status-bearing column):** for every status/state column the SPEC reads, writes, or filters, run `grep -rn "<column>:" --include='*.js' modules/` and `pg_proc` for RPC writes, then enumerate every write-site and answer: "what business event triggers this write?" If the answer is unclear or the SPEC assumes a single source of truth, ASK Daniel before authoring. The SPEC's understanding of when each value is set must be derived from code+DB, not assumed.

This will land formally in P24 FOREMAN_REVIEW after execution.

---

*End of SPEC.md*
