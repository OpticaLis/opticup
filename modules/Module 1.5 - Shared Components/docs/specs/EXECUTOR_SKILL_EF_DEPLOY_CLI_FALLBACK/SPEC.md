# SPEC — EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M1.5)
> **Authored on:** 2026-05-14
> **Module:** 1.5 — Shared Components
> **Phase (if applicable):** out-of-band skill update (Full-Auto Pipeline)
> **Author signature:** Claude Code chat, Windows desktop

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14: `modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_BRIEF.md`.
- Target file exists at `.claude/skills/opticup-executor/SKILL.md` — `wc -l` = 1028, `node -e ...split('\n').length` = 1029 (one trailing newline, per P23.1 reviewer-method rule).
- Anchor 1 — existing `§5h` lives at lines **672–688**. It documents the *manual-Daniel-redeploy* path (`DEPLOY_FALLBACK_NEEDED.md` warning file). It contains the canonical `verify_jwt` safeguard (lines 681 + 684 + 686). We INSERT after line 688, BEFORE the empty line preceding `6. **Field-reuse check:**` at line 689. The `verify_jwt` safeguard text in §5h is reused by reference from the new §5i — no deletion.
- Anchor 2 — the "When in doubt" table sits at lines **886–895**. Row "`Tool fails unexpectedly | Retry once. If still fails → STOP and report.`" is at line **893**. We ADD a new row immediately after it (line 894 today). No edit to the existing row.
- 3-strikes pattern cited by Brief verified:
  - 2026-05-13 — `STATUS_CHANGE_TRIGGERS_FRAMEWORK` (M4, EV-001) — DECISIONS_LOG entry #30. F1 (HIGH).
  - 2026-05-14 — `M3_UTM_TRIPLE_LAYER_PERSISTENCE` (M4, P1.1) — FOREMAN_REVIEW §7 Executor Proposal #1; 5th+ occurrence of OPEN-021; review formally activates the 3-strikes mandate.
- Cross-Reference Check (Rule 21) — names introduced by this SPEC: only new section title `Edge Function deploy — MCP-first with automatic CLI fallback (OPEN-021 closure)`. Grep `Edge Function deploy — MCP-first` over the repo returns 0 hits — name is collision-free.
- Pre-existing untracked files surveyed: `git status --porcelain | grep '^??' | wc -l` = many (carryover Full-Auto WIP from prior SPECs — same pattern as last 4 SPECs). The Executor will leave them alone — selective `git add` by filename throughout (per `opticup-executor/SKILL.md` lines 901–909).
- Iron Rule 32: this SPEC declares `## Destructive Operations: None.` — the Iron-Rule-32 gate will therefore forbid all destructive ops for the run.
- Lessons applied from prior FOREMAN_REVIEWs in this module — see §11.

### Baselines (referenced by §3)

| Symbol | File | Metric | Value (captured 2026-05-14) |
|---|---|---|---|
| `BASE_LINES_executor_skill` | `.claude/skills/opticup-executor/SKILL.md` | `node -e ...split('\n').length` | **1029** |
| `BASE_HITS_mcp_first` | `.claude/skills/opticup-executor/SKILL.md` | `grep -c "MCP-first with automatic CLI fallback"` | **0** |
| `BASE_HITS_open021` | `.claude/skills/opticup-executor/SKILL.md` | `grep -c "OPEN-021"` | **0** |

---

## 1. Goal

Encode the MCP-first-then-auto-CLI-fallback pattern for `deploy_edge_function` as default Executor behavior in `.claude/skills/opticup-executor/SKILL.md`, closing the OPEN-021 3-strikes pattern so future SPECs (P1.2, P1.3, and onward) that deploy Edge Functions never pause mid-run when the Supabase MCP `deploy_edge_function` endpoint returns 5xx.

---

## 2. Background & Motivation

OPEN-021 has manifested **5+ times** across recent SPECs (entries 30 + the M3_UTM_TRIPLE_LAYER_PERSISTENCE FOREMAN_REVIEW in DECISIONS_LOG; latest occurrence 2026-05-14). Every time, the answer has been the same: deploy via Supabase CLI from the repo root. The CLI fallback has succeeded **100%** of the time the MCP layer has failed. The current `§5h` of the Executor SKILL routes this case through a manual hand-off file (`DEPLOY_FALLBACK_NEEDED.md`) that asks Daniel to run the CLI on his desktop — that worked when the pattern was new but is now redundant ceremony. The fix is to make the Executor itself run the CLI, with the `verify_jwt` safeguard from §5h preserved verbatim.

