// lens-catalog-admin.js — entry point for the lens-catalog-admin tab.
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: 4-column drill per mockup.
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18: adds top-level product-type
//   tabs (glasses / contact_lens) + counts badge in header + URL ?ptab= hydration.
// Per Iron Rule 12: ≤350 LOC. This file orchestrates; sub-modules do the work.

import { gateAuthOrRedirect, sb } from './catalog-auth.js';
import { wireSuppliersCol, loadSuppliers } from './catalog-suppliers-col.js';
import { wireBrandsCol, loadBrandsForSupplier } from './catalog-brands-col.js';
import { wireDesignsCol, loadDesignsForBrand } from './catalog-designs-col.js';
import { wireDetailPane, renderDesignDetailPane } from './catalog-detail-pane.js';

// Shared state — small enough to inline; refactor to a store if it grows
const state = {
  selectedTenant: null,    // { id, name, slug } — drives Suppliers col + offerings preview
  selectedSupplier: null,  // { id, name, supplier_number, active, brand_count }
  selectedBrand: null,     // { id, name, is_published }
  selectedDesign: null,    // { id, brand_id, name, lens_type, product_type, version, ... }
  activeProductTab: 'glasses',  // 'glasses' | 'contact_lens' — Stage 2A top-level filter
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

  // 2. Hydrate activeProductTab from URL ?ptab= (Stage 2A) — must precede loaders
  hydrateProductTabFromUrl();

  // 3. Load tenant list — drives the column 1 (Suppliers) data scope
  await loadTenantList();

  // 4. Wire columns (suppliers / brands / designs / detail) + product-tab strip
  wireSuppliersCol(state, onSupplierSelected);
  wireBrandsCol(state, onBrandSelected);
  wireDesignsCol(state, onDesignSelected);
  wireDetailPane(state);
  wireProductTabs();
  wireHeaderActions();

  // 5. Empty initial state — user must pick a tenant before suppliers populate
  await loadSuppliers(state);

  // 6. Tenant selector wiring
  document.getElementById('tenant-select').addEventListener('change', (e) => {
    state.selectedTenant = state.tenants.find(t => t.id === e.target.value) ?? null;
    resetDownstream();
    loadSuppliers(state);
  });

  // 7. Initial counts badge load (independent of selection — global totals)
  loadCountsBadge();
}

window.LensCatalogAdmin = { bootstrap, switchProductTab };
window.addEventListener('DOMContentLoaded', bootstrap);

// ===== Product-type tabs (Stage 2A) =========================================

function hydrateProductTabFromUrl() {
  const params = new URLSearchParams(location.search);
  const ptab = params.get('ptab');
  if (ptab === 'contact_lens' || ptab === 'glasses') {
    state.activeProductTab = ptab;
    // Reflect in DOM aria-selected
    document.querySelectorAll('.lens-cat-admin-product-tab').forEach(btn => {
      const isActive = btn.dataset.productTab === ptab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }
}

function wireProductTabs() {
  document.querySelectorAll('.lens-cat-admin-product-tab').forEach(btn => {
    btn.addEventListener('click', () => switchProductTab(btn.dataset.productTab));
  });
}

// Public — also exposed via window.LensCatalogAdmin.switchProductTab for tests
export async function switchProductTab(nextTab) {
  if (nextTab !== 'glasses' && nextTab !== 'contact_lens') return;
  if (state.activeProductTab === nextTab) return;
  state.activeProductTab = nextTab;
  // Update tab visual state
  document.querySelectorAll('.lens-cat-admin-product-tab').forEach(btn => {
    const isActive = btn.dataset.productTab === nextTab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  // Reflect in URL (replaceState — no history entry per tab toggle)
  const url = new URL(location.href);
  url.searchParams.set('ptab', nextTab);
  history.replaceState(null, '', url.toString());
  // Reset downstream selections — brand+series no longer valid (different product_type)
  state.selectedBrand = null;
  state.selectedDesign = null;
  state.brands = [];
  state.designs = [];
  document.getElementById('brands-count').textContent = '0';
  document.getElementById('designs-count').textContent = '0';
  document.getElementById('brands-list').innerHTML =
    '<div class="empty-state">בחר ספק ←</div>';
  document.getElementById('designs-list').innerHTML =
    '<div class="empty-state">בחר מותג ←</div>';
  document.getElementById('detail-pane').innerHTML =
    '<div class="empty-state">בחר סדרה כדי לראות פרטים + וריאציות</div>';
  // Reload brands if a supplier is currently selected (filter re-evaluates)
  if (state.selectedSupplier) await loadBrandsForSupplier(state);
}

// ===== Header actions (Stage 2A) ============================================

function wireHeaderActions() {
  // Header "➕ ספק חדש" mirrors the col1 footer button — delegate
  const headerBtn = document.getElementById('btn-add-supplier-header');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      const colBtn = document.getElementById('btn-add-supplier');
      if (colBtn) colBtn.click();
    });
  }
  // btn-import / btn-export / btn-changelog are disabled (Stage 2B) — no wiring
}

// ===== Counts badge (Stage 2A) ==============================================

async function loadCountsBadge() {
  // Header badge shows global counts (cross-supplier/brand, cross-product). Updates on
  // product-tab switch are scope-aware (filters by product_type for design+variant counts).
  const el = document.getElementById('catalog-counts-badge');
  if (!el) return;
  try {
    const productType = state.activeProductTab;
    const [{ count: brandsCount }, { count: designsCount }, suppliersRes, variantsRes] =
      await Promise.all([
        sb.from('lens_brand').select('id', { count: 'exact', head: true })
          .is('owner_tenant_id', null).eq('is_deleted', false),
        sb.from('lens_design').select('id', { count: 'exact', head: true })
          .eq('product_type', productType).is('owner_tenant_id', null).eq('is_deleted', false),
        sb.from('suppliers').select('id', { count: 'exact', head: true }).eq('active', true),
        productType === 'glasses'
          ? sb.from('lens_variant').select('id', { count: 'exact', head: true })
              .is('owner_tenant_id', null).eq('is_deleted', false)
          : sb.from('contact_lens_variant').select('id', { count: 'exact', head: true })
              .is('owner_tenant_id', null).eq('is_deleted', false),
      ]);
    el.textContent =
      `${suppliersRes.count ?? 0} ספקים · ${brandsCount ?? 0} מותגים · ` +
      `${designsCount ?? 0} סדרות · ${variantsRes.count ?? 0} וריאנטים`;
  } catch (err) {
    el.textContent = '— ספקים · — מותגים · — סדרות · — וריאנטים';
    console.warn('[catalog-admin] counts badge load failed:', err);
  }
}

// ===== Selection callbacks ==================================================

function resetDownstream() {
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
}

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
  // Delegate to designs-col loader (product_type-aware filter)
  await loadDesignsForBrand(state);
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
    state.tenants.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${escapeHtml(t.slug)})</option>`).join('');
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
