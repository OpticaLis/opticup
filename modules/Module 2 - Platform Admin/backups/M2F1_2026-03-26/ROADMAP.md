# Optic Up — מודול 2: Platform Admin — ROADMAP

> **Authority:** Phase status only. For rules → CLAUDE.md. For code → MODULE_MAP.md. For current status → SESSION_CONTEXT.md.
> **מיקום:** `modules/Module 2 - Platform Admin/ROADMAP.md`
> **עודכן לאחרונה:** מרץ 2026
> **הצ'אט המשני מעדכן את סימוני ✅/⬜ בסוף כל פאזה**

---

## חזון — SaaS לרשתות אופטיקה

Optic Up הוא **פלטפורמת SaaS** לניהול חנויות אופטיקה. כל חנות שמצטרפת מקבלת:

1. **ERP** — מערכת ניהול פנימית (מלאי, הזמנות, ספקים, עובדים)
2. **Storefront** — אתר חנות ממותג ללקוח הקצה (עתידי)

שני המוצרים חולקים **Supabase אחד** עם בידוד מלא באמצעות `tenant_id` על כל טבלה.

**הלקוח הראשון:** אופטיקה פריזמה (production). **Tenant שני:** אופטיקה דמו (testing).

---

## מה המודול הזה עושה

מודול 2 הופך את Optic Up מ"מערכת שעובדת לפריזמה" ל"פלטפורמה שכל חנות אופטיקה יכולה להצטרף אליה."

**הבעיה היום:** הוספת tenant = SQL ידני. אין dashboard, אין plans, אין admin login נפרד. אין דרך לנהל tenants, להגביל שימוש, או לתת support ללקוחות.

**מה המודול נותן:**

- **Admin Panel** — דף נפרד (`admin.html`) עם email+password login (Supabase Auth). מנותק לגמרי מ-PIN login של tenants. תומך בכמה admins עם roles שונים.
- **Tenant Provisioning** — כפתור "חנות חדשה" → טופס → `createTenant()` RPC → tenant מוכן עם עובד ראשון, roles, permissions, config. 10 שניות במקום 20 דקות SQL.
- **Tenant Dashboard** — רשימת tenants עם סטטוס, plan, usage, last_active. עריכה, suspend, activate. Activity log viewer per tenant (read-only) ל-support.
- **Plans & Limits** — תוכניות מנוי עם הגבלות (עובדים, מלאי, OCR scans, סניפים). `checkPlanLimit()` ו-`isFeatureEnabled()` שכל מודול קורא.
- **Feature Flags** — 18 flags ברמת feature. כל flag = on/off per plan. Admin יכול לדרוס per tenant.
- **Slug Routing** — validation, error pages, הכנה ל-subdomains.

### מה זה לא:

- **לא Stripe/billing** — plan assignment ידני. חיוב כשיהיו 10+ tenants
- **לא 2FA** — email+password מספיק לשלב הזה
- **לא Impersonation** — admin לא נכנס "בתור" tenant. יש לו activity log viewer
- **לא Self-service signup** — admin יוצר tenants, לא הלקוחות
- **לא Analytics dashboard** — דורש נתונים מכל המודולים
- **לא Health Score** — `last_active` מוכן, חישוב כשיהיו 20+ tenants

---

## תלויות

**מודול 2 תלוי ב:**
- מודול 1 (מלאי) הושלם ✅ — tenants, roles, permissions, employees קיימים
- מודול 1.5 (shared) הושלם ✅ — Modal, Toast, DB.*, TableBuilder, PermissionUI, ActivityLog

**תלויים במודול 2:**
- מודול 3 (Storefront) — צריך tenant_config, storefront_config, plans
- מודול 4 (CRM) — צריך checkPlanLimit
- **כל מודול עתידי** — קורא checkPlanLimit() ו-isFeatureEnabled()
- **Tenant שני אמיתי** — לא בלי provisioning אוטומטי

---

## מפת פאזות

