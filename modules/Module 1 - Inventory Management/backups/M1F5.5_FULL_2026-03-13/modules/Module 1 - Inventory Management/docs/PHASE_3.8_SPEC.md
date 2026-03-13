# PHASE_3.8_SPEC.md — Sticky Header

**פרויקט:** Optic Up  
**מודול:** Module 1 — Inventory Management  
**פאזה:** 3.8  
**סטטוס:** ⬜ טרם החל  
**תלות:** Phase 3.75 ✅ (tenants table קיים, JWT session קיים)

---

## 1. מטרה

הוספת sticky header מודולרי אחיד לכל המסכים. ה-header מציג את שם החנות + לוגו מטבלת `tenants`, שם העובד המחובר, וכפתור יציאה. כל דף עתידי יקבל את ה-header באמצעות שורת `<script>` אחת.

---

## 2. קבצים חדשים

| קובץ | תיאור |
|---|---|
| `js/header.js` | טוען נתוני tenant, מרנדר header, מזריק ל-DOM |
| `css/header.css` | עיצוב header (RTL, sticky, responsive) |

---

## 3. קבצים משתנים

| קובץ | שינוי |
|---|---|
| `index.html` | הוספת `<script src="js/header.js">` |
| `inventory.html` | הוספת `<script src="js/header.js">` |
| `employees.html` | הוספת `<script src="js/header.js">` |

---

## 4. לוגיקה עסקית

### 4.1 מה ה-header מציג
- **שמאל:** לוגו החנות (מ-`tenants.logo_url`) — אם אין לוגו, מציג placeholder
- **מרכז:** שם החנות (מ-`tenants.name`) + טקסט קבוע "Optic Up"
- **ימין:** שם העובד + תפקיד + כפתור התנתקות

### 4.2 טעינת נתונים
```javascript
async function initHeader() {
  const tenantId = getTenantId(); // מ-shared.js
  const { data } = await sb
    .from('tenants')
    .select('name, logo_url')
    .eq('id', tenantId)
    .single();
  renderHeader(data);
}
```

### 4.3 נתוני עובד
נשלפים מ-`sessionStorage` (כבר קיים מ-auth-service.js):
```javascript
const employee = JSON.parse(sessionStorage.getItem('current_employee'));
```

### 4.4 כפתור התנתקות
קורא ל-`logout()` מ-`auth-service.js` — קיים כבר.

### 4.5 מודולריות
כל דף חדש בעתיד מוסיף רק:
```html
<link rel="stylesheet" href="css/header.css">
<script src="js/header.js"></script>
```
אין צורך לשנות את `header.js` עצמו.

---

## 5. עיצוב

- **גובה:** 60px
- **מיקום:** sticky top (נשאר בראש המסך בגלילה)
- **כיוון:** RTL
- **צבעים:** תואמים ל-design system קיים (CSS variables קיימים)
- **Responsive:** מסתיר שם תפקיד במסכים צרים, שומר שם עובד + כפתור יציאה

---

## 6. DB

אין שינויי DB. טבלת `tenants` קיימת מפאזה 3.75 עם העמודות:
- `id` UUID
- `name` TEXT
- `logo_url` TEXT (nullable)

---

## 7. חוקי ברזל רלוונטיים

- כל פעולה עם Supabase — client גלובלי `sb`
- אין שינויי כמויות, אין `writeLog` — פאזה זו UI בלבד
- גודל קובץ מקסימלי: 350 שורות לקובץ JS

---

## 8. סדר ביצוע (Steps)

| # | משימה | קבצים |
|---|---|---|
| 1 | קריאת קבצים קיימים + SESSION_CONTEXT | — |
| 2 | יצירת `css/header.css` | חדש |
| 3 | יצירת `js/header.js` | חדש |
| 4 | עדכון `index.html` | קיים |
| 5 | עדכון `inventory.html` | קיים |
| 6 | עדכון `employees.html` | קיים |
| 7 | בדיקה על כל 3 המסכים | — |
| 8 | גיבוי + עדכון תיעוד + commit | — |

---

## 9. קריטריוני סיום (Definition of Done)

- [ ] Header מוצג על כל 3 המסכים
- [ ] שם החנות "אופטיקה פריזמה" מוצג (נשלף מ-DB)
- [ ] שם העובד המחובר מוצג
- [ ] כפתור יציאה עובד מכל מסך
- [ ] אין שגיאות console על כל המסכים
- [ ] session עובר בין מסכים (מ-3.75 — לא נשבר)
- [ ] גיבוי בוצע לפני commit: `M1F3.8_YYYY-MM-DD`
- [ ] ROADMAP.md מעודכן: 3.8 ✅
- [ ] SESSION_CONTEXT.md מעודכן

---

## 10. הערות

- אם `logo_url` ריק — מציג אייקון ברירת מחדל (SVG פשוט)
- אם session לא קיים — header לא מרונדר (index.html לפני login)
- Phase 3.8 לא כוללת אפשרות עריכת פרטי tenant — זה Phase עתידי
