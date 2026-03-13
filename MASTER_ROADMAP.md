# Optic Up — Master Roadmap

> **מסמך זה הוא "מוח הפרויקט".**
> אם הצ'אט האסטרטגי מוחלף — מדביקים את המסמך הזה בצ'אט החדש.
> הצ'אט החדש צריך להבין הכל בלי שום הסבר נוסף.
> עודכן לאחרונה: מרץ 2026

---

## חלק 1 — מה זה Optic Up

### שני מוצרים, DB אחד

**Optic Up ERP** — מערכת ניהול פנימית לעובדי חנות אופטיקה.
**Optic Up Storefront** — אתר חנות/ויטרינה ללקוח הקצה.

שניהם קוראים מאותו Supabase. Storefront קורא רק מ-Views ו-RPC, אף פעם מטבלאות ישירות.

### המטרה הסופית
**Optic Up = פלטפורמת SaaS לרשתות וחנויות אופטיקה.**
כל חנות שמצטרפת מקבלת: מערכת ניהול + אתר חנות ממותג.
Multi-tenant, multi-branch, scalable, configurable, professional.

### הלקוח הראשון
**אופטיקה פריזמה** — רשת ישראלית. Access + תוכנת מעבדה נפרדת + אתר WooCommerce.

### האסטרטגיה
בונים ליד Access, מחליפים בהדרגה. כל מודול עובד גם עם bridge וגם standalone.

---

## חלק 2 — סטאק טכנולוגי

**ERP:** Vanilla JS, HTML נפרד לכל מודול, GitHub Pages, Supabase.
**Storefront (מתוכנן):** Astro/Vanilla SSG, Vercel, repo נפרד, קורא רק Views.
**Supabase:** `https://tsxrrxzmdxaenlvocyit.supabase.co`
**Repo:** `opticalis/opticup`
**URL:** `https://opticalis.github.io/opticup/`

---

## חלק 3 — שיטת עבודה (4 שכבות)

```
🏛️ צ'אט אסטרטגי ראשי (מנכ"ל) — מסמך: MASTER_ROADMAP.md
├── 📋 צ'אט אסטרטגי למודול (מנהל מוצר) — מסמך: ROADMAP.md של המודול
│   └── 🔧 צ'אט מפקח (מנהל עבודה) — כותב פרומפטים ל-Claude Code
│       └── ⚡ Claude Code (terminal) — מבצע בלבד
```

---

## חלק 4 — איפה אנחנו עכשיו (מרץ 2026)

### ✅ מודול 1 — מלאי מסגרות
**הושלם עד פאזה 3.8.** פאזות 4-6 (חובות ספקים, AI, פורטל ספקים) ממתינות.
12 טבלאות, 34+ פיצ'רים. כולל: Auth + 5 תפקידים, tenant_id על כל הטבלאות, RLS, Access bridge, PO, ספירת מלאי, מסך בית, sticky header.

### ⬜ מודול 2 — Platform Admin — הבא בתור

### כל השאר — טרם התחיל

---

## חלק 5 — סדר בנייה מלא

| סדר | מודול | סטטוס | למה בסדר הזה |
|-----|-------|-------|--------------|
| 1 | מלאי מסגרות | ✅ (פאזות 0-3.8) | הבסיס — הכאב הראשי |
| **2** | **Platform Admin Basics** | **⬜ הבא** | **תשתית SaaS — כל מודול אחריו נשען על זה** |
| 3 | Storefront Showcase | ⬜ | ROI מיידי — אתר חנות ממלאי קיים |
| 4 | לקוחות CRM | ⬜ | חוסם הזמנות + בדיקות + WhatsApp |
| 5 | הזמנות | ⬜ | הליבה — מתחיל להחליף Access |
| 6 | בדיקת עיניים | ⬜ | תלוי בלקוחות + הזמנות |
| 7 | תשלומים | ⬜ | תלוי בהזמנות |
| 8 | Storefront Full | ⬜ | עגלה + תשלום + מעקב הזמנה |
| 9 | מעבדה + KDS | ⬜ | אחרי הזמנות + תשלומים = native |
| 10 | מלאי עדשות | ⬜ | אותה ארכיטקטורה כמו מודול 1 |
| 11 | סניפים | ⬜ | MVP = סניף אחד |
| 12 | מעקב הזמנות Dashboard | ⬜ | צריך נתונים מהכל |
| 13 | WhatsApp אוטומטי | ⬜ | צריך לקוחות + הזמנות + token |
| 14 | דוחות | ⬜ | צריך נתונים מכל המודולים |
| 15 | כספים ספקים (פאזה 4 ממודול 1) | ⬜ | חשבוניות, תשלומים, סגירה חודשית |
| 16 | סוכן AI (פאזה 5 ממודול 1) | ⬜ | OCR חשבוניות, התראות |
| 17 | פורטל ספקים (פאזה 6 ממודול 1) | ⬜ | read-only per supplier |
| 18 | WooCommerce sync | ⬜ | סנכרון דו-כיווני |
| 19 | קופה אנדרואיד | ⬜ | חיבור POS |

