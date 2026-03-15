// ---- Quantity Add/Remove ----
const QTY_REASONS_ADD = ['קבלת סחורה', 'החזרה מלקוח', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
const QTY_REASONS_REMOVE = ['מכירה', 'נשלח לזיכוי', 'העברה לסניף', 'פגום/אבדן', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
let qtyModalState = {};

function openQtyModal(inventoryId, mode) {
  const rec = invData.find(r => r.id === inventoryId);
  if (!rec) { toast('פריט לא נמצא', 'e'); return; }

  const bc = rec.barcode || '';
  const brand = rec.brand_name || '';
  const model = rec.model || '';
  const currentQty = parseInt(rec.quantity) || 0;

  qtyModalState = { id: inventoryId, mode, currentQty, barcode: bc, brand, model,
    supplier_id: rec.supplier_id || '', cost_price: rec.cost_price || 0,
    color: rec.color || '', size: rec.size || '' };

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
  const { id, mode, currentQty, barcode, brand, model, supplier_id, cost_price, color, size } = qtyModalState;
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
  const emp = await verifyPinOnly(pin);
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
    const isCreditReturn = mode === 'remove' && reason === 'נשלח לזיכוי';
    const action = isCreditReturn ? 'credit_return' : (mode === 'remove' ? 'manual_remove' : 'edit_qty');
    await writeLog(action, id, {
      barcode, brand, model,
      qty_before: currentQty,
      qty_after: newQty,
      reason: fullReason,
      source_ref: 'שינוי כמות ידני'
    });

    // Create supplier_return when reason is 'נשלח לזיכוי'
    if (isCreditReturn && supplier_id) {
      _createReturnFromReduction(id, barcode, brand, model, color, size, supplier_id, cost_price, amount)
        .catch(err => {
          console.error('Return creation failed (inventory already decremented):', err);
          toast('⚠ המלאי עודכן אך יצירת הזיכוי נכשלה — צור זיכוי ידנית', 'w');
        });
    }

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
    const toastMsg = isCreditReturn
      ? `✅ הכמות עודכנה — פריט הועבר לזיכוי (${currentQty} → ${newQty})`
      : `✅ כמות עודכנה: ${currentQty} → ${newQty}`;
    toast(toastMsg, 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}
