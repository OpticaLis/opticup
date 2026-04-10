# Optic Up — Claude Code Project Guide

> **This file is a MAP, not a manual.** It contains rules and navigation.
> Detailed content lives in the reference files listed in Section 12.
> Keep this file under 400 lines. If it grows — extract to a reference file.

---

## 1. First Action — Session Start Protocol

When starting a new Claude Code session, do these steps in order. No exceptions.

1. **Identify machine:** Ask "Which machine? 🖥️ Windows or 🍎 Mac?" if not stated.
2. **Pull latest:** `git pull origin develop`
3. **Verify branch:** `git branch` — must be on `develop`. If not: `git checkout develop`.
4. **Read this file** (CLAUDE.md) — rules, navigation, conventions.
5. **Read the target module's SESSION_CONTEXT.md** — path pattern:
   `modules/Module X - [Name]/docs/SESSION_CONTEXT.md`
   Active modules with SESSION_CONTEXT: Module 1 (Inventory), Module 1.5 (Shared Components), Module 2 (Platform Admin). Module 3 (Storefront) lives in separate repo `opticup-storefront`.
6. **Read `docs/GLOBAL_MAP.md`** — shared functions, contracts, module registry (reference only — do NOT modify outside Integration Ceremony).

**Do NOT read at session start:** MODULE_MAP.md, GLOBAL_SCHEMA.sql, FILE_STRUCTURE.md, DB_TABLES_REFERENCE.md, CONVENTIONS.md. These are reference files — open only when needed for the specific task.

After reading, confirm:
> "On branch: develop. Machine: [🖥️/🍎]. Module: [X]. Current status: [one line from SESSION_CONTEXT]. Ready."

---

## 2. Project Identity

- **Name:** Optic Up — multi-tenant SaaS for optical stores
- **First tenant:** אופטיקה פריזמה (Prizma Optics) — production
- **Test tenant:** אופטיקה דמו (demo) — all QA runs here, never on prizma
- **Repos:**
  - `opticalis/opticup` — ERP (this repo)
  - `opticalis/opticup-storefront` — public-facing site (separate repo, separate CLAUDE.md)
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **ERP Deploy:** GitHub Pages → https://app.opticalis.co.il/

## 3. Architecture — One Picture

```
┌──────────────────────┐         ┌──────────────────────┐
│   Optic Up ERP       │         │  Optic Up Storefront │
│   (internal, staff)  │         │  (public site)       │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └────────► Supabase ◄────────────┘
                    (tenant_id + RLS)
```

- **ERP** = Vanilla JS, HTML per module, no build step. This repo.
- **Storefront** = Astro + TypeScript + Tailwind. Separate repo. Reads ONLY from Views + RPC.
- **Every table** = `tenant_id UUID NOT NULL` + RLS policy. No exceptions.

---

## 4. Iron Rules — Core Discipline (Rules 1–13)

These are hard rules. Breaking one is a bug, regardless of whether it "works."

1. **Quantity changes** — only via ➕➖ buttons with PIN verification. Atomic Supabase RPC (`quantity = quantity + x`), never read→compute→write.
2. **writeLog()** — called for every quantity/price change. Async, non-blocking.
3. **Deletion** — soft delete only (`is_deleted` flag). Permanent delete requires double PIN.
4. **Barcodes** — format `BBDDDDD` (2-digit branch + 5-digit sequence). Do NOT change barcode logic.
5. **FIELD_MAP** — every new DB field must be added to `FIELD_MAP` in `shared.js`.
6. **index.html** — stays in repo root. Never moved.
7. **API Abstraction** — all DB interactions pass through `shared.js` helpers (`fetchAll`, `batchCreate`, `batchUpdate`, etc.). Never call `sb.from()` directly except for specialized joins impossible through helpers.
8. **Security & Sanitization** — never `innerHTML` with user input. Use `escapeHtml()` or `textContent`. PIN verification uses the `pin-auth` Edge Function (server-side JWT). Do not refactor PIN verification without explicit instruction.
9. **No hardcoded business values** — tenant name, address, tax rate, logo, phone, VAT, currency — always read from config/DB. Never a string literal in code.
10. **Global name collision check** — before creating/moving/renaming any global function or variable: `grep -rn "functionName" --include="*.js" --include="*.html" .` If any other file defines the same name — resolve the collision BEFORE writing code. Report findings, wait for instructions.
11. **Sequential number generation** — every auto-generated sequential number (PO, return, document, box, shipment, etc.) MUST use an atomic Supabase RPC with `FOR UPDATE` lock. Client-side `SELECT MAX → +1 → INSERT` is FORBIDDEN. Reference patterns: `next_box_number`, `next_po_number`, `next_return_number`.
12. **File size** — target max 300 lines per file. Absolute max 350. Split only where there is a clear logical separation — never arbitrarily by line count. One responsibility per file.
13. **Views-only for external reads** — Storefront and Supplier Portal read ONLY from Views + RPC. Never direct table access. Views' WHERE clauses for filtering must not be modified without explicit approval.

