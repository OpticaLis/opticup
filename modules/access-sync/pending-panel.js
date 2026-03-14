// =========================================================
// PENDING SALES PANEL — Single accordion view
// =========================================================

let pendingData = [];
let expandedPendingId = null;

// -- Render panel overlay with accordion table ------------
async function renderPendingPanel() {
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD...');
  try {
    const { data, error } = await sb.from(T.PENDING_SALES)
      .select('*')
      .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false });
    if (error) throw error;
    hideLoading();
    pendingData = data || [];
    showPendingAccordion();
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD', 'e');
  }
}

// -- Show accordion table ---------------------------------
function showPendingAccordion() {
  let overlay = $('pending-panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pending-panel-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '1001';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  const pendingCount = pendingData.filter(r => r.status === 'pending').length;
  const rows = pendingData.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:#888;padding:32px 0">\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD</td></tr>'
    : pendingData.map(r => pendingAccordionRow(r)).join('');

  overlay.innerHTML = `
    <div class="modal" style="max-width:900px;width:95%;max-height:85vh;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0">\u26A0\uFE0F \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC (${pendingCount})</h3>
        <button class="btn btn-g btn-sm" onclick="closePendingPanel()" style="min-width:auto;padding:4px 12px;font-size:1.1rem">&times;</button>
      </div>
      <div style="overflow-y:auto;flex:1">
        <table style="width:100%;font-size:.88rem;border-collapse:collapse">
          <thead><tr style="background:#1e3a5f;color:#fff">
            <th style="padding:8px 10px;text-align:right">\u05D1\u05E8\u05E7\u05D5\u05D3</th>
            <th style="padding:8px 10px;text-align:right">\u05DB\u05DE\u05D5\u05EA</th>
            <th style="padding:8px 10px;text-align:right">\u05E1\u05D5\u05D2</th>
            <th style="padding:8px 10px;text-align:right">\u05D4\u05D6\u05DE\u05E0\u05D4</th>
            <th style="padding:8px 10px;text-align:right">\u05E1\u05DB\u05D5\u05DD \u05E1\u05D5\u05E4\u05D9</th>
            <th style="padding:8px 10px;text-align:right">\u05E1\u05D8\u05D8\u05D5\u05E1</th>
          </tr></thead>
          <tbody id="pending-table-body">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// -- Accordion row (header + expandable detail) -----------
function pendingAccordionRow(r) {
  const typeLabel = r.action_type === 'return' ? '\u05D4\u05D7\u05D6\u05E8\u05D4' : '\u05DE\u05DB\u05D9\u05E8\u05D4';
  const amount = r.final_amount ? Number(r.final_amount).toLocaleString('he-IL') : '\u2014';
  const isPending = r.status === 'pending';
  const rowBg = isPending ? '#fff' : '#f1f5f9';
  const rowOpacity = isPending ? '1' : '0.6';
  const isExpanded = expandedPendingId === r.id;

  let html = `<tr style="background:${rowBg};opacity:${rowOpacity};cursor:pointer;border-bottom:1px solid #e2e8f0"
    onclick="togglePendingRow('${r.id}')">
    <td style="padding:8px 10px"><a href="#" onclick="event.preventDefault();event.stopPropagation();searchBarcodeInInventory('${escapeHtml(r.barcode_received)}')"
      style="color:#3b82f6;text-decoration:underline;font-weight:700"><code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${escapeHtml(r.barcode_received)}</code></a></td>
    <td style="padding:8px 10px">${r.quantity || 1}</td>
    <td style="padding:8px 10px">${typeLabel}</td>
    <td style="padding:8px 10px">${escapeHtml(r.order_number || '\u2014')}</td>
    <td style="padding:8px 10px">${amount}</td>
    <td style="padding:8px 10px">${pendingStatusBadge(r.status)}</td>
  </tr>`;

  html += `<tr id="pending-detail-${r.id}" style="display:${isExpanded ? 'table-row' : 'none'};background:#f8fafc">
    <td colspan="6" style="padding:12px 16px;border-bottom:2px solid #e2e8f0">
      ${pendingDetailContent(r)}
    </td>
  </tr>`;

  return html;
}

// -- Detail content inside expanded row -------------------
function pendingDetailContent(r) {
  const isPending = r.status === 'pending';

  // Show only product detail fields (skip null/empty)
  const parts = [];
  if (r.brand) parts.push(`\u05DE\u05D5\u05EA\u05D2: ${escapeHtml(r.brand)}`);
  if (r.model) parts.push(`\u05D3\u05D2\u05DD: ${escapeHtml(r.model)}`);
  if (r.size) parts.push(`\u05D2\u05D5\u05D3\u05DC: ${escapeHtml(r.size)}`);
  if (r.color) parts.push(`\u05E6\u05D1\u05E2: ${escapeHtml(r.color)}`);
  const detailLine = parts.length ? parts.join(' | ') : '<span style="color:#94a3b8">\u05D0\u05D9\u05DF \u05E4\u05E8\u05D8\u05D9 \u05DE\u05D5\u05E6\u05E8</span>';

  let actionsHtml = '';
  if (isPending) {
    actionsHtml = `
      <div style="display:flex;gap:10px;margin-top:10px">
        <button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none;padding:6px 14px;border-radius:6px"
          onclick="event.stopPropagation();markResolved('${r.id}')">\u05E2\u05D5\u05D3\u05DB\u05DF \u05D9\u05D3\u05E0\u05D9\u05EA \u2705</button>
        <button class="btn btn-sm" style="background:#ea580c;color:#fff;border:none;padding:6px 14px;border-radius:6px"
          onclick="event.stopPropagation();markIgnored('${r.id}')">\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u274C</button>
      </div>`;
  } else {
    const tag = r.status === 'resolved'
      ? '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:.82rem">\u05E2\u05D5\u05D3\u05DB\u05DF</span>'
      : '<span style="background:#ffedd5;color:#ea580c;padding:2px 8px;border-radius:4px;font-size:.82rem">\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0</span>';
    const resolvedTime = r.resolved_at
      ? ' <span style="font-size:.82rem;color:#64748b">' + new Date(r.resolved_at).toLocaleString('he-IL') + '</span>'
      : '';
    actionsHtml = `<div style="margin-top:8px">${tag}${resolvedTime}</div>`;
  }

  return `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="flex:1;font-size:.9rem">${detailLine}</div>
      <button class="btn btn-g btn-sm" onclick="event.stopPropagation();copyPendingData('${r.id}')"
        title="\u05D4\u05E2\u05EA\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD" style="min-width:auto;padding:4px 8px">\uD83D\uDCCB</button>
    </div>
    ${actionsHtml}`;
}

// -- Toggle accordion row ---------------------------------
function togglePendingRow(id) {
  if (expandedPendingId === id) {
    const el = $('pending-detail-' + id);
    if (el) el.style.display = 'none';
    expandedPendingId = null;
    return;
  }
  if (expandedPendingId) {
    const prev = $('pending-detail-' + expandedPendingId);
    if (prev) prev.style.display = 'none';
  }
  expandedPendingId = id;
  const el = $('pending-detail-' + id);
  if (el) el.style.display = 'table-row';
}

// -- Status badge -----------------------------------------
function pendingStatusBadge(status) {
  if (status === 'pending')
    return '<span style="color:#ca8a04;font-weight:600">\u05DE\u05DE\u05EA\u05D9\u05DF</span>';
  if (status === 'resolved')
    return '<span style="color:#16a34a;font-size:.82rem;background:#dcfce7;padding:2px 6px;border-radius:4px">\u05E2\u05D5\u05D3\u05DB\u05DF</span>';
  if (status === 'ignored')
    return '<span style="color:#ea580c;font-size:.82rem;background:#ffedd5;padding:2px 6px;border-radius:4px">\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0</span>';
  return escapeHtml(status);
}

// -- Close panel ------------------------------------------
function closePendingPanel() {
  const overlay = $('pending-panel-overlay');
  if (overlay) overlay.style.display = 'none';
  expandedPendingId = null;
}

// -- Copy pending data to clipboard -----------------------
function copyPendingData(id) {
  const r = pendingData.find(x => x.id === id);
  if (!r) return;
  const amount = r.final_amount ? Number(r.final_amount).toLocaleString('he-IL') : '';
  const parts = [`\u05D1\u05E8\u05E7\u05D5\u05D3: ${r.barcode_received || ''}`];
  if (r.brand) parts.push(`\u05DE\u05D5\u05EA\u05D2: ${r.brand}`);
  if (r.model) parts.push(`\u05D3\u05D2\u05DD: ${r.model}`);
  if (r.size) parts.push(`\u05D2\u05D5\u05D3\u05DC: ${r.size}`);
  if (r.color) parts.push(`\u05E6\u05D1\u05E2: ${r.color}`);
  if (r.order_number) parts.push(`\u05D4\u05D6\u05DE\u05E0\u05D4: ${r.order_number}`);
  if (amount) parts.push(`\u05E1\u05DB\u05D5\u05DD: ${amount}`);
  navigator.clipboard.writeText(parts.join(' | '))
    .then(() => toast('\u05D4\u05D5\u05E2\u05EA\u05E7 \u05DC\u05DC\u05D5\u05D7', 's'))
    .catch(() => toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05EA\u05E7\u05D4', 'e'));
}

// -- Search barcode in inventory tab ----------------------
function searchBarcodeInInventory(barcode) {
  closePendingPanel();
  showTab('inventory');
  setTimeout(() => {
    const input = $('inv-search');
    if (input) {
      input.value = barcode;
      if (typeof filterInventoryTable === 'function') filterInventoryTable();
    }
  }, 200);
}

// -- Update panel count (backward compat) -----------------
function updatePendingPanelCount() {
  renderPendingPanel();
}
