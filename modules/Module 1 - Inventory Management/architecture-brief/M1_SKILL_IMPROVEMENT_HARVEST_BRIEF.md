# Module Brief — M1_SKILL_IMPROVEMENT_HARVEST

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) — single-skill SPEC, no Executor / Reviewer / Foreman chain needed
**Pipeline:** Single-skill Pipeline (skill edits its own + sibling skill's files; commits its own work).
**Branch:** `develop`. Daniel-only merge to main after Pipeline closes 🟢.

---

## 1. Purpose

Four FOREMAN_REVIEW proposals have accumulated to the **2/3-consecutive-reviews threshold** of the Self-Improvement Mandate. Per the M1B0 FOREMAN_REVIEW (§4 disposition row "Skill files"), these MUST be applied **before** the next M1 Pipeline (Phase 1B-foundation) starts. Otherwise the Phase 1B Pipeline would re-improvise patterns we've already validated twice — and the Foreman would surface them again as 3/3 wasting cycles.

This SPEC harvests all 4 into the skill files in a single small Pipeline run. **Scope is skill-file edits only.** No code changes outside `.claude/skills/`. No DB changes. No new SPECs authored.

Why a dedicated harvest SPEC (rather than inline at next Pipeline start):

- A skill that improves itself **inside** the Pipeline it's running risks contaminating that Pipeline — the updated skill may surface issues that the old skill's SPEC didn't anticipate.
- Clean separation: harvest → commit → seal → next Pipeline runs against frozen skill state.
- Auditability: a dedicated SPEC folder with EXECUTION_REPORT + diffs makes every promotion traceable.

---

## 2. Scope — In

Apply the 4 accumulated proposals to the skill files. Each proposal has a precise WHERE + CHANGE block already specified in `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §6 + §7. The harvest SPEC author copies the CHANGE blocks verbatim where possible, adapts when the existing skill file structure requires it.

### Author-skill proposals (opticup-strategic)

**Proposal A1 — Promote §0 audits to MANDATORY-with-template in SPEC_TEMPLATE.md**

- **Target file:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (or the file used as the SPEC §0 template — Module Strategist verifies the actual path; if `SPEC_TEMPLATE.md` doesn't exist, locate the live template and update its §0 section).
- **Source:** M1B0 FOREMAN_REVIEW §6 Proposal 1 (verbatim CHANGE block).
- **Validation:** the next SPEC authored by `opticup-strategic` MUST include both sub-headings if it creates/extends any SECDEF function or authors a smoke section.

**Proposal A2 — Add "Concurrent-Pipeline awareness" sub-section to SPEC_TEMPLATE.md §11**

- **Target file:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §11 Lessons Already Incorporated.
- **Source:** M1B0 FOREMAN_REVIEW §6 Proposal 2 (verbatim CHANGE block).
- **Validation:** the next SPEC includes an explicit orthogonality envelope statement.

### Executor-skill proposals (opticup-executor)

**Proposal E1 — Bake MIGRATION.md Applied Log pattern into SKILL.md**

- **Target file:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" / Step 2.
- **Source:** M1B0 FOREMAN_REVIEW §7 Proposal 1 (verbatim CHANGE block).
- **Validation:** the next MCP-only Pipeline produces a `MIGRATION.md` Applied Log table without being prompted by the SPEC.

**Proposal E2 — Create `scripts/audit/advisors-for-objects.mjs` + reference from SKILL.md**

- **Target files:**
  - NEW: `scripts/audit/advisors-for-objects.mjs` (Node script).
  - EDIT: `.claude/skills/opticup-executor/SKILL.md` §"Verification After Changes" / SQL Autonomy Level 1.
- **Source:** M1B0 FOREMAN_REVIEW §7 Proposal 2 (verbatim CHANGE block).
- **Note on the script:** the actual MCP advisor calls happen inside Claude's tool layer (`mcp__claude_ai_Supabase__get_advisors`), which is not directly callable from a Node script. The Module Strategist decides one of two implementations:
  - **(a) The script is a stub** that reads advisor JSON from a path passed as arg (e.g., `node scripts/audit/advisors-for-objects.mjs --advisors-json /tmp/advisors.json purchase_order ...`), filters HIGH/ERROR, matches names, exits non-zero on hit. The skill instructs the executor to first dump advisor output to a temp file via MCP, then run the script.
  - **(b) The script is itself a thin shell that prints a Claude-tool call hint** (no real filtering), and the skill instructs the executor to manually invoke MCP + grep with a documented one-liner. (Less elegant but works.)
  - *Architect recommendation:* (a). Cleaner exit-code contract, programmable, scales.

### Tracking artifacts

Each promotion adds a row to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` Pattern Recurrence Tracker. The harvest SPEC author updates this file with 4 new rows in the format already used there. (If the file doesn't exist, the harvest creates the section minimally.)

---

## 3. Scope — Out (anti-creep)

Explicitly NOT in this SPEC:

- **No new code outside `.claude/skills/` + `scripts/audit/`.**
- **No DB changes**, no migrations, no RPC edits.
- **No SPEC-template rewrite.** Only the §0 and §11 sub-sections from the proposals; rest of the template untouched.
- **No changes to other skills** (`opticup-reviewer`, `opticup-architect`, `opticup-guardian`, `opticup-sentinel`, etc.). Only the two named.
- **No changes to CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** — except the DECISIONS_LOG Pattern Recurrence Tracker.
- **No additional proposals invented.** Only the 4 named.
- **No "while we're here" refactors.** Single-purpose SPEC.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Apply all 4 proposals together in one SPEC, before Phase 1B-foundation opens | Daniel 2026-05-15 (this Brief's authorization) |
| 2 | Skill harvest is a single-skill Pipeline (no Executor/Reviewer/Foreman chain) | Architect — skill-file edits are intrinsically the skill's own work |
| 3 | `advisors-for-objects.mjs` implementation option (a) — stub that reads advisor JSON from file | Architect — cleaner exit-code contract |
| 4 | No proposals invented during harvest; only the 4 named | Architect — keeps blast radius narrow |
| 5 | DECISIONS_LOG Pattern Recurrence Tracker gets 4 new rows | Self-Improvement Mandate accounting |

---

## 5. Success Criteria

1. **A1 applied:** the SPEC_TEMPLATE §0 contains both "Inner-call arity audit" and "Smoke-touched schema audit" sub-headings, each MANDATORY with a recipe + reporting-line. Verified by `grep -n "Inner-call arity audit" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` returning ≥ 1 match.
2. **A2 applied:** SPEC_TEMPLATE §11 contains the "Concurrent-Pipeline awareness" bullet-template. Verified by `grep -n "Concurrent-Pipeline awareness\|orthogonality envelope" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`.
3. **E1 applied:** `opticup-executor` SKILL.md §"SPEC Execution Protocol" Step 2 contains the "Applied Log convention (MCP-only SPECs)" sub-step verbatim from M1B0 Proposal 1. Verified by `grep -nC1 "Applied Log convention" .claude/skills/opticup-executor/SKILL.md`.
4. **E2 script created:** `scripts/audit/advisors-for-objects.mjs` exists, is executable Node, has a shebang, supports `--advisors-json <path>` + object-name positional args, exits 1 on HIGH/ERROR matches and 0 otherwise. Verified by `node scripts/audit/advisors-for-objects.mjs --help` showing usage and by a smoke run.
5. **E2 skill reference added:** `opticup-executor` SKILL.md §"Verification After Changes" / SQL Autonomy Level 1 references the new script with usage example. Verified by `grep -n "advisors-for-objects" .claude/skills/opticup-executor/SKILL.md`.
6. **DECISIONS_LOG updated:** 4 new rows added to Pattern Recurrence Tracker (or section created if missing). Verified by `grep -c "A1\|A2\|E1\|E2" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` returning ≥ 4 (or equivalent matching).
7. **Smoke run of the new script** on the M1B0 SPEC's object list — exit code captured. (The intent is "the script runs without crashing"; finding 0 HIGH/ERROR is the desired result since M1B0 closed 🟢 with no HIGH advisor findings.)
8. **Commit count:** 3-5 commits, single-concern each. Suggested split: (c1) A1+A2 SPEC_TEMPLATE update, (c2) E1 SKILL.md update, (c3) E2 script + SKILL.md reference, (c4) DECISIONS_LOG update, (c5) EXECUTION_REPORT + this Brief's close note.
9. **Iron Rule 31 (Integrity Gate):** exit 0 on every commit.
10. **Iron Rule 32 (Destructive Ops):** SPEC declares None. No file deletions; only appends + targeted edits.
11. **No file outside `.claude/skills/`, `scripts/audit/`, `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/`, and the single DECISIONS_LOG row update is touched.** Verified by `git diff --name-only HEAD~N..HEAD`.
12. **EXECUTION_REPORT + FINDINGS** written inside `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/`. No separate FOREMAN_REVIEW needed (skill harvest is the skill's own meta-work) — but a `RETROSPECTIVE.md` is encouraged to capture any divergence between proposal text and what landed.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Run these checks first:

```bash
# Probe 1: confirm the skill files exist + their structure
ls -la .claude/skills/opticup-strategic/references/
ls -la .claude/skills/opticup-executor/
ls -la .claude/skills/opticup-architect/references/

# Probe 2: confirm SPEC_TEMPLATE.md path
find .claude/skills/opticup-strategic/ -name "*TEMPLATE*" -o -name "*spec*template*"

# Probe 3: confirm scripts/audit/ exists or needs creation
ls -la scripts/audit/ 2>/dev/null || echo "needs mkdir"

# Probe 4: confirm DECISIONS_LOG.md has a Pattern Recurrence Tracker section
grep -n "Pattern Recurrence Tracker\|Recurrence" .claude/skills/opticup-architect/references/DECISIONS_LOG.md

# Probe 5: confirm current SKILL.md structure for executor
grep -n "^## \|^### " .claude/skills/opticup-executor/SKILL.md | head -30
```

Pin every result as a baseline. If any probe reveals contradiction (e.g., `SPEC_TEMPLATE.md` doesn't exist; the equivalent is named differently), the Module Strategist adapts the SPEC; logs adaptation in FINDINGS.

---

## 7. Iron Rules in Sharp Focus

- **Rule 21 (No Orphans / No Duplicates)** — if the proposals' CHANGE text references a section that already exists in the skill file, append/extend rather than duplicate.
- **Rule 23 (No Secrets)** — the new script reads from a file path; no hardcoded keys.
- **Rule 31 (Integrity Gate)** — exit 0 each commit.
- **Rule 32 (Destructive Ops)** — None.

---

## 8. Anti-Patterns (Things to Avoid)

- **Inventing new proposals during harvest.** Only the 4 named. If the Module Strategist notices a 5th worthy pattern, they log it in FINDINGS as a future-harvest candidate — do not apply it now.
- **Rewriting whole SKILL files.** Targeted edits only. The new sub-sections are appends or insertions at the specified §-anchors.
- **Skipping the smoke run of `advisors-for-objects.mjs`.** A script that's never been run is a script that doesn't work.
- **Forgetting the DECISIONS_LOG update.** It's the accounting layer of the Self-Improvement Mandate; skipping it means the next harvest can't see what was already promoted.
- **Touching `opticup-reviewer`, `opticup-architect`, `opticup-guardian`, `opticup-sentinel` skill files.** Out of scope.
- **Modifying the proposals' CHANGE text "to make it cleaner".** The CHANGE blocks were written by the Foreman after spot-checking — apply verbatim where the existing structure allows.

---

## 9. Open Questions for the Module Strategist

1. **`SPEC_TEMPLATE.md` path — actual location?**
*Recommendation: probe first.* If the file is named differently, adapt; log in FINDINGS.

2. **`advisors-for-objects.mjs` — node version + Pure-JS or needs deps?**
*Recommendation: pure Node 18+, no `node_modules` deps.* Uses `fs/promises` + `process.argv`. The script reads JSON, filters, prints; that's it.

3. **DECISIONS_LOG.md Pattern Recurrence Tracker — section exists or create?**
*Recommendation: if section exists, append 4 rows; if not, create section + 4 rows.* Log decision in FINDINGS either way.

4. **Smoke run of `advisors-for-objects.mjs` — against live MCP-dumped JSON or against a synthetic fixture?**
*Recommendation: live MCP dump.* Call `mcp__claude_ai_Supabase__get_advisors` (security + performance), dump to temp file, run script with M1B0 object list, capture exit code. Adds 5 minutes; far more valuable than synthetic.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` | §6 + §7 — source of the 4 proposals (verbatim CHANGE text) |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` | M1A's earlier proposals — confirms which are at 2/3 consecutive |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/EXECUTION_REPORT.md` §9 | Executor's voluntary adoption of Applied Log + advisor pattern — confirms the patterns work in practice |
| `.claude/skills/opticup-strategic/SKILL.md` | Self-improvement mandate text — confirms 2/3 + 3/3 thresholds |
| `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` | Target file for A1 + A2 |
| `.claude/skills/opticup-executor/SKILL.md` | Target file for E1 + E2 reference |
| `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` | Pattern Recurrence Tracker accounting |

---

## 11. Hand-off Note

Single-skill Pipeline. The sibling Activation Prompt (`M1_SKILL_IMPROVEMENT_HARVEST_ACTIVATION_PROMPT.md`) is what Daniel pastes.

Pipeline order:
1. `opticup-strategic` reads this Brief.
2. Runs §6 pre-flight probes.
3. Authors `SPEC.md` inside `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/`.
4. Applies the 4 proposals in 3-5 commits.
5. Smoke-runs `advisors-for-objects.mjs`.
6. Writes `EXECUTION_REPORT.md` + `FINDINGS.md` + `RETROSPECTIVE.md`.
7. Returns ONE Hebrew status line: `M1_SKILL_IMPROVEMENT_HARVEST [🟢/🟡/🔴] — N הצעות יושמו.`

After 🟢: Architect dispatches `M1_LENS_PHASE_1B_FOUNDATION` (next in the queue — Brief already prepared, Activation Prompt held until this SPEC closes).

---

*End of Brief. Skill-files-only harvest. 4 named proposals. No invention. No DB. No code outside .claude/skills + scripts/audit.*
