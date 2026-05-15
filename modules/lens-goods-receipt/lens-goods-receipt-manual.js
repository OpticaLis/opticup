// lens-goods-receipt-manual.js — add a manual line not on any PO
// Permission: lens.gr.add_manual_line. Lines are flagged is_manual_addition=true on close.

(function () {
  'use strict';

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function openAddManualModal() {
    if (!hasPermission('lens.gr.add_manual_line')) {
      if (window.Toast) Toast.error('אין הרשאה להוספת שורה ידנית (lens.gr.add_manual_line)');
      return;
    }
    if (!window.LensGR.supplierId) {
      if (window.Toast) Toast.error('יש לבחור ספק קודם');
      return;
    }
    const currency = (window.LensGR.supplierRow && window.LensGR.supplierRow.default_currency) || 'ILS';
    const body = '<div style="display:flex;flex-direction:column;gap:10px;padding:8px 4px;font-size:13px;">' +
      '<div><label style="font-size:11px;color:#5d6d7e;">תיאור פריט (חובה)</label><input type="text" id="grm-desc" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;" placeholder="למשל: דוגמית בונוס מהספק"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<div><label style="font-size:11px;color:#5d6d7e;">SPH (אופציונלי)</label><input type="number" step="0.25" id="grm-sph" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
        '<div><label style="font-size:11px;color:#5d6d7e;">CYL (אופציונלי)</label><input type="number" step="0.25" id="grm-cyl" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<div><label style="font-size:11px;color:#5d6d7e;">כמות שהתקבלה</label><input type="number" id="grm-qty" min="1" value="1" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
        '<div><label style="font-size:11px;color:#5d6d7e;">מחיר יחידה (' + escapeHtmlSafe(currency) + ')</label><input type="number" id="grm-cost" min="0" step="0.01" value="0" style="width:100%;padding:6px 10px;border:1px solid #d0d4d9;border-radius:5px;"></div>' +
      '</div>' +
      '<div id="grm-error" style="color:#dc2626;font-size:12px;display:none;"></div>' +
    '</div>';

    const modal = Modal.show({
      size: 'sm',
      title: '➕ הוסף שורה ידנית בקבלה',
      content: body,
      footer:
        '<button type="button" class="btn" id="grm-cancel">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="grm-add">הוסף</button>',
    });

    const overlay = modal.el;
    overlay.querySelector('#grm-cancel').addEventListener('click', modal.close);
    overlay.querySelector('#grm-add').addEventListener('click', function () {
      const desc = (overlay.querySelector('#grm-desc').value || '').trim();
      const sph = parseFloat(overlay.querySelector('#grm-sph').value);
      const cyl = parseFloat(overlay.querySelector('#grm-cyl').value);
      const qty = parseInt(overlay.querySelector('#grm-qty').value, 10) || 0;
      const cost = parseFloat(overlay.querySelector('#grm-cost').value) || 0;
      const err = overlay.querySelector('#grm-error');
      if (!desc) { err.textContent = 'תיאור הוא שדה חובה'; err.style.display = 'block'; return; }
      if (qty <= 0) { err.textContent = 'כמות חייבת להיות חיובית'; err.style.display = 'block'; return; }
      window.LensGR.manualLines.push({
        _key: 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        _is_manual: true,
        po_line_id: null,
        source: 'stock',
        variant_id: null,
        sale_order_id: null,
        sph: isNaN(sph) ? null : sph,
        cyl: isNaN(cyl) ? null : cyl,
        add_value: null,
        manual_description: desc,
        qty_expected: 0,
        qty_received: qty,
        unit_cost: cost,
        currency_code: currency,
      });
      modal.close();
      window.LensGRLines.renderTable();
      window.LensGR.recomputeSummary();
      if (window.Toast) Toast.success('שורה ידנית נוספה');
    });
  }

  window.LensGRManual = { openAddManualModal };
})();
