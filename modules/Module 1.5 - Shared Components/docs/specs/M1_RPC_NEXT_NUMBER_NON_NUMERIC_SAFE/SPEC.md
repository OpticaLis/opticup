---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE
title: Harden 4 sequential-number RPCs against non-numeric suffix corruption
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1.5 - Shared Components
status: SEALED — ready for execution
parent_finding: modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/FINDINGS.md F-1
phase: Group B closeout — resolution of SPEC 8 blocking F-1
---

# SPEC — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Object | Exists | Notes |
|---|---|---|
| `public.next_lot_number(p_tenant_id uuid)` | ✅ | Body captured below |
| `public.next_receipt_number(p_tenant_id, p_supplier_number)` | ✅ | Body captured below |
| `public.next_po_number(p_tenant_id, p_supplier_number)` | ✅ | Body captured below |
| `public.next_transfer_number(p_tenant_id)` | ✅ | Body captured below |
| Target tables: `stock_lot, purchase_receipt, purchase_orders, stock_transfer` | ✅ | All present |

### Step 1.7 — Consumer grep on the 4 RPC names (JS + HTML, excluding archives + worktrees)

```
modules/purchasing/purchase-orders.js:209 — sb.rpc('next_po_number', ...)
```

Only **one** direct JS consumer: legacy frames-era `purchase-orders.js` (calls `next_po_number` for the frames module). The other 3 RPCs are server-side only:
- `next_lot_number` — called inside `m1_create_receipt_from_box` body
- `next_receipt_number` — called inside `m1_create_receipt_from_box` body
- `next_transfer_number` — called inside `record_transfer` body

**Zero JS contract changes needed.** The RPC signatures (param names, types, RETURN type) are preserved by every migration; only the WHERE clause inside each gains an additional predicate.

### Current RPC bodies (verbatim from `pg_get_functiondef`, 2026-05-18 IDT)

**1. `next_lot_number(p_tenant_id uuid)`:**
```sql
v_prefix := 'LOT-';
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(lot_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
  INTO v_max_seq
  FROM stock_lot
  WHERE tenant_id = p_tenant_id AND lot_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
RETURN v_new_number;
```

**2. `next_receipt_number(p_tenant_id uuid, p_supplier_number text)`:**
```sql
v_prefix := 'RCP-' || COALESCE(p_supplier_number, '0') || '-';
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
  INTO v_max_seq
  FROM purchase_receipt
  WHERE tenant_id = p_tenant_id AND receipt_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
RETURN v_new_number;
```

**3. `next_po_number(p_tenant_id uuid, p_supplier_number text)`:**
```sql
v_prefix := 'PO-' || p_supplier_number || '-';
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
  INTO v_max_seq
  FROM purchase_orders
  WHERE tenant_id = p_tenant_id AND po_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
RETURN v_new_number;
```

**4. `next_transfer_number(p_tenant_id uuid)`:**
```sql
v_prefix := 'TRN-';
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM LENGTH(v_prefix) + 1) AS INT)), 0)
  INTO v_max_seq
  FROM stock_transfer
  WHERE tenant_id = p_tenant_id AND transfer_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
RETURN v_new_number;
```

**All 4 share the identical defect class:** the `CAST(SUBSTRING(...) AS INT)` operation has no guard against rows whose suffix is non-numeric. On demo, 3 such rows exist (`LOT-PO300005-1/-2/-3`) — confirmed in SPEC 8 F-1.

### Sibling RPCs sharing the same pattern (out of strict scope but flagged in §13 for follow-up)

Live pre-flight identified 4 more RPCs with the identical CAST(SUBSTRING(...) AS INT) pattern but NOT named in Daniel's brief:

- `next_box_number` (`shipments.box_number`, prefix `'BOX-'`)
- `next_internal_doc_number` (`supplier_documents.internal_number`, dynamic prefix)
- `next_purchase_order_number` (`purchase_order.po_number`, prefix `'PO-'`) — SPEC 6's M1B0 PO generator
- `next_return_number` (`supplier_returns.return_number`, prefix `'RET-' || supplier_number || '-'`)

Foreman recommendation: a follow-up SPEC `M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2` (~30 min) extends the regex-guard to these 4. Out of THIS SPEC's scope per Daniel's brief; documented in §13.

### Baselines

