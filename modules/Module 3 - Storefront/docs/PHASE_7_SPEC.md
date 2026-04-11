# Phase 7 — White-Label + Analytics + Theme

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP — settings UI) AND opticup-storefront (multi-tenant display)
> **Execution mode:** AUTONOMOUS
> **Depends on:** Phase 6 complete, storefront_config exists with theme JSONB
> **Created:** March 2026

---

## Objective

Enable multi-tenant storefront: each tenant gets their own branded site with their own products, theme, analytics, and domain. Full analytics infrastructure with performance-safe script loading.

**Success = demo tenant loads on subdomain with different theme/products. Analytics infrastructure ready for all major platforms. Partytown ensures zero Lighthouse impact.**

---

## Context & Business Decisions

### Multi-Tenant Routing
- **Prizma:** `www.prizma-optic.co.il` → custom domain (after DNS switch)
- **Other tenants:** `[slug].opticalis.co.il` → subdomain routing
- **Demo/test:** `?t=demo` query param (already works from Phase 1)
- Vercel handles custom domains + subdomains natively

### Tenant Resolution (updated flow)
```
1. Custom domain → lookup in storefront_config.custom_domain → tenant_id
2. Subdomain → extract slug from hostname → lookup in v_public_tenant → tenant_id
3. Query param ?t=slug → lookup in v_public_tenant → tenant_id
4. Default → PUBLIC_DEFAULT_TENANT env var (prizma)
```

### Analytics — Full Infrastructure

**Supported platforms (per tenant):**
| Platform | Config field | Status |
|----------|-------------|--------|
| Google Tag Manager | `analytics.gtm_id` | Active — loads first, manages other tags |
| Google Analytics 4 | `analytics.ga_id` | Active |
| Facebook Pixel | `analytics.facebook_pixel_id` | Active |
| TikTok Pixel | `analytics.tiktok_pixel_id` | Ready (empty field) |
| Hotjar | `analytics.hotjar_id` | Ready (empty field) |
| Facebook CAPI token | `analytics.fb_capi_token` | Ready (empty field, server-side) |
| Google Measurement Protocol | `analytics.google_mp_secret` | Ready (empty field, server-side) |
| Custom scripts | `analytics.custom_scripts` | Ready (empty array, for future scripts) |

**Storage:** `storefront_config.analytics` JSONB column (not separate columns — cleaner, extensible).

**Events to fire (dataLayer.push):**
| Event | When | Data |
|-------|------|------|
| `view_product` | Product detail page load | product_id, brand, model, price, category |
| `add_to_cart` | Future (shop mode cart) | product_id, brand, model, price |
| `begin_checkout` | Future (WhatsApp checkout) | products, total |
| `whatsapp_click` | WhatsApp CTA clicked | product_id, brand, model |
| `notify_me` | NotifyMe form submitted | product_id, brand, model |
| `booking_click` | Booking button clicked | — |
| `search` | Search executed | query, results_count |
| `search_no_results` | Search with 0 results | query |

**Performance: Partytown (CRITICAL)**
All third-party analytics scripts MUST load via Partytown (Web Worker) to avoid blocking the main thread. This is non-negotiable — analytics must not hurt Lighthouse scores.

```bash
npm install @builder.io/partytown
```

Astro has built-in Partytown support via `@astrojs/partytown`.

### Theme
- `storefront_config.theme` JSONB already exists and injects CSS variables
- Phase 7 verifies it works per-tenant and adds missing theme properties
- Theme properties: primary, secondary, accent, font, border-radius, header-bg

### Per-Tenant Customization
- Favicon per tenant
- OG image per tenant
- Homepage hero content per tenant (title, subtitle, image)
- Footer content per tenant (already uses tenant name)

---

## Autonomous Execution Plan

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase7"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Database: Analytics JSONB + Domain + Branding Columns

**Repo:** opticup-storefront
**Files to create:** `sql/018-phase7-white-label.sql`

