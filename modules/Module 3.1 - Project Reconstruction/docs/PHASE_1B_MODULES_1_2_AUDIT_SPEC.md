# Phase 1B — Modules 1, 1.5, 2 Audit (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 1B (parallel with 1A and 1C)
> **Status:** ⬜ Not started
> **Execution mode:** READ-ONLY audit
> **Estimated time:** 45-90 minutes (one long Claude Code run, possibly two)
> **Risk level:** ZERO — no file modifications, no DB writes, no commits beyond report file
> **Repo:** `opticup` (single repo)

---

## 1. Goal

Produce a single audit report on the **documentation of Modules 1, 1.5, and 2** in the `opticup` repo. These three modules are the "completed past" of the project — Module 1 (Inventory) and 1.5 (Shared Components) and 2 (Platform Admin) are all marked as done according to project memory.

The strategic chat **suspects** these modules' documentation is in good shape (Module 2 was the last module to run under the old, well-disciplined documentation pattern, before Module 3 broke that pattern). But "suspects" is not "knows." This audit either confirms the assumption or surfaces what's broken.

This phase answers: **"Are the docs of Modules 1, 1.5, 2 actually as healthy as we think? What needs touching, and what's safe to leave alone?"**

---

## 2. Safety Rules — NON-NEGOTIABLE

1. **READ-ONLY.** No file modifications inside scope.
2. **NEVER** touch `main`. All work on `develop`.
3. **NEVER** modify any documentation file in scope. They are the audit subject, not its target.
4. **NEVER** modify code files (`.js`, `.html`, `.css`, `.sql`) in any module — even read-only opening of those is out of scope here. This audit is about **documentation**, not code.
5. The ONLY files you may CREATE are:
   - The audit report (one file, see §6)
   - Your phase's SESSION_CONTEXT file (`SESSION_CONTEXT_PHASE_1B.md`)
