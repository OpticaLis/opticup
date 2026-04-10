# DB Tables Reference — opticup (ERP)

> **Purpose:** Quick reference for all T constants → table names → key columns used by the ERP JS code.
> **Updated when:** A table is added, a column added/renamed, or a new T constant defined in `js/shared.js`.
> **Read when:** You need to remember a constant name, look up a column, or check which table owns a field.
> **Full schema (authoritative):** `docs/GLOBAL_SCHEMA.sql`
> **Per-module schema:** `modules/Module X/docs/db-schema.sql`

> **Note:** `tenant_id UUID NOT NULL` exists on **every** table listed here since Phase 3.75. JWT-based RLS tenant isolation is active on all tables. The `tenant_id` column is implied on every row below — only explicitly listed where it's part of a composite key or has special meaning.

> **Access rule:** Always use `T.CONSTANT_NAME` in code, never a raw string. Adding a new table? Define its constant in `js/shared.js` AND add it here, in the SAME commit (Rule 21).

---

## Core: Tenancy & Inventory

| Constant | Table | Key columns |
|---|---|---|
| `T.TENANTS` | `tenants` | id, name, slug, default_currency, timezone, locale, is_active, shipment_lock_minutes, box_number_prefix, require_tracking_before_lock, auto_print_on_lock, shipment_config (JSONB), address, phone, email, tax_id, logo_url, vat_rate |
| `T.INV` | `inventory` | id, barcode, brand_id, supplier_id, model, size, color, quantity, status, is_deleted, access_exported, tenant_id |
| `T.BRANDS` | `brands` | id, name, brand_type, default_sync, active, exclude_website, min_stock_qty, tenant_id |
| `T.SUPPLIERS` | `suppliers` | id, name, active, supplier_number (UNIQUE, ≥ 10), payment_terms_days, withholding_tax_rate, opening_balance, opening_balance_date, tenant_id |
| `T.EMPLOYEES` | `employees` | id, name, pin, email, phone, branch_id, failed_attempts, locked_until, last_login, tenant_id |
| `T.LOGS` | `inventory_logs` | id, action, inventory_id, details (jsonb), created_at, tenant_id |
| `T.IMAGES` | `inventory_images` | id, inventory_id, url, tenant_id |

## Purchasing & Receiving

| Constant | Table | Key columns |
|---|---|---|
| `T.PO` | `purchase_orders` | id, po_number, supplier_id, status, notes, created_at, tenant_id |
| `T.PO_ITEMS` | `purchase_order_items` | id, po_id, brand_id, model, size, color, quantity, cost_price, sell_price, sell_discount, product_type, tenant_id |
| `T.RECEIPTS` | `goods_receipts` | id, type, status, supplier_id, po_id, notes, created_at, tenant_id |
| `T.RECEIPT_ITEMS` | `goods_receipt_items` | id, receipt_id, inventory_id, barcode, brand, model, color, size, quantity, unit_cost, sell_price, is_new_item, price_decision, po_match_status, receipt_status (ok/not_received/return/partial_received), from_po, barcodes_csv, ordered_qty, product_type, tenant_id |

## Auth & Permissions

| Constant | Table | Key columns |
|---|---|---|
| `T.ROLES` | `roles` | id, name_he, description, is_system, tenant_id |
| `T.PERMISSIONS` | `permissions` | id, module, action, name_he, tenant_id |
| `T.ROLE_PERMS` | `role_permissions` | role_id, permission_id, granted, tenant_id |
| `T.EMP_ROLES` | `employee_roles` | employee_id, role_id, granted_by, granted_at, tenant_id |
| `T.SESSIONS` | `auth_sessions` | id, employee_id, token, permissions, is_active, expires_at, tenant_id |

**Note on permissions schema:** `roles`, `permissions`, `role_permissions` have PKs that include `tenant_id`. Each tenant has its own copy of roles/permissions with the same IDs (e.g., `'ceo'`, `'inventory.view'`). FKs on `employee_roles` and `role_permissions` are composite references.

## Access Sync (Windows Bridge)

| Constant | Table | Key columns |
|---|---|---|
| `T.SYNC_LOG` | `sync_log` | id, filename, source_ref, status, rows_total, rows_success, tenant_id |
| `T.PENDING_SALES` | `pending_sales` | id, barcode_received, quantity, action_type, status, tenant_id |
| `T.HEARTBEAT` | `watcher_heartbeat` | id, last_beat, watcher_version, host, tenant_id |

## Stock Counting

| Constant | Table | Key columns |
|---|---|---|
| `T.STOCK_COUNTS` | `stock_counts` | id, count_number, status, counted_by, total_items, total_diffs, filter_criteria (JSONB), tenant_id |
| `T.STOCK_COUNT_ITEMS` | `stock_count_items` | id, count_id, inventory_id, expected_qty, actual_qty, difference, tenant_id |

## Supplier Debt & Payments

| Constant | Table | Key columns |
|---|---|---|
| `T.DOC_TYPES` | `document_types` | id, code, name_he, name_en, affects_debt, is_system, tenant_id |
| `T.SUP_DOCS` | `supplier_documents` | id, supplier_id, document_type_id, document_number, total_amount, paid_amount, status, tenant_id |
| `T.DOC_LINKS` | `document_links` | id, parent_document_id, child_document_id, amount_on_invoice, tenant_id |
| `T.SUP_PAYMENTS` | `supplier_payments` | id, supplier_id, amount, payment_date, payment_method, withholding_tax_rate, status, tenant_id |
| `T.PAY_ALLOC` | `payment_allocations` | id, payment_id, document_id, allocated_amount, tenant_id |
| `T.PAY_METHODS` | `payment_methods` | id, code, name_he, name_en, is_system, tenant_id |
| `T.PREPAID_DEALS` | `prepaid_deals` | id, supplier_id, total_prepaid, total_used, total_remaining, status, tenant_id |
| `T.PREPAID_CHECKS` | `prepaid_checks` | id, prepaid_deal_id, check_number, amount, check_date, status, tenant_id |

