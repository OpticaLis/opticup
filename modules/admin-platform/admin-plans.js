// === admin-plans.js ===
// Plans CRUD UI in admin "הגדרות" tab
// Depends on: AdminDB (admin-db.js), logAdminAction (admin-audit.js),
//   hasAdminPermission (admin-auth.js), Modal (shared/js/modal-builder.js),
//   Toast (shared/js/toast.js), TableBuilder (shared/js/table-builder.js)

const FEATURE_LABELS = {
  inventory: 'מלאי', purchasing: 'רכש', goods_receipts: 'קבלות סחורה',
  stock_count: 'ספירת מלאי', supplier_debt: 'חובות ספקים', ocr: 'סריקת OCR',
  ai_alerts: 'התראות AI', shipments: 'משלוחים', access_sync: 'סנכרון Access',
  image_studio: 'סטודיו תמונות', storefront: 'חנות אונליין',
  b2b_marketplace: 'מרקטפלייס B2B', api_access: 'גישת API',
  white_label: 'White Label', custom_domain: 'דומיין מותאם',
  advanced_reports: 'דוחות מתקדמים', whatsapp: 'WhatsApp'
};

const LIMIT_FIELDS = [
  { key: 'max_employees', label: 'עובדים' },
  { key: 'max_inventory', label: 'פריטי מלאי' },
  { key: 'max_suppliers', label: 'ספקים' },
  { key: 'max_documents_per_month', label: 'מסמכים/חודש' },
  { key: 'max_storage_mb', label: 'אחסון MB' },
  { key: 'max_ocr_scans_monthly', label: 'OCR/חודש' },
  { key: 'max_branches', label: 'סניפים' }
];

let _plansTable = null;
let _plansData = [];

// =========================================================
// 1. loadPlansTab() — render plans table
// =========================================================
async function loadPlansTab() {
  var container = document.getElementById('content-settings');
  if (!container) return;

  try {
    _plansData = await AdminDB.query('plans', '*', {
      _order: { column: 'sort_order', ascending: true }
    });
  } catch (e) {
    container.innerHTML = '<div style="padding:2rem;color:var(--color-error)">שגיאה בטעינת תוכניות: ' + (e.message || '') + '</div>';
    return;
  }

  var isSuperAdmin = hasAdminPermission('super_admin');

  // Header with "new plan" button
  var header = '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 0">';
  header += '<h2 style="margin:0;font-size:1.2rem">תוכניות מנוי</h2>';
  if (isSuperAdmin) {
    header += '<button class="btn btn-primary btn-sm" onclick="openPlanEditor()">➕ תוכנית חדשה</button>';
  }
  header += '</div><div id="plans-table-container"></div>';
  container.innerHTML = header;

  // Build table
  var tableRows = _plansData.map(function(p) {
    var lim = p.limits || {};
    return {
      id: p.id,
      display_name: p.display_name || p.name,
      max_employees: _fmtLimit(lim.max_employees),
      max_inventory: _fmtLimit(lim.max_inventory),
      max_suppliers: _fmtLimit(lim.max_suppliers),
      max_ocr: _fmtLimit(lim.max_ocr_scans_monthly),
      price_monthly: p.price_monthly ? p.price_monthly + ' ₪' : '—',
      is_active: p.is_active ? '✅' : '❌'
    };
  });

  _plansTable = TableBuilder.create({
    containerId: 'plans-table-container',
    columns: [
      { key: 'display_name', label: 'שם תצוגה', type: 'text' },
      { key: 'max_employees', label: 'עובדים', type: 'text' },
      { key: 'max_inventory', label: 'מלאי', type: 'text' },
      { key: 'max_suppliers', label: 'ספקים', type: 'text' },
      { key: 'max_ocr', label: 'OCR/חודש', type: 'text' },
      { key: 'price_monthly', label: 'מחיר/חודש', type: 'text' },
      { key: 'is_active', label: 'פעיל', type: 'text' }
    ],
    onRowClick: isSuperAdmin ? function(row) { openPlanEditor(row.id); } : null,
    emptyState: { icon: '📋', text: 'אין תוכניות מנוי' },
    rowId: 'id'
  });
  _plansTable.setData(tableRows);
}

