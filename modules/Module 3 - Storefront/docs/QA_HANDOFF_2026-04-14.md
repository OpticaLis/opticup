# Module 3 — QA Handoff Runbook
**Date produced:** 2026-04-15 (Close-Out SPEC execution)
**For:** Daniel (localhost QA before DNS switch authorization)
**Produced by:** opticup-executor (Bounded Autonomy run)
**Module 3 state:** Code-complete on develop — all Close-Out commits landed
**This file replaces:** `QA_REPORT_2026-04-14.md` (18/18 BLOCKED: ENVIRONMENT — that was a Cowork cloud session)

---

## Purpose

This runbook tells Daniel exactly what to run, in what order, on his local machine
to satisfy the 18 ROADMAP QA gates that were blocked during the overnight Cowork
execution session. When all 18 pass, Daniel is authorized to:

1. Merge `develop → main` in **both repos** (`opticup` + `opticup-storefront`)
2. Deploy storefront to Vercel (main branch autodeploys)
3. Switch DNS for `www.prizma-optic.co.il` → Vercel IP

This is a personal runbook. Daniel runs these steps himself, on his desktop.
No tool can run them for him.

---

## Part 1 — Prerequisites Checklist

Run through this entire checklist before starting any QA test. If any item is
not green, fix it first.

### 1.1 Machine and Branch

```bash
# In the ERP repo (opticup)
cd C:\Users\User\opticup
git branch            # must show: * develop
git status            # must show: clean
git log --oneline -3  # latest commit must be: ba81a3b (docs(guardian): ...)
git pull origin develop  # get any stragglers
```

```bash
# In the Storefront repo (opticup-storefront)
cd C:\Users\User\opticup-storefront
git branch            # must show: * develop
git status            # must show: clean
git pull origin develop
```

### 1.2 Local ERP Dev Server

```bash
cd C:\Users\User\opticup
# ERP has no build step — open directly in browser
# Confirm you can open: http://localhost:3000 (or the static-file server you use)
# Expected: login screen loads with no console errors
```

If you use a local HTTP server (e.g., `npx serve .` or VS Code Live Server):

```bash
npx serve . -p 3000
```

### 1.3 Local Storefront Dev Server

```bash
cd C:\Users\User\opticup-storefront
npm install      # if first run after pulling
npm run dev      # starts Astro dev server
```

Expected: `http://localhost:4321` loads the demo tenant storefront.
Confirm at startup: no TypeScript errors in terminal. If errors — fix before proceeding.

### 1.4 Demo Tenant Credentials

| Setting | Value |
|---------|-------|
| Tenant | אופטיקה דמו (demo) |
| Tenant slug | `demo` |
| Tenant UUID | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| ERP PIN | `12345` |
| Storefront URL (local) | `http://localhost:4321/?t=demo` |
| Storefront URL (deployed) | `https://demo.opticalis.co.il` (after main merge) |

**Do NOT run QA tests on the Prizma tenant.** Use demo only.

### 1.5 Supabase Connection

Confirm Supabase is reachable:
```bash
# Simple connectivity test (from storefront dev server output)
# You should see DB queries succeed as pages load. No "connection refused" errors.
```

### 1.6 Contact Page Pre-Check (Criterion #11)

Before starting the full suite, run this one separately since the SPEC deferred it:

```bash
# Replace with your deployed or localhost URL as appropriate
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/צרו-קשר/
# Expected: 200
# If 500: note the server-side error in the Astro terminal. Report the exact error message.
```

---

## Part 2 — The 18 ROADMAP QA Tests

These are the 18 tests from `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md §QA Phase`.
Run them on demo tenant at `http://localhost:4321/?t=demo` (or your deployed staging URL).

Mark each: ✅ PASS | ❌ FAIL (include error) | ⏭️ SKIP (with reason)

---

### Test 1 — SEO Validator: 100% WordPress URLs covered

**Where to look:** `modules/Module 3 - Storefront/seo-audit/url-inventory.md` lists all WP URLs.

**Steps:**
1. Open the URL inventory: `seo-audit/url-inventory.md`
2. For each WP URL listed, confirm either:
   - The slug exists as a page in `storefront_pages` table, OR
   - A Vercel redirect in `vercel.json` sends it to the correct target
3. Spot-check 5 critical Hebrew URLs (e.g., `/קופח-כללית/`, `/vintage-frames/`, `/about-us/`, `/blog/`, the homepage)

**Expected:** Every checked URL either resolves to a page or redirects cleanly.
**Pass criterion:** Zero 404s on critical SEO URLs.

---

