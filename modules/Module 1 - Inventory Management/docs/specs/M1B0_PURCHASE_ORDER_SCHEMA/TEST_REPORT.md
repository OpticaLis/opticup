# TEST_REPORT.md — M1B0_PURCHASE_ORDER_SCHEMA

> **Smoke run:** 2026-05-15, Full Auto Pipeline single chat
> **Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
> **Prizma touched:** **NO** (verified post-run: 0 rows in purchase_order / supplier_debt for prizma; 20 legacy purchase_orders rows for demo unchanged)
> **Verdict:** **🟢 6/6 PASS**

## Smoke fixtures (captured pre-run)

| Object | Value |
|---|---|
| Tenant (demo) | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| Tenant (prizma — for cross-tenant test) | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` |
| First active supplier | `767db339-91cb-4428-8123-76852c8f0e3f` (supplier_number=9010) |
| `lens_variant` LV-TST001 | `7073aa06-c324-49bb-ba1a-683521149a34` |
| `tenant_location` STA | `e6f26ba3-4893-4001-9c55-bb88662d5370` |
| `tenant_location` STB | `d0a3eea1-4dc3-4a92-a009-55ac48c3b49a` |
| Active IL VAT row | `rate_pct=18.00`, `effective_until IS NULL` |

JWT was set via `set_config('request.jwt.claims', '{"tenant_id":"...","role":"authenticated"}', true)` for every case unless explicitly testing anon/cross-tenant.

---

## Case 1 — `place_purchase_order` with 3 lines (stock + custom_per_customer + manual)

**Call:** `place_purchase_order(demo, supplier=9010, 3-line jsonb, NULL date, 'M1B0 smoke Case 1', NULL)`

**Returned PO id:** `abe836d2-7186-40be-a834-c007a087cf21`

**Assertions:**

| Expected | Actual | PASS |
|---|---|---|
| po_number ~ `'^PO-\d{6}$'` | `'PO-000001'` | ✅ |
| status | `'draft'` | ✅ |
| line_count | 3 | ✅ |
| line_numbers (sorted) | `[1,2,3]` | ✅ |
| sources (line_number order) | `['stock','custom_per_customer','manual']` | ✅ |

**Verdict:** ✅ PASS

---

## Case 2 — `mark_po_sent`

**Call:** `mark_po_sent(demo, abe836d2-7186-40be-a834-c007a087cf21)` (PO from Case 1)

**Assertions:**

| Expected | Actual | PASS |
|---|---|---|
| RPC return | VOID (no error) | ✅ |
| status post | `'sent'` | ✅ |
| sent_to_supplier_at IS NOT NULL | true | ✅ |

**Verdict:** ✅ PASS

---

## Case 3 — `m1_create_receipt_from_box` (K2 wired with debt)

**Call:** `m1_create_receipt_from_box(demo, supplier=9010, delivery_note='TEST-M1B0-<epoch>', 2-line jsonb, box_id=NULL, ..., supplier_number='9010', NULL)`

**Returned receipt id:** `5e3af187-198b-442a-bd05-31b4370ed53c`

**Assertions:**

| Expected | Actual | PASS |
|---|---|---|
| `purchase_receipt_line` rows | 2 | ✅ |
| `stock_lot` rows | 2 | ✅ |
| `stock_movement` rows | 2 | ✅ |
| `supplier_debt` rows | 1 | ✅ |
| total_amount (10×15.50 + 2×22.00 = 199.00, +18% VAT = 234.82) | `234.82` | ✅ |
| vat_amount (18% × 199.00 = 35.82) | `35.82` | ✅ |
| debt.status | `'open'` | ✅ |

**Idempotency sub-case (call `m1_create_supplier_debt_from_receipt` again for same receipt):**

| Expected | Actual | PASS |
|---|---|---|
| Second call returns same id | first_id `ab9cdc83-006a-4ced-8a51-e15ec2c08260` == second_id `ab9cdc83-006a-4ced-8a51-e15ec2c08260` | ✅ |
| Row count after 2nd call | 1 (no new row) | ✅ |

**Verdict:** ✅ PASS (with idempotency proof)

---

## Case 4 — Cancel-flow (3 sub-cases)

### 4a — Cancel from `'draft'` succeeds

**Setup:** New PO `3844a65a-f2de-4e09-931d-11ab1de4e826` via `place_purchase_order`.

**Call:** `cancel_purchase_order(demo, 3844a65a-..., 'test cancel — Case 4a')`

**Assertions:**

| Expected | Actual | PASS |
|---|---|---|
| status post | `'cancelled'` | ✅ |
| cancelled_at IS NOT NULL | true | ✅ |
| cancelled_reason | `'test cancel — Case 4a'` | ✅ |

### 4b — Cancel from `'cancelled'` raises 42501

**Call:** `cancel_purchase_order(demo, 3844a65a-..., 'should fail')` (already cancelled)

**Returned error:** `ERROR 42501: Cannot cancel PO in status cancelled, only draft/sent allowed`

**Verdict:** ✅ PASS

### 4c — Cancel from `'partial'` raises 42501

**Setup:** Forced `abe836d2-7186-40be-a834-c007a087cf21` → `'partial'` via direct UPDATE (service_role, bypass RLS).

**Call:** `cancel_purchase_order(demo, abe836d2-..., 'should fail — partial')`

**Returned error:** `ERROR 42501: Cannot cancel PO in status partial, only draft/sent allowed`

**Verdict:** ✅ PASS

---

## Case 5 — Anon-reject test on all 5 new RPCs

JWT set to `{"role":"anon"}` (no tenant_id) for each sub-case.

| RPC | Returned error code | PASS |
|---|---|---|
| 5a `next_purchase_order_number(demo)` | `42501: Unauthorized: tenant_id mismatch` | ✅ |
| 5b `place_purchase_order(demo,...)` | `42501: Unauthorized: tenant_id mismatch` | ✅ |
| 5c `mark_po_sent(demo, ...)` | `42501: Unauthorized: tenant_id mismatch` | ✅ |
| 5d `cancel_purchase_order(demo, ...)` | `42501: Unauthorized: tenant_id mismatch` | ✅ |
| 5e `m1_create_supplier_debt_from_receipt(demo, ...)` | `42501: Unauthorized: tenant_id mismatch` | ✅ |

**Verdict:** ✅ 5/5 PASS — every new RPC's JWT-claim guard rejects anon.

---

## Case 6 — Cross-tenant guard

JWT set to Prizma's `tenant_id` (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) + `role=authenticated`, calling `place_purchase_order(p_tenant_id=demo)`.

**Returned error:** `ERROR 42501: Unauthorized: tenant_id mismatch` (raised by `place_purchase_order` line 10)

**Post-call assertions:**

| Expected | Actual | PASS |
|---|---|---|
| Prizma rows in `purchase_order` | 0 | ✅ |
| Prizma rows in `supplier_debt` | 0 | ✅ |
| Legacy `purchase_orders` (plural) rows for demo unchanged | 20 (matches §0 Probe 1 baseline) | ✅ |

**Verdict:** ✅ PASS — cross-tenant write attempt blocked by JWT-claim guard. Iron Rule 32 §7=None held (no destructive ops, no legacy data touched).

---

## Advisor scan (§3 criterion 22)

`mcp__claude_ai_Supabase__get_advisors` security + performance scans run post-DDL. Subagent grep across both files for HIGH/ERROR/CRITICAL findings referencing any of the 8 new objects.

**Result:** 0 HIGH/ERROR/CRITICAL findings on the 3 new tables (`purchase_order`, `purchase_order_line`, `supplier_debt`) or the 5 new RPCs. All pre-existing legacy view advisors are unchanged (15 ERRORs on legacy `v_storefront_*` + `v_ai_content` views — not in M1B0 scope).

**WARN-level note:** WARN-level `authenticated_security_definer_function_executable` finding appears for all SECDEF functions GRANTed to `authenticated` — this is project-wide consistent with Phase 1A's 10 SECDEF RPCs and is the documented canonical pattern (not a defect). The Reviewer may include this as an INFO note if desired.

---

## Summary

| # | Case | Verdict |
|---|---|---|
| 1 | place_purchase_order(3 lines) | ✅ PASS |
| 2 | mark_po_sent | ✅ PASS |
| 3 | K2 + debt wiring + idempotency | ✅ PASS |
| 4a–4c | Cancel-flow (3 sub-cases) | ✅ 3/3 PASS |
| 5a–5e | Anon-reject (5 RPCs) | ✅ 5/5 PASS |
| 6 | Cross-tenant guard | ✅ PASS |
| Advisor | Zero new HIGH/ERROR-level lints | ✅ PASS |
| Prizma untouched | 0 rows | ✅ PASS |
| Legacy purchase_orders preserved | 20 rows unchanged | ✅ PASS |

**Overall: 🟢 6/6 PASS.** Mandatory smoke gate satisfied — SPEC may close 🟢.

## Smoke artifacts left on demo (intentionally — for Phase 1B re-use)

- 1 `purchase_order` rows surviving: `abe836d2-7186-40be-a834-c007a087cf21` (status='partial' after Case 4c setup), `3844a65a-f2de-4e09-931d-11ab1de4e826` (status='cancelled' after Case 4a).
- 3 `purchase_order_line` rows for PO `abe836d2`. 1 `purchase_order_line` row for PO `3844a65a`.
- 1 `purchase_receipt` row: `5e3af187-198b-442a-bd05-31b4370ed53c`. 2 lines, 2 lots, 2 stock_movements.
- 1 `supplier_debt` row: `ab9cdc83-006a-4ced-8a51-e15ec2c08260` (total_amount=234.82, vat_amount=35.82, status='open').

These artifacts are M1A-DEBT-04 lineage extended — useful as Phase 1B smoke seed. Phase 1B's §0 reuses or re-seeds.

---

*End of TEST_REPORT.md. M1B0_PURCHASE_ORDER_SCHEMA. Smoke: 🟢 6/6 PASS. 2026-05-15.*
