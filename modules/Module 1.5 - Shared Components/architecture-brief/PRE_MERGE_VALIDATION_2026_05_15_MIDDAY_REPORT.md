# PRE-MAIN-MERGE VALIDATION REPORT — 2026-05-15 midday

**Run date:** 2026-05-15 (midday, ~12:30 local).
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_15_MIDDAY_BRIEF.md`
**Type:** Read-only pre-merge gate (no SPEC chain ceremony).
**Tester:** Claude Code (Windows desktop) — `opticup-localhost-tester` skill loaded; Supabase MCP for advisor + pg queries.
**Repo / branch / HEAD:** `opticalis/opticup` / `develop` / `deae71d` (`chore(skills): apply SECURITY_HOTFIX_2 harvest`).
**Verdict:** 🟡 **CONDITIONALLY GREEN — all 10 technical checks PASS; one SCOPE DEVIATION requires Daniel's decision before merge.**

---

## Executive summary

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Working tree status | ⚠️ WARNING-acceptable | Pre-existing 7 modified + ~40 untracked architecture-brief / role-handoff drafts from earlier sessions. No HOTFIX_2 outputs uncommitted. |
| 2 | `npm run verify:integrity` | ✅ PASS | 129 files scanned in 7ms (Iron Rule 31 gate). |
| 3 | ERP :3000 + Storefront :4321 | ✅ PASS | ERP 200 / 18,870 bytes. Storefront `/` 200 / 376,788 bytes. `/supersale/` 200 / 323,742 bytes. |
| 4 | `npm run smoke` | ✅ PASS | 7/7 on demo. |
| 5a | F-CRIT-1 still active (`sync_lead_status_from_attendee` proconfig) | ✅ PASS | `proconfig = {search_path=public}` — present. |
| 5b | F-CRIT-2 partial: 2 fixed views still have `security_invoker=on` | ✅ PASS | `v_storefront_reviews.reloptions = {security_invoker=on}`; `v_storefront_components.reloptions = {security_invoker=on}`. |
| 5c | F-CRIT-3 sample: 3 of 24 hardened RPCs still have JWT header + Block A 3-role-aware | ✅ PASS | Sampled `submit_storefront_lead`, `generate_daily_alerts`, `sync_lead_status_from_attendee` — all 3 contain `request.jwt.claims`, `service_role` bypass, `tenant_id mismatch` strict check, and `search_path=public`. |
| 6 | Storefront probe — `/` + `/supersale` HTTP 200 with non-empty body | ✅ PASS | Both >300KB; deferred-views still serving anon content. |
| 7 | 3 deferred views still WITHOUT `security_invoker=on` (sanity) | ✅ PASS | `v_storefront_blog_posts.reloptions = NULL`, `v_storefront_pages.reloptions = NULL`, `v_storefront_products.reloptions = NULL` — correctly deferred state. |
| 8 | `git diff origin/main..develop --stat` | ⚠️ SCOPE-DEVIATION | **29 commits** instead of brief-expected 5. Composition: 5 HOTFIX_2 + 10 M1B0_PURCHASE_ORDER_SCHEMA + 14 M1A_OPERATIONS_RPCS_FIX. M1A + M1B0 are fully-closed SPECs from parallel sessions today (post morning PR #82 merge). |
| 9 | `git merge-tree` conflict prediction | ✅ PASS | 0 actual conflict markers. The 33 "added in remote" entries are new files in develop with no main counterpart — clean fast-forward. |
| 10 | Supabase advisor — F-CRIT-1 gone, F-CRIT-2 17→15, F-CRIT-3 in-scope subset gone | ✅ PASS (per design) | Advisor counts: F-CRIT-1 (`function_search_path_mutable` on sync_lead… ) GONE. F-CRIT-2 (`security_definer_view` count): 17 → **15** ✓. F-CRIT-3 in-scope: 1 still open (`verify_campaign_page_password` — Option A retained per SPEC). NO NEW LINT TYPES. |

**Bottom line:** All 10 technical gates green. The one orange flag is **scope, not safety**: develop has 29 commits over origin/main, not 5. The 24 surprise commits are NOT regressions — they are M1A_OPERATIONS_RPCS_FIX (14 commits) and M1B0_PURCHASE_ORDER_SCHEMA (10 commits), both fully-closed SPECs from parallel sessions today, each with its own EXECUTION_REPORT + REVIEW + TEST_REPORT + FOREMAN_REVIEW. Daniel decides: bundle them or cherry-pick HOTFIX_2 only.

---

## 1. F-CRIT-1 verification — DETAILS

`sync_lead_status_from_attendee` proconfig check:

```sql
SELECT proname, proconfig FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname='public' AND p.proname='sync_lead_status_from_attendee';
-- [{"proname":"sync_lead_status_from_attendee","proconfig":["search_path=public"]}]
```

`proconfig = {search_path=public}` — **present**. F-CRIT-1 closed and STAYS closed.

---

## 2. F-CRIT-2 partial verification — DETAILS

The 2 views fixed in HOTFIX_2 §1.2 v2:

```sql
SELECT relname, reloptions FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname='public' AND c.relkind='v'
  AND c.relname IN ('v_storefront_reviews','v_storefront_components');
