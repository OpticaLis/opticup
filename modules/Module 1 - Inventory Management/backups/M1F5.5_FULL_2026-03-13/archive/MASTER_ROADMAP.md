# Optic Up — Master Roadmap

> **מסמך זה הוא "מוח הפרויקט".**
> אם הצ'אט האסטרטגי מוחלף — מדביקים את המסמך הזה בצ'אט החדש.
> הצ'אט החדש צריך להבין הכל בלי שום הסבר נוסף.
> עודכן לאחרונה: מרץ 2026

---

## חלק 1 — מה זה Optic Up

### שני מוצרים, DB אחד

**Optic Up ERP** — מערכת ניהול פנימית לעובדי חנות אופטיקה: מלאי, לקוחות, הזמנות, מעבדה, תשלומים, דוחות.

**Optic Up Storefront** — אתר חנות/ויטרינה ללקוח הקצה: קטלוג מוצרים, מעקב הזמנה, בלוג, לידים, רכישה אונליין.

שניהם קוראים מאותו Supabase — אבל הם **פרויקטים נפרדים**, **repos נפרדים**, **קהלים שונים**.

```
┌──────────────────────┐         ┌──────────────────────┐
│   Optic Up ERP       │         │  Optic Up Storefront  │
│   (ניהול פנימי)       │         │  (אתר ללקוח קצה)      │
│                      │         │                      │
│  Vanilla JS + HTML   │         │  Astro / Vanilla JS  │
│  GitHub Pages        │         │  Vercel / Netlify    │
│  עובדי חנות בלבד     │         │  פתוח לציבור         │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │     ┌──────────────────┐       │
           └────►│    Supabase      │◄──────┘
                 │   (PostgreSQL)   │
                 │                  │
                 │  ┌────────────┐  │
                 │  │ Views      │  │  ← Storefront קורא רק מ-Views
                 │  │ RPC funcs  │  │  ← Storefront כותב רק דרך Functions
                 │  │ RLS        │  │  ← tenant_id מבודד הכל
                 │  └────────────┘  │
                 │                  │
                 │  Tables (direct) │  ← ERP ניגש ישירות
                 └──────────────────┘
```

### המטרה הסופית
**Optic Up = פלטפורמת SaaS לרשתות וחנויות אופטיקה.**
כל חנות מקבלת: מערכת ניהול מלאה + אתר חנות ממותג.

לכן המערכת חייבת להיות:
- **Multi-tenant** — כל חנות/רשת = tenant נפרד, מבודד לחלוטין
- **Multi-branch** — תמיכה ברשת סניפים + מעבדה מרכזית
- **Scalable** — אלפי לקוחות, עשרות אלפי הזמנות
- **Configurable** — כל חנות מגדירה צבעים, לוגו, SLA, תפקידים, תבניות
- **Professional** — ממשק שאפשר למכור, לא פרויקט פנימי

### הלקוח הראשון (Pilot)
**אופטיקה פריזמה** — רשת ישראלית. משתמשת היום ב:
- **תוכנת Access** — מכירות, הזמנות, לקוחות
- **תוכנת מעבדה נפרדת** — מסגור, מעקב ייצור (מחוברת ל-Access דרך טבלה פנימית)
- **אתר WordPress/WooCommerce** — קיים, ירוצה להחליף/לחבר

### האסטרטגיה — "בנייה ליד Access, החלפה הדרגתית"
```
שלב 1 (עכשיו):   Access פעיל ── bridge ──► Optic Up ERP (מלאי)
שלב 2:            Access פעיל ── bridge ──► Optic Up ERP + Storefront
שלב 3:            Access נכבה.              Optic Up = הכל
שלב 4:            Optic Up → SaaS          לקוחות נוספים
```

---

## חלק 2 — סטאק טכנולוגי

