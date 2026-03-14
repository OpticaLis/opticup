-- Allow 'export' as a valid source_ref in sync_log
ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_source_ref_check;
ALTER TABLE sync_log ADD CONSTRAINT sync_log_source_ref_check
   CHECK (source_ref IN ('watcher', 'manual', 'export'));
