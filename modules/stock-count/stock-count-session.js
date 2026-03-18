// ============================================================
// stock-count-session.js — Stock Count session: PIN, camera, scanning
// ============================================================

// ── State ────────────────────────────────────────────────────
let scSessionItems = [];
let scCountId = null;
let scCountNumber = '';
let unknownBarcodes = [];
let activeWorker = null;
let scCodeReader = null;
let _lastScanCode = '', _lastScanTime = 0;
let _scStatusFilter = 'pending'; // 'pending' | 'counted' | 'diffs' | null (all)

// ── Worker PIN entry ─────────────────────────────────────────
function openWorkerPin(countId) {
  scCountId = countId;
  // Skip PIN modal if already logged in
  const emp = getCurrentEmployee();
  if (emp) {
    activeWorker = { id: emp.id, name: emp.name };
    sessionStorage.setItem('activeWorker', JSON.stringify(activeWorker));
    if (scCountId) {
      openCountSession(scCountId);
    } else {
      _createNewStockCount();
    }
    return;
  }
  const tab = document.getElementById('tab-stock-count');
  tab.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;padding:20px">
      <div style="background:var(--white);border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);
                  width:100%;max-width:360px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">&#128100;</div>
        <h2 style="margin-bottom:20px;color:var(--primary)">מי סורק?</h2>
        <input id="sc-pin-input" type="password" inputmode="numeric" maxlength="5"
               placeholder="הזן PIN עובד" autocomplete="off"
               style="width:100%;min-height:48px;font-size:20px;text-align:center;border:2px solid var(--g300);
                      border-radius:var(--radius);padding:12px;margin-bottom:16px;letter-spacing:8px">
        <div id="sc-pin-error" style="color:var(--error);font-size:.85rem;margin-bottom:12px;min-height:20px"></div>
        <button onclick="confirmWorkerPin()" class="btn btn-p"
                style="width:100%;min-height:48px;font-size:16px;margin-bottom:10px">&#9989; אישור</button>
        <button onclick="showTab('stock-count')" class="btn btn-g"
                style="width:100%;min-height:48px;font-size:15px">&#8592; חזרה לרשימה</button>
      </div>
    </div>`;
  setTimeout(() => { const inp = $('sc-pin-input'); if (inp) inp.focus(); }, 100);
  $('sc-pin-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmWorkerPin(); });
}

async function confirmWorkerPin() {
  const pin = ($('sc-pin-input')?.value || '').trim();
  if (!pin) { $('sc-pin-error').textContent = 'יש להזין PIN'; return; }
  const emp = await verifyPinOnly(pin);
  if (!emp) {
    $('sc-pin-error').textContent = 'PIN שגוי';
    $('sc-pin-input').value = '';
    $('sc-pin-input').focus();
    return;
  }
  activeWorker = { id: emp.id, name: emp.name };
  sessionStorage.setItem('activeWorker', JSON.stringify(activeWorker));

  if (scCountId) {
    // Resuming existing count
    openCountSession(scCountId);
  } else {
    // New count — create in DB after PIN verified
    _createNewStockCount();
  }
}

// ── Create new count (shared by session-skip and confirmWorkerPin paths)
async function _createNewStockCount() {
  try {
    showLoading('יוצר ספירה חדשה...');
    const countNumber = await generateCountNumber();
    const fc = (typeof _scFilterCriteria !== 'undefined') ? _scFilterCriteria : {};
    const hasFilters = fc.brands?.length || fc.product_types?.length || fc.supplier_id || fc.price_min || fc.price_max;
    const insertObj = {
      count_number: countNumber,
      status: 'in_progress',
      count_date: new Date().toISOString().slice(0, 10),
      branch_id: branchCode || '00',
      counted_by: activeWorker.name,
      tenant_id: getTenantId()
    };
    if (hasFilters) insertObj.filter_criteria = fc;

    const { data: count, error } = await sb.from(T.STOCK_COUNTS).insert(insertObj).select().single();
    if (error) throw error;

    // Build inventory filters
    var invFilters = [['is_deleted', 'eq', false], ['quantity', 'gt', 0]];
    if (fc.brands?.length) invFilters.push(['brand_id', 'in', fc.brands]);
    if (fc.product_types?.length) invFilters.push(['product_type', 'in', fc.product_types]);
    if (fc.supplier_id) invFilters.push(['supplier_id', 'eq', fc.supplier_id]);
    if (fc.price_min) invFilters.push(['cost_price', 'gte', fc.price_min]);
    if (fc.price_max) invFilters.push(['cost_price', 'lte', fc.price_max]);

    const inventory = await fetchAll(T.INV, invFilters);
    const items = inventory.map(inv => ({
      count_id: count.id, inventory_id: inv.id,
      barcode: inv.barcode || '', brand: brandCacheRev[inv.brand_id] || '',
      model: inv.model || '', color: inv.color || '', size: inv.size || '',
      expected_qty: inv.quantity || 0, status: 'pending'
    }));
    if (items.length) await batchCreate(T.STOCK_COUNT_ITEMS, items);
    toast('ספירה ' + countNumber + ' נוצרה — ' + items.length + ' פריטים', 's');
    openCountSession(count.id);
  } catch (err) {
    toast('שגיאה ביצירת ספירה: ' + err.message, 'e');
  } finally {
    hideLoading();
  }
}

function _scBuildFilterDesc(fc) {
  if (!fc) return '';
  var parts = [];
  if (fc.brands?.length) parts.push('\u05DE\u05D5\u05EA\u05D2\u05D9\u05DD: ' + fc.brands.length);
  if (fc.product_types?.length) {
    var ptMap = { eyeglasses: '\u05DE\u05E9\u05E7\u05E4\u05D9 \u05E8\u05D0\u05D9\u05D9\u05D4', sunglasses: '\u05DE\u05E9\u05E7\u05E4\u05D9 \u05E9\u05DE\u05E9' };
    parts.push('\u05E1\u05D5\u05D2: ' + fc.product_types.map(p => ptMap[p] || p).join(', '));
  }
  if (fc.supplier_id) parts.push('\u05E1\u05E4\u05E7 \u05DE\u05E1\u05D5\u05E0\u05DF');
  if (fc.price_min || fc.price_max) parts.push('\u05DE\u05D7\u05D9\u05E8: ' + (fc.price_min || 0) + '–' + (fc.price_max || '\u221E'));
  return parts.length ? '\u05E1\u05E4\u05D9\u05E8\u05D4 \u05DC\u05E4\u05D9: ' + parts.join(' | ') : '';
}

// ── Session screen ───────────────────────────────────────────
async function openCountSession(countId) {
  scCountId = countId;
  try {
    showLoading('טוען ספירה...');
    const { data: countRow } = await sb.from(T.STOCK_COUNTS)
      .select('*').eq('id', countId).single();
    scCountNumber = countRow?.count_number || '';
    window._scActiveFilterDesc = _scBuildFilterDesc(countRow?.filter_criteria);
    const items = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);
    scSessionItems = items || [];
    renderSessionScreen(countId, scSessionItems);
  } catch (err) {
    toast('שגיאה בטעינת ספירה: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Shared row renderer ──────────────────────────────────────
function scRenderItemRow(it) {
  const diff = it.status === 'counted' ? (it.actual_qty - it.expected_qty) : null;
  const cls = it.status === 'pending' ? 'sc-row-pending'
    : diff === 0 ? 'sc-row-ok'
    : Math.abs(diff) <= 2 ? 'sc-row-warn' : 'sc-row-diff';
  const st = it.status === 'counted' ? 'נספר' : 'ממתין';
  const bc = escapeHtml(it.barcode || '');
  const undo = it.status === 'counted'
    ? `<button class="btn btn-sm" onclick="event.stopPropagation();undoCountItem('${escapeHtml(it.id)}')" style="font-size:.72rem;padding:2px 6px;color:var(--g500)" title="ביטול ספירה">&#8617;&#65039;</button>`
    : '';
  return `<tr class="${cls}" data-barcode="${bc}"
    style="cursor:pointer" onclick="scRowClick('${bc}')"
    onmouseenter="this.style.background='#e3edf9'" onmouseleave="this.style.background=''">
    <td style="font-weight:600;font-size:.85rem">${bc || '—'}</td>
    <td>${escapeHtml(it.brand || '—')}</td><td>${escapeHtml(it.model || '—')}</td>
    <td style="text-align:center;font-weight:700">${it.status === 'counted' ? it.actual_qty : '—'}</td>
    <td style="text-align:center;font-weight:700">${diff !== null ? (diff > 0 ? '+' : '') + diff : '—'}</td>
    <td style="text-align:center">${st} ${undo}</td></tr>`;
}

