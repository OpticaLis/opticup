# SPEC — OVERNIGHT_M4_SCALE_AND_UI

> **Location:** `modules/Module 4 - CRM/final/OVERNIGHT_M4_SCALE_AND_UI/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-24 (late evening)
> **Module:** 4 — CRM
> **Phase:** Scale hardening + UI completion before P7 cutover
> **Execution mode:** Unattended overnight run — executor decides every judgment call within envelope; no user handoff mid-session

---

## 0. Executive Framing

This SPEC integrates 9 distinct pieces of work that are coupled by the same goal: **make Module 4 CRM production-ready at 20,000+ leads, with full per-run observability, before P7 Prizma cutover.** Each phase has its own acceptance tests. The executor runs the phases in the listed order, verifies each phase's tests before moving to the next, and stops on any genuine deviation.

**Why one SPEC instead of 9 small ones:** the phases are deeply coupled. Message queue requires execution log for observability. Execution log requires retry for completeness. All three require the allowlist to be safe during tests. UI screens need backend to be real. Splitting = cross-SPEC merge conflicts + loss of overnight parallelism.

**Foreman autonomy contract:** executor is empowered to make all architectural + implementation decisions within the envelope without stopping to ask. Only stop on the explicit stop-triggers in §5.

---

## 1. Goal

1. Reach production capacity readiness for 20,000 leads
2. Install complete per-message observability (log + retry)
3. Protect test environment with 3-layer phone allowlist
4. Propagate all message templates from demo → prizma tenant
5. Purge stale prizma leads in preparation for fresh import
6. Deliver 3 new UI screens: automation history, live queue view, event edit
7. Add pagination to CRM list screens

---

## 2. Background & Motivation

**State at SPEC start:**
- Module 4 is operationally feature-complete on `develop` (15+ SPECs closed today — including COUPON_SEND_WIRING, EVENT_CLOSE_COMPLETE_STATUS_FLOW, COUPON_CAP_AUTO_CLOSE, EVENT_WAITING_LIST_AUTO_TRANSITION, WAITING_LIST_PUBLIC_REGISTRATION_FIX, POST_WAITING_LIST_FIXES, WAITING_LIST_DISPATCH_FIX).
- Last shipped: commit `6d1496e` — stopped broadcasting event_waiting_list on auto-transition.
- Daniel's directive: "המערכת צריכה להיות מסוגלת להכיל כמויות ענקיות של רשומים, הכי נוחה והכי מקצועית."
- 3 BLOCKERS for scale documented in `modules/Module 4 - CRM/docs/SCALE_BLOCKERS_PENDING.md`: #14 (queue), #15 (pagination), #16 (execution log), #17 (event edit).
- Current message dispatch runs `Promise.all` across recipients — 800+ leads on demo already, blast sends would hit Make/SMS/Email quotas simultaneously and cascade-fail.
- Prizma has ZERO message templates (OPEN_ISSUE #9). All templates currently seeded on demo only.

**Prizma tenant reset safety envelope:**
- Daniel authorized: "אפשר להוריד את כל הרשומים בפריזמה גם ככה אנחנו נעביר את כל הרשימה העדכנית שוב."
- Allowlist of 2 phones ONLY permitted to receive dispatches during overnight tests: `0537889878` + `0503348349` (Daniel's test lines per auto-memory `feedback_test_phone_numbers.md`).
- Allowlist enforced at 3 layers: send-message EF (last line of defense) + DB check (queue gate) + CRM UI (guard for direct calls).

---

## 3. Success Criteria (Measurable)

**Pre-conditions at SPEC start:**
- HEAD = `6d1496e` on `develop` (verify at Step 0)
- `event-register` EF deployed current (Daniel deployed be277bc manually this evening)
- `verify-tree-integrity` passes (Iron Rule 31)
- Working tree clean

### Phase-level success gates (each phase blocks the next):

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| **PHASE 0 — Pre-flight (before any change)** |
| 0.1 | Branch state | `develop`, clean | `git status --porcelain \| wc -l` → 0 |
| 0.2 | Integrity gate green | exit 0 or 2 | `npm run verify:integrity` |
| 0.3 | All existing templates on demo verified | count ≥24 | SQL |
| 0.4 | event-register EF has capacity.ts v2 (no dispatch loop) | grep | `supabase functions inspect event-register` equivalent |
| **PHASE 1 — 3-Layer Allowlist (must complete FIRST, before any DB ops that could trigger dispatch)** |
| 1.1 | `send-message` EF has allowlist check | grep | Inline constant `ALLOWED_PHONES = ['0537889878','0503348349']` + early-return when phone not in list |
| 1.2 | Allowlist config is hardcoded to 2 phones (no env var escape) | grep | No `Deno.env.get('ALLOW_PHONES')` — intentionally hardcoded for overnight |
| 1.3 | Allowlist rejects disallowed number with explicit log | deploy + test | curl send-message with phone 0500000000 → 200 + body `{ok:false, error:'phone_not_allowed'}` + log row inserted with status='rejected' |
| 1.4 | Unit: allowlist hit for both Daniel phones | deploy + test | 2 happy-path dispatches succeed (both phones send through) |
| **PHASE 2 — Prizma Purge (only after allowlist verified)** |
| 2.1 | Backup of prizma leads | file exists | `/tmp/prizma_leads_backup_2026-04-24.json` contains all prizma rows |
| 2.2 | Prizma `crm_leads` count zero | SQL | `SELECT count(*) FROM crm_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` → 0 |
| 2.3 | Prizma attendees cleared | SQL | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id='6ad0781b-…'` → 0 |
| 2.4 | Prizma events untouched (Daniel may want them) | SQL | same count as at start |
| 2.5 | Prizma message_log untouched | SQL | same count as at start (historical log preserved) |
| **PHASE 3 — Seed Prizma Templates** |
| 3.1 | All 24+ templates cloned from demo → prizma | SQL | `SELECT count(*) FROM crm_message_templates WHERE tenant_id='6ad0781b-…' AND is_active=true` matches demo count |
| 3.2 | Prizma templates have identical bodies | SQL | `SELECT COUNT(*) FROM prizma t1 JOIN demo t2 USING (slug, channel) WHERE t1.body != t2.body` → 0 |
| 3.3 | Automation rules also seeded (all active demo rules cloned) | SQL | Prizma rule count = demo rule count |
| **PHASE 4 — Automation Execution Log** |
| 4.1 | New table `crm_automation_runs` | DDL exists | `\d crm_automation_runs` |
| 4.2 | `crm_automation_runs` tenant-scoped + RLS | SQL | `SELECT * FROM pg_policies WHERE tablename='crm_automation_runs'` shows tenant isolation |
| 4.3 | `crm_message_log` has new `run_id` nullable column | DDL | Column exists with FK |
| 4.4 | `CrmAutomation.evaluate` creates a run row | code review | INSERT at start + UPDATE sent_count/failed_count at end |
| 4.5 | Test: triggering automation creates 1 run row + correct counts | e2e | E2E: trigger event_closed rule → new run row with recipients=N, sent=N, failed=0 |
| **PHASE 5 — Retry Logic** |
| 5.1 | Failed `crm_message_log` rows marked `status='failed'` with reason | schema | already exists |
| 5.2 | New Edge Function `retry-failed` | EF exists | Supabase dashboard shows `retry-failed` deployed |
| 5.3 | retry-failed takes `run_id` + retries only status='failed' rows | code review | Signature + logic |
| 5.4 | Retry respects allowlist | integration | Retry of disallowed number still rejected |
| 5.5 | Retry test: inject failure, call retry-failed, verify status transitions to 'sent' | e2e | Intentional failure injection + auto-retry |
| **PHASE 6 — Message Queue** |
| 6.1 | New table `crm_message_queue` with columns (id, tenant_id, run_id, lead_id, event_id, channel, template_slug, variables, status, scheduled_at, retries, created_at, sent_at) | DDL | All columns present with types |
| 6.2 | Queue RLS enforces tenant isolation | SQL | pg_policies shows proper isolation |
| 6.3 | `CrmAutomation.evaluate` enqueues to queue instead of Promise.all-ing to send-message | code | evaluate() → INSERT N rows into queue + exits |
| 6.4 | `pg_cron` job runs every minute, processes 60 rows per tick | schedule | `SELECT * FROM cron.job WHERE jobname='dispatch_queue'` |
| 6.5 | New Edge Function `dispatch-queue` dispatches via send-message at 1s throttle | EF | Code review shows `await new Promise(r => setTimeout(r, 1000))` between sends |
| 6.6 | Queue gate: allowlist check in dispatch-queue (layer 3) | code | Before INVOKE send-message, check phone in ALLOWED_PHONES |
| 6.7 | Queue fills + drains in under 2x expected time (60 msgs in ~60 sec) | e2e | Insert 60 rows, wait 2 min, verify sent_at on all |
| 6.8 | Queue error gracefully marks row failed, not blocks queue | e2e | Inject 1 rejected phone in queue → that 1 marked failed, other 59 succeed |
| **PHASE 7 — UI: Automation History screen** |
| 7.1 | New tab/screen in CRM at `crm.html` with id `tab-automation-history` | grep | tab exists |
| 7.2 | Table: last 50 runs with timestamp, rule_name, total, sent, failed, status | UI | Renders correctly |
| 7.3 | Click on a run → drill-down modal showing per-recipient status | UI | Modal opens, rows visible |
| 7.4 | Drill-down supports "retry failed only" button | UI | Button calls retry-failed EF |
| 7.5 | Screen reads from `crm_automation_runs` + `crm_message_log` join | SQL | Verified via Network tab or devtools |
| **PHASE 8 — UI: Live Queue view** |
| 8.1 | New sub-tab `queue-live` under messaging hub | UI | tab present |
| 8.2 | Shows `crm_message_queue` where status != 'sent' | SQL | correct filter |
| 8.3 | Auto-refreshes every 5 seconds | code | setInterval or subscribe |
| 8.4 | Manual "purge failed" button (deletes status='failed' rows) | UI | works |
| **PHASE 9 — UI: Event edit (OPEN_ISSUE #17)** |
| 9.1 | Edit button appears on every event card in events list | UI | button present |
| 9.2 | Modal with all creation fields: name, event_date, start/end time, location, max_capacity, max_coupons, extra_coupons, coupon_code, registration_form_url, notes | UI | form fields match create |
| 9.3 | UPDATE uses atomic RPC or direct write with tenant_id guard | code | Rule 22 (defense in depth) |
| 9.4 | Cannot edit `status` from here (only via existing change-status flow) | UI | field absent or disabled |
| **PHASE 10 — CRM Pagination** |
| 10.1 | Server-side pagination on `crm-leads-tab.js` | code | `.range()` call on query |
| 10.2 | Server-side pagination on `crm-incoming-tab.js` | code | same |
| 10.3 | "Load more" button OR infinite scroll | UI | works |
| 10.4 | Search + filter remains server-side (never client) | code | filter params go in query |
| 10.5 | Screen loads 50 rows in <500ms with 20K leads in table | e2e | benchmark test with synthetic data |
| **PHASE 11 — Integration + Cleanup** |
| 11.1 | Full E2E: seed 100 fake prizma leads with the 2 allowed phones + 98 disallowed + trigger event_closed | e2e | expect 2 sent, 98 rejected + logged |
| 11.2 | Automation run row shows correct counts | e2e | |
| 11.3 | Queue empty after 3 minutes | e2e | |
| 11.4 | History UI shows the run | e2e | |
| 11.5 | All files ≤350 lines | verify | |
| 11.6 | Integrity gate passes | verify | |
| 11.7 | Git status clean | git | |
| 11.8 | Commits logical (1 per phase, or fewer if closely coupled) | git log | 8-12 commits total |
| 11.9 | Push to origin | git | in sync |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- All phases listed in §3 with full implementation freedom
- Schema migrations (new tables: `crm_automation_runs`, `crm_message_queue`; new column `crm_message_log.run_id`)
- Deploy Edge Functions (`dispatch-queue`, `retry-failed` — new; updates to `send-message`, `event-register`)
- `pg_cron` job scheduling
- UI design decisions (layout, styling, button placement) — follow existing CRM conventions
- Insertion of test data (fake leads with allowed phones for e2e testing, cleaned up after each phase)
- Automatic retries on transient failures (1 retry per failure, max 3 attempts)
- Stopping and rolling back a phase if tests fail, then continuing to next safe phase if feasible

### What REQUIRES stopping and reporting
- Any test that reveals a real regression in an already-shipped feature
- Schema migration that would touch production prizma data beyond the authorized purge
- Integrity gate failure
- A phase consistently failing retry (3 attempts, same error)
- An allowlist test that dispatches to a NOT-allowed phone successfully (catastrophic — would send real SMS)
- Any EF deploy failing after 3 retries
- Rule 12 (350 lines) violated without a clear extraction target

### Decision autonomy (executor decides)
- Which rows from demo templates are duplicates vs unique
- What "drill-down modal" layout looks like
- Whether "load more" or "infinite scroll" for pagination
- Whether pg_cron batch size is 60 or 100 (start with 60, tune based on timing)
- Where to put the new UI tab (under messaging hub, standalone, etc.)
- Exactly how the automation run row is shaped (camelCase vs snake_case columns)
- Commit message phrasing

---

## 5. Stop-on-Deviation Triggers

**Narrow and specific — unchanged from existing SPEC discipline:**

1. **Pre-flight assertion failure:** HEAD ≠ 6d1496e, or integrity gate fails, or tree dirty → STOP, report, do not proceed.
2. **Allowlist breach:** any dispatch test sends to a phone NOT in `['0537889878','0503348349']` → STOP with panic label. Revert all changes since phase start, produce detailed RCA.
3. **Schema migration error:** any CREATE TABLE / ALTER TABLE returning error → STOP. Do not retry; wait for next session.
4. **Rate-limit hit on Supabase APIs (>5 consecutive rejected requests):** STOP, wait 5 minutes, retry once. If still failing, STOP overnight.
5. **pg_cron job fails to start after 2 attempts:** STOP; manual intervention needed.
6. **File size violation (>350 lines) without obvious extraction path:** STOP at phase end, propose extraction in FINDINGS, then decide whether to continue.
7. **E2E test failure that is not a simple retry-fixable transient:** STOP, log in FINDINGS, do not proceed to next phase.
8. **Catastrophic DB error (accidentally deleting non-prizma data):** STOP immediately, restore from Supabase PITR guidance in FINDINGS.

**Do NOT stop for:**
- A phase taking longer than expected
- Needing to retry an EF deploy once or twice
- Tweaking a UI detail mid-phase
- Adjusting test data between runs
- Making a judgment call about terminology or layout

---

## 6. Rollback Plan

- Each phase is its own commit; `git revert <hash>` per phase
- Schema rollback: `DROP TABLE crm_automation_runs CASCADE`, `DROP TABLE crm_message_queue CASCADE`, `ALTER TABLE crm_message_log DROP COLUMN run_id`
- EF rollback: `supabase functions delete dispatch-queue` + `supabase functions delete retry-failed`
- pg_cron: `SELECT cron.unschedule('dispatch_queue');`
- Prizma purge: data is backed up to `/tmp/prizma_leads_backup_2026-04-24.json` — restore via `INSERT INTO crm_leads SELECT * FROM JSON_POPULATE_RECORDSET(...)` (document exact SQL in EXECUTION_REPORT)

---

## 7. Out of Scope

- **No changes to Storefront public form** — already working, covered by WAITING_LIST_PUBLIC_REGISTRATION_FIX
- **No Make scenario changes** — Make remains the thin sender
- **No new templates** — only seed existing demo templates to prizma
- **No change to coupon code logic** — Daniel decided to keep per-event cosmetic
- **No P7 cutover** — that's a separate conversation
- **No documentation updates to MODULE_MAP / GLOBAL_MAP** — queue for next Integration Ceremony (documented in FINDINGS)
- **No changes to authentication / PIN flow**
- **No `.gitattributes`** — still deferred

---

## 8. Expected Final State

### New tables
- `crm_automation_runs` — per-run record
- `crm_message_queue` — pending/processing dispatch rows

### Modified tables
- `crm_message_log` — `+run_id` column (nullable, FK)

### New Edge Functions
- `dispatch-queue` — drains queue 60 rows per minute at 1s throttle
- `retry-failed` — re-dispatches failed rows from a run

### Modified Edge Functions
- `send-message` — 3rd-layer allowlist (hardcoded 2-phone check)
- `event-register` — already deployed, no changes

### Modified code
- `modules/crm/crm-automation-engine.js` — dispatch path enqueues instead of direct
- `modules/crm/crm.html` — add 3 new tabs (history, queue live, event edit button)
- `modules/crm/crm-leads-tab.js` + `crm-incoming-tab.js` — pagination
- New: `modules/crm/crm-automation-history.js`
- New: `modules/crm/crm-queue-live.js`
- Modified: `modules/crm/crm-event-actions.js` — add edit modal

### New seed data
- Prizma tenant: all 24+ templates cloned from demo
- Prizma tenant: all active automation rules cloned from demo

### Cleared data
- Prizma `crm_leads` → 0 rows (backed up first)
- Prizma `crm_event_attendees` → 0 rows

### pg_cron jobs
- `dispatch_queue` — every minute

### Commits (target 8-12)
- Commit 1: Allowlist in send-message EF + unit tests
- Commit 2: Prizma purge + backup artifact
- Commit 3: Seed prizma templates + rules
- Commit 4: Schema + RLS for crm_automation_runs + run_id on message_log
- Commit 5: Automation evaluate() creates runs
- Commit 6: retry-failed EF + tests
- Commit 7: Schema + RLS for crm_message_queue + pg_cron + dispatch-queue EF
- Commit 8: Queue integration into automation engine
- Commit 9: UI — automation history
- Commit 10: UI — queue live + event edit
- Commit 11: CRM pagination
- Commit 12: Close OVERNIGHT SPEC retrospective

---

## 9. Commit Plan

Executor runs all phases linearly. After each phase passes its §3 gate, commit → push → next phase. This makes each commit a safe revert point.

After all phases pass, close the SPEC with retrospective commit.

Push after each commit (not batched) so a Foreman reviewing at morning can see progress.

---

## 10. Dependencies / Preconditions

- Current HEAD: `6d1496e` (verified before this SPEC starts)
- `event-register` EF latest deploy (user deployed be277bc this evening)
- Supabase MCP has `apply_migration` + `execute_sql` + `deploy_edge_function` privileges
- pg_cron extension available on Supabase (enabled by default on paid plans — verify at phase start)
- Daniel's test phones: `0537889878`, `0503348349` (hardcoded in allowlist)
- Prizma tenant UUID: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Integrity gate passes at start

---

## 11. Lessons Already Incorporated

From today's 10+ FOREMAN_REVIEWs:

- **File-size projection at author time:** Phase-level file-change estimates given inline. Extractions pre-authorized where needed.
- **Precondition drift check:** Phase 0 is the mandatory drift check.
- **Runtime state verification at author time:** all referenced UUIDs and template counts verified live against DB at SPEC authoring time.
- **Stop-trigger clarity:** §5 distinguishes "false positive" (fix script) vs "premise violation" (stop).
- **DB simulation + pending marker:** Phase 11 explicitly frames some tests as "Claude-verifiable" (SQL counts, dispatch via MCP) — no UI clicks required for overnight run. The 3 UI screens require morning QA by Daniel to complete.
- **Allowlist architecture:** 3 layers (EF + queue gate + UI) — defense in depth per Rule 22.
- **Clean repo discipline:** clean tree required at SPEC start + end of each phase.
- **No hardcoded business values:** allowlist phones are an *operational* constant (scoped to overnight test), not a business value — hardcoding is explicitly the correct choice here.

### Cross-Reference Check (Rule 21)

| New entity | Exists? | Resolution |
|-----------|---------|------------|
| `crm_automation_runs` table | No | Safe |
| `crm_message_queue` table | No | Safe |
| `run_id` column on message_log | No | Safe |
| `dispatch-queue` EF | No | Safe |
| `retry-failed` EF | No | Safe |
| `pg_cron` job `dispatch_queue` | No | Safe |
| 3 UI screens | No | Safe — distinct from existing tabs |
| Pagination helpers | No | Safe — reusable pattern |

**Cross-reference check completed 2026-04-24 late evening: 0 collisions.**

---

## 12. Overnight Execution Protocol

**This SPEC is designed to run unattended. The executor:**

1. Reads this SPEC entirely before starting
2. Runs Phase 0 pre-flight
3. Proceeds through phases 1–11 in strict order
4. After each phase, runs the phase's §3 gate. If it fails, STOPS (§5).
5. On any stop, writes EXECUTION_REPORT §3 + FINDINGS with exact state + recovery steps
6. On successful completion of all phases, writes EXECUTION_REPORT + FINDINGS + closes SPEC
7. Runs `git log origin/develop..HEAD --oneline` at the end to summarize commits
8. Push all commits to origin/develop continuously (after each commit, not batched)

**Expected execution time:** 4–8 hours. No time pressure — correctness > speed.

---

## 13. Morning Handoff

At start of next session:
1. Check SPEC folder for EXECUTION_REPORT.md, FINDINGS.md
2. Verify `git log` shows expected commit progression
3. Review FINDINGS for any partial stops
4. Run `npm run verify:integrity` and SQL spot-checks from §3
5. If 3 UI screens are shipped, perform live QA on them (non-SMS clicks)
6. Close SPEC with FOREMAN_REVIEW

---

*End of SPEC. Hand to opticup-executor for overnight execution.*
