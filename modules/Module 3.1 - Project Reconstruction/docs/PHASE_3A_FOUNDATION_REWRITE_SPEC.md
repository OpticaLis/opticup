# Phase 3A — Foundation Rewrite (Module 3.1)

> **Module:** 3.1 — Project Reconstruction
> **Phase:** 3A (parallel with 3B and 3C)
> **Status:** ⬜ Not started — awaiting Daniel approval of this SPEC
> **Execution mode:** REWRITE of existing files + 2 manual Daniel actions (DB interaction)
> **Estimated time:** 90-150 minutes (one long Claude Code run with 2 pause-points for Daniel)
> **Risk level:** MEDIUM — modifies foundation files. Bounded by an explicit file allow-list.
> **Repo:** `opticup` (single repo)

---

## 1. Goal

Rewrite the stale foundation documentation in `opticup` to reflect April 2026 reality. This phase produces the substantive content updates that will let new strategic chats and contributors get a correct picture of the project from day one.

This phase ALSO performs the live-DB schema reconciliation that Phase 1B confirmed is needed (GLOBAL_SCHEMA.sql vs actual DB drift on roles/permissions RLS), using the hybrid approach (Option ג) approved by Main: create `optic_readonly` role now for future use, but Phase 3A still runs the audit through Daniel manually rather than using the role.

---

## 2. Files I Read (READ-ONLY for these)

These are inputs only — never modified by Phase 3A:

```
modules/Module 3.1 - Project Reconstruction/docs/audit-reports/
  ├── PHASE_1A_FOUNDATION_AUDIT_REPORT.md       (the punch list source)
  ├── PHASE_1B_MODULES_1_2_AUDIT_REPORT.md      (cross-reference signals)
  ├── PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md (cross-reference signals)
  └── PHASE_2_VERIFICATION_AND_PLAN.md          (the work plan)

modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT.md  (master state)

opticup-storefront/CLAUDE.md                    (read-only — to know what Iron Rules 24-30 actually are, so opticup/CLAUDE.md can reference them correctly)
```

---

## 3. Files I Write (REWRITE allowed for these — ONLY these)

These are the files Phase 3A modifies. **No file outside this list may be touched.** If you find yourself wanting to modify something else, escalate to Daniel.

```
opticup/MASTER_ROADMAP.md                       (FULL REWRITE)
opticup/README.md                               (FULL REWRITE)
opticup/STRATEGIC_CHAT_ONBOARDING.md            (REWRITE — harmonize chat-hierarchy naming, kill PROJECT_GUIDE.md orphan reference, pointing to PROJECT_VISION.md instead)
opticup/CLAUDE.md                               (TARGETED EDIT — §4-§6 only, to acknowledge Rules 24-30 live in opticup-storefront/CLAUDE.md)
opticup/docs/GLOBAL_MAP.md                      (REWRITE — add Module 3 / Storefront / dual-repo section)
opticup/docs/GLOBAL_SCHEMA.sql                  (REWRITE — reconciled with live DB findings + add view declarations)
opticup/docs/TROUBLESHOOTING.md                 (TARGETED ADDITION — add Phase 0 rails category + entries for the First Action Protocol catch + the lessons banked from Module 3.1)
```

Plus the standard phase output files:
```
modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT_PHASE_3A.md   (CREATE)
modules/Module 3.1 - Project Reconstruction/db-audit/
  ├── audit-queries.sql                          (CREATE — the SQL Daniel runs)
  └── audit-results.json                         (Daniel uploads after running)
```

---

## 4. Files Out of Scope — DO NOT TOUCH

- Anything under `opticup/modules/` (Modules 1, 1.5, 2, 3, 3.1) — Phases 3B/3C own those
- Anything in `opticup-storefront` — read-only access only, no writes
- Any code file (`.js`, `.html`, `.css`, `.ts`, `.astro`, `.sql` migration scripts)
- Any file in Phase A's sealed output list (the 8 storefront docs)
- `node_modules/`, `.git/`, `.vercel/`, backups
- Foundation files NOT in §3's allow-list (e.g., `opticup/docs/AUTONOMOUS_MODE.md`, `opticup/docs/CONVENTIONS.md`, `opticup/docs/DB_TABLES_REFERENCE.md`, `opticup/docs/FILE_STRUCTURE.md` — leave them alone, Phase 1A's audit said they're ALIVE)

---

## 5. Safety Rules — NON-NEGOTIABLE

