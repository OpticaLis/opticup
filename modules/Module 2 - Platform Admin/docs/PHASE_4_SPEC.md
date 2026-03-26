# PHASE_4_SPEC.md — Plans & Limits

> **מודול 2 — Platform Admin | פאזה 4**
> **נכתב:** מרץ 2026
> **סטטוס:** טרום-ביצוע
> **תלוי ב:** פאזה 1 ✅, פאזה 3 ✅

---

## מטרה

כל tenant מוגבל לפי ה-plan שלו. כל פעולה רלוונטית בודקת limit. כל feature שלא כלול ב-plan — מוסתר מה-UI. Admin יכול לנהל plans ולדרוס features per-tenant. בנוסף: last_active מתעדכן. בסוף הפאזה: plan system חי — `checkPlanLimit()` ו-`isFeatureEnabled()` הם contracts שכל מודול עתידי קורא.

---

## 1. check_plan_limit() RPC

### 1.1 חתימה

```sql
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_tenant_id UUID,
  p_resource TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_limits JSONB;
  v_limit INTEGER;
  v_current INTEGER;
  v_limit_key TEXT;
BEGIN
  -- Get plan limits for tenant
  SELECT p.limits INTO v_plan_limits
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;

  IF v_plan_limits IS NULL THEN
    -- No plan assigned → allow (fail-safe)
    RETURN jsonb_build_object(
      'allowed', true, 'current', 0, 'limit', -1,
      'remaining', -1, 'message', NULL
    );
  END IF;

  -- Map resource to limit key
  v_limit_key := 'max_' || p_resource;
  v_limit := (v_plan_limits->>v_limit_key)::integer;

  -- -1 = unlimited
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true, 'current', 0, 'limit', -1,
      'remaining', -1, 'message', NULL
    );
  END IF;

  -- Count current usage
  v_current := CASE p_resource
    WHEN 'employees' THEN
      (SELECT COUNT(*) FROM employees WHERE tenant_id = p_tenant_id)
    WHEN 'inventory' THEN
      (SELECT COUNT(*) FROM inventory WHERE tenant_id = p_tenant_id AND is_deleted = false)
    WHEN 'suppliers' THEN
      (SELECT COUNT(*) FROM suppliers WHERE tenant_id = p_tenant_id AND active = true)
    WHEN 'documents_per_month' THEN
      (SELECT COUNT(*) FROM supplier_documents
       WHERE tenant_id = p_tenant_id
       AND created_at >= date_trunc('month', now()))
    WHEN 'storage_mb' THEN
      0  -- placeholder — actual storage calculation in future
    WHEN 'ocr_scans_monthly' THEN
      (SELECT COUNT(*) FROM ocr_extractions
       WHERE tenant_id = p_tenant_id
       AND created_at >= date_trunc('month', now()))
    WHEN 'branches' THEN
      1  -- single branch for now — multi-branch in future module
    ELSE
      0
  END;

  RETURN jsonb_build_object(
    'allowed', v_current < v_limit,
    'current', v_current,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_current, 0),
    'message', CASE
      WHEN v_current >= v_limit THEN
        'הגעת למגבלה (' || v_current || '/' || v_limit || ')'
      ELSE NULL
    END
  );
END;
$$;
```

### 1.2 Resources

| resource key | limit key in JSONB | counted from |
|-------------|-------------------|-------------|
| `employees` | max_employees | employees WHERE tenant_id |
| `inventory` | max_inventory | inventory WHERE tenant_id AND NOT is_deleted |
| `suppliers` | max_suppliers | suppliers WHERE tenant_id AND active |
| `documents_per_month` | max_documents_per_month | supplier_documents WHERE current month |
| `storage_mb` | max_storage_mb | placeholder (0) — future |
| `ocr_scans_monthly` | max_ocr_scans_monthly | ocr_extractions WHERE current month |
| `branches` | max_branches | hardcoded 1 — multi-branch future |

### 1.3 Return value

```json
{
  "allowed": true,
  "current": 45,
  "limit": 100,
  "remaining": 55,
  "message": null
}
```

