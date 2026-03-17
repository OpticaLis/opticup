# PHASE 1 SPEC — CSS Foundation

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** 1 מתוך 6
> **תלויות:** אין (פאזה ראשונה)
> **מטרה:** כל עיצוב במערכת מוגדר דרך CSS Variables ורכיבי CSS. שינוי ב-variables.css = כל המסכים מתעדכנים. חנות שנייה עם צבעים אחרים = שורה ב-DB, לא קובץ CSS חדש.

---

## עקרון מנחה — Zero Redesign

**לא משנים עיצוב.** דולים את הצבעים, הגדלים, ה-spacing מתוך styles.css הקיים ← שמים ב-variables.css כ-CSS Variables ← components.css משתמש בהם.

הבדיקה: המערכת חייבת להיראות **בדיוק כמו עכשיו** אחרי פאזה 1. הבדל ויזואלי = באג.

---

## אסטרטגיית דו-קיום

- shared/css/ נבנה כמערכת עצמאית עם test page
- **הדפים הקיימים לא נגעים** — ממשיכים לטעון styles.css עד פאזה 5 (migration)
- שום `<link>` חדש לא נוסף לדפים הקיימים בפאזה זו
- ui-test.html ב-shared/tests/ מוכיח שהמערכת עובדת

---

## קבצים חדשים

```
shared/
├── css/
│   ├── variables.css        — Design tokens: צבעים, טיפוגרפיה, spacing, radius, shadows, z-index, transitions
│   ├── components.css       — כפתורים, inputs, selects, badges, cards, table base, slide-in panels, skeleton loaders, accordion (CSS only)
│   ├── layout.css           — page structure, sticky header rules, grid/flex helpers, RTL utilities, print styles
│   └── forms.css            — input styles, error states, required markers, field groups, 1-col/2-col layouts
├── js/
│   └── theme-loader.js      — קריאת ui_config מ-tenants → inject CSS Variables ל-:root
└── tests/
    └── ui-test.html          — דף בדיקה: כל הרכיבים ב-3 palettes שונים
```

**סה"כ:** 4 קבצי CSS + 1 קובץ JS + 1 דף בדיקה = 6 קבצים חדשים.

---

## פירוט כל קובץ

### 1. `shared/css/variables.css`

כל ה-design tokens של המערכת. **מקור אמת יחיד** לכל ערך ויזואלי.

Claude Code ידלה כל ערך מ-styles.css הקיים. אסור להמציא ערכים חדשים.

```css
:root {
  /* === Colors — Primary === */
  --color-primary: #...;           /* דולים מ-styles.css */
  --color-primary-hover: #...;
  --color-primary-light: #...;     /* רקע בהיר, badges */
  --color-primary-dark: #...;

  /* === Colors — Semantic === */
  --color-success: #...;
  --color-success-light: #...;
  --color-error: #...;
  --color-error-light: #...;
  --color-warning: #...;
  --color-warning-light: #...;
  --color-info: #...;
  --color-info-light: #...;

  /* === Colors — Neutral === */
  --color-white: #fff;
  --color-black: #...;
  --color-gray-50: #...;           /* lightest bg */
  --color-gray-100: #...;
  --color-gray-200: #...;          /* borders */
  --color-gray-300: #...;
  --color-gray-400: #...;
  --color-gray-500: #...;          /* muted text */
  --color-gray-600: #...;
  --color-gray-700: #...;          /* body text */
  --color-gray-800: #...;
  --color-gray-900: #...;          /* headings */

  /* === Colors — Background === */
  --color-bg-page: #...;           /* page background */
  --color-bg-card: #...;           /* card/container background */
  --color-bg-input: #...;          /* input background */

  /* === Typography === */
  --font-family: '...', sans-serif;
  --font-size-xs: ...;
  --font-size-sm: ...;
  --font-size-md: ...;             /* base / body */
  --font-size-lg: ...;
  --font-size-xl: ...;
  --font-size-2xl: ...;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* === Spacing === */
  --space-xs: ...;
  --space-sm: ...;
  --space-md: ...;
  --space-lg: ...;
  --space-xl: ...;
  --space-2xl: ...;

  /* === Border Radius === */
  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;
  --radius-full: 9999px;

  /* === Shadows === */
  --shadow-sm: ...;
  --shadow-md: ...;
  --shadow-lg: ...;

  /* === Z-Index Scale === */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;

  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

**הערה ל-Claude Code:** כל ערך עם `#...` = חייב להיות דלוי מ-styles.css הקיים. לא להמציא. אם אין ערך תואם ב-styles.css — לסמן כשאלה פתוחה ולעצור.

