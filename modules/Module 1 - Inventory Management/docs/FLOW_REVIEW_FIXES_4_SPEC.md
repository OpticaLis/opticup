# מודול 1 — Flow Review & Fixes Phase 4

> **צ'אט משני חדש.** סיבוב תיקונים ושיפורים חוצה-מסכים.
> **הערכה:** 5-7 ימים
> **Branch:** `develop` — merge to `main` רק בסוף אחרי כל הבדיקות

---

## ⚠️ כללי עבודה קריטיים — קרא לפני הכל

### BYPASS PERMISSIONS

Claude Code רץ במצב `BYPASS PERMISSIONS`. זה אומר שהוא יכול לשנות כל קובץ
בלי אישור. **זה מסוכן.** לכן:

1. **כל פרומפט חייב להיות סופר מדויק.** לא "תתקן את זה" אלא "בקובץ X, בפונקציה Y, שנה את שורה Z מ-A ל-B."
2. **לעולם לא לשנות קבצים שלא צוינו בפרומפט.** אם צריך לשנות 3 קבצים — 3 פרומפטים נפרדים.
3. **לעולם לא למחוק קוד בלי לשאול.** "תוסיף" = בטוח. "תמחק" = לשאול קודם.
4. **backup לפני כל שינוי מבני.** פיצולים, rename, מחיקות — backup קודם.

### Merge Policy

```
כל העבודה על branch develop.
MERGE ל-main רק כשמתקיימים כל אלה:
1. Claude Code עשה את כל הטסטים שלו ✅
2. דניאל בדק ידנית שהכל עובד ✅
3. Zero console errors על כל הדפים ✅
4. Git tag נוצר ✅
```

### סדר עבודה per תיקון

```
1. דניאל מאשר תיקון
2. צ'אט משני כותב פרומפט מדויק
3. דניאל מעתיק ל-Claude Code
4. Claude Code מבצע + commit to develop
5. דניאל בודק בדפדפן
6. תקין → הבא. לא תקין → פרומפט תיקון
```

---

## תיקונים מאורגנים לפי מסך

---

### מסך 1: הזמנות רכש (inventory.html — טאב הזמנות)

| # | תיקון | פירוט |
|---|--------|-------|
| PO-1 | הערה per שורה | כל שורה בהזמנת רכש מקבלת שדה "הערה" — כפתור 💬 קטן שפותח popup/tooltip. שדה `note TEXT` על `purchase_order_items`. מוצג ב-PDF/Excel export. |
| PO-2 | מיון עמודות | בטבלת הפריטים (גם ביצירה וגם בצפייה אחרי שליחה) — לחיצה על כותרת עמודה ממיינת A→Z / Z→A. במיוחד: ברקוד (גבוה למעלה), מותג, דגם. |

---

### מסך 2: ספירת מלאי (inventory.html — טאב ספירה)

| # | תיקון | פירוט |
|---|--------|-------|
| SC-1 | פריט בלי ברקוד → מלאי | בספירה, אם נמצא פריט פיזי שאין לו ברקוד — אפשרות "הוסף למלאי": modal עם brand, model, size, color, qty → barcode auto-generate (BBDDDDD) → פריט נוצר → מופיע בסיכום כ"נוסף" → אפשרות הדפסת ברקוד (מסגרת בצד עד ההדבקה). **הערה:** זה דומה ל-Step 2 מפאזה 7 (unknown items). לבדוק אם כבר בנוי ולהרחיב. |
| SC-2 | עמודות צבע + סוג | הוספת עמודות "צבע" ו"סוג" (שמש/ראייה) לטבלת הספירה. במובייל — להוריד עמודת "סטטוס" (מיותרת, אם הפריט ברשימה = ממתין). |

---

### מסך 3: מעקב חובות ספקים (suppliers-debt.html)

