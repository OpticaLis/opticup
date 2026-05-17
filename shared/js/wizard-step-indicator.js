/* wizard-step-indicator.js — Standalone page-level wizard step indicator
   ============================================================================
   Renders an inline horizontal stepper (4 circles with connecting lines,
   active/done/upcoming states). DISTINCT from modal-wizard.js which provides
   wizard navigation INSIDE a modal — this one is a standalone presentational
   indicator for full-page wizard flows (e.g., PO 4-step wizard).

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #4). Used in 2 mockups (Inventory bulk-add, PO 4-step).

   API:
     WizardSteps.init(container, {
       steps: [
         { id, label, icon? }, ...
       ],
       activeIndex: 1,          // 0-based; everything <activeIndex is "done"
       onStepClick?: (id, idx) => {}  // optional — clickable steps only when
                                       // host allows. Default: not clickable.
       allowJumpToCompletedOnly?: true  // default — only "done" steps emit
                                          // click events; future steps are
                                          // non-interactive
     }) → { setActiveIndex, getActiveIndex, destroy }

   Class prefix `.wstep-*` (matches mockup HTML). NO collision with the
   `.wizard-step-*` classes in shared/css/modal.css used by modal-wizard.js.

   Deps: wizard-step-indicator.css (required). Tokens consumed: --wstep-*.
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function init(container, config) {
    if (!container) throw new Error('WizardSteps.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('WizardSteps.init: mount not found: ' + container);

    var steps        = Array.isArray(config && config.steps) ? config.steps.slice() : [];
    var activeIndex  = (config && typeof config.activeIndex === 'number') ? config.activeIndex : 0;
    var onClick      = (config && typeof config.onStepClick === 'function') ? config.onStepClick : null;
    var allowDoneOnly = (config && config.allowJumpToCompletedOnly !== false);
    var destroyed    = false;

    function _stateOf(i) {
      if (i < activeIndex) return 'done';
      if (i === activeIndex) return 'active';
      return 'upcoming';
    }

    function _render() {
      var html = '<div class="wstep-row" role="group" aria-label="Wizard progress">';
      for (var i = 0; i < steps.length; i++) {
        var s     = steps[i];
        var state = _stateOf(i);
        var classes = ['wstep'];
        classes.push('wstep-' + state);
        var clickable = onClick && (state === 'done' || !allowDoneOnly);
        if (clickable) classes.push('wstep-clickable');
        html += '<div class="' + classes.join(' ') + '" data-step-idx="' + i + '"' +
                (clickable ? ' role="button" tabindex="0"' : ' aria-disabled="true"') + '>';
        html += '<div class="wstep-circle">';
        if (state === 'done') {
          html += '<span aria-hidden="true">✓</span>';
        } else if (s.icon) {
          html += _esc(s.icon);
        } else {
          html += String(i + 1);
        }
        html += '</div>';
        html += '<div class="wstep-label">' + _esc(s.label || '') + '</div>';
        html += '</div>';

        if (i < steps.length - 1) {
          var lineClass = (i < activeIndex) ? 'wstep-line wstep-line-done' : 'wstep-line';
          html += '<div class="' + lineClass + '" aria-hidden="true"></div>';
        }
      }
      html += '</div>';
      mount.innerHTML = html;
    }

    function _handleClick(e) {
      var stepEl = e.target.closest('.wstep');
      if (!stepEl || !stepEl.classList.contains('wstep-clickable')) return;
      var idx = parseInt(stepEl.dataset.stepIdx, 10);
      if (isNaN(idx)) return;
      if (onClick) {
        try { onClick(steps[idx] && steps[idx].id, idx); }
        catch (err) { console.error('[wizard-steps] onStepClick threw:', err); }
      }
    }

    function _handleKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var stepEl = e.target.closest('.wstep');
      if (!stepEl || !stepEl.classList.contains('wstep-clickable')) return;
      e.preventDefault();
      _handleClick(e);
    }

    function setActiveIndex(idx) {
      if (typeof idx !== 'number' || idx < 0 || idx >= steps.length) return;
      activeIndex = idx;
      if (!destroyed) _render();
    }

    function getActiveIndex() { return activeIndex; }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      mount.removeEventListener('click', _handleClick);
      mount.removeEventListener('keydown', _handleKey);
      mount.innerHTML = '';
    }

    _render();
    mount.addEventListener('click', _handleClick);
    mount.addEventListener('keydown', _handleKey);

    return { setActiveIndex: setActiveIndex, getActiveIndex: getActiveIndex, destroy: destroy };
  }

  window.WizardSteps = { init: init };
})();
