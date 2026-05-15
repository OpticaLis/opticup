# SPEC — M1_LENS_PHASE_1B_GAP_CLOSURE

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman hat)
> **Authored on:** 2026-05-15 (evening)
> **Module:** 1 — Inventory Management (Lens phase)
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_GAP_CLOSURE_BRIEF.md`
> **Type:** Production-correctness hotfix bundle (3 HIGH gaps from `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` §4).
> **Pipeline mode:** Full Auto Pipeline (single chat, end-to-end).
> **Branch:** `develop`. Daniel-only merge to main after 🟢.
> **Supersedes:** 3 draft Briefs + 1 superseded SPEC stub (see §6 Destructive Operations).

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-15. All 8 Brief §8 Pre-Flight probes executed live against Supabase project `tsxrrxzmdxaenlvocyit` BEFORE drafting this SPEC. Several Brief assumptions were falsified; the SPEC is written against DB+repo reality, not Brief's literal claims.

### 0.A — Probe results (canonical reference for §1.5 below)

| # | Probe | Brief assumed | Live DB result | Status |
|---|---|---|---|---|
| P1 | `stock_movement_exactly_one_source` CHECK | exists | CONFIRMED — requires exactly one of (sale_order_id, customer_return_id, purchase_receipt_id, transfer_id, adjustment_id) NOT NULL | ✅ matches |
| P2 | `stock_lot.variant_id` is NOT NULL | NOT NULL | CONFIRMED — `uuid NOT NULL` | ✅ matches |
| P3 | `purchase_order_line.qty_received` exists, integer | yes | CONFIRMED — `integer NOT NULL DEFAULT 0`. `qty_ordered integer NOT NULL` also present | ✅ matches |
| P4 | `purchase_receipt_line.ordered_qty + discrepancy_qty` exist (Phase 1A) | yes | CONFIRMED — both `integer nullable`. Also: `is_manual_addition boolean NOT NULL`, `variant_id uuid NOT NULL`, `discrepancy_reason text nullable`, `discrepancy_status text nullable` ✅ on `purchase_receipt`. **NO `source` column** (Brief §3.2 mentions it; doesn't exist) | ⚠ Brief mention of `source` is wrong |
| P5 | `record_adjustment_found` RPC exists | yes (Phase 1A) — verify pattern | CONFIRMED EXISTS. Signature: `(p_tenant_id, p_variant_id, p_location_id, p_qty_found, p_reason text DEFAULT NULL, p_performed_by uuid DEFAULT NULL, p_sph numeric DEFAULT NULL, p_cyl numeric DEFAULT NULL, p_add_value numeric DEFAULT NULL)`. SECDEF + JWT-claim tenant validation + REVOKE pattern ✅ canonical. **BUT** uses free-text `p_reason`, NOT FK to a `stock_adjustment_reason` config table. Passes `v_lot_id` as `p_adjustment_id` to `record_stock_movement` (hack — re-uses stock_lot.id to satisfy `exactly_one_source` since `stock_adjustment` table doesn't exist yet) | ⚠ canonical security ✅ but reason-pattern divergent |
| P6 | `stock_adjustment` + `stock_adjustment_reason` do NOT exist | both absent | CONFIRMED — `to_regclass` returns NULL for both | ✅ matches |
| P7 | `inventory.adjust.*` permission keys may already exist | uncertain | **CRITICAL DIVERGENCE** — `lens.inventory.adjust` ALREADY EXISTS on both tenants (seeded by `M1_LENS_PHASE_1B_PROCUREMENT`) and is wired to ceo+manager (4 role_permissions rows total: 2 per tenant). Brief's proposed `inventory.adjust.lost` + `inventory.adjust.reason.manage` are NEW keys that would DUPLICATE the existing one (Iron Rule 21 violation) | ⚠ Brief's new keys would violate Rule 21 |
| P8 | `purchase_order.status` text CHECK with allowed values | text with CHECK | CONFIRMED — `text` column with `CHECK (status IN ('draft','sent','partial','fully_received','cancelled'))`. Matches Brief F-1 transition targets | ✅ matches |
| P9a | `stock_movement.movement_type` CHECK allows `'adjustment_lost'` | not specified | CONFIRMED — CHECK allows: 'sale','receipt','transfer_out','transfer_in','adjustment_found','adjustment_lost','customer_return'. **`adjustment_lost` already pre-declared** — no schema change needed there | ✅ ready |
| P9b | `stock_movement.adjustment_id` column exists | not specified | CONFIRMED — `uuid nullable`. NO existing FK constraint targeting any adjustment table. Existing `adjustment_found` rows store `stock_lot.id` here (hack from `_found` RPC body). Adding a FK now would violate those existing rows — defer FK to a TECH_DEBT harmonization SPEC | ⚠ FK not addable in this SPEC |
| P10a | `m1_create_receipt_from_box` body | Brief F-1 describes the gaps | CONFIRMED — body inserts stock_lot + receipt_line + stock_movement + computes VAT + creates supplier_debt, but **does NOT** touch `purchase_order_line.qty_received`, **does NOT** recompute `purchase_order.status`, **does NOT** populate `purchase_receipt_line.ordered_qty`/`discrepancy_qty`, **does NOT** set `purchase_receipt.discrepancy_status`. Has JWT-claim tenant guard ✅. Pseudo-bug: the P4 `is_manual_addition` boolean is NOT in the K2's input-JSON handling (lines are inserted unconditionally; current JS-side filter is the only protection) | ✅ F-1 confirmed |
| P11 | `tenant_lens_stock.quantity_on_hand` vs `qty_on_hand` | Brief says `quantity_on_hand` | **DIVERGENCE** — column is named `qty_on_hand`. Brief's `quantity_on_hand` is a misnomer | ⚠ use `qty_on_hand` |

### 0.B — Pinned baseline values (live, 2026-05-15)

| Symbol | Value | Source query |
|---|---|---|
| `BASE_PRIZMA_LENS_TABLES_ROWS` | **0** across all 8 lens-related tables (`stock_movement, stock_lot, tenant_lens_stock, purchase_order, purchase_order_line, purchase_receipt, purchase_receipt_line, supplier_debt`) on prizma | Probe 17 — delta-zero criterion for F-12 |
| `BASE_DEMO_PO` | 5 rows on demo | Probe 18 — POs survive from M1B0+Procurement Pipelines |
| `BASE_DEMO_PO_LINE` | 9 | Probe 18 |
| `BASE_DEMO_RECEIPT` | 6 | Probe 18 |
| `BASE_DEMO_RECEIPT_LINE` | 7 | Probe 18 |
| `BASE_DEMO_STOCK_LOT` | 10 | Probe 18 |
| `BASE_DEMO_TLS` | 6 | Probe 18 — `tenant_lens_stock` (column is `qty_on_hand`) |
| `BASE_DEMO_SUPPLIER_DEBT` | 3 | Probe 18 |
| `BASE_PERMS_LENS_ADJUST_ROLES` | 2 per tenant × 2 tenants = 4 role_permissions rows (`ceo, manager`) | Probe 16 — Iron Rule 21: REUSE this key, do NOT create new ones |
| `EXPECTED_NEW_TABLES` | 2 — `stock_adjustment`, `stock_adjustment_reason` | §2.3 |
| `EXPECTED_NEW_RPC` | 1 — `record_adjustment_lost` | §2.3 |
| `EXPECTED_ALTER_TABLE` | 1 — `purchase_receipt_line.variant_id` DROP NOT NULL (§1.5 D2) | §2.2 |
| `EXPECTED_REPLACE_RPC` | 1 — `m1_create_receipt_from_box` CREATE OR REPLACE (extends body for F-1) | §2.1 |
| `EXPECTED_NEW_REASON_ROWS` | 4 per tenant × 2 tenants = **8 stock_adjustment_reason rows** | §2.3 |
| `BASE_SMOKE_PASS` | 7/7 (Auth + RLS + CRM + Storefront baseline per project standard) — must remain 7/7 post-Pipeline | §3 SC #11 |

### 0.C — Runtime semantics rehearsal (DB-touching SPEC — per skill §1.5.3)

For each new function header / validation block, the following test cases were rehearsed BEFORE SPEC seal:

**`record_adjustment_lost` JWT-claim header (Block A from `JWT_VALIDATION_HEADER.sql`):**
- (a) anon caller (no JWT, no tenant_id claim) → `v_jwt_tenant := NULL` → `v_jwt_tenant IS DISTINCT FROM p_tenant_id` is TRUE → RAISE 42501. ✅
- (b) authenticated wrong-tenant caller (JWT has `tenant_id='prizma'`, but `p_tenant_id='demo'`) → `v_jwt_tenant != p_tenant_id` → IS DISTINCT FROM TRUE → RAISE 42501. ✅
- (c) service_role bypass — `auth.role()='service_role'` → bypass tenant check, proceed. ✅
- (d) NULL-comparison trap: rehearsed — using `IS DISTINCT FROM` (not `!=`) means `NULL IS DISTINCT FROM <uuid>` evaluates TRUE → guard fires correctly. ✅

**`stock_adjustment_reason.code` UNIQUE constraint:**
- Tenant-scoped UNIQUE per Iron Rule 18: `UNIQUE (tenant_id, code)`. Demo + Prizma each seed `'lost', 'damaged', 'count_correction_negative', 'count_correction_positive'` without cross-tenant collision. ✅

**`stock_adjustment_reason` RLS read-side for `record_adjustment_lost` SECDEF body:**
- SECDEF executes as table owner (bypasses RLS) → reason lookup works without exposing other tenants. ✅
- Anon SELECT on the table → tenant_isolation policy fires → returns 0 rows. ✅

**`stock_movement_exactly_one_source` CHECK after `_lost` body:**
- New `_lost` body inserts `stock_adjustment` row → uses returned `adjustment_id` → passes to `record_stock_movement(..., p_adjustment_id := <real_uuid>)` → CHECK passes (exactly one of 5 source IDs is NOT NULL). ✅

**`m1_create_receipt_from_box` extension (F-1+F-2 combined):**
- Variant-less line (`is_manual_addition=true`, variant_id absent in JSON line): SKIP stock_lot insert, SKIP stock_movement insert. INSERT purchase_receipt_line with `variant_id=NULL`. ⚠ This requires `purchase_receipt_line.variant_id` to be nullable (P4 says it's NOT NULL today) → ALTER TABLE in Block 1.
- After all lines processed: GROUP BY po_line_id (for lines with `po_line_id` present in JSON) → UPDATE `purchase_order_line.qty_received += sum(receipt_line.qty_received)`. Edge case: if JSON line has no `po_line_id` (manual line or unlinked receipt), skip the PO update.
- After PO line updates: recompute `purchase_order.status` per algorithm in §2.1.
- Populate `purchase_receipt_line.ordered_qty` from JSON line (when provided) and compute `discrepancy_qty = ordered_qty - qty_received`.
- Aggregate `purchase_receipt.discrepancy_status` (`'none'|'short'|'over'|'mixed'`) across all this receipt's lines.

Runtime semantics rehearsed: yes — evidence above + Block A canonical header from `.claude/skills/opticup-strategic/references/JWT_VALIDATION_HEADER.sql` (cited, not inlined).

### 0.D — Status-column semantics probe (per skill §1.5.3, added 2026-05-15 from SECURITY_HOTFIX_3)

This SPEC does not introduce RLS policies filtering by status. It does query `purchase_order.status` in a function body (not in a policy). Probe done anyway:
- `purchase_order.status` distinct values on demo: `'draft'` (3 rows), `'sent'` (1), `'cancelled'` (1) — `'partial'` and `'fully_received'` have 0 rows (no Procurement Pipeline ever completed a multi-receipt PO → expected). After F-1 ships, smoke step F1.A will produce the first `'partial'` row; smoke F1.B will produce the first `'fully_received'`. ✅ semantics confirmed.

### 0.E — Cross-Reference Check (Rule 21 enforcement at author time)

| New name | Grep target | Result | Resolution |
|---|---|---|---|
| `stock_adjustment` table | `docs/GLOBAL_SCHEMA.sql`, `to_regclass` | NOT FOUND | Genuinely new ✅ |
| `stock_adjustment_reason` table | same | NOT FOUND | Genuinely new ✅ |
| `record_adjustment_lost` function | `pg_proc`, `docs/GLOBAL_MAP.md` | NOT FOUND | Genuinely new ✅ |
| `inventory.adjust.lost` permission | `permissions.id` | NOT FOUND | **REJECTED** — Iron Rule 21: `lens.inventory.adjust` exists and serves the same purpose. SPEC REUSES the existing key (see §1.5 D5) |
| `inventory.adjust.reason.manage` permission | `permissions.id` | NOT FOUND | **DROPPED** — settings UI explicitly out-of-scope per Brief §3.4; deferred to F-07 SPEC. No need to seed a key today |
| `source` column on `purchase_receipt_line` | `information_schema.columns` | NOT FOUND | **REJECTED** — Iron Rule 21: `is_manual_addition` boolean already exists as the discriminator. Brief's mention of `source` was incorrect; do NOT add a redundant column (see §1.5 D3) |

Cross-Reference Check completed 2026-05-15 against live DB rev: 0 unresolved collisions / 3 hits resolved (2 Brief misstatements rejected → no schema add; 1 existing permission key reused per Rule 21). No collisions remaining.

---

## 1. Goal

Close the 3 HIGH foundational gaps from `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` §4 (F-1 K2 completion, F-2 variant-less manual lines, F-3 stock-adjustment infrastructure) in one bundled Pipeline, so Module 1 Lens reaches production-correctness and M7 build is unblocked.

After this SPEC ships 🟢:
- Active POs List shows status transitions `sent → partial → fully_received` correctly.
- Reconciliation Agent foundation has writer feeding `discrepancy_qty`.
- Bonus / sample / out-of-catalog items can enter goods-receipts.
- ➖ inventory-adjust button performs an atomic PIN-verified RPC (Iron Rule 1 satisfied).
- 3 superseded draft Briefs + 1 superseded SPEC stub are marked `STATUS: SUPERSEDED by M1_LENS_PHASE_1B_GAP_CLOSURE (2026-05-15)`.

---

## 1.5 Pre-Flight Findings — Brief-vs-Reality Divergences

The §0 probes surfaced 5 divergences from the Brief's literal claims. Each is resolved here per the protocols in skill §1.5; the SPEC body below is written against the resolved reality, not against the Brief's literal text. None of these rise to escalation level — they are mechanical Brief-amendments in service of the Brief's clear intent.

### D1 — Brief misstates `tenant_lens_stock.quantity_on_hand`

**Reality:** column is named `qty_on_hand`. **Resolution:** SPEC body uses `qty_on_hand` throughout. F-3 §2.3 atomic decrement reads `qty_on_hand = qty_on_hand - p_qty_lost`.

### D2 — Brief's F-2 requires nullable `purchase_receipt_line.variant_id`, but column is NOT NULL today

**Brief §3.2 step 2 says:** "insert the `purchase_receipt_line` row (with `variant_id = NULL`, `source = 'manual'`)."

**Reality:** `purchase_receipt_line.variant_id` is `uuid NOT NULL` (Probe 4). To fulfill Brief's intent, the column must be made nullable.

**Resolution:** SPEC Block 1 includes:
```sql
ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id DROP NOT NULL;
```

This operation is NOT in Brief §6 §Destructive Operations prohibited list (relaxing NOT NULL is additive — no data lost, no policy dropped, no column dropped, no table dropped). All existing rows have `variant_id IS NOT NULL` so the relaxation does not break them; future variant-less manual lines insert with NULL. The same physical column continues to FK to `lens_variant.id` when present.

### D3 — Brief mentions `source = 'manual'` column, but no such column exists

**Brief §3.2 step 2 says:** "insert the `purchase_receipt_line` row (with `variant_id = NULL`, `source = 'manual'`)."

**Reality:** `purchase_receipt_line.source` does NOT exist (Probe 4 full column list). But `is_manual_addition boolean NOT NULL` DOES exist and is semantically the same discriminator.

**Resolution:** REJECTED add of `source` column. SPEC uses the existing `is_manual_addition` boolean (already in schema since Phase 1A). The K2 body's F-2 branch is governed by `(line_json->>'is_manual_addition')::boolean = true`. Iron Rule 21 — no duplicate discriminator.

### D4 — Brief proposes new permission keys `inventory.adjust.lost` + `inventory.adjust.reason.manage`

**Brief §3.5 says:** Two new permission keys, seeded to admin + branch_manager.

**Reality:** `lens.inventory.adjust` (Hebrew: "התאמת מלאי (PIN)") ALREADY EXISTS on both tenants (seeded by `M1_LENS_PHASE_1B_PROCUREMENT`'s §0.D permission triplet) and is wired to ceo+manager on demo+prizma. 4 role_permissions rows already in place.

**Resolution:** REUSE existing `lens.inventory.adjust` for the ➖ RPC gating. DROP the proposed `inventory.adjust.reason.manage` (settings UI explicitly deferred per Brief §3.4). Iron Rule 21 — extend, don't duplicate. Zero new permissions inserted, zero new role_permissions inserted. The §2.4 UI uses `hasPermission('lens.inventory.adjust')` as the gate.

### D5 — `record_adjustment_found` body uses free-text reason + lot_id hack (vs Brief's FK pattern)

**Brief §3.3 note:** "an `_found` RPC already exists (Phase 1A). Verify it follows the same pattern — if not, fix it inline. If it does, leave it."

**Reality:** `_found` follows the **canonical security pattern** (SECDEF + JWT-claim guard + REVOKE — Probe 5). BUT it uses `p_reason text` (free-text) and passes `v_lot_id` as `p_adjustment_id` to `record_stock_movement` — a hack to satisfy `exactly_one_source` because `stock_adjustment` doesn't exist yet.

**Resolution:** LEAVE `_found` AS-IS per Brief §3.3 literal directive ("if it does [follow canonical pattern], leave it"). The new `_lost` RPC follows the **new** pattern (FK to `stock_adjustment_reason`, real `stock_adjustment` row, real `adjustment_id`). This creates an asymmetry between `_found` (free-text) and `_lost` (FK), which is filed as a Finding for a follow-up `M1_LENS_ADJUSTMENT_RPC_HARMONIZATION` SPEC. Asymmetry is acceptable because: (a) Brief is explicit; (b) retrofitting `_found` requires data backfill (existing `adjustment_found` stock_movement rows have stock_lot.id sitting in `adjustment_id` — a clean retrofit needs migration), and that is broader scope than this gap-closure SPEC.

---

## 2. Scope — Implementation

### 2.1 F-1: K2 receipt completion (`m1_create_receipt_from_box` body extension)

CREATE OR REPLACE `m1_create_receipt_from_box` with extended body that does the additional work AFTER the existing happy-path logic completes:

**New behavior (additive — preserves the existing happy path):**

After the existing FOR-loop over `p_lines`:

1. **Update `purchase_order_line.qty_received`** — for each line in `p_lines` that has `po_line_id` present (non-null in JSON):
   ```sql
   UPDATE purchase_order_line
      SET qty_received = qty_received + <line.qty_received>,
          updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND id = <line.po_line_id>;
   ```
2. **Populate `purchase_receipt_line.ordered_qty`** — at INSERT time (inside the FOR-loop, in Block 2 extension), copy `(line_json->>'ordered_qty')::int` into the new column.
3. **Compute `purchase_receipt_line.discrepancy_qty`** — at INSERT time: `ordered_qty - qty_received`. Positive = short. Negative = over (overrecedipt). Zero = exact.
4. **Recompute `purchase_order.status`** — for each distinct `po_id` touched by this receipt:
   ```sql
   WITH agg AS (
     SELECT po_id,
            bool_and(qty_received >= qty_ordered) AS all_full,
            bool_or(qty_received > 0)             AS any_received,
            bool_and(qty_received = 0)            AS all_zero
       FROM purchase_order_line
      WHERE tenant_id = p_tenant_id AND po_id IN (<distinct_po_ids>)
      GROUP BY po_id
   )
   UPDATE purchase_order po
      SET status = CASE
                     WHEN agg.all_full              THEN 'fully_received'
                     WHEN agg.any_received          THEN 'partial'
                     ELSE                                 po.status  -- defensive no-op
                   END,
          updated_at = now()
     FROM agg
    WHERE po.id = agg.po_id
      AND po.tenant_id = p_tenant_id
      AND po.status IN ('sent','partial');  -- never transition from cancelled/draft/fully_received
   ```
5. **Aggregate `purchase_receipt.discrepancy_status`** — after the FOR-loop, compute across this receipt's lines:
   ```sql
   UPDATE purchase_receipt pr
      SET discrepancy_status = CASE
            WHEN agg.has_short AND agg.has_over THEN 'mixed'
            WHEN agg.has_short                  THEN 'short'
            WHEN agg.has_over                   THEN 'over'
            ELSE                                     'none'
          END,
          updated_at = now()
     FROM (
       SELECT bool_or(discrepancy_qty > 0) AS has_short,
              bool_or(discrepancy_qty < 0) AS has_over
         FROM purchase_receipt_line
        WHERE tenant_id = p_tenant_id AND receipt_id = v_receipt_id
     ) agg
    WHERE pr.id = v_receipt_id AND pr.tenant_id = p_tenant_id;
   ```

**Preservation:** the existing supplier_debt-creation flow (D-M1-11) at the end of the body stays intact. Subtotal + VAT + total computation unchanged.

### 2.2 F-2: Variant-less manual receipt lines

**Block 1 DDL (additive):**

```sql
ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id DROP NOT NULL;
```

(Rationale + Iron Rule 32 compliance: see §1.5 D2.)

**K2 body branch (inside the FOR-loop):**

```sql
v_is_manual := COALESCE((v_line->>'is_manual_addition')::boolean, false);
v_variant   := NULLIF(v_line->>'variant_id','')::uuid;

