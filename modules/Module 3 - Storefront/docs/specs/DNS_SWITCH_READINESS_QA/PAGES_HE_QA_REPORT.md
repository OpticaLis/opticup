# Mission 1 — Pages + Hebrew QA Report

Generated: 2026-04-16
Auditor: opticup-executor (READ-ONLY audit)
SPEC: DNS_SWITCH_READINESS_QA
Tenant: Prizma Optics (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
Preview base: `https://opticup-storefront.vercel.app`

## Summary

- **Total pages audited: 66** (30 HE + 18 EN + 18 RU) — matches SPEC target.
- **HTTP 200 (raw): 34** / **HTTP 200 (after redirect): 37**
- **HTTP 302 (lang-root → HE home): 2** — `/en/` and `/ru/` redirect to HE `/`.
- **HTTP 308 (permanent redirect): 1** — `/מיופיה/` → `/האטת-קוצר-ראייה-אצל-ילדים/`.
- **HTTP 404: 29** — 1 HE (`/optometry/`, draft), 14 EN, 14 RU.
- **HE-only pages: 12** (all `page_type='campaign'` or event-legal) — all intentional promo/campaign material. Zero translation gaps flagged.
- **Hebrew quality spot-check: PASS on content** — zero TODO/TRANSLATE/Lorem/PLACEHOLDER markers found in any HE `blocks` JSONB. Phone numbers (053-434-7265) are valid Israeli mobile format.

**Bottom line for DNS switch readiness:** The storefront is **not ready for production as-is**. The Hebrew experience is solid and near-complete, but the multilingual story has major routing gaps and the site has systemic SEO/social-sharing issues that will damage organic discovery and link previews once real traffic arrives.

## Findings by Severity

### CRITICAL: 3

1. **EN/RU routing is systemically broken for 14 slugs each (28 total pages).** Published DB rows for EN/RU exist and have real meta + content, but the storefront returns 404 for every slug except `/about/`, `/accessibility/`, `/privacy/`. Slugs returning 404 on both EN and RU: `/deal/`, `/lab/`, `/multi/`, `/multifocal-guide/`, `/optometry/`, `/prizma-express-terms/`, `/prizmaexpress/`, `/supersale-takanon/`, `/terms-branches/`, `/terms/`, `/משלוחים-והחזרות/`, `/משקפי-מולטיפוקל/`, `/צרו-קשר/`, `/שאלות-ותשובות/`. This is a routing/generation bug (the Astro build is producing EN/RU output for only 3 of 18 published slugs per lang). Translation data is already in the DB; the site just isn't serving it. DO NOT DNS-cutover until this is resolved — EN/RU speakers hitting ads or shared links will land on dead pages.
2. **EN/RU locale landing pages redirect to HE home.** `GET /en/` and `GET /ru/` return 302 to `/`, so EN/RU users who type the lang root arrive on a Hebrew-only homepage. Combined with #1, there is effectively no usable EN or RU site navigation.
3. **`/optometry/` is a draft, not published.** All 3 langs have `status='draft'` and return 404. This is a high-traffic slug explicitly named in the SPEC (optometry clinic landing). If this was supposed to be live for DNS switch, flip to `published`.

### HIGH: 5

4. **All canonicals + og URLs point to `opticup-storefront.vercel.app`** (the Vercel preview), not a production domain. At DNS switch, every canonical + OG URL in every page will need to swap to the real production host. If you forget, Google will index the Vercel domain permanently.
5. **Canonical mismatch for `/מיופיה/`.** DB stores slug `/מיופיה/` but storefront 308-redirects to `/האטת-קוצר-ראייה-אצל-ילדים/`, and the served page's `<link rel="canonical">` points to the long slug. Two issues in one: (a) the redirect suggests a slug migration that was never reconciled in the DB; (b) Google will index the long slug, not the DB slug, which the CMS can't edit because it doesn't exist in `storefront_pages`. Action: align DB slug with canonical, or remove the redirect rule.
6. **Empty `href="#"` on `/multi/` HE.** The CTA "מידע נוסף + אצלנו מאחורי הקלעים >>" has `href="#"`. A primary-landing-page CTA that goes nowhere. Fix before launch.
7. **`youtube-nocookie.com` embeds used on homepage + `/lab/` — SPEC requires `youtube.com`.** Two embedded videos: `vHvX4zVcCls` (homepage hero) and `6PkwXIca9EU` (lab page). SPEC §3 explicitly lists "YouTube embeds use `youtube.com` (NOT `youtube-nocookie.com`)" as a check. Swap the iframe src values.
8. **`hreflang` links missing on every single page (0 found across all 27 HE/EN/RU pages fetched).** For a tri-lingual site, this is a major SEO miss — Google won't cluster the lang versions together. Add `<link rel="alternate" hreflang="..." href="..." />` entries for each lang per slug.

### MEDIUM: 6

9. **`og:image` missing on nearly every non-homepage page.** Only the 3 homepages include `<meta property="og:image">` (pointing to the tenant logo). Every content page I fetched (about, multi, lab, supersale, prizmaexpress, contact, faq, heb-multifocal, myopia, shipping, accessibility, privacy, terms, deal, general, eventsunsubscribe, premiummultisale, multi-takanon, supersale-takanon, multisale-brands-cat, supersale-models-prices) has no og:image. This guts social-sharing previews on WhatsApp/Facebook/Twitter.
10. **`og:description` missing on 4+ pages:** `/prizmaexpress/`, `/משקפי-מולטיפוקל/`, `/multisale-brands-cat/`, `/eventsunsubscribe/`, `/supersale-models-prices/`.
11. **`meta[name=description]` missing on 4 pages:** `/prizmaexpress/`, `/multi/`, `/multisale-brands-cat/`, `/supersale-models-prices/`, `/משקפי-מולטיפוקל/`, `/eventsunsubscribe/`. DB has `meta_description` populated for most of these — the template isn't rendering it.
12. **Hebrew brand name `אופטיקה פריזמה` leaks into EN/RU titles + meta.** All EN and RU pages include "| אופטיקה פריזמה | אופטיקה פריזמה" as suffix. Example: `<title>About | אופטיקה פריזמה | אופטיקה פריזמה</title>`. This is the tenant-name template not localizing. Native EN/RU readers will see an unparseable Hebrew string.
13. **Title suffix is duplicated on most pages** — every page title ends with "| אופטיקה פריזמה | אופטיקה פריזמה" (brand doubled). Template bug: the per-page `meta_title` in DB already includes the brand, and the template appends it again.
14. **EN `/about/` meta description contains untranslated Hebrew brand:** `"About אופטיקה פריזמה — professional optical store"`. Same issue in RU. Low-polish for international audiences.

### LOW: 2

15. **HE homepage title has duplicated suffix**: `<title>אופטיקה פריזמה | משקפיים ועדשות מגע | אופטיקה פריזמה</title>` — the tenant name appears at start and end. Cosmetic, but search snippets will show the doubled name.
16. **No explicit `og:type`, `twitter:card`, or `twitter:image` meta found** across fetched pages. Adding these would improve Twitter-card rendering. Not a blocker.

## Page-by-Page Results

Legend: RAW = raw HTTP code from curl, FINAL = after following redirects. ✅ = present, ❌ = missing, — = not applicable.

| Slug | Lang | RAW | FINAL | DB Block Ct | DB Status | Meta Title | Meta Desc | Canonical | og:img | hreflang | Notes |
|------|------|-----|-------|-------------|-----------|------------|-----------|-----------|--------|----------|-------|
| / | he | 200 | 200 | 8 | published | ✅ | ✅ | ✅ | ✅ | ❌ | Doubled brand in title; youtube-nocookie used |
| / | en | 302 | 200 | 8 | published | — | — | — | — | — | Redirects to HE home — EN homepage never served |
| / | ru | 302 | 200 | 8 | published | — | — | — | — | — | Redirects to HE home — RU homepage never served |
| /about/ | he | 200 | 200 | 2 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /about/ | en | 200 | 200 | 2 | published | ✅ Heb-suffix | ✅ Heb in text | ✅ | ❌ | ❌ | Meta mixes Hebrew tenant name |
| /about/ | ru | 200 | 200 | 2 | published | ✅ Heb-suffix | ✅ Heb in text | ✅ | ❌ | ❌ | Meta mixes Hebrew tenant name |
| /accessibility/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /accessibility/ | en | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | Served, clean |
| /accessibility/ | ru | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | Served, clean |
| /deal/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /deal/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL — DB published, not served** |
| /deal/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL — DB published, not served** |
| /eventsunsubscribe/ | he | 200 | 200 | 1 | published | ✅ | ❌ | ✅ | ❌ | ❌ | HE-only, campaign — intentional |
| /general/ | he | 200 | 200 | 1 | published | ✅ (English subject!) | ✅ | ✅ | ❌ | ❌ | HE-only campaign. Title reads "General Campaign - אופטיקה פריזמה" — English leakage |
| /lab/ | he | 200 | 200 | 3 | published | ✅ | ✅ | ✅ | ❌ | ❌ | youtube-nocookie embed |
| /lab/ | en | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |
| /lab/ | ru | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |
| /multi-takanon/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | HE-only legal (multi event terms) |
| /multi/ | he | 200 | 200 | 2 | published | ✅ | ❌ | ✅ | ❌ | ❌ | **Empty href="#" on CTA; missing meta desc** |
| /multi/ | en | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |
| /multi/ | ru | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |
| /multifocal-guide/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /multifocal-guide/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /multifocal-guide/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /multisale-brands-cat/ | he | 200 | 200 | 4 | published | ✅ | ❌ | ✅ | ❌ | ❌ | HE-only campaign, missing meta desc |
| /multisale-brands-cat2/ | he | 200 | 200 | 4 | published | — | — | — | — | — | HE-only campaign (not re-fetched, DB has meta) |
| /optometry/ | he | 404 | 404 | 5 | **draft** | — | — | — | — | — | **HIGH — draft; SPEC expected this live** |
| /optometry/ | en | 404 | 404 | 5 | **draft** | — | — | — | — | — | Draft |
| /optometry/ | ru | 404 | 404 | 5 | **draft** | — | — | — | — | — | Draft |
| /premiummultisale/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | HE-only campaign |
| /privacy/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /privacy/ | en | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | Served, clean |
| /privacy/ | ru | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | Served, clean |
| /prizma-express-terms/ | he | 200 | 200 | 1 | published | — | — | — | — | — | (not fetched; DB has meta) |
| /prizma-express-terms/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /prizma-express-terms/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /prizmaexpress/ | he | 200 | 200 | 3 | published | ✅ | ❌ | ✅ | ❌ | ❌ | Missing meta desc + og:desc |
| /prizmaexpress/ | en | 404 | 404 | 3 | published | — | — | — | — | — | **CRITICAL** |
| /prizmaexpress/ | ru | 404 | 404 | 3 | published | — | — | — | — | — | **CRITICAL** |
| /successfulmulti/ | he | 200 | 200 | 1 | published | — | — | — | — | — | HE-only conversion page (not fetched) |
| /successfulsupersale/ | he | 200 | 200 | 10 | published | — | — | — | — | — | HE-only conversion page (not fetched) |
| /supersale-models-prices/ | he | 200 | 200 | 3 | published | ✅ | ❌ | ✅ | ❌ | ❌ | HE-only campaign, missing meta desc |
| /supersale-takanon/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /supersale-takanon/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /supersale-takanon/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /supersale/ | he | 200 | 200 | 12 | published | ✅ | ✅ | ✅ | ❌ | ❌ | 2× youtube.com embeds (good); largest page |
| /supersalepricescatalog/ | he | 200 | 200 | 1 | published | — | — | — | — | — | HE-only campaign (not fetched) |
| /terms-branches/ | he | 200 | 200 | 1 | published | — | — | — | — | — | (not fetched) |
| /terms-branches/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /terms-branches/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /terms/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /terms/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /terms/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /מיופיה/ | he | 308 | 200 | 3 | published | ✅ | ✅ | ❌ mismatch | ❌ | ❌ | **HIGH — canonical points to different Hebrew slug that isn't in DB** |
| /משלוחים-והחזרות/ | he | 200 | 200 | 1 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /משלוחים-והחזרות/ | en | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /משלוחים-והחזרות/ | ru | 404 | 404 | 1 | published | — | — | — | — | — | **CRITICAL** |
| /משקפי-מולטיפוקל/ | he | 200 | 200 | 16 | published | ✅ | ❌ | ✅ | ❌ | ❌ | Largest guide page; missing meta desc |
| /משקפי-מולטיפוקל/ | en | 404 | 404 | 16 | published | — | — | — | — | — | **CRITICAL — 16 blocks of translated content going to waste** |
| /משקפי-מולטיפוקל/ | ru | 404 | 404 | 16 | published | — | — | — | — | — | **CRITICAL — 16 blocks of translated content going to waste** |
| /צרו-קשר/ | he | 200 | 200 | 3 | published | ✅ | ✅ | ✅ | ❌ | ❌ | Phone 053-434-7265 validated |
| /צרו-קשר/ | en | 404 | 404 | 3 | published | — | — | — | — | — | **CRITICAL** |
| /צרו-קשר/ | ru | 404 | 404 | 3 | published | — | — | — | — | — | **CRITICAL** |
| /שאלות-ותשובות/ | he | 200 | 200 | 2 | published | ✅ | ✅ | ✅ | ❌ | ❌ | |
| /שאלות-ותשובות/ | en | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |
| /שאלות-ותשובות/ | ru | 404 | 404 | 2 | published | — | — | — | — | — | **CRITICAL** |

## Hebrew Content Quality

Spot-check of all 30 HE `blocks` JSONB rows via `blocks::text` scan for `TODO`, `TRANSLATE`, `lorem ipsum`, `[PLACEHOLDER]` — **zero hits**. Additionally, `stale_blocks` array is empty on all rows and `stale_since` is NULL. No content drafts or translation placeholders are in production.

Visible text sampling on 22 key HE pages showed:
- No Lorem Ipsum, no [TODO], no [TRANSLATE] markers.
- English words in HE body were brand names only (Zeiss, Hoya, Leica, Rodenstock, VARIOVID) — appropriate.
- Phone numbers match Israeli mobile format (e.g., `053-434-7265` on `/צרו-קשר/` and `/שאלות-ותשובות/`).

Two page-specific HE issues worth surfacing:
- `/general/` **title uses English** — `"General Campaign - אופטיקה פריזמה"`. Internal-looking name leaked to public `<title>`. MEDIUM.
- `/multi/` HE has a broken CTA `href="#"` (see HIGH #6).

Bottom line: **Hebrew content quality is launch-ready.** The issues are in the template (title/meta rendering, routing) and in multi-language coverage — not in the Hebrew copy itself.

## HE-Only Pages (12 total)

All 12 HE-only pages are `page_type='campaign'` except `/multi-takanon/` (legal tied to a campaign). Every one is marketing/promo/conversion material that is intentionally Hebrew-only:

| Slug | page_type | Assessment |
|------|-----------|-----------|
| /eventsunsubscribe/ | campaign | **Intentional** — list-unsubscribe confirmation, HE audience only |
| /general/ | campaign | **Intentional** — generic HE landing (though title has English leakage) |
| /multi-takanon/ | legal | **Intentional** — terms for HE multifocal event |
| /multisale-brands-cat/ | campaign | **Intentional** — HE campaign |
| /multisale-brands-cat2/ | campaign | **Intentional** — HE campaign |
| /premiummultisale/ | campaign | **Intentional** — HE campaign |
| /successfulmulti/ | campaign | **Intentional** — HE thank-you page |
| /successfulsupersale/ | campaign | **Intentional** — HE thank-you page |
| /supersale-models-prices/ | campaign | **Intentional** — HE event catalog |
| /supersale/ | campaign | **Intentional** — main HE event landing |
| /supersalepricescatalog/ | campaign | **Intentional** — HE event catalog |
| /מיופיה/ | campaign | **Intentional** — HE myopia campaign |

**No translation gaps flagged.** All HE-only pages are explicitly campaign/promo and appropriately single-language.

---

## Appendix — Raw Data Files

All artifacts are under `C:/Users/User/opticup/.tmp_qa/` on the executing machine:

- `urls.txt` — 66 slug|lang pairs covered
- `http_results.csv` — full HTTP status table (raw + final + final_url)
- `html/` — 27 fetched HTML pages for deep meta inspection
- `meta_results.txt` — extracted meta tags per page
- `check_http4.sh`, `fetch_html2.sh`, `meta_check.sh` — scripts used

## Recommended Remediation Order (before DNS switch)

1. Resolve EN/RU routing (CRITICAL #1/#2). Until 14 slugs × 2 langs serve, DNS switch will surface broken multilingual UX to real users.
2. Publish `/optometry/` or remove it from sitemap/nav (CRITICAL #3).
3. Fix canonical/OG host when DNS cuts over (HIGH #4).
4. Fix `/מיופיה/` canonical or retire the old slug (HIGH #5).
5. Add `hreflang` alternates site-wide (HIGH #8).
6. Swap youtube-nocookie → youtube.com (HIGH #7).
7. Fix broken `href="#"` on `/multi/` (HIGH #6).
8. Ensure template reads `og:image` + `og:description` + `meta_description` from DB fields that already exist (MEDIUM #9/#10/#11).
9. De-duplicate brand suffix in titles and localize the suffix per lang (MEDIUM #12/#13/#14, LOW #15).
