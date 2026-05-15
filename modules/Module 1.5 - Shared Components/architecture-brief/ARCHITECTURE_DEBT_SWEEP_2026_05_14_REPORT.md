# ARCHITECTURE_DEBT_SWEEP_2026_05_14 — Report

**Tier:** T5.1 of OVERNIGHT_BUNDLE_2_2026_05_14
**Date:** 2026-05-14 (overnight Bundle 2)
**Method:** 2 parallel read-only sub-agents — one for DB dimensions (SQL via Supabase MCP), one for code dimensions (grep/Read on `C:\Users\User\opticup`).
**Aggregator:** opticup-strategic (Foreman).
**Tenant scope:** READ ONLY — zero writes performed.

---

## 1. Top 3 findings (most urgent — Daniel morning review)

1. **CRITICAL — 17 of 35 public views lack `security_invoker=on`** (49% non-compliant). Includes every storefront-facing view (`v_storefront_blog_posts`, `v_storefront_products`, etc.) + `v_ai_content`, `v_content_translations`, `v_crm_event_stats`, `v_public_tenant`. Repeat of the exact security-bug class that `SECURITY_HOTFIX_2026_05_13` was created to fix — the hotfix patched a subset; this is the long tail.

2. **CRITICAL — `sync_lead_status_from_attendee` regression today (2026-05-14)** — the M4 sync RPC hotfix dropped `SET search_path` from the function definition, stripping the supply-chain hardening the prior 2026-05-13 version had. Live function on Supabase is hardening-stripped right now.

3. **HIGH — `auth_sessions.token` + `short_links.code` UNIQUE constraints not tenant-scoped** (Iron Rule 18 violation). Cross-tenant token collisions block session creation for tenant #2; short-code collisions prevent two tenants using same `/r/promo`. Direct SaaS-litmus failure.

---

## 2. DB dimensions (sub-agent a3d74d637edd41e29)

| Dim | Severity | Count | Suggested SPEC |
|---|---|---|---|
| **1. `updated_at` triggers missing** | MEDIUM | **37 tables** (T6 reported 57 — see note) | `M1_5_UPDATED_AT_TRIGGERS_FLEET` |
| **2. RLS canonical-pattern deviations** | HIGH | 3 real (+ ~7 missing service_bypass) | `M1_5_RLS_CANONICAL_SWEEP` |
| **3. UNIQUE not tenant-scoped** | HIGH | 7 (2 critical: `auth_sessions.token`, `short_links.code`) | `M1_5_UNIQUE_TENANT_SCOPED_SWEEP` |
| **4. Missing index on `tenant_id`** | HIGH | 14 tables | `M1_5_TENANT_ID_INDEX_FLEET` |
| **5. Views without `security_invoker=on`** | **CRITICAL** | **17 of 35 (49%)** | `M1_5_VIEW_SECURITY_INVOKER_SWEEP` |

*Note: T5 counts 37 `updated_at`-missing tables; T6 Part 1 counts 57. Discrepancy: T5 scoped to tenant_id-bearing tables only; T6 counted all tables with `updated_at` columns. Both numbers are valid for their respective scopes; the T6 number is the larger SaaS-readiness measure.*

### Dim 3 detail (UNIQUE not tenant-scoped):
1. `auth_sessions.auth_sessions_token_key` — `UNIQUE(token)`. **CRITICAL.**
2. `short_links.short_links_code_unique` — `UNIQUE(code)`. **HIGH.**
3-7. `employee_roles_pkey`, `conversation_participants_*`, `document_links_*`, `message_reactions_*`, `payment_allocations_*` — **LOW** (FK-bound, parent already tenant-scoped).

### Dim 5 detail (security_invoker):
All 11 `v_storefront_*` views + `v_ai_content` + `v_content_translations` + `v_crm_event_stats` + `v_public_tenant` + `v_tenant_i18n_overrides` + `v_translation_dashboard`. Each runs with view-owner perms not caller's — bypasses RLS — exact `SECURITY_HOTFIX_2026_05_13` class.

