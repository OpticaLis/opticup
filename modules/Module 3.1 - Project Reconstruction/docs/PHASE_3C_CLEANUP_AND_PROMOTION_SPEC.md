# Phase 3C — Cleanup & Promotion (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 3C (parallel with 3A and 3B)
> **Status:** ⬜ Not started — awaiting Daniel approval of this SPEC
> **Execution mode:** MOVE / ARCHIVE / DELETE / SMALL TARGETED FIXES + 1 manual Daniel action (file inspection)
> **Estimated time:** 60-90 minutes (one long Claude Code run with 1 pause-point for Daniel)
> **Risk level:** LOW-MEDIUM — most operations are file moves/archives. One inspect-then-delete pause.
> **Repo:** `opticup` (single repo)

---

## 1. Goal

Execute the cleanup, relocation, and small bounded fixes that were identified across all 3 audit phases but don't fit into 3A's "rewrite foundation" scope or 3B's "create universal artifacts" scope. This phase is the housekeeping track.

The most strategically significant deliverable here is the promotion of Module 1's misplaced project-vision documents into a proper foundation file (`opticup/docs/PROJECT_VISION.md`), which resolves the orphaned `PROJECT_GUIDE.md` reference that Phase 1A flagged.

---

## 2. Files I Read (READ-ONLY)

```
modules/Module 3.1 - Project Reconstruction/docs/audit-reports/
  ├── PHASE_1A_FOUNDATION_AUDIT_REPORT.md       (FLAG-FOR-DECISION items including the malformed file + TECH_DEBT.md #7)
  ├── PHASE_1B_MODULES_1_2_AUDIT_REPORT.md      (Module 1 housekeeping list — 7 items)
  └── PHASE_2_VERIFICATION_AND_PLAN.md          (the work breakdown)

# The 2 source files for the PROJECT_VISION promotion
opticup/modules/Module 1 - Inventory Management/SPEC.md                          (READ FULLY — source for merge)
opticup/modules/Module 1 - Inventory Management/OPTIC_UP_PROJECT_GUIDE_v1.1.md   (READ FULLY — source for merge)

# Inventory only (do not read full contents) — for archival
opticup/modules/Module 3 - Storefront/docs/old prompts/   (12 stale March 30 PHASE_*_SPEC.md files identified by Phase 1C)
opticup/modules/Module 3 - Storefront/docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md   (move target)

# Read for context only
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT.md
```

---

## 3. Files I Write

### CREATE (one new file)

```
opticup/docs/PROJECT_VISION.md   (created from SPEC.md + OPTIC_UP_PROJECT_GUIDE_v1.1.md, merge or consolidation TBD by reading both)
```

### MOVE / ARCHIVE (file relocations)

```
# Promotion to foundation
opticup/modules/Module 1 - Inventory Management/SPEC.md                          → DELETE after content moved to PROJECT_VISION.md
opticup/modules/Module 1 - Inventory Management/OPTIC_UP_PROJECT_GUIDE_v1.1.md   → DELETE after content moved to PROJECT_VISION.md

# Module 3 SPEC archival (per Phase 1C R8 — archive with marker, do not delete)
opticup/modules/Module 3 - Storefront/docs/old prompts/   →   create subfolder mar30-phase-specs/ + add README.md marker
  (12 PHASE_*_SPEC files from March 30 — moved into the subfolder)

# Phase A SPEC archival (per R16 — was completed but still in current prompt/)
opticup/modules/Module 3 - Storefront/docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md
  →   opticup/modules/Module 3 - Storefront/docs/old prompts/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md
```

### DELETE (after Daniel inspection — Manual Action #1)

```
opticup/C:prizma.claudelaunch.json   (malformed Windows-path-leak filename — FLAG-FOR-DECISION from 1A)
```

### SMALL TARGETED FIXES

```
opticup/TECH_DEBT.md   (resolve item #7 — flip from Active to Resolved per the 1A finding that commit 305b22e harmonized it)
```

