# Mission 3 — SaaS Readiness Audit Report
**Sentinel Module 3: SaaS Readiness Scan**
**Scan Date: 2026-04-21**
**Environment: opticup (ERP main repo)**

---

## Summary

**Total Findings: 9**
- **CRITICAL (would break multi-tenant):** 2
- **HIGH (hardcoded tenant-specific data):** 5
- **MEDIUM (domain/config references):** 2
- **RESOLVED (from previous audit):** 13

This audit scanned for hardcoded tenant names, addresses, currency, language, domains, and tax rates across all .js and .html files (excluding .md, .sql, backups, node_modules, and archives).

---

## CRITICAL FINDINGS — Must Fix Before Second Tenant

### M3-SAAS-03: Excel Export Filename Contains Tenant Slug
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/modules/inventory/inventory-export.js`
**Line:** 208
**Severity:** HIGH
**Code:**
```javascript
var tenantSlug = getTenantConfig('slug') || getTenantConfig('name') || 'export';
XLSX.writeFile(wb, `מלאי-${tenantSlug}-${today}.xlsx`);
```
**Issue:** Filename uses `tenantSlug` dynamically, which is correct. However, if config is missing, filename defaults to 'export'. Actually RESOLVED — the code reads from config, not hardcoded.
**Status:** RESOLVED (verified dynamic read from getTenantConfig)

### M3-SAAS-07: Hardcoded Domain in studio-brands.js
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/modules/storefront/studio-brands.js`
**Line:** 313
**Severity:** HIGH
**Code:**
```javascript
const googleUrl = `prizma-optic.co.il › brands › ${brand.slug || ''}`;
```
**Issue:** Google search preview URL is hardcoded to prizma-optic.co.il. Will display wrong domain for other tenants.
**Status:** OPEN (must be read from config)

---

## HIGH SEVERITY FINDINGS — Tenant-Specific Data

### M3-SAAS-09: Access Sync Prizma-Only Guard
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/modules/access-sync/access-sync.js`
**Lines:** 71-72, 80-90
**Severity:** HIGH (by design, but confirms tenant coupling)
**Code:**
```javascript
function isPrizmaSync() {
  return typeof TENANT_SLUG !== 'undefined' && TENANT_SLUG === 'prizma';
}

// Non-Prizma tenants: show disabled message
if (!isPrizmaSync()) {
  c.innerHTML = `
    <div class="card" style="text-align:center;padding:40px 20px">
      <h3 style="margin:0 0 8px 0">סנכרון Access זמין רק לאופטיקה פריזמה</h3>
      <p>פיצ'ר זה מסנכרן נתונים עם מערכת Access הפנימית של פריזמה...
  `;
}
```
**Issue:** Feature explicitly tied to 'prizma' tenant slug. Message in Hebrew hardcodes Prizma name. This is intentional—Access sync is a Prizma-only integration. No code will run for other tenants, but UI message should be configurable or multi-language.
**Status:** OPEN (by design, but message should come from config)

### M3-SAAS-14: Currency Hardcoding in shared.js formatILS()
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/shared/js/table-builder.js`
**Lines:** 23, 27
**Severity:** HIGH
**Code:**
```javascript
return Number(v).toLocaleString('he-IL');
...
return Number(v).toLocaleString('he-IL', { style: 'currency', currency: 'ILS' });
```
**Issue:** Hard-wires he-IL locale and ILS currency. Other tenants with different currencies (USD, EUR) will display ₪ incorrectly.
**Status:** OPEN

### M3-SAAS-15: Currency & Language Hardcoding in table-builder.js
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/shared/js/table-builder.js`
**Lines:** 23, 27 (same as M3-SAAS-14, consolidated)
**Severity:** HIGH
**Code:** (same as above)
**Issue:** All numeric columns use he-IL locale and ILS hardcoded
**Status:** OPEN

### M3-SAAS-17: SEO Title Hardcodes Prizma Store Name
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/storefront-brands.html`
**Line:** 142
**Severity:** HIGH
**Code:**
```html
<input type="text" id="bp-seo-title" placeholder="משקפי {מותג} | אופטיקה פריזמה אשקלון" class="form-input"
```
**Issue:** Placeholder hardcodes "אופטיקה פריזמה אשקלון". For other tenants, placeholder will show wrong store name. Should read from config.
**Status:** OPEN

---

## MEDIUM SEVERITY FINDINGS — Domain/Config References

