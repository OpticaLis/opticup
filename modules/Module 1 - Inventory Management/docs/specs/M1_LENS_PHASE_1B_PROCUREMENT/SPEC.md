# SPEC — M1_LENS_PHASE_1B_PROCUREMENT

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman hat)
> **Authored on:** 2026-05-15
> **Module:** 1 — Inventory Management
> **Phase:** 1B (procurement half — closes Phase 1B)
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_PROCUREMENT_BRIEF.md`
> **Pipeline mode:** Full Auto Pipeline (single chat, end-to-end)
> **Branch:** `develop`. Daniel-only merge to main after 🟢.

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-15. The 10 §6 probes were executed live against
Supabase project `tsxrrxzmdxaenlvocyit` and against repo HEAD on 2026-05-15
before any line of this SPEC was drafted. **Several Brief assumptions were
falsified by the probes** — the SPEC is written against repo+DB reality, not
against the Brief's literal claims.

### 0.A — Schema corrections vs Brief

| # | Brief claim | Probe result | SPEC posture |
|---|---|---|---|
| 1 | `purchase_order.total_amount` exists | **NOT present** — total derives from line aggregation | SC #15 measures line-aggregate calc, not a PO column |
| 2 | `is_user_authorized_for` RPC chain | **Function does NOT exist** — auth is client-side via `js/auth-service.js:hasPermission(key)` (sessionStorage cache) | Permission gates use `hasPermission()` per `lens-inventory.html:64-68` pattern. SQL replay of `getEffectivePermissions` is the smoke recipe (P-EXEC-1 reference) |
| 3 | `permissions.permission_key` column | **Wrong** — column is `permissions.id` (text PK = key itself). Schema: `id, module, action, name_he, description, tenant_id` | Seed INSERTs target `id` column |
| 4 | `suppliers.supplier_name` | **Wrong** — column is `suppliers.name`; integer `supplier_number` is a separate field | Joins use `s.name` |
| 5 | `employees.full_name` | **Wrong** — column is `employees.name` | Smoke SQL uses `e.name` |
| 6 | "Phase 1B foundation seeded permission keys" | **Confirmed** 3 keys × 2 tenants = 6 perm rows; 18 role_permissions rows (matches M1B_FOUNDATION_PERMISSIONS_HOTFIX FOREMAN_REVIEW §1 Probe A) | This SPEC ADDS 6 NEW keys × 2 tenants = 12 perm rows + 36 role_permission rows (see §0.D) |

### 0.B — Probe pin-down (live values, 2026-05-15)

| Probe | Query / Command | Pinned result |
|---|---|---|
| P1 — M1B0 demo fixtures | `SELECT count(*) FROM <table> WHERE tenant_id='8d8cfa7e-…'` | demo_pos=2, demo_po_lines=4, demo_supplier_debt=1, demo_stock_lots=7, demo_purchase_receipts=4 ✅ |
| P2 — Foundation HTML pages at root | `ls lens-*.html` | `lens-active-designs.html` (4978B), `lens-catalog-admin.html` (11065B), `lens-inventory.html` (6792B), `lens-pricing.html` (5808B) ✅ |
| P2b — Foundation JS folders | `ls -d modules/lens-*/` | 4 folders present; `modules/lens-inventory/` = 5 files / 412 lines total ✅ |
| P3 — `lens.*` permissions seeded | `SELECT id FROM permissions WHERE id LIKE 'lens.%'` | 6 rows (3 keys × 2 tenants): `lens.designs.manage`, `lens.inventory.view`, `lens.pricing.manage` |
| P3b — `lens.*` role_permissions | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%'` | 18 rows ✅ (matches FOREMAN_REVIEW §1 Probe A) |
| P4 — M1B0 RPCs | `pg_get_function_arguments` for 5 RPCs | All 5 present: `place_purchase_order(p_tenant_id, p_supplier_id, p_lines jsonb, p_expected_delivery_at date DEFAULT NULL, p_notes text DEFAULT NULL, p_created_by uuid DEFAULT NULL)`, `mark_po_sent(p_tenant_id, p_po_id)`, `cancel_purchase_order(p_tenant_id, p_po_id, p_reason text)`, `m1_create_receipt_from_box(p_tenant_id, p_supplier_id, p_delivery_note_number, p_lines jsonb, p_box_id DEFAULT NULL, p_box_supplier_barcode DEFAULT NULL, p_supplier_number DEFAULT NULL, p_confirmed_by DEFAULT NULL)`, `m1_create_supplier_debt_from_receipt(p_tenant_id, p_purchase_receipt_id, p_total_amount, p_vat_amount, p_currency_code DEFAULT 'ILS')`. Plus utility RPCs: `next_po_number(p_tenant_id, p_supplier_number)`, `next_lot_number(p_tenant_id)`, `next_receipt_number(p_tenant_id, p_supplier_number)`, `record_adjustment_found`, `record_stock_movement` ✅ |
| P4b — K3 trigger | `SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%m9%'` | `m9_lens_received_for_sale_order_trg` on `stock_movement` ✅ |
| P5 — `tenant_lens_stock.reorder_threshold` | column lookup | **Present** — `reorder_threshold INTEGER` (NULLable, no default). PO screen edits this column directly |
| P6 — PDF pattern | `Grep "window.print" --include="*.{js,html}"` | 3 hits: `suppliers-debt.html`, `modules/debt/ai/ai-weekly-report.js`, `modules/shipments/shipments-manifest.js` — vanilla `window.print()` + print stylesheet is the established Optic Up pattern (no jsPDF, no html2canvas dep) |
| P7 — `pin-auth` EF | `ls supabase/functions/pin-auth/` | `index.ts` (7231 bytes) — present and is the canonical PIN→JWT mint path used by `auth-service.js:verifyEmployeePIN` |
| P8 — URL-param pattern | `Grep "URLSearchParams\|urlParams" js/shared.js` | `js/shared.js:79-80` — `urlParams = new URLSearchParams(window.location.search); urlSlug = urlParams.get('t')`. Established pattern, reusable for ➕ deep-link |
| P9 — `purchase_receipt_line` discrepancy + manual cols | column lookup | **All present:** `discrepancy_qty INT`, `discrepancy_reason TEXT`, `discrepancy_status TEXT`, `is_manual_addition BOOLEAN`, `ordered_qty INT`. The K2 RPC `m1_create_receipt_from_box` already handles discrepancy + manual line semantics |
| P10 — Legacy GR folder for UX reference | `ls modules/goods-receipts/` | Present (D-M1-09 — UX-pattern reference per Brief). `modules/purchase-orders/` does NOT exist (no legacy PO screen — net-new in this SPEC) |

### 0.C — Existing role_permissions matrix (pinned, 2026-05-15)

The 18 `lens.*` role_permissions rows currently shipped (foundation hotfix):

