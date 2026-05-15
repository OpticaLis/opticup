# FINDINGS — SECURITY_HOTFIX_3_2026_05_15

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-15

This file logs issues discovered DURING execution that were NOT in this SPEC's scope. Per Rule "one concern per task", they were NOT fixed inline. Each finding has severity + location + description + suggested next action.

---

## F-1 — LOW — `v_crm_lead_first_touch` has `anon_has_select=true` (admin-purpose view)

- **Severity:** LOW (admin-purpose data; not actively exposed by storefront).
- **Location:** view `public.v_crm_lead_first_touch` (oid lookup in `pg_class`).
- **Description:** Pre-flight probe (Foreman stage, before SPEC seal) revealed `v_crm_lead_first_touch` has `anon_has_select=true` AND `security_invoker=true`. The view shows CRM lead first-touch attribution — admin-purpose data, NOT storefront-public. Anon should not have SELECT on it.
- **Why NOT in this SPEC's scope:** The view already has `security_invoker=true`, so the Supabase security advisor does NOT flag it under `security_definer_view` (F-CRIT-2). Closing it doesn't reduce F-CRIT-2 advisor count. Per activation prompt STT "Advisor returns NEW findings beyond closing F-CRIT-2/3 → STOP", touching this would be a scope expansion (not advisor-list-aligned).
- **Suggested next action:** Add to `SECURITY_HOTFIX_4` §1.5 (or §1.3 if HOTFIX_4 has an admin lockdown section). One-line REVOKE: `REVOKE SELECT ON public.v_crm_lead_first_touch FROM anon;`. Already documented in `SECURITY_HOTFIX_4_BRIEF.md` §1.5.

---

## F-2 — MEDIUM — `increment_paid_amount` had NO tenant_id check pre-HOTFIX_3 (pre-existing security bug, CLOSED in this SPEC)

- **Severity:** MEDIUM (closed within this SPEC, but logging because the root cause is older than HOTFIX_3).
- **Location:** function `public.increment_paid_amount(p_doc_id uuid, p_delta numeric)`.
- **Description:** Body inspection showed NO tenant_id check, NO `SET search_path`, and `anon_execute=true` before HOTFIX_3. Pre-HOTFIX_3, anon (or any authenticated user with any JWT) could have called this with ANY `p_doc_id` and updated `supplier_documents.paid_amount` regardless of tenant ownership.
- **Why this is logged separately:** The bug is PRE-EXISTING (older than HOTFIX_3). HOTFIX_3's §1.5 Option B added a 3-role-aware Block A (tenant derived via `supplier_documents.tenant_id` JOIN) + `SET search_path` + REVOKE anon EXECUTE. So the bug is now closed — but the root cause (function landed without a Block A originally) deserves a post-mortem question: were there other RPCs that landed in the same era with the same gap?
- **Suggested next action:** Audit ALL SECURITY DEFINER functions created before 2026-03-01 (early project era) for similar missing-Block-A bugs. Sweep would be a 1-hour Foreman + Executor pair-up; pre-flight via `SELECT proname FROM pg_proc WHERE prosecdef=true AND proconfig IS NULL AND prosrc NOT LIKE '%request.jwt.claims%'`. Logged as candidate for `SECURITY_AUDIT_PRE_2026_03_RPCS` SPEC.

---

## F-3 — MEDIUM — `increment_prepaid_used` had same gap as F-2 (CLOSED in this SPEC)

- **Severity:** MEDIUM. CLOSED via this SPEC's §1.5 Block A addition.
- **Location:** function `public.increment_prepaid_used(p_deal_id uuid, p_delta numeric)`.
- **Description:** Same pattern as F-2 — NO tenant check, NO search_path, anon_execute=true pre-HOTFIX_3. Closed by §1.5 with Block A using `prepaid_deals.tenant_id` JOIN.
- **Suggested next action:** Bundle with F-2 into the `SECURITY_AUDIT_PRE_2026_03_RPCS` audit SPEC.

---

## F-4 — INFO — `mark_translations_stale` had same gap as F-2/F-3 (CLOSED in this SPEC)

- **Severity:** INFO. CLOSED via this SPEC's §1.5.
- **Location:** function `public.mark_translations_stale(p_page_id uuid, p_changed_blocks text[])`.
- **Description:** Same root-cause class as F-2 + F-3 — translation tooling RPC that landed without Block A or search_path. Closed by §1.5 with Block A using `storefront_pages.tenant_id` JOIN.
- **Suggested next action:** Same as F-2 + F-3 — bundle into audit SPEC.

---

## F-5 — HIGH — `SECURITY_HOTFIX_4` follow-up declared (8 deferred views + 5 deferred base tables)

