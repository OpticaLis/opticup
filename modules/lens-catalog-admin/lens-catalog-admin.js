// lens-catalog-admin.js — entry point for lens-catalog-admin.html
// Auth gate (is_platform_super_admin) → load brands → wire 4-col drilldown.
// Per Iron Rule 12: ≤350 LOC. This file orchestrates; sub-modules do the work.
// Per Iron Rule 23: SUPABASE keys from inline constants (read from env at deploy).

import { gateAuthOrRedirect, sb } from './catalog-auth.js';
import { wireBrandsCol, loadBrands } from './catalog-brands-col.js';
import { wireDesignsCol } from './catalog-designs-col.js';
import { wireVariantsCol } from './catalog-variants-col.js';
import { wireDetailPane } from './catalog-detail-pane.js';
import { wireImportFlow } from './catalog-import.js';

// Shared state — small enough to inline; refactor to a store if it grows
const state = {
  selectedBrand: null,    // { id, name }
  selectedDesign: null,   // { id, brand_id, name, lens_type }
  selectedVariant: null,  // full variant row
  selectedTenant: null,   // { id, name, slug }
  brands: [],
  designs: [],
  variants: [],
  tenants: [],
};

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Gate on platform super admin (RPC server-side check)
  const okay = await gateAuthOrRedirect();
  if (!okay) return;
  document.getElementById('app').style.display = 'block';

  // 2. Load tenant list for the offerings selector
  await loadTenantList();

  // 3. Wire columns
  wireBrandsCol(state, onBrandSelected);
  wireDesignsCol(state, onDesignSelected);
  wireVariantsCol(state, onVariantSelected);
  wireDetailPane(state);
  wireImportFlow(state, () => loadBrands(state));  // refresh brands after import

  // 4. Initial brand load
  await loadBrands(state);

  // 5. Tenant selector wiring
  document.getElementById('tenant-select').addEventListener('change', (e) => {
    state.selectedTenant = state.tenants.find(t => t.id === e.target.value) ?? null;
    // Refresh detail pane if a variant is selected (offerings depend on tenant)
    if (state.selectedVariant) {
      import('./catalog-detail-pane.js').then(m => m.renderDetailPane(state));
    }
  });
});

// Selection callbacks — clear downstream + load next column
async function onBrandSelected(brand) {
  state.selectedBrand = brand;
  state.selectedDesign = null;
  state.selectedVariant = null;
  state.designs = [];
  state.variants = [];
  document.getElementById('designs-context').textContent = `מותג: ${brand.name}`;
  document.getElementById('variants-context').textContent = 'בחר דגם ←';
  document.getElementById('detail-context').textContent = 'בחר וריאציה';
  document.getElementById('variants-list').innerHTML = '<div class="empty-state">בחר דגם</div>';
  document.getElementById('detail-pane').innerHTML = '<div class="empty-state">בחר וריאציה</div>';
  document.getElementById('designs-search').disabled = false;
  document.getElementById('btn-add-design').disabled = false;
  document.getElementById('variants-search').disabled = true;
  document.getElementById('btn-add-variant').disabled = true;
  // Load designs for this brand
  const { data, error } = await sb
    .from('lens_design')
    .select('id, brand_id, name, lens_type, material, is_published, lifecycle_status')
    .eq('brand_id', brand.id)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('name');
  if (error) { showToast('שגיאה בטעינת דגמים: ' + error.message, 'error'); return; }
  state.designs = data ?? [];
  document.getElementById('designs-count').textContent = state.designs.length;
  renderDesignsList();
}

function renderDesignsList() {
  const list = document.getElementById('designs-list');
  if (state.designs.length === 0) {
    list.innerHTML = '<div class="empty-state">אין דגמים — הוסף דגם חדש</div>';
    return;
  }
  list.innerHTML = state.designs.map(d => `
    <div class="list-item" data-id="${d.id}">
      <div>${escapeHtml(d.name)}<div class="item-meta">${d.lens_type}${d.is_published ? '' : ' • טיוטה'}</div></div>
    </div>
  `).join('');
  list.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', () => {
      const design = state.designs.find(d => d.id === el.dataset.id);
      list.querySelectorAll('.list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      onDesignSelected(design);
    });
  });
}

async function onDesignSelected(design) {
  state.selectedDesign = design;
  state.selectedVariant = null;
  state.variants = [];
  document.getElementById('variants-context').textContent = `דגם: ${design.name}`;
  document.getElementById('detail-context').textContent = 'בחר וריאציה';
  document.getElementById('detail-pane').innerHTML = '<div class="empty-state">בחר וריאציה</div>';
  document.getElementById('variants-search').disabled = false;
  document.getElementById('btn-add-variant').disabled = false;
  const { data, error } = await sb
    .from('lens_variant')
    .select('id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, cyl_min, cyl_max, add_min, add_max, is_published, lifecycle_status, design_id')
    .eq('design_id', design.id)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('refractive_index')
    .order('diameter_mm');
  if (error) { showToast('שגיאה בטעינת וריאציות: ' + error.message, 'error'); return; }
  state.variants = data ?? [];
  document.getElementById('variants-count').textContent = state.variants.length;
  renderVariantsList();
}

function renderVariantsList() {
  const list = document.getElementById('variants-list');
  if (state.variants.length === 0) {
    list.innerHTML = '<div class="empty-state">אין וריאציות — הוסף וריאציה חדשה</div>';
    return;
  }
  list.innerHTML = state.variants.map(v => `
    <div class="list-item" data-id="${v.id}">
      <div>${escapeHtml(v.display_id)}
        <div class="item-meta">n=${v.refractive_index} • ⌀${v.diameter_mm}mm${v.coating ? ' • ' + escapeHtml(v.coating) : ''}${v.is_published ? '' : ' • טיוטה'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', () => {
      const variant = state.variants.find(v => v.id === el.dataset.id);
      list.querySelectorAll('.list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      onVariantSelected(variant);
    });
  });
}

async function onVariantSelected(variant) {
  state.selectedVariant = variant;
  document.getElementById('detail-context').textContent =
    `${variant.display_id} • ${state.selectedBrand?.name} ${state.selectedDesign?.name}`;
  const m = await import('./catalog-detail-pane.js');
  await m.renderDetailPane(state);
}

async function loadTenantList() {
  const { data, error } = await sb.from('tenants').select('id, name, slug').order('name');
  if (error) { showToast('שגיאה בטעינת טננטים: ' + error.message, 'error'); return; }
  state.tenants = data ?? [];
  const sel = document.getElementById('tenant-select');
  sel.innerHTML = '<option value="">— בחר טננט —</option>' +
    state.tenants.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (${t.slug})</option>`).join('');
}

// Minimal toast — full Toast.* is in shared/, but this page is platform-only & lean
export function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.style.cssText = 'background: ' + (type === 'error' ? '#991b1b' : type === 'success' ? '#065f46' : '#1e3a8a') +
    '; color: white; padding: 10px 16px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);';
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Iron Rule 8 — escape user-supplied content
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
