# מודול 1 — Flow Review & Fixes Phase 3

> **צ'אט משני חדש.** שלושה נושאים:
> 1. **Tenant isolation hardening** — 0% סיכוי לבלבול בין tenants
> 2. **תמונות למסגרות** — צילום ישיר מהטלפון, תצוגה מקדימה, רקע לבן
> 3. **באגים + יציבות** — פיצולי קבצים, כל פלואו עובד, 0 שגיאות

---

## נושא 1: Tenant Isolation Hardening

### 1.1 הבעיה

בטסטים ידניים קרה כמה פעמים שהמערכת התבלבלה בין tenants — הציגה נתונים של tenant אחד כשהמשתמש היה ב-tenant אחר, או העבירה בין tenants בלי כוונה.

**זה הבאג הכי חמור שיכול להיות ב-SaaS.** לקוח שרואה נתונים של לקוח אחר = אסון.

### 1.2 מה הצ'אט המשני צריך לעשות

**Step 1 — Audit מלא:**

```
1. grep כל ה-repo עבור:
   - getTenantId() — כל מקום שקוראים
   - sessionStorage.getItem('tenant — כל גישה ישירה
   - tenant_id — כל מקום ב-JS שמטפל ב-tenant
   - .eq('tenant_id' — כל filter ב-queries

2. לכל קריאה, בדוק:
   - האם tenant_id באמת מועבר?
   - האם יש מצב שהוא null/undefined?
   - האם יש race condition (טעינה לפני ש-session מוכן)?

3. בדוק את auth flow:
   - PIN login → Edge Function → JWT → tenant_id in claims
   - מה קורה כש-JWT פג תוקף?
   - מה קורה כשמרפרשים דף?
   - מה קורה כשפותחים טאב חדש?
   - מה קורה כשנכנסים מדפדפן אחר?

4. בדוק navigation בין דפים:
   - index.html → inventory.html — tenant_id עובר?
   - inventory.html → suppliers-debt.html — tenant_id עובר?
   - browser back — tenant_id נשמר?
   - bookmark ישיר לדף פנימי — מה קורה?
```

**Step 2 — Hard isolation:**

```
כל דף, בטעינה, חייב:
1. בדוק שיש JWT תקף
2. בדוק ש-tenant_id בתוך ה-JWT
3. בדוק ש-tenant_id ב-sessionStorage תואם ל-JWT
4. אם אחד מהם לא תקין → clear all → redirect to login
5. לעולם לא לטעון נתונים לפני ש-tenant_id מאומת

כל API call חייב:
1. JWT header (כבר קיים)
2. tenant_id filter ב-query (defense-in-depth)
3. אם response מחזיר rows עם tenant_id שונה → ABORT + clear session

Header component חייב:
1. להציג שם tenant
2. אם שם tenant משתנה בלי login → ABORT
```

**Step 3 — בדיקת isolation:**

```
1. Login כ-Prizma → ראה נתונים → logout
2. Login כ-Demo → ראה נתונים שונים → logout
3. Login כ-Prizma → פתח טאב חדש → עדיין Prizma
4. Login כ-Prizma → שנה tenant_id ב-sessionStorage ידנית → צריך ABORT
5. Login כ-Prizma → JWT פג → redirect to login
6. שני טאבים פתוחים, שני tenants → כל טאב רואה רק שלו
7. Refresh בכל דף → tenant_id נשמר, נתונים נכונים
8. Browser back מדף לדף → tenant_id לא משתנה
```

---

## נושא 2: תמונות למסגרות

### 2.1 הרעיון

כל מסגרת במלאי יכולה לקבל תמונות. בדרך כלל 2 (חזית + צד), אבל בלי הגבלה קשיחה. העובד מצלם עם הטלפון של העסק באוהל צילום → התמונה עולה ישירות למערכת.

### 2.2 שני מקומות להוספת תמונות

**מקום 1 — הכנסת מלאי (קבלת סחורה / הכנסה ידנית):**

בשורה של כל פריט שנכנס למלאי — כפתור 📷 "הוסף תמונות":
```
┌───────────────────────────────────────────────┐
│ RB5154 │ 51mm │ שחור │ ×3 │ ₪350 │ [📷]     │
└───────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  הוסף תמונות      │
                              │                  │
                              │ [📸 צלם] [📁 העלה]│
                              │                  │
                              │ תצוגה מקדימה:    │
                              │ ┌────┐ ┌────┐    │
                              │ │ 📷 │ │ 📷 │    │
                              │ └────┘ └────┘    │
                              │ [✕]    [✕]       │
                              │                  │
                              │ [שמור]           │
                              └──────────────────┘
```

**מקום 2 — טבלת מלאי ראשית:**

