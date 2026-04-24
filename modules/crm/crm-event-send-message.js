/* =============================================================================
   crm-event-send-message.js — Compose-and-send modal for event-wide broadcasts.
   Opens from the "שלח הודעה" button in the event detail modal header.
   Raw-body mode only (no template): the author writes the message inline, it is
   dispatched per-recipient via CrmMessaging.sendMessage. Fix 3 of CRM_HOTFIXES.
   Load order: AFTER crm-messaging-send.js. Uses Modal, Toast, escapeHtml,
   CrmHelpers, optionally CrmBroadcastClipboard for the variable chip panel.
   Exports window.CrmEventSendMessage.open(event, attendees).
   ============================================================================= */
(function () {
  'use strict';

  function uniqueStatuses(attendees) {
    var seen = {}, out = [];
    (attendees || []).forEach(function (a) {
      var s = a.status || 'other';
      if (!seen[s]) { seen[s] = true; out.push({ slug: s, label: a.status_name || s }); }
    });
    return out;
  }

  function filterRecipients(attendees, selectedStatuses, channel) {
    return (attendees || []).filter(function (a) {
      if (!a.lead_id) return false;
      if (selectedStatuses.length && selectedStatuses.indexOf(a.status) === -1) return false;
      if (channel === 'sms' && !a.phone) return false;
      if (channel === 'email' && !a.email) return false;
      return true;
    });
  }

  function renderStatusCheckboxes(statuses) {
    if (!statuses.length) return '<div class="text-xs text-slate-400">אין משתתפים</div>';
    return statuses.map(function (s) {
      return '<label class="inline-flex items-center gap-1.5 px-2 py-1 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-xs">' +
        '<input type="checkbox" class="esm-status" value="' + escapeHtml(s.slug) + '" checked>' +
        '<span>' + escapeHtml(s.label) + '</span>' +
      '</label>';
    }).join(' ');
  }

  function open(event, attendees) {
    if (!event || typeof Modal === 'undefined') return;
    if (!window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') {
      if (window.Toast) Toast.error('CrmMessaging אינו זמין');
      return;
    }

    var statuses = uniqueStatuses(attendees);
    var varPanel = (window.CrmBroadcastClipboard && typeof CrmBroadcastClipboard.panelHtml === 'function')
      ? CrmBroadcastClipboard.panelHtml('esm-var') : '';

    var content =
      '<div class="space-y-3">' +
        '<div class="text-xs text-slate-500">' + escapeHtml(event.name || '') + '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">ערוץ</label>' +
          '<div class="flex gap-2">' +
            '<label class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">' +
              '<input type="radio" name="esm-channel" value="sms" checked><span class="text-sm">SMS</span></label>' +
            '<label class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">' +
              '<input type="radio" name="esm-channel" value="email"><span class="text-sm">אימייל</span></label>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">סינון נמענים לפי סטטוס</label>' +
          '<div class="flex flex-wrap gap-2" id="esm-status-wrap">' + renderStatusCheckboxes(statuses) + '</div>' +
          '<div class="text-xs text-slate-500 mt-2" id="esm-count">—</div>' +
        '</div>' +
        '<div id="esm-subject-wrap" style="display:none">' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">נושא</label>' +
          '<input type="text" id="esm-subject" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-medium text-slate-700 mb-1">הודעה <span class="text-rose-500">*</span></label>' +
          '<textarea id="esm-body" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows="5" placeholder="תוכן ההודעה — אפשר להשתמש ב-%name%, %event_name%, %event_date%..."></textarea>' +
          varPanel +
        '</div>' +
      '</div>';

    var footerHtml =
      '<button type="button" id="esm-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="esm-send" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">שלח</button>';

    var modal = Modal.show({
      title: 'שלח הודעה — ' + (event.name || ''),
      size: 'md',
      content: content,
      footer: footerHtml
    });

    var el = modal.el;
    var bodyInput = el.querySelector('#esm-body');
    var subjectInput = el.querySelector('#esm-subject');
    var subjectWrap = el.querySelector('#esm-subject-wrap');
    var countEl = el.querySelector('#esm-count');
    var sendBtn = el.querySelector('#esm-send');
    var cancelBtn = el.querySelector('#esm-cancel');

    function getChannel() {
      var r = el.querySelector('input[name="esm-channel"]:checked');
      return r ? r.value : 'sms';
    }
    function getSelectedStatuses() {
      return Array.prototype.slice.call(el.querySelectorAll('.esm-status:checked'))
        .map(function (cb) { return cb.value; });
    }
    function syncCount() {
      var ch = getChannel();
      var recipients = filterRecipients(attendees, getSelectedStatuses(), ch);
      countEl.textContent = 'נמענים תואמים: ' + recipients.length;
      subjectWrap.style.display = ch === 'email' ? '' : 'none';
    }

    el.querySelectorAll('input[name="esm-channel"], .esm-status').forEach(function (i) {
      i.addEventListener('change', syncCount);
    });
    syncCount();

    if (window.CrmBroadcastClipboard && typeof CrmBroadcastClipboard.wire === 'function') {
      CrmBroadcastClipboard.wire(el, 'esm-var');
    }

    cancelBtn.addEventListener('click', function () {
      if (typeof modal.close === 'function') modal.close();
    });

    sendBtn.addEventListener('click', async function () {
      var channel = getChannel();
      var bodyText = (bodyInput.value || '').trim();
      var subjectText = (subjectInput && subjectInput.value || '').trim();
      if (!bodyText) { if (window.Toast) Toast.warning('תוכן ההודעה חובה'); return; }
      var recipients = filterRecipients(attendees, getSelectedStatuses(), channel);
      if (!recipients.length) { if (window.Toast) Toast.warning('אין נמענים תואמים'); return; }
      if (!window.confirm('לשלוח ' + recipients.length + ' הודעות?')) return;

      sendBtn.disabled = true;
      cancelBtn.disabled = true;

      var sent = 0, failed = 0;
      for (var i = 0; i < recipients.length; i++) {
        var a = recipients[i];
        sendBtn.textContent = 'שולח ' + (i + 1) + '/' + recipients.length + '...';
        try {
          var res = await CrmMessaging.sendMessage({
            leadId: a.lead_id,
            channel: channel,
            body: bodyText,
            subject: channel === 'email' ? subjectText : undefined,
            eventId: event.id,
            variables: {
              name: a.full_name || '',
              phone: a.phone || '',
              email: a.email || '',
              event_name: event.name || '',
              event_date: (window.CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(event.event_date) : (event.event_date || ''),
              event_time: event.start_time || '',
              event_location: event.location_address || ''
            },
            language: 'he'
          });
          if (res && res.ok) sent++; else failed++;
        } catch (e) {
          console.error('send to ' + a.lead_id + ':', e);
          failed++;
        }
      }

      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.event.broadcast_send', entity_type: 'crm_events', entity_id: event.id, details: { channel: channel, sent: sent, failed: failed, total: recipients.length } }); } catch (_) {}

      if (typeof modal.close === 'function') modal.close();
      if (window.Toast) {
        if (failed === 0) Toast.success('נשלחו ' + sent + ' הודעות');
        else Toast.warning('נשלחו ' + sent + ', ' + failed + ' נכשלו');
      }
    });
  }

  function wire(body, event, attendees) {
    var btn = body && body.querySelector('button[data-action="send-message"]');
    if (!btn) return;
    btn.addEventListener('click', function () { open(event, attendees); });
  }

  window.CrmEventSendMessage = { open: open, wire: wire };
})();
