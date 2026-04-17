# Phase 1A — Foundation Audit (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 1A (parallel with 1B and 1C)
> **Status:** ⬜ Not started
> **Execution mode:** READ-ONLY audit
> **Estimated time:** 30-60 minutes (one long Claude Code run)
> **Risk level:** ZERO — no file modifications, no DB writes, no commits beyond report file
> **Repo:** `opticup` (single repo)

---

## 1. Goal

Produce a single audit report that captures the **current state of foundation-level documentation** in the `opticup` repo: the `docs/` folder (project-wide reference docs) and the root-level meta files (CLAUDE.md, README.md, and any others present).

This phase answers the question: **"What does the project's foundation documentation actually say today, and where is it broken?"**

This phase is one of three parallel audits. It owns the foundation layer. It does NOT audit module-specific documentation (that's Phases 1B and 1C).

---

## 2. Safety Rules — NON-NEGOTIABLE

1. **READ-ONLY.** No file modifications inside scope. No SQL. No DB writes.
2. **NEVER** touch `main` branch. All work on `develop`.
3. **NEVER** modify `MASTER_ROADMAP.md`, `MODULE_3.1_ROADMAP.md`, `CLAUDE.md`, `GLOBAL_MAP.md`, `GLOBAL_SCHEMA.sql`, or any other file in scope. They are the subject of the audit, not its target.
4. **NEVER** modify files in Modules 1, 1.5, 2, 3 — those are out of scope.
5. The ONLY files you may CREATE are:
   - The audit report (one file, see §6)
   - Your phase's SESSION_CONTEXT file (`SESSION_CONTEXT_PHASE_1A.md`)
6. The ONLY commit allowed (optional): a single commit on `develop` adding those two files. Message: `docs(M3.1): Phase 1A foundation audit report`. Never push to main.
7. If you discover something alarming (e.g., a credential in a committed file), record it in the report's Recommendations section as `FLAG-FOR-DECISION`. Do NOT attempt to fix it.

---

## 3. Scope Paths

The Foundation Audit covers these paths in the `opticup` repo. **All paths are relative to the repo root.**

### Required scope (must `ls` and audit every existing file)

```
docs/
  ├── AUTONOMOUS_MODE.md
  ├── CONVENTIONS.md
  ├── DB_TABLES_REFERENCE.md
  ├── FILE_STRUCTURE.md
  ├── GLOBAL_MAP.md
  ├── GLOBAL_SCHEMA.sql
  ├── TROUBLESHOOTING.md
  └── Templates/   (folder — list contents, audit any .md files inside)
```

### Root-level meta files (audit if present)

```
CLAUDE.md                      ← project rules, Iron Rules 1-23
README.md
MASTER_ROADMAP.md              ← KNOWN STALE — audit anyway, this is why we're here
STRATEGIC_CHAT_ONBOARDING.md   ← may or may not exist
PHASE_0_PROGRESS.md            ← may or may not exist
TECH_DEBT.md                   ← may or may not exist
package.json                   ← read for version info only, do not audit deps
```

### Discovery requirement

Some of the root-level files above are **uncertain** — they may or may not exist. The strategic chat saw them in a folder screenshot but cannot confirm. Therefore the **first action** of Phase 1A is `ls` of the repo root and `ls` of `docs/` to produce a verified file list. Audit only files that exist. Files that the SPEC mentions but are absent from disk go straight into the report's "Missing" section.

### Out of scope (do NOT touch, do NOT read)

- Anything under `modules/` — that's Phases 1B and 1C
- All `.html`, `.js`, `.css`, `.json` files except `package.json` (root only)
- `node_modules/`, `.git/`, `dist/`, `build/`
- Storefront repo (`opticup-storefront`) — that's Phase 1C
- Any backup folders

---

## 4. Special Considerations — Foundation Audit

### MASTER_ROADMAP.md is the central artifact

The strategic chat already knows MASTER_ROADMAP.md is severely outdated — it was last revised in March 2026 and describes a project state that no longer exists (it still says Module 1 is in Phase 5.9, doesn't know Module 2 was completed, doesn't know Module 3 even exists in active form, doesn't know about the 4-layer hierarchy). **Your job is not to confirm this.** Your job is to **map exactly what it gets wrong, line by line**, so that the rewrite phase has a precise list.

For MASTER_ROADMAP.md specifically, the "Outdated content" section of your report should be exhaustive: every section number, every claim that's wrong, every reference to a future state that has already happened. Cite line ranges.

### CLAUDE.md is the project's constitution

Treat CLAUDE.md with care. It contains the Iron Rules. Audit it for:
- Internal contradictions (rule 5 says X, rule 12 says Y)
- References to files/concepts that no longer exist
- Rules that mention "future" things that have already happened
- Missing rules — the project memory mentions Iron Rules 1-30 (1-23 in ERP CLAUDE.md, 24-30 in Storefront CLAUDE.md). If rules 24-30 are referenced from `opticup/CLAUDE.md` but only live in the storefront repo, that's a discrepancy.

### GLOBAL_MAP.md and GLOBAL_SCHEMA.sql are large files

GLOBAL_MAP.md is ~70 KB and GLOBAL_SCHEMA.sql is ~125 KB per the folder listing. You **must** read both in full. Do not skim. Read in chunks if needed. The size matters because they're authoritative — if they're stale, every module that depends on them is operating on bad info.

For GLOBAL_SCHEMA.sql specifically, you don't need to validate every column. You need to verify:
- Does it include tables from Module 2? (If not, it's stale.)
- Does it include the storefront-related tables? (If not, it's stale.)
- Are there obvious "TODO" or "PENDING" markers?

### docs/Templates/ may be empty or large

`ls` it first. Report contents. Audit any .md template files for relevance (do they reference current conventions or old ones?).

---

## 5. Required Output: 7-Section Audit Report

Your report MUST follow the 7-section format defined in `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` §8. No deviations. No skipped sections.

**Specific guidance for Phase 1A:**

- **Section 1 (Inventory):** Table format. Columns: path, size (KB), last-modified (date), category (foundation/root-meta/template).
- **Section 2 (Status per file):** Use the 5 status labels (ALIVE / SUSPECT / STALE / ORPHAN / BROKEN). Be opinionated.
- **Section 3 (Discrepancies):** Focus on cross-foundation contradictions — e.g., does CLAUDE.md say one thing about file structure that FILE_STRUCTURE.md contradicts?
- **Section 4 (Outdated content):** This will be the largest section for Phase 1A. MASTER_ROADMAP.md alone may produce 20+ entries.
- **Section 5 (Missing):** Especially: are there foundation files that CLAUDE.md or other files reference that don't exist on disk?
- **Section 6 (Cross-references):** Note every place where a foundation file references something inside `modules/`. The other phases will validate from their side.
- **Section 7 (Recommendations):** 5-10 concrete cleanup actions. MUST include at least one for MASTER_ROADMAP.md (REWRITE), and at least one decision-point for CLAUDE.md if you find rule contradictions.

---

## 6. Output File Locations

```
modules/Module 3.1 - Project Reconstruction/
├── docs/
│   ├── audit-reports/
│   │   └── PHASE_1A_FOUNDATION_AUDIT_REPORT.md          ← THE REPORT
│   └── SESSION_CONTEXT_PHASE_1A.md                       ← YOUR PROGRESS FILE
```

If `audit-reports/` does not exist yet, create it with `mkdir -p`. This is the only filesystem creation you do beyond the two output files.

---

## 7. Step-by-Step Execution Plan (one big Claude Code run)

The secondary chat should turn this into ONE comprehensive Claude Code prompt (not 9 small ones). The steps below are the structure of that single prompt.

### Step 1 — Setup verification (30 seconds)
- Verify machine via First Action Protocol
- `cd` to repo root, verify it's `opticup`
- `git branch` — must show `develop`
- `git pull origin develop`
- `mkdir -p "modules/Module 3.1 - Project Reconstruction/docs/audit-reports"`

### Step 2 — Discovery (2 minutes)
- `ls -la docs/`
- `ls -la docs/Templates/` (if exists)
- `ls -la *.md *.json` in repo root
- Print a verified file list. This is the input to Step 3.

### Step 3 — Read all files in verified list (10-30 minutes)
- For each file in verified list: read in full (use `view`, not snippets)
- For files over 1000 lines: read in chunks but read everything
- Skip any file under 100 bytes (probably empty/placeholder) — note in report

### Step 4 — Cross-reference scan (5 minutes)
- For each `.md` file read, grep for references to: other foundation files, `modules/`, MASTER_ROADMAP, CLAUDE.md, "Module 1", "Module 2", "Module 3", "Phase", "ROADMAP", "TODO", "PENDING", "DEPRECATED", "FIXME"
- Build a mental map of which file references which

### Step 5 — Write the report (10-15 minutes)
- Create `PHASE_1A_FOUNDATION_AUDIT_REPORT.md` at the path in §6
- Fill all 7 sections per the template in `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` §8
- Cite line ranges aggressively
- Length target: 400-600 lines

### Step 6 — Write SESSION_CONTEXT_PHASE_1A.md (1 minute)
- Create the file at the path in §6
- Fill: status=COMPLETE, date, files-read count, report path, top-3 findings, time spent, any issues

### Step 7 — Verification + handback (30 seconds)
- `ls -la` of the two created files to confirm they exist and are non-empty
- Print the first 30 lines of the report as confirmation
- Print a one-line summary: `Phase 1A complete. [N] files audited. [M] discrepancies. [K] recommendations.`
- (Optional) `git add` the two new files, `git commit -m "docs(M3.1): Phase 1A foundation audit report"`. **Do NOT push.**

---

## 8. Verification Checklist (secondary chat checks before declaring done)

- [ ] Both output files exist at the correct paths
- [ ] Report has all 7 sections, none skipped
- [ ] At least one entry in Outdated Content for MASTER_ROADMAP.md
- [ ] At least one entry in Status per File for every file in scope that exists
- [ ] No file outside scope was modified (run `git status` to verify — should show only the two new files)
- [ ] No commit to `main`. No push at all (or only to `develop` if commit was made)
- [ ] SESSION_CONTEXT_PHASE_1A.md filled with completion status
- [ ] One-line summary sent to Daniel

---

## 9. What Happens After Phase 1A

Phase 1A's report is one input to Phase 2 of Module 3.1 — the synthesis phase, where the strategic chat reads all 3 audit reports (1A + 1B + 1C) and produces the unified picture and rewrite plan. Phase 1A itself does NOT produce any of the 5 final artifacts of Module 3.1. It only produces an audit report.

The next time the secondary chat that ran Phase 1A is needed (if at all) is in Phase 2 or Phase 3, when actual rewriting happens — and at that point, this secondary chat will likely be deleted and a new one opened with a fresh SPEC.

---

## End of SPEC

**This SPEC is the contract for Phase 1A.** The secondary chat reads this, builds the Claude Code prompt(s), and executes. The strategic chat (Module 3.1) does not need to be consulted during execution unless something falls outside this SPEC.
