/* =============================================================================
   crm-event-day-schedule.js — Scheduled times board (B8 Tailwind — FINAL-05)
   Groups attendees by scheduled_time; clickable chips trigger check-in.
   ============================================================================= */
(function () {
  'use strict';

  var CLS_GROUP     = 'bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3';
  var CLS_GRP_HEAD  = 'font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-200 flex items-center gap-2';
  var CLS_CHIPS     = 'flex flex-wrap gap-2';
  var CLS_CHIP      = 'inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-800 hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer transition';
  var CLS_CHIP_DONE = 'inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 border border-emerald-300 rounded-full text-sm font-semibold text-emerald-800';

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
      body.innerHTML = '<div class="text-center text-slate-400 py-8">אין משתתפים להצגה</div>';
      return;
    }

    var html = '';
    grouped.forEach(function (g) { html += renderGroup(g); });
    body.innerHTML = html;

    body.querySelectorAll('[data-attendee-id]').forEach(function (chip) {
      if (chip.classList.contains('checked-in')) return;
      chip.addEventListener('click', function () {
        var id = chip.getAttribute('data-attendee-id');
        if (id) doCheckIn(id, chip);
      });
    });
  }

  function renderGroup(g) {
    var label = g.time ? '🕐 ' + escapeHtml(g.time) : '⚠️ ללא זמן מתוזמן';
    var attendedCount = g.rows.filter(function (r) { return !!r.checked_in_at; }).length;

    var chipsHtml = g.rows.map(function (r) {
      var done = !!r.checked_in_at;
      var cls = (done ? CLS_CHIP_DONE : CLS_CHIP) + (done ? ' checked-in' : '');
      var icon = done ? '✅' : '🔵';
      var timeTxt = done ? ' (' + formatTime(r.checked_in_at) + ')' : '';
      var attr = done ? '' : ' data-attendee-id="' + escapeHtml(r.id) + '"';
      var titleAttr = r.phone ? ' title="' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '"' : '';
      return '<button type="button" class="' + cls + '"' + attr + titleAttr + '>' +
        '<span>' + icon + '</span><span>' + escapeHtml(r.full_name || '') + escapeHtml(timeTxt) + '</span>' +
      '</button>';
    }).join('');

    return '<div class="' + CLS_GROUP + '">' +
      '<div class="' + CLS_GRP_HEAD + '">' +
        '<span class="text-indigo-700">' + label + '</span>' +
        '<span class="text-xs font-normal text-slate-500">(' + g.rows.length + ' משתתפים — ' + attendedCount + ' נכנסו)</span>' +
      '</div>' +
      '<div class="' + CLS_CHIPS + '">' + chipsHtml + '</div>' +
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
    chip.innerHTML = '<span>⏳</span><span>מכניס...</span>';

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
    (state.attendees || []).forEach(function (a) { if (a.id === id) Object.assign(a, patch); });
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
