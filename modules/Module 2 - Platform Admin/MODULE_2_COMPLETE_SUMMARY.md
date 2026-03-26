# סיכום מודול 2 — Platform Admin — הושלם ✅

> **תאריך:** 2026-03-26
> **Tag:** `v2.0-module2-complete`
> **סטטוס:** Production (merged to main)

---

## מה המודול עשה

מודול 2 הפך את Optic Up מ"מערכת שעובדת לפריזמה" ל"פלטפורמה שכל חנות אופטיקה יכולה להצטרף אליה."

**לפני מודול 2:** הוספת tenant = 20 דקות SQL ידני. אין dashboard, אין plans, אין admin login נפרד.

**אחרי מודול 2:** Admin לוחץ "חנות חדשה" → wizard 3 שלבים → 10 שניות → tenant מוכן עם עובד, roles, permissions, config. Plans מגבילים שימוש. Feature flags שולטים בUI. כל נתיב כניסה מטופל.

---

## 6 פאזות — מה נבנה בכל אחת

| פאזה | שם | מה נבנה | commits |
|------|----|---------|---------|
| 1 | DB + Admin Auth | 5 טבלאות, 9 עמודות על tenants, admin.html עם Supabase Auth, 4 JS files | 5 |
| 2 | Tenant Provisioning | createTenant() RPC (10 שלבים atomic), wizard UI, validate_slug(), must_change_pin | 5 |
| 3 | Dashboard + Management | טבלת tenants, slide-in panel עם 4 טאבים, suspend/activate/delete, reset PIN, role enforcement, 8 RPCs | 13 |
| 4 | Plans & Limits | check_plan_limit() + is_feature_enabled() RPCs, plan-helpers.js, Plans CRUD UI, feature overrides, last_active | ~10 |
| 5 | Slug Routing + Future Prep | resolveTenant() מרוכזת, error.html, landing.html, storefront_config table | ~5 |
| QA | Full Test | 88 PASS / 0 FAIL / 4 SKIP | 1 |

---

## מספרים

| מדד | ערך |
|-----|-----|
| קבצי JS חדשים | ~11 (modules/admin-platform/ + shared/js/plan-helpers.js) |
| דפי HTML חדשים | 3 (admin.html, landing.html, error.html) |
| טבלאות DB חדשות | 6 (plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log, storefront_config) |
| עמודות חדשות על tenants | 9 (plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at) |
| עמודות חדשות על employees | 1 (must_change_pin) |
| RPCs חיים ב-Supabase | ~14 (validate_slug, create_tenant, delete_tenant, check_plan_limit, is_feature_enabled, get_all_tenants_overview, get_tenant_stats, get_tenant_activity_log, get_tenant_employees, suspend_tenant, activate_tenant, update_tenant, reset_employee_pin + is_platform_super_admin helper) |
| Edge Function שינויים | 1 (pin-auth: last_active update) |
| שורות קוד (הערכה) | ~2,500 JS + ~200 HTML |
| DB tables total (project) | ~56 |

---

## Contracts — מה המודול חושף לאחרים

### Plan System (shared/js/plan-helpers.js) — כל מודול עתידי קורא:

```javascript
checkPlanLimit(resource)
// → { allowed: bool, current: num, limit: num, remaining: num, message: string|null }
// resources: 'employees', 'inventory', 'suppliers', 'documents_per_month', 'ocr_scans_monthly', 'storage_mb', 'branches'
// fail-safe: error → allowed

isFeatureEnabled(feature)
// → boolean
// features: inventory, purchasing, goods_receipts, stock_count, supplier_debt, ocr, ai_alerts, shipments, access_sync, image_studio, storefront, b2b_marketplace, api_access, white_label, custom_domain, advanced_reports, whatsapp
// priority: tenant override → plan → default true (fail-safe)

getPlanLimits()   // → full limits JSONB
getPlanFeatures() // → full features JSONB
invalidatePlanCache() // → clears 30s cache
```

### Tenant Provisioning (admin RPCs):

```javascript
createTenant(params)              // → UUID (atomic: 10 steps, all-or-nothing)
validateSlug(slug)                // → { valid, reason }
deleteTenant(tenantId)            // → soft delete
suspendTenant(tenantId, reason)   // → status='suspended'
activateTenant(tenantId)          // → status='active'
updateTenant(tenantId, updates)   // → 6 allowed fields
```

