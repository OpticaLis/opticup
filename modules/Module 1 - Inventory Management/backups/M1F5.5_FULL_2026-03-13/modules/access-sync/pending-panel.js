// =========================================================
// PENDING SALES PANEL
// =========================================================

let pendingSearchTimers = {};

async function renderPendingPanel() {
  showLoading('טוען ממתינים...');
  try {
    const { data, error } = await sb.from(T.PENDING_SALES)
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    hideLoading();

    // Build overlay
    let overlay = $('pending-panel-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pending-panel-overlay';
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '1001';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    const count = data ? data.length : 0;
    overlay.innerHTML = `
      <div class="modal" style="max-width:800px;width:95%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0">&#9888;&#65039; ממתינים לטיפול (${count})</h3>
          <button class="btn btn-g btn-sm" onclick="closePendingPanel()" style="min-width:auto;padding:4px 12px;font-size:1.1rem">&times;</button>
        </div>
        <div id="pending-cards-container">
          ${count === 0
            ? '<p style="text-align:center;color:#888;padding:32px 0">אין פריטים ממתינים</p>'
            : data.map(r => pendingCardHtml(r)).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    hideLoading();
    toast('שגיאה בטעינת ממתינים', 'e');
  }
}

function closePendingPanel() {
  const overlay = $('pending-panel-overlay');
  if (overlay) overlay.style.display = 'none';
}

function pendingCardHtml(r) {
  const date = new Date(r.transaction_date).toLocaleDateString('he-IL');
  const typeLabel = r.action_type === 'return' ? 'החזרה' : 'מכירה';
  return `
    <div class="card" id="pcard-${r.id}" style="margin-bottom:12px;border:1px solid #e2e8f0;padding:14px">
      <div style="display:flex;flex-wrap:wrap;gap:8px 24px;margin-bottom:6px;font-size:.9rem">
        <span><b>ברקוד:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(r.barcode_received)}</code></span>
        <span><b>כמות:</b> ${r.quantity}</span>
        <span><b>הזמנה:</b> ${escapeHtml(r.order_number)}</span>
        <span><b>סוג:</b> ${typeLabel}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 24px;margin-bottom:10px;font-size:.85rem;color:#64748b">
        <span><b>סיבה:</b> ${escapeHtml(r.reason)}</span>
        <span><b>תאריך:</b> ${date}</span>
        <span><b>קובץ:</b> ${escapeHtml(r.filename)}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" data-action="suggestions" data-pending-id="${r.id}" data-barcode="${escapeHtml(r.barcode_received)}">&#128161; המלצות</button>
        <button class="btn btn-g btn-sm" data-action="free-search" data-pending-id="${r.id}">&#128269; חיפוש חופשי</button>
        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5" data-action="ignore" data-pending-id="${r.id}" data-barcode="${escapeHtml(r.barcode_received)}" data-source-ref="${escapeHtml(r.source_ref)}">&#10006; לא קיים במלאי</button>
      </div>
      <div id="pcard-suggestions-${r.id}" style="display:none;margin-top:10px"></div>
      <div id="pcard-search-${r.id}" style="display:none;margin-top:10px"></div>
    </div>
  `;
}

// ── Suggestions ─────────────────────────────────────────
async function loadSuggestions(pendingId, barcode) {
  const container = $('pcard-suggestions-' + pendingId);
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML = '<p style="color:#888;font-size:.85rem">מחפש התאמות...</p>';

  try {
    // Try partial barcode matches and similar barcodes
    const patterns = [];
    if (barcode.length >= 5) {
      patterns.push(barcode.slice(-5)); // last 5 digits
    }
    let results = [];
    // Exact barcode match first
    const { data: exact } = await sb.from(T.INV)
      .select('id, barcode, brand_id, model, color, size, quantity')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false)
      .gt('quantity', 0)
      .eq('barcode', barcode)
      .limit(1);
    if (exact && exact.length) results.push(...exact);

    // Partial matches on barcode suffix
    if (results.length < 5 && patterns[0]) {
      const { data: partial } = await sb.from(T.INV)
        .select('id, barcode, brand_id, model, color, size, quantity')
        .eq('tenant_id', getTenantId())
        .eq('is_deleted', false)
        .gt('quantity', 0)
        .ilike('barcode', '%' + patterns[0])
        .limit(5);
      if (partial) {
        for (const p of partial) {
          if (!results.find(r => r.id === p.id)) results.push(p);
        }
      }
    }

    // Deduplicate and limit
    results = results.slice(0, 5);

    if (results.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:.85rem">לא נמצאו התאמות</p>';
      return;
    }

    // Resolve brand names
    const brandIds = [...new Set(results.map(r => r.brand_id).filter(Boolean))];
    let brandMap = {};
    if (brandIds.length) {
      const { data: br } = await sb.from(T.BRANDS).select('id, name').eq('tenant_id', getTenantId()).in('id', brandIds);
      if (br) br.forEach(b => brandMap[b.id] = b.name);
    }

    container.innerHTML = '<p style="font-size:.82rem;color:#64748b;margin-bottom:6px"><b>התאמות אפשריות:</b></p>' +
      results.map(r => {
        const brand = brandMap[r.brand_id] || '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;font-size:.85rem;background:#fafafa">
          <span>${escapeHtml(brand)} ${escapeHtml(r.model) || ''} | ${escapeHtml(r.color) || ''} ${escapeHtml(r.size) || ''} | <code>${escapeHtml(r.barcode) || '—'}</code> | כמות: ${r.quantity}</span>
          <button class="btn btn-p btn-sm" style="padding:2px 10px;font-size:.8rem" data-action="resolve" data-pending-id="${pendingId}" data-inventory-id="${r.id}">זה הפריט</button>
        </div>`;
      }).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:#dc2626;font-size:.85rem">שגיאה בחיפוש</p>';
  }
}

