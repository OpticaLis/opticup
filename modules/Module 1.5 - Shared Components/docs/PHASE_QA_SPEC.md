# PHASE QA SPEC — Full Regression

> **מודול:** 1.5 — Shared Components Refactor
> **פאזה:** QA (אחרונה)
> **תלויות:** כל הפאזות (1-5) ✅
> **מטרה:** וידוא שמודול 1.5 לא שבר כלום, tenant isolation עובד, theme per-tenant עובד, והכל מוכן ל-production.

---

## חלק 1: Clone Tenant — סביבת בדיקה

### 1.1 מה יוצרים

Tenant בדיקה מלא — עותק של כל הנתונים של פריזמה עם tenant_id חדש.

| פריט | ערך |
|------|-----|
| שם | אופטיקה דמו / Demo Optics |
| ui_config | `{ "--color-primary": "#059669", "--color-primary-hover": "#047857", "--color-primary-light": "#d1fae5" }` (ירוק — ככה רואים מיד באיזה tenant אתה) |
| עובד | שם: "עובד בדיקה", PIN: 12345 |

### 1.2 SQL Script — Clone

**סדר הכנסה (foreign key order):**

```
1. tenants              — שורה חדשה עם ui_config ירוק
2. branches             — branch חדש ל-tenant החדש
3. employees            — עובד בדיקה + PIN
4. employee_permissions — הרשאות מלאות לעובד הבדיקה
5. brands               — copy all, replace tenant_id + branch_id
6. suppliers             — copy all
7. inventory             — copy all (references brands)
8. supplier_documents    — copy all
9. supplier_payments     — copy all
10. prepaid_deals        — copy all
11. purchase_orders      — copy all (references suppliers)
12. purchase_order_items — copy all (references purchase_orders + inventory)
13. goods_receipts       — copy all
14. goods_receipt_items  — copy all
15. inventory_logs       — copy all
16. shipments            — copy all
17. shipment_items       — copy all
18. stock_count_sessions — copy all
19. stock_count_items    — copy all
20. alerts               — copy all
21. activity_log         — empty (starts fresh for testing)
```

**⚠️ הוראה ל-Claude Code:**
- קודם כל לקרוא את `docs/GLOBAL_SCHEMA.sql` ולמפות את כל הטבלאות עם ה-foreign keys שלהן
- לייצר UUIDs חדשים ל-tenant ו-branch
- להשתמש ב-`INSERT INTO ... SELECT` עם החלפת tenant_id ו-branch_id
- לטפל ב-foreign keys פנימיים (למשל purchase_order_items.purchase_order_id חייב להצביע על ה-PO המשוכפל, לא המקורי) — צריך mapping table
- אם יש self-references (parent_id) — לטפל
- לדלג על טבלאות שלא רלוונטיות (tenant_config אם קיים, access_sync_queue)

**Pattern ל-FK mapping:**

```sql
-- Step 1: Create temp mapping
CREATE TEMP TABLE _brand_map AS
  SELECT id AS old_id, gen_random_uuid() AS new_id FROM brands WHERE tenant_id = '{OLD_TENANT}';

-- Step 2: Insert with mapped IDs
INSERT INTO brands (id, tenant_id, branch_id, name, ...)
  SELECT m.new_id, '{NEW_TENANT}', '{NEW_BRANCH}', b.name, ...
  FROM brands b
  JOIN _brand_map m ON m.old_id = b.id
  WHERE b.tenant_id = '{OLD_TENANT}';

-- Step 3: Inventory uses brand_map for brand_id
INSERT INTO inventory (id, tenant_id, branch_id, brand_id, ...)
  SELECT gen_random_uuid(), '{NEW_TENANT}', '{NEW_BRANCH}', bm.new_id, ...
  FROM inventory i
  JOIN _brand_map bm ON bm.old_id = i.brand_id
  WHERE i.tenant_id = '{OLD_TENANT}';
```

### 1.3 SQL Script — Cleanup

Script נפרד למחיקת tenant הבדיקה. **סדר הפוך** (children first):

```sql
-- ⚠️ DANGER: Deletes all data for test tenant
-- Run only after QA is complete

DELETE FROM stock_count_items WHERE tenant_id = '{TEST_TENANT}';
DELETE FROM stock_count_sessions WHERE tenant_id = '{TEST_TENANT}';
DELETE FROM shipment_items WHERE tenant_id = '{TEST_TENANT}';
DELETE FROM shipments WHERE tenant_id = '{TEST_TENANT}';
-- ... all tables in reverse order ...
DELETE FROM employees WHERE tenant_id = '{TEST_TENANT}';
DELETE FROM branches WHERE tenant_id = '{TEST_TENANT}';
DELETE FROM tenants WHERE id = '{TEST_TENANT}';

-- Drop temp mapping tables if still exist
DROP TABLE IF EXISTS _brand_map, _supplier_map, _inventory_map, ...;
```

### 1.4 Verification — Clone

