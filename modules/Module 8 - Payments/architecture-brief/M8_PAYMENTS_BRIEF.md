# M8 — Payments — Architecture Brief

**גרסה:** v1
**תאריך:** 2026-05-09
**מחבר:** Main Strategic (skill `opticup-main-strategic`)
**יעד:** Module Strategist של M8 (skill `opticup-strategic`).

> זה לא SPEC. שכבת-ביניים בין Master Plan ל-SPEC. מגדיר ישויות, חוזים, דפוסים, סיכונים — לא acceptance criteria, לא שדות-מלאים, לא phases.

---

## 1. ייעוד M8 — שורת-מטרה אחת

M8 הוא **orchestration layer של ERP, לא תוכנת-קופה.** הוא מנהל את החלק-העסקי של תשלומים (כמה חייב הלקוח, איזה סוג-תשלום, מה הסטטוס, איך זה מתחבר להזמנה), בעוד **הקופה החיצונית** (Linet, Gama Pay, וכו') מנפיקה את הקבלה/חשבונית-המס החוקית לפי חוק-מע"מ.

**הזיהוי-המנחה:** Optic Up רושם, מקשר, סוגר. הקופה מסלקת ומנפיקה. שני תפקידים שונים — שניהם נדרשים, ולא ניתן להחליף ביניהם.

**Scope migration:** 9,828 קבלות + 1,160 רשומות-אשראי-בתשלומים מ-OpticPlus (`tb_kabala` + `tb_credits`). 8 סוגי-תשלום מקוריים → 6 סוגים-עיקריים אחרי ש-"נסגר" ו-"ניכוי" סווגו כ-adjustments-לא-תשלומים.

**ה-Strategic-Decision המרכזי:** Provider Adapter Pattern עם 3 שכבות. Adapter (קוד-Optic-Up פר-ספק) → Adapter Manifest (DB) → Tenant Config UI (המסך הזה). הוספת ספק חדש = adapter חדש + מניפסט, אפס שינוי במסכים שצורכים את הנתונים.

---

## 2. ישויות (גוש 1)

### 2.1 `payments` — רשומת-תשלום

ישות-מרכזית. כל תשלום-בודד נרשם כאן, מקושר להזמנה.

**שדות-מנהליים:**
- `id` (uuid, PK), `tenant_id`, `order_id` (FK ל-orders של M7), `customer_id` (FK ל-M5).
- `created_at`, `created_by` (אופטומטריסט/קופאי).
- `payment_method_id` (FK ל-`payment_methods` של ה-tenant).
- `payment_channel_id` (FK ל-`payment_channels` של ה-tenant — Linet/Gama Pay/etc.).
- soft-delete (Iron Rule 3).

**שדות-עסקיים:**
- `amount` (decimal, ב-ILS).
- `external_receipt_number` (string, מהקופה החיצונית) — NULL עד שהקופה מנפיקה.
- `external_auth_code` (string, מהקופה — לאשראי).
- `installments_count` (int, רלוונטי לאשראי בלבד).
- `status` enum (ראה State Machine §3.1).
- `invoice_recipient_name` (string, אופציונלי) — אם מולא, החשבונית הוצאה ע"ש זה ולא ע"ש הלקוח.
- `notes` (text, אופציונלי).

**שדות-שיק (אם payment_method = "שיק"):**
- `check_number` (string).
- `check_due_date` (date) — תאריך-פרעון. אם = היום → סטטוס מיידי "שולם". אם עתידי → "ממתין-לפרעון".
- `check_bank_branch` (string).
- `check_account` (string).
- `check_deposit_date` (date, nullable) — מתי הופקד בפועל.
- `check_bounce_reason` (text, nullable) — אם חזר.

**יחסים:**
- N:1 → `orders` (M7).
- N:1 → `customers` (M5).
- N:1 → `payment_methods`.
- N:1 → `payment_channels`.

### 2.2 `payment_methods` — סוגי-תשלום פעילים פר-tenant

טבלה דינמית פר-tenant. פריזמה מפעילה 6 סוגים: אשראי, מזומן, העברה, שיק, ביט, ירד-ממשכורת.

**שדות-זיהוי:**
- `id`, `tenant_id`, `code` (slug — credit/cash/transfer/check/bit/salary_deduction), `name_he`, `name_en`.

**שדות-תפעוליים:**
- `is_enabled` (boolean).
- `requires_pos` (boolean) — האם חייב לעבור בקופה. ב-day-1: כל הסוגים true חוץ מ-"שיק-דחוי" ו-"ירד-ממשכורת".
- `requires_external_receipt` (boolean) — האם הסטטוס "שולם" דורש מספר-קבלה. False ל-"ירד-ממשכורת" וצ'ק-דחוי-טרם-פרעון.

**שדות-תצוגה:**
- `icon` (string), `display_order` (int).
- `tenant_default` (boolean) — האם זה ה-default-method ל-tenant.

### 2.3 `payment_channels` — ערוצי-סליקה פר-tenant

טבלה דינמית פר-tenant. פריזמה מגדירה 2: Linet (default) + Gama Pay.

**שדות-זיהוי:**
- `id`, `tenant_id`, `adapter_name` (FK ל-`payment_adapters`), `display_name`.

**שדות-credentials:**
- `credentials_jsonb` (jsonb, מוצפן) — תוכן השדות שה-adapter מצהיר עליהם ב-schema. שונה פר-adapter (Linet ≠ CardCom ≠ Tranzila).

**שדות-תפעוליים:**
- `is_enabled` (boolean).
- `is_default` (boolean) — ה-channel המופיע בברירת-מחדל ב-Checkout.
- `fallback_channel_id` (FK ל-`payment_channels`, nullable) — אם הראשי לא זמין.
- `last_health_check_at`, `last_health_check_status`.

**שדות-קונפיגורציה:**
- `enabled_capabilities_array` (jsonb) — אילו capabilities מהפול הפעיל ה-tenant על ה-adapter הזה.
- `settlement_mode` (string) — מתוך הרשימה ש-adapter מצהיר עליה (פדיון/תשלומים-רגילים/...).
- `settlement_fee_percent` (decimal).
- `permission_role_ids` (jsonb) — אילו תפקידים יכולים להשתמש בערוץ הזה.

### 2.4 `payment_capabilities` — pool גלובלי של יכולות

טבלת-מטא, גלובלית (לא פר-tenant). כל הצוות של Optic Up יכול להוסיף שורות. רשימה כוללת: credit, cash, check, installments, bit, apple_pay, google_pay, crypto, qr, tokenization, webhook, partial_capture, void.

**שדות:**
- `id`, `code`, `name_he`, `name_en`, `category` (core/credit/digital/api/advanced).

זוהי טבלת-קטלוג. ה-adapters מתייחסים אליה.

### 2.5 `payment_adapters` — מניפסט ספקי-סליקה

טבלת-מטא, גלובלית. כל adapter שפותח ב-Optic Up מוכרז כאן.

**שדות:**
- `id`, `name` (slug — linet/gama_pay/z_credit/cardcom/tranzila/pelecard/mock).
- `display_name`, `version`, `description`.
- `auth_method` (basic/oauth/api_key/credentials).
- `credentials_schema_jsonb` — schema של השדות שה-adapter דורש. כל שדה: שם, סוג, חובה, validator, placeholder.
- `supported_capabilities_array` — אילו capabilities מהפול ה-adapter תומך.
- `supported_settlement_modes_array` — אילו settlement modes ה-adapter תומך.
- `is_active` (boolean) — האם adapter מותקן ופעיל.
- `requires_nda` (boolean) — האם דורש NDA לפני שימוש.

זה הקלט ל-UI שבונה טפסים-דינמיים.

### 2.6 `salary_deduction_pending` — תצוגה ולא טבלה-עצמאית

לא ישות חדשה — view של `payments` עם status='ממתין-לחיוב-משכורת'. Optic Up לא יוצר טבלה-נפרדת לירד-ממשכורת. הוא משתמש ב-flag במצב של רשומת-תשלום רגילה.

---

## 3. State Machines (גוש 2)

### 3.1 State Machine של תשלום

```
ממתין-לקופה ──→ שולם
     │
     ↓
ממתין-לפרעון (צ'ק-דחוי בלבד) ──→ בבנק ──→ נפרע
     │                                  │
     ↓                                  ↓
ממתין-לחיוב-משכורת ──→ נוכה          חזר ──→ ההזמנה נפתחת
     (ירד-ממשכורת בלבד)                 (יתרה חוזרת)
```

**מעברים:**
- **ממתין-לקופה → שולם:** ברגע שמספר-קבלה הוקלד מהקופה. תקף לאשראי, מזומן, ביט, העברה, צ'ק-יומי.
- **ממתין-לפרעון → בבנק:** ביום-הפרעון, אחראי-חשבונות מסמן "✓ הופקד".
- **בבנק → נפרע:** אחרי ש-Optic Up שלח לקופה ומספר-קבלה הוחזר.
- **בבנק → חזר:** אם הבנק החזיר את הצ'ק. סיבה אופציונלית (אין-כיסוי / חתימה / חשבון-סגור).
- **חזר → ההזמנה נפתחת:** היתרה של ההזמנה חוזרת. M7 מקבל אירוע ומפעיל פעולת-מערכת.
- **ממתין-לחיוב-משכורת → נוכה:** אחראי-חשבונות מסמן "✓ נוכה" בדוח-החודשי של M11.

### 3.2 State Machine של ערוץ-סליקה

```
לא-מחובר ──→ פעיל ──→ שגוי
              │            │
              ↓            ↓
            מבוטל    [התראה לבעל-עסק]
```

- **לא-מחובר → פעיל:** אחרי הקלדת credentials + בדיקת-חיבור מוצלחת.
- **פעיל → שגוי:** ping ל-API נכשל פעמיים-ברציפות.
- **שגוי → fallback:** Optic Up עוברת אוטומטית ל-ערוץ-fallback אם מוגדר.
- **פעיל → מבוטל:** בעל-עסק לוחץ "🚫 בטל ערוץ".

---

## 4. חוזים מול מודולים אחרים (גוש 2)

### 4.1 M7 — Orders

**Direction:** M7 → M8 (M7 קורא ל-M8 ליצירת תשלום).

- ב-M7, כשהזמנה מציגה את בלוק-תשלומים בפינה הימנית-תחתונה, היא קוראת ל-M8: `getPaymentsForOrder(order_id)` ומציגה את התוצאה.
- כשקופאי לוחץ "פתח תשלום" ב-M7, נפתח ה-Checkout של M8 בתוך M7 (לא מסך-נפרד).
- כשהזמנה מקבלת תשלום-ראשון בסטטוס "שולם" עם amount ≥ 1 ↔ M7 משנה את ה-`order.status` מ-`quote` ל-`active` ושולח אירוע "תודה" ל-M12.
- צ'ק שחזר → M8 שולח אירוע ל-M7 → ההזמנה נפתחת מחדש (יתרה חוזרת).

**M8 לא קורא ל-M7 ישירות לעולם.** M8 מפיק אירועים ש-M7 מאזין להם.

### 4.2 M5 — Customers

**Direction:** M5 → M8 (קריאה).

- בכרטיס-לקוח, טאב "תשלומים-והיסטוריה" קורא ל-M8: `getPaymentsByCustomer(customer_id)` ומציג היסטוריה.
- אם תשלום נרשם עם `invoice_recipient_name` → נשמר אצל M5 כשורה בהיסטוריית-הלקוח: "חשבונית הוצאה ע"ש [שם] בתאריך [Y]".

### 4.3 M11 — Reports

**Direction:** M11 → M8 (קריאה).

- M8 חושפת View אחת מרכזית: `v_payments_for_reports`. View זאת מאוחדת על-פני כל-הסטטוסים, עם פילוחי-מטא לקריאה (פר-יום, פר-אופטומטריסט, פר-ערוץ, פר-קופ"ח, פר-סוג).
- M11 מחבר את ה-View לדוחות שלו: סוף-יום-קופה, סוף-חודש, פילוח-קופ"ח להחזרים, ירד-ממשכורת-חודשי, LTV.

### 4.4 M11 — דוח ירד-ממשכורת

**זה לא חוזה-קוד אלא חוזה-תפקיד.** M8 רושם תשלומים-של-ירד-ממשכורת בסטטוס "ממתין-לחיוב-משכורת". M11 בונה דוח חודשי על-בסיס ה-View הזו, מציג רשימה לאחראי-חשבונות עם checkbox "✓ נוכה" ליד כל רשומה. סימון "✓ נוכה" → קריאה לפונקציית M8 שמשנה את הסטטוס ל"נוכה".

זה הסדר-של-mutation-from-M11. בדרך-כלל M11 הוא read-only, אבל לסטטוס-שינוי-של-ירד-ממשכורת יש חוזה-מותר.

### 4.5 M2 — Platform Admin

**Direction:** M2 → M8 (קריאת roles).

- ב-Provider Configuration, ה-dropdown של "הרשאה לשימוש" ב-payment_channel קורא מ-M2 את `getRolesForTenant(tenant_id)`.
- אופציה "+ צור תפקיד חדש..." בתחתית ה-dropdown מנווטת למסך-Roles של M2.

### 4.6 M12 — Communications

**Direction:** M12 → M8 (אירוע אסינכרוני).

- כשתשלום-ראשון נרשם בסטטוס "שולם" → M12 שולחת "תודה" ללקוח (כפי שכבר תועד ב-M7).
- צ'ק-דחוי שמתקרב לתאריך-פרעון → M12 שולחת תזכורת ללקוח (אופציונלי, deferred).

### 4.7 Finance Hub (M-עתידי, post-launch)

**Direction:** Finance Hub → M8 (קריאה דרך View).

- מסך-Pipeline-צ'קים של M8 מזין את Finance Hub עם תזרים-עתידי.
- העתידי ייצרך חיבור-בנקים, AI-להתאמת-חשבוניות, תקציב-הוצאות. M8 רק מספק לו את חתיכת-הצ'קים.
- לא ב-Master Live Plan, נמצא ב-MASTER_ROADMAP כ-future module.

### 4.8 M4 — CRM

**Direction:** M8 → M4 (אירוע).

- צ'ק שחזר → M8 שולח ל-M4 אירוע "פתח-משימה: התקשר-ללקוח [שם] לגבי צ'ק-שחזר ₪X של הזמנה Y".
- M4 פותח task ידני לאחראי-CRM.

---

## 5. דפוסי-עיצוב מפתח (גוש 3)

### 5.1 Provider Adapter Pattern (Iron Rule 13)

**הפטרן המרכזי של M8.** 3 שכבות נפרדות:

(1) **Adapter (קוד).** קלאס פר-ספק (LinetAdapter, GamaAdapter, ZCreditAdapter, MockAdapter). מיישם ממשק `IPaymentProvider` עם מתודות אחידות (chargeOrder, refundTransaction, getStatus, listTransactions). אופציונליים: voidTransaction, tokenizeCard, registerWebhook.

(2) **Adapter Manifest (DB).** טבלת `payment_adapters` עם מניפסט פר-adapter — מצהיר על capabilities, credentials-schema, settlement-modes שהוא תומך.

(3) **Tenant Config (DB + UI).** טבלת `payment_channels` פר-tenant — איזה adapter פעיל, איזה credentials, איזה capabilities מופעלים.

הוספת ספק חדש = adapter חדש + מניפסט. ה-UI בונה את עצמו דינמית. אפס שינוי בקוד-הליבה.

### 5.2 Schema-driven UI Forms

טופס-credentials של ערוץ-סליקה לא קשיח בקוד. ה-UI קורא את ה-schema מ-`adapter.credentials_schema_jsonb` ובונה שדות דינמית. כל adapter עם schema אחר → טופס אחר. אותו קוד-UI.

### 5.3 Capability flags pool — לא enum

`payment_capabilities` היא טבלה גלובלית של pool. כל adapter מצהיר על תת-קבוצה. UI מציג רק toggles של מה ש-adapter תומך. הוספת capability עתידית (Apple Pay, מטבע-קריפטו) = שורה ב-pool, מופיעה אוטומטית ב-UI של adapters שתומכים.

### 5.4 Optic Up first, POS executes (חוקי)

הפיצול מוקלד ב-Optic Up לפני שמגיעים לקופה. הקופה מבצעת כל leg בנפרד ומחזירה מספרי-קבלה. Optic Up רושם את ה-mapping בין leg ל-receipt.

הסיבה: Linet (וכל הקופות הישראליות) לא חושפות API חוזר עם פירוט-פיצול. הסכום-הכולל יחזור ב-webhook (אם בכלל), אבל לא הפיצול.

### 5.5 Manual receipt-number entry (day-1)

אחראי-המשמרת מקליד את מספר-הקבלה ידנית אחרי שהקופה הנפיקה. בעתיד עם API-חוזר תקין → השדה הופך ל-readonly עם מקור-API. אותו מסך, אותם שדות, רק המקור משתנה.

### 5.6 Channel-aware payment record

כל רשומת-תשלום שמורה גם עם `payment_channel_id`. דוח סוף-יום-קופה מפלח לפי ערוץ. בעתיד אם tenant יוסיף ערוץ-שלישי (Tranzila) — הדוח מפלח ל-3 בלוקים אוטומטית.

### 5.7 Deferred-payment handling (צ'ק-דחוי)

צ'ק-דחוי = החריג-החוקי היחיד ל-"כל-תשלום-עובר-בקופה". נרשם ב-Optic Up בלי-קופה ביום-המכירה. ביום-הפרעון של כל-אחד → באנר-התראה במסך-הראשי של Optic Up. לחיצה על הבאנר → Optic Up שולח לקופה → הקופה מנפיקה קבלה → הסטטוס משתנה ל-"נפרע". זה הופך את "אסור-לשכוח-להעביר-לקופה" לפעולה-מובנית בתהליך.

### 5.8 Internal vs External payments

**External (POS-required):** אשראי, מזומן, ביט, העברה, שיק-יומי, צ'ק-דחוי-ביום-הפרעון.
**Internal (no POS):** ירד-ממשכורת בלבד. זה הסדר-פנימי-לעובד, לא תשלום-לקוח. נרשם בסטטוס "ממתין-לחיוב-משכורת" → "נוכה" אחרי אישור-חודשי של אחראי-חשבונות.

### 5.9 Configuration over enum (Iron Rule 19)

כל המבנים-המוגדרים-פר-tenant הם טבלאות, לא enums:
- payment_methods (פריזמה הפעילה 6, tenant-2 יבחר אחרים).
- payment_channels (פריזמה: Linet+Gama, tenant-2 יבחר אחרים).
- payment_capabilities (גלובלי, אבל פעיל-לא-פעיל פר-tenant).
- settlement_modes (גלובלי, נתמך-לא-נתמך פר-adapter).

תוצאה: tenant-חדש מצטרף ללא שינוי-קוד.

### 5.10 Tenant-isolation (Iron Rules 14-15)

כל הטבלאות עם `tenant_id` + RLS-policy. credentials מוצפנים. service_role bypass לפעולות-מערכת.

---

## 6. סיכונים ונושאים-לתשומת-לב (גוש 4)

### 6.1 Linet — אין reverse-sync

Linet לא חושפת API פתוח. סוף-יום-קופה דורש הקלדה ידנית של 5 סכומים פר-ערוץ. Z Credit, CardCom, Tranzila יציעו webhook חלקי-בעתיד. Day-1: כל הקלדה היא ידנית.

**Mitigation:** schema-driven, אז כשיגיע API חוזר — שינוי שדה מ-input ל-readonly עם source.

### 6.2 NDA לא חתום עם Z Credit / Linet

Z Credit ו-Linet דורשות NDA לפני גישה ל-docs. Linet ב-day-1 דורש משא-ומתן + פיתוח adapter. Day-1 של פריזמה: אם Linet לא יחתום בזמן → fallback ל-Mock Adapter עד ש-Linet adapter מוכן.

**Mitigation:** Mock Adapter תמיד פעיל. גם פותר את QA.

### 6.3 שגיאת-קופאי בערוץ-סליקה

קופאי בוחר את הערוץ הלא-נכון בטעות (Gama במקום Linet). זה לא נתפס מיד, אבל יתגלה בסוף-יום-קופה כפער. תיקון אז יהיה מסובך.

**Mitigation:** ערוץ-default מוצג כברירת-מחדל-נסתרת (99% מהזמן). שינוי דורש לחיצה מודעת על "🔄 ערוץ-אחר". בנוסף, סוף-יום-קופה תופס את הסטיה מיד.

### 6.4 שגיאת-תרגום-מטבע (agorot vs shekels)

Linet עובד ב-agorot (₪1 = 100). אם adapter שולח ₪500 בלי-להמיר ל-50,000 agorot → טעות ×100.

**Mitigation:** כל adapter מחויב ב-internal-conversion במתודות שלו. Optic Up תמיד מעביר shekels. Unit tests פר-adapter.

### 6.5 מיגרציה של 1,160 רשומות-אשראי-בתשלומים מ-OpticPlus

`tb_credits` ב-FE של OpticPlus מכיל רשומות שלא הסתיימו. צריך להעביר עם הסטטוס הנכון.

**Mitigation:** לא ב-day-1 של M8. שייך ל-cutover-script נפרד. SPEC-של-מיגרציה ייכתב בנפרד.

### 6.6 ספק שלא ב-pool — תהליך הוספה

tenant יבקש Apple Pay או QR — זה דורש פיתוח adapter חדש (2-4 שבועות).

**Mitigation:** "צור-קשר" tile ב-pool. UI ל-tenant ל-track של הבקשה. לא ב-day-1, אבל מוסבר ב-info-banner.

---

## 7. דרישות-מערכת לא-בטפסים (גוש 5)

### 7.1 4 מסכי-M8

(1) **Checkout** — בלוק בתוך M7 (לא מסך-נפרד). 6 סוגי-תשלום, ערוץ-סליקה-נסתר, שדות-דינמיים פר-סוג, מספרי-קבלה, שם-על-חשבונית.

(2) **Pipeline-צ'קים** — מסך-עבודה לאחראי-חשבונות + תזרים-עתידי לבעל-עסק. 5 סטטוסים, 4 KPIs, סינון-מהיר, ייצוא-Excel, מודאל-"הופקד".

(3) **סוף-יום-קופה** — מסך-עבודה לאחראי-משמרת. 3 צעדים: השוואה-פר-ערוץ (הקלדה ידנית) → ספירת-מזומן → סגירה. תצוגה-מוקדמת של הדפסה עם תיבות-✓ + שורת-מזומן בולטת.

(4) **Provider Configuration** — מסך-Admin לבעל-עסק. רשימת-ערוצים, הרחבה-בלחיצה, אשף-3-שלבים להוספה. שדות-דינמיים פר-adapter.

### 7.2 Bulk operations

- "ייצא Excel" בכל הדוחות (Pipeline, סוף-יום, Provider Config).
- "סמן הכל" בדוח-ירד-ממשכורת ב-M11.
- "+ הוסף ערוץ-סליקה" — אשף-3-שלבים.

### 7.3 Audit log

כל שינוי בסטטוס-תשלום (שולם → חזר, ממתין → נפרע) נרשם ב-`activity_log` של M1.5. כל עריכה ב-Provider Configuration נרשמת. כל סגירת-יום-קופה נרשמת עם snapshot-של-הסכומים.

### 7.4 Permission gates

- Checkout: כל-הקופאים (תפקיד `cashier` ומעלה).
- Pipeline-צ'קים: אחראי-חשבונות ובעל-עסק.
- סוף-יום-קופה: אחראי-משמרת ובעל-עסק.
- Provider Configuration: בעל-עסק בלבד.
- "סגור-יום" + "ערוך-תשלום-של-יום-סגור": בעל-עסק בלבד.

---

## 8. החלטות-מפורשות שננעלו בסבב הזה

1. **M8 = ERP, לא תוכנת-קופה.** הקופה החיצונית מנפיקה את הקבלה החוקית. (Daniel directive 2026-05-08.)
2. **כל תשלום עובר בקופה לפי חוק-מע"מ** — מזומן וצ'ק-יומי כלולים. צ'ק-דחוי = החריג היחיד.
3. **6 סוגי-תשלום פעילים אצל פריזמה.** "נסגר" ו-"ניכוי" סווגו כ-adjustments-לא-תשלומים.
4. **ירד-ממשכורת = סוג-תשלום פעיל ב-Checkout** (לא מסך-נפרד). סטטוס "ממתין-לחיוב-משכורת" → "נוכה" אחרי סימון-חודשי בדוח-M11.
5. **payment_methods = טבלה פר-tenant** (Iron Rule 19). פריזמה הפעילה 6, tenant-2 יבחר אחרים.
6. **אופן-קבלה אשראי (פדיון/תשלומים-רגילים) = הגדרת-tenant.** הקופאי לא רואה ולא בוחר.
7. **פיצול = ב-Optic Up first, קופה executes.** אין reverse-sync אמין באף קופה ישראלית.
8. **מספר-קבלה הוקלד ידנית ב-day-1.** בעתיד API-חוזר → readonly אוטומטי.
9. **צ'ק-דחוי = חריג-חוקי.** נרשם בלי-קופה. ביום-הפרעון → באנר-התראה → לחיצה → קופה → סוגר.
10. **N צ'קים על אותה הזמנה.** כל אחד שורה-נפרדת, סטטוס-נפרד, התראה-נפרדת.
11. **שדה "שם על חשבונית" = אופציונלי בכל סוג-תשלום.** נשמר בהיסטוריית-הלקוח.
12. **ערוץ-סליקה = נסתר ברירת-מחדל.** "🔄 ערוץ-אחר" לבחירה ידנית. זמין בכל סוגי-התשלום.
13. **Provider Adapter Pattern עם 3 שכבות.** Adapter (קוד) → Manifest (DB) → Tenant Config (UI דינמי).
14. **capability flags = pool גלובלי דינמי.** הוספת יכולת-עתידית ללא שינוי-UI.
15. **credentials = schema-driven.** UI בונה טופס דינמית מ-manifest פר-adapter.
16. **settlement_modes = pool גלובלי.** adapter מצהיר אילו תומך.
17. **הרשאות = roles-של-tenant מ-M2.** לא enum-קשיח.
18. **סוף-יום-קופה = הקלדה-ידנית-של-Linet+Gama.** פילוח כפול: סוג-תשלום + ערוץ-סליקה.
19. **שורות-עם-פער = אדומות אוטומטית.** סטיות בולטות ויזואלית.
20. **"סגור-יום" = lock.** עריכה דורשת הרשאת-מנהל.

---

## 9. מה לא ב-Brief הזה (Day-1 skeleton — דחוי לעתיד)

### 9.1 Adapters לא-Day-1
- **Z Credit / Linet adapters במלואם** — תלוי NDA. Mock Adapter תופס את החלל.
- **CardCom / Tranzila / Pelecard adapters** — לא ב-day-1, פיתוח-עתידי לפי דרישת-tenant.
- **Apple Pay / Google Pay / QR / Crypto** — adapters עתידיים. לא נדרש שינוי-קוד-ב-M8.

### 9.2 פיצ'רים שעוברים למודולים אחרים
- **דוחות-תשלומים מתקדמים** (LTV, רבעוני, שנתי) → M11.
- **דוח ירד-ממשכורת חודשי** + סימון "נוכה" → M11.
- **חישוב-עמלות-לאופטומטריסטים** → M11.
- **חישובי-החזר-קופ"ח אוטומטיים** → M11.
- **תזרים-מלא + הוצאות + חיבור-בנקים** → Finance Hub (post-launch).
- **AI להתאמת חשבוניות-נכנסות** → Finance Hub.

### 9.3 Flows לא-Day-1
- **החזרים (refunds)** — flow נפרד ב-SPEC-נוסף.
- **Settlement-Pipeline (T+1/T+3)** — לא ב-M8. שייך ל-Finance Hub.
- **multi-branch defaults** (ערוץ פר-סניף).
- **2FA / SSO לכניסה ל-Provider Config** → M2.
- **תזכורות-תוקף ל-credentials / NDA** — flow נפרד.
- **UI ל-"בקשת-adapter-חדש"** — תהליך-פיתוח של Optic Up עצמה.
- **אינטגרציה אוטומטית עם תוכנת-שכר** (לירד-ממשכורת).

### 9.4 מיגרציה
- **1,160 רשומות-אשראי-בתשלומים** מ-OpticPlus → SPEC-מיגרציה נפרד.
- **9,828 רשומות-קבלה** היסטוריות → archive-only, לא נטען ל-M8.

---

## 10. הצעדים הבאים (לקראת SPEC)

### 10.1 לפני שה-Module Strategist מתחיל

(1) **NDA דיון עם Linet.** דניאל לבדוק מה הזמן-המשוער. אם > 8 שבועות → adapter Mock עד אז.
(2) **NDA עם Gama Pay.** לאמת שיש access ל-API.
(3) **CardCom / Tranzila — sandbox accounts.** שני האלה יש ל-public APIs, ניתן להתחיל אינטגרציה לפני NDA רשמי.

### 10.2 כשה-Module Strategist מקבל את ה-Brief

(1) **לכתוב ROADMAP** — phases של M8 ב-detail. הצעה:
   - Phase 1: foundation (DB tables, RLS, types, Mock Adapter).
   - Phase 2: Checkout screen + payment_methods.
   - Phase 3: Pipeline-צ'קים + flow של "הופקד".
   - Phase 4: Linet Adapter (or Mock-only if NDA pending).
   - Phase 5: סוף-יום-קופה.
   - Phase 6: Provider Configuration UI.
   - Phase 7: Gama Pay Adapter.
   - Phase 8: Migration (1,160 רשומות).
   - Phase 9: M11 integration (דוחות).

(2) **לכתוב SPECs פר-phase.** כל SPEC עם acceptance criteria, success metrics, deliverables.

(3) **לסנכרן עם M7** — כשה-Checkout נכנס לתוך M7, להבטיח שהחוזה עובד.

(4) **לסנכרן עם M11** — לתת ל-M11 Strategist את רשימת-ה-Views ש-M8 חושפת.

### 10.3 קישורים מרכזיים

- **MASTER_LIVE_PLAN:** `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md`
- **MASTER_ROADMAP:** `MASTER_ROADMAP.md` (Finance Hub עתידי)
- **M8 Sketches:** 4 mockups + 4 dossiers של מחקר ב-`__LAUNCH_PLAN_DRAFT__/architecture-briefs/M8 - Payments/`
- **M7 Brief:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/M7 - Orders/M7_ORDERS_BRIEF.md` (חוזה M7-M8)

---

## 11. קישורים

### Mockups (4)
- `M8_CHECKOUT_MOCKUP_V3.html` — מסך-תשלום (בתוך M7)
- `M8_CHECKS_PIPELINE_MOCKUP_V1.html` — Pipeline-צ'קים-דחויים
- `M8_DAILY_CLOSE_MOCKUP_V2.html` — סוף-יום-קופה
- `M8_PROVIDER_CONFIG_MOCKUP_V2.html` — הגדרות ערוצי-סליקה

### Research dossiers (4)
- `M8_RESEARCH_DIGEST.md` — מחקר ראשון (8 קטגוריות)
- `M8_PROVIDER_INTERFACE_RESEARCH.md` — סריקת API-דרישות-קופות (Linet, Z Credit, CardCom, Tranzila, Pelecard, Gama, יחיד, Heshev)
- `M8_REVERSE_SYNC_RESEARCH.md` — האם הקופות חושפות API חוזר (תשובה: לא באף אחת)
- `M8_LEGAL_REQUIREMENTS_RESEARCH.md` — חוק-מע"מ + רשות-המסים — מי מנפיק קבלות חוקיות

### Handoff
- `M8_HANDOFF.md` — handoff מהסשן הקודם

---

*סוף M8 Architecture Brief v1. כתב 2026-05-09 על-ידי Main Strategic. נמסר ל-Module Strategist לכתיבת ROADMAP + SPECs.*
