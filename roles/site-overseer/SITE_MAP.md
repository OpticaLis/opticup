# SITE_MAP — Prizma Storefront (Site Overseer Mode A baseline)

> **Purpose:** Single-page reference of where every customer-visible value, route, and surface lives. Future Mode B audits read this file to pinpoint a single slice without re-walking the whole site.
> **Authored:** 2026-05-07 (first version)
> **Author:** opticup-executor running Site Overseer Mode A discovery
> **Source SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SPEC.md`
> **Public URL:** https://prizma-optic.co.il (custom domain) → Vercel project `opticup-storefront` → branch `main`
> **Sibling repo:** `opticalis/opticup-storefront` — Astro 5 + TypeScript + Tailwind + Vercel SSR
> **Default lang:** `he` (RTL). Other supported: `en`, `ru`.

---

## §1 Routes — what URLs exist and how they resolve

### 1A. Hardcoded Astro pages (file → URL)

| Astro file | URL pattern | Notes |
|---|---|---|
| `src/pages/index.astro` | `/` | HE homepage. Uses CMS body for content + storefront_config for chrome. |
| `src/pages/en/index.astro` | `/en/` | EN homepage. |
| `src/pages/ru/index.astro` | `/ru/` | RU homepage. |
| `src/pages/[...slug].astro` | catch-all HE CMS pages | Renders `storefront_pages` rows with `lang='he'`. |
| `src/pages/en/[...slug].astro` | catch-all EN CMS pages | `lang='en'`. |
| `src/pages/ru/[...slug].astro` | catch-all RU CMS pages | `lang='ru'`. |
| `src/pages/products/index.astro` | `/products/` | Product catalogue (dynamic). |
| `src/pages/products/[barcode].astro` | `/products/:barcode/` | Product detail. |
| `src/pages/brands/index.astro` | `/brands/` | Brand index. |
| `src/pages/brands/[slug].astro` | `/brands/:slug/` | Brand detail. |
| `src/pages/categories/index.astro` | `/categories/` | Category index. |
| `src/pages/category/[slug].astro` | `/category/:slug/` | Category detail. |
| `src/pages/product-category/מסגרות-ראייה/index.astro` | `/product-category/מסגרות-ראייה/` | Hardcoded HE category route. |
| `src/pages/product-category/משקפי-שמש/index.astro` | `/product-category/משקפי-שמש/` | Hardcoded HE category route. |
| `src/pages/search.astro` | `/search/` | Search results. |
| `src/pages/בלוג.astro` | `/בלוג/` | Blog (HE). **Currently 500 on raw-UTF-8 fetch — see FIND-001.** |
| `src/pages/en/blog.astro` | `/en/blog/` | Blog EN. |
| `src/pages/ru/blog.astro` | `/ru/blog/` | Blog RU. |
| `src/pages/event-register/index.astro` | `/event-register/` | Event registration form. |
| `src/pages/quick-register/index.astro` | `/quick-register/` | QR-walk-in registration form. |
| `src/pages/unsubscribe/index.astro` | `/unsubscribe/` | Email unsubscribe form. |
| `src/pages/supersale-stock/index.astro` | `/supersale-stock/` | Supersale stock landing. |
| `src/pages/supersale-takanon/index.astro` | `/supersale-takanon/` | Supersale terms (HARDCODED — contains landline 08-6751313 + non-canonical phone format `053-364-5404`, FIND-004). |
| `src/pages/accessibility.astro` | `/accessibility/` | Accessibility statement (legal). |
| `src/pages/404.astro` | (default 404) | Branded 404 page (200KB rendered). |
| `src/pages/api/leads/submit.ts` | `/api/leads/submit` (POST) | Lead intake. **Brand leak: from='Optic Up Leads ...' — FIND-016.** |

### 1B. CMS-driven routes (resolved via `[...slug].astro` against `storefront_pages` rows)

Below: 32 distinct slugs, ≥80 lang-variants confirmed in DB.

**Homepage (3 langs):** `/` he / en / ru — page_type=`homepage`, all published.
**Custom (4 slugs × 3 langs = 12 rows):**
- `/about/` he/en/ru — published.
- `/optometry/` he/en/ru — **DRAFT** (404 publicly). FIND-014.
- `/prizmaexpress/` he/en/ru — published.
- `/צרו-קשר/` he/en/ru — published. FIND-001 raw-UTF-8 5xx.
- `/שאלות-ותשובות/` he/en/ru — published. FIND-001 raw-UTF-8 5xx.

**Guide (3 slugs × 3 langs = 9 rows):**
- `/lab/` he/en/ru — published.
- `/multifocal-guide/` he/en/ru — published BUT **route 404** (FIND-010).
- `/משקפי-מולטיפוקל/` he/en/ru — published. FIND-001 raw-UTF-8 5xx.

**Legal (8 slugs × varying langs = 22 rows):**
- `/accessibility/` he/en/ru — published. (BUT also a hardcoded Astro page exists — possible duplication finding.)
- `/deal/` he/en/ru — published. **FIND-002 empty body 200/0.**
- `/multi-takanon/` he ONLY — FIND-013 translation gap.
- `/privacy/` he/en/ru — published. **FIND-002 empty body 200/0.**
- `/prizma-express-terms/` he/en/ru — published.
- `/supersale-takanon/` he/en/ru — published in CMS BUT a hardcoded Astro page also exists. Possible duplication.
- `/terms-branches/` he/en/ru — published.
- `/terms/` he/en/ru — published. **FIND-002 empty body 200/0.**
- `/משלוחים-והחזרות/` he/en/ru — published. FIND-001 raw-UTF-8 5xx.

**Campaign (12 slugs × HE only = 12 rows):**
- `/eventsunsubscribe/`, `/general/`, `/multisale-brands-cat/`, `/multisale-brands-cat2/`, `/premiummultisale/`, `/successfulmulti/`, `/successfulsupersale/`, `/supersale-models-prices/`, `/supersale-stock/`, `/supersale/`, `/supersalepricescatalog/`, `/מיופיה/` (last one = FIND-001 raw-UTF-8 5xx).

**Landing (1 slug × 3 langs = 3 rows):**
- `/multi/` he/en/ru — published.

### 1C. Sitemap & robots

- `/robots.txt` (200) declares `Sitemap: /sitemap-dynamic.xml` ✓.
- `/sitemap-dynamic.xml` (200) — 361 URLs (full inventory). **Authoritative.**
- `/sitemap-index.xml` (200) — auto-published by Astro Sitemap, references `/sitemap-0.xml` (only 25 URLs). **Incomplete — FIND-045.**
- `/sitemap-0.xml` (200) — 25 URLs.
- `/sitemap.xml` — **404** (legacy paths checked).

---

## §2 Customer-visible values — where each lives

### 2A. Tenant identity

| Value | Stored in | Read by | Currently rendered as |
|---|---|---|---|
| Tenant name | `tenants.name` (HE: "אופטיקה פריזמה") | `tenant.name` in `tenant.ts`, fallback `'Optic Up'` | "אופטיקה פריזמה" ✓ (but fallback FIND-017) |
| Logo | `tenants.logo_url` (Supabase Storage) AND `storefront_config.site_logo_url` (`/images/prizma-logo-site.png`) | `Header.astro:58` `<img src={tenantLogo \|\| '/images/prizma-logo-site.png'}>` | Renders on Tier-1 pages ✓ |
| White-mode logo | `storefront_config.site_logo_white_url` | (not audited which component) | — |
| Favicon | `storefront_config.favicon_url` = `/favicon.ico` | `<link rel="icon">` | Works ✓; `/favicon.svg` also exists (93KB — FIND-032). |
| OG image (default) | `storefront_config.og_image_url` (image-proxied) | `<meta property="og:image">` | ✓ |

### 2B. Contact channels

| Channel | Source row | Format | Rendered location |
|---|---|---|---|
| **Phone (canonical)** | `tenants.business_phone` = `053-3645404` | `0XX-XXX-XXXX` | Header tel-CTA, Schema.org telephone, footer (when business_email present). |
| Phone display (alt) | `tenants.ui_config.support_phone_display` = `053-3645404` | same | Used in template-substituted messages. |
| WhatsApp e164 | `tenants.ui_config.whatsapp_phone_e164` = `972533645404` | E.164 (no +) | wa.me URLs. |
| WhatsApp number | `storefront_config.whatsapp_number` = `0533645404` | local-no-dashes | FloatingWhatsAppButton.astro / WhatsAppButton.astro derive `wa.me/972533645404`. |
| Email | `tenants.business_email` = **NULL** | — | **Footer email block hidden — FIND-005.** |
| Booking URL | `storefront_config.booking_url` = `https://yoman.co.il/Prizamaoptic` | URL | Header booking CTA + footer "Book Eye Exam" link. (Note URL has typo `Prizama` not `Prizma` — vendor-side, intentional?) |
| **PHANTOM PHONE** | CMS bodies of 24 page rows + `_deprecated/legal-terms.ts` + `public/images/lab/israel-hayom-logo.png` (misnamed) | `053-434-7265` / `0534347265` / `053-4347265` | **Renders on every homepage as the contact phone — FIND-003.** Provenance unconfirmed. |
| Address (DB) | `tenants.business_address` = `הרצל 32, אשקלון` | text | Used in Schema.org (planned, not yet — FIND-047). |
| Address (footer) | `storefront_config.footer_config.contact.address.{he,en,ru}` = `הרצל 32, מדרחוב, אשקלון` / `32 Herzl St, Ashkelon` / `Герцль 32, Ашкелон` | text | Footer contact block. **Address drift — FIND-006.** |
| Address (hardcoded fallback) | `Footer.astro:104` `defaultContact` | same as DB | If footerConfig is null, hardcoded fallback fires. |
| Social — Facebook | `storefront_config.footer_config.social[0]` | URL | Footer. |
| Social — Instagram | `storefront_config.footer_config.social[1]` | URL | Footer. |
| Email typo'd | CMS bodies (multiple legal pages) | `service@prizma-optice.co.il` (TYPO — extra 'e') | Visible in legal page bodies — FIND-022. Domain may not exist. |

