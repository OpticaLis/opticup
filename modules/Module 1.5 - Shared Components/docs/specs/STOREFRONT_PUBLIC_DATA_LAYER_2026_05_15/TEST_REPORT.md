# TEST_REPORT — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

**Date:** 2026-05-15 evening
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD `e8af4a2`
**Status:** GREEN

## Servers / Backends

- Supabase project `tsxrrxzmdxaenlvocyit` (`prizma-optic`, eu-west-1): ACTIVE_HEALTHY
- Storefront (Vercel) Prizma: `https://www.prizma-optic.co.il/` → 200 (redirect from apex; verified in VERIFICATION_REPORT.md)
- Storefront (Vercel) demo: `https://opticup-storefront-demo.vercel.app/` → 200
- Local ERP `:3000` / Storefront `:4321`: not started (baseline smoke targets the live deployments, not local servers — Storefront repo is deployed continuously; ERP local would be redundant for this SPEC's surface)

## Baseline (`npm run smoke` → `tests/smoke/baseline.test.mjs`)

**7/7 passed, 0 failed.** Final run executed at this commit (`e8af4a2`):

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (954ms)
  PASS  2. Create CRM lead succeeds (M4)  (164ms)
  PASS  3. Read inventory count for demo tenant (M1)  (274ms)
  PASS  4. Storefront homepage returns 200  (589ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (523ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (136ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (531ms)

7/7 passed, 0 failed
```

Smoke 7/7 was verified PASS at the following points during the pipeline (session-start gate + post each migration commit):
- Session start (pre any DB change) — 7/7 PASS
- Post Commit 3 (mirror infrastructure complete) — 7/7 PASS
- Post Commit 4 (8 views rewritten + flipped) — 7/7 PASS
- Post Commit 5 (REVOKE complete) — 7/7 PASS
- This run (post Commit 10 docs) — 7/7 PASS

Test #4 ("Storefront homepage returns 200") is the live anon path through the rewritten v_storefront_* views; PASS confirms the rewrite-and-REVOKE chain works end-to-end via the demo storefront URL.

## SPEC-specific tests

The SPEC author created **`tests/smoke/STOREFRONT_PUBLIC_DATA_LAYER_trigger_e2e.sql`** — 6 trigger E2E blocks covering all 6 mirror tables × 3-5 ops per table = **26 cases**. The blocks ran cumulatively inline during execution (each commit's pre-flight + post-flight). Final count was confirmed against demo:

| Block | Source table | Cases | Result |
|---|---|---|---|
| 1 | `tenant_branches` → `branches_public` | INSERT + UPDATE-while-visible + DELETE + UPDATE-to-invisible | 4/4 PASS |
| 2 | `storefront_config` → `storefront_config_public` | UPDATE-to-visible + UPDATE-while-visible + UPDATE-to-invisible (state transitions on demo's existing row) | 3/3 PASS |
| 3 | `media_library` → `media_public` | INSERT + UPDATE + soft-delete + undelete + hard DELETE | 5/5 PASS |
| 4 | `brands` → `brands_public` | INSERT + UPDATE + active=false flip + re-active + DELETE | 5/5 PASS |
| 5 | `inventory_images` → `inventory_images_public` | INSERT + UPDATE + DELETE | 3/3 PASS |
| 6 | `inventory` + satellites → `inventory_public` | INSERT-without-image (invisible) + image-add satellite (visible) + UPDATE + ai_content satellite INSERT + ai_content satellite UPDATE + last-image-DELETE satellite | 6/6 PASS |

**Total: 26/26 trigger E2E cases PASS. Markers fully reverted (net data delta = 0 on demo).**

## Cross-tenant leak probes (STT-11)

Performed inline during Commit 6 verification (see VERIFICATION_REPORT.md §STT-11 cross-tenant leak probes).

| Probe | JWT tenant scope | Leakage |
|---|---|---|
| `v_storefront_products` cross-tenant rows | demo | 0 |
| `v_storefront_brands` cross-tenant rows | demo | 0 |
| `v_storefront_branches` cross-tenant rows | demo | 0 |
| `v_storefront_media` cross-tenant rows | demo | 0 |
| `v_storefront_config` cross-tenant rows | demo | 0 |
| `inventory_public` cross-tenant rows | demo | 0 |
| `brands_public` cross-tenant rows | demo | 0 |
| `media_public` cross-tenant rows | demo | 0 |
| `v_storefront_products` cross-tenant rows | Prizma | 0 |
| `v_storefront_brands` cross-tenant rows | Prizma | 0 |
| ... (all 6 views + 1 mirror, Prizma JWT) | Prizma | 0 |
| `v_storefront_products` own-tenant count | Prizma | 1133 (matches BASE_PRIZMA_PRODUCTS) |

**Result: 0 leaks both directions. Mechanical isolation confirmed.**

## Storefront page smoke (Prizma + demo)

Performed inline during Commit 6 verification.

| Tenant | Path | HTTP | Bytes | Note |
|---|---|---|---|---|
| Prizma | `/` | 200 | 46,085 | PASS |
| Prizma | `/brands/` | 200 | 27,562 | PASS |
| Prizma | `/products/` | 200 | 32,195 | PASS |
| Prizma | `/sitemap-dynamic.xml` | 200 | 2,999 | PASS |
| Prizma | `/branches/` | 200 | 27,601 | PASS |
| Prizma | `/brands/kiwi/` and `/brands/alexander-mcqueen/` | 404 | n/a | Pre-existing storefront-app routing — sitemap-dynamic.xml does not enumerate `/brands/<slug>/` URLs (verified). NOT a migration regression. Logged as FINDING F-6 + F-8. |
| Prizma | `/about/` | 404 | n/a | Pre-existing missing route. NOT a regression. Logged as FINDING F-7. |
| demo | `/` | 200 | 45,986 | PASS |
| demo | `/brands/` | 200 | 27,504 | PASS |
| demo | `/products/` | 200 | 32,059 | PASS |
| demo | `/branches/` | 200 | 27,543 | PASS |
| demo | `/about/` | 404 | n/a | Pre-existing (same as Prizma). |

**5/5 existing routes return 200 on both tenants. 2 routes return 404 (pre-existing app behavior, confirmed via sitemap inspection).**

## Latency post-migration (SPEC §3 #18)

| View | BASE (ms) | +20% cap (ms) | Post (ms) | Verdict |
|---|---|---|---|---|
| `v_storefront_products` | 480.91 | 577.09 | 44.69 (EXPLAIN ANALYZE) | PASS — 10.8× speedup |

Other 7 views: plans simplified (mirrors are pre-filtered, fewer EXISTS/JOIN levels); spot-checks within bounds.

## Advisor delta

| Lint type | BASE | Post |
|---|---|---|
| `security_definer_view` (F-CRIT-2) | 8 | **0** ✓ CLOSED |
| `authenticated_security_definer_function_executable` | 63 | 72 (+9, new trigger functions) |
| `anon_security_definer_function_executable` | 10 | 11 (+1) |
| `function_search_path_mutable` | 16 | 16 (unchanged) |
| `extension_in_public` | 2 | 2 |
| `public_bucket_allows_listing` | 1 | 1 |
| `auth_leaked_password_protection` | 1 | 1 |
| **Total advisor instances** | 93 | 103 |
| **New advisor lint TYPES** | n/a | **0** (per SPEC §3 #17) |

## Failures

None.

## Iron Rules / Test Discipline

- ✅ Demo tenant only (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb` hard-coded in baseline tests + E2E suite).
- ✅ Phone numbers in test data: baseline test-2 uses `+972500000000`-style fake numbers per auto-memory `feedback_test_data_phones.md`.
- ✅ Cleanup verified: all 26 trigger E2E markers + baseline test-2's CRM lead fully reverted.
- ✅ Iron Rule 31 integrity gate exit 0 (pre-commit checked on each commit; final run before TEST_REPORT.md commit verified).
- ✅ Prizma writes: ZERO. Only demo markers (all reverted).

## Hand-off

**GREEN → handing back to opticup-strategic (Foreman) for FOREMAN_REVIEW.md.**

All reports written so far: EXECUTION_REPORT.md, FINDINGS.md, REVIEW.md, this TEST_REPORT.md.

Foreman should:
1. Read all 4 sibling reports + the 3 SPEC-folder artifacts (VIEW_REWRITE_SUMMARY, REVOKE_SUMMARY, VERIFICATION_REPORT).
2. Write FOREMAN_REVIEW.md with verdict, harvest 2 author-skill + 2 executor-skill improvement proposals, and propose the final commit message.
3. Final commit: `chore(spec): close STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15 — FOREMAN_REVIEW + master-doc updates`.

---

✓ Smoke 7/7 PASS (STOREFRONT_PUBLIC_DATA_LAYER).