### ERP (מערכת ניהול)
| שכבה | טכנולוגיה | הערות |
|-------|-----------|--------|
| Frontend | Vanilla JS, HTML נפרד לכל מודול | כל מודול = קובץ HTML עצמאי |
| Database | Supabase (PostgreSQL) | EU Ireland, RLS, tenant_id |
| Auth | Supabase + טבלת employees עם PIN | |
| Storage | Supabase Storage | תמונות מסגרות |
| Hosting | GitHub Pages | |
| Repo | `opticalis/prizma-inventory` | |
| Supabase | `https://tsxrrxzmdxaenlvocyit.supabase.co` | |
| Bridge | Node.js Folder Watcher + Dropbox | סנכרון עם Access |

### Storefront (אתר חנות) — מתוכנן
| שכבה | טכנולוגיה | הערות |
|-------|-----------|--------|
| Frontend | Astro או Vanilla JS SSG | מהיר, SEO-friendly, 90+ PageSpeed |
| Data | Supabase Views + RPC | לא ניגש לטבלאות ישירות |
| Hosting | Vercel או Netlify | CDN, SSL, custom domains |
| Repo | `opticalis/prizma-storefront` (חדש) | נפרד מ-ERP |
| Images | Supabase Storage + WebP auto-convert | |
| Analytics | GA4 + Facebook Pixel per tenant | |

### מבנה Repo — ERP
```
├── index.html                              ← תמיד המודול הפעיל
├── shared/                                 ← קוד משותף
├── modules/
│   └── Module 1 - Inventory Management/    ← מודולים מאורכבים
├── migrations/                             ← SQL migrations
└── docs/
```

**לוגיקת index.html:** תמיד המודול שעובדים עליו. כשמודול מסתיים → מועתק ל-modules/. index.html מוחלף.

---

## חלק 3 — שיטת עבודה (4 שכבות)

```
🏛️ צ'אט אסטרטגי ראשי (מנכ"ל)
│   רואה הכל מלמעלה. מסמך: MASTER_ROADMAP.md
│   מחליף: מדביקים MASTER_ROADMAP בצ'אט חדש
│
├── 📋 צ'אט אסטרטגי למודול (מנהל מוצר)
│   │   רואה מודול ספציפי. מסמך: ROADMAP.md של המודול
│   │
│   └── 🔧 צ'אט מפקח (מנהל עבודה)
│           כותב פרומפטים ל-Claude Code, בודק תוצאות
│           ⚠️ לא כותב קוד! כותב פרומפטים שהמשתמש מעתיק ל-Claude Code
│
│           └── ⚡ Claude Code (Terminal) — מבצע בלבד
```

**Daniel** עובר בין השכבות: מתכנן → מפרט → מעתיק פרומפטים → מדביק תוצאות → בודק ב-GitHub Pages.

---

## חלק 4 — איפה אנחנו עכשיו (מרץ 2026)

### ✅ מודול 1 — מלאי מסגרות (Inventory Management)
**גרסה:** v1.0 | **מיקום:** `modules/Module 1 - Inventory Management/`
**DB:** 12 טבלאות
**פיצ'רים (34+):** CRUD, ברקוד BBDDDDD, Add/Remove PIN, קבלת סחורה, PO, ספירת מלאי, Access bridge, Audit logs, Soft delete, Excel, pg_trgm, mobile responsive
**פאזות שהושלמו:** 0 (הכנה), 1 (PO), 1.5 (שיפורים), 2 (ספירה + Access bridge)

### 🔄 מודול 2 — Auth + תפקידים + ניהול עובדים
**סטטוס:** בבנייה כפאזה 3 בתוך מודול 1
**DB מתוכנן:** roles, permissions, role_permissions, employee_roles, auth_sessions
**כולל:** Login PIN, 5 תפקידים, מטריצת הרשאות, session, ממשק ניהול עובדים
**⚠️ במודול זה: הוספת tenant_id לכל הטבלאות הקיימות והעתידיות**

### ⬜ מודול 3 — ניהול לקוחות (CRM)
**סטטוס: טרם התחיל**
**DB מתוכנן:** customers, customer_notes

### הכל אחרי — טרם התחיל

---

## חלק 5 — סדר בנייה מלא

