// =========================================================
// shipments-create.js — New Box Wizard (3-step)
// Step 1: type + destination | Step 2: items (placeholder)
// Step 3: courier + confirm | Final: PIN → create box
// =========================================================

window._wizardState = null;

function openNewBoxWizard(presetType, presetSupplierId, presetReturnIds) {
  // Accept single string (legacy) or array of return IDs
  var returnIds = null;
  if (presetReturnIds) {
    returnIds = Array.isArray(presetReturnIds) ? presetReturnIds : [presetReturnIds];
  }
  window._wizardState = {
    step: 1, type: null, supplierId: null, supplierName: null,
    customerName: null, customerPhone: null, customerAddress: null,
    items: [], courierId: null, trackingNumber: null, notes: null,
    presetReturnIds: returnIds
  };
  const modal = $('shipment-wizard');
  modal.classList.remove('hidden');
  modal.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeWizard()"><div class="wiz-box" id="wiz-box"></div></div>';

  if (presetType && presetSupplierId) {
    // Pre-fill type + supplier and skip to step 2
    prefillWizardAndAdvance(presetType, presetSupplierId);
  } else if (presetType) {
    window._wizardState.type = presetType;
    renderWizardStep(1);
  } else {
    renderWizardStep(1);
  }
}

function closeWizard() {
  $('shipment-wizard').classList.add('hidden');
  $('shipment-wizard').innerHTML = '';
  window._wizardState = null;
}

// =========================================================
// STEP NAVIGATION
// =========================================================
function renderWizardStep(step) {
  if (!window._wizardState) return;
  window._wizardState.step = step;
  const dots = [1, 2, 3].map(i =>
    '<span class="wiz-dot' + (i === step ? ' active' : '') + '">' + i + '</span>'
  ).join(' › ');
  const box = $('wiz-box');
  if (!box) return;
  box.innerHTML = '<div class="wiz-header"><div class="wiz-steps">' + dots +
    '</div><div class="wiz-step-label">שלב ' + step + ' מתוך 3</div></div><div id="wiz-body"></div>';
  if (step === 1) renderStep1();
  else if (step === 2) renderStep2();
  else if (step === 3) renderStep3();
}

// =========================================================
// STEP 1 — Type & Destination
// =========================================================
function renderStep1() {
  const ws = window._wizardState;
  const types = [
    { val: 'framing', label: 'מסגור', icon: '🔬' },
    { val: 'return', label: 'זיכוי', icon: '↩️' },
    { val: 'repair', label: 'תיקון', icon: '🔧' },
    { val: 'delivery', label: 'משלוח', icon: '🚚' }
  ];
  let html = '<h3 class="wiz-title">סוג ארגז ויעד</h3><div class="wiz-type-group">';
  for (const t of types) {
    html += '<button class="wiz-type-btn' + (ws.type === t.val ? ' selected' : '') +
      '" data-type="' + t.val + '" onclick="selectBoxType(\'' + t.val + '\')">' +
      '<span class="wiz-type-icon">' + t.icon + '</span><span>' + t.label + '</span></button>';
  }
  html += '</div><div id="wiz-dest"></div>' +
    '<div class="wiz-btns"><button class="btn btn-g" onclick="closeWizard()">ביטול</button>' +
    '<button class="btn btn-p" id="btn-step1-next" onclick="goStep2()" disabled>הבא &#8592;</button></div>';
  $('wiz-body').innerHTML = html;
  if (ws.type) selectBoxType(ws.type);
}

function selectBoxType(type) {
  const ws = window._wizardState;
  ws.type = type;
  document.querySelectorAll('.wiz-type-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.type === type);
  });
  const dest = $('wiz-dest');
  if (['framing', 'return', 'repair'].includes(type)) {
    dest.innerHTML = '<label class="wiz-label">ספק / מעבדה</label><div id="wiz-supplier-wrap"></div>';
    loadSupplierDropdown();
  } else {
    dest.innerHTML = '<label class="wiz-label">פרטי לקוח</label>' +
      '<input type="text" id="wiz-cust-name" class="wiz-input" placeholder="שם לקוח *" value="' + escapeHtml(ws.customerName || '') + '" oninput="onDestInput()">' +
      '<input type="text" id="wiz-cust-phone" class="wiz-input" placeholder="טלפון" value="' + escapeHtml(ws.customerPhone || '') + '" oninput="onDestInput()">' +
      '<input type="text" id="wiz-cust-address" class="wiz-input" placeholder="כתובת" value="' + escapeHtml(ws.customerAddress || '') + '" oninput="onDestInput()">';
  }
  updateStep1Next();
}

