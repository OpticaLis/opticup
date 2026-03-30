# Phase 4A — Catalog/Shop Modes + WhatsApp + Notifications + Booking

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP — DB + UI) AND opticup-storefront (Storefront — display)
> **Execution mode:** AUTONOMOUS
> **Depends on:** Phase 3 complete, v_storefront_products view exists
> **Created:** March 2026

---

## Objective

Add product display modes (catalog/shop), WhatsApp CTA, "notify me when back" for ghosted products, and booking button. All settings managed from ERP, Storefront is read-only display.

**Architecture: 3-layer mode resolution:**
```
Product override (inventory.storefront_mode_override)
  ↓ if null
Brand default (brands.storefront_mode)
  ↓ if null
Fallback: 'catalog'
```

**Success = tenant can set brand modes in ERP → Storefront displays correctly with WhatsApp/booking.**

---

## Context & Business Decisions

### Display Modes
- **catalog** — product shown WITHOUT price. CTA = WhatsApp button ("שלח הודעה")
- **shop** — product shown WITH price. WhatsApp still available as secondary CTA
- **hidden** — product not shown on storefront at all

### WhatsApp Message Format
```
שלום, אני מתעניין/ת במסגרת:
🏷️ [brand] [model]
📦 ברקוד: [barcode]
🔗 [full URL to product page]
```
Number: configurable per tenant (Prizma: 0533645404)

### "Notify Me" (עדכנו אותי כשיחזור)
- Shows on ghosted products (out of stock, brands.default_sync = 'full')
- Customer enters phone/email
- Saved in `storefront_leads` table
- Notification method configurable per tenant: whatsapp / email / both
- Actual notification sending = future phase (Phase 4A just captures leads)

### Booking Button
- Shows if `storefront_config.booking_url` is not empty
- Opens external URL in new tab
- Prizma default: https://yoman.co.il/Prizamaoptic
- Each tenant sets their own URL (or empty = button hidden)

---

## Pre-Requisites Check

- [ ] On `develop` branch in both repos
- [ ] Phase 3 complete (all pages working)
- [ ] `v_storefront_products` view exists
- [ ] `storefront_config` table exists (from Module 2)

---

## Autonomous Execution Plan

### ═══ ERP STEPS (opticup repo) ═══

### Step 0 — Backup Before Starting

**Repo:** opticup-storefront (backup destination: opticup backups folder)
```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase4a"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp-snapshot" /E /XD node_modules .git /XF .env
```
**Verify:**
- [ ] Backup exists with timestamp
- [ ] Contains both repos' src files

---

### Step 1 — Database Changes (SQL files only — DO NOT RUN)

**Repo:** opticup-storefront (save SQL to `sql/` folder)
**Files to create:** `sql/006-phase4a-storefront-modes.sql`

**⛔ IMPORTANT:** Before writing CREATE TABLE for `storefront_leads`, check if it already exists:
```sql
-- Check first: SELECT * FROM storefront_leads LIMIT 1;
-- If table exists, skip CREATE TABLE, only add missing columns if needed.
```

**SQL content:**

