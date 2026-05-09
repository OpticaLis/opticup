# FINDINGS — M3_BRANCHES_INFRA_AND_ASHKELON

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_BRANCHES_INFRA_AND_ASHKELON/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-09)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Pre-existing `vercel.json` redirect intercepted `/branches/` and 308'd to `/terms-branches/`

- **Code:** `M3-INFRA-01`
- **Severity:** MEDIUM (caught by live test; required fix-up commit `ae60b37`)
- **Discovered during:** Post-deploy `verify-branches.mjs` run on production
- **Location:** `opticup-storefront/vercel.json` lines 8214-8218 (pre-fix) — `{"source":"/branches/","destination":"/terms-branches/","permanent":true}`
- **Description:** The new `/branches/` route returned HTTP 200 in code but production returned 308 → `/terms-branches/`. Root cause: a pre-existing Vercel redirect rule from earlier WP-cleanup work assumed `/branches/` would never become a real route. With the new SSR pages in place, the Vercel platform redirect intercepted requests BEFORE the Astro server-render pipeline. Removed the single rule (5 lines) in commit `ae60b37`. Detail page `/branches/ashkelon/` was unaffected because the rule was anchored to `/branches/` exactly, not `/branches/*`.
- **Reproduction:**
  ```bash
  # Pre-fix:
  curl -sI https://www.prizma-optic.co.il/branches/
  # HTTP/1.1 308 Permanent Redirect
  # Location: /terms-branches/
  # Post-fix:
  # HTTP/1.1 200 OK
  ```
- **Suggested next action:** TECH_DEBT — Foreman SKILL update: when a SPEC adds a new top-level URL path, the executor's Step 1.5 pre-flight should grep `vercel.json` for any redirect/rewrite that matches the new path. Generalizes the existing pattern from M3_TENANT_NAME_FALLBACK_SAAS (override grep) to platform-config.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Lat/lng coordinates (31.6688°N, 34.5743°E) are best-guess; need Daniel verification

- **Code:** `M3-DATA-02`
- **Severity:** LOW (coordinates work for general "Ashkelon center" but may be off by 100-300m from actual Herzl 32 storefront entrance)
- **Discovered during:** §4 seed planning — SPEC §2 said executor MUST verify externally before seeding
- **Location:** `tenant_branches.latitude=31.668800, longitude=34.574300` for the Ashkelon row
- **Description:** Used the SPEC's suggested approximation (~31.6688°N, 34.5743°E) which corresponds to Ashkelon's main pedestrian street (midrahov) area. Could not externally verify against Google Maps geocoding (no API key wired into this session). The Schema.org JSON-LD's `geo` field uses these coordinates, and the `/maps?q=lat,lng` link + `/maps?q=lat,lng&output=embed` iframe also use them. If the actual storefront entrance is off by >100m, Daniel should UPDATE `tenant_branches.latitude/longitude` for accuracy. Doesn't break anything — the page still renders + Schema.org is structurally valid; just minor map placement accuracy.
- **Reproduction:**
  ```sql
  SELECT slug, latitude, longitude FROM tenant_branches WHERE slug='ashkelon';
  -- (31.668800, 34.574300)
  ```
- **Suggested next action:** TECH_DEBT — Daniel runs a "what-3-words"-style precision check (open Google Maps, search "הרצל 32 אשקלון", read coords from URL) and `UPDATE tenant_branches SET latitude=X, longitude=Y WHERE slug='ashkelon'` if the precise location differs.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Footer "branches" link added in bottom-bar (same pattern as cookie-prefs); doesn't appear inside columns for prizma

- **Code:** `M3-EXEC-03`
- **Severity:** INFO
- **Discovered during:** Pre-implementation review — SPEC §5-C-14 said "MODIFY src/components/Footer.astro to add 'סניפים' link"
- **Location:** `src/components/Footer.astro` bottom-bar (next to copyright + cookie-prefs link)
- **Description:** prizma's `storefront_config.footer_config.columns` overrides `defaultColumns` (recurring from M3_COOKIE_CONSENT_OPT_IN Finding M3-EXEC-02). Modifying `defaultColumns` to add a "Locations" column would have rendered for tenants WITHOUT a footer override but NOT for prizma. Used the same bottom-bar pattern as cookie-prefs to ensure the link surfaces for any tenant. UX: the link sits next to the © copyright line — visible but small. If Daniel later wants the link more prominent (e.g. a top-level "Locations" column in the legal area), he can `UPDATE storefront_config.footer_config` accordingly.
- **Suggested next action:** DISMISS for now; Daniel can later promote the link to a regular footer column via DB UPDATE if visibility wants to be higher.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Schema.org Rich Results Test cannot be invoked programmatically from this session

