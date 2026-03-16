// =========================================================
// pin-modal.js — Reusable PIN Prompt (5-digit split input modal)
// Usage: promptPin('כותרת', async (pin, emp) => { ... })
// Load after: shared.js, auth-service.js
// =========================================================

function promptPin(title, callback) {
  var existingModal = $('prompt-pin-modal');
  if (existingModal) existingModal.remove();

  var overlay = document.createElement('div');
  overlay.id = 'prompt-pin-modal';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML =
    '<div class="modal" style="max-width:380px;text-align:center">' +
      '<h3 style="margin:0 0 8px;color:var(--primary)">' + escapeHtml(title) + '</h3>' +
      '<p style="margin:0 0 16px;color:#666;font-size:.88rem">הזן קוד עובד (5 ספרות)</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;direction:ltr;margin-bottom:16px">' +
        '<input class="pp-digit" data-idx="0" type="password" inputmode="numeric" maxlength="1" autocomplete="off" style="width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid #d0d5dd;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s">' +
        '<input class="pp-digit" data-idx="1" type="password" inputmode="numeric" maxlength="1" autocomplete="off" style="width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid #d0d5dd;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s">' +
        '<input class="pp-digit" data-idx="2" type="password" inputmode="numeric" maxlength="1" autocomplete="off" style="width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid #d0d5dd;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s">' +
        '<input class="pp-digit" data-idx="3" type="password" inputmode="numeric" maxlength="1" autocomplete="off" style="width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid #d0d5dd;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s">' +
        '<input class="pp-digit" data-idx="4" type="password" inputmode="numeric" maxlength="1" autocomplete="off" style="width:48px;height:56px;text-align:center;font-size:1.5rem;border:2px solid #d0d5dd;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s">' +
      '</div>' +
      '<div id="pp-error" style="display:none;color:#dc3545;font-size:.88rem;margin-bottom:8px;font-weight:600"></div>' +
      '<button class="btn btn-g" onclick="document.getElementById(\'prompt-pin-modal\').remove()" style="padding:8px 24px">ביטול</button>' +
    '</div>';

  document.body.appendChild(overlay);

  var digits = overlay.querySelectorAll('.pp-digit');
  digits.forEach(function(inp, i) {
    inp.addEventListener('input', function() {
      if (inp.value.length === 1 && i < 4) digits[i + 1].focus();
      // Auto-submit on 5th digit
      if (i === 4 && inp.value.length === 1) {
        var pin = '';
        digits.forEach(function(d) { pin += d.value; });
        if (pin.length === 5) _promptPinSubmit(pin, callback, overlay, digits);
      }
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !inp.value && i > 0) { digits[i - 1].focus(); digits[i - 1].value = ''; }
    });
    // Handle paste
    inp.addEventListener('paste', function(e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      for (var j = 0; j < Math.min(text.length, 5); j++) {
        digits[j].value = text[j];
      }
      if (text.length >= 5) {
        digits[4].focus();
        _promptPinSubmit(text.slice(0, 5), callback, overlay, digits);
      } else if (text.length > 0) {
        digits[Math.min(text.length, 4)].focus();
      }
    });
    // Focus styling
    inp.addEventListener('focus', function() { inp.style.borderColor = '#1a2744'; inp.style.boxShadow = '0 0 0 3px rgba(26,39,68,.15)'; });
    inp.addEventListener('blur', function() { inp.style.borderColor = '#d0d5dd'; inp.style.boxShadow = 'none'; });
  });

  setTimeout(function() { digits[0].focus(); }, 100);
}

async function _promptPinSubmit(pin, callback, overlay, digits) {
  var errEl = overlay.querySelector('#pp-error');
  try {
    var emp = await verifyPinOnly(pin);
    if (!emp) {
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'קוד עובד שגוי'; }
      digits.forEach(function(d) { d.value = ''; });
      digits[0].focus();
      return;
    }
    overlay.remove();
    callback(pin, emp);
  } catch (e) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'שגיאה: ' + (e.message || ''); }
    digits.forEach(function(d) { d.value = ''; });
    digits[0].focus();
  }
}
