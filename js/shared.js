// =========================================================
// CONFIG — Supabase
// =========================================================
const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const T = {
  INV:    'inventory',
  PO:     'purchase_orders',
  SALES:  'sales',
  ITEMS:  'purchase_order_items',
  BRANDS: 'brands',
  SUPPLIERS: 'suppliers',
  RECEIPTS: 'goods_receipts',
  RCPT_ITEMS: 'goods_receipt_items',
};

// =========================================================
// STATE
// =========================================================
let suppliers = [];
let brands = [];
let isAdmin = false;
let currentPOId = null;
let currentPONum = '';
let currentPOSupplier = '';
let selectedPOForEntry = null;
let maxBarcode = 0;
let branchCode = sessionStorage.getItem('prizma_branch') || '00';

// System Log state
let slogPage = 0, slogTotalPages = 0, slogCurrentFilters = {};

// Goods Receipt state
let rcptRowNum = 0;
let currentReceiptId = null;
let rcptEditMode = false;
let rcptViewOnly = false;

// =========================================================
// SUPABASE COMPATIBILITY LAYER
// =========================================================

// --- Hebrew ↔ English field name maps ---
const FIELD_MAP = {
  inventory: {
    'ברקוד':'barcode','ספק':'supplier_id','חברה / מותג':'brand_id','דגם':'model',
    'גודל':'size','גשר':'bridge','צבע':'color','אורך מוט':'temple_length',
    'סוג מוצר':'product_type','מחיר מכירה':'sell_price','הנחה מכירה %':'sell_discount',
    'מחיר עלות':'cost_price','הנחה עלות %':'cost_discount','כמות':'quantity',
    'סנכרון אתר':'website_sync','סטטוס':'status','סוג מותג':'brand_type',
    'מקור':'origin','הערות':'notes','תמונות':'_images'
  },
  purchase_orders: {
    'מספר הזמנה':'order_number','ספק':'supplier_id','תאריך הזמנה':'order_date',
    'תאריך צפוי הגעה':'expected_date','סטטוס הזמנה':'status','הערות':'notes'
  },
  purchase_order_items: {
    'מספר הזמנה':'order_number','ספק':'supplier_name','חברה / מותג':'brand_name',
    'דגם':'model','גודל':'size','גשר':'bridge','צבע':'color','אורך מוט':'temple_length',
    'סוג מוצר':'product_type','מחיר עלות':'cost_price','הנחה עלות %':'cost_discount',
    'מחיר מכירה':'sell_price','הנחה מכירה %':'sell_discount',
    'סנכרון אתר':'website_sync','סטטוס הזמנה':'item_status'
  },
  sales: {
    'ברקוד':'barcode','כמות':'quantity_sold','מחיר מכירה':'sale_price',
    'תאריך מכירה':'sale_date','הערות':'notes'
  },
  brands: {
    'שם חברה':'name','סוג מותג':'brand_type','סנכרון ברירת מחדל':'default_sync','פעיל':'active','מוחרג מאתר':'exclude_website','מלאי מינימום':'min_stock_qty'
  },
  suppliers: { 'שם':'name' }
};

// Build reverse maps (English→Hebrew)
const FIELD_MAP_REV = {};
for (const [tbl, map] of Object.entries(FIELD_MAP)) {
  FIELD_MAP_REV[tbl] = {};
  for (const [he, en] of Object.entries(map)) FIELD_MAP_REV[tbl][en] = he;
}

