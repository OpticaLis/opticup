// lens-pos-list-main.js — orchestrator + permission gate + state + bootstrap.
// M1_LENS_ACTIVE_POS_LIST_REBUILD 2026-05-18. 1:1 mockup rebuild.
// Display-only list with 5 stat-cards (overdue is DERIVED, not enum). Row-action
// drawer via SideDetailPanel. RPCs unchanged: mark_po_sent + cancel_purchase_order.

(function () {
  'use strict';

  window.LensPOsList = {
    pos: [],
    suppliers: [],
    statusFilter: 'all',           // 'all' | 'draft' | 'sent' | 'partial' | 'overdue' (DERIVED)
    sourceFilter: 'all',           // 'all' | 'stock' | 'custom' | 'mixed'
    supplierFilter: '',
    includeCancelled: 'exclude',   // 'exclude' | 'include' | 'only'
    searchText: '',
    statsRow: null,                // StatCardRow handle
    chipFilters: null,             // ChipFilterRow handle for source
    detailHandle: null,            // SideDetailPanel current
  };

  function isOverdue(po) {
    if (!po || po.status !== 'sent') return false;
    if (!po.expected_delivery_at) return false;
    const exp = new Date(po.expected_delivery_at);
    if (isNaN(exp.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  function sourceOf(po) {
    const lines = po.purchase_order_line || [];
    if (lines.length === 0) return 'stock';
    let hasCustom = false, hasStock = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].sale_order_id) hasCustom = true; else hasStock = true;
      if (hasCustom && hasStock) return 'mixed';
    }
    return hasCustom ? 'custom' : 'stock';
  }

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-pos-list] hasPermission not available — gating disabled');
      return true;
    }
    if (!hasPermission('lens.po.view')) {
      const gate = document.getElementById('access-gate'); if (gate) gate.style.display = 'block';
      const app  = document.getElementById('app');         if (app)  app.style.display  = 'none';
      return false;
    }
    const gate = document.getElementById('access-gate'); if (gate) gate.style.display = 'none';
    const app  = document.getElementById('app');         if (app)  app.style.display  = 'block';
    return true;
  }

  async function reload() {
    await window.LensPOsListTable.loadAndRender();
    window.LensPOsListStats.render();
    window.LensPOsListTable.renderTable();
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      await window.LensPOsListTable.loadAndRender();
      window.LensPOsListStats.mount();
      window.LensPOsListFilters.mount();
      window.LensPOsListFilters.bind();
      window.LensPOsListTable.renderTable();
      const refreshBtn = document.getElementById('btn-refresh');
      if (refreshBtn) refreshBtn.addEventListener('click', reload);
      console.log('[lens-pos-list] bootstrap complete');
    } catch (err) {
      console.error('[lens-pos-list] bootstrap failed', err);
      if (window.Toast) Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
    }
  }

  window.LensPOsList.isOverdue = isOverdue;
  window.LensPOsList.sourceOf = sourceOf;
  window.LensPOsList.reload = reload;
  window.LensPOsList.bootstrap = bootstrap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
