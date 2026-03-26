// — CONFIG —
const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';
let sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
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
  DOC_TYPES: 'document_types',
  SUP_DOCS: 'supplier_documents',
  SUP_PAYMENTS: 'supplier_payments',
  DOC_LINKS: 'document_links',
  PAY_ALLOC: 'payment_allocations',
  PAY_METHODS: 'payment_methods',
  PREPAID_DEALS: 'prepaid_deals',
  PREPAID_CHECKS: 'prepaid_checks',
  SUP_RETURNS: 'supplier_returns',
  SUP_RETURN_ITEMS: 'supplier_return_items',
  AI_CONFIG: 'ai_agent_config',
  OCR_TEMPLATES: 'supplier_ocr_templates',
  OCR_EXTRACTIONS: 'ocr_extractions',
  ALERTS: 'alerts',
  WEEKLY_REPORTS: 'weekly_reports',
  TENANTS: 'tenants',
  COURIERS: 'courier_companies',
  SHIPMENTS: 'shipments',
  SHIP_ITEMS: 'shipment_items',
  ACTIVITY_LOG: 'activity_log',
  DOC_FILES: 'supplier_document_files',
  IMAGES: 'inventory_images',
  EXPENSE_FOLDERS: 'expense_folders',
};

// Tenant slug — set synchronously from URL/sessionStorage for immediate availability.
// resolveTenant() then does the async DB check (status, redirect on error).
let TENANT_SLUG = null;
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSlug = urlParams.get('t');
  const storedSlug = sessionStorage.getItem('tenant_slug');
  if (urlSlug && storedSlug && urlSlug !== storedSlug) {
    sessionStorage.clear();
  }
  TENANT_SLUG = urlSlug || storedSlug || null;
  if (TENANT_SLUG) {
    sessionStorage.setItem('tenant_slug', TENANT_SLUG);
  }
})();

/**
 * Centralized tenant resolution. Called once on page load.
 * Resolution: URL ?t= → sessionStorage → redirect to landing.
 * Queries tenants table for status check (suspended/deleted → error page).
 * Sets TENANT_SLUG global + sessionStorage.
 * @returns {Promise<object|null>} tenant row or null (redirect already triggered)
 */
async function resolveTenant() {
  // TENANT_SLUG already set synchronously at script load. If tenant_id is cached,
  // skip the DB query (returning user navigating between pages).
  if (TENANT_SLUG && sessionStorage.getItem('tenant_id')) {
    if (typeof loadTenantTheme === 'function') {
      try { const { data: t } = await sb.from('tenants').select('ui_config').eq('slug', TENANT_SLUG).single(); if (t) loadTenantTheme(t); } catch(_) {}
    }
    return { id: sessionStorage.getItem('tenant_id'), slug: TENANT_SLUG, name: sessionStorage.getItem('tenant_name_cache') || '' };
  }
  const slug = TENANT_SLUG;
  if (!slug) {
    const path = window.location.pathname;
    if (!path.endsWith('/landing.html') && !path.endsWith('/error.html') && !path.endsWith('/admin.html')) {
      window.location.href = '/landing.html';
    }
    return null;
  }
  // Query tenant
  const { data: tenant, error } = await sb.from('tenants')
    .select('id, slug, name, status, ui_config, plan_id')
    .eq('slug', slug).single();
  if (error || !tenant) {
    window.location.href = '/error.html?type=not-found&slug=' + encodeURIComponent(slug);
    return null;
  }
  if (tenant.status === 'suspended') {
    window.location.href = '/error.html?type=suspended&slug=' + encodeURIComponent(slug) + '&name=' + encodeURIComponent(tenant.name);
    return null;
  }
  if (tenant.status === 'deleted') {
    window.location.href = '/error.html?type=deleted&slug=' + encodeURIComponent(slug);
    return null;
  }
  // Success — set globals
  TENANT_SLUG = slug;
  sessionStorage.setItem('tenant_slug', slug);
  sessionStorage.setItem('tenant_id', tenant.id);
  sessionStorage.setItem('tenant_name_cache', tenant.name);
  if (typeof loadTenantTheme === 'function') loadTenantTheme(tenant);
  return tenant;
}

// Auto-resolve tenant for non-index ERP pages
(function() {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' ||
      path.endsWith('/admin.html') || path.endsWith('/landing.html') ||
      path.endsWith('/error.html')) return;
  document.addEventListener('DOMContentLoaded', function() { resolveTenant(); });
})();

// — STATE —
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