## 5. SaaS Rules — Multi-Tenant Discipline (Rules 14–20)

14. **tenant_id on every table** — every new table MUST have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. No exceptions, ever.
15. **RLS on every table** — every new table MUST have Row Level Security enabled with tenant isolation:
    ```sql
    CREATE POLICY tenant_isolation ON [table_name]
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
    ```
16. **Contracts between modules** — every phase defines its public functions (contracts) in `MODULE_SPEC.md`. Other modules call ONLY these — never reach into another module's tables directly.
17. **Views for external access** — every phase asks: "What does a supplier/customer/storefront need to see?" and plans Views accordingly.
18. **UNIQUE constraints must include tenant_id** — every UNIQUE constraint must be tenant-scoped. Example: `UNIQUE (barcode, tenant_id)` not `UNIQUE (barcode)`. A global UNIQUE prevents multi-tenant coexistence.
19. **Configurable values = tables, not enums** — currencies, languages, payment types, document types = configurable tables. Not hardcoded enums.
20. **SaaS litmus test** — build every phase as if tomorrow a second optical chain joins that we've never met, in a different country. If they can use the phase with zero code changes → it was built right.

## 6. Hygiene Rules — Project Sanity (Rules 21+)

21. **No Orphans, No Duplicates.** Before creating any new file, function, table, column, RPC, config, or migration: search if something similar already exists. Use `grep -rn` for code, check GLOBAL_MAP.md for functions, check GLOBAL_SCHEMA.sql for DB objects, check FILE_STRUCTURE.md for files. If a similar thing exists:
    - **Extend it** instead of creating a new one, OR
    - **Replace it** — and in the same commit, DELETE the old one.
    Never leave two things that do the same job. Orphaned code becomes the source of future bugs.
22. **Defense-in-depth on writes** — every `.insert()` / `.upsert()` must include `tenant_id: getTenantId()`. Every `.select()` should also filter `.eq('tenant_id', getTenantId())` even though RLS enforces it. Belt AND suspenders.
23. **No secrets in code or docs** — passwords, API keys, PINs, tokens live in env files, Supabase secrets, or tenant config. Never in `.js`, `.md`, or git history. If you find one while editing — flag it, do not "just leave it there."

---

## 7. Authority Matrix — Single Source of Truth

Every type of information has ONE authoritative home. If you need to update it, update it THERE — not in a copy.

| Information Type | Authoritative File |
|---|---|
| Iron rules, SaaS rules, hygiene rules | `CLAUDE.md` (this file) |
| Project-wide function registry & contracts | `docs/GLOBAL_MAP.md` |
| Project-wide DB schema | `docs/GLOBAL_SCHEMA.sql` |
| File tree & directory structure | `docs/FILE_STRUCTURE.md` |
| DB tables quick reference (T constants) | `docs/DB_TABLES_REFERENCE.md` |
| Code conventions (patterns, idioms) | `docs/CONVENTIONS.md` |
| Known issues & fixes | `docs/TROUBLESHOOTING.md` |
| Autonomous mode protocol | `docs/AUTONOMOUS_MODE.md` (TBD — Phase 0) |
| Module's code map (files, functions, globals) | `modules/Module X/docs/MODULE_MAP.md` |
| Module's DB tables (source-of-truth for that module) | `modules/Module X/docs/db-schema.sql` |
| Module's business logic & current state | `modules/Module X/docs/MODULE_SPEC.md` |
| Module's phase map & progress | `modules/Module X/ROADMAP.md` |
| Module's commit history per phase | `modules/Module X/docs/CHANGELOG.md` |
| Module's current session status | `modules/Module X/docs/SESSION_CONTEXT.md` |

