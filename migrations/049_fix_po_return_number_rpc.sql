-- ============================================================
-- Migration 049: Fix FOR UPDATE with aggregate functions
-- PostgreSQL does not allow FOR UPDATE on aggregate queries.
-- Fix: lock the tenants row first (serializes concurrent calls),
-- then run the aggregate query separately (without FOR UPDATE).
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Fix next_po_number: lock tenants row, then MAX() separately
CREATE OR REPLACE FUNCTION next_po_number(p_tenant_id UUID, p_supplier_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
BEGIN
  v_prefix := 'PO-' || p_supplier_number || '-';

  -- Lock tenant row to serialize concurrent calls
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Now safe to query max sequence (no FOR UPDATE on aggregate)
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)
  ), 0)
  INTO v_max_seq
  FROM purchase_orders
  WHERE tenant_id = p_tenant_id
    AND po_number LIKE v_prefix || '%';

  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$$;

-- Fix next_return_number: lock tenants row, then MAX() separately
CREATE OR REPLACE FUNCTION next_return_number(p_tenant_id UUID, p_supplier_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_seq INT;
  v_prefix TEXT;
  v_new_number TEXT;
BEGIN
  v_prefix := 'RET-' || p_supplier_number || '-';

  -- Lock tenant row to serialize concurrent calls
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Now safe to query max sequence (no FOR UPDATE on aggregate)
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INT)
  ), 0)
  INTO v_max_seq
  FROM supplier_returns
  WHERE tenant_id = p_tenant_id
    AND return_number LIKE v_prefix || '%';

  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$$;
