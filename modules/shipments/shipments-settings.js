// shipments-settings.js — UI for editing shipment_config JSONB (field visibility, categories, step 3)
var _fsSelectedType = 'framing';
var _fsCollapsed = { fields: true, categories: true, step3: true };

var FS_TYPE_MAP = { framing: 'מסגור', return: 'זיכוי', repair: 'תיקון', delivery: 'משלוח' };
var FS_FIELD_LABELS = {
  order_number: 'מס\' הזמנה', customer_name: 'שם לקוח', customer_number: 'מס\' לקוח',
  barcode: 'ברקוד', category: 'קטגוריה', notes: 'הערות'
};
var FS_FIELD_ORDER = ['order_number', 'customer_name', 'customer_number', 'barcode', 'category', 'notes'];
var FS_STATUS_OPTIONS = [
  { val: 'required', label: 'חובה' }, { val: 'optional', label: 'אופציונלי' }, { val: 'hidden', label: 'מוסתר' }
];
var FS_STEP3_FIELDS = [
  { key: 'courier_id', label: 'חברת שליחויות' },
  { key: 'tracking_number', label: 'מספר מעקב' },
  { key: 'notes', label: 'הערות' }
];
var FS_STEP3_OPTIONS = [
  { val: 'required', label: 'חובה' }, { val: 'optional', label: 'אופציונלי' }
];

function _getDefaultConfig() {
  var fields = {};
  var types = ['framing', 'return', 'repair', 'delivery'];
  for (var i = 0; i < types.length; i++) {
    fields[types[i]] = {
      order_number: 'required', customer_name: 'required', customer_number: 'optional',
      barcode: 'optional', category: 'required', notes: 'optional'
    };
  }
  return {
    version: 1, fields: fields,
    categories: { visible: Object.keys(ENUM_MAP.shipment_category || {}), custom: [] },
    step3: { courier_id: 'optional', tracking_number: 'required', notes: 'optional' }
  };
}

function _getCfg() {
  return (window._shipmentConfig && typeof window._shipmentConfig === 'object')
    ? JSON.parse(JSON.stringify(window._shipmentConfig))
    : _getDefaultConfig();
}

// =========================================================
// INIT — called from renderSettingsTab hook
// =========================================================
function initFieldSettings() {
  var el = $('field-settings-container');
  if (!el) return;
  var html = '<div style="border-top:1px solid var(--g200);margin:18px 0 14px"></div>' +
    '<div style="font-weight:700;font-size:.95rem;color:var(--primary);margin-bottom:12px">הגדרות שדות ארגז</div>' +
    _renderSection('fields', 'שדות לפי סוג ארגז', 'fs-fields-body') +
    _renderSection('categories', 'קטגוריות', 'fs-categories-body') +
    _renderSection('step3', 'הגדרות שלב 3', 'fs-step3-body') +
    '<div class="wiz-btns" style="margin-top:14px">' +
    '<button class="btn btn-p" onclick="saveFieldConfig()">&#128190; שמור הגדרות שדות</button></div>';
  el.innerHTML = html;
  if (!_fsCollapsed.fields) renderFieldsPerType(_fsSelectedType);
  if (!_fsCollapsed.categories) renderCategoriesSection();
  if (!_fsCollapsed.step3) renderStep3Section();
}

function _renderSection(key, title, bodyId) {
  var arrow = _fsCollapsed[key] ? '&#9654;' : '&#9660;';
  return '<div class="cm-setting-row" style="margin-bottom:8px">' +
    '<div onclick="toggleFsSection(\'' + key + '\')" style="cursor:pointer;display:flex;align-items:center;gap:6px">' +
    '<span id="fs-arrow-' + key + '" style="font-size:.7rem">' + arrow + '</span>' +
    '<span style="font-weight:600;font-size:.88rem">' + title + '</span></div>' +
    '<div id="' + bodyId + '" style="' + (_fsCollapsed[key] ? 'display:none' : '') + '"></div></div>';
}

function toggleFsSection(key) {
  _fsCollapsed[key] = !_fsCollapsed[key];
  var body = $(key === 'fields' ? 'fs-fields-body' : key === 'categories' ? 'fs-categories-body' : 'fs-step3-body');
  var arrow = $('fs-arrow-' + key);
  if (!body) return;
  body.style.display = _fsCollapsed[key] ? 'none' : '';
  if (arrow) arrow.innerHTML = _fsCollapsed[key] ? '&#9654;' : '&#9660;';
  if (!_fsCollapsed[key]) {
    if (key === 'fields') renderFieldsPerType(_fsSelectedType);
    else if (key === 'categories') renderCategoriesSection();
    else renderStep3Section();
  }
}