### Test 2 — Lighthouse: > 90 on all 4 metrics

**Steps:**
1. Open Chrome DevTools → Lighthouse tab
2. Run audit on `http://localhost:4321/?t=demo` (or deployed staging URL)
3. Check: Performance, Accessibility, Best Practices, SEO — all must be ≥ 90

**Expected:** All 4 scores ≥ 90.
**Note:** Lighthouse requires a URL accessible to Chrome (localhost works if DevTools is on same machine).

---

### Test 3 — Product sync: ERP → Storefront

**Steps:**
1. Log into ERP at `http://localhost:3000` with demo tenant PIN `12345`
2. Add a new test product (any brand, any model name like "QA-Test-Product-001")
3. Set storefront_status = `catalog`
4. Open `http://localhost:4321/?t=demo` and navigate to catalog
5. Confirm the product appears within ~30 seconds (Supabase real-time or ISR)
6. Back in ERP: set storefront_status = `hidden`
7. Refresh storefront — confirm product disappears

**Expected:** Product appears, then disappears, with no manual cache clearing.

---

### Test 4 — Catalog mode: WhatsApp button

**Steps:**
1. Navigate to any catalog-mode product on `localhost:4321/?t=demo`
2. Click the WhatsApp button
3. Confirm the WhatsApp link opens with a pre-filled message mentioning the product name

**Expected:** WhatsApp link = `https://wa.me/972XXXXXXXXX?text=...` with correct demo tenant phone number.
**Not expected:** Link to Prizma's phone number (that would be a tenant-hardcoding bug).

---

### Test 5 — Shop mode: cart + checkout WhatsApp

**Steps:**
1. Set at least one product to shop mode in ERP
2. Navigate to it on the storefront
3. Add to cart
4. Proceed to checkout
5. Confirm checkout sends WhatsApp summary with product list

**Expected:** Cart accumulates items. Checkout message lists items + total + demo tenant contact info.

---

### Test 6 — Landing pages: ERP → live page

**Steps:**
1. In ERP, open the Landing Pages module
2. Create a new landing page for demo tenant (choose a brand filter)
3. Copy the generated URL
4. Open it on `localhost:4321/?t=demo`
5. Confirm: page loads, products shown match the ERP filter

**Expected:** Landing page renders with the products you filtered for, using demo tenant branding.

---

### Test 7 — Ghosting: out-of-stock product

**Steps:**
1. Set a product's quantity to 0 in ERP (or find an existing zero-stock product)
2. Open its storefront product page
3. Confirm: product is "ghosted" (visual dimming or overlay)
4. Confirm: "Notify me when available" button appears in place of WhatsApp CTA

**Expected:** Zero-stock products ghost correctly. Button present.

---

### Test 8 — AI content: new product auto-description

**Steps:**
1. Add a new product in ERP with minimal info (brand + model name)
2. Trigger AI description generation (AI Content tab in ERP)
3. Confirm: Hebrew description + meta title + meta description generated
4. Check that alt text was also set if an image was attached

**Expected:** AI-generated content appears, saved to `ai_content` table, visible on storefront product page.

---

### Test 9 — AI learning: correction loop

**Steps:**
1. Open a product's AI description in ERP
2. Make a correction to the generated text (edit and save)
3. Generate a description for a similar product
4. Confirm the correction vocabulary/style is reflected in the new generation

**Expected:** Corrections are saved to `ai_content_corrections`. Subsequent generations for similar products incorporate the correction.
**Note:** This test is qualitative — verify the correction was saved in the DB, not necessarily that the AI "learned" immediately.

---

### Test 10 — i18n: 3 languages + switcher

**Steps:**
1. Open `http://localhost:4321/?t=demo` (Hebrew, default)
2. Confirm Hebrew text renders correctly (RTL layout)
3. Switch to English using the language switcher
4. Confirm English translation present on product pages
5. Switch to Russian
6. Confirm Russian translation present
7. Check page `<html lang="...">` matches the selected language
8. Check `<link rel="hreflang">` tags in page source

**Expected:** All 3 languages work. Language switcher updates URL/cookie and re-renders.

---

### Test 11 — Translation learning: correction loop

**Steps:**
1. Open a product's English translation in ERP Translations tab
2. Correct a mistranslation
3. Run bulk translate for a similar product
4. Check `translation_corrections` table has your correction entry

**Expected:** Correction saved. Similar terms in subsequent translations reflect the fix.
**Note:** Qualitative check — verify the `translation_corrections` row exists in DB.

---

### Test 12 — White-label: 2 tenants, different everything

