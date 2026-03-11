// ---- Selection & Bulk ----
function toggleRowSelect(id, checked) {
  if (checked) invSelected.add(id); else invSelected.delete(id);
  const tr = $('inv-body').querySelector(`tr[data-id="${id}"]`);
  if (tr) tr.classList.toggle('selected-row', checked);
  updateSelectionUI();
}

function toggleSelectAll(checked) {
  invData.forEach(r => { if (checked) invSelected.add(r.id); else invSelected.delete(r.id); });
  $('inv-body').querySelectorAll('tr[data-id]').forEach(tr => {
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) cb.checked = checked;
    tr.classList.toggle('selected-row', checked);
  });
  updateSelectionUI();
}

function clearSelection() {
  invSelected.clear();
  $('inv-select-all').checked = false;
  $('inv-body').querySelectorAll('tr[data-id]').forEach(tr => {
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) cb.checked = false;
    tr.classList.remove('selected-row');
  });
  updateSelectionUI();
}

function updateSelectionUI() {
  const n = invSelected.size;
  const isAdm = document.body.classList.contains('admin-mode');
  $('inv-sel-count').style.display = n > 0 ? 'inline' : 'none';
  $('inv-sel-num').textContent = n;
  $('inv-bulk-bar').style.display = (n > 0 && isAdm) ? 'flex' : 'none';
}

