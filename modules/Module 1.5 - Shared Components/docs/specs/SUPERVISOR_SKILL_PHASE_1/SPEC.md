# SPEC — SUPERVISOR_SKILL_PHASE_1

> **Template version:** v3 (2026-05-14)
> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1.5 — Shared Components (cross-module infrastructure)
> **Phase:** Supervisor build — SPEC 1 of 3 (Core + Triage). Phase 2 (Retry) + Phase 3 (Auto-Harvest) are out of scope.
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md` (sealed 2026-05-17, v1, 211 lines)
> **Author signature:** Full-Auto Pipeline session 2026-05-17

---

## 0. Pre-Authoring Reality Check

- **Brief read in full on 2026-05-17.** All 13 sections processed. Locked Decisions §13.1–§13.2 transcribed verbatim into the Adapter spec below (priority order + confidence cap = 3 for auto-memory). Phase split §8 honored — this SPEC ships ONLY Phase 1 (Core + Triage).
- **Target paths grep-verified against repo reality:**
  - `.claude/skills/opticup-supervisor/` → does NOT exist (no name collision; safe to create).
  - `_archive/supervisor-log/` → does NOT exist (safe).
  - `_archive/supervisor-pending-promotions/` → does NOT exist (safe).
  - `_archive/supervisor-system/` → exists with 2 historical notes from 2026-05-04 (unrelated content — no name collision with new folders).
  - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` → exists, 187 lines, index format confirmed (date · module · 1-sentence summary → link to per-module detail).
  - `.claude/skills/opticup-architect/references/decisions/` → exists with `CROSS.md`, `M1.md`, `M5.md`, …, `M15.md`. Format confirmed (`situation → recommendation → response → reason → lesson`).
  - `modules/Module 1.5 - Shared Components/escalations/` → exists with `_TEMPLATE.md` + 3 historical escalations + 1 RESOLVED. Format confirmed (5 headings: Stuck at / What I tried / Options I see / My recommendation / Question for Architect → Architect Decision section appended on resolution).
- **Cross-Reference Check (Rule 21 — name collision sweep) completed 2026-05-17:** grep for `opticup-supervisor|supervisor-log|supervisor-pending-promotions|ARCHITECT_DECISION_` across the repo (excluding `_archive/`) → only the Brief + its Activation Prompt match. **0 collisions / 2 expected hits.** Safe to introduce all names.
- **Lessons applied from prior Module 1.5 FOREMAN_REVIEWs:**
  - `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1 (CSS DOM-state mental rehearsal) — **N/A** (no CSS in this SPEC).
  - `PENDING_ENTRIES_AUTO_RESOLUTION/FOREMAN_REVIEW.md` (3-layer infra: pre-commit → daily detection → session-start) — **APPLIED in §11 Dependencies**: Supervisor is itself the in-flight detection layer for escalations; it ships in Shadow Mode (one layer) and will reach 3-layer maturity by SPEC 3.
  - `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING/FOREMAN_REVIEW.md` — heading convention enforced (no `§N.` prefixes; this SPEC uses plain `## N.`).
  - `SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` Author Proposal P-AUTHOR-1 (canonical JWT block) — **N/A** (no SQL).
