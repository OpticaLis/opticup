# Optic Up — מודול 1.5: Shared Components Refactor — ROADMAP

> **Authority:** Phase status only. For rules → CLAUDE.md. For code → MODULE_MAP.md. For current status → SESSION_CONTEXT.md.
> **מיקום:** `modules/Module 1.5 - Shared Components/ROADMAP.md`
> **עודכן לאחרונה:** מרץ 2026
> **הצ'אט המשני מעדכן את סימוני ✅/⬜ בסוף כל פאזה**

---

## חזון — SaaS לרשתות אופטיקה

Optic Up הוא **פלטפורמת SaaS** לניהול חנויות אופטיקה. כל חנות שמצטרפת מקבלת:

1. **ERP** — מערכת ניהול פנימית (מלאי, הזמנות, ספקים, עובדים)
2. **Storefront** — אתר חנות ממותג ללקוח הקצה (עתידי)

שני המוצרים חולקים **Supabase אחד** עם בידוד מלא באמצעות `tenant_id` על כל טבלה. Storefront קורא רק מ-Views ו-RPC — לעולם לא נוגע בטבלאות ישירות.

**הלקוח הראשון:** אופטיקה פריזמה. אבל כל פאזה נבנית כאילו מחר מצטרפת חנות שנייה.

---

## מה המודול הזה עושה

מודול 1.5 **לא מוסיף פיצ'רים חדשים ללקוח.** הוא בונה את התשתית שכל מודול עתידי ישתמש בה.

**הבעיה:** מודול 1 נבנה לבד, מאפס. כל רכיב UI (טבלה, modal, toast, טופס) נכתב inline בתוך קבצי המודול. זה עבד מצוין למודול אחד, אבל ברגע שנבנה מודול 2, 3, 4 — נכפיל קוד, נאבד עקביות, ונהפוך כל שינוי עיצובי לסיוט.

**הפתרון:** חילוץ כל רכיב משותף לתיקיית `shared/` עם API אחיד. מהיום — כל מודול חדש טוען מ-shared/ ולא כותב דברים מאפס.

### מה זה כולל:

- **CSS Architecture** — משתני עיצוב, רכיבים, layout. שינוי צבע אחד = כל המערכת מתעדכנת. חנות שנייה = palette חדש ב-DB, לא קובץ CSS חדש.
- **Modal System** — 5 גדלים × 5 סוגים. `Modal.show({...})` ומקבלים popup מוכן. כולל PIN modal, wizard, danger confirm.
- **Toast System** — success/error/warning/info. הודעות שנעלמות לבד. `Toast.success("נשמר")` ונגמר.
- **Table Builder** — מקבל הגדרת עמודות + נתונים, מחזיר טבלה מוכנה עם sort, empty state, loading. לא data grid מלא — builder רזה.
- **Supabase Wrapper** — כל קריאה ל-DB עוברת דרך wrapper: error handling אחיד, loading spinner אוטומטי, tenant_id נדחף אוטומטית.
- **Permission-Aware UI** — `data-permission="inventory.delete"` על כפתור = הוא נעלם אם אין הרשאה. אפס JavaScript ידני.
- **Activity Log** — טבלה מרכזית אחת לכל פעולה בכל מודול. level + changeset + entity tracking.
- **Atomic RPC** — סריקת כל הקוד, החלפת read→compute→write ב-RPC אטומי.
- **Zero Hardcoded** — סריקת כל הקוד, החלפת ערכים עסקיים hardcoded במשתנים מ-config.
- **custom_fields** — עמודת JSONB ריקה על inventory, מוכנה לשדות דינמיים per-tenant.

### מה זה לא:

- **לא Form Builder** — טפסים דינמיים מ-JSON config ב-Vanilla JS = סיבוך. במקום: CSS classes לטפסים (input styles, error states, layout helpers) שמבטיחים עקביות ויזואלית. טפסים מורכבים ייכתבו כ-HTML ידני בכל מודול.
- **לא Content Hub UI** — אין מסך gallery. אין טבלת content_items. זה מודול 18.
- **לא Cache Manager** — אין בעיית ביצועים היום. cache ייבנה כשיהיה צורך מוכח.
- **לא Dark Mode** — ה-CSS Variables מאפשרים את זה בעתיד. אין ROI עכשיו.

