# PHASE 2 SPEC — Core UI Components

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** 2 מתוך 6
> **תלויות:** פאזה 1 (CSS Foundation) ✅
> **מטרה:** כל popup, הודעה ו-PIN prompt במערכת עובר דרך רכיב אחיד ב-shared/. לא עוד HTML ידני של modals.

---

## קבצים חדשים

```
shared/
├── css/
│   ├── modal.css              — עיצוב Modal system (overlay, sizes, types, animations, stack)
│   └── toast.css              — עיצוב Toast system (types, positioning, stack, progress bar, animations)
├── js/
│   ├── modal-builder.js       — Modal system API (show, confirm, danger, form, wizard, close, closeAll)
│   ├── toast.js               — Toast system API (success, error, warning, info, dismiss)
│   └── pin-modal.js           — PIN prompt (migration — פנימית משתמש ב-Modal, API חיצוני זהה)
└── tests/
    ├── modal-test.html        — דף בדיקה: כל 5 סוגים × 5 גדלים, stack, keyboard
    └── toast-test.html        — דף בדיקה: 4 סוגים, stack, auto-dismiss, persistent
```

**סה"כ:** 2 קבצי CSS + 3 קבצי JS + 2 דפי בדיקה = 7 קבצים חדשים.

**קובץ שנמחק:** `js/pin-modal.js` (87 שורות) — מוחלף ב-`shared/js/pin-modal.js`

---

## 1. Modal System

### 1.1 modal.css

כל ערך מגיע מ-`var(--...)` — אפס hardcoded. קובץ standalone — לא תלוי ב-components.css.

**מה כולל:**

| רכיב | CSS Class | מה עושה |
|-------|-----------|---------|
| Overlay | `.modal-overlay` | רקע כהה semi-transparent, flex center, z-index: var(--z-modal) |
| Container | `.modal-container` | רקע לבן, border-radius, shadow, max-height: 90vh, overflow-y: auto |
| Header | `.modal-header` | כותרת + כפתור X, border-bottom, flex between |
| Body | `.modal-body` | padding, content area |
| Footer | `.modal-footer` | כפתורי action, flex gap, border-top |
| Close btn | `.modal-close` | כפתור X בפינה |

**5 גדלים:**

| Class | רוחב | שימוש |
|-------|-------|-------|
| `.modal-sm` | 340px | confirm, alert, PIN |
| `.modal-md` | 500px | טפסים קצרים |
| `.modal-lg` | 700px | טפסים מורכבים |
| `.modal-xl` | 900px | טבלאות, wizard |
| `.modal-fullscreen` | 95vw | דשבורדים |

**5 סוגים (visual):**

| Class | מה עושה |
|-------|---------|
| `.modal-type-default` | רגיל — ברירת מחדל |
| `.modal-type-confirm` | header רגיל, footer עם שני כפתורים |
| `.modal-type-alert` | header רגיל, footer עם כפתור אחד |
| `.modal-type-danger` | header אדום (var(--color-error)), icon אזהרה |
| `.modal-type-wizard` | progress bar ב-header, footer עם back/next/finish |

**Animations:**
- Open: fade in overlay (opacity 0→1) + scale up container (0.95→1), `var(--transition-normal)`
- Close: reverse
- Class: `.modal-entering`, `.modal-leaving`

**Stack:**
- כל modal חדש מקבל z-index גבוה יותר (base: var(--z-modal), +10 per stack level)
- Overlay של modal תחתון נשאר visible אבל dimmed
- Class: `.modal-stacked` על modals שמתחת

**RTL:**
- כפתור X בצד שמאל (logical: inset-inline-end)
- כפתורי footer ב-flex-direction: row-reverse לא נדרש — flex gap מספיק

---

### 1.2 modal-builder.js

**API ציבורי:**

