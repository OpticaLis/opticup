-- 044: Fix next_internal_doc_number — include soft-deleted docs in MAX calculation
-- Root cause: RPC filtered is_deleted=false but unique index includes all rows,
-- causing duplicate key when a soft-deleted doc's number is reissued.
-- Also adds SECURITY DEFINER for consistent RLS behavior.

CREATE OR REPLACE FUNCTION next_internal_doc_number(
  p_tenant_id UUID,
  p_prefix TEXT DEFAULT 'DOC'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max INTEGER;
  v_next TEXT;
BEGIN
  -- Lock the tenant row to serialize numbering.
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Find the highest existing number for this prefix.
  -- NOTE: includes soft-deleted docs to avoid unique constraint violation
  -- (idx_supdocs_internal_unique covers all rows regardless of is_deleted).
  SELECT COALESCE(
    MAX(
      CAST(SUBSTRING(internal_number FROM (LENGTH(p_prefix) + 2)) AS INTEGER)
    ), 0)
  INTO v_max
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number LIKE p_prefix || '-%';

  v_next := p_prefix || '-' || LPAD((v_max + 1)::TEXT, 5, '0');
  RETURN v_next;
END;
$$;
