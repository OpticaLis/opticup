# Optic Up — Claude Code Project Guide

## First Action — Read This Before Anything Else

When starting a new session, read these two files immediately:
1. `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — current status, what's done, what's next
2. This file (CLAUDE.md) — rules, conventions, file structure

**Do NOT read MODULE_MAP.md at session start.** It is a reference document — open it only when you need details about a specific file, function, or dependency. Reading it upfront wastes context window.

After reading SESSION_CONTEXT.md, confirm:
> "I've read SESSION_CONTEXT.md. Current status: [one line summary]. Ready to proceed."

---

## Project

- **Name:** Optic Up — optical store management SaaS for optician chains
- **Direction:** Multi-tenant SaaS — each store gets its own isolated environment (ERP + Storefront)
- **Current tenant:** אופטיקה פריזמה (Prizma Optics) — first and only tenant
- **Repo:** opticalis/opticup
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **Deploy:** GitHub Pages → https://opticalis.github.io/opticup/ (index.html = home screen, inventory.html = inventory module)

## Architecture — SaaS Multi-Tenant

```
┌──────────────────────┐         ┌──────────────────────┐
│   Optic Up ERP       │         │  Optic Up Storefront  │
│   (internal mgmt)    │         │  (public-facing site)  │
│   employees only     │         │  open to public        │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └────────► Supabase ◄────────────┘
                    (tenant_id isolates everything)
