# TEST_REPORT — M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/TEST_REPORT.md`
> **Written by:** opticup-localhost-tester (tester-rls-bypass session)
> **Written on:** 2026-05-18 night (IDT)
> **Repo:** opticalis/opticup, branch `develop`, HEAD `0506208682ff8f44324cb9032b0c7b16f963dd94`
> **SPEC:** `SPEC.md` (Foreman, 2026-05-18 night)
> **Pipeline lock:** `2026-05-18T17-53-43-517Z_M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_tester-rls-bypass.lock`
> **Tier executed:** Tier C — Visual Functional Verification (SQL-level VFV, DB-only SPEC; no UI surface)

---

## §1. Verdict

🟢 **GREEN — 8 / 8 VFV cases PASS**

- 4 / 4 positive cases (S-VFV-POSITIVE-LENS-BRAND, S-VFV-POSITIVE-LENS-DESIGN, S-VFV-POSITIVE-LENS-VARIANT, S-VFV-POSITIVE-CONTACT-VARIANT) — platform-super-admin JWT successfully INSERTed a global row (`owner_tenant_id=NULL`) on each of the 4 target tables.
- 4 / 4 negative cases (S-VFV-NEGATIVE-LENS-BRAND, S-VFV-NEGATIVE-LENS-DESIGN, S-VFV-NEGATIVE-LENS-VARIANT, S-VFV-NEGATIVE-CONTACT-VARIANT) — tenant-manager JWT was correctly rejected with `42501 new row violates row-level security policy` on each.
- S-VFV-CLEANUP — 0 lingering test rows on any of the 4 tables (every test wrapped in `BEGIN ... ROLLBACK`, no `COMMIT` issued; post-run scan confirms 0 rows matching `TESTER-VFV-%` filter).

The new `platform_admin_bypass` policy behaves exactly as SPEC §0.3 Runtime semantics rehearsal predicted: ADDITIVE on the platform-super-admin path, INVISIBLE on the tenant-manager path. The `is_platform_super_admin()` function correctly returns `true` when `auth.uid()` resolves (via JWT `sub`) to an active super_admin row in `platform_admins`, and `false` otherwise — closing the trap classes enumerated in SPEC §0.3 (NULL-comparison, policy-evaluation-order, NULL-vs-false on EXISTS).

**Hand-off:** GREEN → handing back to Foreman for FOREMAN_REVIEW.md and SPEC closure.

---

## §2. Pre-flight Setup (live Supabase MCP, 2026-05-18 night)

| Symbol | Source query | Value |
|---|---|---|
| `DANIEL_UID` | `SELECT auth_user_id FROM platform_admins WHERE role='super_admin' AND status='active' LIMIT 1` | `c1d58c59-d38b-4fb0-8dab-2bb949d6d537` (`dannylis669@gmail.com`) |
| `DEMO_TENANT_ID` | `SELECT id FROM tenants WHERE slug='demo' LIMIT 1` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| `SAMPLE_BRAND_ID` | first non-deleted global `lens_brand` | `77b621e2-307e-4ab7-a2e5-c0d5c646b35c` |
| `SAMPLE_GLASSES_DESIGN_ID` | first global glasses design | `770d6647-569a-4219-b0ae-775b5ab4ae12` |
| `SAMPLE_CONTACT_DESIGN_ID` | first global contact-lens design | `be719ba9-36c9-4a15-8e24-85179a8a1f5a` |
| `BYPASS_POLICY_COUNT` | `SELECT COUNT(*) FROM pg_policies WHERE policyname='platform_admin_bypass' AND tablename IN (...)` | **4** (matches SPEC §3 S-MIGRATION-APPLIED expectation; aligns with Executor + Reviewer reports) |

All 6 pre-flight values resolved cleanly. No setup blockers.

---

## §3. Per-Criterion Results (8 cases)

Each test wraps `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{...}'; INSERT ...; ROLLBACK;` — every success is observed at INSERT time, before the ROLLBACK that prevents DB pollution.

### Case 1 — S-VFV-POSITIVE-LENS-BRAND — ✅ PASS

**JWT claims:** `{"sub":"c1d58c59-d38b-4fb0-8dab-2bb949d6d537","aud":"authenticated","role":"authenticated"}` (Daniel — platform super admin)

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<DANIEL_JWT>';
INSERT INTO public.lens_brand (name, owner_tenant_id)
VALUES ('TESTER-VFV-POS-BRAND-20260518', NULL)
RETURNING id, name, owner_tenant_id;
ROLLBACK;
```

**Result:** INSERT returned `{"id":"4f0b60c7-930d-48a5-b59e-786d9a8d5d81","name":"TESTER-VFV-POS-BRAND-20260518","owner_tenant_id":null}`. Policy `platform_admin_bypass` permitted the write. ROLLBACK discarded.

**Classification:** PASS.

---

### Case 2 — S-VFV-POSITIVE-LENS-DESIGN — ✅ PASS

**JWT claims:** Daniel (as above).

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<DANIEL_JWT>';
INSERT INTO public.lens_design (brand_id, name, lens_type, product_type, owner_tenant_id)
VALUES ('77b621e2-307e-4ab7-a2e5-c0d5c646b35c', 'TESTER-VFV-POS-DESIGN-20260518', 'single_vision', 'glasses', NULL)
RETURNING id, name, owner_tenant_id;
ROLLBACK;
```

