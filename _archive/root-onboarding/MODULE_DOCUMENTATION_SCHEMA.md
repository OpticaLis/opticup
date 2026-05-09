# Module Documentation Schema — How Optic Up Documentation Lives Across Two Repos

> **Authoritative artifact of Module 3.1 — Project Reconstruction.**
> Defines how every Optic Up module's documentation is owned, located, and cross-referenced across the dual-repo split (`opticalis/opticup` and `opticalis/opticup-storefront`).
> Adopted: 2026-04-11 (Main Strategic Chat approval of R13).
> Status: BINDING for all modules from Module 3.1 forward.

---

## 1. Purpose

This schema is the project-wide rulebook for documentation ownership. It exists because Module 3 introduced two changes simultaneously — a second repository (`opticup-storefront`) and a new 4-layer chat hierarchy — and the existing documentation conventions were not designed for either.

The schema answers six questions every module needs to answer the same way:

1. **Where does a doc live** when its content describes work that crosses the two repos?
2. **Who owns it** — which repo is the authoritative source?
3. **How does the other repo reference it** without duplicating its content?
4. **What does a "pointer" look like** when it points across repos?
5. **What constitutes a duplicate** that must be eliminated?
6. **How are shared DB objects (tables, views) declared** when multiple modules touch them?

Without consistent answers, documentation drifts: each module invents its own convention, references rot, and the same content ends up in three places with three different versions.

---

## 2. Context — Why This Schema Exists

Until Module 2, the project lived in a single repo (`opticalis/opticup`) and documentation followed a stable per-module pattern: each module had its own folder, its own `MODULE_MAP.md`, its own `db-schema.sql`, its own `SESSION_CONTEXT.md`, and a project-wide `GLOBAL_MAP.md` + `GLOBAL_SCHEMA.sql` aggregated everything during the Integration Ceremony.

Module 3 broke that model in two ways:

1. **Dual-repo split.** Most of the storefront code moved to a new repo, `opticalis/opticup-storefront` (Astro + TypeScript + Tailwind). The Studio (admin UI for managing storefront content) stayed in `opticup/modules/storefront/`. Documentation about Module 3 now had to describe code, schemas, and rules that lived on **both** sides — but with no canonical answer to "which side owns each doc?" docs were either duplicated, fragmented, or simply absent on one side.

2. **New 4-layer chat hierarchy.** Strategic chats, secondary chats, Claude Code, and the Main strategic chat each touch documentation differently. Without a schema, each chat invented its own conventions in real-time, and different chats produced inconsistent files.

Phase 1C of Module 3.1 audited every Module 3 doc across both repos and surfaced the underlying problem in a single recommendation, **R13**. Main Strategic Chat approved R13 as the basis for this schema, with two additions (Rule 5 on pointer-stub format and Rule 6 on schema-in-pieces).

This document is the result.

---

## 3. The Six Rules

### Rule 1 — Side B (storefront) ownership scope

`opticalis/opticup-storefront` is the **authoritative source** for all documentation that describes:

