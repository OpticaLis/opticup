# PHASE_2_SPEC.md — Tenant Provisioning

> **מודול 2 — Platform Admin | פאזה 2**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע
> **תלוי ב:** פאזה 1 ✅

---

## מטרה

יצירת tenant חדש בלחיצת כפתור. Atomic — הכל או כלום. בסוף הפאזה: admin לוחץ "חנות חדשה" → Wizard 3 שלבים → createTenant() RPC → tenant מוכן עם עובד ראשון, 5 roles, 58 permissions, config. 10 שניות במקום 20 דקות SQL.

---

## 1. createTenant() RPC

### 1.1 חתימה

```sql
CREATE OR REPLACE FUNCTION create_tenant(
  p_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT DEFAULT NULL,
  p_plan_id UUID,
  p_admin_pin TEXT DEFAULT '12345',
  p_admin_name TEXT DEFAULT 'מנהל',
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
```

### 1.2 מה ה-RPC עושה (סדר שלבים)

```
שלב 1 — Validate slug
  → validate_slug(p_slug) — אם לא תקין, RAISE EXCEPTION

שלב 2 — Create tenant row
  → INSERT INTO tenants (name, slug, status, plan_id, owner_name, owner_email, owner_phone, created_by)
  → Log to provisioning_log: step='create_tenant', status='completed'

שלב 3 — Create default config
  → INSERT INTO tenant_config: business_name, currency, timezone, locale
  → Log: step='create_config', status='completed'

שלב 4 — Create 5 roles (DEFAULT — hardcoded)
  → INSERT INTO roles: ceo, manager, senior, employee, viewer
  → כל role עם tenant_id = v_tenant_id
  → Log: step='create_roles', status='completed'

שלב 5 — Create 58 permissions (DEFAULT — hardcoded)
  → INSERT INTO permissions: כל 58 permissions הקיימים
  → כל permission עם tenant_id = v_tenant_id
  → Log: step='create_permissions', status='completed'

שלב 6 — Create role_permissions (DEFAULT mapping)
  → INSERT INTO role_permissions: מיפוי ברירת מחדל
  → ceo = הכל granted
  → manager = הכל חוץ מ-admin
  → senior = inventory + purchasing + receipts
  → employee = inventory.view + basic operations
  → viewer = כל ה-.view permissions
  → Log: step='create_role_permissions', status='completed'

שלב 7 — Create admin employee
  → INSERT INTO employees (name, pin, tenant_id, must_change_pin)
  → name = p_admin_name
  → pin = p_admin_pin (default '12345')
  → must_change_pin = true
  → Log: step='create_employee', status='completed'

שלב 8 — Assign CEO role to admin employee
  → INSERT INTO employee_roles (employee_id, role_id, tenant_id)
  → role_id = ceo role from step 4
  → Log: step='assign_role', status='completed'

שלב 9 — Create default document types
  → INSERT INTO document_types: חשבונית, תעודת משלוח, חשבונית זיכוי, קבלה, חשבונית עסקה
  → Log: step='create_document_types', status='completed'

שלב 10 — Create default payment methods
  → INSERT INTO payment_methods: מזומן, אשראי, העברה, צ'ק, הקפה
  → Log: step='create_payment_methods', status='completed'

RETURN v_tenant_id;

EXCEPTION WHEN OTHERS THEN
  → Log: step='error', status='failed', error_message=SQLERRM
  → RAISE; (transaction rolls back automatically)
```

### 1.3 Atomic guarantee

כל ה-RPC רץ ב-transaction אחד של PostgreSQL. אם שלב נכשל → EXCEPTION → כל ה-transaction עושה rollback. אין tenant חצי-מוכן.

provisioning_log **לא** נמחק ב-rollback — כי הוא נרשם ב-separate transaction (autonomous). **תיקון:** provisioning_log נרשם ב-EXCEPTION block בלבד כ-failure, או ב-finally. Success logs נרשמים רק אם ה-transaction הצליח.

