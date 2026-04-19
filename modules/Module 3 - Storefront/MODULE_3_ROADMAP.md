# Optic Up — מודול 3: Storefront — ROADMAP

> **Authority:** Phase status only. For rules → CLAUDE.md. For code → MODULE_MAP.md. For current status → SESSION_CONTEXT.md.
> **מיקום:** `modules/Module 3 - Storefront/ROADMAP.md`
> **עודכן לאחרונה:** אפריל 2026 (DNS Switch GO verdict)
> **Execution mode:** AUTONOMOUS — Claude Code executes PHASE_SPECs independently

---

## חזון — סניף דיגיטלי לכל חנות אופטיקה

מודול 3 הופך את Optic Up מ"מערכת ניהול פנימית" ל"מערכת ניהול + אתר חנות."

כל tenant שמצטרף מקבל אתר ממותג שמסתנכרן אוטומטית עם המלאי שלו. מוצר חדש ב-ERP = מופיע באתר. נמכר = יורד. אפס עבודה ידנית.

**ה-value proposition:** אופטיקה פרטית מקבלת אתר מקצועי בלי לגעת ב-WordPress, בלי מעצב, בלי לכתוב תוכן. הכל אוטומטי — תמונות מהמלאי, תיאורים מ-AI, תרגום אוטומטי, קטלוג שמתעדכן לבד.

---

## מה המודול בונה

### תשתית
- **Astro + TypeScript + Tailwind** — repo נפרד (`opticalis/opticup-storefront`)
- **Vercel deploy** — CDN, SSG/SSR, custom domains
- **Custom domain** — `www.prizma-optic.co.il` לפריזמה
- **White-label** — subdomain per tenant (`hadar.opticalis.co.il`) או custom domain
- **Supabase Views** — Storefront קורא רק Views + RPC, אף פעם לא טבלאות ישירות

### קטלוג + מוצרים
- **Auto-sync** — מלאי ERP → אתר אוטומטי, real-time
- **Catalog mode** — מוצר מוצג בלי מחיר, כפתור WhatsApp עם הודעה אוטומטית
- **Shop mode** — מוצר עם מחיר, הוספה לעגלה (checkout = WhatsApp/קישור ידני בשלב ראשון)
- **Per-product control** — `storefront_status`: hidden/catalog/shop, בחירה per product ב-ERP
- **Bulk operations** — בחר 50 מוצרים → "הצג באתר כקטלוג", bulk price set, bulk image approve

### Landing Pages לאירועי מכירות
- **סינון מלאי** → עמוד נחיתה אוטומטי עם קטלוג תמונות
- **פילטרים:** סוג מוצר, מותגים ספציפיים, מה שבמלאי
- **מוכן לפרסום** — לינק ישיר, WhatsApp share, Facebook/Instagram
- **Template-based** — כמה templates לבחירה, AI ממלא תוכן
- **Per-tenant** — כל tenant יכול ליצור landing pages מהמלאי שלו

### SEO Migration (פריזמה בלבד)
- **URL mapping 1:1** — כל URL מ-WordPress → אותו path ב-Astro
- **301 redirects** — כל URL שמשתנה
- **Blog migration** — כל הפוסטים עם אותם URLs
- **Landing pages migration** — כל עמודי הנחיתה הקיימים
- **Schema markup** — LocalBusiness, Product, BreadcrumbList
- **Migration Validator** — Node script שמוודא 100% כיסוי

### AI Content
- **Product descriptions** — Claude כותב תיאור מ-brand+model+specs+styling recommendation
- **SEO meta** — title + description + keywords אוטומטי per product
- **Image alt text** — אוטומטי לכל תמונה
- **Blog post generator** — פרומפט → draft מאמר
- **Landing page content** — AI כותב כותרות, תיאורים, CTA
- **Learning from corrections** — תיקון → AI לומד ומשתפר (כמו OCR pattern)

### i18n — תרגום AI עם למידה
- **3 שפות:** עברית (מקור), רוסית, אנגלית
- **AI translation** — Claude מתרגם, מתרגמן מתקן, AI לומד
- **3 טבלאות:** translations, translation_corrections, translation_glossary
- **Glossary** — מילון מונחים אופטי per שפה
- **Auto-translate on new product** — מוצר חדש = 3 שפות מיידית
- **Review UI ב-ERP** — side-by-side, approve/correct per item

