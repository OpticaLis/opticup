# Optic Up Storefront — Claude Code Project Guide

## First Action — Read This Before Anything Else

When starting a new session:
1. Verify you are on `develop` branch: `git branch`
2. Read `CLAUDE.md` (this file)
3. Read `SESSION_CONTEXT.md` — current phase status, commits, what's next

After reading, confirm:
> "On branch: develop. Storefront Phase: [X]. Status: [one line]. Ready."

---

## Project

- **Name:** Optic Up Storefront — public-facing website for optical store tenants
- **Repo:** opticalis/opticup-storefront (SEPARATE from ERP repo opticalis/opticup)
- **Deploy:** Vercel — auto-deploys from `main` branch → https://opticup-storefront.vercel.app
- **Current tenant:** Prizma Optics (slug: `prizma`)
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co (shared with ERP)

**NEVER touch the ERP repo (opticalis/opticup) from this project.**

---

## Stack

- Astro 6 + TypeScript (strict) + Tailwind CSS 4
- Supabase JS v2 (anon key for Views, service_role for image proxy)
- Vercel hosting + serverless functions
- i18n: Hebrew (default, RTL), English, Russian

---

## Rules

> **Parent project rules:** The ERP project at `C:\Users\User\opticup\CLAUDE.md` contains Iron Rules that apply to the entire Optic Up platform. Key rules that also apply here:
> - Every table/view must have tenant_id (SaaS Rule 14)
> - Soft deletes only (Iron Rule 3)
> - No hardcoded business values (Iron Rule 11)
> - UNIQUE constraints include tenant_id (SaaS Rule 20)
> - Views for external access (SaaS Rule 17)
> - Sequential numbers via RPC, never client-side MAX (Iron Rule 13)

