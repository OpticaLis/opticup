// catalog-variants-col.js — variants column (add wire-up + search)
import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

export function wireVariantsCol(state, onVariantSelectedFn) {
  window.__catalogOnVariantSelected = onVariantSelectedFn;

  document.getElementById('variants-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? state.variants.filter(v =>
          v.display_id.toLowerCase().includes(q) ||
          String(v.refractive_index).includes(q) ||
          (v.coating ?? '').toLowerCase().includes(q)
        )
      : state.variants;
    renderFiltered(filtered, state);
  });

  document.getElementById('btn-add-variant').addEventListener('click', async () => {
    if (!state.selectedDesign) { showToast('בחר דגם קודם', 'error'); return; }
    // Quick prompt-driven add — Phase 1B will replace with proper modal
    const idx = parseFloat(window.prompt('Refractive index (e.g. 1.50, 1.60, 1.67, 1.74):', '1.60'));
    if (!(idx >= 1.40 && idx <= 2.00)) { showToast('Index לא חוקי', 'error'); return; }
    const dia = parseInt(window.prompt('Diameter mm (50-90):', '70'), 10);
    if (!(dia >= 50 && dia <= 90)) { showToast('Diameter לא חוקי', 'error'); return; }
    const coating = window.prompt('Coating (אופציונלי):', '') || null;
    const tint = window.prompt('Tint (אופציונלי):', '') || null;
    const sphMin = parseFloat(window.prompt('SPH min (e.g. -10):', '-10') ?? '');
    const sphMax = parseFloat(window.prompt('SPH max (e.g. +6):', '6') ?? '');
    if (!(sphMin <= sphMax)) { showToast('SPH range לא חוקי', 'error'); return; }
    // RPC for display_id
    const { data: dispId, error: dispErr } = await sb.rpc('next_lens_variant_display_id');
    if (dispErr) { showToast('שגיאה ב-display_id RPC: ' + dispErr.message, 'error'); return; }
    const { data, error } = await sb
      .from('lens_variant')
      .insert({
        design_id: state.selectedDesign.id,
        display_id: dispId,
        refractive_index: idx,
        diameter_mm: dia,
        coating, tint,
        sph_min: sphMin, sph_max: sphMax, sph_step: 0.25,
        is_published: false,
        owner_tenant_id: null,
      })
      .select('id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, cyl_min, cyl_max, add_min, add_max, is_published, lifecycle_status, design_id')
      .single();
    if (error) { showToast('שגיאה: ' + error.message, 'error'); return; }
    state.variants.push(data);
    state.variants.sort((a, b) => a.refractive_index - b.refractive_index || a.diameter_mm - b.diameter_mm);
    document.getElementById('variants-count').textContent = state.variants.length;
    renderFiltered(state.variants, state);
    showToast(`נוספה וריאציה: ${data.display_id} (טיוטה)`, 'success');
  });
}

function renderFiltered(filtered, state) {
  const list = document.getElementById('variants-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">אין תוצאות</div>';
    return;
  }
  list.innerHTML = filtered.map(v => `
    <div class="list-item" data-id="${v.id}">
      <div>${esc(v.display_id)}
        <div class="item-meta">n=${v.refractive_index} • ⌀${v.diameter_mm}mm${v.coating ? ' • ' + esc(v.coating) : ''}${v.is_published ? '' : ' • טיוטה'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', () => {
      const variant = state.variants.find(v => v.id === el.dataset.id);
      list.querySelectorAll('.list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const fn = window.__catalogOnVariantSelected;
      if (fn) fn(variant);
    });
  });
}

