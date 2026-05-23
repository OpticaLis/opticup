/* ============================================================
   M5 Customer Card — Coming-Soon utility (single source of truth)
   Iron Rule 21 anchor — ONE handler + ONE label + ONE registry.
   No scattered placeholder strings. Each deferred feature documented
   here with the future module that will light it up.
   ============================================================ */
(function () {
  'use strict';

  // ── ONE label constant used by every blurred surface ─────────
  window.COMING_SOON_LABEL = 'בקרוב — ייבנה במודול הרלוונטי';

  // ── ONE registry mapping feature_id → owning module ─────────
  // Documented per the SPEC §0.D D-BADGES decision. Each blurred
  // badge on the card MUST reference a key here.
  window.COMING_SOON_REGISTRY = {
    // Tab 1 — header pills + bottom flags + queue block
    vip:                  'tags system (M5 follow-up)',
    loyalty_member:       'M13 Loyalty',
    subscription:         'M-future Subscriptions',
    queue_position:       'M14 Appointments / Queue',
    // Tab 2 — full body
    vision_function:      'M6 — v_customer_vision_function_history follow-up',
    // Tab 3 — per-row & header actions that need M6 UI
    prescription_edit:    'M6 prescription editor UI',
    prescription_order:   'M7 Orders UI from prescription',
    // Tab 4 — M7 UI
    orders_m7_ui:         'M7 Orders full screen',
    // Tab 5 — deferred-this-SPEC actions
    docs_delete:          'M5 Phase E or storage SPEC follow-up',
    docs_scan:            'OCR pipeline SPEC',
    // Header action buttons
    call_action:          'tel: handler (M-future telephony)',
    whatsapp_action:      'wa.me handler (M-future telephony)'
  };

  /**
   * Show the canonical "coming soon" toast for a deferred feature.
   * Single entry point. All blurred badges + deferred CTAs route here.
   * Iron Rule 34 — pushes a trace event for Chrome MCP runtime evidence.
   *
   * @param {string} featureId — must be a key in COMING_SOON_REGISTRY
   * @param {object} [opts]   — { suppressTrace: false }
   */
  window.showComingSoon = function (featureId, opts) {
    var target = window.COMING_SOON_REGISTRY[featureId] || 'מודול עתידי';
    var msg = window.COMING_SOON_LABEL + ' (' + target + ')';

    // Runtime trace (Iron Rule 34) — populated by customer-card.js bootstrap.
    if (!opts || !opts.suppressTrace) {
      try {
        if (window.__cardTrace && typeof window.__cardTrace.push === 'function') {
          window.__cardTrace.push({
            event: 'showComingSoon',
            featureId: featureId,
            target: target,
            t: Date.now()
          });
        }
      } catch (_) { /* trace is best-effort, never throws */ }
    }

    // Prefer the global Toast helper (shared/js/toast.js). Fallback to
    // shared.js' toast() wrapper which has its own backup path.
    if (typeof Toast !== 'undefined' && typeof Toast.info === 'function') {
      Toast.info(msg);
    } else if (typeof toast === 'function') {
      toast(msg, 'i');
    } else if (typeof console !== 'undefined' && console.info) {
      console.info('[coming-soon]', msg);
    }
  };

  /**
   * Apply blurred + click handler to a single element.
   * Used by header pills + bottom flags + queue block + any per-row
   * coming-soon button. The discipline: NEVER write a per-feature
   * handler — always route through this single function.
   *
   * @param {Element} el         — the DOM element to make a coming-soon trigger
   * @param {string}  featureId  — registry key
   */
  window.bindComingSoon = function (el, featureId) {
    if (!el || !featureId) return;
    el.classList.add('cust-blurred');
    el.setAttribute('data-coming-soon', featureId);
    el.setAttribute(
      'title',
      (window.COMING_SOON_REGISTRY[featureId] || '') + ' — ' + window.COMING_SOON_LABEL
    );
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.showComingSoon(featureId);
    });
  };
})();
