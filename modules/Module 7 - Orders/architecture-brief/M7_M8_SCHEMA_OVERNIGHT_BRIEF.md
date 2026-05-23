# Module Brief — M7 + M8 SCHEMA Overnight Build (schema-only, no UI, no provider integration)

**Brief version:** v1
**Date:** 2026-05-18
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Strategist Foreman.
**Pipeline:** Full Auto Pipeline CHAIN — M7 schema → M7 smoke → M8 schema → M8 smoke → cross-contract smoke. Run-to-end with stop-on-deviation. ~10-12 hours.
**Branch:** `develop`. Daniel-only merge to main after QA.
**Environment:** Claude Code (not Cowork — MCP 45s timeout would break DDL).

---

## 1. Purpose

Build the **schema foundation** of M7 (Orders) + M8 (Payments) on the **demo tenant** in one chain. These are the customer-purchase flow: an order holds line items + prescriptions + inventory; a payment settles the order. Together with M5/M6 (built 2026-05-17), this completes the core customer→order→payment data spine.

After this: M9 (Lab) gets its own overnight run (10 tables + 5 engines — too big to combine). M9 FKs to M7's `orders`, so M7 must exist first.

**Schema only.** No UI (checkout screen, order screen, daily-close). No real payment-provider integration (Gama Pay / Z Credit). The payment-adapter layer ships as a **skeleton manifest** (config rows describing providers) — the actual charge/refund integration with a live provider needs credentials + webhooks + sandbox testing (Daniel-in-loop), so it's a separate SPEC.

**Bias:** Build exactly what the two sealed Briefs specify. No relitigating decisions. Schema, RLS, Views, RPCs, functional smoke. Stop.

**Dependencies — all verified present 2026-05-18:** M5 `customers` ✅, M6 `prescriptions_glasses`/`prescriptions_contacts` ✅, M1 `purchase_order_line.sale_order_id` ✅ (the FK that waits for M7 orders), M1 `inventory` (existing). Ground is ready.

---

## 2. Scope — In

Two halves, M7 first (M8 FKs to `orders`), each with mandatory functional smoke.

### Half 1 — M7 Orders schema

Source: `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md` (sealed). Read end-to-end.

**Tables (Brief §2):**
- `orders` — order head. FK `customer_id` → customers (M5). Status enum (quote/active/...). order_number sequential per-tenant (atomic RPC, Iron Rule 11).
- `sub_orders` — sub-order. Multi-state via flags (active/quote/reservation + is_repair + has_open_task), NOT separate tables (Pattern §5.1). FK `prescription_glasses_id` / `prescription_contacts_id` → M6. FK `location` for M9 lab flow.
- `sub_order_items` — line item. FK `inventory_id` → M1 inventory.
- `order_general_discounts` — order-level discounts (incl. loyalty coupons via discount_type).
- `order_sequences` — per-tenant numbering config.

**Views (Brief §4):** `v_order_customer_summary` (reads M5 customer data for M7), plus order-facing Views the downstream modules consume — `v_lab_queue` surface (M9 reads), order summary for M8/M11. Module Strategist enumerates from §4 + §3.

**RPCs:** order creation (atomic, allocates order_number), sub-order add/edit, `decrement_inventory(inventory_id, qty)` + `increment_inventory` (atomic FOR UPDATE — the M1 contract, called on state→active; lens decrements only if `decrements_inventory=true` per §4.3), discount apply. Module Strategist pins exact list from Brief §4 + the M7 feature inventory.

**M1 inventory contract:** M7 calls existing M1 `decrement_inventory`/`increment_inventory` RPCs. If those don't exist yet (probe), the Module Strategist builds thin atomic wrappers per §4.3 — but check first; M1 Lens may already have them.

### Half 2 — M8 Payments schema

Source: `modules/Module 8 - Payments/architecture-brief/M8_PAYMENTS_BRIEF.md` (sealed). Read end-to-end.

**Tables (Brief §2):**
- `payments` — payment record. FK `order_id` → M7 orders. State-machine (Brief §3.1). Supports salary-deduction-pending status, returned-check reopen.
- `payment_methods` — active payment types per-tenant (config P19).
- `payment_channels` — settlement channels per-tenant (config). State-machine (Brief §3.2).
- `payment_capabilities` — global capability pool.
- `payment_adapters` — **SKELETON manifest only.** Config rows describing providers (Gama/Z Credit/Mock) + their capability flags. NO adapter code, NO live integration. The `IPaymentProvider` interface + concrete adapters are a separate SPEC.
- `salary_deduction_pending` — a View, not a standalone table (Brief §2.6).

