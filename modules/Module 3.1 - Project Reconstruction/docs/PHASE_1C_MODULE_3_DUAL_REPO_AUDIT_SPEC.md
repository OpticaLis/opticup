# Phase 1C — Module 3 Dual-Repo Audit (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 1C (parallel with 1A and 1B)
> **Status:** ⬜ Not started
> **Execution mode:** READ-ONLY audit
> **Estimated time:** 60-120 minutes (one or two long Claude Code runs)
> **Risk level:** ZERO — no file modifications, no DB writes, no commits beyond report file
> **Repos:** **TWO** — `opticup` (ERP side of Module 3) **AND** `opticup-storefront` (Storefront side of Module 3)

---

## 1. Goal

Produce a single audit report on the **documentation of Module 3 (Storefront)** as it exists across **both repos**: the parts that live in `opticup\modules\Module 3 - Storefront\` (the Studio admin UI side) and the parts that live throughout `opticup-storefront\` (the actual storefront codebase plus its docs).

Module 3 is the reason Module 3.1 exists. It is the messiest module by far. Its documentation is split between two repos with no clear ownership rule, parts of it ran under an "autonomous mode" execution model that was later abandoned, parts ran under a hotfix/Phase A/Phase B remediation pattern, and the original `MODULE_3_ROADMAP.md` from March 2026 describes 8 phases as "not started" while the actual reality involves dozens of completed commits. **The gap between Module 3's docs and its reality is the largest in the project.**

This phase answers: **"What does Module 3's documentation actually look like across both repos, what's the real state of Module 3, and what's the cleanup plan?"**

This phase is the most important of the three. The other two phases are sanity checks. This one is the actual diagnosis.

---

## 2. Safety Rules — NON-NEGOTIABLE

1. **READ-ONLY across both repos.** No file modifications inside scope.
2. **NEVER** touch `main` in either repo. All work on `develop` (or whatever the active branch is — `git pull` it).
3. **NEVER** modify any documentation file in scope.
4. **NEVER** modify code files. This audit is documentation-only.
5. **NEVER** modify the WordPress site or production storefront — this is purely local audit work.
6. **NEVER** trigger Vercel deploys (don't push to branches that deploy).
7. The ONLY files you may CREATE are:
   - The audit report (one file, see §6)
   - Your phase's SESSION_CONTEXT file (`SESSION_CONTEXT_PHASE_1C.md`)
8. Both files live in the **`opticup` repo** under Module 3.1's folder, NOT in the storefront repo. Keep all Module 3.1 outputs in one place.
9. Commit allowed (optional): single commit on `opticup`'s `develop`, message `docs(M3.1): Phase 1C module 3 dual-repo audit report`.

---

## 3. Scope Paths

### Side A — `opticup` repo (ERP side of Module 3)

```
modules/Module 3 - Storefront/
  ├── ROADMAP.md
  ├── MODULE_3_ROADMAP.md            (if exists separately)
  ├── docs/
  │   ├── SESSION_CONTEXT.md
  │   ├── MODULE_MAP.md
  │   ├── MODULE_SPEC.md
  │   ├── CHANGELOG.md
  │   ├── db-schema.sql
  │   ├── PHASE_*_SPEC.md             (any phase SPECs that exist)
  │   ├── current prompt/             (folder — list contents, audit any .md)
  │   ├── old prompts/                (folder — DO NOT read every file. Sample 3-5 most recent. Note total count and date range.)
  │   └── (any other .md files)
  └── (any other top-level .md files in this folder)
