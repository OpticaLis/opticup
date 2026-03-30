# Module 3 — Storefront — Session Context

## Current Phase: Phase 3A — SEO Data Prep & Redirects
## Status: ✅ Complete
## Date: 2026-03-30

---

## Phase Summary

### Phase 1 — Astro Setup + Infrastructure ✅
**Tag:** `v3.1-phase1-astro-setup`

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | Astro + TypeScript + Tailwind + Supabase + Vercel init | `50c3ad4` |
| 2 | ✅ | Project structure, i18n (HE/EN/RU), Vercel config | `08fc710` |
| 3 | ✅ | Supabase read-only client (null-safe for builds) | `d60b518` |
| 4 | ✅ | Tenant resolution (slug → tenants + storefront_config) | `d60b518` |
| 5 | ✅ | Base layout: Header (sticky, responsive, lang switch), Footer | `6404eb2` |
| 6 | ✅ | Homepage skeleton: Hero + FeaturedProducts + CategoryGrid | `6404eb2` |
| 7 | ✅ | SQL seed files (storefront_config + Views) | `d6b4710` |
| 8 | ✅ | Documentation + final commit + tag | `d6b4710` |

### Phase 2 — Product Catalog ✅
**Tag:** `v3.2-phase2-product-catalog`

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | SQL migrations (inventory columns + updated views) | `afb1c77` |
| 2 | ✅ | Astro config: static mode with per-page SSR | `afb1c77` |
| 3 | ✅ | Enhanced products.ts + brands.ts (9 query functions) | `afb1c77` |
| 4 | ✅ | Product listing page (/products/) — filters, sort, pagination | `4da7b0e` |
| 5 | ✅ | Product detail page (/products/[barcode]) — gallery, specs, CTA | `4da7b0e` |
| 6 | ✅ | Category listing + per-category pages | `4da7b0e` |
| 7 | ✅ | Brands listing + per-brand pages | `01e970e` |
| 8 | ✅ | Search page + SearchBar component | `85ec92c` |
| 9 | ✅ | Ghost overlay for out-of-stock products | `01e970e` |
| 10 | ✅ | Schema.org JSON-LD (Product + BreadcrumbList) | `01e970e` |
| 11 | ✅ | Documentation + tag | `efc2e89` |

### Phase 2B — Bug Fixes & Infrastructure ✅ (2026-03-30)

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 1 | ✅ | Fix: change output from 'static' to 'server' (Vercel 404 fix) | `a34a9f3` |
| 2 | ✅ | Fix: use v_public_tenant view for secure tenant resolution | `c7ba273` |
| 3 | ✅ | Fix: corrected v_storefront_products SQL view (brands.default_sync logic) | `4ae10e0` |
| 4 | ✅ | Fix: update products.ts to match new View columns (sell_price, sell_discount, default_sync) | `bd47a74` |
| 5 | ✅ | Fix: discount price display (original + final) + defensive image extraction | `fa8f236` |
| 6 | ✅ | Fix: image carousel with lightbox popup on product detail | `fb2c5ed` |
| 7 | ✅ | Feat: secure image proxy API route (/api/image/) | `1463e68` |
| 8 | ✅ | Fix: image proxy bucket name (frame-images, not inventory-images) | `8b2f1d2` |
| 9 | ✅ | Fix: white background for product images (transparent bg support) | `17f1cc7` |
| 10 | ✅ | Docs: CLAUDE.md with full project rules + known issues | `62b0aa1` |

### Phase 3A — SEO Data Prep & Redirects ✅ (2026-03-30)