### Tenant Resolution (js/shared.js):

```javascript
resolveTenant()
// URL ?t=slug → sessionStorage → landing page
// Checks: not-found → error page, suspended → error page, deleted → error page
// Future: subdomain support (1 line change)
```

### Admin Auth (modules/admin-platform/admin-auth.js):

```javascript
adminLogin(email, password)    // → { id, email, display_name, role }
adminLogout()                  // → redirect to login
getAdminSession()              // → admin object or null
getCurrentAdmin()              // → cached admin (sync)
hasAdminPermission(minRole)    // → boolean (super_admin > support > viewer)
```

---

## ארכיטקטורה — החלטות מרכזיות

### Admin ≠ ERP (הפרדה מוחלטת)

```
admin.html                          ERP pages (index, inventory, ...)
─────────                          ──────────────────────────────────
Supabase Auth (email+password)     PIN → pin-auth Edge Function → JWT
adminSb (separate client)          sb (from shared.js)
No tenant context                  tenant_id on every query
AdminDB wrapper                    DB.* wrapper (supabase-client.js)
Does NOT load shared.js            Loads shared.js first
```

### Global tables (אין tenant_id)

- `plans` — תוכניות מנוי, משותפות לכל ה-tenants
- `platform_admins` — admins של הפלטפורמה
- `platform_audit_log` — כל פעולת admin

### RLS Pattern

- Tenant tables → `current_setting('app.tenant_id')::uuid`
- Admin tables → `auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')`
- Recursive RLS fix → `is_platform_super_admin()` SECURITY DEFINER function

### Provisioning = Atomic

createTenant() RPC = SECURITY DEFINER, 10 שלבים ב-transaction אחד:
1. Validate slug → 2. Tenant row → 3. Config (6 entries) → 4. 5 Roles → 5. 57 Permissions → 6. Role-permissions mapping → 7. Admin employee (must_change_pin=true) → 8. CEO role assignment → 9. 5 Document types → 10. 5 Payment methods

נכשל = rollback מלא. Provisioning log = client-side (אחרי RPC).

### Plan Check = Dual Layer

- **RPC** (check_plan_limit) — server-side, אטומי, לא ניתן לעקוף
- **JS** (plan-helpers.js) — client-side wrapper, cache 30s, fail-safe
- כל פעולת יצירה (עובד/פריט/ספק/מסמך/OCR) בודקת RPC בזמן אמת

### Feature Check = Override Priority

```
tenant_config.feature_overrides → plan.features → default true (fail-safe)
```

---

## Admin Panel — מבנה

```
admin.html
├── Login Screen (email + password)
├── Header (שם, role badge, התנתק)
├── Nav Tabs
│   ├── חנויות (default)
│   │   ├── Toolbar: [חנות חדשה] [חיפוש] [פילטרים]
│   │   ├── Tenant Table (TableBuilder, sort, filter)
│   │   └── Slide-in Panel (480px RTL)
│   │       ├── Tab 1: פרטים (info/edit/actions)
│   │       ├── Tab 2: Activity Log (filters + pagination)
│   │       ├── Tab 3: Provisioning Log
│   │       └── Tab 4: Audit Log (super_admin only)
│   ├── Audit Log (platform-wide, all actions)
│   └── הגדרות (Plans CRUD, super_admin only)
```

### Admin Roles

| Feature | super_admin | support | viewer |
|---------|-------------|---------|--------|
| View tenants | ✅ | ✅ | ✅ |
| Create/edit/delete tenant | ✅ | ❌ | ❌ |
| Suspend/activate | ✅ | ❌ | ❌ |
| Reset PIN | ✅ | ✅ | ❌ |
| Activity log | ✅ | ✅ | ✅ |
| Audit log | ✅ | ❌ | ❌ |
| Plans CRUD | ✅ | ❌ | ❌ |
| Feature overrides | ✅ | ❌ | ❌ |

---

## Routing — כל נתיב מטופל

| נתיב | תוצאה |
|------|-------|
| `?t=prizma` | → resolveTenant → login screen |
| `?t=nonexistent` | → error.html "החנות לא נמצאה" |
| `?t=suspended-tenant` | → error.html "החשבון מושהה" |
| `?t=deleted-tenant` | → error.html "החנות לא פעילה" |
| `/` (ללא slug, ללא session) | → landing.html (שדה slug + כניסה) |
| `/` (ללא slug, עם session) | → resolve מ-sessionStorage |
| `/admin.html` | → Platform Admin login |

