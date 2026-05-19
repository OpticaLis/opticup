// catalog-modal-helpers.js — shared modal DOM helpers for the 4 creation modals.
// M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A 2026-05-18.
//
// Provides: openModal, closeModal, wireModal, validateRequired, focusFirstInput.
//
// Per Iron Rule 8: caller is responsible for escaping any user-supplied content
// inside `bodyHtml`. This module never reads user input directly — it only
// constructs the chrome (title/footer buttons/keyboard handlers) and delegates
// form rendering + read to the caller via the `onSubmit` callback.
//
// Per Iron Rule 21: this is the SINGLE modal-helpers module for the
// lens-catalog-admin surface. The shared modal system in shared/js/modal-builder.js
// is intentionally not used here — this surface is platform-only and the dark
// theme + RTL + Hebrew labels are tightly coupled to the lens-catalog-admin
// page-frame CSS scoped to [data-tab="catalog-admin"] and to the standalone
// .lens-catalog-admin-modal-overlay class (used when the page renders standalone).

// ===== Public API ============================================================

// openModal({title, bodyHtml, submitLabel, onSubmit, cancelLabel?, onCancel?}) → element
// Returns the overlay element so caller can closeModal(it) after async work.
// onSubmit is async, receives the form element, returns true on success
// (modal stays open if it returns false; caller is responsible for closeModal).
export function openModal(opts) {
  const { title, bodyHtml, submitLabel, cancelLabel, onSubmit, onCancel } = opts;
  const overlay = document.createElement('div');
  overlay.className = 'lens-catalog-admin-modal-overlay';
  // Direct DOM assembly — bodyHtml is rendered into a controlled card. Caller's
  // responsibility to pre-escape any user-supplied values in bodyHtml.
  overlay.innerHTML = `
    <div class="lens-catalog-admin-modal-card" role="dialog" aria-modal="true">
      <div class="lens-catalog-admin-modal-header">
        <h3 class="lens-catalog-admin-modal-title"></h3>
        <button type="button" class="lens-catalog-admin-modal-close" aria-label="סגור">×</button>
      </div>
      <form class="lens-catalog-admin-modal-body" novalidate></form>
      <div class="lens-catalog-admin-modal-footer">
        <button type="button" class="btn lens-catalog-admin-modal-cancel"></button>
        <button type="submit" class="btn btn-primary lens-catalog-admin-modal-submit"></button>
      </div>
    </div>
  `;
  // Set text content (NOT innerHTML — these are escaped against XSS)
  overlay.querySelector('.lens-catalog-admin-modal-title').textContent = title ?? '';
  overlay.querySelector('.lens-catalog-admin-modal-cancel').textContent = cancelLabel ?? 'ביטול';
  overlay.querySelector('.lens-catalog-admin-modal-submit').textContent = submitLabel ?? 'שמור';
  // Inject body HTML (caller-controlled; caller must escape any user data)
  const formEl = overlay.querySelector('.lens-catalog-admin-modal-body');
  formEl.innerHTML = bodyHtml;
  // Wire close handlers
  const close = () => {
    if (typeof onCancel === 'function') onCancel();
    closeModal(overlay);
  };
  overlay.querySelector('.lens-catalog-admin-modal-close').addEventListener('click', close);
  overlay.querySelector('.lens-catalog-admin-modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (evt) => {
    if (evt.target === overlay) close();
  });
  // ESC key to dismiss
  const escHandler = (evt) => { if (evt.key === 'Escape') close(); };
  document.addEventListener('keydown', escHandler);
  overlay.__escHandler = escHandler;
  // Wire submit
  const submitBtn = overlay.querySelector('.lens-catalog-admin-modal-submit');
  submitBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    if (typeof onSubmit !== 'function') { closeModal(overlay); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = '...שולח';
    try {
      const ok = await onSubmit(formEl);
      // If onSubmit returned truthy, caller has handled closeModal. Otherwise re-enable.
      if (!ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel ?? 'שמור';
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel ?? 'שמור';
      throw err;
    }
  });
  // Mount + focus
  document.body.appendChild(overlay);
  focusFirstInput(overlay);
  return overlay;
}

// closeModal(modalEl) — fade out + remove from DOM + detach ESC handler
export function closeModal(modalEl) {
  if (!modalEl) return;
  if (modalEl.__escHandler) {
    document.removeEventListener('keydown', modalEl.__escHandler);
    modalEl.__escHandler = null;
  }
  // Brief fade-out via class toggle (CSS handles the animation)
  modalEl.classList.add('closing');
  setTimeout(() => modalEl.remove(), 120);
}

// wireModal(modalEl, fieldsConfig, callbacks) — convenience for callers that
// want a declarative field config instead of inline HTML. Used by the variant
// modal where field set varies per product type. Body HTML must already exist
// (caller renders via openModal); this wires Enter-key submit + validation.
export function wireModal(modalEl, fieldsConfig, callbacks) {
  if (!modalEl) return;
  const formEl = modalEl.querySelector('.lens-catalog-admin-modal-body');
  if (!formEl) return;
  // Enter key on any input submits (except textareas which keep newline behavior)
  formEl.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' && evt.target.tagName !== 'TEXTAREA') {
      evt.preventDefault();
      const submitBtn = modalEl.querySelector('.lens-catalog-admin-modal-submit');
      if (submitBtn && !submitBtn.disabled) submitBtn.click();
    }
  });
  // Field-level validation hooks (currently: required-mark visual on blur)
  (fieldsConfig ?? []).forEach(cfg => {
    if (!cfg.required) return;
    const inp = formEl.querySelector(`[name="${cfg.name}"]`);
    if (!inp) return;
    inp.addEventListener('blur', () => {
      if (!inp.value.trim()) inp.classList.add('invalid');
      else inp.classList.remove('invalid');
    });
  });
  if (callbacks && typeof callbacks.onWired === 'function') callbacks.onWired(formEl);
}

// validateRequired(formEl) → {ok: bool, missing: [fieldName]}
// Scans inputs/selects/textareas marked with data-required attribute. Returns
// the list of missing field display names (from associated <label> textContent
// if available, else the input's name attribute).
export function validateRequired(formEl) {
  const missing = [];
  formEl.querySelectorAll('[data-required]').forEach(inp => {
    const val = (inp.value ?? '').toString().trim();
    if (!val) {
      const label = formEl.querySelector(`label[for="${inp.id}"]`);
      missing.push(label ? label.textContent.trim() : inp.name || inp.id);
      inp.classList.add('invalid');
    } else {
      inp.classList.remove('invalid');
    }
  });
  return { ok: missing.length === 0, missing };
}

// focusFirstInput(modalEl) — accessibility helper; focus moves to first non-disabled
// input/select/textarea inside the modal body.
export function focusFirstInput(modalEl) {
  if (!modalEl) return;
  const first = modalEl.querySelector(
    '.lens-catalog-admin-modal-body input:not([disabled]), ' +
    '.lens-catalog-admin-modal-body select:not([disabled]), ' +
    '.lens-catalog-admin-modal-body textarea:not([disabled])'
  );
  if (first) first.focus();
}
