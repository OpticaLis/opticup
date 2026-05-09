# SPEC — M3_COOKIE_CONSENT_OPT_IN

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** Privacy compliance + UX feature
**Severity:** MEDIUM (compliance — not customer harm, but legal exposure under Israeli regulation 2024)
**Closes:** REC-SITE-010

---

## 1. Goal

Implement **Opt-In cookie consent** on the public storefront in compliance with the Israeli 2024 amendment to the Privacy Protection Act. After this SPEC:

1. **No tracking script fires until the user explicitly consents.** Google Analytics, Google Tag Manager, Facebook Pixel, Hotjar, TikTok Pixel — all gated behind consent.
2. **A banner appears on first visit** with 3 buttons: Accept all / Reject all / Customize.
3. **The choice persists** across visits (cookie + localStorage).
4. **A user can change their choice later** via a footer link "ניהול קוקיז".
5. **UTMs continue to work** — they are URL-level, not cookie-level. No impact on lead attribution.

Daniel-confirmed: option #1 (strict Opt-In, all trackers off until consent). Accepts the analytics-data tradeoff for legal compliance and platform-level consent-mode-v2 alignment.

---

## 2. Background — verified live 2026-05-08

### Current tracker inventory

Per `src/lib/analytics.ts` (verified by SPEC author):

- **Google Tag Manager** — `googletagmanager.com/gtm.js`
- **Google Analytics 4** — `gtag('config', '...')`
- **Facebook Pixel** — `connect.facebook.net/en_US/fbevents.js` + `fbq('track', 'PageView')`
- **Hotjar** — `static.hotjar.com/c/hotjar-...js`
- **TikTok Pixel** — `tiktok_pixel_id` field exists in tenant config

All 5 trackers fire **unconditionally on page load** today via `BaseLayout.astro`. No consent gate.

### Current cookie banner: NONE

### Israeli regulation 2024 (תיקון לחוק הגנת הפרטיות)

Key requirements:
1. Explicit, informed consent before non-essential cookies are set.
2. Opt-In (not Opt-Out): cookies must NOT be set before user acts.
3. Granularity: user can accept/reject by category (analytics, marketing, etc.).
4. Easy revocation: user can change consent later as easily as they gave it.
5. Record of consent: timestamp + version of policy at time of consent (for audit).

### What this SPEC does NOT do

- Does NOT touch UTM handling (URL-level, not cookie-level — already explained to Daniel and confirmed).
- Does NOT touch lead-intake / form submissions / Make scenarios (server-side, no consent dependency).
- Does NOT touch operational cookies (session, CSRF, language preference) — these are "essential" by category and don't require consent.
- Does NOT add a Hebrew-law-firm-reviewed copy block. The banner copy is generic-but-correct; Daniel may want a lawyer to review the final wording before peace-of-mind.

---

## 3. SaaS-clean design

### Tenant-config-driven

The banner copy + tracker IDs come from `tenants.ui_config.cookie_consent` JSON. Format:

```json
{
  "enabled": true,
  "version": "v1",
  "categories": {
    "necessary": { "always_on": true, "label_he": "הכרחי", "label_en": "Necessary", "label_ru": "Необходимые" },
    "analytics": { "default": false, "label_he": "אנליטיקה", "label_en": "Analytics", "label_ru": "Аналитика" },
    "marketing": { "default": false, "label_he": "שיווק", "label_en": "Marketing", "label_ru": "Маркетинг" }
  },
  "tracker_categories": {
    "google_analytics": "analytics",
    "google_tag_manager": "analytics",
    "facebook_pixel": "marketing",
    "hotjar": "analytics",
    "tiktok_pixel": "marketing"
  },
  "policy_url": "/privacy/"
}
```

**Why SaaS-clean:** future tenant onboarding requires zero code changes for the consent UI. Each tenant sets their own categories, tracker IDs, and copy via tenant config.

### Storage