IF v_is_manual AND v_variant IS NULL THEN
  -- variant-less manual line: bonus / sample / out-of-catalog item.
  -- Insert receipt_line ONLY (no stock_lot, no stock_movement, no tenant_lens_stock impact).
  -- The cost still contributes to receipt.total_amount + supplier_debt.
  INSERT INTO purchase_receipt_line(
    tenant_id, receipt_id, variant_id, location_id,
    qty_received, unit_cost, unit_cost_currency,
    ordered_qty, discrepancy_qty,
    is_manual_addition, notes
  ) VALUES (
    p_tenant_id, v_receipt_id, NULL, (v_line->>'location_id')::uuid,
    (v_line->>'qty_received')::int, (v_line->>'unit_cost')::numeric, COALESCE(v_line->>'unit_cost_currency','ILS'),
    NULLIF(v_line->>'ordered_qty','')::int,
    -- discrepancy_qty: for variant-less lines, ordered_qty is typically NULL → discrepancy NULL
    CASE WHEN NULLIF(v_line->>'ordered_qty','') IS NOT NULL
         THEN (v_line->>'ordered_qty')::int - (v_line->>'qty_received')::int
         ELSE NULL END,
    true, NULLIF(v_line->>'notes','')
  );
  -- subtotal accumulator still includes this line (cost flows to supplier_debt)
  v_subtotal := v_subtotal + ((v_line->>'qty_received')::numeric * (v_line->>'unit_cost')::numeric);
  CONTINUE;  -- skip the stock_lot/stock_movement/receipt_line insert path
