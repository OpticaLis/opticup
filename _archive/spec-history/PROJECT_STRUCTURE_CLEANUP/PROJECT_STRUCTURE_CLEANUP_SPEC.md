# SPEC — Project Structure Cleanup (Stage A+B Unified)

**Author:** Main Strategic (Cowork session, 2026-05-09)
**Executor target:** Claude Code on 🖥️ Windows desktop
**Skill required:** `opticup-executor`
**Estimated time:** 75-120 minutes
**Risk level:** Medium (touches modules/ + many root files)
**Source:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_AUDIT_2026-05-09.md`

---

## §1 Goal

Bring the entire `opticup` repo into a single, professional, **self-enforcing** structural standard. Stop the disorder accumulating across sessions by establishing a written "Root Discipline Rule" in CLAUDE.md so future sessions know exactly what may live at root and what must move to `_archive/`.

This SPEC executes both Stage A (low-risk wins) and Stage B (Module 1 fix) from the audit report in a single coordinated sweep.

## §2 Background

The 2026-05-09 project structure audit (read-only) identified:
1. Module 1 duplicate: 9 SPECs in stray `Module 1 - Inventory/` instead of canonical `Module 1 - Inventory Management/`.
2. `_archive/root-deprecated/` was created during today's Cowork session as a staging area; the originals at root were never deleted because Cowork VM has no write permissions on root files. Result: 7 byte-identical duplicates.
3. `docs/FILE_STRUCTURE.md` is stale — does not reflect today's reorg (M12, decisions/, _archive/, __LAUNCH_PLAN_DRAFT__/_archive/, etc.).
4. Multiple legacy directories at root (`archive/`, `data/`, `---QA---/`, `outputs/`) are tracked despite being in `.gitignore`.
5. 3 `.DS_Store` files committed despite gitignore.
6. No written rule exists about what may live at repo root → every cleanup gets re-litigated.

Daniel's directive (2026-05-09): "Set up an order — fundamental, professional, that we can maintain. Stop discussing per-file. One rule, one SPEC, full execution."

## §3 Success Criteria — Measurable

After this SPEC executes, ALL of these must be true:

1. **Repo root has NO files outside the 3 allowed categories** (defined in §6 below). Verified by listing root and checking each file/dir against the allowlist.
2. **Module 1 duplicate is resolved:** `modules/Module 1 - Inventory/` no longer exists. All its SPECs live inside `modules/Module 1 - Inventory Management/docs/specs/`.
3. **`_archive/` is consolidated** at repo root with subfolders by category (no fragmentation across multiple archive dirs).
4. **`docs/FILE_STRUCTURE.md` is current** — reflects every top-level dir + key subdirs as of execution date.
5. **CLAUDE.md has a new "Root Discipline Rule" section** (§3 below) that future sessions can reference.
6. **`git status --short` is clean at the end** — all changes committed, working tree clean.
7. **No tracked file's content is destroyed** — only moves (`git mv`) and deletions (after content was moved). Verify with `git log --diff-filter=D` to confirm only moves, no orphan deletions.
8. **All commits follow the convention:** `chore(structure): <description>` with single-purpose commit messages (one logical change per commit).
9. **The 3 archive locations consolidate to 1:** `_archive/` at repo root only. The old `archive/` and `__LAUNCH_PLAN_DRAFT__/_archive/` are merged into the root `_archive/` with subfolders.
10. **Verify scripts pass:** `npm run verify:integrity` returns exit 0 at end of SPEC.

## §4 Autonomy Envelope

**Executor MAY (without asking):**
- Run `git status`, `git log`, `git diff`, `git show`, `ls`, `find`, `grep`, `cat`, `wc` — read operations.
- Run `git mv` for files explicitly listed in §7.
- Run `git rm` and `git rm --cached` for files explicitly listed in §7.
- Create `_archive/` subfolders as listed in §7.
- Edit `docs/FILE_STRUCTURE.md` and `CLAUDE.md` per §7.
- Commit changes in the order listed in §7, with the exact commit messages provided.
- Push to `develop` after each commit.

**Executor MUST STOP and report (do not proceed):**
- Any file/dir not listed in §7 turns out to need moving — STOP, report, wait.
- Any `git mv` returns an error (file collision, permission denied) — STOP, report.
- A SPEC collision in §7.B (a Module 1 SPEC name already exists in canonical dir) — STOP, report, wait.
- Any reference (grep result) to a path being moved is found in source code (`.js`, `.html`, `.ts`) — STOP, report, wait.
- `npm run verify:integrity` fails after any commit — STOP, report.
- The user (Daniel) sends any message during execution — STOP, await new direction.

## §5 Stop-Triggers (beyond §4 absolutes)

Stop and report if:
- Branch is not `develop`.
- Repo not on `opticup` (verify `git remote -v`).
- Pre-existing uncommitted work is found (handle per CLAUDE.md §1 step 4).
- Any commit ends in a non-zero exit code.

## §6 The Root Discipline Rule (to be added to CLAUDE.md)

**This is the new rule that the SPEC writes into CLAUDE.md as Section 0.5.**

> ### 0.5 Root Discipline Rule (added 2026-05-09)
>
> **Every file or directory at repo root MUST belong to one of these 3 categories. No exceptions.**
>
> **Category 1 — Technical Infrastructure (no choice, required by tooling):**
> - `CLAUDE.md`, `README.md`, `package.json`, `package-lock.json`, `.gitignore`, `.mcp.json`, `.nojekyll`, `CNAME`, `favicon.ico`
> - Hidden infra dirs: `.git/`, `.github/`, `.husky/`, `.vscode/`, `.claude/`, `node_modules/`
>
> **Category 2 — Live Sources of Truth (actively maintained, referenced by current sessions):**
> - `MASTER_ROADMAP.md` — cross-module roadmap + decisions log
> - `TECH_DEBT.md` — living debt register
> - `docs/` — canonical reference files (GLOBAL_MAP, GLOBAL_SCHEMA, FILE_STRUCTURE, CONVENTIONS, etc.)
> - `modules/` — per-module documentation + per-feature implementation
> - `__LAUNCH_PLAN_DRAFT__/` (or its successor name) — pre-LIVE planning artifacts
> - `_archive/` — single archive vault (see Category 3)
> - `migrations/`, `scripts/`, `shared/`, `js/`, `css/`, `supabase/`, `tests/` — code/infra dirs
> - `campaigns/` — Campaign Overseer working area
> - `watcher-deploy/` — Watcher service installer (Windows desktop only)
>
> **Category 3 — Application Entrypoints (required for GitHub Pages routing):**
> - `index.html` (mandatory at root)
> - 17 other ERP HTML pages (`admin.html`, `crm.html`, `inventory.html`, `settings.html`, `shipments.html`, `employees.html`, `error.html`, `landing.html`, `r.html`, `storefront-*.html`, `suppliers-debt.html`)
>
> **Anything not in Categories 1-3 → must move to `_archive/<subfolder>/`.** This includes legacy onboarding docs, old prompts, completed phase summaries, single-session handoffs, project-genesis snapshots.
>
> **When adding a new file at root, ask: "Which category?"** If none → it doesn't belong at root.
>
> **Maintaining the rule:** Every Module Close Ceremony (per `opticup-main-strategic` skill) must include a 30-second root scan. Anything new not in Categories 1-3 → archive immediately.

This rule prevents drift forever after.

## §7 Execution Plan — Step by Step

Execute commits in this exact order. Push after each commit. Verify `git status --short` is clean before next commit.

### Commit 1 — Resolve `_archive/root-deprecated/` (the staging mess)

The `_archive/root-deprecated/` was created today as duplicates. Per Daniel's decision, delete the staging — keep originals at root for now, decide their fate in Commit 4.

```bash
rm -rf _archive/root-deprecated/
# Note: _archive/ stays — will be repopulated in Commit 4
git status --short  # should show no tracked changes (root-deprecated was untracked)
```

No commit yet — this is just disk cleanup since `_archive/root-deprecated/` was never tracked.

### Commit 2 — Untrack already-gitignored files

```bash
git rm --cached .DS_Store modules/.DS_Store "modules/Module 1.5 - Shared Components/.DS_Store"
git rm -r --cached outputs/
git rm -r --cached archive/
git commit -m "chore(structure): untrack files already in .gitignore (.DS_Store x3, outputs/, archive/)"
git push origin develop
```

Verify after: `git status --short` should be clean. The files remain on disk; they're just no longer tracked.

### Commit 3 — Module 1 stray fix (the most consequential change)

**Pre-flight check first** — verify no SPEC name collisions:

```bash
for spec in M1_DEBT_VAT_FALLBACK_GUARD M1_FIXES_2026_04_26 M1_RECEIPT_PO_COMPARE_SHRINK PERMISSIONS_AUDIT_PHASE1_2026_04_27 PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27 PERMISSIONS_PHASE2_FIX_2026_04_27 PERMISSIONS_PHASE3_CSS_GATING_2026_04_27 STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27 STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27; do
  if [ -d "modules/Module 1 - Inventory Management/docs/specs/$spec" ]; then
    echo "COLLISION: $spec"
  else
    echo "SAFE: $spec"
  fi
