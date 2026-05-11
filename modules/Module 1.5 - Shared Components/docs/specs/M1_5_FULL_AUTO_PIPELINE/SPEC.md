# SPEC — M1_5_FULL_AUTO_PIPELINE

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components (cross-module infrastructure)
> **Source brief:** `modules/Module 1.5 - Shared Components/architecture-brief/FULL_AUTO_BRIEF.md`
> **Owning agent chain:** Foreman → Executor → Reviewer → Localhost-Tester → Foreman (review)
> **Pipeline mode:** This SPEC is itself the FIRST SPEC executed under the new full-auto pipeline. It bootstraps the pipeline that runs it.

---

## 1. Goal

Replace the current 5-chat manual SPEC-execution dance with a single self-orchestrating pipeline that runs Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review **end-to-end inside one Claude Code session via skill chaining**, so Daniel pastes ONE activation prompt per SPEC and receives ONE Hebrew summary at the end (or ONE Hebrew escalation line on stop).

When this SPEC closes, the next SPEC ever authored is executed in one chat, not five.

---

## 2. Background & Motivation

Today (2026-05-11), every SPEC requires Daniel to open 5 separate Claude Code chats — one per agent — and paste a fresh activation prompt each time. The 5 skills (`opticup-strategic`, `opticup-executor`, `opticup-reviewer`, `opticup-localhost-tester`, `opticup-strategic` again for the FOREMAN_REVIEW phase) already exist and the 4-agent chain protocol is documented in `docs/AGENT_CHAIN_PROTOCOL.md`. **The skills know how to do their work; they do not know how to hand off to each other inside one session.**

Daniel approved the Full Auto model on 2026-05-11 (`architecture-brief/FULL_AUTO_BRIEF.md`). Architect handed this Brief to opticup-strategic for SPEC authoring. This SPEC implements the Brief's §4 deliverables in 3 phases (foundation → chaining → verification), with strict order: foundation MUST ship before chaining, chaining MUST ship before live verification.