```sql
-- Phase 7: White-label + Analytics

-- Analytics as JSONB (extensible, all platforms in one field)
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS analytics JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN storefront_config.analytics IS 'Per-tenant analytics config. Keys: gtm_id, ga_id, facebook_pixel_id, tiktok_pixel_id, hotjar_id, fb_capi_token, google_mp_secret, custom_scripts[]';

-- Custom domain
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS custom_domain TEXT DEFAULT NULL;

-- Homepage customization
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT NULL;
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT NULL;
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS hero_image_url TEXT DEFAULT NULL;

-- Favicon + OG
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT NULL;
ALTER TABLE storefront_config ADD COLUMN IF NOT EXISTS og_image_url TEXT DEFAULT NULL;

-- Update v_storefront_config view to expose new columns
CREATE OR REPLACE VIEW v_storefront_config AS
SELECT
  tenant_id,
  whatsapp_number,
  booking_url,
  notification_method,
  analytics,
  custom_domain,
  hero_title,
  hero_subtitle,
  hero_image_url,
  favicon_url,
  og_image_url
FROM storefront_config
WHERE is_deleted = false;
```

**Verify:**
- [ ] SQL file created
- [ ] analytics is JSONB (not separate columns)
- [ ] View updated with new columns

---

### Step 2 — Install Partytown + Update Astro Config

**Repo:** opticup-storefront

```bash
npm install @astrojs/partytown
```

**Modify:** `astro.config.mjs`

```javascript
import partytown from '@astrojs/partytown';

export default defineConfig({
  // ... existing config
  integrations: [
    sitemap({ /* ... */ }),
    partytown({
      config: {
        forward: ['dataLayer.push'],  // Forward dataLayer events to worker
      },
    }),
  ],
});
```

**Verify:**
- [ ] Package installed
- [ ] Astro config updated
- [ ] Build succeeds

---

### Step 3 — Analytics Script Injection with Partytown

**Repo:** opticup-storefront
**Files to create:** `src/lib/analytics.ts`
**Modify:** `src/layouts/BaseLayout.astro`

**analytics.ts:**
```typescript
export interface AnalyticsConfig {
  gtm_id?: string;
  ga_id?: string;
  facebook_pixel_id?: string;
  tiktok_pixel_id?: string;
  hotjar_id?: string;
  fb_capi_token?: string;
  google_mp_secret?: string;
  custom_scripts?: string[];
}

// Generate GTM script (loads via Partytown)
export function getGTMScript(gtmId: string): string { ... }

// Generate GA4 script
export function getGA4Script(gaId: string): string { ... }

// Generate Facebook Pixel script
export function getFBPixelScript(pixelId: string): string { ... }

// Generate TikTok Pixel script
export function getTikTokPixelScript(pixelId: string): string { ... }

// Generate Hotjar script
export function getHotjarScript(hotjarId: string): string { ... }
```

**BaseLayout.astro — analytics scripts in `<head>`:**

All analytics scripts use `type="text/partytown"` so Partytown loads them in a Web Worker:

```astro
{analytics?.gtm_id && (
  <script type="text/partytown" src={`https://www.googletagmanager.com/gtag/js?id=${analytics.gtm_id}`}></script>
  <script type="text/partytown" set:html={getGTMScript(analytics.gtm_id)}></script>
)}

