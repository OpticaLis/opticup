// ---- Soft Delete ----
let softDelTarget = null;

function deleteInvRow(recId) {
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;
  softDelTarget = rec;
  const bc = rec.barcode || 'ללא ברקוד';
  const brand = rec.brand_name || '';
  const model = rec.model || '';
  $('softdel-title').textContent = '🗑️ מחיקת פריט — ' + bc;
  $('softdel-desc').textContent = brand + ' ' + model;
  $('softdel-reason').value = '';
  $('softdel-note').value = '';
  $('softdel-pin').value = '';
  $('softdel-error').textContent = '';
  $('softdel-confirm').disabled = true;
  $('softdel-modal').style.display = 'flex';
  // Enable confirm when reason + pin filled
  const check = () => { $('softdel-confirm').disabled = !$('softdel-reason').value || !$('softdel-pin').value; };
  $('softdel-reason').onchange = check;
  $('softdel-pin').oninput = check;
}

async function confirmSoftDelete() {
  if (!softDelTarget) return;
  const pin = $('softdel-pin').value.trim();
  const reason = $('softdel-reason').value;
  const note = $('softdel-note').value.trim();
  if (!reason || !pin) return;

  // Verify PIN
  const { data: emp } = await sb.from(T.EMPLOYEES).select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) {
    $('softdel-error').textContent = '❌ סיסמת עובד שגויה';
    return;
  }

  const id = softDelTarget.id;
  const fullReason = note ? reason + ' — ' + note : reason;

  try {
    const { error } = await sb.from('inventory').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: emp.name,
      deleted_reason: fullReason
    }).eq('id', id);
    if (error) throw new Error(error.message);

    writeLog('soft_delete', id, {
      barcode:    softDelTarget.barcode,
      brand:      softDelTarget.brand_name,
      model:      softDelTarget.model,
      reason:     reason,
      source_ref: 'נמחק ע"י: ' + emp.name
    });

    invData = invData.filter(r => r.id !== id);
    $('inv-count').textContent = invData.length;
    filterInventoryTable();
    closeModal('softdel-modal');
    toast('הפריט הועבר לסל המחזור 🗑️', 's');
  } catch (e) {
    $('softdel-error').textContent = 'שגיאה: ' + (e.message || '');
  }
  softDelTarget = null;
}

// ---- Recycle Bin ----
async function openRecycleBin() {
  $('recycle-content').innerHTML = '<p style="text-align:center">טוען...</p>';
  $('recycle-modal').style.display = 'flex';
  try {
    const { data: deleted, error } = await sb.from('inventory')
      .select('id, barcode, brand_id, model, deleted_by, deleted_at, deleted_reason')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });
    if (error) throw new Error(error.message);

    if (!deleted?.length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
      return;
    }

    // Resolve brand names
    const brandRevMap = {};
    for (const [name, uid] of Object.entries(brandCache)) brandRevMap[uid] = name;

    const rows = deleted.map(r => {
      const brand = brandRevMap[r.brand_id] || '';
      const dt = r.deleted_at ? new Date(r.deleted_at).toLocaleString('he-IL') : '';
      return `<tr data-id="${r.id}" data-barcode="${escapeHtml(r.barcode)||''}" data-brand="${escapeHtml(brand)}" data-model="${escapeHtml(r.model)||''}">
        <td>${escapeHtml(r.barcode)||'—'}</td>
        <td>${escapeHtml(brand)}</td>
        <td>${escapeHtml(r.model)||''}</td>
        <td>${escapeHtml(r.deleted_by)||''}</td>
        <td style="font-size:.8rem">${dt}</td>
        <td style="font-size:.85rem">${escapeHtml(r.deleted_reason)||''}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-s btn-sm" onclick="restoreItem('${r.id}')">↩️ שחזר</button>
          <button class="btn btn-d btn-sm" onclick="permanentDelete('${r.id}')">❌ מחק לצמיתות</button>
        </td>
      </tr>`;
    }).join('');

    $('recycle-content').innerHTML = `
      <div class="table-wrap" style="max-height:50vh;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th>ברקוד</th><th>מותג</th><th>דגם</th><th>נמחק ע"י</th><th>תאריך מחיקה</th><th>סיבה</th><th>פעולות</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (e) {
    $('recycle-content').innerHTML = '<p style="color:var(--error)">שגיאה: ' + (e.message||'') + '</p>';
  }
}

async function restoreItem(id) {
  const row = document.querySelector(`#recycle-modal tr[data-id="${id}"]`);
  const barcode = row?.dataset.barcode || '';
  const brand = row?.dataset.brand || '';
  const model = row?.dataset.model || '';

  try {
    const { error } = await sb.from('inventory').update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      deleted_reason: null
    }).eq('id', id);
    if (error) throw new Error(error.message);

    writeLog('restore', id, { barcode, brand, model, reason: 'שוחזר מסל מחזור' });
    row?.remove();
    // If table empty, show empty message
    if (!document.querySelectorAll('#recycle-modal tbody tr').length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
    }
    toast('הפריט שוחזר למלאי ✅', 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message||''), 'e');
  }
}

