# PHASE 3 SPEC — Data Layer

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** 3 מתוך 6
> **תלויות:** פאזה 1 (CSS Foundation) ✅, פאזה 2 (Core UI Components) ✅
> **מטרה:** כל קריאה ל-Supabase עוברת דרך wrapper אחיד עם error handling, loading state, ו-tenant context אוטומטי. כל פעולה מתועדת ב-activity_log מרכזי. כל read→compute→write מזוהה ומתועד.

---

## עקרון מנחה — Build Beside, Don't Replace

- `DB.*` נבנה כמערכת חדשה עצמאית
- **לא נוגעים ב-shared.js** — fetchAll/batchCreate ממשיכים לעבוד
- שני ה-APIs חיים במקביל עד פאזה 5 (migration)
- DB.* חייב להיות **superset** של מה ש-shared.js עושה — כדי שב-migration לא יחסרו יכולות
- Activity Log חי **ליד** inventory_logs — לא מחליף. inventory_logs = business-level (quantity/price), activity_log = system-level (login, settings, cross-module)
- בפאזה 3: test pages בלבד. חיבור לפעולות אמיתיות = פאזה 5

---

## קבצים חדשים

```
shared/
├── js/
│   ├── supabase-client.js     — Supabase wrapper (DB.select/insert/update/softDelete/rpc)
│   └── activity-logger.js     — Activity Log JS helper (ActivityLog.write/warning/error/critical)
└── tests/
    ├── db-test.html            — דף בדיקה: כל פעולות DB, spinner, error handling, tenant context
    └── activity-log-test.html  — דף בדיקה: כל levels, changeset format, session auto-inject
```

**סה"כ:** 2 קבצי JS + 2 דפי בדיקה = 4 קבצים חדשים + 1 טבלת DB + scan report.

---

## 1. Supabase Wrapper — supabase-client.js

### 1.1 מה הוא עושה

כל קריאה ל-Supabase עוברת דרך `DB.*`:
- **Error handling אחיד:** שגיאה → Toast.error() (אם Toast זמין) או console.error(). RLS violation → הודעה ספציפית ("אין גישה"). Network error → הודעה ספציפית ("בעיית תקשורת").
- **Loading spinner:** כל קריאה → spinner אוטומטי אחרי debounce 200ms (אלא אם `{ silent: true }`). קריאה שחוזרת תוך 200ms = אפס spinner.
- **Tenant context:** כל insert מקבל `tenant_id` אוטומטית מ-session. כל select מסנן לפי `tenant_id`. אין מצב ששוכחים.
- **Response normalization:** כל תשובה מגיעה כ-`{ data, error, count }` אחיד.

### 1.2 מה הוא לא עושה

- **לא retry logic** — Supabase v2 כבר מנהל reconnect
- **לא cache** — אין בעיית ביצועים היום
- **לא מחליף shared.js** — עובד לידו. shared.js ממשיך עם helpers עסקיים (formatCurrency, escapeHtml, FIELD_MAP, fetchAll, batchCreate)

### 1.3 Spinner — CSS-only, inline, standalone

Spinner הוא חלק מ-supabase-client.js עצמו:
- מזריק `<style>` פעם אחת ב-DOM (lazy — בקריאת DB ראשונה)
- CSS-only animation (spinner pseudo-element או inline SVG)
- Overlay semi-transparent שמכסה את הדף
- **Debounce 200ms:** timer מתחיל כשקריאה יוצאת. אם התשובה חוזרת תוך 200ms — spinner לא מוצג כלל. אם עוברים 200ms — spinner מופיע
- קריאות מקביליות: counter פנימי. spinner נעלם רק כש-counter חוזר ל-0
- `{ silent: true }` = אפס spinner, אפס toast. לקריאות רקע שקטות

### 1.4 Error handling — Toast optional dependency

