# M11 — Supplier Portal Data Layer Map

> **Mission:** STOREFRONT_PUBLIC_DATA_LAYER (closed 2026-05-15) established the
> Pattern A mirror-table approach. The M11 Supplier Portal will reuse the pattern
> with a sibling projection family — `supplier_*_public`. This document enumerates
> every table a supplier should see, defines the proposed projection columns
> (allow vs hide), cross-references with the sealed M11 Brief (2026-05-09), and
> identifies tables not yet in the pattern that need to be added.
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> Schema measurements from live SELECT against `tsxrrxzmdxaenlvocyit`.

---

## 1. TL;DR

- **Pattern reused:** the same `*_public` mirror discipline that the storefront uses (allow-listed columns + 3 RLS policies + sync triggers). New family: `supplier_*_public`.
- **9 entities a supplier should see, in the right shape.** Most are tenant-private tables today; the projection is what determines what supplier-actors are allowed to read.
- **Critical exclusions:** `cost_price`, `cost_discount`, `sell_price`, `sell_discount`, `supplier_balance_adjustments`, `supplier_ocr_templates`, `notes`/`internal_notes`, `payment_terms`, `withholding_tax_rate`, `tax_exempt_*`, `opening_balance*`. These leak tenant margin/operations.
- **Cross-supplier isolation:** all mirrors filter on `supplier_id = <auth supplier_id>`. RLS uses a NEW JWT claim `supplier_id` (since the existing `tenant_id` claim is the wrong axis — the supplier sees ONE tenant's data, filtered to their own supplier_id).
- **Auth model:** suppliers authenticate via a separate `supplier-auth` Edge Function (TBD — analogous to `pin-auth` but for supplier user accounts). JWT carries `tenant_id` + `supplier_id`. **This auth path does not exist today — must be built before any supplier_*_public mirror is exposed.**
- **Cross-ref M11 Brief:** the Brief sealed 2026-05-09 explicitly noted "M11 = שכבת-תצוגה, אינו מאחסן נתוני-עסק" — the mirror pattern is consistent with this. The Brief does NOT yet anchor supplier-facing views explicitly; this map fills that gap.

---

## 2. Pattern recap — Pattern A from STOREFRONT_PUBLIC_DATA_LAYER

From `docs/PUBLIC_DATA_LAYER.md` §3 (canonical reference):

> "If a new consumer needs a different projection of, say, brands (e.g., the Supplier Portal needs `cost_price` for its own role), build a parallel `supplier_*_public` family with its OWN allow-listed columns and OWN RLS. **Never widen `*_public` allow-lists to satisfy a non-anon caller** — build a parallel mirror instead."

Mechanism per entity:
1. Mirror table with allow-listed columns + `tenant_id NOT NULL` + `supplier_id NOT NULL`.
2. 3 RLS policies: `service_bypass` (service_role), `tenant_isolation` (existing JWT-claim tenant_id), `supplier_scope` (NEW — `supplier_id = (current_setting('request.jwt.claims',true)::json->>'supplier_id')::uuid`).
3. Sync trigger function: SECURITY DEFINER + search_path-pinned + audit-log-on-failure.
4. Backfill on creation.
5. Consumer views read FROM the mirror, never the source.

---

## 3. Entity inventory — what a supplier should see

Each row: entity, source table(s), what supplier needs, what supplier MUST NOT see, target mirror name.

### 3.1 `suppliers_public_self`
**Source:** `suppliers`
**Supplier sees:** their own row only — name, contact, phone, email, supplier_number, active, tax_id, payment_terms_days, default_currency.
**Hide:** `notes`, `withholding_tax_rate`, `tax_exempt_*`, `opening_balance*`, `rating`, `ai_has_po_pattern`, `created_by`.
**Why:** identity sanity-check ("am I logged in as the right supplier?") + ability to verify their contact info.
**Filter:** `WHERE id = (jwt.supplier_id) AND active = true AND tenant_id = (jwt.tenant_id)`.

### 3.2 `supplier_purchase_orders_public`
**Source:** `purchase_order` (M1B0 schema, sealed 2026-05-15) + `purchase_order_line` for items.
**Supplier sees per PO:** po_number, status, ordered_at, sent_to_supplier_at, expected_delivery_at, cancelled_at, cancelled_reason, line counts/qtys.
**Hide:** `created_by`, `notes` (internal scratchpad), `unit_cost` (supplier already knows the cost — but visible if needed for confirm-against-quote), `vat_rate_id`.
**Why:** open PO list ("what's on order"); supplier acknowledges via portal; confirms expected delivery.
**Filter:** `WHERE supplier_id = (jwt.supplier_id) AND is_deleted = false`.
**Note:** there are TWO purchase_order tables in the DB (`purchase_order` from M1B0_PURCHASE_ORDER_SCHEMA 2026-05-15 + legacy `purchase_orders` from old M8). Mission 5 standardizes on `purchase_order` (newer, M1B0-sealed). Legacy `purchase_orders` should be deprecated separately — see §7 G1.

### 3.3 `supplier_purchase_order_lines_public`
**Source:** `purchase_order_line` (linked to `purchase_order`).
**Supplier sees:** line_number, source (frame_demand|prescription_lens|manual), variant_id (their SKU), supplier_sku_code (if joined via catalog), sph/cyl/add_value (for prescription lenses), qty_ordered, qty_received.
**Hide:** `unit_cost` only if supplier shouldn't see it (depends on relationship — Daniel decides).
**Why:** drill-down per PO: what exact SKUs/Rx, qty open vs received.
**Filter:** join `purchase_order` to gate by supplier_id.

### 3.4 `supplier_deliveries_public`
**Source:** `purchase_receipt` + `purchase_receipt_line`.
**Supplier sees per receipt:** receipt_number, delivery_note_number, delivery_note_received_at, goods_received_at, status, discrepancy_status.
**Hide:** `confirmed_by`, `notes`, `scanned_doc_url` (internal scan), `shipping_box_supplier_barcode` (operational).
**Why:** "did the tenant confirm receipt?" — supplier sees their delivery confirmation status; supports invoice-against-receipt matching.

### 3.5 `supplier_debts_public`
**Source:** `supplier_debt`.
**Supplier sees:** delivery_note_number, total_amount, vat_amount, currency_code, paid_amount, status, closed_at, created_at, updated_at.
**Hide:** `notes`, internal `id`.
**Why:** statement view ("what does the tenant owe me?"). Supplier reconciles their accounting against the tenant's open debt list.
**Filter:** `WHERE supplier_id = (jwt.supplier_id) AND is_deleted = false`.

### 3.6 `supplier_payments_public`
**Source:** `supplier_payments`.
**Supplier sees:** amount, currency, exchange_rate, payment_date, payment_method, reference_number, withholding_tax_amount, net_amount, status, approved_at.
**Hide:** `notes`, `created_by`, `approved_by`, `prepaid_deal_id` (operational).
**Why:** payment history ("when did the tenant last pay me?"). Reconciliation aid.
**Filter:** `WHERE supplier_id = (jwt.supplier_id) AND is_deleted = false AND status = 'approved'`.

### 3.7 `supplier_returns_public`
**Source:** `supplier_returns` + `supplier_return_items`.
**Supplier sees per return:** return_number, return_type, reason, status, created_at, ready_at, shipped_at, received_at, credit_note_number, credit_amount, agent_picked_at, credited_at, line items (barcode, brand_name, model, color, size, quantity).
**Hide:** internal `notes`, `created_by`, `credit_document_id`.
**Why:** supplier sees the tenant's open returns awaiting credit; pickup status; credit notes outstanding.
**Filter:** `WHERE supplier_id = (jwt.supplier_id) AND is_deleted = false`.

### 3.8 `supplier_inventory_levels_public`
**Source:** `inventory` (filtered by `supplier_id`).
**Supplier sees:** barcode, brand_name (via JOIN to `brands`), model, color, size, product_type, quantity (sell-through visibility), status.
**Hide:** `cost_price`, `cost_discount`, `sell_price`, `sell_discount`, `original_price`, `sale_label`, `branch_id`, `created_by`, `custom_fields`, `notes`, `storefront_price`, `storefront_description`, `storefront_status`, `access_exported`.
**Why:** supplier sees what's on-hand of THEIR products at the tenant. Powers "sell-through report" ("how much of brand X did the tenant move this month?") via JOIN to `inventory_logs` filtered (a SECOND mirror — see 3.9).
**Filter:** `WHERE supplier_id = (jwt.supplier_id) AND is_deleted = false`. Pricing fields strictly excluded — leaks margin.

### 3.9 `supplier_inventory_movement_public`
**Source:** `inventory_logs` (filtered by `supplier_id` via JOIN to `inventory` then collapsing) — OR a new tenant_id+supplier_id snapshot table.
**Supplier sees:** action (`sold`, `restock`, `transfer`, `removed`), qty_before, qty_after, created_at, branch_id (city only, not full address — sanitize).
**Hide:** `sale_amount`, `discount*`, `final_amount`, `coupon_code`, `campaign`, `employee_id`, `lens_included`, `lens_category`, `order_number`, `sync_filename`, `performed_by`. (Anything that exposes the tenant's pricing or customer-specific behavior.)
**Why:** rough sell-through aggregation ("brand X sold 12 units this month"). Privacy-preserving — no per-customer or per-employee detail.
**Caveat:** this is the highest-risk mirror because the supplier could reverse-engineer the tenant's customer cadence. Daniel needs to sign off on the column list. **Recommendation: ship this LAST, after the simpler mirrors prove out the auth/RLS model.**

---

## 4. Excluded entities — supplier MUST NOT see

| Entity | Why excluded |
|---|---|
| `supplier_balance_adjustments` | Internal accounting reclassifications. |
| `supplier_documents` | Tenant's filed invoice scans + amounts — different than supplier_debt; this is OCR/document layer. |
| `supplier_ocr_templates` | Internal ML model state. |
| `supplier_brand_distribution` | Tenant-supplier allocation matrix — operational. |
| `supplier_catalog_offering` | Internal pricing snapshots from the tenant's import. Supplier already knows their own catalog. |
| `supplier_permissions` | Internal RBAC table that grants tenant employees access to specific supplier actions. |
| `payment_allocations` | Joins payments to invoices in tenant's books — opaque to supplier. |
| Tables NOT in §3 above | All `crm_*`, `inventory_logs` (raw — see 3.9 for safe variant), `customers`, `pending_sales`, `employee_*`, etc. |

---

## 5. Auth model — what's missing today

### 5.1 The gap

Existing auth: PIN-based via `pin-auth` EF — mints JWT with `tenant_id` claim. Used by tenant employees.

**No supplier auth exists.** Today, every supplier-facing surface (if any) would be either:
- Internal tenant-employee acting on behalf of supplier (no separate supplier session), or
- Public read (storefront) with no supplier context.

### 5.2 What needs to land before mirrors are exposed

**Pre-requisite SPEC: `M11_SUPPLIER_AUTH` (new, blocking).**

- New table: `supplier_users` — supplier identity + email + hashed password (bcrypt or magic-link only) + supplier_id reference.
- New EF: `supplier-auth/index.ts` — magic-link or password login → mints JWT with `tenant_id` + `supplier_id` claims. Defense-in-depth: token expiry ≤ 24h, refresh required.
- Update RLS canonical pattern: ADD `supplier_scope` policy variant that uses the new `supplier_id` claim.

**Estimated effort:** 6-8 hours (table + EF + RLS template + magic-link generator + smoke test).

Until this lands, the supplier_*_public mirrors are not safely exposable. Recommend building the mirrors WITH the auth SPEC in the same pipeline phase.

---

## 6. SPEC stub — `M11_SUPPLIER_PORTAL_DATA_LAYER`

> Stub for the M11 implementation phase author. Final SPEC by `opticup-strategic` after M11 implementation phase planning.

**Goal:** Establish the supplier_*_public mirror family for the M11 Supplier Portal, gated behind a new supplier auth model.

**Phase 1 (blocking — auth first):**
- New table: `supplier_users`.
- New EF: `supplier-auth/index.ts`.
- New JWT claim: `supplier_id`.
- New RLS policy template: `supplier_scope`.

**Phase 2 (mirrors — low-risk first):**
- Migration: 6 mirror tables + 6 sync triggers + 6 backfills:
  - `suppliers_public_self`
  - `supplier_purchase_orders_public`
  - `supplier_purchase_order_lines_public`
  - `supplier_deliveries_public`
  - `supplier_debts_public`
  - `supplier_payments_public`
- Each mirror: 3 RLS policies, GRANT SELECT TO authenticated (no anon — supplier auth required).
- Trigger pattern lifted byte-for-byte from STOREFRONT_PUBLIC_DATA_LAYER (§3 of `docs/PUBLIC_DATA_LAYER.md`).

**Phase 3 (mirrors — medium-risk):**
- `supplier_returns_public` (with line items).

**Phase 4 (mirror — high-risk, Daniel sign-off required):**
- `supplier_inventory_levels_public` (excludes all pricing).
- `supplier_inventory_movement_public` (excludes all per-customer detail).

**Scope (out):**
- Write-paths from supplier portal (e.g., supplier confirms PO). Each write = separate RPC, separate SPEC per Brief §4.2 (M11_REPORTS RPC contract pattern).
- Supplier-facing storefront catalog views (different ask — supplier sees tenant's storefront from outside).
- Multi-supplier-per-account (e.g., a sales rep representing 5 suppliers). Defer to v2.

**Iron Rule compliance:**
- 14 + 15 (tenant_id + RLS): ✅ every mirror has tenant_id NOT NULL + 3 policies.
- 18 (UNIQUE includes tenant_id): N/A (no UNIQUE constraints needed).
- 21 (no orphans): ✅ each mirror is purpose-built, no duplicate of existing structure.
- 22 (defense-in-depth): ✅ sync triggers + RLS + supplier_scope JWT claim.
- 23 (no secrets in code): ✅ JWT secret in env.
- 32 (destructive ops): NONE per mirror. Each migration is additive.

**Estimated effort:** 12-16 hours across all phases (auth: 6-8h; mirrors phase 2-3: 4-6h; phase 4 mirrors: 2-4h).

**Smoke test (per mirror):**
- Insert source row → mirror row appears with allow-listed cols.
- Delete source row → mirror row disappears.
- Authenticated supplier A sees only their own rows.
- Authenticated supplier B (different supplier_id) sees zero rows from A.
- Cross-tenant attempt: supplier auth'd to tenant T1 cannot query mirror for tenant T2 (tenant_isolation policy blocks).

---

## 7. Auxiliary findings (parking lot)

### G1 — Two PO table families

`purchase_order` (M1B0_PURCHASE_ORDER_SCHEMA, sealed 2026-05-15) is the new canonical. `purchase_orders` (plural, legacy M8) still exists. Need to confirm with Daniel which is authoritative before mirroring — if `purchase_orders` is dead, deprecate it; if live for some path, mirror both (ugly).

### G2 — `purchase_order_items` (third PO table!)

There's a THIRD table — `purchase_order_items` (older shape with brand/model/color/qty_ordered/qty_received fields directly in the line, no variant_id). Likely legacy from a pre-variant era. Verify it's dead before mirroring `purchase_order_line`.

### G3 — `inventory_logs` sell-through view is high-risk

Per §3.9 the supplier movement mirror should be deferred to Phase 4. Daniel sign-off required. Alternative: weekly aggregated snapshot table (rolls up to brand+month+qty) that throws away per-event detail.

### G4 — `supplier_documents` + `supplier_document_files` — invoice files

Tenant uploads scanned invoices, runs OCR. The supplier could see "yes my invoice is filed" + match against their own books. BUT exposing the file_url leaks anything sensitive in the scan. Recommend: expose `document_number` + `total_amount` + `status` only, never the file URL. Treat as a future mirror, not Phase 2.

### G5 — Cross-tenant supplier rep concern

A multi-tenant SaaS will eventually have suppliers (e.g., Essilor) selling to many tenants. The current model assumes ONE supplier_id per tenant — a supplier dealing with 5 tenants has 5 separate rows in 5 tenants' `suppliers` tables, each with its own UUID. The supplier portal would need cross-tenant aggregation in that case (e.g., "show me my orders across all tenants"). Defer to a v3 SPEC — the v1 portal serves one tenant per session.

### G6 — `payment_methods` is shared dim

`payment_methods` is tenant-scoped but doesn't have supplier-relevant fields. Already fine if joined via reference (no mirror needed).

---

## 8. Cross-ref with M11 Brief (sealed 2026-05-09)

Brief §1 says M11 is "שכבת-תצוגה, אינו בעלים של נתונים" (display layer, not data owner). This map is consistent — supplier_*_public are mirrors owned by the source modules (Module 1 Inventory, Module 4 CRM, future Module 7 Orders), NOT owned by M11. M11 will provide the UI to display them.

Brief §4.1 lists the `v_<module>_for_reports` views for internal report consumption. The supplier_*_public family is parallel — `v_<module>_for_supplier` would be the consumption view if needed, BUT we can skip that layer for v1 and have supplier UI query the mirror directly (same pattern storefront uses — `v_storefront_*` is read directly from `*_public`).

Brief §4.2 (RPC pattern for writes) applies directly. Each supplier write action → 1 RPC. Examples: `supplier_acknowledge_po(po_id, supplier_id, user_id)`, `supplier_confirm_delivery(receipt_id, supplier_id, user_id)`. RPCs live in source modules, not M11.

---

## 9. Reproducibility

All schema queries SELECT-only against `tsxrrxzmdxaenlvocyit`. Sampled 2026-05-16 00:10 IDT.

---

*End of M5. Companion: `M11_SUPPLIER_AUTH` + `M11_SUPPLIER_PORTAL_DATA_LAYER` SPECs to be authored when M11 implementation phase begins. Daniel sign-off required on Phase 4 (high-risk inventory_movement mirror).*
