# Activation Prompt — MONOREPO_MIGRATION Pipeline 2 (Phases F-H + Smoke + Archive)

> Paste the block below into a fresh Claude Code chat.
> **DO NOT dispatch until** Pipeline 1 closed 🟢 + Daniel manually reviewed the new monorepo tree + EXECUTION_REPORT.md + CLAUDE.md rewrite.
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md`

---

```
Full Auto Pipeline — MONOREPO_MIGRATION Pipeline 2 (Phases F-H, production reconfig + smoke + archive).

Brief: modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md

Activate `opticup-strategic` skill. Skill state inherits all harvested patterns. The
Concurrent-Pipeline envelope is EXCLUSIVE — Pipeline 1 has closed; no other Pipeline runs
during Pipeline 2.

Read the Brief end-to-end. Then verify Pipeline 1 closure:
- Pipeline 1 SPEC folder modules/Module 1.5 - Shared Components/docs/specs/MONOREPO_MIGRATION_PIPELINE_1/
  contains FOREMAN_REVIEW.md with verdict 🟢.
- opticalis/opticup-monorepo exists with develop branch and Pipeline-1 commits in history.
- pnpm verify:full from monorepo root exits 0.
- Daniel has dispatched Pipeline 2 (confirms manual review of CLAUDE.md rewrite + new tree
  was completed without issues).

If ANY verification fails — STOP and escalate. Do not proceed to Phase F.

Author the SPEC at:
  modules/Module 1.5 - Shared Components/docs/specs/MONOREPO_MIGRATION_PIPELINE_2/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (Pipeline 1 closure verifications + 2 mandatory audits +
  Concurrent-Pipeline EXCLUSIVE envelope)
- §1 Purpose (1 paragraph from Brief §1)
- §2 Scope (Phases F-H from Brief §2.4, 9 numbered steps + smoke wrapper)
- §3 Success Criteria (60-item smoke matrix from Brief §4, all PASS; downtime ≤2 min
  storefront + ≤10 min ERP; both archive banners visible)
- §4 Autonomy envelope (Level-3 Vercel + GitHub config + Pages workflow; no DB)
- §5 Stop triggers (specific to Phase F production touches; Brief §6 + §8 top 10)
- §6 Rollback plan (Brief §9 full restore procedure)
- §7 Destructive Operations DECLARED (Iron Rule 32):
  * Vercel project root directory change — non-destructive (config update)
  * Disconnect old storefront repo from Vercel — non-destructive (config update)
  * Create gh-pages branch on monorepo via actions/deploy-pages — additive
  * Repo archive via gh repo edit --archived=true — REVERSIBLE (declared)
- §10 Commit plan (9 commits matching step IDs F1..F4, G1, H1..H4)
- §11 Lessons Already Incorporated + Concurrent-Pipeline EXCLUSIVE envelope

Then hand off to `opticup-executor` in the same chat. Executor runs the 9 steps in order
(F1..F4 → G1 → H1..H4). For each step:
- Apply exact commands from Brief §3 + Research #5 §3.
- Verify per the step's verify criterion before moving on.
- If verify fails → STOP, execute rollback for that step, escalate.
- Phase G (smoke matrix) is a wrapper: execute all 60 smoke items from Brief §4. ANY failure
  not matching a documented pre-existing TECH_DEBT baseline → STOP and escalate.

Append every operation to MIGRATION.md Applied Log.

After H4 completes, Executor produces:
- EXECUTION_REPORT.md (9 steps + verifies + smoke matrix actuals)
- FINDINGS.md (any newly-surfaced post-migration findings)
- TEST_REPORT.md (60-item smoke matrix per Brief §4 + Research #5 §5 — full Phase A items
  1-55 + Phase B items 56-60)
- MIGRATION.md Applied Log
- ROLLBACK.md (per-step rollback record)
- DOWNTIME_LOG.md (exact production downtime windows for both ERP and Storefront)

Then `opticup-reviewer` re-runs the 60-item smoke matrix independently + spot-checks the
4 HIGH-risk Phase-F steps (F1, F2, F3, F4). Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews + writes FOREMAN_REVIEW.md.

This SPEC is the closer of MONOREPO_MIGRATION — trigger Module 1.5 Close Ceremony per
opticup-architect SKILL.md after FOREMAN_REVIEW.md is sealed: read both Pipeline 1 +
Pipeline 2 FOREMAN_REVIEWs, extract 1-2 lessons, propose updates to SKILL.md if recurring
patterns surface. Patterns expected to surface (already harvested from Research #5 but
worth re-confirming):
- "Two-Pipeline shape for production-touching migrations" — promote to skill if firing
  again. Counter starts at 1/3.
