# מלאי מסגרות — Module Spec
## גרסה 1.0 | מרץ 2026

---

## 1. סקירה כללית

**מודול מלאי מסגרות** הוא הליבה של מערכת Optic Up — מנהל את כל מחזור החיים של מסגרות משקפיים במלאי: כניסה, מעקב, עריכה, מכירה, מחיקה ושחזור.

**למי הוא משרת:**
- **עובד/קופאי** — הכנסת מלאי, הורדת מלאי, חיפוש מסגרות
- **מנהל סניף** — עריכת מחירים, ניהול כמויות (דורש PIN), מחיקה/שחזור
- **בעלים** — צפייה בעלויות, לוג מערכת, ייצוא דוחות, קבלת סחורה

**מה הוא מחליף:**
- גיליונות Excel ידניים לניהול מלאי
- ספירת מלאי ללא מעקב (audit trail)
- הכנסה/הוצאה ללא תיעוד מי ומתי

**סטאק טכנולוגי:**
- Frontend: Single-file HTML + Vanilla JS + CSS (RTL Hebrew)
- Backend: Supabase (PostgreSQL + REST API)
- Excel: SheetJS (xlsx) לייבוא/ייצוא
- אין framework — קוד vanilla בלבד

---

## 2. טבלאות DB

### 2.1 `inventory` — מלאי ראשי
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | מזהה ייחודי |
| barcode | TEXT | UNIQUE (WHERE NOT NULL) | ברקוד BBDDDDD |
| supplier_id | UUID | FK → suppliers(id) | ספק |
| brand_id | UUID | FK → brands(id) | מותג |
| model | TEXT | — | דגם |
| size | TEXT | — | גודל |
| bridge | TEXT | — | גשר |
| color | TEXT | — | צבע |
| temple_length | TEXT | — | אורך מוט |
| product_type | TEXT | CHECK (eyeglasses/sunglasses/contact_lenses) | סוג מוצר |
| sell_price | NUMERIC(10,2) | DEFAULT 0 | מחיר מכירה |
| sell_discount | NUMERIC(5,4) | DEFAULT 0 | הנחה מכירה % |
| cost_price | NUMERIC(10,2) | DEFAULT 0 | מחיר עלות |
| cost_discount | NUMERIC(5,4) | DEFAULT 0 | הנחה עלות % |
| quantity | INTEGER | NOT NULL DEFAULT 0 | כמות במלאי |
| website_sync | TEXT | CHECK (full/display/none) | סנכרון אתר |
| status | TEXT | CHECK (in_stock/sold/ordered/pending_barcode/pending_images) | סטטוס |
| brand_type | TEXT | CHECK (luxury/brand/regular) | סוג מותג |
| origin | TEXT | — | מקור (כניסת מלאי / goods_receipt / ...) |
| woocommerce_id | INTEGER | — | מזהה WooCommerce |
| notes | TEXT | — | הערות |
| is_deleted | BOOLEAN | NOT NULL DEFAULT false | Soft delete flag |
| deleted_at | TIMESTAMPTZ | — | זמן מחיקה |
| deleted_by | TEXT | — | מי מחק |
| deleted_reason | TEXT | — | סיבת מחיקה |
| branch_id | UUID | — | סניף |
| created_by | UUID | — | יוצר |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | עודכן |

**Indexes:**
- `idx_inventory_barcode_unique` — UNIQUE on barcode WHERE NOT NULL
- `idx_inv_supplier` — supplier_id
- `idx_inv_brand` — brand_id
- `idx_inv_status` — status
- `idx_inv_product_type` — product_type
- `idx_inv_quantity` — quantity
- `idx_inv_model_trgm` — GIN (model gin_trgm_ops)
- `idx_inv_color_trgm` — GIN (color gin_trgm_ops)
- `idx_inventory_not_deleted` — is_deleted WHERE false

**Triggers:** `trg_inventory_updated` → auto-update `updated_at`

