/* =============================================================================
   crm-event-day-schedule.js — Scheduled times sub-tab
   Groups attendees by scheduled_time; chips are clickable to check-in.
   Depends on: shared.js, CrmHelpers, crm-event-day.js (state + refresh)
   Exports: window.renderEventDaySchedule(hostEl)
   ============================================================================= */
(function () {
  'use strict';

  function renderEventDaySchedule(host) {
    if (!host) return;
    host.innerHTML = '<div id="crm-eventday-schedule-body"></div>';
    renderBoard();
  }
  window.renderEventDaySchedule = renderEventDaySchedule;

  function renderBoard() {
    var body = document.getElementById('crm-eventday-schedule-body');
    if (!body) return;
    var state = window.getEventDayState();
    var grouped = groupByScheduledTime(state.attendees);

    if (!grouped.length) {
      body.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין משתתפים להצגה</div>';
      return;
    }

    var html = '';
    grouped.forEach(function (g) {
      html += renderGroup(g);
    });
    body.innerHTML = html;

    body.querySelectorAll('.crm-eventday-chip[data-attendee-id]').forEach(function (chip) {
      if (chip.classList.contains('checked-in')) return;
      chip.addEventListener('click', function () {
        var id = chip.getAttribute('data-attendee-id');
        if (id) doCheckIn(id, chip);
      });
    });
  }

  function renderGroup(g) {
    var label = g.time
      ? '🕐 ' + escapeHtml(g.time)
      : '⚠️ ללא זמן מתוזמן';
    var attendedCount = g.rows.filter(function (r) { return !!r.checked_in_at; }).length;

    var chipsHtml = g.rows.map(function (r) {
      var cls = 'crm-eventday-chip' + (r.checked_in_at ? ' checked-in' : '');
      var icon = r.checked_in_at ? '✅' : '🔵';
      var timeTxt = r.checked_in_at ? ' (' + formatTime(r.checked_in_at) + ')' : '';
      var attr = r.checked_in_at ? '' : ' data-attendee-id="' + escapeHtml(r.id) + '"';
      var titleAttr = r.phone ? ' title="' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '"' : '';
      return '<button type="button" class="' + cls + '"' + attr + titleAttr + '>' +
        icon + ' ' + escapeHtml(r.full_name || '') + escapeHtml(timeTxt) +
      '</button>';
    }).join('');

    return '<div class="crm-eventday-schedule-group">' +
      '<div class="crm-eventday-schedule-header">' +
        label + ' (' + g.rows.length + ' משתתפים — ' + attendedCount + ' נכנסו)' +
      '</div>' +
      '<div class="crm-eventday-schedule-chips">' + chipsHtml + '</div>' +
    '</div>';
  }

  function groupByScheduledTime(all) {
    var map = new Map();
    (all || []).forEach(function (r) {
      var key = r.scheduled_time || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });

    var keys = Array.from(map.keys()).filter(function (k) { return k !== ''; }).sort();
    var groups = keys.map(function (k) { return { time: k, rows: sortWithinGroup(map.get(k)) }; });
    if (map.has('')) groups.push({ time: '', rows: sortWithinGroup(map.get('')) });
    return groups;
  }

  function sortWithinGroup(rows) {
    var checkedIn = rows.filter(function (r) { return !!r.checked_in_at; })
      .sort(function (a, b) { return String(a.checked_in_at).localeCompare(String(b.checked_in_at)); });
    var pending = rows.filter(function (r) { return !r.checked_in_at; })
      .sort(function (a, b) { return CrmHelpers.heCompare(a.full_name, b.full_name); });
    return checkedIn.concat(pending);
  }

  function formatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  async function doCheckIn(attendeeId, chip) {
    if (!attendeeId) return;
    var originalHtml = chip.innerHTML;
    chip.disabled = true;
    chip.innerHTML = '⏳ מכניס...';

    try {
      var res = await sb.rpc('check_in_attendee', {
        p_tenant_id: getTenantId(),
        p_attendee_id: attendeeId
      });
      if (res.error) throw new Error(res.error.message);
      var payload = res.data || {};

      if (payload.success) {
        logActivity('crm.attendee.checked_in', attendeeId, { event_id: window.getEventDayState().eventId, source: 'schedule_board' });
        updateLocalAttendee(attendeeId, { checked_in_at: payload.checked_in_at, status: 'attended' });
        if (typeof window.refreshEventDayStats === 'function') await window.refreshEventDayStats();
        renderBoard();
        toast('success', '✅ הכניסה נרשמה');
      } else if (payload.error === 'already_checked_in') {
        updateLocalAttendee(attendeeId, { checked_in_at: payload.checked_in_at });
        renderBoard();
        toast('warning', 'המשתתף כבר נכנס ב-' + formatTime(payload.checked_in_at));
      } else {
        chip.innerHTML = originalHtml;
        chip.disabled = false;
        toast('error', 'שגיאה: ' + (payload.error || 'unknown'));
      }
    } catch (e) {
      console.error('check-in failed:', e);
      chip.innerHTML = originalHtml;
      chip.disabled = false;
      toast('error', 'כשל בכניסה: ' + (e.message || String(e)));
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
