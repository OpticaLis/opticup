/* =============================================================================
   crm-confirm-send-v2.js — Server-authoritative confirmation modal (v2).
   M4_DRY_RUN_PREVIEW_AND_DISPATCH — Phases 3-4 (2026-05-14).

   Consumes the automation-engine EF's mode='dispatch_preview' response
   (recipients_by_lead, rules, channels) and renders a recipient-first
   preview. Operator can Cancel / "Confirm without notify" / "Confirm and send".

   Phase 4 (this rev): in-list search, per-recipient checkboxes (default
   checked → deselection captured in excluded set), expand-on-click body
   preview (SMS + email when applicable). Phase 5: test-send button.
   Phase 6: post-dispatch cancel toast. Phase 7: count progression + chip
   filters + last-message line + sessionStorage.

   API (stable across phases):
     CrmConfirmSendV2.show(previewResponse, onChoice)
       previewResponse = full EF dispatch_preview JSON
       onChoice = async function(choice, ctx) where
         choice = { dispatch: true|false, action: 'dispatch'|'test_send'|'remaining' }
         ctx    = { previewResponse, excludeLeadIds, recipientSubset }

   Load order: AFTER shared/js/modal-builder.js + toast.js + escapeHtml.
   ============================================================================= */
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

  // Render the expanded body-preview row that follows a recipient row when
  // _state.expanded contains the lead_id. Iron Rule 8: bodies arrive from the
  // EF which substitutes from server-resolved leads — but they originate
  // ultimately from operator-edited templates, so render with escapeHtml +
  // <pre> rather than trust as HTML. SMS is plain text; email is HTML — we
  // render the email source verbatim in a <pre> for visual inspection (the
  // recipient sees the rendered HTML at delivery; the operator sees the
  // source here on purpose, so they can verify variable substitution).
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
    var mainRow =
      '<tr class="border-b border-slate-100" data-ccsv2-row="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '">' +
        '<td class="px-2 py-2 align-middle"><input type="checkbox" data-ccsv2-cb="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '" ' + checked + ' class="cursor-pointer"></td>' +
        '<td class="px-3 py-2 text-slate-800 cursor-pointer" data-ccsv2-expand="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '"><span class="text-slate-400 me-1">' + caret + '</span>' + escapeHtml(r.full_name || '—') + '</td>' +
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
    return (
      '<button type="button" id="ccsv2-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="ccsv2-confirm-no-notify" class="px-4 py-2 border border-slate-400 bg-white text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition">אישור ללא הודעות</button>' +
      '<button type="button" id="ccsv2-confirm-notify" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm" data-ccsv2-approve="1">אישור ושלח הודעות (' + total + ')</button>'
    );
  }

  function refreshFooterLabels(modalEl) {
    if (!_state) return;
    var btn = modalEl.querySelector('[data-ccsv2-approve="1"]');
    var countEl = modalEl.querySelector('[data-ccsv2-count="1"]');
    var total = _state.recipients.length;
    var selected = total - _state.excluded.size;
    if (btn) btn.textContent = 'אישור ושלח הודעות (' + selected + ')';
    if (countEl) countEl.textContent = total + ' נמענים (' + selected + ' נבחרו)';
  }

  function rerenderTable(modalEl) {
    if (!_state) return;
    var host = modalEl.querySelector('[data-ccsv2-content="1"]');
    if (!host) return;
    // Phase 4: rerender ENTIRE body content so search + checkbox + expand row
    // changes all reflect cleanly. ~50-2000 rows; one innerHTML pass is cheap.
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
    var cancelBtn          = modal.el.querySelector('#ccsv2-cancel');

    async function handleConfirm(choice, btnEl, busyText) {
      if (confirmNotifyBtn) confirmNotifyBtn.disabled = true;
      if (confirmNoNotifyBtn) confirmNoNotifyBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      btnEl.textContent = busyText;
      var excludeLeadIds = Array.from(_state.excluded || []);
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

    confirmNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: true,  action: 'dispatch' }, confirmNotifyBtn, 'שולח...');
    });
    confirmNoNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: false, action: 'dispatch' }, confirmNoNotifyBtn, 'מעדכן...');
    });
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
