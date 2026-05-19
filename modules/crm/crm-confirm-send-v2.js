/* crm-confirm-send-v2.js — Controller for CrmConfirmSendV2 modal.
   M4_DRY_RUN_PREVIEW_AND_DISPATCH Phases 3-7 (2026-05-14).
   Owns _state + event wiring; delegates rendering to __CcsV2Render.
   API:
     CrmConfirmSendV2.show(previewResponse, onChoice)           // sync open
     CrmConfirmSendV2.showAsync(previewPromise, onChoice, opts) // open with
       loading state; resolves on EF return. opts = { ruleId: <hint-for-restore> }
   Load AFTER crm-confirm-send-v2-render.js + modal-builder.js + toast.js. */
(function () {
  'use strict';

  var _state = null;
  var _modal = null;
  var STORE_KEY = 'crm_confirm_send_selection_v1';
  var STORE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  function R() { return window.__CcsV2Render || {}; }

  function _saveSession() {
    if (!_state || _state.phase !== 'loaded' || typeof sessionStorage === 'undefined') return;
    try {
      var rules = (_state.previewResponse && _state.previewResponse.rules) || [];
      var ruleKey = rules.length ? rules[0].rule_id : null;
      if (!ruleKey) return;
      var entry = {
        ruleKey: ruleKey,
        excluded: Array.from(_state.excluded),
        chip: _state.chip || 'all',
        search: _state.search || '',
        ts: Date.now(),
      };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(entry));
    } catch (_) {}
  }

  function _loadSession(previewResponse) {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !entry.ts || (Date.now() - entry.ts) > STORE_TTL_MS) {
        sessionStorage.removeItem(STORE_KEY); return null;
      }
      var rules = (previewResponse && previewResponse.rules) || [];
      var ruleKey = rules.length ? rules[0].rule_id : null;
      if (entry.ruleKey !== ruleKey) return null;
      return entry;
    } catch (_) { return null; }
  }

  function _clearSession() {
    if (typeof sessionStorage === 'undefined') return;
    try { sessionStorage.removeItem(STORE_KEY); } catch (_) {}
  }

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
      approveBtn.textContent = _state.testSent.size > 0
        ? 'שלח לשאר (' + remaining + ')'
        : 'אישור ושלח הודעות (' + remaining + ')';
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
    _saveSession();
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
        _saveSession();
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
    // Restore quick-undo (Brief §3.1) — clears the restored exclusions so all
    // recipients are re-selected without forcing the operator to tick each box.
    var undoBtn = modalEl.querySelector('[data-ccsv2-undo-restore="1"]');
    if (undoBtn) {
      undoBtn.addEventListener('click', function () {
        if (!_state) return;
        _state.excluded = new Set();
        _state.restored = false;
        rerender(modalEl);
      });
    }
  }

  function _ensureState(previewResponse, onChoice) {
    var restored = _loadSession(previewResponse);
    _state = {
      previewResponse: previewResponse,
      recipients: (previewResponse && previewResponse.recipients_by_lead) ? previewResponse.recipients_by_lead.slice() : [],
      excluded: new Set(restored ? restored.excluded : []),
      expanded: new Set(),
      testSent: new Set(),
      chip: restored ? (restored.chip || 'all') : 'all',
      search: restored ? (restored.search || '') : '',
      phase: previewResponse ? 'loaded' : 'loading',
      restored: !!restored,
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
      _clearSession();
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
      _state = null;
      _modal = null;
      if (typeof modal.close === 'function') modal.close();
    });
  }

  function _hydrate(modal, previewResponse) {
    _state.previewResponse = previewResponse;
    _state.recipients = (previewResponse && previewResponse.recipients_by_lead)
      ? previewResponse.recipients_by_lead.slice() : [];
    _state.phase = 'loaded';
    // showAsync path enters _ensureState with previewResponse=null, so the
    // initial _loadSession could not match a rule key. Retry now that rules
    // are known — this is the load-on-open wire for M4-V2-SESSION-RESTORE-01.
    if (!_state.restored) {
      var late = _loadSession(previewResponse);
      if (late) {
        _state.excluded = new Set(late.excluded);
        _state.chip = late.chip || 'all';
        _state.search = late.search || '';
        _state.restored = true;
      }
    }
    // Reconcile restored excluded set with new recipient list (drop stale ids
    // silently — Brief §3.1 stale-lead reconciliation).
    var validIds = new Set(_state.recipients.map(function (r) { return r.lead_id; }));
    Array.from(_state.excluded).forEach(function (id) { if (!validIds.has(id)) _state.excluded.delete(id); });
    rerender(modal.el);
    // Footer needs re-render too (button enables based on count).
    var footerEl = modal.el.querySelector('.modal-footer');
    if (footerEl) {
      footerEl.innerHTML = R().renderFooter(_state);
      _attachHandlers(modal, { get: function () { return previewResponse; } }, _state.onChoice);
    }
  }

  async function show(previewResponse, onChoice) {
    if (!previewResponse || !Array.isArray(previewResponse.recipients_by_lead)) {
      if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
      return;
    }
    _ensureState(previewResponse, onChoice);
    _modal = _openModalShell(onChoice);
    if (!_modal) return;
    wireBodyEvents(_modal.el);
    _attachHandlers(_modal, { get: function () { return previewResponse; } }, onChoice);
    _saveSession();
  }

  // showAsync(previewPromise, onChoice, opts?) — opts.suppressEmptyModal=true
  // awaits preview first + opens modal only when recipients > 0 (silent skip
  // when empty). Closes QA Finding 1.1 (modal flash on status changes). Legacy
  // path (no flag) keeps loading-spinner UX for broadcast wizard + manual flows.
  async function showAsync(previewPromise, onChoice, opts) {
    if (opts && opts.suppressEmptyModal) {
      var pv2;
      try { pv2 = await previewPromise; }
      catch (e) {
        console.error('CrmConfirmSendV2 showAsync — preview failed:', e);
        if (window.Toast) Toast.error('כשל בטעינת תצוגה מקדימה.');
        return;
      }
      if (!pv2 || !Array.isArray(pv2.recipients_by_lead) || !pv2.recipients_by_lead.length) return;
      _ensureState(pv2, onChoice);
      _modal = _openModalShell(onChoice);
      if (!_modal) return;
      wireBodyEvents(_modal.el);
      _attachHandlers(_modal, { get: function () { return pv2; } }, onChoice);
      _saveSession();
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
      _state = null; _modal = null;
      return;
    }
    if (!pv || !Array.isArray(pv.recipients_by_lead) || !pv.recipients_by_lead.length) {
      if (_modal && typeof _modal.close === 'function') _modal.close();
      if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
      _state = null; _modal = null;
      return;
    }
    _hydrate(_modal, pv);
  }

  window.CrmConfirmSendV2 = { show: show, showAsync: showAsync };
})();
