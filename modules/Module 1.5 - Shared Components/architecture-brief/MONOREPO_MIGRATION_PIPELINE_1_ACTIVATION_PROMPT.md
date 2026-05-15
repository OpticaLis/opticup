# Activation Prompt — MONOREPO_MIGRATION Pipeline 1 (Phases A-E)

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until** M1 Phase 2 quartet is complete + Funnel work is complete + both source repos are quiescent (no in-flight PRs, no active sessions).
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md`

---

```
Full Auto Pipeline — MONOREPO_MIGRATION Pipeline 1 (Phases A-E, ZERO production impact).

Brief: modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md

Activate `opticup-strategic` skill. Skill state inherits all harvested patterns (mandatory
§0 Inner-call arity audit + Smoke-touched schema audit + Concurrent-Pipeline envelope +
MIGRATION.md Applied Log + advisors-for-objects.mjs). For this Brief, the Concurrent-Pipeline
envelope is EXCLUSIVE — this is a whole-repo structural reorg; no other Pipeline may run in
parallel on either source repo. Daniel has confirmed both repos are quiescent.

Read the Brief end-to-end. Then run §6 pre-flight Phase 0 checks (11 verifications listed in
Brief §5):
- Fresh git clone of both source repos in a new working directory (NOT existing copies).
- Backup tags `pre-monorepo-migration-<YYYY-MM-DD>` pushed on both source repos.
- gh CLI authenticated for opticalis org (scopes: repo, workflow, admin:org).
- vercel CLI authenticated, team team_4pZvxSwlV0sJeAnzb7RYxBL2 selected.
- pnpm 9.x installed.
- Supabase MCP connected.
- M1 Phase 2 quartet COMPLETE and merged on opticup main.
- Funnel work COMPLETE and merged on opticup main.
- No in-flight Pipelines on either source repo.
- Working directory has ≥10 GB free.
- .gitignore patterns include modules/*/backups/ to prevent recursive nest bloat.

If ANY check fails — STOP and escalate. Do not proceed to Phase A.

Author the SPEC at:
  modules/Module 1.5 - Shared Components/docs/specs/MONOREPO_MIGRATION_PIPELINE_1/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (11 Phase-0 verifications baselined + 2 mandatory audits)
- §1 Purpose (1 paragraph from Brief §1)
- §2 Scope (Phases A-E from Brief §2.3, 30 numbered steps)
- §3 Success Criteria (Pipeline 1 exit gate: pnpm verify:full PASS + smoke items 46-55 PASS;
  10 locked decisions from Brief §2.2 baselined; 60 measurable criteria total counting
  per-step verifies)
- §4 Autonomy envelope (Level-3 git operations + Level-2 file edits; no DB; no Vercel; no Pages)
- §5 Stop triggers (explicit, narrow — see Brief §8 top 10 risks)
- §6 Rollback plan (per-step rollback specs from Brief §3 table)
- §7 Destructive Operations DECLARED (Iron Rule 32):
  * git subtree add — NOT destructive (additive history merge); listed for transparency
  * git mv of apps/erp/supabase/ → supabase/ — rename (declared)
  * git rm apps/storefront/supabase/ scratch dir — destructive (declared)
  * Repo archive — NOT destructive; deferred to Pipeline 2 H1
- §10 Commit plan (30 single-concern commits matching the step IDs A1..E5)
- §11 Lessons Already Incorporated + Concurrent-Pipeline EXCLUSIVE envelope

Then hand off to `opticup-executor` in the same chat. Executor runs the 30 steps in order
(A1..A10 → B1..B6 → C1..C4 → D1..D5 → E1..E5). For each step:
- Apply the exact commands from Brief §3 + Research #5 §3.
- Verify per the step's verify criterion before moving on.
- If verify fails → STOP, execute rollback for that step, escalate.
- Append a row to MIGRATION.md Applied Log: # | step ID | command | timestamp | verify result.

After E5 completes, Executor produces:
- EXECUTION_REPORT.md (all 30 steps + verifies + any deviations logged)
- FINDINGS.md (any pre-existing TECH_DEBT baselines that trip checks)
- TEST_REPORT.md (Pipeline 1 smoke matrix items 46-55: CI runs, husky fires, security gates
  fire on planted leaks)
- MIGRATION.md Applied Log
- ROLLBACK.md (full restore-two-repo-state procedure from Brief §9)

Then `opticup-reviewer` re-runs §3 criteria + spot-checks the 5 HIGH-risk steps (D1, D2,
D5, E5, and the integrity-gate firing of C3). Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews. Writes FOREMAN_REVIEW.md.

Pipeline 1 returns ONE Hebrew status line:
  "MONOREPO_MIGRATION Pipeline 1 [🟢/🟡/🔴]. Phases A-E complete. Production untouched.
   המתן לאישור Daniel לפני Pipeline 2."

Iron Rules in sharp focus: 6, 12, 21, 23, 31, 32.

Out of scope (Pipeline 1):
- Vercel reconfig — Pipeline 2
- GitHub Pages reconfig — Pipeline 2
- Live smoke against production URLs — Pipeline 2
- Archive of old repos — Pipeline 2
- Edge Function or migration touches — never
- Business logic changes — never
- Refactoring js/shared.js or any moved file — move-only
- packages/shared or packages/contracts creation — deferred
- M1 Phase 2 or Funnel work — must be complete BEFORE this Pipeline starts

On escalation: write modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_{topic}.md
and emit one Hebrew line. Halt the Pipeline. Daniel returns with a decision.

Stop on deviation, not on success. This is the most structurally invasive Pipeline of the
project to date. Trust the discipline; trust the 30-step plan; close 🟢 only on every verify
passing.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Brief sealed at `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md`
- [ ] M1 Phase 2 quartet 🟢 and merged
- [ ] Funnel work 🟢 and merged
- [ ] Backup tags `pre-monorepo-migration-<YYYY-MM-DD>` pushed on both source repos
- [ ] No other Claude Code sessions running
- [ ] Working directory has ≥10 GB free
- [ ] You are mentally prepared for ~3 hours of Pipeline 1 then a 15-min review break

---

## Expected timing

- Phase 0 pre-flight: 20 min
- Phase A (ERP import): 35 min
- Phase B (storefront import): 20 min
- Phase C (workspace plumbing): 25 min
- Phase D (path rewrites): 40 min
- Phase E (security guardrails): 35 min
- Reports (EXECUTION + FINDINGS + TEST + MIGRATION + ROLLBACK + REVIEW + FOREMAN): 45 min

**Total estimate: ~3 hours.** Single uninterrupted Claude Code session.

---

## What happens after Pipeline 1 closes 🟢

1. Pipeline 1 returns the Hebrew status line.
2. Daniel reviews the new tree, the rewritten CLAUDE.md, EXECUTION_REPORT.md (15 min).
3. Daniel decides: GO → dispatch Pipeline 2. NO-GO → execute rollback per Brief §9.
4. Pipeline 2 Activation Prompt is at sibling file `MONOREPO_MIGRATION_PIPELINE_2_ACTIVATION_PROMPT.md`.

---

*End of activation prompt. Pipeline 1 — zero production impact.*
