# מודול 1.5 — Shared Components Refactor — סיכום מודול

> **סטטוס:** הושלם ✅
> **תאריך התחלה:** מרץ 2026
> **תאריך סיום:** מרץ 2026
> **Git Tags:** v1.5-phase1, v1.5-phase2, v1.5-phase3, v1.5-phase4, v1.5-phase5, v1.5-qa
> **Branch:** develop → merged to main

---

## מה המודול עשה

מודול 1 (ניהול מלאי) נבנה לבד, מאפס. כל רכיב UI — modal, toast, טבלה, טופס — נכתב inline בתוך קבצי המודול. זה עבד מצוין למודול אחד, אבל ברגע שנבנה מודול 2, 3, 4 — נכפיל קוד, נאבד עקביות, ונהפוך כל שינוי עיצובי לסיוט.

מודול 1.5 חילץ כל רכיב משותף לתיקיית `shared/` עם API אחיד, בנה תשתית theming per-tenant, activity log מרכזי, atomic RPCs, והעביר 5 מתוך 6 דפים לתשתית החדשה.

**לפני:** כל דף בונה הכל מאפס. שינוי עיצובי = לגעת בכל קובץ.
**אחרי:** `Modal.confirm()`, `Toast.success()`, `DB.select()`, `data-permission="..."`. שורה אחת במקום 30. חנות חדשה = שורה ב-DB עם צבעים.

---

## פאזות

| # | שם | סטטוס | מה כולל |
|---|----|--------|---------|
| 0 | Documentation Foundation | ✅ | GLOBAL_MAP.md, GLOBAL_SCHEMA.sql, CLAUDE.md מעודכן, branch structure |
| 1 | CSS Foundation | ✅ | 70 CSS variables, ~80 classes, per-tenant theming (ui_config JSONB), theme-loader.js |
| 2 | Core UI Components | ✅ | Modal system (5×5), Toast system, PIN modal migration, Iron Rule #12 |
| 3 | Data Layer | ✅ | Supabase wrapper (DB.*), Activity Logger, activity_log table, 3 RPCs, 4 race conditions fixed |
| 4 | Table Builder + Permissions | ✅ | TableBuilder, PermissionUI (data-permission attributes), stock-count hotfixes |
| 5 | Cleanup & Hardening | ✅ | Zero hardcoded scan, custom_fields JSONB, 5 pages migrated, namespace PinModal.prompt(), wrapper strategy |
| QA | Full Regression | ✅ | Test tenant clone, tenant isolation, theme per-tenant, 70+ tests, 0 failures |

---

## מספרים