// --- Enum maps: Hebrew ↔ English ---
const ENUM_MAP = {
  product_type: {'משקפי ראייה':'eyeglasses','משקפי שמש':'sunglasses'},
  status: {'פעיל':'in_stock','במלאי':'in_stock','נמכר':'sold','הוזמן':'ordered','ממתין לברקוד':'pending_barcode','ממתין לתמונות':'pending_images'},
  website_sync: {'מלא':'full','תדמית':'display','לא':'none'},
  brand_type: {'יוקרה':'luxury','מותג':'brand','רגיל':'regular'},
  po_status: {'טיוטה':'draft','הוזמן':'ordered','הגיע חלקית':'partial','הגיע במלואו':'complete'},
  item_status: {'ממתין':'pending','הועבר למלאי':'transferred','לא סופק':'not_supplied'}
};
const ENUM_REV = {};
for (const [cat, map] of Object.entries(ENUM_MAP)) {
  ENUM_REV[cat] = {};
  for (const [he, en] of Object.entries(map)) ENUM_REV[cat][en] = he;
}

function heToEn(cat, val) { return ENUM_MAP[cat]?.[val] ?? val; }
function enToHe(cat, val) { return ENUM_REV[cat]?.[val] ?? val; }

// Determine which enum category a column belongs to
function enumCatForCol(tableName, enCol) {
  if (enCol === 'product_type') return 'product_type';
  if (enCol === 'website_sync') return 'website_sync';
  if (enCol === 'brand_type') return 'brand_type';
  if (tableName === 'inventory' && enCol === 'status') return 'status';
  if (tableName === 'purchase_orders' && enCol === 'status') return 'po_status';
  if (tableName === 'purchase_order_items' && enCol === 'item_status') return 'item_status';
  return null;
}

// --- Supplier & Brand lookup caches ---
let supplierCache = {};   // name → uuid
let supplierCacheRev = {}; // uuid → name
let brandCache = {};       // name → uuid
let brandCacheRev = {};    // uuid → name

async function loadLookupCaches() {
  const { data: sups } = await sb.from('suppliers').select('id,name');
  supplierCache = {}; supplierCacheRev = {};
  (sups || []).forEach(s => { supplierCache[s.name] = s.id; supplierCacheRev[s.id] = s.name; });

  const { data: brs } = await sb.from('brands').select('id,name');
  brandCache = {}; brandCacheRev = {};
  (brs || []).forEach(b => { brandCache[b.name] = b.id; brandCacheRev[b.id] = b.name; });
}

// --- Convert Supabase row → Airtable-shaped {id, fields:{Hebrew...}} ---
function rowToRecord(row, tableName) {
  const rev = FIELD_MAP_REV[tableName] || {};
  const fields = {};
  for (const [enCol, val] of Object.entries(row)) {
    if (enCol === 'id' || enCol === 'created_at' || enCol === 'updated_at' ||
        enCol === 'branch_id' || enCol === 'created_by' || enCol === 'woocommerce_id') continue;
    if (enCol === 'inventory_images') {
      // Convert joined images to Airtable-shaped array
      fields['תמונות'] = (val || []).map(img => ({
        url: img.url,
        thumbnails: {
          small: { url: img.thumbnail_url || img.url },
          large: { url: img.url }
        }
      }));
      continue;
    }
    const heName = rev[enCol];
    if (!heName) continue;
    if (heName === '_images') continue; // skip placeholder

    // Resolve FK → name
    if (enCol === 'supplier_id') { fields['ספק'] = supplierCacheRev[val] || ''; continue; }
    if (enCol === 'brand_id') { fields['חברה / מותג'] = brandCacheRev[val] || ''; continue; }

    // Reverse enum
    const cat = enumCatForCol(tableName, enCol);
    if (cat) { fields[heName] = enToHe(cat, val); continue; }

    fields[heName] = val;
  }
  return { id: row.id, fields };
}

// --- Convert Hebrew fields → English row for insert/update ---
function fieldsToRow(hebrewFields, tableName) {
  const map = FIELD_MAP[tableName] || {};
  const row = {};
  for (const [heKey, val] of Object.entries(hebrewFields)) {
    const enCol = map[heKey];
    if (!enCol || enCol === '_images') continue;

    // Resolve name → FK
    if (enCol === 'supplier_id') { row.supplier_id = supplierCache[val] || null; continue; }
    if (enCol === 'brand_id') { row.brand_id = brandCache[val] || null; continue; }

    // Forward enum
    const cat = enumCatForCol(tableName, enCol);
    if (cat) { row[enCol] = heToEn(cat, val); continue; }

    row[enCol] = val;
  }
  return row;
}