**Views (Brief §4):** `v_order_payment_summary(order_id)` (M7 reads — total_paid, last_payment_at, methods_used), `getPaymentsByCustomer` surface for M5, `v_payments_for_reports` (M11 — unified across statuses, per-day/optometrist/channel/health-fund/type slices).

**RPCs:** record_payment (atomic, FK to order, fires "first payment" event that M7 listens to), refund/reverse, salary-deduction status transitions (the M11-mutation contract), check-returned handler (emits event to M7 + M4). Module Strategist pins from Brief §4.

**Events M8 emits (M8 never calls M7 directly):** first-payment-recorded → M7 listens (status quote→active + thank-you). check-returned → M7 listens (reopen balance) + M4 listens (open call-customer task). Build the event-emission mechanism; the M7/M4 listeners are wired when those consume (M7 exists this chain; M4 exists already).

### Cross-contract smoke (M7↔M8 bridge — mandatory)

After both halves, prove the order→payment flow on demo:
1. `create_customer` (M5, existing) → customer_id.
2. Create order for that customer → order_id + order_number, status='quote'.
3. Add sub-order with a prescription (M6, existing) + a line item (M1 inventory) → inventory decremented.
4. `record_payment(order_id, amount, method)` → payment recorded, first-payment event fires.
5. Confirm `v_order_payment_summary(order_id)` shows total_paid.
6. Confirm order status auto-advanced quote→active (the M7↔M8 contract).

### Functional smoke per half (mandatory — no 🟢 without it)

**M7 smoke (≥8):** create order + order_number allocated + add sub-order (active/quote/reservation flag variants) + add line item + decrement_inventory atomic + increment on cancel + discount apply + cross-tenant guard + anon-reject on all RPCs.

**M8 smoke (≥8):** record_payment + FK to order enforced + state-machine transition + salary-deduction-pending status + check-returned emits event + payment_methods config respected + cross-tenant guard + anon-reject.

All smoke on demo tenant (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). Captured in TEST_REPORT.md per half.

---

## 3. Scope — Out (anti-creep)

- **No UI.** No checkout screen, no order screen, no daily-close, no provider-config screen, no print forms. Separate UI SPECs (Daniel-in-loop for Chrome MCP smoke).
- **No real payment-provider integration.** `payment_adapters` is a config-manifest skeleton only. No `IPaymentProvider` code, no Gama/Z Credit charge/refund, no webhooks, no card tokenization. Separate SPEC with credentials + sandbox.
- **No Prizma data writes.** DDL applies to both tenants; functional smoke data on demo only.
- **No M9 Lab schema** — separate overnight run (M9 FKs to M7, so M7 first).
- **No M11/M12/M13 build** — M7/M8 emit the Views + events they'll consume; the consumer modules build later.
- **No OpticPlus order/payment migration** — separate migration SPEC.
- **No merge to main.** Daniel-only after QA.
- **No relitigating** sealed M7 + M8 decisions.

---

## 4. Locked Decisions (inherited — do not relitigate)

| # | Decision | Source |
|---|---|---|
| 1 | Multi-state sub-order via flags (active/quote/reservation + is_repair + has_open_task), NOT separate tables | M7 §5.1 |
| 2 | order_number + payment numbering sequential per-tenant, atomic RPC (Iron Rule 11) | M7 §2.5 |
| 3 | M8 never calls M7 directly — M8 emits events, M7 listens | M8 §4.1 |
| 4 | payment_adapters = config manifest; adapter code is separate SPEC | M8 §10 (adapter pattern) |
| 5 | Prescription snapshot-ID on sub-order — changing M6 prescription doesn't alter existing order | M7 §4.2 |
| 6 | Inventory decrement on state→active; lens decrements only if decrements_inventory=true | M7 §4.3 |
| 7 | Salary-deduction = M8 status; M11 has a mutation contract to mark "✓ deducted" | M8 §4.2 |
| 8 | All RPC discipline inherited from M1A_OPERATIONS_RPCS_FIX | Project policy |
| 9 | Iron Rule 32 §7 Destructive Operations = None on existing tables/data | Project policy |
| 10 | config tables (payment_methods, payment_channels) per-tenant P19; state-machines are bounded enums | M8 |

