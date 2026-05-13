/* =============================================================================
   crm-confirm-send-v2.js — Server-authoritative confirmation modal (v2).
   M4_DRY_RUN_PREVIEW_AND_DISPATCH — Phase 3 scaffolding (2026-05-14).

   Consumes the automation-engine EF's mode='dispatch_preview' response
   (recipients_by_lead, rules, channels) and renders a recipient-first
   preview. Operator can Cancel / "Confirm without notify" / "Confirm and send".
   Subsequent phases add: search + body expand + checkboxes (Phase 4), test-
   send (Phase 5), post-dispatch cancel toast (Phase 6), count progression +
   chip filters + history line + sessionStorage (Phase 7).

   API (stable across phases):
     CrmConfirmSendV2.show(previewResponse, onChoice)
       previewResponse = full EF dispatch_preview JSON
       onChoice = async function(choice, ctx) where
         choice = { dispatch: true|false, action: 'dispatch'|'test_send'|'remaining' }
         ctx    = { previewResponse, excludeLeadIds, recipientSubset }

   Load order: AFTER shared/js/modal-builder.js + toast.js + escapeHtml. The
   legacy v1 modal (crm-confirm-send.js) loads alongside and remains the
   canonical path for any non-migrated callsite.
   ============================================================================= */
(function () {
  'use strict';

  // Single live-state object per modal (only one preview modal open at a time).
  var _state = null;

  function fmtPhone(p) {
    if (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') return CrmHelpers.formatPhone(p);
    return p || '';
  }

  function channelLabel(ch) { return ch === 'email' ? 'אימייל' : (ch === 'whatsapp' ? 'WhatsApp' : 'SMS'); }
  function channelIcon(ch)  { return ch === 'email' ? '✉️' : (ch === 'whatsapp' ? '💬' : '📱'); }

  // Renders one row in the recipient table. Phase 3 returns name|phone|email;
  // Phase 4 will add checkbox + expand caret; Phase 7 will add row-state badges.
  function renderRecipientRow(r) {
    var rowAttrs = 'data-ccsv2-row="1" data-ccsv2-lead-id="' + escapeHtml(r.lead_id || '') + '"';
    return (
      '<tr class="border-b border-slate-100" ' + rowAttrs + '>' +
        '<td class="px-3 py-2 text-slate-800">' + escapeHtml(r.full_name || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr;text-align:end">' + escapeHtml(fmtPhone(r.phone) || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr">' + escapeHtml(r.email || '—') + '</td>' +
      '</tr>'
    );
  }

  function renderRecipientTable(recipients) {
    if (!recipients.length) {
      return '<div class="text-center text-slate-400 py-6">אין נמענים לפעולה זו.</div>';
    }
    var header =
      '<thead><tr>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">שם</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">טלפון</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">מייל</th>' +
      '</tr></thead>';
    var rows = recipients.map(renderRecipientRow).join('');
    return (
      '<div class="overflow-auto max-h-[60vh] border border-slate-200 rounded-lg">' +
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
    return (
      '<div class="text-xs text-slate-500 mb-2">' + ruleLine + ' &nbsp;·&nbsp; ' + channelChips + '</div>'
    );
  }

  function renderBody(previewResponse) {
    var recipients = Array.isArray(previewResponse.recipients_by_lead) ? previewResponse.recipients_by_lead : [];
    var total = recipients.length;
    return (
      renderHeader(previewResponse) +
      '<div class="text-sm text-slate-700 mb-2" data-ccsv2-count="1">' + total + ' נמענים (' + total + ' נבחרו)</div>' +
      renderRecipientTable(recipients)
    );
  }

  // Phase 3 footer — Phase 4 will add a fourth button for test-send.
  function renderFooter(total) {
    return (
      '<button type="button" id="ccsv2-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="ccsv2-confirm-no-notify" class="px-4 py-2 border border-slate-400 bg-white text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition">אישור ללא הודעות</button>' +
      '<button type="button" id="ccsv2-confirm-notify" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm" data-ccsv2-approve="1">אישור ושלח הודעות (' + total + ')</button>'
    );
  }

  // Phase 4+: recompute the approve button label as selection state changes.
  function refreshFooterLabels(modalEl) {
    if (!_state) return;
    var btn = modalEl.querySelector('[data-ccsv2-approve="1"]');
    var countEl = modalEl.querySelector('[data-ccsv2-count="1"]');
    var total = _state.recipients.length;
    var selected = total - (_state.excluded ? _state.excluded.size : 0);
    if (btn) btn.textContent = 'אישור ושלח הודעות (' + selected + ')';
    if (countEl) countEl.textContent = total + ' נמענים (' + selected + ' נבחרו)';
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
      onChoice: onChoice,
    };

    var modal = Modal.show({
      title: 'אישור פעולה',
      size: 'lg',
      content: '<div data-ccsv2-content="1">' + renderBody(previewResponse) + '</div>',
      footer: renderFooter(_state.recipients.length),
    });

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
      // Phase 6 will replace the inline toast with a queue-cancel-aware toast.
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

  // Phase 4+ hook — exposed so future phases can re-render the body without a
  // full Modal.show() round trip.
  function _rerender(modalEl) {
    if (!_state) return;
    var host = modalEl.querySelector('[data-ccsv2-content="1"]');
    if (!host) return;
    host.innerHTML = renderBody(_state.previewResponse);
    refreshFooterLabels(modalEl);
  }

  window.CrmConfirmSendV2 = {
    show: show,
    _refreshFooterLabels: refreshFooterLabels,
    _rerender: _rerender,
  };
})();
