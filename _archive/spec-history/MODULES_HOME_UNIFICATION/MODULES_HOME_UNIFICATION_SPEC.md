# SPEC — Modules Home Unification (One Home Per Module, For Life)

**Author:** Architect (Cowork session, 2026-05-09)
**Executor target:** Claude Code on 🖥️ Windows desktop
**Skill required:** `opticup-executor`
**Estimated time:** 60-90 minutes
**Risk level:** Medium (touches modules/, deletes __LAUNCH_PLAN_DRAFT__/)
**Source:** Daniel directive 2026-05-09 — "every module should live in `modules/` regardless of life stage; `__LAUNCH_PLAN_DRAFT__` location is illogical"

---

## §1 Goal

Establish the **One Home Per Module** rule: every module — at every stage of its life (Brief → SPECs → Code → Production) — lives under `modules/Module N - Name/`. Eliminate the `__LAUNCH_PLAN_DRAFT__/` folder entirely by relocating its contents to logical homes.

After this SPEC: there is exactly ONE place to look for any module. The current split between "live modules in `modules/`" and "in-design modules in `__LAUNCH_PLAN_DRAFT__/architecture-briefs/`" is gone.

## §2 Background

Today the project has 2 module locations depending on life stage:
- **Built/Production** (M1, M1.5, M2, M3, M3.1, M4) → `modules/Module N - Name/`
- **In-design (Brief)** (M5, M6, M7, M8, M11, M12, M14, M15) → `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M N - Name/`

