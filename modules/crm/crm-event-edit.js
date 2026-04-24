/* =============================================================================
   crm-event-edit.js — UI: Edit Event modal (OVERNIGHT_M4_SCALE_AND_UI Phase 9).
   Opens from the event-detail modal header "ערוך" button. Form covers every
   creation field EXCEPT status (status is owned by "שנה סטטוס" elsewhere).
   Writes UPDATE with tenant_id filter (Rule 22 defense-in-depth). Emits
   ActivityLog on success.
   Load order: after shared.js, crm-helpers.js, Modal.
   Exports: window.CrmEventEdit.open(event, onUpdated).
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return typeof getTenantId === 'function' ? getTenantId() : null; }

  function renderForm(ev) {
    var inp = 'flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm';
    var lbl = 'block text-sm font-medium text-slate-700 mb-1';
    return '<form id="crm-edit-event-form" class="space-y-3">' +
      '<div><label class="' + lbl + '">שם</label><input name="name" class="' + inp + ' w-full" value="' + escapeHtml(ev.name || '') + '" required></div>' +
      '<div class="flex gap-3">' +
        '<div class="flex-1"><label class="' + lbl + '">תאריך</label><input type="date" name="event_date" class="' + inp + ' w-full" value="' + escapeHtml(ev.event_date || '') + '" required></div>' +
        '<div class="flex-1"><label class="' + lbl + '">שעת התחלה</label><input type="time" name="start_time" class="' + inp + ' w-full" value="' + escapeHtml((ev.start_time || '').slice(0, 5)) + '"></div>' +
        '<div class="flex-1"><label class="' + lbl + '">שעת סיום</label><input type="time" name="end_time" class="' + inp + ' w-full" value="' + escapeHtml((ev.end_time || '').slice(0, 5)) + '"></div>' +
      '</div>' +
      '<div><label class="' + lbl + '">כתובת</label><input name="location_address" class="' + inp + ' w-full" value="' + escapeHtml(ev.location_address || '') + '" required></div>' +
      '<div><label class="' + lbl + '">Waze URL</label><input name="location_waze_url" class="' + inp + ' w-full" value="' + escapeHtml(ev.location_waze_url || '') + '"></div>' +
      '<div class="flex gap-3">' +
        '<div class="flex-1"><label class="' + lbl + '">נרשמים מקס׳</label><input type="number" name="max_capacity" class="' + inp + ' w-full" value="' + (ev.max_capacity || 50) + '" min="0" required></div>' +
        '<div class="flex-1"><label class="' + lbl + '">קופונים מקס׳</label><input type="number" name="max_coupons" class="' + inp + ' w-full" value="' + (ev.max_coupons || 50) + '" min="0"></div>' +
        '<div class="flex-1"><label class="' + lbl + '">קופונים נוספים</label><input type="number" name="extra_coupons" class="' + inp + ' w-full" value="' + (ev.extra_coupons || 0) + '" min="0"></div>' +
        '<div class="flex-1"><label class="' + lbl + '">דמי הזמנה</label><input type="number" step="0.01" name="booking_fee" class="' + inp + ' w-full" value="' + (ev.booking_fee || 50) + '"></div>' +
      '</div>' +
      '<div><label class="' + lbl + '">קוד קופון</label><input name="coupon_code" class="' + inp + ' w-full" value="' + escapeHtml(ev.coupon_code || '') + '" required></div>' +
      '<div><label class="' + lbl + '">קישור טופס הרשמה (אופציונלי)</label><input name="registration_form_url" class="' + inp + ' w-full" value="' + escapeHtml(ev.registration_form_url || '') + '"></div>' +
      '<div><label class="' + lbl + '">הערות</label><textarea name="notes" class="' + inp + ' w-full" rows="2">' + escapeHtml(ev.notes || '') + '</textarea></div>' +
      '<div id="crm-edit-event-error" class="hidden text-rose-600 text-sm"></div>' +
    '</form>';
  }

  async function open(event, onUpdated) {
    if (typeof Modal === 'undefined' || !event || !event.id) return;
    var footerHtml =
      '<button id="crm-edit-event-submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition">שמור</button>' +
      '<button id="crm-edit-event-cancel" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg">ביטול</button>';
    var modal = Modal.show({
      title: 'עריכת אירוע' + (event.event_number ? ' #' + event.event_number : ''),
      size: 'md', content: renderForm(event), footer: footerHtml
    });
    var body = modal.el.querySelector('.modal-body');
    var footer = modal.el.querySelector('.modal-footer');
    footer.querySelector('#crm-edit-event-cancel').addEventListener('click', function () { if (modal.close) modal.close(); });
    footer.querySelector('#crm-edit-event-submit').addEventListener('click', async function () {
      var form = body.querySelector('#crm-edit-event-form');
      var errBox = body.querySelector('#crm-edit-event-error');
      errBox.classList.add('hidden');
      var fd = new FormData(form);
      var patch = {
        name: (fd.get('name') || '').trim(),
        event_date: fd.get('event_date') || null,
        start_time: fd.get('start_time') || null,
        end_time: fd.get('end_time') || null,
        location_address: (fd.get('location_address') || '').trim(),
        location_waze_url: (fd.get('location_waze_url') || '').trim() || null,
        max_capacity: parseInt(fd.get('max_capacity'), 10),
        max_coupons: parseInt(fd.get('max_coupons'), 10) || null,
        extra_coupons: parseInt(fd.get('extra_coupons'), 10) || 0,
        booking_fee: parseFloat(fd.get('booking_fee')) || 0,
        coupon_code: (fd.get('coupon_code') || '').trim(),
        registration_form_url: (fd.get('registration_form_url') || '').trim() || null,
        notes: (fd.get('notes') || '').trim() || null
      };
      if (!patch.name || !patch.event_date || !patch.location_address || !patch.coupon_code) {
        errBox.textContent = 'שדות חובה חסרים'; errBox.classList.remove('hidden'); return;
      }
      var tenantId = tid();
      if (!tenantId) { errBox.textContent = 'לא זוהה tenant'; errBox.classList.remove('hidden'); return; }
      footer.querySelector('#crm-edit-event-submit').disabled = true;
      var res = await sb.from('crm_events').update(patch).eq('id', event.id).eq('tenant_id', tenantId).select('*').single();
      if (res.error) {
        errBox.textContent = 'שגיאה: ' + res.error.message; errBox.classList.remove('hidden');
        footer.querySelector('#crm-edit-event-submit').disabled = false; return;
      }
      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.event.update', entity_type: 'crm_events', entity_id: event.id, details: { name: patch.name } }); } catch (_) {}
      if (window.Toast) Toast.success('האירוע עודכן');
      if (modal.close) modal.close();
      if (typeof onUpdated === 'function') onUpdated(res.data);
    });
  }

  window.CrmEventEdit = { open: open };
})();