// =========================================================
// SUB-SECTION 1: Fields per box type
// =========================================================
function renderFieldsPerType(type) {
  _fsSelectedType = type;
  var body = $('fs-fields-body');
  if (!body) return;
  var cfg = _getCfg();
  var typeFields = (cfg.fields && cfg.fields[type]) ? cfg.fields[type] : {};

  // Type selector buttons
  var html = '<div style="display:flex;gap:6px;margin:10px 0">';
  var types = ['framing', 'return', 'repair', 'delivery'];
  for (var t = 0; t < types.length; t++) {
    var sel = types[t] === type ? ' style="background:#e8eeff;border-color:var(--primary);font-weight:600"' : '';
    html += '<button class="btn-sm"' + sel + ' onclick="renderFieldsPerType(\'' + types[t] + '\')">' +
      FS_TYPE_MAP[types[t]] + '</button>';
  }
  html += '</div>';

  // Standard fields table
  html += '<table class="cm-table"><thead><tr><th>שדה</th><th>סטטוס</th></tr></thead><tbody>';
  for (var f = 0; f < FS_FIELD_ORDER.length; f++) {
    var key = FS_FIELD_ORDER[f];
    var val = typeFields[key] || 'optional';
    if (typeof val === 'object') val = val.visible ? 'optional' : 'hidden';
    html += '<tr><td>' + FS_FIELD_LABELS[key] + '</td><td>' +
      _statusSelect('fs-f-' + type + '-' + key, val) + '</td></tr>';
  }
  html += '</tbody></table>';

  // Custom fields (1-3)
  html += '<div style="font-size:.82rem;font-weight:600;color:var(--g600);margin:10px 0 6px">שדות מותאמים</div>';
  for (var c = 1; c <= 3; c++) {
    var custom = typeFields['custom_' + c];
    var cLabel = (custom && custom.label) ? custom.label : '';
    var cVisible = custom ? !!custom.visible : false;
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span style="font-size:.82rem;color:var(--g500);min-width:70px">שדה מותאם ' + c + '</span>' +
      '<input type="text" id="fs-custom-' + type + '-' + c + '-label" class="wiz-input" ' +
      'style="max-width:140px;font-size:.82rem" placeholder="תווית..." value="' + escapeHtml(cLabel) + '">' +
      '<label style="font-size:.82rem;display:flex;align-items:center;gap:4px;cursor:pointer">' +
      '<input type="checkbox" id="fs-custom-' + type + '-' + c + '-vis"' + (cVisible ? ' checked' : '') + '>' +
      ' פעיל</label></div>';
  }
  body.innerHTML = html;
}

function _statusSelect(id, current) {
  var h = '<select id="' + id + '" class="wiz-input" style="max-width:120px;font-size:.82rem">';
  for (var i = 0; i < FS_STATUS_OPTIONS.length; i++) {
    var o = FS_STATUS_OPTIONS[i];
    h += '<option value="' + o.val + '"' + (current === o.val ? ' selected' : '') + '>' + o.label + '</option>';
  }
  return h + '</select>';
}

// =========================================================
// SUB-SECTION 2: Categories
// =========================================================
function renderCategoriesSection() {
  var body = $('fs-categories-body');
  if (!body) return;
  var cfg = _getCfg();
  var allCats = ENUM_MAP.shipment_category || {};
  var visibleList = (cfg.categories && cfg.categories.visible) ? cfg.categories.visible : Object.keys(allCats);
  var customList = (cfg.categories && cfg.categories.custom) ? cfg.categories.custom : [];

  // Built-in categories
  var html = '<div style="margin:10px 0">';
  var catKeys = Object.keys(allCats);
  for (var i = 0; i < catKeys.length; i++) {
    var he = catKeys[i];
    var en = allCats[he];
    var chk = visibleList.indexOf(en) >= 0 ? ' checked' : '';
    html += '<label style="display:flex;align-items:center;gap:6px;font-size:.85rem;margin-bottom:4px;cursor:pointer">' +
      '<input type="checkbox" class="fs-cat-chk" data-key="' + en + '"' + chk + '> ' + he + '</label>';
  }
  html += '</div>';

  // Custom categories
  html += '<div style="font-size:.82rem;font-weight:600;color:var(--g600);margin:8px 0 6px">קטגוריות מותאמות</div>' +
    '<div id="fs-custom-cats">';
  for (var c = 0; c < customList.length; c++) {
    html += _customCatRow(c, customList[c]);
  }
  html += '</div><button class="btn-sm" style="margin-top:6px" onclick="addCustomCategory()">+ הוסף קטגוריה</button>';
  body.innerHTML = html;
}

function _customCatRow(idx, cat) {
  return '<div class="fs-custom-cat-row" style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
    '<input type="text" class="wiz-input fs-cc-label" style="max-width:140px;font-size:.82rem" placeholder="שם בעברית" ' +
    'value="' + escapeHtml(cat.label_he || '') + '" data-idx="' + idx + '">' +
    '<button class="btn-sm" style="color:#c00" onclick="removeCustomCategory(' + idx + ')">&times;</button></div>';
}