**⚠️ בעיה:** PostgreSQL לא תומך ב-autonomous transactions. אם ה-RPC עושה rollback, כל ה-provisioning_log entries נמחקים.

**פתרון:** שני שלבים:
1. ה-RPC עצמו רק יוצר את ה-tenant ומחזיר `v_tenant_id` (או RAISE on failure)
2. ה-client (admin-provisioning.js) כותב ל-provisioning_log **אחרי** שה-RPC הצליח, או כותב failure log אם ה-RPC נכשל

ככה provisioning_log תמיד נשמר — גם ב-success וגם ב-failure.

### 1.4 Provisioning log — client-side logging

```javascript
// admin-provisioning.js — after RPC call
async function provisionTenant(params) {
  try {
    const { data: tenantId, error } = await adminSb.rpc('create_tenant', params);

    if (error) throw error;

    // Log success
    await AdminDB.insert('tenant_provisioning_log', {
      tenant_id: tenantId,
      step: 'full_provisioning',
      status: 'completed',
      details: { params_used: { ...params, p_admin_pin: '***' } }  // mask PIN
    });

    // Audit log
    await logAdminAction('tenant.create', tenantId, {
      name: params.p_name,
      slug: params.p_slug,
      plan_id: params.p_plan_id
    });

    return tenantId;
  } catch (err) {
    // Log failure (tenant might not exist — use null)
    await AdminDB.insert('tenant_provisioning_log', {
      tenant_id: null,  // tenant wasn't created
      step: 'full_provisioning',
      status: 'failed',
      error_message: err.message,
      details: { params_used: { ...params, p_admin_pin: '***' } }
    });

    throw err;
  }
}
```

**⚠️ tenant_provisioning_log.tenant_id** — צריך לאפשר NULL ב-failure case:

```sql
ALTER TABLE tenant_provisioning_log ALTER COLUMN tenant_id DROP NOT NULL;
```

---

## 2. validate_slug() RPC

```sql
CREATE OR REPLACE FUNCTION validate_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserved TEXT[] := ARRAY['admin', 'api', 'www', 'app', 'test', 'demo', 'support',
    'help', 'login', 'signup', 'register', 'billing', 'dashboard', 'platform',
    'status', 'health', 'docs', 'blog', 'mail', 'ftp', 'cdn', 'static'];
BEGIN
  -- 1. Format check: lowercase, digits, hyphens only. No leading/trailing hyphen. 3-30 chars.
  IF p_slug !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'slug חייב להכיל רק אותיות קטנות באנגלית, מספרים ומקפים (3-30 תווים)'
    );
  END IF;

  -- 2. Reserved words check
  IF p_slug = ANY(v_reserved) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'השם הזה שמור למערכת'
    );
  END IF;

  -- 3. Uniqueness check
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'כבר קיימת חנות עם הקוד הזה'
    );
  END IF;

  RETURN jsonb_build_object('valid', true, 'reason', NULL);
END;
$$;
```

---

## 3. must_change_pin — שינוי בטבלת employees

```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN DEFAULT false;
```

### 3.1 Force PIN change flow (שינוי ב-auth-service.js)

אחרי login מוצלח ב-ERP (index.html), אם `must_change_pin = true`:

```
1. Login succeeds → JWT returned
2. Check employee.must_change_pin
3. If true → Modal.form("הגדר PIN חדש", { fields: [
     { name: 'new_pin', label: 'PIN חדש', type: 'password', minLength: 5, maxLength: 6 },
     { name: 'confirm_pin', label: 'אימות PIN', type: 'password' }
   ]})
4. Validate: new_pin === confirm_pin, length 5-6 digits
5. Update employee: pin = new_pin, must_change_pin = false
6. Toast.success("PIN עודכן בהצלחה")
7. Continue to app
```

