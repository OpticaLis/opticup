// =========================================================
// DATA LOADING
// =========================================================
// =========================================================
// LOW STOCK ALERTS
// =========================================================
window.lowStockData = [];

async function loadLowStockAlerts() {
  try {
    const { data, error } = await sb.rpc('get_low_stock_brands');
    if (error) {
      // RPC doesn't exist yet — fallback to manual query
      const { data: brnds } = await sb.from('brands')
        .select('id, name, min_stock_qty, brand_type')
        .not('min_stock_qty', 'is', null)
        .eq('active', true);
      if (!brnds || brnds.length === 0) return [];
      const results = [];
      for (const brand of brnds) {
        const { data: inv } = await sb.from('inventory')
          .select('quantity')
          .eq('brand_id', brand.id)
          .eq('is_deleted', false);
        const totalQty = (inv || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
        if (totalQty < brand.min_stock_qty) {
          results.push({
            id: brand.id,
            name: brand.name,
            brand_type: brand.brand_type,
            min_stock_qty: brand.min_stock_qty,
            current_qty: totalQty,
            shortage: brand.min_stock_qty - totalQty
          });
        }
      }
      return results;
    }
    return data || [];
  } catch (err) {
    console.warn('loadLowStockAlerts error:', err.message);
    return [];
  }
}

async function refreshLowStockBanner() {
  window.lowStockData = await loadLowStockAlerts();
  const banner = document.getElementById('low-stock-banner');
  const text = document.getElementById('low-stock-banner-text');
  if (!banner || !text) return;

  if (window.lowStockData.length === 0) {
    banner.style.display = 'none';
  } else {
    banner.style.display = 'flex';
    text.textContent = `מלאי נמוך: ${window.lowStockData.length} מותגים מתחת לסף`;
  }
}

function openLowStockModal() {
  const data = window.lowStockData || [];
  const rows = data.map(b => `
    <tr>
      <td style="padding:10px; font-weight:600">${escapeHtml(b.name)}</td>
      <td style="padding:10px; text-align:center; color:#f44336; font-weight:700">${b.current_qty}</td>
      <td style="padding:10px; text-align:center">${b.min_stock_qty}</td>
      <td style="padding:10px; text-align:center; color:#FF9800; font-weight:600">${b.shortage}</td>
      <td style="padding:10px; text-align:center">
        <button onclick="createPOForBrand('${b.id}','${b.name.replace(/'/g,"\\'")}'); closeLowStockModal()"
                class="btn btn-p btn-sm">צור PO</button>
      </td>
    </tr>`).join('');
  const modal = document.createElement('div');
  modal.id = 'low-stock-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;max-width:700px;width:95%;max-height:80vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">&#9888;&#65039; מלאי נמוך</h2>
        <button onclick="closeLowStockModal()" style="background:none;border:none;font-size:22px;cursor:pointer">&#10005;</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#1a2744;color:white;text-align:right">
            <th style="padding:10px">מותג</th>
            <th style="padding:10px">כמות נוכחית</th>
            <th style="padding:10px">סף מינימום</th>
            <th style="padding:10px">חסר</th>
            <th style="padding:10px">פעולה</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  document.body.appendChild(modal);
}

function closeLowStockModal() {
  document.getElementById('low-stock-modal')?.remove();
}

async function loadData() {
  showLoading('טוען ספקים ומותגים...');
  try {
    await loadLookupCaches();
    suppliers = Object.keys(supplierCache).sort();

    const { data: brandRows, error: bErr } = await sb.from('brands').select('*');
    if (bErr) throw new Error(bErr.message);
    brands = (brandRows || []).map(b => ({
      id: b.id,
      name: b.name || '',
      type: enToHe('brand_type', b.brand_type) || '',
      defaultSync: enToHe('website_sync', b.default_sync) || '',
      active: b.active === true
    })).filter(b => b.name);

    window.brandSyncCache = {};
    brands.forEach(b => { if (b.defaultSync) window.brandSyncCache[b.name] = b.defaultSync; });

    await loadMaxBarcode();
    populateDropdowns();
    toast('נתונים נטענו בהצלחה', 's');
  } catch(e) {
    console.error(e);
    toast('שגיאה בטעינה: ' + (e.message || JSON.stringify(e)), 'e');
  }
  hideLoading();
}

async function loadMaxBarcode() {
  try {
    // Branch barcode format: BBDDDDD (2-digit branch + 5-digit sequence)
    // Fetch all barcodes within the current branch prefix
    const prefix = branchCode.padStart(2, '0');
    const { data } = await sb.from('inventory')
      .select('barcode')
      .not('barcode', 'is', null)
      .like('barcode', `${prefix}%`);
    let mx = 0;
    if (data?.length) {
      data.forEach(r => {
        if (r.barcode.length === 7 && r.barcode.startsWith(prefix)) {
          const seq = parseInt(r.barcode.slice(2), 10);
          if (!isNaN(seq) && seq > mx) mx = seq;
        }
      });
    }
    maxBarcode = mx;
  } catch(e) { console.warn('Could not load max barcode', e); }
}

function populateDropdowns() {
  const rb = $('red-brand');
  if (rb) rb.innerHTML = '<option value="">חברה...</option>' + brands.filter(b=>b.active).map(b => `<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('');
  const rcptSup = $('rcpt-supplier');
  if (rcptSup) rcptSup.innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
}

function activeBrands() { return brands.filter(b => b.active); }
function supplierOpts() { return '<option value="">בחר...</option>' + suppliers.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(''); }
function productTypeOpts() { return '<option value="">בחר...</option><option value="משקפי ראייה">משקפי ראייה</option><option value="משקפי שמש">משקפי שמש</option>'; }
function syncOpts() { return '<option value="">בחר...</option><option value="מלא">מלא</option><option value="תדמית">תדמית</option><option value="לא">לא</option>'; }

function getBrandType(name) { return brands.find(b=>b.name===name)?.type || ''; }
function getBrandSync(name) { return brands.find(b=>b.name===name)?.defaultSync || ''; }
