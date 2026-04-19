// ============================================================
// stock-count-scan.js — Scan handling, barcode search, qty modal, undo, pause/finish
// Depends on: stock-count-session.js (state variables, scRenderItemRow, scCalcStats)
// Depends on: stock-count-camera.js (startCamera, stopCamera, _scResumeScanning)
// ============================================================

// ── Barcode normalization (ZXing → DB format) ────────────────
function _scNormalizeBarcode(scanned) {
  const raw = (scanned || '').trim();
  const rawLower = raw.toLowerCase();
  // 1. Exact match (case-insensitive)
  var item = scSessionItems.find(i => (i.barcode || '').toLowerCase() === rawLower);
  if (item) { console.log('SCAN MATCH: exact', raw); return item; }
  // 2. Strip leading zeros and re-pad to 7 digits (BBDDDDD)
  var stripped = raw.replace(/^0+/, '') || '0';
  var padded7 = stripped.padStart(7, '0').toLowerCase();
  item = scSessionItems.find(i => (i.barcode || '').toLowerCase() === padded7);
  if (item) { console.log('SCAN MATCH: pad7', raw, '→', padded7); return item; }
  // 3. EAN-13: last digit is check digit — try without it
  if (raw.length >= 8) {
    var noCheck = raw.slice(0, -1);
    var noCheckPad = noCheck.replace(/^0+/, '').padStart(7, '0').toLowerCase();
    item = scSessionItems.find(i => (i.barcode || '').toLowerCase() === noCheckPad);
    if (item) { console.log('SCAN MATCH: ean-strip', raw, '→', noCheckPad); return item; }
  }
  // 4. EAN-13 embedded: last 7 non-check digits
  if (raw.length >= 8) {
    var inner = raw.slice(-8, -1);  // 7 digits before check digit
    var innerLower = inner.toLowerCase();
    item = scSessionItems.find(i => (i.barcode || '').toLowerCase() === innerLower);
    if (item) { console.log('SCAN MATCH: ean-inner', raw, '→', inner); return item; }
    var innerPad = inner.replace(/^0+/, '').padStart(7, '0').toLowerCase();
    item = scSessionItems.find(i => (i.barcode || '').toLowerCase() === innerPad);
    if (item) { console.log('SCAN MATCH: ean-inner-pad', raw, '→', innerPad); return item; }
  }
  // 5. Suffix match: scanned ends with DB barcode (case-insensitive)
  item = scSessionItems.find(i => i.barcode && rawLower.endsWith(i.barcode.toLowerCase()));
  if (item) { console.log('SCAN MATCH: suffix', raw, '→', item.barcode); return item; }
  console.warn('BARCODE NOT MATCHED:', raw, 'length:', raw.length, 'chars:', [...raw].map(function(c) { return c.charCodeAt(0); }));
  return null;
}

// ── Manual search + row click ────────────────────────────────
function manualBarcodeSearch() {
  const val = ($('sc-smart-search')?.value || '').trim();
  if (!val) return;
  // Exact barcode (all digits) — original behavior
  if (/^\d+$/.test(val)) {
    handleScan(scCountId, val);
    _scClearSearch();
    return;
  }
  // Non-barcode text: if filter shows exactly 1 result, auto-count it
  const lower = val.toLowerCase();
  const filtered = scSessionItems.filter(i =>
    (i.barcode || '').toLowerCase().includes(lower) ||
    (i.brand || '').toLowerCase().includes(lower) ||
    (i.model || '').toLowerCase().includes(lower) ||
    (i.color || '').toLowerCase().includes(lower));
  if (filtered.length === 1 && filtered[0].barcode) {
    handleScan(scCountId, filtered[0].barcode);
    _scClearSearch();
  }
}

function scRowClick(barcode) {
  if (!barcode) return;
  const item = scSessionItems.find(i => i.barcode === barcode);
  if (!item) { handleScan(scCountId, barcode); _scClearSearch(); return; }
  if (item.status === 'counted') { _showQtyModal(item); _scClearSearch(); return; }
  Modal.confirm({
    title: 'ספור פריט?',
    message: barcode + ' — ' + (item.brand || '') + ' — ' + (item.model || ''),
    confirmText: 'אישור', cancelText: 'ביטול',
    onConfirm: function () { handleScan(scCountId, barcode); _scClearSearch(); }
  });
}

