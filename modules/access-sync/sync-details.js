// =========================================================
// SYNC DETAILS — modal + failed file download
// =========================================================

// ── openSyncDetails ─────────────────────────────────────────
async function openSyncDetails(logId) {
  showLoading('טוען פרטי סנכרון...');
  try {
    // 1. Fetch sync_log row
    const { data: log, error } = await sb.from(T.SYNC_LOG).select('*').eq('tenant_id', getTenantId()).eq('id', logId).maybeSingle();
    if (error || !log) { toast('לא נמצא רשומת סנכרון', 'e'); return; }

    // 2. Find previous sync_log entry to establish time window lower bound
    const { data: prevLogs } = await sb.from(T.SYNC_LOG)
      .select('created_at')
      .eq('tenant_id', getTenantId())
      .lt('created_at', log.created_at)
      .order('created_at', { ascending: false })
      .limit(1);
    const lowerBound = prevLogs?.[0]?.created_at || '1970-01-01T00:00:00Z';

    // 3. Fetch inventory_logs scoped to this sync event's time window
    const { data: items } = await sb.from('inventory_logs')
      .select('inventory_id, action, qty_before, qty_after, created_at')
      .eq('tenant_id', getTenantId())
      .or(`source_ref.eq.${log.filename},sync_filename.eq.${log.filename}`)
      .gt('created_at', lowerBound)
      .lte('created_at', log.created_at)
      .order('created_at', { ascending: true })
      .limit(200);

    // 4. Fetch inventory details for all referenced items
    const invMap = {};
    if (items && items.length) {
      const ids = [...new Set(items.map(i => i.inventory_id).filter(Boolean))];
      if (ids.length) {
        const { data: invRows } = await sb.from(T.INV)
          .select('id, barcode, brand_id, model, color, size')
          .eq('tenant_id', getTenantId())
          .in('id', ids);
        if (invRows) {
          for (const r of invRows) {
            invMap[r.id] = {
              barcode: r.barcode || '',
              brand: (brandCacheRev && brandCacheRev[r.brand_id]) || '',
              model: r.model || '',
              color: r.color || '',
              size: r.size || '',
            };
          }
        }
      }
    }

    // 5. Build modal HTML
    const badge = STATUS_BADGES[log.status] || STATUS_BADGES.error;
    const date = new Date(log.created_at).toLocaleString('he-IL');

    let html = `
    <div id="sync-detail-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:#fff;border-radius:12px;max-width:900px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;position:relative">
        <button onclick="closeSyncDetails()" style="position:absolute;top:12px;left:12px;background:none;border:none;font-size:20px;cursor:pointer">\u2716</button>
        <h3 style="margin:0 0 16px 0">\uD83D\uDCCB פרטי סנכרון</h3>

        <!-- File info -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:20px;background:#f8fafc;padding:14px;border-radius:8px">
          <div><b>קובץ:</b> ${escapeHtml(log.filename)}</div>
          <div><b>תאריך:</b> ${date}</div>
          <div><b>מקור:</b> ${SOURCE_LABELS[log.source_ref] || escapeHtml(log.source_ref)}</div>
          <div><b>סטטוס:</b> <span class="${badge.cls}">${badge.icon} ${badge.text}</span></div>
          <div><b>סה"כ:</b> ${log.rows_total || 0}</div>
          <div><b>הצליח:</b> ${log.rows_success || 0}</div>
          <div><b>ממתין:</b> ${log.rows_pending || 0}</div>
          <div><b>שגיאה:</b> ${log.rows_error || 0}</div>
        </div>`;

    // 6. Items table
    if (items && items.length) {
      html += `<h4 style="margin:0 0 8px 0">\u2705 פריטים שעובדו (${items.length})</h4>
      <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">
        <table><thead><tr>
          <th>ברקוד</th><th>מותג</th><th>דגם</th><th>צבע</th><th>גודל</th><th>פעולה</th><th>לפני</th><th>אחרי</th><th>תאריך</th>
        </tr></thead><tbody>`;
      for (const item of items) {
        const inv = invMap[item.inventory_id] || {};
        const action = item.action === 'sale' ? 'מכירה' : item.action === 'return' ? 'החזרה' : (item.action || '');
        const itemDate = new Date(item.created_at).toLocaleString('he-IL');
        html += `<tr>
          <td style="direction:ltr;text-align:right">${escapeHtml(inv.barcode || '')}</td>
          <td>${escapeHtml(inv.brand || '')}</td>
          <td>${escapeHtml(inv.model || '')}</td>
          <td>${escapeHtml(inv.color || '')}</td>
          <td>${escapeHtml(inv.size || '')}</td>
          <td>${escapeHtml(action)}</td>
          <td>${item.qty_before ?? ''}</td>
          <td>${item.qty_after ?? ''}</td>
          <td>${itemDate}</td>
        </tr>`;
      }
      html += '</tbody></table></div>';
    } else {
      html += '<p style="color:#888;margin-bottom:16px">לא נמצאו פריטים מעובדים לקובץ זה</p>';
    }

    // 6b. Pending items from pending_sales for this sync
    const { data: pendingItems } = await sb.from(T.PENDING_SALES)
      .select('barcode_received, quantity, action_type, status, brand, model, size, color, created_at')
      .eq('tenant_id', getTenantId())
      .eq('sync_filename', log.filename)
      .order('created_at', { ascending: true })
      .limit(200);

    if (pendingItems && pendingItems.length) {
      html += `<h4 style="margin:0 0 8px 0;color:#ca8a04">\u26A0\uFE0F פריטים ממתינים (${pendingItems.length})</h4>
      <div style="max-height:250px;overflow-y:auto;margin-bottom:16px">
        <table><thead><tr>
          <th>ברקוד</th><th>מותג</th><th>דגם</th><th>צבע</th><th>גודל</th><th>כמות</th><th>סוג</th><th>סטטוס</th>
        </tr></thead><tbody>`;
      for (const p of pendingItems) {
        const typeLabel = p.action_type === 'return' ? 'החזרה' : 'מכירה';
        const statusLabel = p.status === 'pending' ? 'ממתין' : p.status === 'resolved' ? 'עודכן' : 'לא נמצא';
        html += `<tr>
          <td style="direction:ltr;text-align:right">${escapeHtml(p.barcode_received || '')}</td>
          <td>${escapeHtml(p.brand || '')}</td>
          <td>${escapeHtml(p.model || '')}</td>
          <td>${escapeHtml(p.color || '')}</td>
          <td>${escapeHtml(p.size || '')}</td>
          <td>${p.quantity || 1}</td>
          <td>${escapeHtml(typeLabel)}</td>
          <td>${escapeHtml(statusLabel)}</td>
        </tr>`;
      }
      html += '</tbody></table></div>';
    }

    // 7. Error table
    const errs = Array.isArray(log.errors) ? log.errors : [];
    if (errs.length) {
      html += `<h4 style="margin:0 0 8px 0;color:#dc2626">\u274C שגיאות (${errs.length})</h4>
      <div style="max-height:250px;overflow-y:auto;margin-bottom:16px">
        <table><thead><tr><th>#</th><th>שגיאה</th></tr></thead><tbody>`;
      errs.forEach((e, i) => {
        html += `<tr><td>${i + 1}</td><td style="direction:ltr;text-align:right">${escapeHtml(String(e))}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    // Close button
    html += `<div style="text-align:center;margin-top:12px">
      <button class="btn btn-g" onclick="closeSyncDetails()">סגור</button>
    </div></div></div>`;

    // 8. Inject into DOM
    const existing = $('sync-detail-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (e) {
    toast('שגיאה בטעינת פרטים', 'e');
  } finally {
    hideLoading();
  }
}

function closeSyncDetails() {
  const el = $('sync-detail-overlay');
  if (el) el.remove();
}

// ── downloadFailedFile ──────────────────────────────────────
async function downloadFailedFile(logId) {
  showLoading('יוצר קישור הורדה...');
  try {
    const { data: log, error } = await sb.from(T.SYNC_LOG).select('storage_path, filename').eq('tenant_id', getTenantId()).eq('id', logId).maybeSingle();
    if (error || !log || !log.storage_path) {
      toast('לא נמצא קובץ להורדה', 'e');
      return;
    }
    const { data: urlData, error: urlErr } = await sb.storage
      .from('failed-sync-files')
      .createSignedUrl(log.storage_path, 3600);
    if (urlErr || !urlData?.signedUrl) {
      toast('שגיאה ביצירת קישור הורדה', 'e');
      return;
    }
    window.open(urlData.signedUrl, '_blank');
  } catch (e) {
    toast('שגיאה בהורדת קובץ', 'e');
  } finally {
    hideLoading();
  }
}
