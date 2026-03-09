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
async function generatePoNumber(supplierId) {
  const supNum = supplierNumCache[supplierId];
  if (!supNum) { toast('ספק ללא מספר — פנה למנהל', 'e'); return null; }
  const prefix = `PO-${supNum}-`;
  const { data } = await sb.from(T.PO)
    .select('po_number')
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1);
  let seq = 1;
  if (data?.length) {
    const parts = data[0].po_number.split('-');
    seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── New PO ───────────────────────────────────────────────────
async function openNewPurchaseOrder() {
  showLoading('יוצר הזמנה...');
  try {
    const container = document.getElementById('po-list-container2');

    const { data: suppliers } = await sb.from('suppliers')
      .select('id, name').eq('active', true).order('name');

    const supplierOptions = (suppliers || [])
      .map(s => `<option value="${s.id}"${currentPO?.supplier_id === s.id ? ' selected' : ''}>${s.name}</option>`).join('');

    const prevDate = currentPO?.order_date || new Date().toISOString().split('T')[0];
    const prevExpected = currentPO?.expected_date || '';
    const prevNotes = currentPO?.notes || '';
    const prevSupplier = currentPO?.supplier_id || '';

    container.innerHTML = `
      <div style="padding:16px; max-width:600px; margin:0 auto">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
          <h2 style="margin:0">📋 הזמנת רכש חדשה</h2>
          <button onclick="loadPurchaseOrdersTab()" class="btn btn-g">← חזרה לרשימה</button>
        </div>
        <div style="background:white; padding:24px; border-radius:10px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.1)">
          <div style="margin-bottom:16px">
            <label style="display:block; margin-bottom:6px; font-weight:600">
              ספק <span style="color:#ef4444">*</span>
            </label>
            <select id="po-step1-supplier"
                    style="width:100%; padding:9px 12px; border-radius:6px;
                           border:1px solid #ccc; font-size:15px">
              <option value="">בחר ספק...</option>
              ${supplierOptions}
            </select>
          </div>
          <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px">
            <div style="flex:1; min-width:160px">
              <label style="display:block; margin-bottom:6px; font-weight:600">תאריך הזמנה</label>
              <input type="date" id="po-step1-order-date" value="${prevDate}"
                     style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #ccc">
            </div>
            <div style="flex:1; min-width:160px">
              <label style="display:block; margin-bottom:6px; font-weight:600">תאריך הגעה צפוי</label>
              <input type="date" id="po-step1-expected-date" value="${prevExpected}"
                     style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #ccc">
            </div>
          </div>
          <div style="margin-bottom:20px">
            <label style="display:block; margin-bottom:6px; font-weight:600">הערות</label>
            <input type="text" id="po-step1-notes" placeholder="הערות להזמנה..." value="${prevNotes}"
                   style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #ccc">
          </div>
          <button onclick="proceedToPOItems()"
                  class="btn btn-p" style="width:100%; padding:11px; font-size:15px">
            המשך להוספת פריטים ←
          </button>
        </div>
      </div>`;

    // Restore previous supplier selection if returning from step 2
    if (prevSupplier) {
      const sel = document.getElementById('po-step1-supplier');
      if (sel) sel.value = prevSupplier;
    }
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
  }
  hideLoading();
}

async function proceedToPOItems() {
  const supplierId = document.getElementById('po-step1-supplier')?.value;
  if (!supplierId) {
    toast('יש לבחור ספק', 'e');
    return;
  }
  // Keep existing PO number if returning from edit, otherwise generate new
  let poNumber = currentPO?.po_number;
  if (!poNumber || !currentPO?.id) {
    poNumber = await generatePoNumber(supplierId);
    if (!poNumber) return;
  }
  currentPO = {
    id: currentPO?.id || null,
    po_number:     poNumber,
    supplier_id:   supplierId,
    order_date:    document.getElementById('po-step1-order-date')?.value || new Date().toISOString().split('T')[0],
    expected_date: document.getElementById('po-step1-expected-date')?.value || '',
    notes:         document.getElementById('po-step1-notes')?.value || ''
  };
  if (!currentPOItems) currentPOItems = [];
  renderPOForm(false);
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
      notes: it.notes || '',
      sell_price: it.sell_price || null,
      sell_discount: it.sell_discount || 0,
      website_sync: it.website_sync || null,
      product_type: it.product_type || null,
      bridge: it.bridge || null,
      temple_length: it.temple_length || null
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

      <div style="background:white; padding:12px 16px; border-radius:10px;
                  box-shadow:0 1px 4px rgba(0,0,0,0.1); margin-bottom:16px;
                  display:flex; gap:20px; flex-wrap:wrap; align-items:center">
        <div><strong>מספר הזמנה:</strong> ${currentPO.po_number}</div>
        <div id="po-supplier-name-display"><strong>ספק:</strong> טוען...</div>
        <div><strong>תאריך הגעה:</strong> ${currentPO.expected_date ? new Date(currentPO.expected_date).toLocaleDateString('he-IL') : '—'}</div>
        ${currentPO.notes ? `<div><strong>הערות:</strong> ${currentPO.notes}</div>` : ''}
        <button onclick="openNewPurchaseOrder()"
                style="margin-right:auto; background:none; border:1px solid #ccc;
                       border-radius:6px; padding:4px 10px; cursor:pointer; font-size:13px">
          ✏️ ערוך פרטים
        </button>
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
        ${currentPOItems.length > 0 ? `
        <button onclick="exportPOExcel()" class="btn" style="background:#217346; color:white; padding:9px 18px">📊 ייצוא Excel</button>
        <button onclick="exportPOPdf()" class="btn" style="background:#c0392b; color:white; padding:9px 18px">📄 ייצוא PDF</button>
        ` : ''}
        <button onclick="savePODraft()" class="btn btn-s" style="padding:9px 24px">💾 שמור טיוטה</button>
      </div>
    </div>`;

  renderPOItemsTable();
  resolveSupplierName();
}

async function resolveSupplierName() {
  if (!currentPO?.supplier_id) return;
  const { data } = await sb.from('suppliers')
    .select('name').eq('id', currentPO.supplier_id).single();
  const el = document.getElementById('po-supplier-name-display');
  if (el && data) el.innerHTML = `<strong>ספק:</strong> ${data.name}`;
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
function ensurePOBrandDatalist() {
  if (document.getElementById('po-brand-list')) return;
  const dl = document.createElement('datalist');
  dl.id = 'po-brand-list';
  Object.keys(brandCache).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    dl.appendChild(opt);
  });
  document.body.appendChild(dl);
}

async function loadPOModelsForBrand(i, brandName) {
  const brandId = brandCache[brandName];
  if (!brandId) return;
  const { data } = await sb.from(T.INV)
    .select('model')
    .eq('brand_id', brandId)
    .eq('is_deleted', false)
    .order('model');
  const models = [...new Set((data||[]).map(r=>r.model).filter(Boolean))].sort();
  const listId = `po-model-list-${i}`;
  let dl = document.getElementById(listId);
  if (!dl) { dl = document.createElement('datalist'); dl.id = listId; document.body.appendChild(dl); }
  dl.innerHTML = models.map(m => `<option value="${m}">`).join('');
  currentPOItems[i].model = '';
  currentPOItems[i].color = '';
  currentPOItems[i].size  = '';
  const row = document.querySelector(`tr[data-po-row="${i}"]`);
  if (row) {
    row.querySelector('.po-model-input').value = '';
    row.querySelector('.po-color-input').value = '';
    row.querySelector('.po-size-input').value  = '';
  }
  row?.querySelector('.po-model-input')?.setAttribute('list', listId);
}

async function loadPOColorsAndSizes(i, brandName, model) {
  const brandId = brandCache[brandName];
  if (!brandId || !model) return;
  const { data } = await sb.from(T.INV)
    .select('color, size, quantity')
    .eq('brand_id', brandId)
    .eq('model', model)
    .eq('is_deleted', false);
  const colors = [...new Set((data||[]).map(r=>r.color).filter(Boolean))].sort();
  const sizes  = [...new Set((data||[]).map(r=>r.size).filter(Boolean))].sort();
  const colorListId = `po-color-list-${i}`;
  const sizeListId  = `po-size-list-${i}`;
  let cdl = document.getElementById(colorListId);
  if (!cdl) { cdl = document.createElement('datalist'); cdl.id = colorListId; document.body.appendChild(cdl); }
  cdl.innerHTML = colors.map(c => `<option value="${c}">`).join('');
  let sdl = document.getElementById(sizeListId);
  if (!sdl) { sdl = document.createElement('datalist'); sdl.id = sizeListId; document.body.appendChild(sdl); }
  sdl.innerHTML = sizes.map(s => `<option value="${s}">`).join('');
  const row = document.querySelector(`tr[data-po-row="${i}"]`);
  row?.querySelector('.po-color-input')?.setAttribute('list', colorListId);
  row?.querySelector('.po-size-input')?.setAttribute('list', sizeListId);
  const totalQty = (data||[]).reduce((sum, r) => sum + (r.quantity||0), 0);
  if (totalQty > 0) {
    toast(`⚠️ ${brandName} ${model} קיים במלאי (${totalQty} יח')`, 'w');
  }
}

function renderPOItemsTable() {
  const tbody = document.getElementById('po-items-tbody');
  const tfoot = document.getElementById('po-items-tfoot');
  if (!tbody || !tfoot) return;

  ensurePOBrandDatalist();

  if (currentPOItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888">אין פריטים — לחץ "+ שורה ידנית" או חפש ברקוד</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = currentPOItems.map((item, i) => `
    <tr data-po-row="${i}">
      <td><input value="${item.brand || ''}" list="po-brand-list" class="po-brand-input" oninput="currentPOItems[${i}].brand=this.value; loadPOModelsForBrand(${i},this.value)" placeholder="מותג..." style="width:110px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.model || ''}" class="po-model-input" oninput="currentPOItems[${i}].model=this.value; loadPOColorsAndSizes(${i},currentPOItems[${i}].brand,this.value)" style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.color || ''}" class="po-color-input" oninput="currentPOItems[${i}].color=this.value" style="width:70px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${item.size || ''}" class="po-size-input" oninput="currentPOItems[${i}].size=this.value" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="1" value="${item.qty_ordered || 1}"
                 oninput="currentPOItems[${i}].qty_ordered=+this.value; updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" step="0.01" value="${item.unit_cost || ''}"
                 oninput="currentPOItems[${i}].unit_cost=+this.value; updatePOTotals()" style="width:75px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" max="100" step="0.1" value="${item.discount_pct || 0}"
                 oninput="currentPOItems[${i}].discount_pct=+this.value; updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td id="po-row-total-${i}" style="text-align:center; font-weight:600; padding:8px">—</td>
      <td>
        <button onclick="togglePOItemDetails(${i})" style="background:none;border:none;cursor:pointer;font-size:14px" title="פרטים נוספים">&#9660;</button>
        <button onclick="duplicatePOItem(${i})" title="שכפל שורה" style="background:none;border:none;cursor:pointer;font-size:14px;color:#2196F3;padding:2px 4px">&#10697;</button>
        <button onclick="removePOItem(${i})" style="background:none;border:none;cursor:pointer;color:#f44336;font-size:16px">&#10005;</button>
      </td>
    </tr>
    <tr id="po-item-details-${i}" style="display:none; background:#f8f9fa">
      <td colspan="9" style="padding:8px 16px">
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:end">
          <div><label style="font-size:12px;display:block">מחיר מכירה ₪</label>
            <input type="number" min="0" step="0.01" value="${item.sell_price||''}"
                   oninput="currentPOItems[${i}].sell_price=+this.value"
                   style="width:90px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">הנחת מכירה %</label>
            <input type="number" min="0" max="100" step="0.1" value="${item.sell_discount ? item.sell_discount*100 : 0}"
                   oninput="currentPOItems[${i}].sell_discount=this.value/100"
                   style="width:70px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">סוג מוצר</label>
            <select oninput="currentPOItems[${i}].product_type=this.value"
                    style="padding:4px 6px;border-radius:4px;border:1px solid #ccc">
              <option value="">—</option>
              <option value="eyeglasses" ${item.product_type==='eyeglasses'?'selected':''}>משקפי ראייה</option>
              <option value="sunglasses" ${item.product_type==='sunglasses'?'selected':''}>משקפי שמש</option>
            </select></div>
          <div><label style="font-size:12px;display:block">סנכרון אתר</label>
            <select oninput="currentPOItems[${i}].website_sync=this.value"
                    style="padding:4px 6px;border-radius:4px;border:1px solid #ccc">
              <option value="">—</option>
              <option value="full" ${item.website_sync==='full'?'selected':''}>מלא</option>
              <option value="display" ${item.website_sync==='display'?'selected':''}>תצוגה</option>
              <option value="none" ${item.website_sync==='none'?'selected':''}>ללא</option>
            </select></div>
          <div><label style="font-size:12px;display:block">גשר</label>
            <input type="text" value="${item.bridge||''}" oninput="currentPOItems[${i}].bridge=this.value"
                   style="width:60px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">אורך מוט</label>
            <input type="text" value="${item.temple_length||''}" oninput="currentPOItems[${i}].temple_length=this.value"
                   style="width:60px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
        </div>
      </td>
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

function duplicatePOItem(i) {
  const orig = currentPOItems[i];
  const copy = { ...orig, size: '' };
  const key = `${copy.brand}|${copy.model}|${copy.color}|${copy.size}`;
  const conflict = copy.size !== '' && currentPOItems.some((it, idx) =>
    idx !== i && `${it.brand}|${it.model}|${it.color}|${it.size}` === key
  );
  if (conflict) {
    toast('פריט זהה כבר קיים ברשימה', 'e');
    return;
  }
  currentPOItems.splice(i + 1, 0, copy);
  renderPOItemsTable();
}

function togglePOItemDetails(i) {
  const row = document.getElementById(`po-item-details-${i}`);
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
}

// ── Export Excel ─────────────────────────────────────────────
async function exportPOExcel() {
  if (!currentPOItems.length) { toast('אין פריטים להזמנה', 'e'); return; }
  const { data: sup } = await sb.from(T.SUPPLIERS)
    .select('name').eq('id', currentPO.supplier_id).single();
  const supplierName = sup?.name || '';
  const headerRows = [
    ['הזמנת רכש', currentPO.po_number],
    ['ספק', supplierName],
    ['תאריך הזמנה', currentPO.order_date || ''],
    ['תאריך הגעה צפוי', currentPO.expected_date || ''],
    ['הערות', currentPO.notes || ''],
    [],
    ['מותג', 'דגם', 'צבע', 'גודל', 'כמות', 'עלות יח\'', 'הנחה %', 'סה"כ שורה']
  ];
  const itemRows = currentPOItems.map(it => {
    const lineTotal = (it.qty_ordered || 0) * (it.unit_cost || 0) * (1 - (it.discount_pct || 0) / 100);
    return [
      it.brand || '', it.model || '', it.color || '', it.size || '',
      it.qty_ordered || 0, it.unit_cost || 0, it.discount_pct || 0,
      +lineTotal.toFixed(2)
    ];
  });
  const grandTotal = currentPOItems.reduce((sum, it) =>
    sum + (it.qty_ordered||0) * (it.unit_cost||0) * (1-(it.discount_pct||0)/100), 0);
  const totalRow = ['', '', '', '', '', '', 'סה"כ הזמנה:', +grandTotal.toFixed(2)];
  const allRows = [...headerRows, ...itemRows, [], totalRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws['!cols'] = [{wch:14},{wch:14},{wch:10},{wch:8},{wch:7},{wch:10},{wch:8},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'הזמנת רכש');
  XLSX.writeFile(wb, `${currentPO.po_number}-${supplierName}.xlsx`);
  toast('קובץ Excel הורד ✓', 's');
}

// ── Export PDF ───────────────────────────────────────────────
async function exportPOPdf() {
  if (!currentPOItems.length) { toast('אין פריטים להזמנה', 'e'); return; }
  const { data: sup } = await sb.from(T.SUPPLIERS)
    .select('name').eq('id', currentPO.supplier_id).single();
  const supplierName = sup?.name || '';
  const grandTotal = currentPOItems.reduce((sum, it) =>
    sum + (it.qty_ordered||0) * (it.unit_cost||0) * (1-(it.discount_pct||0)/100), 0);
  const itemRows = currentPOItems.map((it, idx) => {
    const lineTotal = (it.qty_ordered||0) * (it.unit_cost||0) * (1-(it.discount_pct||0)/100);
    return `<tr>
      <td>${idx+1}</td><td>${it.brand||''}</td><td>${it.model||''}</td>
      <td>${it.color||''}</td><td>${it.size||''}</td><td>${it.qty_ordered||0}</td>
      <td>${(it.unit_cost||0).toFixed(2)}</td><td>${it.discount_pct||0}%</td>
      <td><strong>${lineTotal.toFixed(2)}</strong></td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>הזמנת רכש ${currentPO.po_number}</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;direction:rtl;color:#222}
  h1{font-size:22px;margin-bottom:4px}
  .meta{display:flex;gap:32px;margin-bottom:20px;font-size:14px;color:#555}
  .meta span strong{color:#222}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a2744;color:white;padding:8px;text-align:right}
  td{padding:7px 8px;border-bottom:1px solid #eee;text-align:right}
  tr:nth-child(even) td{background:#f9f9f9}
  .total-row td{font-weight:bold;border-top:2px solid #1a2744;font-size:14px}
  .footer{margin-top:30px;font-size:12px;color:#888}
  @media print{body{padding:10px}}
</style></head>
<body>
  <h1>📋 הזמנת רכש — ${currentPO.po_number}</h1>
  <div class="meta">
    <span><strong>ספק:</strong> ${supplierName}</span>
    <span><strong>תאריך:</strong> ${currentPO.order_date || '—'}</span>
    <span><strong>הגעה צפויה:</strong> ${currentPO.expected_date || '—'}</span>
    ${currentPO.notes ? `<span><strong>הערות:</strong> ${currentPO.notes}</span>` : ''}
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>מותג</th><th>דגם</th><th>צבע</th><th>גודל</th>
      <th>כמות</th><th>עלות יח'</th><th>הנחה</th><th>סה"כ</th>
    </tr></thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="8" style="text-align:left">סה"כ הזמנה:</td>
        <td>${grandTotal.toFixed(2)} ₪</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">הופק על ידי מערכת אופטיק אפ • ${new Date().toLocaleDateString('he-IL')}</div>
</body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
  toast('PDF נפתח להדפסה ✓', 's');
}

// ── Save draft ───────────────────────────────────────────────
async function savePODraft() {
  if (!currentPO.supplier_id) { toast('יש לבחור ספק', 'e'); return; }
  if (currentPOItems.length === 0) { toast('יש להוסיף לפחות פריט אחד', 'e'); return; }

  // Required fields validation
  for (let idx = 0; idx < currentPOItems.length; idx++) {
    const it = currentPOItems[idx];
    const missing = [];
    if (!it.brand)     missing.push('מותג');
    if (!it.model)     missing.push('דגם');
    if (!it.color)     missing.push('צבע');
    if (!it.size)      missing.push('גודל');
    if (!it.qty_ordered || it.qty_ordered < 1) missing.push('כמות');
    if (!it.unit_cost  || it.unit_cost  < 0)   missing.push('עלות ש"ח');
    if (missing.length) {
      toast(`שורה ${idx+1}: חסרים שדות — ${missing.join(', ')}`, 'e');
      return;
    }
  }

  // Duplicate rows check
  const seen = new Set();
  for (let idx = 0; idx < currentPOItems.length; idx++) {
    const it = currentPOItems[idx];
    const key = `${it.brand}|${it.model}|${it.color}|${it.size}`;
    if (seen.has(key)) {
      toast(`שורות כפולות: אותו פריט מופיע פעמיים — ${it.brand} ${it.model} ${it.color} ${it.size}`, 'e');
      return;
    }
    seen.add(key);
  }

  // expected_date and notes are already set in currentPO from step 1

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
        notes:        item.notes || null,
        sell_price:    item.sell_price || null,
        sell_discount: item.sell_discount || 0,
        website_sync:  item.website_sync || null,
        product_type:  item.product_type || null,
        bridge:        item.bridge || null,
        temple_length: item.temple_length || null
      }));
      const { error } = await sb.from(T.PO_ITEMS).insert(items);
      if (error) throw error;
    }

    hideLoading();
    toast(`טיוטה ${currentPO.po_number} נשמרה ✓`, 's');
    loadPurchaseOrdersTab();
    refreshLowStockBanner();
  } catch (err) {
    hideLoading();
    toast('שגיאה בשמירה: ' + err.message, 'e');
  }
}

// ── Send PO ──────────────────────────────────────────────────
async function sendPurchaseOrder(id) {
  const confirmed = await confirmDialog('שליחת הזמנה', 'לשלוח את ההזמנה? לאחר השליחה לא ניתן יהיה לערוך אותה.');
  if (!confirmed) return;
  try {
    showLoading();
    const { error } = await sb.from(T.PO)
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('status', 'draft');
    if (error) throw error;
    hideLoading();
    toast('ההזמנה נשלחה ✓', 's');
    await writeLog('po_created', null, { source_ref: id, reason: 'הזמנת רכש נשלחה' });
    loadPurchaseOrdersTab();
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ── Cancel PO ────────────────────────────────────────────────
async function cancelPO(id) {
  const confirmed = await confirmDialog('ביטול הזמנה', 'לבטל את ההזמנה? פעולה זו אינה הפיכה.');
  if (!confirmed) return;
  try {
    showLoading();
    const { error } = await sb.from(T.PO)
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
    hideLoading();
    toast('ההזמנה בוטלה', 's');
    loadPurchaseOrdersTab();
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ── View PO (read-only) ─────────────────────────────────────
async function openViewPO(id) {
  try {
    showLoading();
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(name)')
      .eq('id', id).single();
    if (e1) throw e1;
    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', id);
    if (e2) throw e2;
    hideLoading();

    // Set currentPO/currentPOItems so export functions work
    currentPO = { po_number: po.po_number, supplier_id: po.supplier_id,
                  order_date: po.order_date, expected_date: po.expected_date,
                  notes: po.notes };
    currentPOItems = (items || []).map(it => ({ ...it }));

    const statusLabel = {
      draft:'טיוטה', sent:'נשלחה', partial:'קבלה חלקית',
      received:'התקבל', cancelled:'בוטל'
    };
    const statusColor = {
      draft:'#9e9e9e', sent:'#2196F3', partial:'#FF9800',
      received:'#4CAF50', cancelled:'#f44336'
    };

    const itemRows = (items || []).map(item => {
      const total = (item.qty_ordered||0) * (item.unit_cost||0) * (1 - (item.discount_pct||0)/100);
      const received = item.qty_received || 0;
      const ordered  = item.qty_ordered  || 0;
      const rowColor = received >= ordered ? '#e8f5e9' : received > 0 ? '#fff8e1' : '';
      return `<tr style="background:${rowColor}">
        <td style="padding:8px">${item.brand||'—'}</td>
        <td style="padding:8px">${item.model||'—'}</td>
        <td style="padding:8px">${item.color||'—'}</td>
        <td style="padding:8px">${item.size||'—'}</td>
        <td style="padding:8px; text-align:center">${ordered}</td>
        <td style="padding:8px; text-align:center; font-weight:600">${received}</td>
        <td style="padding:8px; text-align:center">${item.unit_cost ? '₪'+Number(item.unit_cost).toFixed(2) : '—'}</td>
        <td style="padding:8px; text-align:center">${item.discount_pct||0}%</td>
        <td style="padding:8px; text-align:center; font-weight:600">₪${total.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const grandTotal = (items||[]).reduce((sum, item) => {
      return sum + (item.qty_ordered||0) * (item.unit_cost||0) * (1-(item.discount_pct||0)/100);
    }, 0);

    const container = document.getElementById('po-list-container2');
    const importBtn = po.status === 'received'
      ? `<button onclick="importPOToInventory('${po.id}')" class="btn btn-p" style="padding:8px 18px; margin-left:8px">📥 קלוט למלאי</button>`
      : '';

    container.innerHTML = `
      <div style="padding:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
          <h2 style="margin:0">📋 ${po.po_number || '—'}
            <span style="font-size:15px; color:${statusColor[po.status]||'#888'}; margin-right:10px">
              ${statusLabel[po.status]||po.status}
            </span>
          </h2>
          <div>
            ${importBtn}
            <button onclick="loadPurchaseOrdersTab()" class="btn btn-g" style="padding:6px 14px">← חזרה לרשימה</button>
          </div>
        </div>
        <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px;
                    background:white; padding:16px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.1)">
          <div><strong>ספק:</strong> ${po.suppliers?.name||'—'}</div>
          <div><strong>תאריך הזמנה:</strong> ${po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—'}</div>
          <div><strong>תאריך צפוי:</strong> ${po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—'}</div>
          ${po.notes ? `<div><strong>הערות:</strong> ${po.notes}</div>` : ''}
        </div>
        <div style="background:white; padding:16px; border-radius:10px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.1); overflow-x:auto">
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#1a2744; color:white; text-align:right">
                <th style="padding:8px">מותג</th>
                <th style="padding:8px">דגם</th>
                <th style="padding:8px">צבע</th>
                <th style="padding:8px">גודל</th>
                <th style="padding:8px">הוזמן</th>
                <th style="padding:8px">התקבל</th>
                <th style="padding:8px">עלות</th>
                <th style="padding:8px">הנחה</th>
                <th style="padding:8px">סה"כ</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="font-weight:700; border-top:2px solid #1a2744">
                <td colspan="8" style="padding:8px; text-align:left">סה"כ להזמנה:</td>
                <td style="padding:8px; font-size:15px">₪${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
          <button onclick="exportPOExcel()" style="background:#217346; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">📊 ייצוא Excel</button>
          <button onclick="exportPOPdf()" style="background:#c0392b; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">📄 ייצוא PDF</button>
        </div>
      </div>`;
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ── Import PO items to inventory ─────────────────────────────
async function importPOToInventory(poId) {
  const confirmed = await confirmDialog('קליטה למלאי', 'לקלוט את כל פריטי ההזמנה למלאי הראשי?');
  if (!confirmed) return;

  try {
    showLoading('קולט למלאי...');

    // Fetch PO + items
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(id, name)')
      .eq('id', poId).single();
    if (e1) throw e1;

    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', poId);
    if (e2) throw e2;

    if (!items || items.length === 0) {
      hideLoading();
      toast('אין פריטים בהזמנה', 'e');
      return;
    }

    let created = 0, updated = 0, errors = 0;

    for (const item of items) {
      const qty = item.qty_received || item.qty_ordered || 1;
      if (qty <= 0) continue;

      try {
        // Try to find existing inventory item by barcode or brand+model+color+size
        let existing = null;
        if (item.barcode) {
          const { data } = await sb.from(T.INV)
            .select('id, quantity')
            .eq('barcode', item.barcode)
            .eq('is_deleted', false)
            .limit(1).single();
          existing = data;
        }
        if (!existing && item.brand && item.model) {
          const brandId = brandCache[item.brand];
          if (brandId) {
            const { data } = await sb.from(T.INV)
              .select('id, quantity')
              .eq('brand_id', brandId)
              .eq('model', item.model)
              .eq('color', item.color || '')
              .eq('size', item.size || '')
              .eq('is_deleted', false)
              .limit(1).single();
            existing = data;
          }
        }

        if (existing) {
          // Update quantity
          const { error } = await sb.from(T.INV)
            .update({ quantity: (existing.quantity || 0) + qty })
            .eq('id', existing.id);
          if (error) throw error;
          await writeLog('qty_add', existing.id, { delta: qty, reason: `קליטה מ-PO ${po.po_number}` });
          updated++;
        } else {
          // Create new inventory item
          const brandId = item.brand ? brandCache[item.brand] : null;
          const newItem = {
            supplier_id:   po.supplier_id || null,
            brand_id:      brandId || null,
            model:         item.model || '',
            color:         item.color || '',
            size:          item.size || '',
            quantity:       qty,
            cost_price:    item.unit_cost || null,
            cost_discount: item.discount_pct ? item.discount_pct / 100 : 0,
            sell_price:    item.sell_price || null,
            sell_discount: item.sell_discount || 0,
            product_type:  item.product_type || null,
            website_sync:  item.website_sync || null,
            bridge:        item.bridge || null,
            temple_length: item.temple_length || null,
            status:        'במלאי',
            source:        'הזמנת רכש',
            is_deleted:    false
          };
          // Generate barcode if needed
          if (item.barcode) {
            newItem.barcode = item.barcode;
          } else if (typeof maxBarcode !== 'undefined') {
            maxBarcode++;
            newItem.barcode = String(maxBarcode);
          }
          const { data: created_item, error } = await sb.from(T.INV).insert(newItem).select('id').single();
          if (error) throw error;
          await writeLog('item_created', created_item.id, { reason: `קליטה מ-PO ${po.po_number}` });
          created++;
        }
      } catch (itemErr) {
        console.error('Import item error:', itemErr);
        errors++;
      }
    }

    hideLoading();
    const msg = `קליטה הושלמה: ${created} חדשים, ${updated} עודכנו` + (errors > 0 ? `, ${errors} שגיאות` : '');
    toast(msg, errors > 0 ? 'w' : 's');
    await writeLog('po_imported', null, { source_ref: poId, reason: `קלוט למלאי: ${po.po_number}` });
    refreshLowStockBanner();
    openViewPO(poId);
  } catch (err) {
    hideLoading();
    toast('שגיאה בקליטה: ' + err.message, 'e');
  }
}

async function createPOForBrand(brandId, brandName) {
  try {
    showLoading('מכין הזמנה...');
    const { data: invItems } = await sb.from('inventory')
      .select('supplier_id, brand_id, model, color, size, cost_price')
      .eq('brand_id', brandId)
      .eq('is_deleted', false)
      .not('supplier_id', 'is', null)
      .limit(50);
    if (!invItems || invItems.length === 0) {
      hideLoading();
      toast(`לא נמצא ספק למותג ${brandName}`, 'e');
      return;
    }
    // Use most common supplier
    const supplierCount = {};
    invItems.forEach(i => {
      if (i.supplier_id) supplierCount[i.supplier_id] = (supplierCount[i.supplier_id] || 0) + 1;
    });
    const topSupplierId = Object.entries(supplierCount)
      .sort((a, b) => b[1] - a[1])[0][0];

    const poNumber = await generatePoNumber();
    currentPO = {
      po_number: poNumber,
      supplier_id: topSupplierId,
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: `הזמנה אוטומטית — מלאי נמוך: ${brandName}`
    };
    // Add unique models of this brand
    const seen = new Set();
    currentPOItems = [];
    invItems.forEach(item => {
      const key = `${item.model}|${item.color}|${item.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        currentPOItems.push({
          inventory_id: null,
          barcode: '',
          brand: brandName,
          model: item.model || '',
          color: item.color || '',
          size: item.size || '',
          qty_ordered: 1,
          unit_cost: item.cost_price || 0,
          discount_pct: 0,
          notes: ''
        });
      }
    });
    hideLoading();
    showTab('purchase-orders');
    // Wait for loadPurchaseOrdersTab to finish, then render form on top
    setTimeout(() => {
      renderPOForm(false);
      toast(`טופס PO נפתח עבור ${brandName} (${currentPOItems.length} פריטים)`, 's');
    }, 500);
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}
