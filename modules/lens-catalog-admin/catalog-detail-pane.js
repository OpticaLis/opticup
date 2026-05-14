// catalog-detail-pane.js — right column: variant details + per-tenant offerings
import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

export function wireDetailPane(state) {
  // Wire publish-all button
  document.getElementById('btn-publish-all').addEventListener('click', async () => {
    if (!window.confirm('פרסם את כל הטיוטות (מותגים + דגמים + וריאציות)?')) return;
    const tasks = [
      sb.from('lens_brand').update({ is_published: true }).eq('is_published', false).is('owner_tenant_id', null).eq('is_deleted', false),
      sb.from('lens_design').update({ is_published: true }).eq('is_published', false).is('owner_tenant_id', null).eq('is_deleted', false),
      sb.from('lens_variant').update({ is_published: true }).eq('is_published', false).is('owner_tenant_id', null).eq('is_deleted', false),
    ];
    const results = await Promise.all(tasks);
    const errs = results.filter(r => r.error).map(r => r.error.message);
    if (errs.length > 0) {
      showToast('שגיאות: ' + errs.join(' / '), 'error');
    } else {
      showToast('כל הטיוטות פורסמו ✓', 'success');
      // Refresh
      window.location.reload();
    }
  });
}

export async function renderDetailPane(state) {
  const v = state.selectedVariant;
  if (!v) return;
  const tenantSel = state.selectedTenant;
  const pane = document.getElementById('detail-pane');
  pane.innerHTML = `
    <h2>${esc(v.display_id)}</h2>
    <div class="detail-grid">
      <div class="field-group"><label>מותג</label><div class="field-value">${esc(state.selectedBrand?.name)}</div></div>
      <div class="field-group"><label>דגם</label><div class="field-value">${esc(state.selectedDesign?.name)}</div></div>
      <div class="field-group"><label>סוג</label><div class="field-value">${esc(state.selectedDesign?.lens_type)}</div></div>
      <div class="field-group"><label>חומר</label><div class="field-value">${esc(state.selectedDesign?.material) || '—'}</div></div>
      <div class="field-group"><label>Refractive Index</label><div class="field-value">${v.refractive_index}</div></div>
      <div class="field-group"><label>Diameter</label><div class="field-value">${v.diameter_mm} mm</div></div>
      <div class="field-group"><label>Coating</label><div class="field-value">${esc(v.coating) || '—'}</div></div>
      <div class="field-group"><label>Tint</label><div class="field-value">${esc(v.tint) || '—'}</div></div>
      <div class="field-group"><label>SPH Range</label><div class="field-value">${v.sph_min} → ${v.sph_max}</div></div>
      <div class="field-group"><label>CYL Range</label><div class="field-value">${v.cyl_min == null ? '—' : v.cyl_min + ' → ' + v.cyl_max}</div></div>
      <div class="field-group"><label>ADD Range</label><div class="field-value">${v.add_min == null ? '—' : v.add_min + ' → ' + v.add_max}</div></div>
      <div class="field-group"><label>Lifecycle</label><div class="field-value">${esc(v.lifecycle_status)}${v.is_published ? '' : ' • טיוטה'}</div></div>
    </div>
    <div style="margin-top: 24px;">
      <h3 style="font-size: 14px; color: #f1f5f9; margin-bottom: 8px;">💰 הצעות מסחר${tenantSel ? ` — ${esc(tenantSel.name)}` : ''}</h3>
      <div id="offerings-list">${tenantSel ? 'טוען…' : '<div class="empty-state">בחר טננט בסרגל העליון להצגת הצעות.</div>'}</div>
    </div>
    <div style="margin-top: 16px;">
      <button class="btn btn-primary" id="btn-toggle-publish">${v.is_published ? '🔻 הפוך לטיוטה' : '📢 פרסם'}</button>
    </div>
  `;
  document.getElementById('btn-toggle-publish').addEventListener('click', () => togglePublish(state, v));
  if (tenantSel) await loadOfferings(state, v, tenantSel);
}

async function togglePublish(state, v) {
  const newVal = !v.is_published;
  const { error } = await sb.from('lens_variant').update({ is_published: newVal }).eq('id', v.id);
  if (error) { showToast('שגיאה: ' + error.message, 'error'); return; }
  v.is_published = newVal;
  showToast(newVal ? 'פורסם ✓' : 'הפך לטיוטה', 'success');
  await renderDetailPane(state);
}

async function loadOfferings(state, variant, tenantSel) {
  const { data, error } = await sb
    .from('supplier_catalog_offering')
    .select('id, supplier_id, price_amount, currency_code, is_vat_inclusive, production_type, status, supplier_sku_code, suppliers!inner(name, supplier_number)')
    .eq('tenant_id', tenantSel.id)
    .eq('variant_id', variant.id)
    .eq('is_deleted', false)
    .order('status');
  const offerings = data ?? [];
  const cont = document.getElementById('offerings-list');
  if (error) { cont.innerHTML = `<div class="empty-state">שגיאה: ${esc(error.message)}</div>`; return; }
  if (offerings.length === 0) {
    cont.innerHTML = '<div class="empty-state">אין הצעות לטננט זה. צור מ-Excel-ייבוא או ידנית.</div>';
    return;
  }
  cont.innerHTML = offerings.map(o => `
    <div style="background: #0f172a; padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; font-size: 13px;">
      <strong>${esc(o.suppliers?.name)}</strong>
      <span style="color: #94a3b8;">#${o.suppliers?.supplier_number ?? ''}</span>
      <div style="margin-top: 4px; color: #cbd5e1;">
        ${o.price_amount} ${esc(o.currency_code)}${o.is_vat_inclusive ? ' (כולל מע"מ)' : ''}
        • <span style="color: ${o.production_type === 'custom' ? '#fbbf24' : '#86efac'};">${o.production_type}</span>
        • status: ${esc(o.status)}
        ${o.supplier_sku_code ? '<br>SKU: ' + esc(o.supplier_sku_code) : ''}
      </div>
    </div>
  `).join('');
}

