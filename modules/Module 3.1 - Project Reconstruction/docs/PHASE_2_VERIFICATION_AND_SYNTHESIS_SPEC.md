# Phase 2 — Verification & Synthesis (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 2 (sequential after Phase 1A/B/C)
> **Status:** ⬜ Not started — awaiting Daniel approval of this SPEC
> **Execution mode:** READ-ONLY audit + production of ONE planning document
> **Estimated time:** 60-90 minutes (one long Claude Code run)
> **Risk level:** ZERO — no modification to any pre-existing file
> **Repos:** **TWO** — `opticup` (read-only) AND `opticup-storefront` (read-only)
> **Approved scope boundaries:** See §2 — explicit "what NOT to do" list, locked by Main Strategic Chat on 2026-04-11

---

## 1. Goal

Produce a single planning document — `PHASE_2_VERIFICATION_AND_PLAN.md` — that does three things:

1. **Verifies** that Module 3 Phase A's 8 output documents (Side B, the storefront repo) are intact, internally consistent, and not contradicted by anything in Phases 1A/1B/1C.
2. **Reconciles** every cross-reference from the three Phase 1 reports and marks each as RESOLVED, PENDING, or OUT-OF-SCOPE.
3. **Plans** the work of Phase 3 — specifically what secondary chats need to be opened, what each one's SPEC will cover, and which of the 5 mandatory artifacts each one produces.

This phase is the bridge between "we know what's broken" (Phase 1) and "we fix what's broken" (Phase 3). It produces no rewrites. It produces a plan.

---

## 2. Safety Rules — NON-NEGOTIABLE

**These boundaries were locked by Main Strategic Chat on 2026-04-11 in response to the Phase A discovery in Phase 1C. They override anything in this SPEC that contradicts them.**

### PROHIBITED — Phase 2 must NEVER do these

1. **Never modify any of Phase A's 8 output files in `opticup-storefront`:**
   - `opticup-storefront/CLAUDE.md`
   - `opticup-storefront/VIEW_CONTRACTS.md`
   - `opticup-storefront/ARCHITECTURE.md`
   - `opticup-storefront/SCHEMAS.md`
   - `opticup-storefront/FILE_STRUCTURE.md`
   - `opticup-storefront/TROUBLESHOOTING.md`
   - `opticup-storefront/FROZEN_FILES.md`
   - `opticup-storefront/COMPONENT_CHECKLIST.md`
   These are GROUND TRUTH for April 11, sealed by Phase A's PASS sanity check (18/18 tests, Main-tagged PASS). They are read-only for Module 3.1.

2. **Never modify any file under `opticup/modules/Module 3 - Storefront/discovery/`** — the 10 files there are GROUND TRUTH for code/DB-level findings (the 1,723-line Discovery Report with 159 findings). They are the basis for all of Module 3's SPECs. Read-only.

3. **Never modify any existing Module 3 SPEC** — anything in `opticup/modules/Module 3 - Storefront/docs/current prompt/` or `old prompts/`. These are sealed.

4. **Never run new discovery on code or DB.** If you need a code-level or DB-level fact, read it from the existing `discovery/` folder. Do not write new investigation scripts. Do not query the live database.

5. **Never make architectural decisions that affect Module 3.** If you identify one, escalate it to Daniel (who escalates to Main). Do not solve it inside this phase.

6. **Never commit anything except the planning document** (and an optional `SESSION_CONTEXT_PHASE_2.md`). No edits to existing files.

7. **Never touch `main` in either repo.** All work on `develop`.

### ALLOWED — Phase 2 may do these

1. Read any file in scope (see §3) — read-only.
2. Create the planning document at the path in §6.
3. Create a `SESSION_CONTEXT_PHASE_2.md` for progress tracking.
4. Optional: a single commit on `opticup`'s `develop` adding only the two new files. Message: `docs(M3.1): Phase 2 verification and plan`. Never push to main.

### Escalation triggers — STOP and ask Daniel