- **Cookie:** `cookie_consent` (1 year TTL, SameSite=Lax). Stores: `{version, accepted_at, categories: {analytics, marketing}}`.
- **localStorage mirror:** same data — used for fast reads on subsequent pages without parsing cookie.

### Categories chosen for prizma launch

- **Necessary** — always on (session, language).
- **Analytics** — Google Analytics, Google Tag Manager, Hotjar.
- **Marketing** — Facebook Pixel, TikTok Pixel.

User can accept all, reject all (only Necessary stays), or pick per-category.

### Version-bump revocation

If `tenants.ui_config.cookie_consent.version` is bumped (e.g. `v1` → `v2`) — **all existing user consents become invalid** and the banner re-appears. Used when categories or third parties change materially.

---

## 4. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. Live site fires GA + FB + Hotjar without consent (current bad state):
curl -sL "https://www.prizma-optic.co.il/" -A "Mozilla/5.0" \
  | grep -oE 'googletagmanager|connect\.facebook\.net|hotjar|tiktok'
# expected: at least 3 of the 4 strings present (current trackers fire unconditionally)

# 2. analytics.ts has 5 tracker functions exported (no consent guard):
grep -E "^export function (getGTM|getGA|getFB|getHotjar|getTikTok)" \
  opticup-storefront/src/lib/analytics.ts
# expected: 5 matching exports

# 3. tenants.ui_config does NOT yet have cookie_consent key for prizma:
# Supabase MCP: SELECT ui_config ? 'cookie_consent' FROM tenants WHERE slug='prizma';
# expected: false

