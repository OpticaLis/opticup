// catalog-brands-col.js — brands column (read + add)
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

export async function loadBrands(state) {
  const { data, error } = await sb
    .from('lens_brand')
    .select('id, name, is_published, lifecycle_status')
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('name');
  if (error) { showToast('שגיאה בטעינת מותגים: ' + error.message, 'error'); return; }
  state.brands = data ?? [];
  document.getElementById('brands-count').textContent = state.brands.length;
  renderBrandsList(state, null, '');
}

function renderBrandsList(state, onBrandSelectedFn, query) {
  const list = document.getElementById('brands-list');
  const filtered = query
    ? state.brands.filter(b => b.name.toLowerCase().includes(query))
    : state.brands;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">' + (query ? 'אין תוצאות' : 'אין מותגים — הוסף מותג חדש') + '</div>';
    return;
  }
  list.innerHTML = filtered.map(b => `
    <div class="list-item" data-id="${b.id}">
      <div>${escapeHtml(b.name)}<div class="item-meta">${b.is_published ? 'מפורסם' : 'טיוטה'}</div></div>
    </div>
  `).join('');
  list.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', () => {
      const brand = state.brands.find(b => b.id === el.dataset.id);
      list.querySelectorAll('.list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      // The first wire-call passes the callback; subsequent re-renders re-attach.
      // Pull the callback from window if not provided directly (small concession).
      const fn = onBrandSelectedFn ?? window.__catalogOnBrandSelected;
      if (fn) fn(brand);
    });
  });
  // Cache the callback for re-render reuse
  if (onBrandSelectedFn) window.__catalogOnBrandSelected = onBrandSelectedFn;
}
