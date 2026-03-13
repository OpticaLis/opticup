-- Migration 015: Storage bucket for failed sync files + storage_path column
-- Run date: 2026-03-11

CREATE POLICY "allow_all_failed_files"
ON storage.objects FOR ALL
USING (bucket_id = 'failed-sync-files')
WITH CHECK (bucket_id = 'failed-sync-files');

ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS errors JSONB;
