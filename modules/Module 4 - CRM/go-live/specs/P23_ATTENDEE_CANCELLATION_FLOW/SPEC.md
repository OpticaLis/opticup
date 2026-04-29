# P23 — Attendee Cancellation Flow (Revised)

> **Status:** v2 authored 2026-04-29 by opticup-strategic (Foreman). Supersedes v1 of same date.
> **Why revised:** v1 used line-count baselines that became stale after 3 dirty fixes landed (`035d2a4`, `73a12a4`, `e4a3b3d`) plus a stash that's pending recovery. v1 also did not account for the file-size hard cap blocking the additions. v2 folds the deferred lifecycle-guard work back in via a Step-0 refactor.
> **Author context:** Campaign Overseer surfaced this need during P5_V2 cutover QA when Daniel asked how to cancel attendees. Investigation found no cancel UI exists; only the side-effect path `move_attendee_between_events` ever sets `status='cancelled'`. The "מגיע החזר" (refund_requested) flow exists but does not free coupon slots and is unreachable for unpaid attendees.
> **Module:** 4 — CRM
> **Position in roadmap:** post-P22, parallel to P5_V2 cutover work. NOT a cutover blocker.

---

## 1. Goal

Add an explicit "בטל" button on every attendee row that walks the admin through the correct cancellation path based on the attendee's payment status, while ensuring the existing refund/credit flow is preserved without conflict and that cancelled attendees correctly free coupon slots.

A second deliverable: a dashboard banner that surfaces attendees with `payment_status='refund_requested'` so refunds awaiting action are not lost.

A third deliverable (Step 0): a refactor of `crm-event-day-manage.js` that creates the headroom needed for the new button AND restores the deferred lifecycle-guard work currently stashed.

---

## 2. Background — Live State Probed 2026-04-29 (refreshed)

### 2.1 What landed since v1 of this SPEC

Three commits on `develop` (executor pre-flight on 2026-04-29 PM):

| Hash | Commit | Affected files |
|---|---|---|
| `035d2a4` | refactor(crm): consolidate tid() helper into CrmHelpers | crm-event-actions.js, crm-event-edit.js, crm-helpers.js |
| `73a12a4` | feat(crm): auto-default coupon_code to SuperSale{event_number} | crm-event-actions.js, crm-event-edit.js |
| `e4a3b3d` | fix(crm): eventEnded treats only 'completed' as event-finished | crm-payment-helpers.js |

### 2.2 Stashed work pending recovery

`stash@{0}: WIP: coupon dispatch lifecycle guards — defer to P23-refactor SPEC`

This stash holds ~30 lines on `crm-event-day-manage.js` that add:
- Two top-level constants `COUPON_ALLOWED_EVENT_STATUSES` (6 slugs) and `COUPON_ALLOWED_ATTENDEE_STATUSES` (6 slugs)
- A guard branch at the top of `toggleCoupon(id, btn)` that blocks dispatch when event status or attendee status is outside the allowed list, with Hebrew toast messages

**This stash is canonical — it must land in P23, not be discarded.** See §8 commit 0.5.

### 2.3 Current line counts (executor-measured 2026-04-29 post-commit)

| File | Lines on develop HEAD | Note |
|---|---|---|
| crm-event-day-manage.js | 346 | over 300 soft target; 4 below 350 hard cap |
| crm-events-detail.js | 349 | 1 below hard cap |
| crm-payment-helpers.js | 276 | fits |
| crm-event-actions.js | 299 | at soft target |
| crm-event-edit.js | 92 | fits |
| crm-dashboard.js | 295 | fits |
| crm-helpers.js | 172 | fits |
| crm-coupon-dispatch.js | 100 | fits |

### 2.4 DB / RPC state (unchanged from v1)

