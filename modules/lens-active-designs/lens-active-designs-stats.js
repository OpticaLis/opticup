// lens-active-designs-stats.js — 4 stat cards via StatCardRow (SPEC 2 shared component)
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17) Commit 3.
//
// Cards per mockup:
//   1. סדרות פעילות         (active variants)  — green variant, "מתוך N בקטלוג"
//   2. וריאנטים פעילים     (active variants)
//   3. סדרות פרטיות שלי     (private series)   — info variant (blue), tenant-owned brands
//   4. סדרות שעוד לא בחרת   (unselected)       — disabled variant, "זמינים להפעלה"
//
// Values come from window.LensAD.stats (populated by tree.js recomputeStats()).

(function () {
  'use strict';

  function _buildCards() {
    const s = window.LensAD.stats || { activeDesigns: 0, activeVariants: 0, privateSeries: 0, unselected: 0, totalDesigns: 0 };
    return [
      {
        id: 'active-designs',
        label: 'סדרות פעילות',
        value: s.activeDesigns,
        sub: 'מתוך ' + s.totalDesigns + ' בקטלוג',
        variant: 'active'
      },
      {
        id: 'active-variants',
        label: 'וריאנטים פעילים',
        value: s.activeVariants,
        sub: '(אינדקס × קוטר × ציפוי)',
        variant: 'default'
      },
      {
        id: 'private-series',
        label: 'סדרות פרטיות שלי',
        value: s.privateSeries,
        sub: 'ייבוא עצמי / ספקים ידניים',
        variant: 'sent'    // blue accent per mockup
      },
      {
        id: 'unselected',
        label: 'סדרות שעוד לא בחרת',
        value: s.unselected,
        sub: 'זמינים להפעלה',
        variant: 'disabled'
      }
    ];
  }

  function init() {
    const mount = document.getElementById('lens-ad-stats-mount');
    if (!mount || !window.StatCardRow) {
      console.warn('[lens-ad-stats] mount or StatCardRow unavailable');
      return;
    }
    const instance = window.StatCardRow.init(mount, {
      cards: _buildCards(),
      columns: 4,
      onCardClick: function (cardId) {
        // Click-to-filter integration: map stat-card → status filter
        // (deferred: full click-filter wiring is a future micro-SPEC)
        if (cardId === 'active-designs')  window.LensADFilters.setStatus('active');
        if (cardId === 'unselected')      window.LensADFilters.setStatus('available');
        if (cardId === 'private-series')  window.LensADFilters.setStatus('private');
      }
    });
    window.LensAD.statCards = instance;
  }

  function refresh() {
    if (!window.LensAD.statCards) { init(); return; }
    // StatCardRow API doesn't expose a setCards() — destroy + re-init is the recompute path.
    const mount = document.getElementById('lens-ad-stats-mount');
    if (!mount) return;
    try { window.LensAD.statCards.destroy(); } catch (_) {}
    const instance = window.StatCardRow.init(mount, {
      cards: _buildCards(),
      columns: 4,
      onCardClick: function (cardId) {
        if (cardId === 'active-designs')  window.LensADFilters.setStatus('active');
        if (cardId === 'unselected')      window.LensADFilters.setStatus('available');
        if (cardId === 'private-series')  window.LensADFilters.setStatus('private');
      }
    });
    window.LensAD.statCards = instance;
  }

  window.LensADStats = { init, refresh };
})();
