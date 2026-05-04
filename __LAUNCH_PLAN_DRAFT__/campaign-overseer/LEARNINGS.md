# Campaign Overseer — LEARNINGS

> **Purpose:** self-improvement log. Each entry captures an observed mistake plus the rule extracted to prevent recurrence.
> **Authority:** rules logged here are binding on every future Overseer session.
> **Update discipline:** append-only. Newest at top. Do NOT delete past entries — even superseded ones are evidence of pattern evolution.

---

## L-004 — Probe schema BEFORE writing a SPEC that depends on a column existing

**Date:** 2026-05-04 late night
**Mode at the time:** Foreman Hat (opticup-strategic loaded in-session)

**Trigger incident.** I authored RESTORE_DELETED_EVENT_UI SPEC §3.5 around the assumption that `crm_event_attendees.updated_at` exists and is touched at delete-time, enabling timestamp-based "restore only what was cascade-deleted at the same instant." Daniel asked me to "check yourself properly using the strategic skill" before he ran Claude Code. I queried `information_schema.columns` and discovered `crm_event_attendees` has only `created_at` and `is_deleted` boolean — no `updated_at`, no `deleted_at`. The original SPEC was infeasible as written.

I had to rewrite the SPEC (Approach A=add column, B=capture IDs in audit details, C=event-only restore). Daniel chose B. The rewrite cost ~30 minutes of authoring time but no executor time was wasted (caught pre-dispatch).

**Cost of the incident.** Zero — Daniel's gate prevented bad dispatch. But this was the second SPEC in 24 hours where a column-existence assumption proved wrong (DELETE_EMPTY_EVENT §3.13 referenced a `crm_activity_log` table that doesn't exist; actual is shared `activity_log`).

---

### Rule (binding on every Overseer/Foreman SPEC)

When a SPEC's success criteria, RPC body, or commit plan depends on a column / table / RPC / function existing, the author MUST verify each dependency via `information_schema.columns` / `information_schema.routines` / `pg_get_functiondef` BEFORE writing §3 Success Criteria.

**Concrete check before §3 is written:**

1. **List every named DB object the SPEC will read or write:** tables, columns, RPCs, views, triggers, indexes.
2. **For each item, run a probe:**
   - Tables: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='<name>';`
   - Columns: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='<table>' AND column_name='<col>';`
   - RPCs/functions: `SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name='<name>';` + `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='<name>';` for body inspection.
3. **If a probe returns no row** — the SPEC's plan must explicitly account for it: either add a migration to create the missing object, or pivot the design.
4. **If a probe returns row(s) but with different shape than assumed** — quote the actual shape in §2 Verified Evidence and adjust §3 to match.

A SPEC that fails any probe AT AUTHOR TIME but cites the assumed shape in §3 is not ready for dispatch. Mid-execution discoveries cost executor time and erode trust.

---

### Why this matters (the meta-pattern)

This is **Pattern 14 (verify before acting) applied to Foreman authoring discipline.** The Overseer/Foreman normally treats Pattern 14 as a rule for write actions and dispatch decisions. SPEC authoring is also a write action — it spends executor cycles, makes promises about live system state, and creates expectations that the codebase will accept the SPEC's plan. A SPEC that lies about the schema is itself a broken artifact, regardless of how well-formatted the rest looks.

**The compound risk:** once a SPEC ships and the executor starts work, mid-flight discovery of a shape mismatch forces a SPEC rewrite at the worst possible time (executor blocked, partial work done, decisions need rolling back). Catching at author time costs ~5 minutes of probing; catching at execution time costs an hour of recovery + rewrite.

---

### Combined with L-001, L-003

- **L-001:** verify infrastructure + test-data preconditions BEFORE pushing a QA prompt.
- **L-003:** verify ground-truth state BEFORE trusting HANDOFF claims about partial-SPEC progress.
- **L-004 (this rule):** verify SCHEMA-level facts BEFORE writing §3 Success Criteria.

All three are the same principle (Pattern 14 — verify before acting) applied to different write surfaces of the Overseer/Foreman job: QA dispatch, state tracking, and SPEC authoring.

---

*End of L-004.*

---

