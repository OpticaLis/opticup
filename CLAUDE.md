# Optic Up — Claude Code Project Guide

## First Action — Read This Before Anything Else

When starting a new session:
1. Verify you are on `develop` branch: `git branch`
2. Read `CLAUDE.md` (this file) — rules, conventions, structure
3. Read the SESSION_CONTEXT.md of the module you're working on:
   - Module 1: `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
   - Module 1.5: `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
4. Read `docs/GLOBAL_MAP.md` — shared functions, contracts, module registry (reference only — do NOT modify)

**Do NOT read MODULE_MAP.md or GLOBAL_SCHEMA.sql at session start.** They are reference documents — open only when needed.

After reading, confirm:
> "On branch: develop. Module: [X]. Current status: [one line]. Ready."

---

## Project

- **Name:** Optic Up — optical store management SaaS for optician chains
- **Direction:** Multi-tenant SaaS — each store gets its own isolated environment (ERP + Storefront)
- **Current tenant:** אופטיקה פריזמה (Prizma Optics) — first and only tenant
- **Repo:** opticalis/opticup
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **Deploy:** GitHub Pages → https://app.opticalis.co.il/ (index.html = home screen, inventory.html = inventory module)

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
12. **Global name collision check** — Before creating, moving, or renaming any global function or variable, run: `grep -rn "functionName" --include="*.js" --include="*.html" .` If ANY other file defines the same name — resolve the collision BEFORE writing code. Report findings and wait for instructions.
13. **Sequential number generation** — Every auto-generated sequential number (PO number, return number, document number, box number, etc.) MUST use an atomic Supabase RPC function with FOR UPDATE lock or equivalent serialization. Client-side SELECT MAX → +1 → INSERT is FORBIDDEN due to race conditions. Reference pattern: next_box_number, next_po_number, next_return_number RPCs.

### SaaS Rules — Mandatory from Phase 3.75 Onward

14. **tenant_id on every table** — every new table MUST have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. No exceptions, ever.
15. **RLS on every table** — every new table MUST have Row Level Security enabled with a tenant isolation policy. Use this template:
    ```sql
    CREATE POLICY tenant_isolation ON [table_name]
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
    ```
16. **Contracts** — every phase must define its public functions (contracts) in MODULE_SPEC.md. Other modules call only these contract functions — never access another module's tables directly.
17. **Views for external access** — every phase must consider: "What does a supplier/customer/storefront need to see?" and plan Views accordingly.
18. **No hardcoded values** — currencies, languages, payment types = configurable tables, not hardcoded enums. Build as if a second store joins tomorrow in a different country.
19. **SaaS litmus test** — build every phase as if tomorrow a second optician chain joins that we've never met. If they can use the phase without any code changes — it was done right.
20. **UNIQUE constraints must include tenant_id** — every UNIQUE constraint on any table must be scoped to the tenant. A global UNIQUE prevents multi-tenant data from coexisting. Example: `UNIQUE (barcode, tenant_id)` not `UNIQUE (barcode)`.

---