```javascript
// ============================================
// Modal.show(config) — Generic modal
// ============================================
// config: {
//   size: 'sm'|'md'|'lg'|'xl'|'fullscreen'  (default: 'md')
//   title: string                             (required)
//   content: string (HTML)                    (required)
//   footer: string (HTML) | null              (default: null = no footer)
//   closeOnBackdrop: boolean                  (default: true)
//   closeOnEscape: boolean                    (default: true)
//   onClose: function                         (optional — called when modal closes)
//   cssClass: string                          (optional — extra class on container)
// }
// returns: { el: HTMLElement, close: function }
const modal = Modal.show({ size: 'lg', title: 'כותרת', content: '<p>תוכן</p>' })
modal.close()  // סגירה ידנית


// ============================================
// Modal.confirm(config) — Yes/No dialog
// ============================================
// config: {
//   title: string                             (required)
//   message: string                           (required — plain text, not HTML)
//   confirmText: string                       (default: 'אישור')
//   cancelText: string                        (default: 'ביטול')
//   confirmClass: string                      (default: 'btn-primary')
//   onConfirm: function                       (required)
//   onCancel: function                        (optional)
//   size: string                              (default: 'sm')
// }
Modal.confirm({
  title: 'מחיקת פריט',
  message: 'האם אתה בטוח שברצונך למחוק?',
  onConfirm: () => { /* delete */ }
})


// ============================================
// Modal.alert(config) — Info/message dialog
// ============================================
// config: {
//   title: string                             (required)
//   message: string                           (required)
//   buttonText: string                        (default: 'אישור')
//   onClose: function                         (optional)
//   size: string                              (default: 'sm')
// }
Modal.alert({ title: 'הצלחה', message: 'הפעולה בוצעה' })


// ============================================
// Modal.danger(config) — Dangerous action confirmation
// ============================================
// config: {
//   title: string                             (required)
//   message: string                           (required)
//   confirmWord: string                       (required — user must type this to confirm)
//   confirmText: string                       (default: 'מחק לצמיתות')
//   onConfirm: function                       (required)
//   size: string                              (default: 'sm')
// }
// confirm button starts disabled, enables only when typed word matches
Modal.danger({
  title: 'מחיקה לצמיתות',
  message: 'פעולה זו בלתי הפיכה. הקלד "מחק" לאישור.',
  confirmWord: 'מחק',
  onConfirm: () => { /* permanent delete */ }
})


// ============================================
// Modal.form(config) — Form in modal
// ============================================
// config: {
//   size: 'sm'|'md'|'lg'|'xl'                (default: 'md')
//   title: string                             (required)
//   content: string (HTML — the form fields)  (required)
//   submitText: string                        (default: 'שמור')
//   cancelText: string                        (default: 'ביטול')
//   onSubmit: function(formEl)                (required — receives the form element)
//   onCancel: function                        (optional)
//   closeOnSubmit: boolean                    (default: true)
// }
// ⚠️ content is injected as innerHTML — caller must escapeHtml any user data
Modal.form({
  size: 'lg',
  title: 'ספק חדש',
  content: '<div class="form-group">...</div>',
  onSubmit: (formEl) => {
    const name = formEl.querySelector('#name').value;
  }
})


// ============================================
// Modal.wizard(config) — Multi-step wizard
// ============================================
// config: {
//   size: 'xl'|'fullscreen'                   (default: 'xl')
//   title: string                             (required)
//   steps: [                                  (required, min 2)
//     {
//       label: string,                        (step name in progress bar)
//       content: string (HTML) | function(),  (HTML string or function returning HTML)
//       validate: function() → boolean,       (optional — called before next, must return true)
//       onEnter: function(stepEl),            (optional — called when step becomes active)
//       onLeave: function(stepEl)             (optional — called when leaving step)
//     }
//   ],
//   onFinish: function(wizardEl)              (required — called on last step submit)
//   onCancel: function                        (optional)
//   finishText: string                        (default: 'סיום')
//   nextText: string                          (default: 'הבא')
//   backText: string                          (default: 'הקודם')
// }
Modal.wizard({
  size: 'xl',
  title: 'אשף תשלום ספק',
  steps: [
    { label: 'בחירת ספק', content: '<div>...</div>', validate: () => !!selectedSupplier },
    { label: 'פרטי תשלום', content: () => buildPaymentForm(), onEnter: (el) => initForm(el) },
    { label: 'שיוך מסמכים', content: '<div>...</div>' },
    { label: 'אישור', content: () => buildSummary() }
  ],
  onFinish: (el) => { /* submit payment */ }
})


// ============================================
// Modal.close() — Close topmost modal
// ============================================
Modal.close()


// ============================================
// Modal.closeAll() — Close entire stack
// ============================================
Modal.closeAll()
```

