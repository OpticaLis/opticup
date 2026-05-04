/* =============================================================================
   crm-attendee-move.js — Manual attendee-move dialog (P5_V2_REBUILD_RUNG3_FEATURES).
   Opens from the events-detail attendees table row OR from the leads-tab row
   action when a Tier-2 lead has status='waitlist' or 'invited'.
   Uses Modal + Toast. Calls move_attendee_between_events RPC. When the
   "שלח עדכון ללקוח" toggle is ON, fires CrmAutomation.evaluate('attendee_moved')
   which dispatches Rule 2.7 (UNPAID/PAID branch based on payment_status).
   Public-form auto-move (different code path: register_lead_to_event RPC) is
   silent — no toggle, no rule fire.
   Load order: AFTER crm-automation-engine.js. Exports CrmAttendeeMove.open.
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  async function loadSrc(attendeeId) {
    var r = await sb.from('crm_event_attendees')
      .select('id, event_id, lead_id, status, payment_status, crm_leads(full_name), crm_events(name, booking_fee, max_capacity)')
      .eq('id', attendeeId).single();
    return r.data;
  }

  async function loadTargets(srcEventId) {
    var tenantId = tid();
    var r = await sb.from('crm_events')
      .select('id, name, event_date, booking_fee, max_capacity')
      .eq('tenant_id', tenantId)
      .in('status', ['registration_open','waiting_list'])
      .neq('id', srcEventId)
      .eq('is_deleted', false)
      .order('event_date', { ascending: true })
      .limit(50);
    return r.data || [];
  }

  function buildBody(src, tgts) {
    var lead = src.crm_leads || {};
    var srcEv = src.crm_events || {};
    if (!tgts.length) {
      return '<p class="text-slate-700 mb-2">אין אירועים זמינים להעברה (פתוחים להרשמה).</p>';
    }
    var opts = tgts.map(function (t) {
      var d = (window.CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(t.event_date) : t.event_date;
      var feeWarn = (Number(t.booking_fee) !== Number(srcEv.booking_fee)) ? ' [דמי רישום: ' + Math.round(t.booking_fee) + ' ₪]' : '';
      return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name + ' — ' + d + feeWarn) + '</option>';
    }).join('');
    return '' +
      '<div class="space-y-3">' +
        '<div class="text-sm text-slate-600">' +
          '<div><span class="font-semibold">משתתף:</span> ' + escapeHtml(lead.full_name || '') + '</div>' +
          '<div><span class="font-semibold">אירוע מקור:</span> ' + escapeHtml(srcEv.name || '') + '</div>' +
          '<div><span class="font-semibold">סטטוס תשלום:</span> ' + escapeHtml(src.payment_status || '') + '</div>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">אירוע יעד</label>' +
          '<select id="cam-target" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">' + opts + '</select>' +
        '</div>' +
        '<label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">' +
          '<input type="checkbox" id="cam-notify" class="w-4 h-4">' +
          '<span>שלח עדכון ללקוח (הודעה אוטומטית)</span>' +
        '</label>' +
        '<div class="text-xs text-slate-500">דמי רישום שונים לא יחויבו אוטומטית — יש לטפל ידנית במסך התשלומים.</div>' +
      '</div>';
  }

  async function open(attendeeId, ctx) {
    var tenantId = tid();
    if (!tenantId) { if (window.Toast) Toast.error('No tenant'); return; }
    var src = await loadSrc(attendeeId);
    if (!src) { if (window.Toast) Toast.error('משתתף לא נמצא'); return; }
    var tgts = await loadTargets(src.event_id);
    var bodyHtml = buildBody(src, tgts);

    var footerHtml =
      '<button type="button" id="cam-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">ביטול</button>' +
      '<button type="button" id="cam-confirm" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"' + (tgts.length ? '' : ' disabled') + '>העבר</button>';
    var modal = Modal.show({ title: 'העברת משתתף לאירוע אחר', size: 'md', content: bodyHtml, footer: footerHtml });
    var el = modal.el;

    el.querySelector('#cam-cancel').addEventListener('click', function () {
      if (typeof modal.close === 'function') modal.close();
    });
    var confirmBtn = el.querySelector('#cam-confirm');
    if (!tgts.length || !confirmBtn) return;
    confirmBtn.addEventListener('click', async function () {
      confirmBtn.disabled = true;
      var targetId = el.querySelector('#cam-target').value;
      var sendNotif = !!el.querySelector('#cam-notify').checked;
      var r = await sb.rpc('move_attendee_between_events', { p_attendee_id: attendeeId, p_target_event_id: targetId });
      if (r.error || !r.data || !r.data.ok) {
        if (window.Toast) Toast.error('העברה נכשלה: ' + ((r.error && r.error.message) || (r.data && r.data.error) || 'unknown'));
        confirmBtn.disabled = false;
        return;
      }
      var feeWarn = r.data.fee_mismatch ? ' (אזהרה: דמי רישום שונים — לטפל ידנית)' : '';
      if (window.Toast) Toast.success('המשתתף הועבר בהצלחה' + feeWarn);
      // ATOMIC_CONFIRMATION_FLOW B.3: defer modal-close + parent reload until
      // AFTER the confirmation modal resolves. ctx.onAfter is reloadDetail
      // (events-detail caller) which calls the global Modal.close() — without
      // this defer it pops the confirmation modal off the stack mid-flight.
      var doFinalCleanup = async function () {
        if (typeof modal.close === 'function') modal.close();
        if (ctx && typeof ctx.onAfter === 'function') {
          try { await ctx.onAfter(); } catch (_) {}
        }
      };
      if (sendNotif && window.CrmAutomationClient && CrmAutomationClient.evaluate) {
        var paid = (r.data.payment_status === 'paid');
        try {
          var evalRes = await CrmAutomationClient.evaluate('attendee_moved', {
            attendeeId: r.data.new_attendee_id,
            leadId:     r.data.lead_id,
            eventId:    r.data.target_event_id,
            sourceEventId: r.data.source_event_id,
            paymentStatus: r.data.payment_status,
            outcome: paid ? 'paid' : 'unpaid',
            newStatus: paid ? 'paid' : 'unpaid'
          }, doFinalCleanup);
          if (evalRes && evalRes.pending_confirm) return; // cleanup deferred
        } catch (e) { console.warn('attendee_moved rule eval skipped:', e); }
      }
      await doFinalCleanup();
    });
  }

  window.CrmAttendeeMove = { open: open };
})();
