// catalog-suppliers-col.js — Suppliers column (col 1 of the 4-col grid).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: New column added per mockup §COL 1.
//
// Suppliers are TENANT-SCOPED (not platform-global), so this column is
// dependent on the tenant selector at the top of the page. When the user
// changes the tenant pill, suppliers are re-loaded for that tenant.
// Click-select drives the downstream brand filter — see catalog-brands-col.js
// loadBrandsForSupplier().

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

export function wireSuppliersCol(state, onSupplierSelectedFn) {
  // Cache callback for re-render use
  window.__catalogOnSupplierSelected = onSupplierSelectedFn;

  document.getElementById('suppliers-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderSuppliersList(state, q);
  });

  document.getElementById('btn-add-supplier').addEventListener('click', async () => {
    if (!state.selectedTenant) {
      showToast('בחר טננט בסרגל העליון לפני הוספת ספק', 'error');
      return;
    }
    const name = window.prompt('שם הספק החדש (פר-טננט):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const { data, error } = await sb
      .from('suppliers')
      .insert({ tenant_id: state.selectedTenant.id, name: trimmed, active: true })
      .select('id, name, active, supplier_number')
      .single();
    if (error) { showToast('שגיאה: ' + error.message, 'error'); return; }
    state.suppliers.push({ ...data, brand_count: 0 });
    state.suppliers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    document.getElementById('suppliers-count').textContent = state.suppliers.length;
    renderSuppliersList(state, '');
    showToast(`נוסף ספק: ${trimmed}`, 'success');
  });
}

// Loads suppliers for the currently-selected tenant. Also computes brand_count
// per supplier via supplier_brand_distribution (M:N link to lens_brand).
// Empty/zero counts are normal (clicking still works; brand col shows empty).
export async function loadSuppliers(state) {
  if (!state.selectedTenant) {
    // No tenant selected — empty state
    state.suppliers = [];
    document.getElementById('suppliers-count').textContent = '0';
    document.getElementById('suppliers-list').innerHTML =
      '<div class="empty-state">בחר טננט בסרגל העליון</div>';
    return;
  }
  const tid = state.selectedTenant.id;
  // Load suppliers + their distinct brand counts in one round-trip
  const { data: suppliers, error: sErr } = await sb
    .from('suppliers')
    .select('id, name, active, supplier_number')
    .eq('tenant_id', tid)
    .order('name');
  if (sErr) { showToast('שגיאה בטעינת ספקים: ' + sErr.message, 'error'); return; }
  // Pull distribution rows for the tenant to compute brand_count per supplier
  const { data: dist, error: dErr } = await sb
    .from('supplier_brand_distribution')
    .select('supplier_id, brand_id')
    .eq('tenant_id', tid)
    .eq('is_deleted', false);
  if (dErr) { showToast('שגיאה בטעינת חלוקת מותגים: ' + dErr.message, 'error'); return; }
  const countMap = new Map();
  (dist ?? []).forEach(d => {
    countMap.set(d.supplier_id, (countMap.get(d.supplier_id) ?? 0) + 1);
  });
  state.suppliers = (suppliers ?? []).map(s => ({
    ...s,
    brand_count: countMap.get(s.id) ?? 0,
  }));
  document.getElementById('suppliers-count').textContent = state.suppliers.length;
  renderSuppliersList(state, '');
}

function renderSuppliersList(state, query) {
  const list = document.getElementById('suppliers-list');
  const filtered = query
    ? state.suppliers.filter(s => s.name.toLowerCase().includes(query))
    : state.suppliers;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">' +
      (query ? 'אין תוצאות' : 'אין ספקים בטננט זה') + '</div>';
    return;
  }
  list.innerHTML = filtered.map(s => `
    <div class="lens-cat-admin-list-item" data-id="${esc(s.id)}">
      <div>
        <div class="item-title">${esc(s.name)}</div>
        ${s.supplier_number != null
          ? `<div class="item-meta">#${s.supplier_number}${!s.active ? ' · לא פעיל' : ''}</div>`
          : (!s.active ? '<div class="item-meta">לא פעיל</div>' : '')}
      </div>
      <span class="item-count">${s.brand_count}</span>
    </div>
  `).join('');
  list.querySelectorAll('.lens-cat-admin-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const supplier = state.suppliers.find(s => s.id === el.dataset.id);
      list.querySelectorAll('.lens-cat-admin-list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const fn = window.__catalogOnSupplierSelected;
      if (fn) fn(supplier);
    });
  });
}
