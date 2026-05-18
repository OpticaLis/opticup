// catalog-brands-col.js — Brands column (col 2 of the 4-col grid).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: rewired to filter by selected supplier.
// When state.selectedSupplier is set, brands are filtered via supplier_brand_distribution
// (tenant-scoped M:N). When no supplier selected → empty state ("בחר ספק ←").
// Brands themselves remain GLOBAL (owner_tenant_id IS NULL) — the M:N table scopes
// which subset is distributed by which supplier within a tenant.

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml } from './lens-catalog-admin.js';

export function wireBrandsCol(state, onBrandSelected) {
  // Search filter
  document.getElementById('brands-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderBrandsList(state, onBrandSelected, q);
  });
  // Add-brand button
  document.getElementById('btn-add-brand').addEventListener('click', async () => {
    const name = window.prompt('שם המותג החדש (מותג גלובל — נראה לכל הטננטים):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const { data, error } = await sb
      .from('lens_brand')
      .insert({ name: trimmed, is_published: false, owner_tenant_id: null })
      .select('id, name')
      .single();
    if (error) { showToast('שגיאה: ' + error.message, 'error'); return; }
    state.brands.push({ ...data, is_published: false, lifecycle_status: 'active' });
    state.brands.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    document.getElementById('brands-count').textContent = state.brands.length;
    renderBrandsList(state, onBrandSelected, '');
    showToast(`נוסף מותג: ${trimmed} (טיוטה — לחץ פרסם כשמוכן)`, 'success');
  });
}

// Loads brands distributed by the currently-selected supplier within the
// currently-selected tenant. If no supplier (or no tenant) is selected,
// state.brands becomes empty and the column renders an empty hint.
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
  state.brands = brands ?? [];
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
  list.innerHTML = filtered.map(b => `
    <div class="lens-cat-admin-list-item" data-id="${b.id}">
      <div>
        <div class="item-title">${escapeHtml(b.name)}</div>
        <div class="item-meta">${b.is_published ? 'מפורסם' : 'טיוטה'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.lens-cat-admin-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const brand = state.brands.find(b => b.id === el.dataset.id);
      list.querySelectorAll('.lens-cat-admin-list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const fn = onBrandSelectedFn ?? window.__catalogOnBrandSelected;
      if (fn) fn(brand);
    });
  });
  if (onBrandSelectedFn) window.__catalogOnBrandSelected = onBrandSelectedFn;
}