```json
{
  "allowed": false,
  "current": 5,
  "limit": 5,
  "remaining": 0,
  "message": "הגעת למגבלה (5/5)"
}
```

---

## 2. is_feature_enabled() RPC

```sql
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_tenant_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_features JSONB;
  v_override JSONB;
  v_override_value BOOLEAN;
BEGIN
  -- 1. Check tenant-level override first
  SELECT value->>p_feature INTO v_override_value
  FROM tenant_config
  WHERE tenant_id = p_tenant_id AND key = 'feature_overrides';

  -- If override exists → use it
  IF v_override_value IS NOT NULL THEN
    RETURN v_override_value;
  END IF;

  -- 2. Fall back to plan features
  SELECT p.features INTO v_plan_features
  FROM tenants t
  JOIN plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;

  IF v_plan_features IS NULL THEN
    RETURN true;  -- fail-safe: no plan → allow
  END IF;

  -- 3. Check feature in plan
  IF v_plan_features ? p_feature THEN
    RETURN (v_plan_features->>p_feature)::boolean;
  END IF;

  -- 4. Feature not defined → allow (fail-safe)
  RETURN true;
END;
$$;
```

### 2.1 Features

```
inventory, purchasing, goods_receipts, stock_count, supplier_debt,
ocr, ai_alerts, shipments, access_sync, image_studio,
storefront, b2b_marketplace, api_access, white_label,
custom_domain, advanced_reports, whatsapp
```

**17 features.** (לא 18 — ספירה מדויקת מה-seed data בפאזה 1)

### 2.2 Override Priority

```
tenant_config.feature_overrides → plan.features → default true (fail-safe)
```

Admin יכול לפתוח feature לtenant ספציפי גם אם ה-plan לא כולל:
```sql
-- Example: enable OCR for a basic tenant
UPDATE tenant_config SET value = '{"ocr": true}'
WHERE tenant_id = '...' AND key = 'feature_overrides';
```

---

## 3. shared/js/plan-helpers.js — JS Client

### 3.1 Contract

```javascript
/**
 * Check if tenant can add more of a resource.
 * @param {string} resource — 'employees', 'inventory', 'suppliers', etc.
 * @returns {Promise<{allowed: boolean, current: number, limit: number, remaining: number, message: string|null}>}
 */
async function checkPlanLimit(resource) { ... }

/**
 * Check if a feature is enabled for current tenant.
 * @param {string} feature — 'ocr', 'ai_alerts', 'shipments', etc.
 * @returns {Promise<boolean>}
 */
async function isFeatureEnabled(feature) { ... }

/**
 * Get all plan limits for current tenant.
 * @returns {Promise<object>} — full limits JSONB
 */
async function getPlanLimits() { ... }

/**
 * Get all plan features for current tenant.
 * @returns {Promise<object>} — full features JSONB
 */
async function getPlanFeatures() { ... }
```

### 3.2 Implementation

```javascript
// === shared/js/plan-helpers.js ===
// Plan checking helpers for ERP pages
// Uses: sb (from shared.js), getTenantId() (from shared.js)

// --- Cache ---
let _planCache = null;
let _planCacheTime = 0;
const PLAN_CACHE_TTL = 30000; // 30 seconds

async function _getPlanData() {
  const now = Date.now();
  if (_planCache && (now - _planCacheTime) < PLAN_CACHE_TTL) {
    return _planCache;
  }

  const tenantId = getTenantId();
  const { data, error } = await sb.from('tenants')
    .select('plan_id, plans(limits, features)')
    .eq('id', tenantId)
    .single();

  if (error || !data?.plans) {
    console.warn('plan-helpers: failed to load plan, fail-safe allowing');
    return { limits: {}, features: {} };
  }

  _planCache = { limits: data.plans.limits, features: data.plans.features };
  _planCacheTime = now;
  return _planCache;
}

async function checkPlanLimit(resource) {
  try {
    const tenantId = getTenantId();
    const { data, error } = await sb.rpc('check_plan_limit', {
      p_tenant_id: tenantId,
      p_resource: resource
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('checkPlanLimit failed, fail-safe allowing:', err);
    return { allowed: true, current: 0, limit: -1, remaining: -1, message: null };
  }
}

async function isFeatureEnabled(feature) {
  try {
    const tenantId = getTenantId();
    const { data, error } = await sb.rpc('is_feature_enabled', {
      p_tenant_id: tenantId,
      p_feature: feature
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('isFeatureEnabled failed, fail-safe allowing:', err);
    return true;  // fail-safe
  }
}

async function getPlanLimits() {
  const plan = await _getPlanData();
  return plan.limits;
}

async function getPlanFeatures() {
  const plan = await _getPlanData();
  return plan.features;
}

// Invalidate cache (call after plan change)
function invalidatePlanCache() {
  _planCache = null;
  _planCacheTime = 0;
}
```

