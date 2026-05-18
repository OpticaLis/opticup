// catalog-brands-col.js — Brands column (col 2 of the 4-col grid).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: filter by selected supplier.
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18:
//   - Brand-card count badge reflects distinct lens_design IDs for the
//     active product_type tab (not raw supplier_brand_distribution count)
//   - Zero-series hint ("⚠ ללא סדרות") rendered when count = 0
//   - Per-brand quick-import button rendered (DISABLED — Stage 2B)
//   - "➕ מותג חדש" uses proper modal (no window.prompt)

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml } from './lens-catalog-admin.js';
import { openModal, validateRequired, closeModal } from './catalog-modal-helpers.js';

export function wireBrandsCol(state, onBrandSelected) {
  // Search filter
  document.getElementById('brands-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderBrandsList(state, onBrandSelected, q);
  });
  // Add-brand button — opens modal (Stage 2A) instead of window.prompt
  document.getElementById('btn-add-brand').addEventListener('click', () => openAddBrandModal(state, onBrandSelected));
}

// Loads brands distributed by the currently-selected supplier within the
// currently-selected tenant. Each brand carries a `design_count` for the
// CURRENT product_type tab — recomputed when tab changes via Promise.all.
export async function loadBrandsForSupplier(state) {
  if (!state.selectedSupplier || !state.selectedTenant) {
    state.brands = [];
    document.getElementById('brands-count').textContent = '0';
    document.getElementById('brands-list').innerHTML =
      '<div class="empty-state">בחר ספק ←</div>';
    return;
  }
  // Step 1: distribution rows for (tenant, supplier)
  const { data: dist, error: dErr } = await sb
    .from('supplier_brand_distribution')
    .select('brand_id')
    .eq('tenant_id', state.selectedTenant.id)
    .eq('supplier_id', state.selectedSupplier.id)
    .eq('is_deleted', false);
  if (dErr) { showToast('שגיאה בטעינת חלוקת מותגים: ' + dErr.message, 'error'); return; }
  const brandIds = Array.from(new Set((dist ?? []).map(d => d.brand_id)));
  if (brandIds.length === 0) {
    state.brands = [];
    document.getElementById('brands-count').textContent = '0';
    document.getElementById('brands-list').innerHTML =
      '<div class="empty-state">אין מותגים לספק זה</div>';
    return;
  }
  // Step 2: global lens_brand rows for those ids
  const { data: brands, error: bErr } = await sb
    .from('lens_brand')
    .select('id, name, is_published, lifecycle_status')
    .in('id', brandIds)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('name');
  if (bErr) { showToast('שגיאה בטעינת מותגים: ' + bErr.message, 'error'); return; }
  // Step 3: design_count per brand for the active product_type (Stage 2A)
  const { data: designs, error: dgErr } = await sb
    .from('lens_design')
    .select('id, brand_id')
    .in('brand_id', brandIds)
    .eq('product_type', state.activeProductTab)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false);
  if (dgErr) { showToast('שגיאה בספירת סדרות: ' + dgErr.message, 'error'); return; }
  const designCountMap = new Map();
  (designs ?? []).forEach(d => {
    designCountMap.set(d.brand_id, (designCountMap.get(d.brand_id) ?? 0) + 1);
  });
  state.brands = (brands ?? []).map(b => ({
    ...b,
    design_count: designCountMap.get(b.id) ?? 0,
  }));
  document.getElementById('brands-count').textContent = state.brands.length;
  renderBrandsList(state, window.__catalogOnBrandSelected ?? null, '');
}

// Back-compat alias: legacy callers still invoke `loadBrands(state)` from
// orchestrator entry. After M1_LENS_CATALOG_TRUE_REBUILD this delegates to
// loadBrandsForSupplier (which handles the no-supplier case gracefully).
export async function loadBrands(state) {
  return loadBrandsForSupplier(state);
}

function renderBrandsList(state, onBrandSelectedFn, query) {
  const list = document.getElementById('brands-list');
  const filtered = query
    ? state.brands.filter(b => b.name.toLowerCase().includes(query))
    : state.brands;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">' + (query ? 'אין תוצאות' : 'אין מותגים לספק זה') + '</div>';
    return;
  }
  list.innerHTML = filtered.map(b => {
    const designCount = b.design_count ?? 0;
    const stats = designCount === 0
      ? '<span class="no-series-hint">⚠ ללא סדרות</span>'
      : `<span>${designCount} סדרות</span>`;
    return `
      <div class="brand-card lens-cat-admin-brand-card" data-id="${escapeHtml(b.id)}">
        <div class="brand-top">
          <div class="brand-name">${escapeHtml(b.name)}</div>
          <span class="item-count">${designCount}</span>
        </div>
        <div class="brand-stats">${stats}</div>
        <button class="quick-import" data-brand-id="${escapeHtml(b.id)}"
                title="זמין בשלב 2ב" disabled type="button">📥 ייבוא קטלוג מותג</button>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.brand-card').forEach(el => {
    el.addEventListener('click', (evt) => {
      // Don't trigger card selection when clicking the disabled quick-import button
      if (evt.target.closest('.quick-import')) return;
      const brand = state.brands.find(b => b.id === el.dataset.id);
      list.querySelectorAll('.brand-card').forEach(x => x.classList.remove('selected', 'active'));
      el.classList.add('selected', 'active');
      const fn = onBrandSelectedFn ?? window.__catalogOnBrandSelected;
      if (fn) fn(brand);
    });
  });
  if (onBrandSelectedFn) window.__catalogOnBrandSelected = onBrandSelectedFn;
}

// Mockup-faithful create-brand modal.
function openAddBrandModal(state, onBrandSelectedFn) {
  const bodyHtml = `
    <div class="lens-catalog-admin-modal-form">
      <div class="field field-required">
        <label for="modal-brand-name">שם המותג</label>
        <input type="text" id="modal-brand-name" data-required name="name"
               placeholder="HOYA / Essilor / Tokai / ..." autocomplete="off" />
      </div>
      <div class="modal-hint">
        מותג גלובל — נראה לכל הטננטים. שיוך לספק מתבצע דרך
        חלוקת-מותגים פר-טננט (לא נכלל ביצירה הראשונית).
      </div>
    </div>
  `;
  const modalEl = openModal({
    title: '➕ מותג חדש',
    bodyHtml,
    submitLabel: 'צור מותג',
    cancelLabel: 'ביטול',
    onSubmit: async (formEl) => {
      const v = validateRequired(formEl);
      if (!v.ok) {
        showToast('שדות חובה חסרים: ' + v.missing.join(', '), 'error');
        return false;
      }
      const name = formEl.querySelector('#modal-brand-name').value.trim();
      const { data, error } = await sb
        .from('lens_brand')
        .insert({ name, is_published: false, owner_tenant_id: null })
        .select('id, name, is_published, lifecycle_status')
        .single();
      if (error) { showToast('שגיאה: ' + error.message, 'error'); return false; }
      state.brands.push({ ...data, design_count: 0 });
      state.brands.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      document.getElementById('brands-count').textContent = state.brands.length;
      renderBrandsList(state, onBrandSelectedFn, '');
      showToast(`נוסף מותג: ${name} (טיוטה — שייך לספק דרך חלוקת מותגים)`, 'success');
      closeModal(modalEl);
      return true;
    },
  });
}
