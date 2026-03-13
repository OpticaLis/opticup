# Optic Up — פאזה 2: ספירת מלאי + גשר Access

> **פאזה 2 מתוך מודול מלאי v2.0**
> **תלות:** פאזה 0 + 1 + 1.5 הושלמו
> **מיקום:** שמור כ- `modules/Module 1 - Inventory Management/docs/PHASE_2_SPEC.md`

---

## 1. סקירה — מה בונים בפאזה הזו

שני דברים:

**א. ספירת מלאי (Stock Count)** — מסך ייעודי לספירת מלאי פיזית. סורקים ברקוד, מזינים כמות בפועל, המערכת מייצרת דוח פערים, מאשרים ומעדכנים.

**ב. גשר Excel דו-כיווני עם Access** — סנכרון מלאי בין האפליקציה שלנו לתוכנת Access הקיימת, דרך Dropbox. כולל Folder Watcher (סקריפט Node.js שרץ ברקע).

---

## 2. ספירת מלאי — אפיון מלא

### 2.1 מה זה פותר

היום ספירת מלאי נעשית ב-Excel. סופרים מסגרות בקיר, מקלידים ל-Excel, משווים ידנית. זה לוקח שעות ומועד לטעויות. עם הפיצ'ר הזה — סורקים ברקוד, מקלידים כמות, המערכת מייצרת דוח פערים אוטומטי.

### 2.2 DB Schema

```sql
-- ============================================================
-- stock_counts — ראשי ספירות מלאי
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_counts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_number    TEXT NOT NULL UNIQUE,                        -- SC-YYYY-NNNN (auto-generated)
  count_date      DATE NOT NULL DEFAULT CURRENT_DATE,          -- תאריך ספירה
  status          TEXT NOT NULL DEFAULT 'in_progress',         -- in_progress | completed | cancelled
  counted_by      TEXT,                                        -- מי ספר (שם עובד)
  notes           TEXT,                                        -- הערות
  total_items     INTEGER DEFAULT 0,                           -- סה"כ פריטים שנספרו
  total_diffs     INTEGER DEFAULT 0,                           -- סה"כ פערים שנמצאו
  branch_id       TEXT,                                        -- קוד סניף
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ                                  -- מתי הושלם
);
CREATE INDEX IF NOT EXISTS idx_sc_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_sc_date ON stock_counts(count_date DESC);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_stock_counts" ON stock_counts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- stock_count_items — שורות ספירה
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_count_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_id        UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  barcode         TEXT,                                        -- ברקוד (snapshot)
  brand           TEXT,                                        -- מותג (snapshot)
  model           TEXT,                                        -- דגם (snapshot)
  color           TEXT,                                        -- צבע (snapshot)
  size            TEXT,                                        -- גודל (snapshot)
  expected_qty    INTEGER NOT NULL,                            -- כמות צפויה (מהמערכת)
  actual_qty      INTEGER,                                     -- כמות בפועל (מהספירה)
  difference      INTEGER GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,  -- פער
  status          TEXT NOT NULL DEFAULT 'pending',             -- pending | counted | skipped
  notes           TEXT,                                        -- הערה לשורה
  counted_at      TIMESTAMPTZ                                  -- מתי נספר
);
CREATE INDEX IF NOT EXISTS idx_sci_count ON stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_sci_inventory ON stock_count_items(inventory_id);

ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_sc_items" ON stock_count_items FOR ALL USING (true) WITH CHECK (true);
```

### 2.3 count_number — פורמט אוטומטי

**פורמט:** `SC-YYYY-NNNN`
- YYYY = שנה נוכחית
- NNNN = מספר רץ

**לוגיקה:** זהה ל-generatePoNumber אבל עם prefix SC.

### 2.4 Flow

```
ספירה חדשה
  └→ בחירת סקופ: כל המלאי / מותג ספציפי / ספק ספציפי
      └→ המערכת טוענת את כל הפריטים הרלוונטיים (is_deleted=false, qty>0)
          └→ מסך ספירה: סריקת ברקוד / גלילה ברשימה
              └→ לכל פריט: הזנת כמות בפועל
                  └→ בסיום: דוח פערים
                      └→ אישור עם PIN
                          └→ עדכון כמויות + writeLog('edit_qty') לכל פריט שהשתנה
                              └→ סטטוס = completed
```

