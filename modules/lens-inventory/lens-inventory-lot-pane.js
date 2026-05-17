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
    // by PermissionUI for users without the key. מחיר מכירה is computed via the
    // effective_price RPC in a future SPEC; here it shows the stock_lot's unit_cost
    // marked-up placeholder OR "—" when offering/overlay lookup is not done yet.
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
      // Placeholder for sell_price — effective_price RPC integration deferred to SPEC 5.
      const sellPrice = '—';
      const received = lot.received_at ? new Date(lot.received_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : '—';
      const fifoTag = idx === 0 ? '<span class="fifo-tag">FIFO #1</span>' : '';
      html += '<tr>' +
        '<td>' + fifoTag + escapeHtml(lotNumber) + '</td>' +
        '<td>' + escapeHtml(received) + '</td>' +
        '<td>' + escapeHtml(sellPrice) + '</td>' +
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
  }

  window.LensInvLots = { showLotsFor, renderLots };
})();
