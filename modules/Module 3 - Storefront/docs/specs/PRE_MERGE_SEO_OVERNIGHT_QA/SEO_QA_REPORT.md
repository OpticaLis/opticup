# SEO QA Report — Pre-DNS Switch (Prizma Optic)

> **Generated:** 2026-04-15T20:20:48.376Z
> **SPEC:** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_OVERNIGHT_QA/SPEC.md`
> **Mode:** Overnight automated audit (read-only)
> **Local dev origin:** `http://localhost:4321`
> **Canonical production origin:** `https://prizma-optic.co.il`

## 1. Executive Summary

**Verdict for DNS switch: GREEN** — All high-traffic URLs covered; remaining MISSING are long tail (<10 clicks) or 0-traffic.

- URLs audited from GSC Pages.csv: **1000**
- OK_200 (resolves natively on storefront): **96**
- OK_301_REDIRECT (vercel.json rule → 200 destination): **863**
- OK_410_INTENTIONAL: **0**
- MISSING (no redirect, 404 on storefront): **41** (of which **0** carry ≥10 clicks)
- Multi-hop redirect chains: **46**
- HTTP (insecure) URLs in GSC: **0**
- Sitemap `/sitemap-dynamic.xml`: **245 \<loc\> entries** — **58** broken
- robots.txt status: **200**, 2 Sitemap directive(s), disallow-all: false
- 404 handler: ⚠ some probes returned non-404 (soft-404)
- Top-100 on-page: canonical_ok **97/100**, og_complete **27/100**, twitter_complete **27/100**, title_ok **23/100**, desc_ok **88/100**
- noindex sweep (959 OK URLs): **0** hits
- Internal links checked: **758**, broken: **0**
- Query coverage: 1000 queries analyzed; **195** queries have their term on the guessed landing page
- Lighthouse (top-20 URLs, mobile): avg Perf=**59.5**, A11y=**94.5**, BP=**81.1**, SEO=**91.7** (dev-mode; production will score higher)

## 2. Missing URLs (Traffic-Ranked)

The headline list — URLs that Google currently knows about but that return 404 on the new storefront with no vercel.json redirect in place. Sorted by clicks (descending).