async function applyBulkUpdate() {
  if (!isAdmin) { toast('נדרשת הרשאת מנהל', 'e'); return; }
  const ids = Array.from(invSelected);
  if (!ids.length) { toast('לא נבחרו פריטים', 'w'); return; }

  const fields = {};
  const sp = $('bulk-sprice').value;
  const sd = $('bulk-sdisc').value;
  const cp = $('bulk-cprice').value;
  const cd = $('bulk-cdisc').value;
  const sync = $('bulk-sync').value;
  if (sp !== '') fields.sell_price = parseFloat(sp) || 0;
  if (sd !== '') fields.sell_discount = (parseFloat(sd) || 0) / 100;
  if (cp !== '') fields.cost_price = parseFloat(cp) || 0;
  if (cd !== '') fields.cost_discount = (parseFloat(cd) || 0) / 100;
  if (sync) fields.website_sync = heToEn('website_sync', sync);

  if (!Object.keys(fields).length) { toast('לא הוזנו ערכים לעדכון', 'w'); return; }

  // Validate sync change: require images, bridge, temple for מלא/תדמית
  if (sync === 'מלא' || sync === 'תדמית') {
    const problemItems = [];
    ids.forEach(id => {
      const rec = invData.find(r => r.id === id);
      if (!rec) return;
      const missing = [];
      if (!(rec._images||[]).length) missing.push('תמונה');
      if (!(rec.bridge||'').toString().trim()) missing.push('גשר');
      if (!(rec.temple_length||'').toString().trim()) missing.push('אורך מוט');
      if (missing.length) problemItems.push(`${rec.barcode||'?'}: חסר ${missing.join(', ')}`);
    });
    if (problemItems.length) {
      const show = problemItems.slice(0, 10).join('\n');
      const more = problemItems.length > 10 ? `\n...ועוד ${problemItems.length - 10}` : '';
      toast(`לא ניתן לסנכרן "${sync}" — ${problemItems.length} פריטים חסרי נתונים`, 'e');
      setAlert('inv-alerts', `<strong>פריטים שלא ניתן לסנכרן:</strong><br>${show.replace(/\n/g,'<br>')}${more}`, 'e');
      return;
    }
  }

  const desc = Object.entries(fields).map(([k,v]) => `${FIELD_MAP_REV.inventory?.[k]||k}: ${typeof v==='number' && k.includes('discount') ? Math.round(v*100)+'%' : v}`).join(', ');
  const ok = await confirmDialog('עדכון גורף', `לעדכן ${ids.length} פריטים?\n${desc}`);
  if (!ok) return;

  showLoading(`מעדכן ${ids.length} פריטים...`);
  try {
    const updates = ids.map(id => ({ id, ...fields }));
    await batchUpdate(T.INV, updates);
    // Clear bulk inputs
    $('bulk-sprice').value = '';
    $('bulk-sdisc').value = '';
    $('bulk-cprice').value = '';
    $('bulk-cdisc').value = '';
    $('bulk-sync').value = '';
    clearSelection();
    await loadInventoryPage();
    toast(`${ids.length} פריטים עודכנו בהצלחה`, 's');
  } catch(e) {
    setAlert('inv-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

let bulkDelIds = null;

async function bulkDelete() {
  if (!isAdmin) { toast('נדרשת הרשאת מנהל', 'e'); return; }
  const ids = Array.from(invSelected);
  if (!ids.length) { toast('לא נבחרו פריטים', 'w'); return; }
  const ok = await confirmDialog('מחיקה גורפת', `להעביר ${ids.length} פריטים לסל המחזור?`);
  if (!ok) return;

  bulkDelIds = ids;
  if (!$('bulkdel-pin-modal')) {
    const div = document.createElement('div');
    div.id = 'bulkdel-pin-modal';
    div.className = 'modal-overlay';
    div.style.display = 'none';
    div.innerHTML = `
      <div class="modal" style="max-width:360px">
        <h3 style="margin:0 0 12px 0">🔒 אימות עובד</h3>
        <p style="margin:0 0 12px 0;font-size:.9rem;color:var(--g500)">מחיקה גורפת דורשת סיסמת עובד</p>
        <input type="password" id="bulkdel-pin" placeholder="סיסמת עובד" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px"
               onkeydown="if(event.key==='Enter') confirmBulkDelete()">
        <p id="bulkdel-pin-error" style="color:var(--error);font-size:.85rem;margin:0 0 8px 0"></p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-g btn-sm" onclick="closeModal('bulkdel-pin-modal')">ביטול</button>
          <button class="btn btn-d btn-sm" onclick="confirmBulkDelete()">🗑️ מחק</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) { if (e.target === this) closeModal('bulkdel-pin-modal'); });
  }
  $('bulkdel-pin').value = '';
  $('bulkdel-pin-error').textContent = '';
  $('bulkdel-pin-modal').style.display = 'flex';
  $('bulkdel-pin').focus();
}

async function confirmBulkDelete() {
  if (!bulkDelIds || !bulkDelIds.length) return;
  const pin = $('bulkdel-pin').value.trim();
  if (!pin) { $('bulkdel-pin-error').textContent = 'יש להזין סיסמת עובד'; return; }

  const emp = await verifyEmployeePIN(pin);
  if (!emp) { $('bulkdel-pin-error').textContent = '❌ סיסמת עובד שגויה'; $('bulkdel-pin').value = ''; $('bulkdel-pin').focus(); return; }

  const ids = bulkDelIds;
  closeModal('bulkdel-pin-modal');
  showLoading(`מעביר ${ids.length} פריטים לסל המחזור...`);

  try {
    for (const id of ids) {
      const rec = invData.find(r => r.id === id);

      const { error } = await sb.from('inventory').update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: emp.name,
        deleted_reason: 'מחיקה גורפת'
      }).eq('id', id);
      if (error) throw new Error(error.message);

      writeLog('soft_delete', id, {
        barcode: rec?.barcode || '',
        brand: rec?.brand_name || '',
        model: rec?.model || '',
        reason: 'מחיקה גורפת',
        source_ref: 'נמחק ע"י: ' + emp.name
      });
    }

    clearSelection();
    await loadInventoryPage();
    toast(`${ids.length} פריטים הועברו לסל המחזור 🗑️`, 's');
  } catch (e) {
    setAlert('inv-alerts', 'שגיאה: ' + (e.message || ''), 'e');
  }
  bulkDelIds = null;
  hideLoading();
}

// ---- Single cell edit ----
function invEdit(td, field, type) {
  if (td.classList.contains('editing')) return;
  const tr = td.closest('tr');
  const recId = tr.dataset.id;
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;

  let curVal = rec[field] || '';
  if (type === 'pct') curVal = rec[field] ? Math.round(rec[field] * 100) : 0;
  if (type === 'number') curVal = rec[field] || 0;

  td.classList.add('editing');
  const input = document.createElement('input');
  input.type = (type === 'number' || type === 'pct') ? 'number' : 'text';
  input.value = curVal;
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();

  const save = () => {
    td.classList.remove('editing');
    let newVal = input.value.trim();
    if (type === 'number') newVal = parseFloat(newVal) || 0;
    else if (type === 'pct') newVal = (parseFloat(newVal) || 0) / 100;

    const origVal = rec[field] || (type === 'number' || type === 'pct' ? 0 : '');
    if (newVal !== origVal) {
      if (!invChanges[recId]) invChanges[recId] = {};
      invChanges[recId][field] = newVal;
      rec[field] = newVal;  // local object stays English-keyed
      td.classList.add('changed');
      $('inv-edit-notice').style.display = 'inline';
    }

    if (type === 'pct') td.textContent = Math.round((rec[field]||0)*100) + '%';
    else td.textContent = rec[field] || '';
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { td.classList.remove('editing'); td.textContent = type==='pct' ? Math.round((rec[field]||0)*100)+'%' : (rec[field]||''); }
  });
}

// ---- Sync cell edit (select dropdown with validation) ----
function invEditSync(td) {
  if (!isAdmin) return;
  if (td.classList.contains('editing')) return;
  const tr = td.closest('tr');
  const recId = tr.dataset.id;
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;

  const curVal = enToHe('website_sync', rec.website_sync) || '';
  td.classList.add('editing');
  const sel = document.createElement('select');
  ['', 'מלא', 'תדמית', 'לא'].forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v || '—';
    if (v === curVal) o.selected = true;
    sel.appendChild(o);
  });
  td.textContent = '';
  td.appendChild(sel);
  sel.focus();

  const save = () => {
    td.classList.remove('editing');
    const newVal = sel.value;
    // Validation: sync=מלא or תדמית requires images, bridge, temple length
    if (newVal === 'מלא' || newVal === 'תדמית') {
      const imgs = rec._images || [];
      const bridge = (rec.bridge || '').toString().trim();
      const temple = (rec.temple_length || '').toString().trim();
      const missing = [];
      if (!imgs.length) missing.push('תמונה');
      if (!bridge) missing.push('גשר');
      if (!temple) missing.push('אורך מוט');
      if (missing.length) {
        toast(`לא ניתן לסנכרן "${newVal}" — חסרים: ${missing.join(', ')}`, 'e');
        td.textContent = curVal;
        return;
      }
    }
    if (newVal !== curVal) {
      if (!invChanges[recId]) invChanges[recId] = {};
      invChanges[recId].website_sync = heToEn('website_sync', newVal);
      rec.website_sync = heToEn('website_sync', newVal);
      td.classList.add('changed');
      $('inv-edit-notice').style.display = 'inline';
    }
    td.textContent = enToHe('website_sync', rec.website_sync) || '';
  };

  sel.addEventListener('blur', save);
  sel.addEventListener('change', () => sel.blur());
  sel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { td.classList.remove('editing'); td.textContent = curVal; }
  });
}

// ---- Image preview ----
function showImagePreview(recId) {
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;
  const imgs = rec._images || [];
  if (!imgs.length) { toast('אין תמונות לפריט זה', 'w'); return; }
  $('img-preview-title').textContent = `${rec.brand_name||''} ${rec.model||''} (${rec.barcode||''})`;
  $('img-gallery').innerHTML = imgs.map(img =>
    `<img src="${encodeURI(img.thumbnails?.large?.url || img.url)}" alt="תמונת פריט">`
  ).join('');
  $('image-preview-modal').style.display = 'flex';
}

async function saveInventoryChanges() {
  const ids = Object.keys(invChanges);
  if (!ids.length) { toast('אין שינויים לשמור', 'w'); return; }
  const ok = await confirmDialog('שמירת שינויים', `לעדכן ${ids.length} רשומות במלאי?`);
  if (!ok) return;

  showLoading('שומר שינויים...');
  try {
    // Capture before-values for logging
    const beforeMap = {};
    for (const id of ids) {
      const rec = invData.find(r => r.id === id);
      if (rec) beforeMap[id] = { ...rec };
    }
    // Strip quantity — must use ➕➖ buttons only
    for (const id of ids) { delete invChanges[id].quantity; if (!Object.keys(invChanges[id]).length) delete invChanges[id]; }
    const filteredIds = Object.keys(invChanges);
    if (!filteredIds.length) { toast('אין שינויים לשמור (כמות משתנה רק דרך ➕➖)', 'w'); hideLoading(); return; }

    const updates = filteredIds.map(id => ({ id, ...invChanges[id] }));
    await batchUpdate(T.INV, updates);
    // Log each change
    for (const id of filteredIds) {
      const before = beforeMap[id] || {};
      const changed = invChanges[id] || {};
      const base = { barcode: before.barcode, brand: before.brand_name, model: before.model };
      // Price changed
      if ('sell_price' in changed && changed.sell_price !== before.sell_price) {
        writeLog('edit_price', id, { ...base, price_before: before.sell_price ?? 0, price_after: changed.sell_price ?? 0 });
      }
      // Other fields changed (not qty/price)
      const otherKeys = Object.keys(changed).filter(k => k !== 'quantity' && k !== 'sell_price');
      if (otherKeys.length) {
        writeLog('edit_details', id, { ...base, reason: 'עריכת פרטים' });
      }
    }
    invChanges = {};
    $('inv-edit-notice').style.display = 'none';
    toast(`${ids.length} רשומות עודכנו בהצלחה`, 's');
    loadInventoryTab();
  } catch(e) {
    const msg = e.message || '';
    if (msg.includes('כבר קיים במערכת') || msg.includes('כפול')) {
      toast('ברקוד זה כבר קיים במערכת', 'e');
    }
    setAlert('inv-alerts', 'שגיאה: ' + msg, 'e');
  }
  hideLoading();
}