| פאזה | סטטוס | שם | מה כולל |
|------|--------|----|---------|
| 1 | ⬜ | DB + Admin Auth | טבלאות, Supabase Auth setup, admin.html login |
| 2 | ⬜ | Tenant Provisioning | createTenant() RPC, טופס יצירה, slug validation |
| 3 | ⬜ | Dashboard + Management | רשימת tenants, עריכה, suspend, activity log viewer |
| 4 | ⬜ | Plans & Limits | טבלת plans, checkPlanLimit(), isFeatureEnabled(), feature flags |
| 5 | ⬜ | Slug Routing + Future Prep | error pages, routing hardening, B2B/Storefront DB prep |
| QA | ⬜ | Full Test | provisioning, plan limits, admin auth, tenant isolation, multi-admin |

---

## פירוט כל פאזה

### פאזה 1 ⬜ — DB + Admin Auth

**המטרה:** טבלאות DB למודול 2 + admin.html עם email+password login דרך Supabase Auth.

**טבלאות חדשות:**

```sql
-- Plans
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                    -- 'basic', 'premium', 'enterprise'
  display_name TEXT NOT NULL,            -- 'בסיסי', 'פרימיום', 'ארגוני'
  limits JSONB NOT NULL DEFAULT '{}',    -- { max_employees, max_inventory, max_suppliers, max_documents_per_month, max_storage_mb, max_ocr_scans_monthly, max_branches }
  features JSONB NOT NULL DEFAULT '{}',  -- { inventory: true, ocr: false, ... }
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform Admins
CREATE TABLE platform_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,           -- Supabase Auth user reference
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform Audit Log
CREATE TABLE platform_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES platform_admins(id),
  action TEXT NOT NULL,                  -- 'tenant.create', 'tenant.suspend', 'plan.change'
  target_tenant_id UUID REFERENCES tenants(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant Config (key/value per tenant)
CREATE TABLE tenant_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Tenant Provisioning Log
CREATE TABLE tenant_provisioning_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  step TEXT NOT NULL,                    -- 'create_tenant', 'create_config', 'create_roles', etc.
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**הרחבת tenants:**
```sql
ALTER TABLE tenants ADD COLUMN plan_id UUID REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'deleted'));
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN owner_name TEXT;
ALTER TABLE tenants ADD COLUMN owner_email TEXT;
ALTER TABLE tenants ADD COLUMN owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN created_by UUID REFERENCES platform_admins(id);
ALTER TABLE tenants ADD COLUMN suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN last_active TIMESTAMPTZ;
```

**admin.html:**
- Email + password login דרך Supabase Auth (`supabase.auth.signInWithPassword`)
- אחרי login → בדיקה שה-email קיים ב-platform_admins ו-status='active'
- Session management דרך Supabase Auth (לא sessionStorage)
- Logout אמיתי (`supabase.auth.signOut`)
- UI: טופס login פשוט, Hebrew RTL, shared/css/

**RLS:**
- plans: read-only for all (אין tenant_id — global table)
- platform_admins: accessible only via service role / Edge Function
- platform_audit_log: read by admin, write by system
- tenant_config: RLS by tenant_id (tenants read their own) + admin bypass
- tenant_provisioning_log: admin read-only

**Verification:**
- [ ] admin.html טוען ללא שגיאות
- [ ] login עם email+password → מקבל session
- [ ] login עם email שלא ב-platform_admins → "אין הרשאה"
- [ ] logout → session נמחק, redirect ל-login
- [ ] כל 5 הטבלאות נוצרו עם RLS
- [ ] tenants מורחב עם 9 עמודות חדשות

---

### פאזה 2 ⬜ — Tenant Provisioning

**המטרה:** יצירת tenant חדש בלחיצת כפתור. Atomic — הכל או כלום.

**createTenant() RPC:**

```sql
CREATE OR REPLACE FUNCTION create_tenant(
  p_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT,
  p_plan_id UUID,
  p_admin_pin TEXT,         -- PIN לעובד admin ראשון
  p_created_by UUID         -- platform_admin id
) RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- 1. Create tenant
  INSERT INTO tenants (name, slug, status, plan_id, owner_name, owner_email, owner_phone, created_by)
  VALUES (p_name, p_slug, 'active', p_plan_id, p_owner_name, p_owner_email, p_owner_phone, p_created_by)
  RETURNING id INTO v_tenant_id;
  
  -- 2. Create default config
  -- 3. Create 5 roles
  -- 4. Create 58 permissions + role_permissions
  -- 5. Create admin employee with PIN
  -- 6. Log each step to tenant_provisioning_log
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**טופס יצירה ב-admin panel:**
- שם חנות, slug (auto-suggest מהשם), email בעלים, טלפון, כתובת
- בחירת plan מ-dropdown
- PIN לעובד ראשון (5 ספרות)
- Validation: slug unique + format + reserved words
- Submit → createTenant() RPC → success toast + redirect לרשימת tenants

