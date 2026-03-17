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
- **Content Hub** — AI שהופך תמונות מלאי לתוכן שיווקי אוטומטית
- **B2B Network** — חנויות מחפשות מסגרות אצל חנויות אחרות. Network effect
- **AI Insights** — ניתוח צווארי בקבוק, תקלות חוזרות. דורש 3+ tenants
- **AI Support Bot** — צ'אט בוט per-tenant שעונה על שאלות טכניות
- **Predictive Validation** — AI שמזהה חריגות בנתונים בזמן אמת

### הלקוח הראשון
**אופטיקה פריזמה** — Access + תוכנת מעבדה נפרדת (מחוברות דרך טבלה פנימית) + אתר WooCommerce.

### האסטרטגיה — "בנייה ליד Access"
בונים ליד Access, מחליפים בהדרגה.

---

## חלק 2 — סטאק טכנולוגי

### ERP — בלי build step
Vanilla JS, HTML נפרד לכל מודול, CSS Variables (לא Tailwind), GitHub Pages, Supabase.
**לא TypeScript, לא Tailwind, לא Vite ל-ERP.** מה שעובד לא נוגעים בו.

### Storefront — stack מודרני
Astro + TypeScript + Tailwind CSS, Vercel, repo נפרד (`opticalis/prizma-storefront`).
**שני עולמות נפרדים, DB אחד.**

### פרטים
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

---

## חלק 4 — איפה אנחנו (מרץ 2026)

### ✅ מודול 1 — מלאי מסגרות (Inventory Management)
**הושלם עד פאזה 5.75.** פאזות 5.9 (ארגזים) ו-6 (פורטל ספקים, נדחה למודול 17) נותרו.
~40+ טבלאות ב-DB. 12 פאזות שהושלמו:

| פאזה | שם | מה כולל |
|------|----|---------|
| 0 ✅ | הכנה | פיצול קבצים, CLAUDE.md, min_stock_qty |
| 1 ✅ | הזמנות רכש | PO, קבלות סחורה, התראות מלאי |
| 1.5 ✅ | שיפורים | Cascading dropdowns, wizard, PDF |
| 2 ✅ | ספירת מלאי + גשר Access | סורק, Folder Watcher, Dropbox sync |
| 3 ✅ | הרשאות ואימות | PIN login, 5 תפקידים, מטריצת הרשאות |
| 3.5 ✅ | מסך בית + שינוי repo | index.html, inventory.html, opticup |
| 3.75 ✅ | Multi-Tenancy | tenant_id על ~22 טבלאות, RLS, RPC contracts |
| 3.8 ✅ | Sticky Header | שם + לוגו דינמי per-tenant |
| 4 ✅ | חובות ספקים | 11 טבלאות, דשבורד חובות, אשף תשלומים, מקדמות, זיכויים |
| 5 ✅ | סוכן AI | OCR חשבוניות (Claude Vision), למידה per-tenant |
| 5.5 ✅ | יציבות וסקייל | Atomic RPCs, batch upload, filtering, historical import |
| 5.75 ✅ | Communications stubs | 6 טבלאות ריקות (conversations, messages, knowledge_base) |
| 5.9 ⬜ | **ארגזים ומשלוחים** | **מסיימים עכשיו — ראה פירוט בחלק 6** |

**פורטל ספקים (פאזה 6 מקורית) נדחה למודול 17** — דורש auth חיצוני שייבנה במודול 2.

### ⬜ מודול 1.5 — Shared Components Refactor — הבא אחרי 5.9

### כל השאר — טרם התחיל

---

## חלק 5 — סדר בנייה מלא