```

- **ERP** = what we're building now (inventory, debt tracking, etc.)
- **Storefront** = future public-facing site — reads ONLY from Views and RPC functions, never touches tables directly
- **Supplier Portal** = same principle as Storefront — Views only
- **Every table has `tenant_id UUID NOT NULL`** — no exceptions

## Stack

- Vanilla JS (no framework), Supabase JS v2, SheetJS (xlsx)
- index.html = home screen (login + module cards)
- inventory.html = inventory management module
- JS files in /js/, CSS in /css/, modules in /modules/

## UI

- Hebrew RTL interface
- Dark blue + white + gray theme
- Mobile responsive

## Critical Rules

### Iron Rules — Never Break

1. **Quantity changes** — ONLY through ➕➖ buttons with PIN verification. Never direct edit. Quantity updates should prefer atomic increments via Supabase RPC (`quantity = quantity + x`) over calculated values to prevent race conditions. New quantity-changing features must use this pattern.
2. **writeLog()** — must be called for every quantity/price change. It is async and non-blocking.
3. **Deletion** — always soft delete (is_deleted flag). Permanent delete requires double PIN.
4. **Barcodes** — format BBDDDDD (2-digit branch + 5-digit sequence). Do NOT change barcode logic.
5. **FIELD_MAP** — every new DB field must be added to FIELD_MAP in shared.js.
6. **index.html** — must stay in repo root. Never move it.
7. **Admin password** — 1234 (sessionStorage key: adminMode)
8. **Default employee PIN** — 1234
9. **API Abstraction** — All database interactions must pass through `shared.js` helper functions (`fetchAll`, `batchCreate`, `batchUpdate`, etc.). Modules should never call `sb.from()` directly unless for specialized joins that cannot be expressed through the helpers.
10. **Security & Sanitization** — Never use `innerHTML` with user-controlled input. Always use `escapeHtml()` or `textContent`. Note: PIN verification calls the pin-auth Edge Function which validates server-side and returns a signed JWT. Do not attempt to refactor PIN verification unless explicitly instructed.
11. **No hardcoded business values** — Business name, address, tax rate, logo, phone, and any tenant-specific data must always be read from a variable or config, never from a hardcoded string in code. This ensures every tenant can customize without code changes.

### SaaS Rules — Mandatory from Phase 3.75 Onward

11. **tenant_id on every table** — every new table MUST have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. No exceptions, ever.
12. **RLS on every table** — every new table MUST have Row Level Security enabled with a tenant isolation policy. Use this template:
    ```sql
    CREATE POLICY tenant_isolation ON [table_name]
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
    ```
13. **Contracts** — every phase must define its public functions (contracts) in MODULE_SPEC.md. Other modules call only these contract functions — never access another module's tables directly.
14. **Views for external access** — every phase must consider: "What does a supplier/customer/storefront need to see?" and plan Views accordingly.
15. **No hardcoded values** — currencies, languages, payment types = configurable tables, not hardcoded enums. Build as if a second store joins tomorrow in a different country.
16. **SaaS litmus test** — build every phase as if tomorrow a second optician chain joins that we've never met. If they can use the phase without any code changes — it was done right.

---

## File Structure

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── inventory.html              — inventory management module (full app)
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — standalone employee management page
├── css/
│   ├── styles.css              — all styles
│   └── header.css              — sticky header styles
├── js/
│   ├── shared.js               — Supabase init, constants, caches, utilities (load FIRST)
│   ├── supabase-ops.js         — DB operations: writeLog, fetchAll, batch ops, OCR learning, alerts
│   ├── data-loading.js         — data loading + enrichment
│   ├── search-select.js        — searchable dropdown component
│   ├── auth-service.js         — PIN login, session management, permissions
│   ├── header.js               — sticky header logic
│   ├── file-upload.js          — supplier document file upload/preview
│   └── alerts-badge.js         — bell icon + unread badge + dropdown panel (all pages)
├── modules/
│   ├── inventory/              — 8 files (table, entry, edit, export, reduction, excel-import, access-sales, inventory-return)
│   ├── purchasing/             — 5 files (purchase-orders, po-form, po-items, po-actions, po-view-import)
│   ├── goods-receipts/         — 7 files (goods-receipt, receipt-form, receipt-actions, receipt-confirm, receipt-debt, receipt-excel, receipt-ocr)
│   ├── audit/                  — 3 files (audit-log, item-history, qty-modal)
│   ├── brands/                 — 2 files (brands, suppliers)
│   ├── access-sync/            — 4 files (access-sync, sync-details, pending-panel, pending-resolve)
│   ├── admin/                  — 2 files (admin, system-log)
│   └── suppliers-debt/         — 13 files (debt-dashboard, debt-documents, debt-doc-link, debt-payments, debt-payment-wizard, debt-payment-alloc, debt-prepaid, debt-supplier-detail, debt-returns, ai-ocr, ai-alerts, ai-weekly-report, ai-config)
├── scripts/
│   ├── sync-watcher.js         — Node.js folder watcher (Windows Service)
│   ├── install-service.js
│   └── uninstall-service.js
├── supabase/functions/ocr-extract/ — Edge Function (Claude Vision OCR)
│   └── index.ts
├── migrations/
│   └── *.sql
├── modules/Module 1 - Inventory Management/
│   ├── ROADMAP.md
│   ├── SECONDARY_CHAT_TEMPLATE_FINAL.md
│   ├── MY_CHEATSHEET.md
│   └── docs/
│       ├── SESSION_CONTEXT.md
│       ├── MODULE_MAP.md
│       ├── MODULE_SPEC.md
│       ├── CHANGELOG.md
│       ├── db-schema.sql
│       └── PHASE_X_SPEC.md
└── CLAUDE.md                   — this file
```

## DB Tables (via T constant)

