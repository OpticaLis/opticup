# FINDINGS — M3_COOKIE_CONSENT_OPT_IN

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_COOKIE_CONSENT_OPT_IN/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-09)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `tenants.ui_config` was not exposed via `v_public_tenant`; required Level 3 view extension

- **Code:** `M3-SPEC-01`
- **Severity:** MEDIUM (would have blocked banner from rendering at all if not addressed; SPEC §7 originally only authorized Level 2 UPDATEs)
- **Discovered during:** Step 0 follow-up — read of `v_public_tenant` definition before writing the seed migration
- **Location:** `SPEC.md` §3 "tenants.ui_config.cookie_consent" + §7 Autonomy Envelope (Level 2 only)
- **Description:** SPEC §3 placed the cookie_consent JSON inside `tenants.ui_config`. But the storefront reads tenants exclusively via `v_public_tenant` (Iron Rule 13 / storefront Iron Rule 24 — Views-only for external reads). The view did NOT expose `ui_config` (only `phone_general` and `phone_catalog` extracted via `->>`). Without view extension, `tenant.ui_config` would be undefined at runtime and the banner would never render. SPEC §7 only authorized Level 2 UPDATEs; the necessary Level 3 view extension was outside the envelope. Asked Daniel via AskUserQuestion; chose "Extend v_public_tenant to include ui_config (Recommended)." 2 additional migration files added (extend up + down).
- **Reproduction:**
  ```sql
  SELECT pg_get_viewdef('public.v_public_tenant'::regclass, true);
  -- Pre-fix: no `ui_config` column; only `ui_config ->> 'phone_general'` and `ui_config ->> 'phone_catalog'`.
  ```
- **Suggested next action:** TECH_DEBT — Foreman SKILL update: any SPEC that places data in a table whose storefront read goes through a view must include the view extension in the same authorization envelope. Generalizes for future jsonb fields added to tenants.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Hardcoded `defaultColumns` change to Footer doesn't surface for tenants with `footer_config.columns` override

- **Code:** `M3-EXEC-02`
- **Severity:** MEDIUM (caught by live test before close; required follow-up commit `2aebe5a`)
- **Discovered during:** Live test criterion 12 — `data-cookie-preferences` selector returned 0 elements on prizma's footer
- **Location:** `src/components/Footer.astro` — `const columns = footerConfig?.columns || defaultColumns`. Prizma's `storefront_config.footer_config.columns` exists with 4 custom columns, fully overriding `defaultColumns`.
- **Description:** Initial implementation appended a `cookiePreferences: true` link to the legal column inside `defaultColumns`. For tenants WITHOUT a `footer_config.columns` override, this rendered correctly. Prizma DOES override, so the link was hidden — invisible in production. Live test (`document.querySelector('[data-cookie-preferences]')` → null) caught this. Refactored: link now renders in the Footer's bottom-bar (next to copyright) when `showCookiePreferences=true` is passed from BaseLayout, regardless of footer_config. Works for ANY tenant whose cookie_consent is enabled.
- **Reproduction:**
  ```sql
  SELECT footer_config ? 'columns' AS has_columns,
         jsonb_array_length(footer_config->'columns') AS n_cols
    FROM storefront_config WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- has_columns=true, n_cols=4 — defaultColumns is ignored entirely
  ```
- **Suggested next action:** TECH_DEBT — opticup-executor SKILL update: when modifying default arrays (defaultColumns, defaultLinks, etc.) that are used as `data || defaults` fallbacks, check if any tenant overrides the entire array. If yes, the change is hidden for that tenant. Pattern: add the new feature as a separate prop / bottom-bar / always-rendered slot, OR update the tenant's override in DB.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Only 1 of 5 trackers (FB Pixel) actually fires today on prizma — others have no IDs configured

- **Code:** `M3-DATA-03`
- **Severity:** INFO (consent gate works for all 5; only 1 has data to gate)
- **Discovered during:** Live test criterion 10 — Accept all → network tab showed only `connect.facebook.net` requests
- **Location:** `storefront_config.analytics` for prizma — only `facebook_pixel_id` is set (`304574492100180`); `gtm_id`, `ga_id`, `hotjar_id`, `tiktok_pixel_id` are all null/absent.
- **Description:** SPEC criterion 10 expectation was "all 5 trackers fire." Reality: only FB Pixel has an ID configured for prizma, so only its consent-gated payload has anything to inject. The other 4 tracker payloads ARE wrapped in the same `consentGate('analytics')` / `consentGate('marketing')` helper — verified by inspection of the built `dist/server/entry.mjs` — they would fire identically if their IDs were populated. The single positive case (FB Pixel) is sufficient to validate the gate behavior for the entire set, since all 5 use the same `consentGate()` helper.
- **Reproduction:**
  ```sql
  SELECT analytics->>'gtm_id', analytics->>'ga_id', analytics->>'facebook_pixel_id',
         analytics->>'tiktok_pixel_id', analytics->>'hotjar_id'
    FROM storefront_config WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- Only facebook_pixel_id populated.
  ```