| Item | Live value | Source |
|---|---|---|
| `crm_event_attendees.payment_status` distinct values | `paid`, `pending_payment`, `refund_requested` | `SELECT DISTINCT payment_status` |
| Attendees in `cancelled` status | 3 rows (Prizma+demo combined); all set by `move_attendee_between_events` | DB |
| Coupon-count filter expression | `coupon_sent && status !== 'cancelled'` | crm-events-detail.js:85, 145, 312; crm-event-day-manage.js:267; crm-coupon-dispatch.js:79 |
| Cancellation-relevant RPCs | `move_attendee_between_events`, `cascade_attendee_soft_delete`, `check_in_attendee`, `sync_lead_status_from_attendee`, `transfer_credit_to_new_attendee` | information_schema.routines |
| `crm_statuses` row for attendee/`cancelled` | exists, `name_he='ביטל'`, `sort_order=7` | DB |
| Existing `payment_status` slugs in code | `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used` | `crm-payment-helpers.js` |

### 2.5 Confirmed gaps (unchanged from v1)

1. No UI cancel button — `grep -rn "cancelAttendee|crm-attendee-cancel|cancel_attendee"` returns 0 hits in `modules/`.
2. Refund-request does not free coupon — `markRefundRequested()` only touches `payment_status`; `attendee.status` stays `registered`/`confirmed`.
3. No dashboard surface for pending refunds — notifications bell tracks only `credit_pending` within 30 days.
4. `payment_status` is `text`, not enum — adding `'no_refund_due'` is a value addition.

### 2.6 Other Rule-21 collisions surfaced (not in scope, recorded)

Executor's pre-flight flagged: `tid()` is also defined locally in `crm-attendee-move.js`, `crm-automation-engine.js`, `crm-campaigns.js`, `crm-unit-economics-modal.js`. **Not blocking today**, will trip future commits that stage any 2 of them. Out of scope for P23; logged for a future small consolidation SPEC. Executor MUST NOT touch these in P23.

---

