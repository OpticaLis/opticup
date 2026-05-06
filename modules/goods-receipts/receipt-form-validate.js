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
