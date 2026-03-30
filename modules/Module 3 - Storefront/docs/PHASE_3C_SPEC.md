# Phase 3C — Landing Pages + SEO Infrastructure

> **Module:** 3 — Storefront
> **Repo:** opticup-storefront
> **Execution mode:** AUTONOMOUS (continues from 3B if quality gate passed)
> **Depends on:** Phase 3A (page-classification.json, vercel.json), Phase 3B (catch-all route)
> **Created:** March 2026

---

## Objective

Complete the SEO migration by building remaining pages and infrastructure:
1. Build 7 landing pages (root-level, same URLs as WordPress)
2. Build static pages (about, contact, privacy, accessibility)
3. Auto-generate sitemap.xml
4. Add Schema.org markup (LocalBusiness, enhanced Product, FAQ)
5. Configure robots.txt
6. Run final migration validator — target 100% coverage
7. Update all documentation

**Success = migration validator shows 100% coverage. Every WordPress URL has a live destination.**

---

## Autonomous Execution Plan

### Step 0 — Backup Before Starting

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase3c"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
```
**Verify:**
- [ ] Backup exists with timestamp

---

### Step 1 — Verify 3B Outputs

**What to do:** Verify Phase 3B completed successfully:
- [ ] Catch-all route `src/pages/[...slug].astro` exists
- [ ] Blog posts render at root-level URLs
- [ ] `src/data/blog-posts.ts` exists with all posts
- [ ] Blog index pages work

If anything missing → ⛔ STOP.

---

### Step 2 — Build Landing Page Data Structure

**Files to create:** `src/data/landing-pages.ts`

**What to do:**
Create a data structure for landing pages, sourced from WordPress page content.

**Input:** Phase 0 scraped data + `page-classification.json` (KEEP_ROOT items)

**Known landing pages:**
| URL | Title | Content source |
|-----|-------|---------------|
| `/משקפי-מולטיפוקל/` | משקפי מולטיפוקל | WordPress page content |
| `/multi/` | Multi | WordPress page content |
| `/lab/` | מעבדת מסגורים | WordPress page content |
| `/מה-זה-מולטיפוקל/` | מה זה מולטיפוקל? | WordPress page content |
| `/en/multifocal-guide/` | Multifocal Guide | WordPress EN page |

**Structure:**
```typescript
export interface LandingPage {
  slug: string;
  lang: 'he' | 'en' | 'ru';
  title: string;
  content: string;          // Cleaned HTML
  seo: {
    title: string;
    description: string;
  };
  translations: {
    he: string | null;
    en: string | null;
    ru: string | null;
  };
}