## 3. Success Criteria — Each Measurable

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 1 | New file `modules/crm/crm-event-day-coupon.js` exists, ≤200 lines | exit 0; line count printed | `wc -l modules/crm/crm-event-day-coupon.js` |
| 2 | New file `modules/crm/crm-attendee-cancel.js` exists, ≤300 lines | exit 0; line count printed | `wc -l modules/crm/crm-attendee-cancel.js` |
| 3 | Both new files loaded in `crm.html` AFTER `crm-payment-helpers.js` and BEFORE `crm-event-day-manage.js` | grep returns the new `<script>` lines in correct order | `grep -n "crm-event-day-coupon\|crm-attendee-cancel\|crm-event-day-manage" crm.html` |
| 4 | `crm-event-day-coupon.js` exports `window.CrmEventDayCoupon.toggleCoupon(id, btn, ctx)` and `window.CrmEventDayCoupon.couponCell(r, ctx)` | functions defined; `typeof === 'function'` in browser console | manual smoke |
| 5 | `crm-attendee-cancel.js` exports `window.CrmAttendeeCancel.openCancelDialog(attendeeId, opts)` and `window.CrmAttendeeCancel.cancelButtonHtml(attendee)` | functions defined | manual smoke |
| 6 | After Step 0 refactor, `crm-event-day-manage.js` ≤320 lines (target: ~280) | `wc -l` | shell |
| 7 | After all P23 work, `crm-event-day-manage.js` ≤330 lines | `wc -l` | shell |
| 8 | After all P23 work, `crm-events-detail.js` ≤345 lines | `wc -l` | shell |
| 9 | Stashed lifecycle-guard work fully restored: `COUPON_ALLOWED_EVENT_STATUSES` (6 slugs: `registration_open`, `invite_new`, `waiting_list`, `2_3d_before`, `event_day`, `invite_waiting_list`) and `COUPON_ALLOWED_ATTENDEE_STATUSES` (6 slugs: `registered`, `quick_registration`, `manual_registration`, `confirmed`, `attended`, `invited`) defined in `crm-event-day-coupon.js` | grep | `grep -n "COUPON_ALLOWED" modules/crm/crm-event-day-coupon.js` |
| 10 | `toggleCoupon` blocks dispatch when event status not in allowed list with Hebrew toast | smoke test on demo (set event to `closed`, click "שלח") | manual |
| 11 | `toggleCoupon` blocks dispatch when attendee status not in allowed list with Hebrew toast | smoke test (mark attendee `cancelled`, click "שלח") | manual |
| 12 | `git stash list` no longer contains the lifecycle-guards WIP entry (it's been incorporated, not just dropped) | `git stash list \| grep "lifecycle guards"` returns empty | shell |
| 13 | "בטל" button appears for every non-cancelled attendee on Event Day "ניהול" view | DOM has `[data-cancel-attendee]` button per row | DOM inspection |
| 14 | "בטל" button also appears in `crm-events-detail.js` attendee rows (משתתפים sub-tab) | DOM check | manual |
| 15 | Clicking "בטל" on UNPAID attendee opens confirm dialog "האם לבטל את ההרשמה?" with single OK button | dialog has 1 "אשר" + 1 "ביטול" button | smoke |
| 16 | Confirming UNPAID cancel sets `status='cancelled'` + `cancelled_at=now()` and the row leaves the active list | DB query post-action | DB + DOM |
| 17 | Clicking "בטל" on PAID attendee opens 2-button choice modal: "מגיע החזר" / "לא מגיע החזר" | modal has 2 primary CTAs | smoke |
| 18 | Choosing "מגיע החזר" sets `payment_status='refund_requested'` + `refund_requested_at=now()` AND `status='cancelled'` + `cancelled_at=now()` in the SAME UPDATE | one DB UPDATE, both fields set | DB query |
| 19 | Choosing "לא מגיע החזר" sets `payment_status='no_refund_due'` ONLY; `attendee.status` unchanged; coupon NOT freed | DB query | DB |
| 20 | Coupon-count filter behavior: cancelled attendees disappear; `no_refund_due` attendees remain | live count drops on cancel-with-refund; unchanged on no-refund-due | manual live test |
| 21 | Zero new attendee status slugs added to `crm_statuses` (uses existing `cancelled`) | `SELECT count(*) FROM crm_statuses WHERE entity_type='attendee'` returns 11 (unchanged) | DB |
| 22 | New `payment_status` value `no_refund_due` added to `STATUS_LABELS` ("לא מגיע החזר") and `STATUS_COLORS` in `crm-payment-helpers.js` | grep | `grep -n "no_refund_due" modules/crm/crm-payment-helpers.js` |
| 23 | `_renderInfoLine()` shows "לא מגיע החזר — ביטול ללא זיכוי" line when `payment_status='no_refund_due'` | DOM text visible | smoke |
| 24 | Dashboard banner surfaces count of `payment_status='refund_requested'` attendees | `<div data-banner="refunds-pending">` rendered when count > 0 | DOM |
| 25 | Banner click opens modal listing the pending refunds, clickable to lead detail | modal opens, rows clickable | smoke |
| 26 | Banner hidden when count = 0 | `<div data-banner="refunds-pending">` absent or `display:none` | DOM |
| 27 | Existing legacy "מגיע החזר" path on payment panel STILL works without setting `status='cancelled'` | DB regression check: open existing payment panel, click "מגיע החזר", verify `attendee.status` unchanged | DB |
| 28 | Iron-Rule check: every UPDATE includes `tenant_id` filter (Rule 22) | grep on new files | code review |
| 29 | All commits on `develop`, repo clean at end | `git status` = "nothing to commit" | `git status` |
| 30 | Zero console errors during all 8 QA scenarios | DevTools console clean | manual |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**

- Recover stash@{0} via `git stash apply stash@{0}` AT THE START of Step 0 to access the lifecycle-guard diff. Do NOT `git stash pop` — keep the stash intact until commit 0.5 lands clean, then `git stash drop stash@{0}` as the final action of commit 0.5.
- Create the new files `modules/crm/crm-event-day-coupon.js` and `modules/crm/crm-attendee-cancel.js`.
- Move `couponCell` + `toggleCoupon` from `crm-event-day-manage.js` to `crm-event-day-coupon.js`. **The move is verbatim copy-paste** (Iron Rule: no logic changes during structural work) EXCEPT the lifecycle-guard branch from the stash is folded in at the top of `toggleCoupon` as part of the same commit (0.5).
- Update `wireRowActions` in `crm-event-day-manage.js` to delegate `[data-toggle-coupon]` clicks to `CrmEventDayCoupon.toggleCoupon`.
- Add `no_refund_due` to `STATUS_LABELS`, `STATUS_COLORS`, and `_renderInfoLine()` in `crm-payment-helpers.js` (additive).
- Add the "בטל" button to coupon column in `crm-event-day-manage.js` (calls `CrmAttendeeCancel.cancelButtonHtml(r)`).
- Add the "בטל" button to attendee rows in `crm-events-detail.js`.
- Add the dashboard banner to `crm-dashboard.js`.
- Run all 8 QA scenarios on demo tenant.
- Commit in the order described in §8.

**Executor MUST stop and ask:**

- If after Step 0 refactor, `crm-event-day-manage.js` is NOT below 320 lines. The Foreman estimate is ~280 lines after extraction; if it lands at 325+ something else is going on.
- If applying the stash produces conflicts (the `toggleCoupon` body has changed since the stash was created — but the only commit that touched it during this gap is `e4a3b3d` which only modified `crm-payment-helpers.js`, so conflicts are not expected).
- If a Rule-21 collision surfaces beyond the `tid()` issues already documented in §2.6.
- If `markRefundRequested` has been called from a path other than the existing payment panel.
- If the banner query returns >100 `refund_requested` rows on Prizma — performance unknown, needs index review.

**Executor MAY NOT under any circumstances:**

- Modify the existing `markRefundRequested`, `markRefunded`, `openCredit` functions' behavior. They stay as the legacy refund path (admin marks refund without cancelling registration).
- Rename or remove `cancelled` status, `move_attendee_between_events` RPC, or any existing `payment_status` value.
- Touch `crm_automation_rules`.
- Skip §3 #27 regression — legacy path must still work.
- Touch any of the 4 other `tid()` collision sites (§2.6) — those wait for a separate consolidation SPEC.
- `git stash drop` BEFORE commit 0.5 is verified clean — only drop after.
- Use `--no-verify` on any commit. Pre-commit gate must pass naturally.

---

## 5. Stop-on-Deviation Triggers

In addition to global triggers in CLAUDE.md §9:

| Trigger | Action |
|---|---|
| `crm-event-day-manage.js` post-Step-0 still >320 lines | STOP — the extraction was incomplete, do NOT add the button on top |
| Any attendee status slug other than the 11 listed in §2.4 found in DB | STOP — SPEC's filter assumptions may be wrong |
| `payment_status` distinct values include something other than the 7 in §2.4 | STOP — Foreman must reconcile |
| Stash apply produces a merge conflict | STOP — investigate; do not auto-resolve |
| Adding the button cell pushes any of the 3 modified files over 350 | STOP — propose extraction; do NOT compress to fit |
| `markRefundRequested` is called from any path other than the existing payment panel | STOP — investigate; SPEC assumes single legacy caller |
| Banner query `WHERE payment_status='refund_requested'` returns >100 rows on Prizma | STOP — performance unknown |
| Smoke test of UNPAID-cancel flow shows the row still appearing in coupon count | STOP — coupon filter not catching new cancellation |
| Pre-commit gate fails on any commit | STOP — do not `--no-verify`; report the failure |

---

## 6. Out of Scope (Explicit)

- Bulk cancel (cancel multiple attendees at once). Single-row only.
- Notifications to the customer about cancellation (no SMS/email). Admin uses messaging hub manually if needed.
- Cancellation reasons. No new `cancel_reason` column.
- Reversing a cancellation ("un-cancel"). Re-register manually if needed.
- Changes to `move_attendee_between_events` RPC or its UI.
- Changes to existing row UI in `crm-events-detail.js` beyond adding the cancel button.
- New automation rules (e.g., auto-send-cancellation-confirmation).
- Migrating existing 3 cancelled attendees' `payment_status` to anything new.
- The 4 other `tid()` Rule-21 collisions (§2.6) — separate future SPEC.
- Untracked CRM go-live artifacts (`_qa_*.json`, `qa-final-*.mjs`) — leave alone.

---

## 7. Expected Final State

**Files created:**
- `modules/crm/crm-event-day-coupon.js` (new, ≤200 lines)
- `modules/crm/crm-attendee-cancel.js` (new, ≤300 lines)

**Files modified:**
- `crm.html` (2 lines — script tags)
- `modules/crm/crm-event-day-manage.js` (~−70 lines net: extract `couponCell`+`toggleCoupon`, add ~5 for cancel button + delegation hook)
- `modules/crm/crm-events-detail.js` (~+5 lines — cancel button)
- `modules/crm/crm-payment-helpers.js` (~+10 — `no_refund_due` label/color + `_renderInfoLine` branch)
- `modules/crm/crm-dashboard.js` (~+25 — banner block + click handler)

**Stash state:** `git stash list` no longer contains the lifecycle-guards WIP entry.

**Database:** zero schema changes, zero seed changes.

**Behavior:**
- Admin can cancel any attendee from Event Day "ניהול" or events-detail.
- 3 paths handled: unpaid → confirm → cancel; paid+refund-due → cancel + refund_requested; paid+no-refund-due → mark only, keep coupon.
- Dashboard surfaces refund queue.
- Coupon counts respond correctly to all 3 paths.
- Coupon dispatch (`toggleCoupon`) blocks invalid event/attendee statuses (recovered from stash).

---

## 8. Commit Plan (Revised)

| # | Commit | Files | Note |
|---|---|---|---|
| 0 | `refactor(crm): extract couponCell+toggleCoupon to crm-event-day-coupon.js` | crm-event-day-coupon.js (new), crm-event-day-manage.js, crm.html | Pure structural move — verbatim copy. No logic changes. Verify with diff that copied code is byte-identical except for `window.CrmEventDayCoupon` wrapper. |
| 0.5 | `feat(crm): coupon dispatch lifecycle guards` | crm-event-day-coupon.js | Apply stash content (the +30 lines). After commit lands clean, `git stash drop stash@{0}` (record drop hash in EXECUTION_REPORT). |
| 1 | `feat(crm): add no_refund_due payment status` | crm-payment-helpers.js | Additive; legacy paths untouched. |
| 2 | `feat(crm): cancel attendee dialog module` | crm-attendee-cancel.js (new), crm.html | New file + script tag. |
| 3 | `feat(crm): cancel button on event day manage` | crm-event-day-manage.js | Wires cancel button into coupon column via `CrmAttendeeCancel.cancelButtonHtml`. |
| 4 | `feat(crm): cancel button on events detail` | crm-events-detail.js | Wires cancel button into attendees grid. |
| 5 | `feat(crm): dashboard refund-pending banner` | crm-dashboard.js | Banner + modal. |
| 6 | `chore(crm): MODULE_MAP + CHANGELOG for P23` | module docs | Integration ceremony. |

Each commit must build clean; `verify.mjs` (or `npm run verify:integrity`) green before commit. Push at end, not between commits.

**No `--no-verify`. No exceptions.**

---

## 9. Rollback Plan

P23 is mostly additive plus one structural move (commit 0). If something breaks:
- Commits 6 → 5 → 4 → 3 → 2 → 1 → 0.5 → 0 reverted in reverse.
- The Step-0 refactor is reversible: revert commit 0 restores `couponCell` + `toggleCoupon` inside `crm-event-day-manage.js`. The new file `crm-event-day-coupon.js` becomes orphaned and gets deleted by the revert.
- The stash drop at end of commit 0.5 is irreversible BUT the content is captured in commit 0.5 itself, so the stash is no longer needed.
- No DB migration to undo.
- `payment_status='no_refund_due'` rows (if any in QA) remain in DB but are inert.

---

## 10. QA Plan (executor runs on demo tenant)

| # | Scenario | Setup | Action | Expected |
|---|---|---|---|---|
| 1 | Refactor smoke | After commit 0 | Open Event Day "ניהול" tab, click "שלח" on an attendee | Coupon dispatches exactly as before — no behavior change |
| 2 | Lifecycle guard smoke (event status) | Set event to `closed`, attendee with `coupon_sent=false` | Click "שלח" | Toast: 'לא ניתן לשלוח קופון בסטטוס אירוע "אירוע נסגר".' — no dispatch |
| 3 | Lifecycle guard smoke (attendee status) | Event in `registration_open`, attendee with `status='cancelled'` (use existing cancelled row) | Trigger `toggleCoupon` programmatically (since UI hides the button when cancelled) | Toast: 'לא ניתן לשלוח קופון למשתתף בסטטוס "ביטל".' |
| 4 | Cancel unpaid attendee | Attendee with `payment_status='pending_payment'` | Click "בטל" → confirm | `status='cancelled'`, removed from active list, coupon count drops by 1 (if had coupon) |
| 5 | Cancel paid + refund due | Attendee with `payment_status='paid'`, event >48h away | Click "בטל" → "מגיע החזר" | `status='cancelled'`, `payment_status='refund_requested'`, both timestamps set; banner counter +1 |
| 6 | Cancel paid + no refund due | Attendee with `payment_status='paid'` | Click "בטל" → "לא מגיע החזר" | `status` unchanged, `payment_status='no_refund_due'`, coupon NOT freed |
| 7 | Legacy "מגיע החזר" still works | Attendee with `payment_status='paid'` | Open payment panel via existing pill click → click "מגיע החזר" | `payment_status='refund_requested'`, `attendee.status` unchanged |
| 8 | Dashboard banner | ≥1 attendee with `payment_status='refund_requested'` | Open dashboard tab | Banner visible with correct count; click opens modal with row(s) |
| 9 | Banner zero-state | All `refund_requested` resolved | Reload dashboard | Banner hidden |
| 10 | Iron Rule 22 check | Open DevTools network tab | Run scenarios 4-6 | Every UPDATE/INSERT request body includes `tenant_id` |
| 11 | Console clean | All scenarios | Watch DevTools console | Zero errors throughout |

QA on **demo tenant only**. Do not run on Prizma.

---

## 11. Lessons Already Incorporated

- **Live-state baseline re-probed** post-commit (§2.3) — line counts are from current `develop` HEAD, not from the v1 SPEC.
- **Stash recovery folded into the SPEC** — the deferred lifecycle-guard work has a named slot (commit 0.5), not abandoned.
- **Step 0 refactor pre-emptive** — `crm-event-day-manage.js` is brought below cap BEFORE adding the button, eliminating the over-cap risk that blocked v1.
- **Cross-Reference Check** (Rule 21): grepped `no_refund_due`, `cancelAttendee`, `crm-attendee-cancel`, `crm-event-day-coupon`, `CrmEventDayCoupon`, `cancel_attendee` across the repo — 0 collisions in `modules/`. Other hits (M6_5/M7 launch drafts) are unreleased modules not yet on `develop`; no risk. The 4 known `tid()` collisions are documented in §2.6 and explicitly out of scope.
- **`wc -l` baseline** taken on all 8 candidate files (§2.3), targets defined in §3 #6, #7, #8.
- **Cross-section consistency check** (§3 vs §4 vs §5 vs §6): no contradictions — §4 forbids touching `markRefundRequested` etc., §5 reinforces with stop trigger, §6 explicitly out-of-scope.
- **Per-consumer enumeration** for the coupon-count filter: 5 sites listed in §2.4.
- **Verify-tooling discipline**: all UI verifications are rendered-DOM checks, not source-grep.
- **Inter-commit dependency**: commit order ensures (a) refactor lands before guards are added on top of it, (b) `crm-payment-helpers.js` knows `no_refund_due` before any UI tries to render it, (c) cancel module exists before buttons reference it.
- **No-`--no-verify` discipline**: commit plan and stop triggers explicitly forbid bypass.

---

## 12. After Execution

The executor writes:
- `EXECUTION_REPORT.md` — what was done, commits, deviations
- `FINDINGS.md` — anything observed but out-of-scope (e.g., the 4 `tid()` collisions still pending, latent bugs in adjacent code)

Foreman then writes `FOREMAN_REVIEW.md` per Post-Execution Review Protocol.

---

*End of SPEC.md (v2)*
