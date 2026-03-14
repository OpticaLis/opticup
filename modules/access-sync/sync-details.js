// =========================================================
// SYNC DETAILS — Work center modal (UI + data loading)
// Resolve logic lives in pending-resolve.js
// =========================================================

let _syncDetailLogId = null;
let _syncDetailPinVerified = false;
let _syncDetailEmployee = null;

// ── openSyncDetails ─────────────────────────────────────────
async function openSyncDetails(logId) {
  showLoading('טוען פרטי סנכרון...');
  try {
    const { data: log, error } = await sb.from(T.SYNC_LOG)
      .select('*').eq('tenant_id', getTenantId()).eq('id', logId).maybeSingle();
    if (error || !log) { toast('לא נמצא רשומת סנכרון', 'e'); return; }

    // PIN gate — only for files with pending items
    const hasPending = log.status === 'partial' || log.status === 'error';
    _syncDetailPinVerified = false;
    _syncDetailEmployee = null;
    _syncDetailLogId = logId;

    if (hasPending) {
      hideLoading();
      const pin = await promptPin();
      if (!pin) return;
      showLoading('מאמת...');
      const emp = await verifyPinOnly(pin);
      if (!emp) { toast('סיסמת עובד שגויה', 'e'); hideLoading(); return; }
      _syncDetailPinVerified = true;
      _syncDetailEmployee = emp;
      sessionStorage.setItem('prizma_user', emp.name);
    }

    // Fetch successful items from inventory_logs
    const { data: prevLogs } = await sb.from(T.SYNC_LOG)
      .select('created_at').eq('tenant_id', getTenantId())
      .lt('created_at', log.created_at)
      .order('created_at', { ascending: false }).limit(1);
    const lowerBound = prevLogs?.[0]?.created_at || '1970-01-01T00:00:00Z';

    const { data: successItems } = await sb.from('inventory_logs')
      .select('inventory_id, action, qty_before, qty_after, created_at')
      .eq('tenant_id', getTenantId())
      .or(`source_ref.eq.${log.filename},sync_filename.eq.${log.filename}`)
      .gt('created_at', lowerBound).lte('created_at', log.created_at)
      .order('created_at', { ascending: true }).limit(200);

    // Fetch inventory details
    const invMap = {};
    if (successItems && successItems.length) {
      const ids = [...new Set(successItems.map(i => i.inventory_id).filter(Boolean))];
      if (ids.length) {
        const { data: invRows } = await sb.from(T.INV)
          .select('id, barcode, brand_id, model, color, size')
          .eq('tenant_id', getTenantId()).in('id', ids);
        if (invRows) {
          for (const r of invRows) {
            invMap[r.id] = {
              barcode: r.barcode || '',
              brand: (brandCacheRev && brandCacheRev[r.brand_id]) || '',
              model: r.model || '', color: r.color || '', size: r.size || '',
            };
          }
        }
      }
    }

    // Fetch pending items
    const { data: pendingItems } = await sb.from(T.PENDING_SALES)
      .select('id, barcode_received, quantity, action_type, status, brand, model, size, color, resolved_at, resolved_by, created_at')
      .eq('tenant_id', getTenantId()).eq('filename', log.filename)
      .order('created_at', { ascending: true }).limit(200);

    renderSyncDetailModal(log, successItems || [], invMap, pendingItems || []);
  } catch (e) {
    toast('שגיאה בטעינת פרטים', 'e');
  } finally {
    hideLoading();
  }
}

