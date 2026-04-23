/* =============================================================================
   crm-lead-filters.js — Advanced filtering for leads tabs (P9)
   Load order: AFTER crm-helpers.js. Uses CrmHelpers, escapeHtml, sb, getTenantId.
   Exports window.CrmLeadFilters:
     getState(key), clearState(key),
     applyFilters(leads, allowedStatuses, notesByLead, state),
     loadLastNotesMap(), renderAdvancedBar(host, opts), renderChips(state),
     activeCount(state).
   State is module-scoped per tier — survives tab switches but not page reloads.
   ============================================================================= */
(function () {
  'use strict';

  var _state = {};

  function _empty() {
    return { statuses: [], fromDate: '', toDate: '', noResp48: false, source: '', language: '' };
  }
  function getState(key) { if (!_state[key]) _state[key] = _empty(); return _state[key]; }
  function clearState(key) { _state[key] = _empty(); }

  function activeCount(st) {
    var n = 0;
    if (st.statuses.length) n++;
    if (st.fromDate) n++;
    if (st.toDate) n++;
    if (st.noResp48) n++;
    if (st.source) n++;
    if (st.language) n++;
    return n;
  }

  function applyFilters(leads, allowedStatuses, notesByLead, state) {
    var cutoff48 = Date.now() - 48 * 3600 * 1000;
    var allowSet = allowedStatuses && allowedStatuses.length ? allowedStatuses : null;
    var hasStatuses = state.statuses && state.statuses.length;
    return (leads || []).filter(function (r) {
      if (allowSet && allowSet.indexOf(r.status) === -1) return false;
      if (hasStatuses && state.statuses.indexOf(r.status) === -1) return false;
      if (state.language && r.language !== state.language) return false;
      if (state.source && r.source !== state.source) return false;
      if (state.fromDate || state.toDate) {
        var d = (r.created_at || '').slice(0, 10);
        if (!d) return false;
        if (state.fromDate && d < state.fromDate) return false;
        if (state.toDate && d > state.toDate) return false;
      }
      if (state.noResp48) {
        var last = notesByLead && notesByLead[r.id];
        if (last && new Date(last).getTime() >= cutoff48) return false;
      }
      return true;
    });
  }

  async function loadLastNotesMap() {
    if (!window.sb) return {};
    var tid = (typeof getTenantId === 'function') ? getTenantId() : null;
    var q = sb.from('crm_lead_notes').select('lead_id, created_at');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('created_at', { ascending: false });
    var res = await q;
    if (res.error) return {};
    var map = {};
    (res.data || []).forEach(function (n) { if (!map[n.lead_id]) map[n.lead_id] = n.created_at; });
    return map;
  }

  function renderAdvancedBar(host, opts) {
    if (!host) return;
    var st = getState(opts.key);
    var statusLabels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};

    var statusChecks = (opts.statuses || []).map(function (slug) {
      var info = statusLabels[slug];
      if (!info) return '';
      var checked = st.statuses.indexOf(slug) !== -1 ? ' checked' : '';
      return '<label class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-slate-50 rounded cursor-pointer">' +
        '<input type="checkbox" class="rounded border-slate-300" data-filter-status="' + escapeHtml(slug) + '"' + checked + '>' +
        '<span class="w-2 h-2 rounded-full" style="background:' + escapeHtml(info.color || '#9ca3af') + '"></span>' +
        '<span class="text-slate-700">' + escapeHtml(info.name_he || slug) + '</span>' +
      '</label>';
    }).filter(Boolean).join('');

    var sources = {};
    (opts.leads || []).forEach(function (r) { if (r.source) sources[r.source] = true; });
    var sourceOpts = '<option value="">כל המקורות</option>' + Object.keys(sources).sort().map(function (s) {
      var sel = s === st.source ? ' selected' : '';
      return '<option value="' + escapeHtml(s) + '"' + sel + '>' + escapeHtml(s) + '</option>';
    }).join('');

    var langHtml = '';
    if (opts.showLanguage) {
      var langs = {};
      (opts.leads || []).forEach(function (r) { if (r.language) langs[r.language] = true; });
      langHtml = '<select data-filter-lang class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"><option value="">כל השפות</option>' +
        Object.keys(langs).sort().map(function (l) {
          var sel = l === st.language ? ' selected' : '';
          return '<option value="' + escapeHtml(l) + '"' + sel + '>' + escapeHtml(CrmHelpers.formatLanguage(l)) + '</option>';
        }).join('') + '</select>';
    }

    var count = activeCount(st);
    var collapsed = count === 0;
    var badge = count ? '<span class="text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5 ms-1">' + count + '</span>' : '';

    host.innerHTML =
      '<div class="mb-2">' +
        '<button type="button" data-filter-toggle class="text-sm font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1">' +
          '<span>סינון מתקדם</span><span data-filter-arrow>' + (collapsed ? '▾' : '▴') + '</span>' + badge +
        '</button>' +
      '</div>' +
      '<div data-filter-panel class="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3" style="display:' + (collapsed ? 'none' : 'block') + '">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<div class="relative" data-status-wrap>' +
            '<button type="button" data-status-toggle class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white inline-flex items-center gap-1">' +
              '<span data-status-btn-label>סטטוס' + (st.statuses.length ? ' (' + st.statuses.length + ')' : '') + '</span><span>▾</span>' +
            '</button>' +
            '<div data-status-dropdown class="absolute z-40 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] max-h-[260px] overflow-auto" style="display:none">' + statusChecks + '</div>' +
          '</div>' +
          '<label class="text-xs text-slate-600 ms-2">מתאריך</label>' +
          '<input type="date" data-filter-from class="px-2 py-1 border border-slate-300 rounded-lg text-sm" value="' + escapeHtml(st.fromDate || '') + '">' +
          '<label class="text-xs text-slate-600">עד תאריך</label>' +
          '<input type="date" data-filter-to class="px-2 py-1 border border-slate-300 rounded-lg text-sm" value="' + escapeHtml(st.toDate || '') + '">' +
          '<label class="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer px-2">' +
            '<input type="checkbox" data-filter-48h class="rounded border-slate-300"' + (st.noResp48 ? ' checked' : '') + '>' +
            '<span>ללא תגובה 48 שעות</span>' +
          '</label>' +
          '<select data-filter-source class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">' + sourceOpts + '</select>' +
          langHtml +
          '<button type="button" data-filter-clear class="px-3 py-1.5 border border-rose-300 text-rose-700 rounded-lg text-sm hover:bg-rose-50 transition ms-auto">נקה הכל</button>' +
        '</div>' +
      '</div>';

    wireFilterBarEvents(host, opts);
  }

  function wireFilterBarEvents(host, opts) {
    var st = getState(opts.key);
    var fire = function () { if (typeof opts.onChange === 'function') opts.onChange(); };

    var toggle = host.querySelector('[data-filter-toggle]');
    var panel = host.querySelector('[data-filter-panel]');
    var arrow = host.querySelector('[data-filter-arrow]');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var hidden = panel.style.display === 'none';
        panel.style.display = hidden ? 'block' : 'none';
        if (arrow) arrow.textContent = hidden ? '▴' : '▾';
      });
    }

    var statusWrap = host.querySelector('[data-status-wrap]');
    var statusDrop = host.querySelector('[data-status-dropdown]');
    var statusBtn = host.querySelector('[data-status-toggle]');
    var statusBtnLabel = host.querySelector('[data-status-btn-label]');
    if (statusBtn && statusDrop) {
      statusBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        statusDrop.style.display = statusDrop.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('click', function (e) {
        if (statusWrap && !statusWrap.contains(e.target)) statusDrop.style.display = 'none';
      });
    }
    host.querySelectorAll('[data-filter-status]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var slug = cb.getAttribute('data-filter-status');
        var i = st.statuses.indexOf(slug);
        if (cb.checked && i === -1) st.statuses.push(slug);
        if (!cb.checked && i !== -1) st.statuses.splice(i, 1);
        if (statusBtnLabel) statusBtnLabel.textContent = 'סטטוס' + (st.statuses.length ? ' (' + st.statuses.length + ')' : '');
        fire();
      });
    });

    var from = host.querySelector('[data-filter-from]');
    if (from) from.addEventListener('change', function () { st.fromDate = from.value || ''; fire(); });
    var to = host.querySelector('[data-filter-to]');
    if (to) to.addEventListener('change', function () { st.toDate = to.value || ''; fire(); });
    var h48 = host.querySelector('[data-filter-48h]');
    if (h48) h48.addEventListener('change', function () { st.noResp48 = h48.checked; fire(); });
    var src = host.querySelector('[data-filter-source]');
    if (src) src.addEventListener('change', function () { st.source = src.value || ''; fire(); });
    var lang = host.querySelector('[data-filter-lang]');
    if (lang) lang.addEventListener('change', function () { st.language = lang.value || ''; fire(); });

    var clear = host.querySelector('[data-filter-clear]');
    if (clear) clear.addEventListener('click', function () {
      clearState(opts.key);
      renderAdvancedBar(host, opts);
      fire();
    });
  }

  function renderChips(state) {
    var chips = [];
    if (state.statuses && state.statuses.length) {
      var labels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
      var parts = state.statuses.map(function (s) { return (labels[s] && labels[s].name_he) || s; });
      chips.push({ k: 'statuses', label: 'סטטוס: ' + parts.join(', ') });
    }
    if (state.fromDate || state.toDate) {
      chips.push({ k: 'dates', label: 'תאריך: ' + (state.fromDate || '…') + ' - ' + (state.toDate || '…') });
    }
    if (state.noResp48) chips.push({ k: '48h', label: 'ללא תגובה 48 שעות' });
    if (state.source) chips.push({ k: 'source', label: 'מקור: ' + state.source });
    if (state.language) chips.push({ k: 'lang', label: 'שפה: ' + CrmHelpers.formatLanguage(state.language) });
    return chips;
  }

  window.CrmLeadFilters = {
    getState: getState,
    clearState: clearState,
    activeCount: activeCount,
    applyFilters: applyFilters,
    loadLastNotesMap: loadLastNotesMap,
    renderAdvancedBar: renderAdvancedBar,
    renderChips: renderChips
  };
})();
