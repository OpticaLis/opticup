# Optic Up — Master Roadmap

> **מסמך זה הוא "מוח הפרויקט".**
> אם הצ'אט האסטרטגי מוחלף — מדביקים את המסמך הזה בצ'אט החדש ואומרים:
> "אתה הצ'אט האסטרטגי הראשי של Optic Up. קרא את המסמך והמשך מחלק 15."
> עודכן לאחרונה: מרץ 2026

---

## חלק 1 — מה זה Optic Up

### שני מוצרים, DB אחד
**Optic Up ERP** — מערכת ניהול פנימית לעובדי חנות אופטיקה.
**Optic Up Storefront** — אתר חנות/ויטרינה ללקוח הקצה (repo נפרד).
שניהם קוראים מאותו Supabase. Storefront קורא רק מ-Views ו-RPC.

### המטרה הסופית
**פלטפורמת SaaS לרשתות וחנויות אופטיקה.** כל חנות = ERP + אתר ממותג.
Multi-tenant, multi-branch, scalable, configurable, professional.

### חזון עתידי
**Content Hub** — AI שהופך תמונות מלאי לתוכן שיווקי אוטומטית.
**B2B Network** — חנויות מחפשות מסגרות אצל חנויות אחרות. Network effect.
**AI Insights** — ניתוח צווארי בקבוק, תקלות חוזרות, המלצות. דורש 3+ tenants.
**AI Support Bot** — צ'אט בוט per-tenant שעונה לעובדים על שאלות טכניות.
**Predictive Validation** — AI שמזהה חריגות בנתונים בזמן אמת ("מחיר 500 למסגרת שבדרך כלל 150?").

### הלקוח הראשון
**אופטיקה פריזמה** — Access + תוכנת מעבדה נפרדת + אתר WooCommerce.

### האסטרטגיה — "בנייה ליד Access"
בונים ליד Access, מחליפים בהדרגה. כל מודול עובד גם עם bridge וגם standalone.

---

## חלק 2 — סטאק טכנולוגי

### ERP (מערכת ניהול) — בלי build step
| שכבה | טכנולוגיה | הערות |
|-------|-----------|--------|
| Frontend | **Vanilla JS** | לא TypeScript, לא framework |
| Styling | **CSS Variables (shared/variables.css)** | לא Tailwind, לא build |
| Structure | HTML נפרד לכל מודול | כל מודול = קובץ עצמאי |
| Hosting | GitHub Pages | בלי build step |
| DB | Supabase (PostgreSQL) | RLS, tenant_id |

**למה לא TypeScript/Tailwind/Vite ב-ERP?** הכל עובד, Claude Code מתפקד מצוין עם Vanilla JS, build step = סיבוך שלא צריך ל-GitHub Pages. מה שעובד לא נוגעים בו.

### Storefront (אתר חנות) — stack מודרני
| שכבה | טכנולוגיה | הערות |
|-------|-----------|--------|
| Framework | **Astro** | SSG/SSR, SEO מושלם, 90+ PageSpeed |
| Language | **TypeScript** | מהיום הראשון, כל קובץ |
| Styling | **Tailwind CSS** | עיצוב מהיר, אחיד, responsive |
| Data | Supabase Views + RPC | לא ניגש לטבלאות ישירות |
| Hosting | Vercel או Netlify | CDN, SSL, custom domains |
| Repo | `opticalis/prizma-storefront` (חדש) | **נפרד מ-ERP** |

**שני עולמות נפרדים, DB אחד.**

### Supabase + Repo
**Supabase:** `https://tsxrrxzmdxaenlvocyit.supabase.co`
**Repo ERP:** `opticalis/opticup`
**URL ERP:** `https://opticalis.github.io/opticup/`

---

## חלק 3 — שיטת עבודה (4 שכבות)

```
🏛️ צ'אט אסטרטגי ראשי (מנכ"ל) — MASTER_ROADMAP.md
├── 📋 צ'אט אסטרטגי למודול (מנהל מוצר) — ROADMAP.md
│   └── 🔧 צ'אט מפקח (מנהל עבודה) — פרומפטים ל-Claude Code
│       └── ⚡ Claude Code (terminal) — מבצע בלבד
```