**Slug validation RPC:**
```sql
CREATE OR REPLACE FUNCTION validate_slug(p_slug TEXT) RETURNS JSONB AS $$
-- checks: format (a-z, 0-9, dash), unique, not reserved (admin, api, www, app, test)
$$ LANGUAGE plpgsql;
```

**Delete tenant:**
- Soft delete: status='deleted', deleted_at=now()
- Super_admin only, confirmation dialog (type slug to confirm)
- Hard delete = separate super_admin action (future, not in this phase)

**Verification:**
- [ ] יצירת tenant מטופס → tenant, config, roles, permissions, employee נוצרים
- [ ] כניסה ל-tenant חדש עם PIN → עובד
- [ ] slug duplicate → שגיאה
- [ ] slug עם תווים לא חוקיים → שגיאה
- [ ] reserved slug (admin, www) → שגיאה
- [ ] provisioning_log מציג כל שלב
- [ ] delete tenant → status='deleted', לא נגיש

---

### פאזה 3 ⬜ — Dashboard + Management

**המטרה:** Admin רואה ומנהל את כל ה-tenants. Support רואה activity log של tenant.

**Tenant Dashboard:**
- טבלה (TableBuilder) עם: שם, slug, plan, סטטוס, תאריך יצירה, עובדים (count), פריטי מלאי (count), last_active
- פילטרים: סטטוס, plan
- חיפוש: שם, slug
- Sort: כל עמודה

**Tenant Detail Panel (slide-in):**
- פרטי tenant: שם, slug, plan, סטטוס, בעלים, תאריכים
- Usage stats: עובדים (X/limit), מלאי (X/limit), OCR scans (X/limit)
- כפתורי פעולה: edit, suspend, activate, change plan, reset employee PIN
- טאבים:
  - **הגדרות** — עריכת כל ההגדרות
  - **Activity Log** — read-only view של activity_log מסונן לtenant. פילטרים: level, entity_type, date range. זה ה-support tool
  - **Provisioning Log** — שלבי היצירה
  - **Audit Log** — מה admins עשו ל-tenant הזה

**סטטוס management:**
- active ↔ suspended: כפתור + reason + PIN/password confirm
- Suspended tenant: עובדים שנכנסים רואים "החשבון מושהה, פנו ל-support"
- Trial: trial_ends_at מוצג. admin יכול להאריך

**Admin roles enforcement:**
- super_admin: כל הפעולות
- support: צפייה + reset PIN + activity log. לא: create/delete tenant, change plan, change admin roles
- viewer: צפייה בלבד

**Verification:**
- [ ] Dashboard מציג את כל ה-tenants עם stats נכונים
- [ ] Tenant detail פותח slide-in עם כל הטאבים
- [ ] Activity log מציג רק את ה-tenant הנבחר
- [ ] Suspend → tenant employees רואים הודעת השהייה
- [ ] Activate → tenant חוזר לעבוד
- [ ] Support role: לא יכול ליצור/למחוק tenant
- [ ] Viewer role: לא יכול לערוך כלום
- [ ] כל פעולת admin → platform_audit_log

---

### פאזה 4 ⬜ — Plans & Limits

**המטרה:** כל tenant מוגבל לפי ה-plan שלו. כל פעולה רלוונטית בודקת limit.

