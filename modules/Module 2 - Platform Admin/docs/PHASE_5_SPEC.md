# PHASE_5_SPEC.md — Slug Routing + Future Prep

> **מודול 2 — Platform Admin | פאזה 5**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע
> **תלוי ב:** פאזה 1 ✅, פאזה 4 ✅

---

## מטרה

Routing חסין-תקלות: slug לא קיים, tenant מושהה, tenant מחוק — כל אחד מציג דף שגיאה מתאים. כניסה בלי slug → landing page נקי. `resolveTenant()` מרוכזת בפונקציה אחת שתתמוך subdomain בעתיד. טבלת storefront_config מוכנה למודול 3. בסוף הפאזה: כל נתיב כניסה למערכת מטופל — אין "דף לבן" או שגיאה גנרית.

---

## 1. resolveTenant() — Centralized in shared.js

### 1.1 מצב היום

הלוגיקה מפוזרת ב-shared.js:
- `TENANT_SLUG` נקרא מ-URL `?t=` param
- Fallback ל-sessionStorage
- Fallback ל-default `'prizma'`
- `getTenantId()` מביא UUID מ-tenants table
- Suspended check נוסף בפאזה 3 (overlay)

**בעיות:**
- אין טיפול ב-slug לא קיים (404)
- אין טיפול ב-tenant deleted
- הלוגיקה מפוזרת על פני כמה מקומות
- אין נקודה אחת לשנות כשנעבור ל-subdomain

### 1.2 resolveTenant() — פונקציה חדשה

```javascript
/**
 * Centralized tenant resolution.
 * Called once on page load, before any other initialization.
 *
 * Resolution order:
 *   1. URL param: ?t=slug
 *   2. [Future: subdomain — slug.opticup.co.il]
 *   3. sessionStorage: lastTenantSlug
 *   4. No slug found → redirect to landing page
 *
 * After resolving slug:
 *   - Query tenants table for id, name, status, ui_config, plan_id
 *   - If not found → redirect to error page (not-found)
 *   - If suspended → redirect to error page (suspended)
 *   - If deleted → redirect to error page (deleted)
 *   - If active/trial → set globals + continue
 *
 * @returns {Promise<{id, slug, name, status, ui_config, plan_id}>}
 */
async function resolveTenant() {
  // Step 1: Extract slug
  let slug = null;

  // 1a. URL param
  const urlParams = new URLSearchParams(window.location.search);
  slug = urlParams.get('t');

  // 1b. [Future: subdomain]
  // const hostname = window.location.hostname;
  // if (hostname !== 'app.opticalis.co.il' && hostname.endsWith('.opticup.co.il')) {
  //   slug = hostname.split('.')[0];
  // }

  // 1c. sessionStorage fallback
  if (!slug) {
    slug = sessionStorage.getItem('lastTenantSlug');
  }

  // 1d. No slug at all → landing page
  if (!slug) {
    redirectToLanding();
    return null;
  }

  // Step 2: Resolve slug to tenant
  const { data: tenant, error } = await sb
    .from('tenants')
    .select('id, slug, name, status, ui_config, plan_id')
    .eq('slug', slug)
    .single();

  if (error || !tenant) {
    redirectToError('not-found', slug);
    return null;
  }

  // Step 3: Check status
  if (tenant.status === 'suspended') {
    redirectToError('suspended', slug, tenant.name);
    return null;
  }

  if (tenant.status === 'deleted') {
    redirectToError('deleted', slug);
    return null;
  }

  // Step 4: Set globals
  sessionStorage.setItem('lastTenantSlug', slug);
  // Set existing globals that the rest of the app uses:
  // TENANT_SLUG, tenantId, etc. — replace scattered code

  return tenant;
}
```

### 1.3 Redirect Functions

```javascript
function redirectToLanding() {
  // If already on landing page, don't redirect (avoid loop)
  if (window.location.pathname.endsWith('/landing.html')) return;
  window.location.href = '/landing.html';
}

function redirectToError(type, slug, tenantName = '') {
  // type: 'not-found' | 'suspended' | 'deleted'
  const params = new URLSearchParams({ type, slug });
  if (tenantName) params.set('name', tenantName);
  window.location.href = `/error.html?${params}`;
}
```

### 1.4 Integration — Replacing Scattered Code

**What changes in shared.js:**
- Remove scattered TENANT_SLUG resolution code
- Add `resolveTenant()` function
- Call `resolveTenant()` early in initialization
- Keep `getTenantId()`, `TENANT_SLUG` as globals (backward compatible)
- Other files that use these globals → zero changes needed

**⚠️ Critical:** `resolveTenant()` must run **before** any DB queries, auth checks, or UI rendering. The current shared.js initialization flow must be preserved — resolveTenant replaces the slug-resolution part, not the entire init.

