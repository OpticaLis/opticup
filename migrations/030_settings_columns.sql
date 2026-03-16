-- ============================================================
-- 030_settings_columns.sql — Add settings columns to tenants
-- Phase: Settings page (business, financial, display)
-- ============================================================

-- Business settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_id TEXT;
-- logo_url already exists
-- name already exists (used as business_name fallback)

-- Financial settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 17;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS withholding_tax_default NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
-- default_currency already exists

-- Display settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rows_per_page INTEGER DEFAULT 50;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- Seed defaults for Prizma tenant
UPDATE tenants SET
  business_name = COALESCE(business_name, name),
  vat_rate = COALESCE(vat_rate, 17),
  withholding_tax_default = COALESCE(withholding_tax_default, 0),
  payment_terms_days = COALESCE(payment_terms_days, 30),
  rows_per_page = COALESCE(rows_per_page, 50),
  date_format = COALESCE(date_format, 'DD/MM/YYYY'),
  theme = COALESCE(theme, 'light')
WHERE slug = 'prizma';
