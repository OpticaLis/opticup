var _currentViewPoId = null;
// ── View PO (read-only) ─────────────────────────────────────
async function openViewPO(id) {
  _currentViewPoId = id;
  try {
    showLoading();
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(name)')
      .eq('id', id).eq('tenant_id', getTenantId()).single();
    if (e1) throw e1;
    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', id).eq('tenant_id', getTenantId());
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

    const showStatusCol = po.status === 'partial' || po.status === 'received';

    // Fetch receipt items for this PO to determine item-level reasons
    var receiptItemMap = {};
    if (showStatusCol) {
      try {
        var { data: receipts } = await sb.from(T.RECEIPTS).select('id')
          .eq('po_id', id).eq('tenant_id', getTenantId());
        if (receipts && receipts.length) {
          var receiptIds = receipts.map(function(r) { return r.id; });
          var { data: rItems } = await sb.from(T.RECEIPT_ITEMS)
            .select('brand, model, color, size, receipt_status, po_match_status')
            .in('receipt_id', receiptIds).eq('tenant_id', getTenantId());
          (rItems || []).forEach(function(ri) {
            var key = [ri.brand, ri.model, ri.size, ri.color].map(function(s) { return (s||'').trim().toLowerCase(); }).join('|');
            if (!receiptItemMap[key]) receiptItemMap[key] = [];
            receiptItemMap[key].push(ri);
          });
        }
      } catch (e) { console.warn('Receipt items fetch skipped:', e); }
    }

    // Editable sell price: allowed on sent/partial POs
    var canEditPrices = (po.status === 'sent' || po.status === 'partial' || po.status === 'draft');

    const itemRows = (items || []).map((item, idx) => {
      const total = (item.qty_ordered||0) * (item.unit_cost||0) * (1 - (item.discount_pct||0)/100);
      const received = item.qty_received || 0;
      const ordered  = item.qty_ordered  || 0;
      const fullyReceived = received >= ordered;
      const rowColor = fullyReceived ? '#e8f5e9' : received > 0 ? '#fff8e1' : '';
      var actionCell = '';
      if (showStatusCol) {
        if (fullyReceived) {
          actionCell = '<td style="padding:8px;text-align:center;color:#4CAF50">\u2705</td>';
        } else {
          var key = [item.brand, item.model, item.size, item.color].map(function(s) { return (s||'').trim().toLowerCase(); }).join('|');
          var riList = receiptItemMap[key] || [];
          var hasReturn = riList.some(function(ri) { return ri.receipt_status === 'return' || ri.po_match_status === 'returned'; });
          var hasNotReceived = riList.some(function(ri) { return ri.receipt_status === 'not_received' || ri.po_match_status === 'not_received'; });
          var badge = '';
          if (hasReturn) {
            badge = '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:11px">\uD83D\uDD04 \u05E0\u05E9\u05DC\u05D7 \u05DC\u05D6\u05D9\u05DB\u05D5\u05D9</span>';
          } else if (hasNotReceived) {
            badge = '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px">\u274C \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2</span>';
          } else if (riList.length === 0) {
            badge = '<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:4px;font-size:11px">\u05DE\u05DE\u05EA\u05D9\u05DF</span>';
          } else {
            badge = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px">\u05D7\u05E1\u05E8</span>';
          }
          var cancelBtn = '';
          if (po.status === 'partial') {
            cancelBtn = ' <button class="btn btn-sm btn-po-cancel-item" ' +
              'data-item-id="' + escapeHtml(item.id) + '" data-po-id="' + escapeHtml(po.id) + '" ' +
              'data-received="' + received + '" ' +
              'style="background:#ef4444;color:#fff;font-size:11px;padding:2px 8px" ' +
              'title="\u05D1\u05D8\u05DC \u05E9\u05D5\u05E8\u05D4 \u2014 \u05E7\u05D1\u05DC \u05E8\u05E7 \u05DE\u05D4 \u05E9\u05D4\u05D2\u05D9\u05E2">\u274C \u05D1\u05D8\u05DC</button>';
          }
          actionCell = '<td style="padding:8px;text-align:center">' + badge + cancelBtn + '</td>';
        }
      }
      // Product type cell (editable)
      var ptLabel = item.product_type === 'sunglasses' ? '\u05E9\u05DE\u05E9' : '\u05E8\u05D0\u05D9\u05D9\u05D4';
      var productTypeCell = canEditPrices
        ? '<td style="padding:4px"><select class="po-view-ptype" data-idx="' + idx + '" style="font-size:12px;padding:2px;border:1px solid #d1d5db;border-radius:4px">' +
          '<option value="eyeglasses"' + (item.product_type !== 'sunglasses' ? ' selected' : '') + '>\u05E8\u05D0\u05D9\u05D9\u05D4</option>' +
          '<option value="sunglasses"' + (item.product_type === 'sunglasses' ? ' selected' : '') + '>\u05E9\u05DE\u05E9</option></select></td>'
        : '<td style="padding:8px;text-align:center;font-size:12px">' + ptLabel + '</td>';
      // Sell price + discount columns (editable)
      var sellPriceCell = canEditPrices
        ? '<td style="padding:4px"><input type="number" class="po-view-sell" data-idx="' + idx + '" step="0.01" min="0" value="' + (item.sell_price || '') + '" style="width:80px;font-size:12px;text-align:center;border:1px solid #d1d5db;border-radius:4px;padding:4px"></td>'
        : '<td style="padding:8px;text-align:center">' + (item.sell_price ? '\u20AA' + Number(item.sell_price).toFixed(2) : '\u2014') + '</td>';
      var sellDiscCell = canEditPrices
        ? '<td style="padding:4px"><input type="number" class="po-view-selldisc" data-idx="' + idx + '" step="0.1" min="0" max="100" value="' + (item.sell_discount ? (item.sell_discount * 100).toFixed(1) : '') + '" style="width:60px;font-size:12px;text-align:center;border:1px solid #d1d5db;border-radius:4px;padding:4px" placeholder="%"></td>'
        : '<td style="padding:8px;text-align:center">' + (item.sell_discount ? (item.sell_discount * 100).toFixed(1) + '%' : '\u2014') + '</td>';

      var noteRow = item.notes
        ? '<tr style="background:' + rowColor + '"><td colspan="' + (showStatusCol ? 13 : 12) + '" style="padding:2px 8px 8px 8px;font-size:12px;color:#6b7280;font-style:italic">\uD83D\uDCAC ' + escapeHtml(item.notes) + '</td></tr>'
        : '';
      return `<tr style="background:${rowColor}">
        <td style="padding:8px">${escapeHtml(item.brand||'\u2014')}</td>
        <td style="padding:8px">${escapeHtml(item.model||'\u2014')}</td>
        <td style="padding:8px">${escapeHtml(item.color||'\u2014')}</td>
        <td style="padding:8px">${escapeHtml(item.size||'\u2014')}</td>
        ${productTypeCell}
        <td style="padding:8px; text-align:center">${ordered}</td>
        <td style="padding:8px; text-align:center; font-weight:600">${received}</td>
        <td style="padding:8px; text-align:center">${item.unit_cost ? '\u20AA'+Number(item.unit_cost).toFixed(2) : '\u2014'}</td>
        <td style="padding:8px; text-align:center">${item.discount_pct||0}%</td>
        <td style="padding:8px; text-align:center; font-weight:600">\u20AA${total.toFixed(2)}</td>
        ${sellPriceCell}${sellDiscCell}
        ${actionCell}
      </tr>${noteRow}`;
    }).join('');

    const grandTotal = (items||[]).reduce((sum, item) => {
      return sum + (item.qty_ordered||0) * (item.unit_cost||0) * (1-(item.discount_pct||0)/100);
    }, 0);
    var totalLines = (items || []).length;
    var totalUnits = (items || []).reduce((s, i) => s + (i.qty_ordered || 0), 0);

    const container = document.getElementById('po-list-container2');
    const importBtn = po.status === 'received'
      ? `<button class="btn btn-p btn-po-import" data-id="${escapeHtml(po.id)}" style="padding:8px 18px; margin-left:8px">📥 קלוט למלאי</button>`
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
          <div><strong>ספק:</strong> ${escapeHtml(po.suppliers?.name||'—')}</div>
          <div><strong>תאריך הזמנה:</strong> ${po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—'}</div>
          <div><strong>תאריך צפוי:</strong> ${po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—'}</div>
          ${po.notes ? `<div><strong>הערות:</strong> ${escapeHtml(po.notes)}</div>` : ''}
        </div>
        <div style="background:white; padding:16px; border-radius:10px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.1); overflow-x:auto">
          <table id="po-view-table" style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#1a2744; color:white; text-align:right">
                <th style="padding:8px" data-sort-key="brand">\u05DE\u05D5\u05EA\u05D2</th>
                <th style="padding:8px" data-sort-key="model">\u05D3\u05D2\u05DD</th>
                <th style="padding:8px" data-sort-key="color">\u05E6\u05D1\u05E2</th>
                <th style="padding:8px" data-sort-key="size">\u05D2\u05D5\u05D3\u05DC</th>
                <th style="padding:8px">\u05E1\u05D5\u05D2</th>
                <th style="padding:8px" data-sort-key="qty_ordered">\u05D4\u05D5\u05D6\u05DE\u05DF</th>
                <th style="padding:8px">\u05D4\u05EA\u05E7\u05D1\u05DC</th>
                <th style="padding:8px" data-sort-key="unit_cost">\u05E2\u05DC\u05D5\u05EA</th>
                <th style="padding:8px">\u05D4\u05E0\u05D7\u05D4</th>
                <th style="padding:8px">\u05E1\u05D4"\u05DB</th>
                <th style="padding:8px">\u05DE\u05D7\u05D9\u05E8 \u05DE\u05DB\u05D9\u05E8\u05D4</th>
                <th style="padding:8px">\u05D4\u05E0\u05D7\u05EA \u05DE\u05DB\u05D9\u05E8\u05D4</th>
                ${showStatusCol ? '<th style="padding:8px">\u05E1\u05D8\u05D8\u05D5\u05E1</th>' : ''}
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="font-weight:700; border-top:2px solid #1a2744; background:#f8fafc">
                <td colspan="5" style="padding:8px; text-align:right; font-size:13px">
                  \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD: ${totalLines} | \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA: ${totalUnits}
                </td>
                <td colspan="4" style="padding:8px; text-align:left">\u05E1\u05D4"\u05DB \u05DC\u05D4\u05D6\u05DE\u05E0\u05D4:</td>
                <td style="padding:8px; font-size:15px" colspan="2">\u20AA${grandTotal.toFixed(2)}</td>
                ${showStatusCol ? '<td></td>' : ''}
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
          ${canEditPrices ? '<button onclick="_savePOViewPrices(\'' + escapeHtml(po.id) + '\')" style="background:#2196F3; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">\uD83D\uDCBE \u05E9\u05DE\u05D5\u05E8 \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD</button>' : ''}
          <button onclick="exportPOExcel()" style="background:#217346; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">\uD83D\uDCCA \u05D9\u05D9\u05E6\u05D5\u05D0 Excel</button>
          <button onclick="exportPOPdf()" style="background:#c0392b; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">\uD83D\uDCC4 \u05D9\u05D9\u05E6\u05D5\u05D0 PDF</button>
        </div>
      </div>`;
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ─── EVENT DELEGATION — purchase-orders.js ──────────────────────
document.addEventListener('click', function(e) {
  // Sort PO view columns
  var sortTh = e.target.closest('th[data-sort-key]');
  if (sortTh && _currentViewPoId && typeof SortUtils !== 'undefined') {
    var table = sortTh.closest('table');
    var container2 = document.getElementById('po-list-container2');
    if (table && container2 && container2.contains(table)) {
      var s = SortUtils.toggle('po-view', sortTh.dataset.sortKey);
      SortUtils.sortArray(currentPOItems, s.key, s.dir);
      openViewPO(_currentViewPoId);
      return;
    }
  }
  // Cancel individual PO item
  const cancelItemBtn = e.target.closest('.btn-po-cancel-item');
  if (cancelItemBtn) {
    cancelPOItem(cancelItemBtn.dataset.itemId, cancelItemBtn.dataset.poId, parseInt(cancelItemBtn.dataset.received) || 0);
    return;
  }
  // #12 openEditPO
  const editBtn = e.target.closest('.btn-po-edit');
  if (editBtn) { openEditPO(editBtn.dataset.id); return; }
  // #13 sendPurchaseOrder
  const sendBtn = e.target.closest('.btn-po-send');
  if (sendBtn) { sendPurchaseOrder(sendBtn.dataset.id); return; }
  // #14-16 cancelPO
  const cancelBtn = e.target.closest('.btn-po-cancel');
  if (cancelBtn) { cancelPO(cancelBtn.dataset.id); return; }
  // #15-17 openViewPO
  const viewBtn = e.target.closest('.btn-po-view');
  if (viewBtn) { openViewPO(viewBtn.dataset.id); return; }
  // Clone PO
  const cloneBtn = e.target.closest('.btn-po-clone');
  if (cloneBtn) { clonePO(cloneBtn.dataset.id); return; }
  // Note button — open details and focus note textarea
  const noteBtn = e.target.closest('.btn-po-note');
  if (noteBtn) { togglePOItemNote(parseInt(noteBtn.dataset.index)); return; }
  // #18 togglePOItemDetails (array index)
  const toggleBtn = e.target.closest('.btn-po-toggle');
  if (toggleBtn) { togglePOItemDetails(parseInt(toggleBtn.dataset.index)); return; }
  // #19 duplicatePOItem (array index)
  const dupBtn = e.target.closest('.btn-po-dup');
  if (dupBtn) { duplicatePOItem(parseInt(dupBtn.dataset.index)); return; }
  // #20 removePOItem (array index)
  const removeBtn = e.target.closest('.btn-po-remove');
  if (removeBtn) { removePOItem(parseInt(removeBtn.dataset.index)); return; }
  // #21 importPOToInventory
  const importBtn = e.target.closest('.btn-po-import');
  if (importBtn) { importPOToInventory(importBtn.dataset.id); return; }
});

// Save sell prices from PO view
async function _savePOViewPrices(poId) {
  var inputs = document.querySelectorAll('.po-view-sell');
  if (!inputs.length || !currentPOItems?.length) { toast('\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4', 'w'); return; }
  var updates = [];
  inputs.forEach(function(inp) {
    var idx = parseInt(inp.dataset.idx);
    var item = currentPOItems[idx];
    if (!item) return;
    var sellPrice = parseFloat(inp.value) || 0;
    var discInput = document.querySelector('.po-view-selldisc[data-idx="' + idx + '"]');
    var sellDisc = discInput ? (parseFloat(discInput.value) || 0) / 100 : 0;
    var ptypeInput = document.querySelector('.po-view-ptype[data-idx="' + idx + '"]');
    var ptype = ptypeInput ? ptypeInput.value : (item.product_type || 'eyeglasses');
    updates.push({ id: item.id, sell_price: sellPrice, sell_discount: sellDisc, product_type: ptype });
  });
  if (!updates.length) return;
  showLoading('\u05E9\u05D5\u05DE\u05E8 \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD...');
  try {
    await batchUpdate(T.PO_ITEMS, updates);
    toast(updates.length + ' \u05DE\u05D7\u05D9\u05E8\u05D9 \u05DE\u05DB\u05D9\u05E8\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D5', 's');
  } catch (e) {
    console.error('_savePOViewPrices error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD: ' + (e.message || ''), 'e');
  }
  hideLoading();
}
