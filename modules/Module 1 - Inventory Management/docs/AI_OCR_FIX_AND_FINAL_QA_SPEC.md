# מודול 1 — AI OCR Fix + Final QA

> **שני יעדים:** (1) תיקון מקיף של AI/OCR בקבלת סחורה (2) QA סופי ברמת צוות מקצועי
> **Branch:** `develop` — merge ל-main רק בסוף אחרי כל הבדיקות
> **הערכה:** 3-5 ימים

---

## ⚠️ כללי עבודה — BYPASS PERMISSIONS

```
1. פרומפטים סופר מדויקים — קובץ, פונקציה, שורה
2. לא לשנות קבצים שלא צוינו
3. לא למחוק קוד בלי לשאול
4. backup לפני כל שינוי מבני
5. commit אחרי כל שלב — לא batch של 10 שינויים
6. merge ל-main רק כש:
   - Claude Code עשה טסטים ✅
   - דניאל בדק ידנית ✅
   - Zero console errors ✅
   - Tag נוצר ✅
```

---

## חלק א' — AI/OCR Fix

### 1.1 המצב הנוכחי — מה עובד ומה לא

**עובד:**
- סריקת שלב 1 (פרטי חשבונית): שם ספק, מספר מסמך, סוג מסמך — AI מזהה
- התראה על PO קיים לספק — עובד
- סריקה בלי PO — AI מוציא פריטים (אבל על טבלה שונה מהמקורית)

**לא עובד:**
- סריקת שלב 2 (השוואה PO ↔ חשבונית): AI comparison highlighting לא מהימן
- פריטים שה-AI מוציא מוצגים בטבלה שונה מהטבלה המקורית
- למידה מתיקונים — לא ברור אם עובד

### 1.2 הגישה — למידה הדרגתית

**העיקרון שדניאל הגדיר:**

```
שלב 1 — למידה:
  בפעמים הראשונות העובד מכניס מלאי לבד לגמרי (ידנית)
  AI צופה ולומד per supplier:
  - מבנה החשבונית
  - שמות שדות
  - פורמט מחירים (כולל/לא כולל מע"מ)
  - סדר עמודות

שלב 2 — הצעה:
  אחרי שה-AI למד מספיק על ספק מסוים (X חשבוניות)
  → מציע: "זיהיתי את הפריטים — רוצה שאמלא?"
  → עובד מאשר / מתקן → AI לומד עוד

שלב 3 — אוטומטי:
  אחרי accuracy מספיקה (configurable threshold)
  → AI ממלא אוטומטית
  → עובד רק מאשר
```

**מסך למידה:**
צריך מסך/טאב שמראה per supplier:
- כמה חשבוניות AI עיבד
- accuracy rate
- סטטוס: "לומד" / "מוכן להצעות" / "אוטומטי"

### 1.3 שלושת התרחישים של OCR בקבלת סחורה

**תרחיש A — יש PO, AI סורק חשבונית:**

```
שלב 1:
  Upload חשבונית → AI מזהה: ספק, מספר, סוג מסמך
  → ספק auto-select ב-dropdown
  → מספר מסמך auto-fill
  → אם יש PO פתוח לספק → "נמצאה הזמנה PO-15-0042, לקשר?"
  → עובד מאשר → פריטי PO נטענים לטבלה

שלב 2 (השוואה):
  → AI סורק את החשבונית שוב (או משתמש בסריקה הקודמת)
  → משווה פריטי חשבונית ↔ פריטי PO
  → פריטים תואמים = ✅ (לא מסמן)
  → פריטים לא תואמים = ⚠️ צהוב (highlight על השורה)
  → פריטים בחשבונית שלא ב-PO = 🔴 (שורה חדשה עם סימון)
  → פריטים ב-PO שלא בחשבונית = ⚠️ "לא הגיע"
  → עובד מחליט per item: אשר / דלג / תקן
```

