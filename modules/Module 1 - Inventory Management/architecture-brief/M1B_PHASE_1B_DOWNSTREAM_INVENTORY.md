# M1B Phase 1B — Downstream Inventory & Wired-Stub-Missing Map

> **Mission:** Map every place in the codebase + DB that touches lens-related
> tables. Identify what's already wired, what's stub, what's missing. Cross-
> reference with M9 (Lab/KDS) and M7 (Order Entry).
>
> **Read-only knowledge build.** Generated 2026-05-15 night.
> Sourced from sub-agent enumeration + live DB SELECT against `tsxrrxzmdxaenlvocyit`.

---

## 1. TL;DR — and an important correction

**Brief premise correction:** the Overnight Brief stated *"Phase 1B (6 customer-facing screens) is deferred."* That premise is now stale. **Phase 1B Foundation is largely SHIPPED on `origin/main`.**

Concrete evidence in the repo:
- 7 `lens-*.html` root pages (91-254 lines each).
- 7 `modules/lens-*` JS module folders with non-trivial implementation (each module has 4-7 sub-files, all under Iron Rule 12 size cap).
- Phase 1B Foundation Brief + Phase 1B Procurement Brief + Phase 1B Gap Closure Brief all exist (sealed).

**What is genuinely remaining** is NOT "Phase 1B build" — it is:
1. **Cross-module wiring** to M7 (Order Entry) — pending M7's own build to consume `lens_variant` references.
2. **Cross-module wiring** to M9 (Lab/KDS) — `pending_lens_advancement_queue` is enqueued by M1's K3 trigger but M9's consumer is not yet built.
3. **Hardening items** from Phase 1A code review (A-4 sequence generators using MAX, B-4 RLS policy split). Tracked under `M1B_FOUNDATION_PERMISSIONS_HOTFIX` SPEC (seen in architecture-brief folder).
4. **Phase 1B Procurement screens** — half the procurement HTML/JS exists (lens-purchase-order, lens-goods-receipt) but write-path completeness is unclear; deferred to the Brief's writers.

This map clarifies the actual state to accelerate the M1B follow-up SPEC authoring (gap closure + M7/M9 wiring), NOT the original "Phase 1B build" SPEC.

---

## 2. DB schema landscape (live)

Tables with `lens` in name (live `information_schema.tables` 2026-05-16):

| Table | Owner phase | Notes |
|---|---|---|
| `lens_brand` | Phase 1A (2026-05-14) | Platform-owned (`owner_tenant_id NULL`). |
| `lens_design` | Phase 1A | Brand × series. |
| `lens_variant` | Phase 1A | Per (design × refractive × diameter × coating × tint). |
| `lens_variant_display_seq` | Phase 1A | Singleton for `next_lens_variant_display_id()` LV-NNNNNN. |
| `tenant_lens_stock` | Phase 1A | Tenant-scoped: qty_on_hand per (location × variant × SPH/CYL/ADD). |
| `pending_lens_advancement_queue` | Phase 1A | K3 contract: enqueued by M1 stock_movement trigger when `sale_order_id IS NOT NULL`. **Consumer (M9) not built.** |

Adjacent (non-`lens`-prefix but used by lens flow):
- `supplier_brand_distribution` (Phase 1A) — supplier-brand mapping.
- `supplier_catalog_offering` (Phase 1A) — tenant × variant × decomposed price.
- `pricing_overlay` + `vat_rates` (Phase 1A) — overlay-based pricing engine.
- `tenant_location` + `tenant_active_offerings` (Phase 1A) — branch and visibility.
- `stock_lot` + `stock_movement` + `stock_transfer` (Phase 1A) — FIFO + append-only ledger.
- `purchase_receipt` + `purchase_receipt_line` (Phase 1A; **distinct from `goods_receipts`** frames-era legacy table).
- `purchase_order` + `purchase_order_line` (M1B0_PURCHASE_ORDER_SCHEMA 2026-05-15) — new canonical.
- `supplier_permissions`, `change_approval_log` (Phase 1A) — governance.
- `vat_rates` (Phase 1A; Israel 18% seeded at M1A-DEBT-01).

**Total Phase 1A + M1B0 inventory: ~18 tables.**

