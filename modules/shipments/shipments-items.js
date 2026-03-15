// shipments-items.js — Wizard Step 2: item entry + staged return picker + status helpers
window._stagedReturns = [];

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
    // Prevent duplicates
    if (ws.items.some(function(w) { return w.return_item_id === returnItemId; })) return;
    const src = staged.find(function(s) { return s.id === returnItemId; });
    if (!src) return;

    ws.items.push({
      item_type: 'inventory',
      return_id: src.return ? src.return.id : src.return_id,
      return_item_id: src.id,
      inventory_id: src.inventory_id || null,
      barcode: src.barcode || null,
      brand: src.brand_name || null,
      model: src.model || null,
      size: src.size || null,
      color: src.color || null,
      unit_cost: src.cost_price || null,
      category: 'stock',
      order_number: null, customer_name: null, customer_number: null, notes: null
    });
  } else {
    // Remove by return_item_id
    ws.items = ws.items.filter(function(w) { return w.return_item_id !== returnItemId; });
  }

  renderItemsTable();
  renderStagedPicker();
  updateStep2Next();
}

// --- ITEM FORM — varies by box type ---
function renderItemForm(type) {
  const el = $('wiz-item-form');
  if (!el) return;
  let html = '<div class="wiz-item-fields">';

  if (type === 'framing') {
    html += fieldRow('wiz-order', 'מס\' הזמנה', 'text') +
      fieldRow('wiz-cust', 'שם לקוח', 'text') +
      fieldRow('wiz-custnum', 'מס\' לקוח', 'text') +
      categoryDropdown() +
      fieldRow('wiz-barcode', 'ברקוד (אופציונלי)', 'text') +
      fieldRow('wiz-inotes', 'הערות', 'text');
  } else if (type === 'return') {
    html += '<div class="wiz-manual-header">+ הוסף ידנית</div>' +
      fieldRow('wiz-barcode', 'ברקוד', 'text') +
      fieldRow('wiz-order', 'מס\' הזמנה', 'text') +
      fieldRow('wiz-cust', 'שם לקוח', 'text') +
      fieldRow('wiz-custnum', 'מס\' לקוח', 'text') +
      categoryDropdown() +
      fieldRow('wiz-inotes', 'הערות', 'text');
  } else if (type === 'repair') {
    html += fieldRow('wiz-barcode', 'ברקוד', 'text') +
      fieldRow('wiz-inotes', 'תיאור התקלה', 'text') +
      fieldRow('wiz-order', 'מס\' הזמנה (אופציונלי)', 'text');
  } else if (type === 'delivery') {
    html += fieldRow('wiz-order', 'מס\' הזמנה', 'text') +
      fieldRow('wiz-barcode', 'ברקוד (אופציונלי)', 'text') +
      categoryDropdown() +
      fieldRow('wiz-inotes', 'הערות', 'text');
  }

  html += '</div>';
  html += '<button class="btn btn-p wiz-add-btn" onclick="addItemRow()">+ הוסף שורה</button>';
  el.innerHTML = html;
}

function fieldRow(id, label, type) {
  return '<div class="wiz-field-row">' +
    '<label class="wiz-field-label">' + label + '</label>' +
    '<input type="' + type + '" id="' + id + '" class="wiz-input wiz-field-input" autocomplete="off">' +
    '</div>';
}

function categoryDropdown() {
  const cats = ENUM_MAP.shipment_category || {};
  let opts = '<option value="">— קטגוריה —</option>';
  for (const [he, en] of Object.entries(cats)) {
    if (en === 'stock') continue;
    opts += '<option value="' + en + '">' + escapeHtml(he) + '</option>';
  }
  return '<div class="wiz-field-row">' +
    '<label class="wiz-field-label">קטגוריה</label>' +
    '<select id="wiz-category" class="wiz-input wiz-field-input">' + opts + '</select></div>';
}

