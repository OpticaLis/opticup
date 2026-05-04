/* =============================================================================
   crm-event-delete.js — CRM event soft-delete helper.
   Wraps the soft_delete_event_if_empty RPC (gated on purchase_amount=0).
   Cascades to attendees + cancels queued messages server-side.
   Load order: after shared.js, crm-helpers.js, crm-event-actions.js.
   Extends window.CrmEventActions with softDeleteEventIfEmpty(eventId, eventName, tenantId).
   Returns the RPC's jsonb payload directly:
     { success:true,  deleted_attendees:N, cancelled_messages:M }
     { success:false, error:'event_not_found' }
     { success:false, error:'has_purchases', total_purchases:NN.NN }
   Rejects only on transport-level error (network, RPC misconfig).
   ============================================================================= */
(function () {
  'use strict';

  window.CrmEventActions = window.CrmEventActions || {};

  async function softDeleteEventIfEmpty(eventId, eventName, tenantId) {
    if (!eventId) throw new Error('eventId required');
    var tid = tenantId || (typeof CrmHelpers !== 'undefined' && CrmHelpers.tid && CrmHelpers.tid());
    if (!tid) throw new Error('tenant not resolved');

    var res = await sb.rpc('soft_delete_event_if_empty', {
      p_tenant_id: tid,
      p_event_id: eventId
    });
    if (res.error) throw new Error('soft_delete_event_if_empty: ' + res.error.message);

    var payload = res.data || {};
    if (payload && payload.success === true) {
      try {
        if (window.ActivityLog) {
          ActivityLog.write({
            action: 'crm.event.delete',
            entity_type: 'crm_events',
            entity_id: eventId,
            details: {
              event_name: eventName || null,
              deleted_attendees: payload.deleted_attendees || 0,
              cancelled_messages: payload.cancelled_messages || 0
            }
          });
        }
      } catch (_) { /* activity-log is best-effort */ }
    }
    return payload;
  }

  window.CrmEventActions.softDeleteEventIfEmpty = softDeleteEventIfEmpty;
})();
