// catalog-variant-modal.js — single-variant create modal (handles BOTH schemas).
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18.
//
// openVariantModal(state, onCreated?) — opens schema-correct modal based on
// state.activeProductTab. 'glasses' → lens_variant insert; 'contact_lens' →
// contact_lens_variant insert.
//
// State assumptions: state.selectedDesign must be set before opening modal.
//
// Per Iron Rule 22: insert payload includes owner_tenant_id: null (global rows).
// Per Iron Rule 7: writes via existing `sb` client (from catalog-auth.js).
// Per Iron Rule 8: all user input rendered via esc() and read via .value (no
// innerHTML round-trips).

import { sb } from './catalog-auth.js';
import { openModal, closeModal, validateRequired, wireModal } from './catalog-modal-helpers.js';
import { showToast, escapeHtml as esc } from './lens-catalog-admin.js';

// ===== Public API ============================================================

export function openVariantModal(state, onCreated) {
  if (!state.selectedDesign) {
    showToast('בחר סדרה קודם', 'error');
    return;
  }
  const productType = state.activeProductTab;
  const title = productType === 'contact_lens'
    ? '➕ וריאנט עדשת מגע חדש'
    : '➕ וריאנט עדשת משקפיים חדש';
  const bodyHtml = productType === 'contact_lens'
    ? renderContactForm()
    : renderGlassesForm();

  const modalEl = openModal({
    title,
    bodyHtml,
    submitLabel: 'צור וריאנט',
    cancelLabel: 'ביטול',
    onSubmit: async (formEl) => {
      const v = validateRequired(formEl);
      if (!v.ok) {
        showToast('שדות חובה חסרים: ' + v.missing.join(', '), 'error');
        return false;
      }
      const designId = state.selectedDesign.id;
      const result = productType === 'contact_lens'
        ? await createContactVariant(formEl, designId)
        : await createGlassesVariant(formEl, designId);
      if (result.error) {
        showToast('שגיאה: ' + result.error.message, 'error');
        return false;
      }
      showToast(`נוצר וריאנט ${result.data.display_id ?? ''}`, 'success');
      closeModal(modalEl);
      if (typeof onCreated === 'function') await onCreated(result.data);
      return true;
    },
  });

  // Wire ENTER-to-submit + required-field UI
  wireModal(modalEl, [
    { name: 'refractive_index', required: productType === 'glasses' },
    { name: 'base_curve',       required: productType === 'contact_lens' },
  ]);
}

// ===== Internal — form renderers ============================================

function renderGlassesForm() {
  // lens_variant schema (per repo): NOT NULL no-default fields require user input:
  //   display_id, refractive_index, diameter_mm, sph_min, sph_max.
  // Optional: coating, tint, cyl_min, cyl_max, add_min, add_max.
  // (display_id is NOT auto-generated — no trigger; see SPEC §0.4 + FINDINGS F-1.)
  return `
    <div class="lens-catalog-admin-modal-form">
      <div class="field-grid-2">
        <div class="field field-required">
          <label for="modal-variant-display-id">מזהה תצוגה (display_id)</label>
          <input type="text" id="modal-variant-display-id" data-required name="display_id"
                 placeholder="V-001847" autocomplete="off" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-refractive-index">אינדקס</label>
          <input type="number" step="0.01" id="modal-variant-refractive-index"
                 name="refractive_index" data-required placeholder="1.50 / 1.56 / 1.6 / 1.67 / 1.74" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-diameter-mm">קוטר (מ"מ)</label>
          <input type="number" step="1" id="modal-variant-diameter-mm"
                 name="diameter_mm" data-required placeholder="65 / 70 / 75" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-sph-min">SPH מינ'</label>
          <input type="number" step="0.25" id="modal-variant-sph-min" data-required name="sph_min" placeholder="-8.00" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-sph-max">SPH מקס'</label>
          <input type="number" step="0.25" id="modal-variant-sph-max" data-required name="sph_max" placeholder="+6.00" />
        </div>
        <div class="field">
          <label for="modal-variant-coating">ציפוי</label>
          <input type="text" id="modal-variant-coating" name="coating"
                 placeholder="AR Clear / AR Premium / Photo / ..." />
        </div>
        <div class="field">
          <label for="modal-variant-tint">גוון</label>
          <input type="text" id="modal-variant-tint" name="tint"
                 placeholder="Brown / Gray / G15 / —" />
        </div>
        <div class="field">
          <label for="modal-variant-cyl-min">CYL מינ' (אופציונלי)</label>
          <input type="number" step="0.25" id="modal-variant-cyl-min" name="cyl_min" placeholder="0.00" />
        </div>
        <div class="field">
          <label for="modal-variant-cyl-max">CYL מקס' (אופציונלי)</label>
          <input type="number" step="0.25" id="modal-variant-cyl-max" name="cyl_max" placeholder="-2.00" />
        </div>
      </div>
    </div>
  `;
}