function scCalcStats(items) {
  const counted = items.filter(i => i.status === 'counted').length;
  const total = items.length;
  const diffs = items.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty).length;
  return { counted, total, diffs, pct: total ? Math.round(counted / total * 100) : 0 };
}

function renderSessionScreen(countId, items) {
  const worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
  const s = scCalcStats(items);
  const tab = document.getElementById('tab-stock-count');
  tab.innerHTML = `
    <div style="padding:8px 12px;max-width:800px;margin:0 auto">
      <div class="sc-session-topbar">
        <div>
          <div style="font-size:1.1rem;font-weight:700">${escapeHtml(scCountNumber)}</div>
          <div class="sc-worker-badge">&#128100; ${escapeHtml(worker.name || '—')}</div>
          ${window._scActiveFilterDesc ? '<div style="font-size:.78rem;color:var(--g500);margin-top:2px">' + escapeHtml(window._scActiveFilterDesc) + '</div>' : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="sc-btn-finish" onclick="finishSession('${escapeHtml(countId)}')">&#9989; סיום ספירה</button>
          <button class="btn btn-g" style="min-height:40px;font-size:14px;padding:6px 14px" onclick="pauseSession()">&#9208;&#65039; השהה</button>
        </div>
      </div>
      <div class="sc-camera-section">
        <button class="sc-btn-camera" onclick="startCamera()" id="sc-cam-btn">&#128247; סרוק ברקוד</button>
        <video id="sc-video" style="display:none" playsinline></video>
        <button id="sc-cam-stop" style="display:none;margin:8px auto;min-height:40px;font-size:15px" class="btn btn-d" onclick="stopCamera()">&#10006; עצור מצלמה</button>
        <div class="sc-manual-bar">
          <input id="sc-smart-search" type="text" placeholder="ברקוד / מותג / דגם / צבע" oninput="_scDebouncedFilter(this.value)">
        </div>
        <div id="sc-filter-count" style="font-size:.82rem;color:var(--g500);margin:4px 8px 0;min-height:18px"></div>
      </div>
      <div class="sc-summary-bar" style="cursor:pointer;user-select:none">
        <div class="sc-stat sc-filter-box${_scStatusFilter === 'pending' ? ' sc-filter-active' : ''}" onclick="_scToggleStatusFilter('pending')" title="הצג לא נספרו בלבד">
          <strong id="sc-s-pending">${s.total - s.counted}</strong><span style="font-size:.78rem;color:var(--g500)">לא נספרו</span></div>
        <div class="sc-stat sc-filter-box${_scStatusFilter === 'counted' ? ' sc-filter-active' : ''}" onclick="_scToggleStatusFilter('counted')" title="הצג נספרו בלבד">
          <strong id="sc-s-counted">${s.counted}</strong><span style="font-size:.78rem;color:var(--g500)">נספרו</span></div>
        <div class="sc-stat sc-filter-box${_scStatusFilter === 'diffs' ? ' sc-filter-active' : ''}" onclick="_scToggleStatusFilter('diffs')" title="הצג פערים בלבד">
          <strong id="sc-s-diffs" style="color:var(--error)">${s.diffs}</strong><span style="font-size:.78rem;color:var(--g500)">פערים</span></div>
        <div class="sc-stat"><strong id="sc-s-pct">${s.pct}%</strong><span style="font-size:.78rem;color:var(--g500)">התקדמות</span></div>
      </div>
      <div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:var(--primary);color:white;text-align:right">
            <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
            <th style="padding:8px;text-align:center">בפועל</th><th style="padding:8px;text-align:center">פער</th>
            <th style="padding:8px;text-align:center">סטטוס</th>
          </tr></thead>
          <tbody id="sc-session-body">${_scApplyFilters(items).map(scRenderItemRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
  $('sc-smart-search')?.addEventListener('keydown', e => { if (e.key === 'Enter') manualBarcodeSearch(); });
}

function _scApplyFilters(items) {
  var result = items;
  if (_scStatusFilter === 'pending') result = result.filter(i => i.status === 'pending');
  else if (_scStatusFilter === 'counted') result = result.filter(i => i.status === 'counted');
  else if (_scStatusFilter === 'diffs') result = result.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty);
  return result;
}

function renderSessionTable(items) {
  const tbody = document.getElementById('sc-session-body');
  if (tbody) tbody.innerHTML = _scApplyFilters(items).map(scRenderItemRow).join('');
}

function _scToggleStatusFilter(filter) {
  _scStatusFilter = (_scStatusFilter === filter) ? null : filter;
  // Update active box styles
  document.querySelectorAll('.sc-filter-box').forEach(function (el) {
    el.classList.remove('sc-filter-active');
  });
  if (_scStatusFilter) {
    var boxes = document.querySelectorAll('.sc-filter-box');
    var idx = { pending: 0, counted: 1, diffs: 2 }[_scStatusFilter];
    if (boxes[idx]) boxes[idx].classList.add('sc-filter-active');
  }
  _scRefreshTable();
}

function _scRefreshTable() {
  var q = ($('sc-smart-search')?.value || '').trim();
  var countEl = document.getElementById('sc-filter-count');
  if (!q) {
    renderSessionTable(scSessionItems);
    if (countEl) countEl.textContent = '';
  } else {
    filterSessionItems(q);
  }
}

let _scFilterTimer = null;
function _scDebouncedFilter(query) {
  clearTimeout(_scFilterTimer);
  _scFilterTimer = setTimeout(() => filterSessionItems(query), 300);
}

function filterSessionItems(query) {
  const q = (query || '').trim();
  const countEl = document.getElementById('sc-filter-count');
  if (!q) {
    renderSessionTable(scSessionItems);
    if (countEl) countEl.textContent = '';
    return;
  }
  const lower = q.toLowerCase();
  const filtered = scSessionItems.filter(i =>
    (i.barcode || '').toLowerCase().includes(lower) ||
    (i.brand || '').toLowerCase().includes(lower) ||
    (i.model || '').toLowerCase().includes(lower) ||
    (i.color || '').toLowerCase().includes(lower));
  const tbody = document.getElementById('sc-session-body');
  if (tbody) tbody.innerHTML = _scApplyFilters(filtered).map(scRenderItemRow).join('');
  if (countEl) countEl.textContent = '\u05DE\u05E6\u05D9\u05D2 ' + filtered.length + ' \u05DE\u05EA\u05D5\u05DA ' + scSessionItems.length + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD';
}

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

// ── Camera / ZXing ───────────────────────────────────────────
async function startCamera() {
  const video = $('sc-video');
  if (!video) return;
  try {
    video.style.display = 'block';
    $('sc-cam-btn').style.display = 'none';
    $('sc-cam-stop').style.display = 'block';
    scCodeReader = new ZXing.BrowserMultiFormatReader();
    await scCodeReader.decodeFromVideoDevice(null, 'sc-video', (result) => {
      if (result) handleScan(scCountId, result.getText());
    });
  } catch (err) {
    toast('לא ניתן להפעיל מצלמה — השתמש בהזנה ידנית', 'w');
    stopCamera();
  }
}

function stopCamera() {
  if (scCodeReader) { scCodeReader.reset(); scCodeReader = null; }
  const video = $('sc-video');
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  if ($('sc-cam-btn')) $('sc-cam-btn').style.display = '';
  if ($('sc-cam-stop')) $('sc-cam-stop').style.display = 'none';
}

// ── Barcode normalization (ZXing → DB format) ────────────────
function _scNormalizeBarcode(scanned) {
  const raw = (scanned || '').trim();
  // 1. Exact match
  var item = scSessionItems.find(i => i.barcode === raw);
  if (item) { console.log('SCAN MATCH: exact', raw); return item; }
  // 2. Strip leading zeros and re-pad to 7 digits (BBDDDDD)
  var stripped = raw.replace(/^0+/, '') || '0';
  var padded7 = stripped.padStart(7, '0');
  item = scSessionItems.find(i => i.barcode === padded7);
  if (item) { console.log('SCAN MATCH: pad7', raw, '→', padded7); return item; }
  // 3. EAN-13: last digit is check digit — try without it
  if (raw.length >= 8) {
    var noCheck = raw.slice(0, -1);
    var noCheckPad = noCheck.replace(/^0+/, '').padStart(7, '0');
    item = scSessionItems.find(i => i.barcode === noCheckPad);
    if (item) { console.log('SCAN MATCH: ean-strip', raw, '→', noCheckPad); return item; }
  }
  // 4. EAN-13 embedded: last 7 non-check digits
  if (raw.length >= 8) {
    var inner = raw.slice(-8, -1);  // 7 digits before check digit
    item = scSessionItems.find(i => i.barcode === inner);
    if (item) { console.log('SCAN MATCH: ean-inner', raw, '→', inner); return item; }
    var innerPad = inner.replace(/^0+/, '').padStart(7, '0');
    item = scSessionItems.find(i => i.barcode === innerPad);
    if (item) { console.log('SCAN MATCH: ean-inner-pad', raw, '→', innerPad); return item; }
  }
  // 5. Suffix match: scanned ends with DB barcode
  item = scSessionItems.find(i => i.barcode && raw.endsWith(i.barcode));
  if (item) { console.log('SCAN MATCH: suffix', raw, '→', item.barcode); return item; }
  console.log('SCAN NO MATCH:', raw, 'len=' + raw.length);
  return null;
}

// ── Scan handler ─────────────────────────────────────────────
async function handleScan(countId, barcode) {
  const now = Date.now();
  if (barcode === _lastScanCode && now - _lastScanTime < 2000) return;
  _lastScanCode = barcode; _lastScanTime = now;

  const item = _scNormalizeBarcode(barcode);
  if (!item) {
    unknownBarcodes.push({ barcode, time: new Date().toISOString() });
    toast('ברקוד לא קיים במלאי — הנח את הפריט בצד לבדיקת מנהל', 'w');
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
function _showQtyModal(item) {
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

// ── Finish session → diff report ─────────────────────────────
function finishSession(countId) {
  stopCamera();
  showDiffReport(countId);
}
