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
    var q = sb.from('crm_message_log')
      .select('id, channel, content, status, error_message, created_at, crm_message_templates(name, slug)')
      .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50);
    if (tenantId) q = q.eq('tenant_id', tenantId);
    var r = await q;
    if (r.error) throw new Error('messages: ' + r.error.message);
    return r.data || [];
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
        '</div>' +
        '<div class="text-sm text-slate-800 truncate">' + escapeHtml(preview) + '</div>' +
        err +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  window.CrmLeadsDetailMessages = {
    fetchMessages: fetchMessages,
    renderMessagesList: renderMessagesList
  };
})();
