# TEST_DATA_INVENTORY — P26_ACTIVITY_LOG_FIX_AND_E2E_MESSAGING

> All rows created/modified during the P26 run. Per SPEC §2.5, executor does NOT clean up — Daniel
> uses this inventory to clear test artifacts.

---

## Demo tenant — modified rows (Phase 1 smoke)

Per SPEC §2.5 these rows were touched during demo verification of the activity-log fix.
Restoration is OPTIONAL (per Daniel's overnight directive: "Test data inventoried in
TEST_DATA_INVENTORY.md; Daniel cleans up after morning review").

| id | full_name | pre-state | post-state | restore SQL |
|---|---|---|---|---|
| `69eedb90-28a3-42d1-a074-e77134a03e76` | P55 דנה כהן | `status=registered, payment_status=paid` | `status=cancelled, payment_status=refund_requested` (Phase 1 §1) | `UPDATE crm_event_attendees SET status='registered', payment_status='paid', cancelled_at=NULL, refund_requested_at=NULL WHERE id='69eedb90-28a3-42d1-a074-e77134a03e76' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;` |
| `17374a5c-3966-4525-9c47-444f70744355` | P55 דנה כהן | `status=cancelled, payment_status=refund_requested` (P25 leftover) | `payment_status=refunded` (Phase 1 §3) | `UPDATE crm_event_attendees SET status='registered', payment_status='pending_payment', refund_requested_at=NULL, cancelled_at=NULL, refunded_at=NULL WHERE id='17374a5c-3966-4525-9c47-444f70744355' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;` |
| `4b2efb6a-750b-43be-ba6f-b27ddcf5aa2a` | P55 דנה כהן | `status=registered, payment_status=pending_payment` | `status=registered, payment_status=paid, paid_at=now()` (Phase 1 §4) | `UPDATE crm_event_attendees SET payment_status='pending_payment', paid_at=NULL WHERE id='4b2efb6a-750b-43be-ba6f-b27ddcf5aa2a' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;` |

## Prizma tenant — newly-created rows (Phase 2)

| id | lead_id | event_id | created_via | notes |
|---|---|---|---|---|
| `b9c8faa7-a698-452a-bf44-eab94f71b224` | `46d51368-ddd8-4337-92e2-1019f3269a61` (Flow 5 Cap Filler, +972503348349, daniel email) | `80597afe-2589-4417-9f46-a5fd2eb4b791` (V4 Edge concurrent A) | `register_lead_to_event` RPC via Supabase MCP | Phase 2 scenario 6. Status=registered, payment_status=pending_payment. Per the same scenario, no message dispatched (automation not fired — Finding 1). To remove: `UPDATE crm_event_attendees SET is_deleted=true WHERE id='b9c8faa7-a698-452a-bf44-eab94f71b224' AND tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid;` |

## Prizma tenant — modified rows

**No Prizma rows modified by P26.** All Prizma activity was the single new-attendee creation above.

## Activity log — entries written by P26

P26 produced these activity_log entries during Phase 1 (all on demo) — all with the new field-name fix applied:

| created_at | action | entity_type | details | tenant |
|---|---|---|---|---|
| 2026-04-30 ~01:49 | crm.attendee.cancel | crm_event_attendees | `{path: paid_refund_due, from_status: registered, payment_status: paid}` | demo |
| 2026-04-30 ~01:51 | crm.attendee.payment_refunded | crm_event_attendees | `{}` (caller passes empty intentionally) | demo |
| 2026-04-30 ~01:51 | crm.attendee.payment_marked_paid | crm_event_attendees | `{send_confirmation: false}` | demo |

These entries are evidence the fix works. They can stay (no harm) or be cleaned up in the same demo data restore pass.

## Pre-existing rows observed (NOT modified by P26; recorded for context)

These rows were observed during pre-flight or Phase 2 setup. **NOT modified by P26.**

| id | tenant | observation |
|---|---|---|
| `a262bc0e-26aa-4a2d-a401-16e4998f382e` | Prizma | T5 Canary Post-Shorten lead — already registered to every Prizma open event, blocking scenario-5 fresh-lead test |
| `46d51368-ddd8-4337-92e2-1019f3269a61` | Prizma | Flow 5 Cap Filler lead — used as scenario 6 actor (lead_id) |
| `8f0633bb-311e-4f47-8c43-14d4054634a4` | Prizma | QA Filler (T6 cap) lead — same secondary phone as 46d51368, no email; not used in P26 |
