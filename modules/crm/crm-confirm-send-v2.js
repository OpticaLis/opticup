/* crm-confirm-send-v2.js — Controller for CrmConfirmSendV2 modal.
   M4_DRY_RUN_PREVIEW_AND_DISPATCH Phases 3-7 (2026-05-14).
   M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 1: +opts.onCancel +opts.hideCommitWithoutNotify.
   API: show(preview, onChoice, opts?) / showAsync(previewPromise, onChoice, opts?).
   Load AFTER crm-confirm-send-v2-render.js + modal-builder.js + toast.js. */
(function () {
  'use strict';

  var _state = null;
  var _modal = null;
  var _opts = null; // {onCancel, hideCommitWithoutNotify, suppressEmptyModal}

  // M4_MODAL_DEFAULT_ALL_CHECKED_2026_05_19: sessionStorage save/load/restore
  // helpers removed. Each modal open starts with all recipients checked
  // (empty _state.excluded). Per-session UX only; no cross-session state.

  function R() { return window.__CcsV2Render || {}; }

  function pickFirst3() {
    if (!_state) return [];
    var pool = (R().visibleRecipients ? R().visibleRecipients(_state) : []).filter(function (r) {
      var lid = r.lead_id || '';
      return !_state.excluded.has(lid) && !_state.testSent.has(lid);
    });
    return pool.slice(0, 3);
  }

  function refreshFooterLabels(modalEl) {
    if (!_state || _state.phase !== 'loaded') return;
    var approveBtn = modalEl.querySelector('[data-ccsv2-approve="1"]');
    var testBtn    = modalEl.querySelector('[data-ccsv2-test="1"]');
    var countEl    = modalEl.querySelector('[data-ccsv2-count="1"]');
    var total = _state.recipients.length;
    var excludedCount = _state.excluded.size + _state.testSent.size;
    var remaining = total - excludedCount;
    if (approveBtn) {
      approveBtn.textContent = _state.testSent.size > 0 ? 'שלח לשאר (' + remaining + ')' : 'אישור ושלח הודעות (' + remaining + ')';
      approveBtn.disabled = remaining <= 0; // M4_MODAL_DESELECTION_RESTORE_2026_05_19
    }
    if (testBtn) testBtn.disabled = pickFirst3().length < 3;
    if (countEl) countEl.outerHTML = R().renderCountLine(_state); // simple replace
  }

  function rerender(modalEl) {
    if (!_state || !modalEl) return;
    var host = modalEl.querySelector('[data-ccsv2-content="1"]');
    if (!host) return;
    host.innerHTML = R().renderBody(_state);
    refreshFooterLabels(modalEl);
    wireBodyEvents(modalEl);
  }

  function wireBodyEvents(modalEl) {
    // Search input
    var searchEl = modalEl.querySelector('[data-ccsv2-search="1"]');
    if (searchEl) {
      searchEl.addEventListener('input', function (e) {
        if (!_state) return;
        var caret = e.target.selectionStart;
        _state.search = e.target.value || '';
        rerender(modalEl);
        var newSearch = modalEl.querySelector('[data-ccsv2-search="1"]');
        if (newSearch) {
          newSearch.focus();
          try { newSearch.setSelectionRange(caret, caret); } catch (_) {}
        }
      });
    }
    // Chip filter
    modalEl.querySelectorAll('[data-ccsv2-chip]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!_state) return;
        if (el.getAttribute('aria-disabled') === 'true') return;
        _state.chip = el.getAttribute('data-ccsv2-chip') || 'all';
        rerender(modalEl);
      });
    });
    // Checkbox
    modalEl.querySelectorAll('[data-ccsv2-cb="1"]').forEach(function (cb) {
      cb.addEventListener('change', function (e) {
        if (!_state) return;
        var lid = e.target.getAttribute('data-ccsv2-lead-id');
        if (!lid) return;
        if (e.target.checked) _state.excluded.delete(lid);
        else _state.excluded.add(lid);
        refreshFooterLabels(modalEl);
      });
    });
    // Expand toggle (per-row body preview)
    modalEl.querySelectorAll('[data-ccsv2-expand="1"]').forEach(function (cell) {
      cell.addEventListener('click', function (e) {
        if (!_state) return;
        var lid = e.currentTarget.getAttribute('data-ccsv2-lead-id');
        if (!lid) return;
        if (_state.expanded.has(lid)) _state.expanded.delete(lid);
        else _state.expanded.add(lid);
        rerender(modalEl);
      });
    });
    // M4_MODAL_DEFAULT_ALL_CHECKED_2026_05_19: bulk select-all / clear-all.
    var selAllBtn = modalEl.querySelector('[data-ccsv2-select-all="1"]');
    if (selAllBtn) selAllBtn.addEventListener('click', function () {
      if (!_state) return;
      _state.excluded = new Set();
      rerender(modalEl);
    });
    var clrAllBtn = modalEl.querySelector('[data-ccsv2-clear-all="1"]');
    if (clrAllBtn) clrAllBtn.addEventListener('click', function () {
      if (!_state) return;
      _state.excluded = new Set(_state.recipients.map(function (r) { return r.lead_id; }));
      rerender(modalEl);
    });
  }

  function _ensureState(previewResponse, onChoice) {
    // M4_MODAL_DEFAULT_ALL_CHECKED_2026_05_19: always start with empty excluded
    // (= all checked). Each modal open is fresh; no cross-session persistence.
    _state = {
      previewResponse: previewResponse,
      recipients: (previewResponse && previewResponse.recipients_by_lead) ? previewResponse.recipients_by_lead.slice() : [],
      excluded: new Set(),
      expanded: new Set(),
      testSent: new Set(),
      chip: 'all',
      search: '',
      phase: previewResponse ? 'loaded' : 'loading',
      onChoice: onChoice,
    };
  }

  function _openModalShell(onChoice) {
    if (typeof Modal === 'undefined') {
      console.error('CrmConfirmSendV2: Modal not available');
      return null;
    }
    return Modal.show({
      title: 'אישור פעולה',
      size: 'lg',
      content: '<div data-ccsv2-content="1">' + R().renderBody(_state) + '</div>',
      footer: R().renderFooter(_state),
    });
  }

  function _attachHandlers(modal, previewResponseRef, onChoice) {
    var confirmNotifyBtn   = modal.el.querySelector('#ccsv2-confirm-notify');
    var confirmNoNotifyBtn = modal.el.querySelector('#ccsv2-confirm-no-notify');
    var testBtn            = modal.el.querySelector('#ccsv2-test-send');
    var cancelBtn          = modal.el.querySelector('#ccsv2-cancel');

    async function handleConfirm(choice, btnEl, busyText) {
      if (confirmNotifyBtn) confirmNotifyBtn.disabled = true;
      if (confirmNoNotifyBtn) confirmNoNotifyBtn.disabled = true;
      if (testBtn) testBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      btnEl.textContent = busyText;
      var excludeLeadIds = Array.from(_state.excluded).concat(Array.from(_state.testSent));
      var ctx = { previewResponse: previewResponseRef.get(), excludeLeadIds: excludeLeadIds, recipientSubset: null };
      var r;
      if (typeof onChoice === 'function') {
        try { r = await onChoice(choice, ctx); }
        catch (e) { console.error('CrmConfirmSendV2 onChoice threw:', e); r = null; }
      }
      if (typeof modal.close === 'function') modal.close();
      var queuedCount = (r && typeof r.queued === 'number') ? r.queued : 0;
      var dispatchRunId = (r && r.run_id) || null;
      if (choice.dispatch && dispatchRunId && queuedCount > 0 && window.CrmBroadcastCancel) {
        CrmBroadcastCancel.showCancelToast({ runId: dispatchRunId, queuedCount: queuedCount });
      } else if (window.Toast) {
        if (choice.dispatch) Toast.success('נשלחו ' + queuedCount + ' הודעות לתור.');
        else Toast.success('הסטטוסים עודכנו (ללא שליחת הודעות)');
      }
      _state = null;
      _modal = null;
    }

    async function handleTestSend() {
      if (!_state) return;
      var subset = pickFirst3();
      if (subset.length < 3) {
        if (window.Toast) Toast.warning('אין מספיק נמענים זמינים לבדיקה (צריך 3).');
        return;
      }
      var subsetIds = subset.map(function (r) { return r.lead_id; });
      var origLabel = testBtn ? testBtn.textContent : '';
      if (testBtn) { testBtn.disabled = true; testBtn.textContent = 'שולח טסט...'; }
      if (confirmNotifyBtn) confirmNotifyBtn.disabled = true;
      if (confirmNoNotifyBtn) confirmNoNotifyBtn.disabled = true;
      var ctx = { previewResponse: previewResponseRef.get(), excludeLeadIds: [], recipientSubset: subsetIds };
      var r = null;
      if (typeof onChoice === 'function') {
        try { r = await onChoice({ dispatch: true, action: 'test_send' }, ctx); }
        catch (e) { console.error('CrmConfirmSendV2 test_send threw:', e); }
      }
      var ok = r && (r.queued > 0 || r.sent > 0);
      if (ok) {
        subsetIds.forEach(function (lid) { _state.testSent.add(lid); });
        if (window.Toast) Toast.success('✅ נשלח טסט ל-3 נמענים. בדוק וסמן "שלח לשאר" להמשך.');
      } else {
        if (window.Toast) Toast.warning('שליחת הטסט נכשלה. ראה קונסול.');
        if (testBtn) testBtn.textContent = origLabel || '📤 שלח טסט ל-3 הראשונים';
      }
      if (confirmNotifyBtn) confirmNotifyBtn.disabled = false;
      if (confirmNoNotifyBtn) confirmNoNotifyBtn.disabled = false;
      rerender(modal.el);
    }

    if (confirmNotifyBtn) confirmNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: true,  action: 'dispatch' }, confirmNotifyBtn, 'שולח...');
    });
    if (confirmNoNotifyBtn) confirmNoNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: false, action: 'dispatch' }, confirmNoNotifyBtn, 'מעדכן...');
    });
    if (testBtn) testBtn.addEventListener('click', handleTestSend);
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      var cb = (_opts && typeof _opts.onCancel === 'function') ? _opts.onCancel : null;
      _state = null; _modal = null; _opts = null;
      if (typeof modal.close === 'function') modal.close();
      if (cb) { try { cb(); } catch (e) { console.warn('CrmConfirmSendV2 onCancel threw:', e); } }
    });
    if (_opts && _opts.hideCommitWithoutNotify && confirmNoNotifyBtn) {
      confirmNoNotifyBtn.parentNode && confirmNoNotifyBtn.parentNode.removeChild(confirmNoNotifyBtn);
    }
  }

  function _hydrate(modal, previewResponse) {
    // M4_MODAL_DEFAULT_ALL_CHECKED_2026_05_19: empty excluded stays empty
    // (all checked default). No session-restore step here anymore.
    _state.previewResponse = previewResponse;
    _state.recipients = (previewResponse && previewResponse.recipients_by_lead)
      ? previewResponse.recipients_by_lead.slice() : [];
    _state.phase = 'loaded';
    rerender(modal.el);
    var footerEl = modal.el.querySelector('.modal-footer');
    if (footerEl) {
      footerEl.innerHTML = R().renderFooter(_state);
      _attachHandlers(modal, { get: function () { return previewResponse; } }, _state.onChoice);
    }
  }

  async function show(previewResponse, onChoice, opts) {
    if (!previewResponse || !Array.isArray(previewResponse.recipients_by_lead)) {
      if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
      return;
    }
    _opts = opts || null;
    _ensureState(previewResponse, onChoice);
    _modal = _openModalShell(onChoice);
    if (!_modal) return;
    wireBodyEvents(_modal.el);
    _attachHandlers(_modal, { get: function () { return previewResponse; } }, onChoice);
  }

  // showAsync(previewPromise, onChoice, opts?). opts.suppressEmptyModal/onCancel/hideCommitWithoutNotify.
  async function showAsync(previewPromise, onChoice, opts) {
    _opts = opts || null;
    if (opts && opts.suppressEmptyModal) {
      var pv2;
      try { pv2 = await previewPromise; }
      catch (e) {
        console.error('CrmConfirmSendV2 showAsync — preview failed:', e);
        if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה.');
        return;
      }
      try { window.__statusChangeTrace = window.__statusChangeTrace || []; window.__statusChangeTrace.push({step:'showAsync:previewResolved', hasPv2:!!pv2, isArray: pv2 ? Array.isArray(pv2.recipients_by_lead) : null, recipientsLen: pv2 && Array.isArray(pv2.recipients_by_lead) ? pv2.recipients_by_lead.length : null, t:Date.now()}); } catch (_) {}
      if (!pv2 || !Array.isArray(pv2.recipients_by_lead) || !pv2.recipients_by_lead.length) return;
      try { window.__statusChangeTrace.push({step:'showAsync:openingModal', recipientsLen: pv2.recipients_by_lead.length, t:Date.now()}); } catch (_) {}
      try {
        _ensureState(pv2, onChoice);
        _modal = _openModalShell(onChoice);
        if (!_modal) { try { window.__statusChangeTrace.push({step:'showAsync:openModalShellReturnedNull', t:Date.now()}); } catch (_) {} return; }
        try { window.__statusChangeTrace.push({step:'showAsync:modalShellOpened', modalHasEl:!!(_modal && _modal.el), t:Date.now()}); } catch (_) {}
        wireBodyEvents(_modal.el);
        _attachHandlers(_modal, { get: function () { return pv2; } }, onChoice);
        try { window.__statusChangeTrace.push({step:'showAsync:handlersAttached', t:Date.now()}); } catch (_) {}
      } catch (renderErr) {
        try { window.__statusChangeTrace.push({step:'showAsync:renderThrew', error: renderErr && renderErr.message, stack: renderErr && renderErr.stack, t:Date.now()}); } catch (_) {}
        throw renderErr;
      }
      return;
    }
    _ensureState(null, onChoice);
    _modal = _openModalShell(onChoice);
    if (!_modal) return;
    var pv;
    try { pv = await previewPromise; }
    catch (e) {
      console.error('CrmConfirmSendV2 showAsync — preview failed:', e);
      if (_modal && typeof _modal.close === 'function') _modal.close();
      if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה.');
      _state = null; _modal = null; _opts = null;
      return;
    }
    if (!pv || !Array.isArray(pv.recipients_by_lead) || !pv.recipients_by_lead.length) {
      if (_modal && typeof _modal.close === 'function') _modal.close();
      if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
      _state = null; _modal = null; _opts = null;
      return;
    }
    _hydrate(_modal, pv);
  }

  window.CrmConfirmSendV2 = { show: show, showAsync: showAsync };
})();
