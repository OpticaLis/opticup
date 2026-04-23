/* =============================================================================
   crm-activity-log.js — Activity Log tab (P12)
   Table: activity_log (M1.5 owned). CRM-scoped view filtered by entity_type.
   Mirrors the filter+table+pagination+expandable-row pattern from
   crm-messaging-log.js. Read-only — never writes to activity_log.
   Exports window.renderActivityLog, window.loadActivityLog.
   ============================================================================= */
(function () {
  'use strict';

  var ACTION_LABELS = {
    'crm.lead.create':            'יצירת ליד',
    'crm.lead.update':            'עדכון ליד',
    'crm.lead.delete':            'מחיקת ליד',
    'crm.lead.status_change':     'שינוי סטטוס ליד',
    'crm.lead.bulk_status_change':'שינוי סטטוס מרובה',
    'crm.lead.move_to_registered':'העברה לרשומים',
    'crm.lead.note_add':          'הוספת הערה',
    'crm.event.create':           'יצירת אירוע',
    'crm.event.update':           'עדכון אירוע',
    'crm.event.delete':           'מחיקת אירוע',
    'crm.event.status_change':    'שינוי סטטוס אירוע',
    'crm.event.attendee_checkin': 'צ׳ק-אין משתתף',
    'crm.event.attendee_status':  'שינוי סטטוס משתתף',
    'crm.event.schedule_publish': 'פרסום סדר יום',
    'crm.broadcast.send':         'שליחת ברודקאסט',
    'crm.template.create':        'יצירת תבנית',
    'crm.template.update':        'עדכון תבנית',
    'crm.template.deactivate':    'ביטול תבנית',
    'crm.rule.create':            'יצירת כלל',
    'crm.rule.update':            'עדכון כלל',
    'crm.rule.toggle':            'שינוי סטטוס כלל',
    'crm.page.open':              'פתיחת עמוד CRM'
  };

  var ENTITY_LABELS = {
    'crm_leads':              'לידים',
    'crm_events':             'אירועים',
    'crm_event_attendees':    'משתתפים',
    'crm_automation_rule':    'כללי אוטומציה',
    'crm_message_template':   'תבניות',
    'crm_broadcast':          'ברודקאסט',
    'crm_message_log':        'יומן הודעות',
    'crm':                    'כללי'
  };

  var ACTION_GROUPS = {
    leads:     ['crm.lead.create','crm.lead.update','crm.lead.delete','crm.lead.status_change','crm.lead.bulk_status_change','crm.lead.move_to_registered','crm.lead.note_add'],
    events:    ['crm.event.create','crm.event.update','crm.event.delete','crm.event.status_change','crm.event.attendee_checkin','crm.event.attendee_status','crm.event.schedule_publish'],
    messaging: ['crm.broadcast.send'],
    templates: ['crm.template.create','crm.template.update','crm.template.deactivate'],
    rules:     ['crm.rule.create','crm.rule.update','crm.rule.toggle'],
    system:    ['crm.page.open']
  };

  var CRM_ENTITY_TYPES = Object.keys(ENTITY_LABELS);
  var LEVEL_LABELS = { info: 'מידע', warning: 'אזהרה', error: 'שגיאה', critical: 'קריטי' };
  var LEVEL_CLASSES = {
    info:     'bg-slate-100 text-slate-700',
    warning:  'bg-amber-100 text-amber-800',
    error:    'bg-rose-100 text-rose-800',
    critical: 'bg-rose-200 text-rose-900 font-bold'
  };
  var PAGE_SIZE = 50;

  var CLS_INPUT = 'px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_TABLE = 'w-full text-sm bg-white';
  var CLS_TH    = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD    = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';

  var _rows = [];
  var _page = 1;
  var _expandedId = null;
  var _employees = {};

  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }

  async function ensureEmployees() {
    if (Object.keys(_employees).length) return;
    var tid = getTenantId();
    var q = sb.from('employees').select('id, full_name');
    if (tid) q = q.eq('tenant_id', tid);
    var res = await q;
    if (res.error) return;
    (res.data || []).forEach(function (e) { _employees[e.id] = e.full_name; });
  }

  async function renderActivityLog(host) {
    if (!host) return;
    var actionOpts = '<option value="">כל הפעולות</option>' +
      Object.keys(ACTION_GROUPS).map(function (k) {
        var labels = { leads: 'לידים', events: 'אירועים', messaging: 'הודעות', templates: 'תבניות', rules: 'כללים', system: 'מערכת' };
        return '<option value="' + k + '">' + labels[k] + '</option>';
      }).join('');
    var entityOpts = '<option value="">כל הסוגים</option>' +
      CRM_ENTITY_TYPES.map(function (t) { return '<option value="' + t + '">' + esc(ENTITY_LABELS[t]) + '</option>'; }).join('');
    var levelOpts = '<option value="">כל הרמות</option>' +
      Object.keys(LEVEL_LABELS).map(function (l) { return '<option value="' + l + '">' + esc(LEVEL_LABELS[l]) + '</option>'; }).join('');

    host.innerHTML =
      '<div class="space-y-3">' +
        '<h3 class="text-lg font-bold text-slate-800">לוג פעילות</h3>' +
        '<div class="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap gap-2 items-end">' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1">קטגוריה</label>' +
            '<select id="al-action-group" class="' + CLS_INPUT + ' min-w-[140px]">' + actionOpts + '</select>' +
          '</div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1">סוג ישות</label>' +
            '<select id="al-entity-type" class="' + CLS_INPUT + ' min-w-[160px]">' + entityOpts + '</select>' +
          '</div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1">מתאריך</label>' +
            '<input type="date" id="al-from-date" class="' + CLS_INPUT + '">' +
          '</div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1">עד תאריך</label>' +
            '<input type="date" id="al-to-date" class="' + CLS_INPUT + '">' +
          '</div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1">רמה</label>' +
            '<select id="al-level" class="' + CLS_INPUT + ' min-w-[120px]">' + levelOpts + '</select>' +
          '</div>' +
          '<button id="al-refresh" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">רענן</button>' +
        '</div>' +
        '<div id="al-table" class="bg-white rounded-lg border border-slate-200 overflow-hidden"></div>' +
        '<div id="al-pagination" class="flex items-center gap-2"></div>' +
      '</div>';

    ['al-action-group','al-entity-type','al-from-date','al-to-date','al-level'].forEach(function (id) {
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', function () { _page = 1; _expandedId = null; loadActivityLog().then(renderTable); });
    });
    var refresh = host.querySelector('#al-refresh');
    if (refresh) refresh.addEventListener('click', function () { _page = 1; _expandedId = null; loadActivityLog().then(renderTable); });

    await ensureEmployees();
    await loadActivityLog();
    renderTable();
  }
  window.renderActivityLog = renderActivityLog;
  window.loadActivityLog = function () { return loadActivityLog().then(renderTable); };

  async function loadActivityLog() {
    var tid = getTenantId();
    var actionGroup = (document.getElementById('al-action-group') || {}).value || '';
    var entityType  = (document.getElementById('al-entity-type')  || {}).value || '';
    var fromDate    = (document.getElementById('al-from-date')    || {}).value || '';
    var toDate      = (document.getElementById('al-to-date')      || {}).value || '';
    var level       = (document.getElementById('al-level')        || {}).value || '';

    var q = sb.from('activity_log')
      .select('id, level, action, entity_type, entity_id, details, user_id, created_at');
    if (tid) q = q.eq('tenant_id', tid);
    if (entityType) q = q.eq('entity_type', entityType);
    else q = q.in('entity_type', CRM_ENTITY_TYPES);
    if (actionGroup && ACTION_GROUPS[actionGroup]) q = q.in('action', ACTION_GROUPS[actionGroup]);
    if (fromDate) q = q.gte('created_at', fromDate);
    if (toDate)   q = q.lte('created_at', toDate + 'T23:59:59');
    if (level)    q = q.eq('level', level);
    q = q.order('created_at', { ascending: false }).limit(300);
    var res = await q;
    _rows = res.error ? [] : (res.data || []);
  }

  function detailPreview(details) {
    if (!details || typeof details !== 'object') return '';
    var keys = Object.keys(details);
    if (!keys.length) return '';
    var parts = keys.slice(0, 3).map(function (k) {
      var v = details[k];
      if (v == null) return k + ': —';
      if (typeof v === 'object') v = Array.isArray(v) ? '[' + v.length + ']' : JSON.stringify(v).slice(0, 30);
      return k + ': ' + String(v).slice(0, 40);
    });
    return parts.join(' · ');
  }

  function entityIdDisplay(r) {
    if (!r.entity_id) return '—';
    var s = String(r.entity_id);
    if (s.length === 36) return s.slice(0, 8);
    return s;
  }

  function renderTable() {
    var wrap = document.getElementById('al-table');
    if (!wrap) return;
    if (!_rows.length) { wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין רשומות לוג</div>'; return; }
    var start = (_page - 1) * PAGE_SIZE;
    var rows = _rows.slice(start, start + PAGE_SIZE);
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + ' whitespace-nowrap">תאריך</th>' +
      '<th class="' + CLS_TH + '">פעולה</th>' +
      '<th class="' + CLS_TH + '">סוג</th>' +
      '<th class="' + CLS_TH + '">ישות</th>' +
      '<th class="' + CLS_TH + '">משתמש</th>' +
      '<th class="' + CLS_TH + '">רמה</th>' +
      '<th class="' + CLS_TH + '">פרטים</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var actionLbl = ACTION_LABELS[r.action] || r.action || '—';
      var entityLbl = ENTITY_LABELS[r.entity_type] || r.entity_type || '—';
      var userLbl   = r.user_id ? (_employees[r.user_id] || (String(r.user_id).slice(0, 8))) : 'מערכת';
      var levelCls  = LEVEL_CLASSES[r.level] || LEVEL_CLASSES.info;
      var levelLbl  = LEVEL_LABELS[r.level] || r.level || '—';
      var when      = (window.CrmHelpers && CrmHelpers.formatDateTime) ? CrmHelpers.formatDateTime(r.created_at) : String(r.created_at || '');
      html += '<tr class="hover:bg-indigo-50 cursor-pointer" data-al-row="' + esc(r.id) + '">' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600 whitespace-nowrap">' + esc(when) + '</td>' +
        '<td class="' + CLS_TD + ' font-medium text-slate-800">' + esc(actionLbl) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + esc(entityLbl) + '</td>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-500" style="direction:ltr;text-align:end">' + esc(entityIdDisplay(r)) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-700">' + esc(userLbl) + '</td>' +
        '<td class="' + CLS_TD + '"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + levelCls + '">' + esc(levelLbl) + '</span></td>' +
        '<td class="' + CLS_TD + ' text-slate-600 text-xs truncate max-w-md">' + esc(detailPreview(r.details)) + '</td>' +
      '</tr>';
      if (_expandedId === r.id) html += renderExpandedRow(r);
    });
    wrap.innerHTML = html + '</tbody></table>';
    wrap.querySelectorAll('[data-al-row]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-al-row');
        _expandedId = (_expandedId === id) ? null : id;
        renderTable();
      });
    });
    renderPagination();
  }

  function renderExpandedRow(r) {
    var detailsStr = '';
    try { detailsStr = JSON.stringify(r.details || {}, null, 2); } catch (_) { detailsStr = String(r.details || ''); }
    var meta = '<div class="text-xs text-slate-500 mt-2">' +
      '<div>action: <code class="text-slate-700">' + esc(r.action) + '</code></div>' +
      '<div>entity: <code class="text-slate-700">' + esc(r.entity_type) + '</code>' + (r.entity_id ? ' · ' + esc(r.entity_id) : '') + '</div>' +
      '<div>user_id: <code class="text-slate-700">' + esc(r.user_id || '—') + '</code></div>' +
    '</div>';
    return '<tr><td colspan="7" class="bg-slate-50 px-6 py-4 border-b border-slate-200">' +
      '<div class="text-sm font-semibold text-slate-700 mb-1">פרטים מלאים:</div>' +
      '<pre class="whitespace-pre-wrap text-xs text-slate-800 bg-white border border-slate-200 rounded p-3 max-h-64 overflow-auto" style="direction:ltr;text-align:start">' + esc(detailsStr) + '</pre>' +
      meta +
    '</td></tr>';
  }

  function renderPagination() {
    var box = document.getElementById('al-pagination');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(_rows.length / PAGE_SIZE));
    if (pages <= 1) { box.innerHTML = '<span class="text-sm text-slate-500">סה״כ ' + _rows.length + ' רשומות</span>'; return; }
    var btn = 'px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-40';
    var act = 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold';
    var html = '<button class="' + btn + '" ' + (_page === 1 ? 'disabled' : '') + ' data-alp="prev">›</button>';
    for (var i = 1; i <= pages; i++) html += '<button class="' + (i === _page ? act : btn) + '" data-alp="' + i + '">' + i + '</button>';
    html += '<button class="' + btn + '" ' + (_page === pages ? 'disabled' : '') + ' data-alp="next">‹</button>';
    html += '<span class="text-sm text-slate-500 ms-2">סה״כ ' + _rows.length + '</span>';
    box.innerHTML = html;
    box.querySelectorAll('[data-alp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-alp');
        if (v === 'prev') _page = Math.max(1, _page - 1);
        else if (v === 'next') _page = Math.min(pages, _page + 1);
        else _page = parseInt(v, 10) || 1;
        renderTable();
      });
    });
  }
})();