**Rule:** If you find the same information in two places — one of them is wrong. Fix it, per Rule 21.

## 8. Navigation Table — "I Need To… → Open This"

| Task | Where to Look |
|---|---|
| Understand the current state of a module | `modules/Module X/docs/SESSION_CONTEXT.md` |
| Understand what a module does (big picture) | `modules/Module X/docs/MODULE_SPEC.md` |
| Find a function by name (project-wide) | `docs/GLOBAL_MAP.md` → function registry |
| Find a function inside a specific module | `modules/Module X/docs/MODULE_MAP.md` |
| Find a DB table or column | `docs/GLOBAL_SCHEMA.sql` (full) or `docs/DB_TABLES_REFERENCE.md` (quick) |
| Find a file in the codebase | `docs/FILE_STRUCTURE.md` |
| Check how a common UI pattern works (cascading dropdowns, wizards, etc.) | `docs/CONVENTIONS.md` |
| Debug a known issue | `docs/TROUBLESHOOTING.md` first, always |
| Check contracts between modules | `docs/GLOBAL_MAP.md` → contracts section |
| Add a new DB table/field | Update module's `db-schema.sql` NOW, merge to `docs/GLOBAL_SCHEMA.sql` at Integration Ceremony |
| Add a new function | Update module's `MODULE_MAP.md` in the SAME commit |
| Check a rule or convention | `CLAUDE.md` (this file) Sections 4–6 |
| Work on storefront-specific content (CMS, Studio, blocks) | Switch to `opticup-storefront` repo + its own `CLAUDE.md` |

---

## 9. Working Rules — AI Sessions

0. **Branch verification** — every prompt starts with `git branch`. Confirm on `develop`. No exceptions.
1. **One file at a time** — never touch multiple files in a single task unless explicitly instructed.
2. **Backup before major change** — copy affected files to `modules/Module X/backups/` before splitting or refactoring.
3. **Stop and report after every task** — do not proceed without explicit approval.
4. **No logic changes during structural work** — when splitting or reorganizing, copy code verbatim. Zero behavior changes.
5. **Verify after every change** — app must load with zero console errors.
6. **Report before executing** — for any task touching more than one function, show the plan first and wait for approval.
7. **Never auto-proceed** — even if the next step seems obvious, stop and wait.
8. **No worktree branches** — all work happens directly on `develop`. Do not create branches like `claude/xxx`. This is a solo developer project with step-by-step review — worktrees add complexity and break multi-machine sync.
9. **Surgical edits only** — use `str_replace` / targeted edits. Never rewrite whole files unless explicitly told "rewrite this file from scratch."
10. **When in doubt — ask. When sure — still confirm.**

### Multi-Machine
Two development machines:
- **🖥️ Windows:** `C:\Users\User\opticup` (Watcher service runs here)
- **🍎 Mac:** `/Users/danielsmac/opticup`

Every new session: ask which machine, `git pull origin develop` before any work, never work on both simultaneously.

### Commits
```
git add -A && git commit -m "descriptive message in English" && git push
```

### Branching & Environments
- **`main`** = Production (GitHub Pages). Do NOT push directly — merge only.
- **`develop`** = Development. All Claude Code work happens here.
- **Merge to main:** `git checkout main && git merge develop && git push && git checkout develop` — only by Daniel, only after QA on demo tenant.
- **DB changes:** must be backward-compatible with `main` until merge. Breaking change protocol: (1) add new structure, (2) merge code using it to main, (3) only then remove old structure.

