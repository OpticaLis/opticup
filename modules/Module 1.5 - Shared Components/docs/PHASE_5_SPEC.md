# PHASE 5 SPEC — Cleanup & Hardening

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** 5 מתוך 6
> **תלויות:** כל הפאזות הקודמות (1-4) ✅
> **מטרה:** אפס ערכים עסקיים hardcoded בקוד. custom_fields מוכן על inventory. כל הדפים (חוץ מ-suppliers-debt) עוברים לשימוש מלא ב-shared/ components.

---

## Scope — מה נכנס ומה לא

**נכנס:**
- Zero Hardcoded Values scan + fix
- custom_fields JSONB על inventory
- **5 דפים migration** ← shared/css/ + Modal.* + Toast.* + PermissionUI:
  - inventory.html (pilot — ראשון, הכי מורכב)
  - employees.html (קטן)
  - settings.html (קטן)
  - index.html (קטן)
  - shipments.html (בינוני)
- promptPin → PinModal.prompt() namespace migration
- הסרת redirect file (`js/pin-modal.js`)

**לא נכנס:**
- ❌ **suppliers-debt.html migration** — נדחה. ראה "Deferred Items" בסוף מסמך זה
- ❌ DB.* migration (shared.js/supabase-ops.js → DB.*) — לא עכשיו
- ❌ שינויי לוגיקה עסקית — zero behavior changes

---

## עקרון מנחה — Visual Migration Only

פאזה 5 מחליפה **איך דברים נראים ומתנהגים ב-UI** — לא **מה הם עושים.**

