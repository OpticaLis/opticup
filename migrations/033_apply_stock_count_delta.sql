-- ============================================================
-- apply_stock_count_delta RPC — atomic stock count confirmation
-- Replaces set_inventory_qty for stock counts (Phase 7 Step 1)
-- Uses FOR UPDATE lock to prevent race conditions with concurrent
-- sales (Access/Watcher) and goods receipts during count approval
-- ============================================================
CREATE OR REPLACE FUNCTION apply_stock_count_delta(
  p_inventory_id UUID,
  p_counted_qty INTEGER,
  p_tenant_id UUID,
  p_user_id UUID,
  p_count_id UUID
) RETURNS JSON AS $$
DECLARE
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Lock the row and read current quantity atomically
  SELECT quantity INTO v_current_qty
  FROM inventory
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_id;
  END IF;

  -- Calculate delta from CURRENT state (not start-of-count state)
  v_delta := p_counted_qty - v_current_qty;
  v_new_qty := p_counted_qty;

  -- Guard against negative
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot go below zero (item: %, counted: %, current: %)',
      p_inventory_id, p_counted_qty, v_current_qty;
  END IF;

  -- Apply counted quantity
  UPDATE inventory SET quantity = v_new_qty
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id;

  RETURN json_build_object(
    'previous_qty', v_current_qty,
    'counted_qty', p_counted_qty,
    'delta', v_delta,
    'new_qty', v_new_qty
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
