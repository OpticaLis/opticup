# SPEC — M9_SCHEMA — Lab Foundation (Phase A + B combined)

> **Location:** `modules/Module 9 - Lab/docs/specs/M9_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — 2026-05-23 NIGHT_RUN chain Track 3
> **Predecessor closed 🟢:** Track 1 (M5_M8_CROSS_CONTRACT_FIXES) 2026-05-23
> **Design source:** `modules/Module 9 - Lab/architecture-brief/M9_LAB_BRIEF.md` v1 (sealed 2026-05-10) — NOT re-designed here.

---

## 0. Pre-Authoring Reality Check

| Premise | Probe | Action |
|---|---|---|
| M9 tables absent | all `to_regclass = NULL` | CREATE all |
| M7 sub_orders + orders + customers stable | verified Track 1 closed | FK works |
| M1 inventory table available | verified | FK works |
| M1 lens-specific tables (lens_inventory etc.) | not in scope this SPEC | document-defer the lens FKs |
| allocate_tenant_number signature | `(uuid, text) → bigint` | use entity_kind='lab_job' |
| Pattern P22 partial-unique idiom (from Track 1) | codified in M5_M8_CROSS_CONTRACT_FIXES | M9 inherits from day-1 for lab_events_queue |
| M7 sub_orders has `lab_flow` column? | NO (Brief §9 ToDo) | document-defer; M9 derives from kind for now |

### Strategic decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | All 9 new tables (no lab_status_log table — View only over activity_log) | Brief §3.4 explicit |
| D2 | `lab_events_queue` ships with partial-unique idempotency from day-1 | NIGHT_RUN Brief §4 explicit — inherit Track 1 lesson |
| D3 | Clock Engine = DB function only; pg_cron schedule NOT created | NIGHT_RUN Brief §4 OOS — production go-live wires |
| D4 | M1 lens-specific FKs documented-deferred — `lab_jobs.lens_variant_id` column omitted; future M1-extension SPEC adds when those tables exist | Brief §9 acknowledges blocker |
| D5 | Reuse `allocate_tenant_number(_, 'lab_job')` | shared infra |
| D6 | Notification side-effects NOT built (no calls to M12 from M9 RPCs) | foundation-first |

### Cross-Reference Check (Step 1.5)

All new names — `lab_jobs`, `lab_categories`, `lab_compensation_tiers`, `lab_notes`, `shipping_boxes`, `shipping_box_items`, `lab_damage_reasons`, `lab_couriers`, `lab_supplier_thresholds`, `lab_events_queue`, `v_m9_status_log`, `v_lab_queue_full`, `v_lab_delays_by_supplier`, `v_lab_processing_time`, `v_lab_optician_kpi` — 0 grep hits against GLOBAL_MAP / GLOBAL_SCHEMA / DB_TABLES_REFERENCE.

All enums — `lab_job_status`, `lab_flow`, `shipping_box_direction`, `shipping_box_type`, `shipping_box_status`, `quality_status`, `compensation_status`, `lab_event_kind` — 0 hits. Note: `lab_flow` does not collide with M7 (M7 has no `lab_flow` column yet — Brief §9 ToDo).

All RPCs — `create_lab_job`, `advance_lab_status`, `freeze_lab_clock`, `unfreeze_lab_clock`, `propose_compensation`, `approve_compensation`, `create_shipping_box`, `add_to_shipping_box`, `receive_shipping_box`, `emit_lab_event_fn`, `compute_lab_clock_color_fn` — 0 hits.

### Runtime semantics rehearsed (P-AUTHOR-2)

- All 9 user RPCs use Block A header from `JWT_VALIDATION_HEADER.sql`. Anon → 42501; wrong tenant → 42501; service_role → bypass.
- `lab_events_queue` UNIQUE on (lab_job_id, event_kind) — partial uniques per Pattern P22.
- compute_lab_clock_color_fn runs as service_role-only trigger function — invoked from cron in production; manually invokable for smoke via DO block.
- approve_compensation cap-check uses CHECK clause inside RPC body, not DB CONSTRAINT, because `manager_compensation_max_addition_ils` lives in `tenants.ui_config` or per-tenant settings — query at runtime.

### Lessons applied

- M8_SCHEMA P-AUTHOR-1 (Pattern P22) — `lab_events_queue` partial-unique idiom from day-1
- M5_SCHEMA + M7_SCHEMA — `allocate_tenant_number` re-use
- Track 1 lessons — exception-trap on event-queue INSERTs
- Memory `feedback_probe_constraints_not_just_tables.md` — probed constraints + FK graph for crm_leads in Track 2; ensured M9 plays clean with current schema

### Cross-Module Contract Matrix

| Surface | Type | Owner | Consumer | State |
|---|---|---|---|---|
| `lab_jobs.id` PK | FK target | M9 | future M11 reports, M12 templates | live (this SPEC) |
| `lab_jobs.sub_order_id` FK | FK | M9 → M7 | — | live |
| `lab_jobs.customer_id` FK | FK | M9 → M5 | — | live |
| `v_lab_queue_full` | View | M9 | M9 KDS UI (Phase C) + M11 future | live |
| `lab_events_queue` | event channel | M9 emits | M12 future (deliver templates), M11 future (reports) | live (emits only; listeners deferred) |
| `loyalty_grant_credit_compensation` | RPC | M13 future | M9 approve_compensation calls (deferred — M13 RPC not built) | stubbed (smoke skips the call) |

---

## 1. Goal

Ship the M9 (Lab) schema foundation — 9 new tables + 1 View + 9 RPCs + 8 enums + Pattern P22 event queue with day-1 idempotency. Smoke ≥8/8 + cross-contract on demo. No notification side-effects, no cron scheduling, no UI. After 🟢, M9 UI Phases C-E unblocked and M11/M12/M13 integrations can build.

---

## 2. Background

The M5/M6/M7/M8 spine is now structurally sound (4 schema chains + Track 1 cross-contract fixes today). M9 is the operational lab/KDS layer FK'd to `sub_orders`. Per the sealed v1 Brief from 2026-05-10, the design is locked; this SPEC builds against it.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | develop, M9 paths clean | git status |
| 2 | SPEC folder | 7 files | ls |
| 3 | 9 new tables created | lab_jobs, lab_categories, lab_compensation_tiers, lab_notes, shipping_boxes, shipping_box_items, lab_damage_reasons, lab_couriers, lab_supplier_thresholds | to_regclass × 9 |
| 4 | `lab_events_queue` table created with Pattern P22 partial uniques (per Track 1 idiom) | 1 table + partial unique on (lab_job_id, event_kind) for emit-once semantics | pg_indexes |
| 5 | 8 enums | lab_job_status, lab_flow, shipping_box_direction, shipping_box_type, shipping_box_status, quality_status, compensation_status, lab_event_kind | pg_type |
| 6 | RLS canonical 2-policy on all 10 tables | service_bypass + tenant_isolation | pg_policy count = 20 |
| 7 | 9 RPCs + 2 trigger fns | create_lab_job + advance_lab_status + freeze + unfreeze + propose_compensation + approve_compensation + create_shipping_box + add_to_shipping_box + receive_shipping_box + emit_lab_event_fn + compute_lab_clock_color_fn | pg_proc |
| 8 | `v_m9_status_log` View over activity_log | 1 view | pg_views |
| 9 | `v_lab_queue_full` deployed (M9-owned, complements M7's v_lab_queue) | 1 view | pg_views |
| 10 | Seed data: 7 lab_categories per tenant (multifocal, office, bifocal, shelf_order, shelf_stock, repair, manufacture) + 5 lab_damage_reasons per tenant (scratch, prescription_mismatch, broken, missing_part, poor_quality) + 1 default lab_courier per tenant (כץ) | row counts match |
| 11 | Smoke ≥8 + cross-contract PASS | TEST_REPORT.md | all ✅ |
| 12 | Iron Rule 31 | exit 0/2 | npm run verify:integrity |
| 13 | Iron Rule 32 | None — gate passes | scripts/checks |
| 14 | T-constants in js/shared.js | 10 new (LAB_JOBS, LAB_CATEGORIES, LAB_COMPENSATION_TIERS, LAB_NOTES, SHIPPING_BOXES, SHIPPING_BOX_ITEMS, LAB_DAMAGE_REASONS, LAB_COURIERS, LAB_SUPPLIER_THRESHOLDS, LAB_EVENTS_QUEUE) | grep |
| 15 | 0 new HIGH/ERROR advisor | confirmed | get_advisors |
| 16 | No Prizma row writes (data) | 0 prizma lab_jobs/lab_events | count |
| 17 | MIGRATION.md | ≥9 entries | cat |

### 3a. Smoke (≥8 + cross-contract)

| # | Case | Expected |
|---|---|---|
| T3-S1 | create_lab_job from real demo sub_order | lab_job id returned, status='new', sub_order_id FK populated |
| T3-S2 | advance_lab_status new→sent_for_framing | status + sent_for_framing_at populated, AFTER UPDATE trigger fires lab_event row (kind='status_advance') in queue |
| T3-S3 | Clock color compute on threshold | manipulate lab_jobs.received_at older than category yellow threshold + call compute_lab_clock_color_fn → status_color='yellow' |
| T3-S4 | freeze_lab_clock + unfreeze | clock_paused_at set/cleared with reason |
| T3-S5 | propose + approve_compensation under cap | compensation_status flows threshold_passed → proposed → approved; cap-exceed raises 22023 |
| T3-S6 | create_shipping_box outgoing + add_to_shipping_box | box + box_items rows; lab_job.status='sent_for_framing' |
| T3-S7 | receive_shipping_box mark_ok + mark_damaged | ok job → 'returned_from_framing'; damaged → 're_do' with damage_reason populated |
| T3-S8 | Cross-tenant guard + anon-reject all 9 RPCs | 9/9 raise 42501 for anon; cross-tenant raises 42501 |
| T3-X1 | Cross-contract: M7 sub_order → M9 lab_job → v_lab_queue surfaces | M7 fixture sub_order in 'active' state seeds lab_job, v_lab_queue_full row appears |
| T3-X2 | lab_events_queue idempotency: duplicate emission blocked by partial unique | Direct INSERT of 2nd event with same (lab_job_id, event_kind) → 23505; trigger silent-dedup via exception-trap |

---

## 4. Autonomy Envelope

### What the executor CAN do
- Apply ~12 migrations via MCP
- Run smoke INSERTs/RPCs on demo
- Selective git add for M9 paths + GLOBAL docs + js/shared.js
- Seed config tables on both tenants (categories, damage_reasons, couriers)

### What REQUIRES stopping
- DROP / TRUNCATE / DELETE-without-tenant-scope → STOP
- Wiring pg_cron schedule → STOP (out of scope)
- Calling M12 or M13 RPCs inside M9 fn bodies → STOP (foundation-first)
- Touching M1 lens-specific tables → STOP (separate SPEC)
- Touching M7 sub_orders schema → STOP (separate M7 amendment SPEC)
- Prizma row writes on lab_jobs/shipping_boxes/lab_events_queue → STOP (smoke demo-only)

---

## 5. Stop-on-Deviation

- If sub_orders.id FK creation fails → STOP (Track 1 must be 🟢)
- If allocate_tenant_number signature changed → STOP
- If `lab_events_queue` partial unique doesn't actually prevent duplicate INSERT → STOP

---

## 6. Rollback Plan

All migrations idempotent. Re-runnable. Seed INSERTs use ON CONFLICT DO NOTHING.

---

## Destructive Operations

**None.**

All CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, CREATE INDEX, CREATE POLICY. Seed INSERTs additive.

---

## 7. Out of Scope

- KDS UI / Shipments UI / Dashboard UI — Phases C-E
- M12 templates + delivery — M12 SPECs
- M13 `loyalty_grant_credit_compensation` RPC — M13 SPEC; M9 approve_compensation does NOT call it today (documented in fn body comment)
- pg_cron schedule for Clock Engine — production go-live
- M1 inventory-extension blocker — separate SPEC
- M7 amendment for `sub_orders.lab_flow` column — separate SPEC
- Notification side-effects (WhatsApp, sound) — M12

---

## 8. Expected Final State

10 new tables + 1 new view + 9 RPCs + 2 trigger fns + 8 enums + partial-unique idempotency on `lab_events_queue` from day-1. Seed: 7 categories × 2 tenants = 14, 5 damage_reasons × 2 = 10, 1 courier × 2 = 2. Demo smoke ≥8 + cross-contract PASS. Prizma 0 row writes (data).

---

## 9. DDL — Build Order

### Step 1 — 8 enums

```sql
DO $$ BEGIN CREATE TYPE public.lab_job_status AS ENUM ('new','sent_for_framing','waiting_lens','waiting_client','at_lab','returned_from_framing','ready','delivered','re_do','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lab_flow AS ENUM ('in_stock','lens_order_internal','external'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.shipping_box_direction AS ENUM ('outgoing','incoming'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.shipping_box_type AS ENUM ('return_from_lab','outgoing_to_lab','outgoing_to_customer','outgoing_credit','outgoing_replace','outgoing_repair','stock_inbound','inter_branch_inbound','inter_branch_outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.shipping_box_status AS ENUM ('draft','sent','received','handled','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.quality_status AS ENUM ('pending','ok','damaged','not_inspected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.compensation_status AS ENUM ('none','threshold_passed','proposed','approved','paid','overridden'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lab_event_kind AS ENUM ('status_advance','clock_color_change','compensation_threshold','compensation_approved','box_overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### Step 2 — config tables (lab_categories, lab_damage_reasons, lab_couriers, lab_supplier_thresholds, lab_compensation_tiers)

```sql
CREATE TABLE IF NOT EXISTS public.lab_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  slug text NOT NULL,
  name_he text NOT NULL,
  name_en text,
  name_ru text,
  display_order integer NOT NULL DEFAULT 0,
  color text,
  default_lab_flow public.lab_flow,
  processing_yellow_threshold_minutes integer,
  processing_red_threshold_minutes integer,
  processing_compensation_threshold_minutes integer,
  pickup_yellow_threshold_minutes integer,
  pickup_red_threshold_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  UNIQUE (slug, tenant_id)
);
ALTER TABLE public.lab_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_categories;
CREATE POLICY service_bypass ON public.lab_categories AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_categories;
CREATE POLICY tenant_isolation ON public.lab_categories AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_categories_tenant_id_idx ON public.lab_categories (tenant_id);

CREATE TABLE IF NOT EXISTS public.lab_damage_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  slug text NOT NULL, name_he text NOT NULL, name_en text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, tenant_id)
);
ALTER TABLE public.lab_damage_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_damage_reasons;
CREATE POLICY service_bypass ON public.lab_damage_reasons AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_damage_reasons;
CREATE POLICY tenant_isolation ON public.lab_damage_reasons AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_damage_reasons_tenant_id_idx ON public.lab_damage_reasons (tenant_id);

CREATE TABLE IF NOT EXISTS public.lab_couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  barcode_pattern_regex text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, tenant_id)
);
ALTER TABLE public.lab_couriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_couriers;
CREATE POLICY service_bypass ON public.lab_couriers AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_couriers;
CREATE POLICY tenant_isolation ON public.lab_couriers AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_couriers_tenant_id_idx ON public.lab_couriers (tenant_id);

CREATE TABLE IF NOT EXISTS public.lab_supplier_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  supplier_id uuid,
  expected_return_days integer NOT NULL DEFAULT 14,
  auto_alert_at_days integer NOT NULL DEFAULT 21,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_supplier_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_supplier_thresholds;
CREATE POLICY service_bypass ON public.lab_supplier_thresholds AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_supplier_thresholds;
CREATE POLICY tenant_isolation ON public.lab_supplier_thresholds AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_supplier_thresholds_tenant_id_idx ON public.lab_supplier_thresholds (tenant_id);

CREATE TABLE IF NOT EXISTS public.lab_compensation_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  lab_category_id uuid NOT NULL REFERENCES public.lab_categories(id),
  tier_label text NOT NULL,
  tier_order integer NOT NULL,
  trigger_days_after_red integer NOT NULL,
  compensation_amount_ils numeric(10,2) NOT NULL,
  compensation_type text NOT NULL CHECK (compensation_type IN ('lenses','frames')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_category_id, tier_order)
);
ALTER TABLE public.lab_compensation_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_compensation_tiers;
CREATE POLICY service_bypass ON public.lab_compensation_tiers AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_compensation_tiers;
CREATE POLICY tenant_isolation ON public.lab_compensation_tiers AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_compensation_tiers_tenant_id_idx ON public.lab_compensation_tiers (tenant_id);
CREATE INDEX IF NOT EXISTS lab_compensation_tiers_category_id_idx ON public.lab_compensation_tiers (lab_category_id);
```

### Step 3 — `lab_jobs` core entity

```sql
CREATE TABLE IF NOT EXISTS public.lab_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  branch_id uuid REFERENCES public.tenant_location(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  sub_order_id uuid NOT NULL REFERENCES public.sub_orders(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  category_id uuid REFERENCES public.lab_categories(id),
  lab_flow public.lab_flow NOT NULL DEFAULT 'in_stock',
  status public.lab_job_status NOT NULL DEFAULT 'new',
  status_color text,
  received_at timestamptz NOT NULL DEFAULT now(),
  sent_for_framing_at timestamptz, sent_for_framing_by uuid,
  lens_ordered_at timestamptz, lens_ordered_by uuid,
  returned_at timestamptz,
  ready_at timestamptz, ready_notification_sent_at timestamptz,
  picked_up_at timestamptz, picked_up_by uuid,
  processing_clock_paused_at timestamptz, processing_clock_paused_reason text, processing_clock_paused_by uuid,
  processing_paused_minutes_total integer NOT NULL DEFAULT 0,
  seller_employee_id uuid, lab_optician_employee_id uuid,
  compensation_status public.compensation_status NOT NULL DEFAULT 'none',
  compensation_amount_ils numeric(10,2),
  compensation_type text CHECK (compensation_type IN ('lenses','frames')),
  compensation_approved_by uuid, compensation_reason text,
  manual_override boolean NOT NULL DEFAULT false,
  re_do_count integer NOT NULL DEFAULT 0,
  current_external_company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE public.lab_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_jobs;
CREATE POLICY service_bypass ON public.lab_jobs AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_jobs;
CREATE POLICY tenant_isolation ON public.lab_jobs AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_jobs_tenant_id_idx ON public.lab_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS lab_jobs_sub_order_id_idx ON public.lab_jobs (sub_order_id);
CREATE INDEX IF NOT EXISTS lab_jobs_order_id_idx ON public.lab_jobs (order_id);
CREATE INDEX IF NOT EXISTS lab_jobs_customer_id_idx ON public.lab_jobs (customer_id);
CREATE INDEX IF NOT EXISTS lab_jobs_status_idx ON public.lab_jobs (status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS lab_jobs_branch_id_idx ON public.lab_jobs (branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lab_jobs_category_id_idx ON public.lab_jobs (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lab_jobs_compensation_status_idx ON public.lab_jobs (compensation_status) WHERE compensation_status <> 'none';
```

### Step 4 — `lab_notes` + `shipping_boxes` + `shipping_box_items`

```sql
CREATE TABLE IF NOT EXISTS public.lab_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  lab_job_id uuid NOT NULL REFERENCES public.lab_jobs(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_notes;
CREATE POLICY service_bypass ON public.lab_notes AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_notes;
CREATE POLICY tenant_isolation ON public.lab_notes AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS lab_notes_lab_job_id_idx ON public.lab_notes (lab_job_id);

CREATE TABLE IF NOT EXISTS public.shipping_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  branch_id uuid REFERENCES public.tenant_location(id),
  direction public.shipping_box_direction NOT NULL,
  box_type public.shipping_box_type NOT NULL,
  target_or_source_id uuid,                                          -- polymorphic (supplier/customer/branch)
  courier_id uuid REFERENCES public.lab_couriers(id),
  courier_barcode text,
  supplier_barcode text,
  status public.shipping_box_status NOT NULL DEFAULT 'draft',
  created_by_user_id uuid,
  handled_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz, received_at timestamptz, handled_at timestamptz,
  expected_return_threshold_days integer
);
ALTER TABLE public.shipping_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.shipping_boxes;
CREATE POLICY service_bypass ON public.shipping_boxes AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.shipping_boxes;
CREATE POLICY tenant_isolation ON public.shipping_boxes AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS shipping_boxes_tenant_id_idx ON public.shipping_boxes (tenant_id);
CREATE INDEX IF NOT EXISTS shipping_boxes_status_idx ON public.shipping_boxes (status);
CREATE INDEX IF NOT EXISTS shipping_boxes_courier_idx ON public.shipping_boxes (courier_id) WHERE courier_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shipping_box_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  shipping_box_id uuid NOT NULL REFERENCES public.shipping_boxes(id) ON DELETE CASCADE,
  lab_job_id uuid REFERENCES public.lab_jobs(id),
  quality_status public.quality_status NOT NULL DEFAULT 'pending',
  damage_reason_id uuid REFERENCES public.lab_damage_reasons(id),
  linked_outgoing_box_id uuid REFERENCES public.shipping_boxes(id),
  linked_incoming_box_id uuid REFERENCES public.shipping_boxes(id),
  delivery_doc_numbers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_box_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.shipping_box_items;
CREATE POLICY service_bypass ON public.shipping_box_items AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.shipping_box_items;
CREATE POLICY tenant_isolation ON public.shipping_box_items AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
CREATE INDEX IF NOT EXISTS shipping_box_items_box_id_idx ON public.shipping_box_items (shipping_box_id);
CREATE INDEX IF NOT EXISTS shipping_box_items_lab_job_id_idx ON public.shipping_box_items (lab_job_id) WHERE lab_job_id IS NOT NULL;
```

### Step 5 — `lab_events_queue` (Pattern P22 — with day-1 partial-unique idempotency)

```sql
CREATE TABLE IF NOT EXISTS public.lab_events_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  lab_job_id uuid REFERENCES public.lab_jobs(id),
  shipping_box_id uuid REFERENCES public.shipping_boxes(id),
  event_kind public.lab_event_kind NOT NULL,
  event_payload jsonb DEFAULT '{}'::jsonb,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_by text
);
ALTER TABLE public.lab_events_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_bypass ON public.lab_events_queue;
CREATE POLICY service_bypass ON public.lab_events_queue AS PERMISSIVE FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS tenant_isolation ON public.lab_events_queue;
CREATE POLICY tenant_isolation ON public.lab_events_queue AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- Day-1 idempotency (inherits Track 1 lesson):
-- compensation_threshold + compensation_approved: emit once per lab_job
CREATE UNIQUE INDEX IF NOT EXISTS lab_events_queue_compensation_threshold_uidx
  ON public.lab_events_queue (lab_job_id) WHERE event_kind = 'compensation_threshold';
CREATE UNIQUE INDEX IF NOT EXISTS lab_events_queue_compensation_approved_uidx
  ON public.lab_events_queue (lab_job_id) WHERE event_kind = 'compensation_approved';
-- box_overdue: once per box
CREATE UNIQUE INDEX IF NOT EXISTS lab_events_queue_box_overdue_uidx
  ON public.lab_events_queue (shipping_box_id) WHERE event_kind = 'box_overdue';

CREATE INDEX IF NOT EXISTS lab_events_queue_tenant_id_idx ON public.lab_events_queue (tenant_id);
CREATE INDEX IF NOT EXISTS lab_events_queue_lab_job_id_idx ON public.lab_events_queue (lab_job_id) WHERE lab_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lab_events_queue_unconsumed_idx ON public.lab_events_queue (event_kind) WHERE consumed_at IS NULL;
```

### Step 6 — Seeds (idempotent)

```sql
-- 7 lab_categories per tenant (per Brief §2.2)
INSERT INTO public.lab_categories (tenant_id, slug, name_he, name_en, display_order, default_lab_flow,
  processing_yellow_threshold_minutes, processing_red_threshold_minutes, processing_compensation_threshold_minutes,
  pickup_yellow_threshold_minutes, pickup_red_threshold_minutes)
SELECT t.id, c.slug, c.name_he, c.name_en, c.display_order, c.default_lab_flow,
  c.processing_yellow, c.processing_red, c.processing_compensation,
  c.pickup_yellow, c.pickup_red
FROM (VALUES
  ('multifocal','מולטיפוקל','Multifocal',1,'lens_order_internal'::public.lab_flow, 14400, 20160, 24480, 4320, 10080),
  ('office','אופיס','Office',2,'lens_order_internal'::public.lab_flow, 14400, 20160, 24480, 4320, 10080),
  ('bifocal','ביפוקל','Bifocal',3,'lens_order_internal'::public.lab_flow, 14400, 20160, 24480, 4320, 10080),
  ('shelf_order','מדף הזמנה','Shelf Order',4,'in_stock'::public.lab_flow, 2880, 7200, 10080, 4320, 10080),
  ('shelf_stock','מדף מלאי','Shelf Stock',5,'in_stock'::public.lab_flow, 1440, 4320, NULL, 4320, 10080),
  ('repair','תיקון','Repair',6,'in_stock'::public.lab_flow, 4320, 10080, 14400, 4320, 10080),
  ('manufacture','ייצור','Manufacture',7,'lens_order_internal'::public.lab_flow, 7200, 14400, 20160, 4320, 10080)
) c(slug, name_he, name_en, display_order, default_lab_flow,
     processing_yellow, processing_red, processing_compensation, pickup_yellow, pickup_red)
CROSS JOIN public.tenants t
WHERE t.slug IN ('demo','prizma')
ON CONFLICT (slug, tenant_id) DO NOTHING;

-- 5 damage reasons per tenant
INSERT INTO public.lab_damage_reasons (tenant_id, slug, name_he, name_en, display_order)
SELECT t.id, r.slug, r.name_he, r.name_en, r.display_order
FROM (VALUES
  ('scratch','שריטה','Scratch',1),
  ('prescription_mismatch','לא מתאים למרשם','Prescription Mismatch',2),
  ('broken','שבור','Broken',3),
  ('missing_part','חסר חלק','Missing Part',4),
  ('poor_quality','איכות ירודה','Poor Quality',5)
) r(slug, name_he, name_en, display_order)
CROSS JOIN public.tenants t
WHERE t.slug IN ('demo','prizma')
ON CONFLICT (slug, tenant_id) DO NOTHING;

-- 1 default courier per tenant (Katz/כץ)
INSERT INTO public.lab_couriers (tenant_id, name, is_default, is_active)
SELECT t.id, 'כץ', true, true FROM public.tenants t WHERE t.slug IN ('demo','prizma')
ON CONFLICT (name, tenant_id) DO NOTHING;
```

### Step 7 — RPCs (9 + 2 trigger fns)

Per §0 lesson: all SECURITY DEFINER + Block A + REVOKE anon + GRANT auth+service. Executor inlines bodies per the SPEC's RPC signatures listed in §3a + this section.

(Bodies in executor's apply_migration calls; below is the contract surface.)

| RPC | Signature | Purpose |
|---|---|---|
| `create_lab_job` | `(p_tenant_id, p_sub_order_id, p_category_id, p_lab_flow text DEFAULT 'in_stock') → uuid` | Atomic; derives order_id + customer_id from sub_order; status='new', received_at=now |
| `advance_lab_status` | `(p_tenant_id, p_lab_job_id, p_new_status text) → void` | State-machine transitions, updates flow_at column |
| `freeze_lab_clock` | `(p_tenant_id, p_lab_job_id, p_reason text) → void` | sets processing_clock_paused_at + reason |
| `unfreeze_lab_clock` | `(p_tenant_id, p_lab_job_id) → void` | computes paused-minutes-elapsed + adds to processing_paused_minutes_total |
| `propose_compensation` | `(p_tenant_id, p_lab_job_id, p_amount numeric, p_type text, p_reason text) → void` | status='proposed' + emit compensation_threshold event if first time |
| `approve_compensation` | `(p_tenant_id, p_lab_job_id, p_amount numeric, p_approved_by uuid) → void` | Cap check vs tenant settings (manager_compensation_max_addition); status='approved' + event emit |
| `create_shipping_box` | `(p_tenant_id, p_direction text, p_box_type text, p_courier_id uuid, p_courier_barcode text) → uuid` | INSERT shipping_boxes status='draft' |
| `add_to_shipping_box` | `(p_tenant_id, p_box_id, p_lab_job_id) → uuid` | INSERT shipping_box_items + UPDATE lab_jobs.status='sent_for_framing' (if outgoing) |
| `receive_shipping_box` | `(p_tenant_id, p_box_id, p_items_jsonb jsonb) → void` | Iterate items; mark ok→'returned_from_framing' or damaged→'re_do' (re_do_count++) |
| `emit_lab_event_fn` | trigger fn | AFTER UPDATE on lab_jobs; emits status_advance / clock_color_change to queue with exception-trap |
| `compute_lab_clock_color_fn` | `() → integer` (returns rows updated) | Scans active lab_jobs, sets status_color based on category thresholds — manually invokable; production schedules via pg_cron |

### Step 8 — Views (2)

```sql
-- v_m9_status_log: View over activity_log (Iron Rule 2 + 21)
CREATE OR REPLACE VIEW public.v_m9_status_log
  WITH (security_invoker = on)
AS
SELECT a.* FROM public.activity_log a
WHERE a.entity_type IN ('lab_job','shipping_box');

-- v_lab_queue_full: M9-owned KDS surface (complements M7's existing v_lab_queue)
CREATE OR REPLACE VIEW public.v_lab_queue_full
  WITH (security_invoker = on)
AS
SELECT
  lj.id AS lab_job_id, lj.tenant_id, lj.order_id, lj.sub_order_id, lj.customer_id,
  lj.category_id, lc.slug AS category_slug, lc.name_he AS category_name_he,
  lj.lab_flow, lj.status, lj.status_color,
  lj.received_at, lj.sent_for_framing_at, lj.lens_ordered_at, lj.returned_at, lj.ready_at,
  lj.processing_clock_paused_at, lj.processing_paused_minutes_total,
  lj.compensation_status, lj.compensation_amount_ils,
  o.order_number, so.letter AS sub_order_letter,
  c.full_name AS customer_name, c.phone AS customer_phone
FROM public.lab_jobs lj
JOIN public.orders o ON o.id = lj.order_id
JOIN public.sub_orders so ON so.id = lj.sub_order_id
LEFT JOIN public.lab_categories lc ON lc.id = lj.category_id
LEFT JOIN public.customers c ON c.id = lj.customer_id
WHERE lj.is_deleted = false;
```

---

## 10. Dependencies

- Track 1 closed 🟢
- `customers.id` + `orders.id` + `sub_orders.id` PKs live
- `allocate_tenant_number(uuid, text) → bigint` available (kept for future use; lab_jobs uses uuid PK not human-readable number)
- `tenant_location` table available

---

## 11. Lessons Already Incorporated

- M8 P-AUTHOR-1 + Track 1 — Pattern P22 partial-unique idempotency from day-1 ✅
- Memory `feedback_dont_add_unrequested_features.md` — no notification side-effects in M9 RPCs
- Memory `feedback_clicks_are_not_actions.md` — N/A (no event-based metrics in M9 schema)

---

## 12. Pre-Merge Checklist

- [ ] All 17 §3 criteria pass
- [ ] Integrity Gate exit 0/2
- [ ] M9 paths clean
- [ ] 7 SPEC folder files written
- [ ] Module docs (SESSION_CONTEXT/CHANGELOG/MODULE_MAP/db-schema.sql/MODULE_SPEC) written
- [ ] T-constants 10 new keys in js/shared.js
- [ ] Smoke ≥8 + cross-contract PASS
- [ ] Advisors clean
- [ ] No Prizma row writes (config seeds OK)

---

*End of M9_SCHEMA SPEC. After 🟢, M9 UI Phases C-E + M11 integration + M12 templates unblocked.*