-- [{"view_name":"v_storefront_components","reloptions":["security_invoker=on"]},
--  {"view_name":"v_storefront_reviews","reloptions":["security_invoker=on"]}]
```

Both **STILL** carry `security_invoker=on`. Storefront still operational (`/` 200, `/supersale/` 200, see §4).

### 2a. 3 deferred views still in deferred state (sanity)

Sampled 3 of 15 deferred views; all 3 have `reloptions = NULL` — i.e., they did NOT accidentally receive `security_invoker=on`:

```sql
-- v_storefront_blog_posts:   reloptions=NULL
-- v_storefront_pages:        reloptions=NULL
-- v_storefront_products:     reloptions=NULL
```

No accidental over-application. The 15 deferred views remain queued for SECURITY_HOTFIX_3.

---

## 3. F-CRIT-3 sample verification — DETAILS

3 of the 24 hardened RPCs sampled. All 3 carry the full Block A pattern:

| RPC | JWT-claim ref | service_role bypass | strict mismatch check | search_path=public |
|---|---|---|---|---|
| `submit_storefront_lead` | ✓ | ✓ | ✓ | ✓ |
| `generate_daily_alerts` | ✓ | ✓ | ✓ | ✓ |
| `sync_lead_status_from_attendee` | ✓ | ✓ | ✓ | ✓ |

```sql
-- Direct check:
SELECT proname,
  pg_get_functiondef(oid) ILIKE '%request.jwt.claims%' AS has_jwt_claim,
  pg_get_functiondef(oid) ILIKE '%service_role%'     AS has_service_role_bypass,
  pg_get_functiondef(oid) ILIKE '%tenant_id mismatch%' AS has_strict_check,
  proconfig
FROM pg_proc ... WHERE proname IN (...);
-- All 3 rows: true / true / true / [search_path=public]
```

F-CRIT-3 closure persists.

### 3a. F-CRIT-3 residual count

DB-wide count of SECURITY DEFINER RPCs with `p_tenant_id` parameter but no `request.jwt.claims` reference:

```sql
SELECT count(*)
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='public' AND p.prosecdef
  AND pg_get_function_arguments(p.oid) ILIKE '%p_tenant_id%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%request.jwt.claims%';
-- 1
```

The 1 remaining is `verify_campaign_page_password`. Per HOTFIX_2 EXECUTION_REPORT §6 (and SPEC §3b), this RPC is **Option A — Block A-alt slug validation** by deliberate design (anon callers verify a campaign-page password by slug; JWT claim would defeat the purpose). Not a regression.

---

## 4. Storefront probe — DETAILS

```
curl -s -o /dev/null -w "%{http_code}|%{size_download}\n" http://localhost:4321/
-> 200|376788

