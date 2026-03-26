# PHASE_3_SPEC.md — Dashboard + Management

> **מודול 2 — Platform Admin | פאזה 3**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע
> **תלוי ב:** פאזה 1 ✅, פאזה 2 ✅

---

## מטרה

Admin רואה ומנהל את כל ה-tenants ממקום אחד. טבלת tenants עם stats, slide-in panel עם טאבים (פרטים, activity log, provisioning log, audit log), suspend/activate, ו-admin role enforcement. בסוף הפאזה: admin panel הוא כלי ניהול פלטפורמה שלם.

---

## 1. get_tenant_stats() RPC

### 1.1 בעיה

טבלאות כמו employees, inventory, suppliers מוגנות ב-RLS per-tenant. Admin (Supabase Auth) לא עובר דרך tenant JWT, אז הוא לא יכול לקרוא COUNT מהטבלאות האלה.

### 1.2 פתרון

SECURITY DEFINER function שרצה עם הרשאות owner ועוקפת RLS:

```sql
CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'employees_count', (SELECT COUNT(*) FROM employees WHERE tenant_id = p_tenant_id),
    'inventory_count', (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id AND is_deleted = false),
    'suppliers_count', (SELECT COUNT(*) FROM suppliers WHERE tenant_id = p_tenant_id AND active = true),
    'documents_count', (SELECT COUNT(*) FROM supplier_documents WHERE tenant_id = p_tenant_id),
    'brands_count', (SELECT COUNT(*) FROM brands WHERE tenant_id = p_tenant_id AND active = true)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;
```

### 1.3 get_all_tenants_overview() RPC

לטבלת dashboard צריך overview של **כל** ה-tenants בבת אחת (לא per-tenant):

```sql
CREATE OR REPLACE FUNCTION get_all_tenants_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT jsonb_agg(row_data)
    FROM (
      SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'status', t.status,
        'plan_name', p.display_name,
        'plan_id', t.plan_id,
        'owner_name', t.owner_name,
        'owner_email', t.owner_email,
        'owner_phone', t.owner_phone,
        'created_at', t.created_at,
        'last_active', t.last_active,
        'trial_ends_at', t.trial_ends_at,
        'suspended_reason', t.suspended_reason,
        'employees_count', (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id),
        'inventory_count', (SELECT COUNT(*) FROM inventory WHERE tenant_id = t.id AND is_deleted = false),
        'suppliers_count', (SELECT COUNT(*) FROM suppliers WHERE tenant_id = t.id AND active = true)
      ) AS row_data
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.status != 'deleted'
      ORDER BY t.created_at DESC
    ) sub
  );
END;
$$;
```

**⚠️ Performance:** עם 5-10 tenants זה יעבוד מהר. עם 100+ → נצטרך materialized stats table. לא עכשיו.

---

## 2. get_tenant_activity_log() RPC

Admin צריך לקרוא activity_log של tenant ספציפי. activity_log מוגן ב-RLS (tenant_id).

```sql
CREATE OR REPLACE FUNCTION get_tenant_activity_log(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_level TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', (
        SELECT COUNT(*) FROM activity_log
        WHERE tenant_id = p_tenant_id
          AND (p_level IS NULL OR level = p_level)
          AND (p_entity_type IS NULL OR entity_type = p_entity_type)
          AND (p_date_from IS NULL OR created_at >= p_date_from)
          AND (p_date_to IS NULL OR created_at <= p_date_to)
      ),
      'entries', (
        SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', al.id,
            'level', al.level,
            'action', al.action,
            'entity_type', al.entity_type,
            'entity_id', al.entity_id,
            'details', al.details,
            'user_id', al.user_id,
            'created_at', al.created_at
          ) AS row_data
          FROM activity_log al
          WHERE al.tenant_id = p_tenant_id
            AND (p_level IS NULL OR al.level = p_level)
            AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
            AND (p_date_from IS NULL OR al.created_at >= p_date_from)
            AND (p_date_to IS NULL OR al.created_at <= p_date_to)
          ORDER BY al.created_at DESC
          LIMIT p_limit
          OFFSET p_offset
        ) sub
      )
    )
  );
END;
$$;
```

---