### 2.2 `inventory_images` — תמונות פריטים
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| inventory_id | UUID | NOT NULL, FK → inventory(id) ON DELETE CASCADE | פריט מלאי |
| storage_path | TEXT | NOT NULL | נתיב אחסון |
| url | TEXT | NOT NULL | כתובת תמונה |
| thumbnail_url | TEXT | — | כתובת תמונה ממוזערת |
| file_name | TEXT | — | שם קובץ |
| file_size | INTEGER | — | גודל קובץ |
| sort_order | SMALLINT | DEFAULT 0 | סדר מיון |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |

**Indexes:** `idx_inv_images_inv` — inventory_id

### 2.3 `inventory_logs` — לוג פעולות (Audit Trail)
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| action | TEXT | NOT NULL | סוג פעולה (17 סוגים) |
| inventory_id | UUID | FK → inventory(id) ON DELETE SET NULL | פריט מלאי |
| barcode | TEXT | — | ברקוד (snapshot) |
| brand | TEXT | — | מותג (snapshot) |
| model | TEXT | — | דגם (snapshot) |
| qty_before | INTEGER | — | כמות לפני |
| qty_after | INTEGER | — | כמות אחרי |
| price_before | NUMERIC | — | מחיר לפני |
| price_after | NUMERIC | — | מחיר אחרי |
| reason | TEXT | — | סיבה |
| source_ref | TEXT | — | מקור (הזמנת רכש / שם קובץ / סניף) |
| performed_by | TEXT | NOT NULL DEFAULT 'system' | מבצע הפעולה |
| branch_id | TEXT | — | סניף |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |

**Indexes:** inventory_id, action, created_at DESC, branch_id, performed_by

### 2.4 `brands` — מותגים
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| name | TEXT | NOT NULL UNIQUE | שם חברה |
| brand_type | TEXT | CHECK (luxury/brand/regular) | סוג מותג |
| default_sync | TEXT | CHECK (full/display/none) | סנכרון ברירת מחדל |
| active | BOOLEAN | NOT NULL DEFAULT TRUE | פעיל |
| exclude_website | BOOLEAN | NOT NULL DEFAULT FALSE | מוחרג מאתר |
| branch_id | UUID | — | סניף |
| created_by | UUID | — | יוצר |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | עודכן |

**Indexes:** name, active

### 2.5 `suppliers` — ספקים
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| name | TEXT | NOT NULL UNIQUE | שם ספק |
| contact | TEXT | — | איש קשר |
| phone | TEXT | — | טלפון |
| mobile | TEXT | — | נייד |
| email | TEXT | — | אימייל |
| address | TEXT | — | כתובת |
| tax_id | TEXT | — | ח.פ. |
| payment_terms | TEXT | — | תנאי תשלום |
| rating | SMALLINT | CHECK (1-5) | דירוג |
| notes | TEXT | — | הערות |
| active | BOOLEAN | NOT NULL DEFAULT TRUE | פעיל |
| branch_id | UUID | — | סניף |
| created_by | UUID | — | יוצר |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | עודכן |

**Indexes:** name, active

### 2.6 `employees` — עובדים (אימות PIN)
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| name | TEXT | NOT NULL | שם עובד |
| pin | TEXT | NOT NULL | קוד PIN לאימות |
| role | TEXT | NOT NULL DEFAULT 'employee' | תפקיד (employee/manager/admin) |
| branch_id | TEXT | — | סניף |
| is_active | BOOLEAN | NOT NULL DEFAULT true | פעיל |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |

**ברירת מחדל:** מנהל ראשי, PIN 1234, role admin, branch 00

### 2.7 `goods_receipts` — קבלות סחורה
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| receipt_number | TEXT | NOT NULL | מספר קבלה / תעודת משלוח |
| receipt_type | TEXT | NOT NULL DEFAULT 'delivery_note' | סוג (delivery_note/invoice/tax_invoice) |
| supplier_id | UUID | FK → suppliers(id) | ספק |
| branch_id | TEXT | — | סניף |
| receipt_date | DATE | NOT NULL DEFAULT CURRENT_DATE | תאריך קבלה |
| received_date | DATE | DEFAULT CURRENT_DATE | תאריך קליטה בפועל |
| total_amount | DECIMAL(10,2) | — | סכום כולל |
| notes | TEXT | — | הערות |
| status | TEXT | NOT NULL DEFAULT 'draft' | סטטוס (draft/confirmed/cancelled) |
| created_by | TEXT | — | יוצר |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | נוצר |