במקום כפתור מחיקה בודד → כפתור "⋯ עוד" שפותח תפריט:
```
┌───────────────────────────────────────────────────────┐
│ 0012345 │ Ray-Ban │ RB5154 │ 51 │ שחור │ 3 │ [⋯]    │
└───────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                        ┌────────────────┐
                                        │ 📷 תמונות      │
                                        │ 📝 עריכה       │
                                        │ 📋 היסטוריה    │
                                        │ 🗑️ מחיקה      │
                                        │ ─────────────  │
                                        │ 🔄 זיכוי       │
                                        └────────────────┘
```

**לחיצה על "📷 תמונות"** → אותו modal כמו בהכנסת מלאי (צלם/העלה/תצוגה מקדימה/מחיקה).

### 2.3 צילום ישיר מהטלפון

**שתי אפשרויות ב-modal:**

**[📸 צלם]** — פותח את המצלמה של המכשיר:
```html
<input type="file" accept="image/*" capture="environment">
```
`capture="environment"` פותח מצלמה אחורית ישירות (לא file picker). עובד ב-iOS Safari וב-Android Chrome.

**[📁 העלה]** — file picker רגיל לבחירת תמונה מהמחשב/גלריה:
```html
<input type="file" accept="image/*" multiple>
```

### 2.4 תצוגה מקדימה

אחרי צילום/העלאה — התמונה מוצגת ב-modal:
```
┌──────────────────────────────────┐
│  תמונות (2)                      │
│                                  │
│  ┌──────────┐  ┌──────────┐     │
│  │          │  │          │     │
│  │  תמונה 1 │  │  תמונה 2 │     │
│  │          │  │          │     │
│  └──────────┘  └──────────┘     │
│  [✕ הסר] [🔄] [✕ הסר] [🔄]     │
│                                  │
│  [📸 צלם עוד] [📁 העלה עוד]     │
│                                  │
│  [💫 רקע לבן]    ← על תמונה     │
│                  נבחרת           │
│                                  │
│  [שמור]  [ביטול]                 │
└──────────────────────────────────┘
```

- **[✕ הסר]** — מסיר תמונה לפני שמירה
- **[🔄]** — צלם מחדש / החלף
- **[💫 רקע לבן]** — שולח לעיבוד (ראה 2.6)

### 2.5 אחסון — WEBP + דחיסה

**לפני העלאה ל-Storage:**

```javascript
// Client-side: המרה ל-WEBP + דחיסה
const canvas = document.createElement('canvas');
// resize ל-max 1200px על הצד הארוך (מספיק לתצוגה באתר)
// quality 0.82 (איזון בין איכות לגודל)
canvas.toBlob(blob => upload(blob), 'image/webp', 0.82);
```

**למה WEBP:**
- 30-50% קטן מ-JPEG באותה איכות
- שקיפות (בעתיד לרקע לבן)
- נתמך בכל הדפדפנים המודרניים

**גודל מטרה:** ~50-150KB per image (מ-3-5MB של צילום טלפון)

**Storage path:** `frames/{tenant_id}/{inventory_id}/{timestamp}.webp`

**DB:** טבלת `inventory_images` כבר קיימת! (id, inventory_id, url). רק צריך לוודא שיש tenant_id + RLS.

### 2.6 רקע לבן — כפתור ידני

**פלואו:**
```
עובד מעלה תמונה → רואה תצוגה מקדימה → לוחץ "💫 רקע לבן"
→ Loading: "מעבד תמונה..."
→ Edge Function מקבלת תמונה → מסירה רקע → מחליפה בלבן
→ תמונה מעודכנת מוצגת בתצוגה מקדימה
→ עובד מאשר / מבטל / מנסה שוב
```

**טכני — Edge Function `remove-background`:**

```
אפשרות A: Sharp (Node.js image processing)
  - פשוט, מהיר, בלי API חיצוני
  - מוגבל — עובד טוב על רקעים אחידים (אוהל צילום = בדרך כלל כן)
  - שימוש: threshold + flood fill → replace with white

אפשרות B: Claude Vision API
  - כבר יש לנו API key
  - שולחים תמונה + prompt "remove background, make it white"
  - יותר חכם, אבל יותר איטי ויקר

אפשרות C: remove.bg API / rembg
  - ספציפי להסרת רקע, תוצאות מעולות
  - עלות: ~$0.05 per image
  - API key נוסף לנהל
```

**המלצה:** התחל עם אפשרות A (Sharp) — פשוט, חינם, עובד טוב עם אוהל צילום (רקע אחיד). אם התוצאה לא מספיקה — שדרג ל-B או C.

**הצ'אט המשני צריך:** לבדוק מה הכי מעשי ב-Supabase Edge Function ולהחליט.

### 2.7 שינויי DB

```sql
-- inventory_images כבר קיימת.
-- לבדוק שיש tenant_id + RLS:
ALTER TABLE inventory_images
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill if needed
UPDATE inventory_images SET tenant_id = (
  SELECT tenant_id FROM inventory WHERE id = inventory_images.inventory_id
) WHERE tenant_id IS NULL;

ALTER TABLE inventory_images
  ALTER COLUMN tenant_id SET NOT NULL;

-- RLS
ALTER TABLE inventory_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inventory_images FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Storage bucket
-- "frame-images" (private, tenant-scoped paths)
```