```sql
-- Phase 4A: Storefront modes, WhatsApp, notifications, booking

-- 1. Add storefront_mode to brands (brand-level default)
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS storefront_mode TEXT DEFAULT NULL 
CHECK (storefront_mode IS NULL OR storefront_mode IN ('catalog', 'shop', 'hidden'));

COMMENT ON COLUMN brands.storefront_mode IS 'Storefront display mode. NULL = catalog (default). Per-brand setting managed by tenant in ERP.';

-- 2. Add storefront_mode_override to inventory (product-level override)
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS storefront_mode_override TEXT DEFAULT NULL 
CHECK (storefront_mode_override IS NULL OR storefront_mode_override IN ('catalog', 'shop', 'hidden'));

COMMENT ON COLUMN inventory.storefront_mode_override IS 'Overrides brand storefront_mode for this specific product. NULL = follow brand setting.';

-- 3. Add storefront settings to storefront_config
ALTER TABLE storefront_config 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT NULL;

ALTER TABLE storefront_config 
ADD COLUMN IF NOT EXISTS booking_url TEXT DEFAULT NULL;

ALTER TABLE storefront_config 
ADD COLUMN IF NOT EXISTS notification_method TEXT DEFAULT 'whatsapp' 
CHECK (notification_method IN ('whatsapp', 'email', 'both'));

-- 4. storefront_leads table (check if exists first!)
-- Run: SELECT to_regclass('public.storefront_leads');
-- If NULL, create it:
CREATE TABLE IF NOT EXISTS storefront_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'email')),
  contact_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- RLS for storefront_leads
ALTER TABLE storefront_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storefront_leads_tenant_isolation" ON storefront_leads
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_storefront_leads_product 
  ON storefront_leads(tenant_id, inventory_id, status) 
  WHERE is_deleted = false;

-- 5. Seed Prizma config
UPDATE storefront_config 
SET whatsapp_number = '0533645404',
    booking_url = 'https://yoman.co.il/Prizamaoptic',
    notification_method = 'whatsapp'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma');
```

**⛔ DO NOT RUN THIS SQL. Save to file only. Daniel runs it manually in Supabase Dashboard.**

**Verify:**
- [ ] SQL file created at `sql/006-phase4a-storefront-modes.sql`
- [ ] SQL is valid (no syntax errors)
- [ ] Includes IF NOT EXISTS / IF NOT EXISTS checks
- [ ] Includes storefront_leads existence check comment

---

### Step 2 — Update v_storefront_products View

**Repo:** opticup-storefront
**Files to create:** `sql/007-v-storefront-products-v3.sql`

**What to do:**
Update the view to include mode resolution logic.

```sql
-- v_storefront_products v3 — adds resolved_mode column
-- Mode resolution: product override > brand > 'catalog' (default)

CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  -- existing columns from current view (005) --
  i.id,
  i.tenant_id,
  i.barcode,
  b.name AS brand_name,
  b.id AS brand_id,
  i.model,
  i.color,
  i.size,
  i.quantity,
  i.product_type,
  i.sell_price,
  i.sell_discount,
  b.default_sync,
  -- image array (same as current view) --
  COALESCE(
    (SELECT json_agg(json_build_object(
      'storage_path', img.storage_path,
      'url', '/api/image/' || img.storage_path,
      'is_primary', img.is_primary
    ) ORDER BY img.is_primary DESC, img.created_at)
    FROM inventory_images img 
    WHERE img.inventory_id = i.id AND img.is_deleted = false),
    '[]'::json
  ) AS images,
  -- search text --
  LOWER(COALESCE(b.name, '') || ' ' || COALESCE(i.model, '') || ' ' || COALESCE(i.barcode, '')) AS search_text,
  -- NEW: resolved mode --
  COALESCE(
    i.storefront_mode_override,
    b.storefront_mode,
    'catalog'
  ) AS resolved_mode
FROM inventory i
JOIN brands b ON i.brand_id = b.id
WHERE i.is_deleted = false
  AND b.is_deleted = false
  AND b.exclude_website IS NOT TRUE
  AND COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog') != 'hidden'
  AND (
    b.default_sync = 'display'
    OR (b.default_sync = 'full' AND i.quantity > 0)
    OR (b.default_sync IS NULL AND i.quantity > 0)
  );
```

**⛔ IMPORTANT:** This must match the CURRENT view structure exactly, only adding the `resolved_mode` column. Read the current view (sql/005) first and preserve all existing columns and logic.

**Verify:**
- [ ] SQL file created
- [ ] Includes all columns from current view + `resolved_mode`
- [ ] Hidden products excluded from view
- [ ] Mode resolution logic: product override > brand > 'catalog'

---

### Step 3 — Create Storefront Leads RPC

**Repo:** opticup-storefront
**Files to create:** `sql/008-rpc-storefront-leads.sql`

**What to do:**
Create an RPC for the storefront to submit lead notifications (since storefront uses anon key, needs RPC for writes).