done
```

If ANY "COLLISION" → STOP, report, wait for direction.

If all "SAFE" → proceed. Also pre-flight: search for any source code references to the stray dir path:

```bash
grep -rn "Module 1 - Inventory/" --include="*.md" --include="*.html" --include="*.js" --include="*.ts" .
```

If references found in source code (`.js`/`.html`/`.ts`) → STOP, report. Markdown references can be updated in this same commit.

If clean → execute moves:

```bash
for spec in M1_DEBT_VAT_FALLBACK_GUARD M1_FIXES_2026_04_26 M1_RECEIPT_PO_COMPARE_SHRINK PERMISSIONS_AUDIT_PHASE1_2026_04_27 PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27 PERMISSIONS_PHASE2_FIX_2026_04_27 PERMISSIONS_PHASE3_CSS_GATING_2026_04_27 STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27 STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27; do
  git mv "modules/Module 1 - Inventory/docs/specs/$spec" "modules/Module 1 - Inventory Management/docs/specs/$spec"
done

# Verify stray dir is now empty:
ls "modules/Module 1 - Inventory/docs/specs/"   # expect: empty
ls "modules/Module 1 - Inventory/docs/"           # expect: empty (only specs/)
ls "modules/Module 1 - Inventory/"                # expect: only docs/