---

## 3. Code dimensions (sub-agent ac97c2f309986e5a2)

| Dim | Severity | Count | Suggested SPEC |
|---|---|---|---|
| **A. Hardcoded business values — brand identity** | HIGH | 3 (access-sync, admin-platform portal URL, EF CORS) | `ACCESS_SYNC_DETENANT`, `PORTAL_HOST_CONFIG`, `EF_CORS_TENANT_ORIGINS` |
| **B. Hardcoded currency** | HIGH×2 + MEDIUM×3 + LOW×3 | 8 sites | `CURRENCY_FORMATTER_UNIFICATION` (umbrella) |
| **C. VAT rate hardcodes** | clean | 0 | — |
| **D. Phone literals** | clean | 0 | — |
| **E. EF-bundled SQL search_path missing** | CRITICAL+HIGH+MEDIUM | 1 today's regression + 2 legacy RPCs | `M4_SYNC_RPC_SEARCH_PATH_RESTORE` (urgent) + `RPC_SEARCH_PATH_HARDENING` (broader) |

### Critical regression detail (Dim E):
`supabase/migrations/20260514193000_m4_sync_rpc_not_found_idiom.sql:16-17` — today's M4 hotfix replaced `sync_lead_status_from_attendee` with `SECURITY DEFINER` but stripped `SET search_path` that the prior 2026-05-13 version had. **Live function on Supabase right now is hardening-stripped.** Fix: one-line `ALTER FUNCTION ... SET search_path = public`. Trivial effort, urgent priority.

### Currency findings (Dim B) breakdown:
- HIGH: 4 sites in `modules/debt/` INSERT hardcoded `currency: 'ILS'`
- HIGH: `shared/js/table-builder.js:29` formatter hardcoded
- MEDIUM: 5 sites with literal `'₪'` glyph in formatters
- MEDIUM: `modules/debt/ai/ai-ocr-review.js:40` hardcoded `['ILS','USD','EUR']` dropdown
- LOW: 4 fallback defaults `?? 'ILS'`
- LOW: Studio block schema default

---

## 4. Roll-up

**Total findings:** 2 CRITICAL + 8 HIGH + 8 MEDIUM + 6 LOW = **24 findings** across 7 dimensions (2 dimensions clean: VAT rate, phone literals).

**Recommended fix order** (by SaaS-readiness + security blast radius):
1. `M4_SYNC_RPC_SEARCH_PATH_RESTORE` (one-line ALTER FUNCTION, urgent)
2. `M1_5_VIEW_SECURITY_INVOKER_SWEEP` (17 ALTER VIEWs + regression tests)
3. `M1_5_UNIQUE_TENANT_SCOPED_SWEEP` (#1 + #2 critical, 5 lower-risk follow-ups)
4. `M1_5_TENANT_ID_INDEX_FLEET` (14 CREATE INDEX CONCURRENTLY, additive)
5. `M1_5_RLS_CANONICAL_SWEEP` (jsonb→json + service_bypass backfill)
6. `M1_5_UPDATED_AT_TRIGGERS_FLEET` (consolidates with T6's 57-table version)
7. Currency consolidation umbrella SPEC
8. Brand-identity de-prizmification (access-sync + portal + CORS)
9. `RPC_SEARCH_PATH_HARDENING` (legacy RPCs)

**Tenant scope:** zero writes. Pure read-only audit. Findings drive future SPECs.

---

## 5. Self-improvement

What worked: parallel sub-agent split (DB vs code) avoided sub-agents fighting over the same SQL probes. Each sub-agent's per-dimension report-card format was easy to merge.

What to improve: the DB sub-agent's "37 missing updated_at triggers" vs T6's "57 missing" discrepancy could have been pre-coordinated. Future audits should declare the SCOPE of each dimension's count up front (tenant_id-bearing only vs all tables).

End of report.
