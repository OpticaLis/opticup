/* =============================================================================
   crm-event-day-checkin.js — Check-in sub-tab
   Search by name/phone, "כניסה" button → check_in_attendee RPC.
   Depends on: shared.js, CrmHelpers, crm-event-day.js (state + refresh)
   Exports: window.renderEventDayCheckin(hostEl)
   ============================================================================= */
(function () {
  'use strict';

  var _filter = '';

  function renderEventDayCheckin(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="crm-filter-bar">' +
        '<input type="search" id="crm-eventday-checkin-search" class="crm-search" placeholder="חיפוש לפי שם או טלפון..." value="' + escapeHtml(_filter) + '">' +
      '</div>' +
      '<div id="crm-eventday-checkin-table" class="crm-table-wrap"></div>';

    var input = document.getElementById('crm-eventday-checkin-search');
    if (input) {
      input.addEventListener('input', function () {
        _filter = input.value || '';
        renderTable();
      });
      if (_filter) input.focus();
    }
    renderTable();
  }
  window.renderEventDayCheckin = renderEventDayCheckin;

  function renderTable() {
    var wrap = document.getElementById('crm-eventday-checkin-table');
    if (!wrap) return;
    var state = window.getEventDayState();
    var rows = filterAttendees(state.attendees, _filter);

    if (!rows.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין משתתפים להצגה</div>';
      return;
    }

    var html = '<table class="crm-table"><thead><tr>' +
      '<th>שם</th><th>טלפון</th><th>זמן מתוזמן</th><th>סטטוס</th><th style="text-align:end">פעולה</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (r) {
      html += '<tr class="readonly">' +
        '<td>' + escapeHtml(r.full_name || '') + '</td>' +
        '<td style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td>' + escapeHtml(r.scheduled_time || '—') + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('attendee', r.status) + '</td>' +
        '<td style="text-align:end">' + actionCell(r) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('button[data-checkin-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-checkin-id');
        if (id) doCheckIn(id, btn);
      });
    });
  }

  function actionCell(r) {
    if (r.checked_in_at) {
      return '<span class="crm-eventday-checkin-done">✅ ' + escapeHtml(formatTime(r.checked_in_at)) + '</span>';
    }
    return '<button type="button" class="crm-eventday-checkin-btn" data-checkin-id="' + escapeHtml(r.id) + '">כניסה</button>';
  }

  function formatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function filterAttendees(all, needle) {
    var s = (needle || '').trim().toLowerCase();
    if (!s) return all;
    return (all || []).filter(function (r) {
      var name = (r.full_name || '').toLowerCase();
      var phone = (r.phone || '').toLowerCase();
      return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1;
    });
  }

  async function doCheckIn(attendeeId, btn) {
    if (!attendeeId) return;
    if (btn) { btn.disabled = true; btn.textContent = 'מכניס...'; }

    try {
      var res = await sb.rpc('check_in_attendee', {
        p_tenant_id: getTenantId(),
        p_attendee_id: attendeeId
      });

      if (res.error) throw new Error(res.error.message);
      var payload = res.data || {};

      if (payload.success) {
        logActivity('crm.attendee.checked_in', attendeeId, { event_id: window.getEventDayState().eventId });
        updateLocalAttendee(attendeeId, { checked_in_at: payload.checked_in_at, status: 'attended' });
        if (typeof window.refreshEventDayStats === 'function') await window.refreshEventDayStats();
        renderTable();
        toast('success', '✅ הכניסה נרשמה בהצלחה');
      } else if (payload.error === 'already_checked_in') {
        updateLocalAttendee(attendeeId, { checked_in_at: payload.checked_in_at });
        renderTable();
        toast('warning', 'המשתתף כבר נכנס ב-' + formatTime(payload.checked_in_at));
      } else if (payload.error === 'attendee_not_found') {
        toast('error', 'המשתתף לא נמצא');
      } else {
        toast('error', 'שגיאה: ' + (payload.error || 'unknown'));
      }
    } catch (e) {
      console.error('check-in failed:', e);
      toast('error', 'כשל בכניסה: ' + (e.message || String(e)));
      if (btn) { btn.disabled = false; btn.textContent = 'כניסה'; }
    }
  }

  function updateLocalAttendee(id, patch) {
    var state = window.getEventDayState();
    (state.attendees || []).forEach(function (a) {
      if (a.id === id) Object.assign(a, patch);
    });
  }

  function logActivity(action, entityId, metadata) {
    if (window.ActivityLog && typeof ActivityLog.write === 'function') {
      try {
        ActivityLog.write({
          action: action,
          entity_type: 'crm_event_attendees',
          entity_id: entityId,
          severity: 'info',
          metadata: metadata || {}
        });
      } catch (_) { /* non-blocking */ }
    }
  }

  function toast(type, msg) {
    if (window.Toast && typeof Toast[type] === 'function') Toast[type](msg);
    else if (window.Toast && typeof Toast.show === 'function') Toast.show(msg);
    else console.log('[' + type + ']', msg);
  }
})();