This SPEC is a prerequisite to Phase 1 P1.2 (`M4_BROADCAST_ID_PROPAGATION`) and P1.3 (`M3_SHORTGY_TO_INTERNAL_REDIRECT`), both of which redeploy Edge Functions and would otherwise hit the same 5xx ceremony.

---

## 3. Success Criteria (Measurable)

Each criterion has a copy-paste-runnable verify command. The Reviewer runs all 9.

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | New section exists in `opticup-executor/SKILL.md` with title containing "MCP-first with automatic CLI fallback" | `≥ 1` hit | `grep -c "MCP-first with automatic CLI fallback" .claude/skills/opticup-executor/SKILL.md` |
| 2 | CLI command template present + correct project ref `tsxrrxzmdxaenlvocyit` | `≥ 1` hit | `grep -c "supabase functions deploy.*tsxrrxzmdxaenlvocyit" .claude/skills/opticup-executor/SKILL.md` |
| 3 | Carve-out row added to "Tool fails unexpectedly" table for `deploy_edge_function` — explicit "do NOT escalate" | `≥ 1` hit | `grep -c "deploy_edge_function.*do NOT escalate\|deploy_edge_function.*auto-fallback" .claude/skills/opticup-executor/SKILL.md` |
| 4 | OPEN-021 3-strikes incidents cited as rationale (both 2026-05-13 AND 2026-05-14) | both present | `grep -c "OPEN-021" .claude/skills/opticup-executor/SKILL.md` returns `≥ 2` AND `grep -c "2026-05-13\|2026-05-14" .claude/skills/opticup-executor/SKILL.md` returns `≥ 2` |
| 5 | `get_edge_function` post-deploy verification step documented | `≥ 1` hit | `grep -c "get_edge_function" .claude/skills/opticup-executor/SKILL.md` returns `≥ 1` (note: baseline is `≥ 1` already from §5h, post-edit MUST be strictly greater than baseline by `≥ 1`) |
| 6 | `EXECUTION_REPORT.md` 2-line fallback log template shown | exactly the literal string `## EF deploy fallback` appears | `grep -c "## EF deploy fallback" .claude/skills/opticup-executor/SKILL.md` returns `≥ 1` |
| 7 | Smoke 7/7 PASS (control — nothing should regress) | exit 0 + "7 passed" | `npm run smoke` (run from repo root after edit + commit) |
| 8 | Integrity Gate (Iron Rule 31) | exit 0 (clean) or exit 2 (warnings) — never exit 1 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 9 | Repo clean at close (CLAUDE.md §9) — only files this SPEC touched are committed; pre-existing WIP left alone | "nothing to commit, working tree clean" for files this SPEC owns | `git status` after final commit |

**Baseline anchor for criterion 5:** the pre-edit count of `get_edge_function` in `opticup-executor/SKILL.md` is **1** (single hit on line 684 inside §5h). Post-edit MUST be `≥ 2` (the existing §5h reference PLUS the new §5i reference).

**File-size sanity:** after the edit, `node -e ...split('\n').length` on `opticup-executor/SKILL.md` should be `BASE_LINES_executor_skill + N_added_lines`. The SPEC does NOT pin an exact line count because the Executor decides natural prose paragraphing; the *additive-only* check (criterion 9-adjacent below) catches deletion attempts.

**Additive-only sanity:** every line that existed in the pre-edit SKILL.md MUST exist in the post-edit file. Verify with:
```bash
diff <(git show HEAD:.claude/skills/opticup-executor/SKILL.md) .claude/skills/opticup-executor/SKILL.md | grep -c '^<'
```
Expected: **0** (zero `<` lines = zero deletions; only `>` lines = additions). This is the structural defense against the Brief's "no deletion of existing SKILL.md content" hard constraint.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read `opticup-executor/SKILL.md` and surrounding files.
- Create the backup folder + copy pre-edit `SKILL.md` per §6 below.
- Make the single targeted edit per §8 below.
- Run `npm run smoke` + `npm run verify:integrity`.
- Stage with explicit-filename `git add` (per Full-Auto pre-existing-WIP discipline).
- Commit + push to `develop`.
- Write `EXECUTION_REPORT.md` + (optionally) `FINDINGS.md`.

