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
       resolves recipients, builds a sendPlan. P20: when CrmConfirmSend is loaded
       (default for CRM UI), shows the confirmation modal and returns
       { fired, pending_confirm: true, planned } without dispatching. Fallback
       (no modal available): dispatches via CrmMessaging.sendMessage and returns
       { fired, sent, failed, skipped }.
   Load order: after crm-helpers.js, crm-messaging-send.js, and — for the
   confirmation gate — crm-confirm-send.js (optional).
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
  // P21: optional `actionConfig.recipient_status_filter` narrows the tier2
  // status list to specific statuses (e.g. ["waiting"]). Empty/missing →
  // fall back to the full tier2 list (backwards-compatible).
  async function resolveRecipients(recipientType, tenantId, triggerData, actionConfig) {
    var tier2 = window.TIER2_STATUSES || ['waiting','invited','confirmed','confirmed_verified'];
    var cfg = actionConfig || {};
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
      var statusList = (Array.isArray(cfg.recipient_status_filter) && cfg.recipient_status_filter.length)
        ? cfg.recipient_status_filter
        : tier2;
      var lRes = await sb.from('crm_leads').select('id, full_name, phone, email')
        .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null).in('status', statusList);
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
    // P-FINAL: preview placeholder only — real HMAC unsubscribe token is
    // generated server-side in send-message EF at actual send time (90-day TTL).
    vars.unsubscribe_url = '[קישור הסרה — יצורף אוטומטית]';
    var evt = triggerData && triggerData.event;
    // If the trigger carries an event, merge event variables.
    if (!evt && triggerData && triggerData.eventId) {
      var tenantId = tid();
      var evRes = await sb.from('crm_events').select('name, event_date, start_time, location_address, registration_form_url')
        .eq('id', triggerData.eventId).eq('tenant_id', tenantId).single();
      if (!evRes.error) evt = evRes.data;
    }
    if (evt) {
      var date = (window.CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(evt.event_date) : (evt.event_date || '');
      vars.event_name     = evt.name || '';
      vars.event_date     = date || '';
      vars.event_time     = evt.start_time || '';
      vars.event_location = evt.location_address || '';
      // STOREFRONT_FORMS P-A: preview placeholder only — real HMAC-signed
      // storefront URL (prizma-optic.co.il/event-register?token=…) is
      // generated server-side by send-message EF when event_id is passed.
      // Per-event override (crm_events.registration_form_url) still wins
      // and is passed through to the message as-is.
      // P-BUGFIX: ignore legacy registration_form_url values that point to the
      // old ERP domain (app.opticalis.co.il/r.html). These must fall through
      // to the placeholder so the send-message EF generates a new HMAC-signed
      // storefront URL (prizma-optic.co.il/event-register?token=...).
      var regUrl = evt.registration_form_url || '';
      var isLegacyUrl = regUrl.indexOf('r.html') !== -1 || regUrl.indexOf('app.opticalis') !== -1;
      if (regUrl && !isLegacyUrl) {
        vars.registration_url = regUrl;
      } else if (triggerData && triggerData.eventId) {
        vars.registration_url = '[קישור הרשמה — יצורף אוטומטית]';
      }
    }
    return vars;
  }

  // P20: Template cache + variable substitution for client-side preview.
  // Same %var% pattern the send-message EF uses server-side; preview is
  // informational (EF re-substitutes on actual send).
  async function fetchTemplate(cache, tenantId, base, channel, language) {
    var key = base + '|' + channel + '|' + (language || 'he');
    if (cache.has(key)) return cache.get(key);
    var fullSlug = base + '_' + channel + '_' + (language || 'he');
    var r = await sb.from('crm_message_templates').select('id, slug, body, subject')
      .eq('tenant_id', tenantId).eq('slug', fullSlug).eq('is_active', true).maybeSingle();
    var tpl = (!r.error && r.data) ? r.data : null;
    cache.set(key, tpl);
    return tpl;
  }

  function substituteVars(text, vars) {
    var out = String(text || '');
    Object.keys(vars || {}).forEach(function (k) {
      out = out.replace(new RegExp('%' + k + '%', 'g'), String(vars[k] == null ? '' : vars[k]));
    });
    return out;
  }

  // P20: prepare plan items for a rule (replaces fireRule's direct dispatch).
  // Returns { items, skipped } — items carry everything the confirmation modal
  // and the direct-dispatch fallback need.
  async function prepareRulePlan(rule, triggerData, tplCache) {
    var cfg = rule.action_config || {};
    var tenantId = tid();
    if (!tenantId) return { items: [], skipped: 1 };
    if (rule.action_type !== 'send_message') {
      console.warn('CrmAutomation: unsupported action_type', rule.action_type);
      return { items: [], skipped: 1 };
    }
    var tplBase = cfg.template_slug;
    var channels = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : ['sms']);
    var recipientType = cfg.recipient_type || 'trigger_lead';
    var language = cfg.language || 'he';
    if (!tplBase) { console.warn('CrmAutomation: rule missing template_slug', rule.id); return { items: [], skipped: 1 }; }

    var leads;
    try { leads = await resolveRecipients(recipientType, tenantId, triggerData, cfg); }
    catch (e) { console.error('CrmAutomation.prepareRulePlan recipients:', e); return { items: [], skipped: 0 }; }
    if (!leads.length) return { items: [], skipped: 0 };

    var items = [];
    for (var i = 0; i < leads.length; i++) {
      var lead = leads[i];
      var vars = await buildVariables(triggerData, lead);
      for (var j = 0; j < channels.length; j++) {
        var ch = channels[j];
        if (ch === 'email' && !lead.email) continue;
        if (ch === 'sms'   && !lead.phone) continue;
        var tpl = await fetchTemplate(tplCache, tenantId, tplBase, ch, language);
        var composedBody = tpl ? substituteVars(tpl.body, vars) : '[תבנית לא נמצאה: ' + tplBase + '_' + ch + '_' + language + ']';
        items.push({
          rule_name: rule.name || '',
          template_slug: tplBase,
          template_id: tpl ? tpl.id : null,
          channel: ch,
          recipient: { name: lead.full_name || '', phone: lead.phone || '', email: lead.email || '' },
          variables: vars,
          composedBody: composedBody,
          lead_id: lead.id,
          event_id: (triggerData && triggerData.eventId) || null,
          language: language
        });
      }
    }
    return { items: items, skipped: 0 };
  }

  // P20 fallback: direct dispatch when CrmConfirmSend isn't loaded (never
  // expected in normal operation — every CRM page loads crm-confirm-send.js).
  async function dispatchPlanDirect(items) {
    if (!window.CrmMessaging || !CrmMessaging.sendMessage) {
      console.error('CrmAutomation: CrmMessaging.sendMessage not available');
      return { sent: 0, failed: items.length, skipped: 0 };
    }
    var calls = items.map(function (it) {
      return CrmMessaging.sendMessage({
        leadId: it.lead_id, channel: it.channel, templateSlug: it.template_slug,
        variables: it.variables, eventId: it.event_id || undefined, language: it.language
      });
    });
    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0;
    results.forEach(function (r) { if (r.status === 'fulfilled' && r.value && r.value.ok) sent++; else failed++; });
    try { await promoteWaitingLeadsToInvited(items, results); } catch (e) { console.error('promoteWaitingLeadsToInvited:', e); }
    return { sent: sent, failed: failed, skipped: 0 };
  }

  // CRM_HOTFIXES Fix 2: after a successful event-scoped dispatch, promote
  // any tier-2 lead currently in status='waiting' to 'invited'. Scoped by
  // tenant_id + explicit `.eq('status','waiting')` so confirmed / attended /
  // unsubscribed leads are never demoted. Called from both dispatch paths
  // (confirmation-gate approveAndSend and dispatchPlanDirect fallback).
  async function promoteWaitingLeadsToInvited(planItems, results) {
    if (!Array.isArray(planItems) || !planItems.length) return { promoted: 0 };
    var tenantId = tid();
    if (!tenantId) return { promoted: 0 };
    var leadIds = {};
    planItems.forEach(function (it, i) {
      if (!it.event_id || !it.lead_id) return;
      var r = results && results[i];
      var ok = r && r.status === 'fulfilled' && r.value && r.value.ok;
      if (ok) leadIds[it.lead_id] = true;
    });
    var ids = Object.keys(leadIds);
    if (!ids.length) return { promoted: 0 };
    var res = await sb.from('crm_leads')
      .update({ status: 'invited', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .in('id', ids)
      .eq('status', 'waiting')
      .select('id');
    if (res.error) { console.error('CrmAutomation.promoteWaitingLeadsToInvited:', res.error); return { promoted: 0 }; }
    var promotedIds = (res.data || []).map(function (r) { return r.id; });
    promotedIds.forEach(function (id) {
      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.status_change', entity_type: 'crm_leads', entity_id: id, details: { from: 'waiting', to: 'invited', source: 'automation_invite' } }); } catch (_) {}
    });
    return { promoted: promotedIds.length };
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

    // P20: build a combined plan across all matching rules; show confirmation
    // modal if available (default), else dispatch immediately (fallback).
    var tplCache = new Map();
    var perRule = await Promise.allSettled(rules.map(function (r) { return prepareRulePlan(r, triggerData || {}, tplCache); }));
    var planItems = [], skipped = 0;
    perRule.forEach(function (pr) {
      if (pr.status === 'fulfilled' && pr.value) { planItems = planItems.concat(pr.value.items || []); skipped += pr.value.skipped || 0; }
      else skipped++;
    });

    if (!planItems.length) return { fired: rules.length, sent: 0, failed: 0, skipped: skipped };

    if (window.CrmConfirmSend && typeof CrmConfirmSend.show === 'function') {
      CrmConfirmSend.show(planItems); // fire-and-forget — caller doesn't await
      return { fired: rules.length, pending_confirm: true, skipped: skipped, planned: planItems.length };
    }

    // Fallback: legacy immediate dispatch (no modal loaded).
    var r = await dispatchPlanDirect(planItems);
    if (window.Toast && (r.sent + r.failed) > 0) {
      if (r.failed === 0) Toast.success('נשלחו ' + r.sent + ' הודעות');
      else Toast.warning('נשלחו ' + r.sent + ', ' + r.failed + ' נכשלו');
    }
    return { fired: rules.length, sent: r.sent, failed: r.failed, skipped: skipped };
  }

  window.CrmAutomation = {
    evaluate: evaluate,
    evaluateCondition: evaluateCondition,
    resolveRecipients: resolveRecipients,
    prepareRulePlan: prepareRulePlan,
    promoteWaitingLeadsToInvited: promoteWaitingLeadsToInvited,
    TRIGGER_TYPES: TRIGGER_TYPES,
    CONDITIONS: CONDITIONS
  };
})();
