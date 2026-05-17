// lens-inventory-quick-scan.js — DEPRECATED stub (M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION 2026-05-17)
//
// The original Phase C C-C3 "Quick Scan drawer" (right-side slide-in with its
// own barcode lookup + direct stock write via _submitAddStock) was retired per
// Brief decision #9 (Quick Receipt drawer = SOLE inventory-entry path). The
// `#drawer-quick-scan` markup it relied on has been removed from the partial.
//
// This stub remains so that:
//   1. The inventory-shell-lens.js script-loader list does not error
//      (entry: 'modules/lens-inventory/lens-inventory-quick-scan.js').
//   2. Any vestigial caller (e.g. legacy URL or stale chip) still gets a
//      working entry point — calls are redirected to the new shared
//      QuickReceiptDrawer instance at window.LensInv.quickReceiptDrawer.
//
// Future cleanup: delete this file + remove it from inventory-shell-lens.js
// in a follow-up M1 maintenance SPEC.

(function () {
  'use strict';

  function open() {
    if (window.LensInv && window.LensInv.quickReceiptDrawer
        && typeof window.LensInv.quickReceiptDrawer.open === 'function') {
      window.LensInv.quickReceiptDrawer.open();
      return;
    }
    if (window.Toast) Toast.error('טיוטת קבלה לא מוכנה — נסה שוב מאוחר יותר');
  }
  function close() {
    if (window.LensInv && window.LensInv.quickReceiptDrawer
        && typeof window.LensInv.quickReceiptDrawer.close === 'function') {
      window.LensInv.quickReceiptDrawer.close();
    }
  }
  function attach() { /* no-op — new drawer attaches its own handlers */ }

  window.LensInvQuickScan = { open: open, close: close, attach: attach };
})();
