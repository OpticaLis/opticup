# מודול 1.5 — פאזה 6: מתיחת פנים UI

> **פאזה השלמה.** מודול 1.5 הושלם (פאזות 0-5 + QA). פאזה 6 היא תוספת מתוכננת —
> שינוי ערכי עיצוב ב-variables.css. אפס שינויי קוד, אפס שינויי לוגיקה.
> **זמן משוער: יום אחד.**

---

## רקע

מודול 1.5 בנה את תשתית ה-CSS עם הכלל "Zero Redesign" — כל ערך דלוי כמו שהוא מ-styles.css הישן. עכשיו, אחרי שהתשתית יציבה ונבדקה על שני tenants — משדרגים את ה-defaults.

**הבהרה:** הערכים ב-variables.css הם ה-default — מה שכל tenant חדש מקבל. כל tenant יכול לדרוס עם ui_config ב-DB (כבר עובד מפאזה 1). מה שנבחר כאן = ברירת המחדל של Optic Up.

---

## Palette שנבחר: Indigo מקצועי

### Primary Ramp

| Variable | Value | שימוש |
|----------|-------|-------|
| `--color-primary` | `#4f46e5` | כפתורים ראשיים, links, focus rings |
| `--color-primary-hover` | `#4338ca` | hover state על primary |
| `--color-primary-light` | `#eef2ff` | רקע בהיר — badges, selected rows, subtle highlights |
| `--color-primary-dark` | `#3730a3` | header background, text on light primary bg |

### Full Scale (לשימוש נרחב ב-components)

| Stop | Value | שימוש |
|------|-------|-------|
| 50 | `#eef2ff` | lightest bg, selected state |
| 100 | `#e0e7ff` | light bg, badge background |
| 200 | `#c7d2fe` | light border, focus ring bg |
| 300 | `#a5b4fc` | disabled primary |
| 400 | `#818cf8` | secondary actions |
| 500 | `#6366f1` | mid-tone, icons |
| 600 | `#4f46e5` | **primary** — buttons, links |
| 700 | `#4338ca` | **hover** |
| 800 | `#3730a3` | **header**, dark text on light bg |
| 900 | `#312e81` | darkest — active state, pressed |

### Semantic Colors — לא משתנים

ה-semantic colors (success, error, warning, info) נשארים כמו שהם — הם לא חלק מה-brand, הם חלק מה-UX:

| Variable | Value | הערה |
|----------|-------|------|
| `--color-success` | ללא שינוי | ירוק |
| `--color-error` | ללא שינוי | אדום |
| `--color-warning` | ללא שינוי | כתום |
| `--color-info` | ללא שינוי | כחול |

### Neutrals — ליטוש עדין

סקאלת ה-grays עשויה להצטרך התאמה קלה כדי להשתלב עם Indigo. הכיוון: gray עם נגיעה קלה של כחול (cool gray) במקום gray טהור (warm gray). **Claude Code יבדוק** — אם ה-grays הנוכחיים עובדים עם Indigo, לא נוגעים. אם נראה "חם מדי" ליד Indigo, מחליפים ל-cool gray scale.

**Cool gray candidates (רק אם צריך):**

| Variable | Current | Candidate | החלטה |
|----------|---------|-----------|-------|
| `--color-gray-50` | (current) | `#f8fafc` | Claude Code יבדוק |
| `--color-gray-100` | (current) | `#f1f5f9` | Claude Code יבדוק |
| `--color-gray-200` | (current) | `#e2e8f0` | Claude Code יבדוק |
| `--color-gray-300` | (current) | `#cbd5e1` | Claude Code יבדוק |
| `--color-gray-400` | (current) | `#94a3b8` | Claude Code יבדוק |
| `--color-gray-500` | (current) | `#64748b` | Claude Code יבדוק |
| `--color-gray-600` | (current) | `#475569` | Claude Code יבדוק |
| `--color-gray-700` | (current) | `#334155` | Claude Code יבדוק |
| `--color-gray-800` | (current) | `#1e293b` | Claude Code יבדוק |
| `--color-gray-900` | (current) | `#0f172a` | Claude Code יבדוק |

---

## מה משתנה

| קובץ | שינוי |
|-------|-------|
| `shared/css/variables.css` | Primary colors → Indigo. אולי gray scale → cool gray |
| DB: test tenant `ui_config` | עדכון ל-palette שני (נשאר ירוק, או palette אחר שמבדיל) |

## מה לא משתנה

- ❌ אף קובץ JS
- ❌ אף קובץ HTML
- ❌ components.css, layout.css, forms.css, modal.css, toast.css, table.css
- ❌ semantic colors (success, error, warning, info)
- ❌ typography (font-family, sizes, weights)
- ❌ spacing, radius, shadows, z-index, transitions
- ❌ לוגיקה עסקית

---

## Steps

```
Step 1:  עדכון variables.css — Primary colors → Indigo values
         אם grays צריכים התאמה → cool gray scale

Step 2:  בדיקה ב-shared/tests/ui-test.html — כל הרכיבים עם ה-palette החדש
         ⚠️ לפני בדיקת הדפים! ui-test.html מציג הכל במקום אחד
         בדוק: buttons, badges, inputs focus, cards, table headers, modals, toasts

Step 3:  עדכון ui_config של test tenant — palette שני (ירוק נשאר, או palette אחר)
         וידוא ש-theming עדיין עובד — test tenant ≠ default

Step 4:  בדיקה ויזואלית — כל 6 הדפים × 2 tenants × desktop + mobile
         פריזמה = Indigo (default)
         דמו = ירוק (ui_config override)

Step 5:  suppliers-debt.html check — הדף לא עבר migration (styles.css ישן).
         בדוק שלא נשבר ושלא בולט כ"שונה" מהשאר.
         ⚠️ אם יש פער ויזואלי בולט — לדווח, לא לתקן. תיקון = migration scope.

Step 6:  merge ל-main + tag
```

---

## Verification

- [ ] ui-test.html — כל הרכיבים נראים טוב עם Indigo
- [ ] כל 5 הדפים ה-migrated — Indigo חל, נראה אחיד
- [ ] tenant פריזמה = Indigo (default מ-variables.css)
- [ ] tenant דמו = ירוק (override מ-ui_config) — theming עובד
- [ ] suppliers-debt.html — לא נשבר
- [ ] Mobile responsive — אין שבירות
- [ ] RTL — אין שבירות
- [ ] Print — manifest/PDF תקין
- [ ] **אפס console errors על כל 6 הדפים**

---

## שאלות פתוחות — אין

Palette נבחר (Indigo). Semantic colors לא משתנים. Grays — Claude Code יבדוק ויחליט.
אפשר להתחיל.
