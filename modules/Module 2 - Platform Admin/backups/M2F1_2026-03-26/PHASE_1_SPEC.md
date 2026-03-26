# PHASE_1_SPEC.md — DB + Admin Auth

> **מודול 2 — Platform Admin | פאזה 1**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע

---

## מטרה

בניית שכבת ה-DB למודול 2 + דף admin.html עם login באמצעות Supabase Auth (email+password). בסוף הפאזה: admin יכול להתחבר, לראות "שלום [שם]", ולהתנתק. אפס functionality מעבר לזה.

---

## 1. טבלאות DB חדשות

### 1.1 plans (global — אין tenant_id)

```sql
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  limits JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: SELECT לכל authenticated. INSERT/UPDATE/DELETE רק ל-admin.
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_read ON plans
  FOR SELECT USING (true);

CREATE POLICY plans_admin_write ON plans
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );
```

**Seed data — 3 תוכניות:**

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

> **שאלה פתוחה — Daniel יחליט:** האם הערכים של limits ו-features נכונים? אפשר לשנות בכל שלב — הם JSONB. -1 = unlimited.

---

### 1.2 platform_admins (global — אין tenant_id)

```sql
CREATE TABLE platform_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated admin can read their own row + super_admin can read all
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_self_read ON platform_admins
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY platform_admins_super_read ON platform_admins
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE role = 'super_admin' AND status = 'active')
  );

CREATE POLICY platform_admins_super_write ON platform_admins
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE role = 'super_admin' AND status = 'active')
  );
```

---

### 1.3 platform_audit_log (global — אין tenant_id)

```sql
CREATE TABLE platform_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES platform_admins(id),
  action TEXT NOT NULL,
  target_tenant_id UUID REFERENCES tenants(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: INSERT + SELECT for active admins only
ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_admin_access ON platform_audit_log
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );
```

---

### 1.4 tenant_config (tenant-scoped — יש tenant_id)

```sql
CREATE TABLE tenant_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- RLS: tenant reads own config + admin reads all
ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_config_tenant_read ON tenant_config
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_config_admin_access ON tenant_config
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );
```

---

### 1.5 tenant_provisioning_log (admin-only)

```sql
CREATE TABLE tenant_provisioning_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin read only
ALTER TABLE tenant_provisioning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY provisioning_log_admin_read ON tenant_provisioning_log
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM platform_admins WHERE status = 'active')
  );

-- INSERT: service role only (from createTenant RPC in Phase 2)
```

---