function renderContactForm() {
  // contact_lens_variant schema (per repo): NOT NULL no-default fields require user input:
  //   display_id, base_curve, sph, wearing_schedule.
  // Optional: cyl, axis, qty_per_box, water_content_pct. NO diameter column (D-FIX-3).
  return `
    <div class="lens-catalog-admin-modal-form">
      <div class="field-grid-2">
        <div class="field field-required">
          <label for="modal-variant-display-id">מזהה תצוגה (display_id)</label>
          <input type="text" id="modal-variant-display-id" data-required name="display_id"
                 placeholder="CL-000041" autocomplete="off" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-base-curve">Base Curve</label>
          <input type="number" step="0.1" id="modal-variant-base-curve"
                 name="base_curve" data-required placeholder="8.4 / 8.6 / 8.8" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-sph">SPH</label>
          <input type="number" step="0.25" id="modal-variant-sph" data-required name="sph" placeholder="-3.00" />
        </div>
        <div class="field field-required">
          <label for="modal-variant-wearing-schedule">לו"ז שימוש</label>
          <select id="modal-variant-wearing-schedule" data-required name="wearing_schedule">
            <option value="">— בחר —</option>
            <option value="daily">יומיות (daily)</option>
            <option value="monthly">חודשיות (monthly)</option>
            <option value="yearly">שנתיות (yearly)</option>
          </select>
        </div>
        <div class="field">
          <label for="modal-variant-cyl">CYL (אופציונלי)</label>
          <input type="number" step="0.25" id="modal-variant-cyl" name="cyl" placeholder="-0.75" />
        </div>
        <div class="field">
          <label for="modal-variant-axis">AXIS (אופציונלי)</label>
          <input type="number" step="1" id="modal-variant-axis" name="axis" placeholder="90" />
        </div>
        <div class="field">
          <label for="modal-variant-qty-per-box">כמות בקופסה</label>
          <input type="number" step="1" id="modal-variant-qty-per-box" name="qty_per_box" placeholder="30" />
        </div>
        <div class="field">
          <label for="modal-variant-water-content">תכולת מים (%)</label>
          <input type="number" step="0.1" id="modal-variant-water-content"
                 name="water_content_pct" placeholder="38 / 55 / 78" />
        </div>
      </div>
    </div>
  `;
}

// ===== Internal — insert handlers ===========================================

async function createGlassesVariant(formEl, designId) {
  const num = (sel) => {
    const raw = formEl.querySelector(sel)?.value?.trim();
    return raw === '' || raw == null ? null : Number(raw);
  };
  const str = (sel) => {
    const raw = formEl.querySelector(sel)?.value?.trim();
    return raw === '' ? null : raw;
  };
  const payload = {
    design_id: designId,
    display_id: str('#modal-variant-display-id'),
    refractive_index: num('#modal-variant-refractive-index'),
    diameter_mm: num('#modal-variant-diameter-mm'),
    coating: str('#modal-variant-coating'),
    tint: str('#modal-variant-tint'),
    sph_min: num('#modal-variant-sph-min'),
    sph_max: num('#modal-variant-sph-max'),
    cyl_min: num('#modal-variant-cyl-min'),
    cyl_max: num('#modal-variant-cyl-max'),
    is_published: false,
    owner_tenant_id: null,
  };
  return sb.from('lens_variant').insert(payload).select('id, display_id').single();
}

async function createContactVariant(formEl, designId) {
  const num = (sel) => {
    const raw = formEl.querySelector(sel)?.value?.trim();
    return raw === '' || raw == null ? null : Number(raw);
  };
  const str = (sel) => {
    const raw = formEl.querySelector(sel)?.value?.trim();
    return raw === '' ? null : raw;
  };
  const payload = {
    design_id: designId,
    display_id: str('#modal-variant-display-id'),
    base_curve: num('#modal-variant-base-curve'),
    sph: num('#modal-variant-sph'),
    cyl: num('#modal-variant-cyl'),
    axis: num('#modal-variant-axis'),
    wearing_schedule: str('#modal-variant-wearing-schedule'),
    qty_per_box: num('#modal-variant-qty-per-box'),
    water_content_pct: num('#modal-variant-water-content'),
    is_published: false,
    owner_tenant_id: null,
  };
  return sb.from('contact_lens_variant').insert(payload).select('id, display_id').single();
}
