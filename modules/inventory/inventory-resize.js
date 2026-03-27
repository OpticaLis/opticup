// inventory-resize.js — Drag-to-resize column widths on #inv-table
// Saves to sessionStorage. Double-click handle to reset column.
(function() {
  var STORAGE_KEY = 'inv-col-widths';
  var _resizing = null;

  function initResizeHandles() {
    var table = document.getElementById('inv-table');
    if (!table) return;
    var ths = table.querySelectorAll('thead th');
    ths.forEach(function(th, i) {
      if (th.querySelector('.col-resize-handle')) return; // already has handle
      var handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      th.style.position = 'relative';
      th.appendChild(handle);
      handle.addEventListener('mousedown', function(e) { _startResize(e, th, i); });
      handle.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        th.style.width = '';
        _saveWidths(table);
      });
    });
    _restoreWidths(table);
  }

  function _startResize(e, th, colIdx) {
    e.preventDefault(); e.stopPropagation();
    var startX = e.clientX;
    var startW = th.offsetWidth;
    _resizing = { th: th, startX: startX, startW: startW, table: th.closest('table') };
    document.addEventListener('mousemove', _onMouseMove);
    document.addEventListener('mouseup', _onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function _onMouseMove(e) {
    if (!_resizing) return;
    // RTL: moving mouse right = narrower, left = wider (reversed delta)
    var isRtl = getComputedStyle(_resizing.table).direction === 'rtl';
    var delta = e.clientX - _resizing.startX;
    var newW = _resizing.startW + (isRtl ? -delta : delta);
    if (newW < 30) newW = 30;
    _resizing.th.style.width = newW + 'px';
    _resizing.th.style.minWidth = newW + 'px';
  }

  function _onMouseUp() {
    if (_resizing) {
      _saveWidths(_resizing.table);
      _resizing = null;
    }
    document.removeEventListener('mousemove', _onMouseMove);
    document.removeEventListener('mouseup', _onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function _saveWidths(table) {
    if (!table) return;
    var widths = {};
    table.querySelectorAll('thead th').forEach(function(th, i) {
      if (th.style.width) widths[i] = th.style.width;
    });
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(widths)); } catch (e) { /* quota */ }
  }

  function _restoreWidths(table) {
    if (!table) return;
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      table.querySelectorAll('thead th').forEach(function(th, i) {
        if (saved[i]) { th.style.width = saved[i]; th.style.minWidth = saved[i]; }
      });
    } catch (e) { /* parse error */ }
  }

  // Expose globally so it can be called after table renders
  window.initInvResizeHandles = initResizeHandles;

  // Auto-init on DOMContentLoaded + after each loadInventoryPage via MutationObserver
  document.addEventListener('DOMContentLoaded', function() { setTimeout(initResizeHandles, 200); });

  // Re-init handles when inv-body content changes (re-rendered)
  var _resizeObserver = null;
  function _watchInvTable() {
    var tbody = document.getElementById('inv-body');
    if (!tbody || _resizeObserver) return;
    _resizeObserver = new MutationObserver(function() { initResizeHandles(); });
    _resizeObserver.observe(tbody, { childList: true });
  }
  document.addEventListener('DOMContentLoaded', function() { setTimeout(_watchInvTable, 300); });
})();