curl -s -o /dev/null -w "%{http_code}|%{size_download}\n" http://localhost:4321/supersale/
-> 200|323742
```

Both 200; both >1 KB; both >300 KB actually (full pages rendered). The HOTFIX_2 v1 §1.2 storefront-outage scenario (when `security_invoker=on` was prematurely applied to 10 views) is NOT happening here — the 15 deferred views still serve anon SELECTs as intended.

---

## 5. `npm run smoke` — DETAILS

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (842ms)
  PASS  2. Create CRM lead succeeds (M4)  (150ms)
  PASS  3. Read inventory count for demo tenant (M1)  (115ms)
  PASS  4. Storefront homepage returns 200  (1577ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (955ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (125ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1025ms)

7/7 passed, 0 failed
```

---

## 6. Supabase advisor delta — DETAILS

| Lint name | Level | Morning (2026-05-15 09:45) | Midday (this report) | Delta | Status |
|---|---|---|---|---|---|
| `function_search_path_mutable` | WARN | 30 | **23** | **-7** | ✓ HOTFIX_2 collateral hardening (D-4: 7 RPCs gained `SET search_path` during the §1.3 CREATE OR REPLACE). |
| `security_definer_view` | ERROR | 17 | **15** | **-2** | ✓ F-CRIT-2 partial closure (2 views fixed). |
| `authenticated_security_definer_function_executable` | WARN | 57 | **60** | **+3** | ⚠️ M1B0_PURCHASE_ORDER_SCHEMA added 5 new SECURITY DEFINER RPCs; 3 of them gained `authenticated` EXECUTE. Same finding class — NO NEW LINT TYPE. Parallel-scope expansion, not a HOTFIX_2 regression. |
| `anon_security_definer_function_executable` | WARN | 43 | **17** | **-26** | ✓ HOTFIX_2 §1.3 Option B revokes (16) + M1A's `REVOKE EXECUTE on 10 Phase 1A SECDEF` (commit 279b12b). Both intended. |
| `extension_in_public` | WARN | 2 | 2 | 0 | Carry. |
| `public_bucket_allows_listing` | WARN | 1 | 1 | 0 | Carry (`inventory-images` / `tenant-logos` per M-NEW-28-2). |
| `auth_leaked_password_protection` | WARN | 1 | 1 | 0 | Carry. |
| **TOTAL** | — | 151 | **119** | **-32** | Net security posture improved by 32 findings. |

**NO NEW LINT TYPES.** Per brief criterion 10. The `authenticated_security_definer +3` is in an existing finding class, caused by M1B0's new RPCs (not a HOTFIX_2 side effect).

---

## 7. Merge-tree conflict prediction — DETAILS

```
git merge-tree $(git merge-base origin/main develop) origin/main develop
```

Strict-grep results:

| Marker | Count | Interpretation |
|---|---|---|
| `<<<<<<<` / `>>>>>>>` / `=======` | **0** | No actual conflict hunks emitted. |
| `changed in both` | **0** | No file modified on both sides. |
| `added in both` | **0** | No path created on both sides with different content. |
| `removed in remote/local` | **0** | No delete-vs-modify conflicts. |
| `added in remote` | 33 | New files in develop, absent in main. **NOT a conflict** — fast-forward additions. |

Clean fast-forward predicted.

---

## 8. Git diff + commit composition (SCOPE DEVIATION)

