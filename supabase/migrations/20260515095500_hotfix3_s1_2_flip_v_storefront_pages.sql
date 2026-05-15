-- SECURITY_HOTFIX_3 §1.2 — Flip v_storefront_pages to security_invoker=on
-- Per SPEC §10 Commit 7. Rollback tag: pre-hotfix3-view-v_storefront_pages.
--
-- Base-table prerequisite already satisfied:
--   storefront_pages already has storefront_pages_anon_read USING (status='published') policy + (post-§1.1) GRANT SELECT TO anon.
-- Expected anon row count post-flip: 81 (BASE_STOREFRONT_PAGES_PUBLISHED).
-- STT-1: if post-flip anon probe = 0, rollback + escalate.

ALTER VIEW public.v_storefront_pages SET (security_invoker=on);
