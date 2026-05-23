/* ============================================================
   M5 Customer Card — page bootstrap + state + tab orchestration.
   Loaded LAST in customers.html so every tab module is registered first.
   ============================================================ */
(function () {
  'use strict';

  // ── Runtime trace (Iron Rule 34) — Chrome MCP evidence surface ──
  window.__cardTrace = window.__cardTrace || [];
  function trace(ev, payload) {
    try { window.__cardTrace.push(Object.assign({ event: ev, t: Date.now() }, payload || {})); }
    catch (_) { /* trace is best-effort */ }
  }

  // ── Tab registry ────────────────────────────────────────────
  var TABS = [
    { id: 'details',       label: 'פרטים',        renderer: 'renderTabDetails',       mount: 'mountTabDetails' },
    { id: 'vision',        label: 'תפקודי ראייה',  renderer: 'renderTabVision',        mount: 'mountTabVision' },
    { id: 'prescriptions', label: 'בדיקות ראייה',  renderer: 'renderTabPrescriptions', mount: 'mountTabPrescriptions' },
    { id: 'orders',        label: 'הזמנות',        renderer: 'renderTabOrders',        mount: 'mountTabOrders' },
    { id: 'docs',          label: 'מסמכים',        renderer: 'renderTabDocs',          mount: 'mountTabDocs' }
  ];

  // ── State ───────────────────────────────────────────────────
  var state = {
    customerId: null,
    customer: null,        // merged: v_customer_for_exam + v_customer_full + lookups
    notes: [],             // customer_notes
    activeTabId: 'details',
    editMode: false,
    loadedTabs: {}         // { tabId: true } — lazy-load tracking
  };

  // Expose to tab modules (read-only by convention)
  window.M5Card = {
    state: state,
    trace: trace,
    activateTab: activateTab,
    setEditMode: setEditMode,
    refreshCustomer: refreshCustomer,
    rerenderActiveTab: rerenderActiveTab
  };

  // ── URL params + boot ───────────────────────────────────────
  function parseCustomerId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('customer_id');
  }

  async function boot() {
    trace('boot_start');
    var cid = parseCustomerId();
    state.customerId = cid;

    if (!cid) {
      document.getElementById('cust-empty-state').style.display = 'block';
      document.getElementById('cust-lede-status').textContent = '';
      trace('boot_empty_state');
      return;
    }

    // Tenant must already be resolved by shared.js auto-resolveTenant.
    // Wait for sessionStorage to be populated.
    var attempts = 0;
    while (!getTenantId() && attempts < 30) {
      await new Promise(function (r) { setTimeout(r, 100); });
      attempts++;
    }
    if (!getTenantId()) {
      document.getElementById('cust-lede-status').textContent = 'שגיאת tenant — חזור ל-/landing.html';
      trace('boot_tenant_failed');
      return;
    }

    // Inject the PIN-issued JWT into the sb client so RLS engages.
    // loadSession() reads sessionStorage.jwt_token + recreates window.sb
    // with the Authorization: Bearer <jwt> header. Without this, the
    // customer views (security_invoker=on) deny rows to anon RLS.
    if (typeof loadSession === 'function') {
      try {
        var session = await loadSession();
        trace('auth_session_loaded', { has_session: !!session });
        if (!session) {
          document.getElementById('cust-lede-status').textContent =
            'אינך מחובר. חזור למסך הראשי והזן PIN.';
          trace('boot_no_session');
          return;
        }
      } catch (e) {
        trace('auth_session_failed', { error: String(e) });
      }
    }

    try {
      await loadCustomer(cid);
    } catch (e) {
      document.getElementById('cust-lede-status').textContent = 'שגיאה בטעינת הלקוח: ' + (e && e.message ? e.message : e);
      trace('boot_load_failed', { error: String(e) });
      return;
    }

    if (!state.customer) {
      document.getElementById('cust-lede-status').textContent = 'הלקוח לא נמצא (או אינו שייך לטננט הנוכחי).';
      trace('boot_not_found');
      return;
    }

    document.getElementById('cust-lede-status').style.display = 'none';
    document.getElementById('cust-card').style.display = 'block';

    renderHeader(state.customer);
    renderTabs();
    activateTab(state.activeTabId);
    trace('boot_ready');
  }

  // ── Data loading ────────────────────────────────────────────
  async function loadCustomer(cid) {
    trace('load_customer_start', { customer_id: cid });

    // Two parallel reads — header view + body view. DB.select auto-injects tenant_id.
    var [hRes, bRes, nRes] = await Promise.all([
      DB.select('v_customer_for_exam', { id: cid }, { single: true, silent: true }),
      DB.select('v_customer_full',     { id: cid }, { single: true, silent: true }),
      DB.select('customer_notes', { customer_id: cid }, {
        silent: true,
        rawFilters: function (q) { return q.eq('is_deleted', false); },
        order: 'created_at.desc'
      })
    ]);

    if (hRes.error && hRes.error.message !== 'not_found') throw hRes.error;
    if (bRes.error && bRes.error.message !== 'not_found') throw bRes.error;

    if (!hRes.data || !bRes.data) {
      state.customer = null;
      return;
    }

    // Merge — body view has the full demographic + consent set;
    // header view has the composite display + tenant_code + branch_code + health_fund_name.
    state.customer = Object.assign({}, bRes.data, hRes.data, {
      // Preserve body-view fields the header view doesn't surface:
      address: bRes.data.address,
      utm_medium: bRes.data.utm_medium,
      utm_campaign: bRes.data.utm_campaign,
      source: bRes.data.source,
      household_id: bRes.data.household_id,
      home_branch_id: bRes.data.home_branch_id,
      customer_marketing_consent: bRes.data.customer_marketing_consent,
      customer_operational_consent: bRes.data.customer_operational_consent,
      crm_marketing_consent: bRes.data.crm_marketing_consent,
      crm_operational_consent: bRes.data.crm_operational_consent,
      is_deleted: bRes.data.is_deleted
    });
    state.notes = (nRes && nRes.data) || [];
    trace('load_customer_done', { has_customer: true, notes_count: state.notes.length });
  }

  async function refreshCustomer() {
    if (!state.customerId) return;
    await loadCustomer(state.customerId);
    renderHeader(state.customer);
    rerenderActiveTab();
    trace('refresh_customer');
  }

  // ── Tab nav rendering ───────────────────────────────────────
  function renderTabs() {
    var c = state.customer || {};
    var html = TABS.map(function (t) {
      return '<button class="cust-tab" data-tab="' + escapeHtml(t.id) + '">' + escapeHtml(t.label) + '</button>';
    }).join('');
    var createdAt = c.created_at ? new Date(c.created_at).toLocaleDateString('he-IL') : '—';
    var numDisplay = c.customer_number_display || (c.customer_number != null ? String(c.customer_number) : '—');
    html += '<div class="right">לקוח ' + escapeHtml(String(numDisplay)) + ' · נוצר ' + escapeHtml(createdAt) + '</div>';
    var nav = document.getElementById('cust-tabs');
    nav.innerHTML = html;
    nav.querySelectorAll('.cust-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { activateTab(btn.getAttribute('data-tab')); });
    });
  }

  function activateTab(tabId) {
    state.activeTabId = tabId;
    // Toggle .active class on nav buttons
    document.querySelectorAll('#cust-tabs .cust-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    rerenderActiveTab();
    trace('activate_tab', { tab: tabId, first_load: !state.loadedTabs[tabId] });
    state.loadedTabs[tabId] = true;
  }

  function rerenderActiveTab() {
    var tab = TABS.filter(function (t) { return t.id === state.activeTabId; })[0];
    if (!tab) return;
    var container = document.getElementById('cust-content');
    container.innerHTML = '<div class="cust-pane active" id="cust-pane-' + tab.id + '"></div>';
    var pane = container.firstChild;
    var renderer = window[tab.renderer];
    var mounter = window[tab.mount];
    if (typeof renderer === 'function') {
      try { renderer(pane, state); } catch (e) { console.error('[card]', tab.id, 'render failed', e); pane.textContent = 'שגיאה: ' + e.message; }
    } else {
      pane.textContent = '⚠ tab module not loaded: ' + tab.renderer;
    }
    if (typeof mounter === 'function') { try { mounter(pane, state); } catch (_) { /* mount is best-effort */ } }
  }

  // ── Edit-mode toggle (header dispatches; details consumes) ──
  function setEditMode(on) {
    state.editMode = !!on;
    document.body.classList.toggle('cust-edit-mode', state.editMode);
    trace('edit_mode', { on: state.editMode });
    // Re-render the active tab so editable rows pick up the new mode.
    rerenderActiveTab();
  }

  // ── Kick off ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
