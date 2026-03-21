// debt-payments.js — Payments tab for supplier debt (Phase 4e)
// Load after: shared.js, supabase-ops.js, debt-dashboard.js
// Provides: loadPaymentsTab(), applyPayFilters(), viewPayment()
// Wizard: see debt-payment-wizard.js

let _payData = [], _paySuppliers = [], _payMethods = [];
let _payAllocMap = {}, _payDocMap = {};

const PAY_STATUS_MAP = {
  draft:            { he: 'טיוטה',         cls: 'dst-cancel' },
  pending_approval: { he: 'ממתין לאישור',  cls: 'dst-partial' },
  approved:         { he: 'מאושר',         cls: 'dst-open' },
  executed:         { he: 'בוצע',          cls: 'dst-paid' },
  cancelled:        { he: 'מבוטל',         cls: 'pst-red' }
};

// --- Load + render ---
async function loadPaymentsTab() {
  var tid = getTenantId();
  if (!tid) return;
  showLoading('טוען תשלומים...');
  try {
    var results = await Promise.all([
      fetchAll(T.SUP_PAYMENTS, [['is_deleted', 'eq', false]]),
      fetchAll(T.PAY_METHODS, [['is_active', 'eq', true]]),
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]]),
      fetchAll(T.PAY_ALLOC, []),
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false]])
    ]);
    _payData = results[0];
    _payMethods = results[1];
    _paySuppliers = results[2];
    // Build allocation map: payment_id → [alloc]
    _payAllocMap = {};
    results[3].forEach(function(a) {
      if (!_payAllocMap[a.payment_id]) _payAllocMap[a.payment_id] = [];
      _payAllocMap[a.payment_id].push(a);
    });
    // Build document map: id → doc (for "כנגד" column)
    _payDocMap = {};
    results[4].forEach(function(d) { _payDocMap[d.id] = d; });

    renderPaymentsToolbar();
    renderPaymentsTable(_payData);
  } catch (e) {
    console.error('loadPaymentsTab error:', e);
    toast('שגיאה בטעינת תשלומים', 'e');
  } finally {
    hideLoading();
  }
}

// --- Toolbar ---
function renderPaymentsToolbar() {
  var container = $('dtab-payments');
  var supOpts = _paySuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  container.innerHTML =
    '<div class="doc-toolbar">' +
      '<select id="pay-f-supplier" onchange="applyPayFilters()" class="doc-filter-input">' +
        '<option value="">כל הספקים</option>' + supOpts +
      '</select>' +
      '<select id="pay-f-status" onchange="applyPayFilters()" class="doc-filter-input">' +
        '<option value="">כל הסטטוסים</option>' +
        '<option value="approved">מאושר</option>' +
        '<option value="executed">בוצע</option>' +
        '<option value="pending_approval">ממתין</option>' +
        '<option value="cancelled">מבוטל</option>' +
      '</select>' +
      '<input type="date" id="pay-f-from" onchange="applyPayFilters()" class="doc-filter-input">' +
      '<input type="date" id="pay-f-to" onchange="applyPayFilters()" class="doc-filter-input">' +
      '<button class="btn doc-add-btn" style="background:#059669;color:#fff" onclick="openNewPaymentWizard()">+ תשלום חדש</button>' +
    '</div>' +
    '<div id="pay-table-wrap"></div>';
}

// --- Filtering ---
function applyPayFilters() {
  var fSup    = ($('pay-f-supplier') || {}).value || '';
  var fStatus = ($('pay-f-status') || {}).value || '';
  var fFrom   = ($('pay-f-from') || {}).value || '';
  var fTo     = ($('pay-f-to') || {}).value || '';
  var filtered = _payData.filter(function(p) {
    if (fSup && p.supplier_id !== fSup) return false;
    if (fStatus && p.status !== fStatus) return false;
    if (fFrom && p.payment_date < fFrom) return false;
    if (fTo && p.payment_date > fTo) return false;
    return true;
  });
  filtered.sort(function(a, b) {
    return (b.payment_date || '').localeCompare(a.payment_date || '');
  });
  renderPaymentsTable(filtered);
}

