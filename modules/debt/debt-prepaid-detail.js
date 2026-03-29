// debt-prepaid-detail.js — Deal detail view (simplified — checks removed)
// Load after: debt-prepaid.js (uses _prepaidDeals, _prepaidSuppliers, DEAL_STATUS_MAP, loadPrepaidTab)
// Provides: viewDealDetail()

// =========================================================
// Deal detail modal
// =========================================================
function viewDealDetail(dealId) {
  var deal = _prepaidDeals.find(function(d) { return d.id === dealId; });
  if (!deal) return;
  var supMap = {};
  _prepaidSuppliers.forEach(function(s) { supMap[s.id] = s.name; });

  var total = Number(deal.total_prepaid) || 0;
  var used = Number(deal.total_used) || 0;
  var remaining = total - used;
  var pct = total > 0 ? Math.round((used / total) * 100) : 0;
  var threshold = Number(deal.alert_threshold_pct) || 20;
  var remainPct = total > 0 ? ((remaining / total) * 100) : 100;
  var barColor = remainPct <= threshold ? 'var(--error)' : '#1a73e8';
  var st = DEAL_STATUS_MAP[deal.status] || { he: deal.status, cls: '' };

  var modal = document.createElement('div');
  modal.id = 'deal-detail-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:500px">' +
      '<h3 style="margin:0 0 14px">\u05E4\u05E8\u05D8\u05D9 \u05E2\u05E1\u05E7\u05D4</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.9rem">' +
        '<div><strong>\u05E1\u05E4\u05E7:</strong> ' + escapeHtml(supMap[deal.supplier_id] || '') + '</div>' +
        '<div><strong>\u05E9\u05DD:</strong> ' + escapeHtml(deal.deal_name || '') + '</div>' +
        '<div><strong>\u05EA\u05E7\u05D5\u05E4\u05D4:</strong> ' + escapeHtml(deal.start_date || '') + ' \u2190 ' + escapeHtml(deal.end_date || '') + '</div>' +
        '<div><strong>\u05E1\u05D8\u05D8\u05D5\u05E1:</strong> <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></div>' +
      '</div>' +
      '<div style="margin:14px 0">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:.9rem">' +
          '<div><strong>\u05E1\u05D4"\u05DB \u05DE\u05E8\u05D0\u05E9</strong><br>' + formatILS(total) + '</div>' +
          '<div><strong>\u05E0\u05D5\u05E6\u05DC</strong><br>' + formatILS(used) + '</div>' +
          '<div><strong>\u05D9\u05EA\u05E8\u05D4</strong><br><span style="color:' +
            (remainPct <= threshold ? 'var(--error)' : 'inherit') + '">' + formatILS(remaining) + '</span></div>' +
        '</div>' +
        '<div style="background:var(--g200);border-radius:4px;height:22px;position:relative;overflow:hidden;margin-top:8px">' +
          '<div style="background:' + barColor + ';height:100%;width:' + Math.min(pct, 100) + '%;border-radius:4px"></div>' +
          '<span style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:.78rem;line-height:22px;color:var(--g700)">' +
            pct + '% \u05E0\u05D5\u05E6\u05DC</span>' +
        '</div>' +
      '</div>' +
      (deal.notes ? '<div style="font-size:.85rem;color:var(--g600);margin-bottom:10px">\u05D4\u05E2\u05E8\u05D5\u05EA: ' + escapeHtml(deal.notes) + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        (deal.status === 'active'
          ? '<button class="btn" style="background:#059669;color:#fff" onclick="_completePrepaidDeal(\'' + dealId + '\')">\u05E1\u05D9\u05D9\u05DD \u05E2\u05E1\u05E7\u05D4</button>' +
            '<button class="btn" style="background:#ef4444;color:#fff" onclick="_cancelPrepaidDeal(\'' + dealId + '\')">\u05D1\u05D8\u05DC \u05E2\u05E1\u05E7\u05D4</button>'
          : '') +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'deal-detail-modal\')">\u05E1\u05D2\u05D5\u05E8</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

// =========================================================
// Complete / Cancel prepaid deal
// =========================================================
async function _completePrepaidDeal(dealId) {
  var ok = await confirmDialog('\u05E1\u05D9\u05D5\u05DD \u05E2\u05E1\u05E7\u05D4', '\u05D4\u05D0\u05DD \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4? \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05D9\u05D4\u05D9\u05D4 \u05DC\u05D1\u05E6\u05E2 \u05E7\u05D9\u05D6\u05D5\u05D6\u05D9\u05DD \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD.');
  if (!ok) return;
  promptPin('\u05E1\u05D9\u05D5\u05DD \u05E2\u05E1\u05E7\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', function(pin) {
    verifyPinOnly(pin).then(function(valid) {
      if (!valid) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
      _doCompleteDeal(dealId);
    });
  });
}

async function _doCompleteDeal(dealId) {
  showLoading('\u05DE\u05E1\u05D9\u05D9\u05DD...');
  try {
    await batchUpdate(T.PREPAID_DEALS, [{ id: dealId, status: 'completed' }]);
    await writeLog('prepaid_deal_completed', null, { deal_id: dealId });
    closeAndRemoveModal('deal-detail-modal');
    toast('\u05E2\u05E1\u05E7\u05D4 \u05E1\u05D5\u05D9\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadPrepaidTab();
  } catch (e) {
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  } finally { hideLoading(); }
}

async function _cancelPrepaidDeal(dealId) {
  var deal = _prepaidDeals.find(function(d) { return d.id === dealId; });
  var usedAmt = deal ? (Number(deal.total_used) || 0) : 0;
  var warnText = '\u05D4\u05D0\u05DD \u05DC\u05D1\u05D8\u05DC \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4?';
  if (usedAmt > 0) warnText += '\n\u05E9\u05D9\u05DD \u05DC\u05D1: \u05DB\u05D1\u05E8 \u05E0\u05D5\u05E6\u05DC\u05D5 ' + formatILS(usedAmt) + ' \u05DE\u05EA\u05D5\u05DA \u05D4\u05E2\u05E1\u05E7\u05D4.';
  var ok = await confirmDialog('\u05D1\u05D9\u05D8\u05D5\u05DC \u05E2\u05E1\u05E7\u05D4', warnText);
  if (!ok) return;
  promptPin('\u05D1\u05D9\u05D8\u05D5\u05DC \u05E2\u05E1\u05E7\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', function(pin) {
    verifyPinOnly(pin).then(function(valid) {
      if (!valid) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
      _doCancelDeal(dealId, usedAmt);
    });
  });
}

async function _doCancelDeal(dealId, usedAmt) {
  showLoading('\u05DE\u05D1\u05D8\u05DC...');
  try {
    await batchUpdate(T.PREPAID_DEALS, [{ id: dealId, status: 'cancelled' }]);
    await writeLog('prepaid_deal_cancelled', null, { deal_id: dealId, used_amount: usedAmt });
    closeAndRemoveModal('deal-detail-modal');
    toast('\u05E2\u05E1\u05E7\u05D4 \u05D1\u05D5\u05D8\u05DC\u05D4');
    await loadPrepaidTab();
  } catch (e) {
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  } finally { hideLoading(); }
}
