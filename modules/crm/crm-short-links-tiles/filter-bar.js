/* =============================================================================
   filter-bar.js — Component C: Smart filter bar for Short Links Stats tab.
   Three chips: "Only clicked links" toggle (ON by default), date-range presets,
   link-type category dropdown.
   Part of M4_SHORT_LINKS_DASHBOARD_REDESIGN (2026-05-20).
   Exports window.CrmShortLinksFilterBar.
   ============================================================================= */
(function () {
  'use strict';

  // Category mapping per SPEC §3.3
  var PER_RECIPIENT_TYPES  = ['unsubscribe', 'registration', 'registration_url', 'test'];
  var TEMPLATE_STATIC_TYPES = ['template_static'];

  // Shared state object — mutated by chips, read by orchestrator.
  var _state = {
    onlyWithClicks: true,
    days: 30,
    customFrom: null,
    customTo: null,
    linkTypeFilter: 'all' // 'all' | 'per_recipient' | 'template_static'
  };

  var _onChange = null; // callback(state) set by orchestrator

  function getState() { return _state; }

  function getPERTypes()      { return PER_RECIPIENT_TYPES; }
  function getTemplateTypes() { return TEMPLATE_STATIC_TYPES; }

  /* Returns a JS Date representing the start of the date window. */
  function getDateFrom() {
    if (_state.customFrom) return new Date(_state.customFrom);
    var d = new Date();
    d.setDate(d.getDate() - _state.days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function render(container, onChange) {
    _onChange = onChange;

    var presets = [
      { label: '7 ימים',  days: 7  },
      { label: '30 ימים', days: 30 },
      { label: '90 ימים', days: 90 }
    ];

    var typeOptions = [
      { value: 'all',            label: 'הכל' },
      { value: 'per_recipient',  label: 'פר-נמען' },
      { value: 'template_static',label: 'סטטי משותף' }
    ];

    var dateChips = presets.map(function (p) {
      var active = (!_state.customFrom && _state.days === p.days);
      return '<button data-days="' + p.days + '" class="date-chip px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ' +
        (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50') + '">' +
        p.label + '</button>';
    }).join('');

    var typeOptsHtml = typeOptions.map(function (o) {
      return '<option value="' + o.value + '"' + (_state.linkTypeFilter === o.value ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');

    container.innerHTML =
      '<div id="short-links-filter-bar" class="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">' +
        /* Toggle chip */
        '<label class="flex items-center gap-2 cursor-pointer select-none">' +
          '<input type="checkbox" id="sl-only-clicks-toggle"' + (_state.onlyWithClicks ? ' checked' : '') + ' class="w-4 h-4 rounded accent-blue-600">' +
          '<span class="text-sm text-slate-700 font-medium">רק עם קליקים</span>' +
        '</label>' +
        '<div class="w-px h-5 bg-slate-300"></div>' +
        /* Date presets */
        '<div class="flex items-center gap-1.5">' +
          '<span class="text-xs text-slate-500 font-medium">תקופה:</span>' +
          '<div class="flex gap-1">' + dateChips + '</div>' +
        '</div>' +
        '<div class="w-px h-5 bg-slate-300"></div>' +
        /* Link type — semantic: filters the drill-down per-link list,
           NOT the broadcasts aggregation (broadcasts roll up all link types
           into one row per broadcast). Tooltip clarifies for the user. */
        '<div class="flex items-center gap-1.5" title="משפיע על פירוט הקישורים (לחיצה על שורת שידור)">' +
          '<span class="text-xs text-slate-500 font-medium">סוג קישור:</span>' +
          '<select id="sl-link-type-select" class="text-xs rounded border border-slate-300 px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" title="משפיע על פירוט הקישורים (לחיצה על שורת שידור)">' +
            typeOptsHtml +
          '</select>' +
        '</div>' +
      '</div>';

    _bindEvents(container);
  }

  function _bindEvents(container) {
    var toggle = container.querySelector('#sl-only-clicks-toggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        _state.onlyWithClicks = toggle.checked;
        if (_onChange) _onChange(_state);
      });
    }

    container.querySelectorAll('.date-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _state.days = parseInt(btn.getAttribute('data-days'), 10);
        _state.customFrom = null;
        _state.customTo   = null;
        render(container, _onChange);
        if (_onChange) _onChange(_state);
      });
    });

    var typeSelect = container.querySelector('#sl-link-type-select');
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        _state.linkTypeFilter = typeSelect.value;
        if (_onChange) _onChange(_state);
      });
    }
  }

  window.CrmShortLinksFilterBar = {
    render:           render,
    getState:         getState,
    getDateFrom:      getDateFrom,
    getPERTypes:      getPERTypes,
    getTemplateTypes: getTemplateTypes
  };
})();