function _fmtLimit(val) {
  if (val == null || val === -1) return '∞';
  return typeof val === 'number' ? val.toLocaleString('he-IL') : String(val);
}

// =========================================================
// 2. openPlanEditor(planId) — modal for create/edit
// =========================================================
async function openPlanEditor(planId) {
  if (!hasAdminPermission('super_admin')) return;

  var plan = null;
  if (planId) {
    plan = _plansData.find(function(p) { return p.id === planId; });
    if (!plan) {
      try { plan = await AdminDB.getById('plans', planId); } catch (_) {}
    }
  }

  var isEdit = !!plan;
  var title = isEdit ? 'עריכת תוכנית: ' + _esc(plan.display_name) : 'תוכנית חדשה';
  var limits = (plan && plan.limits) || {};
  var features = (plan && plan.features) || {};

  // Build limits inputs
  var limitsHtml = '<h4 style="margin:12px 0 8px">מגבלות</h4>';
  limitsHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  LIMIT_FIELDS.forEach(function(f) {
    var val = limits[f.key] != null ? limits[f.key] : -1;
    limitsHtml += '<label style="font-size:.85rem">' + _esc(f.label) +
      '<input type="number" id="pe-' + f.key + '" value="' + val + '" style="width:100%;padding:6px;margin-top:2px"></label>';
  });
  limitsHtml += '</div>';
  limitsHtml += '<div style="font-size:.78rem;color:var(--color-gray-500);margin-top:4px">(-1 = ללא הגבלה)</div>';

  // Build feature checkboxes
  var featHtml = '<h4 style="margin:12px 0 8px">פיצ\'רים</h4>';
  featHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">';
  Object.keys(FEATURE_LABELS).forEach(function(key) {
    var checked = features[key] !== false ? ' checked' : '';
    featHtml += '<label style="font-size:.85rem;display:flex;align-items:center;gap:6px">' +
      '<input type="checkbox" id="pe-feat-' + key + '"' + checked + '>' + _esc(FEATURE_LABELS[key]) + '</label>';
  });
  featHtml += '</div>';

  var bodyHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<label style="font-size:.85rem">שם פנימי<input type="text" id="pe-name" value="' + _esc(plan ? plan.name : '') + '" style="width:100%;padding:6px;margin-top:2px"' + (isEdit ? ' readonly style="width:100%;padding:6px;margin-top:2px;background:var(--color-gray-100)"' : '') + '></label>' +
      '<label style="font-size:.85rem">שם תצוגה<input type="text" id="pe-display-name" value="' + _esc(plan ? plan.display_name : '') + '" style="width:100%;padding:6px;margin-top:2px"></label>' +
    '</div>' +
    limitsHtml + featHtml +
    '<h4 style="margin:12px 0 8px">מחיר</h4>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<label style="font-size:.85rem">חודשי (₪)<input type="number" id="pe-price-monthly" step="0.01" min="0" value="' + (plan && plan.price_monthly != null ? plan.price_monthly : '') + '" style="width:100%;padding:6px;margin-top:2px"></label>' +
      '<label style="font-size:.85rem">שנתי (₪)<input type="number" id="pe-price-yearly" step="0.01" min="0" value="' + (plan && plan.price_yearly != null ? plan.price_yearly : '') + '" style="width:100%;padding:6px;margin-top:2px"></label>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
      '<label style="font-size:.85rem">סדר מיון<input type="number" id="pe-sort-order" value="' + (plan ? plan.sort_order || 0 : 0) + '" style="width:100%;padding:6px;margin-top:2px"></label>' +
      '<label style="font-size:.85rem;display:flex;align-items:center;gap:6px;margin-top:18px"><input type="checkbox" id="pe-is-active"' + (!plan || plan.is_active !== false ? ' checked' : '') + '>פעיל</label>' +
    '</div>';

  Modal.show({
    title: title,
    body: bodyHtml,
    size: 'lg',
    buttons: [
      { label: 'ביטול', variant: 'secondary', action: 'close' },
      { label: 'שמור', variant: 'primary', onclick: function() { _savePlanFromModal(planId); } }
    ]
  });
}

