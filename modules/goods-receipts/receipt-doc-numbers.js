// receipt-doc-numbers.js — Document number management for receipts (Phase A7)
// Load before: receipt-form.js
// Provides: _addRcptExtraNum, _removeRcptExtraNum, _renderRcptExtraNums,
//   getRcptDocumentNumbers, getRcptDocAmounts, _onDocCountChange,
//   _onExtraNumEdit, _onExtraAmtEdit, _onDocAmountChange

var _rcptExtraNums = [];     // additional doc numbers beyond the main rcpt-number
var _rcptDocAmounts = {};    // keyed by doc number → amount

function _addRcptExtraNum() {
  var inp = document.getElementById('rcpt-extra-num-input');
  var val = (inp ? inp.value : '').trim();
  if (!val) return;
  if (_rcptExtraNums.includes(val)) { Toast.warning('\u05DE\u05E1\u05E4\u05E8 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD'); return; }
  _rcptExtraNums.push(val);
  _rcptDocAmounts[val] = 0;
  if (inp) inp.value = '';
  _renderRcptExtraNums();
}

function _removeRcptExtraNum(idx) {
  var removed = _rcptExtraNums.splice(idx, 1);
  if (removed[0]) delete _rcptDocAmounts[removed[0]];
  _renderRcptExtraNums();
}

function _onDocAmountChange(docNum, el) { _rcptDocAmounts[docNum] = Number(el.value) || 0; }

function _renderRcptExtraNums() {
  var container = document.getElementById('rcpt-extra-nums-tags');
  if (!container) return;
  var showAmts = getRcptDocumentNumbers().length >= 2;
  container.innerHTML = _rcptExtraNums.map(function(n, i) {
    var amt = showAmts ? '<input type="number" step="0.01" min="0" placeholder="\u20AA" value="' +
      (_rcptDocAmounts[n] || '') + '" onchange="_onDocAmountChange(\'' + escapeHtml(n) + '\',this)" ' +
      'style="width:70px;padding:2px 4px;border:1px solid #c7d2fe;border-radius:3px;font-size:.78rem;text-align:center;margin-right:4px">' : '';
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:.82rem">' +
      escapeHtml(n) + amt + '<button type="button" onclick="_removeRcptExtraNum(' + i + ')" style="background:none;border:none;cursor:pointer;font-size:12px;color:#6366f1;padding:0">\u2715</button></span>';
  }).join('');
  var wrap = document.getElementById('rcpt-main-amount-wrap');
  if (wrap) {
    wrap.style.display = showAmts ? 'inline-flex' : 'none';
    var inp = wrap.querySelector('input');
    if (inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener('change', function() {
        var m = (document.getElementById('rcpt-number') || {}).value || '';
        _rcptDocAmounts[m] = Number(inp.value) || 0;
      });
    }
  }
}

function getRcptDocumentNumbers() {
  var main = (document.getElementById('rcpt-number') || {}).value || '';
  main = main.trim();
  var all = main ? [main] : [];
  _rcptExtraNums.forEach(function(n) { if (n && !all.includes(n)) all.push(n); });
  return all;
}

function getRcptDocAmounts() {
  var allNums = getRcptDocumentNumbers();
  if (allNums.length < 2) return null;
  var wrap = document.getElementById('rcpt-main-amount-wrap');
  if (wrap) {
    var inp = wrap.querySelector('input');
    if (inp) {
      var main = (document.getElementById('rcpt-number') || {}).value || '';
      _rcptDocAmounts[main] = Number(inp.value) || 0;
    }
  }
  return allNums.map(function(n) { return { number: n, amount: _rcptDocAmounts[n] || 0 }; });
}

// ── Doc count change handler ──
function _onDocCountChange() {
  var countEl = document.getElementById('rcpt-doc-count');
  var count = Math.max(1, Math.min(10, Number((countEl || {}).value) || 1));
  var mainNum = document.getElementById('rcpt-number');
  var extraAdd = document.getElementById('rcpt-extra-nums-add');
  var extraArea = document.getElementById('rcpt-extra-nums');
  var amtWrap = document.getElementById('rcpt-main-amount-wrap');
  if (count === 1) {
    // Single doc: show main input only, hide everything else
    if (mainNum) { mainNum.style.display = ''; mainNum.placeholder = '\u05DE\u05E1\u05F3 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA'; }
    if (extraAdd) extraAdd.style.display = 'none';
    if (extraArea) extraArea.style.display = 'none';
    if (amtWrap) amtWrap.style.display = 'none';
    _rcptExtraNums = [];
    _rcptDocAmounts = {};
    var tags = document.getElementById('rcpt-extra-nums-tags');
    if (tags) tags.innerHTML = '';
    return;
  }
  // Multi-doc: show numbered vertical rows
  if (extraAdd) extraAdd.style.display = 'none';
  if (extraArea) extraArea.style.display = '';
  if (amtWrap) amtWrap.style.display = 'none';
  if (mainNum) mainNum.style.display = 'none';
  _rcptExtraNums = [];
  _rcptDocAmounts = {};
  for (var i = 0; i < count; i++) _rcptExtraNums.push('');
  var container = document.getElementById('rcpt-extra-nums-tags');
  if (!container) return;
  var rows = '';
  for (var j = 0; j < count; j++) {
    rows += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;direction:rtl">' +
      '<span style="min-width:24px;text-align:center;color:#6b7280;font-size:.82rem">' + (j + 1) + '</span>' +
      '<input type="text" placeholder="\u05DE\u05E1\u05F3 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA" data-doc-idx="' + j + '" ' +
        'onchange="_onExtraNumEdit(' + j + ',this.value)" ' +
        'style="flex:1;font-size:.85rem;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px">' +
      '<span style="font-size:.82rem;color:#6b7280">\u05E1\u05DB\u05D5\u05DD</span>' +
      '<input type="number" step="0.01" min="0" placeholder="0" data-doc-amt="' + j + '" ' +
        'onchange="_onExtraAmtEdit(' + j + ',this.value)" ' +
        'style="width:120px;padding:4px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:.85rem;text-align:center">' +
      '<span style="font-size:.82rem;color:#6b7280">\u20AA</span>' +
    '</div>';
  }
  container.innerHTML = rows;
}

function _onExtraNumEdit(idx, val) {
  _rcptExtraNums[idx] = (val || '').trim();
}

function _onExtraAmtEdit(idx, val) {
  var num = _rcptExtraNums[idx];
  if (num) _rcptDocAmounts[num] = Number(val) || 0;
}