The brief assumed 5 commits since the morning merge (PR #82, 09:55 today). Reality:

```
git log origin/main..develop --oneline | wc -l → 29
```

**Commit breakdown:**

### 8a. SECURITY_HOTFIX_2 (5 commits — in brief scope)
```
deae71d chore(skills): apply SECURITY_HOTFIX_2 harvest — JWT canonical reference + …
e5c9ee9 docs(security): close SECURITY_HOTFIX_2 pipeline — REVIEW + TEST_REPORT + …
47f9967 docs(security): close SECURITY_HOTFIX_2 — EXECUTION_REPORT + FINDINGS + …
40cde93 feat(security): SECURITY_HOTFIX_2 §1.1 + §1.2 + §1.3 applied to live DB
566e810 chore(spec): seal SECURITY_HOTFIX_2_2026_05_15 SPEC + RESOLVED escalations
```

### 8b. M1B0_PURCHASE_ORDER_SCHEMA (10 commits — parallel-session SPEC)
Closed today via Full-Auto Pipeline. Per FOREMAN_REVIEW 🟢:
```
941dc0c chore(spec): close M1B0_PURCHASE_ORDER_SCHEMA 🟢 — FOREMAN_REVIEW + MASTER_ROADMAP
5d2c421 chore(spec): M1B0_PURCHASE_ORDER_SCHEMA Reviewer verification — 🟢 PASS
af3a2fa chore(spec): close M1B0_PURCHASE_ORDER_SCHEMA — EXECUTION_REPORT + FINDINGS + …
bb39599 test(m1): demo functional smoke — 6/6 PASS (M1B0 schema + RPCs + K2 debt wiring)
46ff2d2 feat(shared): T-constants + FIELD_MAP for 3 new M1B0 tables
362a330 feat(m1,rpc): create m1_create_supplier_debt_from_receipt + wire K2 (D-M1-11)
441c1f7 feat(m1,rpc): create 4 PO RPCs (next_purchase_order_number, place, mark_sent, cancel)
621b807 feat(m1,schema): add FK back-pointers stock_lot + purchase_receipt → purchase_order
df338c4 feat(m1,schema): create purchase_order + purchase_order_line + supplier_debt tables
0c23a15 chore(spec): open M1B0_PURCHASE_ORDER_SCHEMA — SPEC + ROLLBACK skeleton
```

### 8c. M1A_OPERATIONS_RPCS_FIX (14 commits — parallel-session SPEC)
Closed today via Full-Auto Pipeline. Per FOREMAN_REVIEW 🟢:
```
a29b93d chore(spec): close M1A_OPERATIONS_RPCS_FIX 🟢 — FOREMAN_REVIEW + MASTER_ROADMAP + TECH_DEBT
5deb8fa chore(spec): M1A_OPERATIONS_RPCS_FIX Reviewer verification — 🟢 PASS
a528cf2 chore(spec): close M1A_OPERATIONS_RPCS_FIX — EXECUTION_REPORT + FINDINGS + …
cc95157 test(m1): demo functional smoke — 6/6 PASS (receipt + transfer + adjustment_found + …)
60d4cd2 fix(m1,rpc): record_adjustment_found — correct 20-arg overflow + position-11 self-ref
826fc12 fix(m1,rpc): record_transfer — pass 19 positional args to inner record_stock_movement
7e52bb8 chore(supabase): config.toml — add [functions.lens-catalog-import] verify_jwt=true
474cc6b fix(ef,sec): lens-catalog-import — invert gate to fail-closed
8fe2a1a fix(m1,m9): pending_lens_advancement_queue idempotency — UNIQUE + K3 trigger
18697f4 fix(m1,sec): v_suppliers_for_m9 — REVOKE default anon/PUBLIC grants (Iron Rule 13)
0024dd3 fix(m1,sec): next_lens_variant_display_id — JWT-not-null guard inside function body
279b12b fix(m1,sec): REVOKE EXECUTE on 10 Phase 1A SECDEF functions + selective re-GRANT
54ede72 fix(m1,rpc): record_stock_movement — skip lot update on creation movements
b0d44c1 chore(spec): open M1A_OPERATIONS_RPCS_FIX — SPEC + MIGRATION + ROLLBACK
```

### 8d. Scope-deviation assessment

The brief said: *"More than 5 + N (where N = parallel-session commits documented in morning) commits surface → STOP, identify the surprise commits."*

The morning report (`PRE_MERGE_VALIDATION_2026_05_15_MORNING_REPORT.md`) does **not** document M1A_OPERATIONS_RPCS_FIX or M1B0_PURCHASE_ORDER_SCHEMA as anticipated parallel-session work. They were opened and closed AFTER the morning merge (PR #82). Both ran the full 5-stage Full-Auto Pipeline (SPEC → Executor → Reviewer → Localhost-Tester → Foreman) and both close 🟢. They are **shippable** but **out of scope of this validation's brief**.

**Three options for Daniel:**

1. **Bundled merge (RECOMMENDED — minimum churn):** open a PR for the full 29-commit batch. Title proposal in §9. Pro: one merge, three SPECs landed together; Con: scope is wider than the brief contemplated.
2. **HOTFIX_2-only cherry-pick:** create a feature branch from origin/main containing only the 5 HOTFIX_2 commits, open PR from that. Pro: matches brief scope exactly; Con: M1A + M1B0 stay unmerged until a follow-up validation, adding work + risk of drift.
3. **Two sequential PRs:** PR-A = HOTFIX_2 (5 commits) from a temporary branch; PR-B = M1A + M1B0 (24 commits) from another temporary branch. Pro: clean per-SPEC audit trail; Con: highest churn.

**My recommendation: Option 1.** M1A and M1B0 are both fully closed under the same Pipeline discipline (their own reviewer + localhost-tester + foreman). The full smoke suite passes. The advisor counts are healthier net-net. Bundling is the lowest-risk path.

---

## 9. Proposed PR title (Option 1 — bundled merge)

```
develop → main: SECURITY_HOTFIX_2 (F-CRIT-1 + F-CRIT-3 closed; F-CRIT-2 2/17, 15 deferred to HOTFIX_3) + M1A_OPERATIONS_RPCS_FIX + M1B0_PURCHASE_ORDER_SCHEMA
```

**Tags (optional, for PR body):** `security`, `hotfix`, `m1`, `m1.5`, `m4`, `purchase-orders`, `supplier-debt`, `pipeline-full-auto`.

**Pre-merge safety summary:**
- Iron Rule 31 integrity gate: exit 0.
- Smoke: 7/7 PASS on demo.
- Merge-tree: 0 conflicts.
- Advisor: -32 findings net (151 → 119); 0 new lint types.
- F-CRIT-1 / F-CRIT-2 partial / F-CRIT-3 closure persists.
- Storefront: anon-callable pages 200 with full content (no outage from HOTFIX_2 §1.2 v1 rollback).

**Decision is Daniel's.** This report is recommendation-only.

---

## 10. Notes for follow-up

1. **SECURITY_HOTFIX_3 stays queued.** 15 deferred views + their base-table RLS expansions. Per HOTFIX_2 FINDINGS F-1.
2. **`verify_campaign_page_password`** is the lone surviving F-CRIT-3 residual; Option A by design (slug-based, anon-callable). Not a future regression target.
3. **M1B0's +3 to `authenticated_security_definer_function_executable`** — track in the next SaaS-readiness sweep (same class as M-5 carry alert). No new lint type, but the new RPCs now appear in the advisor list.
4. **Brief vs. reality mismatch:** the brief's "5 commits since morning merge" assumption did not account for M1A + M1B0 closing during the same window. Future midday-validation briefs should explicitly list known-in-flight SPECs OR widen the trigger threshold via the `+N parallel-session commits documented in morning` slot.
5. **Pre-existing working-tree dirt:** ~40 untracked architecture-brief drafts + 7 modified role-artifact files exist and have existed across multiple sessions today. Per CLAUDE.md §9, these are user-managed pre-existing state, not this validation's concern. Daniel may want a "session-end clean-repo" sweep at some point.

---

*End of report. Demo tenant unchanged this run — no test artifacts created. All checks were read-only SQL + pg_class / pg_proc inspection + HTTP HEAD probes. No DB writes. No commits. No deploys. No file edits beyond this report.*
