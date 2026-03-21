-- Phase 8: Supplier opening balance for onboarding
-- Allows setting initial debt per supplier when migrating to the system
-- Dashboard calculates: opening_balance + documents(after cutoff) - payments(after cutoff)

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE,
  ADD COLUMN IF NOT EXISTS opening_balance_notes TEXT,
  ADD COLUMN IF NOT EXISTS opening_balance_set_by UUID REFERENCES employees(id);

COMMENT ON COLUMN suppliers.opening_balance IS 'Initial debt amount when onboarding to the system. Default 0.';
COMMENT ON COLUMN suppliers.opening_balance_date IS 'Cutoff date: only documents/payments AFTER this date are counted on top of opening_balance. NULL = count everything.';
COMMENT ON COLUMN suppliers.opening_balance_notes IS 'Free text note explaining the opening balance (e.g., "based on Dec 2025 reconciliation")';
COMMENT ON COLUMN suppliers.opening_balance_set_by IS 'Employee who set the opening balance (audit trail)';
