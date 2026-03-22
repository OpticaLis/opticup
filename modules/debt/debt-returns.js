// =========================================================
// debt-returns.js — Supplier Returns Tab (Phase 4h)
// Load after: shared.js, supabase-ops.js, debt-supplier-detail.js
// Provides: loadReturnsForSupplier(), viewReturnDetail(),
//   updateReturnStatus(), generateReturnNumber()
// =========================================================

var RETURN_TYPE_MAP = {
  agent_pickup:      'איסוף ע"י נציג',
  ship_to_supplier:  'משלוח לספק',
  pending_in_store:  'ממתין בחנות'
};

var RETURN_STATUS_MAP = {
  pending:               { he: 'ממתין',        cls: 'rst-pending' },
  ready_to_ship:         { he: 'מוכן למשלוח',  cls: 'rst-ready' },
  shipped:               { he: 'נשלח',         cls: 'rst-shipped' },
  agent_picked:          { he: 'סוכן לקח',     cls: 'rst-agent' },
  received_by_supplier:  { he: 'התקבל אצל ספק', cls: 'rst-received' },
  credited:              { he: 'זוכה',         cls: 'rst-credited' }
};

// Allowed status transitions — full chain
var RETURN_TRANSITIONS = {
  pending:               ['ready_to_ship'],
  ready_to_ship:         ['shipped', 'agent_picked'],
  shipped:               ['received_by_supplier'],
  agent_picked:          ['credited'],
  received_by_supplier:  ['credited']
};

// =========================================================
// Load returns for a supplier (called from detail tab)
// =========================================================
async function loadReturnsForSupplier(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;

  try {
    var returns = await fetchAll(T.SUP_RETURNS, [
      ['is_deleted', 'eq', false],
      ['supplier_id', 'eq', supplierId]
    ]);

    // For each return, fetch item count and total value
    var returnIds = returns.map(function(r) { return r.id; });
    var allItems = [];
    if (returnIds.length) {
      allItems = await fetchAll(T.SUP_RETURN_ITEMS, [
        ['return_id', 'in', returnIds]
      ]);
    }

    // Build items map per return
    var itemsMap = {};
    allItems.forEach(function(item) {
      if (!itemsMap[item.return_id]) itemsMap[item.return_id] = [];
      itemsMap[item.return_id].push(item);
    });

    // Enrich returns with aggregated data
    returns.forEach(function(r) {
      var items = itemsMap[r.id] || [];
      r._itemCount = items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
      r._totalValue = items.reduce(function(s, i) {
        return s + (Number(i.cost_price) || 0) * (i.quantity || 1);
      }, 0);
    });

    // Sort newest first
    returns.sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    renderReturnsTable(returns, content);
  } catch (e) {
    console.error('loadReturnsForSupplier error:', e);
    content.innerHTML = '<div class="empty-state">שגיאה בטעינת החזרות</div>';
  }
}

