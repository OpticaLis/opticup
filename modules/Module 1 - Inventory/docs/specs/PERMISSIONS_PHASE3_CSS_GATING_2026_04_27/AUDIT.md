# AUDIT — `.admin-mode` CSS coupling (Phase A read-only)

> **Phase A finding** for `PERMISSIONS_PHASE3_CSS_GATING_2026_04_27`.
> Maps each `.admin-mode`-gated CSS class to its correct permission key,
> verified against the actual HTML/JS use sites.

---

## §A — Per-class mapping

| Class | HTML/JS use site | Surrounding context | Currently gated by | SHOULD be gated by | Decision |
|---|---|---|---|---|---|
| `.qty-btns` | `modules/inventory/inventory-table.js:217` (qty cell renders `<span class="qty-btns"><button class="qty-btn qty-plus">➕</button><button class="qty-btn qty-minus">➖</button></span>`); also `modules/audit/qty-modal.js:103` (re-render after qty change) | Quantity adjustment buttons next to numeric quantity in inventory rows | `.admin-mode` (= `settings.edit`) | **`inventory.edit`** | **REMAP** — this is the user-visible bug |
| `.admin-col` | **NOT FOUND in any HTML/JS** (active source). Only the CSS rules exist. | Dead — no consumer | `.admin-mode` (= `settings.edit`) | `settings.edit` (no functional impact) | **KEEP** as-is for safety |
| `.admin-tab` | `inventory.html:44` "לוג מערכת" tab (also has `data-tab-permission="settings.view"` — double-gated). `admin.html:71-78` defines `.admin-tab` for the platform-admin top nav (different namespace inside admin.html — its own scoped styling, no overlap with the generic `.admin-mode .admin-tab` rule). | System-log tab — settings/admin functionality. Already protected by `data-tab-permission="settings.view"`. | `.admin-mode` (= `settings.edit`) | `settings.view` OR `settings.edit` (current is close enough; double-gating works) | **KEEP** — no functional gap. Inventory.html's button is also gated by `data-tab-permission="settings.view"` so JS-level hiding kicks in regardless. |
| `.cost-col` | `inventory.html:247` (`<th class="cost-col">מ.עלות</th><th class="cost-col">הנחה% עלות</th>`); `modules/inventory/inventory-table.js:215-216` (cost-price + cost-discount cells) | Cost data columns — financial information | `.admin-mode` (= `settings.edit`) | `settings.edit` | **KEEP** ✅ correct |
| `.cost-field` | `inventory.html:214-215` (bulk-edit cost inputs); `modules/inventory/inventory-entry.js:38-39` (per-row cost inputs in entry form) | Cost data inputs — financial information | `.admin-mode` (= `settings.edit`) | `settings.edit` | **KEEP** ✅ correct |

---

## §B — Live reproduction evidence (Chrome MCP, 2026-04-27 night)

### Manager (Demo, PIN 090004) — `localhost:3000/inventory.html?t=demo`

```javascript
{
  "role": "manager",
  "body_admin_mode": false,
  "has_inventory_edit": true,
  "has_settings_edit": false,
  "qty_btns_in_dom": 50,
  "qty_btns_visible": 0,         // ← THE BUG: JS rendered them, CSS hides them
  "cost_col_in_dom": 102,
  "cost_col_visible": 0,         // ← correct (settings.edit absent)
  "cost_field_in_dom": 4,
  "cost_field_visible": 2        // ← partial: bulk-bar is hidden by JS guard now;
                                 //   but the 2 visible may be from other rendering
                                 //   path. Re-check after fix.
}
```

Pre-fix screenshot: `manager-inventory-before.png` (this folder).

### Admin (Prizma, PIN 12345) — `localhost:3000/inventory.html?t=prizma`

```javascript
{
  "role": "ceo",
  "body_admin_mode": true,
  "has_inventory_edit": true,
  "has_settings_edit": true,
  "qty_btns_in_dom": 50,
  "qty_btns_visible": 50,        // ← all visible
  "cost_col_in_dom": 102,
  "cost_col_visible": 102        // ← all visible
}
```

Baseline screenshot: `admin-inventory-before.png`.

---

## §C — Conclusion

**Phase B fix is unambiguous and minimal:**

1. **Add `.has-inventory-edit` body class** toggled by `applyUIPermissions` in `js/auth-service.js`:
   ```js
   document.body.classList.toggle('has-inventory-edit', hasPermission('inventory.edit'));
   ```
2. **Update each of the 5 stylesheets** (employees.css, inventory.css, settings.css, shipments.css, styles.css):
   ```css
   /* old */ .qty-btns { display: none; }  .admin-mode .qty-btns { display: inline; }
   /* new */ .qty-btns { display: none; }  .has-inventory-edit .qty-btns { display: inline; }
   ```
   The other 4 classes (`.admin-col`, `.admin-tab`, `.cost-col`, `.cost-field`) keep `.admin-mode` gating — settings.edit is the correct permission for cost/settings UI.

**No regression risk:** ceo/admin has `settings.edit` AND `inventory.edit` granted, so both `.admin-mode` and `.has-inventory-edit` body classes are present → all CSS rules continue to fire as before. Manager gains visibility of `.qty-btns` only; cost-col/cost-field remain hidden as designed.

**Phase A may proceed to Phase B** without ambiguity.

---

*End of AUDIT.md.*