| סדר | מודול | סטטוס | למה בסדר הזה |
|-----|-------|-------|--------------|
| 1 | מלאי מסגרות | ✅ (0-5.75), 5.9 בבנייה | הבסיס |
| **1.5** | **Shared Components Refactor** | **⬜ הבא** | **תשתית לכל מודול עתידי** |
| 2 | Platform Admin Basics | ⬜ | SaaS foundation |
| 3 | Storefront Showcase (Astro+TS+Tailwind) | ⬜ | ROI מיידי |
| 4 | לקוחות CRM | ⬜ | חוסם הזמנות + בדיקות |
| 5 | הזמנות | ⬜ | מתחיל להחליף Access |
| 6 | בדיקת עיניים | ⬜ | תלוי בלקוחות + הזמנות |
| 7 | תשלומים | ⬜ | תלוי בהזמנות |
| 8 | Storefront Full | ⬜ | עגלה + תשלום + מעקב |
| 9 | מעבדה + KDS | ⬜ | native הזמנות, מרחיב shipments |
| 10 | מלאי עדשות | ⬜ | ארכיטקטורה כמו מודול 1 |
| 11 | סניפים | ⬜ | MVP = סניף אחד |
| 12 | מעקב הזמנות Dashboard | ⬜ | צריך נתונים מהכל |
| 13 | WhatsApp אוטומטי | ⬜ | צריך לקוחות + הזמנות |
| 14 | דוחות | ⬜ | צריך כל המודולים |
| 15 | כספים ספקים (הרחבה) | ⬜ | AI-ready invoicing |
| 16 | סוכן AI (הרחבה) | ⬜ | OCR + התראות מורחב |
| 17 | פורטל ספקים | ⬜ | token auth, Views בלבד |
| 18 | Content Hub AI | ⬜ | תשתית ב-1.5 |
| 19 | B2B Network | ⬜ | תשתית כבר קיימת |
| 20 | AI Support Bot | ⬜ | knowledge base = MODULE_SPECs |
| 21 | WooCommerce sync | ⬜ | סנכרון דו-כיווני |
| 22 | קופה אנדרואיד | ⬜ | חיבור POS |

---

## חלק 6 — פאזה 5.9: ארגזים ומשלוחים (Shipments)

### הרעיון
כל דבר שיוצא מהחנות — מסגור לספק עדשות, זיכוי, תיקון, משלוח ללקוח — עובר דרך ארגז ממוספר. מחליף טבלת Access ידנית. **"ארוז → שלח → תעד. זהו."**

### מה זה לא
- **לא מעקב חזרה** — פריטים חוזרים אחד-אחד בזמנים שונים. מעקב חזרה = מודול מעבדה (9)
- **לא התראות זמן** — אין מעקב SLA על ארגזים. SLA = מודול מעבדה
- **לא סטטוסים מורכבים** — ארגז נוצר = נשלח. נקודה

### DB
```
courier_companies (id, tenant_id, name, phone, contact_person, is_active)

shipments (
  id, tenant_id, box_number TEXT (BOX-{seq}, immutable),
  shipment_type TEXT ('framing'/'return'/'repair'/'delivery'),
  supplier_id, courier_id REFERENCES courier_companies,
  tracking_number, packed_by, packed_at, shipped_at,
  notes, items_count, total_value, is_deleted
)

shipment_items (
  id, tenant_id, shipment_id,
  item_type TEXT ('inventory'/'order'/'repair'),
  inventory_id, return_id REFERENCES supplier_returns,
  order_number TEXT, customer_name TEXT, customer_number TEXT,  -- ידני עכשיו, FK בעתיד
  barcode, brand, model,
  category TEXT ('stock'/'order'/'production'/'multifocal'/'office'/'bifocal'/'sun'/'contact'/'repair'),
  unit_cost, notes
)
```

### חיבור לזיכויים
כשפריט זיכוי נכנס לארגז ויש לו `return_id` → סטטוס ב-supplier_returns מתעדכן ל-"shipped" **אוטומטי**. פעולה אחת = שני עדכונים.

### עריכת ארגז
חלון 30 דקות לעריכה (הוספה/הסרה של פריטים). אחרי נעילה = immutable כמו חשבונית. הסרת פריט זיכוי = חוזר ל-"staged" ב-supplier_returns.

### מה מודול מעבדה (9) יוסיף בעתיד (ALTER TABLE, לא migration):
```
על shipments: lab_received_at, lab_status, sla_deadline
על shipment_items: lab_item_status, qa_passed, qa_notes, completed_at
```
KDS = View על `shipments WHERE shipment_type = 'framing'`. אפס שינויים בקוד קיים.

---

## חלק 7 — מודול 1.5: Shared Components Refactor

### 6 משימות

