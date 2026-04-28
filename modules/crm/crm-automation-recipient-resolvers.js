/* =============================================================================
   crm-automation-recipient-resolvers.js — recipient resolution for the engine.
   Extracted from crm-automation-engine.js during P5_V2_REBUILD_RUNG2_RULES_REWIRE
   (2026-04-28) to keep the engine under Rule 12 cap and add the
   cross_event_active_waitlist resolver for Rule 2.4 (parallel-event opens).

   Recipient types (6):
     - trigger_lead                   — single lead from triggerData.leadId
     - tier2 / tier2_excl_registered  — leads filtered by status (P21 status filter)
     - leads_by_status                — explicit-filter-only variant
     - attendees / attendees_waiting / attendees_all_statuses — per-event attendees
     - cross_event_active_waitlist    — NEW (Rung 2): leads with attendee status
       'waiting_list' or 'invited' on OTHER currently-active events
       (open_for_registration / waitlist_full).
       Used by Rule 2.4: when a parallel event opens, invite the active waitlist.

   All resolvers filter out unsubscribed_at IS NOT NULL and is_deleted=true.
   Load order: AFTER crm-helpers.js, BEFORE crm-automation-engine.js.
   ============================================================================= */
(function () {
  'use strict';

  async function resolveRecipients(recipientType, tenantId, triggerData, actionConfig) {
    var tier2 = window.TIER2_STATUSES || ['waiting','invited','confirmed','confirmed_verified'];
    var cfg = actionConfig || {};
    var eventId = triggerData && triggerData.eventId;
    var leadId  = triggerData && triggerData.leadId;

    if (recipientType === 'trigger_lead') {
      if (!leadId) return [];
      var leadRes = await sb.from('crm_leads')
        .select('id, full_name, phone, email, unsubscribed_at, is_deleted')
        .eq('tenant_id', tenantId).eq('id', leadId).single();
      if (leadRes.error || !leadRes.data) return [];
      if (leadRes.data.unsubscribed_at || leadRes.data.is_deleted) return [];
      return [leadRes.data];
    }

    if (recipientType === 'tier2' || recipientType === 'tier2_excl_registered' || recipientType === 'leads_by_status') {
      var hasFilter = Array.isArray(cfg.recipient_status_filter) && cfg.recipient_status_filter.length;
      if (recipientType === 'leads_by_status' && !hasFilter) {
        console.warn('CrmAutomation: leads_by_status requires recipient_status_filter');
        return [];
      }
      var statusList = hasFilter ? cfg.recipient_status_filter : tier2;
      var lRes = await sb.from('crm_leads').select('id, full_name, phone, email')
        .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null)
        .in('status', statusList);
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

    if (recipientType === 'attendees' || recipientType === 'attendees_waiting' || recipientType === 'attendees_all_statuses') {
      if (!eventId) return [];
      var attStatus;
      if (recipientType === 'attendees_waiting') attStatus = ['waiting_list'];
      else if (recipientType === 'attendees_all_statuses') attStatus = null;
      else attStatus = ['registered','confirmed','attended','purchased','no_show'];
      var q = sb.from('crm_event_attendees')
        .select('crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
      if (attStatus) q = q.in('status', attStatus);
      var aRes = await q;
      if (aRes.error) throw new Error('recipients attendees: ' + aRes.error.message);
      return (aRes.data || [])
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
    }

    if (recipientType === 'cross_event_active_waitlist') {
      // Rule 2.4 (P5_V2): invite the active waitlist of OTHER open events to a
      // newly-opened parallel event. Filters: attendee status 'waiting_list' or
      // 'invited' on a different event whose own status is
      // registration_open / waiting_list (canonical crm_statuses.event slugs).
      var attRes = await sb.from('crm_event_attendees')
        .select('event_id, lead_id, status, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId)
        .in('status', ['waiting_list', 'invited'])
        .eq('is_deleted', false);
      if (attRes.error) throw new Error('recipients cross_event: ' + attRes.error.message);
      var rows = (attRes.data || []).filter(function (r) { return r.event_id !== eventId; });
      if (!rows.length) return [];
      var otherEventIds = Array.from(new Set(rows.map(function (r) { return r.event_id; })));
      var evRes = await sb.from('crm_events').select('id, status, is_deleted')
        .eq('tenant_id', tenantId).in('id', otherEventIds);
      if (evRes.error) throw new Error('recipients cross_event events: ' + evRes.error.message);
      var activeEvents = {};
      (evRes.data || []).forEach(function (e) {
        if (!e.is_deleted && (e.status === 'registration_open' || e.status === 'waiting_list')) {
          activeEvents[e.id] = true;
        }
      });
      var seen = {};
      var leadsOut = [];
      rows.forEach(function (r) {
        if (!activeEvents[r.event_id]) return;
        var lead = r.crm_leads;
        if (!lead || lead.unsubscribed_at || lead.is_deleted) return;
        if (seen[lead.id]) return;
        seen[lead.id] = true;
        leadsOut.push(lead);
      });
      return leadsOut;
    }

    console.warn('CrmAutomation: unknown recipient_type', recipientType);
    return [];
  }

  window.CrmAutomationRecipients = { resolve: resolveRecipients };
})();
