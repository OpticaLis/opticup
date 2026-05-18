// lens-pricing-filters.js — data loaders + 3 ChipFilter mounts.
// M1_LENS_PRICING_REBUILD (2026-05-17): refactored to consume the shared
// LensPriceResolver (replaces the inline computeEffectivePrices loop) +
// mount 3 chip-filter rows (production / supplier / brand).

(function () {
  'use strict';

  async function loadOfferings() {
    const filters = [['status', 'eq', 'active'], ['is_deleted', 'eq', false]];
    if (window.LensPricing.productionFilter === 'stock')  filters.push(['production_type', 'eq', 'stock']);
    if (window.LensPricing.productionFilter === 'custom') filters.push(['production_type', 'eq', 'custom']);
    window.LensPricing.offerings = await fetchAll('supplier_catalog_offering', filters) || [];
  }

  async function loadVariantsAndDesigns() {
    const variantIds = Array.from(new Set(window.LensPricing.offerings.map(o => o.variant_id))).filter(Boolean);
    if (!variantIds.length) {
      window.LensPricing.variants = [];
      window.LensPricing.designs = [];
      return;
    }
    const { data: vs, error: vErr } = await sb.from('lens_variant')
      .select('id, design_id, display_id, refractive_index, diameter_mm, coating, tint')
      .in('id', variantIds)
      .eq('is_deleted', false);
    if (vErr) throw vErr;
    window.LensPricing.variants = vs || [];

    const designIds = Array.from(new Set(window.LensPricing.variants.map(v => v.design_id))).filter(Boolean);
    if (!designIds.length) { window.LensPricing.designs = []; return; }
    const { data: ds, error: dErr } = await sb.from('lens_design')
      .select('id, name, brand_id, lens_type, material')
      .in('id', designIds)
      .eq('is_deleted', false);
    if (dErr) throw dErr;
    window.LensPricing.designs = ds || [];
  }

  async function loadBrandsAndSuppliers() {
    const tid = getTenantId();
    // Brands: pre-existing pattern (global catalog)
    const { data: bs } = await sb.from('lens_brand').select('id, name').eq('is_deleted', false).order('name');
    window.LensPricing.brands = bs || [];
    // Suppliers: tenant-scoped (note: suppliers table has no is_deleted column;
    // verified live 2026-05-17 via information_schema). Active flag is the gate.
    const { data: ss } = await sb.from('suppliers')
      .select('id, name').eq('tenant_id', tid).eq('active', true).order('name');
    window.LensPricing.suppliers = ss || [];
  }

  async function loadOverlays() {
    const rows = await fetchAll('pricing_overlay', [['is_deleted', 'eq', false]]);
    window.LensPricing.overlays = rows || [];
    window.LensPricing.pendingOverlays = rows.filter(o => o.status === 'proposed');
  }

  async function loadEffectivePrices() {
    if (!window.LensPriceResolver) {
      console.warn('[lens-pricing] LensPriceResolver unavailable — sell-prices stay blank');
      window.LensPricing.effectivePrices = new Map();
      return;
    }
    const tid = getTenantId();
    if (!tid) return;
    const offeringIds = window.LensPricing.offerings.map(o => o.id);
    window.LensPricing.effectivePrices = await window.LensPriceResolver.resolveMany(offeringIds, tid);
  }

  async function loadInitialData() {
    // Load in parallel where possible; variants depend on offerings.
    await Promise.all([loadOfferings(), loadBrandsAndSuppliers(), loadOverlays()]);
    await loadVariantsAndDesigns();
    await loadEffectivePrices();
  }

  // ─── Chip-filter mounts ─────────────────────────────────────────
  function _buildSupplierChips() {
    const counts = new Map(); // supplier_id → offering count
    window.LensPricing.offerings.forEach(o => {
      if (o.supplier_id) counts.set(o.supplier_id, (counts.get(o.supplier_id) || 0) + 1);
    });
    const chips = [{ id: 'all', label: 'הכל', count: window.LensPricing.offerings.length, variant: 'secondary' }];
    window.LensPricing.suppliers.forEach(s => {
      const c = counts.get(s.id) || 0;
      if (c === 0) return;
      chips.push({ id: s.id, label: s.name, count: c, variant: 'secondary' });
    });
    return chips;
  }

  function _buildBrandChips() {
    // brand_id reachable via variants→designs→brand_id; count distinct offerings per brand.
    const variantById = new Map(window.LensPricing.variants.map(v => [v.id, v]));
    const designById  = new Map(window.LensPricing.designs.map(d => [d.id, d]));
    const counts = new Map(); // brand_id → offering count
    window.LensPricing.offerings.forEach(o => {
      const v = variantById.get(o.variant_id);
      if (!v) return;
      const d = designById.get(v.design_id);
      if (!d || !d.brand_id) return;
      counts.set(d.brand_id, (counts.get(d.brand_id) || 0) + 1);
    });
    const chips = [{ id: 'all', label: 'הכל', count: window.LensPricing.offerings.length }];
    window.LensPricing.brands.forEach(b => {
      const c = counts.get(b.id) || 0;
      if (c === 0) return;
      chips.push({ id: b.id, label: b.name, count: c });
    });
    return chips;
  }

  function mountChips() {
    if (!window.ChipFilter) return;

    const prodMount = document.getElementById('lens-pricing-prod-filter-mount');
    if (prodMount) {
      if (window.LensPricing.chipFilters.prod) try { window.LensPricing.chipFilters.prod.destroy(); } catch (_) {}
      window.LensPricing.chipFilters.prod = window.ChipFilter.init(prodMount, {
        label: 'סוג ייצור:',
        chips: [
          { id: 'stock',  label: 'מדף (Stock)', icon: '📦' },
          { id: 'custom', label: 'ייצור (Custom)', icon: '🏭' },
          { id: 'both',   label: 'שתיהן', icon: '🔀', variant: 'secondary' }
        ],
        activeIds: [window.LensPricing.productionFilter],
        onSelect: async (ids) => {
          window.LensPricing.productionFilter = ids[0] || 'stock';
          window.LensPricing.selectedRowIds.clear();
          await window.LensPricing.refreshAll();
        }
      });
    }

    const supMount = document.getElementById('lens-pricing-supplier-filter-mount');
    if (supMount) {
      if (window.LensPricing.chipFilters.supplier) try { window.LensPricing.chipFilters.supplier.destroy(); } catch (_) {}
      window.LensPricing.chipFilters.supplier = window.ChipFilter.init(supMount, {
        label: 'ספק:',
        chips: _buildSupplierChips(),
        activeIds: [window.LensPricing.supplierFilter],
        onSelect: (ids) => {
          window.LensPricing.supplierFilter = ids[0] || 'all';
          if (window.LensPricingGrid) window.LensPricingGrid.refresh();
        }
      });
    }

    const brandMount = document.getElementById('lens-pricing-brand-filter-mount');
    if (brandMount) {
      if (window.LensPricing.chipFilters.brand) try { window.LensPricing.chipFilters.brand.destroy(); } catch (_) {}
      window.LensPricing.chipFilters.brand = window.ChipFilter.init(brandMount, {
        label: 'מותג:',
        chips: _buildBrandChips(),
        activeIds: [window.LensPricing.brandFilter],
        onSelect: (ids) => {
          window.LensPricing.brandFilter = ids[0] || 'all';
          if (window.LensPricingGrid) window.LensPricingGrid.refresh();
        }
      });
    }
  }

  function attachHandlers() {
    // Existing bulk button — bridge to bulk.js if mounted (legacy bulk modal flow)
    const btn = document.getElementById('btn-bulk-apply');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        if (window.LensPricingBulk) window.LensPricingBulk.openBulkModal();
      });
    }
  }

  window.LensPricingFilters = {
    loadInitialData, mountChips, attachHandlers,
    // Backward-compat exports — preserved so legacy callers don't break.
    loadBrands: loadBrandsAndSuppliers,
    refreshPricingList: () => window.LensPricing.refreshAll(),
    computeEffectivePrices: loadEffectivePrices
  };
})();