| permission_id | demo roles | prizma roles |
|---|---|---|
| `lens.inventory.view` | ceo, manager, team_lead, viewer, worker (5) | ceo, manager, team_lead, viewer, worker (5) |
| `lens.designs.manage` | ceo, manager (2) | ceo, manager (2) |
| `lens.pricing.manage` | ceo, manager (2) | ceo, manager (2) |

**Total: 9 demo + 9 prizma = 18 rows.** This SPEC EXTENDS this matrix; it does not modify existing rows.

### 0.D — Permission seed triplet plan (per Activation Prompt §1)

The Activation Prompt mandates the **permission seed triplet** for ANY new screen: (a) `permissions` row + (b) `role_permissions` for appropriate roles + (c) verified `employee_roles` wiring for demo CEO + Prizma CEO. This SPEC's plan:

**(a) New permission rows (6 keys × 2 tenants = 12 INSERTs):**

| permission_id | module | action | name_he |
|---|---|---|---|
| `lens.po.create` | lens | po.create | יצירת הזמנת רכש |
| `lens.po.view` | lens | po.view | צפייה בהזמנות רכש |
| `lens.po.cancel` | lens | po.cancel | ביטול הזמנת רכש |
| `lens.gr.create` | lens | gr.create | יצירת קבלת סחורה |
| `lens.gr.add_manual_line` | lens | gr.add_manual_line | הוספת שורה ידנית בקבלה |
| `lens.inventory.adjust` | lens | inventory.adjust | התאמת מלאי (PIN) |

**(b) Role assignments per Activation Prompt + role-tier discipline (matches foundation hotfix matrix):**

| permission_id | Granted to roles (per tenant) | Rows per tenant | Total rows |
|---|---|---|---|
| `lens.po.create` | ceo, manager | 2 | 4 |
| `lens.po.view` | ceo, manager, team_lead, viewer, worker | 5 | 10 |
| `lens.po.cancel` | ceo, manager | 2 | 4 |
| `lens.gr.create` | ceo, manager, team_lead, worker | 4 | 8 |
| `lens.gr.add_manual_line` | ceo, manager | 2 | 4 |
| `lens.inventory.adjust` | ceo, manager | 2 | 4 |
| **Total per tenant** | | **17** | **34** |

