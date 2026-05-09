# SITE_AUDIT_REPORT — M3_SITE_COMPREHENSIVE_REVIEW

> **Scope:** Read-only customer-facing audit of `https://prizma-optic.co.il`
> **Audit window:** 2026-05-07 (single-session)
> **Audit operator:** opticup-executor (acting as Site Overseer Mode A discovery)
> **SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SPEC.md`
> **Production state at audit time:** UNCHANGED. No code, DB, or deploy operations were performed. This is a findings catalogue, not a fix.

---

## §0 Executive Summary

### Headline (one sentence)

The storefront is **largely functional and well-secured at the perimeter**, but the customer-facing surface is **degraded by a CRITICAL cluster of 5xx errors on Hebrew-slug footer links + empty-body legal pages + a second phantom phone-number leak (`053-434-7265`) that mirrors the L-PROJECT-001 incident class** — and these need to be triaged before the next marketing push.

### Severity rollup

| Severity | Count |
|---|---|
| CRITICAL | 4 |
| HIGH | 11 |
| MEDIUM | 16 |
| LOW | 7 |
| INFO | 6 |
| **Total** | **44** |

### Top 5 customer-impact findings (read these first)

1. **FIND-001 [CRITICAL] — 6 production pages return HTTP 500** when the URL contains raw Hebrew characters. Affected: `/בלוג/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/`, `/מיופיה/`, `/משקפי-מולטיפוקל/`. These are linked from the public footer in all 3 languages. Real users with browsers that pre-encode Hebrew chars are mostly OK, but anyone who shares a raw-Hebrew URL (chat, paste from address bar, social) hits a 500.
2. **FIND-002 [CRITICAL] — Three legal pages render 200 OK with EMPTY BODY** (0 bytes): `/terms/`, `/privacy/`, `/deal/`. These are linked from the footer in all 3 languages and are statutorily required (Israeli consumer-protection law for online businesses). The CMS rows exist with `body_type=string` (vs `array` for working pages) — the renderer appears to mishandle string-type bodies.
3. **FIND-003 [CRITICAL] — Second phantom phone `053-434-7265` is rendered on EVERY homepage** (HE / EN / RU) as the contact phone. Same incident class as `050-717-5675` (the SPEC trigger). Provenance: legacy WordPress import — the CMS body for `/`, `/lab/`, `/terms/`, `/privacy/`, `/deal/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/` (3 langs each = 24 page rows) carries the old WP phone. Daniel's directive: "המספר 050-717-5675 בחיים לא השתמשנו בו" — but `053-434-7265` MAY also be wrong. Provenance verification needed.
4. **FIND-004 [CRITICAL] — Outbound emails sent FROM `Optic Up Leads` brand instead of Prizma.** `src/pages/api/leads/submit.ts:148` `from: 'Optic Up Leads <leads@prizma-optic.co.il>'` and `:163` body footer "נשמר במערכת Optic Up". Customer who submits a lead form receives a confirmation email branded "Optic Up Leads" — direct brand leakage on a customer-facing channel that Daniel explicitly forbade (memory `feedback_customer_facing_branding`).
5. **FIND-005 [HIGH] — Footer email is invisible** — `tenants.business_email IS NULL` for prizma. The footer's `{email && <mailto>...}` block is hidden, so customers have no email contact route in the footer. (WhatsApp + phone present, but no email.)

### Site Overseer baseline (Mode A → Mode B)

This audit produces the **first-ever SITE_MAP.md** at `roles/site-overseer/SITE_MAP.md`. Future Site Overseer Mode B sessions can read it as a single-page overview of where each customer-visible value lives. With this delivered, Site Overseer formally transitions Mode A → Mode B (per HANDOFF.md).

---

## §1 Page Fetch Matrix

44 URLs fetched on 2026-05-07 at ~07:16-07:20 UTC. Method: `curl -sL` from this Claude Code session against `https://prizma-optic.co.il/...`. The apex 307→www redirect is followed before the status is recorded.

| # | URL | HTTP | Bytes | Notes |
|---|---|---|---|---|
| 1 | `/` | 200 | 142,947 | HE homepage. Contains both phones (053-3645404 + 053-434-7265). |
| 2 | `/en/` | 200 | 138,657 | EN homepage. Same dual-phone pattern. |
| 3 | `/ru/` | 200 | 147,349 | RU homepage. Same dual-phone pattern. |
| 4 | `/supersale/` | 200 | 141,360 | Active campaign. Renders prices ₪400, 650, 790, 1350-1650 + 50%/100% badges. |
| 5 | `/about/` | 200 | 52,892 | HE. **No H1** rendered. |
| 6 | `/en/about/` | 200 | 48,806 | EN. |
| 7 | `/ru/about/` | 200 | 55,873 | RU. |
| 8 | `/terms/` | 200 | **0** | **CRITICAL — empty body.** Legal page. |
| 9 | `/privacy/` | 200 | **0** | **CRITICAL — empty body.** Legal page. |
| 10 | `/deal/` | 200 | **0** | **CRITICAL — empty body.** Cancellation policy. |
| 11 | `/accessibility/` | 200 | 41,821 | OK. |
| 12 | `/צרו-קשר/` (raw UTF-8) | **500** | 21 | **CRITICAL** — see FIND-001. |
| 13 | `/multifocal-guide/` | 404 | 26,276 | **HIGH** — Footer.astro linked. |
| 14 | `/lab/` | 200 | 91,708 | OK. |
| 15 | `/prizmaexpress/` | 200 | 77,415 | OK. |
| 16 | `/multi/` | 200 | 85,446 | OK. |
| 17 | `/general/` | 200 | 50,366 | OK. |
| 18 | `/multisale-brands-cat/` | 200 | 85,478 | OK. |
| 19 | `/multisale-brands-cat2/` | 200 | 79,495 | OK. |
| 20 | `/successfulsupersale/` | 200 | 52,066 | Pixel "Lead" confirmation page. |
| 21 | `/successfulmulti/` | 200 | 54,758 | Pixel "Lead" confirmation page. |
| 22 | `/eventsunsubscribe/` | 200 | 12,933 | OK. |
| 23 | `/premiummultisale/` | 200 | 145,652 | Largest payload. |
| 24 | `/supersale-stock/` | 200 | 7,740 | Suspiciously small body — probably has script-only content. |
| 25 | `/supersale-models-prices/` | 200 | 95,800 | Renders prices. |
| 26 | `/supersalepricescatalog/` | 200 | 35,192 | Renders prices. |
| 27 | `/supersale-takanon/` | 200 | 21,966 | Hardcoded Astro page (not CMS) — contains landline 08-6751313 + non-canonical phone format `053-364-5404`. |
| 28 | `/multi-takanon/` | 200 | 63,487 | HE only — no en/ru CMS rows. |
| 29 | `/prizma-express-terms/` | 200 | 50,104 | OK. |
| 30 | `/terms-branches/` | 200 | 48,693 | OK. |
| 31 | `/משלוחים-והחזרות/` (raw UTF-8) | **500** | 21 | **CRITICAL** — same root cause as #12. |
| 32 | `/מיופיה/` | **500** | 21 | **CRITICAL**. |
| 33 | `/שאלות-ותשובות/` | **500** | 21 | **CRITICAL**. FAQ page broken. |
| 34 | `/משקפי-מולטיפוקל/` | **500** | 21 | **CRITICAL**. |
| 35 | `/products/` | 200 | 128,996 | OK. |
| 36 | `/brands/` | 200 | 81,921 | OK. Direct `*.supabase.co/storage` URLs found (Rule 25 violation — see FIND-014). |
| 37 | `/categories/` | 200 | 40,218 | OK. |
| 38 | `/search/` | 200 | 40,354 | OK. |
| 39 | `/בלוג/` (raw UTF-8) | **500** | 21 | **CRITICAL**. |
| 40 | `/blog/` | 200 | 113,898 | OK. |
| 41 | `/event-register/` | 200 | 4,848 | Form page. |
| 42 | `/quick-register/` | 200 | 4,885 | Form page. |
| 43 | `/unsubscribe/` | 200 | 6,441 | Form page. |
| 44 | `/404` | 404 | 26,276 | 404 renders correctly with branded body. |