// ── promptPin ───────────────────────────────────────────────
function promptPin() {
  return new Promise(resolve => {
    let overlay = $('sync-pin-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sync-pin-overlay';
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '10000';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="modal" style="max-width:360px">
        <h3 style="margin:0 0 12px 0">\uD83D\uDD12 אימות עובד</h3>
        <p style="margin:0 0 12px 0;font-size:.9rem;color:var(--g500)">טיפול בפריטים ממתינים דורש סיסמת עובד</p>
        <input type="password" id="sync-pin-input" placeholder="סיסמת עובד"
          style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-g btn-sm" id="sync-pin-cancel">ביטול</button>
          <button class="btn btn-p btn-sm" id="sync-pin-ok">\u2705 אשר</button>
        </div>
      </div>`;
    const input = $('sync-pin-input');
    const done = (val) => { overlay.style.display = 'none'; resolve(val); };
    $('sync-pin-cancel').onclick = () => done(null);
    $('sync-pin-ok').onclick = () => done(input.value.trim() || null);
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value.trim() || null); };
    input.focus();
  });
}

// ── renderSyncDetailModal ───────────────────────────────────
function renderSyncDetailModal(log, successItems, invMap, pendingItems) {
  const existing = $('sync-detail-overlay');
  if (existing) existing.remove();

  const badge = STATUS_BADGES[log.status] || STATUS_BADGES.error;
  const date = new Date(log.created_at).toLocaleString('he-IL');
  const source = SOURCE_LABELS[log.source_ref] || escapeHtml(log.source_ref);

  let itemRows = '';
  for (const item of successItems) {
    const inv = invMap[item.inventory_id] || {};
    const qtyText = item.qty_before != null && item.qty_after != null
      ? `${item.qty_before} → ${item.qty_after}` : '';
    itemRows += `<tr style="background:#f0fdf4">
      <td style="direction:ltr;text-align:right">${escapeHtml(inv.barcode || '')}</td>
      <td>${escapeHtml(inv.brand || '')}</td><td>${escapeHtml(inv.model || '')}</td>
      <td>${escapeHtml(inv.size || '')}</td><td>${escapeHtml(inv.color || '')}</td>
      <td>${qtyText}</td>
      <td><span style="color:#16a34a;font-weight:600">\u2705 עודכן</span></td><td></td>
    </tr>`;
  }
  for (const p of pendingItems) {
    const barcodeHtml = `<a href="#" onclick="event.preventDefault();syncDetailSearchBarcode('${escapeHtml(p.barcode_received)}')"
      style="color:#3b82f6;text-decoration:underline;font-weight:600">${escapeHtml(p.barcode_received || '')}</a>`;
    const rowBg = p.status === 'pending' ? '#fffbeb' : p.status === 'resolved' ? '#f0fdf4' : '#f8fafc';
    itemRows += `<tr id="sync-pending-row-${p.id}" style="background:${rowBg}">
      <td style="direction:ltr;text-align:right">${barcodeHtml}</td>
      <td>${p.brand ? `<a href="#" onclick="event.preventDefault();searchBrandInInventory('${escapeHtml(p.brand)}')" style="color:#3b82f6;cursor:pointer">${escapeHtml(p.brand)}</a>` : ''}</td>
      <td>${p.model ? `<a href="#" onclick="event.preventDefault();searchModelInInventory('${escapeHtml(p.brand || '')}','${escapeHtml(p.model)}')" style="color:#3b82f6;cursor:pointer">${escapeHtml(p.model)}</a>` : ''}</td>
      <td>${escapeHtml(p.size || '')}</td><td>${escapeHtml(p.color || '')}</td>
      <td>${p.quantity || 1}</td>
      <td id="sync-pending-status-${p.id}">${pendingItemStatus(p)}</td>
      <td id="sync-pending-actions-${p.id}" style="white-space:nowrap">${pendingItemActions(p)}</td>
    </tr>`;
  }
  if (!itemRows) {
    itemRows = '<tr><td colspan="8" style="text-align:center;color:#888;padding:24px">לא נמצאו פריטים</td></tr>';
  }

  let errorsHtml = '';
  const errs = Array.isArray(log.errors) ? log.errors : [];
  if (errs.length) {
    errorsHtml = `<h4 style="margin:16px 0 8px 0;color:#dc2626">\u274C שגיאות (${errs.length})</h4>
    <div style="max-height:150px;overflow-y:auto;margin-bottom:12px"><table><thead><tr><th>#</th><th>שגיאה</th></tr></thead><tbody>
    ${errs.map((e, i) => `<tr><td>${i + 1}</td><td style="direction:ltr;text-align:right">${escapeHtml(String(e))}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  const html = `
  <div id="sync-detail-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="background:#fff;border-radius:12px;max-width:950px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;position:relative">
      <button onclick="closeSyncDetails()" style="position:absolute;top:12px;left:12px;background:none;border:none;font-size:20px;cursor:pointer">\u2716</button>
      <h3 style="margin:0 0 16px 0">\uD83D\uDCCB פרטי סנכרון</h3>
      <div id="sync-detail-header" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:20px;background:#f8fafc;padding:14px;border-radius:8px">
        <div><b>קובץ:</b> ${escapeHtml(log.filename)}</div>
        <div><b>תאריך:</b> ${date}</div>
        <div><b>מקור:</b> ${source}</div>
        <div id="sync-detail-status-badge"><b>סטטוס:</b> <span class="${badge.cls}">${badge.icon} ${badge.text}</span></div>
        <div><b>סה"כ:</b> ${log.rows_total || 0}</div>
        <div><b>הצליח:</b> ${log.rows_success || 0}</div>
        <div><b>ממתין:</b> <span id="sync-detail-pending-count">${log.rows_pending || 0}</span></div>
        <div><b>שגיאה:</b> ${log.rows_error || 0}</div>
      </div>
      <h4 style="margin:0 0 8px 0">פריטים</h4>
      <div style="max-height:400px;overflow-y:auto;margin-bottom:12px">
        <table><thead><tr>
          <th>ברקוד</th><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>כמות</th><th>סטטוס</th><th>פעולות</th>
        </tr></thead><tbody id="sync-detail-items">${itemRows}</tbody></table>
      </div>
      ${errorsHtml}
      <div id="sync-detail-help" style="display:none;background:#f0f4f8;border:1px solid #cbd5e1;border-radius:8px;padding:14px 18px;margin-top:12px;direction:rtl;font-size:.9rem;line-height:1.7">
        <b>סדר פעולות לתיקון ידני:</b><br>
        1. לחץ על הברקוד / מותג / דגם כדי לחפש את הפריט במלאי הראשי<br>
        2. אם מצאת — עדכן את הכמות ידנית במלאי<br>
        3. חזור לכאן ולחץ "עודכן \u2705"<br>
        4. אם לא מצאת ואין התאמה — לחץ "לא נמצא \u274C"
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
        <button class="btn btn-g" onclick="toggleSyncDetailHelp()">\u2753 הסבר לתיקון ידני</button>
        <button class="btn btn-g" onclick="copySyncDetailTable()">\uD83D\uDCCB העתק טבלה</button>
        <button class="btn btn-g" onclick="closeSyncDetails()">סגור</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

// ── Status + action helpers ─────────────────────────────────
function pendingItemStatus(p) {
  if (p.status === 'pending') return '<span style="color:#ca8a04;font-weight:600">\u23F3 ממתין</span>';
  if (p.status === 'resolved') return '<span style="color:#16a34a;font-weight:600">\u2705 עודכן ידנית</span>';
  if (p.status === 'ignored') return '<span style="color:#6b7280;font-weight:600">\u274C לא נמצא</span>';
  return escapeHtml(p.status);
}

function pendingItemActions(p) {
  if (p.status !== 'pending' || !_syncDetailPinVerified) return '';
  return `<button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none;padding:4px 10px;border-radius:5px;font-size:.82rem"
      onclick="syncDetailResolve('${p.id}','resolved')">עודכן \u2705</button>
    <button class="btn btn-sm" style="background:#ea580c;color:#fff;border:none;padding:4px 10px;border-radius:5px;font-size:.82rem;margin-right:4px"
      onclick="syncDetailResolve('${p.id}','ignored')">לא נמצא \u274C</button>`;
}

// ── Toggle help box ─────────────────────────────────────────
function toggleSyncDetailHelp() {
  const el = $('sync-detail-help');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── Close detail modal ──────────────────────────────────────
function closeSyncDetails() {
  const el = $('sync-detail-overlay');
  if (el) el.remove();
  _syncDetailLogId = null;
  _syncDetailPinVerified = false;
  _syncDetailEmployee = null;
  loadSyncLog();
}