### Module 1 housekeeping (7 small bounded items from Phase 1B's report §7)

The exact items will be discovered when reading the 1B report. **Read 1B's §7 carefully and execute exactly the 7 items it lists, no more.** These are likely small things like: stale references, broken cross-links, terminology fixes, missing entries in CHANGELOG. Each item is one targeted edit.

### Standard phase output

```
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT_PHASE_3C.md   (CREATE)
```

---

## 4. Files Out of Scope — DO NOT TOUCH

- Anything Phase 3A modifies (foundation files: MASTER_ROADMAP, README, CLAUDE.md, GLOBAL_MAP, GLOBAL_SCHEMA, STRATEGIC_CHAT_ONBOARDING, TROUBLESHOOTING)
- Anything Phase 3B creates (UNIVERSAL_*, MODULE_DOCUMENTATION_SCHEMA, DANIEL_QUICK_REFERENCE)
- Anything in Modules 1.5 or 2 (Phase 1B verdict GREEN — they need no work)
- Anything in `opticup-storefront`
- Anything Phase A sealed (the 8 storefront files)
- Anything in Module 3 `discovery/` folder
- All code files in either repo

---

## 5. Safety Rules — NON-NEGOTIABLE

1. **Branch:** `develop` only.
2. **Commit pattern:** one commit per logical operation. Message format: `docs(M3.1-3C): [what]` (e.g., `promote PROJECT_VISION.md from Module 1`, `archive 12 stale March 30 SPECs`, `delete malformed launch file`).
3. **Backup before delete:** before deleting any file in §3's DELETE list, copy it to `modules/Module 3.1 - Project Reconstruction/backups/M3.1-3C_2026-04-11/[filename]`. The backup is mandatory even for the malformed file, in case Daniel wants to inspect later.
4. **Use `git mv` for relocations**, not `cp + rm`. Preserves history.
5. **Use `git rm` for deletions**, not raw `rm`. Tracks removal in git.
6. **Never delete a file without backing it up first.** Even files we're confident are junk.
7. **Coordination with parallel phases:** verify no scope overlap before each commit. If you find one, STOP and escalate.
8. **Manual Daniel action is sequential.** See §6.

---

## 6. Manual Daniel Action — ONE TOTAL

This phase has exactly one pause-point: inspecting the malformed `C:prizma.claudelaunch.json` file before deletion. The secondary chat must instruct Daniel one step at a time and wait for confirmation between each.

### Manual Action #1 — Inspect-then-delete the malformed file

**Triggered after:** Step 6 of §8 below (after 12 March 30 SPECs are archived but before the malformed file is touched).

**What the secondary chat sends Daniel — Message #1:**

```
Phase 3C — Manual Action 1 of 1

Phase 1A flagged a file in your opticup repo root with a malformed
Windows-path-leak filename: C:prizma.claudelaunch.json

It's only 146 bytes. It looks like a tool dropped a file with a bad
path string as the filename, possibly Claude Launch leaking a
Windows path. Before I delete it, I need you to confirm what's in it.

Step 1 of 2 for this manual action:

Run this in your terminal (PowerShell or bash) from the opticup repo
root:

  type "C:prizma.claudelaunch.json"

(or on Mac/Linux:  cat "C:prizma.claudelaunch.json")

Reply to me with the file contents (paste them into a code block).
If the command fails, paste the error.

I will wait for your reply before doing anything else.
```

**Wait for Daniel's response.** When the contents are visible, the secondary chat reads them and decides:
- If contents look like tool config / bad path data: recommend delete
- If contents look meaningful: recommend keep, escalate
- If file doesn't exist: skip the action entirely

Then the secondary chat sends Message #2:

