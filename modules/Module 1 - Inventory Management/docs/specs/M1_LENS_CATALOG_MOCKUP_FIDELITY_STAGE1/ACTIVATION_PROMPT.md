# ACTIVATION_PROMPT — M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 (Executor)

> Hand this prompt to opticup-executor. The Executor reads SPEC.md in full, then executes under Bounded Autonomy.

---

You are opticup-executor. Load the `opticup-executor` skill via the Skill tool BEFORE any other action.

## Your mission

Execute the SPEC at:
`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/SPEC.md`

Stage 1 of the 5-stage M1 lens-catalog rebuild plan. **Visual fidelity re-skin only — no data, no schema, no logic changes.**

## Bounded-Autonomy rules (re-confirmed)

- Approved plan = green light to execute end-to-end without per-step confirmation.
- Stop on deviation, not on success.
- Selective `git add` by filename — **NEVER `git add -A` / `git add .`** (untracked files exist; sweeping them is forbidden — see SPEC §0).
- One concern per SPEC. If a bug in catalog data-loading surfaces, log to FINDINGS and continue. Do NOT silently fix it (SPEC §5).
- **NO polish-by-validation closure.** If you conclude "existing meets criteria, no changes needed" → STOP, write `escalations/{ISO_TS}_M1_LENS_STAGE1_NO_CHANGES_NEEDED.md`, halt the pipeline. Do NOT close 🟢 with zero changes. (SPEC §3 hard rule + Brief anti-pattern #1.)

## Pre-Action: claim the coordination lock

The Foreman session is already holding a lock for this SPEC slug. You can either:
- (a) Inherit it: pass `--session-id pid-37696-295a10eb` to coordination operations and bump heartbeat as you work, OR
- (b) Release-and-reclaim: `node scripts/pipeline-coordination.mjs release --spec-slug M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1` then re-claim with role=executor.

Either path is fine. **Heartbeat every ~3 minutes** while executing.

## Pre-edit tag (Iron Rule 9 belt-and-suspenders)

Before the first edit:
```
git tag pre-M1-stage1-mockup-fidelity-$(date +%Y%m%d-%H%M)
```
Record the tag name in EXECUTION_REPORT.md §6 Rollback.

## Execution path

Follow SPEC §9 Commit Plan exactly. Recap:

1. **Commit 1** — `feat(catalog-private-admin): mockup-faithful dark/light re-skin via [data-catalog-theme]`
   - NEW `shared/css/catalog-private-admin.css` (200–350 LOC)
   - MODIFY `shared/js/catalog-private-admin.js` (add `data-catalog-theme` plumbing in `buildShell` + `switchSubtab`; ≤+11 LOC; cap 350)
   - MODIFY `inventory.html` (add one `<link rel="stylesheet" href="shared/css/catalog-private-admin.css">`)
   - MODIFY `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` (one-line entry)
   - Run `node scripts/verify.mjs --staged` BEFORE commit; only commit if exit 0.
   - Push immediately so Reviewer can read commit hash.

2. **(Optional) Commit 2** — `fix(catalog-private-admin): <follow-up>` — only if a Reviewer / Tester finding lands in <30 LOC of CSS.

3. **Closure Commit** — `chore(spec): close M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 with retrospective`
   - SPEC folder files: EXECUTION_REPORT.md, FINDINGS.md (may be empty rather than absent — write at least the header), screenshots/ (Tester populates), TEST_REPORT.md (Tester populates), FOREMAN_REVIEW.md (Foreman populates).
   - MODIFY `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` (top-of-file closure entry; supersedes the partial-close entry from M1_LENS_CATALOG_TRUE_REBUILD).
   - MODIFY `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` (Stage 1 section).

## Color-form completeness reminder

Per SPEC §0 — when authoring the dark-theme CSS block, INCLUDE BOTH `#1e3a8a` AND `rgba(30,58,138,0.3)` (focus-ring form, mockup line 216). Don't drop the rgba.

## Tier C VFV — your role

You don't run Tier C yourself. The Localhost-Tester runs it AFTER Commit 1 is on `origin/develop`. Your job is to ensure the code is ready BEFORE you push:
- Verify the JS edits are coherent: `node -e "require('fs').readFileSync('shared/js/catalog-private-admin.js','utf8')"` syntax check, OR launch the local ERP yourself and click through once.
- The Tester is a separate skill (`opticup-localhost-tester`) and will write `TEST_REPORT.md` + capture 4 screenshots minimum.

## EXECUTION_REPORT.md required sections

1. **Header** — spec_id, executor, started, finished, verdict (🟢 / 🟡 / 🔴).
2. **§3 actuals vs expected** — table mirroring SPEC §3, with actual values captured.
3. **Commits shipped** — hash + message + LOC delta per file.
4. **Iron Rule self-check** — Rules 9 (backup), 12 (file size), 21 (no orphans), 31 (integrity gate), 32 (destructive ops).
5. **Self-scores 1–10** on (a) SPEC adherence, (b) Iron Rule adherence, (c) commit hygiene, (d) doc currency. Brief §10 #5.
6. **Rollback evidence** — git tag name, backup status (Iron Rule 9 trigger evaluation — SPEC §10 Notes).

## FINDINGS.md (mandatory file, may be empty body)

Write at minimum the header — even with 0 findings — so the SPEC folder has all 4 retrospective artefacts.

## Closure handoff

After your closure commit lands on `origin/develop`:
1. Bump heartbeat one last time.
2. **Do NOT release the lock.** The Reviewer + Tester need it during their runs. Foreman releases at the very end.
3. Hand control back to Foreman (this Claude Code session) via the agent-return path.

## Stop triggers (do not absorb — report)

See SPEC §5. Repeating the highest-stakes ones:
- File size > 350 LOC on `shared/js/catalog-private-admin.js` → revert + STOP.
- 0 code changes needed → STOP + escalation file. **No polish-by-validation closure.**
- Touch on `shared/css/styles.css` or `modules/lens-catalog-admin/**` → STOP (out of scope).
- `git add -A` or `git add .` mistakenly executed → STOP, unstage, re-stage selectively.

## What the Foreman expects on return

A clean SPEC folder containing:
- SPEC.md (already exists — yours to read, not edit)
- ACTIVATION_PROMPT.md (this file — read-only)
- EXECUTION_REPORT.md
- FINDINGS.md
- `origin/develop` advanced by 2–3 commits matching the plan above

Then Foreman dispatches Reviewer + Localhost-Tester, and writes FOREMAN_REVIEW.md.

---

_End ACTIVATION_PROMPT.md._
