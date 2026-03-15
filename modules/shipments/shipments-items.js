// shipments-items.js — Wizard Step 2: item entry + staged return picker + status helpers
window._stagedReturns = [];

var FIELD_LABELS = {
  order_number: 'מס\' הזמנה', customer_name: 'שם לקוח', customer_number: 'מס\' לקוח',
  barcode: 'ברקוד', category: 'קטגוריה', notes: 'הערות'
};
var FIELD_IDS = {
  order_number: 'wiz-order', customer_name: 'wiz-cust', customer_number: 'wiz-custnum',
  barcode: 'wiz-barcode', category: 'wiz-category', notes: 'wiz-inotes'
};
var FIELD_ORDER = ['order_number', 'customer_name', 'customer_number', 'barcode', 'category', 'notes'];

function initWizardItems() {
  const ws = window._wizardState;
  if (!ws) return;
  const container = $('wizard-items-container');
  if (!container) return;
  container.innerHTML = '<div id="wiz-staged-picker"></div><div id="wiz-item-form"></div><div id="wiz-items-table"></div>';
  if (ws.type === 'return' && ws.supplierId) {
    loadStagedReturns(ws.supplierId);
  }
  renderItemForm(ws.type);
  renderItemsTable();
}

// --- STAGED RETURN ITEMS — load + render picker ---
async function loadStagedReturns(supplierId) {
  const pickerEl = $('wiz-staged-picker');
  if (!pickerEl) return;
  pickerEl.innerHTML = '<div class="wiz-note">טוען פריטי זיכוי...</div>';
  const tid = getTenantId();
  const { data, error } = await sb.from(T.SUP_RETURN_ITEMS)
    .select('id, return_id, inventory_id, barcode, quantity, cost_price, brand_name, model, color, size, return:supplier_returns!inner(id, supplier_id, status, return_number)')
    .eq('return.supplier_id', supplierId)
    .eq('return.status', 'ready_to_ship')
    .eq('tenant_id', tid);
  if (error) {
    pickerEl.innerHTML = '<div class="wiz-note">שגיאה בטעינת פריטי זיכוי</div>';
    window._stagedReturns = [];
    return;
  }
  window._stagedReturns = data || [];

  // Auto-check items for presetReturnIds (from sendToBox / bulkSendToBox)
  var ws = window._wizardState;
  if (ws && ws.presetReturnIds && ws.presetReturnIds.length && data && data.length) {
    for (var i = 0; i < data.length; i++) {
      var it = data[i];
      var retId = it.return ? it.return.id : it.return_id;
      if (ws.presetReturnIds.indexOf(retId) !== -1) {
        toggleStagedItem(it.id, true);
      }
    }
    // Clear preset so it doesn't re-trigger on back/forward
    ws.presetReturnIds = null;
  }

  renderStagedPicker();
}

function renderStagedPicker() {
  const pickerEl = $('wiz-staged-picker');
  if (!pickerEl) return;
  const items = window._stagedReturns;
  if (!items.length) {
    pickerEl.innerHTML = '<div class="wiz-staged-section"><div class="wiz-staged-title">פריטי זיכוי ממתינים</div>' +
      '<div class="wiz-note">אין פריטי זיכוי ממתינים לספק זה</div></div>';
    return;
  }
  const ws = window._wizardState;
  let html = '<div class="wiz-staged-section"><div class="wiz-staged-title">פריטי זיכוי ממתינים (' + items.length + ')</div>';
  html += '<div class="wiz-staged-list">';
  for (const it of items) {
    const isSelected = ws && ws.items.some(function(w) { return w.return_item_id === it.id; });
    const retNum = it.return && it.return.return_number ? it.return.return_number : '';
    html += '<label class="wiz-staged-row' + (isSelected ? ' selected' : '') + '">' +
      '<input type="checkbox" ' + (isSelected ? 'checked' : '') +
      ' onchange="toggleStagedItem(\'' + it.id + '\', this.checked)">' +
      '<span class="wiz-staged-col">' + escapeHtml(it.brand_name || '—') + ' ' + escapeHtml(it.model || '') + '</span>' +
      '<span class="wiz-staged-col">' + escapeHtml(it.barcode || '—') + '</span>' +
      '<span class="wiz-staged-col">' + (it.cost_price ? formatILS(it.cost_price) : '—') + '</span>' +
      '<span class="wiz-staged-col wiz-staged-ret">' + escapeHtml(retNum) + '</span>' +
      '</label>';
  }
  html += '</div></div>';
  pickerEl.innerHTML = html;
}

