# Security Hotfix 2026-05-13 — Brief

**Brief version:** v1
**Date:** 2026-05-13
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~3-4 hours)
**Model preference:** Opus (production security DDL + EF refactor + non-trivial diagnosis)
**Cross-module:** Module 2 (Platform Admin, owns tenant + admin views) + Module 3 (Storefront, owns submit_storefront_lead) + Module 4 (CRM, owns most affected RPCs). Brief lives under Module 2 since it spans 2+3+4.

---

## 1. Purpose

The Supabase Security Advisor audit (`docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md`) flagged 9 LIVE-CUSTOMER-HARM + 11 STAFF-DATA-HARM findings. Daniel approved a single bundled hotfix SPEC closing them all in one Claude Code run, with answers to all 7 open questions provided.

The findings cluster into 7 work areas. This Brief covers all of them in one SPEC.

---

## 2. Daniel's Decisions on the 7 Open Questions (locked)

These are the ARCHITECT-DANIEL agreements from 2026-05-13. The Pipeline must follow them verbatim — do NOT relitigate during execution.

| # | Topic | Decision |
|---|---|---|
| 1 | `_backup_brand_gallery_20260417` | **DROP** the table entirely. No code references it. |
| 2 | `submit_storefront_lead` anon path | **Option B** — move the call behind an Edge Function. The storefront posts to the EF, the EF resolves the tenant from request Origin/Referer (or trusted slug param) and inserts as `service_role`. Revoke anon EXECUTE on the RPC. |
| 3 | `create_tenant` anon EXECUTE | **REVOKE.** Self-signup is a future capability; today only platform-admin creates tenants. The future self-signup design will be a separate Module 2 SPEC with CAPTCHA + email/SMS verification + rate limiting + possibly initial payment. |
| 4 | `v_storefront_*` anon-view cross-tenant exposure | **DEFER to SaaS-readiness program before tenant #2 onboards.** Out of scope for this hotfix. Note in TECH_DEBT. |
| 5 | `tenant-logos` storage path convention | Execute as a **pre-step** within this SPEC. Audit current storage paths for both tenants (Prizma + Demo). If any logo is not at `<tenant_id>/<filename>`, move it before applying the policy. |
| 6 | May-6 anon-REVOKE migration vs current state | Execute a **pre-step investigation** within this SPEC: inventory which RPCs the May-6 migration targeted vs which still have anon EXECUTE. Report findings inline. Then apply the corrected REVOKEs in the same SPEC. |
| 7 | `security_invoker` Postgres-version compatibility | Execute a **pre-step check** to confirm Postgres ≥ 15 on prizma-optic project. If less, STOP and escalate. Expected: PG15+ (Supabase has been on PG15 since mid-2024). |

---

## 3. Scope — Seven Work Areas

### 3.1 DROP orphan backup table
- `DROP TABLE IF EXISTS public._backup_brand_gallery_20260417;`
- Confirm no references in code first (`grep -r "_backup_brand_gallery_20260417"`). Expected: 0 hits outside the audit report itself.
- Single migration file. Destructive: declared per Iron Rule 32.

### 3.2 `submit_storefront_lead` — Edge Function front-door
- New EF `submit-lead` (or reuse existing `lead-intake` if architecturally appropriate — Pipeline decides). Receives storefront form payload, resolves tenant from Origin/Referer header validation, calls `submit_storefront_lead` server-side using `service_role`.
- Storefront code (`opticup-storefront` repo) updated to POST to the new EF instead of calling the RPC directly. (Cross-repo coordination — see §4.)
- REVOKE anon EXECUTE on `submit_storefront_lead` RPC. After the storefront cut-over, anon cannot call it directly.
- Rollback path: if the EF is broken, revert the storefront commit; the RPC's anon revoke is the LAST step, applied only after storefront is verified working with the EF.

### 3.3 `create_tenant` REVOKE
- `REVOKE EXECUTE ON FUNCTION public.create_tenant(...) FROM PUBLIC, anon, authenticated;`
- service_role retains EXECUTE for admin UI path.
- Single migration, low risk.

### 3.4 The 8 `v_admin_*` views — security_invoker + REVOKE anon
- Per finding, set `security_invoker = true` on each of: `v_admin_leads`, `v_admin_campaigns`, `v_admin_pages`, `v_admin_media`, `v_admin_reviews`, `v_admin_components`, `v_admin_product_picker`, `v_admin_campaign_templates`.
- `REVOKE SELECT ... FROM anon` on each.
- Pre-step #7 (Postgres ≥15 check) gates this work.
- Single migration covering all 8.

### 3.5 The 9 mutator RPCs — anon REVOKE + tenant validation
- The May-6 migration's gap (Question 6) must be investigated first.
- Affected RPCs per audit: `record_purchase`, `register_lead_to_event`, `submit_storefront_lead` (handled by §3.2), `next_box_number`, `next_po_number`, `next_return_number`, `next_internal_doc`, `apply_stock_count_delta`, `increment_shipment_counters`.
- For each: REVOKE EXECUTE FROM anon (with `FROM PUBLIC` per Iron Rule 22 / M4-DB-01 lesson) AND add a `current_setting('request.jwt.claims', true)::json ->> 'tenant_id'` validation check against `p_tenant_id` argument at the start of each function body.
- `submit_storefront_lead` keeps anon EXECUTE only if §3.2's EF-front-door cutover is incomplete; otherwise also revoked.

### 3.6 `tenant-logos` storage policy
- Pre-step (Question 5): audit current paths for Prizma + Demo logos. Confirm or backfill to `<tenant_id>/<filename>` convention.
- Apply storage policy: `(bucket_id = 'tenant-logos' AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims',true)::json ->> 'tenant_id'))`.
- Two tenants, low blast radius.