export function getLandingPageBySlug(slug: string): LandingPage | null;
export function getAllLandingPages(lang?: string): LandingPage[];
```

**Content cleaning:** Same as blog posts — strip shortcodes, fix image URLs, clean HTML.

**If WordPress page content was NOT scraped in Phase 0:**
- Check if content exists in url-inventory.json (wordCount > 0 means content exists somewhere)
- If content not available: create minimal landing page with title + SEO meta + "תוכן בקרוב" placeholder
- Document as DECISION_NEEDED for Daniel

**DB changes:** None
**Verify:**
- [ ] All KEEP_ROOT pages have data entries
- [ ] Content cleaned (no WordPress shortcodes)

---

### Step 3 — Wire Landing Pages into Catch-All Route

**Files to modify:** `src/pages/[...slug].astro`

**What to do:**
Update the catch-all route (created in 3B) to also handle landing pages.

**Updated logic:**
```
1. Extract slug from URL
2. Check if blog post → render BlogPost template
3. Check if landing page → render LandingPage template ← NEW
4. Neither → 404
```

**Landing page template:**
- Full-width layout (different from blog post — no sidebar)
- Title as `<h1>`
- Content rendered as raw HTML
- CTA buttons (WhatsApp, booking — if applicable)
- hreflang tags
- Schema.org WebPage or FAQPage JSON-LD (if content has FAQ structure)
- Breadcrumb: Home > [page title]

**Files to create:** `src/components/LandingPage.astro`

**DB changes:** None
**Verify:**
- [ ] `/משקפי-מולטיפוקל/` renders landing page content
- [ ] `/multi/` renders landing page content
- [ ] `/lab/` renders landing page content
- [ ] Blog posts still work at root level
- [ ] `/products/` and other existing routes unaffected

---

### Step 4 — Build Static Pages

**Files to create:**
- `src/pages/אודות.astro` — About page (Hebrew)
- `src/pages/צור-קשר.astro` — Contact page (Hebrew)
- `src/pages/מדיניות-פרטיות.astro` — Privacy policy (Hebrew)
- `src/pages/נגישות.astro` — Accessibility statement (Hebrew)
- `src/pages/en/about.astro` — About (English)
- `src/pages/en/contact.astro` — Contact (English)
- `src/pages/en/privacy.astro` — Privacy (English)
- `src/pages/en/accessibility.astro` — Accessibility (English)
- `src/pages/ru/about.astro` — About (Russian)
- `src/pages/ru/contact.astro` — Contact (Russian)
- `src/pages/ru/privacy.astro` — Privacy (Russian)
- `src/pages/ru/accessibility.astro` — Accessibility (Russian)

**Content approach:**
These pages need NEW content (not migrated from WordPress). Create with:
- **About:** Tenant name + description from `v_public_tenant`. Generic template: "Welcome to [tenant_name], your trusted optical store..." Placeholder for Daniel to customize later.
- **Contact:** Tenant phone, address, hours from `v_public_tenant` or `storefront_config`. WhatsApp link. Google Maps embed (if address available). Contact form placeholder.
- **Privacy:** Standard privacy policy template for Israeli e-commerce. Placeholder for legal review.
- **Accessibility:** Standard Israeli accessibility statement (תקן ישראלי 5568). Placeholder for accessibility audit.

**All pages must:**
- Support RTL (Hebrew) and LTR (English, Russian)
- Have hreflang tags linking all 3 language versions
- Have proper SEO meta (title, description)
- Use tenant data from `v_public_tenant` (not hardcoded)
- Have Schema.org markup where relevant (ContactPage, AboutPage)

**DB changes:** None
**Verify:**
- [ ] All 12 pages render (4 pages × 3 languages)
- [ ] RTL correct for Hebrew, LTR for EN/RU
- [ ] Tenant name from v_public_tenant (not hardcoded "פריזמה")
- [ ] hreflang tags present on all pages
- [ ] No console errors

---

### Step 5 — Auto-Generate Sitemap

**Files to create/modify:**
- Update `astro.config.mjs` — add `@astrojs/sitemap` integration
- Create `src/pages/sitemap-index.xml.ts` (if Astro built-in sitemap insufficient)

**What to do:**
Configure automatic sitemap generation that includes ALL pages:

**Pages to include:**
- Homepage (/)
- All product pages (/products/[barcode]/)
- All brand pages (/brands/, /brands/[slug]/)
- All category pages (/category/[slug]/)
- All blog posts (root-level HE + /en/ + /ru/)
- Blog indexes (/בלוג/, /en/blog/, /ru/blog/)
- Landing pages (root-level)
- Static pages (about, contact, etc. in 3 languages)

**Pages to EXCLUDE (noindex):**
- /search (already has noindex)
- /api/* routes

**Sitemap must:**
- Include `<lastmod>` where available (blog post dates)
- Include `<xhtml:link rel="alternate" hreflang="...">` for i18n
- Be accessible at `/sitemap.xml` or `/sitemap-index.xml`
- Auto-update when pages are added/removed

**Implementation:**
```bash
npm install @astrojs/sitemap
```

Add to `astro.config.mjs`:
```javascript
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://opticup-storefront.vercel.app', // Update to real domain at DNS switch
  integrations: [sitemap({
    filter: (page) => !page.includes('/search') && !page.includes('/api/'),
    i18n: {
      defaultLocale: 'he',
      locales: { he: 'he', en: 'en', ru: 'ru' }
    }
  })]
});
```

**DB changes:** None
**Verify:**
- [ ] `/sitemap.xml` or `/sitemap-index.xml` accessible
- [ ] Contains all public pages
- [ ] Excludes /search and /api/
- [ ] Includes hreflang links
- [ ] Valid XML (test with online validator)

---

### Step 6 — Enhanced Schema.org Markup

**Files to create:** `src/lib/schema.ts`
**Files to modify:** `src/layouts/BaseLayout.astro`, product pages, blog pages

**What to do:**
Add structured data (JSON-LD) to all relevant pages.

**Schema types by page:**

| Page | Schema type | Key fields |
|------|------------|------------|
| Homepage | `LocalBusiness` + `WebSite` | name, address, phone, url, openingHours, image |
| Product pages | `Product` (already exists from Phase 2 — verify/enhance) | name, brand, image, offers, sku |
| Blog posts | `Article` (added in 3B — verify) | headline, author, datePublished, image |
| Category pages | `CollectionPage` | name, description |
| Blog index | `Blog` | name, description, blogPost[] |
| About | `AboutPage` | name, description |
| Contact | `ContactPage` + `LocalBusiness` | name, telephone, address |

**LocalBusiness data:** Pull from `v_public_tenant` (name, phone, address if available). Don't hardcode.

**Helper function in schema.ts:**
```typescript
export function localBusinessSchema(tenant: TenantData): object;
export function productSchema(product: ProductData): object;
export function articleSchema(post: BlogPost): object;
export function breadcrumbSchema(items: {name: string, url: string}[]): object;
```

**DB changes:** None
**Verify:**
- [ ] Homepage has LocalBusiness + WebSite JSON-LD
- [ ] Product pages have Product JSON-LD (check one)
- [ ] Blog posts have Article JSON-LD (check one)
- [ ] All JSON-LD valid (test with Google Rich Results Test URL or JSON-LD validator)
- [ ] No hardcoded tenant data in schemas

---

### Step 7 — Configure robots.txt

**Files to create/modify:** `public/robots.txt`

**Content:**
```
User-agent: *
Allow: /