function toggleStagedItem(returnItemId, checked) {
  const ws = window._wizardState;
  if (!ws) return;
  const staged = window._stagedReturns;
  if (checked) {
    if (ws.items.some(function(w) { return w.return_item_id === returnItemId; })) return;
    const src = staged.find(function(s) { return s.id === returnItemId; });
    if (!src) return;
    ws.items.push({
      item_type: 'inventory',
      return_id: src.return ? src.return.id : src.return_id,
      return_item_id: src.id,
      inventory_id: src.inventory_id || null,
      barcode: src.barcode || null, brand: src.brand_name || null,
      model: src.model || null, size: src.size || null, color: src.color || null,
      unit_cost: src.cost_price || null, category: 'stock',
      order_number: null, customer_name: null, customer_number: null, notes: null
    });
  } else {
    ws.items = ws.items.filter(function(w) { return w.return_item_id !== returnItemId; });
  }
  renderItemsTable();
  renderStagedPicker();
  updateStep2Next();
}

// --- ITEM FORM — config-driven fields ---
function renderItemForm(type) {
  var el = $('wiz-item-form');
  if (!el) return;
  var html = '<div class="wiz-item-fields">';
  if (type === 'return') html += '<div class="wiz-manual-header">+ הוסף ידנית</div>';

  for (var i = 0; i < FIELD_ORDER.length; i++) {
    var field = FIELD_ORDER[i];
    var vis = getFieldConfig(type, field);
    if (vis === 'hidden') continue;
    var label = FIELD_LABELS[field] || field;
    var isReq = (vis === 'required');
    if (field === 'category') {
      html += categoryDropdown(isReq);
    } else {
      html += fieldRow(FIELD_IDS[field], label, 'text', isReq);
    }
  }

  // Custom fields
  for (var ci = 1; ci <= 3; ci++) {
    var custom = getCustomField(type, ci);
    if (custom && custom.visible) {
      html += fieldRow('wiz-custom-' + ci, custom.label || 'שדה מותאם ' + ci, 'text', false);
    }
  }

  html += '</div>';
  html += '<button class="btn btn-p wiz-add-btn" onclick="addItemRow()">+ הוסף שורה</button>';
  el.innerHTML = html;
}

function fieldRow(id, label, type, required) {
  var cls = required ? ' field-required' : '';
  return '<div class="wiz-field-row">' +
    '<label class="wiz-field-label' + cls + '">' + label + '</label>' +
    '<input type="' + type + '" id="' + id + '" class="wiz-input wiz-field-input" autocomplete="off">' +
    '</div>';
}

function categoryDropdown(required) {
  var keys = getVisibleCategories();
  var opts = '<option value="">— קטגוריה —</option>';
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === 'stock') continue;
    opts += '<option value="' + key + '">' + escapeHtml(getCategoryLabel(key)) + '</option>';
  }
  var cls = required ? ' field-required' : '';
  return '<div class="wiz-field-row">' +
    '<label class="wiz-field-label' + cls + '">קטגוריה</label>' +
    '<select id="wiz-category" class="wiz-input wiz-field-input">' + opts + '</select></div>';
}