---

### 2. `shared/css/components.css`

רכיבי UI מעוצבים. **CSS בלבד — אפס JS.** כל ערך מגיע מ-`var(--...)`.

| רכיב | Classes | וריאנטים |
|-------|---------|----------|
| **כפתורים** | `.btn` | `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost` × `.btn-sm`, `.btn-md`, `.btn-lg` |
| **Inputs** | `.input` | `.input-error`, `.input-disabled` |
| **Select** | `.select` | `.select-error` |
| **Textarea** | `.textarea` | `.textarea-error` |
| **Badge** | `.badge` | `.badge-success`, `.badge-error`, `.badge-warning`, `.badge-info`, `.badge-neutral` |
| **Card** | `.card` | `.card-header`, `.card-body`, `.card-footer` |
| **Table base** | `.table` | `.table-header`, `.table-row`, `.table-cell`, `.table-sortable`, `.table-sort-active` |
| **Slide-in Panel** | `.slide-panel` | `.slide-panel-open`, `.slide-panel-overlay`, `.slide-panel-header`, `.slide-panel-body` |
| **Skeleton Loader** | `.skeleton` | `.skeleton-text`, `.skeleton-circle`, `.skeleton-rect`, `.skeleton-row` + `@keyframes skeleton-pulse` |
| **Accordion** | `.accordion` | `.accordion-header`, `.accordion-content`, `.accordion-open` (CSS only, no JS) |

**כללים:**
- אפס `color: #xxx` — הכל `var(--color-...)`
- אפס `font-size: 14px` — הכל `var(--font-size-...)`
- אפס `padding: 8px` — הכל `var(--space-...)`
- אפס `border-radius: 4px` — הכל `var(--radius-...)`
- Slide-in Panel: RTL-aware — נכנס מימין. `transform: translateX(100%)` → `translateX(0)` on `.slide-panel-open`
- Skeleton: animation `pulse` בלבד, צבע רקע `var(--color-gray-200)`

---

### 3. `shared/css/layout.css`

מבנה עמוד, grid, flex helpers, RTL.

| רכיב | Classes | מה עושה |
|-------|---------|---------|
| **Page structure** | `.page-container`, `.page-header`, `.page-content` | מבנה בסיסי של עמוד |
| **Sticky header** | `.header-sticky` | position: sticky + z-index |
| **Flex helpers** | `.flex`, `.flex-col`, `.flex-wrap`, `.items-center`, `.justify-between`, `.gap-sm/md/lg` | flex utilities |
| **Grid helpers** | `.grid`, `.grid-2`, `.grid-3`, `.grid-4` | grid layouts |
| **RTL utilities** | `.text-start`, `.text-end`, `.ms-auto`, `.me-auto` | logical properties (margin-inline-start, etc.) |
| **Visibility** | `.hidden`, `.visible`, `.sr-only` | display control |
| **Print** | `@media print` | `.no-print` הסתרת אלמנטים בהדפסה, header hidden |

**כלל:** layout.css משתמש ב-logical properties (margin-inline-start, padding-inline-end) ולא ב-margin-left/right. זה מבטיח RTL תקין בלי overrides.

---

### 4. `shared/css/forms.css`

עיצוב טפסים. **לא form builder — רק CSS classes.**

| רכיב | Classes | מה עושה |
|-------|---------|---------|
| **Field group** | `.form-group` | margin-bottom + label styling |
| **Label** | `.form-label` | font-weight, size, spacing |
| **Required marker** | `.form-required` | כוכבית אדומה אחרי label |
| **Error message** | `.form-error` | טקסט אדום מתחת ל-input |
| **Help text** | `.form-help` | טקסט אפור קטן מתחת ל-input |
| **Layouts** | `.form-row`, `.form-col-2` | 1-col (ברירת מחדל) או 2-col side-by-side |
| **Actions** | `.form-actions` | container לכפתורי submit/cancel, flex with gap |
| **Inline** | `.form-inline` | label + input באותה שורה |

---

### 5. `shared/js/theme-loader.js`

פונקציה אחת שקוראת `ui_config` מ-tenants ומזריקה CSS Variables ל-`:root`.

**API:**

