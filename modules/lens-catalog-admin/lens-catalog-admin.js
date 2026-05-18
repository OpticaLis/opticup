// lens-catalog-admin.js — entry point for the lens-catalog-admin tab.
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: 4-column drill per mockup —
// Suppliers (col 1) → Brands (col 2) → Series (col 3) → Detail+Variants (col 4).
// Variants are NOT a separate column anymore; they render as a table inside
// the detail pane (col 4) per LENS_PLATFORM_CATALOG_ADMIN_MOCKUP §COL 4.
// Per Iron Rule 12: ≤350 LOC. This file orchestrates; sub-modules do the work.

import { gateAuthOrRedirect, sb } from './catalog-auth.js';
import { wireSuppliersCol, loadSuppliers } from './catalog-suppliers-col.js';
import { wireBrandsCol, loadBrandsForSupplier } from './catalog-brands-col.js';
import { wireDesignsCol } from './catalog-designs-col.js';
import { wireDetailPane, renderDesignDetailPane } from './catalog-detail-pane.js';
import { wireImportFlow } from './catalog-import.js';

// Shared state — small enough to inline; refactor to a store if it grows
const state = {
  selectedTenant: null,    // { id, name, slug } — drives both Suppliers col + offerings preview
  selectedSupplier: null,  // { id, name, supplier_number, active, brand_count }
  selectedBrand: null,     // { id, name, is_published }
  selectedDesign: null,    // { id, brand_id, name, lens_type, material, is_published }
  suppliers: [],
  brands: [],
  designs: [],
  tenants: [],
};

async function bootstrap() {
  // 1. Gate on platform super admin (RPC server-side check; bypassed in dev mode)
  const okay = await gateAuthOrRedirect();
  if (!okay) return;
  document.getElementById('app').style.display = 'block';

  // 2. Load tenant list — drives the column 1 (Suppliers) data scope
  await loadTenantList();

  // 3. Wire columns (suppliers / brands / designs / detail)
  wireSuppliersCol(state, onSupplierSelected);
  wireBrandsCol(state, onBrandSelected);
  wireDesignsCol(state, onDesignSelected);
  wireDetailPane(state);
  wireImportFlow(state, () => loadBrandsForSupplier(state));

  // 4. Empty initial state — user must pick a tenant before suppliers populate
  await loadSuppliers(state);

  // 5. Tenant selector wiring
  document.getElementById('tenant-select').addEventListener('change', (e) => {
    state.selectedTenant = state.tenants.find(t => t.id === e.target.value) ?? null;
    state.selectedSupplier = null;
    state.selectedBrand = null;
    state.selectedDesign = null;
    state.suppliers = [];
    state.brands = [];
    state.designs = [];
    document.getElementById('brands-list').innerHTML =
      '<div class="empty-state">בחר ספק ←</div>';
    document.getElementById('designs-list').innerHTML =
      '<div class="empty-state">בחר מותג ←</div>';
    document.getElementById('detail-pane').innerHTML =
      '<div class="empty-state">בחר סדרה כדי לראות פרטים + וריאציות</div>';
    document.getElementById('brands-count').textContent = '0';
    document.getElementById('designs-count').textContent = '0';
    loadSuppliers(state);
  });
}

window.LensCatalogAdmin = { bootstrap };
window.addEventListener('DOMContentLoaded', bootstrap);

// Selection callbacks — clear downstream + load next column

function onSupplierSelected(supplier) {
  state.selectedSupplier = supplier;
  state.selectedBrand = null;
  state.selectedDesign = null;
  state.brands = [];
  state.designs = [];
  document.getElementById('brands-context').textContent = `ל-${supplier.name}`;
  document.getElementById('designs-context').textContent = 'בחר מותג ←';
  document.getElementById('designs-list').innerHTML =
    '<div class="empty-state">בחר מותג ←</div>';
  document.getElementById('detail-pane').innerHTML =
    '<div class="empty-state">בחר סדרה כדי לראות פרטים + וריאציות</div>';
  document.getElementById('designs-count').textContent = '0';
  document.getElementById('designs-search').disabled = true;
  document.getElementById('btn-add-design').disabled = true;
  loadBrandsForSupplier(state);
}

async function onBrandSelected(brand) {
  state.selectedBrand = brand;
  state.selectedDesign = null;
  state.designs = [];
  document.getElementById('designs-context').textContent =
    `${brand.name}${state.selectedSupplier ? ` · ${state.selectedSupplier.name}` : ''}`;
  document.getElementById('detail-pane').innerHTML =
    '<div class="empty-state">בחר סדרה כדי לראות פרטים + וריאציות</div>';
  document.getElementById('designs-search').disabled = false;
  document.getElementById('btn-add-design').disabled = false;
  // Load designs for this brand (global catalog)
  const { data, error } = await sb
    .from('lens_design')
    .select('id, brand_id, name, lens_type, material, is_published, lifecycle_status')
    .eq('brand_id', brand.id)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('name');
  if (error) { showToast('שגיאה בטעינת סדרות: ' + error.message, 'error'); return; }
  state.designs = data ?? [];
  document.getElementById('designs-count').textContent = state.designs.length;
  renderDesignsList();
}

function renderDesignsList() {
  const list = document.getElementById('designs-list');
  if (state.designs.length === 0) {
    list.innerHTML = '<div class="empty-state">אין סדרות למותג זה</div>';
    return;
  }
  list.innerHTML = state.designs.map(d => `
    <div class="lens-cat-admin-list-item" data-id="${d.id}">
      <div>
        <div class="item-title">${escapeHtml(d.name)}</div>
        <div class="item-meta">${escapeHtml(d.lens_type)}${d.is_published ? '' : ' • טיוטה'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.lens-cat-admin-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const design = state.designs.find(d => d.id === el.dataset.id);
      list.querySelectorAll('.lens-cat-admin-list-item').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      onDesignSelected(design);
    });
  });
}

async function onDesignSelected(design) {
  state.selectedDesign = design;
  // Render the full design detail pane (header + fields + variants table)
  await renderDesignDetailPane(state);
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