### 3.3 Dependencies

plan-helpers.js **depends on:**
- `sb` (Supabase client from shared.js)
- `getTenantId()` (from shared.js)

**Load order in ERP pages:**
```html
<script src="js/shared.js"></script>        <!-- sb, getTenantId -->
<script src="shared/js/plan-helpers.js"></script>  <!-- checkPlanLimit, isFeatureEnabled -->
```

**⚠️ admin.html does NOT load plan-helpers.js** — admin uses RPCs directly via AdminDB.

---

## 4. Integration Points — Where Limits Are Checked

### 4.1 checkPlanLimit() — blocks creation

| Action | File | resource | When |
|--------|------|----------|------|
| הוספת עובד | modules/permissions/employee-list.js | `employees` | Before INSERT |
| הוספת פריט מלאי | modules/inventory/inventory-entry.js | `inventory` | Before INSERT |
| הוספת ספק | modules/brands/suppliers.js | `suppliers` | Before INSERT |
| יצירת מסמך ספק | modules/debt/debt-doc-new.js | `documents_per_month` | Before INSERT |
| OCR scan | modules/debt/ai/ai-ocr.js | `ocr_scans_monthly` | Before scan |

**Pattern for integration:**

```javascript
// Example: Before adding employee
async function addEmployee() {
  const limit = await checkPlanLimit('employees');
  if (!limit.allowed) {
    Toast.warning(limit.message || 'הגעת למגבלה');
    return;
  }
  // ... proceed with creation
}
```

**⚠️ Phase 4 scope:** Add checkPlanLimit calls to ALL 5 integration points above. Each is ~5 lines added to an existing function.

### 4.2 isFeatureEnabled() — hides UI

| Feature | UI Element | File | What happens when disabled |
|---------|-----------|------|---------------------------|
| `ocr` | OCR buttons/tabs | debt pages | Button hidden |
| `ai_alerts` | AI alerts tab | debt pages | Tab hidden |
| `shipments` | Shipments module card | index.html | Card hidden |
| `access_sync` | Access sync tab | inventory.html | Tab hidden |
| `image_studio` | Remove BG button | inventory-images.js | Button hidden |
| `stock_count` | Stock count card | index.html | Card hidden |
| `supplier_debt` | Debt module card | index.html | Card hidden |
| `advanced_reports` | Reports tab | future | — |

**Pattern for integration:**

```javascript
// Example: On page load, hide disabled features
async function applyFeatureFlags() {
  const features = await getPlanFeatures();

  document.querySelectorAll('[data-feature]').forEach(el => {
    const feature = el.dataset.feature;
    if (features[feature] === false) {
      el.style.display = 'none';
      // Or: el.classList.add('feature-disabled');
    }
  });
}
```

**HTML markup:**
```html
<div class="module-card" data-feature="shipments">
  <h3>משלוחים</h3>
</div>
```

**⚠️ Phase 4 scope:** Add `data-feature` attributes to module cards in index.html + call `applyFeatureFlags()` on page load. Feature-specific hiding in sub-pages (OCR, AI alerts) = mark with data-feature, apply on page init.

### 4.3 Plan limit toast vs. feature hidden

Two different UX patterns:

- **checkPlanLimit** = user tries to create something → gets **toast/modal** saying "הגעת למגבלה (5/5). שדרגו תוכנית"
- **isFeatureEnabled** = UI element **doesn't appear** at all. User doesn't know it exists unless they see the plan comparison page (future)

