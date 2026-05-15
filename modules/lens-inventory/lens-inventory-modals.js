// lens-inventory-modals.js — ➕➖ display-only stub modals
// Per SPEC §2 + D-M1-03: in Phase 1B-foundation the ➕➖ buttons are display-only.
// Clicking shows a message explaining that stock changes happen via Goods Receipt
// (sibling SPEC M1_LENS_PHASE_1B_PROCUREMENT will wire them).

(function () {
  'use strict';

  function showStockMovementStub(action) {
    // action: 'add' | 'reduce'
    const title = action === 'add' ? 'הוספת מלאי' : 'הורדת מלאי';
    const body = action === 'add'
      ? 'בשלב זה (Phase 1B foundation) הוספת מלאי מתבצעת רק דרך מסך "קבלת סחורה". המסך הזה מציג בלבד.'
      : 'בשלב זה (Phase 1B foundation) הורדת מלאי מתבצעת רק דרך זרימת מכירה / החזרה. המסך הזה מציג בלבד.';

    if (window.Modal && typeof Modal.show === 'function') {
      Modal.show({
        title: title,
        size: 'sm',
        body: '<div style="padding:16px; line-height:1.6; font-size:14px;">' + escapeHtml(body) + '</div>',
        buttons: [
          { label: 'הבנתי', cssClass: 'btn btn-primary', onClick: function () { Modal.close(); } },
        ],
      });
    } else {
      // Modal not loaded — fall back to a console message (no window.alert per Phase 1A G-4).
      console.warn('[lens-inventory] Modal not loaded; stub message:', body);
    }
  }

  window.LensInvModals = { showStockMovementStub };
})();