**Plans seed data (דוגמה — Daniel יחליט על הערכים):**
```sql
INSERT INTO plans (name, display_name, limits, features, sort_order) VALUES
('basic', 'בסיסי', 
  '{"max_employees": 5, "max_inventory": 1000, "max_suppliers": 20, "max_documents_per_month": 50, "max_storage_mb": 500, "max_ocr_scans_monthly": 20, "max_branches": 1}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": false, "shipments": true, "access_sync": false, "image_studio": false, "storefront": false, "b2b_marketplace": false, "api_access": false, "white_label": false, "custom_domain": false, "advanced_reports": false, "whatsapp": false}',
  1),
('premium', 'פרימיום',
  '{"max_employees": 20, "max_inventory": 10000, "max_suppliers": 100, "max_documents_per_month": 500, "max_storage_mb": 5000, "max_ocr_scans_monthly": 200, "max_branches": 3}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": true, "shipments": true, "access_sync": true, "image_studio": true, "storefront": true, "b2b_marketplace": false, "api_access": false, "white_label": false, "custom_domain": false, "advanced_reports": true, "whatsapp": true}',
  2),
('enterprise', 'ארגוני',
  '{"max_employees": -1, "max_inventory": -1, "max_suppliers": -1, "max_documents_per_month": -1, "max_storage_mb": -1, "max_ocr_scans_monthly": -1, "max_branches": -1}',
  '{"inventory": true, "purchasing": true, "goods_receipts": true, "stock_count": true, "supplier_debt": true, "ocr": true, "ai_alerts": true, "shipments": true, "access_sync": true, "image_studio": true, "storefront": true, "b2b_marketplace": true, "api_access": true, "white_label": true, "custom_domain": true, "advanced_reports": true, "whatsapp": true}',
  3);
```
**(-1 = unlimited)**

**shared/js/plan-helpers.js:**

```javascript
// Check if resource usage is within plan limit
async function checkPlanLimit(resource) {
  // Returns: { allowed: true/false, current: 45, limit: 100, remaining: 55, message: "..." }
  // resource: 'employees', 'inventory', 'suppliers', 'documents_per_month', 'storage_mb', 'ocr_scans_monthly', 'branches'
}

// Check if feature is enabled for current tenant
async function isFeatureEnabled(feature) {
  // Returns: boolean
  // feature: 'ocr', 'ai_alerts', 'shipments', 'image_studio', 'storefront', etc.
  // Checks: plan features → tenant override (if exists)
}
```

**Integration — איפה checkPlanLimit נקרא:**
- הוספת עובד → `checkPlanLimit('employees')`
- הוספת פריט מלאי → `checkPlanLimit('inventory')`
- הוספת ספק → `checkPlanLimit('suppliers')`
- יצירת מסמך ספק → `checkPlanLimit('documents_per_month')`
- העלאת קובץ → `checkPlanLimit('storage_mb')`
- OCR scan → `checkPlanLimit('ocr_scans_monthly')`

**Integration — איפה isFeatureEnabled נקרא:**
- בטעינת כל דף: UI elements של פיצ'רים לא-מאופשרים → hidden/disabled
- במסך בית (index.html): כרטיסי מודולים מוסתרים אם feature disabled
- בכל module init: בדיקה ראשונה לפני טעינת נתונים

**Feature override per tenant:**
- Admin יכול לפתוח feature ל-tenant ספציפי גם אם ה-plan לא כולל אותו
- tenant_config key: `feature_overrides` → JSONB `{ "ocr": true }` = פתוח ל-tenant הזה גם אם plan אומר false

**Plan management ב-admin panel:**
- רשימת plans — CRUD (super_admin only)
- שיוך plan ל-tenant — dropdown ב-tenant detail
- Downgrade: לא מוחק נתונים. חוסם יצירה חדשה. Toast "הגעת למגבלה, שדרגו תוכנית"

