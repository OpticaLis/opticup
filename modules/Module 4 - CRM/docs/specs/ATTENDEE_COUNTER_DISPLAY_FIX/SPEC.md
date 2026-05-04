# SPEC — ATTENDEE_COUNTER_DISPLAY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/ATTENDEE_COUNTER_DISPLAY_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-04
> **Module:** 4 — CRM
> **Phase:** Pre-cutover stabilization (no phase letter — discrete display-layer hotfix)
> **Author signature:** Claude Code Opus 4.7 (Windows desktop session, 2026-05-04)

---

## 1. Goal

Fix the "נרשמו" counter in the CRM so it counts only attendees with status `registered`, `confirmed`, or `attended` — **not** `invited`, `new`, `waitlist`, `waiting_list`, `cancelled`, `no_show`, or any other status. Apply the fix to all 4 places the counter renders. Pure display-layer change — **no DB writes, no view changes, no Edge Function changes**.

---

## 2. Background & Motivation

On 2026-05-04 Daniel verified on the demo tenant that event #11 ("אירוע המותגים טסט") has 1 attendee in status `invited` and 1 in status `new`, with zero attendees in `registered`/`confirmed`/`attended`. The CRM displays "נרשמו 2" — wrong. It should display "נרשמו 0".

The "נרשמו" counter currently sources from `v_crm_event_stats.total_registered`, which the empirical evidence (1 invited + 1 new → counter shows 2) confirms is counting attendees beyond the three statuses that semantically mean "registered for this event." The brief explicitly forbids modifying the view (no DB writes), so the fix is client-side: introduce a single canonical constant `REGISTERED_STATUSES = ['registered','confirmed','attended']` in `modules/crm/crm-helpers.js`, expose a small helper `CrmHelpers.countRegistered(attendees)`, and replace every read of `stats.total_registered` for the "נרשמו" counter at all 4 callsites with the helper.

