-- ============================================================
-- 031_tenants_update_policy.sql — Allow tenant to update own row
-- Fix: settings save + logo persistence fail silently due to
-- missing UPDATE RLS policy on tenants table.
-- ============================================================

-- Allow authenticated users (JWT with tenant_id claim) to update their own tenant row
CREATE POLICY "tenant_update_own" ON tenants
  FOR UPDATE
  USING (id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)
  WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
