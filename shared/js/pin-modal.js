// =========================================================
// pin-modal.js — PIN Prompt using Modal system
// Migration of js/pin-modal.js — identical external API
// Usage: promptPin('כותרת', async (pin, emp) => { ... })
// Load after: shared/js/modal-builder.js, auth-service.js
// =========================================================

(function () {
  'use strict';

  // Inject PIN-specific styles once
  var _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var style = document.createElement('style');
    style.textContent =
      '.pp-digits{display:flex;gap:10px;justify-content:center;direction:ltr;margin-bottom:16px}' +
      '.pp-digit{width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid var(--color-gray-300,#d0d5dd);border-radius:var(--radius-md,10px);outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s;background:var(--color-bg-input,#fff)}' +
      '.pp-digit:focus{border-color:var(--color-primary,#1a2744);box-shadow:0 0 0 3px rgba(26,39,68,.15)}' +
      '.pin-error{display:none;color:var(--color-error,#dc3545);font-size:.88rem;margin-bottom:8px;font-weight:600;text-align:center}';
    document.head.appendChild(style);
  }

  function promptPin(title, callback) {
    _injectStyles();

    var content =
      '<p style="margin:0 0 16px;color:var(--color-gray-500,#666);font-size:.88rem;text-align:center">הזן קוד עובד (5 ספרות)</p>' +
      '<div class="pp-digits">' +
        '<input class="pp-digit" data-idx="0" type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">' +
        '<input class="pp-digit" data-idx="1" type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">' +
        '<input class="pp-digit" data-idx="2" type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">' +
        '<input class="pp-digit" data-idx="3" type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">' +
        '<input class="pp-digit" data-idx="4" type="password" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">' +
      '</div>' +
      '<div class="pin-error"></div>';

    var footer = '<button type="button" class="btn btn-secondary pp-cancel">ביטול</button>';

    var modal = Modal.show({
      size: 'sm',
      title: title,
      content: content,
      footer: footer,
      closeOnEscape: true,
      closeOnBackdrop: true
    });

    var overlay = modal.el;
    var closeFn = modal.close;
    var errEl = overlay.querySelector('.pin-error');
    var digits = overlay.querySelectorAll('.pp-digit');

    // Cancel button
    overlay.querySelector('.pp-cancel').addEventListener('click', closeFn);

    // Center the body text
    var body = overlay.querySelector('.modal-body');
    if (body) body.style.textAlign = 'center';

    // Wire up digit inputs
    digits.forEach(function (inp, i) {
      inp.addEventListener('input', function () {
        if (inp.value.length === 1 && i < 4) digits[i + 1].focus();
        if (i === 4 && inp.value.length === 1) {
          var pin = '';
          digits.forEach(function (d) { pin += d.value; });
          if (pin.length === 5) _submit(pin, callback, closeFn, digits, errEl);
        }
      });

      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && i > 0) {
          digits[i - 1].focus();
          digits[i - 1].value = '';
        }
      });

      inp.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        for (var j = 0; j < Math.min(text.length, 5); j++) {
          digits[j].value = text[j];
        }
        if (text.length >= 5) {
          digits[4].focus();
          _submit(text.slice(0, 5), callback, closeFn, digits, errEl);
        } else if (text.length > 0) {
          digits[Math.min(text.length, 4)].focus();
        }
      });
    });

    // Auto-focus first digit
    setTimeout(function () { digits[0].focus(); }, 100);
  }

  async function _submit(pin, callback, closeFn, digits, errEl) {
    // Disable inputs during verification
    digits.forEach(function (d) { d.disabled = true; });
    try {
      var emp = await verifyPinOnly(pin);
      if (!emp) {
        errEl.style.display = 'block';
        errEl.textContent = 'קוד עובד שגוי';
        digits.forEach(function (d) { d.value = ''; d.disabled = false; });
        digits[0].focus();
        return;
      }
      closeFn();
      callback(pin, emp);
    } catch (e) {
      errEl.style.display = 'block';
      errEl.textContent = 'שגיאת רשת' + (e.message ? ': ' + e.message : '');
      digits.forEach(function (d) { d.value = ''; d.disabled = false; });
      digits[0].focus();
    }
  }

  // Expose globally — identical contract
  window.promptPin = promptPin;
})();
