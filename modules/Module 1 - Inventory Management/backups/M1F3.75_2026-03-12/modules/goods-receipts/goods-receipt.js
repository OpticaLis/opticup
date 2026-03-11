// System Log (Slog) logic moved to js/system-log.js

// =========================================================
// GOODS RECEIPT
// =========================================================
const RCPT_TYPE_LABELS = { delivery_note: 'תעודת משלוח', invoice: 'חשבונית', tax_invoice: 'חשבונית מס' };
const RCPT_STATUS_LABELS = { draft: 'טיוטה', confirmed: 'אושרה', cancelled: 'בוטלה' };

// --- PO linkage state ---
let rcptLinkedPoId = null; // currently linked PO id

async function loadPOsForSupplier(supplierName) {
  if (!supplierName) return;
  const sel = $('rcpt-po-select');
  sel.innerHTML = '<option value="">ללא — קבלה חופשית</option>';
  rcptLinkedPoId = null;
  if (!supplierName) { sel.disabled = true; return; }

  const supplierId = supplierCache[supplierName];
  if (!supplierId) { sel.disabled = true; return; }

  try {
    const { data, error } = await sb.from(T.PO)
      .select('id, po_number, status, created_at')
      .eq('supplier_id', supplierId)
      .in('status', ['sent', 'partial'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!data || !data.length) { sel.disabled = true; return; }

    for (const po of data) {
      const label = `${po.po_number} (${po.status === 'sent' ? 'נשלחה' : 'חלקי'})`;
      sel.innerHTML += `<option value="${po.id}">${label}</option>`;
    }
    sel.disabled = false;
  } catch (e) {
    console.error('loadPOsForSupplier error:', e);
    sel.disabled = true;
  }
}

async function onReceiptPoSelected() {
  const poId = $('rcpt-po-select').value;
  if (!poId) { rcptLinkedPoId = null; return; }

  showLoading('טוען פריטי הזמנה...');
  try {
    const { data: poItems, error } = await sb.from(T.PO_ITEMS)
      .select('*')
      .eq('po_id', poId);
    if (error) throw error;

    // Clear existing items
    $('rcpt-items-body').innerHTML = '';
    rcptRowNum = 0;

    for (const item of (poItems || [])) {
      const ordered = item.qty_ordered || 0;
      const received = item.qty_received || 0;
      const remaining = ordered - received;
      if (remaining <= 0) continue; // skip fully received items

      // Try to find inventory item by barcode for inventory_id
      let inventoryId = null;
      if (item.barcode) {
        const { data: inv } = await sb.from('inventory')
          .select('id')
          .eq('barcode', item.barcode)
          .eq('is_deleted', false)
          .maybeSingle();
        if (inv) inventoryId = inv.id;
      }

      addReceiptItemRow({
        barcode: item.barcode || '',
        brand: item.brand || '',
        model: item.model || '',
        color: item.color || '',
        size: item.size || '',
        quantity: remaining,
        unit_cost: item.unit_cost || '',
        sell_price: item.sell_price || '',
        is_new_item: !inventoryId,
        inventory_id: inventoryId
      });
    }

    rcptLinkedPoId = poId;
    updateReceiptItemsStats();
    toast('פריטי הזמנה נטענו', 's');
  } catch (e) {
    console.error('onReceiptPoSelected error:', e);
    toast('שגיאה בטעינת פריטי הזמנה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function updatePOStatusAfterReceipt(poId) {
  if (!poId) return;
  try {
    // Fetch all PO items
    const { data: poItems, error: piErr } = await sb.from(T.PO_ITEMS)
      .select('id, barcode, brand, model, color, size, qty_ordered, qty_received')
      .eq('po_id', poId);
    if (piErr) throw piErr;

    // Fetch all confirmed receipts linked to this PO
    const { data: receipts } = await sb.from(T.RECEIPTS)
      .select('id')
      .eq('po_id', poId)
      .eq('status', 'confirmed');

    let totalReceived = 0;
    if (receipts && receipts.length) {
      const receiptIds = receipts.map(r => r.id);
      const { data: rcptItems } = await sb.from(T.RCPT_ITEMS)
        .select('barcode, brand, model, color, size, quantity')
        .in('receipt_id', receiptIds);

      // Build lookup: by barcode first, then by model+color+size as fallback
      const receivedByBarcode = {};
      const receivedByKey = {};
      for (const ri of (rcptItems || [])) {
        if (ri.barcode) receivedByBarcode[ri.barcode] = (receivedByBarcode[ri.barcode] || 0) + ri.quantity;
        const key = `${ri.brand}|${ri.model}|${ri.color}|${ri.size}`;
        receivedByKey[key] = (receivedByKey[key] || 0) + ri.quantity;
      }

      // Update qty_received on PO items
      for (const pi of (poItems || [])) {
        let rcvd = 0;
        if (pi.barcode && receivedByBarcode[pi.barcode]) {
          rcvd = receivedByBarcode[pi.barcode];
        } else {
          const key = `${pi.brand}|${pi.model}|${pi.color}|${pi.size}`;
          rcvd = receivedByKey[key] || 0;
        }
        if (rcvd !== (pi.qty_received || 0)) {
          await sb.from(T.PO_ITEMS).update({ qty_received: rcvd }).eq('id', pi.id);
        }
        totalReceived += rcvd;
      }
    }

    // Determine PO status
    const totalOrdered = (poItems || []).reduce((s, i) => s + (i.qty_ordered || 0), 0);
    let newStatus;
    if (totalReceived >= totalOrdered) {
      newStatus = 'received';
    } else if (totalReceived > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'sent'; // no items received yet
    }

    await sb.from(T.PO).update({ status: newStatus }).eq('id', poId);
    writeLog('po_receipt_update', null, { total_ordered: totalOrdered, total_received: totalReceived, new_status: newStatus });
  } catch (e) {
    console.error('updatePOStatusAfterReceipt error:', e);
  }
}

async function loadReceiptTab() {
  showLoading('טוען קבלות סחורה...');
  try {
    // Show step1, hide step2
    $('rcpt-step1').style.display = '';
    $('rcpt-step2').style.display = 'none';

    // Summary cards
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString();

    const [draftsRes, confirmedRes, itemsRes, listRes] = await Promise.all([
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', weekStr),
      sb.from(T.RCPT_ITEMS).select('quantity', { count: 'exact', head: false })
        .in('receipt_id',
          (await sb.from(T.RECEIPTS).select('id').eq('status', 'confirmed').gte('created_at', weekStr)).data?.map(r => r.id) || []
        ),
      sb.from(T.RECEIPTS).select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    $('rcpt-drafts').textContent = draftsRes.count || 0;
    $('rcpt-confirmed-week').textContent = confirmedRes.count || 0;
    const totalItems = (itemsRes.data || []).reduce((s, r) => s + (r.quantity || 0), 0);
    $('rcpt-items-week').textContent = totalItems;

    // Receipt list
    const receipts = listRes.data || [];
    const tb = $('rcpt-list-body');
    if (!receipts.length) {
      tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#999">אין קבלות</td></tr>';
    } else {
      // Get item counts per receipt
      const receiptIds = receipts.map(r => r.id);
      const { data: itemCounts } = await sb.from(T.RCPT_ITEMS).select('receipt_id, quantity');
      const countMap = {};
      (itemCounts || []).forEach(i => {
        if (!countMap[i.receipt_id]) countMap[i.receipt_id] = { count: 0, total: 0 };
        countMap[i.receipt_id].count++;
        countMap[i.receipt_id].total += (i.quantity || 0);
      });

      tb.innerHTML = receipts.map((r, idx) => {
        const c = countMap[r.id] || { count: 0, total: 0 };
        const supName = r.supplier_id ? (supplierCacheRev[r.supplier_id] || '—') : '—';
        const statusCls = `rcpt-status rcpt-status-${r.status}`;
        const statusLabel = RCPT_STATUS_LABELS[r.status] || r.status;
        const typeLabel = RCPT_TYPE_LABELS[r.receipt_type] || r.receipt_type;
        const dateStr = r.receipt_date || '';

        let actions = '';
        if (r.status === 'draft') {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-edit" data-id="${escapeHtml(r.id)}" title="ערוך">✏️</button>
            <button class="btn btn-s btn-sm btn-rcpt-confirm" data-id="${escapeHtml(r.id)}" title="אשר">✓</button>
            <button class="btn btn-d btn-sm btn-rcpt-cancel" data-id="${escapeHtml(r.id)}" title="בטל">✖</button>`;
        } else {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-view" data-id="${escapeHtml(r.id)}" title="צפה">👁</button>`;
          if (r.status === 'confirmed') {
            actions += ` <button class="btn btn-p btn-sm btn-rcpt-export" data-id="${escapeHtml(r.id)}" title="ייצוא לAccess">📤</button>`;
          }
        }

        return `<tr>
          <td>${idx + 1}</td>
          <td><strong>${r.receipt_number}</strong></td>
          <td>${typeLabel}</td>
          <td>${supName}</td>
          <td>${dateStr}</td>
          <td>${c.count} (${c.total} יח׳)</td>
          <td>${r.total_amount ? '₪' + Number(r.total_amount).toLocaleString() : '—'}</td>
          <td><span class="${statusCls}">${statusLabel}</span></td>
          <td style="white-space:nowrap">${actions}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) {
    console.error('loadReceiptTab error:', e);
    setAlert('rcpt-list-alerts', 'שגיאה בטעינת קבלות: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function openNewReceipt() {
  currentReceiptId = null;
  rcptEditMode = false;
  rcptViewOnly = false;
  rcptRowNum = 0;

  $('rcpt-form-title').textContent = '📦 קבלה חדשה';
  $('rcpt-type').value = 'delivery_note';
  $('rcpt-number').value = '';
  $('rcpt-supplier').innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
  $('rcpt-supplier').value = '';
  $('rcpt-supplier').onchange = () => loadPOsForSupplier($('rcpt-supplier').value);
  $('rcpt-po-select').innerHTML = '<option value="">ללא — קבלה חופשית</option>';
  $('rcpt-po-select').disabled = true;
  $('rcpt-po-select').onchange = () => onReceiptPoSelected();
  rcptLinkedPoId = null;
  $('rcpt-date').valueAsDate = new Date();
  $('rcpt-notes').value = '';
  $('rcpt-items-body').innerHTML = '';
  $('rcpt-items-stats').textContent = '';
  $('rcpt-barcode-search').value = '';
  clearAlert('rcpt-form-alerts');

  // Enable inputs
  toggleReceiptFormInputs(false);

  $('rcpt-step1').style.display = 'none';
  $('rcpt-step2').style.display = '';
}
