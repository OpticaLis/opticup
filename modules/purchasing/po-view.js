// ── View PO (read-only) ─────────────────────────────────────
async function openViewPO(id) {
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

    const itemRows = (items || []).map(item => {
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
          // Determine reason from receipt items
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
          // Cancel button only for partial POs
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
      return `<tr style="background:${rowColor}">
        <td style="padding:8px">${escapeHtml(item.brand||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.model||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.color||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.size||'—')}</td>
        <td style="padding:8px; text-align:center">${ordered}</td>
        <td style="padding:8px; text-align:center; font-weight:600">${received}</td>
        <td style="padding:8px; text-align:center">${item.unit_cost ? '₪'+Number(item.unit_cost).toFixed(2) : '—'}</td>
        <td style="padding:8px; text-align:center">${item.discount_pct||0}%</td>
        <td style="padding:8px; text-align:center; font-weight:600">₪${total.toFixed(2)}</td>
        ${actionCell}
      </tr>`;
    }).join('');

    const grandTotal = (items||[]).reduce((sum, item) => {
      return sum + (item.qty_ordered||0) * (item.unit_cost||0) * (1-(item.discount_pct||0)/100);
    }, 0);

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
                ${showStatusCol ? '<th style="padding:8px">סטטוס</th>' : ''}
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

// ─── EVENT DELEGATION — purchase-orders.js ──────────────────────
document.addEventListener('click', function(e) {
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
