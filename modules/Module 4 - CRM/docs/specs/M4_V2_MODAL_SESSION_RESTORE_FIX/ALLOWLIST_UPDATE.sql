-- M4_V2_MODAL_SESSION_RESTORE_FIX — §3.2 Email Allowlist Formalization
-- Run: 2026-05-14 via mcp__claude_ai_Supabase__execute_sql
-- Authority: Brief §4.2 (formal whitelist), Brief §4.3 (demo-only)
-- Iron Rule 22 defense-in-depth: WHERE clause is tenant_id-scoped to demo.
--
-- Pre-state (demo): ["danylis92@gmail.com","daniel@prizma-optic.co.il","alkimovich94@gmail.com"]
-- Pre-state (prizma): null  ← NOT TOUCHED
-- Post-state (demo):  ["daniel@prizma-optic.co.il","alkimovich94@gmail.com","danylis92@gmail.com"]
-- Post-state (prizma): null  ← VERIFIED UNCHANGED
--
-- Note: danylis92@gmail.com was already present in demo's ui_config before
-- this UPDATE; the operation formalizes the canonical order per Brief §4.2
-- and authorizes danylis92@gmail.com for ongoing Brief use.

UPDATE tenants
SET ui_config = jsonb_set(
  ui_config,
  '{test_mode_email_allowlist}',
  '["daniel@prizma-optic.co.il","alkimovich94@gmail.com","danylis92@gmail.com"]'::jsonb,
  true
)
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'  -- demo tenant UUID
  AND slug = 'demo'
RETURNING id, slug, ui_config->'test_mode_email_allowlist' AS new_email_allowlist;

-- Post-write verification:
-- SELECT slug, ui_config->'test_mode_email_allowlist' AS email_allowlist
-- FROM tenants WHERE slug IN ('demo','prizma') ORDER BY slug;
--
-- Returned:
--   demo   → ["daniel@prizma-optic.co.il","alkimovich94@gmail.com","danylis92@gmail.com"]
--   prizma → null  (unchanged)
