# Module 5 — Customers — Module Spec

## Purpose

The person-entity module. Owns the single canonical `customers` table for every individual the tenant interacts with, regardless of lifecycle stage. M5 also owns the supporting entities: households (family pooling skeleton), health_funds (config per-tenant), tenant_languages (config per-tenant), customer_notes (business + medical), customer_documents (Storage-backed).

Every downstream module FKs to `customers.id`:
- M6 (Prescriptions / Exams)
- M7 (Orders — future)
- M8 (Payments — future)
- M11 (Reports — future)
- M12 (Communications — future; recall rules)
- M13 (Loyalty — future)
- M14 (Appointments / Queue — future)

## State machine — `lifecycle_stage` enum

```
                  ┌─────────┐
                  │ prospect│  ← default on create_customer
                  └────┬────┘
                       │
                  first M7 order ─→ AFTER INSERT trigger on M7 orders
                       │             (function created, NOT yet wired to a table)
                       ▼
                   ┌────────┐
                   │ active │
                   └───┬────┘
                       │
                  24m inactive
                       │      (function created, NOT yet scheduled via pg_cron)
                       ▼
                  ┌────────┐
                  │ dormant│
                  └────────┘
```

**Authoritative source of truth** for stage transitions is the business-state column (`crm_leads.unsubscribed_at`-style pattern). NOT click events. Per memory `feedback_clicks_are_not_actions.md`.

## Customer Number — Composite Display

```
[TENANT_CODE][BRANCH_CODE][CUSTOMER_NUMBER]
e.g. tenant_code='02' (demo) + branch_code='STA' (M1A smoke branch) + customer_number=1 (zero-padded to 5) → '02-STA-00001'
```

DB storage:
- `tenants.tenant_code text NOT NULL UNIQUE` (added by M5_SCHEMA; prizma='01', demo='02').
- `tenant_location.short_code text` (pre-existing, M5 uses as branch_code).
- `customers.customer_number integer` (allocated atomically via `allocate_tenant_number(p_tenant_id, 'customer')`).
- UNIQUE (customer_number, tenant_id) WHERE customer_number IS NOT NULL.

Display assembly happens in views (e.g., `v_customer_for_exam.customer_number_display`) and frontend.

## Iron Rule 32 — Sequential Number Cancellation

The `delete_last_unused_customer(p_tenant_id, p_customer_id)` RPC enforces:
1. customer.customer_number must equal MAX(customer_number) for the tenant.
2. Zero incoming FK references (customer_notes, customer_documents, prescriptions, work_orders, households as primary).
3. If both conditions met → hard-delete + counter decrement (atomic via FOR UPDATE on counter row).

Otherwise returns FALSE; caller must use soft-delete via `merge_customers` or accept the customer stays.

## Marketing Consent — 4 Independent Flags

Per Brief §5.2 v2:
- `customer_marketing_consent` (promos/coupons FROM Prizma TO customer)
- `customer_operational_consent` (exam reminders, glasses-ready) — default `true` for migrated existing customers
- `crm_marketing_consent` (CRM campaign sends)
- `crm_operational_consent` (event registration receipts)

All four are independent booleans. M12 (Communications) checks the specific flag based on message-type + source-module.

Re-subscription is ACTIVE only — a customer cannot become re-subscribed automatically by becoming `lifecycle_stage='active'`.

## Dedup Algorithm (in `create_customer` RPC)

Per Brief §4.7:
1. If id_number already exists for tenant + is_deleted=false → return existing.
2. Else if phone already exists for tenant + is_deleted=false → return existing.
3. Else INSERT new customer + allocate customer_number atomically.

UI handles the (name + birth_date) "soft suggestion" path; the RPC does NOT.

## Out of Scope — Deferred to Future SPECs

- Customer card UI (5 tabs) — Phase D.
- Customer list + create-mode UI — Phase E.
- OpticPlus migration (5,028 customers + 1,158 crm_leads rollover) — Phase C.
- `health_fund_agreements` (tier/coverage pricing) — deferred (Brief §6 #1).
- `households` expanded business fields (billing, address) — deferred (Brief §6 #2).
- multi-coverage (one customer with 2 health funds) — deferred (Brief §6 #3).
- `customer_relationships` (explicit kinship) — deferred (Brief §6 #4).
- Per-channel consent (WhatsApp / SMS / Email / Push) — deferred (Brief §6 #5).
- GDPR-anonymize RPC — deferred (Brief §6 #6).
- Per-user display preferences (today's `tenant_settings.customer_list_preferences` is tenant-level only) — deferred (Brief §6 #10).
- Customer-list saved views — deferred (Brief §6 #11).
- Auto-message on birthday — deferred (M-future).
