-- =============================================================================
-- Module 1.5 — Shared Components Refactor — DB Schema
-- =============================================================================
-- This file tracks all DB changes made by Module 1.5.
-- Updated after every phase that modifies the database.
-- =============================================================================

-- Phase 1: Per-tenant theming via ui_config JSONB on tenants table
-- Executed: 2026-03-16
-- Purpose: Allows each tenant to override CSS Variables via DB config.
--          loadTenantTheme() reads this column and injects values into :root.
--          Default {} means variables.css defaults apply (zero visual change).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ui_config JSONB DEFAULT '{}';

-- ui_config structure:
-- {
--   "--color-primary": "#1a56db",
--   "--color-primary-hover": "#1e429f",
--   "--font-family": "Rubik, sans-serif"
-- }
-- Keys must start with "--" (enforced by theme-loader.js, not DB constraint).
-- Empty {} = use variables.css defaults (current Prizma design).
-- No RLS change needed — tenants table already has tenant isolation policy.
-- No index needed — one row per tenant, not searchable.

-- =============================================================================
-- Phase 3: Activity Log — system-level event log
-- Executed: 2026-03-18
-- Purpose: Central system event log for login, settings, permissions, cross-module
--          events. Lives alongside inventory_logs (business audit). No migration.
-- =============================================================================
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID,
  user_id UUID REFERENCES employees(id),
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warning', 'error', 'critical')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_activity_log_tenant
  ON activity_log(tenant_id);
CREATE INDEX idx_activity_log_entity
  ON activity_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_activity_log_action
  ON activity_log(tenant_id, action);
CREATE INDEX idx_activity_log_created
  ON activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_log_level
  ON activity_log(tenant_id, level)
  WHERE level IN ('warning', 'error', 'critical');

-- =============================================================================
-- Phase 3: Atomic RPC functions (replacing read→compute→write patterns)
-- Executed: 2026-03-18
-- =============================================================================

-- Atomic increment of paid_amount on supplier_documents + auto status update
CREATE OR REPLACE FUNCTION increment_paid_amount(p_doc_id UUID, p_delta NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE supplier_documents
    SET paid_amount = COALESCE(paid_amount, 0) + p_delta,
        status = CASE
          WHEN COALESCE(paid_amount, 0) + p_delta >= total_amount THEN 'paid'
          ELSE 'partially_paid'
        END
    WHERE id = p_doc_id;
END;
$$;

-- Atomic increment of total_used / total_remaining on prepaid_deals
CREATE OR REPLACE FUNCTION increment_prepaid_used(p_deal_id UUID, p_delta NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE prepaid_deals
    SET total_used = COALESCE(total_used, 0) + p_delta,
        total_remaining = total_prepaid - (COALESCE(total_used, 0) + p_delta),
        updated_at = now()
    WHERE id = p_deal_id;
END;
$$;

-- Atomic increment of items_count / total_value on shipments
CREATE OR REPLACE FUNCTION increment_shipment_counters(
  p_shipment_id UUID, p_items_delta INTEGER, p_value_delta NUMERIC
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE shipments
    SET items_count = COALESCE(items_count, 0) + p_items_delta,
        total_value = COALESCE(total_value, 0) + p_value_delta
    WHERE id = p_shipment_id;
END;
$$;
