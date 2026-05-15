// lens-goods-receipt-pre-fill.js — handles ?variant_id=<uuid>&t=<slug> deep-link from Inventory ➕
// Stores the variant_id in window.LensGR.deepLinkVariantId for use after supplier load.

(function () {
  'use strict';

  function applyDeepLinkIfPresent() {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('variant_id');
    if (!vid) return;
    window.LensGR.deepLinkVariantId = vid;
    // Surface a hint Toast so the user knows the variant was carried over.
    if (window.Toast) Toast.success('המסך נפתח מקישור מהיר. וריאנט: ' + vid.slice(0, 8) + '…  בחר ספק כדי לטעון הזמנות פתוחות.');
    // After supplier picks, lines.js loads expected lines; we can scroll to the matching row.
    // This Day-1 implementation surfaces the variant_id; full pre-select requires the lines
    // to be rendered — handled by an event hook on the lines render.
    // Implementation: a setTimeout retry that scrolls to the first row matching variant_id.
    let tries = 0;
    const tick = setInterval(function () {
      tries++;
      if (tries > 60) { clearInterval(tick); return; }
      const c = document.getElementById('lines-container');
      if (!c) return;
      const rows = c.querySelectorAll('tr');
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.innerHTML.indexOf(vid.slice(0, 8)) !== -1) {
          r.style.outline = '2px solid #6d28d9';
          r.scrollIntoView({ behavior: 'smooth', block: 'center' });
          clearInterval(tick);
          return;
        }
      }
    }, 500);
  }

  window.LensGRPreFill = { applyDeepLinkIfPresent };
})();