```
Step 2 of 2 for this manual action:

[The chat's recommendation here, e.g.:]
"Based on the contents, this is [a tool config leak / actual data /
something else]. My recommendation: [DELETE / KEEP / ESCALATE].

If you agree to delete, reply with: 'delete confirmed'.
If you want to keep it, reply with: 'keep'.
If you want to think about it, reply with: 'pause' and I'll skip
this item — Phase 3C will complete without it and you can decide
later."
```

**On "delete confirmed":** secondary chat backs up the file to the backups folder, then `git rm "C:prizma.claudelaunch.json"`, commits with message `chore(M3.1-3C): delete malformed launch file (1A FLAG-FOR-DECISION resolved)`.

**On "keep":** secondary chat skips deletion, notes in SESSION_CONTEXT and report.

**On "pause":** secondary chat skips this action, notes in SESSION_CONTEXT and report, continues with the rest of the phase.

---

## 7. Manual-Action Protocol — RULES THE SECONDARY CHAT MUST FOLLOW

(Same as Phase 3A §7. Reproduced here for self-containedness.)

1. **Send ONE step at a time.** Never list multiple steps in one message.
2. **Each step contains:** what to do (numbered), the artifact to copy/paste if any, and the exact phrase to reply with on completion.
3. **WAIT for Daniel's confirmation between every step.** Do nothing else in the meantime.
4. **Confirmation phrases are not exact-match — be flexible on language but strict on intent.**
5. **If Daniel reports an error,** debug it briefly with one follow-up message.
6. **Never assume Daniel has done a step you haven't asked him to do.**
7. **Never batch.**

---

## 8. Step-by-Step Execution Plan

### Step 1 — Setup
- First Action Protocol (machine, branch, git pull on `develop`)
- `mkdir -p modules/Module 3.1 - Project Reconstruction/backups/M3.1-3C_2026-04-11`

### Step 2 — Read Phase 1A, 1B, 2 reports for the exact items in scope
Especially: 1B's §7 (the 7 Module 1 housekeeping items) and 1A's §7 (FLAG-FOR-DECISION items).

### Step 3 — Read the 2 PROJECT_VISION source files
Read `Module 1/SPEC.md` and `Module 1/OPTIC_UP_PROJECT_GUIDE_v1.1.md` in full. Decide internally: are they the same content (merge), overlapping (consolidate), or complementary (concatenate with section dividers)? Make the decision based on what you read — do not ask Daniel. Note your decision in the eventual SESSION_CONTEXT.

### Step 4 — Create `opticup/docs/PROJECT_VISION.md`
Write the consolidated/merged version. Header should explain: this is the project-level vision, originally written for Miro as a 28-module plan, promoted from Module 1 by Phase 3C of Module 3.1. Date the promotion. Include a brief intro that ties the original vision to current state (some modules done, some pending).

Length: whatever the source content needs. Likely 200-500 lines.

Commit: `docs(M3.1-3C): create PROJECT_VISION.md (promoted from Module 1)`.

### Step 5 — Backup and remove the source files
Backup `Module 1/SPEC.md` and `Module 1/OPTIC_UP_PROJECT_GUIDE_v1.1.md` to the backups folder. Then `git rm` both. Commit: `docs(M3.1-3C): remove Module 1 vision files (content moved to PROJECT_VISION.md)`.

### Step 6 — Archive the 12 March 30 SPECs
- `mkdir -p "opticup/modules/Module 3 - Storefront/docs/old prompts/mar30-phase-specs"`
- For each of the 12 PHASE_*_SPEC.md files from March 30 in `old prompts/`: `git mv` into the new subfolder
- Create a `README.md` in the subfolder with the marker: "These are 12 phase SPECs from March 30, 2026 that were written under the abandoned 'autonomous mode' execution model. They were never executed in this form. Preserved for historical context. Do not use as reference for current Module 3 execution. The current authoritative SPECs live in `current prompt/`."
- Commit: `docs(M3.1-3C): archive 12 stale March 30 SPECs to mar30-phase-specs/`.