| # | URL | Clicks | Impressions | CTR | Position | Request path | Host | Suggested Target | Confidence |
|---|-----|-------:|-----------:|----:|---------:|------|------|------|-----|
| 1 | https://prizma-optic.co.il/page/5/ | 1 | 38 | 2.63% | 22.82 | `/page/5/` | prizma-optic.co.il | manual review | NONE |
| 2 | https://prizma-optic.co.il/supersale-2nd-backup/ | 1 | 5 | 20.00% | 21 | `/supersale-2nd-backup/` | prizma-optic.co.il | manual review | NONE |
| 3 | https://prizma-optic.co.il/page/22/?post_type=product&page=6&add-to-cart=7690 | 1 | 1 | 100.00% | 5 | `/page/22/?post_type=product&page=6&add-to-cart=7690` | prizma-optic.co.il | manual review | NONE |
| 4 | https://prizma-optic.co.il/page/30/?post_type=product&page=2&add-to-cart=14032 | 1 | 1 | 100.00% | 30 | `/page/30/?post_type=product&page=2&add-to-cart=14032` | prizma-optic.co.il | manual review | NONE |
| 5 | https://prizma-optic.co.il/page/3/ | 0 | 36 | 0.00% | 36.69 | `/page/3/` | prizma-optic.co.il | manual review | NONE |
| 6 | https://prizma-optic.co.il/page/38/?add-to-cart=7727 | 0 | 26 | 0.00% | 23.73 | `/page/38/?add-to-cart=7727` | prizma-optic.co.il | manual review | NONE |
| 7 | https://prizma-optic.co.il/page/2/ | 0 | 16 | 0.00% | 6.19 | `/page/2/` | prizma-optic.co.il | manual review | NONE |
| 8 | https://prizma-optic.co.il/page/19/?add-to-cart=7766 | 0 | 14 | 0.00% | 67.86 | `/page/19/?add-to-cart=7766` | prizma-optic.co.il | manual review | NONE |
| 9 | https://prizma-optic.co.il/multi-ariha/ | 0 | 12 | 0.00% | 28.33 | `/multi-ariha/` | prizma-optic.co.il | manual review | NONE |
| 10 | https://prizma-optic.co.il/page/30/ | 0 | 9 | 0.00% | 2.11 | `/page/30/` | prizma-optic.co.il | manual review | NONE |
| 11 | https://prizma-optic.co.il/page/10/ | 0 | 9 | 0.00% | 7.67 | `/page/10/` | prizma-optic.co.il | manual review | NONE |
| 12 | https://prizma-optic.co.il/page/40/?page_id=25 | 0 | 8 | 0.00% | 4.12 | `/page/40/?page_id=25` | prizma-optic.co.il | manual review | NONE |
| 13 | https://prizma-optic.co.il/page/29/ | 0 | 8 | 0.00% | 17.12 | `/page/29/` | prizma-optic.co.il | manual review | NONE |
| 14 | https://prizma-optic.co.il/bc-iliya/ | 0 | 7 | 0.00% | 8.29 | `/bc-iliya/` | prizma-optic.co.il | manual review | NONE |
| 15 | https://prizma-optic.co.il/page/31/?add-to-cart=6986 | 0 | 7 | 0.00% | 56.43 | `/page/31/?add-to-cart=6986` | prizma-optic.co.il | manual review | NONE |
| 16 | https://prizma-optic.co.il/bc-daniel/ | 0 | 5 | 0.00% | 5.8 | `/bc-daniel/` | prizma-optic.co.il | manual review | NONE |
| 17 | https://prizma-optic.co.il/page/13/ | 0 | 5 | 0.00% | 6 | `/page/13/` | prizma-optic.co.il | manual review | NONE |
| 18 | https://prizma-optic.co.il/product_brand/dolce-gabbana/?page=3 | 0 | 5 | 0.00% | 10 | `/product_brand/dolce-gabbana/?page=3` | prizma-optic.co.il | manual review | NONE |
| 19 | https://prizma-optic.co.il/page/6/ | 0 | 5 | 0.00% | 13.4 | `/page/6/` | prizma-optic.co.il | manual review | NONE |
| 20 | https://prizma-optic.co.il/page/17/ | 0 | 4 | 0.00% | 6 | `/page/17/` | prizma-optic.co.il | manual review | NONE |
| 21 | https://prizma-optic.co.il/page/41/?post_type=product&page=27&add-to-cart=7547 | 0 | 4 | 0.00% | 7 | `/page/41/?post_type=product&page=27&add-to-cart=7547` | prizma-optic.co.il | manual review | NONE |
| 22 | https://prizma-optic.co.il/page/6/?post_type=product&page=3 | 0 | 4 | 0.00% | 9 | `/page/6/?post_type=product&page=3` | prizma-optic.co.il | manual review | NONE |
| 23 | https://prizma-optic.co.il/page/9/?add-to-cart=6528 | 0 | 4 | 0.00% | 23.75 | `/page/9/?add-to-cart=6528` | prizma-optic.co.il | manual review | NONE |
| 24 | https://prizma-optic.co.il/page/12/ | 0 | 4 | 0.00% | 36.5 | `/page/12/` | prizma-optic.co.il | manual review | NONE |
| 25 | https://prizma-optic.co.il/page/26/?post_type=product&page=2&add-to-cart=14706 | 0 | 4 | 0.00% | 51.5 | `/page/26/?post_type=product&page=2&add-to-cart=14706` | prizma-optic.co.il | manual review | NONE |
| 26 | https://prizma-optic.co.il/page/43/?post_type=product&page=2&add-to-cart=5572 | 0 | 4 | 0.00% | 57.75 | `/page/43/?post_type=product&page=2&add-to-cart=5572` | prizma-optic.co.il | manual review | NONE |
| 27 | https://prizma-optic.co.il/page/35/ | 0 | 4 | 0.00% | 59 | `/page/35/` | prizma-optic.co.il | manual review | NONE |
| 28 | https://prizma-optic.co.il/page/37/?post_type=product&page=15&add-to-cart=11843 | 0 | 3 | 0.00% | 2 | `/page/37/?post_type=product&page=15&add-to-cart=11843` | prizma-optic.co.il | manual review | NONE |
| 29 | https://prizma-optic.co.il/page/38/?post_type=product&page=9&add-to-cart=9432 | 0 | 3 | 0.00% | 2.67 | `/page/38/?post_type=product&page=9&add-to-cart=9432` | prizma-optic.co.il | manual review | NONE |
| 30 | https://prizma-optic.co.il/page/11/?post_type=product&page=12&add-to-cart=9315 | 0 | 3 | 0.00% | 4.67 | `/page/11/?post_type=product&page=12&add-to-cart=9315` | prizma-optic.co.il | manual review | NONE |
| 31 | https://prizma-optic.co.il/page/27/ | 0 | 3 | 0.00% | 5.33 | `/page/27/` | prizma-optic.co.il | manual review | NONE |
| 32 | https://prizma-optic.co.il/page/30/?post_type=product&page=4&add-to-cart=13844 | 0 | 3 | 0.00% | 11 | `/page/30/?post_type=product&page=4&add-to-cart=13844` | prizma-optic.co.il | manual review | NONE |
| 33 | https://prizma-optic.co.il/page/26/?add-to-cart=7311 | 0 | 3 | 0.00% | 15.67 | `/page/26/?add-to-cart=7311` | prizma-optic.co.il | manual review | NONE |
| 34 | https://prizma-optic.co.il/page/33/ | 0 | 3 | 0.00% | 22.33 | `/page/33/` | prizma-optic.co.il | manual review | NONE |
| 35 | https://prizma-optic.co.il/wp-content/uploads/2022/12/%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%92%D7%A2-%D7%9B%D7%9C-%D7%94%D7%99%D7%AA%D7%A8%D7%95%D7%A0%D7%95%D7%AA-%D7%91%D7%A2%D7%93%D7%A9%D7%94-%D7%90%D7%97%D7%AA-1024x683.jpg | 0 | 3 | 0.00% | 23.33 | `/wp-content/uploads/2022/12/עדשות-מגע-כל-היתרונות-בעדשה-אחת-1024x683.jpg` | prizma-optic.co.il | manual review | NONE |
| 36 | https://prizma-optic.co.il/page/26/?add-to-cart=6777 | 0 | 3 | 0.00% | 46.67 | `/page/26/?add-to-cart=6777` | prizma-optic.co.il | manual review | NONE |
| 37 | https://prizma-optic.co.il/page/26/?post_type=product&page=2&add-to-cart=7947 | 0 | 3 | 0.00% | 54 | `/page/26/?post_type=product&page=2&add-to-cart=7947` | prizma-optic.co.il | manual review | NONE |
| 38 | https://prizma-optic.co.il/page/30/?add-to-cart=6673 | 0 | 3 | 0.00% | 58.67 | `/page/30/?add-to-cart=6673` | prizma-optic.co.il | manual review | NONE |
| 39 | https://prizma-optic.co.il/page/40/?add-to-cart=5840 | 0 | 3 | 0.00% | 76 | `/page/40/?add-to-cart=5840` | prizma-optic.co.il | manual review | NONE |
| 40 | https://prizma-optic.co.il/john-dalia/?add-to-cart=9545 | 0 | 2 | 0.00% | 2.5 | `/john-dalia/?add-to-cart=9545` | prizma-optic.co.il | manual review | NONE |
| 41 | https://prizma-optic.co.il/page/15/ | 0 | 2 | 0.00% | 3 | `/page/15/` | prizma-optic.co.il | manual review | NONE |

