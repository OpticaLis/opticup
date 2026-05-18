---
spec_id: M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2
title: Extend non-numeric-suffix regex guard to 4 sibling sequential-number RPCs
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1.5 - Shared Components
status: SEALED — ready for execution
parent_spec: modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE/SPEC.md
phase: Resilience Phase 2 — closes the defect class across all 8 next_*_number RPCs
---

# SPEC — M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Object | Exists | Notes |
|---|---|---|
| `public.next_box_number(p_tenant_id uuid)` | ✅ | Body captured below; reads `shipments.box_number` |
| `public.next_internal_doc_number(p_tenant_id, p_prefix text DEFAULT 'DOC')` | ✅ | Body captured below; reads `supplier_documents.internal_number`; dynamic prefix |
| `public.next_purchase_order_number(p_tenant_id)` | ✅ | Body captured below; reads `purchase_order.po_number`; used by SPEC 6 |
| `public.next_return_number(p_tenant_id, p_supplier_number text)` | ✅ | Body captured below; reads `supplier_returns.return_number`; supplier-scoped prefix |
| Target tables (`shipments`, `supplier_documents`, `purchase_order`, `supplier_returns`) | ✅ | All present; all have `is_deleted` column |

### Step 1.7 — Consumer grep on the 4 RPC names

```
modules/lens-purchase-order/lens-purchase-order-create.js   — calls next_purchase_order_number via place_purchase_order (server-side; no direct JS call)
shared/js/ + supabase/migrations/ — no direct JS callers for next_box_number / next_internal_doc_number / next_return_number
```

All 4 are called server-side from K-RPC bodies (`m1_create_receipt_from_box`, `place_purchase_order`, frames-era shipment + return + document flows). **Zero JS contract changes needed.** Signatures preserved by every migration.

### Current RPC bodies (verbatim from `pg_get_functiondef`, 2026-05-18 IDT — captured in Phase 1's §0)

**1. `next_box_number(p_tenant_id uuid)`:**
```sql
v_max INTEGER;
PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(box_number FROM 5) AS INTEGER)), 0) INTO v_max
FROM shipments WHERE tenant_id = p_tenant_id AND box_number LIKE 'BOX-%' AND is_deleted = false;
RETURN 'BOX-' || LPAD((v_max + 1)::TEXT, 4, '0');
```
**Special note:** This RPC already filters `is_deleted = false`. Other 3 RPCs in scope do NOT filter `is_deleted` — but that's a separate concern (out of scope; aligned with Phase 1).

**2. `next_internal_doc_number(p_tenant_id uuid, p_prefix text DEFAULT 'DOC')`:**
```sql
v_max_seq INT; v_new_number TEXT;
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(internal_number FROM LENGTH(p_prefix) + 2) AS INT)), 0) INTO v_max_seq
FROM supplier_documents WHERE tenant_id = p_tenant_id AND internal_number LIKE p_prefix || '-%';
v_new_number := p_prefix || '-' || LPAD((v_max_seq + 1)::TEXT, 5, '0');
RETURN v_new_number;
```
**Special note:** SUBSTRING uses `LENGTH(p_prefix) + 2` (the +2 accounts for the dash after the prefix). The regex guard must mirror this offset.

**3. `next_purchase_order_number(p_tenant_id uuid)`:**
```sql
v_max_seq INT; v_prefix TEXT := 'PO-'; v_new_number TEXT;
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM LENGTH(v_prefix) + 1) AS INT)), 0) INTO v_max_seq
FROM purchase_order WHERE tenant_id = p_tenant_id AND po_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 6, '0');
RETURN v_new_number;
```

**4. `next_return_number(p_tenant_id uuid, p_supplier_number text)`:**
```sql
v_max_seq INT; v_prefix TEXT; v_new_number TEXT;
v_prefix := 'RET-' || p_supplier_number || '-';
PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE;
SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INT)), 0) INTO v_max_seq
FROM supplier_returns WHERE tenant_id = p_tenant_id AND return_number LIKE v_prefix || '%';
v_new_number := v_prefix || LPAD((v_max_seq + 1)::TEXT, 4, '0');
RETURN v_new_number;
```

### DB pre-flight: pre-existing corrupt rows on demo (live 2026-05-18 IDT)

```
-- next_box_number   (shipments.box_number, prefix 'BOX-', SUBSTRING FROM 5): 0 corrupt rows
-- next_purchase_order_number (purchase_order.po_number, prefix 'PO-', SUBSTRING FROM 4): 0 corrupt rows
-- next_internal_doc_number / next_return_number (variable prefix): not probed pre-flight (would require per-prefix analysis)
```

