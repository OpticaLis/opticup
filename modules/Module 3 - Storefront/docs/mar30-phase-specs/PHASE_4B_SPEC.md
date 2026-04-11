# Phase 4B — Bulk Operations (ERP Only)

> **Module:** 3 — Storefront
> **Repo:** opticup (ERP ONLY — do NOT touch opticup-storefront)
> **Execution mode:** AUTONOMOUS (continues from 4A if quality gate passed)
> **Depends on:** Phase 4A (storefront_mode columns exist on brands + inventory)
> **Created:** March 2026

---

## Objective

Add bulk storefront management UI to the ERP. Tenant (store owner) can:
1. View all brands with their storefront mode
2. Change mode per brand (catalog/shop/hidden)
3. View all products with their storefront override
4. Select multiple products → change mode / show / hide
5. Set storefront config (WhatsApp number, booking URL, notification method)

**This is ERP-only. No Storefront repo changes.**

---

## Pre-Requisites

- [ ] Phase 4A DB changes applied (storefront_mode on brands, storefront_mode_override on inventory)
- [ ] On `develop` branch in opticup repo

---

## Autonomous Execution Plan

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase4b"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Storefront Settings Page

**Repo:** opticup
**Files to create:** `modules/storefront/storefront-settings.html` + `storefront-settings.js`

**What to do:**
Create a settings page for storefront configuration.

**UI elements:**
- WhatsApp number input (text, validated as Israeli phone)
- Booking URL input (text, validated as URL)
- Notification method selector (dropdown: whatsapp / email / both)
- Save button

**Data source:** `storefront_config` table via existing DB wrapper
**Access:** Requires tenant login (PIN auth via auth-service.js)

**Follow ERP patterns:**
- Use `shared.js` Toast, Modal, DB.* wrapper
- Use existing CSS variables and layout patterns
- Add to ERP navigation menu

**Verify:**
- [ ] Page loads with current settings
- [ ] Save updates storefront_config
- [ ] Toast confirms save
- [ ] Validation works (phone format, URL format)

---

### Step 2 — Brand Storefront Mode Manager

**Repo:** opticup
**Files to create:** `modules/storefront/storefront-brands.html` + `storefront-brands.js`

**What to do:**
Show all brands with their current storefront mode. Allow changing per brand.

**UI:**
- Table with columns: Brand Name | Product Count | Current Mode | Action
- Mode selector per row: dropdown (catalog / shop / hidden / — follow default)
- "— follow default" = sets storefront_mode to NULL
- Changes save immediately (no bulk save button — each dropdown change saves)
- Toast on save

**Use TableBuilder** from shared components for the table.

**Data:** Query brands table with product count join, filter by tenant_id.

**Verify:**
- [ ] All brands shown with correct mode
- [ ] Dropdown change saves to DB
- [ ] Product count is accurate
- [ ] Toast on save

---

### Step 3 — Product Override Manager

**Repo:** opticup
**Files to create:** `modules/storefront/storefront-products.html` + `storefront-products.js`

**What to do:**
Show all products with their resolved mode. Allow overriding per product or in bulk.

**UI:**
- Filter bar: Brand dropdown, Mode filter, Search by model/barcode
- Table with columns: Checkbox | Brand | Model | Barcode | Brand Mode | Override | Resolved Mode
- Override column: dropdown (catalog / shop / hidden / — follow brand)
- Bulk action bar (appears when checkboxes selected):
  - "Set selected to: [catalog / shop / hidden / clear override]"
  - Product count: "X מוצרים נבחרו"
- Select all checkbox in header

**Use TableBuilder** with checkbox support.

**Bulk update logic:**
```javascript
// Get selected product IDs
const selectedIds = getSelectedRows().map(r => r.id);
// Update all at once
await DB.update('inventory', selectedIds.map(id => ({
  id,
  storefront_mode_override: newMode // or null for "clear override"
})));
```

**⛔ IMPORTANT:** Use the ERP patterns from `suppliers-debt.html` — that page uses legacy JS patterns (`toast()`, `confirmDialog()`, `fetchAll()`). Check which patterns are used in the closest existing page and follow them exactly.

**Verify:**
- [ ] Products shown with correct resolved mode
- [ ] Filter by brand works
- [ ] Individual override saves
- [ ] Bulk select + change mode works
- [ ] "Clear override" sets to NULL
- [ ] Toast confirms actions

---

### Step 4 — Add Navigation Links

**Repo:** opticup
**Files to modify:** Main navigation in ERP (sidebar or menu)

**What to do:**
Add "ניהול חנות אונליין" section to ERP navigation with links:
- הגדרות חנות → storefront-settings.html
- ניהול מותגים → storefront-brands.html
- ניהול מוצרים → storefront-products.html

**Access control:** Only show if tenant has storefront feature enabled (check plan/feature flags).

**Verify:**
- [ ] Nav links visible for tenant with storefront access
- [ ] Nav links hidden for tenant without access
- [ ] All 3 pages accessible from nav

---

### Step 5 — Update Documentation

**Repo:** opticup
**Files to update:**
- `SESSION_CONTEXT.md` (if exists for ERP)
- `CLAUDE.md` — add storefront management pages to file structure
- `ROADMAP.md` — Phase 4: "4A ✅, 4B ✅"
- `CHANGELOG.md`

**Verify:**
- [ ] All docs updated
- [ ] Committed to develop

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Settings page loads | Saves/loads WhatsApp, booking, notification | ⛔ STOP |
| Brand manager | Shows brands, mode changes save | ⛔ STOP |
| Product manager | Shows products, bulk select works | ⛔ STOP |
| Bulk operations | Select 5+ → change mode → all updated | ⛔ STOP |
| Navigation | Links work from ERP menu | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] storefront-settings page works
- [ ] storefront-brands page works
- [ ] storefront-products page with bulk ops works
- [ ] Navigation links added
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v4.0-phase4b-bulk-operations`