## Supplier Returns (Credits)

| Constant | Table | Key columns |
|---|---|---|
| `T.SUP_RETURNS` | `supplier_returns` | id, supplier_id, return_number, return_type, status, agent_picked_at, received_at, credited_at, tenant_id |
| `T.SUP_RETURN_ITEMS` | `supplier_return_items` | id, return_id, inventory_id, barcode, quantity, cost_price, tenant_id |

## AI Agent (OCR, Alerts, Reports)

| Constant | Table | Key columns |
|---|---|---|
| `T.AI_CONFIG` | `ai_agent_config` | id, tenant_id, ocr_enabled, confidence_threshold, alerts_enabled, weekly_report_enabled |
| `T.OCR_TEMPLATES` | `supplier_ocr_templates` | id, tenant_id, supplier_id, document_type, extraction_hints, times_used, accuracy_rate |
| `T.OCR_EXTRACTIONS` | `ocr_extractions` | id, tenant_id, file_path, raw_result, confidence, status, template_id |
| `T.ALERTS` | `alerts` | id, tenant_id, alert_type, severity, title, message, data (jsonb), status, entity_type, entity_id, dismissed_at |
| `T.WEEKLY_REPORTS` | `weekly_reports` | id, tenant_id, week_start, week_end, report_data (jsonb), generated_by |

## Communications (Stubs — populated in future modules)

| Constant | Table | Key columns |
|---|---|---|
| `T.CONVERSATIONS` | `conversations` | id, tenant_id, channel_type, context_type, context_id, title, status |
| `T.CONV_PARTICIPANTS` | `conversation_participants` | id, tenant_id, conversation_id, participant_type, participant_id, role, unread_count |
| `T.MESSAGES` | `messages` | id, tenant_id, conversation_id, sender_type, sender_id, message_type, content, status |
| `T.KNOWLEDGE` | `knowledge_base` | id, tenant_id, title, answer, category, tags, ai_usable, status |
| `T.MSG_REACTIONS` | `message_reactions` | id, tenant_id, message_id, employee_id, reaction |
| `T.NOTIF_PREFS` | `notification_preferences` | id, tenant_id, employee_id, in_app, email, whatsapp, push |

## Shipments & Boxes

| Constant | Table | Key columns |
|---|---|---|
| `T.COURIERS` | `courier_companies` | id, tenant_id, name, phone, contact_person, is_active |
| `T.SHIPMENTS` | `shipments` | id, tenant_id, box_number, shipment_type, supplier_id, courier_id, packed_by, locked_at, items_count, total_value, corrects_box_id, is_deleted |
| `T.SHIP_ITEMS` | `shipment_items` | id, tenant_id, shipment_id, item_type, inventory_id, return_id, barcode, brand, model, category, unit_cost |

## Activity Log (Project-wide audit)

| Constant | Table | Key columns |
|---|---|---|
| `T.ACTIVITY_LOG` | `activity_log` | id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details (jsonb), ip_address, user_agent, created_at |

**Rule:** Every data mutation writes to `activity_log` via `shared/js/activity-logger.js`. Level values: `info`/`warning`/`error`/`critical`. For field-value changes, `details` MUST include `{ changes: [{field, old, new}] }`.

## Storefront (used by Studio admin UI in ERP)

These T constants are used by the ERP's Studio (`modules/storefront/`) to manage storefront content. The full schema documentation for storefront tables lives in `opticup-storefront/` docs, but the T constants themselves are defined here because ERP code calls them.

| Constant | Table | Key columns |
|---|---|---|
| `T.STOREFRONT_CONFIG` | `storefront_config` | id, tenant_id, whatsapp_number, booking_url, notification_method |
| `T.STOREFRONT_LEADS` | `storefront_leads` | id, tenant_id, inventory_id, contact_type, contact_value, status, created_at, notified_at, is_deleted (notify-me / back-in-stock only) |

> **Don't confuse** `storefront_leads` (back-in-stock notifications) with `cms_leads` (general CMS lead forms from landing pages). Full distinction documented in `opticup-storefront/CLAUDE.md`.

---

## Key Globals (from `js/shared.js`)

- `sb` — Supabase client (NOT `supabase` — that's a reserved name)
- `T` — table constants object (as listed above)
- `FIELD_MAP` / `ENUM_MAP` — Hebrew ↔ English column/value mappings (+ `FIELD_MAP_REV`, `ENUM_REV`)
- `getTenantId()` — returns current tenant UUID; use on every write and every select (Rule 22)

---

## Maintenance Rules

1. **New table?** → Add T constant to `js/shared.js` + add row here + add to module's `db-schema.sql` + add to `GLOBAL_SCHEMA.sql` at Integration Ceremony. All in the same commit.
2. **New column?** → Add to the row here + update module's `db-schema.sql` + update `GLOBAL_SCHEMA.sql` at Integration Ceremony.
3. **Renamed anything?** → Update here + update every `grep`-able reference in code and docs (Rule 21).
4. **Before adding a new table:** search this file first. If a similar table already exists, extend it instead of creating a duplicate.

---

*This file is a quick reference. The full authoritative schema is `docs/GLOBAL_SCHEMA.sql`.*
