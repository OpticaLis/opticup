// lens-inventory-lot-pane.js — right-side lot drill-down
// On cell click in the SPH×CYL grid, loads stock_lot rows for this variant
// + (optionally) filtered to lots whose qty_remaining > 0 at that sph/cyl.
// Pure read-only display.

(function () {
  'use strict';

  async function showLotsFor(sph, cyl) {
    const cont = document.getElementById('lot-container');
    cont.innerHTML = '<div class="empty-state">טוען חבילות…</div>';

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
    if (!lots.length) {
      cont.innerHTML = '<div class="empty-state">אין חבילות מלאי לוריאציה זו</div>';
      return;
    }

    const sphLabel = sph !== '' && sph != null ? (parseFloat(sph) >= 0 ? '+' + parseFloat(sph).toFixed(2) : parseFloat(sph).toFixed(2)) : '—';
    const cylLabel = cyl !== '' && cyl != null ? (parseFloat(cyl) >= 0 ? '+' + parseFloat(cyl).toFixed(2) : parseFloat(cyl).toFixed(2)) : '—';

    let html = '<div style="font-size:12px; color:#5d6d7e; margin-bottom:8px;">SPH ' + escapeHtml(sphLabel) +
               ' / CYL ' + escapeHtml(cylLabel) + '</div>';

    lots.forEach(lot => {
      const lotNumber = lot.lot_number || lot.id.substring(0, 8);
      const qtyRemaining = lot.qty_remaining || 0;
      const qtyReceived = lot.qty_received || 0;
      const cost = lot.unit_cost ? Number(lot.unit_cost).toFixed(2) : '—';
      const cur = lot.unit_cost_currency || 'ILS';
      const received = lot.received_at ? new Date(lot.received_at).toLocaleDateString('he-IL') : '—';
      html += '<div class="lot-row">' +
              '<div><strong>חבילה #' + escapeHtml(lotNumber) + '</strong></div>' +
              '<div class="lot-meta">נותר: ' + escapeHtml(String(qtyRemaining)) +
              ' / התקבל: ' + escapeHtml(String(qtyReceived)) + '</div>' +
              '<div class="lot-meta">עלות: ' + escapeHtml(cost) + ' ' + escapeHtml(cur) + '</div>' +
              '<div class="lot-meta">תאריך: ' + escapeHtml(received) + '</div>' +
              '</div>';
    });

    cont.innerHTML = html;
  }

  window.LensInvLots = { showLotsFor, renderLots };
})();
