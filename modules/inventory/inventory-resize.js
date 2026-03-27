// inventory-resize.js — Resizable column widths on #inv-table
// Uses CSS resize:horizontal on <th> + sessionStorage persistence.
(function() {
  'use strict';
  var STORAGE_KEY = 'inv-col-widths';

  function applyWidths() {
    var table = document.getElementById('inv-table');
    if (!table) return;
    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      var widths = JSON.parse(saved);
      table.querySelectorAll('thead th').forEach(function(th, i) {
        if (widths[i]) { th.style.width = widths[i] + 'px'; th.style.minWidth = widths[i] + 'px'; }
      });
    } catch (e) { /* parse error */ }
  }

  function saveWidths() {
    var table = document.getElementById('inv-table');
    if (!table) return;
    var widths = {};
    table.querySelectorAll('thead th').forEach(function(th, i) {
      widths[i] = th.offsetWidth;
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }

  function init() {
    var table = document.getElementById('inv-table');
    if (!table) return;
    table.style.tableLayout = 'fixed';
    table.querySelectorAll('thead th').forEach(function(th) {
      th.style.resize = 'horizontal';
      th.style.overflow = 'hidden';
      if (!th.style.minWidth) th.style.minWidth = '40px';
    });
    applyWidths();
    table.addEventListener('mouseup', function() { setTimeout(saveWidths, 100); });
  }

  // Init when table exists — either immediately or via observer
  var _initDone = false;
  function tryInit() {
    if (_initDone) return;
    if (document.getElementById('inv-table')) { _initDone = true; init(); }
  }
  document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 500); });

  // Re-init after table re-render (inv-body content changes)
  var _obs = null;
  function watchTable() {
    var tbody = document.getElementById('inv-body');
    if (!tbody || _obs) return;
    _obs = new MutationObserver(function() { applyWidths(); });
    _obs.observe(tbody, { childList: true });
  }
  document.addEventListener('DOMContentLoaded', function() { setTimeout(watchTable, 600); });

  window.invInitResize = function() { _initDone = false; tryInit(); };
})();