## 3. suspend_tenant() / activate_tenant() RPCs

```sql
CREATE OR REPLACE FUNCTION suspend_tenant(
  p_tenant_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status = 'active') THEN
    RAISE EXCEPTION 'Tenant not found or not active';
  END IF;

  UPDATE tenants SET
    status = 'suspended',
    suspended_reason = p_reason
  WHERE id = p_tenant_id;

  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.suspend', p_tenant_id, jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION activate_tenant(
  p_tenant_id UUID,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status IN ('suspended', 'trial')) THEN
    RAISE EXCEPTION 'Tenant not found or not suspended/trial';
  END IF;

  UPDATE tenants SET
    status = 'active',
    suspended_reason = NULL
  WHERE id = p_tenant_id;

  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.activate', p_tenant_id, '{}');
END;
$$;
```

---

## 4. update_tenant() RPC

עריכת פרטי tenant (שם, owner, plan):

```sql
CREATE OR REPLACE FUNCTION update_tenant(
  p_tenant_id UUID,
  p_updates JSONB,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_fields TEXT[] := ARRAY['name', 'owner_name', 'owner_email', 'owner_phone', 'plan_id', 'trial_ends_at'];
  v_field TEXT;
  v_old_values JSONB;
BEGIN
  -- Verify tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND status != 'deleted') THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Capture old values for audit
  SELECT jsonb_build_object(
    'name', name, 'owner_name', owner_name, 'owner_email', owner_email,
    'owner_phone', owner_phone, 'plan_id', plan_id, 'trial_ends_at', trial_ends_at
  ) INTO v_old_values
  FROM tenants WHERE id = p_tenant_id;

  -- Validate all fields are allowed
  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT v_field = ANY(v_allowed_fields) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  -- Apply updates dynamically
  IF p_updates ? 'name' THEN
    UPDATE tenants SET name = p_updates->>'name' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_name' THEN
    UPDATE tenants SET owner_name = p_updates->>'owner_name' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_email' THEN
    UPDATE tenants SET owner_email = p_updates->>'owner_email' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'owner_phone' THEN
    UPDATE tenants SET owner_phone = p_updates->>'owner_phone' WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'plan_id' THEN
    UPDATE tenants SET plan_id = (p_updates->>'plan_id')::uuid WHERE id = p_tenant_id;
  END IF;
  IF p_updates ? 'trial_ends_at' THEN
    UPDATE tenants SET trial_ends_at = (p_updates->>'trial_ends_at')::timestamptz WHERE id = p_tenant_id;
  END IF;

  -- Audit log
  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.update', p_tenant_id,
    jsonb_build_object('old', v_old_values, 'new', p_updates));
END;
$$;
```

---

## 5. Admin Panel — Page Architecture

### 5.1 Navigation

פאזה 1+2: admin panel = welcome screen + כפתור חנות חדשה.
פאזה 3: admin panel = **full dashboard** עם navigation.

```
┌─────────────────────────────────────────────────┐
│ Header: Optic Up Admin    [Daniel] [מנהל ראשי] [התנתק] │
├─────────────────────────────────────────────────┤
│ Nav tabs: [חנויות] [Audit Log] [הגדרות*]         │
├─────────────────────────────────────────────────┤
│ Content area                                     │
│ ┌───────────────────────────────────────────────┐│
│ │ Table / Detail panel / Activity viewer        ││
│ └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘

* הגדרות = פאזה 4 (Plans management)
```

**Tabs:**
- **חנויות** (default) — tenant table + detail panel
- **Audit Log** — platform audit log viewer (all admin actions)
- **הגדרות** — placeholder button, disabled, tooltip "בפאזה הבאה" (פאזה 4 = plans CRUD)

### 5.2 Routing

No URL routing — tab switching via JS. State held in memory.

```javascript
// admin-app.js manages tabs
let currentTab = 'tenants';  // 'tenants' | 'audit' | 'settings'
let selectedTenantId = null;  // for slide-in panel
```

---

## 6. Tenants Tab — admin-dashboard.js

### 6.1 Layout

