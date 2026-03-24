// ---- Item History ----
let historyCache = [];

const ACTION_MAP = {
  entry_manual:     { icon: '📥', label: 'כניסה ידנית',        color: '#4CAF50' },
  entry_po:         { icon: '📦', label: 'כניסה מהזמנת רכש',   color: '#4CAF50' },
  entry_excel:      { icon: '📊', label: 'כניסה מקובץ Excel',  color: '#4CAF50' },
  transfer_in:      { icon: '🔽', label: 'העברה נכנסת',        color: '#4CAF50' },
  sale:             { icon: '💰', label: 'מכירה',              color: '#f44336' },
  credit_return:    { icon: '↩️', label: 'החזרת זיכוי',        color: '#f44336' },
  manual_remove:    { icon: '➖', label: 'הוצאה ידנית',        color: '#f44336' },
  transfer_out:     { icon: '🔼', label: 'העברה יוצאת',        color: '#f44336' },
  edit_qty:         { icon: '✏️', label: 'עריכת כמות',         color: '#2196F3' },
  edit_price:       { icon: '💲', label: 'עריכת מחיר',         color: '#2196F3' },
  edit_details:     { icon: '📝', label: 'עריכת פרטים',        color: '#2196F3' },
  edit_barcode:     { icon: '🔖', label: 'עריכת ברקוד',        color: '#2196F3' },
  soft_delete:      { icon: '🗑️', label: 'מחיקה',             color: '#9E9E9E' },
  restore:          { icon: '♻️', label: 'שחזור',              color: '#92400e' },
  permanent_delete: { icon: '❌', label: 'מחיקה לצמיתות',      color: '#9E9E9E' },
  test:             { icon: '🧪', label: 'בדיקה',              color: '#9E9E9E' },
  entry_receipt:    { icon: '📦', label: 'קבלת סחורה',          color: '#4CAF50' },
  po_created:       { icon: '📋', label: 'הזמנת רכש',            color: '#2196F3' },
  reduce_qty:       { icon: '📉', label: 'הפחתת כמות',           color: 'orange' },
  return_qty:       { icon: '↩️', label: 'החזרת כמות',           color: 'blue' },
  pending_ignored:  { icon: '🚫', label: 'ממתין - בוטל',         color: 'gray' }
};