### 2C. Branding / theming

| Token | Stored in | Used by | Notes |
|---|---|---|---|
| Gold (canon) | `tenants.ui_config.brand.gold` = `#c9a555` | Brand canon docs | Authoritative per project canon. |
| Gold (light) | `tenants.ui_config.brand.gold_light` = `#e8da94` | (not visibly bound yet) | — |
| Gold (hover) | `tenants.ui_config.brand.gold_hover` = `#b8943f` | (not visibly bound yet) | — |
| Theme accent | `storefront_config.theme.accent` = `#d4a853` | CSS var `--color-primary` (likely) | **Different from brand.gold — FIND-025.** |
| Theme primary | `storefront_config.theme.primary` = `#1e3a5f` | CSS var | Navy. |
| Theme primary-dark | `storefront_config.theme['primary-dark']` = `#0f1f33` | CSS var | — |
| Theme primary-light | `storefront_config.theme['primary-light']` = `#2a5a8f` | CSS var | — |
| Storefront URL | `tenants.ui_config.storefront_url` | (read-only descriptor) | `https://prizma-optic.co.il`. |
| Default Waze | `tenants.ui_config.default_waze_url` | Used in messaging templates | `https://waze.com/ul/hsv8s5h2c3`. |

### 2D. SEO defaults