```
┌──────────────────────────────────────────────────────┐
│ [➕ חנות חדשה]                    [חיפוש: ___________] │
│ [סטטוס: הכל ▼] [תוכנית: הכל ▼]                       │
├──────────────────────────────────────────────────────┤
│ שם חנות    │ קוד    │ תוכנית   │ סטטוס  │ עובדים │ מלאי  │ פעילות אחרונה │
│ ───────────┼────────┼──────────┼────────┼────────┼───────┼───────────────│
│ פריזמה     │ prizma │ ארגוני   │ ●פעיל  │ 8      │ 1,247 │ לפני 2 שעות   │
│ דמו        │ demo   │ ארגוני   │ ●פעיל  │ 1      │ 523   │ לפני 5 ימים   │
│ אופטיקה X  │ opt-x  │ בסיסי   │ ●פעיל  │ 3      │ 89    │ לפני יום      │
└──────────────────────────────────────────────────────┘
```

### 6.2 Table (TableBuilder)

| עמודה | מקור | sortable | הערות |
|-------|------|----------|-------|
| שם חנות | name | ✅ | clickable → opens slide-in |
| קוד | slug | ✅ | monospace font |
| תוכנית | plan_name | ✅ | badge style |
| סטטוס | status | ✅ | color badge: active=green, trial=blue, suspended=red |
| עובדים | employees_count | ✅ | number |
| מלאי | inventory_count | ✅ | number formatted |
| פעילות אחרונה | last_active | ✅ | relative time (לפני X) |

### 6.3 Filters

- **סטטוס:** dropdown — הכל / פעיל / trial / מושהה
- **תוכנית:** dropdown — הכל / בסיסי / פרימיום / ארגוני (loaded from plans table)
- **חיפוש:** text input — filters by name OR slug (client-side, debounced)

### 6.4 Data Loading

```javascript
async function loadTenants() {
  // 1. Call get_all_tenants_overview() RPC
  // 2. Store in memory: allTenants = [...]
  // 3. Apply filters → filteredTenants
  // 4. Render with TableBuilder
}
```

**Refresh:** auto-refresh on tab switch. Manual refresh button (🔄).

### 6.5 "חנות חדשה" Button

Moves from welcome screen to **above the table** (top-right). Same wizard from Phase 2.
After successful creation → auto-refresh tenant list.

---

## 7. Tenant Detail — Slide-in Panel (admin-tenant-detail.js)

### 7.1 Slide-in Architecture

```
┌────────────────────────────────────┐┌──────────────────────────┐
│ Tenants Table (dimmed)             ││ Slide-in Panel           │
│                                    ││                          │
│                                    ││ [✕ סגור]                 │
│                                    ││                          │
│                                    ││ אופטיקה פריזמה           │
│                                    ││ prizma · ארגוני · ●פעיל  │
│                                    ││                          │
│                                    ││ [פרטים] [Activity] [Prov]│
│                                    ││                          │
│                                    ││ Tab content...           │
│                                    ││                          │
│                                    ││ [Actions row]            │
└────────────────────────────────────┘└──────────────────────────┘
```

**Width:** 480px (desktop), full-width (mobile).
**Open:** click row in table → slide from left (RTL).
**Close:** ✕ button, click outside, Escape key.

### 7.2 Panel Header

```html
<div class="panel-header">
  <h2>אופטיקה פריזמה</h2>
  <div class="panel-meta">
    <span class="slug">prizma</span>
    <span class="badge badge-plan">ארגוני</span>
    <span class="badge badge-status badge-active">פעיל</span>
  </div>
  <div class="panel-url">
    <a href="https://app.opticalis.co.il/?t=prizma" target="_blank">
      app.opticalis.co.il/?t=prizma ↗
    </a>
  </div>
</div>
```

### 7.3 Tabs

| טאב | שם | מה מציג | Admin roles |
|-----|----|---------|-------------|
| 1 | פרטים | Info + edit + actions | all |
| 2 | Activity Log | activity_log per tenant | all |
| 3 | Provisioning | provisioning_log | super_admin, support |
| 4 | Audit | platform_audit_log filtered to this tenant | super_admin |

---

## 8. Tab 1 — פרטים

### 8.1 Info Section (read mode)