// --- Supabase-backed fetchAll (returns Airtable-shaped records) ---
async function fetchAll(tableName, filters) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (filters) {
      for (const [col, op, val] of filters) {
        if (op === 'eq') query = query.eq(col, val);
        else if (op === 'in') query = query.in(col, val);
        else if (op === 'ilike') query = query.ilike(col, val);
        else if (op === 'neq') query = query.neq(col, val);
        else if (op === 'gt') query = query.gt(col, val);
        else if (op === 'gte') query = query.gte(col, val);
        else if (op === 'lt') query = query.lt(col, val);
      }
    }
    query = query.range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(row => rowToRecord(row, tableName));
}

// --- Supabase-backed batchCreate ---
async function batchCreate(tableName, records) {
  // Duplicate barcode check for inventory inserts
  if (tableName === T.INV) {
    const barcodes = records.map(r => r.fields['ברקוד']).filter(Boolean);
    if (barcodes.length) {
      // Check for duplicates within the batch itself
      const seen = new Set();
      const batchDupes = [];
      for (const bc of barcodes) {
        if (seen.has(bc)) batchDupes.push(bc);
        seen.add(bc);
      }
      if (batchDupes.length) {
        throw new Error(`ברקודים כפולים בשליחה: ${[...new Set(batchDupes)].join(', ')}`);
      }
      // Check against existing barcodes in DB
      const { data: existing } = await sb.from('inventory').select('barcode').in('barcode', barcodes);
      if (existing?.length) {
        const dupes = existing.map(r => r.barcode);
        throw new Error(`ברקודים כבר קיימים במלאי: ${dupes.join(', ')}`);
      }
    }
  }

  const rows = records.map(r => fieldsToRow(r.fields, tableName));
  const created = [];
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data, error } = await sb.from(tableName).insert(batch).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (error) {
      // Friendly message for unique constraint violation
      if (error.code === '23505' && error.message.includes('barcode')) {
        throw new Error('ברקוד כפול — ברקוד זה כבר קיים במלאי');
      }
      throw new Error(error.message);
    }
    created.push(...(data || []).map(row => rowToRecord(row, tableName)));
  }
  return created;
}

// --- Supabase-backed batchUpdate ---
async function batchUpdate(tableName, records) {
  const updated = [];
  for (const rec of records) {
    const row = fieldsToRow(rec.fields, tableName);
    const { data, error } = await sb.from(tableName).update(row).eq('id', rec.id).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (error) {
      if (error.code === '23505' && error.message.includes('barcode')) {
        throw new Error('ברקוד זה כבר קיים במערכת');
      }
      throw new Error(error.message);
    }
    if (data?.length) updated.push(rowToRecord(data[0], tableName));
  }
  return updated;
}

// =========================================================
// LOGGING ENGINE
// =========================================================
async function writeLog(action, inventoryId, details = {}) {
  try {
    const performer = sessionStorage.getItem('prizma_user') || 'system';
    const branch    = sessionStorage.getItem('prizma_branch') || '00';
    await sb.from('inventory_logs').insert({
      action,
      inventory_id:  inventoryId || null,
      barcode:       details.barcode       || null,
      brand:         details.brand         || null,
      model:         details.model         || null,
      qty_before:    details.qty_before    ?? null,
      qty_after:     details.qty_after     ?? null,
      price_before:  details.price_before  ?? null,
      price_after:   details.price_after   ?? null,
      reason:        details.reason        || null,
      source_ref:    details.source_ref    || null,
      performed_by:  performer,
      branch_id:     branch
    });
  } catch (e) {
    console.warn('writeLog failed:', e);
  }
}

