/* =============================================================================
   crm-broadcast-filters.js — Advanced recipient filtering for broadcast wizard (P11+P12)
   Tables: crm_leads, crm_events, crm_event_attendees.
   Load order: AFTER crm-helpers.js (for TIER1/TIER2_STATUSES + CRM_STATUSES),
   BEFORE crm-messaging-broadcast.js (broadcast consumes window.CrmBroadcastFilters).
   Exports:
     window.CrmBroadcastFilters = {
       renderRecipientsStep(state, events) -> html string,
       wireRecipientsStep(root, state, events, onChange),
       buildLeadIds(state) -> Promise<string[]>,
       buildLeadRows(state) -> Promise<{id,full_name,phone,status,source}[]>
     };
   ============================================================================= */
(function () {
  'use strict';

  var CLS_INPUT  = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_LABEL  = 'block text-sm font-medium text-slate-700 mb-1';
  var CLS_ROW    = 'mb-3';

  var BOARD_DEFS = [
    { key: 'incoming',   label: 'לידים נכנסים', globalVar: 'TIER1_STATUSES' },
    { key: 'registered', label: 'רשומים',        globalVar: 'TIER2_STATUSES' },
    { key: 'by_event',   label: 'לפי אירוע',     globalVar: null }
  ];

  var SOURCE_OPTIONS = [
    { value: 'supersale_form', label: 'טופס אתר' },
    { value: 'manual',         label: 'ידני' },
    { value: 'import',         label: 'ייבוא' }
  ];

  function boardStatuses(boardKey) {
    var def = BOARD_DEFS.find(function (b) { return b.key === boardKey; });
    if (!def || !def.globalVar) return [];
    return window[def.globalVar] || [];
  }

  function isEventOpen(ev) {
    if (!ev || !ev.event_date) return true;
    var todayIso = new Date().toISOString().slice(0, 10);
    return String(ev.event_date).slice(0, 10) >= todayIso;
  }

  function escape(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s || ''); }

  function renderStatusBlock(state, statusesCache) {
    var visibleStatuses = boardStatuses(state.board);
    if (!visibleStatuses.length) visibleStatuses = Object.keys(statusesCache);
    var statusChecks = visibleStatuses.map(function (slug) {
      var info = statusesCache[slug];
      if (!info) return '';
      var on = state.statuses.indexOf(slug) !== -1;
      return '<label class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-slate-50 rounded cursor-pointer">' +
        '<input type="checkbox" data-bc-status="' + escape(slug) + '"' + (on ? ' checked' : '') + ' class="rounded border-slate-300">' +
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + escape(info.color || '#9ca3af') + '"></span>' +
        '<span class="text-slate-700">' + escape(info.name_he || slug) + '</span>' +
      '</label>';
    }).filter(Boolean).join('');
    var statusLabel = state.statuses.length ? 'סטטוס (' + state.statuses.length + ')' : 'סטטוס (כולם)';
    return '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">' + escape(statusLabel) + '</label>' +
      '<div class="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">' +
        (statusChecks || '<div class="text-slate-400 text-sm py-1">אין סטטוסים זמינים</div>') +
      '</div>' +
      '<div class="text-xs text-slate-500 mt-1">ריק = כל הסטטוסים שבלוח שנבחר</div>' +
    '</div>';
  }

  function renderEventBlock(state, events) {
    var filteredEvents = state.openEventsOnly ? (events || []).filter(isEventOpen) : (events || []);
    var eventChecks = filteredEvents.map(function (ev) {
      var on = state.events.indexOf(ev.id) !== -1;
      var dateLabel = ev.event_date ? String(ev.event_date).slice(0, 10) : '—';
      return '<label class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-slate-50 rounded cursor-pointer">' +
        '<input type="checkbox" data-bc-event="' + escape(ev.id) + '"' + (on ? ' checked' : '') + ' class="rounded border-slate-300">' +
        '<span class="font-medium">#' + escape(ev.event_number || '') + '</span>' +
        '<span class="text-slate-700 flex-1">' + escape(ev.name || '') + '</span>' +
        '<span class="text-xs text-slate-500">' + escape(dateLabel) + '</span>' +
      '</label>';
    }).join('');
    var eventLabel = state.events.length ? 'אירוע (' + state.events.length + ')' : 'אירוע (הכל)';
    return '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">' + escape(eventLabel) + '</label>' +
      '<label class="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer mb-2">' +
        '<input type="checkbox" data-bc-open-events' + (state.openEventsOnly ? ' checked' : '') + ' class="rounded border-slate-300">' +
        '<span>אירועים פתוחים בלבד</span>' +
      '</label>' +
      '<div class="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">' +
        (eventChecks || '<div class="text-slate-400 text-sm py-1">אין אירועים</div>') +
      '</div>' +
      '<div class="text-xs text-slate-500 mt-1">בחר אירוע אחד או יותר. ריק = אין נמענים</div>' +
    '</div>';
  }

  function renderRecipientsStep(state, events) {
    var statusesCache = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    if (!state.board) state.board = 'incoming';
    var byEvent = state.board === 'by_event';

    var boardRadios = BOARD_DEFS.map(function (b) {
      var on = b.key === state.board;
      return '<label class="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50' + (on ? ' bg-indigo-50 border-indigo-400' : '') + '">' +
        '<input type="radio" name="wiz-board" data-bc-board="' + escape(b.key) + '"' + (on ? ' checked' : '') + ' class="border-slate-300">' +
        '<span>' + escape(b.label) + '</span>' +
      '</label>';
    }).join('');

    var sourceOpts = SOURCE_OPTIONS.map(function (s) {
      return '<option value="' + escape(s.value) + '"' + (s.value === state.source ? ' selected' : '') + '>' + escape(s.label) + '</option>';
    }).join('');

    return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 1 — נמענים</h4>' +
      '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">לוח</label>' +
        '<div class="flex gap-2 flex-wrap">' + boardRadios + '</div>' +
      '</div>' +
      (byEvent ? renderEventBlock(state, events) : renderStatusBlock(state, statusesCache)) +
      '<div class="grid grid-cols-2 gap-3 mb-3">' +
        '<div><label class="' + CLS_LABEL + '">שפה</label>' +
          '<select data-bc-lang class="' + CLS_INPUT + '">' +
            '<option value="">הכל</option>' +
            ['he','ru','en'].map(function (l) {
              var label = l === 'he' ? 'עברית' : l === 'ru' ? 'רוסית' : 'אנגלית';
              return '<option value="' + l + '"' + (l === state.language ? ' selected' : '') + '>' + label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div><label class="' + CLS_LABEL + '">מקור</label>' +
          '<select data-bc-source class="' + CLS_INPUT + '">' +
            '<option value="">הכל</option>' + sourceOpts +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="wiz-count" class="px-4 py-3 bg-indigo-50 text-indigo-800 rounded-lg font-bold text-sm cursor-pointer hover:bg-indigo-100 transition" title="לחץ לצפייה בנמענים">מחשב...</div>';
  }

  function wireRecipientsStep(root, state, events, onChange) {
    if (!root) return;
    var fire = function () { if (typeof onChange === 'function') onChange(); };

    root.querySelectorAll('[data-bc-board]').forEach(function (rb) {
      rb.addEventListener('change', function () {
        if (!rb.checked) return;
        state.board = rb.getAttribute('data-bc-board');
        if (state.board === 'by_event') {
          state.statuses = [];
        } else {
          var allowed = boardStatuses(state.board);
          state.statuses = state.statuses.filter(function (s) { return allowed.indexOf(s) !== -1; });
          state.events = [];
          state.openEventsOnly = false;
        }
        fire();
      });
    });

    root.querySelectorAll('[data-bc-status]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var slug = cb.getAttribute('data-bc-status');
        var i = state.statuses.indexOf(slug);
        if (cb.checked && i === -1) state.statuses.push(slug);
        if (!cb.checked && i !== -1) state.statuses.splice(i, 1);
        fire();
      });
    });

    root.querySelectorAll('[data-bc-event]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-bc-event');
        var i = state.events.indexOf(id);
        if (cb.checked && i === -1) state.events.push(id);
        if (!cb.checked && i !== -1) state.events.splice(i, 1);
        fire();
      });
    });

    var openEv = root.querySelector('[data-bc-open-events]');
    if (openEv) openEv.addEventListener('change', function () {
      state.openEventsOnly = openEv.checked;
      if (openEv.checked) {
        var openIds = (events || []).filter(isEventOpen).map(function (e) { return e.id; });
        state.events = state.events.filter(function (id) { return openIds.indexOf(id) !== -1; });
      }
      fire();
    });

    var langSel = root.querySelector('[data-bc-lang]');
    if (langSel) langSel.addEventListener('change', function () { state.language = langSel.value || ''; fire(); });

    var srcSel = root.querySelector('[data-bc-source]');
    if (srcSel) srcSel.addEventListener('change', function () { state.source = srcSel.value || ''; fire(); });
  }

  async function buildLeadRows(state) {
    var tid = getTenantId();
    var board = state.board || 'incoming';

    var q = sb.from('crm_leads')
      .select('id, full_name, phone, status, source, language')
      .eq('is_deleted', false)
      .is('unsubscribed_at', null);
    if (tid) q = q.eq('tenant_id', tid);

    if (board === 'by_event') {
      if (!state.events || !state.events.length) return [];
      var att = sb.from('crm_event_attendees')
        .select('lead_id')
        .in('event_id', state.events)
        .eq('is_deleted', false);
      if (tid) att = att.eq('tenant_id', tid);
      var r = await att;
      if (r.error) throw new Error(r.error.message);
      var ids = [];
      var seen = {};
      (r.data || []).forEach(function (x) {
        if (x.lead_id && !seen[x.lead_id]) { seen[x.lead_id] = 1; ids.push(x.lead_id); }
      });
      if (!ids.length) return [];
      q = q.in('id', ids);
    } else {
      var effectiveStatuses = (state.statuses && state.statuses.length)
        ? state.statuses.slice()
        : boardStatuses(board);
      if (effectiveStatuses.length) q = q.in('status', effectiveStatuses);
    }

    if (state.language) q = q.eq('language', state.language);
    if (state.source)   q = q.eq('source', state.source);

    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
  }

  async function buildLeadIds(state) {
    var rows = await buildLeadRows(state);
    return rows.map(function (r) { return r.id; });
  }

  function showRecipientsPreview(leads) {
    if (typeof Modal === 'undefined' || typeof Modal.show !== 'function') return;
    var statusesCache = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    var rows = (leads || []).map(function (l) {
      var st = statusesCache[l.status];
      var stLabel = (st && st.name_he) || l.status || '—';
      var stColor = (st && st.color) || '#9ca3af';
      var phoneFmt = (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') ? CrmHelpers.formatPhone(l.phone) : (l.phone || '');
      return '<tr class="border-b border-slate-100 last:border-0">' +
        '<td class="px-3 py-2 text-sm">' + escape(l.full_name || '—') + '</td>' +
        '<td class="px-3 py-2 text-sm text-slate-600" style="direction:ltr;text-align:end">' + escape(phoneFmt || '—') + '</td>' +
        '<td class="px-3 py-2 text-sm"><span class="inline-flex items-center gap-1.5">' +
          '<span class="w-2 h-2 rounded-full" style="background:' + escape(stColor) + '"></span>' +
          '<span>' + escape(stLabel) + '</span>' +
        '</span></td>' +
        '<td class="px-3 py-2 text-sm text-slate-500">' + escape(l.source || '—') + '</td>' +
      '</tr>';
    }).join('');

    var content = (leads && leads.length)
      ? '<div class="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">' +
          '<table class="w-full text-sm">' +
            '<thead class="sticky top-0 bg-slate-50 border-b border-slate-200"><tr>' +
              '<th class="px-3 py-2 text-start font-semibold text-slate-700">שם</th>' +
              '<th class="px-3 py-2 text-start font-semibold text-slate-700">טלפון</th>' +
              '<th class="px-3 py-2 text-start font-semibold text-slate-700">סטטוס</th>' +
              '<th class="px-3 py-2 text-start font-semibold text-slate-700">מקור</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>'
      : '<div class="text-center text-slate-400 py-8 text-sm">אין נמענים תואמים</div>';

    Modal.show({
      title: 'נמענים — ' + (leads ? leads.length : 0) + ' לידים',
      size: 'lg',
      content: content
    });
  }

  window.CrmBroadcastFilters = {
    BOARD_DEFS: BOARD_DEFS,
    renderRecipientsStep: renderRecipientsStep,
    wireRecipientsStep: wireRecipientsStep,
    buildLeadIds: buildLeadIds,
    buildLeadRows: buildLeadRows,
    showRecipientsPreview: showRecipientsPreview
  };
})();
