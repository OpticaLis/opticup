-- Migration: Add 'handled' status to sync_log
-- 'handled' = all pending items were manually resolved/ignored
-- Distinct from 'success' which means everything processed automatically

ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_status_check;
ALTER TABLE sync_log ADD CONSTRAINT sync_log_status_check
  CHECK (status IN ('success', 'partial', 'error', 'handled'));