### 1.5 Pages That Call resolveTenant()

Every ERP page loads shared.js → shared.js calls resolveTenant() → rest of page initializes.

Pages affected: index.html, inventory.html, suppliers-debt.html, employees.html, shipments.html, settings.html.

**admin.html does NOT call resolveTenant()** — it has no tenant context.

---

## 2. Error Pages — error.html

### 2.1 Single Page, Multiple States

One HTML file that reads `?type=` and shows the right message:

```
error.html?type=not-found&slug=xyz
error.html?type=suspended&slug=prizma&name=אופטיקה%20פריזמה
error.html?type=deleted&slug=old-store
```

### 2.2 States

| type | Icon | Title | Message | Action |
|------|------|-------|---------|--------|
| not-found | 🔍 | החנות לא נמצאה | לא נמצאה חנות עם הקוד "xyz" | [חזרה לדף הראשי] |
| suspended | ⚠️ | החשבון מושהה | החשבון של "אופטיקה פריזמה" מושהה. פנו ל-support@opticup.co.il | [חזרה לדף הראשי] |
| deleted | ❌ | החנות לא פעילה | החנות שחיפשת כבר לא פעילה. | [חזרה לדף הראשי] |

### 2.3 Design

```
┌─────────────────────────────────────┐
│                                     │
│           [Optic Up Logo]           │
│                                     │
│           🔍                        │
│     החנות לא נמצאה                  │
│                                     │
│  לא נמצאה חנות עם הקוד "xyz"       │
│                                     │
│     [← חזרה לדף הראשי]             │
│                                     │
│  ─────────────────────────          │
│  © Optic Up                         │
└─────────────────────────────────────┘
```

**Design principles:**
- Same Indigo palette (shared/css/variables.css)
- Centered card, clean, RTL Hebrew
- Optic Up branding (logo or text logo)
- No scary error codes — friendly Hebrew messages
- "חזרה לדף הראשי" → links to landing.html

### 2.4 Structure

```html
<!-- error.html -->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optic Up — שגיאה</title>
  <link rel="stylesheet" href="shared/css/variables.css">
  <style>
    /* Minimal inline styles — centered card, responsive */
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-logo">Optic Up</div>
    <div class="error-icon" id="error-icon"></div>
    <h1 id="error-title"></h1>
    <p id="error-message"></p>
    <a href="/landing.html" class="error-link">← חזרה לדף הראשי</a>
  </div>
  <footer>© Optic Up</footer>
  <script>
    // Read ?type=, ?slug=, ?name= → populate elements
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || 'not-found';
    const slug = params.get('slug') || '';
    const name = params.get('name') || '';

    const states = {
      'not-found': {
        icon: '🔍',
        title: 'החנות לא נמצאה',
        message: `לא נמצאה חנות עם הקוד "${slug}"`
      },
      'suspended': {
        icon: '⚠️',
        title: 'החשבון מושהה',
        message: `החשבון של "${name || slug}" מושהה. פנו ל-support@opticup.co.il`
      },
      'deleted': {
        icon: '❌',
        title: 'החנות לא פעילה',
        message: 'החנות שחיפשת כבר לא פעילה.'
      }
    };

    const state = states[type] || states['not-found'];
    document.getElementById('error-icon').textContent = state.icon;
    document.getElementById('error-title').textContent = state.title;
    document.getElementById('error-message').textContent = state.message;
    document.title = `Optic Up — ${state.title}`;
  </script>
</body>
</html>
```

