// debt-prepaid-detail.js — Deal detail + check management (split from debt-prepaid.js)
// Load after: debt-prepaid.js (uses _prepaidDeals, _prepaidChecks, _prepaidSuppliers,
//   DEAL_STATUS_MAP, CHECK_STATUS_MAP, loadPrepaidTab)
// Provides: openAddCheckModal(), saveNewCheck(), viewDealDetail(), updateCheckStatus()

// =========================================================
// Add check modal
// =========================================================
function openAddCheckModal(dealId) {
  var deal = _prepaidDeals.find(function(d) { return d.id === dealId; });
  if (!deal) return;
  var modal = document.createElement('div');
  modal.id = 'add-check-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:400px">' +
      '<h3 style="margin:0 0 14px">הוספת צ\u05F3ק לעסקה</h3>' +
      '<p style="font-size:.85rem;color:var(--g600)">' + escapeHtml(deal.deal_name || '') + '</p>' +
      '<div id="check-alert"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<label>מספר צ\u05F3ק<input id="chk-number" class="nd-field"></label>' +
        '<label>סכום<input type="number" id="chk-amount" step="0.01" min="0" class="nd-field"></label>' +
        '<label>תאריך צ\u05F3ק<input type="date" id="chk-date" class="nd-field"></label>' +
        '<label style="grid-column:1/-1">הערות<input id="chk-notes" class="nd-field"></label>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'add-check-modal\')">ביטול</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="saveNewCheck(\'' + dealId + '\')">שמור</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function saveNewCheck(dealId) {
  var checkNum  = (($('chk-number') || {}).value || '').trim();
  var amount    = Number(($('chk-amount') || {}).value) || 0;
  var checkDate = ($('chk-date') || {}).value;
  var notes     = (($('chk-notes') || {}).value || '').trim();

  if (!checkNum)   { setAlert('check-alert', 'יש להזין מספר צ\u05F3ק', 'e'); return; }
  if (amount <= 0) { setAlert('check-alert', 'סכום חייב להיות חיובי', 'e'); return; }
  if (!checkDate)  { setAlert('check-alert', 'יש להזין תאריך', 'e'); return; }

  // Duplicate check number validation
  var existing = await sb.from(T.PREPAID_CHECKS)
    .select('id')
    .eq('prepaid_deal_id', dealId)
    .eq('check_number', checkNum)
    .eq('tenant_id', getTenantId())
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    setAlert('check-alert', 'צ\u05F3ק מספר ' + escapeHtml(checkNum) + ' כבר קיים בעסקה זו', 'e');
    return;
  }

  showLoading('שומר צ\u05F3ק...');
  try {
    await batchCreate(T.PREPAID_CHECKS, [{
      tenant_id: getTenantId(),
      prepaid_deal_id: dealId,
      check_number: checkNum,
      amount: amount,
      check_date: checkDate,
      status: 'pending',
      notes: notes || null
    }]);

    await writeLog('prepaid_check_add', null, {
      reason: 'צ\u05F3ק חדש — ' + checkNum,
      deal_id: dealId,
      amount: amount
    });

    closeAndRemoveModal('add-check-modal');
    toast('צ\u05F3ק נוסף בהצלחה');
    await loadPrepaidTab();
  } catch (e) {
    console.error('saveNewCheck error:', e);
    setAlert('check-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

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

  // Filter checks for this deal
  var checks = _prepaidChecks.filter(function(c) { return c.prepaid_deal_id === dealId; });
  checks.sort(function(a, b) { return (a.check_date || '').localeCompare(b.check_date || ''); });

  var checkRows = checks.length
    ? checks.map(function(c) {
        var cst = CHECK_STATUS_MAP[c.status] || { he: c.status, cls: '' };
        var cashBtn = c.status === 'pending'
          ? ' <button class="btn-sm" onclick="updateCheckStatus(\'' + c.id + '\',\'cashed\')">נפרע</button>'
          : '';
        var bounceBtn = c.status === 'pending'
          ? ' <button class="btn-sm" style="background:#ef4444;color:#fff" onclick="updateCheckStatus(\'' + c.id + '\',\'bounced\')">חזר</button>'
          : '';
        return '<tr>' +
          '<td>' + escapeHtml(c.check_number) + '</td>' +
          '<td>' + formatILS(c.amount) + '</td>' +
          '<td>' + escapeHtml(c.check_date || '') + '</td>' +
          '<td>' + escapeHtml(c.cashed_date || '\u2014') + '</td>' +
          '<td><span class="doc-badge ' + cst.cls + '">' + escapeHtml(cst.he) + '</span></td>' +
          '<td>' + cashBtn + bounceBtn + '</td>' +
        '</tr>';
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--g400)">אין צ\u05F3קים</td></tr>';

  var checksTotal = checks.reduce(function(s, c) { return s + (Number(c.amount) || 0); }, 0);

  var modal = document.createElement('div');
  modal.id = 'deal-detail-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:560px">' +
      '<h3 style="margin:0 0 14px">פרטי עסקה מראש</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.9rem">' +
        '<div><strong>ספק:</strong> ' + escapeHtml(supMap[deal.supplier_id] || '') + '</div>' +
        '<div><strong>שם:</strong> ' + escapeHtml(deal.deal_name || '') + '</div>' +
        '<div><strong>תקופה:</strong> ' + escapeHtml(deal.start_date || '') + ' \u2190 ' + escapeHtml(deal.end_date || '') + '</div>' +
        '<div><strong>סטטוס:</strong> <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></div>' +
      '</div>' +
      '<div style="margin:14px 0">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:.9rem">' +
          '<div><strong>סה"כ מראש</strong><br>' + formatILS(total) + '</div>' +
          '<div><strong>נוצל</strong><br>' + formatILS(used) + '</div>' +
          '<div><strong>יתרה</strong><br><span style="color:' +
            (remainPct <= threshold ? 'var(--error)' : 'inherit') + '">' + formatILS(remaining) + '</span></div>' +
        '</div>' +
        '<div style="background:var(--g200);border-radius:4px;height:22px;position:relative;overflow:hidden;margin-top:8px">' +
          '<div style="background:' + barColor + ';height:100%;width:' + Math.min(pct, 100) + '%;border-radius:4px"></div>' +
          '<span style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:.78rem;line-height:22px;color:var(--g700)">' +
            pct + '% נוצל</span>' +
        '</div>' +
      '</div>' +
      '<h4 style="margin:14px 0 6px;font-size:.9rem">צ\u05F3קים (' + checks.length + ') \u2014 סה"כ: ' + formatILS(checksTotal) + '</h4>' +
      '<div style="overflow-x:auto">' +
      '<table class="data-table" style="width:100%;font-size:.85rem">' +
        '<thead><tr><th>מספר</th><th>סכום</th><th>תאריך</th><th>נפרע</th><th>סטטוס</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + checkRows + '</tbody>' +
      '</table></div>' +
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
  promptPin('\u05E1\u05D9\u05D5\u05DD \u05E2\u05E1\u05E7\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05E1\u05D9\u05D9\u05DD...');
    try {
      await batchUpdate(T.PREPAID_DEALS, [{ id: dealId, status: 'completed' }]);
      await writeLog('prepaid_deal_completed', null, { deal_id: dealId, completed_by: emp.id });
      closeAndRemoveModal('deal-detail-modal');
      toast('\u05E2\u05E1\u05E7\u05D4 \u05E1\u05D5\u05D9\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
      await loadPrepaidTab();
    } catch (e) {
      console.error('_completePrepaidDeal error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}

async function _cancelPrepaidDeal(dealId) {
  var deal = _prepaidDeals.find(function(d) { return d.id === dealId; });
  var usedAmt = deal ? (Number(deal.total_used) || 0) : 0;
  var warnText = '\u05D4\u05D0\u05DD \u05DC\u05D1\u05D8\u05DC \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4?';
  if (usedAmt > 0) warnText += '\n\u05E9\u05D9\u05DD \u05DC\u05D1: \u05DB\u05D1\u05E8 \u05E0\u05D5\u05E6\u05DC\u05D5 ' + formatILS(usedAmt) + ' \u05DE\u05EA\u05D5\u05DA \u05D4\u05E2\u05E1\u05E7\u05D4.';
  var ok = await confirmDialog('\u05D1\u05D9\u05D8\u05D5\u05DC \u05E2\u05E1\u05E7\u05D4', warnText);
  if (!ok) return;
  promptPin('\u05D1\u05D9\u05D8\u05D5\u05DC \u05E2\u05E1\u05E7\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05D1\u05D8\u05DC...');
    try {
      await batchUpdate(T.PREPAID_DEALS, [{ id: dealId, status: 'cancelled' }]);
      await writeLog('prepaid_deal_cancelled', null, { deal_id: dealId, cancelled_by: emp.id, used_amount: usedAmt });
      closeAndRemoveModal('deal-detail-modal');
      toast('\u05E2\u05E1\u05E7\u05D4 \u05D1\u05D5\u05D8\u05DC\u05D4');
      await loadPrepaidTab();
    } catch (e) {
      console.error('_cancelPrepaidDeal error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}

// =========================================================
// Update check status
// =========================================================
async function updateCheckStatus(checkId, newStatus) {
  showLoading('מעדכן...');
  try {
    var updateData = { id: checkId, status: newStatus };
    if (newStatus === 'cashed') updateData.cashed_date = new Date().toISOString().slice(0, 10);
    await batchUpdate(T.PREPAID_CHECKS, [updateData]);
    await writeLog('prepaid_check_update', null, {
      reason: 'עדכון סטטוס צ\u05F3ק — ' + newStatus,
      check_id: checkId
    });
    closeAndRemoveModal('deal-detail-modal');
    toast('סטטוס צ\u05F3ק עודכן');
    await loadPrepaidTab();
  } catch (e) {
    console.error('updateCheckStatus error:', e);
    toast('שגיאה בעדכון סטטוס', 'e');
  } finally {
    hideLoading();
  }
}
