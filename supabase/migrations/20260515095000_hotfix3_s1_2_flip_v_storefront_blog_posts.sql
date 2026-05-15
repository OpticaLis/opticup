-- SECURITY_HOTFIX_3 §1.2 — Flip v_storefront_blog_posts to security_invoker=on
-- Per SPEC §10 Commit 6. Rollback tag: pre-hotfix3-view-v_storefront_blog_posts.
--
-- Base-table prerequisites satisfied by §1.1:
--   blog_posts: new policy blog_posts_public_read_published USING (status='published') + GRANT SELECT TO anon.
-- Expected anon row count post-flip: 174 (BASE_BLOG_POSTS_PUBLISHED).
-- STT-1: if post-flip anon probe = 0, rollback via `ALTER VIEW SET (security_invoker=off);` + escalate.

ALTER VIEW public.v_storefront_blog_posts SET (security_invoker=on);