No pre-existing corruption blocks the regex guard on demo — Tier C will INJECT deliberate corrupt rows to prove the guard works empirically.

### Baselines

| Symbol | Value |
|---|---|
| `BASE_RPC_COUNT_IN_SCOPE` | 4 |
| `BASE_GUARD_PATTERN` | `AND SUBSTRING(<col> FROM <offset>) ~ '^[0-9]+$'` |
| `EXPECTED_MIGRATION_FILES` | 4 |
| `EXPECTED_TIER_C_INJECTIONS` | 4 (1 corrupt row + RPC call + cleanup per RPC) |

### Lessons applied from Phase 1

- **From M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE (Phase 1, this morning):** the regex guard pattern `~ '^[0-9]+$'` cleanly excludes non-conforming rows from `MAX()` aggregation without DDL or data cleanup. Apply identical pattern.
- **From Phase 1 F-1 INFO (Tier C K-RPC side-effects):** when calling a sequential-number RPC via SECURITY DEFINER + JWT check, must set `request.jwt.claims` via `set_config(...)` to satisfy the tenant guard. Apply per RPC in §8.
- **From SPEC 8 F-1 + Phase 1 F-1:** insert deliberate corrupt rows in Tier C to empirically prove the regex guard works (the corrupt-row + clean-call pattern).

---

## 1. Goal

Close the defect class across all 8 `next_*_number` RPCs by extending the Phase 1 regex guard `~ '^[0-9]+$'` to the 4 sibling RPCs (`next_box_number`, `next_internal_doc_number`, `next_purchase_order_number`, `next_return_number`). After this SPEC closes, no `next_*_number` RPC in the project can crash on non-numeric suffix data.

## 2. Background

Phase 1 hardened 4 RPCs that were on the SPEC 8 critical path. The defect pattern (`MAX(CAST(SUBSTRING(...) AS INT))` without numeric-suffix guard) is identical in 4 sibling RPCs used by frames-era shipments, supplier documents, the lens M1B0 PO generator, and supplier returns. Phase 2 forecloses the defect across the entire family.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3 |
| S3 | 4 migration files | `ls supabase/migrations/*phase_2*non_numeric*.sql` | exactly 4 |
| S4 | Each RPC body contains the regex guard | `pg_get_functiondef ~ '\^\[0-9\]\+\$'` for all 4 | 4/4 |
| S5 | Each signature preserved | `pg_get_function_identity_arguments` matches pre-flight | 4/4 |
| S6 | Tier C empirical proof — next_box_number: inject `BOX-PO123-X` corrupt row → call RPC → returns `BOX-{numeric:0001 or +1 of existing max}` | DB | numeric output |
| S7 | Tier C — next_internal_doc_number: inject `DOC-WRONG-X` → call RPC with `p_prefix='DOC'` → returns `DOC-{numeric}` | DB | numeric output |
| S8 | Tier C — next_purchase_order_number: inject `PO-WRONG-X` → call RPC → returns `PO-{numeric}` | DB | numeric output |
| S9 | Tier C — next_return_number: inject `RET-9016-WRONG` → call RPC with `p_supplier_number='9016'` → returns `RET-9016-{numeric}` | DB | numeric output |
| S10 | Each Tier C cleanup soft-deletes the injected row | `is_deleted = true` on 4 rows | confirmed |
| S11 | get_advisors(security) post-migration | no new HIGH/ERROR | confirmed |
| S12 | Integrity gate exit 0 | every commit | confirmed |
| S13 | Iron Rule 32 — 0 violations | pre-commit hook | confirmed |
| S14 | Group A + B regression check | PO + POs List + GR tabs load cleanly | confirmed |
| S15 | EXECUTION_REPORT + FINDINGS present | `ls` | yes |
| S16 | Module 1.5 SESSION_CONTEXT + CHANGELOG updated | grep | entries appended |

## 4. Destructive Operations

**4 `CREATE OR REPLACE FUNCTION` migrations** — each adds regex guard, signature unchanged. Reversible by re-running the pre-fix body captured verbatim in §0.

1. `CREATE OR REPLACE FUNCTION public.next_box_number(p_tenant_id uuid) RETURNS text ...`
2. `CREATE OR REPLACE FUNCTION public.next_internal_doc_number(p_tenant_id uuid, p_prefix text DEFAULT 'DOC') RETURNS text ...`
3. `CREATE OR REPLACE FUNCTION public.next_purchase_order_number(p_tenant_id uuid) RETURNS text ...`
4. `CREATE OR REPLACE FUNCTION public.next_return_number(p_tenant_id uuid, p_supplier_number text) RETURNS text ...`

**Tier C also performs:**
- 4 `INSERT` of deliberate corrupt-suffix rows (1 per table) — TRANSIENT smoke data
- 4 `UPDATE ... is_deleted=true` (Iron Rule 3) — cleanup of the injected rows

