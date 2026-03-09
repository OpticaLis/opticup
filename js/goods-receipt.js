// =========================================================
// TAB 7: SYSTEM LOG
// =========================================================
const SLOG_PAGE_SIZE = 50;

const SLOG_ROW_CATEGORIES = {
  entry_manual:'entry', entry_po:'entry', entry_excel:'entry', entry_receipt:'entry', transfer_in:'entry',
  sale:'exit', credit_return:'exit', manual_remove:'exit', transfer_out:'exit',
  edit_qty:'edit', edit_price:'edit', edit_details:'edit', edit_barcode:'edit',
  soft_delete:'delete', permanent_delete:'delete',
  restore:'restore', test:'delete'
};

let slogActionDropdownPopulated = false;

function populateActionDropdown() {
  if (slogActionDropdownPopulated) return;
  const sel = $('slog-action');
  for (const [key, val] of Object.entries(ACTION_MAP)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.icon + ' ' + val.label;
    sel.appendChild(opt);
  }
  slogActionDropdownPopulated = true;
}

function getSystemLogFilters() {
  return {
    dateFrom:  $('slog-date-from')?.value || '',
    dateTo:    $('slog-date-to')?.value || '',
    branch:    $('slog-branch')?.value.trim() || '',
    action:    $('slog-action')?.value || '',
    employee:  $('slog-employee')?.value.trim() || '',
    search:    $('slog-search')?.value.trim() || ''
  };
}

function clearSystemLogFilters() {
  $('slog-date-from').value = '';
  $('slog-date-to').value = '';
  $('slog-branch').value = '';
  $('slog-action').value = '';
  $('slog-employee').value = '';
  $('slog-search').value = '';
  slogPage = 0;
  loadSystemLog();
}