### נוספים
- **Low Stock Ghosting** — מוצר שנגמר = מטושטש + "עדכנו אותי כשיחזור"
- **Booking button** — קישור ליומן תורים חיצוני (configurable per tenant)
- **Analytics per tenant** — GA, Facebook Pixel, GTM — שדות ב-config, נטענים דינמית
- **Theme engine** — JSON theme ב-storefront_config (צבעים, פונטים, border-radius)

---

## מה לא נכנס

| פריט | למה | מתי |
|------|-----|-----|
| Full checkout עם תשלום באתר | דורש payment gateway | מודול 8 |
| Customer portal (הזמנות, מרשמים) | דורש CRM (מודול 4) | מודול 8 |
| AI video generation | דורש video API pipeline | מודול 18 |
| Auto-publish Facebook/Instagram | דורש Facebook Marketing API | מודול 18 |
| AI agent team | דורש orchestration framework | מודול 18+ |
| B2B image sharing/marketplace | דורש matching + permissions | מודול 19 |
| Franchise + shared inventory | דורש מודול סניפים (11) | עתידי |
| Virtual Try-On | לא MVP | עתידי |
| Dynamic watermarking | מכער, לא מונע גניבה | לא מתוכנן |

---

## תלויות

**מודול 3 תלוי ב:**
- מודול 1 (מלאי) ✅ — inventory, brands, images, product data
- מודול 1.5 (shared) ✅ — CSS variables, Modal, Toast, DB.*, ActivityLog
- מודול 2 (Platform Admin) ✅ — storefront_config, plans, feature flags, tenant resolution

**תלויים במודול 3:**
- מודול 8 (Storefront Full) — מרחיב עם checkout, customer portal
- מודול 18 (Content Hub AI) — מרחיב עם video, auto-publish
- מודול 19 (B2B Network) — image sharing between tenants

---

## מפת פאזות

### CMS (ERP-side, completed)

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| CMS-1 | ✅ | Content Manager | Content pages CRUD, SEO settings |
| CMS-2 | ✅ | Studio Block Editor | 14 block schemas, form renderer, page editor |
| CMS-3 | ✅ | Product Picker + Google Reviews | Product selection blocks, Google Places integration |
| CMS-4 | ✅ | Blog System | Blog editor, categories, tags |
| CMS-5 | ✅ | AI Prompt Editing | Edge Function cms-ai-edit, prompt bar, diff view |
| CMS-6 | ✅ | QA + Design Polish | Bug fixes, UI refinements |
| CMS-7 | ✅ | Campaign Templates | Template blocks, popup lead forms |
| CMS-8 | ✅ | SEO Scoring | SEO analysis per page |
| CMS-9 | ✅ | Translations | Content translation UI |
| CMS-10 | ✅ | Final Build + QA | Custom HTML block #19, full QA pass |

### Storefront Phases (opticup-storefront repo, completed)

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| 1 | ✅ | Astro Setup + Infrastructure | Repo, Vercel, domain, Views, tenant resolution |
| 2 | ✅ | Product Catalog + ERP Integration | Views, auto-sync, product pages, search |
| 3 | ✅ | SEO Migration | WordPress scraping, URL mapping, blog, redirects |
| 4 | ✅ | Catalog/Shop + WhatsApp + Landing Pages | Catalog/shop modes, WhatsApp CTA, ghosting |
| 5 | ✅ | AI Content Engine | Product descriptions, meta, alt text, blog generator |
| 6 | ✅ | i18n — AI Translation | 3 tables, Claude translation, glossary, review UI |
| 7 | ✅ | White-Label + Analytics + Theme | Multi-tenant, analytics, theme engine |

