# SPEC — M1_SKILL_IMPROVEMENT_HARVEST

> **Template version:** v3 (2026-05-14)
> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist / Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1 — Inventory Management
> **Phase:** Single-skill Pipeline (skill-files-only harvest; precedes Phase 1B-foundation)
> **Pipeline mode:** Single-skill (no Executor / Reviewer / Foreman chain) — skill harvests its own + sibling-skill files; commits its own work.

---

## 0. Pre-Authoring Reality Check

Confirms the SPEC is grounded in actual repo state, not Brief assumptions that may have drifted.

- Brief read in full on 2026-05-15 (`modules/Module 1 - Inventory Management/architecture-brief/M1_SKILL_IMPROVEMENT_HARVEST_BRIEF.md`).
- Source CHANGE blocks read verbatim from `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §6 Proposals 1+2 (author-skill) and §7 Proposals 1+2 (executor-skill).
- Branch verified: `develop`. Pre-existing untracked Briefs/Activation Prompts noted; will use selective `git add` by filename throughout (no `git add -A`, no `git clean`).
- Iron Rule 31 Integrity Gate: presumed exit 0 (most recent M1B0 close commit `deae71d` passed it). Will re-run after each commit.
- Lessons applied from prior FOREMAN_REVIEWs in this module: §11 documents the harvest of M1B0 §6+§7 proposals (this SPEC IS the application of those 4 lessons).

### Brief-vs-reality divergences

| # | Brief assumption | Repo reality | SPEC resolution |
|---|---|---|---|
| D1 | A2 target = `SPEC_TEMPLATE.md` §11 Lessons Already Incorporated | Live template has §11 = "Dependencies / Preconditions"; §12 = "Lessons Already Incorporated" | Apply A2 to §12 (the live Lessons section). Log in FINDINGS. The Brief's intent ("add to the Lessons section") is honored; only the section number was stale. |
| D2 | E1 target = `opticup-executor/SKILL.md` §"SPEC Execution Protocol" / Step 2 | Confirmed at SKILL.md line 924 (`### Step 2 — Execute under Bounded Autonomy`) | Insert sub-step immediately AFTER Step 2's existing body, BEFORE `### Step 3` — preserves Step-3 numbering. |
| D3 | E2 reference target = §"Verification After Changes" / SQL Autonomy Level 1 | Two anchors exist in SKILL.md: §"SQL Autonomy Levels" / "Level 1 — Read-only" at line 421, and §"Verification After Changes" at line 520. The Brief conflates them. | Add the reference line in §"Verification After Changes" (the canonical "after-changes" anchor) AND a cross-reference under SQL Autonomy Level 1 pointing to it. Two-line touch, single canonical place. |
| D4 | `scripts/audit/` directory exists | Directory does not exist | `mkdir -p scripts/audit/` as part of E2 commit. Iron Rule 21 sweep: no existing scripts/ subfolders are named `audit/` — clear to create. |
| D5 | `SPEC_TEMPLATE.md §0` exact insertion point for A1 | §0 is a bullet list followed by a citations paragraph at line 60 | Insert two new `### Inner-call arity audit` and `### Smoke-touched schema audit` sub-headings AFTER the existing §0 bullets but BEFORE the closing citations paragraph (line 60) — keeps audit headings adjacent to §0 prose. |

### Baselines (pinned 2026-05-15 11:42 UTC)

| Symbol | Value | How measured |
|---|---|---|
| `BASE_TEMPLATE_BYTES` | 28389 | `wc -c .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` |
| `BASE_EXECUTOR_SKILL_BYTES` | 76900 | `wc -c .claude/skills/opticup-executor/SKILL.md` |
| `BASE_DECISIONS_LOG_BYTES` | 50933 | `wc -c .claude/skills/opticup-architect/references/DECISIONS_LOG.md` |
| `BASE_SCRIPTS_AUDIT_EXISTS` | false | `ls scripts/audit/ 2>/dev/null` returns "No such file or directory" |

### Iron Rule 21 cross-reference sweep (Step 1.5)

New names this SPEC introduces:
- `Inner-call arity audit` (sub-heading) — grep against SPEC_TEMPLATE.md: 0 hits → new.
- `Smoke-touched schema audit` (sub-heading) — grep against SPEC_TEMPLATE.md: 0 hits → new.
- `Concurrent-Pipeline awareness` (sub-heading) — grep across `.claude/skills/`: 0 hits → new.
- `Applied Log convention` (sub-step name) — grep against `.claude/skills/opticup-executor/SKILL.md`: 0 hits → new. M1B0's MIGRATION.md used "Applied Log" as a column header but never as a named SKILL convention.
- `advisors-for-objects.mjs` (filename) — grep across `scripts/`: 0 hits → new. No existing audit script named similarly.

