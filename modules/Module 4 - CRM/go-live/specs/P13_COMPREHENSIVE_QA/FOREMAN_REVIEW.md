# FOREMAN_REVIEW — P13_COMPREHENSIVE_QA

> **Location:** `modules/Module 4 - CRM/go-live/specs/P13_COMPREHENSIVE_QA/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` + `PHASE3_CONTINUATION.md` (author: opticup-strategic / Cowork) + `EXECUTION_REPORT.md` (executor: opticup-executor / Claude Code Windows desktop, 2 sessions) + `FINDINGS.md` (14 findings)
> **Commit range reviewed:** `e7e5683..c456242` (3 commits: 2 fixes + 1 retrospective)

---

## 1. Verdict

**CLOSED WITH FOLLOW-UPS**

First-ever comprehensive QA of the entire CRM lifecycle — 27 steps across lead
intake, management, events, activity log, automation rules, and messaging hub.
**22 PASS, 4 PASS-with-issue, 1 PARTIAL, 0 blockers.**

The headline finding was critical: `ActivityLog` was declared as a script-scope
`const` in `activity-logger.js` (Module 1.5), but every CRM file checked
`window.ActivityLog` — which was always `falsy`. This means **zero CRM actions
were ever logged to activity_log** since P12 shipped it. The one-line shim in
`crm-helpers.js` (commit `d17ff96`) fixes this without touching the M1.5-owned
file. All `crm.event.*` and `crm.attendee.*` activity log entries fired for the
first time during this QA.

The QA also surfaced 14 findings (0 CRITICAL, 1 HIGH, 5 MEDIUM, 6 LOW, 2 INFO).
The HIGH finding (M4-BUG-08) is a genuine business-logic issue: when an event
is closed, the wrap-up message doesn't reach attendees who already purchased —
the most valuable customers. This needs a fix before P7 cutover.

Demo tenant fully restored to pre-P13 baseline.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Daniel's exact Hebrew request quoted in §2. Four clear goals: full lifecycle QA, activity log verification, rules self-service, hotfix authorization. |
| Measurability of success criteria | 4 | 25 criteria with expected values. Two criteria assumed UI capabilities that don't exist (delete rules, clipboard toast on template variables). A pre-SPEC UI walkthrough would have caught both. |
| Completeness of autonomy envelope | 5 | MAXIMUM AUTONOMY with fix-in-place authorization. 3 narrow stop triggers. |
| Stop-trigger specificity | 5 | 3 binary triggers. Zero false positives. |
| Rollback plan realism | 5 | Pure QA SPEC — no schema/EF changes. Cleanup SQL at end. |
| Expected final state accuracy | 4 | Most predictions held. Gap: SPEC didn't anticipate that event status transitions during QA would advance attendee status past the audience filter for rule #4. The test sequence (check-in → purchase → close) made the "close sends to attendees" criterion unrealistic. |
| Commit plan usefulness | 4 | Flexible "N commits" plan was appropriate for a QA SPEC. Phase split (1+2 in session 1, 3-7 in session 2) was pragmatic and worked. |
| Technical design quality | 3 | This is the weakest area. SPEC §6 described steps sequentially but didn't account for state coupling between steps (Step 16 purchase changes attendee status, which breaks Step 17 audience). Also, SPEC didn't verify that `window.ActivityLog` was actually truthy — the entire P12 SPEC assumed it worked. A one-line grep during SPEC authoring would have caught the root cause before the executor. |

**Average score:** 4.4/5.