```

### Side B — `opticup-storefront` repo (entire repo's documentation)

```
opticup-storefront/
  ├── CLAUDE.md                       ← project rules for storefront, Iron Rules 24-30
  ├── README.md
  ├── ROADMAP.md                      (if exists)
  ├── docs/
  │   ├── all .md files
  │   ├── SCHEMAS.md, CMS_REFERENCE.md, ARCHITECTURE.md, VIEW_CONTRACTS.md, FROZEN_FILES.md
  │   │   (per project memory — verify which exist)
  │   ├── QUALITY_GATES.md
  │   ├── DISCOVERY-*.md              (discovery reports from previous phases)
  │   ├── PHASE_*.md                  (any phase reports/specs)
  │   └── (any other .md files including subdirectories)
  └── package.json                    (read for version/scripts info only)
```

### Discovery requirement

Both repos need `ls -R` (or equivalent) of their documentation areas. The strategic chat is operating from project memory and doesn't have ground truth on which files actually exist. **Verify everything before reading.**

### Out of scope (do NOT touch)

- Foundation files in `opticup` (`docs/`, root `*.md`) — Phase 1A
- Modules 1, 1.5, 2 in `opticup` — Phase 1B
- All code files in both repos (`.js`, `.html`, `.css`, `.ts`, `.astro`, `.tsx`, `.jsx`, `.sql` migration scripts)
- `node_modules/`, `.git/`, `dist/`, `.vercel/`, `.next/`
- `opticup-storefront/src/` code subdirectories — only `docs/` and root .md files matter
- Backup folders (note their existence and size, don't read)

### Edge cases

- **`current prompt/` folder:** these are active prompts. Read them — they show what's currently in flight.
- **`old prompts/` folder:** could be huge. **Sample only**: read the 5 most recent by date, count the total, note the earliest and latest dates, list all filenames in Inventory but don't read all contents. The samples are enough to understand the pattern.
- **DISCOVERY-*.md files:** if present, these are previous audit reports from Module 3's own remediation work. Read all of them — they're high signal.
- **`opticup-storefront/CLAUDE.md`:** in scope. This contains Iron Rules 24-30 per project memory and is the storefront's constitution.

---

## 4. Special Considerations — Module 3 Audit (this is the heart of Module 3.1)

### The split-repo problem

Module 3's documentation is split across two repos with no documented ownership rule. This audit must produce a clear answer to: **"Which Module 3 docs belong on which side?"** This is Recommendation #1 territory.

For each file in scope, ask: does it describe ERP-side concerns (Studio UI, admin actions, sync from inventory), storefront-side concerns (Astro pages, Vercel deploy, public-facing UI), or both? Tag each in Status per File. If a file in `opticup` is mostly about storefront concerns, that's a candidate for relocation. If a file in `opticup-storefront` references ERP internals heavily, same thing.

### The "autonomous mode" legacy

`MODULE_3_ROADMAP.md` was written assuming "autonomous mode" execution. That model was abandoned. The roadmap therefore describes 8 phases that never happened in the form described, but a different set of phases (hotfix → Phase A → Phase B) that DID happen and isn't in the roadmap. **Map this gap precisely.** Section 4 (Outdated content) of your report should be exhaustive on `MODULE_3_ROADMAP.md`.

### Hotfix and Phase A/B reality

Per project memory:
- A "hotfix" of Module 3 was completed (10 commits)
- "Phase A" was completed (10 commits)
- "Phase B" is blocked (waiting on Module 3.1)

If you find any documentation of these (in CHANGELOG, SESSION_CONTEXT, DISCOVERY reports, prompt archives) — that's the real history of Module 3. Note where it lives. The rewrite phase will need to consolidate this into a real ROADMAP.

### Iron Rules 24-30 location

Project memory says Iron Rules 24-30 live in `opticup-storefront/CLAUDE.md`. **Verify this.** If they're missing or partially present, that's a major finding. If `opticup/CLAUDE.md` references them but they're only in the storefront repo, note the cross-repo dependency.

### CMS / Studio reference docs

Project memory mentions CMS_REFERENCE.md, SCHEMAS.md, ARCHITECTURE.md, VIEW_CONTRACTS.md, FROZEN_FILES.md. These were extracted out of CLAUDE.md to keep it lean. Verify each exists, has content, and is internally consistent.

### View contracts (CRITICAL for the project)

Per project memory, there's a strict rule about not modifying view WHERE clauses without approval, and `v_storefront_products` has an "EXACT images subquery as a golden reference." If `VIEW_CONTRACTS.md` exists, read it carefully and note whether it actually contains the golden reference or just refers to it. Discrepancies here are high-priority `FLAG-FOR-DECISION`.

### Active vs deprecated

Module 3's docs likely contain a mix of active rules and deprecated approaches (the "autonomous mode" stuff is one example). For each major doc file, try to assess: is this still operational, or is it residue? Use the SUSPECT label generously here.

### DNS switch readiness

The project is approximately 95% ready for DNS switch. If documentation exists about the DNS switch plan, redirects, EN/RU subdomain migration, brand translations, etc. — note their state. They're operationally critical and any staleness in them is high-impact.

---

## 5. Required Output: 7-Section Audit Report

Your report MUST follow the 7-section format defined in `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` §8. No deviations.

**Specific guidance for Phase 1C:**

- **Section 1 (Inventory):** Two top-level groups: `### Side A — opticup repo (Module 3 folder)` and `### Side B — opticup-storefront repo`. Within each, table of files. Plus a separate sub-table for `current prompt/` and a noted-only count for `old prompts/`.
- **Section 2 (Status per file):** Use 5 status labels PLUS an additional tag per file: `[ERP-side]`, `[STOREFRONT-side]`, or `[BOTH]`. This drives the relocation recommendations.
- **Section 3 (Discrepancies):** Three sub-sections:
  - Within `opticup` (Module 3 folder file-vs-file)
  - Within `opticup-storefront` (file-vs-file)
  - **Cross-repo discrepancies** — where the two sides describe the same thing differently. **This is the highest-value sub-section in the entire Module 3.1 audit.** Be exhaustive.
