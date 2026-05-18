// catalog-detail-pane.js — Col 4: Design Detail + Variants table (inline).
// M1_LENS_CATALOG_TRUE_REBUILD 2026-05-18: rewritten per mockup §COL 4 to
// render the full Series management surface inline:
//   - header (series name + breadcrumb)
//   - publish state strip
//   - core fields (read-only summary; full edit is a future SPEC)
//   - variants table with index/coating/diameter/SPH range/price columns
//   - save bar (publish/clone/disable shells)
// Selecting a design loads its variants in one query and renders the full pane.
// Per-variant edit is a future SPEC; this SPEC ships read-only variants display
// + the existing publish-toggle on the global publish-all button.

import { sb } from './catalog-auth.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

export function wireDetailPane(state) {
  // Wire publish-all button (existing behavior preserved verbatim from prior baseline)
  document.getElementById('btn-publish-all').addEventListener('click', async () => {
    if (!window.confirm('פרסם את כל הטיוטות (מותגים + סדרות + וריאציות)?')) return;
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
      window.location.reload();
    }
  });
}

// Renders the full design detail pane (header + fields + variants table)
// for state.selectedDesign. Mockup §COL 4 reference.
export async function renderDesignDetailPane(state) {
  const design = state.selectedDesign;
  const brand = state.selectedBrand;
  const supplier = state.selectedSupplier;
  if (!design) return;
  const pane = document.getElementById('detail-pane');
  pane.innerHTML = '<div class="empty-state">טוען וריאציות…</div>';

  // Load variants for this design (global catalog rows)
  const { data: variants, error } = await sb
    .from('lens_variant')
    .select('id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, cyl_min, cyl_max, add_min, add_max, is_published, lifecycle_status')
    .eq('design_id', design.id)
    .is('owner_tenant_id', null)
    .eq('is_deleted', false)
    .order('refractive_index')
    .order('diameter_mm');
  if (error) {
    pane.innerHTML = `<div class="empty-state">שגיאה בטעינת וריאציות: ${esc(error.message)}</div>`;
    return;
  }

  const v = variants ?? [];
  const publishedCount = v.filter(r => r.is_published).length;
  const draftCount = v.length - publishedCount;

  pane.innerHTML = `
    <div class="lens-cat-admin-detail-header">
      <div class="lens-cat-admin-detail-title">
        ${esc(design.name)}
        <span class="series-chip ${design.is_published ? 'stock' : 'draft'}">${design.is_published ? 'פעיל' : 'טיוטה'}</span>
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
          <div class="ps-label">וריאנטים מפורסמים</div>
          <div class="ps-value">${publishedCount} / ${v.length}</div>
        </div>
        <div class="ps-item">
          <div class="ps-label">טיוטות</div>
          <div class="ps-value ${draftCount > 0 ? 'amber' : ''}">${draftCount}</div>
        </div>
      </div>

      <div class="lens-cat-admin-detail-section">
        <div class="lens-cat-admin-detail-section-header">
          <span>וריאנטים (${v.length}) · אינדקס × ציפוי × קוטר</span>
        </div>
        ${renderVariantsTable(v)}
      </div>

      <div class="lens-cat-admin-save-bar">
        <div class="save-info">
          ${design.is_published
            ? '<strong>סדרה פעילה.</strong> שמירה תיצור גרסה חדשה.'
            : '<strong>⚠ טיוטה — עדיין לא פעילה.</strong> השתמש בכפתור "פרסם כל הטיוטות" בכותרת.'}
        </div>
      </div>

    </div>
  `;
}

function renderVariantsTable(variants) {
  if (variants.length === 0) {
    return '<div class="empty-state">אין וריאנטים — הוסף וריאציה חדשה (בכפתור "הוסף" של עמודת הסדרות)</div>';
  }
  return `
    <table class="lens-cat-admin-variants-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>אינדקס</th>
          <th>קוטר</th>
          <th>ציפוי</th>
          <th>גוון</th>
          <th>טווח SPH</th>
          <th>טווח CYL</th>
          <th>סטטוס</th>
        </tr>
      </thead>
      <tbody>
        ${variants.map(v => `
          <tr>
            <td class="var-id">${esc(v.display_id)}</td>
            <td>${v.refractive_index}</td>
            <td>${v.diameter_mm}mm</td>
            <td>${esc(v.coating) || '—'}</td>
            <td>${esc(v.tint) || '—'}</td>
            <td>${v.sph_min} → ${v.sph_max}</td>
            <td>${v.cyl_min == null ? '—' : v.cyl_min + ' → ' + v.cyl_max}</td>
            <td>${v.is_published
              ? '<span class="ver-badge">פעיל</span>'
              : '<span class="ver-badge draft">טיוטה</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
