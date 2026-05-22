-- ============================================================
-- Module 6 — Prescriptions / Eye Exams — DDL snapshot
-- Sealed: 2026-05-22 Phase A+B closed 🟢
-- Source of truth: live DB on Supabase project tsxrrxzmdxaenlvocyit.
-- Detailed DDL: docs/specs/M6_SCHEMA/SPEC.md §9 + docs/specs/M6_SCHEMA/MIGRATION.md
-- ============================================================

-- ─── Enums (19) ────────────────────────────────────────────
CREATE TYPE public.exam_status AS ENUM ('scheduled','in_progress','completed','cancelled');
CREATE TYPE public.exam_outcome AS ENUM ('prescribed_glasses','prescribed_contacts','prescribed_both','no_change','referred_to_doctor','customer_declined');
CREATE TYPE public.exam_type AS ENUM ('final','old','subjective','objective');
CREATE TYPE public.prescription_status AS ENUM ('draft','committed','superseded','expired','cancelled');
CREATE TYPE public.prescription_source AS ENUM ('internal_exam','vision_function','health_fund','external_optometrist','external_doctor');
CREATE TYPE public.prescription_exam_reason AS ENUM ('routine','vision_complaint','new','post_op','myopia_control');
CREATE TYPE public.prescription_treatment AS ENUM ('none','myocare','atropine','ortho_k','blue_light','dry_eye_drops');
CREATE TYPE public.prescription_refraction_method AS ENUM ('phoropter','auto_refractor','wavefront');
CREATE TYPE public.glasses_lens_type AS ENUM ('single_vision','progressive','bifocal','reading','computer');
CREATE TYPE public.glasses_lens_material AS ENUM ('plastic_1_50','plastic_1_60','plastic_1_67','plastic_1_74','polycarbonate');
CREATE TYPE public.prism_base AS ENUM ('UP','DN','IN','OUT');
CREATE TYPE public.eye_side AS ENUM ('R','L');
CREATE TYPE public.cl_lens_type AS ENUM ('daily_soft','weekly_soft','monthly_soft','quarterly_soft','yearly_soft','toric','multifocal','rgp','ortho_k');
CREATE TYPE public.cl_replacement_period AS ENUM ('daily','weekly','monthly','quarterly','yearly');
CREATE TYPE public.cl_wear_schedule AS ENUM ('daily_remove_at_night','extended_wear');
CREATE TYPE public.cl_material AS ENUM ('silicone_hydrogel','hydrogel','rgp');
CREATE TYPE public.cl_tint AS ENUM ('clear','colored');
CREATE TYPE public.recall_axis_kind AS ENUM ('next_exam','health_fund_validity','prescription_validity','fit_check','glasses_delivery');
CREATE TYPE public.prescription_kind AS ENUM ('glasses','contacts');

-- ─── prescription_types (config per-tenant + capability flags) ─
CREATE TABLE prescription_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name_he text NOT NULL,
  name_en text,
  applies_to text NOT NULL CHECK (applies_to IN ('glasses','contacts','both')),
  triggers_recall boolean NOT NULL DEFAULT true,
  allows_order boolean NOT NULL DEFAULT true,
  is_health_fund_related boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);
ALTER TABLE public.prescription_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescription_types AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescription_types AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Seed: 8 default per tenant — for_distance, for_reading, for_computer, progressive,
--   bifocal, multifocal_cl, for_sunglasses, health_fund.

-- ─── lens_manufacturers (config per-tenant) ───────────────
CREATE TABLE lens_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  country text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (code, tenant_id)
);
ALTER TABLE public.lens_manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.lens_manufacturers AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.lens_manufacturers AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Seed: 5 default per tenant — acuvue, air_optix, proclear, biofinity, dailies.

-- ─── eye_exams ─────────────────────────────────────────────
CREATE TABLE eye_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  exam_date date NOT NULL,
  optometrist_id uuid,
  exam_type public.exam_type,
  status public.exam_status NOT NULL DEFAULT 'scheduled',
  outcome public.exam_outcome,
  reason public.prescription_exam_reason,
  branch_id uuid REFERENCES public.tenant_location(id),
  notes_internal text,
  notes_for_customer text,
  status_changed_at timestamptz,
  status_changed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.eye_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.eye_exams AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.eye_exams AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── prescriptions_glasses + child eyes (Pattern 11) ─────