## File Structure

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── inventory.html              — inventory management module (full app)
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — standalone employee management page
├── shipments.html              — shipments & box management module
├── settings.html               — tenant settings (business info, financial config, display prefs)
├── css/
│   ├── styles.css              — all styles
│   └── header.css              — sticky header styles
├── js/
│   ├── shared.js               — Supabase init, constants, caches, utilities (load FIRST)
│   ├── shared-ui.js            — navigation (showTab), info modal, help banner (load after shared.js)
│   ├── supabase-ops.js         — core DB operations: writeLog, fetchAll, batch ops, softDelete
│   ├── supabase-alerts-ocr.js  — alert creation + OCR template learning (split from supabase-ops.js)
│   ├── data-loading.js         — data loading + enrichment
│   ├── search-select.js        — searchable dropdown component
│   ├── auth-service.js         — PIN login, session management, permissions
│   ├── header.js               — sticky header logic
│   ├── file-upload.js          — supplier document file upload/preview
│   ├── alerts-badge.js         — bell icon + unread badge + dropdown panel (all pages)
│   └── pin-modal.js            — reusable PIN prompt modal (shared promptPin())
├── modules/
│   ├── inventory/              — 11 files (table, entry, edit, export, reduction, excel-import, access-sales, inventory-return, inventory-returns-tab, inventory-returns-actions, incoming-invoices)
│   ├── purchasing/             — 6 files (purchase-orders, po-form, po-items, po-actions, po-import, po-view)
│   ├── goods-receipts/         — 11 files (goods-receipt, receipt-form, receipt-actions, receipt-confirm, receipt-confirm-items, receipt-debt, receipt-excel, receipt-ocr, receipt-ocr-review, receipt-po-compare, receipt-guide)
│   ├── audit/                  — 4 files (audit-log, item-history, entry-history, qty-modal)
│   ├── brands/                 — 2 files (brands, suppliers)
│   ├── access-sync/            — 4 files (access-sync, sync-details, pending-panel, pending-resolve)
│   ├── admin/                  — 2 files (admin, system-log)
│   ├── debt/                   — 17 files (debt-dashboard, debt-documents, debt-doc-link, debt-doc-filters, debt-payments, debt-payment-wizard, debt-payment-alloc, debt-prepaid, debt-prepaid-detail, debt-doc-edit, debt-doc-actions, debt-supplier-detail, debt-returns, debt-returns-tab, debt-returns-tab-actions, debt-info-content, debt-info-inject)
│   │   └── ai/                 — 7 files (ai-ocr, ai-alerts, ai-weekly-report, ai-config, ai-batch-upload, ai-batch-ocr, ai-historical-import)
│   ├── permissions/            — 1 file (employee-list)
│   ├── shipments/              — 9 files (shipments-list, shipments-create, shipments-items, shipments-items-table, shipments-lock, shipments-detail, shipments-manifest, shipments-couriers, shipments-settings)
│   ├── settings/               — 1 file (settings-page)
│   └── stock-count/            — 9 files (list, session, camera, scan, filters, unknown, approve, view, report)
├── scripts/
│   ├── sync-watcher.js         — Node.js folder watcher (Windows Service, CSV+XLSX)
│   ├── sync-export.js          — Reverse sync: export new inventory to XLS for Access
│   ├── install-service.js
│   └── uninstall-service.js
├── watcher-deploy/               — Standalone deployment package (8 files, no Git needed)
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
| `T.TENANTS`       | tenants                  | id, name, slug, default_currency, timezone, locale, is_active, shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config (JSONB), address, phone, email, tax_id, logo_url, vat_rate |
| `T.INV`           | inventory                | id, barcode, brand_id, supplier_id, model, size, color, quantity, status, is_deleted, access_exported, tenant_id |
| `T.BRANDS`        | brands                   | id, name, brand_type, default_sync, active, exclude_website, min_stock_qty, tenant_id |
| `T.SUPPLIERS`     | suppliers                | id, name, active, supplier_number (UNIQUE, ≥ 10), payment_terms_days, withholding_tax_rate, opening_balance, opening_balance_date, tenant_id |
| `T.EMPLOYEES`     | employees                | id, name, pin, email, phone, branch_id, failed_attempts, locked_until, last_login, tenant_id |
| `T.LOGS`          | inventory_logs           | id, action, inventory_id, details (jsonb), created_at, tenant_id        |
| `T.IMAGES`        | inventory_images         | id, inventory_id, url, tenant_id                                        |
| `T.RECEIPTS`      | goods_receipts           | id, type, status, supplier_id, po_id, notes, created_at, tenant_id     |
| `T.RECEIPT_ITEMS` | goods_receipt_items      | id, receipt_id, inventory_id, barcode, brand, model, color, size, quantity, unit_cost, sell_price, is_new_item, price_decision, po_match_status, receipt_status (ok/not_received/return/partial_received), from_po, barcodes_csv, ordered_qty, tenant_id |
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
| `T.STOCK_COUNTS`  | stock_counts             | id, count_number, status, counted_by, total_items, total_diffs, filter_criteria (JSONB), tenant_id |
| `T.STOCK_COUNT_ITEMS` | stock_count_items    | id, count_id, inventory_id, expected_qty, actual_qty, difference, tenant_id |
| `T.DOC_TYPES`     | document_types           | id, code, name_he, name_en, affects_debt, is_system, tenant_id           |
| `T.SUP_DOCS`      | supplier_documents       | id, supplier_id, document_type_id, document_number, total_amount, paid_amount, status, tenant_id |
| `T.DOC_LINKS`     | document_links           | id, parent_document_id, child_document_id, amount_on_invoice, tenant_id  |
| `T.SUP_PAYMENTS`  | supplier_payments        | id, supplier_id, amount, payment_date, payment_method, withholding_tax_rate, status, tenant_id |
| `T.PAY_ALLOC`     | payment_allocations      | id, payment_id, document_id, allocated_amount, tenant_id                 |
| `T.PAY_METHODS`   | payment_methods          | id, code, name_he, name_en, is_system, tenant_id                        |
| `T.PREPAID_DEALS` | prepaid_deals            | id, supplier_id, total_prepaid, total_used, total_remaining, status, tenant_id |
| `T.PREPAID_CHECKS`| prepaid_checks           | id, prepaid_deal_id, check_number, amount, check_date, status, tenant_id |
| `T.SUP_RETURNS`   | supplier_returns         | id, supplier_id, return_number, return_type, status, agent_picked_at, received_at, credited_at, tenant_id |
| `T.SUP_RETURN_ITEMS` | supplier_return_items | id, return_id, inventory_id, barcode, quantity, cost_price, tenant_id    |
| `T.AI_CONFIG`     | ai_agent_config          | id, tenant_id, ocr_enabled, confidence_threshold, alerts_enabled, weekly_report_enabled |
| `T.OCR_TEMPLATES` | supplier_ocr_templates   | id, tenant_id, supplier_id, document_type, extraction_hints, times_used, accuracy_rate |
| `T.OCR_EXTRACTIONS` | ocr_extractions        | id, tenant_id, file_path, raw_result, confidence, status, template_id   |
| `T.ALERTS`        | alerts                   | id, tenant_id, alert_type, severity, title, message, data (jsonb), status, entity_type, entity_id, dismissed_at |
| `T.WEEKLY_REPORTS` | weekly_reports          | id, tenant_id, week_start, week_end, report_data (jsonb), generated_by  |
| `T.CONVERSATIONS` | conversations            | id, tenant_id, channel_type, context_type, context_id, title, status |
| `T.CONV_PARTICIPANTS` | conversation_participants | id, tenant_id, conversation_id, participant_type, participant_id, role, unread_count |
| `T.MESSAGES`      | messages                 | id, tenant_id, conversation_id, sender_type, sender_id, message_type, content, status |
| `T.KNOWLEDGE`     | knowledge_base           | id, tenant_id, title, answer, category, tags, ai_usable, status |
| `T.MSG_REACTIONS`  | message_reactions        | id, tenant_id, message_id, employee_id, reaction |
| `T.NOTIF_PREFS`   | notification_preferences | id, tenant_id, employee_id, in_app, email, whatsapp, push |
| `T.COURIERS`      | courier_companies        | id, tenant_id, name, phone, contact_person, is_active                    |
| `T.SHIPMENTS`     | shipments                | id, tenant_id, box_number, shipment_type, supplier_id, courier_id, packed_by, locked_at, items_count, total_value, corrects_box_id, is_deleted |
| `T.SHIP_ITEMS`    | shipment_items           | id, tenant_id, shipment_id, item_type, inventory_id, return_id, barcode, brand, model, category, unit_cost |
| `T.ACTIVITY_LOG`  | activity_log             | id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details (jsonb), ip_address, user_agent, created_at |