| Constant          | Table                    | Key columns                                                              |
|-------------------|--------------------------|--------------------------------------------------------------------------|
| `T.TENANTS`       | tenants                  | id, name, slug, default_currency, timezone, locale, is_active            |
| `T.INV`           | inventory                | id, barcode, brand_id, supplier_id, model, size, color, quantity, status, is_deleted, tenant_id |
| `T.BRANDS`        | brands                   | id, name, brand_type, default_sync, active, exclude_website, min_stock_qty, tenant_id |
| `T.SUPPLIERS`     | suppliers                | id, name, active, supplier_number (UNIQUE, ≥ 10), payment_terms_days, withholding_tax_rate, tenant_id |
| `T.EMPLOYEES`     | employees                | id, name, pin, email, phone, branch_id, failed_attempts, locked_until, last_login, tenant_id |
| `T.LOGS`          | inventory_logs           | id, action, inventory_id, details (jsonb), created_at, tenant_id        |
| `T.IMAGES`        | inventory_images         | id, inventory_id, url, tenant_id                                        |
| `T.RECEIPTS`      | goods_receipts           | id, type, status, supplier_id, po_id, notes, created_at, tenant_id     |
| `T.RECEIPT_ITEMS` | goods_receipt_items      | id, receipt_id, inventory_id, quantity, tenant_id                       |
| `T.PO`            | purchase_orders          | id, po_number, supplier_id, status, notes, created_at, tenant_id       |
| `T.PO_ITEMS`      | purchase_order_items     | id, po_id, brand_id, model, size, color, quantity, cost_price, tenant_id |
| `T.ROLES`         | roles                    | id, name_he, description, is_system, tenant_id                          |
| `T.PERMISSIONS`   | permissions              | id, module, action, name_he, tenant_id                                   |
| `T.ROLE_PERMS`    | role_permissions         | role_id, permission_id, granted, tenant_id                               |
| `T.EMP_ROLES`     | employee_roles           | employee_id, role_id, granted_by, granted_at, tenant_id                  |
| `T.SESSIONS`      | auth_sessions            | id, employee_id, token, permissions, is_active, expires_at, tenant_id   |
| `T.SYNC_LOG`      | sync_log                 | id, filename, source_ref, status, rows_total, rows_success, tenant_id   |
| `T.PENDING_SALES` | pending_sales            | id, barcode_received, quantity, action_type, status, tenant_id          |
| `T.HEARTBEAT`     | watcher_heartbeat        | id, last_beat, watcher_version, host, tenant_id                         |
| `T.STOCK_COUNTS`  | stock_counts             | id, count_number, status, counted_by, total_items, total_diffs, tenant_id |
| `T.STOCK_COUNT_ITEMS` | stock_count_items    | id, count_id, inventory_id, expected_qty, actual_qty, difference, tenant_id |
| `T.DOC_TYPES`     | document_types           | id, code, name_he, name_en, affects_debt, is_system, tenant_id           |
| `T.SUP_DOCS`      | supplier_documents       | id, supplier_id, document_type_id, document_number, total_amount, paid_amount, status, tenant_id |
| `T.DOC_LINKS`     | document_links           | id, parent_document_id, child_document_id, amount_on_invoice, tenant_id  |
| `T.SUP_PAYMENTS`  | supplier_payments        | id, supplier_id, amount, payment_date, payment_method, withholding_tax_rate, status, tenant_id |
| `T.PAY_ALLOC`     | payment_allocations      | id, payment_id, document_id, allocated_amount, tenant_id                 |
| `T.PAY_METHODS`   | payment_methods          | id, code, name_he, name_en, is_system, tenant_id                        |
| `T.PREPAID_DEALS` | prepaid_deals            | id, supplier_id, total_prepaid, total_used, total_remaining, status, tenant_id |
| `T.PREPAID_CHECKS`| prepaid_checks           | id, prepaid_deal_id, check_number, amount, check_date, status, tenant_id |
| `T.SUP_RETURNS`   | supplier_returns         | id, supplier_id, return_number, return_type, status, tenant_id           |
| `T.SUP_RETURN_ITEMS` | supplier_return_items | id, return_id, inventory_id, barcode, quantity, cost_price, tenant_id    |
| `T.AI_CONFIG`     | ai_agent_config          | id, tenant_id, ocr_enabled, confidence_threshold, alerts_enabled, weekly_report_enabled |
| `T.OCR_TEMPLATES` | supplier_ocr_templates   | id, tenant_id, supplier_id, document_type, extraction_hints, times_used, accuracy_rate |
| `T.OCR_EXTRACTIONS` | ocr_extractions        | id, tenant_id, file_path, raw_result, confidence, status, template_id   |
| `T.ALERTS`        | alerts                   | id, tenant_id, alert_type, severity, title, message, data (jsonb), status, entity_type, entity_id, dismissed_at |
| `T.WEEKLY_REPORTS` | weekly_reports          | id, tenant_id, week_start, week_end, report_data (jsonb), generated_by  |

