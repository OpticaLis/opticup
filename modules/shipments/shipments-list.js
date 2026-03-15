// =========================================================
// shipments-list.js — Box list, filters, search, export
// =========================================================

let shipmentsData = [];
let couriersList = [];

// =========================================================
// INIT
// =========================================================
async function initShipmentsPage() {
  const session = await loadSession();
  if (!session) { window.location.href = 'index.html'; return; }

  // Permission check
  if (typeof hasPermission === 'function') {
    const permsRaw = JSON.parse(sessionStorage.getItem('prizma_permissions') || '{}');
    const permKeys = Array.isArray(permsRaw) ? permsRaw : Object.keys(permsRaw);
    const shipPermExists = permKeys.some(p => p.startsWith('shipments'));
    if (shipPermExists && !hasPermission('shipments:view')) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Apply UI permissions if available
  if (typeof applyUIPermissions === 'function') applyUIPermissions();

  await Promise.all([
    populateTypeFilter(),
    populateSupplierFilter(),
    populateCourierFilter(),
    loadLockMinutes()
  ]);

  setupFilterListeners();
  await loadShipments();
  autoLockExpiredBoxes();
}

// =========================================================
// FILTER POPULATION
// =========================================================
function populateTypeFilter() {
  const sel = $('filter-type');
  const types = ENUM_MAP.shipment_type || {};
  for (const [he, en] of Object.entries(types)) {
    const opt = document.createElement('option');
    opt.value = en;
    opt.textContent = he;
    sel.appendChild(opt);
  }
}

async function populateSupplierFilter() {
  const sel = $('filter-supplier');
  const { data } = await sb.from(T.SUPPLIERS)
    .select('id, name')
    .eq('tenant_id', getTenantId())
    .eq('active', true)
    .order('name');
  if (!data) return;
  for (const s of data) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sel.appendChild(opt);
  }
}

async function populateCourierFilter() {
  const sel = $('filter-courier');
  const { data } = await sb.from(T.COURIERS)
    .select('id, name')
    .eq('tenant_id', getTenantId())
    .eq('is_active', true)
    .order('name');
  couriersList = data || [];
  for (const c of couriersList) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  }
}

// =========================================================
// FILTER LISTENERS
// =========================================================
function setupFilterListeners() {
  $('filter-type').addEventListener('change', applyFilters);
  $('filter-supplier').addEventListener('change', applyFilters);
  $('filter-courier').addEventListener('change', applyFilters);
  $('filter-date').addEventListener('change', applyFilters);

  let searchTimer;
  $('filter-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
  });

  $('btn-export-excel').addEventListener('click', exportShipmentsExcel);
}

function applyFilters() {
  const filters = {};
  const type = $('filter-type').value;
  const supplier = $('filter-supplier').value;
  const courier = $('filter-courier').value;
  const dateRange = $('filter-date').value;
  const search = $('filter-search').value.trim();

  if (type) filters.shipment_type = type;
  if (supplier) filters.supplier_id = supplier;
  if (courier) filters.courier_id = courier;
  if (dateRange) filters.dateRange = dateRange;
  if (search) filters.search = search;

  loadShipments(filters);
}

// =========================================================
// LOAD SHIPMENTS
// =========================================================
async function loadShipments(filters = {}) {
  let query = sb.from(T.SHIPMENTS)
    .select('*, courier:courier_companies(name), supplier:suppliers(name), packer:employees!packed_by(name)')
    .eq('tenant_id', getTenantId())
    .eq('is_deleted', false)
    .order('packed_at', { ascending: false });

  if (filters.shipment_type) query = query.eq('shipment_type', filters.shipment_type);
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
  if (filters.courier_id) query = query.eq('courier_id', filters.courier_id);
  if (filters.search) query = query.ilike('box_number', '%' + filters.search + '%');

  if (filters.dateRange) {
    const now = new Date();
    let from;
    if (filters.dateRange === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filters.dateRange === 'week') {
      from = new Date(now.getTime() - 7 * 86400000);
    } else if (filters.dateRange === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (from) query = query.gte('packed_at', from.toISOString());
  }

  const { data, error } = await query;
  if (error) { toast('שגיאה בטעינת ארגזים: ' + error.message, 'e'); return; }
  shipmentsData = data || [];
  renderShipmentsList(shipmentsData);
}

// =========================================================
// RENDER LIST
// =========================================================
function renderShipmentsList(shipments) {
  const container = $('shipments-list');
  if (!shipments.length) {
    container.innerHTML = '<div class="empty-state">אין ארגזים להצגה</div>';
    return;
  }

  const typeMap = ENUM_REV.shipment_type || {};
  let html = '';

  for (const s of shipments) {
    const typeHe = typeMap[s.shipment_type] || s.shipment_type;
    const dest = s.supplier?.name || s.customer_name || '—';
    const courierName = s.courier?.name || '—';
    const tracking = s.tracking_number ? escapeHtml(s.tracking_number) : '—';
    const packerName = s.packer?.name || '—';
    const time = s.packed_at ? new Date(s.packed_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const value = formatILS(s.total_value || 0);
    const statusHtml = buildStatusIndicator(s);

    html += `<div class="ship-row" data-id="${s.id}" onclick="onShipmentClick('${s.id}')">
      <div class="ship-box-num">${escapeHtml(s.box_number)}</div>
      <div class="ship-type-badge">${escapeHtml(typeHe)}</div>
      <div>${escapeHtml(dest)}</div>
      <div class="ship-col-courier">${escapeHtml(courierName)} ${tracking !== '—' ? '<small>' + tracking + '</small>' : ''}</div>
      <div class="ship-col-packer">${escapeHtml(packerName)}<br><small>${time}</small></div>
      <div>${s.items_count || 0}</div>
      <div class="ship-col-value">${value}</div>
      <div class="ship-status">${statusHtml}</div>
    </div>`;
  }

  container.innerHTML = html;
}

function buildStatusIndicator(box) {
  return renderLockStatus(box);
}

// =========================================================
// ROW CLICK — placeholder for detail panel (Phase 5.9f)
// =========================================================
function onShipmentClick(id) {
  console.log('detail', id);
}

// =========================================================
// EXCEL EXPORT
// =========================================================
function exportShipmentsExcel() {
  if (!shipmentsData.length) { toast('אין נתונים לייצוא', 'e'); return; }

  const typeMap = ENUM_REV.shipment_type || {};
  const rows = shipmentsData.map(s => ({
    'מספר ארגז': s.box_number,
    'סוג': typeMap[s.shipment_type] || s.shipment_type,
    'ספק/לקוח': s.supplier?.name || s.customer_name || '',
    'שליחויות': s.courier?.name || '',
    'מעקב': s.tracking_number || '',
    'פריטים': s.items_count || 0,
    'סכום': s.total_value || 0,
    'נארז ע"י': s.packer?.name || '',
    'תאריך': s.packed_at ? new Date(s.packed_at).toLocaleDateString('he-IL') : '',
    'סטטוס': s.locked_at ? 'נעול' : isBoxEditable(s) ? 'פתוח' : 'נעול (אוטומטי)'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ארגזים');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'shipments_' + today + '.xlsx');
  toast('קובץ Excel יוצא בהצלחה');
}
