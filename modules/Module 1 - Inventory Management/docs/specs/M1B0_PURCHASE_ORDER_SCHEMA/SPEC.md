# SPEC — M1B0_PURCHASE_ORDER_SCHEMA

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full Auto Pipeline single chat
> **Authored on:** 2026-05-15
> **Module:** 1 — Inventory Management
> **Phase:** Phase 1B prerequisite (micro-SPEC — schema-only)
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1B0_PURCHASE_ORDER_SCHEMA_BRIEF.md`
> **Author signature:** Full Auto Pipeline 2026-05-15 / chat M1B0
> **Heading convention:** plain `## N.` (Iron-Rule-32 hook regex requirement — no `§` prefixes).

---

## 0. Pre-Authoring Reality Check

Live-state probes run via Supabase MCP `execute_sql` on 2026-05-15 against project `tsxrrxzmdxaenlvocyit`. Every Brief assumption verified against PG17 reality. **Two Brief assumptions DIVERGED — SPEC reconciles below.**

### Probe results (14 mandatory + 6 supplementary)

| # | Probe | Result | Disposition |
|---|---|---|---|
| 1 | Legacy `purchase_orders` (plural) shape | EXISTS — 12 cols: `id, po_number, supplier_id, order_date, expected_date, status, notes, branch_id (TEXT), created_by (TEXT), created_at, updated_at, tenant_id`. 20 rows on demo. | UNTOUCHED — frames-era; divergence-style coexistence with new singular table. |
| 2 | `purchase_order` (singular) exists? | `to_regclass = NULL` | Fresh table — no collision. |
| 3 | `supplier_debt` exists? | `to_regclass = NULL` | Fresh table — no collision. |
| 4 | `stock_lot.purchase_order_id` column + FK | Column EXISTS (UUID NULL); **NO FK constraint** (`stock_lot_purchase_order_fk` absent from pg_constraint list). | Add FK clause this SPEC (Brief §2 anticipated this; Phase 1A phantom). |
| 5 | `purchase_receipt` shape + `purchase_order_id` column | Column EXISTS (UUID NULL — line 5 of 18 cols); **NO FK constraint** in `pg_constraint` list. | Add FK clause this SPEC (Brief §2 conditional path B). |
| 6 | K2 body (`m1_create_receipt_from_box`) | 8 params, SECDEF, JWT-guarded, body inserts `purchase_receipt` + LOOP inserts lot+line+stock_movement, then RETURNS. **NO totals computation, NO debt insert.** | K2 extension this SPEC — append totals accumulator + `m1_create_supplier_debt_from_receipt` call after LOOP, before RETURN. `CREATE OR REPLACE FUNCTION` only — non-destructive. |
| 7 | `suppliers` cols | 30 cols incl. `id (uuid)`, `tenant_id`, `active (boolean)`, `supplier_number`, `default_currency`. | FK target ✓. |
| 8 | `purchase_receipt` UNIQUE pattern | `purchase_receipt_number_unique` = **partial UNIQUE INDEX** on `(tenant_id, receipt_number) WHERE is_deleted=false` (not a `CONSTRAINT`). | Mirror this style for all new UNIQUE — partial indexes, NOT constraints. |
| 9 | `next_receipt_number` body | SECDEF, JWT-guard, FOR UPDATE on tenants(id), MAX-based with 4-digit zero-pad + supplier-number prefix. | Pattern to mirror, BUT format differs (see Probe 12). |
| 10 | `supabase/migrations/2026*` tail | Last entry `20260514193000_m4_sync_rpc_not_found_idiom.sql`. | M1A_OPERATIONS_RPCS_FIX migrations applied via MCP only (TD-2 precedent) — no new files. **Continue MCP-only.** |
| 11 | `js/shared.js` T-constant count | 55 (`PURCHASE_RECEIPT:65, PURCHASE_RECEIPT_LINE:66, STOCK_LOTS:62, LENS_VARIANTS:49, VAT_RATES:54` already present). | Add 3 new constants: `T.PURCHASE_ORDER`, `T.PURCHASE_ORDER_LINE`, `T.SUPPLIER_DEBT`. |
| 12 | **DIVERGENCE — `next_po_number` ALREADY EXISTS** | Signature: `(p_tenant_id uuid, p_supplier_number text) RETURNS text`. SECDEF, JWT-guard, FOR UPDATE, MAX-based, writes against legacy `purchase_orders` (plural). Format: `'PO-' \|\| p_supplier_number \|\| '-' \|\| LPAD(seq,4)`. | **CANNOT REUSE NAME.** New lens-era RPC named `next_purchase_order_number(p_tenant_id UUID) RETURNS TEXT`. Format `PO-NNNNNN` (6-digit zero-pad, no supplier prefix per Brief §2.RPC#1). Pattern mirrors `next_lot_number` (which uses no supplier prefix). Iron Rule 21 satisfied via divergence (same precedent as `purchase_receipt` vs `goods_receipts`). |
| 13 | `vat_rates` schema + IL row | 9 cols incl. `owner_tenant_id (nullable=global)`, `country_code (char)`, `rate_pct (numeric)`, `effective_from (date)`, `effective_until (date NULL = active)`. **NO `active` column** — Brief assumption WRONG. 1 active IL row: `rate_pct=18.00, country_code='IL', effective_until=NULL`. | All VAT lookups use `WHERE effective_until IS NULL OR effective_until > CURRENT_DATE` (NOT `active=true`). |
| 14 | Demo tenant smoke fixtures | 1 `lens_variant` (`LV-TST001`); 2 active `tenant_location` (`STA`, `STB`); 38 active `suppliers`; 1 active IL VAT row. | **SMOKE-READY** — no fixture seeding required. M1A_OPERATIONS_RPCS_FIX seeded these on this same tenant (M1A-DEBT-04 carries this forward). |
| 15 (bonus) | `record_stock_movement` arity | 19 positional args (6 required + 13 default-NULL). K2 already calls 19 positional args (Amendment #1 verified). | K2 extension this SPEC does NOT modify the record_stock_movement call site — only appends NEW logic after the loop. **NO inner-call arity change to record_stock_movement.** |
| 16 (bonus) | `lens_variant` schema | NO `tenant_id`. Has `owner_tenant_id` (nullable). Confirms platform-owned/global. `id` is UUID. | FK from `purchase_order_line.variant_id` to `lens_variant(id)` ON DELETE RESTRICT works as-planned (no tenant scoping). |
| 17 (bonus) | `purchase_receipt` RLS | Canonical 2-policy: `service_bypass` (service_role, USING true) + `tenant_isolation` (public, JWT-claim USING). | Mirror exactly on all 3 new tables. |
| 18 (bonus) | `next_lot_number` body | SECDEF, JWT-guard, FOR UPDATE on tenants(id), MAX-based, **6-digit zero-pad, no supplier prefix**. | Direct precedent for `next_purchase_order_number` — copy structure, change prefix `LOT-` → `PO-`. |
| 19 (bonus) | `purchase_receipt_line` cols | 21 cols incl. `unit_cost (numeric)`, `unit_cost_currency (text NOT NULL)`, `qty_received (int)`, `discrepancy_*` already present. | K2 extension reads these for totals accumulation. |
| 20 (bonus) | Iron Rule 31 integrity gate at session start | `npm run verify:integrity` → "All clear — 124 files scanned in 5ms" (exit 0). | Clean baseline. SPEC commits must keep gate green. |

### Brief-vs-reality divergences

| # | Brief said | Reality | Resolution |
|---|---|---|---|
| D1 | RPC #1 named `next_po_number(p_tenant_id)` | Already exists with DIFFERENT signature `(uuid, text)` for legacy `purchase_orders` | Rename new RPC to `next_purchase_order_number(p_tenant_id UUID) RETURNS TEXT`. Iron Rule 21 satisfied via divergence (Phase 1A precedent). |
| D2 | `vat_rates.active = true` filter | Column does NOT exist; use `effective_until IS NULL OR > CURRENT_DATE` | K2 VAT lookup + smoke uses `effective_until IS NULL` filter. |
| D3 | "If `purchase_receipt.purchase_order_id` already exists → just add the FK clause if missing" | EXISTS but NO FK | Add FK clause this SPEC. |

### Inner-call arity audit (per Author Proposal #1 from M1A FOREMAN_REVIEW)

Every new RPC body's inner SECDEF call site, audited at SPEC-author time:

| Caller | Callee | Args (caller) | Callee `pronargs` | Match? |
|---|---|---|---|---|
| `place_purchase_order` (new) | `next_purchase_order_number` (new, 1 arg) | 1 | 1 (this SPEC defines it) | ✓ |
| K2 extension | `m1_create_supplier_debt_from_receipt` (new, 5 args) | 5 | 5 (this SPEC defines it) | ✓ |
| K2 (unchanged call site) | `record_stock_movement` | 19 positional | 19 | ✓ (no change — Amendment #1 verified). |

Zero inner-call arity mismatches at author time. The F-1/F-2 class of defect is pre-empted.

### Smoke-touched schema audit (per Author Proposal #2 from M1A FOREMAN_REVIEW)

Every table the §13 smoke reads/writes:

| Table | Demo rows (BASE_DEMO_ROWS) | Schema cols pinned? |
|---|---|---|
| `purchase_order` (new) | 0 | This SPEC creates the schema. |
| `purchase_order_line` (new) | 0 | This SPEC creates the schema. |
| `supplier_debt` (new) | 0 | This SPEC creates the schema. |
| `purchase_receipt` | (will-be-grown by K2 in smoke) | 21 cols pinned in Probe 5. |
| `purchase_receipt_line` | (will-be-grown) | 21 cols pinned in Probe 19. |
| `stock_lot` | (will-be-grown) | Has `purchase_order_id` NULL pre-existing (Probe 4); FK added this SPEC. |
| `stock_movement` | (will-be-grown) | Probe 15 confirms 19-arg orchestrator signature. |
| `suppliers` | 38 active on demo | Probe 7 confirms `id`, `tenant_id`, `active`, `supplier_number` exist. |
| `lens_variant` | 1 global (LV-TST001) | Probe 16 confirms `id` UUID, no `tenant_id`. |
| `tenant_location` | 2 active demo (STA, STB) | Probe 14 confirms `is_active` (not `active`). |
| `vat_rates` | 1 active IL row | Probe 13 confirms filter is `effective_until IS NULL`. |
| `tenants` | demo: `8d8cfa7e-ef58-49af-9702-a862d459cccb` | Standard. |

**SMOKE-READY** — every fixture exists. No pre-DDL fixture seeding step needed.

### Untracked-files survey

`git status --porcelain | grep '^??'` returns ~36 untracked files (architecture-brief files + roles/ updates + Module 1.5 cleanup + SECURITY_HOTFIX_2 folder). Executor MUST use selective `git add` by filename. NEVER `git add -A`.

### Lessons applied from prior FOREMAN_REVIEWs

| Source | Lesson | Application |
|---|---|---|
| M1A_OPERATIONS_RPCS_FIX FOREMAN_REVIEW Author Proposal #1 | Add orchestrator call-arity audit to §0 | Done above ("Inner-call arity audit" sub-section). 3 audits performed at author time — zero mismatches. |
| M1A_OPERATIONS_RPCS_FIX FOREMAN_REVIEW Author Proposal #2 | Smoke-touched schema audit in §0 | Done above ("Smoke-touched schema audit" sub-section). 11 tables audited. |
| MIGRATION_1_SUPPLIERS_DEBT FOREMAN Author Proposal #1 | Use `## Destructive Operations` heading (no `§` prefix) | Section 7 below uses correct heading. |
| MIGRATION_2_SETTINGS_PERMISSIONS FOREMAN Author Proposal #2 | Pin baselines symbolically | All baselines tabled above with explicit `BASE_*` symbols where used. |
| M1A_DEBT_SWEEP FOREMAN | Proactive `verify --staged` before EVERY commit | Iron Rule in §4 — Executor MUST run `verify --staged` before every `git add` ... `git commit`. |
| M1A_CURRENCIES_GLOBAL_HOTFIX FOREMAN | MCP-only-apply (TD-2 precedent) | All DDL applied via Supabase MCP `apply_migration` — NO `supabase/migrations/*.sql` files this SPEC. |
| Phase 1A Code Review | REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO authenticated | Inherited on all 5 new RPCs. |
| Phase 1A Strategic Review | SECDEF + `SET search_path = 'public'` + JWT-claim guard at function start | Inherited on all 5 new RPCs. |

---

## 1. Goal

Ship the 3 missing schema objects (`purchase_order`, `purchase_order_line`, `supplier_debt`) + 5 supporting RPCs + 2 FK back-pointer additions + K2 trigger-into-debt wiring, so the 6 Phase 1B customer-facing screens (next SPEC) have a verified schema + functional foundation to build on. **Schema-only — no UI.**

---

## 2. Background & Motivation

Phase 1A Strategic Review (`STRATEGIC_REVIEW_REPORT.md` finding A-02 + C-01) flagged that `purchase_order` + `purchase_order_line` + `supplier_debt` were never shipped — yet 3 Phase 1B screens + D-M1-07 + D-M1-10 + D-M1-11 depend on them. M1A_OPERATIONS_RPCS_FIX (closed 2026-05-15 🟢) proved the "schema + UI in one SPEC" pattern's hazard: existential smoke ≠ operational smoke. M1B0 ships **schema + RPCs + functional smoke ONLY** as a micro-SPEC, so Phase 1B builds on a runtime-verified foundation. This is the same discipline as M1A_OPERATIONS_RPCS_FIX's mandatory smoke close gate.

---

## 3. Success Criteria (Measurable)

Every criterion has an EXACT expected value. Verification commands are Supabase MCP `execute_sql` or shell unless noted.

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | On `develop`, clean tree at SPEC close | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | 5–8 commits (single-concern each) | `git log a29b93d..HEAD --oneline \| wc -l` → 5..8 |
| 3 | Table `purchase_order` exists with RLS enabled | `relrowsecurity = TRUE` | `SELECT relrowsecurity FROM pg_class WHERE relname='purchase_order'` → `t` |
| 4 | Table `purchase_order_line` exists with RLS enabled | `relrowsecurity = TRUE` | same on `relname='purchase_order_line'` → `t` |
| 5 | Table `supplier_debt` exists with RLS enabled | `relrowsecurity = TRUE` | same on `relname='supplier_debt'` → `t` |
| 6 | Each new table has canonical 2-policy RLS | 2 policies per table: `service_bypass` (service_role, USING `true`) + `tenant_isolation` (public, USING JWT-claim) | `SELECT polname, polroles::regrole[], pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid IN ('purchase_order'::regclass, 'purchase_order_line'::regclass, 'supplier_debt'::regclass)` → 6 rows, JWT-claim text matches Iron Rule 15 canonical pattern |
| 7 | Tenant-scoped UNIQUE on `purchase_order(tenant_id, po_number)` | Partial UNIQUE INDEX `WHERE is_deleted = false` | `SELECT indexdef FROM pg_indexes WHERE indexname='purchase_order_number_unique'` → contains `UNIQUE` + `(tenant_id, po_number)` + `WHERE (is_deleted = false)` |
| 8 | Tenant-scoped UNIQUE on `purchase_order_line(tenant_id, purchase_order_id, line_number)` | Partial UNIQUE INDEX `WHERE is_deleted = false` | `SELECT indexdef FROM pg_indexes WHERE indexname='purchase_order_line_unique'` → contains `UNIQUE (tenant_id, purchase_order_id, line_number) WHERE (is_deleted = false)` |
| 9 | Tenant-scoped UNIQUE on `supplier_debt(tenant_id, purchase_receipt_id)` | Partial UNIQUE INDEX `WHERE is_deleted = false` | `SELECT indexdef FROM pg_indexes WHERE indexname='supplier_debt_receipt_unique'` → contains `UNIQUE (tenant_id, purchase_receipt_id) WHERE (is_deleted = false)` |
| 10 | All CHECK constraints from §6 are enforced | INSERT tests violating each CHECK → RAISE | smoke step §13 sub-cases |
| 11 | 5 new RPCs deployed, all SECDEF | `prosecdef = TRUE` on each | `SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('next_purchase_order_number', 'place_purchase_order', 'mark_po_sent', 'cancel_purchase_order', 'm1_create_supplier_debt_from_receipt')` → 5 rows, all `t` |
| 12 | All 5 new RPCs have `SET search_path='public'` | `proconfig` includes `search_path=public` | `SELECT proname, proconfig FROM pg_proc WHERE proname IN (...)` → 5 rows each `{search_path=public}` |
| 13 | All 5 new RPCs have JWT-claim guard at function start | Body contains `current_setting('request.jwt.claims', true)` + `RAISE EXCEPTION` with `ERRCODE = '42501'` for tenant mismatch | `pg_get_functiondef` regex on each |
| 14 | All 5 new RPCs: REVOKE EXECUTE FROM PUBLIC + anon; GRANT EXECUTE TO authenticated | `aclexplode(proacl)` shows zero anon rows, exactly one authenticated row per RPC | `SELECT proname, aclexplode(proacl) FROM pg_proc WHERE proname IN (...)` → no `0/PUBLIC` rows, no `anon` rows, `authenticated` present with `EXECUTE` |
| 15 | `stock_lot.purchase_order_id` has FK clause to `purchase_order(id) ON DELETE SET NULL` | `pg_constraint` row exists | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='stock_lot_purchase_order_fk'` → `FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) ON DELETE SET NULL` |
| 16 | `purchase_receipt.purchase_order_id` has FK clause to `purchase_order(id) ON DELETE SET NULL` | `pg_constraint` row exists | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='purchase_receipt_purchase_order_fk'` → matches |
| 17 | K2 RPC `m1_create_receipt_from_box` body extended with `m1_create_supplier_debt_from_receipt` call after the LOOP | `pg_get_functiondef` body contains `m1_create_supplier_debt_from_receipt(` | grep `pg_get_functiondef('m1_create_receipt_from_box'::regproc)` |
| 18 | Functional smoke 6/6 PASS on demo (§13) | Captured in `TEST_REPORT.md` with explicit case-by-case PASS | open `TEST_REPORT.md` → all 6 cases PASS |
| 19 | Anon-reject test passes on all 5 RPCs | All 5 anon calls return error code `42501` | smoke step §13.5 |
| 20 | Cross-tenant guard test passes | tenant-A JWT calling `place_purchase_order(p_tenant_id=tenant-B-uuid)` → `42501` | smoke step §13.6 |
| 21 | `npm run verify:integrity` exit 0 at HEAD post-Pipeline | exit code = 0 (no null bytes) | shell `npm run verify:integrity; echo $?` → `0` |
| 22 | Advisor SECURITY + PERFORMANCE — zero new HIGH/ERROR-level lints on new tables + RPCs | get_advisors returns no HIGH/ERROR linked to the 3 new tables or 5 new RPCs | `mcp__claude_ai_Supabase__get_advisors type=security` + `type=performance` |
| 23 | No Prizma data written | All smoke runs on demo (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`) | TEST_REPORT.md tenant_id annotation |
| 24 | Iron Rule 32 §7 = `None.` held | Pre-commit `destructive-ops-declared.mjs` passes on every commit; zero DROP/TRUNCATE/DELETE/rebase/force-push/main-branch ops | verify hook output per commit |
| 25 | `docs/GLOBAL_MAP.md` updated | Additive entry listing 3 new tables + 5 new RPCs under Module 1 section | grep new names in `docs/GLOBAL_MAP.md` → 8 hits |
| 26 | `js/shared.js` T-constants extended | `T.PURCHASE_ORDER`, `T.PURCHASE_ORDER_LINE`, `T.SUPPLIER_DEBT` present | `grep -c 'PURCHASE_ORDER\b\|PURCHASE_ORDER_LINE\b\|SUPPLIER_DEBT\b' js/shared.js` → ≥3 |
| 27 | `js/shared-field-map.js` FIELD_MAP extended | 3 new entries: `purchase_order`, `purchase_order_line`, `supplier_debt` (Hebrew-keyed) | `grep -c "^  purchase_order:\|^  purchase_order_line:\|^  supplier_debt:" js/shared-field-map.js` → 3 |
| 28 | Module's `db-schema.sql` updated | M1B0 summary comment block appended (additive) | grep `M1B0_PURCHASE_ORDER_SCHEMA` in `modules/Module 1 - Inventory Management/docs/db-schema.sql` → 1+ |
| 29 | `SESSION_CONTEXT.md` + `CHANGELOG.md` updated | 2026-05-15 M1B0 section in each | grep `M1B0_PURCHASE_ORDER_SCHEMA` in both → 1+ each |
| 30 | EXECUTION_REPORT + FINDINGS + TEST_REPORT + ROLLBACK + REVIEW + FOREMAN_REVIEW all written in SPEC folder | 6 files exist | `ls modules/Module\ 1\ -\ Inventory\ Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/` → contains all 6 + SPEC.md |

**No criterion is ambiguous.** Every value is binary-checkable.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking (Level-3 DDL pre-authorized)

- Apply DDL migrations via Supabase MCP `apply_migration` with descriptive names (NO `supabase/migrations/*.sql` files — TD-2 precedent inherited from M1A_OPERATIONS_RPCS_FIX + M1A_CURRENCIES_GLOBAL_HOTFIX).
- `CREATE TABLE`, `ALTER TABLE ... ADD CONSTRAINT`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE INDEX`, `CREATE POLICY`, `CREATE OR REPLACE FUNCTION` on the 3 new tables + 5 new RPCs + the 2 FK additions + the K2 extension.
- `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO authenticated;` on the 5 new RPCs immediately after creation.
- Run §13 smoke on demo tenant (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). Smoke fixtures already exist (Probe 14) — no fixture seeding step needed.
- Re-run `npm run verify:integrity` + `npm run verify -- --staged` before every `git commit` (proactive pattern from M1A_DEBT_SWEEP — adopted as default Executor discipline).
- Selective `git add` by filename + `git commit` + `git push origin develop`. Never `git add -A` or `git add .` (per untracked-file survey in §0).
- Write all 5 deliverable files (EXECUTION_REPORT, FINDINGS, TEST_REPORT, ROLLBACK, plus updates to module docs).
- Apply any executor-improvement proposal from a recent FOREMAN_REVIEW if it directly applies.

### What REQUIRES stopping and escalating to the Foreman

- Smoke step failure (any of the 6 cases in §13).
- Inner-call arity mismatch detected mid-run that §0 did not predict (Author Proposal #1 enforcement).
- Any DDL that would touch the legacy `purchase_orders` (plural) table, the existing `next_po_number(uuid, text)` RPC, the 7 sealed mockups, decisions/M1.md, Phase 1 Brief, CLAUDE.md, MASTER_ROADMAP.md, OPEN_TASKS.md, or TECH_DEBT.md (except a one-line additive entry to GLOBAL_MAP.md).
- Any need to introduce a destructive op not declared in §7 (Iron Rule 32 — escalate via `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_*.md` + 1-line Hebrew to Daniel, halt the Pipeline).
- Advisor returning a HIGH/ERROR security or performance lint on the new objects.
- Any unexpected change to legacy `purchase_orders` data (Probe 1 baseline: 20 rows on demo — must not change).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Smoke 6/6 not green** → STOP. No 🟢 verdict without all 6 cases PASS (M1A_OPERATIONS_RPCS_FIX precedent — this lesson is permanent).
- **Inner-call arity audit fails mid-DDL** → STOP. Re-author §0 audit; escalate to Foreman.
- **`get_advisors` flags a HIGH/ERROR on new objects** → STOP. Either fix in-pipeline (if minor) or escalate.
- **`verify --staged` fires a Rule 14/15/18/21/23/31 violation on staged files** → STOP. Fix the root cause, re-stage, retry. NEVER bypass with `--no-verify`.
- **Legacy `purchase_orders` row count on demo changes from 20** → STOP (means we touched legacy data — Iron Rule 32 §7 violation).
- **`next_po_number(uuid, text)` body changes** → STOP. We MUST NOT touch the legacy function — different name (`next_purchase_order_number`) is the resolution.
- **`current_setting('request.jwt.claims',true)` returns NULL on smoke calls** → STOP. Means MCP session lacks JWT — investigate, do NOT bypass.

---

## 6. SQL Plan — Per Block (all applied via Supabase MCP `apply_migration`)

This section defines exact DDL the Executor applies. Each `apply_migration` call gets a descriptive `name` argument.

### Block 1 — `purchase_order` table

**Migration name:** `m1b0_create_purchase_order`

```sql
CREATE TABLE public.purchase_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','partial','fully_received','cancelled')),
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to_supplier_at TIMESTAMPTZ NULL,
  expected_delivery_at DATE NULL,
  cancelled_at TIMESTAMPTZ NULL,
  cancelled_reason TEXT NULL,
  created_by UUID NULL REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.purchase_order
  FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.purchase_order
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE UNIQUE INDEX purchase_order_number_unique
  ON public.purchase_order (tenant_id, po_number)
  WHERE (is_deleted = false);

CREATE INDEX purchase_order_tenant_idx ON public.purchase_order (tenant_id) WHERE (is_deleted = false);
CREATE INDEX purchase_order_supplier_status_idx ON public.purchase_order (tenant_id, supplier_id, status) WHERE (is_deleted = false);
CREATE INDEX purchase_order_status_ordered_idx ON public.purchase_order (tenant_id, status, ordered_at DESC) WHERE (is_deleted = false);
CREATE INDEX purchase_order_expected_delivery_idx ON public.purchase_order (tenant_id, expected_delivery_at) WHERE (status IN ('sent','partial') AND is_deleted = false);

CREATE TRIGGER trg_purchase_order_updated
  BEFORE UPDATE ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Block 2 — `purchase_order_line` table

**Migration name:** `m1b0_create_purchase_order_line`

```sql
CREATE TABLE public.purchase_order_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_order(id) ON DELETE RESTRICT,
  line_number INT NOT NULL CHECK (line_number > 0),
  source TEXT NOT NULL CHECK (source IN ('stock','custom_per_customer','manual')),
  variant_id UUID NULL REFERENCES lens_variant(id) ON DELETE RESTRICT,
  sale_order_id UUID NULL,  -- FK deferred (M7 table not yet built — Phase 1A `lab_jobs.purchase_receipt_id` precedent)
  sph NUMERIC(5,2) NULL,
  cyl NUMERIC(5,2) NULL,
  add_value NUMERIC(4,2) NULL,
  manual_description TEXT NULL,
  qty_ordered INT NOT NULL CHECK (qty_ordered > 0),
  qty_received INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0 AND qty_received <= qty_ordered),
  unit_cost NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  currency_code TEXT NOT NULL DEFAULT 'ILS',
  vat_rate_id UUID NULL REFERENCES vat_rates(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT purchase_order_line_source_variant_chk CHECK (
    (source = 'manual' AND variant_id IS NULL AND manual_description IS NOT NULL)
    OR (source IN ('stock','custom_per_customer') AND variant_id IS NOT NULL)
  ),
  CONSTRAINT purchase_order_line_source_sale_order_chk CHECK (
    (source = 'custom_per_customer' AND sale_order_id IS NOT NULL)
    OR (source IN ('stock','manual') AND sale_order_id IS NULL)
  )
);

ALTER TABLE public.purchase_order_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.purchase_order_line
  FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.purchase_order_line
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE UNIQUE INDEX purchase_order_line_unique
  ON public.purchase_order_line (tenant_id, purchase_order_id, line_number)
  WHERE (is_deleted = false);

CREATE INDEX purchase_order_line_tenant_idx ON public.purchase_order_line (tenant_id) WHERE (is_deleted = false);
CREATE INDEX purchase_order_line_po_idx ON public.purchase_order_line (tenant_id, purchase_order_id);
CREATE INDEX purchase_order_line_custom_idx ON public.purchase_order_line (tenant_id, variant_id, source) WHERE (source = 'custom_per_customer' AND is_deleted = false);
CREATE INDEX purchase_order_line_sale_order_idx ON public.purchase_order_line (tenant_id, sale_order_id) WHERE (sale_order_id IS NOT NULL);

CREATE TRIGGER trg_purchase_order_line_updated
  BEFORE UPDATE ON public.purchase_order_line
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Block 3 — `supplier_debt` table

**Migration name:** `m1b0_create_supplier_debt`

```sql
CREATE TABLE public.supplier_debt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_receipt_id UUID NOT NULL REFERENCES purchase_receipt(id) ON DELETE RESTRICT,
  delivery_note_number TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  currency_code TEXT NOT NULL DEFAULT 'ILS',
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','partially_paid','paid','written_off')),
  closed_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_debt ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.supplier_debt
  FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON public.supplier_debt
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE UNIQUE INDEX supplier_debt_receipt_unique
  ON public.supplier_debt (tenant_id, purchase_receipt_id)
  WHERE (is_deleted = false);

CREATE INDEX supplier_debt_tenant_idx ON public.supplier_debt (tenant_id) WHERE (is_deleted = false);
CREATE INDEX supplier_debt_supplier_status_idx ON public.supplier_debt (tenant_id, supplier_id, status) WHERE (is_deleted = false);
CREATE INDEX supplier_debt_status_created_idx ON public.supplier_debt (tenant_id, status, created_at DESC) WHERE (is_deleted = false);

CREATE TRIGGER trg_supplier_debt_updated
  BEFORE UPDATE ON public.supplier_debt
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Block 4 — FK back-pointers on `stock_lot` + `purchase_receipt`

**Migration name:** `m1b0_add_purchase_order_fk_backpointers`

```sql
-- stock_lot.purchase_order_id already exists as column (Probe 4); just add FK
ALTER TABLE public.stock_lot
  ADD CONSTRAINT stock_lot_purchase_order_fk
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id) ON DELETE SET NULL;

CREATE INDEX stock_lot_purchase_order_idx
  ON public.stock_lot (tenant_id, purchase_order_id)
  WHERE (purchase_order_id IS NOT NULL);

-- purchase_receipt.purchase_order_id already exists as column (Probe 5); just add FK
ALTER TABLE public.purchase_receipt
  ADD CONSTRAINT purchase_receipt_purchase_order_fk
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id) ON DELETE SET NULL;

CREATE INDEX purchase_receipt_purchase_order_idx
  ON public.purchase_receipt (tenant_id, purchase_order_id)
  WHERE (purchase_order_id IS NOT NULL);
```

### Block 5 — RPC `next_purchase_order_number` (new name, distinct from legacy `next_po_number`)

**Migration name:** `m1b0_create_next_purchase_order_number`

```sql
CREATE OR REPLACE FUNCTION public.next_purchase_order_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max_seq INT;
  v_prefix TEXT := 'PO-';
  v_new_number TEXT;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  -- Lock tenant row for serialisation (mirror next_lot_number)
  PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
    INTO v_max_seq
    FROM purchase_order
    WHERE tenant_id = p_tenant_id AND po_number LIKE v_prefix || '%';
  v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  RETURN v_new_number;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.next_purchase_order_number(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.next_purchase_order_number(UUID) TO authenticated;
```

### Block 6 — RPC `place_purchase_order`

**Migration name:** `m1b0_create_place_purchase_order`

```sql
CREATE OR REPLACE FUNCTION public.place_purchase_order(
  p_tenant_id UUID,
  p_supplier_id UUID,
  p_lines JSONB,                          -- array of {source, variant_id?, sale_order_id?, sph?, cyl?, add_value?, manual_description?, qty_ordered, unit_cost, currency_code?, vat_rate_id?}
  p_expected_delivery_at DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_po_id UUID;
  v_po_number TEXT;
  v_line JSONB;
  v_line_no INT := 0;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  -- Validate supplier belongs to tenant
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE id = p_supplier_id AND tenant_id = p_tenant_id AND active = true) THEN
    RAISE EXCEPTION 'Supplier not found or inactive for this tenant' USING ERRCODE = '23503';
  END IF;
  v_po_number := next_purchase_order_number(p_tenant_id);
  INSERT INTO purchase_order(
    tenant_id, po_number, supplier_id, status, expected_delivery_at, notes, created_by
  ) VALUES (
    p_tenant_id, v_po_number, p_supplier_id, 'draft', p_expected_delivery_at, p_notes, p_created_by
  ) RETURNING id INTO v_po_id;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_line_no := v_line_no + 1;
    INSERT INTO purchase_order_line(
      tenant_id, purchase_order_id, line_number, source,
      variant_id, sale_order_id, sph, cyl, add_value, manual_description,
      qty_ordered, unit_cost, currency_code, vat_rate_id
    ) VALUES (
      p_tenant_id, v_po_id, v_line_no, v_line->>'source',
      NULLIF(v_line->>'variant_id','')::UUID,
      NULLIF(v_line->>'sale_order_id','')::UUID,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC,
      NULLIF(v_line->>'manual_description',''),
      (v_line->>'qty_ordered')::INT,
      (v_line->>'unit_cost')::NUMERIC,
      COALESCE(NULLIF(v_line->>'currency_code',''), 'ILS'),
      NULLIF(v_line->>'vat_rate_id','')::UUID
    );
  END LOOP;
  RETURN v_po_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_purchase_order(UUID, UUID, JSONB, DATE, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.place_purchase_order(UUID, UUID, JSONB, DATE, TEXT, UUID) TO authenticated;
```

### Block 7 — RPC `mark_po_sent`

**Migration name:** `m1b0_create_mark_po_sent`

```sql
CREATE OR REPLACE FUNCTION public.mark_po_sent(p_tenant_id UUID, p_po_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_updated INT;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  UPDATE purchase_order
     SET status = 'sent', sent_to_supplier_at = now(), updated_at = now()
   WHERE id = p_po_id AND tenant_id = p_tenant_id AND status = 'draft' AND is_deleted = false;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'PO % not found, not owned by tenant, or not in draft status', p_po_id USING ERRCODE = '22023';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_po_sent(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_po_sent(UUID, UUID) TO authenticated;
```

### Block 8 — RPC `cancel_purchase_order`

**Migration name:** `m1b0_create_cancel_purchase_order`

```sql
CREATE OR REPLACE FUNCTION public.cancel_purchase_order(p_tenant_id UUID, p_po_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_current_status TEXT;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO v_current_status
    FROM purchase_order
   WHERE id = p_po_id AND tenant_id = p_tenant_id AND is_deleted = false
   FOR UPDATE;
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'PO % not found for this tenant', p_po_id USING ERRCODE = '22023';
  END IF;
  IF v_current_status NOT IN ('draft','sent') THEN
    RAISE EXCEPTION 'Cannot cancel PO in status %, only draft/sent allowed', v_current_status USING ERRCODE = '42501';
  END IF;
  UPDATE purchase_order
     SET status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason, updated_at = now()
   WHERE id = p_po_id AND tenant_id = p_tenant_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_purchase_order(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cancel_purchase_order(UUID, UUID, TEXT) TO authenticated;
```

### Block 9 — RPC `m1_create_supplier_debt_from_receipt`

**Migration name:** `m1b0_create_m1_create_supplier_debt_from_receipt`

```sql
CREATE OR REPLACE FUNCTION public.m1_create_supplier_debt_from_receipt(
  p_tenant_id UUID,
  p_purchase_receipt_id UUID,
  p_total_amount NUMERIC,
  p_vat_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'ILS'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  v_supplier_id UUID;
  v_delivery_note_number TEXT;
  v_debt_id UUID;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT supplier_id, delivery_note_number INTO v_supplier_id, v_delivery_note_number
    FROM purchase_receipt
   WHERE id = p_purchase_receipt_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Receipt % not found for this tenant', p_purchase_receipt_id USING ERRCODE = '22023';
  END IF;
  -- Idempotent via partial-unique (tenant_id, purchase_receipt_id) WHERE is_deleted=false
  INSERT INTO supplier_debt(
    tenant_id, supplier_id, purchase_receipt_id, delivery_note_number,
    total_amount, vat_amount, currency_code, paid_amount, status
  ) VALUES (
    p_tenant_id, v_supplier_id, p_purchase_receipt_id, v_delivery_note_number,
    p_total_amount, p_vat_amount, p_currency_code, 0, 'open'
  )
  ON CONFLICT ON CONSTRAINT supplier_debt_receipt_unique DO NOTHING
  RETURNING id INTO v_debt_id;
  -- If ON CONFLICT fired (row already existed), v_debt_id is NULL — fetch existing id
  IF v_debt_id IS NULL THEN
    SELECT id INTO v_debt_id FROM supplier_debt
     WHERE tenant_id = p_tenant_id AND purchase_receipt_id = p_purchase_receipt_id AND is_deleted = false;
  END IF;
  RETURN v_debt_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.m1_create_supplier_debt_from_receipt(UUID, UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.m1_create_supplier_debt_from_receipt(UUID, UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;
```

> **Note on `ON CONFLICT ON CONSTRAINT`** — partial unique indexes cannot be referenced via index-name alone in some PG18+ cases, but in PG17 this works against the index. **Executor verification step:** after Block 9 applies, immediately test idempotency with a smoke sub-case (call the RPC twice for same receipt; second call must return the same id without error). If the syntax fails on idempotency, fall back to `ON CONFLICT (tenant_id, purchase_receipt_id) WHERE is_deleted = false DO NOTHING` (PG17 supports this inferred-index syntax with `WHERE` predicate matching the partial UNIQUE INDEX). Either form is acceptable; the operational behavior is what matters.

### Block 10 — K2 Extension (`m1_create_receipt_from_box`) — additive only

**Migration name:** `m1b0_extend_k2_with_supplier_debt_wiring`

Pre-condition: read current K2 body (Probe 6). Append totals accumulator + supplier_debt insert AFTER the LOOP, BEFORE `RETURN`. **Inner-call arity audit applies — must call `m1_create_supplier_debt_from_receipt` with exactly 5 args.**

```sql
CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_delivery_note_number text,
  p_lines jsonb,
  p_box_id uuid DEFAULT NULL::uuid,
  p_box_supplier_barcode text DEFAULT NULL::text,
  p_supplier_number text DEFAULT NULL::text,
  p_confirmed_by uuid DEFAULT NULL::uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_line JSONB;
  v_lot_id UUID;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
  -- M1B0 additions
  v_subtotal NUMERIC(14,4) := 0;
  v_vat_rate NUMERIC(6,3);
  v_vat_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  v_receipt_number := next_receipt_number(p_tenant_id, p_supplier_number);
  INSERT INTO purchase_receipt(
    tenant_id, supplier_id, receipt_number, delivery_note_number,
    shipping_box_id, shipping_box_supplier_barcode,
    status, confirmed_by, confirmed_at
  ) VALUES (
    p_tenant_id, p_supplier_id, v_receipt_number, p_delivery_note_number,
    p_box_id, p_box_supplier_barcode,
    'confirmed', p_confirmed_by, now()
  ) RETURNING id INTO v_receipt_id;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO stock_lot(
      tenant_id, variant_id, location_id, origin_type,
      purchase_receipt_id, qty_received, qty_remaining, unit_cost, lot_number, received_at
    ) VALUES (
      p_tenant_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      'purchase',
      v_receipt_id,
      (v_line->>'qty_received')::INT,
      (v_line->>'qty_received')::INT,
      (v_line->>'unit_cost')::NUMERIC,
      next_lot_number(p_tenant_id),
      now()
    ) RETURNING id INTO v_lot_id;
    INSERT INTO purchase_receipt_line(
      tenant_id, receipt_id, variant_id, location_id,
      sph, cyl, add_value,
      qty_received, unit_cost,
      sale_order_id, stock_lot_id
    ) VALUES (
      p_tenant_id, v_receipt_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC,
      (v_line->>'qty_received')::INT,
      (v_line->>'unit_cost')::NUMERIC,
      NULLIF(v_line->>'sale_order_id','')::UUID,
      v_lot_id
    );
    PERFORM record_stock_movement(
      p_tenant_id, v_lot_id,
      (v_line->>'variant_id')::UUID,
      (v_line->>'location_id')::UUID,
      'receipt',
      (v_line->>'qty_received')::INT,
      NULLIF(v_line->>'sale_order_id','')::UUID,
      NULL,
      v_receipt_id,
      NULL, NULL,
      (v_line->>'unit_cost')::NUMERIC,
      NULL, NULL, p_confirmed_by, NULL,
      NULLIF(v_line->>'sph','')::NUMERIC,
      NULLIF(v_line->>'cyl','')::NUMERIC,
      NULLIF(v_line->>'add_value','')::NUMERIC
    );
    -- M1B0: accumulate subtotal for supplier_debt
    v_subtotal := v_subtotal + ((v_line->>'qty_received')::NUMERIC * (v_line->>'unit_cost')::NUMERIC);
  END LOOP;
  -- M1B0: compute totals + create supplier_debt (D-M1-11)
  SELECT rate_pct INTO v_vat_rate
    FROM vat_rates
   WHERE country_code = 'IL'
     AND (effective_until IS NULL OR effective_until > CURRENT_DATE)
   ORDER BY effective_from DESC
   LIMIT 1;
  v_vat_amount := ROUND(v_subtotal * COALESCE(v_vat_rate, 0) / 100, 2);
  v_total_amount := ROUND(v_subtotal + v_vat_amount, 2);
  PERFORM m1_create_supplier_debt_from_receipt(
    p_tenant_id, v_receipt_id, v_total_amount, v_vat_amount, 'ILS'
  );
  RETURN v_receipt_id;
END;
$function$;

-- Re-apply REVOKE/GRANT after CREATE OR REPLACE (paranoid; PG preserves grants on OR REPLACE
-- but the Phase 1A Code Review's experience says always re-assert)
REVOKE EXECUTE ON FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid) TO authenticated;
```

---

## 7. Destructive Operations

`None.`

Every operation in §6 is additive: `CREATE TABLE`, `ALTER TABLE … ADD CONSTRAINT`, `CREATE INDEX`, `CREATE POLICY`, `CREATE OR REPLACE FUNCTION` (PostgreSQL-defined as non-destructive). No `DROP`, no `TRUNCATE`, no `DELETE`, no rebase, no force-push, no `main`-branch modification. Pre-commit gate (`scripts/checks/destructive-ops-declared.mjs`) MUST pass on every commit with `Destructive Operations: None.` declared here.

---

## 8. Out of Scope (explicit — do NOT touch)

- The 6 Phase 1B customer-facing screens (HTML/JS/CSS).
- PDF/Excel export of POs.
- Auto-send PO to supplier (email/WhatsApp/API).
- Payment-allocation tables (M8 territory).
- Discrepancy resolution UI.
- FX conversion.
- Legacy `purchase_orders` (plural) — frames-era; 20 demo rows preserved; existing FIELD_MAP entry preserved.
- Legacy `next_po_number(uuid, text)` RPC — preserved; never renamed, never dropped, never modified.
- `shipments` / `shipment_items` (M9 deprecation scope).
- 7 sealed mockups, Phase 1 Brief, decisions/M1.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT, CLAUDE.md.
- 3 MAX-based sequence generators refactor (accept Phase 1A consistency; Reviewer A-4 acknowledged debt).
- 21 FK indexes from `M1A_FK_INDEXES_PREP_FOR_1B` (parallel SPEC).
- Prizma tenant — all smoke on demo only.
- Merge to `main` (Daniel-only after Pipeline closes 🟢).

---

## 9. Expected Final State

### Live DB (Supabase)
- 3 new tables (`purchase_order`, `purchase_order_line`, `supplier_debt`) with canonical 2-policy RLS.
- 5 new RPCs (`next_purchase_order_number`, `place_purchase_order`, `mark_po_sent`, `cancel_purchase_order`, `m1_create_supplier_debt_from_receipt`) SECDEF + JWT-guarded + REVOKE/GRANT'd.
- 2 new FK constraints (`stock_lot_purchase_order_fk`, `purchase_receipt_purchase_order_fk`) + supporting indexes.
- K2 (`m1_create_receipt_from_box`) body extended with totals + supplier_debt wiring (CREATE OR REPLACE).
- Demo tenant smoke artifacts (1 PO + 3 lines + 1 receipt + 3 lots + 3 stock_movements + 1 debt row, approximately).

### Modified files (repo)
- `js/shared.js` — 3 new T-constants appended.
- `js/shared-field-map.js` — 3 new FIELD_MAP entries appended.
- `docs/GLOBAL_MAP.md` — Module 1 section gets additive lines listing the 3 tables + 5 RPCs.
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` — M1B0 summary comment block appended.
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — 2026-05-15 M1B0 section prepended.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — M1B0 commit list appended.

### New files (repo)
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` (this file).
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/EXECUTION_REPORT.md`.
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FINDINGS.md`.
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/TEST_REPORT.md`.
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/ROLLBACK.md`.
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/REVIEW.md` (by Reviewer).
- `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md` (by Foreman post-execution).

### NOT modified
- All files in §8 Out of Scope.
- `supabase/migrations/*.sql` — TD-2 precedent (MCP-only-apply this Pipeline).

---

## 10. Commit Plan (5–8 commits, single-concern each)

| # | Commit | Files / DB ops | Run before commit |
|---|---|---|---|
| 1 | `chore(spec): open M1B0_PURCHASE_ORDER_SCHEMA — SPEC + ROLLBACK skeleton` | `SPEC.md`, `ROLLBACK.md` (skeleton — fills in per-block as Blocks apply) | `npm run verify:integrity && node scripts/verify.mjs --staged` |
| 2 | `feat(m1,schema): create purchase_order + purchase_order_line + supplier_debt tables` | MCP apply_migration: Blocks 1+2+3 (3 tables + 6 indexes + 2 policies × 3 tables + UNIQUE indexes + update_updated_at triggers). Update `db-schema.sql` summary. ROLLBACK.md DOWN entries. | `verify:integrity` + `verify --staged` |
| 3 | `feat(m1,schema): add FK back-pointers stock_lot + purchase_receipt → purchase_order` | MCP apply_migration: Block 4 (2 FK + 2 indexes). ROLLBACK.md DOWN entry. | same |
| 4 | `feat(m1,rpc): create 4 PO RPCs (next_purchase_order_number, place, mark_sent, cancel)` | MCP apply_migration: Blocks 5+6+7+8 (4 RPCs + REVOKE/GRANT × 4). | same |
| 5 | `feat(m1,rpc): create m1_create_supplier_debt_from_receipt + wire K2 (D-M1-11)` | MCP apply_migration: Blocks 9+10 (1 RPC + K2 CREATE OR REPLACE + REVOKE/GRANT × 2). | same |
| 6 | `feat(shared): T-constants + FIELD_MAP for 3 new M1B0 tables` | `js/shared.js` (3 T-constants) + `js/shared-field-map.js` (3 FIELD_MAP entries). | same |
| 7 | `test(m1): demo functional smoke — 6/6 PASS` | `TEST_REPORT.md` filled with smoke output (all 6 cases on demo). Captures actual UUIDs + assertions. If any case FAILS → STOP and escalate to Foreman, do NOT close. | same |
| 8 | `chore(spec): close M1B0_PURCHASE_ORDER_SCHEMA — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG` | EXECUTION_REPORT.md + FINDINGS.md + GLOBAL_MAP additive + SESSION_CONTEXT prepend + CHANGELOG append. | same |

**Hard rule on commit count:** 5 is the minimum (Blocks 1–10 collapsed) and 8 is the maximum. If Executor needs to split Block 10 (K2 extension) into its own commit for clarity, 7 commits is acceptable. NEVER exceed 8 — each extra commit is a Foreman concern.

---

## 11. Dependencies / Preconditions

- Phase 1A schema closed (M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN 🟢 + M1A_OPERATIONS_RPCS_FIX 🟢 + M1A_DEBT_SWEEP 🟢 + M1A_CURRENCIES_GLOBAL_HOTFIX 🟢) — verified by latest `git log`: `a29b93d chore(spec): close M1A_OPERATIONS_RPCS_FIX 🟢`.
- `purchase_receipt`, `stock_lot`, `purchase_receipt_line`, `tenants`, `suppliers`, `lens_variant`, `tenant_location`, `vat_rates`, `employees` all in place — verified by Probes 5, 4, 19, 7, 16, 14, 13, plus implicit Probe 11 (T.constants present).
- Demo tenant fixtures: 1 lens_variant, 2 active locations, 38 active suppliers, 1 active IL VAT row — confirmed Probe 14.
- Supabase MCP `apply_migration` available + service-role JWT for migrations — Pipeline default.
- Working tree at session start: ~36 untracked files (pre-existing, NOT this Pipeline's) — Executor uses selective `git add` throughout.

---

## 12. Lessons Already Incorporated

| Source | Lesson | Applied this SPEC |
|---|---|---|
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Author Proposal #1 | Orchestrator call-arity audit | DONE in §0 — 3 inner-call sites audited, all clean. |
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Author Proposal #2 | Smoke-touched schema audit | DONE in §0 — 11 tables audited, demo fixtures pinned. |
| `M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md` Executor Proposal #2 | Smoke-fixture audit before DDL | DONE in §0 + §11 — fixtures confirmed BEFORE DDL plan. |
| `M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` | Proactive `verify --staged` before every commit | Mandated in §4 + §10 (every commit row says "Run before commit: verify:integrity + verify --staged"). |
| `M1A_CURRENCIES_GLOBAL_HOTFIX` | MCP-only-apply, no `supabase/migrations/*.sql` | §6 — every Block's `apply_migration` name listed; NO migration files this SPEC. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 | `## Destructive Operations` heading (no `§` prefix) | §7 uses correct heading. |
| Phase 1A Code Review | REVOKE/GRANT discipline + SECDEF + JWT guard + `search_path='public'` | Inherited on all 5 new RPCs (§6 Blocks 5–9) + K2 re-assertion (Block 10). |
| Phase 1A Strategic Review (A-02 / C-01) | PO + supplier_debt MUST ship before Phase 1B | This SPEC is that work. |
| Iron Rule 21 (No Duplicates) + Phase 1A Open Q1 | Divergence-style coexistence when names collide | `next_purchase_order_number` (new) coexists with legacy `next_po_number(uuid, text)` — same pattern as `purchase_receipt` vs `goods_receipts`. |

---

## 13. Functional Smoke (mandatory before SPEC close — captured in `TEST_REPORT.md`)

All on demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Use Supabase MCP `execute_sql` with `set_config('request.jwt.claims', '{"tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb","role":"authenticated"}', true)` to simulate authenticated user.

### Case 1 — `place_purchase_order` (3 lines: stock + custom-per-customer + manual)

**Inputs:** demo tenant + first active supplier + 3-line JSONB array:
- Line 1 (stock): `variant_id=LV-TST001's id`, `qty_ordered=10`, `unit_cost=15.50`, `source='stock'`
- Line 2 (custom_per_customer): `variant_id=LV-TST001`, `sale_order_id=gen_random_uuid()` (synthetic — M7 table absent so no FK enforcement), `sph=2.50`, `cyl=-1.25`, `add_value=0.0`, `qty_ordered=2`, `unit_cost=22.00`, `source='custom_per_customer'`
- Line 3 (manual): `variant_id=NULL`, `manual_description='Mountings for repair stock'`, `qty_ordered=5`, `unit_cost=3.00`, `source='manual'`

**Expected:** RPC returns UUID; `SELECT count(*) FROM purchase_order_line WHERE purchase_order_id = returned_id` = 3; line_numbers = (1, 2, 3); `SELECT status FROM purchase_order WHERE id = returned_id` = `'draft'`; `po_number ~ '^PO-\d{6}$'`.

### Case 2 — `mark_po_sent` on the new PO

**Inputs:** PO id from Case 1.

**Expected:** RPC returns VOID (no error); `SELECT status, sent_to_supplier_at FROM purchase_order WHERE id = ...` returns `('sent', non-null timestamp)`.

### Case 3 — `m1_create_receipt_from_box` (K2 wired with debt)

**Inputs:** demo tenant + same supplier + new delivery_note_number `'TEST-M1B0-' || extract(epoch from now())::text` + 2 receipt lines (use `box_id=NULL` per Brief Q5 — K2 supports NULL box). Lines:
- `variant_id=LV-TST001`, `location_id=STA's id`, `qty_received=10`, `unit_cost=15.50`, no sph/cyl/add/sale_order_id
- `variant_id=LV-TST001`, `location_id=STB's id`, `qty_received=2`, `unit_cost=22.00`, sph=2.50, cyl=-1.25, add=0.0, sale_order_id=NULL

**Expected:**
- K2 returns UUID (receipt_id);
- `SELECT count(*) FROM purchase_receipt_line WHERE receipt_id = ...` = 2;
- `SELECT count(*) FROM stock_lot WHERE purchase_receipt_id = ...` = 2;
- `SELECT count(*) FROM stock_movement WHERE purchase_receipt_id = ...` = 2;
- `SELECT count(*), total_amount, vat_amount, status FROM supplier_debt WHERE purchase_receipt_id = ...`:
  - count = 1
  - subtotal = 10 × 15.50 + 2 × 22.00 = 155.00 + 44.00 = **199.00**
  - vat_amount = ROUND(199.00 × 18 / 100, 2) = **35.82**
  - total_amount = ROUND(199.00 + 35.82, 2) = **234.82**
  - status = `'open'`
- Idempotency probe: call `m1_create_supplier_debt_from_receipt` again with same receipt → returns SAME debt_id, no error, no new row.

### Case 4 — Cancel-flow tests (3 sub-cases)

**4a:** Create a fresh draft PO via `place_purchase_order` (smaller — 1 line). Call `cancel_purchase_order(tenant, po_id, 'test cancel')` → SUCCESS. Verify `status='cancelled', cancelled_at non-null, cancelled_reason='test cancel'`.

**4b:** Call `cancel_purchase_order` again on the same now-cancelled PO → must RAISE `42501` ("Cannot cancel PO in status cancelled").

**4c:** Update one PO to `status='partial'` directly via service_role (bypass RLS — synthetic state): `UPDATE purchase_order SET status='partial' WHERE id = (PO from Case 1)`. Then call `cancel_purchase_order(...)` as authenticated → must RAISE `42501` ("Cannot cancel PO in status partial").

### Case 5 — Anon-reject test on all 5 new RPCs

For each of `next_purchase_order_number`, `place_purchase_order`, `mark_po_sent`, `cancel_purchase_order`, `m1_create_supplier_debt_from_receipt`:

Set JWT claims to anon (`set_config('request.jwt.claims', '{"role":"anon"}', true)`) and call. **Expected:** error code `42501` (JWT-claim guard rejects — `tenant_id` is NULL).

### Case 6 — Cross-tenant guard

Set JWT claims for a different tenant: `set_config('request.jwt.claims', '{"tenant_id":"<prizma-uuid-NOT 8d8cfa7e>","role":"authenticated"}', true)` then call `place_purchase_order(p_tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb', …)`. **Expected:** `42501` ("Unauthorized: tenant_id mismatch"). Then reset claims back to demo for cleanup.

### Cleanup (after smoke)

Smoke artifacts MAY persist (consistent with M1A_OPERATIONS_RPCS_FIX precedent — fixtures useful for Phase 1B). EXECUTOR records the synthetic UUIDs in `TEST_REPORT.md` for later reference. **Do NOT clean up** — leave the artifacts as Phase 1B seed.

---

## 14. Rollback Plan

`ROLLBACK.md` (sibling file) defines per-block DOWN steps:

| Block | DOWN step |
|---|---|
| 1 (`purchase_order` table) | `DROP TABLE purchase_order CASCADE;` (last — see Block 4 + Block 10 cascade) |
| 2 (`purchase_order_line` table) | `DROP TABLE purchase_order_line CASCADE;` |
| 3 (`supplier_debt` table) | `DROP TABLE supplier_debt CASCADE;` |
| 4 (FK back-pointers) | `ALTER TABLE stock_lot DROP CONSTRAINT stock_lot_purchase_order_fk; DROP INDEX stock_lot_purchase_order_idx; ALTER TABLE purchase_receipt DROP CONSTRAINT purchase_receipt_purchase_order_fk; DROP INDEX purchase_receipt_purchase_order_idx;` |
| 5–9 (5 new RPCs) | `DROP FUNCTION next_purchase_order_number(UUID); DROP FUNCTION place_purchase_order(UUID, UUID, JSONB, DATE, TEXT, UUID); DROP FUNCTION mark_po_sent(UUID, UUID); DROP FUNCTION cancel_purchase_order(UUID, UUID, TEXT); DROP FUNCTION m1_create_supplier_debt_from_receipt(UUID, UUID, NUMERIC, NUMERIC, TEXT);` |
| 10 (K2 extension) | Re-apply pre-M1B0 K2 body (the body shown in §0 Probe 6) via `CREATE OR REPLACE FUNCTION` — restores prior signature exactly. Re-apply REVOKE/GRANT. |

**Execution-order constraint for full rollback:** Block 10 (K2 restore) FIRST → Blocks 5–9 (RPCs) → Block 4 (FK detach) → Blocks 1+2+3 (tables) LAST. Reverse-deps order.

ROLLBACK is for catastrophic-failure recovery, not for ordinary mid-pipeline pivots. If the Pipeline closes 🟢, ROLLBACK.md sits in the SPEC folder as audit-only.

---

## 15. Pre-Merge Checklist

- [ ] All §3 success criteria 1–30 pass; actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] Iron Rule 31 integrity gate exit 0 at HEAD.
- [ ] `git status --short` empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `ROLLBACK.md` all present in SPEC folder.
- [ ] SESSION_CONTEXT + CHANGELOG + db-schema.sql + GLOBAL_MAP all updated.
- [ ] Reviewer runs `REVIEW.md`; Foreman runs `FOREMAN_REVIEW.md`; Hebrew status line emitted to Daniel.

---

*End of SPEC. M1B0_PURCHASE_ORDER_SCHEMA. Author: opticup-strategic (Foreman) via Full Auto Pipeline single chat, 2026-05-15. Inherits all M1A_OPERATIONS_RPCS_FIX discipline. Schema-only — no UI.*
