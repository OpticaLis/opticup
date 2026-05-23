/* ============================================================
   M5 Customer List — Phase E boot + state + render.
   Source: v_customer_for_exam (composite display + health_fund_name +
   first/last/full + birth_date) + v_customer_full (lifecycle_stage join).
   List mode entry: customers.html?t=<slug> (no customer_id).
   ============================================================ */
(function () {
  'use strict';

  var PAGE_SIZE = 50;

  var state = {
    rows: [],              // current page — merged v_customer_for_exam + v_customer_full
    lifecycleById: {},     // map id → lifecycle_stage
    activePillId: 'all',
    searchQuery: '',
    page: 0,
    totalCount: null,
    countsByPill: {},
    branches: [],
    activeColumns: null    // per-tenant chosen list_columns (loaded by loadTenantListColumns)
  };

  function trace(ev, payload) {
    try { (window.__cardTrace || (window.__cardTrace = [])).push(Object.assign({ event: ev, t: Date.now() }, payload || {})); } catch (_) {}
  }

  function initials(fullName, firstName, lastName) {
    var src = (firstName ? firstName.charAt(0) : '') + (lastName ? lastName.charAt(0) : '');
    if (src) return src;
    if (fullName) return String(fullName).trim().split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('');
    return '?';
  }

  function ageFrom(bd) {
    if (!bd) return null;
    var d = new Date(bd);
    if (isNaN(d.getTime())) return null;
    var n = new Date();
    var a = n.getFullYear() - d.getFullYear();
    var m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
    return a;
  }

  function lifecyclePillForRow(r) {
    var ls = state.lifecycleById[r.id];
    if (ls === 'lead')    return '<span class="cust-pill cust-pill-amber">ליד</span>';
    if (ls === 'active')  return '<span class="cust-pill cust-pill-teal">פעיל</span>';
    if (ls === 'dormant') return '<span class="cust-pill cust-pill-gray">לא פעיל</span>';
    if (ls === 'prospect') return '<span class="cust-pill cust-pill-navy">פוטנציאל</span>';
    return '';
  }

  // Per-column cell renderer — keyed by column.render (from CUSTOMER_LIST_COLUMNS).
  function renderCell(renderKey, r) {
    if (renderKey === 'name') {
      var pill = lifecyclePillForRow(r);
      var numDisplay = r.customer_number_display || (r.customer_number != null ? '#' + r.customer_number : '—');
      return '<div class="cust-list-cell cust-list-name">' +
               '<div class="nm">' + escapeHtml(r.full_name || '—') + ' ' + pill + '</div>' +
               '<div class="sub">' + escapeHtml(numDisplay) + '</div>' +
             '</div>';
    }
    if (renderKey === 'phone')              return '<div class="cust-list-cell cust-list-num">' + escapeHtml(r.phone || '—') + '</div>';
    if (renderKey === 'phone_secondary')    return '<div class="cust-list-cell cust-list-num">' + escapeHtml(r.phone_secondary || '—') + '</div>';
    if (renderKey === 'email')              return '<div class="cust-list-cell">' + escapeHtml(r.email || '—') + '</div>';
    if (renderKey === 'city')               return '<div class="cust-list-cell">' + escapeHtml(r.city || '—') + '</div>';
    if (renderKey === 'id_number')          return '<div class="cust-list-cell cust-list-num">' + escapeHtml(r.id_number || '—') + '</div>';
    if (renderKey === 'source')             return '<div class="cust-list-cell">' + escapeHtml(r.source || '—') + '</div>';
    if (renderKey === 'lifecycle')          return '<div class="cust-list-cell">' + lifecyclePillForRow(r) + '</div>';
    if (renderKey === 'customer_number_display') {
      var nd = r.customer_number_display || (r.customer_number != null ? '#' + r.customer_number : '—');
      return '<div class="cust-list-cell cust-list-num">' + escapeHtml(nd) + '</div>';
    }
    if (renderKey === 'health_fund_name')   return '<div class="cust-list-cell">' + escapeHtml(r.health_fund_name || '—') + '</div>';
    if (renderKey === 'created_at') {
      var s = r.created_at ? new Date(r.created_at).toLocaleDateString('he-IL') : '—';
      return '<div class="cust-list-cell">' + escapeHtml(s) + '</div>';
    }
    return '<div class="cust-list-cell">—</div>';
  }

  function rowHtml(r) {
    var ini = initials(r.full_name, r.first_name, r.last_name);
    var activeCols = state.activeColumns || window.DEFAULT_LIST_COLUMNS || ['name', 'phone', 'city', 'health_fund'];
    var cells = activeCols.map(function (id) {
      var col = (window.CUSTOMER_LIST_COLUMNS || []).find(function (c) { return c.id === id; });
      if (!col || !col.wired) return '';
      return renderCell(col.render, r);
    }).join('');
    return '<div class="cust-list-row" data-customer-id="' + escapeHtml(r.id) + '" tabindex="0">' +
             '<div class="cust-list-av">' + escapeHtml(ini) + '</div>' +
             cells +
             '<div class="cust-list-actions">' +
               '<button class="cust-list-open" data-customer-id="' + escapeHtml(r.id) + '">פתח כרטיס</button>' +
             '</div>' +
           '</div>';
  }

  function computeCountsByPill(rows) {
    var c = { all: rows.length, active: 0, leads: 0 };
    rows.forEach(function (r) {
      var ls = state.lifecycleById[r.id];
      if (ls === 'active') c.active++;
      if (ls === 'lead')   c.leads++;
    });
    return c;
  }

  function renderToolbar() {
    return '<div class="cust-list-toolbar">' +
             '<span class="cust-list-search-ic">🔍</span>' +
             '<input class="cust-list-search" placeholder="חיפוש לקוח: שם · טלפון · ת.ז · מספר-לקוח" value="' + escapeHtml(state.searchQuery) + '">' +
             '<button class="cust-list-tb-btn" data-coming-soon="customer_list_barcode_scan">📷 סריקת ברקוד</button>' +
             '<button class="cust-list-tb-btn" data-coming-soon="customer_list_advanced_search">⚙️ חיפוש מתקדם</button>' +
             '<button class="cust-list-tb-btn" id="cust-colpick-btn">⚙ עמודות</button>' +
             '<button class="cust-list-new" id="cust-new-customer-btn">+ לקוח חדש</button>' +
           '</div>';
  }

  function renderHeader(visibleRows) {
    var sortLabel = 'ממוין לפי: שם';
    var total = state.totalCount != null ? state.totalCount : visibleRows.length;
    return '<div class="cust-list-resHdr">' +
             '<span>' + escapeHtml(String(total)) + ' לקוחות · ' + escapeHtml(sortLabel) + '</span>' +
             '<span><button class="cust-list-tb-btn" data-coming-soon="customer_list_export">📤 ייצוא Excel</button></span>' +
           '</div>';
  }

  function renderEmpty() {
    return '<div class="cust-stub-panel" style="padding:32px;"><h3>אין לקוחות לסינון הנוכחי</h3>' +
             '<p>נסה לנקות את החיפוש או לבחור פילטר אחר.</p></div>';
  }

  function computeVisible() {
    var rows = state.rows;
    rows = window.applyListPillFilter(rows, state.activePillId, state.lifecycleById);
    rows = window.applyListSearch(rows, state.searchQuery);
    return rows;
  }

  function renderListBody() {
    var visible = computeVisible();
    if (!visible.length) return renderEmpty();
    return '<div class="cust-list-rows">' + visible.map(rowHtml).join('') + '</div>';
  }

  function rerender() {
    var root = document.getElementById('cust-list-root');
    if (!root) return;
    // Set the CSS custom prop so the row grid auto-sizes to the chosen column count.
    root.style.setProperty('--cust-col-count', String((state.activeColumns || []).length || 4));
    root.innerHTML =
      '<div class="cust-list-shell">' +
        '<aside class="cust-list-side" id="cust-list-side">' + window.renderListSidebar(state) + '</aside>' +
        '<main class="cust-list-main">' +
          renderToolbar() +
          window.renderListFilterPills(state.activePillId) +
          '<div class="cust-list-results">' +
            renderHeader(state.rows) +
            '<div id="cust-list-body">' + renderListBody() + '</div>' +
          '</div>' +
        '</main>' +
      '</div>';
    bindEvents(root);
  }

  function bindEvents(root) {
    // Sidebar pill clicks + coming-soon binds
    var sideEl = document.getElementById('cust-list-side');
    if (sideEl) {
      window.bindListSidebar(sideEl, state, function (pillId) { setPill(pillId); });
    }

    // Top filter pills
    root.querySelectorAll('.cust-list-pill').forEach(function (btn) {
      var pid = btn.getAttribute('data-pill-id');
      var blurred = btn.classList.contains('cust-blurred');
      if (blurred) {
        var cs = btn.getAttribute('data-coming-soon');
        if (cs) window.bindComingSoon(btn, cs);
      } else {
        btn.addEventListener('click', function () { setPill(pid); });
      }
    });

    // Toolbar coming-soon
    root.querySelectorAll('.cust-list-toolbar [data-coming-soon], .cust-list-resHdr [data-coming-soon]')
        .forEach(function (el) { window.bindComingSoon(el, el.getAttribute('data-coming-soon')); });

    // Search
    var input = root.querySelector('.cust-list-search');
    if (input) {
      var t;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { state.searchQuery = input.value; updateBody(); }, 400);
      });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { clearTimeout(t); state.searchQuery = input.value; updateBody(); }
      });
    }

    // Row open
    root.querySelectorAll('.cust-list-open, .cust-list-row').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target && ev.target.classList && ev.target.classList.contains('cust-list-open')) {
          ev.stopPropagation();
        }
        var cid = el.getAttribute('data-customer-id');
        if (cid) {
          trace('list_row_open', { customer_id: cid });
          window.location.href = 'customers.html?t=' + encodeURIComponent(sessionStorage.getItem('tenant_slug') || 'demo') + '&customer_id=' + encodeURIComponent(cid);
        }
      });
    });

    // + לקוח חדש
    var newBtn = document.getElementById('cust-new-customer-btn');
    if (newBtn) newBtn.addEventListener('click', function () {
      if (typeof window.openCustomerCreateModal === 'function') {
        trace('create_modal_open');
        window.openCustomerCreateModal();
      }
    });

    // עמודות — open column picker
    var colpickBtn = document.getElementById('cust-colpick-btn');
    if (colpickBtn) colpickBtn.addEventListener('click', function () {
      if (typeof window.openColumnPicker === 'function') {
        trace('column_picker_open');
        window.openColumnPicker();
      }
    });
  }

  function setPill(pid) {
    state.activePillId = pid;
    trace('list_pill_change', { pill: pid });
    rerender();
  }
  function updateBody() {
    var bodyEl = document.getElementById('cust-list-body');
    if (bodyEl) bodyEl.innerHTML = renderListBody();
    bindEvents(document.getElementById('cust-list-root'));
    trace('list_search_apply', { q: state.searchQuery, results: computeVisible().length });
  }

  async function fetchData() {
    trace('list_fetch_start');
    var tid = getTenantId();
    var [exam, full, branches] = await Promise.all([
      DB.select('v_customer_for_exam', null, {
        order: 'full_name.asc',
        limit: PAGE_SIZE,
        offset: state.page * PAGE_SIZE,
        silent: true
      }),
      DB.select('v_customer_full', null, {
        columns: 'id,lifecycle_stage,phone,phone_secondary,email,city,id_number,source,is_deleted',
        rawFilters: function (q) { return q.eq('is_deleted', false); },
        limit: PAGE_SIZE * 4,    // pull enough rows to map phone+lifecycle onto our page
        silent: true
      }),
      DB.select('tenant_location', null, {
        columns: 'id,name,short_code,is_active',
        rawFilters: function (q) { return q.eq('is_active', true).eq('is_deleted', false); },
        order: 'short_code.asc',
        silent: true
      })
    ]);
    if (exam.error)    throw exam.error;
    if (full.error)    throw full.error;

    // Merge: v_customer_for_exam provides composite display + health_fund_name + age source;
    // v_customer_full supplies phone/email/city/id_number/lifecycle_stage (v_customer_for_exam
    // does NOT expose phone — F-LIST-PHONE-VIEW finding).
    var fullById = {};
    (full.data || []).forEach(function (r) {
      fullById[r.id] = r;
      state.lifecycleById[r.id] = r.lifecycle_stage;
    });
    state.rows = (exam.data || []).map(function (e) {
      var f = fullById[e.id] || {};
      return Object.assign({}, e, {
        phone: f.phone || null,
        phone_secondary: f.phone_secondary || null,
        email: f.email || null,
        city: f.city || null,
        id_number: f.id_number || null,
        source: f.source || null
      });
    });
    state.branches = branches.data || [];
    state.countsByPill = computeCountsByPill(state.rows);
    state.totalCount = state.rows.length; // demo only; Prizma would use a count query
    trace('list_fetch_done', { rows: state.rows.length, branches: state.branches.length });
  }

  window.mountCustomerList = async function () {
    var root = document.getElementById('cust-list-root');
    if (!root) {
      // List container missing from customers.html — create one.
      root = document.createElement('div');
      root.id = 'cust-list-root';
      var cardRoot = document.getElementById('cust-card-root');
      if (cardRoot) cardRoot.appendChild(root); else document.body.appendChild(root);
    }
    root.innerHTML = '<div class="cust-list-shell"><div class="cust-list-loading">טוען…</div></div>';
    try {
      // Load tenant's chosen columns BEFORE the data fetch so the first paint is
      // already with the right columns (no flash-of-default-columns).
      if (typeof window.loadTenantListColumns === 'function') {
        state.activeColumns = await window.loadTenantListColumns();
        trace('list_columns_loaded', { count: (state.activeColumns || []).length });
      } else {
        state.activeColumns = window.DEFAULT_LIST_COLUMNS || ['name', 'phone', 'city', 'health_fund'];
      }
      await fetchData();
    } catch (e) {
      root.innerHTML = '<div class="cust-empty-state"><h2>שגיאה בטעינת הרשימה</h2><p>' + escapeHtml(String(e && e.message || e)) + '</p></div>';
      return;
    }
    rerender();
  };

  // Expose state for the create-mode module
  window.__customerListState = state;
  window.__customerListFetch = fetchData;
  window.__customerListRerender = rerender;
})();