Insight from the Brief: skill chaining (`Skill: <name>` invoked from within the conversation) is already supported by the Claude Code harness. The only missing pieces are (a) each skill's exit-handoff section telling it what comes next, (b) a destructive-ops gate so unsupervised runs can't quietly destroy data, (c) an escalation protocol so genuine stops still surface to Daniel as ONE Hebrew line.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Mid-run mismatch = STOP-on-deviation per CLAUDE.md §9.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean tree at session end | `git status --short` → empty |
| 2 | Commits produced (foundation + chaining + verification + close) | 11 commits ahead of `origin/develop` at SPEC start tag | `git log $(cat .spec-start-tag)..HEAD --oneline \| wc -l` → 11 |
| 3 | Iron Rule 32 text exists in CLAUDE.md §6 | 1 occurrence of the heading `### Iron Rule 32 — Destructive Operations Gate` | `grep -c "Iron Rule 32 — Destructive Operations Gate" CLAUDE.md` → 1 |
| 4 | `scripts/checks/destructive-ops-declared.mjs` exists | File present, exit 0 on a clean SPEC | `test -f scripts/checks/destructive-ops-declared.mjs && node scripts/checks/destructive-ops-declared.mjs --help; echo $?` → 0 |
| 5 | `scripts/verify.mjs` invokes the new check | 1 occurrence of `destructive-ops-declared` referenced in `scripts/verify.mjs` | `grep -c "destructive-ops-declared" scripts/verify.mjs` → ≥ 1 |
| 6 | Pre-commit hook wires the new check | husky pre-commit (or staged-mode of verify.mjs) runs the new check | `npm run verify:staged 2>&1 \| grep -c "destructive-ops"` → ≥ 1 |
| 7 | Escalation folder exists in ≥ 3 modules | Folders present at `modules/Module 1.5 - Shared Components/escalations/`, `modules/Module 3 - Storefront/escalations/`, `modules/Module 4 - CRM/escalations/` (each with a `.gitkeep`) | `for m in "Module 1.5 - Shared Components" "Module 3 - Storefront" "Module 4 - CRM"; do test -f "modules/$m/escalations/.gitkeep"; done; echo $?` → 0 |
| 8 | Escalation template stub committed | `modules/Module 1.5 - Shared Components/escalations/_TEMPLATE.md` exists, contains all 5 mandatory headings (Stuck at / What I tried / Options I see / My recommendation / Question for Architect) | `grep -c "Stuck at:\|What I tried:\|Options I see:\|My recommendation:\|Question for Architect:" "modules/Module 1.5 - Shared Components/escalations/_TEMPLATE.md"` → 5 |
| 9 | Backups discipline updated in CLAUDE.md §9 | The §9 "Backup before major restructuring" rule replaced by a stronger wording matching Brief §4 deliverable 3 (auto-trigger when >5 files OR >100 lines OR any file rename) | `grep -c "Backups (automatic, not discretionary)" CLAUDE.md` → 1 |
| 10 | Backup logic in opticup-executor SKILL.md | Explicit auto-backup procedure section exists | `grep -c "Backups — automatic, not discretionary" .claude/skills/opticup-executor/SKILL.md` → 1 |
| 11 | All 5 skill files have §Pipeline Hand-off | Strategic, Executor, Reviewer, Localhost-Tester each contain the literal heading `## Pipeline Hand-off`; Strategic additionally contains `## Pipeline Closure` | `for f in opticup-strategic opticup-executor opticup-reviewer opticup-localhost-tester; do grep -c "## Pipeline Hand-off" ".claude/skills/$f/SKILL.md"; done` → each prints 1; `grep -c "## Pipeline Closure" .claude/skills/opticup-strategic/SKILL.md` → 1 |
| 12 | Pipeline mode detection in opticup-strategic | The phrase `Pipeline mode: full-auto` is referenced in a detection section of `.claude/skills/opticup-strategic/SKILL.md` | `grep -c "Pipeline mode: full-auto" .claude/skills/opticup-strategic/SKILL.md` → ≥ 1 |
| 13 | Hebrew status-line discipline documented | Each of the 5 skill files contains the heading `### Status Line (Hebrew, single line, per phase)` with examples | `for f in opticup-strategic opticup-executor opticup-reviewer opticup-localhost-tester; do grep -c "Status Line (Hebrew" ".claude/skills/$f/SKILL.md"; done` → each ≥ 1 |
| 14 | Test SPEC #1 — doc-only — runs end-to-end | A SPEC named `M1_5_FULL_AUTO_TEST_1_DOCS_ONLY` exists with EXECUTION_REPORT.md, TEST_REPORT.md (or skip-rationale), and FOREMAN_REVIEW.md all dated 2026-05-11 or later, ALL written in the same chat session | `for f in EXECUTION_REPORT.md FOREMAN_REVIEW.md; do test -f "modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/$f"; done; echo $?` → 0 |
| 15 | Test SPEC #2 — small code — runs end-to-end including smoke | A SPEC named `M1_5_FULL_AUTO_TEST_2_CODE_CHANGE` exists with EXECUTION_REPORT.md, TEST_REPORT.md showing 7/7 smoke pass, and FOREMAN_REVIEW.md | `test -f "modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/TEST_REPORT.md" && grep -c "7/7" "modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/TEST_REPORT.md"` → ≥ 1 |
| 16 | No `--no-verify` anywhere in the diff | The string `--no-verify` introduced 0 times by this SPEC | `git log $(cat .spec-start-tag)..HEAD -p \| grep -c "^\+.*--no-verify"` → 0 |
| 17 | Integrity Gate (Iron Rule 31) at session end | exit 0 (clean) or 2 (warnings only); never 1 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 18 | Smoke baseline still green | All 7 baseline tests pass on demo tenant | `npm run smoke` → "7/7 PASS" |
| 19 | Iron Rule 31 + Iron Rule 32 both pre-commit-enforced | Both checks listed in `scripts/verify.mjs` `--staged` mode output | `npm run verify:staged 2>&1 \| grep -E "integrity\|destructive-ops" \| wc -l` → ≥ 2 |
| 20 | FOREMAN_REVIEW closure section for the pipeline itself | This SPEC's own FOREMAN_REVIEW.md contains a §"Pipeline Closure" with verdict 🟢 / 🟡 / 🔴 and a Hebrew one-line summary intended for Daniel | `grep -c "## Pipeline Closure" "modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/FOREMAN_REVIEW.md"` → 1 |