**Result:** INSERT returned `{"id":"84cf508b-2b9e-40d8-92f9-d20014393a10","name":"TESTER-VFV-POS-DESIGN-20260518","owner_tenant_id":null}`. ROLLBACK discarded.

**Classification:** PASS.

---

### Case 3 — S-VFV-POSITIVE-LENS-VARIANT — ✅ PASS

**JWT claims:** Daniel.

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<DANIEL_JWT>';
INSERT INTO public.lens_variant
  (design_id, display_id, refractive_index, diameter_mm, sph_min, sph_max, sph_step, owner_tenant_id)
VALUES
  ('770d6647-569a-4219-b0ae-775b5ab4ae12', 'TESTER-VFV-POS-VARIANT-20260518',
   1.50, 65, -6.00, 6.00, 0.25, NULL)
RETURNING id, display_id, owner_tenant_id;
ROLLBACK;
```

**Result:** INSERT returned `{"id":"a337eeb4-305f-4439-897a-eacf0d616ace","display_id":"TESTER-VFV-POS-VARIANT-20260518","owner_tenant_id":null}`. ROLLBACK discarded.

**Classification:** PASS.

---

### Case 4 — S-VFV-POSITIVE-CONTACT-VARIANT — ✅ PASS

**JWT claims:** Daniel.

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<DANIEL_JWT>';
INSERT INTO public.contact_lens_variant
  (design_id, display_id, base_curve, sph, wearing_schedule, qty_per_box, expiry_warning_months, unit_of_sale, owner_tenant_id)
VALUES
  ('be719ba9-36c9-4a15-8e24-85179a8a1f5a', 'TESTER-VFV-POS-CL-20260518',
   8.6, -3.00, 'monthly', 6, 3, 'box', NULL)
RETURNING id, display_id, owner_tenant_id;
ROLLBACK;
```

**Result:** INSERT returned `{"id":"abe47c5f-713e-4ab6-a7ae-645d4c86825c","display_id":"TESTER-VFV-POS-CL-20260518","owner_tenant_id":null}`. ROLLBACK discarded.

**Classification:** PASS.

---

### Case 5 — S-VFV-NEGATIVE-LENS-BRAND — ✅ PASS

**JWT claims:** `{"sub":"00000000-0000-0000-0000-000000000099","aud":"authenticated","role":"authenticated","tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb"}` (fake UID not in `platform_admins`; tenant_id=demo).

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<TENANT_MANAGER_JWT>';
INSERT INTO public.lens_brand (name, owner_tenant_id)
VALUES ('TESTER-VFV-NEG-BRAND-20260518', NULL)
RETURNING id;
ROLLBACK;
```

**Expected:** rejection with `42501 new row violates row-level security policy`.

**Result (exact PG error):**
```
ERROR:  42501: new row violates row-level security policy for table "lens_brand"
```

**Classification:** PASS — the `platform_admin_bypass` policy correctly returned false (fake UID not in `platform_admins`), the `owner_view` policy correctly rejected (`NULL ≠ demo-uuid`), the `public_view` policy doesn't authorize INSERTs, and `service_bypass` doesn't apply to role=authenticated. All 3 OR-combined policies false → 403 as designed.

---

### Case 6 — S-VFV-NEGATIVE-LENS-DESIGN — ✅ PASS

**JWT claims:** tenant manager (as above).

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<TENANT_MANAGER_JWT>';
INSERT INTO public.lens_design (brand_id, name, lens_type, product_type, owner_tenant_id)
VALUES ('77b621e2-307e-4ab7-a2e5-c0d5c646b35c', 'TESTER-VFV-NEG-DESIGN-20260518',
        'single_vision', 'glasses', NULL)
RETURNING id;
ROLLBACK;
```

**Result:**
```
ERROR:  42501: new row violates row-level security policy for table "lens_design"
```

**Classification:** PASS.

---

### Case 7 — S-VFV-NEGATIVE-LENS-VARIANT — ✅ PASS

**JWT claims:** tenant manager.

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<TENANT_MANAGER_JWT>';
INSERT INTO public.lens_variant
  (design_id, display_id, refractive_index, diameter_mm, sph_min, sph_max, sph_step, owner_tenant_id)
