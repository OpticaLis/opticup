# Optic Up — Claude Code Project Guide

## Project
- **Name:** Optic Up — optical store management for Israeli optician chain
- **Repo:** opticalis/prizma-inventory
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **Deploy:** GitHub Pages → https://opticalis.github.io/prizma-inventory/

## Stack
- Vanilla JS (no framework), Supabase JS v2, SheetJS (xlsx)
- index.html must stay in repo root (GitHub Pages requirement)
- JS files in /js/, CSS in /css/

## UI
- Hebrew RTL interface
- Dark blue + white + gray theme
- Mobile responsive

## Global Variables (always available)
- `sb` — Supabase client (NOT `supabase`)
- `T` — table names: T.INV, T.BRANDS, T.SUPPLIERS, T.EMPLOYEES, T.LOGS, T.RECEIPTS, T.RECEIPT_ITEMS, T.PO, T.PO_ITEMS
- `ACTION_MAP` — 17+ action types with icon/label/color
- `FIELD_MAP` — Hebrew↔English field mapping
- `ENUM_MAP` — Hebrew↔English enum mapping

## Critical Rules
1. **Quantity changes** — ONLY through ➕➖ buttons with PIN verification. Never direct edit.
2. **writeLog()** — must be called for every quantity/price change. It is async and non-blocking.
3. **Deletion** — always soft delete (is_deleted flag). Permanent delete requires double PIN.
4. **Barcodes** — format BBDDDDD (2-digit branch + 5-digit sequence). Do NOT change barcode logic.
5. **FIELD_MAP** — every new DB field must be added to FIELD_MAP in shared.js.
6. **index.html** — must stay in repo root. Never move it.
7. **Admin password** — 1234 (sessionStorage key: adminMode)
8. **Default employee PIN** — 1234

## File Structure
- index.html — shell: HTML structure + nav + script tags only
- css/styles.css — all styles
- js/shared.js — Supabase init, constants, utility functions (load FIRST)
- js/inventory-core.js — main inventory table
- js/inventory-entry.js — inventory entry forms
- js/goods-receipt.js — goods receipt module + system log
- js/audit-log.js — soft delete, recycle bin, item history, qty modal
- js/brands-suppliers.js — brands and suppliers management
- js/purchase-orders.js — purchase orders module
- js/admin.js — admin mode toggle + app init

## DB Tables (via T constant)
- inventory, brands, suppliers, employees
- inventory_logs, inventory_images
- goods_receipts, goods_receipt_items
- purchase_orders, purchase_order_items

## Commit Format
git add -A && git commit -m "descriptive message in English" && git push
