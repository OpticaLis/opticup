# MIGRATION_STATUS — WordPress Pages Migration
## Date: 2026-04-04

---

## SQL Files Ready to Run (in order)

| # | File | Action | Table |
|---|------|--------|-------|
| 1 | `sql/INSERT-campaign-tiers-template.sql` | INSERT template | storefront_block_templates |
| 2 | `sql/UPDATE-supersalepricescatalog-v2.sql` | UPDATE blocks | storefront_pages |
| 3 | `sql/INSERT-page-eventsunsubscribe.sql` | INSERT/UPDATE | storefront_pages |
| 4 | `sql/INSERT-page-kupat-klalit.sql` | INSERT/UPDATE | storefront_pages |
| 5 | `sql/INSERT-page-multi.sql` | INSERT/UPDATE | storefront_pages |
| 6 | `sql/INSERT-page-myopia.sql` | INSERT/UPDATE | storefront_pages |
| 7 | `sql/INSERT-page-multifocal.sql` | INSERT/UPDATE | storefront_pages |
| 8 | `sql/INSERT-page-prizmaexpress.sql` | INSERT/UPDATE | storefront_pages |
| 9 | `sql/INSERT-or-UPDATE-prizma-express-terms.sql` | UPDATE | storefront_pages |

**All use ON CONFLICT ... DO UPDATE — safe to re-run.**

---

## Page Migration Status

| WordPress URL | Storefront Slug | Type | Status |
|---------------|----------------|------|--------|
| /supersalepricescatalog/ | /supersalepricescatalog/ | custom | Refactored to 3 blocks (was 1 monolithic custom) |
| /eventsunsubscribe/ | /eventsunsubscribe/ | custom | SQL ready |
| /קופח-כללית/ | /קופח-כללית/ | guide | SQL ready |
| /multi/ | /multi/ | landing | SQL ready |
| /מיופיה/ | /מיופיה/ | guide | SQL ready |
| /משקפי-מולטיפוקל/ | /משקפי-מולטיפוקל/ | guide | SQL ready |
| /prizmaexpress/ | /prizmaexpress/ | custom | SQL ready, inactive banner added, redirect removed |
| /prizma-express-terms/ | /prizma-express-terms/ | legal | Already exists, SQL updates content |

---

## New Block Type

- **campaign_tiers** (#21): Modular price tier cards for campaigns
  - Component: `src/components/blocks/CampaignTiersBlock.astro`
  - Sub-component: `src/components/campaign/TierCard.astro`
  - Registered in types.ts, registry.ts, BlockRenderer.astro
  - Studio schema added in ERP: `modules/storefront/studio-block-schemas.js`
  - Template SQL: `sql/INSERT-campaign-tiers-template.sql`

---

## Redirect Conflicts (Resolved)

| Source | Destination | Issue | Resolution |
|--------|-------------|-------|------------|
| `/prizmaexpress` | `/` (homepage) | Conflicted with new page at `/prizmaexpress/` | Redirect removed from vercel.json |
| `/multifocal/` | `/multifocal-guide/` | No conflict (different from `/משקפי-מולטיפוקל/`) | No action needed |

---

## CLAUDE.md Updates

- Added table schemas for 7 write-target tables (storefront_pages, storefront_components, storefront_block_templates, campaigns, cms_leads, media_library, storefront_reviews)
- Updated block types count to 21 (added campaign_tiers)

---

## Remaining Blockers for DNS Switch

1. **SQL execution pending**: Daniel must run all 9 SQL files above in Supabase
2. **Brand pages SQL pending**: SQL 048, 049, 050 (from previous session) still need to be run
3. **Visual verification**: After SQL execution, verify all new pages render correctly at their slugs
4. **SEO verification**: Ensure all migrated pages have proper meta tags and are in sitemap
5. **prizmaexpress page**: Verify inactive banner renders correctly after SQL execution