0 collisions / 5 hits resolved.

### Runtime semantics rehearsal

Not applicable. This SPEC introduces no DB functions, no RLS, no views, no grants. The only runtime artifact is `advisors-for-objects.mjs` — a pure-Node CLI with no DB connection. Its runtime semantics:
- `--advisors-json <path>` missing → exit 2 (usage error).
- `<path>` file missing → exit 2 (file not found).
- Zero positional names → exit 2 (no object filter).
- HIGH or ERROR advisor matching any positional name → exit 1.
- Anything else → exit 0.

Tested at smoke-run time against live MCP advisor JSON.

### Orthogonality envelope (Concurrent-Pipeline awareness — meta: applying A2 to itself)

This SPEC touches:
- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (1 file)
- `.claude/skills/opticup-executor/SKILL.md` (1 file)
- `scripts/audit/advisors-for-objects.mjs` (NEW)
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` (1 row addition)
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/*` (new SPEC folder + 4 retrospective files)

It WILL NOT conflict with: any module-internal HTML/JS/CSS file, any DB object, any RPC, any Edge Function, any other skill (reviewer/architect/guardian/sentinel/localhost-tester), any other module's specs folder. Concurrent SECURITY_HOTFIX_* / M4_* / M1.5_* / storefront Pipelines are orthogonal and may interleave commits without conflict.

---

## 1. Goal

Apply the 4 accumulated FOREMAN_REVIEW improvement proposals from `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` (§6 Proposals 1+2 and §7 Proposals 1+2) into the live skill files BEFORE Phase 1B-foundation opens, so the next Pipeline runs against a frozen-improved skill state rather than re-improvising patterns we've already validated twice.

---

## 2. Background & Motivation

4 proposals reached the **2-of-3 consecutive-reviews threshold** of the Self-Improvement Mandate:

- **A1 (author)** + **E1 (executor)** were proposed in both `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` and `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` — 2 consecutive reviews each.
- **A2 (author)** + **E2 (executor)** were proposed once each in `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md`. Promoted now alongside A1/E1 per the Brief's "harvest-before-Phase-1B" directive — bundled to avoid contaminating the next Pipeline with mid-run skill edits.

Why a dedicated harvest SPEC (vs inline at next Pipeline start):

- Skill self-improvement INSIDE a Pipeline contaminates that Pipeline — the updated skill may surface issues the old skill's SPEC didn't anticipate.
- Clean separation: harvest → commit → seal → next Pipeline runs against frozen skill state.
- Auditability: dedicated SPEC folder with EXECUTION_REPORT + diffs makes every promotion traceable.

### Already-done discovery contingency

