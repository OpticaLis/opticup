# SPEC — M7_SCHEMA — Orders + Sub-Orders + Items (Phase A + B combined)

> **Location:** `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-23 (overnight chain Half 1 of 2)
> **Module:** 7 — Orders
> **Predecessors closed 🟢:** M5_SCHEMA (2026-05-22), M6_SCHEMA (2026-05-22).
> **Companion (Half 2):** M8_SCHEMA — payments + adapter manifest skeleton.

---

## 0. Pre-Authoring Reality Check

### Probe results (pinned 2026-05-23 against live Supabase `tsxrrxzmdxaenlvocyit`)

| Probe | Finding | SPEC action |
|---|---|---|
| 1. M7 tables exist? | `orders`, `sub_orders`, `sub_order_items`, `order_general_discounts`, `order_sequences` all NULL | CREATE all 5 |
| 2. Dependencies? | `customers` ✅, `prescriptions_glasses` ✅, `prescriptions_contacts` ✅, `inventory` ✅, `purchase_order_line.sale_order_id` ✅ | M7 FKs work |
| 3. M1 inventory RPCs? | `decrement_inventory(inv_id uuid, delta integer) → void` ✅ + `increment_inventory(inv_id uuid, delta integer) → void` ✅ | Call directly. NO thin wrappers needed (Brief §4.3 path 1). |
| 4. inventory shape | 30 cols, includes `quantity integer NOT NULL`, `tenant_id uuid NOT NULL`, `branch_id uuid` | FK target ready |
| 5. `allocate_tenant_number`? | EXISTS (built by M5) with signature `(uuid, text) → bigint` | Re-use with `entity_kind='order'` |
| 6. Demo fixtures from M5/M6? | 10 customers + 5 prescriptions_glasses on demo | Available for smoke S5+cross-contract |
| 7. Event trigger pattern? | `trg_event_status_change_event AFTER UPDATE OF status ON crm_events` etc. — clean AFTER UPDATE pattern | Mirror this pattern for M7 status aggregation triggers |

### Strategic decisions taken from probes

| # | Decision | Rationale |
|---|---|---|
| D1 | M1 inventory RPCs called directly; no M7-side wrappers | `decrement_inventory(inv_id, delta)` already atomic + adequate. Iron Rule 21 (no orphans) — extending or replacing is wrong; just call. |
| D2 | order_number allocation via M5's `allocate_tenant_number(p_tenant_id, 'order')` | Shared per-tenant counter. Iron Rule 11 + 21. No new sequence object. |
| D3 | `order_sequences` table NOT created — superseded by `tenant_number_counters` (which serves the role per-entity_kind) | Brief §2.5 wanted a config table; the M5 generic infra makes it redundant. Documented swap. |
| D4 | Sub-order `letter` immutability enforced via UNIQUE (order_id, letter) INCLUDING soft-deleted rows. Use `UNIQUE NULLS NOT DISTINCT` + composite | Brief §6 #2 risk |
| D5 | Status aggregation on orders.status (active/quote/cancelled) via AFTER INSERT/UPDATE trigger on sub_orders — fires `recompute_order_status_fn()` (mirror M1 K3 + crm event triggers) | Brief §3 — orders.status = AND of sub_orders states |
| D6 | Sub-order `kind` enum bounded (frame/lenses/contacts/accessories — 4 only) per Brief §8 #1 | enum (P19 — bounded state-machine), not config table |
| D7 | Inventory decrement on state→active OR on initial INSERT if state='active' from start — handled inside `transition_sub_order_state` + `add_sub_order_item` | Brief §4.3 |
| D8 | Reservation expiry — `reservation_expires_at` column built; cron NOT scheduled (deferred until production) | Out of scope per Brief |

### Cross-Reference Check (Step 1.5)

All new names grep-verified against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, live `pg_class/pg_proc`:

| Name | Hits | Resolution |
|---|---|---|
| `orders` table | 0 | New |
| `sub_orders`, `sub_order_items`, `order_general_discounts` | 0 each | New |
| `order_sequences` | 0 | D3 — superseded by `tenant_number_counters`; not created |
| Enums: `order_status`, `sub_order_state`, `sub_order_kind`, `sub_order_location`, `item_type`, `repair_mode`, `repair_origin`, `task_status`, `discount_type` | 0 each | New |
| RPCs: `create_order`, `add_sub_order`, `add_sub_order_item`, `transition_sub_order_state`, `cancel_sub_order`, `apply_general_discount`, `recompute_order_status_fn` | 0 each | New |
| Views: `v_order_customer_summary`, `v_order_full`, `v_lab_queue`, `v_open_reservations`, `v_open_tasks`, `v_open_repairs`, `v_ready_for_pickup` | 0 each | New |

**Cross-Reference Check completed 2026-05-23: 0 hard collisions / 1 expected swap (order_sequences → tenant_number_counters).**

### Runtime semantics rehearsed (P-AUTHOR-2)

| RPC | Anon | Wrong tenant_id | service_role |
|---|---|---|---|
| `create_order` | Block A → 42501 | Block A → 42501 | bypass; allocate_tenant_number; INSERT |
| `add_sub_order` | 42501 | 42501 | bypass; verify order.tenant_id=p_tenant_id; SELECT max(letter)+1; INSERT |
| `add_sub_order_item` | 42501 | 42501 | bypass; verify sub_order tenant; decrement_inventory if state='active' AND decrements_inventory; INSERT |
| `transition_sub_order_state` | 42501 | 42501 | bypass; if to 'active' → decrement_inventory; if from 'active'→'cancelled' → increment_inventory |
| `cancel_sub_order` | 42501 | 42501 | bypass; iterate items; increment_inventory each; soft-delete sub-order (letter retained) |
| `apply_general_discount` | 42501 | 42501 | bypass; INSERT into order_general_discounts |
| `recompute_order_status_fn` (trigger fn) | n/a | n/a | trigger context |

### Lessons applied

| Source | Lesson | Application |
|---|---|---|
| M5_SCHEMA / M6_SCHEMA | "Re-use `allocate_tenant_number`" | M7 uses entity_kind='order' (per D2) |
| M5_SCHEMA FOREMAN_REVIEW P-AUTHOR-1 | "Per-table column manifest, not project total" | §3 success criteria pin per-table column count |
| M5_SCHEMA FOREMAN_REVIEW P-AUTHOR-2 | "MCP RLS verification via pg_policy probe + RPC-level cross-tenant" | Smoke S8 uses RPC-level 42501 verification |
| M5_SCHEMA FOREMAN_REVIEW P-EXEC-1 | "Validate column count per ALTER" | Executor will probe per migration |
| M6_SCHEMA P-AUTHOR-1 | "Cross-Module Contract Matrix in §0" | Below |
| `JWT_VALIDATION_HEADER.sql` | "Block A canonical, no hand-roll" | All 6 RPCs inline Block A |
| Memory `feedback_dont_add_unrequested_features.md` | "Don't add beyond Brief" | Reservation cron, lab-queue trigger, lifecycle trigger attach all deferred |

### Cross-Module Contract Matrix (from M6_SCHEMA P-AUTHOR-1 harvest)

| Surface | Type | Owner | Consumer(s) | Built in |
|---|---|---|---|---|
| `orders.id` PK | FK target | M7 | M8 (payments.order_id), M9 future, M11 future, M12 future | this SPEC |
| `orders.customer_id` FK | FK | M7→M5 | — | this SPEC |
| `sub_orders.prescription_glasses_id` / `_contacts_id` FK | FK | M7→M6 | — | this SPEC |
| `sub_order_items.inventory_id` FK | FK | M7→M1 | — | this SPEC |
| `v_order_customer_summary` | View | M7 | M7 editor UI (Phase D) | this SPEC |
| `v_order_full` | View | M7 | M7 editor UI + M8 receipt building | this SPEC |
| `v_lab_queue` | View | M7 | M9 future | this SPEC |
| `decrement_inventory` / `increment_inventory` | RPC | M1 (existing) | M7 calls | M7 calls direct (Brief §4.3) |
| `allocate_tenant_number(p_tenant_id, 'order')` | RPC | M5 | M7 uses | M5_SCHEMA built |
| Future: `compute_lifecycle_stage_on_order` trigger | trigger fn | M5 (built deferred) | M7 attaches when ready | NOT this SPEC |

---

## 1. Goal

Ship Phase A+B of M7 — build 4 new tables (orders, sub_orders, sub_order_items, order_general_discounts) + 9 enums + 7 views + 6 RPCs + 1 status-aggregation trigger function. Re-uses M5's `allocate_tenant_number` and M1's `decrement_inventory`/`increment_inventory`. Pass ≥8/8 functional smoke on demo so M8 (Payments) can FK to `orders.id` and M9 (Lab) can FK to `sub_orders.id` when those modules build.

---

## 2. Background & Motivation

M7 is the central operational module — every sale, repair, frame-reservation, quote lives here. Downstream FKs depend on M7: M8 payments, M9 lab, M11 reports, M12 communications, M13 loyalty. The OpticPlus migration (9,805 orders) is blocked on M7's schema being stable. This SPEC ships the schema only; UI + migration are deferred to later phases per the overnight Brief.

Half 1 of 2 in the overnight chain. M8_SCHEMA (Half 2) starts after M7 closes 🟢 with 8/8 smoke.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | On `develop`, M7 paths clean | `git status` |
| 2 | SPEC folder | ≥7 files (SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION + REVIEW + FOREMAN_REVIEW) | ls |
| 3 | `orders` table | 13 cols (id, tenant_id, branch_id, customer_id, order_number, status, language, created_at, created_by, closed_at, closed_by, is_deleted, deleted_at) + `thanks_message_sent_at` + `general_discount_amount` + `updated_at`/`updated_by` = ≥17 cols | `information_schema.columns` count for `orders` ≥ 17 |
| 4 | `sub_orders` table | ≥35 cols (8 admin + 8 type/status + 10 flow dates/actors + 5 repair + 7 task + 2 reservation + 2 prescription + 4 pricing) | count ≥ 35 |
| 5 | `sub_order_items` table | ≥10 cols | count ≥ 10 |
| 6 | `order_general_discounts` table | ≥9 cols | count ≥ 9 |
| 7 | 9 new enums | order_status, sub_order_state, sub_order_kind, sub_order_location, item_type, repair_mode, repair_origin, task_status, discount_type in pg_type | 9 typname matches |
| 8 | RLS canonical 2-policy on all 4 tables | service_bypass + tenant_isolation | pg_policy count = 8 across 4 tables |
| 9 | UNIQUE constraints tenant-scoped | (order_id, letter) including is_deleted — partial UNIQUE; (order_number, tenant_id) WHERE not NULL; (branch_id, tenant_id, order_number) optional composite | pg_constraint + pg_indexes |
| 10 | FK indexes | customer_id, sub_orders.order_id, sub_order_items.sub_order_id, sub_order_items.inventory_id, prescription_glasses_id, prescription_contacts_id | all indexed |
| 11 | 7 views | v_order_customer_summary, v_order_full, v_lab_queue, v_open_reservations, v_open_tasks, v_open_repairs, v_ready_for_pickup all with security_invoker=on | pg_views |
| 12 | 6 RPCs + 1 trigger fn | create_order, add_sub_order, add_sub_order_item, transition_sub_order_state, cancel_sub_order, apply_general_discount + recompute_order_status_fn; all SECURITY DEFINER + search_path + Block A + REVOKE anon / GRANT auth+service | pg_proc |
| 13 | Status aggregation trigger | AFTER INSERT/UPDATE ON sub_orders → recompute_order_status_fn updates orders.status | pg_trigger |
| 14 | Smoke 9/9 PASS on demo | TEST_REPORT.md | All cases ✅ |
| 15 | Iron Rule 31 Integrity Gate | exit 0 or 2 | `npm run verify:integrity` |
| 16 | Destructive Operations declared "None." | No DROP/TRUNCATE | gate passes |
| 17 | T-constants extended | ORDERS, SUB_ORDERS, SUB_ORDER_ITEMS, ORDER_GENERAL_DISCOUNTS added | grep js/shared.js |
| 18 | Advisors clean | 0 new HIGH/ERROR | get_advisors diff |
| 19 | No Prizma data writes | 0 rows on orders/sub_orders/items/discounts in prizma | count probe |
| 20 | MIGRATION.md Applied Log | ≥6 entries | cat MIGRATION.md |

### 3a. Functional smoke cases (≥9, captured in TEST_REPORT.md)

All on demo tenant (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). Each case uses `SET LOCAL request.jwt.claims = '{"role":"authenticated","tenant_id":"8d8cfa7e-..."}'` for caller simulation.

| # | Case | Setup | Effect Assertion | Invariant Assertion |
|---|---|---|---|---|
| S1 | create_order happy | demo customer #1 (existing from M5 smoke) | order_id returned, order_number=1, status='quote' | tenant_number_counters last_value for ('order')=1 |
| S2 | order_number atomic 3-call | 3 sequential create_order | numbers 2, 3, 4 contiguous | counter advances by 3 |
| S3 | add_sub_order letter assignment | call 3 times on same order | letters 'A','B','C' | (order_id, 'A') UNIQUE holds; cannot reuse on soft-delete |
| S4 | add_sub_order_item + decrement_inventory | demo inventory row with quantity=10; add 1 frame item, state='active' | inventory.quantity drops to 9 | atomic in single transaction |
| S5 | transition_sub_order_state quote→active | sub-order in 'quote' state with 1 item | state='active', inventory.quantity drops | second call same direction is no-op |
| S6 | cancel_sub_order restores inventory | active sub-order with 1 item | inventory.quantity restored; sub_order.is_deleted=true; letter NOT reassignable | order.status recomputed (if only sub-order) |
| S7 | apply_general_discount | order_id + payload{type:'manual', amount:50, requires_pin:true} | row inserted in order_general_discounts; orders.general_discount_amount=50 | discount sum updated correctly |
| S8 | cross-tenant guard | demo JWT, call create_order with prizma_tenant_id | raises 42501 | no rows created |
| S9 | anon-reject all 6 RPCs | JWT role='anon' | all 6 raise 42501 | 6/6 caught |

---

## 4. Autonomy Envelope

### What the executor CAN do

- Apply DDL via Supabase MCP `apply_migration`
- Run smoke INSERTs on demo only
- Selective `git add` by filename (NEVER `-A` / `.`)
- Touch ONLY: `modules/Module 7 - Orders/**` + `docs/GLOBAL_*.md/sql` + `docs/DB_TABLES_REFERENCE.md` + `js/shared.js` + `MASTER_ROADMAP.md`
- Pre-existing dirty files from chain start remain untouched

### What REQUIRES stopping

- Any DROP/TRUNCATE/DELETE-without-tenant-scope
- Any Prizma row write on M7 tables
- Smoke failure
- New HIGH/ERROR advisor
- Touching `payment_methods` (M8's territory; Half 2)

---

## 5. Stop-on-Deviation Triggers (M7-specific)

- If `decrement_inventory` signature differs from `(uuid, integer) → void` → STOP
- If `allocate_tenant_number` signature differs from `(uuid, text) → bigint` → STOP
- If `customers.id` or `prescriptions_glasses.id` missing → STOP (M5/M6 dependency broken)
- If smoke S4 doesn't actually decrement `inventory.quantity` → STOP (M1 contract failure)
- If smoke S3 finds letter 'A' is reassignable after soft-delete → STOP (letter immutability broken)

---

## 6. Rollback Plan

Idempotent migrations (IF NOT EXISTS / OR REPLACE / DO blocks). Re-runnable.
Smoke INSERTs use explicit IDs; can DELETE by id on rollback.
Chain halts cleanly: M7 only at 🟢 means M8 reopen on next session.

---

## Destructive Operations

**None.**

All DDL is CREATE/ALTER ADD only. ON DELETE CASCADE on `sub_orders → sub_order_items` is a schema relationship, not a destructive op per Iron Rule 32. Smoke cancellations call `cancel_sub_order` RPC (soft-delete + inventory restore), never bare DELETE.

---

## 7. Out of Scope (explicit)

- No UI (Phases D-F).
- No M5 lifecycle_stage trigger attach (M5_SCHEMA built the function; M7 doesn't wire it on first-order — waits for production go-live decision).
- No M9 lab queue trigger (v_lab_queue View only).
- No reservation expiry cron.
- No M13 loyalty trigger.
- No OpticPlus migration.
- No `payment_methods` touch (M8 territory).
- No Prizma row writes.
- No merge to main.

---

## 8. Expected Final State

### New files
- `modules/Module 7 - Orders/MODULE_7_ROADMAP.md` (already created chain-start)
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/SPEC.md` (this file)
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/EXECUTION_REPORT.md`
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/FINDINGS.md`
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/TEST_REPORT.md`
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/MIGRATION.md`
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/REVIEW.md`
- `modules/Module 7 - Orders/docs/specs/M7_SCHEMA/FOREMAN_REVIEW.md`
- `modules/Module 7 - Orders/docs/SESSION_CONTEXT.md`
- `modules/Module 7 - Orders/docs/MODULE_SPEC.md`
- `modules/Module 7 - Orders/docs/MODULE_MAP.md`
- `modules/Module 7 - Orders/docs/CHANGELOG.md`
- `modules/Module 7 - Orders/docs/db-schema.sql`

### Modified files
- `js/shared.js` — 4 new T-constants (ORDERS, SUB_ORDERS, SUB_ORDER_ITEMS, ORDER_GENERAL_DISCOUNTS)
- `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/DB_TABLES_REFERENCE.md`, `MASTER_ROADMAP.md` (at chain close)

### DB state
- 4 new M7 tables + 9 enums + 7 views + 7 functions (6 RPCs + 1 trigger fn) + 1 trigger attached
- `tenant_number_counters` has rows for entity_kind='order' after smoke
- demo: smoke leftover rows (cleanup is non-strict — orders are independent of customer cleanup)
- prizma: 0 M7 rows

---

## 9. DDL — Build Order

### Step 1 — Enums (9)

```sql
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('quote','active','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sub_order_state AS ENUM ('quote','active','reservation','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sub_order_kind AS ENUM ('frame','lenses','contacts','accessories'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sub_order_location AS ENUM ('shop','lab','at_customer','outside_lab'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.item_type AS ENUM ('frame','lens_pair','contact_lenses','accessory','free_text'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.repair_mode AS ENUM ('internal','outside'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.repair_origin AS ENUM ('own_shop','elsewhere'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_status AS ENUM ('open','in_progress','waiting_reply','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.discount_type AS ENUM ('coupon','health_fund','loyalty','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Migration: `M7_01_enums`.

### Step 2 — orders

Standard CREATE with FK to customers, tenants. RLS canonical 2-policy. Indexes on customer_id + tenant_id + status + order_number partial. UNIQUE (order_number, tenant_id) WHERE not NULL.

Migration: `M7_02_orders`.

### Step 3 — sub_orders

35+ cols per Brief §2.2. UNIQUE (order_id, letter) WHERE TRUE (lets soft-deleted occupy letter forever). Partial indexes per status flag.

Migration: `M7_03_sub_orders`.

### Step 4 — sub_order_items

10 cols + ON DELETE CASCADE from sub_orders. `decrements_inventory boolean` field defaulted from `item_type`.

Migration: `M7_04_sub_order_items`.

### Step 5 — order_general_discounts

9 cols. FK to orders. Per-discount_type rules.

Migration: `M7_05_order_general_discounts`.

### Step 6 — 6 RPCs

All SECURITY DEFINER + `SET search_path = 'public'` + Block A header + REVOKE anon + GRANT authenticated+service_role.

- `create_order` calls `allocate_tenant_number(p_tenant_id, 'order')`
- `add_sub_order_item` reads `inventory.quantity` and calls `decrement_inventory(p_inventory_id, p_quantity)` if state='active' AND decrements_inventory=true
- `cancel_sub_order` iterates child items and calls `increment_inventory` per

Migrations: `M7_06_rpc_create_order`, `M7_06_rpc_add_sub_order`, `M7_06_rpc_add_sub_order_item`, `M7_06_rpc_transition_sub_order_state`, `M7_06_rpc_cancel_sub_order`, `M7_06_rpc_apply_general_discount`.

### Step 7 — Status aggregation trigger

`recompute_order_status_fn()` — AFTER INSERT/UPDATE ON sub_orders → orders.status = (case when ALL cancelled then 'cancelled', when ANY active then 'active', else 'quote').

Migration: `M7_07_status_aggregation_trigger`.

### Step 8 — Views (7)

All `security_invoker=on`. Soft-deleted excluded.

Migration: `M7_08_views`.

---

## 10. Dependencies / Preconditions

- M5_SCHEMA + M6_SCHEMA closed 🟢 (verified — last night's chain).
- `customers.id` PK + `prescriptions_glasses.id` PK + `inventory.id` PK + `tenants.id` PK available.
- `allocate_tenant_number(uuid, text) → bigint` available.
- `decrement_inventory(uuid, integer) → void` + `increment_inventory(uuid, integer) → void` available.

---

## 11. Lessons Already Incorporated

See §0 "Lessons applied" — 7 items applied from M5/M6/M1A/M1B0 and harvested skill patterns.

---

## 12. Pre-Merge Checklist

- [ ] All 20 §3 criteria pass
- [ ] Integrity Gate exit 0/2
- [ ] M7 paths clean, HEAD pushed
- [ ] 7 retro files in SPEC folder
- [ ] Module docs written
- [ ] T-constants extended
- [ ] Advisors clean
- [ ] No Prizma writes

---

*End of M7_SCHEMA SPEC. After 🟢 + smoke 9/9, chain proceeds to M8_SCHEMA.*