**Forbidden:**
- DROP FUNCTION
- Any signature change
- Any other RPC modification (only the 4 in scope)
- Any UPDATE/DELETE on legitimate production rows (the 4 injected rows are explicitly transient)

## 5. Autonomy Envelope

**Can do without asking:**
- Apply 4 `apply_migration` via Supabase MCP
- Verify post-migration via `pg_get_functiondef` + `pg_get_function_identity_arguments`
- Execute Tier C INSERT + RPC call (with `set_config('request.jwt.claims', ...)`) + soft-delete per RPC
- Run `get_advisors(security)`
- 3 commits per §10

**MUST stop and report:**
- Any migration fails
- RPC body missing regex guard
- Signature drift
- Tier C RPC call returns non-numeric output (regex guard didn't apply)
- Injected row insertion fails (would indicate FK / RLS / column-shape mismatch)
- New advisor entry on any of the 4 RPCs after migration

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If any of the 4 RPCs has been touched since Phase 1 close → STOP, re-capture
- If Tier C corrupt-row insert succeeds but cleanup soft-delete fails → STOP, escalate (orphan smoke data)
- If get_advisors reveals a new ERROR/HIGH on a sibling RPC → STOP

## 7. Out of Scope (explicit)

- The 4 Phase 1 RPCs (next_lot/receipt/po/transfer_number) — already hardened
- Any change to consumer RPCs (`m1_create_receipt_from_box`, `place_purchase_order`, etc.)
- Adding `is_deleted = false` filter to RPCs that don't have it (separate concern; aligned with Phase 1)
- Any JS code change
- Any RLS / policy / view / GRANT change
- Any data cleanup on legitimate production rows (we ONLY clean up the 4 transient Tier C injections)

## 8. QA / Tier C Verification Plan

For each of the 4 RPCs:
1. Capture the current max sequence number on demo before injection (baseline).
2. INSERT 1 row with a deliberately corrupt suffix matching the RPC's prefix but with non-numeric suffix (e.g., `BOX-PO123-X`, `DOC-WRONG-X`, etc.).
3. Call the RPC with `set_config('request.jwt.claims', '{"tenant_id":"{demo_tid}"}', true)` to satisfy the JWT guard.
4. Verify the returned value matches `^<prefix>\d+$` (purely numeric suffix).
5. Soft-delete the injected row (`UPDATE ... SET is_deleted=true WHERE id={injected_id}`).
6. Sanity-check: post-cleanup, the same RPC call returns the same numeric output (no surprise from the cleanup).

After all 4 RPCs verified:
- Quick regression: navigate POs List (SPEC 7) → 13 rows + 5 stat cards intact
- Quick regression: SPEC 6 PO wizard → can still pick supplier (no actual PO creation needed; we're verifying no UI regression)

## 9. Expected Final State

### Repo
- 4 new files in `supabase/migrations/`
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT.md + FINDINGS.md + (optional screenshots/)
- Module 1.5 SESSION_CONTEXT + CHANGELOG updated

### DB
- 4 RPC bodies updated in place via CREATE OR REPLACE
- 0 persistent data changes (4 injected rows all soft-deleted)
- 0 RLS / policy / GRANT change

### Defect class status post-SPEC
- All 8 `next_*_number` RPCs in the project are now resilient to non-numeric suffix corruption.
- The pattern is established as the canonical sequential-number generator design across the codebase.

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 SPEC` | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `fix(db): phase 2 — harden 4 sibling next_*_number RPCs against non-numeric suffix` | 4 migration .sql files |
| 3 | `chore(spec): close M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 — defect class closed across all 8 RPCs` | EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT + CHANGELOG |

Total: **3 commits**.

## 11. Pipeline Coordination

`files_owned_globs`:
```
supabase/migrations/**
modules/Module 1.5 - Shared Components/docs/specs/M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2/**
modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md
```

Branch: `develop`. Path X sequential.

## 12. Rollback Plan

If any migration fails:
- Re-apply pre-flight bodies (saved verbatim in §0) via 4 CREATE OR REPLACE.
- One commit: `revert: revert M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE_PHASE_2 migrations`.

If 3 of 4 migrations land but 1 fails:
- Roll back ALL 4 to preserve consistency across the defect class.

If a Tier C injection succeeds but cleanup soft-delete fails:
- Investigate immediately (potential RLS issue).
- Manual cleanup via Supabase MCP execute_sql with service_role.

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] All 4 Tier C smoke rows soft-deleted (no orphans)
- [ ] get_advisors clean

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Closes the defect class across all 8 next_*_number RPCs in the project._