---

## חלק 6 — מודול 2: Platform Admin — עיצוב מלא

### הפילוסופיה: טבלאות עכשיו, UI בהדרגה

**כל הטבלאות נבנות עכשיו עם כל השדות** — גם אם אין UI לכולם. ככה שום מודול עתידי לא דורש migration. UI נבנה בשלבים: מינימום עכשיו, שאר כשצריך.

### למה חייב עכשיו ולא אחר כך

כל מודול שנבנה בלי Platform Admin מכיל הנחות סמויות:
- "יש tenant אחד" → לא בודקים plan limits
- "Auth = PIN" → אין הפרדה בין בעל פלטפורמה לעובד חנות
- "Config = hardcoded" → כל חנות חדשה דורשת שינויי קוד
- "אין provisioning" → הוספת חנות = עבודה ידנית של שעות

ככל שיותר מודולים נבנים ככה — יותר מודולים צריך לתקן אחר כך.

---

### DB — טבלאות שנבנות במודול 2

**טבלת `tenants` — כבר קיימת, צריכה הרחבה:**
```sql
tenants (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,              -- "אופטיקה פריזמה"
  slug            TEXT UNIQUE NOT NULL,       -- "prizma"
  
  -- סטטוס ומחזור חיים
  status          TEXT DEFAULT 'trial',       -- 'trial' / 'active' / 'suspended' / 'cancelled'
  trial_ends_at   TIMESTAMPTZ,                -- מתי נגמר הניסיון
  suspended_at    TIMESTAMPTZ,
  suspended_reason TEXT,
  cancelled_at    TIMESTAMPTZ,
  
  -- תוכנית מנוי
  plan_id         UUID REFERENCES plans(id),
  plan_started_at TIMESTAMPTZ,
  
  -- פרטים
  owner_name      TEXT,                       -- שם בעל החנות
  owner_email     TEXT,                       -- מייל בעל החנות
  owner_phone     TEXT,
  logo_url        TEXT,
  
  -- הגדרות
  default_currency TEXT DEFAULT 'ILS',
  default_language TEXT DEFAULT 'he',
  timezone        TEXT DEFAULT 'Asia/Jerusalem',
  
  -- מטא
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

**טבלת `plans` — תוכניות מנוי:**
```sql
plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,              -- "Basic" / "Pro" / "Enterprise"
  slug            TEXT UNIQUE NOT NULL,       -- "basic" / "pro" / "enterprise"
  
  -- גבולות
  max_employees   INTEGER,                    -- NULL = ללא הגבלה
  max_inventory   INTEGER,                    -- מקסימום פריטי מלאי
  max_branches    INTEGER DEFAULT 1,
  max_customers   INTEGER,
  
  -- פיצ'רים
  features        JSONB DEFAULT '{}',         -- {"storefront": true, "ai_agent": false, "supplier_portal": false}
  
  -- תמחור
  price_monthly   DECIMAL(10,2) DEFAULT 0,
  price_yearly    DECIMAL(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'ILS',
  
  -- מטא
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**Seed ברירת מחדל:**
```sql
INSERT INTO plans (name, slug, max_employees, max_inventory, max_branches, features, price_monthly) VALUES
('Trial', 'trial', 3, 500, 1, '{"storefront": false, "ai_agent": false, "supplier_portal": false}', 0),
('Basic', 'basic', 5, 2000, 1, '{"storefront": true, "ai_agent": false, "supplier_portal": false}', 0),
('Pro', 'pro', 15, 10000, 3, '{"storefront": true, "ai_agent": true, "supplier_portal": false}', 0),
('Enterprise', 'enterprise', NULL, NULL, NULL, '{"storefront": true, "ai_agent": true, "supplier_portal": true}', 0);
-- מחירים = 0 כרגע. יעודכנו כשיהיה billing
```

**טבלת `platform_admins` — auth נפרד לחלוטין מעובדי חנות:**
```sql
platform_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL,              -- 'super_owner' / 'support_agent' / 'billing_manager' / 'onboarding_manager'
  
  -- Supabase Auth
  auth_user_id    UUID UNIQUE,               -- מצביע ל-auth.users של Supabase Auth (email+password, לא PIN)
  
  -- הרשאות
  permissions     JSONB DEFAULT '[]',        -- override ספציפי מעבר ל-role
  
  -- מטא
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**תפקידי Platform Admin:**
```
super_owner       — גישה לכל, כולל מחיקת tenants, שינוי plans
support_agent     — read-only על כל tenant, איפוס PIN, צפייה בלוגים
billing_manager   — ניהול תשלומים ותוכניות בלבד
onboarding_manager— יצירת tenants, לא מחיקה
```

**טבלת `platform_audit_log` — לוג נפרד מ-inventory_logs:**
```sql
platform_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID REFERENCES platform_admins(id),
  action          TEXT NOT NULL,              -- 'tenant_created' / 'tenant_suspended' / 'plan_changed' / 'admin_login' / ...
  target_type     TEXT,                       -- 'tenant' / 'plan' / 'admin'
  target_id       UUID,
  details         JSONB DEFAULT '{}',         -- פרטים נוספים
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**טבלת `tenant_config` — הגדרות מרכזיות per-tenant:**
```sql
tenant_config (
  tenant_id       UUID PRIMARY KEY REFERENCES tenants(id),
  
  -- עסק
  business_name   TEXT,                       -- שם מלא לחשבוניות
  business_id     TEXT,                       -- ח.פ / מספר עוסק
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  
  -- מלאי
  barcode_prefix  TEXT DEFAULT '00',          -- prefix סניף ברירת מחדל
  low_stock_threshold INTEGER DEFAULT 2,      -- סף התראת מלאי נמוך
  
  -- מכירות
  default_tax_rate DECIMAL(5,2) DEFAULT 17,   -- מע"מ ברירת מחדל
  receipt_header  TEXT,                       -- כותרת קבלה
  receipt_footer  TEXT,                       -- תחתית קבלה
  
  -- WhatsApp
  whatsapp_number TEXT,
  whatsapp_default_message TEXT,
  
  -- פיצ'רים
  enabled_modules JSONB DEFAULT '["inventory"]',  -- אילו מודולים פעילים
  custom_settings JSONB DEFAULT '{}',             -- הגדרות חופשיות
  
  -- מטא
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

**טבלת `tenant_provisioning_log` — מעקב provisioning:**
```sql
tenant_provisioning_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  step            TEXT NOT NULL,              -- 'tenant_created' / 'roles_seeded' / 'permissions_seeded' / 'default_employee_created' / 'config_created'
  status          TEXT DEFAULT 'pending',     -- 'pending' / 'completed' / 'failed'
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

---

### Provisioning — מה קורה כשנוצר tenant חדש

```
createTenant(name, slug, owner_email, plan) →
  1. INSERT INTO tenants (...) → tenant_id
  2. INSERT INTO tenant_config (tenant_id, defaults...)
  3. INSERT INTO roles — seed 5 תפקידים (CEO, מנהל, ראש צוות, עובד, צופה)
  4. INSERT INTO permissions — seed כל ההרשאות
  5. INSERT INTO role_permissions — seed מטריצת ברירת מחדל
  6. INSERT INTO employees — עובד ראשוני (בעל החנות, PIN 00000, role CEO)
  7. INSERT INTO tenant_provisioning_log — לכל שלב
  8. שלח מייל ללקוח עם קישור כניסה ראשוני
```

**כל שלב מתועד ב-provisioning_log.** אם שלב נכשל — אפשר לראות בדיוק איפה ולתקן.

**כל מודול עתידי שדורש seed data** (למשל: מודול תשלומים צריך payment_methods ברירת מחדל) — מוסיף שלב provisioning בלי לשנות את הקיימים.

---

### UI שנבנה עכשיו (מינימום)

**מסך Login Platform Admin:**
- email + password (Supabase Auth, לא PIN)
- נפרד לחלוטין ממסך Login של עובדי חנות
- URL נפרד: `/admin.html`

**מסך דשבורד Platform:**
- רשימת tenants: שם, סטטוס, תוכנית, תאריך הצטרפות, עובדים פעילים
- כרטיסי סיכום: סה"כ tenants, פעילים, בניסיון, מושהים
- סינון לפי סטטוס

**מסך יצירת tenant:**
- טופס: שם חנות, slug, שם בעלים, מייל, טלפון, תוכנית
- כפתור "צור חנות" → provisioning מלא
- הצגת provisioning_log בזמן אמת (שלב 1 ✅, שלב 2 ✅...)

**מסך עריכת tenant:**
- שינוי סטטוס (active ↔ suspended)
- שינוי תוכנית
- צפייה בפרטים

---

### UI שנבנה בעתיד (לא עכשיו)

- 2FA
- Impersonation (כניסה ל-tenant ב-read-only)
- איפוס PIN לעובד
- חיפוש גלובלי
- Billing + Stripe
- Feature flags per tenant
- Analytics פלטפורמה
- Maintenance mode
- גרפים וטרנדים
- דוח הכנסות

---

### Helper Functions שכל מודול עתידי ישתמש בהם

```javascript
// בודק אם tenant פעיל (לא suspended/cancelled)
async function isTenantActive(tenantId) → boolean

// בודק אם tenant בתוך הגבולות של התוכנית שלו
async function checkPlanLimit(tenantId, resource, currentCount) → { allowed, limit, current }
// resource = 'employees' / 'inventory' / 'branches' / 'customers'

// בודק אם פיצ'ר מופעל לtenant
async function isFeatureEnabled(tenantId, feature) → boolean
// feature = 'storefront' / 'ai_agent' / 'supplier_portal' / 'whatsapp'

// מחזיר config של tenant
async function getTenantConfig(tenantId) → tenant_config record

// מחזיר tenant + plan + config
async function getFullTenantInfo(tenantId) → { tenant, plan, config }
```

**כל מודול ERP עתידי:** כשמשתמש מנסה להוסיף עובד → `checkPlanLimit(tenantId, 'employees', currentCount)`. אם חורג → "שדרג תוכנית." בלי Platform Admin — אין מי שיבדוק את זה, וכל מודול יתעלם מגבולות.

---

## חלק 7 — ארכיטקטורת Storefront (תזכורת)

Storefront = repo נפרד, קורא רק Views + RPC. כל מודול ERP חדש → חושפים View → Storefront מוסיף רכיב. אפס שינויים ב-ERP.

**טבלאות Storefront:**
storefront_config, storefront_product_config, storefront_leads, storefront_articles

---

## חלק 8 — כללי ברזל

> ⛔ כמות מלאי = רק Add/Remove עם PIN
> ⛔ תאריכים (הזמנה/מרשם) = immutable
> ⛔ מספרים (הזמנה/לקוח/קבלה) = ייחודי, עולה, immutable
> ⛔ מחיקה = soft delete בלבד
> ⛔ כל פעולה = לוג עם user_id + timestamp
> ⛔ Storefront קורא רק Views + RPC
> ⛔ כל טבלה = tenant_id + RLS
> ⛔ ערכים configurable, לא hardcoded
> ⛔ מודולים מתקשרים דרך חוזים, לא טבלאות ישירות
> ⛔ כל מודול בודק plan limits דרך checkPlanLimit()

---

## חלק 9 — חוזים קיימים

**מודול 1 — מלאי:**
```
getItemByBarcode(barcode), searchFrames(query), updateQuantity(id, +/-, reason, employee),
getStockLevel(barcode), writeLog(action, id, details), getBrands(), getSuppliers()
```

**מודול 1 — Auth:**
```
getCurrentUser() → { id, name, role, branch_id, tenant_id }
verifyPIN(pin), hasPermission(user, action)
```

**מודול 2 — Platform Admin (מתוכנן):**
```
isTenantActive(tenantId), checkPlanLimit(tenantId, resource, count),
isFeatureEnabled(tenantId, feature), getTenantConfig(tenantId),
getFullTenantInfo(tenantId), createTenant(details), suspendTenant(tenantId, reason)
```

---

## חלק 10 — מפת DB

```
═══ קיים ✅ (מודול 1) ═══
inventory, inventory_images, inventory_logs, brands, suppliers, employees,
goods_receipts, goods_receipt_items, purchase_orders, purchase_order_items,
stock_counts, stock_count_items, tenants, roles, permissions,
role_permissions, employee_roles, auth_sessions

═══ מתוכנן — מודול 2 (Platform Admin) ═══
plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log
+ הרחבת tenants (status, plan_id, trial_ends_at, owner_*)

═══ מתוכנן — Storefront ═══
storefront_config, storefront_product_config, storefront_leads, storefront_articles

═══ מתוכנן — CRM ═══
customers, customer_notes

═══ מתוכנן — הזמנות + תשלומים ═══
orders, order_items, payments, receipts

═══ מתוכנן — מעבדה ═══
lab_orders, lab_order_status_log, lab_sla_config, lab_compensations,
lab_qa_checklists, lab_shipments, lab_shipment_items

═══ מתוכנן — שאר ═══
lenses, lens_stock, branches, supplier_returns, supplier_return_items,
whatsapp_log, whatsapp_templates, supplier_invoices, supplier_payments
```

---

## חלק 11 — החלטות שהתקבלו

| תאריך | החלטה | נימוק |
|--------|--------|--------|
| מרץ 2026 | מתחילים ממלאי | Access מטפל במכירות. המלאי = הכאב הראשי |
| מרץ 2026 | בונים ליד Access, לא במקומו | ערך מיידי, החלפה הדרגתית |
| מרץ 2026 | HTML נפרד לכל מודול ERP | מהירות, פשטות |
| מרץ 2026 | Storefront = repo נפרד, קורא רק Views | אבטחה, הפרדה, אפס coupling |
| מרץ 2026 | tenant_id מהיום הראשון | מוכן ל-SaaS בלי rebuild |
| מרץ 2026 | Platform Admin = מודול 2, לפני הכל | כל מודול אחריו נשען על plans, limits, config |
| מרץ 2026 | Platform Auth נפרד מ-Tenant Auth | email+password לבעל פלטפורמה, PIN לעובדי חנות |
| מרץ 2026 | טבלאות מלאות עכשיו, UI בהדרגה | אפס migrations עתידיות |
| מרץ 2026 | Provisioning אוטומטי עם log | כל tenant חדש = seed מלא, מעקב שלב-שלב |
| מרץ 2026 | Plan limits + feature flags בDB | כל מודול בודק גבולות, אפס hardcoding |
| מרץ 2026 | Storefront Showcase לפני CRM | ROI מיידי |
| מרץ 2026 | מעבדה אחרי הזמנות + תשלומים | native, לא bridge |
| מרץ 2026 | זיכויים לספקים = מפוצל (מלאי/מעבדה/כספים) | zero coupling |
| מרץ 2026 | 4-tier workflow | אסטרטגי → מוצר → מפקח → מבצע |

---

## חלק 12 — שאלות פתוחות

| שאלה | חוסם | דחיפות |
|-------|------|--------|
| Storefront framework: Astro או SSG? | מודול 3 | גבוהה |
| Platform Admin URL: /admin.html או subdomain? | מודול 2 | גבוהה |
| Supabase Auth setup — email+password flow | מודול 2 | גבוהה |
| WooCommerce — לחבר או להחליף? | מודול 18 | בינונית |
| WhatsApp Business API token | מודול 13 | בינונית |
| תמחור ציפויים — מבנה טבלה | מודול 5 | בינונית |
| פורמט טבלה Access↔מעבדה | מודול 9 | בינונית |
| Billing model (מחירי תוכניות) | לפני לקוח שני | נמוכה כרגע |

---

## חלק 13 — הצעד הבא

**עכשיו:** מודול 2 — Platform Admin Basics.
- Super Owner login (Supabase Auth)
- Plans + limits
- Tenant management UI
- Provisioning אוטומטי
- Helper functions (isTenantActive, checkPlanLimit, isFeatureEnabled)

**אחרי:** מודול 3 — Storefront Showcase. ROI מיידי.
**אחרי:** מודול 4 — לקוחות CRM.

---

*מסמך זה הוא "מוח הפרויקט". כל מה שצריך לדעת כדי להמשיך — כאן.*
*אם אתה צ'אט אסטרטגי חדש — קרא הכל והמשך מחלק 13.*
