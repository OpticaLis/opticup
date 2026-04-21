/* =============================================================================
   crm-leads-tab.js — Leads tab: table + filters + bulk selection + filter chips
   View: v_crm_leads_with_tags. Kanban + cards are rendered by crm-leads-views.js.
   Depends on: shared.js (sb, getTenantId), CrmHelpers, crm-leads-detail.js,
               crm-leads-views.js (window.renderCrmLeadsKanban/Cards).
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _loadPromise = null;
  var _allLeads = [];
  var _filtered = [];
  var _currentPage = 1;
  var _selectedIds = new Set();

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
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">טוען לידים...</div>';
      _loadPromise = (async function () {
        await ensureCrmStatusCache();
        _allLeads = await loadLeads();
        populateFilters();
        wireEvents();
      })().catch(function (e) {
        _loadPromise = null;
        wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
        throw e;
      });
    }
    await _loadPromise;
    applyFiltersAndRender();
  }
  window.loadCrmLeadsTab = loadCrmLeadsTab;

  function populateFilters() {
    var statusSel = document.getElementById('crm-leads-filter-status');
    var langSel = document.getElementById('crm-leads-filter-lang');
    if (statusSel && statusSel.options.length <= 1) {
      var statuses = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
      Object.keys(statuses).forEach(function (slug) {
        var opt = document.createElement('option');
        opt.value = slug; opt.textContent = statuses[slug].name_he || slug;
        statusSel.appendChild(opt);
      });
    }
    if (langSel && langSel.options.length <= 1) {
      CrmHelpers.distinctValues(_allLeads, 'language').sort().forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code; opt.textContent = CrmHelpers.formatLanguage(code);
        langSel.appendChild(opt);
      });
    }
  }

  var _eventsWired = false;
  function wireEvents() {
    if (_eventsWired) return;
    _eventsWired = true;
    ['crm-leads-search', 'crm-leads-filter-status', 'crm-leads-filter-lang', 'crm-leads-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'crm-leads-search' ? 'input' : 'change', function () {
        _currentPage = 1;
        applyFiltersAndRender();
      });
    });
  }

  function applyFiltersAndRender() {
    var search       = (document.getElementById('crm-leads-search')       || {}).value || '';
    var statusFilter = (document.getElementById('crm-leads-filter-status')|| {}).value || '';
    var langFilter   = (document.getElementById('crm-leads-filter-lang')  || {}).value || '';
    var sortKey      = (document.getElementById('crm-leads-sort')         || {}).value || 'full_name';

    var s = search.trim().toLowerCase();
    _filtered = _allLeads.filter(function (r) {
      if (statusFilter && r.status !== statusFilter) return false;
      if (langFilter && r.language !== langFilter) return false;
      if (s) {
        var name = (r.full_name || '').toLowerCase();
        var phone = (r.phone || '').toLowerCase();
        if (name.indexOf(s) === -1 && phone.indexOf(s) === -1) return false;
      }
      return true;
    });

    _filtered.sort(function (a, b) {
      if (sortKey === 'created_at') return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      if (sortKey === 'status' || sortKey === 'phone') return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      return CrmHelpers.heCompare(a.full_name, b.full_name);
    });

    renderFilterChips({ search: search, status: statusFilter, lang: langFilter });
    renderLeadsTable();
    renderBulkBar();
    renderPagination();
    // Delegate to kanban + card-grid (lead-card) renderers in crm-leads-views.js
    if (typeof window.renderCrmLeadsKanban === 'function') window.renderCrmLeadsKanban(_filtered);
    if (typeof window.renderCrmLeadsCards  === 'function') window.renderCrmLeadsCards(_filtered);
  }

  // ---- Filter chips (§2.9) ----
  function renderFilterChips(filters) {
    var host = document.getElementById('crm-leads-filter-chips');
    if (!host) return;
    var chips = [];
    if (filters.search) chips.push({ key: 'search', label: 'חיפוש: ' + filters.search });
    if (filters.status) {
      var si = CrmHelpers.getStatusInfo('lead', filters.status);
      chips.push({ key: 'status', label: 'סטטוס: ' + si.label });
    }
    if (filters.lang) chips.push({ key: 'lang', label: 'שפה: ' + CrmHelpers.formatLanguage(filters.lang) });
    if (!chips.length) { host.innerHTML = ''; return; }
    host.innerHTML = chips.map(function (c) {
      return '<span class="crm-filter-chip" data-chip="' + c.key + '">' +
        escapeHtml(c.label) +
        '<span class="crm-chip-close" data-clear-chip="' + c.key + '">&times;</span>' +
      '</span> ';
    }).join('');
    host.querySelectorAll('[data-clear-chip]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-clear-chip');
        if (k === 'search') { var s = document.getElementById('crm-leads-search'); if (s) s.value = ''; }
        if (k === 'status') { var st = document.getElementById('crm-leads-filter-status'); if (st) st.value = ''; }
        if (k === 'lang')   { var l  = document.getElementById('crm-leads-filter-lang');   if (l)  l.value = ''; }
        _currentPage = 1; applyFiltersAndRender();
      });
    });
  }

  // ---- Bulk selection bar (§2.10) ----
  function renderBulkBar() {
    var host = document.getElementById('crm-leads-bulk-bar');
    if (!host) return;
    if (!_selectedIds.size) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="crm-bulk-bar">' +
      '<span class="crm-bulk-bar-count">' + _selectedIds.size + ' נבחרו</span>' +
      '<button type="button" data-bulk="whatsapp">WhatsApp</button>' +
      '<button type="button" data-bulk="sms">SMS</button>' +
      '<button type="button" data-bulk="status">שנה סטטוס</button>' +
      '<button type="button" data-bulk="clear">נקה בחירה</button>' +
    '</div>';
    host.querySelectorAll('button[data-bulk]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-bulk');
        if (act === 'clear') { _selectedIds.clear(); renderBulkBar(); renderLeadsTable(); return; }
        if (window.Toast) Toast.show('פעולה לאצווה: ' + act + ' (' + _selectedIds.size + ' לידים) — בקרוב');
      });
    });
  }

  // ---- Table with checkboxes + summary row (§2.10, §2.11) ----
  function renderLeadsTable() {
    var wrap = document.getElementById('crm-leads-table-wrap');
    if (!wrap) return;
    if (!_filtered.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">לא נמצאו לידים תואמים</div>';
      return;
    }
    var start = (_currentPage - 1) * PAGE_SIZE;
    var rows = _filtered.slice(start, start + PAGE_SIZE);
    var allChecked = rows.length && rows.every(function (r) { return _selectedIds.has(r.id); });

    var html = '<table class="crm-table"><thead><tr>' +
      '<th style="width:36px"><input type="checkbox" id="crm-leads-check-all"' + (allChecked ? ' checked' : '') + '></th>' +
      '<th>שם מלא</th><th>טלפון</th><th>סטטוס</th><th>שפה</th><th>תגים</th><th>נוצר</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var checked = _selectedIds.has(r.id);
      html += '<tr data-lead-id="' + escapeHtml(r.id) + '">' +
        '<td><input type="checkbox" data-check-lead="' + escapeHtml(r.id) + '"' + (checked ? ' checked' : '') + '></td>' +
        '<td>' + escapeHtml(r.full_name || '') + '</td>' +
        '<td style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('lead', r.status) + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatLanguage(r.language)) + '</td>' +
        '<td>' + renderTagPillsHtml(r.tag_names) + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatDate(r.created_at)) + '</td>' +
      '</tr>';
    });
    html += '</tbody><tfoot><tr class="crm-summary-row">' +
      '<td colspan="6">סה"כ</td>' +
      '<td style="text-align:end">' + _filtered.length + ' לידים</td>' +
    '</tr></tfoot></table>';
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
      return '<span class="crm-tag-pill">' + escapeHtml(n) + '</span>';
    }).join('');
  }

  function renderPagination() {
    var box = document.getElementById('crm-leads-pagination');
    if (!box) return;
    var total = _filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_currentPage > totalPages) _currentPage = totalPages;
    if (totalPages <= 1) { box.innerHTML = '<span class="crm-page-info">סה"כ ' + total + ' לידים</span>'; return; }

    var html = '<button ' + (_currentPage === 1 ? 'disabled' : '') + ' data-page="prev">&rsaquo;</button>';
    var pages = [1];
    for (var i = Math.max(2, _currentPage - 1); i <= Math.min(totalPages - 1, _currentPage + 1); i++) pages.push(i);
    if (totalPages > 1) pages.push(totalPages);
    pages = Array.from(new Set(pages)).sort(function (a, b) { return a - b; });
    var prev = 0;
    pages.forEach(function (p) {
      if (p - prev > 1) html += '<span class="crm-page-info">…</span>';
      html += '<button data-page="' + p + '"' + (p === _currentPage ? ' class="active"' : '') + '>' + p + '</button>';
      prev = p;
    });
    html += '<button ' + (_currentPage === totalPages ? 'disabled' : '') + ' data-page="next">&lsaquo;</button>';
    html += '<span class="crm-page-info">עמוד ' + _currentPage + ' מתוך ' + totalPages + ' · סה"כ ' + total + '</span>';
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
