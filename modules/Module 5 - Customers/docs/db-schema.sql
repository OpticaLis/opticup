-- ============================================================
-- Module 5 — Customers — DDL snapshot
-- Sealed: 2026-05-22 Phase A+B closed 🟢
-- Source of truth: live DB on Supabase project tsxrrxzmdxaenlvocyit.
-- Detailed DDL: docs/specs/M5_SCHEMA/SPEC.md §3 + docs/specs/M5_SCHEMA/MIGRATION.md
-- ============================================================

-- ─── Enums ─────────────────────────────────────────────────
CREATE TYPE public.customer_lifecycle_stage AS ENUM ('prospect','active','dormant');
CREATE TYPE public.household_status AS ENUM ('active','inactive');
CREATE TYPE public.customer_note_type AS ENUM ('business','medical_q','diagnostics');
CREATE TYPE public.customer_document_category AS ENUM ('doctor_prescription','external_exam','health_fund','other');

-- ─── tenants.tenant_code (added by M5) ─────────────────────
-- ALTER TABLE public.tenants ADD COLUMN tenant_code text NOT NULL;
-- Backfilled: prizma='01', demo='02'.
-- CREATE UNIQUE INDEX tenants_tenant_code_uidx ON public.tenants (tenant_code);

-- ─── tenant_location.deactivated_at (added by M5) ──────────
-- ALTER TABLE public.tenant_location ADD COLUMN deactivated_at timestamptz NULL;

-- ─── customers (extended by M5) ────────────────────────────
-- Original 16-col stub: id, full_name, id_number, phone, email, address, city,
--   birth_date, health_fund (text — deprecated), member_number, notes,
--   branch_id (renamed→home_branch_id), created_by, created_at, updated_at, tenant_id.
-- Added by M5 (26 cols): first_name, last_name, customer_number, lifecycle_stage,
--   household_id, health_fund_id, language_code, gender, profession, dominant_eye,
--   customer_marketing_consent, customer_operational_consent, crm_marketing_consent,
--   crm_operational_consent, source, utm_source, utm_medium, utm_campaign, utm_content,
--   utm_term, utm_campaign_id, first_interaction_at, consent_form_signed_at,
--   is_deleted, deleted_at, updated_by.
-- Added 2026-05-23 (M5_POLISH_PHONE2_LIST_COLUMNS): phone_secondary text (additive).
-- Total: 43 columns.
-- RLS: canonical 2-policy (service_bypass + tenant_isolation JWT-claim) — already present.
-- FKs: home_branch_id→tenant_location, household_id→households, health_fund_id→health_funds.
-- Tenant-scoped partial UNIQUE: (customer_number, tenant_id) WHERE not NULL;
--   (phone, tenant_id) WHERE phone IS NOT NULL AND is_deleted=false;
--   (id_number, tenant_id) WHERE id_number IS NOT NULL AND is_deleted=false.
-- 5 FK + lookup indexes.

-- ─── households ────────────────────────────────────────────
CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  primary_customer_id uuid REFERENCES public.customers(id),
  status public.household_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.households AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.households AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── health_funds ──────────────────────────────────────────
CREATE TABLE health_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);
ALTER TABLE public.health_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.health_funds AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.health_funds AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Seed: לאומית/מכבי/כללית/כללית פלטינום/מאוחדת per tenant.

-- ─── tenant_languages ──────────────────────────────────────
CREATE TABLE tenant_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  language_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language_code, tenant_id)
);
ALTER TABLE public.tenant_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.tenant_languages AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.tenant_languages AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- + partial UNIQUE INDEX tenant_languages_one_default_per_tenant_uidx
--   ON tenant_languages (tenant_id) WHERE is_default = true.
-- Seed per tenant: he (default, active), ru (active), en (active), es (inactive).

-- ─── customer_notes ────────────────────────────────────────
CREATE TABLE customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  note_type public.customer_note_type NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.customer_notes AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.customer_notes AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── customer_documents ────────────────────────────────────
CREATE TABLE customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  category public.customer_document_category NOT NULL,
  file_path text NOT NULL,
  original_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.customer_documents AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.customer_documents AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Storage path: {tenant_id}/{customer_id}/{document_id}.{ext}.

-- ─── tenant_settings ───────────────────────────────────────
CREATE TABLE tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_list_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.tenant_settings AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.tenant_settings AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── tenant_number_counters (shared infra; M5 created, M6+ also write) ─
CREATE TABLE tenant_number_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  entity_kind text NOT NULL,   -- 'customer' | 'prescription' | future
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, entity_kind)
);
ALTER TABLE public.tenant_number_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.tenant_number_counters AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.tenant_number_counters AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- All 8 tables: RLS enabled + canonical 2-policy (service_bypass for service_role +
--   tenant_isolation for public via JWT-claim).

-- Views: v_customer_for_exam, _for_order, _for_payment, _full, _for_messaging,
--   _for_loyalty, _for_appointment. All WITH (security_invoker = on).

-- RPCs: create_customer, merge_customers, assign_to_household,
--   delete_last_unused_customer, update_customer_display_preferences,
--   allocate_tenant_number, compute_lifecycle_stage_on_order (deferred trigger),
--   compute_lifecycle_dormant_sweep (deferred stub).
-- All SECURITY DEFINER + SET search_path TO 'public' + Block A JWT validation header.
