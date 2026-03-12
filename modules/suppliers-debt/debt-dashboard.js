// =========================================================
// debt-dashboard.js — Supplier Debt Dashboard (Phase 4c)
// Load after: shared.js, supabase-ops.js, auth-service.js
// Provides: loadDebtSummary(), formatILS()
// =========================================================

/**
 * Format a number as ILS currency string: ₪1,234
 */
function formatILS(amount) {
  const num = Number(amount) || 0;
  return '\u20AA' + num.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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