{analytics?.ga_id && (
  <script type="text/partytown" async src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga_id}`}></script>
  <script type="text/partytown" set:html={getGA4Script(analytics.ga_id)}></script>
)}

{analytics?.facebook_pixel_id && (
  <script type="text/partytown" set:html={getFBPixelScript(analytics.facebook_pixel_id)}></script>
)}

{analytics?.tiktok_pixel_id && (
  <script type="text/partytown" set:html={getTikTokPixelScript(analytics.tiktok_pixel_id)}></script>
)}

{analytics?.hotjar_id && (
  <script type="text/partytown" set:html={getHotjarScript(analytics.hotjar_id)}></script>
)}

{analytics?.custom_scripts?.map(script => (
  <script type="text/partytown" set:html={script}></script>
))}
```

**Important:** `type="text/partytown"` is the key — Partytown intercepts these and runs them in a Worker, not on the main thread.

**Verify:**
- [ ] No analytics scripts load for Prizma (no IDs configured)
- [ ] Build succeeds
- [ ] Partytown service worker generated in build output

---

### Step 4 — Analytics Event Tracking

**Repo:** opticup-storefront
**Files to create:** `src/lib/track.ts`

**What to do:**
Create a lightweight event tracking helper that pushes to dataLayer.

```typescript
// src/lib/track.ts
// Client-side analytics event tracking

export function trackEvent(event: string, data?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

// Convenience functions
export function trackViewProduct(product: { id: string; brand: string; model: string; price?: number; category?: string }) {
  trackEvent('view_product', product);
}

export function trackWhatsAppClick(product: { id: string; brand: string; model: string }) {
  trackEvent('whatsapp_click', product);
}

export function trackNotifyMe(product: { id: string; brand: string; model: string }) {
  trackEvent('notify_me', product);
}

export function trackBookingClick() {
  trackEvent('booking_click');
}

export function trackSearch(query: string, resultsCount: number) {
  trackEvent(resultsCount > 0 ? 'search' : 'search_no_results', { query, results_count: resultsCount });
}
```

**Add tracking calls to existing components:**
- `src/pages/products/[barcode].astro` — `trackViewProduct` on page load
- `src/components/WhatsAppButton.astro` — `trackWhatsAppClick` on click
- `src/components/NotifyMe.astro` — `trackNotifyMe` on submit
- `src/components/BookingButton.astro` — `trackBookingClick` on click
- `src/components/SearchBar.astro` — `trackSearch` on search execute

**Implementation:** Add small inline `<script>` blocks that import and call track functions.

**Verify:**
- [ ] `window.dataLayer` receives events (check in browser console)
- [ ] Events fire on correct user actions
- [ ] No errors when analytics not configured (graceful no-op)

---

### Step 5 — Update Tenant Resolution for Multi-Domain

**Repo:** opticup-storefront
**Modify:** `src/lib/tenant.ts`

**What to do:**
Update `resolveTenant()` to support custom domain + subdomain routing.

**Updated resolution logic:**
```typescript
export async function resolveTenant(request?: Request): Promise<TenantData | null> {
  let tenantSlug: string | null = null;
  
  if (request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // 1. Query param override (?t=slug)
    tenantSlug = url.searchParams.get('t');
    
    if (!tenantSlug) {
      // 2. Custom domain lookup
      const { data: customDomainMatch } = await supabase
        .from('v_storefront_config')
        .select('tenant_id')
        .eq('custom_domain', hostname)
        .maybeSingle();
      
      if (customDomainMatch) {
        return resolveTenantById(customDomainMatch.tenant_id);
      }
      
      // 3. Subdomain: [slug].opticalis.co.il
      if (hostname.endsWith('.opticalis.co.il')) {
        tenantSlug = hostname.split('.')[0];
      }
    }
  }
  
  // 4. Fallback to default tenant
  if (!tenantSlug) {
    tenantSlug = import.meta.env.PUBLIC_DEFAULT_TENANT || 'prizma';
  }
  
  // Existing slug-based resolution...
}
```

**Also update TenantData interface** to include analytics config:
```typescript
interface TenantData {
  // ... existing fields ...
  storefront: {
    // ... existing fields ...
    analytics: AnalyticsConfig;
    hero_title?: string | null;
    hero_subtitle?: string | null;
    hero_image_url?: string | null;
    favicon_url?: string | null;
    og_image_url?: string | null;
    custom_domain?: string | null;
  };
}
```

**Verify:**
- [ ] `?t=demo` still works
- [ ] Default tenant (prizma) still loads
- [ ] Custom domain path exists (can't test until DNS)
- [ ] Analytics config loaded from storefront_config
- [ ] No breaking changes

---

### Step 6 — Per-Tenant Homepage + Favicon + OG

**Repo:** opticup-storefront
**Modify:** `src/pages/index.astro`, `src/components/HeroSection.astro`, `src/layouts/BaseLayout.astro`

**HeroSection:** Use hero_title/subtitle/image from config if available, fallback to defaults.

**BaseLayout:**
```astro
{/* Favicon — per tenant or default */}
<link rel="icon" href={tenant?.storefront?.favicon_url || '/favicon.svg'} />

{/* OG Image — per tenant or default */}
{(ogImage || tenant?.storefront?.og_image_url) && (
  <meta property="og:image" content={ogImage || tenant.storefront.og_image_url} />
)}
```

**Pass analytics to BaseLayout** so it can inject scripts.

**Verify:**
- [ ] Prizma homepage unchanged (no overrides configured)
- [ ] Favicon uses tenant config if set
- [ ] OG image uses tenant config if set
- [ ] Analytics scripts slot in BaseLayout exists

---

### Step 7 — ERP: Analytics + Branding Settings

**Repo:** opticup
**Modify:** `storefront-settings.html` + `modules/storefront/storefront-settings.js`

**What to do:**
Add analytics and branding sections to existing settings page.

**Analytics section:**
```html
<div class="sf-section">
  <h3>📊 Analytics & Tracking</h3>
  
  <label>Google Tag Manager ID</label>
  <input id="gtm-id" placeholder="GTM-XXXXXXX">
  
  <label>Google Analytics 4 ID</label>
  <input id="ga-id" placeholder="G-XXXXXXXXXX">
  
  <label>Facebook Pixel ID</label>
  <input id="fb-pixel" placeholder="123456789">
  
  <label>TikTok Pixel ID</label>
  <input id="tiktok-pixel" placeholder="XXXXXXXXX">
  
  <label>Hotjar ID</label>
  <input id="hotjar-id" placeholder="1234567">
  
  <label>Facebook CAPI Token (server-side)</label>
  <input id="fb-capi" placeholder="EAAxxxxxx..." type="password">
  
  <label>Google Measurement Protocol Secret (server-side)</label>
  <input id="google-mp" placeholder="xxxxxxxx" type="password">
</div>
```

**Branding section:**
```html
<div class="sf-section">
  <h3>🎨 Branding & Domain</h3>
  
  <label>Custom Domain</label>
  <input id="custom-domain" placeholder="www.mystore.co.il">
  
  <label>Hero Title (override default)</label>
  <input id="hero-title">
  
  <label>Hero Subtitle (override default)</label>
  <input id="hero-subtitle">
  
  <label>Favicon URL</label>
  <input id="favicon-url" placeholder="https://...">
  
  <label>OG Image URL</label>
  <input id="og-image-url" placeholder="https://...">
</div>
```

**Save:** Writes analytics as JSONB object to `storefront_config.analytics`. Other fields as separate columns.

**Verify:**
- [ ] Settings page shows all new fields
- [ ] Save stores analytics as JSONB
- [ ] Load populates fields from existing config
- [ ] Empty fields save as null/empty

---

### Step 8 — Test + Documentation

**Test with demo tenant:**
```bash
curl -s "https://opticup-storefront.vercel.app/?t=demo" | grep -i "error\|prizma"
curl -s "https://opticup-storefront.vercel.app/products/?t=demo" | head -20
```

**Update documentation:**
- SESSION_CONTEXT.md
- CHANGELOG.md
- CLAUDE.md (tenant resolution, analytics, Partytown, events)
- ROADMAP.md → Phase 7: "✅"

**Document in CLAUDE.md:**
- Tenant resolution order: custom_domain → subdomain → ?t= → default
- Analytics: JSONB in storefront_config, Partytown for performance
- Events: dataLayer.push for all user actions
- Multi-tenant: each tenant sees only their data

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Build succeeds | Zero errors | ⛔ STOP |
| Partytown installed | Service worker in build | ⛔ STOP |
| Prizma homepage | Unchanged | ⛔ STOP |
| Products + images | Still display | ⛔ STOP |
| WhatsApp + booking | Still work | ⛔ STOP |
| `?t=demo` | Loads without errors | ⛔ STOP |
| ERP settings | Analytics fields save/load | ⛔ STOP |
| No analytics on page | (Prizma has no IDs yet) | ✅ Expected |
| All pages 200 | curl check | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] SQL 018 created (analytics JSONB + domain + branding columns)
- [ ] Partytown installed and configured
- [ ] Analytics scripts with `type="text/partytown"` in BaseLayout
- [ ] Event tracking (dataLayer.push) on all user actions
- [ ] Tenant resolution updated (custom domain + subdomain)
- [ ] Per-tenant homepage (hero override)
- [ ] Per-tenant favicon + OG image
- [ ] ERP settings updated (analytics + branding fields)
- [ ] Demo tenant test passes
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v7.0-phase7-white-label`