**Note:** tenant_id UUID NOT NULL exists on all tables since Phase 3.75. JWT-based RLS tenant isolation is active on all 36 tables.

---

## Modules — Quick Reference

**Key globals:** `sb` (Supabase client, NOT `supabase`), `T` (table constants), `FIELD_MAP` / `ENUM_MAP` (Hebrew↔English), `getTenantId()` (current tenant UUID).

**Key infrastructure:** shared.js loads FIRST → supabase-ops.js → data-loading.js → auth-service.js.

For complete function registry and globals list → see MODULE_MAP.md

---

For complete globals list by file → see MODULE_MAP.md section 3.

---

## Conventions

1. **Cascading dropdowns** — brand → model → size/color. Used in reduction search, entry forms, PO items, and receipt items. Each level queries Supabase for distinct values filtered by parent.

2. **Two-step wizard** — PO creation: step 1 selects supplier, step 2 generates PO number and opens item editor. `proceedToPOItems()` bridges the steps.

3. **Accordion pattern** — entry history groups logs by date, each group expands/collapses via `toggleHistGroup()`.

4. **Barcode-first flow** — receipts and reduction search by barcode first; manual search is fallback.

5. **Searchable dropdowns** — `createSearchSelect(config)` creates fixed-position filtered dropdown. Used for brands (entry, PO) and suppliers (PO, receipt).

6. **Immediate save vs. batch save** — checkboxes like `setBrandActive()` and `saveBrandField()` save immediately to DB. Row edits (brands table, inventory table) require explicit "Save" button.

7. **PIN verification** — all qty changes, soft delete, permanent delete, and inventory reduction require PIN entry. Login PIN calls the pin-auth Edge Function (server-side JWT). Mid-session PIN checks use `verifyPinOnly()` (client-side query).

8. **Temp negative swap** — supplier number reassignment uses temp negative values to avoid UNIQUE constraint violations during concurrent swaps.

9. **PO number format** — `PO-{supplier_number}-{sequential 4-digit}` per supplier. Generated at step 2 of PO creation.

10. **Soft delete** — `is_deleted = true` flag. All queries must filter `is_deleted = false`. Permanent delete requires double PIN confirmation.

11. **writeLog pattern** — every data mutation calls `writeLog(action, inventoryId, details)`. Details object contains field-level changes for audit trail.

12. **Hebrew↔English maps** — `FIELD_MAP` for column names, `ENUM_MAP` for enum values. Both have reverse maps (`FIELD_MAP_REV`, `ENUM_REV`). Use `enToHe()`/`heToEn()` helpers.

13. **Brand filters** — `allBrandsData[]` global stores all brands including `currentQty`. `renderBrandsTable()` reads 4 filter dropdowns: `brand-filter-active`, `brand-filter-sync`, `brand-filter-type`, `brand-filter-low-stock`. `setBrandActive(brandId, isActive)` updates DB immediately and re-renders the table.

14. **tenant_id on all writes** — every `.insert()` and `.upsert()` must include `tenant_id: getTenantId()`. Every `.select()` should filter by `.eq('tenant_id', getTenantId())` as defense-in-depth alongside RLS.

---

## Known Issues

Known issues are tracked in SESSION_CONTEXT.md — single home for all open issues.

---

## File Size Rules

- **Target: max 300 lines per file.** This is the threshold at which an AI assistant can read and fully understand a file in a single context window.
- **Absolute maximum: 350 lines** — only acceptable when splitting further would break a tightly coupled logical unit (e.g. a single pipeline or wizard flow).
- **Split rule:** Only split where there is a clear logical separation. Never cut arbitrarily by line count alone.
- **One responsibility per file** — if you need "and" to describe what a file does, it should be two files.

---

## MODULE_MAP.md — Living Architecture Document

`modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` is the single source of truth for the entire codebase.

**Rules — enforced on every commit:**
- Every new **module** added → add a new top-level section in MODULE_MAP.md
- Every new **file** added → add it under its module section with a one-line description and line count
- Every new **function** added → add it to the Function Registry table
- Every new **global variable** added → add it to the Globals table
- Every new **DB table or column** added → update the Database Schema section

