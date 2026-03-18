# PHASE 4 SPEC — Table Builder + Permissions

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** 4 מתוך 6
> **תלויות:** פאזה 1 (CSS) ✅, פאזה 3 (Data Layer) ✅
> **מטרה:** כל טבלה חדשה במערכת נבנית דרך builder אחיד. כל כפתור מוגן הרשאות דרך attribute — לא if/else ידני.

---

## עקרון מנחה

- **Table Builder:** test page בלבד בפאזה 4. Pilot אמיתי (brands, suppliers, employees) = פאזה 5
- **PermissionUI:** wrapper מעל `hasPermission()` הקיים. אפס שינוי ל-auth-service.js. אפס קריאות DB — הכל מ-session
- **כרגיל:** אפס שינויים בדפים קיימים. בנייה ב-shared/, בדיקה ב-test pages

---

## קבצים חדשים

```
shared/
├── css/
│   └── table.css               — עיצוב Table Builder (header, rows, sort indicators, empty/loading states)
├── js/
│   ├── table-builder.js        — Table Builder API (create, setData, setLoading, updateRow, destroy)
│   └── permission-ui.js        — Permission-Aware UI (apply, applyTo, check)
└── tests/
    ├── table-test.html          — דף בדיקה: sort, empty, loading, RTL, row actions, 100+ rows
    └── permission-test.html     — דף בדיקה: hide, disable, multi-permission, dynamic content
```

**סה"כ:** 1 קובץ CSS + 2 קבצי JS + 2 דפי בדיקה = 5 קבצים חדשים.

---

## 1. Table Builder

### 1.1 table.css

CSS standalone — לא תלוי ב-components.css (אם כי אותם variables). כל ערך מ-`var(--...)`.

| רכיב | CSS Class | מה עושה |
|-------|-----------|---------|
| Wrapper | `.tb-wrapper` | container, overflow-x auto (responsive), border, border-radius |
| Table | `.tb-table` | width 100%, border-collapse, base font |
| Header row | `.tb-header` | background gray-50, font-weight semibold, sticky top (optional) |
| Header cell | `.tb-th` | padding, text-align start, cursor default |
| Sortable header | `.tb-th-sortable` | cursor pointer, hover background |
| Sort indicator | `.tb-th-sortable::after` | arrow icon (▲/▼), content via data-sort-dir attribute |
| Sort active | `.tb-th-sort-active` | highlighted, bold arrow |
| Body row | `.tb-row` | border-bottom, hover background |
| Body row alt | `.tb-row:nth-child(even)` | subtle alternating background (zebra) |
| Body cell | `.tb-td` | padding, vertical-align middle |
| Actions cell | `.tb-td-actions` | flex, gap, no-wrap |
| Empty state | `.tb-empty` | centered container: icon + text + optional CTA button |
| Loading | `.tb-loading` | skeleton rows using `.skeleton-row` from components-extra.css |
| Responsive | `@media` | horizontal scroll on narrow screens |

**RTL:** all padding/text-align use logical properties. Sort arrow position = inline-end.

### 1.2 table-builder.js — API

