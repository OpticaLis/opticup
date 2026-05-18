// lens-pricing-main.js — bootstrap + state + view-mode + tab orchestration.
// M1_LENS_PRICING_REBUILD (2026-05-17): rewritten as the orchestrator that wires
// 5 shared components per LENS_PRICING_MOCKUP.
//   • StatCardRow            — 4 cards (active offerings, pending, promos, total)
//   • ChipFilter (×3)        — production / supplier / brand
//   • TableBuilder + ext.    — pricing table (cost-permission gating)
//   • LensDetailsDrawer      — per-row logs + notes CRUD
//   • LensPriceResolver      — effective_price RPC wrapper (shared/js)
//
// Notes table CRUD: direct PostgREST per Foreman §0 (RLS canonical 2-policy
// tenant_isolation already in place; Iron Rule 7 specialized-case allowance).

(function () {
  'use strict';

  // ─── State container (extends pre-rebuild window.LensPricing) ──────────────
  window.LensPricing = {
    productionFilter: 'stock',           // 'stock' | 'custom' | 'both'
    supplierFilter:   'all',             // supplier_id | 'all'
    brandFilter:      'all',             // brand_id | 'all'
    activeTab:        'active',          // 'active' | 'pending' | 'promotions' | 'history'
    viewMode:         'edit',            // 'edit' | 'readonly' (default driven by permission)
    selectedRowIds:   new Set(),         // offering_id set
    // Data
    offerings:        [],                // supplier_catalog_offering rows
    variants:         [],                // lens_variant rows resolved from offerings
    designs:          [],                // lens_design rows
    brands:           [],                // lens_brand rows
    suppliers:        [],                // suppliers
    overlays:         [],                // pricing_overlay rows
    effectivePrices:  new Map(),         // offering_id → numeric (via LensPriceResolver)
    pendingOverlays:  [],                // status='proposed' subset
    // Component instances
    statCards:        null,
    chipFilters:      { prod: null, supplier: null, brand: null },
    table:            null,
    drawer:           null,
    // Selected variant for drawer
    selectedVariantId: null,
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-pricing] hasPermission unavailable — gating disabled');
      return true;
    }
    if (!hasPermission('lens.pricing.manage')) {
      const gate = document.getElementById('access-gate-pricing');
      const app  = document.getElementById('app-pricing');
      if (gate) gate.style.display = 'block';
      if (app)  app.style.display = 'none';
      return false;
    }
    const gate = document.getElementById('access-gate-pricing');
    const app  = document.getElementById('app-pricing');
    if (gate) gate.style.display = 'none';
    if (app)  app.style.display = '';
    return true;
  }

  function _resolveDefaultViewMode() {
    if (typeof hasPermission === 'function' && hasPermission('lens_pricing.edit')) return 'edit';
    return 'readonly';
  }

  function _setViewMode(mode) {
    window.LensPricing.viewMode = mode;
    document.querySelectorAll('.lens-tab-section[data-tab="pricing"] .view-mode-toggle .vm-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewMode === mode);
    });
    const section = document.querySelector('.lens-tab-section[data-tab="pricing"]');
    if (section) section.setAttribute('data-view-mode', mode);
    // Refresh table to apply mode-conditional column rendering (inline-edit inputs vs read-only spans)
    if (window.LensPricingGrid && typeof window.LensPricingGrid.refresh === 'function') {
      window.LensPricingGrid.refresh();
    }
  }

  function _setActiveTab(tabId) {
    window.LensPricing.activeTab = tabId;
    document.querySelectorAll('.lens-tab-section[data-tab="pricing"] .top-tab').forEach(b => {
      const active = b.dataset.topTab === tabId;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.lens-tab-section[data-tab="pricing"] .lens-pricing-tab-pane').forEach(p => {
      p.style.display = (p.dataset.tabPane === tabId) ? '' : 'none';
    });
  }

  function _attachToggles() {
    // View-mode toggle
    document.addEventListener('click', function (e) {
      const vmBtn = e.target && e.target.closest && e.target.closest('.lens-tab-section[data-tab="pricing"] .view-mode-toggle .vm-btn');
      if (vmBtn && vmBtn.dataset.viewMode) {
        _setViewMode(vmBtn.dataset.viewMode);
        return;
      }
      // Top tabs
      const tabBtn = e.target && e.target.closest && e.target.closest('.lens-tab-section[data-tab="pricing"] .top-tab');
      if (tabBtn && tabBtn.dataset.topTab) {
        _setActiveTab(tabBtn.dataset.topTab);
        return;
      }
      // Alert link → open pending tab
      const alertLink = e.target && e.target.closest && e.target.closest('[data-alert-action="open-pending"]');
      if (alertLink) {
        e.preventDefault();
        _setActiveTab('pending');
        return;
      }
      // Header action stubs
      const actionBtn = e.target && e.target.closest && e.target.closest('[data-lens-pricing-action]');
      if (actionBtn && actionBtn.closest('.lens-tab-section[data-tab="pricing"]')) {
        if (window.Toast) Toast.info('פעולה זו תיבנה ב-SPEC עתידי');
      }
    });
  }

  async function _updateContextBadge() {
    const el = document.getElementById('lens-pricing-context-badge');
    if (!el) return;
    try {
      const tid = getTenantId();
      const { data: t } = await sb.from('tenants').select('name').eq('id', tid).single();
      el.textContent = 'Optic Up · ' + ((t && t.name) || 'Tenant');
    } catch (_) { el.textContent = 'Optic Up'; }
  }

  function _showPendingAlert() {
    const overlays = window.LensPricing.pendingOverlays || [];
    const alertEl = document.getElementById('lens-pricing-alert');
    const textEl  = document.getElementById('lens-pricing-alert-text');
    if (!alertEl || !textEl) return;
    if (overlays.length === 0) { alertEl.style.display = 'none'; return; }
    alertEl.style.display = '';
    textEl.textContent = 'יש ' + overlays.length + ' הצעות שינוי מחיר ממתינות לאישור.';
    const badge = document.getElementById('pending-tab-badge');
    if (badge) badge.textContent = String(overlays.length);
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      _updateContextBadge();
      // Default view-mode driven by permission
      window.LensPricing.viewMode = _resolveDefaultViewMode();
      _setViewMode(window.LensPricing.viewMode);
      _attachToggles();
      _setActiveTab('active');

      // Existing filter loaders (refactored to consume LensPriceResolver)
      await window.LensPricingFilters.loadInitialData();
      if (window.LensPricingFilters.attachHandlers) window.LensPricingFilters.attachHandlers();

      // Mount shared components
      if (window.LensPricingStats) window.LensPricingStats.init();
      if (window.LensPricingFilters.mountChips) window.LensPricingFilters.mountChips();
      if (window.LensPricingGrid && window.LensPricingGrid.init) window.LensPricingGrid.init();
      if (window.LensPricingDrawer && window.LensPricingDrawer.init) window.LensPricingDrawer.init();
      _showPendingAlert();
      console.log('[lens-pricing] bootstrap complete (rebuild)');
    } catch (err) {
      console.error('[lens-pricing] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
    }
  }

  async function refreshAll() {
    try {
      await window.LensPricingFilters.loadInitialData();
      if (window.LensPricingStats) window.LensPricingStats.refresh();
      if (window.LensPricingFilters.mountChips) window.LensPricingFilters.mountChips();
      if (window.LensPricingGrid) window.LensPricingGrid.refresh();
      _showPendingAlert();
    } catch (err) {
      console.error('[lens-pricing] refreshAll failed', err);
      if (window.Toast) Toast.error('שגיאה: ' + (err.message || err));
    }
  }

  window.LensPricing.bootstrap = bootstrap;
  window.LensPricing.refreshAll = refreshAll;
  window.LensPricing.setViewMode = _setViewMode;
  window.LensPricing.setActiveTab = _setActiveTab;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
