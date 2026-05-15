# ROLLBACK — M1_LENS_PHASE_1B_PROCUREMENT

**Spec start tag:** `spec-procurement-pre` → commit `f4a9945` (SPEC seal)
**Final commit at this writing:** Commit 11 (executor close + module + global doc updates)

This document captures the precise rollback recipe per SPEC §6.

---

## File-level rollback (HTML + JS + docs + allowlist + 6 SPEC artifact files)

```bash
# Verify the tag points to the right commit (sha pinned at SPEC §6 — should be SPEC seal)
git rev-parse spec-procurement-pre
# Expected: f4a9945 chore(spec): seal M1_LENS_PHASE_1B_PROCUREMENT SPEC + BRIEF + ACTIVATION_PROMPT

# Hard reset develop to the SPEC start (DESTRUCTIVE — needs Daniel approval per Iron Rule §9 #7)
git reset --hard spec-procurement-pre
git push --force-with-lease origin develop

# Files this rolls back (and removes/restores, accordingly):
# - DELETED: lens-purchase-order.html, lens-pos-list.html, lens-goods-receipt.html
# - DELETED: modules/lens-purchase-order/ (6 files), modules/lens-pos-list/ (4 files), modules/lens-goods-receipt/ (8 files)
# - REVERTED: scripts/checks/root-allowlist.json (3 lines removed)
# - REVERTED: modules/lens-inventory/lens-inventory-modals.js (back to 32-line foundation stub)
# - DELETED: 6 SPEC artifact files in modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/ (MIGRATION, TEST_REPORT, EXECUTION_REPORT, FINDINGS, ROLLBACK, REVIEW, FOREMAN_REVIEW — whatever has been written)
# - REVERTED: docs/GLOBAL_MAP.md, docs/FILE_STRUCTURE.md (3 lines each removed)
# - REVERTED: 5 module docs (SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, CHANGELOG, ROADMAP — restored to pre-procurement state)
```

**Backup folder:** N/A per SPEC §6 — only 1 file modified in foundation (lens-inventory-modals.js, 32→195 lines), well below the "5 files OR 100 lines" trigger that mandates `modules/Module N/backups/{TS}_{SLUG}/` snapshots.

---

## DB-level rollback (12 perm rows + 34 role_permission rows on demo + prizma)

```sql
-- Revert ONLY the 6 new keys × 2 tenants. Idempotent (delete-by-tuple).
DELETE FROM role_permissions
WHERE permission_id IN (
  'lens.po.create','lens.po.view','lens.po.cancel',
  'lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust'
)
  AND tenant_id IN (
    '8d8cfa7e-ef58-49af-9702-a862d459cccb',  -- demo
    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'   -- prizma
  );
-- Expected: 34 rows deleted (17 demo + 17 prizma per §0.D matrix)

DELETE FROM permissions
WHERE id IN (
  'lens.po.create','lens.po.view','lens.po.cancel',
  'lens.gr.create','lens.gr.add_manual_line','lens.inventory.adjust'
)
  AND tenant_id IN (
    '8d8cfa7e-ef58-49af-9702-a862d459cccb',
    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  );
-- Expected: 12 rows deleted (6 demo + 6 prizma)

-- Re-confirm foundation is intact (BASE_PERMS_LENS_ROWS = 6 + BASE_ROLE_PERMS_LENS_ROWS = 18)
SELECT 'perms_lens_total' AS k, count(*)::text AS v FROM permissions WHERE id LIKE 'lens.%'
UNION ALL SELECT 'role_perms_lens_total', count(*)::text FROM role_permissions WHERE permission_id LIKE 'lens.%' AND granted=true;
-- Expected: 6 + 18 (foundation untouched)
```

---

## Smoke-fixture rollback (write rows created during Phase A on demo)

`spec_start_ts` was captured at smoke-start = **2026-05-15 12:57:02 UTC**. All write rows on demo with `created_at >= spec_start_ts` were created by smoke and are safe to delete.

```sql
-- Order matters: child rows first, then parents.
SET LOCAL request.jwt.claims = '{"sub":"c009a03e-06e2-4a59-8e0d-bc75f5effa39","tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb","role":"authenticated"}';
SET LOCAL role = 'authenticated';

-- 1. Stock movements (smoke #3 + #4)
DELETE FROM stock_movement
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '2026-05-15 12:57:02'::timestamptz;
-- Expected: 3 rows deleted

-- 2. Supplier debts (smoke #3 + #4)
DELETE FROM supplier_debt
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '2026-05-15 12:57:02'::timestamptz;
-- Expected: 2 rows deleted

-- 3. Receipt lines + receipts (smoke #3 + #4)
DELETE FROM purchase_receipt_line
WHERE receipt_id IN (
  SELECT id FROM purchase_receipt
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND delivery_note_number IN ('DN-SMOKE-001-PARTIAL','DN-SMOKE-003-FULL')
);
DELETE FROM purchase_receipt
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND delivery_note_number IN ('DN-SMOKE-001-PARTIAL','DN-SMOKE-003-FULL');
-- Expected: 3 receipt_lines + 2 receipts deleted

-- 4. Stock lots (smoke #3 + #4)
DELETE FROM stock_lot
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '2026-05-15 12:57:02'::timestamptz;
-- Expected: 3 rows deleted

-- 5. Purchase order lines + headers (smoke #1, #3, #6 created PO-000003, PO-000004, PO-000005)
DELETE FROM purchase_order_line
WHERE purchase_order_id IN (
  SELECT id FROM purchase_order
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND po_number IN ('PO-000003','PO-000004','PO-000005')
);
DELETE FROM purchase_order
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND po_number IN ('PO-000003','PO-000004','PO-000005');
-- Expected: ~5 PO lines + 3 PO headers deleted

-- Re-confirm BASE_* (M1B0 baseline untouched)
SELECT 'demo_pos' AS k, count(*)::text AS v FROM purchase_order WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'demo_lots', count(*)::text FROM stock_lot WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'demo_debts', count(*)::text FROM supplier_debt WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'demo_receipts', count(*)::text FROM purchase_receipt WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: 2 / 7 / 1 / 4 — matches §0.B Probe 1 baseline
```

---

## Sequence-counter side-effects (NOT rolled back — non-destructive)

The smoke incremented the following per-tenant sequence counters on demo:
- `next_po_number` advanced from PO-000003 → PO-000005 (3 invocations).
- `next_receipt_number` advanced from RCP-000004 → RCP-000006 (2 invocations).
- `next_lot_number` advanced from LOT-000007 → LOT-000010 (3 invocations).

These counters are NOT rolled back — gap-allowed sequences are by design (Iron Rule 11). Future POs / receipts / lots will simply continue from the new high-water mark.

---

## Triggering rollback

**Daniel-only authorization required** for both file-level (per Iron Rule §9 #7 — `git push --force-with-lease`) and DB-level (per SQL Autonomy Level 2 + DELETE on data tables).

The Foreman is notified on any rollback trigger; SPEC marked REOPEN, not CLOSED.

---

*End of ROLLBACK. Recipes verified syntactically against live schema; not exercised live (SPEC is closing 🟡, not rolling back).*