END IF;

-- existing happy path for variant-present lines unchanged
-- (insert stock_lot, insert purchase_receipt_line, call record_stock_movement, accumulate subtotal)
```

**JS-side change:** the Procurement Pipeline added a client-side filter dropping variant-less manual lines before submission. This SPEC removes that filter and lets K2 handle the branch authoritatively.

### 2.3 F-3: Stock-adjustment infrastructure

**Block 1 DDL — two new tables + RLS pair each + per-tenant seed:**

**Table `stock_adjustment_reason` (Pattern P19 config table — Iron Rule 19):**

```sql
CREATE TABLE stock_adjustment_reason (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code       text NOT NULL,
  name_he    text NOT NULL,
  name_en    text NOT NULL,
  direction  smallint NOT NULL CHECK (direction IN (-1, 1)),
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_adj_reason_tenant_code UNIQUE (tenant_id, code)
);

ALTER TABLE stock_adjustment_reason ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON stock_adjustment_reason TO service_role USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation ON stock_adjustment_reason TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX idx_stock_adj_reason_tenant ON stock_adjustment_reason(tenant_id) WHERE is_active = true;
```

**Day-1 seed — 4 reasons × 2 tenants = 8 rows:**

```sql
INSERT INTO stock_adjustment_reason (tenant_id, code, name_he, name_en, direction, sort_order)
SELECT t.id, r.code, r.name_he, r.name_en, r.direction, r.sort_order
  FROM tenants t
 CROSS JOIN (VALUES
    ('lost',                      'אבדן',                 'Lost',                       -1, 1),
    ('damaged',                   'שבר/נזק',             'Damaged',                    -1, 2),
    ('count_correction_negative', 'תיקון ספירה (חיסור)',  'Count correction (down)',    -1, 3),
    ('count_correction_positive', 'תיקון ספירה (תוספת)',  'Count correction (up)',      +1, 4)
 ) r(code, name_he, name_en, direction, sort_order)
 WHERE t.slug IN ('demo','prizma')
 ON CONFLICT (tenant_id, code) DO NOTHING;
