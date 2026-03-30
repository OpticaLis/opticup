-- ═══════════════════════════════════════════════════════════════
-- Module 3 Storefront — Phase 2 Step 1
-- ALTER inventory: add storefront columns
--
-- Run in: Supabase Dashboard > SQL Editor (as service_role)
-- SAFETY: ADD COLUMN only, no DROP/DELETE
-- MUST be run BEFORE re-creating views in 002-v-storefront-products.sql
-- ═══════════════════════════════════════════════════════════════

-- storefront_status: controls visibility on the storefront
--   'hidden' (default) = not shown
--   'catalog' = shown without price (WhatsApp CTA)
--   'shop' = shown with price
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS storefront_status TEXT DEFAULT 'hidden'
  CHECK (storefront_status IN ('hidden', 'catalog', 'shop'));

-- storefront_price: override price shown on storefront (NULL = use cost_price or hide)
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS storefront_price DECIMAL(10,2);

-- storefront_description: custom description for the storefront (NULL = auto-generate in Phase 5)
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS storefront_description TEXT;

-- Index for filtering visible products quickly
CREATE INDEX IF NOT EXISTS idx_inventory_storefront_status
  ON inventory (tenant_id, storefront_status)
  WHERE is_deleted = false AND storefront_status != 'hidden';

-- ═══════════════════════════════════════════════════════════════
-- After running this, re-run sql/002-v-storefront-products.sql
-- to create/replace the views that depend on these columns.
-- ═══════════════════════════════════════════════════════════════