**Internal behavior — Stack management:**
- מערך פנימי `_stack[]` שומר references לכל modal פתוח
- `Modal.show()` pushes to stack
- `Modal.close()` pops from stack
- Escape key → close topmost
- Backdrop click → close topmost (unless `closeOnBackdrop: false`)

**Internal behavior — Focus trap:**
- בפתיחת modal: שומר את `document.activeElement`
- Tab cycles בתוך ה-modal (first focusable ↔ last focusable)
- בסגירה: מחזיר focus לאלמנט המקורי

**Internal behavior — Body scroll lock:**
- בפתיחת modal ראשון: `document.body.style.overflow = 'hidden'`
- בסגירת modal אחרון: מחזיר overflow

**Dependencies:**
- `shared/css/modal.css` — must be loaded
- `shared/css/variables.css` — loaded via modal.css imports or page-level
- **אפס תלות ב-JS אחר** — modal-builder.js עצמאי לחלוטין

**File size estimate:** ~250-300 שורות. אם חורג מ-350 → לפצל wizard ל-`modal-wizard.js` (Claude Code יחליט בזמן כתיבה).

---

## 2. Toast System

### 2.1 toast.css

**מה כולל:**

| רכיב | CSS Class | מה עושה |
|-------|-----------|---------|
| Container | `.toast-container` | fixed, top-left (RTL), z-index: var(--z-toast), flex column, gap |
| Toast item | `.toast` | רקע, border-radius, shadow, padding, flex row |
| Icon | `.toast-icon` | אייקון שמאלי (logical: start) |
| Content | `.toast-content` | message text |
| Close | `.toast-close` | כפתור X |
| Progress | `.toast-progress` | bar מתכווץ מ-100% ל-0% |

**4 סוגים:**

| Class | צבע רקע | צבע border-inline-start | אייקון |
|-------|---------|------------------------|--------|
| `.toast-success` | var(--color-success-light) | var(--color-success) | ✓ (SVG) |
| `.toast-error` | var(--color-error-light) | var(--color-error) | ✕ (SVG) |
| `.toast-warning` | var(--color-warning-light) | var(--color-warning) | ⚠ (SVG) |
| `.toast-info` | var(--color-info-light) | var(--color-info) | ℹ (SVG) |

**Animations:**
- Enter: slide in from right (RTL: from left) + fade, `var(--transition-normal)`
- Exit: slide out + fade
- Class: `.toast-entering`, `.toast-leaving`

**Positioning:**
- `top: var(--space-lg)`, `inset-inline-start: var(--space-lg)` (RTL: top-left)
- Stack: flex-direction column, gap between toasts

---

### 2.2 toast.js

**API ציבורי:**

```javascript
// ============================================
// Toast.success(message, options?)
// Toast.error(message, options?)
// Toast.warning(message, options?)
// Toast.info(message, options?)
// ============================================
// message: string (plain text — escaped internally)
// options: {
//   duration: number (ms)          (default: 3000. 0 = no auto-dismiss)
//   persistent: boolean            (default: false — same as duration:0)
//   id: string                     (optional — unique id, prevents duplicates, enables dismiss by id)
//   closable: boolean              (default: true — shows X button)
// }
// returns: string (toast id — auto-generated or from options.id)

Toast.success('נשמר בהצלחה')
Toast.error('שגיאה בשמירה', { duration: 5000 })
Toast.warning('חסרים שדות חובה')
Toast.info('טוען נתונים...', { persistent: true, id: 'loading' })


// ============================================
// Toast.dismiss(id) — Close specific toast
// ============================================
Toast.dismiss('loading')


// ============================================
// Toast.clear() — Close all toasts
// ============================================
Toast.clear()
```

