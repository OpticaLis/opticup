# SPEC — PRE_CUTOVER_FINAL_FIXES

> **Location:** `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_FINAL_FIXES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) via Campaign Overseer
> **Authored on:** 2026-05-01 (post-Direction-A QA)
> **Module:** 4 — CRM
> **Phase:** Final pre-cutover hardening (last batch before P5_7 + cutover)

---

## 1. Goal

Fix 2 production bugs surfaced by Daniel's hands-on UI session after the Direction A form QA passed:

1. **Manual attendee-add modal shows leads in WRONG statuses** — currently lists all Tier-2 leads including `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`. Should list only those genuinely available for adding to a new event: `waiting`, `waitlist`, `invited`.

2. **Refunds banner → "Manage Payment" modal is missing the "סמן הוחזר" button** — the modal opens in `coupon_only` mode by default, which renders zero action buttons. Users cannot mark a refund as completed from this entry point, leaving the refunds banner counter stuck.

---

## 1.5 Pre-flight verification (Foreman)

All assertions below grep-verified at SPEC author time:

- **Q2 search modal:** `modules/crm/crm-event-register.js:49-65` — `searchTier2Leads(term)` filters `.in('status', tier2)` against `window.TIER2_STATUSES`. The constant lives at `modules/crm/crm-helpers.js:90-98` and includes `['waiting','invited','waitlist','confirmed','confirmed_verified','not_interested','unsubscribed']`. Bug confirmed.
- **Q3 refunds modal mode:** `modules/crm/crm-payment-helpers.js:159-160` — `renderActionPanel` defaults to `coupon_only` mode unless `window.CrmFeatureFlags.legacyPaymentPanel === true` OR `mode='legacy'` is explicitly passed. The dashboard banner call at `modules/crm/crm-dashboard.js:337` calls `CrmPayment.openActionModal(aid, { onAfterAction: ... })` without a `mode` override, so it inherits the default. The `_renderCouponOnlyPanel` (line 130-154) does NOT render any action buttons — only the coupon cell. Bug confirmed.
- **`mark_refunded` button code path:** `modules/crm/crm-payment-helpers.js:179-181` correctly emits the button when `actions.indexOf('mark_refunded') !== -1`. Status transition `refund_requested → refunded` is at lines 267-274. The logic is correct; only the modal MODE is wrong.

---

## 2. Background & Motivation

After today's storefront form redesign + B8 hot-fix + browser QA all passed (PR #36 + #3 + 2bc942f + 7316962), Daniel exercised the live CRM and surfaced 2 real bugs:

1. While testing manual attendee-add on the events screen, he noticed the search modal proposed adding leads who are already `confirmed` or `attended` — these are not valid candidates for new-event registration.

2. While testing refund flow, he opened the refunds banner → clicked a row → saw the "Manage Payment" modal but found no way to mark the refund as completed. The button exists in code but the modal renders in the wrong mode.

Both are pre-cutover blockers per Daniel's directive: "אני רוצה את המערכת מושלמת עד המעבר".

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC close | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 3 (Q2 + Q3 + closing) | `git log origin/develop..HEAD --oneline` |
| 3 | Integrity gate | passes | `npm run verify:integrity` → exit 0 |
| 4 | **Q2 fix** — `searchTier2Leads()` filters to ONLY 3 statuses: `waiting`, `waitlist`, `invited` | Filter applied | grep + manual UI test |
| 5 | **Q2 fix** — Statuses excluded: `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`, `pending_terms`, `cancelled`, `removed`, `unknown_terms` (any non-3 status excluded) | Excluded | code review |
| 6 | **Q2 fix** — Manual UI test: search modal returns 0 leads if no leads match (T5 should NOT appear since it's `confirmed`) | Empty result on prizma | Chrome MCP |
| 7 | **Q3 fix** — Refunds banner row click opens "Manage Payment" modal with the "סמן הוחזר" button visible for any attendee with `payment_status='refund_requested'` | Button visible | Chrome MCP |
| 8 | **Q3 fix** — Clicking "סמן הוחזר" updates DB `payment_status='refunded'`, sets `refunded_at=NOW()`, decrements banner counter | DB + UI updates | Chrome MCP + DB query |
| 9 | **Q3 fix mechanism** — Either: (a) banner call passes `mode='legacy'` explicitly to `openActionModal`, OR (b) `_renderCouponOnlyPanel` is extended to surface refund actions when `payment_status='refund_requested'`. Executor picks per autonomy. | Working modal | code review |
| 10 | No regressions on event-day-manage refund button (the OTHER entry point which already works) | Still works | Chrome MCP smoke |
| 11 | DB row counts unchanged (no test data created) | unchanged | DB query |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read all CRM module files
- Edit `modules/crm/crm-event-register.js` (Q2)
- Edit `modules/crm/crm-payment-helpers.js` AND/OR `modules/crm/crm-dashboard.js` (Q3 — pick the cleanest path)
- Run integrity gate + verify scripts
- Commit + push to `develop`
- DEPLOY to main yourself (Daniel asked for this going forward) — cut release branch + push, attempt merge via gh CLI, fall back to telling Daniel the compare URL if gh unavailable

### What REQUIRES stopping and reporting
- Any DB write/migration (these are pure JS fixes — no DB needed)
- Any change to the action-button HTML structure outside the existing `BTN` class pattern
- Any change to `allowedActions()` — it's correct as-is
- Any merge to `main` of OTHER repos (only this scope's release branch)
- Any test failure that cannot be diagnosed in one retry
- Q3 fix attempting to remove `mode='coupon_only'` default — that would affect other call sites; just override OR extend, don't replace the default

---

## 5. Stop-on-Deviation Triggers

- If Q3 fix path (a) `mode='legacy'` causes legacy panel UI to appear in places it shouldn't (e.g., event-day-manage now shows BOTH coupon panel AND legacy panel) → STOP, switch to path (b)
- If Q3 fix path (b) extending `_renderCouponOnlyPanel` causes the coupon panel to render twice or with broken styling → STOP, switch to path (a)
- If Q2 fix breaks the existing event-register modal flow (modal still opens, search input still works, just with fewer results) — proceed; otherwise STOP

---

## 6. Rollback Plan

1. Capture START_COMMIT
2. On failure: `git reset --hard $(START_COMMIT) && git push --force-with-lease origin develop`
3. No DB changes — no DB rollback needed
4. Notify Daniel; SPEC marked REOPEN

---

## 7. Out of Scope (explicit)

- F1 (CRM modal day-of-week) — Daniel verified resolved with Ctrl+Shift+R; was browser cache, not a code regression. No fix needed.
- F2 (event status flip auto-creates messages for waiting-list leads) — Daniel agreed this is correct production behavior; only annoying during QA. No fix needed.
- Any change to Edge Functions
- Any change to templates / message bodies
- Any change to the storefront repo
- Backfill of existing DB rows
- Tightening other `recipient_type` resolvers
- Adding new payment-status transitions

---

## 8. Expected Final State

### Modified files

**Q2:**
- `modules/crm/crm-event-register.js` — `searchTier2Leads()` updated to use a NEW constant or inline list `['waiting','waitlist','invited']` instead of `window.TIER2_STATUSES`. Document the why in a code comment referencing this SPEC.

**Q3 (executor picks ONE of two paths):**

Path A (recommended — minimal blast radius):
- `modules/crm/crm-dashboard.js:337` — change `CrmPayment.openActionModal(aid, { onAfterAction: ... })` to `CrmPayment.openActionModal(aid, { mode: 'legacy', onAfterAction: ... })`. ONE LINE.

Path B (if path A causes UI regression):
- `modules/crm/crm-payment-helpers.js` — extend `_renderCouponOnlyPanel` to also surface action buttons when `attendeeRow.payment_status === 'refund_requested'`. Larger blast radius but keeps mode terminology intact.

Default expectation: Path A. Path B only if Path A breaks something.

### Cloud state
- Unchanged (no DB writes, no EF changes)

### Docs updated (MUST include)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — append entry
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` §15 — add closure note for both Q2 + Q3