## 2. הרחבת טבלת tenants

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'trial', 'suspended', 'deleted'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES platform_admins(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

**⚠️ last_active כבר קיים על tenants — לא צריך להוסיף.**

**Migration — tenants קיימים:**

```sql
-- Assign enterprise plan to existing tenants (Prizma + Demo)
UPDATE tenants SET plan_id = (SELECT id FROM plans WHERE name = 'enterprise')
  WHERE plan_id IS NULL;

-- Existing tenants are active
UPDATE tenants SET status = 'active'
  WHERE status IS NULL;
```

> **הסבר:** פריזמה ודמו מקבלים enterprise plan כי הם tenants קיימים — אין להם הגבלות. כשnenant חדש נוצר בפאזה 2, הוא יקבל plan לפי בחירת ה-admin.

---

## 3. Indexes

```sql
CREATE INDEX idx_platform_admins_auth_user ON platform_admins(auth_user_id);
CREATE INDEX idx_platform_admins_email ON platform_admins(email);
CREATE INDEX idx_platform_audit_log_admin ON platform_audit_log(admin_id);
CREATE INDEX idx_platform_audit_log_tenant ON platform_audit_log(target_tenant_id);
CREATE INDEX idx_platform_audit_log_created ON platform_audit_log(created_at DESC);
CREATE INDEX idx_tenant_config_tenant ON tenant_config(tenant_id);
CREATE INDEX idx_tenant_config_key ON tenant_config(tenant_id, key);
CREATE INDEX idx_provisioning_log_tenant ON tenant_provisioning_log(tenant_id);
CREATE INDEX idx_tenants_plan ON tenants(plan_id);
CREATE INDEX idx_tenants_status ON tenants(status);
```

---

## 4. Bootstrap — Admin User ראשון

יצירת ה-admin הראשון היא **תהליך חד-פעמי ידני** (אין UI ליצירת admin עדיין):

**שלב 1 — Supabase Dashboard → Authentication → Users → Add User:**
- Email: [email של Daniel]
- Password: [password חזק]
- → Supabase מחזיר `auth_user_id` (UUID)

**שלב 2 — SQL Editor ב-Dashboard:**
```sql
INSERT INTO platform_admins (auth_user_id, email, display_name, role, status)
VALUES ('[auth_user_id מ-שלב 1]', '[email]', 'Daniel', 'super_admin', 'active');
```

**שלב 3 — verify:**
```sql
SELECT pa.*, au.email as auth_email
FROM platform_admins pa
JOIN auth.users au ON au.id = pa.auth_user_id
WHERE pa.email = '[email]';
```

> **הערה:** admin נוסף = super_admin מוסיף אותו דרך admin panel (פאזה 3). לפאזה 1 מספיק admin אחד ידני.

---

## 5. admin.html — ארכיטקטורה

### 5.1 עיקרון ההפרדה

admin.html הוא **עולם נפרד** מדפי ה-ERP:

| | ERP (index/inventory/...) | Admin (admin.html) |
|---|---|---|
| Auth | PIN → pin-auth Edge Function → JWT | Email+Password → Supabase Auth |
| Supabase client | `sb` מ-shared.js | `adminSb` מ-admin-auth.js |
| Tenant context | `app.tenant_id` בכל query | אין — global context |
| Session | sessionStorage + JWT | Supabase Auth session (auto-managed) |
| JS globals | shared.js, auth-service.js, header.js | **לא נטענים** |
| shared/css/ | ✅ משתמש | ✅ משתמש |
| shared/js/ components | ✅ Modal, Toast, TableBuilder | ✅ Modal, Toast, TableBuilder |
| shared/js/supabase-client.js (DB.*) | ✅ משתמש | ❌ **לא נטען** (tenant-oriented) |

**למה DB.* לא נטען?** כי supabase-client.js מוסיף `app.tenant_id` לכל query, מתעדכן מ-`getTenantId()`, ומשתמש ב-`sb` מ-shared.js. Admin לא עובד ב-tenant context.

### 5.2 admin-auth.js — Supabase client + auth

**זהו הקובץ שמחליף את shared.js + auth-service.js עבור admin:**

```javascript
// === admin-auth.js ===
// Supabase client for Platform Admin context (no tenant)

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON_KEY = '...'; // same anon key as ERP

const adminSb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Functions ---

async function adminLogin(email, password) {
  // 1. supabase.auth.signInWithPassword({ email, password })
  // 2. If success → query platform_admins WHERE auth_user_id = session.user.id AND status = 'active'
  // 3. If not in platform_admins or suspended → signOut + error "אין הרשאה"
  // 4. If active → update last_login → return admin object
  // 5. Log to platform_audit_log: action='admin.login'
  // Returns: { id, email, display_name, role } or throws
}

async function adminLogout() {
  // 1. Log to platform_audit_log: action='admin.logout'
  // 2. supabase.auth.signOut()
  // 3. Redirect to login screen
}

async function getAdminSession() {
  // 1. supabase.auth.getSession()
  // 2. If no session → return null (show login form)
  // 3. If session → verify still in platform_admins + active
  // 4. Return: { id, email, display_name, role } or null
}

async function requireAdmin(minRole = 'viewer') {
  // Role hierarchy: super_admin > support > viewer
  // If current admin role < minRole → redirect or show "אין הרשאה"
  // Returns admin object or redirects
}

function getCurrentAdmin() {
  // Sync getter — returns cached admin from last getAdminSession()
  // For UI purposes (display name, role checks)
}
```

**Global exports:** `adminSb`, `adminLogin()`, `adminLogout()`, `getAdminSession()`, `requireAdmin()`, `getCurrentAdmin()`

### 5.3 admin-db.js — Admin DB wrapper (lightweight)

**Wrapper פשוט ל-CRUD ללא tenant context:**

```javascript
// === admin-db.js ===
// Lightweight DB wrapper for admin operations (no tenant_id injection)

const AdminDB = {
  async query(table, select = '*', filters = {}) {
    // adminSb.from(table).select(select) + apply filters
    // Error handling + optional loading spinner
  },

  async insert(table, data) {
    // adminSb.from(table).insert(data)
    // Error handling
  },

  async update(table, id, data) {
    // adminSb.from(table).update(data).eq('id', id)
    // Error handling
  },

  async rpc(name, params = {}) {
    // adminSb.rpc(name, params)
    // Error handling
  }
};
```

**Global export:** `AdminDB`

> **למה קובץ נפרד ולא חלק מ-admin-auth.js?** הפרדת concerns — auth-auth עוסק באותנטיקציה, admin-db עוסק בגישה ל-DB. גם שומר על גודל קבצים מתחת ל-350 שורות.

### 5.4 admin-audit.js — Audit Logger

```javascript
// === admin-audit.js (Phase 1 version — just the logging helper) ===

async function logAdminAction(action, targetTenantId = null, details = {}) {
  const admin = getCurrentAdmin();
  if (!admin) return;

  await AdminDB.insert('platform_audit_log', {
    admin_id: admin.id,
    action: action,
    target_tenant_id: targetTenantId,
    details: details,
    ip_address: null  // optional — can add later
  });
}
```

**Global export:** `logAdminAction()`

> **הערה:** הקובץ הזה יגדל בפאזה 3 כש-audit log viewer נבנה. בפאזה 1 הוא רק helper function.

### 5.5 admin.html — HTML structure

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optic Up — Platform Admin</title>

  <!-- Supabase SDK -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- Shared CSS (same as ERP — Indigo palette) -->
  <link rel="stylesheet" href="shared/css/variables.css">
  <link rel="stylesheet" href="shared/css/layout.css">
  <link rel="stylesheet" href="shared/css/components.css">
  <link rel="stylesheet" href="shared/css/forms.css">
  <link rel="stylesheet" href="shared/css/modal.css">
  <link rel="stylesheet" href="shared/css/toast.css">

  <!-- Admin-specific CSS (inline in Phase 1, separate file if grows) -->
  <style>
    /* Login form styling — centered card, admin branding */
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div id="login-screen">
    <div class="admin-login-card">
      <div class="admin-logo">
        <h1>Optic Up</h1>
        <p>Platform Admin</p>
      </div>
      <div class="login-form">
        <input type="email" id="admin-email" placeholder="אימייל" autocomplete="email">
        <input type="password" id="admin-password" placeholder="סיסמה" autocomplete="current-password">
        <button id="admin-login-btn" class="btn btn-primary btn-lg">כניסה</button>
        <div id="login-error" class="error-message" style="display:none;"></div>
      </div>
    </div>
  </div>

  <!-- Admin Panel (hidden until login) -->
  <div id="admin-panel" style="display:none;">
    <header class="admin-header">
      <div class="admin-header-right">
        <h2>Optic Up Admin</h2>
      </div>
      <div class="admin-header-left">
        <span id="admin-name"></span>
        <span id="admin-role" class="badge"></span>
        <button id="admin-logout-btn" class="btn btn-ghost">התנתק</button>
      </div>
    </header>

    <main id="admin-content">
      <!-- Phase 1: Just a welcome message -->
      <div class="admin-welcome">
        <h2>שלום, <span id="welcome-name"></span></h2>
        <p>ברוכים הבאים ל-Platform Admin</p>
        <p class="text-muted">Dashboard, ניהול tenants, ותוכניות — בפאזות הבאות</p>
      </div>
    </main>
  </div>

  <!-- Shared JS Components (Modal, Toast) -->
  <script src="shared/js/toast.js"></script>
  <script src="shared/js/modal-builder.js"></script>

  <!-- Admin JS -->
  <script src="modules/admin-platform/admin-auth.js"></script>
  <script src="modules/admin-platform/admin-db.js"></script>
  <script src="modules/admin-platform/admin-audit.js"></script>
  <script src="modules/admin-platform/admin-app.js"></script>
</body>
</html>
```

### 5.6 admin-app.js — App initialization

```javascript
// === admin-app.js ===
// Admin panel initialization and page routing

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check if user has active Supabase Auth session
  const admin = await getAdminSession();

  if (admin) {
    showAdminPanel(admin);
  } else {
    showLoginScreen();
  }
});

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';

  document.getElementById('admin-login-btn').addEventListener('click', handleLogin);
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('login-error');

  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = 'יש למלא אימייל וסיסמה';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const admin = await adminLogin(email, password);
    showAdminPanel(admin);
    Toast.success(`שלום ${admin.display_name}`);
  } catch (err) {
    errorEl.textContent = err.message || 'שגיאה בכניסה';
    errorEl.style.display = 'block';
  }
}