**הבעיה הנוכחית:** ה-highlighting לא עובד מהימן. הצ'אט המשני צריך לאבחן למה.

**תרחיש B — אין PO, AI סורק חשבונית:**

```
Upload חשבונית → AI מזהה ספק + מספר
→ אין PO מתאים
→ AI מחלץ פריטים מהחשבונית ושם אותם בטבלה
```

**הבעיה הנוכחית:** הפריטים מוצגים בטבלה שונה מהמקורית. צריך שיהיו באותה טבלה בדיוק — כך שהעובד יכול לתקן (edit inline) וה-AI ילמד מהתיקונים.

**תרחיש C — ידני (בלי AI):**

```
עובד מזין הכל ידנית — אותו פלואו שעובד היום.
אפס שינוי. חייב להמשיך לעבוד.
```

### 1.4 מה הצ'אט המשני צריך לעשות

```
Step 1 — אבחון:
  1. קרא את receipt-ocr.js, receipt-ocr-review.js, receipt-po-compare.js
  2. קרא את ai-ocr.js, supabase-alerts-ocr.js
  3. תעד: מה כל פונקציה עושה, מה קורא למה
  4. שחזר את 3 התרחישים בדפדפן (Chrome)
  5. תעד: מה עובד, מה לא, איפה הכשל

Step 2 — תכנון:
  הצג לדניאל:
  - "הבעיה ב-תרחיש A היא: [X]. הפתרון: [Y]."
  - "הבעיה ב-תרחיש B היא: [X]. הפתרון: [Y]."
  - דניאל מאשר → ממשיך

Step 3 — תיקון תרחיש A (PO + חשבונית):
  - AI comparison שעובד מהימן
  - Highlighting על השורות הנכונות (צהוב לאי-התאמה)
  - UI ברור: ✅ תואם / ⚠️ לא תואם / 🔴 לא בהזמנה / ⚠️ לא הגיע

Step 4 — תיקון תרחיש B (בלי PO):
  - פריטים מוצגים באותה טבלה כמו פריטים ידניים
  - edit inline עובד (עובד מתקן → AI לומד)
  - שדות: brand, model, size, color, qty, price — כולם editable

Step 5 — למידה:
  - וודא שתיקוני עובד נשמרים ב-supplier_ocr_templates
  - וודא שסריקה שנייה מאותו ספק משתפרת
  - הוסף: מסך/section שמראה per supplier: accuracy + status

Step 6 — Regression:
  - תרחיש A עובד end-to-end
  - תרחיש B עובד end-to-end
  - תרחיש C (ידני) לא נשבר
  - כל 3 ← confirm → מלאי מתעדכן + מסמך ספק נוצר + חוב מתעדכן
```

### 1.5 חשוב — קוד נקי

```
- לא monkey-patching. לא "wrapper שעוטף wrapper שעוטף wrapper."
- אם הקוד הנוכחי מסובך מדי → שכתב את הפונקציה מחדש (נקי)
- אם קובץ מעל 350 שורות → פצל קודם
- goods-receipt.js ב-360 שורות → חייב פיצול לפני שינויים
- כל פונקציה = דבר אחד. אם צריך "and" לתאר מה היא עושה → שתי פונקציות.
```

---

## חלק ב' — QA סופי

### 2.1 מתודולוגיה

**אחרי שה-AI תוקן — QA מקיף על כל המודול.**

הצ'אט המשני פועל כצוות בודקי תוכנה מנוסה:
1. **Functional testing** — כל כפתור, כל שדה, כל dropdown
2. **Flow testing** — כל פלואו end-to-end
3. **Edge cases** — מה קורה בקצוות
4. **Security audit** — פירצות, XSS, tenant isolation
5. **Code review** — קוד נקי, אין dead code, אין duplications

### 2.2 בדיקות פונקציונליות — per מסך

**index.html (מסך בית):**
- [ ] Login / logout / session restore
- [ ] כל כרטיסי מודולים פעילים ומפנים נכון
- [ ] Header: שם חנות + לוגו

