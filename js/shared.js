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
};

// Tenant slug — resolved dynamically from URL ?t= param or sessionStorage.
// index.html sets sessionStorage('tenant_slug') during tenant resolution.
// Fallback: 'prizma' for backward compatibility.
const TENANT_SLUG = (function() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('t');
  const storedSlug = sessionStorage.getItem('tenant_slug');

  // CRITICAL: Hard tenant isolation — if URL slug differs from stored slug,
  // clear ALL sessionStorage to prevent cross-tenant data leakage.
  // This forces re-login on the new tenant.
  if (fromUrl && storedSlug && fromUrl !== storedSlug) {
    sessionStorage.clear();
  }

  if (fromUrl) {
    sessionStorage.setItem('tenant_slug', fromUrl);
    return fromUrl;
  }
  return storedSlug || 'prizma';
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
    'החלטת מחיר':'price_decision','סטטוס התאמה ל-PO':'po_match_status'
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

// — NAVIGATION —
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
  if (name === 'access-sync') { renderAccessSyncTab(); loadWatcherStatus(); loadSyncLog(); loadSyncSummary(); loadLastActivity(); loadPendingBadge(); }
  if (name === 'stock-count') loadStockCountTab();
  if (name === 'returns') initReturnsTab();
  if (name === 'reduction') {
    var rw = $('reduction-help-wrap');
    if (rw && !rw.querySelector('.help-banner-wrap')) {
      renderHelpBanner(rw, 'help_inv_reduction',
        '<strong>הורדת מלאי</strong><br>' +
        'כאן מורידים כמויות מהמלאי — עדכון מכירות או שינויים ידניים.' +
        '<ul><li><strong>חלק א\' — Excel</strong>: העלה קובץ מכירות מ-Access. המערכת תתאים ברקודים ותפחית כמויות.</li>' +
        '<li><strong>חלק ב\' — ידני</strong>: חפש לפי ברקוד/מותג ולחץ ➖ להורדה. נדרשת סיסמת עובד.</li>' +
        '<li><strong>כל שינוי כמות</strong> נרשם בלוג ודורש PIN.</li></ul>');
    }
  }
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

// — INFO MODAL —
function showInfoModal(title, bodyHTML) {
  if (typeof Modal !== 'undefined' && Modal.show) {
    Modal.show({
      size: 'md',
      title: title,
      content: bodyHTML,
      footer: '<button class="btn btn-primary" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button>',
      closeOnEscape: true,
      closeOnBackdrop: true
    });
    return;
  }
  // Fallback — when Modal not loaded (e.g. suppliers-debt.html)
  var old = document.getElementById('info-modal-overlay');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'info-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;max-width:600px;width:92%;max-height:80vh;display:flex;flex-direction:column;direction:rtl;text-align:right;box-shadow:0 8px 32px rgba(0,0,0,.25)';
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;flex-shrink:0';
  var h3 = document.createElement('h3');
  h3.style.cssText = 'margin:0;font-size:1.1rem';
  h3.textContent = title;
  var closeX = document.createElement('button');
  closeX.className = 'btn-sm';
  closeX.textContent = '\u2715';
  closeX.onclick = function() { overlay.remove(); };
  header.appendChild(h3);
  header.appendChild(closeX);
  box.appendChild(header);
  var body = document.createElement('div');
  body.style.cssText = 'padding:16px 20px;line-height:1.8;font-size:.92rem;overflow-y:auto';
  body.innerHTML = bodyHTML;
  box.appendChild(body);
  var footer = document.createElement('div');
  footer.style.cssText = 'padding:12px 20px;border-top:1px solid #e0e0e0;text-align:left;flex-shrink:0';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-p';
  closeBtn.textContent = '\u05E1\u05D2\u05D5\u05E8';
  closeBtn.onclick = function() { overlay.remove(); };
  footer.appendChild(closeBtn);
  box.appendChild(footer);
  overlay.appendChild(box);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var escHandler = function(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(overlay);
}

// — HELP BANNER —
function renderHelpBanner(parentEl, storageKey, helpHTML) {
  if (!parentEl) return;
  var isCollapsed = sessionStorage.getItem(storageKey) === '1';
  var wrap = document.createElement('div');
  wrap.className = 'help-banner-wrap';
  var btn = document.createElement('button');
  btn.className = 'help-banner-toggle';
  btn.innerHTML = '&#10067; עזרה';
  btn.onclick = function() {
    var content = wrap.querySelector('.help-banner-content');
    if (!content) return;
    var hidden = content.style.display === 'none';
    content.style.display = hidden ? 'block' : 'none';
    sessionStorage.setItem(storageKey, hidden ? '0' : '1');
  };
  wrap.appendChild(btn);
  var content = document.createElement('div');
  content.className = 'help-banner-content';
  content.style.display = isCollapsed ? 'none' : 'block';
  content.innerHTML = helpHTML;
  wrap.appendChild(content);
  parentEl.insertBefore(wrap, parentEl.firstChild);
}

// PIN prompt modal → js/pin-modal.js