| Symbol | Value |
|---|---|
| `BASE_RPC_COUNT_IN_SCOPE` | 4 |
| `BASE_NEW_FILTER_CLAUSE` | `AND SUBSTRING(<column> FROM LENGTH(v_prefix) + 1) ~ '^[0-9]+$'` |
| `EXPECTED_MIGRATION_FILES` | 4 (one per RPC, all CREATE OR REPLACE) |
| `BASE_CORRUPT_LOT_ROW_COUNT` | 3 (`LOT-PO300005-1`, `-2`, `-3`) |
| `EXPECTED_RECEIPT_NUMBER_AFTER_FIX` | `RCP-9016-0001` (first receipt for SHALDAG supplier_number=9016 on demo) |
| `EXPECTED_LOT_NUMBER_AFTER_FIX` | first row whose suffix is numeric, default `LOT-000001` (since all `LOT-` rows currently have non-numeric suffix on demo — regex filter returns empty, MAX returns NULL, COALESCE 0, +1 = 1) |

### Lessons applied from prior FOREMAN_REVIEWs

- **From M1_LENS_GOODS_RECEIPT_REBUILD F-1 (this morning):** the defect surfaced because seeded test data was non-conforming. The fix must tolerate non-conforming data without crashing — defensive parsing at the SQL layer.
- **From M1_FOUNDATION_CLOSE_CLEANUP** (signature consolidation pattern): keep migrations atomic and reversible — one RPC per migration file.
- **From M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX** (today): zero JS changes minimize blast radius — RPC body changes only.

---

## 1. Goal

Add a regex guard `~ '^[0-9]+$'` to the WHERE clause of each of the 4 named `next_*_number` RPCs so that rows with non-numeric suffixes (test seeds, legacy imports, etc.) are silently filtered out before the `MAX(CAST(... AS INT))` step. This makes the sequence-number generators resilient to ad-hoc data without changing their return signatures or contracts. Resolves SPEC 8 F-1 HIGH blocker.

## 2. Background

`m1_create_receipt_from_box`, `record_transfer`, and the legacy frames `purchase-orders.js` all rely on these sequential-number RPCs. The SQL pattern they use (`MAX(CAST(SUBSTRING(...) AS INT))`) assumes every row matching the prefix has a numeric suffix. This was true for production data but is silently violated by seeded test rows on demo (3 corrupt `LOT-PO300005-*` rows). The fix is a one-line additional predicate per RPC.

The 4 RPCs are shared across multiple M1 sibling modules (lens-inventory, lens-purchase-order, lens-goods-receipt, frames purchase-orders, lens-transfers if/when shipped). Hence the SPEC lives under **Module 1.5** (shared components / cross-module infrastructure), not under any single M1 child module. See §11.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3 (author + DDL + close) |
| S3 | 4 migration files in `supabase/migrations/` | `ls supabase/migrations/*next_*number_non_numeric*.sql` | exactly 4 |
| S4 | Each RPC body contains the regex guard | `pg_get_functiondef(p.oid) ~ '\^\[0-9\]\+\$'` for all 4 | 4 / 4 |
| S5 | Each RPC retains the same signature (params + return type) | `pg_get_function_identity_arguments(p.oid)` matches pre-flight | 4 / 4 |
| S6 | No new RPC names introduced | `grep -c 'CREATE OR REPLACE FUNCTION public.next_'` in migrations | exactly 4 |
| S7 | SPEC 8 blocked smoke now succeeds | `m1_create_receipt_from_box` on demo returns receipt_id | row created |
| S8 | Inserted receipt's `receipt_number` matches `^RCP-\d+-\d+$` pattern | DB query | yes |
| S9 | Inserted stock_lot's `lot_number` matches `^LOT-\d{6}$` pattern (NOT one of `LOT-PO300005-*`) | DB query | yes |
| S10 | 3 corrupt demo rows untouched (filter only IGNORES; no UPDATE/DELETE) | `SELECT count(*) FROM stock_lot WHERE lot_number LIKE 'LOT-PO300005-%'` | still 3 |
| S11 | get_advisors(security) post-migration | no new HIGH/ERROR | confirmed |
| S12 | Integrity gate exit 0 at every commit | `npm run verify:integrity` | exit 0 |
| S13 | Iron Rule 32 (destructive ops declared) | pre-commit hook | 0 violations |
| S14 | Tier C SPEC 8 smoke creates `purchase_receipt` row + at least 1 `stock_lot` row linked back via `purchase_receipt_id` | DB | both confirmed |
| S15 | Smoke cleanup soft-deletes the receipt + stock_lots created | UPDATE … is_deleted | done |
| S16 | Group A regression check (SPEC 6 PO create still works) | tabs load, console clean | confirmed |
| S17 | SPEC 8 FOREMAN_REVIEW exists with F-1 RESOLVED + verdict upgrade 🟡 → 🟢 | file present + content match | yes |
| S18 | EXECUTION_REPORT + FINDINGS for this SPEC present | `ls` | yes |

## 4. Destructive Operations

