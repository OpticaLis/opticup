// ============================================================
// stock-count-camera.js — Camera hardware, ZXing overlay, zoom, unknown item form
// Depends on: stock-count-session.js (state variables)
// Depends on: stock-count-scan.js (_scNormalizeBarcode, updateCountItem, refreshSessionUI)
// ============================================================

// ── Camera-only state ──────────────────────────────────────
var _scCamQtyItem = null;
var _scNotFoundBarcode = '';

// ── Camera / ZXing — Fullscreen overlay ──────────────────────
async function startCamera() {
  _scanPaused = false;
  _scZoomLevel = 1;
  _scCamStream = null;
  if (_scanPauseTimer) { clearTimeout(_scanPauseTimer); _scanPauseTimer = null; }
  var overlay = document.createElement('div');
  overlay.id = 'sc-cam-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;height:100vh;height:-webkit-fill-available;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden';
  overlay.innerHTML = `
    <video id="sc-video-fs" playsinline autoplay muted
      style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;right:0;bottom:0"></video>
    <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:12px;z-index:10002">
      <button id="sc-cam-zoom" style="display:none;width:52px;height:52px;border-radius:50%;border:none;background:rgba(0,0,0,.55);
        color:#fff;font-size:18px;font-weight:700;cursor:pointer;backdrop-filter:blur(4px)">1x</button>
      <button id="sc-cam-close" style="width:52px;height:52px;border-radius:50%;border:none;background:rgba(0,0,0,.55);
        color:#fff;font-size:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px)">✕</button>
    </div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10001">
      <div id="sc-viewfinder" style="width:260px;height:120px;border:2px solid rgba(255,255,255,.5);border-radius:12px;box-shadow:0 0 0 4000px rgba(0,0,0,.35)"></div>
    </div>
    <div id="sc-cam-hint" style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:28px 16px;z-index:10001;
      background:linear-gradient(transparent,rgba(0,0,0,.7))">
      <span style="color:rgba(255,255,255,.85);font-size:1rem;font-weight:500">כוון את המצלמה לברקוד</span>
    </div>
    <div id="sc-cam-status" style="position:absolute;bottom:60px;left:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;font-size:14px;padding:8px 12px;border-radius:8px;text-align:center;z-index:10004">סורק...</div>
    ${SC_DEBUG ? '<div id="sc-scan-debug" style="position:absolute;bottom:100px;left:10px;right:10px;background:rgba(0,0,0,0.8);color:#0f0;font-family:monospace;font-size:13px;padding:10px;border-radius:8px;max-height:150px;overflow-y:auto;z-index:10004;direction:ltr;text-align:left">DEBUG</div>' : ''}
    <div id="sc-cam-success" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;z-index:10003;
      flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(2px)">
      <div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)">
        <div style="font-size:2.5rem;margin-bottom:8px">✅</div>
        <div id="sc-cam-success-text" style="font-size:1rem;font-weight:600;color:var(--primary);margin-bottom:16px"></div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button id="sc-cam-resume" style="min-height:48px;padding:10px 24px;font-size:1rem;font-weight:600;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;flex:1;min-width:120px">המשך סריקה</button>
          <button id="sc-cam-done" style="min-height:48px;padding:10px 24px;font-size:1rem;font-weight:600;border:2px solid var(--g300);border-radius:10px;background:#fff;color:var(--g700);cursor:pointer;flex:1;min-width:100px">✕ סגור</button>
        </div>
      </div>
    </div>
    <div id="sc-cam-qty" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;z-index:10003;
      flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(2px)">
      <div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)">
        <div style="font-size:1.8rem;margin-bottom:8px">🔄</div>
        <div id="sc-cam-qty-info" style="font-size:.9rem;font-weight:600;color:var(--primary);margin-bottom:4px"></div>
        <div id="sc-cam-qty-cur" style="font-size:.82rem;color:var(--g500);margin-bottom:12px"></div>
        <label style="display:block;font-weight:600;margin-bottom:6px;font-size:.9rem">כמה יחידות יש מפריט זה?</label>
        <input id="sc-cam-qty-input" type="number" min="0" inputmode="numeric"
          style="width:100%;min-height:52px;font-size:22px;text-align:center;border:2px solid var(--g300);border-radius:8px;padding:10px;margin-bottom:14px">
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button id="sc-cam-qty-save" style="min-height:48px;padding:10px 24px;font-size:1rem;font-weight:600;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;flex:1;min-width:100px">עדכן</button>
          <button id="sc-cam-qty-skip" style="min-height:48px;padding:10px 16px;font-size:.9rem;font-weight:600;border:2px solid var(--g300);border-radius:10px;background:#fff;color:var(--g700);cursor:pointer;flex:1;min-width:100px">המשך בלי שינוי</button>
          <button id="sc-cam-qty-close" style="min-height:48px;padding:10px 16px;font-size:.9rem;font-weight:600;border:2px solid var(--g300);border-radius:10px;background:#fff;color:var(--g700);cursor:pointer;flex:1;min-width:80px">✕ סגור</button>
        </div>
      </div>
    </div>
    <div id="sc-cam-notfound" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;z-index:10003;
      flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(2px)">
      <div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)">
        <div style="font-size:2rem;margin-bottom:8px">⚠️</div>
        <div style="font-size:1rem;font-weight:600;color:#d97706;margin-bottom:4px">ברקוד לא נמצא ברשימה</div>
        <div id="sc-cam-nf-barcode" style="font-size:.9rem;color:var(--g500);margin-bottom:16px;direction:ltr"></div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button id="sc-cam-nf-add" style="min-height:48px;padding:10px 18px;font-size:.95rem;font-weight:600;border:none;border-radius:10px;background:#d97706;color:#fff;cursor:pointer;flex:1;min-width:140px">+ הוסף פריט לא ידוע</button>
          <button id="sc-cam-nf-skip" style="min-height:48px;padding:10px 18px;font-size:.9rem;font-weight:600;border:2px solid var(--g300);border-radius:10px;background:#fff;color:var(--g700);cursor:pointer;flex:1;min-width:100px">המשך סריקה</button>
        </div>
      </div>
    </div>
    <div id="sc-cam-unknown" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;z-index:10003;
      flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(2px);overflow-y:auto">
      <div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:380px;width:92%;text-align:right;box-shadow:0 8px 32px rgba(0,0,0,.3);margin:20px 0">
        <div style="text-align:center;font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:12px">הוספת פריט לא ידוע</div>
        <div style="font-size:.82rem;color:var(--g500);margin-bottom:10px;text-align:center" id="sc-unk-barcode-label"></div>
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">מותג</label>
        <input id="sc-unk-brand" type="text" style="width:100%;min-height:42px;font-size:16px;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:10px">
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">דגם</label>
        <input id="sc-unk-model" type="text" style="width:100%;min-height:42px;font-size:16px;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:10px">
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">צבע</label>
        <input id="sc-unk-color" type="text" style="width:100%;min-height:42px;font-size:16px;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:10px">
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">גודל</label>
        <input id="sc-unk-size" type="text" style="width:100%;min-height:42px;font-size:16px;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:10px">
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">כמות</label>
        <input id="sc-unk-qty" type="number" min="1" value="1" inputmode="numeric" style="width:100%;min-height:42px;font-size:18px;text-align:center;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:10px">
        <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px">הערות</label>
        <input id="sc-unk-notes" type="text" placeholder="לדוגמא: נמצא על מדף 3" style="width:100%;min-height:42px;font-size:16px;border:2px solid var(--g300);border-radius:8px;padding:8px;margin-bottom:14px">
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button id="sc-cam-unk-save" style="min-height:48px;padding:10px 20px;font-size:1rem;font-weight:600;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;flex:1;min-width:100px">שמור</button>
          <button id="sc-cam-unk-cancel" style="min-height:48px;padding:10px 16px;font-size:.9rem;font-weight:600;border:2px solid var(--g300);border-radius:10px;background:#fff;color:var(--g700);cursor:pointer;flex:1;min-width:80px">ביטול</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('sc-cam-close').addEventListener('click', function () { stopCamera(); });
  document.getElementById('sc-cam-resume').addEventListener('click', function () { _scResumeScanning(); });
  document.getElementById('sc-cam-done').addEventListener('click', function () { stopCamera(); });
  document.getElementById('sc-cam-qty-save').addEventListener('click', function () { _scCamQtySave(); });
  document.getElementById('sc-cam-qty-skip').addEventListener('click', function () { _scCamQtyDismiss(); });
  document.getElementById('sc-cam-qty-close').addEventListener('click', function () { stopCamera(); });
  document.getElementById('sc-cam-zoom').addEventListener('click', function () { _scToggleZoom(); });
  document.getElementById('sc-cam-nf-add').addEventListener('click', function () { _scShowUnknownForm(); });
  document.getElementById('sc-cam-nf-skip').addEventListener('click', function () { _scResumeScanning(); });
  document.getElementById('sc-cam-unk-save').addEventListener('click', function () { _scSaveUnknownItem(); });
  document.getElementById('sc-cam-unk-cancel').addEventListener('click', function () { _scResumeScanning(); });

  try {
    scCodeReader = new ZXing.BrowserMultiFormatReader();
    _scDebugLog('ZXing initialized');
    var constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
    var stream = await navigator.mediaDevices.getUserMedia(constraints);
    _scCamStream = stream;
    _scDebugLog('Camera stream acquired');
    _scInitZoom(stream);
    var videoEl = document.getElementById('sc-video-fs');
    videoEl.srcObject = stream;
    await scCodeReader.decodeFromStream(stream, videoEl, function (result) {
      try {
        if (!result) return;
        var raw = result.getText();
        var cleaned = raw.replace(/[^\x20-\x7E]/g, '').trim();
        if (!/^[A-Za-z0-9\-]{4,}$/.test(cleaned)) {
          _scDebugLog('IGNORED: "' + raw.replace(/[^\x20-\x7E]/g, '?') + '" len:' + raw.length);
          return;
        }
        raw = cleaned;
        // Camera-level debounce: skip if same barcode within 2s
        var now = Date.now();
        if (raw === _lastScanCode && now - _lastScanTime < 2000) return;
        _lastScanCode = raw; _lastScanTime = now;
        _scDebugLog('Read: ' + raw + (_scanPaused ? ' [PAUSED]' : ''));
        if (_scanPaused) return;
        var vf = document.getElementById('sc-viewfinder');
        if (vf) { vf.style.borderColor = '#22c55e'; vf.style.boxShadow = '0 0 20px rgba(34,197,94,.6), 0 0 0 4000px rgba(0,0,0,.35)'; }
        _scanPaused = true;
        _scStartPauseTimer();
        _scHandleCameraScan(raw);
      } catch (cbErr) {
        _scDebugLog('CALLBACK ERR: ' + cbErr.message);
        _scanPaused = false;
        if (_scanPauseTimer) { clearTimeout(_scanPauseTimer); _scanPauseTimer = null; }
      }
    });
    _scDebugLog('Decode started');
    _scSetStatus('סורק...');
  } catch (err) {
    console.warn('Camera error:', err);
    _scDebugLog('CAM ERROR: ' + err.message);
    _scSetStatus('שגיאת מצלמה: ' + err.message);
    toast('שגיאת מצלמה: ' + err.message, 'w');
  }
}

// ── Minimal status line + optional debug ──────────────────────
function _scSetStatus(text) { var el = document.getElementById('sc-cam-status'); if (el) el.textContent = text; }

function _scDebugLog(msg) {
  if (!SC_DEBUG) return;
  var dbg = document.getElementById('sc-scan-debug');
  if (!dbg) return;
  dbg.innerHTML = new Date().toLocaleTimeString('he-IL') + ' ' + msg + '<br>' + dbg.innerHTML;
  var lines = dbg.innerHTML.split('<br>');
  if (lines.length > 10) dbg.innerHTML = lines.slice(0, 10).join('<br>');
}

// ── Safety timeout: auto-resume if _scanPaused stuck ──────────
function _scClearPauseTimer() { if (_scanPauseTimer) { clearTimeout(_scanPauseTimer); _scanPauseTimer = null; } }

function _scStartPauseTimer() {
  _scClearPauseTimer();
  _scanPauseTimer = setTimeout(function () {
    if (_scanPaused && document.getElementById('sc-cam-overlay')) {
      console.warn('SCAN SAFETY: auto-resuming after 10s freeze');
      _scResumeScanning();
      _scSetStatus('סריקה חודשה אוטומטית');
    }
    _scanPauseTimer = null;
  }, 10000);
}

// ── Camera scan handler (with try/catch safety) ───────────────
async function _scHandleCameraScan(barcode) {
  try {
    var item = _scNormalizeBarcode(barcode);
    if (!item) {
      _scDebugLog('NO MATCH: ' + barcode);
      _scSetStatus('לא נמצא: ' + barcode);
      _scNotFoundBarcode = barcode;
      var nfBc = document.getElementById('sc-cam-nf-barcode');
      if (nfBc) nfBc.textContent = barcode;
      var nfPanel = document.getElementById('sc-cam-notfound');
      if (nfPanel) nfPanel.style.display = 'flex';
      var hint = document.getElementById('sc-cam-hint');
      if (hint) hint.style.display = 'none';
      return;
    }
    _scDebugLog('MATCH: ' + item.barcode + ' (' + item.status + ')');
    if (item.status === 'counted') {
      _scClearPauseTimer();
      _scCamQtyItem = item;
      var infoEl = document.getElementById('sc-cam-qty-info');
      if (infoEl) infoEl.textContent = (item.barcode || '') + ' — ' + (item.brand || '') + ' ' + (item.model || '');
      var curEl = document.getElementById('sc-cam-qty-cur');
      if (curEl) curEl.textContent = 'כבר נספר! כמות נוכחית: ' + (item.actual_qty || 0);
      var inp = document.getElementById('sc-cam-qty-input');
      if (inp) inp.value = item.actual_qty || 0;
      var qtyPanel = document.getElementById('sc-cam-qty');
      if (qtyPanel) qtyPanel.style.display = 'flex';
      var hint = document.getElementById('sc-cam-hint');
      if (hint) hint.style.display = 'none';
      _scSetStatus('כבר נספר — עדכן כמות');
      setTimeout(function () { if (inp) { inp.focus(); inp.select(); } }, 100);
      return;
    }
    await updateCountItem(item.id, 1);
    var txt = document.getElementById('sc-cam-success-text');
    if (txt) txt.textContent = 'נסרק: ' + (item.barcode || '') + ' — ' + (item.brand || '') + ' ' + (item.model || '');
    var banner = document.getElementById('sc-cam-success');
    if (banner) banner.style.display = 'flex';
    var hint2 = document.getElementById('sc-cam-hint');
    if (hint2) hint2.style.display = 'none';
    _scSetStatus('נסרק: ' + (item.barcode || '') + ' ✅');
  } catch (err) {
    console.warn('_scHandleCameraScan error:', err);
    _scDebugLog('HANDLER ERR: ' + err.message);
    _scSetStatus('שגיאה: ' + err.message);
    _scClearPauseTimer();
    _scanPaused = false;
    _scResetViewfinder();
  }
}

function _scResumeScanning() {
  _scanPaused = false;
  _scClearPauseTimer();
  // Do NOT reset _lastScanCode/_lastScanTime — keeps debounce active to prevent re-triggering same barcode
  ['sc-cam-success', 'sc-cam-qty', 'sc-cam-notfound', 'sc-cam-unknown'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  var hint = document.getElementById('sc-cam-hint'); if (hint) hint.style.display = '';
  _scResetViewfinder();
  _scSetStatus('סורק...');
}

function _scResetViewfinder() { var vf = document.getElementById('sc-viewfinder'); if (vf) { vf.style.borderColor = 'rgba(255,255,255,.5)'; vf.style.boxShadow = '0 0 0 4000px rgba(0,0,0,.35)'; } }

// ── Camera qty panel (re-scan inside overlay) ─────────────────
function _scCamQtySave() {
  var inp = document.getElementById('sc-cam-qty-input');
  var val = parseInt(inp?.value);
  if (isNaN(val) || val < 0) { toast('כמות לא תקינה', 'e'); return; }
  if (_scCamQtyItem) updateCountItem(_scCamQtyItem.id, val);
  _scCamQtyDismiss();
}

function _scCamQtyDismiss() {
  _scCamQtyItem = null;
  var qtyPanel = document.getElementById('sc-cam-qty'); if (qtyPanel) qtyPanel.style.display = 'none';
  _scResumeScanning();
}

// ── Unknown barcode panels ────────────────────────────────────
function _scShowUnknownForm() {
  _scClearPauseTimer();
  var nfPanel = document.getElementById('sc-cam-notfound'); if (nfPanel) nfPanel.style.display = 'none';
  var label = document.getElementById('sc-unk-barcode-label'); if (label) label.textContent = 'ברקוד: ' + _scNotFoundBarcode;
  ['sc-unk-brand', 'sc-unk-model', 'sc-unk-color', 'sc-unk-size', 'sc-unk-notes'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var qtyInp = document.getElementById('sc-unk-qty'); if (qtyInp) qtyInp.value = '1';
  var unkPanel = document.getElementById('sc-cam-unknown'); if (unkPanel) unkPanel.style.display = 'flex';
  setTimeout(function () { var b = document.getElementById('sc-unk-brand'); if (b) b.focus(); }, 100);
}

async function _scSaveUnknownItem() {
  var brand = (document.getElementById('sc-unk-brand')?.value || '').trim();
  var model = (document.getElementById('sc-unk-model')?.value || '').trim();
  var color = (document.getElementById('sc-unk-color')?.value || '').trim();
  var size = (document.getElementById('sc-unk-size')?.value || '').trim();
  var qty = parseInt(document.getElementById('sc-unk-qty')?.value) || 1;
  var notes = (document.getElementById('sc-unk-notes')?.value || '').trim();
  var worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
  try {
    var row = {
      count_id: scCountId, inventory_id: null,
      barcode: _scNotFoundBarcode, brand: brand, model: model, color: color, size: size,
      expected_qty: 0, actual_qty: qty, status: 'unknown',
      notes: notes, counted_at: new Date().toISOString(),
      scanned_by: worker.name || '', tenant_id: getTenantId()
    };
    var { data, error } = await sb.from(T.STOCK_COUNT_ITEMS).insert(row).select().single();
    if (error) throw error;
    scSessionItems.push(data);
    unknownBarcodes.push({ barcode: _scNotFoundBarcode, time: new Date().toISOString() });
    refreshSessionUI();
    _scSetStatus('פריט לא ידוע נשמר ✅');
    toast('פריט לא ידוע נשמר — הנח בצד לבדיקת מנהל', 's');
  } catch (err) {
    toast('שגיאה בשמירה: ' + err.message, 'e');
    _scSetStatus('שגיאה: ' + err.message);
  }
  _scNotFoundBarcode = '';
  _scResumeScanning();
}

// ── Zoom control ──────────────────────────────────────────────
function _scInitZoom(stream) {
  try { var caps = stream.getVideoTracks()[0].getCapabilities ? stream.getVideoTracks()[0].getCapabilities() : {};
    if (caps.zoom) { var zb = document.getElementById('sc-cam-zoom'); if (zb) zb.style.display = ''; }
  } catch (e) { /* zoom not supported */ }
}
function _scToggleZoom() {
  if (!_scCamStream) return;
  try { var track = _scCamStream.getVideoTracks()[0], caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!caps.zoom) return;
    _scZoomLevel = (_scZoomLevel === 1) ? Math.min(2 * (caps.zoom.min || 1), caps.zoom.max || 1) : 1;
    track.applyConstraints({ advanced: [{ zoom: _scZoomLevel }] });
    var btn = document.getElementById('sc-cam-zoom'); if (btn) btn.textContent = (_scZoomLevel > 1) ? '2x' : '1x';
  } catch (e) { console.warn('Zoom error:', e); }
}

function stopCamera() {
  _scanPaused = false; _scClearPauseTimer(); _scCamStream = null; _scZoomLevel = 1;
  if (scCodeReader) { scCodeReader.reset(); scCodeReader = null; }
  var overlay = document.getElementById('sc-cam-overlay');
  if (overlay) {
    var v = overlay.querySelector('video');
    if (v && v.srcObject) { v.srcObject.getTracks().forEach(function (t) { t.stop(); }); v.srcObject = null; }
    overlay.remove();
  }
  document.body.style.overflow = '';
}
