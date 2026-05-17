// lens-active-designs-detail.js — side detail panel via SideDetailPanel (SPEC 2 shared component).
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17) Commit 5.
//
// Shown when the user clicks a design row in the catalog table. Renders 2 cards:
//   1. Series details (key/value rows + variants table + per-location toggles + "open in inventory" link)
//   2. Activate-all / Deactivate-all bulk actions for ALL offerings of the selected design
//
// Wires LensADToggle.toggleMany() for the bulk actions.

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _renderDetailsBody(design) {
    const brands = window.LensAD.brands || [];
    const brand = brands.find(b => b.id === design.brand_id) || { name: '—' };
    const variants = window.LensAD.variantsByDesign.get(design.id) || [];
    const offerings = window.LensAD.offeringsByDesign.get(design.id) || [];
    const activeOfferingIds = new Set(
      (window.LensAD.activeOfferings || []).filter(a => a.is_active).map(a => a.offering_id)
    );
    const activeCount = offerings.filter(o => activeOfferingIds.has(o.id)).length;

    let html = '';
    html += '<div class="lens-ad-detail-row"><span class="key">מותג</span><span class="val">' + _esc(brand.name) + '</span></div>';
    html += '<div class="lens-ad-detail-row"><span class="key">סוג עדשה</span><span class="val">' + _esc(design.lens_type || '—') + '</span></div>';
    html += '<div class="lens-ad-detail-row"><span class="key">חומר</span><span class="val">' + _esc(design.material || '—') + '</span></div>';
    html += '<div class="lens-ad-detail-row"><span class="key">וריאנטים</span><span class="val">' + _esc(variants.length) + '</span></div>';
    html += '<div class="lens-ad-detail-row"><span class="key">הצעות ספק</span><span class="val">' + _esc(offerings.length) + '</span></div>';
    html += '<div class="lens-ad-detail-row"><span class="key">פעיל אצלי</span><span class="val" style="color:' + (activeCount > 0 ? '#0e7a6a' : '#95a5a6') + ';">' + _esc(activeCount) + ' מתוך ' + _esc(offerings.length) + '</span></div>';

    if (variants.length) {
      html += '<h4 style="font-size:13px; color:#2c3e50; margin-top:16px; margin-bottom:8px;">וריאנטים זמינים (' + _esc(variants.length) + ')</h4>';
      html += '<table style="width:100%; font-size:11px; border-collapse:collapse;">';
      html += '<thead><tr style="background:#f8f9fb;"><th style="padding:6px; text-align:right;">Index</th><th style="padding:6px; text-align:right;">קוטר</th><th style="padding:6px; text-align:right;">ציפוי</th></tr></thead>';
      html += '<tbody>';
      variants.slice(0, 12).forEach(v => {
        html += '<tr><td style="padding:6px; border-top:1px solid #ecf0f1;">' + _esc(v.refractive_index || '—') + '</td>' +
                '<td style="padding:6px; border-top:1px solid #ecf0f1;">' + _esc(v.diameter_mm ? v.diameter_mm + 'mm' : '—') + '</td>' +
                '<td style="padding:6px; border-top:1px solid #ecf0f1;">' + _esc(v.coating || '—') + '</td></tr>';
      });
      if (variants.length > 12) {
        html += '<tr><td colspan="3" style="padding:6px; text-align:center; color:#95a5a6;">+ ' + _esc(variants.length - 12) + ' נוספים</td></tr>';
      }
      html += '</tbody></table>';
    }

    return { html: html };
  }

  function _renderBulkActions(designId) {
    return { html:
      '<div class="lens-ad-bulk-actions">' +
        '<button type="button" class="btn" data-bulk-action="activate-all"   data-design-id="' + _esc(designId) + '">✓ הפעל את כל הוריאנטים</button>' +
        '<button type="button" class="btn" data-bulk-action="deactivate-all" data-design-id="' + _esc(designId) + '">⛔ בטל את כל הוריאנטים</button>' +
      '</div>'
    };
  }

  function _attachBulkHandlers() {
    const mount = document.getElementById('lens-ad-side-detail-mount');
    if (!mount || mount.dataset.bulkWired === '1') return;
    mount.dataset.bulkWired = '1';
    mount.addEventListener('click', async function (e) {
      const btn = e.target && e.target.closest && e.target.closest('[data-bulk-action]');
      if (!btn) return;
      const action = btn.dataset.bulkAction;
      const designId = btn.dataset.designId;
      if (!designId) return;
      const offerings = window.LensAD.offeringsByDesign.get(designId) || [];
      if (!offerings.length) {
        if (window.Toast) Toast.warning('אין הצעות ספק לסדרה זו');
        return;
      }
      const makeActive = (action === 'activate-all');
      btn.disabled = true;
      try {
        await window.LensADToggle.toggleMany(offerings.map(o => o.id), makeActive);
        if (window.Toast) Toast.success(makeActive ? 'כל הוריאנטים הופעלו' : 'כל הוריאנטים בוטלו');
        await window.LensAD.refreshAll();
      } catch (err) {
        console.error('[lens-ad-detail] bulk action failed', err);
        if (window.Toast) Toast.error('שגיאה: ' + (err.message || err));
      } finally {
        btn.disabled = false;
      }
    });
  }

  function show(designId) {
    const design = (window.LensAD.designs || []).find(d => d.id === designId);
    if (!design) return;
    window.LensAD.selectedDesignId = designId;
    const mount = document.getElementById('lens-ad-side-detail-mount');
    if (!mount || !window.SideDetailPanel) return;

    // Destroy previous instance + re-init for new design
    if (window.LensAD.sidePanel) {
      try { window.LensAD.sidePanel.destroy(); } catch (_) {}
    }
    const instance = window.SideDetailPanel.init(mount, {
      title: 'פרטי סדרה: ' + design.name,
      headerVariant: 'gold',
      sections: [
        { id: 'details', body: _renderDetailsBody(design) },
        { id: 'bulk',    title: 'פעולות מרובות', body: _renderBulkActions(designId) }
      ]
    });
    window.LensAD.sidePanel = instance;
    _attachBulkHandlers();
  }

  function refreshSelected() {
    if (window.LensAD.selectedDesignId) show(window.LensAD.selectedDesignId);
  }

  function init() {
    // Row-click → show() is wired by lens-active-designs-table.js _attachToggleHandler.
    // We just register the namespace + bulk handlers (which re-attach idempotently).
    _attachBulkHandlers();
  }

  window.LensADDetail = { init, show, refreshSelected };
})();