Daniel עובר בין השכבות: מתכנן → מפרט → מעתיק פרומפטים → מדביק תוצאות → בודק.

---

## חלק 4 — איפה אנחנו (מרץ 2026)

### ✅ מודול 1 — מלאי מסגרות
הושלם עד פאזה 3.8. פאזות 4-6 ממתינות.
12 טבלאות, 34+ פיצ'רים. Auth + 5 תפקידים, tenant_id, RLS, Access bridge, PO, ספירה, sticky header.

**פאזות שהושלמו:** 0 (הכנה), 1 (PO), 1.5 (שיפורים), 2 (ספירה + Access bridge), 3 (Auth), 3.5 (מסך בית + repo rename), 3.75 (Multi-tenancy), 3.8 (Sticky Header).

### ⬜ מודול 1.5 — Shared Components Refactor — הבא בתור
### כל השאר — טרם התחיל

---

## חלק 5 — סדר בנייה מלא

| סדר | מודול | סטטוס | למה בסדר הזה |
|-----|-------|-------|--------------|
| 1 | מלאי מסגרות | ✅ (0-3.8) | הבסיס |
| **1.5** | **Shared Components Refactor** | **⬜ הבא** | **תשתית לכל מודול עתידי** |
| 2 | Platform Admin Basics | ⬜ | SaaS foundation — plans, limits, provisioning, הגדרות |
| 3 | Storefront Showcase (Astro+TS+Tailwind) | ⬜ | ROI מיידי — אתר מהמלאי הקיים |
| 4 | לקוחות CRM | ⬜ | חוסם הזמנות + בדיקות + WhatsApp |
| 5 | הזמנות | ⬜ | הליבה — מתחיל להחליף Access |
| 6 | בדיקת עיניים | ⬜ | תלוי בלקוחות + הזמנות |
| 7 | תשלומים | ⬜ | תלוי בהזמנות |
| 8 | Storefront Full | ⬜ | עגלה + תשלום + מעקב |
| 9 | מעבדה + KDS | ⬜ | אחרי הזמנות + תשלומים = native |
| 10 | מלאי עדשות | ⬜ | אותה ארכיטקטורה כמו מודול 1 |
| 11 | סניפים | ⬜ | MVP = סניף אחד |
| 12 | מעקב הזמנות Dashboard | ⬜ | צריך נתונים מהכל |
| 13 | WhatsApp אוטומטי | ⬜ | צריך לקוחות + הזמנות + token |
| 14 | דוחות | ⬜ | צריך נתונים מכל המודולים |
| 15 | כספים ספקים | ⬜ | חשבוניות, תשלומים. טופס AI-ready |
| 16 | סוכן AI | ⬜ | OCR חשבוניות (Claude Vision) |
| 17 | פורטל ספקים | ⬜ | read-only per supplier, token auth |
| 18 | Content Hub AI | ⬜ | תמונות → Reels + קופי. תשתית ב-1.5 |
| 19 | B2B Network | ⬜ | Marketplace בין חנויות. תשתית כבר קיימת |
| 20 | AI Support Bot | ⬜ | צ'אט בוט per-tenant. knowledge base = MODULE_SPECs |
| 21 | WooCommerce sync | ⬜ | סנכרון דו-כיווני |
| 22 | קופה אנדרואיד | ⬜ | חיבור POS |

---

## חלק 6 — מודול 1.5: Shared Components Refactor

### 6 משימות

#### 1. חילוץ רכיבים ל-shared/
```
shared/
  css/
    variables.css      ← CSS Variables (צבעים, פונטים, מרווחים)
    components.css     ← טבלאות, כפתורים, טפסים, מודאלים, toast
    layout.css         ← RTL, grid, responsive breakpoints
  js/
    table-builder.js, modal-builder.js, form-builder.js,
    pin-modal.js, toast.js, export-excel.js, validators.js
```

#### 2. Atomic RPC Operations
כל שינוי כמות = Supabase RPC (`quantity = quantity + x`). אין חישוב ב-JS. סריקה והחלפה של כל read→compute→write.