```javascript
/**
 * loadTenantTheme(tenantRow)
 * 
 * @param {Object} tenantRow — שורת tenant מ-DB (כבר נשלפת ב-header.js)
 * @returns {void}
 * 
 * קוראת את tenantRow.ui_config (JSONB).
 * עוברת על כל key-value ומזריקה ל-:root כ-CSS Variable.
 * 
 * דוגמת ui_config ב-DB:
 * {
 *   "--color-primary": "#1a56db",
 *   "--color-primary-hover": "#1e429f",
 *   "--font-family": "Heebo, sans-serif"
 * }
 * 
 * כל key חייב להתחיל ב-"--" — אחרת מדולג (אבטחה).
 */
function loadTenantTheme(tenantRow) { ... }
```

**כללים:**
- מקבל את ה-tenant row שכבר נשלף — **אפס קריאות DB נוספות**
- אם `ui_config` ריק או null — לא עושה כלום (defaults מ-variables.css חלים)
- רק keys שמתחילים ב-`--` מוזרקים (protection מפני injection)
- קובץ standalone — לא תלוי בשום קובץ shared/ אחר

**Integration point (לא בפאזה זו — רק תיעוד):**
- header.js כבר שולף `tenants` row → בפאזה 5 (migration) יקרא ל-`loadTenantTheme(tenantRow)` אחרי שליפה
- בפאזה 1: theme-loader.js קיים, נבדק ב-ui-test.html, לא מחובר לדפים אמיתיים

---

### 6. `shared/tests/ui-test.html`

דף בדיקה שמציג את **כל** הרכיבים מ-components.css, layout.css, forms.css.

**מה מוצג:**
1. **Palette section** — כל הצבעים מ-variables.css כ-swatches
2. **Typography section** — כל הגדלים + weights
3. **Buttons** — כל 4 variants × 3 sizes = 12 כפתורים
4. **Inputs** — normal, error, disabled states
5. **Badges** — כל 5 variants
6. **Card** — card עם header, body, footer
7. **Table** — טבלה לדוגמה עם sort indicators
8. **Slide-in Panel** — כפתור שפותח panel מימין
9. **Skeleton** — text, circle, rect, row
10. **Accordion** — 3 items, open/close (JS inline בדף — לא ב-shared/js/)
11. **Form** — form-group, labels, errors, 2-col layout
12. **Theme switcher** — 3 כפתורים שמדמים palettes שונים (JS inline שמזריק variables ל-:root)

**Theme switcher בדף הבדיקה:**
- כפתור "Default" — variables.css כמו שהוא
- כפתור "Palette B" — overrides כמה צבעים (ירוק primary)
- כפתור "Palette C" — overrides כמה צבעים (סגול primary)
- מוכיח שהמנגנון עובד — שינוי variables = כל הרכיבים מתעדכנים

---

## שינוי DB

```sql
-- הוספת עמודת ui_config לטבלת tenants
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS ui_config JSONB DEFAULT '{}';

-- אין צורך ב-RLS חדש — tenants כבר מוגנת
-- אין צורך באינדקס — עמודה אחת per tenant, לא searchable
```

**מבנה ui_config:**
```json
{
  "--color-primary": "#1a56db",
  "--color-primary-hover": "#1e429f",
  "--color-primary-light": "#e8edf5",
  "--font-family": "Heebo, sans-serif"
}
```

- Keys = שמות CSS Variables (חייבים להתחיל ב-`--`)
- Values = ערכי CSS תקינים
- ברירת מחדל: `{}` (= variables.css defaults חלים)
- Tenant ראשון (פריזמה): לא צריך להכניס ערכים — ה-defaults מ-variables.css הם בדיוק העיצוב הנוכחי

---

## Contracts — מה הפאזה חושפת

### CSS Classes (public API)
```
/* variables.css */
כל --color-*, --font-*, --space-*, --radius-*, --shadow-*, --z-*, --transition-*

/* components.css */
.btn, .btn-primary, .btn-secondary, .btn-danger, .btn-ghost
.btn-sm, .btn-md, .btn-lg
.input, .input-error, .input-disabled
.select, .select-error
.textarea, .textarea-error
.badge, .badge-success, .badge-error, .badge-warning, .badge-info, .badge-neutral
.card, .card-header, .card-body, .card-footer
.table, .table-header, .table-row, .table-cell, .table-sortable, .table-sort-active
.slide-panel, .slide-panel-open, .slide-panel-overlay, .slide-panel-header, .slide-panel-body
.skeleton, .skeleton-text, .skeleton-circle, .skeleton-rect, .skeleton-row
.accordion, .accordion-header, .accordion-content, .accordion-open

/* layout.css */
.page-container, .page-header, .page-content
.header-sticky
.flex, .flex-col, .flex-wrap, .items-center, .justify-between, .gap-sm, .gap-md, .gap-lg
.grid, .grid-2, .grid-3, .grid-4
.text-start, .text-end, .ms-auto, .me-auto
.hidden, .visible, .sr-only
.no-print

/* forms.css */
.form-group, .form-label, .form-required, .form-error, .form-help
.form-row, .form-col-2, .form-actions, .form-inline
```

