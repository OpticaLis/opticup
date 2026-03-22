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
        status:        'draft',
        tenant_id:     getTenantId()
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
        temple_length: item.temple_length || null,
        tenant_id:     getTenantId()
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
  // Fetch current status — block received/cancelled, warn partial
  try {
    var { data: po, error: fetchErr } = await sb.from(T.PO)
      .select('status').eq('id', id).single();
    if (fetchErr || !po) { toast('שגיאה בטעינת הזמנה', 'e'); return; }

    if (po.status === 'received') {
      toast('לא ניתן לבטל הזמנה שכבר התקבלה', 'e'); return;
    }
    if (po.status === 'cancelled') {
      toast('הזמנה זו כבר בוטלה', 'w'); return;
    }
    if (po.status === 'partial') {
      var ok = await confirmDialog('ביטול הזמנה חלקית',
        'הזמנה זו התקבלה חלקית. ביטול יעצור קבלת יתרת הפריטים. להמשיך?');
      if (!ok) return;
    } else {
      var confirmed = await confirmDialog('ביטול הזמנה', 'לבטל את ההזמנה? פעולה זו אינה הפיכה.');
      if (!confirmed) return;
    }
  } catch (e) { toast('שגיאה: ' + (e.message || ''), 'e'); return; }

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
