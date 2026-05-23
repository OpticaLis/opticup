/* ============================================================
   M5 Customer Card — Tab 2 (Vision Function) — STUB per D-T2.
   v_customer_vision_function_history NOT deployed (M6 follow-up).
   ZERO DB calls — verifiable via Chrome MCP network panel.
   Single panel, click anywhere → showComingSoon('vision_function').
   ============================================================ */
(function () {
  'use strict';

  window.renderTabVision = function (pane /*, S */) {
    pane.innerHTML =
      '<div class="cust-stub-panel" data-coming-soon="vision_function" role="button" tabindex="0">' +
        '<h3>תפקודי ראייה</h3>' +
        '<p>' + escapeHtml(window.COMING_SOON_LABEL || 'בקרוב') +
          ' (' + escapeHtml((window.COMING_SOON_REGISTRY && window.COMING_SOON_REGISTRY.vision_function) || 'M6') + ')' +
        '</p>' +
        '<p style="margin-top:14px;font-size:11px;">' +
          'בדיקות-תפקוד מקיפות (24 בדיקות — ortho, AC/A, NRA, PRA, Stereopsis וכו\') ' +
          'יוצגו כאן ברגע ש-M6 ישלים את <code>v_customer_vision_function_history</code>.' +
        '</p>' +
      '</div>';
  };

  window.mountTabVision = function (pane /*, S */) {
    // Single click anywhere on the panel → coming-soon toast.
    pane.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });
  };
})();