| Token | Stored in | Rendered as |
|---|---|---|
| Site title (default) | `storefront_config.seo.title` = `"אופטיקה פריזמה \| משקפיים ועדשות מגע"` | Homepage `<title>` (per-page override possible via `meta_title`). |
| Site keywords | `storefront_config.seo.keywords` | (not rendered — meta keywords deprecated by Google) |
| Site description | `storefront_config.seo.description` | Homepage default `<meta description>`. |
| Per-page meta_title | `storefront_pages.meta_title` | Page `<title>` if non-empty. |
| Per-page meta_description | `storefront_pages.meta_description` | Page `<meta description>` if non-empty. |
| `noindex` flag | `storefront_pages.noindex` (default false) | `<meta robots="noindex">` if true. (None observed in audit.) |

### 2E. Analytics / pixels

| Pixel | Stored in | Loaded? |
|---|---|---|
| Facebook Pixel | `storefront_config.analytics.facebook_pixel_id` = `304574492100180` | Yes, on all pages. |
| GTM ID | `storefront_config.analytics.gtm_id` | Conditional. |
| GA4 ID | `storefront_config.analytics.ga_id` | Conditional. |
| TikTok Pixel | `storefront_config.analytics.tiktok_pixel_id` | Conditional. |
| Hotjar | `storefront_config.analytics.hotjar_id` | Conditional. |
| Pixel events (Lead) | `storefront_config.analytics.pixel_events[]` | Triggered on `/successfulsupersale/`, `/successfulmulti/` (HE/EN/RU variants). |
| Userway accessibility widget | (CSP-allowlisted, source unclear) | Yes. |

### 2F. Languages

- `storefront_config.default_language` = `he`
- `storefront_config.supported_languages` = `[he, en, ru]`
- `storefront_config.auto_translate_languages` = `[]` (auto-translate disabled at config level)
- `storefront_config.auto_publish_threshold` = (not surfaced to audit; default likely 0 or null)

---

## §3 Components / layouts

| Component | Path | Customer-visible? | Audit notes |
|---|---|---|---|
| Base layout | `src/layouts/BaseLayout.astro` | Yes (all pages) | Mounts Header, Footer, FloatingWhatsAppButton, FloatingWishlistButton. Conditional on `hideChrome`. |
| Campaign layout | `src/layouts/CampaignLayout.astro` | Yes (campaign pages) | (Not deeply audited.) |
| Header | `src/components/Header.astro` | Yes | Logo, language switcher, phone CTA (`tel:${phone}`), booking CTA. |
| Footer | `src/components/Footer.astro` | Yes | 4-5 column links + contact (address, phone, email, social). Reads `footerConfig` from storefront_config OR falls back to hardcoded `defaultContact` / `defaultSocial`. |
| Floating WhatsApp | `src/components/FloatingWhatsAppButton.astro` | Yes | Persistent bottom-right button. Source-comment cites format example `0533645404 → 972533645404` (placeholder, OK per L-PROJECT-001). |
| Floating Wishlist | `src/components/FloatingWishlistButton.astro` | Yes | (Not deeply audited.) |
| WhatsAppButton | `src/components/WhatsAppButton.astro` | Yes | Inline (vs floating) WA CTA. |