**Note on SC #14 and #15 — "same chat session":** the auditor for these criteria cannot mechanically prove same-session execution from disk. The proof is: the Executor's `EXECUTION_REPORT.md` for each test SPEC explicitly states `Pipeline mode: full-auto, single-session run, no new chat opened` and lists the 5 skill loads in chronological order with their timestamps falling within a 90-minute window. If those statements are absent or contradicted by timestamp ordering — SC fails.

---

## 4. Destructive Operations

Per **NEW Iron Rule 32** (which this SPEC is creating), every SPEC declares its destructive operations upfront. This SPEC's declared destructive operations:

1. **Modification of CLAUDE.md §6 (Hygiene Rules) — addition only, no deletions of rules 1–31.** Rule 32 is appended; the prior section structure is preserved.
2. **Modification of CLAUDE.md §9 (Backups subsection) — replacement of one paragraph.** The old "Backup before major restructuring" guidance is replaced with the upgraded "Backups — automatic, not discretionary" wording. Old paragraph is removed; backup convention path (`modules/Module N/backups/...`) is preserved.
3. **Modification of 5 SKILL.md files under `.claude/skills/` — append-only, no deletions of existing sections.** Each file receives ONE new `## Pipeline Hand-off` section (and Strategic also gets `## Pipeline Closure`). No existing section is removed, renamed, or reordered.
4. **Modification of `scripts/verify.mjs` — append a check invocation, no removal of existing checks.**
5. **Creation of `scripts/checks/destructive-ops-declared.mjs`** — NEW file, no collision (verified against `scripts/checks/` listing 2026-05-11).
6. **Creation of `modules/Module N/escalations/.gitkeep`** in ≥ 3 modules. Net-new folders, no overwrites.

**Explicitly NOT destroyed:** no file deletes, no `git rm`, no DROP TABLE, no DROP COLUMN, no file renames, no `git rebase`, no force-push, no merge to `main`, no autonomous Supabase DDL. The pre-commit `destructive-ops-declared.mjs` check (which this SPEC creates) MUST report `0 undeclared destructive operations` against this SPEC's own commits — meta-check: the SPEC validates the gate it builds.

**If the Executor encounters a need for ANY destructive op not on the list above** → STOP immediately, write an escalation file, emit ONE Hebrew line. No exceptions.

---

## 5. Autonomy Envelope

This SPEC runs under **Bounded Autonomy + Pipeline Mode: full-auto**. The pipeline as a whole is the smallest meaningful unit; the executor inside each phase runs autonomously and the chain hands off without Daniel intervention.

### What the chain CAN do without asking
- Read any file in either repo.
- Run read-only SQL (Level 1) for verification.
- Create / edit / append the files listed in §8 "Expected Final State".
- Commit + push to `develop` (never `main`).
- Run `npm run verify:*`, `npm run smoke`, `npm run schema-diff`, `node scripts/snapshot.mjs create/list`.
- Load each next-skill via `Skill: <name>` per the Brief's §3 chain.
- Emit ONE Hebrew status line per phase boundary (≤ 60 chars per Brief §4.6).
- Apply executor-improvement proposals from the 2 most recent FOREMAN_REVIEWs (already done — see §11).

