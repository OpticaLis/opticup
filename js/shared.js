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
  BAL_ADJ: 'supplier_balance_adjustments',
  STOREFRONT_CONFIG: 'storefront_config',
  STOREFRONT_LEADS: 'storefront_leads',
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
let branchCode = sessionStorage.getItem('tenant_branch') || '00';

// System Log state
let slogPage = 0, slogTotalPages = 0, slogCurrentFilters = {};

// Goods Receipt state
let rcptRowNum = 0;
let currentReceiptId = null;
let rcptEditMode = false;
let rcptViewOnly = false;

// — Field/enum maps and supplier/brand caches moved to js/shared-field-map.js

// — UI HELPERS —
function getTenantId() {
  return sessionStorage.getItem('tenant_id');
}

function getTenantConfig(key) {
  const config = JSON.parse(sessionStorage.getItem('tenant_config') || '{}');
  return key ? config[key] : config;
}

/**
 * Resolve the tenant's custom storefront domain, used in SEO-preview UI text.
 * Priority: tenant_config.custom_domain → tenant_config.ui_config.seo_domain → 'domain.co.il'.
 * @returns {string}
 */
function getCustomDomain() {
  var direct = getTenantConfig('custom_domain');
  if (direct) return direct;
  var uiConfig = getTenantConfig('ui_config');
  if (uiConfig && uiConfig.seo_domain) return uiConfig.seo_domain;
  return 'domain.co.il';
}

/**
 * Resolve the tenant's VAT rate (percentage form, e.g. 18 for 18%).
 * Reads from tenant_config.vat_rate. Returns 0 + warns if missing/invalid —
 * explicit zero is safer than silent fallback to wrong country's rate
 * (M3-SAAS-21).
 * @returns {number}
 */
function getVatRate() {
  var raw = getTenantConfig('vat_rate');
  var num = Number(raw);
  if (isFinite(num) && num > 0) return num;
  if (window.console && console.warn) {
    console.warn('[shared] vat_rate missing or invalid in tenant_config; returning 0. Configure vat_rate on the tenant.');
  }
  return 0;
}

/**
 * Format a number as a currency string per tenant_config (default ILS/he-IL).
 * Reads default_currency + locale from getTenantConfig() with safe fallbacks
 * so a second-tenant onboarding (different country) just works without code changes.
 *
 * Default behavior preserves the legacy formatILS() output exactly: SYMBOL+number,
 * no fractional digits, locale-formatted thousands separator. The currency symbol
 * is resolved via Intl.NumberFormat parts API for cross-currency support
 * (₪ for ILS, $ for USD, € for EUR, etc.) but assembled in the legacy prefix style.
 *
 * @param {number|string} amount
 * @param {object} [opts] - { currency, locale, minimumFractionDigits, maximumFractionDigits }
 * @returns {string}
 */
function formatMoney(amount, opts) {
  opts = opts || {};
  var num = Number(amount);
  if (!isFinite(num)) num = 0;
  var currency = opts.currency || getTenantConfig('default_currency') || 'ILS';
  var locale = opts.locale || getTenantConfig('locale') || 'he-IL';
  var minFrac = (opts.minimumFractionDigits != null) ? opts.minimumFractionDigits : 0;
  var maxFrac = (opts.maximumFractionDigits != null) ? opts.maximumFractionDigits : 0;
  var symbol;
  try {
    var parts = new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).formatToParts(0);
    var sym = parts.find(function (p) { return p.type === 'currency'; });
    symbol = sym ? sym.value : currency;
  } catch (e) { symbol = (currency === 'ILS' ? '₪' : currency); }
  return symbol + num.toLocaleString(locale, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
}


/**
 * Resolve a media-library storage path to a full URL.
 * Storage paths look like: "media-library/media/{tid}/{folder}/{filename}"
 * In storefront context (same domain) → "/api/image/{path}"
 * In ERP context (different domain) → "{storefrontDomain}/api/image/{path}"
 * Falls through for full URLs (http/https) — returned as-is.
 */
function resolveMediaUrl(storagePath, storefrontDomain) {
  if (!storagePath) return '';
  if (storagePath.startsWith('http')) return storagePath;
  if (storagePath.startsWith('/images/')) {
    return storefrontDomain ? storefrontDomain + storagePath : storagePath;
  }
  const proxyPath = '/api/image/' + storagePath;
  return storefrontDomain ? storefrontDomain + proxyPath : proxyPath;
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
  // Backward-compat wrapper - delegates to formatMoney() which reads
  // default_currency + locale from tenant_config (M1_5_SAAS_FORMAT_MONEY).
  return formatMoney(amount);
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