// — SUPABASE COMPATIBILITY LAYER —
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
  goods_receipt_items: {
    'החלטת מחיר':'price_decision','סטטוס התאמה ל-PO':'po_match_status','הערה':'note'
  },
  goods_receipts: {
    'מספרי מסמכים':'document_numbers'
  },
  expense_folders: {
    'שם':'name','אייקון':'icon','סדר מיון':'sort_order','פעיל':'is_active'
  },
  suppliers: { 'שם':'name', 'יתרת פתיחה':'opening_balance', 'תאריך יתרת פתיחה':'opening_balance_date', 'הערות יתרת פתיחה':'opening_balance_notes', 'הוגדר ע"י':'opening_balance_set_by' },
  ai_agent_config: {
    'סריקה פעילה':'ocr_enabled','התאמת ספק אוטומטית':'auto_match_supplier',
    'התאמת הזמנה אוטומטית':'auto_match_po','סף ביטחון':'confidence_threshold',
    'התראות פעילות':'alerts_enabled','ימי תזכורת תשלום':'payment_reminder_days',
    'התראת איחור':'overdue_alert','התראת מקדמה':'prepaid_threshold_alert',
    'התראת חריגה':'anomaly_alert','דוח שבועי פעיל':'weekly_report_enabled',
    'יום דוח שבועי':'weekly_report_day','מקור מפתח':'api_key_source'
  },
  supplier_ocr_templates: {
    'שם תבנית':'template_name','סוג מסמך':'document_type_code',
    'רמזי חילוץ':'extraction_hints','פעמים בשימוש':'times_used',
    'פעמים תוקן':'times_corrected','אחוז דיוק':'accuracy_rate','פעיל':'is_active'
  },
  ocr_extractions: {
    'קובץ':'file_url','שם קובץ':'file_name','תגובה גולמית':'raw_response',
    'מודל':'model_used','נתונים שחולצו':'extracted_data','ציון ביטחון':'confidence_score',
    'סטטוס':'status','תיקונים':'corrections','זמן עיבוד':'processing_time_ms'
  },
  alerts: {
    'סוג התראה':'alert_type','חומרה':'severity','כותרת':'title',
    'הודעה':'message','סטטוס':'status','סוג ישות':'entity_type',
    'תפוגה':'expires_at','פעולה שננקטה':'action_taken'
  },
  weekly_reports: {
    'תחילת שבוע':'week_start','סוף שבוע':'week_end',
    'נתוני דוח':'report_data','קובץ PDF':'pdf_url'
  },
  supplier_documents: {
    'חתימת קובץ':'file_hash',
    'מזהה אצווה':'batch_id',
    'היסטורי':'is_historical'
  },
  supplier_document_files: {
    'קובץ':'file_url','שם קובץ':'file_name','חתימת קובץ':'file_hash',
    'סדר':'sort_order','מסמך':'document_id'
  },
  pending_sales: {
    'מותג':'brand','דגם':'model','גודל':'size','צבע':'color'
  },
  courier_companies: {
    'איש קשר':'contact_person'
  },
  shipments: {
    'מספר ארגז':'box_number','סוג משלוח':'shipment_type',
    'שם לקוח':'customer_name','טלפון לקוח':'customer_phone','כתובת לקוח':'customer_address',
    'חברת שליחויות':'courier_id','מספר מעקב':'tracking_number',
    'נארז ע"י':'packed_by','תאריך אריזה':'packed_at',
    'תאריך נעילה':'locked_at','ננעל ע"י':'locked_by',
    'מתקן ארגז':'corrects_box_id','מספר פריטים':'items_count','סכום כולל':'total_value'
  },
  shipment_items: {
    'סוג פריט':'item_type','פריט מלאי':'inventory_id','החזרה':'return_id',
    'מספר הזמנה':'order_number','מספר לקוח':'customer_number',
    'קטגוריה':'category','עלות יחידה':'unit_cost'
  }
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
  item_status: {'ממתין':'pending','הועבר למלאי':'transferred','לא סופק':'not_supplied'},
  shipment_type: {'מסגור':'framing','זיכוי':'return','תיקון':'repair','משלוח':'delivery'},
  shipment_item_type: {'מלאי':'inventory','הזמנה':'order','תיקון':'repair'},
  shipment_category: {'מסגרת מהמלאי':'stock','הזמנה':'order','ייצור':'production','מולטיפוקל':'multifocal','אופיס':'office','ביפוקל':'bifocal','שמש':'sun','עדשות מגע':'contact','תיקון':'repair'}
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

// — UI HELPERS —
function getTenantId() {
  return sessionStorage.getItem('tenant_id');
}

function getTenantConfig(key) {
  const config = JSON.parse(sessionStorage.getItem('tenant_config') || '{}');
  return key ? config[key] : config;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format a number as ILS currency string: ₪1,234
 */
function formatILS(amount) {
  const num = Number(amount) || 0;
  return '\u20AA' + num.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function showLoading(t) { $('loading-text').textContent=t||'טוען...'; $('loading').style.display='flex'; }
function hideLoading() { $('loading').style.display='none'; }
function $(id) { return document.getElementById(id); }
function toast(msg, type='s') {
  if (typeof Toast !== 'undefined') {
    var map = { s: 'success', e: 'error', w: 'warning', i: 'info' };
    Toast[map[type] || 'success'](msg);
    return;
  }
  // Fallback — when Toast not loaded (e.g. suppliers-debt.html)
  var c = $('toast-c');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function() { t.remove(); }, 4500);
}
function setAlert(id, html, type) { $(id).innerHTML = `<div class="alert alert-${type}">${html}</div>`; }
function clearAlert(id) { $(id).innerHTML = ''; }
function closeModal(id) { $(id).style.display = 'none'; }

function confirmDialog(title, text = '') {
  if (typeof Modal !== 'undefined' && Modal.confirm) {
    return new Promise(function(res) {
      Modal.confirm({
        title: title,
        message: text,
        confirmText: 'אישור',
        cancelText: 'ביטול',
        onConfirm: function() { res(true); },
        onCancel: function() { res(false); }
      });
    });
  }
  // Fallback — when Modal not loaded (e.g. suppliers-debt.html)
  return new Promise(function(res) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-modal').style.display = 'flex';
    $('confirm-yes').onclick = function() { closeModal('confirm-modal'); res(true); };
    $('confirm-no').onclick = function() { closeModal('confirm-modal'); res(false); };
  });
}

// Navigation, info modal, help banner → js/shared-ui.js

// PIN prompt modal → js/pin-modal.js