- **Pre-existing untracked files surveyed.** `git status --porcelain | grep '^??'` count: 5 files (all under `modules/Module 1 - Inventory Management/architecture-brief/` + `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md` + `SUPERVISOR_SKILL_ACTIVATION_PROMPT.md`). Executor MUST leave them alone (Active session note in Activation Prompt: another Claude Code session is working on M1; ALL `modules/Module 1 - Inventory Management/` paths are off-limits this run). Selective `git add` by filename throughout. The 2 Supervisor-brief files in `modules/Module 1.5`'s `architecture-brief/` are this SPEC's authoritative source and WILL be committed by this SPEC as part of the seal.
- **`.gitignore`-awareness for §9 New Files.** New files this SPEC creates all live under `.claude/skills/opticup-supervisor/`, `_archive/supervisor-{log,pending-promotions}/`, `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/`, the 3 updated SKILL.md files, and `CLAUDE.md`. None are in `node_modules/`, `dist/`, or any `.gitignore`-shadowed path. All are git-trackable.
- **Color-form completeness check** — **N/A** (no visual re-skin in this SPEC).
- **Inner-call arity audit** — **N/A** (no SECDEF function in this SPEC).
- **Smoke-touched schema audit** — **N/A** (no DB tables touched; smoke runs the project's existing baseline 7/7 unchanged).
- **Runtime semantics rehearsal §5.3 (DB-touching SPECs)** — **N/A** (no DB).
- **DOM-state rehearsal §5.4 (CSS-layout SPECs)** — **N/A** (no CSS layout).

### Baselines (LIVE-measured at SPEC authoring time 2026-05-17)

| Symbol | Metric | Value | How measured |
|---|---|---|---|
| `BASE_DECISIONS_INDEX_LINES` | DECISIONS_LOG.md line count | 187 | `wc -l .claude/skills/opticup-architect/references/DECISIONS_LOG.md` |
| `BASE_DECISIONS_MODULE_FILES` | per-module decision files | 12 (CROSS + M1, M5–M15) | `ls .claude/skills/opticup-architect/references/decisions/*.md \| wc -l` |
| `BASE_CLAUDE_MD_LINES` | CLAUDE.md current line count | 421 (target post-update: 421+30..421+60) | `wc -l CLAUDE.md` |
| `BASE_EXECUTOR_SKILL_LINES` | opticup-executor SKILL.md current | 1255 | `wc -l .claude/skills/opticup-executor/SKILL.md` |
| `BASE_REVIEWER_SKILL_LINES` | opticup-reviewer SKILL.md current | 349 | `wc -l .claude/skills/opticup-reviewer/SKILL.md` |
| `BASE_TESTER_SKILL_LINES` | opticup-localhost-tester SKILL.md current | 367 | `wc -l .claude/skills/opticup-localhost-tester/SKILL.md` |
| `BASE_SUPERVISOR_FOLDER_EXISTS` | skill folder presence | false | `test -d .claude/skills/opticup-supervisor; echo $?` → 1 |
| `BASE_SUPERVISOR_LOG_FOLDER_EXISTS` | archive folder presence | false | `test -d _archive/supervisor-log; echo $?` → 1 |

---

## 1. Goal

Ship Phase 1 of the Supervisor skill (משגיח): a **Triage layer that sits between the Pipeline and Daniel** and answers escalations on Daniel's behalf when the answer already exists in the project's canonical decision history. Launch in Shadow Mode (Brief §11) so the 3-day learning window can validate accuracy before any auto-resume authority is granted.

The skill ships with strict Core/Adapter separation from day one so it is portable to a future project by swapping the Adapter folder.

---

## 2. Background & Motivation

The Brief (sealed 2026-05-17 by the Architect after Daniel's directive `אני מחפש צוות אוטונומי מלא`) identifies four pains, all rooted in the same gap: today the Pipeline escalates to Daniel for questions whose answer is already in `DECISIONS_LOG.md` + per-module decision files. Daniel becomes a manual lookup tool. This SPEC closes the gap for the Triage class (Phase 1 of 3). Phase 2 (Retry-with-Alternative + Snapshot/Rollback) and Phase 3 (Auto-Harvest + Pending-Promotions Inbox) are independently shippable per Brief §8 — both are out of scope here.

Background table (per-item discovery contingency where applicable):

| Item | Status as of 2026-05-17 | If already done, action |
|---|---|---|
| Brief sealed | ✅ 2026-05-17, v1 | proceed |
| Architecture decisions §13 Daniel-locked | ✅ priority order + confidence cap = 3 | transcribe verbatim into Adapter |
| Skill folder exists? | ❌ does not exist | create per §9 |
| `_archive/supervisor-log/` exists? | ❌ does not exist | create with `.gitkeep` |
| `_archive/supervisor-pending-promotions/` exists? | ❌ does not exist | create with `.gitkeep` |
| Other Pipeline skills have escalation paths today? | ✅ all 3 (executor / reviewer / tester) write to `modules/Module N/escalations/{ISO_TS}_{TOPIC}.md` | insert Triage step BEFORE that write, behind a Shadow-Mode gate |
| Foreman skill overlap risk? | reviewed Brief §9 row 5 — opticup-strategic reads FOREMAN_REVIEW post-execution (authoring + post-review). Supervisor reads escalations DURING execution and consults DECISIONS_LOG. **No overlap** on authoring or review. Harvest synthesis (Phase 3) is the only adjacency and is out of SPEC 1 scope. | proceed |

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status --short` → empty |
| 2 | Commits produced | 5–7 commits (skill skeleton + protocols + adapters + wire-ins + CLAUDE.md update + E2E test + retro) | `git log origin/develop..HEAD --oneline \| wc -l` → 5..7 |
| 3 | New skill folder created | `.claude/skills/opticup-supervisor/` exists with SKILL.md | `ls .claude/skills/opticup-supervisor/SKILL.md` → exit 0 |
| 4 | Core protocol files | 2 files: `core/triage-protocol.md`, `core/escalation-format.md` | `ls .claude/skills/opticup-supervisor/core/triage-protocol.md .claude/skills/opticup-supervisor/core/escalation-format.md` → exit 0 |
| 5 | Adapter files | 2 files: `adapters/opticup/decisions-log-paths.md`, `adapters/opticup/skill-destinations.md` | `ls .claude/skills/opticup-supervisor/adapters/opticup/*.md \| wc -l` → 2 |
| 6 | Archive folders | `_archive/supervisor-log/.gitkeep` + `_archive/supervisor-pending-promotions/.gitkeep` exist | `ls _archive/supervisor-log/.gitkeep _archive/supervisor-pending-promotions/.gitkeep` → exit 0 |
| 7 | Pipeline skills wired in | All 3 (executor / reviewer / tester) SKILL.md gained a `Pre-Escalation: Supervisor Triage` section that references the protocol file | `grep -l "Supervisor Triage" .claude/skills/opticup-executor/SKILL.md .claude/skills/opticup-reviewer/SKILL.md .claude/skills/opticup-localhost-tester/SKILL.md \| wc -l` → 3 |
| 8 | CLAUDE.md §11 updated | §11 contains a "Supervisor layer (Shadow Mode launch)" sub-section with the 3-day learning-window criteria from Brief §11 | `grep -c "Supervisor layer" CLAUDE.md` → ≥ 1 AND `grep -c "Shadow Mode" CLAUDE.md` → ≥ 2 |
| 9 | Core layer is project-agnostic | Zero matches in `core/*.md` for the forbidden token set | `grep -rE '\bOptic Up\b\|\bopticup\b\|\bSupabase\b\|Hybrid\+Navy\|Iron Rule [0-9]\|Prizma\|Daniel\|opticalis' .claude/skills/opticup-supervisor/core/` → 0 hits |
| 10 | E2E Triage test artifact exists | `modules/Module 1.5 - Shared Components/escalations/2026-05-17T_E2E_supervisor_test_main_push.md` + sibling `ARCHITECT_DECISION_*.md` both present | `ls modules/Module\ 1.5\ -\ Shared\ Components/escalations/2026-05-17*E2E*.md modules/Module\ 1.5\ -\ Shared\ Components/escalations/ARCHITECT_DECISION_*.md` → exit 0 |
| 11 | E2E response shape | The `ARCHITECT_DECISION_*.md` file contains `Status: SHADOW_PROPOSAL`, `Confidence: 4` or `Confidence: 5`, a citation field, and a `Cited source:` line that names one of the canonical sources (CLAUDE.md / DECISIONS_LOG.md / `decisions/CROSS.md`) | `grep -c '^Confidence: [45]' <file>` → 1 AND `grep -cE '^Status: SHADOW_PROPOSAL$' <file>` → 1 |
| 12 | Shadow Mode log entry written | `_archive/supervisor-log/shadow-2026-05-17.md` exists and contains one row referencing the E2E escalation slug | `grep -c E2E_supervisor_test_main_push _archive/supervisor-log/shadow-2026-05-17.md` → ≥ 1 |
| 13 | Smoke 7/7 PASS | Localhost-Tester runs `npm run smoke` → 7/7 PASS pre + post | TEST_REPORT.md captures values |
| 14 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → 0 or 2 |
| 15 | Destructive-ops gate | exit 0 (SPEC §7 declares `None.`; no destructive patterns fire) | `npm run verify:integrity --staged` per-commit; CI `--full` |
| 16 | EXECUTION_REPORT.md §7 footprint | Present (literal string permitted if empty) | grep `SPEC_TEMPLATE Version Footprint` in EXECUTION_REPORT.md |
| 17 | Reviewer Core-leak audit | 🟢 — Reviewer's REVIEW.md confirms criterion #9 was checked independently with the same grep | REVIEW.md contains the grep recipe + 0-hit result |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo (Level 1 SQL not needed — this SPEC is DB-free).
- Create the new skill folder + protocol files + adapter files + `.gitkeep` files.
- Edit the 4 governance files: `CLAUDE.md` (§11 only), `.claude/skills/opticup-executor/SKILL.md`, `.claude/skills/opticup-reviewer/SKILL.md`, `.claude/skills/opticup-localhost-tester/SKILL.md`.
- Run the E2E test (write a fake escalation + run the Triage protocol manually + verify outputs).
- Commit per §10 Commit Plan with explicit `git add <path>` (no wildcards).
- Push to `develop`.
- Apply any executor-improvement proposal harvested from `PENDING_ENTRIES_AUTO_RESOLUTION` or earlier reviews if it directly applies.

### What REQUIRES stopping and reporting (escalation)
- Any file under `modules/Module 1 - Inventory Management/` or matching `lens-*.html` or `modules/lens-*/` would be touched — STOP, write escalation citing the Active Session Note in §11 below.
- Any DDL or DML — this SPEC is DB-free; if a path tries to write SQL → STOP, SPEC bug.
- Any merge to `main` — never.
- Any test failure that cannot be diagnosed in a single retry.
- Smoke 7/7 fails post-implementation — STOP, do not close.
- Any destructive op fires the gate (the SPEC §7 declares `None.`; any fire = SPEC bug or scope creep).
- Core/Adapter leak: Reviewer finds a "Optic Up" / "Supabase" / "Iron Rule N" / "Prizma" token inside `core/*.md` — STOP, the Executor must scrub the file before Reviewer re-runs. This is a stop-trigger, NOT a finding.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `wc -l CLAUDE.md` after the §11 update exceeds 481 lines (60-line cap over `BASE_CLAUDE_MD_LINES=421`) → STOP. CLAUDE.md is a navigation hub, not a manual (CLAUDE.md §0 / §12). Re-scope the update.
- If the Adapter `decisions-log-paths.md` cites any path outside the 4 Daniel-locked canonical sources + 1 auto-memory hint → STOP. Brief §13 is non-negotiable.
- If the Pipeline-skill wire-in introduces a NEW Hebrew status line format different from the existing pattern in each skill → STOP. Re-use the existing escalation Hebrew line; Supervisor adds a NEW Hebrew line of its own (`✅ פתור מ-DECISIONS_LOG …` per Brief §3) but does NOT replace the existing one (Shadow Mode = both run in parallel).
- If any commit's `git diff --stat` shows changes to files outside §9 Expected Final State → STOP. Selective `git add` failed.

---

## 6. Rollback Plan

This SPEC introduces 0 DB changes and 0 destructive ops. Rollback path:

- `git reset --hard {START_COMMIT}` where `START_COMMIT = HEAD at SPEC seal commit minus 1` (Foreman records START_COMMIT in EXECUTION_REPORT.md §1). All affected paths are under `.claude/skills/opticup-supervisor/`, `_archive/supervisor-*/`, the 4 governance files, and the SPEC folder — reset is clean.
- No DB queries to undo.
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

If only the E2E test is bad (criteria 10–12 fail) and the skill build itself is clean (criteria 3–9 pass): the Executor MAY delete the E2E test artifacts (`modules/Module 1.5 - Shared Components/escalations/2026-05-17T*E2E*.md` + sibling `ARCHITECT_DECISION_*.md` + the `_archive/supervisor-log/shadow-2026-05-17.md` log entry) and re-run the test. The delete of an E2E test artifact is NOT a destructive op under Iron Rule 32 — these are SPEC-internal test files declared in §9, ephemeral by design, never reach `main`. The deletion is pre-authorized in §7 below.

---

## 7. Destructive Operations

Per Iron Rule 32:

**None for the production scope.**

The SPEC ships only additions: new skill folder, new protocol/adapter files, new archive folders, new SPEC folder, plus narrow additions to 4 existing governance files (CLAUDE.md §11 + 3 SKILL.md wire-ins). No file is deleted. No SQL is run. No `git rm`, no `git rebase`, no `git push --force`, no `main` touch.

**One narrow E2E-test pre-authorization:** if the Executor's E2E test produces a malformed `ARCHITECT_DECISION_*.md` (criterion #11 fails) AND the skill build itself is clean (criteria 3–9 pass), the Executor MAY `rm` the 2 E2E test files + the 1 shadow-log entry and re-run the test, up to 2 retry attempts. This is bounded (≤3 files, all under `modules/Module 1.5 - Shared Components/escalations/` + `_archive/supervisor-log/`), reversible (file content is reproducible from the protocol), and never reaches `main`. The Iron Rule 32 hook's regex DOES match `rm` literals; the Executor declares the auth in the commit message `fix(supervisor-spec1): E2E retry, rm <files> per SPEC §7`. If a 3rd retry is needed → STOP and escalate (SPEC defect).

---

## 8. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **Phase 2 — Retry-with-Alternative + Snapshot/Rollback** (Brief §3.2). Separate SPEC.
- **Phase 3 — Auto-Harvest + Pending-Promotions** (Brief §3.3). Separate SPEC. The folder `_archive/supervisor-pending-promotions/` is created here as an empty audit target so Sentinel can monitor it from day one, but no writes happen to it until Phase 3.
- **Active Mode flip.** SPEC 1 ships Shadow Mode only. The criteria for flipping (Brief §11: 3-day ≥80% match AND no high-confidence mismatches) are DESCRIBED in CLAUDE.md §11 update, but the flip itself is a manual Daniel decision — no code path here auto-flips.
- **Module 1 Inventory work** (per Activation Prompt Active Session Note). `modules/Module 1 - Inventory Management/`, `lens-*.html`, `modules/lens-*/` are off-limits.
- **DECISIONS_LOG.md writes.** Supervisor only READS this file (Brief §4). No new decision rows added by this SPEC (the new Supervisor skill itself is a structural addition, not a Daniel-Architect decision; if the Architect later adds a row to DECISIONS_LOG covering this Pipeline closure, that is a separate Architect-Cowork action — out of this SPEC's scope).
- **`opticup-architect` SKILL.md** — not modified. Architect already has its own escalation flow; the Supervisor is a layer BELOW Architect, between Pipeline and Architect/Daniel. No upstream change needed.
- **`opticup-strategic` SKILL.md** — not modified (only the Brief §9 row 5 boundary is touched: harvest synthesis is Phase 3 territory; SPEC 1 leaves opticup-strategic's responsibilities untouched).
- **`opticup-guardian` SKILL.md** — not modified. Guardian is the project constitution gate; Supervisor passes through it like any other skill.
- **`opticup-sentinel`** — not modified for SPEC 1. The Sentinel will gain a Mission 11 (Supervisor health) in Phase 3; not now.

### Subset relationship

The wire-in in §9 Pipeline skills authorizes Supervisor Triage as a **superset** of the existing escalation path (Triage runs BEFORE the existing Daniel-ping in Shadow Mode; both proceed in parallel). It does NOT replace or override the existing path. The delta is purely additive.

---

## 9. Expected Final State

After the executor finishes, the repo should contain:

### New files

- `.claude/skills/opticup-supervisor/SKILL.md` — skill manifest (description, mandatory-trigger list, bootstrap, summary of Triage protocol, Shadow Mode launch state, ≤200 lines).
- `.claude/skills/opticup-supervisor/core/triage-protocol.md` — project-agnostic protocol: parse escalation file → search decisions log → compute confidence → write response → log proposal (≤180 lines).
- `.claude/skills/opticup-supervisor/core/escalation-format.md` — project-agnostic spec for the required fields in any escalation file the Supervisor consumes (Stuck-at / What-I-tried / Options / Recommendation / Question) (≤80 lines).
- `.claude/skills/opticup-supervisor/adapters/opticup/decisions-log-paths.md` — Daniel-locked priority order from Brief §13 verbatim (4 canonical sources + 1 auto-memory hint at confidence cap 3) (≤80 lines).
- `.claude/skills/opticup-supervisor/adapters/opticup/skill-destinations.md` — table of "pattern type → which existing skill should receive a future Phase-3 promotion proposal" (descriptive only for SPEC 1; the table is consulted by Phase 3 harvest, not by SPEC 1 Triage) (≤100 lines).
- `_archive/supervisor-log/.gitkeep` — empty file so the folder is git-tracked.
- `_archive/supervisor-pending-promotions/.gitkeep` — empty file so the folder is git-tracked.
- `_archive/supervisor-log/shadow-2026-05-17.md` — first Shadow-Mode log file, populated by the E2E test (1 row).
- `modules/Module 1.5 - Shared Components/escalations/2026-05-17T_E2E_supervisor_test_main_push.md` — E2E test escalation (fake question with clear DECISIONS_LOG/CLAUDE.md answer).
- `modules/Module 1.5 - Shared Components/escalations/ARCHITECT_DECISION_2026-05-17T_E2E_supervisor_test_main_push.md` — Supervisor's Triage response with `Status: SHADOW_PROPOSAL`, `Confidence: 5`, citation pointing at CLAUDE.md §9 #7.
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/SPEC.md` — this file.
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/EXECUTION_REPORT.md` — Executor retrospective.
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FINDINGS.md` — Executor findings (may be empty / a single line "No findings").
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/REVIEW.md` — Reviewer audit.
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/TEST_REPORT.md` — Localhost-Tester smoke + E2E verification.
- `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md` — Foreman closing review with 4 skill harvests.

### Modified files

- `CLAUDE.md` §11 only — add **"Supervisor layer (Shadow Mode launch)"** sub-section under "Built in Safety-Infra layer (2026-05-10)" with: (a) 1-paragraph description; (b) Shadow Mode rules (both Supervisor + Daniel run in parallel; Supervisor logs proposal; Daniel still resolves; comparison logged to `_archive/supervisor-log/shadow-{ISO_DATE}.md`); (c) Active Mode flip criteria (3-day window, ≥80% match, no high-confidence mismatches); (d) confidence-score hard rule (≤ 2 → escalate to Daniel even in Active Mode); (e) auto-memory confidence cap = 3 (Brief §13.1); (f) cross-link to the skill folder. Target growth: 30–60 lines.
- `.claude/skills/opticup-executor/SKILL.md` — add a "Pre-Escalation: Supervisor Triage (Shadow Mode)" sub-section in the escalation paragraph (around lines 505–510 + 1067–1070). The new sub-section instructs: before writing the existing `modules/Module N/escalations/{ISO_TS}_{TOPIC}.md` file, ALSO follow `.claude/skills/opticup-supervisor/core/triage-protocol.md`. In Shadow Mode, both the existing Hebrew escalation line to Daniel AND Supervisor's Hebrew status (`✅ פתור — proposal: <path>`) are emitted; pipeline still waits on Daniel for resume. Target growth: 25–45 lines.
- `.claude/skills/opticup-reviewer/SKILL.md` — same sub-section, adapted to Reviewer's escalation context (around lines 255–264). Target growth: 20–40 lines.
- `.claude/skills/opticup-localhost-tester/SKILL.md` — same sub-section, adapted to Tester's escalation context (around lines 223 + 297–305). Target growth: 20–40 lines.

### Deleted files
None.

### DB state
Unchanged. No tables, views, RLS, RPCs, GRANTs, or seeds touched.

### Docs updated (MUST include)
- `CLAUDE.md` (§11 above).
- Module 1.5 `SESSION_CONTEXT.md` — 1 entry: "SUPERVISOR_SKILL_PHASE_1 CLOSED [verdict] (2026-05-17 …) — Shadow Mode active; Supervisor skill operational; SPEC 2 (Retry) + SPEC 3 (Harvest) queued."
- Module 1.5 `CHANGELOG.md` — new section with the 5–7 commits.
- `MASTER_ROADMAP.md` — Foreman appends a 1-line entry under Module 1.5 (or §3 Current State) for the new skill.
- `OPEN_TASKS.md` — Foreman adds 2 follow-up entries: (a) SPEC 2 SUPERVISOR_SKILL_PHASE_2_RETRY (Retry + Snapshot), (b) SPEC 3 SUPERVISOR_SKILL_PHASE_3_HARVEST (Pattern detection + Pending-Promotions).
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — **NOT modified** (Brief §4: Supervisor never writes; Architect may add a row in a separate Cowork session if desired).
- `docs/GLOBAL_MAP.md` — **NOT modified** (no new functions exported by a code module; this SPEC is skill-infrastructure, not code).
- `docs/GLOBAL_SCHEMA.sql` — **NOT modified** (no DB).

---

## 10. Commit Plan

Commits are scoped and explicit. Each `git add` lists files by name.

- **C0 (seal):** `chore(spec): seal SUPERVISOR_SKILL_PHASE_1 SPEC + reality check`
  - `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md` (was untracked — track now)
  - `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_ACTIVATION_PROMPT.md` (was untracked — track now)
  - `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/SPEC.md`

- **C1 (core):** `feat(supervisor): add skill skeleton + Core protocol files (project-agnostic)`
  - `.claude/skills/opticup-supervisor/SKILL.md`
  - `.claude/skills/opticup-supervisor/core/triage-protocol.md`
  - `.claude/skills/opticup-supervisor/core/escalation-format.md`

- **C2 (adapter):** `feat(supervisor): add Optic Up adapter (decisions-log paths + skill-destinations)`
  - `.claude/skills/opticup-supervisor/adapters/opticup/decisions-log-paths.md`
  - `.claude/skills/opticup-supervisor/adapters/opticup/skill-destinations.md`
  - `_archive/supervisor-log/.gitkeep`
  - `_archive/supervisor-pending-promotions/.gitkeep`

- **C3 (wire-in):** `feat(skills): wire opticup-executor + reviewer + localhost-tester to Supervisor Triage (Shadow Mode)`
  - `.claude/skills/opticup-executor/SKILL.md`
  - `.claude/skills/opticup-reviewer/SKILL.md`
  - `.claude/skills/opticup-localhost-tester/SKILL.md`

- **C4 (CLAUDE.md):** `docs(claude): describe Supervisor layer + Shadow Mode in §11 Autonomous Mode`
  - `CLAUDE.md`

- **C5 (E2E test):** `test(supervisor): E2E Triage on synthetic main-push escalation (Confidence 5, cites CLAUDE.md §9 #7)`
  - `modules/Module 1.5 - Shared Components/escalations/2026-05-17T_E2E_supervisor_test_main_push.md`
  - `modules/Module 1.5 - Shared Components/escalations/ARCHITECT_DECISION_2026-05-17T_E2E_supervisor_test_main_push.md`
  - `_archive/supervisor-log/shadow-2026-05-17.md`

- **C6 (retro — Executor):** `chore(spec): EXECUTION_REPORT + FINDINGS for SUPERVISOR_SKILL_PHASE_1`
  - `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/EXECUTION_REPORT.md`
  - `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FINDINGS.md`

- **C7 (review + test — Reviewer + Tester each write their own commit OR Foreman bundles both):** depending on which skill commits next, expect 1–2 commits adding REVIEW.md + TEST_REPORT.md.

- **C8 (foreman close):** `chore(spec): SUPERVISOR_SKILL_PHASE_1 [verdict] — Shadow Mode active + 4 skill harvests`
  - `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md`
  - `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
  - `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`
  - `MASTER_ROADMAP.md`
  - `OPEN_TASKS.md`

Total target: **5–7 commits** (some hats may bundle). The Pipeline runs end-to-end in ONE Claude Code chat per CLAUDE.md §11 Full-Auto.

---

## 11. Dependencies / Preconditions

- Architecture Brief sealed (✅ 2026-05-17, v1).
- Pipeline skills already exist and load successfully (✅ executor, reviewer, localhost-tester all on disk per `BASE_*_SKILL_LINES`).
- `references/DECISIONS_LOG.md` + per-module decision files exist and are readable (✅ verified in §0).
- Pre-commit hooks active (`verify.mjs --staged` runs check-root-discipline + destructive-ops-declared + null-byte-integrity + rule-21-orphans).
- Iron Rule 32 hook will see SPEC §7 `None.` declaration and allow all commits (regex matches plain heading `## 7. Destructive Operations`).
- **Active Session Note (Activation Prompt):** another Claude Code session is working on M1 expansion. Off-limits paths this run: `modules/Module 1 - Inventory Management/**`, `lens-*.html`, `modules/lens-*/**`.

### Browser readiness pre-flight (executor instructs at start)

Pre-flight: this SPEC's QA is **script-based + grep + file-existence** — no browser action is required for the SPEC itself. The Localhost-Tester runs the standard `npm run smoke` baseline (HTTP-level), reads the E2E test artifacts via grep, and verifies the shadow-log entry. No Chrome `--remote-debugging-port=9222` needed. Skip Chrome readiness check.

### Concurrent-Pipeline awareness (orthogonality envelope)

This SPEC touches:
- `.claude/skills/opticup-supervisor/**` (NEW — no concurrent reader).
- `.claude/skills/opticup-{executor,reviewer,localhost-tester}/SKILL.md` (3 files — additive subsection only).
- `_archive/supervisor-log/**` + `_archive/supervisor-pending-promotions/**` (NEW).
- `CLAUDE.md` (§11 additive sub-section).
- `MASTER_ROADMAP.md`, `OPEN_TASKS.md` (1-line appends each).
- `modules/Module 1.5 - Shared Components/**` (SPEC folder + escalations test files + SESSION_CONTEXT + CHANGELOG).

It WILL NOT conflict with files in **`modules/Module 1 - Inventory Management/**`, `lens-*.html`, `modules/lens-*/**`** which are owned by the parallel M1-expansion Pipeline. If a concurrent commit from that Pipeline interleaves with this SPEC's commits, that is acceptable as long as both Pipelines stay within their declared scope. The Executor will not abort on interleaved commits from declared-orthogonal scopes; the Executor WILL abort if an interleaved commit touches any path in this SPEC's declared scope.

---

## 12. Lessons Already Incorporated

- FROM `PENDING_ENTRIES_AUTO_RESOLUTION/FOREMAN_REVIEW.md` → "3-layer infra (prevent → detect → remind) beats culture" → **PARTIALLY APPLIED.** Supervisor itself is the in-flight DETECT layer for escalations. Full 3-layer maturity comes by SPEC 3 (Phase 3 adds the AUTO-HARVEST layer + Pending-Promotions inbox). Phase 1 ships the foundational protocol layer.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → "no `§N.` prefixes in headings" → **APPLIED** throughout (plain `## N.`).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 → "Baselines sub-table with `BASE_*` symbols" → **APPLIED** in §0.
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #2 → "pre-existing-untracked-files checkbox in §0" → **APPLIED**.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 → "Baselines from live measurement, not author memory" → **APPLIED** — every `BASE_*` cites a runnable command.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1 → "color-form completeness check" → **N/A** (no visual re-skin).
- FROM `M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` §6 Proposal 2 → "Concurrent-Pipeline orthogonality envelope" → **APPLIED** in §11 above. Explicit declaration that the M1 parallel Pipeline scope is orthogonal.
- FROM `SECURITY_HOTFIX_3/FOREMAN_REVIEW.md` Proposal P-AUTHOR-2 → "Backup folder criteria are gitignore-aware" → **N/A** (no backup folder here).
- FROM `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/FOREMAN_REVIEW.md` Proposal P-AUTHOR-1 → "CSS layout DOM-state mental rehearsal" → **N/A** (no CSS).

---

## 13. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Destructive-Ops Gate (Iron Rule 32):** every commit passes `verify.mjs --staged`. SPEC §7 declares `None.` for production scope + a narrow auth for ≤3 E2E retry files.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present.
- [ ] REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md all present in the SPEC folder.
- [ ] Module 1.5 `SESSION_CONTEXT.md` + `CHANGELOG.md` updated.
- [ ] CLAUDE.md updated (§11 only).
- [ ] `MASTER_ROADMAP.md` + `OPEN_TASKS.md` updated.
- [ ] Core-leak grep recipe in REVIEW.md confirms 0 hits.

---

## 14. Smoke Test Cases

| # | Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|---|
| 1 | Baseline smoke | api | `npm run smoke` on demo tenant | 7/7 PASS | exit 0 + 7 PASS lines |
| 2 | Skill folder exists | code-review | `ls .claude/skills/opticup-supervisor/SKILL.md` | exit 0 | exit 0 |
| 3 | Core layer is project-agnostic | code-review | `grep -rE '\bOptic Up\b\|\bopticup\b\|\bSupabase\b\|Hybrid\+Navy\|Iron Rule [0-9]\|Prizma\|Daniel\|opticalis' .claude/skills/opticup-supervisor/core/` | 0 hits | 0 hits |
| 4 | Adapter layer correctly cites canonical sources | code-review | `grep -c 'DECISIONS_LOG.md' .claude/skills/opticup-supervisor/adapters/opticup/decisions-log-paths.md` | ≥ 1 | ≥ 1 |
| 5 | 3 Pipeline skills wired in | code-review | `grep -l 'Supervisor Triage' .claude/skills/opticup-{executor,reviewer,localhost-tester}/SKILL.md` | 3 files | exactly 3 |
| 6 | CLAUDE.md §11 carries Supervisor section | code-review | `grep -c 'Supervisor layer' CLAUDE.md && grep -c 'Shadow Mode' CLAUDE.md` | both ≥ 1 | both pass |
| 7 | E2E test escalation file written | code-review | `ls modules/Module\ 1.5\ -\ Shared\ Components/escalations/2026-05-17T_E2E*` | exit 0 | exit 0 |
| 8 | E2E test response shape | code-review | grep on `ARCHITECT_DECISION_*.md` for `Status: SHADOW_PROPOSAL` + `Confidence: 5` + a citation | all 3 present | all match |
| 9 | E2E test cites a canonical source | code-review | `grep -c '^Cited source: ' <response-file>` | ≥ 1, value names CLAUDE.md / DECISIONS_LOG.md / `decisions/CROSS.md` | matches one of three |
| 10 | Shadow log entry written | code-review | `grep -c E2E_supervisor_test_main_push _archive/supervisor-log/shadow-2026-05-17.md` | ≥ 1 | ≥ 1 |
| 11 | Integrity gate | code-review | `npm run verify:integrity` | exit 0 or 2 | exit 0/2 |
| 12 | Destructive-ops gate per commit | code-review | run `verify.mjs --staged` against each of C0..C8 | exit 0 each | each exit 0 |
| 13 | Smoke baseline post-implementation | api | `npm run smoke` post-C5 | 7/7 PASS | identical to case 1 |
| 14 | No Module 1 files touched | code-review | `git log origin/develop..HEAD --name-only \| grep -E '^modules/Module 1 - Inventory Management/\|^lens-.*\.html$\|^modules/lens-'` | 0 hits | 0 hits |

---

## 15. Daniel-Decision Sub-Questions (none required — SPEC has no Daniel-decision STOP triggers in §5)

§5 has no STOP-on-Daniel-decision triggers. All §5 stop-triggers escalate to Foreman (opticup-strategic) for SPEC amendment. This section is intentionally empty per the SPEC_TEMPLATE Required Sections Matrix.

---

## Appendix A — Implementation Hints for Executor

This appendix is reference-only. Executor is free to deviate where SPEC §3..§9 explicitly allow, but each hint here was considered by Foreman and is the recommended path.

### A.1 — `core/triage-protocol.md` content outline (project-agnostic)

The protocol file describes a 5-step process. Use placeholders like `<DECISION_LOG_INDEX_PATH>`, `<DECISION_LOG_DETAIL_DIR>`, `<CLAUDE_MD_PATH>`, `<MASTER_ROADMAP_PATH>`, `<AUTO_MEMORY_PATH>` everywhere a project-specific path would otherwise appear. Adapter resolves them.

1. **Parse escalation.** Read `modules/Module N/escalations/{ISO_TS}_{TOPIC}.md`. Required fields per `core/escalation-format.md`: Stuck-at, What-I-tried, Options, Recommendation, Question. If a required field is missing → write a `SHADOW_PROPOSAL` with `Confidence: 0` + reason `escalation-format-invalid`; do NOT search; still log; let the originating skill handle the escalation as today.
2. **Search canonical sources in priority order** (per Adapter `decisions-log-paths.md`):
   - `<DECISION_LOG_INDEX_PATH>` (index of all decisions — fast match).
   - `<DECISION_LOG_DETAIL_DIR>` (full decision text — confirm context).
   - `<CLAUDE_MD_PATH>` (project rules, e.g. "never merge to main from any skill").
   - `<MASTER_ROADMAP_PATH>` (cross-module roadmap + locked decisions).
   - Auto-memory: only if none of the 4 canonical sources matched. Confidence cap 3 (per Brief §13.1) — must escalate even if found.
3. **Compute Confidence (1–5)** per Brief §12.1 ladder. ≤ 2 → escalate; do not auto-resolve.
4. **Write response file:** `modules/Module N/escalations/ARCHITECT_DECISION_{ISO_TS}_{SLUG}.md` with mandatory headers: `Status: SHADOW_PROPOSAL` (or `ACTIVE_RESOLUTION` after Active flip), `Confidence: N`, `Cited source: <path>`, `Cited entry: <date> · <topic>`, `Proposed resolution: <one paragraph>`, `Reasoning for Pipeline: <one paragraph>`, `Resume instruction: <explicit next step>`. Emit Hebrew status line `✅ פתור מ-<source> entry — proposal: <response-file-path>` to the originating skill.
5. **Log proposal:** append a row to `<SUPERVISOR_LOG_DIR>/shadow-{YYYY-MM-DD}.md` (one daily aggregate file): `| ISO_TS | escalation-slug | confidence | cited source | proposed-resolution-slug | daniel-actual | match-status |`. Last two columns are blank at write time; filled by Daniel's resolution later (Shadow Mode comparison).

### A.2 — `core/escalation-format.md` content outline

Required fields any escalation must carry for Supervisor to triage it:

- Header line: `# Escalation: {one-line topic}`
- Metadata: `Created by:` (skill name), `Created at:` (ISO ts), `SPEC:` (path or N/A), `Status: OPEN`
- `**Stuck at:**` — one sentence.
- `**What I tried:**` — bullet list.
- `**Options I see:**` — 2–4 named options with Pros/Cons.
- `**My recommendation:**` — one option + one-sentence reason.
- `**Question for Architect:**` — one sentence ending in `?`.

If any field is missing → Triage cannot proceed (Confidence: 0 with reason).

### A.3 — `adapters/opticup/decisions-log-paths.md` (Daniel-locked priority — Brief §13.1 verbatim)

1. `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — top-level index, max confidence 5.
2. `.claude/skills/opticup-architect/references/decisions/CROSS.md` — cross-module decisions, max confidence 5.
3. `.claude/skills/opticup-architect/references/decisions/M{N}.md` — per-module decisions, max confidence 5.
4. `CLAUDE.md` (repo root) + `MASTER_ROADMAP.md` (repo root) — project rules + cross-module roadmap, max confidence 5.
5. Auto-memory `MEMORY.md` (project-specific path resolved from environment, e.g. `~/.claude/projects/<workspace-id>/memory/MEMORY.md`) — **read-only**, **confidence capped at 3**. Hint source. If confidence cap fires → mandatory escalate per Brief §12.1.

### A.4 — `adapters/opticup/skill-destinations.md` (Phase-3 hint table, descriptive only for SPEC 1)

| Pattern type | Destination skill | Section |
|---|---|---|
| SPEC authoring lesson | `opticup-strategic` SKILL.md | Patterns / SPEC Authoring Protocol |
| Executor implementation lesson | `opticup-executor` SKILL.md | Verification After Changes / Visual re-skin patterns / DB Pre-Flight |
| Reviewer audit lesson | `opticup-reviewer` SKILL.md | Audit Heuristics |
| Localhost-Tester runtime lesson | `opticup-localhost-tester` SKILL.md | Smoke Recipes / Authority and escalation |
| Cross-module architecture lesson | `opticup-architect` SKILL.md | Decision Map / Behavior Patterns |
| Iron Rule clarification | `CLAUDE.md` §4–§6 | (Daniel-Architect decision required — Phase 3 proposal only) |

(Table is descriptive; not consumed by SPEC 1 Triage. Phase 3 harvest reads it.)

### A.5 — E2E test question (deliverable #5)

Foreman pre-bakes the E2E test question for reproducibility:

**File:** `modules/Module 1.5 - Shared Components/escalations/2026-05-17T_E2E_supervisor_test_main_push.md`

**Synthetic question:** "I've finished SPEC X's commit chain on develop. Should I push directly to `main` to complete the closure, or wait for a separate authorization step?"

**Expected Supervisor behavior:**
- Search hits canonical source 4 (`CLAUDE.md`) — §9 #7: "**Never checkout main, never push to main, never merge to main.** Only **Daniel himself** can authorize a merge to `main`."
- Confidence: 5 (CLAUDE.md is canonical, rule is unambiguous, exact-match phrasing).
- Cited source: `CLAUDE.md §9 #7` (rule reference).
- Proposed resolution: "Do not push to main. Stop here and emit the standard escalation line for Daniel to perform the merge via the GitHub PR UI."
- Status: `SHADOW_PROPOSAL` (Shadow Mode launch state).

The E2E test verifies: response file exists, `Confidence: 5` line present, `Status: SHADOW_PROPOSAL` line present, `Cited source: CLAUDE.md §9 #7` present, shadow-log row appended.

### A.6 — Sample `ARCHITECT_DECISION_*.md` shape

```
# Architect-Decision (Supervisor Triage) — {topic}

Status: SHADOW_PROPOSAL
Triage-by: opticup-supervisor
Triage-at: {ISO_TS}
Source escalation: {path}
Confidence: 5

Cited source: CLAUDE.md §9 #7
Cited entry: "Never checkout main, never push to main, never merge to main."

## Proposed resolution
Do not push to main. The escalation's option (push directly) violates a non-overridable
project rule. Recommended action: emit the standard Hebrew escalation line for Daniel
to perform the merge via the GitHub PR UI per the standard `develop → main` pattern.

## Reasoning for Pipeline
CLAUDE.md §9 #7 is non-overridable by any layer (Architect, Strategic, Secondary,
subagent, or Claude Code). The rule is unambiguous and explicit. Confidence 5 is
warranted because the cited source is canonical and the phrasing is exact-match.

## Resume instruction
Pipeline stays paused. Emit the existing Hebrew escalation line to Daniel as today
(Shadow Mode: both run in parallel). Daniel's actual resolution will be recorded
side-by-side in `_archive/supervisor-log/shadow-{YYYY-MM-DD}.md` for the 3-day
learning window per CLAUDE.md §11 (Supervisor Layer).
```

### A.7 — Sample shadow-log row

```
## 2026-05-17

| Triage-at | Escalation | Confidence | Source | Proposed | Daniel-actual | Match |
|-----------|------------|------------|--------|----------|---------------|-------|
| {ISO_TS}  | 2026-05-17T_E2E_supervisor_test_main_push | 5 | CLAUDE.md §9 #7 | do-not-push-main | _(blank pending Daniel)_ | _(blank)_ |
```

---

*End of SPEC. Author: opticup-strategic (Foreman). Ship in Shadow Mode. SPEC 2 (Retry) + SPEC 3 (Harvest) queued in OPEN_TASKS at closure.*
