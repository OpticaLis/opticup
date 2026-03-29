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

  // --- Auto-ID counter for tables without id ---
  var _autoId = 0;

  // --- Check if a table should be initialized ---
  function _shouldInit(table) {
    if (!table || !table.querySelector('thead th')) return false;
    if (table.dataset.resizeInit) return false;
    // Skip tiny tables (layout, config)
    if (table.querySelectorAll('thead th').length < 3) return false;
    // Skip tables inside modal overlays (transient — rebuilt each time)
    if (table.closest('.modal-overlay, .ocr-modal-box, [id*="review-modal"]')) return false;
    return true;
  }

  // --- Ensure table has an id, then init ---
  function _autoInitTable(table) {
    if (!_shouldInit(table)) return;
    if (!table.id) {
      var parent = table.closest('[id]');
      table.id = parent ? parent.id + '-table' : 'auto-tbl-' + (++_autoId);
    }
    if (!_initialized[table.id]) {
      _initialized[table.id] = true;
      _initTable(table, table.id);
    }
  }

  // --- Scan page for all data tables ---
  function autoInit() {
    document.querySelectorAll('table').forEach(_autoInitTable);
  }

  // --- MutationObserver: watch for dynamically added tables ---
  var _obsTimer = null;
  var _obs = new MutationObserver(function() {
    // Debounce: many mutations fire in rapid succession during innerHTML renders.
    // A short delay lets the full table DOM settle before we scan.
    if (_obsTimer) return;
    _obsTimer = setTimeout(function() {
      _obsTimer = null;
      document.querySelectorAll('table').forEach(_autoInitTable);
    }, 300);
  });

  // Auto-init on page load + start observer
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(autoInit, 800);
    _obs.observe(document.body, { childList: true, subtree: true });
  });

  // Backward compat
  window.invInitResize = autoInit;

  return { register: register, autoInit: autoInit };
})();
