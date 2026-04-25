# QA_FOREMAN_RESULTS — M4_EVENT_DAY_PARITY_FIX (+ F1 verify)

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_EVENT_DAY_PARITY_FIX/QA_FOREMAN_RESULTS.md`
> **Run by:** opticup-executor (Claude Code, Windows desktop) on behalf of opticup-strategic (Foreman)
> **Run date:** 2026-04-25 (afternoon → evening)
> **Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
> **URL under test:** `http://localhost:3000/crm.html?t=demo`
> **Phone allowlist enforced:** ✅ 0537889878 + 0503348349 only — 0 unauthorized dispatches
> **Commits under test:** `65c0a26` (parity + coupon fix) → `9b8215e` (retrospective) → `55cdbed` (F1 fix `event_time → start_time`)

---

## Recommended Verdict

🟢 **CLOSED — 8/8 paths PASS, 0 FAIL, 0 PARTIAL.**

All §3 criteria from SPEC verified live. F1 finding from the retrospective was patched in `55cdbed` before QA started; this run confirms the patch is correct (0 console 400s from the fixed call, 48h refund rule actually fires for the first time since SPEC #2 shipped).

The single console 400 observed in QA is the pre-existing `/employees?select=id,full_name` 400 from the activity-log tab (logged in prior QA reports as unrelated — independent of this SPEC).

---

## Pre-QA Baseline & Drift Note

| Metric | Value |
|---|---|
| Total attendees | 13 ✓ |
| Per-status (start of QA) | paid:1, pending_payment:11, refund_requested:1 ⚠️ |
| Action taken | Reset Dana #10 (`10b6a739`) `refund_requested → pending_payment` to restore §10.2 baseline before Path 1 ✓ |
| Per-status (after pre-QA reset) | paid:1, pending_payment:12 ✓ |
| Future events with `end_time` | 5 (WLDF_QA, POST_WL_FIXES_QA, WAITING_LIST_QA, טסט 123, SuperSale) |
| Past events with `end_time` | 4 with status='closed'/'completed' (TESTTT1323, P5.5, TEST222, WAITING_LIST_QA, SuperSale) + 1 status='registration_open' but past end_time today (TEST333) |
| `crm_message_log` rows in last 5min before QA | 0 |
| Integrity gate at start | ✅ clean (3 files scanned) |

**Drift cause (forensic):** Dana #10 was at `refund_requested` (timestamp 17:32:38) — a stray click during F1 verification on the executor side, not from the prior parity-fix QA cleanup. Reset cleanly with one UPDATE before Path 1. No data loss; baseline matches §10.2 perfectly.

---

## Path-by-Path Results

### Path 1 — Pre-flight ✅ PASS

`SELECT count(*)`: 13 attendees ✓. Per-status (post-drift-reset): `paid:1, pending_payment:12` ✓. Future events with end_time present ✓. Past + closed events present ✓.

### Path 2 — Click pill opens action modal ✅ PASS

- `grep -rn "data-toggle-fee" modules/crm/` → **0 hits in source** ✓.
- DOM: `[data-toggle-fee]` count → **0** ✓.
- DOM: `[data-pay-attendee-id]` count → **2** (one per attendee in WLDF_QA) ✓.
- Click on Daniel's pill (`5843fc89`) → action modal opens with 4-button matrix.
- Buttons visible for `pending_payment`: `["סמן שולם","מגיע החזר"]` (matches `allowedActions('pending_payment') = [mark_paid, mark_refund_requested]`).
- Headers: `["שם","טלפון","סטטוס","רכישה","קופון","תשלום"]` — "תשלום" present (not "דמי הזמנה").

### Path 3 — Full action chain from event-day ✅ PASS

Subject: Daniel Secondary `5843fc89` on WLDF_QA event #10 (allowlisted phone — but every "סמן שולם" had checkbox unchecked, so 0 dispatch in Path 3).

| Action | Result | Pill after |
|---|---|---|
| pending_payment → click "מגיע החזר" | `refund_requested_at` set | "מבוקש החזר" |
| refund_requested → click "סמן הוחזר" | `refunded_at` set | "הוחזר" |
| _(SQL Level 2 reset to pending_payment)_ | clean state | "ממתין לתשלום" (after page reload) |
| pending → click "מגיע החזר" | `refund_requested_at` set | "מבוקש החזר" |
| refund_requested → click "פתח קרדיט" with default date | `credit_expires_at = '2026-10-25'` (today + 6 months exact) | "קרדיט פתוח" |

Bell anchor visible after each action ✓ (badge increments since Daniel moved to credit_pending).

After each action the table re-rendered with the new pill via `refreshAttendeeRow` (the `opts.onAfterAction` callback added in commit `65c0a26`).

### Path 4 🔴 — Coupon 3-state, future event ✅ PASS

Subject: Daniel Secondary `5843fc89` on WLDF_QA (event_date 2026-05-20, status='invite_new'). Phone `+972503348349` ✅ allowlisted.

| State | Action | Pill / Cell | Color |
|---|---|---|---|
| coupon_sent=false | (initial) | "שלח" button | n/a |
| Click "שלח" → dispatch fired | After 4.5s | "📨 נשלח" | bg-sky-100 ✓ |
| _(SQL: set checked_in_at=NOW())_ | reload + re-render | "✓ הגיע" | bg-emerald-100 ✓ |

`crm_message_log` (last 5 min after dispatch):

| id | channel | template_id | status | error | recipient |
|---|---|---|---|---|---|
| `d0147e4e` | sms | `784cdf1c` | sent | null | +972503348349 ✅ allowlist |
| `e22cb56d` | email | `4d42b03f` | sent | null | danylis92@gmail.com ✅ Daniel's email |

**0 dispatches to non-allowlisted phones.**

Cross-check: Dana #10 (`10b6a739`) on the same event already had `coupon_sent=true` from a pre-QA dispatch earlier in the day; her pill at start of QA was already "📨 נשלח" sky — independent confirmation that the future-event-with-coupon-no-checkin path renders the new sky pill (the original Daniel-reported "16:59:40 bug" is now visibly fixed).

### Path 5 — Coupon, past event ✅ PASS (both branches)

#### 5A — Status branch (`status='closed'`)

Subject: Dana on TESTTT1323 (`e97f7d01`). Event date 2026-04-25 (today), end_time 14:00, **status='closed'**.

- `eventEnded(ev)` returned `true` via the status-first check.
- Coupon cell: **"⚠️ לא הגיע"** with `bg-amber-100` ✓ (NOT "📨 נשלח" — correct because event is closed).

#### 5B — Time branch (status NOT closed/completed but end_time past)

Subject: Dana on TEST333 (`380ad445`). Event date 2026-04-25 (today), end_time 14:00 (past — current time ~17:55), **status='registration_open'**.

- `eventEnded(ev)` returned `true` via the end_time fallback.
- Coupon cell: **"⚠️ לא הגיע"** with `bg-amber-100` ✓ (NOT "📨 נשלח" — correct because end_time is past).

Unit-tests of `eventEnded` (helper called directly with synthetic inputs) — all 6 cases passed:

| Input | Expected | Actual |
|---|---|---|
| TEST333 (today open, past end_time) | true | ✅ true |
| TESTTT1323 (today closed) | true | ✅ true |
| TEST222 (tomorrow closed) | true | ✅ true |
| SuperSale (future completed) | true | ✅ true |
| טסט 123 (future open) | false | ✅ false |
| WLDF_QA (far-future invite_new) | false | ✅ false |

### Path 6 — Backward compat ✅ PASS

Tab cycle (10 entries: full 9 tabs → return to dashboard) — bell anchor + `#crm-bell-btn` present in **all 10 stops** ✓ (no regression of the bell-persist fix from `46e9877`).

| Surface | Result |
|---|---|
| event-detail action modal opens via attendee click | ✅ |
| Bell anchor persists across all tabs | ✅ |
| Tier 2 amber highlight in leads | ✅ negative case (no credit_pending leads currently in cleaned baseline; positive path verified in earlier QA `9e76835`) |
| Templates editor (`📝 תבניות`) opens with sidebar | ✅ |
| Automation rules editor (`⚡ כללי אוטומציה`) opens with 83 rule rows | ✅ |
| Console 400s | 1 — pre-existing `/employees?select=id,full_name` 400 (NOT new); reqid 4179. Tracked as out-of-scope in prior QA reports. |
| Console 400s related to this SPEC | **0** ✅ |

### Path 7 — Final cleanup ✅ PASS

```sql
UPDATE crm_event_attendees
   SET payment_status='pending_payment', paid_at=NULL, refund_requested_at=NULL,
       refunded_at=NULL, credit_expires_at=NULL, credit_used_for_attendee_id=NULL,
       coupon_sent=false, coupon_sent_at=NULL, checked_in_at=NULL
 WHERE tenant_id='8d8cfa7e-…' AND id='5843fc89-b4c9-4d97-abe3-d334af24247e';
```

Final per-status:

| payment_status | count |
|---|---|
| paid | 1 |
| pending_payment | 12 |

Exactly matches §10.2 baseline.

```
$ npm run verify:integrity
All clear — 3 files scanned in 2ms (Iron Rule 31 gate)

$ git status --short
 M docs/guardian/DAILY_SUMMARY.md       (pre-existing)
 M docs/guardian/GUARDIAN_ALERTS.md     (pre-existing)
 M docs/guardian/GUARDIAN_REPORT.md     (pre-existing)

$ git log origin/develop..HEAD --oneline
(empty — all 3 SPEC commits already pushed)

$ grep -c "cdn.tailwindcss.com" crm.html
1
```

No QA-created leads (didn't need to — Daniel Secondary lead already on demo). No deletes performed.

### Path 8 — F1 fix verification (NEW) ✅ PASS

**1. Console clean** — opening action modal on Daniel: **0 × 400 errors from `/crm_events?select=…`** (was 10× before `55cdbed`).

**2. 48h rule live test:**

| Subject | Event | Hours from now (start) | Refund button state |
|---|---|---|---|
| Daniel on WLDF_QA | 2026-05-20 09:00, far-future, status='invite_new' | ~601h | ✅ enabled, `bg-amber-500`, no tooltip |
| Dana on TEST333 | 2026-04-25 09:00, **today, ~9h ago**, status='registration_open' | negative (already past) | ✅ disabled, `bg-slate-200 text-slate-500 cursor-not-allowed`, tooltip "עברו 48 שעות — לא ניתן לבטל ללא אישור מיוחד" |

This is the **first time** the 48h rule has visibly fired since SPEC #2 shipped. Before `55cdbed` the helper read `event.event_time` (column doesn't exist) → always returned `null` → permissive default `true` → button was always enabled regardless of date.

**3. Network verify** — `crm_events` SELECT (reqid 4188) inside the QA run uses the new column list:

```
GET /rest/v1/crm_events?select=id,name,event_date,start_time,end_time,status,location_address&id=eq.…
→ 200 OK
```

✓ Both `start_time` and `end_time` are now in the SELECT, plus `status` (defensively added in `55cdbed`'s second-line edit, justified in the F1 commit message).

---

## Iron Rule self-audit

| Rule | Status | Notes |
|---|---|---|
| 1 (atomic) | N/A | No quantity changes. |
| 2 (writeLog) | ✅ | Each transition still logs via helpers. |
| 7 (DB helpers) | ⚠️ | `refreshAttendeeRow` uses `sb.from()` — same pre-existing CRM module pattern. Not a regression. |
| 8 (escapeHtml) | ✅ | Pill button uses `escapeHtml(r.id)` in `data-pay-attendee-id`. |
| 12 (≤350) | ✅ | crm-event-day-manage.js: 346, crm-payment-helpers.js: 272. |
| 14/15 (tenant_id+RLS) | ✅ | All UPDATEs filter `tenant_id`. |
| 21 (no orphans) | ✅ | `toggleFee` deleted entirely; pre-commit hook passed for all 3 SPEC commits. |
| 22 (defense-in-depth) | ✅ | SELECT filters on tenant_id. |
| 23 (no secrets) | ✅ | None added. |
| 31 (integrity gate) | ✅ | Clean at start AND end. |

---

## Findings to Process

| # | Severity | Status | Finding |
|---|---|---|---|
| F1 (from retrospective) | HIGH | ✅ **RESOLVED in `55cdbed`** | `event_time` column reference in helpers.js — both lines fixed; QA confirms 0 × 400 + 48h rule now active. |
| F2 (from retrospective) | LOW | OPEN | `eventEnded()` hardcoded `+03:00` offset (DST-blind). Edge case for Nov-Feb events lingering past end_time without status flip. |
| F3 (from retrospective) | INFO | OPEN | `_eventStartDate` may surface latent UX once F1 lands — verified post-fix that 48h rule now activates correctly; INFO closed. |
| F4 (NEW, this QA) | INFO | OPEN | Pre-QA drift detected: Dana #10 was at `refund_requested` from a stray F1-verify click after the parity-fix retrospective. Suggests a small executor improvement: when running a QA-protocol that requires a baseline, run a Path-0 baseline-check + auto-reset BEFORE Path 1 to absorb verification-side drift cleanly. |

---

## Additional Observation (out-of-paths)

- **Pre-existing 400 (`/employees?select=id,full_name`)** still observed in network log when activity-log tab loads. Same as documented in prior `M4_ATTENDEE_PAYMENT_UI` QA. Out of scope here.
- **`crm-event-day-manage.js` Rule 12 soft warning** (file at 347 per pre-commit hook count, 346 per `wc -l`). The discrepancy is consistent — a 1-line difference between the hook's tokenizer and `wc -l` (likely trailing newline handling). Both well under the 350 hard cap.

---

## Summary

**8/8 PASS, 0 FAIL, 0 PARTIAL.** Recommended verdict: 🟢 **CLOSED**.

Both fixes from `65c0a26` work end-to-end:
- Parity: event-day-manage now has the same payment management UX as event-detail (4-button modal, refund/credit/etc.).
- Coupon 3-state: "📨 נשלח" sky pill displays correctly while event is active; "⚠️ לא הגיע" amber only after event ends (status OR time).

F1 fix in `55cdbed` activates the 48h refund rule for the first time — the rule is now firing visibly (disabled + tooltip on past events; enabled on far-future events).

Demo state restored to baseline (paid:1, pending_payment:12). Repo clean except pre-existing guardian docs. 0 unauthorized SMS dispatched throughout the entire QA run.

---

*End of QA_FOREMAN_RESULTS.md.*
