# Activation Prompt — M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A

> Dispatched by: opticup-strategic (Module Strategist + Foreman, Claude Code Opus 4.7 1M)
> On: 2026-05-18 evening (IDT)
> Pipeline: Path X sequential — Executor → Reviewer → Localhost-Tester → Foreman closure

---

You are the **opticup-executor**. Load that skill BEFORE any action (it enforces 30 Iron Rules, Bounded Autonomy, Step 1.5 DB Pre-Flight, folder-per-SPEC retrospective protocol).

## Your task

Execute the SPEC at:
`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/SPEC.md`

## Hard constraints (re-read SPEC §5 before starting)

1. **NO polish-by-validation closure.** If you find zero code changes needed → STOP and write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_no-changes.md`. Memory `feedback_no_polish_by_validation.md` is binding.
2. **DO NOT touch** `shared/js/catalog-private-admin.js`, `shared/css/catalog-private-admin.css`, or any tenant-side `private-catalog` tab markup in `inventory.html`. That's Stage 4.
3. **DO NOT delete** any existing data (including the 3 misclassified "brands": יומיות / חודשיות / שנתיות).
4. **DO NOT touch** the existing tenant-side inventory screen.
5. **Selective `git add` by explicit filename for EVERY commit.** Never `git add -A`, never `git add .`, never `git commit -am`. The 10 pre-existing untracked files listed in SPEC §0.7 are NOT yours to commit.
6. **Iron Rule 32:** SPEC declares `## Destructive Operations: None.` — implicit forbid of ALL destructive ops. If you encounter need for one → STOP, escalation file.
7. **Iron Rule 9 backup:** triggers when this SPEC's run touches > 5 files. Per Brief + count: this WILL trigger (~10 files in scope). Create backup folder under `modules/Module 1 - Inventory Management/backups/2026-05-18_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/` BEFORE the first edit. Backup files are gitignored — do NOT include in commits (verify via `ls` exit 0, not via git log).

## Pre-Action Collision Check

Pipeline lock is currently claimed by `foreman-2a-author`. Your session must:
1. Release the Foreman's lock: `node scripts/pipeline-coordination.mjs release --spec-slug M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A --session-id foreman-2a-author`
2. Claim your own Executor lock: `node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A --branch-owned develop --files-owned-globs "modules/lens-catalog-admin/**,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/**,modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md,modules/Module 1 - Inventory Management/docs/CHANGELOG.md,modules/Module 1 - Inventory Management/docs/MODULE_MAP.md,modules/Module 1 - Inventory Management/backups/**,css/lens-catalog-admin-tabs-modals.css,migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql,inventory.html" --session-id executor-2a`
3. Release your Executor lock at the end of your run.

## Deliverables (Brief §10 + SPEC §12)

1. **5 commits on `develop`** per SPEC §9 commit plan.
2. **EXECUTION_REPORT.md** in the SPEC folder with §3 actual values captured, self-scores 1-10 on four dimensions (Brief §10 #5).
3. **FINDINGS.md** in the SPEC folder (Brief §10 #6) — even if empty, write `No findings.`
4. **Backup folder** under `modules/Module 1 - Inventory Management/backups/...` (gitignored).
5. **2 author-skill + 2 executor-skill improvement proposals** harvested in your EXECUTION_REPORT (these inform the Foreman's FOREMAN_REVIEW.md).
6. **Pre-execution git tag:** `pre-M1-stage2a-platform-admin-20260518-NNNN` (current HHMM at start).

## Success criteria summary (full list: SPEC §3)

40 criteria. 34 you can verify yourself; 6 are Localhost-Tester-observable (S-VFV-GLASSES-TAB, S-VFV-CONTACTS-TAB, S-VFV-EMPTY-STATE, S-VFV-POPULATED, S-VFV-CREATION-FLOWS, S-VFV-NO-CONSOLE) — leave these for the Tester. The Tester runs AFTER you close.

## Where to find context

- **Brief (sealed, read for orientation, do not re-litigate):** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF.md`
- **Mockup (authoritative visual reference — read in FULL, 671 lines):** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
- **SPEC (your binding contract):** this folder's `SPEC.md`
- **Stage 1 FOREMAN_REVIEW (preceding stage):** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/FOREMAN_REVIEW.md`

## When you finish

Emit ONE Hebrew line summarizing: status (🟢/🟡/🔴) + commit count + DB migration status + any genuine blockers. The Foreman picks up from there.

---

**End of activation. Execute under Bounded Autonomy.**
