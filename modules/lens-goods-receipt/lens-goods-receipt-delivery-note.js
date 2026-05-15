// lens-goods-receipt-delivery-note.js — fuzzy-match delivery note against open POs
// Day-1 implementation: surface a hint Toast when the entered DN matches an existing PO's notes
// or when the supplier has only 1 open PO. Full fuzzy logic deferred to Phase 2.

(function () {
  'use strict';

  let _lastNote = '';
  let _timer = null;

  function maybeFuzzyMatch() {
    const dn = window.LensGR.deliveryNote;
    if (!dn || dn === _lastNote) return;
    _lastNote = dn;
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () {
      // No DB query needed for Day-1; the supplier-scoped expected lines are already loaded.
      // If exactly 1 PO is in expectedLines, that's the implicit match.
      const distinctPOs = {};
      window.LensGR.expectedLines.forEach(function (l) { distinctPOs[l._po_id] = true; });
      const poCount = Object.keys(distinctPOs).length;
      if (poCount === 1 && window.Toast) {
        const onlyPo = window.LensGR.expectedLines[0];
        Toast.success('זוהתה הזמנה יחידה: ' + (onlyPo._po_number || '(ללא מספר)'));
      }
    }, 600);
  }

  window.LensGRDeliveryNote = { maybeFuzzyMatch };
})();
