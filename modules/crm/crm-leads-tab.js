/* =============================================================================
   crm-leads-tab.js — Leads tab (B8 Tailwind rewrite — FINAL-02)
   Table + filter chips + bulk bar + pagination. View: v_crm_leads_with_tags.
   Kanban + cards rendered by crm-leads-views.js.
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _loadPromise = null;
  var _allLeads = [];
  var _filtered = [];
  var _currentPage = 1;
  var _selectedIds = new Set();
  var _lastNotesMap = {};

  // Tailwind class constants (§10.6)
  var CLS_TABLE       = 'w-full text-sm bg-white';
  var CLS_TH          = 'px-4 py-3 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD          = 'px-4 py-3 text-slate-800';
  var CLS_ROW_ODD     = 'hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 transition-colors bg-white';
  var CLS_ROW_EVEN    = 'hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 transition-colors bg-slate-50/60';
  var CLS_CHIP        = 'inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium';
  var CLS_CHIP_CLOSE  = 'cursor-pointer font-bold opacity-70 hover:opacity-100 text-base leading-none';
  var CLS_TAG_PILL    = 'inline-block text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-1';
  var CLS_BULK_BAR    = 'bg-indigo-100 text-indigo-800 px-4 py-3 rounded-lg flex items-center gap-3 mb-3 text-sm font-medium';
  var CLS_BULK_BTN    = 'px-3 py-1.5 bg-white text-indigo-700 rounded-md hover:bg-indigo-50 font-medium text-sm transition';
  var CLS_PAGE_BTN    = 'px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed';
  var CLS_PAGE_ACTIVE = 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold';

  async function loadLeads() {
    var tid = getTenantId();
    var q = sb.from('v_crm_leads_with_tags')
      .select('id, full_name, phone, email, city, language, status, source, client_notes, terms_approved, marketing_consent, unsubscribed_at, created_at, updated_at, tag_names, tag_colors, utm_source, utm_campaign, monday_item_id')
      .eq('is_deleted', false);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('full_name');
    var res = await q;
    if (res.error) throw new Error('Leads load failed: ' + res.error.message);
    return res.data || [];
  }

  async function loadCrmLeadsTab() {
    var wrap = document.getElementById('crm-leads-table-wrap');
    if (!wrap) return;
    if (!_loadPromise) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">טוען לידים...</div>';
      _loadPromise = (async function () {
        await ensureCrmStatusCache();
        _allLeads = await loadLeads();
        if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
        renderAdvancedFilterBar();
        wireEvents();
      })().catch(function (e) {
        _loadPromise = null;
        wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
        throw e;
      });
    }
    await _loadPromise;
    applyFiltersAndRender();
  }
  window.loadCrmLeadsTab = loadCrmLeadsTab;

  function renderAdvancedFilterBar() {
    var host = document.getElementById('crm-leads-advanced-filters');
    if (!host || !window.CrmLeadFilters) return;
    CrmLeadFilters.renderAdvancedBar(host, {
      key: 'registered',
      statuses: (typeof TIER2_STATUSES !== 'undefined') ? TIER2_STATUSES : [],
      leads: _allLeads,
      showLanguage: true,
      onChange: function () {
        _currentPage = 1;
        applyFiltersAndRender();
      }
    });
  }

  var _eventsWired = false;
  function wireEvents() {
    if (_eventsWired) return;
    _eventsWired = true;
    var searchEl = document.getElementById('crm-leads-search');
    if (searchEl) searchEl.addEventListener('input', function () { _currentPage = 1; applyFiltersAndRender(); });
    var sortEl = document.getElementById('crm-leads-sort');
    if (sortEl) sortEl.addEventListener('change', function () { _currentPage = 1; applyFiltersAndRender(); });
  }

  function applyFiltersAndRender() {
    var search  = (document.getElementById('crm-leads-search') || {}).value || '';
    var sortKey = (document.getElementById('crm-leads-sort')   || {}).value || 'full_name';

    var tier2Statuses = (typeof TIER2_STATUSES !== 'undefined') ? TIER2_STATUSES : [];
    var state = window.CrmLeadFilters ? CrmLeadFilters.getState('registered') : { statuses: [], fromDate: '', toDate: '', noResp48: false, source: '', language: '' };
    var afterAdv = window.CrmLeadFilters
      ? CrmLeadFilters.applyFilters(_allLeads, tier2Statuses, _lastNotesMap, state)
      : _allLeads.filter(function (r) { return tier2Statuses.indexOf(r.status) !== -1; });

    var s = search.trim().toLowerCase();
    _filtered = afterAdv.filter(function (r) {
      if (!s) return true;
      var name = (r.full_name || '').toLowerCase();
      var phone = (r.phone || '').toLowerCase();
      var email = (r.email || '').toLowerCase();
      return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1 || email.indexOf(s) !== -1;
    });

    _filtered.sort(function (a, b) {
      if (sortKey === 'created_at') return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      if (sortKey === 'status' || sortKey === 'phone') return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      return CrmHelpers.heCompare(a.full_name, b.full_name);
    });

    renderFilterChips(search, state);
    renderLeadsTable();
    renderBulkBar();
    renderPagination();
    if (typeof window.renderCrmLeadsKanban === 'function') window.renderCrmLeadsKanban(_filtered);
    if (typeof window.renderCrmLeadsCards  === 'function') window.renderCrmLeadsCards(_filtered);
  }

  function renderFilterChips(search, state) {
    var host = document.getElementById('crm-leads-filter-chips');
    if (!host) return;
    var chips = [];
    if (search) chips.push({ k: 'search', label: 'חיפוש: ' + search });
    if (window.CrmLeadFilters) chips = chips.concat(CrmLeadFilters.renderChips(state));
    if (!chips.length) { host.innerHTML = ''; return; }
    host.className = 'flex items-center gap-2 flex-wrap mb-3';
    host.innerHTML = '<span class="text-xs font-semibold text-slate-600">פילטרים פעילים:</span>' + chips.map(function (c) {
      return '<span class="' + CLS_CHIP + '" data-chip="' + c.k + '">' +
        escapeHtml(c.label) +
        '<span class="' + CLS_CHIP_CLOSE + '" data-clear-chip="' + c.k + '">×</span>' +
      '</span>';
    }).join('');
    host.querySelectorAll('[data-clear-chip]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-clear-chip');
        if (k === 'search') {
          var sEl = document.getElementById('crm-leads-search');
          if (sEl) sEl.value = '';
        } else if (window.CrmLeadFilters) {
          var s = CrmLeadFilters.getState('registered');
          if (k === 'statuses') s.statuses = [];
          else if (k === 'dates') { s.fromDate = ''; s.toDate = ''; }
          else if (k === '48h') s.noResp48 = false;
          else if (k === 'source') s.source = '';
          else if (k === 'lang') s.language = '';
          renderAdvancedFilterBar();
        }
        _currentPage = 1; applyFiltersAndRender();
      });
    });
  }

  // ---- Bulk selection bar ----
  function renderBulkBar() {
    var host = document.getElementById('crm-leads-bulk-bar');
    if (!host) return;
    if (!_selectedIds.size) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="' + CLS_BULK_BAR + '">' +
      '<span class="font-bold">' + _selectedIds.size + ' נבחרו</span>' +
      '<div class="flex-1"></div>' +
      '<button type="button" class="' + CLS_BULK_BTN + '" data-bulk="whatsapp">WhatsApp</button>' +
      '<button type="button" class="' + CLS_BULK_BTN + '" data-bulk="sms">SMS</button>' +
      '<button type="button" class="' + CLS_BULK_BTN + '" data-bulk="status">שנה סטטוס</button>' +
      '<button type="button" class="' + CLS_BULK_BTN + '" data-bulk="clear">נקה בחירה</button>' +
    '</div>';
    host.querySelectorAll('button[data-bulk]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-bulk');
        if (act === 'clear') { _selectedIds.clear(); renderBulkBar(); renderLeadsTable(); return; }
        if (act === 'status' && window.CrmLeadActions) {
          var ids = Array.from(_selectedIds);
          CrmLeadActions.openBulkStatusPicker(ids, 2, function () {
            try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.bulk_status_change', entity_type: 'crm_leads', entity_id: null, details: { count: ids.length, ids: ids.slice(0, 20) } }); } catch (_) {}
            _selectedIds.clear();
            reloadCrmLeadsTab();
          });
          return;
        }
        if (window.Toast) Toast.show('פעולה לאצווה: ' + act + ' (' + _selectedIds.size + ' לידים) — בקרוב');
      });
    });
  }

  async function reloadCrmLeadsTab() {
    _allLeads = await loadLeads();
    if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
    renderAdvancedFilterBar();
    applyFiltersAndRender();
  }
  window.reloadCrmLeadsTab = reloadCrmLeadsTab;

  // ---- Table ----
  function renderLeadsTable() {
    var wrap = document.getElementById('crm-leads-table-wrap');
    if (!wrap) return;
    if (!_filtered.length) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-10 bg-white rounded-lg border border-slate-200">לא נמצאו לידים תואמים</div>';
      return;
    }
    var start = (_currentPage - 1) * PAGE_SIZE;
    var rows = _filtered.slice(start, start + PAGE_SIZE);
    var allChecked = rows.length && rows.every(function (r) { return _selectedIds.has(r.id); });

    var html = '<div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">' +
      '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + ' w-10"><input type="checkbox" id="crm-leads-check-all" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"' + (allChecked ? ' checked' : '') + '></th>' +
      '<th class="' + CLS_TH + '">שם מלא</th>' +
      '<th class="' + CLS_TH + '">טלפון</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">שפה</th>' +
      '<th class="' + CLS_TH + '">תגיות</th>' +
      '<th class="' + CLS_TH + '">נוצר</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r, idx) {
      var checked = _selectedIds.has(r.id);
      var rowCls = idx % 2 === 0 ? CLS_ROW_ODD : CLS_ROW_EVEN;
      html += '<tr class="' + rowCls + '" data-lead-id="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + '"><input type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" data-check-lead="' + escapeHtml(r.id) + '"' + (checked ? ' checked' : '') + '></td>' +
        '<td class="' + CLS_TD + ' font-medium text-slate-900">' + escapeHtml(r.full_name || '') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td class="' + CLS_TD + '">' + CrmHelpers.statusBadgeHtml('lead', r.status) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(CrmHelpers.formatLanguage(r.language)) + '</td>' +
        '<td class="' + CLS_TD + '">' + renderTagPillsHtml(r.tag_names) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-500 text-xs">' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</td>' +
      '</tr>';
    });
    html += '</tbody><tfoot><tr class="bg-slate-50 font-semibold">' +
      '<td class="' + CLS_TD + '" colspan="6">סה״כ</td>' +
      '<td class="' + CLS_TD + ' text-end text-indigo-700">' + _filtered.length + ' לידים</td>' +
    '</tr></tfoot></table></div>';
    wrap.innerHTML = html;

    var checkAll = document.getElementById('crm-leads-check-all');
    if (checkAll) checkAll.addEventListener('change', function () {
      rows.forEach(function (r) {
        if (checkAll.checked) _selectedIds.add(r.id); else _selectedIds.delete(r.id);
      });
      renderLeadsTable(); renderBulkBar();
    });
    wrap.querySelectorAll('input[data-check-lead]').forEach(function (cb) {
      cb.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = cb.getAttribute('data-check-lead');
        if (cb.checked) _selectedIds.add(id); else _selectedIds.delete(id);
        renderBulkBar();
      });
    });
    wrap.querySelectorAll('tr[data-lead-id]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT') return;
        var id = tr.getAttribute('data-lead-id');
        if (typeof openCrmLeadDetail === 'function') openCrmLeadDetail(id);
      });
    });
  }

  function renderTagPillsHtml(names) {
    if (!Array.isArray(names) || !names.length) return '';
    return names.slice(0, 3).map(function (n) {
      return '<span class="' + CLS_TAG_PILL + '">' + escapeHtml(n) + '</span>';
    }).join('');
  }

  function renderPagination() {
    var box = document.getElementById('crm-leads-pagination');
    if (!box) return;
    var total = _filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_currentPage > totalPages) _currentPage = totalPages;
    box.className = 'flex items-center gap-2 flex-wrap mt-4';
    if (totalPages <= 1) { box.innerHTML = '<span class="text-sm text-slate-500">סה״כ ' + total + ' לידים</span>'; return; }

    var html = '<button class="' + CLS_PAGE_BTN + '" ' + (_currentPage === 1 ? 'disabled' : '') + ' data-page="prev">›</button>';
    var pages = [1];
    for (var i = Math.max(2, _currentPage - 1); i <= Math.min(totalPages - 1, _currentPage + 1); i++) pages.push(i);
    if (totalPages > 1) pages.push(totalPages);
    pages = Array.from(new Set(pages)).sort(function (a, b) { return a - b; });
    var prev = 0;
    pages.forEach(function (p) {
      if (p - prev > 1) html += '<span class="text-slate-400 px-1">…</span>';
      html += '<button class="' + (p === _currentPage ? CLS_PAGE_ACTIVE : CLS_PAGE_BTN) + '" data-page="' + p + '">' + p + '</button>';
      prev = p;
    });
    html += '<button class="' + CLS_PAGE_BTN + '" ' + (_currentPage === totalPages ? 'disabled' : '') + ' data-page="next">‹</button>';
    html += '<span class="text-sm text-slate-500 ms-2">עמוד ' + _currentPage + ' מתוך ' + totalPages + ' · סה״כ ' + total + '</span>';
    box.innerHTML = html;
    box.querySelectorAll('button[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-page');
        if (v === 'prev') _currentPage = Math.max(1, _currentPage - 1);
        else if (v === 'next') _currentPage = Math.min(totalPages, _currentPage + 1);
        else _currentPage = parseInt(v, 10) || 1;
        renderLeadsTable(); renderPagination();
        var main = document.getElementById('crm-main');
        if (main) main.scrollTop = 0;
      });
    });
  }

  window.getCrmLeadById = function (id) {
    return _allLeads.find(function (r) { return r.id === id; }) || null;
  };
})();
