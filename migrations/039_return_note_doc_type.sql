-- Migration 039: Add "תעודת החזרה" (Return Note) document type for all tenants
-- Run on: Supabase Dashboard SQL Editor
-- Date: 2026-03-21

INSERT INTO document_types (code, name_he, name_en, affects_debt, is_system, tenant_id)
SELECT 'return_note', 'תעודת החזרה', 'Return Note', true, true, t.id
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM document_types dt
  WHERE dt.code = 'return_note' AND dt.tenant_id = t.id
);
