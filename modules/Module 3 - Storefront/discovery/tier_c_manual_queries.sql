-- =============================================================
-- Tier C Manual Queries — Module 3 Phase A0
-- Generated: 2026-04-11
-- SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A0
--
-- HOW TO USE (Daniel, during §5.6 Sanity Check):
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Click Run (runs all queries in one batch; each semicolon-terminated
--      statement produces a separate result set in the output panel)
--   4. For each result set, click "Download as JSON" (or copy the JSON)
--   5. Combine into a single file named `tier_c_results_manual.json` at
--      `opticup/modules/Module 3 - Storefront/discovery/` with structure:
--        {
--          "generated_at": "<ISO 8601>",
--          "Q1b_view_bodies": [ ... ],
--          "Q2_content_translations_check": [ ... ],
--          "Q3_rls_policies": [ ... ],
--          "Q4_rpc_definitions": [ ... ],
--          "Q5_tenant_id_indexes": [ ... ],
--          "Q7_rls_enabled": [ ... ],
--          "dependency_graph": [ ... ]
--        }
--   6. Commit `tier_c_results_manual.json` to the opticup repo develop.
--
-- LABELING NOTE:
--   The "Q<N>_..." labels below are this SPEC's internal scheme, not a
--   strict renumbering of Discovery §4.7 Q1-Q8. See
--   phase_a_execution_log_2026-04-11.md "A0 interpretation note" for the
--   mapping between SPEC labels and Discovery §4.7 literal Q1-Q8.
-- =============================================================


-- --- Q1b_view_bodies (Discovery §4.7 Q1) -------------------
-- Full view body SQL for every storefront-facing public view.
-- Required by: A1 (Golden Reference subqueries), A6 (byte-match vs live),
--              A3 (prose-level view dependencies).
SELECT
  viewname,
  pg_get_viewdef(('public.'||viewname)::regclass, true) AS definition
FROM pg_views
WHERE schemaname = 'public'
  AND (
       viewname LIKE 'v_storefront_%'
    OR viewname LIKE 'v_public_%'
    OR viewname LIKE 'v_admin_%'
    OR viewname LIKE 'v_content_%'
    OR viewname LIKE 'v_ai_%'
    OR viewname LIKE 'v_tenant_%'
    OR viewname LIKE 'v_translation_%'
    OR viewname LIKE 'v_cms_%'
  )
ORDER BY viewname;


-- --- Q2_content_translations_check (SPEC A0 add-on) --------
-- CHECK constraint definition on content_translations.entity_type.
-- Discovery §6.3 S3 flagged this as "may be outdated (requires Tier C)".
-- Required by: A4 (SCHEMAS.md CHECK verification subsection).
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.content_translations'::regclass
  AND contype = 'c';


-- --- Q3_rls_policies (Discovery §4.7 Q3) -------------------
-- RLS policy text for all 20 Module 3 tables.
-- Required by: Phase B/C/D SaaS-readiness audit (Wave 7 follow-up).
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'storefront_pages', 'storefront_config', 'storefront_components',
    'storefront_templates', 'storefront_reviews', 'storefront_media',
    'storefront_page_tags', 'storefront_component_presets',
    'storefront_block_templates', 'brands', 'campaigns', 'blog_posts',
    'ai_content', 'ai_content_corrections', 'content_translations',
    'translation_corrections', 'translation_memory', 'translation_glossary',
    'tenant_i18n_overrides', 'cms_leads'
  )
ORDER BY tablename, policyname;


-- --- Q4_rpc_definitions (Discovery §4.7 Q4) ----------------
-- Signatures + SECURITY DEFINER status for storefront RPCs.
-- Required by: Phase B/C SaaS-readiness audit.
SELECT p.proname,
       pg_get_function_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer,
       l.lanname AS language
FROM pg_proc p
JOIN pg_language l ON p.prolang = l.oid
WHERE p.proname IN ('submit_storefront_lead', 'create_translated_page', 'mark_translations_stale')
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- --- Q5_tenant_id_indexes (Discovery §4.7 Q5) --------------
-- Indexes containing tenant_id across public schema.
-- Required by: Phase B/C SaaS scaling assessment.
SELECT t.relname AS table_name,
       i.relname AS index_name,
       pg_get_indexdef(i.oid) AS index_def
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON ix.indexrelid = i.oid
WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND pg_get_indexdef(i.oid) LIKE '%tenant_id%'
ORDER BY t.relname, i.relname;


-- --- Q6_unique_constraints (Discovery §4.7 Q6) -------------
-- Deferred from client because PostgREST exposure of
-- information_schema.table_constraints + key_column_usage is not
-- reliable. Running here alongside the DASHBOARD queries for a single
-- consolidated result set.
-- Required by: Phase B/C Rule 18 enforcement audit.
SELECT tc.table_name,
       tc.constraint_name,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'storefront_pages', 'blog_posts', 'brands', 'content_translations',
    'translation_memory', 'translation_glossary', 'ai_content',
    'storefront_component_presets', 'campaigns', 'cms_leads'
  )
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;


-- --- Q7_rls_enabled (Discovery §4.7 Q7) --------------------
-- RLS enabled/disabled per table.
-- Required by: Phase B/C Rule 15 enforcement audit.
SELECT relname AS table_name,
       relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relkind = 'r'
  AND relname IN (
    'storefront_pages', 'storefront_config', 'storefront_components',
    'storefront_templates', 'storefront_reviews', 'storefront_media',
    'storefront_page_tags', 'storefront_component_presets',
    'storefront_block_templates', 'brands', 'campaigns', 'blog_posts',
    'ai_content', 'ai_content_corrections', 'content_translations',
    'translation_corrections', 'translation_memory', 'translation_glossary',
    'tenant_i18n_overrides', 'cms_leads'
  )
ORDER BY relname;


-- --- dependency_graph (SPEC A0 add, step 5) ----------------
-- View→view dependency edges for all storefront views.
-- Required by: A1 (Rule 29 DROP order), A3 (full DROP/CREATE order).
SELECT
  dependent_view.relname AS dependent_view,
  source_object.relname AS source_object,
  source_object.relkind AS source_kind
FROM pg_depend d
JOIN pg_rewrite r ON d.objid = r.oid
JOIN pg_class dependent_view ON r.ev_class = dependent_view.oid
JOIN pg_class source_object ON d.refobjid = source_object.oid
JOIN pg_namespace dep_ns ON dependent_view.relnamespace = dep_ns.oid
JOIN pg_namespace src_ns ON source_object.relnamespace = src_ns.oid
WHERE dep_ns.nspname = 'public'
  AND src_ns.nspname = 'public'
  AND (
    dependent_view.relname LIKE 'v_storefront%'
    OR dependent_view.relname LIKE 'v_public_%'
    OR dependent_view.relname LIKE 'v_admin_%'
    OR dependent_view.relname LIKE 'v_content_%'
    OR dependent_view.relname LIKE 'v_ai_%'
    OR dependent_view.relname LIKE 'v_tenant_%'
    OR dependent_view.relname LIKE 'v_translation_%'
    OR dependent_view.relname LIKE 'v_cms_%'
  )
  AND dependent_view.oid != source_object.oid
ORDER BY dependent_view, source_object;


-- =============================================================
-- END OF TIER C MANUAL QUERIES
-- =============================================================
