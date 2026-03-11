# עדכון אסטרטגי — שינויים שהתקבלו בצ'אט הראשי (מרץ 2026)

> **מסמך זה מועבר לצ'אט האסטרטגי של מודול 1 (מלאי מסגרות).**
> מטרתו: להסביר מה השתנה, מה המטרה הגדולה, ומה חייב להיבנות מראש כדי שלא יהיו בעיות בעתיד.

---

## מה השתנה — בקצרה

### Optic Up הופך ל-SaaS

Optic Up כבר לא מערכת פנימית לאופטיקה פריזמה בלבד. **המטרה הסופית היא להציע את המערכת כפלטפורמת SaaS לחנויות אופטיקה ורשתות.** כל חנות שמצטרפת מקבלת: מערכת ניהול מלאה (ERP) + אתר חנות ממותג (Storefront).

### שני מוצרים, DB אחד

```
┌──────────────────────┐         ┌──────────────────────┐
│   Optic Up ERP       │         │  Optic Up Storefront  │
│   (ניהול פנימי)       │         │  (אתר ללקוח קצה)      │
│   עובדי חנות בלבד     │         │  פתוח לציבור         │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └────────► Supabase ◄────────────┘
                    (tenant_id מבודד הכל)
```

**Storefront לא נוגע בטבלאות ישירות.** הוא קורא רק מ-Views ו-RPC Functions ב-Supabase. ככה כל מודול ERP חדש שנבנה — פשוט חושפים View חדש. אפס שינויים בקוד קיים.

### tenant_id על הכל

**כל טבלה קיימת ועתידית מקבלת עמודת `tenant_id`.** זה יתבצע במודול Auth (פאזה 3 שלכם). אבל כל פאזה חדשה שנבנית מעכשיו חייבת לכלול tenant_id בכל טבלה חדשה. בלי יוצא מן הכלל.

---

## מה זה אומר לפאזות 4, 5, 6 של מודול מלאי

### פאזה 4 — מעקב חובות ספקים

**מה שלא משתנה:** הלוגיקה העסקית — חשבוניות, תשלומים, דשבורד חובות, מט"ח.

**מה שחייב להיבנות מראש:**

1. **tenant_id בכל טבלה חדשה:**
```sql
supplier_invoices (
  ...
  tenant_id UUID NOT NULL,  -- חובה
  ...
)
supplier_payments (
  ...
  tenant_id UUID NOT NULL,  -- חובה
  ...
)
```

2. **RLS policy על כל טבלה:**
```sql
CREATE POLICY tenant_isolation ON supplier_invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

3. **חוזה (Contract) ברור** — הפאזה הזו חייבת לחשוף פונקציות שמודולים אחרים יוכלו לקרוא מבלי לגשת לטבלאות ישירות:
```
getSupplierDebt(supplier_id) → { total_debt, overdue, next_payment }
getInvoicesBySupplier(supplier_id) → invoices array
getPaymentsByInvoice(invoice_id) → payments array
getDebtDashboard() → { total, overdue, due_this_week, by_supplier }
```

4. **View ל-Storefront / פורטל ספקים** — בפאזה 6 (פורטל ספקים) נצטרך להציג לספק את הנתונים שלו. לכן כבר עכשיו תכננו View שחושף רק מה שספק רשאי לראות:
```sql
-- אל תיצרו עכשיו, רק תוודאו שהמבנה תומך:
-- בעתיד: VIEW supplier_portal_invoices שמסנן לפי supplier_id + tenant_id
-- ללא מידע רגיש (מחירים פנימיים, הערות פנימיות)
```

5. **מט"ח — חשבו global:** כשבונים currency + exchange_rate, אל תקשיחו למטבעות ישראליים בלבד. טבלת currencies עם ILS, USD, EUR כברירת מחדל — אבל פתוחה להרחבה. חנויות אופטיקה ברחבי העולם = מטבעות שונים.

---

### פאזה 5 — סוכן AI לניהול ספקים

**מה שלא משתנה:** OCR חשבוניות, מילוי אוטומטי, התראות, זיהוי אי-התאמות.

**מה שחייב להיבנות מראש:**

1. **tenant_id בכל טבלה** — כרגיל.

2. **AI Config per tenant:** כל חנות תרצה להגדיר אחרת — אילו שדות לחלץ מ-PDF, אילו התראות לשלוח, מתי. לכן:
```sql
ai_agent_config (
  tenant_id         UUID PRIMARY KEY,
  ocr_enabled       BOOLEAN DEFAULT true,
  auto_match_po     BOOLEAN DEFAULT true,   -- התאמה אוטומטית ל-PO
  alert_threshold   DECIMAL DEFAULT 0.1,    -- סף אי-התאמה (10%)
  alert_channels    JSONB DEFAULT '["in_app"]',  -- "in_app" / "whatsapp" / "email"
  ...
)
```

3. **למידה per tenant:** אם הסוכן לומד מתיקוני משתמש — הלמידה חייבת להיות מבודדת per tenant. חשבונית של פריזמה לא משפיעה על למידה של חנות אחרת.

4. **API key management:** Claude Vision API key — האם אחד לכל המערכת (אנחנו משלמים) או per tenant (הם משלמים)? ההחלטה הזו לא חייבת להתקבל עכשיו, אבל המבנה צריך לתמוך בשניהם. לכן:
```sql
ai_agent_config (
  ...
  api_key_source  TEXT DEFAULT 'platform', -- 'platform' / 'tenant_provided'
  tenant_api_key  TEXT,                     -- אם tenant_provided
  ...
)
```

---

### פאזה 6 — פורטל ספקים

**מה שלא משתנה:** ספק נכנס לקישור ורואה מלאי שלו, הזמנות, חשבוניות.

**מה שחייב להיבנות מראש:**

1. **פורטל ספקים = כמו Storefront — קורא רק מ-Views:**
```sql
-- View שמראה לספק רק את הפריטים שלו
CREATE VIEW supplier_portal_inventory AS
SELECT i.barcode, i.model, i.color, i.size, i.quantity
FROM inventory i
WHERE i.supplier_id = current_setting('app.supplier_id')::uuid
  AND i.tenant_id = current_setting('app.tenant_id')::uuid
  AND i.is_deleted = false;

