# SPEC — M5_M8_CROSS_CONTRACT_FIXES — 8 findings, additive, schema-only

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M5_M8_CROSS_CONTRACT_FIXES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — 2026-05-23 NIGHT_RUN chain Track 1
> **Input reports:** `M5_M8_STRATEGIC_REVIEW_REPORT.md` + `M5_M8_CODE_REVIEW_REPORT.md`
> **Brief:** `NIGHT_RUN_2026_05_23_BRIEF.md` §2.

---

## 0. Pre-Authoring Reality Check

All 8 premises confirmed 2026-05-23 via Supabase MCP SELECT-only probes.

| Premise | Probe result | Action |
|---|---|---|
| F-A-1 `compute_lifecycle_stage_on_order` attached to 0 triggers | pg_trigger count=0 | ATTACH |
| F-B-1 `sub_orders.rx_snapshot_jsonb` absent | information_schema empty | ADD COLUMN + populate in `add_sub_order` |
| F-B-2 `emit_first_payment_event_fn` body has no status gate | body inspected — no WHEN clause | CREATE OR REPLACE with gate |
| F-D1 no partial unique on `payment_events_queue (order_id) WHERE first_payment` | indexes = {pkey, payment_id_idx, partial-on-event_kind WHERE consumed_at IS NULL} | ADD partial UNIQUE + try-catch in fn |
| F-D2 no partial unique on `(payment_id) WHERE check_returned` | same | ADD partial UNIQUE + try-catch in fn |
| F-C3 `mark_check_returned` UPDATE has no `WHERE status='in_bank'` | body inspected — UPDATE filters only by id+tenant_id | CREATE OR REPLACE with predicate |
| F-F1 `payment_events_queue` zero tenant_id / order_id / customer_id indexes | confirmed | CREATE INDEX × 3 |
| F-C2 no DB-level CHECKs on payments.amount / sub_order_items.quantity | RPC body raises but no CONSTRAINT | ADD CONSTRAINT × 2 |
| F-F2 4 unindexed FKs | eye_exams.branch_id, prx_glasses.health_fund_id, prx_contacts.health_fund_id, sub_orders.repair_origin_order_id — all MISSING. sub_orders prescription FKs already indexed (skip) | CREATE INDEX × 4 |
| F-A-2 (other half) | invariant: order quote→active only via sub_order child — documented in M7 db-schema; NO new RPC | DOCUMENT only |

### Decision criteria for fix scope (pre-committed per Pattern 3)

- F-A-1 trigger destination: **`payments` table, AFTER INSERT OR UPDATE OF status, WHEN NEW.status='paid' AND NEW.amount >= 1** — per Strategic Q1 recommendation. Broaden fn body to read `NEW.customer_id`. Closes R1.
- F-B-1 snapshot strategy: **single `rx_snapshot_jsonb jsonb` column** — per Strategic Q2 recommendation. Preferred over 12+ flat columns: simpler migration + survives future M6 schema additions. Populated by `add_sub_order` at link-time when `p_prescription_glasses_id` or `p_prescription_contacts_id` is non-null.
- F-D1/F-D2 conflict-handler: option (a) — wrap INSERT in `BEGIN ... EXCEPTION WHEN unique_violation THEN NULL; END` so silent dedup at emit-time (per Code Q2). At-least-once → exactly-once via DB constraint.

### Cross-Reference Check (Step 1.5)

- `rx_snapshot_jsonb` — 0 hits in GLOBAL_SCHEMA/MODULE_MAP/db-schema → new column safe.
- Index names — `idx_payment_events_queue_tenant_id`, `_order_id`, `_customer_id`, `_first_payment_uidx`, `_check_returned_uidx`, `idx_eye_exams_branch_id`, `idx_prescriptions_glasses_health_fund_id`, `idx_prescriptions_contacts_health_fund_id`, `idx_sub_orders_repair_origin_order_id` — all 0 hits → safe.
- Constraint names — `payments_amount_positive_check`, `sub_order_items_quantity_positive_check` — 0 hits → safe.

### Runtime semantics rehearsed (P-AUTHOR-2)

