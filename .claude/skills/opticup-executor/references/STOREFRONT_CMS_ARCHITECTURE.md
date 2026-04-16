# Storefront CMS Architecture — Executor Reference

> **Why this file exists:** On 2026-04-16, SPEC
> `HOMEPAGE_HEADER_LUXURY_REDESIGN` fired a Stop-on-Deviation trigger after
> the executor discovered that the Prizma Homepage, About, and Multifocal-Guide
> pages are **CMS records in Supabase, not Astro source files**. Any edit to
> the `.astro` source would have been invisible in production because a
> CMS-lookup branch short-circuits the rendering and hands control to a
> block-renderer system. This file documents the lesson so the next executor
> checks before editing.

## 1. The trap in one sentence

> **Before modifying any storefront page's Astro source, check whether that
> route has a CMS record in `storefront_pages`. If yes, the edit must go
> through the CMS (Studio UI or SQL UPDATE to the `blocks` JSONB), NOT through
> the Astro file.**

## 2. The rendering fork

The storefront (`opticup-storefront`) ships two rendering paths per route:

```
Request for /{locale}/{slug}
    │
    ▼
[Astro catch-all or /{slug}.astro handler]
    │
    ├── IF storefront_pages row exists for (tenant_id, slug, locale)
    │       └── PageRenderer reads cmsPage.blocks → dispatches to block renderers
    │
    └── ELSE
            └── Hand-coded Astro component composition
```

The **CMS branch wins whenever a row exists**. The Astro file is a fallback.

### Evidence (authoritative file references, current as of 2026-04-16)

- `opticup-storefront/src/pages/index.astro:31-41` — the Homepage handler
  calls `getPageBySlug(tenant.id, '/', 'he')`. If it resolves, it renders
  `<PageRenderer blocks={cmsPage.blocks} />` and exits. Any HTML written
  further down the file is unreachable for tenants whose Homepage is CMS-driven.
- `getPageBySlug` implementation — locate via `grep -rn "getPageBySlug"
  opticup-storefront/src/` (lives in `src/lib/storefront-pages.ts` or similar
  — executor must verify path).
- `PageRenderer` component — locate via `grep -rn "PageRenderer"
  opticup-storefront/src/components/`. It contains a `switch (block.type)` or
  equivalent dispatcher mapping each block type to a renderer.
- `storefront_pages` table schema — see `docs/GLOBAL_SCHEMA.sql` in `opticup`
  (ERP repo) or the live Supabase DB. Columns include `tenant_id`, `slug`,
  `locale`, `page_type`, `blocks` (jsonb), `is_published`.

## 3. Mandatory Pre-Flight for any storefront-content SPEC

Run these checks BEFORE editing any `.astro` file under `opticup-storefront/src/pages/`:

### Step 1 — List every CMS route for the target tenant

```sql
SELECT slug, locale, page_type, is_published, updated_at
FROM storefront_pages
WHERE tenant_id = '<target-tenant-uuid>'
ORDER BY slug, locale;
```

Record the result in `EXECUTION_REPORT.md` §Pre-Flight. Treat every row as a
**blocking** fact: any SPEC task that names one of those slugs must route
through the CMS.

### Step 2 — Locate the renderer fork

```bash
grep -rn "getPageBySlug\|PageRenderer\|cmsPage" opticup-storefront/src/pages/ opticup-storefront/src/components/
```

If you see a branch that returns early when a CMS row is found, that confirms
the fork exists. Mark that file:line in the report.

### Step 3 — Decide: CMS path or Astro path

| Route has storefront_pages row? | vercel.json permanent redirect for route? | Action |
|---|---|---|
| Yes | No | **CMS path** — INSERT/UPDATE `blocks` JSONB; do NOT edit the `.astro` source for this route |
| No | No | **Astro path** — edit the `.astro` source normally |
| Yes | Yes | **STOP** — conflict between redirect and rendered page. Foreman decides. |
| No | Yes | Route is redirect-only. Neither CMS nor Astro change needed. |

## 4. Authoring CMS content (when the decision is "CMS path")

### Option A — Studio UI (preferred for small edits)

Use the ERP-side Studio module to add/edit blocks visually. Studio writes to
`storefront_pages.blocks` under the hood.

### Option B — SQL migration (required for bulk or programmatic content)

For SPECs that populate ≥3 blocks or ≥2 locales, use a SQL migration file
under `supabase/migrations/` and apply it via Supabase MCP's
`apply_migration` (which equals Level 2 SQL autonomy — non-destructive writes
to data tables; approved per SPEC).