---

## תלויות

**מודול 1.5 תלוי ב:**
- מודול 1 (מלאי) הושלם ✅ — inventory.html הוא מקרה הבדיקה

**תלויים במודול 1.5:**
- מודול 2 (Platform Admin) — ישתמש ב-shared/ components
- מודול 3 (Storefront) — לא ישירות (repo נפרד), אבל design tokens מתואמים
- **כל מודול עתידי** — חייב להשתמש ב-shared/, לא לכתוב רכיבים מאפס
- **מתיחת פנים UI** — אחרי מודול 1.5 בלבד. שינוי variables.css = הכל מתעדכן

---

## מפת פאזות

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| 0 | ✅ | Infrastructure Setup | Global docs, module directory, CLAUDE.md update, branching |
| 1 | ⬜ | CSS Foundation | variables.css, components.css, layout.css, form classes, per-tenant theming |
| 2 | ⬜ | Core UI Components | Modal system (5 גדלים, 5 סוגים), Toast system, PIN modal migration |
| 3 | ⬜ | Data Layer | Supabase wrapper, Activity Log (DB + JS), Atomic RPC scan |
| 4 | ⬜ | Table Builder + Permissions | Table builder רזה, Permission-aware UI helpers |
| 5 | ⬜ | Cleanup & Hardening | Zero hardcoded scan, custom_fields JSONB, inventory.html migration |
| QA | ⬜ | Full Regression | regression tests, tenant isolation, visual consistency |

---

## פירוט כל פאזה

### פאזה 0 ✅ — Infrastructure Setup

**המטרה:** העברת הפרויקט ממבנה "מודול אחד" למבנה "ריבוי מודולים" עם מסמכים גלובליים, branching, ותשתית תיקיות.

**מה נוצר:**
- `docs/GLOBAL_MAP.md` — מפת כל הפונקציות המשותפות, contracts, module registry, DB table ownership
- `docs/GLOBAL_SCHEMA.sql` — סכמת DB מלאה מכל המודולים
- `modules/Module 1.5 - Shared Components/` — מבנה תיקיות + docs ריקים
- `shared/css/`, `shared/js/`, `shared/tests/` — תיקיות ריקות
- `develop` branch — כל העבודה מכאן קדימה

**מה מתעדכן:**
- `CLAUDE.md` — סעיף Branching, Documentation Architecture מעודכן, Authority Matrix
- `ROADMAP.md` — פאזה 0 מסומנת ✅

**פירוט מלא:** ראה `MODULE_1.5_PHASE_0_SPEC.md`

**Verification:**
- [ ] docs/GLOBAL_MAP.md קיים ומכיל כל הפונקציות/טבלאות/contracts
- [ ] docs/GLOBAL_SCHEMA.sql קיים ומכיל כל הטבלאות — ספירה תואמת MODULE_MAP
- [ ] CLAUDE.md מעודכן עם branching + multi-module docs
- [ ] develop branch קיים ופעיל
- [ ] Module 1.5 directory structure מלא עם docs ריקים
- [ ] shared/ directories קיימים (css, js, tests)
- [ ] Cross-reference: כל טבלה ב-GLOBAL_SCHEMA מופיעה ב-GLOBAL_MAP

---

### פאזה 1 ⬜ — CSS Foundation

**המטרה:** כל עיצוב במערכת מוגדר דרך CSS Variables ורכיבים. שינוי ב-variables.css = כל המסכים מתעדכנים. חנות שנייה עם צבעים אחרים = שורה ב-DB.

**קבצים חדשים:**
```
shared/
├── css/
│   ├── variables.css     — כל המשתנים: צבעים, טיפוגרפיה, spacing, radius, shadows, z-index, transitions
│   ├── components.css    — כפתורים (primary/secondary/danger/ghost × sm/md/lg), inputs, selects, badges, cards, table base styles
│   ├── layout.css        — page structure, sticky header rules, grid/flex helpers, RTL utilities, print styles
│   └── forms.css         — input styles, error states, required markers, field groups, 1-col/2-col layouts
```

