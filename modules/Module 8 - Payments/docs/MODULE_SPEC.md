# Module 8 — Payments — Module Spec

## Purpose

ERP-side payment orchestration. NOT a POS — external POS (Linet, Gama Pay, etc.) issues the legal receipts; M8 records, links, closes. Three-layer Provider Adapter pattern: code → manifest → tenant config.

## Architecture decisions (sealed M8_PAYMENTS_BRIEF.md §8)

1. **M8 = ERP, not POS.** External POS issues legal receipts per Israeli VAT law.
2. **6 active payment methods for Prizma:** cash, credit_card, transfer, check, bit, salary_deduction.
3. **Provider Adapter Pattern (3 layers):** Adapter (code) → Manifest (DB) → Tenant Config (DB+UI).
4. **payment_methods + channels + capabilities = config tables per-tenant or global** (P19). State-machines = enums.
5. **M8 NEVER calls M7 directly.** Emits events to payment_events_queue; M7/M4 listen.
6. **Salary deduction = M8 status** ('salary_deduction_pending'); M11 has mutation contract to mark 'deducted'.
7. **Check-deferred = legal exception** to "every payment passes through POS" — recorded without POS at sale; passes POS at due date.
8. **Manual receipt-number entry at day-1.** Future API-returned receipts → field becomes readonly with source.

## State machines

### payment_status (10 states)
```
pending_pos ──→ paid (immediate non-check methods after POS receipt)
deferred (check before due) ──→ in_bank (deposited) ──→ cleared (bank confirmation + receipt)
                                                    └──→ returned (bounce, event emitted to M7+M4)
salary_deduction_pending (immediate on salary_deduction method) ──→ deducted (after accountant marks via M11)
refunded / cancelled (deferred RPCs, future SPEC)
```

### payment_channel_status
```
unconnected ──→ active (after credentials valid + health check)
                  ↓
              errored (ping fails)
                  ↓
              disabled (manual)
```

## Cross-module contracts

- **M7 orders** — `payments.order_id` FK. M7 reads `v_order_payment_summary(order_id)`. M7 listener (deferred) drains payment_events_queue 'first_payment' → orders.status quote→active + thanks message.
- **M5 customers** — `payments.customer_id` FK. M5 customer card reads `v_customer_payments_history`. `invoice_recipient_name` (alt-name on invoice) recorded.
- **M11 reports** — reads `v_payments_for_reports` (unified across statuses, per-day/optometrist/channel/health-fund slices) + `v_salary_deduction_pending`. M11 has a mutation contract: calling `mark_salary_deduction_processed` is the only sanctioned cross-module RPC call into M8 beyond read.
- **M4 CRM** — listener (deferred) drains 'check_returned' events → opens task "call customer about bounced check".
- **M12 communications** — first_payment event triggers "thank you" message (via M7 → M12 path, not directly).
- **M2 platform-admin** — `payment_channels.permission_role_ids` jsonb references M2 roles (read-only).
- **Finance Hub (future post-launch module)** — reads check Pipeline + future cash-flow.

## Adapter manifest pattern (Brief §5.1)

Three layers:
1. **Adapter code** (NOT in this SPEC): `LinetAdapter`, `GamaAdapter`, `ZCreditAdapter`, `MockAdapter` — IPaymentProvider interface (chargeOrder/refund/getStatus/listTransactions/voidTransaction/tokenizeCard/registerWebhook). Phase C.
2. **Adapter Manifest** (`payment_adapters` table — built this SPEC): manifest rows declare capabilities, credentials_schema, settlement_modes. 3 seed rows: mock (active), gama_pay (inactive, requires_nda), z_credit (inactive, requires_nda).
3. **Tenant Config** (`payment_channels` table — built this SPEC): per-tenant rows reference an adapter + supply credentials + enable subset of capabilities. 2 seed rows (Mock for demo + Mock for prizma).

UI builds dynamically from manifest schema. Adding a new adapter = adapter code + new manifest row. Zero changes to UI/core.

## Out of scope (deferred)

- Real Linet/Gama/Z Credit adapter integration code, IPaymentProvider class — Phase C.
- credentials_jsonb encryption layer — Phase C.
- All 4 M8 UIs (Provider Config, Checkout, Daily-close, Checks Pipeline) — Phases D–G.
- M7 listener implementation (first_payment → orders.status advance).
- M4 listener implementation (check_returned → task).
- OpticPlus migration (1,160 credit-installments + 9,828 receipts) — Phase H.
- Refund/reverse RPCs.
- Sandbox testing infrastructure for live adapters.