### What REQUIRES stopping and writing an escalation
- Any destructive operation not on §4's declared list.
- Any Iron Rule 31 (integrity gate) failure with exit 1 (null-byte ERROR).
- Any Iron Rule 32 (destructive-ops-declared) failure that cannot be resolved by adding the op to §4 (which itself requires Daniel approval mid-pipeline).
- Any smoke test failure that doesn't resolve after a single retry.
- Any skill load failure that doesn't resolve after ONE retry (per Brief Open Question §8.1).
- Any branch ≠ `develop`, any repo ≠ `opticalis/opticup`.
- Any merge to `main` (Iron Rule via CLAUDE.md §9.7 — only Daniel authorizes).
- Any AskUserQuestion that would normally be asked of Daniel — the pipeline prefers to escalate via file + ONE Hebrew line, not via in-chat AskUserQuestion (because in full-auto mode the chat is the pipeline, and a question stops the pipeline anyway, so a file is more durable).

### Pipeline-specific autonomy rules
1. **The Architect skill (`opticup-architect`) is NEVER auto-loaded** by the chain. The Architect is escalation-only (Brief Open Q §8.4). Only Daniel may load it, and only from a separate Cowork chat.
2. **The chain does not parallel-execute skills.** One skill, one phase, sequential. No 2 skills active in the same chat simultaneously (see §10 Anti-Patterns).
3. **The chain does not auto-rollback.** Test/Review failures → escalate, do not revert. Per Brief §5.
4. **Old SPECs are not migrated.** Full Auto applies to new SPECs only. Per Brief §5 + Locked Decision #8.

---

## 6. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Narrow list. Stop ONLY on these — operational uncertainty is NOT a stop trigger in full-auto mode.

1. **Skill-load failure after 1 retry.** First retry: same skill, same load command. If second attempt fails → STOP, write escalation `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_skill-load-failure.md`, emit Hebrew line.
2. **Iron Rule 31 ERROR (exit 1).** Null bytes in HEAD = halt the pipeline regardless of phase. Write escalation, no continuation.
3. **Iron Rule 32 violation.** Destructive op detected that isn't declared in §4. Write escalation listing the op + suggested §4 amendment. Do NOT silently amend §4 mid-run.
4. **Strategic question surfaced that the Brief does not pre-resolve.** Examples: an architectural ambiguity in how the chain should behave that wasn't addressed in Brief §4–§9. NOT a stop trigger: any operational choice that the executor can make using established patterns.
5. **Test SPEC #1 or Test SPEC #2 fails.** Either smoke fails, or FOREMAN_REVIEW concludes 🔴 REOPEN. The pipeline does not proceed to the next phase; the failure is logged in this SPEC's FINDINGS.md and surfaced as an escalation.

**Explicitly NOT stop triggers** (executor proceeds, just notes in FINDINGS):
- A status-line wording feels awkward (cosmetic).
- A skill's existing wording is slightly inconsistent with another skill's wording (note in FINDINGS, fix in a future skill-improvement sweep).
- A non-essential criterion in §3 lands within ±5% of target (note actual value in EXECUTION_REPORT).

---

## 7. Out of Scope (explicit — do NOT touch in this SPEC)