| סדר | מודול | פאזה | סטטוס | למה בסדר הזה |
|-----|-------|------|-------|--------------|
| 1 | מלאי מסגרות | 1 | ✅ | הבסיס — הכאב הראשי |
| 2 | Auth + תפקידים + tenant_id | 1 | 🔄 | הרשאות + tenant_id לכל הטבלאות |
| 3 | **Storefront Showcase** | 1.5 | ⬜ | **ROI מיידי — אתר חנות ממלאי קיים** |
| 4 | לקוחות CRM | 2 | ⬜ | חוסם הזמנות + בדיקות + WhatsApp |
| 5 | הזמנות | 2 | ⬜ | הליבה — מתחיל להחליף Access |
| 6 | בדיקת עיניים | 2 | ⬜ | תלוי בלקוחות + הזמנות |
| 7 | תשלומים | 2 | ⬜ | תלוי בהזמנות |
| 8 | **Storefront Full** | 2.5 | ⬜ | **עגלה + תשלום + מעקב הזמנה** |
| 9 | מעבדה + KDS | 3 | ⬜ | אחרי הזמנות + תשלומים = native |
| 10 | מלאי עדשות | 3 | ⬜ | אותה ארכיטקטורה כמו מודול 1 |
| 11 | סניפים | 3 | ⬜ | MVP = סניף אחד |
| 12 | מעקב הזמנות Dashboard | 3 | ⬜ | צריך נתונים מהכל |
| 13 | WhatsApp אוטומטי | 3 | ⬜ | צריך לקוחות + הזמנות + token |
| 14 | דוחות | 4 | ⬜ | צריך נתונים מכל המודולים |
| 15 | כספים ספקים | 4 | ⬜ | חשבוניות, תשלומים, סגירה חודשית |
| 16 | סוכן AI | 5 | ⬜ | OCR חשבוניות, התראות |
| 17 | פורטל ספקים | 5 | ⬜ | read-only לספק |
| 18 | WooCommerce sync | 5 | ⬜ | סנכרון דו-כיווני |
| 19 | קופה אנדרואיד | 5 | ⬜ | חיבור POS |

---

## חלק 6 — ארכיטקטורת Storefront (Future-Proof)

### העיקרון: Storefront לא נוגע ב-ERP, ו-ERP לא נוגע ב-Storefront

הם מדברים **רק** דרך שכבת Supabase (Views + RPC Functions). ככה כל מודול ERP חדש שנבנה — פשוט חושפים View חדש, וה-Storefront קורא אותו. **אפס שינויים בקוד קיים.**

### שכבת ה-Views (Supabase) — הגשר בין ERP ל-Storefront

```sql
-- ═══ קיים מיום 1 של Storefront ═══

-- מוצרים לתצוגה (קורא מ-inventory, brands, inventory_images)
CREATE VIEW storefront_products AS
SELECT
  i.id, i.barcode, i.brand, i.model, i.color, i.size,
  i.product_type, i.sell_price, i.discount_percent,
  i.quantity, i.bridge_size, i.tenant_id,
  b.name as brand_name, b.logo_url as brand_logo,
  b.exclude_website,
  COALESCE(
    (SELECT json_agg(url) FROM inventory_images WHERE inventory_id = i.id),
    '[]'
  ) as images,
  sc.display_mode  -- 'full' / 'showcase' / 'offline'
FROM inventory i
JOIN brands b ON i.brand = b.name AND i.tenant_id = b.tenant_id
LEFT JOIN storefront_product_config sc ON sc.inventory_id = i.id
WHERE i.is_deleted = false
  AND b.exclude_website = false
  AND (sc.display_mode IS NULL OR sc.display_mode != 'offline');

-- מותגים לתצוגה
CREATE VIEW storefront_brands AS
SELECT id, name, logo_url, tenant_id
FROM brands
WHERE exclude_website = false;

-- ═══ נוסף כשמודול הזמנות ייבנה ═══

-- מעקב הזמנה ללקוח (קורא מ-orders, order_items)
CREATE VIEW storefront_order_tracking AS
SELECT
  o.order_number, o.status, o.created_at,
  o.expected_ready_date, o.actual_ready_date,
  o.tenant_id
  -- ללא מידע רגיש (מחירים פנימיים, עובד וכו')
FROM orders o;

-- ═══ נוסף כשמודול תשלומים ייבנה ═══

-- קליטת תשלום אונליין (RPC function)
CREATE FUNCTION storefront_create_payment(...) ...

-- ═══ נוסף כשמודול מעבדה ייבנה ═══

-- סטטוס ייצור ללקוח
CREATE VIEW storefront_production_status AS
SELECT
  lo.order_number, lo.current_status, lo.sla_deadline,
  lo.tenant_id
FROM lab_orders lo;

-- ═══ נוסף כשמודול בדיקות עיניים ייבנה ═══

-- מרשמים ללקוח (עם אישור)
CREATE VIEW storefront_prescriptions AS ...
```

