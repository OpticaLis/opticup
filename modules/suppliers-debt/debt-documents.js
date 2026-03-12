// debt-documents.js — Documents tab for supplier debt (Phase 4d)
// Load after: shared.js, supabase-ops.js, debt-dashboard.js
// Provides: loadDocumentsTab(), openNewDocumentModal(),
//   closeAndRemoveModal(), calcNewDocTotal(), viewDocument()
// Link flow: see debt-doc-link.js
let _docData = [], _docTypes = [], _docSuppliers = [];
const DOC_STATUS_MAP = {
  open:            { he: 'פתוח',        cls: 'dst-open' },
  partially_paid:  { he: 'שולם חלקית',  cls: 'dst-partial' },
  paid:            { he: 'שולם',        cls: 'dst-paid' },
  linked:          { he: 'מקושר',       cls: 'dst-linked' },
  cancelled:       { he: 'מבוטל',       cls: 'dst-cancel' }
};

// --- Load + render ---
async function loadDocumentsTab() {
  const tid = getTenantId();
  if (!tid) return;
  showLoading('טוען מסמכים...');
  try {
    const [docs, types, sups] = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false]]),
      fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]),
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]])
    ]);
    _docData = docs;
    _docTypes = types;
    _docSuppliers = sups;
    renderDocFilterBar();
    applyDocFilters();
  } catch (e) {
    console.error('loadDocumentsTab error:', e);
    toast('שגיאה בטעינת מסמכים', 'e');
  } finally {
    hideLoading();
  }
}

// --- Filter bar ---
function renderDocFilterBar() {
  const container = $('dtab-documents');
  const supOpts = _docSuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  const typeOpts = _docTypes.map(function(t) {
    return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name_he) + '</option>';
  }).join('');

  container.innerHTML =
    '<div class="doc-toolbar">' +
      '<select id="doc-f-supplier" onchange="applyDocFilters()" class="doc-filter-input">' +
        '<option value="">כל הספקים</option>' + supOpts +
      '</select>' +
      '<select id="doc-f-type" onchange="applyDocFilters()" class="doc-filter-input">' +
        '<option value="">כל הסוגים</option>' + typeOpts +
      '</select>' +
      '<select id="doc-f-status" onchange="applyDocFilters()" class="doc-filter-input">' +
        '<option value="">הכל</option>' +
        '<option value="open">פתוח</option>' +
        '<option value="partially_paid">שולם חלקית</option>' +
        '<option value="paid">שולם</option>' +
        '<option value="linked">מקושר</option>' +
      '</select>' +
      '<input type="date" id="doc-f-from" onchange="applyDocFilters()" class="doc-filter-input">' +
      '<input type="date" id="doc-f-to" onchange="applyDocFilters()" class="doc-filter-input">' +
      '<label class="doc-cb-label">' +
        '<input type="checkbox" id="doc-f-overdue" onchange="applyDocFilters()"> באיחור בלבד' +
      '</label>' +
      '<button class="btn btn-s doc-add-btn" onclick="openNewDocumentModal()">+ מסמך חדש</button>' +
    '</div>' +
    '<div id="doc-table-wrap"></div>';
}

// --- Client-side filtering ---
function applyDocFilters() {
  var fSup    = ($('doc-f-supplier') || {}).value || '';
  var fType   = ($('doc-f-type') || {}).value || '';
  var fStatus = ($('doc-f-status') || {}).value || '';
  var fFrom   = ($('doc-f-from') || {}).value || '';
  var fTo     = ($('doc-f-to') || {}).value || '';
  var fOverdue = ($('doc-f-overdue') || {}).checked || false;
  var today = new Date().toISOString().slice(0, 10);

  var filtered = _docData.filter(function(d) {
    if (fSup && d.supplier_id !== fSup) return false;
    if (fType && d.document_type_id !== fType) return false;
    if (fStatus && d.status !== fStatus) return false;
    if (fFrom && d.document_date < fFrom) return false;
    if (fTo && d.document_date > fTo) return false;
    if (fOverdue) {
      if (!d.due_date || d.due_date >= today) return false;
      if (d.status === 'paid' || d.status === 'cancelled') return false;
    }
    return true;
  });

  // Sort by date descending
  filtered.sort(function(a, b) { return (b.document_date || '').localeCompare(a.document_date || ''); });
  renderDocumentsTable(filtered);
}

