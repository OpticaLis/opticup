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
                    style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ccc; font-size:14px">
              <option value="">\u05D1\u05D7\u05E8 \u05E1\u05E4\u05E7...</option>
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

    // Pre-select supplier if returning from edit
    if (prevSupplier) {
      var sel = document.getElementById('po-step1-supplier');
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
  if (!currentPOItems || !Array.isArray(currentPOItems)) currentPOItems = [];
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
                <th style="padding:8px; width:90px">מחיר סופי</th>
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