1. **Branch:** `develop` only. Never `main`. Never push to `main`. Never merge to `main`.
2. **Commit pattern:** small, focused commits. One file per commit when possible. Message format: `docs(M3.1-3A): rewrite [filename]`.
3. **Backup before rewrite:** before rewriting any file in §3, create a backup copy under `modules/Module 3.1 - Project Reconstruction/backups/M3.1-3A_2026-04-11/[original-filename]`. This is mandatory. The backups folder must exist before any rewrite begins.
4. **Coordination with parallel phases (3B and 3C):** Phase 3A's writes do NOT touch any file that 3B or 3C touches. If you discover an overlap, STOP and escalate to Daniel.
5. **Manual Daniel actions are sequential, never batched.** When the SPEC says "ask Daniel to do X", you send ONE instruction, wait for confirmation, then proceed. See §7 for the exact protocol.
6. **No DB writes ever.** The DB audit is read-only. The `optic_readonly` role creation in Step 0 is the ONLY DDL operation in this phase, and it's executed by Daniel manually in Supabase Dashboard, not by Claude Code.

---

## 6. Manual Daniel Actions — TWO TOTAL

This phase has exactly two pause-points where Daniel must act manually. They are ordered. The secondary chat must instruct Daniel one step at a time and wait for confirmation between each.

### Manual Action #1 — Step 0 (BEFORE Phase 3A code runs)

**Purpose:** Create the `optic_readonly` Postgres role in Supabase. This role is created now for future use by Module 3 Phase B (per Main's Option ג decision), even though Phase 3A itself still uses Daniel-mediated SQL execution.

**What the secondary chat sends Daniel — Message #1:**

```
Phase 3A — Manual Action 1 of 2

I need you to create a read-only Postgres role in Supabase before
I can begin the foundation rewrite work. This is a one-time setup
that takes ~5 minutes. The role will be used by future modules,
not by Phase 3A itself.

Step 1 of 1 for this manual action:

1. Open https://supabase.com/dashboard → your Optic Up project
2. Click "SQL Editor" in the left sidebar
3. Click "+ New query"
4. Paste the SQL block below into the editor
5. Click "Run" (or Cmd/Ctrl + Enter)
6. Verify the result shows "Success. No rows returned" or similar
7. Reply to me with: "role created" (or paste any error you see)

```sql
-- Create optic_readonly role for Module 3.1 + future Module 3 Phase B
-- Read-only access to information_schema and pg_catalog only
-- No access to user data tables
CREATE ROLE optic_readonly NOLOGIN;
GRANT USAGE ON SCHEMA information_schema TO optic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO optic_readonly;
GRANT USAGE ON SCHEMA pg_catalog TO optic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO optic_readonly;

-- Verification query (should return 1 row with role name)
SELECT rolname FROM pg_roles WHERE rolname = 'optic_readonly';
```

I will NOT proceed with any other work until I see your "role
created" confirmation. Take your time.
```

**The secondary chat then WAITS.** It does not write to any file. It does not run any other Claude Code prompt. It does nothing until Daniel responds.

**On Daniel's confirmation:** secondary chat responds with one short message ("Confirmed. Proceeding to Step 1 of Phase 3A.") and starts the actual phase work.

**On Daniel's error report:** secondary chat helps debug. Common issues: permissions error (Daniel needs to be on a Pro plan or use service_role), syntax error (paste corrupted), already exists (the role was created previously — that's fine, proceed).

---

### Manual Action #2 — Mid-phase (after audit-queries.sql is written)

**Purpose:** Run the read-only audit SQL queries against the live DB and return results as JSON, so Phase 3A can reconcile GLOBAL_SCHEMA.sql with reality.

**This action is triggered after Step 4 of §8 below (after the secondary chat has written `audit-queries.sql`).**

**What the secondary chat sends Daniel — Message #2:**

```
Phase 3A — Manual Action 2 of 2

I've finished writing the audit SQL. I need you to run it against
the live DB and send me the results so I can reconcile
GLOBAL_SCHEMA.sql with what actually exists.

Step 1 of 3 for this manual action:

1. Open Supabase Dashboard → SQL Editor
2. Click "+ New query"
3. Open the file at: modules/Module 3.1 - Project Reconstruction/db-audit/audit-queries.sql
4. Copy its entire contents
5. Paste into the SQL editor
6. Click "Run"
7. Reply to me with: "queries ran" + any error messages

I will wait for your confirmation before giving you Step 2.
```

**Wait for Daniel's response.** When confirmed, secondary chat sends Message #3:

