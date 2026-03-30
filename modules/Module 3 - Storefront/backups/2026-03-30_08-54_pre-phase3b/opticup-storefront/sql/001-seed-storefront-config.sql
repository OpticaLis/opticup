-- ═══════════════════════════════════════════════════════════════
-- Module 3 Storefront — Phase 1
-- Seed storefront_config for Prizma tenant
--
-- Run in: Supabase Dashboard > SQL Editor (as service_role)
-- SAFETY: INSERT only, no DROP/DELETE/ALTER
-- ═══════════════════════════════════════════════════════════════

-- Prizma tenant UUID (from tenants table)
-- SELECT id FROM tenants WHERE slug = 'prizma';

UPDATE storefront_config
SET
  enabled = true,
  theme = '{
    "primary": "#1e3a5f",
    "primary-light": "#2a5a8f",
    "primary-dark": "#0f1f33",
    "accent": "#d4a853"
  }'::jsonb,
  categories = '["משקפי שמש", "משקפי ראייה", "עדשות מגע", "אביזרים"]'::jsonb,
  seo = '{
    "title": "אופטיקה פריזמה | משקפיים ועדשות מגע",
    "description": "אופטיקה פריזמה - מגוון רחב של משקפי שמש, משקפי ראייה ועדשות מגע מהמותגים המובילים",
    "keywords": "משקפיים, משקפי שמש, עדשות מגע, אופטיקה, פריזמה"
  }'::jsonb,
  pages = '{
    "about": true,
    "contact": true,
    "blog": true,
    "products": true,
    "categories": true
  }'::jsonb,
  updated_at = now()
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma');