**Note:** tenant_id UUID NOT NULL exists on all tables since Phase 3.75. JWT-based RLS tenant isolation is active on all 46 tables.

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

## Troubleshooting Knowledge Base

**File:** `docs/TROUBLESHOOTING.md`

**Rule:** Before debugging any issue, check TROUBLESHOOTING.md first. If the issue or a similar pattern has been solved before, apply the documented fix.

After resolving any non-trivial bug, add an entry to TROUBLESHOOTING.md with: symptom, root cause, fix, prevention, and commit reference.

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

## Documentation Architecture — Multi-Module

### Global docs (project-wide, in docs/):
| File | Contains | Updated When |
|------|----------|-------------|
| `docs/GLOBAL_MAP.md` | All shared functions, contracts, module registry, DB table ownership | Integration Ceremony (end of phase) |
| `docs/GLOBAL_SCHEMA.sql` | Full DB schema across all modules | Integration Ceremony (end of phase) |

### Module docs (per-module, in modules/Module X/docs/):
| File | Contains | Updated When |
|------|----------|-------------|
| `ROADMAP.md` | Phase map with ⬜/✅ status | End of phase |
| `SESSION_CONTEXT.md` | Current status, last commits, next steps, issues | End of every session |
| `CHANGELOG.md` | Full commit history per phase | End of phase |
| `MODULE_SPEC.md` | Current state: tables, functions, contracts (no history) | End of phase |
| `MODULE_MAP.md` | Code map: files, functions, globals for this module only | Every commit |
| `db-schema.sql` | DB tables owned by this module | Every DB change |

