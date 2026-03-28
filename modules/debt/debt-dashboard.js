// debt-dashboard.js — Supplier Debt Dashboard (Phase 4c+4g)

var _supTabData = [];

async function loadDebtSummary() {
  const tid = getTenantId();
  if (!tid) return;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 7 days from now
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);
  const weekStr = weekLater.toISOString().slice(0, 10);

  // First day of current month
  const monthStart = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-01';

  try {
    // Fetch open documents + suppliers (for opening balance)
    const [docsResult, supResult] = await Promise.all([
      sb.from(T.SUP_DOCS).select('total_amount, paid_amount, due_date, exchange_rate, document_type_id, supplier_id, document_date')
        .eq('tenant_id', tid).eq('is_deleted', false).not('status', 'in', '("paid","cancelled")'),
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]])
    ]);
    const docs = docsResult.data; const docsErr = docsResult.error;
    if (docsErr) { console.error('Debt summary docs error:', docsErr); return; }
    var obMap = {}; (supResult || []).forEach(function(s) { obMap[s.id] = s; });
    let totalDebt = (supResult || []).reduce(function(s, sup) { return s + (Number(sup.opening_balance) || 0); }, 0);
    let dueThisWeek = 0;
    let overdue = 0;

    (docs || []).forEach(function(doc) {
      // Phase 8: skip docs before supplier's cutoff date
      var sup = obMap[doc.supplier_id];
      if (sup && sup.opening_balance_date && doc.document_date && doc.document_date < sup.opening_balance_date) return;
      const rate = Number(doc.exchange_rate) || 1;
      const remaining = (Number(doc.total_amount) - Number(doc.paid_amount)) * rate;
      if (remaining <= 0) return;

      totalDebt += remaining;

      if (doc.due_date) {
        if (doc.due_date < todayStr) {
          overdue += remaining;
        } else if (doc.due_date <= weekStr) {
          dueThisWeek += remaining;
        }
      }
    });

    const { data: payments, error: payErr } = await sb.from(T.SUP_PAYMENTS)
      .select('amount, exchange_rate')
      .eq('tenant_id', tid)
      .gte('payment_date', monthStart)
      .lte('payment_date', todayStr);

    if (payErr) { console.error('Debt summary payments error:', payErr); }
    let paidThisMonth = 0;
    (payments || []).forEach(function(p) {
      const rate = Number(p.exchange_rate) || 1;
      paidThisMonth += Number(p.amount) * rate;
    });
    document.getElementById('val-total-debt').textContent = formatILS(totalDebt);
    document.getElementById('val-due-week').textContent = formatILS(dueThisWeek);
    document.getElementById('val-overdue').textContent = formatILS(overdue);
    document.getElementById('val-paid-month').textContent = formatILS(paidThisMonth);
    const overdueCard = document.getElementById('card-overdue');
    if (overdue > 0) {
      overdueCard.classList.add('overdue');
    } else {
      overdueCard.classList.remove('overdue');
    }
    loadAgingReport(docs || []);
    _loadPendingInvoiceBanner();

  } catch (e) {
    console.error('loadDebtSummary error:', e);
  }
}

async function _loadPendingInvoiceBanner() {
  try {
    var { count, error } = await sb.from(T.SUP_DOCS)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', getTenantId())
      .eq('status', 'pending_invoice')
      .eq('is_deleted', false);
    if (error) count = 0;
    var el = document.getElementById('pending-invoice-banner');
    if (!el) {
      // Create banner element before debt-cards
      var cards = document.querySelector('.debt-cards');
      if (!cards) return;
      el = document.createElement('div');
      el.id = 'pending-invoice-banner';
      cards.parentNode.insertBefore(el, cards);
    }
    if (count > 0) {
      el.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer';
      el.innerHTML =
        '<span style="font-size:.92rem;color:#92400e">\uD83D\uDCE8 ' + count + ' \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC</span>' +
        '<button class="btn-sm" style="background:#f59e0b;color:#fff" onclick="switchDebtTab(\'documents\')">\u05E6\u05E4\u05D4</button>';
    } else {
      el.style.display = 'none';
    }
  } catch (e) {
    console.warn('_loadPendingInvoiceBanner error:', e);
  }
}