---

## 3. Edge Functions

Only one EF touches lens tables directly:

- **`lens-catalog-import`** (`supabase/functions/lens-catalog-import/`, sealed 2026-05-14)
  - Authored Phase 1A. Accepts JSON payload from platform admin (parsed xlsx). Idempotent bulk INSERT into `lens_brand → lens_design → lens_variant → supplier_catalog_offering`.
  - Auth: `verify_jwt=true` + `is_platform_super_admin` server-side gate.
  - Files: `index.ts` + `validate.ts` helper.
  - Status: **WIRED**, used by `modules/lens-catalog-admin/lens-catalog-admin-import.js`.

No other lens-touching EFs today. M9 will need its own EF when it consumes `pending_lens_advancement_queue` — see §5.

---

## 4. UI surface (HTML + JS module folders)

7 root pages + 7 module folders. Total ~2,260 LOC of JS lens-screens code on `origin/main`:

| Screen (HTML) | LOC | Module folder | Module LOC (combined) | State |
|---|---:|---|---:|---|
| `lens-inventory.html` | 122 | `modules/lens-inventory/` (5 files) | ~585 | WIRED |
| `lens-purchase-order.html` | 180 | `modules/lens-purchase-order/` (6 files) | ~560 | WIRED (read paths) |
| `lens-goods-receipt.html` | 217 | `modules/lens-goods-receipt/` (8 files) | not measured | WIRED (read + partial write) |
| `lens-pricing.html` | 103 | `modules/lens-pricing/` (5 files) | not measured | WIRED |
| `lens-active-designs.html` | 91 | `modules/lens-active-designs/` (3 files) | not measured | WIRED |
| `lens-catalog-admin.html` | 254 | `modules/lens-catalog-admin/` (7 files) | not measured | WIRED (platform-admin) |
| `lens-pos-list.html` | 149 | `modules/lens-pos-list/` (4 files) | not measured | WIRED (read-only POS view) |

Plus `shared/js/lens-nav-strip.js` — common nav bar across all 7 screens.

**Verdict:** Phase 1B Foundation is functionally complete on the UI side. Phase 1B Procurement (PO + Goods Receipt) is also UI-built but the **write completeness against M1B0 schema needs verification** before declaring shipped — this is the focus area for the next M1B SPEC.

---

## 5. K-series contracts (cross-module wiring)

From Phase 1A SPEC (sealed 2026-05-14) and `M1_M9_OVERLAP_REPORT.md`:

| Contract | Direction | Mechanism | Status |
|---|---|---|---|
| **K1** | M1 → all | M1 owns `lens_brand/design/variant` source-of-truth | ✅ WIRED |
| **K2** | UI → M1 | `m1_create_receipt_from_box(supplier_id, ...)` RPC orchestrates goods receipt completion | ✅ WIRED |
| **K3** | M1 → M9 | Trigger `m9_lens_received_for_sale_order_trg_fn` on `stock_movement` enqueues `pending_lens_advancement_queue` when `sale_order_id IS NOT NULL` | ⚠ WIRED but **CONSUMER MISSING** (M9 not built) |
| **K4** | M9 → optician | M9 reads queue, updates lab_jobs, notifies optician | 🚫 MISSING (M9 not built) |
| **K5** | M1 → M9 | View `v_suppliers_for_m9` (security_invoker=on, anon GRANTs revoked per M1A_OPERATIONS_RPCS_FIX) | ✅ WIRED (defensive — M9 will JOIN when built) |

**Implication for next SPEC:** `pending_lens_advancement_queue` may accumulate rows once M1 inventory + sales flows go live. Without M9 consumer, those rows sit unprocessed. Either (a) defer M1 lens-on-sale flow until M9 ships, or (b) build a no-op M9 stub that marks queue rows `consumed` so they don't accumulate.

---

## 6. RPC inventory — every atomic operation that touches lens tables

From `supabase/migrations/20260514180400_m1_lens_phase_1a_rpcs_trigger_view.sql`:

