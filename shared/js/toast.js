/* =============================================================================
   toast.js — Toast Notification System for Optic Up
   Standalone — zero dependencies on other JS files.
   Uses CSS classes from shared/css/toast.css.
   Public API: Toast.success/error/warning/info/dismiss/clear
   ============================================================================= */

(function () {
  'use strict';

  var _container = null;
  var _counter = 0;
  var _MAX_VISIBLE = 5;
  var _ANIM_MS = 300;

  // --- SVG icons (20×20 viewBox) ---
  var _icons = {
    success: '<svg class="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 10l3.5 3.5L15 7"/></svg>',
    error:   '<svg class="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l8 8M14 6l-8 8"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4l7 12H3L10 4z"/><path d="M10 9v3M10 14v.5"/></svg>',
    info:    '<svg class="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><path d="M10 9v4M10 7v.5"/></svg>'
  };

  function _escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _ensureContainer() {
    if (_container) return _container;
    _container = document.createElement('div');
    _container.className = 'toast-container';
    document.body.appendChild(_container);
    return _container;
  }

  function _visibleCount() {
    if (!_container) return 0;
    var toasts = _container.children;
    var count = 0;
    for (var i = 0; i < toasts.length; i++) {
      if (!toasts[i].classList.contains('toast-leaving')) count++;
    }
    return count;
  }

  function _removeOldest() {
    if (!_container) return;
    var toasts = _container.children;
    for (var i = 0; i < toasts.length; i++) {
      if (!toasts[i].classList.contains('toast-leaving')) {
        _dismissEl(toasts[i]);
        return;
      }
    }
  }

  function _dismissEl(el) {
    if (!el || el.classList.contains('toast-leaving')) return;
    el.classList.remove('toast-entering');
    el.classList.add('toast-leaving');
    if (el._dismissTimer) { clearTimeout(el._dismissTimer); el._dismissTimer = null; }
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, _ANIM_MS);
  }

  function _create(type, message, options) {
    var opts = options || {};
    var id = opts.id || ('toast-' + (++_counter));

    // Duplicate prevention: replace existing toast with same id
    if (opts.id) { Toast.dismiss(opts.id); }

    _ensureContainer();

    // Enforce max visible
    while (_visibleCount() >= _MAX_VISIBLE) { _removeOldest(); }

    var persistent = opts.persistent === true || opts.duration === 0;
    var duration = persistent ? 0 : (opts.duration || 3000);
    var closable = opts.closable !== false;

    // Build element
    var el = document.createElement('div');
    el.className = 'toast toast-' + type + ' toast-entering';
    el.setAttribute('data-toast-id', id);
    el.setAttribute('role', 'alert');

    var html = (_icons[type] || '') +
      '<span class="toast-content">' + _escapeHtml(message) + '</span>';

    if (closable) {
      html += '<button class="toast-close" aria-label="close">&times;</button>';
    }

    if (duration > 0) {
      el.style.setProperty('--toast-duration', duration + 'ms');
      html += '<span class="toast-progress"></span>';
    }

    el.innerHTML = html;

    // Close button handler
    if (closable) {
      var closeBtn = el.querySelector('.toast-close');
      closeBtn.addEventListener('click', function () { _dismissEl(el); });
    }

    _container.appendChild(el);

    // Remove entering class after animation
    setTimeout(function () { el.classList.remove('toast-entering'); }, _ANIM_MS);

    // Auto-dismiss
    if (duration > 0) {
      el._dismissTimer = setTimeout(function () { _dismissEl(el); }, duration);
    }

    return id;
  }

  // --- Public API ---
  var Toast = {
    success: function (message, options) { return _create('success', message, options); },
    error:   function (message, options) { return _create('error',   message, options); },
    warning: function (message, options) { return _create('warning', message, options); },
    info:    function (message, options) { return _create('info',    message, options); },

    dismiss: function (id) {
      if (!_container) return;
      var el = _container.querySelector('[data-toast-id="' + id + '"]');
      if (el) _dismissEl(el);
    },

    clear: function () {
      if (!_container) return;
      var toasts = _container.children;
      for (var i = toasts.length - 1; i >= 0; i--) {
        _dismissEl(toasts[i]);
      }
    }
  };

  Toast.show = Toast.info;

  window.Toast = Toast;
})();