**Total MISSING:** 41. **With ≥10 clicks:** 0.

## 3. Redirect Chain & HTTPS Canonicalization

### 3.1 Host canonicalization

- Apex (`prizma-optic.co.il`) URLs in GSC: **638**
- WWW (`www.prizma-optic.co.il`) URLs in GSC: **0**
- EN subdomain (`en.prizma-optic.co.il`) URLs in GSC: **227**
- RU subdomain (`ru.prizma-optic.co.il`) URLs in GSC: **135**
- **Decision:** apex `prizma-optic.co.il` is canonical — vercel.json contains `has.host = (en|ru).prizma-optic.co.il` catch-all rules that 308-redirect subdomain requests into `/en/…` and `/ru/…` on apex.
- Recommendation: confirm at DNS that both apex and `www` point to Vercel, and that Vercel is configured to redirect `www` → apex. (Not testable on localhost; check Vercel dashboard.)

### 3.2 Trailing-slash policy

- GSC URLs with trailing slash: **999**
- GSC URLs without trailing slash: **1**
- The storefront canonical tags consistently use the trailing slash form. Astro's `trailingSlash` is default (allow both).

### 3.3 Multi-hop chains (redirect_hops > 1)

Total: **46**.

| # | URL | Hops | Final status |
|---|-----|----:|---|
| | https://prizma-optic.co.il/etniabarcelona/ | 2 | 200 |
| | https://prizma-optic.co.il/product_brand/milo-me/ | 2 | 200 |
| | https://prizma-optic.co.il/product_brand/henryjullien/ | 2 | 200 |
| | https://ru.prizma-optic.co.il/%D0%BE%D1%82%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8-%D0%B8-%D0%B2%D0%BE%D0%B7%D0%B2%D1%80%D0%B0%D1%82%D1%8B/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/treboss/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/kristian-olsen/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/a-ga-ta/ | 2 | 200 |
| | https://prizma-optic.co.il/bolle/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/genny/ | 2 | 200 |
| | https://ru.prizma-optic.co.il/%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D0%BB%D0%B0-%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D0%BE%D0%B8-%D0%BE%D0%BF%D1%82%D0%B8%D0%BA%D0%B8/ | 2 | 200 |
| | https://prizma-optic.co.il/product_brand/etnia/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/byblos/ | 2 | 200 |
| | https://prizma-optic.co.il/product/saint-laurent-sl402/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/ray-ban/ | 2 | 200 |
| | https://en.prizma-optic.co.il/lenses/ | 2 | 200 |
| | https://ru.prizma-optic.co.il/product_brand/emporio-armani/ | 2 | 200 |
| | https://ru.prizma-optic.co.il/%D0%B2%D0%BE%D0%BF%D1%80%D0%BE%D1%81%D1%8B-%D0%B8-%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D1%8B/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/clark/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/kenzo/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/kimura/ | 2 | 200 |
| | https://en.prizma-optic.co.il/shipments-and-returns/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/kokety/ | 2 | 200 |
| | https://en.prizma-optic.co.il/contact-us/ | 2 | 200 |
| | https://prizma-optic.co.il/product_brand/bolle/ | 2 | 200 |
| | https://en.prizma-optic.co.il/rules-for-servicing-mobile-optics-prizma-optic-prisma-express/ | 2 | 200 |
| | https://ru.prizma-optic.co.il/%D0%B1%D0%BB%D0%BE%D0%B3/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/borbonese/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/michael-kors/ | 2 | 200 |
| | https://prizma-optic.co.il/product_brand/lool/ | 2 | 200 |
| | https://en.prizma-optic.co.il/product_brand/armani-exchange/ | 2 | 200 |
| | … and 16 more | | |

### 3.4 HTTPS canonicalization

HTTP (insecure) URLs in GSC: **0**. No http→http or http→200 leaks detected.

## 4. Sitemap & robots.txt

### 4.1 Sitemap

- Source: `http://localhost:4321/sitemap-dynamic.xml`
- Total `<loc>` entries: **245**
- Broken `<loc>` entries: **58**

**Broken entries (sample, first 30):**

