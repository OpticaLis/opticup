/* =============================================================================
   crm-event-day-coupon.js — coupon-cell renderer + dispatch handler for the
   Event Day "ניהול" sub-tab. Extracted from crm-event-day-manage.js (P23 Step 0)
   to keep the manage file under the 350-line cap and to give the lifecycle-guard
   logic (added in P23 commit 0.5) a focused home.
   Load order: after crm-helpers.js, crm-payment-helpers.js, crm-coupon-dispatch.js,
   BEFORE crm-event-day-manage.js (which delegates to this module).
   Exports: window.CrmEventDayCoupon = { couponCell, toggleCoupon }.
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TOGGLE_OFF = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';

  // Statuses where manual coupon dispatch is allowed (event + attendee).
  // Coupons are physically valid for the event, so we only allow
  // dispatch while the event is in a "live" lifecycle and the attendee
  // is in a state that earned a coupon (not cancelled / waitlist / etc.).
  var COUPON_ALLOWED_EVENT_STATUSES = [
    'registration_open', 'invite_new', 'waiting_list',
    '2_3d_before', 'event_day', 'invite_waiting_list'
  ];
  var COUPON_ALLOWED_ATTENDEE_STATUSES = [
    'registered', 'quick_registration', 'manual_registration',
    'confirmed', 'attended', 'invited'
  ];

  function couponToast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }

  function couponLog(action, entityId, metadata) {
    if (window.ActivityLog && ActivityLog.write) {
      try { ActivityLog.write({ action: action, entity_type: 'crm_event_attendees', entity_id: entityId, severity: 'info', metadata: Object.assign({ event_id: window.getEventDayState().eventId }, metadata || {}) }); } catch (_) {}
    }
  }

  function couponCell(r, ctx) {
    if (!r.coupon_sent) return '<button type="button" class="' + CLS_TOGGLE_OFF + '" data-toggle-coupon="' + escapeHtml(r.id) + '">שלח</button>';
    if (r.checked_in_at) return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ הגיע</span>';
    var ev = window.getEventDayState().event;
    if (window.CrmPayment && CrmPayment.eventEnded(ev)) return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⚠️ לא הגיע</span>';
    return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">📨 נשלח</span>';
  }

  async function toggleCoupon(id, btn, ctx) {
    ctx = ctx || {};
    var state = window.getEventDayState();
    var ev = state.event || {};
    var attendees = state.attendees || [];
    var target = attendees.find(function (a) { return a.id === id; });
    if (!target) return;

    // Lifecycle guards — block dispatch when event or attendee is in a
    // status where sending a coupon doesn't make business sense.
    if (COUPON_ALLOWED_EVENT_STATUSES.indexOf(ev.status) === -1) {
      var evLabel = (window.CrmHelpers && CrmHelpers.getStatusInfo)
        ? (CrmHelpers.getStatusInfo('event', ev.status).label || ev.status)
        : ev.status;
      couponToast('error', 'לא ניתן לשלוח קופון בסטטוס אירוע "' + evLabel + '".');
      return;
    }
    if (COUPON_ALLOWED_ATTENDEE_STATUSES.indexOf(target.status) === -1) {
      var atLabel = (window.CrmHelpers && CrmHelpers.getStatusInfo)
        ? (CrmHelpers.getStatusInfo('attendee', target.status).label || target.status)
        : target.status;
      couponToast('error', 'לא ניתן לשלוח קופון למשתתף בסטטוס "' + atLabel + '".');
      return;
    }

    // Defensive re-send guard. UI hides the "שלח" button once coupon_sent=true
    // (see couponCell), so this path is not reachable from the rendered table
    // today; it protects programmatic callers and any future re-send button.
    if (target.coupon_sent) {
      var when = target.coupon_sent_at ? new Date(target.coupon_sent_at).toLocaleString('he-IL') : '—';
      if (!confirm('הקופון כבר נשלח ב-' + when + '. לשלוח שוב?')) return;
    } else {
      var totalSent = attendees.filter(function (a) { return a.coupon_sent && a.status !== 'cancelled'; }).length;
      var ceiling = (ev.max_coupons != null ? +ev.max_coupons : 50) + (+ev.extra_coupons || 0);
      if (totalSent >= ceiling) {
        couponToast('error', 'הגעת למכסת הקופונים (' + ceiling + '). הגדל כמות קופונים נוספת אם יש צורך.');
        return;
      }
    }

    if (!ev.coupon_code) {
      couponToast('error', 'לאירוע לא הוגדר קוד קופון. הגדר קוד קופון לאירוע לפני השליחה.');
      return;
    }
    if (!window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') {
      couponToast('error', 'CrmMessaging אינו זמין');
      return;
    }
    if (!target.phone && !target.email) {
      couponToast('error', 'למשתתף חסרים טלפון ואימייל — לא ניתן לשלוח קופון.');
      return;
    }

    if (!window.CrmCouponDispatch || typeof CrmCouponDispatch.dispatch !== 'function') {
      couponToast('error', 'CrmCouponDispatch אינו זמין');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    var dispatch = await CrmCouponDispatch.dispatch(target, ev);
    if (!dispatch.anyOk) {
      if (btn) { btn.disabled = false; btn.textContent = 'שלח'; }
      couponToast('error', 'שליחה נכשלה: SMS ' + (dispatch.smsError || '—') + ' | Email ' + (dispatch.emailError || '—'));
      return;
    }

    // Flag update happens AFTER at least one channel succeeds — never before.
    // P24: when current payment_status is 'pending_payment', the same UPDATE also
    // sets payment_status='paid' + paid_at=nowIso atomically (send-coupon = paid
    // confirmed, business-flow alignment). For any other status (paid, credit_used,
    // refund_requested, etc.) the payment fields are NOT overwritten — the patch
    // object only carries coupon_sent/coupon_sent_at.
    var nowIso = new Date().toISOString();
    var paidFlipped = (target.payment_status === 'pending_payment');
    var patch = paidFlipped
      ? { coupon_sent: true, coupon_sent_at: nowIso, payment_status: 'paid', paid_at: nowIso }
      : { coupon_sent: true, coupon_sent_at: nowIso };
    var { error } = await sb.from('crm_event_attendees')
      .update(patch)
      .eq('id', id).eq('tenant_id', getTenantId());
    if (error) {
      couponToast('warning', 'נשלח, אך שמירת דגל נכשלה: ' + error.message);
      if (btn) { btn.disabled = false; }
      return;
    }
    couponLog('crm.attendee.coupon_sent', id, {
      sms_ok: dispatch.smsOk, email_ok: dispatch.emailOk,
      sms_log_id: dispatch.smsLogId, email_log_id: dispatch.emailLogId,
      payment_status_after: paidFlipped ? 'paid' : target.payment_status,
      paid_at_changed: paidFlipped
    });
    if (typeof ctx.updateLocal === 'function') ctx.updateLocal(id, patch);
    couponToast(dispatch.allOk ? 'success' : 'warning', 'הקופון נשלח: ' + dispatch.summary);
    if (window.CrmCouponDispatch && typeof CrmCouponDispatch.checkAndAutoClose === 'function') {
      try {
        var ac = await CrmCouponDispatch.checkAndAutoClose(ev);
        if (ac && ac.closed) { ev.status = 'closed'; couponToast('success', 'האירוע עבר ל"נסגר" — כל הקופונים הונפקו'); }
      } catch (e) { console.error('autoClose:', e); }
    }
    if (typeof ctx.renderTable === 'function') ctx.renderTable();
  }

  window.CrmEventDayCoupon = {
    couponCell: couponCell,
    toggleCoupon: toggleCoupon
  };
})();