### מה זה אומר בפועל

| כשנבנה מודול... | מה מוסיפים ל-Storefront | שינוי במודולי ERP |
|-----------------|------------------------|-------------------|
| הזמנות | View חדש + דף מעקב הזמנה | **אפס** |
| תשלומים | RPC function + דף checkout | **אפס** |
| מעבדה/KDS | View חדש + timeline בדף מעקב | **אפס** |
| בדיקות עיניים | View חדש + דף מרשמים | **אפס** |
| לקוחות CRM | View חדש + פורטל לקוח | **אפס** |
| WhatsApp | כבר יש כפתור WhatsApp | **אפס** |

**אפס שינויים במודולי ERP קיימים. אף פעם.** רק מוסיפים View חדש ב-Supabase ורכיב חדש ב-Storefront.

### טבלאות Storefront-specific (ב-Supabase)

```sql
-- קונפיגורציה per-tenant
storefront_config (
  tenant_id         UUID PRIMARY KEY,
  store_name        TEXT,
  logo_url          TEXT,
  favicon_url       TEXT,
  primary_color     TEXT DEFAULT '#1A237E',
  secondary_color   TEXT DEFAULT '#2196F3',
  font_family       TEXT DEFAULT 'Arial',
  hero_banners      JSONB DEFAULT '[]',     -- [{image, title, link}]
  featured_categories JSONB DEFAULT '[]',
  whatsapp_number   TEXT,
  whatsapp_message_template TEXT DEFAULT 'היי {store_name}, אני מעוניין בדגם {model} שראיתי באתר',
  google_analytics_id TEXT,
  facebook_pixel_id TEXT,
  custom_domain     TEXT,                    -- לעתיד
  display_prices    BOOLEAN DEFAULT true,
  enable_cart       BOOLEAN DEFAULT false,   -- false = showcase, true = full
  enable_blog       BOOLEAN DEFAULT false,
  maintenance_mode  BOOLEAN DEFAULT false
)

-- הגדרת תצוגה per-product
storefront_product_config (
  id                UUID PRIMARY KEY,
  inventory_id      UUID REFERENCES inventory(id),
  tenant_id         UUID,
  display_mode      TEXT DEFAULT 'showcase', -- 'full' / 'showcase' / 'offline'
  featured          BOOLEAN DEFAULT false,
  badge             TEXT,                    -- 'חדש' / 'במבצע' / 'בלעדי'
  sort_order        INTEGER DEFAULT 0
)

-- לידים
storefront_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  name              TEXT,
  phone             TEXT,
  email             TEXT,
  source            TEXT,  -- 'contact_form' / 'whatsapp_click' / 'newsletter' / 'product_inquiry'
  product_id        UUID,  -- אם פנייה מעמוד מוצר
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
)

-- מאמרים/בלוג
storefront_articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  title             TEXT,
  slug              TEXT,
  content           TEXT,
  featured_image    TEXT,
  related_products  UUID[],  -- מוצרים מומלצים מהמלאי
  published         BOOLEAN DEFAULT false,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
)
```