| Step | Status | Description | Commit |
|------|--------|-------------|--------|
| 0 | ✅ | Backup: 2026-03-30_08-40_pre-phase3a | — |
| 1 | ✅ | SEO_MIGRATION_PLAN.md — all 12 sections | `3b5f185` |
| 2 | ✅ | Product mapping: 28 exact/fuzzy, 663 brand, 42 wildcard | `3b5f185` |
| 3 | ✅ | Page classification: 124 pages (34 brand, 34 build, 22 ignore) | `3b5f185` |
| 4 | ✅ | Blog mapping: 143 posts (58 HE, 43 EN, 42 RU), 59 images | `3b5f185` |
| 5 | ✅ | Tag redirects: 1 wildcard rule (1,175 tags) | — |
| 6 | ✅ | Category redirects: 12 specific + 1 wildcard | — |
| 7 | ✅ | vercel.json: 123 redirect rules | — |
| 8 | ✅ | Migration validator: 100% coverage (1,024/1,024) | — |
| 9 | ✅ | Documentation + quality gate | — |

**Quality Gate 3A:**
| Check | Result | Notes |
|-------|--------|-------|
| Product match rate > 70% | ⚠️ 3.8% | Only 49 products visible (Saint Laurent only). All products have destinations via wildcard. DECISION_NEEDED documented. |
| Redirects ≤ 1,024 | ✅ 123 | Well under limit |
| Migration coverage > 90% | ✅ 100% | All 1,024 URLs covered |
| All scripts run | ✅ | 7 scripts, zero errors |

**DECISION_NEEDED:** Product match rate is 3.8% (28 exact/fuzzy out of 733). This is because only 49 products are currently visible on the storefront (only Saint Laurent brand enabled). All 733 products still have redirect destinations: 28 specific barcode redirects, 663 brand-level redirects, 42 wildcard fallbacks to /products/. As more brands are enabled on the storefront, the map-products.ts script can be re-run to generate more specific redirects.

---

## Backups

| Timestamp | Phase | Location |
|-----------|-------|----------|
| 2026-03-30_08-40 | Pre-Phase 3A | `opticup/modules/Module 3 - Storefront/backups/2026-03-30_08-40_pre-phase3a/` |

---

## SEO Scripts

All scripts in `scripts/seo/`:

| Script | Purpose | Output |
|--------|---------|--------|
| `map-products.ts` | Match WP products → inventory barcodes | `output/product-mapping.json` |
| `classify-pages.ts` | Classify 124 WP pages | `output/page-classification.json` |
| `classify-blog.ts` | Map 143 blog posts with i18n | `output/blog-mapping.json` |
| `generate-tag-redirects.ts` | Wildcard for 1,175 tags | `output/tag-redirects.json` |
| `generate-category-redirects.ts` | 12 category redirects | `output/category-redirects.json` |
| `merge-redirects.ts` | Combine all → vercel.json | `vercel.json` |
| `validate-migration.ts` | Validate 100% coverage | `output/migration-validation-report.md` |

---

## What's Next

### Phase 3B — Blog Migration (next)
- Download 59 blog images from WordPress
- Build blog-posts.ts data module
- Catch-all route for root-level HE content
- Blog post + blog card components
- EN/RU blog routes
- Blog index pages (בלוג, /en/blog/, /ru/blog/)
- hreflang tags on all pages

### Phase 3C — Landing Pages + SEO Infrastructure
- 7 landing pages (root-level, same URLs)
- 12 static pages (about, contact, privacy, accessibility × 3 langs)
- Sitemap.xml (auto-generated)
- Enhanced Schema.org markup
- robots.txt
- Final migration validator → 100%

---

## Known Issues

1. **`products/[barcode].astro` is 410 lines** — exceeds 350-line target. Should split carousel/lightbox into a separate component.
2. **SQL file 005 doesn't match live view** — live Supabase view was manually updated to include `/api/image/` prefix in URLs. The repo SQL file should be updated to match.
3. **No .env file in repo** — only `.env.example`. Local dev requires manual setup.
4. **SearchBar queries v_public_tenant** — client-side code creates its own Supabase client (not ideal, but functional).
5. **Product match rate 3.8%** — only 49 products visible on storefront. Wildcard redirects cover the rest. Re-run map-products.ts when more brands are enabled.