### 2.8 קובץ חדש

```
modules/inventory/
  inventory-images.js    — upload, camera, preview, delete, background removal
```

שינויים ב:
- `inventory-table.js` — כפתור "⋯ עוד" במקום כפתור מחיקה בודד
- `inventory-entry.js` — כפתור 📷 בשורת פריט בהכנסת מלאי
- `receipt-form.js` — כפתור 📷 בשורת פריט בקבלת סחורה (אם רלוונטי)

---

## נושא 3: באגים + יציבות

### 3.1 קריטי — פיצולי קבצים

```
🔴 receipt-form.js — 559 שורות (חייב מתחת 350)
   → פיצול ל: receipt-form.js + receipt-form-items.js

🔴 po-view-import.js — 419 שורות (מעל 350)
   → פיצול ל: po-view.js + po-import.js

🟡 10+ קבצים נוספים מעל 350 שורות
   → הצ'אט המשני יעשה grep ויפצל הכל
```

**כלל ברזל:** אפס שינויי לוגיקה. רק copy-paste + split.

### 3.2 באגים מהפאזה הקודמת (אם עדיין פתוחים)

```
C1. מסמכים לא מופיעים בכרטיס ספק
C2. אין כפתור מחיקת קובץ בגלריה
C3. 🤖 לא נעלם מרשימה אחרי סריקה
M3. PO dropdown = native select
```

**הצ'אט המשני:** בדוק אם תוקנו בפאזה הקודמת. אם לא — תקן.

### 3.3 Stacking event listeners

```
_initReceiptDropzone — listener נוסף בכל פתיחה של modal
→ צריך: removeEventListener לפני add, או flag "initialized"
```

### 3.4 שיפורים שנדחו (לבדיקה — לא חובה)

הצ'אט המשני **יבדוק** את אלה ויציע אם שווה לעשות:

```
- OCR verification על קבלות PO
- Cascading dropdowns בקבלה ידנית
- "אחר" בחשבוניות נכנסות (ספקים שאינם משקפיים)
- "לבירור" status במעקב חובות
- Generic next_sequence_number() RPC
- SELECT MAX audit
- PIN unification
- Monkey-patching refactor
```

**לכל אחד:** בדוק אם שווה עכשיו / דחייה / כמה עבודה. דווח → דניאל מחליט.

---

## סדר ביצוע

```
Phase 3a — קריאת מצב:
  SESSION_CONTEXT + MODULE_SPEC + CLAUDE.md
  בדיקה: אילו באגים עדיין פתוחים?
  בדיקה: אילו קבצים מעל 350 שורות?
  דיווח ממצאים → דניאל מאשר

Phase 3b — Tenant isolation audit + hardening:
  grep מלא → audit → hard isolation → 8 בדיקות
  זה קודם לכל כי זה הדבר הכי קריטי

Phase 3c — פיצולי קבצים:
  receipt-form.js, po-view-import.js, + כל מה שמעל 350
  אפס שינויי לוגיקה → verify zero errors

Phase 3d — תמונות למסגרות:
  1. DB: inventory_images tenant_id + RLS + Storage bucket
  2. inventory-images.js: upload, camera, preview, delete
  3. כפתור "⋯ עוד" בטבלת מלאי
  4. כפתור 📷 בהכנסת מלאי / קבלת סחורה
  5. WEBP conversion + compression client-side
  6. Edge Function remove-background (or alternative)
  7. Verify: mobile camera, desktop upload, preview, delete, background

Phase 3e — באגים שנותרו (C1-C3, M3, event listeners):
  שלב אחד per bug → verify

Phase 3f — סקירת שיפורים נדחים:
  בדוק כל אחד → דווח → דניאל מחליט מה נכנס

Phase 3g — Full regression:
  כל 5 הדפים × כל הפלואו × mobile + desktop
  Zero console errors
  Tenant isolation verified

Phase 3h — Documentation:
  SESSION_CONTEXT, CHANGELOG, MODULE_MAP, db-schema
  Tag
```

---

## חשוב

- **Tenant isolation קודם לכל.** בלי זה — אין SaaS.
- **תמונות = mobile-first.** העובד מצלם מהטלפון. ה-UI חייב לעבוד מצוין על מסך קטן.
- **WEBP + compression client-side.** לא לשלוח 5MB לserver כש-100KB מספיק.
- **"⋯ עוד" תפריט** — הזדמנות לנקות את טבלת המלאי. כל הפעולות (תמונות, עריכה, היסטוריה, מחיקה, זיכוי) ב-dropdown אחד.
- **רקע לבן = כפתור, לא אוטומטי.** עובד מחליט per תמונה.
- **פיצולי קבצים = אפס לוגיקה.** רק copy-paste + split.