```
┌──────────────────────────────┐
│ פרטי חנות                     │
│ שם:      אופטיקה פריזמה      │ [✏️ ערוך]
│ קוד:     prizma               │
│ נוצרה:   25/03/2026           │
│                               │
│ פרטי בעלים                    │
│ שם:      דניאל                │
│ אימייל:  daniel@example.com   │
│ טלפון:   050-1234567          │
│                               │
│ תוכנית                        │
│ תוכנית:  ארגוני [שנה ▼]       │
│ Trial:   —                    │
│                               │
│ Usage                         │
│ עובדים:  8 / ∞                │
│ מלאי:    1,247 / ∞            │
│ ספקים:   15 / ∞               │
│                               │
│ ┌────────────────────────────┐│
│ │ [השהה חנות]    [מחק חנות]  ││
│ └────────────────────────────┘│
└──────────────────────────────┘
```

### 8.2 Edit Mode

Click "✏️ ערוך" → fields become editable inputs:
- שם חנות — text input
- שם בעלים — text input
- אימייל בעלים — email input
- טלפון בעלים — tel input

**Buttons:** [שמור] [ביטול]

Save → `update_tenant()` RPC → Toast.success → back to read mode.

**Plan change:** dropdown שמציג את כל ה-plans. Change → `update_tenant({ plan_id: ... })`. Plan change = immediate.

### 8.3 Usage Stats

```javascript
// Load from get_tenant_stats(tenantId)
// Display: current / limit
// If limit = -1 (unlimited) → show "∞"
// If current >= limit → red text
```

### 8.4 Actions

| Action | Button | Condition | Confirmation | Admin Role |
|--------|--------|-----------|-------------|------------|
| Suspend | "השהה חנות" | status=active | Modal.confirm + reason textarea | super_admin |
| Activate | "הפעל חנות" | status=suspended/trial | Modal.confirm | super_admin |
| Delete | "מחק חנות" | status≠deleted | Modal.confirm + type slug to confirm | super_admin |
| Reset PIN | "אפס PIN עובד" | always | Modal with employee dropdown + new PIN | super_admin, support |

**Suspend flow:**
1. Click "השהה חנות"
2. Modal.confirm: "להשהות את אופטיקה פריזמה?" + textarea "סיבת השהייה"
3. Confirm → `suspend_tenant()` RPC
4. Toast.success + update badge to suspended
5. Suspended tenant employees see: "החשבון מושהה, פנו ל-support@opticup.co.il"

**Delete flow:**
1. Click "מחק חנות"
2. Modal: "הקלד את קוד החנות (prizma) לאישור" + text input
3. Input must match slug exactly
4. Confirm → `delete_tenant()` RPC
5. Toast.success + tenant disappears from list

**Reset PIN flow:**
1. Click "אפס PIN עובד"
2. Modal with:
   - Employee dropdown (loaded from get_tenant_employees RPC)
   - New PIN input (default: 12345)
   - Checkbox: "חייב להחליף PIN" (default: checked)
3. Confirm → `reset_employee_pin()` RPC
4. Toast.success

### 8.5 reset_employee_pin() RPC

```sql
CREATE OR REPLACE FUNCTION reset_employee_pin(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_new_pin TEXT,
  p_must_change BOOLEAN DEFAULT true,
  p_admin_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify employee belongs to tenant
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Employee not found in tenant';
  END IF;

  UPDATE employees SET
    pin = p_new_pin,
    must_change_pin = p_must_change,
    failed_attempts = 0,
    locked_until = NULL
  WHERE id = p_employee_id AND tenant_id = p_tenant_id;

  -- Audit
  INSERT INTO platform_audit_log (admin_id, action, target_tenant_id, details)
  VALUES (p_admin_id, 'tenant.reset_pin', p_tenant_id,
    jsonb_build_object('employee_id', p_employee_id));
END;
$$;
```

### 8.6 get_tenant_employees() RPC (for PIN reset dropdown)

```sql
CREATE OR REPLACE FUNCTION get_tenant_employees(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_super_admin() AND NOT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', id, 'name', name)
    ), '[]'::jsonb)
    FROM employees
    WHERE tenant_id = p_tenant_id
  );
END;
$$;
```

---

