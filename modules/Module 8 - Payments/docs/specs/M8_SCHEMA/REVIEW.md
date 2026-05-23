# M8_SCHEMA — Reviewer Pass

> **Role:** opticup-reviewer. 2026-05-23.

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | ✅ record_payment single-tx incl. allocate_tenant_number + INSERT |
| 11 sequential | ✅ Re-uses allocate_tenant_number(_, 'payment') |
| 13 Views | ✅ 5 views for M7/M5/M11/admin |
| 14 tenant_id | ✅ payments, payment_methods, payment_channels, payment_events_queue all have tenant_id NOT NULL. Global (capabilities, adapters) are intentionally tenant-less |
| 15 canonical RLS | ✅ Tenant tables: 2-policy. Global tables: service-write + public-read pattern (justified — capabilities/adapters are platform-level reference) |
| 16 contracts via events | ✅ M8 NEVER calls M7 directly. payment_events_queue is the contract surface. Cross-contract X-S5 verified event row created |
| 17 Views for external | ✅ v_order_payment_summary (M7), v_customer_payments_history (M5), v_payments_for_reports (M11) |
| 18 UNIQUE tenant-scoped | ✅ (payment_number, tenant_id); payment_methods already had (tenant_id, code); payment_channels (tenant_id, display_name) |
| 19 enum vs config | ✅ payment_status state-machine = enum; methods/channels/capabilities/adapters = config tables. Brief intent honored |
| 22 defense-in-depth | ✅ All 5 RPCs verify tenant_id |
| 32 Destructive Ops "None." | ✅ payment_methods extended additively; verified |

## Security audit

- Block A verbatim on 5 user RPCs + 2 trigger fns.
- REVOKE anon/PUBLIC + GRANT auth+service on user RPCs; trigger fns granted only to service_role.
- Cross-tenant guard verified M-S7 (42501).
- Anon-reject verified M-S8 (5/5).
- credentials_jsonb left unencrypted at Phase A — deferred to Phase C per F-M8-5. Acceptable for schema-only milestone.

## Adapter manifest skeleton verification

- 3 adapter rows seeded (mock active, gama_pay + z_credit inactive with requires_nda=true).
- ZERO integration code: grep'd repo — no IPaymentProvider class, no LinetAdapter/GamaAdapter/ZCreditAdapter file, no Edge Function in supabase/functions for payment-provider integration. ✅
- payment_capabilities pool global with 12 rows.
- Mock channel auto-seeded for both tenants — operational from day-1 for QA.

## Event mechanism verification

- M-S5: mark_check_returned successfully emitted 1 row in payment_events_queue with kind='check_returned'.
- X-S5: first_payment event emitted on first payment per order_id (count check excluded the new row itself).
- consumed_at/consumed_by columns ready for listener implementations.

## Smoke

- M8 8/8 PASS.
- Cross-contract M5→M7→M8 6/6 PASS.
- 0 NEW HIGH/ERROR advisor lints.
- 0 Prizma row writes on payments/payment_events_queue.

## Verdict

**🟢 PASS.** No reopener-class issues. Recommend closing M8_SCHEMA 🟢 in FOREMAN_REVIEW.