```
Step 2 of 3 for this manual action:

The query results should be displayed in a table at the bottom of
the SQL editor. We need to export them as JSON.

1. In the results panel, look for a download icon (usually top-right
   of the results table) or a "Download" / "Export" button
2. Choose "JSON" format
3. Save the file to: modules/Module 3.1 - Project Reconstruction/db-audit/audit-results.json
4. Reply to me with: "json saved"

If you can't find a JSON export button, reply "no json button" and
I'll give you an alternative method.
```

**Wait for Daniel's response.** When confirmed, secondary chat sends Message #4:

```
Step 3 of 3 for this manual action:

Final verification:

1. Run this in your terminal (PowerShell or bash):
   ls "modules/Module 3.1 - Project Reconstruction/db-audit/audit-results.json"
2. Confirm the file exists and is non-empty (size > 100 bytes)
3. Reply to me with: "file confirmed [SIZE]"

After this, I'll resume the automated work and you can step away.
```

**On Daniel's confirmation:** secondary chat reads the JSON file from disk, reconciles it against the existing GLOBAL_SCHEMA.sql, writes the rewritten GLOBAL_SCHEMA.sql, and continues to the next step.

---

## 7. Manual-Action Protocol — RULES THE SECONDARY CHAT MUST FOLLOW

When executing a manual action with Daniel:

1. **Send ONE step at a time.** Never list multiple steps in one message.
2. **Each step contains:** what to do (numbered), the artifact to copy/paste (in a code block) if any, and the exact phrase to reply with on completion.
3. **WAIT for Daniel's confirmation between every step.** "Wait" means: do not write any other message, do not run any tool, do not start a new Claude Code prompt. Just wait.
4. **Confirmation phrases are exact-match.** If you ask Daniel to reply with "role created" and he replies "done" — that's still a confirmation. Be flexible on the language but strict on the intent.
5. **If Daniel reports an error,** debug it briefly with one follow-up message. Do not assume the error is fatal. Common errors have known fixes.
6. **Never assume Daniel has done a step you haven't asked him to do.** If you need him to do something, ask explicitly.
7. **Never batch.** "Please do these 3 things and reply when done" is forbidden. Always one thing, one reply, then the next thing.

---

## 8. Step-by-Step Execution Plan (Claude Code prompts the secondary chat writes)

This phase runs as multiple Claude Code prompts because of the manual-action pause points. The secondary chat writes them in sequence.

### Step 0 — Manual Action #1 (Daniel creates optic_readonly role)
See §6.

### Step 1 — Backup all in-scope files
Create `modules/Module 3.1 - Project Reconstruction/backups/M3.1-3A_2026-04-11/`, then `cp` every file from §3's REWRITE list into it. Verify all 7 files copied.

### Step 2 — Read all input files (§2) in full
Build mental model of the punch list from Phase 1A (especially §4 of that report).

