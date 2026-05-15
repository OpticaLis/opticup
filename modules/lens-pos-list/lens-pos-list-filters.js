// lens-pos-list-filters.js — wires filter controls + stat-card click filtering

(function () {
  'use strict';

  function bind() {
    document.querySelectorAll('.stat-card[data-stat-filter]').forEach(function (card) {
      card.addEventListener('click', function () {
        const v = card.getAttribute('data-stat-filter');
        window.LensPOsList.statusFilter = v;
        document.querySelectorAll('.stat-card').forEach(function (c) { c.classList.toggle('active', c === card); });
        window.LensPOsListTable.renderTable();
      });
    });
    const sup = document.getElementById('filter-supplier');
    if (sup) sup.addEventListener('change', function () { window.LensPOsList.supplierFilter = sup.value || ''; window.LensPOsListTable.renderTable(); });
    const inc = document.getElementById('filter-include-cancelled');
    if (inc) inc.addEventListener('change', function () { window.LensPOsList.includeCancelled = inc.value || 'exclude'; window.LensPOsListTable.renderTable(); });
    const sr = document.getElementById('filter-search');
    if (sr) sr.addEventListener('input', function () { window.LensPOsList.searchText = sr.value || ''; window.LensPOsListTable.renderTable(); });
    const clr = document.getElementById('btn-clear-filters');
    if (clr) clr.addEventListener('click', function () {
      window.LensPOsList.statusFilter = 'all';
      window.LensPOsList.supplierFilter = '';
      window.LensPOsList.includeCancelled = 'exclude';
      window.LensPOsList.searchText = '';
      if (sup) sup.value = '';
      if (inc) inc.value = 'exclude';
      if (sr) sr.value = '';
      document.querySelectorAll('.stat-card').forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-stat-filter') === 'all'); });
      window.LensPOsListTable.renderTable();
    });
  }

  window.LensPOsListFilters = { bind };
})();
