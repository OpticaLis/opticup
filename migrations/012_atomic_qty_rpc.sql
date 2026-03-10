-- Migration 012: Atomic quantity update RPC functions
-- Goal 0 — replace client-side quantity calculations with DB-level atomic operations

-- Increment inventory quantity by delta (for receipts, manual additions)
CREATE OR REPLACE FUNCTION increment_inventory(inv_id UUID, delta INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory SET quantity = quantity + delta WHERE id = inv_id;
END;
$$;

-- Decrement inventory quantity by delta, floor at 0 (for sales, reductions)
CREATE OR REPLACE FUNCTION decrement_inventory(inv_id UUID, delta INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - delta)
  WHERE id = inv_id;
END;
$$;
