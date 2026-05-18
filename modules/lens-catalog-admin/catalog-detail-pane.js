// catalog-detail-pane.js — Col 4: Series Detail + Variants table (inline).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: rewritten per mockup §COL 4.
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18:
//   - Version badge in header ('v{N} · פעיל' or 'v{N} · טיוטה') from lens_design.version
//   - Adoption count strip ('אופטיקאיות שאימצו: X / Y') from tenant_active_offerings
//   - Series core fields editable (name + lens_type select + sub-toggle visual-only +
//     description DISABLED with tooltip per §0.2 D-FIX note)
//   - Variants table schema swap per state.activeProductTab
//       glasses → lens_variant (refractive_index/diameter_mm/coating/tint/SPH/CYL)
//       contact_lens → contact_lens_variant (base_curve/sph/cyl/axis/wearing_schedule/qty_per_box/water_content_pct)
//   - Save bar with 3 buttons:
//       💾 שמור גרסה — fully wired (updates name + lens_type + increments lens_design.version)
//       📋 שכפל — placeholder toast ('פעולה זו תפעל בשלב 4')
//       🗑 השבת — placeholder toast ('פעולה זו תפעל בשלב 4')

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';
import { openVariantModal } from './catalog-variant-modal.js';

export function wireDetailPane(state) {
  // No global wiring needed in Stage 2A — header had no btn-publish-all anymore
  // (replaced by per-design save bar). Reserved for future global actions.
}

