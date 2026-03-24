// debt-doc-items.js — Editable document items (OCR items + manual items)
// Load after: debt-doc-edit.js, supabase-ops.js
// Provides: _buildEditableItemsHtml(), _edItemCalcRow(), _edItemAddRow(),
//   _edItemRemoveRow(), _edItemRecalcTotal(), _gatherEditedItems(),
//   _saveEditedItems()

// =========================================================
// Build editable items table HTML from OCR extraction data
// =========================================================
function _buildEditableItemsHtml(ocrItems, docId) {
  var rows = '';
  if (Array.isArray(ocrItems) && ocrItems.length) {
    rows = ocrItems.map(function(it, i) {
      var disc = it.discount || 0;
      var total = it.total || ((it.quantity || 0) * (it.unit_price || 0) * (1 - disc / 100));
      return _edItemRowHtml(i, it.description || '', it.quantity || '', it.unit_price || '', disc, total);
    }).join('');
  }

  return '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<strong style="font-size:.88rem">\uD83D\uDCCB \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD</strong>' +
      '<button class="btn btn-sm" style="background:var(--primary,#1a73e8);color:#fff" ' +
        'onclick="_edItemAddRow()">+ \u05D4\u05D5\u05E1\u05E3 \u05E9\u05D5\u05E8\u05D4</button>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="data-table" style="width:100%;font-size:.82rem">' +
        '<thead><tr>' +
          '<th>\u05EA\u05D9\u05D0\u05D5\u05E8</th><th style="width:60px">\u05DB\u05DE\u05D5\u05EA</th>' +
          '<th style="width:80px">\u05DE\u05D7\u05D9\u05E8</th><th style="width:60px">% \u05D4\u05E0\u05D7\u05D4</th>' +
          '<th style="width:80px">\u05E1\u05D4"\u05DB</th><th style="width:30px"></th>' +
        '</tr></thead>' +
        '<tbody id="ed-items-body">' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div id="ed-items-total" style="text-align:left;font-size:.85rem;font-weight:600;margin-top:6px;color:var(--g600)"></div>' +
  '</div>';
}

// Single item row HTML
function _edItemRowHtml(idx, desc, qty, price, disc, total) {
  var s = 'padding:4px;border:1px solid var(--g300);border-radius:3px;font-size:.82rem;width:100%;box-sizing:border-box;font-family:inherit';
  return '<tr>' +
    '<td><input class="ed-itm" data-f="description" value="' + escapeHtml(String(desc)) + '" style="' + s + '"></td>' +
    '<td><input type="number" class="ed-itm" data-f="quantity" value="' + (qty || '') + '" step="1" min="0" style="' + s + '" oninput="_edItemCalcRow(this)"></td>' +
    '<td><input type="number" class="ed-itm" data-f="unit_price" value="' + (price || '') + '" step="0.01" style="' + s + '" oninput="_edItemCalcRow(this)"></td>' +
    '<td><input type="number" class="ed-itm" data-f="discount" value="' + (disc || 0) + '" step="0.01" min="0" max="100" style="' + s + '" oninput="_edItemCalcRow(this)"></td>' +
    '<td><input type="number" class="ed-itm" data-f="total" value="' + (Number(total) || 0).toFixed(2) + '" step="0.01" style="' + s + ';font-weight:600"></td>' +
    '<td><button class="btn-sm" style="background:#ef4444;color:#fff;font-size:.7rem;padding:2px 5px" onclick="_edItemRemoveRow(this)">\u2716</button></td>' +
  '</tr>';
}

// Auto-calc item row total: qty × price × (1 - discount/100)
function _edItemCalcRow(inp) {
  var row = inp.closest('tr'); if (!row) return;
  var v = function(f) { return Number(row.querySelector('[data-f="' + f + '"]').value) || 0; };
  var t = row.querySelector('[data-f="total"]');
  if (t) t.value = (v('quantity') * v('unit_price') * (1 - v('discount') / 100)).toFixed(2);
  _edItemRecalcTotal();
}

// Add empty item row
function _edItemAddRow() {
  var tbody = $('ed-items-body'); if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend', _edItemRowHtml(tbody.rows.length, '', '', '', 0, 0));
}

// Remove item row
function _edItemRemoveRow(btn) {
  var row = btn.closest('tr'); if (row) row.remove();
  _edItemRecalcTotal();
}