**Indexes:** supplier_id, status

### 2.8 `goods_receipt_items` — פריטי קבלת סחורה
| שדה | סוג | Constraints | תיאור |
|-----|------|------------|--------|
| id | UUID | PK | מזהה |
| receipt_id | UUID | NOT NULL, FK → goods_receipts(id) ON DELETE CASCADE | קבלה |
| inventory_id | UUID | FK → inventory(id) ON DELETE SET NULL | פריט מלאי (אם קיים) |
| barcode | TEXT | — | ברקוד |
| brand | TEXT | — | מותג |
| model | TEXT | — | דגם |
| color | TEXT | — | צבע |
| size | TEXT | — | גודל |
| quantity | INTEGER | NOT NULL DEFAULT 1 | כמות |
| unit_cost | DECIMAL(10,2) | — | מחיר עלות ליחידה |
| sell_price | DECIMAL(10,2) | — | מחיר מכירה |
| is_new_item | BOOLEAN | NOT NULL DEFAULT false | פריט חדש (לא קיים במלאי) |

**Indexes:** receipt_id

---

## 3. פיצ'רים שנבנו

### כניסת מלאי
1. **הכנסה ידנית** — כרטיסים עם שדות חובה, העתקה, שכפול מהשורה הקודמת
2. **הכנסה מהזמנת רכש** — בחירת PO → סינון פריטים שהגיעו → יצירת ברקודים
3. **ייבוא מ-Excel** — מיפוי עמודות אוטומטי (עברית/אנגלית), ולידציה, תצוגה מקדימה
4. **יצירת ברקודים** — פורמט BBDDDDD, זיהוי פריטים קיימים ושימוש חוזר בברקוד
5. **קבלת סחורה** — תעודת משלוח/חשבונית, חיפוש ברקוד, פריטים חדשים, אישור ועדכון מלאי

### מלאי ראשי
6. **טבלת מלאי ראשי** — סינון לפי ספק/סוג/כמות/חיפוש חופשי
7. **מיון עמודות** — לחיצה על כותרת → עולה/יורד/ללא
8. **עריכה inline** — לחיצה על תא → עריכה ישירה (חוץ מכמות)
9. **שמירת שינויים** — batch update עם writeLog לכל סוג שינוי
10. **ייצוא Excel** — כל המלאי המסונן + כותרות בעברית

### ניהול כמויות
11. **➕➖ Add/Remove** — כפתורים מוגנים ב-PIN, סיבה חובה, הערה אופציונלית
12. **חסימת עריכה ישירה** — כמות לא ניתנת לעריכה, רק דרך ➕➖

### Soft Delete + סל מחזור
13. **מחיקה רכה** — PIN + סיבה → is_deleted=true + log
14. **סל מחזור** — צפייה בפריטים מחוקים, שחזור או מחיקה לצמיתות
15. **שחזור** — is_deleted=false + log
16. **מחיקה לצמיתות** — PIN נוסף + DELETE מה-DB + log

### היסטוריה ולוגים
17. **היסטוריית פריט** — 📋 ליד כל שורה, timeline צבעוני, ייצוא Excel
18. **לוג מערכת** — טאב admin-only, 4 כרטיסי סיכום, 6 פילטרים, pagination (50/עמוד)
19. **ייצוא לוג** — כל הלוגים המסוננים ל-Excel

