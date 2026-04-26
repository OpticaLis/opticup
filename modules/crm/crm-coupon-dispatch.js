/* =============================================================================
   crm-coupon-dispatch.js — Coupon delivery dispatcher (COUPON_SEND_WIRING)
   Extracted from crm-event-day-manage.js to keep that file under Rule 12 cap.
   Dispatches the event_coupon_delivery template on both channels (SMS + Email)
   and returns a structured result the caller uses to decide UI state + DB flag.
   Load order: AFTER crm-messaging-send.js, AFTER crm-helpers.js.
   Exports: window.CrmCouponDispatch.dispatch(attendee, event).
   ============================================================================= */
(function () {
  'use strict';

  async function dispatch(attendee, event) {
    var dateStr = (window.CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(event.event_date) : (event.event_date || '');
    var startT = (event.start_time || '').slice(0, 5);
    var endT = (event.end_time || '').slice(0, 5);
    var timeStr = (startT && endT) ? (startT + ' - ' + endT) : (startT || endT || '');

    var variables = {
      name: attendee.full_name || '',
      phone: attendee.phone || '',
      email: attendee.email || '',
      event_name: event.name || '',
      event_date: dateStr,
      event_time: timeStr,
      coupon_code: event.coupon_code || '',
      lead_id: attendee.lead_id || ''
    };

    var smsResult = { ok: false, error: null, logId: null };
    var emailResult = { ok: false, error: null, logId: null };
    var commonOpts = {
      leadId: attendee.lead_id,
      eventId: event.id,
      templateSlug: 'event_coupon_delivery',
      variables: variables
    };

    if (attendee.phone) {
      smsResult = await CrmMessaging.sendMessage(Object.assign({}, commonOpts, { channel: 'sms' }));
    }
    if (attendee.email) {
      emailResult = await CrmMessaging.sendMessage(Object.assign({}, commonOpts, { channel: 'email' }));
    }

    var smsPart = attendee.phone ? (smsResult.ok ? 'SMS ✓' : 'SMS ✗') : 'SMS —';
    var emailPart = attendee.email ? (emailResult.ok ? 'Email ✓' : 'Email ✗') : 'Email —';
    var allOk = (!attendee.phone || smsResult.ok) && (!attendee.email || emailResult.ok);
    var anyOk = smsResult.ok || emailResult.ok;

    return {
      anyOk: anyOk, allOk: allOk,
      smsOk: smsResult.ok, emailOk: emailResult.ok,
      smsError: smsResult.error, emailError: emailResult.error,
      smsLogId: smsResult.logId, emailLogId: emailResult.logId,
      summary: smsPart + ' | ' + emailPart
    };
  }

  // COUPON_CAP_AUTO_CLOSE (2026-04-24): after a coupon is successfully sent,
  // the caller invokes this to check whether the event has hit its coupon
  // ceiling. If yes, delegates to CrmEventActions.changeEventStatus — which
  // both UPDATEs crm_events.status='closed' AND fires the event_closed
  // automation rule via CrmAutomation.evaluate. SPEC requirement: NULL
  // max_coupons OR extra_coupons means "no cap" and returns { closed:false }.
  async function checkAndAutoClose(event) {
    if (!event || !event.id) return { closed: false };
    if (event.max_coupons == null || event.extra_coupons == null) return { closed: false, reason: 'no_cap' };
    if (event.status === 'closed' || event.status === 'completed') return { closed: false, reason: 'already_terminal' };
    var tenantId = typeof getTenantId === 'function' ? getTenantId() : null;
    if (!tenantId) return { closed: false, reason: 'no_tenant' };
    var cap = (+event.max_coupons || 0) + (+event.extra_coupons || 0);
    if (cap <= 0) return { closed: false, reason: 'ceiling_zero' };
    var cRes = await sb.from('crm_event_attendees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('event_id', event.id)
      .eq('coupon_sent', true)
      .eq('is_deleted', false)
      .neq('status', 'cancelled');
    if (cRes.error) { console.error('checkAndAutoClose count:', cRes.error); return { closed: false, error: cRes.error.message }; }
    var sent = cRes.count || 0;
    if (sent < cap) return { closed: false, sent: sent, ceiling: cap };
    if (!window.CrmEventActions || typeof CrmEventActions.changeEventStatus !== 'function') {
      console.error('checkAndAutoClose: CrmEventActions.changeEventStatus unavailable');
      return { closed: false, sent: sent, ceiling: cap, error: 'CrmEventActions_unavailable' };
    }
    try {
      await CrmEventActions.changeEventStatus(event.id, 'closed');
      return { closed: true, sent: sent, ceiling: cap };
    } catch (e) {
      console.error('checkAndAutoClose changeEventStatus:', e);
      return { closed: false, sent: sent, ceiling: cap, error: e.message || String(e) };
    }
  }

  window.CrmCouponDispatch = window.CrmCouponDispatch || {};
  window.CrmCouponDispatch.dispatch = dispatch;
  window.CrmCouponDispatch.checkAndAutoClose = checkAndAutoClose;
})();
