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

  window.CrmCouponDispatch = window.CrmCouponDispatch || {};
  window.CrmCouponDispatch.dispatch = dispatch;
})();