Template:

```sql
-- Migration: seed <page> blocks for Prizma (<slug>, <locale>)
-- Rollback: inverse UPDATE to prior blocks array (stored as backup row below)

-- Backup row
INSERT INTO storefront_pages_backups (tenant_id, slug, locale, blocks, backed_up_at)
SELECT tenant_id, slug, locale, blocks, now()
FROM storefront_pages
WHERE tenant_id = '<tenant-uuid>' AND slug = '<slug>' AND locale = '<locale>';

-- Forward
UPDATE storefront_pages
SET blocks = $1::jsonb,
    updated_at = now()
WHERE tenant_id = '<tenant-uuid>' AND slug = '<slug>' AND locale = '<locale>';
```

(If `storefront_pages_backups` does not exist, skip the backup row and rely on
`git revert` of the migration + a re-apply of the previous content migration.
Note the absence in `EXECUTION_REPORT.md` as a FINDING for the next Foreman
cycle.)

## 5. Adding a new block type

When a SPEC adds NEW block renderers (not just content for existing types):

1. **Create the renderer** in `opticup-storefront/src/components/blocks/{BlockName}.astro`.
2. **Register the type** in the `PageRenderer` dispatch (add a `case` branch).
3. **Register in Studio** — ERP-side block registry so authors see the new
   type in the editor. Locate via `grep -rn "block_type\|registerBlock"
   modules/storefront/` (path depends on Studio implementation).
4. **Update `docs/GLOBAL_MAP.md`** — add the new block type to the Storefront
   section's registered-block list (Integration Ceremony).
5. **Rule 20 check** — the renderer must NOT contain tenant-specific strings
   (no hard-coded "Prizma", no tenant UUIDs). Content is data, renderers are
   tenant-agnostic.

## 6. Iron Rules with special weight here

- **Rule 13 — Views-only for external reads:** `storefront_pages` IS read by
  the storefront (via `getPageBySlug`). This is already a RPC/View-shaped read
  via SDK; do NOT add direct `from('storefront_pages')` calls elsewhere.
- **Rule 20 — SaaS litmus:** block renderers ship for ALL tenants. If a tenant
  has no blocks of a given type, that block simply doesn't render. Do NOT
  gate a block type on a tenant identifier.
- **Rule 21 — No Orphans:** if a SPEC replaces hand-coded Astro section files
  with CMS block renderers, DELETE the old Astro files in the same commit.
  Leaving both creates a "which one wins" bug the next time someone touches
  the page.
- **Rule 22 — Defense-in-depth:** every `UPDATE` / `INSERT` on
  `storefront_pages` must include `tenant_id = '<uuid>'` in WHERE/VALUES. RLS
  is belt; the explicit tenant_id is suspenders.

## 7. What goes into EXECUTION_REPORT.md for a CMS SPEC

In §Pre-Flight:
- Output of the Step 1 SELECT above, verbatim.
- File:line of the `getPageBySlug` / `PageRenderer` fork.
- Table from §3 above, filled in for every route the SPEC touches.

In §Deviations:
- Any route where Step 1 returned a row but the SPEC assumed Astro-only. That
  is a SPEC-authoring gap for the Foreman to fix in future SPEC templates.

In §Proposals to improve opticup-executor:
- If Step 1–3 produced a surprise, write a concrete proposal. Example:
  "Add a `storefront_pages` SELECT to Step 1.5 DB Pre-Flight, not only to
  storefront-content SPECs, because a blog SPEC could also trip over a CMS
  override of `/blog`."

## 8. Quick grep cheatsheet

```bash
# Does this route have a CMS record for the target tenant?
#  (run via Supabase MCP execute_sql)
SELECT slug, locale, page_type FROM storefront_pages
WHERE tenant_id = '<uuid>' AND slug = '<slug>';

# Does the renderer fork exist in the code I'm about to edit?
grep -n "getPageBySlug\|cmsPage\|PageRenderer" src/pages/<route>.astro

# Does a block type already exist under this name? (Rule 21)
grep -rn "'<proposed-block-type-name>'" src/components/blocks/ src/components/PageRenderer*

# Are there hard-coded tenant strings in a block renderer? (Rule 20)
grep -rnE "(prizma|פריזמה|6ad0781b|demo-tenant)" src/components/blocks/
```

---

*Authored 2026-04-16 by opticup-strategic during HOMEPAGE_HEADER_LUXURY_REDESIGN
re-scope (Option D). First executor expected to apply: the same Windows Claude
Code session continuing that SPEC.*