// ── Free search ─────────────────────────────────────────
function toggleFreeSearch(pendingId) {
  const container = $('pcard-search-' + pendingId);
  if (!container) return;
  if (container.style.display === 'block') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = `
    <input type="text" id="psearch-input-${pendingId}" placeholder="חפש ברקוד / מותג / דגם..."
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.9rem;margin-bottom:6px"
      data-pending-search="${pendingId}">
    <div id="psearch-results-${pendingId}"></div>
  `;
  container.querySelector('input').focus();
}

function debouncePendingSearch(pendingId, query) {
  if (pendingSearchTimers[pendingId]) clearTimeout(pendingSearchTimers[pendingId]);
  pendingSearchTimers[pendingId] = setTimeout(() => runPendingSearch(pendingId, query), 300);
}

async function runPendingSearch(pendingId, query) {
  const resultsDiv = $('psearch-results-' + pendingId);
  if (!resultsDiv) return;
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }
  resultsDiv.innerHTML = '<p style="color:#888;font-size:.82rem">מחפש...</p>';

  try {
    const q = query.trim();
    // Search by barcode, model, or brand name
    let items = [];

    // Barcode exact or partial
    const { data: byBarcode } = await sb.from(T.INV)
      .select('id, barcode, brand_id, model, color, size, quantity')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false)
      .gt('quantity', 0)
      .ilike('barcode', '%' + q + '%')
      .limit(5);
    if (byBarcode) items.push(...byBarcode);

    // Model search
    if (items.length < 5) {
      const { data: byModel } = await sb.from(T.INV)
        .select('id, barcode, brand_id, model, color, size, quantity')
        .eq('tenant_id', getTenantId())
        .eq('is_deleted', false)
        .gt('quantity', 0)
        .ilike('model', '%' + q + '%')
        .limit(5);
      if (byModel) {
        for (const m of byModel) {
          if (!items.find(r => r.id === m.id)) items.push(m);
        }
      }
    }

    items = items.slice(0, 8);

    if (items.length === 0) {
      resultsDiv.innerHTML = '<p style="color:#888;font-size:.82rem">לא נמצאו תוצאות</p>';
      return;
    }

    // Resolve brand names
    const brandIds = [...new Set(items.map(r => r.brand_id).filter(Boolean))];
    let brandMap = {};
    if (brandIds.length) {
      const { data: br } = await sb.from(T.BRANDS).select('id, name').eq('tenant_id', getTenantId()).in('id', brandIds);
      if (br) br.forEach(b => brandMap[b.id] = b.name);
    }

    resultsDiv.innerHTML = items.map(r => {
      const brand = brandMap[r.brand_id] || '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;font-size:.85rem;background:#fafafa;cursor:pointer" data-action="resolve" data-pending-id="${pendingId}" data-inventory-id="${r.id}">
        <span>${escapeHtml(brand)} ${escapeHtml(r.model) || ''} | ${escapeHtml(r.color) || ''} ${escapeHtml(r.size) || ''} | <code>${escapeHtml(r.barcode) || '—'}</code> | כמות: ${r.quantity}</span>
        <span style="color:var(--accent);font-size:.8rem">&#10004; בחר</span>
      </div>`;
    }).join('');
  } catch (e) {
    resultsDiv.innerHTML = '<p style="color:#dc2626;font-size:.82rem">שגיאה בחיפוש</p>';
  }
}
