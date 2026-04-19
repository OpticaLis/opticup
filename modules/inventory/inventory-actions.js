// ============================================================
// inventory-actions.js — ⋯ action menu + event delegation
// Extracted from inventory-table.js for file-size compliance
// ============================================================

// --- ⋯ Action Menu ---
var _invMenuOpen = null;
function _openInvMenu(btn) {
  _closeInvMenu();
  var id = btn.dataset.id;
  var rec = invData.find(function(r) { return r.id === id; });
  if (!rec) return;
  var isAdm = document.body.classList.contains('admin-mode');
  var items = [
    { icon: '\uD83D\uDD0D', label: '\u05E2\u05D5\u05D3', fn: '_toggleSubrow', id: id },
    { icon: '\uD83D\uDCF7', label: '\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA', fn: '_openImageWithNav', id: id },
    { icon: '\uD83D\uDCCB', label: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4', fn: 'openItemHistory', id: id, extra: "'" + escapeHtml(rec.barcode||'') + "','" + escapeHtml(rec.brand_name||'') + "','" + escapeHtml(rec.model||'') + "'" }
  ];
  if (isAdm) {
    items.push({ icon: '\uD83D\uDDD1\uFE0F', label: '\u05DE\u05D7\u05D9\u05E7\u05D4', fn: 'deleteInvRow', id: id, cls: 'color:#ef4444' });
  }
  var dd = document.createElement('div');
  dd.className = 'inv-action-menu';
  dd.innerHTML = items.map(function(it) {
    var safeId = escapeHtml(it.id);
    var args = it.extra ? "'" + safeId + "'," + it.extra : "'" + safeId + "'";
    var style = it.cls ? ' style="' + it.cls + '"' : '';
    return '<button' + style + ' onclick="_closeInvMenu();' + it.fn + '(' + args + ')">' + it.icon + ' ' + it.label + '</button>';
  }).join('');
  var rect = btn.getBoundingClientRect();
  var dropRight = window.innerWidth - rect.right;
  var dropLeft = rect.left;
  var posStyle = dropRight < 160 ? 'left:' + dropLeft + 'px' : 'right:' + dropRight + 'px';
  dd.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid var(--g200,#e5e7eb);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:150px;padding:4px 0;' +
    'top:' + (rect.bottom + 2) + 'px;' + posStyle;
  document.body.appendChild(dd);
  _invMenuOpen = dd;
}
function _closeInvMenu() {
  if (_invMenuOpen) { _invMenuOpen.remove(); _invMenuOpen = null; }
}

// --- Toggle subrow (bridge + temple_length) ---
function _toggleSubrow(id) {
  var sub = document.querySelector('.inv-subrow[data-parent="' + id + '"]');
  if (!sub) return;
  sub.style.display = sub.style.display === 'none' ? '' : 'none';
}

// --- Inline edit in subrow ---
function invEditSub(span, id, field) {
  var cur = span.textContent === '—' ? '' : span.textContent;
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.value = cur;
  inp.style.cssText = 'width:80px;padding:2px 4px;border:1px solid var(--primary);border-radius:4px;font-size:.82rem';
  span.replaceWith(inp);
  inp.focus();
  inp.select();
  function save() {
    var val = inp.value.trim();
    var newSpan = document.createElement('span');
    newSpan.className = 'editable';
    newSpan.textContent = val || '—';
    newSpan.onclick = function() { invEditSub(newSpan, id, field); };
    inp.replaceWith(newSpan);
    // Save to DB
    var update = {};
    update[field] = val || null;
    sb.from(T.INV).update(update).eq('id', id).then(function(res) {
      if (res.error) { toast('שגיאה בשמירה: ' + res.error.message, 'e'); return; }
      var rec = invData.find(function(r) { return r.id === id; });
      if (rec) rec[field] = val || null;
    });
  }
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { inp.value = cur; inp.blur(); }
  });
}

// ─── EVENT DELEGATION ───────────────────────────────────────────
document.addEventListener('click', function(e) {
  // ⋯ menu toggle
  var menuBtn = e.target.closest('.btn-inv-menu');
  if (menuBtn) { _openInvMenu(menuBtn); return; }
  // Close menu on any outside click
  if (_invMenuOpen && !e.target.closest('.inv-action-menu')) _closeInvMenu();
  // #1 openReductionModal
  const reduceBtn = e.target.closest('.btn-reduce');
  if (reduceBtn) { openReductionModal(reduceBtn.dataset.id); return; }
  // #2 showImagePreview — click on thumbnail opens image modal
  const imgThumb = e.target.closest('.img-thumb-click');
  if (imgThumb) { _openImageWithNav(imgThumb.dataset.id); return; }
  // #4-5 openQtyModal (add / remove)
  const qtyPlus = e.target.closest('.qty-plus');
  if (qtyPlus) { openQtyModal(qtyPlus.dataset.id, qtyPlus.dataset.dir); return; }
  const qtyMinus = e.target.closest('.qty-minus');
  if (qtyMinus) { openQtyModal(qtyMinus.dataset.id, qtyMinus.dataset.dir); return; }
});

document.addEventListener('change', function(e) {
  // #A toggleRowSelect
  const chk = e.target.closest('.inv-row-check');
  if (chk) { toggleRowSelect(chk.dataset.id, chk.checked); return; }
});