If any of the 4 proposals' CHANGE text is found to already be present in the live skill file (a prior session may have applied it independently): mark the proposal as ALREADY-APPLIED in EXECUTION_REPORT §2, skip the commit, still record the row in DECISIONS_LOG.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean (modulo pre-existing untracked Briefs) | `git status --short` after final commit shows only pre-existing `??` lines |
| 2 | Commits produced | 5 single-concern commits on `develop` | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 3 | A1 — Inner-call arity audit sub-heading present in SPEC_TEMPLATE.md §0 | ≥ 1 match | `grep -nc "Inner-call arity audit" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` → ≥ 1 |
| 4 | A1 — Smoke-touched schema audit sub-heading present in SPEC_TEMPLATE.md §0 | ≥ 1 match | `grep -nc "Smoke-touched schema audit" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` → ≥ 1 |
| 5 | A1 — Both audits marked MANDATORY | "MANDATORY" appears within each new sub-heading | `grep -nB0 -A2 "Inner-call arity audit\|Smoke-touched schema audit" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` shows MANDATORY in each |
| 6 | A2 — Concurrent-Pipeline awareness bullet present in SPEC_TEMPLATE.md §12 | ≥ 1 match | `grep -nc "Concurrent-Pipeline awareness\|orthogonality envelope" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` → ≥ 1 |
| 7 | E1 — Applied Log convention sub-step present in executor SKILL.md Step 2 | ≥ 1 match | `grep -nc "Applied Log convention" .claude/skills/opticup-executor/SKILL.md` → ≥ 1 |
| 8 | E2 — script exists and is valid Node | exit 0 on `--help` | `node scripts/audit/advisors-for-objects.mjs --help; echo $?` → `0` |
| 9 | E2 — script exits 1 on HIGH/ERROR matching positional names | exit 1 | crafted fixture test (see §14 Case 5) |
| 10 | E2 — script exits 0 on no HIGH/ERROR matches | exit 0 | live MCP smoke run (see §14 Case 6) |
| 11 | E2 — script referenced in executor SKILL.md §"Verification After Changes" | ≥ 1 match | `grep -nc "advisors-for-objects" .claude/skills/opticup-executor/SKILL.md` → ≥ 1 |
| 12 | DECISIONS_LOG — 4 new rows in Pattern Recurrence Tracker | A1, A2, E1, E2 each appear as a row | `grep -nc "A1\|A2\|E1\|E2" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` net increase ≥ 4 |
| 13 | Files touched outside scope | 0 | `git diff --name-only origin/develop..HEAD` returns only paths under `.claude/skills/opticup-strategic/references/`, `.claude/skills/opticup-executor/`, `.claude/skills/opticup-architect/references/`, `scripts/audit/`, and the SPEC folder |
| 14 | Iron Rule 31 Integrity Gate | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 15 | Iron Rule 32 Destructive Ops gate passes per commit | All 5 commits pass | pre-commit hook does not block any commit |
| 16 | Retrospective files written | EXECUTION_REPORT.md + FINDINGS.md + RETROSPECTIVE.md exist in SPEC folder | `ls modules/Module\ 1\ -\ Inventory\ Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/` includes the 3 names |

---

## 4. Autonomy Envelope

### What the executor (this skill, single-skill mode) CAN do without asking

- All file edits inside the in-scope paths.
- `mkdir -p scripts/audit/`.
- All git operations on `develop` (add by filename, commit, push).
- MCP `get_advisors` calls (read-only, Level 1) for the smoke run.
- All `grep` / `wc` / `node` verification calls.
- Selective `git add` by filename (never `-A`).

### What REQUIRES stopping and reporting

- Any CHANGE block fails to grep-find its source anchor in the live skill file.
- Any commit blocked by `verify --staged` for a reason other than the well-known pre-existing untracked-files set.
- The smoke run returns exit code other than 0 (the M1B0 object list is known-clean per FOREMAN_REVIEW spot-check 1).
- Any need to touch a file outside the §8 scope list.
- A 5th proposal becomes visible during the harvest (Brief anti-pattern: "no proposals invented during harvest").

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Source CHANGE block missing.** Verbatim text from M1B0 FOREMAN_REVIEW §6/§7 doesn't grep-locate its anchor → STOP, report, do not improvise.
2. **Smoke-run exit code != 0.** If `advisors-for-objects.mjs` against the M1B0 object list returns non-zero, M1B0 wasn't actually advisor-clean → STOP, escalate, reopen M1B0.
3. **DECISIONS_LOG section missing.** If the Pattern Recurrence Tracker table format has drifted from what's in the Brief → STOP, ask before improvising.
4. **§4 commit-count > 5.** Combine commits or stop and re-plan if the natural commit count exceeds 5; do not split single-concern work artificially.
5. **Any file outside §8 scope modified.** STOP.

No Daniel-decision triggers — fully autonomous Pipeline.

---

## 6. Rollback Plan

All commits are additive (new sub-headings, new file, new rows) — no destructive operations. Rollback = `git revert <commit_hash>` for any individual commit, or `git revert HEAD~5..HEAD` for the full SPEC. No DB changes. No code-execution changes (the advisor script is opt-in; nothing calls it automatically).

---

## 7. Destructive Operations

**None.**

This SPEC contains zero destructive operations per Iron Rule 32. All edits are appends or insertions at named anchors; the new script is a NEW file; the DECISIONS_LOG update is row-append. No file deletes, no DB DROP/TRUNCATE/DELETE, no force-pushes, no branch rebases, no mass renames, no governance-file deletions.

If the Executor encounters a need for any destructive operation mid-run → STOP per Iron Rule 32 escalation protocol; do NOT silently amend §7.

---

## 8. Out of Scope (explicit)