```javascript
// Pattern for all error reporting
function _reportError(message, originalError) {
  if (typeof Toast !== 'undefined' && Toast.error) {
    Toast.error(message);
  } else {
    console.error('[DB]', message, originalError);
  }
}
```

**Error classification:**
| Error type | Message (Hebrew) | Detection |
|-----------|-----------------|-----------|
| RLS violation | "אין גישה לנתונים אלו" | error.code === '42501' or error.message includes 'row-level security' |
| Network error | "בעיית תקשורת — נסה שוב" | error.message includes 'Failed to fetch' or 'NetworkError' |
| Not found | "הרשומה לא נמצאה" | data === null on single-row queries |
| Unique violation | "רשומה כזו כבר קיימת" | error.code === '23505' |
| General DB error | "שגיאה: " + error.message | fallback |

### 1.5 API — Public

```javascript
// ============================================
// DB.select(table, filters?, options?) — Query
// ============================================
// table: string (table name)
// filters: object (key-value pairs for .eq() matching) (default: {})
// options: {
//   order: string                 — e.g. 'created_at.desc' or 'name.asc'
//   limit: number                 — max rows
//   offset: number                — skip rows (for pagination)
//   columns: string               — column selection, e.g. '*, brand:brands(name)'
//   single: boolean               — expect single row, return object not array (default: false)
//   count: 'exact'|'planned'|null — count mode (default: null)
//   silent: boolean               — no spinner, no toast (default: false)
//   rawFilters: function(query)   — escape hatch: function that receives Supabase query builder
//                                   for complex filters (.or, .in, .gte, .lte, .ilike, .is)
//                                   Example: (q) => q.or('status.eq.active,status.eq.pending')
// }
// returns: { data: array|object|null, error: object|null, count: number|null }

// Simple query
const { data } = await DB.select('inventory', { is_deleted: false })

// With ordering and limit
const { data } = await DB.select('inventory', { is_deleted: false }, {
  order: 'created_at.desc',
  limit: 50
})

// With joins (columns)
const { data } = await DB.select('inventory', { is_deleted: false }, {
  columns: '*, brand:brands(name, supplier:suppliers(name))'
})

// Single row
const { data: item } = await DB.select('inventory', { id: someId }, { single: true })

// With pagination count
const { data, count } = await DB.select('inventory', { is_deleted: false }, {
  count: 'exact',
  limit: 20,
  offset: 0
})

// Complex filters via rawFilters
const { data } = await DB.select('inventory', {}, {
  rawFilters: (q) => q.gte('quantity', 0).lte('quantity', 10).ilike('model', '%classic%')
})

// Silent (background query)
const { data } = await DB.select('brands', {}, { silent: true })


// ============================================
// DB.insert(table, data, options?) — Insert row(s)
// ============================================
// table: string
// data: object | array of objects (tenant_id auto-injected to each)
// options: {
//   silent: boolean              (default: false)
//   returning: string            (columns to return, default: '*')
//   onConflict: string           (for upsert — conflict columns, e.g. 'barcode,tenant_id')
// }
// returns: { data, error }

// Single insert (tenant_id injected automatically)
const { data } = await DB.insert('inventory', { barcode: 'AB12345', brand_id, model })

// Batch insert
const { data } = await DB.insert('inventory', [item1, item2, item3])

// Upsert
const { data } = await DB.insert('inventory', { barcode: 'AB12345', model: 'new' }, {
  onConflict: 'barcode,tenant_id'
})


// ============================================
// DB.update(table, id, changes, options?) — Update by id
// ============================================
// table: string
// id: string (UUID — matched against 'id' column)
// changes: object (key-value pairs to update)
// options: {
//   silent: boolean              (default: false)
//   returning: string            (default: '*')
//   idColumn: string             (default: 'id' — override for tables with different PK name)
// }
// returns: { data, error }

const { data } = await DB.update('inventory', itemId, { model: 'Classic Pro', cost: 250 })


// ============================================
// DB.softDelete(table, id, options?) — Soft delete (is_deleted = true)
// ============================================
// table: string
// id: string (UUID)
// options: {
//   silent: boolean              (default: false)
//   idColumn: string             (default: 'id')
// }
// returns: { data, error }

const { data } = await DB.softDelete('inventory', itemId)


// ============================================
// DB.rpc(functionName, params?, options?) — Call RPC
// ============================================
// functionName: string
// params: object (default: {})
// options: {
//   silent: boolean              (default: false)
// }
// returns: { data, error }

const { data } = await DB.rpc('update_quantity', { p_id: id, p_delta: -1 })


// ============================================
// DB.hardDelete(table, id, options?) — Permanent delete
// ============================================
// table: string
// id: string (UUID)
// options: {
//   silent: boolean              (default: false)
//   idColumn: string             (default: 'id')
// }
// returns: { data, error }
// ⚠️ Use only after double PIN confirmation (Iron Rule #3)

const { data } = await DB.hardDelete('audit_log_archive', id)
```

