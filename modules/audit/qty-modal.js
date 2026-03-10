// ---- Quantity Add/Remove ----
const QTY_REASONS_ADD = ['קבלת סחורה', 'החזרה מלקוח', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
const QTY_REASONS_REMOVE = ['מכירה', 'העברה לסניף', 'פגום/אבדן', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
let qtyModalState = {};

function openQtyModal(inventoryId, mode) {
  const rec = invData.find(r => r.id === inventoryId);
  if (!rec) { toast('פריט לא נמצא', 'e'); return; }

  const bc = rec.barcode || '';
  const brand = rec.brand_name || '';
  const model = rec.model || '';
  const currentQty = parseInt(rec.quantity) || 0;

  qtyModalState = { id: inventoryId, mode, currentQty, barcode: bc, brand, model };

  const isAdd = mode === 'add';
  $('qty-modal-title').textContent = isAdd ? '➕ הוספת כמות' : '➖ הוצאת כמות';
  $('qty-modal-item').textContent = [bc, brand, model].filter(Boolean).join(' | ');
  $('qty-modal-current').textContent = currentQty;
  $('qty-modal-verb').textContent = isAdd ? 'להוספה' : 'להוצאה';
  $('qty-modal-confirm').textContent = isAdd ? '✅ אשר הוספה' : '✅ אשר הוצאה';
  $('qty-modal-confirm').className = isAdd ? 'btn btn-s' : 'btn btn-d';

  // Populate reasons
  const reasons = isAdd ? QTY_REASONS_ADD : QTY_REASONS_REMOVE;
  const sel = $('qty-modal-reason');
  sel.innerHTML = '<option value="">— בחר סיבה —</option>' + reasons.map(r => `<option value="${r}">${r}</option>`).join('');

  // Reset fields
  $('qty-modal-amount').value = 1;
  $('qty-modal-note').value = '';
  $('qty-modal-pin').value = '';

  $('qty-modal').style.display = 'flex';
  $('qty-modal-amount').focus();
}

async function confirmQtyChange() {
  const { id, mode, currentQty, barcode, brand, model } = qtyModalState;
  const amount = parseInt($('qty-modal-amount').value) || 0;
  const reason = $('qty-modal-reason').value;
  const note = $('qty-modal-note').value.trim();
  const pin = $('qty-modal-pin').value.trim();

  // Validations
  if (amount < 1) { toast('כמות חייבת להיות 1 לפחות', 'w'); return; }
  if (!reason) { toast('יש לבחור סיבה', 'w'); return; }
  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }

  // Remove guard
  if (mode === 'remove' && amount > currentQty) {
    toast(`❌ לא ניתן להוציא יותר מהכמות הקיימת (${currentQty} יחידות)`, 'e');
    return;
  }

  // Verify PIN
  const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) { toast('❌ סיסמת עובד שגויה', 'e'); $('qty-modal-pin').value = ''; $('qty-modal-pin').focus(); return; }

  // Store performer name
  sessionStorage.setItem('prizma_user', emp.name);

  const newQty = mode === 'add' ? currentQty + amount : currentQty - amount;
  const fullReason = note ? reason + ' — ' + note : reason;

  try {
    // Update DB (atomic RPC)
    const rpcName = mode === 'add' ? 'increment_inventory' : 'decrement_inventory';
    const { error } = await sb.rpc(rpcName, { inv_id: id, delta: amount });
    if (error) throw new Error(error.message);

    // Write log
    const action = mode === 'remove' ? 'manual_remove' : 'edit_qty';
    await writeLog(action, id, {
      barcode, brand, model,
      qty_before: currentQty,
      qty_after: newQty,
      reason: fullReason,
      source_ref: 'שינוי כמות ידני'
    });

    // Update in-memory data + UI
    const rec = invData.find(r => r.id === id);
    if (rec) rec.quantity = newQty;

    const qtyTd = document.querySelector(`td[data-qty-id="${id}"]`);
    if (qtyTd) {
      const qC = newQty > 0 ? 'var(--success)' : 'var(--error)';
      qtyTd.style.color = qC;
      qtyTd.innerHTML = `${newQty} <span class="qty-btns"><button class="qty-btn qty-plus" onclick="openQtyModal('${id}','add')" title="הוסף כמות">➕</button><button class="qty-btn qty-minus" onclick="openQtyModal('${id}','remove')" title="הוצא כמות">➖</button></span>`;
    }

    closeModal('qty-modal');
    toast(`✅ כמות עודכנה: ${currentQty} → ${newQty}`, 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}