---

## 5. Success Criteria

1. **All M7 tables exist** with RLS (canonical 2-policy) + tenant-scoped UNIQUE + soft-delete + FK indexes.
2. **order_number atomic allocation** (FOR UPDATE) — concurrent-call test in smoke.
3. **M7 Views deployed** per Brief §4.
4. **M7 RPCs deployed** with full M1A discipline (SECURITY DEFINER + search_path + JWT guard + REVOKE/GRANT).
5. **M1 inventory decrement/increment contract works** — atomic, verified in smoke (inventory drops on state→active, restores on cancel).
6. **M7 functional smoke ≥8/8 PASS on demo.**
7. **All M8 tables exist** (payments + 4 config + adapters skeleton) with RLS + state-machine constraints.
8. **M8 Views deployed** including `v_order_payment_summary` + `v_payments_for_reports`.
9. **M8 RPCs deployed** with full discipline. Payment events emitted (mechanism built).
10. **M8 functional smoke ≥8/8 PASS on demo.**
11. **Cross-contract smoke 6/6 PASS** (order→payment→status-advance flow).
12. **No new HIGH/ERROR advisor lints.** Run `scripts/audit/advisors-for-objects.mjs`.
13. **No Prizma data written.**
14. **Iron Rules 1, 11, 14, 15, 18, 19, 22, 23, 31, 32 — no new violations.**
15. **T-constants + FIELD_MAP extended** for all new tables.
16. **GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged additive.**
17. **Module docs**: M7 + M8 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP (schema phase done, UI + adapter + migration pending).
18. **MIGRATION.md Applied Log** per harvested E1.
19. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** per module.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

§0 mandatory audits (Inner-call arity + Smoke-touched schema + Concurrent-Pipeline envelope). Plus:

```sql
-- Probe 1: confirm M7+M8 tables don't exist yet
SELECT to_regclass('public.orders'), to_regclass('public.sub_orders'), to_regclass('public.sub_order_items'),
       to_regclass('public.order_general_discounts'), to_regclass('public.order_sequences'),
       to_regclass('public.payments'), to_regclass('public.payment_methods'), to_regclass('public.payment_channels'),
       to_regclass('public.payment_capabilities'), to_regclass('public.payment_adapters');

-- Probe 2: confirm dependencies exist (M5 customers, M6 prescriptions, M1 inventory + purchase_order_line.sale_order_id)
SELECT to_regclass('public.customers'), to_regclass('public.prescriptions_glasses'),
       to_regclass('public.prescriptions_contacts'), to_regclass('public.inventory'),
       (SELECT column_name FROM information_schema.columns WHERE table_name='purchase_order_line' AND column_name='sale_order_id');

-- Probe 3: does M1 already have decrement_inventory/increment_inventory RPCs? (M7 §4.3 contract)
SELECT proname FROM pg_proc WHERE proname IN ('decrement_inventory','increment_inventory','record_stock_movement');

-- Probe 4: existing inventory table shape (M7 sub_order_items FK target)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='inventory' AND table_schema='public' ORDER BY ordinal_position LIMIT 30;

-- Probe 5: next_*_number RPC pattern to mirror for order_number + payment numbering
SELECT pg_get_functiondef('next_receipt_number'::regproc);

-- Probe 6: demo customer + prescription fixtures from last night's M5/M6 smoke (for cross-contract test)
SELECT count(*) AS demo_customers FROM customers WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
SELECT count(*) AS demo_prescriptions FROM prescriptions_glasses WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Probe 7: how does the project emit + listen to events today? (M8 first-payment event mechanism)
-- via shell: grep -rn "AFTER INSERT\|pg_notify\|event" supabase/migrations/ | grep -i trigger | head -10
-- Look at how M1's K3 trigger (pending_lens_advancement_queue) emits events — mirror that pattern.
```

Each probe → §0 baseline.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1** — atomic order + payment RPCs.
- **Rule 11** — order_number + payment numbering atomic FOR UPDATE.
- **Rule 14, 15, 18** — tenant_id NOT NULL + canonical RLS + tenant-scoped UNIQUE.
- **Rule 16** — M7↔M8 via events/Views only; M7↔M5/M6/M1 via Views + contract RPCs. No direct cross-module table writes.
- **Rule 19** — payment_methods/channels config tables; statuses bounded enums.
- **Rule 22** — defense-in-depth on every write.
- **Rule 31, 32** — gate clean + Destructive Ops None.

