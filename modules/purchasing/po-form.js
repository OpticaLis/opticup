// ── New PO ───────────────────────────────────────────────────
async function openNewPurchaseOrder() {
  showLoading('יוצר הזמנה...');
  try {
    const container = document.getElementById('po-list-container2');

    const { data: suppliers } = await sb.from('suppliers')
      .select('id, name').eq('active', true).order('name');

    // Build supplier name→id map for searchable dropdown
    var _poSupMap = {};
    (suppliers || []).forEach(function(s) { _poSupMap[s.name] = s.id; });
    var supplierNames = (suppliers || []).map(function(s) { return s.name; });

    const prevDate = currentPO?.order_date || new Date().toISOString().split('T')[0];
    const prevExpected = currentPO?.expected_date || '';
    const prevNotes = currentPO?.notes || '';
    const prevSupplier = currentPO?.supplier_id || '';

    // Resolve previous supplier name for pre-selection
    var prevSupplierName = '';
    if (prevSupplier) {
      var prevSup = (suppliers || []).find(function(s) { return s.id === prevSupplier; });
      if (prevSup) prevSupplierName = prevSup.name;
    }

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
            <div id="po-step1-supplier-wrap"></div>
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

    // Mount searchable supplier dropdown
    var supSelectEl = createSearchSelect(supplierNames, prevSupplierName, function(name) {
      // Store resolved supplier_id on the wrapper for proceedToPOItems to read
      var wrap = document.getElementById('po-step1-supplier-wrap');
      if (wrap) wrap._selectedSupplierId = _poSupMap[name] || '';
    });
    var supWrap = document.getElementById('po-step1-supplier-wrap');
    if (supWrap) {
      supWrap.appendChild(supSelectEl);
      // Pre-set supplier_id if returning from edit
      if (prevSupplier && prevSupplierName) {
        supWrap._selectedSupplierId = prevSupplier;
      }
    }
  } catch (err) {
    toast('שגיאה: ' + err.message, 'e');
  }
  hideLoading();
}

async function proceedToPOItems() {
  var supWrap = document.getElementById('po-step1-supplier-wrap');
  var supplierId = supWrap ? supWrap._selectedSupplierId || '' : '';
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

        <div id="po-brand-filter-bar" style="margin-bottom:8px;display:flex;align-items:center;gap:8px">
          <label style="font-size:13px;color:#555">\u05E1\u05E0\u05DF \u05DC\u05E4\u05D9 \u05DE\u05D5\u05EA\u05D2:</label>
          <select id="po-brand-filter" onchange="_filterPOByBrand(this.value)" style="padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px">
            <option value="">\u05D4\u05DB\u05DC</option>
          </select>
        </div>

        <div style="overflow-x:auto">
          <table id="po-items-table" style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#1a2744; color:white; text-align:right">
                <th style="padding:8px" data-sort-key="brand">מותג</th>
                <th style="padding:8px" data-sort-key="model">דגם</th>
                <th style="padding:8px" data-sort-key="color">צבע</th>
                <th style="padding:8px" data-sort-key="size">\u05D2\u05D5\u05D3\u05DC</th>
                <th style="padding:8px; width:65px">\u05E1\u05D5\u05D2</th>
                <th style="padding:8px; width:70px" data-sort-key="qty_ordered">\u05DB\u05DE\u05D5\u05EA</th>
                <th style="padding:8px; width:90px" data-sort-key="unit_cost">עלות ₪</th>
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
