# FINDINGS.md — M1A_OPERATIONS_RPCS_FIX

**Author:** opticup-executor, 2026-05-15.

Findings surfaced during execution that are NOT part of the 8 fixes the SPEC was authored for. Each item has severity + suggested disposition.

---

## F-1 — CRITICAL — `record_transfer` pre-existing 17-vs-19 arg mismatch (FIXED in-pipeline by Amendment #1)

**Discovered:** Functional smoke Case 3 (pre-amendment).
**Location:** `pg_get_functiondef('record_transfer'::regproc)`.
**Description:** Pre-existing body had two inner `record_stock_movement` calls each with 17 positional args. Function takes 19 params. Position 17 = `p_sph numeric` received `p_notes` (text) → 42883 at runtime. DOA bug — never could have worked at runtime. Phase 1A skipped functional smoke entirely.
**Disposition:** **RESOLVED IN-PIPELINE.** Foreman authorized Amendment #1 (Fix #9). Block #6 of MIGRATION.md. Commit `826fc12`.

## F-2 — CRITICAL — `record_adjustment_found` pre-existing 20-vs-19 arg mismatch (FIXED in-pipeline by Amendment #2)

**Discovered:** Functional smoke Case 5 (pre-amendment).
**Location:** `pg_get_functiondef('record_adjustment_found'::regproc)`.
**Description:** Pre-existing body had inner `record_stock_movement` call with 20 positional args (function takes 19) + misaligned NULL at position 11 (intended slot for `v_lot_id` as `p_adjustment_id` self-ref per the body's own comment). Misalignment cascaded type mismatches into positions 12 (uuid→numeric), 16 (uuid→text), 17 (text→numeric). PG raised 42883. Same DOA-bug class as F-1.
**Disposition:** **RESOLVED IN-PIPELINE.** Foreman authorized Amendment #2 (Fix #10) + broad pre-authorization for any remaining same-class defects. Block #7 of MIGRATION.md. Commit `60d4cd2`.

## F-3 — HIGH — Demo tenant had zero lens-catalog substrate fixtures pre-smoke

**Discovered:** Pre-smoke fixture discovery.
**Location:** demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
**Description:** Demo had 38 active suppliers + Phase 1A schema present, but **0 `tenant_location` rows, 0 published `lens_variant` rows, 0 `supplier_catalog_offering` rows on demo for any lens variant**. Phase 1A's smoke was a single `INSERT INTO lens_brand` + cross-tenant SELECT + DELETE — it never seeded a runnable substrate on demo. Without fixtures the §14 smoke could not run end-to-end.
**Resolution this Pipeline:** seeded minimal fixtures (2 locations, 1 global brand/design/variant `LV-TST001`, 1 demo offering at `price_amount=100.00 ILS`). Persistent; reusable by Phase 1B smoke.
**Disposition:** **LOG to TECH_DEBT.md** under `M1A-DEBT-04 — Demo lens-catalog seed`. Phase 1B SPEC should either reuse these fixtures or add to them with a documented seed script (`modules/Module 1 - Inventory Management/scripts/seed-demo-lens-fixtures.sql`).

## F-4 — INFO — `request.jwt.claims = ''` (empty string) raises 22P02 instead of 42501 in `next_lens_variant_display_id`

**Discovered:** Functional smoke Case 4 sub-case B first attempt.
**Location:** `next_lens_variant_display_id()` body — `IF v_claims IS NULL OR (v_claims::json ->> 'role') = 'anon' THEN`.
**Description:** When `request.jwt.claims` is the empty string `''` (not NULL), the IS NULL branch evaluates FALSE so PG attempts `''::json` and raises 22P02 'invalid input syntax for type json' BEFORE the role check. The function still **rejects** the call, but with a different error code than the SPEC §3 criterion 10 strictly states. **This is not a realistic PostgREST scenario** — production never produces empty-string claims; the GUC is either unset (NULL) or a valid JSON object. Realistic smoke sub-cases (anon-role JWT + NULL claims) both raise 42501 as designed.
**Disposition:** **DISMISS.** Not a real defect; documented in TEST_REPORT.md for transparency. A defense-in-depth improvement could pre-check `v_claims = ''` and raise 42501 — but the function already fails-safe (any unauthorized state is rejected, just via different errcodes). Optional follow-up enhancement; not a SPEC issue.

## F-5 — MEDIUM — Brief §0 baseline did NOT capture `tenant_location` schema

**Discovered:** Fixture seed first attempt (column `code` doesn't exist — actual column is `short_code`).
**Location:** SPEC.md §0 baselines.
**Description:** Brief and SPEC §0 captured baselines for `stock_lot`, `tenant_lens_stock`, `pending_lens_advancement_queue`, `stock_movement`, `supplier_catalog_offering` (implicitly via the orchestrator bodies). They did NOT pin `tenant_location` schema, even though Brief §5 criterion 10 required transfer between 2 demo locations. The executor had to discover `short_code` (not `code`) via an extra probe.
**Disposition:** **DISMISS for this SPEC.** Logged as an executor-skill improvement proposal in EXECUTION_REPORT.md §"What would have helped you go faster" — Foreman applies to opticup-strategic SKILL pre-flight checklist.

## F-6 — LOW — `lens-catalog-import/index.ts` is 306 lines (was 300 pre-Fix-#7)

**Discovered:** Pre-commit `verify --staged` on Commit 7.
**Location:** `supabase/functions/lens-catalog-import/index.ts:306`.
**Description:** Fix #7's fail-closed expansion added 6 lines (+401 +CORS block + comment), pushing the file over Rule 12's soft target of 300 lines. Still under the hard max of 350. Pre-commit hook emitted a WARNING (not VIOLATION).
**Disposition:** **DISMISS.** Within Rule 12 tolerance (max 350). Splittable only if a logical separation exists. No urgency.

## F-7 — INFO — `is_platform_super_admin()` still missing `SET search_path` (pre-existing, out of scope per SPEC §8)

**Discovered:** Probe 9 (re-confirmed during this SPEC's investigation).
**Location:** `pg_get_functiondef('is_platform_super_admin'::regproc)` — `LANGUAGE sql STABLE SECURITY DEFINER` with no `SET search_path`.
**Description:** Reviewer I-7 finding from the Code Review Report. Out of scope for M1A_OPERATIONS_RPCS_FIX per SPEC §8.
**Disposition:** **DISMISS for this SPEC.** Belongs in a future project-wide SECDEF search_path hardening SPEC.

## F-8 — INFO — Smoke fixtures persisted on demo (cleanup deferred)

**Discovered:** End of smoke.
**Description:** 2 tenant_locations + 1 lens_brand + 1 lens_design + 1 lens_variant (LV-TST001) + 1 supplier_catalog_offering + multiple stock_lot / stock_movement / purchase_receipt rows from smoke cases. Persist on demo.
**Disposition:** **DEFERRED CLEANUP.** Useful as Phase 1B smoke seed. If unwanted, a follow-up cleanup pass can DELETE rows tagged with `notes ILIKE '%M1A%smoke%'` or `notes ILIKE '%SMOKE-%'`. Logged to TECH_DEBT.md as `M1A-DEBT-04` bundle (see F-3).

---

## Findings summary

| ID | Severity | Class | Disposition |
|---|---|---|---|
| F-1 | CRITICAL | Pre-existing orchestrator runtime defect | RESOLVED in-pipeline (Amendment #1 / Fix #9) |
| F-2 | CRITICAL | Pre-existing orchestrator runtime defect | RESOLVED in-pipeline (Amendment #2 / Fix #10) |
| F-3 | HIGH | Missing test fixtures on demo | Log to TECH_DEBT M1A-DEBT-04 |
| F-4 | INFO | Defense-in-depth edge | Dismiss |
| F-5 | MEDIUM | Process gap (Foreman pre-flight breadth) | Executor-skill improvement proposal |
| F-6 | LOW | File size soft-target | Dismiss |
| F-7 | INFO | Pre-existing, explicitly out-of-scope | Dismiss |
| F-8 | INFO | Demo cleanup deferred | Log to TECH_DEBT M1A-DEBT-04 |

Two CRITICAL findings (F-1, F-2) were resolved IN this Pipeline via Foreman amendments. Three findings (F-3, F-4, F-8) inform TECH_DEBT or Phase 1B fixture planning. Three (F-5, F-6, F-7) are dismissed or feed self-improvement.