### 3.7 `platform_audit_log` policy
- Per audit finding #12 (separate from §3.4 due to different surface). Apply the canonical Iron Rule 15 pattern.

---

## 4. Cross-Repo Coordination (§3.2 only)

The `submit-lead` EF lands in this repo (`opticup`). The storefront-side change (POST to the EF instead of the RPC) lands in the sibling `opticup-storefront` repo. The Pipeline:

1. Lands the EF and the RPC revoke in `opticup` first — but DO NOT apply the RPC revoke until step 3 below.
2. Lands the storefront client change in `opticup-storefront` — uses the new EF.
3. Verifies on demo: form submission via EF works, lead lands in `crm_leads` correctly.
4. Only AFTER step 3 is green, applies the RPC anon REVOKE in `opticup`.
5. If anything in step 3 fails, the EF stays deployed (no harm), the storefront revert is one commit, the RPC retains anon EXECUTE for now (no production break).

The storefront repo work is non-trivial and may itself need a sub-SPEC. The Pipeline may decide to split §3.2 into a second SPEC if scope is large. Architect approves the split if the Pipeline judges it necessary.

---

## 5. Safety Envelope

### 5.1 Master safety tag
First action: create annotated tag at HEAD of develop.
```
git tag -a pre-security-hotfix-2026-05-13 -m "Pre-security-hotfix baseline; revert here if anything in this run goes wrong"
git push origin pre-security-hotfix-2026-05-13
```
Single rollback point for the entire SPEC.

### 5.2 Production discipline
- All work on `develop`. NEVER touch `main`. Daniel merges via PR after he reviews.
- Each commit on develop is its own discrete step within the SPEC.
- DDL pre-approved for this run: §3.1 DROP, §3.3 REVOKE, §3.4 view ALTERs + REVOKEs, §3.5 RPC revokes + body updates, §3.6 storage policy, §3.7 policy. NO other DDL.
- Any UNexpected DDL requirement → STOP, escalate.

### 5.3 Tenant write rules
- Prizma writes ARE NEEDED for this SPEC (the DDL applies to Prizma's project schema). However, no Prizma DATA writes — only schema/policy changes. The DDL is reversible per §5.1 master tag + per-migration `_up`/`_down` pairs.
- Demo tenant smoke tests as usual.

### 5.4 EF deployment fallback (OPEN-021 pattern)
- If `deploy_edge_function` via MCP returns `InternalServerError`, write `DEPLOY_FALLBACK_NEEDED.md` per existing pattern (STATUS_CHANGE_TRIGGERS_FRAMEWORK precedent). Include the `verify_jwt` flag values for each EF (per executor skill's mandatory 5h rule).
- Daniel CLI-deploys from Windows, Pipeline resumes.

### 5.5 Smoke per work area
- §3.1: confirm table is gone, confirm no errors in app.
- §3.2: end-to-end storefront form submission → demo lead lands in `crm_leads`. Verify on `/contact/` form first (lowest-stakes consumer).
- §3.3: anon attempt to call `create_tenant` returns 42501.
- §3.4: anon `SELECT * FROM v_admin_leads` returns 42501 (was returning rows previously).
- §3.5: anon attempt to call each of 9 RPCs returns 42501.
- §3.6: cross-tenant anon attempt to read `tenant-logos/<other-tenant-id>/<file>` returns 403.
- §3.7: per the canonical-pattern verification.

### 5.6 Commit budget
Estimated 8-12 commits across the work areas + retros. If exceeding 15, stop and report.

### 5.7 Out-of-scope
- The 128 THEORETICAL findings — defense-in-depth, scheduled separately.
- The `v_storefront_*` cross-tenant exposure — deferred to SaaS-readiness (Question 4).
- Future self-signup tenant creation — separate Module 2 SPEC when self-signup is designed.
- Any UI change. This is server-side only (DDL + EF + storefront client tweak).

---

## 6. The Deliverable

This SPEC ships:
- 1-2 SPEC folders under `modules/Module 2 - Platform Admin/docs/specs/` and/or `modules/Module 3 - Storefront/docs/specs/` (depending on §4 split decision) and/or `modules/Module 4 - CRM/docs/specs/`.
- Each folder follows the standard SPEC+EXECUTION_REPORT+FINDINGS+REVIEWER_REPORT+TEST_REPORT+FOREMAN_REVIEW protocol.
- DDL migrations under the appropriate `migrations/` or `supabase/migrations/` folder.
- EF deployment (manual fallback if MCP fails per §5.4).
- Storefront-repo commit if §3.2's split-or-not decision lands as in-scope.

When done, write ONE summary file at `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` with: master tag hash, list of SPECs closed, smoke results per work area, any escalations, recommended next steps (merge to main per the canonical PR flow).

---

## 7. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) authors each SPEC.
- `opticup-executor` implements (touches code + DDL + EF deploy).
- `opticup-reviewer` audits for canonical-pattern compliance (Iron Rule 15) and Iron Rule 22 (defense-in-depth on FROM PUBLIC).
- `opticup-localhost-tester` smokes per §5.5.
- `opticup-strategic` (Foreman-Review) closes each SPEC with FOREMAN_REVIEW.

Use Opus model for this run — DDL on production-mirroring schema + EF refactor + non-trivial diagnosis. Don't compromise on model for a security hotfix.

---

## 8. Communication

English status updates between phases (Daniel's terminal renders Hebrew reversed). ONE concise English summary at the end pointing Daniel to:
- The summary file path.
- The list of SPEC folders closed.
- Top 3 takeaways.
- Whether the SPEC is ready for develop→main merge (Daniel's call).

---

*End of Brief. Activation prompt at `SECURITY_HOTFIX_2026_05_13_ACTIVATION_PROMPT.md`.*