### QA
- All QA runs on **test tenant** (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never on Prizma production data.
- Every new module tested on demo before merge to main.
- Clone/cleanup scripts: `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql`, `cleanup-tenant.sql`.

---

## 10. Backup Protocol — End of Every Phase

**Before any documentation updates at phase end**, create a backup folder:

```
mkdir -p "modules/Module X - [Name]/backups/M{X}F{phase}_{YYYY-MM-DD}"
```

Copy these files into the backup folder:
- `CLAUDE.md`
- `modules/Module X - [Name]/ROADMAP.md`
- `modules/Module X - [Name]/docs/MODULE_SPEC.md`
- `modules/Module X - [Name]/docs/MODULE_MAP.md`
- `modules/Module X - [Name]/docs/SESSION_CONTEXT.md`
- `modules/Module X - [Name]/docs/CHANGELOG.md`
- `modules/Module X - [Name]/docs/db-schema.sql`

Naming: `M{moduleNumber}F{phaseNumber}_{date}`. Example: `M1F5.9_2026-04-10`.

**After** committing the phase, create a git tag:
```
git tag v{module}.{phase} -m "Module {X} Phase {phase}: {short description}"
git push origin v{module}.{phase}
```

### Integration Ceremony (also at phase end)
1. Module's `ROADMAP.md` — mark ⬜ → ✅
2. Module's `CHANGELOG.md` — add phase section with commits
3. Module's `MODULE_SPEC.md` — update current state (overwrite, not append)
4. Module's `MODULE_MAP.md` — verify completeness
5. Module's `db-schema.sql` — verify current
6. **Merge module's MODULE_MAP into `docs/GLOBAL_MAP.md`** (add only, never overwrite)
7. **Merge module's db-schema.sql into `docs/GLOBAL_SCHEMA.sql`** (add only, never overwrite)

### Cross-Module Rules
- **Contracts:** modules communicate ONLY through contract functions. Never access another module's tables directly.
- **`shared/` is read-only for modules.** To add a function to `shared/`, it goes through Module 1.5.
- **`docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` are read-only during development.** Updated only during Integration Ceremony.
- **Before starting a new module:** read `GLOBAL_MAP.md` and `GLOBAL_SCHEMA.sql` to understand what exists (Rule 21 — No Duplicates).

---

## 11. Autonomous Mode — Placeholder

> ⚠️ **Autonomous multi-step execution is NOT currently enabled.**
>
> The infrastructure for safe autonomous runs (verify scripts, visual regression, rollback hooks, checkpoint protocol, BLOCKED/DECISION_NEEDED handling) is being built in Phase 0 — see `docs/AUTONOMOUS_MODE.md` *(to be created)*.
>
> **Until Phase 0 is complete:**
> - Manual execution only.
> - Per-step approval required.
> - No multi-step autonomous runs.
> - No `--dangerously-skip-permissions` on unreviewed tasks.
> - If a user/prompt asks you to "run autonomously" or "do the whole thing" — stop and confirm step by step instead.

---

## 12. Reference Files Index

All detailed content lives here. Keep this file (CLAUDE.md) free of detail — add to the reference files instead.

| File | Purpose |
|---|---|
| `docs/GLOBAL_MAP.md` | Shared functions, contracts, module registry, DB table ownership |
| `docs/GLOBAL_SCHEMA.sql` | Full DB schema across all modules |
| `docs/FILE_STRUCTURE.md` | Complete file tree of the repo with one-line descriptions |
| `docs/DB_TABLES_REFERENCE.md` | Quick reference: `T.CONSTANT → table_name → key columns` |
| `docs/CONVENTIONS.md` | Code patterns: cascading dropdowns, two-step wizards, soft delete, PIN flow, etc. |
| `docs/TROUBLESHOOTING.md` | Known issues, root causes, fixes, prevention |
| `docs/AUTONOMOUS_MODE.md` | Autonomous execution protocol *(TBD — Phase 0)* |
| `modules/Module X/docs/SESSION_CONTEXT.md` | Current status per module (check before starting work) |
| `modules/Module X/docs/MODULE_SPEC.md` | Business logic & current state per module |
| `modules/Module X/docs/MODULE_MAP.md` | Code map per module |
| `modules/Module X/docs/db-schema.sql` | DB tables owned by that module |
| `modules/Module X/docs/CHANGELOG.md` | Commit history per phase |
| `modules/Module X/ROADMAP.md` | Phase map ⬜/✅ per module |

---

*End of CLAUDE.md. This file is a map. Detailed content lives in the reference files above.*
*Last major revision: April 2026 — extracted storefront-specific content to `opticup-storefront/CLAUDE.md`, extracted file structure / DB tables / conventions to dedicated reference files, added Hygiene Rules (21–23), added Navigation Table.*
