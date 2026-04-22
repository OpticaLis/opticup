(function () {
  'use strict';

  async function sendMessage(opts) {
    opts = opts || {};
    var cfg = window.CrmMessagingConfig || {};
    var webhookUrl = cfg.MAKE_SEND_WEBHOOK;
    if (!webhookUrl) {
      console.error('CrmMessaging: webhook URL not configured');
      return { ok: false, error: 'webhook_not_configured' };
    }

    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId) return { ok: false, error: 'no_tenant' };

    if (!opts.leadId) return { ok: false, error: 'lead_id_required' };
    if (!opts.templateSlug) return { ok: false, error: 'template_slug_required' };

    var channel = opts.channel || 'sms';
    if (channel !== 'sms' && channel !== 'email') {
      return { ok: false, error: 'invalid_channel:' + channel };
    }

    var payload = {
      tenant_id: tenantId,
      lead_id: opts.leadId,
      template_slug: opts.templateSlug,
      channel: channel,
      variables: opts.variables || {},
      event_id: opts.eventId || null,
      language: opts.language || 'he'
    };

    try {
      var res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        return { ok: false, error: 'webhook_' + res.status };
      }
      return { ok: true };
    } catch (e) {
      console.error('CrmMessaging.sendMessage failed:', e);
      return { ok: false, error: e.message || String(e) };
    }
  }

  window.CrmMessaging = window.CrmMessaging || {};
  window.CrmMessaging.sendMessage = sendMessage;
})();