function applySlogFilters(query, filters) {
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom + 'T00:00:00');
  if (filters.dateTo)   query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.branch)   query = query.ilike('branch_id', '%' + filters.branch + '%');
  if (filters.action)   query = query.eq('action', filters.action);
  if (filters.employee) query = query.ilike('performed_by', '%' + filters.employee + '%');
  if (filters.search) {
    query = query.or(`barcode.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
  }
  return query;
}

async function loadSystemLog(filters, page) {
  populateActionDropdown();
  if (filters === undefined) filters = getSystemLogFilters();
  if (page === undefined) page = slogPage;
  slogPage = page;
  slogCurrentFilters = filters;

  showLoading('טוען לוג מערכת...');
  clearAlert('slog-alerts');

  try {
    // --- Summary cards (parallel) ---
    const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();

    const [totalRes, addedRes, deletedRes, editedRes] = await Promise.all([
      sb.from('inventory').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).like('action', 'entry_%').gte('created_at', weekAgo),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('action', 'soft_delete').gte('created_at', weekAgo),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).like('action', 'edit_%').gte('created_at', weekAgo)
    ]);

    $('slog-total').textContent   = totalRes.count ?? '—';
    $('slog-added').textContent   = addedRes.count ?? '—';
    $('slog-deleted').textContent = deletedRes.count ?? '—';
    $('slog-edited').textContent  = editedRes.count ?? '—';

    // --- Build filtered queries ---
    let countQuery = sb.from('inventory_logs').select('*', { count: 'exact', head: true });
    let dataQuery  = sb.from('inventory_logs').select('*');

    countQuery = applySlogFilters(countQuery, filters);
    dataQuery  = applySlogFilters(dataQuery, filters);

    // Get count
    const { count, error: cErr } = await countQuery;
    if (cErr) throw new Error(cErr.message);

    const total = count || 0;
    slogTotalPages = Math.max(1, Math.ceil(total / SLOG_PAGE_SIZE));
    if (slogPage >= slogTotalPages) slogPage = Math.max(0, slogTotalPages - 1);

    // Get page of data
    const offset = slogPage * SLOG_PAGE_SIZE;
    dataQuery = dataQuery.order('created_at', { ascending: false }).range(offset, offset + SLOG_PAGE_SIZE - 1);

    const { data: logs, error: dErr } = await dataQuery;
    if (dErr) throw new Error(dErr.message);

    // --- Render table ---
    const tb = $('slog-body');
    if (!logs || !logs.length) {
      tb.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--g500)">אין רשומות לוג</td></tr>';
    } else {
      tb.innerHTML = logs.map(log => {
        const info = ACTION_MAP[log.action] || { icon: '❓', label: log.action, color: '#9E9E9E' };
        const cat  = SLOG_ROW_CATEGORIES[log.action] || 'delete';
        const dt   = new Date(log.created_at);
        const dateStr = dt.toLocaleDateString('he-IL') + ' ' + dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const qtyCell  = (log.qty_before != null && log.qty_after != null) ? `${log.qty_before} → ${log.qty_after}` : '—';
        const priceCell = (log.price_before != null && log.price_after != null) ? `${log.price_before} → ${log.price_after}` : '—';

        return `<tr class="slog-row-${cat}">
          <td style="white-space:nowrap">${dateStr}</td>
          <td style="white-space:nowrap"><span style="color:${info.color}">${info.icon}</span> ${info.label}</td>
          <td class="barcode-cell">${log.barcode || '—'}</td>
          <td>${log.brand || '—'}</td>
          <td>${log.model || '—'}</td>
          <td>${qtyCell}</td>
          <td>${priceCell}</td>
          <td>${log.reason || '—'}</td>
          <td>${log.source_ref || '—'}</td>
          <td>${log.performed_by || '—'}</td>
          <td>${log.branch_id || '—'}</td>
        </tr>`;
      }).join('');
    }

    // --- Pagination ---
    const pagingEl = $('slog-paging');
    if (total > SLOG_PAGE_SIZE) {
      pagingEl.style.display = 'flex';
      $('slog-page-info').textContent = `עמוד ${slogPage + 1} מתוך ${slogTotalPages}`;
      $('slog-prev').disabled = slogPage === 0;
      $('slog-next').disabled = slogPage >= slogTotalPages - 1;
    } else {
      pagingEl.style.display = 'none';
    }

  } catch(e) {
    setAlert('slog-alerts', 'שגיאה בטעינת לוג: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function slogPageNav(dir) {
  slogPage += dir;
  if (slogPage < 0) slogPage = 0;
  if (slogPage >= slogTotalPages) slogPage = slogTotalPages - 1;
  loadSystemLog(slogCurrentFilters, slogPage);
}

async function exportSystemLog() {
  const filters = getSystemLogFilters();
  showLoading('מייצא לוג...');
  try {
    let query = sb.from('inventory_logs').select('*');
    query = applySlogFilters(query, filters);
    query = query.order('created_at', { ascending: false }).limit(10000);

    const { data: logs, error } = await query;
    if (error) throw new Error(error.message);

    if (!logs || !logs.length) { toast('אין רשומות לייצוא', 'w'); hideLoading(); return; }

    const headers = ['תאריך', 'שעה', 'פעולה', 'ברקוד', 'מותג', 'דגם', 'כמות לפני', 'כמות אחרי', 'מחיר לפני', 'מחיר אחרי', 'סיבה', 'מקור', 'בוצע ע"י', 'סניף'];
    const rows = logs.map(log => {
      const dt = new Date(log.created_at);
      const info = ACTION_MAP[log.action] || { label: log.action };
      return [
        dt.toLocaleDateString('he-IL'),
        dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        info.label,
        log.barcode || '',
        log.brand || '',
        log.model || '',
        log.qty_before ?? '',
        log.qty_after ?? '',
        log.price_before ?? '',
        log.price_after ?? '',
        log.reason || '',
        log.source_ref || '',
        log.performed_by || '',
        log.branch_id || ''
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'לוג מערכת');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `לוג-מערכת-${today}.xlsx`);
    toast('📥 קובץ לוג הורד בהצלחה', 's');
  } catch(e) {
    toast('שגיאה בייצוא: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

// =========================================================
// GOODS RECEIPT
// =========================================================
const RCPT_TYPE_LABELS = { delivery_note: 'תעודת משלוח', invoice: 'חשבונית', tax_invoice: 'חשבונית מס' };
const RCPT_STATUS_LABELS = { draft: 'טיוטה', confirmed: 'אושרה', cancelled: 'בוטלה' };

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
          actions = `<button class="btn btn-g btn-sm" onclick="openExistingReceipt('${r.id}',false)" title="ערוך">✏️</button>
            <button class="btn btn-s btn-sm" onclick="confirmReceiptById('${r.id}')" title="אשר">✓</button>
            <button class="btn btn-d btn-sm" onclick="cancelReceipt('${r.id}')" title="בטל">✖</button>`;
        } else {
          actions = `<button class="btn btn-g btn-sm" onclick="openExistingReceipt('${r.id}',true)" title="צפה">👁</button>`;
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

async function openExistingReceipt(receiptId, viewOnly) {
  showLoading('טוען קבלה...');
  try {
    const { data: rcpt, error: rErr } = await sb.from(T.RECEIPTS).select('*').eq('id', receiptId).single();
    if (rErr) throw rErr;

    const { data: items, error: iErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
    if (iErr) throw iErr;

    currentReceiptId = receiptId;
    rcptEditMode = true;
    rcptViewOnly = viewOnly;
    rcptRowNum = 0;

    $('rcpt-form-title').textContent = viewOnly ? `📦 קבלה ${rcpt.receipt_number} (צפייה)` : `📦 עריכת קבלה ${rcpt.receipt_number}`;
    $('rcpt-type').value = rcpt.receipt_type || 'delivery_note';
    $('rcpt-number').value = rcpt.receipt_number || '';
    $('rcpt-supplier').innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
    $('rcpt-supplier').value = rcpt.supplier_id ? (supplierCacheRev[rcpt.supplier_id] || '') : '';
    $('rcpt-date').value = rcpt.receipt_date || '';
    $('rcpt-notes').value = rcpt.notes || '';
    clearAlert('rcpt-form-alerts');

    // Populate items
    $('rcpt-items-body').innerHTML = '';
    for (const item of (items || [])) {
      addReceiptItemRow({
        barcode: item.barcode || '',
        brand: item.brand || '',
        model: item.model || '',
        color: item.color || '',
        size: item.size || '',
        quantity: item.quantity || 1,
        unit_cost: item.unit_cost || '',
        sell_price: item.sell_price || '',
        is_new_item: item.is_new_item || false
      });
    }
    updateReceiptItemsStats();

    // Toggle readonly for confirmed/cancelled
    toggleReceiptFormInputs(viewOnly);

    $('rcpt-step1').style.display = 'none';
    $('rcpt-step2').style.display = '';
  } catch (e) {
    console.error('openExistingReceipt error:', e);
    toast('שגיאה בטעינת קבלה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function toggleReceiptFormInputs(disabled) {
  const form = $('rcpt-step2');
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id === 'rcpt-barcode-search') return; // keep search always enabled? No, disable in view
    el.disabled = disabled;
  });
  const actionBar = $('rcpt-action-bar');
  if (actionBar) actionBar.style.display = disabled ? 'none' : '';
  // Hide search bar + add buttons in view mode
  const searchBar = form.querySelector('.rcpt-search-bar');
  if (searchBar) searchBar.style.display = disabled ? 'none' : '';
}

async function searchReceiptBarcode() {
  const barcode = ($('rcpt-barcode-search').value || '').trim();
  if (!barcode) { toast('הזן ברקוד', 'w'); return; }

  showLoading('מחפש ברקוד...');
  try {
    const { data, error } = await sb.from('inventory')
      .select('*, inventory_images(*)')
      .eq('barcode', barcode)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const rec = rowToRecord(data, 'inventory');
      const f = rec.fields;
      addReceiptItemRow({
        barcode: f['ברקוד'] || barcode,
        brand: f['חברה / מותג'] || '',
        model: f['דגם'] || '',
        color: f['צבע'] || '',
        size: f['גודל'] || '',
        quantity: 1,
        unit_cost: f['מחיר עלות'] || '',
        sell_price: f['מחיר מכירה'] || '',
        is_new_item: false,
        inventory_id: data.id
      });
      toast(`נמצא: ${f['חברה / מותג']} ${f['דגם']}`, 's');
    } else {
      toast('ברקוד לא נמצא במלאי — הוסף כפריט חדש', 'w');
      addReceiptItemRow({ barcode, is_new_item: true, quantity: 1 });
    }

    $('rcpt-barcode-search').value = '';
    updateReceiptItemsStats();
  } catch (e) {
    console.error('searchReceiptBarcode error:', e);
    toast('שגיאה בחיפוש: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function addReceiptItemRow(data) {
  rcptRowNum++;
  const tb = $('rcpt-items-body');
  const tr = document.createElement('tr');
  tr.dataset.row = rcptRowNum;
  if (data?.inventory_id) tr.dataset.inventoryId = data.inventory_id;

  const isNew = data?.is_new_item ?? true;
  const isExisting = !isNew;

  tr.innerHTML = `
    <td>${rcptRowNum}</td>
    <td><input type="text" class="rcpt-barcode" value="${data?.barcode || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-brand" value="${data?.brand || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-model" value="${data?.model || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-color" value="${data?.color || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-size" value="${data?.size || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="number" class="rcpt-qty col-qty" min="1" value="${data?.quantity || 1}"></td>
    <td><input type="number" class="rcpt-ucost col-price" step="0.01" value="${data?.unit_cost || ''}"></td>
    <td><input type="number" class="rcpt-sprice col-price" step="0.01" value="${data?.sell_price || ''}"></td>
    <td>${isNew ? '<span class="rcpt-new-badge">חדש</span>' : '<span class="rcpt-existing-badge">קיים</span>'}
      <input type="hidden" class="rcpt-is-new" value="${isNew ? '1' : '0'}">
    </td>
    <td><button class="btn btn-d btn-sm" onclick="this.closest('tr').remove();updateReceiptItemsStats()" title="הסר">✖</button></td>
  `;
  tb.appendChild(tr);
  updateReceiptItemsStats();
}

function getReceiptItems() {
  return Array.from($('rcpt-items-body').querySelectorAll('tr')).map(tr => ({
    tr,
    barcode: tr.querySelector('.rcpt-barcode')?.value?.trim() || '',
    brand: tr.querySelector('.rcpt-brand')?.value?.trim() || '',
    model: tr.querySelector('.rcpt-model')?.value?.trim() || '',
    color: tr.querySelector('.rcpt-color')?.value?.trim() || '',
    size: tr.querySelector('.rcpt-size')?.value?.trim() || '',
    quantity: parseInt(tr.querySelector('.rcpt-qty')?.value) || 1,
    unit_cost: parseFloat(tr.querySelector('.rcpt-ucost')?.value) || null,
    sell_price: parseFloat(tr.querySelector('.rcpt-sprice')?.value) || null,
    is_new_item: tr.querySelector('.rcpt-is-new')?.value === '1',
    inventory_id: tr.dataset.inventoryId || null
  }));
}

function updateReceiptItemsStats() {
  const items = getReceiptItems();
  const total = items.reduce((s, i) => s + i.quantity, 0);
  const newCount = items.filter(i => i.is_new_item).length;
  const existCount = items.filter(i => !i.is_new_item).length;
  $('rcpt-items-stats').textContent = items.length
    ? `סה"כ ${items.length} שורות | ${total} יחידות | ${existCount} קיימים | ${newCount} חדשים`
    : '';
}

async function saveReceiptDraft() {
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const rcptType = $('rcpt-type').value;
  const supplierName = $('rcpt-supplier').value;
  const rcptDate = $('rcpt-date').value;
  const notes = ($('rcpt-notes').value || '').trim();

  if (!rcptNumber) { toast('חובה למלא מספר מסמך', 'e'); return; }
  if (!supplierName) { toast('חובה לבחור ספק', 'e'); return; }

  const items = getReceiptItems();
  if (!items.length) { toast('חובה להוסיף לפחות פריט אחד', 'e'); return; }

  // Validate items
  const invalidItems = items.filter(i => i.is_new_item && (!i.brand || !i.model));
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  showLoading('שומר טיוטה...');
  try {
    const supplierId = supplierCache[supplierName] || null;
    const totalAmount = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);

    const receiptRow = {
      receipt_number: rcptNumber,
      receipt_type: rcptType,
      supplier_id: supplierId,
      branch_id: branchCode,
      receipt_date: rcptDate || new Date().toISOString().slice(0, 10),
      notes: notes || null,
      total_amount: totalAmount || null,
      status: 'draft',
      created_by: sessionStorage.getItem('prizma_user') || 'system'
    };

    let receiptId;

    if (currentReceiptId && rcptEditMode) {
      // Update existing draft
      const { error } = await sb.from(T.RECEIPTS).update(receiptRow).eq('id', currentReceiptId);
      if (error) throw error;
      receiptId = currentReceiptId;

      // Delete old items and re-insert
      await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId);
    } else {
      // Insert new receipt
      const { data, error } = await sb.from(T.RECEIPTS).insert(receiptRow).select().single();
      if (error) throw error;
      receiptId = data.id;
      currentReceiptId = receiptId;
      rcptEditMode = true;
    }

    // Insert items
    const itemRows = items.map(i => ({
      receipt_id: receiptId,
      inventory_id: i.inventory_id || null,
      barcode: i.barcode || null,
      brand: i.brand || null,
      model: i.model || null,
      color: i.color || null,
      size: i.size || null,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      sell_price: i.sell_price,
      is_new_item: i.is_new_item
    }));

    const { error: iErr } = await sb.from(T.RCPT_ITEMS).insert(itemRows);
    if (iErr) throw iErr;

    toast('טיוטה נשמרה בהצלחה', 's');
  } catch (e) {
    console.error('saveReceiptDraft error:', e);
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function confirmReceipt() {
  const items = getReceiptItems();
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const supplierName = $('rcpt-supplier').value;

  if (!rcptNumber) { toast('חובה למלא מספר מסמך', 'e'); return; }
  if (!supplierName) { toast('חובה לבחור ספק', 'e'); return; }
  if (!items.length) { toast('חובה להוסיף לפחות פריט אחד', 'e'); return; }

  const invalidItems = items.filter(i => i.is_new_item && (!i.brand || !i.model));
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const ok = await confirmDialog('אישור קבלת סחורה',
    `האם לאשר קבלה ${rcptNumber} עם ${items.length} פריטים (${totalQty} יח׳) ולעדכן מלאי?`);
  if (!ok) return;

  showLoading('מאשר קבלה ומעדכן מלאי...');
  try {
    // First save the receipt if needed
    await saveReceiptDraftInternal();

    const receiptId = currentReceiptId;
    if (!receiptId) throw new Error('Receipt ID is missing');

    // Fetch saved items from DB
    const { data: savedItems, error: siErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
    if (siErr) throw siErr;

    // Process each item
    for (const item of savedItems) {
      if (!item.is_new_item) {
        // Existing item — find by barcode and update quantity
        const { data: invRow, error: findErr } = await sb.from('inventory')
          .select('id, quantity, barcode, brand_id, model')
          .eq('barcode', item.barcode)
          .eq('is_deleted', false)
          .maybeSingle();

        if (findErr) throw findErr;

        if (invRow) {
          const oldQty = invRow.quantity || 0;
          const newQty = oldQty + item.quantity;
          const { error: updErr } = await sb.from('inventory').update({ quantity: newQty }).eq('id', invRow.id);
          if (updErr) throw updErr;

          // Update item's inventory_id
          await sb.from(T.RCPT_ITEMS).update({ inventory_id: invRow.id }).eq('id', item.id);

          writeLog('entry_receipt', invRow.id, {
            barcode: item.barcode,
            brand: item.brand,
            model: item.model,
            qty_before: oldQty,
            qty_after: newQty,
            source_ref: rcptNumber
          });
        } else {
          console.warn('Barcode not found in inventory, treating as new:', item.barcode);
          // Treat as new item fallback
          await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
        }
      } else {
        // New item — create in inventory
        await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
      }
    }

    // Calculate total amount
    const totalAmount = savedItems.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);

    // Update receipt status to confirmed
    const { error: confErr } = await sb.from(T.RECEIPTS).update({
      status: 'confirmed',
      total_amount: totalAmount || null,
      created_by: sessionStorage.getItem('prizma_user') || 'system'
    }).eq('id', receiptId);
    if (confErr) throw confErr;

    toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן!`, 's');
    await loadReceiptTab();
  } catch (e) {
    console.error('confirmReceipt error:', e);
    toast('שגיאה באישור: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function createNewInventoryFromReceiptItem(item, receiptId, rcptNumber) {
  // Generate barcode for new item
  await loadMaxBarcode();
  const prefix = branchCode.padStart(2, '0');
  maxBarcode++;
  if (maxBarcode > 99999) throw new Error('חריגה — מקסימום ברקודים');
  const newBarcode = prefix + String(maxBarcode).padStart(5, '0');

  const brandId = brandCache[item.brand] || null;
  const supplierId = supplierCache[$('rcpt-supplier').value] || null;

  const newRow = {
    barcode: newBarcode,
    brand_id: brandId,
    supplier_id: supplierId,
    model: item.model || '',
    color: item.color || '',
    size: item.size || '',
    sell_price: item.sell_price || 0,
    cost_price: item.unit_cost || 0,
    quantity: item.quantity,
    status: 'in_stock',
    origin: 'goods_receipt',
    product_type: 'eyeglasses',
    website_sync: 'none',
    is_deleted: false
  };

  const { data: created, error: cErr } = await sb.from('inventory').insert(newRow).select().single();
  if (cErr) throw cErr;

  // Update receipt item with inventory_id and barcode
  await sb.from(T.RCPT_ITEMS).update({ inventory_id: created.id, barcode: newBarcode }).eq('id', item.id);

  writeLog('entry_receipt', created.id, {
    barcode: newBarcode,
    brand: item.brand,
    model: item.model,
    qty_before: 0,
    qty_after: item.quantity,
    source_ref: rcptNumber
  });
}

async function saveReceiptDraftInternal() {
  // Internal save (no toast, no loading) for use before confirm
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const rcptType = $('rcpt-type').value;
  const supplierName = $('rcpt-supplier').value;
  const rcptDate = $('rcpt-date').value;
  const notes = ($('rcpt-notes').value || '').trim();

  const items = getReceiptItems();
  const supplierId = supplierCache[supplierName] || null;
  const totalAmount = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);

  const receiptRow = {
    receipt_number: rcptNumber,
    receipt_type: rcptType,
    supplier_id: supplierId,
    branch_id: branchCode,
    receipt_date: rcptDate || new Date().toISOString().slice(0, 10),
    notes: notes || null,
    total_amount: totalAmount || null,
    status: 'draft',
    created_by: sessionStorage.getItem('prizma_user') || 'system'
  };

  let receiptId;

  if (currentReceiptId && rcptEditMode) {
    const { error } = await sb.from(T.RECEIPTS).update(receiptRow).eq('id', currentReceiptId);
    if (error) throw error;
    receiptId = currentReceiptId;
    await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId);
  } else {
    const { data, error } = await sb.from(T.RECEIPTS).insert(receiptRow).select().single();
    if (error) throw error;
    receiptId = data.id;
    currentReceiptId = receiptId;
    rcptEditMode = true;
  }

  const itemRows = items.map(i => ({
    receipt_id: receiptId,
    inventory_id: i.inventory_id || null,
    barcode: i.barcode || null,
    brand: i.brand || null,
    model: i.model || null,
    color: i.color || null,
    size: i.size || null,
    quantity: i.quantity,
    unit_cost: i.unit_cost,
    sell_price: i.sell_price,
    is_new_item: i.is_new_item
  }));

  const { error: iErr } = await sb.from(T.RCPT_ITEMS).insert(itemRows);
  if (iErr) throw iErr;
}

async function confirmReceiptById(receiptId) {
  const ok = await confirmDialog('אישור קבלה', 'האם לאשר קבלה זו ולעדכן מלאי?');
  if (!ok) return;

  showLoading('מאשר קבלה...');
  try {
    const { data: rcpt } = await sb.from(T.RECEIPTS).select('receipt_number').eq('id', receiptId).single();
    const rcptNumber = rcpt?.receipt_number || '';
    const { data: items } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);

    for (const item of (items || [])) {
      if (!item.is_new_item) {
        const { data: invRow } = await sb.from('inventory')
          .select('id, quantity')
          .eq('barcode', item.barcode)
          .eq('is_deleted', false)
          .maybeSingle();

        if (invRow) {
          const oldQty = invRow.quantity || 0;
          const newQty = oldQty + item.quantity;
          await sb.from('inventory').update({ quantity: newQty }).eq('id', invRow.id);
          await sb.from(T.RCPT_ITEMS).update({ inventory_id: invRow.id }).eq('id', item.id);
          writeLog('entry_receipt', invRow.id, {
            barcode: item.barcode, brand: item.brand, model: item.model,
            qty_before: oldQty, qty_after: newQty, source_ref: rcptNumber
          });
        } else {
          await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
        }
      } else {
        await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
      }
    }

    const totalAmount = (items || []).reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
    await sb.from(T.RECEIPTS).update({
      status: 'confirmed', total_amount: totalAmount || null,
      created_by: sessionStorage.getItem('prizma_user') || 'system'
    }).eq('id', receiptId);

    toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן!`, 's');
    await loadReceiptTab();
  } catch (e) {
    console.error('confirmReceiptById error:', e);
    toast('שגיאה באישור: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function cancelReceipt(receiptId) {
  const ok = await confirmDialog('ביטול קבלה', 'האם לבטל קבלה זו? לא ניתן לשחזר.');
  if (!ok) return;

  showLoading('מבטל...');
  try {
    const { error } = await sb.from(T.RECEIPTS).update({ status: 'cancelled' }).eq('id', receiptId);
    if (error) throw error;
    toast('הקבלה בוטלה', 's');
    await loadReceiptTab();
  } catch (e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function handleReceiptExcel(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  ev.target.value = ''; // Reset for re-upload

  showLoading('קורא Excel...');
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json.length) { hideLoading(); toast('הקובץ ריק', 'e'); return; }

      const colMap = {
        'ברקוד': ['ברקוד', 'barcode'],
        'מותג': ['מותג', 'חברה', 'חברה/מותג', 'חברה / מותג', 'brand'],
        'דגם': ['דגם', 'model'],
        'צבע': ['צבע', 'color'],
        'גודל': ['גודל', 'size'],
        'כמות': ['כמות', 'quantity', 'qty'],
        'מחיר עלות': ['מחיר עלות', 'עלות', 'cost', 'unit_cost'],
        'מחיר מכירה': ['מחיר מכירה', 'מחיר', 'price', 'sell_price']
      };

      const fileKeys = Object.keys(json[0]);
      const keyLookup = {};
      for (const [canonical, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) {
          const found = fileKeys.find(k => k.trim() === alias);
          if (found) { keyLookup[canonical] = found; break; }
        }
      }

      let added = 0;
      for (const row of json) {
        const get = (col) => { const k = keyLookup[col]; return k ? String(row[k] || '').trim() : ''; };
        const barcode = get('ברקוד');
        const brand = get('מותג');
        const model = get('דגם');

        if (!brand && !model && !barcode) continue; // Skip empty rows

        let isNew = true;
        let inventoryId = null;

        // If barcode provided, check if exists in inventory
        if (barcode) {
          const { data: inv } = await sb.from('inventory')
            .select('id, brand_id, model, color, size, quantity')
            .eq('barcode', barcode)
            .eq('is_deleted', false)
            .maybeSingle();
          if (inv) {
            isNew = false;
            inventoryId = inv.id;
          }
        }

        addReceiptItemRow({
          barcode,
          brand: brand || '',
          model: model || '',
          color: get('צבע'),
          size: get('גודל'),
          quantity: parseInt(get('כמות')) || 1,
          unit_cost: parseFloat(get('מחיר עלות')) || '',
          sell_price: parseFloat(get('מחיר מכירה')) || '',
          is_new_item: isNew,
          inventory_id: inventoryId
        });
        added++;
      }

      updateReceiptItemsStats();
      toast(`${added} שורות נטענו מ-Excel`, 's');
    } catch (err) {
      console.error('handleReceiptExcel error:', err);
      toast('שגיאה בקריאת Excel: ' + (err.message || ''), 'e');
    }
    hideLoading();
  };
  reader.readAsArrayBuffer(file);
}

async function exportReceiptExcel() {
  const items = getReceiptItems();
  if (!items.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const rcptNumber = ($('rcpt-number').value || '').trim() || 'receipt';
  const rows = items.map((i, idx) => ({
    '#': idx + 1,
    'ברקוד': i.barcode,
    'מותג': i.brand,
    'דגם': i.model,
    'צבע': i.color,
    'גודל': i.size,
    'כמות': i.quantity,
    'מחיר עלות': i.unit_cost || '',
    'מחיר מכירה': i.sell_price || '',
    'סוג': i.is_new_item ? 'חדש' : 'קיים'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'פריטים');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `קבלה-${rcptNumber}-${dateStr}.xlsx`);
  toast('קובץ Excel יוצא', 's');
}

function backToReceiptList() {
  currentReceiptId = null;
  rcptEditMode = false;
  rcptViewOnly = false;
  rcptRowNum = 0;
  loadReceiptTab();
}