#### 3. Activity Log — טבלה מרכזית
```sql
activity_log (
  id UUID, tenant_id UUID, branch_id UUID, user_id UUID,
  level TEXT DEFAULT 'info',  -- info/warning/error/critical
  action TEXT, entity_type TEXT, entity_id UUID,
  details JSONB DEFAULT '{}', -- changes: [{field, old, new}] when relevant
  created_at TIMESTAMPTZ
)
```
inventory_logs נשאר. unified view בעתיד.

#### 4. מסך "תוכן שיווקי" + content_items
Gallery פריטים חדשים, הורדת תמונות, סימון "פורסם."
```sql
content_items (
  id UUID, tenant_id UUID, inventory_id UUID, source_image TEXT,
  status TEXT DEFAULT 'new',
  ai_caption TEXT, ai_video_url TEXT, ai_hashtags TEXT[],  -- עתידי
  manual_caption TEXT, published_to JSONB, published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

#### 5. אפס ערכים hardcoded
סריקת כל הקוד: שם עסק, כתובת, מע"מ, לוגו = תמיד ממשתנה.

#### 6. custom_fields JSONB בטבלאות מרכזיות
הוספת שדה ריק לטבלאות שעתיד להיות בהן שדות מותאמים:
```sql
ALTER TABLE inventory ADD COLUMN custom_fields JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN custom_fields JSONB DEFAULT '{}';  -- כשתיבנה
ALTER TABLE orders ADD COLUMN custom_fields JSONB DEFAULT '{}';     -- כשתיבנה
```
אין UI עכשיו. השדה ריק ומוכן. בעתיד: UI builder לשדות דינמיים per-tenant (בסגנון Monday.com).

---

## חלק 7 — מודול 2: Platform Admin

### DB
**tenants** — הרחבה: status, plan_id, trial_ends_at, owner details.
**plans** — Trial/Basic/Pro/Enterprise, גבולות, features JSONB, מחירים.
**platform_admins** — email+password (Supabase Auth, **לא PIN**). תפקידים: super_owner, support_agent, billing_manager, onboarding_manager.
**tenant_config** — הגדרות per-tenant: עסק, מלאי, מכירות, WhatsApp, enabled_modules.
**platform_audit_log, tenant_provisioning_log.**

### Provisioning + Helpers
```
createTenant() → tenant → config → roles → permissions → default employee → log
isTenantActive(), checkPlanLimit(), isFeatureEnabled(), getTenantConfig()
```

### UI: Login admin, דשבורד tenants, יצירת tenant, עריכה, מסך הגדרות.

---

## חלק 8 — Storefront (מודולים 3 + 8)

**Repo נפרד. Tech: Astro + TypeScript + Tailwind CSS.** קורא רק Views + RPC.

### Showcase (מודול 3)
דף בית, קטלוג, עמוד מוצר (Showcase=WhatsApp, Full=עגלה עתידית), בלוג, לידים, SEO, White-Label.
**טבלאות:** storefront_config, storefront_product_config, storefront_leads, storefront_articles.

### Full (מודול 8)
עגלה + checkout + מעקב הזמנה + פורטל לקוח.

### עיקרון: ERP מודול חדש → View חדש → Storefront רכיב חדש. אפס שינויים ב-ERP.

---

## חלק 9 — מודולים עתידיים (תקצירים)

**4 — לקוחות CRM:** מספור 10001/10001-1, 6 לשוניות, pg_trgm, ולידציית טלפון.
**5 — הזמנות:** 5 סוגי הזמנה, 2 זוגות, סטטוסים. שדות מעבדה מוכנים: routing_type, sla_deadline, qa_status.
**6 — בדיקת עיניים:** SPH/CYL/AXIS/ADD/Visus/PD, תאריך immutable, גרפים.
**7 — תשלומים:** מזומן/אשראי/קופת חולים, 1-36 תשלומים, קבלה, החזרים.
**9 — מעבדה + KDS:** 6 תת-מודולים. Native הזמנות, לא bridge.
**10 — מלאי עדשות.** **11 — סניפים (MVP=אחד).** **12 — מעקב Dashboard.** **13 — WhatsApp.**
**14 — דוחות.** **15 — כספים ספקים (AI-ready invoicing).** **16 — סוכן AI (OCR).**
**17 — פורטל ספקים (token auth, Views).** **18 — Content Hub AI.** **19 — B2B Network.**
**20 — AI Support Bot:** צ'אט בוט per-tenant. עובד שואל שאלה טכנית → AI עונה מתוך knowledge base (MODULE_SPECs). למידה מ-feedback (helpful: true/false). DB: `support_chat_history (id, tenant_id, user_id, message, response, helpful, created_at)`. דורש 5+ מודולים עם specs + 2-3 tenants.
**21 — WooCommerce.** **22 — קופה אנדרואיד.**

---

## חלק 10 — מפת DB

```
═══ קיים ✅ (מודול 1) ═══
inventory, inventory_images, inventory_logs, brands, suppliers, employees,
goods_receipts, goods_receipt_items, purchase_orders, purchase_order_items,
stock_counts, stock_count_items, tenants, roles, permissions,
role_permissions, employee_roles, auth_sessions