**4 `CREATE OR REPLACE FUNCTION` migrations** — each replaces the RPC body in place, signature unchanged. Reversible by re-running the pre-flight body capture (saved verbatim in §0).

1. `CREATE OR REPLACE FUNCTION public.next_lot_number(p_tenant_id uuid) RETURNS text ...`
2. `CREATE OR REPLACE FUNCTION public.next_receipt_number(p_tenant_id uuid, p_supplier_number text) RETURNS text ...`
3. `CREATE OR REPLACE FUNCTION public.next_po_number(p_tenant_id uuid, p_supplier_number text) RETURNS text ...`
4. `CREATE OR REPLACE FUNCTION public.next_transfer_number(p_tenant_id uuid) RETURNS text ...`

**Forbidden:**
- Any `DROP FUNCTION` (would break dependent RPCs / triggers — use CREATE OR REPLACE only)
- Any signature change (param list, return type)
- Any change to the 4 sibling RPCs (out of scope per Daniel — flagged in §13 for follow-up)
- Any UPDATE/DELETE on `stock_lot` / `purchase_receipt` / `purchase_orders` / `stock_transfer` (we IGNORE corrupt rows, not fix them)
- Any change to existing GRANTs (no REVOKE/GRANT statements)

## 5. Autonomy Envelope

