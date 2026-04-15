# Plans — Feature Keys Reference
**Module:** 1.5 — Shared Components
**Authority:** `plans.features` JSONB column in Supabase DB
**Helper:** `isFeatureEnabled(feature)` in `shared/js/plan-helpers.js`
**Last updated:** 2026-04-15 (TENANT_FEATURE_GATING_AND_CLEANUP SPEC — 4 cms_* keys added)

---

## How Feature Flags Work

Each tenant is on a plan (`tenants.plan_id → plans.id`). The `plans.features` JSONB column
holds a map of `featureKey → boolean`. When a page or function needs to check access,
it calls `await isFeatureEnabled('feature_key')` which queries the `is_feature_enabled` RPC.

The helper has a 30-second cache per session (`_planCache` in plan-helpers.js). On fail-open:
if the plan cannot be loaded, `isFeatureEnabled` returns `true` (allows access) to avoid
locking out users due to DB connectivity issues.

---

## All 21 Feature Keys

### Core ERP Features

| Key | basic | premium | enterprise | Description |
|-----|-------|---------|------------|-------------|
| `inventory` | ✅ | ✅ | ✅ | Access to Inventory ERP module |
| `purchasing` | ✅ | ✅ | ✅ | Purchase orders and goods receipts |
| `goods_receipts` | ✅ | ✅ | ✅ | Goods receipt workflow |
| `supplier_debt` | ✅ | ✅ | ✅ | Supplier debt tracking |
| `stock_count` | ✅ | ✅ | ✅ | Physical stock count / inventory audit |
| `shipments` | ✅ | ✅ | ✅ | Shipments and boxes module |
| `ocr` | ✅ | ✅ | ✅ | AI OCR for receipt scanning |
| `whatsapp` | ❌ | ✅ | ✅ | WhatsApp integration for notifications |
| `ai_alerts` | ❌ | ✅ | ✅ | AI-powered low-stock and anomaly alerts |
| `access_sync` | ❌ | ✅ | ✅ | Access Control system sync (door hardware) |

### Storefront Features

| Key | basic | premium | enterprise | Description |
|-----|-------|---------|------------|-------------|
| `storefront` | ❌ | ✅ | ✅ | Storefront module access (products, blog, settings) |
| `image_studio` | ❌ | ✅ | ✅ | Product image upload and management studio |
| `white_label` | ❌ | ❌ | ✅ | Custom branding (logo, colors, fonts) |
| `custom_domain` | ❌ | ❌ | ✅ | Custom domain mapping (e.g. www.mystore.co.il) |

### CMS / Studio Features (added 2026-04-15)

| Key | basic | premium | enterprise | Description |
|-----|-------|---------|------------|-------------|
| `cms_studio` | ❌ | ✅ | ✅ | Access to Studio block editor and brand pages (storefront-studio.html, storefront-brands.html) |
| `cms_custom_blocks` | ❌ | ❌ | ✅ | Custom HTML/CSS block type in Studio; shortcode builder (enterprise only) |
| `cms_landing_pages` | ❌ | ❌ | ✅ | Landing page editor with AI content generation (storefront-landing-content.html) |
| `cms_ai_tools` | ❌ | ❌ | ✅ | AI content manager (product descriptions, blog AI gen, translation glossary) |

### API / Integration Features

| Key | basic | premium | enterprise | Description |
|-----|-------|---------|------------|-------------|
| `api_access` | ❌ | ❌ | ✅ | Public API access for integrations |
| `b2b_marketplace` | ❌ | ❌ | ✅ | B2B marketplace / supplier network access |
| `advanced_reports` | ❌ | ✅ | ✅ | Advanced analytics and reporting dashboards |

---

## Plan Totals

| Plan | Features enabled | Use case |
|------|-----------------|---------|
| basic | 7/21 | Small store — inventory only, no storefront |
| premium | 14/21 | Mid-size store — full ERP + CMS Studio |
| enterprise | 21/21 | Full platform — Prizma and advanced tenants |

---

## Pages Gated by Feature Key

| Page | Gate | Since |
|------|------|-------|
| `storefront-studio.html` | `cms_studio` | 2026-04-15 |
| `storefront-brands.html` | `cms_studio` | 2026-04-15 |
| `storefront-landing-content.html` | `cms_landing_pages` | 2026-04-15 |
| `storefront-content.html` | `cms_ai_tools` | 2026-04-15 |
| `storefront-glossary.html` | `cms_ai_tools` | 2026-04-15 |
| `storefront-blog.html` | `cms_ai_tools` | 2026-04-15 |
| `storefront-products.html` | `storefront` | 2026-04-15 |
| `storefront-settings.html` | `storefront` | 2026-04-15 |

---

## Adding a New Feature Key

1. Add the key to `plans.features` JSONB on all plan rows via a numbered migration SQL in `migrations/`
2. Set appropriate boolean value per plan (basic/premium/enterprise)
3. Add the key to this reference doc (§ All 21 Feature Keys table)
4. If gating a page: add `isFeatureEnabled` check in that page's `DOMContentLoaded` handler
5. Update `docs/GLOBAL_SCHEMA.sql` comment block under the `plans` table

---

## Code Reference

```javascript
// Check if feature is enabled (async, fail-open)
const enabled = await isFeatureEnabled('cms_studio');
if (!enabled) {
  renderFeatureLockedState('cms_studio');
  return;
}

// Show locked state for a feature
renderFeatureLockedState('cms_landing_pages');
// → renders a centred card: lock icon, feature name, upgrade prompt
```

`isFeatureEnabled` is exported by `shared/js/plan-helpers.js` as `window.isFeatureEnabled`.
`renderFeatureLockedState` is exported by `shared/js/plan-helpers.js` as `window.renderFeatureLockedState`.

Both require `shared/js/plan-helpers.js` to be loaded AFTER `js/shared.js` in the HTML file.