- "Subtree-import over rm+cp for repo consolidation" — promote to skill if firing again.
  Counter starts at 1/3.

Pipeline 2 returns ONE Hebrew status line:
  "MONOREPO_MIGRATION Pipeline 2 [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN.
   monorepo פעיל, repos ישנים בארכיון. M7 + M9 פתוחים לבנייה במקביל."

Iron Rules in sharp focus: 6, 12, 13, 21, 23, 31, 32 (declared destructive ops honored).

Out of scope (Pipeline 2):
- ANY repo file edits beyond config/workflow files in Phase F + H1 archive banners
- ANY Supabase touches — DB, RPCs, EFs, policies all immutable
- M1 Phase 2, Funnel, or any module business logic
- packages/shared or packages/contracts (deferred per locked decision #2)
- Storefront-demo Vercel project (out of scope per Brief §6)
- Edge Function consolidation or refactor
- TECH_DEBT cleanup
- Module 3 phase-letter governance rule rewrite (survives unchanged)

Production downtime budget:
- Storefront prod (prizma-optic.co.il): ≤ 2 min during F1-F2
- ERP prod (app.opticalis.co.il): ≤ 10 min during F3-F4

On escalation: write modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_{topic}.md
and emit one Hebrew line. Halt. **Production downtime triggers immediate rollback** per
Brief §9 — do not retry Phase F if downtime budget exceeded; restore two-repo state and
re-plan.

Stop on deviation, not on success. This is the only production-touching Pipeline in the
chain. Smoke matrix is the acceptance gate; trust the 60 items; close 🟢 only on 60/60
PASS (or documented pre-existing failures matching source-repo TECH_DEBT baselines).
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Pipeline 1 closed 🟢 (FOREMAN_REVIEW.md visible)
- [ ] You have personally inspected the new monorepo tree
- [ ] You have read the rewritten CLAUDE.md and confirm all 32 Iron Rules preserved
- [ ] You confirm both source repos are quiescent (no in-flight PRs since Pipeline 1)
- [ ] Vercel dashboard open in browser (in case manual web-UI fallback needed for F1-F2)
- [ ] DNS provider dashboard open (in case ERP DNS rollback needed in F3-F4)
- [ ] You are mentally prepared for ~1.75 hours of Pipeline 2 + possible 1-hour DNS cache propagation

---

## Expected timing

- Phase F (Vercel + Pages reconfig): 45 min (longest step is F3-F4 ERP Pages — up to 30 min realistic, 60 min worst case for cache propagation)
- Phase G (smoke matrix 60 items): 30 min
- Phase H (archive + docs + FOREMAN_REVIEW): 25 min
- Reports + Reviewer + Foreman: 30 min

**Total estimate: ~1.75 hours.** Single uninterrupted Claude Code session.

---

## What happens after Pipeline 2 closes 🟢

1. Pipeline 2 returns the Hebrew status line.
2. Both old repos are archived with banner pointing to monorepo.
3. M7 and M9 Pipelines can now be authored on the monorepo (per `OPEN_TASKS.md` item #3).
4. The Module 1.5 Repo Split placeholder in `OPEN_TASKS.md` #4 closes.
5. Self-improvement counters advance:
   - P-AUTHOR-1 (UI-level smoke discipline) auto-applied to SKILL.md per Self-Improvement Mandate (60-smoke matrix was the heaviest UI-smoke ever executed in the project).
   - "Two-Pipeline shape for production touches" — new pattern, counter 1/3.
   - "Subtree-import over rm+cp" — new pattern, counter 1/3.

---

## Emergency rollback during Pipeline 2

If production downtime exceeds budget OR Daniel calls abort:

1. Pipeline writes ROLLBACK.md with current state.
2. Executes Brief §9 procedure:
   - Re-link `opticalis/opticup-storefront` to Vercel project `prj_HGz6OkwugkH6Nlw3FiomNPDp96QH`
   - Force redeploy storefront from last known good commit on old develop
   - Unarchive old `opticalis/opticup` if archived
   - Verify Pages still serves from `main` root (DNS unchanged)
   - Delete `opticalis/opticup-monorepo` (clean state, no orphans)
3. Returns Hebrew status line: `MONOREPO_MIGRATION Pipeline 2 🔴 ABORTED — restored two-repo state. Downtime: ERP=Xmin, Storefront=Ymin.`

---

*End of activation prompt. Pipeline 2 — the only production touch. Daniel-only authorization for dispatch.*