```sql
-- RPC: Submit a "notify me" lead from storefront
CREATE OR REPLACE FUNCTION submit_storefront_lead(
  p_tenant_id UUID,
  p_inventory_id UUID,
  p_contact_type TEXT,
  p_contact_value TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Validate contact type
  IF p_contact_type NOT IN ('phone', 'email') THEN
    RAISE EXCEPTION 'Invalid contact_type: %', p_contact_type;
  END IF;

  -- Check for existing pending lead (prevent duplicates)
  SELECT id INTO v_lead_id
  FROM storefront_leads
  WHERE tenant_id = p_tenant_id
    AND inventory_id = p_inventory_id
    AND contact_value = p_contact_value
    AND status = 'pending'
    AND is_deleted = false;

  IF v_lead_id IS NOT NULL THEN
    -- Already exists, return existing ID
    RETURN v_lead_id;
  END IF;

  -- Insert new lead
  INSERT INTO storefront_leads (tenant_id, inventory_id, contact_type, contact_value)
  VALUES (p_tenant_id, p_inventory_id, p_contact_type, p_contact_value)
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;
```

**Verify:**
- [ ] SQL file created
- [ ] SECURITY DEFINER (allows anon key access)
- [ ] Duplicate prevention logic
- [ ] Returns lead ID

---

### ═══ STOREFRONT STEPS (opticup-storefront repo) ═══

### Step 4 — Update Storefront Product Queries

**Repo:** opticup-storefront
**Files to modify:** `src/lib/products.ts`

**What to do:**
Update product queries to include `resolved_mode` from the view. Update TypeScript types.

```typescript
// Add to Product interface
export interface StorefrontProduct {
  // ... existing fields ...
  resolved_mode: 'catalog' | 'shop';  // 'hidden' never reaches storefront (filtered in view)
}
```

Also update `src/lib/tenant.ts` to fetch `whatsapp_number`, `booking_url`, `notification_method` from `storefront_config`.

**Verify:**
- [ ] Product type includes `resolved_mode`
- [ ] Tenant data includes whatsapp_number, booking_url, notification_method
- [ ] No TypeScript errors

---

### Step 5 — WhatsApp CTA Component

**Repo:** opticup-storefront
**Files to create:** `src/components/WhatsAppButton.astro`

**What to do:**
Create a WhatsApp CTA button component.

**Props:**
```typescript
interface Props {
  phone: string;          // WhatsApp number (from tenant config)
  brand: string;          // Product brand name
  model: string;          // Product model
  barcode: string;        // Product barcode
  productUrl: string;     // Full URL to product page
  locale: Locale;
  variant?: 'primary' | 'secondary';  // primary = big green button, secondary = smaller
}
```