**⚠️ Downgrade behavior:** If tenant downgrades from premium to basic:
- **Existing data stays.** Nothing is deleted.
- **New creation blocked.** If they have 15 employees and basic allows 5, they can't add #16 but existing 15 remain.
- **Feature hidden.** If OCR was enabled and now disabled, OCR buttons disappear but past OCR extractions remain readable.

---

## 5. Feature Override UI — Admin Panel

### 5.1 Location

Tab 1 (פרטים) in tenant detail slide-in panel → new section below Usage stats.

### 5.2 Layout

```
┌──────────────────────────────────┐
│ Feature Overrides                │
│                                  │
│ דריסות פיצ'רים (מעל ה-plan)      │
│                                  │
│ OCR          [plan: ✅] [override: —]  │
│ AI Alerts    [plan: ❌] [override: ✅]  │
│ Shipments    [plan: ✅] [override: —]  │
│ Access Sync  [plan: ❌] [override: —]  │
│ ...                              │
│                                  │
│ [שמור דריסות]                     │
└──────────────────────────────────┘
```

**Per-feature row:**
- Feature name (Hebrew)
- Plan value: ✅ enabled / ❌ disabled (read-only, from plan)
- Override: toggle — (none) / ✅ force-enable / ❌ force-disable
- If override = none → follows plan

### 5.3 Save

```javascript
// Update tenant_config feature_overrides
await AdminDB.update_or_insert('tenant_config', {
  tenant_id: tenantId,
  key: 'feature_overrides',
  value: { ocr: true, ai_alerts: true }  // only overridden features
});
```

**⚠️ super_admin only.**

---

## 6. Plans CRUD — Admin Panel "הגדרות" Tab

### 6.1 Activation

Phase 3 left "הגדרות" tab as disabled placeholder. Phase 4 activates it.

### 6.2 Layout

```
┌──────────────────────────────────────────────────┐
│ תוכניות מנוי                          [➕ תוכנית חדשה] │
├──────────────────────────────────────────────────┤
│ שם       │ עובדים │ מלאי   │ ספקים │ OCR  │ מחיר/חודש │ פעיל │
│ ─────────┼────────┼────────┼───────┼──────┼───────────┼──────│
│ בסיסי    │ 5      │ 1,000  │ 20    │ 20   │ —         │ ✅   │
│ פרימיום  │ 20     │ 10,000 │ 100   │ 200  │ —         │ ✅   │
│ ארגוני   │ ∞      │ ∞      │ ∞     │ ∞    │ —         │ ✅   │
└──────────────────────────────────────────────────┘
```

### 6.3 Plan Edit (click row → modal)

```
┌──────────────────────────────────┐
│ עריכת תוכנית: פרימיום             │
├──────────────────────────────────┤
│ שם פנימי:     premium            │
│ שם תצוגה:     פרימיום             │
│                                  │
│ מגבלות:                          │
│  עובדים:      [20___]            │
│  פריטי מלאי:  [10000_]           │
│  ספקים:       [100__]            │
│  מסמכים/חודש: [500__]            │
│  אחסון MB:    [5000_]            │
│  OCR/חודש:    [200__]            │
│  סניפים:      [3____]            │
│                                  │
│ (-1 = ללא הגבלה)                 │
│                                  │
│ פיצ'רים:                         │
│  ☑ מלאי        ☑ רכש            │
│  ☑ קבלות       ☑ ספירת מלאי     │
│  ☑ חובות ספקים  ☑ OCR           │
│  ☑ התראות AI   ☑ משלוחים       │
│  ☑ סנכרון      ☑ סטודיו תמונות  │
│  ☑ חנות        ☐ B2B           │
│  ☐ API         ☐ White Label   │
│  ☐ דומיין      ☑ דוחות מתקדמים  │
│  ☑ WhatsApp                      │
│                                  │
│ מחיר:                            │
│  חודשי: [___] ₪    שנתי: [___] ₪│
│                                  │
│ [ביטול]              [שמור]       │
└──────────────────────────────────┘
```