```javascript
// ============================================
// TableBuilder.create(config) — Create a managed table
// ============================================
// config: {
//   containerId: string              (required — id of DOM element to render into)
//   columns: [                       (required — column definitions)
//     {
//       key: string,                 (data field name)
//       label: string,               (header text, Hebrew)
//       sortable: boolean,           (default: false)
//       type: 'text'|'number'|'currency'|'date'|'badge'|'actions'|'custom',
//       render: function(value, row), (optional — custom cell renderer, returns HTML string)
//       width: string,               (optional — CSS width, e.g. '120px', '15%')
//       cssClass: string,            (optional — extra class on td)
//     }
//   ],
//   emptyState: {                    (optional — shown when data is empty)
//     icon: string,                  (emoji or HTML)
//     text: string,                  (message)
//     cta: {                         (optional — action button)
//       label: string,
//       onClick: function
//     }
//   },
//   onSort: function(key, direction), (optional — called on sort click. 'asc'|'desc')
//   onRowClick: function(row, el),   (optional — called on row click)
//   rowId: string,                   (optional — field to use as row identifier, default: 'id')
//   stickyHeader: boolean,           (optional — sticky thead, default: false)
//   rtl: boolean,                    (optional — RTL mode, default: true)
//   skeletonRows: number,            (optional — number of skeleton rows in loading state, default: 5)
// }
// returns: TableInstance

const table = TableBuilder.create({
  containerId: 'my-table',
  columns: [
    { key: 'barcode', label: 'ברקוד', type: 'text', sortable: true },
    { key: 'brand', label: 'מותג', type: 'text', sortable: true },
    { key: 'cost', label: 'עלות', type: 'currency', sortable: true },
    { key: 'quantity', label: 'כמות', type: 'number', sortable: true },
    { key: 'status', label: 'סטטוס', type: 'badge', render: (val) => `<span class="badge badge-${val}">${val}</span>` },
    { key: 'actions', label: '', type: 'actions', render: (val, row) => `<button onclick="edit('${row.id}')">ערוך</button>` }
  ],
  emptyState: { icon: '📦', text: 'אין פריטים', cta: { label: 'הוסף פריט', onClick: addItem } },
  onSort: (key, dir) => { reloadData(key, dir) },
  stickyHeader: true
})


// ============================================
// table.setData(rows) — Set/replace all data
// ============================================
// rows: array of objects
// Renders the table body. Clears previous data.
// If rows is empty → shows emptyState (if configured)

table.setData(items)


// ============================================
// table.setLoading(isLoading) — Toggle loading state
// ============================================
// isLoading: boolean
// true → shows skeleton rows (hides data/empty)
// false → shows data or empty state

table.setLoading(true)
// ... fetch data ...
table.setLoading(false)


// ============================================
// table.updateRow(rowId, newData) — Update single row in-place
// ============================================
// rowId: string (value of the rowId field for the target row)
// newData: object (fields to update — merged with existing row data)
// Re-renders only the affected row, not the entire table

table.updateRow('abc-123', { quantity: 5, status: 'low_stock' })


// ============================================
// table.removeRow(rowId) — Remove single row from display
// ============================================
// Does not touch DB — only removes from rendered table
// If no rows remain → shows emptyState

table.removeRow('abc-123')


// ============================================
// table.getData() — Get current data array
// ============================================
// returns: array of row objects (current state)

const currentData = table.getData()


// ============================================
// table.destroy() — Clean up
// ============================================
// Removes all rendered HTML, clears internal state
// Call when navigating away or replacing the table

table.destroy()
```

**Built-in type renderers:**

| type | What it does |
|------|-------------|
| `text` | Escapes HTML, displays as text |
| `number` | Right-aligned (logical: end), formatted with locale |
| `currency` | Right-aligned, formatted with ₪ symbol (or tenant currency) |
| `date` | Formatted date (DD/MM/YYYY or tenant format) |
| `badge` | Wraps value in `.badge` span — caller provides render for variant |
| `actions` | No header label, no sort. Cell rendered via render function |
| `custom` | Fully custom — must provide render function |

**Built-in sort:**
- Click header → `onSort(key, 'asc')`. Click again → `onSort(key, 'desc')`. Click third → `onSort(key, 'asc')` (toggle)
- **TableBuilder does NOT sort data internally.** It only tracks sort state visually (arrow direction) and calls `onSort`. The caller is responsible for fetching/sorting data and calling `table.setData(sortedData)`
- Reason: data may be server-sorted (DB ORDER BY) or have complex sort logic. Builder doesn't assume

**XSS safety:**
- `type: 'text'` → value goes through `escapeHtml()` automatically
- `type: 'custom'` or `render` function → **caller's responsibility** to escape. Builder injects as innerHTML
- Column `label` → escaped automatically

### 1.3 Dependencies

- **shared/css/table.css** — must be loaded
- **shared/css/variables.css** — via table.css or page-level
- **components-extra.css** — optional, for `.skeleton-row` in loading state. If not loaded, loading state shows a simple text "טוען..."
- **escapeHtml()** — from shared.js (used for text columns). If not available, falls back to basic entity replacement
- **אפס תלות ב-DB.*, Modal, Toast, ActivityLog, PermissionUI**

**File size estimate:** ~200-250 שורות. Straightforward — no wizard-level complexity.

---

## 2. Permission-Aware UI

### 2.1 permission-ui.js — API

