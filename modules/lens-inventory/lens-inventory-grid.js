// lens-inventory-grid.js — SPH × CYL grid renderer
// Reads from window.LensInv.stockRows (populated by lens-inventory-filters.js).
// Displays qty_on_hand per (sph, cyl) cell with click-to-show-lots behavior.
// ➕➖ buttons exist but are display-only this phase (sibling SPEC wires them).

(function () {
  'use strict';

  function _sphRange(variant) {
    const out = [];
    const lo = parseFloat(variant.sph_min);
    const hi = parseFloat(variant.sph_max);
    const step = parseFloat(variant.sph_step) || 0.25;
    if (isNaN(lo) || isNaN(hi)) return out;
    for (let s = lo; s <= hi + 0.0001; s += step) {
      out.push(Math.round(s * 100) / 100);
    }
    return out;
  }

  function _cylRange(variant) {
    const out = [];
    if (variant.cyl_min == null || variant.cyl_max == null) return [null]; // sphere-only
    const lo = parseFloat(variant.cyl_min);
    const hi = parseFloat(variant.cyl_max);
    const step = parseFloat(variant.cyl_step) || 0.25;
    if (isNaN(lo) || isNaN(hi)) return [null];
    for (let c = lo; c <= hi + 0.0001; c += step) {
      out.push(Math.round(c * 100) / 100);
    }
    return out;
  }

  function _stockMapFromRows(rows) {
    // map key "sph|cyl" → qty_on_hand
    const m = new Map();
    rows.forEach(r => {
      const key = (r.sph == null ? '' : r.sph) + '|' + (r.cyl == null ? '' : r.cyl);
      m.set(key, (m.get(key) || 0) + (r.qty_on_hand || 0));
    });
    return m;
  }

  function renderGrid() {
    const cont = document.getElementById('grid-container');
    const variant = (window.LensInv.variants || []).find(v => v.id === window.LensInv.variantId);
    if (!variant) {
      cont.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
      return;
    }

    const sphList = _sphRange(variant);
    const cylList = _cylRange(variant);
    const stockMap = _stockMapFromRows(window.LensInv.stockRows || []);

    if (!sphList.length) {
      cont.innerHTML = '<div class="empty-state">לוריאציה זו אין טווח SPH</div>';
      return;
    }

    let html = '<table class="lens-grid"><thead><tr><th>SPH \\ CYL</th>';
    cylList.forEach(c => {
      html += '<th>' + escapeHtml(c == null ? 'SPH' : (c >= 0 ? '+' + c.toFixed(2) : c.toFixed(2))) + '</th>';
    });
    html += '</tr></thead><tbody>';
    sphList.forEach(s => {
      html += '<tr><th>' + escapeHtml(s >= 0 ? '+' + s.toFixed(2) : s.toFixed(2)) + '</th>';
      cylList.forEach(c => {
        const key = s + '|' + (c == null ? '' : c);
        const qty = stockMap.get(key) || 0;
        const cls = qty > 0 ? 'cell-stock' : 'cell-empty';
        const sphAttr = escapeHtml(String(s));
        const cylAttr = c == null ? '' : escapeHtml(String(c));
        html += '<td class="' + cls + '" data-sph="' + sphAttr + '" data-cyl="' + cylAttr + '">' +
                escapeHtml(String(qty)) +
                ' <button class="qty-btn" data-action="add" data-sph="' + sphAttr + '" data-cyl="' + cylAttr + '" title="הוספת מלאי — בקבלה">+</button>' +
                ' <button class="qty-btn" data-action="reduce" data-sph="' + sphAttr + '" data-cyl="' + cylAttr + '" title="הורדת מלאי — במכירה">−</button>' +
                '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    cont.innerHTML = html;

    // Bind click-to-show-lots on cells
    cont.querySelectorAll('td.cell-stock, td.cell-empty').forEach(td => {
      td.addEventListener('click', (e) => {
        if (e.target && e.target.matches('.qty-btn')) return; // qty-btn has its own handler
        const sph = td.dataset.sph || '';
        const cyl = td.dataset.cyl || '';
        window.LensInvLots.showLotsFor(sph, cyl);
      });
    });

    // Bind ➕➖ — display-only modal
    cont.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        window.LensInvModals.showStockMovementStub(action);
      });
    });
  }

  window.LensInvGrid = { renderGrid };
})();
