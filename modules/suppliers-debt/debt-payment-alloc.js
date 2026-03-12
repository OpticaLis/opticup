// debt-payment-alloc.js — Payment wizard steps 3-4: allocation + save (Phase 4e)
// Load after: debt-payment-wizard.js
// Provides: _wizGoStep3(), autoAllocateFIFO(), _wizSavePayment()
// Uses: _wizState from debt-payment-wizard.js

// =========================================================
// Step 3 — Allocate to documents
// =========================================================
async function _wizGoStep3() {
  var amount = Number(($('wiz-amount') || {}).value) || 0;
  if (amount <= 0) { setAlert('wiz-alert', 'סכום חייב להיות חיובי', 'e'); return; }
  var date = ($('wiz-date') || {}).value;
  if (!date) { setAlert('wiz-alert', 'יש להזין תאריך', 'e'); return; }
  var method = ($('wiz-method') || {}).value;
  if (!method) { setAlert('wiz-alert', 'יש לבחור אמצעי תשלום', 'e'); return; }
  var rate = Number(($('wiz-tax-rate') || {}).value) || 0;
  var tax = Math.round(amount * rate) / 100;
  _wizState.amount = amount;
  _wizState.taxRate = rate;
  _wizState.withholdingAmount = tax;
  _wizState.netAmount = amount - tax;
  _wizState.paymentDate = date;
  _wizState.paymentMethod = method;
  _wizState.referenceNumber = (($('wiz-ref') || {}).value || '').trim();
  _wizState.notes = (($('wiz-notes') || {}).value || '').trim();

  showLoading('טוען מסמכים פתוחים...');
  try {
    var docs = await fetchAll(T.SUP_DOCS, [
      ['is_deleted', 'eq', false],
      ['supplier_id', 'eq', _wizState.supplierId]
    ]);
    _wizState.openDocs = docs.filter(function(d) {
      return d.status === 'open' || d.status === 'partially_paid';
    }).sort(function(a, b) {
      return (a.document_date || '').localeCompare(b.document_date || '');
    });
    _wizState.allocations = autoAllocateFIFO(_wizState.netAmount, _wizState.openDocs);
    _wizRenderStep3();
  } catch (e) {
    console.error('_wizGoStep3 error:', e);
    toast('שגיאה בטעינת מסמכים', 'e');
  } finally {
    hideLoading();
  }
}

function autoAllocateFIFO(paymentAmount, openDocs) {
  var remaining = paymentAmount;
  var result = [];
  for (var i = 0; i < openDocs.length; i++) {
    if (remaining <= 0) break;
    var doc = openDocs[i];
    var docRem = (Number(doc.total_amount) || 0) - (Number(doc.paid_amount) || 0);
    if (docRem <= 0) continue;
    var alloc = Math.min(remaining, docRem);
    result.push({ document_id: doc.id, allocated_amount: alloc });
    remaining -= alloc;
  }
  return result;
}