If during the run you find:
- A contradiction between two Phase A files that wasn't caught by Phase A's sanity check
- A file in Phase A's output list that doesn't actually exist on disk
- Evidence that a Phase 1 audit report was wrong about something material
- Anything that looks like an architectural decision crossing Module 3 ↔ Module 3.1 boundary

**Stop the run, document the finding in your interim notes, and report to Daniel before continuing.** Do not work around it. Do not assume. Do not write a "best guess" into the planning document.

---

## 3. Scope Paths

Phase 2 has the broadest read scope of any phase so far, because it needs to cross-reference everything.

### Required reads — full file

```
# All 3 Phase 1 audit reports (the master inputs)
modules/Module 3.1 - Project Reconstruction/docs/audit-reports/
  ├── PHASE_1A_FOUNDATION_AUDIT_REPORT.md
  ├── PHASE_1B_MODULES_1_2_AUDIT_REPORT.md
  └── PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md

# All 3 per-phase SESSION_CONTEXTs
modules/Module 3.1 - Project Reconstruction/docs/
  ├── SESSION_CONTEXT_PHASE_1A.md
  ├── SESSION_CONTEXT_PHASE_1B.md
  └── SESSION_CONTEXT_PHASE_1C.md

# Master SESSION_CONTEXT (current state of Module 3.1)
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT.md

# Module 3.1 ROADMAP (the goals and constraints)
modules/Module 3.1 - Project Reconstruction/MODULE_3.1_ROADMAP.md

# The 8 Phase A output files (Side B, storefront repo) — VERIFICATION TARGETS
opticup-storefront/CLAUDE.md
opticup-storefront/VIEW_CONTRACTS.md
opticup-storefront/ARCHITECTURE.md
opticup-storefront/SCHEMAS.md
opticup-storefront/FILE_STRUCTURE.md
opticup-storefront/TROUBLESHOOTING.md
opticup-storefront/FROZEN_FILES.md
opticup-storefront/COMPONENT_CHECKLIST.md
```

### Required reads — index/manifest only (do NOT read full contents)

```
# Module 3 discovery folder — list files, read titles + first 20 lines of each
opticup/modules/Module 3 - Storefront/discovery/

# Module 3 SPECs that already executed (Hotfix, Phase A) — list files, do not re-read
opticup/modules/Module 3 - Storefront/docs/current prompt/
opticup/modules/Module 3 - Storefront/docs/old prompts/  (sample 5 most recent only)
```

### Discovery requirement

Before reading anything, run `ls` on every path above and produce a verified inventory. Some files may have moved, been renamed, or not exist where the strategic chat expects. Audit only what exists. Files mentioned but missing go into the planning document's "Open issues" section.

### Out of scope — do NOT read

- Any code file (`.js`, `.ts`, `.astro`, `.html`, `.css`, `.tsx`, `.jsx`, `.sql` migration scripts, `.mjs` scripts)
- All other modules (1, 1.5, 2)
- All foundation files in `opticup/docs/` and root — the relevant content is already digested into Phase 1A's report
- `node_modules/`, `.git/`, `dist/`, `.vercel/`, backups
- Anything Phase A produced that you might be tempted to "improve" — the verification is "does it exist and is it consistent", not "is it good"

---

## 4. Special Considerations

### The Phase A verification is the most sensitive part

Main Strategic Chat was explicit: Phase A's 8 files are sealed. The verification is **integrity** (do they exist, are they internally consistent, do they contradict the Phase 1 audit reports), NOT **quality** (is the writing good, could it be better, is the structure ideal). If a file is technically correct but you think it could be clearer — that is NOT a finding for Phase 2. That is Module 3 Phase B's job, not Module 3.1's.

A finding for Phase 2 looks like one of these:
- "File X is referenced in Phase 1A's cross-references as authoritative on topic Y, but file X does not actually mention topic Y. Gap."
- "File X says Z, but file Y (also a Phase A output) says NOT-Z. Internal contradiction."
- "Phase 1C cross-reference #N pointed at file X, but file X does not exist on disk."

