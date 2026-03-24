// debt-doc-filters.js — Advanced document filtering with saved presets (Phase 5.5f)
// Load after: shared.js, search-select.js, debt-documents.js
// Provides: renderDocFilterBar(), applyDocFilters(), getDocFilterState()
// Replaces simple filter bar from debt-documents.js

var _docFilterState = null; // persists across tab switches
var _docFilterCollapsed = true;
var _docFilterSupSelect = null; // searchSelect instance
var _docTotalCount = 0; // total unfiltered docs
var _recycleBinMode = false; // true = showing deleted docs
var _deletedDocCount = 0;

function _getFilterFavKey() {
  return 'opticup_doc_filters_' + getTenantId();
}

function _loadFilterFavorites() {
  try {
    var raw = localStorage.getItem(_getFilterFavKey());
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function _saveFilterFavorites(favs) {
  try { localStorage.setItem(_getFilterFavKey(), JSON.stringify(favs.slice(0, 5))); } catch (e) {}
}

function getDocFilterState() {
  return _docFilterState || {};
}

function renderDocFilterBar() {
  var container = $('dtab-documents');
  if (!container) return;
  var typeOpts = '<option value="">\u05D4\u05DB\u05DC</option>';
  (_docTypes || []).forEach(function(t) {
    typeOpts += '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name_he) + '</option>';
  });
  var favs = _loadFilterFavorites();
  var favHtml = '';
  if (favs.length > 0) {
    favHtml = '<div id="doc-fav-bar" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">';
    favs.forEach(function(f, i) {
      favHtml += '<button class="btn btn-sm doc-fav-btn" style="background:#e5e7eb;color:#1e293b" data-fav-idx="' + i + '" ' +
        'onclick="_applyFavorite(' + i + ')" oncontextmenu="_deleteFavorite(event,' + i + ')" ' +
        'title="\u05DC\u05D7\u05E5 \u05DC\u05D4\u05D7\u05DC\u05D4 | \u05DC\u05D7\u05D9\u05E6\u05D4 \u05D9\u05DE\u05E0\u05D9\u05EA \u05DC\u05DE\u05D7\u05D9\u05E7\u05D4">\u2B50 ' + escapeHtml(f.name) + '</button>';
    });
    favHtml += '</div>';
  }
  var collapsed = _docFilterCollapsed;
  var html = favHtml +
    '<div class="doc-toolbar" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
      '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" id="doc-filter-toggle" onclick="_toggleDocFilters()">' +
        '\uD83D\uDD0D \u05E1\u05D9\u05E0\u05D5\u05DF [' + (collapsed ? '\u25BC' : '\u25B2') + ']</button>' +
      '<span id="doc-filter-count" style="font-size:.82rem;color:var(--g500)"></span>' +
      '<span style="font-size:.78rem;color:var(--g500);margin-right:4px">\u05DE\u05D9\u05D9\u05DF:</span>' +
      '<button class="btn-sm doc-sort-btn" data-sort="created_at" onclick="setDocSort(\'created_at\')" ' +
        'style="background:#1a73e8;color:#fff;font-size:.75rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer">\u05D4\u05E2\u05DC\u05D0\u05D4</button>' +
      '<button class="btn-sm doc-sort-btn" data-sort="document_date" onclick="setDocSort(\'document_date\')" ' +
        'style="background:#e5e7eb;color:#1e293b;font-size:.75rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer">\u05EA\u05D0\u05E8\u05D9\u05DA</button>' +
      '<span style="font-size:.75rem;color:var(--g500);margin-right:4px">\u05E1\u05D8\u05D8\u05D5\u05E1:</span>' +
      '<button class="doc-status-btn" data-status="open" onclick="toggleDocStatusFilter(\'open\')" ' +
        'style="font-size:.72rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer;background:#1a73e8;color:#fff">\u05E4\u05EA\u05D5\u05D7</button>' +
      '<button class="doc-status-btn" data-status="paid" onclick="toggleDocStatusFilter(\'paid\')" ' +
        'style="font-size:.72rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer;background:#e5e7eb;color:#6b7280">\u05E9\u05D5\u05DC\u05DD</button>' +
      '<button class="doc-status-btn" data-status="cancelled" onclick="toggleDocStatusFilter(\'cancelled\')" ' +
        'style="font-size:.72rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer;background:#e5e7eb;color:#6b7280">\u05DE\u05D1\u05D5\u05D8\u05DC\u05D9\u05DD</button>' +
      '<button class="btn doc-add-btn" style="background:#059669;color:#fff;margin-right:auto" onclick="openNewDocumentModal()">+ \u05DE\u05E1\u05DE\u05DA \u05D7\u05D3\u05E9</button>' +
      '<button class="btn btn-sm" id="recycle-bin-btn" style="background:#fee2e2;color:#991b1b;font-size:.78rem" onclick="_toggleRecycleBin()">' +
        '\uD83D\uDDD1\uFE0F \u05E1\u05DC \u05DE\u05D7\u05D6\u05D5\u05E8 (<span id="recycle-count">0</span>)</button>' +
    '</div>' +
    '<div id="doc-filter-panel" style="display:' + (collapsed ? 'none' : 'grid') + ';grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:12px;' +
      'background:var(--white);border:1px solid var(--g200);border-radius:8px;padding:12px">' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05E1\u05D8\u05D8\u05D5\u05E1</label>' +
        '<select id="docf-status" class="doc-filter-input" style="width:100%">' +
          '<option value="">\u05D4\u05DB\u05DC</option>' +
          '<option value="paid">\u05E9\u05D5\u05DC\u05DD</option>' +
          '<option value="open">\u05DC\u05D0 \u05E9\u05D5\u05DC\u05DD</option>' +
          '<option value="partially_paid">\u05D7\u05DC\u05E7\u05D9</option>' +
          '<option value="draft">\u05D8\u05D9\u05D5\u05D8\u05D4</option>' +
          '<option value="cancelled">\u05DE\u05D1\u05D5\u05D8\u05DC</option>' +
        '</select></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA</label>' +
        '<select id="docf-type" class="doc-filter-input" style="width:100%">' + typeOpts + '</select></div>' +
      '<div id="docf-supplier-wrap"><label style="font-size:.78rem;color:var(--g600)">\u05E1\u05E4\u05E7</label></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE:</label>' +
        '<input type="date" id="docf-date-from" class="doc-filter-input" style="width:100%"></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05EA\u05D0\u05E8\u05D9\u05DA \u05E2\u05D3:</label>' +
        '<input type="date" id="docf-date-to" class="doc-filter-input" style="width:100%"></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05E1\u05DB\u05D5\u05DD \u05DE:</label>' +
        '<input type="number" id="docf-amount-from" class="doc-filter-input" style="width:100%" step="0.01" min="0"></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05E1\u05DB\u05D5\u05DD \u05E2\u05D3:</label>' +
        '<input type="number" id="docf-amount-to" class="doc-filter-input" style="width:100%" step="0.01" min="0"></div>' +
      '<div><label style="font-size:.78rem;color:var(--g600)">\u05DE\u05E7\u05D5\u05E8</label>' +
        '<select id="docf-source" class="doc-filter-input" style="width:100%">' +
          '<option value="">\u05D4\u05DB\u05DC</option>' +
          '<option value="historical">\uD83D\uDCDC \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9</option>' +
          '<option value="current">\uD83D\uDCCB \u05E9\u05D5\u05D8\u05E3</option>' +
        '</select></div>' +
      '<div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end;margin-top:4px">' +
        '<button class="btn btn-sm" style="background:#1a73e8;color:#fff" onclick="_applyDocFilterClick()">\uD83D\uDD0D \u05E1\u05E0\u05DF</button>' +
        '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="_clearDocFilters()">\u21BB \u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC</button>' +
        '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="_saveDocFilterFav()">\u2B50 \u05E9\u05DE\u05D5\u05E8 \u05DB\u05DE\u05D5\u05E2\u05D3\u05E3</button>' +
      '</div>' +
    '</div>' +
    '<div id="doc-table-wrap"></div>';
  container.innerHTML = html;
  _initSupplierSearchSelect();
  if (_docFilterState) _restoreFilterState(_docFilterState);
  if (typeof _updateStatusBtnStyles === 'function') _updateStatusBtnStyles();
}

function _initSupplierSearchSelect() {
  var wrap = $('docf-supplier-wrap');
  if (!wrap) return;
  var names = (_docSuppliers || []).map(function(s) { return s.name; });
  _docFilterSupSelect = createSearchSelect(names, '', null);
  _docFilterSupSelect.style.width = '100%';
  wrap.appendChild(_docFilterSupSelect);
}

function _toggleDocFilters() {
  _docFilterCollapsed = !_docFilterCollapsed;
  var panel = $('doc-filter-panel');
  if (panel) panel.style.display = _docFilterCollapsed ? 'none' : 'grid';
  var btn = $('doc-filter-toggle');
  if (btn) btn.innerHTML = '\uD83D\uDD0D \u05E1\u05D9\u05E0\u05D5\u05DF [' + (_docFilterCollapsed ? '\u25BC' : '\u25B2') + ']';
}

function _readFilterValues() {
  var supName = _docFilterSupSelect ? (_docFilterSupSelect._hidden || {}).value || '' : '';
  var supplierId = '';
  if (supName) {
    var match = (_docSuppliers || []).find(function(s) { return s.name === supName; });
    if (match) supplierId = match.id;
  }
  return {
    status: ($('docf-status') || {}).value || '',
    document_type_id: ($('docf-type') || {}).value || '',
    supplier_id: supplierId,
    supplier_name: supName,
    date_from: ($('docf-date-from') || {}).value || '',
    date_to: ($('docf-date-to') || {}).value || '',
    amount_from: ($('docf-amount-from') || {}).value || '',
    amount_to: ($('docf-amount-to') || {}).value || '',
    is_historical: ($('docf-source') || {}).value || ''
  };
}

function _restoreFilterState(state) {
  if (!state) return;
  if (state.status && $('docf-status')) $('docf-status').value = state.status;
  if (state.document_type_id && $('docf-type')) $('docf-type').value = state.document_type_id;
  if (state.supplier_name && _docFilterSupSelect) {
    if (_docFilterSupSelect._input) _docFilterSupSelect._input.value = state.supplier_name;
    if (_docFilterSupSelect._hidden) _docFilterSupSelect._hidden.value = state.supplier_name;
  }
  if (state.date_from && $('docf-date-from')) $('docf-date-from').value = state.date_from;
  if (state.date_to && $('docf-date-to')) $('docf-date-to').value = state.date_to;
  if (state.amount_from && $('docf-amount-from')) $('docf-amount-from').value = state.amount_from;
  if (state.amount_to && $('docf-amount-to')) $('docf-amount-to').value = state.amount_to;
  if (state.is_historical && $('docf-source')) $('docf-source').value = state.is_historical;
}

function _applyDocFilterClick() {
  _docFilterState = _readFilterValues();
  applyDocFilters();
}

function applyDocFilters() {
  var f = _docFilterState || _readFilterValues();
  _docTotalCount = _docData.length;
  var sf = (typeof _getDocStatusFilters === 'function') ? _getDocStatusFilters() : { open: true, paid: false, cancelled: false };
  var filtered = _docData.filter(function(d) {
    // Status filter: advanced panel overrides toolbar buttons
    if (f.status) {
      if (d.status !== f.status) return false;
    } else {
      // Toolbar status buttons
      var pass = false;
      if (sf.open && (d.status === 'open' || d.status === 'partially_paid' || d.status === 'draft' || d.status === 'linked' || d.status === 'pending_invoice')) pass = true;
      if (sf.paid && d.status === 'paid') pass = true;
      if (sf.cancelled && d.status === 'cancelled') pass = true;
      if (!pass) return false;
    }
    if (f.document_type_id && d.document_type_id !== f.document_type_id) return false;
    if (f.supplier_id && d.supplier_id !== f.supplier_id) return false;
    if (f.date_from && (d.document_date || '') < f.date_from) return false;
    if (f.date_to && (d.document_date || '') > f.date_to) return false;
    if (f.amount_from && (Number(d.total_amount) || 0) < Number(f.amount_from)) return false;
    if (f.amount_to && (Number(d.total_amount) || 0) > Number(f.amount_to)) return false;
    if (f.is_historical === 'historical' && !(d.is_historical === true)) return false;
    if (f.is_historical === 'current' && d.is_historical === true) return false;
    return true;
  });
  var sf = (typeof _docSortField !== 'undefined') ? _docSortField : 'document_date';
  filtered.sort(function(a, b) {
    // Draft documents always appear first
    var aDraft = a.status === 'draft' ? 0 : 1;
    var bDraft = b.status === 'draft' ? 0 : 1;
    if (aDraft !== bDraft) return aDraft - bDraft;
    return (b[sf] || '').localeCompare(a[sf] || '');
  });
  _updateFilterCount(filtered.length, _docTotalCount);
  renderDocumentsTable(filtered);
  _loadDeletedDocCount(); // non-blocking — update recycle bin badge
}

function _updateFilterCount(shown, total) {
  var el = $('doc-filter-count');
  if (!el) return;
  if (shown === total) {
    el.textContent = '\u05DE\u05E6\u05D9\u05D2 ' + total + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD';
  } else {
    el.textContent = '\u05DE\u05E6\u05D9\u05D2 ' + shown + ' \u05DE\u05EA\u05D5\u05DA ' + total + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD';
    el.style.fontWeight = '600';
    el.style.color = 'var(--primary)';
  }
}

function _clearDocFilters() {
  _docFilterState = null;
  if ($('docf-status')) $('docf-status').value = '';
  if ($('docf-type')) $('docf-type').value = '';
  if (_docFilterSupSelect) {
    if (_docFilterSupSelect._input) _docFilterSupSelect._input.value = '';
    if (_docFilterSupSelect._hidden) _docFilterSupSelect._hidden.value = '';
  }
  if ($('docf-date-from')) $('docf-date-from').value = '';
  if ($('docf-date-to')) $('docf-date-to').value = '';
  if ($('docf-amount-from')) $('docf-amount-from').value = '';
  if ($('docf-amount-to')) $('docf-amount-to').value = '';
  if ($('docf-source')) $('docf-source').value = '';
  applyDocFilters();
}

function _saveDocFilterFav() {
  var state = _readFilterValues();
  var hasAny = state.status || state.document_type_id || state.supplier_id ||
    state.date_from || state.date_to || state.amount_from || state.amount_to || state.is_historical;
  if (!hasAny) { toast('\u05D0\u05D9\u05DF \u05E1\u05D9\u05E0\u05D5\u05DF \u05E4\u05E2\u05D9\u05DC \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4', 'w'); return; }
  var favs = _loadFilterFavorites();
  if (favs.length >= 5) { toast('\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 5 \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD. \u05DE\u05D7\u05E7 \u05E7\u05D5\u05D3\u05DD \u05E2\u05DD \u05DC\u05D7\u05D9\u05E6\u05D4 \u05D9\u05DE\u05E0\u05D9\u05EA.', 'w'); return; }
  var parts = [];
  if (state.status) parts.push(state.status);
  if (state.supplier_name) parts.push(state.supplier_name);
  if (state.date_from || state.date_to) parts.push('\u05EA\u05D0\u05E8\u05D9\u05DA');
  var name = parts.join(' + ') || '\u05E1\u05D9\u05E0\u05D5\u05DF ' + (favs.length + 1);
  favs.push({ name: name.slice(0, 20), state: state });
  _saveFilterFavorites(favs);
  toast('\u05E1\u05D9\u05E0\u05D5\u05DF \u05E0\u05E9\u05DE\u05E8 \u05DB\u05DE\u05D5\u05E2\u05D3\u05E3');
  renderDocFilterBar();
  _docFilterState = state;
  _restoreFilterState(state);
  applyDocFilters();
}

function _applyFavorite(idx) {
  var favs = _loadFilterFavorites();
  if (!favs[idx]) return;
  _docFilterState = favs[idx].state;
  _docFilterCollapsed = false;
  renderDocFilterBar();
  _restoreFilterState(_docFilterState);
  applyDocFilters();
}

function _deleteFavorite(event, idx) {
  event.preventDefault();
  var favs = _loadFilterFavorites();
  if (!favs[idx]) return;
  favs.splice(idx, 1);
  _saveFilterFavorites(favs);
  toast('\u05DE\u05D5\u05E2\u05D3\u05E3 \u05E0\u05DE\u05D7\u05E7');
  renderDocFilterBar();
  if (_docFilterState) _restoreFilterState(_docFilterState);
  applyDocFilters();
}

// =========================================================
// Recycle Bin — deleted documents view
// =========================================================
async function _loadDeletedDocCount() {
  try {
    var { count, error } = await sb.from(T.SUP_DOCS).select('id', { count: 'exact', head: true })
      .eq('is_deleted', true).eq('tenant_id', getTenantId());
    _deletedDocCount = error ? 0 : (count || 0);
  } catch (e) { _deletedDocCount = 0; }
  var el = $('recycle-count');
  if (el) el.textContent = _deletedDocCount;
}

async function _toggleRecycleBin() {
  if (_recycleBinMode) {
    // Return to normal view
    _recycleBinMode = false;
    await loadDocumentsTab();
    return;
  }
  _recycleBinMode = true;
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05E1\u05DC \u05DE\u05D7\u05D6\u05D5\u05E8...');
  try {
    var { data: deleted } = await sb.from(T.SUP_DOCS).select('*')
      .eq('is_deleted', true).eq('tenant_id', getTenantId())
      .order('updated_at', { ascending: false });
    hideLoading();
    _renderRecycleBin(deleted || []);
  } catch (e) {
    hideLoading();
    console.error('_toggleRecycleBin error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E1\u05DC \u05DE\u05D7\u05D6\u05D5\u05E8', 'e');
  }
}

function _renderRecycleBin(docs) {
  var container = $('dtab-documents');
  if (!container) return;
  var typeMap = {}, supMap = {};
  (_docTypes || []).forEach(function(t) { typeMap[t.id] = t; });
  (_docSuppliers || []).forEach(function(s) { supMap[s.id] = s.name; });
  var now = Date.now();

  var rows = docs.map(function(d) {
    var type = typeMap[d.document_type_id] || {};
    var deletedAt = d.updated_at ? new Date(d.updated_at) : null;
    var daysLeft = deletedAt ? Math.max(0, 30 - Math.floor((now - deletedAt.getTime()) / 86400000)) : '\u2014';
    var deletedStr = deletedAt ? deletedAt.toLocaleDateString('he-IL') : '\u2014';
    return '<tr>' +
      '<td>' + escapeHtml(d.document_date || '') + '</td>' +
      '<td>' + escapeHtml((type.name_he || '')) + '</td>' +
      '<td>' + escapeHtml(d.document_number || '') + '</td>' +
      '<td>' + escapeHtml(supMap[d.supplier_id] || '') + '</td>' +
      '<td>' + formatILS(d.total_amount) + '</td>' +
      '<td>' + escapeHtml(deletedStr) + '</td>' +
      '<td style="color:' + (daysLeft <= 7 ? '#ef4444' : 'var(--g500)') + ';font-weight:600">' + daysLeft + ' \u05D9\u05DE\u05D9\u05DD</td>' +
      '<td><button class="btn-sm" style="background:#059669;color:#fff" onclick="_restoreDocument(\'' + d.id + '\')">\u21A9\uFE0F \u05E9\u05D7\u05D6\u05E8</button></td>' +
      '</tr>';
  }).join('');

  if (!rows) rows = '<tr><td colspan="8" style="text-align:center;color:var(--g500);padding:16px">\u05E1\u05DC \u05D4\u05DE\u05D7\u05D6\u05D5\u05E8 \u05E8\u05D9\u05E7</td></tr>';

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
      '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="_toggleRecycleBin()">\u2192 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05E8\u05E9\u05D9\u05DE\u05D4</button>' +
      '<h3 style="margin:0;font-size:1rem;color:#991b1b">\uD83D\uDDD1\uFE0F \u05E1\u05DC \u05DE\u05D7\u05D6\u05D5\u05E8 (' + docs.length + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD)</h3>' +
    '</div>' +
    '<div style="font-size:.82rem;color:var(--g500);margin-bottom:10px">\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05E9\u05E0\u05DE\u05D7\u05E7\u05D5 \u05E0\u05D9\u05EA\u05E0\u05D9\u05DD \u05DC\u05E9\u05D7\u05D6\u05D5\u05E8 \u05D1\u05DE\u05E9\u05DA 30 \u05D9\u05D5\u05DD.</div>' +
    '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.85rem">' +
      '<thead><tr><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05D5\u05D2</th><th>\u05DE\u05E1\u05E4\u05E8</th><th>\u05E1\u05E4\u05E7</th><th>\u05E1\u05DB\u05D5\u05DD</th><th>\u05E0\u05DE\u05D7\u05E7</th><th>\u05D6\u05DE\u05DF \u05E0\u05D5\u05EA\u05E8</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
}

function _restoreDocument(docId) {
  promptPin('\u05E9\u05D7\u05D6\u05D5\u05E8 \u05DE\u05E1\u05DE\u05DA \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05E9\u05D7\u05D6\u05E8...');
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, is_deleted: false }]);
      await writeLog('doc_restored', null, { document_id: docId, restored_by: emp.id });
      toast('\u05DE\u05E1\u05DE\u05DA \u05E9\u05D5\u05D7\u05D6\u05E8');
      _toggleRecycleBin(); // reload recycle bin
    } catch (e) {
      console.error('_restoreDocument error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}