**inventory.html — מלאי ראשי:**
- [ ] טבלה נטענת, pagination, search, sort
- [ ] כפתור "⋯ עוד" עובד (תמונות, עריכה, היסטוריה, מחיקה, זיכוי)
- [ ] Bulk edit — בחירה מרובה + שינוי שדה
- [ ] Soft delete + restore
- [ ] ייצוא Excel + ברקודים (מחיר מכירה!)
- [ ] עמודות resizable + sort

**inventory.html — הכנסת מלאי:**
- [ ] הכנסה ידנית (cascading dropdowns)
- [ ] Excel import
- [ ] ברקוד auto-generate
- [ ] תמונות: צילום + העלאה + תצוגה מקדימה + הבא/הקודם
- [ ] brand_id חובה (validation)

**inventory.html — הזמנות רכש:**
- [ ] יצירת PO (wizard)
- [ ] הערה per שורה
- [ ] מיון עמודות
- [ ] PDF + Excel export
- [ ] שכפול PO
- [ ] ביטול PO / ביטול שורה

**inventory.html — קבלת סחורה:**
- [ ] קבלה עם PO (כל הסטטוסים: תואם, חוסר, פער מחיר, לא בהזמנה)
- [ ] קבלה בלי PO
- [ ] OCR: תרחיש A (עם PO) — AI comparison עובד
- [ ] OCR: תרחיש B (בלי PO) — AI מוציא פריטים לטבלה הנכונה
- [ ] תרחיש C (ידני) — עובד כמו תמיד
- [ ] מסמך מצורף חובה
- [ ] ברקודים חובה
- [ ] הערות per קבלה + per שורה
- [ ] מספר מסמכים per קבלה
- [ ] עריכת פרטי מסגרת
- [ ] Confirm → מלאי + מסמך ספק + חוב

**inventory.html — ספירת מלאי:**
- [ ] יצירת ספירה, סריקה, pause/resume
- [ ] Unknown → הוסף למלאי (עם/בלי ברקוד)
- [ ] Approve/skip per item + reason
- [ ] Atomic delta (שינוי כמות בזמן ספירה → delta נכון)
- [ ] צפייה בספירות סגורות
- [ ] עמודות צבע + סוג

**inventory.html — חשבוניות נכנסות:**
- [ ] Upload חשבונית + שיוך לספק או תיקיה
- [ ] חשבוניות עוברות ל-suppliers-debt

**inventory.html — זיכויים:**
- [ ] יצירת זיכוי → מלאי יורד → supplier_return
- [ ] Staged → ארגז → shipped (אוטומטי)
- [ ] Credit received → חוב קטן

**suppliers-debt.html:**
- [ ] דשבורד: כרטיסים + aging
- [ ] מסמכים: CRUD, סינון, OCR, עריכה, ביטול
- [ ] תשלומים: wizard, FIFO, withholding, bulk
- [ ] מקדמות: עסקאות, צ'קים, קיזוז
- [ ] כרטיס ספק: timeline, sub-tabs, opening balance
- [ ] תיקיות: CRUD, שיוך חשבוניות, סינון
- [ ] שינוי סוג מסמך
- [ ] AI learning dashboard (accuracy per supplier)

**shipments.html:**
- [ ] 4 סוגי ארגזים
- [ ] Wizard + staged picker
- [ ] חלון עריכה + auto-lock
- [ ] Manifest
- [ ] Courier management

**employees.html:**
- [ ] CRUD עובדים
- [ ] Roles + permissions matrix
- [ ] PIN management

**settings.html:**
- [ ] הגדרות עסק / פיננסי / תצוגה
- [ ] Logo upload
- [ ] Shipment config (JSONB)

### 2.3 בדיקות end-to-end flows

