-- Migration 066: Insert /vintage-frames/ page for Prizma tenant
-- WordPress parity: Vintage frames catalog page (WP URL existed, no content migrated)
-- Safe to re-run: ON CONFLICT DO UPDATE
-- Applied via Supabase MCP on 2026-04-15 (MODULE_3_CLOSEOUT SPEC)
-- NOTE: vercel.json redirect approach NOT used because storefront repo is not mounted
-- in this Cowork cloud session. Page created directly in DB as published.

INSERT INTO storefront_pages (
  tenant_id, slug, title, status, page_type, lang, updated_via,
  meta_title, meta_description, blocks
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'prizma'),
  '/vintage-frames/',
  'Vintage Frames',
  'published',
  'custom',
  'en',
  'seed',
  'Vintage Frames | Prizma Optics',
  'Browse our vintage and retro eyeframe collection at Prizma Optics Ashkelon.',
  '[{"id":"vintage-hero","type":"hero","data":{"title":"Vintage Frames","subtitle":"Browse our full frames collection","cta_text":"Shop All Frames","cta_url":"/catalog/","cta_style":"primary"},"settings":{}}]'::jsonb
)
ON CONFLICT (tenant_id, slug, lang) DO UPDATE SET
  status = EXCLUDED.status, updated_via = EXCLUDED.updated_via, updated_at = now();
