(function () {
  'use strict';

  // CrmMessaging.sendMessage — calls the `send-message` Edge Function, which
  // owns all business logic (template fetch, variable substitution, log write)
  // and forwards a ready-to-send payload to Make. Make is a 3-module send-only
  // pipe (Webhook → Router → SMS | Email). Architecture v3 — P3c+P4, 2026-04-22.
  //
  // Two modes:
  //   (a) Template mode: pass templateSlug + variables, Edge Function composes
  //       full slug = `${templateSlug}_${channel}_${language}` and looks it up.
  //   (b) Raw mode: pass body (+ optional subject for email) for ad-hoc
  //       broadcasts. No template lookup.

  async function sendMessage(opts) {
    opts = opts || {};

    if (!window.sb || !sb.functions || typeof sb.functions.invoke !== 'function') {
      console.error('CrmMessaging: supabase client not ready');
      return { ok: false, error: 'sb_not_ready' };
    }

    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId) return { ok: false, error: 'no_tenant' };

    if (!opts.leadId) return { ok: false, error: 'lead_id_required' };

    var channel = opts.channel || 'sms';
    if (channel !== 'sms' && channel !== 'email') {
      return { ok: false, error: 'invalid_channel:' + channel };
    }

    var hasTemplate = !!opts.templateSlug;
    var hasBody = !!opts.body;
    if (!hasTemplate && !hasBody) return { ok: false, error: 'template_or_body_required' };
    if (hasTemplate && hasBody) return { ok: false, error: 'template_xor_body' };

    var payload = {
      tenant_id: tenantId,
      lead_id: opts.leadId,
      event_id: opts.eventId || null,
      channel: channel,
      variables: opts.variables || {},
      language: opts.language || 'he'
    };
    if (hasTemplate) payload.template_slug = opts.templateSlug;
    if (hasBody) payload.body = opts.body;
    if (opts.subject) payload.subject = opts.subject;

    try {
      var res = await sb.functions.invoke('send-message', { body: payload });
      if (res.error) {
        console.error('CrmMessaging.sendMessage error:', res.error);
        return { ok: false, error: res.error.message || 'edge_function_error' };
      }
      var data = res.data || {};
      if (data.ok === false) {
        return { ok: false, error: data.error || 'unknown_error', logId: data.log_id || null };
      }
      return { ok: true, logId: data.log_id || null, channel: data.channel || channel };
    } catch (e) {
      console.error('CrmMessaging.sendMessage failed:', e);
      return { ok: false, error: e.message || String(e) };
    }
  }

  window.CrmMessaging = window.CrmMessaging || {};
  window.CrmMessaging.sendMessage = sendMessage;
})();