```

**Table `stock_adjustment` (Iron Rules 14 + 15):**

```sql
CREATE TABLE stock_adjustment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  reason_id     uuid NOT NULL REFERENCES stock_adjustment_reason(id) ON DELETE RESTRICT,
  variant_id    uuid NOT NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  stock_lot_id  uuid REFERENCES stock_lot(id) ON DELETE RESTRICT,  -- nullable to allow lot-less adjustments
  qty_delta     integer NOT NULL CHECK (qty_delta <> 0),  -- signed; negative for lost/damaged, positive for found
  notes         text,
  performed_by  uuid REFERENCES employees(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_adjustment ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON stock_adjustment TO service_role USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation ON stock_adjustment TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

CREATE INDEX idx_stock_adj_tenant_variant ON stock_adjustment(tenant_id, variant_id);
CREATE INDEX idx_stock_adj_tenant_lot     ON stock_adjustment(tenant_id, stock_lot_id) WHERE stock_lot_id IS NOT NULL;
```

(No FK from `stock_movement.adjustment_id → stock_adjustment.id` in this SPEC — see Probe P9b: existing `adjustment_found` rows store stock_lot.id in that column and would violate. Defer FK to harmonization SPEC.)

**Block 2 — RPC `record_adjustment_lost`** (signature aligned with `_found` per Pattern P10 sibling consistency, plus the new `reason_id` FK + `lot_id`):

```sql
CREATE OR REPLACE FUNCTION public.record_adjustment_lost(
  p_tenant_id    uuid,
  p_variant_id   uuid,
  p_location_id  uuid,
  p_lot_id       uuid,
  p_qty_lost     integer,
  p_reason_id    uuid,
  p_performed_by uuid DEFAULT NULL,
  p_notes        text DEFAULT NULL,
  p_sph          numeric DEFAULT NULL,
  p_cyl          numeric DEFAULT NULL,
  p_add_value    numeric DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_jwt_tenant     uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'),'')::uuid;
  v_adjustment_id  uuid;
  v_movement_id    uuid;
  v_unit_cost      numeric(12,4);
  v_reason_dir     smallint;
  v_lot_remaining  integer;
BEGIN
  -- Block A: JWT-claim tenant guard (service_role bypass + strict IS DISTINCT FROM)
  IF auth.role() <> 'service_role' THEN
    IF v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Block B: input validation
  IF p_qty_lost <= 0 THEN
    RAISE EXCEPTION 'p_qty_lost must be positive' USING ERRCODE = 'P0001';
  END IF;

  SELECT direction INTO v_reason_dir
    FROM stock_adjustment_reason
   WHERE id = p_reason_id AND tenant_id = p_tenant_id AND is_active = true;
  IF v_reason_dir IS NULL THEN
    RAISE EXCEPTION 'reason_id not active or wrong tenant' USING ERRCODE = '23503';
  END IF;
  IF v_reason_dir <> -1 THEN
    RAISE EXCEPTION 'reason direction must be -1 for record_adjustment_lost' USING ERRCODE = 'P0001';
  END IF;

  -- Block C: lot guards
  SELECT qty_remaining, unit_cost
    INTO v_lot_remaining, v_unit_cost
    FROM stock_lot
   WHERE id = p_lot_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_lot_remaining IS NULL THEN
    RAISE EXCEPTION 'lot not found' USING ERRCODE = '23503';
  END IF;
  IF v_lot_remaining < p_qty_lost THEN
    RAISE EXCEPTION 'insufficient lot qty_remaining (have %, need %)', v_lot_remaining, p_qty_lost USING ERRCODE = 'P0001';
  END IF;

  -- Block D: atomic body
  INSERT INTO stock_adjustment(
    tenant_id, reason_id, variant_id, location_id, stock_lot_id, qty_delta, notes, performed_by
  ) VALUES (
    p_tenant_id, p_reason_id, p_variant_id, p_location_id, p_lot_id, -p_qty_lost, p_notes, p_performed_by
  ) RETURNING id INTO v_adjustment_id;

  v_movement_id := record_stock_movement(
    p_tenant_id, p_lot_id, p_variant_id, p_location_id,
    'adjustment_lost', -p_qty_lost,
    NULL, NULL, NULL, NULL, v_adjustment_id,
    v_unit_cost, NULL, NULL,
    p_performed_by, p_notes,
    p_sph, p_cyl, p_add_value
  );

  -- Block E: atomic stock decrement (Iron Rule 1 — never read-then-write)
  UPDATE stock_lot
     SET qty_remaining = qty_remaining - p_qty_lost,
         updated_at = now()
   WHERE id = p_lot_id AND tenant_id = p_tenant_id;

  UPDATE tenant_lens_stock
     SET qty_on_hand = qty_on_hand - p_qty_lost,
         updated_at = now()
   WHERE tenant_id = p_tenant_id
     AND variant_id = p_variant_id
     AND location_id = p_location_id
     -- match the sph/cyl/add tuple for the TLS row (NULL-safe via IS NOT DISTINCT FROM)
     AND sph IS NOT DISTINCT FROM COALESCE(p_sph, (SELECT sph FROM stock_lot WHERE id = p_lot_id))
     AND cyl IS NOT DISTINCT FROM COALESCE(p_cyl, NULL)
     AND add_value IS NOT DISTINCT FROM COALESCE(p_add_value, NULL);

  RETURN v_adjustment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) TO authenticated;
```

**Note on stock_lot.sph for TLS matching:** TLS row is keyed by (tenant_id, variant_id, location_id, sph, cyl, add_value) where sph is NOT NULL and cyl/add_value are nullable. The lot also stores sph. For lot-anchored adjustments, we lookup the lot's sph and match against TLS that way. The `IS NOT DISTINCT FROM` operator handles NULL-vs-NULL comparison properly.

### 2.4 UI wiring

#### 2.4.1 Inventory screen ➖ button (`modules/lens-inventory/lens-inventory-modals.js`)

Replace the Phase 2 toast with a real call to `record_adjustment_lost`:

1. Show modal: "כמה יחידות לאבדן?" + qty input + reason picker (4 options from `stock_adjustment_reason` table for current tenant) + notes textarea.
2. On submit: PIN modal (existing pattern from `modules/lens-inventory/lens-inventory-pin.js` if present, else from `js/shared.js:promptPin`).
3. RPC call:
   ```js
   const { data, error } = await sb.rpc('record_adjustment_lost', {
     p_tenant_id: getTenantId(),
     p_variant_id: row.variant_id,
     p_location_id: row.location_id,
     p_lot_id: pickedLotId,  // FIFO oldest lot with sufficient qty_remaining
     p_qty_lost: qty,
     p_reason_id: reasonId,
     p_performed_by: getCurrentEmployeeId(),
     p_notes: notesValue || null,
     p_sph: row.sph,  // lens TLS key component
     p_cyl: row.cyl,
     p_add_value: row.add_value
   });
   ```
4. Lot picker = FIFO oldest lot with sufficient `qty_remaining` (read from existing lot pane fetch). If a single lot has insufficient qty but the variant has more in other lots, show one row at a time (the user can issue multiple adjustments — out of scope to bundle).
5. On success: toast "מלאי עודכן" + writeLog audit row + refresh grid.

#### 2.4.2 Active POs List — verify status pipeline

No JS changes required. The existing screen already reads `purchase_order.status`. After F-1 ships, the column now transitions correctly. Smoke step F1.A asserts the UI displays `partial` and F1.B asserts `fully_received`.

#### 2.4.3 Goods Receipt manual-add banner — remove client-side filter

`modules/lens-goods-receipt/*.js` currently filters variant-less manual lines before K2 submission (Procurement Pipeline's stopgap from `D-2`). Remove the filter (one if-block, identified at execution time via Grep for `is_manual_addition` in that folder). K2 now handles variant-less lines authoritatively.

### 2.5 Permissions

**Zero new permission rows. Zero new role_permissions rows.** Per §1.5 D4, the existing `lens.inventory.adjust` key (ceo+manager × 2 tenants = 4 role_permissions rows) is reused. The settings UI for `stock_adjustment_reason` management is explicitly out-of-scope per Brief §3.4 — no permission key needed.

### 2.6 Retirement markers (per Brief §6 + Iron Rule 21)

Append a single header line to each of these 4 files:

```
> **STATUS: SUPERSEDED by `M1_LENS_PHASE_1B_GAP_CLOSURE` (2026-05-15).** See `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` for the closing SPEC.
```

Files:
1. `modules/Module 1 - Inventory Management/architecture-brief/M1_K2_RECEIPT_COMPLETION_BRIEF.md` (draft Brief from Procurement findings)
2. `modules/Module 1 - Inventory Management/architecture-brief/M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md` (draft Brief)
3. `modules/Module 1 - Inventory Management/architecture-brief/M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md` (draft Brief)
4. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` (superseded SPEC stub per audit F-02)

Content-only edits (no `git rm`). Files stay on disk for historical reference.

---

## 3. Success Criteria — 14 measurable, mapped 1:1 to Brief §7

### Functional

**SC #1 — F-1 verification (multi-line partial receipt)**

Create a PO with 3 lines (qty_ordered=3 each). Receive 2 of line A + 0 of line B + 3 of line C in one receipt via K2.

| Sub-criterion | Expected | Verify |
|---|---|---|
| 1a | `purchase_order_line.qty_received` = `[2, 0, 3]` for the 3 lines | `SELECT qty_ordered, qty_received FROM purchase_order_line WHERE po_id=$po ORDER BY id` |
| 1b | `purchase_order.status` = `'partial'` | `SELECT status FROM purchase_order WHERE id=$po` |
| 1c | `purchase_receipt_line.ordered_qty` populated correctly: `[3, 3, 3]` | `SELECT ordered_qty FROM purchase_receipt_line WHERE receipt_id=$receipt ORDER BY id` |
| 1d | `purchase_receipt_line.discrepancy_qty` = `[1, 3, 0]` | same |
| 1e | `purchase_receipt.discrepancy_status` = `'short'` | `SELECT discrepancy_status FROM purchase_receipt WHERE id=$receipt` |

**SC #2 — F-1 continuation (completion receipt)**

A second receipt completes the remaining qty (line A +1, line B +3, line C +0).

| Sub-criterion | Expected | Verify |
|---|---|---|
| 2a | `purchase_order.status` = `'fully_received'` | `SELECT status FROM purchase_order WHERE id=$po` |
| 2b | All 3 PO lines `qty_received = qty_ordered` | `SELECT bool_and(qty_received >= qty_ordered) FROM purchase_order_line WHERE po_id=$po` returns `true` |

**SC #3 — F-2 verification (variant-less manual line)**

Submit a goods-receipt with one variant-less line: `is_manual_addition=true`, `variant_id=null`, qty=5, unit_cost=10.

| Sub-criterion | Expected | Verify |
|---|---|---|
| 3a | K2 returns success (no 23502) | `SELECT m1_create_receipt_from_box(...)` returns uuid |
| 3b | `purchase_receipt_line` row created with `variant_id IS NULL`, `is_manual_addition=true` | `SELECT count(*) FROM purchase_receipt_line WHERE receipt_id=$r AND variant_id IS NULL` = 1 |
| 3c | NO `stock_lot` row for this variantless line | `SELECT count(*) FROM stock_lot WHERE purchase_receipt_id=$r` = (count_of_variant_present_lines) |
| 3d | NO `stock_movement` row delta for this line | `SELECT count(*) FROM stock_movement WHERE purchase_receipt_id=$r` = (count_of_variant_present_lines) |
| 3e | `tenant_lens_stock` unchanged for this line (because no variant) | row count delta vs pre-call = 0 for variant-less |
| 3f | Receipt total cost INCLUDES this line + supplier_debt INCLUDES this line | `SELECT total_amount FROM supplier_debt WHERE receipt_id=$r` reflects (5×10×1.18) = 59.00 ILS + other lines |

**SC #4 — F-3 verification (➖ inventory adjust)**

Pick a demo variant with qty_remaining ≥ 10 in some lot. Call `record_adjustment_lost(p_qty_lost=2, p_reason_id=<damaged>)`.

| Sub-criterion | Expected | Verify |
|---|---|---|
| 4a | `stock_adjustment` row created | `SELECT count(*) FROM stock_adjustment WHERE variant_id=$v` ≥ 1 |
| 4b | `stock_movement` row with `adjustment_id` = new adjustment.id | `SELECT count(*) FROM stock_movement WHERE adjustment_id=$adj` = 1 |
| 4c | `stock_lot.qty_remaining` decremented by 2 atomically | `SELECT qty_remaining FROM stock_lot WHERE id=$lot` = (pre - 2) |
| 4d | `tenant_lens_stock.qty_on_hand` decremented by 2 atomically | `SELECT qty_on_hand FROM tenant_lens_stock WHERE …` = (pre - 2) |
| 4e | Toast "מלאי עודכן" shown on UI (Localhost-Tester verifies) | Chrome MCP screenshot or DOM assert |
| 4f | writeLog row exists | `SELECT count(*) FROM logs WHERE entity='lens_inventory' AND action='adjust_lost' AND created_at > $now` ≥ 1 (writeLog target table TBD by JS-side existing pattern) |

**SC #5 — Smoke matrix re-run**

The 3 Procurement-Pipeline smoke steps that previously failed (F-1, F-2, F-3 functional paths) now all pass. These map to SC #1, #3, #4 above.

**SC #6 — Cross-tenant isolation (RLS)**

From a demo-tenant JWT session, attempt to read Prizma's `stock_adjustment` rows:

```sql
SET LOCAL request.jwt.claims = '{"tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb","role":"authenticated"}';
SELECT count(*) FROM stock_adjustment WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- Expected: 0
```

Repeat for `stock_adjustment_reason`. Both must return 0 rows from cross-tenant query.

**SC #7 — No anon access on `record_adjustment_lost`**

```sql
SELECT proacl FROM pg_proc WHERE proname='record_adjustment_lost';
-- Expected: anon NOT present, authenticated present (or service_role only).
```

### Non-functional

**SC #8 — Iron Rule 31 (integrity gate)**

Every commit in the pipeline exits 0 on `node scripts/verify.mjs --staged`. No null-byte corruption, no mid-statement truncation. Run logged in each commit message.

**SC #9 — Smoke 7/7 PASS (baseline)**

Auth + RLS + CRM + Storefront baseline smoke matrix unchanged at 7/7 PASS at every commit boundary AND post-Pipeline. (Localhost-Tester re-runs.)

**SC #10 — Reviewer verdict**

🟢 PASS or 🟡 PASS WITH NOTES (notes must all be non-blocking).

**SC #11 — Localhost-Tester verdict**

🟢 GREEN. HTTP 200 on all 4 lens HTML pages (`lens-inventory.html`, `lens-pricing.html`, `lens-active-designs.html`, `lens-goods-receipt.html`). The 4th page name as it lives in repo today is to be confirmed at smoke time — Brief §10 wording is "all 4 LENS_* HTML pages". Tester also exercises F-1/F-2/F-3 paths functionally per §7.1-7.7 of the Brief.

**SC #12 — Prizma untouched**

Row-count delta = 0 on all 8 Prizma lens-related tables post-Pipeline vs `BASE_PRIZMA_LENS_TABLES_ROWS=0` baseline:

```sql
SELECT 'sm', count(*) FROM stock_movement WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'sl', count(*) FROM stock_lot WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'tls', count(*) FROM tenant_lens_stock WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'po', count(*) FROM purchase_order WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'pol', count(*) FROM purchase_order_line WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'pr', count(*) FROM purchase_receipt WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'prl', count(*) FROM purchase_receipt_line WHERE tenant_id='6ad0781b…'
UNION ALL SELECT 'sd', count(*) FROM supplier_debt WHERE tenant_id='6ad0781b…';
-- Expected: all 8 → n=0 (matches BASE)
```

Note: `stock_adjustment` and `stock_adjustment_reason` will have 0 Prizma writes from this SPEC's smoke (the seed inserts 4 reason rows on Prizma, but no `stock_adjustment` row). The 4 Prizma `stock_adjustment_reason` seed rows are NOT a "data write" in the audit sense — they are the Day-1 config seed Brief §3.3 mandates for both tenants. Documented as expected delta in SC #14.

**SC #13 — 3 Briefs + 1 SPEC stub marked SUPERSEDED**

`grep -c "STATUS: SUPERSEDED by .M1_LENS_PHASE_1B_GAP_CLOSURE."` across the 4 files returns ≥ 1 for each:

```bash
for f in \
  "modules/Module 1 - Inventory Management/architecture-brief/M1_K2_RECEIPT_COMPLETION_BRIEF.md" \
  "modules/Module 1 - Inventory Management/architecture-brief/M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md" \
  "modules/Module 1 - Inventory Management/architecture-brief/M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md" \
  "modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md"; do
  c=$(grep -c "STATUS: SUPERSEDED by .M1_LENS_PHASE_1B_GAP_CLOSURE." "$f")
  echo "$f: $c"
done
```

All 4 lines must show count ≥ 1.

**SC #14 — Day-1 seed of `stock_adjustment_reason`**

```sql
SELECT tenant_id, count(*) FROM stock_adjustment_reason GROUP BY tenant_id;
-- Expected: 2 rows: demo (4 reasons) + prizma (4 reasons) = 8 total
SELECT tenant_id, code, direction FROM stock_adjustment_reason WHERE tenant_id='8d8cfa7e…' ORDER BY sort_order;
-- Expected: 4 rows with codes [lost, damaged, count_correction_negative, count_correction_positive], directions [-1,-1,-1,+1]
```

(Bonus: Hebrew names appear in `name_he`.)

---

## 4. Destructive Operations

This SPEC declares the following destructive operations:

1. **Append SUPERSEDED header** to 4 governance files (§2.6). Content edit, not `git rm`. Files stay on disk.

**Everything else is additive or non-destructive:**

- `CREATE TABLE stock_adjustment` (additive)
- `CREATE TABLE stock_adjustment_reason` (additive)
- `CREATE POLICY` × 4 (2 per new table) (additive)
- `CREATE INDEX` × 3 (additive)
- `INSERT INTO stock_adjustment_reason ... ON CONFLICT DO NOTHING` (additive seed)
- `CREATE OR REPLACE FUNCTION record_adjustment_lost` (additive — function does not exist today)
- `CREATE OR REPLACE FUNCTION m1_create_receipt_from_box` (REPLACE of existing; canonical idempotent path, not in Brief §6 prohibited list)
- `REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated` on new RPC (additive ACL)
- `ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id DROP NOT NULL` (relaxation — NOT in Brief §6 prohibited list; not in Iron Rule 32 destructive enumeration)

**Explicitly prohibited (no SPEC operation may perform):**

- File deletes, mass renames, `git rebase`, `git reset --hard`, `git push --force`
- SQL `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP <object>`
- DML mass-delete without tenant_id-scoped WHERE
- CLAUDE.md / SKILL.md section deletions (not append-only)
- Main-branch modification (merge, push, rebase) — Daniel-only

If Executor encounters a need for any of the prohibited operations mid-run → STOP and write escalation file per Brief §10 escalation protocol.

---

## 5. Stop-on-Deviation Triggers (executor-specific)

Beyond CLAUDE.md §9 global triggers:

1. **Pre-Flight probe disagrees with §0.A** — if any §0.A row's "Live DB result" no longer matches at execution time, STOP.
2. **Any `ALTER TABLE ... DROP <object>` syntax** generated by any code path → STOP (out of declared scope).
3. **`stock_adjustment` or `stock_adjustment_reason` row written to Prizma at smoke time beyond the seed** → STOP. Seed creates 4 reason rows per tenant (the Day-1 config); NO `stock_adjustment` row should be inserted on Prizma during smoke.
4. **`m1_create_receipt_from_box` smoke regresses the existing happy path** — the 234.82 supplier-debt fixture from Procurement smoke must still work after CREATE OR REPLACE. If not, STOP.
5. **Reviewer or Localhost-Tester returns 🔴 verdict** → STOP, no SPEC close.
6. **`grep_count("SUPERSEDED by")` on the 4 retirement files < 4** at the close commit → STOP and re-apply.
7. **Permission rows changed** — if the seed accidentally adds rows to `permissions` or `role_permissions`, STOP (D4 mandate: zero new permission rows in this SPEC).
8. **Iron Rule 31 (`verify.mjs --staged`) exit ≠ 0** at any commit → STOP.
9. **Iron Rule 32 (`destructive-ops-declared.mjs`) exit ≠ 0** at any commit → STOP.
10. **Anything that touches `main` branch** → STOP. Develop-only.
11. **`record_adjustment_found` function body altered** → STOP. Per §1.5 D5, `_found` is LEFT AS-IS in this SPEC.

---

## 6. Out of Scope (explicit deferrals)

Brief §4 + §1.5 deferrals carried forward:

1. **No settings UI for `stock_adjustment_reason`** — seed only Day-1; settings panel deferred to F-07 SPEC.
2. **No FX conversion in `effective_price`** — Strategic Review F-10.
3. **No FK index additions on 21 tables** — `M1A_FK_INDEXES_PREP_FOR_1B` parallel SMALL SPEC.
4. **No D-M1-09 violation cleanup** — `M1_5_GOODS_RECEIPT_GENERIC_COMPONENT` later.
5. **No contact-lenses, no accessories, no M7 build start** — sequence per audit §4.2.
6. **No Module 1 Close Ceremony** — Cowork-Architect session, AFTER this SPEC ships 🟢.
7. **No retrofit of `record_adjustment_found` to use new `stock_adjustment_reason` FK pattern** — per §1.5 D5, deferred to `M1_LENS_ADJUSTMENT_RPC_HARMONIZATION` SPEC. The asymmetry between `_found` (free-text reason) and `_lost` (FK reason) is an acknowledged debt this SPEC chooses not to close.
8. **No FK from `stock_movement.adjustment_id → stock_adjustment.id`** — pre-existing `adjustment_found` rows store stock_lot.id there. Defer to harmonization SPEC.
9. **No new permission rows** — §1.5 D4: REUSE `lens.inventory.adjust`.
10. **No JS changes to foundation lens-inventory-grid.js** — Brief §3.4 says wire the ➖ button in `lens-inventory-modals.js`. Foundation grid file untouched (preserves SPEC `M1_LENS_PHASE_1B_FOUNDATION` close-state).
11. **No changes to existing 6 permission rows or 34 role_permissions rows** from Procurement Pipeline. Read-only validation only.
12. **No changes to lens-active-designs.html / lens-pricing.html / lens-catalog-admin.html** — only `lens-inventory.html` (and its modals JS) + `lens-goods-receipt.html` (remove client filter).

---

## 7. Expected Final State

**Schema (delta from current HEAD):**

- 2 new tables: `stock_adjustment`, `stock_adjustment_reason`
- 4 new RLS policies (2 per new table — canonical 2-policy pattern)
- 3 new indexes (1 on stock_adjustment_reason, 2 on stock_adjustment)
- 8 new seed rows in `stock_adjustment_reason` (4 demo + 4 prizma)
- 1 new RPC: `record_adjustment_lost` (SECDEF + JWT-guard + REVOKE)
- 1 column relaxation: `purchase_receipt_line.variant_id` NOT NULL → nullable
- 1 RPC body replaced: `m1_create_receipt_from_box` (F-1 + F-2 logic added)

**Files (delta from current HEAD — net new):**

- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` (this file)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/MIGRATION.md` (applied-log style, per E1 from M1_SKILL_IMPROVEMENT_HARVEST)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/ROLLBACK.md`
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/EXECUTION_REPORT.md` (Executor writes at close)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/FINDINGS.md` (Executor writes if findings exist)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/REVIEW.md` (Reviewer writes)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/TEST_REPORT.md` (Localhost-Tester writes)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/FOREMAN_REVIEW.md` (Foreman closes)

**Files modified (delta):**

- `modules/lens-inventory/lens-inventory-modals.js` — ➖ flow wired to `record_adjustment_lost` (~ 40-80 added lines, replacing the Phase 2 toast block)
- `modules/lens-goods-receipt/*.js` — remove the client-side variant-less filter (1 if-block removed, ~ 5-10 lines deleted)
- 4 superseded files with one-line SUPERSEDED header appended
- `js/shared.js` — T-constants `T.STOCK_ADJUSTMENT` + `T.STOCK_ADJUSTMENT_REASON` (Iron Rule 5 FIELD_MAP + T discipline)
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — close-state entry
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — phase section
- `docs/GLOBAL_MAP.md` — add `record_adjustment_lost` to function registry + add `stock_adjustment` + `stock_adjustment_reason` to table ownership (Module 1)

**Files explicitly UNTOUCHED:**

- All foundation HTML pages (`lens-inventory.html`, `lens-pricing.html`, `lens-active-designs.html`, `lens-catalog-admin.html`)
- Foundation JS files in `modules/lens-inventory/lens-inventory-grid.js`, `modules/lens-pricing/`, `modules/lens-active-designs/`
- All `record_adjustment_found` body (per §1.5 D5)
- `inventory.html`, `crm.html`, all unrelated screens
- CLAUDE.md (not append-only edit)
- `.claude/skills/*/SKILL.md` (Foreman applies skill improvements at SPEC close, not in execution body)

---

## 8. Commit Plan

Estimated 7-8 commits, each single-concern:

| # | Commit slug | Files | Notes |
|---|---|---|---|
| C1 | `chore(spec): open M1_LENS_PHASE_1B_GAP_CLOSURE` | SPEC.md + MIGRATION.md (empty Applied Log) + ROLLBACK.md skeletons | Opens SPEC folder |
| C2 | `feat(m1): stock_adjustment_reason + stock_adjustment tables + RLS + seed` | MIGRATION.md Applied Log block 1 | DDL via MCP `apply_migration`, no `supabase/migrations/*.sql` (TD-2 precedent) |
| C3 | `feat(m1): record_adjustment_lost RPC + REVOKE/GRANT` | MIGRATION.md Applied Log block 2 | DDL via MCP |
| C4 | `fix(m1): purchase_receipt_line.variant_id drop NOT NULL` | MIGRATION.md Applied Log block 3 | DDL via MCP (1-line ALTER) |
| C5 | `feat(m1): K2 body — PO state recompute + ordered_qty/discrepancy_qty + variant-less branch` | MIGRATION.md Applied Log block 4 + maybe lens-goods-receipt/*.js filter removal in same commit | DDL via MCP — CREATE OR REPLACE m1_create_receipt_from_box |
| C6 | `feat(lens-inventory): ➖ adjust UI wired to record_adjustment_lost` | `modules/lens-inventory/lens-inventory-modals.js` + js/shared.js T-constants | JS-only |
| C7 | `chore(specs): mark 3 draft Briefs + 1 SPEC stub SUPERSEDED by GAP_CLOSURE` | 4 files | Per §2.6 |
| C8 | `test(m1): functional smoke 7/7 baseline + F-1+F-2+F-3 verification matrix` | TEST_REPORT.md (Localhost-Tester writes) | Smoke artifacts retained on demo per M1A-DEBT-04 precedent |
| C9 | `chore(spec): close M1_LENS_PHASE_1B_GAP_CLOSURE — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG` | All close-state files | Final commit |

Commits may collapse where natural (e.g., C2+C3+C4 into one Block 1 commit if the executor judges the DDL is one atomic logical step). Bounded Autonomy — executor decides commit grouping within this envelope.

---

## 9. Rollback Plan

Audit-only — no destructive rollback path required. If any 🔴 verdict surfaces:

**Code:** `git revert <commit_hash>` on develop for whichever commit failed. Each commit is single-concern → revert is one-step.

**DB:**
- C2 rollback: `DROP TABLE stock_adjustment, stock_adjustment_reason CASCADE` — but only if no `stock_movement` row references one yet (smoke step F-3 has not yet run).
- C3 rollback: `DROP FUNCTION record_adjustment_lost(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric)`.
- C4 rollback: `ALTER TABLE purchase_receipt_line ALTER COLUMN variant_id SET NOT NULL` — only if no existing row has `variant_id IS NULL`. If smoke step 3 has run, some rows will be NULL → must DELETE smoke artifacts first.
- C5 rollback: `CREATE OR REPLACE` the previous body of `m1_create_receipt_from_box` (snapshot of current production body captured at Pre-Flight time below — see MIGRATION.md Applied Log).

**Smoke artifacts:** persist on demo per M1A-DEBT-04 precedent. The next SPEC re-uses or cleans up. (`stock_adjustment` smoke rows + variant-less receipt_line rows + 1 stock_movement adjustment_lost row.)

---

## 10. Autonomy Envelope

**Pre-authorized (Level 2 — non-destructive DML + Level 3 schema-additive):**
- All §2 SQL via Supabase MCP (`apply_migration` + `execute_sql`).
- All file edits to the files enumerated in §7 "modified" + "net new".
- The retirement-header append to the 4 SUPERSEDED files.
- Smoke fixtures on DEMO tenant only.
- Iron Rule 6 — `git add` by explicit filename, never `git add -A`.
- Each commit gets `node scripts/verify.mjs --staged` before `git commit`.

**Stop and escalate (Foreman-required):**
- Any §5 stop-trigger fires.
- Brief §10 escalation conditions (Pre-Flight divergence not already covered in §1.5; CRITICAL deviation mid-execution).
- Anything that would touch Prizma data beyond the 8 reason seed rows.
- Any prohibited destructive op (§4).

**Foreman amendment path:** if executor surfaces a class-defect (e.g., the RPC signature needs to differ from §2.3 for live-DB reasons), Foreman amends inline in the SPEC + commits the amendment in the same commit range (per M1A_OPERATIONS_RPCS_FIX precedent). Daniel is NOT consulted for amendments; only for genuine policy-level escalations.

---

## 11. Lessons Already Incorporated

From `M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` §6 + §7 + §8 (Foreman-authored 2026-05-15):

- **P-AUTHOR-3 (3-axis pre-flight)** — APPLIED in §0.A: K2 RPC body probed (P10), `stock_movement_exactly_one_source` probed (P1), `stock_adjustment` existence probed (P6), `record_adjustment_found` body probed (P5). All five gaps that Procurement Pipeline discovered mid-smoke are now pinned at SPEC-author time.

- **P-AUTHOR-1 counter advance 2/3 → 3/3?** — N/A in this SPEC body, but the smoke matrix (§3 SC #1–#4) is designed so that if a screen-gated cache-staleness pattern fires at Localhost-Tester time, the Foreman bumps the counter accordingly in close-time FOREMAN_REVIEW.md.

- **§14 fixture-value oversight (Foundation FOREMAN_REVIEW §6)** — APPLIED in §0.B: every smoke baseline value is pinned (5 POs, 9 PO lines, 6 receipts, …) so smoke cannot be designed against an assumed fixture.

- **E1 MIGRATION.md Applied Log pattern** — APPLIED in §8 commit plan: every MCP-only DDL commit has a corresponding MIGRATION.md Applied Log row.

- **Author Proposal #2 from MIGRATION_2_SETTINGS_PERMISSIONS (baselines as symbols)** — APPLIED in §0.B: baselines pinned as named symbols (BASE_PRIZMA_LENS_TABLES_ROWS, BASE_DEMO_PO, etc.).

- **§1.5.3 Runtime semantics rehearsal (SECURITY_HOTFIX_2)** — APPLIED in §0.C: `record_adjustment_lost` JWT-claim header rehearsed for 4 caller types (anon/wrong-tenant/service_role/NULL-trap). Block A canonical header cited rather than inlined.

- **§1.5.3 Status-column semantics probe (SECURITY_HOTFIX_3)** — APPLIED in §0.D: `purchase_order.status` distinct values probed before relying on status transitions in F-1.

Cross-Reference Check completed 2026-05-15 against live DB rev: 0 unresolved collisions / 3 hits resolved.

---

## 12. Concurrent-Pipeline Orthogonality Envelope

This SPEC's scope is:
- 2 new tables in `stock_adjustment*` namespace.
- 1 new RPC `record_adjustment_lost`.
- 1 RPC body replacement of `m1_create_receipt_from_box`.
- 1 column relaxation on `purchase_receipt_line.variant_id`.
- 2 JS files modified (`lens-inventory-modals.js`, `lens-goods-receipt/*`).
- 4 governance files marked SUPERSEDED.

**Orthogonality:** if a concurrent Pipeline touches any of the above objects in conflicting ways, this SPEC defers. If it touches lens-related tables for non-conflicting reasons (e.g., adding a column), no conflict.

**Currently no known concurrent Pipelines.** Pre-existing git status shows several uncommitted Brief files (architecture-brief/*.md) and modified governance files (MASTER_ROADMAP, OPEN_TASKS, GUARDIAN_ALERTS, role-overseer files, M4 audit) — all from prior sessions. The Executor uses Iron Rule 6 (explicit `git add` by filename) so these untracked/modified files are NOT swept into this Pipeline's commits.

---

*End of SPEC. Author: opticup-strategic (Foreman hat). Authored 2026-05-15. Iron Rule 32 §Destructive Operations declared above. Hand off to opticup-executor for Stage 2.*