### קבלת סחורה
20. **רשימת קבלות** — כרטיסי סיכום, טבלה עם סטטוס, פעולות לפי סטטוס
21. **טופס קבלה** — סוג מסמך, מספר, ספק, תאריך, הערות
22. **חיפוש ברקוד** — חיפוש פריט קיים → מילוי אוטומטי
23. **פריט חדש** — הוספת שורה ידנית לפריט שלא קיים במלאי
24. **ייבוא Excel לקבלה** — קריאת קובץ, זיהוי ברקודים קיימים
25. **אישור קבלה** — עדכון כמויות + יצירת פריטים חדשים + ברקודים + writeLog
26. **ביטול קבלה** — draft בלבד
27. **צפייה בלבד** — קבלות שאושרו/בוטלו נפתחות ב-readonly

### ניהול מותגים וספקים
28. **ניהול מותגים** — טבלה עם עריכה inline, סוג מותג, סנכרון ברירת מחדל, פעיל/לא
29. **ניהול ספקים** — רשימה בסיסית + הוספה

### UI/UX
30. **מצב מנהל** — סיסמה 1234, חשיפת עמודות עלות ושדות admin
31. **Searchable Select** — dropdown עם חיפוש חופשי למותגים
32. **Toast notifications** — הודעות הצלחה/שגיאה/אזהרה
33. **Loading overlay** — חיווי טעינה עם טקסט
34. **Responsive design** — מותאם למובייל

---

## 4. לוגיקות עסקיות

### ברקוד BBDDDDD
- **BB** = 2 ספרות קוד סניף (00-99)
- **DDDDD** = 5 ספרות רצות (00001-99999)
- מקסימום: 99,999 פריטים לסניף, 99 סניפים
- **זיהוי כפילויות**: אם קיים פריט זהה (מותג+דגם+גודל+צבע) עם כמות > 0, הברקוד נעשה שימוש חוזר
- **ולידציה**: בדיקת כפילויות בתוך ה-batch + מול ה-DB לפני INSERT

### Add/Remove כמות עם PIN
- **כלל ברזל**: כמות **לא ניתנת** לעריכה ישירה. רק דרך ➕➖ עם PIN
- **Flow**: לחיצה ➕/➖ → modal עם כמות + סיבה (חובה) + הערה + PIN → אימות PIN מול `employees` → עדכון DB → writeLog
- **Over-remove protection**: לא ניתן להוריד יותר מהכמות הנוכחית
- **סיבות הוספה**: קבלת סחורה, החזרה מלקוח, ספירת מלאי, תיקון טעות, אחר
- **סיבות הוצאה**: מכירה, העברה לסניף, פגום/אבדן, ספירת מלאי, תיקון טעות, אחר

### Soft Delete + סל מחזור
- **Flow**: לחיצת 🗑️ → modal עם סיבה (חובה) + הערה + PIN → אימות → `is_deleted=true` + `deleted_at/by/reason`
- **שחזור**: `is_deleted=false` + ניקוי deleted_* fields + log
- **מחיקה לצמיתות**: PIN נוסף → DELETE מה-DB → log (inventory_id הופך ל-NULL בלוג בגלל ON DELETE SET NULL)
- **חיווי**: פריטים מחוקים לא מופיעים בטבלת מלאי (filter: `is_deleted=false`)

### קבלת סחורה — flow מלא
1. יצירת קבלה חדשה (סוג מסמך + מספר + ספק + תאריך)
2. הוספת פריטים: חיפוש ברקוד / שורה ידנית / ייבוא Excel
3. שמירת טיוטה → goods_receipts (status=draft) + goods_receipt_items
4. אישור קבלה:
   - **פריט קיים**: UPDATE inventory SET quantity += item.quantity; writeLog('entry_receipt')
   - **פריט חדש**: יצירת ברקוד → INSERT inventory → writeLog('entry_receipt')
5. נעילה: status=confirmed → UI readonly
6. ביטול: רק draft → status=cancelled

### 17 סוגי actions ב-inventory_logs
| קטגוריה | actions | צבע |
|---------|---------|-----|
| כניסה | entry_manual, entry_po, entry_excel, entry_receipt, transfer_in | ירוק #4CAF50 |
| יציאה | sale, credit_return, manual_remove, transfer_out | אדום #f44336 |
| עריכה | edit_qty, edit_price, edit_details, edit_barcode | כחול #2196F3 |
| מחיקה | soft_delete, permanent_delete | אפור #9E9E9E |
| שחזור | restore | חום #92400e |
| בדיקה | test | אפור #9E9E9E |

