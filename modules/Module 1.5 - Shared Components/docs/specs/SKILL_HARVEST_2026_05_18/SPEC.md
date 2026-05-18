---
spec_id: SKILL_HARVEST_2026_05_18
title: Codify 10 SKILL proposals harvested across today's 5-SPEC arc
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1.5 - Shared Components
status: SEALED — ready for execution
parent_specs:
  - M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX
  - M1_LENS_PURCHASE_ORDER_REBUILD
  - M1_LENS_ACTIVE_POS_LIST_REBUILD
  - M1_LENS_GOODS_RECEIPT_REBUILD
  - M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE (Phase 1)
  - M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2
phase: 5-SPEC arc closeout — codify lessons into SKILLs + DECISIONS_LOG
---

# SPEC — SKILL_HARVEST_2026_05_18

## 0. Pre-Authoring Reality Check

### Path verification (Step 1.6)

| Path | Exists | Notes |
|---|---|---|
| `.claude/skills/opticup-strategic/SKILL.md` | ✅ | 1595 lines; append target |
| `.claude/skills/opticup-executor/SKILL.md` | ✅ | 1327 lines; append target |
| `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` | ✅ | 340 lines; append summary entry |

### Step 1.7 — Consumer grep

The 3 SKILL files are read by Claude Code sessions; no other consumers. Updates take effect on next session bootstrap.

### Source proposals (10 total, harvested across today's arc)

**Strategic (5):**
- **P-STRAT-A** (SPEC 6) — `§0` path-resolution should distinguish "USED IN MOCKUP" vs "available in `shared/`"
- **P-STRAT-B** (SPEC 7) — `§0` should include global-name probe for shared components
- **P-STRAT-C** (SPEC 8) — `§1.5` should include `next_*_number` suffix-conformance probe
- **P-STRAT-D** (Resilience Phase 1) — Tier C cleanup pattern for K-RPC smokes must enumerate ALL side-effect tables, not just the primary insert
- **P-STRAT-E** (SPEC 8 FOREMAN_REVIEW) — 🟡→🟢 verdict-upgrade FOREMAN_REVIEW should be written by the SAME session that lands the resolving fix

**Executor (5):**
- **P-EXEC-A** (SPEC 6) — Headless smoke polls must wait on STATE-COMPLETE conditions, not single-trigger-field
- **P-EXEC-B** (SPEC 7) — Read shared component API contract block BEFORE writing the mount call
- **P-EXEC-C** (SPEC 7) — Pair DB mutate+restore in adjacent tool calls before unrelated navigation
- **P-EXEC-D** (SPEC 8) — `22P02 + sequence-number RPC` triage rule
- **P-EXEC-E** (Resilience Phase 1 + Phase 2) — Soft-delete column inventory + `set_config('request.jwt.claims', ...)` pattern for JWT-gated RPC smokes from MCP

### Format (per proposal)

Each entry adheres to:
```
### P-{tier}-2026-05-18-{letter} — {short title}

**Rule:** {one-sentence imperative}

**Why:** {failure mode this prevents, with empirical evidence — which SPEC discovered it}

**How to apply:** {concrete steps / code template}

**Source:** {SPEC slug + section/line reference where it surfaced}
```

This matches Daniel's specified format (rule / why / how-to-apply / empirical evidence).

---

## 1. Goal

Codify 10 SKILL proposals into the persistent `opticup-strategic` + `opticup-executor` SKILL.md files so future Claude Code sessions inherit the lessons without re-discovering them. Update `DECISIONS_LOG.md` with a summary entry for the harvest.

## 2. Background