async function testWriteLog() {
  const marker = 'TEST_' + Date.now();
  await writeLog('test', null, {
    barcode: marker,
    brand: 'Test Brand',
    model: 'Test Model',
    qty_before: 0,
    qty_after: 1,
    source_ref: 'בדיקת מערכת'
  });

  const { data } = await sb
    .from('inventory_logs')
    .select('*')
    .eq('barcode', marker)
    .maybeSingle();

  console.log('Log test result:', data);

  // Clean up test row
  if (data) await sb.from('inventory_logs').delete().eq('id', data.id);

  return data ? '✅ writeLog עובד' : '❌ writeLog נכשל';
}

// =========================================================
// UI HELPERS
// =========================================================
function showLoading(t) { $('loading-text').textContent=t||'טוען...'; $('loading').style.display='flex'; }
function hideLoading() { $('loading').style.display='none'; }
function $(id) { return document.getElementById(id); }
function toast(msg, type='s') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('toast-c').appendChild(t);
  setTimeout(()=>t.remove(), 4500);
}
function setAlert(id, html, type) { $(id).innerHTML = `<div class="alert alert-${type}">${html}</div>`; }
function clearAlert(id) { $(id).innerHTML = ''; }
function closeModal(id) { $(id).style.display = 'none'; }

function confirmDialog(title, text) {
  return new Promise(res => {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-modal').style.display = 'flex';
    $('confirm-yes').onclick = () => { closeModal('confirm-modal'); res(true); };
    $('confirm-no').onclick = () => { closeModal('confirm-modal'); res(false); };
  });
}