### 1.6 Superset check — מה shared.js עושה שDB.* חייב לתמוך

> ⚠️ **הוראה ל-Claude Code:** לפני כתיבת supabase-client.js, חובה לקרוא את shared.js ולתעד כל פונקציית DB שקיימת שם. ה-SPEC מתאר את ה-API המתוכנן, אבל Claude Code חייב לוודא שאין capability gap. אם fetchAll או batchCreate עושים משהו שDB.* לא מכסה — לתעד ולדווח לפני שכותבים קוד.

**יכולות ידועות ב-shared.js שDB.* חייב לכסות:**
- `fetchAll(table, filters)` — select with filters → **DB.select**
- `batchCreate(table, rows)` — multi-insert → **DB.insert (array)**
- `batchUpdate(table, updates)` — multi-update → **DB.update** (one at a time, or consider DB.batchUpdate if shared.js does something smarter)
- Automatic `tenant_id` injection → **DB.insert auto-injects**
- Automatic `is_deleted = false` filter → **NOT auto-added by DB.select** (explicit by caller — this is intentional: not every table uses soft delete)

### 1.7 Dependencies

- **Supabase JS v2** — `sb` global from shared.js (supabase client instance)
- **getTenantId()** — from shared.js (session-based tenant ID)
- **Toast** — optional (if `window.Toast` exists, used for errors)
- **אפס תלות ב-CSS חיצוני** — spinner CSS injected inline
- **אפס תלות ב-modal, table-builder, permission-ui**

**File size estimate:** ~200-250 שורות. אם חורג מ-350 → לפצל spinner logic ל-`db-spinner.js`.

---

## 2. Activity Log

### 2.1 DB Schema

```sql
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID,
  user_id UUID REFERENCES employees(id),
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warning', 'error', 'critical')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_activity_log_tenant
  ON activity_log(tenant_id);
CREATE INDEX idx_activity_log_entity
  ON activity_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_activity_log_action
  ON activity_log(tenant_id, action);
CREATE INDEX idx_activity_log_created
  ON activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_log_level
  ON activity_log(tenant_id, level)
  WHERE level IN ('warning', 'error', 'critical');
```

**Columns explained:**

| Column | Type | Description |
|--------|------|-------------|
| `tenant_id` | UUID | Required. RLS isolation |
| `branch_id` | UUID | Optional. For multi-branch tenants (future) |
| `user_id` | UUID | Employee who performed the action. Auto from session |
| `level` | TEXT | info / warning / error / critical |
| `action` | TEXT | Dot-notation: 'inventory.update', 'auth.login_failed', 'shipment.create' |
| `entity_type` | TEXT | Which table/module: 'inventory', 'shipment', 'employee', 'supplier' |
| `entity_id` | TEXT | The specific record. UUID, barcode, or any identifier. TEXT for flexibility |
| `details` | JSONB | Structured data. For updates: `{ changes: [{ field, old, new }] }` |
| `ip_address` | TEXT | Optional. For future security auditing |
| `user_agent` | TEXT | Optional. For future device tracking |

