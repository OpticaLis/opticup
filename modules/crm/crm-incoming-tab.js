/* =============================================================================
   crm-incoming-tab.js — Incoming Leads (Tier 1) tab
   Fetches leads with Tier 1 statuses (new, invalid_phone, too_far, no_answer, callback)
   Renders table with name, phone, email, status, date, source, UTMs.
   Status filter + search functionality.
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _loadPromise = null;
  var _allLeads = [];
  var _filtered = [];
  var _currentPage = 1;
  var _lastNotesMap = {};

  // Tailwind class constants
  var CLS_TABLE       = 'w-full text-sm bg-white';
  var CLS_TH          = 'px-4 py-3 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD          = 'px-4 py-3 text-slate-800';
  var CLS_ROW_ODD     = 'hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 transition-colors bg-white';
  var CLS_ROW_EVEN    = 'hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 transition-colors bg-slate-50/60';

  async function loadIncomingLeads() {
    var tid = getTenantId();
    var q = sb.from('v_crm_leads_with_tags')
      .select('id, full_name, phone, email, city, language, status, source, client_notes, terms_approved, marketing_consent, unsubscribed_at, created_at, updated_at, tag_names, tag_colors, utm_source, utm_medium, utm_campaign, utm_content, utm_term, monday_item_id')
      .eq('is_deleted', false);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('created_at', { ascending: false });
    var res = await q;
    if (res.error) throw new Error('Incoming leads load failed: ' + res.error.message);
    var tier1Statuses = (typeof TIER1_STATUSES !== 'undefined') ? TIER1_STATUSES : [];
    return (res.data || []).filter(function (r) {
      return tier1Statuses.indexOf(r.status) !== -1;
    });
  }

  async function loadCrmIncomingTab() {
    var wrap = document.getElementById('crm-incoming-table-wrap');
    if (!wrap) return;
    if (!_loadPromise) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">טוען לידים נכנסים...</div>';
      _loadPromise = (async function () {
        await ensureCrmStatusCache();
        _allLeads = await loadIncomingLeads();
        if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
        renderIncomingAdvancedBar();
        wireIncomingEvents();
      })().catch(function (e) {
        _loadPromise = null;
        wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
        throw e;
      });
    }
    await _loadPromise;
    applyIncomingFilters();
  }
  window.loadCrmIncomingTab = loadCrmIncomingTab;

  function renderIncomingAdvancedBar() {
    var host = document.getElementById('crm-incoming-advanced-filters');
    if (!host || !window.CrmLeadFilters) return;
    CrmLeadFilters.renderAdvancedBar(host, {
      key: 'incoming',
      statuses: (typeof TIER1_STATUSES !== 'undefined') ? TIER1_STATUSES : [],
      leads: _allLeads,
      showLanguage: false,
      onChange: function () {
        _currentPage = 1;
        applyIncomingFilters();
      }
    });
  }

  var _eventsWired = false;
  function wireIncomingEvents() {
    if (_eventsWired) return;
    _eventsWired = true;
    var searchEl = document.getElementById('crm-incoming-search');
    var addBtn = document.getElementById('crm-add-lead-btn');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _currentPage = 1;
        applyIncomingFilters();
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (window.CrmLeadActions && typeof CrmLeadActions.openCreateLeadModal === 'function') {
          CrmLeadActions.openCreateLeadModal(function () { reloadCrmIncomingTab(); });
        }
      });
    }
  }

  function applyIncomingFilters() {
    var incomingSearch = (document.getElementById('crm-incoming-search') || {}).value || '';
    var q = incomingSearch.trim().toLowerCase();

    var tier1Statuses = (typeof TIER1_STATUSES !== 'undefined') ? TIER1_STATUSES : [];
    var state = window.CrmLeadFilters ? CrmLeadFilters.getState('incoming') : { statuses: [], fromDate: '', toDate: '', noResp48: false, source: '', language: '' };
    var afterAdv = window.CrmLeadFilters
      ? CrmLeadFilters.applyFilters(_allLeads, tier1Statuses, _lastNotesMap, state)
      : _allLeads;

    _filtered = afterAdv.filter(function (r) {
      if (!q) return true;
      var leadName = (r.full_name || '').toLowerCase();
      var leadPhone = (r.phone || '').toLowerCase();
      var leadEmail = (r.email || '').toLowerCase();
      return leadName.indexOf(q) !== -1 || leadPhone.indexOf(q) !== -1 || leadEmail.indexOf(q) !== -1;
    });

    renderIncomingChips(incomingSearch, state);
    renderIncomingTable();
    updateCount();
  }

  function renderIncomingChips(search, state) {
    var host = document.getElementById('crm-incoming-filter-chips');
    if (!host) return;
    var chips = [];
    if (search) chips.push({ k: 'search', label: 'חיפוש: ' + search });
    if (window.CrmLeadFilters) chips = chips.concat(CrmLeadFilters.renderChips(state));
    if (!chips.length) { host.innerHTML = ''; return; }
    host.className = 'flex items-center gap-2 flex-wrap mb-3';
    host.innerHTML = '<span class="text-xs font-semibold text-slate-600">פילטרים פעילים:</span>' + chips.map(function (c) {
      return '<span class="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium" data-chip="' + c.k + '">' +
        escapeHtml(c.label) +
        '<span class="cursor-pointer font-bold opacity-70 hover:opacity-100 text-base leading-none" data-clear-chip="' + c.k + '">×</span>' +
      '</span>';
    }).join('');
    host.querySelectorAll('[data-clear-chip]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-clear-chip');
        if (k === 'search') {
          var sEl = document.getElementById('crm-incoming-search');
          if (sEl) sEl.value = '';
        } else if (window.CrmLeadFilters) {
          var s = CrmLeadFilters.getState('incoming');
          if (k === 'statuses') s.statuses = [];
          else if (k === 'dates') { s.fromDate = ''; s.toDate = ''; }
          else if (k === '48h') s.noResp48 = false;
          else if (k === 'source') s.source = '';
          renderIncomingAdvancedBar();
        }
        _currentPage = 1; applyIncomingFilters();
      });
    });
  }

  function updateCount() {
    var countEl = document.getElementById('crm-incoming-count');
    if (countEl) {
      countEl.textContent = _filtered.length + ' לידים';
    }
  }

  function renderIncomingTable() {
    var wrap = document.getElementById('crm-incoming-table-wrap');
    if (!wrap) return;
    if (_filtered.length === 0) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין לידים נכנסים</div>';
      return;
    }
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">שם</th>' +
      '<th class="' + CLS_TH + '">טלפון</th>' +
      '<th class="' + CLS_TH + '">אימייל</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">תאריך</th>' +
      '<th class="' + CLS_TH + '">מקור</th>' +
      '<th class="' + CLS_TH + '">UTM Campaign</th>' +
      '<th class="' + CLS_TH + ' w-28">פעולה</th>' +
      '</tr></thead><tbody>';

    _filtered.forEach(function (r, idx) {
      var rowClass = idx % 2 === 0 ? CLS_ROW_ODD : CLS_ROW_EVEN;
      var statusInfo = CrmHelpers.getStatusInfo('lead', r.status);
      html += '<tr class="' + rowClass + '" data-lead-id="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.full_name || '') + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(CrmHelpers.formatPhone(r.phone) || '') + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.email || '') + '</td>' +
        '<td class="' + CLS_TD + '"><span class="crm-badge" style="background:' + escapeHtml(statusInfo.color) + '">' +
          escapeHtml(statusInfo.label) + '</span></td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(CrmHelpers.formatDateTime(r.created_at) || '') + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.source || '—') + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(r.utm_campaign || '—') + '</td>' +
        '<td class="' + CLS_TD + '">' +
          '<button type="button" data-approve-lead="' + escapeHtml(r.id) + '" class="px-3 py-1.5 bg-emerald-500 text-white rounded-md text-xs font-semibold hover:bg-emerald-600 transition">אשר ✓</button>' +
        '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
    wireIncomingRowActions(wrap);
  }

  function wireIncomingRowActions(wrap) {
    wrap.querySelectorAll('button[data-approve-lead]').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        if (!window.CrmLeadActions) return;
        var id = btn.getAttribute('data-approve-lead');
        btn.disabled = true;
        var oldText = btn.textContent;
        btn.textContent = 'מעביר...';
        try {
          var res = await CrmLeadActions.transferLeadToTier2(id);
          if (res && res.blocked) {
            btn.disabled = false;
            btn.textContent = oldText;
            return;
          }
          var leadRow = _allLeads.find(function (x) { return x.id === id; }) || {};
          try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.move_to_registered', entity_type: 'crm_leads', entity_id: id, details: { full_name: leadRow.full_name, phone: leadRow.phone } }); } catch (_) {}
          if (window.Toast) Toast.success('הליד אושר והועבר ל-Tier 2');
          await reloadCrmIncomingTab();
          if (typeof window.reloadCrmLeadsTab === 'function') window.reloadCrmLeadsTab();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = oldText;
          if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
        }
      });
    });
    wrap.querySelectorAll('tr[data-lead-id]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        var id = tr.getAttribute('data-lead-id');
        if (typeof openCrmLeadDetail === 'function') openCrmLeadDetail(id);
      });
    });
  }

  async function reloadCrmIncomingTab() {
    _allLeads = await loadIncomingLeads();
    if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
    renderIncomingAdvancedBar();
    applyIncomingFilters();
  }
  window.reloadCrmIncomingTab = reloadCrmIncomingTab;

  window.getCrmIncomingLeadById = function (id) {
    return _allLeads.find(function (r) { return r.id === id; }) || null;
  };
})();