### 2.5 Statuses

```
in_progress ──→ completed
     │
     └──→ cancelled
```

**in_progress** — ספירה פתוחה, ניתן לעדכן
**completed** — הושלמה, כמויות עודכנו, read-only
**cancelled** — בוטלה, לא עודכן כלום

### 2.6 מסכים

#### מסך רשימת ספירות
- **כרטיסי סיכום**: ספירות בתהליך | הושלמו החודש | סה"כ פערים החודש
- **טבלה**: מספר ספירה | תאריך | סטטוס | נספרו | פערים | מבצע | פעולות
- **פעולות**: in_progress → המשך/ביטול, completed → צפייה + ייצוא

#### מסך ספירה פעילה

**חלק עליון — סריקה:**
- שדה ברקוד עם autofocus (סורק USB שולח ברקוד + Enter)
- סריקת ברקוד → השורה קופצת למעלה, שדה כמות מקבל focus
- הזנת כמות → Enter → חוזר לשדה ברקוד
- **או:** גלילה ברשימה ולחיצה על שורה

**חלק תחתון — טבלת פריטים:**
- ברקוד | מותג | דגם | צבע | גודל | צפוי | בפועל | פער | סטטוס
- שורות שנספרו = ירוק
- שורות עם פער = צהוב (פער קטן) / אדום (פער גדול)
- שורות שלא נספרו = אפור

**סיכום תחתון:**
- נספרו X מתוך Y | פערים: Z | התאמה: W%
- כפתור "סיום ספירה"

#### מסך דוח פערים (לפני אישור)
- רק שורות עם פער (actual ≠ expected)
- ברקוד | מותג | דגם | צפוי | בפועל | פער | הערה
- **הדגשה:** חסר (אדום), עודף (כחול)
- **סיכום:** סה"כ חוסרים | סה"כ עודפים
- **כפתורים:** אשר + עדכן מלאי (PIN) | חזור לספירה | ייצוא Excel | ביטול

### 2.7 אישור ספירה — מה קורה

1. PIN verification
2. לכל פריט עם פער:
   - `UPDATE inventory SET quantity = actual_qty WHERE id = inventory_id`
   - `writeLog('edit_qty', inventoryId, { qty_before: expected, qty_after: actual, reason: 'ספירת מלאי', source_ref: count_number })`
3. `UPDATE stock_counts SET status = 'completed', completed_at = NOW(), total_items = X, total_diffs = Y`
4. Toast: "ספירה SC-2026-0001 הושלמה. עודכנו X פריטים."

### 2.8 ייצוא דוח ספירה ל-Excel

- כל הפריטים שנספרו (לא רק פערים)
- עמודות: ברקוד | מותג | דגם | צבע | גודל | צפוי | בפועל | פער | הערה
- שם קובץ: `ספירת_מלאי_SC-2026-0001.xlsx`

### 2.9 קובץ JS חדש

**stock-count.js** — יכלול:
- `loadStockCountTab()` — רשימת ספירות + כרטיסי סיכום
- `generateCountNumber()` — SC-YYYY-NNNN
- `startNewCount(scope)` — יצירת ספירה חדשה
- `loadCountItems(countId)` — טעינת פריטים לספירה
- `scanBarcode(barcode)` — חיפוש והדגשת פריט
- `updateCountItem(itemId, actualQty)` — עדכון כמות בפועל
- `showDiffReport(countId)` — דוח פערים
- `confirmCount(countId)` — אישור + PIN + עדכון inventory
- `cancelCount(countId)` — ביטול
- `exportCountExcel(countId)` — ייצוא Excel

### 2.10 ACTION_MAP — עדכון

לא צריך action חדש — משתמשים ב-`edit_qty` הקיים עם reason 'ספירת מלאי'.

