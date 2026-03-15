// shipments-items-table.js — Items table with accordion expand/collapse
window._expandedItemIdx = -1;

function renderItemsTable() {
  var ws = window._wizardState;
  var el = $('wiz-items-table');
  if (!el || !ws) return;

  if (!ws.items.length) {
    el.innerHTML = '<div class="wiz-note">טרם נוספו פריטים</div>';
    return;
  }

  var html = '<div class="wiz-items-count">' + ws.items.length + ' פריטים</div>';
  html += '<div class="wiz-items-list">';

  for (var i = 0; i < ws.items.length; i++) {
    var it = ws.items[i];
    var isExpanded = (window._expandedItemIdx === i);
    var linked = it.return_item_id ? ' wiz-item-linked' : '';

    // Summary row
    html += '<div class="wiz-item-row' + linked + (isExpanded ? ' expanded' : '') +
      '" onclick="toggleItemAccordion(' + i + ')">';
    html += '<span class="wiz-item-num">' + (i + 1) + '</span>';
    if (it.return_item_id) html += '<span class="wiz-link-icon" title="מקושר לזיכוי">&#128279;</span>';
    html += '<span class="wiz-item-col">' + escapeHtml(itemMainId(it, ws.type)) + '</span>';
    html += '<span class="wiz-item-col">' + escapeHtml(itemCatLabel(it.category)) + '</span>';
    html += '<button class="wiz-item-del" onclick="event.stopPropagation();removeItem(' + i + ')" title="הסר">&#10005;</button>';
    html += '</div>';

    // Detail row (accordion)
    html += '<div class="wiz-item-detail' + (isExpanded ? ' open' : '') + '">';
    html += buildDetailContent(it, ws.type);
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function toggleItemAccordion(idx) {
  if (window._expandedItemIdx === idx) {
    window._expandedItemIdx = -1;
  } else {
    window._expandedItemIdx = idx;
  }
  renderItemsTable();
}

function itemMainId(item, type) {
  if (item.barcode) return item.barcode;
  if (item.order_number) return item.order_number;
  if (item.customer_name) return item.customer_name;
  if (item.brand) return (item.brand || '') + ' ' + (item.model || '');
  return '—';
}

function itemCatLabel(catKey) {
  if (!catKey) return '—';
  return getCategoryLabel(catKey);
}

function buildDetailContent(item, type) {
  var rows = [];
  var fields = [
    { key: 'order_number', label: 'מס\' הזמנה' },
    { key: 'customer_name', label: 'שם לקוח' },
    { key: 'customer_number', label: 'מס\' לקוח' },
    { key: 'barcode', label: 'ברקוד' },
    { key: 'brand', label: 'מותג' },
    { key: 'model', label: 'דגם' },
    { key: 'size', label: 'גודל' },
    { key: 'color', label: 'צבע' },
    { key: 'category', label: 'קטגוריה' },
    { key: 'unit_cost', label: 'מחיר' }
  ];

  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var val = item[f.key];
    if (!val && val !== 0) continue;
    // Skip hidden fields from config
    if (['order_number','customer_name','customer_number','barcode','category','notes'].indexOf(f.key) >= 0) {
      if (getFieldConfig(type, f.key) === 'hidden') continue;
    }
    var display = val;
    if (f.key === 'category') display = getCategoryLabel(val);
    else if (f.key === 'unit_cost') display = formatILS(val);
    rows.push('<span class="detail-label">' + f.label + ':</span> ' + escapeHtml(String(display)));
  }

  // Notes / custom fields
  var notesContent = parseItemNotes(item);
  if (notesContent.text) {
    rows.push('<span class="detail-label">הערות:</span> ' + escapeHtml(notesContent.text));
  }
  for (var ci = 1; ci <= 3; ci++) {
    var c = notesContent['custom_' + ci];
    if (c) {
      rows.push('<span class="detail-label">' + escapeHtml(c.label) + ':</span> ' + escapeHtml(c.value));
    }
  }

  if (!rows.length) return '<div class="detail-row">אין פרטים נוספים</div>';
  return rows.map(function(r) { return '<div class="detail-row">' + r + '</div>'; }).join('');
}

function parseItemNotes(item) {
  var result = { text: null };
  var notes = item.notes || item._notesText;
  if (!notes) return result;
  try {
    var parsed = JSON.parse(notes);
    if (typeof parsed === 'object' && parsed !== null) {
      result.text = parsed._text || null;
      for (var ci = 1; ci <= 3; ci++) {
        if (parsed['custom_' + ci]) result['custom_' + ci] = parsed['custom_' + ci];
      }
      return result;
    }
  } catch (e) { /* not JSON */ }
  result.text = notes;
  return result;
}
