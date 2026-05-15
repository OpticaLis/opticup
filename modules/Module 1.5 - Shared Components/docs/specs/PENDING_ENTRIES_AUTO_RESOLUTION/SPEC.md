# SPEC — PENDING_ENTRIES_AUTO_RESOLUTION

> **Template version:** v3 (2026-05-14).
> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman hat, Full-Auto Pipeline)
> **Authored on:** 2026-05-15
> **Module:** 1.5 — Shared Components
> **Phase:** N/A (process infrastructure, cross-cutting)
> **Author signature:** Claude Code · Opus 4.7 (1M) · 2026-05-15 evening
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/PENDING_ENTRIES_AUTO_RESOLUTION_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-15.
- Target files / dependencies grep-verified against live repo state:
  - `_archive/architect-pending-entries/` exists, contains exactly **1** file: `2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` (matches Brief §3.1 + D4). Brief §8 Stop-Trigger #1 (`>1 file`) → NOT FIRED.
  - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` exists, 279 lines. Highest cross-module entry = `| 30 | 2026-05-13 | ...` (line 48). Entry `| 28 | 2026-05-12 | Migration #4 ...` is at line 50. Pending file's "insert above entry #28" placement is therefore well-defined: above line 50.
  - `.claude/skills/opticup-executor/SKILL.md` exists, 1196 lines. SPEC Execution Protocol Step 4 ends line ~967; Step 5 begins line 968. Sweep step insertion point: between Step 4 (EXECUTION_REPORT.md write) and Step 5 (commit + signal Foreman).
  - `.claude/skills/opticup-architect/SKILL.md` exists, 1066 lines. "Cowork vs Claude Code" section is at line 966. Capability Map insertion point: inside this section, before "Module Close Ceremony" (line 975).
  - `.claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` exists, 162 lines. Existing checks are 10.1–10.5. New check 10.6 will append before the "Output format" section (line 121).
  - `scripts/verify.mjs` exists. Auto-loads every `.mjs` in `scripts/checks/`. New check file `architect-pending-applied.mjs` will be auto-discovered — **NO** edit to `verify.mjs` is required (Brief §11 C1 wording "wire into verify.mjs" reduces to "create the .mjs in the right directory"). Recorded as in-flight scope clarification.
  - `scripts/checks/` reference pattern: `check-root-discipline.mjs` is the canonical exemplar of an **advisory-only** check (violation → exit 1, warning → exit 2). New check uses the same shape but only emits `warnings` (no `violations`) so it is purely exit-2.
- Live integrity gate run pre-SPEC (`npm run verify:integrity`): `All clear — 151 files scanned in 6ms (Iron Rule 31 gate)`. ✅ Clean baseline.
- Pre-existing untracked files surveyed: `git status --porcelain | grep '^??' | wc -l` = 60+ entries (mostly `_archive/architect-pending-entries/`, untracked `architecture-brief/*.md` from prior Cowork sessions, `__LAUNCH_PLAN_DRAFT__/`). Executor will **leave all pre-existing untracked files alone** and use selective `git add` by filename throughout — Full-Auto Pipeline mode (CLAUDE.md §1.4 + 4-consecutive-SPEC pattern: MIGRATION_1, MIGRATION_2, SETTINGS_PERMISSIONS_CONSOLIDATION, MIGRATION_3, MIGRATION_4 all made the same D1 decision).
- `.gitignore`-awareness for §9 New Files: none of this SPEC's new files (1× `.mjs` script + 1× retrospective files) sit under gitignored paths. All are tracked deliverables.
- **Cross-Reference Check (Rule 21 / SPEC author-time)**: 0 collisions. The new check name `architect-pending-applied` is unique (`grep -rn "architect-pending-applied" .` returns only future references this SPEC will create). The Sentinel check id `10.6` is the next sequential after existing 10.5. No DECISIONS_LOG entry numbered `#32` exists yet (existing max = `#30`); `#32` is the pending file's own pre-assigned number — honored verbatim (per pending-file's explicit placement instructions). `#31` is intentionally skipped per the pending file's own decision.
- **Lessons applied from prior Module 1.5 FOREMAN_REVIEW.md** files:
  - STOREFRONT_PUBLIC_DATA_LAYER (2026-05-15 evening) — 4 queued proposals (P-AUTHOR-1 view-fan-out probe; P-AUTHOR-2 §1.5 Pre-flight findings standard section; P-EXEC-1 `tests/smoke/<SPEC>_trigger_e2e.sql` convention; P-EXEC-2 base-table RLS probe gate). **NONE of the 4 are relevant to this SPEC** — they all target SQL/Pattern-A/view-cascade work. This SPEC is process infrastructure (file-flow discipline). The non-applicability is documented here so the next Foreman session knows the queue is intact, awaiting an SQL-heavy SPEC for application.
  - SECURITY_HOTFIX_3 (P-AUTHOR-1 status-column semantics probe; P-AUTHOR-2 backup-folder gitignore-awareness). **Not applicable** — this SPEC has no RLS policies and no backup folder.
  - MIGRATION_4 (P-AUTHOR-1 color-form completeness; P-AUTHOR-2 multi-form count). **Not applicable** — no visual re-skin.
  - **Applied**: heading-numbering audit (STOREFRONT_PUBLIC_DATA_LAYER F-1 lesson) — every `## ` heading in this SPEC is unique and `## 7. Destructive Operations` matches the Iron-Rule-32 hook regex exactly (no parenthetical, plain `\d+\.`).
  - **Applied**: §0 baselines from live measurement (STATUS_CHANGE_TRIGGERS_FRAMEWORK lesson) — all line counts and existence checks above were run live, not authored from memory.