═══ מודול 1.5 ═══
activity_log, content_items
+ custom_fields JSONB על inventory (ועל customers/orders כשייבנו)
+ RPC functions + shared/ components

═══ מודול 2 ═══
plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log

═══ Storefront ═══
storefront_config, storefront_product_config, storefront_leads, storefront_articles

═══ CRM ═══
customers, customer_notes

═══ הזמנות + תשלומים ═══
orders, order_items, payments, receipts

═══ מעבדה ═══
lab_orders, lab_order_status_log, lab_sla_config, lab_compensations,
lab_qa_checklists, lab_shipments, lab_shipment_items

═══ כספים + זיכויים ═══
supplier_invoices, supplier_payments, currencies,
supplier_returns, supplier_return_items

═══ שאר ═══
lenses, lens_stock, branches, supplier_auth, ai_agent_config,
whatsapp_log, whatsapp_templates, networks, network_members,
support_chat_history
```

---

## חלק 11 — כללי ברזל

> ⛔ כמות מלאי = רק דרך RPC אטומי (לא חישוב ב-JS)
> ⛔ תאריכים (הזמנה/מרשם) = immutable
> ⛔ מספרים (הזמנה/לקוח/קבלה) = ייחודי, עולה, immutable
> ⛔ מחיקה = soft delete בלבד
> ⛔ כל פעולה = activity_log עם: tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details
> ⛔ שינוי ערך = details חייב { changes: [{ field, old, new }] }
> ⛔ Storefront קורא רק Views + RPC
> ⛔ כל טבלה = tenant_id + RLS
> ⛔ אין ערכים עסקיים hardcoded — תמיד ממשתנה/config
> ⛔ ערכים configurable — מטבעות, שפות, סוגי תשלום = טבלאות, לא enums
> ⛔ מודולים מתקשרים דרך חוזים, לא טבלאות ישירות
> ⛔ כל מודול בודק plan limits דרך checkPlanLimit()
> ⛔ כל רכיב UI חדש = דרך shared/ (לא קוד חד-פעמי)
> ⛔ תמונות מלאי = original resolution + WebP copy
> ⛔ שום צבע hardcoded — רק CSS Variables
> ⛔ ERP = Vanilla JS, no build step. Storefront = Astro + TypeScript + Tailwind

---

## חלק 12 — חוזים קיימים

**מודול 1 — מלאי:** getItemByBarcode, searchFrames, updateQuantity (RPC atomic), getStockLevel, writeLog, getBrands, getSuppliers
**מודול 1 — Auth:** getCurrentUser → { id, name, role, branch_id, tenant_id }, verifyPIN, hasPermission
**מודול 2 — Platform (מתוכנן):** isTenantActive, checkPlanLimit, isFeatureEnabled, getTenantConfig, createTenant, suspendTenant

---

## חלק 13 — כל ההחלטות

| תאריך | החלטה | נימוק |
|--------|--------|--------|
| מרץ 2026 | מתחילים ממלאי | Access מטפל במכירות. המלאי = הכאב |
| מרץ 2026 | בונים ליד Access | ערך מיידי, החלפה הדרגתית |
| מרץ 2026 | ERP = Vanilla JS, HTML נפרד, no build step | מהירות, פשטות, Claude Code |
| מרץ 2026 | Storefront = Astro + TypeScript + Tailwind | SEO, ביצועים, מודרני. repo נפרד |
| מרץ 2026 | לא TypeScript/Tailwind/Vite ל-ERP | עובד, לא נוגעים. build step = סיבוך מיותר |
| מרץ 2026 | Storefront = repo נפרד, Views בלבד | אבטחה, הפרדה |
| מרץ 2026 | tenant_id מהיום הראשון | SaaS-ready בלי rebuild |
| מרץ 2026 | מודול 1.5 לפני מודול 2 | shared components + atomic RPC + audit |
| מרץ 2026 | Platform Admin = מודול 2 | plans, limits, provisioning, הגדרות per-tenant |
| מרץ 2026 | Platform Auth ≠ Tenant Auth | email+password vs PIN |
| מרץ 2026 | מסך הגדרות = מודול 2, לא 1.5 | tenant_config מלא, לא גרסה רזה |
| מרץ 2026 | טבלאות מלאות, UI בהדרגה | אפס migrations |
| מרץ 2026 | Provisioning אוטומטי + log | seed מלא, מעקב שלב-שלב |
| מרץ 2026 | Atomic RPC לכל שינוי כמות | מניעת race conditions |
| מרץ 2026 | activity_log מרכזי | analytics חוצי-מודולים, severity+branch_id+changeset |
| מרץ 2026 | inventory_logs נשאר, unified view בעתיד | לא שוברים מודול 1 |
| מרץ 2026 | content_items + מסך תוכן שיווקי | תשתית ב-1.5, AI בפאזה 5+ |
| מרץ 2026 | custom_fields JSONB ריק בטבלאות מרכזיות | מוכן לשדות דינמיים per-tenant בעתיד |
| מרץ 2026 | AI-ready invoicing | טופס ידני, שדות תואמים ל-Claude Vision |
| מרץ 2026 | AI Support Bot = פאזה 5+ | דורש knowledge base (MODULE_SPECs) + tenants |
| מרץ 2026 | Predictive Validation = פאזה 5+ | דורש data, אפס תשתית נוספת |
| מרץ 2026 | Behavioral tracking = analytics tool, לא custom | Mixpanel/Amplitude כשיש 10+ tenants |
| מרץ 2026 | B2B Network = אפס תשתית נוספת | tenant_id + RLS = מספיק |
| מרץ 2026 | זיכויים מפוצלים | מלאי/מעבדה/כספים |
| מרץ 2026 | מעבדה אחרי הזמנות + תשלומים | native, לא bridge |
| מרץ 2026 | סניפים בעדיפות נמוכה | MVP = סניף אחד |
| מרץ 2026 | 4-tier workflow | אסטרטגי → מוצר → מפקח → Claude Code |
| מרץ 2026 | Zero coupling + חוזים | מודולים עצמאיים |
| מרץ 2026 | כל פאזה שוקלת Views לגורמים חיצוניים | Storefront, ספקים, לקוחות |

---

## חלק 14 — שאלות פתוחות

| שאלה | חוסם | דחיפות |
|-------|------|--------|
| Platform Admin URL: /admin.html או subdomain? | מודול 2 | גבוהה |
| Supabase Auth — email+password flow | מודול 2 | גבוהה |
| WooCommerce — לחבר או להחליף? | מודול 21 | בינונית |
| WhatsApp Business API token | מודול 13 | בינונית |
| תמחור ציפויים — מבנה טבלה | מודול 5 | בינונית |
| פורמט טבלה Access↔מעבדה | מודול 9 | בינונית |
| Billing model | לפני לקוח שני | נמוכה |

---

## חלק 15 — הצעד הבא

**עכשיו:** לסיים פאזות פתוחות במודול 1 (אם נשארו).
**אחרי:** מודול 1.5 — Shared Components Refactor (6 משימות).
**אחרי:** מודול 2 — Platform Admin Basics.
**אחרי:** מודול 3 — Storefront Showcase (Astro + TypeScript + Tailwind).
**אחרי:** מודול 4 — לקוחות CRM.

---

*מסמך זה הוא "מוח הפרויקט". 22 מודולים, כל ההחלטות, כל התלויות.*
*צ'אט אסטרטגי חדש — קרא הכל והמשך מחלק 15.*
