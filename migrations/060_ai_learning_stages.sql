-- 060: AI learning stages + field-level accuracy tracking
-- Run date: 2026-03-29

-- 1. New columns on supplier_ocr_templates
ALTER TABLE supplier_ocr_templates
  ADD COLUMN IF NOT EXISTS learning_stage TEXT DEFAULT 'learning'
    CHECK (learning_stage IN ('learning', 'suggesting', 'auto')),
  ADD COLUMN IF NOT EXISTS fields_suggested INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fields_accepted INTEGER DEFAULT 0;

-- 2. New threshold columns on ai_agent_config
ALTER TABLE ai_agent_config
  ADD COLUMN IF NOT EXISTS suggest_after_invoices INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_after_invoices INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS auto_min_accuracy DECIMAL(5,2) DEFAULT 85.00;

-- 3. Updated RPC: update_ocr_template_stats with field-level tracking + stage advancement
CREATE OR REPLACE FUNCTION update_ocr_template_stats(
  p_tenant_id UUID,
  p_supplier_id UUID,
  p_doc_type_code TEXT,
  p_was_corrected BOOLEAN,
  p_new_hints JSONB DEFAULT NULL,
  p_fields_suggested INTEGER DEFAULT 0,
  p_fields_accepted INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_template supplier_ocr_templates%ROWTYPE;
  v_config ai_agent_config%ROWTYPE;
  v_new_stage TEXT;
  v_result JSON;
BEGIN
  SELECT * INTO v_config FROM ai_agent_config WHERE tenant_id = p_tenant_id;

  SELECT * INTO v_template
  FROM supplier_ocr_templates
  WHERE tenant_id = p_tenant_id
    AND supplier_id = p_supplier_id
    AND document_type_code = p_doc_type_code
    AND is_active = true;

  IF v_template.id IS NOT NULL THEN
    v_new_stage := v_template.learning_stage;
    IF v_template.times_used + 1 >= COALESCE(v_config.auto_after_invoices, 7)
       AND v_template.accuracy_rate IS NOT NULL
       AND v_template.accuracy_rate >= COALESCE(v_config.auto_min_accuracy, 85) THEN
      v_new_stage := 'auto';
    ELSIF v_template.times_used + 1 >= COALESCE(v_config.suggest_after_invoices, 3) THEN
      v_new_stage := 'suggesting';
    END IF;

    UPDATE supplier_ocr_templates
    SET
      times_used = times_used + 1,
      times_corrected = times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      fields_suggested = fields_suggested + COALESCE(p_fields_suggested, 0),
      fields_accepted = fields_accepted + COALESCE(p_fields_accepted, 0),
      accuracy_rate = CASE
        WHEN (fields_suggested + COALESCE(p_fields_suggested, 0)) > 0
        THEN ROUND(((fields_accepted + COALESCE(p_fields_accepted, 0))::NUMERIC
              / (fields_suggested + COALESCE(p_fields_suggested, 0))::NUMERIC) * 100, 2)
        WHEN (times_used + 1) > 0
        THEN ROUND((1.0 - ((times_corrected + CASE WHEN p_was_corrected THEN 1 ELSE 0 END)::NUMERIC
              / (times_used + 1)::NUMERIC)) * 100, 2)
        ELSE 100.00
      END,
      learning_stage = v_new_stage,
      extraction_hints = CASE
        WHEN p_new_hints IS NOT NULL THEN extraction_hints || p_new_hints
        ELSE extraction_hints
      END,
      last_used_at = now(),
      updated_at = now()
    WHERE id = v_template.id
    RETURNING json_build_object(
      'id', id, 'times_used', times_used, 'accuracy_rate', accuracy_rate,
      'learning_stage', learning_stage
    ) INTO v_result;
  ELSE
    INSERT INTO supplier_ocr_templates (
      tenant_id, supplier_id, document_type_code,
      template_name, extraction_hints,
      times_used, times_corrected, fields_suggested, fields_accepted,
      accuracy_rate, learning_stage, last_used_at, is_active
    ) VALUES (
      p_tenant_id, p_supplier_id, p_doc_type_code,
      p_doc_type_code, COALESCE(p_new_hints, '{}'),
      1, CASE WHEN p_was_corrected THEN 1 ELSE 0 END,
      COALESCE(p_fields_suggested, 0), COALESCE(p_fields_accepted, 0),
      CASE WHEN p_was_corrected THEN 0 ELSE 100 END,
      'learning', now(), true
    )
    RETURNING json_build_object(
      'id', id, 'times_used', times_used, 'accuracy_rate', accuracy_rate,
      'learning_stage', learning_stage
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