**Internal behavior:**
- Container נוצר פעם אחת ב-DOM (lazy — ביצירת toast ראשון)
- מקסימום 5 toasts visible — toast 6 דוחף את הישן
- `id` option: אם toast עם אותו id כבר קיים — מחליף אותו (לא מוסיף כפול)
- Progress bar: animation מ-100% ל-0% על duration. רק כשיש auto-dismiss
- Close button: click → dismiss עם animation
- `message` עובר `escapeHtml()` פנימית — safe from XSS

**Dependencies:**
- `shared/css/toast.css` — must be loaded
- `shared/css/variables.css` — via toast.css or page-level
- **אפס תלות ב-JS אחר** — toast.js עצמאי

**File size estimate:** ~120-150 שורות.

---

## 3. PIN Modal Migration

### 3.1 shared/js/pin-modal.js (replacement)

**מה משתנה:**
- HTML ידני → `Modal.form({ size: 'sm' })`
- Inline styles → CSS classes מ-modal.css + components.css
- Hardcoded צבעים (`#d0d5dd`, `#1a2744`, `#dc3545`) → CSS variables

**מה לא משתנה — Contract:**
```javascript
// API זהה לחלוטין — אפס breaking changes
promptPin(title, callback)
// title: string
// callback: function(pin, emp) — pin=string(5), emp=employee object from verifyPinOnly()
```

**UX שחייב להישמר (1:1):**
- 5 input fields של digit אחד, type="password", inputmode="numeric"
- Focus auto-advance: הקלדת ספרה → focus לinput הבא
- Backspace: מחזיר focus לinput הקודם + מנקה
- Paste support: הדבקת 5 ספרות → auto-fill + auto-submit
- Auto-submit: ברגע ש-5 ספרות מולאו → שליחה אוטומטית
- Error display: "קוד עובד שגוי" + ניקוי inputs + focus על ראשון
- Cancel: כפתור ביטול + click על backdrop
- Focus styling on active input

**שינויים פנימיים:**
- `var overlay = document.createElement(...)` → `Modal.form({ size: 'sm', title, content: pinInputsHtml })`
- `overlay.remove()` → `Modal.close()`
- Focus styling: inline `inp.style.borderColor` → CSS class `.pp-digit:focus` (defined in pin-modal.js or a small `<style>` block)
- Error element: `#pp-error` → class `.pin-error` styled via CSS variables

**Dependencies (חדש):**
- `shared/js/modal-builder.js` — for `Modal.form()`
- `shared/css/modal.css` — modal styling
- `auth-service.js` → `verifyPinOnly()` — unchanged, not moved

**Backward compatibility:**
- כל דף שעושה `promptPin(title, callback)` ימשיך לעבוד
- script tag ב-HTML: `<script src="js/pin-modal.js">` → `<script src="shared/js/pin-modal.js">`
- **בפאזה 2:** מעדכנים את ה-script path בכל ה-HTML files (6 דפים)
- **Redirect option:** אם לא רוצים לגעת ב-6 דפים — `js/pin-modal.js` ישן הופך ל-one-liner שטוען את `shared/js/pin-modal.js`. ההחלטה של הצ'אט המשני.

**File size estimate:** ~70-80 שורות (פחות מהמקור — Modal.form() מטפל ב-overlay, backdrop, close).

---

## שינויי DB

**אין.** פאזה 2 היא JS + CSS בלבד.

---

## Contracts — מה הפאזה חושפת

### JS Functions (public API)

```
// Modal system — shared/js/modal-builder.js
Modal.show(config)          → { el, close }
Modal.confirm(config)       → void (callback-based)
Modal.alert(config)         → void (callback-based)
Modal.danger(config)        → void (callback-based)
Modal.form(config)          → { el, close }
Modal.wizard(config)        → { el, close }
Modal.close()               → void (closes topmost)
Modal.closeAll()            → void (closes all)

// Toast system — shared/js/toast.js
Toast.success(msg, opts?)   → string (id)
Toast.error(msg, opts?)     → string (id)
Toast.warning(msg, opts?)   → string (id)
Toast.info(msg, opts?)      → string (id)
Toast.dismiss(id)           → void
Toast.clear()               → void

// PIN modal — shared/js/pin-modal.js (API unchanged)
promptPin(title, callback)  → void
```