---

## 8. Anti-Patterns

- **Authoring blind.** §6 probes first.
- **Building UI.** Schema only.
- **Building real payment-provider adapters.** Skeleton manifest only.
- **M8 calling M7 directly.** M8 emits events; M7 listens.
- **Separate tables for repair/reservation.** Flags on sub_orders (Pattern §5.1).
- **Relitigating sealed decisions.**
- **Skipping functional smoke.** No 🟢 without M7 8/8 + M8 8/8 + cross-contract 6/6.
- **Touching Prizma data.**
- **Single mega-SPEC.** Recommend two SPECs (M7_SCHEMA + M8_SCHEMA) chained.

---

## 9. Open Questions for the Module Strategist

1. **One SPEC or two (M7_SCHEMA + M8_SCHEMA chained)?**
*Recommendation: two, chained.* Independently verifiable; per-module FOREMAN_REVIEW.

2. **Does M1 already have decrement_inventory/increment_inventory (Probe 3)?**
*If yes — M7 calls them. If no — M7 builds thin atomic wrappers per §4.3. Document the choice.*

3. **Event mechanism for first-payment + check-returned (Probe 7)?**
*Recommendation: mirror M1's K3 trigger pattern (AFTER INSERT → queue table). Reuse, don't invent.*

4. **payment_adapters skeleton — how many seed rows?**
*Recommendation: seed Mock + Gama + Z Credit as config rows with capability flags, zero integration code.*

5. **order_number format — composite like customer_number or simple sequential?**
*Recommendation: follow M7 §2.5 + order_sequences config. Pin from Brief.*

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md` | M7 sealed Brief — read end-to-end |
| `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FEATURE_INVENTORY.md` | Full M7 feature/field list |
| `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_HANDOFF.md` | M7 hand-off notes |
| `modules/Module 8 - Payments/architecture-brief/M8_PAYMENTS_BRIEF.md` | M8 sealed Brief — read end-to-end |
| `modules/Module 8 - Payments/architecture-brief/M8_HANDOFF.md` | M8 hand-off |
| `modules/Module 8 - Payments/architecture-brief/M8_PROVIDER_INTERFACE_RESEARCH.md` | Adapter interface design (context — NOT built this SPEC) |
| `modules/Module 5 - Customers/docs/specs/M5_SCHEMA/` | M5 schema patterns to mirror (built last night) |
| `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/` | M6 schema patterns to mirror |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | RPC discipline reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | Schema + smoke patterns; the K3-trigger event pattern to mirror |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note — Overnight Chain

Full Auto Pipeline CHAIN in one Claude Code chat, run-to-end with stop-on-deviation. Finish-the-sequence: no pause between M7 and M8 unless real deviation. One Hebrew status line at chain end.

Order:
1. `opticup-strategic` reads this Brief + both module Briefs + §6 probes.
2. Authors MODULE_7_ROADMAP + M7_SCHEMA SPEC.
3. `opticup-executor` builds M7 schema + Views + RPCs.
4. **M7 functional smoke 8/8 on demo.** Fail → STOP, escalate, halt.
5. `opticup-strategic` authors MODULE_8_ROADMAP + M8_SCHEMA SPEC.
6. `opticup-executor` builds M8 schema + Views + RPCs + event mechanism.
7. **M8 smoke 8/8 + cross-contract smoke 6/6 on demo.** Fail → STOP, escalate, halt.
8. `opticup-reviewer` → REVIEW.md per module + advisors-for-objects.mjs.
9. `opticup-strategic` Foreman → FOREMAN_REVIEW.md per module.
10. ONE Hebrew status line to Daniel at chain end.

**Escalation:** write `modules/Module {7,8}/escalations/{ISO_TS}_{topic}.md` + one Hebrew line. Halt.

After 🟢: Daniel QA + merge. **M9 (Lab) becomes buildable** (FKs to orders now exist) — next overnight run. UI SPECs + payment-adapter integration + OpticPlus migration become schedulable (Daniel-in-loop).

Per P42, self-validate every file write (line count + tail + markers) before declaring any phase complete.

---

*End of Brief. M7 + M8 schema foundation. No UI. No provider integration. Functional smoke mandatory. Run-to-end.*