### Storefront Showcase — מה ייבנה (מודול 3)

**דף הבית:**
- Hero banners (מנוהלים מ-ERP דרך storefront_config)
- קטגוריות מהירות (משקפי שמש, ראייה, עדשות מגע)
- Best sellers (לפי quantity/sort_order)
- Brand wall (לוגואים מ-storefront_brands view)

**קטלוג מוצרים:**
- פילטרים: מותג, סוג מסגרת, חומר, צורה, מגדר, צבע, מחיר
- תצוגת grid: תמונה, שם דגם, מחיר (אם display_prices = true)
- Badges: "חדש", "במבצע", "בלעדי", "Showcase בלבד"
- Pagination / infinite scroll

**עמוד מוצר:**
- גלריית תמונות (WebP auto-convert)
- מפרט: מידות, צבעים, חומר
- מצב Showcase: כפתור WhatsApp עם הודעה מוכנה + שם הדגם
- מצב Full (עתידי): כפתור "הוסף לסל" + זמינות
- Cross-sell (עתידי): "מוצרים דומים" לפי מותג/קטגוריה

**בלוג/SEO:**
- מאמרים מ-storefront_articles
- מוצרים מומלצים בתוך מאמר
- Schema.org markup, sitemap, meta tags

**לידים:**
- טופס "צור קשר" → storefront_leads
- WhatsApp click tracking → storefront_leads
- Newsletter signup → storefront_leads
- UTM params נשמרים אוטומטי

**SEO/ביצועים:**
- ציון 90+ PageSpeed
- SSG/SSR לעמודי מוצר (גוגל סורק הכל)
- תמונות WebP
- Schema.org לכל מוצר

**White-Label (מהיום הראשון):**
- צבעים, לוגו, פונט מ-storefront_config
- tenant_id מזוהה לפי domain/subdomain
- כל חנות = look & feel שונה, אותו קוד

### Storefront Full — מה יתווסף (מודול 8)

כשמודולי הזמנות + תשלומים יהיו מוכנים:
- עגלת קניות + checkout
- תשלום אונליין (אשראי)
- מעקב הזמנה (מספר הזמנה/טלפון → סטטוס)
- פורטל לקוח (היסטוריה, מרשמים)
- Cross-sell מבוסס נתוני רכישות

---

## חלק 7 — tenant_id: איך מבטיחים שלא יהיו בעיות

### מה נעשה במודול 2 (Auth)

```sql
-- 1. הוספת tenant_id לכל טבלה קיימת
ALTER TABLE inventory ADD COLUMN tenant_id UUID NOT NULL DEFAULT '[prizma-uuid]';
ALTER TABLE brands ADD COLUMN tenant_id UUID NOT NULL DEFAULT '[prizma-uuid]';
ALTER TABLE suppliers ADD COLUMN tenant_id UUID NOT NULL DEFAULT '[prizma-uuid]';
-- ... לכל הטבלאות

-- 2. טבלת tenants
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,          -- "אופטיקה פריזמה"
  slug        TEXT UNIQUE NOT NULL,   -- "prizma"
  domain      TEXT,                   -- "www.prizma-optics.co.il"
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS policy על כל טבלה
CREATE POLICY tenant_isolation ON inventory
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- ... על כל טבלה
```

### מה זה אומר לכל מודול עתידי

| מודול | tenant_id impact | בעיות? |
|-------|-----------------|--------|
| מלאי | כל record שייך ל-tenant. שני tenants = אותו מותג, מלאי נפרד | ✅ עובד |
| לקוחות | לקוח שייך ל-tenant. אותו טלפון ב-2 tenants = בסדר | ✅ עובד |
| Auth | עובד שייך ל-tenant. תפקידים per-tenant | ✅ עובד |
| הזמנות | הזמנה שייכת ל-tenant. מספור עולה per-tenant | ✅ עובד |
| מעבדה | מעבדה יכולה להיות shared (רשת) או per-tenant | ✅ עובד |
| Storefront | tenant_id מזוהה לפי domain → טוען config + נתונים | ✅ עובד |
| ברקוד | BBDDDDD — prefix סניף per-tenant, 99 סניפים לכל tenant | ✅ עובד |

