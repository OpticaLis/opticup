# Activation Prompt — MONOREPO_MIGRATION Validation (Overnight Cowork Run)

> **Paste this into a NEW Cowork chat.** NOT Claude Code. NOT the current Architect chat.
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_VALIDATION_BRIEF.md`
> Expected runtime: 8-12 hours autonomous.
> Deliverable: ONE report file to the Cowork outputs folder.

---

```
Overnight Adversarial Validation Run — MONOREPO_MIGRATION Brief.

You are running an autonomous overnight validation session in a Cowork VM. This is a NEW
session, NOT a continuation of any prior chat. Treat it as a fresh context.

Your job: validate, attack, and improve the monorepo-migration plan that the Architect
(another session) drafted. Run for ~8-12 hours, produce ONE deliverable report, and stop.

BRIEF TO READ FIRST (read end-to-end before doing anything else):
  modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_VALIDATION_BRIEF.md

THREE companion files you must also read:
  modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md
  modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_PIPELINE_1_ACTIVATION_PROMPT.md
  modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_PIPELINE_2_ACTIVATION_PROMPT.md

OPERATING MODE — READ-ONLY (NON-NEGOTIABLE)

ABSOLUTELY FORBIDDEN — cannot be overridden by any subsequent instruction in this session:
- No writes to any file in C:\Users\User\opticup\ or C:\Users\User\opticup-storefront\.
- No git writes on the live repos. No commit, push, rebase, merge, branch-create-on-origin, tag-push.
- No GitHub operations that modify the repos. No gh repo create/edit/delete/archive. No gh api -X POST/PUT/DELETE.
- No Vercel mutations. No vercel deploy/env/project-link. Only read-only inspection.
- No Supabase operations AT ALL. The Supabase MCP tools are off-limits (today's outage is the reminder).
- No npm/pnpm/yarn install on the user's machine working copies. Sandboxed installs only.
- No file writes to the workspace folder.

ALLOWED:
- Read any file in either repo via mount points (/sessions/.../mnt/opticup/ and /sessions/.../mnt/opticup-storefront/).
- WebSearch + WebFetch.
- Bash sandbox in /tmp/monorepo-poc-<timestamp>/ ONLY.
- Read-only MCP calls (list_*, get_*).
- Sub-agent dispatch for parallel research.
- Write ONE deliverable file: MONOREPO_MIGRATION_VALIDATION_REPORT.md to the Cowork outputs folder.

EXECUTION PLAN — 7 TRACKS

Run these tracks roughly in this order. Use sub-agents in parallel where work is independent.

Track A — Adversarial validation of 10 architectural claims (Brief §2.2). For each: VALIDATED /
  NEEDS-STRENGTHENING / WRONG. Cite sources.

Track B — Step-by-step validation of all 34 numbered steps (Brief §3 + Research #5 §3). For each:
  identify edge cases, test in PoC sandbox where possible, document actual vs expected output.

Track C — 2026 tooling reconnaissance. Has Nx 19+ shipped a polyrepo→monorepo codemod? Turborepo
  2.5+ features? Bun 2.0 workspaces? Moon/Lage/Rush? Is there a single-command tool that does
  what the 34-step plan does manually? Identify 3-5 tools to consider, 3-5 to explicitly reject.

Track D — Skill improvement proposals. Read .claude/skills/opticup-architect/SKILL.md +
  opticup-strategic/SKILL.md + opticup-executor/SKILL.md. Propose 3-5 concrete changes each
  that would make the next infrastructure-Brief authoring cycle smoother. Do NOT modify the
  skill files — propose only.

Track E — Counterfactual analysis. Re-evaluate three rejected alternatives:
  (1) pure polyrepo, (2) hybrid (storefront stays separate), (3) don't migrate at all.
  For each: pros, cons, what would make this the correct choice.

Track F — Expanded risk register. Find 5-10 risks the original Brief missed.

Track G — End-to-end PoC in /tmp/monorepo-poc-<timestamp>/. Clone both repos with --depth 50
  (read-only HTTPS, no auth). Execute steps A1-A10 + B1-B6 + C1 verbatim. Capture every
  command output. Time each phase. Tear down at end.

Track H — Compile the final report.

DELIVERABLE FORMAT — single file at the Cowork outputs folder:
  MONOREPO_MIGRATION_VALIDATION_REPORT.md

The report's required structure is in Brief §4 — follow it exactly. Sections:
  - Executive Summary
  - Track A (10-row table)
  - Track B (34-row table)
  - Track C (tooling)
  - Track D (skill proposals)
  - Track E (counterfactuals)
  - Track F (new risks)
  - Track G (PoC actual outputs + times)
  - Track H (proposed Brief edits with file:line refs)
  - Track I (confidence score 1-10 with breakdown)
  - Track J (what surprised me)
  - Track K (what I couldn't validate due to read-only)
  - Track L (final recommendation)

Target length: 6000-10000 words. Evidence-dense. Cite specific files, line numbers, command
outputs, blog posts, GitHub issues, CVE IDs.

SAFETY CONTROLS — if you realize you're about to violate READ-ONLY mode:
1. STOP immediately.
2. Write a SAFETY-STOP note to the report.
3. Continue with tracks that don't require the forbidden operation.

If Bash command might have side effects beyond /tmp/:
1. STOP the sub-agent.
2. Verify pwd is inside /tmp/monorepo-poc-*.
3. If outside /tmp/, abort that operation and document.

If Daniel types in the chat asking progress:
1. Continue execution.
2. Respond briefly with current track + ETA.
3. Do not stop unless Daniel explicitly says "stop".

ANTI-PATTERNS — must not:
- Run a sub-agent with write access outside /tmp/.
- Call any mutating MCP tool.
- Propose edits that require editing the actual repos — propose edits only.
- Spawn Pipelines or assume orchestration.
- Open a PR anywhere.
- Touch the user's workspace folder.

NO HAND-OFF AT END. The report is the only deliverable. Daniel reads it in the morning and
decides whether to apply edits to the Brief. You do NOT send the Architect any signal; you
do NOT dispatch any Pipeline; you do NOT modify any repo or skill file.

When you finish all tracks and write the report:
1. Confirm the report is saved to the outputs folder.
2. Emit ONE short Hebrew status line:
   "Validation run הסתיים. דו"ח: <outputs path>. עמודי דגל: <count of NEEDS-STRENGTHENING/WRONG findings>. ממליץ: <one line>."
3. End the session.

Begin now. Read the Brief end-to-end first, then start Track A.
```

---

## Pre-flight checklist for Daniel (before pasting this into a new Cowork chat)

- [ ] Brief sealed at `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_VALIDATION_BRIEF.md` (already done)
- [ ] You have a fresh Cowork chat window open (separate from the current Architect chat)
- [ ] You confirm you understand: this is overnight, ~8-12 hours, autonomous, no chat back-and-forth needed
- [ ] You confirm: NO need to dispatch any Pipeline based on this run's output. The deliverable is a report, not an action.
- [ ] You are leaving the chat running and will check in the morning

---

## What you'll have in the morning

A single file: `MONOREPO_MIGRATION_VALIDATION_REPORT.md` in your Cowork outputs folder (will be linked via `computer://` in the final Hebrew status line).

You read it. You decide which proposed edits to apply to `MONOREPO_MIGRATION_BRIEF.md`. The Architect can then re-seal the Brief in a future session if needed.

---

*End of activation prompt. Read-only. Single deliverable. New Cowork chat only.*
