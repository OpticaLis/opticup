// lens-pricing-stats.js — 4 stat cards (StatCardRow shared component).
// M1_LENS_PRICING_REBUILD (2026-05-17). Cards:
//   1. הצעות מסחר פעילות   (active offerings count)
//   2. ממתינים לאישור        (pending overlays count) — pending variant
//   3. שכבות מחיר פעילות    (active overlays count)
//   4. וריאנטים בקטלוג       (variants total) — disabled variant

(function () {
  'use strict';

  function _buildCards() {
    const offerings    = window.LensPricing.offerings || [];
    const variants     = window.LensPricing.variants  || [];
    const overlays     = window.LensPricing.overlays  || [];
    const pendingCount = (window.LensPricing.pendingOverlays || []).length;
    const activeOverlays = overlays.filter(o => o.status === 'active').length;
    return [
      { id: 'offerings', label: 'הצעות מסחר פעילות', value: offerings.length, sub: 'בקטלוג הנוכחי', variant: 'active' },
      { id: 'pending',   label: 'ממתינים לאישור',     value: pendingCount,     sub: 'הצעות שינוי מחיר', variant: 'pending' },
      { id: 'overlays',  label: 'שכבות מחיר פעילות',  value: activeOverlays,   sub: 'הנחות + מבצעים',  variant: 'default' },
      { id: 'variants',  label: 'וריאנטים בקטלוג',    value: variants.length,  sub: 'אינדקס × קוטר × ציפוי', variant: 'disabled' }
    ];
  }

  function init() {
    const mount = document.getElementById('lens-pricing-stats-mount');
    if (!mount || !window.StatCardRow) return;
    if (window.LensPricing.statCards) try { window.LensPricing.statCards.destroy(); } catch (_) {}
    window.LensPricing.statCards = window.StatCardRow.init(mount, {
      cards: _buildCards(),
      columns: 4,
      onCardClick: function (cardId) {
        if (cardId === 'pending') window.LensPricing.setActiveTab('pending');
      }
    });
  }

  function refresh() { init(); }

  window.LensPricingStats = { init, refresh };
})();