### מה נבנה כשיהיה לקוח שני

- Tenant management UI (יצירת tenant)
- Onboarding flow
- Billing (אם SaaS בתשלום)

### מה לא ישתנה

**שום מודול קיים.** כי tenant_id כבר שם מהיום הראשון.

---

## חלק 8 — כללי ברזל וארכיטקטורה

### כללי ברזל (Iron Rules)
> ⛔ כמות מלאי = שינוי רק דרך Add/Remove עם PIN + סיבה
> ⛔ תאריכים (הזמנה/מרשם) = immutable
> ⛔ מספרים (הזמנה/לקוח/קבלה) = ייחודי, עולה, immutable
> ⛔ מחיקה = soft delete בלבד
> ⛔ כל פעולה = לוג עם user_id + timestamp
> ⛔ Storefront לא ניגש לטבלאות ישירות — רק Views + RPC

### Zero Tight Coupling
מודול לא ניגש לטבלאות של מודול אחר ישירות. חוזים (functions) בלבד.

**חוזים קיימים:**

מודול 1 — מלאי:
```
getItemByBarcode(barcode) → inventory record
searchFrames(query) → filtered array
updateQuantity(id, +/-, reason, employee) → updated + log
writeLog(action, id, details) → log entry
getBrands() / getSuppliers() → lists
```

מודול 2 — Auth (מתוכנן):
```
getCurrentUser() → { id, name, role, branch_id, tenant_id }
verifyPIN(pin) → employee or error
hasPermission(user, action) → boolean
```

מודול 3 — לקוחות (מתוכנן):
```
getCustomer(id) → customer record
searchCustomers(query) → filtered array
getCustomerByPhone(phone) → customer or null
getFamilyMembers(family_id) → array
```

---

## חלק 9 — פירוט מודולים עתידיים

### מודול 5 — הזמנות
**תלוי ב:** לקוחות, מלאי, Auth
**DB:** orders, order_items
**שדות מוכנים למעבדה:** routing_type, sla_deadline, qa_status, lab_notes
**כשמודול זה חי → Storefront מקבל View למעקב הזמנה**

### מודול 6 — בדיקת עיניים
**תלוי ב:** לקוחות, הזמנות
**DB:** eye_exams
**כשמודול זה חי → Storefront מקבל View למרשמים**

### מודול 7 — תשלומים
**תלוי ב:** הזמנות
**DB:** payments, receipts
**כשמודול זה חי → Storefront מקבל RPC לתשלום אונליין**

### מודול 8 — Storefront Full
**תלוי ב:** הזמנות + תשלומים
**מה מתווסף:** עגלה, checkout, מעקב הזמנה, פורטל לקוח, cross-sell

### מודול 9 — מעבדה + KDS
**תלוי ב:** הזמנות, תשלומים, Auth
**6 תת-מודולים:** Order Lifecycle, KDS Dashboard, SLA + פיצויים, QA, לוגיסטיקה/מניפסט, Control Panel
**DB:** lab_orders, lab_order_status_log, lab_sla_config, lab_compensations, lab_qa_checklists, lab_shipments, lab_shipment_items
**כשמודול זה חי → Storefront מקבל View לסטטוס ייצור**

### מודולים 10-19
- **10: מלאי עדשות** — אותה ארכיטקטורה כמו מודול 1
- **11: סניפים** — MVP = סניף אחד, בהמשך multi-branch
- **12: מעקב הזמנות Dashboard** — פילטרים, מולטיפוקל, bulk
- **13: WhatsApp** — תבניות, triggers, bulk, לוג
- **14: דוחות** — מכירות, מלאי, עובדים, ספקים
- **15: כספים ספקים** — חשבוניות, תשלומים, מט"ח
- **16: סוכן AI** — OCR חשבוניות, התראות
- **17: פורטל ספקים** — read-only per supplier
- **18: WooCommerce sync** — סנכרון דו-כיווני עם אתר קיים
- **19: קופה אנדרואיד** — חיבור POS

