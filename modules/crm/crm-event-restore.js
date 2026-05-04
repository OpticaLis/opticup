/* =============================================================================
   crm-event-restore.js — CRM event soft-restore helper (inverse of delete).
   Wraps the restore_event_from_log RPC. Server-side restores the event +
   exactly the attendees recorded in the source delete-log row's
   details->'attendee_ids' (Approach B).
   Load order: after shared.js, crm-helpers.js, crm-event-actions.js,
   BEFORE crm-activity-log.js (which renders the שחזר button).
   Extends window.CrmEventActions with restoreEventFromLog(logId, tenantId).
   Returns the RPC's jsonb payload directly:
     { success:true,  event_id, restored_attendees:N, source_log_id, note? }
     { success:false, error:'invalid_log_id' }
     { success:false, error:'event_not_found' }
     { success:false, error:'event_not_deleted' }
   Rejects only on transport-level error (network, RPC misconfig).
   Does NOT call ActivityLog.write — the RPC writes the canonical audit row
   server-side (lesson from DELETE_EMPTY_EVENT F1).
   ============================================================================= */
(function () {
  'use strict';

  window.CrmEventActions = window.CrmEventActions || {};

  async function restoreEventFromLog(logId, tenantId) {
    if (!logId) throw new Error('logId required');
    var tid = tenantId || (typeof CrmHelpers !== 'undefined' && CrmHelpers.tid && CrmHelpers.tid());
    if (!tid) throw new Error('tenant not resolved');

    var res = await sb.rpc('restore_event_from_log', {
      p_tenant_id: tid,
      p_log_id: logId
    });
    if (res.error) throw new Error('restore_event_from_log: ' + res.error.message);

    return res.data || {};
  }

  window.CrmEventActions.restoreEventFromLog = restoreEventFromLog;
})();