function showAdminPanel(admin) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';

  document.getElementById('admin-name').textContent = admin.display_name;
  document.getElementById('admin-role').textContent = getRoleDisplayName(admin.role);
  document.getElementById('welcome-name').textContent = admin.display_name;

  document.getElementById('admin-logout-btn').addEventListener('click', adminLogout);
}

function getRoleDisplayName(role) {
  const map = { super_admin: 'מנהל ראשי', support: 'תמיכה', viewer: 'צופה' };
  return map[role] || role;
}
```

---

## 6. קבצים חדשים — סיכום

| קובץ | נתיב | תפקיד | שורות (הערכה) |
|-------|------|--------|---------------|
| admin.html | `/admin.html` | Platform Admin HTML page | ~80 |
| admin-auth.js | `/modules/admin-platform/admin-auth.js` | Supabase Auth + session + admin verification | ~120 |
| admin-db.js | `/modules/admin-platform/admin-db.js` | Lightweight DB wrapper (no tenant context) | ~80 |
| admin-audit.js | `/modules/admin-platform/admin-audit.js` | logAdminAction() helper | ~30 |
| admin-app.js | `/modules/admin-platform/admin-app.js` | App init, login/panel toggle, event handlers | ~80 |

**סה"כ: 1 HTML + 4 JS = 5 קבצים חדשים**

---

## 7. מה לא משתנה (backward compatible)

- ❌ אפס שינויים ב-index.html, inventory.html, או כל דף ERP
- ❌ אפס שינויים ב-shared.js, auth-service.js, header.js
- ❌ אפס שינויים ב-shared/ components
- ❌ אפס שינויים ב-Edge Functions (pin-auth, ocr-extract)
- ✅ טבלת tenants מורחבת (ADD COLUMN only — backward compatible)
- ✅ 5 טבלאות חדשות (לא משפיעות על קיים)

---

## 8. סדר ביצוע (תת-פאזות)

| תת-פאזה | מה | SQL/JS | הערות |
|----------|-----|--------|-------|
| 1a | יצירת plans + seed data | SQL via Dashboard | טבלה + 3 שורות |
| 1b | יצירת platform_admins | SQL via Dashboard | טבלה + RLS |
| 1c | יצירת platform_audit_log | SQL via Dashboard | טבלה + RLS |
| 1d | יצירת tenant_config | SQL via Dashboard | טבלה + RLS + tenant_id |
| 1e | יצירת tenant_provisioning_log | SQL via Dashboard | טבלה + RLS |
| 1f | הרחבת tenants + migration | SQL via Dashboard | 9 עמודות + assign plan |
| 1g | Indexes | SQL via Dashboard | כל ה-indexes |
| 1h | Bootstrap admin user | Dashboard Auth + SQL | user + platform_admins row |
| 1i | admin.html + admin-auth.js | JS/HTML in repo | login, session, logout |
| 1j | admin-db.js + admin-audit.js | JS in repo | DB wrapper + audit helper |
| 1k | admin-app.js | JS in repo | App init, event wiring |
| 1l | Verification | Browser testing | כל ה-checklist |

**⚠️ חשוב:** תת-פאזות 1a-1h הן SQL שרץ דרך Supabase Dashboard (service role). תת-פאזות 1i-1k הן קוד שנכנס ל-repo ומתבצע ב-Claude Code.

**פרומפט של הצ'אט המשני צריך להפריד:** פרומפט SQL (שאני מריץ ב-Dashboard) ← ואז פרומפט JS (ש-Claude Code מריץ).

---

## 9. Verification Checklist

### DB:
- [ ] 5 טבלאות חדשות קיימות ב-Supabase: plans, platform_admins, platform_audit_log, tenant_config, tenant_provisioning_log
- [ ] RLS enabled על כל 5 הטבלאות
- [ ] plans: 3 שורות seed data (basic, premium, enterprise)
- [ ] tenants: 9 עמודות חדשות (plan_id, status, trial_ends_at, owner_name, owner_email, owner_phone, created_by, suspended_reason, deleted_at)
- [ ] פריזמה ודמו: plan_id = enterprise, status = 'active'
- [ ] platform_admins: שורה אחת (Daniel, super_admin)
- [ ] Indexes: כל 10 indexes קיימים

### Auth:
- [ ] Supabase Auth: user קיים עם email של Daniel
- [ ] admin.html: נטען ללא שגיאות console
- [ ] login עם email+password → רואים "שלום Daniel"
- [ ] login עם email שגוי → "שגיאה בכניסה"
- [ ] login עם password שגוי → "שגיאה בכניסה"
- [ ] login עם email שקיים ב-Auth אבל לא ב-platform_admins → "אין הרשאה" + signOut
- [ ] אחרי login: admin-name, admin-role מוצגים נכון
- [ ] logout → חזרה למסך login, session נמחק
- [ ] refresh page אחרי login → session נשמר (לא צריך login שוב)
- [ ] platform_audit_log: שורות login/logout נרשמות
- [ ] admin.html: אין טעינה של shared.js, auth-service.js, header.js

### Isolation:
- [ ] כניסה ל-index.html (ERP) עדיין עובדת עם PIN — אפס regression
- [ ] admin.html לא יכול לגשת לנתוני tenant (RLS חוסם)
- [ ] ERP לא יכול לגשת ל-platform_admins (RLS חוסם)

---

## 10. שאלות שנסגרו

1. **ערכי plans (limits/features):** הולכים עם ה-seed data שרשום למעלה. ניתן לשנות בכל שלב — הם JSONB.

2. **Email ל-admin ראשון:** `danylis92@gmail.com`

3. **admin.html URL:** נגיש ב-URL ציבורי (`app.opticalis.co.il/admin.html`). Login דורש email+password — אין סיכון אבטחתי. כך עובדים כל ה-SaaS-ים.

4. **SUPABASE_ANON_KEY:** משכפלים את ה-key ישירות ב-admin-auth.js. אין תלות ב-shared.js.
