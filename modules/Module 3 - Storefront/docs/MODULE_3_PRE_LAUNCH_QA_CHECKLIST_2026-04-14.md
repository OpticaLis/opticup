# Pre-Launch QA Checklist — Localhost Execution

**Date:** 2026-04-14
**Executor:** Daniel (manual, on local machine)
**SPEC:** MODULE_3_PRE_LAUNCH_HARDENING_SPEC_2026-04-14.md §6 (QA completion)
**Tenant:** `demo` (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN `12345`) — **never** run on Prizma production data.
**Branch:** `develop` — these tests validate the 8 commits from `66acfc7` → `be4de39`.

---

## Before You Start — Environment Setup (5 min)

1. On your Windows machine:
   ```
   cd C:\Users\User\opticup
   git checkout develop
   git pull origin develop
   ```
   Confirm: `git log --oneline -1` shows `be4de39 docs(guardian+safety+qa)...` or newer.

2. Start the ERP dev server (terminal 1):
   ```
   cd C:\Users\User\opticup
   npm run dev
   ```
   Should open on `http://localhost:3000`.

3. Start the Storefront dev server (terminal 2):
   ```
   cd C:\Users\User\opticup-storefront
   git checkout develop
   git pull origin develop
   npm run dev
   ```
   Should open on `http://localhost:4321`.

4. Open Chrome. Prepare two tabs:
   - Tab 1: `http://localhost:3000` (ERP)
   - Tab 2: `http://localhost:4321/?t=demo` (Storefront, demo tenant)

