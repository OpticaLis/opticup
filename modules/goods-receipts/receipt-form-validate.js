// receipt-form-validate.js — Receipt form UI validation: sort lock + invoice-total compare.
// Split from receipt-form-items.js per RECEIPT_FORM_FIXES_FROM_MANAGER §13.
// Load AFTER receipt-form-items.js (depends on global updateReceiptItemsStats).

// ── Sort lock state (default = locked) ────────────────────────
window._rcptSortLocked = true;

// ── Receipt items column sort (DOM reorder), gated by lock ────
var _rcptSortKeyMap = { barcode: '.rcpt-barcode', brand: '.rcpt-brand', model: '.rcpt-model', color: '.rcpt-color', size: '.rcpt-size', qty: '.rcpt-qty', cost: '.rcpt-ucost' };
document.addEventListener('click', function(e) {
  if (window._rcptSortLocked === true) return;
  var th = e.target.closest('#rcpt-items-thead th[data-sort-key]');
  if (!th || typeof SortUtils === 'undefined') return;
  var s = SortUtils.toggle('rcpt-items', th.dataset.sortKey);
  SortUtils.updateHeaders(document.getElementById('rcpt-items-thead'), s.key, s.dir);
  var tbody = document.getElementById('rcpt-items-body');
  if (!tbody) return;
  var sel = _rcptSortKeyMap[s.key]; if (!sel) return;
  var rows = Array.from(tbody.querySelectorAll('tr[data-row]'));
  rows.sort(function(a, b) {
    var va = (a.querySelector(sel) || {}).value || '';
    var vb = (b.querySelector(sel) || {}).value || '';
    var na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return s.dir === 'asc' ? na - nb : nb - na;
    var cmp = va.localeCompare(vb, 'he');
    return s.dir === 'asc' ? cmp : -cmp;
  });
  rows.forEach(function(tr) {
    var noteRow = document.getElementById('rcpt-note-row-' + tr.dataset.row);
    tbody.appendChild(tr);
    if (noteRow) tbody.appendChild(noteRow);
  });
});

// ── Sort lock UI toggle ────────────────────────────────────────
function toggleRcptSortLock() {
  window._rcptSortLocked = !window._rcptSortLocked;
  var locked = window._rcptSortLocked;
  var btn = document.getElementById('rcpt-sort-lock-btn');
  if (btn) {
    btn.innerHTML = locked ? '🔒 סדר נעול' : '🔓 מיון פתוח';
    btn.style.background = locked ? '' : '#fbbf24';
  }
  document.querySelectorAll('#rcpt-items-thead th[data-sort-key]').forEach(function(th) {
    th.style.opacity = locked ? '0.6' : '1';
    th.style.cursor  = locked ? 'default' : 'pointer';
  });
}

function _initRcptSortLockUI() {
  var btn = document.getElementById('rcpt-sort-lock-btn');
  if (btn) btn.innerHTML = '🔒 סדר נעול';
  document.querySelectorAll('#rcpt-items-thead th[data-sort-key]').forEach(function(th) {
    th.style.opacity = '0.6';
    th.style.cursor  = 'default';
  });
}

document.addEventListener('DOMContentLoaded', _initRcptSortLockUI);

// ── Invoice-total compare (item 14) ────────────────────────────
// Reads #rcpt-invoice-total, computes delta vs `systemTotalCost` (passed in
// from updateReceiptItemsStats), writes ✅/❌ to #rcpt-invoice-total-status,
// appends a coloured status node to #rcpt-items-stats. Empty input = no-op.
function _updateRcptInvoiceCompare(systemTotalCost) {
  var input = document.getElementById('rcpt-invoice-total');
  var statusEl = document.getElementById('rcpt-invoice-total-status');
  if (!input) return;
  var raw = (input.value || '').trim();
  if (raw === '') {
    if (statusEl) statusEl.textContent = '';
    return;
  }
  var invoiceTotal = parseFloat(raw);
  if (isNaN(invoiceTotal)) {
    if (statusEl) statusEl.textContent = '';
    return;
  }
  var delta = invoiceTotal - systemTotalCost;
  var match = Math.abs(delta) <= 1.00;
  if (statusEl) statusEl.textContent = match ? '✅' : '❌';
  // Append a status node to the stats line (avoids innerHTML per Iron Rule 8).
  var stats = document.getElementById('rcpt-items-stats');
  if (stats) {
    stats.appendChild(document.createTextNode(' | '));
    var span = document.createElement('span');
    if (match) {
      span.textContent = '✅ תואם חשבונית';
    } else {
      span.textContent = '❌ פער ' + delta.toFixed(2) + ' ₪ מול החשבונית';
      span.style.color = '#dc2626';
    }
    stats.appendChild(span);
  }
}

// Returns { delta, hasInvoiceTotal, invoiceTotal, systemTotal }. Used by
// confirmReceipt to gate confirmation when |delta| > 1.00.
function _rcptInvoiceTotalDelta() {
  var input = document.getElementById('rcpt-invoice-total');
  var raw = input ? (input.value || '').trim() : '';
  if (raw === '') return { delta: 0, hasInvoiceTotal: false, invoiceTotal: 0, systemTotal: 0 };
  var invoiceTotal = parseFloat(raw);
  if (isNaN(invoiceTotal)) return { delta: 0, hasInvoiceTotal: false, invoiceTotal: 0, systemTotal: 0 };
  var items;
  try { items = (typeof getReceiptItems === 'function') ? getReceiptItems() : []; } catch (e) { items = []; }
  var active = items.filter(function(i) { return i.receipt_status !== 'not_received'; });
  var systemTotal = active.reduce(function(s, i) { return s + i.quantity * (i.unit_cost || 0); }, 0);
  return { delta: invoiceTotal - systemTotal, hasInvoiceTotal: true, invoiceTotal: invoiceTotal, systemTotal: systemTotal };
}

// Re-runs the compare on every keystroke so the status icon stays live.
function _initRcptInvoiceCompareListener() {
  var el = document.getElementById('rcpt-invoice-total');
  if (el && typeof updateReceiptItemsStats === 'function') {
    el.oninput = updateReceiptItemsStats;
  }
}

document.addEventListener('DOMContentLoaded', _initRcptInvoiceCompareListener);
