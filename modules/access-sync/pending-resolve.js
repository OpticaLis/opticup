// =========================================================
// PENDING RESOLVE — Mark resolved / ignored with PIN
// =========================================================

// -- Mark as resolved (manually updated in inventory) -----
async function markResolved(pendingId) {
  const ok = await confirmDialog('\u05E2\u05D3\u05DB\u05D5\u05DF \u05D9\u05D3\u05E0\u05D9\u05EA', '\u05D4\u05E4\u05E8\u05D9\u05D8 \u05E2\u05D5\u05D3\u05DB\u05DF \u05D9\u05D3\u05E0\u05D9\u05EA \u05D1\u05DE\u05DC\u05D0\u05D9?');
  if (!ok) return;
  await pinGatedAction(pendingId, 'resolved', '\u05E2\u05D5\u05D3\u05DB\u05DF \u05D9\u05D3\u05E0\u05D9\u05EA');
}

// -- Mark as ignored (item not found in inventory) --------
async function markIgnored(pendingId) {
  const ok = await confirmDialog('\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0', '\u05DC\u05E1\u05DE\u05DF \u05E9\u05D4\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05DC\u05D0\u05D9?');
  if (!ok) return;
  await pinGatedAction(pendingId, 'ignored', '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0');
}

// -- PIN-gated status update ------------------------------
let pendingResolveCtx = null;

async function pinGatedAction(pendingId, newStatus, note) {
  pendingResolveCtx = { pendingId, newStatus, note };
  ensurePinModal();
  $('pending-pin').value = '';
  $('pending-pin-error').textContent = '';
  $('pending-pin-modal').style.display = 'flex';
  $('pending-pin').focus();
}

function ensurePinModal() {
  if ($('pending-pin-modal')) return;
  const div = document.createElement('div');
  div.id = 'pending-pin-modal';
  div.className = 'modal-overlay';
  div.style.display = 'none';
  div.style.zIndex = '1002';
  div.innerHTML = `
    <div class="modal" style="max-width:360px">
      <h3 style="margin:0 0 12px 0">\uD83D\uDD12 \u05D0\u05D9\u05DE\u05D5\u05EA \u05E2\u05D5\u05D1\u05D3</h3>
      <p style="margin:0 0 12px 0;font-size:.9rem;color:var(--g500)">\u05D8\u05D9\u05E4\u05D5\u05DC \u05D1\u05E4\u05E8\u05D9\u05D8 \u05DE\u05DE\u05EA\u05D9\u05DF \u05D3\u05D5\u05E8\u05E9 \u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3</p>
      <input type="password" id="pending-pin" placeholder="\u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3"
        style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px"
        onkeydown="if(event.key==='Enter') confirmPendingPin()">
      <p id="pending-pin-error" style="color:var(--error);font-size:.85rem;margin:0 0 8px 0"></p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-g btn-sm" onclick="closePendingPinModal()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>
        <button class="btn btn-p btn-sm" onclick="confirmPendingPin()">\u2705 \u05D0\u05E9\u05E8</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', function(e) { if (e.target === this) closePendingPinModal(); });
}

function closePendingPinModal() {
  closeModal('pending-pin-modal');
  pendingResolveCtx = null;
}

async function confirmPendingPin() {
  if (!pendingResolveCtx) return;
  const pin = $('pending-pin').value.trim();
  if (!pin) { $('pending-pin-error').textContent = '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3'; return; }

  const emp = await verifyPinOnly(pin);
  if (!emp) {
    $('pending-pin-error').textContent = '\u274C \u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3 \u05E9\u05D2\u05D5\u05D9\u05D4';
    $('pending-pin').value = '';
    $('pending-pin').focus();
    return;
  }
  sessionStorage.setItem('prizma_user', emp.name);

  const { pendingId, newStatus, note } = pendingResolveCtx;
  try {
    const row = pendingData.find(x => x.id === pendingId);

    const { data: updated, error } = await sb.from(T.PENDING_SALES).update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: emp.name,
      resolution_note: note
    }).eq('id', pendingId).eq('status', 'pending').select('id');

    if (error) throw error;
    if (!updated || updated.length === 0) {
      toast('\u05D4\u05E4\u05E8\u05D9\u05D8 \u05DB\u05D1\u05E8 \u05D8\u05D5\u05E4\u05DC', 'w');
      closePendingPinModal();
      renderPendingPanel();
      return;
    }

    const action = newStatus === 'resolved' ? 'pending_resolved' : 'pending_ignored';
    writeLog(action, null, {
      barcode: row ? row.barcode_received : '',
      status: newStatus,
      note: note,
      performed_by: emp.name
    });

    closePendingPinModal();
    loadPendingBadge();
    toast(newStatus === 'resolved' ? '\u05E4\u05E8\u05D9\u05D8 \u05E1\u05D5\u05DE\u05DF \u05DB\u05DE\u05D8\u05D5\u05E4\u05DC' : '\u05E4\u05E8\u05D9\u05D8 \u05E1\u05D5\u05DE\u05DF \u05DB\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0', 's');
    renderPendingPanel();
  } catch (e) {
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF: ' + (e.message || e), 'e');
  }
  pendingResolveCtx = null;
}