| # | loc | Status |
|---|-----|---|
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עדשות-מגע-אשקלון/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/איך-לבחור-משקפי-ראייה/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/אופטיקה-באשקלון/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/בעיניים-פקוחות-איך-לשמור-על-בריאות-העי/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עיניים-בוהקות-בעידן-הדיגיטלי-טכנולוג-2/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/העין-האנושית/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/המדריך-המקוצר-לניקוי-ואחסון-עדשות-מגע/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/תזונה-ובריאות-העין-מה-כדאי-לאכול-בשביל/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/7-הרגלים-פשוטים-לעיניים-בריאות-יותר/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/איך-להגן-על-העיניים-מפני-השמש/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/טיפים-בריאות-העיניים-אצל-ילדים/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/סגנון-חיים-איכות-הראיה/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/סוגי-עדשות-מולטיפוקל/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/בחנו-את-עצמכם-האם-אתם-עיוורי-צבעים/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עדשות-למניעת-החמרת-מיופיה/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עדשות-מולטיפוקל-בחירה-נכונה-משנה-את/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/איך-לבחור-משקפיים/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/שירות-אופטיקה-עד-הבית/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עדשות-מולטיפוקל-צייס/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/מיופיה/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/מצאו-את-הבליינד-ספוט-שלכם/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/מסגרות-למשקפי-מולטיפוקל/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/מניעת-קוצר-ראייה-לילדים/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/עיניים-בסיכון-המחלות-הנפוצות-שעלולו/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/משקפיים-זה-בלשון-זכר-או-נקבה-🤔/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/בדיקת-ראייה-באשקלון/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/טיפול-דחוף-בעין-מה-לעשות/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/מעבדת-תיקון-משקפי-ראייה-באשקלון-2/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/משקפי-ראייה-דרך-כללית/ | 404 |
| | https://prizma-optic.co.il/%D7%91%D7%9C%D7%95%D7%92/בחנו-את-עצמכם-חידון-טריוויה/ | 404 |

### 4.2 robots.txt

- Status: **200**
- `Disallow: /` present: **false**
- Sitemap directives: **2** — `https://prizma-optic.co.il/sitemap-dynamic.xml`, `https://prizma-optic.co.il/sitemap-index.xml`
- Sitemap URL resolves: **true**

## 5. Top-100 On-Page Signals + Site-Wide noindex Sweep

Deep HTML analysis of the 100 highest-traffic URLs from GSC (clicks descending). Lightweight `meta robots` / `X-Robots-Tag` sweep across all 959 OK URLs.

| Signal | Count (of 100) | Pass % |
|---|---:|---:|
| Self-referential canonical | 97 | 97.0% |
| hreflang ≥ 3 entries | 100 | 100.0% |
| hreflang x-default present | 100 | 100.0% |
| Title present & ≤60 chars | 23 | 23.0% |
| Description present & ≤160 chars | 88 | 88.0% |
| Open Graph complete (5 tags) | 27 | 27.0% |
| Twitter card complete | 27 | 27.0% |
| JSON-LD ≥ 1 block | 92 | 92.0% |
| noindex present (BAD on indexed page) | 0 | 0.0% |
| Image alt coverage ≥ 95% | 73 | 73.0% |

**Site-wide noindex sweep:** scanned 959 URLs → **0** noindex hits.

### 5.1 Per-URL detail (top 50 by clicks)