A finding NOT for Phase 2:
- "File X has a confusing section title."
- "File X could explain concept Y better."
- "File X uses inconsistent capitalization."

### Cross-reference reconciliation is the core deliverable

Phase 1A produced 15 explicit cross-references. Phase 1B produced more (number not yet known to strategic chat). Phase 1C produced 16 cross-repo discrepancies + 9 internal Side-B + 7 internal Side-A. Plus all 3 reports have implicit cross-references in their Recommendations sections.

Your job: build ONE table that lists every cross-reference, where it came from, what it pointed at, and its current status. This table is the heart of the planning document. Phase 3 will use it as a checklist of what to actually fix.

### The 5 mandatory artifacts — your job is to plan them, not write them

The 5 mandatory artifacts (per `MODULE_3.1_ROADMAP.md` §4) are:
1. Updated `MASTER_ROADMAP.md`
2. `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (already validated as ALIVE in Phase 1A)
3. `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` (does not exist, must be created)
4. `MODULE_DOCUMENTATION_SCHEMA.md` (does not exist; will incorporate R13's 4-rule formulation)
5. `DANIEL_QUICK_REFERENCE.md` (does not exist)

Phase 2 does NOT write any of these. Phase 2 produces a **plan** for Phase 3 to write them: which secondary chat handles which artifact, what each SPEC will look like at a high level, what existing content can be reused (e.g., the existing `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` per Phase 1A's verdict), and which Daniel decisions are needed before each can start.

### Pre-locked decisions that the planning document must reflect

These are decisions that have already been made and locked by Daniel + Main:

- **R13 (relocation principle):** 1C's 4-rule formulation is approved as the basis for `MODULE_DOCUMENTATION_SCHEMA.md`. Strategic chat (Module 3.1) wants to add a 5th rule on pointer-stub format. Final wording happens in Phase 3.
- **R15 (Module 3.1 vs Module 3 Phase A):** Both products are valid. Module 3.1 supplements; it does not replace. The 8 Phase A files and the discovery folder are GROUND TRUTH.
- **R14:** Side B layout (root vs `docs/`) — keep current layout. No churn.
- **Module 1 1B verdict YELLOW:** Module 1 housekeeping is small enough to roll into Phase 3 alongside artifact production. No separate Modules 1-2 track.
- **R8:** The 12 stale March 30 PHASE_*_SPEC files in Module 3 — archive with marker, do not delete.

The planning document must reflect all of these as constraints, not re-decide them.

---

## 5. Required Output: Phase 2 Planning Document

The deliverable is ONE markdown file with the structure below. **No deviation from this structure.**

```markdown
# Module 3.1 — Phase 2 Verification & Plan
**Date:** [YYYY-MM-DD]
**Mode:** READ-ONLY audit + planning
**Phase A files verified:** [N] of 8
**Cross-references reconciled:** [N]
**Pending items for Phase 3:** [N]
**Open decisions still needed from Daniel:** [N]

---

## §1 Phase A Integrity Verification

Per file (8 files), report:
- Path
- Exists: YES/NO
- Read in full: YES/NO (and size in lines if YES)
- Internal consistency: PASS/FAIL/PARTIAL — with one-line reasoning
- Contradicted by anything in Phase 1A/1B/1C: NONE / [list with citations]

If any file is FAIL or contradicted: this is an escalation trigger per §2 — STOP and report.

## §2 Cross-Reference Reconciliation Table

Single table. Columns:
- Source (1A / 1B / 1C — with section number)
- Cross-reference text (one sentence)
- Target (file or scope being pointed at)
- Status: RESOLVED-by-Phase-A / RESOLVED-by-other-audit / PENDING / OUT-OF-SCOPE-Module-3-Phase-B / OUT-OF-SCOPE-other
- Notes (one sentence if status needs explanation)

