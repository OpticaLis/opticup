// shipments-manifest.js — Print-friendly manifest for shipment boxes
// Uses window.print() with @media print CSS (in shipments.html)

function printManifest(box, items) {
  if (!box) return;

  // Remove old print container if exists
  var old = document.getElementById('manifest-print');
  if (old) old.remove();

  var typeMap = ENUM_REV.shipment_type || {};
  var catMap = ENUM_REV.shipment_category || {};
  var typeHe = typeMap[box.shipment_type] || box.shipment_type;
  var dest = box.supplier?.name || box.customer_name || '—';
  var courierStr = (box.courier?.name || '—') + (box.tracking_number ? ' — ' + box.tracking_number : '');
  var packerName = box.packer?.name || '—';
  var dateStr = fmtDateManifest(box.packed_at);

  var html = '<div class="manifest-page">';

  // Header
  html += '<div class="manifest-header">' +
    '<div class="manifest-title">Optic Up — רשימת תכולה</div>' +
    '</div>';

  // Box info
  html += '<div class="manifest-info">' +
    '<div class="manifest-info-row"><span class="manifest-label">ארגז:</span> ' + escapeHtml(box.box_number) + '</div>' +
    '<div class="manifest-info-row"><span class="manifest-label">תאריך:</span> ' + dateStr + '</div>' +
    '<div class="manifest-info-row"><span class="manifest-label">סוג:</span> ' + escapeHtml(typeHe) + '</div>' +
    '<div class="manifest-info-row"><span class="manifest-label">יעד:</span> ' + escapeHtml(dest) + '</div>' +
    '<div class="manifest-info-row"><span class="manifest-label">שליחויות:</span> ' + escapeHtml(courierStr) + '</div>' +
    '<div class="manifest-info-row"><span class="manifest-label">אורז:</span> ' + escapeHtml(packerName) + '</div>' +
    '</div>';

  // Items table
  html += '<table class="manifest-table"><thead><tr>' +
    '<th>#</th><th>הזמנה</th><th>לקוח</th><th>קטגוריה</th><th>ברקוד</th><th>הערות</th>' +
    '</tr></thead><tbody>';

  if (items && items.length) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var catHe = catMap[it.category] || it.category || '—';
      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + escapeHtml(it.order_number || '—') + '</td>' +
        '<td>' + escapeHtml(it.customer_name || '—') + '</td>' +
        '<td>' + escapeHtml(catHe) + '</td>' +
        '<td>' + escapeHtml(it.barcode || '—') + '</td>' +
        '<td>' + escapeHtml(it.notes || '') + '</td>' +
        '</tr>';
    }
  }

  html += '</tbody></table>';

  // Totals
  html += '<div class="manifest-total">סה"כ פריטים: ' + (items ? items.length : 0) + '</div>';

  // Signature
  html += '<div class="manifest-signature">' +
    '<div class="manifest-sig-row"><span class="manifest-label">חתימת מקבל:</span> <span class="manifest-sig-line"></span></div>' +
    '<div class="manifest-sig-row"><span class="manifest-label">תאריך קבלה:</span> <span class="manifest-sig-line"></span></div>' +
    '</div>';

  html += '</div>'; // .manifest-page

  // Create container and inject
  var container = document.createElement('div');
  container.id = 'manifest-print';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Print and cleanup
  var cleanup = function() {
    var el = document.getElementById('manifest-print');
    if (el) el.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  setTimeout(function() { window.print(); }, 100);
}

function fmtDateManifest(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    d.getFullYear() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}
