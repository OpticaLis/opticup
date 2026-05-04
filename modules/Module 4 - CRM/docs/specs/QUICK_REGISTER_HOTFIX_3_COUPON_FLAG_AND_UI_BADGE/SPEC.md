# SPEC — QUICK_REGISTER_HOTFIX_3_COUPON_FLAG_AND_UI_BADGE

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer)
> **Authored on:** 2026-05-04 evening
> **Module:** 4 — CRM
> **Type:** Hotfix #3 on top of QUICK_REGISTER_QR_FLOW Rung 1 + Hotfix #1 + Hotfix #2.
> **Production discipline:** test ONLY on demo.

---

## 1. Goal

Two fixes from end-to-end smoke test 2026-05-04 evening (post-hotfix-2):

**Bug A — `coupon_sent` flag not set after auto-dispatch.** The quick-register EF dispatches the coupon-delivery email + SMS successfully (verified — 2 message_log rows, status=sent), but `crm_event_attendees.coupon_sent` stays `false`. Consequence: the event-day operator UI (`crm-event-day-coupon.js:37`) shows a "שלח" (send) button for these attendees because the button is gated on `if (!r.coupon_sent)`. An operator unaware of the auto-dispatch will click "שלח" → **the customer receives the same coupon twice.**

**Bug B — `registration_method` not surfaced in CRM UI.** The DB stores `registration_method='quick_register_qr'` correctly on every quick-register attendee, but no CRM screen shows this. Consequence: store staff cannot tell "spontaneous walk-in via QR" from "regular pre-registered customer" — both look identical in event-day boards and attendee lists. This affects how staff treats them on arrival (terms-acknowledgment, queueing, etc.).

---

## 2. Background & Motivation

**Verified evidence (2026-05-04 evening):**

- Daniel ran the full happy-path test on demo event 14 with hotfix-2 deployed. DB query confirmed:
  - Lead created with `acquired_via='quick_register_qr'` ✅
  - Attendee created with `registration_method='quick_register_qr'`, `status='registered'` ✅
  - 2 message_log rows for `event_coupon_delivery` (email + SMS, both `status='sent'`) ✅
  - **But:** `crm_event_attendees.coupon_sent=false` ❌ — the EF dispatch path doesn't update this flag.
- Code review of `modules/crm/crm-event-day-coupon.js:37`: the "שלח" button renders when `!r.coupon_sent`. The send handler at `crm-event-day-coupon.js:131-132` is the only place in the codebase that sets `coupon_sent=true` + `coupon_sent_at=nowIso`. Quick-register EF needs to mirror this behavior post-dispatch.
- Code grep for `registration_method` across `modules/crm/`: 0 hits. The field is NEVER surfaced to operators today. The View `v_crm_event_attendees_full` already exposes it (verified via information_schema), so no DB / view changes needed — only client-side rendering.

**Why this matters NOW (not a defer-to-later):** ahead of the QUICK_REGISTER_QR_FLOW Rung 2 + Rung 3 launch (when employees start sending QR codes from WhatsApp + walk-in customers actually use this in production), Bug A creates a real customer-experience risk (duplicate coupon SMS) and Bug B creates a real operational confusion. Both must be fixed before the flow goes live in real-world use.

---

## 3. Success Criteria

### Bug A — coupon_sent flag

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| A1 | `quick-register/dispatch.ts` (or wherever the dispatch lives) sets `coupon_sent=true` + `coupon_sent_at=now()` on the attendee row AFTER successful dispatch — but ONLY for the `event_coupon_delivery` template path (NOT `event_waiting_list_confirmation`) | DB query post-test: `coupon_sent=true`, `coupon_sent_at` populated, BOTH timestamps from the dispatch moment | manual smoke test |
| A2 | If dispatch partially fails (e.g., email sent but SMS fails) — still mark `coupon_sent=true` (matches `crm-event-day-coupon.js:131-132` semantics: any successful channel = coupon delivered) | `Promise.allSettled` style: at least 1 success → set flag | code inspection |
| A3 | If BOTH dispatches fail (vendor-side error) — DON'T mark `coupon_sent=true`. Customer didn't actually receive it. | flag stays false on full-failure path | code inspection |
| A4 | Existing flow (event-register, lead-intake) NOT affected by this change | event-register flow unchanged | smoke test |

