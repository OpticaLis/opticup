# Mission 4: Documentation Accuracy — Checklist

Cross-reference project documentation against actual code and DB state.
Stale docs cause bugs — every new session reads docs and trusts them.

## Scan Categories

### 4.1 FILE_STRUCTURE.md vs Reality
1. Read `docs/FILE_STRUCTURE.md`
2. For each file listed — verify it exists: `ls <path>`
3. For each file NOT listed — check if it should be:
   ```bash
   find . -name "*.js" -o -name "*.html" | grep -v node_modules | sort
   ```
4. Report: files listed but missing, files existing but not listed.

### 4.2 GLOBAL_MAP.md Function Registry vs Code
1. Read `docs/GLOBAL_MAP.md` — extract all function names
2. For each function, verify it exists:
   ```bash
   grep -rn "function functionName\|const functionName\|export.*functionName" --include="*.js" .
   ```
3. Report: functions in GLOBAL_MAP that don't exist in code (orphaned docs).

### 4.3 MODULE_MAP.md vs Module Code
For each active module:
1. Read `modules/Module X/docs/MODULE_MAP.md`
2. Extract listed functions and files
3. Verify each exists in the module's directory
4. Report orphaned entries

### 4.4 GLOBAL_SCHEMA.sql vs Live DB
1. Read `docs/GLOBAL_SCHEMA.sql` — extract table and column definitions
2. Use Supabase MCP to query actual schema:
   ```sql
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```
3. Compare: tables/columns in schema file but not in DB, and vice versa
4. This is the most impactful check — schema drift causes hard-to-debug failures

### 4.5 DB_TABLES_REFERENCE.md vs GLOBAL_SCHEMA.sql
1. Read `docs/DB_TABLES_REFERENCE.md`
2. Compare table list and T constants against GLOBAL_SCHEMA.sql
3. Report any mismatches

### 4.6 SESSION_CONTEXT.md Freshness
For each module with a SESSION_CONTEXT.md:
1. Read the file
2. Check the date mentioned — is it more than 2 weeks old?
3. Check if recent commits touched that module (but SESSION_CONTEXT wasn't updated)
   ```bash
   git log --oneline --since="2 weeks ago" -- "modules/Module X/"
   ```
4. Stale SESSION_CONTEXT → MEDIUM (causes confusion in new sessions)

### 4.7 ROADMAP.md vs Reality
For each module ROADMAP:
1. Read `modules/Module X/ROADMAP.md`
2. Items marked ✅ — spot-check that the feature actually exists
3. Items marked ⬜ — verify they haven't actually been done
4. Report: claimed-complete but missing, or done but not marked

### 4.8 Multi-Repo Module 3 Phase-Label Drift (added 2026-04-14)
Module 3 lives in two repos — the ERP (`opticalis/opticup`) and the
storefront (`opticalis/opticup-storefront`). Phase letters (A / B / C / D
and future letters) are owned **exclusively** by the ERP-side
`modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` per
ERP `CLAUDE.md` §7 Authority Matrix. The storefront repo's
`SESSION_CONTEXT.md` describes storefront-repo working state using
**descriptive names only** — never phase letters.

**Check:**
1. Read `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (ERP-side).
   Extract the declared phase (e.g., "Phase B") and its status.
2. Read `[sibling repo]/opticup-storefront/SESSION_CONTEXT.md`.
   - If it contains ANY of these phrases → FINDING:
     - `Phase A`, `Phase B`, `Phase C`, `Phase D`, `Phase E` (with or
       without a status/completion label)
     - `Module 3 Phase` followed by a letter
     - A `## Current Phase:` line with a phase letter
   - If the storefront file's top header does NOT contain a Scope
     Declaration paragraph stating "NOT authoritative for Module 3's
     phase status" → FINDING (scope ambiguity).
3. Cross-check: if ERP says "Phase B complete" but storefront says
   "Phase X complete" with a different letter — FINDING.

**How to find the sibling repo path:**
- Windows desktop: `C:\Users\User\opticup-storefront\SESSION_CONTEXT.md`
- Windows laptop: `C:\Users\Admin\opticup-workspace\opticup-storefront\SESSION_CONTEXT.md`
- Mac: `/Users/danielsmac/opticup-storefront/SESSION_CONTEXT.md`
- From ERP repo working directory: `../opticup-storefront/SESSION_CONTEXT.md`
  (if the sibling checkout sits next to `opticup/`)

**Grep commands:**
```bash
# In the storefront repo — look for any phase letter usage in docs
grep -rnE "Phase [A-E]\b|## Current Phase:" \
  ../opticup-storefront/SESSION_CONTEXT.md \
  ../opticup-storefront/docs/ 2>/dev/null

# Check SPEC filenames in the storefront repo for phase letters
find ../opticup-storefront/docs -name "*_SPEC*.md" -print 2>/dev/null | \
  grep -E "PHASE_[A-E]|_[A-E]_SPEC"
```

**Exception:** the historical filename
`MODULE_3_CD_SPEC_dns_switch_2026-04-13.md` exists and is permitted
(created before this rule landed). New files MUST NOT use phase letters
in the storefront repo.

### 4.9 Scope Declaration in Multi-Repo Context Files (added 2026-04-14)
Any SESSION_CONTEXT file that describes one repo's view of a
cross-repo module MUST declare its scope at the top (an early paragraph,
callout, or `> **⚠️ Scope Declaration:**` block). Missing scope
declaration on a Module 3 context file → FINDING.

Current files that require a Scope Declaration:
- `[sibling repo]/opticup-storefront/SESSION_CONTEXT.md` (must state it
  is NOT authoritative for Module 3 phase status)
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (must state it
  IS authoritative for Module 3 phase status)

## Severity Guidelines

- GLOBAL_SCHEMA.sql drift from live DB → HIGH
- Function in GLOBAL_MAP that doesn't exist → HIGH
- **Phase-label drift between ERP and storefront Module 3 SESSION_CONTEXT → HIGH** (causes wrong-authority decisions about what is "done")
- **Phase letter (A/B/C/D) found in storefront repo SESSION_CONTEXT or new SPEC filename → HIGH**
- File in FILE_STRUCTURE.md that doesn't exist → MEDIUM
- SESSION_CONTEXT.md stale by >2 weeks → MEDIUM
- **Missing Scope Declaration on Module 3 SESSION_CONTEXT file → MEDIUM**
- ROADMAP status mismatch → MEDIUM
- Missing file from FILE_STRUCTURE.md → LOW
