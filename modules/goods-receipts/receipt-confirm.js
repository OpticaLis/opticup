async function confirmReceipt() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const supplierName = $('rcpt-supplier').value;

  if (!rcptNumber) { toast('חובה למלא מספר מסמך', 'e'); return; }
  if (!supplierName) { toast('חובה לבחור ספק', 'e'); return; }
  if (!items.length) { toast('חובה להוסיף לפחות פריט אחד', 'e'); return; }

  // Items entering inventory = new items that are NOT return/not_received
  var enteringInventory = items.filter(i => i.is_new_item && i.receipt_status !== 'return' && i.receipt_status !== 'not_received');
  // partial_received items also enter inventory (with reduced qty)

  // Only require sell_price for new items entering inventory
  const newNoPrice = enteringInventory.filter(i => !i.sell_price || i.sell_price <= 0);
  if (newNoPrice.length) {
    toast(`${newNoPrice.length} פריטים חדשים חסרים מחיר מכירה`, 'e');
    return;
  }

  const invalidItems = enteringInventory.filter(i => !i.brand || !i.model);
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  // Image requirement removed — may be restored in future

  // Hard-block: each item entering inventory must have a barcode (one per product line)
  var itemsNeedBc = items.filter(function(i) {
    if (i.receipt_status === 'not_received' || i.receipt_status === 'return') return false;
    if (!i.is_new_item) return false; // existing items already have barcodes
    return !i.barcode;
  });
  if (itemsNeedBc.length) {
    toast(itemsNeedBc.length + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9 \u05D1\u05E8\u05E7\u05D5\u05D3 \u2014 \u05DC\u05D7\u05E5 "\u05D9\u05E6\u05D9\u05E8\u05EA \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD" \u05EA\u05D7\u05D9\u05DC\u05D4', 'e');
    return;
  }

  // Hard-block: file must be attached before confirm
  if (!_pendingReceiptFiles || _pendingReceiptFiles.length === 0) {
    toast('\u05D7\u05D5\u05D1\u05D4 \u05DC\u05E6\u05E8\u05E3 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D0\u05D5 \u05EA\u05E2\u05D5\u05D3\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05DC\u05E4\u05E0\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8', 'e');
    return;
  }

  // Confirmation step: employee must confirm items match the document
  var matchResult = await _showMatchConfirmDialog(rcptNumber);
  if (!matchResult) return; // user closed dialog without choosing

  // PIN verification — required for all confirm paths
  const pinEmp = await _receiptPinVerify('אישור קבלת סחורה');
  if (!pinEmp) return;
  sessionStorage.setItem('prizma_user', pinEmp.name);

  // If mismatch acknowledged, log it
  if (matchResult === 'mismatch') {
    writeLog('receipt_mismatch_acknowledged', null, {
      receipt_number: rcptNumber,
      employee: pinEmp.name,
      note: 'העובד אישר אי-התאמה בין הסחורה למסמך'
    });
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // Phase 8: If linked to PO, show comparison report before confirming
  if (rcptLinkedPoId && typeof _poCompBuildReport === 'function') {
    showLoading('\u05D1\u05D5\u05E0\u05D4 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05D5\u05DC PO...');
    try {
      await saveReceiptDraftInternal();
      var report = await _poCompBuildReport(items, rcptLinkedPoId);
      hideLoading();
      // If everything matches perfectly, skip report
      if (report.priceGap.length === 0 && report.notInPo.length === 0 && report.shortage.length === 0 &&
          report.missing.length === 0 && (!report.returnMarked || report.returnMarked.length === 0)) {
        const ok = await confirmDialog('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4',
          '\u05DB\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u05DC\u05D4\u05D6\u05DE\u05E0\u05D4. \u05DC\u05D0\u05E9\u05E8?');
        if (!ok) return;
        await _confirmReceiptWithDecisions(rcptNumber, null, items);
      } else {
        // Fetch PO number for display
        var { data: poData } = await sb.from(T.PO).select('po_number').eq('id', rcptLinkedPoId).single();
        _poCompShowReport(report, poData ? poData.po_number : '', async function(decisions) {
          await _confirmReceiptWithDecisions(rcptNumber, decisions, items);
        });
      }
    } catch (e) {
      hideLoading(); console.error('PO compare error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4: ' + (e.message || ''), 'e');
    }
    return;
  }

  const ok = await confirmDialog('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4',
    `\u05D4\u05D0\u05DD \u05DC\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4 ${rcptNumber} \u05E2\u05DD ${items.length} \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD (${totalQty} \u05D9\u05D7\u05F3) \u05D5\u05DC\u05E2\u05D3\u05DB\u05DF \u05DE\u05DC\u05D0\u05D9?`);
  if (!ok) return;
  await _confirmReceiptWithDecisions(rcptNumber, null, items);
}

async function _confirmReceiptWithDecisions(rcptNumber, decisions, items) {
  showLoading('\u05DE\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4 \u05D5\u05DE\u05E2\u05D3\u05DB\u05DF \u05DE\u05DC\u05D0\u05D9...');
  try {
    var receiptId = currentReceiptId;
    if (!receiptId) { await saveReceiptDraftInternal(); receiptId = currentReceiptId; }
    if (!receiptId) throw new Error('Receipt ID is missing');
    if (decisions) await _poCompApplyDecisions(receiptId, decisions, items);
    var result = await confirmReceiptCore(receiptId, rcptNumber, rcptLinkedPoId);
    // confirmReceiptCore returns false if rollback happened — receipt stays as draft
    if (result === false) return;
  } catch (e) {
    console.error('confirmReceipt error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05E9\u05D5\u05E8: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

// checkPoPriceDiscrepancies — deleted in Phase 8, replaced by receipt-po-compare.js pre-confirm report

async function confirmReceiptById(receiptId) {
  const ok = await confirmDialog('אישור קבלה', 'האם לאשר קבלה זו ולעדכן מלאי?');
  if (!ok) return;

  const pinEmp = await _receiptPinVerify('אישור קבלה');
  if (!pinEmp) return;
  sessionStorage.setItem('prizma_user', pinEmp.name);

  showLoading('מאשר קבלה...');
  try {
    const { data: rcpt } = await sb.from(T.RECEIPTS).select('receipt_number, po_id').eq('id', receiptId).eq('tenant_id', getTenantId()).single();
    await confirmReceiptCore(receiptId, rcpt?.receipt_number || '', rcpt?.po_id || null);
  } catch (e) {
    console.error('confirmReceiptById error:', e);
    toast('שגיאה באישור: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

// PIN verification helper — shows modal, returns employee or null
async function _receiptPinVerify(title) {
  return new Promise(function(resolve) {
    var modalId = 'rcpt-pin-modal';
    var existing = $(modalId);
    if (existing) existing.remove();
    var html =
      '<div class="modal-overlay" id="' + modalId + '" style="display:flex" ' +
        'onclick="if(event.target===this){this.remove()}">' +
        '<div class="modal" style="max-width:340px">' +
          '<h3 style="margin:0 0 12px">' + escapeHtml(title) + '</h3>' +
          '<div id="rcpt-pin-alert"></div>' +
          '<div class="form-group" style="margin-bottom:12px">' +
            '<label>\u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3</label>' +
            '<input type="password" id="rcpt-pin-input" maxlength="10" ' +
              'placeholder="\u05D4\u05D6\u05DF PIN" inputmode="numeric" class="nd-field">' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-p" id="rcpt-pin-ok">\u05D0\u05E9\u05E8</button>' +
            '<button class="btn btn-g" id="rcpt-pin-cancel">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var inp = $('rcpt-pin-input');
    if (inp) inp.focus();

    async function doVerify() {
      var pin = ($('rcpt-pin-input') || {}).value || '';
      if (!pin) {
        var al = $('rcpt-pin-alert');
        if (al) al.innerHTML = '<div class="alert alert-e">\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05E1\u05DE\u05D4</div>';
        return;
      }
      var emp = await verifyPinOnly(pin);
      if (!emp) {
        var al2 = $('rcpt-pin-alert');
        if (al2) al2.innerHTML = '<div class="alert alert-e">\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D4</div>';
        if (inp) { inp.value = ''; inp.focus(); }
        return;
      }
      var m = $(modalId); if (m) m.remove();
      resolve(emp);
    }

    $('rcpt-pin-ok').onclick = doVerify;
    $('rcpt-pin-cancel').onclick = function() {
      var m = $(modalId); if (m) m.remove();
      resolve(null);
    };
    if (inp) inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doVerify();
    });
  });
}

// =========================================================
// Match confirmation dialog — employee confirms items match document
// Returns: 'match' | 'mismatch' | null (cancelled)
// =========================================================
function _showMatchConfirmDialog(rcptNumber) {
  return new Promise(function(resolve) {
    // Check item statuses from the form
    var items;
    try { items = getReceiptItems(); } catch (e) { items = []; }
    var okCount = items.filter(function(i) { return !i.receipt_status || i.receipt_status === 'ok'; }).length;
    var notRecvCount = items.filter(function(i) { return i.receipt_status === 'not_received'; }).length;
    var returnCount = items.filter(function(i) { return i.receipt_status === 'return'; }).length;
    var hasNonOk = notRecvCount > 0 || returnCount > 0;

    // Build status summary line
    var summaryHtml = '';
    if (hasNonOk) {
      var parts = [];
      if (okCount > 0) parts.push('\u2705 ' + okCount + ' \u05EA\u05E7\u05D9\u05E0\u05D9\u05DD');
      if (notRecvCount > 0) parts.push('\u274C ' + notRecvCount + ' \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2\u05D5');
      if (returnCount > 0) parts.push('\uD83D\uDD04 ' + returnCount + ' \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4');
      summaryHtml = '<div style="background:#fff3e0;padding:8px 12px;border-radius:6px;margin:0 0 12px;font-size:.88rem;font-weight:600">' +
        parts.join(' | ') + '</div>';
    }

    var modalId = 'rcpt-match-modal';
    var existing = $(modalId);
    if (existing) existing.remove();

    // If items have non-ok status, change default button to mismatch
    var matchBtnLabel = hasNonOk
      ? '\u26A0\uFE0F \u05D9\u05E9 \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D4 \u2014 \u05D0\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA'
      : '\u2705 \u05D4\u05DB\u05DC \u05EA\u05D5\u05D0\u05DD \u2014 \u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4';
    var matchBtnStyle = hasNonOk
      ? 'width:100%;background:#f59e0b;color:#fff'
      : 'width:100%';
    var matchBtnClass = hasNonOk ? 'btn' : 'btn btn-p';
    var matchResult = hasNonOk ? 'mismatch' : 'match';

    var html =
      '<div class="modal-overlay" id="' + modalId + '" style="display:flex" ' +
        'onclick="if(event.target===this){this.remove()}">' +
        '<div class="modal" style="max-width:420px;text-align:right">' +
          '<h3 style="margin:0 0 14px">\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4</h3>' +
          summaryHtml +
          '<p style="font-size:.92rem;color:var(--g600,#4b5563);margin:0 0 16px;line-height:1.6">' +
            '\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E9\u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05E0\u05E8\u05E9\u05DE\u05D5 \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA \u05D4\u05DE\u05E6\u05D5\u05E8\u05E3' +
          '</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<button class="' + matchBtnClass + '" id="rcpt-match-ok" style="' + matchBtnStyle + '">' +
              matchBtnLabel + '</button>' +
            (hasNonOk ? '' :
            '<button class="btn" id="rcpt-match-mismatch" style="width:100%;background:#f59e0b;color:#fff">' +
              '\u26A0\uFE0F \u05D9\u05E9 \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D4 \u2014 \u05D0\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA</button>') +
            '<button class="btn btn-g" id="rcpt-match-cancel" style="width:100%">' +
              '\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    $('rcpt-match-ok').onclick = function() {
      var m = $(modalId); if (m) m.remove(); resolve(matchResult);
    };
    var mismatchBtn = $('rcpt-match-mismatch');
    if (mismatchBtn) {
      mismatchBtn.onclick = function() {
        var m = $(modalId); if (m) m.remove(); resolve('mismatch');
      };
    }
    $('rcpt-match-cancel').onclick = function() {
      var m = $(modalId); if (m) m.remove(); resolve(null);
    };
  });
}
