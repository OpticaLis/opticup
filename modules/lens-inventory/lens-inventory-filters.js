// lens-inventory-filters.js — Stock/Custom toggle + brand → design → variant cascade
// Loads from lens_brand / lens_design / lens_variant via fetchAll (Iron Rule 7).
// Production-type filter narrows supplier_catalog_offering to determine which
// designs are stock-only vs custom for the optic.

(function () {
  'use strict';

  function _opt(value, label) {
    return '<option value="' + escapeHtml(value || '') + '">' + escapeHtml(label || '') + '</option>';
  }

  async function loadBrands() {
    // lens_brand is global catalog (owner_tenant_id NULL) — but fetchAll auto-filters
    // by tenant_id. For globally-readable tables, pass the all-tenants param OR
    // accept that fetchAll will return rows where tenant_id IS NULL via RLS.
    // Phase 1A pattern: lens_brand RLS allows SELECT WHERE is_deleted=false (global read).
    // Use sb directly (one of the few allowed exceptions per Iron Rule 7 carve-out for
    // globally-readable catalog tables — same pattern as lens-catalog-admin).
    const { data, error } = await sb.from('lens_brand')
      .select('id, name, lifecycle_status')
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    if (error) throw error;
    window.LensInv.brands = data || [];
    renderBrandOptions();
  }

  function renderBrandOptions() {
    const sel = document.getElementById('filter-brand');
    sel.innerHTML = '<option value="">— הכל —</option>' +
      window.LensInv.brands.map(b => _opt(b.id, b.name)).join('');
  }

  async function loadDesigns(brandId) {
    const { data, error } = await sb.from('lens_design')
      .select('id, name, lens_type, brand_id, lifecycle_status')
      .eq('is_deleted', false)
      .eq('brand_id', brandId)
      .order('name', { ascending: true });
    if (error) throw error;
    window.LensInv.designs = data || [];
    const sel = document.getElementById('filter-design');
    sel.innerHTML = '<option value="">— בחר דגם —</option>' +
      window.LensInv.designs.map(d => _opt(d.id, d.name)).join('');
  }

  async function loadVariants(designId) {
    const { data, error } = await sb.from('lens_variant')
      .select('id, design_id, display_id, refractive_index, coating, tint, sph_min, sph_max, sph_step, cyl_min, cyl_max, cyl_step, add_min, add_max, add_step')
      .eq('is_deleted', false)
      .eq('design_id', designId)
      .order('display_id', { ascending: true });
    if (error) throw error;
    window.LensInv.variants = data || [];
    const sel = document.getElementById('filter-variant');
    sel.innerHTML = '<option value="">— בחר וריאציה —</option>' +
      window.LensInv.variants.map(v => _opt(v.id, v.display_id + ' n=' + v.refractive_index)).join('');
  }

  async function loadStockForVariant(variantId) {
    // fetchAll auto-injects tenant_id filter (Iron Rule 7 canonical path).
    const rows = await fetchAll('tenant_lens_stock', [
      ['variant_id', 'eq', variantId],
      ['is_deleted', 'eq', false],
    ]);
    window.LensInv.stockRows = rows;
    window.LensInvGrid.renderGrid();
  }

  async function maybeFilterByProductionType() {
    // The production_type filter narrows which DESIGNS appear — only designs whose
    // active supplier_catalog_offering matches the chosen type.
    // For Phase 1B-foundation, we apply this lazily: load offerings on demand when
    // the design dropdown changes. Server-side fetch by production_type:
    const rows = await fetchAll('supplier_catalog_offering', [
      ['production_type', 'eq', window.LensInv.productionFilter],
      ['status', 'eq', 'active'],
      ['is_deleted', 'eq', false],
    ]);
    window.LensInv.offerings = rows;
  }

  function attachHandlers() {
    // Production-type chips
    document.querySelectorAll('[data-production-filter]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('[data-production-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.LensInv.productionFilter = btn.dataset.productionFilter;
        await maybeFilterByProductionType();
        // Reset cascade
        window.LensInv.designId = null;
        window.LensInv.variantId = null;
        window.LensInv.stockRows = [];
        document.getElementById('filter-design').innerHTML = '<option value="">— בחר דגם —</option>';
        document.getElementById('filter-variant').innerHTML = '<option value="">— בחר וריאציה —</option>';
        document.getElementById('grid-container').innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
        document.getElementById('lot-container').innerHTML = '<div class="empty-state">בחר תא בטבלה לצפייה בחבילות</div>';
      });
    });

    document.getElementById('filter-brand').addEventListener('change', async (e) => {
      window.LensInv.brandId = e.target.value || null;
      window.LensInv.designId = null;
      window.LensInv.variantId = null;
      if (window.LensInv.brandId) {
        await loadDesigns(window.LensInv.brandId);
      } else {
        document.getElementById('filter-design').innerHTML = '<option value="">— בחר דגם —</option>';
      }
      document.getElementById('filter-variant').innerHTML = '<option value="">— בחר וריאציה —</option>';
      document.getElementById('grid-container').innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
    });

    document.getElementById('filter-design').addEventListener('change', async (e) => {
      window.LensInv.designId = e.target.value || null;
      window.LensInv.variantId = null;
      if (window.LensInv.designId) {
        await loadVariants(window.LensInv.designId);
      } else {
        document.getElementById('filter-variant').innerHTML = '<option value="">— בחר וריאציה —</option>';
      }
      document.getElementById('grid-container').innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
    });

    document.getElementById('filter-variant').addEventListener('change', async (e) => {
      window.LensInv.variantId = e.target.value || null;
      if (window.LensInv.variantId) {
        await loadStockForVariant(window.LensInv.variantId);
      } else {
        document.getElementById('grid-container').innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
      }
    });

    // Initial production-type load
    maybeFilterByProductionType().catch(err => console.warn('production filter init failed', err));
  }

  window.LensInvFilters = { loadBrands, loadDesigns, loadVariants, loadStockForVariant, attachHandlers };
})();