- styles.css → shared/css/*
- HTML modals ידניים → Modal.*
- alert()/custom notifications → Toast.*
- applyUIPermissions() → PermissionUI.apply()
- promptPin() → PinModal.prompt()

**כלל ברזל:** כל פונקציה עסקית חייבת להתנהג בדיוק כמו קודם. אם משהו נשבר ב-regression — ה-migration שגוי, לא הלוגיקה.

---

## חלק 1: Zero Hardcoded Values Scan

### 1.1 מה לסרוק

כל קבצי JS ו-HTML ב-repo:

| סוג ערך | דוגמה | מה צריך להיות |
|---------|-------|---------------|
| שם עסק | "אופטיקה פריזמה", "Prizma" | `tenantName` מ-session/config |
| כתובת | "הרצל 15, ירושלים" | `tenantAddress` מ-config |
| טלפון | "02-1234567" | `tenantPhone` מ-config |
| מע"מ / ניכוי מס | `0.17`, `17`, `0.3`, `30` | `tenantConfig.vat_rate`, `tenantConfig.withholding_rate` |
| לוגו URL | כל URL ללוגו | `tenantConfig.logo_url` |
| מטבע | "₪", "ILS" | `tenantConfig.currency` / `tenantConfig.currency_symbol` |
| URL/endpoint | hardcoded Supabase URL (מחוץ ל-shared.js) | `SUPABASE_URL` constant |
| שמות עובדים/ספקים | כל שם ספציפי בקוד | לא אמור להיות — רק ב-DB |

### 1.2 איך לסרוק

```bash
grep -rn "פריזמה\|Prizma\|prizma" --include="*.js" --include="*.html"
grep -rn "אופטיקה" --include="*.js" --include="*.html"
grep -rn "0\.17\|0\.30\|17%" --include="*.js" --include="*.html"
grep -rn "₪" --include="*.js" --include="*.html"
grep -rn "02-\|03-\|04-\|050-\|052-\|054-" --include="*.js" --include="*.html"
grep -rn "הרצל\|רחוב\|ירושלים\|תל אביב" --include="*.js" --include="*.html"
```

### 1.3 Output

דוח בפורמט:

| # | File | Line | Value | Replacement | Status |
|---|------|------|-------|-------------|--------|
| 1 | modules/debt/debt-doc-link.js | 42 | "אופטיקה פריזמה" | tenantName | ✅ Fixed |

---

## חלק 2: custom_fields JSONB

```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
```

- אפס UI — רק העמודה קיימת
- בעתיד: tenant_config יגדיר שדות, UI ירנדר דינמית

---

## חלק 3: Page Migrations

### Migration Order & Complexity

| # | דף | מורכבות | קבצי JS | הערות |
|---|-----|---------|---------|-------|
| 1 | **inventory.html** | גבוהה | ~10 | Pilot. הכי הרבה modals, toasts, permissions |
| 2 | **employees.html** | נמוכה | 1 | פשוט — CSS + כמה modals |
| 3 | **settings.html** | נמוכה | 1 | פשוט — CSS + כמה modals |
| 4 | **index.html** | נמוכה | 0 (inline + auth-service) | Login + module cards. CSS בעיקר |
| 5 | **shipments.html** | בינונית | ~9 | דומה ל-inventory אבל פחות modals |

**אסטרטגיה:** inventory ראשון כ-pilot. אחריו employees, settings, index (שעה-שעתיים לכל אחד). shipments אחרון.

### 3.1 Migration Template — מה כל דף עובר

**A. CSS Migration:**
- `<link href="css/styles.css">` → shared/css/* + `css/{page}.css` (module-specific)
- Extract page-specific styles from styles.css → `css/{page}.css`
- Visual diff: screenshot before/after — must be identical

**B. Script Loading:**
- Add shared/js/*.js scripts (only what the page needs)

**C. Modal Migration:**
- grep for manual modals → replace with Modal.*

**D. Toast Migration:**
- Replace alert()/custom notifications → Toast.*

**E. Permission Migration:**
- Add data-permission attributes + PermissionUI.apply()

**F. Regression:**
- Every feature works exactly as before

---

### 3.2 inventory.html — Detailed Migration (Pilot)

#### CSS Migration

**Before:** `<link href="css/styles.css">`
**After:**
```html
<link href="shared/css/variables.css">
<link href="shared/css/components.css">
<link href="shared/css/components-extra.css">
<link href="shared/css/layout.css">
<link href="shared/css/forms.css">
<link href="shared/css/modal.css">
<link href="shared/css/toast.css">
<link href="shared/css/table.css">
```
**Plus:** `<link href="css/inventory.css">`

**⚠️ header.css:** Add variables.css import or load before. Replace hardcoded values with `var(--...)`.

#### Modal Migration

**⚠️ הוראה ל-Claude Code:** `grep -rn "modal-overlay\|modal-content\|\.modal\|modal(" modules/inventory/ js/` — map all modals first.

| Context | Migration target |
|---------|-----------------|
| Quantity change (+/-) | PinModal.prompt() (already migrated) |
| Delete item | Modal.confirm() |
| Permanent delete | Modal.danger() |
| Edit item | Modal.form() |
| Add item | Modal.form() |
| Excel import preview | Modal.show({ size: 'xl' }) |
| OCR review | Modal.show({ size: 'lg' }) |
| Info/help modals | Modal.show() or Modal.alert() |

#### Toast Migration

- `alert('נשמר')` → `Toast.success('נשמר')`
- `alert('שגיאה')` → `Toast.error('שגיאה')`
- Custom notification HTML → Toast.*

#### Permission Migration

1. Add `data-permission="..."` attributes
2. Load permission-ui.js
3. Call `PermissionUI.apply()`
4. `applyUIPermissions()` in auth-service.js → call `PermissionUI.apply()` internally

#### Script Loading Order

```html
<!-- Shared CSS -->
<link href="shared/css/variables.css">
<link href="shared/css/components.css">
<link href="shared/css/components-extra.css">
<link href="shared/css/layout.css">
<link href="shared/css/forms.css">
<link href="shared/css/modal.css">
<link href="shared/css/toast.css">
<link href="shared/css/table.css">

<!-- Module CSS -->
<link href="css/header.css">
<link href="css/inventory.css">

<!-- Shared JS -->
<script src="shared/js/theme-loader.js"></script>
<script src="shared/js/modal-builder.js"></script>
<script src="shared/js/modal-wizard.js"></script>
<script src="shared/js/toast.js"></script>
<script src="shared/js/pin-modal.js"></script>
<script src="shared/js/table-builder.js"></script>
<script src="shared/js/permission-ui.js"></script>
<script src="shared/js/supabase-client.js"></script>
<script src="shared/js/activity-logger.js"></script>

<!-- Existing JS (unchanged) -->
<script src="js/shared.js"></script>
<script src="js/supabase-ops.js"></script>
<script src="js/auth-service.js"></script>
<script src="js/header.js"></script>
<script src="js/data-loading.js"></script>
<script src="js/search-select.js"></script>
<!-- ... inventory module JS ... -->
```

**⚠️ shared/js/ loads BEFORE js/. Critical.**

---

### 3.3 employees.html — Light Migration

CSS swap + modal migration (few modals) + toast + permissions. Module CSS: `css/employees.css` (minimal).

---

### 3.4 settings.html — Light Migration

CSS swap + modal migration (save confirmations) + toast. Module CSS: `css/settings.css` (minimal).

---

### 3.5 index.html — Light Migration

CSS swap + login styling. Module CSS: `css/index.css`. **⚠️ Must stay in repo root** (Iron Rule #6).

---

### 3.6 shipments.html — Medium Migration

CSS swap + modal migration (9 JS files) + toast + permissions. Module CSS: `css/shipments.css`.

**⚠️** Same grep approach as inventory — map all modals before migrating.

---

### 3.7 Namespace Migration — promptPin → PinModal.prompt()

| File | Change |
|------|--------|
| `shared/js/pin-modal.js` | Add `PinModal.prompt()`, keep `promptPin()` as alias |
| `js/pin-modal.js` (redirect) | **Delete** |
| `modules/access-sync/sync-details.js` | `promptPin()` → `promptSyncPin()` |
| Callers in migrated pages | → `PinModal.prompt()` |
| `suppliers-debt.html` (not migrated) | alias keeps it working |

**⚠️ Iron Rule #12:** grep entire repo before and after.

---

### 3.8 Theme Integration

In `header.js`, after fetching tenant row:
```javascript
if (typeof loadTenantTheme === 'function') loadTenantTheme(tenantRow);
```

---

### 3.9 styles.css Status

After Phase 5: styles.css only used by **suppliers-debt.html**. Stays in repo until that page migrates.

---

## שינויי DB

```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
```

No other DB changes.

---

## Integration Points

| קובץ | שינוי |
|-------|-------|
| `inventory.html` | CSS + Scripts → shared/ |
| `employees.html` | CSS + Scripts → shared/ |
| `settings.html` | CSS + Scripts → shared/ |
| `index.html` | CSS + Scripts → shared/ |
| `shipments.html` | CSS + Scripts → shared/ |
| `css/inventory.css` | **חדש** — extracted from styles.css |
| `css/employees.css` | **חדש** |
| `css/settings.css` | **חדש** |
| `css/index.css` | **חדש** |
| `css/shipments.css` | **חדש** |
| `css/header.css` | Minor — variables.css import |
| `js/header.js` | 1 line — loadTenantTheme() |
| `js/pin-modal.js` (redirect) | **Deleted** |
| `shared/js/pin-modal.js` | Namespace — PinModal.prompt() + alias |
| `modules/access-sync/sync-details.js` | Rename promptPin → promptSyncPin |
| `modules/inventory/*.js` | Modal + Toast migration |
| `modules/shipments/*.js` | Modal + Toast migration |
| `modules/permissions/*.js` | Modal + Toast (if any) |
| `modules/settings/*.js` | Modal + Toast (if any) |
| `js/auth-service.js` | applyUIPermissions() → PermissionUI.apply() |
| `styles.css` | **Not deleted** — suppliers-debt still uses it |

---

## סדר ביצוע (Migration Steps)

```
=== Foundation (once) ===

Step 0:  Preparation — grep + map ALL modals, toasts, alerts across ALL 5 pages
         Output: migration map per page

Step 1:  Zero Hardcoded scan — grep repo, build report, fix all findings

Step 2:  custom_fields JSONB — ALTER TABLE + verify

Step 3:  Namespace migration — PinModal.prompt() + promptSyncPin()
         ⚠️ Iron Rule #12

Step 4:  header.js integration — loadTenantTheme() + header.css vars


=== Pilot — inventory.html ===

Step 5:  CSS migration — css/inventory.css + replace links
         ⚠️ Visual diff

Step 6:  Modal migration (inventory) — one file at a time

Step 7:  Toast migration (inventory)

Step 8:  Permission migration (inventory)

Step 9:  inventory.html full regression


=== Light pages ===

Step 10: employees.html — CSS + modals + toasts + permissions + regression (single step)

Step 11: settings.html — CSS + modals + toasts + regression (single step)

Step 12: index.html — CSS + regression (single step)


=== Medium page ===

Step 13: shipments.html CSS migration + visual diff

Step 14: shipments.html modal + toast migration

Step 15: shipments.html permissions + regression


=== Cleanup ===

Step 16: Delete js/pin-modal.js redirect file

Step 17: Final full regression — all 5 migrated pages + suppliers-debt.html (must still work)
```

---

## Verification Checklist

### Zero Hardcoded
- [ ] `grep "פריזמה\|Prizma"` — zero results (except comments/config)
- [ ] `grep "0\.17"` in business logic — zero results
- [ ] No hardcoded business values anywhere

### custom_fields
- [ ] Column exists: `custom_fields JSONB DEFAULT '{}'`
- [ ] Existing rows unaffected

### Namespace
- [ ] `PinModal.prompt()` works
- [ ] `promptPin()` alias works
- [ ] `promptSyncPin()` works
- [ ] Zero collisions

### Per-Page Regression

**inventory.html:**
- [ ] Visual: identical to before
- [ ] Every modal → Modal.*
- [ ] Every alert → Toast.*
- [ ] Permissions via data-permission
- [ ] Theme override works
- [ ] טעינת מלאי, חיפוש, סינון
- [ ] הוספת / עריכת / מחיקת פריט + PIN
- [ ] מחיקה לצמיתות (double PIN)
- [ ] שינוי כמות (+/-) + PIN
- [ ] ייבוא/ייצוא Excel
- [ ] מותגים, ספקים
- [ ] הזמנות רכש, קבלות סחורה
- [ ] OCR, Audit log, item history
- [ ] Access sync, ספירות מלאי
- [ ] התראות, הדפסה

**employees.html:**
- [ ] Visual: identical
- [ ] All features work

**settings.html:**
- [ ] Visual: identical
- [ ] All features work

**index.html:**
- [ ] Visual: identical
- [ ] Login works
- [ ] Module cards correct

**shipments.html:**
- [ ] Visual: identical
- [ ] Create, lock, details, manifest, couriers, settings

### Cross-Page
- [ ] **suppliers-debt.html — still works perfectly** (not migrated, loads styles.css)
- [ ] **Theme: all 5 migrated pages reflect --color-primary change**
- [ ] אפס console errors on all 6 pages

---

## ⚠️ Deferred Items — MUST be tracked

> **הפריטים הבאים נדחו מפאזה 5. חובה לתעד במקומות הבאים:**

### 1. suppliers-debt.html Migration
- **מה:** CSS + modals + toasts + permissions migration (same process as other pages)
- **למה נדחה:** 14 קבצי JS + AI/OCR — הכי מורכב. ניגע בו במודול הכספים
- **מתי:** תחילת מודול כספים, או כ-task נפרד לפני
- **📋 לרשום ב:**
  - `MASTER_ROADMAP.md` → תחת "Open Items / Tech Debt"
  - `ROADMAP.md` של מודול כספים → כ-prerequisite
  - `SESSION_CONTEXT.md` של מודול 1.5 → תחת "Deferred"

### 2. styles.css Deletion
- **מה:** מחיקת `css/styles.css` מה-repo
- **למה נדחה:** suppliers-debt.html עדיין תלוי בו
- **מתי:** מיד אחרי suppliers-debt.html migration
- **📋 לרשום ב:** אותם מקומות כמו סעיף 1

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