Today's Path X session ran 5 SPECs back-to-back (FK fix + Group B 6/7/8 + 2 resilience SPECs). Each SPEC's FINDINGS.md flagged 1-3 SKILL proposals. Closing the day without harvesting would lose the lessons across sessions. This SPEC is the codification step.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 2 (author + harvest) |
| S3 | 5 strategic proposals appended to `.claude/skills/opticup-strategic/SKILL.md` | grep `P-STRAT-2026-05-18` | 5 hits |
| S4 | 5 executor proposals appended to `.claude/skills/opticup-executor/SKILL.md` | grep `P-EXEC-2026-05-18` | 5 hits |
| S5 | DECISIONS_LOG entry exists | grep `SKILL_HARVEST_2026_05_18` in DECISIONS_LOG.md | yes |
| S6 | Each proposal contains all 4 required fields (rule, why, how-to-apply, source) | manual review | 10/10 |
| S7 | No SKILL.md file exceeds size red-flag (currently ~1600 lines max; appending ~150-200 lines doesn't trigger any cap — no Iron Rule applies to SKILL files but watch for cognitive load) | wc -l | both files < 2000 lines post-append |
| S8 | Integrity gate exit 0 | `npm run verify:integrity` | exit 0 |
| S9 | Iron Rule 32 — 0 violations | pre-commit | confirmed (this SPEC has §4 None.) |
| S10 | EXECUTION_REPORT + FINDINGS present | `ls` | yes |

## 4. Destructive Operations

**None.** All edits are pure appends — no existing content modified. No file deletions, no signature changes, no DB ops.

## 5. Autonomy Envelope

**Can do without asking:**
- Append 5 P-STRAT proposals to `opticup-strategic/SKILL.md` under a new `## Patterns from SKILL_HARVEST_2026_05_18` section
- Append 5 P-EXEC proposals to `opticup-executor/SKILL.md` under the same section heading
- Append summary entry to `opticup-architect/references/DECISIONS_LOG.md`
- 2 commits per §10

**MUST stop and report:**
- File-size hook fires on any of the 3 files (unlikely — SKILLs are not size-capped, but the integrity gate runs anyway)
- Iron Rule 32 hook fires (this SPEC's §4 declares None.; if it fires, investigate)
- Any of the 3 target files has been touched by another commit since pre-flight (potential merge conflict)

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If the same proposal name already exists in either SKILL → STOP (avoid duplicate codifications)
- If a SKILL file's existing structure has changed since pre-flight (e.g., section reordered) → STOP, re-read

## 7. Out of Scope (explicit)

- Any code change (this is pure docs)
- Any DB change
- Any Pipeline coordination tool change
- Removing or modifying existing SKILL content
- Adding new SKILLs (e.g., a separate "Lessons-2026-05-18.md") — keep additions inline in the existing SKILLs for discoverability

## 8. QA / Verification Plan

1. Run `grep -c "P-STRAT-2026-05-18" .claude/skills/opticup-strategic/SKILL.md` → expect 5.
2. Run `grep -c "P-EXEC-2026-05-18" .claude/skills/opticup-executor/SKILL.md` → expect 5.
3. Run `grep -c "SKILL_HARVEST_2026_05_18" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` → expect ≥ 1.
4. Manual review: each proposal has all 4 fields (rule / why / how-to-apply / source).
5. `npm run verify:integrity` → exit 0.

## 9. Expected Final State

### Repo
- 3 SKILL/decisions files edited (pure appends)
- SPEC folder under `modules/Module 1.5 - Shared Components/docs/specs/SKILL_HARVEST_2026_05_18/` with SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT.md + FINDINGS.md

### DB
- 0 changes

### Future-session effect
- Every new Claude Code session loading either SKILL inherits the 10 lessons.
- Every architect session loading DECISIONS_LOG sees the harvest summary.

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author SKILL_HARVEST_2026_05_18 SPEC` | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `chore(skills): harvest 10 SKILL proposals from 2026-05-18 5-SPEC arc into strategic + executor SKILLs + DECISIONS_LOG` | 3 SKILL/decisions edits + EXECUTION_REPORT + FINDINGS |

Total: **2 commits** (no separate DDL commit needed; no DB ops).

## 11. Pipeline Coordination

`files_owned_globs`:
```
.claude/skills/opticup-strategic/SKILL.md
.claude/skills/opticup-executor/SKILL.md
.claude/skills/opticup-architect/references/DECISIONS_LOG.md
modules/Module 1.5 - Shared Components/docs/specs/SKILL_HARVEST_2026_05_18/**
```

Branch: `develop`. Path X sequential.

## 12. Rollback Plan

If a proposal-content review reveals a mistake post-commit:
- `git revert` the harvest commit (commit 2). The SKILL files return to pre-harvest state.
- Re-edit + re-commit with corrections.

This is the lowest-risk SPEC of the day — pure docs append.

## 13. Pre-Merge Checklist

- [ ] All 10 proposals appended with 4-field format
- [ ] DECISIONS_LOG entry present
- [ ] Integrity gate exit 0
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pure-docs SPEC; 0 destructive ops; 2-commit shape._
