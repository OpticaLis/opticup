# M5_M8_CROSS_CONTRACT_FIXES — Findings

## F-T1-1 — Track 1 RPC body change requires Block A header preservation

All 4 modified RPCs/trigger fns preserve the canonical Block A header from `JWT_VALIDATION_HEADER.sql` verbatim. No drift; no NULL-comparison loopholes introduced.

**Decision:** dismiss; intentional discipline. Future SPECs that modify RPC bodies must continue this pattern.

## F-T1-2 — F-A-2 invariant deferred to documentation-only

Strategic Review flagged F-A-2 as "order quote→active not advanced by first payment alone." Track 1 fix wires lifecycle trigger on payments (F-A-1) which advances **customers** but NOT orders. The order side is correctly handled by `recompute_order_status_fn` (Pattern P21) which fires only on sub_order state changes. The Brief said "pick one mechanism"; the pick is documented invariant: orders.status advances only via sub_order children, never on first payment. Documentation pending in M7 db-schema.sql at chain close.

**Decision:** documentation step queued for chain-close phase.

## F-T1-3 — payment_events_queue partial uniques are not tenant-scoped

The 2 partial uniques use `(order_id) WHERE event_kind='first_payment'` and `(payment_id) WHERE event_kind='check_returned'` — neither includes tenant_id. Technically violates Iron Rule 18 phrasing. Justified because order_id and payment_id are themselves tenant-implicit through their FKs (orders.tenant_id NOT NULL + payments.tenant_id NOT NULL + FK from queue → both). Cross-tenant duplicate insert is structurally impossible because the order_id/payment_id only exists in one tenant's row.

**Decision:** dismiss; intentional design justified by FK chain tenant-implicit semantics.

## F-T1-4 — rx_snapshot_jsonb stores all eye children even if NULL

When add_sub_order links a prescription with only R-eye populated (no L), `jsonb_object_agg` with `FILTER (WHERE pge.id IS NOT NULL)` produces `{}` if no eyes exist. Acceptable today; future M6 SPEC may want stricter validation that both R+L exist before allowing M7 to link.

**Decision:** dismiss; M6 owns the rule for what constitutes a complete prescription.

## F-T1-5 — `mark_check_returned` now raises 40001 on concurrent state change

Previously: 22023 only. Now: 40001 (serialization_failure) if row_count=0 (concurrent caller won the race). UI should treat 40001 the same as 22023 (the underlying meaning is "already returned").

**Decision:** dismiss; matches Postgres convention. Document for future UI SPEC.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-T1-1 | None | Discipline |
| F-T1-2 | Doc-only | Queue for chain close (M7 db-schema.sql header) |
| F-T1-3 | None | Intentional |
| F-T1-4 | None | M6 owns rule |
| F-T1-5 | None | Postgres convention |

No reopener-class. Verdict candidate: 🟢 CLOSED.