(Distribution rationale: create/cancel/manual-line/adjust = privileged ops → ceo+manager only. View = display-only → all roles. GR-create = receiving employee task → ceo+manager+team_lead+worker; viewer excluded because viewer is read-only by tenant-policy. No new keys for `team_lead`-only or `worker`-only — the matrix mirrors foundation hotfix's role tiers exactly per SaaS-litmus.)

**(c) Existing employee_roles wiring verification:**

Foundation hotfix Probe C confirmed `bb1961f7` (PIN 12345 demo) resolves to `ceo` role via the `LEGACY_ROLE_MAP[admin]='ceo'` fallback path (auth-service.js:75-78). The legacy `employees.role='admin'` for the 3 CEO/admin employees (demo: 2, prizma: 1) drives the role assignment via the LEGACY_ROLE_MAP fallback. No new employee_roles row is needed — the chain works as-is for existing CEOs.

**Pinned demo + prizma CEO/admin employees (live, 2026-05-15):**

| tenant | employee_id | name | legacy_role | resolves to |
|---|---|---|---|---|
| demo | `c009a03e-06e2-4a59-8e0d-bc75f5effa39` | מנהל ראשי (דמו) | admin | ceo |
| demo | `bb1961f7-98ac-4ee6-adef-401e08bb9a7c` | עובד בדיקה | admin | ceo |
| prizma | `cbaf6ed8-0c18-4cf8-afbd-cd04155f7bac` | מנהל ראשי | admin | ceo |

The Smoke verification (§3 SC #6 + #20) re-confirms each of these 3 employees resolves to `ceo` AND has all 6 new keys via `getEffectivePermissions()` SQL replay. If ANY of the 3 CEOs fails the SQL-replay check → STOP and escalate (this is exactly the gap that caused the foundation hotfix).

### 0.E — Runtime semantics rehearsal (per Step 1.5 §5.3)

This SPEC ships **0 NEW DDL** (per §0.G decision below) and **0 NEW RPCs** (decision: defer `force_mark_po_received` per Brief Q1 recommendation). All RPCs called are M1B0/Phase-1A-shipped and have already passed JWT-validation rehearsal at their original SPECs (M1B0_PURCHASE_ORDER_SCHEMA, M1A_OPERATIONS_RPCS_FIX). Therefore §5.3 NULL-comparison / view-flag / REVOKE rehearsal is N/A here. Pin: **Runtime semantics rehearsed: yes — no new function bodies, no view flips, no REVOKEs, all called RPCs are SECURITY DEFINER + JWT-claim-validated per their original SPEC's Foreman review.**

### 0.F — Status-column semantics probe (per Step 1.5 §5.3 status nuance)

`purchase_order.status` value distribution on demo (live, 2026-05-15): 2 rows visible (M1B0 fixtures). Expected lifecycle: `draft → sent → partial → fully_received → cancelled`. SC #16 exercises every transition explicitly. No semantic mismatch (the Brief's intent matches the column's actual usage).

`supplier_debt.status` on demo: 1 row exists. Expected values per M1B0 SPEC: `pending → partially_paid → paid`. SPEC does NOT modify any debt-status semantics; only reads totals.

### 0.G — Decision: 0 new RPCs Day-1

Per Brief Q1 ("`force_mark_po_received` — ship Day-1 or defer?"), Architect recommendation = defer. Module Strategist concurs:
- It is a manager-rare-edge-case override.
- Adding it would expand attack surface for nominal Day-1 value.
- M1B0 cancel + GR happy-path covers 99%+ of real-PO lifecycle needs.
- SPEC ships 0 new RPCs → also 0 new DDL → also no MIGRATION.md needed (per Brief SC #23).

If during smoke a real edge case fires that requires `force_mark_po_received` — STOP and escalate; do not improvise mid-SPEC.

### 0.H — Lessons applied from prior FOREMAN_REVIEW.md files

- **`M1B_FOUNDATION_PERMISSIONS_HOTFIX/FOREMAN_REVIEW.md` P-AUTHOR-1** (UI-level smoke MANDATORY for screen-gated SPECs) → APPLIED in §3 SC #20 + #21 + #22. The smoke matrix asserts role × key OUTCOME via SQL-replay of `getEffectivePermissions`, plus a UI-level smoke-via-Chrome positive AND negative test for every new permission gate.
- **`M1B_FOUNDATION_PERMISSIONS_HOTFIX/FOREMAN_REVIEW.md` P-AUTHOR-2** (Iron-Rule-32 heading shape) → APPLIED — this SPEC uses `## Destructive Operations` (not `## §7 …`). Pre-commit hook will accept.
- **`M1B_FOUNDATION_PERMISSIONS_HOTFIX/FOREMAN_REVIEW.md` P-EXEC-1** (HASPERMISSION_SMOKE_RECIPE.sql) → APPLIED in §3 SC #20 — the smoke replays `getEffectivePermissions` SQL inline (recipe codification deferred to executor; reusable from this SPEC's smoke output).
- **`M1B_FOUNDATION_PERMISSIONS_HOTFIX/FOREMAN_REVIEW.md` P-EXEC-2** (Windows PowerShell Hebrew encoding) → APPLIED — smoke uses UUIDs as authoritative identifiers; Hebrew names are display-only.
- **`M1A_OPERATIONS_RPCS_FIX/FOREMAN_REVIEW.md`** (Inner-call arity audit) → N/A — 0 new RPCs in this SPEC.
- **`M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md`** (Smoke-touched schema audit) → APPLIED — every column the smoke touches was probe-pinned in §0.B (`purchase_order_line.qty_received`, `purchase_receipt_line.discrepancy_qty`, `tenant_lens_stock.reorder_threshold`, `purchase_receipt_line.is_manual_addition`).
- **`MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1** (Shared Edit Block) → N/A — the 3 screens have unique HTML; no shared block.
- **`MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2** (Baselines as symbols) → APPLIED in §0.I.
- **`MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposals #1+#2** (Color-form completeness, Multi-form count criteria) → N/A — not a visual re-skin.
- **`SECURITY_HOTFIX_2/FOREMAN_REVIEW.md` P-AUTHOR-1+2** (Canonical JWT validation header, Runtime semantics rehearsal) → APPLIED in §0.E (rehearsal=N/A because 0 new function bodies).
- **`SECURITY_HOTFIX_3/FOREMAN_REVIEW.md` P-AUTHOR-1+2** (Status-column semantics probe, gitignore-aware backup folders) → APPLIED in §0.F (status probe done) + §6 (no backup folder needed — 0 destructive ops + 0 file deletes; Iron Rule 32 = None).

### 0.I — Baselines (referenced by §3 as `BASE_*`)

| Symbol | File / Source | Metric | Value (captured 2026-05-15) |
|---|---|---|---|
| `BASE_LENS_INV_MODALS_LINES` | `modules/lens-inventory/lens-inventory-modals.js` | `wc -l` | **32** (foundation stub) |
| `BASE_LENS_INV_TOTAL_LINES` | `modules/lens-inventory/*.js` | sum of `wc -l` | **412** (across 5 files) |
| `BASE_LENS_INV_HTML_BYTES` | `lens-inventory.html` | file size | **6792** bytes |
| `BASE_PERMS_LENS_ROWS` | `permissions WHERE id LIKE 'lens.%'` | row count | **6** (3 keys × 2 tenants) |
| `BASE_ROLE_PERMS_LENS_ROWS` | `role_permissions WHERE permission_id LIKE 'lens.%'` | row count | **18** |
| `BASE_DEMO_POS` | `purchase_order WHERE tenant_id=demo` | row count | **2** |
| `BASE_DEMO_PO_LINES` | `purchase_order_line WHERE tenant_id=demo` | row count | **4** |
| `BASE_DEMO_LOTS` | `stock_lot WHERE tenant_id=demo` | row count | **7** |
| `BASE_DEMO_RECEIPTS` | `purchase_receipt WHERE tenant_id=demo` | row count | **4** |
| `BASE_DEMO_DEBTS` | `supplier_debt WHERE tenant_id=demo` | row count | **1** |

### 0.J — Cross-Reference Check (Step 1.5 — Rule 21 enforcement at author time)

Names this SPEC introduces (collected for grep sweep against authoritative sources):

| Name | Type | Cross-ref result | Posture |
|---|---|---|---|
| `lens-purchase-order.html` | new file at root | grep against root files: not present | NEW (allowlist update needed) |
| `lens-pos-list.html` | new file at root | not present | NEW (allowlist update needed) |
| `lens-goods-receipt.html` | new file at root | not present | NEW (allowlist update needed) |
| `modules/lens-purchase-order/` | new folder | not present | NEW |
| `modules/lens-pos-list/` | new folder | not present | NEW |
| `modules/lens-goods-receipt/` | new folder | not present | NEW |
| `lens.po.create`, `lens.po.view`, `lens.po.cancel`, `lens.gr.create`, `lens.gr.add_manual_line`, `lens.inventory.adjust` | new permission keys | grep against `permissions` table | NEW (no collision with the 3 foundation keys) |
| `place_purchase_order`, `mark_po_sent`, `cancel_purchase_order`, `m1_create_receipt_from_box`, `m1_create_supplier_debt_from_receipt` | RPCs called | exist in DB (P4) | REUSED — extend |
| `record_adjustment_found`, `record_stock_movement` | RPCs called for ➖ | exist in DB (P4) | REUSED — extend |
| `next_po_number`, `next_lot_number`, `next_receipt_number` | RPCs (used internally by called RPCs) | exist in DB (P4) | REUSED — no direct call |
| `force_mark_po_received` | proposed new RPC | does NOT exist | DEFERRED (decision §0.G) |
| `LensPurchaseOrder`, `LensPosList`, `LensGoodsReceipt` | new global JS namespaces | grep against `modules/**/*.js`: not found | NEW (no collision) |

**Sweep result: 0 collisions / 14 hits resolved.** Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + DB live state.

### 0.K — Concurrent-Pipeline envelope (per harvested discipline)

This SPEC executes on `develop` while parallel SPECs may modify other files. Concurrency-safety:

- **Touched files are 100% net-new** (3 HTML + 3 JS folders) plus **only `modules/lens-inventory/lens-inventory-modals.js`** modified for ➕➖ wiring + **`scripts/checks/root-allowlist.json`** for the 3 new HTML page entries + 4 doc files (CHANGELOG, MODULE_MAP, MODULE_SPEC, SESSION_CONTEXT).
- **No conflicts expected** with: the active pre-existing dirty files at session start (architecture-brief/* additions, M4 audit, role overseer files) — none of those touch lens-inventory or root HTML.
- **DB writes scoped to `permissions` + `role_permissions`** for 6 keys + 34 rows on demo + prizma. No mutation to existing 6+18 foundation rows.
- **Pre-existing untracked surveyed:** ~70+ ?? files at session start (long architecture-brief/* lists across modules). The Executor will leave them alone — selective `git add` by filename throughout.

---

## 1. Goal

Ship the **procurement half** of Phase 1B: three write-heavy lens-procurement
screens (Purchase Order, Active POs List, Goods Receipt) wiring the M1B0
schema + RPCs through user-facing UI, plus wire the deferred ➕➖ buttons on
the foundation Inventory screen. Closes Phase 1B → unblocks M7 + M9 build.

---

## 2. Background & Motivation

`M1_LENS_PHASE_1B_FOUNDATION` (closed 🟢 2026-05-15) shipped 3 read-only customer-facing screens (Designs, Pricing, Inventory) + permission infrastructure for `lens.designs.manage`, `lens.inventory.view`, `lens.pricing.manage`. The deferred ➕➖ buttons on Inventory were intentionally stubbed out, awaiting Goods Receipt (the actual stock-movement flow).

`M1B0_PURCHASE_ORDER_SCHEMA` (closed earlier) shipped the procurement schema + 5 SECURITY DEFINER RPCs (`place_purchase_order`, `mark_po_sent`, `cancel_purchase_order`, `m1_create_receipt_from_box`, `m1_create_supplier_debt_from_receipt`) plus K2/K3 wiring (lab advancement queue trigger).

`M1B_FOUNDATION_PERMISSIONS_HOTFIX` (closed 🟢 2026-05-15) seeded the 18 foundation role_permissions and locked in the **UI-level smoke discipline** (P-AUTHOR-1 counter 1/3 active): screen-gated SPECs MUST verify role × key OUTCOME via SQL-replay AND a real-browser positive+negative test, not just JWT-direct correctness.

This SPEC composes those layers into 3 user-facing screens + smoke. After 🟢, Module 1 lens-procurement is functionally complete; M7 (orders) and M9 (lab) can begin building on the K2/K3 contracts that this SPEC's smoke proves end-to-end.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / source |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean at SPEC close | `git status --porcelain` → empty |
| 2 | Commits produced | 12–18 commits, single-concern, on develop | `git log <SPEC_START>..HEAD --oneline \| wc -l` |
| 3 | New HTML pages at root | 3 files: `lens-purchase-order.html`, `lens-pos-list.html`, `lens-goods-receipt.html` | `ls lens-purchase-order.html lens-pos-list.html lens-goods-receipt.html` exit 0 |
| 4 | Root allowlist updated | 3 new entries in `scripts/checks/root-allowlist.json` | `grep -c 'lens-purchase-order\|lens-pos-list\|lens-goods-receipt' scripts/checks/root-allowlist.json` ≥ 3 |
| 5 | New JS module folders | 3 folders: `modules/lens-purchase-order/`, `modules/lens-pos-list/`, `modules/lens-goods-receipt/` | `ls -d modules/lens-purchase-order modules/lens-pos-list modules/lens-goods-receipt` exit 0 |
| 6 | JS file counts per folder | PO: 5–8 files, POs List: 3–5 files, GR: 6–9 files (per Brief §2) | `ls modules/lens-purchase-order/ \| wc -l` etc. |
| 7 | No file > 350 lines | All `.html` and `.js` in scope ≤ 350 lines | `find lens-purchase-order.html lens-pos-list.html lens-goods-receipt.html modules/lens-{purchase-order,pos-list,goods-receipt}/ -name '*.js' -o -name '*.html' \| xargs wc -l \| awk '$1>350'` empty |
| 8 | New RPCs created | **0** (Day-1 decision §0.G — defer `force_mark_po_received`) | `git diff <SPEC_START>..HEAD --name-only \| grep '^supabase/migrations/'` empty |
| 9 | New DDL applied | **0** (no schema changes — pure UI + permission seeding) | DB advisor + `list_migrations` no new entries since SPEC_START |
| 10 | New permission rows | 12 rows = 6 keys × 2 tenants (`demo` + `prizma`) | `SELECT count(*) FROM permissions WHERE id IN (6 keys) AND tenant_id IN (demo, prizma)` = **12** |
| 11 | New role_permission rows | 34 rows per the §0.D matrix (17 demo + 17 prizma) | `SELECT count(*) FROM role_permissions WHERE permission_id IN (6 keys) AND tenant_id IN (demo, prizma) AND granted=true` = **34** |
| 12 | `BASE_PERMS_LENS_ROWS` extended (foundation untouched) | 6 → **18** rows total (`lens.*`) | `SELECT count(*) FROM permissions WHERE id LIKE 'lens.%'` = **18** |
| 13 | `BASE_ROLE_PERMS_LENS_ROWS` extended (foundation untouched) | 18 → **52** rows total (`lens.*`) | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%' AND granted=true` = **52** |
| 14 | DB wrapper used (Iron Rule 7) | 0 raw `sb.from()` direct calls in new JS (except documented specialized joins) | `grep -rn "sb.from(" modules/lens-{purchase-order,pos-list,goods-receipt}/` ≤ 5 (each documented inline with comment) |
| 15 | Each screen calls `requirePermission(key)` at page load | 3 hits | `grep -l "requirePermission\|hasPermission" modules/lens-{purchase-order,pos-list,goods-receipt}/*.js` 3 files |
| 16 | `purchase_order.status` lifecycle exercised | All 5 transitions (draft → sent → partial → fully_received → cancelled) hit in smoke | TEST_REPORT.md §Lifecycle |
| 17 | `supplier_debt.total_amount` calc verified | matches expected calc (sum of `qty_received × unit_cost × (1+vat_rate)` across receipt lines, ILS-only) for at least 1 GR | TEST_REPORT.md §SC15 — pin actual value vs computed value, ≤ ILS 0.01 delta |
| 18 | `tenant_lens_stock.reorder_threshold` editable from PO screen | At least 1 row updated via PO-screen UI; verified by DB read after the UI action | TEST_REPORT.md §SC18 |
| 19 | ➕ deep-link works | Click ➕ on Inventory → land on `lens-goods-receipt.html?variant_id=<uuid>&t=<slug>` with variant pre-selected | TEST_REPORT.md §SC19 + UI-screenshot/DOM-snippet |
| 20 | ➖ adjust requires PIN + creates `stock_movement(adjustment_lost)` | After ➖ flow on a stock variant: `pin-auth` EF call returns 200 + `stock_movement` row inserted with `movement_type='adjustment_lost'`, `qty_delta<0`, `qty_remaining` decreased on `stock_lot`, `qty_on_hand` decreased on `tenant_lens_stock` | TEST_REPORT.md §SC20 |
| 21 | **Functional smoke 14/14 PASS on demo** | All 14 Brief §2 / §6 steps green | TEST_REPORT.md §Phase A |
| 22 | **UI-level smoke 4/4 PASS via Claude-in-Chrome MCP as Prizma CEO** | All 4 screens (PO, POs List, GR, Inventory) render main content (NOT "אין הרשאה") with ?t=prizma; DOM snippet captured for each + zero console errors | TEST_REPORT.md §Phase B |
| 23 | **Permission OUTCOME smoke (P-AUTHOR-1 counter 1/3 → 2/3)** | For each of 6 NEW keys × 3 tested role-tier scenarios (CEO=positive, viewer=negative for view-only / worker=negative for create-only): SQL-replay of `getEffectivePermissions(employee_id)` returns expected boolean | TEST_REPORT.md §Phase C — at least 9 role × key outcome assertions, each with PASS/FAIL boolean |
| 24 | Anon-reject test | anon JWT calling any of `place_purchase_order`/`mark_po_sent`/`cancel_purchase_order`/`m1_create_receipt_from_box` → returns SQL error code `42501` (RLS) or RAISE | TEST_REPORT.md §SC24 |
| 25 | Cross-tenant guard test | Tenant-A JWT trying to call `cancel_purchase_order(p_tenant_id=tenant_B_id, p_po_id=tenant_B_po)` → RAISE / RLS reject | TEST_REPORT.md §SC25 |
| 26 | No new console errors | 0 red errors on each screen + each interaction in Phase B UI smoke | TEST_REPORT.md §Phase B per-screen `read_console_messages` |
| 27 | Zero Prizma data writes outside permission triplet | The only Prizma writes are the 17 permission seed rows | `SELECT count(*) FROM <write-tables> WHERE tenant_id=prizma_id AND created_at >= SPEC_START` matches expected = 17 (perm rows only) |
| 28 | No new HIGH/ERROR advisor lints | `scripts/audit/advisors-for-objects.mjs` reports 0 new HIGH/ERROR for any object touched | Executor runs the script and pins output |
| 29 | Iron Rule 31 (Integrity Gate) | exit 0 or 2 (no null-byte ERROR) at every commit + at SPEC close | `npm run verify:integrity; echo $?` → `0` or `2` |
| 30 | Iron Rule 32 (Destructive Operations) | declared as `None.` and not violated | `node scripts/checks/destructive-ops-declared.mjs` exit 0 + `git diff <SPEC_START>..HEAD` contains no `git rm`/`git rebase`/`reset --hard`/`DROP`/`TRUNCATE`/`DELETE` patterns |
| 31 | Module 1 ROADMAP | Phase 1B marked ✅ at SPEC close | `grep "Phase 1B" "modules/Module 1 - Inventory Management/MODULE_1_ROADMAP.md"` shows ✅ |
| 32 | Master docs updated | `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` reflect 3 new screens; module-level SESSION_CONTEXT + MODULE_SPEC + MODULE_MAP + CHANGELOG updated | EXECUTION_REPORT.md §Docs Update Checklist |
| 33 | EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW + ROLLBACK in SPEC folder | 6 files alongside this SPEC.md | `ls modules/Module\ 1\ -\ Inventory\ Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/` |
| 34 | MIGRATION.md (per harvested E1) | **Skipped** — 0 DDL applied per §0.G + SC #9 | EXECUTION_REPORT cites "SC #9 = 0 DDL → MIGRATION.md N/A" |

(34 SCs total. The Brief required 24+; this SPEC delivers 34 with explicit measurable values per the Authority Matrix template.)

### Heading note

This SPEC uses `## N. Title` for every section (no `§` prefix). The
Iron-Rule-32 hook accepts only `## Destructive Operations` or `## N. Destructive Operations`
forms — see §Destructive Operations below.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in either repo (`opticup` / `opticup-storefront`)
- Run read-only SQL (Level 1 autonomy)
- **Run scoped DML for permission seeding (Level 2 autonomy, pre-authorized for this SPEC)** — INSERTs into `permissions` + `role_permissions` for the 12+34 rows enumerated in §0.D. ON CONFLICT DO NOTHING per the foundation hotfix pattern.
- Create the 3 new HTML pages + 3 new JS folders + their content per Brief §2 mockups
- Modify `modules/lens-inventory/lens-inventory-modals.js` (replace foundation stub with real ➕➖ wiring)
- Modify `scripts/checks/root-allowlist.json` (add 3 new entries — pre-commit hook will reject otherwise)
- Modify the 4 module-level docs (SESSION_CONTEXT, MODULE_MAP, MODULE_SPEC, CHANGELOG, ROADMAP) at SPEC close
- Modify `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` at SPEC close (add-only)
- Commit + push to `develop` with selective `git add` by filename
- Run all standard verify scripts (`verify:integrity`, `verify --staged`, `verify --full`, `audit/advisors-for-objects.mjs`)
- Use Claude-in-Chrome MCP for Phase B UI-level smoke (read-only DOM/console inspection on already-authenticated browser session)
- Apply executor-improvement proposals from recent FOREMAN_REVIEWs that directly apply

### What REQUIRES stopping and reporting (escalation)

- Any DDL whatsoever (Level 3 — never autonomous; this SPEC declares 0 DDL)
- Creating any new RPC (this SPEC declares 0 — `force_mark_po_received` is deferred per §0.G)
- Any merge to `main` (Daniel-only)
- Any test failure that cannot be diagnosed in a single retry
- Any §3 SC actual value diverging from the Expected value
- Any §5 stop-trigger fires
- Touching Prizma tables OTHER than `permissions` + `role_permissions` (the 17 permission seed rows are the only authorized writes — SC #27)
- Touching foundation files OTHER than `modules/lens-inventory/lens-inventory-modals.js`
- Discovering a permission OUTCOME smoke negative (e.g., Prizma CEO does not resolve `lens.po.create=true` after seed) — STOP, escalate (this is exactly the foundation hotfix pattern; do NOT improvise a sub-SPEC mid-run)

---

## 5. Stop-on-Deviation Triggers (specific to this SPEC)

In addition to CLAUDE.md §9 globals:

- If `BASE_DEMO_POS` ≠ 2 OR `BASE_DEMO_LOTS` ≠ 7 OR `BASE_DEMO_DEBTS` ≠ 1 at executor Step 0 (M1B0 fixtures drifted) → STOP
- If `BASE_PERMS_LENS_ROWS` ≠ 6 OR `BASE_ROLE_PERMS_LENS_ROWS` ≠ 18 at executor Step 0 (foundation hotfix drifted) → STOP
- If any of the 3 CEO/admin employees in §0.D fails the `getEffectivePermissions()` SQL replay AFTER permission seed (resolves with < 6 NEW keys or wrong role_id) → STOP and escalate (foundation-hotfix-class regression)
- If `m1_create_receipt_from_box` returns an unexpected error during smoke step 3 → STOP (do not modify the RPC; this is M1B0/Phase-1A territory)
- If the K3 trigger `m9_lens_received_for_sale_order_trg` fires unexpectedly during smoke (e.g., on a non-sale-linked receipt) → STOP and inspect the trigger's WHEN clause; this is not in-scope to fix
- If `pin-auth` EF returns non-200 during ➖ smoke → STOP (do not modify the EF; this is project-wide)
- If `purchase_order.status` reaches an unexpected value other than the 5 documented transitions → STOP
- If smoke step 11 (cross-tenant guard) does NOT raise → CRITICAL stop (multi-tenant isolation is broken; this is an Iron Rule 14/15 violation)
- If any of the 4 UI-level Phase-B smoke screens shows "אין הרשאה" instead of main content → STOP (P-AUTHOR-1 trigger; the seed-triplet did not propagate to runtime)
- If the Concurrent-Pipeline envelope §0.K is breached (e.g., a parallel SPEC concurrently modifies any of the 4 lens-inventory files OR root-allowlist.json) → STOP, rebase or wait

---

## 6. Rollback Plan

**File-level rollback (HTML + JS + docs + allowlist):**

```bash
git tag spec-procurement-pre $(git rev-parse HEAD)  # captured at executor Step 0
# … on rollback trigger:
git reset --hard spec-procurement-pre
git push --force-with-lease origin develop  # ONLY with Daniel approval per Iron Rule
```

**DB-level rollback (12 perm rows + 34 role_permission rows):**

```sql
-- Revert ONLY the 6 new keys × 2 tenants
DELETE FROM role_permissions
WHERE permission_id IN ('lens.po.create','lens.po.view','lens.po.cancel','lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust')
  AND tenant_id IN ('8d8cfa7e-ef58-49af-9702-a862d459cccb','6ad0781b-37f0-47a9-92e3-be9ed1477e1c');
-- Verify count = 34 deleted
DELETE FROM permissions
WHERE id IN ('lens.po.create','lens.po.view','lens.po.cancel','lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust')
  AND tenant_id IN ('8d8cfa7e-ef58-49af-9702-a862d459cccb','6ad0781b-37f0-47a9-92e3-be9ed1477e1c');
-- Verify count = 12 deleted
-- Re-confirm BASE_PERMS_LENS_ROWS = 6 + BASE_ROLE_PERMS_LENS_ROWS = 18 (foundation untouched)
```

**Smoke-fixture rollback** (any test data this SPEC's smoke creates on demo):

```sql
-- Smoke creates: ~5 POs, ~10 PO lines, ~3 receipts, ~3-5 lots, ~3 debt rows
-- Rollback by capturing spec_start_ts at executor Step 0:
DELETE FROM stock_movement WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM supplier_debt WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM purchase_receipt_line WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM purchase_receipt WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM stock_lot WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM purchase_order_line WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
DELETE FROM purchase_order WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at >= '<spec_start_ts>';
-- Re-confirm BASE_DEMO_POS = 2, BASE_DEMO_LOTS = 7, BASE_DEMO_DEBTS = 1 (M1B0 untouched)
```

**Rollback-aware backup folder** (per harvested gitignore-aware discipline P-AUTHOR-2 of SECURITY_HOTFIX_3): N/A — this SPEC modifies only 1 existing file (`lens-inventory-modals.js` 32 lines), well below the "5 files OR 100 lines" Iron Rule §9 #9 trigger. No backup folder needed; git history + the spec_start tag suffice.

The Foreman is notified on any rollback trigger; SPEC is marked REOPEN, not CLOSED.

---

## Destructive Operations

**None.**

This SPEC performs:
- Net-new file creation (3 HTML + 3 JS folders, ~17–25 files total)
- One in-place modification of `modules/lens-inventory/lens-inventory-modals.js` (32→est-100 lines, replace foundation stub with real ➕➖ wiring)
- One in-place modification of `scripts/checks/root-allowlist.json` (3-line append)
- 4 doc updates (SESSION_CONTEXT, MODULE_MAP, MODULE_SPEC, CHANGELOG, ROADMAP — additions only)
- 2 GLOBAL_MAP/FILE_STRUCTURE updates (additions only)
- 12 INSERTs into `permissions` (ON CONFLICT DO NOTHING)
- 34 INSERTs into `role_permissions` (ON CONFLICT DO NOTHING per (role_id, permission_id, tenant_id) PK)
- Smoke-time INSERTs into 7 demo tables (rolled back at SPEC close per §6)

The Iron-Rule-32 hook (`scripts/checks/destructive-ops-declared.mjs`) MUST accept this section's heading text exactly as `## Destructive Operations`. Any deviation by the Executor (e.g., adding `git rm`, `DROP`, `TRUNCATE`, mass renames ≥ 5 files, `git rebase`, `reset --hard`, `git push --force`, deletion from governance docs, modifying main) → escalation file under `escalations/{ISO_TS}_{topic}.md` + halt.

---

## 7. Out of Scope (explicit)

- **The 3 foundation screens** (`lens-active-designs.html`, `lens-pricing.html`, `lens-inventory.html`). The only modification to a foundation file is `modules/lens-inventory/lens-inventory-modals.js` for ➕➖ wiring.
- **Quick-receipt modal** from the ➕ button. Deep-link to `lens-goods-receipt.html?variant_id=<uuid>&t=<slug>` instead, per Brief locked decision #2.
- **Auto-send PO to supplier** (email/WhatsApp/API). Phase 2+.
- **Custom-per-customer line wiring to M7 `sale_order`.** M7 not built; UI shows "מודול הזמנות (M7) טרם נבנה" placeholder per Brief.
- **Payment-allocation against `supplier_debt`.** M8 territory.
- **Discrepancy resolution workflow** (separate UI to investigate/accept/reject discrepancies). Phase 2+.
- **Reconciliation Agent.** Phase 2+.
- **FX conversion** in PO/GR totals. ILS-only Day-1.
- **Modifying mockups, decisions/M1.md, Phase 1 Brief.**
- **CLAUDE.md, MASTER_ROADMAP.md, OPEN_TASKS.md, TECH_DEBT.md** beyond Iron-Rule-mandated standard updates.
- **`lens-catalog-admin.html` or the 17 Phase 1A tables.** Read-only consumers.
- **Promotional discount engine** (time-windowed overlays).
- **Bulk PO creation across suppliers**. One PO = one supplier (current scope).
- **Soft-deleting completed POs.** Out-of-scope; deferred to Phase 2 housekeeping.
- **`force_mark_po_received` RPC.** Deferred per §0.G + Brief Q1 recommendation.
- **21 FK index parallel SPEC** (mentioned in Activation Prompt — handled separately).
- **Modifying mockups, M1A, M1B0 artifacts beyond the 1 file enumerated above.**
- **Prizma data writes** beyond the 17 permission triplet rows in §0.D.
- **Merge to main** (Daniel-only after Pipeline closes 🟢).

---

## 8. Expected Final State

### New files

**HTML pages at root (3):**
- `lens-purchase-order.html`
- `lens-pos-list.html`
- `lens-goods-receipt.html`

**JS module folders (3):**
- `modules/lens-purchase-order/` (5–8 files):
  - `lens-purchase-order-main.js` — entry, permission gate, init
  - `lens-purchase-order-supplier.js` — supplier picker (cascading)
  - `lens-purchase-order-shortages.js` — auto-fill from `tenant_lens_stock` where qty_on_hand < reorder_threshold (with editable threshold)
  - `lens-purchase-order-custom.js` — placeholder section for M7 custom-per-customer
  - `lens-purchase-order-manual.js` — manual line add/remove
  - `lens-purchase-order-create.js` — `place_purchase_order` RPC call + post-create UX
  - `lens-purchase-order-pdf.js` — `window.print()` + print stylesheet for PDF export

- `modules/lens-pos-list/` (3–5 files):
  - `lens-pos-list-main.js` — entry, permission gate, init
  - `lens-pos-list-table.js` — list rendering (po_number, supplier, ordered_at, expected_delivery_at, status, line count, total)
  - `lens-pos-list-actions.js` — row menu (cancel, view PDF, mark sent)
  - `lens-pos-list-filters.js` — status filter chips

- `modules/lens-goods-receipt/` (6–9 files):
  - `lens-goods-receipt-main.js` — entry, permission gate, init
  - `lens-goods-receipt-delivery-note.js` — delivery note input + PO fuzzy-match
  - `lens-goods-receipt-supplier.js` — supplier picker (auto-filled from PO match)
  - `lens-goods-receipt-lines.js` — expected-line render + qty adjust
  - `lens-goods-receipt-manual.js` — add manual line (`is_manual_addition=true`)
  - `lens-goods-receipt-shipping-box.js` — optional M9 link field
  - `lens-goods-receipt-close.js` — `m1_create_receipt_from_box` call + post-close UX
  - `lens-goods-receipt-pre-fill.js` — handles `?variant_id=...` deep-link from Inventory ➕

(Files may collapse if a sub-concern is < 30 lines; final count between 5–8/3–5/6–9 per Brief §2 ranges. SC #6 verifies.)

### Modified files

- `modules/lens-inventory/lens-inventory-modals.js` — replace foundation stub (32 lines) with real ➕➖ wiring (~80–120 lines):
  - ➕ → `window.location.href = 'lens-goods-receipt.html?variant_id=<id>&t=<slug>'`
  - ➖ → PIN modal (`pin-auth` EF) → confirm-quantity modal → `record_stock_movement(p_movement_type='adjustment_lost', p_qty_delta=-N, p_source_lot_id=<chosen>, …)` → toast + grid refresh
  - Both flows preserve the existing `LensInvModals` namespace exposed to other inventory files
- `scripts/checks/root-allowlist.json` — append 3 entries: `lens-purchase-order.html`, `lens-pos-list.html`, `lens-goods-receipt.html`
- `docs/GLOBAL_MAP.md` — add 3 lines under "Module 1 / Lens / procurement screens" listing the 3 new screens + their entry-point JS files
- `docs/FILE_STRUCTURE.md` — add 3 lines (one per new HTML at root) + 3 folder entries under `modules/`
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — Phase 1B closed
- `modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md` — Phase 1B procurement section: status `✅ closed`
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — 3 new screens + their function namespaces
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — Phase 1B procurement commit list
- `modules/Module 1 - Inventory Management/MODULE_1_ROADMAP.md` — Phase 1B procurement = ✅

### Deleted files

**None.** Iron Rule 32 = None.

### DB state (after smoke + rollback)

- `permissions`: +12 net rows (6 new keys × demo + prizma). Total `lens.*` = 18.
- `role_permissions`: +34 net rows. Total `lens.*` granted = 52.
- All other tables: pristine vs `BASE_*` after smoke-fixture rollback per §6.
- `migrations` table: NO new rows (0 DDL applied).

### Docs updated (MUST include)

- `docs/GLOBAL_MAP.md` ✅
- `docs/FILE_STRUCTURE.md` ✅
- Module 1 SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, CHANGELOG, ROADMAP ✅
- (NOT touched: CLAUDE.md, MASTER_ROADMAP.md, OPEN_TASKS.md, TECH_DEBT.md, GLOBAL_SCHEMA.sql — per §7)

---

## 9. Dependencies / Preconditions

- `M1_LENS_PHASE_1B_FOUNDATION` 🟢 closed (foundation HTML pages + JS folders + 18 perm rows)
- `M1B_FOUNDATION_PERMISSIONS_HOTFIX` 🟢 closed (foundation perm propagation verified)
- `M1B0_PURCHASE_ORDER_SCHEMA` 🟢 closed (5 RPCs + K2/K3 wiring shipped)
- `M1A_OPERATIONS_RPCS_FIX` 🟢 closed (RPC discipline established)
- `pin-auth` EF deployed to Supabase project `tsxrrxzmdxaenlvocyit` (probe P7 confirmed)
- Local dev stack available (`scripts/start-local.ps1` for ERP at :3000) — required for Phase B UI smoke
- Claude-in-Chrome MCP tab session authenticated as Prizma CEO (per Activation Prompt — for Phase B UI smoke; if not authenticated → executor can use ?t=demo + manual login as demo CEO 12345 instead, document the choice in TEST_REPORT.md per Activation Prompt §3)
- Credentials in `$HOME/.optic-up/credentials.env` for Supabase MCP + EF calls

---

## 10. Commit Plan

12–18 single-concern commits on `develop`. Suggested structure (executor may merge contiguous small concerns):

| # | Commit | Files | Concern |
|---|--------|-------|---------|
| 1 | `chore(spec): seal M1_LENS_PHASE_1B_PROCUREMENT SPEC + ACTIVATION_PROMPT` | this SPEC.md + brief activation_prompt copy in spec folder | SPEC sealed |
| 2 | `feat(m1.permissions): seed 6 new lens permission keys + 34 role_permissions on demo+prizma` | (data-only DML — verified via SQL, no migration file) | Permission triplet (a) + (b) |
| 3 | `chore(allowlist): root-allowlist.json — add 3 new lens-procurement entries` | scripts/checks/root-allowlist.json | Hook unblock |
| 4 | `feat(m1.lens-po): scaffold lens-purchase-order.html + main.js + supplier.js` | lens-purchase-order.html, modules/lens-purchase-order/{lens-purchase-order-main,supplier}.js | PO screen scaffold |
| 5 | `feat(m1.lens-po): shortages section + threshold edit (calls tenant_lens_stock UPDATE)` | modules/lens-purchase-order/lens-purchase-order-shortages.js | PO §2 step 2-stock-shortages |
| 6 | `feat(m1.lens-po): manual lines + custom placeholder + create flow (place_purchase_order)` | modules/lens-purchase-order/lens-purchase-order-{manual,custom,create}.js | PO §2 steps 2-manual + 4 |
| 7 | `feat(m1.lens-po): PDF export via window.print + print stylesheet` | modules/lens-purchase-order/lens-purchase-order-pdf.js + minor HTML print-css addition | PDF (Brief Q2 recommendation) |
| 8 | `feat(m1.lens-pos-list): scaffold + table + filters (display-only)` | lens-pos-list.html, modules/lens-pos-list/{main,table,filters}.js | POs List baseline |
| 9 | `feat(m1.lens-pos-list): row actions (cancel, view PDF, mark sent)` | modules/lens-pos-list/lens-pos-list-actions.js | POs List actions |
| 10 | `feat(m1.lens-gr): scaffold + delivery-note + supplier + lines render` | lens-goods-receipt.html, modules/lens-goods-receipt/{main,delivery-note,supplier,lines}.js | GR scaffold |
| 11 | `feat(m1.lens-gr): manual line + shipping-box + close flow (m1_create_receipt_from_box)` | modules/lens-goods-receipt/{manual,shipping-box,close}.js | GR transactional |
| 12 | `feat(m1.lens-gr): pre-fill from ?variant_id deep-link` | modules/lens-goods-receipt/lens-goods-receipt-pre-fill.js | GR ➕ deep-link target |
| 13 | `feat(m1.lens-inventory): wire ➕➖ buttons (deep-link + PIN-gated adjust)` | modules/lens-inventory/lens-inventory-modals.js (replace stub) | ➕➖ wiring (Brief §2 last bullet) |
| 14 | `test(m1.procurement): functional smoke 14/14 PASS on demo + UI smoke 4/4 + perm OUTCOME smoke 9/9` | TEST_REPORT.md only | Smoke evidence |
| 15 | `chore(spec): close M1_LENS_PHASE_1B_PROCUREMENT — EXECUTION_REPORT + FINDINGS + ROLLBACK + module docs + GLOBAL_MAP + FILE_STRUCTURE` | EXECUTION_REPORT.md, FINDINGS.md, ROLLBACK.md, 5 module docs, 2 global docs | Executor close |
| 16 | `chore(review): M1_LENS_PHASE_1B_PROCUREMENT REVIEW.md — 🟢/🟡/🔴 verdict` | REVIEW.md | Reviewer |
| 17 | `chore(spec): close M1_LENS_PHASE_1B_PROCUREMENT with FOREMAN_REVIEW — 🟢 verdict + Phase 1B sealed` | FOREMAN_REVIEW.md + Module 1 ROADMAP/SESSION_CONTEXT close-ceremony updates | Foreman + Phase 1B close |

If a sub-concern shrinks below 30 lines, it may merge upward (e.g., #6 absorbs #7's print-stylesheet snippet). Final count: target 12–17 commits. **Each commit MUST pass `npm run verify --staged` (Iron Rule 31 + 32 + permissions discipline + file-size).**

---

## 11. Lessons Already Incorporated (from prior FOREMAN_REVIEWs)

This list mirrors §0.H to satisfy the Authority Matrix's "every prior review proposal considered" discipline. Each line proves the proposal was either applied or correctly judged N/A:

- `M1B_FOUNDATION_PERMISSIONS_HOTFIX` **P-AUTHOR-1** (UI-level smoke for screen-gated SPECs) → APPLIED in §3 SC #20 + #22 + #23 (Phase A + Phase B + Phase C smoke matrix). Counter advances 1/3 → 2/3 with this SPEC.
- `M1B_FOUNDATION_PERMISSIONS_HOTFIX` **P-AUTHOR-2** (Iron-Rule-32 heading) → APPLIED — heading is `## Destructive Operations` (no `§`).
- `M1B_FOUNDATION_PERMISSIONS_HOTFIX` **P-EXEC-1** (HASPERMISSION_SMOKE_RECIPE) → APPLIED in §3 SC #23 — smoke replays `getEffectivePermissions` SQL inline; recipe codification = optional executor by-product.
- `M1B_FOUNDATION_PERMISSIONS_HOTFIX` **P-EXEC-2** (Windows PowerShell encoding) → APPLIED — UUIDs are authoritative throughout TEST_REPORT.md; Hebrew names display-only.
- `M1A_OPERATIONS_RPCS_FIX` (Inner-call arity audit) → N/A (0 new RPCs).
- `M1B0_PURCHASE_ORDER_SCHEMA` (Smoke-touched schema audit) → APPLIED in §0.B (every column probe-pinned).
- `MIGRATION_2_SETTINGS_PERMISSIONS` AP#1 (Shared Edit Block) → N/A (each screen unique).
- `MIGRATION_2_SETTINGS_PERMISSIONS` AP#2 (Baselines as symbols) → APPLIED in §0.I.
- `MIGRATION_4_STOREFRONT_STUDIO` AP#1+#2 (Color-form completeness, Multi-form count) → N/A (no visual re-skin).
- `SECURITY_HOTFIX_2` P-AUTHOR-1+2 (Canonical JWT header, Runtime semantics rehearsal) → APPLIED in §0.E (rehearsal=N/A — 0 new function bodies).
- `SECURITY_HOTFIX_3` P-AUTHOR-1+2 (Status-column probe, gitignore-aware backup) → APPLIED in §0.F + §6 (backup folder N/A — well below 5 files / 100 lines triggers).

---

## 12. Pre-Merge Checklist

Every item must be checked at SPEC close before EXECUTION_REPORT.md is committed. Any failure → SPEC stays open.

- [ ] All 34 §3 SCs PASS with actual values captured in EXECUTION_REPORT.md §2 (table form: SC# / Expected / Actual / PASS-FAIL / Evidence pointer)
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Destructive Operations (Iron Rule 32):** `node scripts/checks/destructive-ops-declared.mjs` exit 0 + this SPEC declared `None.`
- [ ] **Permission seed triplet** (per Activation Prompt §1): SC #10 = 12 + SC #11 = 34 + SC #23 (CEO outcome SQL replay) all PASS for BOTH demo + prizma
- [ ] **UI-level smoke** (per Activation Prompt §2): SC #22 = 4/4 screens render main content (NOT "אין הרשאה") on Prizma CEO browser session; DOM snippet + zero console errors captured per screen
- [ ] **Functional smoke** (Brief §2): SC #21 = 14/14 PASS on demo with TEST_REPORT.md captures
- [ ] `git status --short` returns empty (clean tree)
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md written in this SPEC folder
- [ ] Module 1 ROADMAP / SESSION_CONTEXT / MODULE_MAP / MODULE_SPEC / CHANGELOG updated
- [ ] `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` updated (add-only)
- [ ] No new HIGH/ERROR advisor lints (SC #28)
- [ ] Phase 1B marked ✅ in MODULE_1_ROADMAP.md (SC #31)
- [ ] Hebrew status line emitted to Daniel (per §11 hand-off)

---

*End of SPEC. 3 procurement screens + ➕➖ wiring + permission seed triplet (12+34) + 14-step functional + 4-screen UI + 9-row OUTCOME smoke matrix. Inherits all prior discipline. Closes Phase 1B in two SPECs total. Foreman reviews on close per opticup-strategic Post-Execution Review Protocol; Module 1 Close Ceremony per opticup-architect SKILL.md follows on 🟢.*
