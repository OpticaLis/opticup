-- ============================================================
-- Phase 5.5b: Schema Additions to supplier_documents
-- 1. file_hash   — SHA-256 hash for deduplication
-- 2. batch_id    — correlation ID for batch uploads
-- 3. is_historical — flag for imported historical documents
-- Plus 3 partial indexes for efficient lookups.
-- ============================================================

-- A) SHA-256 file hash for deduplication (checked before upload)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- B) Batch correlation ID (links all docs from same upload)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS batch_id UUID;

-- C) Historical document flag (no alerts, no inventory impact)
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;

-- Index: fast dedup lookup by file hash within a tenant
CREATE INDEX IF NOT EXISTS idx_sup_docs_file_hash
  ON supplier_documents(tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- Index: find all documents in a batch within a tenant
CREATE INDEX IF NOT EXISTS idx_sup_docs_batch
  ON supplier_documents(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Index: filter historical vs current documents within a tenant
CREATE INDEX IF NOT EXISTS idx_sup_docs_historical
  ON supplier_documents(tenant_id, is_historical)
  WHERE is_deleted = false;