## 9. Tab 2 — Activity Log Viewer (admin-activity-viewer.js)

### 9.1 Layout

```
┌──────────────────────────────────┐
│ Activity Log — אופטיקה פריזמה    │
│                                  │
│ [תאריך: מ-___ עד-___]           │
│ [סוג: הכל ▼] [רמה: הכל ▼]       │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 26/03 14:32  info            │ │
│ │ inventory.create             │ │
│ │ נוצר פריט מלאי #1234         │ │
│ ├──────────────────────────────┤ │
│ │ 26/03 14:30  warning         │ │
│ │ stock_count.difference       │ │
│ │ הפרש כמות: צפוי 10, ספרו 8  │ │
│ ├──────────────────────────────┤ │
│ │ ...                          │ │
│ └──────────────────────────────┘ │
│                                  │
│ מציג 1-50 מתוך 342              │
│ [◄ הקודם] [הבא ►]               │
└──────────────────────────────────┘
```

### 9.2 Filters

| Filter | Type | Values |
|--------|------|--------|
| תאריך מ- | date input | default: 7 days ago |
| תאריך עד | date input | default: today |
| סוג (entity_type) | dropdown | הכל, inventory, purchasing, receipts, debt, shipments, stock_count, employees, settings |
| רמה (level) | dropdown | הכל, info, warning, error |

### 9.3 Data Loading

```javascript
async function loadActivityLog(tenantId, filters) {
  const result = await adminSb.rpc('get_tenant_activity_log', {
    p_tenant_id: tenantId,
    p_limit: 50,
    p_offset: currentPage * 50,
    p_level: filters.level || null,
    p_entity_type: filters.entityType || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null
  });
  // result = { total: 342, entries: [...] }
  // Render entries + pagination
}
```

### 9.4 Entry Display

כל entry מציג:
- **timestamp** — DD/MM HH:mm (or full date if older than 7 days)
- **level** — badge (info=blue, warning=orange, error=red)
- **action** — e.g. `inventory.create`
- **details** — formatted from JSONB (first 2-3 key values)

**⚠️ Read-only.** Admin can view but not modify or delete activity log entries.

### 9.5 Pagination

- 50 entries per page
- "מציג X-Y מתוך Z"
- [◄ הקודם] [הבא ►] buttons
- Total from RPC response

---

## 10. Tab 3 — Provisioning Log

Simple table of `tenant_provisioning_log` entries for this tenant.

```javascript
// Load from AdminDB.query('tenant_provisioning_log', '*',
//   { tenant_id: tenantId, order: 'created_at.desc' })
```

| עמודה | מקור |
|-------|------|
| שלב | step |
| סטטוס | status (completed=green, failed=red) |
| פרטים | details (JSONB preview) |
| שגיאה | error_message (if failed) |
| תאריך | created_at |

**No filters needed** — usually 1-2 entries per tenant.

---

## 11. Tab 4 — Audit Log

Platform audit log entries **filtered to this tenant:**

```javascript
// Load from AdminDB.query('platform_audit_log', '*',
//   { target_tenant_id: tenantId, order: 'created_at.desc' })
```

| עמודה | מקור |
|-------|------|
| Admin | admin_id → lookup display_name |
| פעולה | action (tenant.create, tenant.suspend, tenant.update, etc.) |
| פרטים | details (JSONB) |
| תאריך | created_at |

**Only visible to super_admin.**

---

## 12. Platform Audit Log Tab (top-level)

### 12.1 Purpose

Separate from per-tenant audit — this shows **all admin actions** across all tenants.

### 12.2 Layout

Same as Tab 4 but **without tenant filter** — shows everything.

Additional column: **Tenant** (name + slug).

Filter: action type dropdown (tenant.create, tenant.update, tenant.suspend, tenant.activate, tenant.delete, tenant.reset_pin, admin.login, admin.logout).

### 12.3 Data Source

```javascript
// AdminDB.query('platform_audit_log', '*, platform_admins(display_name), tenants(name, slug)',
//   { order: 'created_at.desc', limit: 50 })
```

---

## 13. Admin Role Enforcement

### 13.1 Role Hierarchy

```
super_admin > support > viewer
```

