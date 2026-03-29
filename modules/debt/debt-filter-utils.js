// debt-filter-utils.js — Shared filter building blocks for debt module (Phase A2)
// Load before: debt-doc-filters.js, debt-supplier-tabs.js
// Provides: MONTHS_HE, buildMonthOpts(), buildYearOpts(), buildMonthPickerHtml(),
//   toggleMonthPicker(), monthPickerChanged(), applyDocFilterSet()

var MONTHS_HE = ['\u05D9\u05E0\u05D5\u05D0\u05E8','\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8','\u05DE\u05E8\u05E5','\u05D0\u05E4\u05E8\u05D9\u05DC','\u05DE\u05D0\u05D9','\u05D9\u05D5\u05E0\u05D9',
  '\u05D9\u05D5\u05DC\u05D9','\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8','\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8','\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8','\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8','\u05D3\u05E6\u05DE\u05D1\u05E8'];

function buildMonthOpts() {
  return '<option value="">\u05D7\u05D5\u05D3\u05E9...</option>' +
    MONTHS_HE.map(function(m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join('');
}

function buildYearOpts() {
  var y = new Date().getFullYear();
  var opts = '';
  for (var i = y - 3; i <= y + 1; i++) opts += '<option value="' + i + '"' + (i === y ? ' selected' : '') + '>' + i + '</option>';
  return opts;
}

// Build HTML for a month picker with toggle. prefix = unique ID prefix (e.g. 'docf', 'sdf')
function buildMonthPickerHtml(prefix, onChangeFn) {
  return '<div style="grid-column:span 2"><label style="font-size:.78rem;color:var(--g600);display:flex;align-items:center;gap:6px">\u05EA\u05D0\u05E8\u05D9\u05DA' +
    '<button type="button" id="' + prefix + '-month-toggle" class="btn-sm" style="font-size:.7rem;padding:1px 6px;background:#e5e7eb;color:#6b7280;border:none;border-radius:3px;cursor:pointer" ' +
      'onclick="toggleMonthPicker(\'' + prefix + '\',' + (onChangeFn || 'null') + ')">\uD83D\uDCC5 \u05D7\u05D5\u05D3\u05E9 \u05DE\u05DC\u05D0</button></label>' +
    '<div id="' + prefix + '-date-range" style="display:flex;gap:6px">' +
      '<input type="date" id="' + prefix + '-date-from" class="doc-filter-input" style="flex:1">' +
      '<input type="date" id="' + prefix + '-date-to" class="doc-filter-input" style="flex:1"></div>' +
    '<div id="' + prefix + '-month-pick" style="display:none;gap:6px">' +
      '<select id="' + prefix + '-month" class="doc-filter-input" style="flex:1" onchange="monthPickerChanged(\'' + prefix + '\',' + (onChangeFn || 'null') + ')">' + buildMonthOpts() + '</select>' +
      '<select id="' + prefix + '-year" class="doc-filter-input" style="flex:1" onchange="monthPickerChanged(\'' + prefix + '\',' + (onChangeFn || 'null') + ')">' + buildYearOpts() + '</select></div>' +
  '</div>';
}

// Track which prefixes have month picker active
var _monthPickerStates = {};

function toggleMonthPicker(prefix, onChangeFn) {
  var active = !_monthPickerStates[prefix];
  _monthPickerStates[prefix] = active;
  var rangeEl = $(prefix + '-date-range'), pickEl = $(prefix + '-month-pick'), togBtn = $(prefix + '-month-toggle');
  if (rangeEl) rangeEl.style.display = active ? 'none' : 'flex';
  if (pickEl) pickEl.style.display = active ? 'flex' : 'none';
  if (togBtn) {
    togBtn.style.background = active ? '#1a73e8' : '#e5e7eb';
    togBtn.style.color = active ? '#fff' : '#6b7280';
  }
  if (!active) {
    if ($(prefix + '-date-from')) $(prefix + '-date-from').value = '';
    if ($(prefix + '-date-to')) $(prefix + '-date-to').value = '';
  }
}

function monthPickerChanged(prefix, onChangeFn) {
  var m = ($(prefix + '-month') || {}).value;
  var y = ($(prefix + '-year') || {}).value;
  if (!m || !y) return;
  var mi = Number(m), yi = Number(y);
  var from = yi + '-' + String(mi).padStart(2, '0') + '-01';
  var lastDay = new Date(yi, mi, 0).getDate();
  var to = yi + '-' + String(mi).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
  if ($(prefix + '-date-from')) $(prefix + '-date-from').value = from;
  if ($(prefix + '-date-to')) $(prefix + '-date-to').value = to;
  if (typeof onChangeFn === 'function') onChangeFn();
}

// Apply a standard filter set to a docs array (client-side)
function applyDocFilterSet(docs, f) {
  return docs.filter(function(d) {
    if (f.status && d.status !== f.status) return false;
    if (f.document_type_id && d.document_type_id !== f.document_type_id) return false;
    if (f.date_from && (d.document_date || '') < f.date_from) return false;
    if (f.date_to && (d.document_date || '') > f.date_to) return false;
    if (f.amount_from && (Number(d.total_amount) || 0) < Number(f.amount_from)) return false;
    if (f.amount_to && (Number(d.total_amount) || 0) > Number(f.amount_to)) return false;
    return true;
  });
}