| URL | Clicks | Title len | Desc len | Canonical ✓ | hreflang | OG ✓ | TW ✓ | JSON-LD | Alt% | noindex |
|---|---:|---:|---:|:---:|---:|:---:|:---:|---:|---:|:---:|
| https://prizma-optic.co.il/ | 516 | 68 | 109 | ✓ | 4 | ✓ | ✓ | 5 | 97% | ✓ |
| https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | 479 | 90 | 199 | ✓ | 4 | ✓ | ✓ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | 178 | 80 | 127 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%96%D7%94-%D7%91%D7%9C%D7%A9%D7%95%D7%9F-%D7%96%D7%9B%D7%A8-%D7%90%D7%95-%D7%A0%D7%A7%D7%91%D7%94-%F0%9F%A4%94/ | 151 | 60 | 139 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://ru.prizma-optic.co.il/%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%81%D1%82%D0%BE%D1%8F%D1%82-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D0%B8/ | 108 | 86 | 137 | ✓ | 4 | ✗ | ✗ | 1 | 83% | ✓ |
| https://en.prizma-optic.co.il/rodenstock-multifocal-lenses-prices-types-and-benefits/ | 104 | 64 | 159 | ✓ | 4 | ✗ | ✗ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/fred/ | 83 | 73 | 131 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/serengeti/ | 77 | 82 | 116 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9B%D7%9C%D7%9C%D7%99%D7%AA-%D7%A4%D7%9C%D7%98%D7%99%D7%A0%D7%95%D7%9D-%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | 65 | 66 | 130 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/product_brand/john-dalia/ | 63 | 67 | 131 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/mykita/ | 52 | 61 | 128 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/gast/ | 49 | 56 | 121 | ✓ | 4 | ✗ | ✗ | 3 | 54% | ✓ |
| https://prizma-optic.co.il/%D7%91%D7%97%D7%A0%D7%95-%D7%90%D7%AA-%D7%A2%D7%A6%D7%9E%D7%9B%D7%9D-%D7%94%D7%90%D7%9D-%D7%90%D7%AA%D7%9D-%D7%A2%D7%99%D7%95%D7%95%D7%A8%D7%99-%D7%A6%D7%91%D7%A2%D7%99%D7%9D/ | 46 | 70 | 200 | ✓ | 4 | ✓ | ✓ | 1 | 100% | ✓ |
| https://ru.prizma-optic.co.il/multifocal/ | 44 | 63 | 84 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A9%D7%9E%D7%99%D7%A8/ | 40 | 74 | 117 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/celine/ | 40 | 58 | 130 | ✓ | 4 | ✗ | ✗ | 3 | 47% | ✓ |
| https://prizma-optic.co.il/kamemannen/ | 40 | 68 | 133 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8-%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%9E%D7%94-%D7%91%D7%90%D7%9E%D7%AA-%D7%A7%D7%95%D7%91%D7%A2/ | 38 | 95 | 140 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%9E%D7%99%D7%99%D7%96/ | 34 | 91 | 124 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/prizmaexpress/ | 32 | 77 | 127 | ✓ | 4 | ✗ | ✗ | 0 | 100% | ✓ |
| https://prizma-optic.co.il/onsitelab/ | 31 | 54 | 84 | ✓ | 4 | ✗ | ✗ | 0 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%94%D7%95%D7%99%D7%94-hoya/ | 30 | 82 | 113 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A8%D7%95%D7%93%D7%A0%D7%A9%D7%98%D7%95%D7%A7-rodenstock/ | 29 | 75 | 130 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://ru.prizma-optic.co.il/shop/ | 27 | 40 | 34 | ✓ | 4 | ✗ | ✗ | 2 | 100% | ✓ |
| https://prizma-optic.co.il/matsuda/ | 26 | 62 | 137 | ✓ | 4 | ✗ | ✗ | 3 | 48% | ✓ |
| https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A8%D7%90%D7%99%D7%99%D7%94/ | 25 | 40 | 55 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/porsche-design/ | 25 | 93 | 137 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A6%D7%99%D7%99%D7%A1/ | 23 | 92 | 116 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%9C%D7%99%D7%99%D7%A7%D7%94-leica-%D7%A4%D7%A1%D7%92%D7%AA-%D7%94%D7%98%D7%9B%D7%A0%D7%95%D7%9C%D7%95%D7%92/ | 23 | 79 | 128 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/fendi/ | 22 | 57 | 128 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://en.prizma-optic.co.il/hoya-multifocal-lenses-prices-types-and-benefits/ | 21 | 77 | 120 | ✓ | 4 | ✗ | ✗ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/%D7%AA%D7%96%D7%95%D7%A0%D7%94-%D7%95%D7%91%D7%A8%D7%99%D7%90%D7%95%D7%AA-%D7%94%D7%A2%D7%99%D7%9F-%D7%9E%D7%94-%D7%9B%D7%93%D7%90%D7%99-%D7%9C%D7%90%D7%9B%D7%95%D7%9C-%D7%91%D7%A9%D7%91%D7%99%D7%9C/ | 21 | 87 | 200 | ✓ | 4 | ✓ | ✓ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%A1%D7%92%D7%A8%D7%95%D7%AA-%D7%9C%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/ | 21 | 104 | 200 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/etniabarcelona/ | 21 | 46 | 15 | ✗ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/john-dalia/ | 21 | 67 | 131 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/henryjullien/ | 20 | 73 | 137 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://ru.prizma-optic.co.il/product/baviera/ | 19 | 40 | 34 | ✓ | 4 | ✗ | ✗ | 2 | 100% | ✓ |
| https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A9%D7%9E%D7%A9/ | 18 | 40 | 55 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/product_brand/mykita/ | 18 | 61 | 128 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%A1%D7%95%D7%92%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/ | 17 | 95 | 125 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A2%D7%91%D7%95%D7%A8-%D7%9C%D7%A7%D7%95%D7%97%D7%95%D7%AA-%D7%9B%D7%9C%D7%9C%D7%99%D7%AA-%D7%9E%D7%95%D7%A9/ | 17 | 83 | 133 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/cazal/ | 17 | 57 | 135 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://en.prizma-optic.co.il/shamir-multifocal-lenses-prices-types-and-advantages/ | 16 | 88 | 144 | ✓ | 4 | ✗ | ✗ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/terms-branches/ | 16 | 46 | 32 | ✓ | 4 | ✗ | ✗ | 0 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94/ | 15 | 100 | 132 | ✓ | 4 | ✓ | ✓ | 1 | 83% | ✓ |
| https://prizma-optic.co.il/%D7%98%D7%99%D7%A4%D7%95%D7%9C-%D7%93%D7%97%D7%95%D7%A3-%D7%91%D7%A2%D7%99%D7%9F-%D7%9E%D7%94-%D7%9C%D7%A2%D7%A9%D7%95%D7%AA/ | 14 | 107 | 200 | ✓ | 4 | ✓ | ✓ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/%D7%91%D7%97%D7%A0%D7%95-%D7%90%D7%AA-%D7%A2%D7%A6%D7%9E%D7%9B%D7%9D-%D7%97%D7%99%D7%93%D7%95%D7%9F-%D7%98%D7%A8%D7%99%D7%95%D7%95%D7%99%D7%94/ | 14 | 63 | 200 | ✓ | 4 | ✓ | ✓ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/product_brand/milo-me/ | 14 | 46 | 15 | ✗ | 4 | ✗ | ✗ | 1 | 100% | ✓ |
| https://prizma-optic.co.il/product_brand/kamemannen/ | 14 | 68 | 133 | ✓ | 4 | ✗ | ✗ | 3 | 100% | ✓ |
| https://ru.prizma-optic.co.il/%D1%86%D0%B5%D0%BD%D0%B0-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BB%D0%B8%D0%BD%D0%B7-optimize-%D0%B2%D0%B8%D0%B4%D1%8B-%D0%B8-%D0%BF/ | 14 | 92 | 139 | ✓ | 4 | ✗ | ✗ | 1 | 100% | ✓ |