### Step 7 — Move the Phase A SPEC from current prompt/ to old prompts/
- `git mv` `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` from `current prompt/` to `old prompts/`
- Commit: `docs(M3.1-3C): archive completed Phase A SPEC (R16)`.

### Step 8 — Manual Action #1 (Daniel inspects malformed file)
See §6. **PAUSE here. Wait for Daniel.**

After Daniel's decision, execute or skip the deletion accordingly. Commit only if delete confirmed.

### Step 9 — Resolve TECH_DEBT.md #7
Read `opticup/TECH_DEBT.md`. Find item #7. Per 1A's finding, commit 305b22e harmonized the underlying issue but the entry was never updated. Move item #7 from "Active Debt" section to "Resolved Debt" section (or whatever the file's structure uses). Add a one-line note: "Resolved by commit 305b22e — see PHASE_0_PROGRESS.md for details."

Backup `TECH_DEBT.md` first. Commit: `docs(M3.1-3C): resolve TECH_DEBT.md #7 (1A FLAG-FOR-DECISION)`.

### Step 10 — Module 1 housekeeping (7 items)
Read 1B report's §7 carefully. Execute exactly the 7 items listed there, no more, no fewer. Each item is a small targeted edit to a Module 1 doc. Backup each file before editing. Commit each item separately with message: `docs(M3.1-3C): Module 1 housekeeping #N — [what]`.

If any of the 7 items turns out to be larger than expected (more than 30 lines of changes), STOP that item, document it in SESSION_CONTEXT, and escalate to Daniel — it doesn't belong in housekeeping.

### Step 11 — Final verification
- `git status` — should be clean except for any backups not yet committed
- `git log --oneline -20` — show the commit history of this phase
- Verify each created/moved/deleted file landed where it should

### Step 12 — Write `SESSION_CONTEXT_PHASE_3C.md`
Status, files created, files moved, files deleted, manual action result (deleted/kept/paused), Module 1 housekeeping items completed, time spent, deviations.

### Step 13 — Handback to Daniel
One-line summary: `Phase 3C complete. PROJECT_VISION.md promoted. 12 March 30 SPECs archived. Phase A SPEC moved to old prompts. Malformed file [deleted/kept/paused]. TECH_DEBT #7 resolved. [N] of 7 Module 1 housekeeping items done. [M] commits on develop.`

---

## 9. Verification Checklist

- [ ] `opticup/docs/PROJECT_VISION.md` exists, non-empty, content from both source files merged/consolidated
- [ ] Source files (`Module 1/SPEC.md`, `Module 1/OPTIC_UP_PROJECT_GUIDE_v1.1.md`) deleted with `git rm` and backed up
- [ ] `mar30-phase-specs/` subfolder exists in `old prompts/` with 12 files + README marker
- [ ] `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` no longer in `current prompt/`, now in `old prompts/`
- [ ] Manual Action #1 completed (file deleted, kept, or paused — recorded in SESSION_CONTEXT either way)
- [ ] TECH_DEBT.md #7 resolved (moved to Resolved section with note)
- [ ] All 7 Module 1 housekeeping items from 1B §7 completed (or fewer with explanation in SESSION_CONTEXT)
- [ ] All deletions backed up first
- [ ] No file outside §3 was modified (Phases 3A and 3B's files untouched)
- [ ] No commit to `main`. No push to `main`.
- [ ] `SESSION_CONTEXT_PHASE_3C.md` filled

---

## 10. What Happens After Phase 3C

Phase 3D (closure ceremony) will:
- Add `PROJECT_VISION.md` to `GLOBAL_MAP.md`'s reference section (3A creates the section, 3D adds the entry)
- Update `STRATEGIC_CHAT_ONBOARDING.md`'s reference list to point at `PROJECT_VISION.md` (3A rewrites that file to remove the orphan reference, 3D verifies the new pointer is correct)

Phase 3C does NOT do those cross-links — they happen in 3D.

---

## End of SPEC
