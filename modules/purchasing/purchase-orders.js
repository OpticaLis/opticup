// ============================================================
// purchase-orders.js — הזמנות רכש
// ============================================================

// ── State ────────────────────────────────────────────────────
let poData = [];
let poFilters = { status: '', supplier: '' };
let currentPO = null;
let currentPOItems = [];

// ── Tab entry point ──────────────────────────────────────────
async function loadPurchaseOrdersTab() {
  // Reset PO state so next "new PO" starts clean
  currentPO = null;
  currentPOItems = [];

  const container = document.getElementById('po-list-container2');
  if (!container) return;
  container.innerHTML = '<p style="padding:20px">טוען...</p>';
  try {
    const { data, error } = await sb
      .from(T.PO)
      .select(`*, suppliers(name)`)
      .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false });
    if (error) throw error;
    poData = data || [];
    renderPoList(container);
  } catch (err) {
    container.innerHTML = `<p style="color:red;padding:20px">שגיאה: ${err.message}</p>`;
  }
}

// ── Render list ──────────────────────────────────────────────
function renderPoList(container) {
  const filtered = applyPoFilters(poData);

  const drafts   = poData.filter(p => p.status === 'draft').length;
  const sent     = poData.filter(p => p.status === 'sent').length;
  const partial  = poData.filter(p => p.status === 'partial').length;
  const thisMonth = poData.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const statusLabel = {
    draft:     { text: 'טיוטה',    color: '#9e9e9e' },
    sent:      { text: 'נשלחה',    color: '#2196F3' },
    partial:   { text: 'חלקי',     color: '#FF9800' },
    received:  { text: 'התקבל',    color: '#4CAF50' },
    cancelled: { text: 'בוטל',     color: '#f44336' }
  };

  const rows = filtered.length === 0
    ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888">אין הזמנות</td></tr>`
    : filtered.map(po => {
        const s = statusLabel[po.status] || { text: po.status, color: '#888' };
        const supplierName = po.suppliers?.name || '—';
        const orderDate = po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—';
        const expectedDate = po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—';
        let actions = '';
        if (po.status === 'draft') {
          actions = `
            <button class="btn btn-p btn-sm btn-po-edit" data-id="${escapeHtml(po.id)}">עריכה</button>
            <button class="btn btn-s btn-sm btn-po-send" data-id="${escapeHtml(po.id)}">שלח</button>
            <button class="btn btn-d btn-sm btn-po-cancel" data-id="${escapeHtml(po.id)}">בטל</button>`;
        } else if (po.status === 'sent' || po.status === 'partial') {
          actions = `<button class="btn btn-g btn-sm btn-po-view" data-id="${escapeHtml(po.id)}">צפייה</button>
            <button class="btn btn-d btn-sm btn-po-cancel" data-id="${escapeHtml(po.id)}">בטל</button>`;
        } else {
          actions = `<button class="btn btn-g btn-sm btn-po-view" data-id="${escapeHtml(po.id)}">צפייה</button>`;
        }
        return `<tr>
          <td style="font-weight:600">${po.po_number || '—'}</td>
          <td>${supplierName}</td>
          <td>${orderDate}</td>
          <td>${expectedDate}</td>
          <td><span style="color:${s.color};font-weight:600">${s.text}</span></td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2 style="margin:0">📋 הזמנות רכש</h2>
        <button onclick="openNewPurchaseOrder()" class="btn btn-p" style="padding:8px 18px;font-size:15px">+ הזמנה חדשה</button>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap">
        ${poSummaryCard('טיוטות', drafts, '#9e9e9e')}
        ${poSummaryCard('ממתינות לקבלה', sent, '#2196F3')}
        ${poSummaryCard('קבלה חלקית', partial, '#FF9800')}
        ${poSummaryCard('החודש', thisMonth, '#4CAF50')}
      </div>

      <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap">
        <select onchange="poFilters.status=this.value; renderPoList(document.getElementById('po-list-container2'))"
                style="padding:6px 10px; border-radius:6px; border:1px solid #ccc">
          <option value="">כל הסטטוסים</option>
          <option value="draft"${poFilters.status==='draft'?' selected':''}>טיוטה</option>
          <option value="sent"${poFilters.status==='sent'?' selected':''}>נשלחה</option>
          <option value="partial"${poFilters.status==='partial'?' selected':''}>חלקי</option>
          <option value="received"${poFilters.status==='received'?' selected':''}>התקבל</option>
          <option value="cancelled"${poFilters.status==='cancelled'?' selected':''}>בוטל</option>
        </select>
        <select id="po-filter-supplier"
                onchange="poFilters.supplier=this.value; renderPoList(document.getElementById('po-list-container2'))"
                style="padding:6px 10px; border-radius:6px; border:1px solid #ccc">
          <option value="">כל הספקים</option>
        </select>
      </div>

      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:14px">
          <thead>
            <tr style="background:#1a2744; color:white; text-align:right">
              <th style="padding:10px">מספר PO</th>
              <th style="padding:10px">ספק</th>
              <th style="padding:10px">תאריך הזמנה</th>
              <th style="padding:10px">תאריך צפוי</th>
              <th style="padding:10px">סטטוס</th>
              <th style="padding:10px">פעולות</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  populatePoSupplierFilter();
}

function poSummaryCard(label, value, color) {
  return `<div style="background:white; border-radius:10px; padding:14px 20px;
                       box-shadow:0 1px 4px rgba(0,0,0,0.1); min-width:130px; text-align:center">
    <div style="font-size:24px; font-weight:700; color:${color}">${value}</div>
    <div style="font-size:13px; color:#666; margin-top:4px">${label}</div>
  </div>`;
}

function applyPoFilters(data) {
  return data.filter(po => {
    if (poFilters.status && po.status !== poFilters.status) return false;
    if (poFilters.supplier && po.supplier_id !== poFilters.supplier) return false;
    return true;
  });
}

async function populatePoSupplierFilter() {
  const sel = document.getElementById('po-filter-supplier');
  if (!sel) return;
  const current = poFilters.supplier;
  try {
    const { data } = await sb.from('suppliers').select('id, name').eq('tenant_id', getTenantId()).eq('active', true).order('name');
    (data || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── PO Number generation ─────────────────────────────────────
async function generatePoNumber(supplierId) {
  const supNum = supplierNumCache[supplierId];
  if (!supNum) { toast('ספק ללא מספר — פנה למנהל', 'e'); return null; }
  const prefix = `PO-${supNum}-`;
  const { data } = await sb.from(T.PO)
    .select('po_number')
    .eq('tenant_id', getTenantId())
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1);
  let seq = 1;
  if (data?.length) {
    const parts = data[0].po_number.split('-');
    seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}