- **Severity:** HIGH (closes the residual F-CRIT-2 gap from this SPEC's Option B path).
- **Location:** declared in `SECURITY_HOTFIX_4_BRIEF.md` (stub created in this SPEC's Commit 1).
- **Description:** HOTFIX_3's Option B path explicitly defers 8 storefront views (v_public_tenant, v_storefront_branches, v_storefront_brand_page, v_storefront_brands, v_storefront_categories, v_storefront_config, v_storefront_media, v_storefront_products) and 5 base tables (brands, inventory, media_library, tenant_branches, storefront_config) whose RLS expansions are needed to enable the view flips.
- **Why HIGH:** Until HOTFIX_4 ships, F-CRIT-2 advisor shows 8 open ERROR-level findings.
- **Suggested next action:** Architect to flesh out the stub Brief into a full Brief next session. Key open design decision: whether to GRANT SELECT TO anon on `inventory` (Prizma's most sensitive table) is itself an architectural decision — column-restricted GRANT recommended.

---

## F-6 — LOW — Iron Rule 32 destructive-ops hook false-positive on comments

- **Severity:** LOW (workaround works, but the hook has a real defect).
- **Location:** `scripts/checks/destructive-ops-declared.mjs` (line/logic that scans staged diffs).
- **Description:** Commit 5 (HOTFIX_3 §1.1 base-table RLS expansion) was initially blocked because the migration SQL file contained a comment "Rollback per-table: DROP POLICY + REVOKE SELECT (storefront_pages_anon_read stays — pre-existing)". The regex flagged "DROP POLICY" as an undeclared destructive op even though the line started with `--` (SQL comment).
- **Why it's a defect:** SQL comments are not executed. The hook treats them as active SQL → false positive → blocks commits with documentation that mentions destructive ops by name.
- **Workaround used:** Edited the comment to reference the backup folder instead of inlining the rollback DDL phrasing.
- **Suggested next action:** Open SPEC `IRON_RULE_32_HOOK_COMMENT_AWARENESS` (~1-hr Executor task). Update `destructive-ops-declared.mjs` to skip lines starting with `--` (SQL) and `#` (shell/python) and `//` (JS) before applying the destructive-pattern regex. Add a regression test covering "DROP POLICY in a comment should NOT trigger block".

---

## F-7 — LOW — `register_lead_to_event` had weak Block A variant before HOTFIX_3 (also CLOSED)

- **Severity:** LOW. CLOSED in this SPEC's §1.5.
- **Location:** function `public.register_lead_to_event(p_tenant_id uuid, ...)`.
- **Description:** Pre-flight body inspection showed the function had a weaker Block A variant — NO service_role bypass. Pattern: `IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN RAISE ...`. This would have rejected service_role callers (who have no `tenant_id` JWT claim → v_jwt_tenant=NULL → RAISE fires). The function is supposed to be callable by Edge Functions running as service_role; the weak Block A broke that path.
- **Why this is logged:** Pre-existing issue — when register_lead_to_event was originally hardened (likely an earlier sweep), the canonical 3-role-aware pattern hadn't been codified yet. HOTFIX_2 then added the canonical pattern (per `JWT_VALIDATION_HEADER.sql`); HOTFIX_3 upgraded register_lead_to_event to it.
- **Suggested next action:** Same audit-SPEC bundle as F-2/F-3 — sweep for weak-Block-A variants across all `prosecdef=true AND prosrc LIKE '%jwt_tenant%' AND prosrc NOT LIKE '%IS DISTINCT FROM%service_role%'` RPCs. Closes the regression class entirely.

---

## F-8 — LOW — `resolve_touchpoints_to_lead` had weakest Block A variant (CLOSED)

- **Severity:** LOW. CLOSED in this SPEC's §1.5.
- **Location:** function `public.resolve_touchpoints_to_lead(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text)`.
- **Description:** Pre-flight body inspection showed the WEAKEST Block A variant — `IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant <> p_tenant_id THEN RAISE`. Anon callers (no JWT, v_jwt_tenant=NULL) would PASS THROUGH this guard entirely. The function would then UPDATE `crm_lead_touchpoints` with potentially attacker-controlled tenant_id + lead_id.
- **Why CLOSED in this SPEC:** §1.5 upgraded to canonical 3-role-aware Block A. Now anon is blocked (also REVOKED at GRANT layer).
- **Suggested next action:** Same audit-SPEC bundle as F-7. The "IS NOT NULL AND" pattern is searchable.

---

## Summary

- **CLOSED in this SPEC (5):** F-2, F-3, F-4, F-7, F-8 — all pre-existing security bugs that HOTFIX_3's §1.5 Block A additions closed as collateral.
- **Carried forward (3):** F-1 (admin-cohort REVOKE in HOTFIX_4), F-5 (HOTFIX_4 itself), F-6 (Iron Rule 32 hook comment-awareness — separate small SPEC).
- **Suggested NEW SPECs:** 2 — `SECURITY_HOTFIX_4` (already stubbed) + `SECURITY_AUDIT_PRE_2026_03_RPCS` (bundle F-2/F-3/F-4/F-7/F-8 root-cause audit).

End of FINDINGS.