- **Section 4 (Outdated content):** Likely the largest section across all 3 reports. `MODULE_3_ROADMAP.md` alone may produce 30+ entries. The "autonomous mode" story alone may produce 10+. Be thorough.
- **Section 5 (Missing):** Especially: phases mentioned in CHANGELOG/commits/memory but lacking SPEC files. The hotfix and Phase A/B are key suspects.
- **Section 6 (Cross-references):** Note every reference from Module 3 docs to: Modules 1/1.5/2 (Phase 1B's scope), foundation docs (Phase 1A's scope), database tables, views, RPCs.
- **Section 7 (Recommendations):** Likely 8-15 entries. MUST include:
  - At least one REWRITE for `MODULE_3_ROADMAP.md`
  - At least one MOVE recommendation if any files appear to be in the wrong repo
  - At least one MERGE/SPLIT if you find duplicated information or files that have grown too big
  - The relocation rule recommendation: a clear principle like "ERP-side docs live in `opticup`, Storefront-side docs live in `opticup-storefront`, with [exceptions]"
  - DNS-switch-related findings, if any

---

## 6. Output File Locations

```
modules/Module 3.1 - Project Reconstruction/
├── docs/
│   ├── audit-reports/
│   │   └── PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md   ← THE REPORT
│   └── SESSION_CONTEXT_PHASE_1C.md                        ← YOUR PROGRESS FILE
```

Both files live in the **`opticup` repo** under Module 3.1's folder. Even though you're auditing both repos, all Module 3.1 outputs go to one place — the `opticup` repo's Module 3.1 folder.

If `audit-reports/` does not exist, create it with `mkdir -p`. If Phase 1A or 1B already created it, no problem.

---

## 7. Step-by-Step Execution Plan

This phase needs the most careful execution because of the dual-repo nature. The secondary chat should turn this into ONE comprehensive Claude Code prompt.

