-- ============================================================
-- Migration 042: Atomic Return number generation
-- Prevents race conditions in concurrent return creation
-- Pattern: RET-{supplier_number}-{4-digit-seq}
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

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

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INT)
  ), 0)
  INTO v_max_seq
  FROM supplier_returns
  WHERE tenant_id = p_tenant_id
    AND return_number LIKE v_prefix || '%'
  FOR UPDATE;

  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  RETURN v_new_number;
END;
$$;