_Full set: `artifacts/onpage-top100.json`._

## 6. Lighthouse Scores (Top-20 URLs, Mobile Emulation)

All scores computed against the Astro **dev server** (`http://localhost:4321`). Production build (minified, image-optimized, served via Vercel edge) will score meaningfully higher on Performance and Best Practices. SEO score is category-specific and less affected by dev-mode overhead.

**Averages:** Performance **59.5**, Accessibility **94.5**, Best Practices **81.1**, SEO **91.7**

| # | URL | Perf | A11y | BP | SEO |
|---|-----|---:|---:|---:|---:|
| 1 | https://prizma-optic.co.il/ | 61.0 | 96.0 | 79.0 | 92.0 |
| 2 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | 64.0 | 96.0 | 82.0 | 92.0 |
| 3 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | 59.0 | 96.0 | 82.0 | 92.0 |
| 4 | https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%96%D7%94-%D7%91%D7%9C%D7%A9%D7%95%D7%9F-%D7%96%D7%9B%D7%A8-%D7%90%D7%95-%D7%A0%D7%A7%D7%91%D7%94-%F0%9F%A4%94/ | 60.0 | 96.0 | 82.0 | 92.0 |
| 5 | https://ru.prizma-optic.co.il/%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%81%D1%82%D0%BE%D1%8F%D1%82-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D0%B8/ | 59.0 | 94.0 | 82.0 | 92.0 |
| 6 | https://en.prizma-optic.co.il/rodenstock-multifocal-lenses-prices-types-and-benefits/ | 64.0 | 94.0 | 82.0 | 85.0 |
| 7 | https://prizma-optic.co.il/fred/ | 58.0 | 92.0 | 79.0 | 92.0 |
| 8 | https://prizma-optic.co.il/serengeti/ | 60.0 | 92.0 | 79.0 | 92.0 |
| 9 | https://prizma-optic.co.il/%D7%9B%D7%9C%D7%9C%D7%99%D7%AA-%D7%A4%D7%9C%D7%98%D7%99%D7%A0%D7%95%D7%9D-%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | 59.0 | 96.0 | 82.0 | 92.0 |
| 10 | https://prizma-optic.co.il/product_brand/john-dalia/ | 59.0 | 92.0 | 79.0 | 92.0 |
| 11 | https://prizma-optic.co.il/mykita/ | 62.0 | 92.0 | 79.0 | 92.0 |
| 12 | https://prizma-optic.co.il/gast/ | 60.0 | 96.0 | 82.0 | 92.0 |
| 13 | https://prizma-optic.co.il/%D7%91%D7%97%D7%A0%D7%95-%D7%90%D7%AA-%D7%A2%D7%A6%D7%9E%D7%9B%D7%9D-%D7%94%D7%90%D7%9D-%D7%90%D7%AA%D7%9D-%D7%A2%D7%99%D7%95%D7%95%D7%A8%D7%99-%D7%A6%D7%91%D7%A2%D7%99%D7%9D/ | 61.0 | 96.0 | 82.0 | 92.0 |
| 14 | https://ru.prizma-optic.co.il/multifocal/ | 58.0 | 97.0 | 82.0 | 92.0 |
| 15 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A9%D7%9E%D7%99%D7%A8/ | 59.0 | 94.0 | 82.0 | 92.0 |
| 16 | https://prizma-optic.co.il/celine/ | 59.0 | 96.0 | 82.0 | 92.0 |
| 17 | https://prizma-optic.co.il/kamemannen/ | 56.0 | 92.0 | 79.0 | 92.0 |
| 18 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8-%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%9E%D7%94-%D7%91%D7%90%D7%9E%D7%AA-%D7%A7%D7%95%D7%91%D7%A2/ | 59.0 | 94.0 | 82.0 | 92.0 |
| 19 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%9E%D7%99%D7%99%D7%96/ | 50.0 | 94.0 | 82.0 | 92.0 |
| 20 | https://prizma-optic.co.il/prizmaexpress/ | 63.0 | 95.0 | 82.0 | 92.0 |

## 7. Query Coverage (all 1000 GSC queries)

Each query was mapped to its likely GSC landing page (via Pages.csv cross-reference), then the query text was searched inside the page's title / h1 / h2 / body text.

- Queries with a guessed landing page: **954** / 1000
- Landing page resolves OK on storefront: **954**
- Landing page is MISSING: **0**
- Query term appears on page (confidence **HIGH**): **58**
- Query term partially appears (confidence **MEDIUM**): **137**
- Query term not found or low confidence: **805**

