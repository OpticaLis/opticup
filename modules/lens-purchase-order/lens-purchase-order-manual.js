// lens-purchase-order-manual.js — manual-line add modal.
// Modal asks for description + qty + unit_cost; pushes a new line into LensPO.lines.

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function openAddManualModal() {
    if (!window.LensPO.supplierId) {
      if (window.Toast) Toast.error('יש לבחור ספק קודם');
      return;
    }
    const currency = (window.LensPO.supplierRow && window.LensPO.supplierRow.default_currency) || 'ILS';
    const body =
      '<div style="display:flex;flex-direction:column;gap:10px;padding:8px 4px;font-size:13px;">' +
        '<div><label style="font-size:11px;color:#5d6d7e;">תיאור פריט (חובה)</label>' +
        '<input type="text" id="manual-desc" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;" placeholder="למשל: דוגמית בונוס מהספק"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div><label style="font-size:11px;color:#5d6d7e;">כמות</label>' +
          '<input type="number" id="manual-qty" min="1" value="1" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
          '<div><label style="font-size:11px;color:#5d6d7e;">מחיר יחידה (' + esc(currency) + ')</label>' +
          '<input type="number" id="manual-cost" min="0" step="0.01" value="0" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
        '</div>' +
        '<div id="manual-error" style="color:#dc2626;font-size:12px;display:none;"></div>' +
      '</div>';

    const modal = Modal.show({
      size: 'sm',
      title: '➕ הוסף שורה ידנית',
      content: body,
      footer:
        '<button type="button" class="btn" id="manual-cancel">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="manual-add">הוסף</button>',
    });

    const overlay = modal.el;
    overlay.querySelector('#manual-cancel').addEventListener('click', modal.close);
    overlay.querySelector('#manual-add').addEventListener('click', function () {
      const desc = (overlay.querySelector('#manual-desc').value || '').trim();
      const qty  = parseInt(overlay.querySelector('#manual-qty').value, 10) || 0;
      const cost = parseFloat(overlay.querySelector('#manual-cost').value) || 0;
      const err  = overlay.querySelector('#manual-error');
      if (!desc) { err.textContent = 'תיאור הוא שדה חובה'; err.style.display = 'block'; return; }
      if (qty <= 0) { err.textContent = 'כמות חייבת להיות חיובית'; err.style.display = 'block'; return; }
      window.LensPO.lines.push({
        _key: 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        source: 'manual',
        variant_id: null,
        sph: null,
        cyl: null,
        add_value: null,
        manual_description: desc,
        qty_ordered: qty,
        unit_cost: cost,
        currency_code: currency,
      });
      modal.close();
      window.LensPOShortages.renderInfoBanner();
      window.LensPOShortages.renderLines();
      window.LensPO.recomputeSummary();
      if (window.Toast) Toast.success('שורה ידנית נוספה');
    });
  }

  window.LensPOManual = { openAddManualModal };
})();