Cross-cutting context: pre-cutover SPECs (PRE_CUTOVER_QA_A/B/C, M4_PAYMENT_*) are closed; develop is 12 commits ahead of main per Sentinel L-3; cutover Sat/Sun (2026-05-02 or -03) is past — rolling stabilization continues. This SPEC slots into that stabilization stream.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor captures actuals in EXECUTION_REPORT.md §2.

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state at start | On `develop`, working tree clean except pre-existing `__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` (Daniel said leave alone, use selective `git add` by filename) | `git status` |
| 2 | Constant defined | `REGISTERED_STATUSES` array exported on `window.CrmHelpers.REGISTERED_STATUSES` AND on `window.REGISTERED_STATUSES` (mirrors TIER1_STATUSES/TIER2_STATUSES export pattern in crm-helpers.js lines 233–234), value `['registered','confirmed','attended']` | grep + DevTools console: `window.REGISTERED_STATUSES.join(',')` → `registered,confirmed,attended` |
| 3 | Helper defined | `CrmHelpers.countRegistered(attendees)` returns `attendees.filter(a => REGISTERED_STATUSES.indexOf(a.status) !== -1).length` (treat `null`/`undefined` input as 0) | Unit-style sanity in DevTools console (see §13) |
| 4 | Callsites updated | All 4 "נרשמו" callsites use the helper (or a value computed from it), NOT `stats.total_registered` / `s.total_registered` / `r.total_registered` for the נרשמו counter only | `grep -n "total_registered" modules/crm/crm-events-tab.js modules/crm/crm-events-detail.js modules/crm/crm-events-detail-charts.js modules/crm/crm-event-day.js` — any remaining hits must NOT power the נרשמו counter (capacity-bar `cap` math, sparkline trend calc, etc. are allowed to keep using it as a heuristic baseline as long as the displayed "נרשמו" number is computed via the helper). EXECUTION_REPORT must list each remaining hit and explain why it's not the נרשמו counter. |
| 5 | Demo event #11 — events tab list | "נרשמו" column for event #11 row displays `—` (per `formatCount(0)` returning `—`) | Manual browser QA on demo, screenshot in EXECUTION_REPORT |
| 6 | Demo event #11 — event detail KPI sparkline card | "נרשמו" card displays `0` | Manual browser QA on demo, screenshot |
| 7 | Demo event #11 — event detail capacity-bar legend | "נרשמו (0)" in legend; capacity-bar widths recompute correctly (no division-by-zero, no negative widths) | Manual browser QA on demo, screenshot |
| 8 | Demo event #11 — event-day mode counter card | "נרשמו" counter card displays `0` | Manual browser QA on demo, screenshot |
| 9 | Demo event #11 — event detail funnel SVG | First stage "נרשמו" with n=0 either renders empty OR the early-return `if (!reg) { host.innerHTML = ''; return; }` at crm-events-detail-charts.js:83 fires (existing behavior) | Manual browser QA, no console error |
| 10 | Other counters unchanged | "אישרו", "הגיעו", "רכשו" counters and labels unchanged on all 4 screens | Manual browser QA on a non-zero event (pick any other demo event), comparison vs. screenshot baseline |
| 11 | Console clean | 0 errors, 0 warnings on each of the 4 screens during QA | Browser DevTools console |
| 12 | File sizes | All 5 modified files stay ≤ 350 lines (Iron Rule 12 absolute cap). **Critical:** `crm-events-detail.js` is at 349 lines pre-change — net-zero or net-negative delta required there. | `wc -l modules/crm/crm-helpers.js modules/crm/crm-events-tab.js modules/crm/crm-events-detail.js modules/crm/crm-events-detail-charts.js modules/crm/crm-event-day.js` |
| 13 | No DB writes attempted | Zero migrations created, zero `mcp__claude_ai_Supabase__apply_migration` calls, zero `mcp__claude_ai_Supabase__execute_sql` write calls (SELECT-only allowed for live verification of the demo state) | EXECUTION_REPORT §3 declares "no DB writes attempted" — Foreman spot-checks the SQL log if any tool calls were logged. |
| 14 | No EF redeploy | Zero `mcp__claude_ai_Supabase__deploy_edge_function` calls | EXECUTION_REPORT §3 declares "no EF deploys" |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 16 | Pre-commit hooks | Pass (no `--no-verify` permitted) | `git commit` exits 0 |
| 17 | Branch state at end | On `develop`, working tree clean (the campaign-overseer file may STILL be untracked-modified — that's the user's pre-existing state) | `git status` |
| 18 | Pushed to remote | `git log origin/develop..HEAD` returns empty after push | `git push origin develop` then check |
| 19 | Tested on demo only | All manual QA on tenant `demo` (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). Zero clicks/queries against prizma data during this SPEC. | EXECUTION_REPORT §4 declares "demo only — no prizma touches" |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Run read-only SQL on demo (Level 1) to confirm the event-#11 state Daniel described (1 invited + 1 new attendee, zero registered/confirmed/attended) — this is for verification only, not exploration
- Edit the 5 files listed in §8
- Add a single small SELECT query to `crm-events-tab.js loadEvents()` (or alongside it) to fetch attendee statuses-per-event for the events list rows. This query MUST: (a) use `sb.from('crm_event_attendees')` directly (matches existing CRM module pattern, debt M-4 in GUARDIAN_ALERTS — out of scope to refactor here), (b) filter `tenant_id = tid`, `is_deleted = false`, and `.in('status', REGISTERED_STATUSES)`, (c) select only `event_id, status` (minimal columns).
- Add `attendees` parameter to `renderEventDetailKpiSparklines`, `renderEventDetailFunnelSvg`, and pass it from the call-sites in `crm-events-detail.js`
- Pass attendees (or a pre-computed `regCount`) into `renderCapacityBar` as a 3rd argument (or compute `reg` inside it from already-passed data — executor's choice as long as line-count stays net-zero in `crm-events-detail.js`)
- Commit in 1 or 2 logical chunks (executor's choice — see §9)
- Push to develop
- Run any verify script
- Apply executor-improvement proposals from M4_AUTOMATION_ENGINE_SERVER_SIDE FOREMAN_REVIEW that apply (e.g., explicit grep verification of caller counts before claiming changes)

### What REQUIRES stopping and reporting

- ANY DB write attempt — apply_migration, execute_sql with INSERT/UPDATE/DELETE/CREATE/ALTER/DROP, RLS policy changes (Level 3, never autonomous)
- ANY change to `v_crm_event_stats` or any view (out of scope; covered in §7)
- ANY Edge Function deploy
- ANY change to a file outside the 5 listed in §8
- `crm-events-detail.js` exceeds 350 lines after changes
- The events tab list extra-fetch returns rows with `tenant_id` mismatching `getTenantId()` (would imply a multi-tenant leak — Iron Rule 14/15 violation, STOP and report)
- `MASTER_ROADMAP.md`, `MODULE_SPEC.md`, `MODULE_MAP.md`, `db-schema.sql`, `CHANGELOG.md`, `SESSION_CONTEXT.md` need a structural rewrite — flag and ask. Tiny one-line additions to SESSION_CONTEXT and CHANGELOG to record this SPEC are within autonomy.
- The campaign-overseer pre-existing modified file gets touched by accident — STOP, restore, report.
- Any merge to `main` (per CLAUDE.md §9 #7 — only Daniel authorizes)

---

## 5. Stop-on-Deviation Triggers (specific to this SPEC)

In addition to CLAUDE.md §9 globals:

1. **Rule 22 (defense-in-depth) regression**: if the new events-tab fetch query is missing `.eq('tenant_id', tid)` or has it conditionally (existing code already conditions on `if (tid)` — preserve that exact pattern, don't drop the guard) → STOP.
2. **`crm-events-detail.js` line count >349 after change → STOP** (Iron Rule 12 absolute cap is 350; current is 349; ANY net-positive delta there would put the file at 350 which is permitted but leaves zero headroom — prefer net-zero or net-negative).
3. **Counter shows non-zero on event #11 after fix → STOP** — means the helper is wrong, the wiring is wrong, or there's a state with `registered`/`confirmed`/`attended` Daniel didn't mention. Verify via DB SELECT first; do NOT modify the helper to "make it work."
4. **Other counters (`אישרו`/`הגיעו`/`רכשו`) display differently after fix → STOP** — the SPEC scopes only the נרשמו counter.
5. **Console error on any of the 4 screens during QA → STOP**, do not paper over.
6. **Any pre-commit hook failure → STOP, fix root cause, recommit.** Never `--no-verify`.
7. **Iron Rule 31 integrity gate exit 1 (null bytes) → STOP and investigate before any further work.**

---

## 6. Rollback Plan

If the SPEC fails partway through:

- `git reset --hard {START_COMMIT}` — START_COMMIT captured by executor in EXECUTION_REPORT §1 (run `git rev-parse HEAD` BEFORE first edit and record it)
- No DB rollback needed (no DB changes by design)
- Notify Foreman; SPEC marked REOPEN.

---

## 7. Out of Scope (explicit)

The following look related but MUST NOT be touched in this SPEC. Touching any of these → STOP.

- **`v_crm_event_stats` view** (Supabase). The view's `total_registered` semantics may be wrong, but fixing it is a DB write and is forbidden. A future SPEC can fix the view; this SPEC works around it client-side. Document the view-side bug as a follow-up in FINDINGS.md.
- **Other counters**: `אישרו` (total_confirmed), `הגיעו` (total_attended), `רכשו` (total_purchased), `הכנסות` (total_revenue), `דמי הזמנה` (booking_fees_collected). Their semantics may also be off, but they are not in this SPEC's scope. If during QA the executor notices any of them is wrong on event #11 → log to FINDINGS.md, do NOT fix.
- **`v_crm_event_attendees_full` view** — even though we use it indirectly through `_state.attendees` in event-day.js, no changes to the view itself.
- **GUARDIAN_ALERTS M-3 (`crm-leads-tab.js` 346 lines)** — out of scope.
- **GUARDIAN_ALERTS M-4 (CRM `sb.from()` direct calls vs Rule 7)** — out of scope; the new SELECT in this SPEC inherits the existing module-level deviation. Logging it as a future cleanup item is fine.
- **`MASTER_ROADMAP.md`** — no roadmap status changes (this is a stabilization hotfix, not a phase boundary).
- **`docs/GLOBAL_MAP.md`** — no Integration Ceremony triggered (no module close, no contract change). The new helper `CrmHelpers.countRegistered` is module-internal, not a cross-module contract.
- **`docs/GLOBAL_SCHEMA.sql`** — no schema changes.
- **The campaign-overseer pre-existing modified file**: leave untouched throughout the session.
- **Anywhere outside `modules/crm/`**: no changes to `js/shared.js`, `index.html`, the `crm.html` script tag list (no new files mean no new tags), or any Edge Function source.

---

## 8. Expected Final State

### New files
- **None.** All changes go into existing files.

### Modified files

1. **`modules/crm/crm-helpers.js`** (current 235 lines → expected ≤ 250)
   - Add constant `REGISTERED_STATUSES = ['registered', 'confirmed', 'attended']` at module top, near TIER1_STATUSES (line 81) and TIER2_STATUSES (line 90).
   - Add helper `function countRegistered(attendees) { ... }` near `distinctValues` (line 138) or wherever logically grouped with the other count helpers.
   - Export `countRegistered` on `window.CrmHelpers` (in the export block ~line 213).
   - Export `REGISTERED_STATUSES` on `window` (mirrors TIER1_STATUSES/TIER2_STATUSES pattern at lines 233–234) **and** also on `window.CrmHelpers.REGISTERED_STATUSES` for callers that prefer namespaced access.

2. **`modules/crm/crm-events-tab.js`** (current 149 lines → expected ≤ 175)
   - In `loadEvents()`, add a second SELECT to `crm_event_attendees` filtered by `tenant_id`, `is_deleted=false`, `.in('status', window.REGISTERED_STATUSES)` returning `event_id, status`. Aggregate to `Map<event_id, count>` client-side.
   - Merge the count into each event row as `_registeredComputed` (or similar prefix-underscore name to mark it as client-derived, not a view column).
   - Replace `r.total_registered` on line 122 with `r._registeredComputed` (or whatever name was chosen) for the נרשמו column.
   - Leave the `total_attended` (line 123) and `total_purchased` (line 124) columns reading from the view as-is.

3. **`modules/crm/crm-events-detail.js`** (current 349 lines → MUST be ≤ 349 lines after change. Net-zero or net-negative delta only.)
   - Pass `attendees` (or a pre-computed `regCount = CrmHelpers.countRegistered(attendees)`) into `renderCapacityBar` from the existing call at line 113.
   - In `renderCapacityBar` body, line 120 currently reads `var reg = +stats.total_registered || 0`. Change `reg` source to use `CrmHelpers.countRegistered(attendees)` (or accept a passed-in count). Keep `conf` and `att` reading from `stats.total_confirmed` and `stats.total_attended` unchanged.
   - Line 137 (legend "נרשמו (' + reg + ')") unchanged in shape — `reg` now sourced correctly.
   - **Capacity-bar math note**: `cap` on line 121 currently does `cap = +maxCapacity || 0 || Math.max(reg, 1)`. With the new `reg` (smaller number), `cap` could differ when `maxCapacity=0`. Acceptable — that path is the "no capacity defined" fallback; using the corrected `reg` makes the bar more accurate. Document this in EXECUTION_REPORT.

4. **`modules/crm/crm-events-detail-charts.js`** (current 201 lines → expected ≤ 215)
   - Modify `renderEventDetailKpiSparklines(host, stats)` to accept an `attendees` parameter as 3rd arg. In body, line 53 currently does `var reg = +stats.total_registered || 0`. Replace with `var reg = CrmHelpers.countRegistered(attendees || [])`. Keep `conf`/`att`/`prc`/`rev`/`bFee` as-is.
   - Modify `renderEventDetailFunnelSvg(host, stats)` to accept `attendees` as 3rd arg. Line 81 same swap. Line 87 funnel stage `{ label: 'נרשמו', n: reg, ... }` unchanged in shape. Early-return `if (!reg)` at line 83 stays — when `reg=0` the funnel renders empty (existing behavior, see Success Criterion #9).
   - Update both call sites in `crm-events-detail.js` (`wireSubTabs` lines 230 and 233) to pass `attendees` as 3rd arg. **Caution:** these edits live in `crm-events-detail.js` — count toward that file's line cap (line 230 and 233 show `body.querySelector(...), stats);` → become `body.querySelector(...), stats, attendees);` — still single-line each, net-zero).

5. **`modules/crm/crm-event-day.js`** (current 196 lines → expected ≤ 210)
   - In `renderStatsBar()` line 154: `var reg = +s.total_registered || 0` — replace with `var reg = CrmHelpers.countRegistered(_state.attendees || [])`.
   - The other `s.*` reads (conf/att/prc/rev) stay as-is.
   - Verify `_state.attendees` is populated by the time `renderStatsBar()` is called. From line 86–87 in `fetchAllEventDayData()`, attendees is populated before `renderLayout` → `renderStatsBar`. Good.

### Deleted files
- **None.**

### DB state
- **No changes.**

### Docs updated (small one-line additions only — not Integration Ceremony)

- **`modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`**: prepend a one-line entry under the "Last updated" frontmatter capturing this SPEC's commit hash + date, in the same style as existing pre-cutover entries. **Do not** rewrite the file.
- **`modules/Module 4 - CRM/docs/CHANGELOG.md`**: add a one-row entry for this SPEC under the latest section (or create a "post-cutover stabilization" section if not present).

NOT updated:
- `MASTER_ROADMAP.md` (no phase boundary)
- `docs/GLOBAL_MAP.md` (no cross-module contract — `countRegistered` is module-internal)
- `docs/GLOBAL_SCHEMA.sql` (no schema change)
- `MODULE_MAP.md` (helper is internal-only, not a public contract; if executor disagrees, flag in FINDINGS — adding it is not blocking but is small enough that doing it in this commit is fine)

---

## 9. Commit Plan

Two acceptable groupings — executor picks one:

### Option A — single commit
- `fix(crm): scope 'נרשמו' counter to registered/confirmed/attended only`
  - All 5 files in one commit. Use selective `git add` by filename — never `-A` or `.`.

### Option B — two commits (preferred if any unrelated noise creeps in)
- Commit 1: `fix(crm): add REGISTERED_STATUSES constant + countRegistered helper`
  - `modules/crm/crm-helpers.js`
- Commit 2: `fix(crm): use countRegistered helper at all 4 'נרשמו' callsites`
  - `modules/crm/crm-events-tab.js`
  - `modules/crm/crm-events-detail.js`
  - `modules/crm/crm-events-detail-charts.js`
  - `modules/crm/crm-event-day.js`

A separate docs commit for SESSION_CONTEXT + CHANGELOG (1-line additions) is acceptable but optional — bundling them with Commit 2 (or Option A) is fine.

**Do NOT** commit, push, or merge to `main`. Branch stays on `develop`. After push, verify `git status` is clean (except the untouched campaign-overseer file).

---

## 10. Dependencies / Preconditions

- Repo on branch `develop`, pulled to latest.
- Pre-existing `__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` is modified-untracked-by-design (Daniel said leave alone). Selective `git add` only.
- Demo tenant accessible.
- Demo event #11 ("אירוע המותגים טסט") exists in state Daniel described (1 invited + 1 new). Executor verifies via Level-1 SELECT before relying on it for QA criteria 5–9.
- Iron Rule 31 integrity gate is clean at start (verified by Foreman before SPEC dispatch — exit 0).
- No EF deploy or DB migration is in flight from another session.

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-05-04 against `modules/crm/`, `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`: **0 collisions** for `REGISTERED_STATUSES`, `countRegistered`, `isRegistered` across `*.js`, `*.html`, `*.md`, `*.sql`. The new names are safe to introduce.

Lessons harvested from recent FOREMAN_REVIEWs and applied:

- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §2.2 #3** ("caller count is off — verify via grep, don't trust SPEC text") → APPLIED. Caller count (4 callsites across 4 files, all listed verbatim in §8) was verified via `grep -rn "נרשמו" modules/crm/` and matches:
  - `crm-events-tab.js:110` (header) + `:122` (data)
  - `crm-events-detail.js:137` (capacity-bar legend, 1 callsite)
  - `crm-events-detail-charts.js:70` (KPI card) + `:87` (funnel) — 2 callsites in the same file, both fixed by the same signature change
  - `crm-event-day.js:159` (counter card)
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §2.1** ("§6 success criteria are observable and queryable — good") → APPLIED. Every §3 criterion has either a grep/wc command, a console expression, or a screenshot specified.
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` §11** (Rule 31 integrity-gate as a stop trigger) → APPLIED in §3 #15 + §5 #7.
- **FROM CLAUDE.md §1 (First Action step 4 — pre-existing dirty repo)** → APPLIED. The campaign-overseer pre-existing modification is explicitly carved out in §3 #1, §4 stop-list, §7 out-of-scope.
- **FROM general SaaS discipline** — Rule 14 (`tenant_id` filter) and Rule 22 (defense-in-depth) baked into the new fetch query specification in §4 + §5 #1.
- **FROM `feedback_test_data_phones.md` (auto-memory)** — N/A this SPEC. No SMS dispatch, no phone-using paths touched.

Lessons NOT applicable:
- "Use prizma test phones for SMS tests" (M4_AUTOMATION_ENGINE Rung 1) — N/A (no SMS).
- "Per-tenant fanout from cron" (M4_AUTOMATION_ENGINE §2.2 #6) — N/A (no cron, no EF).
- "Verify_jwt config block in supabase/config.toml" (M4_AUTOMATION_ENGINE §2.2 #5) — N/A (no EF deploy).

---

## 12. Pre-Merge Checklist

Every SPEC must pass these before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity; echo $?` returns `0` or `2`. Any null-byte ERROR (exit 1) blocks closure.
- [ ] `git status --short` returns empty for the 5 modified files (campaign-overseer file may remain modified-by-design).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + (if any findings) FINDINGS.md written in this SPEC folder.
- [ ] SESSION_CONTEXT.md + CHANGELOG.md got 1-line entries (small additions only — not Integration Ceremony).
- [ ] Manual demo QA screenshots referenced in EXECUTION_REPORT (or, if browser screenshots aren't possible, EXECUTION_REPORT explicitly states "manual browser QA pending — Daniel to verify on demo before SPEC closes" and the SPEC stays in 🟡 status until Daniel confirms).

---

## 13. Sanity-Test Snippets (DevTools console, on demo tenant, /crm.html)

After deploy / on local dev page-load on demo, paste each into DevTools to verify:

```js
// Criterion #2
window.REGISTERED_STATUSES.join(',');
// expect: "registered,confirmed,attended"

// Criterion #3
CrmHelpers.countRegistered([
  { status: 'registered' },
  { status: 'confirmed' },
  { status: 'attended' },
  { status: 'invited' },
  { status: 'new' },
  { status: 'cancelled' },
  { status: 'no_show' },
  { status: 'waitlist' },
  { status: 'waiting_list' }
]);
// expect: 3

CrmHelpers.countRegistered(null);
// expect: 0

CrmHelpers.countRegistered([]);
// expect: 0
```

---

## 14. Foreman Sign-Off

**Status when authored:** APPROVED FOR DISPATCH to opticup-executor.

**Authoring chat:** Claude Code Opus 4.7 (1M context), Windows desktop, 2026-05-04 session, in response to Daniel's brief "Pure display-layer fix for the 'נרשמו' counter. Test on demo only. NO writes to any DB. Two-stage: opticup-strategic + opticup-executor."

**Pre-flight verified by Foreman:**
- Branch `develop`, current
- Pull clean
- Integrity gate clean (exit 0)
- 4 callsites identified via grep — match SPEC §8 exactly
- 5 target files line-counted — `crm-events-detail.js` flagged as 1-line headroom case
- Demo event #11 state per Daniel's verification (not re-queried by Foreman; executor verifies in Step 1.5)
- Rule 21 cross-reference for new names — clean
- No prior known SPEC overlapping this scope (only PRE_CUTOVER_QA_C touched the events tab, and that was status-color settings, unrelated to counter math)

**Next action:** Daniel hands this SPEC's path to a fresh Claude Code session loading opticup-executor. Path:
```
modules/Module 4 - CRM/docs/specs/ATTENDEE_COUNTER_DISPLAY_FIX/SPEC.md
```

After execution, opticup-strategic returns to read `EXECUTION_REPORT.md` + `FINDINGS.md` and writes `FOREMAN_REVIEW.md` with verdict + 2 author-skill + 2 executor-skill improvement proposals harvested from the run.

---

*End of SPEC.*