In-scope paths (the ONLY paths this SPEC may touch):
- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — A1 + A2
- `.claude/skills/opticup-executor/SKILL.md` — E1 + E2 reference
- `scripts/audit/advisors-for-objects.mjs` — E2 (NEW file)
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — 4 row appends
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/` — SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + RETROSPECTIVE.md

Explicitly OUT of scope:
- All other skill files: `opticup-reviewer`, `opticup-architect/SKILL.md` (root), `opticup-guardian`, `opticup-sentinel`, `opticup-localhost-tester`, `opticup-campaign-overseer`.
- `CLAUDE.md`, `MASTER_ROADMAP.md`, `OPEN_TASKS.md`, `TECH_DEBT.md`.
- Any DB changes (migrations, RPCs, RLS, views, functions, grants, advisors-as-actions).
- Any code outside `.claude/skills/` + `scripts/audit/` + the SPEC folder + the single DECISIONS_LOG row update.
- Any new SPEC authored (only this SPEC is created).
- Any 5th proposal invented during harvest (log to FINDINGS only).
- Storefront repo (`opticalis/opticup-storefront`).
- Module 3 phase letters or phase-status files.

---

## 9. Expected Final State

### New files

- `scripts/audit/advisors-for-objects.mjs` — pure-Node CLI, ~120 lines, shebang `#!/usr/bin/env node`, executable bit set.
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/SPEC.md` — this file.
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/EXECUTION_REPORT.md` — retrospective.
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/FINDINGS.md` — divergence log (D1–D5 from §0 + any new findings).
- `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/RETROSPECTIVE.md` — proposal-text-vs-applied-text comparison.

### Modified files

- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — 2 new §0 sub-headings + 1 new §12 bullet template + citation lines.
- `.claude/skills/opticup-executor/SKILL.md` — 1 new sub-step after §"SPEC Execution Protocol" / Step 2 + 1 new line in §"Verification After Changes" + 1 cross-reference line under §"SQL Autonomy Levels" / Level 1.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — 4 new rows in Pattern Recurrence Tracker.

### Deleted files

None.

### DB state

Unchanged.

### Docs updated (MUST include)

- The 3 skill files above (the harvest itself).
- DECISIONS_LOG (the accounting layer).
- The SPEC folder retrospective files (the audit trail).

NOT updated (intentional, out of scope):
- `MASTER_ROADMAP.md`, `OPEN_TASKS.md`, `TECH_DEBT.md`, `CLAUDE.md`, module-level docs (SESSION_CONTEXT/CHANGELOG/MODULE_MAP/MODULE_SPEC/ROADMAP) — this is a skill-meta-harvest, not a module phase close.

---

## 10. Commit Plan

5 commits, each single-concern. Conventional-commit format, English, present-tense.

| # | Message | Files |
|---|---|---|
| 1 | `docs(spec): open M1_SKILL_IMPROVEMENT_HARVEST + apply A1+A2 — SPEC_TEMPLATE mandatory §0 audits + §12 concurrent-pipeline awareness` | SPEC.md (new) + SPEC_TEMPLATE.md (modified) |
| 2 | `chore(skills): apply E1 — MIGRATION.md Applied Log convention in opticup-executor SKILL.md Step 2` | SKILL.md (modified) |
| 3 | `feat(audit): add scripts/audit/advisors-for-objects.mjs + executor SKILL.md reference (E2)` | advisors-for-objects.mjs (new) + SKILL.md (modified) |
| 4 | `chore(decisions): record A1/A2/E1/E2 promotions in Pattern Recurrence Tracker` | DECISIONS_LOG.md (modified) |
| 5 | `chore(spec): close M1_SKILL_IMPROVEMENT_HARVEST — EXECUTION_REPORT + FINDINGS + RETROSPECTIVE` | 3 new files in SPEC folder |

All commits include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

Why 5 not 4 (Brief suggested 3-5): SPEC.md authoring is bundled with c1 (the A1+A2 SPEC_TEMPLATE change) because both touch the strategic skill's documentation surface and §0/§12 are SPEC-authoring-time concerns the SPEC itself exercises. DECISIONS_LOG gets its own commit (c4) because it's a cross-skill accounting record, not a CHANGE landing.

---

## 11. Dependencies / Preconditions

- `develop` branch checked out, clean (modulo pre-existing untracked Briefs documented at session start).
- Node 18+ on PATH (for the smoke run and for the script itself).
- MCP `mcp__claude_ai_Supabase__get_advisors` available (for the live smoke run on the M1B0 object list).
- Pre-commit hook `scripts/verify.mjs --staged` working (passed by M1B0's 8 commits last close).

### Browser readiness pre-flight (executor instructs at start)

Pre-flight (executor): this SPEC's verification is purely file-content + script-based — no browser required. Skip Chrome readiness check.

---

## 12. Lessons Already Incorporated

This SPEC IS the application of accumulated lessons. It applies, in this single Pipeline:

- FROM `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §6 Proposal 1 → APPLIED as A1 (§0 mandatory audits).
- FROM `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §6 Proposal 2 → APPLIED as A2 (§12 Concurrent-Pipeline awareness).
- FROM `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §7 Proposal 1 → APPLIED as E1 (Applied Log convention).
- FROM `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §7 Proposal 2 → APPLIED as E2 (advisors-for-objects.mjs + SKILL reference).
- FROM `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Author Proposal #1 + Executor Proposal #1 → APPLIED (these are the 1st-strike sources of A1 + E1 respectively; bundled here on the 2-of-3 threshold per Self-Improvement Mandate).
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → APPLIED at template-level (heading convention without `§` prefix — observed in this SPEC's headings).
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 (live baselines) → APPLIED in §0 Baselines (all 4 measured via `wc -c` / `ls`, no author memory).

**Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + skill files: 0 collisions / 5 new-name hits resolved (see §0 Iron Rule 21 sweep).**

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] No file outside §8 scope is in `git diff --name-only origin/develop..HEAD`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + RETROSPECTIVE.md written in SPEC folder.
- [ ] EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present.
- [ ] DECISIONS_LOG.md row count net-increase ≥ 4.
- [ ] Smoke run exit code captured in EXECUTION_REPORT.

