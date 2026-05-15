-- SECURITY_HOTFIX_3 §1.1 — Base-table RLS expansion (3 tables)
-- Per SPEC §10 Commit 5.
--
-- Action per table:
--   blog_posts:       new policy `blog_posts_public_read_published USING (status='published')` + GRANT SELECT TO anon
--   storefront_pages: existing `storefront_pages_anon_read` policy kept (Rule 21 no-dup); just GRANT SELECT TO anon
--   ai_content:       new policy `ai_content_public_read_published USING (status='published')` + GRANT SELECT TO anon
--                     (anon will see 0 rows since ai_content has 0 published rows — v_ai_content is admin-cohort §1.3 anyway)
--
-- This unlocks §1.2 storefront view flips (security_invoker=on for v_storefront_blog_posts + v_storefront_pages).
-- Rollback recipe lives in modules/Module 1.5 - Shared Components/backups/2026-05-15_SECURITY_HOTFIX_3_2026_05_15/policies_*.sql.

CREATE POLICY blog_posts_public_read_published ON public.blog_posts
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ai_content_public_read_published ON public.ai_content
  FOR SELECT TO anon
  USING (status = 'published');

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.storefront_pages TO anon;
GRANT SELECT ON public.ai_content TO anon;