### אימות PIN
- **Query**: `sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle()`
- **משתמש ב**: soft delete, permanent delete, add/remove quantity
- **כשל**: הודעת שגיאה "סיסמת עובד שגויה"
- **הצלחה**: שם העובד נשמר ב-log (source_ref / performed_by)

---

## 5. פונקציות מרכזיות

### Logging & Audit
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `writeLog(action, inventoryId, details)` | כותב שורה ל-inventory_logs | action: string, inventoryId: UUID/null, details: {barcode, brand, model, qty_before, qty_after, price_before, price_after, reason, source_ref} | void (async, non-blocking) |

### ברקודים
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `loadMaxBarcode()` | טוען את הברקוד הגבוה ביותר לסניף הנוכחי | — | void (מעדכן maxBarcode) |
| `generateBarcodes(source)` | מייצר ברקודים BBDDDDD לשורות | source: 'entry'/'poitems' | void (מעדכן DOM cells) |

### ניהול כמויות
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `openQtyModal(inventoryId, mode)` | פותח modal לשינוי כמות | inventoryId: UUID, mode: 'add'/'remove' | void |
| `confirmQtyChange()` | מאמת PIN ומעדכן כמות | — (מתוך modal state) | void (async) |

### Soft Delete
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `confirmSoftDelete()` | מוחק רכות עם PIN | — (מתוך modal state) | void (async) |
| `restoreItem(id)` | משחזר פריט מסל מחזור | id: UUID | void (async) |
| `openRecycleBin()` | פותח את סל המחזור | — | void (async) |
| `permanentDelete(id)` | מוחק לצמיתות עם PIN | id: UUID | void (async) |

### היסטוריה
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `openItemHistory(id, barcode, brand, model)` | מציג timeline של פעולות על פריט | id: UUID, barcode/brand/model: string | void (async) |
| `exportHistoryExcel()` | מייצא היסטוריית פריט ל-Excel | — (מתוך historyCache) | void |

### מלאי ראשי
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `filterInventoryTable()` | מסנן invData לפי כל הפילטרים | — (מתוך DOM inputs) | void (מעדכן invFiltered) |
| `saveInventoryChanges()` | שומר כל שינויי inline | — (מתוך invChanges map) | void (async) |
| `exportInventoryExcel()` | מייצא מלאי מסונן ל-Excel | — | void |

### קבלת סחורה
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `confirmReceipt()` | מאשר קבלה, מעדכן מלאי, כותב logs | — | void (async) |
| `confirmReceiptById(receiptId)` | מאשר קבלה קיימת מהרשימה | receiptId: UUID | void (async) |
| `searchReceiptBarcode()` | מחפש ברקוד להוספה לקבלה | — (מתוך input) | void (async) |
| `createNewInventoryFromReceiptItem(item, receiptId, rcptNumber)` | יוצר פריט חדש במלאי מתוך קבלה | item: object, receiptId: UUID, rcptNumber: string | void (async) |
| `loadReceiptTab()` | טוען רשימת קבלות + כרטיסי סיכום | — | void (async) |

### Compatibility Layer
| פונקציה | תיאור | Parameters | מחזיר |
|---------|--------|-----------|--------|
| `rowToRecord(row, tableName)` | ממיר שורת Supabase → {id, fields:{Hebrew}} | row: object, tableName: string | {id, fields} |
| `fieldsToRow(hebrewFields, tableName)` | ממיר שדות עבריים → שורת Supabase | hebrewFields: object, tableName: string | object |
| `fetchAll(tableName, filters)` | שואב כל הנתונים עם pagination | tableName: string, filters: [[col,op,val]] | Record[] (async) |
| `batchCreate(tableName, records)` | יוצר רשומות ב-batch של 100 | tableName: string, records: {fields}[] | Record[] (async) |

---

