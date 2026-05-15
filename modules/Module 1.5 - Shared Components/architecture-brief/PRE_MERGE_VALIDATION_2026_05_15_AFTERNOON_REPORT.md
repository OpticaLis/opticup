# PRE-MERGE VALIDATION REPORT — develop → main (2026-05-15 afternoon)

**Date:** 2026-05-15
**Validator:** Claude Code (opticup-localhost-tester + opticup-executor + opticup-reviewer skills loaded)
**Repo:** opticalis/opticup, branch develop, HEAD 6fb7fdf
**Baseline:** origin/main @ 31ef00c (midday merge PR #83)
**Status:** 🟢 GREEN — merge recommended

---

## Summary

Read-only pre-merge gate for the SECURITY_HOTFIX_3 delta plus parallel work
since the midday merge. All 12 checks pass. F-CRIT-2 count moved 15→8 and
F-CRIT-3 count moved 17→2 exactly as designed by the SPEC; no new finding
types appeared on the advisor. The 8 deferred views are still unfixed (correct
state — they go to HOTFIX_4); the 2 remaining F-CRIT-3 RPCs are the two
intentionally anon-callable ones (`validate_slug`, `verify_campaign_page_password`).
Smoke 7/7 PASS on demo, both servers healthy, merge-tree predicts zero
conflicts.

---

## Check Results

| # | Check | Expected | Observed | Verdict |
|---|---|---|---|---|
| 1 | Working tree | WARNING acceptable; HOTFIX_3 outputs FAIL | 7 modified (role docs, M4 audit, Guardian alerts) + 50+ untracked architecture-briefs — all pre-existing, none are HOTFIX_3 SQL outputs | ⚠️ WARNING (acceptable) |
| 2 | `npm run verify:integrity` | exit 0 | All clear — 136 files scanned in 11ms | 🟢 |
| 3 | ERP :3000 + Storefront :4321 | both 200 | ERP 200, Storefront 200 | 🟢 |
| 4 | `npm run smoke` | 7/7 PASS | 7/7 PASS, 0 failed | 🟢 |
| 5 | 2 storefront views `security_invoker=on` | both ON | `v_storefront_blog_posts`=on, `v_storefront_pages`=on | 🟢 |
| 6 | 2 base tables `_public_read_published` RLS | both present | `blog_posts_public_read_published` + `ai_content_public_read_published` (anon, SELECT, status='published') + canonical tenant_isolation policies | 🟢 |
| 7 | 5 admin views: `security_invoker=on` + NO anon SELECT | all 5 locked | `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats` — all 5 have `security_invoker=on`; none have SELECT for anon (authenticated/service_role retain SELECT) | 🟢 |
| 8 | `save_translation_memory_batch` 2nd overload Block A | JWT + 42501 present | both overloads (`p_entries jsonb`, `p_tenant_id uuid, p_entries jsonb`) HAS_JWT_HEADER + HAS_BLOCK_A | 🟢 |
| 9 | 5 sample RPCs from §1.5 14 newly-hardened | Block A on Section A; anon EXECUTE revoked on all | 3 sampled Section A (`increment_paid_amount`, `mark_translations_stale`, `register_lead_to_event`) all have JWT+Block A; 2 sampled Section C (`get_all_tenants_overview`, `is_platform_super_admin`) revoke-only by design; all 5 show anon=false, authenticated=true, service_role=true | 🟢 |
| 10 | Storefront probe | 3 pages 200 + >1KB | `/` 200 / 376788 bytes; `/about` 200 / 215051 bytes; `/supersale/` 200 / 323742 bytes | 🟢 |
| 11 | 3 sample deferred views still `security_invoker=on` ABSENT | all 3 absent | `v_storefront_products`, `v_storefront_brand_page`, `v_storefront_categories` all show `(none)` for security_invoker | 🟢 |
| 12 | `git merge-tree origin/main develop` | 0 conflict markers | 0 conflicts (6479 lines of merge-tree output, zero `<<<<<<<` / `>>>>>>>` markers) | 🟢 |
| 13 | Advisor F-CRIT-2 count | 15 → 8 | 8 ERROR `security_definer_view` | 🟢 |
| 14 | Advisor F-CRIT-3 count | 17 → 2 | 2 WARN `anon_security_definer_function_executable` (the 2 intentional: `validate_slug`, `verify_campaign_page_password`) | 🟢 |
| 15 | No NEW finding types | as baseline | Same types as before: `security_definer_view`, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable` (63), `function_search_path_mutable` (16), `extension_in_public` (2), `auth_leaked_password_protection` (1), `public_bucket_allows_listing` (1) | 🟢 |

---

## Delta Statistics

- **Commits ahead of origin/main:** 29
- **HOTFIX_3 scope:** 11 commits (`dc63e54..6fb7fdf`)
- **Parallel work:** 18 commits, comprised of:
  - **M1_LENS_PHASE_1B_FOUNDATION** (open → execute → review → foreman): 10 commits (`dfa5e81`, `112435f`, `4a939c7`, `0d6a032`, `af92916`, `508aeca`, `a7d6924`, `f413075`, `543fe21`, `f071c60`, `f2f430c`, `cc52dc4` — counted as part of this stream)
  - **M1_SKILL_IMPROVEMENT_HARVEST** (open → close): `313c76c`, `ebec48c`, `350c39d`, `0923c88`, `0fa89e4`, `ca823e3`
- **Files changed:** 60 files, +6,112 / −16
- **No commits to main from any other branch in the window.** No force-pushes.

---

## 8 Deferred Views — Still Unfixed (Correct State, Goes To HOTFIX_4)

Surfaced by the advisor (F-CRIT-2 ERROR):

1. `v_storefront_products`
2. `v_storefront_branches`
3. `v_storefront_categories`
4. `v_storefront_brands`
5. `v_storefront_brand_page`
6. `v_storefront_config`
7. `v_public_tenant`
8. `v_storefront_media`

These need strategic discussion (anon exposure of inventory/brands) before
flipping `security_invoker=on` — handled separately in SECURITY_HOTFIX_4.

---

## 2 Remaining F-CRIT-3 RPCs (Intentional)

Surfaced by the advisor (anon_security_definer_function_executable WARN):

1. `public.validate_slug` — pure validation, no side effects, anon-callable by design.
2. `public.verify_campaign_page_password` — campaign-page password verification, must be callable pre-auth.

Both documented in SECURITY_HOTFIX_3 SPEC §11 as Option C (no change) / intentional anon access.

---

## Recommendation

**🟢 GREEN — merge develop → main.**

Proposed PR title:
> `security: SECURITY_HOTFIX_3 (F-CRIT-2 15→8, F-CRIT-3 17→2) + m1: Lens Phase 1B Foundation`

Proposed PR body (suggested):
- SECURITY_HOTFIX_3: 11 commits closing 7 F-CRIT-2 (2 storefront views + 5 admin lockdowns) + 15 F-CRIT-3 (14 Option B revokes + 5 Block A bodies + 2nd overload of `save_translation_memory_batch`) + 2 new base-table RLS policies (`blog_posts`, `ai_content`).
- M1_LENS_PHASE_1B_FOUNDATION: 3 new RPCs (`toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay`) + 3 new screens (lens-inventory, lens-active-designs, lens-pricing) + 3 lens.* permission keys.
- M1_SKILL_IMPROVEMENT_HARVEST: A1/A2/E1/E2 promotions to strategic + executor skills.
- 8 storefront views deferred to SECURITY_HOTFIX_4 pending strategic discussion on anon exposure scope.
- 2 RPCs (`validate_slug`, `verify_campaign_page_password`) intentionally anon-callable per SPEC §11.

---

## Stop Triggers Evaluated

None tripped. Working-tree dirty is pre-existing (WARNING per Brief, not FAIL).
No HOTFIX_3 output files are uncommitted. No parallel commits to main. No
force-pushes. No new advisor finding types. Merge-tree clean.

---

*End of report.*