-- View שמראה לספק את ההזמנות אליו
CREATE VIEW supplier_portal_orders AS
SELECT po.po_number, po.status, po.created_at, po.total_amount
FROM purchase_orders po
WHERE po.supplier_id = current_setting('app.supplier_id')::uuid
  AND po.tenant_id = current_setting('app.tenant_id')::uuid;
```

2. **אימות ספק = נפרד מאימות עובד:**
```sql
supplier_auth (
  id            UUID PRIMARY KEY,
  supplier_id   UUID REFERENCES suppliers(id),
  tenant_id     UUID,
  access_token  TEXT UNIQUE,          -- קישור ייחודי
  permissions   JSONB DEFAULT '["view_inventory", "view_orders"]',
  is_active     BOOLEAN DEFAULT true,
  expires_at    TIMESTAMPTZ,
  last_login    TIMESTAMPTZ
)
```
הספק לא נכנס דרך PIN כמו עובד. הוא מקבל קישור ייחודי (token-based auth).

3. **הרשאות per-tenant per-supplier:** חנות אחת אולי רוצה שספק יראה מחירי עלות, חנות אחרת לא. לכן permissions ב-JSONB — גמיש:
```
permissions אפשריים:
- "view_inventory"      — רואה מלאי שלו
- "view_quantities"     — רואה כמויות (אולי לא רוצים)
- "view_orders"         — רואה POs
- "view_invoices"       — רואה חשבוניות
- "suggest_restock"     — יכול להציע הזמנה (עתידי)
```

---

## כללי ברזל — תזכורת + חדש

**קיים:**
- ⛔ כמות מלאי = רק Add/Remove עם PIN
- ⛔ תאריכים = immutable
- ⛔ מספרים = ייחודי, עולה, immutable
- ⛔ מחיקה = soft delete בלבד
- ⛔ כל פעולה = לוג

**חדש — חובה מעכשיו:**
- ⛔ **כל טבלה חדשה = חייבת tenant_id UUID NOT NULL**
- ⛔ **כל טבלה חדשה = חייבת RLS policy עם tenant isolation**
- ⛔ **כל פאזה = מגדירה חוזה (functions) ב-MODULE_SPEC**
- ⛔ **כל פאזה = שוקלת "מה ספק/לקוח חיצוני צריך לראות?" ומתכננת Views מראש**
- ⛔ **לא לקשיח ערכים** — מטבעות, שפות, סוגי תשלום = טבלאות configurable, לא enums קבועים

---

## סיכום — מה לעשות אחרת מעכשיו

| לפני | עכשיו |
|------|-------|
| טבלאות בלי tenant_id | **כל טבלה = tenant_id חובה** |
| RLS בסיסי | **RLS tenant isolation על הכל** |
| פונקציות פנימיות | **חוזים מוגדרים ב-MODULE_SPEC** |
| בנוי לפריזמה | **בנוי לכל חנות אופטיקה** |
| ערכים hardcoded (₪, עברית) | **configurable per tenant** |
| גישה ישירה לטבלאות | **Views לכל גורם חיצוני (ספק/לקוח/Storefront)** |

**השורה התחתונה:** בנו כל פאזה כאילו מחר מצטרפת חנות אופטיקה שנייה שלא מכירים. אם היא יכולה להשתמש בפאזה בלי שום שינוי — עשיתם נכון.
