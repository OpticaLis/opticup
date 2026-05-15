# SENTINEL_DEEP_DIVE_2026_05_14 — Report

**Tier:** T6.1 of OVERNIGHT_BUNDLE_2_2026_05_14
**Date:** 2026-05-14 (overnight Bundle 2)
**Method:** 2 parallel read-only sub-agents — Part 1 (RLS + Triggers + RPC), Part 2 (EF + Storage + Cron + Migration).
**Aggregator:** opticup-strategic (Foreman).
**Axis:** SECURITY + RELIABILITY (vs T5's CORRECTNESS + PERFORMANCE).
**Tenant scope:** READ ONLY — zero writes.

---

## 1. Top 3 findings (most urgent — Daniel morning review)

> **⚙️ 2026-05-15 closeout status** — Finding #1 was addressed by SPEC `SECURITY_HOTFIX_2_2026_05_15` via Full-Auto Pipeline. Live-DB commit `40cde93`. Full retrospective at `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md`. Per-finding status applied below + in §2 RPC #9 / #10 / #12.

1. **🟢 RESOLVED FOR IN-SCOPE SUBSET 2026-05-15 — 20 SECURITY DEFINER functions take `p_tenant_id` but never reference JWT claims in their body.** They trust caller-supplied tenant_id without verification. Higher-risk subset (anon-callable): `generate_daily_alerts`, `get_po_aggregates`, `get_translation_context`, `is_feature_enabled`, `check_plan_limit`, `_record_touchpoint`, `verify_campaign_page_password`. Mitigated today by service_role-only grants on tenant-management fns, but defense-in-depth missing. — **24 of 24 in-scope hardened in `SECURITY_HOTFIX_2_2026_05_15` §1.3 at commit `40cde93` (3-role-aware Block A on 23, Block A-alt slug check on `verify_campaign_page_password`). 16 Option B anon EXECUTE revoked. 15 pre-existing UNRELATED carry findings (e.g. `acknowledge_failed_messages`, `is_platform_super_admin`) deferred to mandatory `SECURITY_HOTFIX_3`.**

2. **HIGH — `failed-sync-files` storage bucket is wide open cross-tenant.** Policy `allow_all_failed_files` grants `ALL` actions to `public` role with no tenant scoping and no role filter. Anonymous users can read/write/delete every tenant's failed-sync payloads. Cross-tenant data leak + DoS write surface.

3. **HIGH — Hardcoded anon JWT with `exp=2088` in 7+ places** (3 EF source files + 4 pg_cron commands). Same token. Rotation requires `cron.unschedule()` + reschedule with new literal AND code rewrite. Compromise → no rotation path. Violates Rule 23 spirit.

---

## 2. Part 1 — RLS + Triggers + RPC (sub-agent a042667473230f65a)

**Bottom line:** no unscoped customer-data table found. All 127 tenant_id-bearing base tables are RLS-on with at least one tenant-scoped policy. But systemic findings exist:

| # | Sev | Target | Finding | Effort | SPEC |
|---|---|---|---|---|---|
| 1 | HIGH | `tenant_config.tenant_config_tenant_*` | `::jsonb` vs canonical `::json` cast | S | `M2_TENANT_CONFIG_RLS_CANONICALIZE` |
| 2 | HIGH | `storefront_leads`, `tenant_i18n_overrides`, `seo_targets` | ALL-cmd policies with `WITH CHECK = NULL`; fragile fallback to USING | M | `M1_5_RLS_WITH_CHECK_HARDENING` |
| 3 | MED | `tenant_provisioning_log` | No `service_bypass` policy | S | merge into #2 |
| 4 | MED | `supplier_document_files.service_bypass` | Granted to `{public}` instead of `{service_role}` | S | merge into #2 |
| 5 | LOW | `inventory_images.anon_read_inventory_images` | `qual=true`; leaks soft-deleted/unpublished images | S | `M1_INVENTORY_IMAGES_ANON_GATE` |
| 7 | HIGH | **57 tables** with `updated_at` column but no BEFORE-UPDATE trigger | Includes `crm_leads`, `customers`, `tenant_config`, `blog_posts`, `media_library`. Only 11 tables have working triggers. | M | `M1_5_UPDATED_AT_TRIGGERS_BACKFILL` |
| 8 | MED | 27 tables with `is_deleted` but no soft-delete cascade trigger | Examples: crm_events → attendees, tenant_branches → inventory, supplier_documents → files | M | `M1_5_SOFT_DELETE_CASCADE_AUDIT` |
| 9 | **CRITICAL → 🟢 PARTIAL CLOSE (2026-05-15)** | 20 SECURITY DEFINER fns missing JWT validation | See top-of-report finding #1. Higher-risk subset is anon-callable. **Closed for 24-RPC in-scope subset via `SECURITY_HOTFIX_2_2026_05_15` §1.3 at SHA `40cde93`. 15 pre-existing carry RPCs (unrelated to the in-scope 24) deferred to `SECURITY_HOTFIX_3`.** | L | ~~`M1_5_RPC_TENANT_JWT_VALIDATION`~~ → `SECURITY_HOTFIX_3` (residue) |
| 10 | HIGH → 🟢 RESOLVED FOR COLLATERAL (2026-05-15) | 17 SECURITY DEFINER fns missing `SET search_path` | Includes `is_platform_super_admin` (used in 5 platform-admin RLS predicates), `submit_storefront_lead`, `sync_lead_status_from_attendee` (← overlap with T5 today's regression!). **`sync_lead_status_from_attendee` closed via HOTFIX_2 §1.1 at SHA `40cde93`. Additionally, 7 of 24 in-scope RPCs in HOTFIX_2 §1.3 (`create_translated_page`, `generate_daily_alerts`, `get_po_aggregates`, `get_translation_context`, `save_translation_memory_batch`, `submit_storefront_lead`, `sync_lead_status_from_attendee`) received `SET search_path TO 'public'` as collateral hardening per EXECUTION_REPORT D-4. Remaining ~9 functions (including `is_platform_super_admin` + carry RPCs) → `SECURITY_HOTFIX_3`.** | S | residual → `SECURITY_HOTFIX_3` |
| 11 | MED → 🟡 DEFERRED | `is_platform_super_admin()` PUBLIC EXECUTE + no search_path | Highest individual-function hijack risk. **Out-of-scope for HOTFIX_2 (not in the 24-RPC `p_tenant_id` set). → `SECURITY_HOTFIX_3`.** | XS | merge into #10 |
| 12 | MED → 🟡 DEFERRED | `save_translation_memory_batch` has 2 overloads | Rule 21 violation. **One overload (the `p_tenant_id`-bearing variant) hardened in HOTFIX_2 §1.3 at SHA `40cde93`. Second overload (no `p_tenant_id`) untouched and still anon-callable — folded into `SECURITY_HOTFIX_3` §1.4 per HOTFIX_2 FINDINGS §F-3.** | S | folded into `SECURITY_HOTFIX_3` |
| 13 | LOW | All 61 SECURITY DEFINER fns have `EXECUTE TO PUBLIC` | Mostly intentional | S | merge into #10 |

13 findings (1 CRITICAL, 4 HIGH, 5 MEDIUM, 3 LOW/INFO).

---

## 3. Part 2 — EF + Storage + Cron + Migration (sub-agent adaea8b2431b3de62)

| # | Sev | Target | Finding | Effort | SPEC |
|---|---|---|---|---|---|
| EF-1 | HIGH | 12 EFs missing `[functions.X]` blocks in `config.toml` | `cms-ai-edit`, `generate-ai-content`, `generate-blog-post`, `generate-campaign-page`, `generate-landing-content`, `lens-catalog-import`, `ocr-extract`, `quick-register`, `remove-background`, `retry-failed`, `unsubscribe` | S | `EF_VERIFY_JWT_CONFIG_TOML_COMPLETION` |
| EF-2 | **HIGH** | Hardcoded long-lived anon JWT (`exp=2088`) in 3 EF source files + 4 pg_cron commands | See top-of-report finding #3 | M | `EF_AND_CRON_ANON_JWT_TO_ENV_VAR` |
| EF-3 | MED | 5 public EFs use `Allow-Origin: *` with no allowlist | `fetch-google-reviews`, `cms-ai-edit`, `generate-*`, `remove-background`, `ocr-extract`. Anyone can pay AI bills via browser. | M | `PUBLIC_EF_ORIGIN_ALLOWLIST_PARITY` |
| EF-4 | MED | `fetch-google-reviews` accepts `google_api_key` from request body | Caller substitution + key leaks in logs | S | `GOOGLE_API_KEY_SERVER_SIDE_ONLY` |
| ST-1 | **HIGH** | `failed-sync-files.allow_all_failed_files` grants `ALL` actions to `public` | See top-of-report finding #2 | S | `FAILED_SYNC_FILES_BUCKET_RLS_TENANT_SCOPE` |
| ST-2 | MED | `supplier-docs` policies gate on `authenticated` only, no tenant_id path check | Cross-tenant document access | S | `SUPPLIER_DOCS_TENANT_PATH_SCOPING` |
| ST-3 | MED | `media-library` same pattern | Cross-tenant media access | S | `MEDIA_LIBRARY_TENANT_PATH_SCOPING` |
| CR-1 | HIGH | Jobs 4, 5, 6, 7 embed same hardcoded anon JWT in cron command | 2nd copy of EF-2 token | — | covered by EF-2 |
| CR-2 | LOW | Outer DO-block swallows inner http_post failures via `RAISE NOTICE` | "0 failures over 7 days" masks per-tenant inner failures | S | `CRON_INNER_FAILURE_OBSERVABILITY` |
| MG-1 | **HIGH** | **63-file live↔git migration drift** (89 live, 26 committed). 71% missing. | DR + onboarding blocker; SaaS tenant provisioning re-runs wrong baseline | M | `MIGRATION_DRIFT_BACKFILL_FROM_LIVE` |
| MG-2 | MED | No CI guard catches DDL via dashboard | Drift recurs weekly without enforcement | S | `CI_GUARD_LIVE_VS_LOCAL_MIGRATION_PARITY` |

10 findings (5 HIGH, 5 MED). **Cron health: excellent** — 0/12,812 outer failures over 7 days, all 6 jobs idempotent.

---

## 4. Roll-up

**Total findings:** 1 CRITICAL + 9 HIGH + 10 MED + 3 LOW = **23 findings** across 7 SECURITY+RELIABILITY dimensions.

**Recommended fix order (by exposure):**
1. ST-1 — `failed-sync-files` bucket cross-tenant exposure (SaaS data-leak risk).
2. EF-2 / CR-1 — anon JWT rotation impossible (token in 7+ places).
3. RPC #9 — 20 SECURITY DEFINER fns missing JWT validation (subset anon-callable).
4. MG-1 — 63-migration drift (DR + onboarding + SaaS-provisioning blocker).
5. RPC #10 — 17 SECURITY DEFINER fns missing `SET search_path`.
6. RPC #7 — 57 missing `updated_at` triggers (consolidates with T5's 37).
7. ST-2, ST-3 — supplier-docs + media-library tenant-path scoping.
8. EF-1 — 12 EFs missing config.toml verify_jwt entries.
9. EF-3, EF-4 — public EFs allowlist + Google key path.
10. RPC #2 — `WITH CHECK` hardening.
11. Remainder: CR-2, MG-2, INFO/LOW items.

---

## 5. Combined T5+T6 totals (de-duped)

Several findings overlap between T5 and T6 (search_path missing fns, updated_at triggers, RLS canonical pattern). De-duped totals across both audits:

- **3 CRITICAL** (T5 search_path regression + T5 view security_invoker + T6 RPC JWT validation)
- **15 HIGH** (across both reports, after de-duping the 57-vs-37 updated_at + the search_path-missing RPCs)
- **~15 MEDIUM**
- **~10 LOW**

**~43 distinct architecture / security debt items surfaced overnight.** All without code changes. Findings drive ~12-15 future SPECs covering 1-2 sprints of cleanup.

---

## 6. Self-improvement

What worked: splitting Sentinel deep-dive into 2 sub-agents (RLS+triggers+RPC vs EF+storage+cron+migration) gave clean coverage with bounded context per agent. Both used Supabase MCP `execute_sql` effectively for pg_catalog probes.

What to improve: cross-coordinating with T5's DB audit would have de-duped the search_path-missing RPC count and the updated_at-triggers count earlier. Future audit batches should declare scope overlaps in their dispatch prompts.

End of report.
