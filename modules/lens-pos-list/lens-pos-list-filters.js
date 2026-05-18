// lens-pos-list-filters.js — source-type chip filter row + supplier select + search.
// Stat-card filtering handled by stats.js onCardClick callback.

(function () {
  'use strict';

  function mount() {
    const host = document.getElementById('lens-pos-chip-filters-mount');
    if (!host || !window.ChipFilter) return;
    const pos = window.LensPOsList.pos || [];
    const counts = { all: 0, stock: 0, custom: 0, mixed: 0 };
    pos.forEach(po => {
      if (po.status === 'cancelled') return;
      const src = window.LensPOsList.sourceOf(po);
      counts.all++;
      counts[src] = (counts[src] || 0) + 1;
    });
    window.LensPOsList.chipFilters = ChipFilter.init(host, {
      label: 'סוג:',
      activeIds: ['all'],
      multiSelect: false,
      chips: [
        { id: 'all',    label: 'הכל',     count: counts.all },
        { id: 'stock',  label: '📦 מדף',  count: counts.stock },
        { id: 'custom', label: '🏭 ייצור', count: counts.custom },
        { id: 'mixed',  label: '🔀 מעורב', count: counts.mixed },
      ],
      onSelect: function (activeIds) {
        window.LensPOsList.sourceFilter = (activeIds && activeIds[0]) || 'all';
        window.LensPOsListTable.renderTable();
      },
    });
  }

  function bind() {
    const sup = document.getElementById('filter-supplier');
    if (sup) sup.addEventListener('change', function () {
      window.LensPOsList.supplierFilter = sup.value || '';
      window.LensPOsListTable.renderTable();
    });
    const inc = document.getElementById('filter-include-cancelled');
    if (inc) inc.addEventListener('change', function () {
      window.LensPOsList.includeCancelled = inc.value || 'exclude';
      window.LensPOsListTable.renderTable();
    });
    const sr = document.getElementById('filter-search');
    if (sr) sr.addEventListener('input', function () {
      window.LensPOsList.searchText = sr.value || '';
      window.LensPOsListTable.renderTable();
    });
    const clr = document.getElementById('btn-clear-filters');
    if (clr) clr.addEventListener('click', function () {
      window.LensPOsList.statusFilter = 'all';
      window.LensPOsList.sourceFilter = 'all';
      window.LensPOsList.supplierFilter = '';
      window.LensPOsList.includeCancelled = 'exclude';
      window.LensPOsList.searchText = '';
      if (sup) sup.value = '';
      if (inc) inc.value = 'exclude';
      if (sr) sr.value = '';
      if (window.LensPOsList.statsRow) window.LensPOsList.statsRow.setActive('all');
      if (window.LensPOsList.chipFilters) window.LensPOsList.chipFilters.setActive(['all']);
      window.LensPOsListTable.renderTable();
    });
  }

  function populateSupplierFilter() {
    const sel = document.getElementById('filter-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">🏢 ספק: הכל</option>';
    (window.LensPOsList.suppliers || []).forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = (s.supplier_number ? '#' + s.supplier_number + ' · ' : '') + (s.name || '(ללא)');
      sel.appendChild(opt);
    });
  }

  window.LensPOsListFilters = { mount, bind, populateSupplierFilter };
})();