async function loadSupplierDropdown() {
  const wrap = $('wiz-supplier-wrap');
  if (!wrap) return;
  const { data } = await sb.from(T.SUPPLIERS)
    .select('id, name').eq('tenant_id', getTenantId()).eq('active', true).order('name');
  if (!data || !data.length) { wrap.innerHTML = '<div class="wiz-note">אין ספקים פעילים</div>'; return; }
  const ws = window._wizardState;
  const ss = createSearchSelect(data.map(s => s.name), ws.supplierName || '', function(val) {
    const found = data.find(s => s.name === val);
    ws.supplierId = found ? found.id : null;
    ws.supplierName = val;
    updateStep1Next();
  });
  ss._input.placeholder = 'חפש ספק...';
  wrap.innerHTML = '';
  wrap.appendChild(ss);
  if (ws.supplierId) { ss._hidden.value = ws.supplierName; ss._input.value = ws.supplierName; }
}

async function prefillWizardAndAdvance(type, supplierId) {
  const ws = window._wizardState;
  ws.type = type;
  ws.supplierId = supplierId;
  // Lookup supplier name
  const { data } = await sb.from(T.SUPPLIERS)
    .select('name').eq('id', supplierId).eq('tenant_id', getTenantId()).maybeSingle();
  ws.supplierName = data ? data.name : '';
  // Go directly to step 2
  renderWizardStep(2);
}

function onDestInput() {
  const ws = window._wizardState;
  ws.customerName = ($('wiz-cust-name') || {}).value || '';
  ws.customerPhone = ($('wiz-cust-phone') || {}).value || '';
  ws.customerAddress = ($('wiz-cust-address') || {}).value || '';
  updateStep1Next();
}

function updateStep1Next() {
  const btn = $('btn-step1-next');
  if (btn) btn.disabled = !validateStep1();
}

function validateStep1() {
  const ws = window._wizardState;
  if (!ws || !ws.type) return false;
  if (['framing', 'return', 'repair'].includes(ws.type)) return !!ws.supplierId;
  return ws.type === 'delivery' && !!(ws.customerName && ws.customerName.trim());
}

function goStep2() { if (validateStep1()) renderWizardStep(2); }

// =========================================================
// STEP 2 — Items (placeholder — shipments-items.js injects)
// =========================================================
function renderStep2() {
  $('wiz-body').innerHTML = '<h3 class="wiz-title">פריטים</h3>' +
    '<div id="wizard-items-container"><div class="wiz-note">טוען פריטים...</div></div>' +
    '<div class="wiz-btns"><button class="btn btn-g" onclick="renderWizardStep(1)">&#8594; חזרה</button>' +
    '<button class="btn btn-p" id="btn-step2-next" onclick="goStep3()">הבא &#8592;</button></div>';
  if (typeof initWizardItems === 'function') initWizardItems();
  else $('wizard-items-container').innerHTML = '<div class="wiz-note">מודול פריטים ייטען בשלב הבא</div>';
}

function goStep3() {
  if (!window._wizardState.items.length) { toast('יש להוסיף לפחות פריט אחד', 'e'); return; }
  renderWizardStep(3);
}

// =========================================================
// STEP 3 — Courier & Confirm
// =========================================================
async function renderStep3() {
  const ws = window._wizardState;
  const typeHe = (ENUM_REV.shipment_type || {})[ws.type] || ws.type;
  const destName = ws.supplierName || ws.customerName || '—';
  const totalValue = ws.items.reduce(function(s, it) { return s + (Number(it.unit_cost) || 0); }, 0);

  var courierReq = getStep3Config('courier_id') === 'required';
  var trackReq = getStep3Config('tracking_number') === 'required';
  var notesReq = getStep3Config('notes') === 'required';
  var courierCls = courierReq ? ' field-required' : '';
  var trackCls = trackReq ? ' field-required' : '';
  var notesCls = notesReq ? ' field-required' : '';

  const html = '<h3 class="wiz-title">שליחויות ואישור</h3>' +
    '<label class="wiz-label' + courierCls + '">חברת שליחויות</label>' +
    '<select id="wiz-courier" class="wiz-input"><option value="">— בחר —</option></select>' +
    '<label class="wiz-label' + trackCls + '">מספר מעקב</label>' +
    '<input type="text" id="wiz-tracking" class="wiz-input" placeholder="' + (trackReq ? 'חובה' : 'אופציונלי') + '" value="' + escapeHtml(ws.trackingNumber || '') + '">' +
    '<label class="wiz-label' + notesCls + '">הערות</label>' +
    '<textarea id="wiz-notes" class="wiz-input" rows="2" placeholder="הערות לארגז">' + escapeHtml(ws.notes || '') + '</textarea>' +
    '<div class="wiz-summary">' +
      '<div><strong>סוג:</strong> ' + escapeHtml(typeHe) + '</div>' +
      '<div><strong>יעד:</strong> ' + escapeHtml(destName) + '</div>' +
      '<div><strong>פריטים:</strong> ' + ws.items.length + '</div>' +
      '<div><strong>סכום:</strong> ' + formatILS(totalValue) + '</div></div>' +
    '<label class="wiz-label">סיסמת עובד</label>' +
    '<input type="password" id="wiz-pin" class="wiz-input" placeholder="PIN" maxlength="8" autocomplete="off">' +
    '<div class="wiz-btns"><button class="btn btn-g" onclick="closeWizard()">ביטול</button>' +
    '<button class="btn btn-g" onclick="renderWizardStep(2)">&#8594; חזרה</button>' +
    '<button class="btn btn-p wiz-create-btn" id="btn-create-box" onclick="createBox()">&#128230; צור ארגז</button></div>';

  $('wiz-body').innerHTML = html;
  await loadCourierOptions();
  setTimeout(function() { var el = $('wiz-pin'); if (el) el.focus(); }, 100);
}

