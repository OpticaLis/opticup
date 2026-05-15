// lens-pricing-filters.js — Stock/Custom + brand filter + data refresh
// Loads supplier_catalog_offering + lens_variant + lens_design + pricing_overlay
// and computes effective_price for each offering.

(function () {
  'use strict';

  async function loadBrands() {
    const { data, error } = await sb.from('lens_brand')
      .select('id, name')
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    if (error) throw error;
    const sel = document.getElementById('filter-brand');
    sel.innerHTML = '<option value="">— הכל —</option>' +
      (data || []).map(b => '<option value="' + escapeHtml(b.id) + '">' + escapeHtml(b.name) + '</option>').join('');
  }

  async function loadOfferings() {
    const rows = await fetchAll('supplier_catalog_offering', [
      ['production_type', 'eq', window.LensPricing.productionFilter],
      ['status', 'eq', 'active'],
      ['is_deleted', 'eq', false],
    ]);
    window.LensPricing.offerings = rows || [];
  }

  async function loadVariantsAndDesigns() {
    const variantIds = Array.from(new Set(window.LensPricing.offerings.map(o => o.variant_id))).filter(Boolean);
    if (!variantIds.length) {
      window.LensPricing.variants = [];
      window.LensPricing.designs = [];
      return;
    }
    const { data: vs, error: vErr } = await sb.from('lens_variant')
      .select('id, design_id, display_id, refractive_index, coating, tint')
      .in('id', variantIds)
      .eq('is_deleted', false);
    if (vErr) throw vErr;
    window.LensPricing.variants = vs || [];

    const designIds = Array.from(new Set(window.LensPricing.variants.map(v => v.design_id))).filter(Boolean);
    if (!designIds.length) {
      window.LensPricing.designs = [];
      return;
    }
    const { data: ds, error: dErr } = await sb.from('lens_design')
      .select('id, name, brand_id')
      .in('id', designIds)
      .eq('is_deleted', false);
    if (dErr) throw dErr;
    window.LensPricing.designs = ds || [];
  }

  async function loadOverlays() {
    const rows = await fetchAll('pricing_overlay', [
      ['is_deleted', 'eq', false],
    ]);
    window.LensPricing.overlays = rows || [];
  }

  async function computeEffectivePrices() {
    const tenantId = getTenantId();
    if (!tenantId) return;
    const out = {};
    // Sequential RPC calls — small N expected (Phase 1B-foundation, demo has 1 offering).
    // For larger N, batch via a wrapper RPC in a future phase.
    for (const off of window.LensPricing.offerings) {
      try {
        const { data, error } = await sb.rpc('effective_price', {
          p_offering_id: off.id,
          p_tenant_id: tenantId,
          p_as_of_ts: new Date().toISOString(),
        });
        if (error) {
          console.warn('[lens-pricing] effective_price failed for', off.id, error.message);
          out[off.id] = null;
        } else {
          out[off.id] = data;
        }
      } catch (e) {
        console.warn('[lens-pricing] effective_price exception', e);
        out[off.id] = null;
      }
    }
    window.LensPricing.effectivePrices = out;
  }

  async function refreshPricingList() {
    const cont = document.getElementById('pricing-container');
    cont.innerHTML = '<div class="empty-state">טוען…</div>';
    document.getElementById('pricing-summary').textContent = '';
    try {
      await loadOfferings();
      await loadVariantsAndDesigns();
      await loadOverlays();
      await computeEffectivePrices();
      window.LensPricingGrid.renderGrid();
    } catch (err) {
      console.error('[lens-pricing] refresh failed', err);
      cont.innerHTML = '<div class="empty-state">שגיאה בטעינה: ' + escapeHtml(String(err.message || err)) + '</div>';
    }
  }

  function attachHandlers() {
    document.querySelectorAll('[data-production-filter]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('[data-production-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.LensPricing.productionFilter = btn.dataset.productionFilter;
        window.LensPricing.selectedOfferingIds.clear();
        await refreshPricingList();
      });
    });

    document.getElementById('filter-brand').addEventListener('change', async (e) => {
      window.LensPricing.brandId = e.target.value || null;
      window.LensPricing.selectedOfferingIds.clear();
      await refreshPricingList();
    });

    document.getElementById('btn-refresh').addEventListener('click', () => refreshPricingList());

    document.getElementById('btn-bulk-apply').addEventListener('click', () => {
      window.LensPricingBulk.openBulkModal();
    });
  }

  window.LensPricingFilters = { loadBrands, refreshPricingList, attachHandlers, computeEffectivePrices };
})();
