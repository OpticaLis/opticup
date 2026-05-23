# Module 8 — Payments — Roadmap

> **Authored by:** opticup-strategic — 2026-05-23 overnight chain Half 2
> **Source briefs:** `architecture-brief/M8_PAYMENTS_BRIEF.md` (v1, sealed 2026-05-09) + `architecture-brief/M7_M8_SCHEMA_OVERNIGHT_BRIEF.md` (v1).
> **Predecessor:** M7_SCHEMA closed 🟢 2026-05-23 (smoke 9/9). M8 FKs to `orders.id`.

## Phases

| Phase | Name | Status | SPEC folder | Notes |
|---|---|---|---|---|
| **A** | Schema (foundation + 5 tables + Mock adapter manifest) + first-payment event mechanism | ⬜ in progress (2026-05-23 overnight) | `docs/specs/M8_SCHEMA/` | Combined Phase A+B per overnight Brief |
| **B** | RPCs + state-machine + check-returned event | ⬜ in progress | `docs/specs/M8_SCHEMA/` | Same SPEC |
| C | Real Linet/Gama adapter integration (IPaymentProvider code, sandbox tests) | ⬜ deferred | `docs/specs/M8_ADAPTER_LINET/` | Daniel-in-loop + NDA + credentials |
| D | Provider Configuration UI | ⬜ deferred | `docs/specs/M8_UI_PROVIDER_CONFIG/` | Chrome MCP |
| E | Checkout UI (block in M7) | ⬜ deferred | `docs/specs/M8_UI_CHECKOUT/` | Chrome MCP |
| F | Daily-close UI | ⬜ deferred | `docs/specs/M8_UI_DAILY_CLOSE/` | Chrome MCP |
| G | Checks Pipeline UI | ⬜ deferred | `docs/specs/M8_UI_CHECKS_PIPELINE/` | Chrome MCP |
| H | OpticPlus migration (1,160 credit-installment + 9,828 receipts archive) | ⬜ deferred | `docs/specs/M8_MIGRATION/` | Daniel-in-loop |

## Phase A+B — Scope (this overnight SPEC)

**Tables built:**
- `payments` — central payment record (FK order_id → M7.orders, FK customer_id → M5.customers)
- `payment_methods` — EXTENDED additively (existing 8-col table from M1 era → +6 cols per M8 Brief §2.2)
- `payment_channels` — config per-tenant (Linet/Gama/Mock)
- `payment_capabilities` — global pool (credit/cash/check/installments/bit/tokenization/etc.)
- `payment_adapters` — **SKELETON manifest** (Mock + Gama + Z Credit seed rows with capability flags, NO integration code)
- `payment_events_queue` — event-emission queue (mirrors M1 K3 pattern: AFTER INSERT/UPDATE → queue row → M7/M4 listeners drain)

**Re-uses:**
- M5 `allocate_tenant_number(p_tenant_id, 'payment')` — atomic payment sequential per-tenant
- M5 `tenant_number_counters` shared infra

**Views (Brief §4):**
- `v_order_payment_summary(order_id)` — M7 reads: total_paid, last_payment_at, methods_used, payment_count
- `v_customer_payments_history` — M5 customer card consumes
- `v_payments_for_reports` — M11 future: unified across statuses, per-day/optometrist/channel/health-fund slices
- `v_salary_deduction_pending` — Brief §2.6 view (not standalone table): payments WHERE status='salary_deduction_pending'
- `v_returned_checks_pending` — admin pipeline view

**RPCs (5):**
- `record_payment(p_tenant_id, p_order_id, p_payload jsonb) → jsonb` — atomic; allocates payment_number; INSERT row; emits first-payment event if this is the first
- `mark_check_deposited(p_tenant_id, p_payment_id) → void` — state: deferred → in_bank
- `mark_check_cleared(p_tenant_id, p_payment_id, p_external_receipt_number) → void` — state: in_bank → paid
- `mark_check_returned(p_tenant_id, p_payment_id, p_bounce_reason) → void` — state: in_bank → returned + emits check-returned event
- `mark_salary_deduction_processed(p_tenant_id, p_payment_id) → void` — state: salary_deduction_pending → deducted

**Event mechanism:**
- AFTER INSERT ON payments → `emit_first_payment_event_fn()` checks if this is the first payment for the order, if yes inserts row into `payment_events_queue` with kind='first_payment'
- AFTER UPDATE OF status ON payments → `emit_check_returned_event_fn()` if old.status='in_bank' AND new.status='returned' → emits 'check_returned' event
- Listeners are M7 (reads queue, advances order.status quote→active + sets thanks_message_sent_at) and M4 (opens call-customer task). M7+M4 listener wiring **NOT in scope** — they consume when their listeners are wired.

**Functional smoke (≥8 on demo, mandatory):**
1. record_payment happy → payment_id + payment_number=1 + status='paid'
2. FK to order enforced (cross-order = FK error)
3. State-machine transition (mark_check_deposited deferred→in_bank)
4. salary_deduction_pending status appears in v_salary_deduction_pending view
5. mark_check_returned emits event into payment_events_queue
6. payment_methods EXTEND preserved 4 existing rows + added 6 new cols
7. Cross-tenant guard (demo session, prizma order_id → 42501)
8. Anon-reject on all 5 RPCs

**Cross-contract smoke (6 cases, mandatory):**
1. M5 create_customer → customer_id
2. M7 create_order → order_id + order_number, status='quote'
3. M7 add_sub_order with prescription_glasses_id + add_sub_order_item with inventory + transition→active → inventory decremented
4. M8 record_payment(order_id, amount) → payment_id, first_payment_event fires
5. v_order_payment_summary shows total_paid=amount
6. (Verified via event queue) — M7 listener would advance order.status quote→active; for this smoke we assert the event row exists in payment_events_queue (M7's listener attach is deferred)

## Out of Scope

- Real Linet/Gama/Z Credit adapter integration code (Phase C)
- IPaymentProvider interface / concrete charge/refund/webhook code
- Checkout UI (Phase E), Daily-close UI (Phase F), Checks Pipeline UI (Phase G), Provider Config UI (Phase D)
- credentials_jsonb encryption (build column nullable; encryption layer in Phase C)
- M7 listener implementation (M7's listener for first_payment event)
- M4 listener implementation (for check_returned event)
- OpticPlus migration (1,160 credit-installments + 9,828 receipts)
- Prizma row writes
- Merge to main

## Decision history (pinned)

20 sealed M8 decisions in `architecture-brief/M8_PAYMENTS_BRIEF.md` §8. Most load-bearing:
- 6 payment methods active for Prizma (cash/credit/transfer/check/bit/salary_deduction).
- Provider Adapter Pattern 3 layers: Adapter (code) → Manifest (DB) → Tenant Config (DB+UI).
- payment_capabilities = global pool; payment_adapters declare supported_capabilities.
- M8 emits events; M7+M4 listen. M8 NEVER calls M7 directly.
- Salary deduction = M8 status; M11 has mutation contract to mark "deducted".
- Configuration over enum (P19): all per-tenant payment configs are tables.

---

*End of MODULE_8_ROADMAP.md.*
