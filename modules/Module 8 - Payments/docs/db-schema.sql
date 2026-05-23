-- ============================================================
-- Module 8 — Payments — DDL snapshot
-- Sealed: 2026-05-23 Phase A+B closed 🟢
-- Source of truth: live DB on Supabase project tsxrrxzmdxaenlvocyit.
-- Detailed DDL: docs/specs/M8_SCHEMA/SPEC.md §9 + docs/specs/M8_SCHEMA/MIGRATION.md
-- ============================================================

-- Enums (4): payment_status (10-state), check_bounce_reason,
--   payment_channel_status, payment_event_kind.

-- ─── payment_methods (EXTENDED from M1-era stub, 4 demo rows preserved) ─
-- ALTER added: name_ru, requires_pos, requires_external_receipt, icon,
--   sort_order, tenant_default, updated_at. Backfilled existing rows.
-- Seeded 2 new methods per tenant: bit + salary_deduction.

-- ─── payment_capabilities (GLOBAL pool, 12 seed rows) ─────
CREATE TABLE payment_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_he text NOT NULL,
  name_en text NOT NULL,
  category text NOT NULL CHECK (category IN ('core','credit','digital','api','advanced')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON payment_capabilities AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY public_read ON payment_capabilities AS PERMISSIVE FOR SELECT TO public USING (true);
-- Seed: 12 capabilities (credit/cash/check/installments/bit/apple_pay/google_pay/qr/tokenization/webhook/partial_capture/void)

-- ─── payment_adapters (GLOBAL manifest, 3 seed rows SKELETON ONLY) ─
CREATE TABLE payment_adapters (
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
ALTER TABLE payment_adapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON payment_adapters AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY public_read ON payment_adapters AS PERMISSIVE FOR SELECT TO public USING (true);
-- Seed: 3 manifest rows — mock (active), gama_pay (inactive, requires_nda),
--   z_credit (inactive, requires_nda). NO integration code.

-- ─── payment_channels (per-tenant adapter config) ─────────
CREATE TABLE payment_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  adapter_name text NOT NULL REFERENCES payment_adapters(name),
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
  UNIQUE (tenant_id, display_name)
);
ALTER TABLE payment_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON payment_channels AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON payment_channels AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Seed: 2 rows (Mock for demo + Mock for prizma).

-- ─── payments (central record) ────────────────────────────
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  payment_number integer,
  payment_method_id uuid NOT NULL REFERENCES payment_methods(id),
  payment_channel_id uuid REFERENCES payment_channels(id),
  amount numeric(12,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending_pos',
  external_receipt_number text,
  external_auth_code text,
  installments_count integer,
  invoice_recipient_name text,
  notes text,
  -- Check-specific (8 cols)
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
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON payments AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON payments AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Indexes: 7 FKs + status + partial UNIQUE on payment_number per tenant.

-- ─── payment_events_queue (Pattern P22 — durable event queue) ─
CREATE TABLE payment_events_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payment_id uuid NOT NULL REFERENCES payments(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  customer_id uuid REFERENCES public.customers(id),
  event_kind public.payment_event_kind NOT NULL,
  event_payload jsonb DEFAULT '{}'::jsonb,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_by text                                  -- 'M7'|'M4'|etc.
);
ALTER TABLE payment_events_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON payment_events_queue AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON payment_events_queue AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- Triggers (2 attached):
--   trg_emit_first_payment_event AFTER INSERT ON payments → emit_first_payment_event_fn
--     (inserts queue row when count(payments WHERE order_id) = 1)
--   trg_emit_check_returned_event AFTER UPDATE OF status ON payments → emit_check_returned_event_fn
--     (inserts queue row on OLD.status='in_bank' AND NEW.status='returned')

-- RPCs (5 + 2 trigger fns — all SECURITY DEFINER + Block A):
--   record_payment, mark_check_deposited, mark_check_cleared,
--   mark_check_returned, mark_salary_deduction_processed,
--   emit_first_payment_event_fn, emit_check_returned_event_fn.

-- Views (5, security_invoker=on):
--   v_order_payment_summary, v_customer_payments_history,
--   v_payments_for_reports, v_salary_deduction_pending,
--   v_returned_checks_pending.

-- Re-uses M5 allocate_tenant_number(_, 'payment') + tenant_number_counters.

-- Adapter integration code (IPaymentProvider class, LinetAdapter, GamaAdapter,
-- ZCreditAdapter): OUT OF SCOPE this SPEC. Phase C.