This table must include EVERY cross-reference. If you skip any, the synthesis is incomplete.

## §3 Pending Gap Inventory

List of things Module 3.1 must do that Phase A and Module 3 discovery did NOT cover. Group by category:

### §3.1 Foundation rewrites (Side A `opticup/docs/` + root)
[from Phase 1A — items NOT touched by Phase A which only touched Side B]
- MASTER_ROADMAP.md rewrite
- README.md rewrite
- STRATEGIC_CHAT_ONBOARDING.md harmonization
- `opticup/CLAUDE.md` §4-§6 update (acknowledge Rules 24-30 in storefront)
- GLOBAL_MAP.md update (add Module 3 / dual-repo section)
- GLOBAL_SCHEMA.sql reconciliation (CONFIRMED live-DB drift per 1B)
- TROUBLESHOOTING.md (Side A) update
- ...etc

### §3.2 Module 1 housekeeping (from 1B)
[7 bounded items]

### §3.3 Module 3.1 mandatory artifacts (the 5)
[planning details — see §4 below]

### §3.4 FLAG-FOR-DECISION items
[the 7 R-items that Daniel must decide on, plus the FLAG items from 1A like the malformed `C:prizma.claudelaunch.json` file]

### §3.5 Items deferred to Module 3 Phase B (NOT Module 3.1's job)
[explicit list — TIER-C-PENDING items, etc. So Phase 3 doesn't accidentally pick them up.]

## §4 Phase 3 Work Breakdown

Recommended structure for Phase 3 execution:

For each proposed Phase 3 secondary chat, specify:
- Chat name (e.g., "Phase 3A — Foundation Rewrite")
- Scope (which files it touches)
- Inputs needed (which Phase 1/2 outputs feed it)
- Output (which mandatory artifact(s) it produces, which other files it modifies)
- Estimated effort (small / medium / large)
- Dependencies on other Phase 3 chats (if any)
- Daniel decisions needed before this chat can start

Recommended grouping (the secondary chat may revise this):
- 3A: Foundation rewrite (MASTER_ROADMAP, README, ONBOARDING, foundation CLAUDE.md, GLOBAL_MAP)
- 3B: Mandatory artifacts production (the 5 universal docs)
- 3C: Module 1 housekeeping (small)
- 3D: Stale-doc archive + cleanup (the March 30 SPECs, the malformed file, etc.)

## §5 Open Decisions Still Needed from Daniel

List ONLY decisions that are blockers for Phase 3 starting. Do NOT list cosmetic preferences or things that can be decided during Phase 3 execution.

Each entry:
- Decision ID (e.g., D1, D2)
- Question
- Options (with strategic chat's recommendation if there is one)
- Why this is a Phase 2 blocker (not Phase 3)

## §6 Open Risks and Watch Items

Things that aren't blockers but the strategic chat should keep in mind during Phase 3:
- The 7 Edge Functions with no documented source
- The single-point-of-failure 6 brand content rules
- The Cross-Module Safety Protocol §14 needing relocation
- Any new risks discovered during Phase 2 verification

## §7 Recommendation: Go / No-Go for Phase 3

Single paragraph. Either:
- "GO — Phase 3 can begin once Daniel decides D1, D2, ... DN. Estimated total Phase 3 effort: [X] secondary chats running in parallel/sequence over [Y] sessions."
- "NO-GO — [reason]. Module 3.1 needs an additional sub-phase before Phase 3 can begin: [what]."

---

## End of Plan
**Document size:** [bytes]
**Generated by:** Claude Code under Phase 2 of Module 3.1
**Total files read:** [N]
**Total time:** [minutes]
```

---

## 6. Output File Locations

```
modules/Module 3.1 - Project Reconstruction/
├── docs/
│   ├── audit-reports/
│   │   └── PHASE_2_VERIFICATION_AND_PLAN.md          ← THE PLANNING DOCUMENT
│   └── SESSION_CONTEXT_PHASE_2.md                     ← YOUR PROGRESS FILE
```

Both files live in the `opticup` repo. No outputs in `opticup-storefront`.

---

## 7. Step-by-Step Execution Plan

### Step 1 — Setup verification (BOTH repos)
- First Action Protocol (machine, branch verification on both repos)
- `git pull origin develop` on both repos
- Verify scope paths exist with `ls -la` on each path in §3

### Step 2 — Read all 3 Phase 1 reports + all 4 SESSION_CONTEXTs (the synthesis inputs)
- Read in full
- Build mental map of cross-references

### Step 3 — Verification pass on the 8 Phase A files
- For each file: read in full, check existence, check internal consistency, check against any cross-references that point at it
- Build the §1 verification table as you go
- **STOP if anything fails verification** — escalate to Daniel

### Step 4 — Inventory Module 3 discovery/ + current prompt/ + old prompts/
- `ls` only, plus first 20 lines of each file for titles
- Goal: confirm what Module 3 owns so Phase 2 doesn't trespass

### Step 5 — Build the Cross-Reference Reconciliation Table (§2)
- Walk through 1A, 1B, 1C systematically
- For each cross-ref, mark its status against what Phase A did and what discovery covers
- This is the longest step — take the time it needs

### Step 6 — Build the Pending Gap Inventory (§3)
- Subtract everything resolved from everything pending
- Group into the categories in the template
- Cross-check against the locked decisions in §4 of this SPEC

### Step 7 — Draft the Phase 3 Work Breakdown (§4)
- Propose secondary chat structure
- Include Daniel decision dependencies

### Step 8 — Identify open decisions still needed (§5) and watch items (§6)

### Step 9 — Write Go/No-Go recommendation (§7)

### Step 10 — Save the planning document
- Create `PHASE_2_VERIFICATION_AND_PLAN.md`
- Verify it's complete (all 7 sections filled)
- Length target: 500-800 lines

### Step 11 — Write SESSION_CONTEXT_PHASE_2.md
- Status, files read, time, completion summary, top findings, escalations made

### Step 12 — Verification + handback
- `ls -la` of created files
- Print first 30 lines of plan
- One-line summary to Daniel: `Phase 2 complete. 8/8 Phase A files verified. [N] cross-refs reconciled. [M] pending items. [K] decisions needed before Phase 3. Recommendation: [GO/NO-GO].`
- Optional: single commit to `opticup`'s `develop` only

---

## 8. Verification Checklist

- [ ] Both output files exist at the correct paths in `opticup`
- [ ] §1 verification table covers all 8 Phase A files
- [ ] §2 cross-reference table includes every cross-reference from all 3 Phase 1 reports (no skips)
- [ ] §3 gap inventory has 5 sub-sections matching the template
- [ ] §4 Phase 3 work breakdown includes Daniel decision dependencies for every proposed chat
- [ ] §5 open decisions are blockers, not preferences
- [ ] §7 has explicit GO/NO-GO recommendation with reasoning
- [ ] No file outside scope was modified (`git status` clean in both repos except for the two new files in `opticup`)
- [ ] No commit in `opticup-storefront`. No push to `main` in either repo.
- [ ] No new discovery was attempted on code or DB
- [ ] No Phase A file was modified
- [ ] If verification step had any FAIL: it was escalated to Daniel before proceeding

---

## 9. What Happens After Phase 2

The strategic chat (Module 3.1) reads the planning document. Daniel reviews the open decisions. After decisions are made, the strategic chat writes Phase 3 SPEC(s) — one per proposed secondary chat in §4 — and Phase 3 begins.

Phase 2 is the bridge. Phase 3 is the rebuild.

---

## End of SPEC

**This SPEC is the contract for Phase 2.** It is ONE secondary chat doing ONE long Claude Code run that produces ONE planning document. No parallelism. No multiple chats. No code changes. No decisions on architecture. Read, reconcile, plan, hand back.
