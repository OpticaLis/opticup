# M8_SCHEMA — Findings

## F-M8-1 — `payment_methods` was a pre-existing M1-era stub

Probed at chain start: 4 demo rows (cash/check/transfer/credit_card) + canonical RLS already present + UNIQUE (tenant_id, code) already in place. EXTEND strategy (per Brief §0 D1) added 6+ new fields without DROP. All 4 existing rows backfilled correctly (verified M-S6).

**Decision:** dismiss; ratified strategy.

## F-M8-2 — Adapter manifest is config-only, by design

Brief §10 / §8 #4 / Overnight Brief §3 all explicitly state: no integration code in this SPEC. We seeded 3 rows (Mock + Gama + Z Credit) with capability flags + credentials_schema_jsonb + supported_settlement_modes_array, but ZERO `IPaymentProvider` class, ZERO charge/refund/webhook code. Adapter integration goes through Phase C (Daniel-in-loop + NDA).

**Decision:** dismiss; intentional. Phase C SPEC will build the integration.

## F-M8-3 — Event-emission via queue table (not pg_notify)

M1's K3 pattern uses `pending_lens_advancement_queue` (table-based queue) rather than Postgres LISTEN/NOTIFY. M8 mirrors this: `payment_events_queue` row inserted by trigger; consumers (M7, M4) drain by SELECT WHERE consumed_at IS NULL. Trade-off: durable across restarts; needs polling worker. pg_notify would be lower-latency but lossy. Project convention = durable queue.

**Decision:** dismiss; intentional, matches existing M1 K3.

## F-M8-4 — Listener attach deferred

`payment_events_queue` is emitted by M8 but neither M7 nor M4 has a listener attached yet. M7's first_payment listener would advance `orders.status` quote→active (currently the M7 status aggregation trigger already does this via sub-order state). M4's check_returned listener would open a call-customer task. Both wirings deferred to UI-phase SPECs.

**Decision:** dismiss; deferred per Brief.

## F-M8-5 — `credentials_jsonb` unencrypted at Phase A

`payment_channels.credentials_jsonb` stores adapter credentials as plain jsonb. Encryption layer (per Brief §10) is Phase C — needs decision on encryption-at-rest strategy + key management.

**Decision:** dismiss; deferred per Brief.

## F-M8-6 — Status enum overload — `paid` vs `cleared`

The payment_status enum has both `paid` (immediate non-check transactions) and `cleared` (check after deposit + bank confirmation). Same semantic intent — payment is final. `v_order_payment_summary` treats them together (`status IN ('paid','cleared','deducted')` for total_paid). Could be merged into single 'paid' status with a `payment_track` discriminator; current design keeps them separate for audit clarity.

**Decision:** dismiss; current design preserves the deposit→bank→cleared narrative for checks.

## F-M8-7 — `v_order_payment_summary` aggregation includes 'deducted'

`total_paid` includes payments with status='deducted' (salary deduction processed by accountant). This matches expected behavior — once payroll deducts, the money is in. Verified in M11 future contract.

**Decision:** dismiss; intentional.

## F-M8-8 — Mock channel auto-seeded for prizma

Channel seed inserted Mock channel for prizma tenant as well as demo. This is DDL-applied-to-both-tenants config (Brief §3), not row writes on payments/payment_events_queue. Distinction maintained: 0 payment rows on prizma.

**Decision:** dismiss; config seed != row write per Brief.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-M8-1 | None | Intentional extend |
| F-M8-2 | None | Brief explicit |
| F-M8-3 | None | Project convention |
| F-M8-4 | None | Deferred per Brief |
| F-M8-5 | None | Deferred per Brief |
| F-M8-6 | None | Design choice |
| F-M8-7 | None | Intentional |
| F-M8-8 | None | Config seed allowed |

No reopener-class issues. Verdict candidate: 🟢 CLOSED.