**per-tenant theming:**
- `tenant_config` כבר קיים ב-DB. נוסיף עמודה `theme JSONB DEFAULT '{}'` (או נשתמש ב-JSONB הקיים)
- ב-JS: בטעינת דף, קריאה ל-tenant_config → inject של CSS Variables ב-`:root` override
- חנות שנייה עם צבע אחר = JSON ב-DB, לא קובץ CSS חדש
- דוגמה: `{ "primary": "#1a56db", "primary-hover": "#1e429f", "font-family": "Rubik" }`

**מה לא משתנה:**
- header.css נשאר כמו שהוא (כבר עובד). רק import של variables.css.
- styles.css הישן נשאר זמנית — inventory.html ימשיך לטעון אותו עד פאזה 5 (migration)

**Verification:**
- [ ] כל variable מוגדר פעם אחת ב-variables.css
- [ ] אין צבע hardcoded ב-components.css (הכל `var(--...)`)
- [ ] דף בדיקה (test.html) מראה את כל הרכיבים ב-3 palettes שונים

---

### פאזה 2 ⬜ — Core UI Components

**המטרה:** כל popup, הודעה ו-PIN prompt במערכת עובר דרך רכיב אחיד ב-shared/. לא עוד HTML ידני של modals.

**קבצים חדשים:**
```
shared/
├── js/
│   ├── modal-builder.js  — Modal system
│   └── toast.js          — Toast/notification system
```

**Modal System (modal-builder.js):**

5 גדלים:
| גודל | רוחב | שימוש |
|------|-------|-------|
| sm | 300px | confirm, alert |
| md | 500px | טפסים קצרים |
| lg | 700px | טפסים מורכבים |
| xl | 900px | טבלאות, wizard |
| fullscreen | 95vw | דשבורדים, data-heavy |

5 סוגי template:
| סוג | מה עושה |
|-----|---------|
| confirm | שאלה + כפתור אישור + כפתור ביטול |
| alert | הודעה + כפתור OK |
| form | כותרת + content area דינמי + כפתורי action |
| wizard | multi-step + progress bar + back/next/finish |
| danger | רקע אדום, טקסט אזהרה, דורש הקלדת מילת אישור |

API:
```javascript
// Confirm
Modal.confirm({ title: 'מחיקת פריט', message: 'בטוח?', onConfirm: () => {...} })

// Form
Modal.form({ size: 'lg', title: 'ספק חדש', content: htmlString, onSubmit: (formData) => {...} })

// Wizard
Modal.wizard({ size: 'xl', title: 'אשף ארגז', steps: [...], onFinish: (data) => {...} })

// Danger
Modal.danger({ title: 'מחיקה לצמיתות', message: 'הקלד "מחק" לאישור', confirmWord: 'מחק', onConfirm: () => {...} })

// Close current
Modal.close()

// Close all
Modal.closeAll()
```

Stack support:
- modal מעל modal (confirm מעל form)
- Escape סוגר את העליון
- Click על backdrop סוגר את העליון (אלא אם `closeOnBackdrop: false`)
- Focus trap בתוך ה-modal הפעיל

**PIN Modal migration:**
- pin-modal.js הקיים עובר ל-`shared/js/pin-modal.js`
- פנימית משתמש ב-Modal.form() עם size: 'sm'
- API חיצוני נשאר זהה: `promptPin()` — אפס שינוי breaking

**Toast System (toast.js):**

4 סוגים:
| סוג | צבע | אייקון | שימוש |
|-----|------|--------|-------|
| success | ירוק | ✓ | פעולה הצליחה |
| error | אדום | ✕ | שגיאה |
| warning | כתום | ⚠ | אזהרה |
| info | כחול | ℹ | מידע |

API:
```javascript
Toast.success('נשמר בהצלחה')
Toast.error('שגיאה בשמירה', { duration: 5000 })
Toast.warning('חסרים שדות')
Toast.info('טוען נתונים...', { persistent: true, id: 'loading' })
Toast.dismiss('loading')  // סגירת toast ספציפי
```

- מיקום: top-left (RTL) כברירת מחדל
- stackable: כמה toasts אחד מעל השני (מקסימום 5, הישן נעלם)
- auto-dismiss: 3 שניות ברירת מחדל, configurable
- progress bar קטן שמראה כמה זמן נשאר

**Verification:**
- [ ] כל 5 סוגי modal נפתחים ונסגרים תקין
- [ ] stack של 3 modals — Escape סוגר רק את העליון
- [ ] PIN modal עובד בדיוק כמו קודם (regression)
- [ ] 4 סוגי toast מופיעים ונעלמים
- [ ] Toast stack — 5 toasts אחד מעל השני, ה-6 דוחף את הישן