### What REQUIRES stopping and reporting
- Any deletion of existing SKILL.md content (additive-only is a hard rail).
- Any touch to other skill files (`opticup-strategic`, `opticup-architect`, etc.).
- Any smoke regression (criterion 7 fails).
- Any integrity-gate exit code 1.
- Any merge to `main` or any `git rebase` / `git reset --hard` / `git push --force`.
- Any generalization of CLI fallback to other Supabase MCP tools (out of scope per Brief §1).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If post-edit `diff … grep -c '^<'` returns `≥ 1` → STOP (the edit deleted existing content; Brief hard-fail).
- If criterion 5's post-edit count of `get_edge_function` is not `≥ 2` → STOP (the new §5i is missing the cross-link to §5h).
- If any of criteria 1-6 fail post-edit grep → STOP and re-edit; do not commit a half-edit.
- If criterion 7 (smoke) regresses → STOP. Smoke is the control here; nothing in this SPEC touches code that smoke exercises, so a regression signals an upstream issue unrelated to this SPEC.
- If criterion 8 (integrity) returns exit 1 → STOP, escalate via FINDINGS.md (null-byte event in any tracked file).

---

## 6. Rollback Plan

Trivial — this SPEC produces one in-place additive edit + one backup + commits.

- Backup target (mandatory per CLAUDE.md §9 rule 9, since SKILL.md is a governance file): `modules/Module 1.5 - Shared Components/backups/2026-05-14_EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/opticup-executor-SKILL.md` — copied BEFORE the first edit.
- If the edit is bad mid-flight: `git checkout -- .claude/skills/opticup-executor/SKILL.md` restores from HEAD.
- If the edit is bad post-commit: `git revert <commit-sha>` produces a clean reverse commit on develop. The backup file remains in place as redundant safety belt.
- No DB changes, no EF redeploys, no schema touches — rollback is purely file-level.

---

## Destructive Operations

**None.**

This SPEC produces a single in-place additive edit to a governance file plus a backup copy and standard `git add` / `git commit` / `git push` to `develop`. No file deletes, no mass renames, no `git rebase` / `git reset --hard` / `git push --force`, no SQL DDL, no DML mass-deletes, no edits that remove sections of governance files (additive-only is the structural rail), and no `main` branch modification.

(Heading text is exactly `## Destructive Operations` — no `§` prefix — per Iron Rule 32 regex in `scripts/checks/destructive-ops-declared.mjs`.)

---

## 7. Out of Scope (explicit)

- Generalizing CLI fallback to other Supabase MCP tools (`apply_migration`, `execute_sql`, `create_branch`, etc.). Only `deploy_edge_function` has the recurring 3-strikes pattern.
- Removing, weakening, or reframing the existing `§5h` text. `§5h` STAYS — its `verify_jwt` safeguard is reused by reference from the new `§5i`.
- Removing or weakening the existing "Tool fails unexpectedly | Retry once. If still fails → STOP and report" row. That row STAYS; we add a NEW row beneath it as the `deploy_edge_function` carve-out.
- Adding new CLI commands beyond `supabase functions deploy`.
- Auto-installing or auto-upgrading the Supabase CLI on the Executor's machine. If CLI is missing → Executor logs a FINDING and falls back to the §5h `DEPLOY_FALLBACK_NEEDED.md` path. (CLI install is Daniel-only.)
- Touching any other skill file: `opticup-strategic`, `opticup-architect`, `opticup-reviewer`, `opticup-localhost-tester`, `opticup-guardian`, `opticup-sentinel`, `opticup-campaign-overseer`, etc.
- Committing anything to `main`, running `git checkout main`, `git merge`, or `git rebase`.

---

## 8. Expected Final State

### New files
- `modules/Module 1.5 - Shared Components/backups/2026-05-14_EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/opticup-executor-SKILL.md` — verbatim copy of pre-edit SKILL.md (governance-file backup mandate).
- `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/EXECUTION_REPORT.md` — written by Executor at close.
- `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FINDINGS.md` — written by Executor (or marked `None.` if zero findings).
- `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FOREMAN_REVIEW.md` — written by Foreman at end of pipeline.

