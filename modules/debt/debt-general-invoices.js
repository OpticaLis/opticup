// debt-general-invoices.js — General invoices filter view (documents without supplier)
// Load after: debt-documents.js, debt-expense-folders.js
// Provides: toggleGeneralInvoicesView(), loadGeneralInvoices(), renderGeneralInvoices()

var _genInvActive = false;
var _genInvData = [];

// ── Toggle between all documents and general invoices ────────
function toggleGeneralInvoicesView() {
  _genInvActive = !_genInvActive;
  var btn = document.getElementById('gen-inv-toggle');
  if (btn) {
    btn.style.background = _genInvActive ? '#8b5cf6' : '#f3f4f6';
    btn.style.color = _genInvActive ? '#fff' : '#374151';
  }
  if (_genInvActive) {
    loadGeneralInvoices();
  } else {
    // Return to normal document view
    var container = document.getElementById('gen-inv-container');
    if (container) container.style.display = 'none';
    if (typeof applyDocFilters === 'function') applyDocFilters();
  }
}

// ── Load general invoices ───────────────────────────────────
async function loadGeneralInvoices(filters) {
  filters = filters || {};
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA...');
  try {
    var query = sb.from(T.SUP_DOCS).select('*')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false)
      .is('supplier_id', null)
      .order('created_at', { ascending: false });
    if (filters.folderId) query = query.eq('expense_folder_id', filters.folderId);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.month) {
      var start = filters.month + '-01';
      var end = filters.month + '-31';
      query = query.gte('document_date', start).lte('document_date', end);
    }
    var { data, error } = await query;
    if (error) throw error;
    _genInvData = data || [];
    // Load folders for display
    if (typeof loadExpenseFolders === 'function') await loadExpenseFolders();
    renderGeneralInvoices();
  } catch (e) {
    console.error('loadGeneralInvoices error:', e);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''));
  } finally { hideLoading(); }
}

// ── Render general invoices section ─────────────────────────
function renderGeneralInvoices() {
  var container = document.getElementById('gen-inv-container');
  if (!container) {
    // Create container inside documents tab
    var dtab = document.getElementById('dtab-documents');
    if (!dtab) return;
    container = document.createElement('div');
    container.id = 'gen-inv-container';
    dtab.insertBefore(container, dtab.firstChild);
  }
  container.style.display = 'block';

  var folders = typeof getExpenseFolders === 'function' ? getExpenseFolders() : [];
  var folderMap = {};
  (window._expenseFoldersCache || []).forEach(function(f) { folderMap[f.id] = f; });
  var types = (_docTypes || []);
  var typeMap = {};
  types.forEach(function(t) { typeMap[t.id] = t; });

  // Filter bar
  var folderOpts = '<option value="">\u05D4\u05DB\u05DC</option>' +
    folders.map(function(f) { return '<option value="' + f.id + '">' + escapeHtml((f.icon || '') + ' ' + f.name) + '</option>'; }).join('');
  var statusOpts = '<option value="all">\u05D4\u05DB\u05DC</option>' +
    '<option value="pending_invoice">\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05E9\u05D9\u05D5\u05DA</option>' +
    '<option value="open">\u05E4\u05EA\u05D5\u05D7</option>' +
    '<option value="paid">\u05E9\u05D5\u05DC\u05DD</option>' +
    '<option value="cancelled">\u05DE\u05D1\u05D5\u05D8\u05DC</option>';

  // Table rows
  var rows = _genInvData.map(function(d) {
    var type = typeMap[d.document_type_id] || {};
    var folder = folderMap[d.expense_folder_id] || null;
    var st = DOC_STATUS_MAP[d.status] || { he: d.status, cls: '' };
    var date = d.document_date ? new Date(d.document_date).toLocaleDateString('he-IL') : '\u2014';
    var amount = d.total_amount ? '\u20AA' + Number(d.total_amount).toLocaleString('he-IL', { minimumFractionDigits: 2 }) : '\u2014';
    return '<tr style="cursor:pointer" onclick="editDocument(\'' + d.id + '\')">' +
      '<td style="padding:6px 8px">' + escapeHtml(date) + '</td>' +
      '<td style="padding:6px 8px">' + escapeHtml(type.name_he || '\u2014') + '</td>' +
      '<td style="padding:6px 8px">' + escapeHtml(d.document_number || d.internal_number || '\u2014') + '</td>' +
      '<td style="padding:6px 8px">' + (folder ? escapeHtml((folder.icon || '') + ' ' + folder.name) : '<span style="color:var(--g400)">\u05DC\u05DC\u05D0</span>') + '</td>' +
      '<td style="padding:6px 8px;text-align:left;font-weight:600">' + amount + '</td>' +
      '<td style="padding:6px 8px"><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td style="padding:6px 8px">' +
        '<button class="btn btn-sm" style="background:#8b5cf6;color:#fff;font-size:11px" ' +
          'onclick="event.stopPropagation();assignToFolder(\'' + d.id + '\')">\uD83D\uDCC1</button></td>' +
    '</tr>';
  }).join('');
  if (!_genInvData.length) {
    rows = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">\u05D0\u05D9\u05DF \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA</td></tr>';
  }

  container.innerHTML =
    '<div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px">' +
      '<h3 style="margin:0 0 12px;font-size:1rem">\uD83D\uDCC1 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA (' + _genInvData.length + ')</h3>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:end">' +
        '<div><label style="font-size:.78rem;display:block;color:var(--g500)">\u05EA\u05D9\u05E7\u05D9\u05D4</label>' +
          '<select id="gi-filter-folder" class="nd-field" style="min-width:120px" onchange="_applyGenInvFilters()">' + folderOpts + '</select></div>' +
        '<div><label style="font-size:.78rem;display:block;color:var(--g500)">\u05D7\u05D5\u05D3\u05E9</label>' +
          '<input type="month" id="gi-filter-month" class="nd-field" onchange="_applyGenInvFilters()"></div>' +
        '<div><label style="font-size:.78rem;display:block;color:var(--g500)">\u05E1\u05D8\u05D8\u05D5\u05E1</label>' +
          '<select id="gi-filter-status" class="nd-field" onchange="_applyGenInvFilters()">' + statusOpts + '</select></div>' +
      '</div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
        '<thead><tr style="background:var(--g100);text-align:right">' +
          '<th style="padding:6px 8px">\u05EA\u05D0\u05E8\u05D9\u05DA</th>' +
          '<th style="padding:6px 8px">\u05E1\u05D5\u05D2</th>' +
          '<th style="padding:6px 8px">\u05DE\u05E1\u05E4\u05E8</th>' +
          '<th style="padding:6px 8px">\u05EA\u05D9\u05E7\u05D9\u05D4</th>' +
          '<th style="padding:6px 8px;text-align:left">\u05E1\u05DB\u05D5\u05DD</th>' +
          '<th style="padding:6px 8px">\u05E1\u05D8\u05D8\u05D5\u05E1</th>' +
          '<th style="padding:6px 8px;width:50px"></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
}

// ── Apply filters from dropdowns ────────────────────────────
function _applyGenInvFilters() {
  var folderId = (document.getElementById('gi-filter-folder') || {}).value || '';
  var month = (document.getElementById('gi-filter-month') || {}).value || '';
  var status = (document.getElementById('gi-filter-status') || {}).value || 'all';
  loadGeneralInvoices({ folderId: folderId, month: month, status: status });
}
