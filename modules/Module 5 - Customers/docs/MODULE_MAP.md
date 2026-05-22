# Module 5 — Customers — Module Map

## Tables (M5-owned)

| Table | RLS | Pattern | Owner of relationship |
|---|---|---|---|
| `customers` | canonical 2-policy | extended from legacy 16-col stub; FK from prescriptions, work_orders, customer_notes, customer_documents, households.primary_customer_id | M5 |
| `households` | canonical 2-policy | skeleton; primary_customer_id FK to customers (back-ref) | M5 |
| `health_funds` | canonical 2-policy | config table per-tenant (P19) | M5 |
| `tenant_languages` | canonical 2-policy | config table per-tenant (P19); ISO codes; unique-default-per-tenant | M5 |
| `customer_notes` | canonical 2-policy | notes (business / medical_q / diagnostics) | M5 |
| `customer_documents` | canonical 2-policy | Storage-backed file metadata | M5 |
| `tenant_settings` | canonical 2-policy | customer_list_preferences jsonb config | M5 |
| `tenant_number_counters` | canonical 2-policy | per-tenant per-entity_kind atomic sequence storage | M5 (shared infra; M6+ also write `entity_kind='prescription'` rows) |

## Tables M5 extends (additive ALTER)

| Table | Owner | M5 additions |
|---|---|---|
| `tenants` | platform | + `tenant_code text NOT NULL UNIQUE` |
| `tenant_location` | M1 (platform-admin) | + `deactivated_at timestamptz NULL` |
| `customers` | M5 (extended legacy) | rename `branch_id`→`home_branch_id`; + 26 new columns (first_name, last_name, customer_number, lifecycle_stage, household_id, health_fund_id, language_code, gender, profession, dominant_eye, 4 consent booleans, source, utm_*×6, first_interaction_at, consent_form_signed_at, is_deleted, deleted_at, updated_by) |

## Enums (M5)

- `customer_lifecycle_stage` (prospect, active, dormant)
- `household_status` (active, inactive)
- `customer_note_type` (business, medical_q, diagnostics)
- `customer_document_category` (doctor_prescription, external_exam, health_fund, other)

## Functions (M5)

### Customer-facing RPCs (5)

| Name | Signature | Purpose |
|---|---|---|
| `create_customer` | `(p_tenant_id uuid, p_payload jsonb) → jsonb` | Atomic create. Dedup on id_number → phone. Allocates customer_number. |
| `merge_customers` | `(p_tenant_id uuid, p_primary_id uuid, p_secondary_id uuid) → uuid` | Reassigns child FKs (notes, documents, prescriptions, work_orders, households.primary). Soft-deletes secondary. |
| `assign_to_household` | `(p_tenant_id uuid, p_customer_id uuid, p_household_id uuid) → void` | Cross-tenant guards on both ends. Sets customers.household_id. |
| `delete_last_unused_customer` | `(p_tenant_id uuid, p_customer_id uuid) → boolean` | Iron Rule 32. FOR UPDATE on counter. Hard-delete + counter decrement only if max + zero FKs. |
| `update_customer_display_preferences` | `(p_tenant_id uuid, p_prefs jsonb) → void` | Upsert tenant_settings.customer_list_preferences. |

### Helper RPC (1) — Shared infrastructure

| Name | Signature | Purpose |
|---|---|---|
| `allocate_tenant_number` | `(p_tenant_id uuid, p_entity_kind text) → bigint` | Atomic per-tenant per-entity-kind sequence. INSERT ... ON CONFLICT DO UPDATE ... RETURNING. Used by M5 (entity_kind='customer'), M6 (entity_kind='prescription'), future modules. |

### Deferred trigger functions (2)

| Name | Signature | Status |
|---|---|---|
| `compute_lifecycle_stage_on_order` | `() → trigger` | Body built; NOT attached to any table. M7 SPEC wires as AFTER INSERT trigger on the future orders table. |
| `compute_lifecycle_dormant_sweep` | `() → integer` | Stub (returns 0); not scheduled. M7 SPEC will add the body once orders.created_at exists. |

## Views (M5 — 7 deployed)

| View | Consumer |
|---|---|
| `v_customer_for_exam` | M6 (eye_exams + prescription editor — customer header) |
| `v_customer_for_order` | M7 future |
| `v_customer_for_payment` | M8 future |
| `v_customer_full` | M11 future (LTV reports) |
| `v_customer_for_messaging` | M12 future (NOT exposes notes) |
| `v_customer_for_loyalty` | M13 future |
| `v_customer_for_appointment` | M14 future |

All views use `security_invoker = on`. Tenant isolation enforced by underlying-table RLS.

## Views deferred

- `v_customer_prescriptions_summary` — M6 owns (built in M6_SCHEMA). M5 customer card tab-3 reads it.
- `v_customer_queue_position` — M14 doesn't exist yet. Deferred indefinitely.

## T-constants added to js/shared.js

```js
CUSTOMERS, HOUSEHOLDS, HEALTH_FUNDS, TENANT_LANGUAGES,
CUSTOMER_NOTES, CUSTOMER_DOCUMENTS, TENANT_SETTINGS, TENANT_NUMBER_COUNTERS
```

## Cross-module contract entry points

| Surface | Type | Direction |
|---|---|---|
| `customers.id` PK | FK target | M5 ← M6/M7/M8/M11/M12/M13/M14 |
| `customers.customer_number` | display + audit | M5 → all UI |
| `allocate_tenant_number(p_tenant_id, entity_kind)` | RPC | M5 ← M6 ← M7-future |
| 7 customer views | read-only | M5 → M6/M7/M8/M11/M12/M13/M14 |
| `v_customer_prescriptions_summary` | read-only | M5 customer card ← M6 |
| `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)` | RPC | M5 customer card → M6 |