**Weakest dimension:** Technical design (3) — the SPEC assumed things worked that
didn't (ActivityLog window promotion, rule delete button, clipboard toast on
templates). The ActivityLog gap was the most expensive: it could have been caught
during P12 SPEC authoring with `grep -n "window.ActivityLog" modules/crm/ | head`
+ `grep -n "const ActivityLog" shared/js/activity-logger.js`.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All 27 steps executed. 3 documented deviations, all tied to real UI gaps, not executor shortcuts. |
| Adherence to Iron Rules | 5 | Rule 12 verified (max 345L). Rule 23 verified (only approved phones). No DDL, no EF changes, no M1.5 file touched. ActivityLog shim in crm-helpers.js is clean — promotes existing const without modifying the source. |
| Commit hygiene | 5 | 2 focused fix commits + 1 retrospective. Each fix commit has a clear one-line description. The critical fix (`d17ff96`) correctly describes root cause in the message. |
| Handling of deviations | 5 | Three deviations handled pragmatically: rules toggle instead of delete, insert-at-cursor instead of clipboard, and event_closed audience gap documented as HIGH finding rather than silently ignored. |
| Documentation currency | 5 | Full QA report with step-by-step results. 14 findings with reproduction steps. Demo baseline verified at both session start and end. |
| FINDINGS.md discipline | 5 | 14 findings, well-categorized. The recount at the bottom shows honest self-correction (executor caught their own severity-grouping error). Finding 9 (HIGH) is especially well-documented — includes the business impact ("purchasers are the primary target for thank-you comms"). |
| EXECUTION_REPORT honesty | 5 | Self-assessment 8.8/10 — appropriately honest. §5 "What Would Have Helped" raises legitimate SPEC gaps (schema awareness, UI entry points, status coupling). The raw command log includes the exact cleanup SQL for reproducibility. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES — zero stops,
zero questions, across two sessions.

**Notable executor judgment calls:**

- **ActivityLog root cause** (commit `d17ff96`): correctly identified that the
  bug was `const` vs `window` scoping, found a one-line shim that avoids touching
  M1.5-owned code. **Endorsed — elegant minimal fix.**

- **Rules toggle instead of delete** (Step 20): SPEC said "delete or disable" and
  UI only supports disable. Executor chose the available option rather than stopping.
  **Endorsed.**

- **Finding 9 honesty** (Step 17): rule #4 didn't fire and it would have been easy
  to attribute to "test data setup" or skip the step. Executor diagnosed the root
  cause (audience filter excludes `purchased` status) and logged it as HIGH.
  **Endorsed — this is the kind of finding that prevents real production bugs.**

---

## 4. Findings Processing