**⚠️ User cannot dismiss the modal** — must_change_pin = true blocks access until PIN is changed.

**⚠️ Integration point:** שינוי ב-`js/auth-service.js` — אחרי `handleLogin()` succeeds, בדיקת `must_change_pin`. זה שינוי קטן בקובץ קיים.

---

## 4. Default Roles — ערכים קבועים

```sql
-- 5 roles — same IDs as existing system
('ceo',       'מנכ"ל',      'גישה מלאה לכל המערכת',     true, v_tenant_id),
('manager',   'מנהל',       'ניהול מלא חוץ מהרשאות',    true, v_tenant_id),
('senior',    'בכיר',       'מלאי, רכש, קבלות',         true, v_tenant_id),
('employee',  'עובד',       'פעולות בסיסיות',            true, v_tenant_id),
('viewer',    'צופה',       'צפייה בלבד',               true, v_tenant_id)
```

---

## 5. Default Permissions — ערכים קבועים

58 permissions כפי שמוגדרים ב-GLOBAL_SCHEMA.sql:

```
inventory.view, inventory.create, inventory.edit, inventory.delete, inventory.export,
inventory.reduce, inventory.images, inventory.barcode,
purchasing.view, purchasing.create, purchasing.edit, purchasing.delete,
receipts.view, receipts.create, receipts.confirm, receipts.edit_prices,
audit.view, audit.item_history,
brands.view, brands.edit,
suppliers.view, suppliers.edit,
sync.view, sync.manage,
admin.view, admin.manage, admin.system_log,
debt.view, debt.create, debt.edit, debt.delete, debt.payments, debt.prepaid, debt.returns,
debt.ai_ocr, debt.ai_alerts, debt.ai_config, debt.ai_batch, debt.ai_historical,
shipments.view, shipments.create, shipments.edit, shipments.delete, shipments.lock,
shipments.settings, shipments.manifest,
settings.view, settings.edit,
employees.view, employees.manage,
stock_count.view, stock_count.create, stock_count.scan, stock_count.approve,
stock_count.filters, stock_count.report, stock_count.delete
```

**⚠️ הרשימה הזו חייבת להיות מעודכנת.** הצ'אט המשני צריך לקרוא את GLOBAL_SCHEMA.sql ולוודא שהוא מכסה את כל ה-58 permissions שקיימים.

---

## 6. Default Role-Permissions Mapping

| Permission | CEO | Manager | Senior | Employee | Viewer |
|-----------|-----|---------|--------|----------|--------|
| inventory.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory.create | ✅ | ✅ | ✅ | ✅ | ❌ |
| inventory.edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| inventory.delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| inventory.export | ✅ | ✅ | ✅ | ❌ | ❌ |
| inventory.reduce | ✅ | ✅ | ✅ | ✅ | ❌ |
| inventory.images | ✅ | ✅ | ✅ | ✅ | ❌ |
| inventory.barcode | ✅ | ✅ | ✅ | ❌ | ❌ |
| purchasing.* | ✅ | ✅ | ✅ | ❌ | ❌ |
| receipts.* | ✅ | ✅ | ✅ | ❌ | ❌ |
| audit.* | ✅ | ✅ | ✅ | ❌ | ✅ |
| brands.* | ✅ | ✅ | ✅ | ❌ | ❌ |
| suppliers.* | ✅ | ✅ | ❌ | ❌ | ❌ |
| sync.* | ✅ | ✅ | ❌ | ❌ | ❌ |
| admin.* | ✅ | ❌ | ❌ | ❌ | ❌ |
| debt.view/create/edit | ✅ | ✅ | ❌ | ❌ | ✅(view) |
| debt.delete/payments/prepaid/returns | ✅ | ✅ | ❌ | ❌ | ❌ |
| debt.ai_* | ✅ | ✅ | ❌ | ❌ | ❌ |
| shipments.* | ✅ | ✅ | ✅ | ✅(view+create) | ✅(view) |
| settings.* | ✅ | ✅ | ❌ | ❌ | ❌ |
| employees.* | ✅ | ✅ | ❌ | ❌ | ❌ |
| stock_count.* | ✅ | ✅ | ✅ | ✅(view+scan) | ✅(view) |