**Steps:**
1. Navigate to demo tenant storefront: `http://localhost:4321/?t=demo`
2. Note: logo, colors, phone number, WhatsApp number
3. Navigate to Prizma storefront: `http://localhost:4321/?t=prizma` (or `www.prizma-optic.co.il` if live)
4. Confirm: completely different branding, phone, products

**Expected:** Zero bleed between tenants. Demo shows demo config, Prizma shows Prizma config.
**Critical:** If demo shows any Prizma-specific content (phone number, Hebrew store name literal "אופטיקה פריזמה"), that is a FAIL — report immediately.

---

### Test 13 — Analytics: GA events per tenant

**Steps:**
1. Open Chrome DevTools → Network tab → filter for "google-analytics" or "gtm"
2. Load `http://localhost:4321/?t=demo`
3. Click a product, click WhatsApp
4. Confirm: GA events fire with demo tenant's GA ID (not Prizma's)
5. Confirm: events `view_product`, `whatsapp_click` appear in network log

**Expected:** Events fire with the correct tenant's analytics IDs from their `storefront_config.analytics` JSONB.

---

### Test 14 — Mobile: all pages responsive

**Steps:**
1. In Chrome DevTools, toggle device simulation (iPhone 12 or similar)
2. Navigate through: homepage, product listing, product detail, blog post, landing page
3. Check: no horizontal overflow, touch targets are usable (≥ 44px), text readable

**Expected:** All pages render correctly on 375px-wide viewport. No broken layouts.

---

### Test 15 — RTL/LTR: Hebrew RTL, English LTR

**Steps:**
1. Load Hebrew storefront — confirm `dir="rtl"` on `<html>` or body, text right-aligned
2. Switch to English — confirm `dir="ltr"` applied, text left-aligned
3. Check that navigation, buttons, and card layouts mirror correctly between RTL and LTR

**Expected:** Correct directionality per language. No mixed-direction elements.

---

### Test 16 — Performance: ISR/revalidation

**Steps:**
1. Edit a product's description in ERP
2. Wait up to 5 minutes (ISR revalidation window)
3. Reload the product page on the storefront (hard refresh, Ctrl+Shift+R)
4. Confirm the new description appears without manual deployment

**Expected:** Changes propagate to storefront within the configured ISR revalidation window.
**Note:** If the dev server is running (`npm run dev`), it may pick up changes immediately via SSR. That also passes.

---

### Test 17 — Blog: all posts, correct URLs, images load

**Steps:**
1. Navigate to `http://localhost:4321/?t=prizma/blog` (or demo blog)
2. Open 5 blog posts — confirm titles, content, and images load
3. Check blog post URLs match the WordPress URL structure (same slugs)
4. Confirm no 404s for blog images

**Expected:** Blog renders correctly. Images load from Supabase Storage (not `prizma-optic.co.il/wp-content/`).
**Special check:** Run the redirect validator if available: `cd opticup-storefront && node scripts/validate-redirects.mjs`

---

### Test 18 — Schema markup: Google Rich Results

**Steps:**
1. Open `https://search.google.com/test/rich-results` in a browser
2. Enter a publicly accessible storefront URL (after main merge, use Vercel preview URL or `demo.opticalis.co.il`)
3. Run the test
4. Confirm: LocalBusiness schema found, no errors

**Note:** This test requires a publicly accessible URL (not localhost). If running before main merge, use a Vercel preview URL from the storefront deploy preview.
**Expected:** Rich Results Test shows structured data detected, zero errors.

---

## Part 3 — Additional Verification Checks (Beyond 18 ROADMAP Tests)

These are not in the ROADMAP QA list but are high-value sanity checks:

### 3.1 Contact Page 500 Check (Criterion #11 from SPEC)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/צרו-קשר/
# Expected: 200
```

If you get 500: check Astro server terminal for the error, then report with the full stack trace.

### 3.2 translate-content Edge Function Smoke Test (Criterion #14 from SPEC)

This was verified during the overnight run, but if you want to re-confirm:

```bash
curl -s -X POST \
  "https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/translate-content" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkxOTk2MTMsImV4cCI6MjAyNDc3NTYxM30.Np6eiCBHOV2XDxMHb6C_8bGMKfWWkMKcpPGrUKUxaHc" \
  -d '{"text":"uyלמשפחה כולהggg - מסגרות פרמיום","target_lang":"en","tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb"}' | python3 -m json.tool