- **Suggested next action:** DISMISS — the gate behavior IS validated. Daniel may at some point populate GTM/GA4/Hotjar/TikTok IDs (REC-SITE-009 LocalBusiness schema build-out is adjacent); when he does, those trackers will gate identically (same helper, same code path).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `getGTMSrc` and `getGA4Src` now return empty string (their callers in BaseLayout still use them but emit no-op `<script async src="">`)

- **Code:** `M3-INFRA-04`
- **Severity:** LOW
- **Discovered during:** Inspection of analytics.ts after wrapping
- **Location:** `src/lib/analytics.ts` — `getGTMSrc(_gtmId)` and `getGA4Src(_gaId)` now return `''`. `BaseLayout.astro` still uses them in `<script async src={getGTMSrc(analytics.gtm_id)} />`.
- **Description:** Pre-fix, GTM/GA4 used a 2-script pattern: an inline `<script>` with the inline payload + an `<script async src="https://www.googletagmanager.com/...">` for the loader. The async-src tag fired the network request to googletagmanager BEFORE the inline payload could check consent — bypassing the gate. Fix: moved the loader-script injection INSIDE the consent-gated payload (`document.createElement('script'); s.src = '...'; document.head.appendChild(s);`). Functions still exist for backwards compat (any external caller continues to work), but they return empty strings. Resulting HTML has `<script async src=""></script>` empty tags — harmless but cosmetically ugly.
- **Suggested next action:** TECH_DEBT — in a follow-up storefront SPEC, remove the `<script async src={getGTMSrc(...)} />` and `<script async src={getGA4Src(...)} />` tags from BaseLayout entirely (they're now no-ops). Also delete `getGTMSrc` + `getGA4Src` exports if no other callers exist (rule 21 — no orphans).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Demo tenant seeded but not visible via `v_public_tenant`

- **Code:** `M3-DATA-05`
- **Severity:** INFO
- **Discovered during:** Post-seed verification query
- **Location:** `v_public_tenant` JOIN: `JOIN storefront_config sc ON sc.tenant_id = t.id WHERE t.is_active = true AND sc.enabled = true`
- **Description:** Seed migration successfully wrote `cookie_consent` to demo tenant's `tenants.ui_config`. But `v_public_tenant` filters `WHERE storefront_config.enabled = true` and demo's storefront_config is presumably disabled (only prizma's is active for storefront purposes). So demo's seed exists in the underlying table but doesn't surface through the view. Harmless — when demo's storefront is later enabled, the seed will be available immediately.
- **Reproduction:**
  ```sql
  -- Seed exists at table level:
  SELECT slug, ui_config ? 'cookie_consent' FROM tenants WHERE slug='demo';  -- true
  -- But not at view level:
  SELECT slug FROM v_public_tenant WHERE slug='demo';  -- empty
  ```
- **Suggested next action:** DISMISS — by design. When demo storefront is activated for testing/QA, the cookie_consent seed will surface automatically.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — UserWay accessibility widget + Google Maps embed are NOT consent-gated

- **Code:** `M3-COMPLIANCE-06`
- **Severity:** LOW (informational; tenant + legal counsel decision)
- **Discovered during:** Live test criterion 9 — Reject all left these requests still firing
- **Location:** `src/layouts/BaseLayout.astro` lines 220-235 (UserWay widget), Google Maps `<iframe>` in homepage CMS block
- **Description:** Two third-party services fire on every page load regardless of cookie_consent state:
  1. **UserWay** (`cdn.userway.org` + `api.userway.org`) — accessibility widget. Sets cookies for keyboard-nav state etc. Could be argued "necessary" (legal accessibility obligation in Israel), but it is third-party data flow. Not in this SPEC's tracker_categories list.
  2. **Google Maps embed** (`maps.gstatic.com`, `maps.googleapis.com`) — store-locator iframe on homepage. Loads regardless of consent. Could be argued essential for the "where to find us" UX.
  Both are arguably necessary-by-purpose, but a strict 2024 Israeli interpretation might require them in the consent panel. Daniel + legal counsel should review.
- **Suggested next action:** NEW_SPEC (deferred) — if Daniel's legal review requires gating these, add their domains to `tracker_categories` in the cookie_consent config and wrap the script tags in BaseLayout with a consent check. Pattern is already in place; would be a 30-minute SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