### CSS Classes (public API)

```
/* modal.css */
.modal-overlay, .modal-container, .modal-header, .modal-body, .modal-footer, .modal-close
.modal-sm, .modal-md, .modal-lg, .modal-xl, .modal-fullscreen
.modal-type-default, .modal-type-confirm, .modal-type-alert, .modal-type-danger, .modal-type-wizard
.modal-entering, .modal-leaving, .modal-stacked
.wizard-progress, .wizard-step, .wizard-step-active, .wizard-step-done

/* toast.css */
.toast-container
.toast, .toast-success, .toast-error, .toast-warning, .toast-info
.toast-icon, .toast-content, .toast-close, .toast-progress
.toast-entering, .toast-leaving
```

---

## Integration Points — שינויים בקוד קיים

| קובץ | שינוי | פירוט |
|-------|-------|-------|
| `js/pin-modal.js` | **נמחק** (מוחלף ב-shared/) | קובץ ישן מוסר. shared/js/pin-modal.js מחליף |
| 6 HTML pages | **script path** | `js/pin-modal.js` → `shared/js/pin-modal.js` **או** redirect file |
| 6 HTML pages | **CSS imports** | מוסיפים `<link>` ל-`shared/css/modal.css` (נדרש ל-PIN modal) |

**⚠️ שינוי מינימלי:** רק path של pin-modal + CSS link. אפס שינוי לוגיקה. אפס שינוי בדפים קיימים מעבר לזה.

**אופציית redirect (מומלצת לפאזה 2):**
במקום לגעת ב-6 דפים, `js/pin-modal.js` הישן הופך ל:
```javascript
// Redirect — PIN modal moved to shared/
// This file exists for backward compatibility only.
// Will be removed in Phase 5 migration.
document.write('<script src="shared/js/pin-modal.js"><\/script>');
```
ובפאזה 5 (migration) נעדכן את כל ה-paths ונמחק את ה-redirect.

**לגבי ה-CSS:** `modal.css` חייב להיטען. שתי אופציות:
- **אופציה א (redirect style):** pin-modal.js מזריק `<link>` ל-modal.css dynamically אם לא קיים
- **אופציה ב (explicit):** מוסיפים `<link href="shared/css/modal.css">` ל-6 דפים

הצ'אט המשני יבחר. שתי האופציות backward compatible.

---

## סדר ביצוע (Migration Steps)

```
Step 1:  יצירת shared/css/modal.css — overlay, container, sizes, types, animations, stack, wizard progress
Step 2:  יצירת shared/js/modal-builder.js — Modal.show/confirm/alert/danger/form/wizard/close/closeAll
Step 3:  יצירת shared/tests/modal-test.html — כל 5 סוגים × 5 גדלים, stack test, keyboard test, wizard test
Step 4:  בדיקת Modal — כל הסוגים עובדים, stack עובד, focus trap, Escape, backdrop click
Step 5:  יצירת shared/css/toast.css — types, positioning, stack, progress bar, animations
Step 6:  יצירת shared/js/toast.js — success/error/warning/info/dismiss/clear
Step 7:  יצירת shared/tests/toast-test.html — 4 סוגים, stack, auto-dismiss, persistent, duplicate prevention
Step 8:  בדיקת Toast — כל הסוגים, stack של 5, progress bar, dismiss by id
Step 9:  יצירת shared/js/pin-modal.js — migration של js/pin-modal.js ← Modal.form()
Step 10: Redirect/integration — js/pin-modal.js ישן → redirect או path update + modal.css loading
Step 11: בדיקת PIN — promptPin() עובד בדיוק כמו קודם, 5 digits, paste, backspace, auto-submit, error
Step 12: Regression — כל 6 הדפים נטענים, PIN עובד בכל דף שמשתמש בו
```