### Documentation Rules
**Every commit that adds/changes code:**
- Module's `MODULE_MAP.md` — must be updated in same commit
- Module's `db-schema.sql` — must be updated if any DB change

**End of every session:**
- Module's `SESSION_CONTEXT.md` — what was done, commits, what's next, issues

**End of every phase (Integration Ceremony):**
1. Backup: `mkdir -p "modules/Module X/backups/MXF{phase}_{date}"` → copy all docs
2. Module's `ROADMAP.md` — mark ⬜ → ✅
3. Module's `CHANGELOG.md` — add phase section
4. Module's `MODULE_SPEC.md` — update current state
5. Module's `MODULE_MAP.md` — verify completeness
6. Module's `db-schema.sql` — verify current
7. **GLOBAL integration:** merge module's MODULE_MAP into `docs/GLOBAL_MAP.md` (add only, never overwrite)
8. **GLOBAL integration:** merge module's db-schema.sql into `docs/GLOBAL_SCHEMA.sql` (add only, never overwrite)
9. Git tag: `v{module}-{phase}`

### Cross-module rules
- **Contracts:** modules communicate ONLY through contract functions. Never access another module's tables directly.
- **shared/ is read-only for modules.** To add a function to shared/, it goes through Module 1.5.
- **docs/GLOBAL_MAP.md and docs/GLOBAL_SCHEMA.sql are read-only during development.** Updated only during Integration Ceremony.
- **Before starting a new module:** read GLOBAL_MAP.md and GLOBAL_SCHEMA.sql to understand what exists.

---

## Authority Matrix — Single Source of Truth

Every type of information has ONE authoritative home:

| Information Type | Authoritative File |
|---|---|
| Iron rules & SaaS rules | CLAUDE.md |
| Project-wide function registry | docs/GLOBAL_MAP.md |
| Project-wide DB schema | docs/GLOBAL_SCHEMA.sql |
| Module's code map | modules/Module X/docs/MODULE_MAP.md |
| Module's DB tables | modules/Module X/docs/db-schema.sql |
| Module's business logic | modules/Module X/docs/MODULE_SPEC.md |
| Module's phase status | modules/Module X/ROADMAP.md |
| Module's commit history | modules/Module X/docs/CHANGELOG.md |
| Module's current status | modules/Module X/docs/SESSION_CONTEXT.md |

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

**After committing the phase, create a git tag:**
```
git tag v{phase} -m "Phase {phase}: {short description}"
git push origin v{phase}
```

---

## Working Rules (AI Sessions)

0. **Branch verification** — Every prompt starts with: `git branch` → confirm on `develop`. If not: `git checkout develop`. No exceptions.
1. **One file at a time** — never touch multiple files in a single task unless explicitly instructed
2. **Backup before every major change** — copy affected files to `modules/Module 1 - Inventory Management/backups/` before splitting or refactoring
3. **Stop and report after every task** — do not proceed to the next step without explicit approval
4. **No logic changes during structural work** — when splitting or reorganizing, copy code verbatim. Zero behavior changes.
5. **Verify after every change** — app must load with zero console errors after every file modification
6. **Report before executing** — for any task touching more than one function, show the plan first and wait for approval
7. **Never auto-proceed** — even if the next step seems obvious, stop and wait
8. **No worktree branches** — all work happens directly on `develop`. Do not create branches like `claude/xxx`. Do not use the worktree feature. This is a solo developer project with step-by-step review — worktrees add unnecessary complexity and break multi-machine sync.