# 4. No CookieBanner component exists yet:
ls opticup-storefront/src/components/CookieBanner.astro 2>&1
# expected: file not found
```

If any check deviates → STOP and reconcile.

---

## 5. Scope

### In scope

**A. DB seed: tenants.ui_config.cookie_consent**

Add the JSON object from §3 to prizma + demo tenant rows. Categories per §3. Demo gets the same shape with placeholder copy.

**B. New component: `src/components/CookieBanner.astro`**

- Reads `tenant.storefront.ui_config.cookie_consent` from tenant config.
- If consent already given (cookie + version match) → renders nothing.
- Otherwise → renders fixed-position banner at bottom of page with:
  - Heading: configurable per tenant (default Hebrew: "הגדרות פרטיות וקוקיז")
  - Body: short paragraph + link to `/privacy/`
  - 3 buttons: "אשר הכל" / "דחה הכל" / "התאמה אישית"
  - Customize-mode reveals checkboxes per category (Necessary checked + locked, Analytics + Marketing toggleable).
- Writes choice to cookie + localStorage.
- Dispatches a `consent-changed` window event with the choice payload.

**C. New helper: `src/lib/consent.ts`**

- `getConsent(): { analytics: boolean; marketing: boolean; necessary: true } | null` — reads cookie/localStorage.
- `setConsent(choice)` — writes both, dispatches event.
- `hasConsent(category)` — boolean check used by tracker loaders.
- `revokeConsent()` — clears state, fires event, banner re-appears on next page load.

**D. Modify `src/lib/analytics.ts`**

Each tracker function gets a consent guard. Pseudocode:

```typescript
export function getGAScript(gaId: string): string {
  // Wrap in a window-event listener that only fires when consent.analytics is true.
  return `
    (function() {
      function loadGA() {
        ${existingGAScript}
      }
      if (window.__consent && window.__consent.analytics) loadGA();
      else window.addEventListener('consent-changed', function(e) {
        if (e.detail && e.detail.analytics) loadGA();
      }, { once: true });
    })();
  `;
}
```

Same pattern for `getGTMScript`, `getFBPixelScript`, `getHotjarScript`, `getTikTokScript` — each guarded by its category from §3.

**E. Modify `src/layouts/BaseLayout.astro`**

- Read `tenant.storefront.ui_config.cookie_consent` once.
- Inject a small **inline pre-script** at the top of `<head>` that reads consent from cookie/localStorage and sets `window.__consent` BEFORE any tracker scripts evaluate. (Avoids race condition.)
- Render `<CookieBanner />` after `<main>`.
- Keep all existing tracker `<script>` tags in place; they're now guarded by §D.

**F. New footer link: "ניהול קוקיז"**

In `src/components/Footer.astro` — add a link near the privacy/terms links:
- HE: "ניהול קוקיז"
- EN: "Cookie preferences"
- RU: "Настройки cookie"

Click → calls `revokeConsent()` + reloads page → banner re-appears.

**G. Add /privacy/ page section about cookies**

Brief paragraph linking the current consent system. Daniel may want a lawyer to expand. **Initial copy: 1-2 sentences explaining categories + how to revoke.** Daniel approves before SPEC closes.

### Out of scope

- Anything related to UTM handling (already non-cookie-based).
- Server-side cookies (session, auth) — these are necessary, no consent needed.
- Lawyer-reviewed final copy (Daniel optionally engages legal counsel separately).
- Audit log of who consented when (not legally required for this scale; could be added later).
- Consent Mode v2 for Google Ads (separate feature; this SPEC enables the foundation, GTM-side wiring later).

### Whitelist of write paths

**Storefront repo (`opticup-storefront`):**
1. CREATE `src/components/CookieBanner.astro`
2. CREATE `src/lib/consent.ts`
3. MODIFY `src/lib/analytics.ts` (add consent guards to 5 tracker functions)
4. MODIFY `src/layouts/BaseLayout.astro` (pre-script + banner injection)
5. MODIFY `src/components/Footer.astro` (cookie-preferences link)
6. MODIFY `src/lib/tenant.ts` (extend `TenantConfig` type to include `cookie_consent`)

**ERP repo (`opticup`):**
7. CREATE `modules/Module 3 - Storefront/docs/specs/M3_COOKIE_CONSENT_OPT_IN/migrations/2026_05_08_cookie_consent_seed_up.sql`
8. CREATE `modules/Module 3 - Storefront/docs/specs/M3_COOKIE_CONSENT_OPT_IN/migrations/2026_05_08_cookie_consent_seed_down.sql`
9. CREATE `EXECUTION_REPORT.md` + `FINDINGS.md` in SPEC folder
10. UPDATE `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`
11. APPEND `roles/site-overseer/DECISIONS_LOG.md`

**Supabase production:**
12. APPLY 2 Level-2 UPDATEs: prizma + demo `tenants.ui_config` to add `cookie_consent` key.

---

## 6. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 4 sub-checks PASS |
| 2 | `tenants.ui_config.cookie_consent` populated for prizma + demo | Supabase query | both have the JSON object per §3 |
| 3 | `CookieBanner.astro` exists + reads tenant config | grep + file existence | file present, references `tenant.storefront.ui_config.cookie_consent` |
| 4 | `consent.ts` exports getConsent/setConsent/hasConsent/revokeConsent | grep | 4 named exports |
| 5 | All 5 trackers in analytics.ts guarded by consent check | grep | 5/5 functions wrap their existing logic in `__consent` / `consent-changed` listener |
| 6 | BaseLayout pre-script sets `window.__consent` before trackers | view rendered HTML | inline script reading cookie/localStorage appears before any `<script src="...gtm/ga/fb/hotjar/tiktok">` |
| 7 | Footer has cookie-preferences link in 3 langs | grep | "ניהול קוקיז" / "Cookie preferences" / "Настройки cookie" present |
| 8 | Live test 1 — fresh visit shows banner | Chrome incognito → home page | banner visible at bottom, 3 buttons present |
| 9 | Live test 2 — clicking "Reject all" closes banner + no trackers fire | Network tab inspect | 0 requests to googletagmanager/google-analytics/facebook.net/hotjar/tiktok |
| 10 | Live test 3 — clicking "Accept all" closes banner + all trackers fire | Network tab inspect | requests to all 5 tracker domains present |
| 11 | Live test 4 — choice persists on reload (banner does not re-appear) | reload | no banner |
| 12 | Live test 5 — clicking "ניהול קוקיז" in footer revokes + banner re-appears | click + reload | banner visible again |
| 13 | UTM passthrough unaffected | open `/?utm_source=test&utm_campaign=spec` → check that lead-form sessionStorage has the UTM | UTMs present in storage regardless of consent state |
| 14 | `npm run build` succeeds | exit code | 0 |
| 15 | Storefront commit + ERP commit | git log | one each, descriptive messages |
| 16 | Both repos clean | git status | nothing to commit |
| 17 | Integrity gate clean (ERP) | npm run verify:integrity | exit 0 |
| 18 | Vercel deploy READY for new main | Vercel MCP | state=READY, target=production |

---

## 7. Autonomy Envelope

**Executor MAY autonomously:**
- Apply the 2 migrations via Supabase MCP (Level 2 UPDATEs on prizma + demo). Authorized.
- Modify the 6 storefront source files per §5 whitelist.
- Run `npm run build` to verify.
- Run all 5 live tests (Step 5 success criteria) using Chrome MCP / Playwright.
- Commit + push BOTH repos to develop ONCE each.
- Open the GitHub PR for storefront → main (Daniel merges).

**Executor MUST stop and report:**
- More than 5 trackers detected in analytics.ts (premise: 5) → STOP, reconcile.
- Banner CSS conflicts with existing layout → STOP, propose narrower selector.
- Consent guard breaks an existing tracker that uses non-standard init pattern → STOP, document, fix.
- Live test 9 (Reject all → no trackers) shows ANY tracker firing → STOP, gate is broken.
- Live test 13 (UTMs unaffected) shows UTM data missing → STOP, accidental side-effect.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Hardcode any tenant-specific copy in the banner — all from `cookie_consent` config.
- Skip live tests 8-13.
- Touch UTM handling code, lead-intake EF, or Make scenarios.
- Add a fourth/fifth category beyond Necessary/Analytics/Marketing without Daniel approval.

---

## 8. Stop-on-Deviation Triggers

In addition to global:
- Banner Lighthouse score regression > 5 points (Performance/Accessibility) → STOP, narrow CSS.
- localStorage write fails (quota / disabled) → fall back to cookie-only and continue, log INFO finding.
- A tracker we don't yet know about discovered during testing → STOP, add to category mapping.

---

## 9. Expected Final State

**On Supabase production:**
- prizma + demo `tenants.ui_config.cookie_consent` populated.

**On disk (storefront commit X, ERP commit Y):**
- Banner component + consent helper + 5 guarded trackers + footer link + privacy paragraph.
- ERP retro + 2 migration files.

**On live storefront (post-deploy):**
- First-time visitor: banner appears at bottom; no trackers fire until choice.
- Returning visitor with stored consent: no banner, trackers fire per their choice.
- User clicks "ניהול קוקיז": banner re-appears, can change their mind.

**Compliance status:** Israeli 2024 regulation: COMPLIANT for the 5 known trackers. Future trackers must be added to the category mapping in tenant config; the banner/guard infrastructure is reusable.

---

## 10. Commit Plan

**Storefront commit:**
```
feat(storefront): cookie consent Opt-In (closes REC-SITE-010 — Israel 2024)