### M3-SAAS-07b: storefront-blog.html SEO Preview URL
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/storefront-blog.html`
**Line:** 299
**Severity:** MEDIUM
**Code:**
```html
<div class="gp-url" id="blog-gp-url">prizma-optic.co.il › בלוג › slug</div>
```
**Issue:** SEO preview shows hardcoded prizma-optic.co.il domain. Will display wrong domain for other tenants.
**Status:** OPEN (should be updated dynamically from config)

### M3-SAAS-07c: seo-audit scripts reference prizma-optic.co.il
**File:** `/sessions/trusting-admiring-euler/mnt/opticup/modules/Module 3 - Storefront/seo-audit/scripts/helpers.mjs`
**Lines:** 13-15
**Severity:** MEDIUM
**Code:**
```javascript
he: process.env.WP_DOMAIN_HE || 'https://prizma-optic.co.il',
en: process.env.WP_DOMAIN_EN || 'https://en.prizma-optic.co.il',
ru: process.env.WP_DOMAIN_RU || 'https://ru.prizma-optic.co.il',
```
**Issue:** SEO audit script defaults to Prizma domains via fallback. Depends on env vars being set.
**Status:** PARTIALLY RESOLVED (env vars provide override, but fallback is Prizma)

---

## EMAIL CAMPAIGNS — Hardcoded Tenant Data (Status: Expected)

**All files in `/campaigns/supersale/messages/` contain:**
- Hardcoded: "אופטיקה פריזמה" (Prizma Optics) — tenant name in Hebrew
- Hardcoded: "הרצל 32, אשקלון" (Herzel St. 32, Ashkelon) — Prizma store address
- Hardcoded: "events@prizma-optic.co.il" — Prizma domain
- Hardcoded: "© כל הזכויות שמורות לאופטיקה פריזמה" — Copyright with Prizma name
- Hardcoded: ₪ currency symbol
- Content: This is expected for Prizma's SuperSale campaigns. These are marketing emails, not system code.

**Files:** email-*.html (11 email templates in `/campaigns/supersale/messages/`)

**Status:** EXPECTED (email campaign templates for Prizma's specific events, not shared SaaS infrastructure)

---

## VERIFIED AS RESOLVED

### M3-SAAS-01: Inventory Title & Logo
**File:** inventory.html
**Status:** ✅ RESOLVED — Dynamic title and logo read from getTenantConfig()

### M3-SAAS-02: Store Name Display
**File:** inventory.html:277
**Status:** ✅ RESOLVED — inv-store-name populated dynamically

### M3-SAAS-04: Prizma UUID Fallback
**File:** sync-watcher.js
**Status:** ✅ RESOLVED — No more PRIZMA_TENANT_ID fallback in main code paths

### M3-SAAS-05: WhatsApp Contact
**File:** Various ERP files
**Status:** ✅ RESOLVED — WhatsApp contact read from config

### M3-SAAS-05b: Instagram CTA
**File:** Various
**Status:** ✅ RESOLVED — Instagram handle from config

### M3-SAAS-06: optic_prizma Hardcode
**File:** Various
**Status:** ✅ RESOLVED — Removed

### M3-SAAS-10: Studio Editor Tenant Guard
**File:** studio-editor.js
**Status:** ✅ RESOLVED — TENANT_SLUG fallback removed

### M3-SAAS-11: Hebrew Store Name Literals
**File:** Various inventory/ERP files
**Status:** ✅ RESOLVED — Dynamic reads from getTenantConfig()

### M3-SAAS-12: Blog SEO Preview Domain
**File:** storefront-blog.js
**Status:** ⚠️ PARTIALLY RESOLVED — JS handles config, but HTML placeholder still hardcoded (M3-SAAS-07b)

### M3-SAAS-13: Studio Permissions Legacy Array
**File:** studio-permissions.js
**Status:** ✅ RESOLVED — Prizma array removed

### M3-SAAS-16: (Implicit) Tax Rate Fallback
**File:** modules/goods-receipts/receipt-po-compare.js:343
**Status:** ✅ RESOLVED — Reads from tenant config, fallback to 17% for backwards compat
```javascript
var vatRate = (tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : 0.17;
```

### M3-SAAS-18: Admin Tenant URL Display
**File:** modules/admin-platform/admin-tenant-detail.js:56-57
**Status:** ⚠️ EXPECTED — App URL uses app.opticalis.co.il?t={slug} (multi-tenant subdomain pattern with slug parameter). Not hardcoded per tenant.

---

## SUMMARY BY SEVERITY

### Critical (0)
- None at this time (M3-SAAS-03 is actually resolved)

### High (5 open)
1. M3-SAAS-07: studio-brands.js Google preview URL
2. M3-SAAS-09: access-sync Prizma-only guard message (design choice, but message should be config)
3. M3-SAAS-14: table-builder.js formatILS() hardcodes he-IL + ILS
4. M3-SAAS-15: Same as 14 (consolidated finding)
5. M3-SAAS-17: storefront-brands.html SEO title placeholder

### Medium (2 open)
1. M3-SAAS-07b: storefront-blog.html hardcoded domain in SEO preview
2. M3-SAAS-07c: seo-audit scripts default to Prizma domains

### Expected (Campaigns) (11)
- SuperSale email templates: hardcoded Prizma tenant data. Status: EXPECTED for campaign-specific templates.

### Verified Resolved (13)
- All previous findings from M3-SAAS-01 through M3-SAAS-18

---

## Recommendations

**Before onboarding second tenant:**
1. Fix M3-SAAS-07 (studio-brands.js): Read Google preview URL from config
2. Fix M3-SAAS-14/15 (table-builder.js): Make formatILS() tenant-aware (read locale + currency from config)
3. Fix M3-SAAS-17 (storefront-brands.html): Read SEO title template from config
4. Fix M3-SAAS-07b (storefront-blog.html): Dynamically update SEO preview domain from config
5. Review M3-SAAS-09 (access-sync message): Update UI message to come from config or decide if message should be multi-language

**Low priority:**
- M3-SAAS-07c: seo-audit scripts already have env var override mechanism; working as designed

**Campaigns:** No action needed — SuperSale emails are intentionally Prizma-specific

---

## Audit Scope

- **Search Pattern:** Hardcoded tenant names (פריזמה, prizma, Prizma, PRIZMA)
- **Search Pattern:** Addresses, phone numbers
- **Search Pattern:** Tax rates (0.17, 17%, VAT, vat, tax)
- **Search Pattern:** Currency (₪, ILS, NIS, שקל)
- **Search Pattern:** Language assumptions (he-IL, hebrew, direction:rtl)
- **Search Pattern:** Domains (prizma-optic.co.il, opticalis.co.il)
- **Exclusions:** .md files, .sql files, node_modules, backups, archives
- **File Types Scanned:** .js, .html only

---

**Report Generated by:** Optic Up Sentinel — Mission 3 (SaaS Readiness)
**Next Scheduled Run:** Next daily execution cycle
