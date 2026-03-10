# Snapshot v1.5 — Pre-Phase 2

**Date:** 2026-03-09
**Commit:** 4a8e2c4
**Description:** Complete Phase 0 + 1 + 1.5 — all inventory management features before Phase 2 (Stock Count + Access Bridge)

## What's included
- index.html — HTML shell + nav + modals
- css/styles.css — all styles
- js/shared.js — Supabase init, constants, caches, utilities
- js/inventory-core.js — inventory reduction + main table
- js/inventory-entry.js — entry forms (manual + Excel)
- js/goods-receipt.js — goods receipt + system log
- js/audit-log.js — soft delete, recycle bin, history, qty modal
- js/brands-suppliers.js — brands + suppliers management
- js/purchase-orders.js — purchase orders (CRUD, export, import)
- js/admin.js — admin mode + app init

## Features at this point
- Inventory entry (manual + Excel) with BBDDDDD barcodes
- Inventory reduction (Excel batch + manual cascading)
- Full inventory table (inline edit, sort, bulk ops)
- Goods receipt with PO linkage
- Purchase orders (two-step wizard, Excel+PDF export)
- Brands management (4 filters, min stock alerts)
- Suppliers management (unique numbers, PO lock)
- Full audit trail (19 action types, writeLog)
- Soft delete + recycle bin + permanent delete
- Item history, entry history, system log
- PIN verification for all sensitive ops
- Sell price + sync + image validations

## How to restore
```bash
cp v1.5-snapshot/index.html ../../index.html
cp v1.5-snapshot/css/styles.css ../../css/styles.css
cp v1.5-snapshot/js/*.js ../../js/
```
Or revert to commit: `git checkout 4a8e2c4`