// Renders the full design detail pane (header + fields + variants table + save bar)
// for state.selectedDesign. Mockup §COL 4 reference.
export async function renderDesignDetailPane(state) {
  const design = state.selectedDesign;
  const brand = state.selectedBrand;
  const supplier = state.selectedSupplier;
  if (!design) return;
  const pane = document.getElementById('detail-pane');
  pane.innerHTML = '<div class="empty-state">טוען וריאציות…</div>';

  // Branch on product_type — variants live in different tables per type
  const productType = design.product_type ?? state.activeProductTab;
  const variantTable = productType === 'contact_lens' ? 'contact_lens_variant' : 'lens_variant';
  const variantSelect = productType === 'contact_lens'
    ? 'id, display_id, base_curve, sph, cyl, axis, wearing_schedule, qty_per_box, water_content_pct, is_published, lifecycle_status'
    : 'id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, cyl_min, cyl_max, is_published, lifecycle_status';

  // Adoption count is computed via 2 sub-queries in computeAdoption() below.
  // Total tenants count is loaded in parallel with the variants fetch.
  const [variantsRes, totalTenantsRes] = await Promise.all([
    sb.from(variantTable).select(variantSelect)
      .eq('design_id', design.id).is('owner_tenant_id', null).eq('is_deleted', false)
      .order('display_id'),
    sb.from('tenants').select('id', { count: 'exact', head: true }),
  ]);

  if (variantsRes.error) {
    pane.innerHTML = `<div class="empty-state">שגיאה בטעינת וריאציות: ${esc(variantsRes.error.message)}</div>`;
    return;
  }
  const v = variantsRes.data ?? [];

  // Compute adoption count via 2-step query (no exec_sql_readonly dependency).
  const adoptionData = await computeAdoption(design.id);
  const totalTenants = totalTenantsRes.count ?? 0;

  const isContact = productType === 'contact_lens';
  const verBadgeClass = design.is_published ? 'ver-badge' : 'ver-badge draft';
  const verBadgeText = `v${design.version ?? 1} · ${design.is_published ? 'פעיל' : 'טיוטה'}`;

  pane.innerHTML = `
    <div class="lens-cat-admin-detail-header">
      <div class="lens-cat-admin-detail-title">
        ${esc(design.name)}
        <span class="series-chip ${design.is_published ? 'stock' : 'draft'}">${design.is_published ? 'פעיל' : 'טיוטה'}</span>
        <span class="${verBadgeClass}">${esc(verBadgeText)}</span>
      </div>
      <div class="lens-cat-admin-detail-meta">
        ${supplier ? `<span><strong>ספק:</strong> ${esc(supplier.name)}</span>` : ''}
        <span><strong>מותג:</strong> ${esc(brand?.name) || '—'}</span>
        <span><strong>${v.length} וריאנטים</strong></span>
        <span><strong>סוג:</strong> ${esc(design.lens_type)}</span>
        ${design.material ? `<span><strong>חומר:</strong> ${esc(design.material)}</span>` : ''}
      </div>
    </div>
    <div class="lens-cat-admin-detail-body">

      <div class="lens-cat-admin-publish-state">
        <div class="ps-item">
          <div class="ps-label">סטטוס</div>
          <div class="ps-value ${design.is_published ? 'green' : 'amber'}">
            ${design.is_published ? '✓ פעיל לכל האופטיקאיות' : '⚠ טיוטה — לא פעיל'}
          </div>
        </div>
        <div class="ps-item">
          <div class="ps-label">אופטיקאיות שאימצו</div>
          <div class="ps-value">${adoptionData} / ${totalTenants}</div>
        </div>
        <div class="ps-item">
          <div class="ps-label">גרסה נוכחית</div>
          <div class="ps-value">v${design.version ?? 1}</div>
        </div>
      </div>

      ${renderSeriesFieldsEditor(design, isContact)}

      <div class="lens-cat-admin-detail-section">
        <div class="lens-cat-admin-detail-section-header">
          <span>וריאנטים (${v.length})${isContact ? ' · BC × SPH × CYL × לו"ז שימוש' : ' · אינדקס × ציפוי × קוטר'}</span>
          <span class="section-action" data-action="add-variant">➕ הוסף וריאנט</span>
        </div>
        ${isContact ? renderContactVariantsTable(v) : renderGlassesVariantsTable(v)}
      </div>

      <div class="lens-cat-admin-save-bar">
        <div class="save-info">
          <strong>${design.is_published ? '✓ סדרה פעילה.' : '⚠ סדרה בטיוטה.'}</strong>
          <br>שמירת גרסה תיצור v${(design.version ?? 1) + 1} ותעדכן את שם הסדרה / קטגוריה.
        </div>
        <div class="save-actions">
          <button class="btn" type="button" data-action="clone-series">📋 שכפל</button>
          <button class="btn btn-disable" type="button" data-action="disable-series">🗑 השבת</button>
          <button class="btn btn-success" type="button" data-action="save-version">💾 שמור גרסה</button>
        </div>
      </div>

    </div>
  `;

  // Wire actions
  pane.querySelector('[data-action="save-version"]').addEventListener('click', () => saveSeriesVersion(state));
  pane.querySelector('[data-action="clone-series"]').addEventListener('click', () => {
    showToast('פעולה זו תפעל בשלב 4 — ניהול גרסאות ושכפול סדרות', 'info');
  });
  pane.querySelector('[data-action="disable-series"]').addEventListener('click', () => {
    showToast('פעולה זו תפעל בשלב 4 — השבתת סדרה ונטיפול לאופטיקאיות שאימצו', 'info');
  });
  const addVarBtn = pane.querySelector('[data-action="add-variant"]');
  if (addVarBtn) {
    addVarBtn.addEventListener('click', () => openVariantModal(state, async () => {
      // Refresh pane after variant insert
      await renderDesignDetailPane(state);
    }));
  }
}

