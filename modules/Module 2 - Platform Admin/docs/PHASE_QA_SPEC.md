# PHASE_QA_SPEC.md — Full Test

> **מודול 2 — Platform Admin | פאזת QA**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע
> **תלוי ב:** פאזות 1-5 ✅

---

## מטרה

בדיקה מקצה לקצה של כל מודול 2. כל flow שנבנה בפאזות 1-5 נבדק — admin auth, provisioning, dashboard, plans & limits, feature flags, slug routing, error pages. בסוף ה-QA: מודול 2 מוכן ל-merge to main ולשימוש production.

---

## שיטת עבודה

1. **הצ'אט המשני** כותב פרומפטים ל-Claude Code שמריץ את הבדיקות
2. Claude Code יש לו גישה ל-browser — הוא יכול לפתוח URLs ולבדוק
3. **בדיקות DB** — Claude Code מריץ queries דרך Supabase JS
4. **בדיקות UI** — Claude Code פותח browser, navigates, checks elements
5. כל בדיקה שנכשלת → תיקון → בדיקה חוזרת
6. בסוף — סיכום טבלה: כל בדיקה + PASS/FAIL

---

## 1. Admin Auth (8 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 1.1 | Admin login success | Login עם email+password → "שלום Daniel" | Browser: admin.html → fill form → submit |
| 1.2 | Admin login wrong password | Password שגוי → הודעת שגיאה בעברית | Browser: admin.html → wrong password |
| 1.3 | Admin login wrong email | Email שלא קיים → הודעת שגיאה | Browser: admin.html → fake email |
| 1.4 | Non-admin email | Email שקיים ב-Auth אבל לא ב-platform_admins → "אין הרשאה" | Need test user in Auth without platform_admins row |
| 1.5 | Session persistence | Login → refresh page → still logged in | Browser: login → F5 → check header |
| 1.6 | Logout | Click "התנתק" → back to login screen, session cleared | Browser: click logout → verify |
| 1.7 | Post-logout refresh | After logout → refresh → login screen (not admin panel) | Browser: after logout → F5 |
| 1.8 | Audit log entries | Login + logout → platform_audit_log has entries | DB: query platform_audit_log |

---

## 2. Multi-Admin Roles (6 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 2.1 | super_admin sees everything | All tabs visible, all buttons enabled | Browser: login as super_admin |
| 2.2 | support sees limited | Tenants tab + activity log visible. No "חנות חדשה", no edit, no suspend/delete | Requires support admin user |
| 2.3 | viewer sees minimal | Tenant list only. No actions at all | Requires viewer admin user |
| 2.4 | support can reset PIN | Reset PIN button visible for support | Browser: login as support → check |
| 2.5 | support cannot create tenant | "חנות חדשה" hidden | Browser: login as support → verify hidden |
| 2.6 | viewer cannot reset PIN | Reset PIN hidden for viewer | Browser: login as viewer → verify hidden |

**⚠️ Pre-requisite:** Create 2 additional Supabase Auth users + platform_admins rows:
- support@test.opticup.co.il / role='support'
- viewer@test.opticup.co.il / role='viewer'

---

## 3. Tenant Provisioning (10 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 3.1 | Wizard opens | Click "חנות חדשה" → 3-step wizard | Browser |
| 3.2 | Slug auto-suggest | Type Hebrew name → slug stays empty (expected). Type English → auto-suggest | Browser |
| 3.3 | Slug validation — duplicate | Enter "prizma" → ❌ "כבר קיימת חנות" | Browser: type slug, check validation |
| 3.4 | Slug validation — reserved | Enter "admin" → ❌ "השם שמור" | Browser |
| 3.5 | Slug validation — format | Enter "A B C" → ❌ format error | Browser |
| 3.6 | Slug validation — valid | Enter "test-store-qa" → ✅ "הקוד פנוי" | Browser |
| 3.7 | Create tenant success | Fill all fields → "צור חנות" → success toast + credentials modal | Browser: complete wizard |
| 3.8 | Tenant DB verification | New tenant has: row, 5 roles, 57 permissions, role_permissions, employee, config, doc_types, payment_methods, storefront_config | DB: query all tables for new tenant_id |
| 3.9 | Login to new tenant | Navigate to `?t=test-store-qa` → PIN login → must_change_pin → app loads | Browser |
| 3.10 | Provisioning log | provisioning_log has entry for new tenant | DB: query |

---

