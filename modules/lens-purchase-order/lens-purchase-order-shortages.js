// lens-purchase-order-shortages.js — load stock shortages + render the 3 source-band table.
// Bands (mockup): 🧍 ייצור — ללקוחות (custom), 📦 מדף — חוסרים (stock), ✏️ הוספות ידניות (manual).
// Custom band is M7 sale-order linkage — placeholder until upstream module ships data.
// Render uses GroupHeaderRow for the synthetic band rows; rest is raw <tr> HTML.

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function reloadForCurrentSupplier() {
    const supplierId = window.LensPO.supplierId;
    const tid = getTenantId();
    if (!supplierId || !tid) return;
    const { data: stockRows, error } = await sb
      .from('tenant_lens_stock')
      .select('variant_id, sph, cyl, add_value, qty_on_hand, reorder_threshold, location_id, lens_variant!inner(id, design_id), supplier_catalog_offering!inner(supplier_id)')
      .eq('tenant_id', tid)
      .eq('supplier_catalog_offering.supplier_id', supplierId)
      .lt('qty_on_hand', 999999);
    if (error) {
      console.warn('[lens-po-shortages] join read failed; falling back', error);
      await fallbackUngroupedRead(supplierId, tid);
      return;
    }
    const shortages = (stockRows || []).filter(r =>
      r.reorder_threshold !== null && r.qty_on_hand < r.reorder_threshold);
    populateShortageLines(shortages);
  }

  async function fallbackUngroupedRead(supplierId, tid) {
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
    const shortages = (data || []).filter(r =>
      r.reorder_threshold !== null && r.qty_on_hand < r.reorder_threshold);
    populateShortageLines(shortages);
  }

  function populateShortageLines(rows) {
    const existingManual = window.LensPO.lines.filter(l => l.source === 'manual' && !l._removed);
    const existingCustom = window.LensPO.lines.filter(l => l.source === 'custom' && !l._removed);
    const stockLines = rows.map((r, i) => {
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
    window.LensPO.lines = existingCustom.concat(stockLines).concat(existingManual);
    renderInfoBanner();
    renderLines();
    window.LensPO.recomputeSummary();
  }

  function renderInfoBanner() {
    const banner = document.getElementById('po-info-banner');
    const text   = document.getElementById('po-info-banner-text');
    if (!banner || !text) return;
    const lines  = window.LensPO.lines.filter(l => !l._removed);
    if (lines.length === 0) { banner.style.display = 'none'; return; }
    const stock  = lines.filter(l => l.source === 'stock').length;
    const manual = lines.filter(l => l.source === 'manual').length;
    text.innerHTML = stock + ' שורות נוספו <strong>אוטומטית</strong> מדוח חוסרים. ' +
      manual + ' שורות נוספו <strong>ידנית</strong>. ניתן לערוך כמויות, להסיר, או להוסיף שורות.';
    banner.style.display = 'block';
  }

  function renderLines() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    const lines = window.LensPO.lines.filter(l => !l._removed);
    if (lines.length === 0) {
      c.innerHTML = '<div class="empty-state">לא נמצאו חוסרים לספק זה. הוסף שורה ידנית כדי להתחיל.</div>';
      return;
    }
    const customLines = lines.filter(l => l.source === 'custom');
    const stockLines  = lines.filter(l => l.source === 'stock');
    const manualLines = lines.filter(l => l.source === 'manual');
    const colSpan = 10;
    let html = '<table>';
    html += '<thead><tr>';
    html += '<th></th><th>סדרה / וריאנט</th><th>ללקוח</th>';
    html += '<th style="text-align:center;">SPH</th><th style="text-align:center;">CYL</th>';
    html += '<th style="text-align:center;">חסר</th><th style="text-align:center;">להזמין</th>';
    html += '<th style="text-align:left;">מחיר יח׳</th><th style="text-align:left;">סה"כ</th><th></th>';
    html += '</tr></thead><tbody>';
    if (customLines.length > 0) {
      const customUnits = customLines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
      html += GroupHeaderRow.toHtml({
        sourceType: 'purple', icon: '🧍',
        label: 'ייצור — ללקוחות',
        count: customLines.length + ' שורות / ' + customUnits + ' יח׳',
        colSpan,
      });
      customLines.forEach(l => { html += renderRow(l, 'custom'); });
    }
    if (stockLines.length > 0) {
      const stockUnits = stockLines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
      html += GroupHeaderRow.toHtml({
        sourceType: 'blue', icon: '📦',
        label: 'מדף — חוסרים',
        count: stockLines.length + ' שורות / ' + stockUnits + ' יח׳',
        colSpan,
      });
      stockLines.forEach(l => { html += renderRow(l, 'stock'); });
    }
    if (manualLines.length > 0) {
      const manualUnits = manualLines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
      html += GroupHeaderRow.toHtml({
        sourceType: 'amber', icon: '✏️',
        label: 'הוספות ידניות',
        count: manualLines.length + ' שורות / ' + manualUnits + ' יח׳',
        colSpan,
      });
      manualLines.forEach(l => { html += renderRow(l, 'manual'); });
    }
    html += '</tbody></table>';
    c.innerHTML = html;
    bindLineHandlers();
  }

  function renderRow(l, src) {
    const flagClass = src === 'stock' ? 'auto-flag' : src === 'manual' ? 'manual-flag' : 'custom-flag';
    const flagText  = src === 'stock' ? 'אוטו'    : src === 'manual' ? 'ידני'        : 'M7';
    const flag = '<span class="' + flagClass + '">' + flagText + '</span>';
    const variantLabel = src === 'manual'
      ? '<div class="design-cell">' + esc(l.manual_description || '(תיאור חסר)') + '</div>'
      : '<div class="design-cell">וריאנט ' + esc((l.variant_id || '').slice(0, 8)) + '<div class="sub">SPH ' + esc(l.sph || 0) + ' / CYL ' + esc(l.cyl || 0) + '</div></div>';
    const customer = src === 'custom'
      ? '<span style="font-size:11px;color:#6d28d9;font-weight:600;">לקוח</span>'
      : '<span style="color:#94a3b8;">—</span>';
    const shortageCell = src === 'stock'
      ? '<span style="color:#c0392b; font-weight:700;">' + esc(l._shortage || 0) + '</span>'
      : '<span style="color:#5d6d7e;">—</span>';
    const qty = parseInt(l.qty_ordered, 10) || 0;
    const cost = parseFloat(l.unit_cost) || 0;
    const total = qty * cost;
    return '<tr data-source-row="' + src + '">' +
      '<td>' + flag + '</td>' +
      '<td>' + variantLabel + '</td>' +
      '<td>' + customer + '</td>' +
      '<td style="text-align:center; font-weight:600;">' + (l.sph !== null && l.sph !== undefined ? esc(l.sph) : '—') + '</td>' +
      '<td style="text-align:center; font-weight:600;">' + (l.cyl !== null && l.cyl !== undefined ? esc(l.cyl) : '—') + '</td>' +
      '<td style="text-align:center;">' + shortageCell + '</td>' +
      '<td style="text-align:center;"><input type="number" class="qty-input" data-key="' + esc(l._key) + '" data-action="qty" value="' + esc(qty) + '" min="0"></td>' +
      '<td style="text-align:left;"><input type="number" class="qty-input" style="width:70px;" data-key="' + esc(l._key) + '" data-action="cost" value="' + esc(cost) + '" min="0" step="0.01"></td>' +
      '<td style="text-align:left; font-weight:600;">₪' + total.toFixed(2) + '</td>' +
      '<td><button class="row-action remove" data-key="' + esc(l._key) + '" data-action="remove" type="button">✕</button></td>' +
    '</tr>';
  }

  function bindLineHandlers() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    c.querySelectorAll('input[data-action="qty"]').forEach(el => {
      el.addEventListener('change', () => updateLineField(el.dataset.key, 'qty_ordered', parseInt(el.value, 10) || 0));
    });
    c.querySelectorAll('input[data-action="cost"]').forEach(el => {
      el.addEventListener('change', () => updateLineField(el.dataset.key, 'unit_cost', parseFloat(el.value) || 0));
    });
    c.querySelectorAll('button[data-action="remove"]').forEach(el => {
      el.addEventListener('click', () => removeLine(el.dataset.key));
    });
  }

  function updateLineField(key, field, value) {
    const line = window.LensPO.lines.find(l => l._key === key);
    if (!line) return;
    line[field] = value;
    renderLines();
    window.LensPO.recomputeSummary();
  }

  function removeLine(key) {
    const line = window.LensPO.lines.find(l => l._key === key);
    if (!line) return;
    line._removed = true;
    renderInfoBanner();
    renderLines();
    window.LensPO.recomputeSummary();
  }

  window.LensPOShortages = { reloadForCurrentSupplier, renderLines, renderInfoBanner };
})();