### 7.1 Top-50 queries — per-query result

| Query | Clicks | Landing | Term? | Where | Confidence |
|---|---:|---|:---:|---|---|
| אופטיקה פריזמה | 240 | https://prizma-optic.co.il/tag/%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94-%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94/ | ✓ | title | HIGH |
| משקפיים זכר או נקבה | 60 | https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%96%D7%94-%D7%91%D7%9C%D7%A9%D7%95%D7%9F-%D7%96%D7%9B%D7%A8-%D7%90%D7%95-%D7%A0%D7%A7%D7%91%D7%94-%F0%9F%A4%94/ | ✓ |  | MEDIUM |
| פריזמה אופטיקה | 38 | https://prizma-optic.co.il/tag/%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94-%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94/ | ✓ |  | MEDIUM |
| אופטיקה פריזמה סניפים | 30 | https://prizma-optic.co.il/tag/%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94-%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94/ | ✓ |  | MEDIUM |
| משקפי פריזמה | 27 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✓ |  | MEDIUM |
| prizma optic | 27 | https://prizma-optic.co.il/ | ✗ |  | LOW |
| פריזמה אשקלון | 19 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| мультифокальные очки цена в израиле | 19 | https://ru.prizma-optic.co.il/%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%81%D1%82%D0%BE%D1%8F%D1%82-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D0%B8/ | ✗ |  | LOW |
| мультифокальные очки | 17 | https://ru.prizma-optic.co.il/%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%81%D1%82%D0%BE%D1%8F%D1%82-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D0%B8/ | ✗ |  | LOW |
| אופטיקה פריזמה אשקלון | 17 | https://prizma-optic.co.il/%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94-%D7%91%D7%94%D7%A1%D7%93%D7%A8-%D7%A2%D7%9D-%D7%9B%D7%9C%D7%9C%D7%99%D7%AA-%D7%91%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F/ | ✓ |  | MEDIUM |
| משקפיים יפים או יפות | 16 | https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%96%D7%94-%D7%91%D7%9C%D7%A9%D7%95%D7%9F-%D7%96%D7%9B%D7%A8-%D7%90%D7%95-%D7%A0%D7%A7%D7%91%D7%94-%F0%9F%A4%94/ | ✗ |  | LOW |
| צבעי עיניים | 15 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✓ | title | HIGH |
| טבלת צבע עיניים | 14 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✗ |  | LOW |
| משקפי פריזמה מחיר | 12 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| עדשות פריזמה מחיר | 11 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A9%D7%9E%D7%99%D7%A8/ | ✓ |  | MEDIUM |
| סרנגטי משקפיים | 10 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| очки для зрения | 10 | https://ru.prizma-optic.co.il/%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B4%D0%BB%D1%8F-%D1%87%D0%B5/ | ✓ |  | MEDIUM |
| עדשות פריזמה | 9 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| fred משקפיים | 9 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| פריזמה במשקפיים | 9 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✓ | title | HIGH |
| משקפי פרד | 9 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| משקפיים חדשים או חדשות | 8 | https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%96%D7%94-%D7%91%D7%9C%D7%A9%D7%95%D7%9F-%D7%96%D7%9B%D7%A8-%D7%90%D7%95-%D7%A0%D7%A7%D7%91%D7%94-%F0%9F%A4%94/ | ✗ |  | LOW |
| צבע עיניים | 8 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✓ |  | MEDIUM |
| rodenstock lenses | 8 | https://en.prizma-optic.co.il/rodenstock-multifocal-lenses-prices-types-and-benefits/ | ✗ |  | LOW |
| פריזמות במשקפיים | 8 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| משקפי סרנגטי | 7 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| פריזמה משקפיים | 7 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✓ |  | MEDIUM |
| משקפי gast | 7 | https://prizma-optic.co.il/%D7%A4%D7%A8%D7%99%D7%96%D7%9E%D7%94-%D7%91%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D/ | ✗ |  | LOW |
| rodenstock | 6 | https://en.prizma-optic.co.il/rodenstock-multifocal-lenses-prices-types-and-benefits/ | ✓ | title | HIGH |
| איזה צבע עיניים הכי נדיר | 6 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✗ |  | LOW |
| etnia barcelona ישראל | 6 | https://prizma-optic.co.il/etniabarcelona/ | ✗ |  | LOW |
| עיניים אפורות | 5 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✗ |  | LOW |
| משקפי מולטיפוקל מחיר | 5 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8-%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%9E%D7%94-%D7%91%D7%90%D7%9E%D7%AA-%D7%A7%D7%95%D7%91%D7%A2/ | ✓ |  | MEDIUM |
| אופטיקה אשקלון | 5 | https://prizma-optic.co.il/%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94-%D7%91%D7%94%D7%A1%D7%93%D7%A8-%D7%A2%D7%9D-%D7%9B%D7%9C%D7%9C%D7%99%D7%AA-%D7%91%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F/ | ✓ |  | MEDIUM |
| משקפי שמש סרנגטי | 5 | https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A9%D7%9E%D7%A9/ | ✗ |  | LOW |
| עדשות מולטיפוקל zeiss מחיר | 5 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A9%D7%9E%D7%99%D7%A8/ | ✗ |  | LOW |
| john dalia | 5 | https://prizma-optic.co.il/product_brand/john-dalia/ | ✓ | title | HIGH |
| משקפי שמש סרנגטי קטלוג | 5 | https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A9%D7%9E%D7%A9/ | ✗ |  | LOW |
| мультифокальные очки цена | 5 | https://ru.prizma-optic.co.il/%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE-%D1%81%D1%82%D0%BE%D1%8F%D1%82-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BE%D1%87%D0%BA%D0%B8-%D0%B8/ | ✗ |  | LOW |
| kamemannen | 5 | https://prizma-optic.co.il/kamemannen/ | ✓ | title | HIGH |
| עדשות מולטיפוקל hoya מחיר | 5 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%94%D7%95%D7%99%D7%94-hoya/ | ✓ |  | MEDIUM |
| משקפי שמש fred | 5 | https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A9%D7%9E%D7%A9/ | ✗ |  | LOW |
| משקפי שמש סלין | 4 | https://prizma-optic.co.il/tag/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%A9%D7%9E%D7%A9/ | ✗ |  | LOW |
| אופטומטריסט עד הבית | 4 | https://prizma-optic.co.il/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99%D7%99%D7%9D-%D7%A2%D7%93-%D7%94%D7%91%D7%99%D7%AA-%D7%9E%D7%94%D7%A4%D7%9B%D7%AA-%D7%94%D7%90%D7%95%D7%A4%D7%98%D7%99%D7%A7%D7%94/ | ✓ |  | MEDIUM |
| מולטיפוקל מחיר | 4 | https://prizma-optic.co.il/%D7%9E%D7%97%D7%99%D7%A8%D7%99-%D7%A2%D7%93%D7%A9%D7%95%D7%AA-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C-%D7%A9%D7%9E%D7%99%D7%A8/ | ✓ |  | MEDIUM |
| mykita ישראל | 4 | https://prizma-optic.co.il/mykita/ | ✗ |  | LOW |
| מסגרות למשקפי מולטיפוקל | 4 | https://prizma-optic.co.il/%D7%9E%D7%A1%D7%92%D7%A8%D7%95%D7%AA-%D7%9C%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/ | ✓ | title | HIGH |
| мультифокальные линзы | 4 | https://ru.prizma-optic.co.il/%D1%87%D1%82%D0%BE-%D1%82%D0%B0%D0%BA%D0%BE%D0%B5-%D0%BC%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D1%84%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BB%D0%B8%D0%BD%D0%B7%D1%8B-%D0%B8-%D0%B7%D0%B0%D1%87/ | ✓ | h1 | HIGH |
| חידון עיוורון צבעים | 4 | https://prizma-optic.co.il/%D7%91%D7%97%D7%A0%D7%95-%D7%90%D7%AA-%D7%A2%D7%A6%D7%9E%D7%9B%D7%9D-%D7%94%D7%90%D7%9D-%D7%90%D7%AA%D7%9D-%D7%A2%D7%99%D7%95%D7%95%D7%A8%D7%99-%D7%A6%D7%91%D7%A2%D7%99%D7%9D/ | ✗ |  | LOW |
| מה הצבע עיניים הכי נדיר | 4 | https://prizma-optic.co.il/%D7%A6%D7%91%D7%A2%D7%99-%D7%A2%D7%99%D7%A0%D7%99%D7%99%D7%9D-%D7%9C%D7%A4%D7%99-%D7%90%D7%97%D7%95%D7%96%D7%99%D7%9D/ | ✗ |  | LOW |

