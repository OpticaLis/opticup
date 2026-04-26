# EXECUTION_REPORT — COUPON_SEND_WIRING

> **Executor:** opticup-executor (Claude Opus 4.7 [1M])
> **Executed on:** 2026-04-24
> **SPEC author:** opticup-strategic (Cowork session 2026-04-24)
> **Start commit:** `5085b01` (docs(crm): open issues #10 + #11)
> **End commit:** (this commit) — see final `git log --oneline`

---

## 1. Summary

Wired the "שלח" button in Event Day → Manage sub-tab so it actually dispatches
the coupon email + SMS via `send-message` EF (instead of silently flipping a
DB flag). Rewrote `toggleCoupon` in `modules/crm/crm-event-day-manage.js` to
call `CrmCouponDispatch.dispatch(attendee, event)` BEFORE touching the
`coupon_sent` flag, then extracted the dispatch helper into a new file
`modules/crm/crm-coupon-dispatch.js` because the in-place rewrite pushed the
host file to 379 lines (over Rule 12 hard cap of 350). After the split the
host file is 337 lines and the helper is 61 lines. E2E QA dispatched both
channels to Daniel's test lead (דנה כהן 0537889878 / daniel@prizma-optic.co.il),
both returned `status:sent` with all seven `%vars%` substituted and no
Monday `{{...}}` residue. OPEN_ISSUE #10 closed.

---

## 2. What was done

- `modules/crm/crm-event-day-manage.js`
  - Rewrote `toggleCoupon(id, btn)` (lines ~250–316, +47 net lines):
    added defensive re-send confirm (UI today hides the button after send,
    so this protects programmatic callers); pre-flight for `coupon_code`,
    `CrmMessaging` availability, `CrmCouponDispatch` availability, and
    "attendee must have phone or email"; dispatch-then-flag ordering
    (flag update only after `dispatch.anyOk`); error toast with per-channel
    breakdown; success toast uses `allOk ? 'success' : 'warning'`.
- `modules/crm/crm-coupon-dispatch.js` (NEW, 61 lines)
  - Exports `window.CrmCouponDispatch.dispatch(attendee, event)`. Builds
    `variables = { name, phone, email, event_name, event_date, event_time,
    coupon_code, lead_id }`, invokes `CrmMessaging.sendMessage` once for SMS
    (if `attendee.phone`) and once for Email (if `attendee.email`), returns
    `{ anyOk, allOk, smsOk, emailOk, smsError, emailError, smsLogId,
    emailLogId, summary }`.
- `crm.html` — added `<script src="modules/crm/crm-coupon-dispatch.js">` at
  line 347, right after `crm-event-send-message.js` and after
  `crm-messaging-send.js` (required dependency).
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — issue #10 marked
  ✅ RESOLVED with commit hash.
- `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/EXECUTION_REPORT.md` (this file).
- `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/FINDINGS.md` (see §3).

Commits:
- `(this run)` — `fix(crm): wire coupon send button to dispatch via send-message EF` (UI + helper + script tag + SPEC retrospective).

---

## 3. Deviations from SPEC

None material. One scope shift:

- **SPEC §4 Autonomy:** "Add a small helper ... keep in same file unless Rule 12 is violated." — Rule 12 *was* violated after the in-place rewrite (file hit 379 lines). The SPEC's parenthetical explicitly permits moving to a new file in that case. A new file was created (`crm-coupon-dispatch.js`) and wired into `crm.html`. This is within the autonomy envelope, not a deviation, but flagging because §8 "Expected Final State" listed only a modification to the host file and did not pre-list the new helper file. The Foreman should update the "Possibly touched files" list to include "new helper file if host-file Rule 12 would be violated."

---

## 4. Decisions made in real time

- **Criterion #9 UX shape — "confirm dialog on re-click".** The current `couponCell`
  renders the "שלח" button only when `!coupon_sent`; after a successful send,
  the cell is replaced by the arrival-status badge (✓ הגיע / ⚠️ לא הגיע).
  There is no reachable re-click path in today's UI. SPEC §2 explicitly offers
  two valid solutions: "confirm-then-resend" OR "disable the button entirely".
  I chose "disable entirely" (no UI change) AND added a defensive `confirm()`
  inside `toggleCoupon` for programmatic callers + any future re-send button.
  Criterion #9 marked `N/A via UI` (defensive guard only). If you wanted a
  literal re-send button visible in the table, the SPEC needed to say so.
- **`%lead_id%` variable injection location.** The SPEC's Background notes
  that `%lead_id%` is injected by `event-register` EF, but `send-message` EF
  does NOT auto-inject it. I pass `lead_id` explicitly in `variables` from
  the caller. This matches the send-message EF's "caller controls all
  substitutions except `unsubscribe_url` and `registration_url`" model.
- **`event_time` formatting.** SPEC §4 says "concat `start_time` + `end_time`
  in display format". I chose `HH:MM - HH:MM` (first 5 chars of each
  `HH:MM:SS` column). No project-wide formatTimeRange helper exists (grep
  confirmed). If one is added later, swap in.
