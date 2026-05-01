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
  // attendee_moved (Rung 2 / 2026-04-28): fired by Rung 3's manual-move RPC.
  // Inert pre-Rung-3 — rule rows for "manual move notification" sit in DB but
  // never fire until the move dialog wires up.
  var TRIGGER_TYPES = {
    event_status_change: { entity: 'event',    event: 'status_change' },
    event_registration:  { entity: 'attendee', event: 'created'       },
    lead_status_change:  { entity: 'lead',     event: 'status_change' },
    lead_intake:         { entity: 'lead',     event: 'created'       },
    attendee_moved:      { entity: 'attendee', event: 'moved'         }
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
  // status list to specific statuses. Rung 2: implementation extracted to
  // crm-automation-recipient-resolvers.js (Rule 12 cap + Rule 21 — engine
  // delegates instead of redefining the same function name).
  function _engineResolveRecipients(recipientType, tenantId, triggerData, actionConfig) {
    if (window.CrmAutomationRecipients && CrmAutomationRecipients.resolve) {
      return CrmAutomationRecipients.resolve(recipientType, tenantId, triggerData, actionConfig);
    }
    console.error('CrmAutomation: CrmAutomationRecipients not loaded');
    return Promise.resolve([]);
  }
  window.CRM_AUTOMATION_RESOLVE_RECIPIENTS = _engineResolveRecipients;

  // Build %var% substitution map for plan-item preview. Real URLs/HMACs are
  // injected server-side by send-message EF at dispatch time.
  async function buildVariables(triggerData, lead) {
    var vars = { name: lead.full_name || '', phone: lead.phone || '', email: lead.email || '' };
    vars.lead_id = lead.id || '';
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
      // Preview placeholder — real URL generated server-side by send-message EF.
      // Per-event registration_form_url overrides UNLESS it's a legacy r.html/app.opticalis URL.
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

  // P20: prepare plan items for a rule. runId stamps queue_send rows so
  // dispatch-queue → send-message → log rows all carry the run id.
  async function prepareRulePlan(rule, triggerData, tplCache, runId) {
    var cfg = rule.action_config || {};
    var tenantId = tid();
    if (!tenantId) return { items: [], skipped: 1, resolvedLeadIds: [] };
    // Rung 2 (P5_V2_REBUILD_RUNG2_RULES_REWIRE): queue_send writes future rows
    // into crm_message_queue (drained by dispatch-queue EF + pg_cron). No
    // immediate dispatch — items array stays empty; engine loop is a no-op
    // for this rule. Idempotency: ON CONFLICT (tenant_id,event_id,lead_id,
    // template_slug,channel) DO NOTHING via uq_crm_message_queue_idem.
    if (rule.action_type === 'queue_send') {
      if (!window.CrmAutomationQueueSend || !CrmAutomationQueueSend.prepare) {
        console.error('CrmAutomation: CrmAutomationQueueSend not loaded');
        return { items: [], skipped: 1, resolvedLeadIds: [] };
      }
      try {
        var qsRes = await CrmAutomationQueueSend.prepare(rule, triggerData, tenantId, _engineResolveRecipients, runId);
        return { items: [], skipped: 0, resolvedLeadIds: qsRes.leadIds || [], queued: qsRes.queued || 0 };
      } catch (e) {
        console.error('CrmAutomation queue_send:', e);
        return { items: [], skipped: 1, resolvedLeadIds: [] };
      }
    }
    if (rule.action_type !== 'send_message') {
      console.warn('CrmAutomation: unsupported action_type', rule.action_type);
      return { items: [], skipped: 1, resolvedLeadIds: [] };
    }
    var tplBase = cfg.template_slug;
    var channels = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : ['sms']);
    var recipientType = cfg.recipient_type || 'trigger_lead';
    var language = cfg.language || 'he';
    var hasPostAction = !!cfg.post_action_status_update;

    // Rule must either dispatch (tplBase) or run a post-action. Both absent = no-op.
    if (!tplBase && !hasPostAction) {
      console.warn('CrmAutomation: rule has no template_slug and no post_action_status_update', rule.id);
      return { items: [], skipped: 1, resolvedLeadIds: [] };
    }

    var leads;
    try { leads = await _engineResolveRecipients(recipientType, tenantId, triggerData, cfg); }
    catch (e) { console.error('CrmAutomation.prepareRulePlan recipients:', e); return { items: [], skipped: 0, resolvedLeadIds: [] }; }
    var resolvedLeadIds = leads.map(function (l) { return l.id; });
    if (!leads.length) return { items: [], skipped: 0, resolvedLeadIds: resolvedLeadIds };
    // No dispatch — rule is post-action-only. Recipients resolved for the hook.
    if (!tplBase) return { items: [], skipped: 0, resolvedLeadIds: resolvedLeadIds };

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
          language: language,
          // EVENT_CLOSE_COMPLETE_STATUS_FIX: rules with an explicit status
          // transition own their lifecycle; don't let promoteWaitingLeadsToInvited
          // override it post-dispatch (it was overwriting Dana invited→waiting→invited).
          // PRE_CUTOVER_QA_A B4: rules can also explicitly opt out via
          // action_config.skip_auto_promote (e.g. will_open_tomorrow — leads stay 'waiting').
          skip_auto_promote: hasPostAction || cfg.skip_auto_promote === true
        });
      }
    }
    return { items: items, skipped: 0, resolvedLeadIds: resolvedLeadIds };
  }

  // P20 fallback: direct dispatch when CrmConfirmSend isn't loaded.
  async function dispatchPlanDirect(items) {
    if (!window.CrmMessaging || !CrmMessaging.sendMessage) {
      console.error('CrmAutomation: CrmMessaging.sendMessage not available');
      return { sent: 0, failed: items.length, skipped: 0 };
    }
    var calls = items.map(function (it) {
      return CrmMessaging.sendMessage({
        leadId: it.lead_id, channel: it.channel, templateSlug: it.template_slug,
        variables: it.variables, eventId: it.event_id || undefined, language: it.language, runId: it.run_id || undefined
      });
    });
    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0, rejected = 0;
    results.forEach(function (r, i) {
      var v = r.status === 'fulfilled' ? r.value : null;
      if (v && v.ok) { sent++; if (items[i].run_id && v.logId && window.CrmAutomationRuns) CrmAutomationRuns.stampLog(v.logId, items[i].run_id); }
      else if (v && v.error === 'phone_not_allowed') rejected++; else failed++;
    });
    if (window.CrmAutomationPostActions) {
      try { await CrmAutomationPostActions.promoteWaitingLeadsToInvited(items, results); }
      catch (e) { console.error('promoteWaitingLeadsToInvited:', e); }
    }
    return { sent: sent, failed: failed, rejected: rejected, skipped: 0 };
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

    // Run row written upfront (2026-04-29) so queue_send/post-action-only
    // firings (T8/T9 etc.) appear in automation-history. total_recipients
    // is patched after planItems + queued are known.
    var runId = null;
    if (window.CrmAutomationRuns) {
      runId = await CrmAutomationRuns.createRun(tenantId, rules, triggerType, triggerData, triggerData && triggerData.eventId, 0);
    }

    var tplCache = new Map();
    var perRule = await Promise.allSettled(rules.map(function (r) { return prepareRulePlan(r, triggerData || {}, tplCache, runId); }));
    var planItems = [], skipped = 0, ruleResolvedIds = [], totalQueued = 0;
    perRule.forEach(function (pr, i) {
      var v = pr.status === 'fulfilled' ? pr.value : null;
      if (v) {
        planItems = planItems.concat(v.items || []);
        skipped += v.skipped || 0;
        ruleResolvedIds[i] = v.resolvedLeadIds || [];
        totalQueued += v.queued || 0;
      } else { skipped++; ruleResolvedIds[i] = []; }
    });

    // Bulk post-actions run after resolve, before dispatch — lifecycle transitions are user-gate-independent.
    if (window.CrmAutomationPostActions && CrmAutomationPostActions.executePostActions) {
      for (var ri = 0; ri < rules.length; ri++) {
        try { await CrmAutomationPostActions.executePostActions(rules[ri], ruleResolvedIds[ri] || []); }
        catch (e) { console.error('CrmAutomation post-action:', e); }
      }
    }
    // Rung 2: attendee_upsert post-action (Rules 2.2 / 2.4). Same loop, separate hook.
    if (window.CrmAutomationPostActions && CrmAutomationPostActions.attendeeUpsert) {
      for (var ai = 0; ai < rules.length; ai++) {
        try { await CrmAutomationPostActions.attendeeUpsert(rules[ai], ruleResolvedIds[ai] || [], triggerData || {}); }
        catch (e) { console.error('CrmAutomation attendee_upsert:', e); }
      }
    }

    // Update total_recipients now that planItems + queued count are known.
    var totalRecipients = planItems.length + totalQueued;
    if (runId && totalRecipients > 0) {
      try { await sb.from('crm_automation_runs').update({ total_recipients: totalRecipients }).eq('id', runId); }
      catch (e) { console.error('CrmAutomation total_recipients update:', e); }
    }

    if (!planItems.length) {
      // queue_send-only or post-action-only fire: still close the run row so
      // automation-history shows it (status='completed', sent_count derived
      // from log later when dispatch-queue drains).
      if (runId && window.CrmAutomationRuns) await CrmAutomationRuns.finishRun(runId, 'completed');
      if (window.Toast) {
        if (totalQueued > 0) Toast.info('הוצבו ' + totalQueued + ' הודעות בתור');
        else Toast.info('כלל אוטומציה הופעל, אך אין נמענים מתאימים');
      }
      return { fired: rules.length, sent: 0, failed: 0, skipped: skipped, queued: totalQueued, run_id: runId };
    }

    if (runId) planItems.forEach(function (it) { it.run_id = runId; });

    if (window.CrmConfirmSend && typeof CrmConfirmSend.show === 'function') {
      CrmConfirmSend.show(planItems); // fire-and-forget; finish-run happens in approveAndSend
      return { fired: rules.length, pending_confirm: true, skipped: skipped, planned: planItems.length, run_id: runId };
    }
    var r = await dispatchPlanDirect(planItems);
    if (runId && window.CrmAutomationRuns) await CrmAutomationRuns.finishRun(runId, 'completed');
    if (window.Toast && (r.sent + r.failed + (r.rejected || 0)) > 0) {
      var m = 'נשלחו ' + r.sent + ', נכשלו ' + r.failed + ', נדחו ' + (r.rejected || 0);
      Toast[(r.failed === 0 && (r.rejected || 0) === 0) ? 'success' : 'warning'](m);
    }
    return { fired: rules.length, sent: r.sent, failed: r.failed, rejected: r.rejected || 0, skipped: skipped, queued: totalQueued, run_id: runId };
  }

  window.CrmAutomation = {
    evaluate: evaluate,
    evaluateCondition: evaluateCondition,
    resolveRecipients: _engineResolveRecipients,
    prepareRulePlan: prepareRulePlan,
    TRIGGER_TYPES: TRIGGER_TYPES,
    CONDITIONS: CONDITIONS
  };
})();
