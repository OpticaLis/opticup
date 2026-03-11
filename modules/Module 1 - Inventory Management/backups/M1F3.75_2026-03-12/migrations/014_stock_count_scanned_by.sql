-- Migration 014: Add scanned_by column to stock_count_items
-- This column was referenced in code but missing from the original migration 013

ALTER TABLE stock_count_items ADD COLUMN IF NOT EXISTS scanned_by TEXT;