CREATE TABLE prescriptions_glasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  exam_id uuid REFERENCES public.eye_exams(id),
  prescription_type_id uuid REFERENCES public.prescription_types(id),
  prescription_number integer,
  status public.prescription_status NOT NULL DEFAULT 'draft',
  source public.prescription_source,
  exam_reason public.prescription_exam_reason,
  treatment_selected public.prescription_treatment,
  optometrist_id uuid,
  refraction_method public.prescription_refraction_method,
  recommended_lens_type public.glasses_lens_type,
  recommended_lens_material public.glasses_lens_material,
  health_fund_id uuid REFERENCES public.health_funds(id),
  valid_from date, expires_at date, next_followup_at date,
  bcva_binocular text,
  instructions_for_customer text, notes_internal text,
  status_changed_at timestamptz, status_changed_by uuid,
  committed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.prescriptions_glasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescriptions_glasses AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescriptions_glasses AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- + UNIQUE INDEX prescriptions_glasses_number_uidx (prescription_number, tenant_id) WHERE not NULL.

CREATE TABLE prescription_glasses_eyes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions_glasses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  eye public.eye_side NOT NULL,
  sphere numeric, cyl numeric, axis integer, add_power numeric,
  prism numeric, prism_base public.prism_base,
  va_with_correction text, va_without_correction text, va_pinhole text,
  pd_distance numeric, pd_near numeric,
  pupil_diameter_mm numeric, pupil_height_mm numeric,
  k1 numeric, k2 numeric, k_avg numeric, k_axis integer,
  axial_length_mm numeric,
  read_add numeric, bif_add numeric, mul_add numeric, int_add numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- INDEX-UNIQ (prescription_id, eye) [tenant via parent FK] [tenant-scoped via parent FK]
);
ALTER TABLE public.prescription_glasses_eyes ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescription_glasses_eyes AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescription_glasses_eyes AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── prescriptions_contacts + child eyes (Pattern 11) ─────
-- Mirrors prescriptions_glasses with CL-specific fields:
--   cl_lens_type, cl_replacement_period, cl_wear_schedule,
--   manufacturer_id (FK lens_manufacturers), model_name,
--   cl_material, water_content_pct, dk_l_value, cl_tint.
-- Same state-machine + tenant_id + customer_id + prescription_number atomicity.
CREATE TABLE prescriptions_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  status public.prescription_status NOT NULL DEFAULT 'draft',
  prescription_number integer,
  manufacturer_id uuid REFERENCES public.lens_manufacturers(id),
  -- (...) full column list in source DDL — see specs/M6_SCHEMA/SPEC.md §9
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);
ALTER TABLE public.prescriptions_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescriptions_contacts AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescriptions_contacts AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE TABLE prescription_contacts_eyes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions_contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  eye public.eye_side NOT NULL,
  power numeric,   -- not sphere — POWER is CL-specific
  cyl numeric, axis integer, add_power numeric,
  bc_mm numeric, dia_mm numeric,
  va_with_correction text, va_without_correction text,
  k1 numeric, k2 numeric, k_avg numeric, k_axis integer,
  over_refraction_power numeric, va_over_refraction text,
  lens_catalog_id uuid,   -- FK to M1 lens_catalog deferred
  created_at timestamptz NOT NULL DEFAULT now(),
  -- INDEX-UNIQ (prescription_id, eye) [tenant via parent FK] [tenant-scoped via parent FK]
);
ALTER TABLE public.prescription_contacts_eyes ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescription_contacts_eyes AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescription_contacts_eyes AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── prescription_recall_axes (multi-axis recall storage) ─
CREATE TABLE prescription_recall_axes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  prescription_id uuid NOT NULL,
  prescription_kind public.prescription_kind NOT NULL,
  axis_kind public.recall_axis_kind NOT NULL,
  due_at date NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_recall_axes ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.prescription_recall_axes AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON public.prescription_recall_axes AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- + Partial index ON (due_at) WHERE is_enabled = true AND triggered_at IS NULL.

-- All 8 tables: RLS enabled + canonical 2-policy (service_bypass + tenant_isolation JWT-claim).

-- Views (9): v_exam_for_customer, _for_doctor, v_prescription_glasses_for_order,
--   _contacts_for_order, v_recall_due (window-fn 1-row-per-prescription),
--   v_prescription_history_for_customer (UNION glasses+contacts),
--   v_customer_prescriptions_summary (cross-contract UNION; M5 customer card consumes),
--   v_prescription_full_for_editor, v_prescriptions_list_for_customer (UNION).
-- All WITH (security_invoker = on).

-- RPCs (7): create_exam, create_prescription_draft (M5↔M6 entry), commit_prescription,
--   cancel_draft_prescription (Iron Rule 32), supersede_prescription,
--   compute_recall_due_dates, clone_prescription.
-- All SECURITY DEFINER + SET search_path TO 'public' + Block A header.

-- Re-uses M5 infra: allocate_tenant_number(p_tenant_id, 'prescription') for atomic
--   per-tenant prescription_number allocation (Iron Rule 11).