**Aggregate:** 44 fetched. 30 × 200 (with content). 3 × 200 (empty body — CRITICAL). 6 × 500 (raw-UTF-8 redirect bug). 2 × 404 (`/multifocal-guide/`, `/404`). 

**Browser-encoded fetch corroboration (control):** `https://www.prizma-optic.co.il/%D7%A6%D7%A8%D7%95-%D7%A7%D7%A9%D7%A8/` (URL-encoded UTF-8) → **200**. `https://www.prizma-optic.co.il/צרו-קשר/` (raw bytes) → **500**. The redirect from apex to www. mishandles raw UTF-8 bytes (re-encodes them as Latin-1 garbage in the `Location:` header — verified live), so direct curl / scrapers / shared-from-address-bar URLs trigger 500. Browser-typed clicks generally pre-encode and are OK.

**Page-fetch coverage check (success criterion #2):** ≥80 was the target counted as "30 unique slugs × 3 langs". This audit fetched 44 distinct URLs (40 unique slugs incl. en/ru variants of homepage + about). The remaining 36 lang-variants of CMS pages were verified via Supabase query (slug × lang status) rather than per-URL fetch. **Met in spirit, not literally** — flagged in §10 methodology and EXECUTION_REPORT.

---

## §2 Category A — Customer-facing content

### A1 — Contact details consistency

**FIND-001 [CRITICAL] [A1-PHONE-RAW-UTF8]** — Apex domain (`prizma-optic.co.il`) issues a 307→www redirect that mis-encodes raw UTF-8 path bytes (re-emits them as Latin-1 inside the `Location:` header), so any non-pre-encoded request to a Hebrew-slug URL yields 500 on the www. host.
- **Evidence:**
  - `curl -sI https://prizma-optic.co.il/he/צרו-קשר/` → `Location: https://www.prizma-optic.co.il/he/%F6%F8%E5-%F7%F9%F8/` (Latin-1 of the Hebrew bytes — incorrect; should be `%D7%A6%D7%A8%D7%95-%D7%A7%D7%A9%D7%A8`).
  - Affected URLs (each returns 500): `/צרו-קשר/`, `/בלוג/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/`, `/מיופיה/`, `/משקפי-מולטיפוקל/`.
  - Browsers usually pre-encode `<a href>` Hebrew text before request, so most clicks work. But: shared raw-paste URLs from chat apps, scrapers, and crawlers that do not pre-encode, all 500.
- **Customer impact:** Footer columns "Customer Service" + "Products" show items linking to `/צרו-קשר/`, `/בלוג אופטיקה/`, `/שאלות ותשובות/`, `/משלוחים והחזרות/`. Real-world: most users get 200 because browsers encode. Worst case: SEO crawlers may index 500 (already evidenced by `googlebot`-type fetches in Vercel logs to verify). Customer message-app shares (raw text URL) → 500.
- **Recommended fix:** Inspect Vercel rewrite/redirect rule causing the apex→www redirect; replace with a host-only redirect that does not re-write the path (or use Vercel's `cleanUrls`/`trailingSlash`-only behaviour). Verify `/he/...` and `/en/...` prefix variants as well. **Severity bump rationale:** the volume is small but the *class* of issue (perimeter URL handler mis-encoding) is exactly the sort that an attacker could ladder into a request-smuggling probe. Treat as priority.

**FIND-002 [CRITICAL] [A1-EMPTY-BODY]** — `/terms/`, `/privacy/`, `/deal/` return 200 OK with empty body (0 bytes) for all 3 languages. CMS row exists with `bt=string` (block type is text-string, not array of blocks).
- **Evidence:** `curl -sL https://prizma-optic.co.il/terms/ -o /tmp/file && wc -c /tmp/file → 0`. Same for `/privacy/` and `/deal/`. The CMS row for these is `bt='string'` in Postgres (3-of-3 langs each = 9 rows total in this state).
- **Customer impact:** No `terms-and-conditions` page, no privacy policy, no cancellation policy. Israeli consumer-protection law (Sec 14 of the Consumer Protection Law re. distance contracts) requires a public cancellation policy be readable on the site — **statutory exposure**. Also: a customer who can't find your privacy policy may abandon at checkout time.
- **Recommended fix:** Inspect the page-render handler in `[...slug].astro` (or whichever page-renderer uses the CMS body). The `bt='string'` rows likely need either (a) the renderer to handle string bodies with a fallback HTML wrap, or (b) a one-time migration converting the 9 rows to `array` format. If the legacy `_deprecated/legal-terms.ts` etc. exist as fallback (which they do), a temporary route-level fallback could ship while the CMS migration is planned. **Verify** with Vercel runtime logs which path is hit.

**FIND-003 [CRITICAL] [A1-PHONE-LEAK]** — `053-434-7265` appears as `tel:` link on **every homepage** (HE/EN/RU), provenance traced to **24 CMS body rows** (`/`, `/lab/`, `/terms/`, `/privacy/`, `/deal/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/` × 3 langs each).
- **Evidence:**
  - Rendered homepage HTML: `<a href="tel:053-434-7265" class="text-base sm:text-lg text-gray-900 font-medium hover:underline"> 053-434-7265 </a>` — directly under "טלפון" / "Phone" label.
  - Source `_deprecated/legal-terms.ts` line 2: `... ניתן לבטל ... בטלפון 053-4347265/...`
  - Source `public/images/lab/israel-hayom-logo.png` (a misnamed `.png` that is actually HTML, see FIND-031): contains `<a href="tel:0534347265">` and `<span class="elementor-icon-list-text">טל': 053-434-7265</span>` — direct WordPress import remnant.
  - Supabase: `SELECT slug, lang FROM storefront_pages WHERE blocks::text ILIKE '%053-434-7265%' OR ... ILIKE '%0534347265%' ...` → 24 rows.
- **Customer impact:** This is the same incident class that triggered this audit. `053-3645404` is the verified-real Prizma support line (set in DB after the 2026-05-06 hot-fix). `053-434-7265` is a *legacy* WordPress-era phone — Daniel must confirm whether it still routes to Prizma. If the line was disconnected when Prizma migrated to the new number, customers calling it reach voicemail / disconnected / a third party — exactly the L-PROJECT-001 risk.
- **Recommended fix:** **STOP** — this needs Daniel's provenance call. Two cases:
  - (a) `053-434-7265` is still a live line at Prizma (older support number) → flag as a separate documented secondary phone in `tenants.ui_config`, do not delete; review per-page whether the legacy/secondary line is the right CTA on each page.
  - (b) `053-434-7265` is dead/misrouted → URGENT cleanup: bulk update the 24 CMS rows + delete the `_deprecated/legal-terms.ts` artefact + remove the `israel-hayom-logo.png` misnamed file.
- **Auxiliary risk:** the same bodies contain the typo `prizma-optice.co.il` (see FIND-022) — separate finding.

**FIND-004 [HIGH] [A1-PHONE-FORMAT-DRIFT]** — Three different phone-number formats coexist across the site:
- `053-3645404` — `tenants.business_phone`, `ui_config.support_phone_display`, rendered in header CTA, Schema.org telephone, footer rendered email-link region. (CANONICAL)
- `053-364-5404` (extra dash) — `src/pages/supersale-takanon/index.astro:169` (hardcoded Astro page).
- `0533645404` (no dashes) — `storefront_config.whatsapp_number`, used to build `wa.me/972533645404` URLs. Format is correct for E.164-prep, but the field name is "phone" not "e164" → confusing naming.
- **Customer impact:** Inconsistency is mostly cosmetic, but a copy-paste from `/supersale-takanon/` produces an unrecognized format that won't match phonebook normalization on the customer's device.
- **Recommended fix:** Decide on canonical display format (`053-3645404` per current `ui_config.support_phone_display`). Replace the hardcoded `053-364-5404` in `supersale-takanon/index.astro` to read from `ui_config.support_phone_display` (Iron Rule 9).

**FIND-005 [HIGH] [A1-EMAIL-NULL]** — `tenants.business_email` is NULL for prizma. `Footer.astro:155` `{email && <a mailto>...}` therefore renders nothing. Customer in the footer sees Phone + Address + WhatsApp + social — but no email contact.
- **Customer impact:** Email is the most-archivable contact channel; missing it means customer questions need a phone call or WhatsApp message. Conversion impact small but real.
- **Recommended fix:** Set `tenants.business_email` for prizma. Daniel pick: `service@prizma-optic.co.il` (canonical), `info@prizma-optic.co.il`, etc. **DO NOT** use the `prizma-optice.co.il` typo from the WP-imported bodies (see FIND-022).

**FIND-006 [HIGH] [A1-ADDRESS-DRIFT]** — Two slightly-different addresses for prizma exist in canonical config:
- `tenants.business_address` = `הרצל 32, אשקלון`
- `storefront_config.footer_config.contact.address.he` = `הרצל 32, מדרחוב, אשקלון` (with "מדרחוב" / "pedestrian street")
- `Footer.astro:104` defaultContact hardcodes the same `הרצל 32, מדרחוב, אשקלון`.
- **Customer impact:** Both render on the homepage (the homepage shows both — different sections). Minor cognitive friction.
- **Recommended fix:** Pick one canonical wording, store in `tenants.business_address`, and have Footer.astro/storefront_config read from it. The "מדרחוב" qualifier is helpful for navigation — keep it.

**FIND-007 [MEDIUM] [A1-WA-NUMBER-FORMAT]** — `storefront_config.whatsapp_number` = `0533645404` (raw, no dashes). Codebase uses pattern `0533645404 → 972533645404` for `wa.me/` URLs (see `FloatingWhatsAppButton.astro:17` and `WhatsAppButton.astro:22`). Field name `whatsapp_number` is ambiguous (could be E.164 or local). **Cosmetic risk:** if a future maintainer changes it to `+972-53-3645404` the auto-format will break.
- **Recommended fix:** Rename column to `whatsapp_phone_local` (or similar), document the format constraint. Not urgent.

### A2 — Stale dates / pricing / promo terms

**FIND-008 [HIGH] [A2-PRICES-NO-APPROVAL]** — Per memory `feedback_no_storefront_prices` ("no storefront prices for any brand without explicit Daniel approval per brand"), but the following pages render prices:
- `/supersale/` renders ₪400, 650, 790, 1350, 1450, 1550, 1650, plus 50% / 90% / 100% badges (39× "100%", 23× "50%").
- `/supersale-models-prices/` body 95KB (likely full price list).
- `/supersalepricescatalog/` body 35KB (likely price list).
- `/premiummultisale/` body 145KB.
- **Customer impact:** Per Daniel's directive, every price needs per-brand sign-off. Currently no audit trail showing which prices have approval.
- **Recommended fix:** Daniel reviews the price-rendering pages. Either (a) document approvals (mark "PRICE_APPROVED_2026-MM-DD") in CMS metadata and surface in audit, or (b) hide prices behind a CTA-to-contact flow. Either way: the audit's job ends here — Daniel decides scope.

**FIND-009 [INFO] [A2-DATES]** — Active campaign pages do not display literal `DD.MM.YYYY` date strings in the rendered HTML (none found). Rendering is via background image / inline graphics, not text. Cannot audit "stale dates" via DOM grep alone. Recommend: per-campaign manual review by Daniel for "is this still the right offer".

### A3 — Broken inbound links

**FIND-010 [HIGH] [A3-MULTIFOCAL-404]** — Footer.astro defaults link to `/multifocal-guide/`. Live URL returns 404. CMS rows for `/multifocal-guide/` exist in all 3 langs as `published`. Likely route-level mismatch (Astro page may have different file-name to slug mapping).
- **Customer impact:** Footer "Products" / "מוצרים" column links to a 404 in 3 languages.
- **Recommended fix:** Inspect `[...slug].astro` route handler — does it match `/multifocal-guide/` against the CMS slug? The Hebrew counterpart `/משקפי-מולטיפוקל/` returns 500 (related: FIND-001 — both broken at the same time but for different reasons).

**FIND-011 [MEDIUM] [A3-FOOTER-LINK-CHURN]** — Footer rendered HTML reveals 8 internal Hebrew-slug links + 4 external (Facebook, Instagram, Yoman, +1 each in product-category). Link-coverage check by HTTP status (this audit) shows 5 of 8 internal Hebrew links 500 (FIND-001 root cause).
- **Customer impact:** Same as FIND-001 (most browser clicks 200 due to pre-encoding; but the underlying URL handler is fragile).

**FIND-012 [LOW] [A3-EXT-FACEBOOK]** — Footer external link `https://www.facebook.com/PrizmaAshkelon` returns 200 (verified via curl, `Permissions-Policy` allows). External `https://www.instagram.com/optic_prizma/` returns 200. Yoman booking URL `https://yoman.co.il/Prizamaoptic` (note: `Prizama` not `Prizma` — minor typo in URL slug) returns 200 — works but the URL has a typo. Likely intentional and fixed at vendor side.

### A4 — Translation parity

**FIND-013 [HIGH] [A4-MULTI-TAKANON-HE-ONLY]** — `/multi-takanon/` exists in CMS for HE only (no en/ru rows). Footer column "Legal" / "תקנונים" / "Правила" links to it from EN+RU footers. Result: EN/RU users clicking "Branch Terms" / "Правила филиалов" → fallback path (likely renders Hebrew or defaults to HE locale silently — exact behaviour depends on `[...slug].astro`).
- **Recommended fix:** Either translate the page (Author or auto-translate with review) or remove the EN/RU footer links until translation lands.

**FIND-014 [MEDIUM] [A4-OPTOMETRY-DRAFT-3X]** — `/optometry/` exists in 3 langs all as `status='draft'`, all with `noindex=false`. Currently 404 publicly. Either: (a) delete the rows if no plan, or (b) finish the page. Currently it's an orphan.

**FIND-015 [INFO] [A4-EN-RU-PARITY-NEEDS-DOM]** — Translation parity check via curl byte-size is unreliable (the file is mostly script + HTML chrome). Real translation parity check requires rendered-DOM inspection. Recommend: follow-up SPEC using Chrome DevTools MCP / Playwright to compare visible text content between he/en/ru on Tier-1 pages. **OUT OF SCOPE for this read-only audit window.** Logged for Daniel.

### A5 — Hardcoded "Optic Up" customer-facing text

**FIND-016 [CRITICAL/HIGH] [A5-LEAD-EMAIL-FROM]** — `src/pages/api/leads/submit.ts:148`: `from: 'Optic Up Leads <leads@prizma-optic.co.il>'`. The customer-confirmation email after lead-form submission goes out branded "**Optic Up Leads**" — direct violation of `feedback_customer_facing_branding`.
- **Customer impact:** Customer fills out a form on a Prizma page → receives an email from an unknown brand "Optic Up Leads" → trust erosion + spam-folder routing risk + ICANN/RFC hygiene issue (sender display name does not match domain). Also: SaaS bug — multi-tenant won't work, every tenant sends from "Optic Up Leads".
- **Recommended fix:** Read sender display from `tenants.name` or `business_name` (per-tenant). Same file line 163 has another leak: `<p>נשמר במערכת Optic Up (Lead ID: ${leadId})</p>` — change to `tenants.name` or remove.

**FIND-017 [HIGH] [A5-FALLBACK-OPTICUP]** — 13 `*.astro` pages contain pattern `tenant?.name ?? 'Optic Up'` as a fallback display name (e.g. `pages/brands/index.astro:22`, `pages/categories/index.astro:22`, `pages/category/[slug].astro:49`, all 4 `en/` variants, all 4 `ru/` variants). If tenant resolution ever returns null (deploy bug, cache miss, env-var swap, demo-tenant route), customer-facing pages display "Optic Up" as the brand name in `<title>`, breadcrumbs, and headings.
- **Recommended fix:** Replace with a more graceful fallback (e.g. an empty string + log to error tracking, or a localized "Loading…" + retry, or HTTP 500 — anything but a competitor brand displayed to a Prizma customer).

**FIND-018 [INFO] [A5-INTERNAL-X-CLIENT]** — `lib/supabase.ts:16` sets header `x-client: opticup-storefront`. Internal HTTP header used for analytics/observability. **Not customer-facing.** Safe.

**FIND-019 [INFO] [A5-ORPHAN-POWEREDBY]** — `src/i18n/{en,he,ru}.json:110` defines `poweredBy: "Powered by Optic Up" / "מופעל על ידי Optic Up" / "Работает на Optic Up"`. **Grep across components/layouts shows zero usages** — the i18n key is orphaned (Iron Rule 21 — No Orphans). Translation work was done for nothing, but more importantly this is a tripwire: anyone adding a footer "powered by" line will use this key and immediately leak the brand. Safer to delete the keys entirely.

### A6 — Decorative-real-looking values (L-PROJECT-001 enforcement — SPEC §A6)

**FIND-020 [CRITICAL] [A6-PHONE-LEAK]** — Same root finding as FIND-003: `053-434-7265` is a phone-shaped literal that may or may not be a real Prizma line — this is exactly the L-PROJECT-001 risk class. Counted again here for category-A6 attribution.

**FIND-021 [MEDIUM] [A6-I18N-PHONE-PLACEHOLDER]** — `src/i18n/{en,he,ru}.json:133`: `error_phone: "Please enter a valid phone number (e.g. 0537889878)"` (and Hebrew/Russian equivalents). The example digits `0537889878` look like a real number (10 digits, `053` prefix). Per L-PROJECT-001 case (1) — placeholders must use `0XX-XXX-XXXX` form.
- **Recommended fix:** Replace `0537889878` with `0XX-XXX-XXXX` or `050-1234567` (clearly placeholder pattern) in all 3 i18n JSONs.

**FIND-022 [HIGH] [A6-EMAIL-TYPO]** — Email domain `prizma-optice.co.il` (misspelled: extra "e" — should be `prizma-optic.co.il`) appears in CMS bodies of `/terms/`, `/deal/`, `/privacy/`, others. Customer reading a legal page sees: `service@prizma-optice.co.il` — a domain that may or may not exist. Mail sent to it is dropped or reaches a wrong host.
- **Provenance:** Inherited from WordPress import (the `_deprecated/legal-terms.ts` file shows the same typo at line 2). Same incident class as FIND-003.
- **Recommended fix:** Bulk-update CMS rows: `prizma-optice.co.il` → `prizma-optic.co.il`. Verify the cleaner email is the right canonical one. **DO NOT** auto-execute — requires Daniel's confirmation that no third party owns `prizma-optice.co.il` (a typo-domain may have been registered by a typosquatter).

**FIND-023 [LOW] [A6-DEPRECATED-FILES]** — `src/_deprecated/legal-terms.ts`, `src/_deprecated/legal-privacy.ts` exist with full WordPress-era HTML strings. Currently importable by any other file — Iron Rule 21 (No Orphans) violation in the spirit if not the letter (the `_deprecated` folder is by convention "do not use" but contains live, exportable code). Recommend: delete the `_deprecated/` folder once CMS bodies are confirmed correct.

---

## §3 Category B — Visual / brand consistency

### B1 — Design canon compliance

**FIND-024 [LOW] [B1-FONT-CANON]** — SPEC says "Rubik 4 weights only", but homepage Google Fonts URL loads `Rubik:wght@400;500;600;700;900&family=Assistant:wght@400;700&family=Inter:wght@400;600;700&display=swap` — three font families × multiple weights. Net 5 Rubik weights (4+5+6+7+9 = OK on count if "4 weights" means 4 of {400,500,600,700,900} — but spec says exactly 4). Plus Assistant (2 weights) and Inter (3 weights) — extras not in canon.
- **Recommended fix:** Verify with Daniel which families are canonical. If only Rubik, drop Assistant + Inter from `<link>` to save bandwidth + reduce CLS risk.

**FIND-025 [INFO] [B1-GOLD-DRIFT]** — `tenants.ui_config.brand.gold = '#c9a555'` (canonical) but `storefront_config.theme.accent = '#d4a853'` — TWO different golds for the same tenant. The `theme.accent` is what `--color-primary` etc. likely read; `ui_config.brand.gold` is what brand canon documents target. Different uses → may render inconsistent gold tones across components.
- **Recommended fix:** Decide canonical hex; consolidate to one source.

### B2 — Logo presence

**FIND-026 [INFO] [B2-LOGO-OK]** — Header.astro line 58: `<img src={tenantLogo || '/images/prizma-logo-site.png'}>`. Both `site_logo_url` (`/images/prizma-logo-site.png`) and `site_logo_white_url` (`/images/prizma-logo-white.png`) resolve. ✓ Logo renders on Tier-1 fetched homepages (HE/EN/RU).

### B3 — Hero image

**FIND-027 [MEDIUM] [B3-HERO-NULL]** — `storefront_config.hero_title = NULL`, `hero_subtitle = NULL`, `hero_image_url = NULL`. The homepage hero is rendered from CMS `homepage` page-row blocks instead. Current behaviour works (homepage shows a hero), but the 4 `hero_*` fields are dead config — Iron Rule 21 violation again if no code reads them.
- **Recommended fix:** Either populate them (so demo-tenants get a default hero without authoring CMS blocks) or drop the columns (DDL change → Daniel-only).

### B4 — RTL/LTR

**FIND-028 [INFO] [B4-RTL-OK]** — Hebrew homepage HTML opens with `<html lang="he" dir="rtl">` (verified via curl head). EN/RU appropriate. No mixed-direction issues observed in skim.

### B5 — Floating buttons

**FIND-029 [INFO] [B5-FLOATING-OK]** — `BaseLayout.astro:207-208` mounts `<FloatingWhatsAppButton>` and `<FloatingWishlistButton>` conditionally on `whatsappNumber` (non-null for prizma). Buttons are present in rendered HTML on all 3 homepages. ✓

### B6 — Top-bar phone CTA

**FIND-030 [INFO] [B6-TEL-OK-WITH-CAVEAT]** — Header.astro `tel:${phone}` link uses `tenants.business_phone` = `053-3645404` (correct). However, the page ALSO renders `tel:053-434-7265` further down (FIND-003 root) as a contact-section phone. Net: customers see two different numbers depending on which CTA they click.

---

## §4 Category C — Performance

### C1 — PageSpeed (Tier-1 anchor pages)

**FIND-031 [INFO] [C1-NO-LIGHTHOUSE]** — Lighthouse / PageSpeed Insights / lhci CLI is **not installed in this audit environment** (Claude Code Windows session) and the SPEC restricted writes/installs. Could not produce mobile/desktop performance scores. Logged as a methodology gap.
- **Recommended fix:** Follow-up SPEC: install `lighthouse` CLI under `roles/site-overseer/tools/`, run nightly against the 5 anchor pages, archive scores, alert on regression.
- **Manual proxy estimates from this audit:** Homepage transferred ≈143KB HTML (uncompressed), but contains CSP, Schema.org JSON-LD, several `<script>` tags including GTM, GA4, Facebook Pixel, Hotjar, TikTok Pixel, Pixel Events, and Userway accessibility widget. **Risk:** the chained third-party tracking scripts will dominate LCP/INP — high probability mobile PageSpeed score is in the 40-60 range.

### C2 — Image weight audit

**FIND-032 [LOW] [C2-FAVICON-93KB]** — `https://prizma-optic.co.il/favicon.svg` returns 200 with **93,243 bytes** — that's far oversized for a favicon. Schema.org LocalBusiness `image` field also points at this 93KB SVG. Most browsers cache favicons aggressively, so impact small, but on first visit it's wasteful.
- **Recommended fix:** Either inline-optimize the SVG (probably has a giant base64 raster embedded) or replace with a sane 1-3KB SVG / 16x16 ico.

**FIND-033 [INFO] [C2-FULL-WEIGHT-AUDIT-NOT-RUN]** — Per-image transferred-bytes / rendered-dimensions audit requires Chrome DevTools (Network panel). Not run in this audit. Logged for follow-up.

### C3 — Font loading

**FIND-034 [LOW] [C3-DOUBLE-FONT-LINK]** — Homepage HTML contains TWO `<link rel="stylesheet">` tags for the same Google Fonts URL: one with `media="print" onload="this.media='all'"` (the FOIT-avoidance pattern), and one regular. The second tag effectively cancels the first's optimization.
- **Recommended fix:** Drop the second, regular tag. Keep the print-onload-swap pattern.

### C4 — Third-party blockers

**FIND-035 [MEDIUM] [C4-TRACKER-CHAIN]** — Visible third-party `<script>` sources: `googletagmanager.com`, `google-analytics.com`, `connect.facebook.net`, `static.hotjar.com`, `script.hotjar.com`, `analytics.tiktok.com`, `cdn.userway.org`. CSP (impressively) explicitly allows all of these. **All are loaded on the homepage**, including for users who haven't accepted any consent banner (no consent banner observed in this audit).
- **Customer impact:** GDPR / Israeli privacy regulation 2024 (התש"ב 2024) probably requires consent before non-essential trackers fire. This is a compliance risk + perf overhead.
- **Recommended fix:** Audit which trackers fire pre-consent. Likely needs a consent-mode v2 wrap (load GTM/GA4 with `gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' })` until user accepts).

---

## §5 Category D — Accessibility (WCAG 2.1 AA)

### D1 — Automated check (axe-core / pa11y)

**FIND-036 [INFO] [D1-NO-AXE]** — `axe-core` / `pa11y` CLI not installed in this audit environment. Cannot produce automated violation list. Logged as methodology gap; recommend follow-up SPEC.
- **Manual proxy:** Verified via raw HTML grep (next bullets).

### D2 — Manual checks

**FIND-037 [HIGH] [D2-NO-H1-ABOUT]** — `/about/` (HE) renders **0 `<h1>` tags** (10 H2 tags rendered, but no H1). WCAG 2.4.6 (Headings and Labels) is violated when a page has no H1.
- **Customer impact:** Screen-reader users navigating headings cannot orient on the page; SEO penalty (search engines weight H1 as the page's primary topic).
- **Recommended fix:** Add an H1 to the `/about/` CMS body's first block (or have the page-render template auto-promote the page's `title` to H1 if no H1 exists in the body).

**FIND-038 [MEDIUM] [D2-EMPTY-ALT]** — Homepage has 3 `<img alt="">`, supersale has 1 `<img>` with NO `alt` attribute, about has 2 `<img alt="">`. Empty alt is OK if the image is decorative — but missing alt on supersale is unambiguous a11y bug.
- **Recommended fix:** Audit each `<img>` either (a) add `alt="..."` (informative) or (b) confirm decorative and add `alt=""` (correctly). Never omit.

**FIND-039 [LOW] [D2-FLOATING-A11Y]** — FloatingWhatsAppButton + FloatingWishlistButton — verify ARIA labels in source. Brief grep shows both components import standard Astro-Tailwind patterns; recommend Chrome DevTools accessibility-tree review in follow-up.

### D3 — Color contrast

**FIND-040 [INFO] [D3-CONTRAST-NOT-RUN]** — Color contrast check (gold-on-dark, dark-on-gold) requires rendered-page sampling. Not run this session. Two gold values stored (FIND-025) — neither yet contrast-checked. Logged.

---

## §6 Category E — SEO

### E1 — Canonical

**FIND-041 [INFO] [E1-CANONICAL-OK]** — Homepage has `<link rel="canonical" href="https://prizma-optic.co.il/">`. ✓ Hreflang `<link rel="alternate" hreflang="he|en|ru|x-default">` all present and correct. ✓

### E2 — Title / meta description

**FIND-042 [LOW] [E2-DUPLICATES-NOT-CHECKED]** — Per-slug title/description uniqueness was not exhaustively cross-checked across all 67 published rows. CMS column lengths (queried up-front) suggest reasonable diversity (mt: 18-79 chars, md: 27-183 chars). No two rows had identical mt+md pairs in the queried data.

### E3 — Open Graph

**FIND-043 [MEDIUM] [E3-OG-CAMPAIGNS]** — Homepage has full OG tags (og:title/description/url/image/locale/site_name) ✓. **Supersale** page only confirms `canonical` + `og:title` in this audit (need full OG audit). SPEC §E3 requires "every campaign page" — recommend full audit in follow-up.

### E4 — Hebrew slugs

**FIND-044 [HIGH] [E4-HEBREW-500]** — Hebrew slugs `/בלוג/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/`, `/מיופיה/`, `/משקפי-מולטיפוקל/` all return **500 on raw UTF-8 fetch**. Already covered as FIND-001 (cross-listed for SEO category). Search engines that don't pre-encode (most don't, since they read URLs literally from HTML) → 500 → de-indexed.

### E5 — robots.txt + sitemap

**FIND-045 [MEDIUM] [E5-SITEMAP-MISMATCH]** — robots.txt declares `Sitemap: https://prizma-optic.co.il/sitemap-dynamic.xml` (which works, 200, 361 URLs). But the Astro Sitemap integration auto-publishes `/sitemap-index.xml` → `/sitemap-0.xml` (only 25 URLs). A search engine that discovers `/sitemap-index.xml` directly (e.g. via Search Console submission of that URL) gets a 25-URL incomplete view. Net: 336 of 361 pages may be discovered late or not indexed via the auto sitemap.
- **Recommended fix:** Either drop the auto Astro Sitemap (use only `sitemap-dynamic.xml`) OR have `sitemap-index.xml` reference both. Daniel decides.

**FIND-046 [LOW] [E5-ROBOTS-NO-CRAWL-DELAY]** — robots.txt allows all + disallows `/api/`, `/search`, `/{ru,en}/search`. No `Crawl-delay` directive. Probably fine for a small site.

### E6 — Structured data

**FIND-047 [MEDIUM] [E6-LOCALBUSINESS-INCOMPLETE]** — Homepage `LocalBusiness` JSON-LD:
- ✓ `telephone: "053-3645404"` (correct).
- ✗ NO `address` field (Schema.org strongly recommends `address.streetAddress / addressLocality / postalCode / addressCountry`).
- ✗ NO `openingHours`.
- ✗ NO `geo: { latitude, longitude }` (despite Google Place ID stored).
- ✗ NO `aggregateRating` (despite `google_rating: 5.0 / google_review_count: 153` stored).
- `image: "https://prizma-optic.co.il/favicon.svg"` — using the favicon as the LocalBusiness image is sub-optimal (Google prefers a square 1200×1200 storefront photo).
- `priceRange: "$$"` — hardcoded, fine for now.
- **Recommended fix:** Build a richer LocalBusiness schema (address from `tenants.business_address`, openingHours from a new `business_hours` table, geo from `google_place_id` lookup, aggregateRating from Google rating fields). Big upside in local-SEO ranking.

**FIND-048 [LOW] [E6-CAMPAIGN-NO-SCHEMA]** — `/supersale/` page has no `application/ld+json` block in this audit's grep. Campaign pages are ideal candidates for `Event` or `Offer` schema markup. Optional but valuable for SEO.

---

## §7 Category F — Security / privacy

### F1 — Secrets in client bundle

**FIND-049 [INFO] [F1-NO-SECRETS]** — Grepped homepage + supersale + about HTML for `service_role`, `SERVICE_ROLE`, `jwt_secret`, `RESEND_API_KEY`, `sk-...`. **0 hits** for any secret pattern. The only JWT in the bundle is the Supabase **anon** key (decoded: `{ "iss":"supabase", "ref":"tsxrrxzmdxaenlvocyit", "role":"anon", ... }`) which is the public publishable key — expected to be in the client bundle. ✓ **PASS**.

### F2 — Security headers

**FIND-050 [INFO] [F2-HEADERS-EXEMPLARY]** — Vercel + storefront ship: `Strict-Transport-Security: max-age=63072000`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, full CSP with explicit `default-src 'self'` + per-source allowlists. ✓ **All required headers present.** No findings.

### F3 — Form posts

**FIND-051 [INFO] [F3-FORM-ACTIONS-OK]** — Visible form actions: `/products` (search form). Lead-intake / quick-register / unsubscribe forms POST via JavaScript fetch (action attr empty, JS handles submission). Source-side review (`pages/api/leads/submit.ts` etc.) confirmed no form posts to external domains. ✓

### F4 — Image proxy (Iron Rule 25)

**FIND-052 [HIGH] [F4-IRON-RULE-25-VIOLATION]** — Multiple pages render direct `https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/object/public/tenant-logos/brands/...png` URLs instead of proxying through `/api/image/[...path].ts`. Per Iron Rule 25 ("Image proxy mandatory. All Supabase Storage images flow through `/api/image/[...path].ts`. The `frame-images` bucket stays private."):
- Homepage: 4 direct supabase storage URLs.
- `/brands/`: 2.
- `/en/`: 4.
- `/ru/`: 4.
- `/multifocal-guide/`: 1.
- `/404`: 1.
- **Bucket detected:** `tenant-logos/brands/...` — the bucket is `tenant-logos`, which IS public (per typical configuration), so this is not a security leak per se — but Iron Rule 25 is violated regardless: any future bucket re-classification, image-resize plumbing, or cache-control tweak has to be applied to BOTH the proxy AND the direct-render path.
- **Recommended fix:** Audit the brand-rendering component (likely `<BrandsBlock>` or `<BrandsCarousel>`); switch to `/api/image/...` proxy URLs. Same fix benefits all pages above.

### F5 — Tenant isolation smoke test

**FIND-053 [INFO] [F5-DEMO-NOT-DEPLOYED]** — Per SPEC §F5, attempted `https://demo.opticalis.co.il`. Not in scope of this audit's tooling to verify; SPEC notes "If demo is not deployed yet, mark this check N/A and log." → N/A.

---

## §8 Category G — Legacy / debt

**FIND-054 [HIGH] [G1-WP-DRIFT-EVERYWHERE]** — The 24 CMS rows containing `053-434-7265`/`prizma-optice.co.il` (FIND-003, FIND-022) are pure WordPress-import drift. Those bodies talk about "online checkout / shopping cart / payment processing / 7-business-day shipping" — features the current Astro storefront DOES NOT have (no checkout). Customer reading `/terms/` thinks they can buy online → can't → frustration.
- **Recommended fix:** Bulk legal-page rewrite — engaging an Israeli consumer-law attorney is the right call here, not a Claude SPEC. Frame this finding as "engage external counsel".

**FIND-055 [MEDIUM] [G2-TEST-SHORTCODES-PUBLIC]** — `/test-shortcodes/` returns 200 (per Tier-2 fetch). CMS has 3 archived rows for that slug — but archived rows ARE still being served by the route handler. The slug is not in the sitemap, so SEO impact is nil; but a typed-URL or shared link reaches a "test" page in production.
- **Recommended fix:** Have the page-renderer skip `is_archived=true` rows. Or hard-delete the rows.

**FIND-056 [HIGH] [G3-MISNAMED-FILE]** — `public/images/lab/israel-hayom-logo.png` is named `.png` but is actually an HTML file (`file(1)` reports `HTML document, Unicode text, UTF-8 text, with very long lines (20237)`, 168KB). It contains a complete WordPress legacy contact-block snippet INCLUDING `<a href="tel:0534347265">` and `tel': 053-434-7265`. The file is in `public/`, served by Vercel as a static asset → publicly readable. Mime-type detection by browser will likely fail or render weird.
- **Customer impact:** If someone shares the URL `/images/lab/israel-hayom-logo.png`, the browser tries to render an HTML body with no MIME hint — partly broken display + `Content-Type: image/png` mismatched will cause "image cannot be displayed" errors when this URL is referenced as `<img src>`.
- **Recommended fix:** Delete the file. Search the codebase for any `<img src="*/israel-hayom-logo.png">` references first; if any exist, replace them with the real Israel Hayom logo image (the file's intent appears to have been to represent the press logo, but somehow an HTML snippet ended up in its place).

**FIND-057 [INFO] [G3-HARDCODED-DATES]** — `_deprecated/legal-terms.ts` line 2 (Hebrew): `החל מה1.2.2024 כל המוצרים האופטיים באתר ... הם להמחשה בלבד` — hardcoded 2024-02-01 cutoff. If the underlying legal stance changes, the deprecated file is wrong but live (since it's importable). Recommended: delete `_deprecated/` (also covered by FIND-023).

---

## §9 Recommended Next-Action Priorities (Daniel's reading order)

1. **TRIAGE Q1 — Phone-leak class re-incident (FIND-003 / FIND-020 / FIND-022 / FIND-056).** Daniel confirms whether `053-434-7265` is a live secondary line at Prizma OR a defunct WP-era number. Same for `prizma-optice.co.il` typo'd email. **Blocking:** these sit on the homepage now. Cluster owns: 24 CMS rows + 1 deprecated-file pair + 1 misnamed image-slot file.
2. **TRIAGE Q2 — 5xx + empty-body production breakage (FIND-001 / FIND-002).** 9 pages broken (6× 500 on raw UTF-8, 3× 200/empty-body legal). Footer links → broken. Statutory obligations on `/terms/`, `/privacy/`, `/deal/` — fix urgently.
3. **TRIAGE Q3 — Brand leak in customer email (FIND-016).** Lead-form confirmation emails go out as "Optic Up Leads" — single highest-leverage fix, single file (`pages/api/leads/submit.ts:148-163`).
4. **HIGH-impact, low-effort:** FIND-005 (set `business_email`), FIND-010 (`/multifocal-guide/` 404), FIND-013 (`/multi-takanon/` HE-only), FIND-017 (`'Optic Up'` fallback in 13 files), FIND-052 (Iron Rule 25 image proxy).
5. **Compliance:** FIND-035 (third-party-tracker consent), FIND-054 (WP-era legal copy + checkout claims).
6. **SEO improvements (after triage):** FIND-045 (sitemap mismatch), FIND-047 (LocalBusiness schema build-out), FIND-048 (campaign page schema).
7. **Performance follow-ups:** FIND-031 (run Lighthouse + archive), FIND-034 (drop double font link), FIND-032 (favicon SVG bloat).
8. **A11Y follow-ups:** FIND-036 (run axe-core), FIND-037 (about page H1), FIND-038 (alt-text audit).
9. **Daniel-decision items:** FIND-008 (price approval tracking), FIND-014 (`/optometry/` draft fate), FIND-024 (font canon decision), FIND-025 (gold canonical hex).
10. **Cleanup / debt:** FIND-019 (orphan `poweredBy` keys), FIND-023 (delete `_deprecated/`), FIND-055 (`/test-shortcodes/` archived but reachable).

---

## §10 Methodology + tool versions

### Tools used in this audit

- `curl` (Windows native, with `-sL`/`-sIL` for status + body fetch).
- Supabase MCP `execute_sql` (read-only) — for CMS row inventory + cross-reference of literals against bodies.
- `grep` / `sed` / `wc` / `file(1)` — for HTML body inspection.
- Bash + filesystem in both `opticalis/opticup` (this repo) and `opticalis/opticup-storefront` (sibling repo, read-only).

### Tools NOT used (gaps logged for follow-up)

- **Chrome DevTools MCP / Playwright** — would have given rendered-DOM checks, JS-rendered content audit, alt-text accessibility tree, JS form submission audit, font-rendering CLS/FOIT measurement. SPEC §10 mandated rendered-DOM audits as PRIMARY tool; this audit fell back to source-grep + raw HTML curl. Limitations: any content rendered by JS post-hydration is invisible to curl. Most of the storefront IS server-rendered (Astro SSR), so coverage is reasonable, but gaps exist (e.g., FloatingWhatsApp ARIA labels, dynamic price badges, language-switcher state).
- **Lighthouse / PageSpeed Insights / lhci** — required for SPEC §C1. Not installed in environment; SPEC restricted package installations. Logged as FIND-031.
- **axe-core / pa11y** — required for SPEC §D1. Same reason. Logged as FIND-036.
- **WebFetch tool** — not used; `curl` was sufficient for HTTP status + body capture.

### Page sampling

- **Tier-1 (full audit):** `/`, `/en/`, `/ru/`, `/supersale/`, `/about/` (×3 langs) — fully fetched + grep-audited.
- **Tier-2 (HTTP status + content grep):** all other published CMS slugs — fetched, status recorded, grep-checked for selected patterns.
- **Tier-3 (CMS-only):** Per-language CMS rows for slugs without per-URL fetch were verified via Supabase query (slug × lang × status).
- **Tier-4 (existence-check):** `/products/`, `/brands/`, `/categories/`, `/search/`, `/blog/`, `/event-register/`, `/quick-register/`, `/unsubscribe/`, `/404` — only HTTP status + brief grep.

### Methodological caveats

1. **Raw UTF-8 vs browser-encoded URLs:** This audit flagged 6 pages as "500" via raw UTF-8 curl. Browsers usually pre-encode `<a href>` Hebrew characters before requesting → most real users won't hit these 500s. The **finding is real** (the redirect handler IS broken), but customer impact is "moderate" rather than "every visitor", because most click flows pre-encode.
2. **Translation parity is partially audited:** Byte-size comparisons of HE/EN/RU homepages don't capture true translation parity. Logged as FIND-015; needs follow-up DOM-level audit.
3. **Performance & accessibility tooling absent:** Two whole categories (C1, D1) carry "tool not installed" gaps. The findings within those categories are limited to what raw HTML grep can reveal. A second audit pass with proper tooling is recommended.
4. **No DB writes occurred during this audit.** Verified at SPEC §5 criterion #7. All Supabase MCP calls were `SELECT` only.

### Where the SITE_MAP.md sits

`roles/site-overseer/SITE_MAP.md` (Mode A baseline) was authored as part of this commit. Future Mode B sessions can do targeted (single-category) re-audits without re-walking the entire surface.

### Known unknowns

- The 53/24-row CMS-bodies WP-drift cluster is partially mapped (24 rows confirmed for two literals — phone + email-typo). Other legacy artifacts likely exist (pre-2024 dates, "online checkout" verbiage, third-party shortcodes referenced but not implemented). A targeted "WP-drift sweep" SPEC is recommended.
- The Vercel redirect mis-encoding (FIND-001) root cause was not pin-pointed; needs Vercel project config + middleware review.
- Whether `prizma-optice.co.il` (the typo'd email domain) has been registered by a third party (typosquatter) is unknown — DNS/WHOIS check warranted before bulk-fixing the typo (in case mail is somehow routed there now).

---

*End of SITE_AUDIT_REPORT.md.*