| מדד | ערך |
|-----|-----|
| פאזות | 6 + QA |
| קבצי CSS ב-shared/ | 8 (~1,510 שורות) |
| קבצי JS ב-shared/ | 9 (~1,359 שורות) |
| דפי בדיקה ב-shared/tests/ | 7 |
| CSS variables | 70 |
| CSS classes חדשים | ~80+ |
| JS public API functions | ~35 |
| DB tables חדשים | 1 (activity_log) |
| DB columns חדשים | 2 (ui_config, custom_fields) |
| RPCs חדשים | 3 |
| Race conditions שתוקנו | 4 |
| Hardcoded values שתוקנו | 6 |
| דפים migrated | 5 מתוך 6 |
| Call sites migrated אוטומטית | ~195 (toast) + ~18 (confirm) |
| בדיקות QA | 70+ |
| Failures | 0 |
| Iron Rules חדשים | 1 (#12 — global name collision check) |

---

## מבנה shared/ הסופי

```
shared/
├── css/
│   ├── variables.css          — 70 design tokens: צבעים, טיפוגרפיה, spacing, radius, shadows, z-index, transitions
│   ├── components.css         — כפתורים (4 variants × 3 sizes), inputs, selects, textareas, badges (5 variants), cards
│   ├── components-extra.css   — table base, slide-in panel, skeleton loaders, accordion
│   ├── layout.css             — page structure, sticky header, flex/grid helpers, RTL utilities, print styles
│   ├── forms.css              — form-group, labels, errors, required markers, 1-col/2-col layouts
│   ├── modal.css              — overlay, container, 5 sizes, 5 types, animations, stack, wizard progress
│   ├── toast.css              — 4 types, positioning, stack, progress bar, animations
│   └── table.css              — header, rows, sort indicators, empty/loading states, responsive
├── js/
│   ├── theme-loader.js        — loadTenantTheme() — קריאת ui_config → inject CSS variables ל-:root
│   ├── modal-builder.js       — Modal.show/confirm/alert/danger/form/close/closeAll
│   ├── modal-wizard.js        — Modal.wizard — multi-step wizard עם progress bar
│   ├── toast.js               — Toast.success/error/warning/info/dismiss/clear
│   ├── pin-modal.js           — PinModal.prompt() + promptPin() alias — 5-digit split input
│   ├── table-builder.js       — TableBuilder.create → setData/setLoading/updateRow/removeRow/getData/destroy
│   ├── permission-ui.js       — PermissionUI.apply/applyTo/check — data-permission attributes
│   ├── supabase-client.js     — DB.select/insert/update/softDelete/hardDelete/rpc — spinner, error handling, tenant auto-inject
│   └── activity-logger.js     — ActivityLog.write/warning/error/critical — fire-and-forget
└── tests/
    ├── ui-test.html            — כל רכיבי CSS + theme switcher (3 palettes)
    ├── modal-test.html         — כל 5 סוגים × 5 גדלים, stack, keyboard
    ├── toast-test.html         — 4 סוגים, stack, auto-dismiss, persistent
    ├── db-test.html            — כל פעולות DB, spinner, error handling
    ├── activity-log-test.html  — כל levels, changeset format
    ├── table-test.html         — sort, empty, loading, RTL, 100+ rows
    └── permission-test.html    — hide, disable, OR logic, dynamic content
```

---

## Public API — מה shared/ חושף

### Modal System — shared/js/modal-builder.js + modal-wizard.js

```javascript
Modal.show(config)        // generic modal → { el, close }
Modal.confirm(config)     // yes/no dialog → callback
Modal.alert(config)       // info message → callback
Modal.danger(config)      // dangerous action, type confirmation word → callback
Modal.form(config)        // form in modal → { el, close }
Modal.wizard(config)      // multi-step wizard → { el, close }
Modal.close()             // close topmost
Modal.closeAll()          // close entire stack
```

### Toast System — shared/js/toast.js

```javascript
Toast.success(msg, opts?) // → toast id
Toast.error(msg, opts?)   // → toast id
Toast.warning(msg, opts?) // → toast id
Toast.info(msg, opts?)    // → toast id
Toast.dismiss(id)         // close specific toast
Toast.clear()             // close all
```

### PIN Modal — shared/js/pin-modal.js

```javascript
PinModal.prompt(title, callback)  // primary API
promptPin(title, callback)        // deprecated alias (backward compatible)
```

### Table Builder — shared/js/table-builder.js

```javascript
TableBuilder.create(config) // → TableInstance
table.setData(rows)         // render data
table.setLoading(bool)      // toggle skeleton
table.updateRow(id, data)   // update single row
table.removeRow(id)         // remove row from display
table.getData()             // get current data array
table.destroy()             // cleanup
```

### Supabase Wrapper — shared/js/supabase-client.js

```javascript
DB.select(table, filters?, options?)     // → { data, error, count }
DB.insert(table, data, options?)         // tenant_id auto-injected → { data, error }
DB.update(table, id, changes, options?)  // → { data, error }
DB.softDelete(table, id, options?)       // is_deleted = true → { data, error }
DB.hardDelete(table, id, options?)       // permanent delete → { data, error }
DB.rpc(functionName, params?, options?)  // → { data, error }
```

### Activity Logger — shared/js/activity-logger.js

```javascript
ActivityLog.write(config)    // level: 'info' (default)
ActivityLog.warning(config)  // level: 'warning'
ActivityLog.error(config)    // level: 'error'
ActivityLog.critical(config) // level: 'critical'
```

### Permission UI — shared/js/permission-ui.js

```javascript
PermissionUI.apply()              // scan entire page
PermissionUI.applyTo(container)   // scan specific container
PermissionUI.check(permission)    // manual check → boolean
```

```html
<!-- HTML attributes -->
<button data-permission="inventory.delete">מחק</button>
<button data-permission="inventory.edit" data-permission-mode="disable">ערוך</button>
<button data-permission="perm1|perm2">OR logic</button>
```

### Theme Loader — shared/js/theme-loader.js

```javascript
loadTenantTheme(tenantRow)  // reads ui_config JSONB, injects CSS variables to :root
```

---

## שינויי DB

### טבלה חדשה: activity_log

```
id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details, ip_address, user_agent, created_at
```

- 5 indexes (tenant, entity, action, created, level)
- RLS tenant isolation
- levels: info, warning, error, critical
- changeset format: `{ changes: [{ field, old, new }] }`
- חי ליד inventory_logs — לא מחליף

### עמודות חדשות

| טבלה | עמודה | סוג | שימוש |
|------|-------|-----|-------|
| tenants | ui_config | JSONB DEFAULT '{}' | Per-tenant CSS theming — key-value של CSS variables |
| inventory | custom_fields | JSONB DEFAULT '{}' | מוכן לשדות דינמיים per-tenant (עתיד) |

### RPCs חדשים

3 RPCs שנוספו כתוצאה מ-Atomic RPC scan + 4 race conditions שתוקנו.

---

## דפים שעברו Migration

| דף | סטטוס | הערות |
|----|--------|-------|
| inventory.html | ✅ migrated | Pilot. ~10 JS files, הכי מורכב |
| employees.html | ✅ migrated | פשוט |
| settings.html | ✅ migrated | פשוט |
| index.html | ✅ migrated | Login + module cards |
| shipments.html | ✅ migrated | בינוני, 9 JS files |
| suppliers-debt.html | ❌ deferred | 14 JS + AI/OCR. נדחה למודול כספים |

### Wrapper Strategy (פאזה 5)

במקום לגעת ב-195+ call sites אחד אחד, 4 פונקציות ב-shared.js/auth-service.js מדליגטות ל-shared/ equivalents:

| פונקציה קיימת | מפנה ל- | call sites |
|--------------|---------|------------|
| `toast()` | `Toast.*` | ~195 |
| `confirmDialog()` | `Modal.confirm()` | ~18 |
| `showInfoModal()` | `Modal.show()` | כמה |
| `applyUIPermissions()` | `PermissionUI.apply()` | כל דף |

---

## QA — Test Tenant

- **שם:** אופטיקה דמו / Demo Optics
- **גישה:** `?t=demo` (slug-based tenant resolution)
- **צבעים:** ירוקים (מבדילים מפריזמה)
- **נתונים:** עותק מלא של כל המלאי, ספקים, מותגים, הזמנות, משלוחים
- **שימוש:** QA, regression testing, demo ללקוחות עתידיים
- **70+ בדיקות:** tenant isolation, data + write isolation, theme, visual consistency, RTL, mobile, print, full feature regression

---

## כללים חדשים שנוספו

### Iron Rule #12 — Global Name Collision Check
לפני יצירה/העברה/שינוי שם של כל פונקציה גלובלית — חובה להריץ `grep` על כל ה-repo. אם יש התנגשות — לפתור אותה לפני שכותבים קוד.

**רקע:** בפאזה 2, `promptPin()` ב-sync-details.js דרס את `promptPin()` ב-shared/js/pin-modal.js. אפס שגיאה — פשוט הפונקציה הלא נכונה רצה.

### QA Protocol (CLAUDE.md)
תהליך QA מתועד עם test tenant, slug-based access, regression checklist.

---

## Deferred Items — מחכים לביצוע

| פריט | למה נדחה | מתי | מתועד ב- |
|------|---------|-----|----------|
| **suppliers-debt.html migration** | 14 JS + AI/OCR, הכי מורכב | תחילת מודול כספים | MASTER_ROADMAP, SESSION_CONTEXT |
| **styles.css deletion** | suppliers-debt עדיין תלוי | אחרי suppliers-debt migration | אותו מקום |
| **DB.* migration** (shared.js → DB.*) | סיכון regression, אפס ערך מיידי | הדרגתי כשנוגעים בדפים | SESSION_CONTEXT |
| **RLS permissive על 9 טבלאות** | לא דחוף, עובד | מודול 2 (Platform Admin) | SESSION_CONTEXT |
| **Stock-count improvements** | לא scope 1.5 | פאזה נפרדת | SESSION_CONTEXT |

פירוט stock-count improvements שנדחו:
1. עודפים → הוספה למלאי (עריכת מנהל + writeLog)
2. צפייה בספירות סגורות (מסך read-only)
3. set_inventory_qty אטומי (Iron Rule #1)
4. פיצול session.js (871 שורות → 2 קבצים)
5. reason per discrepancy (תיעוד סיבת פער)
6. אישור חלקי (approve/skip per item)
7. דוח סיכום אחרי אישור

---

## תלויות — מי צריך את מודול 1.5

| מודול | למה תלוי |
|-------|---------|
| **כל מודול עתידי** | חייב להשתמש ב-shared/, לא לכתוב רכיבים מאפס |
| מודול 2 (Platform Admin) | shared/ components, activity_log, DB.*, PermissionUI |
| מודול 3 (Storefront) | design tokens מתואמים (לא תלות ישירה — repo נפרד) |
| מודול כספים | prerequisite: suppliers-debt.html migration |
| **מתיחת פנים UI** | אחרי 1.5 בלבד. שינוי variables.css = הכל מתעדכן |

---

## לקחים מרכזיים

1. **Wrapper strategy > migration בזק** — 4 פונקציות delegate חסכו ימים של migration ידני ל-195+ call sites
2. **Zero redesign** — refactor ו-redesign לא באותו מודול. דליית ערכים קיימים בלבד
3. **Iron Rule #12** — `grep` לפני כל שינוי שם גלובלי. collision בלי error = הבאג הכי קשה לאיתור
4. **Test tenant = נכס** — סביבת בדיקה עם data אמיתי, צבעים שונים, tenant isolation מוכח
5. **פיצול phases to steps** — כל step = פרומפט אחד ל-Claude Code. regression אחרי כל step, לא בסוף
6. **Standalone rule** — כל רכיב ב-shared/ עובד בלי האחרים. זה מה שמאפשר migration הדרגתי
7. **Backward compatibility always** — aliases, redirect files, wrapper functions. אפס breaking changes