### SaaS Hardening (Phase B chain)

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| B Core | ✅ | SaaS Security Hardening | RLS canonical pattern on 11 tables, audit script, TIER-C cleanup |
| B6 | ✅ | Session Key Rename | `prizma_*` → `tenant_*` across ERP (commit `7e99030`) |
| Pre-Launch | ✅ | Pre-Launch Hardening | storefront RLS (components/pages/reviews), SAAS-01/04/05, R09-01 (commits `66acfc7`–`d2fe4d3`, 2026-04-14) |
| Close-Out | ✅ | Module 3 Close-Out | 5 hardcoding fixes, translate-content wrapper fix, WP parity pages, Guardian alerts (commits `a115b5a`–`ba81a3b`, 2026-04-15) |
| C | ✅ | WordPress Content Migration | Integrated into Close-Out via Supabase MCP DB inserts (migrations 065, 066) |
| D | ✅ | Dead Code Cleanup | Addressed in SPEC 2 (TENANT_FEATURE_GATING_AND_CLEANUP) |
| QA | ✅ | Full Module QA + Preflight Audit | DNS_SWITCH_PREFLIGHT_AUDIT (2026-04-18): 15-mission read-only audit, 0 blockers, GO verdict |
| DNS Switch | ✅ EXECUTED | DNS records updated 2026-04-18 | A record + CNAME updated at DreamVPS → Vercel. Propagation pending. Vercel auto-SSL in progress. |

**Module 3 DNS-switch ready as of 2026-04-18.** Full preflight audit: 0 blockers. develop→main merged (0 commits divergent). All phases complete.

---

**סה"כ CMS + Storefront + SaaS Hardening + SEO + QA = COMPLETE. DNS SWITCH = GO.**

---

## פירוט כל פאזה

### פאזה 1 ⬜ — Astro Setup + Infrastructure

**המטרה:** Repo חדש עובד, deployed ל-Vercel, מציג דף בסיסי עם tenant resolution.

**Steps:**
1. Create repo `opticalis/opticup-storefront`, Astro + TypeScript + Tailwind init
2. Vercel project, connect repo, auto-deploy on push
3. Custom domain setup: `www.prizma-optic.co.il` → Vercel
4. Supabase connection: read-only client (anon key, Views only)
5. Tenant resolution: slug from URL path → query tenants → load storefront_config
6. Base layout: header (logo, nav, language switch), footer, responsive, RTL
7. Homepage skeleton: hero + featured products (placeholder) + categories
8. storefront_config seeding: prizma config with theme, logo, categories

**DB:** storefront_config כבר קיים ממודול 2. Seed data for prizma.
**Views:** `v_storefront_products` — public view על inventory + images + brands filtered by storefront_status
**Verify:** Site loads on custom domain with prizma branding, zero errors, Lighthouse > 90

---

### פאזה 2 ⬜ — Product Catalog + ERP Integration

**המטרה:** מוצרים מהמלאי מופיעים באתר אוטומטית. ERP שולט על מה מוצג.

**Steps:**
1. View `v_storefront_products`: inventory fields + brand name + images + storefront_status, filtered tenant_id
2. View `v_storefront_categories`: distinct product_type + brand counts
3. Product listing page: grid with images, brand, model, price (if shop mode)
4. Product detail page: image gallery, specs, description, price/WhatsApp CTA
5. Category pages with filters: brand, product_type, price range, in-stock
6. Search: real-time search by brand + model + barcode
7. ERP integration — new fields on inventory: `storefront_status` (hidden/catalog/shop), `storefront_price`, `storefront_description`
8. ERP bulk operations: select products → change status, set price, approve images
9. CSV export/import for mass editing
10. Auto-sync: ISR (Incremental Static Regeneration) — pages rebuild when data changes

**DB changes (on ERP repo):**
```sql
ALTER TABLE inventory ADD COLUMN storefront_status TEXT DEFAULT 'hidden' CHECK (storefront_status IN ('hidden', 'catalog', 'shop'));
ALTER TABLE inventory ADD COLUMN storefront_price DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN storefront_description TEXT;
```

**Verify:** Products from ERP appear on storefront. Change status in ERP → reflected on site. Bulk ops work.

---

### פאזה 3 ⬜ — SEO Migration

**המטרה:** WordPress → Astro בלי לאבד דירוג. 100% URL coverage.

**Steps:**
1. Scrape WordPress sitemap: all URLs, titles, meta descriptions, H1s, content
2. Scrape blog posts: title, content, images, categories, dates, URLs
3. Scrape landing pages: content, images, CTAs
4. URL mapping table: old path → new path (1:1 wherever possible)
5. Build blog section in Astro: markdown/MDX files from scraped content
6. Build landing pages in Astro: from scraped content
7. 301 redirect rules in Vercel config (vercel.json)
8. Schema markup: LocalBusiness (homepage), Product (product pages), BreadcrumbList, FAQ
9. Sitemap auto-generation: `/sitemap.xml` that updates with every product
10. Migration Validator: Node script that checks every WordPress URL has a match
11. Google Search Console: submit new sitemap, verify coverage
12. Image migration: all blog/landing page images → Vercel/Supabase Storage

