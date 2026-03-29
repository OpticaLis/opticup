// receipt-list.js — Receipt list loading and rendering
// Split from goods-receipt.js. Load AFTER goods-receipt.js.
// Provides: loadReceiptTab()

async function loadReceiptTab() {
  showLoading('טוען קבלות סחורה...');
  try {
    // Show step1, hide step2
    $('rcpt-step1').style.display = '';
    $('rcpt-step2').style.display = 'none';

    // Summary cards
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString();

    const [draftsRes, confirmedRes, itemsRes, listRes] = await Promise.all([
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('status', 'draft'),
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('status', 'confirmed').gte('created_at', weekStr),
      sb.from(T.RCPT_ITEMS).select('quantity', { count: 'exact', head: false })
        .eq('tenant_id', getTenantId())
        .in('receipt_id',
          (await sb.from(T.RECEIPTS).select('id').eq('tenant_id', getTenantId()).eq('status', 'confirmed').gte('created_at', weekStr)).data?.map(r => r.id) || []
        ),
      sb.from(T.RECEIPTS).select('*').eq('tenant_id', getTenantId()).order('created_at', { ascending: false }).limit(100)
    ]);

    $('rcpt-drafts').textContent = draftsRes.count || 0;
    $('rcpt-confirmed-week').textContent = confirmedRes.count || 0;
    const totalItems = (itemsRes.data || []).reduce((s, r) => s + (r.quantity || 0), 0);
    $('rcpt-items-week').textContent = totalItems;

    // Receipt list
    const receipts = listRes.data || [];
    const tb = $('rcpt-list-body');
    if (!receipts.length) {
      tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#999">אין קבלות</td></tr>';
    } else {
      // Get item counts per receipt
      const receiptIds = receipts.map(r => r.id);
      const { data: itemCounts } = await sb.from(T.RCPT_ITEMS).select('receipt_id, quantity').eq('tenant_id', getTenantId());
      const countMap = {};
      (itemCounts || []).forEach(i => {
        if (!countMap[i.receipt_id]) countMap[i.receipt_id] = { count: 0, total: 0 };
        countMap[i.receipt_id].count++;
        countMap[i.receipt_id].total += (i.quantity || 0);
      });

      tb.innerHTML = receipts.map((r, idx) => {
        const c = countMap[r.id] || { count: 0, total: 0 };
        const supName = r.supplier_id ? (supplierCacheRev[r.supplier_id] || '—') : '—';
        const statusCls = `rcpt-status rcpt-status-${r.status}`;
        const statusLabel = RCPT_STATUS_LABELS[r.status] || r.status;
        const typeLabel = RCPT_TYPE_LABELS[r.receipt_type] || r.receipt_type;
        const dateStr = r.receipt_date || '';

        let actions = '';
        if (r.status === 'draft') {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-edit" data-id="${escapeHtml(r.id)}" title="ערוך">✏️</button>
            <button class="btn btn-s btn-sm btn-rcpt-confirm" data-id="${escapeHtml(r.id)}" title="אשר">✓</button>
            <button class="btn btn-d btn-sm btn-rcpt-cancel" data-id="${escapeHtml(r.id)}" title="בטל">✖</button>`;
        } else {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-view" data-id="${escapeHtml(r.id)}" title="צפה">👁</button>`;
          if (r.status === 'confirmed') {
            actions += ` <button class="btn btn-p btn-sm btn-rcpt-export" data-id="${escapeHtml(r.id)}" title="ייצוא לAccess">📤</button>`;
            actions += ` <button class="btn btn-sm btn-rcpt-print-barcodes" data-id="${escapeHtml(r.id)}" title="\u05D9\u05D9\u05E6\u05D5\u05D0 \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD" style="background:#7c3aed;color:#fff">\uD83D\uDCCB</button>`;
            actions += ` <button class="btn btn-sm btn-rcpt-photo" data-id="${escapeHtml(r.id)}" data-number="${escapeHtml(r.receipt_number)}" title="\u05E6\u05DC\u05DD \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD" style="background:#2196F3;color:#fff">\uD83D\uDCF7</button>`;
          }
        }

        // Multi-doc badge: show "+N" if multiple document numbers
        var docNums = r.document_numbers || [];
        var extraCount = docNums.length > 1 ? docNums.length - 1 : 0;
        var docNumDisplay = '<strong>' + escapeHtml(r.receipt_number) + '</strong>';
        if (extraCount > 0) {
          docNumDisplay += ' <span style="background:#e0e7ff;color:#3730a3;padding:1px 5px;border-radius:4px;font-size:.75rem">+' + extraCount + '</span>';
        }

        return `<tr>
          <td>${idx + 1}</td>
          <td>${docNumDisplay}</td>
          <td>${typeLabel}</td>
          <td>${supName}</td>
          <td>${dateStr}</td>
          <td>${c.count} (${c.total} יח׳)</td>
          <td>${r.total_amount ? '₪' + Number(r.total_amount).toLocaleString() : '—'}</td>
          <td><span class="${statusCls}">${statusLabel}</span></td>
          <td style="white-space:nowrap">${actions}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) {
    console.error('loadReceiptTab error:', e);
    setAlert('rcpt-list-alerts', 'שגיאה בטעינת קבלות: ' + (e.message || ''), 'e');
  }
  hideLoading();
}