// lens-purchase-order-pdf.js — browser-side PDF export via window.print()
// Per Brief Q2 recommendation + locked decision #3: vanilla window.print + print stylesheet.
// The print stylesheet lives in lens-purchase-order.html @media print {...} block.

(function () {
  'use strict';

  function exportPDF() {
    const lines = window.LensPO.lines.filter(function (l) { return !l._removed; });
    if (lines.length === 0) {
      if (window.Toast) Toast.warn ? Toast.warn('אין שורות להדפסה') : Toast.error('אין שורות להדפסה');
      return;
    }
    // Set page title temporarily so the PDF saves with a meaningful filename.
    const originalTitle = document.title;
    const supplierLabel = (window.LensPO.supplierRow && window.LensPO.supplierRow.name) || 'supplier';
    const poLabel = window.LensPO.poNumber || 'draft';
    document.title = 'PO_' + supplierLabel + '_' + poLabel;
    setTimeout(function () { window.print(); }, 50);
    setTimeout(function () { document.title = originalTitle; }, 5000);
    if (typeof writeLog === 'function') {
      writeLog('lens.po.pdf_exported', null, { po_id: window.LensPO.poId || null, line_count: lines.length });
    }
  }

  window.LensPOPdf = { exportPDF };
})();
