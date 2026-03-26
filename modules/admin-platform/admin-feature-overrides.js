// === admin-feature-overrides.js ===
// Feature override UI for tenant detail slide-in panel.
// Depends on: adminSb (admin-auth.js), FEATURE_LABELS (admin-plans.js),
//   hasAdminPermission (admin-auth.js), logAdminAction (admin-audit.js),
//   Toast (shared/js/toast.js)

async function renderFeatureOverrides(tenantId, planId, container) {
  if (!container) return;
  var isSuperAdmin = hasAdminPermission('super_admin');

  // 1. Load plan features
  var planFeatures = {};
  if (planId) {
    try {
      var { data, error } = await adminSb.from('plans').select('features').eq('id', planId).single();
      if (!error && data) planFeatures = data.features || {};
    } catch (_) {}
  }
  if (!planId || !Object.keys(planFeatures).length) {
    container.innerHTML = '<div style="margin-top:1rem;color:var(--color-gray-400);font-size:.8rem">לא משויכת תוכנית — אין דריסות</div>';
    return;
  }

  // 2. Load current overrides
  var overrides = {};
  try {
    var { data: cfg } = await adminSb.from('tenant_config').select('value')
      .eq('tenant_id', tenantId).eq('key', 'feature_overrides').maybeSingle();
    if (cfg && cfg.value) overrides = cfg.value;
  } catch (_) {}

  // 3. Render
  var html = '<div style="margin-top:1.25rem"><h4 style="font-size:0.9375rem;font-weight:600;color:var(--color-gray-700);margin:0 0 0.25rem">דריסות פיצ\'רים</h4>';
  html += '<div style="font-size:.75rem;color:var(--color-gray-400);margin-bottom:0.5rem">דריסה מאפשרת לפתוח/חסום פיצ\'ר מעל הגדרות התוכנית</div>';

  var labels = typeof FEATURE_LABELS !== 'undefined' ? FEATURE_LABELS : {};
  var featureKeys = Object.keys(labels);

  featureKeys.forEach(function(key) {
    var planVal = planFeatures[key] !== false;
    var overVal = overrides[key];
    var selVal = overVal === true ? 'true' : overVal === false ? 'false' : 'plan';
    var planIcon = planVal ? '✅' : '❌';

    html += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:.8rem">';
    html += '<span style="min-width:110px">' + (labels[key] || key) + '</span>';
    html += '<span style="min-width:24px;text-align:center" title="לפי תוכנית">' + planIcon + '</span>';
    if (isSuperAdmin) {
      html += '<select data-feature="' + key + '" class="fo-sel" style="font-size:.78rem;padding:2px 4px">';
      html += '<option value="plan"' + (selVal === 'plan' ? ' selected' : '') + '>לפי תוכנית</option>';
      html += '<option value="true"' + (selVal === 'true' ? ' selected' : '') + '>✅ פעיל</option>';
      html += '<option value="false"' + (selVal === 'false' ? ' selected' : '') + '>❌ חסום</option>';
      html += '</select>';
    } else {
      var display = selVal === 'true' ? '✅ דריסה: פעיל' : selVal === 'false' ? '❌ דריסה: חסום' : '—';
      html += '<span style="font-size:.78rem;color:var(--color-gray-500)">' + display + '</span>';
    }
    html += '</div>';
  });

  if (isSuperAdmin) {
    html += '<button class="btn btn-primary btn-sm" id="_btn-save-overrides" style="margin-top:0.5rem">שמור דריסות</button>';
  }
  html += '</div>';
  container.innerHTML = html;

  // 4. Save handler
  var saveBtn = container.querySelector('#_btn-save-overrides');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      var newOverrides = {};
      container.querySelectorAll('.fo-sel').forEach(function(sel) {
        var feat = sel.dataset.feature;
        if (sel.value === 'true') newOverrides[feat] = true;
        else if (sel.value === 'false') newOverrides[feat] = false;
      });
      try {
        var hasOverrides = Object.keys(newOverrides).length > 0;
        if (hasOverrides) {
          await adminSb.from('tenant_config').upsert(
            { tenant_id: tenantId, key: 'feature_overrides', value: newOverrides, updated_at: new Date().toISOString() },
            { onConflict: 'tenant_id,key' }
          );
        } else {
          await adminSb.from('tenant_config').delete()
            .eq('tenant_id', tenantId).eq('key', 'feature_overrides');
        }
        logAdminAction('tenant.feature_override', tenantId, { overrides: newOverrides });
        Toast.success('דריסות פיצ\'רים נשמרו');
      } catch (e) {
        Toast.error('שגיאה: ' + (e.message || ''));
      }
    });
  }
}

window.renderFeatureOverrides = renderFeatureOverrides;