**Relationship to inventory_logs:**
- `inventory_logs` = business audit trail — quantity/price changes, field-level diffs
- `activity_log` = system event log — login, settings, permissions, cross-module events
- They live side by side. No data migration between them
- In the future, a unified view may join them — but that's not in scope

### 2.2 activity-logger.js — API

```javascript
// ============================================
// ActivityLog.write(config) — Log an event (level: 'info')
// ============================================
// config: {
//   action: string          (required — dot-notation, e.g. 'inventory.update')
//   entity_type: string     (required — e.g. 'inventory', 'shipment')
//   entity_id: string       (optional — record identifier)
//   details: object         (optional — any structured data, default: {})
//   level: string           (optional — override level, default: 'info')
// }
// tenant_id, user_id, branch_id = auto-injected from session
// returns: { data, error } (from DB.insert or direct sb call)

ActivityLog.write({
  action: 'inventory.update',
  entity_type: 'inventory',
  entity_id: 'AB12345',
  details: { changes: [{ field: 'model', old: 'Classic', new: 'Classic Pro' }] }
})


// ============================================
// ActivityLog.warning(config) — Log a warning
// ============================================
// Same config as write(), level forced to 'warning'

ActivityLog.warning({
  action: 'stock.low',
  entity_type: 'inventory',
  entity_id: 'AB12345',
  details: { current_qty: 2, threshold: 5 }
})


// ============================================
// ActivityLog.error(config) — Log an error
// ============================================
// Same config as write(), level forced to 'error'

ActivityLog.error({
  action: 'auth.login_failed',
  entity_type: 'employee',
  entity_id: 'emp-123',
  details: { reason: 'wrong_pin', attempts: 4 }
})


// ============================================
// ActivityLog.critical(config) — Log a critical event
// ============================================
// Same config as write(), level forced to 'critical'

ActivityLog.critical({
  action: 'rls.violation',
  entity_type: 'inventory',
  details: { attempted_tenant: '...', actual_tenant: '...' }
})
```

**Internal behavior:**
- כל method קורא ל-`DB.insert('activity_log', {...}, { silent: true })` אם DB.* זמין, אחרת `sb.from('activity_log').insert(...)` ישירות
- **Always silent** — activity log לעולם לא מציג spinner או toast
- **Always async, non-blocking** — fire and forget. לא מחכים לתוצאה. שגיאת כתיבה ל-log לא שוברת את הפעולה המקורית
- Auto-inject: `tenant_id` מ-`getTenantId()`, `user_id` מ-`getCurrentEmployeeId()` (or equivalent session function)
- `ip_address` ו-`user_agent`: לא נאספים בפאזה 3 (client-side limitation). fields קיימים למילוי עתידי (server-side / edge function)

**Changeset format convention:**
```javascript
// For entity updates — always use this format in details:
{
  changes: [
    { field: 'model', old: 'Classic', new: 'Classic Pro' },
    { field: 'cost', old: 150, new: 250 }
  ]
}

// For non-update events — free-form JSONB:
{
  reason: 'wrong_pin',
  attempts: 4
}
```

### 2.3 Dependencies

- **DB.*** — optional (if available, uses DB.insert; otherwise falls back to sb.from directly)
- **getTenantId()** — from shared.js
- **getCurrentEmployeeId()** or equivalent — from auth-service.js / session
- **אפס תלות ב-CSS, Modal, Toast, Table**

**File size estimate:** ~80-100 שורות.

---

## 3. Atomic RPC Scan

### 3.1 Scope

This is a **scan + document + fix if needed** task, not a rewrite.

**Background:** Phase 5.5 of Module 1 already fixed the critical race conditions:
- Quantity updates → atomic RPC with `FOR UPDATE` locking
- `next_internal_doc_number` → atomic RPC