_Full 1000-row set: `artifacts/query-coverage.json`._

## 8. Internal Link Integrity

- Unique internal links extracted from top-100 pages + home + /en/ + /ru/: **758**
- Broken (404/5xx/error): **0**
- Redirects (300/302): **0**

### 8.1 Per-top-100-page summary (pages with ≥1 broken link)

_None._

## 9. Structured Data (schema.org JSON-LD) Summary

### 9.1 Types seen across top-100

| @type | Pages |
|---|---:|
| Article | 49 |
| CollectionPage | 33 |
| Brand | 28 |
| ItemList | 11 |
| LocalBusiness | 6 |
| WebSite | 4 |
| Organization | 4 |
| WebPage | 4 |
| BreadcrumbList | 4 |
| FAQPage | 2 |

### 9.2 JSON-LD coverage by page type

| Page type | Count | With JSON-LD | Coverage |
|---|---:|---:|---:|
| home | 4 | 4 | 100.0% |
| other | 64 | 56 | 87.5% |
| brand | 32 | 32 | 100.0% |

## 10. Findings & Recommended Next SPEC

See the sibling file `FINDINGS.md` for the full severity-tagged list (INFO / LOW / MEDIUM / HIGH / CRITICAL) — each finding carries a location pointer and a suggested next action.

**Recommended follow-up SPEC:** `PRE_MERGE_SEO_FIXES` — group the MISSING-URL redirect additions, the canonical/title/OG deficiencies on top-100 pages, the 58-broken sitemap entries, and the sitemap/robots.txt host drift in `/dist/client/` into a single pre-DNS fixup SPEC. All fixes touch config files or Astro page components (head meta + JSON-LD); none require DB changes.

**Pass/fail against SPEC Criterion 5 (high-traffic MISSING):** ✅ PASS — no MISSING URL carries ≥10 clicks.

---

*End of SEO_QA_REPORT.*
