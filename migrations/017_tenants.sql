-- ============================================================
-- Migration 017 — Phase 3.75 Step 1: Tenants Table
-- ============================================================
-- Creates the tenants table and seeds Prizma as tenant #1.
-- Run this BEFORE migration 018 (tenant_id on all tables).
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  logo_url         TEXT,
  default_currency TEXT DEFAULT 'ILS',
  timezone         TEXT DEFAULT 'Asia/Jerusalem',
  locale           TEXT DEFAULT 'he-IL',
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for admin/migration tools)
CREATE POLICY "service_bypass_tenants" ON tenants
  FOR ALL
  TO service_role
  USING (true);

-- Anon can read tenants (needed for login flow to resolve tenant)
CREATE POLICY "anon_read_tenants" ON tenants
  FOR SELECT
  USING (true);

-- Seed Prizma as tenant #1
INSERT INTO tenants (name, slug, default_currency)
VALUES ('אופטיקה פריזמה', 'prizma', 'ILS')
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT id, name, slug, default_currency, timezone, locale, is_active
FROM tenants;
