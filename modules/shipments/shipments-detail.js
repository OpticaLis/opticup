// shipments-detail.js — Box detail slide-in panel: metadata, items, actions
// Depends on: shipments-lock.js, shipments-items.js (lookupBarcode)
let _detailBox = null;
let _detailItems = [];

// =========================================================
// OPEN / CLOSE
// =========================================================
async function openShipmentDetail(shipmentId) {
  const tid = getTenantId();
  const panel = $('shipment-detail');
  if (!panel) return;

  // Fetch box with joins
  const { data: box, error } = await sb.from(T.SHIPMENTS)
    .select('*, courier:courier_companies(name), supplier:suppliers(name), packer:employees!packed_by(name), locker:employees!locked_by(name)')
    .eq('id', shipmentId)
    .eq('tenant_id', tid)
    .single();

  if (error || !box) { toast('שגיאה בטעינת ארגז', 'e'); return; }

  // Fetch items
  const { data: items } = await sb.from(T.SHIP_ITEMS)
    .select('*')
    .eq('shipment_id', shipmentId)
    .eq('tenant_id', tid)
    .order('created_at');

  _detailBox = box;
  _detailItems = items || [];
  if (box.corrects_box_id) {
    const { data: orig } = await sb.from(T.SHIPMENTS)
      .select('box_number')
      .eq('id', box.corrects_box_id)
      .eq('tenant_id', tid)
      .maybeSingle();
    box._originalBoxNumber = orig ? orig.box_number : '?';
  }

  renderDetailPanel(box, _detailItems);
  panel.classList.remove('hidden');
  requestAnimationFrame(function() { panel.classList.add('open'); });
}

function closeDetail() {
  stopLockTimer();
  const panel = $('shipment-detail');
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(function() {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    _detailBox = null;
    _detailItems = [];
  }, 300);
}

// =========================================================
function renderDetailPanel(box, items) {
  const panel = $('shipment-detail');
  if (!panel) return;

  const typeMap = ENUM_REV.shipment_type || {};
  const typeHe = typeMap[box.shipment_type] || box.shipment_type;
  const editable = isBoxEditable(box);

  let html = '<div class="detail-header">' +
    '<button class="detail-close" onclick="closeDetail()" title="סגור">&times;</button>' +
    '<div class="detail-box-num">' + escapeHtml(box.box_number) + '</div>' +
    '<div class="detail-status">' + renderLockStatus(box) + '</div>' +
    '</div>';

  // Metadata
  html += '<div class="detail-meta">';
  html += metaRow('סוג', escapeHtml(typeHe));

  if (box.shipment_type === 'delivery') {
    html += metaRow('לקוח', escapeHtml(box.customer_name || '—'));
    if (box.customer_phone) html += metaRow('טלפון', escapeHtml(box.customer_phone));
    if (box.customer_address) html += metaRow('כתובת', escapeHtml(box.customer_address));
  } else {
    html += metaRow('ספק / מעבדה', escapeHtml(box.supplier?.name || '—'));
  }

  html += metaRow('שליחויות', escapeHtml((box.courier?.name || '—') + (box.tracking_number ? ' — ' + box.tracking_number : '')));
  html += metaRow('נארז', escapeHtml((box.packer?.name || '—') + ' — ' + fmtDate(box.packed_at)));

  if (box.locked_at) {
    const lockerName = box.locker?.name || '';
    html += metaRow('ננעל', fmtDate(box.locked_at) + (lockerName ? ' (' + escapeHtml(lockerName) + ')' : ''));
  }

  if (box.corrects_box_id && box._originalBoxNumber) {
    html += metaRow('מתקן', '<span class="detail-correction-link">&#128279; ארגז ' + escapeHtml(box._originalBoxNumber) + '</span>');
  }

  if (box.notes) html += metaRow('הערות', escapeHtml(box.notes));
  html += '</div>';

  // Timer (editable only)
  if (editable) {
    html += '<div id="detail-timer" class="detail-timer"></div>';
  }

  // Items table
  html += renderDetailItems(box, items, editable);

  // Action buttons
  html += '<div class="detail-actions">';
  if (editable) {
    html += '<button class="btn btn-p btn-sm" onclick="detailAddItem()">&#10133; הוסף פריט</button>';
    html += '<button class="btn btn-g btn-sm" onclick="openEditDetails()">&#9999;&#65039; ערוך פרטים</button>';
    html += '<button class="btn btn-s btn-sm" onclick="detailLockBox()">&#128274; נעל ושלח</button>';
  } else {
    html += '<button class="btn btn-g btn-sm" onclick="detailCorrectionBox()">&#128230; ארגז תיקון</button>';
  }
  html += '<button class="btn btn-g btn-sm" onclick="detailPrintManifest()">&#128203; הדפס manifest</button>';
  html += '</div>';

  panel.innerHTML = html;

  // Start timer after DOM is ready
  if (editable) {
    startLockTimer(box, document.getElementById('detail-timer'));
  }
}