- F-A-1 trigger fires on **every** payment INSERT/UPDATE. WHEN clause `NEW.status='paid' AND NEW.amount >= 1` short-circuits for pending_pos / deferred / 0-amount → no wasted UPDATE. Fn body also re-checks `customers.lifecycle_stage='prospect'` so subsequent paid payments don't repeatedly UPDATE a customer already in `active`/`dormant`. Idempotent.
- F-B-2 trigger fn `emit_first_payment_event_fn`: outer guard is `count(prior payments)=0`, NOT a WHEN clause. The WHEN clause is added on the **trigger definition** (not the fn body) so the fn never runs for non-paid first INSERTs. Combined with F-D1 partial unique → exactly-once even under concurrent paid+pending_pos producers.
- F-D1 exception-trap: `BEGIN INSERT ... INTO queue ... ; EXCEPTION WHEN unique_violation THEN NULL; END` — Postgres rolls back only the INSERT, not the parent statement (the original `record_payment` succeeds, second concurrent producer's queue INSERT is silently dropped). At-least-once semantics preserved.
- F-C2 CHECK constraints: enforce at row-level on every write path (RPC + service_role direct INSERT). Existing 5 demo payments confirmed amount > 0 → no validation drift on existing data.

### Lessons applied from prior FOREMAN_REVIEWs

- M8_SCHEMA P-AUTHOR-1 (Pattern P22 event-queue idiom) — codify partial-unique-on-source-id here; inherit forward into M9 (Track 3).
- M5_SCHEMA P-AUTHOR-1 — per-table column-count manifest in §3.
- M6_SCHEMA P-AUTHOR-1 — Cross-Module Contract Matrix in §0.
- M7_SCHEMA P-AUTHOR-2 (Pattern P21 naming) — F-A-1's trigger follows the `<entity>_<event>_<verb>_fn` naming.
- Code Review §6 Q2 recommendation — option (a) silent-dedup chosen, not bubble.

### Cross-Module Contract Matrix

| Surface | Type | Owner | Producer | Consumer | Change |
|---|---|---|---|---|---|
| `customers.lifecycle_stage` | column | M5 | this SPEC adds trigger | M11 LTV, M12 segments, M13 enrollment | trigger attach |
| `sub_orders.rx_snapshot_jsonb` | column | M7 | `add_sub_order` populates | M7 editor + M9 lab job + printed forms | new column |
| `payment_events_queue.first_payment` | event | M8 | `emit_first_payment_event_fn` | M7 listener (future), M4 (future) | gated + deduped |
| `payment_events_queue.check_returned` | event | M8 | `emit_check_returned_event_fn` | M7 + M4 (future) | deduped |

---

## 1. Goal

Close the 8 cross-contract / hardening findings surfaced by the Strategic + Code reviews. Schema-only, ALL additive, ~12 MCP migrations, `## Destructive Operations: None.` Smoke 7/7 PASS on demo. Track 1 must close 🟢 before Track 3 (M9) opens.

---

## 2. Background

The 4-module schema spine (M5/M6/M7/M8) closed 🟢 per-module but the reviews surfaced cross-contract gaps the per-module Foremen could not see: lifecycle trigger unattached, prescription value-snapshot missing, first-payment event predicate too lax, queue idempotency gap on concurrent producers, mark_check_returned race, missing FK indexes, missing CHECK constraints. None block M9 schema individually; together they would land regressions the moment two staff act simultaneously. All are 5-30 minute additive fixes.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | develop, M1.5 paths clean | git status |
| 2 | SPEC folder | ≥7 files (SPEC + MIGRATION + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW) | ls |
| 3 | `trg_advance_lifecycle_on_paid_payment` attached to `payments` | 1 trigger | pg_trigger |
| 4 | `compute_lifecycle_stage_on_order` body uses NEW.customer_id + checks `lifecycle_stage='prospect'` idempotently | inspect | pg_get_functiondef |
| 5 | `sub_orders.rx_snapshot_jsonb` column exists, type jsonb, nullable | 1 column | information_schema.columns |
| 6 | `add_sub_order` populates `rx_snapshot_jsonb` at link-time | smoke S6 | TEST_REPORT |
| 7 | `trg_emit_first_payment_event` has WHEN `NEW.status='paid' AND NEW.amount>=1` | inspect | pg_get_triggerdef |
| 8 | Partial unique index `payment_events_queue (order_id) WHERE event_kind='first_payment'` exists | 1 index | pg_indexes |
| 9 | Partial unique index `payment_events_queue (payment_id) WHERE event_kind='check_returned'` exists | 1 index | pg_indexes |
| 10 | `emit_first_payment_event_fn` body has `BEGIN INSERT ... EXCEPTION WHEN unique_violation THEN NULL; END` | inspect | pg_get_functiondef |
| 11 | `emit_check_returned_event_fn` body same try-catch | inspect | pg_get_functiondef |
| 12 | `mark_check_returned` UPDATE has `AND status='in_bank'::payment_status` predicate | inspect | pg_get_functiondef |
| 13 | 3 indexes on `payment_events_queue`: tenant_id, order_id, customer_id | 3 indexes | pg_indexes |
| 14 | CHECK constraint `payments_amount_positive` (amount > 0) | 1 constraint | pg_constraint |
| 15 | CHECK constraint `sub_order_items_quantity_positive` (quantity > 0) | 1 constraint | pg_constraint |
| 16 | 4 unindexed FKs indexed | 4 indexes | pg_indexes (eye_exams.branch_id, prx_glasses.health_fund_id, prx_contacts.health_fund_id, sub_orders.repair_origin_order_id) |
| 17 | Smoke 7/7 PASS on demo | TEST_REPORT.md | all ✅ |
| 18 | Iron Rule 31 Integrity Gate | exit 0/2 | npm run verify:integrity |
| 19 | Iron Rule 32 Destructive Ops | declared "None.", no DROP/TRUNCATE issued | gate passes |
| 20 | 0 new HIGH/ERROR advisor lints | confirmed | get_advisors |
| 21 | No Prizma data writes | 0 prizma row writes | count probe |
| 22 | MIGRATION.md | ≥12 entries | cat MIGRATION.md |

### 3a. Functional smoke (7 cases, demo)

| # | Case | Setup | Effect Assertion | Invariant Assertion |
|---|---|---|---|---|
| T1-S1 | First PAID ≥ ₪1 → customer activates | create new customer (lifecycle='prospect'); create order; record_payment(method=cash, amount=100, → status='paid') | customers.lifecycle_stage='active' | second paid payment on same customer does NOT re-fire UPDATE (idempotent re-check) |
| T1-S2 | pending_pos first → NO first_payment event | record_payment without external_receipt_number → status='pending_pos' | payment_events_queue rows for this order_id WHERE event_kind='first_payment' = 0 | order count of payments = 1 |
| T1-S3 | Concurrent first-payment dedup | record_payment twice for same order in two transactions (simulated via 2 service_role records sequentially with the second forced via tx isolation) | first_payment events = 1 (not 2) | unique_violation silently dropped by exception-trap |
| T1-S4 | mark_check_returned twice | create check 'in_bank'; mark_check_returned twice in succession | check_returned events = 1; second call raises 22023 'Cannot return check from status=returned' (existing guard) | events_queue dedup verified |
| T1-S5 | Direct INSERT amount=0 rejected | service_role direct INSERT INTO payments (amount=0) | RAISE 23514 check_violation `payments_amount_positive` | sub_order_items.quantity=0 also rejected |
| T1-S6 | rx_snapshot populated at link-time + immutable | create draft prescription_glasses on customer; commit_prescription; add_sub_order linking it → sub_orders.rx_snapshot_jsonb populated. Edit the source prescription via SQL UPDATE on prescriptions_glasses → sub_orders.rx_snapshot_jsonb UNCHANGED | snapshot is value-stable |
| T1-S7 | Cross-tenant + anon-reject preserved | T1's fixes don't alter Block A header on touched RPCs | all 5 RPCs touched still raise 42501 for anon |

---

## 4. Autonomy Envelope

### What the executor CAN do

- Apply DDL via Supabase MCP `apply_migration` for the 12 migrations declared in §9
- Run smoke INSERTs on demo only
- Selective `git add` by explicit filename
- Touch only: `modules/Module 1.5 - Shared Components/**` + `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` (additive) + module db-schema.sql snapshots in M5/M7/M8 if touched

### What REQUIRES stopping

- Any DROP / TRUNCATE / DELETE-without-tenant-scope
- Any Prizma row write (DDL applies to both tenants; data writes demo-only)
- Smoke S1-S7 failure
- New HIGH/ERROR advisor lint
- Touching M9 (Track 3 territory)
- Touching `crm_leads` (Track 2 territory)
- Modifying RLS policy USING clauses (out of scope; project-wide RLS-perf SPEC owns this)

---

## 5. Stop-on-Deviation Triggers (T1-specific)

- If `compute_lifecycle_stage_on_order` is already attached → STOP (Brief §6: "note premise resolved; do NOT invent work")
- If trigger fn body modifications break Block A header → STOP
- If smoke S1 doesn't actually advance lifecycle_stage → STOP (trigger semantics wrong)
- If smoke S3 dedups but with a different mechanism than partial unique + exception trap → STOP (design drift)

---

## 6. Rollback Plan

All migrations idempotent (CREATE OR REPLACE / IF NOT EXISTS / DO blocks). Re-runnable. If a migration fails mid-chain: M1.5 paths revertible via `git reset --hard <chain-start>`. Triggers/constraints can be DROPped manually if the SPEC reopens (NOT a Destructive Op in the chain itself; only used in rollback escalation).

---

## Destructive Operations

**None.**

All operations are ALTER ADD COLUMN / CREATE OR REPLACE FUNCTION / CREATE OR REPLACE TRIGGER / CREATE INDEX / ALTER TABLE ADD CONSTRAINT. No DROP, no TRUNCATE, no DELETE.

---

## 7. Out of Scope (explicit)

- Project-wide RLS-perf rewrite (181 `auth_rls_initplan` occurrences) — separate SPEC under M1.5
- anon view REVOKE grants — separate SPEC
- `customer_number_display` short_code backfill / width fix — separate data write
- F-A-2 full quote→active path — documented invariant only; no new RPC
- M9 — Track 3
- crm_leads decommission — Track 2 (additive only, not this SPEC)
- Touching any UI

---

## 8. Expected Final State

### New / modified DB objects

- 1 new trigger on `payments`: `trg_advance_lifecycle_on_paid_payment` AFTER INSERT OR UPDATE OF status WHEN (NEW.status='paid' AND NEW.amount >= 1)
- 1 modified fn body: `compute_lifecycle_stage_on_order` reads NEW.customer_id, NEW.tenant_id; UPDATEs customer if lifecycle='prospect'
- 1 new column: `sub_orders.rx_snapshot_jsonb jsonb`
- 1 modified RPC body: `add_sub_order` populates `rx_snapshot_jsonb` from linked prescription
- 1 modified trigger def: `trg_emit_first_payment_event` adds WHEN clause `NEW.status='paid' AND NEW.amount >= 1`
- 2 modified fn bodies: `emit_first_payment_event_fn` + `emit_check_returned_event_fn` add try-catch
- 2 partial UNIQUE indexes on `payment_events_queue`
- 3 indexes on `payment_events_queue`: tenant_id, order_id, customer_id
- 1 modified RPC body: `mark_check_returned` adds `AND status='in_bank'` to UPDATE WHERE
- 2 CHECK constraints: `payments_amount_positive` + `sub_order_items_quantity_positive`
- 4 FK indexes: `eye_exams.branch_id`, `prescriptions_glasses.health_fund_id`, `prescriptions_contacts.health_fund_id`, `sub_orders.repair_origin_order_id`

### New files (this SPEC folder)

- SPEC.md (this file), MIGRATION.md, TEST_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md, REVIEW.md, FOREMAN_REVIEW.md

### Modified files

- module db-schema snapshots in M5, M7, M8 (additive deltas only)
- F-A-2 invariant DOCUMENTED in M7 db-schema.sql header comment

---

## 9. DDL — Build Order

Migration list (executor applies via MCP in this order):

### M1.5_T1_01 — F-A-1 part 1: broaden lifecycle fn body to read NEW.customer_id

```sql
CREATE OR REPLACE FUNCTION public.compute_lifecycle_stage_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trigger source: payments AFTER INSERT OR UPDATE OF status (WHEN NEW.status='paid' AND NEW.amount>=1).
  -- Reads NEW.customer_id (payments.customer_id), advances customer if still prospect.
  UPDATE public.customers
    SET lifecycle_stage = 'active', updated_at = now()
    WHERE id = NEW.customer_id
      AND tenant_id = NEW.tenant_id
      AND lifecycle_stage = 'prospect';
  RETURN NEW;
END;
$function$;
```

### M1.5_T1_02 — F-A-1 part 2: attach trigger to payments

```sql
DROP TRIGGER IF EXISTS trg_advance_lifecycle_on_paid_payment ON public.payments;
CREATE TRIGGER trg_advance_lifecycle_on_paid_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'paid'::public.payment_status AND NEW.amount >= 1)
  EXECUTE FUNCTION public.compute_lifecycle_stage_on_order();
```

### M1.5_T1_03 — F-B-1: rx_snapshot_jsonb column on sub_orders

```sql
ALTER TABLE public.sub_orders
  ADD COLUMN IF NOT EXISTS rx_snapshot_jsonb jsonb;

COMMENT ON COLUMN public.sub_orders.rx_snapshot_jsonb IS
  'Value snapshot of the linked prescription at link-time. Populated by add_sub_order from prescriptions_glasses/contacts + their eye children. M6 edits do NOT affect this column — order history stable. Per Brief M7 §4.2 + §5.6.';
```

### M1.5_T1_04 — F-B-1 part 2: extend add_sub_order to populate snapshot

```sql
CREATE OR REPLACE FUNCTION public.add_sub_order(
  p_tenant_id uuid, p_order_id uuid, p_kind text, p_state text DEFAULT 'quote',
  p_prescription_glasses_id uuid DEFAULT NULL,
  p_prescription_contacts_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_order_tenant uuid;
  v_existing_count int;
  v_next_letter text;
  v_new_id uuid;
  v_snapshot jsonb;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT tenant_id INTO v_order_tenant FROM public.orders WHERE id = p_order_id;
  IF v_order_tenant IS NULL OR v_order_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Order not found or cross-tenant' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existing_count FROM public.sub_orders WHERE order_id = p_order_id;
  IF v_existing_count >= 8 THEN
    RAISE EXCEPTION 'Order has reached 8-sub-order cap' USING ERRCODE = '22023';
  END IF;
  v_next_letter := chr(ascii('A') + v_existing_count);

  -- Snapshot the linked prescription at link-time (Brief M7 §4.2 + §5.6).
  IF p_prescription_glasses_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'kind', 'glasses',
      'prescription_id', pg.id,
      'prescription_number', pg.prescription_number,
      'committed_at', pg.committed_at,
      'optometrist_id', pg.optometrist_id,
      'expires_at', pg.expires_at,
      'health_fund_id', pg.health_fund_id,
      'eyes', jsonb_object_agg(pge.eye, to_jsonb(pge.*) - 'id' - 'prescription_id' - 'tenant_id' - 'created_at')
    ) INTO v_snapshot
    FROM public.prescriptions_glasses pg
    LEFT JOIN public.prescription_glasses_eyes pge ON pge.prescription_id = pg.id
    WHERE pg.id = p_prescription_glasses_id AND pg.tenant_id = p_tenant_id
    GROUP BY pg.id, pg.prescription_number, pg.committed_at, pg.optometrist_id, pg.expires_at, pg.health_fund_id;
  ELSIF p_prescription_contacts_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'kind', 'contacts',
      'prescription_id', pc.id,
      'prescription_number', pc.prescription_number,
      'committed_at', pc.committed_at,
      'optometrist_id', pc.optometrist_id,
      'expires_at', pc.expires_at,
      'health_fund_id', pc.health_fund_id,
      'manufacturer_id', pc.manufacturer_id,
      'eyes', jsonb_object_agg(pce.eye, to_jsonb(pce.*) - 'id' - 'prescription_id' - 'tenant_id' - 'created_at')
    ) INTO v_snapshot
    FROM public.prescriptions_contacts pc
    LEFT JOIN public.prescription_contacts_eyes pce ON pce.prescription_id = pc.id
    WHERE pc.id = p_prescription_contacts_id AND pc.tenant_id = p_tenant_id
    GROUP BY pc.id, pc.prescription_number, pc.committed_at, pc.optometrist_id, pc.expires_at, pc.health_fund_id, pc.manufacturer_id;
  END IF;

  INSERT INTO public.sub_orders (
    tenant_id, order_id, letter, kind, state,
    prescription_glasses_id, prescription_contacts_id, rx_snapshot_jsonb, created_by
  ) VALUES (
    p_tenant_id, p_order_id, v_next_letter,
    p_kind::public.sub_order_kind, p_state::public.sub_order_state,
    p_prescription_glasses_id, p_prescription_contacts_id, v_snapshot, p_created_by
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;
```

### M1.5_T1_05 — F-B-2 + F-D1: emit_first_payment_event_fn with try-catch + partial unique

```sql
CREATE OR REPLACE FUNCTION public.emit_first_payment_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.payments
    WHERE order_id = NEW.order_id AND id <> NEW.id AND is_deleted = false;
  IF v_count = 0 THEN
    BEGIN
      INSERT INTO public.payment_events_queue
        (tenant_id, payment_id, order_id, customer_id, event_kind, event_payload)
      VALUES (NEW.tenant_id, NEW.id, NEW.order_id, NEW.customer_id, 'first_payment',
              jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'method_id', NEW.payment_method_id));
    EXCEPTION
      WHEN unique_violation THEN
        -- Concurrent producer beat us; silent dedup (at-least-once → exactly-once).
        NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_queue_first_payment_per_order_uidx
  ON public.payment_events_queue (order_id)
  WHERE event_kind = 'first_payment';
```

### M1.5_T1_06 — F-B-2: gate the trigger with WHEN clause

```sql
DROP TRIGGER IF EXISTS trg_emit_first_payment_event ON public.payments;
CREATE TRIGGER trg_emit_first_payment_event
  AFTER INSERT ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'paid'::public.payment_status AND NEW.amount >= 1)
  EXECUTE FUNCTION public.emit_first_payment_event_fn();
```

### M1.5_T1_07 — F-C3: mark_check_returned with WHERE status='in_bank' predicate

```sql
CREATE OR REPLACE FUNCTION public.mark_check_returned(p_tenant_id uuid, p_payment_id uuid, p_bounce_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_status text; v_tenant uuid;
  v_rows_affected int;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT tenant_id, status::text INTO v_tenant, v_status FROM public.payments WHERE id = p_payment_id;
  IF v_tenant IS NULL OR v_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Payment not found or cross-tenant' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'in_bank' THEN
    RAISE EXCEPTION 'Cannot return check from status=% (expected in_bank)', v_status USING ERRCODE = '22023';
  END IF;

  -- Race-safe UPDATE: only one of two concurrent calls under same status will affect a row.
  UPDATE public.payments
    SET status = 'returned',
        check_bounce_reason = nullif(p_bounce_reason,'')::public.check_bounce_reason,
        status_changed_at = now(),
        updated_at = now()
    WHERE id = p_payment_id AND tenant_id = p_tenant_id
      AND status = 'in_bank'::public.payment_status;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Concurrent state change — check already returned' USING ERRCODE = '40001';
  END IF;
END;
$function$;
```

### M1.5_T1_08 — F-D2: emit_check_returned_event_fn try-catch + partial unique

```sql
CREATE OR REPLACE FUNCTION public.emit_check_returned_event_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status::text = 'in_bank' AND NEW.status::text = 'returned' THEN
    BEGIN
      INSERT INTO public.payment_events_queue
        (tenant_id, payment_id, order_id, customer_id, event_kind, event_payload)
      VALUES (NEW.tenant_id, NEW.id, NEW.order_id, NEW.customer_id, 'check_returned',
              jsonb_build_object('bounce_reason', NEW.check_bounce_reason, 'amount', NEW.amount));
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_queue_check_returned_per_payment_uidx
  ON public.payment_events_queue (payment_id)
  WHERE event_kind = 'check_returned';
```

### M1.5_T1_09 — F-F1: 3 indexes on payment_events_queue

```sql
CREATE INDEX IF NOT EXISTS payment_events_queue_tenant_id_idx ON public.payment_events_queue (tenant_id);
CREATE INDEX IF NOT EXISTS payment_events_queue_order_id_idx ON public.payment_events_queue (order_id);
CREATE INDEX IF NOT EXISTS payment_events_queue_customer_id_idx ON public.payment_events_queue (customer_id);
```

### M1.5_T1_10 — F-C2: 2 CHECK constraints

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_amount_positive') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sub_order_items_quantity_positive') THEN
    ALTER TABLE public.sub_order_items ADD CONSTRAINT sub_order_items_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;