## 6. חוזה מול מודולים אחרים

### APIs שהמודול מספק:
| API | תיאור | צרכנים |
|-----|--------|--------|
| `fetchAll(T.INV, filters)` → inventory records | חיפוש פריטים לפי פילטרים | Orders, POS |
| `sb.from('inventory').select().eq('barcode', bc)` → inventory record | חיפוש לפי ברקוד | Orders, POS, Goods Receipt |
| `filterInventoryTable()` → invFiltered array | מלאי מסונן | Reports |
| `writeLog(action, id, details)` → audit log | כתיבת לוג — **shared service** | כל המודולים |
| `employees` table → PIN auth | אימות עובד לפעולות רגישות — **shared service** | כל המודולים |
| `supplierCache / brandCache` → name↔UUID | תרגום שמות למזהים | כל המודולים |

### טבלאות משותפות:
- **inventory_logs** — כל מודול שמשנה מלאי חייב לכתוב log
- **employees** — כל פעולה רגישה דורשת PIN
- **suppliers** — משותף עם PO, קבלות
- **brands** — משותף עם כל מודול מלאי

---

## 7. בעיות ידועות + TODO

### בעיות ידועות
- **ניהול עובדים**: אין ממשק CRUD לטבלת employees — רק ברירת מחדל PIN 1234. נדרש מסך ניהול עובדים עם הוספה/עריכה/מחיקה
- **תמונות**: העלאה בסיסית בלבד, אין עריכה/מחיקה/סידור מתוך הממשק
- **RLS פתוח**: כל הטבלאות עם `USING (true)` — נדרש חיזוק עם auth
- **branch_id inconsistency**: חלק מהטבלאות UUID, חלק TEXT — צריך לאחד
- **quantity cell in receipt**: readonly fields for existing items block qty edit too — consider UX

### TODO לפיתוח עתידי
- [ ] **ממשק מכירות**: action 'sale' מוגדר ב-ACTION_MAP אך ממשק מכירה מלא לא נבנה
- [ ] **העברות בין סניפים**: actions `transfer_in`/`transfer_out` מוגדרים, לוגיקה לא נבנתה
- [ ] **התראות מלאי נמוך**: אין מנגנון notification כשכמות יורדת מתחת לסף
- [ ] **ניהול עובדים**: מסך CRUD לטבלת employees
- [ ] **הדפסת ברקודים**: ייצוא לתווית / ZPL
- [ ] **סנכרון WooCommerce**: website_sync שדה קיים, אין חיבור לאתר
- [ ] **דוחות מלאי**: ערך מלאי, תנועות לפי תקופה, פריטים איטיים

---

## 8. הנחיות לצ'אט הבא

### מבנה האפליקציה
- **קובץ יחיד**: `C:\prizma\index.html` (~4,600 שורות) — HTML + CSS + JS
- **Supabase client**: משתנה גלובלי `sb` (לא `supabase`)
- **Records shape**: `{id, fields: {שמות_עבריים}}` — שכבת תאימות Airtable

### כללים קריטיים
1. **כמות** — עריכה רק דרך ➕➖ עם PIN. לעולם לא ישירות
2. **כל שינוי כמות** — חייב writeLog
3. **מחיקה** — רק soft delete. permanent דורש PIN נוסף
4. **ברקודים** — פורמט BBDDDDD. לא לשנות את הלוגיקה
5. **FIELD_MAP** — כל שדה חדש חייב להיות במיפוי עברית↔אנגלית

### קבועים חשובים
- `T` — שמות טבלאות: `{INV:'inventory', RECEIPTS:'goods_receipts', ...}`
- `ACTION_MAP` — 17 סוגי actions עם icon/label/color
- `ENUM_MAP` — מיפוי enum עברית↔אנגלית
- `FIELD_MAP` — מיפוי שדות עברית↔אנגלית
- Admin password: 1234 (sessionStorage)
- Default employee PIN: 1234

### Preview Server
- `serverId`: מוגדר ב-`.claude/launch.json`, port 8080
- Supabase tab: tabId 1643402287