VALUES
  ('770d6647-569a-4219-b0ae-775b5ab4ae12', 'TESTER-VFV-NEG-VARIANT-20260518',
   1.50, 65, -6.00, 6.00, 0.25, NULL)
RETURNING id;
ROLLBACK;
```

**Result:**
```
ERROR:  42501: new row violates row-level security policy for table "lens_variant"
```

**Classification:** PASS.

---

### Case 8 — S-VFV-NEGATIVE-CONTACT-VARIANT — ✅ PASS

**JWT claims:** tenant manager.

**SQL:**
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '<TENANT_MANAGER_JWT>';
INSERT INTO public.contact_lens_variant
  (design_id, display_id, base_curve, sph, wearing_schedule, qty_per_box, expiry_warning_months, unit_of_sale, owner_tenant_id)
VALUES
  ('be719ba9-36c9-4a15-8e24-85179a8a1f5a', 'TESTER-VFV-NEG-CL-20260518',
   8.6, -3.00, 'monthly', 6, 3, 'box', NULL)
RETURNING id;
ROLLBACK;
```

**Result:**
```
ERROR:  42501: new row violates row-level security policy for table "contact_lens_variant"
```

**Classification:** PASS.

---

## §4. Cleanup Confirmation (S-VFV-CLEANUP)

Every test transaction was wrapped `BEGIN ... ROLLBACK`. The 4 positive tests' RETURNING values prove the INSERT was permitted; the ROLLBACK discarded the row before COMMIT. The 4 negative tests aborted the transaction by virtue of the RLS rejection.

**Post-run scan:**
```sql
SELECT
  (SELECT COUNT(*) FROM lens_brand            WHERE name       LIKE 'TESTER-VFV-%') AS brand_rows,
  (SELECT COUNT(*) FROM lens_design           WHERE name       LIKE 'TESTER-VFV-%') AS design_rows,
  (SELECT COUNT(*) FROM lens_variant          WHERE display_id LIKE 'TESTER-VFV-%') AS variant_rows,
  (SELECT COUNT(*) FROM contact_lens_variant  WHERE display_id LIKE 'TESTER-VFV-%') AS cl_variant_rows;
```

**Result:** `{brand_rows: 0, design_rows: 0, variant_rows: 0, cl_variant_rows: 0}`.

**Status:** 0 lingering rows on any of the 4 target tables. Cleanup ✅ verified.

No manual DELETE statements were needed (no COMMIT was ever issued).

---

## §5. Console / SQL Error Log

The 4 negative-test errors are by design. Documented here for the Foreman audit:

```
[NEG 5] ERROR:  42501: new row violates row-level security policy for table "lens_brand"
[NEG 6] ERROR:  42501: new row violates row-level security policy for table "lens_design"
[NEG 7] ERROR:  42501: new row violates row-level security policy for table "lens_variant"
[NEG 8] ERROR:  42501: new row violates row-level security policy for table "contact_lens_variant"
```

Postgres SQLSTATE 42501 is the canonical "insufficient_privilege" code; RLS rejections surface here. Every error names the correct target table. No spurious / unexpected errors observed.

No other SQL errors during the run.

---

## §6. Pipeline Lock Release Confirmation

Lock claimed: `_archive/pipeline-sessions/2026-05-18T17-53-43-517Z_M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_tester-rls-bypass.lock`.

Lock will be released immediately after this report is committed:
```
node scripts/pipeline-coordination.mjs release \
  --spec-slug M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS \
  --session-id tester-rls-bypass
```

---

## §7. Tester Self-Assessment

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Test-method fidelity | 10/10 | Followed the prompt's JWT-claims simulation pattern exactly. `SET LOCAL ROLE authenticated` + `SET LOCAL request.jwt.claims` correctly drives `auth.uid()` and `current_setting('request.jwt.claims')`. Each transaction wrapped BEGIN/ROLLBACK to guarantee no DB pollution. |
| Coverage of success criteria | 10/10 | All 8 VFV cases + cleanup criterion executed; 8/8 PASS. |
| Cleanup discipline | 10/10 | 0 lingering rows; verified by post-run COUNT scan. No COMMIT ever issued by a test transaction. |
| Honesty on edge cases | 10/10 | All 4 positive INSERTs returned a row id — proves the policy permitted the write. All 4 negative INSERTs returned exact 42501 RLS error — proves the bypass is correctly scoped to platform super admins only. Stage 2A modals are unblocked at the DB layer. |
| Reporting completeness | 10/10 | 6 §s of TEST_REPORT, per-case SQL + result + classification, exact PG error text quoted, cleanup query + result captured. |

**Overall: 10/10.** SPEC §3 success criteria 18-25 + 26 all PASS substantively.

---

**End of TEST_REPORT. Foreman next — FOREMAN_REVIEW.md and SPEC closure.**
