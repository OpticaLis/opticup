# Module Brief — MODULE_REPO_SPLIT

> **🟡 DRAFT — NOT DISPATCHED.** Authored 2026-05-15 prematurely. Repo split is a large
> architectural decision; should come after a strategic conversation with Daniel about
> Option A1-A4 trade-offs and timeline, NOT as a single one-shot Brief. Withheld.

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end — but a LONG one; budget 1-2 days)
**Branch:** `develop` on each repo. Daniel-only merge to main via PR after Pipeline closes 🟢.
**Pre-condition:** Phase 2 quartet of M1 closed 🟢 + merged. M1 fully landed.

---

## 1. Purpose

Until now, all Optic Up code (M1, M1.5, M2, M4, M3 storefront-side parts) lives in one repo: `opticalis/opticup`. Storefront is already separate (`opticalis/opticup-storefront`).

The single-repo model has worked because cross-module work is rare and shared infrastructure (`shared.js`, `auth-service.js`, `Modal`, design tokens) is in constant flux. But as we open **M7 (Orders) + M9 (Lab/KDS) in parallel**, the single-repo model becomes a bottleneck: every Pipeline contends for `develop`, every merge needs serialization, and the same files (`shared.js`, `js/auth-service.js`, design tokens) get touched concurrently — creating merge conflicts.