> **שאלה שנסגרה:** המיפוי הזה הוא DEFAULT שניתן לשינוי per-tenant. Admin יכול לשנות role_permissions אחרי יצירה (עתידי — לא בפאזה 2).

---

## 7. Default Config

```javascript
// tenant_config entries created for every new tenant
[
  { key: 'business_name', value: p_name },
  { key: 'currency', value: 'ILS' },
  { key: 'timezone', value: 'Asia/Jerusalem' },
  { key: 'locale', value: 'he-IL' },
  { key: 'vat_rate', value: 17 },
  { key: 'feature_overrides', value: {} }  // empty — uses plan defaults
]
```

---

## 8. Default Document Types

```sql
('invoice',        'חשבונית',        'Invoice',        true,  true, v_tenant_id),
('delivery_note',  'תעודת משלוח',    'Delivery Note',  false, true, v_tenant_id),
('credit_note',    'חשבונית זיכוי',  'Credit Note',    true,  true, v_tenant_id),
('receipt',        'קבלה',           'Receipt',        true,  true, v_tenant_id),
('invoice_receipt','חשבונית עסקה',   'Invoice Receipt', true, true, v_tenant_id)
```

---

## 9. Default Payment Methods

```sql
('cash',     'מזומן',    'Cash',     true, v_tenant_id),
('credit',   'אשראי',    'Credit',   true, v_tenant_id),
('transfer', 'העברה',     'Transfer', true, v_tenant_id),
('check',    'צ׳ק',      'Check',    true, v_tenant_id),
('credit_account', 'הקפה', 'Credit Account', true, v_tenant_id)
```

---

## 10. Wizard UI — admin-provisioning.js

### 10.1 Trigger

פאזה 2: כפתור "➕ חנות חדשה" במסך ה-welcome של admin panel.
פאזה 3: הכפתור יעבור לטבלת tenants.

### 10.2 Wizard Steps (שימוש ב-modal-wizard.js)

**Step 1 — פרטי חנות:**

| שדה | סוג | validation | הערות |
|-----|------|-----------|-------|
| שם חנות | text, required | min 2 chars | |
| קוד חנות (slug) | text, required | a-z, 0-9, hyphens, 3-30 chars | auto-suggest מהשם (slugify) |
| שם בעלים | text, required | | |
| אימייל בעלים | email, required | format check | |
| טלפון בעלים | tel, optional | | |

**Slug auto-suggest:** בזמן הקלדת שם → slugify (lowercase, replace spaces with hyphens, remove non-ascii). Real-time validation via `validate_slug()` RPC (debounced 500ms).

**Slug validation UI:**
- ✅ ירוק + "הקוד פנוי" — slug תקין ופנוי
- ❌ אדום + הודעת שגיאה — slug לא תקין או תפוס
- ⏳ spinner — בודק...

**Step 2 — תוכנית + PIN:**

| שדה | סוג | validation | הערות |
|-----|------|-----------|-------|
| תוכנית מנוי | dropdown, required | from plans table | מציג: display_name + limits summary |
| PIN עובד ראשון | text, required | 5-6 digits | default: 12345, editable |
| שם עובד ראשון | text, required | | default: "מנהל" |

**Plan dropdown format:**
```
בסיסי — עד 5 עובדים, 1,000 פריטים
פרימיום — עד 20 עובדים, 10,000 פריטים
ארגוני — ללא הגבלה
```

**Step 3 — אישור:**