---

## 14. Smoke Test Cases

| # | Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|---|
| 1 | A1 sub-headings present | code-review | `grep -nc "Inner-call arity audit\|Smoke-touched schema audit"` on SPEC_TEMPLATE.md | ≥ 2 matches | exact count |
| 2 | A2 concurrent-pipeline bullet present | code-review | `grep -nc "Concurrent-Pipeline awareness\|orthogonality envelope"` on SPEC_TEMPLATE.md | ≥ 1 match | min count |
| 3 | E1 Applied Log sub-step present | code-review | `grep -nc "Applied Log convention"` on opticup-executor SKILL.md | ≥ 1 match | min count |
| 4 | E2 script exists + runs `--help` | code-review | `node scripts/audit/advisors-for-objects.mjs --help; echo $?` | exit 0 + usage text | exit + content |
| 5 | E2 fixture test — synthetic HIGH advisor on listed object | code-review | Write `/tmp/test-advisors.json` with one `{"level":"ERROR","name":"x","detail":"y","metadata":{"name":"test_obj"}}` → `node scripts/audit/advisors-for-objects.mjs --advisors-json /tmp/test-advisors.json test_obj; echo $?` | exit 1 | exact |
| 6 | E2 smoke run — live MCP dump on M1B0 object list | api | `get_advisors` (security + performance), write to `/tmp/m1b0-advisors.json`, run script with the 8 M1B0 names | exit 0 (M1B0 closed clean) | exit |
| 7 | DECISIONS_LOG 4 new rows | code-review | `git diff origin/develop..HEAD -- .claude/skills/opticup-architect/references/DECISIONS_LOG.md \| grep -c "^+|"` | ≥ 4 added rows | min count |
| 8 | Scope discipline | code-review | `git diff --name-only origin/develop..HEAD` | all paths under the §8 in-scope list | set inclusion |

All cases are deterministic, no `visual-browser`, no daytime-only requirements.

---

## 15. Daniel-Decision Sub-Questions

None. This SPEC declares no STOP-on-Daniel-decision trigger.

---

## Appendix A — Notes for the harvester (this single-skill chat)

- M1B0 §6 Proposal 1 CHANGE text is reproduced verbatim where the existing §0 structure allows; minor adaptation only to fit the live header (new sub-headings inserted between existing bullets and the citations paragraph at SPEC_TEMPLATE.md line 60).
- M1B0 §6 Proposal 2 CHANGE text is reproduced verbatim. The Brief's "§11" was a stale section-number reference; the live target is §12 Lessons Already Incorporated. Apply to §12.
- M1B0 §7 Proposal 1 CHANGE text is reproduced verbatim as a new sub-step inside §"SPEC Execution Protocol" / Step 2.
- M1B0 §7 Proposal 2 CHANGE text is the spec for the new Node script; the Brief's locked decision (Decision 3) is implementation (a): script reads advisor JSON from `--advisors-json <path>`, filters HIGH/ERROR, matches positional names, exits non-zero on match.

*End of SPEC.md.*
