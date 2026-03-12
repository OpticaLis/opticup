// =========================================================
// debt-dashboard.js — Supplier Debt Dashboard (Phase 4c+4g)
// Load after: shared.js, supabase-ops.js, auth-service.js
// Provides: loadDebtSummary(), loadSuppliersTab(),
//   renderSuppliersTable()
// Note: formatILS() moved to shared.js (Phase 4d)
// =========================================================

var _supTabData = []; // aggregated supplier rows for the table

/**
 * Load summary card data from supplier_documents + supplier_payments
 */
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
    // Fetch open documents (not paid, not cancelled, not deleted)
    const { data: docs, error: docsErr } = await sb.from(T.SUP_DOCS)
      .select('total_amount, paid_amount, due_date, exchange_rate, document_type_id')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .not('status', 'in', '("paid","cancelled")');

    if (docsErr) { console.error('Debt summary docs error:', docsErr); return; }

    // Calculate totals (convert to ILS via exchange_rate)
    let totalDebt = 0;
    let dueThisWeek = 0;
    let overdue = 0;

    (docs || []).forEach(function(doc) {
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

    // Fetch payments this month
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

    // Update DOM
    document.getElementById('val-total-debt').textContent = formatILS(totalDebt);
    document.getElementById('val-due-week').textContent = formatILS(dueThisWeek);
    document.getElementById('val-overdue').textContent = formatILS(overdue);
    document.getElementById('val-paid-month').textContent = formatILS(paidThisMonth);

    // Overdue highlight
    const overdueCard = document.getElementById('card-overdue');
    if (overdue > 0) {
      overdueCard.classList.add('overdue');
    } else {
      overdueCard.classList.remove('overdue');
    }

  } catch (e) {
    console.error('loadDebtSummary error:', e);
  }
}

// =========================================================
// Suppliers tab — aggregated table (Phase 4g)
// =========================================================
async function loadSuppliersTab() {
  var tid = getTenantId();
  if (!tid) return;
  try {
    var results = await Promise.all([
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]]),
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false]]),
      fetchAll(T.PREPAID_DEALS, [['is_deleted', 'eq', false], ['status', 'eq', 'active']])
    ]);
    var suppliers = results[0];
    var docs = results[1];
    var deals = results[2];
    var todayStr = new Date().toISOString().slice(0, 10);

    // Build per-supplier aggregation
    _supTabData = suppliers.map(function(sup) {
      var supDocs = docs.filter(function(d) {
        return d.supplier_id === sup.id && d.status !== 'paid' && d.status !== 'cancelled';
      });
      var openCount = supDocs.length;
      var totalDebt = 0;
      var overdueAmt = 0;
      var nextDue = null;

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

      // Prepaid deal for this supplier
      var deal = deals.find(function(dl) { return dl.supplier_id === sup.id; });
      var dealRemaining = deal ? (Number(deal.total_prepaid) || 0) - (Number(deal.total_used) || 0) : 0;

      return {
        id: sup.id,
        name: sup.name,
        openCount: openCount,
        totalDebt: totalDebt,
        overdueAmt: overdueAmt,
        nextDue: nextDue,
        hasDeal: !!deal,
        dealRemaining: dealRemaining
      };
    });

    // Sort: overdue first, then by total debt descending
    _supTabData.sort(function(a, b) {
      if (a.overdueAmt > 0 && b.overdueAmt === 0) return -1;
      if (b.overdueAmt > 0 && a.overdueAmt === 0) return 1;
      return b.totalDebt - a.totalDebt;
    });

    // Only show suppliers with open docs or active deals
    var visible = _supTabData.filter(function(s) {
      return s.openCount > 0 || s.hasDeal;
    });

    renderSuppliersTable(visible);
  } catch (e) {
    console.error('loadSuppliersTab error:', e);
  }
}

function renderSuppliersTable(data) {
  var wrap = $('dtab-suppliers');
  if (!wrap) return;
  if (!data.length) {
    wrap.innerHTML = '<div class="empty-state">אין ספקים עם חוב פתוח</div>';
    return;
  }

  var rows = data.map(function(s) {
    var overdueStyle = s.overdueAmt > 0 ? ' style="color:var(--error);font-weight:600"' : '';
    var dealCell = s.hasDeal
      ? '<span style="color:var(--success, #155724)">&#10003;</span> ' + formatILS(s.dealRemaining)
      : '\u2014';
    var nextDueText = s.nextDue || '\u2014';

    return '<tr style="cursor:pointer" onclick="openSupplierDetail(\'' + s.id + '\')">' +
      '<td>' + escapeHtml(s.name) + '</td>' +
      '<td>' + s.openCount + '</td>' +
      '<td>' + formatILS(s.totalDebt) + '</td>' +
      '<td' + overdueStyle + '>' + formatILS(s.overdueAmt) + '</td>' +
      '<td>' + escapeHtml(nextDueText) + '</td>' +
      '<td>' + dealCell + '</td>' +
      '<td>' +
        '<button class="btn-sm" onclick="event.stopPropagation();openSupplierDetail(\'' + s.id + '\')">צפה</button> ' +
        '<button class="btn-sm" onclick="event.stopPropagation();openPaymentForSupplier(\'' + s.id + '\')">תשלום חדש</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr>' +
        '<th>ספק</th><th>מסמכים פתוחים</th><th>חוב כולל</th><th>באיחור</th>' +
        '<th>תשלום הבא</th><th>עסקה מראש</th><th>פעולות</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

/**
 * Open payment wizard pre-filled with a supplier
 */
async function openPaymentForSupplier(supplierId) {
  // Ensure payment methods are loaded (wizard needs _payMethods)
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
  // Skip step 1 (supplier selection) — go directly to step 2
  _wizRenderStep2();
}