- Color-form completeness: N/A (no visual re-skin).
- Inner-call arity audit: N/A (no SECURITY DEFINER functions created).
- Smoke-touched schema audit: N/A (no DB schema touched; smoke 7/7 is regression-only — see §14).

### Baselines (live-measured 2026-05-15 evening)

| Symbol | Value | How measured |
|---|---|---|
| `BASE_PENDING_FILE_COUNT` | 1 | `ls _archive/architect-pending-entries/ \| grep -v '^\.' \| wc -l` |
| `BASE_PENDING_FILE_NAME` | `2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` | `ls _archive/architect-pending-entries/` |
| `BASE_DECISIONS_LOG_LINES` | 279 | `wc -l .claude/skills/opticup-architect/references/DECISIONS_LOG.md` |
| `BASE_DECISIONS_LOG_MAX_CROSS_ID` | 30 | `grep -oE '^\| [0-9]+ \|' DECISIONS_LOG.md \| awk '{print $2}' \| sort -n \| tail -1` |
| `BASE_EXECUTOR_SKILL_LINES` | 1196 | `wc -l .claude/skills/opticup-executor/SKILL.md` |
| `BASE_ARCHITECT_SKILL_LINES` | 1066 | `wc -l .claude/skills/opticup-architect/SKILL.md` |
| `BASE_MISSION10_LINES` | 162 | `wc -l .claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` |
| `BASE_VERIFY_INTEGRITY` | exit 0 | `npm run verify:integrity; echo $?` |
| `BASE_VERIFY_STAGED_PRE` | depends on what's staged | informational |
| `BASE_CHECKS_DIR_COUNT` | 9 (.mjs files) | `ls scripts/checks/*.mjs \| wc -l` |

### 0.1 Pre-flight findings (P-AUTHOR-2 from STOREFRONT_PUBLIC_DATA_LAYER, applied)

This SPEC's pre-flight surfaced one Brief→reality clarification:

- **Brief §11 C1 wording** said "Add `scripts/checks/architect-pending-applied.mjs` + wire into `verify.mjs`". The "wire into" sub-clause is reduced to a no-op because `verify.mjs` auto-discovers any `.mjs` in `scripts/checks/`. The Executor commit message must reflect this — "wire" = "drop into auto-discovered folder", not "edit verify.mjs". Recorded so the §10 Commit Plan and the Executor's commit body language stays accurate.

No further Brief/reality divergences.

---

## 1. Goal

Turn the **culture rule** that pending architect entries (`_archive/architect-pending-entries/*.md`) get applied to their target files by the next Claude Code session into **enforced infrastructure**: a 3-layer mechanism (Executor sweep protocol + advisory pre-commit check + Sentinel Mission 10.6 audit) that makes accidental drift either impossible or impossible-to-miss. Apply the single existing pending file (`2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`) as part of this SPEC to validate Layer 1 end-to-end on a real file.

---

## 2. Background & Motivation

Cowork sessions cannot modify files under `.claude/skills/` (file-tool–level lock — see architect SKILL.md §"Cowork VM File-Write Failures"). The accepted workaround is: Cowork writes the intended content to `_archive/architect-pending-entries/<TS>_<TOPIC>.md` and the next Claude Code session copies it into the protected target. This is documented in pending-file headers as "the next Claude Code Architect session will pick it up."

