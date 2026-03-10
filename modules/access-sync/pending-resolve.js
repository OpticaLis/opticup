// ── Ignore pending ──────────────────────────────────────
async function ignorePending(pendingId, barcode, sourceRef) {
  const ok = await confirmDialog('סימון כלא קיים', 'לסמן שמסגרת זו אינה קיימת במלאי?');
  if (!ok) return;
  try {
    const { error } = await sb.from(T.PENDING_SALES).update({
      status: 'ignored',
      resolved_at: new Date().toISOString(),
      resolution_note: 'לא קיים במלאי'
    }).eq('id', pendingId);
    if (error) throw error;

    writeLog('pending_ignored', null, {
      barcode: barcode,
      reason: 'לא קיים במלאי',
      source_ref: sourceRef
    });

    // Remove card from panel
    const card = $('pcard-' + pendingId);
    if (card) card.remove();
    updatePendingPanelCount();
    loadPendingBadge();
    toast('פריט סומן כלא קיים', 's');
  } catch (e) {
    toast('שגיאה בעדכון', 'e');
  }
}

// ── Resolve pending ─────────────────────────────────────
let resolvePendingTarget = null;

async function resolvePending(pendingId, inventoryId) {
  try {
    // 1. Read the pending row (needed for confirm message)
    const { data: row, error: rErr } = await sb.from(T.PENDING_SALES)
      .select('*').eq('id', pendingId).maybeSingle();
    if (rErr || !row) throw rErr || new Error('row not found');

    // Gate 1 — confirm dialog
    const confirmed = await confirmDialog(`לאשר שינוי כמות במלאי עבור ברקוד ${row.barcode_received}?`);
    if (!confirmed) return;

    // Gate 2 — PIN modal
    resolvePendingTarget = { pendingId, inventoryId, row };
    if (!$('resolve-pin-modal')) {
      const div = document.createElement('div');
      div.id = 'resolve-pin-modal';
      div.className = 'modal-overlay';
      div.style.display = 'none';
      div.innerHTML = `
        <div class="modal" style="max-width:360px">
          <h3 style="margin:0 0 12px 0">🔒 אימות עובד</h3>
          <p style="margin:0 0 12px 0;font-size:.9rem;color:var(--g500)">טיפול בפריט ממתין דורש סיסמת עובד</p>
          <input type="password" id="resolve-pin" placeholder="סיסמת עובד" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px"
                 onkeydown="if(event.key==='Enter') confirmResolvePending()">
          <p id="resolve-pin-error" style="color:var(--error);font-size:.85rem;margin:0 0 8px 0"></p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-g btn-sm" onclick="closeModal('resolve-pin-modal')">ביטול</button>
            <button class="btn btn-p btn-sm" onclick="confirmResolvePending()">✅ אשר</button>
          </div>
        </div>`;
      document.body.appendChild(div);
      div.addEventListener('click', function(e) { if (e.target === this) closeModal('resolve-pin-modal'); });
    }
    $('resolve-pin').value = '';
    $('resolve-pin-error').textContent = '';
    $('resolve-pin-modal').style.display = 'flex';
    $('resolve-pin').focus();
  } catch (e) {
    toast('שגיאה בטיפול בפריט: ' + (e.message || e), 'e');
  }
}

async function confirmResolvePending() {
  if (!resolvePendingTarget) return;
  const pin = $('resolve-pin').value.trim();
  if (!pin) { $('resolve-pin-error').textContent = 'יש להזין סיסמת עובד'; return; }

  const { data: emp } = await sb.from(T.EMPLOYEES).select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) { $('resolve-pin-error').textContent = '❌ סיסמת עובד שגויה'; $('resolve-pin').value = ''; $('resolve-pin').focus(); return; }
  sessionStorage.setItem('prizma_user', emp.name);

  const { pendingId, inventoryId, row } = resolvePendingTarget;
  try {
    // 2. Optimistic lock — only resolve if still pending
    const { data: lockResult } = await sb.from(T.PENDING_SALES).update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_inventory_id: inventoryId,
      resolution_note: `הותאם ידנית על ידי ${emp.name}`
    }).eq('id', pendingId).eq('status', 'pending').select('id');
    if (!lockResult || lockResult.length === 0) {
      toast('הפריט כבר טופל על ידי משתמש אחר', 'e');
      renderPendingPanel();
      closeModal('resolve-pin-modal');
      resolvePendingTarget = null;
      return;
    }

    // 3. Read current inventory
    const { data: inv, error: iErr } = await sb.from(T.INV)
      .select('id, quantity, barcode, brand_id, model').eq('id', inventoryId).maybeSingle();
    if (iErr || !inv) throw iErr || new Error('inventory not found');

    // 4. Calculate new quantity
    const qtyBefore = inv.quantity;
    let qtyAfter;
    if (row.action_type === 'sale') {
      qtyAfter = Math.max(0, qtyBefore - row.quantity);
      const { error: uErr } = await sb.rpc('decrement_inventory', { inv_id: inventoryId, delta: row.quantity });
      if (uErr) throw uErr;
    } else {
      qtyAfter = qtyBefore + row.quantity;
      const { error: uErr } = await sb.rpc('increment_inventory', { inv_id: inventoryId, delta: row.quantity });
      if (uErr) throw uErr;
    }

    // 6. Resolve brand name for log
    let brandName = '';
    if (inv.brand_id) {
      brandName = brandCacheRev[inv.brand_id] || '';
    }

    // 7. writeLog
    writeLog(row.action_type === 'sale' ? 'sale' : 'credit_return', inventoryId, {
      barcode: inv.barcode,
      brand: brandName,
      model: inv.model,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      reason: 'סנכרון Access — התאמה ידנית',
      source_ref: row.source_ref + ':' + row.filename,
      performed_by: emp.name
    });

    // 8. Remove card, update badge
    closeModal('resolve-pin-modal');
    const card = $('pcard-' + pendingId);
    if (card) card.remove();
    updatePendingPanelCount();
    loadPendingBadge();
    toast('פריט טופל בהצלחה', 's');
  } catch (e) {
    toast('שגיאה בטיפול בפריט: ' + (e.message || e), 'e');
  }
  resolvePendingTarget = null;
}

// ── Update panel header count ───────────────────────────
function updatePendingPanelCount() {
  const container = $('pending-cards-container');
  if (!container) return;
  const remaining = container.querySelectorAll('[id^="pcard-"]').length;
  const overlay = $('pending-panel-overlay');
  if (overlay) {
    const h3 = overlay.querySelector('h3');
    if (h3) h3.innerHTML = `&#9888;&#65039; ממתינים לטיפול (${remaining})`;
  }
  if (remaining === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:32px 0">אין פריטים ממתינים</p>';
  }
}

// ── Event delegation for pending panel ──────────────────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const pendingId = btn.dataset.pendingId;
  if (!pendingId) return;
  if (action === 'suggestions') {
    loadSuggestions(pendingId, btn.dataset.barcode);
  } else if (action === 'free-search') {
    toggleFreeSearch(pendingId);
  } else if (action === 'ignore') {
    ignorePending(pendingId, btn.dataset.barcode, btn.dataset.sourceRef);
  } else if (action === 'resolve') {
    resolvePending(pendingId, btn.dataset.inventoryId);
  }
});

document.addEventListener('input', function(e) {
  const input = e.target;
  if (input.dataset.pendingSearch) {
    debouncePendingSearch(input.dataset.pendingSearch, input.value);
  }
});
