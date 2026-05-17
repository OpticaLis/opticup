// lens-inventory-grid.js — SPH × CYL grid renderer (mockup-fidelity 6-state)
// M1_LENS_INVENTORY_MOCKUP_1TO1 Sub-Phase A3 (2026-05-18):
//   • Mirrors LENS_INVENTORY_MOCKUP.html lines 980-1073 logic.
//   • Renders mockup-style .sph-cyl-grid (CSS Grid, not <table>) for 1:1 visual.
//   • 6 cell states from qty + target + supplier-offering:
//       on-target (qty===target), low (qty<target), out-needed (target>0 & qty===0),
//       over-target (qty>target), no-target (target===0 & qty===0),
//       unavailable (supplier doesn't offer this SPH/CYL combo).
//   • Falls back gracefully if window.LensInv.targets is empty (treats all
//     existing stock as "on-target" green for visual; empty cells as "no-target").
//   • Cell click → grid-cell.cell-selected + showLotsFor(sph, cyl).
//
// Reads from window.LensInv.stockRows + .targets (loaded by lens-inventory-filters.js).

(function () {
  'use strict';

  function _sphRange(variant) {
    const out = [];
    const lo = parseFloat(variant.sph_min);
    const hi = parseFloat(variant.sph_max);
    const step = parseFloat(variant.sph_step) || 0.25;
    if (isNaN(lo) || isNaN(hi)) return out;
    // Mockup mockup convention: SPH descends from positive (max) to negative (min)
    for (let s = hi; s >= lo - 0.0001; s -= step) {
      out.push(Math.round(s * 100) / 100);
    }
    return out;
  }

  function _cylRange(variant) {
    const out = [];
    if (variant.cyl_min == null || variant.cyl_max == null) return [null];
    const lo = parseFloat(variant.cyl_min);
    const hi = parseFloat(variant.cyl_max);
    const step = parseFloat(variant.cyl_step) || 0.25;
    if (isNaN(lo) || isNaN(hi)) return [null];
    // Mockup: CYL ascends from 0.00 down to negative values (0 → -2.75)
    const cylStart = Math.max(lo, hi);
    const cylEnd = Math.min(lo, hi);
    for (let c = cylStart; c >= cylEnd - 0.0001; c -= step) {
      out.push(Math.round(c * 100) / 100);
    }
    return out;
  }

  function _stockMapFromRows(rows) {
    const m = new Map();
    (rows || []).forEach(r => {
      const key = (r.sph == null ? '' : Number(r.sph)) + '|' + (r.cyl == null ? '' : Number(r.cyl));
      m.set(key, (m.get(key) || 0) + (r.qty_on_hand || 0));
    });
    return m;
  }

  function _targetMapFromRows(rows) {
    const m = new Map();
    (rows || []).forEach(r => {
      const key = (r.sph == null ? '' : Number(r.sph)) + '|' + (r.cyl == null ? '' : Number(r.cyl));
      m.set(key, (m.get(key) || 0) + (r.target_qty || r.target || 0));
    });
    return m;
  }

  function _fmt(n) {
    if (n == null || n === '') return '—';
    const num = parseFloat(n);
    if (isNaN(num)) return String(n);
    return (num >= 0 ? '+' : '') + num.toFixed(2);
  }

  // Compute cell state per mockup 6-state logic (lines 1027-1059).
  function _classifyCell(qty, target, unavailable) {
    if (unavailable) return 'cell-unavailable';
    if (target === 0 && qty === 0) return 'cell-no-target';
    if (target > 0 && qty === 0) return 'cell-out-needed';
    if (qty < target) return 'cell-low';
    if (qty === target) return 'cell-on-target';
    if (qty > target) return 'cell-over-target';
    return 'cell-no-target';
  }

  function _classifyCellNoTargetData(qty) {
    // Fallback when no target rows exist: stock = on-target, empty = no-target.
    if (qty > 0) return 'cell-on-target';
    return 'cell-no-target';
  }

  function _gridContextLabel(variant) {
    const brandName = (window.LensInv.brands || [])
      .find(b => b.id === ((window.LensInv.designs || []).find(d => d.id === variant.design_id) || {}).brand_id)?.name || '';
    const designName = ((window.LensInv.designs || []).find(d => d.id === variant.design_id) || {}).name || '';
    const variantLabel = variant.display_id ? (' · ' + variant.display_id) : '';
    return 'רשת SPH × CYL — ' + [brandName, designName].filter(Boolean).join(' ') + variantLabel;
  }

  function renderGrid() {
    const cont = document.getElementById('grid-container');
    if (!cont) return;
    const variant = (window.LensInv.variants || []).find(v => v.id === window.LensInv.variantId);
    if (!variant) {
      cont.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
      return;
    }

    // Update grid panel title with variant context
    const ctxEl = document.getElementById('grid-context-label');
    if (ctxEl) ctxEl.textContent = _gridContextLabel(variant);

    const sphList = _sphRange(variant);
    const cylList = _cylRange(variant);

    if (!sphList.length) {
      cont.innerHTML = '<div class="empty-state">לוריאציה זו אין טווח SPH</div>';
      return;
    }

    const stockMap = _stockMapFromRows(window.LensInv.stockRows);
    const targetMap = _targetMapFromRows(window.LensInv.targets);
    const hasTargetData = (window.LensInv.targets || []).length > 0;

    // CSS Grid: 50px corner + N cylList columns @ 38px each
    const cylCols = cylList.length;
    let html = '<div class="sph-cyl-grid" style="--cyl-cols:' + cylCols + ';">';
    html += '<div class="grid-corner">SPH &darr;<br>CYL &rarr;</div>';
    cylList.forEach(c => {
      const label = c == null ? 'SPH' : (c >= 0 ? '+' + c.toFixed(2) : c.toFixed(2));
      html += '<div class="col-header">' + escapeHtml(label) + '</div>';
    });

    sphList.forEach(s => {
      html += '<div class="row-header">' + escapeHtml(s >= 0 ? '+' + s.toFixed(2) : s.toFixed(2)) + '</div>';
      cylList.forEach(c => {
        const cylValue = c == null ? '' : c;
        const key = Number(s) + '|' + (c == null ? '' : Number(c));
        const qty = stockMap.get(key) || 0;
        const target = targetMap.get(key) || 0;
        const unavailable = false;  // supplier-offering filtering deferred
        const cls = hasTargetData
          ? _classifyCell(qty, target, unavailable)
          : _classifyCellNoTargetData(qty);
        const sphAttr = escapeHtml(String(s));
        const cylAttr = c == null ? '' : escapeHtml(String(c));
        const display = (cls === 'cell-unavailable')
          ? '—'
          : (qty === 0 && target === 0) ? '0' : String(qty);
        const titleParts = [];
        if (target > 0) titleParts.push('יעד: ' + target);
        titleParts.push('במלאי: ' + qty);
        if (target > qty) titleParts.push('חסר ' + (target - qty));
        else if (qty > target && target > 0) titleParts.push('עודף ' + (qty - target));
        const title = escapeHtml(titleParts.join(' · '));
        html += '<div class="grid-cell ' + cls + '" data-sph="' + sphAttr + '" data-cyl="' + cylAttr + '" title="' + title + '">' + escapeHtml(display) + '</div>';
      });
    });
    html += '</div>';
    cont.innerHTML = html;

    // Bind click-to-show-lots — uses .cell-* classes (skip unavailable)
    cont.querySelectorAll('.grid-cell').forEach(td => {
      if (td.classList.contains('cell-unavailable')) return;
      td.addEventListener('click', () => {
        cont.querySelectorAll('.grid-cell.cell-selected').forEach(c => c.classList.remove('cell-selected'));
        td.classList.add('cell-selected');
        const sph = td.dataset.sph || '';
        const cyl = td.dataset.cyl || '';
        if (window.LensInvLots && typeof window.LensInvLots.showLotsFor === 'function') {
          window.LensInvLots.showLotsFor(sph, cyl);
        }
      });
    });
  }

  window.LensInvGrid = { renderGrid };
})();
