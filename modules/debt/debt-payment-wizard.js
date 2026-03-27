// debt-payment-wizard.js — Payment wizard steps 1-2 (Phase 4e)
// Load after: debt-payments.js
// Provides: openNewPaymentWizard(), _wizState, _wizRenderStep1/2, _wizCalcTax
// Allocation + save: see debt-payment-alloc.js

var _wizState = {};

function _wizResetState() {
  _wizState = {
    supplierId: null, supplierName: '', taxRate: 0,
    amount: 0, withholdingAmount: 0, netAmount: 0,
    paymentDate: '', paymentMethod: '', referenceNumber: '', notes: '',
    openDocs: [], allocations: [], preSelectedDocIds: null
  };
}

function openNewPaymentWizard() {
  _wizResetState();
  var modal = document.createElement('div');
  modal.id = 'pay-wizard-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal" style="max-width:560px">' +
    '<div id="pay-wiz-content"></div></div>';
  document.body.appendChild(modal);
  _wizRenderStep1();
}

// =========================================================
// Step 1 — Select supplier
// =========================================================
function _wizRenderStep1() {
  var supOpts = _paySuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  $('pay-wiz-content').innerHTML =
    '<h3 style="margin:0 0 14px">תשלום חדש \u2014 שלב 1: בחירת ספק</h3>' +
    '<div id="wiz-alert"></div>' +
    '<label>ספק<select id="wiz-supplier" class="nd-field" onchange="_wizSelectSupplier(this.value)">' +
      '<option value="">בחר ספק...</option>' + supOpts +
    '</select></label>' +
    '<div id="wiz-supplier-info" style="margin-top:12px"></div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
      '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'pay-wizard-modal\')">ביטול</button>' +
      '<button class="btn" style="background:#059669;color:#fff" onclick="_wizGoStep2()">\u2190 הבא</button>' +
    '</div>';
  if (_wizState.supplierId) {
    $('wiz-supplier').value = _wizState.supplierId;
    _wizSelectSupplier(_wizState.supplierId);
  }
}

async function _wizSelectSupplier(supplierId) {
  var infoDiv = $('wiz-supplier-info');
  if (!supplierId) { infoDiv.innerHTML = ''; return; }
  var sup = _paySuppliers.find(function(s) { return s.id === supplierId; });
  if (!sup) return;
  try {
    var docs = await fetchAll(T.SUP_DOCS, [
      ['is_deleted', 'eq', false],
      ['supplier_id', 'eq', supplierId]
    ]);
    var openDocs = docs.filter(function(d) {
      return d.status === 'open' || d.status === 'partially_paid';
    });
    var totalDebt = 0, overdue = 0;
    var today = new Date().toISOString().slice(0, 10);
    openDocs.forEach(function(d) {
      var rem = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
      totalDebt += rem;
      if (d.due_date && d.due_date < today) overdue += rem;
    });
    _wizState.taxRate = Number(sup.withholding_tax_rate) || 0;
    infoDiv.innerHTML =
      '<div style="background:var(--g100);padding:10px;border-radius:6px;font-size:.88rem">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
          '<div><strong>חוב פתוח:</strong> ' + formatILS(totalDebt) + '</div>' +
          '<div><strong>באיחור:</strong> <span style="color:' +
            (overdue > 0 ? 'var(--error)' : 'inherit') + '">' + formatILS(overdue) + '</span></div>' +
          '<div><strong>מסמכים פתוחים:</strong> ' + openDocs.length + '</div>' +
          '<div><strong>ניכוי מס במקור:</strong> ' + _wizState.taxRate + '%</div>' +
        '</div>' +
      '</div>';
  } catch (e) {
    console.error('_wizSelectSupplier error:', e);
    infoDiv.innerHTML = '<div class="alert alert-e">שגיאה בטעינת נתוני ספק</div>';
  }
}

function _wizGoStep2() {
  var supplierId = ($('wiz-supplier') || {}).value;
  if (!supplierId) { setAlert('wiz-alert', 'יש לבחור ספק', 'e'); return; }
  var sup = _paySuppliers.find(function(s) { return s.id === supplierId; });
  _wizState.supplierId = supplierId;
  _wizState.supplierName = sup ? sup.name : '';
  _wizRenderStep2();
}

// =========================================================
// Step 2 — Payment details
// =========================================================
function _wizRenderStep2() {
  var methOpts = _payMethods.map(function(m) {
    return '<option value="' + escapeHtml(m.code) + '">' + escapeHtml(m.name_he) + '</option>';
  }).join('');
  var today = new Date().toISOString().slice(0, 10);
  $('pay-wiz-content').innerHTML =
    '<h3 style="margin:0 0 14px">תשלום חדש \u2014 שלב 2: פרטי תשלום</h3>' +
    '<p style="font-size:.88rem;color:var(--g600)">ספק: <strong>' +
      escapeHtml(_wizState.supplierName) + '</strong></p>' +
    '<div id="wiz-alert"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<label>סכום (ברוטו)<input type="number" id="wiz-amount" step="0.01" min="0" ' +
        'class="nd-field" oninput="_wizCalcTax()" value="' +
        (_wizState.amount > 0 ? _wizState.amount : '') + '"></label>' +
      '<label>ניכוי מס %<input type="number" id="wiz-tax-rate" step="0.01" ' +
        'class="nd-field" oninput="_wizCalcTax()" value="' + _wizState.taxRate + '"></label>' +
      '<label>ניכוי מס \u20AA<input type="number" id="wiz-tax-amount" readonly ' +
        'class="nd-field" style="background:var(--g100)"></label>' +
      '<label>נטו<input type="number" id="wiz-net" readonly ' +
        'class="nd-field" style="background:var(--g100);font-weight:700"></label>' +
      '<label>תאריך תשלום<input type="date" id="wiz-date" class="nd-field" ' +
        'value="' + (_wizState.paymentDate || today) + '"></label>' +
      '<label>אמצעי תשלום<select id="wiz-method" class="nd-field">' +
        methOpts + '</select></label>' +
      '<label style="grid-column:1/-1">אסמכתא<input id="wiz-ref" class="nd-field" ' +
        'placeholder="מספר צ\u05F3ק / אסמכתא" value="' +
        escapeHtml(_wizState.referenceNumber) + '"></label>' +
      '<label style="grid-column:1/-1">הערות<textarea id="wiz-notes" rows="2" ' +
        'class="nd-field">' + escapeHtml(_wizState.notes) + '</textarea></label>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
      '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="_wizRenderStep1()">\u2192 חזרה</button>' +
      '<button class="btn" style="background:#059669;color:#fff" onclick="_wizGoStep3()">\u2190 הבא</button>' +
    '</div>';
  if (_wizState.paymentMethod) $('wiz-method').value = _wizState.paymentMethod;
  _wizCalcTax();
}

function _wizCalcTax() {
  var amount = Number(($('wiz-amount') || {}).value) || 0;
  var rate = Number(($('wiz-tax-rate') || {}).value) || 0;
  var tax = Math.round(amount * rate) / 100;
  if ($('wiz-tax-amount')) $('wiz-tax-amount').value = tax.toFixed(2);
  if ($('wiz-net')) $('wiz-net').value = (amount - tax).toFixed(2);
}
