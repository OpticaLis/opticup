-- ============================================================
-- Phase 5.5a: Atomic RPC Functions
-- 1. next_internal_doc_number  — race-safe sequential numbering
-- 2. update_ocr_template_stats — race-safe OCR learning updates
-- ============================================================

-- ------------------------------------------------------------
-- 1. next_internal_doc_number
--
-- Generates the next sequential internal document number
-- (e.g. DOC-0001, DOC-0002) for a given tenant and prefix.
--
-- FOR UPDATE lock strategy:
--   We lock the tenant's row in the `tenants` table, NOT the
--   supplier_documents table. This means:
--   - Two concurrent calls for the SAME tenant are serialized
--     (~5ms wait), guaranteeing unique sequential numbers.
--   - Two concurrent calls for DIFFERENT tenants are NEVER
--     blocked by each other (different rows locked).
--   - The lock auto-releases when the transaction commits.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_internal_doc_number(
  p_tenant_id UUID,
  p_prefix TEXT DEFAULT 'DOC'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_max INTEGER;
  v_next TEXT;
BEGIN
  -- Lock the tenant row to serialize numbering.
  -- Different tenants are NEVER blocked by each other.
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;

  -- Find the highest existing number for this prefix.
  -- Pattern: prefix + '-' + digits (e.g. DOC-0042 → 42).
  SELECT COALESCE(
    MAX(
      CAST(SUBSTRING(internal_number FROM (LENGTH(p_prefix) + 2)) AS INTEGER)
    ), 0)
  INTO v_max
  FROM supplier_documents
  WHERE tenant_id = p_tenant_id
    AND internal_number LIKE p_prefix || '-%'
    AND is_deleted = false;

  v_next := p_prefix || '-' || LPAD((v_max + 1)::TEXT, 4, '0');
  RETURN v_next;
END;
$$;


-- ------------------------------------------------------------
-- 2. update_ocr_template_stats
--
-- Atomically updates (or creates) an OCR template for a given
-- supplier + document type. Prevents lost updates when two
-- employees approve OCR for the same supplier concurrently.
--
-- Columns used from supplier_ocr_templates:
--   tenant_id, supplier_id, document_type_code, is_active,
--   template_name, extraction_hints, times_used,
--   times_corrected, accuracy_rate, last_used_at, updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ocr_template_stats(
  p_tenant_id UUID,
  p_supplier_id UUID,
  p_doc_type_code TEXT,
  p_was_corrected BOOLEAN,
  p_new_hints JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_template supplier_ocr_templates%ROWTYPE;
  v_result JSON;
BEGIN
  -- Try to find an existing active template for this supplier + doc type.
  SELECT * INTO v_template
  FROM supplier_ocr_templates
  WHERE tenant_id = p_tenant_id
    AND supplier_id = p_supplier_id
    AND document_type_code = p_doc_type_code
    AND is_active = true;

  IF v_template.id IS NOT NULL THEN
    -- Template exists: atomic increment + recalculate in a single UPDATE.
    -- No read-modify-write race — all math happens inside PostgreSQL.
    UPDATE supplier_ocr_templates
    SET
      times_used = times_used + 1,
      times_corrected = times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      accuracy_rate = ROUND(
        (1.0 - (
          (times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END)::NUMERIC
          / (times_used + 1)::NUMERIC
        )) * 100, 2
      ),
      extraction_hints = CASE
        WHEN p_new_hints IS NOT NULL THEN extraction_hints || p_new_hints
        ELSE extraction_hints
      END,
      last_used_at = now(),
      updated_at = now()
    WHERE id = v_template.id
    RETURNING json_build_object(
      'id', id,
      'times_used', times_used,
      'accuracy_rate', accuracy_rate
    ) INTO v_result;
  ELSE
    -- No template yet: create one with initial values.
    INSERT INTO supplier_ocr_templates (
      tenant_id, supplier_id, document_type_code,
      template_name, extraction_hints,
      times_used, times_corrected, accuracy_rate,
      last_used_at, is_active
    ) VALUES (
      p_tenant_id, p_supplier_id, p_doc_type_code,
      p_doc_type_code, COALESCE(p_new_hints, '{}'),
      1,
      CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      CASE WHEN p_was_corrected THEN 0 ELSE 100 END,
      now(), true
    )
    RETURNING json_build_object(
      'id', id,
      'times_used', times_used,
      'accuracy_rate', accuracy_rate
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