| RPC | Purpose | SECURITY DEFINER | Atomicity (Iron Rule 1, 11) |
|---|---|---|---|
| `next_lens_variant_display_id()` | LV-NNNNNN global generator | ✅ | ✅ |
| `next_lot_number(p_tenant_id)` | LOT-NNNNNN per tenant | ✅ | ⚠ A-4: uses MAX-based; refactor to seq-table pattern (per code review). |
| `next_transfer_number(p_tenant_id)` | TRN-NNNNNN per tenant | ✅ | ⚠ A-4 same as above. |
| `next_receipt_number(p_tenant_id)` | RCP-NNNNNN per tenant | ✅ | ⚠ A-4 same as above. |
| `effective_price(...)` | Overlay-based pricing resolver | ✅ | ✅ (pure read) |
| `record_stock_movement(...)` | Append-only ledger w/ FOR UPDATE on lot | ✅ | ✅ |
| `record_transfer(...)` | Parent + 2 children + dest lot in single tx | ✅ | ✅ |
| `record_adjustment_found(...)` | Stock-found adjustment | ✅ | ✅ |
| `m1_create_receipt_from_box(...)` | K2 orchestrator (fires K3 trigger automatically) | ✅ | ✅ |

All 9 RPCs are wired. A-4 hardening (MAX → seq-table) is the only remaining sequence-pattern debt — tracked in `M1B_FOUNDATION_PERMISSIONS_HOTFIX` brief.

---

## 7. Reviewer-flagged debt items (Phase 1A code review)

From `CODE_REVIEW_REPORT.md` (independent reviewer session, 2026-05-15):

| ID | Severity | Item | Status |
|---|---|---|---|
| A-4 | MEDIUM | 3 sequence RPCs use MAX-based pattern instead of seq-table. Fine at low load; problematic at Phase 1B's projected 60-100 writes/min. | OPEN — should land in M1B_FOUNDATION_PERMISSIONS_HOTFIX or sibling. |
| B-4 | MEDIUM | All 13 `tenant_isolation` policies are `FOR ALL TO public`. Append-only ledger `stock_movement` + FIFO `stock_lot.qty_remaining` integrity enforced at app layer only. Should split into `FOR SELECT` (public) + `FOR INSERT/UPDATE/DELETE` (service_role only). | OPEN — hardening SPEC. |
| B-5 | LOW | `pricing_overlay.scope_supplier_id` FK to `suppliers` has no same-tenant constraint. Foot-gun, not a leak. | DEFERRED — same shape across project. |
| C-1/2/3 + E-2 | MEDIUM | `REVOKE EXECUTE` on 10 functions + over-broad grants on `v_suppliers_for_m9` (anon could SELECT, mitigated by `security_invoker=on` + RLS). | ✅ CLOSED by `M1A_OPERATIONS_RPCS_FIX` SPEC. |
| H-1 | MEDIUM | 21 unindexed FK columns on Phase 1A tables. Sequential FK checks at Phase 1B load = pain within months. | OPEN — index SPEC. |

**Action:** all OPEN items in this table belong to the next M1B SPEC (or a sibling hardening SPEC) — none block screens but all should land before sustained Phase 1B production load.

---

## 8. M7 (Order Entry) wiring requirements

M7 is unbuilt today. When it ships, it must:

1. **Reference `lens_variant.id` on order lines** for prescription-lens line items.
2. **Pass `sale_order_id` to `record_stock_movement`** when consuming lens stock — this is what fires the K3 trigger that enqueues M9 work.
3. **Read `effective_price(variant_id, tenant_id, application_order)`** for line-item pricing.
4. **Honor `tenant_active_offerings`** — only show variants the tenant has enabled.

**Files where M7 will integrate:**
- `shared/js/lens-nav-strip.js` — add M7 button.
- M7's own order-entry HTML (when built) imports a lens-variant picker from `modules/lens-pos-list/` or a new shared component.
- M7's order-finalize RPC calls `record_stock_movement(... sale_order_id := <new>)`.

**Pre-condition for M7 SPEC:** M9 must either be built OR a no-op stub must exist (per §5), otherwise queue accumulation begins immediately.

---

## 9. M9 (Lab/KDS) wiring requirements

M9 sealed Brief 2026-05-10 (per Brief §13 cross-ref). The Brief locks the K4 contract but no implementation has landed.

