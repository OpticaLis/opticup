/* =============================================================================
   modal-builder.js — Modal System for Optic Up
   Standalone — zero JS dependencies. Uses CSS classes from shared/css/modal.css.
   Wizard extension: modal-wizard.js (loaded separately, attaches Modal.wizard).
   ============================================================================= */
(function () {
  'use strict';

  var _stack = [];
  var _savedOverflow = '';
  var ANIM_MS = 200;
  var Z_BASE = 1000;
  var Z_STEP = 10;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function _escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _createEl(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function _btn(cls, text) {
    var b = _createEl('button', cls);
    b.textContent = text;
    b.setAttribute('type', 'button');
    return b;
  }

  function _focusTrap(overlay) {
    overlay._trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      var els = overlay.querySelectorAll(FOCUSABLE);
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    overlay.addEventListener('keydown', overlay._trapHandler);
  }

  function _updateStacked() {
    _stack.forEach(function (e, i) {
      e.overlay.classList.toggle('modal-stacked', i < _stack.length - 1);
    });
  }

  // Global Escape listener (single)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !_stack.length) return;
    if (_stack[_stack.length - 1].closeOnEscape !== false) Modal.close();
  });

  // --- Modal.show ---
  function show(config) {
    var size = config.size || 'md';
    var typeClass = config._type ? 'modal-type-' + config._type : 'modal-type-default';
    var classes = ['modal-overlay', 'modal-' + size, typeClass, config.cssClass || ''].filter(Boolean).join(' ');

    var overlay = _createEl('div', classes);
    overlay.style.zIndex = Z_BASE + (_stack.length * Z_STEP);
    var container = _createEl('div', 'modal-container');

    // Header
    var header = _createEl('div', 'modal-header');
    var title = _createEl('h3', 'modal-title');
    title.textContent = config.title || '';
    var closeBtn = _createEl('button', 'modal-close', '&times;');
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', '\u05E1\u05D2\u05D5\u05E8'); // סגור
    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);

    // Wizard progress (between header and body)
    if (config._wizardProgress) container.appendChild(config._wizardProgress);

    // Body
    container.appendChild(_createEl('div', 'modal-body', config.content || ''));

    // Footer
    if (config.footer) {
      container.appendChild(_createEl('div', 'modal-footer', config.footer));
    } else if (config._footerEl) {
      container.appendChild(config._footerEl);
    }

    overlay.appendChild(container);
    var prevFocus = document.activeElement;

    // Lock body scroll on first modal
    if (!_stack.length) {
      _savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    _stack.forEach(function (e) { e.overlay.classList.add('modal-stacked'); });

    var entry = {
      overlay: overlay,
      prevFocus: prevFocus,
      closeOnEscape: config.closeOnEscape !== false,
      onClose: config.onClose || null
    };
    var closeFn = function () { _closeEntry(entry); };

    closeBtn.addEventListener('click', closeFn);
    if (config.closeOnBackdrop !== false) {
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) closeFn();
      });
    }

    document.body.appendChild(overlay);
    overlay.classList.add('modal-entering');
    setTimeout(function () { overlay.classList.remove('modal-entering'); }, ANIM_MS);

    _stack.push(entry);
    _focusTrap(overlay);
    var first = overlay.querySelector(FOCUSABLE);
    if (first) setTimeout(function () { first.focus(); }, 50);

    return { el: overlay, close: closeFn };
  }

  // --- Close ---
  function _closeEntry(entry) {
    var idx = _stack.indexOf(entry);
    if (idx === -1) return;
    var overlay = entry.overlay;
    overlay.classList.add('modal-leaving');
    overlay.removeEventListener('keydown', overlay._trapHandler);
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, ANIM_MS);
    _stack.splice(idx, 1);
    _updateStacked();
    if (!_stack.length) document.body.style.overflow = _savedOverflow;
    if (entry.prevFocus && entry.prevFocus.focus) {
      try { entry.prevFocus.focus(); } catch (e) { /* gone */ }
    }
    if (typeof entry.onClose === 'function') entry.onClose();
  }

  function close() {
    if (_stack.length) _closeEntry(_stack[_stack.length - 1]);
  }

  function closeAll() {
    while (_stack.length) _closeEntry(_stack[_stack.length - 1]);
  }

  // --- Modal.confirm ---
  function confirm(config) {
    var footer = _createEl('div', 'modal-footer');
    var confirmBtn = _btn('btn ' + (config.confirmClass || 'btn-primary'), config.confirmText || '\u05D0\u05D9\u05E9\u05D5\u05E8');
    var cancelBtn = _btn('btn btn-secondary', config.cancelText || '\u05D1\u05D9\u05D8\u05D5\u05DC');
    footer.appendChild(confirmBtn);
    footer.appendChild(cancelBtn);

    var modal = show({
      size: config.size || 'sm', title: config.title,
      content: '<p>' + _escapeHtml(config.message || '') + '</p>',
      _footerEl: footer, _type: 'confirm',
      closeOnEscape: true, closeOnBackdrop: true, onClose: config.onCancel || null
    });
    confirmBtn.addEventListener('click', function () {
      modal.close();
      if (typeof config.onConfirm === 'function') config.onConfirm();
    });
    cancelBtn.addEventListener('click', function () {
      modal.close();
      if (typeof config.onCancel === 'function') config.onCancel();
    });
  }

  // --- Modal.alert ---
  function alert(config) {
    var footer = _createEl('div', 'modal-footer');
    var btn = _btn('btn btn-primary', config.buttonText || '\u05D0\u05D9\u05E9\u05D5\u05E8');
    footer.appendChild(btn);

    var modal = show({
      size: config.size || 'sm', title: config.title,
      content: '<p>' + _escapeHtml(config.message || '') + '</p>',
      _footerEl: footer, _type: 'alert',
      closeOnEscape: true, closeOnBackdrop: true, onClose: config.onClose || null
    });
    btn.addEventListener('click', function () { modal.close(); });
  }

  // --- Modal.danger ---
  function danger(config) {
    var word = config.confirmWord || '';
    var bodyHtml = '<p>' + _escapeHtml(config.message || '') + '</p>' +
      '<input type="text" class="danger-confirm-input" placeholder="' + _escapeHtml(word) + '" autocomplete="off">';

    var footer = _createEl('div', 'modal-footer');
    var confirmBtn = _btn('btn btn-danger', config.confirmText || '\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA');
    confirmBtn.disabled = true;
    var cancelBtn = _btn('btn btn-secondary', '\u05D1\u05D9\u05D8\u05D5\u05DC');
    footer.appendChild(confirmBtn);
    footer.appendChild(cancelBtn);

    var modal = show({
      size: config.size || 'sm', title: config.title, content: bodyHtml,
      _footerEl: footer, _type: 'danger', closeOnEscape: true, closeOnBackdrop: false
    });

    var input = modal.el.querySelector('.danger-confirm-input');
    input.addEventListener('input', function () { confirmBtn.disabled = (input.value !== word); });
    confirmBtn.addEventListener('click', function () {
      modal.close();
      if (typeof config.onConfirm === 'function') config.onConfirm();
    });
    cancelBtn.addEventListener('click', function () { modal.close(); });
  }

  // --- Modal.form ---
  function form(config) {
    var formEl = _createEl('form', null);
    formEl.innerHTML = config.content || '';
    formEl.addEventListener('submit', function (e) { e.preventDefault(); });

    var footer = _createEl('div', 'modal-footer');
    var submitBtn = _btn('btn btn-primary', config.submitText || '\u05E9\u05DE\u05D5\u05E8');
    var cancelBtn = _btn('btn btn-secondary', config.cancelText || '\u05D1\u05D9\u05D8\u05D5\u05DC');
    footer.appendChild(submitBtn);
    footer.appendChild(cancelBtn);

    var modal = show({
      size: config.size || 'md', title: config.title, content: '',
      _footerEl: footer, _type: 'default',
      closeOnEscape: true, closeOnBackdrop: true, onClose: config.onCancel || null
    });

    var body = modal.el.querySelector('.modal-body');
    body.innerHTML = '';
    body.appendChild(formEl);

    submitBtn.addEventListener('click', function () {
      if (typeof config.onSubmit === 'function') config.onSubmit(formEl);
      if (config.closeOnSubmit !== false) modal.close();
    });
    cancelBtn.addEventListener('click', function () {
      modal.close();
      if (typeof config.onCancel === 'function') config.onCancel();
    });
    return { el: modal.el, close: modal.close };
  }

  // --- Public API ---
  window.Modal = {
    show: show, confirm: confirm, alert: alert, danger: danger, form: form,
    close: close, closeAll: closeAll,
    _createEl: _createEl  // exposed for modal-wizard.js
  };
})();
