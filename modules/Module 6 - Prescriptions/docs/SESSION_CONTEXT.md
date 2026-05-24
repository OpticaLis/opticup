# Module 6 — Prescriptions / Eye Exams — Session Context

**Last updated:** 2026-05-24 night run.
**Status:** 🟢 Phase A+B+C+E+F CLOSED (Schema + RPCs + Views + Recall Engine + Editor UI + M5 Card Wiring).

## Current state

- **Schema:** 8 new tables (eye_exams, prescriptions_glasses + child eyes, prescriptions_contacts + child eyes, prescription_types, lens_manufacturers, prescription_recall_axes). All RLS canonical 2-policy.
- **Enums:** 19 new (state-machines + Pattern 11 discriminators + medical property sets).
- **Views:** 9 deployed including the cross-contract `v_customer_prescriptions_summary` (M6 owns, M5 customer card consumes).
- **RPCs:** 7 deployed (create_exam, create_prescription_draft [M5↔M6 entry], commit_prescription, cancel_draft_prescription, supersede_prescription, compute_recall_due_dates, clone_prescription). All Block A SECURITY DEFINER + REVOKE anon / GRANT authenticated+service_role.
- **Smoke:** 9/9 PASS M6 functional + 5/5 PASS cross-contract M5↔M6 bridge.
- **No Prizma row writes** on M6 tables ✅.

## Cross-contract surfaces

| Surface | Type | Owner | Consumer(s) |
|---|---|---|---|
| `v_customer_prescriptions_summary` | View | M6 | M5 customer card tab-3 |
| `v_prescriptions_list_for_customer` | View | M6 | M6 prescription editor sidebar |
| `v_prescription_full_for_editor` | View | M6 | M6 prescription editor center |
| `v_prescription_glasses_for_order` | View | M6 | M7 future |
| `v_prescription_contacts_for_order` | View | M6 | M7 future |
| `v_recall_due` | View (window-fn 1-per-prescription) | M6 (fact) | M12 future (will own recall_rules — rule) |
| `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)` | RPC | M6 | M5 customer card "+ מרשם חדש" button |
| `clone_prescription(p_tenant_id, p_source_id, p_kind)` | RPC | M6 | M6 editor "שכפל מרשם" + future |
| `eye_exams.customer_id` FK | FK | M6 | references M5.customers.id |
| `prescriptions_glasses/_contacts.customer_id` FK | FK | M6 | references M5.customers.id |
| `prescription_number` allocation | counter share | M6 (write) | M5's `allocate_tenant_number(_, 'prescription')` |

## Where the work lives

- `MODULE_6_ROADMAP.md` — phase plan
- `docs/specs/M6_SCHEMA/` — sealed Phase A+B SPEC + retro files
- `docs/MODULE_SPEC.md` — business logic + state-machines
- `docs/MODULE_MAP.md` — code map
- `docs/db-schema.sql` — DDL snapshot
- `docs/CHANGELOG.md` — phase history

## What's next

1. **M6_MIGRATION SPEC** — import 6,248 OpticPlus exams + 251 contact-lens prescriptions. Depends on M5_MIGRATION.
2. **Visual-Fidelity Gate closure** — Chrome MCP screenshots + region comparison table for Phase E + F (pending localhost verification).
3. **Phase G+** — Print/send actions, order creation from prescription (M7 dependency).