This is a historical accident. The `__LAUNCH_PLAN_DRAFT__/` folder was created when the launch plan was a draft. The folder name is now misleading (briefs are not drafts — they're locked decisions), and the split forces 3 future moves per module: Brief → SPECs → Code, each move = a chance for drift.

Daniel's directive: "in the end, this should also be logical." The logical structure is: each module is born in its final home and grows there.

`__LAUNCH_PLAN_DRAFT__/` also holds 4 other categories that need new homes:
- `access-audit/` — historical audits of OpticPlus DB (input to module designs)
- `campaign-overseer/` + `site-overseer/` — operational role artifacts (active)
- `supervisor-system/` — legacy notes (archive)
- `handoffs/` — session-to-session handoff docs
- 6 meta-files about the previous PROJECT_STRUCTURE_CLEANUP_SPEC + 3 audit pass findings (self-reference, archive)

## §3 Success Criteria — Measurable

After this SPEC executes, ALL of these must be true:

1. **`__LAUNCH_PLAN_DRAFT__/` no longer exists.** Verified by `ls -d __LAUNCH_PLAN_DRAFT__/` returning "No such file or directory".
2. **8 module brief folders relocated** to `modules/Module N - Name/architecture-brief/` (one per module: M5, M6, M7, M8, M11, M12, M14, M15). Each folder contains the original Brief MD + sketches + handoff (if applicable).
3. **Each module dir has a consistent internal layout:**
   ```
   modules/Module N - Name/
   ├── architecture-brief/    ← if Brief exists; contains BRIEF.md + sketches + handoff
   ├── docs/                  ← MODULE_SPEC, MODULE_MAP, db-schema, SESSION_CONTEXT, specs/
   └── ROADMAP.md             ← if module has phases planned
   ```
4. **Operational role folders moved to a new `roles/` directory at repo root:**
   - `roles/campaign-overseer/`
   - `roles/site-overseer/`
   - `roles/supervisor-system/` (or archive — see Q1 below)
5. **`access-audit/` relocated to a logical home** — recommended: `_archive/access-audit/` since it's historical input, not actively maintained. Decision per Q2.
6. **6 meta-files about previous Project Structure Cleanup** archived to `_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/`.
7. **3 audit pass findings** archived to same location.
8. **Handoffs** — each module's handoff lives inside its own module folder, not in a central `handoffs/` (which goes away).
9. **CLAUDE.md §0.5 Root Discipline Rule updated** to reflect that `__LAUNCH_PLAN_DRAFT__/` no longer exists; `roles/` added as Category 2.
10. **`docs/FILE_STRUCTURE.md` refreshed.**
11. **`MASTER_ROADMAP.md` §2.5 updated** — paths to briefs now point to `modules/Module N - Name/architecture-brief/` (no longer `__LAUNCH_PLAN_DRAFT__/...`).
12. **`.claude/skills/opticup-architect/SKILL.md` First Action updated** — bootstrap reads `MASTER_ROADMAP.md`, no reference to `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md` (already deprecated).
13. **`.claude/skills/opticup-architect/references/decisions/M5.md`–`M12.md`** updated — any path references to `__LAUNCH_PLAN_DRAFT__/` rewritten.
14. **`git status --short`** clean at end.
15. **`npm run verify:integrity`** exit 0 at end.
16. **No tracked file content destroyed** — all moves use `git mv` where source is tracked, plain `mv` + `git add` where source is untracked.

## §4 Autonomy Envelope

**Executor MAY (without asking):**
- All read operations.
- `git mv` for files explicitly listed in §7.
- `git rm` for files explicitly listed in §7.
- `mkdir` to create the new target directories.
- `mv` (plain) for untracked files explicitly listed in §7.
- Edit `CLAUDE.md`, `docs/FILE_STRUCTURE.md`, `MASTER_ROADMAP.md`, `.claude/skills/opticup-architect/SKILL.md`, and per-module `decisions/` files per §7.
- Commit per §7 commit plan with exact messages provided.
- Push to develop after each commit.

**Executor MUST STOP and report:**
- A target directory `modules/Module N - Name/` already exists with conflicting content (e.g., `modules/Module 5 - Customers/` already has files) — STOP, report, wait.
- Any path reference to `__LAUNCH_PLAN_DRAFT__/` is found in **source code** (`.js`, `.html`, `.ts`) — STOP, report, do not silently break.
- A grep of project files reveals references to `__LAUNCH_PLAN_DRAFT__/` paths that aren't covered by §7's edit list — STOP, report.
- Any `git mv` returns an error — STOP, report.
- Pre-existing uncommitted work intersects SPEC scope — handle per §5.
- Pre-commit hook (Rule 23 etc.) blocks any commit — STOP, report.
- Daniel sends a message during execution — STOP, await new direction.

## §5 Stop-Triggers (beyond §4 absolutes)

Stop and report if:
- Branch is not `develop`.
- Repo not on `opticup`.
- `git status --short` is not clean at start (there ARE pre-existing uncommitted file changes that need handling — handle per the same Pre-SPEC pattern as the previous cleanup SPEC: stage real work first, then proceed).
- Any commit ends in non-zero exit code.
- After Commit 5 the search `grep -rn "__LAUNCH_PLAN_DRAFT__" --include="*.md" --include="*.js" --include="*.html" --include="*.ts" .` returns hits that weren't expected.

## §6 Pre-Flight Checks (run BEFORE Commit 1)

Per Pattern P28 (executor pre-flight beats author intent), run these checks first and report findings:

1. **Verify no `modules/Module 5-15` dirs exist already** (would conflict with moves):
   ```bash
   for n in 5 6 7 8 9 10 11 12 13 14 15; do
     if ls -d "modules/Module $n"* 2>/dev/null | head -1; then echo "EXISTS: Module $n"; fi
   done
   ```
   Expected: empty output.

2. **Find ALL references to `__LAUNCH_PLAN_DRAFT__`** in the entire codebase:
   ```bash
   grep -rln "__LAUNCH_PLAN_DRAFT__" --include="*.md" --include="*.js" --include="*.html" --include="*.ts" --include="*.mjs" .
   ```
   Save the list. Each will need updating in Commit 6 or 7.

3. **Check `git status --short`** for pre-existing work:
   ```bash
   git status --short
   ```
   If anything tracked is modified — handle per same pattern as previous SPEC (Pre-SPEC commits to stage real work first).

4. **Verify `_archive/` exists at repo root** (created in previous SPEC):
   ```bash
   ls -d _archive/
   ```

5. **Confirm Daniel's answers to §10 Open Questions** before proceeding to Commit 1. If unanswered, STOP and ask.

## §7 Execution Plan

### PRE-SPEC commits (if §6 pre-flight reveals pre-existing work)

Same pattern as the previous Project Structure Cleanup SPEC: commit real work first, then run the SPEC on a clean tree. List the files, stage them in logical groups, commit with descriptive messages, push.

### Commit 1 — Create the new module homes for in-design modules

```bash
# Create the 8 module dirs that don't yet exist
for spec in "Module 5 - Customers" "Module 6 - Prescriptions" "Module 7 - Orders" "Module 8 - Payments" "Module 11 - Reports" "Module 12 - Communications" "Module 14 - Appointments" "Module 15 - Queue"; do
  mkdir -p "modules/$spec/architecture-brief"
done

# Create a placeholder README in each (so the dirs commit even before files move):
for spec in "Module 5 - Customers" "Module 6 - Prescriptions" "Module 7 - Orders" "Module 8 - Payments" "Module 11 - Reports" "Module 12 - Communications" "Module 14 - Appointments" "Module 15 - Queue"; do
  cat > "modules/$spec/README.md" << EOF
# $spec

> **Status:** In-design (Architecture Brief sealed, awaiting SPEC authoring).

## Folder layout

- \`architecture-brief/\` — sealed Brief + sketches + handoff (input for Module Strategist)
- \`docs/\` — MODULE_SPEC, MODULE_MAP, db-schema, SESSION_CONTEXT, specs/ (created when SPEC authoring begins)
- \`ROADMAP.md\` — phase plan (created when SPEC authoring begins)

## Brief location

See \`architecture-brief/\` for the sealed cross-module Architecture Brief.

EOF
done

git add modules/Module\ 5\ -\ Customers/README.md \
        modules/Module\ 6\ -\ Prescriptions/README.md \
        modules/Module\ 7\ -\ Orders/README.md \
        modules/Module\ 8\ -\ Payments/README.md \
        modules/Module\ 11\ -\ Reports/README.md \
        modules/Module\ 12\ -\ Communications/README.md \
        modules/Module\ 14\ -\ Appointments/README.md \
        modules/Module\ 15\ -\ Queue/README.md
git commit -m "feat(modules): create homes for in-design modules M5-M15 (One Home Per Module rule)"
git push origin develop
```

### Commit 2 — Move 8 brief folders to their module homes

```bash
# Move each brief folder's contents into its module's architecture-brief/
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M5 - Customers/"* "modules/Module 5 - Customers/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M6 - Prescriptions/"* "modules/Module 6 - Prescriptions/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7 - Orders/"* "modules/Module 7 - Orders/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M8 - Payments/"* "modules/Module 8 - Payments/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M11 - Reports/"* "modules/Module 11 - Reports/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M12 - Communications/"* "modules/Module 12 - Communications/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M14 - Appointments/"* "modules/Module 14 - Appointments/architecture-brief/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/M15 - Queue/"* "modules/Module 15 - Queue/architecture-brief/"

# Verify each source dir is empty:
for d in "M5 - Customers" "M6 - Prescriptions" "M7 - Orders" "M8 - Payments" "M11 - Reports" "M12 - Communications" "M14 - Appointments" "M15 - Queue"; do
  remaining=$(ls -A "__LAUNCH_PLAN_DRAFT__/architecture-briefs/$d/" 2>/dev/null | wc -l)
  echo "$d: $remaining files remaining (expect 0)"
done

# Remove the now-empty source dirs:
for d in "M5 - Customers" "M6 - Prescriptions" "M7 - Orders" "M8 - Payments" "M11 - Reports" "M12 - Communications" "M14 - Appointments" "M15 - Queue"; do
  rmdir "__LAUNCH_PLAN_DRAFT__/architecture-briefs/$d/" 2>&1
done

git commit -m "chore(modules): move 8 in-design Briefs into modules/Module N - Name/architecture-brief/ (One Home Per Module)"
git push origin develop
```

### Commit 3 — Move handoffs into their module homes

The 2 handoff files (M12, M13) currently live in `__LAUNCH_PLAN_DRAFT__/handoffs/`. M13_HANDOFF needs the M13 module home created first.

```bash
# Create M13 module home (we don't have a brief yet, but the handoff is the start)
mkdir -p "modules/Module 13 - Loyalty Club/architecture-brief"
cat > "modules/Module 13 - Loyalty Club/README.md" << 'EOF'
# Module 13 - Loyalty Club

> **Status:** Pre-Brief (handoff received, Architecture Brief authoring not yet started).

## Folder layout

- `architecture-brief/` — handoff doc + sealed Brief (when authored)
- `docs/` — created when SPEC authoring begins

## Handoff

See `architecture-brief/M13_HANDOFF.md` for the cross-module handoff that initiated this module.
EOF

# Move handoffs into respective module homes
git mv "__LAUNCH_PLAN_DRAFT__/handoffs/M12_HANDOFF.md" "modules/Module 12 - Communications/architecture-brief/M12_HANDOFF.md"
git mv "__LAUNCH_PLAN_DRAFT__/handoffs/M13_HANDOFF.md" "modules/Module 13 - Loyalty Club/architecture-brief/M13_HANDOFF.md"

# Remove the now-empty central handoffs/ dir
rmdir __LAUNCH_PLAN_DRAFT__/handoffs/

git add "modules/Module 13 - Loyalty Club/README.md"
git commit -m "chore(handoffs): move M12+M13 handoffs into respective module homes; create M13 module home"
git push origin develop
```

### Commit 4 — Create roles/ at repo root for operational role artifacts

```bash
mkdir -p roles/
cat > roles/README.md << 'EOF'
# `roles/` — Operational Role Artifacts

> **Purpose:** Active operational roles that are NOT modules. Each subfolder = one role with its own handoff, decisions log, learnings, and skill notes.

## Roles

- `campaign-overseer/` — Campaign Overseer (active campaigns + decisions log)
- `site-overseer/` — Marketing/info site Overseer (site map, content drift)

These roles parallel the Module Strategist + Executor roles for development modules, but they own operational surfaces (campaigns, the public site) rather than building modules.

## How to add a new role

1. Create `roles/<role-name>/` with `HANDOFF.md`, `DECISIONS_LOG.md`, `LEARNINGS.md`.
2. Add a skill in `.claude/skills/opticup-<role-name>/` if the role has session-startup automation.
3. Document in this README.

EOF

# Move active operational roles
git mv "__LAUNCH_PLAN_DRAFT__/campaign-overseer" "roles/campaign-overseer"
git mv "__LAUNCH_PLAN_DRAFT__/site-overseer" "roles/site-overseer"

git add roles/README.md
git commit -m "feat(roles): create roles/ at repo root for operational role artifacts; move campaign-overseer + site-overseer"
git push origin develop
```

### Commit 5 — Archive everything that's historical

```bash
mkdir -p _archive/spec-history/PROJECT_STRUCTURE_CLEANUP/
mkdir -p _archive/access-audit/
mkdir -p _archive/supervisor-system/

# Move the 6 meta files about the previous SPEC + 3 audit pass findings
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_AUDIT_2026-05-09.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_CLEANUP_SPEC.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_CLEANUP_ACTIVATION.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/EXECUTION_REPORT.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/FINDINGS.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/_pass3_4_findings.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/_pass8_9_findings.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/_pass10_findings.md" "_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/"

# This SPEC itself (which is currently being executed) — defer move to Commit 8 (final cleanup)
# git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/MODULES_HOME_UNIFICATION_SPEC.md" "_archive/spec-history/MODULES_HOME_UNIFICATION/"
# (Don't move yet — executor is reading from this path)

# Move access-audit (historical input to module designs)
git mv "__LAUNCH_PLAN_DRAFT__/access-audit/"* "_archive/access-audit/" 2>&1
rmdir "__LAUNCH_PLAN_DRAFT__/access-audit/"

# Move supervisor-system (legacy notes from pre-skill era)
git mv "__LAUNCH_PLAN_DRAFT__/supervisor-system/"* "_archive/supervisor-system/" 2>&1
rmdir "__LAUNCH_PLAN_DRAFT__/supervisor-system/"

# Update _archive/README.md
# (Editor task — append the new subfolders to the README)

git add _archive/README.md
git commit -m "chore(archive): consolidate historical input + spec-history + supervisor legacy into _archive/"
git push origin develop
```

### Commit 6 — Update all references to `__LAUNCH_PLAN_DRAFT__/`

Use the grep output from §6 pre-flight to identify every file that references the old path. Update each:

```bash
# Likely files to update (verify against pre-flight grep output):
# - CLAUDE.md (§0.5 Root Discipline Rule + any other mentions)
# - MASTER_ROADMAP.md (§2.5 Architecture Briefs Status — paths)
# - docs/FILE_STRUCTURE.md
# - .claude/skills/opticup-architect/SKILL.md (First Action protocol)
# - .claude/skills/opticup-architect/references/decisions/M5.md, M6.md, M7.md, M8.md, M11.md, M12.md
# - Any README files inside the moved Brief folders (now in modules/) that self-reference

# Specific path rewrites:
# OLD: __LAUNCH_PLAN_DRAFT__/architecture-briefs/M5 - Customers/M5_CUSTOMERS_BRIEF.md
# NEW: modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md
# (and similarly for all 8 moved Briefs)

# OLD: __LAUNCH_PLAN_DRAFT__/handoffs/M12_HANDOFF.md
# NEW: modules/Module 12 - Communications/architecture-brief/M12_HANDOFF.md

# OLD: __LAUNCH_PLAN_DRAFT__/campaign-overseer/
# NEW: roles/campaign-overseer/

# OLD: __LAUNCH_PLAN_DRAFT__/site-overseer/
# NEW: roles/site-overseer/

# OLD: __LAUNCH_PLAN_DRAFT__/access-audit/ACCESS_AUDIT_REPORT.md
# NEW: _archive/access-audit/ACCESS_AUDIT_REPORT.md

# After all edits, verify NO remaining references except in archived files:
grep -rln "__LAUNCH_PLAN_DRAFT__" --include="*.md" --include="*.js" --include="*.html" --include="*.ts" . | grep -v "^\./_archive/"
# Expected: empty output

git add CLAUDE.md MASTER_ROADMAP.md docs/FILE_STRUCTURE.md \
        .claude/skills/opticup-architect/SKILL.md \
        .claude/skills/opticup-architect/references/decisions/
# Plus any other files identified in pre-flight grep
git commit -m "docs(refs): update all references to __LAUNCH_PLAN_DRAFT__/ → new homes (modules/, roles/, _archive/)"
git push origin develop
```

### Commit 7 — Update CLAUDE.md §0.5 Root Discipline Rule

The Root Discipline Rule must be updated to reflect the new structure:
- Remove `__LAUNCH_PLAN_DRAFT__/` from the allowed list.
- Add `roles/` to Category 2.
- Note that `MASTER_LIVE_PLAN.md` no longer exists (was deprecated in previous SPEC, now physically gone via §7 Commit 8 below).

```bash
# Edit CLAUDE.md §0.5:
# - Remove line: __LAUNCH_PLAN_DRAFT__/ (or its successor name) — pre-LIVE planning artifacts
# - Add line: roles/ — operational role artifacts (Campaign Overseer, Site Overseer, etc.)

git add CLAUDE.md
git commit -m "docs(rules): update §0.5 Root Discipline Rule — __LAUNCH_PLAN_DRAFT__/ retired, roles/ added"
git push origin develop
```

### Commit 8 — Final cleanup: remove `__LAUNCH_PLAN_DRAFT__/`

After Commits 1-7, `__LAUNCH_PLAN_DRAFT__/` should contain only:
- `README.md` (the planning README — now obsolete)
- `MASTER_LIVE_PLAN.md` (already deprecated in previous SPEC)
- This SPEC file itself: `architecture-briefs/MODULES_HOME_UNIFICATION_SPEC.md`
- An empty `architecture-briefs/` parent folder

```bash
# First archive the obsolete README + this SPEC
mkdir -p _archive/spec-history/MODULES_HOME_UNIFICATION/
git mv "__LAUNCH_PLAN_DRAFT__/architecture-briefs/MODULES_HOME_UNIFICATION_SPEC.md" "_archive/spec-history/MODULES_HOME_UNIFICATION/"

# Move the planning README (it described a folder that no longer exists)
git mv "__LAUNCH_PLAN_DRAFT__/README.md" "_archive/spec-history/MODULES_HOME_UNIFICATION/_LAUNCH_PLAN_DRAFT_README_HISTORICAL.md"

# Remove the deprecated MASTER_LIVE_PLAN.md (already had deprecation header)
git rm "__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md"

# Verify everything is gone:
ls -A __LAUNCH_PLAN_DRAFT__/
ls -A __LAUNCH_PLAN_DRAFT__/architecture-briefs/
# Both should be empty

# Remove the empty dirs:
rmdir __LAUNCH_PLAN_DRAFT__/architecture-briefs/
rmdir __LAUNCH_PLAN_DRAFT__/

# Verify:
ls -d __LAUNCH_PLAN_DRAFT__/  # expected: "No such file or directory"

git commit -m "chore(structure): retire __LAUNCH_PLAN_DRAFT__/ (One Home Per Module unification complete)"
git push origin develop
```

### Commit 9 — Final verification

```bash
# Integrity gate
npm run verify:integrity

# Confirm clean tree
git status --short

# Confirm no __LAUNCH_PLAN_DRAFT__ references remain (outside archive)
grep -rln "__LAUNCH_PLAN_DRAFT__" --include="*.md" --include="*.js" --include="*.html" --include="*.ts" . | grep -v "^\./_archive/"
# Expected: empty

# List final modules/ structure
ls modules/
```

No commit needed — verification only.

## §8 Out-of-Scope

- Module Close Ceremony for this SPEC — runs separately in Cowork after the executor reports complete.
- The 3 infrastructure protections (pre-commit hook, sentinel mission, bootstrap auto-check) — separate SPEC after this lands.
- Module 9 (Lab) — no Brief yet; will be created when its handoff arrives.
- Renaming `_archive/` substructure — its current shape is fine.
- Touching the existing 6 Module folders that are already under `modules/` (M1, M1.5, M2, M3, M3.1, M4).

## §9 Rollback Plan

Each commit is independently revertable. If anything fails:
1. Stop immediately.
2. Run `git status` + `git log -5 --oneline`.
3. `git revert HEAD` to undo the last commit.
4. Report exact failure state to Daniel.

The SPEC moves files but does not delete content (everything tracked is preserved in git history).

## §10 Open Questions for Daniel (answer BEFORE Commit 1)

**Q1 — `supervisor-system/` (legacy notes from pre-skill era): archive or keep as roles/?**
- Recommendation: ARCHIVE. The two files inside (SESSION_END_NOTES_2026_05_04.md, STRATEGIC_FLOW_UPDATE_2026_05_04.md) are session notes from before the skill existed. They're historical, not actively maintained.
- Decision: archive to `_archive/supervisor-system/`.

**Q2 — `access-audit/` (3 reports + ~80 data files about OpticPlus DB): archive or keep as input/?**
- Recommendation: ARCHIVE. These are completed audits that fed into all module designs. The Briefs reference them but no active session writes to them.
- Decision: archive to `_archive/access-audit/`.

**Q3 — Should `roles/` live at repo root, or inside `modules/`?**
- Recommendation: REPO ROOT. Roles are not modules — they're operational personas (Campaign Overseer manages active campaigns; Site Overseer monitors the marketing site). Putting them inside `modules/` would imply they're modules, which they're not.
- Decision: `roles/` at repo root.

**Q4 — Brief folders inside modules: name as `architecture-brief/` (singular) or `architecture-briefs/` (plural, matching old)?**
- Recommendation: SINGULAR. Each module has ONE brief. The plural was confusing in the old layout.
- Decision: `architecture-brief/` (singular).

If Daniel approves all 4 recommendations, no changes to SPEC needed. If any differs, update §7 accordingly.

## §11 Final State Verification (paste at end)

```
SPEC COMPLETE.
__LAUNCH_PLAN_DRAFT__/ exists: NO ✓
8 in-design modules now at modules/Module N - Name/architecture-brief/: ✓
M13 module home created (handoff only): ✓
roles/ created with campaign-overseer + site-overseer: ✓
_archive/spec-history/PROJECT_STRUCTURE_CLEANUP/ + MODULES_HOME_UNIFICATION/: ✓
_archive/access-audit/ + supervisor-system/: ✓
References to __LAUNCH_PLAN_DRAFT__/ remaining outside _archive/: 0 ✓
CLAUDE.md §0.5 updated: ✓
MASTER_ROADMAP.md §2.5 updated: ✓
docs/FILE_STRUCTURE.md updated: ✓
SKILL.md First Action updated: ✓
git status: clean ✓
verify:integrity: exit 0 ✓
```

---

*End of SPEC. Next step after execution: Cowork session runs Module Close Ceremony for this SPEC, then begins INFRASTRUCTURE_PROTECTIONS_SPEC (pre-commit hook, sentinel mission, bootstrap auto-check) on the new clean structure.*