// Aging report — break down open debt by due_date buckets
function loadAgingReport(docs) {
  var el = document.getElementById('aging-buckets');
  if (!el) return;
  var todayStr = new Date().toISOString().slice(0, 10);
  var today = new Date(todayStr);
  var buckets = [
    { label: 'שוטף', color: '#2e7d32', amount: 0 },
    { label: '1-30 יום', color: '#1a5fb4', amount: 0 },
    { label: '31-60 יום', color: '#f9a825', amount: 0 },
    { label: '61-90 יום', color: '#e07655', amount: 0 },
    { label: '90+ יום', color: '#c62828', amount: 0 }
  ];

  (docs || []).forEach(function(doc) {
    var rate = Number(doc.exchange_rate) || 1;
    var remaining = (Number(doc.total_amount) - Number(doc.paid_amount)) * rate;
    if (remaining <= 0) return;
    if (!doc.due_date || doc.due_date >= todayStr) {
      buckets[0].amount += remaining;
    } else {
      var daysPast = Math.floor((today - new Date(doc.due_date)) / 86400000);
      if (daysPast <= 30) buckets[1].amount += remaining;
      else if (daysPast <= 60) buckets[2].amount += remaining;
      else if (daysPast <= 90) buckets[3].amount += remaining;
      else buckets[4].amount += remaining;
    }
  });
  var totalDebt = buckets.reduce(function(s, b) { return s + b.amount; }, 0);
  el.innerHTML = buckets.map(function(b) {
    var pct = totalDebt > 0 ? Math.round(b.amount / totalDebt * 100) : 0;
    return '<div class="aging-bucket">' +
      '<div class="ab-label">' + b.label + '</div>' +
      '<div class="ab-amount" style="color:' + b.color + '">' + formatILS(b.amount) + '</div>' +
      '<div class="ab-bar"><div class="ab-bar-fill" style="width:' + pct + '%;background:' + b.color + '"></div></div>' +
    '</div>';
  }).join('');
}

// --- Suppliers tab ---
async function loadSuppliersTab() {
  var tid = getTenantId();
  if (!tid) return;
  try {
    var results = await Promise.all([
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]]),
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false]]),
      fetchAll(T.PREPAID_DEALS, [['is_deleted', 'eq', false], ['status', 'eq', 'active']]),
      fetchAll(T.SUP_PAYMENTS, [['is_deleted', 'eq', false]])
    ]);
    var suppliers = results[0];
    var docs = results[1];
    var deals = results[2];
    var payments = results[3];
    var todayStr = new Date().toISOString().slice(0, 10);

    // Build per-supplier payment flag
    var payBySup = {};
    (payments || []).forEach(function(p) { payBySup[p.supplier_id] = true; });

    _supTabData = suppliers.map(function(sup) {
      var cutoff = sup.opening_balance_date || null;
      var allSupDocs = docs.filter(function(d) { return d.supplier_id === sup.id; });
      var supDocs = allSupDocs.filter(function(d) {
        if (d.status === 'paid' || d.status === 'cancelled') return false;
        if (cutoff && d.document_date && d.document_date < cutoff) return false;
        return true;
      });
      var openCount = supDocs.length;
      var totalDebt = Number(sup.opening_balance) || 0;
      var overdueAmt = 0, nextDue = null;
      supDocs.forEach(function(d) {
        var rate = Number(d.exchange_rate) || 1;
        var remaining = (Number(d.total_amount) - Number(d.paid_amount)) * rate;
        if (remaining <= 0) return;
        totalDebt += remaining;
        if (d.due_date && d.due_date < todayStr) overdueAmt += remaining;
        if (d.due_date && d.due_date >= todayStr) {
          if (!nextDue || d.due_date < nextDue) nextDue = d.due_date;
        }
      });
      var deal = deals.find(function(dl) { return dl.supplier_id === sup.id; });
      var dealTotal = deal ? (Number(deal.total_prepaid) || 0) : 0;
      var dealUsed = deal ? (Number(deal.total_used) || 0) : 0;
      var dealRemaining = dealTotal - dealUsed;
      var hasReceiptDocs = allSupDocs.some(function(d) { return !!d.goods_receipt_id; });
      var hasHistory = allSupDocs.length > 0 || !!payBySup[sup.id] || !!deal;
      return {
        id: sup.id, name: sup.name, openCount: openCount, totalDebt: totalDebt,
        overdueAmt: overdueAmt, nextDue: nextDue, hasDeal: !!deal,
        dealTotal: dealTotal, dealUsed: dealUsed, dealRemaining: dealRemaining,
        openingBalance: Number(sup.opening_balance) || 0, openingBalanceDate: cutoff,
        hasReceiptDocs: hasReceiptDocs, hasHistory: hasHistory
      };
    });

    _supTabData.sort(function(a, b) {
      if (a.overdueAmt > 0 && b.overdueAmt === 0) return -1;
      if (b.overdueAmt > 0 && a.overdueAmt === 0) return 1;
      return b.totalDebt - a.totalDebt;
    });

    renderSuppliersToolbar();
    applySupplierFilters();
  } catch (e) {
    console.error('loadSuppliersTab error:', e);
  }
}

function renderSuppliersToolbar() {
  var wrap = $('dtab-suppliers');
  if (!wrap) return;
  var initEmpty = wrap.querySelector(':scope > .empty-state');
  if (initEmpty) initEmpty.remove();
  var existing = wrap.querySelector('.sup-toolbar');
  if (existing) existing.remove();
  var toolbar = document.createElement('div');
  toolbar.className = 'sup-toolbar doc-toolbar';
  toolbar.style.cssText = 'flex-direction:column;align-items:stretch;gap:8px';
  toolbar.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">' +
      '<div id="sup-filter-chips"></div>' +
      '<button class="btn sup-ob-btn" style="background:#059669;color:#fff;white-space:nowrap" onclick="openQuickOpeningBalance()">\u05D4\u05D2\u05D3\u05E8 \u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4</button>' +
    '</div>' +
    '<div id="sup-filter-count" style="font-size:.82rem;color:var(--g500)"></div>';
  wrap.prepend(toolbar);
  if (typeof renderSupplierFilterChips === 'function') renderSupplierFilterChips();
}