```

Expected: JSON response with `"translation"` field containing clean English text — no backtick fences, no "Here is:" preamble, no markdown wrappers.

### 3.3 HaveIBeenPwned Toggle Reminder (M6-AUTH-01, HIGH alert)

This is not a code change — it requires a manual toggle in the Supabase dashboard.

Steps:
1. Log in to https://supabase.com/dashboard → Project: Optic Up
2. Navigate to: Authentication → Providers → Email → Advanced Settings
3. Enable: "Check if password is in breached database" (HaveIBeenPwned)
4. Save

Until this is done, M6-AUTH-01 remains an active HIGH alert.

---

## Part 4 — Results Recording Template

Copy this table to a new file `QA_RESULTS_DANIEL_[DATE].md` and fill it in:

```markdown
# QA Results — Daniel — [DATE]
**Machine:** Windows desktop
**Branches:** opticup develop @ ba81a3b / opticup-storefront develop @ [hash]
**Tenant:** demo (UUID 8d8cfa7e-ef58-49af-9702-a862d459cccb)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | SEO Validator: 100% WP URLs covered | | |
| 2 | Lighthouse ≥ 90 all metrics | | |
| 3 | Product sync ERP → Storefront | | |
| 4 | Catalog mode WhatsApp button | | |
| 5 | Shop mode cart + checkout | | |
| 6 | Landing pages ERP → live | | |
| 7 | Ghosting: out-of-stock | | |
| 8 | AI content: new product | | |
| 9 | AI learning: correction loop | | |
| 10 | i18n 3 languages + switcher | | |
| 11 | Translation learning | | |
| 12 | White-label 2 tenants | | |
| 13 | Analytics GA per tenant | | |
| 14 | Mobile responsive | | |
| 15 | RTL/LTR correct | | |
| 16 | ISR revalidation | | |
| 17 | Blog posts URLs images | | |
| 18 | Schema Rich Results | | |
| C11 | Contact page /צרו-קשר/ returns 200 | | |
| C14 | translate-content no wrappers | | |

**PASS:** __/18
**FAIL:** __/18
**SKIP:** __/18

## Failures (detail here)
[Describe each FAIL with: test #, expected, actual, any error messages]

## Decision
[ ] All clear — proceed to merge and DNS switch
[ ] FAIL items found — describe fix needed before DNS switch
```

---

## Part 5 — Post-QA Actions (when all tests pass)

### 5.1 Merge to main — ERP repo

```bash
cd C:\Users\User\opticup
git checkout main
git merge develop
git push origin main
git checkout develop
```

### 5.2 Merge to main — Storefront repo

```bash
cd C:\Users\User\opticup-storefront
git checkout main
git merge develop
git push origin main
git checkout develop
```

### 5.3 Verify Vercel Deploy

After pushing storefront main:
1. Check Vercel dashboard → deployment triggered automatically
2. Wait for "Ready" status (usually 2–4 minutes)
3. Test `https://prizma-optic.co.il` is still live (via Vercel custom domain or staging URL)

### 5.4 DNS Switch

This is Daniel's call — only after QA passes AND Vercel deploy is live.

```
Point www.prizma-optic.co.il → Vercel IP or CNAME
Point prizma-optic.co.il → Vercel or redirect to www
```

DNS TTL: allow up to 24 hours for full propagation, but Cloudflare DNS typically propagates in minutes.

### 5.5 Enable HaveIBeenPwned (if not done during QA)

See Section 3.3 above.

---

## Part 6 — Known Remaining Alerts After DNS Switch

Once DNS is switched, these items remain open (from `GUARDIAN_ALERTS.md`):

| ID | Priority | Item | Action |
|----|----------|------|--------|
| M6-AUTH-01 | HIGH | HaveIBeenPwned check disabled | Enable toggle in Supabase Auth dashboard |
| M1-R12-01 | HIGH | 7 oversized non-storefront files (debt) | Split on next touch |
| M1-R12-02 | HIGH | 14 oversized storefront files (debt) | Split on next touch |
| M8-XMOD-01 | HIGH | 4 cross-module table boundary violations | Create contract functions (Module 8 scope) |
| M8-XMOD-05 | HIGH | No contract wrapper for inventory_logs | Create audit-queries.js |
| M4-DOC-04 | HIGH | MODULE_MAP.md documents old sessionStorage key | Surgical edit needed |
| M3-SAAS-09 | INFO | 3 migration scripts hardcode Prizma UUID | Parameterize via env var |
| M5-DEBT-05 | INFO | sync-watcher.js 516 lines | Split on next touch |

**None of the above block DNS switch.** They are tracked for future work.

---

*End of QA Handoff Runbook. Good luck, Daniel.*
*Generated by: opticup-executor (Close-Out SPEC, 2026-04-15)*