// =========================================================
// Render returns table
// =========================================================
function renderReturnsTable(returns, container) {
  if (!returns.length) {
    container.innerHTML = '<div class="empty-state">אין החזרות לספק זה</div>';
    return;
  }

  var rows = returns.map(function(r) {
    var st = RETURN_STATUS_MAP[r.status] || { he: r.status, cls: '' };
    var typeLbl = RETURN_TYPE_MAP[r.return_type] || r.return_type || '';
    var dateStr = r.created_at ? r.created_at.slice(0, 10) : '';
    var transitions = RETURN_TRANSITIONS[r.status] || [];

    var actionBtns = '<button class="btn-sm" onclick="viewReturnDetail(\'' + r.id + '\')">צפה</button>';
    for (var ti = 0; ti < transitions.length; ti++) {
      var nextSt = transitions[ti];
      var nextLbl = RETURN_STATUS_MAP[nextSt] ? RETURN_STATUS_MAP[nextSt].he : nextSt;
      actionBtns += ' <button class="btn-sm" style="background:#3b82f6;color:#fff" onclick="promptReturnStatusUpdate(\'' +
        r.id + '\',\'' + nextSt + '\')">העבר ל: ' + escapeHtml(nextLbl) + '</button>';
    }

    return '<tr>' +
      '<td>' + escapeHtml(r.return_number || '') + '</td>' +
      '<td>' + escapeHtml(dateStr) + '</td>' +
      '<td>' + escapeHtml(typeLbl) + '</td>' +
      '<td>' + r._itemCount + '</td>' +
      '<td>' + formatILS(r._totalValue) + '</td>' +
      '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td>' + actionBtns + '</td>' +
    '</tr>';
  }).join('');

  container.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr>' +
        '<th>מספר</th><th>תאריך</th><th>סוג</th><th>פריטים</th>' +
        '<th>סכום</th><th>סטטוס</th><th>פעולות</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

// =========================================================
// View return detail (modal with items list)
// =========================================================
async function viewReturnDetail(returnId) {
  showLoading('טוען פרטי החזרה...');
  try {
    var results = await Promise.all([
      fetchAll(T.SUP_RETURNS, [['id', 'eq', returnId]]),
      fetchAll(T.SUP_RETURN_ITEMS, [['return_id', 'eq', returnId]])
    ]);
    var ret = results[0][0];
    var items = results[1];
    if (!ret) { toast('החזרה לא נמצאה', 'e'); hideLoading(); return; }

    var st = RETURN_STATUS_MAP[ret.status] || { he: ret.status, cls: '' };
    var typeLbl = RETURN_TYPE_MAP[ret.return_type] || ret.return_type || '';
    var totalItems = items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
    var totalValue = items.reduce(function(s, i) {
      return s + (Number(i.cost_price) || 0) * (i.quantity || 1);
    }, 0);

    var itemRows = items.map(function(item) {
      return '<tr>' +
        '<td style="font-family:monospace">' + escapeHtml(item.barcode || '') + '</td>' +
        '<td>' + escapeHtml(item.brand_name || '') + '</td>' +
        '<td>' + escapeHtml(item.model || '') + '</td>' +
        '<td>' + escapeHtml(item.color || '') + '</td>' +
        '<td>' + escapeHtml(item.size || '') + '</td>' +
        '<td>' + (item.quantity || 1) + '</td>' +
        '<td>' + formatILS(item.cost_price) + '</td>' +
      '</tr>';
    }).join('');

    var html =
      '<div class="modal-overlay" id="return-detail-modal" style="display:flex" onclick="if(event.target===this)closeModal(\'return-detail-modal\')">' +
        '<div class="modal" style="max-width:700px;width:95%">' +
          '<h3 style="margin:0 0 12px">החזרה ' + escapeHtml(ret.return_number || '') + '</h3>' +
          '<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:.9rem;margin-bottom:12px">' +
            '<div>סוג: <strong>' + escapeHtml(typeLbl) + '</strong></div>' +
            '<div>סטטוס: <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></div>' +
            '<div>תאריך: <strong>' + escapeHtml((ret.created_at || '').slice(0, 10)) + '</strong></div>' +
            (ret.reason ? '<div>סיבה: ' + escapeHtml(ret.reason) + '</div>' : '') +
          '</div>' +
          '<div style="overflow-x:auto">' +
            '<table class="data-table" style="width:100%;font-size:.85rem">' +
              '<thead><tr><th>ברקוד</th><th>מותג</th><th>דגם</th><th>צבע</th><th>גודל</th><th>כמות</th><th>מחיר</th></tr></thead>' +
              '<tbody>' + itemRows + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div style="margin-top:12px;font-size:.9rem;display:flex;gap:20px">' +
            '<div>סה"כ פריטים: <strong>' + totalItems + '</strong></div>' +
            '<div>סה"כ ערך: <strong>' + formatILS(totalValue) + '</strong></div>' +
          '</div>' +
          '<div style="text-align:left;margin-top:16px">' +
            '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeModal(\'return-detail-modal\')">סגור</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Remove existing modal if any
    var existing = $('return-detail-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (e) {
    console.error('viewReturnDetail error:', e);
    toast('שגיאה בטעינת פרטי החזרה', 'e');
  }
  hideLoading();
}

// =========================================================
// Status update — prompt PIN then update
// =========================================================
function promptReturnStatusUpdate(returnId, newStatus) {
  var stLabel = RETURN_STATUS_MAP[newStatus] ? RETURN_STATUS_MAP[newStatus].he : newStatus;

  var html =
    '<div class="modal-overlay" id="return-status-modal" style="display:flex" onclick="if(event.target===this)closeModal(\'return-status-modal\')">' +
      '<div class="modal" style="max-width:400px">' +
        '<h3 style="margin:0 0 12px">עדכון סטטוס החזרה</h3>' +
        '<p style="font-size:.9rem">עדכון ל: <strong>' + escapeHtml(stLabel) + '</strong></p>' +
        '<div class="form-group"><label>סיסמת עובד</label>' +
          '<input type="password" id="ret-status-pin" maxlength="10" placeholder="הזן PIN">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn" style="background:#1a73e8;color:#fff" onclick="_confirmReturnStatus(\'' + returnId + '\',\'' + newStatus + '\')">אשר</button>' +
          '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeModal(\'return-status-modal\')">ביטול</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  var existing = $('return-status-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(function() { var pin = $('ret-status-pin'); if (pin) pin.focus(); }, 100);
}

async function _confirmReturnStatus(returnId, newStatus) {
  var pin = ($('ret-status-pin') || {}).value || '';
  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }

  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('ret-status-pin').value = ''; return; }

  try {
    await updateReturnStatus(returnId, newStatus);
    closeModal('return-status-modal');
    toast('סטטוס עודכן', 's');
    // Reload returns tab
    if (_detailSupplierId) loadReturnsForSupplier(_detailSupplierId);
  } catch (e) {
    console.error('_confirmReturnStatus error:', e);
    toast('שגיאה בעדכון סטטוס: ' + (e.message || ''), 'e');
  }
}