- [ ] tenant "אופטיקה דמו" קיים ב-tenants
- [ ] ui_config עם צבעים ירוקים
- [ ] branch קיים
- [ ] עובד בדיקה יכול להתחבר עם PIN 12345
- [ ] כל הטבלאות מכילות נתונים ל-test tenant
- [ ] **פריזמה לא נפגעת** — login לפריזמה, הכל עובד כרגיל
- [ ] row counts: test tenant ~ same as prizma tenant per table

---

## חלק 2: Tenant Isolation Tests

בדיקות שמוודאות ש-tenant A לא רואה נתונים של tenant B.

### 2.1 Data Isolation

Login ל-test tenant, וודא:

- [ ] inventory מציג רק פריטים של test tenant
- [ ] brands מציג רק מותגים של test tenant
- [ ] suppliers מציג רק ספקים של test tenant
- [ ] purchase_orders — רק הזמנות של test tenant
- [ ] goods_receipts — רק קבלות של test tenant
- [ ] shipments — רק משלוחים של test tenant
- [ ] employees — רק עובדים של test tenant
- [ ] stock_count_sessions — רק ספירות של test tenant
- [ ] activity_log — ריק (fresh) ל-test tenant
- [ ] alerts — רק התראות של test tenant

### 2.2 Write Isolation

Login ל-test tenant, בצע פעולות:

- [ ] הוסף פריט → נשמר עם test tenant_id
- [ ] ערוך פריט → עדכון רק ב-test tenant
- [ ] מחק פריט → soft delete רק ב-test tenant
- [ ] שנה כמות (+/-) → writeLog עם test tenant_id
- [ ] **חזור לפריזמה → הפריט החדש לא מופיע**

### 2.3 Activity Log Isolation

- [ ] ActivityLog.write() מ-test tenant → רשומה עם test tenant_id
- [ ] login לפריזמה → activity_log לא מכיל רשומות של test tenant

---

## חלק 3: Per-Tenant Theme

### 3.1 Visual Theme Test

- [ ] Login ל-test tenant → **צבעים ירוקים** (primary, hover, buttons, header)
- [ ] Login לפריזמה → **צבעים מקוריים** (כחול כהה)
- [ ] כל 5 הדפים המ-migrated ב-test tenant → ירוק
- [ ] suppliers-debt.html ב-test tenant → לא ירוק (לא migrated, styles.css ישן)

### 3.2 Theme Override Test

- [ ] שנה ui_config של test tenant → `{ "--color-primary": "#dc2626" }` (אדום)
- [ ] רענן דף → צבעים אדומים
- [ ] שנה חזרה לירוק → רענן → ירוק
- [ ] **פריזמה לא מושפעת** בשום שלב

### 3.3 Empty Theme Test

- [ ] שנה ui_config של test tenant → `{}`
- [ ] רענן → defaults חלים (צבעים מ-variables.css)
- [ ] שנה ui_config → `null`
- [ ] רענן → לא קורס, defaults חלים

---

## חלק 4: Visual Consistency

### 4.1 Cross-Page Consistency

Login ל-test tenant, עבור בין כל הדפים:

- [ ] **כפתורים** — אותו סגנון בכל דף (primary ירוק, secondary, danger)
- [ ] **Inputs** — אותו גודל, border, focus state
- [ ] **Header** — sticky, אותו מראה בכל דף
- [ ] **Badges** — אותו סגנון (success, error, warning, info, neutral)
- [ ] **Cards** — אותו border-radius, shadow
- [ ] אין "דף ישן" ו"דף חדש" — הכל אחיד

### 4.2 Modal Consistency

- [ ] Modal.confirm() — אותו מראה ב-inventory וב-shipments
- [ ] Modal.danger() — אותו מראה בכל מקום
- [ ] Modal.form() — אותו מראה
- [ ] PinModal.prompt() — אותו מראה

### 4.3 Toast Consistency

- [ ] Toast.success() — אותו מראה בכל דף
- [ ] Toast.error() — אותו מראה
- [ ] Toast positioning — top-left בכל דף

---

## חלק 5: RTL

- [ ] **כל Modal** — כפתור X בצד שמאל, טקסט מיושר ימינה
- [ ] **Toast** — מופיע מצד שמאל למעלה
- [ ] **Slide panel** — נכנס מימין (shipments detail)
- [ ] **Sort arrows** — בצד הנכון של header
- [ ] **Form labels** — מיושרים ימינה
- [ ] **Form error messages** — מיושרים ימינה
- [ ] **Buttons in Modal footer** — סדר נכון ב-RTL

---

## חלק 6: Mobile / Responsive

בדיקה על מסך צר (Chrome DevTools → 375px width):

- [ ] **Header** — responsive, לא חותך טקסט
- [ ] **Modals** — מתאימים למסך צר, לא גולשים
- [ ] **Toasts** — נראים ולא חותכים טקסט
- [ ] **Tables** — horizontal scroll (לא שבירת layout)
- [ ] **Forms** — form-col-2 הופך ל-1 column במובייל
- [ ] **Slide panel** — fullscreen במובייל (אם רלוונטי)
- [ ] **Buttons** — לחיצים (לא קטנים מדי)