**Verification:**
- [ ] Tenant ב-basic plan: הוספת עובד #6 → "הגעת למגבלה (5/5)"
- [ ] Tenant ב-enterprise plan: unlimited → אפס הגבלות
- [ ] OCR scan #21 ב-basic → "הגעת למגבלה (20/20)"
- [ ] Feature disabled → כפתור/טאב מוסתר עם tooltip "שדרגו"
- [ ] Admin override: feature פתוח ל-tenant ספציפי למרות plan
- [ ] Plan change: מיידי, usage נשאר
- [ ] Downgrade: נתונים קיימים נשארים, יצירה חדשה חסומה
- [ ] checkPlanLimit returns `{ allowed, current, limit, remaining, message }`

---

### פאזה 5 ⬜ — Slug Routing + Future Prep

**המטרה:** routing חסין-תקלות + טבלאות מוכנות ל-B2B ו-Storefront.

**Slug Routing Hardening:**

- Error page: slug לא קיים → "החנות לא נמצאה" (עיצוב נקי, לא 404 גנרי)
- Error page: tenant suspended → "החשבון מושהה. פנו ל-support@opticup.co.il"
- Error page: tenant deleted → "החנות לא פעילה"
- Entry without slug → landing page עם שדה "הכנס קוד חנות" (slug)
- `resolveTenant()` function — מרוכזת. היום קוראת `?t=slug`, בעתיד subdomain. שינוי של 3 שורות
- Slug change: admin יכול לשנות slug (redirect from old = future)

**B2B Marketplace Prep (DB only, אפס UI):**

```sql
CREATE TABLE shared_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_tenant_id UUID NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'product_data')),
  resource_id UUID NOT NULL,             -- inventory_images.id or inventory.id
  sharing_mode TEXT NOT NULL DEFAULT 'free' CHECK (sharing_mode IN ('free', 'paid', 'request')),
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resource_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES shared_resources(id),
  accessor_tenant_id UUID NOT NULL REFERENCES tenants(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'purchase')),
  payment_status TEXT CHECK (payment_status IN ('free', 'pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Storefront Prep (DB only, אפס UI):**

```sql
CREATE TABLE storefront_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  enabled BOOLEAN DEFAULT false,
  domain TEXT,                           -- custom domain
  subdomain TEXT,                        -- xxx.opticup.co.il
  theme JSONB DEFAULT '{}',             -- storefront-specific theme
  logo_url TEXT,
  categories JSONB DEFAULT '[]',        -- displayed product categories
  seo JSONB DEFAULT '{}',              -- title, description, keywords
  pages JSONB DEFAULT '{}',            -- enabled pages (about, contact, blog)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Verification:**
- [ ] Slug לא קיים → error page "לא נמצאה"
- [ ] Tenant suspended → error page "מושהה"
- [ ] כניסה בלי slug → landing page עם שדה קוד
- [ ] resolveTenant() מרוכזת בפונקציה אחת
- [ ] shared_resources, resource_access_log, storefront_config נוצרו עם RLS
- [ ] טבלאות חדשות ריקות — אפס UI

---

### פאזת QA ⬜ — Full Test

**בדיקות:**

1. **Admin Auth:** login, logout, invalid credentials, role-based access
2. **Multi-Admin:** super_admin + support + viewer — כל אחד רואה/עושה רק מה שמותר
3. **Provisioning:** יצירת tenant מטופס → כניסה עם PIN → הכל עובד
4. **Provisioning failure:** מה קורה אם שלב נכשל? provisioning_log מציג
5. **Plan limits:** basic tenant hits limit → blocked + message. Enterprise → no limit
6. **Feature flags:** disabled feature → UI hidden. Admin override → enabled
7. **Slug routing:** valid slug → login. Invalid → error. Suspended → error. No slug → landing
8. **Tenant isolation:** admin panel data separated from tenant data. Admin לא רואה tenant data דרך ERP
9. **Activity log viewer:** admin רואה activity_log של tenant ספציפי. לא רואה של אחר
10. **Audit log:** כל פעולת admin מתועדת
11. **Suspend/Activate:** suspend → employees blocked. Activate → back to normal
12. **Trial:** trial_ends_at past → suspended auto (if pg_cron set up)
13. **Mobile:** admin panel responsive
14. **RTL:** admin panel Hebrew

---

## DB Changes Summary