Adds GDPR-style + Israeli-2024-compliant cookie consent banner.

Architecture:
- Tenant-config-driven: tenants.ui_config.cookie_consent defines categories,
  tracker→category mapping, banner copy. SaaS-clean for future tenants.
- src/lib/consent.ts — get/set/has/revoke helpers, cookie + localStorage.
- src/components/CookieBanner.astro — fixed-bottom banner with 3 buttons +
  customize-mode per-category checkboxes.
- src/lib/analytics.ts — all 5 tracker scripts (GTM, GA, FB Pixel, Hotjar,
  TikTok) wrapped in consent-guard listener; only fire after explicit
  category consent.
- BaseLayout pre-script sets window.__consent before tracker scripts
  evaluate — avoids race conditions.
- Footer adds "ניהול קוקיז" / "Cookie preferences" / "Настройки cookie"
  link to revoke and re-show banner.

Validated:
- Reject all → 0 tracker requests in network tab.
- Accept all → all 5 trackers fire.
- UTM passthrough unaffected (URL-level, not cookie-level).
- Choice persists across reloads, revocable from footer.

Out of scope:
- Lawyer-reviewed final copy (Daniel may engage legal counsel separately).
- Consent Mode v2 wiring for Google Ads (foundation laid, GTM-side later).
```

**ERP commit:**
```
chore(spec): close M3_COOKIE_CONSENT_OPT_IN

