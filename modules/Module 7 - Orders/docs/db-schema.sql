-- ============================================================
-- Module 7 — Orders — DDL snapshot
-- Sealed: 2026-05-23 Phase A+B closed 🟢 + Track 1 cross-contract fixes 2026-05-23 🟢
-- Source of truth: live DB on Supabase project tsxrrxzmdxaenlvocyit.
-- Detailed DDL: docs/specs/M7_SCHEMA/SPEC.md §9 + docs/specs/M7_SCHEMA/MIGRATION.md
--   + modules/Module 1.5 - Shared Components/docs/specs/M5_M8_CROSS_CONTRACT_FIXES/
-- ============================================================
--
-- F-A-2 INVARIANT (documented 2026-05-23 NIGHT_RUN Track 1):
-- An order's status (quote→active) is ONLY advanced by recompute_order_status_fn (Pattern P21),
-- which fires AFTER INSERT/UPDATE OF state, is_deleted ON sub_orders → orders.status
-- aggregated from child sub_orders.state.
--
-- The first paid payment alone does NOT advance orders.status. The Track 1 lifecycle
-- trigger (trg_advance_lifecycle_on_paid_payment on payments) advances ONLY
-- customers.lifecycle_stage on first paid payment. Orders.status remains 'quote'
-- until a sub_order child exists in 'active' state.
--
-- This is the intentional design from Brief §3 — pick one mechanism per concern.
-- No new RPC path. No new trigger on payments → orders.status.
-- ============================================================

-- Track 1 additions (2026-05-23 — see M5_M8_CROSS_CONTRACT_FIXES SPEC):
-- - sub_orders.rx_snapshot_jsonb — value-snapshot of linked prescription at link-time;
--   populated by add_sub_order; immune to source M6 mutations (verified T1-S6).
-- - sub_order_items.quantity CHECK > 0 (defense-in-depth).
-- - Index on sub_orders.repair_origin_order_id (M7 unindexed FK fix).
-- ============================================================

-- Enums (9): order_status, sub_order_state, sub_order_kind, sub_order_location,
--   item_type, repair_mode, repair_origin, task_status, discount_type.

-- ─── orders ────────────────────────────────────────────────
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  branch_id uuid REFERENCES public.tenant_location(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  order_number integer,
  status public.order_status NOT NULL DEFAULT 'quote',
  language text,
  thanks_message_sent_at timestamptz,
  general_discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON orders AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON orders AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- Indexes: customer_id, tenant_id, branch_id, status (partial WHERE NOT deleted)
-- + UNIQUE (order_number, tenant_id) WHERE order_number IS NOT NULL.

-- ─── sub_orders (Pattern §5.1 multi-state via flags) ──────
CREATE TABLE sub_orders (
  -- 45 cols total. See specs/M7_SCHEMA/SPEC.md §9 step 3 for full DDL.
  -- Key features:
  --   * letter text NOT NULL (immutable lifetime via count-incl-soft-deleted)
  --   * kind enum (frame/lenses/contacts/accessories)
  --   * state enum (quote/active/reservation/cancelled)
  --   * is_repair boolean + has_open_task boolean (independent flags)
  --   * 8 flow-date+actor pairs (sent_for_framing, lenses_ordered, ready, delivered)
  --   * 5 repair fields + 7 task fields + reservation_expires_at
  --   * prescription_glasses_id + prescription_contacts_id FKs to M6
  --   * 4 category discount percentages + 2 subtotal fields
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  letter text NOT NULL,
  kind public.sub_order_kind NOT NULL,
  state public.sub_order_state NOT NULL DEFAULT 'quote',
  is_repair boolean NOT NULL DEFAULT false,
  has_open_task boolean NOT NULL DEFAULT false
  -- ... additional 38 cols (see SPEC)
);
ALTER TABLE sub_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON sub_orders AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON sub_orders AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
-- INDEX-UNIQ (order_id, letter) [letter immutability]
-- 10 indexes incl. partials per status flag

-- ─── sub_order_items ──────────────────────────────────────
CREATE TABLE sub_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  sub_order_id uuid NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  item_type public.item_type NOT NULL,
  inventory_id uuid REFERENCES public.inventory(id),
  unit_price numeric(12,2),
  quantity integer NOT NULL DEFAULT 1,
  decrements_inventory boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE sub_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON sub_order_items AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON sub_order_items AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- ─── order_general_discounts ──────────────────────────────
CREATE TABLE order_general_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_type public.discount_type NOT NULL,
  source_id uuid,
  amount numeric(12,2),
  pct numeric(5,2),
  requires_pin_role text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid,
  notes text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
ALTER TABLE order_general_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON order_general_discounts AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY tenant_isolation ON order_general_discounts AS PERMISSIVE FOR ALL TO public USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- All 4 tables: RLS enabled + canonical 2-policy.

-- Views (7, security_invoker=on): v_order_customer_summary, v_order_full,
--   v_lab_queue, v_open_reservations, v_open_tasks, v_open_repairs,
--   v_ready_for_pickup.

-- RPCs (6 + 1 trigger fn — all SECURITY DEFINER + Block A header):
--   create_order, add_sub_order, add_sub_order_item, transition_sub_order_state,
--   cancel_sub_order, apply_general_discount + recompute_order_status_fn.

-- Trigger: trg_recompute_order_status AFTER INSERT OR UPDATE OF state, is_deleted
--   ON sub_orders → recompute_order_status_fn (Pattern P21 — parent-status aggregation).

-- Re-uses M5 allocate_tenant_number(_, 'order') + M1 decrement/increment_inventory direct.
