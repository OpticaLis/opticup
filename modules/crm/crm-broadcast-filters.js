/* =============================================================================
   crm-broadcast-filters.js — Advanced recipient filtering for broadcast wizard (P11)
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
    { key: 'registered', label: 'רשומים',        globalVar: 'TIER2_STATUSES' }
  ];

  function boardStatuses(boardKey) {
    var def = BOARD_DEFS.find(function (b) { return b.key === boardKey; });
    if (!def) return [];
    return window[def.globalVar] || [];
  }

  function allBoardStatuses(selectedBoards) {
    var out = [];
    (selectedBoards || []).forEach(function (b) {
      boardStatuses(b).forEach(function (s) { if (out.indexOf(s) === -1) out.push(s); });
    });
    return out;
  }

  function isEventOpen(ev) {
    if (!ev || !ev.event_date) return true;
    var todayIso = new Date().toISOString().slice(0, 10);
    return String(ev.event_date).slice(0, 10) >= todayIso;
  }

  function escape(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s || ''); }

  function renderRecipientsStep(state, events) {
    var statusesCache = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    var boardChecks = BOARD_DEFS.map(function (b) {
      var on = state.boards.indexOf(b.key) !== -1;
      return '<label class="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50' + (on ? ' bg-indigo-50 border-indigo-400' : '') + '">' +
        '<input type="checkbox" data-bc-board="' + escape(b.key) + '"' + (on ? ' checked' : '') + ' class="rounded border-slate-300">' +
        '<span>' + escape(b.label) + '</span>' +
      '</label>';
    }).join('');

    var visibleStatuses = allBoardStatuses(state.boards);
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

    var statusLabel = state.statuses.length ? 'סטטוס (' + state.statuses.length + ')' : 'סטטוס (כולם)';
    var eventLabel  = state.events.length   ? 'אירוע (' + state.events.length + ')'   : 'אירוע (הכל)';

    return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 1 — נמענים</h4>' +
      '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">לוח</label>' +
        '<div class="flex gap-2 flex-wrap">' + boardChecks + '</div>' +
      '</div>' +
      '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">' + escape(statusLabel) + '</label>' +
        '<div class="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">' +
          (statusChecks || '<div class="text-slate-400 text-sm py-1">אין סטטוסים זמינים</div>') +
        '</div>' +
        '<div class="text-xs text-slate-500 mt-1">ריק = כל הסטטוסים שבלוח שנבחר</div>' +
      '</div>' +
      '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">' + escape(eventLabel) + '</label>' +
        '<label class="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer mb-2">' +
          '<input type="checkbox" data-bc-open-events' + (state.openEventsOnly ? ' checked' : '') + ' class="rounded border-slate-300">' +
          '<span>אירועים פתוחים בלבד</span>' +
        '</label>' +
        '<div class="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">' +
          (eventChecks || '<div class="text-slate-400 text-sm py-1">אין אירועים</div>') +
        '</div>' +
        '<div class="text-xs text-slate-500 mt-1">ריק = ללא סינון אירוע</div>' +
      '</div>' +
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
            '<option value="">הכל</option>' +
            ['site','manual','import','other'].map(function (s) {
              var label = s === 'site' ? 'אתר' : s === 'manual' ? 'ידני' : s === 'import' ? 'ייבוא' : 'אחר';
              return '<option value="' + s + '"' + (s === state.source ? ' selected' : '') + '>' + label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="wiz-count" class="px-4 py-3 bg-indigo-50 text-indigo-800 rounded-lg font-bold text-sm cursor-pointer hover:bg-indigo-100 transition" title="לחץ לצפייה בנמענים">מחשב...</div>';
  }

  function wireRecipientsStep(root, state, events, onChange) {
    if (!root) return;
    var fire = function () { if (typeof onChange === 'function') onChange(); };

    root.querySelectorAll('[data-bc-board]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-bc-board');
        var i = state.boards.indexOf(key);
        if (cb.checked && i === -1) state.boards.push(key);
        if (!cb.checked && i !== -1) state.boards.splice(i, 1);
        var allowed = allBoardStatuses(state.boards);
        if (allowed.length) {
          state.statuses = state.statuses.filter(function (s) { return allowed.indexOf(s) !== -1; });
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
    var q = sb.from('crm_leads')
      .select('id, full_name, phone, status, source, language')
      .eq('is_deleted', false)
      .is('unsubscribed_at', null);
    if (tid) q = q.eq('tenant_id', tid);

    var effectiveStatuses = [];
    if (state.statuses && state.statuses.length) {
      effectiveStatuses = state.statuses.slice();
    } else {
      effectiveStatuses = allBoardStatuses(state.boards);
    }
    if (effectiveStatuses.length) q = q.in('status', effectiveStatuses);

    if (state.language) q = q.eq('language', state.language);
    if (state.source)   q = q.eq('source', state.source);

    if (state.events && state.events.length) {
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
    }

    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
  }

  async function buildLeadIds(state) {
    var rows = await buildLeadRows(state);
    return rows.map(function (r) { return r.id; });
  }

  window.CrmBroadcastFilters = {
    BOARD_DEFS: BOARD_DEFS,
    renderRecipientsStep: renderRecipientsStep,
    wireRecipientsStep: wireRecipientsStep,
    buildLeadIds: buildLeadIds,
    buildLeadRows: buildLeadRows,
    allBoardStatuses: allBoardStatuses
  };
})();
