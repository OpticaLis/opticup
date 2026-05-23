# Module 8 — Payments — Session Context

**Last updated:** 2026-05-23 overnight chain close.
**Status:** 🟢 Phase A+B (Schema + RPCs + Event Mechanism + Adapter Manifest Skeleton) CLOSED.

## Current state

- **5 new tables + 1 extended:** payments (28 cols), payment_channels, payment_capabilities (global), payment_adapters (global manifest), payment_events_queue; payment_methods EXTENDED additively (8→15 cols, 4 demo rows preserved + 8 new across both tenants).
- **4 enums:** payment_status (10-state), check_bounce_reason, payment_channel_status, payment_event_kind.
- **5 RPCs + 2 trigger fns:** record_payment, mark_check_deposited, mark_check_cleared, mark_check_returned, mark_salary_deduction_processed + emit_first_payment_event_fn + emit_check_returned_event_fn.
- **2 event triggers attached:** trg_emit_first_payment_event (AFTER INSERT ON payments), trg_emit_check_returned_event (AFTER UPDATE OF status ON payments).
- **5 views:** v_order_payment_summary, v_customer_payments_history, v_payments_for_reports, v_salary_deduction_pending, v_returned_checks_pending.
- **Seed data:** 12 payment_capabilities + 3 payment_adapters manifest (mock active, gama_pay+z_credit inactive) + 2 payment_channels (Mock per tenant) + 12 payment_methods (6 per tenant).
- **Smoke:** M8 8/8 + cross-contract M5→M7→M8 6/6 PASS on demo. **0 Prizma row writes** on payments/payment_events_queue ✅.

## Cross-contract surfaces (M8 ↔ everyone)

| Surface | Type | Owner | Consumer(s) | State |
|---|---|---|---|---|
| `payments.order_id` FK | FK | M8→M7 | — | live |
| `payments.customer_id` FK | FK | M8→M5 | — | live |
| `v_order_payment_summary` | View | M8 | M7 editor (Phase E) | live |
| `v_customer_payments_history` | View | M8 | M5 customer card | live |
| `v_payments_for_reports` | View | M8 | M11 future | live |
| `v_salary_deduction_pending` | View | M8 | M11 future + admin pipeline | live |
| `payment_events_queue` | event channel | M8 emits | M7 + M4 listeners (deferred) | emits live, consumers pending |
| `record_payment(...)` | RPC | M8 | M7 checkout (Phase E) | live |
| `mark_check_*` × 4 | RPC | M8 | M8 checks pipeline UI (Phase G) | live |
| `mark_salary_deduction_processed` | RPC | M8 | M11 salary report (mutation contract) | live |

## What's next

- **M9 (Lab)** — buildable; FK to M7 `sub_orders.id` ready. Separate overnight chain.
- M8 Phase C — Real Linet/Gama adapter integration. NDA + sandbox + Daniel-in-loop.
- M8 Phase D — Provider Config UI. Chrome MCP.
- M8 Phase E — Checkout UI (block in M7). Chrome MCP.
- M8 Phase F — Daily-close UI.
- M8 Phase G — Checks Pipeline UI.
- M8 Phase H — OpticPlus migration (1,160 credit-installments + 9,828 receipts).
- M7 listener attach for first_payment event (Phase E).
- M4 listener attach for check_returned event.

## Notes

- Adapter manifest is SKELETON ONLY — `payment_adapters` rows describe Mock + Gama + Z Credit with capability flags + credentials_schema_jsonb. ZERO integration code in this chain. Real `IPaymentProvider` class + LinetAdapter etc. = Phase C.
- credentials_jsonb column on payment_channels exists but unencrypted at Phase A. Encryption layer = Phase C.
- Event mechanism mirrors M1 K3 + M4 trigger patterns (durable queue, not pg_notify).