| # | תיקון | פירוט |
|---|--------|-------|
| SD-1 | תיקיות לחשבוניות כלליות | **טבלה חדשה `expense_folders`** — מנהל פיננסים יוצר תיקיות (שכירות, חשמל, מים, תוכנות, וכו'). UI: טאב "תיקיות" או כפתור בהגדרות ב-suppliers-debt.html. CRUD פשוט: שם, אייקון (אופציונלי), is_active. tenant_id + RLS. |
| SD-2 | שיוך חשבוניות לתיקיות | חשבוניות שמגיעות מ"חשבוניות נכנסות" (inventory.html) בלי ספק → מופיעות ב-suppliers-debt בסטטוס "ממתינה לשיוך". מנהל פיננסים משייך לתיקיה. שדה `expense_folder_id UUID REFERENCES expense_folders(id)` על `supplier_documents`. |
| SD-3 | מסך חשבוניות כלליות | מסך/טאב ב-suppliers-debt עם סינונים: תיקיה, תאריך חשבונית, חודש מלא, תאריך העלאה, סטטוס (ממתינה/שולמה/בוטלה). |
| SD-4 | שינוי סוג מסמך | אפשרות למנהל פיננסים לשנות סוג מסמך (תעודת משלוח → חשבונית מס, וכו'). בכרטיס מסמך → כפתור "שנה סוג" → dropdown → PIN → update. writeLog. |
| SD-5 | 🔴 באג: קבלת סחורה לא מעבירה חשבוניות | כשמכניסים מלאי ב"קבלת סחורה" ומעלים חשבוניות — הן לא מופיעות ב"מעקב חובות ספקים". **Debug נדרש:** בדוק `receipt-debt.js` → `createDocumentFromReceipt()` — האם נקרא? האם מצליח? האם supplier_documents נוצר? |

---

### מסך 4: חשבוניות נכנסות (inventory.html — טאב חשבוניות נכנסות)

| # | תיקון | פירוט |
|---|--------|-------|
| IN-1 | שינוי dropdown ספק → סוג | במקום dropdown "ספק" → dropdown "סוג" שמכיל: (א) כל הספקים המוגדרים במערכת (ב) כל התיקיות שהוגדרו ב-SD-1. ככה חשבונית יכולה להיות משוייכת לספק מלאי או לתיקיה כללית. **תווית:** "שייך ל:" (לא "ספק"). |

---

### מסך 5: הכנסת מלאי / קבלת סחורה (inventory.html)

| # | תיקון | פירוט |
|---|--------|-------|
| RC-1 | הערות per קבלה + per שורה | (א) שדה הערות כללי לכל הקבלה (כבר קיים?). (ב) הערה per שורה — כפתור 💬 קטן בכל שורת פריט → popup עם textarea → שמירה ב-`goods_receipt_items.note`. לא תופס מקום בטבלה. |
| RC-2 | מספר מסמכים per קבלה | הזמנת רכש אחת יכולה להגיע עם כמה חשבוניות/תעודות בנפרד. **פתרון:** שדה multi-value למספרי מסמכים. אפשרות א': שדה `document_numbers TEXT[]` (array). אפשרות ב': טבלת linkage `receipt_documents(receipt_id, document_number, document_type)`. הצ'אט המשני יבחר את הפשוט יותר. כל מסמך → supplier_document נפרד ב-debt module. |
| RC-3 | עריכת פרטי מסגרת בקבלה | אפשרות לשנות פרטים (דגם, גודל, צבע) של פריט בזמן קבלת סחורה. למשל: דגם BV50008I נרשם עם U במקום i. כפתור ✏️ per שורה → modal עריכה → save → writeLog. |
| RC-4 | מיון עמודות | לחיצה על כותרת עמודה בטבלת פריטי הקבלה (גם ביצירה וגם בצפייה) → מיון A→Z / Z→A. ברקוד, מותג, דגם. |

---

### מסך 6: תמונות

| # | תיקון | פירוט |
|---|--------|-------|
| IMG-1 | 🔴 באג: תמונה לא מופיעה אחרי צילום | אחרי צילום + אישור — תמונה לא מוצגת. צריך לצלם שוב (לפעמים פעמיים). **כנראה:** race condition בין upload completion ל-preview render. ה-URL עדיין לא זמין כשהתצוגה מנסה להציג. **פתרון:** await upload → await signed URL → רק אז הצג. הוסף retry logic עם delay. |
| IMG-2 | כפתור "הבא" בחלון תמונות | בחלון תמונות — כפתור [◀ הבא] שמעביר לפריט הבא לפי סדר ברקוד. לא צריך לצאת ולהיכנס מחדש. **גם [הקודם ▶]** לכיוון ההפוך. ה-modal נשאר פתוח, התוכן מתחלף. |
| IMG-3 | הצגת דגם + צבע בחלון תמונות | בכותרת חלון התמונות — להציג: "Ray-Ban RB5154 — שחור" (לא רק שם דגם). מונע בלבול בין צבעים של אותו דגם. |
| IMG-4 | צילום בזמן קבלת סחורה | בכל שורה בקבלת סחורה — כפתור 📷 שפותח את modal התמונות. ככה מצלמים לפני הדבקת ברקוד. אותו component כמו בטבלה הראשית. |

---

### מסך 7: טבלת מלאי ראשית (inventory.html — טאב מלאי)

| # | תיקון | פירוט |
|---|--------|-------|
| INV-1 | כפתור "⋯ עוד" — bulk edit | בחירת מספר שורות → כפתור "עריכה קבוצתית" → modal: בחר שדה (סוג שמש/ראייה, מחיר מכירה, ספק, וכו') → הזן ערך → apply על כל השורות שנבחרו. PIN נדרש. writeLog per שורה. |
| INV-2 | ייצוא ברקודים — מחיר מכירה | לוודא שעמודת המחיר ב-Excel היא **מחיר מכירה** (sell_price) ולא מחיר עלות (cost_price). אם שניהם מוצגים — לסמן בבירור. |
| INV-3 | עמודות עם רוחב משתנה | drag על גבול עמודה → שינוי רוחב. **נשמר per user** ב-sessionStorage (לא DB — לא משנה לכל המשתמשים). אם אין הגדרה שמורה → רוחב ברירת מחדל. |
| INV-4 | 🔴 באג: מסגרות בלי מותג | מסגרות נכנסו למלאי בלי מותג (כנראה דרך קבלת סחורה כשהמותג לא היה מוגדר). **שני תיקונים:** (א) אפשרות לעדכן מותג על שורה קיימת — כפתור ✏️ על עמודת מותג → dropdown מותגים → save. (ב) חסימה — validation: אי אפשר להכניס מסגרת למלאי בלי brand_id. בכל נקודת כניסה: הכנסה ידנית, קבלת סחורה, ספירת מלאי. |
| INV-5 | מיון עמודות | לחיצה על כותרת עמודה → מיון A→Z / Z→A. כל עמודה. חץ indicator (▲/▼). **גם ב:** טבלת PO (יצירה + צפייה), טבלת קבלת סחורה (יצירה + צפייה), טבלת ספירת מלאי. |

---

## שינויי DB

```sql
-- PO-1: הערה per שורה ב-PO
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS note TEXT;

-- RC-1: הערה per שורה בקבלה
ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS note TEXT;

-- SD-1: תיקיות לחשבוניות כלליות
CREATE TABLE expense_folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  icon            TEXT,                    -- emoji or icon name
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE expense_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON expense_folders FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON expense_folders FOR ALL TO service_role USING (true);

CREATE INDEX idx_expense_folders_tenant ON expense_folders(tenant_id);

-- SD-2: שיוך מסמך לתיקיה
ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS expense_folder_id UUID REFERENCES expense_folders(id);

CREATE INDEX idx_supdocs_folder ON supplier_documents(tenant_id, expense_folder_id)
  WHERE expense_folder_id IS NOT NULL;

-- RC-2: מספר מסמכים per קבלה (הצ'אט המשני יבחר approach)
-- Option A: TEXT[] on goods_receipts
-- Option B: junction table
-- Decision deferred to secondary chat
```

---

## סדר ביצוע מומלץ

```
Phase 4a — קריאת מצב + תכנון:
  SESSION_CONTEXT + CLAUDE.md + MODULE_SPEC
  grep: כל הקבצים שנוגעים לתיקונים
  דיווח ממצאים → דניאל מאשר סדר

Phase 4b — באגים קריטיים (קודם לכל):
  SD-5: קבלת סחורה לא מעבירה חשבוניות (debug)
  INV-4: מסגרות בלי מותג (fix + חסימה)
  IMG-1: תמונה לא מופיעה אחרי צילום (race condition)

Phase 4c — הזמנות רכש:
  PO-1: הערה per שורה
  PO-2: מיון עמודות

Phase 4d — ספירת מלאי:
  SC-1: פריט בלי ברקוד → מלאי
  SC-2: עמודות צבע + סוג

Phase 4e — מעקב חובות + חשבוניות נכנסות:
  SD-1: טבלת expense_folders + UI
  SD-2: שיוך חשבוניות לתיקיות
  SD-3: מסך חשבוניות כלליות עם סינונים
  SD-4: שינוי סוג מסמך
  IN-1: dropdown סוג במקום ספק

Phase 4f — קבלת סחורה:
  RC-1: הערות per קבלה + per שורה
  RC-2: מספר מסמכים per קבלה
  RC-3: עריכת פרטי מסגרת
  RC-4: מיון עמודות

Phase 4g — תמונות:
  IMG-2: כפתור "הבא" / "הקודם"
  IMG-3: דגם + צבע בכותרת
  IMG-4: צילום בקבלת סחורה

Phase 4h — טבלת מלאי:
  INV-1: bulk edit
  INV-2: ייצוא ברקודים — מחיר מכירה
  INV-3: רוחב עמודות variable
  INV-5: מיון עמודות (כל הטבלאות)

Phase 4i — QA + Regression:
  Claude Code: בדיקה אוטומטית על כל הדפים
  דניאל: בדיקה ידנית
  Zero console errors
  כל פלואו עובד end-to-end

Phase 4j — Merge + Tag:
  merge develop → main
  tag: v1-flow-review-4-complete
  SESSION_CONTEXT, CHANGELOG, MODULE_MAP, db-schema
```

---

## Verification Checklist

### באגים:
- [ ] SD-5: קבלת סחורה → חשבונית מופיעה ב-suppliers-debt
- [ ] INV-4a: אפשר לעדכן מותג על שורה קיימת
- [ ] INV-4b: אי אפשר להכניס מסגרת בלי מותג (כל נקודות הכניסה)
- [ ] IMG-1: צילום → תמונה מופיעה מיד (בלי retry ידני)

### הזמנות רכש:
- [ ] PO-1: הערה per שורה — שמירה, הצגה ב-PDF, הצגה ב-Excel
- [ ] PO-2: מיון עמודות — ברקוד, מותג, דגם

### ספירת מלאי:
- [ ] SC-1: פריט בלי ברקוד → הוסף → barcode → מופיע בסיכום
- [ ] SC-2: צבע + סוג מוצגים, סטטוס מוסתר במובייל

### מעקב חובות:
- [ ] SD-1: יצירת תיקיה + עריכה + מחיקה
- [ ] SD-2: שיוך חשבונית לתיקיה
- [ ] SD-3: סינון לפי תיקיה, תאריך, חודש, סטטוס
- [ ] SD-4: שינוי סוג מסמך + writeLog
- [ ] IN-1: dropdown "שייך ל:" עם ספקים + תיקיות

### קבלת סחורה:
- [ ] RC-1: הערה כללית + הערה per שורה
- [ ] RC-2: מספר מסמכים — כל אחד → supplier_document נפרד
- [ ] RC-3: עריכת פרטי מסגרת + writeLog
- [ ] RC-4: מיון עמודות

### תמונות:
- [ ] IMG-2: הבא/הקודם עובד — modal נשאר פתוח
- [ ] IMG-3: דגם + צבע בכותרת
- [ ] IMG-4: כפתור 📷 בשורת קבלת סחורה

### טבלת מלאי:
- [ ] INV-1: bulk edit — בחירה מרובה → שינוי שדה → apply
- [ ] INV-2: ייצוא — מחיר מכירה (לא עלות)
- [ ] INV-3: drag רוחב עמודות → נשמר per user
- [ ] INV-5: מיון עמודות בכל הטבלאות (inventory, PO, receipt, count)

### כללי:
- [ ] Zero console errors — כל 6 דפים
- [ ] Mobile — כל השינויים עובדים בטלפון
- [ ] tenant isolation — אין בלבול בין tenants
- [ ] writeLog — כל שינוי מתועד

---

## מה לא נכנס

| פיצ'ר | למה | מתי |
|--------|------|-----|
| OCR verification על קבלות PO | Phase 5 כבר טיפל | בדיקה בלבד |
| Generic next_sequence_number() | מודול 2 | מודול 2 |
| SELECT MAX audit | לא דחוף | מודול 2 |
| PIN unification | refactor גדול | עתידי |
| "לבירור" status | לא הוחלט | עתידי |
| Cascading dropdowns בקבלה ידנית | scope creep | עתידי |
| Theme color customization | מודול 2 | מודול 2 |