// --- ADD ITEM (manual entry) ---
async function addItemRow() {
  const ws = window._wizardState;
  if (!ws) return;

  const barcode = (($('wiz-barcode') || {}).value || '').trim();
  const orderNum = (($('wiz-order') || {}).value || '').trim();
  const custName = (($('wiz-cust') || {}).value || '').trim();
  const custNum = (($('wiz-custnum') || {}).value || '').trim();
  const category = (($('wiz-category') || {}).value || '');
  const notes = (($('wiz-inotes') || {}).value || '').trim();

  if (!barcode && !orderNum && !custName) {
    toast('יש למלא לפחות שדה מזהה אחד (ברקוד / הזמנה / לקוח)', 'e');
    return;
  }

  const item = {
    barcode: barcode || null, order_number: orderNum || null,
    customer_name: custName || null, customer_number: custNum || null,
    category: category || null, notes: notes || null,
    brand: null, model: null, size: null, color: null,
    unit_cost: null, inventory_id: null, return_id: null, return_item_id: null,
    item_type: 'order'
  };

  if (barcode) {
    const inv = await lookupBarcode(barcode);
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

  if (ws.type === 'repair' && item.item_type !== 'inventory') {
    item.item_type = 'repair';
  }

  ws.items.push(item);
  renderItemsTable();
  clearItemForm();
  updateStep2Next();
  toast('פריט נוסף (' + ws.items.length + ')');
}

async function lookupBarcode(barcode) {
  const { data, error } = await sb.from(T.INV)
    .select('id, barcode, brand:brands(name), model, size, color, cost_price')
    .eq('barcode', barcode)
    .eq('tenant_id', getTenantId())
    .eq('is_deleted', false)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

function clearItemForm() {
  ['wiz-barcode', 'wiz-order', 'wiz-cust', 'wiz-custnum', 'wiz-inotes'].forEach(function(id) {
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
  // If staged picker is visible, re-sync checkbox state
  if (removed && removed.return_item_id && $('wiz-staged-picker')) {
    renderStagedPicker();
  }
  updateStep2Next();
}

// --- ITEMS TABLE ---
function renderItemsTable() {
  var ws = window._wizardState;
  var el = $('wiz-items-table');
  if (!el || !ws) return;

  if (!ws.items.length) {
    el.innerHTML = '<div class="wiz-note">טרם נוספו פריטים</div>';
    return;
  }

  var catMap = ENUM_REV.shipment_category || {};
  var html = '<div class="wiz-items-count">' + ws.items.length + ' פריטים</div>';
  html += '<div class="wiz-items-list">';

  for (var i = 0; i < ws.items.length; i++) {
    var it = ws.items[i];
    var linked = it.return_item_id ? ' wiz-item-linked' : '';
    html += '<div class="wiz-item-row' + linked + '">';
    html += '<span class="wiz-item-num">' + (i + 1) + '</span>';
    if (it.return_item_id) html += '<span class="wiz-link-icon" title="מקושר לזיכוי">&#128279;</span>';

    if (ws.type === 'framing') {
      html += col(it.order_number) + col(it.customer_name) +
        col(catMap[it.category] || it.category) + col(it.barcode) + col(it.notes, true);
    } else if (ws.type === 'return') {
      html += col(it.barcode) + col(it.brand) + col(it.model) +
        col(it.unit_cost ? formatILS(it.unit_cost) : '') + col(it.notes, true);
    } else if (ws.type === 'repair') {
      html += col(it.barcode) + col(it.notes) + col(it.order_number, true);
    } else if (ws.type === 'delivery') {
      html += col(it.order_number) + col(it.barcode) +
        col(catMap[it.category] || it.category) + col(it.notes, true);
    }

    html += '<button class="wiz-item-del" onclick="removeItem(' + i + ')" title="הסר">&#10005;</button>';
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function col(val, wide) {
  return '<span class="wiz-item-col' + (wide ? ' wide' : '') + '">' +
    escapeHtml(val || '—') + '</span>';
}

// --- RETURN STATUS HELPERS (used by shipments-create.js & future edit window) ---
async function handleReturnItemsOnCreate(items, boxNumber) {
  const returnItems = items.filter(function(it) { return !!it.return_id; });
  if (!returnItems.length) return;

  const tid = getTenantId();
  var successCount = 0;

  for (const it of returnItems) {
    const { error } = await sb.from(T.SUP_RETURNS)
      .update({ status: 'shipped', shipped_at: new Date().toISOString() })
      .eq('id', it.return_id)
      .eq('tenant_id', tid);
    if (error) {
      toast('שגיאה בעדכון סטטוס זיכוי: ' + error.message, 'w');
    } else {
      successCount++;
      writeLog('return_shipped', it.inventory_id || null, {
        return_id: it.return_id, box_number: boxNumber
      });
    }
  }

  if (successCount > 0) {
    toast(boxNumber + ' — ' + successCount + ' פריטי זיכוי עודכנו ל-\'נשלח\'');
  }
}

async function revertReturnStatus(item, boxNumber) {
  if (!item || !item.return_id) return;
  const tid = getTenantId();
  const { error } = await sb.from(T.SUP_RETURNS)
    .update({ status: 'ready_to_ship', shipped_at: null })
    .eq('id', item.return_id)
    .eq('tenant_id', tid);
  if (error) {
    toast('שגיאה בהחזרת סטטוס זיכוי: ' + error.message, 'w');
    return;
  }
  writeLog('return_unshipped', item.inventory_id || null, {
    return_id: item.return_id, box_number: boxNumber
  });
}
