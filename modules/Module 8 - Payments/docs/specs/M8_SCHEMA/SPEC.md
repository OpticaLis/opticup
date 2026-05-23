# SPEC — M8_SCHEMA — Payments + Adapter Manifest Skeleton (Phase A + B)

> **Location:** `modules/Module 8 - Payments/docs/specs/M8_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic
> **Authored on:** 2026-05-23 (overnight chain Half 2 of 2)
> **Predecessor closed 🟢:** M7_SCHEMA 2026-05-23 (smoke 9/9).
> **Companion (Half 1):** M7_SCHEMA — orders + sub-orders + items.

---

## 0. Pre-Authoring Reality Check

### Probe results (re-confirmed 2026-05-23 after M7 close)

| Probe | Finding | Action |
|---|---|---|
| 1. M8 tables exist? | `payments` NULL, `payment_channels` NULL, `payment_capabilities` NULL, `payment_adapters` NULL, `payment_events_queue` NULL | CREATE all 5 |
| 1b. `payment_methods` exists? | **EXISTS** — 8 cols (id, tenant_id, code, name_he, name_en, is_system, is_active, created_at), 4 demo rows (cash/check/transfer/credit_card), 0 prizma, canonical 2-policy RLS already present, no incoming FKs | **EXTEND additively** — same strategy as last chain's customers |
| 2. M7 orders + customers? | both present, M5+M6 stable | M8 FKs work |
| 3. allocate_tenant_number? | Exists, signature `(uuid, text) → bigint` | Use entity_kind='payment' |
| 4. M1 K3 trigger pattern | AFTER UPDATE OF status triggers exist (trg_event_status_change_event, trg_lead_status_change_event) — clean AFTER UPDATE pattern | Mirror for M8 events |
| 5. Demo fixtures | 10 customers + 5 prescriptions_glasses + 4 orders from M7 smoke (numbers 1-4) | Use for cross-contract |

### Strategic decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | EXTEND existing `payment_methods` via ALTER TABLE ADD COLUMN — preserve 4 demo rows | 4 rows = active data; no DROP. Iron Rule 32 = None. |
| D2 | ADD columns to `payment_methods`: requires_pos, requires_external_receipt, icon, display_order, tenant_default, name_ru, sort_order — per Brief §2.2 | Brief intent honored |
| D3 | `payment_events_queue` new table (NOT payment_events) — mirror M1 K3 `pending_lens_advancement_queue` pattern | Listeners drain queue; M8 only emits |
| D4 | Adapter manifest skeleton: seed Mock + Gama + Z Credit rows in `payment_adapters` with capability flags. **ZERO integration code.** | Brief §8 #4 explicit |
| D5 | `payment_capabilities` global pool (NOT tenant-scoped) — seed 12 rows (credit, cash, check, installments, bit, apple_pay, google_pay, qr, tokenization, webhook, partial_capture, void) | Brief §2.4. Global = NO tenant_id; service_role-only writes |
| D6 | `salary_deduction_pending` = View, not table (Brief §2.6) | Brief explicit |
| D7 | `credentials_jsonb` column built but unencrypted in Phase A — encryption layer in Phase C | Brief §10 deferred |
| D8 | payment_number atomic via allocate_tenant_number(p_tenant_id, 'payment') | Re-use shared infra |

### Cross-Reference Check (Step 1.5)

| Name | Hits | Resolution |
|---|---|---|
| `payments`, `payment_channels`, `payment_capabilities`, `payment_adapters`, `payment_events_queue` | 0 each | New |
| `payment_methods` | EXISTS | EXTEND additively per D1 |
| Enums: `payment_status`, `check_bounce_reason`, `payment_channel_status`, `payment_event_kind` | 0 each | New |
| RPCs: `record_payment`, `mark_check_deposited`, `mark_check_cleared`, `mark_check_returned`, `mark_salary_deduction_processed`, `emit_first_payment_event_fn`, `emit_check_returned_event_fn` | 0 each | New |
| Views: `v_order_payment_summary`, `v_customer_payments_history`, `v_payments_for_reports`, `v_salary_deduction_pending`, `v_returned_checks_pending` | 0 each | New |

**Cross-Reference Check completed 2026-05-23: 0 hard collisions / 1 expected EXTEND (payment_methods).**

### Runtime semantics rehearsed

All 5 RPCs use Block A header from JWT_VALIDATION_HEADER.sql. Each:
- Anon: Block A → 42501 ✅
- Wrong tenant: Block A inner check → 42501 ✅
- service_role: bypass; body executes with tenant_id pinned from p_tenant_id ✅

NULL-comparison loophole verified absent in all 5.

### Lessons applied

- M5/M6/M7 SCHEMA patterns (Block A, shared counters, additive ALTER, MIGRATION.md log, selective git-add)
- M5 FOREMAN_REVIEW P-AUTHOR-1: per-table column manifest in §3
- M6 FOREMAN_REVIEW P-AUTHOR-1: Cross-Module Contract Matrix
- M7 will-be-harvested patterns: status aggregation trigger pattern (recompute_order_status_fn) — M8's event queue follows similar trigger-fn pattern
- Memory `feedback_dont_add_unrequested_features.md`: adapter manifest is SKELETON config only. No IPaymentProvider class. No charge/refund/webhook code. Iron-clad.

### Cross-Module Contract Matrix

| Surface | Type | Owner | Consumer | Built in |
|---|---|---|---|---|
| `payments.order_id` FK | FK | M8→M7 | — | this SPEC |
| `payments.customer_id` FK | FK | M8→M5 | — | this SPEC |
| `payments.payment_method_id` FK | FK | M8→M8 (self, payment_methods) | — | this SPEC |
| `payments.payment_channel_id` FK | FK | M8→M8 (payment_channels) | — | this SPEC |
| `v_order_payment_summary(order_id)` | View | M8 | M7 editor UI Phase E | this SPEC |
| `v_customer_payments_history` | View | M8 | M5 customer card Phase D | this SPEC |
| `v_payments_for_reports` | View | M8 | M11 future | this SPEC |
| `v_salary_deduction_pending` | View | M8 | M11 future + admin pipeline UI | this SPEC |
| `payment_events_queue` rows | event channel | M8 emits | M7 + M4 listeners | M8 emits; listener attach in Phase C+ |
| `record_payment(p_tenant_id, p_order_id, p_payload jsonb)` | RPC | M8 | M7 checkout UI Phase E + storefront future | this SPEC |
| `mark_check_*` × 4 | RPC | M8 | M8 checks pipeline UI Phase G | this SPEC |

---

## 1. Goal

Ship Phase A+B of M8 — extend existing 8-col `payment_methods` stub into the full M8 spec, build 5 new tables (payments, payment_channels, payment_capabilities, payment_adapters, payment_events_queue) + 4 enums + 5 views + 5 RPCs + 2 event-emission trigger functions. Manifest skeleton only: seed Mock + Gama + Z Credit in payment_adapters as config rows with capability flags — NO integration code. Pass ≥8/8 functional smoke + 6/6 cross-contract M5→M7→M8 bridge on demo so M11 reports + M9 lab can build against stable payment surfaces.

---

## 2. Background & Motivation

M8 orchestrates the customer-payment flow alongside external POS systems (Linet, Gama Pay, etc.). The schema layer is what M7 checkout block + M11 reports + M5 customer card all depend on. Real provider integration is deferred to Phase C (Daniel-in-loop with NDA + sandbox).

Half 2 of 2 in the overnight chain. After this closes 🟢, M9 (Lab) becomes buildable.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | develop, M8 paths clean | git status |
| 2 | SPEC folder | ≥7 files | ls |
| 3 | `payments` table | ≥25 cols (admin + business + check-specific) | information_schema |
| 4 | `payment_methods` extended | 4 existing rows preserved; ≥14 cols total (8 original + 6 added) | count cols, count rows |
| 5 | New tables | payment_channels, payment_capabilities, payment_adapters, payment_events_queue all CREATE | to_regclass not NULL |
| 6 | 4 new enums | payment_status, check_bounce_reason, payment_channel_status, payment_event_kind in pg_type | 4 typname |
| 7 | RLS canonical | service_bypass + tenant_isolation on payments + payment_methods + payment_channels + payment_events_queue. payment_capabilities + payment_adapters = service-role-write/public-read (global) | pg_policy |
| 8 | UNIQUE constraints | (payment_number, tenant_id) WHERE not NULL; (code, tenant_id) on payment_methods; (name) on payment_adapters (global); (code) on payment_capabilities (global) | pg_indexes |
| 9 | FK indexes | payments.order_id, customer_id, method_id, channel_id; payment_events_queue.payment_id, order_id | all indexed |
| 10 | 5 views | v_order_payment_summary, v_customer_payments_history, v_payments_for_reports, v_salary_deduction_pending, v_returned_checks_pending — all security_invoker=on | pg_views |
| 11 | 5 RPCs + 2 trigger fns | record_payment, mark_check_deposited, mark_check_cleared, mark_check_returned, mark_salary_deduction_processed + emit_first_payment_event_fn + emit_check_returned_event_fn | pg_proc |
| 12 | Event triggers attached | trg_emit_first_payment_event (AFTER INSERT ON payments) + trg_emit_check_returned_event (AFTER UPDATE OF status ON payments) | pg_trigger |
| 13 | Seed payment_methods extended | 6 active method rows on demo (cash, check, transfer, credit_card existing + bit, salary_deduction new) with new fields populated | row + col check |
| 14 | Seed payment_adapters | 3 rows (mock, gama_pay, z_credit) — config manifest only | count |
| 15 | Seed payment_capabilities | ≥12 global rows | count |
| 16 | M8 smoke 8/8 PASS | TEST_REPORT.md | all ✅ |
| 17 | Cross-contract 6/6 PASS | TEST_REPORT.md | all ✅ |
| 18 | Iron Rule 31 Integrity Gate | exit 0/2 | npm run verify:integrity |
| 19 | Destructive Ops "None." | gate passes | scripts/checks |
| 20 | T-constants extended | 5 new keys in js/shared.js | grep |
| 21 | Advisors clean | 0 new HIGH/ERROR | get_advisors |
| 22 | No Prizma row writes | 0 rows in payments/payment_channels/payment_events_queue on prizma | count |
| 23 | MIGRATION.md | ≥6 entries | cat |

### 3a. M8 functional smoke (8 cases)

| # | Case | Setup | Effect | Invariant |
|---|---|---|---|---|
| M-S1 | record_payment happy | order from M7 smoke; pay 100 cash | payment_id returned; payment_number=1; status='paid' | counter advances |
| M-S2 | FK order_id enforced | record_payment with non-existent order_id | RAISE EXCEPTION cross-tenant or FK | no row created |
| M-S3 | state transition deposited→in_bank | check payment in 'deferred'; call mark_check_deposited | status='in_bank'; check_deposit_date=today | other fields unchanged |
| M-S4 | salary_deduction_pending appears in view | record_payment method=salary_deduction → status='salary_deduction_pending' | v_salary_deduction_pending count increments | other status views unaffected |
| M-S5 | mark_check_returned emits event | check payment in 'in_bank'; mark_check_returned | status='returned'; payment_events_queue has 1 row kind='check_returned' for this payment_id | M7+M4 listener attach is deferred |
| M-S6 | payment_methods EXTEND preserves rows | inspect | 4 original demo rows still present; 6 new cols populated for them | no data loss |
| M-S7 | cross-tenant guard | demo JWT, record_payment with prizma_tenant_id, prizma_order_id | RAISE 42501 | no rows |
| M-S8 | anon-reject 5 RPCs | role='anon' | 5/5 raise 42501 | — |

### 3b. Cross-contract smoke (6 cases, M5→M7→M8 bridge)

| # | Case | Action | Assertion |
|---|---|---|---|
| X-S1 | M5 create_customer | new customer | customer_id returned |
| X-S2 | M7 create_order | for X-S1 customer | order_id + order_number; status='quote' |
| X-S3 | M7 add_sub_order + add_sub_order_item + transition active | with prescription_glasses_id from M6 fixtures + inventory_id | inventory decremented; sub_order.state='active'; orders.status='active' (via M7 recompute trigger) |
| X-S4 | M8 record_payment | order_id from X-S2, amount 250 cash | payment_id + payment_number; status='paid' |
| X-S5 | first_payment event emitted | (immediately after X-S4) | payment_events_queue has 1 row kind='first_payment' with payment_id=X-S4 payment, order_id=X-S2 order |
| X-S6 | v_order_payment_summary | SELECT * FROM v_order_payment_summary WHERE order_id=X-S2 | total_paid=250, payment_count=1, last_payment_at recent |

---

## 4. Autonomy Envelope

- Apply DDL via MCP `apply_migration`
- Smoke on demo only; 0 Prizma writes
- Selective `git add` by filename
- Touch only: `modules/Module 8 - Payments/**` + GLOBAL docs + js/shared.js + MASTER_ROADMAP

Stops: DROP/TRUNCATE, Prizma writes, smoke failure, new HIGH/ERROR advisor, IPaymentProvider/charge/refund code (out of scope hard).

---

## 5. Stop-on-Deviation Triggers

- If `payment_methods` row count drops below 4 → STOP (data loss)
- If `allocate_tenant_number` signature changed → STOP
- If `orders.id` PK missing → STOP (M7 dependency broken)
- If trigger `trg_emit_first_payment_event` doesn't actually insert into payment_events_queue → STOP

---

## 6. Rollback Plan

Idempotent migrations. ALTER TABLE ADD COLUMN IF NOT EXISTS preserves data. Re-runnable.

---

## Destructive Operations

**None.**

`payment_methods` EXTEND is ALTER ADD COLUMN only (no DROP). All other M8 tables are CREATE. No TRUNCATE. No DELETE-without-tenant-scope. Manifest seeds use ON CONFLICT DO NOTHING.

---

## 7. Out of Scope

- IPaymentProvider class, real adapter code (LinetAdapter, GamaAdapter, ZCreditAdapter, etc.) — Phase C
- Webhook handling, card tokenization, charge/refund/void integration
- Credentials encryption layer (build columns; encryption Phase C)
- All 4 M8 UIs (Phases D, E, F, G)
- M7 listener attach (consumes payment_events_queue 'first_payment')
- M4 listener attach (consumes 'check_returned')
- OpticPlus migration
- Prizma row writes
- Merge to main

---

## 8. Expected Final State

### New files
- `modules/Module 8 - Payments/MODULE_8_ROADMAP.md` (already created)
- `modules/Module 8 - Payments/docs/specs/M8_SCHEMA/SPEC.md` (this file)
- + 6 retro files (EXECUTION_REPORT, FINDINGS, TEST_REPORT, MIGRATION, REVIEW, FOREMAN_REVIEW)
- Module docs (SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, CHANGELOG, db-schema.sql)

### Modified files
- `js/shared.js` — 5 new T-constants (PAYMENTS, PAYMENT_CHANNELS, PAYMENT_CAPABILITIES, PAYMENT_ADAPTERS, PAYMENT_EVENTS_QUEUE) — PAYMENT_METHODS may already exist or need add
- GLOBAL docs + MASTER_ROADMAP at chain close

### DB state
- payment_methods: extended (4 existing rows preserved + 2 new seeds: bit, salary_deduction on demo + prizma)
- 5 new tables created
- payment_adapters: 3 seed rows (mock, gama_pay, z_credit) — manifest only
- payment_capabilities: 12 global rows
- demo: smoke leftover payments (1+ from M-S1, X-S4)
- prizma: 0 row writes on payments, payment_channels, payment_events_queue

---

## 9. DDL — Build Order

### Step 1 — Enums

```sql
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM (
  'pending_pos','paid','deferred','in_bank','cleared','returned',
  'salary_deduction_pending','deducted','refunded','cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.check_bounce_reason AS ENUM (
  'no_coverage','signature_mismatch','closed_account','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.payment_channel_status AS ENUM (
  'unconnected','active','errored','disabled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.payment_event_kind AS ENUM (
  'first_payment','check_returned','salary_deduction_processed','payment_refunded'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### Step 2 — payment_methods EXTEND (additive)

```sql
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS name_ru text,
  ADD COLUMN IF NOT EXISTS requires_pos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_external_receipt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenant_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing 4 demo rows
UPDATE public.payment_methods SET requires_pos=true, requires_external_receipt=true, sort_order=1 WHERE code='cash';
UPDATE public.payment_methods SET requires_pos=false, requires_external_receipt=false, sort_order=4 WHERE code='check';
UPDATE public.payment_methods SET requires_pos=true, requires_external_receipt=true, sort_order=3 WHERE code='transfer';
UPDATE public.payment_methods SET requires_pos=true, requires_external_receipt=true, sort_order=2, tenant_default=true WHERE code='credit_card';

-- Seed 2 new methods per tenant: bit + salary_deduction
INSERT INTO public.payment_methods (tenant_id, code, name_he, name_en, is_system, is_active, requires_pos, requires_external_receipt, sort_order)
VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','bit','ביט','Bit',true,true,true,true,5),
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','salary_deduction','ניכוי משכורת','Salary Deduction',true,true,false,false,6),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','cash','מזומן','Cash',true,true,true,true,1),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','credit_card','כרטיס אשראי','Credit Card',true,true,true,true,2),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','transfer','העברה בנקאית','Bank Transfer',true,true,true,true,3),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','check','צ׳ק','Check',true,true,false,false,4),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','bit','ביט','Bit',true,true,true,true,5),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','salary_deduction','ניכוי משכורת','Salary Deduction',true,true,false,false,6)
ON CONFLICT (code, tenant_id) DO NOTHING;
```

(Note: `payment_methods` existing UNIQUE — to be verified; if missing, ADD CONSTRAINT.)

### Step 3 — payment_capabilities (global pool)

```sql
CREATE TABLE IF NOT EXISTS public.payment_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_he text NOT NULL,
  name_en text NOT NULL,
  category text NOT NULL CHECK (category IN ('core','credit','digital','api','advanced')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_capabilities ENABLE ROW LEVEL SECURITY;
-- Global: public reads, service_role writes
DROP POLICY IF EXISTS service_bypass ON public.payment_capabilities;
CREATE POLICY service_bypass ON public.payment_capabilities AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS public_read ON public.payment_capabilities;
CREATE POLICY public_read ON public.payment_capabilities AS PERMISSIVE FOR SELECT TO public USING (true);

-- Seed 12
INSERT INTO public.payment_capabilities (code, name_he, name_en, category) VALUES
  ('credit','אשראי','Credit','core'),
  ('cash','מזומן','Cash','core'),
  ('check','צ׳ק','Check','core'),
  ('installments','תשלומים','Installments','credit'),
  ('bit','ביט','Bit','digital'),
  ('apple_pay','Apple Pay','Apple Pay','digital'),
  ('google_pay','Google Pay','Google Pay','digital'),
  ('qr','QR-Code','QR','digital'),
  ('tokenization','tokenization','Card Tokenization','advanced'),
  ('webhook','webhook','Webhook Updates','api'),
  ('partial_capture','partial-capture','Partial Capture','advanced'),
  ('void','void','Void/Reverse','advanced')
ON CONFLICT (code) DO NOTHING;
```

### Step 4 — payment_adapters (global manifest skeleton)

```sql
CREATE TABLE IF NOT EXISTS public.payment_adapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  version text NOT NULL DEFAULT '0.1.0',
  description text,
  auth_method text NOT NULL CHECK (auth_method IN ('basic','oauth','api_key','credentials','none')),
  credentials_schema_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  supported_capabilities_array jsonb NOT NULL DEFAULT '[]'::jsonb,
  supported_settlement_modes_array jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  requires_nda boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_adapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.payment_adapters;
CREATE POLICY service_bypass ON public.payment_adapters AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS public_read ON public.payment_adapters;
CREATE POLICY public_read ON public.payment_adapters AS PERMISSIVE FOR SELECT TO public USING (true);

-- Seed 3 (manifest only — NO integration code)
INSERT INTO public.payment_adapters (name, display_name, version, description, auth_method,
                                      credentials_schema_jsonb, supported_capabilities_array,
                                      supported_settlement_modes_array, is_active, requires_nda) VALUES
  ('mock','Mock Adapter','0.1.0','Local testing adapter — no real charges. Used for QA + dev.',
   'none','[]'::jsonb,
   '["credit","cash","check","installments","bit","void","webhook"]'::jsonb,
   '["instant"]'::jsonb,
   true, false),
  ('gama_pay','Gama Pay','0.1.0','Gama Pay POS integration. Requires API key from Gama portal.',
   'api_key',
   '[{"key":"api_key","type":"password","required":true,"placeholder":"GAMA-XXXX"},
     {"key":"terminal_id","type":"text","required":true,"placeholder":"123456"}]'::jsonb,
   '["credit","installments","tokenization","webhook"]'::jsonb,
   '["instant","T+1"]'::jsonb,
   false, true),
  ('z_credit','Z Credit','0.1.0','Z Credit Israeli card-processing adapter.',
   'credentials',
   '[{"key":"merchant_id","type":"text","required":true},
     {"key":"password","type":"password","required":true},
     {"key":"environment","type":"select","options":["sandbox","production"],"required":true}]'::jsonb,
   '["credit","installments","tokenization","partial_capture","void"]'::jsonb,
   '["instant","T+1","T+3"]'::jsonb,
   false, true)
ON CONFLICT (name) DO NOTHING;
```

### Step 5 — payment_channels (per-tenant adapter config)

```sql
CREATE TABLE IF NOT EXISTS public.payment_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  adapter_name text NOT NULL REFERENCES public.payment_adapters(name),
  display_name text NOT NULL,
  credentials_jsonb jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  fallback_channel_id uuid,
  status public.payment_channel_status NOT NULL DEFAULT 'unconnected',
  last_health_check_at timestamptz,
  last_health_check_status text,
  enabled_capabilities_array jsonb NOT NULL DEFAULT '[]'::jsonb,
  settlement_mode text,
  settlement_fee_percent numeric(5,2),
  permission_role_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (tenant_id, display_name) DEFERRABLE
);
ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.payment_channels;
CREATE POLICY service_bypass ON public.payment_channels AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.payment_channels;
CREATE POLICY tenant_isolation ON public.payment_channels AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS payment_channels_tenant_id_idx ON public.payment_channels (tenant_id);
CREATE INDEX IF NOT EXISTS payment_channels_adapter_idx ON public.payment_channels (adapter_name);

-- Seed default Mock channel for demo (so smoke can record_payment)
INSERT INTO public.payment_channels (tenant_id, adapter_name, display_name, is_enabled, is_default, status, settlement_mode)
VALUES
  ('8d8cfa7e-ef58-49af-9702-a862d459cccb','mock','Mock Channel (Demo)',true,true,'active','instant'),
  ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c','mock','Mock Channel (Prizma)',true,true,'active','instant')
ON CONFLICT DO NOTHING;
```

### Step 6 — payments

```sql
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  payment_number integer,
  payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id),
  payment_channel_id uuid REFERENCES public.payment_channels(id),
  amount numeric(12,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending_pos',
  external_receipt_number text,
  external_auth_code text,
  installments_count integer,
  invoice_recipient_name text,
  notes text,
  -- Check-specific
  check_number text,
  check_due_date date,
  check_bank_branch text,
  check_account text,
  check_deposit_date date,
  check_bounce_reason public.check_bounce_reason,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz,
  status_changed_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.payments;
CREATE POLICY service_bypass ON public.payments AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.payments;
CREATE POLICY tenant_isolation ON public.payments AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON public.payments (tenant_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS payments_method_id_idx ON public.payments (payment_method_id);
CREATE INDEX IF NOT EXISTS payments_channel_id_idx ON public.payments (payment_channel_id) WHERE payment_channel_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_number_uidx ON public.payments (payment_number, tenant_id) WHERE payment_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_check_due_idx ON public.payments (check_due_date) WHERE status='deferred';
```

### Step 7 — payment_events_queue

```sql
CREATE TABLE IF NOT EXISTS public.payment_events_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payment_id uuid NOT NULL REFERENCES public.payments(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  customer_id uuid REFERENCES public.customers(id),
  event_kind public.payment_event_kind NOT NULL,
  event_payload jsonb DEFAULT '{}'::jsonb,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_by text                                                    -- 'M7'|'M4'|etc.
);
ALTER TABLE public.payment_events_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.payment_events_queue;
CREATE POLICY service_bypass ON public.payment_events_queue AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.payment_events_queue;
CREATE POLICY tenant_isolation ON public.payment_events_queue AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX IF NOT EXISTS payment_events_queue_payment_id_idx ON public.payment_events_queue (payment_id);
CREATE INDEX IF NOT EXISTS payment_events_queue_unconsumed_idx ON public.payment_events_queue (event_kind) WHERE consumed_at IS NULL;
```

### Step 8 — 5 RPCs

All SECURITY DEFINER + Block A. Detail in executor's apply_migration calls.

- `record_payment(p_tenant_id, p_order_id, p_payload jsonb) → jsonb` — atomic; allocate_tenant_number('payment'); INSERT; status determined by method.requires_pos flag
- `mark_check_deposited(p_tenant_id, p_payment_id)` — deferred → in_bank, sets check_deposit_date
- `mark_check_cleared(p_tenant_id, p_payment_id, p_external_receipt_number)` — in_bank → cleared (paid alias)
- `mark_check_returned(p_tenant_id, p_payment_id, p_bounce_reason)` — in_bank → returned (triggers event)
- `mark_salary_deduction_processed(p_tenant_id, p_payment_id)` — salary_deduction_pending → deducted

### Step 9 — 2 trigger fns + 2 attached triggers

```sql
-- emit_first_payment_event_fn
CREATE OR REPLACE FUNCTION public.emit_first_payment_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.payments
    WHERE order_id = NEW.order_id AND id <> NEW.id AND is_deleted = false;
  IF v_count = 0 THEN
    INSERT INTO public.payment_events_queue
      (tenant_id, payment_id, order_id, customer_id, event_kind, event_payload)
    VALUES (NEW.tenant_id, NEW.id, NEW.order_id, NEW.customer_id, 'first_payment',
            jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'method_id', NEW.payment_method_id));
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.emit_first_payment_event_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.emit_first_payment_event_fn() TO service_role;

DROP TRIGGER IF EXISTS trg_emit_first_payment_event ON public.payments;
CREATE TRIGGER trg_emit_first_payment_event
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.emit_first_payment_event_fn();

-- emit_check_returned_event_fn
CREATE OR REPLACE FUNCTION public.emit_check_returned_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'in_bank' AND NEW.status = 'returned' THEN
    INSERT INTO public.payment_events_queue
      (tenant_id, payment_id, order_id, customer_id, event_kind, event_payload)
    VALUES (NEW.tenant_id, NEW.id, NEW.order_id, NEW.customer_id, 'check_returned',
            jsonb_build_object('bounce_reason', NEW.check_bounce_reason, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.emit_check_returned_event_fn() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.emit_check_returned_event_fn() TO service_role;

DROP TRIGGER IF EXISTS trg_emit_check_returned_event ON public.payments;
CREATE TRIGGER trg_emit_check_returned_event
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.emit_check_returned_event_fn();
```

### Step 10 — 5 Views

Detail in executor's apply_migration. All security_invoker=on.

---

## 10. Dependencies

- M7_SCHEMA closed 🟢 (orders.id, customers.id, etc. all available).
- `allocate_tenant_number(uuid, text) → bigint` available.

---

## 11. Lessons Already Incorporated

See §0 — 7 items from M5/M6/M7 + harvested skill patterns.

---

## 12. Pre-Merge Checklist

- [ ] All 23 §3 criteria pass
- [ ] Integrity Gate exit 0/2
- [ ] M8 paths clean, HEAD pushed
- [ ] 7 retro files in SPEC folder
- [ ] Module docs written
- [ ] T-constants extended
- [ ] Advisors clean
- [ ] No Prizma writes
- [ ] M8 8/8 + cross-contract 6/6 PASS

---

*End of M8_SCHEMA SPEC.*