Summary card עם כל הפרטים:
```
┌─────────────────────────────────────┐
│ סיכום יצירת חנות                     │
├─────────────────────────────────────┤
│ שם:        אופטיקה ישראל             │
│ קוד:       optika-israel             │
│ בעלים:     ישראל ישראלי              │
│ אימייל:    israel@example.com        │
│ טלפון:     050-1234567              │
│ תוכנית:    פרימיום                   │
│ PIN ראשון: 12345                     │
│ עובד ראשון: מנהל                     │
├─────────────────────────────────────┤
│ [ביטול]              [צור חנות ➕]   │
└─────────────────────────────────────┘
```

כפתור "צור חנות" → loading state → `createTenant()` RPC → success/error.

### 10.3 Post-creation

**Success:**
```
Toast.success("החנות 'אופטיקה ישראל' נוצרה בהצלחה!")
Modal.info("פרטי כניסה", `
  קוד חנות: optika-israel
  כתובת: app.opticalis.co.il/?t=optika-israel
  PIN מנהל: 12345
  ⚠️ PIN ישתנה בכניסה הראשונה
`)
```

**Admin יכול להעתיק את הפרטים ולשלוח לבעל החנות.**

**Error:**
```
Toast.error("שגיאה ביצירת החנות: [error message]")
// provisioning_log records the failure
```

---

## 11. Delete Tenant (Soft)

### 11.1 Trigger
כפתור "מחק" ב-admin panel (יופיע בפאזה 3 ב-tenant detail). בפאזה 2 — **לא בונים UI**, רק את ה-RPC.

### 11.2 delete_tenant() RPC

```sql
CREATE OR REPLACE FUNCTION delete_tenant(
  p_tenant_id UUID,
  p_deleted_by UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify tenant exists and is not already deleted
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status != 'deleted') THEN
    RAISE EXCEPTION 'Tenant not found or already deleted';
  END IF;

  -- Soft delete
  UPDATE tenants SET
    status = 'deleted',
    deleted_at = now(),
    suspended_reason = 'Deleted by admin'
  WHERE id = p_tenant_id;

  -- Log
  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_deleted_by, 'tenant.delete', p_tenant_id, '{}');
END;
$$;
```

**⚠️ Hard delete (actual data removal) = NOT in scope.** Soft delete only — tenant data remains in DB but is inaccessible.

---

## 12. קבצים חדשים / משתנים

| קובץ | פעולה | מה |
|-------|-------|----|
| `modules/admin-platform/admin-provisioning.js` | NEW | Wizard UI, provisionTenant(), slug validation |
| `admin.html` | MODIFY | הוספת כפתור "חנות חדשה" + טעינת admin-provisioning.js |
| `js/auth-service.js` | MODIFY | must_change_pin check after login |
| SQL: createTenant() RPC | Dashboard | RPC function |
| SQL: validate_slug() RPC | Dashboard | RPC function |
| SQL: delete_tenant() RPC | Dashboard | RPC function |
| SQL: employees.must_change_pin | Dashboard | ALTER TABLE |
| SQL: provisioning_log.tenant_id nullable | Dashboard | ALTER TABLE |

---

## 13. Integration Points — שינויים בקוד קיים

### 13.1 admin.html
```html
<!-- Add to <main> welcome section -->
<button id="btn-new-tenant" class="btn btn-primary btn-lg">
  ➕ חנות חדשה
</button>

<!-- Add script -->
<script src="shared/js/modal-wizard.js"></script>
<script src="modules/admin-platform/admin-provisioning.js"></script>
```

### 13.2 js/auth-service.js
```javascript
// After successful PIN login, before entering app:
// Check employee.must_change_pin
// If true → show force-change modal → update PIN → continue
```

**⚠️ Minimal change:** ~20 lines added after the login success block. No logic changes to existing code.

---

## 14. סדר ביצוע (תת-פאזות)