// --- Table rendering ---
function renderDocumentsTable(docs) {
  var wrap = $('doc-table-wrap');
  if (!wrap) return;
  if (!docs.length) {
    wrap.innerHTML = '<div class="empty-state">אין מסמכים להצגה</div>';
    return;
  }

  var typeMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  var supMap = {};
  _docSuppliers.forEach(function(s) { supMap[s.id] = s.name; });

  var rows = docs.map(function(d) {
    var type = typeMap[d.document_type_id] || {};
    var balance = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
    var st = DOC_STATUS_MAP[d.status] || { he: d.status, cls: '' };
    var isDeliveryNote = type.code === 'delivery_note';
    var linkBtn = (isDeliveryNote && d.status !== 'linked')
      ? ' <button class="btn-sm btn-lnk" onclick="openLinkToInvoiceModal(\'' + d.id + '\')">קשר לחשבונית</button>'
      : '';

    return '<tr>' +
      '<td>' + escapeHtml(d.document_date || '') + '</td>' +
      '<td>' + escapeHtml(type.name_he || '') + '</td>' +
      '<td>' + escapeHtml(d.document_number || '') + '</td>' +
      '<td>' + escapeHtml(d.internal_number || '') + '</td>' +
      '<td>' + escapeHtml(supMap[d.supplier_id] || '') + '</td>' +
      '<td>' + formatILS(d.total_amount) + '</td>' +
      '<td>' + formatILS(d.paid_amount) + '</td>' +
      '<td>' + formatILS(balance) + '</td>' +
      '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td>' +
        '<button class="btn-sm" onclick="viewDocument(\'' + d.id + '\')">צפה</button> ' +
        '<button class="btn-sm" onclick="switchDebtTab(\'payments\')">שלם</button>' +
        linkBtn +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr>' +
        '<th>תאריך</th><th>סוג</th><th>מספר</th><th>מספר פנימי</th><th>ספק</th>' +
        '<th>סכום</th><th>שולם</th><th>יתרה</th><th>סטטוס</th><th>פעולות</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

function viewDocument(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  alert('תצוגת מסמך מלאה תתווסף בשלב 4g\n\nמסמך: ' + (doc.document_number || doc.internal_number));
}

// --- New document modal ---
function openNewDocumentModal() {
  var supOpts = _docSuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  var typeOpts = _docTypes.map(function(t) {
    return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name_he) + '</option>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'new-doc-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:480px">' +
      '<h3 style="margin:0 0 14px">מסמך ספק חדש</h3>' +
      '<div id="new-doc-alert"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<label style="grid-column:1/-1">ספק<select id="nd-supplier" class="nd-field">' + supOpts + '</select></label>' +
        '<label>סוג מסמך<select id="nd-type" class="nd-field">' + typeOpts + '</select></label>' +
        '<label>מספר מסמך<input id="nd-number" class="nd-field" placeholder="מספר מסמך"></label>' +
        '<label>תאריך מסמך<input type="date" id="nd-date" class="nd-field"></label>' +
        '<label>תאריך תשלום<input type="date" id="nd-due" class="nd-field"></label>' +
        '<label>סכום לפני מע"מ<input type="number" id="nd-subtotal" step="0.01" min="0" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>% מע"מ<input type="number" id="nd-vat-rate" value="17" step="0.01" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>מע"מ<input type="number" id="nd-vat" readonly class="nd-field" style="background:var(--g100)"></label>' +
        '<label>סה"כ<input type="number" id="nd-total" readonly class="nd-field" style="background:var(--g100);font-weight:700"></label>' +
        '<label style="grid-column:1/-1">הערות<textarea id="nd-notes" rows="2" class="nd-field"></textarea></label>' +
      '</div>' +
      '<label style="display:block;margin-top:10px">קוד עובד (PIN)' +
        '<input type="password" id="nd-pin" maxlength="10" class="nd-field" inputmode="numeric">' +
      '</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn btn-g" onclick="closeAndRemoveModal(\'new-doc-modal\')">ביטול</button>' +
        '<button class="btn btn-s" onclick="saveNewDocument()">שמור</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  // Defaults
  $('nd-date').value = new Date().toISOString().slice(0, 10);
  var due = new Date();
  due.setDate(due.getDate() + 30);
  $('nd-due').value = due.toISOString().slice(0, 10);
}

function closeAndRemoveModal(id) {
  var el = $(id);
  if (el) el.remove();
}

function calcNewDocTotal() {
  var sub = Number(($('nd-subtotal') || {}).value) || 0;
  var rate = Number(($('nd-vat-rate') || {}).value) || 0;
  var vat = Math.round(sub * rate) / 100;
  if ($('nd-vat')) $('nd-vat').value = vat.toFixed(2);
  if ($('nd-total')) $('nd-total').value = (sub + vat).toFixed(2);
}

// --- Save new document ---
async function saveNewDocument() {
  var supplierId = ($('nd-supplier') || {}).value;
  var typeId     = ($('nd-type') || {}).value;
  var docNumber  = (($('nd-number') || {}).value || '').trim();
  var docDate    = ($('nd-date') || {}).value;
  var dueDate    = ($('nd-due') || {}).value;
  var subtotal   = Number(($('nd-subtotal') || {}).value) || 0;
  var vatRate    = Number(($('nd-vat-rate') || {}).value) || 0;
  var notes      = (($('nd-notes') || {}).value || '').trim();
  var pin        = (($('nd-pin') || {}).value || '').trim();

  if (!supplierId) { setAlert('new-doc-alert', 'יש לבחור ספק', 'e'); return; }
  if (!typeId)     { setAlert('new-doc-alert', 'יש לבחור סוג מסמך', 'e'); return; }
  if (!docNumber)  { setAlert('new-doc-alert', 'יש להזין מספר מסמך', 'e'); return; }
  if (!docDate)    { setAlert('new-doc-alert', 'יש להזין תאריך מסמך', 'e'); return; }
  if (subtotal <= 0) { setAlert('new-doc-alert', 'סכום חייב להיות חיובי', 'e'); return; }
  if (!pin)        { setAlert('new-doc-alert', 'יש להזין קוד עובד', 'e'); return; }

  // Duplicate check
  var dup = _docData.find(function(d) {
    return d.supplier_id === supplierId && d.document_number === docNumber && d.document_type_id === typeId;
  });
  if (dup) { setAlert('new-doc-alert', 'מסמך עם מספר זה כבר קיים לספק זה', 'e'); return; }

  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('new-doc-alert', 'קוד עובד שגוי', 'e'); return; }

  showLoading('שומר מסמך...');
  try {
    var internalNumber = await generateDocInternalNumber();
    var vatAmount = Math.round(subtotal * vatRate) / 100;
    var totalAmount = subtotal + vatAmount;

    await batchCreate(T.SUP_DOCS, [{
      supplier_id: supplierId,
      document_type_id: typeId,
      internal_number: internalNumber,
      document_number: docNumber,
      document_date: docDate,
      due_date: dueDate || null,
      subtotal: subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: 'ILS',
      status: 'open',
      notes: notes || null,
      created_by: emp.id
    }]);

    await writeLog('doc_create', null, {
      reason: 'מסמך ספק חדש — ' + docNumber,
      source_ref: internalNumber
    });

    closeAndRemoveModal('new-doc-modal');
    toast('מסמך נשמר בהצלחה');
    await loadDocumentsTab();
  } catch (e) {
    console.error('saveNewDocument error:', e);
    setAlert('new-doc-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

async function generateDocInternalNumber() {
  var res = await sb.from(T.SUP_DOCS)
    .select('internal_number')
    .eq('tenant_id', getTenantId())
    .like('internal_number', 'DOC-%')
    .order('internal_number', { ascending: false })
    .limit(1);
  var maxNum = 0;
  if (res.data && res.data[0] && res.data[0].internal_number) {
    var match = res.data[0].internal_number.match(/^DOC-(\d+)$/);
    if (match) maxNum = parseInt(match[1], 10);
  }
  return 'DOC-' + String(maxNum + 1).padStart(4, '0');
}