## 4. Dashboard + Management (12 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 4.1 | Tenant table loads | Table shows all active tenants with correct columns | Browser: admin panel → tenants tab |
| 4.2 | Sort by column | Click column header → sort toggles | Browser: click "עובדים" header |
| 4.3 | Filter by status | Select "מושהה" → shows only suspended tenants | Browser |
| 4.4 | Filter by plan | Select "בסיסי" → shows only basic tenants | Browser |
| 4.5 | Search by name | Type "פריזמה" → shows only Prizma | Browser |
| 4.6 | Search by slug | Type "demo" → shows only Demo | Browser |
| 4.7 | Slide-in panel | Click tenant row → panel slides in from left | Browser |
| 4.8 | Panel close | Click ✕ / press Escape / click outside → panel closes | Browser |
| 4.9 | Edit tenant | Edit name → save → name updated in DB and table | Browser + DB |
| 4.10 | Change plan | Change plan dropdown → immediate effect | Browser + DB |
| 4.11 | Suspend tenant | Suspend → badge changes, ERP blocked | Browser: suspend → try ERP |
| 4.12 | Activate tenant | Activate suspended tenant → badge changes, ERP works | Browser: activate → try ERP |

---

## 5. Plan Limits (9 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 5.1 | Basic limit — employees | Assign basic plan to test tenant → add employees until limit → blocked | Browser + admin panel plan change |
| 5.2 | Basic limit — inventory | Add inventory items until limit → blocked | Browser |
| 5.3 | Basic limit — suppliers | Add suppliers until limit → blocked | Browser |
| 5.4 | Enterprise — no limits | Enterprise tenant → no blocking on any resource | Browser |
| 5.5 | Limit message | When blocked → toast "הגעת למגבלה (X/X)" | Browser |
| 5.6 | checkPlanLimit return value | RPC returns { allowed, current, limit, remaining, message } | DB: call RPC directly |
| 5.7 | Fail-safe | If RPC fails → creation allowed (not blocked) | Simulate: temporarily rename RPC → test → restore |
| 5.8 | Downgrade — data preserved | Downgrade from enterprise to basic → existing data stays | Admin: change plan → verify data |
| 5.9 | Downgrade — creation blocked | After downgrade, if over limit → new creation blocked | Browser: try to add after downgrade |

---

## 6. Feature Flags (8 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 6.1 | Basic — features visible | Shipments, stock_count, supplier_debt visible (true in basic) | Browser: login as basic tenant |
| 6.2 | Basic — features hidden | AI alerts, access_sync, image_studio hidden (false in basic) | Browser: verify elements hidden |
| 6.3 | Enterprise — all visible | All module cards and features visible | Browser: login as enterprise tenant |
| 6.4 | isFeatureEnabled return | RPC returns boolean | DB: call RPC directly |
| 6.5 | Feature override — enable | Admin enables OCR override for basic tenant → OCR visible | Admin: set override → ERP: verify |
| 6.6 | Feature override — remove | Remove override → falls back to plan (OCR hidden) | Admin: remove → ERP: verify |
| 6.7 | Override priority | Override > plan > default true | Test all 3 levels |
| 6.8 | Fail-safe | If RPC fails → feature shown (not hidden) | Simulate failure |

---

## 7. Slug Routing (10 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 7.1 | Valid slug | `?t=prizma` → login screen | Browser |
| 7.2 | Valid slug — Demo | `?t=demo` → login screen, green theme | Browser |
| 7.3 | Invalid slug | `?t=nonexistent` → error.html "החנות לא נמצאה" | Browser |
| 7.4 | Suspended slug | `?t=[suspended]` → error.html "החשבון מושהה" | Browser |
| 7.5 | Deleted slug | `?t=[deleted]` → error.html "החנות לא פעילה" | Browser |
| 7.6 | No slug — no session | Clear sessionStorage → navigate to `/` → landing.html | Browser |
| 7.7 | No slug — with session | sessionStorage has "prizma" → navigate to `/` → resolves to Prizma | Browser |
| 7.8 | Landing page | landing.html → enter "prizma" → redirect → login | Browser |
| 7.9 | Landing — invalid input | Empty input → "יש להכניס קוד חנות" | Browser |
| 7.10 | Error page links | "חזרה לדף הראשי" → landing.html | Browser |

---

## 8. Activity & Audit Logs (6 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 8.1 | Activity log — per tenant | Tab 2 shows only selected tenant's activity | Browser: open panel → activity tab |
| 8.2 | Activity log — filters | Date, entity_type, level filters work | Browser: apply filters |
| 8.3 | Activity log — pagination | 50 per page, "הבא/הקודם" work | Browser: navigate pages |
| 8.4 | Platform audit log | Top-level audit tab shows all admin actions | Browser: audit tab |
| 8.5 | Audit completeness | Every admin action in this QA → has audit entry | DB: count entries |
| 8.6 | Provisioning log | Tab 3 shows provisioning steps for created tenant | Browser: open panel → provisioning tab |

---