### 13.2 Permission Matrix

| Feature | super_admin | support | viewer |
|---------|-------------|---------|--------|
| View tenant list | ✅ | ✅ | ✅ |
| View tenant detail | ✅ | ✅ | ✅ |
| View activity log | ✅ | ✅ | ✅ |
| View provisioning log | ✅ | ✅ | ❌ |
| View platform audit log | ✅ | ❌ | ❌ |
| Create tenant | ✅ | ❌ | ❌ |
| Edit tenant | ✅ | ❌ | ❌ |
| Suspend / Activate | ✅ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ |
| Change plan | ✅ | ❌ | ❌ |
| Reset employee PIN | ✅ | ✅ | ❌ |
| Manage plans (Phase 4) | ✅ | ❌ | ❌ |
| Manage admins (future) | ✅ | ❌ | ❌ |

### 13.3 Implementation

```javascript
// admin-auth.js — role checking
const ROLE_HIERARCHY = { super_admin: 3, support: 2, viewer: 1 };

function hasAdminPermission(requiredRole) {
  const admin = getCurrentAdmin();
  if (!admin) return false;
  return ROLE_HIERARCHY[admin.role] >= ROLE_HIERARCHY[requiredRole];
}

// Usage in UI:
// if (!hasAdminPermission('super_admin')) hide element or disable button
```

