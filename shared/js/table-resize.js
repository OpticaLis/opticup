// table-resize.js — Shared resizable columns + sticky horizontal scrollbar
// Usage: TableResize.register('table-id') or TableResize.register('table-id', 'storage-key')
var TableResize = (function() {
  'use strict';
  var _tables = [];

  function register(tableId, storageKey) {
    if (_tables.find(function(t) { return t.id === tableId; })) return;
    var key = storageKey || tableId + '-col-widths';
    _tables.push({ id: tableId, key: key });
    _initTable(tableId, key);
  }

  function _initTable(id, key) {
    var table = document.getElementById(id);
    if (!table || table.dataset.resizeInit) return;
    table.style.tableLayout = 'fixed';
    table.querySelectorAll('thead th').forEach(function(th) {
      th.style.resize = 'horizontal';
      th.style.overflow = 'hidden';
      if (!th.style.minWidth) th.style.minWidth = '40px';
    });
    _applyWidths(table, key);
    table.addEventListener('mouseup', function() { setTimeout(function() { _saveWidths(table, key); }, 100); });
    _ensureStickyBar(table);
    table.dataset.resizeInit = 'true';
  }

  function _applyWidths(table, key) {
    var saved = sessionStorage.getItem(key);
    if (!saved) return;
    try {
      var w = JSON.parse(saved);
      table.querySelectorAll('thead th').forEach(function(th, i) {
        if (w[i]) { th.style.width = w[i] + 'px'; th.style.minWidth = w[i] + 'px'; }
      });
    } catch (e) {}
  }

  function _saveWidths(table, key) {
    var w = {};
    table.querySelectorAll('thead th').forEach(function(th, i) { w[i] = th.offsetWidth; });
    sessionStorage.setItem(key, JSON.stringify(w));
  }

  // Sticky scrollbar: fixed div at bottom of viewport, synced with table wrapper
  function _ensureStickyBar(table) {
    var wrap = table.parentElement;
    if (!wrap || wrap.dataset.stickyBar) return;
    var cs = getComputedStyle(wrap);
    if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') wrap.style.overflowX = 'auto';
    // Hide wrapper's own scrollbar — sticky bar replaces it
    wrap.style.scrollbarWidth = 'none'; // Firefox
    wrap.classList.add('tbl-no-scroll');
    // Create fixed bar
    var bar = document.createElement('div');
    bar.className = 'tbl-sticky-bar';
    var spacer = document.createElement('div');
    spacer.className = 'tbl-sticky-spacer';
    bar.appendChild(spacer);
    document.body.appendChild(bar);
    // Sync scroll
    var syncing = false;
    wrap.addEventListener('scroll', function() {
      if (syncing) return; syncing = true; bar.scrollLeft = wrap.scrollLeft; syncing = false;
    });
    bar.addEventListener('scroll', function() {
      if (syncing) return; syncing = true; wrap.scrollLeft = bar.scrollLeft; syncing = false;
    });
    // Update bar position and size
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

  function initAll() {
    _tables.forEach(function(t) { _initTable(t.id, t.key); });
  }

  // Auto re-init on DOM changes (dynamic tables)
  var obs = new MutationObserver(function() { initAll(); });
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAll, 500);
    obs.observe(document.body, { childList: true, subtree: true });
  });

  // Backward compat
  window.invInitResize = initAll;

  return { register: register, initAll: initAll };
})();