## L-003 — Verify ground truth (git + Supabase + filesystem) before trusting any HANDOFF or SESSION_CONTEXT claim about partial-SPEC state

**Date:** 2026-05-04 (resume session)
**Mode at the time:** RECOMMEND-ONLY (v1)

**Trigger incident.** Daniel asked how to resume M4 work. The HANDOFF I read at session start claimed:
- SPEC #1 (`ATOMIC_CONFIRMATION_FLOW`): "Part A done, Part B Step B.1 deployed as v5, B.2 done, B.3 blocked on Supabase platform error."
- SPEC #2 (`ATTENDEE_COUNTER_DISPLAY_FIX`): "queued, ACTIVATION_PROMPT authored, waiting for SPEC #1 to close."

Daniel pushed back: "הסשן הקודם נתקל בשגיאה ולא עידכן כל מה שהוא עשה. תוודא קודם בדיוק איפה הוא עצר ותמשיך."

I ran ground-truth checks (git log on develop, ls on the SPEC folders, `list_edge_functions` via Supabase MCP, grep on the EF source) and found that BOTH HANDOFF claims were materially wrong:
- **SPEC #1:** v5 = Part A only (NOT Part A + B.1). B.1 source-side commit landed, but EF deploy failed 3 times in the prior session — the prior session crashed before updating the HANDOFF, so the HANDOFF still claimed B.1 was deployed. Supabase ground truth: `automation-engine` version=5, `updated_at` predates all deploy attempts.
- **SPEC #2:** fully CLOSED. 6 commits on origin/develop, EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW all written. The "queued" status in HANDOFF was stale by the time I read it — the same prior session that failed to update SPEC #1's status had successfully closed SPEC #2 in parallel.

**Cost of the incident.** If I had trusted the HANDOFF and dispatched a Claude Code session to "retry the deploy because the block lifted," the executor would have found the actual block still active, attempted a deploy anyway (4th cumulative failure), and likely produced confusing output. I would also have reported "SPEC #2 queued" to Daniel when it was already closed — making him think there was more work pending than there really was.

The Daniel-pushback corrected this before any false dispatch. But the underlying lesson is structural: HANDOFF files are written by sessions that may crash or be interrupted before they're consistent; treating them as truth is unsafe.

---

### Rule (binding on every Overseer session at start)

When the user references work-in-progress — "where did the previous session stop?", "continue SPEC X", "we were in the middle of Y" — the Overseer MUST verify ground truth before reporting any status to Daniel or dispatching any new work. Verification means:

**(1) Git state.** `git log --oneline -20` on the relevant branch. Look for commits that match the work being claimed. If the HANDOFF says "X was done in commit Y", the commit must exist; if it says "deploy succeeded", a corresponding source commit must exist AND the deploy target must be checked separately.

**(2) Filesystem state.** `ls -la` on the SPEC folder. Each lifecycle stage has its mandatory artifact:
- SPEC authored → `SPEC.md` exists.
- Execution started → `ACTIVATION_PROMPT.md` exists.
- Execution closed → `EXECUTION_REPORT.md` + `FINDINGS.md` exist.
- Foreman reviewed → `FOREMAN_REVIEW.md` exists.

A SPEC claimed "in progress" without an EXECUTION_REPORT is a SPEC where the executor crashed, was interrupted, or is genuinely paused — investigate which. A SPEC with all 4 files is closed regardless of HANDOFF wording.

**(3) External system state.** For any claim involving deploys (Supabase EF, Vercel, GitHub Pages, Make scenarios), query the external system directly:
- Supabase EF: `list_edge_functions` — match the version number to what HANDOFF claims.
- Vercel: deployment status by ID/URL.
- GitHub Pages: head commit on `main` vs HANDOFF's claimed commit.
- Make scenarios: `executions_list` for activity timestamps.

If the external system disagrees with HANDOFF — external system wins, every time.

**(4) HANDOFF metadata.** Look at the "Last meaningful update" timestamp in HANDOFF. If it predates the most recent commits on develop OR the most recent EF deploy, the HANDOFF is by definition stale. Even a HANDOFF that claims to be fresh might be stale; the timestamp + git-log comparison is the only reliable check.