- Storefront code structure (Astro pages, components, layouts, API routes)
- Iron Rules 24–31 (storefront-scoped rules: Views-only, image proxy, RTL-first, mobile-first, View Modification Protocol, Safety Net, Quality Gates)
- View contracts (the allow-listed Supabase views that storefront reads from)
- CSS / RTL / i18n rules
- Image proxy convention
- Astro / Vercel deployment
- Frontend constitution (the storefront's own `CLAUDE.md`)
- Quality Gates and security rules for API routes
- Reference-file classification for storefront docs
- Frontend `TECH_DEBT.md`
- Brand content rules (`BRAND_CONTENT_GUIDE.md`)
- Golden Reference subqueries for views (`TROUBLESHOOTING.md §1`)

**Layout convention on Side B:** these reference docs live at the **repo root** (e.g. `opticup-storefront/CLAUDE.md`, `opticup-storefront/VIEW_CONTRACTS.md`), not under a `docs/` subfolder. This is the existing convention and will not change. (R14, decided 2026-04-11.)

#### Worked example

✅ **Correct:** A new component for the storefront brand pages is documented in `opticup-storefront/COMPONENT_CHECKLIST.md`. The Side A `CLAUDE.md` does not mention it.

❌ **Incorrect:** The same component is also documented in `opticup/modules/Module 3 - Storefront/docs/MODULE_MAP.md` with full description. This duplicates the source of truth. Side A may carry only a pointer stub (see Rule 3).

---

### Rule 2 — Side A (ERP/Studio) ownership scope

`opticalis/opticup` is the **authoritative source** for all documentation that describes:

- Module 3 Studio UI files (`opticup/modules/storefront/`)
- ERP-side commit history for Module 3
- Module 3 ROADMAP and phase history (the strategic-level view of where Module 3 has been and where it's going)
- Module 3 execution logs (Hotfix log, Phase A log, etc.)
- Module 3 discovery reports (the `discovery/` folder)
- Module 3 old prompts archive
- Cross-Module Safety Protocol for Module 3
- Iron Rules 1–23 (ERP-scoped rules — the canonical source is `opticup/CLAUDE.md`)
- Project-wide `GLOBAL_MAP.md`, `GLOBAL_SCHEMA.sql`, `FILE_STRUCTURE.md`, `DB_TABLES_REFERENCE.md`, `CONVENTIONS.md`, `TROUBLESHOOTING.md`, `AUTONOMOUS_MODE.md`
- `MASTER_ROADMAP.md`, `CLAUDE.md`, `STRATEGIC_CHAT_ONBOARDING.md`, and the universal templates (this file, `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`, `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`, `DANIEL_QUICK_REFERENCE.md`)

**Layout convention on Side A:** project-wide reference docs live at the repo root (e.g. `opticup/CLAUDE.md`) or under `opticup/docs/` (e.g. `opticup/docs/GLOBAL_MAP.md`). Per-module docs live under `opticup/modules/Module X - Name/docs/`.

#### Worked example

✅ **Correct:** The Module 3 ROADMAP rewrite from Phase A is at `opticup/modules/Module 3 - Storefront/ROADMAP.md`. Side B does not have a parallel ROADMAP file.

❌ **Incorrect:** Side B carries `opticup-storefront/MODULE_3_ROADMAP.md` because "the storefront team needs to see it." Wrong — Side B may carry only a pointer stub (Rule 3) if this is even necessary, which it usually isn't.

---

### Rule 3 — Pointer-stub pattern for cross-side topics

Some topics span both sides — neither repo is fully authoritative on its own. For these, **both sides carry a pointer stub** that names the canonical document and where it lives. The pointer-stub format is defined in Rule 5.

**Examples of cross-side topics that require pointer stubs on both sides:**

- **SCHEMAS.md** — Authoritative on Side B (`opticup-storefront/SCHEMAS.md`). Side A `MODULE_MAP.md` for Module 3 carries a pointer.
- **VIEW_CONTRACTS.md** — Authoritative on Side B. Side A Studio code (`opticup/modules/storefront/`) carries a pointer in its module-level docs.
- **MODULE_MAP.md** — Each side has its own slice (Side A: Studio files; Side B: storefront components). The Side A `MODULE_MAP.md` carries a top-level overview that points to both.
- **CHANGELOG.md** — Each side has its own (`opticup/modules/Module 3 - Storefront/docs/CHANGELOG.md` and `opticup-storefront/CHANGELOG.md`). The Side A version is the master and points to the Side B version.
- **SESSION_CONTEXT.md** — Each side has its own. Both must be kept in sync at the strategic-chat level.

#### Worked example

✅ **Correct:** Side A's `opticup/modules/Module 3 - Storefront/docs/MODULE_MAP.md` has a section "Storefront components — see `opticup-storefront/MODULE_MAP.md` (canonical, ~125 src/ files, 15,550 lines)." That's a pointer stub. The actual list of components lives only on Side B.

❌ **Incorrect:** Side A's `MODULE_MAP.md` lists every component name with file paths and descriptions. This is duplication — Side B's content is now mirrored on Side A and will drift the moment one side updates without the other.

---

### Rule 4 — Single-authoritative artifacts (never duplicated)

Some artifacts must exist in exactly one place. They are not pointer-stubbed; they are simply **owned by one side and referenced from the other only when absolutely necessary, by name, without copying content**.

**Single-authoritative artifacts:**

| Artifact | Lives in | Why single-authoritative |
|---|---|---|
| The 6 brand content rules | `opticup-storefront/BRAND_CONTENT_GUIDE.md` (and the `generate-brand-content` Edge Function `styleGuide` constant — kept in sync) | Single source of truth for content IP. Multiple copies = drift = wrong content shipped. |
| Golden Reference subqueries for storefront views | `opticup-storefront/TROUBLESHOOTING.md §1` (referenced from `VIEW_CONTRACTS.md`) | One canonical SQL pattern per view. Multiple copies = wrong subquery used in production debugging. |
| Iron Rules 1–23 | `opticup/CLAUDE.md` | These govern the ERP repo. Cross-referenced from `opticup-storefront/CLAUDE.md §4` by name only — never copied. |
| Iron Rules 24–31 | `opticup-storefront/CLAUDE.md` | These govern the storefront repo. Cross-referenced from `opticup/CLAUDE.md §6` by name only — never copied. |
| `MASTER_ROADMAP.md` | `opticup/` (root) | Project-wide. There is no "storefront MASTER_ROADMAP." Side B does not have a copy. |
| `GLOBAL_MAP.md` and `GLOBAL_SCHEMA.sql` | `opticup/docs/` | Project-wide function and schema registries. Side B is read-only with respect to these (it consumes views, it does not declare them). |
| Universal chat templates (this file + `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` + `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` + `DANIEL_QUICK_REFERENCE.md`) | `opticup/` (root) | Single source of truth for the project's working method. No mirror on Side B. |

#### Worked example

✅ **Correct:** A new chat opens for storefront work, references `opticup-storefront/CLAUDE.md §4` ("Iron Rules 1–23 are inherited from the ERP repo — see `opticup/CLAUDE.md` for the canonical text"). The storefront `CLAUDE.md` has a one-line cross-reference, not a copy of the rules.

❌ **Incorrect:** `opticup-storefront/CLAUDE.md` includes the full text of Iron Rules 1–23 "for the convenience of storefront developers." Now the rules exist twice. The next time Iron Rule 11 is updated in `opticup/CLAUDE.md`, the storefront copy drifts. Within a quarter, the two are out of sync and a developer makes a decision based on the stale copy.

---

### Rule 5 — Pointer-stub format (NEW)

When a doc on one side references content authoritative on the other side, the pointer **must include all four of the following** and **must not exceed 4 lines**:

1. **The canonical name** of the authoritative doc (exact filename)
2. **The repo it lives in** (`opticup` or `opticup-storefront`)
3. **A one-line summary** of what's in it (so the reader knows whether to follow the pointer)
4. **The path or URL** (relative path within the repo, or full GitHub URL if cross-repo on a remote system)

**Pointer stubs must be updated when the authoritative doc moves or is renamed.** This is a hard rule, not a guideline. Renaming a doc without updating its pointer stubs creates broken references that block the next session that follows them.

#### Format template

```
> **See:** `[CANONICAL_NAME.md]` (`[repo]`) — [one-line summary].
> Path: `[relative/path/from/repo/root]`
```

#### Worked example

✅ **Correct (4 lines):**
```
> **See:** `VIEW_CONTRACTS.md` (`opticup-storefront`) — full list of allow-listed
> Supabase views the storefront reads from, with Golden Reference subqueries
> for each.
> Path: `VIEW_CONTRACTS.md` (repo root)
```

✅ **Correct (3 lines):**
```
> **See:** `BRAND_CONTENT_GUIDE.md` (`opticup-storefront`) — the 6 brand content rules.
> Path: `BRAND_CONTENT_GUIDE.md` (repo root)
```

❌ **Incorrect — missing repo:**
```
> **See:** `VIEW_CONTRACTS.md` for the views list.
```
This pointer fails Rule 5: no repo, no summary, no path. A reader landing on this from a third-party tool has no way to find the file.

❌ **Incorrect — too long (8 lines):**
```
> **See:** VIEW_CONTRACTS.md in opticup-storefront. This file contains the
> complete list of allow-listed Supabase views, with Golden Reference subqueries
> for each one. The Golden Reference subqueries are the SQL patterns used to
> query the views in production. They are also referenced from TROUBLESHOOTING.md
> §1, which is the canonical home of the subqueries themselves. Note that
> VIEW_CONTRACTS.md was last updated by Phase A of Module 3 on 2026-04-09,
> and is currently TIER-C-PENDING for further updates.
> Path: VIEW_CONTRACTS.md
```
This pointer fails Rule 5: 8 lines, mixes summary with history, includes status notes that belong elsewhere. Pointer stubs are navigation aids, not abstracts.

---

### Rule 6 — Tables that span multiple modules (schema-in-pieces) (NEW)

A DB table created by one module and `ALTER`ed by later modules is a **single object with multiple authors**. The authoritative declaration of such a table lives in `opticup/docs/GLOBAL_SCHEMA.sql`. Each module that `ALTER`s the table must include an **extension stub** in its own `db-schema.sql` that points back to `GLOBAL_SCHEMA.sql` for the full definition.

**Why:** Phase 1B of Module 3.1 found that `tenants` and `employees` tables are defined in pieces across three module schemas (Module 1 creates them, Module 1.5 ALTERs them, Module 2 ALTERs them with 10 more columns). The `ALTER` statements are additive (not conflicting), but no single source of truth exists. The pattern matches Rule 5's pointer-stub principle: the authoritative declaration lives in one place, and other modules reference it.

**Format for an extension stub in a module's `db-schema.sql`:**

```sql
-- Extension to shared table `tenants` (created by Module 1)
-- This module adds the following columns:
--   plan_id UUID REFERENCES plans(id)
--   status TEXT NOT NULL DEFAULT 'active'
--   trial_ends_at TIMESTAMPTZ
-- Full definition: see `opticup/docs/GLOBAL_SCHEMA.sql` (canonical, all ALTERs merged).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
```

#### Worked example

✅ **Correct:** Module 2's `db-schema.sql` includes the extension stub above. The full `tenants` definition with all 9 columns is in `opticup/docs/GLOBAL_SCHEMA.sql`. A new contributor reading Module 2's schema sees the comment and knows where to find the full picture.

❌ **Incorrect:** Module 2's `db-schema.sql` declares the full `CREATE TABLE tenants (...)` with all 9 columns, including the columns that Module 1 originally created. Now `tenants` exists in two places — Module 1's `db-schema.sql` and Module 2's `db-schema.sql` — and they will drift. The next module to ALTER `tenants` will not know which file to update.

---

## 4. Cross-References — Artifacts That Demonstrate These Rules

The following existing artifacts demonstrate the rules above. They are listed using Rule 5's pointer-stub format (meta!).

### Demonstrates Rule 1 (Side B ownership)

> **See:** `CLAUDE.md` (`opticup-storefront`) — the storefront repo's constitution; canonical home of Iron Rules 24–31, View Modification Protocol, Safety Net.
> Path: `CLAUDE.md` (repo root)

> **See:** `VIEW_CONTRACTS.md` (`opticup-storefront`) — full list of allow-listed Supabase views the storefront reads from.
> Path: `VIEW_CONTRACTS.md` (repo root)

### Demonstrates Rule 2 (Side A ownership)

> **See:** `CLAUDE.md` (`opticup`) — the ERP repo's constitution; canonical home of Iron Rules 1–23, Authority Matrix, First Action Protocol.
> Path: `CLAUDE.md` (repo root)

> **See:** `GLOBAL_MAP.md` (`opticup`) — project-wide function registry and contracts between modules.
> Path: `docs/GLOBAL_MAP.md`

### Demonstrates Rule 3 (pointer-stub pattern)

> **See:** `MODULE_MAP.md` (`opticup-storefront`) — storefront-side component map; the Side A Module 3 `MODULE_MAP.md` carries a pointer to this file.
> Path: `MODULE_MAP.md` (repo root)

### Demonstrates Rule 4 (single-authoritative)

> **See:** `BRAND_CONTENT_GUIDE.md` (`opticup-storefront`) — the 6 brand content rules; not duplicated anywhere else in the project.
> Path: `BRAND_CONTENT_GUIDE.md` (repo root)

### Demonstrates Rule 5 (pointer-stub format)

This document's §3 Rule 5 is itself the canonical example. The cross-references in this §4 are also live examples of the format in use.

### Demonstrates Rule 6 (schema-in-pieces)

> **See:** `GLOBAL_SCHEMA.sql` (`opticup`) — full DB schema across all modules, with all `tenants` and `employees` ALTERs merged into single canonical definitions.
> Path: `docs/GLOBAL_SCHEMA.sql`

> **See:** `db-schema.sql` (`opticup` — Module 2 folder) — Module 2's schema; includes extension stubs for `tenants` columns added by this module. Reference example for Rule 6.
> Path: `modules/Module 2 - Platform Admin/docs/db-schema.sql`

---

## 5. Enforcement and Maintenance

This schema is binding for all modules from Module 3.1 forward. New modules must:

1. **Start every doc with a Rule 1 / Rule 2 ownership decision** — which side owns this doc?
2. **Use Rule 5 pointer-stub format** for all cross-side references. No improvising.
3. **Use Rule 6 extension stubs** for all `ALTER`s on shared tables. The full `CREATE TABLE` lives only in `GLOBAL_SCHEMA.sql`.
4. **Audit pointer stubs in Phase 0 of every module** — verify all stubs still resolve to existing files. Broken stubs are a Phase 0 fail.
5. **Update pointer stubs when files move** — this is part of every commit that renames or relocates a doc. No exceptions.

The schema itself is a Side A artifact (lives at `opticup` root). It is not duplicated to Side B; storefront secondary chats receive it as text in their first message when they need it.

---

*End of MODULE_DOCUMENTATION_SCHEMA.md.*
*Last updated: 2026-04-11 (Module 3.1 Phase 3B — initial creation).*