6. Commit allowed (optional): single commit to `develop` only, message `docs(M3.1): Phase 1B modules 1-2 audit report`.
7. If you spot a code-level issue while reading documentation (e.g., a doc says a function exists that you happen to know doesn't): note it in Recommendations as `FLAG-FOR-DECISION`. Do not investigate the code.

---

## 3. Scope Paths

Phase 1B covers the documentation folders of Modules 1, 1.5, and 2 in the `opticup` repo. **All paths are relative to the repo root.**

### Required scope

```
modules/Module 1 - Inventory Management/
  ├── ROADMAP.md
  └── docs/
      ├── SESSION_CONTEXT.md
      ├── MODULE_MAP.md
      ├── MODULE_SPEC.md
      ├── CHANGELOG.md
      ├── db-schema.sql
      └── (any PHASE_*_SPEC.md files)

modules/Module 1.5 - Shared Components/    (or similar — exact name TBD by ls)
  ├── ROADMAP.md
  └── docs/
      ├── SESSION_CONTEXT.md
      ├── MODULE_MAP.md
      ├── MODULE_SPEC.md
      ├── CHANGELOG.md
      ├── db-schema.sql
      └── (any PHASE_*_SPEC.md files)

modules/Module 2 - Platform Admin/
  ├── ROADMAP.md
  ├── MODULE_2_SECONDARY_CHAT_TEMPLATE.md   (if exists at this level)
  └── docs/
      ├── SESSION_CONTEXT.md
      ├── MODULE_MAP.md
      ├── MODULE_SPEC.md
      ├── CHANGELOG.md
      ├── db-schema.sql
      └── (any PHASE_*_SPEC.md files)
```

### Discovery requirement

The exact folder names for Modules 1, 1.5, and 2 may differ slightly from the above (the strategic chat is going on convention, not direct verification). The **first action** is `ls modules/` to get the actual folder names, then `ls` each one to get the actual file list. Audit only files that exist.

### Out of scope (do NOT touch)

- All foundation files (`docs/`, root `*.md`) — that's Phase 1A
- Module 3 — that's Phase 1C
- All code files (`.js`, `.html`, `.css`, `.ts`, `.astro`)
- SQL files **except** `db-schema.sql` of each module (those are documentation, not migration scripts)
- `node_modules/`, `.git/`, backups, archives
- The `opticup-storefront` repo entirely

### Edge cases — what counts as in-scope

- `MODULE_2_SECONDARY_CHAT_TEMPLATE.md` is in scope IF it lives inside the Module 2 folder. If it lives at the repo root, it's Phase 1A's responsibility.
- Old phase SPECs (PHASE_0_SPEC.md, PHASE_1_SPEC.md, etc.) inside `Module N/docs/` are in scope. They show how the module evolved.
- `backups/` folders inside a module: out of scope. Note their existence and size in Inventory but don't read contents.

---

## 4. Special Considerations — Modules 1, 1.5, 2 Audit

### The "stable past" assumption

The strategic chat's working hypothesis is that these modules' docs are stable. **Validate or refute this loudly.** If Phase 1B comes back with "all green, nothing to fix" — that's a strong signal we can leave Modules 1-2 alone in Phase 2 and focus exclusively on Module 3 cleanup. If 1B finds problems, those problems become part of the rewrite plan.

Be specific in the Summary: end with one of these verdicts:
- **GREEN:** Modules 1-2 docs are healthy. No rewrite needed in Phase 2.
- **YELLOW:** Minor cleanups needed. List them.
- **RED:** Significant doc rot. Modules 1-2 need their own rewrite pass.

### Module 1 vs Module 1.5 — likely conflated docs

Module 1.5 (Shared Components) was a refactor that touched Module 1 heavily. Watch for:
- Functions/components that exist in Module 1's MODULE_MAP but should now be in 1.5's
- `db-schema.sql` of Module 1 referencing tables that ended up under 1.5
- ROADMAP.md of either module mentioning the other in confusing ways
- Duplicate or contradictory entries between the two

### MODULE_MAP vs reality

Per project memory, Module 1 has 113+ JS files and 49+ DB tables. If `MODULE_MAP.md` claims something dramatically different (e.g., 40 files) it's stale. You don't need to count actual files — you only need to flag if the doc claims something internally inconsistent or contradicts another doc.

### CHANGELOG.md is a goldmine

CHANGELOG files for completed modules are usually the most accurate snapshot of "what really happened" because they're written incrementally. Use them as a sanity check against ROADMAP and MODULE_SPEC. Discrepancies between CHANGELOG and ROADMAP almost always mean ROADMAP is stale.

### db-schema.sql files

Each module has its own `db-schema.sql` that should be a snapshot of the tables it owns. Check:
- Are tables claimed by Module 1's schema also claimed by Module 2's? (overlap = bad)
- Do they collectively match (or contradict) `docs/GLOBAL_SCHEMA.sql` from Phase 1A's scope?
- Note this as a Cross-reference for Phase 1A to verify from its side.

---

## 5. Required Output: 7-Section Audit Report

Your report MUST follow the 7-section format defined in `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` §8. No deviations. No skipped sections.

**Specific guidance for Phase 1B:**

- **Section 1 (Inventory):** Group by module (### Module 1 / ### Module 1.5 / ### Module 2). For each: table of files with size and date.
- **Section 2 (Status per file):** Use 5 status labels. Be especially harsh on SUSPECT — internal contradictions matter more here than in Phase 1A.
- **Section 3 (Discrepancies):** Three sub-sections:
  - Within Module 1 (file-vs-file)
  - Within Module 1.5 (file-vs-file)
  - Within Module 2 (file-vs-file)
  - **Cross-module discrepancies** (Module 1 says X, Module 2 says Y about the same thing) — these are the most important.
- **Section 4 (Outdated content):** Likely smaller than Phase 1A's. If empty, that's good news — say so explicitly.
- **Section 5 (Missing):** Especially: missing CHANGELOG entries, missing PHASE SPEC files for phases that the ROADMAP marked as ✅.
- **Section 6 (Cross-references):** Heavy here. Every reference from a Module 1/1.5/2 doc to GLOBAL_MAP, GLOBAL_SCHEMA, CLAUDE.md, or anything in `docs/` (Phase 1A's scope). Every reference to Module 3 (Phase 1C's scope).
- **Section 7 (Recommendations):** Be conservative. If GREEN, recommend "no action" explicitly — that's a valid recommendation. If YELLOW, list precise small fixes. Do NOT recommend rewrites unless you're sure.

---

## 6. Output File Locations

```
modules/Module 3.1 - Project Reconstruction/
├── docs/
│   ├── audit-reports/
│   │   └── PHASE_1B_MODULES_1_2_AUDIT_REPORT.md          ← THE REPORT
│   └── SESSION_CONTEXT_PHASE_1B.md                        ← YOUR PROGRESS FILE
```

If `audit-reports/` does not exist, create it with `mkdir -p`. If Phase 1A already created it (race condition), `mkdir -p` is idempotent — no problem.

---

## 7. Step-by-Step Execution Plan (one big Claude Code run)

The secondary chat should turn this into ONE comprehensive Claude Code prompt.

### Step 1 — Setup verification
- First Action Protocol (machine, branch, git pull on `develop`)
- `cd` to repo root, verify `opticup`
- `mkdir -p "modules/Module 3.1 - Project Reconstruction/docs/audit-reports"`

### Step 2 — Discovery
- `ls -la modules/` — confirm exact folder names for Modules 1, 1.5, 2
- For each of the three folders: `ls -la` + `ls -la docs/` inside
- Print verified file list grouped by module

### Step 3 — Read all in-scope files
- For each docs file: read in full
- Files over 1000 lines: read in chunks, read everything
- Skip code files entirely
- Skip backup folders entirely (note their size in Inventory)

### Step 4 — Cross-reference scan
- For each file: grep for references to other modules, GLOBAL_*, CLAUDE.md, "Module 3", "Storefront", "Phase", "TODO", "DEPRECATED"
- Build a per-module dependency map for the report

### Step 5 — Internal consistency check per module
- For each module: does ROADMAP match CHANGELOG? Does MODULE_SPEC match db-schema? Does SESSION_CONTEXT show recent activity (and if so, does that contradict the assumption that the module is "done")?

### Step 6 — Write the report
- Create `PHASE_1B_MODULES_1_2_AUDIT_REPORT.md`
- All 7 sections
- Length target: 500-700 lines (likely the longest of the 3 reports because it covers 3 modules)
- Top of Summary section: state your verdict (GREEN / YELLOW / RED) with one-sentence justification

### Step 7 — Write SESSION_CONTEXT_PHASE_1B.md
- Status, date, file count, report path, verdict, top findings, issues

### Step 8 — Verification + handback
- `ls -la` of the two created files
- Print first 30 lines of report
- One-line summary: `Phase 1B complete. Verdict: [GREEN/YELLOW/RED]. [N] files. [M] discrepancies. [K] recommendations.`
- Optional commit to `develop` only

---

## 8. Verification Checklist

- [ ] Both output files exist
- [ ] Report has all 7 sections, none skipped
- [ ] Summary section ends with explicit GREEN / YELLOW / RED verdict
- [ ] Status per File entries grouped by module
- [ ] At least one Cross-reference to Phase 1A scope (likely many)
- [ ] At least one Cross-reference to Phase 1C scope if any module references Module 3
- [ ] No code files were read or modified
- [ ] No file outside scope was touched (`git status` clean except for the two new files)
- [ ] SESSION_CONTEXT_PHASE_1B.md filled
- [ ] One-line summary sent to Daniel including the verdict

---

## 9. What Happens After Phase 1B

Phase 1B's verdict (GREEN/YELLOW/RED) is one of the three biggest signals into Phase 2 planning. If GREEN, Phase 2 ignores Modules 1-2 entirely and focuses on Module 3 cleanup + the 5 universal artifacts. If RED, Phase 2 must include a Module 1-2 cleanup track.

This SPEC produces input only. Any rewriting happens in Phase 2 under a different SPEC.

---

## End of SPEC
