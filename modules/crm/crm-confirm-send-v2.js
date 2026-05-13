/* crm-confirm-send-v2.js — Server-authoritative confirmation modal (v2).
   M4_DRY_RUN_PREVIEW_AND_DISPATCH (Phases 3-5+, 2026-05-14).
   Consumes EF mode='dispatch_preview' JSON; renders recipient-first preview
   with search + checkboxes + body expand + test-send. Phase 6+ adds cancel
   toast + chip filters + sessionStorage. API:
     CrmConfirmSendV2.show(previewResponse, onChoice)
       onChoice(choice, ctx) — choice.action in {dispatch, test_send};
       ctx = {previewResponse, excludeLeadIds, recipientSubset}
   Load AFTER modal-builder.js + toast.js. */
(function () {
  'use strict';

  var _state = null;

  function fmtPhone(p) {
    if (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') return CrmHelpers.formatPhone(p);
    return p || '';
  }
  function channelLabel(ch) { return ch === 'email' ? 'אימייל' : (ch === 'whatsapp' ? 'WhatsApp' : 'SMS'); }
  function channelIcon(ch)  { return ch === 'email' ? '✉️' : (ch === 'whatsapp' ? '💬' : '📱'); }

  // Lower-case substring match on name, phone (digits-only), or email.
  function matchesSearch(r, term) {
    if (!term) return true;
    var t = term.toLowerCase();
    var name  = String(r.full_name || '').toLowerCase();
    var phone = String(r.phone || '').replace(/[^\d]/g, '');
    var email = String(r.email || '').toLowerCase();
    return name.indexOf(t) !== -1 || phone.indexOf(t.replace(/[^\d]/g, '')) !== -1 || email.indexOf(t) !== -1;
  }

  function getVisibleRecipients() {
    if (!_state) return [];
    return _state.recipients.filter(function (r) { return matchesSearch(r, _state.search || ''); });
  }

  // Iron Rule 8: render bodies via escapeHtml + <pre>. Email source (not
  // rendered HTML) on purpose — operator inspects variable substitution here.
  function renderExpandedBody(r) {
    var smsBlock = '';
    if (r.message_body_sms && r.message_body_sms.length) {
      smsBlock =
        '<div class="border border-slate-200 rounded-lg p-2 bg-white mb-2">' +
          '<div class="text-xs text-slate-500 mb-1">📱 ' + escapeHtml(channelLabel('sms')) + '</div>' +
          '<pre class="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-48 overflow-auto">' + escapeHtml(r.message_body_sms) + '</pre>' +
        '</div>';
    }
    var emailBlock = '';
    if (r.message_body_email && r.message_body_email.length) {
      emailBlock =
        '<div class="border border-slate-200 rounded-lg p-2 bg-white mb-2">' +
          '<div class="text-xs text-slate-500 mb-1">✉️ ' + escapeHtml(channelLabel('email')) + ' (HTML source)</div>' +
          '<pre class="whitespace-pre-wrap text-xs text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-48 overflow-auto" style="direction:ltr">' + escapeHtml(r.message_body_email) + '</pre>' +
        '</div>';
    }
    if (!smsBlock && !emailBlock) {
      return '<div class="text-center text-slate-400 py-2">אין תוכן הודעה לנמען זה.</div>';
    }
    return smsBlock + emailBlock;
  }

  function renderRecipientRow(r) {
    var leadId = r.lead_id || '';
    var checked = (!_state || !_state.excluded.has(leadId)) ? 'checked' : '';
    var expanded = _state && _state.expanded.has(leadId);
    var caret = expanded ? '▼' : '◀';
    var testBadge = (_state && _state.testSent.has(leadId))
      ? ' <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ms-1">📤 נשלח טסט</span>'
      : '';
    var mainRow =
      '<tr class="border-b border-slate-100" data-ccsv2-row="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '">' +
        '<td class="px-2 py-2 align-middle"><input type="checkbox" data-ccsv2-cb="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '" ' + checked + ' class="cursor-pointer"></td>' +
        '<td class="px-3 py-2 text-slate-800 cursor-pointer" data-ccsv2-expand="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '"><span class="text-slate-400 me-1">' + caret + '</span>' + escapeHtml(r.full_name || '—') + testBadge + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr;text-align:end">' + escapeHtml(fmtPhone(r.phone) || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr">' + escapeHtml(r.email || '—') + '</td>' +
      '</tr>';
    if (!expanded) return mainRow;
    var expandRow =
      '<tr class="bg-slate-50" data-ccsv2-expand-row="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '">' +
        '<td colspan="4" class="px-3 py-2">' + renderExpandedBody(r) + '</td>' +
      '</tr>';
    return mainRow + expandRow;
  }

  function renderRecipientTable() {
    var visible = getVisibleRecipients();
    if (!visible.length) {
      return '<div class="text-center text-slate-400 py-6">אין נמענים תואמים לחיפוש.</div>';
    }
    var header =
      '<thead><tr>' +
        '<th class="px-2 py-2 text-start font-semibold text-slate-700 bg-slate-50" style="width:1.5rem">&nbsp;</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">שם</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">טלפון</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">מייל</th>' +
      '</tr></thead>';
    var rows = visible.map(renderRecipientRow).join('');
    return (
      '<div class="overflow-auto max-h-[55vh] border border-slate-200 rounded-lg">' +
        '<table class="w-full text-sm">' + header + '<tbody data-ccsv2-tbody="1">' + rows + '</tbody></table>' +
      '</div>'
    );
  }

  function renderHeader(previewResponse) {
    var rules = Array.isArray(previewResponse.rules) ? previewResponse.rules : [];
    var channels = Array.isArray(previewResponse.channels) ? previewResponse.channels : [];
    var ruleLine = rules.length === 1
      ? 'חוק: "' + escapeHtml(rules[0].rule_name || '') + '"'
      : (rules.length + ' חוקים');
    var channelChips = channels.map(function (c) {
      return '<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 me-1">' + channelIcon(c) + ' ' + escapeHtml(channelLabel(c)) + '</span>';
    }).join('');
    return '<div class="text-xs text-slate-500 mb-2">' + ruleLine + ' &nbsp;·&nbsp; ' + channelChips + '</div>';
  }

  function renderControls() {
    var searchVal = _state && _state.search ? escapeHtml(_state.search) : '';
    return (
      '<div class="flex items-center gap-2 mb-2">' +
        '<input type="text" data-ccsv2-search="1" value="' + searchVal + '" placeholder="🔎 חיפוש לפי שם, טלפון, או מייל" class="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">' +
      '</div>'
    );
  }

  function renderBody(previewResponse) {
    var total = _state ? _state.recipients.length : 0;
    var selected = total - (_state ? _state.excluded.size : 0);
    return (
      renderHeader(previewResponse) +
      renderControls() +
      '<div class="text-sm text-slate-700 mb-2" data-ccsv2-count="1">' + total + ' נמענים (' + selected + ' נבחרו)</div>' +
      renderRecipientTable()
    );
  }

  function renderFooter(total) {
    var testDisabled = total < 3 ? ' disabled' : '';
    return (
      '<button type="button" id="ccsv2-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="ccsv2-test-send" class="px-4 py-2 border border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed" data-ccsv2-test="1"' + testDisabled + '>📤 שלח טסט ל-3 הראשונים</button>' +
      '<button type="button" id="ccsv2-confirm-no-notify" class="px-4 py-2 border border-slate-400 bg-white text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition">אישור ללא הודעות</button>' +
      '<button type="button" id="ccsv2-confirm-notify" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm" data-ccsv2-approve="1">אישור ושלח הודעות (' + total + ')</button>'
    );
  }

  // First-3 alphabetical of the currently visible-and-checked-and-not-test-sent
  // recipients. The EF already sorted alphabetically; we maintain that order
  // through the filtering chain (Array.filter is stable in V8).
  function pickFirst3() {
    if (!_state) return [];
    var pool = getVisibleRecipients().filter(function (r) {
      var lid = r.lead_id || '';
      return !_state.excluded.has(lid) && !_state.testSent.has(lid);
    });
    return pool.slice(0, 3);
  }

  function refreshFooterLabels(modalEl) {
    if (!_state) return;
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
    if (testBtn) {
      var eligible = pickFirst3().length;
      testBtn.disabled = eligible < 3;
    }
    if (countEl) {
      var sel = total - _state.excluded.size;
      countEl.textContent = total + ' נמענים (' + sel + ' נבחרו, ' + _state.testSent.size + ' נשלחו טסט)';
    }
  }

  function rerenderTable(modalEl) {
    if (!_state) return;
    var host = modalEl.querySelector('[data-ccsv2-content="1"]');
    if (!host) return;
    host.innerHTML = renderBody(_state.previewResponse);
    refreshFooterLabels(modalEl);
    wireBodyEvents(modalEl);
  }

  function wireBodyEvents(modalEl) {
    // Search input — preserves focus across rerenders by saving caret position.
    var searchEl = modalEl.querySelector('[data-ccsv2-search="1"]');
    if (searchEl) {
      searchEl.addEventListener('input', function (e) {
        if (!_state) return;
        var caret = e.target.selectionStart;
        _state.search = e.target.value || '';
        rerenderTable(modalEl);
        var newSearch = modalEl.querySelector('[data-ccsv2-search="1"]');
        if (newSearch) {
          newSearch.focus();
          try { newSearch.setSelectionRange(caret, caret); } catch (_) {}
        }
      });
    }
    // Checkbox — toggles _state.excluded set.
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
    // Expand toggle — name cell click swaps expanded set membership.
    modalEl.querySelectorAll('[data-ccsv2-expand="1"]').forEach(function (cell) {
      cell.addEventListener('click', function (e) {
        if (!_state) return;
        var lid = e.currentTarget.getAttribute('data-ccsv2-lead-id');
        if (!lid) return;
        if (_state.expanded.has(lid)) _state.expanded.delete(lid);
        else _state.expanded.add(lid);
        rerenderTable(modalEl);
      });
    });
  }

  async function show(previewResponse, onChoice) {
    if (!previewResponse || !Array.isArray(previewResponse.recipients_by_lead)) {
      if (window.Toast) Toast.warning('אין נמענים — ההודעה לא תישלח.');
      return;
    }
    if (typeof Modal === 'undefined') {
      console.error('CrmConfirmSendV2: Modal not available');
      return;
    }
    _state = {
      previewResponse: previewResponse,
      recipients: previewResponse.recipients_by_lead.slice(),
      excluded: new Set(),
      expanded: new Set(),
      testSent: new Set(),
      search: '',
      onChoice: onChoice,
    };

    var modal = Modal.show({
      title: 'אישור פעולה',
      size: 'lg',
      content: '<div data-ccsv2-content="1">' + renderBody(previewResponse) + '</div>',
      footer: renderFooter(_state.recipients.length),
    });
    wireBodyEvents(modal.el);

    var confirmNotifyBtn   = modal.el.querySelector('#ccsv2-confirm-notify');
    var confirmNoNotifyBtn = modal.el.querySelector('#ccsv2-confirm-no-notify');
    var testBtn            = modal.el.querySelector('#ccsv2-test-send');
    var cancelBtn          = modal.el.querySelector('#ccsv2-cancel');

    // Dispatch handler — terminal action that closes the modal.
    async function handleConfirm(choice, btnEl, busyText) {
      if (confirmNotifyBtn) confirmNotifyBtn.disabled = true;
      if (confirmNoNotifyBtn) confirmNoNotifyBtn.disabled = true;
      if (testBtn) testBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      btnEl.textContent = busyText;
      // Test-sent IDs are excluded from the final approve dispatch — they
      // already received the message, no double-send.
      var excludeLeadIds = Array.from(_state.excluded).concat(Array.from(_state.testSent));
      var ctx = { previewResponse: previewResponse, excludeLeadIds: excludeLeadIds, recipientSubset: null };
      var r;
      if (typeof onChoice === 'function') {
        try { r = await onChoice(choice, ctx); }
        catch (e) { console.error('CrmConfirmSendV2 onChoice threw:', e); r = null; }
      }
      if (typeof modal.close === 'function') modal.close();
      if (window.Toast) {
        if (choice.dispatch) {
          var sent = (r && typeof r.queued === 'number') ? r.queued : (r && r.sent) || 0;
          Toast.success('נשלחו ' + sent + ' הודעות לתור.');
        } else {
          Toast.success('הסטטוסים עודכנו (ללא שליחת הודעות)');
        }
      }
      _state = null;
    }

    // Test-send handler — non-terminal: modal stays open after EF returns.
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
      var ctx = { previewResponse: previewResponse, excludeLeadIds: [], recipientSubset: subsetIds };
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
      rerenderTable(modal.el);
    }

    confirmNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: true,  action: 'dispatch' }, confirmNotifyBtn, 'שולח...');
    });
    confirmNoNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: false, action: 'dispatch' }, confirmNoNotifyBtn, 'מעדכן...');
    });
    if (testBtn) {
      testBtn.addEventListener('click', handleTestSend);
    }
    cancelBtn.addEventListener('click', function () {
      _state = null;
      if (typeof modal.close === 'function') modal.close();
    });
  }

  window.CrmConfirmSendV2 = {
    show: show,
    _refreshFooterLabels: refreshFooterLabels,
    _rerenderTable: rerenderTable,
  };
})();