**כל step = פרומפט נפרד ל-Claude Code.**

---

## Verification Checklist

### Modal System
- [ ] `Modal.show({ title, content })` — פותח modal עם תוכן
- [ ] `Modal.confirm({ title, message, onConfirm })` — confirm dialog, שני כפתורים
- [ ] `Modal.alert({ title, message })` — alert עם כפתור OK
- [ ] `Modal.danger({ title, message, confirmWord, onConfirm })` — כפתור disabled עד הקלדת מילה
- [ ] `Modal.form({ title, content, onSubmit })` — form modal, submit callback מקבל formEl
- [ ] `Modal.wizard({ steps, onFinish })` — wizard עם progress bar, back/next/finish
- [ ] 5 גדלים: sm (340px), md (500px), lg (700px), xl (900px), fullscreen (95vw)
- [ ] Stack: modal מעל modal — 3 modals stacked
- [ ] Escape: סוגר רק את העליון
- [ ] Backdrop click: סוגר את העליון (אלא אם closeOnBackdrop: false)
- [ ] Focus trap: Tab cycles בתוך modal
- [ ] Body scroll lock: scroll חסום כשmodal פתוח
- [ ] Close: מחזיר focus לאלמנט שהיה active
- [ ] Animation: open ו-close חלקים
- [ ] RTL: כפתור X בצד הנכון, layout תקין

### Toast System
- [ ] `Toast.success('msg')` — toast ירוק עם ✓
- [ ] `Toast.error('msg')` — toast אדום עם ✕
- [ ] `Toast.warning('msg')` — toast כתום עם ⚠
- [ ] `Toast.info('msg')` — toast כחול עם ℹ
- [ ] Auto-dismiss: נעלם אחרי 3 שניות (default)
- [ ] Custom duration: `{ duration: 5000 }` — נעלם אחרי 5 שניות
- [ ] Persistent: `{ persistent: true }` — לא נעלם
- [ ] Dismiss by id: `Toast.dismiss('loading')` סוגר toast ספציפי
- [ ] Clear: `Toast.clear()` סוגר הכל
- [ ] Stack: 5 toasts visible, ה-6 דוחף את הישן
- [ ] Duplicate prevention: `{ id: 'x' }` — אותו id מחליף, לא מכפיל
- [ ] Progress bar: visible, מתכווץ מ-100% ל-0%
- [ ] Close button: click → dismiss
- [ ] XSS: message עם `<script>` לא מתבצע
- [ ] RTL: toast מופיע מצד שמאל למעלה

### PIN Modal Migration
- [ ] `promptPin('כותרת', callback)` — עובד בדיוק כמו קודם
- [ ] 5 digit split inputs, type=password, inputmode=numeric
- [ ] Focus auto-advance: ספרה → focus לבא
- [ ] Backspace: חוזר לקודם + מנקה
- [ ] Paste: 5 ספרות → auto-fill + auto-submit
- [ ] Auto-submit: 5 ספרות → שליחה אוטומטית
- [ ] PIN שגוי: "קוד עובד שגוי" + ניקוי + focus על ראשון
- [ ] שגיאת רשת: הודעת שגיאה + ניקוי
- [ ] Cancel button: סוגר modal
- [ ] Backdrop click: סוגר modal
- [ ] `verifyPinOnly()` נקרא — auth-service.js לא נגעים

### Regression (קריטי!)
- [ ] **inventory.html** — PIN עובד (הוספת כמות, מחיקה)
- [ ] **suppliers-debt.html** — PIN עובד (אישור תשלום)
- [ ] **shipments.html** — PIN עובד (נעילת ארגז)
- [ ] **employees.html** — נטען תקין
- [ ] **settings.html** — נטען תקין
- [ ] **index.html** — login עובד (login שונה מ-promptPin, אבל לוודא שלא נשבר)
- [ ] אפס console errors בכל 6 הדפים
- [ ] Modal הישנים שנבנו ב-HTML ידני (inventory, debt) — **לא נגעים, ממשיכים לעבוד**

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