| תת-פאזה | מה | סוג | הערות |
|----------|-----|------|-------|
| 2a | ALTER employees + provisioning_log | SQL Dashboard | must_change_pin, nullable tenant_id |
| 2b | validate_slug() RPC | SQL Dashboard | |
| 2c | create_tenant() RPC | SQL Dashboard | הארוך ביותר — כל ה-INSERT VALUES |
| 2d | delete_tenant() RPC | SQL Dashboard | |
| 2e | admin-provisioning.js + wizard UI | Claude Code | JS + HTML changes |
| 2f | must_change_pin flow in auth-service.js | Claude Code | שינוי קטן בקובץ קיים |
| 2g | Verification | Browser testing | כל ה-checklist |

**⚠️ חשוב:** 2a-2d = SQL דרך Dashboard. 2e-2f = קוד ב-repo.

---

## 15. Verification Checklist

### Provisioning:
- [ ] כפתור "חנות חדשה" מופיע ב-admin panel
- [ ] Wizard נפתח עם 3 שלבים
- [ ] Slug auto-suggest עובד (שם → slug)
- [ ] Slug validation: real-time ✅/❌ מ-RPC
- [ ] Slug reserved word (admin, test) → ❌
- [ ] Slug duplicate → ❌
- [ ] Slug invalid format → ❌ + הסבר
- [ ] Plan dropdown מציג 3 תוכניות עם פירוט
- [ ] PIN default = 12345, editable
- [ ] Step 3 summary מציג את כל הפרטים
- [ ] Submit → tenant נוצר בהצלחה
- [ ] Toast + info modal עם פרטי כניסה
- [ ] provisioning_log: entry עם status=completed
- [ ] platform_audit_log: entry עם action=tenant.create

### Tenant Created Correctly:
- [ ] tenant row: name, slug, status=active, plan_id, owner fields
- [ ] 5 roles exist for new tenant
- [ ] 58 permissions exist for new tenant
- [ ] role_permissions mapped correctly
- [ ] 1 employee (admin) with PIN and must_change_pin=true
- [ ] employee has ceo role assigned
- [ ] 5 document_types created
- [ ] 5 payment_methods created
- [ ] tenant_config: 6 entries (business_name, currency, timezone, locale, vat_rate, feature_overrides)

### Login to New Tenant:
- [ ] Navigate to app.opticalis.co.il/?t=[new-slug]
- [ ] Enter PIN → login succeeds
- [ ] must_change_pin → modal forces new PIN
- [ ] After PIN change → must_change_pin = false
- [ ] Second login → no force-change modal
- [ ] All pages load without errors for new tenant

### Error Handling:
- [ ] createTenant() failure → error toast + provisioning_log with status=failed
- [ ] Network error during wizard → appropriate error message
- [ ] Duplicate slug (race condition) → error from DB constraint

### Backward Compatibility:
- [ ] Prizma login → works as before (must_change_pin = false/null)
- [ ] Demo login → works as before
- [ ] All 6 ERP pages → zero console errors
- [ ] admin.html → still works with all Phase 1 functionality

### Delete (RPC only — no UI):
- [ ] delete_tenant() via SQL → tenant status = 'deleted'
- [ ] Deleted tenant slug → ERP shows error (existing slug routing)

---

## 16. שאלות שנסגרו

1. **PIN default:** 12345 (5 ספרות) עם must_change_pin=true. עובד חייב להחליף בכניסה ראשונה.

2. **Template source:** DEFAULT קבוע ב-RPC (hardcoded VALUES), לא copy מ-tenant קיים. כשנוסיף permissions חדשים → מעדכנים את ה-RPC.

3. **Wizard location:** כפתור ב-welcome screen (פאזה 2), יעבור לטבלת tenants (פאזה 3).

4. **Platform Admin roles:** כבר מוגדרים (super_admin/support/viewer). Enforcement בפאזה 3.

5. **Provisioning log atomicity:** Client-side logging (אחרי RPC success/failure), לא inside the RPC, כי PostgreSQL rollback מוחק logs.
