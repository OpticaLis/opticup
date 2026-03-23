-- 043: Server-side PO item aggregates (count + total value per PO)
-- Replaces client-side fetch of all PO items for table display

CREATE OR REPLACE FUNCTION get_po_aggregates(p_tenant_id UUID)
RETURNS TABLE(po_id UUID, item_count BIGINT, total_value NUMERIC)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    poi.po_id,
    COUNT(*) as item_count,
    COALESCE(SUM(poi.qty_ordered * poi.unit_cost * (1 - COALESCE(poi.discount_pct, 0) / 100.0)), 0) as total_value
  FROM purchase_order_items poi
  WHERE poi.tenant_id = p_tenant_id
  GROUP BY poi.po_id;
$$;