async function loadCourierOptions() {
  const sel = $('wiz-courier');
  if (!sel) return;
  const ws = window._wizardState;
  let list = couriersList;
  if (!list || !list.length) {
    const { data } = await sb.from(T.COURIERS)
      .select('id, name').eq('tenant_id', getTenantId()).eq('is_active', true).order('name');
    list = data || [];
  }
  for (const c of list) {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    if (ws.courierId === c.id) opt.selected = true;
    sel.appendChild(opt);
  }
}

// =========================================================
// CREATE BOX
// =========================================================
async function createBox() {
  const ws = window._wizardState;
  if (!ws) return;
  ws.courierId = ($('wiz-courier') || {}).value || null;
  ws.trackingNumber = ($('wiz-tracking') || {}).value.trim() || null;
  ws.notes = ($('wiz-notes') || {}).value.trim() || null;

  // Step 3 required field validation
  if (getStep3Config('courier_id') === 'required' && !ws.courierId) {
    toast('שדה חובה: חברת שליחויות', 'e'); return;
  }
  if (getStep3Config('tracking_number') === 'required' && !ws.trackingNumber) {
    toast('שדה חובה: מספר מעקב', 'e'); return;
  }
  if (getStep3Config('notes') === 'required' && !ws.notes) {
    toast('שדה חובה: הערות', 'e'); return;
  }

  const pin = ($('wiz-pin') || {}).value || '';
  if (!pin) { toast('יש להזין סיסמת עובד', 'e'); return; }
  const emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('wiz-pin').value = ''; return; }

  const btn = $('btn-create-box');
  if (btn) { btn.disabled = true; btn.textContent = 'יוצר...'; }

  try {
    const tid = getTenantId();
    const { data: boxNumber, error: rpcErr } = await sb.rpc('next_box_number', { p_tenant_id: tid });
    if (rpcErr || !boxNumber) throw new Error(rpcErr?.message || 'שגיאה ביצירת מספר ארגז');

    const shipment = {
      tenant_id: tid, box_number: boxNumber, shipment_type: ws.type,
      supplier_id: ws.supplierId || null, customer_name: ws.customerName || null,
      customer_phone: ws.customerPhone || null, customer_address: ws.customerAddress || null,
      courier_id: ws.courierId || null, tracking_number: ws.trackingNumber || null,
      packed_by: emp.id, notes: ws.notes || null,
      items_count: ws.items.length,
      total_value: ws.items.reduce(function(s, it) { return s + (Number(it.unit_cost) || 0); }, 0)
    };
    const { data: created, error: insErr } = await sb.from(T.SHIPMENTS)
      .insert(shipment).select('id, box_number').single();
    if (insErr || !created) throw new Error(insErr?.message || 'שגיאה ביצירת ארגז');

    // Insert items
    if (ws.items.length) {
      const fields = ['item_type','inventory_id','return_id','order_number','customer_name',
        'customer_number','barcode','brand','model','size','color','category','unit_cost','notes'];
      const rows = ws.items.map(function(it) {
        const row = { tenant_id: tid, shipment_id: created.id };
        for (const f of fields) row[f] = it[f] || null;
        row.item_type = row.item_type || 'order';
        return row;
      });
      const { error: itemsErr } = await sb.from(T.SHIP_ITEMS).insert(rows);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    // Handle return items — update supplier_returns status (Phase 5.9d)
    var returnCount = 0;
    if (typeof handleReturnItemsOnCreate === 'function') {
      returnCount = ws.items.filter(function(it) { return !!it.return_id; }).length;
      await handleReturnItemsOnCreate(ws.items, created.box_number);
    }

    // Logs
    const destName = ws.supplierName || ws.customerName || '';
    writeLog('shipment_created', null, {
      box_number: created.box_number, type: ws.type,
      destination: destName, items_count: ws.items.length, employee_id: emp.id
    });
    for (const it of ws.items) {
      writeLog('shipment_item_added', it.inventory_id || null, {
        box_number: created.box_number, barcode: it.barcode || '', item_type: it.item_type || 'order'
      });
    }

    closeWizard();
    await loadShipments();
    if (returnCount > 0) {
      toast('ארגז ' + created.box_number + ' נוצר — ' + returnCount + ' פריטי זיכוי עודכנו ל-\'נשלח\'');
    } else {
      toast('ארגז ' + created.box_number + ' נוצר — 30 דקות לעריכה');
    }
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
    if (btn) { btn.disabled = false; btn.textContent = '📦 צור ארגז'; }
  }
}
