// catalog-designs-col.js — Series column (col 3 of the 4-col grid).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: renamed from "designs" to "סדרות".
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18:
//   - Filters lens_design by state.activeProductTab → product_type
//   - Category select inside the create modal swaps option set per active tab
//     (glasses: single_vision/progressive/bifocal/office/occupational;
//      contact_lens: soft_contact/hard_contact)
//   - Replaces window.prompt() flow with modal via catalog-modal-helpers

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';
import { openModal, validateRequired, closeModal } from './catalog-modal-helpers.js';

// Category options per product type (mockup §line 578-585 + repo lens_type values)
const LENS_TYPE_OPTIONS = {
  glasses: [
    { value: 'single_vision', label: 'Single Vision' },
    { value: 'bifocal',       label: 'Bifocal' },
    { value: 'progressive',   label: 'Progressive / Multifocal' },
    { value: 'office',        label: 'Office / Computer' },
    { value: 'occupational',  label: 'Occupational' },
  ],
  contact_lens: [
    { value: 'soft_contact',  label: 'Soft Contact' },
    { value: 'hard_contact',  label: 'Hard / RGP Contact' },
  ],
};

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

  document.getElementById('btn-add-design').addEventListener('click', () => openAddDesignModal(state));
}

// Loads designs for the currently-selected brand, filtered by active product tab.
// Replaces the old inline loader in lens-catalog-admin.js onBrandSelected().
export async function loadDesignsForBrand(state) {
  const list = document.getElementById('designs-list');
  if (!state.selectedBrand) {
    list.innerHTML = '<div class="empty-state">בחר מותג ←</div>';
    document.getElementById('designs-count').textContent = '0';
    return;
  }
  const { data, error } = await sb
    .from('lens_design')
    .select('id, brand_id, name, lens_type, product_type, material, is_published, lifecycle_status, version')
    .eq('brand_id', state.selectedBrand.id)
    .eq('product_type', state.activeProductTab)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('name');
  if (error) { showToast('שגיאה בטעינת סדרות: ' + error.message, 'error'); return; }
  state.designs = data ?? [];
  document.getElementById('designs-count').textContent = state.designs.length;
  renderFilteredDesigns(state.designs, state);
}

function renderFilteredDesigns(filtered, state) {
  const list = document.getElementById('designs-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">אין סדרות למותג זה</div>';
    return;
  }
  list.innerHTML = filtered.map(d => {
    const chip = d.is_published
      ? '<span class="series-chip stock">פעיל</span>'
      : '<span class="series-chip draft">טיוטה</span>';
    return `
      <div class="lens-cat-admin-list-item" data-id="${esc(d.id)}">
        <div>
          <div class="item-title">${esc(d.name)}</div>
          <div class="item-meta">${chip} ${esc(d.lens_type)}</div>
        </div>
      </div>
    `;
  }).join('');
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

// Mockup-faithful create-series modal. Schema swaps category options per product tab.
function openAddDesignModal(state) {
  if (!state.selectedBrand) { showToast('בחר מותג קודם', 'error'); return; }
  const productType = state.activeProductTab;
  const options = LENS_TYPE_OPTIONS[productType] ?? LENS_TYPE_OPTIONS.glasses;
  const optionsHtml = options.map(o =>
    `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');

  const bodyHtml = `
    <div class="lens-catalog-admin-modal-form">
      <div class="field field-required">
        <label for="modal-design-name">שם הסדרה</label>
        <input type="text" id="modal-design-name" data-required name="name"
               placeholder="לדוגמה: Hilux EYAS BLC" autocomplete="off" />
      </div>
      <div class="field field-required">
        <label for="modal-design-lens-type">קטגוריה</label>
        <select id="modal-design-lens-type" data-required name="lens_type">${optionsHtml}</select>
      </div>
      <div class="field">
        <label for="modal-design-material">חומר (אופציונלי)</label>
        <input type="text" id="modal-design-material" name="material"
               placeholder="CR-39 / polycarbonate / hydrogel / ..." autocomplete="off" />
      </div>
    </div>
  `;

  const modalEl = openModal({
    title: productType === 'glasses' ? '➕ סדרת עדשות משקפיים חדשה' : '➕ סדרת עדשות מגע חדשה',
    bodyHtml,
    submitLabel: 'צור סדרה',
    cancelLabel: 'ביטול',
    onSubmit: async (formEl) => {
      const v = validateRequired(formEl);
      if (!v.ok) {
        showToast('שדות חובה חסרים: ' + v.missing.join(', '), 'error');
        return false;
      }
      const name = formEl.querySelector('#modal-design-name').value.trim();
      const lensType = formEl.querySelector('#modal-design-lens-type').value;
      const material = formEl.querySelector('#modal-design-material').value.trim() || null;
      const { data, error } = await sb
        .from('lens_design')
        .insert({
          brand_id: state.selectedBrand.id,
          name,
          lens_type: lensType,
          product_type: productType,
          material,
          is_published: false,
          owner_tenant_id: null,
        })
        .select('id, brand_id, name, lens_type, product_type, material, is_published, lifecycle_status, version')
        .single();
      if (error) { showToast('שגיאה: ' + error.message, 'error'); return false; }
      state.designs.push(data);
      state.designs.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      document.getElementById('designs-count').textContent = state.designs.length;
      renderFilteredDesigns(state.designs, state);
      showToast(`נוצרה סדרה: ${data.name} (טיוטה)`, 'success');
      closeModal(modalEl);
      return true;
    },
  });
}