function _wizRenderStep3() {
  var docRows = _wizState.openDocs.map(function(d) {
    var docRem = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
    var alloc = _wizState.allocations.find(function(a) { return a.document_id === d.id; });
    var val = alloc ? alloc.allocated_amount.toFixed(2) : '';
    return '<tr>' +
      '<td>' + escapeHtml(d.document_number || d.internal_number || '') + '</td>' +
      '<td>' + escapeHtml(d.document_date || '') + '</td>' +
      '<td>' + formatILS(d.total_amount) + '</td>' +
      '<td>' + formatILS(docRem) + '</td>' +
      '<td><input type="number" step="0.01" min="0" max="' + docRem.toFixed(2) + '" ' +
        'value="' + val + '" class="nd-field" style="width:100px" ' +
        'data-doc-id="' + d.id + '" oninput="_wizUpdateAllocTotal()"></td>' +
    '</tr>';
  }).join('');
  if (!_wizState.openDocs.length) {
    docRows = '<tr><td colspan="5" style="text-align:center;color:var(--g400)">' +
      'אין מסמכים פתוחים לספק זה</td></tr>';
  }
  var totalAlloc = _wizState.allocations.reduce(function(s, a) { return s + a.allocated_amount; }, 0);
  $('pay-wiz-content').innerHTML =
    '<h3 style="margin:0 0 14px">תשלום חדש \u2014 שלב 3: הקצאה למסמכים</h3>' +
    '<p style="font-size:.88rem;color:var(--g600)">סכום נטו: <strong>' +
      formatILS(_wizState.netAmount) + '</strong></p>' +
    '<div id="wiz-alert"></div>' +
    '<div style="overflow-x:auto;max-height:300px;overflow-y:auto">' +
    '<table class="data-table" style="width:100%;font-size:.85rem">' +
      '<thead><tr><th>מסמך</th><th>תאריך</th><th>סכום</th><th>יתרה</th><th>הקצאה</th></tr></thead>' +
      '<tbody>' + docRows + '</tbody>' +
    '</table></div>' +
    '<div id="wiz-alloc-summary" style="margin-top:8px;font-size:.88rem;font-weight:600">' +
      'הוקצה: ' + formatILS(totalAlloc) + ' מתוך ' + formatILS(_wizState.netAmount) +
    '</div>' +
    '<div style="display:flex;gap:4px;margin-top:8px">' +
      '<button class="btn-sm" onclick="_wizAutoAllocate()">הקצאה אוטומטית</button>' +
      '<button class="btn-sm" onclick="_wizClearAlloc()">נקה</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
      '<button class="btn btn-g" onclick="_wizRenderStep2()">\u2192 חזרה</button>' +
      '<button class="btn btn-s" onclick="_wizGoStep4()">\u2190 הבא</button>' +
    '</div>';
}

function _wizUpdateAllocTotal() {
  var inputs = document.querySelectorAll('#pay-wiz-content input[data-doc-id]');
  var total = 0;
  _wizState.allocations = [];
  inputs.forEach(function(inp) {
    var val = Number(inp.value) || 0;
    if (val > 0) {
      _wizState.allocations.push({
        document_id: inp.getAttribute('data-doc-id'), allocated_amount: val
      });
      total += val;
    }
  });
  var el = $('wiz-alloc-summary');
  if (!el) return;
  var diff = total - _wizState.netAmount;
  var warn = Math.abs(diff) >= 0.01;
  el.innerHTML = 'הוקצה: ' + formatILS(total) + ' מתוך ' + formatILS(_wizState.netAmount) +
    (warn ? ' <span style="color:var(--error)">(' +
      (diff > 0 ? 'עודף' : 'חסר') + ' ' + formatILS(Math.abs(diff)) + ')</span>' : '');
}

function _wizAutoAllocate() {
  _wizState.allocations = autoAllocateFIFO(_wizState.netAmount, _wizState.openDocs);
  document.querySelectorAll('#pay-wiz-content input[data-doc-id]').forEach(function(inp) {
    var docId = inp.getAttribute('data-doc-id');
    var a = _wizState.allocations.find(function(x) { return x.document_id === docId; });
    inp.value = a ? a.allocated_amount.toFixed(2) : '';
  });
  _wizUpdateAllocTotal();
}

function _wizClearAlloc() {
  _wizState.allocations = [];
  document.querySelectorAll('#pay-wiz-content input[data-doc-id]').forEach(function(inp) {
    inp.value = '';
  });
  _wizUpdateAllocTotal();
}

// =========================================================
// Step 4 — Confirm + save
// =========================================================
function _wizGoStep4() {
  var totalAlloc = _wizState.allocations.reduce(function(s, a) { return s + a.allocated_amount; }, 0);
  if (_wizState.openDocs.length && Math.abs(totalAlloc - _wizState.netAmount) >= 0.01) {
    if (!confirm('סכום ההקצאה (' + formatILS(totalAlloc) + ') שונה מהנטו (' +
        formatILS(_wizState.netAmount) + '). להמשיך?')) return;
  }
  _wizRenderStep4();
}

