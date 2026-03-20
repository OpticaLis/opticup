// ============================================================
// stock-count-unknown.js — Unknown items: render, edit modal, add to inventory
// Depends on: shared.js (T, getTenantId, escapeHtml, toast, showLoading, hideLoading)
// Depends on: supabase-ops.js (writeLog, fetchAll, generateNextBarcode)
// Depends on: stock-count-report.js (showDiffReport for refresh)
// ============================================================

// ── Render unknown items section for diff report ─────────────
function renderUnknownSection(unknownItems, countId) {
  const rows = unknownItems.map(u => `<tr style="border-bottom:1px solid var(--g200)" id="sc-unknown-row-${u.id}">
    <td style="padding:8px;font-weight:600">${escapeHtml(u.barcode || '—')}</td>
    <td style="padding:8px">${escapeHtml(u.brand || '—')}</td>
    <td style="padding:8px">${escapeHtml(u.model || '—')}</td>
    <td style="padding:8px">${escapeHtml(u.color || '—')}</td>
    <td style="padding:8px">${escapeHtml(u.size || '—')}</td>
    <td style="padding:8px;text-align:center;font-weight:700">${u.actual_qty || 0}</td>
    <td style="padding:8px">${escapeHtml(u.notes || '')}</td>
    <td style="padding:8px;text-align:center">
      <button class="btn btn-s" style="font-size:.78rem;padding:4px 10px;white-space:nowrap"
        onclick="openUnknownItemModal('${escapeHtml(u.id)}','${escapeHtml(countId)}')">&#9998; ערוך והוסף למלאי</button>
    </td>
  </tr>`).join('');

  return `
    <h3 style="color:#d97706;margin:16px 0 8px;text-align:center">
      &#9888;&#65039; <span id="sc-unknown-count">${unknownItems.length}</span> פריטים לא ידועים — ממתינים לאישור מנהל</h3>
    <div id="sc-unknown-table-wrap" style="overflow-x:auto;border:2px solid #d97706;border-radius:8px;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <thead><tr style="background:#d97706;color:white;text-align:right">
          <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
          <th style="padding:8px">צבע</th><th style="padding:8px">גודל</th>
          <th style="padding:8px;text-align:center">כמות</th><th style="padding:8px">הערה</th>
          <th style="padding:8px;text-align:center">פעולה</th>
        </tr></thead>
        <tbody id="sc-unknown-tbody">${rows}</tbody>
      </table>
    </div>`;
}

