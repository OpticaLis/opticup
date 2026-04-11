# Phase 3B — Universal Artifacts Production (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 3B (parallel with 3A and 3C)
> **Status:** ⬜ Not started — awaiting Daniel approval of this SPEC
> **Execution mode:** CREATE new files + targeted addition to one existing file
> **Estimated time:** 90-120 minutes (one long Claude Code run, no manual Daniel pause-points)
> **Risk level:** LOW — creates new files; only one targeted modification of an existing file
> **Repo:** `opticup` (single repo)

---

## 1. Goal

Produce the 5 mandatory documentation artifacts of Module 3.1 (per ROADMAP §4). Four of them do not yet exist and must be created from scratch. One already exists and was validated as ALIVE in Phase 1A — this phase only adds the lessons banked from Module 3.1's own execution.

These 5 artifacts are the deliverables that make Module 3.1 a real module rather than an audit exercise. They define how every future module of Optic Up will run.

---

## 2. The 5 Mandatory Artifacts

| # | Artifact | Status before 3B | What 3B does |
|---|---|---|---|
| 1 | **`MASTER_ROADMAP.md`** | Stale (Phase 1A confirmed) | **NOT in 3B's scope** — Phase 3A rewrites it |
| 2 | **`UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`** | EXISTS, ALIVE per Phase 1A | TARGETED ADDITION — incorporate 6 lessons from Module 3.1 execution |
| 3 | **`UNIVERSAL_SECONDARY_CHAT_PROMPT.md`** | DOES NOT EXIST | CREATE from scratch, based on `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (which has been hardened through 3 iterations) |
| 4 | **`MODULE_DOCUMENTATION_SCHEMA.md`** | DOES NOT EXIST | CREATE from scratch, based on R13's 4-rule formulation + add 5th rule on pointer-stub format |
| 5 | **`DANIEL_QUICK_REFERENCE.md`** | DOES NOT EXIST | CREATE from scratch — 1-2 page reference |

**Note on artifact #1:** The split is intentional. `MASTER_ROADMAP.md` is in 3A's scope because it requires deep content rewrite based on the audit punch list. 3B handles the universal/template artifacts where the source material is the lessons + R13 formulation, not audit findings.

---

## 3. Files I Read (READ-ONLY)

```
modules/Module 3.1 - Project Reconstruction/MODULE_3.1_ROADMAP.md
modules/Module 3.1 - Project Reconstruction/MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md   (the source for artifact #3)
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT.md                   (the lessons source)
modules/Module 3.1 - Project Reconstruction/docs/audit-reports/PHASE_2_VERIFICATION_AND_PLAN.md   (R13 formulation lives here)
modules/Module 3.1 - Project Reconstruction/docs/audit-reports/PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md   (the original R13 wording)

opticup/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md   (existing — to know its current shape before adding to it)

# Read for style/voice reference only — do not copy verbatim
modules/Module 2 - Platform Admin/MODULE_2_SECONDARY_CHAT_TEMPLATE.md   (the previous-generation pattern)
```

---

## 4. Files I Write

### CREATE (new files)

```
opticup/UNIVERSAL_SECONDARY_CHAT_PROMPT.md            (artifact #3)
opticup/MODULE_DOCUMENTATION_SCHEMA.md                (artifact #4)
opticup/DANIEL_QUICK_REFERENCE.md                     (artifact #5)
```

**Location decision:** All 3 new artifacts live at the `opticup` repo root, not under `docs/`. Rationale: they are project-level constitution-like documents, the same level as `CLAUDE.md` and `MASTER_ROADMAP.md`. Discoverability matters — newcomers should find them at the same depth as the other foundation artifacts.

### REWRITE / TARGETED ADDITION (one existing file)

```
opticup/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md     (artifact #2 — add a "Lessons from Module 3.1" section)
```

### Standard phase output

```
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT_PHASE_3B.md   (CREATE)
```

---

## 5. Files Out of Scope — DO NOT TOUCH

- Anything Phase 3A modifies (MASTER_ROADMAP, README, STRATEGIC_CHAT_ONBOARDING, opticup/CLAUDE.md, GLOBAL_MAP, GLOBAL_SCHEMA, TROUBLESHOOTING)
- Anything Phase 3C modifies (Module 1 docs, Module 3 archive, PROJECT_VISION creation, TECH_DEBT.md, malformed file)
- Anything in `opticup-storefront`
- Anything under `opticup/modules/` except `Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT_PHASE_3B.md`
- All code files in either repo
- Phase A's 8 sealed files

---

## 6. Safety Rules — NON-NEGOTIABLE

1. **Branch:** `develop` only.
2. **Commit pattern:** one commit per artifact. Message format: `docs(M3.1-3B): create [artifact name]` or `docs(M3.1-3B): add lessons to UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`.
3. **Backup before targeted addition:** before modifying `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`, copy it to `modules/Module 3.1 - Project Reconstruction/backups/M3.1-3B_2026-04-11/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md.bak`. Mandatory.
4. **Coordination with parallel phases:** verify no overlap with 3A or 3C scopes before each commit. If you find an overlap, STOP and escalate.
5. **No manual Daniel actions in this phase.** This is a fully autonomous phase. Daniel only reviews the outputs at the end.

---

## 7. Content Guidance for Each Artifact

### Artifact #2 — `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` addition

Add a new section near the end (before the "Files to attach" section, which should remain last). Section title: **"Lessons banked from real-world execution"**.

Content: 6 lessons from `SESSION_CONTEXT.md`'s "Lessons banked" section, expanded into actionable guidance for any strategic chat. The 6 lessons (paraphrase, do not copy verbatim — turn each into a directive):

1. First Action Protocol catches real mistakes — instruct the strategic chat to never skip it
2. Secondary chat activation pattern — paste template as text, not as attachment, and use sequential file loading
3. READ-ONLY audit pattern is viable for any verification work
4. Stop-and-ask before assuming on parallel work — if an audit finds something contradicting your mental model, escalate before proceeding
5. **One question at a time** — when the strategic chat needs information from Daniel, it asks ONE question at a time. No tables. No (1)(2)(3) lists. (This is critical — call it out explicitly.)
6. The strategic chat does not duplicate sealed work — verifies and supplements, never rewrites work that's already been tagged as PASS

Add a 7th lesson banked between the Phase 2 SPEC writing and the Phase 3 SPECs:

7. **Decision presentation must include all real options, not just the strategic chat's preferred binary.** When presenting a decision to Daniel, the strategic chat must enumerate all real alternatives including hybrids, not just a "recommended vs default" pair. Main caught the strategic chat presenting 2 options on D3 when 3 real options existed; Main supplied the third (hybrid) and that's what Daniel chose.

### Artifact #3 — `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`

Base: take `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (171 lines, hardened through 3 iterations during Module 3.1) and turn it into a universal version that works for any module's secondary chat, not just Module 3.1.

Generalizations needed:
- Replace "Module 3.1" with "Module X" placeholders
- Replace "Phase 1A/1B/1C/2" with generic "Phase Y" placeholder
- Replace "audit/verification phase" with "any phase the SPEC describes"
- Keep the 🚨 banners, the YOUR FIRST RESPONSE format, and the FORBIDDEN BEHAVIORS list intact (these are universal)
- Keep the Sequential File Loading Protocol intact
- Keep the 4-layer hierarchy paragraph intact
- Adjust §5 (Core Working Rules) to be conditional: "READ-ONLY by default for audit phases, MODIFY-ALLOWED for execution phases per the SPEC"
- Adjust §7 (Output Report Format) to be generic: "the SPEC defines your output format"

Length target: similar to source (~150-200 lines). Do not bloat.

### Artifact #4 — `MODULE_DOCUMENTATION_SCHEMA.md`

This artifact is the most strategically important of Phase 3B because it defines how documentation lives across the project from now on.

**Source:** Phase 1C's 4-rule formulation for dual-repo doc relocation, copied from `PHASE_2_VERIFICATION_AND_PLAN.md` or directly from `PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md` §7 R13. The 4 rules describe:
1. Side B (storefront) ownership scope
2. Side A (ERP/Studio) ownership scope
3. Pointer-stub pattern for cross-side topics
4. Single-authoritative artifacts (not duplicated)

**Add a 5th rule** that the strategic chat committed to during R13 approval. Suggested wording (the secondary chat may refine):

> **Rule 5 — Pointer-stub format.** When a doc on Side A references content authoritative on Side B (or vice versa), the pointer must include: (a) the canonical name of the authoritative doc, (b) the repo it lives in, (c) a one-line summary of what's there, (d) the path or URL. Pointer stubs are at most 4 lines. Pointer stubs must be updated when the authoritative doc moves or is renamed — this is a hard rule, not a guideline.

**Add a 6th rule** absorbing Phase 1B's schema-in-pieces finding (Issue #7 in `SESSION_CONTEXT.md`):

> **Rule 6 — Tables that span multiple modules.** A DB table created by Module M1 and ALTERed by later modules M2, M3 has its authoritative declaration in `opticup/docs/GLOBAL_SCHEMA.sql`. Each module that ALTERs the table must include an extension stub in its own `db-schema.sql` that says: "ALTER for table T — see GLOBAL_SCHEMA.sql for full definition." The pattern matches Rule 5's pointer-stub principle.

Length target: 250-400 lines. Include examples.

### Artifact #5 — `DANIEL_QUICK_REFERENCE.md`

Purpose: a 1-2 page document Daniel can open at any time to remember "I'm in chat X, I need Y, what do I do?"

Content sections:
1. **The 4 layers, who they are, when to use each**
   - Main Strategic Chat — long-running, project-wide decisions
   - Module Strategic Chat — one per module, scoped to that module's SPECs
   - Secondary Chat — one per phase, executes SPEC, dies at phase end
   - Claude Code — terminal executor, reads CLAUDE.md, runs SPECs
2. **Common scenarios with one-line answers:**
   - "I want to start a new module" → open Main, paste MASTER_ROADMAP, go from there
   - "I want to start a new phase in an existing module" → open new Module Strategic Chat with the universal prompt + module ROADMAP
   - "A phase needs a secondary chat" → paste UNIVERSAL_SECONDARY_CHAT_PROMPT.md as text only, no attachments, wait for it to request the SPEC
   - "I need to run code Claude Code wrote" → open terminal in correct repo, verify branch=develop, paste prompt
   - "A chat is asking me a menu of options" → tell it to follow the SPEC, do not pick options
3. **The 6 forbidden behaviors of secondary chats** (copied from `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`) — so Daniel can quickly identify when a chat is misbehaving and tell it to stop
4. **One-question-at-a-time rule** (highlight it — this is the rule Daniel cares about most)
5. **File locations cheat sheet** — where each artifact lives, which module folder structure looks like
6. **DB safety levels** — Level 1/2/3 quick recap, when each is allowed

Length target: 150-300 lines. Should be scannable, not an essay.

---

## 8. Step-by-Step Execution Plan

### Step 1 — Setup
- First Action Protocol (machine, branch, git pull on `develop`)
- `mkdir -p modules/Module 3.1 - Project Reconstruction/backups/M3.1-3B_2026-04-11`
- Backup `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` to that folder

### Step 2 — Read all input files (§3)
Build mental model of the lessons + R13 formulation + the existing strategic chat prompt's structure.

### Step 3 — Create `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`
Generalize from the Module 3.1 template. Commit. Verify only the new file in `git status`.

### Step 4 — Create `MODULE_DOCUMENTATION_SCHEMA.md`
6 rules + examples + cross-references to relevant Phase A files (as pointer stubs demonstrating Rule 5). Commit.

### Step 5 — Create `DANIEL_QUICK_REFERENCE.md`
The 6 sections from §7. Commit.

### Step 6 — Add lessons section to `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`
Insert the 7-lesson section before the "Files to attach" section. Commit.

### Step 7 — Verification
- `git status` — must show only the 4 created/modified files committed
- Read each new file once more to verify completeness
- For each artifact: does it stand alone? Could a new contributor read just this file and understand its purpose?

### Step 8 — Write `SESSION_CONTEXT_PHASE_3B.md`
Status, files created, files modified, time spent, deviations, handback summary.

### Step 9 — Handback to Daniel
One-line summary: `Phase 3B complete. 3 new artifacts created (UNIVERSAL_SECONDARY_CHAT_PROMPT, MODULE_DOCUMENTATION_SCHEMA, DANIEL_QUICK_REFERENCE). 1 existing artifact updated (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT — added 7 lessons). All 4 of Module 3.1's universal artifacts now in place. [N] commits on develop.`

---

## 9. Verification Checklist

- [ ] All 3 new files exist at the correct paths in `opticup` root
- [ ] `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` has the new "Lessons banked from real-world execution" section with 7 lessons
- [ ] `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` is generalized (no Module 3.1-specific references)
- [ ] `MODULE_DOCUMENTATION_SCHEMA.md` has 6 rules (4 from R13 + Rule 5 on pointer-stubs + Rule 6 on schema-in-pieces) with examples
- [ ] `DANIEL_QUICK_REFERENCE.md` has the 6 sections from §7 and is scannable
- [ ] No file outside §4 was modified
- [ ] No commit to `main`. No push to `main`.
- [ ] Backup of `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` exists in the backups folder
- [ ] `SESSION_CONTEXT_PHASE_3B.md` filled

---

## 10. What Happens After Phase 3B

Phase 3D (closure) will:
- Add the 4 new artifacts to `GLOBAL_MAP.md`'s reference section (3A creates the section, 3D adds the entries)
- Update `MASTER_ROADMAP.md`'s decisions table with R13 + the lessons (3A wrote the table, 3D adds the new entries)

Phase 3B does NOT do those cross-links — they happen in 3D so 3B is independent of 3A's outputs.

---

## End of SPEC