**Verify:** Every WordPress URL either has identical Astro page or 301 redirect. Validator = 100% coverage. Schema validates in Google Rich Results Test.

---

### פאזה 4 ⬜ — Catalog/Shop + WhatsApp + Landing Pages

**המטרה:** שני מצבי מוצר עובדים. Landing pages לאירועי מכירות.

**Steps:**
1. Catalog mode UI: product without price, WhatsApp button with auto-message ("היי, ראיתי באתר את [brand] [model] ואשמח לפרטים")
2. Shop mode UI: product with price, "הוסף לעגלה" button
3. Cart (basic): sessionStorage cart, cart icon with count, cart page with items + total
4. Checkout = WhatsApp message with cart summary (or link to payment — manual)
5. Low Stock Ghosting: quantity=0 → opacity + "עדכנו אותי כשיחזור" + email to storefront_leads
6. Booking button: CTA from storefront_config.booking_url, shown on homepage + product pages
7. Landing page generator ב-ERP: filter inventory → select template → preview → publish
8. Landing page templates: 3 designs (grid gallery, featured slider, minimal list)
9. Landing page URL: `prizma-optic.co.il/events/[slug]`
10. Landing page sharing: copy link, WhatsApp share button, QR code

**DB:**
```sql
CREATE TABLE storefront_landing_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL DEFAULT 'grid',
  filters JSONB NOT NULL, -- { brands: [...], product_types: [...], min_price, max_price }
  custom_content JSONB DEFAULT '{}', -- { hero_image, subtitle, cta_text }
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE storefront_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  product_id UUID REFERENCES inventory(id),
  type TEXT DEFAULT 'notify' CHECK (type IN ('notify', 'interest', 'booking')),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Verify:** Catalog product → WhatsApp opens with message. Shop product → adds to cart. Landing page from ERP filter → live page with products.

---

### פאזה 5 ⬜ — AI Content Engine

**המטרה:** AI כותב תוכן אוטומטי לכל מוצר, עמוד, blog post.

**Steps:**
1. Product description AI: Claude API, prompt with brand+model+specs → description + styling recommendation
2. SEO meta AI: title + description + keywords per product
3. Image alt text AI: Claude Vision, image → alt text
4. Learning from corrections: corrections saved, prompt enriched (like OCR pattern)
5. Bulk AI generation: "Generate descriptions for all products without description"
6. Blog post generator: prompt → markdown draft → review → publish
7. Landing page content AI: title + subtitle + CTA based on filter criteria
8. AI generation UI in ERP: "AI content" tab/section per product, per landing page, per blog
9. Correction UI: side-by-side (AI suggestion vs approved text), edit + save

**DB:**
```sql
CREATE TABLE ai_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL, -- 'product', 'landing_page', 'blog_post', 'category'
  entity_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'description', 'meta_title', 'meta_description', 'alt_text', 'blog_body'
  lang TEXT DEFAULT 'he',
  ai_text TEXT,
  approved_text TEXT,
  status TEXT DEFAULT 'auto' CHECK (status IN ('auto', 'approved', 'corrected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_content_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content_id UUID REFERENCES ai_content(id),
  ai_text TEXT,
  corrected_text TEXT,
  correction_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Verify:** New product → AI generates description + meta + alt text. Correct → AI improves next time. Bulk generation works for 100+ products.

---

### פאזה 6 ⬜ — i18n — AI Translation

**המטרה:** אתר ב-3 שפות. AI מתרגם, מתרגמן מתקן, AI לומד.

**Steps:**
1. DB tables: translations, translation_corrections, translation_glossary
2. Claude translation API: source (he) → target (ru/en), with glossary + corrections in prompt
3. Auto-translate on new product: product saved → translations created for all active languages
4. URL routing: `/` = he, `/ru/` = ru, `/en/` = en
5. Language switcher UI in storefront header
6. hreflang tags on all pages
7. Sitemap per language
8. Static UI labels file (buttons, nav, footer) per language
9. Review UI in ERP: side-by-side, filter by language + status, approve/correct
10. Glossary editor in ERP: add terms manually
11. Bulk translate: "translate all untranslated products to Russian"
12. Translation dashboard: "87% translated to Russian, 12 pending review"

**DB:**
```sql
CREATE TABLE translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_text TEXT NOT NULL,
  context TEXT NOT NULL, -- 'product_description', 'meta_title', 'blog_post', 'ui_label'
  entity_type TEXT, -- 'inventory', 'page', 'blog', 'category', 'landing_page'
  entity_id UUID,
  lang TEXT NOT NULL, -- 'ru', 'en'
  translated_text TEXT NOT NULL,
  status TEXT DEFAULT 'auto' CHECK (status IN ('auto', 'approved', 'corrected')),
  auto_text TEXT, -- original AI suggestion (kept even after correction)
  corrected_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, entity_type, entity_id, context, lang)
);

CREATE TABLE translation_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  auto_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  context TEXT,
  correction_type TEXT, -- 'terminology', 'style', 'grammar', 'meaning'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE translation_glossary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lang TEXT NOT NULL,
  term_he TEXT NOT NULL,
  term_translated TEXT NOT NULL,
  context TEXT DEFAULT 'general',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'learned')),
  UNIQUE(tenant_id, lang, term_he)
);
```

**Verify:** Product in Hebrew → auto-translated to ru + en. Correct Russian → next translation improved. URL /ru/ shows Russian site. hreflang tags present.

---

### פאזה 7 ⬜ — White-Label + Analytics + Theme

**המטרה:** Tenant שני מקבל אתר ממותג. Analytics per tenant.

**Steps:**
1. Subdomain routing: `hadar.opticalis.co.il` → resolve tenant → load their config + data
2. Custom domain support: Vercel domain config, DNS guide for tenants
3. Theme engine: storefront_config.theme JSONB → CSS variables injected at build/runtime
4. Analytics: GA ID, Facebook Pixel, GTM from storefront_config → dynamic script injection
5. Favicon + OG image per tenant
6. Footer customization per tenant
7. Homepage content per tenant (hero image, tagline, featured categories)
8. Test with demo tenant: green theme, different logo, different products

**Verify:** Demo tenant site looks completely different from prizma. Analytics fire correctly. Custom domain works.

---

### פאזת QA ⬜ — Full Test

**בדיקות:**
1. **SEO Validator:** 100% WordPress URLs covered (redirects or pages)
2. **Lighthouse:** > 90 on all 4 metrics (Performance, Accessibility, Best Practices, SEO)
3. **Product sync:** add product in ERP → appears on site. Delete → disappears
4. **Catalog mode:** WhatsApp button works with correct message
5. **Shop mode:** cart works, checkout sends WhatsApp with summary
6. **Landing pages:** create from ERP → live page → products match filter
7. **Ghosting:** out-of-stock product = ghosted + notify button
8. **AI content:** new product → auto description + meta + alt text
9. **AI learning:** correct description → next one better
10. **i18n:** all 3 languages work, switcher works, hreflang present
11. **Translation learning:** correct Russian → next translation improved
12. **White-label:** 2 tenants, different themes, different products, different domains
13. **Analytics:** GA events fire on prizma, not on demo (different IDs)
14. **Mobile:** all pages responsive, touch-friendly
15. **RTL:** Hebrew pages RTL, English pages LTR, Russian pages LTR
16. **Performance:** ISR works — data change → page updates within minutes
17. **Blog:** all posts migrated, URLs match, images load
18. **Schema:** Google Rich Results Test passes

---

## Repo Structure (Storefront)

```
opticup-storefront/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.mjs
├── vercel.json                    ← redirects, domain config
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro       ← header, footer, theme injection, analytics
│   ├── pages/
│   │   ├── index.astro            ← homepage
│   │   ├── products/
│   │   │   ├── index.astro        ← product listing
│   │   │   └── [slug].astro       ← product detail
│   │   ├── categories/
│   │   │   └── [slug].astro       ← category page
│   │   ├── blog/
│   │   │   ├── index.astro        ← blog listing
│   │   │   └── [slug].astro       ← blog post
│   │   ├── events/
│   │   │   └── [slug].astro       ← landing pages
│   │   ├── cart.astro             ← shopping cart
│   │   ├── ru/                    ← Russian mirror
│   │   └── en/                    ← English mirror
│   ├── components/
│   │   ├── ProductCard.astro
│   │   ├── ProductGrid.astro
│   │   ├── SearchBar.astro
│   │   ├── WhatsAppButton.astro
│   │   ├── LanguageSwitcher.astro
│   │   ├── CartIcon.astro
│   │   ├── GhostProduct.astro
│   │   └── BookingButton.astro
│   ├── lib/
│   │   ├── supabase.ts            ← Supabase client (anon, read-only)
│   │   ├── tenant.ts              ← tenant resolution
│   │   ├── products.ts            ← product queries (Views)
│   │   ├── translations.ts        ← i18n helpers
│   │   └── analytics.ts           ← GA/Pixel injection
│   ├── content/
│   │   └── blog/                  ← migrated blog posts (markdown)
│   ├── i18n/
│   │   ├── he.json                ← UI labels Hebrew
│   │   ├── ru.json                ← UI labels Russian
│   │   └── en.json                ← UI labels English
│   └── styles/
│       └── global.css             ← Tailwind + theme overrides
├── scripts/
│   ├── migrate-wordpress.ts       ← SEO migration script
│   └── validate-migration.ts      ← Migration validator
└── public/
    ├── favicon.ico
    └── robots.txt
```

---

## ERP Changes (opticup repo)

**קבצים חדשים:**
- `modules/storefront/storefront-products.js` — bulk ops, status management
- `modules/storefront/storefront-landing.js` — landing page creator
- `modules/storefront/storefront-ai.js` — AI content generation UI
- `modules/storefront/storefront-translations.js` — translation review UI

**DB changes:**
- 3 columns on inventory (storefront_status, storefront_price, storefront_description)
- storefront_landing_pages table
- storefront_leads table
- ai_content + ai_content_corrections tables
- translations + translation_corrections + translation_glossary tables
- Views: v_storefront_products, v_storefront_categories

---

## Contracts — מה המודול חושף

```
// Views (Storefront reads)
v_storefront_products      — products with images, brand, filtered by status+stock
v_storefront_categories    — category list with product counts

// ERP helpers (shared/js/ or modules/storefront/)
updateStorefrontStatus(productIds[], status)    — bulk status change
setStorefrontPrice(productIds[], priceOrMultiplier) — bulk price
generateAIContent(productId, type)             — trigger AI generation
translateContent(entityType, entityId, lang)    — trigger translation
createLandingPage(filters, template, title)    — create event page
```

---

## כללי ברזל — ספציפי למודול 3

כל כללי הברזל מ-CLAUDE.md בתוקף, בתוספת:

1. **שני repos** — Storefront = `opticup-storefront` (Astro+TS+Tailwind). ERP = `opticup` (Vanilla JS). לעולם לא לערבב
2. **Views only** — Storefront קורא רק מ-Views ו-RPCs. אף פעם לא FROM table ישירות
3. **SEO = sacred** — לא למחוק URL, לא לשנות path structure בלי 301 redirect. Migration Validator חייב 100%
4. **AI content = auto by default** — מוצר חדש מקבל AI content מיידית. לא מחכה לאישור. תיקונים = שיפור עתידי
5. **Translation = auto by default** — מוצר חדש מתורגם מיידית. status='auto'. מתרגמן משפר ב-background
6. **Tenant data isolation** — Storefront של tenant A לעולם לא רואה מוצרים של tenant B. Views מסננות tenant_id

---

## Autonomous Execution Notes

**מודול 3 רץ ב-autonomous mode.**

כל PHASE_SPEC נכתב על ידי הצ'אט האסטרטגי ברמת פירוט שClaude Code יכול לבצע בלי שאלות:
- SQL מוכן להרצה
- קבצים עם נתיבים מדויקים
- כל פונקציה עם חתימה ודוגמה
- Verification checklist ספציפי

**Flow:**
1. Daniel + צ'אט אסטרטגי = אפיון מעמיק → PHASE_SPEC
2. PHASE_SPEC נשמר ב-repo
3. Daniel מריץ AUTONOMOUS_START
4. Claude Code רץ step-by-step, checkpoint כל 3 steps
5. Daniel בודק, מאשר, ממשיך לפאזה הבאה

---

*מסמך זה הוא ROADMAP של מודול 3. 8 פאזות, כל התלויות, כל ה-contracts.*
*צ'אט אסטרטגי חדש — קרא הכל והמשך מהפאזה הראשונה שסטטוסה ⬜.*
