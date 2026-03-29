// debt-supplier-filters.js — Supplier tab filter chips (Phase A1)
// Load after: debt-dashboard.js
// Provides: renderSupplierFilterChips(), applySupplierFilters(), _setSupFilter()
// Uses globals: _supTabData (from debt-dashboard.js)

var _supFilters = { type: 'all', history: 'with', debt: 'all' };

// ── Filter chip definitions ─────────────────────────────────
var _supFilterGroups = [
  {
    key: 'type', label: '\u05E1\u05D5\u05D2:',
    chips: [
      { value: 'all', label: '\u05D4\u05DB\u05DC' },
      { value: 'defined', label: '\u05DE\u05D5\u05D2\u05D3\u05E8\u05D9\u05DD' },
      { value: 'general', label: '\u05DB\u05DC\u05DC\u05D9\u05D9\u05DD' }
    ]
  },
  {
    key: 'history', label: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4:',
    chips: [
      { value: 'with', label: '\u05E2\u05DD \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4' },
      { value: 'without', label: '\u05DC\u05DC\u05D0 \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4' },
      { value: 'all', label: '\u05D4\u05DB\u05DC' }
    ]
  },
  {
    key: 'debt', label: '\u05D7\u05D5\u05D1:',
    chips: [
      { value: 'all', label: '\u05D4\u05DB\u05DC' },
      { value: 'has_debt', label: '\u05E2\u05DD \u05D7\u05D5\u05D1' },
      { value: 'overdue', label: '\u05D7\u05D5\u05D1 \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8' }
    ]
  }
];

var _sfChipBase = 'font-size:.72rem;padding:2px 8px;border:none;border-radius:3px;cursor:pointer;';
var _sfChipOn = 'background:#1a73e8;color:#fff;';
var _sfChipOff = 'background:#e5e7eb;color:#6b7280;';
var _sfLabelStyle = 'font-size:.75rem;color:var(--g500);margin-left:4px;white-space:nowrap;';
var _sfGroupStyle = 'display:inline-flex;align-items:center;gap:3px;margin-left:10px;';

function renderSupplierFilterChips() {
  var container = document.getElementById('sup-filter-chips');
  if (!container) return;
  container.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:4px';
  container.innerHTML = _supFilterGroups.map(function(group) {
    var chips = group.chips.map(function(chip) {
      var active = _supFilters[group.key] === chip.value;
      return '<button data-group="' + group.key + '" data-value="' + chip.value + '" ' +
        'style="' + _sfChipBase + (active ? _sfChipOn : _sfChipOff) + '" ' +
        'onclick="_setSupFilter(\'' + group.key + '\',\'' + chip.value + '\')">' +
        chip.label + '</button>';
    }).join('');
    return '<span style="' + _sfGroupStyle + '"><span style="' + _sfLabelStyle + '">' + group.label + '</span>' + chips + '</span>';
  }).join('');
}

// ── Set filter value and re-apply ───────────────────────────
function _setSupFilter(groupKey, value) {
  _supFilters[groupKey] = value;
  var container = document.getElementById('sup-filter-chips');
  if (container) {
    container.querySelectorAll('button[data-group="' + groupKey + '"]').forEach(function(btn) {
      var active = btn.getAttribute('data-value') === value;
      btn.style.background = active ? '#1a73e8' : '#e5e7eb';
      btn.style.color = active ? '#fff' : '#6b7280';
    });
  }
  applySupplierFilters();
}

// ── Apply all filters and render table ──────────────────────
function applySupplierFilters() {
  var filtered = (_supTabData || []).slice();
  // Type filter
  if (_supFilters.type === 'defined') {
    filtered = filtered.filter(function(s) { return s.hasReceiptDocs; });
  } else if (_supFilters.type === 'general') {
    filtered = filtered.filter(function(s) { return !s.hasReceiptDocs; });
  }
  // History filter
  if (_supFilters.history === 'with') {
    filtered = filtered.filter(function(s) { return s.hasHistory; });
  } else if (_supFilters.history === 'without') {
    filtered = filtered.filter(function(s) { return !s.hasHistory; });
  }
  // Debt filter
  if (_supFilters.debt === 'has_debt') {
    filtered = filtered.filter(function(s) { return s.totalDebt > 0; });
  } else if (_supFilters.debt === 'overdue') {
    filtered = filtered.filter(function(s) { return s.overdueAmt > 0; });
  }
  // Update count
  var countEl = document.getElementById('sup-filter-count');
  if (countEl) {
    var total = (_supTabData || []).length;
    countEl.textContent = filtered.length === total
      ? '\u05DE\u05E6\u05D9\u05D2 ' + total + ' \u05E1\u05E4\u05E7\u05D9\u05DD'
      : '\u05DE\u05E6\u05D9\u05D2 ' + filtered.length + ' \u05DE\u05EA\u05D5\u05DA ' + total + ' \u05E1\u05E4\u05E7\u05D9\u05DD';
  }
  renderSuppliersTable(filtered);
}
