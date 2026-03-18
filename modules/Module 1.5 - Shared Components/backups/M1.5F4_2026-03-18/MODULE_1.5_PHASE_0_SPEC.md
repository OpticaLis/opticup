# מודול 1.5 — פאזה 0: הקמת תשתית גלובלית

> **מסמך זה מיועד לצ'אט האסטרטגי של מודול 1.5.**
> הוא מגדיר בדיוק מה צריך לקרות לפני שמתחילים לבנות את shared/.
> כל שלב כאן הוא פרומפט שהצ'אט המשני ייתן ל-Claude Code.

---

## למה פאזה 0

מודול 1.5 בונה תשתית שכל מודול עתידי ישתמש בה. אבל לפני שמתחילים, הפרויקט צריך לעבור ממבנה "מודול אחד" למבנה "ריבוי מודולים." היום כל התיעוד יושב בתוך תיקיית מודול 1. אין מסמכים גלובליים. אין הפרדה בין "מה שייך למודול" ל"מה שייך לכולם."

**בלי פאזה 0 — כל מודול עתידי יעבוד בחושך.** הוא לא יידע אילו פונקציות משותפות קיימות, אילו טבלאות תפוסות, ואילו contracts זמינים.

---

## מה פאזה 0 עושה (7 שלבים)

### שלב 1 — אודיט מלא של המצב הקיים

**לפני שמשנים משהו, Claude Code חייב לקרוא ולדווח.**

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Repo: opticalis/opticup
Branch: develop (verify with `git branch`)

Task: Full project audit. Read ALL the following files and produce a structured report:

1. CLAUDE.md — list all rules, conventions, file structure
2. modules/Module 1 - Inventory Management/docs/MODULE_MAP.md — list:
   a. All global files in js/ with every exported function
   b. All global files in css/
   c. All HTML pages in root
   d. All module directories with file count
3. modules/Module 1 - Inventory Management/docs/db-schema.sql — list:
   a. Every table name + column count
   b. Every RLS policy
   c. Every RPC function
   d. Every index
4. modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md — list:
   a. All contracts (public functions other modules can call)
   b. All business logic flows
5. css/styles.css — report:
   a. Total line count
   b. All unique color values (hex, rgb, hsl)
   c. All font-family declarations
   d. All font-size values
   e. All media queries / breakpoints
   f. All z-index values
   g. All box-shadow values
   h. All border-radius values
   i. All transition/animation values
6. js/shared.js — list every exported function and global variable
7. js/supabase-ops.js — list every exported function
8. js/auth-service.js — list every exported function
9. js/header.js — list every exported function
10. js/pin-modal.js — list every exported function

Format the report as markdown with clear sections.
Do NOT make any changes — read only.
```

**מה Daniel עושה עם התוצאה:**
- מדביק את הדוח בצ'אט האסטרטגי של מודול 1.5
- הצ'אט האסטרטגי בודק: האם יש משהו שחסר? האם יש סתירות?
- רק אחרי אישור → שלב 2

---

### שלב 2 — יצירת docs/GLOBAL_MAP.md

**הקובץ הזה = "ספר הטלפונים" של הפרויקט.** כל Claude Code session יקרא אותו בהתחלה.

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Create docs/GLOBAL_MAP.md based on the audit from the previous step.

The file must contain EXACTLY these sections, and NOTHING else:

## 1. HTML Pages
Table: | Page | File | Owner Module | Description |
List every .html file in repo root.

## 2. Global JS Files (js/)
For each file in js/:
- File name + line count
- Every exported function: name, parameters, return value, one-line description
- Every global variable: name, type, one-line description

## 3. Global CSS Files (css/)
For each file in css/:
- File name + line count
- Brief description of what it styles

## 4. Shared Components (shared/)
Empty section with note: "Will be populated by Module 1.5"
Sub-sections prepared:
- shared/css/ — (empty)
- shared/js/ — (empty)

## 5. Cross-Module Contracts
Table: | Contract Function | Owner Module | Parameters | Returns | Used By |
Fill with all existing contracts from MODULE_SPEC.md:
- getItemByBarcode, searchFrames, updateQuantity, getStockLevel, writeLog, getBrands, getSuppliers
- getCurrentUser, verifyPIN, hasPermission
- getTenantId

## 6. Module Registry
Table: | Module | Status | Directory | HTML Pages | DB Tables (count) |
Currently only Module 1.

## 7. DB Table Ownership
Table: | Table Name | Owner Module | Key Columns | Used By |
List EVERY table from db-schema.sql with the columns that other modules are most likely to reference (id, tenant_id, name, barcode, etc.)

Rules:
- This is a REFERENCE document — factual, no opinions
- Every entry must be verifiable from the actual code
- If unsure about something, mark it with ⚠️
- Do NOT include Module 1's internal module files (modules/inventory/*, modules/debt/*, etc.) — those belong to Module 1's local MODULE_MAP

When done: git add docs/GLOBAL_MAP.md && git commit -m "docs: create GLOBAL_MAP.md — global project reference" && git push
```