async function updateReturnStatus(returnId, newStatus) {
  var now = new Date().toISOString();
  var updateObj = { id: returnId, status: newStatus, updated_at: now };
  if (newStatus === 'ready_to_ship') updateObj.ready_at = now;
  if (newStatus === 'shipped') updateObj.shipped_at = now;
  if (newStatus === 'agent_picked') updateObj.agent_picked_at = now;
  if (newStatus === 'received_by_supplier') updateObj.received_at = now;
  if (newStatus === 'credited') updateObj.credited_at = now;

  await batchUpdate(T.SUP_RETURNS, [updateObj]);
  await writeLog('return_status_update', null, {
    return_id: returnId,
    new_status: newStatus,
    source_ref: 'supplier_returns'
  });
}

// =========================================================
// Generate return number — RET-{supplier_number}-{seq 4-digit}
// =========================================================
async function generateReturnNumber(supplierId) {
  var supNum = (typeof supplierNumCache !== 'undefined' && supplierNumCache[supplierId])
    ? supplierNumCache[supplierId] : null;
  if (!supNum) {
    // Fallback: fetch supplier_number directly (for pages without loadLookupCaches)
    try {
      var res = await sb.from('suppliers').select('supplier_number').eq('id', supplierId).single();
      supNum = res.data ? res.data.supplier_number : null;
    } catch (e) { /* ignore */ }
  }
  if (!supNum) { toast('ספק ללא מספר — פנה למנהל', 'e'); return null; }

  // Try atomic RPC first (migration 042)
  try {
    var rpcResult = await sb.rpc('next_return_number', {
      p_tenant_id: getTenantId(),
      p_supplier_number: String(supNum)
    });
    if (!rpcResult.error && rpcResult.data) return rpcResult.data;
    if (rpcResult.error) console.warn('next_return_number RPC unavailable, using fallback:', rpcResult.error.message);
  } catch (e) {
    console.warn('next_return_number RPC failed, using fallback:', e.message);
  }

  // Fallback: client-side generation (race condition possible)
  var prefix = 'RET-' + supNum + '-';
  var data = [];
  try {
    var result = await sb.from(T.SUP_RETURNS)
      .select('return_number')
      .eq('tenant_id', getTenantId())
      .like('return_number', prefix + '%')
      .order('return_number', { ascending: false })
      .limit(1);
    data = result.data || [];
  } catch (e) { /* first return for this supplier */ }

  var seq = 1;
  if (data.length) {
    var parts = data[0].return_number.split('-');
    seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  }
  return prefix + String(seq).padStart(4, '0');
}