1. **Views and RPCs only** — NEVER access Supabase tables directly. Use `v_storefront_products`, `v_storefront_brands`, `v_storefront_categories`, `v_public_tenant`.
2. **Never commit .env files** — only `.env.example` with `REPLACE_ME` placeholders.
3. **RTL first** — every component must support RTL (Hebrew is the default locale).
4. **Mobile-first responsive** — every page must work on mobile screens.
5. **tenant_id isolation** — every Supabase query must filter by `tenant_id`.
6. **File size limits** — `.ts`/`.astro` max 350 lines, `.css` max 250 lines.
7. **Image proxy** — use `/api/image/` proxy route, never direct Supabase Storage URLs.
8. **No direct table access from SearchBar** — client-side search must use Views only (except `v_public_tenant` for tenant ID).
9. **No hardcoded tenant data** — tenant name, theme, logo, phone come from `v_public_tenant`.
10. **Backup before every phase** — Before starting ANY phase, create a timestamped backup:
    - Location: `C:\Users\User\opticup\modules\Module 3 - Storefront\backups\[YYYY-MM-DD_HH-MM]_pre-[phase-name]\`
    - Include: full `opticup-storefront` directory (excluding node_modules, .git, dist, .vercel, .env)
    - Why: backup is taken at phase START, meaning the previous phase was already verified. Every backup = known-good state.
    - Verify backup contains src/, CLAUDE.md, SESSION_CONTEXT.md before proceeding.

---

## Branches

- **`main`** = Production. Auto-deploys to Vercel. Do NOT push directly — merge from `develop`.
- **`develop`** = Development. All work happens here.

### Merge to production
```bash
git checkout main && git merge develop && git push origin main && git checkout develop
```

---

## File Structure

```
opticup-storefront/
├── CLAUDE.md                          — this file
├── SESSION_CONTEXT.md                 — current status, commits, what's next
├── README.md                          — setup instructions
├── .env.example                       — env var template (never commit .env)
├── astro.config.mjs                   — Astro config (output: 'server', Vercel adapter)
├── sql/
│   ├── 001-seed-storefront-config.sql — Prizma storefront_config seed
│   ├── 002-v-storefront-products.sql  — Original views (Phase 1)
│   ├── 003-alter-inventory-storefront-columns.sql — ADD COLUMN migrations
│   ├── 004-v-storefront-products-v2.sql — Updated views v2
│   └── 005-fix-storefront-view.sql    — Current views (brands.default_sync logic)
├── src/
│   ├── components/
│   │   ├── CategoryGrid.astro         — Category cards grid (homepage)
│   │   ├── FeaturedProducts.astro     — Featured products grid (homepage)
│   │   ├── Footer.astro               — Footer with tenant branding
│   │   ├── Header.astro               — Sticky header, nav, search, language switcher
│   │   ├── HeroSection.astro          — Homepage hero banner
│   │   ├── ProductCard.astro          — Product card with ghost overlay, discount pricing
│   │   └── SearchBar.astro            — Real-time search with debounced Supabase queries
│   ├── i18n/
│   │   ├── index.ts                   — i18n utility (t(), getDir(), getLangName())
│   │   ├── he.json                    — Hebrew translations
│   │   ├── en.json                    — English translations
│   │   └── ru.json                    — Russian translations
│   ├── layouts/
│   │   └── BaseLayout.astro           — Base layout: OG, fonts, theme vars, noindex
│   ├── lib/
│   │   ├── supabase.ts                — Supabase client (null-safe for builds without env)
│   │   ├── tenant.ts                  — Tenant resolution via v_public_tenant + theme CSS
│   │   ├── products.ts               — Product/category queries via Views
│   │   └── brands.ts                  — Brand queries: getBrands, getBrandBySlug
│   ├── pages/
│   │   ├── index.astro                — Homepage (prerendered)
│   │   ├── search.astro               — Search page (SSR, noindex)
│   │   ├── api/image/[...path].ts     — Image proxy: signed URLs via service_role
│   │   ├── products/
│   │   │   ├── index.astro            — Product listing with filters/sort/pagination (SSR)
│   │   │   └── [barcode].astro        — Product detail: carousel, lightbox, specs, CTA (SSR)
│   │   ├── brands/
│   │   │   ├── index.astro            — All brands grid
│   │   │   └── [slug].astro           — Brand products page (SSR)
│   │   ├── categories/
│   │   │   └── index.astro            — Category listing
│   │   └── category/
│   │       └── [slug].astro           — Per-category products with brand filter (SSR)
│   └── styles/
│       └── global.css                 — Global styles
└── modules/Module 3 - Storefront/     — Planning docs (specs, audit reports)
```

---

## Supabase Views

| View | Purpose | Key columns |
|------|---------|-------------|
| `v_public_tenant` | Tenant resolution (secure) | id, slug, name, enabled, theme, logo_url, categories, seo |
| `v_storefront_products` | Product catalog | id, tenant_id, barcode, brand_name, brand_id, model, color, size, quantity, product_type, sell_price, sell_discount, default_sync, images, search_text |
| `v_storefront_categories` | Category counts | tenant_id, name, count |
| `v_storefront_brands` | Brand counts | tenant_id, brand_id, brand_name, product_type, count |

### Product visibility logic (in v_storefront_products)
- `brands.default_sync = 'full'` → show only if `quantity > 0`
- `brands.default_sync = 'display'` → show always (even qty = 0)
- `brands.exclude_website = true` → never show
- `is_deleted = true` → never show

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `PUBLIC_SUPABASE_URL` | .env + Vercel | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | .env + Vercel | Anon key (read-only, Views access) |
| `SUPABASE_SERVICE_ROLE_KEY` | .env + Vercel | Service role key (image proxy only, server-side) |
| `PUBLIC_DEFAULT_TENANT` | .env + Vercel | Default tenant slug (default: `prizma`) |

---

## Known Issues & Learnings

### Images
- Supabase Storage bucket name: `frame-images` (NOT `inventory-images`)
- Bucket is PRIVATE — never make it public
- Use `/api/image/` proxy route with `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `inventory_images.url` contains EXPIRED signed URLs — always use `storage_path` to build fresh URLs
- View `v_storefront_products` builds URLs as: `'/api/image/' || img.storage_path`
- `SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel Environment Variables (no PUBLIC_ prefix)
- Product images have transparent backgrounds (remove-bg) — always use `bg-white` containers, never `bg-gray`

### Tenant Resolution
- Use `v_public_tenant` View (secure) — never query `tenants` table directly
- View exposes only: id, slug, name, enabled, theme, logo_url, categories, seo

### Product Visibility
- `brands.default_sync` controls storefront visibility: `full` = show if in stock, `display` = show always, `none` = hidden
- `brands.exclude_website = true` overrides everything — never show
- Never use `storefront_status` column — it's deprecated

### Deployment
- Merges to `main` in this repo are SAFE — deploys only to `opticup-storefront.vercel.app`
- WordPress (`prizma-optic.co.il`) stays live until manual DNS switch
- After adding Vercel env vars, must Redeploy for them to take effect

---

## Backup Policy

**Every phase starts with a backup. No exceptions.**

- **Location:** `C:\Users\User\opticup\modules\Module 3 - Storefront\backups\`
- **Format:** `[YYYY-MM-DD_HH-MM]_pre-[phase-name]\opticup-storefront\`
- **Excludes:** node_modules, .git, dist, .vercel, .env
- **Logic:** Backup happens BEFORE any changes. Previous phase was verified as working → backup = known-good state.

**To restore from backup:**
```powershell
# 1. Copy backup files back (preserves .git)
robocopy "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\[BACKUP_DIR]\opticup-storefront" "C:\Users\User\opticup-storefront" /E /XD .git
# 2. Reinstall dependencies
npm install
# 3. Verify
npm run build
```

**Existing backups:**
| Timestamp | Phase | Status |
|-----------|-------|--------|
| (will be filled as phases complete) | | |
