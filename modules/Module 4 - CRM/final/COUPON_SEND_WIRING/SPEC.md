# SPEC — COUPON_SEND_WIRING

> **Location:** `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-24
> **Module:** 4 — CRM
> **Phase:** N/A — post-merge infrastructure bug fix
> **Author signature:** Cowork strategic session 2026-04-24

---

## 1. Goal

Wire the "שלח" button in Event Day management (on an attendee's row) so it actually dispatches the coupon email + SMS via `send-message` Edge Function. Today the button only flips `coupon_sent=true` in the DB without sending anything. Ship both channels (email with QR, SMS with coupon code) using the `event_coupon_delivery_{email,sms}_he` templates that landed in commit `f621b49`.

---

## 2. Background & Motivation

**2026-04-24 discovery by opticup-executor:** While updating the `event_coupon_delivery` templates, the executor read `modules/crm/crm-event-day-manage.js:250-269` (`toggleCoupon` function) and found it calls **only** a DB update + activity log — no call to `CrmMessaging.sendMessage` or `send-message` Edge Function. This means pressing "שלח" on a coupon row today is a silent no-op for the attendee: they get no email, no SMS, but the system marks them as "coupon sent" and advances the UI.

Documented in `modules/Module 4 - CRM/final/OPEN_ISSUES.md` #10.

**What already exists (verified 2026-04-24 at author time):**
- **Templates on demo:** `event_coupon_delivery_email_he` (14,317 chars, subject set) + `event_coupon_delivery_sms_he` (257 chars) — committed `f621b49`. Variables used: `%name%`, `%event_name%`, `%event_date%`, `%event_time%`, `%lead_id%` (in QR `<img src>`), `%coupon_code%`, `%unsubscribe_url%`.
- **QR code delivery mechanism:** The email template uses `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%lead_id%">`. No server-side QR generation needed — the mail client loads the image from the QR API on render, and `%lead_id%` gets substituted by `send-message` EF at dispatch time.
- **CrmMessaging.sendMessage API** (`modules/crm/crm-messaging-send.js:39`): accepts `{leadId, eventId?, channel, templateSlug, variables, language?}`. Returns `{ok, logId, error?}`. Already used by other flows (registration confirmation, invitations, etc.).
- **DB schema:**
  - `crm_events.coupon_code` (TEXT) — **per-event** (all attendees of one event share the same code).
  - `crm_event_attendees.lead_id` (UUID) — this is what goes into the QR.
  - `crm_event_attendees.coupon_sent` (bool) + `coupon_sent_at` (timestamp) — current flags, kept for "already sent" UI state.
- **send-message EF** already auto-injects `unsubscribe_url` when missing and supports the `%var%` substitution model. No EF changes needed.

**What's missing (what this SPEC delivers):**
- `toggleCoupon()` must call `CrmMessaging.sendMessage` twice (email + SMS) with the required variables, and only flip the DB flag if at least one channel succeeded.
- Failure handling: Toast on partial/total failure, UI state reverts if both channels fail.
- Button re-click protection: a coupon already marked `coupon_sent=true` should not be re-sent silently — either confirm-then-resend or disable the button entirely.

---

## 3. Success Criteria (Measurable)

**Pre-conditions:** Commit `f621b49` exists (templates on demo). UI fix `aa89573` landed (event-day button always available). Tree clean.