### 2.11 T (table names) — עדכון

```javascript
T.STOCK_COUNTS = 'stock_counts';
T.STOCK_COUNT_ITEMS = 'stock_count_items';
```

---

## 3. גשר Access — אפיון מלא

### 3.1 מה זה פותר

האפליקציה שלנו מנהלת מלאי. Access מנהל מכירות/הזמנות. צריך סנכרון:
- כשנמכרות מסגרות ב-Access → הכמות יורדת אצלנו
- כשנכנס מלאי חדש אצלנו → Access מעודכן

### 3.2 ארכיטקטורה

```
מחשב Access                    Dropbox (ענן)                 מחשב כלשהו עם Watcher
    │                               │                              │
    ├─ VBA/כפתור: ייצוא ──────► sync/sales/                       │
    │   מכירות יומיות                │                              │
    │                          Dropbox syncs ──────────────► sync/sales/
    │                               │                         Watcher רואה קובץ
    │                               │                              │
    │                               │                    Node.js: קורא Excel
    │                               │                    → Supabase API: update qty
    │                               │                    → writeLog('sale')
    │                               │                    → מעביר ל-sync/processed/
    │                               │                              │
    │                          sync/new_stock/ ◄────────── האפליקציה: ייצוא
    │                               │                     אוטומטי אחרי קבלת סחורה
    │  Access VBA/ייבוא ◄────── Dropbox syncs
    │   מלאי חדש                     │
```

### 3.3 מבנה תיקיות Dropbox

```
Dropbox/
└── PrizmaSync/
    ├── sales/              ← Access שם כאן מכירות (Excel)
    ├── new_stock/          ← האפליקציה שמה כאן מלאי חדש (Excel)
    ├── processed/          ← קבצים שעובדו בהצלחה (עם timestamp)
    ├── error/              ← קבצים שנכשלו
    └── sync_log.json       ← לוג סנכרונים
```

### 3.4 פורמט Excel — מכירות (Access → שלנו)

**שם קובץ:** `sales_YYYY-MM-DD.xlsx` או `sales_YYYY-MM-DD_HHmm.xlsx`

**שדות:**

| עמודה | שם עברי | חובה | תיאור |
|-------|---------|------|--------|
| barcode | ברקוד | ✅ | ברקוד המסגרת שנמכרה |
| qty_sold | כמות | ✅ | כמות שנמכרה |
| sale_date | תאריך | ✅ | תאריך המכירה (YYYY-MM-DD) |
| sale_price | מחיר | ❌ | מחיר מכירה (לדוחות עתידיים) |
| receipt_number | מספר_קבלה | ❌ | מספר קבלה/חשבונית |
| notes | הערה | ❌ | הערות |

### 3.5 פורמט Excel — מלאי חדש (שלנו → Access)

**שם קובץ:** `new_stock_YYYY-MM-DD.xlsx`

**שדות:**

| עמודה | שם עברי | חובה | תיאור |
|-------|---------|------|--------|
| barcode | ברקוד | ✅ | ברקוד BBDDDDD |
| brand | מותג | ✅ | שם מותג |
| model | דגם | ✅ | שם דגם |
| size | גודל | ❌ | גודל |
| bridge | גשר | ❌ | גשר |
| color | צבע | ❌ | צבע |
| sell_price | מחיר_מכירה | ✅ | מחיר מכירה |
| quantity | כמות | ✅ | כמות |
| supplier | ספק | ❌ | שם ספק |
| entry_date | תאריך_כניסה | ❌ | תאריך כניסה למלאי |
| receipt_number | מספר_קבלה | ❌ | מספר קבלת סחורה |

### 3.6 Folder Watcher — סקריפט Node.js

**קובץ:** `scripts/sync-watcher.js`

