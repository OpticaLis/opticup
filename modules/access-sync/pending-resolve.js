// =========================================================
// SYNC RESOLVE — Inline resolve + utilities for detail modal
// =========================================================

// ── Inline resolve ──────────────────────────────────────────
async function syncDetailResolve(pendingId, newStatus) {
  try {
    const note = newStatus === 'resolved' ? 'עודכן ידנית' : 'לא נמצא';
    const { data: updated, error } = await sb.from(T.PENDING_SALES).update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: _syncDetailEmployee ? _syncDetailEmployee.name : ''
    }).eq('id', pendingId).eq('status', 'pending').select('id, sync_filename');

    if (error) throw error;
    if (!updated || updated.length === 0) { toast('הפריט כבר טופל', 'w'); return; }

    writeLog(newStatus === 'resolved' ? 'pending_resolved' : 'pending_ignored', null, {
      pending_id: pendingId, status: newStatus, note,
      performed_by: _syncDetailEmployee ? _syncDetailEmployee.name : ''
    });

    // Update row inline
    const statusEl = $('sync-pending-status-' + pendingId);
    const actionsEl = $('sync-pending-actions-' + pendingId);
    const rowEl = $('sync-pending-row-' + pendingId);
    if (statusEl) statusEl.innerHTML = pendingItemStatus({ status: newStatus });
    if (actionsEl) actionsEl.innerHTML = '';
    if (rowEl) rowEl.style.background = newStatus === 'resolved' ? '#f0fdf4' : '#f8fafc';

    toast(newStatus === 'resolved' ? 'פריט סומן כמטופל' : 'פריט סומן כלא נמצא', 's');

    const filename = updated[0]?.sync_filename;
    if (filename) await checkFileCompletion(filename);
  } catch (e) {
    toast('שגיאה בעדכון: ' + (e.message || e), 'e');
  }
}

// ── Check file completion ───────────────────────────────────
async function checkFileCompletion(filename) {
  const { count, error } = await sb.from(T.PENDING_SALES)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', getTenantId())
    .eq('sync_filename', filename)
    .eq('status', 'pending');
  if (error) return;

  const countEl = $('sync-detail-pending-count');
  if (countEl) countEl.textContent = count || 0;

  if (count === 0) {
    await sb.from(T.SYNC_LOG).update({ status: 'success', rows_pending: 0 })
      .eq('tenant_id', getTenantId()).eq('filename', filename)
      .in('status', ['partial', 'error']);

    const badgeEl = $('sync-detail-status-badge');
    if (badgeEl) {
      const b = STATUS_BADGES.success;
      badgeEl.innerHTML = `<b>סטטוס:</b> <span class="${b.cls}">${b.icon} ${b.text}</span>`;
    }
    toast('כל הפריטים טופלו — הקובץ הושלם', 's');
  }

  loadPendingBadge();
}

// ── Copy table to clipboard ─────────────────────────────────
function copySyncDetailTable() {
  const table = $('sync-detail-items');
  if (!table) return;
  const rows = table.querySelectorAll('tr');
  const lines = ['ברקוד\tמותג\tדגם\tגודל\tצבע\tכמות\tסטטוס'];
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return;
    const vals = [];
    for (let i = 0; i < 7; i++) vals.push(cells[i].textContent.trim());
    lines.push(vals.join('\t'));
  });
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => toast('הועתק ללוח', 's'))
    .catch(() => toast('שגיאה בהעתקה', 'e'));
}

// ── Search barcode from detail modal ────────────────────────
function syncDetailSearchBarcode(barcode) {
  closeSyncDetails();
  showTab('inventory');
  setTimeout(() => {
    const input = $('inv-search');
    if (input) {
      input.value = barcode;
      if (typeof filterInventoryTable === 'function') filterInventoryTable();
    }
  }, 200);
}

// ── Download failed file ────────────────────────────────────
async function downloadFailedFile(logId) {
  showLoading('יוצר קישור הורדה...');
  try {
    const { data: log, error } = await sb.from(T.SYNC_LOG)
      .select('storage_path, filename').eq('tenant_id', getTenantId())
      .eq('id', logId).maybeSingle();
    if (error || !log || !log.storage_path) {
      toast('לא נמצא קובץ להורדה', 'e'); return;
    }
    const { data: urlData, error: urlErr } = await sb.storage
      .from('failed-sync-files').createSignedUrl(log.storage_path, 3600);
    if (urlErr || !urlData?.signedUrl) {
      toast('שגיאה ביצירת קישור הורדה', 'e'); return;
    }
    window.open(urlData.signedUrl, '_blank');
  } catch (e) {
    toast('שגיאה בהורדת קובץ', 'e');
  } finally {
    hideLoading();
  }
}