# Remove the now-empty stray dir:
git rm -r "modules/Module 1 - Inventory"

# Update any markdown references found by the earlier grep (in this same commit):
# (executor: do this manually based on grep output, then stage the edits)

git commit -m "chore(modules): consolidate Module 1 — move 9 stray SPECs to canonical Inventory Management; remove stray dir"
git push origin develop
```

### Commit 4 — Apply Root Discipline Rule (move legacy files to `_archive/`)

Create the consolidated `_archive/` structure:

```bash
mkdir -p _archive/root-onboarding/      # legacy onboarding/prompt files
mkdir -p _archive/project-genesis/      # March-era files (old archive/ + data/ + ---QA---/)
mkdir -p _archive/launch-plan-versions/ # MASTER_LIVE_PLAN_v1
mkdir -p _archive/session-outputs/      # outputs/ historical prompts
```

Move files per Categories defined in §6:

```bash
# Move legacy onboarding/prompt files from root
git mv DANIEL_QUICK_REFERENCE.md _archive/root-onboarding/
git mv STRATEGIC_CHAT_ONBOARDING.md _archive/root-onboarding/
git mv MODULE_DOCUMENTATION_SCHEMA.md _archive/root-onboarding/
git mv UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md _archive/root-onboarding/
git mv UNIVERSAL_SECONDARY_CHAT_PROMPT.md _archive/root-onboarding/
git mv PHASE_0_PROGRESS.md _archive/root-onboarding/
git mv handoff-next-session.md _archive/root-onboarding/