---

## חלק 7: Print

- [ ] **inventory.html** — הדפסה (Ctrl+P): header מוסתר, תוכן מוצג
- [ ] **shipments manifest** — PDF/הדפסה עובד כמו קודם
- [ ] `.no-print` class — אלמנטים עם class זה לא מודפסים
- [ ] **Modals לא מופיעים בהדפסה** (אם modal פתוח בזמן Print)
- [ ] **Toast לא מופיע בהדפסה**

---

## חלק 8: Full Feature Regression

Login ל-test tenant ולבצע כל פעולה:

### inventory.html
- [ ] טעינת מלאי, חיפוש, סינון
- [ ] הוספת פריט חדש
- [ ] עריכת פריט
- [ ] מחיקת פריט (soft) + PIN
- [ ] מחיקה לצמיתות (double PIN)
- [ ] שינוי כמות (+/-) + PIN
- [ ] ייבוא Excel
- [ ] ייצוא Excel
- [ ] מותגים — הצגה, חיפוש, סינון, שינוי סטטוס
- [ ] ספקים — הצגה, עריכה
- [ ] הזמנות רכש — יצירה, עריכה, צפייה
- [ ] קבלות סחורה — יצירה, אישור
- [ ] OCR — סריקה, review (אם אפשר על test tenant)
- [ ] Audit log — מציג רשומות
- [ ] Item history — מציג היסטוריית פריט
- [ ] Access sync — מוצג (גם אם לא פעיל)
- [ ] ספירות מלאי — יצירה, סריקה, אישור
- [ ] התראות (bell icon)
- [ ] הדפסה

### shipments.html
- [ ] יצירת משלוח
- [ ] הוספת פריטים
- [ ] נעילת ארגז + PIN
- [ ] צפייה בפרטים (slide panel)
- [ ] שליחים — הגדרות
- [ ] Manifest — PDF

### employees.html
- [ ] הצגת עובדים
- [ ] הוספת עובד
- [ ] עריכת עובד
- [ ] שינוי הרשאות

### settings.html
- [ ] הצגת הגדרות
- [ ] עריכת פרטי עסק
- [ ] שמירה

### index.html
- [ ] Login עם PIN
- [ ] הצגת כרטיסי מודולים
- [ ] ניווט למודולים

### suppliers-debt.html (לא migrated — backward compatibility)
- [ ] נטען תקין עם styles.css
- [ ] PIN עובד (alias promptPin)
- [ ] כל הפיצ'רים עובדים — מסמכים, תשלומים, עסקאות מקדמה, OCR
- [ ] אפס console errors

---

## חלק 9: Cleanup & Close

### 9.1 Decide on Test Tenant

אחרי QA — החלטה:
- **אופציה א:** מוחקים (cleanup script) — סביבה נקייה
- **אופציה ב:** משאירים — שימושי ל-QA עתידי, demo, onboarding חנויות חדשות

**המלצה:** משאירים. tenant בדיקה עם נתונים אמיתיים = נכס. מסמנים אותו ב-DB (שם "דמו" + flag בעתיד).

### 9.2 Documentation — Integration Ceremony

- [ ] Backup → `M1.5FQA_YYYY-MM-DD/`
- [ ] ROADMAP.md → Phase QA ✅, all phases ✅
- [ ] SESSION_CONTEXT.md → updated, deferred items listed
- [ ] CHANGELOG.md → Phase QA section
- [ ] MODULE_SPEC.md → current state
- [ ] MODULE_MAP.md → verified
- [ ] GLOBAL_MAP.md → updated
- [ ] GLOBAL_SCHEMA.sql → verified
- [ ] Git tag → `v1.5-qa`
- [ ] **Merge develop → main**

### 9.3 Deferred Items — Final Check

Verify these are documented in the right places:

- [ ] `MASTER_ROADMAP.md` → "Open Items": suppliers-debt migration, styles.css deletion
- [ ] `SESSION_CONTEXT.md` → "Deferred": suppliers-debt, DB.* migration, RLS permissive fix
- [ ] `ROADMAP.md` של מודול כספים (כשייפתח) → prerequisite: suppliers-debt migration

---

## סדר ביצוע (Steps)

```
Step 1:  Clone tenant — SQL script + verify. פריזמה לא נפגעת
Step 2:  Tenant isolation tests — data + write isolation
Step 3:  Theme tests — visual + override + empty
Step 4:  Visual consistency — cross-page, modals, toasts
Step 5:  RTL tests
Step 6:  Mobile/responsive tests
Step 7:  Print tests
Step 8:  Full feature regression on test tenant (all 5 migrated pages)
Step 9:  suppliers-debt.html backward compatibility check
Step 10: Cleanup decision + documentation + merge + tag
```

---

## שאלות פתוחות — אין

כל ההחלטות נעולות. אפשר להתחיל.