# Block internal/system paths
Disallow: /api/
Disallow: /search

# Sitemap
Sitemap: https://opticup-storefront.vercel.app/sitemap-index.xml
```

**Note:** Sitemap URL will be updated to real domain at DNS switch. Use env var or build-time replacement if possible.

**DB changes:** None
**Verify:**
- [ ] `robots.txt` accessible at `/robots.txt`
- [ ] Sitemap URL correct
- [ ] /api/ and /search blocked

---

### Step 8 — Final Migration Validator

**Files to modify:** `scripts/seo/validate-migration.ts` (update from 3A)

**What to do:**
Run the migration validator again, but this time check for ACTUAL pages (not PLANNED).

**Updated checks:**
```
For each WordPress URL:
  1. Redirect exists in vercel.json? → ✅ REDIRECTED
  2. Astro page exists in src/pages/? → ✅ PAGE_EXISTS
  3. Blog post exists in blog-posts.ts? → ✅ BLOG_POST (root-level or /en/, /ru/)
  4. Landing page exists in landing-pages.ts? → ✅ LANDING_PAGE
  5. Classified as IGNORE? → ⚠️ IGNORED
  6. None of the above → ❌ UNCOVERED
```

**Output:** `scripts/seo/output/final-migration-validation-report.md`

**Target: 100% coverage (zero UNCOVERED).**

If UNCOVERED > 0:
- Add missing redirects to vercel.json
- Re-run validator
- Repeat until 100%

**Also generate:** `scripts/seo/output/redirect-test-urls.txt` — list of old → new URLs for manual testing after DNS switch.

**DB changes:** None
**Verify:**
- [ ] Validator shows 100% coverage (or documents remaining gaps with reasons)
- [ ] Report clearly shows coverage by type: redirects, pages, blog posts, landing pages, ignored
- [ ] redirect-test-urls.txt generated for future testing

---

### Step 9 — Update All Documentation

**Files to update:**

**opticup-storefront:**
- `SESSION_CONTEXT.md` — Phase 3C complete, full migration stats
- `CHANGELOG.md` — Phase 3C entry
- `CLAUDE.md` — any new known issues, new routes documented in file structure
- `docs/SEO_MIGRATION_PLAN.md` — final stats, validator results, remaining items

**opticup (ERP repo):**
- `modules/Module 3 - Storefront/ROADMAP.md` — Phase 3: "3A ✅, 3B ✅, 3C ✅ — SEO Migration complete"

**SESSION_CONTEXT.md must include:**
- Total pages built (blog + landing + static)
- Total redirects in vercel.json
- Migration validator coverage %
- Known issues / remaining gaps
- What's next: Phase 4 (Catalog/Shop + WhatsApp + Landing Pages)
- Backup locations for all 3 sub-phases

**CLAUDE.md file structure section must be updated** with all new files:
```
src/
├── data/
│   ├── blog-posts.ts
│   └── landing-pages.ts
├── components/
│   ├── BlogPost.astro
│   ├── BlogCard.astro
│   └── LandingPage.astro
├── pages/
│   ├── [...slug].astro          ← catch-all (blog + landing pages)
│   ├── בלוג.astro               ← blog index HE
│   ├── אודות.astro              ← about HE
│   ├── צור-קשר.astro            ← contact HE
│   ├── מדיניות-פרטיות.astro     ← privacy HE
│   ├── נגישות.astro             ← accessibility HE
│   ├── en/
│   │   ├── [...slug].astro      ← EN blog posts
│   │   ├── blog.astro           ← blog index EN
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── privacy.astro
│   │   └── accessibility.astro
│   └── ru/
│       ├── [...slug].astro      ← RU blog posts
│       ├── blog.astro           ← blog index RU
│       ├── about.astro
│       ├── contact.astro
│       ├── privacy.astro
│       └── accessibility.astro
├── lib/
│   └── schema.ts                ← Schema.org helpers
scripts/
└── seo/
    └── download-blog-images.ts  ← image downloader
