-- Migration 067: Add 4 CMS feature keys to plans.features JSONB
-- Context: TENANT_FEATURE_GATING_AND_CLEANUP SPEC (2026-04-15)
-- Adds: cms_studio, cms_custom_blocks, cms_landing_pages, cms_ai_tools
-- Safe to re-run: JSONB merge (||) is idempotent for these keys
-- Applied via Supabase MCP on 2026-04-15

-- Backup created before this run: plans_backup_20260415 (via CREATE TABLE AS SELECT)

UPDATE plans
SET features = features ||
  CASE name
    WHEN 'basic'      THEN '{"cms_studio": false, "cms_custom_blocks": false, "cms_landing_pages": false, "cms_ai_tools": false}'::jsonb
    WHEN 'premium'    THEN '{"cms_studio": true,  "cms_custom_blocks": false, "cms_landing_pages": false, "cms_ai_tools": false}'::jsonb
    WHEN 'enterprise' THEN '{"cms_studio": true,  "cms_custom_blocks": true,  "cms_landing_pages": true,  "cms_ai_tools": true}'::jsonb
  END
WHERE name IN ('basic', 'premium', 'enterprise');

-- Verify:
-- SELECT name, features->>'cms_studio', features->>'cms_custom_blocks',
--        features->>'cms_landing_pages', features->>'cms_ai_tools'
-- FROM plans ORDER BY name;
-- Expected:
-- basic      | false | false | false | false
-- enterprise | true  | true  | true  | true
-- premium    | true  | false | false | false