### Modified files
- `.claude/skills/opticup-executor/SKILL.md` — TWO targeted additive insertions:

  **Insertion 1 — New section `5i`** (placed after line 688, before the empty line preceding the existing `6. **Field-reuse check:**` block; the section number `5i` matches the existing `5h` / `5g` / `5f` numbering convention in this part of the file):

  ```markdown

  5i. **Edge Function deploy — MCP-first with automatic CLI fallback (OPEN-021 closure, added 2026-05-14).**

     The Supabase MCP `deploy_edge_function` endpoint has returned `InternalServerErrorException` (5xx) on 3+ consecutive SPECs (2026-05-13 `STATUS_CHANGE_TRIGGERS_FRAMEWORK` F1; 2026-05-14 `M3_UTM_TRIPLE_LAYER_PERSISTENCE` Executor Proposal #1; pattern OPEN-021). Supabase CLI deploy from the repo root has succeeded **100%** of the time MCP has failed. The Executor therefore treats CLI as the canonical fallback path and does NOT escalate to Daniel.

     **Sequence:**

     1. **First attempt:** call `mcp__claude_ai_Supabase__deploy_edge_function` with the EF source.
     2. **Retry rule:** ONE retry on 5xx (`InternalServerErrorException`, generic `5xx`). Use a minimal payload (single-function deploy, no `import_map_path` unless required) for the retry.
     3. **Fallback trigger:** **second 5xx → auto-fallback to Supabase CLI without asking Daniel.** Do NOT write `DEPLOY_FALLBACK_NEEDED.md` (per §5h) any more — that file was the manual-Daniel-redeploy path and is now superseded by this section for the `deploy_edge_function` case. (`§5h` itself is preserved as the residual escape hatch for environments where the Executor lacks shell access.)
     4. **`verify_jwt` determination — MANDATORY (the §5h safeguard applies in full to the CLI fallback too):** before invoking the CLI, determine the function's intended `verify_jwt` value:
        - Read `supabase/config.toml` for an explicit `[functions.<slug>]\nverify_jwt = false` block — if present, `verify_jwt=false` is the intended value.
        - If no such block exists, the intended value is `verify_jwt=true` (Supabase default).
        - Cross-check against the live value via `mcp__claude_ai_Supabase__get_edge_function` (this MCP read endpoint works even when the deploy endpoint is degraded — empirically verified across OPEN-021 incidents).
        - If `verify_jwt=false` is the intended value, the CLI MUST pass `--no-verify-jwt`. Default CLI behavior is `verify_jwt=true` and would silently flip the gate (per §5h Source line — the 2026-05-13 `dispatch-queue` regression).
     5. **CLI command template:**
        ```
        supabase functions deploy <name> --project-ref tsxrrxzmdxaenlvocyit [--no-verify-jwt]
        ```
        Replace `<name>` with the EF slug. Append `--no-verify-jwt` if and only if step 4 determined `verify_jwt=false`. Run from repo root.
     6. **Execution mode:** invoke via the `Bash` tool with the command above. No `AskUserQuestion`, no `DEPLOY_FALLBACK_NEEDED.md`. If the CLI binary is missing (`supabase: command not found`) or the deploy returns non-zero exit, log a FINDING and fall back to the §5h manual path as the residual escape hatch.
     7. **Post-deploy verification — MANDATORY:** after the CLI returns success, call `mcp__claude_ai_Supabase__get_edge_function` for the same slug and confirm (a) the new version was published (version number increased), (b) `verify_jwt` matches the value determined in step 4. If `verify_jwt` flipped → log a HIGH-severity FINDING and redeploy immediately with the corrected flag.
     8. **Logging — MANDATORY:** every CLI fallback gets a 2-line entry under a `## EF deploy fallback` section in `EXECUTION_REPORT.md`:
        ```
        ## EF deploy fallback
        - <function-slug> v<N> — reason: MCP <error-code-or-message>; CLI <success|failure>; verify_jwt preserved at <true|false> (post-deploy get_edge_function confirmed).
        ```
        Add one bullet per function deployed via fallback. Cite the MCP error code/message verbatim (e.g., `InternalServerErrorException`, `502 Bad Gateway`).

     **Why this is default behavior and not an escalation:** OPEN-021 has manifested 5+ times; every time the answer has been Option 2 (CLI deploy). The 3-strikes mandate (per `opticup-strategic` SKILL.md *"If 3 consecutive reviews have called out the same issue, the next session MUST apply the change before starting any other work"*) was formally activated by `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Executor Proposal #1, 2026-05-14.

     **Scope:** this auto-fallback applies ONLY to `mcp__claude_ai_Supabase__deploy_edge_function`. It does NOT generalize to `apply_migration`, `execute_sql`, `create_branch`, `merge_branch`, or any other Supabase MCP tool. Those tools retain the existing "Retry once. If still fails → STOP and report" pattern from the §"When in doubt" decision table.
  ```

  **Insertion 2 — New row in the "When in doubt" decision table** (added immediately AFTER the existing `Tool fails unexpectedly | Retry once. If still fails → STOP and report.` row at line 893; the original row STAYS unchanged):

  ```markdown
  | `mcp__claude_ai_Supabase__deploy_edge_function` returns 5xx (e.g., `InternalServerErrorException`) | Exception to the row above: auto-fallback to Supabase CLI per §5i — do NOT escalate (OPEN-021 closure, added 2026-05-14). |
  ```

### Deleted files
**None.**

### DB state
No DB changes.

