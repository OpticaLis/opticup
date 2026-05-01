/* =============================================================================
   crm-helpers.js — shared CRM utilities (phone, currency, status badges, caches)
   Load order: after shared.js (needs sb, T, getTenantId, escapeHtml).
   Globals exported on window.CrmHelpers + window.CRM_STATUSES.
   ============================================================================= */
// Promote ActivityLog (declared as script-scope const in shared/js/activity-logger.js)
// onto window so `if (window.ActivityLog) ...` guards across CRM files resolve truthy.
// Without this, every ActivityLog.write call in CRM is silently skipped.
if (typeof ActivityLog !== 'undefined' && !window.ActivityLog) window.ActivityLog = ActivityLog;

(function () {
  'use strict';

  var PRIZMA_PHONE_RE = /^\+972(\d{9})$/;

  // --- Phone format: +972507175675 -> 050-717-5675 ---
  function formatPhone(raw) {
    if (!raw) return '';
    var m = String(raw).match(PRIZMA_PHONE_RE);
    if (m) {
      var local = '0' + m[1];
      return local.slice(0, 3) + '-' + local.slice(3, 6) + '-' + local.slice(6);
    }
    return raw;
  }

  // --- Phone normalize to E.164 ---
  // Mirrors supabase/functions/lead-intake/index.ts normalizePhone so manual
  // creation, edit, and public intake all write phones in one canonical format.
  // Returns +CC... or null if the input cannot be interpreted.
  function normalizePhone(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!s) return null;
    var hasPlus = s.charAt(0) === '+';
    var digits = s.replace(/\D/g, '');
    if (!digits) return null;
    if (hasPlus) return '+' + digits;
    if (digits.indexOf('972') === 0) return '+' + digits;
    if (digits.charAt(0) === '0' && digits.length === 10) return '+972' + digits.slice(1);
    return null;
  }

  // --- Currency: number -> ₪39,460 ---
  function formatCurrency(n) {
    if (n == null || n === '') return '';
    if (typeof formatMoney === 'function') return formatMoney(n);
    var num = Number(n);
    if (!isFinite(num)) return '';
    return '₪' + num.toLocaleString('he-IL', { maximumFractionDigits: 0 });
  }

  // --- Date: '2026-03-27' -> 27.03.2026 ---
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    return dd + '.' + mm + '.' + yy;
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return formatDate(iso) + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

  // --- Language display ---
  var LANG_HE = { he: '\u05E2\u05D1\u05E8\u05D9\u05EA', ru: '\u05E8\u05D5\u05E1\u05D9\u05EA', en: '\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA' };
  function formatLanguage(code) {
    if (!code) return '';
    return LANG_HE[String(code).toLowerCase()] || code;
  }

  // --- Tier 1 & Tier 2 status constants ---
  var TIER1_STATUSES = [
    'new',              // ליד חדש שנרשם
    'pending_terms',    // ליד ידני שלא אישר תקנון
    'invalid_phone',    // מספר טלפון שגוי
    'too_far',          // גר רחוק מאשקלון
    'no_answer',        // ניסו ליצור קשר, לא ענה
    'callback'          // צריך להתקשר אליו בחזרה
  ];

  var TIER2_STATUSES = [
    'waiting',                // ממתין לאירוע
    'invited',                // הוזמן לאירוע
    'waitlist',               // רשימת המתנה לאירוע ספציפי (M4_LEAD_STATUS_WAITLIST_SYNC, 2026-04-28)
    'confirmed',              // אישר הגעה
    'confirmed_verified',     // אישר ווידוא הגעה
    'not_interested',         // לא מעוניין
    'unsubscribed'            // ביטל UNSUBSCRIBE
  ];

  // --- Status cache loader ---
  // Fills window.CRM_STATUSES = { lead: { slug: {name_he, color, ...} }, event: {...}, attendee: {...} }
  async function loadStatusCache() {
    if (window.CRM_STATUSES && window.CRM_STATUSES._loaded) return window.CRM_STATUSES;
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    var q = sb.from('crm_statuses').select('entity_type, slug, name_he, name_en, color, sort_order, is_default');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.eq('is_active', true).order('sort_order');
    var res = await q;
    if (res.error) throw new Error('crm_statuses load failed: ' + res.error.message);
    var byType = { lead: {}, event: {}, attendee: {}, _loaded: true, _all: res.data || [] };
    (res.data || []).forEach(function (r) {
      if (!byType[r.entity_type]) byType[r.entity_type] = {};
      byType[r.entity_type][r.slug] = r;
    });
    window.CRM_STATUSES = byType;
    return byType;
  }

  // --- Status -> { label, color } (Hebrew from DB, fallback to slug) ---
  function getStatusInfo(entityType, slug) {
    var cache = window.CRM_STATUSES || {};
    var row = cache[entityType] && cache[entityType][slug];
    if (!row) return { label: slug || '', color: '#9ca3af' };
    return { label: row.name_he || row.slug, color: row.color || '#9ca3af' };
  }

  // --- Render a status badge HTML (safe; uses textContent via DOM, returns HTML string) ---
  function statusBadgeHtml(entityType, slug) {
    var info = getStatusInfo(entityType, slug);
    var esc = (typeof escapeHtml === 'function') ? escapeHtml : function (s) {
      var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML;
    };
    return '<span class="crm-badge" style="background:' + esc(info.color) + '">' +
      esc(info.label) + '</span>';
  }

  // --- Distinct values helper ---
  function distinctValues(rows, key) {
    var s = new Set();
    (rows || []).forEach(function (r) { if (r && r[key] != null && r[key] !== '') s.add(r[key]); });
    return Array.from(s);
  }

  // --- Hebrew compare for sorting ---
  function heCompare(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'he');
  }

  // --- Tenant id getter (safe pre-bootstrap) ---
  function tid() {
    return (typeof getTenantId === 'function') ? getTenantId() : null;
  }

  // --- Toast wrapper (P26 commit 0a — consolidates 4 duplicate file-local
  //     helpers in manage / schedule / broadcast / rules). Falls back to
  //     window.Toast.show if the requested type is not a Toast method.
  function toast(type, msg) {
    if (window.Toast && Toast[type]) Toast[type](msg);
    else if (window.Toast && Toast.show) Toast.show(msg);
  }

  // --- Activity log wrapper (P26 commit 0a — consolidates the
  //     logActivity / logWrite duplicates across 4 CRM files). entity_type
  //     is now an explicit caller argument so each caller maps the action
  //     to the right entity. Field names already correct (details, level)
  //     per the P26 commit-1 fix on the underlying ActivityLog.write API.
  function logActivity(action, entity_type, entity_id, details) {
    if (window.ActivityLog && ActivityLog.write) {
      try {
        ActivityLog.write({
          action: action,
          entity_type: entity_type,
          entity_id: entity_id,
          details: details || {}
        });
      } catch (_) {}
    }
  }

  // PRE_CUTOVER_QA_A B8 — Hebrew day-of-week derived client-side from a YYYY-MM-DD
  // event_date. Mirrors the EF helper at supabase/functions/send-message/event-
  // variables.ts. Parses the calendar parts manually and builds a UTC midnight
  // Date so getUTCDay() returns the calendar weekday regardless of host TZ.
  var _HE_DOW = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','שבת'];
  function hebrewDayOfWeek(ymd) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
    var parts = ymd.split('-');
    var d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    return _HE_DOW[d.getUTCDay()] || '';
  }

  window.CrmHelpers = {
    formatPhone: formatPhone,
    normalizePhone: normalizePhone,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatLanguage: formatLanguage,
    loadStatusCache: loadStatusCache,
    getStatusInfo: getStatusInfo,
    statusBadgeHtml: statusBadgeHtml,
    distinctValues: distinctValues,
    heCompare: heCompare,
    tid: tid,
    toast: toast,
    logActivity: logActivity,
    hebrewDayOfWeek: hebrewDayOfWeek
  };

  // Export tier constants
  window.TIER1_STATUSES = TIER1_STATUSES;
  window.TIER2_STATUSES = TIER2_STATUSES;
})();
