// === shared/js/plan-helpers.js ===
// Plan limit & feature flag helpers for ERP pages.
// Depends on: sb (from shared.js), getTenantId() (from shared.js)
// Load order: shared.js → plan-helpers.js
// NOT loaded by admin.html — admin uses RPCs directly via AdminDB.

// --- Cache ---
let _planCache = null;
let _planCacheTime = 0;
const PLAN_CACHE_TTL = 30000; // 30 seconds

/** @private Fetch and cache plan limits + features for current tenant. */
async function _getPlanData() {
  const now = Date.now();
  if (_planCache && (now - _planCacheTime) < PLAN_CACHE_TTL) return _planCache;

  try {
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
  } catch (err) {
    console.warn('plan-helpers: _getPlanData error, fail-safe allowing:', err);
    return { limits: {}, features: {} };
  }
}

/**
 * Check if tenant can add more of a resource.
 * @param {string} resource — 'employees', 'inventory', 'suppliers', 'documents_per_month', 'ocr_scans_monthly', 'storage_mb', 'branches'
 * @returns {Promise<{allowed: boolean, current: number, limit: number, remaining: number, message: string|null}>}
 */
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

/**
 * Check if a feature is enabled for current tenant.
 * @param {string} feature — 'ocr', 'ai_alerts', 'shipments', 'access_sync', 'image_studio', etc.
 * @returns {Promise<boolean>}
 */
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
    return true;
  }
}

/**
 * Get all plan limits for current tenant.
 * @returns {Promise<object>} — full limits JSONB (e.g. { max_employees: 5, max_inventory: 1000 })
 */
async function getPlanLimits() {
  const plan = await _getPlanData();
  return plan.limits;
}

/**
 * Get all plan features for current tenant.
 * @returns {Promise<object>} — full features JSONB (e.g. { ocr: true, ai_alerts: false })
 */
async function getPlanFeatures() {
  const plan = await _getPlanData();
  return plan.features;
}

/** Invalidate plan cache. Call after plan change in admin panel. */
function invalidatePlanCache() {
  _planCache = null;
  _planCacheTime = 0;
}

// --- Global exports ---
window.checkPlanLimit = checkPlanLimit;
window.isFeatureEnabled = isFeatureEnabled;
window.getPlanLimits = getPlanLimits;
window.getPlanFeatures = getPlanFeatures;
window.invalidatePlanCache = invalidatePlanCache;
