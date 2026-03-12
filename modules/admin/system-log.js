// system-log.js — System Log (Slog) tab logic
// Extracted from goods-receipt.js

// =========================================================
// TAB 7: SYSTEM LOG
// =========================================================
const SLOG_PAGE_SIZE = 50;

const SLOG_ROW_CATEGORIES = {
  entry_manual:'entry', entry_po:'entry', entry_excel:'entry', entry_receipt:'entry', transfer_in:'entry',
  sale:'exit', credit_return:'exit', manual_remove:'exit', transfer_out:'exit', reduce_qty:'exit',
  edit_qty:'edit', edit_price:'edit', edit_details:'edit', edit_barcode:'edit',
  soft_delete:'delete', permanent_delete:'delete', pending_ignored:'delete',
  restore:'restore', return_qty:'entry', test:'delete'
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
    const safeSearch = filters.search.trim().replace(/[^a-zA-Z0-9\u0590-\u05FF\s\-]/g, '');
    if (safeSearch) {
      query = query.or(`barcode.ilike.%${safeSearch}%,brand.ilike.%${safeSearch}%,model.ilike.%${safeSearch}%`);
    }
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
      sb.from('inventory').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('is_deleted', false),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).like('action', 'entry_%').gte('created_at', weekAgo),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('action', 'soft_delete').gte('created_at', weekAgo),
      sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).like('action', 'edit_%').gte('created_at', weekAgo)
    ]);

    $('slog-total').textContent   = totalRes.count ?? '—';
    $('slog-added').textContent   = addedRes.count ?? '—';
    $('slog-deleted').textContent = deletedRes.count ?? '—';
    $('slog-edited').textContent  = editedRes.count ?? '—';

    // --- Build filtered queries ---
    let countQuery = sb.from('inventory_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId());
    let dataQuery  = sb.from('inventory_logs').select('*').eq('tenant_id', getTenantId());

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
          <td class="barcode-cell">${escapeHtml(log.barcode) || '—'}</td>
          <td>${escapeHtml(log.brand) || '—'}</td>
          <td>${escapeHtml(log.model) || '—'}</td>
          <td>${qtyCell}</td>
          <td>${priceCell}</td>
          <td>${escapeHtml(log.reason) || '—'}</td>
          <td>${escapeHtml(log.source_ref) || '—'}</td>
          <td>${escapeHtml(log.performed_by) || '—'}</td>
          <td>${escapeHtml(log.branch_id) || '—'}</td>
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
    let query = sb.from('inventory_logs').select('*').eq('tenant_id', getTenantId());
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