function _wizRenderStep4() {
  var methMap = {};
  _payMethods.forEach(function(m) { methMap[m.code] = m.name_he; });
  var totalAlloc = _wizState.allocations.reduce(function(s, a) { return s + a.allocated_amount; }, 0);
  $('pay-wiz-content').innerHTML =
    '<h3 style="margin:0 0 14px">תשלום חדש \u2014 שלב 4: אישור</h3>' +
    '<div id="wiz-alert"></div>' +
    '<div style="background:var(--g100);padding:12px;border-radius:6px;font-size:.88rem">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
        '<div><strong>ספק:</strong> ' + escapeHtml(_wizState.supplierName) + '</div>' +
        '<div><strong>תאריך:</strong> ' + escapeHtml(_wizState.paymentDate) + '</div>' +
        '<div><strong>ברוטו:</strong> ' + formatILS(_wizState.amount) + '</div>' +
        '<div><strong>ניכוי מס:</strong> ' + formatILS(_wizState.withholdingAmount) +
          ' (' + _wizState.taxRate + '%)</div>' +
        '<div><strong>נטו:</strong> ' + formatILS(_wizState.netAmount) + '</div>' +
        '<div><strong>אמצעי:</strong> ' +
          escapeHtml(methMap[_wizState.paymentMethod] || _wizState.paymentMethod) + '</div>' +
        '<div><strong>אסמכתא:</strong> ' +
          escapeHtml(_wizState.referenceNumber || '\u2014') + '</div>' +
        '<div><strong>הקצאה:</strong> ' + formatILS(totalAlloc) +
          ' (' + _wizState.allocations.length + ' מסמכים)</div>' +
      '</div>' +
    '</div>' +
    '<label style="display:block;margin-top:12px">קוד עובד (PIN)' +
      '<input type="password" id="wiz-pin" maxlength="10" class="nd-field" inputmode="numeric">' +
    '</label>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
      '<button class="btn btn-g" onclick="_wizRenderStep3()">\u2192 חזרה</button>' +
      '<button class="btn btn-s" onclick="_wizSavePayment()">אשר תשלום</button>' +
    '</div>';
}

async function _wizSavePayment() {
  var pin = (($('wiz-pin') || {}).value || '').trim();
  if (!pin) { setAlert('wiz-alert', 'יש להזין קוד עובד', 'e'); return; }
  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('wiz-alert', 'קוד עובד שגוי', 'e'); return; }

  showLoading('שומר תשלום...');
  try {
    // 1. Create payment record
    var created = await batchCreate(T.SUP_PAYMENTS, [{
      supplier_id: _wizState.supplierId,
      amount: _wizState.amount,
      currency: 'ILS',
      payment_date: _wizState.paymentDate,
      payment_method: _wizState.paymentMethod,
      reference_number: _wizState.referenceNumber || null,
      withholding_tax_rate: _wizState.taxRate,
      withholding_tax_amount: _wizState.withholdingAmount,
      net_amount: _wizState.netAmount,
      status: 'approved',
      approved_by: emp.id,
      approved_at: new Date().toISOString(),
      notes: _wizState.notes || null,
      created_by: emp.id
    }]);
    var paymentId = created[0].id;

    // 2. Create allocations + update documents
    if (_wizState.allocations.length) {
      var allocRecs = _wizState.allocations.map(function(a) {
        return {
          payment_id: paymentId,
          document_id: a.document_id,
          allocated_amount: a.allocated_amount
        };
      });
      await batchCreate(T.PAY_ALLOC, allocRecs);

      // 3. Update paid_amount + status on each allocated document
      for (var i = 0; i < _wizState.allocations.length; i++) {
        var alloc = _wizState.allocations[i];
        var doc = _wizState.openDocs.find(function(d) { return d.id === alloc.document_id; });
        if (!doc) continue;
        var newPaid = (Number(doc.paid_amount) || 0) + alloc.allocated_amount;
        var newStatus = newPaid >= Number(doc.total_amount) ? 'paid' : 'partially_paid';
        await batchUpdate(T.SUP_DOCS, [{
          id: alloc.document_id, paid_amount: newPaid, status: newStatus
        }]);
      }
    }

    // 4. Write audit log
    await writeLog('payment_create', null, {
      reason: 'תשלום חדש \u2014 ' + formatILS(_wizState.amount) +
        ' ל' + _wizState.supplierName,
      source_ref: _wizState.referenceNumber || paymentId
    });

    closeAndRemoveModal('pay-wizard-modal');
    toast('תשלום נשמר בהצלחה');
    await loadPaymentsTab();
    await loadDebtSummary();
  } catch (e) {
    console.error('_wizSavePayment error:', e);
    setAlert('wiz-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}
