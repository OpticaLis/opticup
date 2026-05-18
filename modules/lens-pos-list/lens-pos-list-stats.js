// lens-pos-list-stats.js — 5 stat-cards via StatCardRow. Overdue is DERIVED
// (status='sent' AND expected_delivery_at < CURRENT_DATE), NOT a status enum.
// Values derive from the SAME loaded `pos` array so counts never drift from table.

(function () {
  'use strict';

  function fmtMoney(n) {
    return '₪' + Math.round(n).toLocaleString('he-IL');
  }

  function computeCounts() {
    const pos = window.LensPOsList.pos || [];
    const counts = { all: 0, draft: 0, sent: 0, partial: 0, overdue: 0 };
    const totals = { all: 0, draft: 0, sent: 0, partial: 0, overdue: 0 };
    pos.forEach(po => {
      if (po.status === 'cancelled') return;
      const t = po._total || 0;
      counts.all++;
      totals.all += t;
      if (po.status === 'draft')   { counts.draft++;   totals.draft += t; }
      if (po.status === 'sent')    { counts.sent++;    totals.sent  += t; }
      if (po.status === 'partial') { counts.partial++; totals.partial += t; }
      if (window.LensPOsList.isOverdue(po)) { counts.overdue++; totals.overdue += t; }
    });
    return { counts, totals };
  }

  function mount() {
    const host = document.getElementById('lens-pos-stats-mount');
    if (!host || !window.StatCardRow) return;
    const { counts, totals } = computeCounts();
    window.LensPOsList.statsRow = StatCardRow.init(host, {
      columns: 5,
      activeId: 'all',
      cards: [
        { id: 'all',     label: 'הכל',                 value: counts.all,     sub: fmtMoney(totals.all) + ' בסה"כ' },
        { id: 'draft',   label: 'טיוטות',              value: counts.draft,   sub: 'טרם נשלחו לספק',  variant: 'draft' },
        { id: 'sent',    label: 'נשלחו לספק',          value: counts.sent,    sub: 'בהמתנה לסחורה',   variant: 'sent' },
        { id: 'partial', label: 'חלקיות',              value: counts.partial, sub: 'חלק התקבל',        variant: 'partial' },
        { id: 'overdue', label: '⚠️ באיחור',          value: counts.overdue, sub: 'חלף יעד אספקה',   variant: 'overdue' },
      ],
      onCardClick: function (id) {
        window.LensPOsList.statusFilter = id;
        window.LensPOsListTable.renderTable();
      },
    });
    const badge = document.getElementById('pos-count-badge');
    if (badge) badge.textContent = counts.all + ' הזמנות פעילות';
  }

  function render() {
    if (!window.LensPOsList.statsRow) { mount(); return; }
    const { counts, totals } = computeCounts();
    window.LensPOsList.statsRow.updateCard('all',     { value: counts.all,     sub: fmtMoney(totals.all) + ' בסה"כ' });
    window.LensPOsList.statsRow.updateCard('draft',   { value: counts.draft });
    window.LensPOsList.statsRow.updateCard('sent',    { value: counts.sent });
    window.LensPOsList.statsRow.updateCard('partial', { value: counts.partial });
    window.LensPOsList.statsRow.updateCard('overdue', { value: counts.overdue });
    const badge = document.getElementById('pos-count-badge');
    if (badge) badge.textContent = counts.all + ' הזמנות פעילות';
  }

  window.LensPOsListStats = { mount, render, computeCounts };
})();