### Docs updated (MUST include)
- `OPEN_TASKS.md` (root) — update OPEN-021's row to closed (or note its resolution if OPEN-021 lives in a different register). If OPEN-021 is not in `OPEN_TASKS.md` (it currently lives in `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` entry #30), the Foreman's `FOREMAN_REVIEW.md` carries the closure note and `OPEN_TASKS.md` need not be touched.
- `MASTER_ROADMAP.md` — **NOT touched** (skill-only edit, no module-phase status change).
- `docs/GLOBAL_MAP.md` — **NOT touched** (no new functions / contracts).
- `docs/GLOBAL_SCHEMA.sql` — **NOT touched** (no schema change).
- Module 1.5 `SESSION_CONTEXT.md` — **NOT touched** (this SPEC is meta-tooling, not a Module 1.5 substantive deliverable; no SESSION_CONTEXT append).
- Module 1.5 `CHANGELOG.md` — **NOT touched** (skill-only edit; CHANGELOG batches at module-phase close, not per-SPEC).

---

## 9. Commit Plan

- **Commit 1** (Executor): `chore(skills): apply OPEN-021 auto-fallback to opticup-executor SKILL.md`
  - Files: `.claude/skills/opticup-executor/SKILL.md`, `modules/Module 1.5 - Shared Components/backups/2026-05-14_EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/opticup-executor-SKILL.md`, `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/SPEC.md` (this file).
  - Selective `git add` by filename — pre-existing untracked WIP left alone per Full-Auto Pipeline discipline.
- **Commit 2** (Executor, at close): `chore(spec): close EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK with retrospective`
  - Files: `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/EXECUTION_REPORT.md`, `…/FINDINGS.md`.
- **Commit 3** (Foreman, at close): `chore(spec): FOREMAN_REVIEW for EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK — OPEN-021 CLOSED`
  - Files: `…/FOREMAN_REVIEW.md` (and optionally a one-line DECISIONS_LOG entry if architect-side).

If commits 1 and 2 collapse into one (Executor judgment — the retrospective often lands clean in the same coherent unit when the SPEC is this small) that is acceptable per `opticup-executor/SKILL.md` line 754 (commit-budget honesty).

---

## 10. Dependencies / Preconditions

- Branch is `develop`, repo is `opticalis/opticup`.
- Integrity gate clean at session start (verified: exit 0, 112 files scanned).
- Supabase CLI presence is **not** a precondition of THIS SPEC — the SPEC only edits documentation; the runtime use of the CLI happens in FUTURE SPECs that read the new §5i.
- No prior SPEC in this folder (verified: `ls modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/` — folder freshly created for this SPEC).

---

## 11. Lessons Already Incorporated

- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (heading convention) → APPLIED: §Destructive Operations uses plain `## Destructive Operations` heading, no `§N.` prefix.
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 (Shared Edit Block) → NOT APPLICABLE here (N=1 file modified — only `opticup-executor/SKILL.md`).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (Baselines as symbols) → APPLIED: §0 carries `BASE_LINES_executor_skill`, `BASE_HITS_mcp_first`, `BASE_HITS_open021`.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1 (color-form completeness) → NOT APPLICABLE here (no visual re-skin; no hex/rgba forms).
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #2 (multi-form count criteria) → NOT APPLICABLE here (no multi-form swap).
- FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1 (`_down.sql` gate compatibility) → NOT APPLICABLE here (no SQL `_down` artifacts; rollback is git-revert).
- FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2 (Pipeline-mode escalation discipline) → IMPLICITLY APPLIED: this very SPEC IS the codification of one pre-authorized auto-pivot (MCP→CLI for EF deploys) called out in that proposal.
- FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Executor Proposal #1 (auto-fallback to CLI EF deploy) → THIS SPEC IS THE APPLICATION OF THAT PROPOSAL. Closes the 3-strikes recurrence loop.

---

## 12. Pre-Merge Checklist

- [ ] All 9 §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] Additive-only diff verified — `diff <(git show HEAD:.claude/skills/opticup-executor/SKILL.md) .claude/skills/opticup-executor/SKILL.md | grep -c '^<'` = **0**.
- [ ] Integrity Gate (Iron Rule 31) returns exit 0 or 2 — verified at end-of-SPEC.
- [ ] `git status --short` returns empty for files this SPEC owns (clean tree for scope).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` (or `FINDINGS.md` stub saying `None.`) written in the SPEC folder.
- [ ] Backup file present at `modules/Module 1.5 - Shared Components/backups/2026-05-14_EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/opticup-executor-SKILL.md`.

---

*End of SPEC.md.*