// Compute distinct tenants where this design has at least one active offering.
async function computeAdoption(designId) {
  // Step 1: variant ids for this design (cap at 500 to avoid huge IN clauses)
  const [{ data: lv1 }, { data: lv2 }] = await Promise.all([
    sb.from('lens_variant').select('id').eq('design_id', designId).is('owner_tenant_id', null).eq('is_deleted', false),
    sb.from('contact_lens_variant').select('id').eq('design_id', designId).is('owner_tenant_id', null).eq('is_deleted', false),
  ]);
  const variantIds = [...(lv1 ?? []).map(r => r.id), ...(lv2 ?? []).map(r => r.id)];
  if (variantIds.length === 0) return 0;
  // Step 2: offering ids that reference any of those variants
  const { data: offerings } = await sb
    .from('supplier_catalog_offering')
    .select('id')
    .in('variant_id', variantIds);
  const offeringIds = (offerings ?? []).map(o => o.id);
  if (offeringIds.length === 0) return 0;
  // Step 3: distinct tenants with active rows in tenant_active_offerings
  const { data: active } = await sb
    .from('tenant_active_offerings')
    .select('tenant_id')
    .in('offering_id', offeringIds)
    .eq('is_active', true)
    .eq('is_deleted', false);
  const tenantSet = new Set((active ?? []).map(r => r.tenant_id));
  return tenantSet.size;
}

function renderSeriesFieldsEditor(design, isContact) {
  // mockup §line 564-590 — fields grid. lens_type options swap per product type.
  // 'description' field renders DISABLED per SPEC §0.2 (no DB column in 2A).
  // sub-toggle ('סוג ייצור' for glasses, 'תדירות שימוש' for contacts) is visual-only.
  const lensTypeOptions = isContact
    ? [
        { v: 'soft_contact', l: 'Soft Contact' },
        { v: 'hard_contact', l: 'Hard / RGP Contact' },
      ]
    : [
        { v: 'single_vision', l: 'Single Vision' },
        { v: 'bifocal',       l: 'Bifocal' },
        { v: 'progressive',   l: 'Progressive / Multifocal' },
        { v: 'office',        l: 'Office / Computer' },
        { v: 'occupational',  l: 'Occupational' },
      ];
  const optsHtml = lensTypeOptions.map(o =>
    `<option value="${esc(o.v)}" ${o.v === design.lens_type ? 'selected' : ''}>${esc(o.l)}</option>`).join('');
  const toggleHtml = isContact
    ? `
      <div class="lens-cat-admin-toggle-group" title="פעולה זו תחובר בשלב 4 — ניהול גרסאות">
        <button class="lens-cat-admin-toggle-btn active stock" disabled type="button">📅 יומית</button>
        <button class="lens-cat-admin-toggle-btn" disabled type="button">🗓 חודשית</button>
        <button class="lens-cat-admin-toggle-btn" disabled type="button">📆 שנתית</button>
      </div>`
    : `
      <div class="lens-cat-admin-toggle-group" title="פעולה זו תחובר בשלב 4 — ניהול גרסאות">
        <button class="lens-cat-admin-toggle-btn active stock" disabled type="button">📦 מדף</button>
        <button class="lens-cat-admin-toggle-btn custom" disabled type="button">🏭 ייצור</button>
      </div>`;
  return `
    <div class="lens-cat-admin-detail-section">
      <div class="lens-cat-admin-detail-section-header">
        <span>פרטי סדרה</span>
      </div>
      <div class="lens-cat-admin-field-grid">
        <div class="lens-cat-admin-field field-required">
          <label for="detail-design-name">שם הסדרה</label>
          <input type="text" id="detail-design-name" value="${esc(design.name)}" />
        </div>
        <div class="lens-cat-admin-field">
          <label>${isContact ? 'תדירות שימוש (דגל פנימי)' : 'סוג ייצור (דגל פנימי)'}</label>
          ${toggleHtml}
        </div>
        <div class="lens-cat-admin-field">
          <label for="detail-design-lens-type">קטגוריה</label>
          <select id="detail-design-lens-type">${optsHtml}</select>
        </div>
        <div class="lens-cat-admin-field">
          <label for="detail-design-description">תיאור (אופציונלי)</label>
          <input type="text" id="detail-design-description" placeholder="..."
                 title="זמין בעתיד — דורש הוספת עמודה במסד נתונים" disabled />
        </div>
      </div>
    </div>
  `;
}