**טבלאות חדשות (5+2 prep):**
- plans
- platform_admins
- platform_audit_log
- tenant_config
- tenant_provisioning_log
- shared_resources (B2B prep — empty)
- storefront_config (Storefront prep — empty)
- resource_access_log (B2B prep — empty)

**הרחבת tenants (9 עמודות):**
- plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at

**עמודה קיימת:** last_active (כבר על tenants)

**RPCs חדשים:**
- create_tenant()
- validate_slug()
- check_plan_limit() (אם ב-DB, אחרת JS helper)

**Supabase Auth:**
- Platform admin users (email+password)
- Separate from tenant PIN auth

---

## Contracts — מה המודול חושף לאחרים

```
// Plans & Limits (shared/js/plan-helpers.js)
checkPlanLimit(resource)          — { allowed, current, limit, remaining, message }
isFeatureEnabled(feature)         — boolean
getPlanLimits(tenant_id)          — full limits JSONB
getPlanFeatures(tenant_id)        — full features JSONB

// Tenant (admin RPCs)
createTenant(params)              — UUID (new tenant id)
validateSlug(slug)                — { valid, reason }
isTenantActive(tenant_id)         — boolean
suspendTenant(tenant_id, reason)  — void
activateTenant(tenant_id)         — void
getTenantConfig(tenant_id, key)   — JSONB value

// Admin Auth
getPlatformAdmin()                — { id, email, role } or null
requireAdminRole(minRole)         — throws if insufficient
```

---

## כללי ברזל — ספציפי למודול 2

כל כללי הברזל מ-CLAUDE.md בתוקף, בתוספת:

1. **Admin auth ≠ Tenant auth** — שני מנגנונים נפרדים לחלוטין. Supabase Auth ל-admin, Edge Function JWT ל-tenants. לעולם לא לערבב
2. **plans = global table** — אין tenant_id. כל tenant מצביע על plan. Plan שמשתנה = משפיע על כל ה-tenants עם ה-plan הזה
3. **Provisioning = atomic** — createTenant() או שמצליח לגמרי או שנכשל לגמרי. אין tenants חצי-מוכנים
4. **Feature check = fail-safe** — אם isFeatureEnabled נכשל (network, DB) → default true. עדיף שtenant ישתמש בfeature ששילם עליו מאשר שייחסם בטעות
5. **Admin audit = mandatory** — כל פעולה של admin חייבת platform_audit_log. אין יוצא מהכלל
6. **Tenant data = read-only for admin** — admin רואה activity_log אבל לא משנה נתוני tenant (מלאי, חובות). אם צריך לתקן — support guide ל-tenant, לא direct DB edit

---

## מבנה קבצים צפוי

```
opticup/
├── admin.html                          ← Platform Admin panel (NEW)
├── modules/
│   ├── admin-platform/                 ← Module 2 code (NEW)
│   │   ├── admin-auth.js              ← Supabase Auth login/logout/session
│   │   ├── admin-dashboard.js         ← Tenant list, stats, filters
│   │   ├── admin-tenant-detail.js     ← Slide-in panel, tabs, management
│   │   ├── admin-provisioning.js      ← Create tenant form, validation
│   │   ├── admin-plans.js             ← Plan CRUD, assignment
│   │   ├── admin-activity-viewer.js   ← Activity log per tenant (read-only)
│   │   └── admin-audit.js             ← Platform audit log viewer
│   └── Module 2 - Platform Admin/     ← Module 2 docs (NEW)
│       ├── ROADMAP.md
│       └── docs/
│           ├── SESSION_CONTEXT.md
│           ├── MODULE_MAP.md
│           ├── MODULE_SPEC.md
│           ├── CHANGELOG.md
│           └── db-schema.sql
├── shared/
│   └── js/
│       └── plan-helpers.js            ← checkPlanLimit(), isFeatureEnabled() (NEW)
```

---

*מסמך זה הוא ROADMAP של מודול 2. 6 פאזות, כל התלויות, כל ה-contracts.*
*צ'אט אסטרטגי חדש — קרא הכל והמשך מהפאזה הראשונה שסטטוסה ⬜.*
