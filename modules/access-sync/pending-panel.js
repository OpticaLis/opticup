// =========================================================
// PENDING SALES PANEL — View 1: Table list + View 2: Detail
// =========================================================

let pendingData = [];

// ── Render panel overlay with table ─────────────────────
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
    showPendingList();
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD', 'e');
  }
}

// ── Show table list (View 1) ────────────────────────────
function showPendingList() {
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
  overlay.innerHTML = `
    <div class="modal" style="max-width:900px;width:95%;max-height:85vh;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0">\u26A0\uFE0F \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC (${pendingCount})</h3>
        <button class="btn btn-g btn-sm" onclick="closePendingPanel()" style="min-width:auto;padding:4px 12px;font-size:1.1rem">&times;</button>
      </div>
      <div style="overflow-y:auto;flex:1">
        <table style="width:100%;font-size:.88rem">
          <thead><tr>
            <th>\u05D1\u05E8\u05E7\u05D5\u05D3</th>
            <th>\u05E1\u05D5\u05D2</th>
            <th>\u05D4\u05D6\u05DE\u05E0\u05D4</th>
            <th>\u05EA\u05D0\u05E8\u05D9\u05DA</th>
            <th>\u05E1\u05DB\u05D5\u05DD</th>
            <th>\u05E1\u05D8\u05D8\u05D5\u05E1</th>
            <th></th>
          </tr></thead>
          <tbody id="pending-table-body">
            ${pendingData.length === 0
              ? '<tr><td colspan="7" style="text-align:center;color:#888;padding:32px 0">\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD</td></tr>'
              : pendingData.map(r => pendingRowHtml(r)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Single table row ────────────────────────────────────
function pendingRowHtml(r) {
  const typeLabel = r.action_type === 'return' ? '\u05D4\u05D7\u05D6\u05E8\u05D4' : '\u05DE\u05DB\u05D9\u05E8\u05D4';
  const date = r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('he-IL') : '';
  const amount = r.final_amount ? Number(r.final_amount).toLocaleString('he-IL') : '\u2014';
  const isResolved = r.status !== 'pending';
  const rowStyle = isResolved ? 'opacity:.5' : 'cursor:pointer';
  const statusBadge = pendingStatusBadge(r.status);

  return `<tr style="${rowStyle}" onclick="openPendingDetail('${r.id}')">
    <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(r.barcode_received)}</code></td>
    <td>${typeLabel}</td>
    <td>${escapeHtml(r.order_number || '')}</td>
    <td>${date}</td>
    <td>${amount}</td>
    <td>${statusBadge}</td>
    <td><button class="btn btn-g btn-sm" style="padding:2px 8px" title="\u05E4\u05E8\u05D8\u05D9\u05DD">\uD83D\uDC41\uFE0F</button></td>
  </tr>`;
}

function pendingStatusBadge(status) {
  if (status === 'pending')  return '<span style="color:#ca8a04;font-weight:600">\u05DE\u05DE\u05EA\u05D9\u05DF</span>';
  if (status === 'resolved') return '<span style="color:#16a34a">\u2705 \u05D8\u05D5\u05E4\u05DC</span>';
  if (status === 'ignored')  return '<span style="color:#9ca3af">\u274C \u05DC\u05D0 \u05E7\u05D9\u05D9\u05DD</span>';
  return escapeHtml(status);
}

function closePendingPanel() {
  const overlay = $('pending-panel-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Detail view (View 2) ───────────────────────────────
function openPendingDetail(id) {
  const r = pendingData.find(x => x.id === id);
  if (!r) return;

  const overlay = $('pending-panel-overlay');
  if (!overlay) return;

  const typeLabel = r.action_type === 'return' ? '\u05D4\u05D7\u05D6\u05E8\u05D4' : '\u05DE\u05DB\u05D9\u05E8\u05D4';
  const isPending = r.status === 'pending';

  const fields = [
    ['\u05D1\u05E8\u05E7\u05D5\u05D3',              r.barcode_received, true],
    ['\u05DB\u05DE\u05D5\u05EA',                r.quantity,          false],
    ['\u05E1\u05D5\u05D2 \u05E4\u05E2\u05D5\u05DC\u05D4',         typeLabel,           false],
    ['\u05EA\u05D0\u05E8\u05D9\u05DA',               r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('he-IL') : '', false],
    ['\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05D4',       r.order_number,      false],
    ['\u05E2\u05D5\u05D1\u05D3',                r.employee_id,       false],
    ['\u05DE\u05D7\u05D9\u05E8 \u05DE\u05E7\u05D5\u05E8',          fmtNum(r.sale_amount), false],
    ['\u05D4\u05E0\u05D7\u05D4',               fmtNum(r.discount),   false],
    ['\u05D4\u05E0\u05D7\u05D4 1',             fmtNum(r.discount_1), false],
    ['\u05D4\u05E0\u05D7\u05D4 2',             fmtNum(r.discount_2), false],
    ['\u05E1\u05DB\u05D5\u05DD \u05E1\u05D5\u05E4\u05D9',          fmtNum(r.final_amount), false],
    ['\u05E7\u05D5\u05D3 \u05E7\u05D5\u05E4\u05D5\u05DF',          r.coupon_code,       false],
    ['\u05E7\u05DE\u05E4\u05D9\u05D9\u05DF',             r.campaign,          false],
    ['\u05DB\u05D5\u05DC\u05DC \u05E2\u05D3\u05E9\u05D5\u05EA',       r.lens_included ? '\u05DB\u05DF' : '\u05DC\u05D0', false],
    ['\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D9\u05EA \u05E2\u05D3\u05E9\u05D5\u05EA', r.lens_category, false],
    ['\u05E7\u05D5\u05D1\u05E5 \u05DE\u05E7\u05D5\u05E8',          r.filename || r.source_ref, false],
  ];

  const fieldsHtml = fields.map(([label, val, clickable]) => {
    const display = val != null && val !== '' ? escapeHtml(String(val)) : '\u2014';
    const valHtml = clickable
      ? `<span style="color:var(--accent);cursor:pointer;text-decoration:underline" onclick="searchBarcodeInInventory('${escapeHtml(String(val))}')">${display}</span>`
      : `<span>${display}</span>`;
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">
      <span style="color:#64748b;font-weight:500">${label}</span>
      ${valHtml}
    </div>`;
  }).join('');

  const buttonsHtml = isPending ? `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn btn-g" onclick="copyPendingData('${r.id}')">\uD83D\uDCCB \u05D4\u05E2\u05EA\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD</button>
      <button class="btn btn-p" onclick="markResolved('${r.id}')">\u05E2\u05D5\u05D3\u05DB\u05DF \u05D9\u05D3\u05E0\u05D9\u05EA \u2705</button>
      <button class="btn" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5" onclick="markIgnored('${r.id}')">\u05DC\u05D0 \u05E7\u05D9\u05D9\u05DD \u05D1\u05DE\u05DC\u05D0\u05D9 \u274C</button>
    </div>` : `
    <div style="margin-top:16px;padding:10px;background:#f1f5f9;border-radius:8px;font-size:.88rem;color:#64748b">
      \u05E1\u05D8\u05D8\u05D5\u05E1: ${pendingStatusBadge(r.status)}
      ${r.resolved_at ? ' | ' + new Date(r.resolved_at).toLocaleString('he-IL') : ''}
      ${r.resolution_note ? ' | ' + escapeHtml(r.resolution_note) : ''}
    </div>`;

  overlay.innerHTML = `
    <div class="modal" style="max-width:600px;width:95%;max-height:85vh;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-g btn-sm" onclick="showPendingList()" style="min-width:auto;padding:4px 10px">\u2190 \u05D7\u05D6\u05E8\u05D4</button>
          <h3 style="margin:0">\u05E4\u05E8\u05D8\u05D9 \u05E4\u05E8\u05D9\u05D8 \u05DE\u05DE\u05EA\u05D9\u05DF</h3>
        </div>
        <button class="btn btn-g btn-sm" onclick="closePendingPanel()" style="min-width:auto;padding:4px 12px;font-size:1.1rem">&times;</button>
      </div>
      <div style="overflow-y:auto;flex:1">
        ${fieldsHtml}
      </div>
      ${buttonsHtml}
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────
function fmtNum(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString('he-IL');
}

// ── Copy all fields to clipboard ────────────────────────
function copyPendingData(id) {
  const r = pendingData.find(x => x.id === id);
  if (!r) return;
  const typeLabel = r.action_type === 'return' ? '\u05D4\u05D7\u05D6\u05E8\u05D4' : '\u05DE\u05DB\u05D9\u05E8\u05D4';
  const lines = [
    `\u05D1\u05E8\u05E7\u05D5\u05D3: ${r.barcode_received || ''}`,
    `\u05DB\u05DE\u05D5\u05EA: ${r.quantity || ''}`,
    `\u05E1\u05D5\u05D2: ${typeLabel}`,
    `\u05EA\u05D0\u05E8\u05D9\u05DA: ${r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('he-IL') : ''}`,
    `\u05D4\u05D6\u05DE\u05E0\u05D4: ${r.order_number || ''}`,
    `\u05E2\u05D5\u05D1\u05D3: ${r.employee_id || ''}`,
    `\u05DE\u05D7\u05D9\u05E8 \u05DE\u05E7\u05D5\u05E8: ${fmtNum(r.sale_amount)}`,
    `\u05D4\u05E0\u05D7\u05D4: ${fmtNum(r.discount)}`,
    `\u05D4\u05E0\u05D7\u05D4 1: ${fmtNum(r.discount_1)}`,
    `\u05D4\u05E0\u05D7\u05D4 2: ${fmtNum(r.discount_2)}`,
    `\u05E1\u05DB\u05D5\u05DD \u05E1\u05D5\u05E4\u05D9: ${fmtNum(r.final_amount)}`,
    `\u05E7\u05D5\u05D3 \u05E7\u05D5\u05E4\u05D5\u05DF: ${r.coupon_code || ''}`,
    `\u05E7\u05DE\u05E4\u05D9\u05D9\u05DF: ${r.campaign || ''}`,
    `\u05E2\u05D3\u05E9\u05D5\u05EA: ${r.lens_included ? '\u05DB\u05DF' : '\u05DC\u05D0'}`,
    `\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D9\u05EA \u05E2\u05D3\u05E9\u05D5\u05EA: ${r.lens_category || ''}`,
    `\u05E7\u05D5\u05D1\u05E5: ${r.filename || r.source_ref || ''}`,
  ];
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => toast('\u05D4\u05D5\u05E2\u05EA\u05E7 \u05DC\u05DC\u05D5\u05D7', 's'))
    .catch(() => toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05EA\u05E7\u05D4', 'e'));
}

// ── Search barcode in inventory tab ─────────────────────
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

// ── Update panel header count (kept for backward compat) ─
function updatePendingPanelCount() {
  // Refresh data + re-render list
  renderPendingPanel();
}