---

## חלק 10 — מפת DB

```
═══ קיים ✅ ═══
inventory, inventory_images, inventory_logs, brands, suppliers,
employees, goods_receipts, goods_receipt_items, purchase_orders,
purchase_order_items, stock_counts, stock_count_items

═══ מתוכנן ⬜ — Auth ═══
tenants, roles, permissions, role_permissions,
employee_roles, auth_sessions

═══ מתוכנן ⬜ — Storefront ═══
storefront_config, storefront_product_config,
storefront_leads, storefront_articles

═══ מתוכנן ⬜ — CRM ═══
customers, customer_notes

═══ מתוכנן ⬜ — הזמנות + תשלומים ═══
orders, order_items, payments, receipts

═══ מתוכנן ⬜ — מעבדה ═══
lab_orders, lab_order_status_log, lab_sla_config,
lab_compensations, lab_qa_checklists, lab_shipments, lab_shipment_items

═══ מתוכנן ⬜ — עדשות ═══
lenses, lens_stock

═══ מתוכנן ⬜ — שאר ═══
branches, whatsapp_log, whatsapp_templates,
supplier_invoices, supplier_payments
```

---

## חלק 11 — החלטות שהתקבלו

| תאריך | החלטה | נימוק |
|--------|--------|--------|
| מרץ 2026 | מתחילים ממלאי | Access מטפל במכירות. המלאי = הכאב הראשי |
| מרץ 2026 | בונים ליד Access, לא במקומו | ערך מיידי, החלפה הדרגתית |
| מרץ 2026 | HTML נפרד לכל מודול ERP | מהירות, פשטות |
| מרץ 2026 | Storefront = repo נפרד, קורא רק Views | אבטחה, הפרדה מלאה, אפס coupling |
| מרץ 2026 | tenant_id מהיום הראשון (מודול Auth) | מוכן ל-SaaS בלי rebuild |
| מרץ 2026 | Storefront Showcase לפני CRM | ROI מיידי, לא צריך לקוחות |
| מרץ 2026 | Storefront Full אחרי תשלומים | צריך עגלה + checkout |
| מרץ 2026 | מעבדה אחרי הזמנות + תשלומים | native, לא bridge. יציבות |
| מרץ 2026 | סניפים בעדיפות נמוכה | MVP = סניף אחד |
| מרץ 2026 | Zero coupling + חוזים | מודולים עצמאיים |
| מרץ 2026 | המטרה = SaaS לרשתות אופטיקה | multi-tenant, configurable |
| מרץ 2026 | 4-tier workflow | אסטרטגי → מוצר → מפקח → מבצע |

---

## חלק 12 — שאלות פתוחות

| שאלה | חוסם | דחיפות |
|-------|------|--------|
| Storefront framework: Astro או Vanilla JS SSG? | מודול 3 (Storefront) | גבוהה — לפני שמתחילים |
| Hosting: Vercel או Netlify? | מודול 3 | גבוהה |
| WooCommerce קיים — לחבר או להחליף? | מודול 18 | בינונית |
| WhatsApp Business API token | מודול 13 | לפני פאזה 3 |
| תמחור ציפויים — מבנה טבלה | מודול 5 | בינונית |
| פורמט טבלה Access↔מעבדה | מודול 9 | בינונית |
| Multi-tenant billing model | לפני לקוח שני | בינתיים לא רלוונטי |

---

## חלק 13 — הצעד הבא

**עכשיו:** לסיים מודול 2 (Auth + תפקידים + tenant_id).
**אחרי:** מודול 3 — Storefront Showcase. ROI מיידי.
**אחרי:** מודול 4 — לקוחות CRM. חוסם הזמנות.

---

*מסמך זה הוא "מוח הפרויקט". כל מה שצריך לדעת כדי להמשיך — כאן.*
*אם אתה צ'אט אסטרטגי חדש — קרא את כל המסמך והמשך מחלק 13.*