```
Flow A: PO → קבלה עם AI → חוב → תשלום
Flow B: קבלה בלי PO עם AI → חוב → תשלום
Flow C: קבלה ידנית → חוב → תשלום
Flow D: תעודות משלוח → חשבונית חודשית → קישור → תשלום
Flow E: זיכוי → ארגז → shipped → credit note
Flow F: ספירת מלאי → unknown items → approve/skip
Flow G: חשבונית נכנסת (בלי ספק) → תיקיה → תשלום
Flow H: PO → קבלה חלקית → PO partial → קבלה שנייה → PO received
```

### 2.4 Security Audit

```
SEC-1:  JWT validation — כל דף בודק JWT לפני טעינת נתונים
SEC-2:  Tenant isolation — grep כל query שחסר tenant_id filter
SEC-3:  XSS — grep כל innerHTML עם user input
SEC-4:  PIN brute force — lockout עובד
SEC-5:  RLS — כל טבלה חדשה (expense_folders) עם policy
SEC-6:  Storage — signed URLs only, no public access
SEC-7:  Edge Function — validates JWT, rejects expired
SEC-8:  Console — no secrets, no API keys
SEC-9:  Session — expiry works, clear on logout
SEC-10: CORS — no wildcard origins
```

### 2.5 Code Review

```
CODE-1:  כל קבצים ≤ 350 שורות
CODE-2:  אין dead code (functions שלא נקראות)
CODE-3:  אין duplicate code (אותה לוגיקה בשני מקומות)
CODE-4:  אין monkey-patching / wrapper chains
CODE-5:  כל event listener עם cleanup
CODE-6:  כל async function עם try/catch
CODE-7:  כל DB query עם tenant_id
CODE-8:  כל mutation עם writeLog
CODE-9:  כל PIN operation עם verifyPin
CODE-10: FIELD_MAP מעודכן לכל שדות חדשים
```

### 2.6 פורמט דיווח

```
BUG-{num}: {title}
Severity: 🔴 Critical / 🟡 Medium / 🟢 Low
Page: {page}
Steps: 1. ... 2. ... 3. ...
Fix: {what was done}
Status: ✅ Fixed / ⏳ Pending
```

---

## סדר ביצוע

```
Step 1 — אבחון AI:
  קרא קוד → שחזר 3 תרחישים → תעד בעיות → דווח

Step 2 — תיקון AI (אחרי אישור דניאל):
  תרחיש A: PO + חשבונית + comparison
  תרחיש B: בלי PO + פריטים לטבלה נכונה
  למידה: accuracy tracking per supplier
  Regression: תרחיש C (ידני) לא נשבר

Step 3 — פיצול קבצים:
  goods-receipt.js (360→ שניים)
  + כל קובץ מעל 350

Step 4 — QA Functional:
  כל מסך, כל כפתור, כל שדה (2.2)

Step 5 — QA Flows:
  8 flows end-to-end (2.3)

Step 6 — Security Audit:
  10 בדיקות (2.4)

Step 7 — Code Review:
  10 בדיקות (2.5)

Step 8 — Fix all findings:
  🔴 קודם → 🟡 → 🟢

Step 9 — Regression:
  re-run Steps 4-7

Step 10 — Merge + Tag:
  develop → main
  tag: v1-ai-fix-qa-complete
  Documentation update
```

---

## Exit Criteria

```
- [ ] AI תרחיש A (PO + חשבונית) — comparison highlighting עובד מהימן
- [ ] AI תרחיש B (בלי PO) — פריטים בטבלה המקורית, editable
- [ ] AI תרחיש C (ידני) — לא נשבר
- [ ] AI למידה — accuracy per supplier מוצג
- [ ] כל 8 flows עוברים end-to-end
- [ ] Zero console errors — כל 6 דפים
- [ ] Security: 10/10 checks pass
- [ ] Code: כל קבצים ≤ 350 שורות
- [ ] Code: אין dead code / duplications
- [ ] Tenant isolation: verified
- [ ] Mobile: key flows work
- [ ] Documentation: current
```
