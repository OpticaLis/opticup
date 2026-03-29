-- 059: Supplier name aliases for AI auto-detection + PO pattern tracking
-- Run manually in Supabase Dashboard

ALTER TABLE supplier_ocr_templates
  ADD COLUMN IF NOT EXISTS supplier_name_aliases TEXT[] DEFAULT '{}';

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS ai_has_po_pattern BOOLEAN DEFAULT NULL;