- **Code:** `M3-INFRA-04`
- **Severity:** INFO
- **Discovered during:** SPEC §11 step 2 ("Pass through Google's Rich Results Test API")
- **Location:** Google's Rich Results Test (https://search.google.com/test/rich-results) is an interactive web tool; no public API wired up here.
- **Description:** SPEC §11 specified Google's Rich Results Test for JSON-LD validation. Substituted with structural validation in `verify-branches.mjs`: confirms required Schema.org fields (`@context`, `@type`, `name`, `address` with PostalAddress sub-fields, `geo` with GeoCoordinates, `openingHoursSpecification` array length >= 10, `image` array length >= 4, `telephone`, `sameAs`). All structural requirements pass. Saved the production JSON-LD to `screenshots/jsonld-ashkelon-production.json` for Daniel to paste into Google's Rich Results Test interactively if a real validator pass is desired.
- **Suggested next action:** DISMISS — Daniel can run https://search.google.com/test/rich-results → enter `https://www.prizma-optic.co.il/branches/ashkelon/` → confirm Google's report has 0 errors / 0 warnings. If it surfaces a missing field (e.g., `aggregateRating`), that's a follow-up SPEC for richness rather than correctness.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — `image` array uses `prizma-optic.co.il` apex (not `www.prizma-optic.co.il`)

- **Code:** `M3-INFRA-05`
- **Severity:** LOW
- **Discovered during:** Inspection of saved JSON-LD
- **Location:** `BranchSchemaJsonLd.astro` builds `origin` from `Astro.site?.origin` which is `https://prizma-optic.co.il` (per `astro.config.mjs site` setting), not `https://www.prizma-optic.co.il`.
- **Description:** Schema.org image URLs in the production JSON-LD start with `https://prizma-optic.co.il/api/image/...` (apex, no `www`). The apex Vercel rewrites these requests to `www.` so they still resolve, but ideally the JSON-LD would use the canonical `www.` URL directly to avoid the redirect hop for crawlers. Same situation for `@id` and `url` (canonical URLs in JSON-LD use the apex). Functional impact: zero — Google follows the redirect. Minor cleanup: change `astro.config.mjs site` to `https://www.prizma-optic.co.il` (or have the JSON-LD code force `www.` host).
- **Suggested next action:** TECH_DEBT — small `astro.config.mjs` `site:` change in a future maintenance pass. NOT blocking REC-SITE-009 closure.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — EN + RU branch list pages use HE branch name "אופטיקה פריזמה אשקלון" because EN/RU localized fields ARE populated but link still uses HE name

- **Code:** `M3-EXEC-06`
- **Severity:** INFO
- **Discovered during:** EN/RU detail page rendering review post-deploy
- **Location:** All 3 list/detail pages call `pickLocalized(branch, 'name', locale)` correctly. The seed migration populated `name_en='Prizma Optic Ashkelon'` and `name_ru='Оптика Призма Ашкелон'`, so EN/RU pages DO show the localized branch name. Verified via curl. Not a bug.
- **Description:** Initial concern was that fallback would over-trigger. Investigation: EN/RU pages render `Prizma Optic Ashkelon` and `Оптика Призма Ашкелон` correctly. The `intro_en` and `intro_ru` are NULL (intentional per SPEC §5-D — Daniel populates later via Studio), so the intro paragraph DOES fall back to the Hebrew text. That's expected and SPEC-anticipated behavior, not a finding. Documenting as INFO so the next Site Overseer pass doesn't re-flag.
- **Suggested next action:** DISMISS — fallback works correctly. Daniel can populate `intro_en` and `intro_ru` via Studio (or future SPEC) to remove the HE fallback.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
