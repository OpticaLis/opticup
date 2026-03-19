# מודול 1 — פאזה 7: שיפורי ספירת מלאי (מעודכן)

> **פאזה השלמה.** מודול 1 הושלם (פאזות 0-5.9 + QA + מודול 1.5). פאזה 7 היא תוספת —
> שדרוג ה-flow של ספירת מלאי לרמת production שבועית.
> **זמן משוער: 3-4 ימים.**
> **Shared components:** Modal.form, Toast, DB.*, ActivityLog, TableBuilder — קיימים ב-shared/js/ ו-shared/css/. API מלא ב-docs/GLOBAL_MAP.md.

---

## רקע

ספירת מלאי עובדת ב-production. האופטיקה משתמשת בה. אבל יש 4 חוסרים שמונעים ספירה שבועית חלקה:

1. **אטומיות** — RPC עושה `SET quantity = new_qty` במקום delta. סיכון race condition.
2. **עודפים** — פריטים לא ידועים שנמצאים בספירה, אין דרך להוסיף למלאי.
3. **אישור חלקי** — הכל או כלום. 3 פריטים מוזרים חוסמים 497 תקינים.
4. **צפייה בספירות סגורות** — כפתור "צפייה" מציג toast "בקרוב". אין מסך.

## מה הפאזה עושה

5 steps + QA. כל step עצמאי — אפשר לעצור אחרי כל אחד ויש ערך.

## מה לא נכנס

- ❌ OCR בקבלת סחורה — פאזה 8 נפרדת אם צריך
- ❌ ספירה מהירה / flow נפרד — פילטרים ריקים = כל המלאי
- ❌ יצירת מותג חדש תוך כדי ספירה — scope creep
- ❌ סיכום כספי מפורט — toast מספיק
- ❌ טאבים מפוצלים בצפייה — פילטר סטטוס מספיק
- ❌ השוואה בין ספירות — future enhancement, מתועד

---

### Step 0 — פיצול stock-count-session.js

**המצב:** 871 שורות — 2.5x מעל המגבלה.
**הפעולה:** פיצול ל-`stock-count-session.js` + `stock-count-camera.js`.
**כלל ברזל:** אפס שינויי לוגיקה. copy-paste + split imports. הכל חייב לעבוד בדיוק כמו קודם.

**Verification:**
- [ ] שני הקבצים מתחת ל-450 שורות
- [ ] סריקת מצלמה עובדת
- [ ] חיפוש ידני עובד
- [ ] pause/resume עובד
- [ ] כל פילטרים עובדים

---

### Step 1 — Atomic Delta RPC

**המצב:** `set_inventory_qty` עושה `UPDATE inventory SET quantity = $new_qty`.
**הבעיה:** מכירה או קבלת סחורה שקורות בין תחילת ספירה לאישור — נדרסות.

**למה delta מתחילת ספירה לא עובד:**

| תרחיש | תחילה | שינוי בזמן ספירה | DB ברגע אישור | נספר | delta מתחילה | תוצאה | נכון? |
|--------|--------|-------------------|---------------|------|-------------|-------|-------|
| מכירה | 5 | Access מוכר 1 | 4 | 4 | 4-5=-1 → 4+(-1)=3 | ❌ | צריך 4 |
| קבלה | 5 | קבלת סחורה +3 | 8 | 8 | 8-5=+3 → 8+3=11 | ❌ | צריך 8 |
| גניבה+מכירה | 5 | Access מוכר 1 | 4 | 2 | 2-5=-3 → 4+(-3)=1 | ❌ | צריך 2 |
| שלילי | 5 | Access מוכר 4 | 1 | 2 | 2-5=-3 → 1+(-3)=-2 | ❌💀 | צריך 2 |

**הפתרון:** ה-RPC מקבל `counted_qty`, קורא current בעצמו עם FOR UPDATE lock, מחשב delta בתוך הטרנזקציה.

