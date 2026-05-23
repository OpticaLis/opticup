# Module 8 — Payments — Module Map

## Tables (M8-owned, sealed 2026-05-23)

| Table | Scope | RLS | Pattern |
|---|---|---|---|
| `payment_methods` | per-tenant | canonical 2-policy | EXTENDED (M1-era stub → full M8 spec). 4 demo + 6 new cols added |
| `payments` | per-tenant | canonical 2-policy | central record; FK order_id→M7, customer_id→M5, payment_method_id→methods, payment_channel_id→channels |
| `payment_channels` | per-tenant | canonical 2-policy | adapter+credentials config per-tenant |
| `payment_capabilities` | **global** | service-write/public-read | pool of capability slugs |
| `payment_adapters` | **global** | service-write/public-read | manifest (skeleton) — describes future integrations |
| `payment_events_queue` | per-tenant | canonical 2-policy | Pattern P22 durable event queue |

## Enums (4)

`payment_status` (10-state), `check_bounce_reason`, `payment_channel_status`, `payment_event_kind`.

## Functions (5 RPCs + 2 trigger fns)

| Name | Signature | Purpose |
|---|---|---|
| `record_payment` | `(tenant, order_id, payload jsonb) → jsonb` | Atomic; allocate_tenant_number('payment'); status determined by method.requires_pos + check_due_date + external_receipt |
| `mark_check_deposited` | `(tenant, payment_id)` | State deferred→in_bank, sets check_deposit_date |
| `mark_check_cleared` | `(tenant, payment_id, external_receipt_number)` | State in_bank→cleared |
| `mark_check_returned` | `(tenant, payment_id, bounce_reason)` | State in_bank→returned + fires check_returned event |
| `mark_salary_deduction_processed` | `(tenant, payment_id)` | State salary_deduction_pending→deducted |
| `emit_first_payment_event_fn` | trigger fn | AFTER INSERT ON payments → emits first_payment when count=1 for order |
| `emit_check_returned_event_fn` | trigger fn | AFTER UPDATE OF status ON payments → emits check_returned on in_bank→returned |

All SECURITY DEFINER + Block A + REVOKE anon + GRANT auth/service_role.

## Triggers (2 attached)

- `trg_emit_first_payment_event` — AFTER INSERT ON payments
- `trg_emit_check_returned_event` — AFTER UPDATE OF status ON payments

## Views (5, security_invoker=on)

| View | Consumer |
|---|---|
| `v_order_payment_summary` | M7 editor (Phase E checkout) |
| `v_customer_payments_history` | M5 customer card |
| `v_payments_for_reports` | M11 future (daily/monthly slices) |
| `v_salary_deduction_pending` | M11 future + admin pipeline |
| `v_returned_checks_pending` | admin pipeline UI |

## Re-used existing infra

- M5 `allocate_tenant_number(p_tenant_id, 'payment')` — atomic per-tenant payment_number
- M5 `tenant_number_counters` — shared counter table

## T-constants added to js/shared.js

```js
PAYMENTS, PAYMENT_METHODS (existing, reaffirmed), PAYMENT_CHANNELS,
PAYMENT_CAPABILITIES, PAYMENT_ADAPTERS, PAYMENT_EVENTS_QUEUE
```

## Cross-module contract entry points

| Surface | Direction |
|---|---|
| `orders.id` PK | M8 ← M7 (FK in payments) |
| `customers.id` PK | M8 ← M5 (FK in payments) |
| `v_order_payment_summary(order_id)` | M7 ← M8 |
| `v_customer_payments_history` | M5 customer card ← M8 |
| `v_payments_for_reports` | M11 future ← M8 |
| `payment_events_queue` 'first_payment' | M7 listener ← M8 emits |
| `payment_events_queue` 'check_returned' | M4 listener ← M8 emits |
| `mark_salary_deduction_processed(...)` | M11 future → M8 RPC (mutation contract) |