**What to do in Phase 3:**

1. **Scan** — `grep -rn` across the entire repo for patterns:
   - `.select(...)` followed by `.update(...)` on the same table in the same function
   - Manual calculations between select and update (e.g. `newQty = currentQty + delta`)
   - Any `quantity = ` or `counter = ` assignment followed by `.update()`

2. **Document** — Create a report table:

   | File | Line | Pattern | Status | Notes |
   |------|------|---------|--------|-------|
   | modules/inventory/... | 42 | select qty → add delta → update | ✅ Already atomic (RPC) | Fixed in Phase 5.5 |
   | modules/debt/... | 87 | select balance → subtract → update | ❌ Not atomic | Needs RPC |

3. **Fix** — Any pattern found that is NOT already atomic:
   - Write new RPC function (SECURITY DEFINER, atomic)
   - Replace JS-side read→compute→write with RPC call
   - Test the fix

4. **Report** — Deliver the scan results to Daniel as a summary table. If all patterns are already covered → verification complete. If new patterns found → document the fixes.

### 3.2 Output

- **Scan report** — Markdown table in SESSION_CONTEXT.md (or separate ATOMIC_RPC_SCAN.md if large)
- **New RPCs** (if needed) — SQL + documentation in db-schema.sql and MODULE_MAP.md
- **No changes** if everything is already atomic — just the verification report

---

## שינויי DB

```sql
-- Activity Log table (see section 2.1 for full SQL)
CREATE TABLE activity_log (...);
-- 5 indexes
-- RLS policy

-- Possible new RPC functions from Atomic RPC scan (if needed)
-- Will be documented in scan report
```

---

## Contracts — מה הפאזה חושפת

### JS Functions (public API)

```
// Supabase Wrapper — shared/js/supabase-client.js
DB.select(table, filters?, options?)      → { data, error, count }
DB.insert(table, data, options?)          → { data, error }
DB.update(table, id, changes, options?)   → { data, error }
DB.softDelete(table, id, options?)        → { data, error }
DB.hardDelete(table, id, options?)        → { data, error }
DB.rpc(functionName, params?, options?)   → { data, error }

// Activity Logger — shared/js/activity-logger.js
ActivityLog.write(config)                 → void (fire & forget)
ActivityLog.warning(config)               → void
ActivityLog.error(config)                 → void
ActivityLog.critical(config)              → void
```

### DB Tables

```
activity_log — system event log (see section 2.1)
```

---

## Integration Points — שינויים בקוד קיים

**בפאזה 3: כמעט כלום.** אין שינויים בדפים קיימים.

| קובץ קיים | שינוי בפאזה 3 | הערה |
|-----------|----------------|------|
| shared.js | **לא נגעים** | fetchAll/batchCreate ממשיכים לעבוד |
| auth-service.js | **לא נגעים** | |
| styles.css | **לא נגעים** | |
| 6 HTML pages | **לא נגעים** | |
| db-schema.sql | **מתעדכן** | activity_log + RPCs חדשים (אם יש) |
| MODULE_MAP.md | **מתעדכן** | קבצים ופונקציות חדשים |

**חריג:** אם ה-Atomic RPC scan מגלה patterns שצריך לתקן — יהיו שינויים בקבצי המודולים הרלוונטיים. כל fix = step נפרד עם regression test.

---

## סדר ביצוע (Migration Steps)