**UI enforcement:**
- Buttons/tabs that require higher role → `style.display = 'none'` or `disabled`
- No tooltip for hidden items (viewer doesn't even see them)
- Disabled items for support show tooltip: "רק מנהל ראשי יכול לבצע פעולה זו"

**Server enforcement:**
- RPCs already verify `is_platform_super_admin()` or active admin status
- Role-specific RPCs (delete, suspend) should verify super_admin role
- Support-level RPCs (reset_pin) should verify support or higher

---

## 14. Suspended Tenant — ERP Blocking

When a tenant is suspended, employees who try to log in should see a blocking message.

### 14.1 Change in auth flow (js/auth-service.js or js/shared.js)

```javascript
// After resolving tenant from slug, before showing login:
// Check tenant status
// If status === 'suspended' → show full-page blocking message
// If status === 'deleted' → show "חנות לא פעילה"
```

**⚠️ Minimal change:** Add tenant status check **after** tenant resolution, **before** PIN login. ~10 lines.

**Blocking message UI:**
```
┌──────────────────────────────┐
│                              │
│    ⚠️ החשבון מושהה            │
│                              │
│  החשבון של [שם חנות] מושהה.  │
│  פנו ל-support@opticup.co.il │
│                              │
└──────────────────────────────┘
```

### 14.2 Implementation Location

This check goes in the **tenant resolution** step — likely in `js/shared.js` where `TENANT_SLUG` is resolved, or in `index.html` initialization. The exact insertion point depends on the current code flow — the secondary chat will identify the right spot.

---

## 15. קבצים חדשים / משתנים

| קובץ | פעולה | שורות (הערכה) | מה |
|-------|-------|---------------|-----|
| `modules/admin-platform/admin-dashboard.js` | NEW | ~250 | Tenant table, filters, data loading |
| `modules/admin-platform/admin-tenant-detail.js` | NEW | ~320 | Slide-in panel, tabs, info/edit, actions |
| `modules/admin-platform/admin-activity-viewer.js` | NEW | ~180 | Activity log viewer with filters + pagination |
| `modules/admin-platform/admin-audit.js` | MODIFY | +~100 | Add platform audit log tab UI (was just logAdminAction) |
| `admin.html` | MODIFY | +~50 | Nav tabs, content sections, slide-in panel container |
| `admin-app.js` | MODIFY | +~50 | Tab routing, initialization |
| `admin-auth.js` | MODIFY | +~20 | hasAdminPermission(), ROLE_HIERARCHY |
| `js/shared.js` or `index.html` | MODIFY | +~15 | Suspended tenant blocking |
| SQL: 6 RPCs | Dashboard | | get_all_tenants_overview, get_tenant_stats, get_tenant_activity_log, suspend_tenant, activate_tenant, update_tenant, reset_employee_pin, get_tenant_employees |

**סה"כ: 3 JS חדשים + 5 JS modified + 8 RPCs**

---

## 16. סדר ביצוע (תת-פאזות)

| תת-פאזה | מה | סוג | הערות |
|----------|-----|------|-------|
| 3a | RPCs: get_all_tenants_overview, get_tenant_stats | SQL Dashboard | Query RPCs |
| 3b | RPCs: suspend_tenant, activate_tenant, update_tenant | SQL Dashboard | Action RPCs |
| 3c | RPCs: get_tenant_activity_log, reset_employee_pin, get_tenant_employees | SQL Dashboard | Support RPCs |
| 3d | admin.html restructure — nav tabs, content areas, slide-in container | Claude Code | HTML structure |
| 3e | admin-app.js — tab routing + init refactor | Claude Code | |
| 3f | admin-dashboard.js — tenant table + filters | Claude Code | |
| 3g | admin-tenant-detail.js — slide-in + Tab 1 (info/edit/actions) | Claude Code | הארוך ביותר |
| 3h | admin-activity-viewer.js — Tab 2 (activity log) | Claude Code | |
| 3i | admin-audit.js — Tab 3 (provisioning) + Tab 4 (audit) + top-level audit tab | Claude Code | |
| 3j | admin-auth.js — role enforcement | Claude Code | |
| 3k | Suspended tenant blocking in ERP | Claude Code | שינוי קטן |
| 3l | Verification | Browser testing | כל ה-checklist |

---

## 17. Verification Checklist

### Dashboard:
- [ ] Tenant table loads with correct data (name, slug, plan, status, counts, last_active)
- [ ] Sort by each column works
- [ ] Filter by status works
- [ ] Filter by plan works
- [ ] Search by name/slug works
- [ ] "חנות חדשה" button opens wizard (Phase 2)
- [ ] After creating tenant → list auto-refreshes

### Slide-in Panel:
- [ ] Click tenant row → panel slides in from left
- [ ] ✕ / Escape / click outside → panel closes
- [ ] Header shows name, slug, plan badge, status badge, URL link
- [ ] All 4 tabs switch correctly
- [ ] Panel works on mobile (full-width)

### Tab 1 — פרטים:
- [ ] Info displays correctly (name, owner, plan, usage stats)
- [ ] Usage stats show current/limit (unlimited = ∞)
- [ ] Edit mode: fields become inputs, save works
- [ ] Plan change via dropdown
- [ ] Suspend → status badge changes, confirmation required + reason
- [ ] Activate → status badge changes
- [ ] Delete → requires slug confirmation, tenant removed from list
- [ ] Reset PIN → employee dropdown, PIN change works
- [ ] All actions → platform_audit_log entry

### Tab 2 — Activity Log:
- [ ] Loads activity_log for selected tenant only
- [ ] Date filter works (default: last 7 days)
- [ ] Entity type filter works
- [ ] Level filter works
- [ ] Pagination works (50 per page, shows total)
- [ ] Read-only — no edit/delete options

### Tab 3 — Provisioning Log:
- [ ] Shows provisioning steps for tenant
- [ ] Visible to super_admin + support only

### Tab 4 — Audit Log:
- [ ] Shows admin actions for this tenant
- [ ] Visible to super_admin only

### Platform Audit Tab:
- [ ] Shows all admin actions across all tenants
- [ ] Filter by action type works
- [ ] Shows admin name + tenant name

### Role Enforcement:
- [ ] super_admin: sees everything, can do everything
- [ ] support: sees tenants + activity log, can reset PIN, cannot create/delete/suspend
- [ ] viewer: sees tenant list only, cannot do any actions
- [ ] Buttons hidden for insufficient role (not just disabled)

### Suspended Tenant:
- [ ] Suspend tenant via admin panel
- [ ] Navigate to tenant URL → blocking message "החשבון מושהה"
- [ ] PIN login is prevented
- [ ] Activate tenant via admin panel
- [ ] Navigate to tenant URL → login works again

### Backward Compatibility:
- [ ] Prizma ERP → works as before
- [ ] Demo ERP → works as before
- [ ] admin.html Phase 1+2 functionality preserved
- [ ] All 6 ERP pages → zero console errors
