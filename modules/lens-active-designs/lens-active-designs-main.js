// lens-active-designs-main.js — bootstrap + state + shared-component init.
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17): rewritten as the orchestrator
// that wires 5 shared components per LENS_DESIGNS_SELECTION_MOCKUP.
//   • StatCardRow (4 cards)            — populated from live DB counts
//   • ChipFilter (4 rows)              — production / status / lens-type / brand
//   • TableBuilder + GroupHeaderRow    — brand-grouped designs table
//   • SideDetailPanel                  — per-design details + bulk activate/deactivate
// Toggle persistence reuses lens-active-designs-toggle.js toggleOffering() per
// Iron Rule 21. Tree loader reused for catalog data.

(function () {
  'use strict';

  // ─── Module state ───────────────────────────────────────────────
  window.LensAD = {
    productionFilter: 'stock',           // 'stock' | 'custom' | 'both'
    statusFilter:     'all',             // 'all' | 'active' | 'available' | 'private'
    lensTypeFilter:   'all',             // 'all' | 'single_vision' | 'bifocal' | 'progressive' | 'office'
    brandIdFilter:    null,              // uuid | null
    brands:           [],                // lens_brand rows
    designs:          [],                // lens_design rows
    offerings:        [],                // supplier_catalog_offering rows
    activeOfferings: [],                 // tenant_active_offerings rows
    variantsByDesign: new Map(),         // design_id → [variant rows]
    offeringsByDesign: new Map(),        // design_id → [offering rows]
    stats: { activeDesigns: 0, activeVariants: 0, privateSeries: 0, unselected: 0, totalDesigns: 0 },
    table: null,                         // TableBuilder instance
    statCards: null,                     // StatCardRow instance
    sidePanel: null,                     // SideDetailPanel instance
    selectedDesignId: null,
  };

  // ─── Permission gate ────────────────────────────────────────────
  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-ad] hasPermission unavailable — gating disabled');
      return true;
    }
    if (!hasPermission('lens.designs.manage')) {
      const gate = document.getElementById('access-gate-ad');
      const app  = document.getElementById('app-ad');
      if (gate) gate.style.display = 'block';
      if (app)  app.style.display = 'none';
      return false;
    }
    const gate = document.getElementById('access-gate-ad');
    const app  = document.getElementById('app-ad');
    if (gate) gate.style.display = 'none';
    if (app)  app.style.display = '';
    return true;
  }

  // ─── Context badge ──────────────────────────────────────────────
  async function _updateContextBadge() {
    const el = document.getElementById('lens-ad-context-badge');
    if (!el) return;
    try {
      const tid = getTenantId();
      const [{ data: tenantRow }, { data: locations }] = await Promise.all([
        sb.from('tenants').select('name').eq('id', tid).single(),
        sb.from('tenant_location').select('id').eq('tenant_id', tid).eq('is_active', true).eq('is_deleted', false)
      ]);
      const tenantName = (tenantRow && tenantRow.name) || 'Tenant';
      const locCount = (locations && locations.length) || 0;
      // SPEC 12 (2026-05-18): cache locations on the namespace so detail.js
      // can route bulk activate/deactivate through the array RPC with explicit
      // location_ids (no more p_location_id=null placeholder rows).
      window.LensAD.locations = locations || [];
      el.textContent = 'Optic Up · ' + tenantName + ' · ' + locCount + ' סניפים';
    } catch (e) {
      console.warn('[lens-ad] context badge load failed', e.message);
      el.textContent = 'Optic Up';
    }
  }

  // ─── Bootstrap ──────────────────────────────────────────────────
  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;

    try {
      _updateContextBadge();   // async, non-blocking
      await window.LensADTree.loadCatalog();             // brands + designs + offerings + variants + activeOfferings
      window.LensADStats.init();                          // mount stat cards
      window.LensADFilters.init();                        // mount 4 chip-filter rows
      window.LensADTable.init();                          // mount TableBuilder + render brand-grouped rows
      window.LensADDetail.init();                         // wire row-click → side panel + bulk actions
      _attachHeaderActions();                             // export / refresh / create-private (stubs for now)
      console.log('[lens-ad] bootstrap complete');
    } catch (err) {
      console.error('[lens-ad] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
      }
    }
  }

  function _attachHeaderActions() {
    document.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest && e.target.closest('[data-lens-ad-action]');
      if (!btn) return;
      // Only handle clicks INSIDE the active-designs tab section
      if (!btn.closest('.lens-tab-section[data-tab="active-designs"]')) return;
      const action = btn.dataset.lensAdAction;
      if (action === 'export' || action === 'refresh-catalog' || action === 'create-private') {
        // Stubs — full implementations are future SPECs (out of scope for SPEC 4)
        if (window.Toast) Toast.info('פעולה זו תיבנה ב-SPEC עתידי');
      }
    });
  }

  // Refresh helper exposed so child modules can request a full re-render
  // after a state-changing action (toggle persistence, bulk actions).
  async function refreshAll() {
    try {
      await window.LensADTree.loadCatalog();
      window.LensADStats.refresh();
      window.LensADTable.refresh();
      window.LensADDetail.refreshSelected();
    } catch (err) {
      console.error('[lens-ad] refreshAll failed', err);
      if (window.Toast) Toast.error('שגיאה ברענון: ' + (err.message || err));
    }
  }

  window.LensAD.bootstrap = bootstrap;
  window.LensAD.refreshAll = refreshAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