```javascript
// ============================================
// PermissionUI.apply() — Scan entire page
// ============================================
// Finds all elements with [data-permission] attribute
// For each: checks hasPermission() → hides or disables
// Called once after login/page load

PermissionUI.apply()


// ============================================
// PermissionUI.applyTo(container) — Scan specific container
// ============================================
// Same as apply() but scoped to a container element
// Use after dynamically adding content (modal, table rows, etc.)

PermissionUI.applyTo(document.getElementById('modal-content'))


// ============================================
// PermissionUI.check(permission) — Manual check
// ============================================
// permission: string — dot-notation, e.g. 'inventory.delete'
// returns: boolean
// Wrapper around hasPermission() — splits dot-notation and calls hasPermission(module, action)

const canDelete = PermissionUI.check('inventory.delete')
```

**HTML attribute API:**

```html
<!-- Element hidden if no permission (default behavior) -->
<button data-permission="inventory.delete">מחק</button>

<!-- Element disabled (visible but not clickable) + tooltip -->
<button data-permission="inventory.edit" data-permission-mode="disable">ערוך</button>

<!-- Entire section hidden -->
<div data-permission="shipments.settings">הגדרות משלוחים...</div>

<!-- OR logic — visible if user has ANY of the listed permissions -->
<button data-permission="inventory.edit|inventory.admin">ערוך/מנהל</button>
```

**Behavior:**

| data-permission-mode | No permission → | Has permission → |
|---------------------|-----------------|------------------|
| (default / "hide") | `display: none` | unchanged |
| "disable" | `disabled` attribute + `opacity: 0.5` + `title="אין הרשאה"` | unchanged |

**Processing logic:**
1. `querySelectorAll('[data-permission]')` within scope (document or container)
2. For each element:
   - Parse permission string: split by `|` for OR logic
   - For each permission: split by `.` → `hasPermission(module, action)`
   - If OR: any match = allowed
   - If no match: apply hide or disable based on `data-permission-mode`

**Integration with existing system:**
- `hasPermission(module, action)` already exists in auth-service.js
- Reads from session — zero DB calls
- `PermissionUI.apply()` is a new function that automates what developers did manually with if/else
- **Backward compatible:** `applyUIPermissions()` in auth-service.js will eventually call `PermissionUI.apply()` internally, but that change is for Phase 5. In Phase 4: both exist independently

### 2.2 Dependencies

- **hasPermission()** — from auth-service.js (must be loaded before PermissionUI)
- **אפס תלות ב-CSS, DB.*, Modal, Toast, Table, ActivityLog**

**File size estimate:** ~60-80 שורות. Simple scanning logic.

---

## שינויי DB

**אין.** פאזה 4 היא JS + CSS בלבד.

---

## Contracts — מה הפאזה חושפת

### JS Functions (public API)

```
// Table Builder — shared/js/table-builder.js
TableBuilder.create(config)           → TableInstance
  table.setData(rows)                 → void
  table.setLoading(isLoading)         → void
  table.updateRow(rowId, newData)     → void
  table.removeRow(rowId)              → void
  table.getData()                     → array
  table.destroy()                     → void

// Permission UI — shared/js/permission-ui.js
PermissionUI.apply()                  → void (scans document)
PermissionUI.applyTo(container)       → void (scans container)
PermissionUI.check(permission)        → boolean
```

### CSS Classes (public API)

```
/* table.css */
.tb-wrapper, .tb-table
.tb-header, .tb-th, .tb-th-sortable, .tb-th-sort-active
.tb-row, .tb-td, .tb-td-actions
.tb-empty, .tb-empty-icon, .tb-empty-text, .tb-empty-cta
.tb-loading
```

### HTML Attributes (public API)

```html
data-permission="module.action"           — permission check
data-permission="perm1|perm2"             — OR logic
data-permission-mode="hide"               — hide element (default)
data-permission-mode="disable"            — disable element
```

---

## Integration Points — שינויים בקוד קיים

**בפאזה 4: אפס שינויים בקבצים קיימים.**