### Bug B — UI badge

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| B1 | Event-day board (`crm-event-day.js` waiting/checkin/arrived columns) shows a small "רישום מהיר" badge OR icon next to attendee name when `registration_method='quick_register_qr'` | visible on demo event 14 in localhost CRM | manual UI test |
| B2 | Event detail screen (`crm-events-detail.js`) attendees list shows the same badge | visible on demo event 14 | manual UI test |
| B3 | Badge styling: subtle (not visually dominant). Suggested: small gold-tinted pill using existing canon colors (`#c9a555` background, white text, 0.7rem font, rounded). | visual review by Daniel | manual review |
| B4 | The fetch in `crm-event-day.js:71` already pulls `registration_method` (it's in the View). If executor needs to add it to the `.select(...)` list — that's part of the change. | grep new fetch list | code inspection |
| B5 | Other registration methods (`form`, `manual`, etc.) get NO badge — only `quick_register_qr` is highlighted (it's the new "spontaneous walk-in" pattern that operators need to notice) | filter rule explicit | code inspection |
| B6 | Iron Rule 12 file size on modified files | wc -l ≤350 | post-commit |

### General

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| G1 | All commits on develop only, NEVER main | git log | post-push |
| G2 | Integrity gate clean | exit 0 or 2 | post-commit |
| G3 | Single commit per concern (one for EF flag, one for UI badge — 2 commits in opticup repo) | git log | post-push |
| G4 | No DB / DDL / RPC / template changes | none in commits | git diff |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Modify `supabase/functions/quick-register/dispatch.ts` (or `index.ts` if dispatch logic is inline) to UPDATE the attendee row after dispatch:
  - On `Promise.allSettled` resolve: if at least 1 channel succeeded AND template was `event_coupon_delivery` → UPDATE `crm_event_attendees SET coupon_sent=true, coupon_sent_at=now() WHERE id=<attendee_id> AND tenant_id=<tenant_id>`
  - On total failure (both channels rejected): skip the UPDATE.
  - Wrap UPDATE in a `.catch()` — never block response on UPDATE failure (log instead).
- Modify `modules/crm/crm-event-day.js`:
  - Add `registration_method` to the `.select(...)` string at line 71 (single-string append).
  - Where each attendee card is rendered: insert badge HTML when `registration_method === 'quick_register_qr'`.
- Modify `modules/crm/crm-events-detail.js` similarly: pull the field and render badge in attendees list.
- Optional: factor a `renderRegBadge(method)` helper into `crm-helpers.js` (Rule 21 — avoid duplicating the badge HTML across 2 files). If factored, both consumers call it.
- Define the badge CSS inline (Tailwind-style) or in `css/crm.css` if existing pattern. Suggested: `<span class="inline-block px-2 py-0.5 text-[0.7rem] font-semibold rounded-full bg-yellow-500 text-white" title="רישום מהיר דרך QR">רישום מהיר</span>` (executor's call on exact styling — Daniel can iterate on visuals later).
- Run integrity gate, single commit per concern, push to develop on opticup repo.

**Executor MUST stop and ask:**
- If `dispatch.ts` doesn't return enough info to know which template was used (so we can't filter the flag-update to coupon-delivery only) — STOP, paste the dispatch return shape.
- If the `v_crm_event_attendees_full` View doesn't expose `registration_method` after all (shouldn't happen — verified to exist — but if Supabase MCP says no, STOP).
- Any prizma write.
- Any merge to main.
- If the badge styling clashes badly with the existing CRM look on first visual check.

---

## 5. Stop Triggers

1. **`coupon_sent=true` UPDATE fires but doesn't actually persist** (RLS or service-role permissions issue) — STOP, paste DB error.
2. **Adding `registration_method` to the SELECT in `crm-event-day.js:71` breaks other code** that destructures the result with strict-key validation — STOP.
3. **Iron Rule 12 violation: a file would exceed 350 lines** — STOP, propose split.
4. **Badge HTML produces RTL/layout breakage in event-day board on first render** — STOP, screenshot, iterate.

---

## 6. Rollback Plan

- `git revert <hotfix-3-commits>`. Both fixes are isolated.
- EF redeploys via CLI to drop the flag-set logic.
- UI rollback is purely client-side; on next page reload the badge disappears.
- No DB or View migration to roll back — none made.

---

## 7. Out of Scope

- Adding badges for OTHER registration methods (e.g., `form`, `manual`) — only `quick_register_qr` for now.
- Surfacing `acquired_via` (lead-level flow tag) anywhere in UI — analytics-only column, deferred.
- Adding a "Resend coupon" button that bypasses the `coupon_sent=true` guard — out of scope; if operator needs to resend they can soft-reset the flag manually for now.
- Adding the badge to the lead-detail screen, broadcast pickers, or other CRM surfaces — only event-day board + event detail attendees list (the 2 places staff actually see attendees on event day).
- Locking down the `?tenant=` storefront param (still pending end-of-M4 cleanup task).

---

## 8. Expected Final State

```
opticup repo (ERP):
  supabase/functions/quick-register/dispatch.ts   (MODIFIED — adds attendee UPDATE post-dispatch)
  modules/crm/crm-event-day.js                     (MODIFIED — adds registration_method to fetch + badge render)
  modules/crm/crm-events-detail.js                 (MODIFIED — adds badge render)
  modules/crm/crm-helpers.js                       (POSSIBLY MODIFIED — if executor extracts a renderRegBadge helper)
  modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_HOTFIX_3_COUPON_FLAG_AND_UI_BADGE/
    SPEC.md, ACTIVATION_PROMPT.md, EXECUTION_REPORT.md, FINDINGS.md

Supabase:
  Edge Functions: quick-register v5 (was v4)

Live state after deploy + smoke test:
  - Daniel submits quick-register form on demo event 14 (different phone)
  - DB shows: attendee row has coupon_sent=true + coupon_sent_at populated
  - Event-day board shows the attendee with "רישום מהיר" badge
  - Event detail screen also shows the badge
```

---

## 9. Commit Plan

**Commit 1 — opticup repo (EF):**
- Message: `fix(crm): mark coupon_sent=true after quick-register auto-dispatch`
- Files: `supabase/functions/quick-register/dispatch.ts` (or `index.ts` if dispatch is inline)
- After commit: Daniel runs CLI deploy → v5 ACTIVE.

**Commit 2 — opticup repo (UI):**
- Message: `feat(crm): show "רישום מהיר" badge on quick-register attendees in event-day + event detail`
- Files: `modules/crm/crm-event-day.js`, `modules/crm/crm-events-detail.js`, optionally `modules/crm/crm-helpers.js`
- After commit: Daniel hard-refreshes localhost CRM to pick up new JS.

**No merges to main from this SPEC by the executor.**

---

## 10. Cross-Reference Check (Step 1.5 sweep)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| `crm_event_attendees.coupon_sent` + `coupon_sent_at` | Existing columns; existing semantics confirmed via `crm-event-day-coupon.js:131-132` | Mirroring the same write semantics |
| `v_crm_event_attendees_full.registration_method` | EXISTS (verified 2026-05-04) | Reused |
| `renderRegBadge` helper | Not yet in `crm-helpers.js` | New, OK |
| Badge CSS class | No conflicts with existing CRM classes | New, OK |

Sweep: 0 collisions / 4 names.

---

## 11. Manual QA — Daniel runs

After all commits land + Daniel deploys EF v5 + hard-refreshes localhost CRM:

1. Submit `http://localhost:4321/quick-register/?tenant=demo&event=14` with full data, **different phone** than last test (so we get a fresh attendee row to verify, not a duplicate).
2. Within 60s expect SMS + email at the test phone/email (confirms dispatch still works).
3. DB verify: new attendee row has `coupon_sent=true` + `coupon_sent_at` populated.
4. Open demo CRM → Event Day → event 14. Find the new attendee. **Expect:** "רישום מהיר" badge visible next to name.
5. Open demo CRM → Events list → event 14 detail → attendees tab. **Expect:** same badge visible.
6. Smoke-check that the "שלח" button does NOT appear next to this attendee in the event-day coupon column (because `coupon_sent=true` now).
7. Optional: visit a regular attendee (created via `event-register` form) — should have NO badge, normal "שלח" behavior preserved.

**Stop trigger:** ANY prizma write during this QA → halt and escalate.

---

## 12. Captured for backlog (NOT this SPEC)

- Add badge for other emerging registration methods (e.g., a future `whatsapp_inbound` flow) — defer until actually needed.
- Surface `acquired_via` in lead detail screen — analytics improvement.
- Add "Send coupon manually" power-button that overrides the `coupon_sent` guard for edge cases — defer.
- Daniel's existing feature request: "revive cancelled attendee → registered" — already in tech-debt log.

---

*End of SPEC.*