- **`event_date` formatting.** Used `CrmHelpers.formatDate` (same as
  `crm-event-send-message.js:156`). Resulting string is Hebrew display
  format. Not RFC3339 — matches how every other template renders dates.

---

## 5. What would have helped me go faster

- **SPEC §8 "Expected Final State" should have listed the new helper file as
  a conditional.** The parenthetical allowing a new file is in §4, not §8.
  Spent two tool-call cycles (wc -l check → split decision → Edit dance) on
  what could have been decided up front. **Concrete proposal 1 below.**
- **A view or helper for "resolved attendee+event payload ready for dispatch".**
  The `v_crm_event_attendees_full` view gives `full_name/phone/email`. But
  the dispatch helper still has to re-derive `event_time` from
  `start_time + end_time` every call. If the view (or a sibling `v_crm_events_display`)
  exposed a pre-formatted `time_range_display` column, this dispatcher and
  `crm-event-send-message.js` would be simpler.
- **A pre-flight check in the SPEC that the test event row's `coupon_code`
  is non-null.** SPEC §10 asked the executor to verify. I did, but having
  the Foreman verify at author time and pin the exact test event_id +
  attendee_id in the SPEC text (rather than "SuperSale טסט #3 per
  screenshot") would have saved two queries. **Concrete proposal 2 below.**

---

## 6. Iron-Rule Self-Audit

| Rule | Status | Evidence |
|------|--------|----------|
| 1 quantity atomic | N/A | No quantity changes in this SPEC |
| 2 writeLog | ✓ | `logActivity('crm.attendee.coupon_sent', id, {...})` with per-channel metadata |
| 3 soft delete | N/A | No deletions |
| 5 FIELD_MAP | N/A | No new DB fields |
| 7 DB via helpers | ✓ | `sb.from('crm_event_attendees').update(...)` is the existing pattern in this file; `CrmMessaging.sendMessage` is the project helper for dispatches |
| 8 no innerHTML with user data | ✓ | No DOM-building changes; only string comparisons + Toast/confirm |
| 9 no hardcoded business values | ✓ | Event data from `state.event`, attendee data from `state.attendees` (JOINed view); no literals |
| 12 file size ≤350 | ✓ | host 337 lines, helper 61 lines, both under cap |
| 14 tenant_id | ✓ | Existing `.eq('tenant_id', getTenantId())` preserved on attendee update |
| 21 no orphans, no duplicates | ✓ | Grep before creating `CrmCouponDispatch` — no prior "coupon dispatch" or `dispatchCouponMessages` in codebase; single `CrmCouponDispatch.dispatch` export |
| 22 defense-in-depth on writes | ✓ | `tenant_id` filter on attendee update |
| 23 no secrets | ✓ | Service-role key consumed only by Node QA script (deleted), never committed |
| 31 integrity gate | ✓ | `npm run verify:integrity` → "All clear — 3 files scanned" across the run |

---

## 7. Self-Assessment

| Dimension | Score | Justification |
|---|---|---|
| Adherence to SPEC | 9/10 | All 13 criteria met; one criterion (#9) re-interpreted per SPEC §2's "either/or" wording; flag-before-send order verified; no out-of-scope changes. |
| Adherence to Iron Rules | 10/10 | Clean audit above. Rule 12 almost-breach caught by the file-size soft-warning and addressed via explicit split. |
| Commit hygiene | 8/10 | One consolidated commit combines code + docs + retrospective. Could split into (a) code + script tag, (b) OPEN_ISSUES close + retro — but SPEC §9 explicitly says Commit 2 "may be absorbed into Commit 1", so this is intentional. |
| Documentation currency | 9/10 | OPEN_ISSUES #10 closed, retrospective written, SPEC kept intact. MODULE_MAP not updated because §8 explicitly says "not a new shared function" / "behavioral change only". |

---

## 8. Two proposals to improve opticup-executor (this skill)

### Proposal 1 — Pre-edit file-size projection step in SPEC Execution Protocol Step 2

**File:** `.claude/skills/opticup-executor/SKILL.md`, section "SPEC Execution
Protocol → Step 2 — Execute under Bounded Autonomy".

**Current state:** The skill tells the executor to execute steps and compare
results. File-size checking happens only after the edit, at which point
reverting + re-planning (to extract to a helper file) costs 2–3 tool calls.

**Proposed change:** Add a sub-step **"2.0 Line-count projection before any
code edit > 20 lines"**:

> For any edit that the executor estimates will add ≥ 20 lines to a host
> file, BEFORE running the Edit tool, compute `current + estimated_delta`
> and compare against Rule 12's hard cap (350). If the projected total
> exceeds the cap, STOP and choose: (a) split the new code into a helper
> file up-front (note the decision in EXECUTION_REPORT §3), (b) report to
> Foreman if the split contradicts SPEC §8. Do not edit first then discover.

**Rationale — this SPEC:** I edited first, saw `wc -l = 379`, then re-read
SPEC §4 to find the "keep in same file unless Rule 12 is violated" escape
hatch, then extracted. A projection step (host was 291 + ~50 from my outline
→ 341, borderline) would have triggered the split plan before the first
Edit call. Net savings: one Edit + one re-read + cognitive overhead.

### Proposal 2 — DB Pre-Flight Check must pin exact test row IDs when SPEC references a test subject

**File:** `.claude/skills/opticup-executor/SKILL.md`, section "Step 1.5 —
DB Pre-Flight Check".

**Current state:** Step 1.5 lists schema/name-collision greps. No step to
resolve any "test subject" the SPEC mentions by name or screenshot into
concrete row IDs.

**Proposed change:** Add step **"1.5.8 Test subject resolution"**:

> If the SPEC names a specific test event, lead, attendee, or other row
> (by Hebrew name, phone number, screenshot reference, etc.), the executor
> runs a SELECT that resolves the reference into the exact row id(s) and
> records them in `EXECUTION_REPORT.md §1`. If the SELECT returns zero or
> multiple plausible matches, STOP. This prevents drift between
> author-time runtime state and execution-time runtime state (a test row
> could be deleted, renamed, or there could be duplicates on demo from
> prior tests).

**Rationale — this SPEC:** §10 said "דנה כהן 053-788-9878 from screenshot".
I had to run two queries to resolve (event list → attendee list) and make a
judgment call on which event row was "the" test event. Pinning `event_id =
abda40c3-...` + `attendee_id = c92500cc-...` at pre-flight would have saved
the guesswork and locked the QA target.

---

## 9. Success Criteria — Final Tally

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Branch = develop | ✓ | `git branch --show-current` = develop |
| 2 | CrmMessaging calls ≥2 | ✓ | `crm-coupon-dispatch.js` contains 2 `CrmMessaging.sendMessage(...)` invocations (SMS + Email) |
| 3 | Slug `event_coupon_delivery` | ✓ | `crm-coupon-dispatch.js:35` `templateSlug: 'event_coupon_delivery'` |
| 4 | Flag only on success | ✓ | `crm-event-day-manage.js:300-303` — `coupon_sent: true` update is strictly after `if (!dispatch.anyOk) return` |
| 5 | File size ≤350 | ✓ | host 337, helper 61 |
| 6 | E2E SMS delivered | ✓ | `log_id=129cf502-88ca-450e-8993-07dcca2a9267`, channel=sms, status=sent, content_len=257, zero raw %vars% |
| 7 | E2E Email delivered with QR | ✓ | `log_id=d4bd3d12-1952-494b-ab45-86041d6ce3c7`, channel=email, status=sent, content_len=14372, contains literal `SUPERSALE3` + `f49d4d8e-...` UUID (confirming %coupon_code% and %lead_id% substituted, so QR `<img src=...?data=f49d4d8e-...>` will encode the correct UUID when scanned) |
| 8 | No silent-failure path | ✓ | Code review: `if (!dispatch.anyOk)` branch re-enables button + shows Toast with per-channel errors; DB flag not touched on all-fail |
| 9 | Re-click confirm | N/A via UI | UI hides button after `coupon_sent=true`; defensive `confirm()` inside `toggleCoupon` for programmatic/future callers — per SPEC §2 "disable the button entirely" option |
| 10 | 1–2 commits | ✓ | Single consolidated commit per SPEC §9 allowance |
| 11 | Integrity gate | ✓ | `npm run verify:integrity` clean each run |
| 12 | OPEN_ISSUE #10 closed | ✓ | Marked ✅ RESOLVED in OPEN_ISSUES.md |
| 13 | No DB schema changes | ✓ | Zero migrations, zero DDL |

---

*End of EXECUTION_REPORT. Awaiting Foreman review → FOREMAN_REVIEW.md.*
