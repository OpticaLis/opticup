# Block 1 — Tables in public schema

**Date:** 2026-04-11
**Source:** Manual baseline from Supabase Dashboard SQL Editor run by Daniel during Phase 3A Manual Action #2
**Status:** One-time manual collection. Automated `run-audit.mjs` script is deferred to Module 3 Phase B preamble (see `MASTER_ROADMAP.md` Module 3 Phase B preamble checklist for details).
**Row count:** 84

---

| table_name                   | owner    | rls_enabled | rls_forced | table_comment |
| ---------------------------- | -------- | ----------- | ---------- | ------------- |
| activity_log                 | postgres | true        | false      | null          |
| ai_agent_config              | postgres | true        | false      | null          |
| ai_content                   | postgres | true        | false      | null          |
| ai_content_corrections       | postgres | true        | false      | null          |
| alerts                       | postgres | true        | false      | null          |
| auth_sessions                | postgres | true        | false      | null          |
| blog_posts                   | postgres | true        | false      | null          |
| brand_content_log            | postgres | true        | false      | null          |
| brands                       | postgres | true        | false      | null          |
| campaign_templates           | postgres | true        | false      | null          |
| campaigns                    | postgres | true        | false      | null          |
| cms_leads                    | postgres | true        | false      | null          |
| content_performance          | postgres | true        | false      | null          |
| content_translations         | postgres | true        | false      | null          |
| content_versions             | postgres | true        | false      | null          |
| conversation_participants    | postgres | true        | false      | null          |
| conversations                | postgres | true        | false      | null          |
| courier_companies            | postgres | true        | false      | null          |
| currencies                   | postgres | true        | false      | null          |
| customers                    | postgres | true        | false      | null          |
| document_links               | postgres | true        | false      | null          |
| document_types               | postgres | true        | false      | null          |
| employee_roles               | postgres | true        | false      | null          |
| employees                    | postgres | true        | false      | null          |
| expense_folders              | postgres | true        | false      | null          |
| goods_receipt_items          | postgres | true        | false      | null          |
| goods_receipts               | postgres | true        | false      | null          |
| inventory                    | postgres | true        | false      | null          |
| inventory_images             | postgres | true        | false      | null          |
| inventory_logs               | postgres | true        | false      | null          |
| knowledge_base               | postgres | true        | false      | null          |
| media_library                | postgres | true        | false      | null          |
| message_reactions            | postgres | true        | false      | null          |
| messages                     | postgres | true        | false      | null          |
| notification_preferences     | postgres | true        | false      | null          |
| ocr_extractions              | postgres | true        | false      | null          |
| payment_allocations          | postgres | true        | false      | null          |
| payment_methods              | postgres | true        | false      | null          |
| pending_sales                | postgres | true        | false      | null          |
| permissions                  | postgres | true        | false      | null          |
| plans                        | postgres | true        | false      | null          |
| platform_admins              | postgres | true        | false      | null          |
| platform_audit_log           | postgres | true        | false      | null          |
| prepaid_checks               | postgres | true        | false      | null          |
| prepaid_deals                | postgres | true        | false      | null          |
| prescriptions                | postgres | true        | false      | null          |
| purchase_order_items         | postgres | true        | false      | null          |
| purchase_orders              | postgres | true        | false      | null          |
| role_permissions             | postgres | true        | false      | null          |
| roles                        | postgres | true        | false      | null          |
| sales                        | postgres | true        | false      | null          |
| seo_targets                  | postgres | true        | false      | null          |
| shipment_items               | postgres | true        | false      | null          |
| shipments                    | postgres | true        | false      | null          |
| stock_count_items            | postgres | true        | false      | null          |
| stock_counts                 | postgres | true        | false      | null          |
| storefront_block_templates   | postgres | true        | false      | null          |
| storefront_component_presets | postgres | true        | false      | null          |
| storefront_components        | postgres | true        | false      | null          |
| storefront_config            | postgres | true        | false      | null          |
| storefront_leads             | postgres | true        | false      | null          |
| storefront_page_tags         | postgres | true        | false      | null          |
| storefront_pages             | postgres | true        | false      | null          |
| storefront_reviews           | postgres | true        | false      | null          |
| storefront_templates         | postgres | true        | false      | null          |
| supplier_balance_adjustments | postgres | true        | false      | null          |
| supplier_document_files      | postgres | true        | false      | null          |
| supplier_documents           | postgres | true        | false      | null          |
| supplier_ocr_templates       | postgres | true        | false      | null          |
| supplier_payments            | postgres | true        | false      | null          |
| supplier_return_items        | postgres | true        | false      | null          |
| supplier_returns             | postgres | true        | false      | null          |
| suppliers                    | postgres | true        | false      | null          |
| sync_log                     | postgres | true        | false      | null          |
| tenant_config                | postgres | true        | false      | null          |
| tenant_i18n_overrides        | postgres | true        | false      | null          |
| tenant_provisioning_log      | postgres | true        | false      | null          |
| tenants                      | postgres | true        | false      | null          |
| translation_corrections      | postgres | true        | false      | null          |
| translation_glossary         | postgres | true        | false      | null          |
| translation_memory           | postgres | true        | false      | null          |
| watcher_heartbeat            | postgres | true        | false      | null          |
| weekly_reports               | postgres | true        | false      | null          |
| work_orders                  | postgres | true        | false      | null          |