### 6.4 Plan CRUD Operations

| Action | Who | How |
|--------|-----|-----|
| View list | all admins | plans table, sorted by sort_order |
| Create plan | super_admin | Modal form → INSERT plans |
| Edit plan | super_admin | Modal form → UPDATE plans |
| Deactivate plan | super_admin | Set is_active=false (no delete — tenants may reference) |

**⚠️ Cannot delete plan** — tenants reference it. Can only deactivate (is_active=false). Deactivated plans don't appear in provisioning wizard dropdown.

**⚠️ Plan edit = affects all tenants immediately.** Changing max_employees from 20 to 10 → all premium tenants instantly get the new limit. Modal should warn: "שינוי זה ישפיע על X tenants."

### 6.5 admin-plans.js

```javascript
// === admin-plans.js ===
// Plans CRUD UI in admin "הגדרות" tab

async function loadPlansTab() {
  // Load all plans → render table
}

async function openPlanEditor(planId = null) {
  // Modal with limits inputs + feature checkboxes
  // planId = null → new plan
  // planId = UUID → edit existing
}

async function savePlan(planId, data) {
  if (planId) {
    // Count affected tenants
    const count = ...; // query tenants WHERE plan_id = planId
    // Warn if > 0
    await AdminDB.update('plans', planId, data);
    logAdminAction('plan.update', null, { plan_id: planId, changes: data });
  } else {
    await AdminDB.insert('plans', data);
    logAdminAction('plan.create', null, { plan: data });
  }
  Toast.success('התוכנית נשמרה');
  loadPlansTab();
}
```

---

## 7. last_active — Auth Flow Update

### 7.1 Change in pin-auth Edge Function

```typescript
// supabase/functions/pin-auth/index.ts
// After successful PIN verification, before returning JWT:

await supabaseAdmin.from('tenants')
  .update({ last_active: new Date().toISOString() })
  .eq('id', tenantId);
```

**One line.** Runs on every successful login. Updates tenants.last_active.

### 7.2 Verification

- Dashboard shows "פעילות אחרונה: לפני X" with real values
- Each login updates the timestamp

---

## 8. קבצים חדשים / משתנים

| קובץ | פעולה | שורות (הערכה) | מה |
|-------|-------|---------------|-----|
| `shared/js/plan-helpers.js` | NEW | ~100 | checkPlanLimit, isFeatureEnabled, cache, getPlanLimits, getPlanFeatures |
| `modules/admin-platform/admin-plans.js` | NEW | ~200 | Plans CRUD UI, editor modal |
| `admin.html` | MODIFY | +~10 | Load plan-helpers.js (for future), admin-plans.js, activate settings tab |
| `admin-app.js` | MODIFY | +~10 | Settings tab routing |
| `admin-tenant-detail.js` | MODIFY | +~50 | Feature overrides section in Tab 1 |
| `index.html` | MODIFY | +~15 | data-feature attributes on module cards + applyFeatureFlags call + load plan-helpers.js |
| `inventory.html` | MODIFY | +~5 | data-feature on relevant tabs + load plan-helpers.js |
| `suppliers-debt.html` | MODIFY | +~5 | data-feature on OCR/AI elements + load plan-helpers.js |
| `modules/permissions/employee-list.js` | MODIFY | +~5 | checkPlanLimit('employees') before add |
| `modules/inventory/inventory-entry.js` | MODIFY | +~5 | checkPlanLimit('inventory') before add |
| `modules/brands/suppliers.js` | MODIFY | +~5 | checkPlanLimit('suppliers') before add |
| `modules/debt/debt-doc-new.js` | MODIFY | +~5 | checkPlanLimit('documents_per_month') before create |
| `modules/debt/ai/ai-ocr.js` | MODIFY | +~5 | checkPlanLimit('ocr_scans_monthly') before scan |
| `supabase/functions/pin-auth/index.ts` | MODIFY | +1 | last_active update |
| SQL: check_plan_limit() RPC | Dashboard | | |
| SQL: is_feature_enabled() RPC | Dashboard | | |