| # | Criterion | Expected | Verify command |
|---|-----------|----------|----------------|
| 1 | Branch | `develop` | `git branch --show-current` |
| 2 | `toggleCoupon` calls CrmMessaging | ≥2 invocations (sms + email) | `grep -c "CrmMessaging.sendMessage" modules/crm/crm-event-day-manage.js` → ≥2 |
| 3 | `toggleCoupon` uses correct slug | `event_coupon_delivery` present | `grep -c "event_coupon_delivery" modules/crm/crm-event-day-manage.js` → ≥1 |
| 4 | DB flag only flips on success | check logic path — flag update after await, guarded by ok | Code review: `coupon_sent: true` must be inside a `if (emailResult.ok \|\| smsResult.ok)` branch |
| 5 | File size ≤350 lines (Rule 12) | `wc -l modules/crm/crm-event-day-manage.js` ≤350 | After edit |
| 6 | E2E QA — SMS delivered | manual send to 0537889878 | Test lead (dana — row seen in screenshot). Gate returns logId, SMS arrives. |
| 7 | E2E QA — Email delivered with QR | manual send to test email | Email arrives, QR image renders (qrserver image loads), scanned QR decodes to `lead_id` UUID |
| 8 | No silent failure path | if both channels fail, button reverts + Toast | Error injection test (temporarily stub CrmMessaging.sendMessage to return ok:false) |
| 9 | No double-send UX | clicking "שלח" again on already-sent coupon shows confirm dialog | Manual test |
| 10 | Commits produced | 1–2 commits | `git log origin/main..HEAD --oneline \| wc -l` |
| 11 | Integrity gate passes | `npm run verify:integrity` exit 0 or 2 | End-of-SPEC gate |
| 12 | OPEN_ISSUES #10 closed | `grep "## 10\." "modules/Module 4 - CRM/final/OPEN_ISSUES.md" \| grep -i "resolved"` | At commit |
| 13 | No DB schema changes | DDL check | Zero migrations in commit range |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read `modules/crm/crm-event-day-manage.js`, `crm-messaging-send.js`, `crm-event-send-message.js` as reference
- Edit `toggleCoupon` function scope only (lines ~240–290 based on author-time inspection)
- Add a small helper `dispatchCouponMessages(attendee, event)` if clarity demands it (keep in same file unless Rule 12 is violated)
- Call `sb.from('crm_events').select('coupon_code, name, event_date, start_time, end_time').eq('id', eventId).single()` to fetch event data (already in scope of event-day view, likely cached in UI state — reuse if possible)
- Build `variables` object with `event_name`, `event_date` (Hebrew format already in DB? check), `event_time` (concat `start_time` + `end_time` in display format), `coupon_code`, `name` (from joined lead), `phone` (from joined lead), `email` (from joined lead), `lead_id` (the attendee's `lead_id`)
- Show Toast on success + Toast on failure
- Revert the `coupon_sent=true` flag if both channels fail (or: don't set it until after ok:true)
- Add confirm dialog for re-send ("הקופון כבר נשלח ב-{timestamp}. לשלוח שוב?")
- Commit + push
- Update OPEN_ISSUES.md #10 to ✅ RESOLVED with commit hash

### What REQUIRES stopping and reporting
- If `crm_events.coupon_code` is NULL/empty for the test event → STOP (SPEC assumes event has a coupon_code set; if not, another SPEC must generate/assign it first)
- If `event_date` or `start_time/end_time` formatting requires a new helper or i18n lib → STOP (keep scope tight; can be deferred)
- If CrmMessaging.sendMessage rejects with a variable the template requires but we didn't pass (`send-message` will leave `%var%` visible) → STOP and report which variable
- If the email QR doesn't render in actual delivered email (Gmail, Outlook) → STOP, document as finding, probably not fixable in this SPEC
- Any DB migration need → STOP (scope creep)
- Any file line-count exceeding 350 → STOP, propose split

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Flag-before-send ordering:** if executor writes code that flips `coupon_sent=true` BEFORE awaiting `sendMessage` result → STOP and redo. This is the whole point of the SPEC — the original bug is exactly flag-before-send (nothing happens between flag and log).
- **Silent failure on one channel:** if only SMS succeeds and email fails (or vice versa), the UX MUST show the user which channel failed. "Coupon sent" is not a boolean when there are 2 channels — at minimum Toast should say "SMS נשלח, Email נכשל" or similar.
- **Variable mismatch:** if `send-message` returns `ok:true` but the rendered body still contains a literal `%var%` (because the variable wasn't passed), that's a silent data-integrity failure — STOP and log as finding before claiming success.
- **Missing `coupon_code` on event:** if the test event doesn't have a `coupon_code`, DO NOT auto-generate one inline. Stop and ask.

---

## 6. Rollback Plan

- Single commit: `git revert <hash>` restores the pre-SPEC `toggleCoupon` (back to silent flag-update).
- No DB changes, no schema migrations, no EF changes — rollback is code-only.
- Templates remain (they were inserted in `f621b49` and are harmless if unused).
- Start commit marker: the commit at SPEC start (executor records in EXECUTION_REPORT §1).

---

## 7. Out of Scope (explicit)

- **No changes to `send-message` EF.** QR image uses `api.qrserver.com` via `<img src>` — no server-side logic needed.
- **No changes to templates.** `event_coupon_delivery_*_he` are in DB and correct as of `f621b49`.
- **No schema changes.** `crm_event_attendees.coupon_sent`/`coupon_sent_at` already exist.
- **No Prizma propagation.** Demo-only, per OPEN_ISSUE #9 (P7 cutover scope).
- **No "add to calendar".** Deferred per OPEN_ISSUE #11.
- **No coupon-code generation/assignment flow.** If `crm_events.coupon_code` is NULL, stop. That's a separate SPEC.
- **No bulk-send ("send to all attendees at once").** Current UI is per-row "שלח"; this SPEC preserves that.
- **No scan/check-in integration.** The QR→scan flow is separate Module 4 work (different SPEC).
- **No unsubscribe flow changes.** `%unsubscribe_url%` already auto-injected by `send-message` EF.

---

## 8. Expected Final State

### Modified files
- `modules/crm/crm-event-day-manage.js` — `toggleCoupon` function rewritten to actually send. Estimated +40 to +60 lines (fetch event, build variables, dispatch both channels, handle failure). Must stay ≤350 total lines.

### Possibly touched files (if needed, otherwise NOT)
- `modules/crm/crm-event-send-message.js` — only if there's a reusable dispatch helper here that should be used. If so, reuse; don't duplicate.

### New files
- `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/FINDINGS.md` (if findings emerge)

### Updated docs
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — issue #10 marked ✅ RESOLVED with commit hash + brief note.

### DB state
No changes.

### Docs NOT updated
- `docs/GLOBAL_MAP.md` — not a new shared function
- `docs/GLOBAL_SCHEMA.sql` — no schema
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — `toggleCoupon` already registered (behavioral change only)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — optional one-line note at close; not blocker

---

## 9. Commit Plan

- **Commit 1:** `fix(crm): wire coupon send button to dispatch email + sms via send-message EF` — the rewrite of `toggleCoupon` + any helper.
- **Commit 2 (may be absorbed into Commit 1):** `docs(crm): close OPEN_ISSUES #10 (coupon send wiring) + COUPON_SEND_WIRING retrospective`.

Push after final commit.

---

## 10. Dependencies / Preconditions

- Commit `aa89573` landed (UI fix) ✓
- Commit `f621b49` landed (templates on demo) ✓
- Test event exists on demo with a non-null `coupon_code` — executor MUST verify at Step 1 pre-flight. If no test event has a coupon_code, stop and ask Daniel to set one before proceeding.
- Test attendee row exists (e.g., דנה כהן 053-788-9878 from screenshot, row shows status "הגיע" and coupon=שלח).
- CrmMessaging (`modules/crm/crm-messaging-send.js`) is loaded in the CRM page context (it is — already used by other flows).
- Approved test phone: `0537889878` (Daniel's primary test line) and `0503348349`. Per memory `feedback_test_phone_numbers.md`, NO other phones allowed for demo tests.

---

## 11. Lessons Already Incorporated

From recent FOREMAN_REVIEWs:

- **CRM_HOTFIXES Proposal 1 (runtime state verification at author time)** → APPLIED. Verified at author time: `crm_events.coupon_code` schema, `crm_event_attendees` schema, `sendMessage` signature, templates exist in DB with 7 vars each.
- **CRM_HOTFIXES Proposal 2 (Expected Final State lists ALL modified files)** → APPLIED. §8 enumerates exactly one modified file + 2 retrospective files.
- **SHORT_LINKS Proposal 1 (line-count projection)** → APPLIED. `crm-event-day-manage.js` is currently well under 350 (executor confirmed by editing it last session); +50 lines should keep it clean. §4 autonomy says STOP if it exceeds.
- **SHORT_LINKS Proposal 2 (rollback plan mandatory)** → APPLIED. §6.
- **INTEGRITY_GATE_SETUP Proposal 1 (precondition-drift check)** → APPLIED via §10 explicit verify of `coupon_code` on test event.
- **WORKING_TREE_RECOVERY Proposal 1 (env-parity check)** → APPLIED. Author-side schema verification done against the live DB the executor will hit.
- **EVENT_CONFIRMATION_EMAIL Proposal 2 (feature-existence grep)** → APPLIED. No existing coupon-dispatch function — verified.

### Cross-Reference Check (Rule 21)

| New name | Exists already? | Resolution |
|----------|-----------------|------------|
| `dispatchCouponMessages` helper (if added) | No | Safe. Single use-site, keep in same file. |
| Template slug `event_coupon_delivery` | Yes, inserted `f621b49` | Re-use, don't re-create. |
| `%coupon_code%` var | Yes, in `CRM_TEMPLATE_VARIABLES` | Re-use. |
| `%lead_id%` var | Yes, standard var | Re-use. |

**Cross-Reference Check completed 2026-04-24: 0 collisions.**

---

## 12. QA Protocol (detailed)

After code is committed and pushed:

1. **Demo tenant login.** Open `/crm.html` → Events tab → open the test event (SuperSale טסט #3 per screenshot).
2. **Event Day mode.** Click "מצב יום אירוע".
3. **Find דנה כהן row** (053-788-9878). Status should be "הגיע" from prior visits; coupon column shows "שלח" button.
4. **Click "שלח"** on the coupon column.
5. **Expected — success path:**
   - Toast appears: "הקופון נשלח ב-SMS ו-Email" (or similar)
   - SMS arrives at 0537889878 within 30 seconds, body matches template, all vars substituted
   - Email arrives at the attendee email on file (test lead's email), subject starts with "הקופון האישי שלך", QR image renders in the body
   - DB check: `SELECT coupon_sent, coupon_sent_at FROM crm_event_attendees WHERE id = '<attendee_id>'` → true, timestamp recent
   - `crm_message_logs` has 2 new rows (1 sms, 1 email, both status='sent')
6. **Re-click "שלח" on the same row.** Expected: confirm dialog. Cancel → no action. Confirm → re-sends (or however the executor decides — but UX must prevent silent re-send).
7. **Decode QR from email** — use any QR reader. Expected: decodes to a UUID matching the attendee's `lead_id`.

If ANY step fails, log as finding and don't mark SPEC closed.

---

*End of SPEC. Hand to opticup-executor.*
