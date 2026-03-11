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
  const emp = await verifyEmployeePIN(pin);
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
    try {
      showLoading('יוצר ספירה חדשה...');
      const countNumber = await generateCountNumber();
      const { data: count, error } = await sb.from(T.STOCK_COUNTS).insert({
        count_number: countNumber,
        status: 'in_progress',
        count_date: new Date().toISOString().slice(0, 10),
        branch_id: branchCode || '00',
        counted_by: activeWorker.name
      }).select().single();
      if (error) throw error;

      const inventory = await fetchAll(T.INV,
        [['is_deleted', 'eq', false], ['quantity', 'gt', 0]]);
      const items = inventory.map(inv => ({
        count_id: count.id,
        inventory_id: inv.id,
        barcode: inv.barcode || '',
        brand: brandCacheRev[inv.brand_id] || '',
        model: inv.model || '',
        color: inv.color || '',
        size: inv.size || '',
        expected_qty: inv.quantity || 0,
        status: 'pending'
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
}

// ── Create new count (shared by session-skip and confirmWorkerPin paths)
async function _createNewStockCount() {
  try {
    showLoading('יוצר ספירה חדשה...');
    const countNumber = await generateCountNumber();
    const { data: count, error } = await sb.from(T.STOCK_COUNTS).insert({
      count_number: countNumber,
      status: 'in_progress',
      count_date: new Date().toISOString().slice(0, 10),
      branch_id: branchCode || '00',
      counted_by: activeWorker.name
    }).select().single();
    if (error) throw error;
    const inventory = await fetchAll(T.INV,
      [['is_deleted', 'eq', false], ['quantity', 'gt', 0]]);
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

// ── Session screen ───────────────────────────────────────────
async function openCountSession(countId) {
  scCountId = countId;
  try {
    showLoading('טוען ספירה...');
    const { data: countRow } = await sb.from(T.STOCK_COUNTS)
      .select('*').eq('id', countId).single();
    scCountNumber = countRow?.count_number || '';
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
  return `<tr class="${cls}" data-barcode="${escapeHtml(it.barcode || '')}">
    <td style="font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
    <td>${escapeHtml(it.brand || '—')}</td><td>${escapeHtml(it.model || '—')}</td>
    <td style="text-align:center;font-weight:700">${it.status === 'counted' ? it.actual_qty : '—'}</td>
    <td style="text-align:center;font-weight:700">${diff !== null ? (diff > 0 ? '+' : '') + diff : '—'}</td>
    <td style="text-align:center">${st}</td></tr>`;
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
        </div>
        <button class="sc-btn-finish" onclick="finishSession('${escapeHtml(countId)}')">&#9989; סיום ספירה</button>
      </div>
      <div class="sc-camera-section">
        <button class="sc-btn-camera" onclick="startCamera()" id="sc-cam-btn">&#128247; סרוק ברקוד</button>
        <video id="sc-video" style="display:none" playsinline></video>
        <button id="sc-cam-stop" style="display:none;margin:8px auto;min-height:40px;font-size:15px" class="btn btn-d" onclick="stopCamera()">&#10006; עצור מצלמה</button>
        <div class="sc-manual-bar">
          <input id="sc-smart-search" type="text" placeholder="ברקוד / מותג / דגם / צבע" oninput="filterSessionItems(this.value)">
          <button class="btn btn-p" style="min-height:48px;font-size:16px" onclick="manualBarcodeSearch()">&#128269; חפש</button>
        </div>
      </div>
      <div class="sc-summary-bar">
        <div class="sc-stat"><strong id="sc-s-counted">${s.counted}</strong><span style="font-size:.78rem;color:var(--g500)">נספרו מתוך ${s.total}</span></div>
        <div class="sc-stat"><strong id="sc-s-diffs" style="color:var(--error)">${s.diffs}</strong><span style="font-size:.78rem;color:var(--g500)">פערים</span></div>
        <div class="sc-stat"><strong id="sc-s-pct">${s.pct}%</strong><span style="font-size:.78rem;color:var(--g500)">התקדמות</span></div>
      </div>
      <div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:var(--primary);color:white;text-align:right">
            <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
            <th style="padding:8px;text-align:center">בפועל</th><th style="padding:8px;text-align:center">פער</th>
            <th style="padding:8px;text-align:center">סטטוס</th>
          </tr></thead>
          <tbody id="sc-session-body">${items.map(scRenderItemRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
  $('sc-smart-search')?.addEventListener('keydown', e => { if (e.key === 'Enter') manualBarcodeSearch(); });
}

function renderSessionTable(items) {
  const tbody = document.getElementById('sc-session-body');
  if (tbody) tbody.innerHTML = items.map(scRenderItemRow).join('');
}

function filterSessionItems(query) {
  const q = (query || '').trim();
  if (!q) { renderSessionTable(scSessionItems); return; }
  if (/^\d+$/.test(q)) return; // digits only — wait for Enter/button click
  const lower = q.toLowerCase();
  const filtered = scSessionItems.filter(i =>
    (i.brand || '').toLowerCase().includes(lower) ||
    (i.model || '').toLowerCase().includes(lower) ||
    (i.color || '').toLowerCase().includes(lower) ||
    (i.barcode || '').includes(lower));
  renderSessionTable(filtered);
}

function manualBarcodeSearch() {
  const val = ($('sc-smart-search')?.value || '').trim();
  if (!val) { toast('הזן ברקוד או חיפוש', 'w'); return; }
  if (/^\d+$/.test(val)) {
    handleScan(scCountId, val);
    $('sc-smart-search').value = '';
    renderSessionTable(scSessionItems);
  }
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

// ── Scan handler ─────────────────────────────────────────────
async function handleScan(countId, barcode) {
  const now = Date.now();
  if (barcode === _lastScanCode && now - _lastScanTime < 2000) return;
  _lastScanCode = barcode; _lastScanTime = now;

  const item = scSessionItems.find(i => i.barcode === barcode);
  if (!item) {
    unknownBarcodes.push({ barcode, time: new Date().toISOString() });
    toast('ברקוד לא קיים במלאי — הנח את הפריט בצד לבדיקת מנהל', 'w');
    return;
  }
  if (item.status === 'counted') {
    const yes = await confirmDialog('ברקוד כבר נסרק. האם להוסיף עוד 1?');
    if (yes) await updateCountItem(item.id, (item.actual_qty || 0) + 1);
    return;
  }
  const qty = prompt('הזן כמות בפועל עבור ברקוד ' + barcode + ':', '1');
  if (qty === null) return;
  const parsed = parseInt(qty);
  if (isNaN(parsed) || parsed < 0) { toast('כמות לא תקינה', 'e'); return; }
  await updateCountItem(item.id, parsed);
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
  if (el('sc-s-counted')) el('sc-s-counted').textContent = s.counted;
  if (el('sc-s-diffs')) el('sc-s-diffs').textContent = s.diffs;
  if (el('sc-s-pct')) el('sc-s-pct').textContent = s.pct + '%';
  renderSessionTable(scSessionItems);
}

// ── Finish session → diff report ─────────────────────────────
function finishSession(countId) {
  stopCamera();
  showDiffReport(countId);
}