**Order of operations on session start:**
1. Read HANDOFF (for orientation, NOT as source of truth).
2. Run ground-truth checks (1)–(4) above on every claim relevant to the user's question.
3. If HANDOFF and ground truth disagree → report the disagreement to Daniel + correct the HANDOFF in the same response (don't leave the bad text live).
4. Only then propose next steps.

---

### Why this matters (the meta-pattern)

This is **Pattern 14 (verify before acting) extended to Overseer state-tracking.** The Overseer treats HANDOFF as a journal it owns; but it's a journal that can be interrupted mid-write. The fail-safe is the codebase + the external systems — they don't lie because they aren't sequenced narratives.

The risk of skipping this check is asymmetric: the cost of running 4 verify commands is 30 seconds; the cost of dispatching work based on stale state is potentially hours of wasted Claude Code cycles + customer-data risk + Daniel-confidence erosion.

---

### Combined with L-001

L-001 said: verify infrastructure + test data BEFORE dispatching a QA prompt. L-003 extends this: verify SPEC state + deploy state BEFORE dispatching ANY resume prompt. Same principle, broader scope: Pattern 14 applies to any write-class action by the Overseer, including dispatch-class actions.

---

*End of L-003.*

---

## L-002 — Load `opticup-strategic` skill IN-SESSION when authoring a SPEC, instead of escalating to a separate Supervisor chat

**Date:** 2026-05-02 night (Israel)
**Mode at the time:** RECOMMEND-ONLY (v1)

**Trigger incident.** During Phase 2, two follow-up scope items emerged that needed SPECs (D-5 post-cutover event_type architecture; D-6 pre-cutover schema add + form rewire). My instinct was: "SPECs aren't my job — escalate to the Supervisor (Strategic Chat) so they can author." I drafted a recommendation to do exactly that.

Daniel pushed back: I don't need to escalate to a separate Strategic chat to get SPECs written. The `opticup-strategic` skill is available to my session as a loadable skill. When SPEC authoring is needed, I should **load that skill in-session** — its discipline (architecture knowledge, Iron Rule fluency, risk analysis, deliverable structure) becomes available to me, and I produce the SPEC under that mode.

**Rule (binding):** when SPEC authoring is needed inside a Campaign Overseer session:

1. **DO NOT escalate to a separate Strategic chat by default.** Escalation is reserved for cases that genuinely need a Tier-1 architect's perspective (cross-module decisions, new Iron Rules, repository architecture changes).
2. **DO load the `opticup-strategic` skill in-session** via the Skill tool, then author the SPEC under that skill's discipline (folder-per-SPEC at `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/`, with SPEC.md + ACTIVATION_PROMPT.md per the protocol).
3. **Restore Campaign Overseer mode** after the SPEC ships by simply continuing the conversation in this skill's normal pattern. Loading a skill doesn't replace identity — it adds capability.

**Why this matters.** Escalating to a separate Strategic chat introduces: latency (Daniel must paste the request, wait for response, paste back), context loss (the Strategic chat doesn't have the live conversation context that motivated the SPEC), and higher overhead than the situation warrants for small-scope SPECs (e.g., one column add + one EF wire). Loading the skill in-session keeps the work tight and the context intact.

**When to still escalate to a separate Strategic chat:**
- SPECs that touch multiple modules simultaneously and need a holistic architectural view.
- Decisions that propose Iron Rule changes.
- Repository structure / branch strategy changes.
- When the Foreman's review is needed AFTER the SPEC executes (closing the lifecycle).

**Cost of mis-escalating (this incident):** would have added a context-paste round-trip + delayed the D-6 SPEC by an unknown amount, on a weekend before a Sunday cutover. Avoidable.

---

## L-001 — Verify infrastructure + test-data preconditions BEFORE pushing a QA prompt to Claude Code

**Date:** 2026-05-02 evening (Israel)
**Mode at the time:** RECOMMEND-ONLY (v1)

**Trigger incident.** Authored a comprehensive 12-scenario E2E QA activation prompt for Claude Code, targeting the LIVE Prizma tenant pre-cutover. Claude Code executed the prompt, ran 3 scenarios (S1, S2, S3), surfaced two findings flagged as cutover-blocking:

- **F1 (CRITICAL):** the storefront SuperSale form posts to the legacy `/api/leads/submit` (Make/WordPress webhook) instead of the new `lead-intake` Edge Function. Conclusion: zero leads, zero SMS, customers invisible to the CRM.
- **F2 (HIGH):** event #7 flip to `event_day` produced 1 `crm_automation_runs` row with `status=completed` and `total_recipients=0`. Conclusion: V10 fix didn't work, recipient resolver still returns empty.

The Supervisor reviewed both and determined they were **false alarms**:
- **F1 was expected behavior.** P5_7_STOREFRONT_FORM_REWIRE is an authored-but-not-yet-executed SPEC, scheduled for cutover day. The form is INTENTIONALLY still on the legacy pipeline until P5_7 runs. Testing the form against the new pipeline before P5_7 ships will always "fail" — that's the design.
- **F2 was correct behavior.** None of the 3 QA attendees on event #7 actually meet the resolver criteria (`coupon_sent=true AND status!='cancelled'`):
  - QA-A: `coupon_sent=true` but the coupon delivery had failed (the truth-value of the flag was misleading, see TD-001 in `POST_CUTOVER_TECH_DEBT.md`).
  - QA-B: status=`cancelled`.
  - QA-C: `coupon_sent=false`.
  Resolver returning 0 was the **right** answer for that data set.

**Cost of the incident.** ~30 minutes of Claude Code execution + 4 real SMS to Daniel's test phone + Daniel's confusion + one round of Supervisor escalation. All avoidable.

---

### Rule (binding on every future QA prompt the Overseer drafts)

Before pushing a QA-style activation prompt to Claude Code, verify TWO preconditions explicitly:

**(1) Is the infrastructure each scenario depends on already deployed in the environment under test?**

For each scenario in the prompt, list the SPECs / EFs / migrations / form rewires it depends on. For each dependency, confirm it has shipped to the target environment (production main vs develop vs localhost). If a dependency is still pending — DO NOT include the scenario in the prompt. A scenario that depends on un-shipped infrastructure produces false alarms, not findings.

Concrete check: read HANDOFF §13 (pre-cutover SPECs) + recent FOREMAN_REVIEW files + `git log origin/main --oneline` for the relevant commits. If unsure, ASK the Supervisor before drafting.

**(2) Can the test data actually satisfy the code's criteria for the expected positive case?**

For every scenario whose expected outcome is "X recipients receive a message" or "Y rows appear in the queue", write the SQL that proves at least one row in the test setup matches the code's filter. If the SQL returns 0 — the test is broken, not the code. Fix the seed data BEFORE the prompt goes out.

A "0 recipients" outcome is a blocker only when at least one row was supposed to be included by the current code. Otherwise 0 is correct behavior.

---

### Why this matters (the meta-pattern)

This is **Pattern 14 (verify before acting) applied to QA design itself.** The Overseer normally treats Pattern 14 as a rule for write actions. But QA prompts are also write actions — they spend Claude Code cycles, send real SMS, mutate live tenant data, and consume Supervisor escalation bandwidth. A QA prompt that can't produce its own positive case is itself a broken artifact, not a useful test.

A test that always reports "blocker" regardless of whether the code is correct is worse than no test — it consumes attention and erodes trust in subsequent findings.

---

### How to apply (Overseer checklist before every Claude Code QA prompt)

1. **Inventory dependencies.** For each scenario, list every SPEC / EF / migration / form / rule it relies on.
2. **Check shipped status.** For each dependency, confirm it's live in the target environment. Use HANDOFF, git log, EF version dump, browser version-check.
3. **Validate test data.** For each "expected positive" outcome, write the SQL that matches the code's filter and confirm the seed data produces ≥1 row.
4. **Mark scenarios that can't be verified yet.** Move them to a "deferred" section of the prompt with explicit "DO NOT execute until [dependency] ships" — don't silently include them.
5. **Run the prompt past the Supervisor when in doubt.** A 2-minute Supervisor sanity check is cheaper than a 30-minute Claude Code false-alarm session.

---

*End of L-001.*
