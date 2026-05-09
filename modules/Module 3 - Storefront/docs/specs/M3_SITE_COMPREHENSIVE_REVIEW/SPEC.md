# SPEC — M3_SITE_COMPREHENSIVE_REVIEW

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (acting as Site Overseer Foreman)
**Created:** 2026-05-06
**Type:** READ-ONLY discovery + audit / Site Overseer Mode A baseline
**Severity assignment:** none yet — SPEC produces a findings catalog; severities assigned per finding by the executor using opticup-guardian severity rubric

---

## 1. Goal

Produce a **comprehensive read-only audit** of the Prizma storefront (`https://prizma-optic.co.il`) plus its CMS-driven content (Supabase `storefront_pages`) and the Astro source code (`opticup-storefront` repo on `develop`). The audit's primary job is to surface **customer-facing issues** — wrong content, broken links, stale pricing, language/translation mismatches, brand inconsistencies, performance regressions, accessibility violations, SEO problems, and security exposures.

The deliverable is a **findings report** (not fixes) that Daniel will use to decide what to address next. This SPEC also produces the **first Site Overseer SITE_MAP.md** baseline that future Mode B sessions will read for targeted scans.

**Why this SPEC exists:** the 050-717-5675 incident (closed by SPEC `M4_HARDCODED_DEMO_PHONE_CLEANUP` 2026-05-06) revealed that the site is rendering values pulled from code/DB without any systematic check. Daniel's directive: "תעבור על כל האתר ותעשה סקירה שלו ... כל מה שנראה לי לנכון בשביל לוודא שהאתר במצב הכי טוב שיש." This SPEC operationalizes that directive.

---

## 2. Background