### Step 3 — Rewrite the easier foundation files first
Order:
1. **README.md** (smallest, biggest visibility impact) — replace single-tenant Prizma framing with Optic Up SaaS identity. Use `MODULE_3.1_ROADMAP.md` and `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` as voice/style references.
2. **STRATEGIC_CHAT_ONBOARDING.md** — harmonize chat-hierarchy terminology to "Secondary Chat" (Main's locked decision per R13/R15 lessons), kill the orphaned `PROJECT_GUIDE.md` reference and replace with `PROJECT_VISION.md` (which Phase 3C will create at `opticup/docs/PROJECT_VISION.md`).
3. **opticup/CLAUDE.md** §4-§6 only — add explicit acknowledgment that Iron Rules 24-30 live in `opticup-storefront/CLAUDE.md` with cross-reference. Do NOT modify rules 1-23. Do NOT renumber.
4. **TROUBLESHOOTING.md** — append a "Phase 0 rails" category with: the First Action Protocol catch from Phase 1A (real-world validation), the secondary chat activation lesson, and any other Module 3.1 lessons available in `SESSION_CONTEXT.md`.

Commit after each file. Verify nothing else in `git status`.

### Step 4 — Write `audit-queries.sql`
Create `modules/Module 3.1 - Project Reconstruction/db-audit/audit-queries.sql` with read-only queries that return:
- All tables in `public` schema (name, owner, has_rls_enabled)
- All columns per table (table_name, column_name, data_type, is_nullable, default_value)
- All views in `public` schema (name, definition)
- All RLS policies (table_name, policy_name, command, roles, qual)
- All functions (name, language, return_type, arguments)
- All sequences

Output format must be JSON-friendly (one query per concept, results easily exportable). Comment each query block with what it audits and how it maps to GLOBAL_SCHEMA.sql sections.

Commit the file. Verify only `audit-queries.sql` in `git status`.

### Step 5 — Manual Action #2 (Daniel runs SQL, exports JSON)
See §6. **PAUSE here. Wait for Daniel.**

### Step 6 — Read `audit-results.json`, reconcile with current `GLOBAL_SCHEMA.sql`
Once Daniel confirms the JSON file exists, read it. Compare each section against `opticup/docs/GLOBAL_SCHEMA.sql`. Build a list of: tables in DB but not in schema doc, tables in schema doc but not in DB (likely rotted), columns added/removed/changed, missing view declarations, missing RLS policy declarations.

### Step 7 — Rewrite `GLOBAL_SCHEMA.sql`
Produce the reconciled version. Structure:
- Header comment block with date, source ("reconciled from live DB on 2026-04-11"), and what's authoritative
- Tables grouped by module (use Phase 1A and 1B's findings to know which module owns which table)
- View declarations (currently missing per Phase 1A)
- RLS policy declarations
- Sequences and functions
- Cross-references at the bottom to per-module `db-schema.sql` files

Commit. Verify only `GLOBAL_SCHEMA.sql` modified.

### Step 8 — Rewrite `GLOBAL_MAP.md`
Add the missing Module 3 / Storefront / dual-repo section. Use `opticup-storefront/CLAUDE.md`, `opticup-storefront/ARCHITECTURE.md`, and `opticup-storefront/SCHEMAS.md` as authoritative read-only inputs (these are sealed Phase A files — read only). Update any other Module 3.1 cross-references that became valid after Phases 1-2.

Commit.

### Step 9 — Rewrite `MASTER_ROADMAP.md` (the biggest file, saved for last)
Use Phase 1A's punch list (its §4) as the line-by-line source of what to fix. Rewrite Section 4 (current state), Section 5 (build order), Section 14 (decisions), Section 15 (next step) to reflect April 2026 reality. Add Module 3.1 to the build order. Mark Modules 1, 1.5, 2 as ✅ Complete. Mark Module 3 as 🟡 In Phase B remediation. Update the timestamp at the top.

Commit.

### Step 10 — Write `SESSION_CONTEXT_PHASE_3A.md`
Status, files rewritten, manual actions completed, time spent, deviations encountered, handback summary.

### Step 11 — Verification + handback
- `git status` — must show only the 7 rewritten files committed + the 2 db-audit files + SESSION_CONTEXT_PHASE_3A.md (and the backup folder if not yet committed)
- `git log --oneline -15` — show the commit history
- One-line summary to Daniel: `Phase 3A complete. 7 files rewritten. 2 manual actions (role creation + DB audit) successful. Backups in place. [N] commits on develop.`

---

## 9. Verification Checklist

- [ ] `optic_readonly` role exists in Supabase (Daniel-confirmed in Step 0)
- [ ] All 7 files in §3 backed up before any rewrite
- [ ] All 7 files in §3 rewritten and committed individually
- [ ] `audit-queries.sql` created and committed
- [ ] `audit-results.json` exists at the path specified (Daniel-uploaded)
- [ ] `GLOBAL_SCHEMA.sql` reconciled against `audit-results.json` content
- [ ] `MASTER_ROADMAP.md` reflects April 2026 reality (Module 1/1.5/2 ✅, Module 3 in Phase B, Module 3.1 in execution)
- [ ] `opticup/CLAUDE.md` references Iron Rules 24-30 in storefront
- [ ] `STRATEGIC_CHAT_ONBOARDING.md` no longer references the orphan `PROJECT_GUIDE.md` (now points to `PROJECT_VISION.md`)
- [ ] `TROUBLESHOOTING.md` includes the Phase 0 rails section with real lessons
- [ ] No file outside §3 was modified (`git status` clean of unrelated files)
- [ ] No commit to `main`. No push to `main`.
- [ ] `SESSION_CONTEXT_PHASE_3A.md` filled with completion status

---

## 10. What Happens After Phase 3A

Phase 3A's outputs feed into Phase 3D (closure ceremony) which will:
- Cross-link the rewritten foundation docs with what 3B and 3C produce
- Update `MASTER_ROADMAP.md`'s "next step" section to reflect Module 3.1's completion
- Add `PROJECT_VISION.md` (created by 3C) to `GLOBAL_MAP.md`'s reference list

Phase 3A does NOT do those cross-links itself — they happen in 3D so 3A doesn't depend on 3C's outputs being ready.

---

## End of SPEC
