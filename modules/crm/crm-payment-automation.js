/* crm-payment-automation.js — payment-lifecycle automations (M4_ATTENDEE_PAYMENT_AUTOMATION).
   Public API: window.CrmPaymentAutomation.{markUnpaidForCompletedEvent, transferOpenCreditOnRegistration}.
   Sits AROUND CrmAutomation.evaluate (engine untouched). The engine handles message dispatch via
   automation rules; this helper handles payment-status side-effects that aren't a message.
   - markUnpaidForCompletedEvent: event flips to 'completed' → flip pending_payment + no checkin → unpaid.
     Strict scope: ONLY 'completed' (event ran). NOT 'closed' (registration closed, event still upcoming).
   - transferOpenCreditOnRegistration: lead registers for new event → if open credit_pending exists with
     credit_expires_at > now(), call transfer_credit_to_new_attendee RPC (FIFO, oldest first). */
(function () {
  'use strict';

  var LOG_PREFIX = '[CrmPaymentAutomation]';

  function _log() {
    if (window.console && console.log) {
      var args = [LOG_PREFIX].concat(Array.prototype.slice.call(arguments));
      try { console.log.apply(console, args); } catch (_) {}
    }
  }

  function _refreshBell() {
    if (window.CrmNotificationsBell && typeof CrmNotificationsBell.refresh === 'function') {
      try { CrmNotificationsBell.refresh(); } catch (_) {}
    }
  }

  // Trigger: event status changed.
  // Side-effect: ONLY when newStatus='completed' AND oldStatus !== 'completed' →
  //   UPDATE crm_event_attendees SET payment_status='unpaid'
  //   WHERE event_id=$1 AND tenant_id=getTenantId() AND payment_status='pending_payment'
  //     AND checked_in_at IS NULL AND is_deleted=false
  // Returns: { flipped: <count>, eventId: <uuid>, skipped?: bool }
  async function markUnpaidForCompletedEvent(eventId, oldStatus, newStatus) {
    if (newStatus !== 'completed' || oldStatus === 'completed') {
      return { flipped: 0, eventId: eventId, skipped: true };
    }
    if (!eventId) return { flipped: 0, eventId: null, skipped: true };
    var tid = getTenantId();
    var res = await sb.from('crm_event_attendees')
      .update({ payment_status: 'unpaid' })
      .eq('event_id', eventId).eq('tenant_id', tid).eq('is_deleted', false)
      .eq('payment_status', 'pending_payment').is('checked_in_at', null)
      .select('id');
    if (res.error) {
      _log('markUnpaidForCompletedEvent error:', res.error.message);
      return { flipped: 0, eventId: eventId, error: res.error.message };
    }
    var flipped = (res.data || []).length;
    _log('markUnpaidForCompletedEvent: event=' + eventId + ' flipped=' + flipped);
    if (flipped > 0) _refreshBell();
    return { flipped: flipped, eventId: eventId };
  }

  // Trigger: lead just registered for a new event (newAttendeeId is the just-created row).
  // Side-effect: SELECT oldest unexpired credit_pending row for the same lead (excluding the new row),
  //   if found → call transfer_credit_to_new_attendee(p_old_attendee_id, p_new_attendee_id) RPC.
  //   The RPC atomically flips the new row to 'paid' and the old row to 'credit_used'.
  // FIFO: ORDER BY credit_expires_at ASC LIMIT 1.
  // Returns: { transferred: <bool>, oldAttendeeId: <uuid|null>, newAttendeeId: <uuid> }
  async function transferOpenCreditOnRegistration(leadId, newAttendeeId) {
    if (!leadId || !newAttendeeId) {
      return { transferred: false, oldAttendeeId: null, newAttendeeId: newAttendeeId || null };
    }
    var tid = getTenantId();
    var nowIso = new Date().toISOString();
    var sel = await sb.from('crm_event_attendees')
      .select('id, credit_expires_at')
      .eq('lead_id', leadId).eq('tenant_id', tid).eq('is_deleted', false)
      .eq('payment_status', 'credit_pending').gt('credit_expires_at', nowIso)
      .neq('id', newAttendeeId)
      .order('credit_expires_at', { ascending: true })
      .limit(1);
    if (sel.error) {
      _log('transferOpenCreditOnRegistration select error:', sel.error.message);
      return { transferred: false, oldAttendeeId: null, newAttendeeId: newAttendeeId };
    }
    var rows = sel.data || [];
    if (!rows.length) {
      _log('transferOpenCreditOnRegistration: no eligible credit_pending for lead=' + leadId);
      return { transferred: false, oldAttendeeId: null, newAttendeeId: newAttendeeId };
    }
    var oldId = rows[0].id;
    var rpc = await sb.rpc('transfer_credit_to_new_attendee', {
      p_old_attendee_id: oldId,
      p_new_attendee_id: newAttendeeId
    });
    if (rpc.error) {
      _log('transfer_credit_to_new_attendee error:', rpc.error.message);
      return { transferred: false, oldAttendeeId: oldId, newAttendeeId: newAttendeeId, error: rpc.error.message };
    }
    _log('transferOpenCreditOnRegistration: lead=' + leadId + ' old=' + oldId + ' new=' + newAttendeeId);
    _refreshBell();
    return { transferred: true, oldAttendeeId: oldId, newAttendeeId: newAttendeeId };
  }

  window.CrmPaymentAutomation = {
    markUnpaidForCompletedEvent: markUnpaidForCompletedEvent,
    transferOpenCreditOnRegistration: transferOpenCreditOnRegistration
  };
})();
