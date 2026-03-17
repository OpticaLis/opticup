/* =============================================================================
   modal-wizard.js — Wizard extension for Modal system
   Depends on: modal-builder.js (must load AFTER it). Uses Modal.show() + Modal._createEl().
   ============================================================================= */

(function () {
  'use strict';

  if (!window.Modal) throw new Error('modal-wizard.js requires modal-builder.js loaded first');

  var _createEl = Modal._createEl;

  function wizard(config) {
    var steps = config.steps || [];
    if (steps.length < 2) throw new Error('Wizard requires at least 2 steps');

    var finishText = config.finishText || '\u05E1\u05D9\u05D5\u05DD'; // סיום
    var nextText = config.nextText || '\u05D4\u05D1\u05D0'; // הבא
    var backText = config.backText || '\u05D4\u05E7\u05D5\u05D3\u05DD'; // הקודם
    var currentStep = 0;
    var _finished = false;

    // Build progress bar
    var progress = _createEl('div', 'wizard-progress');
    steps.forEach(function (step, i) {
      var stepEl = _createEl('div', 'wizard-step');
      var numEl = _createEl('span', 'wizard-step-num');
      numEl.textContent = String(i + 1);
      var labelEl = _createEl('span', null);
      labelEl.textContent = step.label || '';
      stepEl.appendChild(numEl);
      stepEl.appendChild(labelEl);
      stepEl.dataset.step = i;
      progress.appendChild(stepEl);
    });

    // Build panels
    var panelsHtml = steps.map(function (step, i) {
      var content = typeof step.content === 'function' ? step.content() : (step.content || '');
      return '<div class="wizard-panel" data-panel="' + i + '">' + content + '</div>';
    }).join('');

    // Footer
    var footer = _createEl('div', 'modal-footer');
    var cancelBtn = _createEl('button', 'btn btn-ghost');
    cancelBtn.textContent = '\u05D1\u05D9\u05D8\u05D5\u05DC'; // ביטול
    cancelBtn.setAttribute('type', 'button');
    cancelBtn.style.marginInlineEnd = 'auto';
    var backBtn = _createEl('button', 'btn btn-secondary');
    backBtn.textContent = backText;
    backBtn.setAttribute('type', 'button');
    var nextBtn = _createEl('button', 'btn btn-primary');
    nextBtn.textContent = nextText;
    nextBtn.setAttribute('type', 'button');
    footer.appendChild(cancelBtn);
    footer.appendChild(backBtn);
    footer.appendChild(nextBtn);

    var modal = Modal.show({
      size: config.size || 'xl',
      title: config.title,
      content: panelsHtml,
      _footerEl: footer,
      _wizardProgress: progress,
      _type: 'wizard',
      closeOnEscape: true,
      closeOnBackdrop: false,
      onClose: function () { if (!_finished && typeof config.onCancel === 'function') config.onCancel(); }
    });

    function updateWizard() {
      // Progress indicators
      var stepEls = progress.querySelectorAll('.wizard-step');
      stepEls.forEach(function (el, i) {
        el.classList.remove('wizard-step-active', 'wizard-step-done');
        var numEl = el.querySelector('.wizard-step-num');
        if (i < currentStep) {
          el.classList.add('wizard-step-done');
          numEl.textContent = '\u2713'; // ✓
        } else if (i === currentStep) {
          el.classList.add('wizard-step-active');
          numEl.textContent = String(i + 1);
        } else {
          numEl.textContent = String(i + 1);
        }
      });

      // Panels
      var panels = modal.el.querySelectorAll('.wizard-panel');
      panels.forEach(function (p, i) {
        p.classList.toggle('wizard-panel-active', i === currentStep);
      });

      // Re-generate dynamic content
      var step = steps[currentStep];
      if (typeof step.content === 'function') {
        panels[currentStep].innerHTML = step.content();
      }

      // Button visibility
      backBtn.style.display = currentStep === 0 ? 'none' : '';
      nextBtn.textContent = currentStep === steps.length - 1 ? finishText : nextText;

      // onEnter callback
      if (typeof step.onEnter === 'function') {
        step.onEnter(panels[currentStep]);
      }
    }

    nextBtn.addEventListener('click', function () {
      var step = steps[currentStep];
      if (typeof step.validate === 'function' && !step.validate()) return;
      var panels = modal.el.querySelectorAll('.wizard-panel');
      if (typeof step.onLeave === 'function') step.onLeave(panels[currentStep]);

      if (currentStep === steps.length - 1) {
        _finished = true;
        if (typeof config.onFinish === 'function') config.onFinish(modal.el);
        modal.close();
      } else {
        currentStep++;
        updateWizard();
      }
    });

    backBtn.addEventListener('click', function () {
      if (currentStep <= 0) return;
      var panels = modal.el.querySelectorAll('.wizard-panel');
      var step = steps[currentStep];
      if (typeof step.onLeave === 'function') step.onLeave(panels[currentStep]);
      currentStep--;
      updateWizard();
    });

    cancelBtn.addEventListener('click', function () {
      modal.close();
    });

    updateWizard();
    return { el: modal.el, close: modal.close };
  }

  // Attach to Modal
  Modal.wizard = wizard;
})();
