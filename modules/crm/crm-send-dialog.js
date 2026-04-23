/* =============================================================================
   crm-send-dialog.js — Quick send-message dialog (CRM-native, no native SMS app)
   Load order: AFTER crm-messaging-send.js (uses CrmMessaging.sendMessage).
   Uses Modal, Toast, escapeHtml, CrmHelpers.
   Exports window.CrmSendDialog.openQuickSend({ lead }).
   ============================================================================= */
(function () {
  'use strict';

  function openQuickSend(opts) {
    opts = opts || {};
    var lead = opts.lead;
    if (!lead || typeof Modal === 'undefined') return;

    var hasEmail = !!(lead.email && String(lead.email).trim());
    var hasPhone = !!(lead.phone && String(lead.phone).trim());
    var defaultChannel = hasPhone ? 'sms' : (hasEmail ? 'email' : 'sms');

    function channelRow(val, label, disabled) {
      var checked = val === defaultChannel ? ' checked' : '';
      var dis = disabled ? ' disabled' : '';
      return '<label class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50' + (disabled ? ' opacity-50 cursor-not-allowed' : '') + '">' +
        '<input type="radio" name="quick-send-channel" value="' + val + '"' + checked + dis + '>' +
        '<span class="text-sm">' + escapeHtml(label) + '</span>' +
      '</label>';
    }

    var recipientLine = '<div class="text-xs text-slate-500">' +
      (hasPhone ? 'SMS: ' + escapeHtml(CrmHelpers.formatPhone(lead.phone)) : '') +
      (hasPhone && hasEmail ? ' · ' : '') +
      (hasEmail ? 'Email: ' + escapeHtml(lead.email) : '') +
    '</div>';

    var varPanel = (window.CrmBroadcastClipboard && typeof CrmBroadcastClipboard.panelHtml === 'function')
      ? CrmBroadcastClipboard.panelHtml('quick-send-var') : '';

    var body =
      '<div class="space-y-3">' +
        recipientLine +
        '<div class="flex gap-2">' +
          channelRow('sms', 'SMS', !hasPhone) +
          channelRow('email', 'אימייל', !hasEmail) +
        '</div>' +
        '<div id="quick-send-subject-wrap" style="display:none">' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">נושא</label>' +
          '<input type="text" id="quick-send-subject" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">הודעה <span class="text-rose-500">*</span></label>' +
          '<textarea id="quick-send-body" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows="4" placeholder="תוכן ההודעה..."></textarea>' +
          varPanel +
        '</div>' +
      '</div>';

    var footerHtml =
      '<button type="button" id="quick-send-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="quick-send-submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">שלח</button>';

    var modal = Modal.show({
      title: 'שלח הודעה מהמערכת — ' + (lead.full_name || ''),
      size: 'sm',
      content: body,
      footer: footerHtml
    });

    function syncSubjectVisibility() {
      var ch = modal.el.querySelector('input[name="quick-send-channel"]:checked');
      var wrap = modal.el.querySelector('#quick-send-subject-wrap');
      if (wrap) wrap.style.display = (ch && ch.value === 'email') ? '' : 'none';
    }
    modal.el.querySelectorAll('input[name="quick-send-channel"]').forEach(function (r) {
      r.addEventListener('change', syncSubjectVisibility);
    });
    syncSubjectVisibility();

    if (window.CrmBroadcastClipboard && typeof CrmBroadcastClipboard.wire === 'function') {
      CrmBroadcastClipboard.wire(modal.el, 'quick-send-var');
    }

    modal.el.querySelector('#quick-send-cancel').addEventListener('click', function () {
      if (typeof modal.close === 'function') modal.close();
    });

    var submit = modal.el.querySelector('#quick-send-submit');
    submit.addEventListener('click', async function () {
      var ch = modal.el.querySelector('input[name="quick-send-channel"]:checked');
      var channel = ch ? ch.value : 'sms';
      var bodyVal = (modal.el.querySelector('#quick-send-body').value || '').trim();
      var subjectVal = (modal.el.querySelector('#quick-send-subject') && modal.el.querySelector('#quick-send-subject').value || '').trim();
      if (!bodyVal) { if (window.Toast) Toast.warning('תוכן ההודעה חובה'); return; }

      submit.disabled = true;
      submit.textContent = 'שולח...';
      try {
        if (!window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') {
          throw new Error('CrmMessaging unavailable');
        }
        var res = await CrmMessaging.sendMessage({
          leadId: lead.id,
          channel: channel,
          body: bodyVal,
          subject: channel === 'email' ? subjectVal : undefined,
          variables: {
            name: lead.full_name || '',
            phone: lead.phone || '',
            email: lead.email || ''
          },
          language: lead.language || 'he'
        });
        if (res && res.ok) {
          if (typeof modal.close === 'function') modal.close();
          if (window.Toast) Toast.success('ההודעה נשלחה');
        } else {
          submit.disabled = false;
          submit.textContent = 'שלח';
          if (window.Toast) Toast.error('שגיאה: ' + ((res && res.error) || 'unknown'));
        }
      } catch (e) {
        submit.disabled = false;
        submit.textContent = 'שלח';
        if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
      }
    });
  }

  window.CrmSendDialog = { openQuickSend: openQuickSend };
})();