### JS Function (public API)
```javascript
loadTenantTheme(tenantRow)   // shared/js/theme-loader.js
```

---

## Integration Points — מה משתנה בקוד קיים

**בפאזה 1: כלום.** אפס שינויים בקבצים קיימים.

| קובץ קיים | שינוי בפאזה 1 | שינוי בפאזה 5 (migration) |
|-----------|----------------|--------------------------|
| styles.css | לא נגעים | מוחלף הדרגתית ← shared/css/ |
| header.css | לא נגעים | מוסיף import של variables.css |
| header.js | לא נגעים | מוסיף קריאה ל-`loadTenantTheme()` |
| inventory.html | לא נגעים | מחליף `<link>` מ-styles.css ← shared/css/* |
| שאר הדפים | לא נגעים | אותו תהליך כמו inventory |

---

## סדר ביצוע (Migration Steps)

```
Step 1: ALTER TABLE tenants ADD COLUMN ui_config
Step 2: יצירת shared/css/variables.css — דליית ערכים מ-styles.css
Step 3: יצירת shared/css/components.css — כפתורים, inputs, badges, cards, tables, panels, skeleton, accordion
Step 4: יצירת shared/css/layout.css — page structure, flex, grid, RTL, print
Step 5: יצירת shared/css/forms.css — field groups, labels, errors, layouts
Step 6: יצירת shared/js/theme-loader.js
Step 7: יצירת shared/tests/ui-test.html — כל הרכיבים + theme switcher
Step 8: בדיקה — ui-test.html נראה נכון, theme switcher עובד, RTL תקין
```

**כל step = פרומפט נפרד ל-Claude Code.** הצ'אט המשני יפרק לפי זה.

---

## Verification Checklist

### CSS Integrity
- [ ] כל variable מוגדר פעם אחת ב-variables.css
- [ ] אפס צבע hardcoded ב-components.css (grep: אפס `#` שלא בתוך comment)
- [ ] אפס font-size hardcoded ב-components.css (grep: אפס `px` ל-font)
- [ ] אפס spacing hardcoded ב-components.css (grep: אפס `px` ל-padding/margin)
- [ ] כל class ב-components.css משתמש רק ב-`var(--...)`
- [ ] layout.css משתמש ב-logical properties (margin-inline-start, לא margin-left)

### Visual
- [ ] ui-test.html מציג את כל הרכיבים תקין
- [ ] theme switcher — לחיצה על Palette B = כל הרכיבים מתעדכנים
- [ ] theme switcher — לחיצה על Default = חוזר למקור
- [ ] כל הרכיבים תקינים ב-RTL
- [ ] כל הרכיבים תקינים ב-mobile (responsive)

### Theme Loader
- [ ] `loadTenantTheme({})` — לא עושה כלום (defaults חלים)
- [ ] `loadTenantTheme({ ui_config: { "--color-primary": "red" } })` — primary משתנה
- [ ] `loadTenantTheme({ ui_config: { "not-a-var": "red" } })` — מדולג (אין --)
- [ ] `loadTenantTheme({ ui_config: null })` — לא קורס

### DB
- [ ] `ui_config` עמודה קיימת על tenants, default `{}`
- [ ] tenant קיים (פריזמה) — `ui_config` = `{}`

### Regression (קריטי!)
- [ ] **inventory.html נטען ונראה בדיוק כמו קודם** — אפס שינוי ויזואלי
- [ ] **suppliers-debt.html נטען ונראה בדיוק כמו קודם**
- [ ] **shipments.html נטען ונראה בדיוק כמו קודם**
- [ ] **employees.html נטען ונראה בדיוק כמו קודם**
- [ ] **settings.html נטען ונראה בדיוק כמו קודם**
- [ ] **index.html נטען ונראה בדיוק כמו קודם**

> ⚠️ Regression כאן אמור להיות טריוויאלי — לא נגענו באף דף קיים. אבל חובה לוודא שיצירת shared/ לא שברה שום נתיב יחסי או CSS cascade.

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