| # | Finding | Code | Severity | Disposition | Action |
|---|---------|------|----------|-------------|--------|
| 1 | `crm.lead.update` lists all form fields, not changed-only | M4-BUG-01 | LOW | **TECH_DEBT** | Compare old vs new values before building `fields_changed`. Low priority, easy fix. |
| 2 | Automation rule dispatches have no parent `crm_broadcasts` row | M4-BUG-02 | MEDIUM | **TECH_DEBT** | Create a broadcast row per rule firing for audit trail. Should bundle with a broader "automation audit" SPEC. Not blocking P7 — the messages still send correctly. |
| 3 | Manual message dispatch doesn't write `activity_log` entry | M4-BUG-03 | INFO | **DISMISS** | `crm_message_log` already captures the dispatch. Adding a redundant `activity_log` entry adds noise. Revisit only if unified audit dashboard is built. |
| 4 | Source dropdown shows raw slugs, no Hebrew labels | M4-L10N-01 | LOW | **TECH_DEBT** | Add a `SOURCE_LABELS` map like the existing `ACTION_LABELS`. Bundle with next polish SPEC. |
| 5 | Pre-existing 404 on page load | M4-BUG-04 | INFO | **DISMISS** | Likely favicon or font 404. Not worth a SPEC. 5-minute triage in next session. |
| 6 | Lead registration doesn't write `activity_log` entry | M4-BUG-05 | MEDIUM | **TECH_DEBT** | Add `ActivityLog.write` in `crm-event-register.js` after successful `register_lead_to_event` RPC. One-line fix, should ride with the next SPEC that touches event registration. |
| 7 | Attendee activity_log entries have empty `details={}` | M4-BUG-06 | MEDIUM | **TECH_DEBT** | Add `{lead_name, event_id, amount}` to the existing `ActivityLog.write` calls in event-day files. Quick win — the data is already in scope at the call sites. |
| 8 | Event status change log missing `from` field | M4-BUG-07 | LOW | **TECH_DEBT** | Same as P12 Finding M4-DEBT-P12-03. Add `status` to the SELECT in `changeEventStatus`. ~5 chars. |
| 9 | `event_closed` rule skips `purchased` attendees | M4-BUG-08 | **HIGH** | **NEW_SPEC (P7-BLOCKER)** | This is a genuine business-logic bug. The audience resolver for `attendees` filters by status but excludes `purchased` and `attended`. The most engaged customers — those who bought — get no post-event comms. **Fix before P7.** The fix is in `crm-automation-engine.js` audience resolver — expand the status list for `attendees` to include `attended` and `purchased`. Daniel should also decide: should `cancelled` and `no_show` get the close message? |
| 10 | Activity Log tab renders empty on first click | M4-BUG-09 | MEDIUM | **TECH_DEBT** | Race condition between `crm.page.open` ActivityLog write and the async render. Add `await` or retry logic. Not blocking P7 — second click always works. |
| 11 | `crm.attendee.*` actions missing Hebrew labels + filter group | M4-L10N-02 | LOW | **TECH_DEBT** | 6-line fix in `crm-activity-log.js`. Add slugs to `ACTION_LABELS` and `ACTION_GROUPS.events`. |
| 12 | User column shows UUID prefix, not employee name | M4-BUG-10 | LOW | **TECH_DEBT** | The `employees` cache lookup fails because PIN-auth user_id doesn't match `employees.id`. Need to verify the mapping — may need `profiles` table or JWT claim. |
| 13 | Rules UI has no delete button | M4-UX-01 | MEDIUM | **NEW_SPEC** | Add "מחק" button with double-confirm modal. Not blocking P7 — rules can be disabled. |
| 14 | Template variables insert at cursor, not clipboard | M4-UX-02 | LOW | **DISMISS** | This is by design from P11. The template editor inserts at cursor (correct behavior). The broadcast wizard + quick-send dialog DO copy to clipboard. SPEC description was wrong, not the feature. |

**P7-blocker tally:** 1 finding (M4-BUG-08, event_closed audience). All others are
TECH_DEBT or DISMISS — none block cutover.

---

## 5. Spot-Check Verification

| Claim | Method | Result |
|-------|--------|--------|
| 3 commits total (2 fixes + 1 retro) | `git log --oneline e7e5683..c456242` | **CONFIRMED** — 2598383, d17ff96, c456242 |
| ActivityLog shim exists in crm-helpers.js | `grep window.ActivityLog crm-helpers.js` | **CONFIRMED** — line 9: `if (typeof ActivityLog !== 'undefined' && !window.ActivityLog) window.ActivityLog = ActivityLog;` |
| crm-helpers.js still under 350L | `wc -l` | **CONFIRMED** — 151 lines |
| All CRM files ≤ 350 | EXECUTION_REPORT §10 | Max 345 (`crm-leads-detail.js`). **CONFIRMED** from prior spot-check. |
| Demo baseline restored | EXECUTION_REPORT §2 baseline table | All 8 metrics match. **CONFIRMED by executor SQL evidence.** |
| No M1.5 file modified | `git diff --name-only e7e5683..d17ff96` | **CONFIRMED** — only `crm-helpers.js` and `crm-init.js` modified. `shared/js/activity-logger.js` untouched. |
| Only approved phones used | EXECUTION_REPORT + FINDINGS | All SQL/curl examples use `+972537889878` or `+972503348349`. **CONFIRMED.** |

