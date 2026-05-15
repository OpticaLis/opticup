# ARCHITECT_SESSION_2026_05_14_CLEANUP — Architecture Brief

**Type:** Housekeeping commit SPEC. Captures the architect-authored Briefs + Activation Prompts + governance updates that accumulated as untracked files during the 2026-05-14 Architect session. Each prior SPEC ran selective `git add` for its own SPEC folder + migration only — leaving Brief files in `architecture-brief/` directories + governance edits (OPEN_TASKS, FUNNEL_ROADMAP) uncommitted by design. This SPEC commits them in one batch before P1.2 starts.

**Why:** A clean working tree before P1.2 lets the next Pipeline run start from a true zero baseline. Accumulating untracked Briefs across SPECs makes future `git status` reads noisy and increases risk of accidental inclusion in unrelated SPEC commits.

---

## 1. Scope — files to commit

**Architect-session Briefs + Activation Prompts (untracked, this session 2026-05-14):**

- `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_BRIEF.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_ACTIVATION_PROMPT.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/POST_MERGE_HEALTH_REPORT.md` (if present — written by the post-merge validation run)
- `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_BRIEF.md`
- `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_ACTIVATION_PROMPT.md`
- `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_BRIEF.md`
- `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_ACTIVATION_PROMPT.md`
- `modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_BRIEF.md`
- `modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_ACTIVATION_PROMPT.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_BRIEF.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_ACTIVATION_PROMPT.md`

**Governance edits (modified, this session 2026-05-14):**

- `OPEN_TASKS.md` (task #2 closed, Last-updated bumped to 2026-05-14)
- `roles/site-overseer/FUNNEL_ROADMAP.md` (Phase 1 order reordered, Phase 2.5 added, Phase 4 added)

**Out of scope:**

- Any other modified or untracked file in the repo NOT listed above. The executor MUST check `git status` and explicitly skip anything not on this list — including pre-existing dirty files from earlier sessions (site-overseer drafts, modules/Module 3 SPECs from prior sessions, GUARDIAN_ALERTS edits, etc.). Those remain in their current state.
- Any file outside the 13 paths above. No wildcard `git add -A`. No `git add .`. Every file added by explicit name.

---

## 2. Method

1. **Executor reads `git status --porcelain`** and produces a 2-column table: `[in-scope-list?] | path` for every untracked or modified file. Confirms exactly the 13 paths from §1 are present and that nothing in §1 has gone missing.
2. **If a §1 path is missing** (e.g. POST_MERGE_HEALTH_REPORT.md was actually committed earlier and is not in dirty state) → that's fine, skip it; log in EXECUTION_REPORT.
3. **If a §1 path's content differs from what was authored** (e.g. someone edited a Brief mid-session — sanity check via file mtime + line count vs Brief's known content) → STOP, escalate.
4. **Executor runs `git add <path>` for each path explicitly by name** — one path per `git add` call OR a single `git add` with all paths listed. Never `git add -A`, never `git add .`, never `git add architecture-brief/`.
5. **Verify staged set** via `git diff --cached --name-only` — must equal exactly the 13 paths (or fewer if any §1 path was missing per step 2).
6. **Commit** with message: `docs(architect): commit architect-session 2026-05-14 briefs + governance edits`.
7. **Push** to `origin/develop`. NEVER push to main.
8. **Verify `git status` is clean for the files in §1 scope.** Anything outside §1 that was already dirty remains dirty (out-of-scope per §1).

---

## 3. Output

Standard SPEC-folder outputs at `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_SESSION_2026_05_14_CLEANUP/`:
1. `SPEC.md` (Foreman)
2. `EXECUTION_REPORT.md` (Executor) — includes the 2-column git-status table from §2 step 1
3. `FOREMAN_REVIEW.md` (Foreman closure)

---

## 4. Destructive Operations

**None.** Pure additive `git add` + `git commit` + `git push origin develop`. Zero file deletes. Zero DB writes. Zero EF deploys. Zero rebases. Zero merges to main.

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | Exactly the §1 paths (or the subset of them that are dirty) are staged — no more, no less | `git diff --cached --name-only` |
| 2 | Commit landed on `develop` with the specified message | `git log -1` |
| 3 | Pushed successfully to `origin/develop` | `git status` "your branch is up to date" |
| 4 | All other pre-existing dirty/untracked files remain in their prior state (untouched by this SPEC) | `git status --porcelain` before/after diff (out-of-scope set unchanged) |
| 5 | No `git add -A` or `git add .` invocation anywhere in EXECUTION_REPORT | grep |
| 6 | Smoke 7/7 PASS (control — nothing should regress) | `npm run smoke` |
| 7 | Integrity gate exit 0 | `npm run verify:integrity` |
| 8 | No new SPEC folders at repo root accidentally introduced | `ls` |

---

## 6. Notes

- Estimated effort: 5-10 minutes.
- No mandatory backup — this SPEC writes zero new content; it only stages existing untracked authored content.
- Pipeline: Foreman → Executor → Reviewer → Foreman closure. Localhost-Tester skipped (no code change).
- This is the standard end-of-session hygiene pattern from CLAUDE.md §9 "Clean Repo at Session End" — formalized as a SPEC because the architect session spawned 5 Pipeline runs without an interleaved cleanup, and the untracked accumulated.

End of Brief.