public/
├── blog/images/                 ← downloaded blog images
└── robots.txt
docs/
└── SEO_MIGRATION_PLAN.md       ← single source of truth
```

**Verify:**
- [ ] All documentation updated with zero placeholders
- [ ] File structure in CLAUDE.md matches actual repo
- [ ] Committed to `develop`
- [ ] Tag: `v3.0-phase3c-seo-infrastructure`

---

## Completion Checklist — Full Phase 3

- [ ] **3A:** Product mapping, redirects, vercel.json ← data prep
- [ ] **3B:** Blog posts (3 languages), images, catch-all route, hreflang ← content
- [ ] **3C:** Landing pages, static pages, sitemap, schema, robots.txt ← infrastructure
- [ ] Migration validator: 100% coverage
- [ ] All 3 backups exist in `backups/` with timestamps
- [ ] Total blog posts: 143 (58 HE + 43 EN + 42 RU)
- [ ] Total landing pages: 7
- [ ] Total static pages: 12 (4 × 3 languages)
- [ ] Total redirects: documented in SESSION_CONTEXT
- [ ] Schema.org on all page types
- [ ] Sitemap auto-generated
- [ ] hreflang on all pages
- [ ] All docs updated (SESSION_CONTEXT, CHANGELOG, CLAUDE.md, ROADMAP, SEO_MIGRATION_PLAN)
- [ ] Do NOT merge to main — Daniel reviews first
- [ ] Final tag: `v3.0-phase3-seo-migration-complete`
