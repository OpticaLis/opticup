# M8_SCHEMA — Execution Report

> **Status:** 🟢 CLOSED. 2026-05-23 overnight chain Half 2. M8 smoke 8/8 + cross-contract 6/6 PASS on demo.

## 1. What was built

- **1 extended table:** payment_methods (8 cols → 15 cols additively, 4 existing demo rows preserved).
- **5 new tables:** payments (28 cols), payment_channels (per-tenant), payment_capabilities (global pool), payment_adapters (global manifest skeleton), payment_events_queue.
- **4 enums:** payment_status (10-state), check_bounce_reason, payment_channel_status, payment_event_kind.
- **5 RPCs + 2 event trigger fns:** record_payment, mark_check_deposited, mark_check_cleared, mark_check_returned, mark_salary_deduction_processed + emit_first_payment_event_fn + emit_check_returned_event_fn.
- **2 triggers attached:** trg_emit_first_payment_event (AFTER INSERT ON payments), trg_emit_check_returned_event (AFTER UPDATE OF status ON payments).
- **5 views:** v_order_payment_summary, v_customer_payments_history, v_payments_for_reports, v_salary_deduction_pending, v_returned_checks_pending. All security_invoker=on.
- **Seed:** payment_capabilities 12 global rows, payment_adapters 3 manifest rows (Mock + Gama + Z Credit — skeleton only, NO integration code), payment_channels 2 (Mock for demo + Mock for prizma), payment_methods extended on both tenants (12 rows total).
- **Re-used:** M5 `allocate_tenant_number(_, 'payment')`, M7 `orders.id` FK, M5 `customers.id` FK.

## 2. §3 Criteria — pass

| # | Expected | Actual | Pass |
|---|---|---|---|
| 3 | payments ≥25 cols | 28 | ✅+ |
| 4 | payment_methods extended (4 existing preserved) | 4 preserved + 2 new demo + 6 fresh prizma = 12 total | ✅ |
| 5 | 4 new tables | 4 (payment_channels + capabilities + adapters + events_queue) | ✅ |
| 6 | 4 new enums | 4 | ✅ |
| 7 | RLS pattern | tenant: 2-policy; global: service-write/public-read | ✅ |
| 10 | 5 views | 5 | ✅ |
| 11 | 5 RPCs + 2 trigger fns | 7 functions | ✅ |
| 12 | 2 event triggers attached | both attached | ✅ |
| 13-15 | Seeds | methods 12 + capabilities 12 + adapters 3 + channels 2 | ✅ |
| 16 | M8 smoke 8/8 | 8/8 | ✅ |
| 17 | Cross-contract 6/6 | 6/6 | ✅ |
| 19 | Destructive Ops "None." | verified | ✅ |
| 21 | Advisors clean | 0 new HIGH/ERROR | ✅ |
| 22 | No Prizma row writes | 0 prizma payments/events | ✅ |
| 23 | MIGRATION.md | 11 entries | ✅ |

## 3. Deviations

| Item | Severity | Resolution |
|---|---|---|
| payment_methods existed (M1 era stub, 4 demo rows) | Extended additively per D1 | Documented in §0; 4 existing rows preserved |
| payment_events_queue table NAME — Brief implied 'events' but used 'queue' suffix to mirror M1's `pending_lens_advancement_queue` | Naming choice | Documented in MODULE_MAP; aligns with project K3 pattern |

## 4. Outputs

- 11 MCP migrations
- 7 SPEC folder files
- Module-level docs queued

## 5. Hand-off

M8 schema 🟢. Both halves of the overnight chain closed.

Downstream unblocked:
- M9 (Lab) — FK to `sub_orders.id` ready (M9 SPEC builds next).
- M11 (Reports) — v_payments_for_reports + v_order_payment_summary + v_salary_deduction_pending available.
- M7 listener for first_payment event — Phase E (UI checkout) wires.
- M4 listener for check_returned event — wires when needed.

Out of scope (separate SPECs):
- IPaymentProvider class + LinetAdapter/GamaAdapter/ZCreditAdapter integration code (Phase C).
- credentials_jsonb encryption layer (Phase C).
- All 4 M8 UIs (Phases D, E, F, G).
- OpticPlus migration (Phase H).