function renderGlassesVariantsTable(variants) {
  if (variants.length === 0) {
    return '<div class="empty-state">אין וריאנטים — לחץ "➕ הוסף וריאנט" למעלה</div>';
  }
  return `
    <table class="lens-cat-admin-variants-table">
      <thead>
        <tr>
          <th>ID</th><th>אינדקס</th><th>קוטר</th><th>ציפוי</th><th>גוון</th>
          <th>טווח SPH</th><th>טווח CYL</th><th>סטטוס</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${variants.map(v => `
          <tr>
            <td class="var-id">${esc(v.display_id)}</td>
            <td>${v.refractive_index ?? '—'}</td>
            <td>${v.diameter_mm ?? '—'}${v.diameter_mm ? 'mm' : ''}</td>
            <td>${esc(v.coating) || '—'}</td>
            <td>${esc(v.tint) || '—'}</td>
            <td>${v.sph_min ?? '—'} → ${v.sph_max ?? '—'}</td>
            <td>${v.cyl_min == null ? '—' : v.cyl_min + ' → ' + v.cyl_max}</td>
            <td>${v.is_published ? '<span class="ver-badge">פעיל</span>' : '<span class="ver-badge draft">טיוטה</span>'}</td>
            <td><button class="small-action" type="button" disabled title="זמין בשלב 4">✏️</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderContactVariantsTable(variants) {
  if (variants.length === 0) {
    return '<div class="empty-state">אין וריאנטים — לחץ "➕ הוסף וריאנט" למעלה</div>';
  }
  return `
    <table class="lens-cat-admin-variants-table">
      <thead>
        <tr>
          <th>ID</th><th>BC</th><th>SPH</th><th>CYL</th><th>AXIS</th>
          <th>לו"ז שימוש</th><th>כמות/קופסה</th><th>תכולת מים</th><th>סטטוס</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${variants.map(v => `
          <tr>
            <td class="var-id">${esc(v.display_id)}</td>
            <td>${v.base_curve ?? '—'}</td>
            <td>${v.sph ?? '—'}</td>
            <td>${v.cyl ?? '—'}</td>
            <td>${v.axis ?? '—'}</td>
            <td>${esc(v.wearing_schedule) || '—'}</td>
            <td>${v.qty_per_box ?? '—'}</td>
            <td>${v.water_content_pct != null ? v.water_content_pct + '%' : '—'}</td>
            <td>${v.is_published ? '<span class="ver-badge">פעיל</span>' : '<span class="ver-badge draft">טיוטה</span>'}</td>
            <td><button class="small-action" type="button" disabled title="זמין בשלב 4">✏️</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// "💾 שמור גרסה" handler — updates name + lens_type + increments version.
async function saveSeriesVersion(state) {
  const design = state.selectedDesign;
  if (!design) return;
  const newName = document.getElementById('detail-design-name')?.value?.trim();
  const newLensType = document.getElementById('detail-design-lens-type')?.value;
  if (!newName) { showToast('שם הסדרה לא יכול להיות ריק', 'error'); return; }
  if (!newLensType) { showToast('יש לבחור קטגוריה', 'error'); return; }
  const nextVersion = (design.version ?? 1) + 1;
  const { data, error } = await sb
    .from('lens_design')
    .update({
      name: newName,
      lens_type: newLensType,
      version: nextVersion,
    })
    .eq('id', design.id)
    .is('owner_tenant_id', null)
    .select('id, brand_id, name, lens_type, product_type, material, is_published, lifecycle_status, version')
    .single();
  if (error) { showToast('שגיאה בשמירה: ' + error.message, 'error'); return; }
  // Patch local state — designs list + selectedDesign
  state.selectedDesign = data;
  const idx = state.designs.findIndex(d => d.id === design.id);
  if (idx >= 0) state.designs[idx] = data;
  showToast(`נשמרה v${data.version} (${data.name})`, 'success');
  // Re-render to reflect new version badge + any name change
  await renderDesignDetailPane(state);
}