# Consolidate the OLD archive/ (March-era) into _archive/project-genesis/
# These were already untracked (commit 2 untracked them); now physically move:
mv archive/* _archive/project-genesis/
rmdir archive

# Consolidate March data/ into project-genesis
mv data/* _archive/project-genesis/
rmdir data

# Consolidate ---QA--- into project-genesis
mv "---QA---/"* _archive/project-genesis/
rmdir "---QA---"

# Consolidate __LAUNCH_PLAN_DRAFT__/_archive/MASTER_LIVE_PLAN_v1.md into _archive/launch-plan-versions/
git mv "__LAUNCH_PLAN_DRAFT__/_archive/MASTER_LIVE_PLAN_v1.md" "_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md"
rmdir __LAUNCH_PLAN_DRAFT__/_archive/  # should be empty

# Move outputs/ contents to _archive/session-outputs/ (already untracked from commit 2)
mv outputs/* _archive/session-outputs/ 2>/dev/null || true
rmdir outputs 2>/dev/null || true

# Delete the deprecated MASTER_LIVE_PLAN.md at __LAUNCH_PLAN_DRAFT__ root
git rm "__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md"

# Delete other identified leftovers
rm -f docs/guardian_test.tmp 2>/dev/null || true
rm -f .claude/skills/opticup-strategic/test_write 2>/dev/null || true

# Add a README to _archive/ explaining the structure
cat > _archive/README.md << 'EOFREADME'
# `_archive/` — Repository Archive

> **Purpose:** Single archive vault for the entire opticup repo. Files here are preserved for historical reference but are NOT actively maintained.

## Structure

- `root-onboarding/` — legacy onboarding docs and chat prompts that were superseded by `.claude/skills/`
- `project-genesis/` — March 2026 era files (old `archive/`, `data/`, `---QA---/`)
- `launch-plan-versions/` — historical MASTER_LIVE_PLAN versions (current truth: `/MASTER_ROADMAP.md`)
- `session-outputs/` — historical session prompts/handoffs from `outputs/`

## How to add to archive

Per CLAUDE.md §0.5 (Root Discipline Rule), any file leaving root or any other actively maintained location → move here under the appropriate subfolder. Add a brief note in this README if a new subfolder is created.

## How to recover

Files here are git-tracked. Use `git log --follow <path>` to see history; `git show <hash>:<path>` to view a specific version.

EOFREADME

git add _archive/README.md
git commit -m "chore(structure): apply Root Discipline Rule — consolidate 4 archive locations into _archive/, archive 7 legacy onboarding docs"
git push origin develop
```

### Commit 5 — Refresh `docs/FILE_STRUCTURE.md`

Read the current file. Update to reflect:
- New `_archive/` at root (with subfolders)
- `__LAUNCH_PLAN_DRAFT__/` updated structure (remove `_archive/` mention; add `handoffs/` mention; add `architecture-briefs/M11/`, `M12/` subfolders)
- `.claude/skills/opticup-main-strategic/references/decisions/` subfolder
- Removal of `archive/`, `data/`, `---QA---/`, `outputs/` from root
- `_archive/` mentioned with all 4 subfolders

```bash
# Editor task — careful manual edit. Read FILE_STRUCTURE.md, edit, save.
git add docs/FILE_STRUCTURE.md
git commit -m "docs(structure): refresh FILE_STRUCTURE.md after Root Discipline reorg"
git push origin develop
```

### Commit 6 — Add Root Discipline Rule to CLAUDE.md

Insert §0.5 (per §6 of this SPEC) between current §0 (or after the introduction) and §1 (Session Start Protocol). Wording exactly as in §6 above.

```bash
# Editor task — insert §0.5 in CLAUDE.md per §6 of this SPEC
git add CLAUDE.md
git commit -m "docs(rules): add §0.5 Root Discipline Rule — defines what may live at repo root"
git push origin develop
```

### Commit 7 — Final verification + integrity gate

```bash
# Run integrity gate
npm run verify:integrity   # must exit 0

# Verify clean working tree
git status --short          # must be empty

# Verify final root structure
ls -la | grep -v "^total\|^d.*\.\." > /tmp/final_root.txt
cat /tmp/final_root.txt
```

If `verify:integrity` fails → STOP, report.
If `git status` shows anything → STOP, report.

No commit needed for this step; it's a verification only.

## §8 Out-of-Scope

Explicitly NOT in this SPEC:
- Module 2 admin/admin-platform analysis (Audit Q7) — separate investigation later.
- 3 orphan docs (`LEARNINGS.md`, `IMPROVEMENT_LOG.md`, `PROJECT_VISION.md`) — Daniel decision deferred (Audit Q3).
- Renaming `__LAUNCH_PLAN_DRAFT__` to `planning/` — separate SPEC, after M13 brief sealed (Audit Q4).
- HTML files relocation from root — post-LIVE only (would break `js/shared.js` redirects).
- `inventory.html` refactor (1,046 lines) — Module 1 maintenance task.
- Module 4 / `campaigns/` migration overlap (canonical schema annotation) — separate doc-link fix.
- Worktree pruning (`.claude/worktrees/jovial-lewin-b61073/`) — local-only, Daniel can prune at any time with `git worktree prune`.

## §9 Rollback Plan

If anything goes wrong at any commit:
1. Stop immediately.
2. Run `git status` + `git log -5 --oneline`.
3. Revert the last commit if needed: `git revert HEAD`.
4. Report to Daniel with the exact failure state.

The SPEC is designed so each commit is independently revertable. No single commit destroys irreplaceable content (everything moved is preserved in git history).

## §10 Final State Verification

After Commit 7, the executor must report:

```
SPEC COMPLETE.
Final root contents: <paste output of `ls -la` filtered to non-hidden>
_archive/ contents: <paste tree output>
Module 1 - Inventory: REMOVED ✓ (or present? error)
Module 1 - Inventory Management/docs/specs/: <count> SPECs total (was N+9)
docs/FILE_STRUCTURE.md last commit: <hash + date>
CLAUDE.md §0.5 present: YES/NO
git status: clean ✓
verify:integrity: exit 0 ✓
```

Daniel will then verify in the next Cowork session.

---

*End of SPEC. Authored by Main Strategic in Cowork session, 2026-05-09. Ready for opticup-executor in Claude Code.*
