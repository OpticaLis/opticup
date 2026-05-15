-- SECURITY_HOTFIX_2_2026_05_15 §1.2 — FINAL (post-escalation 2026-05-15T1110Z, Option A)
-- F-CRIT-2: Apply security_invoker=on to ONLY the 2 views whose base tables have
-- explicit anon-friendly RLS policies (`storefront_components_anon_read` + `storefront_reviews_anon_read`).
-- The other 15 views are DEFERRED to SECURITY_HOTFIX_3 — they require base-table RLS expansions
-- (GRANT SELECT TO anon + new `anon_public_read` policies on blog_posts/storefront_pages/ai_content
-- and similar anon-friendly fallback policies on tenants/storefront_config/brands/tenant_branches/etc.)
-- before security_invoker=on can be safely applied without a storefront outage.
--
-- v1 of this migration attempted 10 views (all 17 minus 7 cohort-B-or-C UNSAFE views).
-- Post-apply anon probe showed 9 of 10 returned 0 rows where pre-migration returned N rows —
-- STT-1 fired. v1 was rolled back immediately via ALTER VIEW ... RESET (security_invoker).
-- This v2 file represents what is actually live on the database post-rollback-+-v2-apply.

ALTER VIEW public.v_storefront_reviews SET (security_invoker=on);
ALTER VIEW public.v_storefront_components SET (security_invoker=on);