function _esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// =========================================================
// 3. _savePlanFromModal(planId) — collect form + save
// =========================================================
async function _savePlanFromModal(planId) {
  var name = (document.getElementById('pe-name') || {}).value?.trim();
  var displayName = (document.getElementById('pe-display-name') || {}).value?.trim();
  if (!name) { Toast.error('שם פנימי חובה'); return; }
  if (!displayName) { Toast.error('שם תצוגה חובה'); return; }

  // Collect limits
  var limits = {};
  LIMIT_FIELDS.forEach(function(f) {
    var val = parseInt((document.getElementById('pe-' + f.key) || {}).value, 10);
    limits[f.key] = isNaN(val) ? -1 : val;
  });

  // Collect features
  var features = {};
  Object.keys(FEATURE_LABELS).forEach(function(key) {
    var cb = document.getElementById('pe-feat-' + key);
    features[key] = cb ? cb.checked : true;
  });

  var priceMonthly = parseFloat((document.getElementById('pe-price-monthly') || {}).value) || null;
  var priceYearly = parseFloat((document.getElementById('pe-price-yearly') || {}).value) || null;
  var sortOrder = parseInt((document.getElementById('pe-sort-order') || {}).value, 10) || 0;
  var isActive = document.getElementById('pe-is-active')?.checked !== false;

  var data = {
    name: name, display_name: displayName,
    limits: limits, features: features,
    price_monthly: priceMonthly, price_yearly: priceYearly,
    sort_order: sortOrder, is_active: isActive
  };

  try {
    if (planId) {
      // Editing — warn about affected tenants
      var tenants = await AdminDB.query('tenants', 'id', { plan_id: planId });
      var count = tenants ? tenants.length : 0;
      if (count > 0) {
        var proceed = await _confirmPlanChange(count);
        if (!proceed) return;
      }
      await AdminDB.update('plans', planId, data);
      logAdminAction('plan.update', null, { plan_id: planId, changes: data });
    } else {
      await AdminDB.insert('plans', data);
      logAdminAction('plan.create', null, { plan: data });
    }
    Modal.close();
    Toast.success('התוכנית נשמרה');
    loadPlansTab();
  } catch (e) {
    Toast.error('שגיאה: ' + (e.message || ''));
  }
}

function _confirmPlanChange(count) {
  return new Promise(function(resolve) {
    Modal.confirm({
      title: 'אישור שינוי',
      message: 'שינוי זה ישפיע על ' + count + ' חנויות. להמשיך?',
      confirmText: 'כן, שמור',
      cancelText: 'ביטול',
      onConfirm: function() { resolve(true); },
      onCancel: function() { resolve(false); }
    });
  });
}

// =========================================================
// 4. togglePlanActive(planId, currentState) — activate/deactivate
// =========================================================
async function togglePlanActive(planId, currentState) {
  if (!hasAdminPermission('super_admin')) return;
  try {
    if (currentState) {
      // Deactivating — check no active tenants reference this plan
      var tenants = await AdminDB.query('tenants', 'id', { plan_id: planId, status: 'active' });
      if (tenants && tenants.length > 0) {
        Toast.error('לא ניתן לכבות תוכנית עם ' + tenants.length + ' חנויות פעילות');
        return;
      }
    }
    await AdminDB.update('plans', planId, { is_active: !currentState });
    logAdminAction(currentState ? 'plan.deactivate' : 'plan.activate', null, { plan_id: planId });
    Toast.success(currentState ? 'התוכנית הושבתה' : 'התוכנית הופעלה');
    loadPlansTab();
  } catch (e) {
    Toast.error('שגיאה: ' + (e.message || ''));
  }
}

// --- Global exports ---
window.loadPlansTab = loadPlansTab;
window.openPlanEditor = openPlanEditor;
window.togglePlanActive = togglePlanActive;
