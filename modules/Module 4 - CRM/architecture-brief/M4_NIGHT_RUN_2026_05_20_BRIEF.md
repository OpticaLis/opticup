# M4_NIGHT_RUN_2026_05_20 — Architecture Brief

> **Status:** Brief sealed 2026-05-20 evening · Owner: Architect · Pipeline: Full-Auto OVERNIGHT (worktree-isolated)
>
> **One-line:** 3-wave overnight run. Wave 1 (Resend Failed Messages button + Skill Harvest + M4 DB-sweep), Wave 2 (Dispatch-queue advisory-lock + retry mechanism + 3 audit-finding cleanups), Wave 3 bonus (migrations git-drift baseline). Every deliverable is DB-verifiable or doc-only — NO Chrome MCP needed, NO Daniel decisions needed. Chrome UI verification deferred to a dedicated morning session.
>
> **Risk class:** MEDIUM. Touches frontend + 1 EF + scoped DB writes + doc. All changes additive or scoped. Cross-Module Safety Audit §4 binding.
>
> **Grounding:** Built on `_archive/pre-night-audit-2026-05-20/AUDIT_REPORT.md` — 0 blockers, 5 medium findings (all addressed below as constraints), 6 low findings.

---

## 1. Goal

Advance the project toward marketing-funnel completeness in a single autonomous overnight run, executing only work that can be verified WITHOUT a browser (the autonomous session has no Chrome MCP — that limitation caused 3 regressions today that only Daniel's manual verification caught). Every deliverable here is provable via DB queries, smoke tests, or doc-diffs. UI verification happens in a dedicated morning Chrome session.

After this run:
- Operators can resend failed messages safely (with failure-class filtering).
- The SMS rate-limit bug-class is structurally eliminated (advisory lock + retry).
- 16 accumulated skill lessons are codified into SKILL.md files.
- 3 audit-finding cleanups done (stale broadcasts, queue cleanup job, DB error triage).
- M4 documentation refreshed (SESSION_CONTEXT + MODULE_MAP).
- (Bonus) migrations git-drift baseline established.

## 2. Background

**Today's context:** 5 merges to main, FUNNEL Phase 2 + 2.5 complete, SMS rate-limit P0 recovered (1,179/1,179 delivered), short-links redesign shipped after catching 3 regressions in-thread via Daniel's manual Chrome verification.

**The audit (read-only, completed 2026-05-20 16:30 UTC) found 0 blockers.** Its 5 medium findings are now constraints baked into this Brief's deliverables. Its 6 low findings are addressed where relevant.

**Why night-run is safe now:** the audit established a clean regression baseline (16/16 M4 flows PASS at DB level). Any deviation tonight is detectable against that baseline.

**Why no Chrome tonight:** autonomous sessions can't drive a browser. Per today's hard lesson (3 silent regressions), UI-touching changes get DB-level verification tonight + Daniel's Chrome verification in the morning.

## 3. Scope — 3 Waves, 8 deliverables

Waves run in order. Skip-not-stop WITHIN a wave. If a wave can't complete, the next wave still runs (waves are independent). Quality over speed — no time cap.

---

### WAVE 1 — Core deliverables

#### W1.1 — Resend Failed Messages Button

**What:** A "שלח שוב" button on failed-status rows in (a) crm_messaging_log + (b) crm_messaging_queue. Click → writes the row back to status='queued' so the dispatcher re-sends it. Per Daniel's earlier decision: route THROUGH the queue (not synchronous send).

**Audit-finding constraints (MANDATORY):**
- **F-M04-1 (idempotency):** re-queued rows MUST set `run_id=NULL` (or use INSERT ON CONFLICT) to avoid clashing with `uq_crm_message_queue_idem` on the original sent row.
- **F-M04-2 (failure-class gating):** the button MUST classify failure types. The 758 historical `unsubstituted_placeholder: registration_url` failures on Prizma will FAIL AGAIN if resent blind. Resend is ENABLED only for resendable classes (transient SMS-provider errors, rate-limit failures). Resend is DISABLED (greyed + tooltip) for template-validation failures (`unsubstituted_placeholder`, `payment_url_mismatch`) — those need template fixes first, not resends.
- **F-M01-1 (index):** add `(tenant_id, status, created_at)` index on crm_message_log in same migration.
- **F-M04-3 (audit log):** the resend action MUST write a `crm_audit_log` entry (action: `crm.message.resend`).
- **F-M08-2 (stale docs):** update M4 SESSION_CONTEXT + MODULE_MAP in the same commit.

**Pagination:** 762 failed Prizma rows → button list needs paging (per audit).

**Confirmation:** bulk resend (resend-all-failed-in-broadcast) shows a confirmation modal: "X messages will be re-queued. Y are non-resendable (template errors) and will be skipped. Continue?"

**Cross-module safety:** touch ONLY modules/crm/crm-messaging-log.js + crm-messaging-broadcast-queue.js (or queue-live view file) + 1 migration for the index. NO EF changes, NO automation-engine touch.

#### W1.2 — Skill Harvest (16 proposals)

**What:** Apply the 16 accumulated FOREMAN_REVIEW proposals + 5 session patterns (A-E) to the skill files. Per audit Mission 2: all 16 confirmed not-yet-applied, no contradictions.

**Targets:**
- `.claude/skills/opticup-architect/SKILL.md` — Steps 0.7/0.8/0.9/0.10 (Live-State Probe, Line-Budget Buffer, User Memory Compliance, Plain-Language Rule) + any P-AUTHOR proposals.
- `.claude/skills/opticup-executor/SKILL.md` — Steps 1.5.6/1.5.7 (DB Probe Pre-Flight, SECURITY DEFINER Rehearsal) + P-EXEC-3/4/5.
- `docs/CONVENTIONS.md` — bot-vs-action metric rule + biggest-tenant-probe rule.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — harvest cross-module entry + apply the pending STOREFRONT_PUBLIC_DATA_LAYER entry from `_archive/architect-pending-entries/` (consume + delete it per PENDING_ENTRIES_AUTO_RESOLUTION mechanism).

**Execution order:** opticup-executor SKILL → opticup-architect SKILL → CONVENTIONS.md → DECISIONS_LOG → consume pending entries.

**Doc-only. Zero code, zero DB, zero EF.**

#### W1.3 — M4 DB-level regression sweep

**What:** Re-run the audit's Mission 3 DB-state checks AFTER W1.1 + W1.2 land, to confirm nothing regressed. Same 16 scenarios, DB-evidence only (Chrome deferred to morning).

**Output:** sweep report comparing post-change DB state to the audit baseline. Any divergence → flag.

---

### WAVE 2 — Hardening

#### W2.1 — Dispatch-queue advisory-lock + retry mechanism

**What:** The structural fix for the SMS rate-limit bug class. Today's `batchSize=15` is a band-aid. This adds:
- **Postgres advisory lock** in dispatch-queue EF so only ONE cron invocation processes the queue at a time (eliminates the 4×-concurrent-tick overlap that caused rate-limit).
- **Retry mechanism:** failed rows (transient errors only — same classification as W1.1) auto-retry with exponential backoff, up to N attempts, then mark permanently-failed.
- **`retries` column increment fix** (audit F-M08-1 hinted at `column "attempts" does not exist` — verify the actual retry-count column name first; the dispatch-queue catch block has a missing increment per yesterday's SMS investigation).

**Audit constraint F-M08-1:** before touching dispatch-queue, triage the two ~04:04 UTC DB errors (`column "attempts" does not exist` + `column "event_type" does not exist`). Confirm the actual column names so the retry increment targets the right column.

**Cross-module safety:** touch ONLY supabase/functions/dispatch-queue/index.ts + possibly 1 migration if a retry-tracking column is missing. NO send-message EF, NO automation-engine.

**DB-verifiable:** create test queue rows on demo, simulate concurrent ticks, verify advisory lock serializes them + retry increments correctly.

#### W2.2 — F-M04-4: Clean 3 stale queued broadcasts

**What:** 3 broadcasts on Prizma stuck in 'queued' for 7-8 days, never dispatched. Mark them 'cancelled' (NOT delete). Scoped UPDATE with explicit broadcast IDs.

**Cross-module safety:** 1 scoped UPDATE on crm_broadcasts, explicit IDs, tenant-scoped. Snapshot before. Iron Rule 32 declared.

#### W2.3 — F-M06-1: crm_message_queue cleanup job

**What:** crm_message_queue accumulates sent rows indefinitely (4.2 MB). Add a pg_cron job that archives/deletes sent rows older than 90 days (keep recent for the resend button + dashboards). Rolling window, not permanent archive.

**Cross-module safety:** 1 new pg_cron job + 1 cleanup function. NO change to dispatch logic. Sent rows older than 90 days only — recent rows untouched (resend button needs them).

#### W2.4 — F-M08-1: DB error triage report

**What:** Root-cause the two ~04:04 UTC errors. Document findings. If they're benign → note. If they indicate a real bug → write a finding for a follow-up SPEC (don't fix tonight unless trivial + DB-verifiable).

---

### WAVE 3 — Bonus (only if time + context remain)

#### W3.1 — Migrations git-drift baseline (TD-2)

**What:** 31+ MCP-applied Supabase migrations since March 2026 are NOT in git (SaaS-blocker per memory `project_migrations_git_drift`). Establish a baseline: `pg_dump` the current schema → commit as `migrations/baseline_2026_05_20.sql` → document the drift-prevention policy. Does NOT retroactively reconstruct individual migrations — just captures current state as the new baseline.

**Cross-module safety:** read-only pg_dump + 1 new file commit. NO schema changes. NO migration replay.

**If Wave 3 can't start (context/time) → skip entirely. It's bonus.**

### Out of scope (explicit — deferred to morning or separate SPECs)

- Dual-pixel deploy (needs Daniel's pixel ID + token decision — morning).
- Campaign team 6-role skill creation (design ready at `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md`; needs Daniel's Recommend-Only vs read-only decisions — morning).
- Playwright automated browser testing setup (separate SPEC — eliminates the no-Chrome limitation permanently).
- Any Chrome MCP UI verification (morning session).
- Component A relocation from funnel to campaigns (Daniel decided: leave as-is, deleted from backlog).
- M4_LEAD_INTAKE_409 (demo storefront — separate SPEC; production works).
- M4_LEAD_RESTORE_HELPER (separate SPEC).
- M4_BRIEF_TAXONOMY_REFRESH (separate SPEC).

## 4. Cross-Module Safety Audit (BINDING)

### 4.1 What this run touches

| Surface | Access | Wave |
|---|---|---|
| modules/crm/crm-messaging-log.js | MODIFY | W1.1 |
| modules/crm/crm-messaging-broadcast-queue.js (or queue-live file) | MODIFY | W1.1 |
| 1 migration: index on crm_message_log | CREATE INDEX | W1.1 |
| crm_message_log, crm_message_queue | READ + scoped status UPDATE (resend) | W1.1 |
| crm_audit_log | INSERT (resend audit entry) | W1.1 |
| .claude/skills/opticup-architect/SKILL.md | MODIFY | W1.2 |
| .claude/skills/opticup-executor/SKILL.md | MODIFY | W1.2 |
| docs/CONVENTIONS.md | MODIFY | W1.2 |
| .claude/skills/opticup-architect/references/DECISIONS_LOG.md | MODIFY | W1.2 |
| _archive/architect-pending-entries/ | DELETE consumed entry | W1.2 |
| supabase/functions/dispatch-queue/index.ts | MODIFY + deploy | W2.1 |
| 1 migration: retry column (if missing) | possibly CREATE COLUMN | W2.1 |
| crm_broadcasts | scoped UPDATE (3 stale rows → cancelled) | W2.2 |
| 1 pg_cron job + cleanup function | CREATE | W2.3 |
| migrations/baseline_2026_05_20.sql | CREATE (pg_dump output) | W3.1 |
| M4 SESSION_CONTEXT + MODULE_MAP | MODIFY | W1.1 |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed |
|---|---|
| send-message EF | not touched |
| automation-engine EF | not touched |
| fb-capi-dispatch EF | not touched |
| pixel-fired EF | not touched |
| lead-intake / submit-lead EF | not touched |
| crm_automation_rules | not touched |
| crm_message_templates | not touched |
| crm_status_change_events | not touched |
| crm_capi_dispatch_queue | not touched |
| All M4 DB triggers | not touched |
| All non-M4 modules (M1/M2/M3/M5+) | not touched |
| storefront repo | not touched |
| crm_statuses, crm_leads (except resend-related status reads) | not touched beyond declared |

### 4.3 Iron Rule enforcement
- IR21: every new object grep'd against existing before creation.
- IR22: every `.select()`/`.update()` chains `.eq('tenant_id', tid)`.
- IR32: declared destructive ops = (a) W2.2 scoped UPDATE on 3 broadcast rows; (b) W1.2 delete of consumed pending-entry file. ALL OTHER destructive ops forbidden.
- IR34: UI-touching W1.1 gets DB-level verification tonight + a flag in FOREMAN_REVIEW that Chrome verification is PENDING Daniel's morning session. Do NOT claim 🟢 on W1.1 UI — claim 🟡 PENDING-CHROME.
- IR35: NO new template placeholders, trigger types, or action types.

### 4.4 Stop-trigger
If executor needs to touch anything in §4.2, or perform a destructive op not in §4.3 → STOP, write escalation, halt that wave (other waves continue).

## 5. Worktree Isolation Protocol — MANDATORY

```bash
cd C:\Users\User\opticup
git fetch origin
git worktree add C:\Users\User\opticup-night-0520 claude/m4-night-run-2026-05-20 origin/main
cd C:\Users\User\opticup-night-0520
git fetch origin develop
git merge origin/develop --ff-only
```

ALL work in `C:\Users\User\opticup-night-0520`. Do NOT touch `C:\Users\User\opticup\`. Do NOT push to develop directly — push to `claude/m4-night-run-2026-05-20`. At end: open PR to develop.

## 6. Pipeline

Full 5-hat Pipeline per wave where code is involved:
- W1.1 (code+DB): Foreman → Executor → Reviewer → (DB-verify, no Chrome) → Foreman close.
- W1.2 (doc): Light — Foreman → Executor → Foreman.
- W1.3 (read-only verify): Localhost-Tester DB checks.
- W2.1 (EF+DB): Foreman → Executor → Reviewer → DB-verify → Foreman.
- W2.2/W2.3/W2.4 (DB+cleanup): Executor + Foreman review.
- W3.1 (bonus): Executor + Foreman.

**Model:** Sonnet for executor work; Opus for Foreman SPEC authoring + closure.

## 7. Success Criteria

1. W1.1: Resend button exists on log + queue failed rows, classifies failure types, sets run_id=NULL on re-queue, writes audit log, paginated, index created. DB-verified resend of a transient-failure test row succeeds. UI marked 🟡 PENDING-CHROME.
2. W1.2: All 16 proposals + 5 patterns applied to skill files + CONVENTIONS.md. Pending entry consumed + deleted. DECISIONS_LOG updated.
3. W1.3: Post-change DB sweep matches audit baseline (16/16) OR divergences flagged.
4. W2.1: Advisory lock serializes concurrent dispatch ticks (DB-verified). Retry increments correctly. batchSize band-aid can stay or be reverted per executor judgment.
5. W2.2: 3 stale broadcasts marked cancelled (snapshot saved).
6. W2.3: pg_cron cleanup job exists, targets sent rows >90 days only.
7. W2.4: DB error triage documented.
8. W3.1 (if reached): baseline schema dump committed.
9. Smoke 8/8 PASS after each code wave.
10. IR31 + IR32 gates pass every commit.
11. Cross-Module Safety §4 holds.
12. PR opened to develop. NOT main.
13. Short English status line + per-wave 🟢/🟡/⏭️ summary.

## 8. Stop-Triggers

- Worktree creation fails / wrong directory.
- Write outside worktree or push to develop.
- §4.4 violation (untouchable surface or undeclared destructive op).
- IR31 fails.
- Smoke regresses below 8/8.
- W2.1: advisory lock causes dispatch to stall (queue not draining) → revert W2.1, keep batchSize band-aid, flag.
- Resend test (W1.1) generates a NEW unsubstituted_placeholder failure → means failure-class gating is broken → STOP W1.1, fix gating.

Per-wave isolation: a hard-stop in one wave halts THAT wave; subsequent waves still run.

## 9. Rollback Plan

Worktree-based. `git worktree remove --force` + `git branch -D` + remote delete. develop + main untouched until Daniel merges PR. Per-deliverable rollback: each wave is its own commit group, individually revertable.

## 10. Expected Final State

- Branch `claude/m4-night-run-2026-05-20` ahead of main by ~10-18 commits.
- PR open to develop.
- Resend button live (UI pending Daniel's Chrome verify).
- dispatch-queue hardened with advisory lock + retry.
- 16 skill lessons codified.
- 3 audit cleanups done.
- (Bonus) migrations baseline.
- Worktree at C:\Users\User\opticup-night-0520.
- Parallel C:\Users\User\opticup\ untouched.

## 11. Commit Plan (indicative)

- C1-C2: W1.1 resend button (code + migration) + doc updates.
- C3: W1.2 skill harvest.
- C4: W1.3 sweep report.
- C5: W2.1 dispatch-queue hardening.
- C6: W2.2 + W2.3 + W2.4 (cleanups).
- C7: W3.1 bonus (if reached).
- C8: per-wave FOREMAN_REVIEWs + SESSION_REPORT.

## 12. Cross-References

- `_archive/pre-night-audit-2026-05-20/AUDIT_REPORT.md` — THE grounding document.
- `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` — for tomorrow's team SPEC.
- Today's 3 FOREMAN_REVIEWs (skill proposals source).
- Memory: `feedback_probe_biggest_production_tenant`, `feedback_clicks_are_not_actions`, `project_migrations_git_drift`.
- Iron Rules 12, 21, 22, 31, 32, 34, 35.

## 13. Author Notes

This run does everything that is safe to do without a browser. It deliberately defers everything that needs Daniel's eyes (Chrome UI verify) or Daniel's decisions (pixel, team) to the morning.

The highest-value item is W2.1 (dispatch-queue advisory lock + retry) — it permanently eliminates the bug class that cost 325 failed SMS this morning. The resend button (W1.1) gives Daniel the operational tool he asked for. The skill harvest (W1.2) banks the day's hard-won lessons so they never recur.

Morning agenda after this run: (1) Daniel Chrome-verifies the resend button, (2) dual-pixel SPEC, (3) campaign team skill creation SPEC, (4) Playwright setup SPEC (eliminates the no-Chrome limitation permanently).

---

*End of Brief. Activation Prompt in sibling file `M4_NIGHT_RUN_2026_05_20_ACTIVATION_PROMPT.md`.*
