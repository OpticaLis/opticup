// =========================================================
// CONFIG — Supabase
// =========================================================
const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const T = {
  INV:    'inventory',
  PO:     'purchase_orders',
  BRANDS: 'brands',
  SUPPLIERS: 'suppliers',
  RECEIPTS: 'goods_receipts',
  RCPT_ITEMS: 'goods_receipt_items',
  PO_ITEMS: 'purchase_order_items',
  SYNC_LOG: 'sync_log',
  PENDING_SALES: 'pending_sales',
  HEARTBEAT: 'watcher_heartbeat',
  STOCK_COUNTS: 'stock_counts',
  STOCK_COUNT_ITEMS: 'stock_count_items',
  EMPLOYEES: 'employees',
};

// =========================================================
// STATE
// =========================================================
let suppliers = [];
let brands = [];
let isAdmin = false;
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
    'מספר הזמנה':'po_number','ספק':'supplier_id','תאריך הזמנה':'order_date',
    'תאריך צפוי הגעה':'expected_date','סטטוס הזמנה':'status','הערות':'notes'
  },
  purchase_order_items: {
    'מספר הזמנה':'po_number','ספק':'supplier_name','חברה / מותג':'brand_name',
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
let supplierNumCache = {}; // uuid → supplier_number
let brandCache = {};       // name → uuid
let brandCacheRev = {};    // uuid → name

// =========================================================
// UI HELPERS
// =========================================================
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function confirmDialog(title, text = '') {
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
  // Stop camera stream if active (stock-count tab)
  if (typeof stopCamera === 'function') stopCamera();
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
  if (name === 'purchase-orders') loadPurchaseOrdersTab();
  if (name === 'access-sync') { renderAccessSyncTab(); loadSyncLog(); loadSyncSummary(); loadLastActivity(); loadPendingBadge(); }
  if (name === 'stock-count') loadStockCountTab();
}

function showEntryMode(mode) {
  if (mode === 'receipt') { showTab('receipt'); return; }
  $('entry-manual').style.display = mode==='manual' ? 'block' : 'none';
  $('entry-excel').style.display = mode==='excel' ? 'block' : 'none';
  $('btn-entry-manual').classList.toggle('active', mode==='manual');
  $('btn-entry-excel').classList.toggle('active', mode==='excel');
  $('btn-entry-receipt').classList.toggle('active', false);
  if (mode==='excel') resetExcelImport();
}

// (Token management removed — using Supabase anon key)