```

### M1.5_T1_11 — F-F2: 4 missing FK indexes

```sql
CREATE INDEX IF NOT EXISTS eye_exams_branch_id_idx ON public.eye_exams (branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prescriptions_glasses_health_fund_id_idx ON public.prescriptions_glasses (health_fund_id) WHERE health_fund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prescriptions_contacts_health_fund_id_idx ON public.prescriptions_contacts (health_fund_id) WHERE health_fund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sub_orders_repair_origin_order_id_idx ON public.sub_orders (repair_origin_order_id) WHERE repair_origin_order_id IS NOT NULL;
```

### M1.5_T1_12 — F-A-2 documentation only (NOT a migration; goes into M7 db-schema.sql)

Document this invariant in `modules/Module 7 - Orders/docs/db-schema.sql` near the orders block:

```
-- F-A-2 INVARIANT (documented 2026-05-23 NIGHT_RUN Track 1):
-- An order's status (quote→active) is ONLY advanced by recompute_order_status_fn,
-- which fires when a sub_order's state changes. The first paid payment alone does
-- NOT advance orders.status. The lifecycle trigger F-A-1 advances customers.lifecycle_stage
-- on first paid payment; orders.status remains 'quote' until a sub_order child exists.
-- This is the intentional design from Brief §3 — pick one mechanism per concern.
```

---

## 10. Dependencies / Preconditions

- M5/M6/M7/M8 SCHEMA SPECs closed 🟢 (verified).
- `allocate_tenant_number(uuid, text) → bigint` available.
- `customers.lifecycle_stage` enum has 'prospect' + 'active' values (verified).
- `payment_events_queue` table exists with columns tenant_id, payment_id, order_id, customer_id, event_kind, consumed_at (verified).
- No active SPEC running on same paths in another session.

---

## 11. Lessons Already Incorporated

| Source | Lesson | Applied |
|---|---|---|
| M8_SCHEMA P-AUTHOR-1 | Pattern P22 partial-unique idiom | F-D1 + F-D2 fixes codify the idiom; M9 inherits |
| Code Review §6 Q2 | Exception-trap option (a) silent-dedup | All event-emit fns wrap INSERT in try-catch |
| Strategic Review Q1 | F-A-1 trigger on payments not orders | Trigger lives on payments |
| Strategic Review Q2 | jsonb single-column over 12 flat | rx_snapshot_jsonb chosen |
| Strategic Review Q3 | 2-line trigger body change | WHEN clause on trigger def, not fn body |
| `JWT_VALIDATION_HEADER.sql` | Canonical Block A | All modified RPCs preserve Block A verbatim |

---

## 12. Pre-Merge Checklist

- [ ] All 22 §3 criteria pass
- [ ] Integrity Gate exit 0/2
- [ ] M1.5 paths clean
- [ ] 7 SPEC folder files written
- [ ] M7 db-schema.sql updated with F-A-2 invariant comment
- [ ] Module docs updated (M5+M7+M8 SESSION_CONTEXT/CHANGELOG references the cross-contract fix close)
- [ ] T-constants: no new tables; no shared.js change required
- [ ] Advisors clean (0 new HIGH/ERROR)
- [ ] No Prizma row writes
- [ ] Smoke 7/7 PASS

---

*End of M5_M8_CROSS_CONTRACT_FIXES SPEC. After 🟢, Track 3 opens.*