### Step 1 — Setup verification (BOTH repos)
- First Action Protocol (machine, branch)
- Verify `opticup` location, `cd` into it, `git pull origin develop`
- Verify `opticup-storefront` location, `cd` into it, `git pull origin develop` (or whatever branch)
- Return to `opticup` for output file creation
- `mkdir -p "modules/Module 3.1 - Project Reconstruction/docs/audit-reports"`

### Step 2 — Discovery (BOTH sides)
- Side A: `ls -la "modules/Module 3 - Storefront/"`, then `ls -la` of `docs/`, `current prompt/`, `old prompts/`
- Side B: switch to storefront repo, `ls -la` of root, `ls -la docs/` (recursive if subdirs exist)
- Print verified file lists for both sides

### Step 3 — Read Side A (opticup, Module 3 folder)
- Read all docs/*.md files in full
- Read all current prompt/*.md files
- Sample 3-5 most recent old prompts/*.md (read in full), count the rest
- Note any files not yet seen

### Step 4 — Read Side B (opticup-storefront)
- Read CLAUDE.md, README.md in full
- Read all docs/*.md files
- Read package.json (just for high-level info, not deps)
- Note any subdirectories of docs/

### Step 5 — Cross-side comparison
- For every concept that appears in both sides (e.g., view contracts, image proxy, DNS switch, brand display modes): compare what each side says
- Flag any mismatches into Section 3 cross-repo sub-section
- Note any concept that should appear in both but only appears in one

### Step 6 — Specific deep-dives
- `MODULE_3_ROADMAP.md`: full outdated-content analysis, line-by-line where stale
- `CLAUDE.md` (storefront): verify Rules 24-30 actually present and consistent with `opticup/CLAUDE.md`
- `VIEW_CONTRACTS.md` if exists: check for golden references, esp. `v_storefront_products` images subquery
- DISCOVERY-*.md files: extract their findings into Cross-references for context

### Step 7 — Write the report
- Create `PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md`
- All 7 sections, with Side A / Side B grouping where the template says
- Length target: 600-900 lines (this will be the longest report)
- Be liberal with line citations

### Step 8 — Write SESSION_CONTEXT_PHASE_1C.md
- Status, dates, file count per side, report path, top 5 findings, time spent, dual-repo gotchas encountered

### Step 9 — Verification + handback
- `ls -la` of created files
- Print first 30 lines of report
- One-line summary: `Phase 1C complete. [Na] files Side A, [Nb] files Side B. [M] cross-repo discrepancies. [K] recommendations.`
- Optional: single commit to `develop` on `opticup` only. Do NOT commit anything in `opticup-storefront`.

---

## 8. Verification Checklist

- [ ] Both output files exist in `opticup` repo at the correct paths
- [ ] Report has all 7 sections, none skipped
- [ ] Inventory grouped by Side A / Side B
- [ ] Status per File entries tagged with [ERP-side] / [STOREFRONT-side] / [BOTH]
- [ ] Section 3 has a "Cross-repo discrepancies" sub-section
- [ ] Section 4 has at least 10 entries for `MODULE_3_ROADMAP.md` if that file exists and is stale
- [ ] Section 7 includes a clear file-relocation principle
- [ ] No code files were read or modified in either repo
- [ ] No file outside scope was touched in either repo (`git status` clean in both repos except for the two new files in `opticup`)
- [ ] No commit in `opticup-storefront`. No push to main in either repo.
- [ ] SESSION_CONTEXT_PHASE_1C.md filled
- [ ] One-line summary sent to Daniel

---

## 9. What Happens After Phase 1C

Phase 1C's report is the **primary input** to Phase 2 of Module 3.1. The synthesis phase will rely on this report more heavily than on 1A or 1B because Module 3 is where all the actual mess is. The recommendations in this report largely become the work plan for Phase 2.

The relocation principle that Phase 1C recommends will become a project-wide rule applied to every future module that touches both repos.

---

## End of SPEC

**This SPEC is the contract for Phase 1C, the most important of the three audits.** Take the time it needs. Quality over speed.