// ── Open edit modal for unknown item ─────────────────────────
async function openUnknownItemModal(itemId, countId) {
  const tab = document.getElementById('tab-stock-count');
  const unknownItems = tab._scReportUnknownItems || [];
  const item = unknownItems.find(u => u.id === itemId);
  if (!item) { toast('פריט לא נמצא', 'e'); return; }

  // Load brands and suppliers for dropdowns
  let brands = [];
  let suppliers = [];
  try {
    brands = await fetchAll(T.BRANDS, [['active', 'eq', true]]);
    suppliers = await fetchAll(T.SUPPLIERS, [['active', 'eq', true]]);
  } catch (err) { console.warn('Failed to load brands/suppliers for unknown modal', err); }

  const hasBarcode = !!(item.barcode && item.barcode.trim());
  const barcodeNote = hasBarcode
    ? 'ברקוד שנסרק (לא נמצא במערכת)'
    : 'ברקוד ייווצר אוטומטית בפורמט BBDDDDD';

  const brandOptions = brands.map(b =>
    `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
  const supplierOptions = suppliers.map(s =>
    `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

  Modal.form({
    title: 'הוספת פריט לא ידוע למלאי',
    size: 'md',
    submitText: 'הוסף למלאי',
    cancelText: 'ביטול',
    content: `
      <div style="font-size:.82rem;color:var(--g500);margin-bottom:12px;text-align:center">
        ${escapeHtml(barcodeNote)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-weight:600;font-size:.85rem">ברקוד</label>
          <input id="sc-unk-barcode" type="text" value="${escapeHtml(item.barcode || '')}"
            ${hasBarcode ? 'readonly style="background:var(--g100);cursor:not-allowed;width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px"' : 'readonly style="background:var(--g100);cursor:not-allowed;width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px" placeholder="ייווצר אוטומטית"'}>
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">כמות</label>
          <input id="sc-unk-qty" type="number" value="${item.actual_qty || 1}" readonly
            style="background:var(--g100);cursor:not-allowed;width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">מותג *</label>
          <select id="sc-unk-brand" style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px">
            <option value="">— בחר מותג —</option>${brandOptions}
          </select>
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">דגם *</label>
          <input id="sc-unk-model" type="text" value="${escapeHtml(item.model || '')}"
            style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px" placeholder="שם דגם">
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">גודל</label>
          <input id="sc-unk-size" type="text" value="${escapeHtml(item.size || '')}"
            style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">צבע</label>
          <input id="sc-unk-color" type="text" value="${escapeHtml(item.color || '')}"
            style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">ספק</label>
          <select id="sc-unk-supplier" style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px">
            <option value="">— ספק (אופציונלי) —</option>${supplierOptions}
          </select>
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">מחיר עלות</label>
          <input id="sc-unk-cost" type="number" min="0" step="0.01"
            style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px" placeholder="0.00">
        </div>
        <div>
          <label style="font-weight:600;font-size:.85rem">מחיר מכירה</label>
          <input id="sc-unk-sell" type="number" min="0" step="0.01"
            style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px" placeholder="0.00">
        </div>
      </div>`,
    onSubmit: function () {
      saveUnknownToInventory(itemId, countId, hasBarcode);
    }
  });
}

// ── Save unknown item to inventory ───────────────────────────
async function saveUnknownToInventory(itemId, countId, hasBarcode) {
  const brandId = document.getElementById('sc-unk-brand')?.value;
  const model = (document.getElementById('sc-unk-model')?.value || '').trim();
  if (!brandId) { toast('יש לבחור מותג', 'e'); return; }
  if (!model) { toast('יש להזין דגם', 'e'); return; }

  const formData = {
    qty: parseInt(document.getElementById('sc-unk-qty')?.value) || 1,
    size: (document.getElementById('sc-unk-size')?.value || '').trim(),
    color: (document.getElementById('sc-unk-color')?.value || '').trim(),
    supplierId: document.getElementById('sc-unk-supplier')?.value || null,
    costPrice: parseFloat(document.getElementById('sc-unk-cost')?.value) || null,
    sellPrice: parseFloat(document.getElementById('sc-unk-sell')?.value) || null,
    brandId, model
  };
  let barcode = (document.getElementById('sc-unk-barcode')?.value || '').trim();

  try {
    showLoading('בודק ברקוד...');
    if (!hasBarcode || !barcode) {
      barcode = await generateNextBarcode();
    }

    // Check if barcode already exists in this tenant's inventory
    const tenantId = getTenantId();
    const { data: existing } = await sb.from(T.INV)
      .select('id,barcode,brand_id,model,size,color,brands(name)')
      .eq('tenant_id', tenantId)
      .eq('barcode', barcode)
      .eq('is_deleted', false)
      .maybeSingle();
    hideLoading();

    if (existing) {
      // Show choice dialog — let user decide
      _showBarcodeConflictDialog(existing, barcode, itemId, countId, formData);
    } else {
      await _insertNewInventoryItem(barcode, itemId, countId, formData);
    }
  } catch (err) {
    hideLoading();
    toast('שגיאה בהוספת פריט: ' + err.message, 'e');
  }
}

// ── Barcode conflict dialog — ask user to link or create new ──
function _showBarcodeConflictDialog(existing, barcode, itemId, countId, formData) {
  const brandName = existing.brands?.name || '—';
  const modal = Modal.show({
    size: 'sm',
    title: 'ברקוד כבר קיים במלאי',
    content: `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:1.1rem;font-weight:700;color:var(--primary);margin-bottom:8px">
          ${escapeHtml(barcode)}</div>
        <div style="background:var(--g100);border-radius:8px;padding:10px;font-size:.88rem;direction:rtl">
          ${escapeHtml(brandName)} | ${escapeHtml(existing.model || '—')}
          | גודל: ${escapeHtml(existing.size || '—')}
          | צבע: ${escapeHtml(existing.color || '—')}
        </div>
        <p style="margin-top:12px;font-size:.85rem;color:var(--g600)">מה לעשות?</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="sc-conflict-link" class="btn btn-primary" style="width:100%;padding:10px">
          &#128279; קשר לפריט הקיים</button>
        <button id="sc-conflict-new" class="btn btn-secondary" style="width:100%;padding:10px">
          &#10133; צור פריט חדש (ברקוד חדש)</button>
      </div>`,
    closeOnEscape: true,
    closeOnBackdrop: true
  });

  document.getElementById('sc-conflict-link').addEventListener('click', async function () {
    modal.close();
    await _linkToExistingItem(existing.id, barcode, itemId, countId);
  });
  document.getElementById('sc-conflict-new').addEventListener('click', async function () {
    modal.close();
    try {
      showLoading('יוצר ברקוד חדש...');
      const newBarcode = await generateNextBarcode();
      await _insertNewInventoryItem(newBarcode, itemId, countId, formData);
    } catch (err) {
      hideLoading();
      toast('שגיאה: ' + err.message, 'e');
    }
  });
}

// ── Link unknown item to an existing inventory item ───────────
async function _linkToExistingItem(invId, barcode, itemId, countId) {
  try {
    showLoading('מקשר לפריט קיים...');
    writeLog('stock_count.link_unknown', invId, {
      count_id: countId, barcode,
      reason: 'פריט כבר קיים במלאי — קושר לפריט קיים'
    });
    await _markItemMatched(itemId, invId);
    _closeFormAndRemoveRow(itemId);
    toast('קושר לפריט קיים בהצלחה — ברקוד: ' + barcode, 's');
  } catch (err) {
    toast('שגיאה בקישור: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Insert a brand new inventory item ─────────────────────────
async function _insertNewInventoryItem(barcode, itemId, countId, fd) {
  try {
    showLoading('מוסיף פריט למלאי...');
    const tenantId = getTenantId();
    const insertObj = {
      barcode, brand_id: fd.brandId, model: fd.model,
      quantity: fd.qty, status: 'in_stock',
      is_deleted: false, tenant_id: tenantId
    };
    if (fd.size) insertObj.size = fd.size;
    if (fd.color) insertObj.color = fd.color;
    if (fd.supplierId) insertObj.supplier_id = fd.supplierId;
    if (fd.costPrice) insertObj.cost_price = fd.costPrice;
    if (fd.sellPrice) insertObj.sell_price = fd.sellPrice;

    const { data: newRow, error: insErr } = await sb.from(T.INV)
      .insert(insertObj).select().single();
    if (insErr) throw insErr;

    writeLog('stock_count.add_unknown', newRow.id, {
      count_id: countId, barcode, brand_id: fd.brandId,
      model: fd.model, quantity: fd.qty, reason: 'נמצא בספירת מלאי'
    });
    await _markItemMatched(itemId, newRow.id);
    _closeFormAndRemoveRow(itemId);
    toast('פריט נוסף למלאי בהצלחה — ברקוד: ' + barcode, 's');
  } catch (err) {
    toast('שגיאה בהוספת פריט: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Shared: mark stock_count_item as matched ──────────────────
async function _markItemMatched(itemId, invId) {
  const { error } = await sb.from(T.STOCK_COUNT_ITEMS).update({
    status: 'matched', inventory_id: invId
  }).eq('id', itemId);
  if (error) console.warn('Failed to update stock_count_item status:', error);
}

// ── Shared: close form modal + remove unknown row ─────────────
function _closeFormAndRemoveRow(itemId) {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
  _removeUnknownRow(itemId);
}

// ── Remove unknown row from report UI ────────────────────────
function _removeUnknownRow(itemId) {
  const row = document.getElementById('sc-unknown-row-' + itemId);
  if (row) row.remove();

  // Update cached unknown items
  const tab = document.getElementById('tab-stock-count');
  if (tab._scReportUnknownItems) {
    tab._scReportUnknownItems = tab._scReportUnknownItems.filter(u => u.id !== itemId);
  }

  // Update count badge
  const countEl = document.getElementById('sc-unknown-count');
  const tbody = document.getElementById('sc-unknown-tbody');
  const remaining = tbody ? tbody.querySelectorAll('tr').length : 0;
  if (countEl) countEl.textContent = remaining;

  // Hide section if no more unknowns
  if (remaining === 0) {
    const wrap = document.getElementById('sc-unknown-table-wrap');
    if (wrap) wrap.parentElement.querySelectorAll('h3, #sc-unknown-table-wrap').forEach(el => el.style.display = 'none');
  }
}