```
Step 1:  CREATE TABLE activity_log — SQL + RLS + indexes
Step 2:  יצירת shared/js/supabase-client.js — DB.select/insert/update/softDelete/hardDelete/rpc + spinner + error handling
         ⚠️ BEFORE WRITING: read shared.js, document all DB functions, verify superset coverage
Step 3:  יצירת shared/tests/db-test.html — test all DB operations, spinner debounce, error classification, tenant auto-inject
Step 4:  בדיקת DB wrapper — all operations work, spinner appears after 200ms, errors display correctly
Step 5:  יצירת shared/js/activity-logger.js — ActivityLog.write/warning/error/critical
Step 6:  יצירת shared/tests/activity-log-test.html — test all levels, changeset format, session inject, fire-and-forget
Step 7:  בדיקת Activity Log — records appear in DB, levels correct, auto-inject works, no blocking
Step 8:  Atomic RPC scan — grep repo, build report table, identify gaps
Step 9:  Atomic RPC fixes (if needed) — new RPCs + code changes + tests. One fix per step
Step 10: Final verification — all tests pass, scan report complete, regression on 6 pages
```

**כל step = פרומפט נפרד ל-Claude Code.**

---

## Verification Checklist

### Supabase Wrapper
- [ ] `DB.select('inventory', { is_deleted: false })` — returns array
- [ ] `DB.select('inventory', { id }, { single: true })` — returns object
- [ ] `DB.select` with `order`, `limit`, `offset` — works
- [ ] `DB.select` with `columns` (joins) — works
- [ ] `DB.select` with `rawFilters` — complex filters work
- [ ] `DB.select` with `count: 'exact'` — returns count
- [ ] `DB.insert('inventory', {...})` — tenant_id auto-injected
- [ ] `DB.insert('inventory', [arr])` — batch insert works
- [ ] `DB.insert` with `onConflict` — upsert works
- [ ] `DB.update('inventory', id, changes)` — updates row
- [ ] `DB.softDelete('inventory', id)` — sets is_deleted = true
- [ ] `DB.hardDelete('table', id)` — permanently deletes
- [ ] `DB.rpc('fn', params)` — calls RPC, returns result
- [ ] **Spinner:** query > 200ms → spinner appears
- [ ] **Spinner:** query < 200ms → no spinner (debounce)
- [ ] **Spinner:** 3 parallel queries → spinner shows until all complete
- [ ] **Silent:** `{ silent: true }` → no spinner, no toast
- [ ] **Error — RLS:** → "אין גישה לנתונים אלו" (Toast or console)
- [ ] **Error — Network:** → "בעיית תקשורת — נסה שוב"
- [ ] **Error — Unique:** → "רשומה כזו כבר קיימת"
- [ ] **Error — General:** → "שגיאה: [message]"
- [ ] **Toast fallback:** Toast not loaded → errors go to console.error

### Activity Log
- [ ] `activity_log` table exists with all columns
- [ ] RLS policy active — tenant isolation
- [ ] `ActivityLog.write({ action, entity_type })` — record created with level='info'
- [ ] `ActivityLog.warning({...})` — record created with level='warning'
- [ ] `ActivityLog.error({...})` — record created with level='error'
- [ ] `ActivityLog.critical({...})` — record created with level='critical'
- [ ] Auto-inject: tenant_id, user_id populated from session
- [ ] Changeset format: `{ changes: [{ field, old, new }] }` stored correctly
- [ ] Fire and forget: ActivityLog call doesn't block UI
- [ ] Error resilience: failed log write doesn't crash the app

### Atomic RPC Scan
- [ ] Scan report delivered — table of all read→compute→write patterns
- [ ] Each pattern marked: ✅ already atomic or ❌ needs fix
- [ ] All ❌ patterns fixed with new RPCs (if any found)
- [ ] New RPCs documented in db-schema.sql
- [ ] Regression test after each fix

### Regression (קריטי!)
- [ ] **inventory.html** — נטען ונראה כמו קודם, PIN עובד
- [ ] **suppliers-debt.html** — נטען ונראה כמו קודם
- [ ] **shipments.html** — נטען ונראה כמו קודם
- [ ] **employees.html** — נטען ונראה כמו קודם
- [ ] **settings.html** — נטען ונראה כמו קודם
- [ ] **index.html** — login עובד
- [ ] אפס console errors בכל 6 הדפים
- [ ] shared.js fetchAll/batchCreate — **עדיין עובדים כמו קודם**

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
