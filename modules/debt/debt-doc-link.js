// =========================================================
// debt-doc-link.js — Document linking: invoice↔delivery notes (Phase 4d+8)
// Load after: debt-documents.js
// Provides: openLinkDeliveryNotesModal() (invoice→notes, link+unlink flow),
//   openLinkToInvoiceModal() (legacy note→invoice), linkDeliveryToInvoice(),
//   _renderLinkSummary(), _toggleAllLinkNotes(), _updateLinkNotesSum(), _linkSelectedNotes()
// =========================================================

function openLinkToInvoiceModal(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;

  var typeMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  var invoices = _docData.filter(function(d) {
    return d.supplier_id === doc.supplier_id &&
      (typeMap[d.document_type_id] || {}).code === 'invoice' &&
      d.status !== 'cancelled' && d.id !== docId;
  });

  var invOpts = invoices.map(function(inv) {
    return '<option value="' + inv.id + '">' + escapeHtml(inv.document_number) +
      ' (' + formatILS(inv.total_amount) + ')</option>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'link-doc-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:400px">' +
      '<h3 style="margin:0 0 14px">קשר תעודת משלוח לחשבונית</h3>' +
      '<div id="link-doc-alert"></div>' +
      '<p style="font-size:.9rem;color:var(--g600)">תעודת משלוח: <strong>' +
        escapeHtml(doc.document_number) + '</strong> — ' + formatILS(doc.total_amount) + '</p>' +
      '<label>חשבונית' +
        '<select id="link-invoice-id" style="width:100%;padding:6px" onchange="_renderLinkSummary(this.value)">' +
          '<option value="">בחר חשבונית...</option>' + invOpts +
        '</select>' +
      '</label>' +
      '<div id="link-summary" style="margin-top:10px;font-size:.88rem"></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'link-doc-modal\')">ביטול</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="linkDeliveryToInvoice(\'' + docId + '\')">קשר</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function _renderLinkSummary(invoiceId) {
  var el = $('link-summary');
  if (!el) return;
  if (!invoiceId) { el.innerHTML = ''; return; }
  try {
    var inv = _docData.find(function(d) { return d.id === invoiceId; });
    if (!inv) { el.innerHTML = ''; return; }
    var invTotal = Number(inv.total_amount) || 0;
    var links = await fetchAll(T.DOC_LINKS, [['parent_document_id', 'eq', invoiceId]]);
    var linkedSum = links.reduce(function(s, l) {
      var amount = Number(l.amount_on_invoice) || 0;
      if (amount > 0) return s + amount;
      // Fallback: look up child document total
      var child = _docData.find(function(d) { return d.id === l.child_document_id; });
      return s + (child ? (Number(child.total_amount) || 0) : 0);
    }, 0);
    var line = '\u05E1\u05D4"\u05DB \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05DE\u05E7\u05D5\u05E9\u05E8\u05D5\u05EA: ' +
      formatILS(linkedSum) + ' \u05DE\u05EA\u05D5\u05DA ' + formatILS(invTotal);
    var diff = invTotal - linkedSum;
    var status = '';
    if (linkedSum > invTotal) {
      status = '<div style="color:var(--error);margin-top:4px">\u26A0\uFE0F \u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05E2\u05D5\u05D3\u05D5\u05EA (' +
        formatILS(linkedSum) + ') \u05D2\u05D1\u05D5\u05D4 \u05DE\u05E1\u05DB\u05D5\u05DD \u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA (' + formatILS(invTotal) + ')</div>';
    } else if (Math.abs(diff) < 0.01) {
      status = '<div style="color:var(--success, #155724);margin-top:4px">\u2705 \u05E1\u05DB\u05D5\u05DD \u05EA\u05D5\u05D0\u05DD</div>';
    } else {
      status = '<div style="color:var(--g600);margin-top:4px">\uD83D\uDCCB \u05E0\u05D5\u05EA\u05E8 ' + formatILS(diff) + ' \u05DC\u05E7\u05D9\u05E9\u05D5\u05E8</div>';
    }
    el.innerHTML = '<div style="padding:8px;background:var(--g50, #f8f9fa);border-radius:6px">' + line + status + '</div>';
  } catch (e) {
    console.warn('_renderLinkSummary error:', e);
    el.innerHTML = '';
  }
}

// =========================================================
// AI: Extract delivery note references from OCR data
// =========================================================
function _extractDeliveryNoteRefs(ocrData, notes) {
  if (!ocrData || !notes.length) return {};
  var matched = {};
  // Build search corpus from OCR data
  var corpus = '';
  try {
    var fv = function(f) { var v = ocrData[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
    // Check explicit delivery_notes / reference_numbers fields
    var refs = fv('delivery_notes') || fv('reference_numbers') || fv('delivery_note_numbers') || '';
    if (Array.isArray(refs)) corpus += refs.join(' ');
    else if (refs) corpus += String(refs);
    // Check items for references in descriptions
    var items = fv('items') || [];
    if (Array.isArray(items)) items.forEach(function(it) {
      corpus += ' ' + (it.description || '') + ' ' + (it.reference || '') + ' ' + (it.note_number || '');
    });
    // Check raw_text / notes field
    corpus += ' ' + (fv('raw_text') || '') + ' ' + (fv('notes') || '');
  } catch (e) { return matched; }
  if (!corpus.trim()) return matched;
  // Match each note's document_number in corpus
  notes.forEach(function(n) {
    var num = (n.document_number || '').trim();
    if (!num) return;
    // Try exact match and stripped variants
    var variants = [num];
    var digits = num.replace(/\D/g, '');
    if (digits && digits !== num) variants.push(digits);
    // Also try without common prefixes (DN-, ת.מ-, etc.)
    var stripped = num.replace(/^(DN-?|ת\.?מ\.?-?|תמ-?)/i, '').trim();
    if (stripped && stripped !== num) variants.push(stripped);
    for (var i = 0; i < variants.length; i++) {
      if (variants[i].length >= 2 && corpus.indexOf(variants[i]) !== -1) {
        matched[n.id] = true; break;
      }
    }
  });
  return matched;
}

// =========================================================
// Link delivery notes TO an invoice (reversed flow — Phase 8+)
// =========================================================
async function openLinkDeliveryNotesModal(invoiceId) {
  var inv = _docData.find(function(d) { return d.id === invoiceId; });
  if (!inv) return;
  var typeMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  var supName = ''; _docSuppliers.forEach(function(s) { if (s.id === inv.supplier_id) supName = s.name; });

  showLoading('\u05D8\u05D5\u05E2\u05DF \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA...');
  // Fetch linked IDs + OCR data in parallel
  var linkedIds = {}, aiMatched = {};
  try {
    var [links, ocrRows] = await Promise.all([
      fetchAll(T.DOC_LINKS, [['parent_document_id', 'eq', invoiceId]]),
      sb.from('ocr_extractions').select('extracted_data').eq('supplier_document_id', invoiceId)
        .eq('tenant_id', getTenantId()).limit(1).then(function(r) { return r.data || []; })
    ]);
    links.forEach(function(l) { linkedIds[l.child_document_id] = true; });
    // AI matching from OCR data
    var linkableCodes = { delivery_note: true, return_note: true };
    if (ocrRows.length && ocrRows[0].extracted_data) {
      var notes_for_match = _docData.filter(function(d) {
        return d.supplier_id === inv.supplier_id &&
          linkableCodes[(typeMap[d.document_type_id] || {}).code] &&
          d.status !== 'cancelled' && !linkedIds[d.id];
      });
      aiMatched = _extractDeliveryNoteRefs(ocrRows[0].extracted_data, notes_for_match);
    }
  } catch (e) { console.warn('link/OCR fetch error:', e); }
  hideLoading();

  // Include BOTH unlinked notes AND already-linked notes (for unlinking)
  var linkableCodes2 = { delivery_note: true, return_note: true };
  var notes = _docData.filter(function(d) {
    var code = (typeMap[d.document_type_id] || {}).code;
    return d.supplier_id === inv.supplier_id &&
      linkableCodes2[code] &&
      d.status !== 'cancelled';
  });
  // Store linked IDs on window for _linkSelectedNotes to reference
  window._linkOriginalLinkedIds = Object.assign({}, linkedIds);
  var aiCount = Object.keys(aiMatched).length;
  var invTotal = Number(inv.total_amount) || 0;
  var aiBadge = '<span style="background:#8b5cf6;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;margin-right:4px">\uD83E\uDD16 AI</span>';
  var linkBadge = '<span style="color:#2563eb;font-size:11px;margin-right:3px">\uD83D\uDD17</span>';

  var noteRows = notes.map(function(n) {
    var isLinked = !!linkedIds[n.id];
    var isAi = !isLinked && !!aiMatched[n.id];
    var code = (typeMap[n.document_type_id] || {}).code;
    var isReturn = code === 'return_note';
    var typeIcon = isReturn ? '\u21A9\uFE0F ' : '\uD83D\uDCE6 ';
    var amt = Number(n.total_amount) || 0;
    var signedAmt = isReturn ? -amt : amt;
    var bgStyle = isLinked ? ' style="background:#eff6ff"' : (isAi ? ' style="background:#f5f3ff"' : '');
    var checked = isLinked || isAi ? ' checked' : '';
    return '<tr' + bgStyle + '><td><input type="checkbox" class="link-note-cb" data-id="' + n.id +
      '" data-amt="' + signedAmt + '" data-was-linked="' + (isLinked ? '1' : '0') + '"' + checked +
      ' onchange="_updateLinkNotesSum(\'' + invoiceId + '\')"></td>' +
      '<td>' + (isLinked ? linkBadge : '') + (isAi ? aiBadge : '') + typeIcon + escapeHtml(n.document_number || '') + '</td>' +
      '<td>' + escapeHtml(n.document_date || '') + '</td>' +
      '<td' + (isReturn ? ' style="color:#e74c3c"' : '') + '>' + (isReturn ? '-' : '') + formatILS(amt) + '</td></tr>';
  }).join('');
  if (!noteRows) noteRows = '<tr><td colspan="4" style="text-align:center;color:var(--g500);padding:12px">\u05D0\u05D9\u05DF \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DC\u05E7\u05D9\u05E9\u05D5\u05E8</td></tr>';

  var aiInfo = aiCount > 0 ? '<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:.82rem;color:#6d28d9">' +
    '\uD83E\uDD16 AI \u05DE\u05E6\u05D0 ' + aiCount + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05EA\u05D5\u05D0\u05DE\u05D5\u05EA</div>' : '';

  var m = document.createElement('div');
  m.id = 'link-notes-modal'; m.className = 'modal-overlay'; m.style.display = 'flex';
  m.onclick = function(e) { if (e.target === m) m.remove(); };
  m.innerHTML =
    '<div class="modal" style="max-width:550px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<h3 style="margin:0 0 8px">\u05E7\u05E9\u05E8 \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05D5\u05D4\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</h3>' +
      '<div style="font-size:.88rem;color:var(--g600);margin-bottom:8px">' +
        '\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA: <strong>' + escapeHtml(inv.document_number || '') + '</strong> | ' +
        '\u05E1\u05E4\u05E7: <strong>' + escapeHtml(supName) + '</strong> | ' +
        '\u05E1\u05DB\u05D5\u05DD: <strong>' + formatILS(invTotal) + '</strong></div>' +
      aiInfo +
      '<div id="link-notes-alert"></div>' +
      (notes.length ? '<label style="font-size:.82rem;display:flex;align-items:center;gap:4px;margin-bottom:6px;cursor:pointer">' +
        '<input type="checkbox" id="link-notes-all" onchange="_toggleAllLinkNotes(\'' + invoiceId + '\')">\u05D1\u05D7\u05E8 \u05D4\u05DB\u05DC</label>' : '') +
      '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.85rem"><thead>' +
        '<tr><th style="width:30px"></th><th>\u05DE\u05E1\u05E4\u05E8</th><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05DB\u05D5\u05DD</th></tr></thead>' +
        '<tbody>' + noteRows + '</tbody></table></div>' +
      '<div id="link-notes-sum" style="margin-top:8px;font-size:.88rem;padding:8px;background:var(--g50,#f8f9fa);border-radius:6px"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'link-notes-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        (notes.length ? '<button class="btn" style="background:#059669;color:#fff" onclick="_linkSelectedNotes(\'' + invoiceId + '\')">\u05E7\u05E9\u05E8</button>' : '') +
      '</div></div>';
  document.body.appendChild(m);
  _updateLinkNotesSum(invoiceId);
}

function _toggleAllLinkNotes(invoiceId) {
  var all = $('link-notes-all');
  var checked = all ? all.checked : false;
  document.querySelectorAll('.link-note-cb').forEach(function(cb) { cb.checked = checked; });
  _updateLinkNotesSum(invoiceId);
}

function _updateLinkNotesSum(invoiceId) {
  var inv = _docData.find(function(d) { return d.id === invoiceId; });
  var invTotal = inv ? (Number(inv.total_amount) || 0) : 0;
  var sum = 0, count = 0, unlinkCount = 0;
  document.querySelectorAll('.link-note-cb:checked').forEach(function(cb) {
    sum += Number(cb.getAttribute('data-amt')) || 0; count++;
  });
  // Count notes being unlinked (were linked, now unchecked)
  document.querySelectorAll('.link-note-cb').forEach(function(cb) {
    if (cb.getAttribute('data-was-linked') === '1' && !cb.checked) unlinkCount++;
  });
  var el = $('link-notes-sum'); if (!el) return;
  var diff = invTotal - sum;
  var clr = count === 0 ? 'var(--g500)' : Math.abs(diff) < 0.01 ? '#27ae60' : sum > invTotal ? '#e74c3c' : '#f59e0b';
  var icon = count === 0 ? '' : Math.abs(diff) < 0.01 ? '\u2705 ' : sum > invTotal ? '\u26A0\uFE0F ' : '\uD83D\uDCCB ';
  var unlinkWarn = unlinkCount > 0 ? '<div style="color:#e74c3c;font-size:.82rem;margin-top:4px">\u26A0\uFE0F ' +
    unlinkCount + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05D9\u05E0\u05D5\u05EA\u05E7\u05D5 \u05DE\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</div>' : '';
  el.innerHTML = '<span style="color:' + clr + '">' + icon + '\u05E0\u05D1\u05D7\u05E8\u05D5: ' + count + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA — ' +
    formatILS(sum) + ' \u05DE\u05EA\u05D5\u05DA ' + formatILS(invTotal) +
    (count > 0 && Math.abs(diff) >= 0.01 ? ' (\u05E0\u05D5\u05EA\u05E8 ' + formatILS(diff) + ')' : '') + '</span>' + unlinkWarn;
}

async function _linkSelectedNotes(invoiceId) {
  var originalLinked = window._linkOriginalLinkedIds || {};
  var newLinkIds = [], unlinkIds = [], keepLinkedIds = [];
  document.querySelectorAll('.link-note-cb').forEach(function(cb) {
    var nId = cb.getAttribute('data-id');
    var wasLinked = cb.getAttribute('data-was-linked') === '1';
    if (cb.checked && !wasLinked) newLinkIds.push(nId);
    else if (!cb.checked && wasLinked) unlinkIds.push(nId);
    else if (cb.checked && wasLinked) keepLinkedIds.push(nId);
  });
  if (!newLinkIds.length && !unlinkIds.length) {
    setAlert('link-notes-alert', '\u05DC\u05D0 \u05D1\u05D5\u05E6\u05E2\u05D5 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD', 'w'); return;
  }
  showLoading('\u05DE\u05E7\u05E9\u05E8...');
  try {
    // Unlink: delete document_links + reopen status
    if (unlinkIds.length) {
      for (var u = 0; u < unlinkIds.length; u++) {
        await sb.from(T.DOC_LINKS).delete()
          .eq('parent_document_id', invoiceId)
          .eq('child_document_id', unlinkIds[u])
          .eq('tenant_id', getTenantId());
      }
      var reopenUpdates = unlinkIds.map(function(nId) { return { id: nId, status: 'open' }; });
      await batchUpdate(T.SUP_DOCS, reopenUpdates);
      await writeLog('doc_unlink_batch', null, {
        reason: '\u05E0\u05D5\u05EA\u05E7\u05D5 ' + unlinkIds.length + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA',
        invoice_id: invoiceId, unlinked_notes: unlinkIds
      });
    }
    // Link new notes
    if (newLinkIds.length) {
      var linkRows = newLinkIds.map(function(nId) {
        var note = _docData.find(function(d) { return d.id === nId; });
        return { parent_document_id: invoiceId, child_document_id: nId,
          amount_on_invoice: note ? (Number(note.total_amount) || 0) : 0 };
      });
      await batchCreate(T.DOC_LINKS, linkRows);
      var linkUpdates = newLinkIds.map(function(nId) { return { id: nId, status: 'linked' }; });
      await batchUpdate(T.SUP_DOCS, linkUpdates);
      await writeLog('doc_link_batch', null, {
        reason: '\u05E7\u05D5\u05E9\u05E8\u05D5 ' + newLinkIds.length + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA',
        invoice_id: invoiceId, linked_notes: newLinkIds
      });
    }
    closeAndRemoveModal('link-notes-modal');
    var msgs = [];
    if (newLinkIds.length) msgs.push('\u05E7\u05D5\u05E9\u05E8\u05D5 ' + newLinkIds.length);
    if (unlinkIds.length) msgs.push('\u05E0\u05D5\u05EA\u05E7\u05D5 ' + unlinkIds.length);
    toast(msgs.join(', ') + ' \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA');
    await loadDocumentsTab();
  } catch (e) {
    console.error('_linkSelectedNotes error:', e);
    setAlert('link-notes-alert', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + escapeHtml(e.message), 'e');
  } finally { hideLoading(); }
}

async function linkDeliveryToInvoice(deliveryNoteId) {
  var invoiceId = ($('link-invoice-id') || {}).value;
  if (!invoiceId) { setAlert('link-doc-alert', '\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA', 'e'); return; }

  showLoading('\u05DE\u05E7\u05E9\u05E8...');
  try {
    await batchCreate(T.DOC_LINKS, [{
      parent_document_id: invoiceId,
      child_document_id: deliveryNoteId
    }]);
    await batchUpdate(T.SUP_DOCS, [{ id: deliveryNoteId, status: 'linked' }]);
    await writeLog('doc_link', null, {
      reason: '\u05EA\u05E2\u05D5\u05D3\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05E7\u05D5\u05E9\u05E8\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA',
      source_ref: deliveryNoteId
    });

    closeAndRemoveModal('link-doc-modal');
    toast('\u05EA\u05E2\u05D5\u05D3\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05E7\u05D5\u05E9\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadDocumentsTab();
  } catch (e) {
    console.error('linkDeliveryToInvoice error:', e);
    setAlert('link-doc-alert', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}
