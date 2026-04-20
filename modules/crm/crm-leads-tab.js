/* =============================================================================
   crm-leads-tab.js — Leads tab (list + filter + sort + pagination)
   View: v_crm_leads_with_tags
   Depends on: shared.js (sb, getTenantId), CrmHelpers, crm-leads-detail.js
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _loadPromise = null;
  var _allLeads = [];
  var _filtered = [];
  var _currentPage = 1;

  // ---- Load all leads once per page lifetime ----
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

  // ---- Tab entrypoint (called from showCrmTab) ----
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

  // ---- Populate status + language filter dropdowns (once) ----
  function populateFilters() {
    var statusSel = document.getElementById('crm-leads-filter-status');
    var langSel = document.getElementById('crm-leads-filter-lang');
    if (statusSel && statusSel.options.length <= 1) {
      var statuses = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
      Object.keys(statuses).forEach(function (slug) {
        var opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = statuses[slug].name_he || slug;
        statusSel.appendChild(opt);
      });
    }
    if (langSel && langSel.options.length <= 1) {
      var langs = CrmHelpers.distinctValues(_allLeads, 'language');
      langs.sort().forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = CrmHelpers.formatLanguage(code);
        langSel.appendChild(opt);
      });
    }
  }

  // ---- Wire filter/sort/search events (once) ----
  var _eventsWired = false;
  function wireEvents() {
    if (_eventsWired) return;
    _eventsWired = true;
    var ids = ['crm-leads-search', 'crm-leads-filter-status', 'crm-leads-filter-lang', 'crm-leads-sort'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'crm-leads-search' ? 'input' : 'change', function () {
        _currentPage = 1;
        applyFiltersAndRender();
      });
    });
  }

  // ---- Apply filter + sort in-memory, render page ----
  function applyFiltersAndRender() {
    var search = (document.getElementById('crm-leads-search') || {}).value || '';
    var statusFilter = (document.getElementById('crm-leads-filter-status') || {}).value || '';
    var langFilter = (document.getElementById('crm-leads-filter-lang') || {}).value || '';
    var sortKey = (document.getElementById('crm-leads-sort') || {}).value || 'full_name';

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
      if (sortKey === 'created_at') {
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      }
      if (sortKey === 'status' || sortKey === 'phone') {
        return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      }
      return CrmHelpers.heCompare(a.full_name, b.full_name);
    });

    renderLeadsTable();
    renderPagination();
  }

  // ---- Render table (current page only) ----
  function renderLeadsTable() {
    var wrap = document.getElementById('crm-leads-table-wrap');
    if (!wrap) return;
    if (!_filtered.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">לא נמצאו לידים תואמים</div>';
      return;
    }

    var start = (_currentPage - 1) * PAGE_SIZE;
    var rows = _filtered.slice(start, start + PAGE_SIZE);

    var html = '<table class="crm-table"><thead><tr>' +
      '<th>שם מלא</th><th>טלפון</th><th>סטטוס</th><th>שפה</th><th>תגים</th><th>נוצר</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr data-lead-id="' + escapeHtml(r.id) + '">' +
        '<td>' + escapeHtml(r.full_name || '') + '</td>' +
        '<td style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('lead', r.status) + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatLanguage(r.language)) + '</td>' +
        '<td>' + renderTagsHtml(r.tag_names, r.tag_colors) + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatDate(r.created_at)) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    // Row click -> detail modal (delegated)
    wrap.querySelectorAll('tr[data-lead-id]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.getAttribute('data-lead-id');
        if (typeof openCrmLeadDetail === 'function') openCrmLeadDetail(id);
      });
    });
  }

  function renderTagsHtml(names, colors) {
    if (!Array.isArray(names) || !names.length) return '';
    return names.map(function (n, i) {
      var color = (Array.isArray(colors) && colors[i]) ? colors[i] : '#e5e7eb';
      return '<span class="crm-tag-chip" style="background:' + escapeHtml(color) + ';color:#fff">' +
        escapeHtml(n) + '</span>';
    }).join('');
  }

  // ---- Pagination controls ----
  function renderPagination() {
    var box = document.getElementById('crm-leads-pagination');
    if (!box) return;
    var total = _filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_currentPage > totalPages) _currentPage = totalPages;

    if (totalPages <= 1) {
      box.innerHTML = '<span class="crm-page-info">סה"כ ' + total + ' לידים</span>';
      return;
    }

    var html = '';
    html += '<button ' + (_currentPage === 1 ? 'disabled' : '') + ' data-page="prev">&rsaquo;</button>';

    // Compact page list: 1 ... p-1 p p+1 ... last
    var pages = [];
    pages.push(1);
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
        var totalPages = Math.max(1, Math.ceil(_filtered.length / PAGE_SIZE));
        if (v === 'prev') _currentPage = Math.max(1, _currentPage - 1);
        else if (v === 'next') _currentPage = Math.min(totalPages, _currentPage + 1);
        else _currentPage = parseInt(v, 10) || 1;
        renderLeadsTable();
        renderPagination();
        var main = document.getElementById('crm-main');
        if (main) main.scrollTop = 0;
      });
    });
  }

  // Expose the in-memory lead cache so the detail modal can avoid re-fetching.
  window.getCrmLeadById = function (id) {
    return _allLeads.find(function (r) { return r.id === id; }) || null;
  };
})();