async function openItemHistory(id, barcode, brand, model) {
  const title = [barcode, brand, model].filter(Boolean).join(' | ');
  $('history-title').textContent = 'היסטוריית פריט — ' + (title || id.slice(0,8));

  $('history-timeline').innerHTML = '<p style="text-align:center;padding:24px">טוען...</p>';
  $('history-export-btn').style.display = 'none';
  var entryDocEl = $('history-entry-doc');
  if (entryDocEl) entryDocEl.innerHTML = '';
  $('history-modal').style.display = 'flex';

  // Non-blocking: load entry document link
  _loadEntryDocLink(id);

  try {
    const { data: logs, error } = await sb
      .from('inventory_logs')
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('inventory_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    historyCache = logs || [];

    if (!historyCache.length) {
      $('history-timeline').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">אין היסטוריה לפריט זה</p>';
      return;
    }

    $('history-export-btn').style.display = '';

    const html = historyCache.map(log => {
      const info = ACTION_MAP[log.action] || { icon: '❓', label: log.action, color: '#9E9E9E' };
      const dt = new Date(log.created_at);
      const dateStr = dt.toLocaleDateString('he-IL');
      const timeStr = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

      let details = [];
      if (log.qty_before != null && log.qty_after != null) {
        details.push(`כמות: ${log.qty_before} → ${log.qty_after}`);
      }
      if (log.price_before != null && log.price_after != null) {
        details.push(`מחיר: ${log.price_before} → ${log.price_after}`);
      }
      if (log.reason) details.push(`סיבה: ${escapeHtml(log.reason)}`);
      if (log.source_ref) details.push(`מקור: ${escapeHtml(log.source_ref)}`);
      if (log.performed_by && log.performed_by !== 'system') details.push(`ע"י: ${escapeHtml(log.performed_by)}`);

      return `<div style="display:flex;gap:12px;align-items:flex-start;padding:8px 4px;border-right:3px solid ${info.color};margin-bottom:8px;border-radius:0 6px 6px 0;background:rgba(255,255,255,0.02)">
        <div style="font-size:1.4rem;min-width:32px;text-align:center">${info.icon}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <strong style="color:${info.color}">${info.label}</strong>
            <span style="font-size:0.8rem;color:var(--g500)">${dateStr} ${timeStr}</span>
          </div>
          ${details.length ? `<div style="font-size:0.85rem;color:var(--g400)">${details.join(' · ')}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    $('history-timeline').innerHTML = html;
  } catch (e) {
    $('history-timeline').innerHTML = `<p style="text-align:center;color:var(--error);padding:24px">שגיאה: ${escapeHtml(e.message)}</p>`;
  }
}

function exportHistoryExcel() {
  if (!historyCache.length) { toast('אין היסטוריה לייצוא', 'w'); return; }

  const headers = ['תאריך', 'שעה', 'פעולה', 'ברקוד', 'מותג', 'דגם', 'כמות לפני', 'כמות אחרי', 'מחיר לפני', 'מחיר אחרי', 'סיבה', 'מקור', 'בוצע ע"י'];
  const rows = historyCache.map(log => {
    const dt = new Date(log.created_at);
    const info = ACTION_MAP[log.action] || { label: log.action };
    return [
      dt.toLocaleDateString('he-IL'),
      dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      info.label,
      log.barcode || '',
      log.brand || '',
      log.model || '',
      log.qty_before ?? '',
      log.qty_after ?? '',
      log.price_before ?? '',
      log.price_after ?? '',
      log.reason || '',
      log.source_ref || '',
      log.performed_by || ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = headers.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'היסטוריה');
  const bc = historyCache[0]?.barcode || 'item';
  XLSX.writeFile(wb, `history_${bc}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✅ קובץ היסטוריה נשמר', 's');
}

// Entry history (openEntryHistory, toggleHistGroup, etc.) → entry-history.js

// ── Entry document link — shows which supplier doc this item entered with ──
async function _loadEntryDocLink(inventoryId) {
  var el = $('history-entry-doc');
  if (!el) return;
  try {
    var tid = getTenantId();
    // Step 1: Find receipt item for this inventory item
    var { data: riRows, error: riErr } = await sb.from(T.RCPT_ITEMS)
      .select('receipt_id')
      .eq('inventory_id', inventoryId)
      .eq('tenant_id', tid)
      .limit(1);
    if (riErr || !riRows || !riRows.length) return; // no receipt — manual entry, show nothing

    var receiptId = riRows[0].receipt_id;

    // Step 2: Find supplier document linked to this receipt
    var { data: docRows, error: docErr } = await sb.from(T.SUP_DOCS)
      .select('id, document_number, internal_number, document_date, document_type_id, supplier_id')
      .eq('goods_receipt_id', receiptId)
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .limit(1);
    if (docErr || !docRows || !docRows.length) return;

    var doc = docRows[0];

    // Resolve type name and supplier name from caches
    var typeName = '';
    if (typeof _docTypes !== 'undefined' && _docTypes.length) {
      var dt = _docTypes.find(function(t) { return t.id === doc.document_type_id; });
      if (dt) typeName = dt.name_he;
    }
    if (!typeName) {
      // Fallback: query doc type
      var { data: dtRows } = await sb.from(T.DOC_TYPES).select('name_he').eq('id', doc.document_type_id).eq('tenant_id', getTenantId()).limit(1);
      if (dtRows && dtRows.length) typeName = dtRows[0].name_he;
    }

    var supName = '';
    if (typeof supplierCacheRev !== 'undefined') supName = supplierCacheRev[doc.supplier_id] || '';
    if (!supName) {
      var { data: supRows } = await sb.from(T.SUPPLIERS).select('name').eq('id', doc.supplier_id).eq('tenant_id', getTenantId()).limit(1);
      if (supRows && supRows.length) supName = supRows[0].name;
    }

    var label = (typeName || '\u05DE\u05E1\u05DE\u05DA') + ' #' + (doc.document_number || doc.internal_number || '');
    if (supName) label += ' \u05DE-' + supName;
    if (doc.document_date) label += ' (' + doc.document_date + ')';

    el.innerHTML =
      '<div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:.85rem;color:#1e40af">' +
        '\uD83D\uDCC4 \u05E0\u05DB\u05E0\u05E1 \u05E2\u05DD: ' + escapeHtml(label) +
      '</div>';
  } catch (e) {
    console.warn('_loadEntryDocLink error:', e);
    // Non-blocking — just hide on error
  }
}
