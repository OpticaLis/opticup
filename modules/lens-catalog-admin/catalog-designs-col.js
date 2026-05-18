// catalog-designs-col.js — designs column (add wire-up only; rendering done by entry)
// The list render lives in lens-catalog-admin.js because it needs onBrandSelected/etc.
// This file owns the "add design" button + search filter wiring.
import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

export function wireDesignsCol(state, onDesignSelectedFn) {
  // Cache callback for use after add
  window.__catalogOnDesignSelected = onDesignSelectedFn;

  document.getElementById('designs-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? state.designs.filter(d => d.name.toLowerCase().includes(q))
      : state.designs;
    renderFilteredDesigns(filtered, state);
  });

  document.getElementById('btn-add-design').addEventListener('click', async () => {
    if (!state.selectedBrand) { showToast('בחר מותג קודם', 'error'); return; }
    const name = window.prompt('שם הדגם החדש (לדוגמה: Hilux EYAS BLC):');
    if (!name || !name.trim()) return;
    const lensType = window.prompt(
      'סוג עדשה? אחד מ: single_vision / progressive / bifocal / office / occupational',
      'single_vision'
    );
    if (!lensType || !['single_vision','progressive','bifocal','office','occupational'].includes(lensType)) {
      showToast('סוג עדשה לא חוקי', 'error');
      return;
    }
    const material = window.prompt('חומר העדשה (אופציונלי, e.g. CR-39, polycarbonate):', '');
    const { data, error } = await sb
      .from('lens_design')
      .insert({
        brand_id: state.selectedBrand.id,
        name: name.trim(),
        lens_type: lensType,
        material: material?.trim() || null,
        is_published: false,
        owner_tenant_id: null,
      })
      .select('id, brand_id, name, lens_type, material, is_published, lifecycle_status')
      .single();
    if (error) { showToast('שגיאה: ' + error.message, 'error'); return; }
    state.designs.push(data);
    state.designs.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    document.getElementById('designs-count').textContent = state.designs.length;
    renderFilteredDesigns(state.designs, state);
    showToast(`נוסף דגם: ${data.name} (טיוטה)`, 'success');
  });
}

function renderFilteredDesigns(filtered, state) {
  const list = document.getElementById('designs-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">אין תוצאות</div>';
    return;
  }
  list.innerHTML = filtered.map(d => `
    <div class="lens-cat-admin-list-item" data-id="${d.id}">
      <div>
        <div class="item-title">${esc(d.name)}</div>
        <div class="item-meta">${esc(d.lens_type)}${d.is_published ? '' : ' • טיוטה'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.lens-cat-admin-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const design = state.designs.find(d => d.id === el.dataset.id);
      list.querySelectorAll('.lens-cat-admin-list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const fn = window.__catalogOnDesignSelected;
      if (fn) fn(design);
    });
  });
}