On 2026-05-15 this culture rule failed: a pending file from earlier in the day (`2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`, holding entry #32 for DECISIONS_LOG.md) was sitting in the folder waiting to be applied, and a fresh Cowork session opened without a mechanical way to apply it. Daniel's standing directive (DECISIONS_LOG entry #11, 2026-05-09): **"I want infrastructure, not culture. Culture decays."** This SPEC is the Pattern-P31 lift of pending-entries from culture (folder header note saying "if this grows beyond 3-4 files, surface to Daniel") to infrastructure (mechanical detection + reminder + execution).

The Brief is sealed (2026-05-15 evening). The mechanism mirrors STRUCTURE_PROTECTIONS (CLAUDE.md §0.5 enforcement — pre-commit hook + Sentinel Mission 10 + bootstrap auto-check): three layers, each catching what the previous one missed. Brief §6 D1–D5 lock the architectural decisions; this SPEC operationalizes them.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC close | On `develop`, clean working tree | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | 6 commits (C1–C6) on develop | `git log origin/develop..HEAD --oneline \| wc -l` → 6 (or `git log <start-tag>..HEAD --oneline \| wc -l` if no origin/develop push deferral) |
| 3 | New file: pre-commit advisory check | `scripts/checks/architect-pending-applied.mjs` exists, valid ESM, exports default async fn | `node -e "import('./scripts/checks/architect-pending-applied.mjs').then(m=>console.log(typeof m.default))"` → `function` |
| 4 | Check behavior — empty folder | exit 0 from `verify.mjs --staged` when folder empty AND no other violations | After C5 (which empties folder), stage a trivial change, `node scripts/verify.mjs --staged; echo $?` → `0` |
| 5 | Check behavior — non-empty folder | exit 2 from `verify.mjs --staged` with yellow warning text when folder non-empty AND no other violations | At C1 (folder still has 1 pending file), `node scripts/verify.mjs --staged; echo $?` → `2`; stderr/stdout contains `architect-pending-entries` warning string |
| 6 | Pending entries folder at SPEC close | empty (zero `.md` files inside) | `ls _archive/architect-pending-entries/*.md 2>&1` → no matches (or only `.gitkeep` if executor chooses that variant) |
| 7 | DECISIONS_LOG.md entry #32 present | exactly 1 row leading with `\| 32 \|` exists | `grep -c "^\| 32 \|" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` → `1` |
| 8 | DECISIONS_LOG.md placement | row #32 appears above the row starting `\| 28 \| 2026-05-12 \| Migration #4` | `awk '/^\| 32 \|/{a=NR} /^\| 28 \| 2026-05-12 \| Migration #4/{b=NR} END{print (a<b)}'` → `1` |
| 9 | Executor SKILL.md sweep section | New section titled `Pending Entries Sweep` (or similar) added to opticup-executor SKILL.md with step-by-step protocol | `grep -c "Pending Entries Sweep" .claude/skills/opticup-executor/SKILL.md` → `≥1` |
| 10 | Architect SKILL.md capability map | New `Cowork File-Write Capability Map` sub-section in opticup-architect SKILL.md "Cowork vs Claude Code" | `grep -c "Cowork File-Write Capability Map" .claude/skills/opticup-architect/SKILL.md` → `≥1` |
| 11 | Sentinel Mission 10 extension | New Check 10.6 added to mission file, declares the D3 thresholds (1 file >48h = MEDIUM; 2+ files = HIGH) | `grep -E "10\.6\|MEDIUM\|HIGH" .claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` → ≥3 distinct hits incl. "10.6" |
| 12 | Smoke 7/7 regression pass | All 7 baseline tests green on demo tenant | localhost-tester runs `npm run test:smoke` or equivalent → `7/7 PASS` |
| 13 | Iron Rule 31 integrity gate | exit 0 (clean) at staged + final state | `npm run verify:integrity; echo $?` → `0` |
| 14 | Iron Rule 32 destructive-ops gate | every commit's staged diff passes `destructive-ops-declared.mjs` | husky pre-commit success across all 6 commits (no `--no-verify` used) |
| 15 | Master-doc updates landed | SESSION_CONTEXT.md (M1.5) + CHANGELOG.md (M1.5) updated; MASTER_ROADMAP.md decision-log entry added; OPEN_TASKS.md `_archive/architect-pending-entries/` mention reconciled | grep each file for SPEC slug `PENDING_ENTRIES_AUTO_RESOLUTION` → ≥1 hit per file |
| 16 | Working tree clean at close | no untracked/modified files from THIS SPEC's scope | `git status --porcelain \| grep -vE 'pre-existing-untracked-pattern' \| wc -l` → matches Full-Auto Pipeline expectations (only pre-existing untracked entries remain) |
| 17 | Pre-commit tag baseline | `pre-pending-entries-resolution-start` tag exists on HEAD before C1 | `git tag --list "pre-pending-entries-resolution-*"` → ≥1 entry |

**Every SPEC must include an Integrity Gate criterion** (criterion 13 above, Iron Rule 31) and a Destructive Ops Gate criterion (criterion 14, Iron Rule 32). Both must remain green at every commit boundary.

---

## 4. Autonomy Envelope

**Executor MAY do without asking** (the SPEC says it; output matches expected; continue):

- Create the new check file `scripts/checks/architect-pending-applied.mjs` with the exact contract described in §6 below.
- Edit `.claude/skills/opticup-executor/SKILL.md` to add the "Pending Entries Sweep" section at the location identified in §0 (between Step 4 and Step 5 of SPEC Execution Protocol).
- Edit `.claude/skills/opticup-architect/SKILL.md` to add the "Cowork File-Write Capability Map" sub-section inside the "Cowork vs Claude Code" section.
- Edit `.claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` to add Check 10.6.
- Read `_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`, extract the table-row content of entry #32, insert it above the row starting `| 28 | 2026-05-12 | Migration #4` in DECISIONS_LOG.md, and delete the pending file. This is the one declared destructive op (§7).
- Stage + commit each commit C1–C6 with the body language matching the Commit Plan §10.
- Place per-commit annotated tags `pre-pending-entries-resolution-{step}` if the executor wants per-step rollback granularity (recommended; not strictly required).
- Run `npm run verify:integrity` after every commit boundary; run `node scripts/verify.mjs --staged` before every `git commit` per Executor SKILL Pre-commit discipline (P-EX-pre-commit, 2026-05-14).
- Run `git status` + `git diff --cached --name-only` before every commit. Use **explicit filename `git add`** (Iron Rule 6 — no `-A`, no `.`).
- Leave pre-existing untracked files alone (Full-Auto Pipeline pattern, 4+ consecutive SPECs).
- After EXECUTION_REPORT.md is written and committed, signal Foreman in chat and stop.

**Executor MUST stop and report (does NOT continue autonomously)**:

- See §5 Stop-on-Deviation Triggers.

---

## 5. Stop-on-Deviation Triggers

Stop and write an escalation file to `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_pending_entries_<slug>.md` (5-heading template per opticup-strategic SKILL) if ANY of:

- **STT-1.** More than 1 file present in `_archive/architect-pending-entries/` at SPEC start. Brief §8 authorizes only the 1 known file; additional files = undeclared scope.
- **STT-2.** The single declared pending file's content is malformed: no clear "placement instructions" section, or named target path doesn't exist, or the table-row markdown is unparseable.
- **STT-3.** Sentinel Mission 10 file structure differs from what §0 pre-flight assumed (e.g., Check 10.5 isn't the last existing check, or the "Output format" section isn't where §0 said it is — executor's own pre-flight reads at C4 must confirm before editing).
- **STT-4.** Iron Rule 31 integrity gate returns exit 1 (null-byte ERROR) at any commit boundary. This is a hard stop per Rule 31 ("A failed gate BLOCKS the stage; never bypass").
- **STT-5.** Iron Rule 32 hook (`destructive-ops-declared.mjs`) blocks any commit. The pre-commit hook is configured to scan the SPEC's `## Destructive Operations` declaration and the staged diff. If it fires, the cause is either (a) this SPEC's `## 7. Destructive Operations` heading not parsing — fix the heading; or (b) a commit's staged diff contains a destructive pattern not declared in §7 — STOP and escalate.
- **STT-6.** Smoke 7/7 regresses post-change. The Localhost-Tester runs smoke after C5/C6; any case failing = STOP, escalate to Foreman.
- **STT-7.** The new check `architect-pending-applied.mjs` fails its own contract test (exit 0 when folder empty; exit 2 when non-empty AND no other violations).
- **STT-8.** Any commit accidentally stages a file outside this SPEC's scope (e.g., a stale `M /docs/guardian/GUARDIAN_ALERTS.md` from prior Sentinel run, a stray architecture-brief untracked file). Executor: reset stage, re-stage explicitly, then commit.
- **STT-9.** DECISIONS_LOG.md insert produces a duplicate `| 32 |` row (entry exists at a different location, contradicting §0 pre-flight assertion that max-existing = `#30`).
- **STT-10.** The Cowork-VM-mount truncation watch-flag (L-NEW-34-2 in GUARDIAN_ALERTS.md) triggers a real truncation event on Windows-desktop FS this run — i.e., wc -l on any newly-written check or SKILL file disagrees with file content. This is unlikely on Claude Code (Windows desktop has direct FS access, not the Cowork VM mount), but if observed: stop and use the heredoc fallback per architect SKILL §"Cowork VM File-Write Failures".

**No Daniel-decision stop triggers** — this SPEC is mechanical infrastructure. The Foreman (this skill) is the escalation target, not Daniel. §15 below is empty.

---

## 6. Rollback Plan

**Per-commit annotated git tags.** Executor places `pre-pending-entries-resolution-start` on HEAD before C1, and (recommended) `pre-pending-entries-resolution-c{N}` before each subsequent commit. Worst-case rollback:

```bash
git reset --hard pre-pending-entries-resolution-start
```

All 3 infrastructure layers are **additive**:

- Layer 1: new section in executor SKILL.md (no existing logic rewritten).
- Layer 2: new file in `scripts/checks/` (no existing check modified; `verify.mjs` itself untouched per §0.1 finding).
- Layer 3: new Check 10.6 appended to Mission 10 (no existing 10.1–10.5 modified).

Plus 2 docs updates (architect SKILL.md sub-section addition; DECISIONS_LOG.md row insertion + 1 file deletion).

A partial rollback (e.g., revert only C5 to restore the pending file) is trivial via `git revert <commit-hash>` since each commit is scope-isolated. No DB ops, no Edge Function deploys, no external state.

---

## 7. Destructive Operations

1. **Delete** `_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` after its content is successfully merged into `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` and verified by grep (success criterion #7 + #8). Performed in commit C5 as a `git rm` (or `Remove-Item` followed by `git add -u` on the deletion). This is the **single** destructive op authorized by this SPEC.

No other destructive operations are authorized. Specifically NOT authorized:

- No SQL DROP / TRUNCATE / ALTER (no DB writes at all in this SPEC).
- No git rebase / reset --hard / push --force (rollback path is `git reset --hard <pre-tag>` only if needed in-flight).
- No --no-verify or --no-gpg-sign on any commit.
- No mass file renames (≥5 files in one commit).
- No edits to `main` branch.
- No deletion of any other pending file (Brief §3.1 + §8 STT-1 — only 1 file declared in scope).
- No deletion of governance content from CLAUDE.md, SKILL.md files, or DECISIONS_LOG.md. All SKILL.md + DECISIONS_LOG.md edits in this SPEC are **append-only** or **section-additive** — not destructive.

If the Executor encounters a need for any destructive operation not on the above list, → STOP, write `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_pending_entries_<slug>.md`, halt the pipeline.

---

## 8. Out of Scope

- **The 4 queued skill-improvement proposals from STOREFRONT_PUBLIC_DATA_LAYER FOREMAN_REVIEW** (P-AUTHOR-1 view-fan-out probe; P-AUTHOR-2 §1.5 Pre-flight findings as SPEC_TEMPLATE section; P-EXEC-1 trigger E2E SQL convention; P-EXEC-2 base-table RLS probe gate). All 4 target SQL/Pattern-A/view-cascade work. Orthogonal to this SPEC's process-infrastructure scope. They remain queued, awaiting an SQL-heavy SPEC.
- BRAND_VISIBILITY_CASCADE (OPEN_TASKS task 0c) — separate SPEC.
- FUNCTION_REVOKES (OPEN_TASKS task 0d) — separate SPEC.
- M4_FB_CAPI_HYBRID_DEDUPLICATION (OPEN_TASKS task 6) — separate SPEC.
- Reworking how `.claude/skills/` access works in Cowork. Brief §3 out-of-scope reaffirms: the file-tool lock exists for a reason (prevents Cowork from corrupting skill files mid-session); we work with the lock as-is.
- Inventing a separate "pending entries database" — flat-file folder is the agreed mechanism.
- Building a UI for pending entries.
- Auto-applying entries during the Cowork session that authored them (impossible by the lock's design).
- Any storefront / ERP runtime change.
- Any DB schema change.
- Any Edge Function change.
- Modifications to other Sentinel missions (10.1–10.5 stay byte-identical; we only add 10.6).
- Modifications to other existing `scripts/checks/*.mjs` (we only add `architect-pending-applied.mjs`).

---

## 9. Expected Final State

After the SPEC closes, `develop` HEAD will have these new/changed deliverables:

**New files:**

- `scripts/checks/architect-pending-applied.mjs` — pre-commit advisory check (advisory-only, exit 2 warning when folder non-empty).
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/SPEC.md` — this file.
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/EXECUTION_REPORT.md` — written by Executor at C6.
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/FINDINGS.md` — written by Executor at C6 (if any findings).
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/REVIEW.md` — written by Reviewer post-execution.
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/TEST_REPORT.md` — written by Localhost-Tester after smoke run.
- `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/FOREMAN_REVIEW.md` — written by Foreman (this skill) at closure.
- (Optional) `_archive/architect-pending-entries/.gitkeep` — Executor decides whether to retain the empty folder via `.gitkeep` or remove and let it auto-recreate on next pending entry. Recommendation: keep the folder + `.gitkeep` so the path stays stable for the new check and the Sentinel mission.

**Modified files (additive only — no governance content removed):**

- `.claude/skills/opticup-executor/SKILL.md` — new "Pending Entries Sweep" section inserted between Step 4 and Step 5 of SPEC Execution Protocol. Length grows by ~30–50 lines.
- `.claude/skills/opticup-architect/SKILL.md` — new "Cowork File-Write Capability Map" sub-section appended to "Cowork vs Claude Code" section. Length grows by ~25–40 lines.
- `.claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` — new Check 10.6 appended before "Output format" section. Length grows by ~30–50 lines.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — entry #32 row inserted above entry #28's row. Length grows by 1 line.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — new section at the top "PENDING_ENTRIES_AUTO_RESOLUTION CLOSED" with date + closure summary.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new entry under 2026-05-15 evening grouping the 6 commits.
- `MASTER_ROADMAP.md` — decisions log adds a one-line entry for this SPEC.

**Deleted files (1):**

- `_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` — consumed in C5 (content merged into DECISIONS_LOG.md).

**Tags:**

- `pre-pending-entries-resolution-start` (mandatory) on HEAD before C1.
- (Recommended) `pre-pending-entries-resolution-c{1..5}` per-commit tags for granular rollback.

**Verified states:**

- Smoke 7/7 PASS on demo tenant.
- Integrity gate exit 0.
- Working tree clean (modulo pre-existing untracked files which remain untouched).
- `verify.mjs --staged` exits 0 on a clean-folder state, exit 2 on a non-empty-folder state (validated by Executor at C1 + at SPEC close).

---

## 10. Commit Plan

6 commits on develop, in this order. Each commit ≤1 logical change, body cites Iron-Rule-32 declared destructive ops (only C5 has one) + the §3 success criteria advanced + the pre-tag name + the SPEC path.

- **C1** — `feat(infra): add architect-pending-applied advisory check (Layer 2)`
  - New file: `scripts/checks/architect-pending-applied.mjs`
  - Verifies: at C1's verify.mjs run (folder still has 1 pending file), exit 2 with warning text (criterion #5). Iron Rule 32: no destructive op in this commit.
  - Pre-tag: `pre-pending-entries-resolution-start` placed BEFORE C1's staging.

- **C2** — `docs(skill): add Pending Entries Sweep to opticup-executor SKILL.md (Layer 1)`
  - Modified: `.claude/skills/opticup-executor/SKILL.md` (new section between SPEC Execution Protocol Steps 4 and 5)
  - No destructive op.

- **C3** — `docs(skill): add Cowork File-Write Capability Map to opticup-architect SKILL.md (D5)`
  - Modified: `.claude/skills/opticup-architect/SKILL.md` (new sub-section in "Cowork vs Claude Code")
  - No destructive op.

- **C4** — `docs(sentinel): extend Mission 10 with pending-entries audit Check 10.6 (Layer 3)`
  - Modified: `.claude/skills/opticup-sentinel/references/missions/10-structure-discipline.md` (new Check 10.6 with D3 thresholds 1>48h=MEDIUM, 2+=HIGH)
  - No destructive op.

- **C5** — `chore(decisions): apply pending entry #32 + delete pending file (Brief §3.1)`
  - Modified: `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` (entry #32 row inserted above #28)
  - Deleted: `_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`
  - Optional: created `_archive/architect-pending-entries/.gitkeep` to retain folder
  - **Iron Rule 32 destructive op #1**: file delete (declared in §7 above). Hook MUST detect it; commit body cites §7.
  - At this commit's verify.mjs run, the folder is empty → check exits 0 (criterion #4). Spot-validates the Layer 2 contract end-to-end.

- **C6** — `chore(spec): close PENDING_ENTRIES_AUTO_RESOLUTION with retrospective`
  - New: `EXECUTION_REPORT.md`, `FINDINGS.md` (if any), `REVIEW.md` (committed by Reviewer separately if it lands first), `TEST_REPORT.md` (Localhost-Tester output), master-doc updates (`SESSION_CONTEXT.md`, `CHANGELOG.md`, `MASTER_ROADMAP.md` decision-log line).
  - No destructive op.
  - Foreman closure (FOREMAN_REVIEW.md) may land in this commit or in a follow-up commit signed by Foreman; either is acceptable per Full-Auto Pipeline convention.

**Total: 6 commits.** Executor may consolidate C2+C3+C4 into one commit if Bounded Autonomy judgment finds that cleaner (3 SKILL.md/docs edits, all additive, no logical coupling) — log the decision in EXECUTION_REPORT §5.

---

## 11. Dependencies / Preconditions

- Branch `develop`, clean baseline (pre-existing untracked files allowed, will be left alone).
- Iron Rule 31 integrity gate exit 0 at session start (confirmed in §0).
- `_archive/architect-pending-entries/` contains exactly 1 file: `2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` (confirmed in §0).
- Sibling repo `opticup-storefront` not touched by this SPEC.
- No external systems / vendor APIs / Supabase MCP calls required.
- No Edge Function deploys required.
- Smoke test prerequisites: ERP localhost (:3000) + Storefront localhost (:4321) reachable on demo tenant. Brief §5 confirms smoke is regression-only.

---

## 12. Lessons Already Incorporated

This SPEC harvested lessons from these prior FOREMAN_REVIEW.md files (Module 1.5 specs folder):

- **STOREFRONT_PUBLIC_DATA_LAYER F-1** (heading numbering audit) — applied: every `##` heading in this SPEC is unique, `## 7. Destructive Operations` matches the Iron-Rule-32 hook regex exactly. (`grep -n '^## ' SPEC.md | awk '{print $2}' | sort | uniq -d` → empty.)
- **STATUS_CHANGE_TRIGGERS_FRAMEWORK Author Proposal #1** (live-measured baselines) — applied: §0 Baselines sub-table has 10 symbols, each with the runnable command that produced the value.
- **SECURITY_HOTFIX_2 P-AUTHOR-2** (runtime semantics rehearsal for SECDEF) — N/A (no SECDEF in this SPEC).
- **MIGRATION_4 Author #1** (color-form completeness) — N/A (no visual re-skin).
- **SETTINGS_PERMISSIONS_CONSOLIDATION Author Proposal #2** (pre-existing untracked files checkbox) — applied: §0 records the count + the leave-alone decision.
- **MIGRATION_1 Author #1** (no `## §N.` headings, plain `## N.`) — applied: every section heading uses `## N. Title` form.
- **MIGRATION_3 Author #1** (no fractional section numbers) — applied: §0.1 is the lone sub-section identifier; rest are integer.
- **STOREFRONT_PUBLIC_DATA_LAYER P-AUTHOR-2** (§1.5 Pre-flight findings as standard section) — applied: §0.1 captures the one Brief→reality clarification.

Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + GLOBAL_MAP + DECISIONS_LOG + scripts/checks/: **0 collisions / 0 hits requiring resolution.**

---

## 13. Pre-Merge Checklist

(This SPEC stays on `develop`; main-merge is Daniel-only and not part of this SPEC.)

Pre-close checklist (Foreman verifies before writing FOREMAN_REVIEW verdict):

- [ ] All 17 §3 success criteria GREEN.
- [ ] All 6 commits land on `develop`, working tree clean at close.
- [ ] Iron Rule 31 gate exit 0 at HEAD.
- [ ] Iron Rule 32 hook passed for every commit (no `--no-verify` anywhere).
- [ ] Smoke 7/7 PASS per TEST_REPORT.md.
- [ ] Reviewer verdict 🟢 or 🟡 (🔴 reopens the SPEC).
- [ ] DECISIONS_LOG.md entry #32 visible at the correct location.
- [ ] Pending folder is empty (`ls _archive/architect-pending-entries/*.md` → no matches).
- [ ] Executor + Architect + Sentinel SKILL/Mission files all carry their new sections.
- [ ] `EXECUTION_REPORT.md` includes §7 SPEC_TEMPLATE Version Footprint (P-EX-03 mandatory).
- [ ] `FOREMAN_REVIEW.md` includes 4 skill-improvement proposals (2 author + 2 executor).

---

## 14. Smoke Test Cases

Regression-only — this SPEC adds **no new runtime surface**. Smoke 7/7 must remain at the pre-SPEC baseline (7 PASS on demo tenant). The Localhost-Tester runs `tests/smoke/baseline.test.mjs` (or equivalent) after C5 (post-DECISIONS_LOG edit + pending-file delete + check now exits 0) AND after C6 (full closure).

| # | Case | Type | Expected |
|---|------|------|----------|
| 1 | PIN auth on demo tenant | Regression | 200 + valid JWT |
| 2 | CRM lead create on demo tenant | Regression | 201 + tenant_id correct + RLS blocks Prizma read |
| 3 | Inventory read (`v_storefront_products`) on demo tenant | Regression | 200 + non-empty array + columns match prior schema |
| 4 | Storefront page `/` on demo tenant | Regression | 200 + Hebrew RTL renders |
| 5 | Storefront page `/products` on demo tenant | Regression | 200 + product list renders |
| 6 | Storefront page `/brands` on demo tenant | Regression | 200 + brand list renders |
| 7 | No 5xx in network requests across 1-min crawl | Regression | 0 × 5xx |

**Additional Layer-2 contract test** (Reviewer or Localhost-Tester runs, NOT part of the 7-test count):

- T-CHECK-EMPTY: with `_archive/architect-pending-entries/` empty (post-C5), `node scripts/verify.mjs --staged` returns exit 0 (no warning, no violation).
- T-CHECK-NONEMPTY: with `_archive/architect-pending-entries/` containing the 1 pending file (pre-C5), `node scripts/verify.mjs --staged` returns exit 2 with stdout/stderr containing the pending-entries warning string.

These two contract probes are explicitly covered by §3 criteria #4 and #5; they appear in the smoke file as **distinct documentation tests** (Type: Documentation/Contract), not as production runtime tests.

---

## 15. Daniel-Decision Sub-Questions

None — this SPEC declares no STOP-on-Daniel-decision in §5. The Foreman is the escalation target for every stop-trigger.

---

## Appendix A — Layer 1 protocol skeleton (informative for Executor)

The "Pending Entries Sweep" section added to opticup-executor SKILL.md (C2) should encode this protocol. Final wording is the Executor's choice; this is the contract:

> **Step 4.5 — Pending Entries Sweep (mandatory at every SPEC closure)**
>
> Before writing the final commit (Step 5) that closes a SPEC, run the pending-entries sweep:
>
> 1. `ls _archive/architect-pending-entries/ 2>/dev/null | grep -v '^\.' | grep -v '\.gitkeep$'` — capture file list.
> 2. If empty → continue to Step 5. Sweep complete.
> 3. If non-empty → for each `.md` file in the folder:
>    a. Read the file. Locate the "Placement instructions" section (or equivalent).
>    b. Apply the prescribed change to the named target file (always inside `.claude/skills/` or another protected path Cowork couldn't reach).
>    c. Verify the change landed with a grep (e.g., for a DECISIONS_LOG row, `grep -c "^| <id> |" <target>` returns ≥1).
>    d. `git rm <pending-file-path>` to delete the consumed file.
> 4. Stage the target-file edit + the file-deletion + any related master-doc update in the same commit as the SPEC closure (or in a dedicated `chore(decisions): apply pending entries` commit if the closure commit is already large).
> 5. If the pending file's content is malformed OR the named target path doesn't exist OR multiple pending files exist when the SPEC's `## 7. Destructive Operations` declares fewer file-deletes → **STOP**. Write an escalation file at `modules/Module N/escalations/{ISO_TS}_pending_entries_<slug>.md` per the 5-heading template. Do NOT silently absorb or skip.

## Appendix B — Layer 2 check skeleton (informative)

The new check file `scripts/checks/architect-pending-applied.mjs` should match this contract (Executor adjusts final implementation):

```javascript
// scripts/checks/architect-pending-applied.mjs
// Advisory-only check (CLAUDE.md infrastructure layer).
// Warns when _archive/architect-pending-entries/ has unconsumed files.
// Auto-loaded by scripts/verify.mjs from scripts/checks/.
//
// Exit semantics:
//   - violations: always empty (advisory-only — never blocks a commit).
//   - warnings: one entry per file in _archive/architect-pending-entries/ (excluding .gitkeep).
//   - verify.mjs treats warnings → exit 2 if no other violations.

import { readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const FOLDER = resolve('_archive/architect-pending-entries');

export default async function checkArchitectPendingApplied(_files) {
  const violations = [];
  const warnings = [];

  let entries;
  try {
    entries = await readdir(FOLDER);
  } catch {
    // Folder doesn't exist → nothing to warn about.
    return { violations, warnings };
  }

  const pending = entries.filter(e => e.endsWith('.md') && e !== '.gitkeep');

  for (const f of pending) {
    warnings.push({
      check: 'architect-pending-applied',
      path: join(FOLDER, f),
      line: 0,
      message: `pending architect entry "${f}" not yet applied to its target. Run the Executor's Pending Entries Sweep before commit (see opticup-executor SKILL.md → Pending Entries Sweep).`,
    });
  }

  return { violations, warnings };
}
```

## Appendix C — Layer 3 Sentinel Check 10.6 skeleton (informative)

New Check 10.6 to append to Mission 10:

```markdown
### Check 10.6 — Architect pending-entries backlog

Count files in `_archive/architect-pending-entries/` and inspect mtimes:

\`\`\`bash
folder=_archive/architect-pending-entries
count=$(ls "$folder"/*.md 2>/dev/null | grep -v '.gitkeep' | wc -l)
oldest_age_h=0
if [ "$count" -gt 0 ]; then
  oldest=$(ls -t "$folder"/*.md 2>/dev/null | tail -1)
  oldest_mtime=$(stat -c %Y "$oldest" 2>/dev/null || stat -f %m "$oldest")
  now=$(date +%s)
  oldest_age_h=$(( (now - oldest_mtime) / 3600 ))
fi
echo "count=$count oldest_age_h=$oldest_age_h"
\`\`\`

- **count = 0** → PASS, no finding.
- **count = 1 AND oldest_age_h ≤ 48** → PASS, normal Cowork-to-Claude-Code hand-off.
- **count = 1 AND oldest_age_h > 48** → finding severity **MEDIUM**: a pending entry has been sitting for > 48 h, meaning a session ended without sweep. Soft failure.
- **count ≥ 2** → finding severity **HIGH**: multiple pending entries means the sweep itself is broken or being ignored. Hard failure.

Threshold rationale (Brief §6 D3): single recent file = normal; single stale file = soft failure; multiple files = hard failure.
```

---

*End of SPEC.*
