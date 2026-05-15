// lens-active-designs-tree.js — brand selector + designs list rendering
// Joins lens_design ← supplier_catalog_offering (per production filter)
// ← tenant_active_offerings (per current tenant) → show active state.

(function () {
  'use strict';

  async function loadBrands() {
    const { data, error } = await sb.from('lens_brand')
      .select('id, name')
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    if (error) throw error;
    window.LensAD.brands = data || [];
    const sel = document.getElementById('filter-brand');
    sel.innerHTML = '<option value="">— הכל —</option>' +
      window.LensAD.brands.map(b => '<option value="' + escapeHtml(b.id) + '">' + escapeHtml(b.name) + '</option>').join('');
  }

  async function loadOfferings() {
    // Tenant-scoped via fetchAll (Iron Rule 7)
    const rows = await fetchAll('supplier_catalog_offering', [
      ['production_type', 'eq', window.LensAD.productionFilter],
      ['status', 'eq', 'active'],
      ['is_deleted', 'eq', false],
    ]);
    window.LensAD.offerings = rows || [];
  }

  async function loadActiveOfferings() {
    const rows = await fetchAll('tenant_active_offerings', [
      ['is_deleted', 'eq', false],
    ]);
    window.LensAD.activeOfferings = rows || [];
  }

  async function loadDesignsByBrand(brandId) {
    let q = sb.from('lens_design')
      .select('id, name, lens_type, brand_id')
      .eq('is_deleted', false);
    if (brandId) q = q.eq('brand_id', brandId);
    const { data, error } = await q.order('name', { ascending: true });
    if (error) throw error;
    window.LensAD.designs = data || [];
  }

  async function refreshDesignsList() {
    const cont = document.getElementById('designs-container');
    cont.innerHTML = '<div class="empty-state">טוען…</div>';
    try {
      await Promise.all([loadOfferings(), loadActiveOfferings(), loadDesignsByBrand(window.LensAD.brandId)]);
      renderDesignsTable();
    } catch (err) {
      console.error('[lens-active-designs] refresh failed', err);
      cont.innerHTML = '<div class="empty-state">שגיאה בטעינה</div>';
    }
  }

  function renderDesignsTable() {
    const cont = document.getElementById('designs-container');
    const offeringsByDesign = new Map(); // design_id → [offering rows]
    // We need to JOIN offering→variant→design. The offering refs variant_id, not design_id directly.
    // For Phase 1B-foundation, fetch variants for the offerings to resolve design_id.
    fetchVariantsForOfferings().then(variantById => {
      window.LensAD.offerings.forEach(o => {
        const v = variantById.get(o.variant_id);
        if (!v) return;
        if (!offeringsByDesign.has(v.design_id)) offeringsByDesign.set(v.design_id, []);
        offeringsByDesign.get(v.design_id).push(o);
      });

      const activeByOfferingId = new Map(
        window.LensAD.activeOfferings.map(a => [a.offering_id, a])
      );

      const rows = window.LensAD.designs
        .filter(d => offeringsByDesign.has(d.id))
        .map(d => {
          const offs = offeringsByDesign.get(d.id);
          const sample = offs[0];
          const active = activeByOfferingId.get(sample.id);
          const isActive = active && active.is_active === true;
          return {
            design: d,
            offering: sample,
            isActive: !!isActive,
            activeId: active ? active.id : null,
          };
        });

      if (!rows.length) {
        cont.innerHTML = '<div class="empty-state">אין דגמים זמינים לסינון הנוכחי</div>';
        return;
      }

      let html = '<table class="designs"><thead><tr><th>דגם</th><th>סוג עדשה</th><th>וריאנט #</th><th>סטטוס</th><th>פעולה</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr' + (r.isActive ? ' class="is-active"' : '') + ' data-design-id="' + escapeHtml(r.design.id) + '" data-offering-id="' + escapeHtml(r.offering.id) + '">' +
                '<td>' + escapeHtml(r.design.name) + '</td>' +
                '<td>' + escapeHtml(r.design.lens_type || '—') + '</td>' +
                '<td>' + escapeHtml(String(offeringsByDesign.get(r.design.id).length)) + '</td>' +
                '<td>' + (r.isActive ? '✅ פעיל' : '⚪ לא פעיל') + '</td>' +
                '<td><button class="toggle-btn ' + (r.isActive ? 'deactivate' : 'activate') + '" data-action="' + (r.isActive ? 'deactivate' : 'activate') + '" data-offering-id="' + escapeHtml(r.offering.id) + '">' +
                (r.isActive ? '⛔ בטל' : '✓ הפעל') + '</button></td>' +
                '</tr>';
      });
      html += '</tbody></table>';
      cont.innerHTML = html;

      // Bind toggle handlers
      cont.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const offeringId = btn.dataset.offeringId;
          window.LensADToggle.toggleOffering(offeringId, action === 'activate');
        });
      });
    }).catch(err => {
      console.error('[lens-active-designs] variant fetch failed', err);
      cont.innerHTML = '<div class="empty-state">שגיאה בטעינת וריאנטים</div>';
    });
  }

  async function fetchVariantsForOfferings() {
    const variantIds = Array.from(new Set(window.LensAD.offerings.map(o => o.variant_id))).filter(Boolean);
    if (!variantIds.length) return new Map();
    const { data, error } = await sb.from('lens_variant')
      .select('id, design_id, display_id')
      .in('id', variantIds)
      .eq('is_deleted', false);
    if (error) throw error;
    return new Map((data || []).map(v => [v.id, v]));
  }

  function attachHandlers() {
    document.querySelectorAll('[data-production-filter]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('[data-production-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.LensAD.productionFilter = btn.dataset.productionFilter;
        await refreshDesignsList();
      });
    });

    document.getElementById('filter-brand').addEventListener('change', async (e) => {
      window.LensAD.brandId = e.target.value || null;
      await refreshDesignsList();
    });
  }

  window.LensADTree = { loadBrands, refreshDesignsList, attachHandlers };
})();