5. Keep a folder ready for screenshots: `C:\Users\User\opticup-qa-2026-04-14\`

---

## How to Use This Checklist

- **Run tests in order.** Each test depends on the environment from the previous ones.
- **Fill in the checkbox + evidence for each test.** Evidence = screenshot filename or short note.
- **If something fails:** write WHAT failed (not just "failed"), stop on that row, and message me (Main Strategic).
- **If a test is ambiguous:** err on the side of FAIL with a note — I'd rather re-verify than ship a broken launch.

**Result legend:**
- `[x] PASS` — confirmed working as expected
- `[x] FAIL` — clear problem observed
- `[x] SKIP` — test not applicable in this environment (pre-defined for each skipped test below)
- `[x] POST-DEPLOY` — cannot be tested on localhost, deferred to staging/production

---

## Part A — Validate the 6 Hardening Fixes

These are targeted checks that the 6 changes from this SPEC didn't break anything. Priority: HIGH. **Do these first.**

### A1. RLS on `storefront_components` — edit a component
- **Fix under test:** commit `66acfc7` — RLS tenant-isolation.
- **Steps:**
  1. Open ERP localhost:3000, log in to **demo** tenant (PIN 12345).
  2. Go to Storefront Studio → Components.
  3. Pick any existing component, edit its name slightly (e.g., add " (QA-test)"), save.
  4. Refresh the page.
- **Expected:** Edit persisted. No console errors. Page reloads showing the new name.
- **After test:** revert the name change.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A2. RLS on `storefront_pages` — edit a page
- **Fix under test:** commit `66acfc7`.
- **Steps:**
  1. ERP → Storefront Studio → Pages.
  2. Open any existing page in edit mode, change the title slightly, save.
  3. Refresh.
- **Expected:** Saved, reloaded showing new title. No console errors.
- **After test:** revert.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A3. RLS on `storefront_reviews` — reviews visible on storefront
- **Fix under test:** commit `66acfc7` (anon_read path must still work).
- **Steps:**
  1. Open storefront localhost:4321/?t=demo in an **incognito** window (to hit as anon, not logged in).
  2. Navigate to any page that shows reviews (homepage bottom, or a product with reviews).
- **Expected:** Reviews appear normally. No 401/403 in browser console Network tab. No empty state where reviews should be.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A4. `inventory.html` loads with generic header
- **Fix under test:** commit `e04cbfe` (M3-SAAS-01, file-header comment only).
- **Steps:**
  1. ERP → Inventory module. Page loads normally.
  2. View page source (Ctrl+U). Look at the top HTML comment block.
- **Expected:** Header comment reads `Optic Up — Inventory Module` (not "Prizma Optics Inventory System"). `<title>` unchanged.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A5. `sync-watcher.js` — feature-flag gate (static verification only)
- **Fix under test:** commits `461a3c0` + `97146ce` (M3-SAAS-04 A+B).
- **Note:** sync-watcher runs as a Windows service against Dropbox folder. Full E2E test requires live Access/Excel files and is out of scope here.
- **Steps:**
  1. Open `C:\Users\User\opticup\scripts\sync-watcher.js` in any editor.
  2. Search for `6ad0781b` — should find **zero** hits.
  3. Search for `access_sync_enabled` — should find the DB gate in `async function main()`.
- **Expected:** Both checks pass.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A6. Studio shortcodes — WhatsApp + Instagram from config
- **Fix under test:** commit `43479ca` (M3-SAAS-05).
- **Steps:**
  1. ERP → Storefront Studio → Shortcodes (or wherever sticky CTA presets live in the Studio UI).
  2. Look at the "sticky" presets (WhatsApp button + Instagram button).
- **Expected:** WhatsApp number shown matches what's in `storefront_config.whatsapp_number` for demo tenant. Instagram URL matches `storefront_config.footer_config.social[type=instagram].url`. If demo has no Instagram configured, link should be empty/missing, NOT `optic_prizma`.
- **To cross-check:** switch to Prizma tenant briefly — numbers should change to Prizma's.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### A7. Studio brands — preview URL uses dynamic slug
- **Fix under test:** commit `d33a8a1` (M1-R09-01).
- **Steps:**
  1. ERP (logged into **demo** tenant) → Storefront Studio → Brands.
  2. Hover over (or right-click) any brand's "Preview" button to see the URL.
- **Expected:** URL ends with `?t=demo` (not `?t=prizma`). Clicking the preview opens the storefront for demo tenant.
- **Cross-check:** logout, login to Prizma, same action → URL ends with `?t=prizma`.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

---

## Part B — Core Launch-Readiness Smoke Tests

These are subset of the 18 ROADMAP tests that can reasonably be run on localhost. Priority: HIGH. Run after Part A passes.

### B1. Storefront loads in Hebrew (default locale, RTL)
- **Maps to ROADMAP test #15** (RTL).
- **Steps:** localhost:4321/?t=demo. Page loads in Hebrew. Layout is RTL (logo right, nav reads right-to-left, text flows RTL).
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B2. Product grid + click-through to PDP
- **Maps to ROADMAP test #3** (partial — storefront side only).
- **Steps:** Storefront home → scroll to products → click a product → product page loads with image, title, price, description.
- **Expected:** No broken images (image proxy `/api/image/...` works), no 404, no console errors.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B3. Catalog-mode WhatsApp button
- **Maps to ROADMAP test #4.**
- **Steps:** On a product page, click the WhatsApp button.
- **Expected:** Opens WhatsApp Web / app with pre-filled message containing product name + link. Number = demo tenant's WhatsApp number.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B4. Shop-mode cart + checkout (IF demo tenant is in shop mode)
- **Maps to ROADMAP test #5.**
- **Prerequisite check:** is demo tenant configured for shop mode? If catalog-only, mark **SKIP** and note.
- **Steps:** Add product to cart → cart shows items → click checkout → WhatsApp opens with cart summary.
- **Result:** `[ ] PASS` / `[ ] FAIL` / `[ ] SKIP`  **Evidence:** _____________

### B5. Language switcher (HE ↔ EN ↔ RU)
- **Maps to ROADMAP test #10** (partial — hreflang header check deferred to B13/post-deploy).
- **Steps:** Click language switcher → switch to English → page reloads in English, LTR layout. Switch to Russian → Russian text, LTR.
- **Expected:** All navigation, headings, buttons localized. No missing-translation placeholders visible.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B6. Blog posts load
- **Maps to ROADMAP test #17** (partial — migration completeness deferred to post-deploy).
- **Steps:** Storefront → Blog → pick a post → reads fully with images.
- **Expected:** No 404, images load, date + metadata present.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B7. Landing page (SuperSale / campaign)
- **Maps to ROADMAP test #6.**
- **Steps:** Visit a known campaign page URL on demo (or create one quickly in ERP → LandingPages → see it live).
- **Expected:** Page renders, products match filter, coupon/disclaimer logic visible.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B8. Out-of-stock ghosting + notify button
- **Maps to ROADMAP test #7.**
- **Steps:** Find a demo product with `quantity=0`. Open its page.
- **Expected:** Visual treatment is "ghosted" (desaturated/faded), "Notify me" button visible instead of WhatsApp CTA.
- **If no OOS product exists on demo:** SKIP with note.
- **Result:** `[ ] PASS` / `[ ] FAIL` / `[ ] SKIP`  **Evidence:** _____________

### B9. Mobile responsive (DevTools mobile view)
- **Maps to ROADMAP test #14.**
- **Steps:** Chrome DevTools → toggle device toolbar → iPhone SE (or any narrow viewport). Scroll home + product + a page.
- **Expected:** No horizontal scrollbar, touch targets adequate, text readable.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B10. Product sync (ERP → Storefront)
- **Maps to ROADMAP test #3** (full test).
- **Steps:**
  1. ERP localhost:3000, demo tenant → Inventory → add a new test product (name: "QA-test-product-2026-04-14").
  2. Wait 15 seconds (or trigger manual cache bust if ISR/cache involved on localhost).
  3. Refresh storefront → search for the product → appears.
  4. ERP → delete the product.
  5. Refresh storefront → product gone.
- **Expected:** Both add and delete propagate.
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

### B11. Console + Network hygiene sweep
- **Not a ROADMAP test — added by Strategic as a launch-readiness smoke.**
- **Steps:** With storefront open, browse ~5 pages (home, category, product, blog, landing). Watch Chrome DevTools console + network.
- **Expected:** No red console errors. No 4xx/5xx in network (except expected 404s like favicon probing).
- **Note anything weird even if not obviously broken.**
- **Result:** `[ ] PASS` / `[ ] FAIL`  **Evidence:** _____________

---

## Part C — POST-DEPLOY (deferred, NOT run on localhost)

These tests require a publicly accessible URL and/or deployed environment. They run AFTER merge-to-main but BEFORE DNS switch, against the Vercel preview at `opticup-storefront.vercel.app/?t=demo` (or similar).

Mark each as `[x] POST-DEPLOY` in this run. I (Strategic) will write a separate post-deploy checklist if/when you authorize merge.

- **C1.** SEO Validator — 100% WordPress URLs covered (ROADMAP #1). Requires deployed URL to run the `scripts/seo-check.mjs` or equivalent against.
- **C2.** Lighthouse — > 90 on Performance/Accessibility/Best Practices/SEO (ROADMAP #2). Localhost scores are unreliable (no CDN, no image optimization pipeline). Run on Vercel preview.
- **C3.** Google Rich Results Test — Schema validation (ROADMAP #18). Requires public URL.
- **C4.** ISR / Performance — data change reflected within minutes (ROADMAP #16). Requires ISR-enabled deployment; localhost dev mode renders fresh every request.

---

## Part D — Phase 7 aspirational (NOT APPLICABLE — pre-launch)

These are Phase 7 roadmap goals, NOT pre-launch requirements. Mark each `[x] SKIP — Phase 7`. Tracking them here only so the 18-test count is honest.

- **D1.** AI content: auto description + meta + alt (ROADMAP #8). Phase 6/7.
- **D2.** AI learning loop (ROADMAP #9). Phase 7.
- **D3.** Translation learning loop (ROADMAP #11). Phase 7.
- **D4.** White-label: 2 tenants with different themes + domains (ROADMAP #12). Phase 7.
- **D5.** Analytics per tenant: GA fires on Prizma, not on demo, different IDs (ROADMAP #13). Phase 7.

---

## Coverage Map — Honest Accounting

The SPEC referenced "18 tests from ROADMAP lines 400–421". Here's how this checklist maps to them:

| ROADMAP # | Topic | Covered by | Status on localhost |
|---|---|---|---|
| 1 | SEO Validator | C1 | POST-DEPLOY |
| 2 | Lighthouse | C2 | POST-DEPLOY |
| 3 | Product sync | B10 | TESTED |
| 4 | Catalog WhatsApp | B3 | TESTED |
| 5 | Shop cart/checkout | B4 | TESTED (if shop mode) |
| 6 | Landing pages | B7 | TESTED |
| 7 | OOS ghosting | B8 | TESTED |
| 8 | AI content | D1 | SKIP — Phase 7 |
| 9 | AI learning | D2 | SKIP — Phase 7 |
| 10 | i18n 3 languages | B5 | TESTED (partial — hreflang post-deploy) |
| 11 | Translation learning | D3 | SKIP — Phase 7 |
| 12 | White-label 2 tenants | D4 | SKIP — Phase 7 |
| 13 | Analytics per tenant | D5 | SKIP — Phase 7 |
| 14 | Mobile responsive | B9 | TESTED |
| 15 | RTL / LTR | B1 + B5 | TESTED |
| 16 | Performance / ISR | C4 | POST-DEPLOY |
| 17 | Blog migration | B6 | TESTED (partial — completeness post-deploy) |
| 18 | Rich Results / Schema | C3 | POST-DEPLOY |

**Pre-launch testable on localhost:** 11 tests (Part B) + 7 fix-specific (Part A) = 18 items actually executed here.
**Must defer to post-deploy:** 4 tests.
**Out of pre-launch scope:** 5 Phase-7 aspirations (not required for DNS switch).

---

## Final Report — Fill In After All Tests

**Start time:** _____________  **End time:** _____________

**Part A — Hardening fixes:** __ / 7 PASS
**Part B — Core smoke:** __ / 11 PASS (SKIPs don't count against)

**Go / No-Go verdict for merge-to-main:**
- If **ALL Part A pass + Part B ≥ 9/11 pass** → GO for merge-to-main → Part C (post-deploy) → DNS switch.
- If **any Part A fails** → NO-GO. Stop. Message me with evidence.
- If **Part B 7–8/11 pass** → borderline. Stop. We triage each fail together.
- If **Part B < 7/11 pass** → NO-GO. Back to develop work.

**Any unexpected issue not in the checklist:** ____________________________________________

**Screenshots / evidence folder:** `C:\Users\User\opticup-qa-2026-04-14\`

**Next action:** message Strategic (me) with the filled-in checklist path + verdict.

---

**End of checklist.** Estimated total runtime: 45–60 minutes including environment setup.