---

## Multi-Machine Development

Two development machines are active:
- **Windows 🖥️**: `C:\Users\User\opticup` (PowerShell/Git Bash, Watcher service runs here)
- **Mac 🍎**: `/Users/danielsmac/opticup` (zsh/bash)

**Every new Claude Code chat must:**
1. Ask: "Which machine? 🖥️ or 🍎"
2. Run `git pull origin develop` before any work
3. Never work on both machines simultaneously on the same branch

---

## Commit Format
```
git add -A && git commit -m "descriptive message in English" && git push
```

---

## Branching & Environments

### Branches
- **`main`** = Production. Live for end users via GitHub Pages. Do NOT push directly — merge only.
- **`develop`** = Development. All Claude Code work happens here.

### Development Flow
1. All work on `develop`
2. When ready for production:
   `git checkout main && git merge develop && git push && git checkout develop`
3. After merge, verify GitHub Pages deploy succeeded

### Merge Policy
- **Refactor modules** (e.g., 1.5 Shared Components): merge to main at end of module after full QA.
- **Feature modules** (e.g., CRM, Orders): merge per-phase if the phase delivers standalone user value.
- **Hotfixes**: merge immediately.

### Shared Database
Both branches share one Supabase instance.
- **Safe changes** (do anytime): ADD COLUMN, CREATE TABLE, CREATE FUNCTION, ADD INDEX
- **Breaking changes** (plan carefully): DROP COLUMN, ALTER COLUMN type, DROP FUNCTION, RENAME COLUMN
- **Protocol for breaking changes:**
  1. Add the new structure (backward compatible)
  2. Merge code to main that uses the new structure
  3. Only then remove the old structure

### Rules
- Every Claude Code session starts on `develop`: verify with `git branch` before any work
- Never `git push` to `main` directly — always merge from `develop`
- DB changes must be backward compatible with `main` until merge
- Claude Code must NEVER use worktree branches — work directly on develop

---

## QA & Testing Protocol

### Test Tenant

| Field | Value |
|-------|-------|
| Name | אופטיקה דמו |
| Slug | demo |
| UUID | 8d8cfa7e-ef58-49af-9702-a862d459cccb |
| Test employee PIN | 12345 (עובד בדיקה, role: ceo, full permissions) |
| Theme | Green (#059669) — visually distinct from Prizma (blue) |
| Barcodes | Prefixed with 'D' (e.g., D0012345) |
| Data | Cloned from Prizma with "(דמו)" suffix on names |

### Tenant Access via URL

- Format: `?t={slug}` — e.g., `https://opticalis.github.io/opticup/?t=demo`
- Tenant resolved from: URL `?t=` param → sessionStorage → default 'prizma'
- Each tenant has isolated data, permissions, and theme via `tenant_id` + RLS
- `js/shared.js` → `TENANT_SLUG` reads from URL param dynamically
- `js/header.js` → loads `ui_config` from tenants table for theme
- `shared/js/theme-loader.js` → applies CSS variables from `ui_config`

### QA Rules — Mandatory

1. **All QA and regression tests run on the test tenant (slug=demo)** — never on Prizma production data
2. **Every new module** must be tested on the test tenant before merge to main
3. **Clone/cleanup scripts** are in `modules/Module 1.5 - Shared Components/scripts/`:
   - `clone-tenant.sql` — creates a full test tenant with FK-mapped data
   - `cleanup-tenant.sql` — safely removes test tenant data
   - `fix-permissions-schema.sql` — reference for permissions PK fix
4. **Test tenant stays alive** after QA — useful for demos, onboarding, and future testing
5. **When adding new tables:** update `clone-tenant.sql` to include them, or the test tenant will have missing data

### Permissions Schema (Multi-Tenant)

- `roles`, `permissions`, `role_permissions` — PKs include `tenant_id`
- Each tenant has its own copy of roles/permissions with the same IDs (e.g., 'ceo', 'inventory.view')
- FKs on `employee_roles` and `role_permissions` are composite references