**Can do without asking:**
- Apply 4 `apply_migration` calls via Supabase MCP
- Verify each RPC body post-migration via `pg_get_functiondef`
- Run S7-S10 Tier C smoke via Chrome MCP on the Goods Receipt tab (re-run SPEC 8's blocked flow)
- Run S14 verification via Supabase MCP
- Run S16 regression check (SPEC 6/7 tabs load)
- Run `get_advisors(security)` for S11
- Soft-delete smoke receipt + stock_lots via `execute_sql` (Iron Rule 3)
- 3 commits per §10

**MUST stop and report:**
- Any of the 4 `apply_migration` calls fails
- `pg_get_functiondef` post-migration does NOT contain the regex guard
- S5 signature check shows signature drift
- Smoke RPC STILL fails after all 4 migrations land
- Any new advisor entry on the 4 RPCs after migration
- Iron Rule 32 hook fires (this SPEC declares §4 destructive ops — should pass)

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If any of the 4 RPCs has been touched by another commit since the §0 capture → STOP, re-capture
- If a smoke receipt creates a row but `lot_number` matches one of `LOT-PO300005-%` → STOP (regex didn't apply)
- If the 4 sibling RPCs (next_box_number, next_internal_doc_number, next_purchase_order_number, next_return_number) get modified by accident → STOP, scope creep

## 7. Out of Scope (explicit)

- The 4 sibling RPCs (flagged in §13 for follow-up; Daniel's brief named 4)
- Any change to `m1_create_receipt_from_box` / `record_transfer` / other K-RPC callers
- Any data cleanup on the 3 corrupt `stock_lot` rows (we filter, not fix; if cleanup is desired it's a separate SPEC)
- Any RLS / policy change
- Any view change
- Any JS code change (existing JS consumer `modules/purchasing/purchase-orders.js` unchanged)
- Adding a `SECURITY INVOKER` flag flip (not requested)

## 8. QA / Tier C Verification Plan

1. After all 4 migrations land, query `pg_proc` to confirm each body contains the regex guard.
2. Verify signatures match pre-flight (no param/return drift).
3. Run `get_advisors(security)` — confirm no new HIGH/ERROR.
4. Chrome MCP: navigate to demo Goods Receipt tab (`?t=demo&cat=lenses&tab=goods-receipt`).
5. Pick SHALDAG supplier (same as SPEC 8 attempt) — 3 lines auto-load.
6. Fill `DN="DN-VFV-2026-001"` + click "✅ אשר וצור רשומות מלאי".
7. Verify Toast success + DB query confirms `purchase_receipt` row inserted with `receipt_number` matching `^RCP-9016-\d+$`.
8. Verify at least 1 `stock_lot` inserted with `lot_number` matching `^LOT-\d{6}$` (six-digit numeric, NOT `LOT-PO300005-*`).
9. Verify `purchase_receipt_id` FK on stock_lot links back to the new receipt row.
10. Sanity-check the 3 corrupt rows are untouched (still 3 rows with `LOT-PO300005-%`).
11. Cleanup: soft-delete the smoke receipt + linked stock_lots.
12. Regression check: open SPEC 6 PO tab + SPEC 7 POs List tab; verify no console errors and previous behavior intact.
13. Take ≥ 2 screenshots: (a) post-receipt-close Toast / status badge, (b) DB verification (or browser screenshot showing the new receipt in the POs List).

## 9. Expected Final State

### Repo
- 4 new files in `supabase/migrations/` (one per RPC)
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT.md + FINDINGS.md + screenshots/
- SPEC 8 folder updated with FOREMAN_REVIEW.md (F-1 RESOLVED + 🟡 → 🟢)
- Module 1 SESSION_CONTEXT + CHANGELOG updated to reflect Group B 100% COMPLETE
- Module 1.5 SESSION_CONTEXT updated with this SPEC

### DB
- 4 RPC bodies updated in place via CREATE OR REPLACE
- Zero data changes (filter ignores corrupt rows; the 3 LOT-PO300005-* rows remain untouched)
- 1 transient Tier C smoke receipt + stock_lots soft-deleted post-test

### Docs
- `docs/GLOBAL_MAP.md`: no change needed (RPC names + signatures unchanged)
- `docs/GLOBAL_SCHEMA.sql`: updated at next Integration Ceremony (RPC body changes are tracked in migrations)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE SPEC` | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `fix(db): harden 4 next_*_number RPCs against non-numeric suffix corruption` | 4 migration .sql files |
| 3 | `chore(spec): close M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE + upgrade SPEC 8 verdict 🟡→🟢` | EXECUTION_REPORT + FINDINGS + screenshots + SPEC 8 FOREMAN_REVIEW.md + SESSION_CONTEXT + CHANGELOG |

Total: **3 commits**.

## 11. Pipeline Coordination + Placement Decision

`files_owned_globs` for `pipeline-coordination.mjs claim`:
```
supabase/migrations/**
modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_GOODS_RECEIPT_REBUILD/FOREMAN_REVIEW.md
modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md
modules/Module 1 - Inventory Management/docs/CHANGELOG.md
modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md
```

Branch: `develop`. Path X sequential.

**Placement decision (per Daniel's explicit instruction):** This SPEC lives under **Module 1.5 — Shared Components**, not Module 1. Rationale:
1. The 4 RPCs are shared infrastructure used by multiple M1 sibling modules: `lens-inventory` (no direct call but reads stock_lot), `lens-purchase-order` (next_po_number for frames variant; next_purchase_order_number for lens M1B0), `lens-goods-receipt` (next_lot_number + next_receipt_number via K2 RPC), `lens-transfers` (when shipped, next_transfer_number).
2. Any future module (lens-returns, accessory-receipt, frames-receipt, etc.) that needs sequential numbers will reuse these same RPCs.
3. The fix's blast radius is cross-module: by placing the SPEC under M1.5, the closure artifact is discoverable from any consumer module's perspective.
4. The pattern matches prior M1.5 SPECs (e.g., `M1_5_SHARED_COMPONENTS_PHASE_0`, `M1_5_CAT_SIDEBAR_COMPONENT`) — Module 1.5 is the home for cross-module infrastructure.

## 12. Rollback Plan

If any migration fails or a smoke regression is detected:
- Re-apply the pre-flight body verbatim (saved in §0) via 4 CREATE OR REPLACE migrations reversing the change.
- Two commits: `revert: revert M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE migrations` + `chore(spec): reopen M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE`.
- Smoke row (if any): soft-delete.

If 3 of 4 migrations land cleanly but 1 fails:
- Roll back ALL 4 (preserve consistency).
- Don't ship a partial set.

## 13. Recommended Follow-up (out of scope here)

**`M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2`** (~30 min): apply the same regex guard to the 4 sibling RPCs:
- `next_box_number(shipments.box_number)` — prefix `'BOX-'`
- `next_internal_doc_number(supplier_documents.internal_number)` — prefix dynamic
- `next_purchase_order_number(purchase_order.po_number)` — prefix `'PO-'` (M1B0 lens PO generator, used by SPEC 6)
- `next_return_number(supplier_returns.return_number)` — prefix `'RET-' || supplier_number || '-'`

Foreman recommendation: dispatch after the current SPEC closes 🟢. Same author pattern, same execution shape, ~30 min. Eliminates the entire defect class across all 8 sequence-number RPCs in the project.

## 14. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written for THIS SPEC
- [ ] SPEC 8 FOREMAN_REVIEW.md written with F-1 RESOLVED
- [ ] Module 1 SESSION_CONTEXT + CHANGELOG mark SPEC 8 verdict upgrade 🟡 → 🟢
- [ ] Module 1.5 SESSION_CONTEXT updated with this SPEC
- [ ] Smoke receipt + stock_lots soft-deleted (Iron Rule 3)
- [ ] get_advisors(security) clean

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Step 1.6 (paths verified) + Step 1.7 (1 JS consumer found, 3 server-side only) + 4-RPC body capture all in §0. Foreman placement decision (M1.5 not M1) documented in §11. 4 sibling RPCs flagged for Phase 2 follow-up in §13._