**1. חילוץ רכיבים ל-shared/**
```
shared/css/ → variables.css (CSS Variables), components.css, layout.css
shared/js/ → table-builder.js, modal-builder.js, form-builder.js, pin-modal.js, toast.js, export-excel.js, validators.js
```
inventory.html מעודכן לטעון מ-shared/. חייב לעבוד כמו קודם.

**2. Atomic RPC Operations**
כל שינוי כמות = Supabase RPC (`quantity = quantity + x`). סריקה והחלפה של כל read→compute→write.

**3. Activity Log — טבלה מרכזית**
```sql
activity_log (id, tenant_id, branch_id, user_id, level TEXT DEFAULT 'info', action, entity_type, entity_id, details JSONB, created_at)
```
- level: info/warning/error/critical
- שינוי ערך: details חייב `{ changes: [{field, old, new}] }`
- יצירה/מחיקה/login: details חופשי
- inventory_logs נשאר. unified view בעתיד.

**4. מסך "תוכן שיווקי" + content_items**
Gallery פריטים חדשים, הורדת תמונות/ZIP, סימון "פורסם."
```sql
content_items (id, tenant_id, inventory_id, source_image, status, ai_caption, ai_video_url, ai_hashtags TEXT[], manual_caption, published_to JSONB, published_at, created_at)
```

**5. אפס ערכים hardcoded**
סריקת כל הקוד: שם עסק, כתובת, מע"מ, לוגו = תמיד ממשתנה.

**6. custom_fields JSONB**
שדה ריק על inventory (ועל customers/orders כשייבנו). מוכן לשדות דינמיים per-tenant בעתיד.

### אחרי מודול 1.5 — מתיחת פנים
שינוי variables.css + components.css = כל המערכת מתעדכנת. יום עבודה אחד. **חייב להיות אחרי 1.5, לא לפני.**

---

## חלק 8 — מודול 2: Platform Admin

**DB:** plans, platform_admins (email+password Supabase Auth, **לא PIN**), tenant_config, platform_audit_log, tenant_provisioning_log + הרחבת tenants (status, plan_id, trial_ends_at, owner details).
**Provisioning:** createTenant() → tenant → config → roles → permissions → default employee → log
**Helpers:** isTenantActive(), checkPlanLimit(), isFeatureEnabled(), getTenantConfig()
**UI עכשיו:** Login admin (/admin.html), דשבורד tenants, יצירת tenant, עריכה, מסך הגדרות per-tenant.
**UI עתידי:** 2FA, impersonation, Stripe, feature flags, analytics.

---

## חלק 9 — Storefront (מודולים 3 + 8)

Repo נפרד. **Astro + TypeScript + Tailwind.** קורא רק Views + RPC.
**Showcase (3):** דף בית, קטלוג, עמוד מוצר (WhatsApp), בלוג, לידים, SEO, White-Label.
**Full (8):** עגלה + checkout + מעקב + פורטל לקוח.
**טבלאות:** storefront_config, storefront_product_config, storefront_leads, storefront_articles.
**עיקרון:** ERP מודול חדש → View חדש → Storefront רכיב חדש. אפס שינויים ב-ERP.

---

## חלק 10 — מודולים עתידיים (תקצירים)

**4 — לקוחות:** מספור 10001/10001-1, 6 לשוניות, pg_trgm, ולידציית טלפון.
**5 — הזמנות:** 5 סוגי הזמנה, 2 זוגות, סטטוסים. שדות מעבדה מוכנים: routing_type, sla_deadline, qa_status.
**6 — בדיקת עיניים:** SPH/CYL/AXIS/ADD/Visus/PD, immutable, גרפים.
**7 — תשלומים:** מזומן/אשראי/קופת חולים, 1-36 תשלומים, קבלה, החזרים.
**9 — מעבדה + KDS:** 6 תת-מודולים. **מרחיב טבלת shipments** (שדות lab_*), לא מחליף. KDS = View.
**10 — עדשות.** **11 — סניפים (MVP=אחד).** **12 — מעקב Dashboard.** **13 — WhatsApp.**
**15 — כספים (AI-ready invoicing).** **16 — סוכן AI הרחבה.** **17 — פורטל ספקים (token auth, Views).**
**18 — Content Hub AI.** **19 — B2B Network (tenant_id+RLS=תשתית קיימת).**
**20 — AI Support Bot (knowledge base=MODULE_SPECs).** **21 — WooCommerce.** **22 — קופה.**

### זיכויים לספקים — פלואו מפוצל
- **מלאי (קיים):** החלטה + Remove + מספור RET-{supplier}-{seq} + סטטוסים (pending→staged→shipped/picked_up→credit_received→done)
- **ארגזים (5.9):** קיבוץ לארגז + שליחה + manifest
- **כספים (15):** קבלת תעודת זיכוי + התאמת סכומים (full/partial/excess/missing) + עדכון חוב
- **מעבדה (9):** לוגיסטיקת שליחה (נוהל ארגזים מורחב)

---

## חלק 11 — מפת DB

```
═══ קיים ✅ (מודול 1, ~40+ טבלאות) ═══
inventory, inventory_images, inventory_logs, brands, suppliers, employees,
goods_receipts, goods_receipt_items, purchase_orders, purchase_order_items,
stock_counts, stock_count_items, tenants, roles, permissions,
role_permissions, employee_roles, auth_sessions,
document_types, payment_methods, currencies, supplier_documents,
document_links, supplier_payments, payment_allocations,
prepaid_deals, prepaid_checks, supplier_returns, supplier_return_items,
conversations, conversation_participants, messages, knowledge_base,
message_reactions, notification_preferences

═══ פאזה 5.9 (בבנייה) ═══
courier_companies, shipments, shipment_items

═══ מודול 1.5 ═══
activity_log, content_items + RPC functions + shared/ components

═══ מודול 2 ═══
plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log

═══ Storefront ═══
storefront_config, storefront_product_config, storefront_leads, storefront_articles

═══ CRM ═══
customers, customer_notes

═══ הזמנות + תשלומים ═══
orders, order_items, payments, receipts

═══ מעבדה ═══
lab_* fields על shipments/shipment_items (ALTER TABLE)

═══ שאר ═══
lenses, lens_stock, branches, supplier_auth, ai_agent_config,
whatsapp_log, whatsapp_templates, networks, network_members,
support_chat_history
```

---

## חלק 12 — כללי ברזל

> ⛔ כמות מלאי = רק דרך RPC אטומי
> ⛔ תאריכים (הזמנה/מרשם) = immutable
> ⛔ מספרים (הזמנה/לקוח/קבלה/ארגז/זיכוי) = ייחודי, עולה, immutable
> ⛔ מחיקה = soft delete בלבד
> ⛔ כל פעולה = activity_log (tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details)
> ⛔ שינוי ערך = details חייב { changes: [{field, old, new}] }
> ⛔ Storefront קורא רק Views + RPC
> ⛔ כל טבלה = tenant_id + RLS
> ⛔ אין ערכים עסקיים hardcoded — תמיד ממשתנה/config
> ⛔ ערכים configurable — מטבעות, שפות, סוגי תשלום = טבלאות, לא enums
> ⛔ מודולים מתקשרים דרך חוזים, לא טבלאות ישירות
> ⛔ כל מודול בודק plan limits דרך checkPlanLimit()
> ⛔ כל רכיב UI חדש = דרך shared/
> ⛔ תמונות מלאי = original resolution + WebP copy
> ⛔ שום צבע hardcoded — רק CSS Variables
> ⛔ ERP = Vanilla JS, no build step. Storefront = Astro + TS + Tailwind
> ⛔ ארגז ננעל אחרי 30 דקות. אחרי נעילה = immutable כמו חשבונית

---

## חלק 13 — חוזים קיימים

**מודול 1 — מלאי:** getItemByBarcode, searchFrames, updateQuantity (RPC atomic), getStockLevel, writeLog, getBrands, getSuppliers
**מודול 1 — Auth:** getCurrentUser → {id, name, role, branch_id, tenant_id}, verifyPIN, hasPermission
**מודול 2 — Platform (מתוכנן):** isTenantActive, checkPlanLimit, isFeatureEnabled, getTenantConfig, createTenant, suspendTenant

---

## חלק 14 — כל ההחלטות

| תאריך | החלטה | נימוק |
|--------|--------|--------|
| מרץ 2026 | מתחילים ממלאי | Access מטפל במכירות. המלאי = הכאב |
| מרץ 2026 | בונים ליד Access | ערך מיידי, החלפה הדרגתית |
| מרץ 2026 | ERP = Vanilla JS, no build | מהירות, פשטות, Claude Code |
| מרץ 2026 | Storefront = Astro + TS + Tailwind | SEO, ביצועים. repo נפרד |
| מרץ 2026 | לא TS/Tailwind/Vite ל-ERP | עובד, לא נוגעים. build = סיבוך |
| מרץ 2026 | Storefront = Views בלבד | אבטחה, הפרדה |
| מרץ 2026 | tenant_id מהיום הראשון | SaaS-ready |
| מרץ 2026 | מודול 1.5 לפני מודול 2 | shared components + atomic RPC + audit |
| מרץ 2026 | Platform Admin = מודול 2 | plans, limits, provisioning, settings |
| מרץ 2026 | Platform Auth ≠ Tenant Auth | email+password vs PIN |
| מרץ 2026 | מסך הגדרות = מודול 2, לא 1.5 | tenant_config מלא, לא גרסה רזה |
| מרץ 2026 | טבלאות מלאות, UI בהדרגה | אפס migrations |
| מרץ 2026 | Provisioning אוטומטי + log | seed מלא, מעקב שלב-שלב |
| מרץ 2026 | Atomic RPC לכל שינוי כמות | מניעת race conditions |
| מרץ 2026 | activity_log מרכזי | severity + branch_id + changeset |
| מרץ 2026 | inventory_logs נשאר, unified view בעתיד | לא שוברים מודול 1 |
| מרץ 2026 | content_items + מסך תוכן שיווקי | תשתית ב-1.5, AI בפאזה 5+ |
| מרץ 2026 | custom_fields JSONB ריק | מוכן לשדות דינמיים per-tenant |
| מרץ 2026 | AI-ready invoicing | טופס ידני, שדות תואמים ל-Claude Vision |
| מרץ 2026 | AI Support Bot = פאזה 5+ | דורש knowledge base + tenants |
| מרץ 2026 | Predictive Validation = פאזה 5+ | דורש data |
| מרץ 2026 | Behavioral tracking = analytics tool | Mixpanel/Amplitude כשיש 10+ tenants |
| מרץ 2026 | B2B Network = אפס תשתית נוספת | tenant_id + RLS = מספיק |
| מרץ 2026 | זיכויים מפוצלים | מלאי (החלטה) / ארגזים (שליחה) / כספים (התאמה) / מעבדה (לוגיסטיקה) |
| מרץ 2026 | ארגזים = מודול עצמאי (5.9) | שייך לכל סוגי השליחה, לא רק זיכויים |
| מרץ 2026 | ארגזים: אין מעקב חזרה | פריטים חוזרים אחד-אחד. מעקב = מודול מעבדה |
| מרץ 2026 | ארגזים: אין סטטוסים | נוצר = נשלח. נקודה |
| מרץ 2026 | ארגזים: נעילה 30 דק | אחרי נעילה = immutable. טעות = ארגז חדש |
| מרץ 2026 | shipment_type כשדה | 'framing'/'return'/'repair'/'delivery'. מעבדה מסננת לפיו |
| מרץ 2026 | מעבדה מרחיבה shipments | ALTER TABLE, לא טבלאות חדשות. אפס שינויים |
| מרץ 2026 | פורטל ספקים נדחה למודול 17 | דורש auth חיצוני ממודול 2 |
| מרץ 2026 | courier_companies = dropdown מנוהל מראש | לא כתיבה ידנית |
| מרץ 2026 | מתיחת פנים UI = אחרי מודול 1.5 | shared components קודם, עיצוב אחרי |
| מרץ 2026 | מעבדה אחרי הזמנות + תשלומים | native, לא bridge |
| מרץ 2026 | סניפים בעדיפות נמוכה | MVP = סניף אחד |
| מרץ 2026 | 4-tier workflow | אסטרטגי → מוצר → מפקח → Claude Code |
| מרץ 2026 | Zero coupling + חוזים | מודולים עצמאיים |
| מרץ 2026 | Secret rotation בוצע | keys שנחשפו בצ'אטים הוחלפו |

---

## חלק 15 — הצעד הבא

**עכשיו:** לסיים פאזה 5.9 (ארגזים ומשלוחים) במודול 1.
**אחרי:** מודול 1.5 — Shared Components Refactor (6 משימות).
**אחרי:** מתיחת פנים UI (יום אחד — variables.css + components.css).
**אחרי:** מודול 2 — Platform Admin Basics.
**אחרי:** מודול 3 — Storefront Showcase.
**אחרי:** מודול 4 — לקוחות CRM.

---

*מסמך זה הוא "מוח הפרויקט". 22 מודולים, כל ההחלטות, כל התלויות.*
*צ'אט אסטרטגי חדש — קרא הכל והמשך מחלק 15.*
