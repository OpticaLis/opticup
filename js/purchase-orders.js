// ============================================================
// purchase-orders.js — הזמנות רכש
// ============================================================

// ── State ────────────────────────────────────────────────────
let poData = [];
let poFilters = { status: '', supplier: '' };

// ── Tab entry point ──────────────────────────────────────────
async function loadPurchaseOrdersTab() {
  const container = document.getElementById('po-list-container2');
  if (!container) return;
  container.innerHTML = '<p style="padding:20px">טוען...</p>';
  try {
    const { data, error } = await sb
      .from(T.PO)
      .select(`*, suppliers(name)`)
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

  // Summary cards
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

  // Build rows
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
            <button onclick="openEditPO('${po.id}')" class="btn btn-p btn-sm">עריכה</button>
            <button onclick="sendPO2('${po.id}')" class="btn btn-s btn-sm">שלח</button>
            <button onclick="cancelPO('${po.id}')" class="btn btn-d btn-sm">בטל</button>`;
        } else if (po.status === 'sent' || po.status === 'partial') {
          actions = `<button onclick="openViewPO('${po.id}')" class="btn btn-g btn-sm">צפייה</button>
            <button onclick="cancelPO('${po.id}')" class="btn btn-d btn-sm">בטל</button>`;
        } else {
          actions = `<button onclick="openViewPO('${po.id}')" class="btn btn-g btn-sm">צפייה</button>`;
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
        <button onclick="openNewPO2()" class="btn btn-p" style="padding:8px 18px;font-size:15px">+ הזמנה חדשה</button>
      </div>

      <!-- Summary cards -->
      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap">
        ${poSummaryCard('טיוטות', drafts, '#9e9e9e')}
        ${poSummaryCard('ממתינות לקבלה', sent, '#2196F3')}
        ${poSummaryCard('קבלה חלקית', partial, '#FF9800')}
        ${poSummaryCard('החודש', thisMonth, '#4CAF50')}
      </div>

      <!-- Filters -->
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

      <!-- Table -->
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

  // Populate supplier filter
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
  // Keep existing selected value
  const current = poFilters.supplier;
  try {
    const { data } = await sb.from('suppliers').select('id, name').eq('active', true).order('name');
    (data || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── Placeholders (implemented in step 1.3) ───────────────────
function openNewPO2()       { toast('בקרוב — יצירת הזמנה חדשה', 'w'); }
function openEditPO(id)     { toast('בקרוב — עריכת הזמנה', 'w'); }
function openViewPO(id)     { toast('בקרוב — צפייה בהזמנה', 'w'); }
async function sendPO2(id)  { toast('בקרוב — שליחת הזמנה', 'w'); }
async function cancelPO(id) { toast('בקרוב — ביטול הזמנה', 'w'); }
