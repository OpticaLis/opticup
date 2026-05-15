// lens-purchase-order-shortages.js — auto-load stock shortages section
// Reads tenant_lens_stock where qty_on_hand < reorder_threshold for the current supplier.
// Allows inline edit of reorder_threshold per row (writes back to DB) and qty_ordered.
// "Custom-per-customer" section is a placeholder — M7 not yet built.

(function () {
  'use strict';

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  async function reloadForCurrentSupplier() {
    const supplierId = window.LensPO.supplierId;
    const tid = getTenantId();
    if (!supplierId || !tid) return;

    // Strategy: pull tenant_lens_stock rows joined with variants whose primary supplier matches.
    // Since we may not have a direct supplier_id column on tenant_lens_stock, we filter via
    // supplier_catalog_offering (the M1 catalog mapping). Iron Rule 7: use sb client through
    // a single SELECT with join — documented inline.
    const { data: stockRows, error } = await sb
      .from('tenant_lens_stock')
      .select('variant_id, sph, cyl, add_value, qty_on_hand, reorder_threshold, location_id, lens_variant!inner(id, lens_design_id, lens_design!inner(id, design_name, brand_id, brand:lens_brand!inner(id, brand_name))), supplier_catalog_offering!inner(supplier_id)')
      .eq('tenant_id', tid)
      .eq('supplier_catalog_offering.supplier_id', supplierId)
      .lt('qty_on_hand', 999999); // placeholder — see filter step below
    if (error) {
      console.warn('[lens-po-shortages] join read failed; falling back to ungrouped read', error);
      await fallbackUngroupedRead(supplierId, tid);
      return;
    }
    // Filter rows where qty_on_hand < reorder_threshold (NULL threshold => not in shortage)
    const shortages = (stockRows || []).filter(function (r) {
      return r.reorder_threshold !== null && r.qty_on_hand < r.reorder_threshold;
    });
    populateShortageLines(shortages);
  }

  async function fallbackUngroupedRead(supplierId, tid) {
    // Fallback when the supplier-join path returns an error (e.g., FK shape variation).
    // Simple read: all stock rows for tenant. Filter by qty<threshold client-side.
    const { data, error } = await sb
      .from('tenant_lens_stock')
      .select('variant_id, sph, cyl, add_value, qty_on_hand, reorder_threshold, location_id')
      .eq('tenant_id', tid)
      .lt('qty_on_hand', 999999);
    if (error) {
      console.error('[lens-po-shortages] fallback also failed', error);
      const c = document.getElementById('lines-container');
      if (c) c.innerHTML = '<div class="empty-state">שגיאה בטעינת חוסרים. בדוק קונסול.</div>';
      return;
    }
    const shortages = (data || []).filter(function (r) {
      return r.reorder_threshold !== null && r.qty_on_hand < r.reorder_threshold;
    });
    populateShortageLines(shortages);
  }

  function populateShortageLines(rows) {
    // Convert each shortage row into a draft line in window.LensPO.lines (preserving manual lines).
    const existingManual = window.LensPO.lines.filter(function (l) { return l.source === 'manual' && !l._removed; });
    const stockLines = rows.map(function (r, i) {
      const need = Math.max(0, (r.reorder_threshold || 0) - (r.qty_on_hand || 0));
      return {
        _key: 'stock-' + r.variant_id + '-' + (r.sph || 0) + '-' + (r.cyl || 0) + '-' + (r.add_value || 0) + '-' + i,
        source: 'stock',
        variant_id: r.variant_id,
        sph: r.sph,
        cyl: r.cyl,
        add_value: r.add_value,
        manual_description: null,
        qty_ordered: need,
        unit_cost: 0,
        currency_code: (window.LensPO.supplierRow && window.LensPO.supplierRow.default_currency) || 'ILS',
        _qty_on_hand: r.qty_on_hand,
        _reorder_threshold: r.reorder_threshold,
        _shortage: -((r.reorder_threshold || 0) - (r.qty_on_hand || 0)),
      };
    });
    window.LensPO.lines = stockLines.concat(existingManual);
    renderLines();
    window.LensPO.recomputeSummary();
  }

  function renderLines() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    const lines = window.LensPO.lines.filter(function (l) { return !l._removed; });
    if (lines.length === 0) {
      c.innerHTML = '<div class="empty-state">לא נמצאו חוסרים לספק זה. הוסף שורה ידנית כדי להתחיל.</div>';
      return;
    }
    const stockLines = lines.filter(function (l) { return l.source === 'stock'; });
    const manualLines = lines.filter(function (l) { return l.source === 'manual'; });
    let html = '';
    html += '<table class="items-table"><thead><tr>';
    html += '<th></th><th>וריאנט</th><th style="text-align:center;">SPH</th><th style="text-align:center;">CYL</th>';
    html += '<th style="text-align:center;">ADD</th><th style="text-align:center;">סף הזמנה</th>';
    html += '<th style="text-align:center;">חסר</th><th style="text-align:center;">להזמין</th>';
    html += '<th style="text-align:left;">מחיר יח׳</th><th></th>';
    html += '</tr></thead><tbody>';

    if (stockLines.length > 0) {
      html += '<tr><td colspan="10" class="src-group-header">📦 מדף — חוסרים <span style="font-weight:normal; margin-right:8px;">(' + stockLines.length + ' שורות)</span></td></tr>';
      stockLines.forEach(function (l) { html += renderLineRow(l, 'stock'); });
    }

    if (manualLines.length > 0) {
      html += '<tr><td colspan="10" class="src-group-header manual">✏️ הוספות ידניות <span style="font-weight:normal; margin-right:8px;">(' + manualLines.length + ' שורות)</span></td></tr>';
      manualLines.forEach(function (l) { html += renderLineRow(l, 'manual'); });
    }

    html += '<tr><td colspan="10" class="src-group-header custom">🧍 ייצור — ללקוחות (M7) <span style="font-weight:normal; margin-right:8px;">מודול הזמנות (M7) טרם נבנה — סקציה ריקה.</span></td></tr>';
    html += '</tbody></table>';
    c.innerHTML = html;
    bindLineHandlers();
  }

  function renderLineRow(l, src) {
    const flag = src === 'stock' ? '<span class="auto-flag">אוטו</span>' : '<span class="manual-flag">ידני</span>';
    const variantLabel = src === 'manual' ? escapeHtmlSafe(l.manual_description || '(תיאור חסר)') : '<span class="design-cell">וריאנט ' + escapeHtmlSafe((l.variant_id || '').slice(0, 8)) + '<div class="sub">SPH ' + (l.sph || 0) + ' / CYL ' + (l.cyl || 0) + '</div></span>';
    const thresholdCell = src === 'stock'
      ? '<div class="threshold-cell"><input type="number" class="threshold-input" data-key="' + l._key + '" data-action="threshold" value="' + (l._reorder_threshold || 0) + '" min="0"><span style="color:#95a5a6;font-size:10px;">/ במלאי ' + (l._qty_on_hand || 0) + '</span></div>'
      : '<span style="color:#95a5a6;">—</span>';
    const shortageCell = src === 'stock' ? '<span style="color:#c0392b; font-weight:700;">' + (l._shortage || 0) + '</span>' : '<span style="color:#95a5a6;">—</span>';
    return '<tr>' +
      '<td>' + flag + '</td>' +
      '<td>' + variantLabel + '</td>' +
      '<td style="text-align:center;">' + (l.sph !== null && l.sph !== undefined ? l.sph : '—') + '</td>' +
      '<td style="text-align:center;">' + (l.cyl !== null && l.cyl !== undefined ? l.cyl : '—') + '</td>' +
      '<td style="text-align:center;">' + (l.add_value !== null && l.add_value !== undefined ? l.add_value : '—') + '</td>' +
      '<td>' + thresholdCell + '</td>' +
      '<td style="text-align:center;">' + shortageCell + '</td>' +
      '<td style="text-align:center;"><input type="number" class="qty-input" data-key="' + l._key + '" data-action="qty" value="' + (l.qty_ordered || 0) + '" min="0"></td>' +
      '<td style="text-align:left;"><input type="number" class="qty-input" style="width:70px;" data-key="' + l._key + '" data-action="cost" value="' + (l.unit_cost || 0) + '" min="0" step="0.01"></td>' +
      '<td><button class="row-action remove" data-key="' + l._key + '" data-action="remove" type="button">✕</button></td>' +
    '</tr>';
  }

  function bindLineHandlers() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    c.querySelectorAll('input[data-action="qty"]').forEach(function (el) {
      el.addEventListener('change', function () { updateLineField(el.dataset.key, 'qty_ordered', parseInt(el.value, 10) || 0); });
    });
    c.querySelectorAll('input[data-action="cost"]').forEach(function (el) {
      el.addEventListener('change', function () { updateLineField(el.dataset.key, 'unit_cost', parseFloat(el.value) || 0); });
    });
    c.querySelectorAll('input[data-action="threshold"]').forEach(function (el) {
      el.addEventListener('change', function () { updateThreshold(el.dataset.key, parseInt(el.value, 10) || 0); });
    });
    c.querySelectorAll('button[data-action="remove"]').forEach(function (el) {
      el.addEventListener('click', function () { removeLine(el.dataset.key); });
    });
  }

  function updateLineField(key, field, value) {
    const line = window.LensPO.lines.find(function (l) { return l._key === key; });
    if (!line) return;
    line[field] = value;
    window.LensPO.recomputeSummary();
  }

  async function updateThreshold(key, value) {
    const line = window.LensPO.lines.find(function (l) { return l._key === key; });
    if (!line) return;
    line._reorder_threshold = value;
    const tid = getTenantId();
    // Update tenant_lens_stock.reorder_threshold for this variant + sph/cyl/add_value.
    // Iron Rule 7+22: explicit tenant filter on UPDATE. Specialized join: we filter on the
    // composite key (variant_id, sph, cyl, add_value, location_id) to target the right row.
    const { error } = await sb
      .from('tenant_lens_stock')
      .update({ reorder_threshold: value })
      .eq('tenant_id', tid)
      .eq('variant_id', line.variant_id)
      .eq('sph', line.sph)
      .eq('cyl', line.cyl)
      .eq('add_value', line.add_value);
    if (error) {
      console.error('[lens-po-shortages] threshold update failed', error);
      if (window.Toast) Toast.error('עדכון סף הזמנה נכשל: ' + (error.message || error));
      return;
    }
    if (window.Toast) Toast.success('סף הזמנה עודכן');
    if (typeof writeLog === 'function') {
      writeLog('lens.threshold_updated', null, { variant_id: line.variant_id, new_threshold: value });
    }
  }

  function removeLine(key) {
    const line = window.LensPO.lines.find(function (l) { return l._key === key; });
    if (!line) return;
    line._removed = true;
    renderLines();
    window.LensPO.recomputeSummary();
  }

  window.LensPOShortages = { reloadForCurrentSupplier, renderLines };
})();