---

### פאזה 3 ⬜ — Data Layer

**המטרה:** כל קריאה ל-Supabase עוברת דרך wrapper אחיד. כל פעולה מתועדת ב-activity_log מרכזי. כל שינוי כמות = RPC אטומי.

**קבצים:**
```
shared/
├── js/
│   ├── supabase-client.js   — Supabase wrapper (refactor של supabase-ops.js)
│   └── activity-logger.js   — Activity Log JS helper
```

**Supabase Wrapper (supabase-client.js):**

מה הוא עושה:
- **Error handling אחיד:** כל שגיאה → Toast.error() אוטומטי. RLS violation → הודעה ספציפית ("אין גישה"). Network error → הודעה ספציפית.
- **Loading state:** כל קריאה → spinner אוטומטי (אלא אם `{ silent: true }`). המפתח לא צריך לכתוב show/hide spinner.
- **Tenant context:** כל insert מקבל tenant_id אוטומטית. כל select מסנן לפי tenant_id. אין מצב ששוכחים.
- **Response normalization:** כל תשובה מגיעה כ-`{ data, error, count }` אחיד.

מה הוא **לא** עושה:
- לא retry logic (Supabase v2 כבר עושה)
- לא cache (לא צריך עכשיו)
- לא מחליף את shared.js — עובד לידו. shared.js ימשיך לקיים helpers עסקיים (formatCurrency, escapeHtml, וכו')

API:
```javascript
// Select
const { data } = await DB.select('inventory', { is_deleted: false }, { order: 'created_at.desc', limit: 50 })

// Insert (tenant_id auto-injected)
const { data } = await DB.insert('inventory', { barcode, brand_id, model })

// Update
const { data } = await DB.update('inventory', id, { model: 'new model' })

// Soft delete
const { data } = await DB.softDelete('inventory', id)

// RPC
const { data } = await DB.rpc('update_quantity', { p_id: id, p_delta: -1 })

// Silent (no spinner, no toast on error)
const { data } = await DB.select('brands', {}, { silent: true })
```

**Activity Log (DB):**

טבלה חדשה:
```sql
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID,
  user_id UUID REFERENCES employees(id),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','error','critical')),
  action TEXT NOT NULL,          -- 'inventory.update', 'shipment.create', 'auth.login_failed'
  entity_type TEXT NOT NULL,     -- 'inventory', 'shipment', 'employee'
  entity_id TEXT,                -- UUID or barcode or any identifier
  details JSONB DEFAULT '{}',   -- { changes: [{field, old, new}] } for updates
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_activity_log_tenant ON activity_log(tenant_id);
CREATE INDEX idx_activity_log_entity ON activity_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(tenant_id, action);
CREATE INDEX idx_activity_log_created ON activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_log_level ON activity_log(tenant_id, level) WHERE level IN ('warning','error','critical');
```

**Activity Log (JS helper — activity-logger.js):**
```javascript
// רישום פעולה
ActivityLog.write({
  action: 'inventory.update',
  entity_type: 'inventory',
  entity_id: 'AB12345',
  details: { changes: [{ field: 'model', old: 'Classic', new: 'Classic Pro' }] }
})
// level default = 'info', tenant_id + user_id + branch_id = אוטומטי מ-session

// רישום שגיאה
ActivityLog.error({
  action: 'auth.login_failed',
  entity_type: 'employee',
  entity_id: 'emp-123',
  details: { reason: 'wrong_pin', attempts: 4 }
})

// רישום קריטי
ActivityLog.critical({
  action: 'rls.violation',
  entity_type: 'inventory',
  details: { attempted_tenant: '...', actual_tenant: '...' }
})
```

**inventory_logs נשאר כמו שהוא.** לא נוגעים. unified view (שמאחד activity_log + inventory_logs) = עתיד.

**Atomic RPC scan:**
- סריקת כל הקוד הקיים (inventory.html, suppliers-debt.html, shipments.html)
- זיהוי כל מקום שעושה read→compute→write (pattern: select → חישוב ב-JS → update)
- החלפה ב-RPC אטומי (SECURITY DEFINER, `quantity = quantity + $delta`)
- תיעוד כל RPC חדש ב-MODULE_SPEC

**Verification:**
- [ ] כל קריאה ל-Supabase דרך DB.* מציגה spinner
- [ ] שגיאת RLS → Toast.error("אין גישה")
- [ ] Network error → Toast.error("בעיית תקשורת")
- [ ] activity_log מקבל רשומות מכל פעולה
- [ ] level 'error' ו-'critical' מתועדים עם details מלא
- [ ] changeset format: `{ changes: [{field, old, new}] }` לכל update
- [ ] אפס read→compute→write patterns נשארו בקוד

---

### פאזה 4 ⬜ — Table Builder + Permissions

**המטרה:** כל טבלה במערכת נבנית דרך builder אחיד. כל כפתור מוגן הרשאות דרך attribute — לא if/else ידני.

**קבצים:**
```
shared/
├── js/
│   ├── table-builder.js       — Table rendering system
│   └── permission-ui.js       — Permission-aware UI helpers
```

**Table Builder (table-builder.js):**

מה הוא עושה (MVP):
- מקבל config של עמודות + מערך נתונים → מחזיר HTML table מוכן
- Sort: click על header = sort, click שוב = reverse
- Empty state: אייקון + טקסט + CTA (configurable)
- Loading state: skeleton rows (configurable כמות)
- Row actions: render של כפתורי פעולה per-row

מה הוא **לא** עושה (עתיד):
- לא pagination (נשאר ברמת המודול)
- לא filter row (נשאר ברמת המודול)
- לא bulk selection (נשאר ברמת המודול)
- לא virtual scrolling

API:
```javascript
const table = TableBuilder.create({
  containerId: 'inventory-table',
  columns: [
    { key: 'barcode', label: 'ברקוד', type: 'text', sortable: true },
    { key: 'brand', label: 'מותג', type: 'text', sortable: true },
    { key: 'cost', label: 'עלות', type: 'currency', sortable: true },
    { key: 'quantity', label: 'כמות', type: 'number', sortable: true },
    { key: 'status', label: 'סטטוס', type: 'badge', render: (val) => badgeHtml(val) },
    { key: 'actions', label: '', type: 'actions', render: (row) => actionButtons(row) }
  ],
  emptyState: { icon: '📦', text: 'אין פריטים', cta: { label: 'הוסף פריט', onClick: addItem } },
  onSort: (key, direction) => { /* reload data sorted */ },
  rtl: true
})

// עדכון נתונים
table.setData(items)

// מצב טעינה
table.setLoading(true)

// עדכון שורה בודדת (בלי re-render מלא)
table.updateRow(rowId, newData)
```

**Permission-Aware UI (permission-ui.js):**

עקרון: `data-permission` attribute על כל אלמנט שדורש הרשאה. בטעינת דף — סריקה אוטומטית ועדכון visibility.

```html
<!-- כפתור נעלם אם אין הרשאה -->
<button data-permission="inventory.delete">מחק</button>

<!-- כפתור disabled (נראה אבל לא לחיץ) -->
<button data-permission="inventory.edit" data-permission-mode="disable">ערוך</button>

<!-- section שלם נעלם -->
<div data-permission="shipments.settings">הגדרות משלוחים...</div>

<!-- דורש אחת מכמה הרשאות -->
<button data-permission="inventory.edit|inventory.admin">ערוך/מנהל</button>
```

API:
```javascript
// נקרא אוטומטית בטעינת דף (אחרי login)
PermissionUI.apply()

// נקרא אחרי הוספת אלמנטים דינמיים (modal content, table rows)
PermissionUI.applyTo(containerElement)

// בדיקה ידנית (כבר קיים hasPermission — wrapper)
PermissionUI.check('inventory.delete') // true/false
```

**migration של applyUIPermissions():**
- הפונקציה הקיימת ב-auth-service.js תקרא ל-`PermissionUI.apply()` פנימית
- backward compatible — קוד ישן ממשיך לעבוד
- קוד חדש משתמש ב-data-permission attributes

**Verification:**
- [ ] TableBuilder מרנדר טבלה עם 100 שורות — sort עובד לכל כיוון
- [ ] Empty state מוצג כשאין נתונים
- [ ] Loading skeleton מוצג בזמן טעינה
- [ ] כפתור עם `data-permission="X"` נעלם כשאין הרשאה
- [ ] כפתור עם `data-permission-mode="disable"` = disabled + tooltip
- [ ] אלמנטים דינמיים (תוך modal) — `PermissionUI.applyTo()` עובד

---

### פאזה 5 ⬜ — Cleanup & Hardening

**המטרה:** אפס ערכים hardcoded, custom_fields מוכן, inventory.html עובר לשימוש ב-shared/.

**משימה 1: Zero Hardcoded Values Scan**

סריקת כל קבצי JS ו-HTML:
- שם עסק / כתובת / טלפון / מע"מ / לוגו → חייב לבוא מ-tenant_config
- כל מספר קבוע (אחוזי מע"מ, ימי תשלום, גבולות) → tenant_config או settings
- כל URL / endpoint → משתנה
- כל טקסט UI שתלוי בהקשר עסקי → configurable

כל hardcoded שנמצא → מתועד → מוחלף → נבדק.

**משימה 2: custom_fields JSONB**
```sql
ALTER TABLE inventory ADD COLUMN custom_fields JSONB DEFAULT '{}';
```
- אפס UI עכשיו — רק העמודה קיימת
- כשייבנו customers (מודול 4) ו-orders (מודול 5) — אותו pattern
- בעתיד: tenant_config יגדיר אילו שדות קיימים, UI ירנדר דינמית

**משימה 3: inventory.html Migration**

זו המשימה הגדולה של הפאזה. inventory.html (המסך הכי מורכב) עובר לשימוש ב-shared/:

- CSS: מחליף styles.css → טוען variables.css + components.css + layout.css + forms.css + module-specific.css
- Modals: כל modal ידני → Modal.show() / Modal.confirm() / Modal.danger()
- Toasts: כל alert() / custom notification → Toast.success() / Toast.error()
- Tables: טבלת מלאי ראשית → TableBuilder (אם מתאים — ייתכן שטבלת מלאי מורכבת מדי ותישאר ידנית עם CSS classes בלבד)
- Supabase calls: מעבר ל-DB.* wrapper (הדרגתי — לא חייבים 100% בפאזה זו)
- Permissions: מעבר ל-data-permission attributes
- PIN modal: כבר עבר בפאזה 2

**⚠️ כלל ברזל:** אפס שינויי לוגיקה. ה-migration מחליף רק "איך זה נראה" — לא "מה זה עושה." כל פונקציה חייבת להתנהג בדיוק כמו קודם.

**אחרי inventory.html:**
- suppliers-debt.html — אותו תהליך (בפאזה נפרדת אם צריך, או כחלק מ-5)
- shipments.html — אותו תהליך
- employees.html — אותו תהליך
- settings.html — אותו תהליך
- index.html — אותו תהליך

**Verification:**
- [ ] `grep -r` על כל קבצי JS: אפס שמות עסק/כתובות/טלפונים hardcoded
- [ ] custom_fields עמודה קיימת על inventory, מחזירה `{}`
- [ ] inventory.html טוען מ-shared/css/ ולא מ-styles.css
- [ ] כל modal ב-inventory.html עובר דרך Modal.*
- [ ] כל toast ב-inventory.html עובר דרך Toast.*
- [ ] **Full regression:** כל פיצ'ר ב-inventory עובד בדיוק כמו קודם. אפס שינויי התנהגות.

---

### פאזת QA ⬜ — Full Regression

**המטרה:** לוודא שמודול 1.5 לא שבר כלום, והכל עובד.

**בדיקות:**
1. **Visual consistency** — כל המסכים נראים אחידים. אין "מסך ישן" ו"מסך חדש"
2. **Regression מלא** — כל ה-~190 tests ממודול 1 QA עוברים
3. **Tenant isolation** — activity_log מבודד per-tenant
4. **Modal regression** — PIN, confirm, danger, wizard — כולם עובדים
5. **Toast regression** — success/error/warning/info מופיעים ונעלמים
6. **Permissions regression** — כל ההרשאות הקיימות (55) עובדות עם ה-UI החדש
7. **Per-tenant theme** — שינוי palette ב-tenant_config → כל המסכים מתעדכנים
8. **RTL** — כל הרכיבים החדשים תומכים ב-RTL
9. **Mobile** — responsive על כל המסכים
10. **Print** — הדפסת manifest/PDF עובדת (header מוסתר)

---

## מבנה תיקיות סופי

```
opticup/
├── shared/
│   ├── css/
│   │   ├── variables.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   └── forms.css
│   └── js/
│       ├── modal-builder.js
│       ├── toast.js
│       ├── table-builder.js
│       ├── supabase-client.js
│       ├── activity-logger.js
│       ├── permission-ui.js
│       └── pin-modal.js
├── css/
│   ├── styles.css          — ישן, יוסר בהדרגה
│   └── header.css          — נשאר, imports variables.css
├── js/
│   ├── shared.js           — נשאר (business helpers, FIELD_MAP, caches)
│   ├── supabase-ops.js     — נשאר זמנית, פונקציות מועברות הדרגתית ל-supabase-client.js
│   ├── auth-service.js     — נשאר, calls PermissionUI.apply()
│   └── ...
```

---

## כללי ברזל — ספציפי למודול 1.5

כל כללי הברזל מ-CLAUDE.md בתוקף, בתוספת:

1. **אפס שינויי לוגיקה** — migration מחליף רק תצוגה. כל פונקציה עסקית חייבת לעבוד בדיוק כמו קודם.
2. **backward compatible** — קוד ישן שקורא לפונקציות ישנות חייב להמשיך לעבוד. adapter layer כשצריך.
3. **shared/ = read-only for modules** — מודולים טוענים מ-shared/, לא משנים קבצים ב-shared/.
4. **CSS Variables only** — אפס צבע, גודל, או spacing hardcoded ב-components.css.
5. **כל רכיב shared/ חייב לעבוד standalone** — אפשר לטעון modal-builder.js בלי table-builder.js.
6. **כל רכיב shared/ חייב test page** — shared/tests/modal-test.html, toast-test.html, table-test.html.

---

## DB Changes Summary

```sql
-- פאזה 3: Activity Log
CREATE TABLE activity_log (...);  -- ראה פירוט בפאזה 3

-- פאזה 5: custom_fields
ALTER TABLE inventory ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- פאזה 1: per-tenant theming (if not already in tenant_config)
-- Option A: ALTER TABLE tenants ADD COLUMN theme JSONB DEFAULT '{}';
-- Option B: use existing tenant_config table → add 'theme' key
-- Decision: בצ'אט אסטרטגי של המודול
```

---

## Contracts — מה המודול חושף לאחרים

```
Modal.show(config)        — פתיחת modal מכל מודול
Modal.confirm(config)     — confirm dialog
Modal.danger(config)      — danger confirmation
Modal.wizard(config)      — multi-step wizard
Modal.close()             — סגירת modal נוכחי
Modal.closeAll()          — סגירת כל ה-modals

Toast.success(msg, opts)  — הודעת הצלחה
Toast.error(msg, opts)    — הודעת שגיאה
Toast.warning(msg, opts)  — אזהרה
Toast.info(msg, opts)     — מידע
Toast.dismiss(id)         — סגירת toast ספציפי

TableBuilder.create(config) — יצירת טבלה
table.setData(data)        — עדכון נתונים
table.setLoading(bool)     — מצב טעינה
table.updateRow(id, data)  — עדכון שורה

DB.select(table, filters, opts)   — שאילתה
DB.insert(table, data)            — הוספה
DB.update(table, id, data)        — עדכון
DB.softDelete(table, id)          — מחיקה רכה
DB.rpc(fn, params)                — קריאת RPC

ActivityLog.write(config)    — רישום פעולה (info)
ActivityLog.warning(config)  — רישום אזהרה
ActivityLog.error(config)    — רישום שגיאה
ActivityLog.critical(config) — רישום קריטי

PermissionUI.apply()            — סריקה גלובלית
PermissionUI.applyTo(element)   — סריקה של container
PermissionUI.check(permission)  — בדיקה ידנית

promptPin()                     — PIN prompt (API ישן, עובד דרך Modal)
```

---

*מסמך זה הוא ROADMAP של מודול 1.5. 6 פאזות, כל התלויות, כל ה-contracts.*
*צ'אט אסטרטגי חדש — קרא הכל והמשך מהפאזה הראשונה שסטטוסה ⬜.*
