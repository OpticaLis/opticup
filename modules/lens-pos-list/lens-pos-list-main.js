// lens-pos-list-main.js — entry point + permission gate + bootstrap
// Display-only list. Permission key: lens.po.view (everyone with the screen).
// Cancel from row requires lens.po.cancel — checked at action invocation.

(function () {
  'use strict';

  window.LensPOsList = {
    pos: [],
    suppliers: [],
    statusFilter: 'all',           // 'all' | 'draft' | 'sent' | 'partial' | 'fully_received' | 'cancelled'
    supplierFilter: '',            // supplier_id or ''
    includeCancelled: 'exclude',   // 'exclude' | 'include' | 'only'
    searchText: '',
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-pos-list] hasPermission not available — gating disabled (early load)');
      return true;
    }
    if (!hasPermission('lens.po.view')) {
      const gate = document.getElementById('access-gate');
      if (gate) gate.style.display = 'block';
      const app = document.getElementById('app');
      if (app) app.style.display = 'none';
      return false;
    }
    document.getElementById('access-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    return true;
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      await window.LensPOsListTable.loadAndRender();
      window.LensPOsListFilters.bind();
      console.log('[lens-pos-list] bootstrap complete');
    } catch (err) {
      console.error('[lens-pos-list] bootstrap failed', err);
      if (window.Toast) Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
    }
  }

  window.LensPOsList.bootstrap = bootstrap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
