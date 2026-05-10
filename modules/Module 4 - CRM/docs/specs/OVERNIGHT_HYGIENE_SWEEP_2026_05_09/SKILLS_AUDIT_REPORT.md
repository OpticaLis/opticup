# Skills Audit Report — 2026-05-09 (overnight hygiene sweep)

> **Scope:** All 7 active skill files under `.claude/skills/opticup-*/SKILL.md`.
> **Method:** Read-only inventory + cross-reference. No skill files modified.
> **Auditor:** opticup-executor (in-process, sub-agent path declined by Daniel).

## Summary table

| Skill | Purpose (1 line) | Lines | Triggers |
|---|---|---|---|
| `opticup-architect` | Tier-2 architect — cross-module Master Plan, briefs to Module Strategists | 656 | 13 Hebrew/English phrases naming "Architect / Architect / Lead" |
| `opticup-strategic` | SPEC author (Foreman) + post-execution review | 1008 | 3 mandatory triggers: SPEC authoring, post-execution review, strategy discussion |
| `opticup-executor` | Code writer under Bounded Autonomy + retrospective writer | 682 | 3 triggers: SPEC execution, hands-on dev, EXECUTION_REPORT writing |
| `opticup-reviewer` | Read-only QA + Iron Rule compliance checklist | 231 | "review", "audit", "verify", "validate", "check" — code-quality trigger words |
| `opticup-sentinel` | Read-only autonomous monitor — 10 missions, writes only to `docs/guardian/` | 181 | "sentinel", "audit mission", "project scan", "health check", scheduled fires |
| `opticup-guardian` | Project constitution gate — 30 Iron Rules + 5 roles + escalation | 325 | ANY interaction with the Optic Up codebase (universal pre-load) |
| `opticup-campaign-overseer` | Recommend-Only campaign monitor (v1, awaiting 90% gate) | 352 | "you are the campaign overseer", role-assignment phrases |

---

## Per-skill analysis

### `opticup-architect` (656 lines)
**Purpose:** Tier-2 strategic architect — owns the cross-module Master Plan, dispatches briefs to Tier-3 Module Strategists, runs Module Close Ceremonies, maintains `references/DECISIONS_LOG.md`.

**Overlap:** Significant overlap with `opticup-strategic`. Both call themselves "Architect" in their body text (line 26 of architect; line 18 of strategic). The 3-tier autonomy model (Daniel → Main → Module Strategist → Executor) is documented in `opticup-architect`'s description but `opticup-strategic`'s description still says it acts as "BOTH the Architect AND the Foreman role" — reflecting the older 2-tier model. **The two skills describe overlapping responsibilities** (cross-module decisions, lessons harvesting, decision logs with Daniel) without a clean boundary in the skill text.

**Gaps:** Step 4.5 (Module Close Ceremony self-audit) was added 2026-05-09 by STRUCTURE_PROTECTIONS SPEC and works, but the rest of First Action references `MASTER_ROADMAP.md` for current truth — good. However, the Decision Map (lines 105–115) still routes 4 of 8 row destinations through `MASTER_LIVE_PLAN.md` — a file that **was retired 2026-05-09** and now lives at `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md`. This is **stale routing** post-cleanup.

**Duplication with project docs:** Re-states the Daniel communication pattern (lines 71–98) which is also present (slightly differently) in `opticup-strategic` lines 49–82 and `opticup-campaign-overseer` lines 67–80. The "lead with recommendation, one question at a time, plain Hebrew" rule is in 3 separate skill files.

### `opticup-strategic` (1008 lines)
**Purpose:** Author SPECs (Foreman role), then post-execution review them with `FOREMAN_REVIEW.md`. Also handles "architect chat" architectural questions.

**Overlap:** Substantial with `opticup-architect` — both author cross-module decisions, both maintain decision logs, both speak directly to Daniel in plain Hebrew. Description claims to act as BOTH Architect AND Foreman, but `opticup-architect` exists as a separate Tier-2 skill for the architect layer. The boundary between "Tier 2 Architect" and "Tier 3 Module Strategic" is documented in `opticup-architect` but not echoed clearly in `opticup-strategic`.

**Gaps:** Largest skill at 1008 lines (3× the average). Combines 3 distinct roles (architect, foreman, daniel-comms) without internal navigation. A consumer loading the skill cannot easily find the relevant section. The CRM-module commit-split anticipation block (lines 177–189) is excellent context but buried.

**Duplication with CLAUDE.md:** Lines 159–164 restate the 9 "Architectural Principles (Non-Negotiable)" — most of which are also in CLAUDE.md §4–§6. The Iron Rules summary in CLAUDE.md §4–§6 is the canonical version; the skill's principles are a derivative.

### `opticup-executor` (682 lines)
**Purpose:** Code writer who executes SPECs under Bounded Autonomy. Writes `EXECUTION_REPORT.md` + `FINDINGS.md` after every SPEC. Mandatory deliverables.

**Overlap:** Iron Rule summaries (lines 99–113) restate `CLAUDE.md` §4–§6 in abbreviated form. This is the same content as `opticup-reviewer` Level 1 checklist (lines 47–77) and `opticup-guardian` §"30 Rules" full text — **3 copies of the same rules in 3 different skills + the canonical CLAUDE.md = 4 copies total**.