---

## §4 i18n surface

- **JSON files:** `src/i18n/{en,he,ru}.json` — keyed dictionary.
- **Orphan keys** (defined but not used — Iron Rule 21):
  - `poweredBy` (3 langs) — translated as "Powered by Optic Up" / "מופעל על ידי Optic Up" / "Работает на Optic Up". **Not rendered anywhere in audit.** FIND-019.
- **Concerning keys:**
  - `error_phone` (3 langs) — uses sample `0537889878` looking like a real number. FIND-021.

---

## §5 External integrations / endpoints

| Service | URL pattern | Purpose |
|---|---|---|
| Supabase REST | `https://*.supabase.co/rest/v1/...` (CSP-allowlisted) | Tenant config, products, brands, leads. |
| Supabase Storage | `https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/object/public/...` | **Some images bypass `/api/image/` proxy — Iron Rule 25 violation (FIND-052).** |
| Image proxy | `/api/image/[...path].ts` | Should proxy ALL Supabase images. |
| Lead intake EF | (server-side via `/api/leads/submit`) | Internal POST handler. **Brand leak FIND-016.** |
| Yoman booking | `https://yoman.co.il/Prizamaoptic` | Eye exam booking (vendor URL has `Prizama` typo — vendor-side). |
| Userway widget | `https://cdn.userway.org/...` | Accessibility widget. |
| Facebook Pixel | `https://connect.facebook.net/...` | Pixel ID 304574492100180. |
| GTM | `https://www.googletagmanager.com/...` | Conditional on config. |
| GA4 | `https://www.google-analytics.com/...` | Conditional. |
| Hotjar | `https://*.hotjar.com/...` | Conditional. |
| TikTok | `https://analytics.tiktok.com/...` | Conditional. |
| WhatsApp | `https://wa.me/972533645404` | Floating + inline buttons. |
| Waze | `https://waze.com/ul/hsv8s5h2c3` | Stored in ui_config; messaging templates may use. |

---

## §6 Known broken or fragile spots (audit snapshot)

(References to specific findings live in `SITE_AUDIT_REPORT.md`. This section is a navigation aid.)

- **Hebrew-slug raw-UTF-8 redirect mishandling** — Vercel redirect → 6 pages × 500. FIND-001.
- **String-body CMS rows** rendered as 200/empty — `/terms/`, `/privacy/`, `/deal/`. FIND-002.
- **Phantom secondary phone `053-434-7265`** in 24 CMS bodies + 1 misnamed file + 1 _deprecated/. FIND-003.
- **Brand leak in lead-confirmation email** ("Optic Up Leads"). FIND-016.
- **`'Optic Up'` string-fallback in 13 .astro files.** FIND-017.
- **Iron Rule 25 image-proxy violation** — direct Supabase Storage URLs in 6+ pages. FIND-052.
- **Misnamed file** `public/images/lab/israel-hayom-logo.png` is HTML, contains tel:0534347265. FIND-056.
- **Sitemap mismatch** — 25-URL Astro auto sitemap vs 361-URL dynamic sitemap. FIND-045.
- **Missing LocalBusiness schema fields** — no address, no openingHours, no geo, no aggregateRating. FIND-047.
- **Hardcoded landline + non-canonical phone format** in `supersale-takanon/index.astro`. FIND-004.

---

## §7 How to use this map (Mode B operator notes)

When asked to audit a specific concern (e.g. "are there any other Optic Up leaks I should know about?", "what tracker scripts are loading on /supersale/?", "did `tenants.business_email` get set yet?"), Mode B operator can:

1. Open this file → §2 (values table) or §1 (routes table) to find where the value lives.
2. Run a targeted query — read just the storage row(s), read just the rendered HTML for the relevant slug, run just the relevant grep against the sibling repo.
3. Update the relevant row of this map if it's drifted.
4. Append findings to a new SPEC's `SITE_AUDIT_REPORT.md` if it's a new audit, or to an existing audit if the scope matches.

**Update cadence:** This file is regenerated when (a) `storefront_config` schema changes, (b) `tenants` columns change, (c) a major route is added/removed, (d) the SaaS architecture model shifts. Targeted Mode B audits should NOT rewrite this file — they should leave a "drift detected here" note and let a future Mode A regenerate.

---

*End of SITE_MAP.md (v1).*
