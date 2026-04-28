/* =============================================================================
   crm-automation-queue-send.js — engine action_type='queue_send' helper.
   Built for P5_V2_REBUILD_RUNG2_RULES_REWIRE (2026-04-28) to support Rules 2.5
   (3-days-before reminder) and 2.6 (event-day morning) by writing rows into
   the existing crm_message_queue (drained by dispatch-queue EF + pg_cron from
   OVERNIGHT_M4_SCALE_AND_UI). No new scheduler — leverages existing infra.

   action_config shape:
     {
       template_slug: 'event_2_3d_before',
       channels: ['sms','email'],
       recipient_type: 'attendees',
       recipient_status_filter: ['confirmed'],   // optional (P21)
       schedule: { offset_days: 3, send_time: '10:00' },
       language: 'he'                            // optional (default 'he')
     }

   scheduled_at = (event_date - offset_days) at send_time, anchored Israel-local
   `+03:00` (May 2026 sits outside DST shifts; SuperSale events confirmed by
   Daniel as Friday morning so weekday boundary is non-ambiguous).

   Idempotency: relies on uq_crm_message_queue_idem
   (UNIQUE (tenant_id, event_id, lead_id, template_slug, channel)
   WHERE event_id IS NOT NULL AND template_slug IS NOT NULL
     AND status IN ('queued','processing','sent')).
   Re-firing the same rule against the same event = 0 new rows.

   Load order: AFTER crm-automation-engine.js (engine forward-references
   window.CrmAutomationQueueSend at runtime).
   ============================================================================= */
(function () {
  'use strict';

  function _qsTid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  async function prepare(rule, triggerData, tenantIdArg, resolveRecipientsFn) {
    var cfg = rule.action_config || {};
    var tenantId = tenantIdArg || _qsTid();
    var eventId = triggerData && triggerData.eventId;
    if (!tenantId || !eventId) return { queued: 0, leadIds: [] };

    var schedule = cfg.schedule || {};
    var offsetDays = parseInt(schedule.offset_days, 10) || 0;
    var sendTime = schedule.send_time || '10:00';
    var tplBase = cfg.template_slug;
    var channels = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : ['sms']);
    var recipientType = cfg.recipient_type || 'attendees';
    var language = cfg.language || 'he';
    if (!tplBase) {
      console.warn('CrmAutomationQueueSend: missing template_slug');
      return { queued: 0, leadIds: [] };
    }

    // Need event_date to compute scheduled_at.
    var evRes = await sb.from('crm_events').select('event_date')
      .eq('id', eventId).eq('tenant_id', tenantId).single();
    if (evRes.error || !evRes.data || !evRes.data.event_date) {
      console.warn('CrmAutomationQueueSend: event lookup failed');
      return { queued: 0, leadIds: [] };
    }
    var ymd = evRes.data.event_date; // 'YYYY-MM-DD'
    var base = new Date(ymd + 'T' + sendTime + ':00+03:00');
    base.setUTCDate(base.getUTCDate() - offsetDays);
    var scheduledAt = base.toISOString();

    var leads = await resolveRecipientsFn(recipientType, tenantId, triggerData, cfg);
    if (!leads || !leads.length) return { queued: 0, leadIds: [] };
    var leadIds = leads.map(function (l) { return l.id; });

    var rows = [];
    leads.forEach(function (lead) {
      channels.forEach(function (ch) {
        if (ch === 'email' && !lead.email) return;
        if (ch === 'sms'   && !lead.phone) return;
        rows.push({
          tenant_id: tenantId,
          event_id: eventId,
          lead_id: lead.id,
          channel: ch,
          template_slug: tplBase + '_' + ch + '_' + language,
          variables: {
            name: lead.full_name || '',
            phone: lead.phone || '',
            email: lead.email || ''
          },
          language: language,
          status: 'queued',
          scheduled_at: scheduledAt
        });
      });
    });
    if (!rows.length) return { queued: 0, leadIds: leadIds };

    var insRes = await sb.from('crm_message_queue').upsert(rows, {
      onConflict: 'tenant_id,event_id,lead_id,template_slug,channel',
      ignoreDuplicates: true
    }).select('id');
    if (insRes.error) {
      console.error('CrmAutomationQueueSend insert:', insRes.error);
      return { queued: 0, leadIds: leadIds };
    }
    return { queued: (insRes.data || []).length, leadIds: leadIds };
  }

  window.CrmAutomationQueueSend = { prepare: prepare };
})();