This SPEC executes the long-planned split (per `OPEN_TASKS.md` item #4). After this SPEC:

- One shared repo: **`opticup-shared`** — design tokens, `shared.js`, `auth-service.js`, generic components (Modal, Toast, TableBuilder), pin-auth EF, integrity-gate hooks, opticup-skills plugin.
- One repo per module: `opticup-m1-inventory`, `opticup-m2-platform`, `opticup-m4-crm`. Future: `opticup-m7-orders`, `opticup-m9-lab`, etc.
- Storefront unchanged: `opticup-storefront`.
- All module repos depend on `opticup-shared` via git submodule OR npm-style package OR a build-time copy (Module Strategist decides).

**Goal:** parallel Pipelines on M7 + M9 + future modules without git contention, while shared infrastructure stays single-sourced.

This is the most impactful infrastructure SPEC of the project. Get it right; it can't be unwound easily.

---

## 2. Scope — In

### Phase A — Repo design + dependency model

The first decision the SPEC author makes: how do module repos consume `opticup-shared`?

**Option A1 — Git submodules.** Each module repo has `shared/` as a submodule pointing to `opticup-shared`. Pros: simple, git-native, no build step. Cons: submodule UX is famously fragile; updates require explicit submodule fetch.

**Option A2 — npm package.** `opticup-shared` published as private npm package; each module repo installs it via `npm install` + version-pinning in `package.json`. Pros: clean version isolation; standard tooling. Cons: requires npm registry (GitHub Packages or private registry); requires build step.

**Option A3 — Build-time copy.** A script in each module repo's `prepare` / `predeploy` step pulls `opticup-shared` files into a local `shared/` folder. Pros: zero runtime deps; simple. Cons: copies easily go out-of-date; merge UX is awkward when multiple devs modify shared.

**Option A4 — Monorepo with workspace tooling (pnpm / yarn / npm workspaces).** Keep one repo but split into packages. Pros: best DX. Cons: doesn't actually solve the parallel-Pipeline problem (same repo = same `develop`).

*Architect recommendation: A2 (npm package via GitHub Packages).* Industry standard; clean separation; version-pinning prevents accidental breakage. The bootstrap cost is real (~half-day to set up GitHub Packages + auth) but pays back forever.

**Module Strategist may override** based on probes — e.g., if GitHub Pages deploy chain doesn't play well with npm dependencies for vanilla-JS pages, Option A1 may win.

### Phase B — Catalog of "shared" code

The SPEC author **lists every file** in the current `opticup` repo that needs to migrate to `opticup-shared`. At minimum:

- `js/shared.js` (DB wrappers, T-constants, FIELD_MAP)
- `js/shared-field-map.js`
- `js/auth-service.js` (PIN flow, hasPermission, refreshPermissions)
- `js/init.js` (session bootstrap)
- `shared/components/` (Modal, Toast, PIN-modal, TableBuilder, tenant-header, etc.)
- `shared/css/variables.css` (design tokens — Hybrid+Navy palette)
- `css/styles.css` (only the parts that aren't module-specific)
- `supabase/functions/pin-auth/`
- `supabase/functions/submit-lead/` (storefront-facing)
- `scripts/verify.mjs` + `scripts/checks/*` (integrity-gate hooks)
- `scripts/audit/advisors-for-objects.mjs` (recently shipped in Harvest)
- `.claude/skills/` (all skills including opticup-architect, executor, strategic, etc.)
- `opticup-skills.plugin` (the plugin manifest)
- `migrations/` (legacy — kept for reference)
- `supabase/migrations/` (versioned migrations — Module Strategist decides if these stay in shared or in M1 repo since most are M1-specific)

For each file, classify:
- **Definitely shared** — used by ≥ 2 modules.
- **Module-specific** — belongs to one module repo.
- **Ambiguous** — Module Strategist decides + documents.

The catalog goes into SPEC §0 — must be exhaustive.

### Phase C — Repo creation + initial setup

The SPEC author plans the creation order:

1. Create `opticup-shared` on GitHub (private, under `opticalis` org).
2. Copy all shared files in (with full git history if feasible via `git filter-repo`).
3. Set up `package.json` (if A2), `.github/workflows/publish.yml` to auto-publish on tag, README.
4. Set up GitHub Packages credentials.
5. Create `opticup-m1-inventory` repo.
6. Copy all M1-specific files (modules/Module 1, modules/Module 1.5 if it stays in M1 repo OR splits separately, M1 HTML pages, M1 sub-folders).
7. Set up dependency on `opticup-shared` per chosen Option.
8. Repeat for `opticup-m2-platform`, `opticup-m4-crm`.
9. **Archive** the original `opticalis/opticup` repo with a README pointing to the new repos.

Module Strategist confirms the order via §6 probes — the actual file layout may require adjustments.

### Phase D — CI/CD migration

Each module repo gets its own:
- GitHub Actions workflow that runs `verify.mjs --full` + `schema-diff.mjs` + tests.
- Deployment target (M1 → likely GitHub Pages or Vercel; M4 → same; storefront stays Vercel).

Module Strategist verifies the deployment target before split; the old `opticalis/opticup` GitHub Pages deployment may need to stay live for `index.html` + the landing/login pages until those are split too.

### Phase E — Migration steps

For each split:
1. `git clone --no-tags` the original repo.
2. `git filter-repo --paths-from-file <module-paths.txt>` to extract module-specific files with history.
3. Create new repo on GitHub.
4. Push extracted history.
5. In the new repo: add `package.json` (if A2), wire deps, add CI.
6. Verify a smoke run of the module's existing screens still loads + functions.

**Critical:** the original repo isn't deleted. It's archived. Cross-references in old SPECs / docs may still point to file paths in the old repo — those are kept for historical accuracy + redirect notes.

### Phase F — Skills + plugin distribution

The `.claude/skills/` folder + `opticup-skills.plugin` currently live in the ERP repo. After the split:
- They move to `opticup-shared` (since all module Pipelines need them).
- Each module repo's `.claude/skills` becomes a symlink OR a git submodule pointer (Option A1 territory).
- OR: every module repo bundles a copy at split-time + auto-syncs from `opticup-shared` on Pipeline bootstrap (Option A3 territory).

*Architect recommendation: submodule under each module repo's `.claude/skills`* — skills must be loadable by Claude Code regardless of the dependency model chosen for runtime code. This avoids the "npm install before skill loads" chicken-and-egg.

### Functional smoke (mandatory before close)

**This is the largest functional smoke in any SPEC so far.** Verify EVERYTHING still works post-split.

1. `opticup-shared` published successfully + reachable.
2. `opticup-m1-inventory` clones + builds + deploys to its target (URL TBD).
3. Each of the 6 Phase 1B screens loads on the new M1 deploy with proper permissions.
4. `opticup-m4-crm` clones + builds + deploys + CRM smoke 7/7 PASS (the existing baseline).
5. `opticup-m2-platform` clones + builds + deploys.
6. `opticup-shared` version bump → propagates correctly to M1 + M4 + M2 via dependency mechanism.
7. `opticup-storefront` unaffected — its existing deploy + smoke tests pass.
8. Pipeline running on M1 develop + Pipeline running on M4 develop simultaneously — no conflicts.
9. Skill loading works in each module repo (Claude Code can `opticup-strategic` etc.).
10. Iron-Rule gates (`verify.mjs --staged`) run correctly in each module repo.
11. Old `opticalis/opticup` repo archived with redirect README.
12. Cross-references in docs are either updated OR explicitly marked "see <archived repo>".

Capture in TEST_REPORT.md. **No 🟢 without 12/12.**

---

## 3. Scope — Out

- **M7 / M9 repo creation.** Those modules don't have code yet. Their repos get created when they start (next phase, not this one).
- **Storefront migration.** It's already a separate repo.
- **Public open-sourcing.** All repos stay private under `opticalis` org.
- **Migrating to a different git host.** GitHub only.
- **CI/CD overhaul beyond what's necessary** for split.
- **Rewriting `shared.js` / `auth-service.js` etc.** Move-and-publish only, no refactoring.
- **`MASTER_ROADMAP` / `OPEN_TASKS` / `TECH_DEBT`** — keep in the M1 repo for now (since they're authored by Architect; future Architect-only repo decision later).
- **Sentinel / Guardian** — those live in the project's `docs/guardian/`; stay in M1 repo or move to `opticup-shared` (Module Strategist decides).
- **Roles operational files** (`roles/`) — stay where they are or move to `opticup-shared` (Module Strategist decides).
- **The `_archive/` folder.** Stays in original repo when archived.
- **Cleaning up legacy frames-era files.** Out-of-scope.
- **Plugin marketplace publishing.** `opticup-skills.plugin` stays private.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Split now, before M7+M9 start | Daniel 2026-05-15 |
| 2 | Architect recommends Option A2 (npm via GitHub Packages); Module Strategist may override with evidence | Architect |
| 3 | Skills live in `opticup-shared` + submodule into each module repo | Architect — claude-code skill loading needs |
| 4 | Original repo archived, not deleted | Architect — historical reference |
| 5 | Storefront unchanged | Project decision |
| 6 | All migration via `git filter-repo` preserving history | Architect — auditability |
| 7 | Pipeline runs on `develop` of each repo; merge to main is per-repo Daniel-only | Project policy |
| 8 | Iron Rule 32 §7 — declare exactly which destructive ops will run (archive + history rewrite) | Iron Rule 32 |
| 9 | Single LONG Pipeline run for all phases A-F | Architect — coherent execution |

---

## 5. Success Criteria

1. **`opticup-shared` repo exists** + has version-tagged release.
2. **`opticup-m1-inventory` repo exists** + builds + deploys.
3. **`opticup-m2-platform` repo exists** + builds.
4. **`opticup-m4-crm` repo exists** + builds + deploys.
5. **Each module repo depends on `opticup-shared`** via the chosen option (A1-A4).
6. **Dependency mechanism verified working** — bumping `opticup-shared` reaches the modules.
7. **All 6 M1 Phase 1B screens load** on the new M1 deploy + work with proper permissions.
8. **CRM smoke 7/7 PASS** on the new M4 deploy.
9. **Storefront baseline tests PASS** (unchanged repo).
10. **GitHub Actions workflows run** on each module repo (verify.mjs + schema-diff + tests).
11. **Skills load correctly** in Claude Code from each module repo.
12. **Pipeline runs concurrently** on M1 + M4 develop without conflicts (functional test).
13. **Original `opticalis/opticup` repo archived** with README pointing to splits.
14. **All cross-references in living docs** (CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT) updated to point to correct new repo paths.
15. **No data loss** — every git commit, every file, every history line preserved across the split.
16. **Smoke 12/12 PASS.** Captured in TEST_REPORT.md.
17. **Iron Rule 32 §7** — destructive ops declared explicitly + honored.
18. **Iron Rules 31** — gate clean on each repo.
19. **Documentation updated** — `CLAUDE.md` reflects new repo structure; per-module README in each new repo.
20. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** inside the SPEC folder.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Inherits MANDATORY §0 audits.

```bash
# Probe 1: full file inventory of the current repo
git ls-files | sort

# Probe 2: cross-module dependency graph
# Find every file in modules/Module N - .../ that imports / requires / references files in shared/, js/, or other modules
grep -rn "import\|require\|src=\"shared\|src=\"js" modules/ --include="*.js" --include="*.html" | head -100

# Probe 3: file count per top-level dir
find . -type f -not -path "./.git/*" -not -path "./node_modules/*" | awk -F'/' '{print $2}' | sort | uniq -c | sort -rn | head -20

# Probe 4: existing GitHub Pages config
ls -la .github/ CNAME .nojekyll 2>/dev/null

# Probe 5: any other deploy mechanism in play?
grep -rn "deploy\|github-pages\|vercel\|netlify" .github/workflows/ 2>/dev/null | head -10

# Probe 6: package.json shape
cat package.json

# Probe 7: any existing private package config?
ls .npmrc 2>/dev/null

# Probe 8: GitHub Packages availability / org permissions
# (manual check by Daniel — does opticalis org have packages enabled?)
```

Pin every result. The probes inform Option A1-A4 choice + the file catalog.

---

## 7. Iron Rules in Sharp Focus

- **Rule 6** — `index.html` stays at root of each module repo OR moves to a "landing" repo (Module Strategist decides; if moves, document).
- **Rule 12** — file size unchanged.
- **Rule 21** — no duplicates; `shared.js` becomes single-sourced.
- **Rule 31** — integrity gate runs in each new repo.
- **Rule 32** — Destructive Operations declared explicitly: (a) `git filter-repo` rewrites history (declared); (b) original repo archived (declared); (c) NO file deletes from original repo, just archive flag.

---

## 8. Anti-Patterns

- **Authoring blind.** §6 first — file catalog must be exhaustive.
- **Refactoring shared code during split.** No code changes; move-only. Refactor is its own SPEC.
- **Skipping CI/CD verification on each new repo.** Pipelines must run before split is called done.
- **Force-pushing to original repo.** Archive, don't rewrite.
- **Skipping the "shared updates propagate" test.** A2/A3 mechanism is meaningless without proof.
- **Mixing claude-skill submodule with code dependency.** Skills load via Claude Code at session start; runtime deps load via package manager. Different mechanisms; don't conflate.
- **Migrating storefront in this SPEC.** Already separate; out-of-scope.
- **Creating M7/M9 repos preemptively.** Wait until those modules start.

---

## 9. Open Questions for the Module Strategist

1. **Option A1, A2, A3, or A4?**
*Recommendation: A2.* Probes confirm GitHub Packages works for the org.

2. **`modules/Module 1.5 - Shared Components/` — where does it go?**
*Recommendation: contents distribute — generic stuff (Modal, Toast, etc.) to `opticup-shared`; the few M1.5-specific docs stay with M1.* The "Module 1.5" abstraction may not survive the split as a module.

3. **`MASTER_ROADMAP` / `OPEN_TASKS` / `TECH_DEBT` location post-split?**
*Recommendation: stay in M1 repo Day-1.* Future Architect-only repo decision later if needed.

4. **`docs/guardian/` (Sentinel reports)?**
*Recommendation: stay in M1 repo.* Sentinel reads code; the reports themselves are M1-archive material.

5. **`roles/` operational files?**
*Recommendation: stay in M1 repo.* They are operational, not module-specific.

6. **CLAUDE.md — one per repo or one central + symlinks?**
*Recommendation: one per repo.* Each module has slightly different needs; symlinks brittle. Some content repeats; that's OK.

7. **`.git/index` repair on the source VM mid-Pipeline?**
*Recommendation: ignore; Pipeline runs from a fresh `git clone`.*

8. **Migration order — shared first or modules first?**
*Recommendation: shared first.* All modules depend on it.

9. **`scripts/audit/advisors-for-objects.mjs` (Harvest output) — shared?**
*Recommendation: yes, to `opticup-shared`.* Every module Pipeline can call it.

10. **`supabase/migrations/` — which repo?**
*Recommendation: split per-module by file content* (each migration file is module-specific). `opticup-shared` gets none.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `OPEN_TASKS.md` item #4 | Original plan for this SPEC |
| `CLAUDE.md` §0.5 Root Discipline Rule | Each new repo will need its own root rule |
| `MASTER_ROADMAP.md` | Reflects post-split state |
| `js/shared.js`, `js/auth-service.js`, `js/init.js` | Core shared code |
| `shared/components/`, `shared/css/` | Shared UI infrastructure |
| `.claude/skills/`, `opticup-skills.plugin` | Skill distribution |
| `scripts/verify.mjs`, `scripts/checks/`, `scripts/audit/` | Pipeline infrastructure |
| `supabase/functions/` (EF list) | EF distribution |
| `.github/workflows/` | CI/CD reference |
| `package.json` + `package-lock.json` | Existing dependency baseline |

---

## 11. Hand-off Note

Full Auto Pipeline. The most ambitious infrastructure SPEC of the project.

Pipeline order:
1. `opticup-strategic` reads Brief end-to-end + runs §6 probes + builds the file catalog + decides Option A1-A4.
2. Authors `SPEC.md` inside `modules/Module 1.5 - Shared Components/docs/specs/MODULE_REPO_SPLIT/` (the new repo structure for SPEC folders TBD post-split — Day-1 lives in current repo).
3. Hand-off to `opticup-executor`.
4. Executor creates repos + filter-repo history extraction + dependency wiring + CI setup + migration.
5. **Mandatory functional smoke** (12 steps).
6. Executor writes EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION.md (Applied Log).
7. `opticup-reviewer` re-runs criteria + spot-checks each new repo.
8. `opticup-strategic` Foreman-reviews + writes FOREMAN_REVIEW.md.
9. ONE Hebrew status line to Daniel.

After 🟢: Daniel merges per-repo. **M7 + M9 Pipelines can now run in parallel on their own future repos.** Module 1 Close Ceremony runs (closes the M1 era).

This SPEC may need 1-2 days end-to-end. Budget accordingly.

---

*End of Brief. Repo split. After this lands, parallel Pipelines on multiple modules become reality. Pre-LIVE foundation work.*