**Gaps:** Does NOT document the `verify.mjs` auto-load contract (the path that the STRUCTURE_PROTECTIONS SPEC's Commit 2/3 prescribed `spawnSync` against, when the actual implementation auto-loads from `scripts/checks/`). Two prior FOREMAN_REVIEWs (PROJECT_STRUCTURE_CLEANUP F1, STRUCTURE_PROTECTIONS F1) recommended this addition — not yet applied.

**Duplication with CLAUDE.md:** Lines 99–121 are a near-verbatim restatement of CLAUDE.md §4. Updating CLAUDE.md doesn't propagate to the skill — drift risk.

### `opticup-reviewer` (231 lines)
**Purpose:** Read-only senior QA — Iron Rule compliance checklist + security/SaaS integrity + code quality.

**Overlap:** Level 1 checklist (lines 47–77) duplicates `opticup-guardian`'s 30-rules section. Level 2 (RLS audit, lines 79–104) overlaps `opticup-sentinel` Mission 1 (rule compliance) + Mission 2 (security audit).

**Gaps:** Doesn't define when to use this skill vs `opticup-sentinel` — both audit Iron Rules. Reviewer is interactive (used during work); Sentinel is autonomous (scheduled). The boundary should be in the description but currently isn't.

**Duplication with project docs:** Light on duplication — mostly delegates to `CLAUDE.md` and `docs/CONVENTIONS.md` by reference.

### `opticup-sentinel` (181 lines)
**Purpose:** Read-only autonomous monitor running 10 missions. Writes only to `docs/guardian/`.

**Overlap:** Mission 1 (rule compliance) overlaps `opticup-reviewer` Level 1 + `opticup-guardian` 30-rules. Mission 10 (Structure Discipline, added 2026-05-09) is unique. Missions 2–9 are unique to Sentinel.

**Gaps:** Loads `opticup-guardian` first (line 39) — this is the only skill that explicitly chains to another skill. No analog in `opticup-reviewer` despite covering similar territory.

**Duplication with project docs:** Mission checklists (`references/missions/01-…10-*.md`) are detailed and largely independent of CLAUDE.md — clean separation.

### `opticup-guardian` (325 lines)
**Purpose:** "Project constitution gate" — full 30 Iron Rules + 5 roles + escalation protocol + SQL autonomy levels. Loaded before any work touches the Optic Up codebase.

**Overlap:** **The Iron Rules section (lines 64+, full text of all 30 rules) is the second canonical source** — the first being `CLAUDE.md` §4–§6. Updating CLAUDE.md does not propagate to the skill, and vice versa. Both files must stay in lock-step.

**Gaps:** Description claims "every agent MUST load this skill before any work" — but in practice `opticup-executor` and `opticup-strategic` do NOT chain-load this skill. They include their own abbreviated rules instead.

**Duplication with CLAUDE.md:** §4–§6 is duplicated in full. Largest single duplication in the skill set.

### `opticup-campaign-overseer` (352 lines)
**Purpose:** Recommend-Only specialist for the Prizma SuperSale campaign. Operates in v1 (recommend-only) until 90%-acceptance gate graduates to v2 (autonomous).

**Overlap:** Daniel communication rules (lines 67–80) overlap `opticup-architect` + `opticup-strategic`.

**Gaps:** Self-improvement mechanism (90% gate) is unique and well-defined.

**Duplication with project docs:** Light. Most content is campaign-specific.

---

## Cross-cutting findings

**1. Iron Rules appear in 4 places** — `CLAUDE.md` §4–§6 (canonical), `opticup-guardian` (full), `opticup-executor` (abbreviated 14 of 30), `opticup-reviewer` Level 1 (checklist by file type). When CLAUDE.md was updated 2026-05-09 with §0.5 Root Discipline Rule, none of the skills auto-updated. Drift risk is real.

**2. Daniel communication pattern in 3 skills** — `opticup-architect`, `opticup-strategic`, `opticup-campaign-overseer` all restate "lead with recommendation, one question, plain Hebrew, no tech detail." Candidate for promotion to a single shared reference (`.claude/skills/_shared/daniel-comms.md`) and `@import` from each.

**3. `opticup-architect` ↔ `opticup-strategic` boundary is unclear** — Both describe themselves as "Architect". Tier-2 vs Tier-3 model is documented but body text predates the model.

**4. Stalest content: `opticup-architect` Decision Map** — 9 references to `MASTER_LIVE_PLAN.md` (retired 2026-05-09). 4 of 8 Decision Map rows route to a non-existent file.

**5. Sentinel chain-loads guardian; others don't** — Inconsistent dependency declarations. Either all 4 audit-related skills should chain-load guardian, or none should (and guardian becomes implicit context).

---

## Recommendations (ordered by impact)

1. **Resolve the `MASTER_LIVE_PLAN.md` staleness in `opticup-architect`** — replace 9 references with `MASTER_ROADMAP.md` (current canonical). 5-minute edit. **Highest impact, lowest cost.**
2. **Consolidate Iron Rules into one canonical block + `@reference` from skills** — remove the duplicate full-text from `opticup-guardian` and the abbreviated copy from `opticup-executor`, replace with "see CLAUDE.md §4–§6". Removes drift risk.
3. **Document the `opticup-architect` ↔ `opticup-strategic` boundary in both skill bodies** — add 3 lines at the top of each: "Tier-2 architect (this skill) vs Tier-3 module strategist (the other)." Already documented in description; missing from body.
4. **Apply the unfinished FOREMAN_REVIEW recommendations to `opticup-executor`** — `verify.mjs` auto-load contract documentation (P1 from PROJECT_STRUCTURE_CLEANUP and STRUCTURE_PROTECTIONS retrospectives) is now 2-cycle overdue.
5. **Add a single `daniel-comms.md` reference and `@import` from 3 skills** — Daniel communication pattern stops drifting across 3 skill files.
