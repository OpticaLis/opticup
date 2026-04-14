-- Migration 064: Add access_sync_enabled feature flag to tenants table
-- Fixes: M3-SAAS-04 Part B — replace hardcoded Prizma UUID gate in sync-watcher.js
-- Date: 2026-04-14

BEGIN;

-- Add feature-flag column. Default false = safe (new tenants start with Access sync OFF).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS access_sync_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.access_sync_enabled IS
  'Enables the local Access/Excel sync-watcher for this tenant. Currently Prizma-only; set to true per tenant that opts in.';

-- Initialize Prizma only. Verified slug='prizma', id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' on 2026-04-14.
UPDATE public.tenants
   SET access_sync_enabled = true
 WHERE slug = 'prizma';

COMMIT;
