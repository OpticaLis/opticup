/* quick-receipt-drawer.js — Quick Receipt right-pinned drawer
   ============================================================================
   Right-pinned (RTL: inset-inline-start:0) drawer that funnels ALL inventory
   entry through a single path with delivery-note capture per session.
   Section A captures metadata ONCE (delivery_note_number + supplier_id +
   receipt_date + has_no_invoice flag). Section B stages N items inheriting
   the metadata. On submit, ALL items receive the same audit-trail context.

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #7 + Daniel decision #9 "Quick Receipt drawer = SOLE inventory-entry path").
   Used by M1 Inventory + reused later by M9 Goods Receipt module.

   API:
     QuickReceiptDrawer.init(container, {
       suppliers: [{ id, name }, ...],
       allowNoInvoice?: true,
       onSubmit: (payload) => Promise,    // payload = { meta, items }
       onCancel?: () => {}
     }) → {
       open(), close(), isOpen(),
       stageItem(item), removeItem(itemId), clearStaged(),
       setSuppliers(arr), getMeta(), setMeta(patch),
       destroy()
     }

   Item shape (caller supplies on stageItem):
     { id, name, variant?, qty, unitCost?, meta?: { sphere, cyl, axis, ... } }

   Class prefix `.qrd-*` — matches mockup HTML in LENS_INVENTORY_MOCKUP.html.
   Deps: shared/css/quick-receipt.css. Soft dep on Toast for "submit error".
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _todayIso() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function init(container, config) {
    if (!container) throw new Error('QuickReceiptDrawer.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('QuickReceiptDrawer.init: mount not found: ' + container);

    var suppliers = Array.isArray(config && config.suppliers) ? config.suppliers.slice() : [];
    var allowNoInvoice = (config && config.allowNoInvoice !== false);
    var onSubmit = (config && typeof config.onSubmit === 'function') ? config.onSubmit : null;
    var onCancel = (config && typeof config.onCancel === 'function') ? config.onCancel : null;

    var meta = { delivery_note_number: '', supplier_id: '', has_no_invoice: false, receipt_date: _todayIso(), notes: '' };
    var staged = [];
    var open = false;
    var destroyed = false;

    var root, bodyEl, stagedListEl, submitBtn, cancelBtn, closeBtn;
    var dnInput, supplierSel, noInvoiceCb, dateInput, notesInput;

    function _supplierOpts(selectedId) {
      var html = '<option value="">— בחר ספק —</option>';
      for (var i = 0; i < suppliers.length; i++) {
        var s = suppliers[i];
        html += '<option value="' + _esc(s.id) + '"' + (s.id === selectedId ? ' selected' : '') + '>' + _esc(s.name) + '</option>';
      }
      return html;
    }

    function _build() {
      root = document.createElement('div');
      root.className = 'quick-receipt-drawer';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', 'קבלת סחורה');

      var html = '<div class="qrd-header">' +
        '<div class="qrd-title">📦 קבלת סחורה</div>' +
        '<button type="button" class="qrd-close" aria-label="סגור">×</button>' +
      '</div>' +
      '<div class="qrd-body">' +
        '<div class="qrd-section qrd-section-meta">' +
          '<div class="qrd-section-title">A · פרטי קבלה</div>' +
          '<div class="qrd-field">' +
            '<label for="qrd-dn">מספר תעודת משלוח</label>' +
            '<input type="text" id="qrd-dn" autocomplete="off" />' +
          '</div>' +
          '<div class="qrd-field">' +
            '<label for="qrd-sup">ספק</label>' +
            '<select id="qrd-sup">' + _supplierOpts('') + '</select>' +
          '</div>' +
          '<div class="qrd-field">' +
            '<label for="qrd-date">תאריך קבלה</label>' +
            '<input type="date" id="qrd-date" />' +
          '</div>' +
          (allowNoInvoice ?
            '<div class="qrd-field">' +
              '<label class="qrd-checkbox-label" for="qrd-no-inv"><input type="checkbox" id="qrd-no-inv" /> אין תעודה (לבדיקה עתידית)</label>' +
              '<div class="qrd-helper-warning" id="qrd-no-inv-warn" style="display:none;">⚠️ ידרוש בדיקה ידנית של מנהל ביום הבא.</div>' +
            '</div>' : '') +
          '<div class="qrd-field">' +
            '<label for="qrd-notes">הערות (אופציונלי)</label>' +
            '<input type="text" id="qrd-notes" />' +
          '</div>' +
        '</div>' +
        '<div class="qrd-section qrd-section-items">' +
          '<div class="qrd-section-title">B · פריטים בקבלה (<span class="qrd-count">0</span>)</div>' +
          '<div class="qrd-staged-list"></div>' +
          '<div class="qrd-empty-state" data-empty-state>סרוק/הוסף פריטים — מטא־דאטא A תועתק לכל פריט אוטומטית.</div>' +
        '</div>' +
      '</div>' +
      '<div class="qrd-footer">' +
        '<button type="button" class="btn btn-ghost qrd-cancel">ביטול</button>' +
        '<button type="button" class="btn btn-primary qrd-submit" disabled>סיים קבלה</button>' +
      '</div>';
      root.innerHTML = html;
      mount.appendChild(root);

      bodyEl       = root.querySelector('.qrd-body');
      stagedListEl = root.querySelector('.qrd-staged-list');
      submitBtn    = root.querySelector('.qrd-submit');
      cancelBtn    = root.querySelector('.qrd-cancel');
      closeBtn     = root.querySelector('.qrd-close');
      dnInput      = root.querySelector('#qrd-dn');
      supplierSel  = root.querySelector('#qrd-sup');
      noInvoiceCb  = root.querySelector('#qrd-no-inv');
      dateInput    = root.querySelector('#qrd-date');
      notesInput   = root.querySelector('#qrd-notes');
      if (dateInput) dateInput.value = meta.receipt_date;

      _wire();
      _renderStaged();
    }

    function _wire() {
      closeBtn.addEventListener('click', closeFn);
      cancelBtn.addEventListener('click', function () {
        closeFn();
        if (onCancel) { try { onCancel(); } catch (_e) {} }
      });
      dnInput.addEventListener('input', function (e) { meta.delivery_note_number = e.target.value; _refreshSubmitState(); });
      supplierSel.addEventListener('change', function (e) { meta.supplier_id = e.target.value; _refreshSubmitState(); });
      if (dateInput) dateInput.addEventListener('change', function (e) { meta.receipt_date = e.target.value; });
      if (notesInput) notesInput.addEventListener('input', function (e) { meta.notes = e.target.value; });
      if (noInvoiceCb) {
        noInvoiceCb.addEventListener('change', function (e) {
          meta.has_no_invoice = !!e.target.checked;
          var w = root.querySelector('#qrd-no-inv-warn');
          if (w) w.style.display = meta.has_no_invoice ? '' : 'none';
          if (meta.has_no_invoice) { dnInput.value = ''; dnInput.disabled = true; meta.delivery_note_number = ''; }
          else { dnInput.disabled = false; }
          _refreshSubmitState();
        });
      }
      stagedListEl.addEventListener('click', function (e) {
        var rm = e.target.closest('.qrd-remove-item');
        if (rm) { removeItem(rm.dataset.itemId); return; }
        var qtyBtn = e.target.closest('.qrd-qty-btn');
        if (qtyBtn) {
          var id = qtyBtn.dataset.itemId;
          var delta = qtyBtn.dataset.delta === '+1' ? 1 : -1;
          var idx = _findIdx(id);
          if (idx === -1) return;
          var newQ = Math.max(1, (staged[idx].qty || 1) + delta);
          staged[idx].qty = newQ;
          _renderStaged();
        }
      });
      submitBtn.addEventListener('click', function () {
        if (submitBtn.disabled) return;
        if (!onSubmit) return;
        submitBtn.disabled = true;
        var payload = { meta: Object.assign({}, meta), items: staged.slice() };
        var p = onSubmit(payload);
        if (p && typeof p.then === 'function') {
          p.then(function () { clearStaged(); closeFn(); })
           .catch(function (err) {
             if (window.Toast && typeof window.Toast.error === 'function') {
               window.Toast.error('שמירת הקבלה נכשלה: ' + (err && err.message ? err.message : 'שגיאה')); }
             submitBtn.disabled = false;
           });
        } else {
          clearStaged();
          closeFn();
        }
      });
    }

    function _findIdx(id) {
      for (var i = 0; i < staged.length; i++) if (String(staged[i].id) === String(id)) return i;
      return -1;
    }

    function _renderStaged() {
      var html = '';
      for (var i = 0; i < staged.length; i++) {
        var it = staged[i];
        var meta2 = it.meta ? Object.keys(it.meta).map(function (k) { return _esc(k) + ': ' + _esc(it.meta[k]); }).join(' · ') : '';
        html += '<div class="qrd-staged-item">' +
          '<div style="flex:1;">' +
            '<div class="item-name">' + _esc(it.name || '') + '</div>' +
            (meta2 ? '<div class="item-meta">' + meta2 + '</div>' : '') +
          '</div>' +
          '<div class="qrd-qty-controls">' +
            '<button type="button" class="qrd-qty-btn" data-item-id="' + _esc(it.id) + '" data-delta="-1">−</button>' +
            '<input type="text" value="' + _esc(it.qty || 1) + '" readonly />' +
            '<button type="button" class="qrd-qty-btn" data-item-id="' + _esc(it.id) + '" data-delta="+1">+</button>' +
          '</div>' +
          '<button type="button" class="qrd-remove-item" data-item-id="' + _esc(it.id) + '" aria-label="הסר">×</button>' +
        '</div>';
      }
      stagedListEl.innerHTML = html;
      var emp = root.querySelector('[data-empty-state]');
      if (emp) emp.style.display = staged.length === 0 ? '' : 'none';
      var c = root.querySelector('.qrd-count');
      if (c) c.textContent = staged.length;
      _refreshSubmitState();
    }

    function _refreshSubmitState() {
      var hasDn  = !!meta.delivery_note_number || meta.has_no_invoice;
      var hasSup = !!meta.supplier_id;
      submitBtn.disabled = !(hasDn && hasSup && staged.length > 0);
    }

    function stageItem(item) {
      if (!item || destroyed) return;
      var idx = item.id != null ? _findIdx(item.id) : -1;
      if (idx >= 0) { staged[idx].qty = (staged[idx].qty || 0) + (item.qty || 1); }
      else { staged.push(Object.assign({ qty: 1 }, item)); }
      _renderStaged();
    }
    function removeItem(id) {
      if (destroyed) return;
      var idx = _findIdx(id);
      if (idx === -1) return;
      staged.splice(idx, 1);
      _renderStaged();
    }
    function clearStaged() { staged = []; if (!destroyed) _renderStaged(); }
    function setSuppliers(arr) {
      suppliers = Array.isArray(arr) ? arr.slice() : [];
      if (supplierSel) supplierSel.innerHTML = _supplierOpts(meta.supplier_id);
    }
    function getMeta() { return Object.assign({}, meta); }
    function setMeta(patch) {
      meta = Object.assign({}, meta, patch || {});
      if (dnInput)      dnInput.value = meta.delivery_note_number || '';
      if (supplierSel)  supplierSel.value = meta.supplier_id || '';
      if (dateInput)    dateInput.value = meta.receipt_date || '';
      if (notesInput)   notesInput.value = meta.notes || '';
      if (noInvoiceCb)  noInvoiceCb.checked = !!meta.has_no_invoice;
      _refreshSubmitState();
    }

    function openFn() { if (destroyed) return; open = true; root.classList.add('active'); var f = root.querySelector('input, select, button'); if (f && f.focus) f.focus(); }
    function closeFn() { if (destroyed) return; open = false; root.classList.remove('active'); }
    function isOpen() { return open; }
    function destroy() { if (destroyed) return; destroyed = true; if (root && root.parentNode) root.parentNode.removeChild(root); }

    _build();
    return {
      open: openFn, close: closeFn, isOpen: isOpen,
      stageItem: stageItem, removeItem: removeItem, clearStaged: clearStaged,
      setSuppliers: setSuppliers, getMeta: getMeta, setMeta: setMeta,
      destroy: destroy
    };
  }

  window.QuickReceiptDrawer = { init: init };
})();