**Message generation:**
```typescript
const message = encodeURIComponent(
  `שלום, אני מתעניין/ת במסגרת:\n🏷️ ${brand} ${model}\n📦 ברקוד: ${barcode}\n🔗 ${productUrl}`
);
const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`;
// Note: Israeli numbers need 972 prefix: 0533645404 → 972533645404
```

**Button styling:**
- Green (#25D366) background, white text, WhatsApp icon
- RTL support
- Responsive (full width on mobile)

**Verify:**
- [ ] Component renders correctly
- [ ] WhatsApp link opens with correct message
- [ ] Phone number formatted with country code (972)
- [ ] RTL layout correct

---

### Step 6 — "Notify Me" Component

**Repo:** opticup-storefront
**Files to create:** `src/components/NotifyMe.astro`

**What to do:**
Create a "עדכנו אותי כשיחזור למלאי" component for ghosted products.

**Props:**
```typescript
interface Props {
  productId: string;      // inventory UUID
  tenantId: string;       // tenant UUID
  locale: Locale;
  notificationMethod: 'whatsapp' | 'email' | 'both';  // from tenant config
}
```

**Behavior:**
- Shows a form: phone field and/or email field (based on notification_method)
- Submit button: "עדכנו אותי" / "Notify me" / "Уведомить меня"
- On submit: calls Supabase RPC `submit_storefront_lead` via fetch
- Success: shows "נרשמת בהצלחה! נעדכן אותך כשהמוצר יחזור למלאי"
- Error: shows error message
- Client-side JS (small inline script for form handling)

**Validation:**
- Phone: Israeli format (05X-XXXXXXX or 05XXXXXXXX)
- Email: basic email validation
- Prevent double submit

**Verify:**
- [ ] Form renders with correct fields based on notification_method
- [ ] Submit calls RPC successfully (test with curl or local)
- [ ] Success/error messages show
- [ ] RTL layout correct
- [ ] i18n labels work in 3 languages

---

### Step 7 — Booking Button Component

**Repo:** opticup-storefront
**Files to create:** `src/components/BookingButton.astro`

**What to do:**
Simple button that links to external booking URL.

**Props:**
```typescript
interface Props {
  bookingUrl: string;
  locale: Locale;
}
```

**Behavior:**
- Only rendered if bookingUrl is not empty
- Opens in new tab (`target="_blank" rel="noopener noreferrer"`)
- Text: "קבעו תור לבדיקת ראייה" / "Book an Eye Exam" / "Записаться на проверку зрения"
- Calendar icon

**Verify:**
- [ ] Button shows when URL exists
- [ ] Button hidden when URL empty/null
- [ ] Opens in new tab
- [ ] i18n text correct

---

### Step 8 — Update Product Pages

**Repo:** opticup-storefront
**Files to modify:** 
- `src/pages/products/[barcode].astro` — product detail page
- `src/components/ProductCard.astro` — product card in listings

**Product detail page changes:**
```
IF resolved_mode = 'catalog':
  - Hide price
  - Show WhatsApp button (primary, big)
  - Show booking button (if URL exists)

IF resolved_mode = 'shop':
  - Show price (existing behavior)
  - Show WhatsApp button (secondary, smaller)
  - Show booking button (if URL exists)

IF product is ghosted (out of stock):
  - Show ghost overlay (existing)
  - Show NotifyMe component
  - Hide WhatsApp button
  - Hide booking button
```

**Product card changes:**
```
IF resolved_mode = 'catalog':
  - Hide price on card
  - Show "לפרטים" button instead of price

IF resolved_mode = 'shop':
  - Show price (existing)
```

**Verify:**
- [ ] Catalog mode: no price, WhatsApp CTA visible
- [ ] Shop mode: price shown, WhatsApp secondary
- [ ] Ghosted product: notify me form, no WhatsApp
- [ ] Booking button shows when URL exists
- [ ] All modes work with RTL

---

### Step 9 — Update Documentation

**Repo:** opticup-storefront + opticup
**Files to update:**
- `SESSION_CONTEXT.md` — Phase 4A status
- `CHANGELOG.md` — Phase 4A entry
- `CLAUDE.md` — new components documented
- `docs/SEO_MIGRATION_PLAN.md` — update if relevant

**ERP repo:**
- `ROADMAP.md` — Phase 4: "4A ✅"

**Verify:**
- [ ] All docs updated
- [ ] All changes committed to develop

---

## Quality Gate (checked before proceeding to 4B)

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Build succeeds | `npm run build` zero errors | ⛔ STOP |
| Catalog mode works | Product without price, WhatsApp visible | ⛔ STOP |
| Shop mode works | Product with price | ⛔ STOP |
| NotifyMe form | Submits without error (RPC works) | ⚠️ Continue, flag |
| Booking button | Shows when URL set, hidden when empty | ⛔ STOP |
| Existing pages | All curl checks return 200 | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup at `backups/[timestamp]_pre-phase4a`
- [ ] SQL files created (006, 007, 008) — NOT run
- [ ] WhatsAppButton component works
- [ ] NotifyMe component works
- [ ] BookingButton component works
- [ ] Product pages show correct mode (catalog/shop)
- [ ] Ghost overlay + NotifyMe on out-of-stock
- [ ] Tenant config includes whatsapp/booking/notification fields
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v4.0-phase4a-catalog-whatsapp`