---

## Known Debt — מתועד, לא באגים

| פריט | חומרה | הערות |
|------|-------|-------|
| admin-tenant-detail.js = 353+ שורות | Low | לפצל אם גדל |
| Plan cache TTL = 30s | Low | UI may show stale limit briefly. RPC always real-time |
| Hebrew slug auto-suggest = empty | Low | Manual entry works. Transliteration = שיפור עתידי |
| storage_mb limit = placeholder (0) | Low | Storage calculation in future |
| branches limit = hardcoded 1 | Low | Multi-branch = future module |
| Trial expiration = manual | Low | No pg_cron. Admin suspends manually |
| B2B tables deferred | Info | shared_resources + resource_access_log → Module 3 |
| 4 SKIP בבדיקות QA | Info | Edge cases: non-admin auth, deleted tenant, plan deactivate, pagination overflow |

---

## לקחים — CLAUDE.md updates

### כללים חדשים שנלמדו:

1. **RLS recursion** — policies לעולם לא מתייחסות לטבלה של עצמן בתוך subquery. להשתמש ב-SECURITY DEFINER function (`is_platform_super_admin()`).

2. **תלויות הדדיות ב-policies** — ליצור טבלאות קודם, policies תלויים אחרי שכל הטבלאות קיימות.

3. **SECURITY DEFINER RPCs** — עוקפים RLS לכתיבה אבל לא לקריאה. Admin שצריך לקרוא tenant data חייב function ייעודית.

4. **Provisioning log = client-side** — PostgreSQL rollback מוחק הכל כולל logs. Pattern: RPC עושה עבודה → client כותב log.

5. **Modal.alert לא מתאים ל-HTML** — להשתמש ב-Modal.show עם allowHTML כשצריך HTML content.

6. **Global tables (plans, platform_admins)** — אין tenant_id, אין SaaS Rule 14. זה design choice מודע, לא הפרה.

---

## מה תלוי במודול 2

| מודול | מה צריך ממודול 2 |
|-------|-----------------|
| **מודול 3 (Storefront)** | storefront_config table, plan features (isFeatureEnabled), tenant resolution |
| **מודול 4 (CRM)** | checkPlanLimit, isFeatureEnabled |
| **כל מודול עתידי** | checkPlanLimit(), isFeatureEnabled(), resolveTenant() |
| **Tenant שני אמיתי** | createTenant() provisioning — מוכן |
| **Support flow** | Admin panel + activity log viewer — מוכן |

---

## מבנה קבצים סופי

```
opticup/
├── admin.html                              ← Platform Admin panel (NEW)
├── landing.html                            ← Landing page — slug input (NEW)
├── error.html                              ← Error pages — not-found/suspended/deleted (NEW)
├── modules/
│   ├── admin-platform/                     ← Module 2 code (NEW)
│   │   ├── admin-auth.js                  ← Supabase Auth login/logout/session (~105 lines)
│   │   ├── admin-db.js                    ← AdminDB wrapper, no tenant context (~63 lines)
│   │   ├── admin-audit.js                 ← Platform audit log viewer + logAdminAction (~143 lines)
│   │   ├── admin-app.js                   ← App init, tab routing, panel (~229 lines)
│   │   ├── admin-dashboard.js             ← Tenant table, filters, search (~194 lines)
│   │   ├── admin-tenant-detail.js         ← Slide-in panel, 4 tabs, actions (~353 lines)
│   │   ├── admin-provisioning.js          ← Create tenant wizard (~322 lines)
│   │   ├── admin-activity-viewer.js       ← Activity log per tenant (~189 lines)
│   │   ├── admin-plans.js                 ← Plans CRUD UI (~200 lines)
│   │   └── admin-feature-overrides.js     ← Feature override UI (~est. lines)
│   └── Module 2 - Platform Admin/
│       ├── ROADMAP.md
│       ├── SECONDARY_CHAT_TEMPLATE.md
│       ├── MY_CHEATSHEET.md
│       └── docs/ (SESSION_CONTEXT, MODULE_MAP, MODULE_SPEC, CHANGELOG, db-schema.sql)
├── shared/
│   └── js/
│       └── plan-helpers.js                ← checkPlanLimit, isFeatureEnabled (NEW, ~100 lines)
```
