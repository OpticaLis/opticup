// debt-payment-alloc.js — Payment wizard steps 3-4: allocation + save (Phase 4e)

// --- Step 3: Allocate to documents ---
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
    var docs = await fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', _wizState.supplierId]]);
    var payableTypeIds = {};
    if (typeof _docTypes !== 'undefined' && typeof _isPayableDocType === 'function') {
      _docTypes.forEach(function(t) { if (_isPayableDocType(t.code)) payableTypeIds[t.id] = true; });
    }
    _wizState.openDocs = docs.filter(function(d) {
      if (d.status !== 'open' && d.status !== 'partially_paid') return false;
      if (Object.keys(payableTypeIds).length && !payableTypeIds[d.document_type_id]) return false;
      return true;
    }).sort(function(a, b) {
      // Pre-selected docs sort first
      var preIds = _wizState.preSelectedDocIds || [];
      var aP = preIds.indexOf(a.id) >= 0 ? 0 : 1;
      var bP = preIds.indexOf(b.id) >= 0 ? 0 : 1;
      if (aP !== bP) return aP - bP;
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
  var result = [];
  var creditDocs = openDocs.filter(function(d) {
    return (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0) < 0;
  });
  var remaining = paymentAmount;
  for (var c = 0; c < creditDocs.length; c++) {
    var cd = creditDocs[c];
    var creditRem = (Number(cd.total_amount) || 0) - (Number(cd.paid_amount) || 0);
    result.push({ document_id: cd.id, allocated_amount: creditRem });
    remaining -= creditRem;
  }
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
  var creditTypeIds = {};
  if (typeof _docTypes !== 'undefined') {
    _docTypes.forEach(function(t) { if (t.code === 'credit_note') creditTypeIds[t.id] = true; });
  }
  var preIds = _wizState.preSelectedDocIds || [];
  var docRows = _wizState.openDocs.map(function(d) {
    var docRem = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
    var isCredit = creditTypeIds[d.document_type_id] || docRem < 0;
    var isPre = preIds.indexOf(d.id) >= 0;
    var alloc = _wizState.allocations.find(function(a) { return a.document_id === d.id; });
    var val = alloc ? alloc.allocated_amount.toFixed(2) : '';
    var docLabel = escapeHtml(d.document_number || d.internal_number || '');
    if (isCredit) docLabel += ' <span style="color:#059669;font-size:.75rem">(\u05D6\u05D9\u05DB\u05D5\u05D9)</span>';
    if (isPre) docLabel += ' <span style="color:#1a73e8;font-size:.75rem">\u2605</span>';
    var rowBg = isCredit ? '#f0fdf4' : (isPre ? '#eff6ff' : '');
    var rowStyle = rowBg ? ' style="background:' + rowBg + '"' : '';
    var amtStyle = isCredit ? ' style="color:#059669;font-weight:600"' : '';
    var inputAttrs = isCredit
      ? 'step="0.01" max="0" min="' + docRem.toFixed(2) + '"'
      : 'step="0.01" min="0" max="' + docRem.toFixed(2) + '"';
    return '<tr' + rowStyle + '>' +
      '<td>' + docLabel + '</td>' +
      '<td>' + escapeHtml(d.document_date || '') + '</td>' +
      '<td' + amtStyle + '>' + formatILS(d.total_amount) + '</td>' +
      '<td' + amtStyle + '>' + formatILS(docRem) + '</td>' +
      '<td><input type="number" ' + inputAttrs + ' ' +
        'value="' + val + '" class="nd-field" style="width:100px' +
        (isCredit ? ';color:#059669' : '') + '" ' +
        'data-doc-id="' + d.id + '" data-is-credit="' + (isCredit ? '1' : '0') + '" ' +
        'oninput="_wizUpdateAllocTotal()"></td>' +
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
      '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="_wizRenderStep2()">\u2192 חזרה</button>' +
      '<button class="btn" style="background:#059669;color:#fff" onclick="_wizGoStep4()">\u2190 הבא</button>' +
    '</div>';
}

function _wizUpdateAllocTotal() {
  var inputs = document.querySelectorAll('#pay-wiz-content input[data-doc-id]');
  var total = 0;
  _wizState.allocations = [];
  inputs.forEach(function(inp) {
    var val = Number(inp.value) || 0;
    var isCredit = inp.getAttribute('data-is-credit') === '1';
    if (val !== 0 && (val > 0 || isCredit)) {
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

// --- Step 4: Confirm + save ---
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
      '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="_wizRenderStep3()">\u2192 חזרה</button>' +
      '<button class="btn" style="background:#059669;color:#fff" onclick="_wizSavePayment()">אשר תשלום</button>' +
    '</div>';
}

async function _wizSavePayment() {
  var pin = (($('wiz-pin') || {}).value || '').trim();
  if (!pin) { setAlert('wiz-alert', 'יש להזין קוד עובד', 'e'); return; }
  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('wiz-alert', 'קוד עובד שגוי', 'e'); return; }

  showLoading('שומר תשלום...');
  var paymentId = null;
  var createdAllocIds = [];
  try {
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
    paymentId = created[0].id;
    if (_wizState.allocations.length) {
      var allocRecs = _wizState.allocations.map(function(a) {
        return {
          payment_id: paymentId,
          document_id: a.document_id,
          allocated_amount: a.allocated_amount
        };
      });
      var allocCreated = await batchCreate(T.PAY_ALLOC, allocRecs);
      createdAllocIds = allocCreated.map(function(a) { return a.id; });
      for (var i = 0; i < _wizState.allocations.length; i++) {
        var alloc = _wizState.allocations[i];
        var { error: rpcErr } = await sb.rpc('increment_paid_amount', {
          p_doc_id: alloc.document_id,
          p_delta: alloc.allocated_amount
        });
        if (rpcErr) throw rpcErr;
      }
    }
    var cascadeCount = 0;
    if (_wizState.allocations.length) {
      var allocDocIds = _wizState.allocations.map(function(a) { return a.document_id; });
      cascadeCount = await _cascadeSettlement(allocDocIds);
    }
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
    try {
      if (createdAllocIds.length) {
        for (var j = 0; j < createdAllocIds.length; j++) {
          await sb.from(T.PAY_ALLOC).delete().eq('id', createdAllocIds[j]).eq('tenant_id', getTenantId());
        }
      }
      if (paymentId) {
        await sb.from(T.SUP_PAYMENTS).delete().eq('id', paymentId).eq('tenant_id', getTenantId());
      }
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    setAlert('wiz-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

// --- Cascading settlement ---
async function _cascadeSettlement(docIds) {
  var closed = 0;
  try {
    var tid = getTenantId();
    var { data: freshDocs } = await sb.from(T.SUP_DOCS).select('id, status, total_amount, paid_amount')
      .in('id', docIds).eq('tenant_id', tid);
    var paidIds = (freshDocs || []).filter(function(d) {
      return d.status === 'paid';
    }).map(function(d) { return d.id; });
    if (!paidIds.length) return 0;
    var { data: links } = await sb.from(T.DOC_LINKS).select('child_document_id, parent_document_id')
      .in('parent_document_id', paidIds).eq('tenant_id', tid);
    if (!links || !links.length) return 0;
    var childIds = [...new Set(links.map(function(l) { return l.child_document_id; }))];
    var { data: children } = await sb.from(T.SUP_DOCS).select('id, status, total_amount, paid_amount')
      .in('id', childIds).eq('tenant_id', tid);
    for (var i = 0; i < (children || []).length; i++) {
      var child = children[i];
      if (child.status === 'paid' || child.status === 'cancelled') continue;
      await batchUpdate(T.SUP_DOCS, [{
        id: child.id, status: 'paid',
        paid_amount: child.total_amount
      }]);
      await writeLog('cascading_settlement', null, {
        reason: '\u05DE\u05E1\u05DE\u05DA \u05E0\u05E1\u05D2\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u2014 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D0\u05D1 \u05E9\u05D5\u05DC\u05DE\u05D4',
        source_ref: child.id
      });
      closed++;
    }
  } catch (e) {
    console.warn('_cascadeSettlement error (non-blocking):', e);
  }
  if (closed > 0) {
    toast(closed + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05E0\u05E1\u05D2\u05E8\u05D5 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA', 'i');
  }
  return closed;
}