function metaRow(label, value) {
  return '<div class="detail-meta-row"><span class="detail-meta-label">' + label + ':</span> ' + value + '</div>';
}

function fmtDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    d.getFullYear() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}

// =========================================================
function renderDetailItems(box, items, editable) {
  const catMap = ENUM_REV.shipment_category || {};
  let html = '<div class="detail-items-section">' +
    '<div class="detail-items-title">פריטים (' + items.length + ')</div>';

  if (!items.length) {
    html += '<div class="wiz-note">אין פריטים בארגז</div>';
  } else {
    html += '<div class="detail-items-table"><div class="detail-items-header">' +
      '<span class="di-col di-num">#</span>' +
      '<span class="di-col di-id">ברקוד / הזמנה</span>' +
      '<span class="di-col di-brand">מותג + דגם</span>' +
      '<span class="di-col di-cat">קטגוריה</span>' +
      '<span class="di-col di-cost">עלות</span>' +
      '<span class="di-col di-notes">הערות</span>' +
      (editable ? '<span class="di-col di-act"></span>' : '') +
      '</div>';

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var identifier = it.barcode || it.order_number || '—';
      var brandModel = (it.brand || '') + (it.model ? ' ' + it.model : '');
      var catHe = catMap[it.category] || it.category || '—';
      var costStr = it.unit_cost ? formatILS(it.unit_cost) : '—';
      var linked = it.return_id ? ' <span title="מקושר לזיכוי">&#128279;</span>' : '';

      html += '<div class="detail-item-row">' +
        '<span class="di-col di-num">' + (i + 1) + '</span>' +
        '<span class="di-col di-id">' + escapeHtml(identifier) + linked + '</span>' +
        '<span class="di-col di-brand">' + escapeHtml(brandModel || '—') + '</span>' +
        '<span class="di-col di-cat">' + escapeHtml(catHe) + '</span>' +
        '<span class="di-col di-cost">' + costStr + '</span>' +
        '<span class="di-col di-notes">' + escapeHtml(it.notes || '') + '</span>';
      if (editable) {
        html += '<span class="di-col di-act"><button class="wiz-item-del" onclick="detailRemoveItem(\'' + it.id + '\')" title="הסר">&#10005;</button></span>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  html += '<div class="detail-items-footer">סה"כ: ' + items.length + ' פריטים' +
    (box.total_value ? ', ' + formatILS(box.total_value) : '') + '</div>';
  html += '</div>';
  return html;
}

// --- ACTION WRAPPERS ---
async function detailLockBox() {
  if (!_detailBox) return;
  await lockBox(_detailBox.id);
  // Refresh detail after lock
  await openShipmentDetail(_detailBox.id);
}

async function detailCorrectionBox() {
  if (!_detailBox) return;
  await createCorrectionBox(_detailBox);
  closeDetail();
}

function detailPrintManifest() {
  if (!_detailBox) return;
  if (typeof printManifest === 'function') {
    printManifest(_detailBox, _detailItems);
  } else {
    toast('פונקציית הדפסה אינה זמינה', 'e');
  }
}

async function detailRemoveItem(itemId) {
  if (!_detailBox) return;
  var ok = await removeItemFromExistingBox(itemId, _detailBox);
  if (ok) await openShipmentDetail(_detailBox.id);
}

async function detailAddItem() {
  if (!_detailBox || !isBoxEditable(_detailBox)) return;
  // Show inline add-item form
  var container = document.getElementById('detail-add-form');
  if (container) { container.remove(); return; } // toggle off

  var section = document.querySelector('.detail-items-section');
  if (!section) return;

  var form = document.createElement('div');
  form.id = 'detail-add-form';
  form.className = 'detail-add-form';
  form.innerHTML = '<div class="detail-add-title">הוסף פריט</div>' +
    '<div class="wiz-item-fields">' +
    '<div class="wiz-field-row"><label class="wiz-field-label">ברקוד</label><input type="text" id="da-barcode" class="wiz-input wiz-field-input"></div>' +
    '<div class="wiz-field-row"><label class="wiz-field-label">מס\' הזמנה</label><input type="text" id="da-order" class="wiz-input wiz-field-input"></div>' +
    '<div class="wiz-field-row"><label class="wiz-field-label">שם לקוח</label><input type="text" id="da-cust" class="wiz-input wiz-field-input"></div>' +
    '<div class="wiz-field-row"><label class="wiz-field-label">הערות</label><input type="text" id="da-notes" class="wiz-input wiz-field-input"></div>' +
    '</div>' +
    '<div class="wiz-btns"><button class="btn btn-g btn-sm" onclick="document.getElementById(\'detail-add-form\').remove()">ביטול</button>' +
    '<button class="btn btn-p btn-sm" onclick="submitDetailAddItem()">הוסף</button></div>';
  section.insertBefore(form, section.firstChild);
  setTimeout(function() { var el = $('da-barcode'); if (el) el.focus(); }, 50);
}

async function submitDetailAddItem() {
  if (!_detailBox) return;
  var barcode = ($('da-barcode') || {}).value.trim();
  var orderNum = ($('da-order') || {}).value.trim();
  var custName = ($('da-cust') || {}).value.trim();
  var notes = ($('da-notes') || {}).value.trim();

  if (!barcode && !orderNum && !custName) {
    toast('יש למלא לפחות שדה מזהה אחד', 'e'); return;
  }

  var item = {
    item_type: 'order', barcode: barcode || null, order_number: orderNum || null,
    customer_name: custName || null, notes: notes || null,
    brand: null, model: null, size: null, color: null,
    unit_cost: null, inventory_id: null, return_id: null
  };

  if (barcode && typeof lookupBarcode === 'function') {
    var inv = await lookupBarcode(barcode);
    if (inv) {
      item.inventory_id = inv.id;
      item.brand = inv.brand?.name || null;
      item.model = inv.model || null;
      item.size = inv.size || null;
      item.color = inv.color || null;
      item.unit_cost = inv.cost_price || null;
      item.item_type = 'inventory';
    }
  }

  var ok = await addItemToExistingBox(_detailBox.id, item);
  if (ok) {
    toast('פריט נוסף');
    await openShipmentDetail(_detailBox.id);
  }
}

// --- EDIT DETAILS (courier, tracking, notes) ---
function openEditDetails() {
  if (!_detailBox || !isBoxEditable(_detailBox)) return;
  var box = _detailBox;
  var meta = document.querySelector('.detail-meta');
  if (!meta) return;

  var html = '<div class="detail-edit-form">' +
    '<div class="detail-add-title">עריכת פרטים</div>' +
    '<label class="wiz-label">חברת שליחויות</label>' +
    '<select id="de-courier" class="wiz-input"><option value="">— בחר —</option></select>' +
    '<label class="wiz-label">מספר מעקב</label>' +
    '<input type="text" id="de-tracking" class="wiz-input" value="' + escapeHtml(box.tracking_number || '') + '">' +
    '<label class="wiz-label">הערות</label>' +
    '<textarea id="de-notes" class="wiz-input" rows="2">' + escapeHtml(box.notes || '') + '</textarea>' +
    '<div class="wiz-btns">' +
    '<button class="btn btn-g btn-sm" onclick="openShipmentDetail(\'' + box.id + '\')">ביטול</button>' +
    '<button class="btn btn-p btn-sm" onclick="saveEditDetails()">שמור</button></div></div>';

  meta.innerHTML = html;
  loadEditCouriers(box.courier_id);
}

async function loadEditCouriers(currentId) {
  var sel = $('de-courier');
  if (!sel) return;
  var list = couriersList;
  if (!list || !list.length) {
    var { data } = await sb.from(T.COURIERS)
      .select('id, name').eq('tenant_id', getTenantId()).eq('is_active', true).order('name');
    list = data || [];
  }
  for (var c of list) {
    var opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    if (currentId === c.id) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function saveEditDetails() {
  if (!_detailBox) return;
  var tid = getTenantId();
  var courierId = ($('de-courier') || {}).value || null;
  var tracking = ($('de-tracking') || {}).value.trim() || null;
  var notes = ($('de-notes') || {}).value.trim() || null;

  var updates = {};
  var changes = {};
  if (courierId !== (_detailBox.courier_id || null)) { updates.courier_id = courierId; changes.courier_id = courierId; }
  if (tracking !== (_detailBox.tracking_number || null)) { updates.tracking_number = tracking; changes.tracking_number = tracking; }
  if (notes !== (_detailBox.notes || null)) { updates.notes = notes; changes.notes = notes; }

  if (!Object.keys(updates).length) { toast('לא בוצעו שינויים', 'i'); await openShipmentDetail(_detailBox.id); return; }

  var { error } = await sb.from(T.SHIPMENTS).update(updates).eq('id', _detailBox.id).eq('tenant_id', tid);
  if (error) { toast('שגיאה בשמירה: ' + error.message, 'e'); return; }

  writeLog('shipment_updated', null, { box_number: _detailBox.box_number, changes: changes });
  toast('פרטים עודכנו');
  await loadShipments();
  await openShipmentDetail(_detailBox.id);
}