// --- Table ---
function renderPaymentsTable(payments) {
  var wrap = $('pay-table-wrap');
  if (!wrap) return;
  if (!payments.length) {
    wrap.innerHTML = '<div class="empty-state">אין תשלומים להצגה</div>';
    return;
  }
  var supMap = {};
  _paySuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var methMap = {};
  _payMethods.forEach(function(m) { methMap[m.code] = m.name_he; });

  var rows = payments.map(function(p) {
    var st = PAY_STATUS_MAP[p.status] || { he: p.status, cls: '' };
    var net = Number(p.net_amount) || (Number(p.amount) - (Number(p.withholding_tax_amount) || 0));
    // Build "כנגד" from allocations → document numbers
    var allocs = _payAllocMap[p.id] || [];
    var againstParts = allocs.map(function(a) {
      var doc = _payDocMap[a.document_id];
      return doc ? (doc.document_number || doc.internal_number || '?') : '?';
    });
    var againstText = againstParts.length ? againstParts.join(', ') : '—';

    return '<tr>' +
      '<td>' + escapeHtml(p.payment_date || '') + '</td>' +
      '<td>' + escapeHtml(supMap[p.supplier_id] || '') + '</td>' +
      '<td>' + formatILS(p.amount) + '</td>' +
      '<td>' + formatILS(p.withholding_tax_amount) + '</td>' +
      '<td>' + formatILS(net) + '</td>' +
      '<td>' + escapeHtml(methMap[p.payment_method] || p.payment_method || '') + '</td>' +
      '<td>' + escapeHtml(p.reference_number || '') + '</td>' +
      '<td title="' + escapeHtml(againstText) + '">' +
        escapeHtml(againstText.length > 30 ? againstText.slice(0, 28) + '\u2026' : againstText) +
      '</td>' +
      '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td><button class="btn-sm" onclick="viewPayment(\'' + p.id + '\')">צפה</button>' +
        (p.status === 'approved' ? ' <button class="btn-sm" style="background:#ef4444;color:#fff" onclick="cancelPayment(\'' + p.id + '\')">ביטול</button>' : '') +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr>' +
        '<th>תאריך</th><th>ספק</th><th>סכום</th><th>ניכוי מס</th><th>נטו</th>' +
        '<th>אמצעי</th><th>אסמכתא</th><th>כנגד</th><th>סטטוס</th><th>פעולות</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

// --- View payment detail ---
function viewPayment(payId) {
  var pay = _payData.find(function(p) { return p.id === payId; });
  if (!pay) return;
  var supMap = {};
  _paySuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var methMap = {};
  _payMethods.forEach(function(m) { methMap[m.code] = m.name_he; });
  var st = PAY_STATUS_MAP[pay.status] || { he: pay.status, cls: '' };
  var net = Number(pay.net_amount) || (Number(pay.amount) - (Number(pay.withholding_tax_amount) || 0));

  var allocs = _payAllocMap[payId] || [];
  var allocRows = allocs.length
    ? allocs.map(function(a) {
        var doc = _payDocMap[a.document_id];
        var docNum = doc ? (doc.document_number || doc.internal_number) : a.document_id.slice(0, 8) + '\u2026';
        return '<tr><td>' + escapeHtml(docNum) + '</td><td>' + formatILS(a.allocated_amount) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="2" style="text-align:center;color:var(--g400)">אין הקצאות</td></tr>';

  var modal = document.createElement('div');
  modal.id = 'view-pay-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:440px">' +
      '<h3 style="margin:0 0 14px">פרטי תשלום</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.9rem">' +
        '<div><strong>ספק:</strong> ' + escapeHtml(supMap[pay.supplier_id] || '') + '</div>' +
        '<div><strong>תאריך:</strong> ' + escapeHtml(pay.payment_date || '') + '</div>' +
        '<div><strong>ברוטו:</strong> ' + formatILS(pay.amount) + '</div>' +
        '<div><strong>ניכוי מס:</strong> ' + formatILS(pay.withholding_tax_amount) +
          ' (' + (Number(pay.withholding_tax_rate) || 0) + '%)</div>' +
        '<div><strong>נטו:</strong> ' + formatILS(net) + '</div>' +
        '<div><strong>אמצעי:</strong> ' + escapeHtml(methMap[pay.payment_method] || pay.payment_method || '') + '</div>' +
        '<div><strong>אסמכתא:</strong> ' + escapeHtml(pay.reference_number || '\u2014') + '</div>' +
        '<div><strong>סטטוס:</strong> <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></div>' +
      '</div>' +
      (pay.notes ? '<div style="margin-top:10px;font-size:.85rem"><strong>הערות:</strong> ' + escapeHtml(pay.notes) + '</div>' : '') +
      '<h4 style="margin:14px 0 6px;font-size:.9rem">הקצאות למסמכים</h4>' +
      '<table class="data-table" style="width:100%;font-size:.85rem">' +
        '<thead><tr><th>מסמך</th><th>סכום</th></tr></thead>' +
        '<tbody>' + allocRows + '</tbody>' +
      '</table>' +
      '<div style="text-align:left;margin-top:14px">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'view-pay-modal\')">סגור</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function cancelPayment(payId) {
  var pay = _payData.find(function(p) { return p.id === payId; });
  if (!pay || pay.status !== 'approved') { toast('ניתן לבטל רק תשלום מאושר', 'e'); return; }
  var ok = await confirmDialog('ביטול תשלום', 'האם לבטל את התשלום? הסכום יוחזר ליתרת החוב');
  if (!ok) return;
  promptPin('ביטול תשלום — אימות עובד', async function(pin, emp) {
    showLoading('מבטל תשלום...');
    try {
      // Delete allocations for this payment
      var allocs = _payAllocMap[payId] || [];
      if (allocs.length) {
        var allocIds = allocs.map(function(a) { return a.id; });
        for (var i = 0; i < allocIds.length; i++) {
          await sb.from(T.PAY_ALLOC).delete().eq('id', allocIds[i]);
        }
      }
      await batchUpdate(T.SUP_PAYMENTS, [{ id: payId, status: 'cancelled' }]);
      await writeLog('payment_cancel', null, { payment_id: payId, amount: pay.amount, cancelled_by: emp.id });
      toast('תשלום בוטל');
      closeAndRemoveModal('view-pay-modal');
      await loadPaymentsTab();
    } catch (e) {
      console.error('cancelPayment error:', e);
      toast('שגיאה בביטול: ' + (e.message || ''), 'e');
    } finally {
      hideLoading();
    }
  });
}