## 9. Plans CRUD (5 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 9.1 | Plans table | "הגדרות" tab → 3+ plans listed with limits | Browser |
| 9.2 | Edit plan | Click plan → modal → change limit → save → warning about affected tenants | Browser |
| 9.3 | Create plan | "תוכנית חדשה" → fill form → save → appears in list | Browser |
| 9.4 | Deactivate plan | Set is_active=false → plan hidden from provisioning wizard | Browser + admin |
| 9.5 | super_admin only | Support/viewer cannot edit plans | Browser: login as support → verify |

---

## 10. last_active (2 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 10.1 | Update on login | Login to Prizma → tenants.last_active updated | DB: check before/after login |
| 10.2 | Dashboard display | "פעילות אחרונה" column shows real relative time | Browser: admin panel |

---

## 11. Backward Compatibility (8 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 11.1 | index.html — Prizma | `?t=prizma` → zero console errors | Browser: open console |
| 11.2 | inventory.html — Prizma | `?t=prizma` → zero console errors | Browser |
| 11.3 | suppliers-debt.html — Prizma | `?t=prizma` → zero console errors | Browser |
| 11.4 | employees.html — Prizma | `?t=prizma` → zero console errors | Browser |
| 11.5 | shipments.html — Prizma | `?t=prizma` → zero console errors | Browser |
| 11.6 | settings.html — Prizma | `?t=prizma` → zero console errors | Browser |
| 11.7 | Demo tenant | `?t=demo` → all 6 pages load, zero errors | Browser |
| 11.8 | PIN login flow | Prizma + Demo: PIN login → session → all pages accessible | Browser |

---

## 12. Mobile + RTL (4 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 12.1 | admin.html responsive | Admin panel usable on mobile viewport | Browser: resize |
| 12.2 | Slide-in panel mobile | Panel goes full-width on mobile | Browser: resize |
| 12.3 | Landing page mobile | landing.html usable on mobile | Browser: resize |
| 12.4 | Error page mobile | error.html usable on mobile | Browser: resize |

---

## 13. Tenant Isolation (4 בדיקות)

| # | בדיקה | מה בודקים | איך |
|---|--------|----------|-----|
| 13.1 | Admin ≠ ERP | admin.html cannot access tenant data tables directly | DB: verify RLS blocks |
| 13.2 | ERP ≠ Admin | ERP pages cannot access platform_admins | DB: verify RLS blocks |
| 13.3 | Tenant A ≠ Tenant B | Login as Prizma → cannot see Demo data | Browser + DB |
| 13.4 | Admin reads via RPCs | Admin reads tenant data only through SECURITY DEFINER RPCs | Code review |

---

## סיכום — 92 בדיקות

| קטגוריה | בדיקות |
|---------|--------|
| 1. Admin Auth | 8 |
| 2. Multi-Admin Roles | 6 |
| 3. Tenant Provisioning | 10 |
| 4. Dashboard + Management | 12 |
| 5. Plan Limits | 9 |
| 6. Feature Flags | 8 |
| 7. Slug Routing | 10 |
| 8. Activity & Audit Logs | 6 |
| 9. Plans CRUD | 5 |
| 10. last_active | 2 |
| 11. Backward Compatibility | 8 |
| 12. Mobile + RTL | 4 |
| 13. Tenant Isolation | 4 |
| **סה"כ** | **92** |

---

## Pre-QA Setup

לפני תחילת הבדיקות:

1. **Create test admin users** (for role testing):
   - Supabase Auth: support@test.opticup.co.il + viewer@test.opticup.co.il
   - platform_admins rows: support role, viewer role

2. **Ensure test tenant exists:**
   - Create a new tenant via wizard (if not already from Phase 3 testing)
   - Or use existing test-store-qa if it was created

3. **Plan assignment variety:**
   - At least one tenant on basic plan (for limit testing)
   - At least one on enterprise (for unlimited testing)
   - Prizma + Demo should be on enterprise

---

## Post-QA

### If all 92 PASS:
1. Update ROADMAP.md — QA ✅
2. Update all docs (documentation ceremony)
3. Git tag: `v2.0-module2-complete`
4. Merge develop → main
5. Verify GitHub Pages deployment

### If failures found:
1. Fix each failure
2. Re-test failed items
3. Regression test: re-run backward compatibility (#11)
4. When all green → proceed with post-QA steps

---

## Known Debt to Document

Items that are NOT bugs but should be noted in MODULE_SPEC:

- Plan cache TTL = 30s (UI may show stale limit briefly after admin changes plan)
- admin-tenant-detail.js = 353 lines (at limit, split if grows)
- Hebrew slug auto-suggest = empty (manual entry works)
- storage_mb limit = placeholder (always 0)
- branches limit = hardcoded 1 (multi-branch future)
- B2B tables (shared_resources, resource_access_log) deferred to Module 3
- Trial expiration = no automatic mechanism (manual suspend by admin)
