/* group-header-row.js — Source-band group header row for tables
   ============================================================================
   Renders a <tr> that spans all columns and visually bands a group of rows
   by source-type (purple = custom-for-customer, blue = stock/shortage,
   amber = manual). Used in 2 mockups (PO + GR).

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #5). Pairs with the data-table extensions (shared/js/table-builder.js) and
   the source-band CSS in shared/css/table.css.

   API:
     // Returns an HTMLTableRowElement (caller appends to tbody)
     GroupHeaderRow.render({
       sourceType: 'purple' | 'blue' | 'amber',
       label: 'Stock / חוסרים',
       count: 14,
       colSpan: 8,
       icon?: '📦'
     }) → HTMLTableRowElement

     // For string-html consumers (e.g., legacy table renderers):
     GroupHeaderRow.toHtml({...}) → '<tr class="..."><td>...</td></tr>'

   Deps: shared/css/table.css extensions (`.tb-group-header*` rules).
   ============================================================================ */

(function () {
  'use strict';

  var VALID_TYPES = { purple: 1, blue: 1, amber: 1 };

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _normalizeType(t) {
    return VALID_TYPES[t] ? t : 'blue';
  }

  function render(config) {
    var type     = _normalizeType(config && config.sourceType);
    var label    = (config && config.label)    || '';
    var count    = (config && config.count != null) ? config.count : null;
    var colSpan  = (config && config.colSpan)  || 1;
    var icon     = (config && config.icon)     || '';

    var tr = document.createElement('tr');
    tr.className = 'tb-group-header tb-group-header-' + type;
    tr.setAttribute('data-source-type', type);

    var td = document.createElement('td');
    td.colSpan = colSpan;
    td.className = 'tb-group-header-cell';

    // textContent + DOM nodes only — no innerHTML with user input
    var inner = document.createElement('div');
    inner.className = 'tb-group-header-inner';

    if (icon) {
      var iconEl = document.createElement('span');
      iconEl.className = 'tb-group-header-icon';
      iconEl.textContent = icon;
      inner.appendChild(iconEl);
    }

    var labelEl = document.createElement('span');
    labelEl.className = 'tb-group-header-label';
    labelEl.textContent = label;
    inner.appendChild(labelEl);

    if (count != null) {
      var countEl = document.createElement('span');
      countEl.className = 'tb-group-header-count';
      countEl.textContent = '(' + count + ')';
      inner.appendChild(countEl);
    }

    td.appendChild(inner);
    tr.appendChild(td);
    return tr;
  }

  function toHtml(config) {
    var type     = _normalizeType(config && config.sourceType);
    var label    = (config && config.label)    || '';
    var count    = (config && config.count != null) ? config.count : null;
    var colSpan  = (config && config.colSpan)  || 1;
    var icon     = (config && config.icon)     || '';

    var html = '<tr class="tb-group-header tb-group-header-' + type + '"' +
               ' data-source-type="' + type + '">' +
               '<td colspan="' + colSpan + '" class="tb-group-header-cell">' +
               '<div class="tb-group-header-inner">';
    if (icon) html += '<span class="tb-group-header-icon">' + _esc(icon) + '</span>';
    html += '<span class="tb-group-header-label">' + _esc(label) + '</span>';
    if (count != null) html += '<span class="tb-group-header-count">(' + _esc(count) + ')</span>';
    html += '</div></td></tr>';
    return html;
  }

  window.GroupHeaderRow = { render: render, toHtml: toHtml };
})();