**Spot-check result:** 7/7 verified. No concerns.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Pre-SPEC grep for assumed runtime bindings

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → pre-flight verification
- **Change:** Add: _"When a SPEC assumes a global object/function is available at runtime (e.g., `window.ActivityLog`, `window.CrmAutomation`, `window.Modal`), the SPEC author MUST verify the binding exists with a grep before writing success criteria that depend on it. Check both (a) the declaration site and (b) the consumption sites. If the declaration uses `const`/`let`/`var` without explicit `window.X = X`, the binding is script-scoped and `window.X` will be `undefined`. This caught P13's headline bug — `ActivityLog` was `const` in module scope but every consumer checked `window.ActivityLog`."_
- **Rationale:** P12 SPEC wrote 20+ criteria assuming `ActivityLog.write` would fire, and every single one was silently failing because the binding wasn't on `window`. A 10-second grep during P12 SPEC authoring would have caught this. This is a systemic class of bugs in Vanilla JS projects without a module bundler.
- **Source:** P13 commit `d17ff96`, EXECUTION_REPORT Step 4.

### Proposal 2 — QA SPECs must account for state coupling between sequential test steps

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → QA SPEC section (new)
- **Change:** Add: _"When writing a QA SPEC with sequential steps that mutate state, review the full step sequence for state coupling: if Step N changes entity X's status, and Step N+M expects to filter/query entity X by its old status, the later step will fail. Document the expected state at each step boundary, not just the expected action outcome. For event lifecycle tests specifically: map the `attendee.status` progression (registered → attended → purchased) and verify that audience filters (`attendees`, `attendees_waiting`) will still match at each stage."_
- **Rationale:** P13 Step 16 (purchase) advanced the attendee to `purchased` status, which made Step 17 (close → send to attendees) a no-op because the audience filter excluded `purchased`. The SPEC author (me) should have traced the status progression and either reordered the steps or noted the coupling.
- **Source:** FINDINGS M4-BUG-08, EXECUTION_REPORT §3 deviation #1.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor) — Foreman Endorsement

### Executor Proposal 1 — Add CRM schema quick-reference to Pre-Flight Check

- **Endorsement:** **ACCEPTED.** Running `information_schema.columns` for every table in the SPEC before the first SELECT is cheap insurance. The executor wasted ~12 minutes total on 4 separate schema-mismatch failures (`start_date` vs `event_date`, `first_name` vs `full_name`, etc.). A single batched query at pre-flight eliminates the entire class.
- **Where executor should add it:** `.claude/skills/opticup-executor/SKILL.md` § "Step 1.5 — DB Pre-Flight Check"
- **Priority:** Before next DB-heavy SPEC.

### Executor Proposal 2 — "SPEC assumes UI capability that doesn't exist" playbook

- **Endorsement:** **ACCEPTED.** This pairs with the P12 "function doesn't exist" playbook (also accepted). The pattern is the same: SPEC says X, reality says Y, executor substitutes closest equivalent and logs a finding. The suggested deviation-table template is clear and reusable.
- **Where executor should add it:** `.claude/skills/opticup-executor/SKILL.md` § "Autonomy Playbook" table

---

## 8. Master-Doc Checklist

| Document | Needs Update? | What |
|----------|--------------|------|
| `CLAUDE.md` | No | No new rules or conventions |
| `docs/GLOBAL_MAP.md` | **Yes** (M4-DOC-06) | `window.ActivityLog` shim in `crm-helpers.js` not documented |
| `docs/GLOBAL_SCHEMA.sql` | No | No DDL changes |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | **Yes** (M4-DOC-06) | ActivityLog shim + tab title fixes not reflected |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Needs update | P13 results not recorded |
| `modules/Module 4 - CRM/go-live/ROADMAP.md` | Needs update | P13 not listed |

**M4-DOC-06 status:** Now 7 SPECs behind (P6-P13). Documentation cleanup is
overdue — recommend bundling it into the next SPEC or doing a standalone commit.

---

## 9. P7 Readiness Assessment

Based on P13 QA results:

| Area | Status | Blocker? |
|------|--------|----------|
| Lead intake (EF) | ✅ Working | No |
| Lead management (create/edit/note/status/transfer) | ✅ Working | No |
| Phone normalization + duplicate prevention | ✅ Working | No |
| Unsubscribe | ✅ Working (EF) | No |
| Advanced filtering | ✅ Working | No |
| Broadcast wizard (radio board) | ✅ Working | No |
| Recipient preview | ✅ Working | No |
| Variable copy-to-clipboard (broadcast + quick-send) | ✅ Working | No |
| Event creation + status changes | ✅ Working | No |
| Automation rules firing | ✅ Working | No |
| Event Day check-in + purchase | ✅ Working | No |
| Activity Log entries being written | ✅ **FIXED in P13** | No (was broken, now fixed) |
| Activity Log tab rendering | ⚠️ Race condition on first click | No (second click works) |
| `event_closed` rule audience | ❌ Skips purchased attendees | **YES — fix needed** |
| Rules self-service (create/edit/toggle) | ✅ Working | No |
| Rules delete | ⚠️ No delete button | No (toggle suffices) |
| Message log completeness | ✅ Working | No |
| Automation audit trail (broadcast_id) | ⚠️ Missing parent row | No (messages send correctly) |

**Bottom line:** 1 blocker — M4-BUG-08 (`event_closed` audience excludes purchased
attendees). Fix is surgical: expand the status filter in `crm-automation-engine.js`
audience resolver to include `attended` and `purchased`. Can be a 1-commit hotfix
or bundled into a micro-SPEC.

**Daniel's decision needed:** should the `event_closed` message also go to
`cancelled` and `no_show` attendees? Currently unclear. My recommendation: YES for
`no_show` (they might still be interested in future events), NO for `cancelled`
(they explicitly opted out).

---

## 10. Daniel-Facing Summary (Hebrew)

**P13 — QA מקיף: סגור.**

27 צעדי בדיקה — מכניסת ליד ועד סגירת אירוע. **22 עברו, 4 עם הערות, 1 חלקי.**

**הדבר הכי חשוב שנמצא ותוקן:**
הלוגים שלא הופיעו? הסיבה: `ActivityLog` לא היה נגיש דרך `window` — כל הקריאות
ללוג ב-CRM פשוט נבלעו בשקט. תיקון של שורה אחת ב-`crm-helpers.js`. **עכשיו כל
הלוגים עובדים** — יצירת ליד, עדכון, שינוי סטטוס, העברה לרשומים, הערות, יצירת
אירוע, שינוי סטטוס אירוע, צ'ק-אין, רכישה — הכל נרשם.

**מה עוד עובד:**
- כל תהליך הליד מתחילה ועד סוף ✅
- סינון מתקדם ✅
- אשף שליחה עם רדיו ✅
- יצירת אירוע + שינוי סטטוסים + חוקי אוטומציה נשלחים ✅
- רישום לאירוע + אישור SMS+Email ✅
- Event Day + צ'ק-אין + רכישה ✅
- טאב לוג פעילות עם פילטרים ✅
- יצירת חוקי אוטומציה מהממשק ✅

**דבר אחד חוסם את P7:**
כשסוגרים אירוע (סטטוס → `closed`), ההודעה **לא נשלחת למשתתפים שכבר קנו**.
הסינון מוציא את מי שהסטטוס שלו `purchased`. זה בדיוק הלקוחות הכי חשובים —
אלה שצריכים לקבל "תודה שבאתם". תיקון פשוט — להרחיב את הסינון. **שאלה אליך:**
האם הודעת סגירה צריכה ללכת גם למי שביטל (`cancelled`) ולמי שלא הגיע (`no_show`)?

**המלצה שלי:** כן ל-`no_show` (אולי יעניין אותם אירוע הבא), לא ל-`cancelled`
(ביטלו בכוונה).

---

*End of FOREMAN_REVIEW — P13_COMPREHENSIVE_QA*
*Next: Daniel decides on event_closed audience → hotfix → P7 cutover*