// --- ADD ITEM (manual entry) with config-driven validation ---
async function addItemRow() {
  var ws = window._wizardState;
  if (!ws) return;
  var type = ws.type;

  // Read all field values
  var vals = {};
  for (var i = 0; i < FIELD_ORDER.length; i++) {
    var f = FIELD_ORDER[i];
    var el = $(FIELD_IDS[f]);
    vals[f] = el ? el.value.trim() : '';
  }

  // Validate required fields
  for (var j = 0; j < FIELD_ORDER.length; j++) {
    var field = FIELD_ORDER[j];
    var vis = getFieldConfig(type, field);
    if (vis === 'required' && !vals[field]) {
      toast('שדה חובה: ' + (FIELD_LABELS[field] || field), 'e');
      return;
    }
  }

  // At least one identifier
  if (!vals.barcode && !vals.order_number && !vals.customer_name) {
    toast('יש למלא לפחות שדה מזהה אחד (ברקוד / הזמנה / לקוח)', 'e');
    return;
  }

  // Collect custom field values
  var customData = {};
  var hasCustom = false;
  for (var ci = 1; ci <= 3; ci++) {
    var custom = getCustomField(type, ci);
    if (custom && custom.visible) {
      var cEl = $('wiz-custom-' + ci);
      var cVal = cEl ? cEl.value.trim() : '';
      if (cVal) {
        customData['custom_' + ci] = { label: custom.label, value: cVal };
        hasCustom = true;
      }
    }
  }

  var item = {
    barcode: vals.barcode || null, order_number: vals.order_number || null,
    customer_name: vals.customer_name || null, customer_number: vals.customer_number || null,
    category: vals.category || null,
    notes: hasCustom ? JSON.stringify(customData) : (vals.notes || null),
    brand: null, model: null, size: null, color: null,
    unit_cost: null, inventory_id: null, return_id: null, return_item_id: null,
    item_type: 'order', _notesText: vals.notes || null
  };
  // If notes text AND custom data, merge them
  if (hasCustom && vals.notes) {
    customData._text = vals.notes;
    item.notes = JSON.stringify(customData);
  }

  if (vals.barcode) {
    var inv = await lookupBarcode(vals.barcode);
    if (inv) {
      item.inventory_id = inv.id;
      item.brand = inv.brand?.name || null;
      item.model = inv.model || null;
      item.size = inv.size || null;
      item.color = inv.color || null;
      item.unit_cost = inv.cost_price || null;
      item.item_type = 'inventory';
      item.category = 'stock';
    } else {
      toast('ברקוד לא נמצא במלאי — נוסף כפריט ידני', 'i');
    }
  }
  if (type === 'repair' && item.item_type !== 'inventory') item.item_type = 'repair';

  ws.items.push(item);
  renderItemsTable();
  clearItemForm();
  updateStep2Next();
  toast('פריט נוסף (' + ws.items.length + ')');
}

async function lookupBarcode(barcode) {
  var { data, error } = await sb.from(T.INV)
    .select('id, barcode, brand:brands(name), model, size, color, cost_price')
    .eq('barcode', barcode).eq('tenant_id', getTenantId()).eq('is_deleted', false)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

function clearItemForm() {
  ['wiz-barcode', 'wiz-order', 'wiz-cust', 'wiz-custnum', 'wiz-inotes',
   'wiz-custom-1', 'wiz-custom-2', 'wiz-custom-3'].forEach(function(id) {
    var el = $(id);
    if (el) el.value = '';
  });
  var cat = $('wiz-category');
  if (cat) cat.value = '';
  var first = $('wiz-barcode') || $('wiz-order');
  if (first) first.focus();
}

function updateStep2Next() {
  var btn = $('btn-step2-next');
  if (btn) btn.disabled = !(window._wizardState && window._wizardState.items.length);
}

// --- REMOVE ITEM ---
function removeItem(index) {
  var ws = window._wizardState;
  if (!ws) return;
  var removed = ws.items[index];
  ws.items.splice(index, 1);
  renderItemsTable();
  if (removed && removed.return_item_id && $('wiz-staged-picker')) renderStagedPicker();
  updateStep2Next();
}

// --- RETURN STATUS HELPERS ---
async function handleReturnItemsOnCreate(items, boxNumber) {
  var returnItems = items.filter(function(it) { return !!it.return_id; });
  if (!returnItems.length) return;
  var tid = getTenantId();
  var successCount = 0;
  for (var i = 0; i < returnItems.length; i++) {
    var it = returnItems[i];
    var { error } = await sb.from(T.SUP_RETURNS)
      .update({ status: 'shipped', shipped_at: new Date().toISOString() })
      .eq('id', it.return_id).eq('tenant_id', tid);
    if (error) {
      toast('שגיאה בעדכון סטטוס זיכוי: ' + error.message, 'w');
    } else {
      successCount++;
      writeLog('return_shipped', it.inventory_id || null, { return_id: it.return_id, box_number: boxNumber });
    }
  }
  if (successCount > 0) toast(boxNumber + ' — ' + successCount + ' פריטי זיכוי עודכנו ל-\'נשלח\'');
}

async function revertReturnStatus(item, boxNumber) {
  if (!item || !item.return_id) return;
  var tid = getTenantId();
  var { error } = await sb.from(T.SUP_RETURNS)
    .update({ status: 'ready_to_ship', shipped_at: null })
    .eq('id', item.return_id).eq('tenant_id', tid);
  if (error) { toast('שגיאה בהחזרת סטטוס זיכוי: ' + error.message, 'w'); return; }
  writeLog('return_unshipped', item.inventory_id || null, { return_id: item.return_id, box_number: boxNumber });
}
