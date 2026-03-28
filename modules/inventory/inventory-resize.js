// inventory-resize.js — Resizable column widths for all data tables
// Uses CSS resize:horizontal on <th> + sessionStorage persistence.
(function() {
  'use strict';
  var TABLES = [
    { id: 'inv-table', key: 'inv-col-widths' },
    { id: 'rcpt-items-table', key: 'rcpt-col-widths' },
    { id: 'po-items-table', key: 'po-col-widths' },
    { id: 'po-view-table', key: 'poview-col-widths' },
    { id: 'sc-items-table', key: 'sc-col-widths' }
  ];

  function applyWidths(table, key) {
    var saved = sessionStorage.getItem(key);
    if (!saved) return;
    try {
      var w = JSON.parse(saved);
      table.querySelectorAll('thead th').forEach(function(th, i) {
        if (w[i]) { th.style.width = w[i] + 'px'; th.style.minWidth = w[i] + 'px'; }
      });
    } catch (e) {}
  }

  function saveWidths(table, key) {
    var w = {};
    table.querySelectorAll('thead th').forEach(function(th, i) { w[i] = th.offsetWidth; });
    sessionStorage.setItem(key, JSON.stringify(w));
  }

  function initTable(id, key) {
    var table = document.getElementById(id);
    if (!table || table.dataset.resizeInit) return;
    table.style.tableLayout = 'fixed';
    table.querySelectorAll('thead th').forEach(function(th) {
      th.style.resize = 'horizontal';
      th.style.overflow = 'hidden';
      if (!th.style.minWidth) th.style.minWidth = '40px';
    });
    applyWidths(table, key);
    table.addEventListener('mouseup', function() { setTimeout(function() { saveWidths(table, key); }, 100); });
    table.dataset.resizeInit = 'true';
  }

  function initAll() {
    TABLES.forEach(function(t) { initTable(t.id, t.key); });
  }

  // Re-init when tables are dynamically rendered
  var obs = new MutationObserver(function() { initAll(); });
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAll, 500);
    obs.observe(document.body, { childList: true, subtree: true });
  });

  window.invInitResize = initAll;
})();