function addCustomCategory() {
  var container = $('fs-custom-cats');
  if (!container) return;
  var rows = container.querySelectorAll('.fs-custom-cat-row');
  var idx = rows.length;
  var div = document.createElement('div');
  div.innerHTML = _customCatRow(idx, {});
  container.appendChild(div.firstChild);
}

function removeCustomCategory(idx) {
  var container = $('fs-custom-cats');
  if (!container) return;
  var rows = container.querySelectorAll('.fs-custom-cat-row');
  if (rows[idx]) rows[idx].remove();
  // Re-index remaining rows
  var remaining = container.querySelectorAll('.fs-custom-cat-row');
  for (var i = 0; i < remaining.length; i++) {
    remaining[i].querySelector('.fs-cc-label').setAttribute('data-idx', i);
  }
}

// =========================================================
// SUB-SECTION 3: Step 3 settings
// =========================================================
function renderStep3Section() {
  var body = $('fs-step3-body');
  if (!body) return;
  var cfg = _getCfg();
  var s3 = cfg.step3 || {};

  var html = '<table class="cm-table" style="margin-top:10px"><thead><tr><th>שדה</th><th>סטטוס</th></tr></thead><tbody>';
  for (var i = 0; i < FS_STEP3_FIELDS.length; i++) {
    var f = FS_STEP3_FIELDS[i];
    var val = s3[f.key] || 'optional';
    var h = '<select id="fs-s3-' + f.key + '" class="wiz-input" style="max-width:120px;font-size:.82rem">';
    for (var j = 0; j < FS_STEP3_OPTIONS.length; j++) {
      var o = FS_STEP3_OPTIONS[j];
      h += '<option value="' + o.val + '"' + (val === o.val ? ' selected' : '') + '>' + o.label + '</option>';
    }
    h += '</select>';
    html += '<tr><td>' + f.label + '</td><td>' + h + '</td></tr>';
  }
  html += '</tbody></table>';
  body.innerHTML = html;
}

// =========================================================
// COLLECT — build config object from UI
// =========================================================
function collectFieldConfig() {
  var cfg = _getCfg();
  cfg.version = 1;

  // Fields per type
  var types = ['framing', 'return', 'repair', 'delivery'];
  if (!cfg.fields) cfg.fields = {};
  for (var t = 0; t < types.length; t++) {
    var tp = types[t];
    if (!cfg.fields[tp]) cfg.fields[tp] = {};
    // Standard fields — only read if selects exist (type was rendered)
    for (var f = 0; f < FS_FIELD_ORDER.length; f++) {
      var key = FS_FIELD_ORDER[f];
      var sel = $('fs-f-' + tp + '-' + key);
      if (sel) cfg.fields[tp][key] = sel.value;
    }
    // Custom fields
    for (var c = 1; c <= 3; c++) {
      var lInput = $('fs-custom-' + tp + '-' + c + '-label');
      var vInput = $('fs-custom-' + tp + '-' + c + '-vis');
      if (lInput) {
        var label = lInput.value.trim();
        cfg.fields[tp]['custom_' + c] = label
          ? { label: label, visible: !!vInput.checked }
          : null;
      }
    }
  }

  // Categories
  if (!cfg.categories) cfg.categories = { visible: [], custom: [] };
  var checkboxes = document.querySelectorAll('.fs-cat-chk');
  if (checkboxes.length) {
    cfg.categories.visible = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) cfg.categories.visible.push(checkboxes[i].getAttribute('data-key'));
    }
  }
  var ccLabels = document.querySelectorAll('.fs-cc-label');
  if (ccLabels.length || document.getElementById('fs-custom-cats')) {
    cfg.categories.custom = [];
    for (var j = 0; j < ccLabels.length; j++) {
      var lb = ccLabels[j].value.trim();
      if (lb) {
        cfg.categories.custom.push({ key: 'custom_' + (j + 1), label_he: lb });
      }
    }
  }

  // Step 3
  if (!cfg.step3) cfg.step3 = {};
  for (var s = 0; s < FS_STEP3_FIELDS.length; s++) {
    var s3sel = $('fs-s3-' + FS_STEP3_FIELDS[s].key);
    if (s3sel) cfg.step3[FS_STEP3_FIELDS[s].key] = s3sel.value;
  }

  return cfg;
}

// =========================================================
// SAVE
// =========================================================
async function saveFieldConfig() {
  var cfg = collectFieldConfig();

  // Validate: at least one category visible
  var totalCats = (cfg.categories.visible || []).length + (cfg.categories.custom || []).length;
  if (totalCats < 1) { toast('חובה לפחות קטגוריה אחת פעילה', 'e'); return; }

  var tid = getTenantId();
  var { error } = await sb.from(T.TENANTS).update({ shipment_config: cfg }).eq('id', tid);
  if (error) { toast('שגיאה בשמירה: ' + error.message, 'e'); return; }

  window._shipmentConfig = cfg;
  toast('הגדרות שדות ארגז נשמרו');
}