Closes REC-SITE-010. EXECUTION_REPORT + FINDINGS in SPEC folder.
2 Level-2 migrations applied to prizma + demo (tenants.ui_config.cookie_consent
seed). HANDOFF + DECISIONS_LOG updated.
```

---

## 11. Methodology — live tests (criteria 8-13)

The executor MUST run these in real Chrome (MCP / Playwright), not curl. Curl can't trigger the banner JS. Test sequence:

```
1. Open Chrome incognito → https://www.prizma-optic.co.il/ → screenshot, banner visible
2. Open DevTools Network tab → filter to "googletagmanager|google-analytics|facebook|hotjar|tiktok"
3. Click "Reject all" → network tab still shows 0 hits → screenshot
4. Reload → no banner appears (choice persisted) → screenshot
5. Click footer "ניהול קוקיז" → page reloads → banner re-appears → screenshot
6. Click "Accept all" → network tab now shows 5 tracker requests → screenshot
7. Visit /?utm_source=test&utm_campaign=spec → open lead-form sessionStorage in DevTools → confirm UTMs stored regardless of consent state
```

Each screenshot saved to SPEC folder for evidence. EXECUTION_REPORT cites them.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- No prior cookie consent implementation in storefront. ✓
- `tenants.ui_config` schema is open jsonb — adding `cookie_consent` key is non-breaking. ✓
- `analytics.ts` has 5 tracker functions, all in one file — easy unified guard. ✓
- BaseLayout has injection points for both `<head>` (pre-script) and after-`<main>` (banner). ✓
- L-PROJECT-001 (no decorative real-looking values): banner copy is generic-but-correct, no fake names/numbers. ✓
- L-PROJECT-002 (jsonb writes require type preservation): the migration writes a jsonb object via `jsonb_build_object`, not text-replace. Type-safe. ✓
- SaaS litmus test: banner is config-driven; future tenant requires only DB row + tracker IDs. ✓

**0 collisions.**

---

## 13. Lessons already incorporated

- `feedback_audit_real_world_check.md` — this finding was correctly tagged MEDIUM (legal-exposure compliance, not direct customer harm). Severity matches reality.
- `feedback_always_saas_clean.md` — this SPEC chooses tenant-config-driven over hardcoded copy.
- L-PROJECT-002 — DB writes use `jsonb_build_object`, not text-replace.
- Step 0 + live tests 8-13 prove the gate WORKS, not just compiles.

---

## 14. Estimated effort

- 3-5 hours executor wall time. Component + helper + 5 tracker guards + banner CSS/i18n + tests.
- One Daniel interaction: PR-merge button click.
- Optional Daniel follow-up: legal review of banner copy (out-of-band, not blocking).

---

## 15. Definition of Done

All 18 success criteria pass. Two atomic commits. Both repos clean. Live storefront verified post-deploy: banner appears for new visitors, trackers gate per choice, footer revoke works, UTMs unaffected. Site Overseer HANDOFF marks REC-SITE-010 CLOSED.

---

*End of SPEC.*
