-- Fix: Add missing timestamp columns to supplier_returns
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS agent_picked_at TIMESTAMPTZ;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ;

-- Fix: Add agent_picked to status CHECK constraint
ALTER TABLE supplier_returns DROP CONSTRAINT IF EXISTS supplier_returns_status_check;
ALTER TABLE supplier_returns ADD CONSTRAINT supplier_returns_status_check
  CHECK (status = ANY (ARRAY['pending', 'ready_to_ship', 'shipped', 'agent_picked', 'received_by_supplier', 'credited']));
