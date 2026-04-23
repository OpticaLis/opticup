/* =============================================================================
   crm-automation-engine.js — Rule evaluation engine (P8, 2026-04-22)
   Table:   crm_automation_rules (trigger_entity, trigger_event, trigger_condition,
            action_type='send_message', action_config)
   Replaces the hardcoded EVENT_STATUS_DISPATCH map (crm-event-actions.js, P5.5) and
   the inline registration dispatch (crm-event-register.js, P5.5) with rule-driven
   evaluation. Called from:
     - crm-event-actions.js        — trigger: event_status_change
     - crm-event-register.js       — trigger: event_registration
     - crm-leads (future)          — trigger: lead_status_change / lead_intake (UI)
   NOTE: lead-intake Edge Function still dispatches server-side independently (out
   of scope per P8 SPEC §7).
   Exports window.CrmAutomation:
     evaluate(triggerType, triggerData) — loads matching rules, evaluates conditions,
       resolves recipients, dispatches via CrmMessaging.sendMessage. Returns
       { fired, sent, failed, skipped } summary. Error-isolated per rule
       (Promise.allSettled).
   Load order: after crm-helpers.js, crm-messaging-send.js.
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  // Map of client-side trigger types → {entity, event} columns in crm_automation_rules.
  var TRIGGER_TYPES = {
    event_status_change: { entity: 'event',    event: 'status_change' },
    event_registration:  { entity: 'attendee', event: 'created'       },
    lead_status_change:  { entity: 'lead',     event: 'status_change' },
    lead_intake:         { entity: 'lead',     event: 'created'       }
  };
  window.CRM_AUTOMATION_TRIGGER_TYPES = TRIGGER_TYPES;

  // Condition evaluators. `cond` is action_config.trigger_condition JSON,
  // `data` is the payload supplied at the call site.
  var CONDITIONS = {
    always: function () { return true; },
    status_equals: function (cond, data) {
      var v = data.newStatus != null ? data.newStatus : (data.outcome != null ? data.outcome : data.status);
      return v === cond.status;
    },
    count_threshold: function (cond, data) {
      var actual = data[cond.field];
      if (typeof actual !== 'number') return false;
      if (cond.operator === '>')  return actual >  cond.value;
      if (cond.operator === '>=') return actual >= cond.value;
      if (cond.operator === '=')  return actual === cond.value;
      if (cond.operator === '<')  return actual <  cond.value;
      if (cond.operator === '<=') return actual <= cond.value;
      return false;
    },
    source_equals: function (cond, data) {
      return data.source === cond.source;
    }
  };
  window.CRM_AUTOMATION_CONDITIONS = CONDITIONS;

  function evaluateCondition(conditionJson, data) {
    if (!conditionJson || typeof conditionJson !== 'object') return true; // treat missing as 'always'
    var type = conditionJson.type || 'always';
    var fn = CONDITIONS[type];
    if (!fn) {
      console.warn('CrmAutomation: unknown condition type', type);
      return false;
    }
    try { return fn(conditionJson, data || {}); }
    catch (e) { console.error('CrmAutomation: condition error', e); return false; }
  }

  // Resolve recipients for a rule. Returns an array of lead rows
  // { id, full_name, phone, email } filtered per the recipient_type.
  async function resolveRecipients(recipientType, tenantId, triggerData) {
    var tier2 = window.TIER2_STATUSES || ['waiting','invited','confirmed','confirmed_verified'];
    var eventId = triggerData && triggerData.eventId;
    var leadId  = triggerData && triggerData.leadId;

    if (recipientType === 'trigger_lead') {
      if (!leadId) return [];
      var leadRes = await sb.from('crm_leads').select('id, full_name, phone, email, unsubscribed_at, is_deleted')
        .eq('tenant_id', tenantId).eq('id', leadId).single();
      if (leadRes.error || !leadRes.data) return [];
      if (leadRes.data.unsubscribed_at || leadRes.data.is_deleted) return [];
      return [leadRes.data];
    }

    if (recipientType === 'tier2' || recipientType === 'tier2_excl_registered') {
      var lRes = await sb.from('crm_leads').select('id, full_name, phone, email')
        .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null).in('status', tier2);
      if (lRes.error) throw new Error('recipients tier2: ' + lRes.error.message);
      var leads = lRes.data || [];
      if (recipientType === 'tier2_excl_registered' && eventId) {
        var xRes = await sb.from('crm_event_attendees').select('lead_id')
          .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
        if (xRes.error) throw new Error('recipients exclude: ' + xRes.error.message);
        var excluded = {};
        (xRes.data || []).forEach(function (r) { if (r.lead_id) excluded[r.lead_id] = true; });
        leads = leads.filter(function (l) { return !excluded[l.id]; });
      }
      return leads;
    }

    if (recipientType === 'attendees' || recipientType === 'attendees_waiting') {
      if (!eventId) return [];
      var attStatus = (recipientType === 'attendees_waiting') ? ['waiting_list'] : ['registered','confirmed','attended','purchased','no_show'];
      var aRes = await sb.from('crm_event_attendees').select('crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false).in('status', attStatus);
      if (aRes.error) throw new Error('recipients attendees: ' + aRes.error.message);
      return (aRes.data || [])
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
    }

    console.warn('CrmAutomation: unknown recipient_type', recipientType);
    return [];
  }
  window.CRM_AUTOMATION_RESOLVE_RECIPIENTS = resolveRecipients;

  // Build the variables object the send-message EF needs. Reuses buildEventVariables
  // from crm-event-actions.js when available (for event-scoped triggers).
  async function buildVariables(triggerData, lead) {
    var vars = { name: lead.full_name || '', phone: lead.phone || '', email: lead.email || '' };
    var evt = triggerData && triggerData.event;
    // If the trigger carries an event, merge event variables.
    if (!evt && triggerData && triggerData.eventId) {
      var tenantId = tid();
      var evRes = await sb.from('crm_events').select('name, event_date, start_time, location_address')
        .eq('id', triggerData.eventId).eq('tenant_id', tenantId).single();
      if (!evRes.error) evt = evRes.data;
    }
    if (evt) {
      var date = (window.CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(evt.event_date) : (evt.event_date || '');
      vars.event_name     = evt.name || '';
      vars.event_date     = date || '';
      vars.event_time     = evt.start_time || '';
      vars.event_location = evt.location_address || '';
    }
    return vars;
  }

  // Fire a single rule: resolve recipients, compose calls, Promise.allSettled.
  async function fireRule(rule, triggerData) {
    var cfg = rule.action_config || {};
    var tenantId = tid();
    if (!tenantId) return { sent: 0, failed: 0, skipped: 1 };
    if (rule.action_type !== 'send_message') {
      console.warn('CrmAutomation: unsupported action_type', rule.action_type);
      return { sent: 0, failed: 0, skipped: 1 };
    }
    var tplBase = cfg.template_slug;
    var channels = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : ['sms']);
    var recipientType = cfg.recipient_type || 'trigger_lead';
    if (!tplBase) { console.warn('CrmAutomation: rule missing template_slug', rule.id); return { sent: 0, failed: 0, skipped: 1 }; }

    var leads;
    try { leads = await resolveRecipients(recipientType, tenantId, triggerData); }
    catch (e) { console.error('CrmAutomation.fireRule recipients:', e); return { sent: 0, failed: 1, skipped: 0 }; }
    if (!leads.length) return { sent: 0, failed: 0, skipped: 0 };

    if (!window.CrmMessaging || !CrmMessaging.sendMessage) {
      console.error('CrmAutomation: CrmMessaging.sendMessage not available');
      return { sent: 0, failed: leads.length * channels.length, skipped: 0 };
    }

    var calls = [];
    for (var i = 0; i < leads.length; i++) {
      var lead = leads[i];
      var vars = await buildVariables(triggerData, lead);
      channels.forEach(function (ch) {
        if (ch === 'email' && !lead.email) return; // skip email-less leads for email channel
        calls.push(CrmMessaging.sendMessage({
          leadId: lead.id,
          channel: ch,
          templateSlug: tplBase,
          variables: vars,
          eventId: triggerData && triggerData.eventId ? triggerData.eventId : undefined,
          language: cfg.language || 'he'
        }));
      });
    }

    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0;
    results.forEach(function (r) { if (r.status === 'fulfilled' && r.value && r.value.ok) sent++; else failed++; });
    return { sent: sent, failed: failed, skipped: 0 };
  }

  // Public entry point.
  async function evaluate(triggerType, triggerData) {
    var map = TRIGGER_TYPES[triggerType];
    if (!map) { console.warn('CrmAutomation.evaluate: unknown triggerType', triggerType); return { fired: 0, sent: 0, failed: 0, skipped: 0 }; }
    var tenantId = tid();
    if (!tenantId) return { fired: 0, sent: 0, failed: 0, skipped: 0 };

    var q = sb.from('crm_automation_rules')
      .select('id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('trigger_entity', map.entity)
      .eq('trigger_event', map.event)
      .order('sort_order');
    var res = await q;
    if (res.error) { console.error('CrmAutomation: load rules failed', res.error); return { fired: 0, sent: 0, failed: 0, skipped: 0 }; }

    var rules = (res.data || []).filter(function (r) { return evaluateCondition(r.trigger_condition, triggerData || {}); });
    if (!rules.length) return { fired: 0, sent: 0, failed: 0, skipped: 0 };

    var perRule = await Promise.allSettled(rules.map(function (r) { return fireRule(r, triggerData || {}); }));
    var sent = 0, failed = 0, skipped = 0;
    perRule.forEach(function (pr) {
      if (pr.status === 'fulfilled' && pr.value) { sent += pr.value.sent || 0; failed += pr.value.failed || 0; skipped += pr.value.skipped || 0; }
      else failed++;
    });
    var summary = { fired: rules.length, sent: sent, failed: failed, skipped: skipped };
    if (window.Toast && (sent + failed) > 0) {
      if (failed === 0) Toast.success('נשלחו ' + sent + ' הודעות');
      else Toast.warning('נשלחו ' + sent + ', ' + failed + ' נכשלו');
    }
    return summary;
  }

  window.CrmAutomation = {
    evaluate: evaluate,
    evaluateCondition: evaluateCondition,
    resolveRecipients: resolveRecipients,
    TRIGGER_TYPES: TRIGGER_TYPES,
    CONDITIONS: CONDITIONS
  };
})();