**MODULE_MAP.md must be updated in the same commit as the code change — never separately.**

If you add code without updating MODULE_MAP.md, the task is not complete.

For full function/file/dependency reference → see MODULE_MAP.md

---

## Documentation Files — Paths & Rules

### File locations

All documentation lives in `modules/Module 1 - Inventory Management/`:

| File | Path | Contains |
|------|------|----------|
| `ROADMAP.md` | `modules/Module 1 - Inventory Management/ROADMAP.md` | Phase map — ⬜/✅ status per phase |
| `SESSION_CONTEXT.md` | `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | Current status, last commits, what's next, open issues |
| `CHANGELOG.md` | `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | Full history — one section per phase/goal |
| `MODULE_SPEC.md` | `modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md` | Current state only — what tables/functions/logic exist NOW (no history) |
| `MODULE_MAP.md` | `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | Full code map — every file, function, global, DB table |
| `db-schema.sql` | `modules/Module 1 - Inventory Management/docs/db-schema.sql` | Current DB schema — all tables with columns |

### Rules — enforced always

**Every commit that adds/changes code:**
- `MODULE_MAP.md` — must be updated in the same commit (new files, functions, globals)
- `db-schema.sql` — must be updated if any DB change was made (new tables, columns, RLS)

**End of every session:**
- `SESSION_CONTEXT.md` — update: what was done, commit hashes, what's next, open issues

**End of every phase:**
- `ROADMAP.md` — mark completed phase ⬜ → ✅
- `CHANGELOG.md` — add new section with all commits and changes
- `MODULE_SPEC.md` — update current state (overwrite, not append)
- `MODULE_MAP.md` — verify all new files/functions are documented
- `db-schema.sql` — verify schema is current

---

## Authority Matrix — Single Source of Truth

Every type of information has ONE authoritative home. If there is a conflict between files, this hierarchy wins:

| Information Type | Authoritative File | Notes |
|---|---|---|
| Iron rules & SaaS rules | CLAUDE.md | No other file defines rules |
| File structure (high-level) | CLAUDE.md | Folder names only, no line counts |
| DB schema (columns, SQL) | db-schema.sql | Only file with executable SQL |
| Function signatures & globals | MODULE_MAP.md | Complete registry, updated every commit |
| Business logic flows | MODULE_SPEC.md | What the system does, not how |
| Phase status & vision | ROADMAP.md | Checkmarks only, no rules |
| Commit history | CHANGELOG.md | One section per phase |
| Current status & next steps | SESSION_CONTEXT.md | Updated end of every session |
| Known issues | SESSION_CONTEXT.md | Single home for all open issues |

---

## Backup Protocol — End of Every Phase

At the end of every phase, before any documentation updates:

```
mkdir -p "modules/Module 1 - Inventory Management/backups/M1F{phase}_{YYYY-MM-DD}"
```

Copy these files into the backup folder:
- CLAUDE.md
- modules/Module 1 - Inventory Management/ROADMAP.md
- modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md
- modules/Module 1 - Inventory Management/docs/MODULE_MAP.md
- modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md
- modules/Module 1 - Inventory Management/docs/CHANGELOG.md
- modules/Module 1 - Inventory Management/docs/db-schema.sql

Naming convention: M=Module number, F=Phase number. Example: `M1F3.75_2026-03-12`

This backup must happen BEFORE any documentation changes, never after.

---

## Working Rules (AI Sessions)

1. **One file at a time** — never touch multiple files in a single task unless explicitly instructed
2. **Backup before every major change** — copy affected files to `modules/Module 1 - Inventory Management/backups/` before splitting or refactoring
3. **Stop and report after every task** — do not proceed to the next step without explicit approval
4. **No logic changes during structural work** — when splitting or reorganizing, copy code verbatim. Zero behavior changes.
5. **Verify after every change** — app must load with zero console errors after every file modification
6. **Report before executing** — for any task touching more than one function, show the plan first and wait for approval
7. **Never auto-proceed** — even if the next step seems obvious, stop and wait

---

## Commit Format
```
git add -A && git commit -m "descriptive message in English" && git push
```