**M9 must build:**
1. **Queue consumer** — EF or pg_cron that drains `pending_lens_advancement_queue`. Pattern can follow `fb_capi_dispatch_consumer` (per M3 mission).
2. **`lab_jobs` table** + RPC `m9_advance_lab_job(queue_row_id, action, user_id)`.
3. **`lab_routing_rules` table** (per M9 Brief) — supplier × variant → routing decision (in-house grinding vs supplier vs RT).
4. **Optician notification surface** — likely reuses M4 CRM message infrastructure (send-message EF).

**M9 pre-conditions:**
- `v_suppliers_for_m9` already exists (K5). ✅
- `pending_lens_advancement_queue` schema exists. ✅
- M1 stock_movement trigger enqueues correctly. ✅

**M9 dependencies that are missing:**
- A way to know "is this lens variant in stock?" — would JOIN `tenant_lens_stock` (already exists).
- A way to know which supplier supplied THIS lot — `stock_lot.supplier_offering_id → supplier_catalog_offering → supplier_id` (chain exists).

---

## 10. Stub / TODO / FIXME audit

Sub-agent searched all `modules/lens-*/**/*.js` files. **No TODO/FIXME/STUB comments found.** This is consistent with the Iron Rule "Only add a comment when WHY is non-obvious" discipline.

That said, **completion-level is hard to assess from comments alone.** A function with no TODO could be (a) complete, or (b) stubbed without notation. To verify, the next SPEC author should run a smoke test of each Phase 1B screen on demo, document any "TODO-by-omission" behaviors.

---

## 11. SPEC stubs for the M1B follow-up phase

> Two parallel SPECs recommended for the next architect session. Both unblock further phases.

### 11.1 `M1B_HARDENING_AND_WIRING`
**Goal:** Close all OPEN items from Phase 1A code review (§7) and prepare for M7/M9 integration.
- A-4: refactor 3 sequence RPCs to seq-table pattern.
- B-4: split RLS policies into `FOR SELECT` (public) + `FOR INSERT/UPDATE/DELETE` (service_role).
- H-1: add 21 missing FK indexes (CONCURRENTLY).
- (Pre-requisite for any sustained Phase 1B production load.)
- Effort estimate: 4-6 hours.

### 11.2 `M9_LAB_FOUNDATION`
**Goal:** Implement the M9 consumer for `pending_lens_advancement_queue` per the sealed M9 Brief.
- Create `lab_jobs` table + RPCs.
- Author the queue-drain EF + pg_cron.
- Wire the optician notification path.
- (Pre-requisite for sustained M1 lens-on-sale operation OR ship M1 lens-on-sale gated until this lands.)
- Effort estimate: 12-16 hours (depends on M9 scope).

---

## 12. Auxiliary findings (parking lot)

- The Brief's M1B "deferred" claim is the third such case where a Brief was written before reading the latest repo state. Pattern worth noting: Brief authors should read `OPEN_TASKS.md` + ROADMAP first; in this case the M1B Foundation was already in flight.
- `M1_LENS_PHASE_1B_GAP_CLOSURE_BRIEF.md` exists in the architecture-brief folder — implies that gap closure work has been scoped. SPEC author should read it BEFORE drafting M1B_HARDENING_AND_WIRING — likely overlaps.
- `M1_LENS_PHASE_2_COMPLETION_NIGHT_BRIEF.md` exists — separate from M1B. Phase 2 work appears to be queued. Read before any M1 SPEC.
- `M1B_FOUNDATION_PERMISSIONS_HOTFIX_BRIEF.md` exists — likely the place where A-4/B-4 are already being scoped. Verify before duplicating.
- 7 distinct `M1*` briefs in the architecture-brief folder. Worth a 30-minute SPEC-stack-cleanup ceremony to harmonize.

---

## 13. Reproducibility

Sub-agent search executed 2026-05-15 23:50 IDT. Live DB queries against `tsxrrxzmdxaenlvocyit` at the same time. No write operations.

---

*End of M7. Companion: the next architect session should author `M1B_HARDENING_AND_WIRING` + `M9_LAB_FOUNDATION` SPECs in parallel, OR consolidate into a single phased SPEC. Brief premise was outdated; map above clarifies real state.*
