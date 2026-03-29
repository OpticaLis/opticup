// table-resize.js — Shared resizable columns + sticky scrollbar + per-user persistence
// Auto-discovers tables with id on pages that load this script.
// Usage: TableResize.register('table-id') or auto-init via data-resizable attribute.
var TableResize = (function() {
  'use strict';
  var _initialized = {};

  // --- Per-user localStorage key ---
  function _storageKey(tableId) {
    var emp = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
    var uid = emp ? emp.id : 'default';
    return 'col-w-' + uid + '-' + tableId;
  }

  // --- Register a table by ID ---
  function register(tableId) {
    if (_initialized[tableId]) return;
    _initialized[tableId] = true;
    _initWhenReady(tableId);
  }

  function _initWhenReady(tableId) {
    var table = document.getElementById(tableId);
    if (table && table.querySelector('thead th')) {
      _initTable(table, tableId);
    } else {
      // Table not in DOM yet — retry via observer
      var retries = 0;
      var timer = setInterval(function() {
        retries++;
        var t = document.getElementById(tableId);
        if (t && t.querySelector('thead th')) { clearInterval(timer); _initTable(t, tableId); }
        if (retries > 20) clearInterval(timer);
      }, 500);
    }
  }

  // --- Initialize a single table ---
  function _initTable(table, tableId) {
    if (table.dataset.resizeInit) return;
    table.style.tableLayout = 'fixed';

    // Make each th resizable via CSS resize
    table.querySelectorAll('thead th').forEach(function(th) {
      th.style.resize = 'horizontal';
      th.style.overflow = 'hidden';
      if (!th.style.minWidth) th.style.minWidth = '40px';
    });

    // Restore saved widths
    _restoreWidths(table, tableId);

    // Save on mouseup (after resize drag ends)
    table.addEventListener('mouseup', function() {
      setTimeout(function() { _saveWidths(table, tableId); }, 100);
    });

    // Sticky scrollbar
    _ensureStickyBar(table);

    table.dataset.resizeInit = 'true';
  }

  // --- Save column widths to localStorage ---
  function _saveWidths(table, tableId) {
    var w = [];
    table.querySelectorAll('thead th').forEach(function(th) {
      w.push(th.offsetWidth);
    });
    try { localStorage.setItem(_storageKey(tableId), JSON.stringify(w)); } catch (e) {}
  }

  // --- Restore column widths from localStorage ---
  function _restoreWidths(table, tableId) {
    var saved;
    try { saved = localStorage.getItem(_storageKey(tableId)); } catch (e) { return; }
    if (!saved) return;
    try {
      var w = JSON.parse(saved);
      var ths = table.querySelectorAll('thead th');
      ths.forEach(function(th, i) {
        if (w[i] && w[i] > 30) { th.style.width = w[i] + 'px'; th.style.minWidth = w[i] + 'px'; }
      });
    } catch (e) {}
  }

  // --- Sticky scrollbar: fixed at bottom of viewport, synced with table wrapper ---
  function _ensureStickyBar(table) {
    var wrap = table.parentElement;
    if (!wrap || wrap.dataset.stickyBar) return;
    var cs = getComputedStyle(wrap);
    if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') wrap.style.overflowX = 'auto';
    // Hide wrapper's own scrollbar — sticky bar replaces it
    wrap.style.scrollbarWidth = 'none'; // Firefox
    wrap.classList.add('tbl-no-scroll');

    var bar = document.createElement('div');
    bar.className = 'tbl-sticky-bar';
    var spacer = document.createElement('div');
    spacer.className = 'tbl-sticky-spacer';
    bar.appendChild(spacer);
    document.body.appendChild(bar);

    // Sync scroll positions
    var syncing = false;
    wrap.addEventListener('scroll', function() {
      if (syncing) return; syncing = true; bar.scrollLeft = wrap.scrollLeft; syncing = false;
    });
    bar.addEventListener('scroll', function() {
      if (syncing) return; syncing = true; wrap.scrollLeft = bar.scrollLeft; syncing = false;
    });

    function updateBar() {
      spacer.style.width = table.scrollWidth + 'px';
      var rect = wrap.getBoundingClientRect();
      var needsScroll = table.scrollWidth > wrap.clientWidth;
      var inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!needsScroll || !inView) { bar.style.display = 'none'; return; }
      bar.style.display = '';
      bar.style.left = rect.left + 'px';
      bar.style.width = wrap.clientWidth + 'px';
    }
    updateBar();
    window.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateBar).observe(table);
    wrap.dataset.stickyBar = 'true';
  }

  // --- Auto-discover tables with id on the page ---
  function autoInit() {
    // Find tables that have an id and a thead — these are data tables
    document.querySelectorAll('table[id]').forEach(function(table) {
      if (!table.querySelector('thead th')) return;
      // Skip very small tables (e.g., layout tables)
      var thCount = table.querySelectorAll('thead th').length;
      if (thCount < 3) return;
      register(table.id);
    });
  }

  // Auto-init on page load
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(autoInit, 800);
  });

  // Backward compat
  window.invInitResize = autoInit;

  return { register: register, autoInit: autoInit };
})();