| קובץ קיים | שינוי בפאזה 4 | שינוי בפאזה 5 (migration) |
|-----------|----------------|--------------------------|
| auth-service.js | **לא נגעים** | `applyUIPermissions()` יקרא ל-`PermissionUI.apply()` פנימית |
| inventory.html | **לא נגעים** | מוסיף `data-permission` attributes, אולי Table Builder |
| שאר הדפים | **לא נגעים** | אותו תהליך |
| styles.css | **לא נגעים** | |
| shared.js | **לא נגעים** | |

---

## סדר ביצוע (Migration Steps)

```
Step 1:  יצירת shared/css/table.css — wrapper, header, rows, sort, empty, loading, responsive, RTL
Step 2:  יצירת shared/js/table-builder.js — create, setData, setLoading, updateRow, removeRow, getData, destroy
         ⚠️ Iron Rule #12: grep for 'TableBuilder' before creating — verify no name collision
Step 3:  יצירת shared/tests/table-test.html — mock data (100 rows), all column types, sort, empty, loading, RTL
Step 4:  בדיקת Table Builder — sort toggles, empty state, loading skeleton, row update, row remove, destroy
Step 5:  יצירת shared/js/permission-ui.js — apply, applyTo, check
         ⚠️ Iron Rule #12: grep for 'PermissionUI' before creating — verify no name collision
         ⚠️ BEFORE WRITING: read auth-service.js, understand hasPermission() signature
Step 6:  יצירת shared/tests/permission-test.html — mock permissions, hide/disable/OR, dynamic content with applyTo
Step 7:  בדיקת PermissionUI — hide works, disable works, OR logic, applyTo on dynamic content
Step 8:  Final verification + regression on 6 pages
```

**כל step = פרומפט נפרד ל-Claude Code.**

---

## Verification Checklist

### Table Builder
- [ ] `TableBuilder.create({ containerId, columns })` — renders empty table with headers
- [ ] `table.setData(100rows)` — renders 100 rows correctly
- [ ] `table.setData([])` — shows emptyState (icon + text + CTA)
- [ ] `table.setLoading(true)` — shows skeleton rows
- [ ] `table.setLoading(false)` — returns to data/empty view
- [ ] Sort click → `onSort(key, 'asc')` called, arrow visible
- [ ] Sort click again → `onSort(key, 'desc')`, arrow flipped
- [ ] `table.updateRow(id, data)` — single row re-rendered, rest unchanged
- [ ] `table.removeRow(id)` — row removed, if last row → emptyState
- [ ] `table.getData()` — returns current data array
- [ ] `table.destroy()` — DOM cleaned up
- [ ] `type: 'text'` — HTML escaped automatically
- [ ] `type: 'currency'` — formatted with ₪, right-aligned
- [ ] `type: 'number'` — right-aligned
- [ ] `type: 'actions'` — render function called, buttons displayed
- [ ] `type: 'custom'` — render function called with (value, row)
- [ ] `onRowClick` — callback fired with row data
- [ ] `stickyHeader: true` — header stays visible on scroll
- [ ] RTL — text alignment, sort arrow position correct
- [ ] Responsive — horizontal scroll on narrow screen
- [ ] XSS — `<script>` in text column does not execute

### Permission-Aware UI
- [ ] `data-permission="inventory.delete"` — element hidden when no permission
- [ ] `data-permission="inventory.delete"` — element visible when has permission
- [ ] `data-permission-mode="disable"` — element disabled + opacity + tooltip
- [ ] `data-permission="perm1|perm2"` — visible if has either permission
- [ ] `PermissionUI.apply()` — scans entire page
- [ ] `PermissionUI.applyTo(container)` — scans only container
- [ ] `PermissionUI.check('inventory.delete')` — returns boolean
- [ ] Dynamic content — add element after page load, `applyTo()` hides it correctly
- [ ] No permission data in session — all permission-guarded elements hidden
- [ ] **hasPermission() still works standalone** — PermissionUI doesn't break it

### Regression (קריטי!)
- [ ] **inventory.html** — נטען תקין, PIN עובד, כל הפיצ'רים
- [ ] **suppliers-debt.html** — נטען תקין
- [ ] **shipments.html** — נטען תקין
- [ ] **employees.html** — נטען תקין
- [ ] **settings.html** — נטען תקין
- [ ] **index.html** — login עובד
- [ ] אפס console errors בכל 6 הדפים
- [ ] existing permission logic (if/else in modules) — **עדיין עובד כמו קודם**

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