function _scClearSearch() {
  const inp = $('sc-smart-search');
  if (inp) inp.value = '';
  _scRefreshTable();
}

// ── Scan handler ─────────────────────────────────────────────
async function handleScan(countId, barcode) {
  const now = Date.now();
  if (barcode === _lastScanCode && now - _lastScanTime < 2000) return;
  _lastScanCode = barcode; _lastScanTime = now;

  const item = _scNormalizeBarcode(barcode);
  if (!item) {
    unknownBarcodes.push({ barcode, time: new Date().toISOString() });
    // Global error cooldown — suppress toast spam from rapid misreads
    var errNow = Date.now();
    if (errNow - _lastErrorTime >= 3000) {
      toast('ברקוד לא קיים במלאי — הנח את הפריט בצד לבדיקת מנהל', 'w');
      _lastErrorTime = errNow;
    }
    return;
  }
  if (item.status === 'counted') {
    _showQtyModal(item);
    return;
  }
  // First scan — auto-count as 1
  await updateCountItem(item.id, 1);
}

// ── Quantity update modal (re-scan) ──────────────────────────
function _showQtyModal(item, fromCamera) {
  const bc = escapeHtml(item.barcode || '');
  const brand = escapeHtml(item.brand || '—');
  const model = escapeHtml(item.model || '—');
  const cur = item.actual_qty || 0;
  Modal.form({
    title: 'עדכון כמות',
    size: 'sm',
    submitText: 'עדכן',
    cancelText: 'ביטול',
    content: `
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:.85rem;color:var(--g500);margin-bottom:4px">${bc} — ${brand} — ${model}</div>
        <div style="font-size:.82rem;color:var(--g400)">כמות נוכחית: <strong>${cur}</strong></div>
      </div>
      <label style="display:block;font-weight:600;margin-bottom:6px;font-size:.9rem">כמה יחידות יש מפריט זה?</label>
      <input id="sc-qty-input" type="number" min="0" value="${cur}"
        style="width:100%;min-height:52px;font-size:22px;text-align:center;border:2px solid var(--g300);border-radius:8px;padding:10px">`,
    onSubmit: function (formEl) {
      var inp = formEl.querySelector('#sc-qty-input');
      var val = parseInt(inp?.value);
      if (isNaN(val) || val < 0) { toast('כמות לא תקינה', 'e'); return; }
      updateCountItem(item.id, val);
      if (fromCamera) _scResumeScanning();
    },
    onCancel: function () {
      if (fromCamera) _scResumeScanning();
    }
  });
  setTimeout(function () {
    var inp = document.getElementById('sc-qty-input');
    if (inp) { inp.focus(); inp.select(); }
  }, 100);
}

// ── Update count item ────────────────────────────────────────
async function updateCountItem(itemId, actualQty) {
  const worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
  try {
    const { error } = await sb.from(T.STOCK_COUNT_ITEMS).update({
      actual_qty: actualQty, status: 'counted',
      counted_at: new Date().toISOString(), scanned_by: worker.name || ''
    }).eq('id', itemId);
    if (error) throw error;
    const item = scSessionItems.find(i => i.id === itemId);
    if (item) { item.actual_qty = actualQty; item.status = 'counted'; item.scanned_by = worker.name || ''; }
    refreshSessionUI();
    toast('נספר: ' + (item?.barcode || ''), 's');
  } catch (err) { toast('שגיאה בעדכון: ' + err.message, 'e'); }
}

function refreshSessionUI() {
  const s = scCalcStats(scSessionItems);
  const el = id => document.getElementById(id);
  if (el('sc-s-pending')) el('sc-s-pending').textContent = s.total - s.counted;
  if (el('sc-s-counted')) el('sc-s-counted').textContent = s.counted;
  if (el('sc-s-diffs')) el('sc-s-diffs').textContent = s.diffs;
  if (el('sc-s-unknown')) el('sc-s-unknown').textContent = s.unknowns;
  if (el('sc-s-pct')) el('sc-s-pct').textContent = s.pct + '%';
  _scRefreshTable();
}