// Recalculate items total and update the subtotal field
function _edItemRecalcTotal() {
  var tbody = $('ed-items-body'); if (!tbody) return;
  var sum = 0;
  for (var i = 0; i < tbody.rows.length; i++) {
    var t = tbody.rows[i].querySelector('[data-f="total"]');
    sum += Number(t ? t.value : 0) || 0;
  }
  var el = $('ed-items-total');
  if (el) el.textContent = '\u05E1\u05D4"\u05DB \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD: \u20AA' + sum.toFixed(2);
  // Also update the document subtotal field if items sum > 0
  if (sum > 0 && $('ed-subtotal')) {
    $('ed-subtotal').value = sum.toFixed(2);
    _editDocCalc();
  }
}

// Gather all edited items from the table
function _gatherEditedItems() {
  var tbody = $('ed-items-body'); if (!tbody) return [];
  var items = [];
  for (var i = 0; i < tbody.rows.length; i++) {
    var it = {};
    tbody.rows[i].querySelectorAll('.ed-itm').forEach(function(inp) {
      it[inp.getAttribute('data-f')] = inp.value;
    });
    if (it.description || it.quantity) items.push(it);
  }
  return items;
}

// Save edited items to ocr_extractions.extracted_data.items
async function _saveEditedItems(docId) {
  var items = _gatherEditedItems();
  try {
    var { data: ocrRows } = await sb.from(T.OCR_EXTRACTIONS)
      .select('id, extracted_data')
      .eq('supplier_document_id', docId)
      .eq('tenant_id', getTenantId())
      .limit(1);
    if (ocrRows && ocrRows.length) {
      // Update existing extraction with new items
      var ext = ocrRows[0].extracted_data || {};
      ext.items = items;
      await batchUpdate(T.OCR_EXTRACTIONS, [{ id: ocrRows[0].id, extracted_data: ext }]);
    } else if (items.length) {
      // No existing extraction — create one to store manual items
      await batchCreate(T.OCR_EXTRACTIONS, [{
        tenant_id: getTenantId(),
        supplier_document_id: docId,
        status: 'manual',
        extracted_data: { items: items },
        confidence_score: 1.0
      }]);
    }
  } catch (e) {
    console.warn('_saveEditedItems error:', e.message);
  }
}

// Build read-only receipt items HTML (not editable)
function _buildReceiptItemsHtml(rcptItems) {
  if (!rcptItems || !rcptItems.length) return '';
  var riRows = rcptItems
    .filter(function(ri) {
      return ri.po_match_status !== 'returned' &&
             ri.po_match_status !== 'not_received' &&
             ri.receipt_status !== 'not_received';
    })
    .map(function(ri) {
      var lineTotal = ((ri.unit_cost || 0) * (ri.quantity || 0)).toFixed(2);
      return '<tr>' +
        '<td>' + escapeHtml(ri.barcode || '') + '</td>' +
        '<td>' + escapeHtml(ri.brand || '') + '</td>' +
        '<td>' + escapeHtml(ri.model || '') + '</td>' +
        '<td style="text-align:center">' + (ri.quantity || 0) + '</td>' +
        '<td style="text-align:center">' + (ri.unit_cost != null ? Number(ri.unit_cost).toFixed(2) : '') + '</td>' +
        '<td style="text-align:center">' + lineTotal + '</td></tr>';
    }).join('');
  if (!riRows) return '';
  return '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
    '<strong style="font-size:.88rem">\u{1F4E6} \u05E4\u05E8\u05D9\u05D8\u05D9 \u05E7\u05D1\u05DC\u05D4</strong>' +
    '<div style="font-size:.78rem;color:var(--g500);margin:2px 0 6px">\u05E4\u05E8\u05D9\u05D8\u05D9 \u05E7\u05D1\u05DC\u05D4 \u2014 \u05DC\u05D0 \u05E0\u05D9\u05EA\u05E0\u05D9\u05DD \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4</div>' +
    '<table class="data-table" style="width:100%;font-size:.82rem"><thead><tr>' +
    '<th>\u05D1\u05E8\u05E7\u05D5\u05D3</th><th>\u05DE\u05D5\u05EA\u05D2</th><th>\u05D3\u05D2\u05DD</th>' +
    '<th>\u05DB\u05DE\u05D5\u05EA</th><th>\u05DE\u05D7\u05D9\u05E8</th><th>\u05E1\u05D4"\u05DB</th>' +
    '</tr></thead><tbody>' + riRows + '</tbody></table></div>';
}