```sql
CREATE OR REPLACE FUNCTION apply_stock_count_delta(
  p_inventory_id UUID,
  p_counted_qty INTEGER,
  p_tenant_id UUID,
  p_user_id UUID,
  p_count_id UUID
) RETURNS JSON AS $$
DECLARE
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Lock the row and read current quantity atomically
  SELECT quantity INTO v_current_qty
  FROM inventory
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  -- Calculate delta from CURRENT state, not start-of-count state
  v_delta := p_counted_qty - v_current_qty;
  v_new_qty := v_current_qty + v_delta;  -- = p_counted_qty

  -- Guard against negative
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot go below zero (item: %, counted: %, current: %)',
      p_inventory_id, p_counted_qty, v_current_qty;
  END IF;

  -- Apply
  UPDATE inventory SET quantity = v_new_qty
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id;

  RETURN json_build_object(
    'previous_qty', v_current_qty,
    'counted_qty', p_counted_qty,
    'delta', v_delta,
    'new_qty', v_new_qty
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**בקוד:** `confirmCount()` שולח `counted_qty` ל-RPC, לא delta.

**בדוח הספירה — שתי עמודות:**
- "צפוי (תחילת ספירה)" — מה המערכת חשבה כשהספירה התחילה
- "נוכחי (ברגע אישור)" — מה הכמות האמיתית ב-DB ברגע האישור
- אם יש הבדל → הערה קטנה "שינויים בזמן הספירה" כדי שהמנהל יבין

**Race condition ידוע שלא נפתר:** Watcher שמאחר — מכירה קורה ב-Access, Watcher עדיין לא עיבד, ספירה מאושרת, ואז Watcher מוריד שוב. זה לא נפתר בלי הקפאת מלאי. הספירה השבועית הבאה תתקן. מקובל.

**Verification:**
- [ ] ספירה עם 5 פריטים — כולם מתעדכנים נכון
- [ ] סימולציה: שנה כמות ידנית ב-DB בין ספירה לאישור — delta נכון מנוכחי
- [ ] סימולציה: כמות ב-DB ירדה ל-1, נספר 2 — תוצאה 2 (לא שלילי)
- [ ] סימולציה: כמות ב-DB עלתה (קבלה) — אין הכפלה
- [ ] RPC מוגדר SECURITY DEFINER
- [ ] writeLog מתעד previous_qty + counted_qty + delta
- [ ] דוח מציג "צפוי" + "נוכחי" זה ליד זה

---

### Step 2 — עודפים (פריטים לא ידועים → מלאי)

**המצב:** פריטים עם status='unknown' מוצגים בדוח אבל מתעלמים באישור.
**הפתרון:** בדוח הסיום, לכל פריט unknown:
- כפתור "ערוך" — פותח modal עם שדות חובה
- כפתור "הוסף למלאי" — יוצר שורה ב-inventory
- ולידציה: brand_id (dropdown מותגים קיימים), model, quantity חובה

**שני מסלולי ברקוד:**

| מצב | ברקוד | UI |
|------|--------|-----|
| פריט נסרק אבל לא נמצא ב-DB | ברקוד מהסריקה | readonly — מוצג אבל לא ניתן לשינוי |
| פריט נספר ידנית בלי ברקוד | אין ברקוד | auto-generate ברקוד חדש (BBDDDDD) כמו בהכנסת מלאי |

**שדות ב-modal:**

| שדה | חובה | סוג | מקור |
|-----|------|-----|------|
| barcode | ✅ | text (readonly או auto-gen) | מסריקה או חדש |
| brand_id | ✅ | select | dropdown מותגים קיימים |
| model | ✅ | text | ידני |
| quantity | ✅ | number (readonly) | מהספירה |
| cost_price | רצוי | number | ידני |
| sell_price | רצוי | number | ידני |
| supplier_id | רצוי | select | dropdown ספקים |
| size | רצוי | text | ידני |
| color | רצוי | text | ידני |

**Flow:**
1. מנהל לוחץ "ערוך" על פריט unknown
2. Modal.form() נפתח עם השדות
3. אם אין ברקוד → auto-generate מוצג (ניתן לאישור)
4. מנהל ממלא → לוחץ "הוסף למלאי"
5. ולידציה: brand_id + model חובה
6. DB.insert('inventory', {...}) עם tenant_id
7. ActivityLog.write({ action: 'inventory.create_from_count', ... })
8. writeLog עם reason="נמצא בספירת מלאי", source_ref=מספר ספירה
9. פריט ב-stock_count_items מתעדכן: status='matched', inventory_id=החדש

**brand_id חייב מותג קיים.** אם מותג לא קיים — המנהל יוצר אותו קודם בניהול מותגים, חוזר לדוח.

**Verification:**
- [ ] פריט unknown עם ברקוד מסריקה → ברקוד readonly ב-modal
- [ ] פריט unknown בלי ברקוד → ברקוד auto-generated
- [ ] מלא שדות → הוסף → מופיע ב-inventory
- [ ] ולידציה: בלי brand_id → שגיאה
- [ ] writeLog מתעד נכון
- [ ] ActivityLog מתעד נכון
- [ ] פריט ב-stock_count_items מתעדכן ל-matched

---

### Step 3 — Reason + אישור חלקי

**Reason per discrepancy:**
- שדה `reason TEXT` חדש על `stock_count_items` (nullable)
- בדוח הסיום, לכל פריט עם פער (counted ≠ expected) — שדה טקסט אופציונלי
- לא חובה — אפשר להשאיר ריק
- דוגמאות: "נגנב", "נשבר", "טעות קליטה", "לא נמצא"

**אישור חלקי — approve/skip per item:**
- כל פריט בדוח מקבל checkbox או toggle: "אשר" / "דלג"
- ברירת מחדל: כולם מסומנים לאישור
- פריטים שנדלגו: status='skipped' — לא משנים מלאי
- כפתורי עזר: "סמן הכל", "בטל סימון", "סמן רק פערים"

**פריטים skipped — מה קורה איתם:**
נשארים "תלויים". אין מנגנון "חזרה לספירה סגורה". בספירה השבועית הבאה הם יופיעו שוב עם פער, והמנהל יטפל. פשוט ומספיק.

**Flow מעודכן של אישור:**
1. מנהל רואה דוח סיום
2. מסמן/מוריד סימון per item
3. ממלא reason (אופציונלי) על פריטים עם פער
4. PIN מנהל
5. רק פריטים מסומנים מתעדכנים (apply_stock_count_delta RPC עם counted_qty)
6. פריטים שנדלגו = status='skipped'
7. Toast סיכום: "עודכנו X, נוספו Y, נדלגו Z"

**Verification:**
- [ ] אישור 10 מתוך 15 — רק 10 מתעדכנים
- [ ] 5 שנדלגו = status='skipped', מלאי לא משתנה
- [ ] reason נשמר ב-DB
- [ ] reason ריק = מותר
- [ ] toast סיכום מציג מספרים נכונים

---

### Step 4 — צפייה בספירות סגורות

**המצב:** כפתור "צפייה" = toast "בקרוב".
**הפתרון:** מסך read-only שמציג ספירה שהושלמה.

**מה מוצג:**
- כותרת: מספר ספירה, תאריך, מי אישר
- פילטר סטטוס: הכל / התאמות / חוסרים / עודפים / נדלגו
- טבלה: ברקוד, מותג, דגם, כמות צפויה (תחילת ספירה), כמות נוכחית (רגע אישור), כמות נספרה, פער, reason, סטטוס
- שורת סיכום: סה"כ פריטים, עודכנו, נוספו, נדלגו
- כפתור ייצוא Excel

**UI:** modal או slide-in panel (לא דף חדש). TableBuilder אם מתאים.

**Future enhancement (מתועד, לא עכשיו):** השוואה בין ספירות — "בשבוע שעבר 3 חוסרים, השבוע 7."

**Verification:**
- [ ] ספירה סגורה → לחיצה "צפייה" → נפתח מסך read-only
- [ ] פילטרים עובדים
- [ ] עמודת "צפוי" + "נוכחי" מוצגות זו ליד זו
- [ ] Excel export כולל כל העמודות + reason
- [ ] אין אפשרות עריכה — read-only מוחלט

---

### QA — Regression

**בדיקות:**
1. **Full flow:** יצירת ספירה → סריקה → unknown items → אישור חלקי → צפייה
2. **Atomic delta:** שינוי כמות בין ספירה לאישור — delta מנוכחי, לא מתחילת ספירה
3. **קבלת סחורה תוך ספירה:** +3 פריטים → ספירה מאשרת → אין הכפלה
4. **מכירה תוך ספירה:** Access מוכר 2 → ספירה מאשרת → תוצאה נכונה
5. **עודפים עם ברקוד:** unknown נסרק → readonly ברקוד → הוספה → inventory
6. **עודפים בלי ברקוד:** unknown ידני → auto-generate → הוספה → inventory
7. **Skip:** פריט שנדלג → מלאי לא משתנה → status='skipped'
8. **Reason:** נשמר, מוצג בצפייה, מיוצא ל-Excel
9. **Tenant isolation:** ספירה של tenant א' לא נראית ל-tenant ב'
10. **Permissions:** רק מנהל+ יכול לאשר
11. **Mobile:** כל ה-flow עובד במובייל
12. **Regression:** כל הפיצ'רים הקיימים (סריקה, pause, undo, פילטרים) עובדים

---

## DB Changes

```sql
-- Step 1: New RPC (replaces set_inventory_qty for stock counts)
CREATE OR REPLACE FUNCTION apply_stock_count_delta(
  p_inventory_id UUID,
  p_counted_qty INTEGER,
  p_tenant_id UUID,
  p_user_id UUID,
  p_count_id UUID
) RETURNS JSON AS $$
DECLARE
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
BEGIN
  SELECT quantity INTO v_current_qty
  FROM inventory
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  v_delta := p_counted_qty - v_current_qty;
  v_new_qty := v_current_qty + v_delta;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot go below zero (item: %, counted: %, current: %)',
      p_inventory_id, p_counted_qty, v_current_qty;
  END IF;

  UPDATE inventory SET quantity = v_new_qty
  WHERE id = p_inventory_id AND tenant_id = p_tenant_id;

  RETURN json_build_object(
    'previous_qty', v_current_qty,
    'counted_qty', p_counted_qty,
    'delta', v_delta,
    'new_qty', v_new_qty
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Reason field
ALTER TABLE stock_count_items ADD COLUMN IF NOT EXISTS reason TEXT;

-- Step 3: Skipped status
-- Verify current CHECK constraint and add 'skipped' if needed:
ALTER TABLE stock_count_items
  DROP CONSTRAINT IF EXISTS stock_count_items_status_check;
ALTER TABLE stock_count_items
  ADD CONSTRAINT stock_count_items_status_check
  CHECK (status IN ('pending', 'matched', 'unknown', 'discrepancy', 'skipped'));
```

---

## סדר ביצוע

```
Step 0  — פיצול stock-count-session.js (structural, zero logic)
Step 1  — Atomic Delta RPC (counted_qty, FOR UPDATE, negative guard)
Step 2  — עודפים (modal + שני מסלולי ברקוד)
Step 3  — Reason + אישור חלקי (skipped = ממתין לספירה הבאה)
Step 4  — צפייה בספירות סגורות (+ עמודת "צפוי" ו-"נוכחי")
QA      — Regression (12 בדיקות כולל סימולציות race condition)
```