1. **Cross-repo parallel execution.** Pipeline runs in ONE chat on ONE repo. The Repo Split topic (OPEN_TASKS #2) is its own SPEC — do not entangle.
2. **Cowork ↔ Claude Code bidirectional automation.** Daniel pasting the Architect's escalation-response into the live chat IS the integration. Building a bridge that automates that paste is OUT.
3. **Auto-rollback on failed test or review.** Pipeline pauses + escalates. Auto-rollback is too risky day-1. Future SPEC.
4. **Migration of past SPECs.** Old SPECs stay in their existing folders, executed by hand if they ever re-open. Full Auto applies only to SPECs authored AFTER this SPEC closes.
5. **Voice / SMS / phone notifications.** Hebrew line in the chat is the entire notification surface.
6. **Modifying `opticup-architect/SKILL.md`** beyond a one-line cross-reference (Architect stays escalation-only — not a pipeline step).
7. **Modifying `opticup-guardian/SKILL.md` or `opticup-sentinel/SKILL.md`.** These are governance/audit skills, not pipeline-chain skills.
8. **Production data on Prizma tenant.** All Test SPECs run on `demo` tenant only.

---

## 8. Expected Final State

### New files (created by this SPEC)

```
scripts/checks/destructive-ops-declared.mjs                                  # NEW Iron-Rule-32 enforcement script
modules/Module 1.5 - Shared Components/escalations/.gitkeep                  # Escalation folder bootstrap
modules/Module 1.5 - Shared Components/escalations/_TEMPLATE.md              # 5-heading template
modules/Module 3 - Storefront/escalations/.gitkeep
modules/Module 4 - CRM/escalations/.gitkeep
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/SPEC.md           # Test SPEC #1 (doc-only)
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/EXECUTION_REPORT.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/FINDINGS.md       # (may be "No findings.")
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_1_DOCS_ONLY/FOREMAN_REVIEW.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/SPEC.md         # Test SPEC #2 (small code)
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/EXECUTION_REPORT.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/FINDINGS.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/TEST_REPORT.md   # smoke 7/7
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_TEST_2_CODE_CHANGE/FOREMAN_REVIEW.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/EXECUTION_REPORT.md       # this SPEC's own
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/FINDINGS.md
modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/FOREMAN_REVIEW.md
```

### Modified files (only the changes named below — no other lines)

| File | Change |
|------|--------|
| `CLAUDE.md` §6 | APPEND `### Iron Rule 32 — Destructive Operations Gate` block (≈ 40–60 lines). No edits to rules 1–31. |
| `CLAUDE.md` §9 (Backup Protocol subsection) | REPLACE the 1-paragraph "before major restructuring" wording with the stronger "Backups — automatic, not discretionary" wording from Brief §4 deliverable 3. Backup-path convention (`modules/Module N/backups/...`) preserved. |
| `scripts/verify.mjs` | APPEND a call into `scripts/checks/destructive-ops-declared.mjs` inside the `--staged` and `--full` runners. No removal of existing checks. |
| `.claude/skills/opticup-strategic/SKILL.md` | APPEND `## Pipeline Hand-off` (first-phase: how to load Executor when SPEC.md commit lands) AND `## Pipeline Closure` (last-phase: how to write the FOREMAN_REVIEW.md + Hebrew summary to Daniel) AND `### Status Line (Hebrew, single line, per phase)` AND a `### Pipeline Mode Detection` block that detects `Pipeline mode: full-auto` in the activation prompt. |
| `.claude/skills/opticup-executor/SKILL.md` | APPEND `## Pipeline Hand-off` (load Reviewer at end) AND `### Backups — automatic, not discretionary` AND `### Status Line (Hebrew, single line, per phase)`. |
| `.claude/skills/opticup-reviewer/SKILL.md` | APPEND `## Pipeline Hand-off` (load Localhost-Tester at end) AND `### Status Line (Hebrew, single line, per phase)`. |
| `.claude/skills/opticup-localhost-tester/SKILL.md` | APPEND `## Pipeline Hand-off` (load Strategic for review phase) AND `### Status Line (Hebrew, single line, per phase)`. |
| `docs/AGENT_CHAIN_PROTOCOL.md` | APPEND a §"Full-Auto Mode" subsection cross-referencing this SPEC + summarizing chain hand-off. ≤ 30 lines. |
| `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` | APPEND a 3-line entry noting M1_5_FULL_AUTO_PIPELINE closed on 2026-05-11. |
| `MASTER_ROADMAP.md` §3 (Current State table) | APPEND a row "Full-Auto Pipeline: ✅ 2026-05-11 (M1.5)". |

### DB state
- No DB changes. No DDL. No DML. The pipeline is filesystem + git only.

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` §3 — see row above
- `docs/AGENT_CHAIN_PROTOCOL.md` — Full-Auto Mode subsection
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new entry for 2026-05-11
- This SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md` + `FOREMAN_REVIEW.md`

### NOT modified
- `docs/GLOBAL_MAP.md` — no new contracts (skill files are not contracts).
- `docs/GLOBAL_SCHEMA.sql` — no DB changes.
- `docs/FILE_STRUCTURE.md` — too granular for this SPEC; will be regenerated by Sentinel's next sweep.
- Any file in `opticup-storefront` (sibling repo). The pipeline lives in ERP repo only for v1.

---

## 9. Commit Plan

Strict ordering: foundation (1–3) → chaining (4–7) → verification (8–10) → close (11). Each commit individually passes `npm run verify:staged` + Iron Rule 31 + Iron Rule 32 (once Rule 32 is live from commit 2 onward).

### Phase 1 — Foundation (commits 1–3)

1. **`feat(spec): scaffold M1_5_FULL_AUTO_PIPELINE + Iron Rule 32 text in CLAUDE.md §6`**
   - Adds Iron Rule 32 to CLAUDE.md §6 (text only — script comes next).
   - Adds the SPEC folder's SPEC.md (this file — already on disk by execution start, but committed in this commit).
   - Adds CLAUDE.md §9 backup-discipline upgrade.

2. **`feat(scripts): add destructive-ops-declared.mjs + wire into verify.mjs`**
   - Creates `scripts/checks/destructive-ops-declared.mjs`.
   - Modifies `scripts/verify.mjs` to call it in `--staged` and `--full` modes.
   - Confirms `npm run verify:staged` exits 0 against the current tree.

3. **`feat(infra): scaffold escalation folders + template in M1.5 / M3 / M4`**
   - Creates `modules/Module {1.5, 3, 4}/escalations/.gitkeep` files.
   - Creates `modules/Module 1.5 - Shared Components/escalations/_TEMPLATE.md` with 5 mandatory headings.

### Phase 2 — Chaining (commits 4–7)

4. **`feat(skill): opticup-strategic — add Pipeline Hand-off + Pipeline Closure + status-line discipline`**

5. **`feat(skill): opticup-executor — add Pipeline Hand-off + auto-backups + status-line discipline`**

6. **`feat(skill): opticup-reviewer — add Pipeline Hand-off + status-line discipline`**

7. **`feat(skill): opticup-localhost-tester — add Pipeline Hand-off + status-line discipline; update AGENT_CHAIN_PROTOCOL Full-Auto section`**

### Phase 3 — Verification (commits 8–10) — STRICTEST GATE

8. **`test(pipeline): run Test SPEC #1 (docs-only) end-to-end in one chat`**
   - Authors + executes + reviews + tests + closes `M1_5_FULL_AUTO_TEST_1_DOCS_ONLY` — a tiny doc-only SPEC (e.g., adding a one-line note to `scripts/README-verify.md`).
   - All 5 phases run in the same session. The SPEC's EXECUTION_REPORT explicitly states `Pipeline mode: full-auto, single-session run, no new chat opened`.
   - If any phase requires opening a new chat → SC #14 fails → this SPEC stops at commit 8 and escalates.

9. **`test(pipeline): run Test SPEC #2 (small code change) end-to-end including smoke 7/7`**
   - Authors + executes + reviews + tests + closes `M1_5_FULL_AUTO_TEST_2_CODE_CHANGE` — a small code SPEC (e.g., adding a JSDoc comment block to one function in `shared/js/`).
   - Includes Localhost-Tester smoke phase. SC #15 requires `7/7 PASS`.
   - If smoke fails → STOP-on-deviation → escalation.

10. **`fix(skill): adjust skill hand-off wording based on Test SPEC #1 + #2 findings`** (CONDITIONAL — only if FINDINGS exist from commits 8 or 9; otherwise skipped and renumbered)

### Phase 4 — Close (commit 11)

11. **`chore(spec): close M1_5_FULL_AUTO_PIPELINE with retrospective`**
    - Writes EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md inside this SPEC folder.
    - Updates `MASTER_ROADMAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md`.
    - FOREMAN_REVIEW.md includes §"Pipeline Closure" — a Hebrew one-line summary intended for Daniel (SC #20).

**If commit 10 is skipped** (zero findings from test SPECs — unlikely but possible), the close commit is numbered 10 and SC #2 expects 10 commits, not 11. The Executor amends SC #2 in the EXECUTION_REPORT with the actual count and reasoning. This is the ONE pre-authorized SC amendment in this SPEC.

---

## 10. Anti-Patterns (DO NOT)

1. **DO NOT run two skills concurrently in the same chat.** One skill, one phase, sequential. If a skill needs information from another skill, it reads from disk (Brief Contract B).
2. **DO NOT add `opticup-architect` as a pipeline step.** Architect is escalation-only. The chain never auto-loads it. Only Daniel loads Architect, and only from a separate Cowork chat (Brief §8.4 + Decision #1).
3. **DO NOT allow the pipeline to self-load `opticup-architect`.** Even in a "we got stuck" situation — the correct response is: write escalation file, emit Hebrew line, halt. Wait for Daniel.
4. **DO NOT use `--no-verify` anywhere.** Not in commits, not in scripts, not in hooks. Iron Rule 31 is non-overridable. Iron Rule 32 (new) is non-overridable. (SC #16 verifies.)
5. **DO NOT declare "no destructive operations" in a SPEC that contains destructive operations.** The pre-commit check (`destructive-ops-declared.mjs`) will block. Even this SPEC declares its destructive ops explicitly (§4) so the check passes when this SPEC's own commits are validated.
6. **DO NOT skip the FOREMAN_REVIEW phase at the end.** Even in full-auto mode the lessons-loop is mandatory. Skipping = skills don't improve = SaaS scaling story collapses (Brief §9).
7. **DO NOT trust the SPEC author's destructive-ops list silently.** The script verifies the `## Destructive Operations` section exists and is well-formed; downstream commits still get scanned for undeclared destructive patterns (file deletes, DROPs, mass renames, force-pushes).
8. **DO NOT batch all 11 commits into one push at the end.** Push after each phase so a mid-pipeline failure leaves a recoverable state on `origin/develop`.
9. **DO NOT emit raw EXECUTION_REPORT content to Daniel as a status line.** Status lines are ≤ 60 chars, Hebrew, one per phase (Brief §4.6). Reports go to disk for the next skill to read; Daniel sees the status line summary only.
10. **DO NOT touch the sibling `opticup-storefront` repo.** Full-Auto v1 is ERP-repo only. Cross-repo orchestration is OUT (§7.1).
11. **DO NOT amend §3 success criteria mid-execution** except for the single pre-authorized SC #2 amendment described in §9 commit 10.
12. **DO NOT skip backup before any operation that touches > 5 files OR refactors > 100 lines in a single file OR renames any file.** Auto-backup is mandatory under the upgraded Rule 9 (§4 deliverable 3). Failing to back up = stop-on-deviation.

---

## 11. Lessons Already Incorporated

From the 3 most recent FOREMAN_REVIEWs in Module 3, applied to this SPEC:

- **FROM `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` (A2 — numeric thresholds need baseline)** → APPLIED. Every numeric threshold in §3 SC table is a hard count derived from declared deliverables (file counts, grep counts), not an estimate. The one threshold-style criterion (SC #2 = 11 commits) is explicitly amendable per the §9 commit-10 contingency.
- **FROM `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` (A1 — URL probe MANDATORY)** → NOT APPLICABLE. This SPEC names no public URLs.
- **FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` (A1 — already-done discovery contingency)** → APPLIED. §8 "NOT modified" section enumerates files that look related but the executor must skip; §9 commit 10 is explicitly conditional ("skipped and renumbered" if no findings).
- **FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` (A2 — backup format for DB-DELETE)** → NOT APPLICABLE. No DB changes (§8 DB state).
- **FROM `M3_TIER1_CATEGORY_SLUG_FIX/FOREMAN_REVIEW.md`** → Reviewed; lessons already absorbed into SPEC_TEMPLATE; no SPEC-specific adjustments needed.

### Cross-Reference Check (Rule 21 enforcement at author time)

Cross-Reference Check completed 2026-05-11 against:
- `scripts/checks/` directory listing — confirmed: no existing `destructive-ops-declared.mjs`, no name collision.
- `CLAUDE.md` — confirmed: no existing "Iron Rule 32"; rule numbering is contiguous through 31.
- `.claude/skills/*/SKILL.md` — confirmed: no existing `## Pipeline Hand-off` heading anywhere (greps return 0 hits outside this SPEC and the Brief).
- `modules/*/escalations/` — confirmed: no pre-existing escalation folders; net-new infrastructure.
- `modules/*/backups/` — convention already exists in CLAUDE.md §10; we extend semantics (auto-trigger), not the path. No collision.

**Result: 0 collisions / 5 sweeps performed.** SPEC is clear to dispatch.

---

## 12. Pre-Merge Checklist (Phase 3 verification is the strictest gate)

Every SPEC closes only when all items pass. **Phase 3 verification is the most severe gate in this SPEC — both test SPECs must run green inside ONE chat before close.**

- [ ] All 20 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Iron Rule 31 (Integrity Gate):** `npm run verify:integrity` returns exit 0 or 2. No null-byte ERROR (exit 1) anywhere in HEAD.
- [ ] **Iron Rule 32 (Destructive Ops Gate):** `node scripts/checks/destructive-ops-declared.mjs` returns 0 against this SPEC's own commits (meta-check — the gate validates its creator).
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in this SPEC folder.
- [ ] FOREMAN_REVIEW.md written with §"Pipeline Closure" Hebrew summary line (SC #20).
- [ ] Test SPEC #1 (`M1_5_FULL_AUTO_TEST_1_DOCS_ONLY`) — folder contains SPEC.md + EXECUTION_REPORT.md + FOREMAN_REVIEW.md; all 5 phases executed in one chat (per Executor's report statement, SC #14).
- [ ] Test SPEC #2 (`M1_5_FULL_AUTO_TEST_2_CODE_CHANGE`) — folder contains SPEC.md + EXECUTION_REPORT.md + TEST_REPORT.md (`7/7 PASS`) + FOREMAN_REVIEW.md; all 5 phases executed in one chat (SC #15).
- [ ] `MASTER_ROADMAP.md` §3 contains the Full-Auto Pipeline row.
- [ ] No `--no-verify` introduced anywhere (SC #16).
- [ ] Smoke baseline still 7/7 against demo tenant (SC #18).
- [ ] The 5 skill SKILL.md files contain their new sections (SC #11 + #13).
- [ ] AGENT_CHAIN_PROTOCOL.md Full-Auto Mode subsection committed.
- [ ] No escalation files are in the `OPEN_` state (all either `RESOLVED_` or no escalations were created).

If any single item fails → SPEC is REOPEN, not CLOSED. Daniel sees a 🟡 or 🔴 Hebrew line, not 🟢.

---

## Reference files

| File | Why |
|------|-----|
| `modules/Module 1.5 - Shared Components/architecture-brief/FULL_AUTO_BRIEF.md` | The Architect's brief — source of truth for scope, decisions, anti-patterns. |
| `docs/AGENT_CHAIN_PROTOCOL.md` | Current 4-agent chain — receives the Full-Auto Mode subsection in commit 7. |
| `CLAUDE.md` §6 + §9 + §10 | Iron Rules + Working Rules + Backup Protocol — modified by commits 1 + 2. |
| `.claude/skills/opticup-strategic/SKILL.md` | First-phase + last-phase skill — modified by commit 4. |
| `.claude/skills/opticup-executor/SKILL.md` | Modified by commit 5. |
| `.claude/skills/opticup-reviewer/SKILL.md` | Modified by commit 6. |
| `.claude/skills/opticup-localhost-tester/SKILL.md` | Modified by commit 7. |
| `scripts/verify.mjs` + `scripts/checks/` | Verification infrastructure — extended by commit 2. |
| `tests/smoke/baseline.test.mjs` | Smoke 7/7 baseline — gates SC #18 + Test SPEC #2 SC. |
| `scripts/snapshot.mjs` | Used for any pre-commit-10 backup if findings require it. |

---

*End of SPEC. Foreman dispatches to opticup-executor under Pipeline mode: full-auto. Executor reads this file, runs Phase 1 → Phase 2 → Phase 3 → Close in one chat, then hands back to opticup-strategic (this skill) for the FOREMAN_REVIEW. Daniel sees one Hebrew status line per phase and one closing Hebrew line at the end.*
