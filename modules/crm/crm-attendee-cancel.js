/* =============================================================================
   crm-attendee-cancel.js — Attendee cancellation dialog (P23).
   Three paths chosen by payment_status:
     - 'paid'                          → 2-button choice modal: refund-due / no-refund-due
     - everything else (incl. unpaid)  → simple confirm modal
   Every UPDATE carries tenant_id (Rule 22). Logs via ActivityLog.
   Load order: after crm-payment-helpers.js, after Modal.
   Exports: window.CrmAttendeeCancel = { openCancelDialog, cancelButtonHtml }.
   ============================================================================= */
(function () {
  'use strict';

  function _cancelToast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }

  function _logCancel(action, attendeeId, metadata) {
    if (window.ActivityLog && ActivityLog.write) {
      try { ActivityLog.write({ action: action, entity_type: 'crm_event_attendees', entity_id: attendeeId, details: metadata || {} }); } catch (_) {}
    }
  }

  function _resolveTenantId() {
    if (window.CrmHelpers && typeof CrmHelpers.tid === 'function') return CrmHelpers.tid();
    return (typeof getTenantId === 'function') ? getTenantId() : null;
  }

  function cancelButtonHtml(attendee) {
    if (!attendee || attendee.status === 'cancelled') return '';
    return '<button type="button" class="text-xs text-rose-600 hover:text-rose-800 hover:underline ms-2 font-medium" data-cancel-attendee="' + escapeHtml(attendee.id) + '">בטל</button>';
  }

  async function openCancelDialog(attendeeId, opts) {
    opts = opts || {};
    if (typeof Modal === 'undefined') { _cancelToast('error', 'Modal לא זמין'); return; }
    var tenantId = _resolveTenantId();
    if (!tenantId) { _cancelToast('error', 'לא זוהה tenant'); return; }

    var fetchRes = await sb.from('v_crm_event_attendees_full')
      .select('id, full_name, status, payment_status, no_refund_due_marked')
      .eq('id', attendeeId).eq('tenant_id', tenantId).single();
    if (fetchRes.error || !fetchRes.data) {
      _cancelToast('error', 'לא נמצא רישום: ' + (fetchRes.error ? fetchRes.error.message : 'unknown'));
      return;
    }
    var attendee = fetchRes.data;
    if (attendee.status === 'cancelled') {
      _cancelToast('warning', 'הרישום כבר בוטל');
      return;
    }

    if (attendee.payment_status === 'paid') {
      _openPaidChoiceDialog(attendee, tenantId, opts);
    } else {
      _openSimpleConfirmDialog(attendee, tenantId, opts);
    }
  }

  function _openSimpleConfirmDialog(attendee, tenantId, opts) {
    var content = '<div class="py-4 text-center">' +
      '<div class="text-base font-semibold text-slate-800 mb-2">האם לבטל את ההרשמה?</div>' +
      '<div class="text-sm text-slate-600">' + escapeHtml(attendee.full_name || '') + '</div>' +
      '</div>';
    var footerHtml =
      '<button type="button" id="crm-cancel-confirm" class="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-sm">אשר</button>' +
      '<button type="button" id="crm-cancel-back" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition">ביטול</button>';
    var modal = Modal.show({ title: 'ביטול רישום', size: 'sm', content: content, footer: footerHtml });
    var footer = modal.el.querySelector('.modal-footer');
    footer.querySelector('#crm-cancel-back').addEventListener('click', function () { if (modal.close) modal.close(); });
    footer.querySelector('#crm-cancel-confirm').addEventListener('click', async function () {
      var btn = footer.querySelector('#crm-cancel-confirm');
      btn.disabled = true; btn.textContent = '...';
      var nowIso = new Date().toISOString();
      var upd = await sb.from('crm_event_attendees')
        .update({ status: 'cancelled', cancelled_at: nowIso })
        .eq('id', attendee.id).eq('tenant_id', tenantId);
      if (upd.error) {
        btn.disabled = false; btn.textContent = 'אשר';
        _cancelToast('error', 'הביטול נכשל: ' + upd.error.message);
        return;
      }
      _logCancel('crm.attendee.cancel', attendee.id, { from_status: attendee.status, payment_status: attendee.payment_status, path: 'simple' });
      _cancelToast('success', 'הרישום בוטל');
      if (modal.close) modal.close();
      if (typeof opts.onAfterCancel === 'function') opts.onAfterCancel(attendee.id);
    });
  }

  function _openPaidChoiceDialog(attendee, tenantId, opts) {
    var content = '<div class="py-4 text-center">' +
      '<div class="text-base font-semibold text-slate-800 mb-2">ביטול רישום משולם</div>' +
      '<div class="text-sm text-slate-600 mb-3">' + escapeHtml(attendee.full_name || '') + '</div>' +
      '<div class="text-sm text-slate-700">בחר/י את אופן הביטול:</div>' +
      '</div>';
    var footerHtml =
      '<button type="button" id="crm-cancel-refund" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition shadow-sm">מגיע החזר</button>' +
      '<button type="button" id="crm-cancel-noref" class="px-5 py-2 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg transition shadow-sm">לא מגיע החזר</button>' +
      '<button type="button" id="crm-cancel-back" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition">חזרה</button>';
    var modal = Modal.show({ title: 'ביטול רישום משולם', size: 'sm', content: content, footer: footerHtml });
    var footer = modal.el.querySelector('.modal-footer');
    footer.querySelector('#crm-cancel-back').addEventListener('click', function () { if (modal.close) modal.close(); });

    footer.querySelector('#crm-cancel-refund').addEventListener('click', async function () {
      var btn = footer.querySelector('#crm-cancel-refund');
      btn.disabled = true;
      var nowIso = new Date().toISOString();
      var upd = await sb.from('crm_event_attendees')
        .update({ status: 'cancelled', cancelled_at: nowIso, payment_status: 'refund_requested', refund_requested_at: nowIso })
        .eq('id', attendee.id).eq('tenant_id', tenantId);
      if (upd.error) {
        btn.disabled = false;
        _cancelToast('error', 'הביטול נכשל: ' + upd.error.message);
        return;
      }
      _logCancel('crm.attendee.cancel', attendee.id, { from_status: attendee.status, payment_status: attendee.payment_status, path: 'paid_refund_due' });
      _cancelToast('success', 'הרישום בוטל וההחזר מתבקש');
      if (modal.close) modal.close();
      if (typeof opts.onAfterCancel === 'function') opts.onAfterCancel(attendee.id);
    });

    footer.querySelector('#crm-cancel-noref').addEventListener('click', async function () {
      var btn = footer.querySelector('#crm-cancel-noref');
      btn.disabled = true;
      var upd = await sb.from('crm_event_attendees')
        .update({ no_refund_due_marked: true, no_refund_due_marked_at: new Date().toISOString() })
        .eq('id', attendee.id).eq('tenant_id', tenantId);
      if (upd.error) {
        btn.disabled = false;
        _cancelToast('error', 'העדכון נכשל: ' + upd.error.message);
        return;
      }
      _logCancel('crm.attendee.mark_no_refund_due_flag', attendee.id, { from_status: attendee.status, payment_status: attendee.payment_status, path: 'paid_no_refund_due' });
      _cancelToast('success', 'סומן: לא מגיע החזר');
      if (modal.close) modal.close();
      if (typeof opts.onAfterCancel === 'function') opts.onAfterCancel(attendee.id);
    });
  }

  window.CrmAttendeeCancel = {
    openCancelDialog: openCancelDialog,
    cancelButtonHtml: cancelButtonHtml
  };
})();
