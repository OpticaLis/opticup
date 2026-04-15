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

/**
 * Render a graceful "feature locked" state in the page body.
 * Replaces page content with a centred lock card and upgrade prompt.
 * Call when isFeatureEnabled() returns false before loading page data.
 * @param {string} featureName — e.g. 'cms_studio', 'cms_landing_pages'
 */
function renderFeatureLockedState(featureName) {
  const labels = {
    cms_studio:         'Storefront Studio',
    cms_custom_blocks:  'Custom Block Builder',
    cms_landing_pages:  'Landing Page Editor',
    cms_ai_tools:       'AI Content & Translation Tools',
    storefront:         'Storefront Module',
    image_studio:       'Image Studio',
  };
  const label = labels[featureName] || featureName;
  const container = document.querySelector('main') || document.body;
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:60vh;gap:16px;text-align:center;padding:24px;font-family:Heebo,sans-serif;">
      <div style="font-size:3rem;">🔒</div>
      <h2 style="font-size:1.4rem;font-weight:700;color:#1a1a2e;margin:0;">${label}</h2>
      <p style="color:#6b7280;max-width:360px;line-height:1.6;margin:0;">
        תכונה זו אינה כלולה בחבילה הנוכחית שלך.
        לשדרוג והפעלת הגישה, פנה לצוות Optic Up.
      </p>
      <p style="color:#9ca3af;font-size:.85rem;margin:0;">
        Feature: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${featureName}</code>
      </p>
    </div>`;
}

// --- Global exports ---
window.checkPlanLimit = checkPlanLimit;
window.isFeatureEnabled = isFeatureEnabled;
window.getPlanLimits = getPlanLimits;
window.getPlanFeatures = getPlanFeatures;
window.invalidatePlanCache = invalidatePlanCache;
window.renderFeatureLockedState = renderFeatureLockedState;
