/* =============================================================================
   crm-automation-recipient-resolvers.js — recipient resolution for the engine.
   Extracted from crm-automation-engine.js during P5_V2_REBUILD_RUNG2_RULES_REWIRE
   (2026-04-28) to keep the engine under Rule 12 cap and add the
   cross_event_active_waitlist resolver for Rule 2.4 (parallel-event opens).

   Recipient types (7):
     - trigger_lead                   — single lead from triggerData.leadId
     - tier2 / tier2_excl_registered  — leads filtered by status (P21 status filter)
     - leads_by_status                — explicit-filter-only variant
     - attendees / attendees_waiting / attendees_all_statuses — per-event attendees
     - cross_event_active_waitlist    — leads with attendee status
       'waiting_list' or 'invited' on OTHER currently-active events
       (open_for_registration / waitlist_full).
       Used by Rule 2.4: when a parallel event opens, invite the active waitlist.
     - attendees_with_active_coupon   — NEW (2026-05-02, Daniel directive):
       per-event attendees who currently hold a valid coupon. Definition:
       coupon_sent=true AND status != 'cancelled' (matches existing UI counters
       in crm-events-detail.js / crm-event-day-coupon.js / crm-event-day-manage.js).
       Used by the event-day reminder rule so only attendees with a coupon in
       hand get the morning-of message — not attendees who registered but
       never paid/got their coupon, and not those who cancelled.

   All resolvers filter out unsubscribed_at IS NOT NULL and is_deleted=true.
   Load order: AFTER crm-helpers.js, BEFORE crm-automation-engine.js.
   ============================================================================= */
(function () {
  'use strict';

  // M4_SUPPRESSION_LIST (2026-05-22): contact-level filter applied at every
  // return boundary. Belt+suspenders with the per-lead unsubscribed_at gate.
  async function _filterSuppressed(tenantId, leads) {
    if (!leads || !leads.length) return leads;
    var sup = await sb.from('crm_suppressions').select('email_norm, phone_norm').eq('tenant_id', tenantId);
    if (sup.error || !sup.data || !sup.data.length) return leads;
    var emails = new Set(); var phones = new Set();
    sup.data.forEach(function (s) { if (s.email_norm) emails.add(s.email_norm); if (s.phone_norm) phones.add(s.phone_norm); });
    return leads.filter(function (l) {
      var e = (l && l.email ? l.email : '').trim().toLowerCase();
      var p = (l && l.phone ? l.phone : '').trim();
      if (e && emails.has(e)) return false;
      if (p && phones.has(p)) return false;
      return true;
    });
  }

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
      return _filterSuppressed(tenantId, [leadRes.data]);
    }

    if (recipientType === 'tier2' || recipientType === 'tier2_excl_registered' || recipientType === 'leads_by_status') {
      var hasFilter = Array.isArray(cfg.recipient_status_filter) && cfg.recipient_status_filter.length;
      if (recipientType === 'leads_by_status' && !hasFilter) {
        console.warn('CrmAutomation: leads_by_status requires recipient_status_filter');
        return [];
      }
      var statusList = hasFilter ? cfg.recipient_status_filter : tier2;
      var leads;
      try {
        leads = await paginateQuery(function () {
          return sb.from('crm_leads').select('id, full_name, phone, email')
            .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null)
            .in('status', statusList);
        });
      } catch (e) { throw new Error('recipients tier2: ' + e.message); }
      if (recipientType === 'tier2_excl_registered' && eventId) {
        var excludeRows;
        try {
          excludeRows = await paginateQuery(function () {
            return sb.from('crm_event_attendees').select('lead_id')
              .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
          });
        } catch (e) { throw new Error('recipients exclude: ' + e.message); }
        var excluded = {};
        excludeRows.forEach(function (r) { if (r.lead_id) excluded[r.lead_id] = true; });
        leads = leads.filter(function (l) { return !excluded[l.id]; });
      }
      return _filterSuppressed(tenantId, leads);
    }

    if (recipientType === 'attendees' || recipientType === 'attendees_waiting' || recipientType === 'attendees_all_statuses') {
      if (!eventId) return [];
      var attStatus;
      if (recipientType === 'attendees_waiting') attStatus = ['waiting_list'];
      else if (recipientType === 'attendees_all_statuses') attStatus = null;
      else attStatus = ['registered','confirmed','attended','purchased','no_show'];
      var aRows;
      try {
        aRows = await paginateQuery(function () {
          var q = sb.from('crm_event_attendees')
            .select('crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
            .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
          if (attStatus) q = q.in('status', attStatus);
          return q;
        });
      } catch (e) { throw new Error('recipients attendees: ' + e.message); }
      return _filterSuppressed(tenantId, aRows
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; }));
    }

    if (recipientType === 'attendees_with_active_coupon') {
      // 2026-05-02 — Daniel directive for the event-day reminder rule:
      // recipients are attendees who currently hold a valid coupon, defined as
      // coupon_sent=true AND status != 'cancelled' (mirrors UI counter logic in
      // crm-events-detail.js + crm-event-day-coupon.js). When an attendee
      // cancels, the existing cancel flow flips coupon_sent back to false +
      // returns the coupon to the pool, so this filter is robust on its own.
      if (!eventId) return [];
      var cRows;
      try {
        cRows = await paginateQuery(function () {
          return sb.from('crm_event_attendees')
            .select('status, coupon_sent, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
            .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false)
            .eq('coupon_sent', true).neq('status', 'cancelled');
        });
      } catch (e) { throw new Error('recipients attendees_with_active_coupon: ' + e.message); }
      return _filterSuppressed(tenantId, cRows
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; }));
    }

    if (recipientType === 'cross_event_active_waitlist') {
      // Rule 2.4 (P5_V2): invite the active waitlist of OTHER open events to a
      // newly-opened parallel event. M4_REMOVE_ATTENDEE_INVITED_STATUS
      // (2026-05-22 Phase 2): 'invited' removed; scans 'waiting_list' only.
      var attRows;
      try {
        attRows = await paginateQuery(function () {
          return sb.from('crm_event_attendees')
            .select('event_id, lead_id, status, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
            .eq('tenant_id', tenantId)
            .in('status', ['waiting_list'])
            .eq('is_deleted', false);
        });
      } catch (e) { throw new Error('recipients cross_event: ' + e.message); }
      var rows = attRows.filter(function (r) { return r.event_id !== eventId; });
      if (!rows.length) return [];
      var otherEventIds = Array.from(new Set(rows.map(function (r) { return r.event_id; })));
      var evRows;
      try {
        evRows = await paginateQuery(function () {
          return sb.from('crm_events').select('id, status, is_deleted')
            .eq('tenant_id', tenantId).in('id', otherEventIds);
        });
      } catch (e) { throw new Error('recipients cross_event events: ' + e.message); }
      var activeEvents = {};
      evRows.forEach(function (e) {
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
      return _filterSuppressed(tenantId, leadsOut);
    }

    console.warn('CrmAutomation: unknown recipient_type', recipientType);
    return [];
  }

  window.CrmAutomationRecipients = { resolve: resolveRecipients };
})();