let permDelTarget = null;

async function permanentDelete(id) {
  const row = document.querySelector(`#recycle-modal tr[data-id="${id}"]`);
  const barcode = row?.dataset.barcode || '';
  const brand = row?.dataset.brand || '';
  const model = row?.dataset.model || '';

  const ok = await confirmDialog('מחיקה לצמיתות', 'האם למחוק לצמיתות? פעולה זו אינה הפיכה');
  if (!ok) return;

  permDelTarget = { id, row, barcode, brand, model };

  // Create PIN modal dynamically if needed
  if (!$('permdel-pin-modal')) {
    const div = document.createElement('div');
    div.id = 'permdel-pin-modal';
    div.className = 'modal-overlay';
    div.style.display = 'none';
    div.innerHTML = `
      <div class="modal" style="max-width:360px">
        <h3 style="margin:0 0 12px 0">🔒 אימות עובד</h3>
        <p style="margin:0 0 12px 0;font-size:.9rem;color:var(--g500)">מחיקה לצמיתות דורשת סיסמת עובד</p>
        <input type="password" id="permdel-pin" placeholder="סיסמת עובד" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px"
               onkeydown="if(event.key==='Enter') confirmPermanentDelete()">
        <p id="permdel-pin-error" style="color:var(--error);font-size:.85rem;margin:0 0 8px 0"></p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-g btn-sm" onclick="closeModal('permdel-pin-modal')">ביטול</button>
          <button class="btn btn-d btn-sm" onclick="confirmPermanentDelete()">❌ מחק לצמיתות</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) { if (e.target === this) closeModal('permdel-pin-modal'); });
  }
  $('permdel-pin').value = '';
  $('permdel-pin-error').textContent = '';
  $('permdel-pin-modal').style.display = 'flex';
  $('permdel-pin').focus();
}

async function confirmPermanentDelete() {
  if (!permDelTarget) return;
  const pin = $('permdel-pin').value.trim();
  if (!pin) { $('permdel-pin-error').textContent = 'יש להזין סיסמת עובד'; return; }

  const { data: emp } = await sb.from(T.EMPLOYEES).select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) { $('permdel-pin-error').textContent = '❌ סיסמת עובד שגויה'; $('permdel-pin').value = ''; $('permdel-pin').focus(); return; }

  const { id, row, barcode, brand, model } = permDelTarget;

  try {
    const { error } = await sb.from('inventory').delete().eq('id', id);
    if (error) {
      toast('שגיאה: ' + error.message, 'e');
      return;
    }
    await writeLog('permanent_delete', null, { barcode, brand, model, reason: 'מחיקה לצמיתות', source_ref: 'נמחק ע"י: ' + emp.name });
    row?.remove();
    if (!document.querySelectorAll('#recycle-modal tbody tr').length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
    }
    closeModal('permdel-pin-modal');
    toast('הפריט נמחק לצמיתות', 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message||''), 'e');
  }
  permDelTarget = null;
}