**Repo & deploy:**
- Storefront source: `opticup-storefront` (sibling repo, Astro 5 + TS + Tailwind), branch `develop` for work, `main` deploys to Vercel
- Public URL: `https://prizma-optic.co.il` (Prizma's custom domain → Vercel project `opticup-storefront`)
- Storefront reads tenant data via Views + RPC only (Iron Rule 13). Primary tenant view: `v_public_tenant`. Storefront config view: `v_storefront_config`. Pages view: `v_storefront_pages`.
- Tenant resolution: `src/lib/tenant.ts` resolves slug or custom-domain → tenant config → site theme/phone/email/footer/etc.

**Content surface (verified 2026-05-06 by SPEC author via Supabase MCP):**

CMS-driven pages in `storefront_pages` for tenant=prizma: ~30 distinct slugs × up to 3 langs (he/en/ru) = ~80 published rows + 3 drafts (`/optometry/`) + 3 archived (`/test-shortcodes/`). Page types observed: `homepage`, `legal`, `campaign`, `custom`, `guide`, `landing`. Notable slug families:
- Legal/policy: `/terms/`, `/terms-branches/`, `/privacy/`, `/accessibility/`, `/deal/`, `/supersale-takanon/`, `/multi-takanon/`, `/prizma-express-terms/`, `/משלוחים-והחזרות/`
- Campaigns: `/supersale/`, `/supersale-stock/`, `/supersalepricescatalog/`, `/supersale-models-prices/`, `/successfulsupersale/`, `/premiummultisale/`, `/multi/`, `/successfulmulti/`, `/general/`, `/eventsunsubscribe/`, `/multisale-brands-cat/`, `/multisale-brands-cat2/`, `/מיופיה/`
- Custom/guide: `/about/`, `/optometry/` (draft), `/prizmaexpress/`, `/lab/`, `/multifocal-guide/`, `/משקפי-מולטיפוקל/`, `/צרו-קשר/`, `/שאלות-ותשובות/`
- Hardcoded Astro routes (not CMS): homepage `/`, products `/products/`, brands `/brands/`, categories `/categories/`, search `/search/`, blog `/בלוג/` and `/blog/`, accessibility `/accessibility/`, `/event-register/`, `/quick-register/`, `/unsubscribe/`, `/supersale-takanon/`, `/supersale-stock/`, `/404`

**Tenant fields the site renders** (verified 2026-05-06):
- `tenants.business_phone` → top-bar tel-CTA (now 053-3645404 ✓)
- `tenants.business_email` → footer email
- `tenants.logo_url` → header logo
- `tenants.theme` → CSS variables
- `tenants.seo` → site-wide meta defaults
- `storefront_config.whatsapp_number` → floating WhatsApp button
- `storefront_config.booking_url` → "תיאום בדיקת ראייה" CTA
- `storefront_config.hero_*` → homepage hero
- `storefront_config.footer_config` → footer columns/links
- `storefront_config.supported_languages` → language switcher
- `tenants.ui_config.support_phone_display` → 053-3645404 (alt format, used in templates)
- `tenants.ui_config.whatsapp_phone_e164` → 972533645404
- `tenants.ui_config.brand` → gold colors

**Active known issues (auto-memory cross-check, 2026-05-06):**
- POST-1 broadcast 1000-cap (HIGH) — UNRELATED to site
- POST-7 phone-search bug (HIGH) — CRM, UNRELATED
- All other recent storefront SPECs CLOSED.
- No open Sentinel CRITICAL alerts on storefront paths (per project memory; executor must verify by reading `docs/guardian/GUARDIAN_ALERTS.md`).

**Out-of-scope reminders from prior SPECs:**
- No storefront prices for any brand without explicit Daniel approval per brand (memory `feedback_no_storefront_prices`). Mark any visible price NOT pre-approved as a finding.
- Mobile Optical (`/prizmaexpress/`) banner stays — service paused per memory `project_mobile_optics_paused`. Pages must NOT be flagged for "promising service" copy *unless* they make a time-bound commitment.
- 16 messages with hardcoded Waze URLs are pending migration (memory `project_waze_url_migration_pending`) — NOT site, ignore.

---

## 3. Step 0 — Reproduce-the-bug-first sanity (MANDATORY before audit starts)

Before opening any audit page, the executor MUST verify the audit harness works end-to-end on a known-good page:

1. Curl `https://prizma-optic.co.il/` — expect HTTP 200 + body containing "פריזמה" or `prizma` in canonical link.
2. Curl `https://prizma-optic.co.il/he/sitemap.xml` (or `/sitemap.xml`) — expect 200 + valid XML.
3. Render-DOM probe on the homepage via `curl + grep` for "053-3645404" — expect at least 1 hit (the tel-CTA in the header). If 0 — STOP, the storefront is showing the OLD phone again; investigate before continuing.

If any of these 3 fail, STOP and report. The audit cannot be trusted if the harness can't see the live site.

---

## 4. Scope

### In scope (audit ALL of the below)

**A. Customer-facing content (PRIMARY priority — Daniel's directive)**

A1. **Contact details consistency.** For every page, every language, every place a phone/email/address/WhatsApp/Waze/booking-URL appears: extract the value and cross-reference against the canonical sources (`tenants.business_phone`, `tenants.business_email`, `ui_config.support_phone_display`, `ui_config.whatsapp_phone_e164`, `storefront_config.booking_url`, branch addresses in `terms-branches`). Report every mismatch.
**Specifically watch for:** any phone in the `050-7XX-XXXX` family that is NOT `053-3645404` (Daniel's directive: "המספר 050-717-5675 בחיים לא השתמשנו בו"). Any literal `050-717-5675`, `0507175675`, `+972507175675` is a CRITICAL finding regardless of where it appears (legal/campaign/code/SQL).

A2. **Stale dates / pricing / promo terms.** Scan campaigns + legal pages for date references (`21.02.2026`, `03.05.2026`, etc.) and any price points (`₪400`, `690`, `890`, `1050`, `50%`). Cross-check against active campaigns' SQL — flag dates already in the past for active-status pages and prices that contradict each other across pages.

A3. **Broken inbound links.** For each page: extract every `<a href>` (internal + external). Test internal links return 200; flag externals returning 4xx/5xx or invalid URLs. Special attention: footer links, header nav, "Read more" CTAs, "Book exam" CTAs, the homepage hero CTA.

A4. **Translation parity.** For each slug that exists in multiple langs (he/en/ru), compare body content. Flag: missing translation (lang exists but body is mostly Hebrew filler), draft-status-while-published-elsewhere (e.g., `/optometry/` is draft in all 3 langs — verify intentional vs. accidental), and obvious automatic-translation breakage.

A5. **Hardcoded "Optic Up" customer-facing text.** Every customer-facing page must reflect the tenant's branding (per memory `feedback_customer_facing_branding`). Flag any visible mention of "Optic Up", "OpticUp", "opticup" outside of meta tags / dev tooling.

A6. **Decorative-real-looking values (LEARNINGS L-PROJECT-001 enforcement).** Apply the regex `0(50|52|53|54|58)-XXX-XXXX` and similar patterns against every Astro source file + every CMS page body. Any hit that does NOT match a verified tenant config row → flag.

**B. Visual / brand consistency**

B1. Design canon compliance per `roles/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md` (if accessible, else baseline = top 3 most-trafficked pages: `/`, `/supersale/`, `/`+language-switched homepages). Fonts: Rubik 4 weights only. Gold: `#c9a555` (+ light/hover variants from `ui_config.brand`). Surface tones: light/dark canon.
B2. Logo presence & quality on header + footer for all 3 languages.
B3. Hero image present, loaded, no broken image icon, alt text non-empty.
B4. RTL/LTR correctness — Hebrew uses `dir="rtl"` and logical CSS properties; English/Russian use `dir="ltr"`. Flag any page with mixed direction or visible LTR layout in a Hebrew context.
B5. Floating WhatsApp button + Floating Wishlist button appear on every customer page (per `BaseLayout.astro`).
B6. Top-bar phone CTA renders correctly on mobile + desktop (the user just verified it; double-check across the 3 langs).

**C. Performance**

C1. PageSpeed mobile score on 5 anchor pages: `/`, `/supersale/`, `/products/`, `/brands/`, `/about/`. Report each score + top 3 LCP/CLS/INP issues. (Use Google PageSpeed API or Lighthouse — executor's choice.)
C2. Image weight audit: for the homepage + supersale, list every `<img>` whose actual transferred bytes exceed 200KB and whose dimensions are <600px on the rendered page. Report URL + size.
C3. Font loading: check that no FOUT/FOIT is observable (Rubik must be `font-display: swap` or preload + swap).
C4. Third-party blockers: any `<script>` tag from a non-allowlisted CDN (allowlist per Iron Rules: cdnjs/esm.sh/jsdelivr/unpkg + Vercel-internal + Supabase-internal). Flag third-party trackers loading synchronously.

**D. Accessibility (WCAG 2.1 AA)**

D1. Run automated check (axe-core or pa11y) on the same 5 anchor pages from C1. Report all violations grouped by impact (critical/serious/moderate/minor).
D2. Manual checks: tab order on the homepage, focus-visible state on the language switcher, alt text on hero + brand grid + product cards, ARIA labels on the Floating WhatsApp + Wishlist buttons.
D3. Color contrast: gold-on-dark and dark-on-gold text combinations must pass AA (4.5:1 normal text). Flag any combination that fails — especially the top-bar CTA (gold pill on light bg) and the brand-circle block.

**E. SEO**

E1. Canonical URL present on every page. Hebrew pages canonical to the Hebrew variant; same for en/ru.
E2. `<title>` and `<meta description>` present and unique per page (no duplicates across slugs).
E3. Open Graph meta (`og:title`, `og:description`, `og:image`) present on at least the homepage + every campaign page.
E4. Hebrew slugs (`/בלוג/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/מיופיה/`, etc.) — verify they don't double-encode or 404.
E5. `robots.txt` exposes sitemap; `sitemap.xml` (or per-lang sitemaps) lists all published pages and excludes drafts/archived.
E6. Structured data (`Schema.org/LocalBusiness` per `src/lib/schema.ts`) present on the homepage; `telephone` field reflects the corrected `053-3645404`.

**F. Security / privacy**

F1. No secrets in client bundle: scan transferred JS for `service_role`, `SERVICE_ROLE`, `jwt_secret`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc.
F2. CSP / security headers present (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`). Note Vercel defaults are usually OK; flag missing.
F3. Form posts: every form submits to an allowlisted endpoint (Supabase Edge Functions, lead-intake, quick-register, contact). No form posts to external domains.
F4. Image proxy: storefront image URLs go through `/api/image/[...path].ts` (Iron Rule 25). Flag any `<img src>` pointing directly at `*.supabase.co/storage`.
F5. Tenant isolation smoke test: hit `https://demo.opticalis.co.il` (or whatever the demo hostname is) and verify NO Prizma data leaks (logo, phone, hero copy). If demo is not deployed yet, mark this check N/A and log.

**G. Legacy / debt**

G1. WordPress legacy drift in legal pages (terms/privacy/accessibility/shipping). Flag any text that describes online checkout, shopping cart, payment processing, "your order will be shipped" — these belong to the WordPress site that the storefront REPLACES, not the current Astro site (which has no checkout). The Site Overseer was constituted partly to address this drift.
G2. `/test-shortcodes/` archived rows — verify they're truly excluded from the public site (no inbound links, no sitemap entry).
G3. Hardcoded Hebrew month names / dates that won't auto-update (e.g. literal "אוקטובר 2025" in active campaign body). Flag for cleanup if past or near-past.

### Out of scope

- ANY code changes (this SPEC is read-only). Findings only.
- ANY DB writes.
- ANY EF deploys or migrations.
- Storefront Studio (ERP-side admin tooling) — separate concern.
- Make scenarios — separate concern.
- CRM screens — separate concern.
- Sentinel reports for non-storefront missions.

### Whitelist of write paths (executor may CREATE these and only these)

1. `roles/site-overseer/SITE_MAP.md` (Mode A baseline — first time creation)
2. `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SITE_AUDIT_REPORT.md` (the findings report)
3. `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/EXECUTION_REPORT.md`
4. `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/FINDINGS.md`
5. `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (update existing)
6. `roles/site-overseer/DECISIONS_LOG.md` (create empty if missing — this becomes the Mode B baseline)

No other files may be created or modified. No git operations beyond `add` of those exact files + one atomic `commit` + `push origin develop`.

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Audit harness verified on homepage (Step 0) | Step 0 outputs | All 3 sub-checks PASS |
| 2 | All ~30 unique slugs × 3 langs sampled (≥80 page fetches) | Audit report §1 page-fetch table | ≥80 rows, each with HTTP status |
| 3 | Every category A-G has at least 3 findings OR an explicit "0 findings — methodology used: X" note | Audit report ToC | ≥7 sections populated |
| 4 | Every finding has: ID (FIND-NNN), category (A-G), severity (CRITICAL/HIGH/MEDIUM/LOW/INFO), evidence (URL + quote/screenshot path), recommended fix (one line), customer-impact assessment | Audit report findings table | 100% conformance |
| 5 | SITE_MAP.md created at `roles/site-overseer/SITE_MAP.md` per Site Overseer Mode A protocol | File exists + has §1-§7 | File exists, ≥6 sections |
| 6 | NO files created/modified outside the §4 whitelist | `git status` post-commit | Only whitelist paths in commit |
| 7 | NO DB writes occurred | Supabase audit log review (manual statement in EXECUTION_REPORT) | Confirmed read-only |
| 8 | Every CRITICAL finding has a 1-paragraph customer-impact statement | Audit report | 100% conformance |
| 9 | Phone number 050-717-5675 appears 0 times in audit findings as a "live" value (it's been removed); however the audit MUST grep for it explicitly and confirm 0 hits in: deployed JS bundles, live storefront_pages bodies, live tenant config | Audit report §A1 "decorative-real-looking values" probe | Explicit "0 hits" entry |
| 10 | Single atomic commit | `git log -1 --oneline` | One commit, message starting `audit(storefront): comprehensive site review M3_SITE_COMPREHENSIVE_REVIEW` |
| 11 | Repo clean post-commit | `git status` | `nothing to commit, working tree clean` |
| 12 | Integrity gate clean | `npm run verify:integrity` | exit 0 |

---

## 6. Autonomy Envelope (Bounded Autonomy)

**Executor MAY autonomously:**
- Curl any storefront URL (HEAD or GET, read-only).
- Run any read-only Supabase MCP query against the schemas: `public`, `auth` metadata only (NEVER auth.users data), Vercel project metadata.
- Run PageSpeed Insights / Lighthouse / pa11y / axe-core CLI / lhci against any storefront URL.
- Read any file in BOTH repos (`opticup` ERP + `opticup-storefront`).
- Write the 6 whitelist files in §4.
- Create the SPEC folder if missing.
- Commit + push to develop ONLY ONCE at end.

**Executor MUST stop and report immediately:**
- A CRITICAL finding involving exposed secrets in the client bundle (security incident — Daniel decides next move before further discovery).
- An HTTP 5xx on the homepage (`/`) — site is down, escalate.
- Any tool returns "rate-limited" / "blocked by Cloudflare" / "captcha" — coordinate retry strategy.
- Discovery that the audit harness is reading a STALE deployment (e.g. Vercel preview URL) instead of production. Verify domain → Vercel project mapping.
- More than 50 findings in any single category — possible methodology error / over-flagging.

**Executor MUST NOT (under any circumstances):**
- Modify ANY production data.
- Deploy ANY code.
- Edit ANY file outside the §4 whitelist.
- Send ANY POST/PUT/DELETE to the storefront forms (lead-intake, quick-register, contact, unsubscribe). Probe with HEAD or GET only.
- Touch the storefront repo (`opticup-storefront`). The findings report lives in the ERP repo per Authority Matrix.
- Skip Step 0.
- Skip integrity gate or commit-clean-repo.

---

## 7. Stop-on-Deviation Triggers

In addition to global triggers:
- 3 consecutive page fetches return 5xx → STOP (probably DDoS-detection / service issue).
- Audit takes >2 hours of executor wall time → STOP and report progress; Daniel decides scope reduction.
- Executor identifies that a finding requires DB writes to verify properly (e.g. "I need to UPDATE this row to test") — STOP, do NOT write; flag as a finding requiring follow-up SPEC instead.

---

## 8. Expected Final State

**On disk (commit hash X):**
- `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SPEC.md` (this file, unchanged).
- `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SITE_AUDIT_REPORT.md` — the master findings document. Structured as: §1 page-fetch matrix, §2-§8 findings by category A-G, §9 recommended next-action priorities, §10 methodology + tool versions used.
- `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/EXECUTION_REPORT.md` — standard executor retro.
- `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/FINDINGS.md` — meta-findings about the SPEC itself (NOT the audit findings — those go in SITE_AUDIT_REPORT).
- `roles/site-overseer/SITE_MAP.md` — Mode A baseline.
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — updated to Mode B (post-discovery).
- `roles/site-overseer/DECISIONS_LOG.md` — empty stub created for Mode B sessions.

**Production:** UNCHANGED. Storefront live, DB live, no deploys.

**Daniel's experience:** opens `SITE_AUDIT_REPORT.md`, sees 30-100 findings ranked by customer impact, decides which ones become SPECs. Site Overseer transitions to Mode B and is ready for targeted follow-ups.

---

## 9. Commit Plan

Single commit, atomic. Message:
```
audit(storefront): comprehensive site review M3_SITE_COMPREHENSIVE_REVIEW

Read-only audit of prizma-optic.co.il + storefront_pages CMS + Astro source
per SPEC M3_SITE_COMPREHENSIVE_REVIEW. Customer-facing priority. Produces:

- SITE_AUDIT_REPORT.md — N findings, M CRITICAL / X HIGH / Y MEDIUM
- SITE_MAP.md — first Site Overseer Mode A baseline
- HANDOFF + DECISIONS_LOG — site-overseer state transition to Mode B

No code changes. No DB writes. No deploys. Findings only — Daniel reviews
report and decides which become follow-up SPECs.
```

Add files (explicit, no -A):
```
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SITE_AUDIT_REPORT.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/EXECUTION_REPORT.md
git add modules/Module\ 3\ -\ Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/FINDINGS.md
git add roles/site-overseer/SITE_MAP.md
git add roles/site-overseer/SITE_OVERSEER_HANDOFF.md
git add roles/site-overseer/DECISIONS_LOG.md
```

---

## 10. Methodology Notes (executor guidance)

**Recommended tool stack:**
- `curl -sIL` for HTTP status checks.
- `curl -s | grep` for source-HTML probes (use sparingly — JS-rendered content is invisible).
- **Chrome MCP / Playwright** for rendered-DOM checks (PRIMARY tool for visual + content audit). Per FOREMAN lessons: source-HTML grep alone gives false positives on inert JS template literals. Always default to rendered-DOM.
- `lhci` or PageSpeed Insights API for C1.
- `pa11y` or `axe-core` CLI for D1.
- Supabase MCP `execute_sql` for any DB-side cross-reference (read-only queries, e.g. `SELECT body, body_translations FROM v_storefront_pages WHERE...`).

**Page sampling strategy:** Don't audit every page identically. Tier sampling:
- **Tier 1 (full audit, all 7 categories):** `/`, `/he/`, `/en/`, `/ru/`, `/supersale/`, `/about/`, `/צרו-קשר/`, `/terms/`, `/privacy/`.
- **Tier 2 (content + links + accessibility):** all other published `legal` + `campaign` + `guide` pages.
- **Tier 3 (link-check + sample-content):** `landing` + remaining `custom`.
- **Tier 4 (existence-check only):** `/products/`, `/brands/`, `/categories/`, `/search/` (these are dynamic, content correctness is a separate domain).

**Finding-ID format:** `FIND-{NNN}` global counter, plus a category prefix tag in the finding body for grouping (e.g. `[A1-PHONE]`, `[D2-A11Y]`). Store findings sorted first by severity (CRITICAL→INFO), then by category (A→G), then by ID.

---

## 11. Lessons already incorporated

From recent FOREMAN_REVIEWs:
- **Step 0.1 #6 (per-consumer enumeration):** every "live value" probe in §A1/§A6 enumerates BOTH source files AND CMS bodies AND deployed JS bundles — three asset families, no skipping.
- **Step 0.1 #7 (rendered-DOM over source-grep):** §10 methodology mandates Chrome MCP / Playwright as the PRIMARY audit tool. Source-grep is a secondary cross-check.
- **3-occurrence rule (M4 series):** the SPEC author manually verified all citations against live sources (page-list query, file existence, repo paths) on 2026-05-06 to avoid the "phantom value cited from memory" pattern that has hit 3 prior SPECs.
- **L-PROJECT-001 enforcement:** §A6 explicitly enforces the new project LEARNINGS rule.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-06 against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, the Module 3 specs folder list, and live Supabase schema. **0 collisions**: no other SPEC under M3 currently audits site-wide content; no other SITE_MAP.md exists in the repo; the slug `M3_SITE_COMPREHENSIVE_REVIEW` is unique under `modules/Module 3 - Storefront/docs/specs/`.

---

## 13. Estimated effort

- 4-8 hours executor wall time. Bulk of time = rendered-DOM page audits + accessibility tooling.
- If the audit blows past 8 hours → §7 stop trigger fires.

---

## 14. Definition of Done

All 12 success criteria pass. Single commit on develop. Repo clean. Site Overseer transitioned to Mode B. Daniel can read SITE_AUDIT_REPORT.md as a standalone document without prior context.

---

*End of SPEC.*