---

### שלב 3 — יצירת docs/GLOBAL_SCHEMA.sql

**הקובץ הזה = מפת DB מלאה.** כל מודול חדש יקרא אותו לפני שיוצר טבלאות.

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Create docs/GLOBAL_SCHEMA.sql based on the current database.

Rules:
1. Copy the FULL content of modules/Module 1 - Inventory Management/docs/db-schema.sql
2. Organize by module with clear headers:
   -- ═══════════════════════════════════════
   -- Module 1: Inventory Management
   -- ═══════════════════════════════════════
3. Include ALL: CREATE TABLE, ALTER TABLE, RLS policies, RPC functions, indexes, triggers
4. Add a header comment:
   -- Optic Up — Global Database Schema
   -- Source of truth for all tables across all modules
   -- Updated at end of each phase via Integration Ceremony
   -- Last updated: [today's date]
   -- 
   -- Modules included:
   -- Module 1: Inventory Management (Phase 0-5.9 + QA) ✅
5. At the bottom, add a reserved section:
   -- ═══════════════════════════════════════
   -- Module 1.5: Shared Components (PENDING)
   -- ═══════════════════════════════════════
   -- activity_log table will be added in Phase 3
6. Verify: count tables in the file vs count tables in MODULE_MAP.md — must match exactly. If mismatch, report which tables are missing.

When done: git add docs/GLOBAL_SCHEMA.sql && git commit -m "docs: create GLOBAL_SCHEMA.sql — full database reference" && git push
```

---

### שלב 4 — יצירת מבנה תיקיות מודול 1.5

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Create the directory structure for Module 1.5 with empty documentation files.

mkdir -p "modules/Module 1.5 - Shared Components/docs"
mkdir -p "modules/Module 1.5 - Shared Components/backups"
mkdir -p shared/css
mkdir -p shared/js
mkdir -p shared/tests

Create these files with initial content:

1. modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md:
---
# Session Context — Module 1.5: Shared Components

## Current Status
Phase 0 (infrastructure setup) complete. Ready for Phase 1.

## Last Session
- Created module directory structure
- Created shared/ directories
- Global docs (GLOBAL_MAP.md, GLOBAL_SCHEMA.sql) created

## What's Next
Phase 1: CSS Foundation — extract design tokens from styles.css to shared/css/variables.css

## Open Issues
None.
---

2. modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md:
---
# Module Map — Module 1.5: Shared Components

> Updated every commit. Contains ONLY files/functions belonging to this module.

## shared/css/
(empty — Phase 1 will populate)

## shared/js/
(empty — Phase 2+ will populate)

## shared/tests/
(empty — test pages added per phase)
---

3. modules/Module 1.5 - Shared Components/docs/MODULE_SPEC.md:
---
# Module Spec — Module 1.5: Shared Components

> Current state only. Updated end of each phase.

## Purpose
Shared UI components and infrastructure for all modules.

## Contracts
(none yet — will be populated as components are built)
---

4. modules/Module 1.5 - Shared Components/docs/CHANGELOG.md:
---
# Changelog — Module 1.5: Shared Components

## Phase 0 — Infrastructure Setup — [today's date]
- Created module directory structure
- Created shared/css/, shared/js/, shared/tests/ directories
- Initial documentation files
---

5. modules/Module 1.5 - Shared Components/docs/db-schema.sql:
---
-- Module 1.5: Shared Components — Database Schema
-- Currently empty. activity_log table will be added in Phase 3.
---

When done: git add -A && git commit -m "Module 1.5: create directory structure and initial docs" && git push
```

---

### שלב 5 — עדכון CLAUDE.md

**זה השלב הכי קריטי.** CLAUDE.md הוא המסמך שכל Claude Code session קורא ראשון. הוא חייב לשקף את המבנה החדש.

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Update CLAUDE.md with the new multi-module structure. 
Read the current CLAUDE.md first, then apply these changes:

=== CHANGE 1: Replace the "File Structure" section ===

Replace the entire file structure block with:

## File Structure

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── inventory.html              — inventory management module
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — employee management page
├── shipments.html              — shipments & box management module
├── settings.html               — tenant settings
├── docs/                       — GLOBAL project documentation (read-only during development)
│   ├── GLOBAL_MAP.md           — all shared functions, contracts, module registry
│   └── GLOBAL_SCHEMA.sql       — full DB schema across all modules
├── shared/                     — shared components (Module 1.5+)
│   ├── css/                    — variables.css, components.css, layout.css, forms.css
│   ├── js/                     — modal-builder.js, toast.js, table-builder.js, etc.
│   └── tests/                  — test pages for shared components
├── css/
│   ├── styles.css              — legacy styles (being replaced by shared/css/)
│   └── header.css              — sticky header styles
├── js/
│   ├── shared.js               — Supabase init, constants, caches, utilities
│   ├── supabase-ops.js         — DB operations: writeLog, fetchAll, batch ops
│   ├── data-loading.js         — data loading + enrichment
│   ├── search-select.js        — searchable dropdown component
│   ├── auth-service.js         — PIN login, session management, permissions
│   ├── header.js               — sticky header logic
│   ├── file-upload.js          — document file upload/preview
│   ├── alerts-badge.js         — bell icon + alerts dropdown
│   └── pin-modal.js            — PIN prompt (will migrate to shared/js/)
├── modules/
│   ├── inventory/              — Module 1 internal files
│   ├── purchasing/             — Module 1 internal files
│   ├── goods-receipts/         — Module 1 internal files
│   ├── audit/                  — Module 1 internal files
│   ├── brands/                 — Module 1 internal files
│   ├── access-sync/            — Module 1 internal files
│   ├── admin/                  — Module 1 internal files
│   ├── debt/                   — Module 1 internal files (+ ai/ subfolder)
│   ├── permissions/            — Module 1 internal files
│   ├── shipments/              — Module 1 internal files
│   ├── settings/               — Module 1 internal files
│   ├── stock-count/            — Module 1 internal files
│   ├── Module 1 - Inventory Management/     — Module 1 docs & roadmap
│   └── Module 1.5 - Shared Components/      — Module 1.5 docs & roadmap
├── scripts/                    — Node.js scripts (sync watcher, etc.)
├── watcher-deploy/             — Standalone watcher deployment
├── supabase/functions/         — Edge Functions
└── migrations/                 — SQL migration files
```

=== CHANGE 2: Replace "MODULE_MAP.md — Living Architecture Document" section ===

Replace the entire section with:

## Documentation Architecture — Multi-Module

### Two levels of documentation

**Global docs (docs/ in repo root) — read-only during development:**
| File | Contains | Updated |
|------|----------|---------|
| `docs/GLOBAL_MAP.md` | All shared functions, cross-module contracts, module registry, DB table ownership | End of each phase (Integration Ceremony) |
| `docs/GLOBAL_SCHEMA.sql` | Full DB schema across all modules — CREATE TABLE, RLS, RPC, indexes | End of each phase (Integration Ceremony) |

**Module docs (modules/Module X/docs/) — read/write during development:**
| File | Contains | Updated |
|------|----------|---------|
| `ROADMAP.md` | Phase map with ⬜/✅ status | End of phase |
| `docs/SESSION_CONTEXT.md` | Current status, last commits, next steps, open issues | End of every session |
| `docs/MODULE_MAP.md` | All files, functions, globals of THIS module only | Every commit |
| `docs/MODULE_SPEC.md` | Current state — logic, tables, contracts (no history) | End of phase |
| `docs/CHANGELOG.md` | Full history — commits and changes per phase | End of phase |
| `docs/db-schema.sql` | DB tables created by THIS module only | Every DB change |
| `docs/PHASE_X_SPEC.md` | Spec for current phase (written by strategic chat) | Before phase starts |

### Rules — enforced always

**Every commit:**
- Module's `MODULE_MAP.md` — update with new files/functions (module's own only)
- Module's `db-schema.sql` — update if any DB change

**End of every session:**
- Module's `SESSION_CONTEXT.md` — what was done, commits, what's next, issues

**End of every phase (Integration Ceremony):**
1. Backup: `mkdir -p "modules/Module X/backups/MXF{phase}_{date}"` → copy all docs
2. Module's `ROADMAP.md` — mark ⬜ → ✅
3. Module's `CHANGELOG.md` — add phase section
4. Module's `MODULE_SPEC.md` — update current state
5. Module's `MODULE_MAP.md` — verify completeness
6. Module's `db-schema.sql` — verify current
7. **GLOBAL integration:** merge module's MODULE_MAP into `docs/GLOBAL_MAP.md` (add only, never overwrite)
8. **GLOBAL integration:** merge module's db-schema.sql into `docs/GLOBAL_SCHEMA.sql` (add only, never overwrite)
9. Git tag: `v{module}-{phase}`

### Cross-module rules
- **Contracts:** modules communicate ONLY through contract functions. Never access another module's tables directly.
- **shared/ is read-only for modules.** To add a function to shared/, create a separate PR that Daniel approves.
- **docs/GLOBAL_MAP.md and docs/GLOBAL_SCHEMA.sql are read-only during development.** Updated only during Integration Ceremony at end of phase.
- **Before starting a new module:** read GLOBAL_MAP.md and GLOBAL_SCHEMA.sql to understand what exists.

### Authority Matrix — updated
| Information Type | Authoritative File |
|---|---|
| Iron rules & SaaS rules | CLAUDE.md |
| Project-wide function registry | docs/GLOBAL_MAP.md |
| Project-wide DB schema | docs/GLOBAL_SCHEMA.sql |
| Module's code map | modules/Module X/docs/MODULE_MAP.md |
| Module's DB tables | modules/Module X/docs/db-schema.sql |
| Module's business logic | modules/Module X/docs/MODULE_SPEC.md |
| Module's phase status | modules/Module X/ROADMAP.md |
| Module's commit history | modules/Module X/docs/CHANGELOG.md |
| Module's current status | modules/Module X/docs/SESSION_CONTEXT.md |

=== CHANGE 3: Add Branching section after "Commit Format" ===

## Branching & Environments

### Branches
- **`main`** = Production. Live for end users (GitHub Pages). Do NOT push directly — merge only.
- **`develop`** = Development. All Claude Code work happens here.
- **Verify branch** before every session: `git branch` — must show `develop`.

### Development Flow
1. All work happens on `develop`
2. When ready for production:
   ```
   git checkout main && git merge develop && git push && git checkout develop
   ```
3. After merge, verify GitHub Pages deploy succeeded

### Merge Policy
- **Refactor modules** (e.g., 1.5 Shared Components): merge to main at end of module after full QA
- **Feature modules** (e.g., CRM, Orders): merge per-phase if the phase delivers standalone user value
- **Hotfixes**:
  ```
  git checkout main
  git checkout -b hotfix/description
  # fix
  git checkout main && git merge hotfix/description && git push
  git checkout develop && git merge main && git push
  ```

### Shared Database
Both branches share one Supabase instance.
- **Safe** (do anytime): ADD COLUMN, CREATE TABLE, CREATE FUNCTION, ADD INDEX
- **Breaking** (plan carefully): DROP COLUMN, ALTER COLUMN type, DROP FUNCTION, RENAME
- **Protocol for breaking changes:**
  1. Add the new structure (backward compatible)
  2. Merge code to main that uses the new structure
  3. Only then remove the old structure

=== CHANGE 4: Update "First Action" section ===

Replace the first section with:

## First Action — Read This Before Anything Else

When starting a new session:
1. Verify you are on `develop` branch: `git branch`
2. Read `CLAUDE.md` (this file) — rules, conventions, structure
3. Read the SESSION_CONTEXT.md of the module you're working on:
   - Module 1: `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
   - Module 1.5: `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
4. Read `docs/GLOBAL_MAP.md` — shared functions, contracts, module registry (reference only — do NOT modify)

**Do NOT read MODULE_MAP.md or GLOBAL_SCHEMA.sql at session start.** They are reference documents — open only when needed.

After reading, confirm:
> "On branch: develop. Module: [X]. Current status: [one line]. Ready."

=== END OF CHANGES ===

IMPORTANT: Do NOT delete or change anything else in CLAUDE.md. 
Only modify/add the sections specified above.
After changes, verify CLAUDE.md is valid markdown and all existing rules are preserved.

When done: git add CLAUDE.md && git commit -m "CLAUDE.md: update for multi-module architecture, branching, global docs" && git push
```

---

### שלב 6 — עדכון ROADMAP מודול 1.5

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Update modules/Module 1.5 - Shared Components/ROADMAP.md

In the phase table, add Phase 0 as completed:

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| 0 | ✅ | Infrastructure Setup | Global docs, module directory, CLAUDE.md update, branching |
| 1 | ⬜ | CSS Foundation | variables.css, components.css, layout.css, forms.css, per-tenant theming |
...rest unchanged...

In the detailed phases section, add before Phase 1:

### פאזה 0 ✅ — Infrastructure Setup
- Created docs/GLOBAL_MAP.md — project-wide function registry and contracts
- Created docs/GLOBAL_SCHEMA.sql — full database schema across all modules
- Created Module 1.5 directory structure and initial docs
- Updated CLAUDE.md: multi-module documentation architecture, branching, global docs
- Created develop branch for safe development
- All future work happens on develop, merged to main when stable

When done: git add -A && git commit -m "Module 1.5: Phase 0 complete — infrastructure setup" && git push
```

---

### שלב 7 — וידוא סופי (Sanity Check)

פרומפט ל-Claude Code:
```
Context: Optic Up — multi-tenant SaaS optical store management.
Branch: develop

Task: Final verification of Phase 0. Check ALL of the following:

1. Branch check:
   - `git branch` shows develop (current)
   - `git branch -a` shows both main and develop

2. File existence:
   - docs/GLOBAL_MAP.md exists and is not empty
   - docs/GLOBAL_SCHEMA.sql exists and is not empty
   - modules/Module 1.5 - Shared Components/ROADMAP.md exists
   - modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md exists
   - modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md exists
   - modules/Module 1.5 - Shared Components/docs/MODULE_SPEC.md exists
   - modules/Module 1.5 - Shared Components/docs/CHANGELOG.md exists
   - modules/Module 1.5 - Shared Components/docs/db-schema.sql exists
   - shared/css/ directory exists
   - shared/js/ directory exists
   - shared/tests/ directory exists

3. GLOBAL_MAP.md validation:
   - Has "HTML Pages" section with all 6 pages listed
   - Has "Global JS Files" section with all js/ files
   - Has "Cross-Module Contracts" section with existing contracts
   - Has "DB Table Ownership" section — count tables, compare with GLOBAL_SCHEMA.sql

4. GLOBAL_SCHEMA.sql validation:
   - Count all CREATE TABLE statements
   - Count all RLS policies
   - Compare table count with MODULE_MAP.md of Module 1 — must match

5. CLAUDE.md validation:
   - Contains "Branching & Environments" section
   - Contains "Documentation Architecture — Multi-Module" section
   - Contains updated "First Action" section mentioning develop branch
   - Contains updated "Authority Matrix"
   - Still contains ALL original iron rules (1-16) — none deleted
   - Still contains "File Size Rules" section
   - Still contains "Working Rules" section
   - Still contains "Commit Format" section

6. Cross-reference check:
   - Every table in GLOBAL_SCHEMA.sql appears in GLOBAL_MAP.md "DB Table Ownership"
   - Every contract function in GLOBAL_MAP.md matches MODULE_SPEC.md
   - Every js/ file in GLOBAL_MAP.md matches what actually exists on disk

Report format:
✅ [check] — passed
❌ [check] — FAILED: [what's wrong]
⚠️ [check] — WARNING: [what to look at]

Do NOT fix anything — just report. I will review and decide.
```

---

## סיכום פאזה 0

| שלב | מה | תוצאה |
|-----|-----|--------|
| 1 | אודיט מלא | דוח מפורט של כל מה שקיים |
| 2 | GLOBAL_MAP.md | ספר טלפונים של הפרויקט |
| 3 | GLOBAL_SCHEMA.sql | מפת DB מלאה |
| 4 | מבנה תיקיות 1.5 | docs ריקים + shared/ directories |
| 5 | עדכון CLAUDE.md | חוקה מעודכנת — branching, global docs, multi-module |
| 6 | עדכון ROADMAP | פאזה 0 מסומנת ✅ |
| 7 | וידוא סופי | 0 שגיאות, 0 חוסרים |

**אחרי שלב 7 עם 100% ירוק — מודול 1.5 מוכן להתחלה. פאזה 1 (CSS Foundation) יכולה להתחיל.**

---

## מה פאזה 0 מבטיחה

- **אפס מידע אבוד:** כל פונקציה, טבלה, contract מתועדים ב-GLOBAL_MAP + GLOBAL_SCHEMA
- **אפס התנגשויות עתידיות:** כל מודול חדש יקרא את הגלובליים ויידע מה קיים
- **אפס בלבול:** CLAUDE.md מעודכן — Claude Code יודע בדיוק איפה לקרוא ומה לעדכן
- **אפס סיכון ל-production:** הכל על develop, main לא נגע
- **0.0001% סיכוי לבעיות:** כי שלב 7 מצליב כל מסמך מול כל מסמך אחר
