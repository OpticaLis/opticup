/* =============================================================================
   crm-leads-detail-messages.js — per-lead message-history fetch + render for
   the lead detail modal's "הודעות" tab. Extracted verbatim from
   crm-leads-detail.js (P31 commit 0b) to bring the parent under the 320-line
   P31 headroom. No logic changes — fetchMessages is the same SELECT shape;
   renderMessagesList is byte-for-byte the same chip styling and DOM layout
   as the original renderMessages function.

   API:
     CrmLeadsDetailMessages.fetchMessages(leadId, tenantId) -> Promise<Array>
     CrmLeadsDetailMessages.renderMessagesList(messages: Array) -> string
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var STATUS_LABELS  = { sent: 'נשלח', pending: 'בתור', failed: 'נכשל', delivered: 'הגיע', read: 'נקרא', queued: 'בתור' };
  var STATUS_CLASSES = {
    sent:      'bg-sky-100 text-sky-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    read:      'bg-indigo-100 text-indigo-800',
    failed:    'bg-rose-100 text-rose-800',
    queued:    'bg-slate-100 text-slate-700',
    pending:   'bg-slate-100 text-slate-700'
  };

  async function fetchMessages(leadId, tenantId) {
    if (!leadId) return [];
    // M4_FAILED_MESSAGE_BADGE_CLEANUP: SELECT extended with acknowledged_* triple + employee name join.
    var q = sb.from('crm_message_log')
      .select('id, channel, content, status, error_message, created_at, acknowledged_at, acknowledged_reason, acknowledged_employee:employees!acknowledged_by(name), crm_message_templates(name, slug)')
      .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50);
    if (tenantId) q = q.eq('tenant_id', tenantId);
    var r = await q;
    if (r.error) throw new Error('messages: ' + r.error.message);
    return r.data || [];
  }

  function ackTagHtml(m) {
    if (!m.acknowledged_at) return '';
    var who = (m.acknowledged_employee && m.acknowledged_employee.name) ? m.acknowledged_employee.name : 'מערכת';
    var when = (window.CrmHelpers && CrmHelpers.formatDateTime) ? CrmHelpers.formatDateTime(m.acknowledged_at) : m.acknowledged_at;
    var reasonTip = m.acknowledged_reason ? ' title="' + escapeHtml(m.acknowledged_reason) + '"' : '';
    return ' <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 ms-2"' + reasonTip + '><span aria-hidden="true">✓</span>מטופל · ' + escapeHtml(when) + ' · ' + escapeHtml(who) + '</span>';
  }

  // Mirrors crm-messaging-log.js chip styling.
  function renderMessagesList(messages) {
    if (!messages.length) return '<div class="text-center text-slate-400 py-8">אין היסטוריית הודעות לליד זה</div>';
    var html = '<div class="space-y-2">';
    messages.forEach(function (m) {
      var chipCls = STATUS_CLASSES[m.status] || 'bg-slate-100 text-slate-700';
      var tpl = m.crm_message_templates || {};
      var preview = (m.content || '').replace(/\s+/g, ' ').slice(0, 80);
      var err = m.error_message ? '<div class="text-xs text-rose-600 mt-1">' + escapeHtml(m.error_message) + '</div>' : '';
      html += '<div class="bg-white border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition" data-msg-row="' + escapeHtml(m.id) + '">' +
        '<div class="flex items-center gap-2 flex-wrap mb-1">' +
          '<span class="text-xs font-semibold text-slate-500">' + escapeHtml(CrmHelpers.formatDateTime(m.created_at)) + '</span>' +
          '<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">' + escapeHtml(CHANNEL_LABELS[m.channel] || m.channel) + '</span>' +
          '<span class="text-xs px-2 py-0.5 rounded-full font-medium ' + chipCls + '">' + escapeHtml(STATUS_LABELS[m.status] || m.status) + '</span>' +
          (tpl.name ? '<span class="text-xs text-slate-500">· ' + escapeHtml(tpl.name) + '</span>' : '') +
          ackTagHtml(m) +
        '</div>' +
        '<div class="text-sm text-slate-800 truncate">' + escapeHtml(preview) + '</div>' +
        err +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  // P31 commit 6: Failed-messages section above the tabs in lead detail modal.
  // Each row: channel icon + Hebrew label, template name, Hebrew error reason
  // (via CrmMessageErrorLabels), timestamp, and a "🔄 נסה שוב" retry button.
  // Retry calls CrmMessaging.sendMessage with the original template_slug (base,
  // stripped of _<channel>_<lang>) + run_id + event_id. On success, the failed
  // row is removed from the in-memory list (DB row stays as audit) and the
  // section + badge counts refresh.

  function _baseSlug(fullSlug) {
    return String(fullSlug || '').replace(/_(sms|email|whatsapp)_(he|en|ar)$/, '');
  }

  function getFailedMessages(messages) {
    // M4_FAILED_MESSAGE_BADGE_CLEANUP: filter out acknowledged failures (history-view's failed section
    // mirrors the badge query — only unacknowledged failures surface). Acked rows still appear in the
    // full message history list (above) with a "מטופל" tag.
    return (messages || []).filter(function (m) { return m.status === 'failed' && !m.acknowledged_at; });
  }

  function renderFailedSection(failed) {
    if (!failed || !failed.length) return '';
    var rows = failed.map(function (m) {
      var tpl = m.crm_message_templates || {};
      var chanIcon = m.channel === 'email' ? '✉️' : '📱';
      var chanLabel = CHANNEL_LABELS[m.channel] || m.channel;
      var reason = (window.CrmMessageErrorLabels && CrmMessageErrorLabels.errorLabel)
        ? CrmMessageErrorLabels.errorLabel(m.error_message)
        : (m.error_message || '');
      return '<div class="flex items-start gap-3 bg-white border border-rose-200 rounded-lg p-3" data-failed-row="' + escapeHtml(m.id) + '">' +
        '<div class="flex-1 min-w-0">' +
          '<div class="flex items-center gap-2 flex-wrap text-xs text-slate-600 mb-1">' +
            '<span>' + chanIcon + ' ' + escapeHtml(chanLabel) + '</span>' +
            (tpl.name ? '<span class="text-slate-500">· ' + escapeHtml(tpl.name) + '</span>' : '') +
            '<span class="text-slate-400">· ' + escapeHtml(CrmHelpers.formatDateTime(m.created_at)) + '</span>' +
          '</div>' +
          '<div class="text-sm text-rose-700 font-semibold">' + escapeHtml(reason) + '</div>' +
        '</div>' +
        '<button type="button" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition shrink-0" data-failed-retry="' + escapeHtml(m.id) + '">🔄 נסה שוב</button>' +
      '</div>';
    }).join('');
    return '<details class="mb-3 bg-rose-50 border border-rose-200 rounded-lg" open>' +
      '<summary class="cursor-pointer px-3 py-2 text-sm font-bold text-rose-800">⚠️ הודעות כושלות (' + failed.length + ')</summary>' +
      '<div class="space-y-2 p-3 pt-1">' + rows + '</div>' +
    '</details>';
  }

  function wireFailedRetryHandlers(rootEl, lead, data, onAfterRetry) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-failed-retry]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var msgId = btn.getAttribute('data-failed-retry');
        var msg = (data.messages || []).find(function (m) { return m.id === msgId; });
        if (!msg || !window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') return;
        btn.disabled = true; var oldText = btn.textContent; btn.textContent = '🔄 שולח...';
        try {
          var fullSlug = (msg.crm_message_templates && msg.crm_message_templates.slug) || '';
          var res = await CrmMessaging.sendMessage({
            leadId: lead.id, channel: msg.channel,
            templateSlug: _baseSlug(fullSlug),
            eventId: msg.event_id || undefined,
            runId: msg.run_id || undefined,
            language: 'he', variables: {}
          });
          if (res && res.ok) {
            // Drop the failed row from the in-memory list (audit row stays in DB).
            data.messages = (data.messages || []).filter(function (m) { return m.id !== msgId; });
            if (window.Toast) Toast.success('ההודעה נשלחה בהצלחה');
            if (typeof onAfterRetry === 'function') onAfterRetry();
            if (typeof window.reloadCrmLeadsFailedCounts === 'function') window.reloadCrmLeadsFailedCounts();
          } else {
            var label = (window.CrmMessageErrorLabels && res && res.error)
              ? CrmMessageErrorLabels.errorLabel(res.error) : 'שליחה נכשלה';
            if (window.Toast) Toast.error(label);
            btn.disabled = false; btn.textContent = oldText;
          }
        } catch (e) {
          if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
          btn.disabled = false; btn.textContent = oldText;
        }
      });
    });
  }

  window.CrmLeadsDetailMessages = {
    fetchMessages: fetchMessages,
    renderMessagesList: renderMessagesList,
    getFailedMessages: getFailedMessages,
    renderFailedSection: renderFailedSection,
    wireFailedRetryHandlers: wireFailedRetryHandlers
  };
})();