**סה"כ: 2 JS חדשים + ~12 JS modified + 1 Edge Function modified + 2 RPCs**

---

## 9. סדר ביצוע (תת-פאזות)

| תת-פאזה | מה | סוג | הערות |
|----------|-----|------|-------|
| 4a | RPCs: check_plan_limit, is_feature_enabled | SQL Dashboard | Core RPCs |
| 4b | shared/js/plan-helpers.js | Claude Code | JS wrapper + cache |
| 4c | Integration: checkPlanLimit in 5 files | Claude Code | ~5 lines each |
| 4d | Integration: isFeatureEnabled in index.html + pages | Claude Code | data-feature attrs |
| 4e | admin-plans.js — Plans CRUD UI | Claude Code | Settings tab |
| 4f | Feature overrides UI in tenant detail | Claude Code | admin-tenant-detail.js |
| 4g | last_active in pin-auth Edge Function | Claude Code | 1 line |
| 4h | Verification | Browser testing | Full checklist |

---

## 10. Verification Checklist

### Plan Limits:
- [ ] Basic tenant: add employee #6 → "הגעת למגבלה (5/5)" toast
- [ ] Basic tenant: add inventory item #1001 → blocked
- [ ] Basic tenant: add supplier #21 → blocked
- [ ] Basic tenant: create document #51 this month → blocked
- [ ] Basic tenant: OCR scan #21 this month → blocked
- [ ] Enterprise tenant: all above → no limits (unlimited)
- [ ] Premium tenant: limits match plan values
- [ ] Fail-safe: if RPC fails → creation allowed (not blocked)
- [ ] checkPlanLimit returns correct { allowed, current, limit, remaining, message }

### Feature Flags:
- [ ] Basic tenant: shipments card visible (true in basic)
- [ ] Basic tenant: AI alerts hidden (false in basic)
- [ ] Basic tenant: access_sync hidden (false in basic)
- [ ] Basic tenant: image_studio hidden (false in basic)
- [ ] Enterprise tenant: all features visible
- [ ] data-feature attributes on index.html module cards
- [ ] isFeatureEnabled fail-safe: error → feature shown (not hidden)

### Feature Overrides:
- [ ] Admin panel: override section shows in tenant detail
- [ ] Override OCR=true for basic tenant → OCR visible in ERP
- [ ] Remove override → falls back to plan (OCR hidden again)
- [ ] super_admin only can save overrides

### Plans CRUD:
- [ ] הגדרות tab active (was disabled)
- [ ] Plans table shows 3 plans with limits summary
- [ ] Click plan → edit modal with limits + features
- [ ] Change limit → warning "ישפיע על X tenants"
- [ ] Save plan → immediate effect
- [ ] Create new plan → appears in list + provisioning wizard
- [ ] Deactivate plan → not in provisioning wizard dropdown
- [ ] super_admin only — support/viewer see list but can't edit
- [ ] Audit log: plan.create, plan.update entries

### Downgrade:
- [ ] Tenant with 15 employees downgrades to basic (max 5)
- [ ] Existing 15 employees remain (no deletion)
- [ ] Adding employee #16 → blocked
- [ ] Feature disabled after downgrade → UI hidden, data preserved

### last_active:
- [ ] Login to Prizma → tenants.last_active updates
- [ ] Dashboard shows real "פעילות אחרונה" values
- [ ] Login to Demo → different timestamp

### Backward Compatibility:
- [ ] All 6 ERP pages load with zero console errors
- [ ] plan-helpers.js loaded but doesn't block page if plan is missing
- [ ] Existing tenants (enterprise) → zero limits, all features
- [ ] admin.html: all Phase 1-3 functionality works
- [ ] Cache invalidation: plan change in admin → reflected in ERP within 30 seconds

### plan-helpers.js Contract:
- [ ] checkPlanLimit('employees') returns { allowed, current, limit, remaining, message }
- [ ] isFeatureEnabled('ocr') returns boolean
- [ ] getPlanLimits() returns full limits JSONB
- [ ] getPlanFeatures() returns full features JSONB
- [ ] invalidatePlanCache() clears cache
- [ ] All functions exported globally
