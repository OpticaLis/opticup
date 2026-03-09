// ============================================================
// purchase-orders.js — הזמנות רכש
// ============================================================

// ── State ────────────────────────────────────────────────────
let poData = [];
let poFilters = { status: '', supplier: '' };
let currentPO = null;
let currentPOItems = [];

// ── Tab entry point ──────────────────────────────────────────
async function loadPurchaseOrdersTab() {
  const container = document.getElementById('po-list-container2');
  if (!container) return;
  container.innerHTML = '<p style="padding:20px">טוען...</p>';
  try {
    const { data, error } = await sb
      .from(T.PO)
      .select(`*, suppliers(name)`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    poData = data || [];
    renderPoList(container);
  } catch (err) {
    container.innerHTML = `<p style="color:red;padding:20px">שגיאה: ${err.message}</p>`;
  }
}

// ── Render list ──────────────────────────────────────────────
function renderPoList(container) {
  const filtered = applyPoFilters(poData);

  const drafts   = poData.filter(p => p.status === 'draft').length;
  const sent     = poData.filter(p => p.status === 'sent').length;
  const partial  = poData.filter(p => p.status === 'partial').length;
  const thisMonth = poData.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const statusLabel = {
    draft:     { text: 'טיוטה',    color: '#9e9e9e' },
    sent:      { text: 'נשלחה',    color: '#2196F3' },
    partial:   { text: 'חלקי',     color: '#FF9800' },
    received:  { text: 'התקבל',    color: '#4CAF50' },
    cancelled: { text: 'בוטל',     color: '#f44336' }
  };

  const rows = filtered.length === 0
    ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888">אין הזמנות</td></tr>`
    : filtered.map(po => {
        const s = statusLabel[po.status] || { text: po.status, color: '#888' };
        const supplierName = po.suppliers?.name || '—';
        const orderDate = po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—';
        const expectedDate = po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—';
        let actions = '';
        if (po.status === 'draft') {
          actions = `
            <button onclick="openEditPO('${po.id}')" class="btn btn-p btn-sm">עריכה</button>
            <button onclick="sendPurchaseOrder('${po.id}')" class="btn btn-s btn-sm">שלח</button>
            <button onclick="cancelPO('${po.id}')" class="btn btn-d btn-sm">בטל</button>`;
        } else if (po.status === 'sent' || po.status === 'partial') {
          actions = `<button onclick="openViewPO('${po.id}')" class="btn btn-g btn-sm">צפייה</button>
            <button onclick="cancelPO('${po.id}')" class="btn btn-d btn-sm">בטל</button>`;
        } else {
          actions = `<button onclick="openViewPO('${po.id}')" class="btn btn-g btn-sm">צפייה</button>`;
        }
        return `<tr>
          <td style="font-weight:600">${po.po_number || '—'}</td>
          <td>${supplierName}</td>
          <td>${orderDate}</td>
          <td>${expectedDate}</td>
          <td><span style="color:${s.color};font-weight:600">${s.text}</span></td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2 style="margin:0">📋 הזמנות רכש</h2>
        <button onclick="openNewPurchaseOrder()" class="btn btn-p" style="padding:8px 18px;font-size:15px">+ הזמנה חדשה</button>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap">
        ${poSummaryCard('טיוטות', drafts, '#9e9e9e')}
        ${poSummaryCard('ממתינות לקבלה', sent, '#2196F3')}
        ${poSummaryCard('קבלה חלקית', partial, '#FF9800')}
        ${poSummaryCard('החודש', thisMonth, '#4CAF50')}
      </div>

      <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap">
        <select onchange="poFilters.status=this.value; renderPoList(document.getElementById('po-list-container2'))"
                style="padding:6px 10px; border-radius:6px; border:1px solid #ccc">
          <option value="">כל הסטטוסים</option>
          <option value="draft"${poFilters.status==='draft'?' selected':''}>טיוטה</option>
          <option value="sent"${poFilters.status==='sent'?' selected':''}>נשלחה</option>
          <option value="partial"${poFilters.status==='partial'?' selected':''}>חלקי</option>
          <option value="received"${poFilters.status==='received'?' selected':''}>התקבל</option>
          <option value="cancelled"${poFilters.status==='cancelled'?' selected':''}>בוטל</option>
        </select>
        <select id="po-filter-supplier"
                onchange="poFilters.supplier=this.value; renderPoList(document.getElementById('po-list-container2'))"
                style="padding:6px 10px; border-radius:6px; border:1px solid #ccc">
          <option value="">כל הספקים</option>
        </select>
      </div>

      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:14px">
          <thead>
            <tr style="background:#1a2744; color:white; text-align:right">
              <th style="padding:10px">מספר PO</th>
              <th style="padding:10px">ספק</th>
              <th style="padding:10px">תאריך הזמנה</th>
              <th style="padding:10px">תאריך צפוי</th>
              <th style="padding:10px">סטטוס</th>
              <th style="padding:10px">פעולות</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  populatePoSupplierFilter();
}

function poSummaryCard(label, value, color) {
  return `<div style="background:white; border-radius:10px; padding:14px 20px;
                       box-shadow:0 1px 4px rgba(0,0,0,0.1); min-width:130px; text-align:center">
    <div style="font-size:24px; font-weight:700; color:${color}">${value}</div>
    <div style="font-size:13px; color:#666; margin-top:4px">${label}</div>
  </div>`;
}

function applyPoFilters(data) {
  return data.filter(po => {
    if (poFilters.status && po.status !== poFilters.status) return false;
    if (poFilters.supplier && po.supplier_id !== poFilters.supplier) return false;
    return true;
  });
}

async function populatePoSupplierFilter() {
  const sel = document.getElementById('po-filter-supplier');
  if (!sel) return;
  const current = poFilters.supplier;
  try {
    const { data } = await sb.from('suppliers').select('id, name').eq('active', true).order('name');
    (data || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── PO Number generation ─────────────────────────────────────
async function generatePoNumber() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const { data } = await sb.from(T.PO)
    .select('po_number')
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1);
  const last = data?.[0]?.po_number;
  const seq = last ? parseInt(last.split('-')[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── New PO ───────────────────────────────────────────────────
async function openNewPurchaseOrder() {
  showLoading('יוצר הזמנה...');
  try {
    const poNumber = await generatePoNumber();
    currentPO = {
      id: null,
      po_number: poNumber,
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: ''
    };
    currentPOItems = [];
    renderPOForm(false);
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
  }
  hideLoading();
}

// ── Edit existing draft PO ───────────────────────────────────
async function openEditPO(id) {
  showLoading('טוען הזמנה...');
  try {
    const { data: po, error } = await sb.from(T.PO)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    currentPO = {
      id: po.id,
      po_number: po.po_number || '',
      supplier_id: po.supplier_id || '',
      order_date: po.order_date || new Date().toISOString().split('T')[0],
      expected_date: po.expected_date || '',
      notes: po.notes || ''
    };

    const { data: items, error: iErr } = await sb.from(T.PO_ITEMS)
      .select('*')
      .eq('po_id', id);
    if (iErr) throw iErr;

    currentPOItems = (items || []).map(it => ({
      inventory_id: it.inventory_id || null,
      barcode: it.barcode || '',
      brand: it.brand || '',
      model: it.model || '',
      color: it.color || '',
      size: it.size || '',
      qty_ordered: it.qty_ordered || 1,
      unit_cost: it.unit_cost || 0,
      discount_pct: it.discount_pct || 0,
      notes: it.notes || ''
    }));

    renderPOForm(true);
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
  }
  hideLoading();
}

// ── Render PO form ───────────────────────────────────────────
function renderPOForm(isEdit) {
  const container = document.getElementById('po-list-container2');
  if (!container) return;

  const title = isEdit
    ? `📋 עריכת הזמנה — ${currentPO.po_number}`
    : `📋 הזמנת רכש חדשה — ${currentPO.po_number}`;

  container.innerHTML = `
    <div id="po-form-wrapper" style="padding:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2 style="margin:0">${title}</h2>
        <button onclick="loadPurchaseOrdersTab()" class="btn btn-g" style="padding:6px 14px">← חזרה לרשימה</button>
      </div>

      <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px;
                  background:white; padding:16px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.1)">
        <div style="flex:1; min-width:200px">
          <label style="display:block; margin-bottom:6px; font-weight:600">ספק <span style="color:#ef4444">*</span></label>
          <select id="po-form-supplier" onchange="currentPO.supplier_id=this.value"
                  style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #ccc">
            <option value="">בחר ספק...</option>
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:6px; font-weight:600">תאריך הגעה צפוי</label>
          <input type="date" id="po-expected-date" value="${currentPO.expected_date || ''}"
                 style="padding:7px 10px; border-radius:6px; border:1px solid #ccc">
        </div>
        <div style="flex:2; min-width:200px">
          <label style="display:block; margin-bottom:6px; font-weight:600">הערות</label>
          <input type="text" id="po-form-notes" value="${currentPO.notes || ''}"
                 placeholder="הערות להזמנה..."
                 style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #ccc">
        </div>
      </div>

      <div style="background:white; padding:16px; border-radius:10px;
                  box-shadow:0 1px 4px rgba(0,0,0,0.1); margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="margin:0">פריטים</h3>
          <div style="display:flex; gap:8px">
            <input type="text" id="po-barcode-search" placeholder="חפש ברקוד..."
                   style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; width:160px"
                   onkeydown="if(event.key==='Enter') addPOItemByBarcode()">
            <button onclick="addPOItemByBarcode()" class="btn btn-g btn-sm">🔍 ברקוד</button>
            <button onclick="addPOItemManual()" class="btn btn-p btn-sm">+ שורה ידנית</button>
          </div>
        </div>

        <div style="overflow-x:auto">
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#1a2744; color:white; text-align:right">
                <th style="padding:8px">מותג</th>
                <th style="padding:8px">דגם</th>
                <th style="padding:8px">צבע</th>
                <th style="padding:8px">גודל</th>
                <th style="padding:8px; width:70px">כמות</th>
                <th style="padding:8px; width:90px">עלות ₪</th>
                <th style="padding:8px; width:70px">הנחה %</th>
                <th style="padding:8px; width:80px">סה"כ</th>
                <th style="padding:8px; width:40px"></th>
              </tr>
            </thead>
            <tbody id="po-items-tbody"></tbody>
            <tfoot id="po-items-tfoot"></tfoot>
          </table>
        </div>
      </div>

      <div style="display:flex; gap:10px; justify-content:flex-end">
        <button onclick="loadPurchaseOrdersTab()" class="btn btn-g" style="padding:9px 18px">ביטול</button>
        <button onclick="savePODraft()" class="btn btn-s" style="padding:9px 24px">💾 שמור טיוטה</button>
      </div>
    </div>`;

  renderPOItemsTable();
  initPoSupplierSelect();
}

// ── Populate supplier dropdown in form ───────────────────────
async function initPoSupplierSelect() {
  const sel = document.getElementById('po-form-supplier');
  if (!sel) return;
  try {
    const { data } = await sb.from('suppliers').select('id, name').eq('active', true).order('name');
    (data || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === currentPO.supplier_id) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── Items table render ───────────────────────────────────────
function renderPOItemsTable() {
  const tbody = document.getElementById('po-items-tbody');
  const tfoot = document.getElementById('po-items-tfoot');
  if (!tbody || !tfoot) return;

  if (currentPOItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888">אין פריטים — לחץ "+ שורה ידנית" או חפש ברקוד</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = currentPOItems.map((item, i) => `
    <tr>
      <td><input value="${item.brand || ''}" oninput="currentPOItems[${i}].brand=this.value" style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.model || ''}" oninput="currentPOItems[${i}].model=this.value" style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.color || ''}" oninput="currentPOItems[${i}].color=this.value" style="width:70px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.size || ''}" oninput="currentPOItems[${i}].size=this.value" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="1" value="${item.qty_ordered || 1}"
                 oninput="currentPOItems[${i}].qty_ordered=+this.value; updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" step="0.01" value="${item.unit_cost || ''}"
                 oninput="currentPOItems[${i}].unit_cost=+this.value; updatePOTotals()" style="width:75px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" max="100" step="0.1" value="${item.discount_pct || 0}"
                 oninput="currentPOItems[${i}].discount_pct=+this.value; updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td id="po-row-total-${i}" style="text-align:center; font-weight:600; padding:8px">—</td>
      <td><button onclick="removePOItem(${i})" style="background:none;border:none;cursor:pointer;color:#f44336;font-size:16px">✕</button></td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr style="font-weight:700; border-top:2px solid #1a2744">
      <td colspan="4" style="padding:8px; text-align:left">סה"כ:</td>
      <td id="po-total-qty" style="padding:8px"></td>
      <td colspan="2" style="padding:8px; text-align:left">סכום:</td>
      <td id="po-total-amount" style="padding:8px; font-size:15px"></td>
      <td></td>
    </tr>`;

  updatePOTotals();
}

// ── Totals ───────────────────────────────────────────────────
function updatePOTotals() {
  let totalQty = 0;
  let totalAmount = 0;

  currentPOItems.forEach((item, i) => {
    const qty = item.qty_ordered || 0;
    const cost = item.unit_cost || 0;
    const disc = item.discount_pct || 0;
    const rowTotal = qty * cost * (1 - disc / 100);

    totalQty += qty;
    totalAmount += rowTotal;

    const cell = document.getElementById(`po-row-total-${i}`);
    if (cell) cell.textContent = rowTotal > 0 ? `₪${rowTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  });

  const qtyEl = document.getElementById('po-total-qty');
  const amtEl = document.getElementById('po-total-amount');
  if (qtyEl) qtyEl.textContent = totalQty;
  if (amtEl) amtEl.textContent = `₪${totalAmount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Add/remove items ─────────────────────────────────────────
function addPOItemManual() {
  currentPOItems.push({
    brand: '', model: '', color: '', size: '',
    qty_ordered: 1, unit_cost: 0, discount_pct: 0,
    notes: '', inventory_id: null, barcode: ''
  });
  renderPOItemsTable();
}

async function addPOItemByBarcode() {
  const input = document.getElementById('po-barcode-search');
  const barcode = input?.value?.trim();
  if (!barcode) return;

  const { data, error } = await sb.from(T.INV)
    .select('id, barcode, brand_id, model, color, size, cost_price')
    .eq('barcode', barcode)
    .eq('is_deleted', false)
    .limit(1)
    .single();

  if (error || !data) { toast('ברקוד לא נמצא', 'e'); return; }

  currentPOItems.push({
    inventory_id: data.id,
    barcode: data.barcode,
    brand: brandCacheRev[data.brand_id] || '',
    model: data.model || '',
    color: data.color || '',
    size: data.size || '',
    qty_ordered: 1,
    unit_cost: data.cost_price || 0,
    discount_pct: 0,
    notes: ''
  });
  renderPOItemsTable();
  input.value = '';
  toast('פריט נוסף ✓', 's');
}

function removePOItem(index) {
  currentPOItems.splice(index, 1);
  renderPOItemsTable();
}

// ── Save draft ───────────────────────────────────────────────
async function savePODraft() {
  if (!currentPO.supplier_id) { toast('יש לבחור ספק', 'e'); return; }
  if (currentPOItems.length === 0) { toast('יש להוסיף לפחות פריט אחד', 'e'); return; }

  currentPO.expected_date = document.getElementById('po-expected-date')?.value || null;
  currentPO.notes = document.getElementById('po-form-notes')?.value || '';

  try {
    showLoading('שומר טיוטה...');
    let poId = currentPO.id;

    if (!poId) {
      const { data, error } = await sb.from(T.PO).insert({
        po_number:     currentPO.po_number,
        supplier_id:   currentPO.supplier_id,
        order_date:    currentPO.order_date || new Date().toISOString().split('T')[0],
        expected_date: currentPO.expected_date || null,
        notes:         currentPO.notes,
        status:        'draft'
      }).select().single();
      if (error) throw error;
      poId = data.id;
      currentPO.id = poId;
    } else {
      const { error } = await sb.from(T.PO).update({
        supplier_id:   currentPO.supplier_id,
        expected_date: currentPO.expected_date || null,
        notes:         currentPO.notes
      }).eq('id', poId);
      if (error) throw error;
      await sb.from(T.PO_ITEMS).delete().eq('po_id', poId);
    }

    if (currentPOItems.length > 0) {
      const items = currentPOItems.map(item => ({
        po_id:        poId,
        inventory_id: item.inventory_id || null,
        barcode:      item.barcode || null,
        brand:        item.brand || null,
        model:        item.model || null,
        color:        item.color || null,
        size:         item.size || null,
        qty_ordered:  item.qty_ordered || 1,
        qty_received: 0,
        unit_cost:    item.unit_cost || null,
        discount_pct: item.discount_pct || 0,
        notes:        item.notes || null
      }));
      const { error } = await sb.from(T.PO_ITEMS).insert(items);
      if (error) throw error;
    }

    hideLoading();
    toast(`טיוטה ${currentPO.po_number} נשמרה ✓`, 's');
    loadPurchaseOrdersTab();
  } catch (err) {
    hideLoading();
    toast('שגיאה בשמירה: ' + err.message, 'e');
  }
}

// ── Placeholders (step 1.4) ──────────────────────────────────
function openViewPO(id)              { toast('בקרוב — צפייה בהזמנה', 'w'); }
async function sendPurchaseOrder(id) { toast('בקרוב — שליחת הזמנה', 'w'); }
async function cancelPO(id)          { toast('בקרוב — ביטול הזמנה', 'w'); }