**~60 שורות.** Standalone — no shared.js dependency (it's an error page, not an app page).

---

## 3. Landing Page — landing.html

### 3.1 Purpose

User navigates to `app.opticalis.co.il` without `?t=slug` → sees landing page with slug input field.

### 3.2 Design

```
┌─────────────────────────────────────┐
│                                     │
│           [Optic Up Logo]           │
│                                     │
│     ברוכים הבאים ל-Optic Up         │
│     מערכת ניהול לחנויות אופטיקה     │
│                                     │
│     ┌───────────────────┐           │
│     │ הכנס קוד חנות      │           │
│     └───────────────────┘           │
│     [כניסה →]                       │
│                                     │
│     [שגיאה: הקוד לא נמצא]           │
│                                     │
│  ─────────────────────────          │
│  © Optic Up  ·  ניהול פלטפורמה      │
└─────────────────────────────────────┘
```

### 3.3 Flow

1. User types slug (e.g. "prizma")
2. Click "כניסה" or Enter
3. Validate slug format client-side (a-z, 0-9, hyphens)
4. Redirect to `?t=slug` → index.html loads → resolveTenant() handles the rest
5. If resolveTenant() fails (not found) → user lands on error.html

**⚠️ No server-side validation on landing page.** Just redirect. resolveTenant() does the real check.

### 3.4 Structure

```html
<!-- landing.html -->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optic Up — מערכת ניהול לחנויות אופטיקה</title>
  <link rel="stylesheet" href="shared/css/variables.css">
  <style>
    /* Minimal inline styles — centered card, responsive, Indigo palette */
  </style>
</head>
<body>
  <div class="landing-container">
    <div class="landing-logo">Optic Up</div>
    <h1>ברוכים הבאים ל-Optic Up</h1>
    <p class="landing-subtitle">מערכת ניהול לחנויות אופטיקה</p>

    <div class="landing-form">
      <input type="text" id="slug-input"
        placeholder="הכנס קוד חנות"
        autocomplete="off"
        dir="ltr">
      <button id="slug-submit" class="btn btn-primary">כניסה →</button>
      <div id="slug-error" class="error-message" style="display:none;"></div>
    </div>
  </div>

  <footer>
    <span>© Optic Up</span>
    <a href="/admin.html">ניהול פלטפורמה</a>
  </footer>

  <script>
    const input = document.getElementById('slug-input');
    const btn = document.getElementById('slug-submit');
    const err = document.getElementById('slug-error');

    function goToStore() {
      const slug = input.value.trim().toLowerCase();
      err.style.display = 'none';

      if (!slug) {
        err.textContent = 'יש להכניס קוד חנות';
        err.style.display = 'block';
        return;
      }

      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3) {
        err.textContent = 'קוד חנות יכול להכיל רק אותיות באנגלית, מספרים ומקפים';
        err.style.display = 'block';
        return;
      }

      // Redirect — resolveTenant() in shared.js will handle validation
      window.location.href = '/?t=' + encodeURIComponent(slug);
    }

    btn.addEventListener('click', goToStore);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToStore(); });

    // Auto-focus
    input.focus();
  </script>
</body>
</html>
```

**~80 שורות.** Standalone — no shared.js dependency.

---

## 4. storefront_config Table (DB Prep)

### 4.1 SQL

```sql
CREATE TABLE storefront_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  enabled BOOLEAN DEFAULT false,
  domain TEXT,
  subdomain TEXT,
  theme JSONB DEFAULT '{}',
  logo_url TEXT,
  categories JSONB DEFAULT '[]',
  seo JSONB DEFAULT '{}',
  pages JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: tenant reads own + admin reads all
ALTER TABLE storefront_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY storefront_config_tenant_read ON storefront_config
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY storefront_config_admin_access ON storefront_config
  FOR ALL USING (
    is_platform_super_admin() OR EXISTS (
      SELECT 1 FROM platform_admins
      WHERE auth_user_id = auth.uid() AND status = 'active'
    )
  );

CREATE INDEX idx_storefront_config_tenant ON storefront_config(tenant_id);
```

### 4.2 What is NOT included

**Deferred to Module 3:**
- `shared_resources` table (B2B marketplace)
- `resource_access_log` table (B2B marketplace)

These were in the original ROADMAP but deferred because no module uses them yet.

### 4.3 createTenant() Update

New tenants should get a default storefront_config row:

```sql
-- Add to create_tenant() RPC, after existing steps:
-- Step 11: Create default storefront_config
INSERT INTO storefront_config (tenant_id, enabled)
VALUES (v_tenant_id, false);
```

**⚠️ Existing tenants (Prizma, Demo)** — need migration:

```sql
INSERT INTO storefront_config (tenant_id, enabled)
SELECT id, false FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM storefront_config);
```

---

## 5. Suspended Tenant Handling — Replace Overlay

### 5.1 Current State (Phase 3)

Phase 3 added a suspended tenant overlay in shared.js/index.html — an undismissible overlay that blocks the page.

### 5.2 New Behavior

With `resolveTenant()`, suspended tenants are handled **before** the page loads:

```
resolveTenant() → tenant.status === 'suspended' → redirect to error.html?type=suspended
```

The page never renders. No overlay needed.

**⚠️ Remove the Phase 3 overlay code** — it's replaced by the redirect in resolveTenant().

---

## 6. Default Tenant Fallback — Remove 'prizma' Hardcode

### 6.1 Current State

shared.js falls back to `'prizma'` if no slug is found. This is a hardcoded value.

### 6.2 New Behavior

No fallback to any specific tenant. If no slug → landing page.

```
?t=slug → resolve
sessionStorage → resolve
nothing → redirect to landing.html
```

**⚠️ Iron Rule #11 (no hardcoded business values):** Remove `'prizma'` default.

---

## 7. קבצים חדשים / משתנים

| קובץ | פעולה | שורות (הערכה) | מה |
|-------|-------|---------------|-----|
| `landing.html` | NEW | ~80 | Landing page with slug input |
| `error.html` | NEW | ~60 | Error page (not-found / suspended / deleted) |
| `js/shared.js` | MODIFY | ~+40, -30 | Add resolveTenant(), remove scattered slug code, remove 'prizma' default, remove suspended overlay |
| `index.html` | MODIFY | ~-10 | Remove suspended overlay HTML if exists |
| SQL: storefront_config | Dashboard | | CREATE TABLE + RLS + migration |
| SQL: create_tenant() update | Dashboard | | Add step 11 (storefront_config) |

**סה"כ: 2 HTML חדשים + 2 modified + 2 SQL changes**

**⚠️ פאזה קטנה.** פחות קבצים, פחות קוד, אבל שינוי ב-shared.js = critical path. צריך בדיקה מדוקדקת.

---

## 8. סדר ביצוע (תת-פאזות)

| תת-פאזה | מה | סוג | הערות |
|----------|-----|------|-------|
| 5a | SQL: storefront_config table + RLS + migration + create_tenant update | SQL Dashboard | |
| 5b | error.html | Claude Code | Standalone page |
| 5c | landing.html | Claude Code | Standalone page |
| 5d | resolveTenant() in shared.js | Claude Code | **Critical** — replace scattered code |
| 5e | Remove suspended overlay + 'prizma' default | Claude Code | Cleanup |
| 5f | Verification | Browser testing | Full checklist |

**⚠️ 5d is the riskiest sub-phase.** It touches shared.js which is loaded by every page. Must verify all 6 ERP pages after this change.

---

## 9. Verification Checklist

### Error Pages:
- [ ] `error.html?type=not-found&slug=xyz` → "החנות לא נמצאה" + shows "xyz"
- [ ] `error.html?type=suspended&slug=prizma&name=...` → "החשבון מושהה" + shows name
- [ ] `error.html?type=deleted&slug=old` → "החנות לא פעילה"
- [ ] "חזרה לדף הראשי" → links to landing.html
- [ ] Mobile responsive
- [ ] RTL Hebrew correct

### Landing Page:
- [ ] Navigate to `app.opticalis.co.il/` (no slug) → landing.html
- [ ] Enter valid slug → redirect to `/?t=slug`
- [ ] Enter empty → "יש להכניס קוד חנות"
- [ ] Enter invalid format → format error
- [ ] Enter valid but non-existent slug → redirect → error.html (not-found)
- [ ] Enter "prizma" → redirect → index.html loads → login screen
- [ ] "ניהול פלטפורמה" link → admin.html
- [ ] Mobile responsive
- [ ] Input auto-focused
- [ ] Enter key submits

### resolveTenant():
- [ ] `?t=prizma` → resolves to Prizma, login screen shows
- [ ] `?t=demo` → resolves to Demo, green theme
- [ ] `?t=nonexistent` → redirect to error.html?type=not-found
- [ ] No slug + no sessionStorage → redirect to landing.html
- [ ] No slug + sessionStorage has "prizma" → resolves to Prizma
- [ ] Suspended tenant slug → redirect to error.html?type=suspended
- [ ] Deleted tenant slug → redirect to error.html?type=deleted
- [ ] After successful resolve → sessionStorage updated with slug
- [ ] `getTenantId()` still works after resolve
- [ ] `TENANT_SLUG` global still works after resolve

### Backward Compatibility (CRITICAL):
- [ ] index.html with `?t=prizma` → loads normally, zero errors
- [ ] inventory.html with `?t=prizma` → loads normally, zero errors
- [ ] suppliers-debt.html with `?t=prizma` → loads normally, zero errors
- [ ] employees.html with `?t=prizma` → loads normally, zero errors
- [ ] shipments.html with `?t=prizma` → loads normally, zero errors
- [ ] settings.html with `?t=prizma` → loads normally, zero errors
- [ ] Demo tenant (`?t=demo`) → loads on all pages, zero errors
- [ ] admin.html → unaffected (doesn't use resolveTenant)
- [ ] Phase 1-4 admin functionality → all preserved

### storefront_config:
- [ ] Table created with RLS
- [ ] Prizma + Demo have rows (enabled=false)
- [ ] New tenant from wizard → storefront_config row created
- [ ] Tenant can read own config (RLS)
- [ ] Admin can read all configs

### Cleanup:
- [ ] No hardcoded 'prizma' fallback in shared.js
- [ ] No suspended overlay code (replaced by redirect)
- [ ] No scattered slug resolution code (centralized in resolveTenant)

---

## 10. שאלות שנסגרו

1. **resolveTenant() location:** shared.js — מרוכזת, טוענת ראשונה, backward compatible.
2. **B2B DB prep:** Deferred to Module 3. Only storefront_config created now.
3. **Landing page:** נקי, מינימלי, ~80 שורות. שדה slug + כפתור כניסה.
4. **'prizma' default:** Removed. No slug → landing page.
5. **Suspended overlay:** Replaced by redirect to error.html. Cleaner UX.
