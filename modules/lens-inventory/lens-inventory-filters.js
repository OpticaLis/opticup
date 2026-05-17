// lens-inventory-filters.js — Stock/Custom + brand cascade + 6-row chip toggles
// M1_LENS_INVENTORY_MOCKUP_1TO1 Sub-Phase A3 (2026-05-18):
//   • Brand → Design → Variant cascade preserved (existing select-driven flow).
//   • Row-6 brand chips programmatically drive the hidden #filter-brand select
//     (visual mockup match while keeping the JS cascade contract intact).
//   • Rows 2-5 (lens-type / material / index / stock-status) + supplier chips
//     get visual active-state toggling. Real data-filter wiring is deferred.
//
// Iron Rule 7: catalog reads via sb directly are the documented carve-out for
// global-read tables (lens_brand / lens_design / lens_variant). All other writes
// + per-tenant reads go through fetchAll.

(function () {
  'use strict';

  function _opt(value, label) {
    return '<option value="' + escapeHtml(value || '') + '">' + escapeHtml(label || '') + '</option>';
  }

  async function loadBrands() {
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
    if (!sel) return;
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
    const rows = await fetchAll('tenant_lens_stock', [
      ['variant_id', 'eq', variantId],
      ['is_deleted', 'eq', false],
    ]);
    window.LensInv.stockRows = rows;
    // Attempt to load targets (table may not exist on this tenant — fail silently).
    try {
      const targets = await fetchAll('tenant_lens_stock_target', [
        ['variant_id', 'eq', variantId],
        ['is_deleted', 'eq', false],
      ]);
      window.LensInv.targets = targets || [];
    } catch (e) {
      window.LensInv.targets = [];
    }
    window.LensInvGrid.renderGrid();
  }

  async function maybeFilterByProductionType() {
    const filter = window.LensInv.productionFilter || 'stock';
    if (filter === 'both') {
      window.LensInv.offerings = [];
      return;
    }
    const rows = await fetchAll('supplier_catalog_offering', [
      ['production_type', 'eq', filter],
      ['status', 'eq', 'active'],
      ['is_deleted', 'eq', false],
    ]);
    window.LensInv.offerings = rows;
  }

  // Generic single-select chip toggler: clears active siblings in the same row, sets clicked active.
  function _toggleChipRow(selector) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.filter-row');
        if (!row) return;
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // Row-6 brand-chip → drive hidden #filter-brand select.
  function _attachBrandChips() {
    document.querySelectorAll('[data-brand-name]').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Visual: single-select within the brand portion of row 6.
        document.querySelectorAll('[data-brand-name]').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetName = btn.dataset.brandName;
        const match = (window.LensInv.brands || []).find(b => b.name === targetName);
        const sel = document.getElementById('filter-brand');
        if (!sel) return;
        if (match) {
          sel.value = match.id;
          sel.dispatchEvent(new Event('change'));
        } else {
          // Brand chip points to a brand not present in catalog — surface gently.
          if (window.Toast) Toast.info('המותג "' + targetName + '" אינו זמין בקטלוג הדגמי — מציג ככל הסינונים');
        }
      });
    });
  }

  // Row-6 supplier chips — cosmetic only this Phase.
  function _attachSupplierChips() {
    document.querySelectorAll('[data-supplier-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-supplier-name]').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function attachHandlers() {
    // Row 1: production type (3 chips: stock/custom/both)
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
        const desSel = document.getElementById('filter-design');
        const varSel = document.getElementById('filter-variant');
        if (desSel) desSel.innerHTML = '<option value="">— בחר דגם —</option>';
        if (varSel) varSel.innerHTML = '<option value="">— בחר וריאציה —</option>';
        const grid = document.getElementById('grid-container');
        const lot = document.getElementById('lot-container');
        if (grid) grid.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
        if (lot) lot.innerHTML = '<div class="empty-state">בחר תא בטבלה לצפייה בחבילות</div>';
      });
    });

    // Rows 2-5: cosmetic single-select within each row (real filter deferred).
    _toggleChipRow('[data-lens-type]');
    _toggleChipRow('[data-material]');
    _toggleChipRow('[data-index]');
    _toggleChipRow('[data-stock-status]');

    // Row 6: brand chips → drive hidden #filter-brand; supplier chips cosmetic.
    _attachBrandChips();
    _attachSupplierChips();

    // Existing cascade (hidden brand select + visible design + variant selects).
    const brandSel = document.getElementById('filter-brand');
    const desSel = document.getElementById('filter-design');
    const varSel = document.getElementById('filter-variant');

    if (brandSel) brandSel.addEventListener('change', async (e) => {
      window.LensInv.brandId = e.target.value || null;
      window.LensInv.designId = null;
      window.LensInv.variantId = null;
      if (window.LensInv.brandId) {
        await loadDesigns(window.LensInv.brandId);
      } else if (desSel) {
        desSel.innerHTML = '<option value="">— בחר דגם —</option>';
      }
      if (varSel) varSel.innerHTML = '<option value="">— בחר וריאציה —</option>';
      const grid = document.getElementById('grid-container');
      if (grid) grid.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
    });

    if (desSel) desSel.addEventListener('change', async (e) => {
      window.LensInv.designId = e.target.value || null;
      window.LensInv.variantId = null;
      if (window.LensInv.designId) {
        await loadVariants(window.LensInv.designId);
      } else if (varSel) {
        varSel.innerHTML = '<option value="">— בחר וריאציה —</option>';
      }
      const grid = document.getElementById('grid-container');
      if (grid) grid.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
    });

    if (varSel) varSel.addEventListener('change', async (e) => {
      window.LensInv.variantId = e.target.value || null;
      if (window.LensInv.variantId) {
        await loadStockForVariant(window.LensInv.variantId);
      } else {
        const grid = document.getElementById('grid-container');
        if (grid) grid.innerHTML = '<div class="empty-state">בחר וריאציה לתצוגה</div>';
      }
    });

    // Initial production-type fetch (best-effort)
    maybeFilterByProductionType().catch(err => console.warn('production filter init failed', err));
  }

  async function reloadStock() {
    if (window.LensInv.variantId) await loadStockForVariant(window.LensInv.variantId);
  }

  window.LensInvFilters = {
    loadBrands, loadDesigns, loadVariants, loadStockForVariant, attachHandlers, reloadStock
  };
})();
