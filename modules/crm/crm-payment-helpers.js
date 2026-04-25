/* crm-payment-helpers.js — payment-lifecycle UI helpers (M4_ATTENDEE_PAYMENT_UI).
   Public API: window.CrmPayment.{renderStatusPill, renderActionPanel, markPaid,
   markRefundRequested, markRefunded, openCredit, isRefundEligibleByTime,
   allowedActions, STATUS_COLORS, STATUS_LABELS}. Owns per-status pill rendering,
   transition matrix, 48h hard rule, and dispatch ordering (UPDATE first, then
   payment_received template via CrmMessaging.sendMessage). */
(function () {
  'use strict';

  var STATUS_COLORS = {
    pending_payment: 'sky',
    paid: 'emerald',
    unpaid: 'slate',
    refund_requested: 'amber',
    refunded: 'gray',
    credit_pending: 'violet',
    credit_used: 'slate'
  };
  var STATUS_LABELS = {
    pending_payment: 'ממתין לתשלום',
    paid: 'שולם',
    unpaid: 'לא שולם',
    refund_requested: 'מבוקש החזר',
    refunded: 'הוחזר',
    credit_pending: 'קרדיט פתוח',
    credit_used: 'קרדיט מומש'
  };
  var REFUND_TOOLTIP = 'עברו 48 שעות — לא ניתן לבטל ללא אישור מיוחד';

  function _esc(s) { return window.escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function _toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function _logActivity(a, id, meta) { if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: 'crm_event_attendee', entity_id: id, severity: 'info', metadata: meta || {} }); } catch (_) {} } }

  function renderStatusPill(status, opts) {
    var color = STATUS_COLORS[status] || 'slate';
    var label = STATUS_LABELS[status] || status || '—';
    var size = (opts && opts.size === 'lg') ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';
    return '<span class="inline-block rounded-full ' + size + ' font-semibold bg-' + color + '-100 text-' + color + '-700">' + _esc(label) + '</span>';
  }

  // Returns Date for event start, accounting for Israel timezone.
  // Heuristic: months 3-10 (Mar-Oct) → DST +03:00; else +02:00. Adequate for demo dates.
  function _eventStartDate(eventRow) {
    if (!eventRow || !eventRow.event_date) return null;
    var month = parseInt(String(eventRow.event_date).slice(5, 7), 10);
    var offset = (month >= 3 && month <= 10) ? '+03:00' : '+02:00';
    var startTime = '09:00';
    if (eventRow.event_time) {
      var m = String(eventRow.event_time).match(/(\d{1,2}):(\d{2})/);
      if (m) startTime = m[1].padStart(2, '0') + ':' + m[2];
    }
    return new Date(String(eventRow.event_date).slice(0, 10) + 'T' + startTime + ':00' + offset);
  }

  function isRefundEligibleByTime(eventRow) {
    var start = _eventStartDate(eventRow);
    if (!start || isNaN(start.getTime())) return true; // unknown event time → permissive (don't disable)
    var hoursUntil = (start.getTime() - Date.now()) / 3600000;
    return hoursUntil > 48;
  }

  function allowedActions(status, eventRow) {
    var refundable = isRefundEligibleByTime(eventRow);
    if (status === 'pending_payment') return refundable ? ['mark_paid', 'mark_refund_requested'] : ['mark_paid'];
    if (status === 'paid') return refundable ? ['mark_refund_requested'] : [];
    if (status === 'unpaid') return ['mark_paid_no_confirm'];
    if (status === 'refund_requested') return ['mark_refunded', 'open_credit'];
    return [];
  }

  function _renderInfoLine(attendeeRow) {
    if (attendeeRow.payment_status === 'credit_pending' && attendeeRow.credit_expires_at) {
      var exp = new Date(attendeeRow.credit_expires_at);
      var daysLeft = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
      return '<div class="text-xs text-violet-700 mt-2">💳 קרדיט פתוח עד ' + _esc(exp.toLocaleDateString('he-IL')) + ' (' + daysLeft + ' ימים שנותרו)</div>';
    }
    if (attendeeRow.payment_status === 'credit_used' && attendeeRow.credit_used_for_attendee_id) {
      return '<div class="text-xs text-slate-500 mt-2">💳 קרדיט מומש לאירוע אחר</div>';
    }
    return '';
  }

  function renderActionPanel(hostEl, attendeeRow, eventRow, callbacks) {
    if (!hostEl) return;
    callbacks = callbacks || {};
    var status = attendeeRow.payment_status || 'pending_payment';
    var actions = allowedActions(status, eventRow);
    var refundable = isRefundEligibleByTime(eventRow);
    var BTN = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition';
    var btns = [];
    if (actions.indexOf('mark_paid') !== -1) {
      btns.push('<button type="button" data-pay-action="mark_paid" class="' + BTN + ' bg-emerald-500 hover:bg-emerald-600 text-white">סמן שולם</button>' +
        '<label class="inline-flex items-center gap-1.5 text-xs text-slate-700 me-3 cursor-pointer"><input type="checkbox" data-pay-send-confirm checked class="rounded"> ושלח אישור ללקוח</label>');
    }
    if (actions.indexOf('mark_paid_no_confirm') !== -1) {
      btns.push('<button type="button" data-pay-action="mark_paid_no_confirm" class="' + BTN + ' bg-emerald-500 hover:bg-emerald-600 text-white">סמן שולם</button>');
    }
    if (status !== 'refund_requested' && (actions.indexOf('mark_refund_requested') !== -1 || (status === 'pending_payment' || status === 'paid'))) {
      var disabled = !refundable;
      var rcls = disabled ? (BTN + ' bg-slate-200 text-slate-500 cursor-not-allowed') : (BTN + ' bg-amber-500 hover:bg-amber-600 text-white');
      var attrs = disabled ? ' disabled title="' + _esc(REFUND_TOOLTIP) + '"' : ' data-pay-action="mark_refund_requested"';
      btns.push('<button type="button" class="' + rcls + '"' + attrs + '>מגיע החזר</button>');
    }
    if (actions.indexOf('mark_refunded') !== -1) {
      btns.push('<button type="button" data-pay-action="mark_refunded" class="' + BTN + ' bg-slate-500 hover:bg-slate-600 text-white">סמן הוחזר</button>');
    }
    if (actions.indexOf('open_credit') !== -1) {
      var defaultExp = new Date(); defaultExp.setMonth(defaultExp.getMonth() + 6);
      var defStr = defaultExp.toISOString().slice(0, 10);
      btns.push('<span class="inline-flex items-center gap-2"><label class="text-xs text-slate-600">קרדיט עד</label><input type="date" data-pay-credit-date value="' + defStr + '" class="px-2 py-1 border border-slate-300 rounded text-xs"><button type="button" data-pay-action="open_credit" class="' + BTN + ' bg-violet-500 hover:bg-violet-600 text-white">פתח קרדיט</button></span>');
    }
    var btnsHtml = btns.length ? btns.join(' ') : '<span class="text-sm text-slate-500">אין פעולות זמינות</span>';
    hostEl.innerHTML = '<div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3">' +
      '<div class="flex items-center justify-between mb-3"><h4 class="text-sm font-bold text-slate-800 m-0">ניהול תשלום</h4>' + renderStatusPill(status, { size: 'lg' }) + '</div>' +
      '<div class="flex flex-wrap items-center gap-2">' + btnsHtml + '</div>' +
      _renderInfoLine(attendeeRow) +
    '</div>';
    _wirePanel(hostEl, attendeeRow, callbacks);
  }

  function _wirePanel(hostEl, attendeeRow, callbacks) {
    hostEl.querySelectorAll('[data-pay-action]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var act = b.getAttribute('data-pay-action');
        b.disabled = true;
        try {
          if (act === 'mark_paid' || act === 'mark_paid_no_confirm') {
            var sendConfirm = false;
            if (act === 'mark_paid') {
              var cb = hostEl.querySelector('[data-pay-send-confirm]');
              sendConfirm = cb ? !!cb.checked : true;
            }
            await markPaid(attendeeRow.id, sendConfirm);
            _toast('success', sendConfirm ? 'שולם — אישור נשלח ללקוח' : 'שולם');
          } else if (act === 'mark_refund_requested') {
            await markRefundRequested(attendeeRow.id);
            _toast('success', 'מבוקש החזר');
          } else if (act === 'mark_refunded') {
            await markRefunded(attendeeRow.id);
            _toast('success', 'הוחזר');
          } else if (act === 'open_credit') {
            var dateInput = hostEl.querySelector('[data-pay-credit-date]');
            var expDate = dateInput ? dateInput.value : null;
            await openCredit(attendeeRow.id, expDate);
            _toast('success', 'קרדיט פתוח');
          }
          if (callbacks.onUpdate) callbacks.onUpdate();
          if (window.CrmNotificationsBell && CrmNotificationsBell.refresh) CrmNotificationsBell.refresh();
        } catch (e) {
          _toast('error', 'שגיאה: ' + (e.message || String(e)));
          b.disabled = false;
        }
      });
    });
  }

  // Mark paid: UPDATE first (Stop Trigger #8), then dispatch payment_received if requested.
  async function markPaid(attendeeId, sendConfirmation) {
    var tid = getTenantId();
    var nowIso = new Date().toISOString();
    var upd = await sb.from('crm_event_attendees').update({ payment_status: 'paid', paid_at: nowIso }).eq('id', attendeeId).eq('tenant_id', tid);
    if (upd.error) throw new Error(upd.error.message);
    _logActivity('crm.attendee.payment_marked_paid', attendeeId, { send_confirmation: !!sendConfirmation });
    if (sendConfirmation) {
      var att = await sb.from('crm_event_attendees').select('lead_id, event_id').eq('id', attendeeId).single();
      if (att.error || !att.data) return { ok: true, dispatched: false };
      var leadP = sb.from('crm_leads').select('full_name, phone, email').eq('id', att.data.lead_id).single();
      var evP = sb.from('crm_events').select('name, event_date, location_address').eq('id', att.data.event_id).single();
      var r = await Promise.all([leadP, evP]);
      var lead = r[0].data || {}, ev = r[1].data || {};
      var variables = { name: lead.full_name || '', phone: lead.phone || '', email: lead.email || '', event_name: ev.name || '', event_date: ev.event_date || '', event_location: ev.location_address || '' };
      if (window.CrmMessaging && CrmMessaging.sendMessage) {
        var commonOpts = { leadId: att.data.lead_id, eventId: att.data.event_id, templateSlug: 'payment_received', variables: variables };
        var dispatches = [];
        if (lead.phone) dispatches.push(CrmMessaging.sendMessage(Object.assign({}, commonOpts, { channel: 'sms' })));
        if (lead.email) dispatches.push(CrmMessaging.sendMessage(Object.assign({}, commonOpts, { channel: 'email' })));
        await Promise.allSettled(dispatches);
      }
    }
    return { ok: true };
  }

  async function markRefundRequested(attendeeId) {
    var tid = getTenantId();
    var nowIso = new Date().toISOString();
    var upd = await sb.from('crm_event_attendees').update({ payment_status: 'refund_requested', refund_requested_at: nowIso }).eq('id', attendeeId).eq('tenant_id', tid);
    if (upd.error) throw new Error(upd.error.message);
    _logActivity('crm.attendee.payment_refund_requested', attendeeId, {});
    return { ok: true };
  }

  async function markRefunded(attendeeId) {
    var tid = getTenantId();
    var nowIso = new Date().toISOString();
    var upd = await sb.from('crm_event_attendees').update({ payment_status: 'refunded', refunded_at: nowIso }).eq('id', attendeeId).eq('tenant_id', tid);
    if (upd.error) throw new Error(upd.error.message);
    _logActivity('crm.attendee.payment_refunded', attendeeId, {});
    return { ok: true };
  }

  async function openCredit(attendeeId, expiresAtDate) {
    var tid = getTenantId();
    if (!expiresAtDate) {
      var d = new Date(); d.setMonth(d.getMonth() + 6);
      expiresAtDate = d.toISOString().slice(0, 10);
    }
    var expiresIso = expiresAtDate.length === 10 ? (expiresAtDate + 'T23:59:59+03:00') : expiresAtDate;
    var upd = await sb.from('crm_event_attendees').update({ payment_status: 'credit_pending', credit_expires_at: expiresIso }).eq('id', attendeeId).eq('tenant_id', tid);
    if (upd.error) throw new Error(upd.error.message);
    _logActivity('crm.attendee.payment_credit_opened', attendeeId, { expires_at: expiresIso });
    return { ok: true };
  }

  window.CrmPayment = {
    renderStatusPill: renderStatusPill,
    renderActionPanel: renderActionPanel,
    markPaid: markPaid,
    markRefundRequested: markRefundRequested,
    markRefunded: markRefunded,
    openCredit: openCredit,
    isRefundEligibleByTime: isRefundEligibleByTime,
    allowedActions: allowedActions,
    STATUS_COLORS: STATUS_COLORS,
    STATUS_LABELS: STATUS_LABELS
  };
})();