---

## 9. Commit Plan

3 commits:

1. `fix(crm): manual attendee-add search filter — only show leads in waiting/waitlist/invited statuses (excludes confirmed/not_interested/unsubscribed/etc.)` — touches `crm-event-register.js`
2. `fix(crm): refunds banner — surface "סמן הוחזר" button when opening Manage Payment modal from dashboard refunds-banner` — touches `crm-dashboard.js` (Path A) OR `crm-payment-helpers.js` (Path B)
3. `chore(spec): close PRE_CUTOVER_FINAL_FIXES with retrospective` — touches EXECUTION_REPORT + FINDINGS + 3 doc updates

---

## 10. Dependencies / Preconditions

- All prior SPECs from today closed + merged to main (PR #36, PR #3, B8 hot-fix, Direction A revisions) ✓
- Demo + Prizma tenants accessible via Supabase MCP
- Chrome MCP available for verification

---

## 11. Lessons Already Incorporated

- **Pre-flight verification (Step 0.1):** All assertions in §1.5 grep-confirmed before authoring. No `payment_status` typo, no helper-name guesses.
- **§1.5 pre-flight pattern** (from prior SPEC reviews): pre-resolves the Q3 mechanism choice with executor-picks-cleanest fallback rule.
- **Tolerance band on impact** (B8 lesson): no line-count thresholds, just "passes verify gate".
- **Live-state baseline** (FOREMAN_REVIEW Proposal B): confirmed `TIER2_STATUSES` actually contains the 7 statuses listed; confirmed `_renderCouponOnlyPanel` is the active default; confirmed `allowedActions` returns the right set for `refund_requested`.

**Cross-Reference Check completed 2026-05-01:**
- No new symbols, no new DB objects, no new files. Pure logic edits to existing files.

---

## 12. QA Plan (Manual via Chrome MCP — executor performs)

### Smoke
1. `npm run verify:integrity` → exit 0
2. Page load on CRM admin: 0 console errors

### Q2
3. Open events tab → open any existing event → click "+ הוסף משתתף"
4. Search "" (empty term) — VERIFY only leads with status in (`waiting`, `waitlist`, `invited`) appear. T5 (confirmed) should NOT appear.
5. Search "T5" — VERIFY 0 results (because T5 is confirmed, excluded).
6. Search "איליה" — VERIFY only appears IF איליה's status is in the 3 allowed (currently `confirmed` per DB → should NOT appear).

### Q3
7. Open dashboard → refunds banner shows "1 בקשות החזר ממתינות" → click banner
8. Click the row of T5 (or whoever has refund_requested status — if no such attendee, create one quickly via DB UPDATE on a test attendee, then revert after)
9. VERIFY "Manage Payment" modal opens AND shows "סמן הוחזר" button
10. Click button → modal closes (or shows success) → banner counter decrements / hides
11. Verify in DB: `payment_status='refunded'`, `refunded_at` set
12. Spot-check OTHER refund entry point (event-day-manage) still works

### Pre-push final
13. `git status` clean
14. Push to develop
15. Cut release branch + open PR (Daniel-handles-merge OR you-do-it-via-gh-CLI per §4)
16. Confirm CI green

---

## 13. Closing Deliverables

In `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_FINAL_FIXES/`:
- `EXECUTION_REPORT.md`
- `FINDINGS.md` (likely empty)

---

*End of SPEC.md.*
