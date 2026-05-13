# SPEC — M4_WAITLIST_SYNC_PRIORITY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase:** post-MVP hardening (no phase letter; follows `M4_LEAD_STATUS_WAITLIST_SYNC`)
> **Author signature:** Full Auto Pipeline run, Sonnet model, 2026-05-14
> **Brief:** `modules/Module 4 - CRM/architecture-brief/WAITLIST_SYNC_PRIORITY_FIX_BRIEF.md`
> **Predecessor investigation:** `modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md`
> **Safety tag (rollback root):** `pre-waitlist-sync-priority-fix-2026-05-14` → `9c36c26`

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14. Investigation report read in full on 2026-05-14.
- Target DB objects exist at claimed locations:
  - RPC `public.sync_lead_status_from_attendee(uuid,uuid)` exists; body retrieved live (see §2 below for the relevant fragment).
  - Tables `crm_events` and `crm_event_attendees` exist; status enums confirmed live.
  - Only existing relevant trigger: `trg_attendee_status_change_event` on `crm_event_attendees`. **No trigger on `crm_events` exists.** Clear room for the new one.
- Tenant UUIDs verified live: `prizma=6ad0781b-37f0-47a9-92e3-be9ed1477e1c`, `demo=8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- Cross-Reference Check (Rule 21): the new trigger name `trg_event_status_close_recycle_leads` and the new function name `event_status_close_recycle_leads_fn` were grep-verified against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, and all `modules/*/docs/db-schema.sql` files — 0 hits, 0 collisions.
- Pre-existing untracked files surveyed via `git status --porcelain | grep '^??'`: many present (architecture-brief drafts, prior SPEC folders) — all unrelated to this SPEC. Executor uses selective `git add` by filename throughout.
- Lessons from prior FOREMAN_REVIEWs in Module 4:
  - From `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` (Author Proposal #1, 2026-05-13) — every baseline in §0 is from a live query, not memory. Honored: all four baselines below have runnable SQL.
  - From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` (Author Proposal #1, 2026-05-11) — headings use plain `## N. Title`, no `§` prefix in heading text. Honored.
  - From `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` — color-form completeness check not applicable (no visual re-skin in this SPEC).

### 0.1 Baselines (LIVE measurement)

All four baselines measured against project `tsxrrxzmdxaenlvocyit` on 2026-05-14 immediately before SPEC authoring.

| Symbol | Metric | Value | How measured |
|---|---|---|---|
| `BASE_PRIZMA_RECYCLE_TARGETS` | Distinct Prizma leads matching §3.4 recycle predicate at SPEC start | **86** | `SELECT COUNT(*) FROM crm_leads l WHERE l.tenant_id=PRIZMA AND l.is_deleted=false AND l.status NOT IN ('not_interested','unsubscribed','waiting') AND EXISTS (SELECT 1 FROM crm_event_attendees a JOIN crm_events e ON e.id=a.event_id AND e.tenant_id=a.tenant_id WHERE a.lead_id=l.id AND a.tenant_id=l.tenant_id AND a.is_deleted=false AND a.status IN ('invited','attended') AND e.status IN ('closed','completed') AND e.is_deleted=false);` |
| `BASE_DEMO_RECYCLE_TARGETS` | Same predicate on demo | **0** | Same query with `slug='demo'`. |
| `BASE_PRIZMA_WAITLIST_SYNC_TARGETS` | Distinct Prizma leads currently carrying a `waiting_list` attendee row on a non-closed/non-completed event | **0** | `SELECT COUNT(DISTINCT a.lead_id) FROM crm_event_attendees a JOIN crm_events e ON e.id=a.event_id AND e.tenant_id=a.tenant_id WHERE a.tenant_id=PRIZMA AND a.is_deleted=false AND a.status='waiting_list' AND e.status NOT IN ('completed','cancelled') AND e.is_deleted=false;` |
| `BASE_PRIZMA_LEADS_WAITLIST` | Prizma leads with `status='waitlist'` at SPEC start | **0** | `SELECT COUNT(*) FROM crm_leads WHERE tenant_id=PRIZMA AND is_deleted=false AND status='waitlist';` |
| `BASE_RECYCLE_STATUS_DIST` | Distribution of current `lead.status` across the 86 targets | **84 'invited' + 2 'confirmed'** | `GROUP BY l.status` over the §3.4 predicate. |
| `BASE_RECYCLE_TARGETS_WITH_ACTIVE_WAITLIST` | Of the 86, how many also carry a waiting_list row on a non-closed/non-completed event | **0** | Self-join of §3.4 target set with the waitlist predicate. |
| `BASE_START_COMMIT` | HEAD when SPEC was authored | `9c36c26` | `git rev-parse HEAD`. |

**Stop-trigger pre-check (Brief §4.7):** `BASE_RECYCLE_TARGETS_WITH_ACTIVE_WAITLIST = 0` → §3.4 will not collide with §3.2's preferred outcome. Safe to proceed with the locked ordering.

**Cap pre-check (Brief §4.7):** `BASE_PRIZMA_RECYCLE_TARGETS = 86 < 300` → under the sanity cap. No surfacing to Daniel required mid-run.

---

## 1. Goal

Close the gap identified by `WAITLIST_FLOW_INVESTIGATION_2026_05_13.md`: give `waiting_list` attendee rows precedence in `sync_lead_status_from_attendee`, add a new DB trigger on `crm_events` that recycles `invited`/`attended` leads back to `waiting` when an event closes/completes, and run the two coordinated retroactive backfills (§3.4 then §3.2) in the locked order so waitlist precedence wins the final state.

---

## 2. Background & Motivation

The capacity-reached → `lead.status='waitlist'` flow is fully wired (DB + RPC + EF + UI) but has never fired in production because:
1. It was deployed AFTER the only historical capacity-hit event (March 2026), so 8 stuck Prizma waiting_list attendees on a `completed` event never received the new mapping.
2. Sync's "most-recent-active wins" rule absorbs the waitlist signal when a lead has a parallel `registered`/`attended` row.
3. No trigger re-runs sync when an event closes, so historical `invited`/`attended` leads carry stale lead.status indefinitely.

Daniel's locked decisions (Brief §2):
- Waitlist precedence over `confirmed_verified`/`attended` in sync.
- Retroactive sync for sold-out historical events (the 8 stuck leads + any others).
- NEW event-close recycle: on transition to `closed`/`completed`, leads with attendee status IN ('invited','attended') return to `lead.status='waiting'`.
- Out of scope: attendee statuses NOT in {invited, attended} on the closing event.
- Customer/purchased recognition deferred to a future SPEC.

Current live RPC body fragment (the line that this SPEC changes):
```sql
   ORDER BY COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;
```

Becomes (post-§3.1):
```sql
   ORDER BY (CASE WHEN a.status='waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;
```

The existing event filter `e.status NOT IN ('completed','cancelled')` is preserved, so a `waiting_list` row on a completed event does NOT win precedence (matches Brief §3.1 wording: "AND event is not closed/completed"). Note that `closed` is not currently in the sync filter — verified live, the only event statuses sync excludes are `completed` and `cancelled`. This SPEC does NOT widen that filter; the new trigger handles `closed` semantics.

### Already-done discovery contingency

If at executor pre-flight any §0.1 baseline has materially drifted (e.g., `BASE_PRIZMA_RECYCLE_TARGETS > 300` or `< 50`, or `BASE_RECYCLE_TARGETS_WITH_ACTIVE_WAITLIST > 0`), STOP and escalate per §5 — do not silently proceed against shifted reality.

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value, runnable verification, and a target step.

| # | Criterion | Expected value | Verify command / SQL | After step |
|---|-----------|---------------|---------------------|-----------|
| 1 | Branch state | On `develop`, clean at SPEC close | `git status --porcelain` → empty | End |
| 2 | Commits produced | 5–7 (cap 8 per Brief §4.6) | `git log 9c36c26..HEAD --oneline \| wc -l` → integer in [5,8] | End |
| 3 | RPC body updated | Body contains `CASE WHEN a.status='waiting_list' THEN 0 ELSE 1 END` | `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='sync_lead_status_from_attendee'` contains substring | After Step 1 |
| 4 | Trigger exists | `trg_event_status_close_recycle_leads` on `crm_events` | `SELECT 1 FROM pg_trigger WHERE tgname='trg_event_status_close_recycle_leads' AND tgrelid='public.crm_events'::regclass` returns 1 row | After Step 2 |
| 5 | Trigger function exists | `event_status_close_recycle_leads_fn` in `public` | `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='event_status_close_recycle_leads_fn'` returns 1 row | After Step 2 |
| 6 | Demo smoke: `invited` recycles | After closing test event, demo test-lead-A.status='waiting' | Smoke script measures pre/post lead.status | After Step 3 |
| 7 | Demo smoke: `attended` recycles | After closing test event, demo test-lead-B.status='waiting' | Same | After Step 3 |
| 8 | Demo smoke: `registered` does NOT recycle | demo test-lead-C.status unchanged from pre-state | Same | After Step 3 |
| 9 | Demo smoke: `confirmed_verified` does NOT recycle on close (attendee status is `confirmed`/`registered`) | demo test-lead-D.status unchanged | Same | After Step 3 |
| 10 | §3.4 row count | Exactly `BASE_PRIZMA_RECYCLE_TARGETS` + `BASE_DEMO_RECYCLE_TARGETS` = **86** UPDATE rowcount | UPDATE … RETURNING id → 86 rows | After Step 4 |
| 11 | §3.4 post-state | 0 Prizma leads with `status IN ('invited','attended','confirmed','confirmed_verified')` whose ONLY active attendee row is on a closed/completed event with status IN ('invited','attended') | `SELECT COUNT(*) FROM crm_leads l WHERE l.tenant_id=PRIZMA AND l.is_deleted=false AND l.status IN ('invited','attended','confirmed','confirmed_verified') AND NOT EXISTS (...active non-closed attendee...) AND EXISTS (...closed invited/attended attendee...)` → 0 | After Step 4 |
| 12 | §3.2 row count | Number of distinct leads sync was called for = count of Prizma leads with active waiting_list row on any event. Today: small (the original 8 stuck + any new). Hard cap: ≤ 30 leads | `SELECT COUNT(DISTINCT lead_id)` from the sync call set | After Step 5 |
| 13 | §3.2 acceptance (Brief §3.2 verbatim) | `count(Prizma leads.status='waitlist') == count(distinct leads with waiting_list attendee on non-closed/non-completed event)` | `SELECT (SELECT COUNT(*) FROM crm_leads WHERE tenant_id=PRIZMA AND is_deleted=false AND status='waitlist') = (SELECT COUNT(DISTINCT a.lead_id) FROM crm_event_attendees a JOIN crm_events e ON e.id=a.event_id AND e.tenant_id=a.tenant_id WHERE a.tenant_id=PRIZMA AND a.is_deleted=false AND a.status='waiting_list' AND e.status NOT IN ('completed','cancelled') AND e.is_deleted=false) AS equal;` → `true` | After Step 5 |
| 14 | Pre-state snapshot stored | EXECUTION_REPORT.md §2 contains a table with `lead_id, old_status, new_status, source_step` for all rows UPDATEd in Step 4 and Step 5 (≥86 rows) | Inspection of EXECUTION_REPORT.md | End |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` | End |
| 16 | HEAD pushed | `develop` pushed | `git log origin/develop -1 --oneline` matches local HEAD | End |
| 17 | No merges to main | `main` unchanged from session start | `git rev-parse origin/main` matches the value captured at start | End |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo + run any read-only SQL (Level 1).
- Apply the ONE RPC body update via `mcp__claude_ai_Supabase__apply_migration` (Step 1) — Level 3 DDL, but pre-approved in Brief §4.4.
- Apply the ONE trigger + function CREATE via `mcp__claude_ai_Supabase__apply_migration` (Step 2) — Level 3 DDL, but pre-approved in Brief §4.4.
- Run the §3.4 UPDATE on `crm_leads.status` for the 86 (or fewer if drift) matched rows — Level 2 writes, pre-approved in Brief §4.3.
- Run the §3.2 sync RPC calls for the small set of Prizma waiting_list-attendee leads — Level 2 writes, pre-approved in Brief §4.3.
- Create + drop demo test rows (events/attendees/leads) during Step 3 smoke; cleanup must restore demo to pre-Step-3 row counts.
- Commit and push to `develop`. Selective `git add` by filename only.
- Write `EXECUTION_REPORT.md`, `FINDINGS.md` (if any), and (later, in Foreman pass) `FOREMAN_REVIEW.md`.

### What REQUIRES stopping and reporting
- Any DDL beyond the two pre-approved statements (the RPC body update in Step 1 and the trigger+function in Step 2).
- Any UPDATE that touches columns other than `crm_leads.status`.
- Any DELETE other than the demo smoke-test cleanup of rows the executor itself created in Step 3.
- Any attempt to merge to `main`, push to `main`, or rebase a published commit.
- Any §3 success-criterion mismatch.
- Any of the Brief §4.7 stop-triggers (see §5 below).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Cross-contamination check (Brief §4.7).** Before running Step 4 UPDATE, re-run the `BASE_RECYCLE_TARGETS_WITH_ACTIVE_WAITLIST` query. If result > 0 → STOP, the ordering premise has shifted; write an escalation file and halt.
2. **Sanity cap (Brief §4.7).** Before running Step 4 UPDATE, re-run `BASE_PRIZMA_RECYCLE_TARGETS`. If result > 300 → STOP, surface to Daniel.
3. **§3.2 cap.** Before running Step 5 sync, re-run `BASE_PRIZMA_WAITLIST_SYNC_TARGETS` + count of distinct leads. If result > 30 → STOP, surface to Daniel.
4. **Smoke regression (Brief §4.7).** If any of Criteria #6–#9 fails → STOP, do not proceed to Step 4. Diagnose and either rollback via §6 or escalate.
5. **Integrity Gate.** If `npm run verify:integrity` exits 1 (null-byte ERROR) at any commit boundary → STOP, do not commit further.
6. **Iron Rule 32 declaration drift.** If a destructive operation surfaces beyond what §Destructive Operations declares → STOP, escalate via `modules/Module 4 - CRM/escalations/{ISO_TS}_WAITLIST_SYNC_BLOCKER.md`.

---

## 6. Rollback Plan

Single rollback point: the safety tag `pre-waitlist-sync-priority-fix-2026-05-14` at commit `9c36c26`.

- **Code rollback:** `git reset --hard pre-waitlist-sync-priority-fix-2026-05-14`, then `git push --force-with-lease origin develop` ONLY if authorized by Daniel.
- **DB rollback (RPC):** `CREATE OR REPLACE` the RPC with the body captured verbatim in EXECUTION_REPORT.md §1 ("Pre-state RPC body").
- **DB rollback (trigger):** `DROP TRIGGER IF EXISTS trg_event_status_close_recycle_leads ON public.crm_events; DROP FUNCTION IF EXISTS public.event_status_close_recycle_leads_fn();`
- **DB rollback (data):** EXECUTION_REPORT.md §2 captures `(lead_id, old_status, new_status)` for every UPDATEd row in Steps 4 and 5. To revert: `UPDATE crm_leads SET status=:old_status WHERE id=:lead_id` for each row.
- **Notify Foreman; SPEC is marked REOPEN, not CLOSED.**

---

## Destructive Operations

Required by Iron Rule 32. This SPEC authorizes ONLY:

1. **`CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(uuid,uuid)`** — Step 1. Replaces an existing function body. Reversible by re-applying the pre-state body captured in EXECUTION_REPORT.md §1.
2. **`CREATE FUNCTION public.event_status_close_recycle_leads_fn()`** — Step 2. New function, reversible via `DROP FUNCTION`.
3. **`CREATE TRIGGER trg_event_status_close_recycle_leads`** — Step 2. New trigger, reversible via `DROP TRIGGER`.
4. **`UPDATE crm_leads SET status='waiting'`** — Step 4 (§3.4 retroactive recycle). Bounded by the WHERE clause matching the predicate in §0.1 `BASE_PRIZMA_RECYCLE_TARGETS`. Expected affected rows: 86 Prizma + 0 demo. Pre-state captured in EXECUTION_REPORT.md §2 per-row before the UPDATE. Reversible via per-row UPDATE from the snapshot.
5. **`UPDATE crm_leads SET status=:sync_result`** — Step 5 (§3.2 retroactive sync), executed indirectly via `sync_lead_status_from_attendee` RPC calls for each lead carrying an active waiting_list attendee row. Expected affected rows: ≤30. Pre-state captured per row before each call. Reversible per-row.
6. **DEMO smoke test cleanup (Step 3):** DELETE of demo rows (`crm_event_attendees`, `crm_events`, `crm_leads`) that the executor itself created in Step 3. Bounded to rows whose IDs are captured by the create-step in EXECUTION_REPORT.md §3.

**Explicitly forbidden** for this SPEC's run (the gate denies them):
- Any other `DROP`, `ALTER TABLE`, `TRUNCATE`, `REVOKE`.
- Any UPDATE that touches columns other than `crm_leads.status`.
- Any DELETE from `crm_leads`, `crm_events`, or `crm_event_attendees` for rows not created by Step 3 smoke.
- Any merge/push/force-push to `main`.
- Any `git rebase`, `git reset --hard` on published commits (other than via §6 rollback under Daniel authorization).

---

## 7. Out of Scope (explicit)

- **EF code changes.** `event-register`, `quick-register`, and `automation-engine/post-actions.ts` are NOT modified. They already call sync on every code path (per investigation §1) — they pick up the new RPC body automatically.
- **UI changes.** `crm-leads-tab.js`, `crm-helpers.js`, `crm-attendee-move.js` are not touched. The TIER2_STATUSES array already includes `'waitlist'`.
- **Auto-move branch in `register_lead_to_event`.** Investigation §6 #4 flags that the auto-move branch doesn't call sync. Out of scope for this SPEC — Daniel may file a follow-up.
- **`move_attendee_between_events`.** Same as above.
- **Duplicate `event_waiting_list` notification.** Investigation §6 #1 flags it. Out of scope.
- **Soft-deleted lead pile-up.** Investigation §6 #3. Out of scope.
- **Customer/purchased recognition.** Brief Decision #5. Future SPEC.
- **Periodic pg_cron full re-sync.** Investigation §6 #5. Out of scope.

Subset relationship note: the recycle trigger's predicate (`status IN ('invited','attended')` AND `event.status IN ('closed','completed')`) is intentionally a SUBSET of "all attendee rows on the closing event" — only 2 of the 9 attendee statuses recycle. Per Brief Decision #4, that subset is the entire authorized scope.

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/SPEC.md` (this file).
- `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/EXECUTION_REPORT.md` (executor writes).
- `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/FINDINGS.md` (executor writes if any findings).
- `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` (foreman writes after).

### DB state (after Step 2)
- RPC `public.sync_lead_status_from_attendee(uuid,uuid)` body contains the new priority CASE.
- Function `public.event_status_close_recycle_leads_fn()` exists.
- Trigger `trg_event_status_close_recycle_leads` AFTER UPDATE OF `status` ON `public.crm_events` FOR EACH ROW WHEN `(OLD.status NOT IN ('closed','completed') AND NEW.status IN ('closed','completed'))` exists.
- Two Supabase migrations are recorded (one per DDL operation) — names per §9 commit plan.

### DB state (after Step 4)
- 86 Prizma `crm_leads` rows have `status='waiting'` (was: 84 'invited' + 2 'confirmed'). 0 demo rows changed.

### DB state (after Step 5)
- All Prizma leads carrying a `waiting_list` attendee row on a non-closed/non-completed event have `lead.status='waitlist'`. With current baselines, 0 such leads exist → 0 leads change status to waitlist; sync RPC called 0 times. If new such leads arise between Step 4 and Step 5 measurement, sync handles them correctly per the new priority logic.

### Docs updated (MUST include)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — append a one-line entry under "Recent SPECs" referencing this SPEC + date.
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — append a section for this SPEC with the commit hashes.
- `docs/GLOBAL_MAP.md` — Integration Ceremony deferred (this is a hotfix-style SPEC, not a phase close); will be merged at the next Module 4 phase close. Note this deferral in the SESSION_CONTEXT entry.
- `docs/GLOBAL_SCHEMA.sql` — same deferral.

### Build-side-effects
- None. No npm build, no codegen, no generated files.

---

## 9. Commit Plan

Target 5–7 commits, cap 8. The executor groups as follows; commit messages must use `type(scope): description` format with English text.

1. **`feat(spec,m4): open M4_WAITLIST_SYNC_PRIORITY_FIX SPEC`** — add this SPEC.md.
2. **`feat(rpc,m4): sync_lead_status_from_attendee waitlist precedence (§3.1)`** — applies the RPC body update via Supabase migration. Includes the pre-state body comment block at the top of the migration so the diff is self-contained.
3. **`feat(trigger,m4): event-close recycle leads to waiting (§3.3)`** — applies the new trigger + function via Supabase migration.
4. **`test(m4): demo smoke for event-close recycle trigger (§3 Step 3)`** — captures the smoke test results into EXECUTION_REPORT.md §3. (Smoke creates + tears down demo rows; the test artifact lives in EXECUTION_REPORT.md only — no new test script files.)
5. **`chore(m4): retroactive recycle past Prizma+Demo closed events (§3.4)`** — runs the §3.4 UPDATE. The commit message body includes the affected row count (86) and the pre-state snapshot is appended to EXECUTION_REPORT.md §2.
6. **`chore(m4): retroactive waitlist sync for Prizma (§3.2)`** — runs the §3.2 sync RPC calls. Commit body cites the count.
7. **`chore(spec,m4): close M4_WAITLIST_SYNC_PRIORITY_FIX with retrospective`** — writes EXECUTION_REPORT.md (final), FINDINGS.md (if any), updates SESSION_CONTEXT.md + CHANGELOG.md.

If commits 5 and 6 produce zero DB writes (which can happen if reality has drifted since SPEC authoring), the commit message body explicitly states "zero rows affected — measured baseline matched the new state" and the commit still goes in for the audit trail. Min commit count remains 5 (commits 1, 2, 3, 4, 7); commits 5 and 6 are conditionally minimal but expected.

A Foreman commit (commit #8 if used) is added by the Foreman pass that writes FOREMAN_REVIEW.md.

---

## 10. Dependencies / Preconditions

- Branch `develop`, repo `opticalis/opticup`, machine 🖥️ Windows desktop.
- Safety tag `pre-waitlist-sync-priority-fix-2026-05-14` exists at `9c36c26` and is pushed to origin. ✓ (verified at SPEC authoring time)
- Supabase MCP available with project_id `tsxrrxzmdxaenlvocyit` reachable. ✓
- Iron Rule 31 integrity gate green at session start. Executor confirms.
- No browser/QA required — verification is entirely SQL-level. Skip Chrome readiness check.

---

## 11. Lessons Already Incorporated

- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` (Author Proposal #1, 2026-05-13) → "every numeric baseline derived from live measurement, not memory" → APPLIED in §0.1.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` (Author Proposal #1) → "Use `## N. Title` plain headings; no `§` prefix in heading text — Iron Rule 32 hook regex" → APPLIED throughout.
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` (Author Proposal #2) → "Survey pre-existing untracked files at SPEC authoring; selective git add by filename throughout" → APPLIED in §0.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` (Author Proposal #1) → "Color-form completeness for visual re-skin" → NOT APPLICABLE (no visual re-skin).
- FROM `WAITLIST_FLOW_INVESTIGATION_BRIEF.md` (predecessor) → "Pre-commit to decision criteria before running data queries" → APPLIED: §3 success criteria define exact post-state values; §5 stop-triggers list pre-conditions that, if violated, halt before destructive action.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + (if any findings) FINDINGS.md written in the SPEC folder.
- [ ] SESSION_CONTEXT.md + CHANGELOG.md updated.
- [ ] FOREMAN_REVIEW.md written by the Foreman pass after executor close.
- [ ] No commits to `main`; `main` ref unchanged from session start.