function openQuickOpeningBalance() {
  var modal = document.createElement('div');
  modal.id = 'quick-ob-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:400px">' +
      '<h3 style="margin:0 0 14px">\u05D4\u05D2\u05D3\u05E8\u05EA \u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4</h3>' +
      '<label>\u05E1\u05E4\u05E7<div id="quick-ob-supplier-wrap"></div></label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'quick-ob-modal\')">ביטול</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="quick-ob-go" disabled>המשך</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  var supNames = _supTabData.map(function(s) { return s.name; });
  var selectedId = null;
  var selectEl = createSearchSelect(supNames, '', function(name) {
    var sup = _supTabData.find(function(s) { return s.name === name; });
    selectedId = sup ? sup.id : null;
    var btn = $('quick-ob-go');
    if (btn) btn.disabled = !selectedId;
  });
  var wrapDiv = $('quick-ob-supplier-wrap');
  if (wrapDiv) wrapDiv.appendChild(selectEl);
  var goBtn = $('quick-ob-go');
  if (goBtn) goBtn.onclick = function() {
    if (!selectedId) return;
    closeAndRemoveModal('quick-ob-modal');
    openSetOpeningBalance(selectedId);
  };
}

function renderSuppliersTable(data) {
  var wrap = $('dtab-suppliers');
  if (!wrap) return;
  var toolbar = wrap.querySelector('.sup-toolbar');
  var tableWrap = wrap.querySelector('.sup-table-wrap');
  if (!tableWrap) {
    tableWrap = document.createElement('div');
    tableWrap.className = 'sup-table-wrap';
    wrap.appendChild(tableWrap);
  }
  if (!data.length) {
    tableWrap.innerHTML = '<div class="empty-state">\u05D0\u05D9\u05DF \u05E1\u05E4\u05E7\u05D9\u05DD \u05DC\u05D4\u05E6\u05D2\u05D4</div>';
    return;
  }

  var rows = data.map(function(s) {
    var overdueStyle = s.overdueAmt > 0 ? ' style="color:var(--error);font-weight:600"' : '';
    var dealCell = '\u2014';
    if (s.hasDeal) {
      var totalFmt = s.dealTotal.toLocaleString('he-IL');
      var usedFmt = s.dealUsed.toLocaleString('he-IL');
      dealCell = '<span style="color:#059669;font-weight:600">' + totalFmt + '</span>' +
        '<span style="color:var(--g400)"> / </span>' +
        '<span style="color:#dc2626;font-weight:600">' + usedFmt + '</span>';
    }
    var obCell = s.openingBalance > 0
      ? formatILS(s.openingBalance) + (s.openingBalanceDate ? '' : ' <span title="\u05D7\u05E1\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA cutoff" style="color:#f59e0b">\u26A0\uFE0F</span>')
      : '\u2014';
    return '<tr style="cursor:pointer" onclick="openSupplierDetail(\'' + s.id + '\')">' +
      '<td>' + escapeHtml(s.name) + '</td>' +
      '<td>' + s.openCount + '</td>' +
      '<td>' + formatILS(s.totalDebt) + '</td>' +
      '<td' + overdueStyle + '>' + formatILS(s.overdueAmt) + '</td>' +
      '<td>' + escapeHtml(s.nextDue || '\u2014') + '</td>' +
      '<td>' + obCell + '</td>' +
      '<td>' + dealCell + '</td>' +
      '<td>' +
        '<button class="btn-sm" onclick="event.stopPropagation();openSupplierDetail(\'' + s.id + '\')">צפה</button> ' +
        '<button class="btn-sm" onclick="event.stopPropagation();openPaymentForSupplier(\'' + s.id + '\')">תשלום חדש</button>' +
      '</td></tr>';
  }).join('');
  tableWrap.innerHTML =
    '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr><th>\u05E1\u05E4\u05E7</th><th>\u05E4\u05EA\u05D5\u05D7\u05D9\u05DD</th><th>\u05D7\u05D5\u05D1 \u05DB\u05D5\u05DC\u05DC</th><th>\u05D1\u05D0\u05D9\u05D7\u05D5\u05E8</th>' +
        '<th>\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05D1\u05D0</th><th>\u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4</th><th>\u05E2\u05E1\u05E7\u05D4</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function openPaymentForSupplier(supplierId) {
  if (!_payMethods || !_payMethods.length) {
    _payMethods = await fetchAll(T.PAY_METHODS, [['is_active', 'eq', true]]);
  }
  _wizResetState();
  _wizState.supplierId = supplierId;
  var sup = _supTabData.find(function(s) { return s.id === supplierId; });
  if (sup) _wizState.supplierName = sup.name;
  var modal = document.createElement('div');
  modal.id = 'pay-wizard-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal" style="max-width:560px">' +
    '<div id="pay-wiz-content"></div></div>';
  document.body.appendChild(modal);
  _wizRenderStep2();
}