**מה הוא עושה:**
1. צופה על תיקיית `PrizmaSync/sales/` (Dropbox local folder)
2. כשמגיע קובץ xlsx חדש:
   - קורא עם SheetJS
   - מוודא פורמט (ברקוד + כמות + תאריך חובה)
   - לכל שורה:
     - מחפש inventory by barcode
     - אם נמצא: `quantity -= qty_sold` (עם הגנה: לא יורד מתחת 0)
     - writeLog('sale', inventoryId, { qty_before, qty_after, reason: 'מכירה מ-Access', source_ref: filename })
   - אם הצליח: מעביר קובץ ל-`processed/` עם timestamp
   - אם נכשל: מעביר ל-`error/` + כותב שגיאה ל-sync_log.json
3. כותב ל-sync_log.json: תאריך, שם קובץ, שורות, הצלחות, כשלונות

**תלויות:** `chokidar` (file watcher), `xlsx` (SheetJS), `@supabase/supabase-js`

**הרצה:**
```bash
node scripts/sync-watcher.js
```

**Windows Service:** באמצעות `node-windows` או Task Scheduler — נדלק עם המחשב.

### 3.7 ייצוא אוטומטי של מלאי חדש

**Trigger:** כשקבלת סחורה מאושרת (status → confirmed) בפונקציה `confirmReceiptCore()`.

**מה קורה:**
1. אחרי אישור מוצלח → מייצר Excel עם כל הפריטים החדשים שנקלטו
2. שומר ב-`PrizmaSync/new_stock/` (דרך download — המשתמש שומר ב-Dropbox)

**או (אלטרנטיבה):** כפתור ידני "ייצוא ל-Access" בטופס הקבלה — מייצר Excel בפורמט הנכון.

**הערה:** בגלל שהאפליקציה רצה בדפדפן, היא לא יכולה לשמור ישירות ל-Dropbox. שתי אפשרויות:
- **פשוט:** כפתור download רגיל, המשתמש שומר בתיקיית Dropbox
- **אוטומטי:** Dropbox API מהסקריפט (מורכב יותר, פאזה עתידית)

**ההמלצה:** ללכת על כפתור download בשלב הזה. פשוט ועובד.

### 3.8 מסך סנכרון (חדש)

**טאב חדש:** "🔄 סנכרון Access"

**מה יש בו:**
- **כרטיסי סיכום**: סנכרונים היום | פריטים שעודכנו | שגיאות
- **ייבוא ידני**: כפתור "העלה דוח מכירות" → upload Excel → עיבוד + עדכון (fallback אם ה-Watcher לא רץ)
- **ייצוא ידני**: כפתור "ייצוא מלאי חדש ל-Access" → download Excel
- **לוג סנכרונים**: טבלה עם היסטוריית סנכרונים (תאריך, קובץ, שורות, סטטוס)
- **מצב Watcher**: חיווי אם הסקריפט רץ (optional — לפי API call)

### 3.9 DB — טבלת לוג סנכרון (optional)

```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction       TEXT NOT NULL,                               -- 'import_sales' | 'export_stock'
  file_name       TEXT NOT NULL,                               -- שם הקובץ
  total_rows      INTEGER DEFAULT 0,                           -- סה"כ שורות
  success_rows    INTEGER DEFAULT 0,                           -- שורות שהצליחו
  error_rows      INTEGER DEFAULT 0,                           -- שורות שנכשלו
  errors          JSONB,                                       -- פירוט שגיאות
  processed_by    TEXT DEFAULT 'watcher',                      -- watcher | manual
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_sync_log" ON sync_log FOR ALL USING (true) WITH CHECK (true);
```

### 3.10 קבצים חדשים

**js/stock-count.js** — ספירת מלאי (כל הפונקציות מסעיף 2.9)

**js/access-sync.js** — מסך סנכרון + ייבוא/ייצוא ידני:
- `loadSyncTab()` — מסך סנכרון + כרטיסי סיכום
- `importSalesExcel(file)` — ייבוא מכירות מ-Excel
- `processSalesRow(row)` — עיבוד שורת מכירה
- `exportNewStockExcel(receiptId)` — ייצוא מלאי חדש לפורמט Access
- `loadSyncLog()` — טעינת לוג סנכרונים

**scripts/sync-watcher.js** — Folder Watcher (Node.js, רץ בנפרד)

