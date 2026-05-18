// lens-active-designs-tree.js — catalog data loader (brands + designs + offerings + variants + active state)
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17): renamed responsibility to
// pure data loading. The old renderDesignsTable() was replaced by
// LensADTable (see lens-active-designs-table.js).
//
// All queries are tenant-scoped via fetchAll (per Iron Rules 7 + 22). Reads
// from 5 tables: lens_brand, lens_design, lens_variant, supplier_catalog_offering,
// tenant_active_offerings.

(function () {
  'use strict';

  async function loadBrands() {
    const { data, error } = await sb.from('lens_brand')
      .select('id, name, owner_tenant_id')
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    if (error) throw error;
    window.LensAD.brands = data || [];
  }

  async function loadDesigns() {
    const { data, error } = await sb.from('lens_design')
      .select('id, name, lens_type, material, brand_id')
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    if (error) throw error;
    window.LensAD.designs = data || [];
  }

  async function loadOfferings() {
    // Tenant-scoped via fetchAll (Iron Rule 22 defense-in-depth — also RLS).
    // Filter by current productionFilter (stock | custom | both).
    const filters = [['status', 'eq', 'active'], ['is_deleted', 'eq', false]];
    if (window.LensAD.productionFilter === 'stock')  filters.push(['production_type', 'eq', 'stock']);
    if (window.LensAD.productionFilter === 'custom') filters.push(['production_type', 'eq', 'custom']);
    // 'both' → no production_type filter
    const rows = await fetchAll('supplier_catalog_offering', filters);
    window.LensAD.offerings = rows || [];
  }

  async function loadActiveOfferings() {
    const rows = await fetchAll('tenant_active_offerings', [
      ['is_deleted', 'eq', false],
    ]);
    window.LensAD.activeOfferings = rows || [];
  }

  async function loadVariantsForOfferings() {
    const variantIds = Array.from(new Set(window.LensAD.offerings.map(o => o.variant_id))).filter(Boolean);
    if (!variantIds.length) {
      window.LensAD.variantsByDesign = new Map();
      window.LensAD.offeringsByDesign = new Map();
      return;
    }
    const tid = getTenantId();
    const { data, error } = await sb.from('lens_variant')
      .select('id, design_id, display_id, refractive_index, diameter_mm, coating, tint')
      .in('id', variantIds)
      .eq('is_deleted', false);
    if (error) throw error;
    const variants = data || [];
    // Build design → variants map
    const variantsByDesign = new Map();
    const variantById = new Map();
    variants.forEach(v => {
      variantById.set(v.id, v);
      if (!variantsByDesign.has(v.design_id)) variantsByDesign.set(v.design_id, []);
      variantsByDesign.get(v.design_id).push(v);
    });
    // Build design → offerings map via variant join
    const offeringsByDesign = new Map();
    window.LensAD.offerings.forEach(o => {
      const v = variantById.get(o.variant_id);
      if (!v) return;
      if (!offeringsByDesign.has(v.design_id)) offeringsByDesign.set(v.design_id, []);
      offeringsByDesign.get(v.design_id).push(o);
    });
    window.LensAD.variantsByDesign = variantsByDesign;
    window.LensAD.offeringsByDesign = offeringsByDesign;
  }

  function recomputeStats() {
    const designs = window.LensAD.designs;
    const offeringsByDesign = window.LensAD.offeringsByDesign;
    const variantsByDesign = window.LensAD.variantsByDesign;
    const activeOfferings = window.LensAD.activeOfferings || [];
    const activeOfferingIds = new Set(activeOfferings.filter(a => a.is_active).map(a => a.offering_id));

    // A design is "active" if it has at least one offering that's in activeOfferings + is_active=true
    let activeDesigns = 0;
    let activeVariants = 0;
    designs.forEach(d => {
      const offs = offeringsByDesign.get(d.id) || [];
      const hasActive = offs.some(o => activeOfferingIds.has(o.id));
      if (hasActive) {
        activeDesigns++;
        // Each active offering's variant is "active"; count distinct variants
        const activeVariantsInDesign = new Set();
        offs.forEach(o => { if (activeOfferingIds.has(o.id)) activeVariantsInDesign.add(o.variant_id); });
        activeVariants += activeVariantsInDesign.size;
      }
    });

    // Private series — designs whose brand.owner_tenant_id = current tenant
    const tid = getTenantId();
    const privateBrandIds = new Set(
      (window.LensAD.brands || []).filter(b => b.owner_tenant_id === tid).map(b => b.id)
    );
    const privateSeries = designs.filter(d => privateBrandIds.has(d.brand_id)).length;

    const totalDesigns = designs.length;
    const unselected = totalDesigns - activeDesigns;

    window.LensAD.stats = { activeDesigns, activeVariants, privateSeries, unselected, totalDesigns };
  }

  async function loadCatalog() {
    // Load in parallel where possible. Variants depend on offerings, so chain.
    await Promise.all([loadBrands(), loadDesigns(), loadOfferings(), loadActiveOfferings()]);
    await loadVariantsForOfferings();
    recomputeStats();
  }

  window.LensADTree = { loadCatalog, recomputeStats };
})();