// =========================================================
// NAVIGATION
// =========================================================
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button[data-tab]').forEach(b => b.classList.remove('active'));
  $('tab-'+name).classList.add('active');
  const btn = document.querySelector(`nav button[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  // Close any open dropdowns when switching tabs
  closeAllDropdowns();
  if (name === 'inventory') loadInventoryTab();
  if (name === 'brands') loadBrandsTab();
  if (name === 'suppliers') loadSuppliersTab();
  if (name === 'systemlog') loadSystemLog();
  if (name === 'receipt') loadReceiptTab();
}

function showEntryMode(mode) {
  $('entry-manual').style.display = mode==='manual' ? 'block' : 'none';
  $('entry-frompo').style.display = mode==='frompo' ? 'block' : 'none';
  $('entry-excel').style.display = mode==='excel' ? 'block' : 'none';
  $('btn-entry-manual').classList.toggle('active', mode==='manual');
  $('btn-entry-frompo').classList.toggle('active', mode==='frompo');
  $('btn-entry-excel').classList.toggle('active', mode==='excel');
  if (mode==='frompo') loadPOListForEntry();
  if (mode==='excel') resetExcelImport();
}

// (Token management removed — using Supabase anon key)

// =========================================================
// DATA LOADING
// =========================================================
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
  const poSup = $('po-supplier');
  if (poSup) poSup.innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
  const rb = $('red-brand');
  if (rb) rb.innerHTML = '<option value="">חברה...</option>' + brands.filter(b=>b.active).map(b => `<option value="${b.name}">${b.name}</option>`).join('');
  const rcptSup = $('rcpt-supplier');
  if (rcptSup) rcptSup.innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
}

function activeBrands() { return brands.filter(b => b.active); }
function supplierOpts() { return '<option value="">בחר...</option>' + suppliers.map(s=>`<option value="${s}">${s}</option>`).join(''); }
function productTypeOpts() { return '<option value="">בחר...</option><option value="משקפי ראייה">משקפי ראייה</option><option value="משקפי שמש">משקפי שמש</option>'; }
function syncOpts() { return '<option value="">בחר...</option><option value="מלא">מלא</option><option value="תדמית">תדמית</option><option value="לא">לא</option>'; }

function getBrandType(name) { return brands.find(b=>b.name===name)?.type || ''; }
function getBrandSync(name) { return brands.find(b=>b.name===name)?.defaultSync || ''; }

// =========================================================
// SEARCHABLE SELECT — Fixed positioning dropdown
// =========================================================
let activeDropdown = null; // Track the currently open dropdown

function closeAllDropdowns() {
  document.querySelectorAll('.ss-dropdown.open').forEach(d => d.classList.remove('open'));
  activeDropdown = null;
}

// Single global click listener for closing dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-select') && !e.target.closest('.ss-dropdown')) {
    closeAllDropdowns();
  }
});

// Reposition dropdown on scroll
document.addEventListener('scroll', repositionDropdown, true);
window.addEventListener('resize', repositionDropdown);

function repositionDropdown() {
  if (!activeDropdown) return;
  const {input, dropdown} = activeDropdown;
  if (!input.isConnected) { closeAllDropdowns(); return; }
  const rect = input.getBoundingClientRect();
  dropdown.style.top = rect.bottom + 2 + 'px';
  dropdown.style.right = (window.innerWidth - rect.right) + 'px';
  dropdown.style.width = Math.max(rect.width, 180) + 'px';
}

function createSearchSelect(items, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'search-select';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'חפש חברה...';
  inp.value = value || '';
  inp.setAttribute('autocomplete', 'off');

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.className = 'col-brand';
  hidden.value = value || '';

  // Create dropdown in body (outside table) for fixed positioning
  const dropdown = document.createElement('div');
  dropdown.className = 'ss-dropdown';
  document.body.appendChild(dropdown);

  function render(filter) {
    const f = (filter||'').toLowerCase();
    const filtered = items.filter(it => !f || it.toLowerCase().includes(f));
    if (!filtered.length) {
      dropdown.innerHTML = '<div class="ss-empty">לא נמצאו תוצאות</div>';
    } else {
      dropdown.innerHTML = filtered
        .map(it => `<div class="ss-item${it===hidden.value?' selected':''}" data-val="${it}">${it}</div>`).join('');
    }
    dropdown.querySelectorAll('.ss-item').forEach(el => {
      el.onmousedown = (e) => {
        e.preventDefault(); // Prevent input blur
        hidden.value = el.dataset.val;
        inp.value = el.dataset.val;
        dropdown.classList.remove('open');
        activeDropdown = null;
        if (onChange) onChange(el.dataset.val);
      };
    });
  }

  function openDropdown() {
    closeAllDropdowns();
    render(inp.value);
    const rect = inp.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 2 + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.style.width = Math.max(rect.width, 180) + 'px';
    dropdown.classList.add('open');
    activeDropdown = {input: inp, dropdown};
  }

  inp.addEventListener('focus', openDropdown);
  inp.addEventListener('click', openDropdown);
  inp.addEventListener('input', () => {
    render(inp.value);
    if (!dropdown.classList.contains('open')) openDropdown();
  });
  inp.addEventListener('blur', () => {
    // Small delay to allow click on item
    setTimeout(() => {
      if (activeDropdown?.input === inp) {
        dropdown.classList.remove('open');
        activeDropdown = null;
      }
      // If text doesn't match any item, clear or keep last valid
      if (inp.value && !items.includes(inp.value)) {
        // Try to find a match
        const match = items.find(it => it.toLowerCase() === inp.value.toLowerCase());
        if (match) {
          inp.value = match;
          hidden.value = match;
          if (onChange) onChange(match);
        }
      }
    }, 200);
  });

  // Clean up dropdown when row is removed
  const observer = new MutationObserver(() => {
    if (!wrap.isConnected) {
      dropdown.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {childList: true, subtree: true});

  wrap.appendChild(inp);
  wrap.appendChild(hidden);
  wrap._dropdown = dropdown;
  wrap._hidden = hidden;
  wrap._input = inp;
  render('');
  return wrap;
}