---

## 4. סדר ביצוע מומלץ

```
שלב 2.1 — DB
  • יצירת טבלאות stock_counts + stock_count_items + sync_log
  • RLS + indexes
  • עדכון T constant

שלב 2.2 — מסך ספירת מלאי — רשימה
  • טאב "📊 ספירת מלאי" בניווט
  • רשימת ספירות + כרטיסי סיכום
  • כפתור "ספירה חדשה" → בחירת סקופ

שלב 2.3 — מסך ספירה פעילה
  • סריקת ברקוד + הזנת כמות
  • טבלת פריטים עם צביעה
  • סיכום תחתון

שלב 2.4 — דוח פערים + אישור
  • מסך פערים עם הדגשות
  • אישור עם PIN → עדכון inventory + writeLog
  • ייצוא Excel

שלב 2.5 — בדיקות ספירת מלאי
  ★ בדיקה: ספירה חדשה → סריקה → פער → אישור → כמות מתעדכנת
  ★ בדיקה: ספירה מבוטלת → כמויות לא משתנות
  ★ בדיקה: ייצוא Excel תקין
  ★ בדיקה: writeLog נכתב לכל פריט שהשתנה

שלב 2.6 — מסך סנכרון Access
  • טאב "🔄 סנכרון" בניווט
  • ייבוא ידני של מכירות (Excel upload)
  • ייצוא ידני של מלאי חדש (Excel download)
  • לוג סנכרונים

שלב 2.7 — ייבוא מכירות מ-Excel
  • קריאת Excel עם SheetJS
  • ולידציה (ברקוד + כמות + תאריך חובה)
  • עדכון כמויות + writeLog('sale')
  • כתיבה ל-sync_log
  • דוח סיכום: הצלחות, כשלונות, שגיאות

שלב 2.8 — ייצוא מלאי חדש
  • כפתור במסך סנכרון: "ייצוא מלאי חדש"
  • בחירת טווח תאריכים (פריטים שנכנסו מ-X עד-Y)
  • ייצוא Excel בפורמט Access
  • כפתור בקבלת סחורה: "ייצוא ל-Access" (אחרי confirm)

שלב 2.9 — Folder Watcher
  • scripts/sync-watcher.js
  • chokidar צופה על תיקיית sales/
  • עיבוד → Supabase API → processed/error
  • sync_log.json
  • README עם הוראות התקנה והרצה

שלב 2.10 — בדיקות גשר + commit
  ★ בדיקה: ייבוא Excel מכירות → כמויות יורדות + log
  ★ בדיקה: ברקוד לא קיים → שורת שגיאה (לא crash)
  ★ בדיקה: ייצוא Excel תקין ל-Access
  ★ בדיקה: Watcher מזהה קובץ חדש ומעבד
  ★ עדכון תיעוד (CHANGELOG + MODULE_SPEC + db-schema)
  ★ Commit + push
```

---

## 5. מה לא בונים בפאזה הזו

- ❌ Dropbox API (שמירה אוטומטית — המשתמש שומר ידנית ב-Dropbox)
- ❌ סנכרון real-time (הכל batch — קבצי Excel)
- ❌ ייצוא אוטומטי אחרי confirm (רק כפתור ידני)
- ❌ חיבור ישיר Access → Supabase (רק דרך Excel)
- ❌ מעקב חובות ספקים (פאזה 3)
- ❌ סוכן AI (פאזה 4)

---

## 6. דגשי UI

- **ספירת מלאי:** autofocus על שדה ברקוד. אחרי הזנת כמות + Enter → חזרה לברקוד. Flow חייב להיות מהיר — זה עובד עם סורק USB.
- **צביעה בספירה:** ירוק = נספר ותקין, צהוב = פער קטן (±1-2), אדום = פער גדול (±3+), אפור = לא נספר
- **מסך סנכרון:** פשוט ונקי. שני כפתורים גדולים (ייבוא/ייצוא) + לוג
- **RTL, dark blue theme** — כמו שאר המערכת
