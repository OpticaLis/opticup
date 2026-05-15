// lens-goods-receipt-shipping-box.js — optional M9 shipping_box link field
// M9 not built — populates an empty/disabled select with a placeholder option.
// When M9 ships, this file fetches the box list and binds the change handler.

(function () {
  'use strict';

  function bind() {
    const sel = document.getElementById('gr-m9-box');
    if (!sel) return;
    // Day-1: leave as no-options. The "אין קישור" default option already covers most use.
    // Explicitly grey out the field.
    sel.disabled = false; // selectable but only shows the empty option
  }

  window.LensGRShippingBox = { bind };
})();
