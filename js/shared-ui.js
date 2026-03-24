// — NAVIGATION —
function showTab(name) {
  // Stop camera stream if active (stock-count tab)
  if (typeof stopCamera === 'function') stopCamera();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button[data-tab]').forEach(b => b.classList.remove('active'));
  $('tab-'+name).classList.add('active');
  const btn = document.querySelector(`nav button[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  // Close any open dropdowns when switching tabs
  closeAllDropdowns();
  if (name === 'inventory') loadInventoryTab();
  if (name === 'brands') loadBrandsTab();
  if (name === 'suppliers') loadSuppliersTab();
  if (name === 'systemlog') loadSystemLog();
  if (name === 'receipt') loadReceiptTab();
  if (name === 'purchase-orders') loadPurchaseOrdersTab();
  if (name === 'access-sync') { renderAccessSyncTab(); loadWatcherStatus(); loadSyncLog(); loadSyncSummary(); loadLastActivity(); loadPendingBadge(); }
  if (name === 'stock-count') loadStockCountTab();
  if (name === 'returns') initReturnsTab();
  if (name === 'incoming-invoices' && typeof loadIncomingInvoicesTab === 'function') loadIncomingInvoicesTab();
  if (name === 'reduction') {
    var rw = $('reduction-help-wrap');
    if (rw && !rw.querySelector('.help-banner-wrap')) {
      renderHelpBanner(rw, 'help_inv_reduction',
        '<strong>הורדת מלאי</strong><br>' +
        'כאן מורידים כמויות מהמלאי — עדכון מכירות או שינויים ידניים.' +
        '<ul><li><strong>חלק א\' — Excel</strong>: העלה קובץ מכירות מ-Access. המערכת תתאים ברקודים ותפחית כמויות.</li>' +
        '<li><strong>חלק ב\' — ידני</strong>: חפש לפי ברקוד/מותג ולחץ ➖ להורדה. נדרשת סיסמת עובד.</li>' +
        '<li><strong>כל שינוי כמות</strong> נרשם בלוג ודורש PIN.</li></ul>');
    }
  }
}

function showEntryMode(mode) {
  if (mode === 'receipt') { showTab('receipt'); return; }
  $('entry-manual').style.display = mode==='manual' ? 'block' : 'none';
  $('entry-excel').style.display = mode==='excel' ? 'block' : 'none';
  $('btn-entry-manual').classList.toggle('active', mode==='manual');
  $('btn-entry-excel').classList.toggle('active', mode==='excel');
  $('btn-entry-receipt').classList.toggle('active', false);
  if (mode==='excel') resetExcelImport();
}

// — INFO MODAL —
function showInfoModal(title, bodyHTML) {
  if (typeof Modal !== 'undefined' && Modal.show) {
    Modal.show({
      size: 'md',
      title: title,
      content: bodyHTML,
      footer: '<button class="btn btn-primary" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button>',
      closeOnEscape: true,
      closeOnBackdrop: true
    });
    return;
  }
  // Fallback — when Modal not loaded (e.g. suppliers-debt.html)
  var old = document.getElementById('info-modal-overlay');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'info-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;max-width:600px;width:92%;max-height:80vh;display:flex;flex-direction:column;direction:rtl;text-align:right;box-shadow:0 8px 32px rgba(0,0,0,.25)';
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;flex-shrink:0';
  var h3 = document.createElement('h3');
  h3.style.cssText = 'margin:0;font-size:1.1rem';
  h3.textContent = title;
  var closeX = document.createElement('button');
  closeX.className = 'btn-sm';
  closeX.textContent = '\u2715';
  closeX.onclick = function() { overlay.remove(); };
  header.appendChild(h3);
  header.appendChild(closeX);
  box.appendChild(header);
  var body = document.createElement('div');
  body.style.cssText = 'padding:16px 20px;line-height:1.8;font-size:.92rem;overflow-y:auto';
  body.innerHTML = bodyHTML;
  box.appendChild(body);
  var footer = document.createElement('div');
  footer.style.cssText = 'padding:12px 20px;border-top:1px solid #e0e0e0;text-align:left;flex-shrink:0';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-p';
  closeBtn.textContent = '\u05E1\u05D2\u05D5\u05E8';
  closeBtn.onclick = function() { overlay.remove(); };
  footer.appendChild(closeBtn);
  box.appendChild(footer);
  overlay.appendChild(box);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var escHandler = function(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(overlay);
}

// — HELP BANNER —
function renderHelpBanner(parentEl, storageKey, helpHTML) {
  if (!parentEl) return;
  var isCollapsed = sessionStorage.getItem(storageKey) === '1';
  var wrap = document.createElement('div');
  wrap.className = 'help-banner-wrap';
  var btn = document.createElement('button');
  btn.className = 'help-banner-toggle';
  btn.innerHTML = '&#10067; עזרה';
  btn.onclick = function() {
    var content = wrap.querySelector('.help-banner-content');
    if (!content) return;
    var hidden = content.style.display === 'none';
    content.style.display = hidden ? 'block' : 'none';
    sessionStorage.setItem(storageKey, hidden ? '0' : '1');
  };
  wrap.appendChild(btn);
  var content = document.createElement('div');
  content.className = 'help-banner-content';
  content.style.display = isCollapsed ? 'none' : 'block';
  content.innerHTML = helpHTML;
  wrap.appendChild(content);
  parentEl.insertBefore(wrap, parentEl.firstChild);
}