// ── Undo counted item ────────────────────────────────────────
async function undoCountItem(itemId) {
  const item = scSessionItems.find(i => i.id === itemId);
  if (!item) return;
  const yes = await confirmDialog('להחזיר פריט ' + (item.barcode || '') + ' למצב לא נספר?');
  if (!yes) return;
  try {
    const { error } = await sb.from(T.STOCK_COUNT_ITEMS).update({
      actual_qty: null, status: 'pending', counted_at: null, scanned_by: null
    }).eq('id', itemId);
    if (error) throw error;
    item.actual_qty = null; item.status = 'pending'; item.counted_at = null; item.scanned_by = null;
    refreshSessionUI();
    toast('הפריט הוחזר למצב ממתין', 's');
  } catch (err) { toast('שגיאה: ' + err.message, 'e'); }
}

// ── Pause session — save progress and return to list ─────────
async function pauseSession() {
  stopCamera();
  const yes = await confirmDialog('הספירה תישמר ותוכל להמשיך מאוחר יותר. להשהות?');
  if (!yes) return;
  toast('הספירה הושהתה — ניתן להמשיך מהרשימה', 's');
  loadStockCountTab();
}

// ── Finish session → check uncounted → diff report ───────────
async function finishSession(countId) {
  stopCamera();
  const pendingItems = scSessionItems.filter(i => i.status === 'pending');
  if (pendingItems.length === 0) {
    showDiffReport(countId);
    return;
  }
  // Show dialog asking what to do with uncounted items
  await _showUncountedDialog(countId, pendingItems);
}

function _showUncountedDialog(countId, pendingItems) {
  return new Promise(function (resolve) {
    const count = pendingItems.length;
    const modal = Modal.show({
      size: 'sm',
      title: 'פריטים שלא נסרקו',
      content: `
        <div style="text-align:center;margin-bottom:14px">
          <div style="font-size:2rem;margin-bottom:8px">&#9888;&#65039;</div>
          <p style="font-size:.92rem;color:var(--g700);margin-bottom:6px">
            יש <strong>${count}</strong> פריטים שלא נסרקו מתוך הספירה.</p>
          <p style="font-size:.85rem;color:var(--g500)">מה לעשות?</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button id="sc-uncounted-mark" class="btn btn-primary" style="width:100%;padding:10px;font-size:.9rem">
            &#10060; סמן כחוסרים (כמות 0)</button>
          <button id="sc-uncounted-leave" class="btn btn-secondary" style="width:100%;padding:10px;font-size:.9rem">
            &#8594; השאר כלא נספר</button>
        </div>`,
      closeOnEscape: true,
      closeOnBackdrop: true
    });

    document.getElementById('sc-uncounted-mark').addEventListener('click', async function () {
      modal.close();
      await _markUncountedAsShortages(countId, pendingItems);
      resolve();
    });
    document.getElementById('sc-uncounted-leave').addEventListener('click', function () {
      modal.close();
      showDiffReport(countId);
      resolve();
    });
  });
}

async function _markUncountedAsShortages(countId, pendingItems) {
  try {
    showLoading('מסמן חוסרים...');
    const worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
    const ids = pendingItems.map(i => i.id);
    const { error } = await sb.from(T.STOCK_COUNT_ITEMS).update({
      actual_qty: 0, status: 'counted',
      counted_at: new Date().toISOString(), scanned_by: worker.name || ''
    }).in('id', ids).eq('count_id', countId);
    if (error) throw error;
    // Update local state
    pendingItems.forEach(function (p) {
      p.actual_qty = 0; p.status = 'counted';
      p.scanned_by = worker.name || '';
    });
    toast(ids.length + ' פריטים סומנו כחוסרים', 's');
  } catch (err) {
    toast('שגיאה בעדכון: ' + err.message, 'e');
  } finally { hideLoading(); }
  showDiffReport(countId);
}
