// lens-inventory-lot-pane.js — selected-cell drill-down + gold-banner update
// M1_LENS_INVENTORY_MOCKUP_1TO1 Sub-Phase A3 (2026-05-18):
//   • Click cell → load matching stock_lot rows + update gold-gradient banner
//     value (SPH × CYL) + meta (diameter) + stock/target stats row +
//     status-hint + qty-display.
//   • Reads from window.LensInv.stockRows + .targets + .variants.

(function () {
  'use strict';

  function _fmt(v) {
    if (v === '' || v == null) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return String(v);
    return (n >= 0 ? '+' : '') + n.toFixed(2);
  }

  function _writeBanner(sph, cyl) {
    const value = document.getElementById('selected-cell-coords');
    const meta = document.getElementById('selected-cell-meta');
    if (value) value.textContent = _fmt(sph) + ' × ' + _fmt(cyl);
    if (meta) {
      const variant = (window.LensInv.variants || []).find(v => v.id === window.LensInv.variantId);
      const diameter = (variant && (variant.diameter_mm || variant.diameter)) || null;
      if (diameter) {
        meta.textContent = 'קוטר: ' + diameter + 'mm';
      } else if (variant && variant.display_id) {
        meta.textContent = variant.display_id + ' · n=' + (variant.refractive_index || '—');
      } else {
        meta.textContent = '';
      }
    }
  }

  function _writeStats(sph, cyl) {
    const statsRow = document.getElementById('stock-target-row');
    const stockEl = document.getElementById('stat-stock-value');
    const targetInput = document.getElementById('target-input');
    const hintEl = document.getElementById('cell-status-hint');
    const qtyControls = document.getElementById('qty-controls');
    const qtyDisplay = document.getElementById('qty-display');
    if (!statsRow) return;

    const key = Number(sph) + '|' + (cyl === '' || cyl == null ? '' : Number(cyl));
    let qty = 0;
    (window.LensInv.stockRows || []).forEach(r => {
      const k = (r.sph == null ? '' : Number(r.sph)) + '|' + (r.cyl == null ? '' : Number(r.cyl));
      if (k === key) qty += (r.qty_on_hand || 0);
    });
    let target = 0;
    (window.LensInv.targets || []).forEach(r => {
      const k = (r.sph == null ? '' : Number(r.sph)) + '|' + (r.cyl == null ? '' : Number(r.cyl));
      if (k === key) target += (r.target_qty || r.target || 0);
    });

    if (stockEl) stockEl.textContent = String(qty);
    if (targetInput) targetInput.value = target;
    statsRow.style.display = 'flex';

    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.classList.remove('hint-over', 'hint-low', 'hint-out', 'hint-on-target', 'hint-no-target');
      if (target === 0 && qty === 0) {
        hintEl.classList.add('hint-no-target');
        hintEl.textContent = '• ללא יעד';
      } else if (target > 0 && qty === 0) {
        hintEl.classList.add('hint-out');
        hintEl.textContent = '🔴 אזל מהמלאי (יעד ' + target + ')';
      } else if (qty < target) {
        hintEl.classList.add('hint-low');
        hintEl.textContent = '🟡 חסר ' + (target - qty) + ' לתואם ליעד';
      } else if (qty === target && target > 0) {
        hintEl.classList.add('hint-on-target');
        hintEl.textContent = '✓ תואם ליעד';
      } else if (qty > target) {
        hintEl.classList.add('hint-over');
        hintEl.textContent = '✓ עודף ' + (qty - target) + ' מעל היעד';
      } else {
        hintEl.style.display = 'none';
      }
    }
    if (qtyControls) qtyControls.style.display = 'flex';
    if (qtyDisplay) qtyDisplay.textContent = String(qty);
  }

  async function showLotsFor(sph, cyl) {
    const cont = document.getElementById('lot-container');
    if (!cont) return;
    cont.innerHTML = '<div class="empty-state">טוען חבילות…</div>';
    _writeBanner(sph, cyl);
    _writeStats(sph, cyl);

    try {
      const lots = await fetchAll('stock_lot', [
        ['variant_id', 'eq', window.LensInv.variantId],
        ['is_deleted', 'eq', false],
      ]);
      window.LensInv.lots = lots || [];
      renderLots(lots, sph, cyl);
    } catch (err) {
      console.error('[lens-inventory] lot load failed', err);
      cont.innerHTML = '<div class="empty-state">שגיאה בטעינת חבילות</div>';
    }
  }

  function renderLots(lots, sph, cyl) {
    const cont = document.getElementById('lot-container');
    if (!cont) return;
    if (!lots || !lots.length) {
      cont.innerHTML = '<div class="empty-state">אין חבילות מלאי לוריאציה זו</div>';
      return;
    }

    // Filter to this cell + sort FIFO (received_at asc)
    const matchSph = (sph === '' || sph == null) ? null : Number(sph);
    const matchCyl = (cyl === '' || cyl == null) ? null : Number(cyl);
    let cellLots = lots.filter(l => {
      const lsph = l.sph == null ? null : Number(l.sph);
      const lcyl = l.cyl == null ? null : Number(l.cyl);
      const sphMatch = (matchSph === null) ? true : (lsph === matchSph);
      const cylMatch = (matchCyl === null) ? true : (lcyl === matchCyl);
      return sphMatch && cylMatch && (l.qty_remaining || 0) > 0;
    });
    cellLots.sort((a, b) => new Date(a.received_at || 0) - new Date(b.received_at || 0));

    if (!cellLots.length) {
      cont.innerHTML = '<div class="empty-state">אין חבילות במלאי בתא זה</div>';
      return;
    }

    // SPEC M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION Round 1 mockup: 5 columns
    // (אצווה, נכנס, מחיר מכירה, עלות (gated), נותר). The עלות column carries
    // .col-permission-gated + data-permission="inventory.view_cost_price" — hidden
    // by PermissionUI for users without the key. F-5 RESOLUTION (SPEC 5,
    // M1_LENS_PRICING_REBUILD 2026-05-17): sell-price column now wired to
    // LensPriceResolver.resolveMany() — replaces the prior '—' placeholder
    // with the live effective_price value (per lot's supplier_offering_id).
    let html = '<table class="lots-table">' +
      '<thead><tr>' +
        '<th>אצווה</th>' +
        '<th>נכנס</th>' +
        '<th>מחיר מכירה</th>' +
        '<th class="col-permission-gated" data-permission="inventory.view_cost_price">עלות</th>' +
        '<th>נותר</th>' +
      '</tr></thead><tbody>';
    cellLots.forEach((lot, idx) => {
      const lotNumber = lot.lot_number || lot.id.substring(0, 8);
      const qtyRemaining = lot.qty_remaining || 0;
      const cost = lot.unit_cost ? (Number(lot.unit_cost).toFixed(0)) : '—';
      const cur = lot.unit_cost_currency === 'USD' ? '$' : '₪';
      const received = lot.received_at ? new Date(lot.received_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : '—';
      const fifoTag = idx === 0 ? '<span class="fifo-tag">FIFO #1</span>' : '';
      // Sell-price cell: render placeholder; async resolver below replaces it.
      // data-sell-price-lot attribute lets the post-render fill target this cell.
      html += '<tr data-lot-id="' + escapeHtml(lot.id) + '">' +
        '<td>' + fifoTag + escapeHtml(lotNumber) + '</td>' +
        '<td>' + escapeHtml(received) + '</td>' +
        '<td data-sell-price-lot="' + escapeHtml(lot.id) + '">—</td>' +
        '<td class="col-permission-gated" data-permission="inventory.view_cost_price">' + escapeHtml(cur + cost) + '</td>' +
        '<td><strong>' + escapeHtml(String(qtyRemaining)) + '</strong></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    cont.innerHTML = html;
    // Re-scan permission gates for the freshly-rendered table.
    if (window.PermissionUI && typeof window.PermissionUI.applyTo === 'function') {
      try { window.PermissionUI.applyTo(cont); } catch (_) {}
    }
    // F-5: async resolve sell-prices via shared LensPriceResolver (SPEC 5).
    _resolveSellPrices(cellLots, cont);
  }

  // F-5 helper — collect distinct supplier_offering_id values from the rendered
  // lots, call LensPriceResolver.resolveMany() once, then fill the sell-price
  // cells in the DOM. On error or null result, the '—' placeholder remains.
  function _resolveSellPrices(cellLots, contRoot) {
    if (!window.LensPriceResolver || typeof window.LensPriceResolver.resolveMany !== 'function') {
      console.warn('[lens-inventory-lot-pane] LensPriceResolver unavailable — sell-price stays as placeholder');
      return;
    }
    // Build a map of lot_id → offering_id (one offering per lot).
    const lotToOffering = new Map();
    const offeringIds = [];
    cellLots.forEach(l => {
      if (l.supplier_offering_id) {
        lotToOffering.set(l.id, l.supplier_offering_id);
        if (offeringIds.indexOf(l.supplier_offering_id) === -1) offeringIds.push(l.supplier_offering_id);
      }
    });
    if (!offeringIds.length) return;
    const tid = getTenantId();
    if (!tid) return;
    window.LensPriceResolver.resolveMany(offeringIds, tid).then(priceMap => {
      // priceMap: offering_id → numeric | null
      lotToOffering.forEach((offeringId, lotId) => {
        const price = priceMap.get(offeringId);
        if (price == null) return; // leave '—' placeholder
        const cell = contRoot.querySelector('[data-sell-price-lot="' + CSS.escape(lotId) + '"]');
        if (cell) cell.textContent = '₪' + Number(price).toFixed(0);
      });
    }).catch(err => {
      console.warn('[lens-inventory-lot-pane] sell-price resolve batch failed:', err.message || err);
    });
  }

  window.LensInvLots = { showLotsFor, renderLots };
})();
