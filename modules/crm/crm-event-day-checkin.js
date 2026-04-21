/* =============================================================================
   crm-event-day-checkin.js — Check-in sub-tab (B8 Tailwind — FINAL-05)
   3-column layout: waiting / scanner+selected / arrived. Flash notifications.
   ============================================================================= */
(function () {
  'use strict';

  // Class constants
  var CLS_GRID       = 'grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-[500px]';
  var CLS_COL        = 'rounded-xl border p-3 flex flex-col gap-2 min-h-[500px]';
  var CLS_COL_AMBER  = CLS_COL + ' bg-amber-50/60 border-amber-200';
  var CLS_COL_CENTER = CLS_COL + ' bg-indigo-50/60 border-indigo-200';
  var CLS_COL_GREEN  = CLS_COL + ' bg-emerald-50/60 border-emerald-200';
  var CLS_COL_HEAD   = 'flex items-center justify-between mb-1 font-bold text-slate-800';
  var CLS_SEARCH     = 'w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500';
  var CLS_ATT_CARD   = 'bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition';
  var CLS_ATT_SEL    = 'bg-indigo-100 border-2 border-indigo-500 rounded-lg p-3 shadow-md cursor-pointer transition';
  var CLS_ATT_OVER   = 'bg-amber-100 border-2 border-amber-500 rounded-lg p-3 cursor-pointer hover:shadow-sm transition';
  var CLS_SCAN_IND   = 'inline-flex items-center gap-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm w-max mx-auto mb-3';
  var CLS_BARCODE    = 'w-full bg-slate-900 text-emerald-400 border-2 border-emerald-500 rounded-lg p-4 text-center text-xl font-mono shadow-inner mb-2 focus:ring-2 focus:ring-emerald-500';
  var CLS_BTN_SECOND = 'w-full px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition mb-3';
  var CLS_SEL_CARD   = 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-xl p-4 shadow-lg';
  var CLS_BTN_CHECK  = 'flex-1 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-md transition disabled:opacity-50';
  var CLS_BTN_PURCH  = 'flex-1 h-14 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-md transition disabled:opacity-50';

  var _filter = '';
  var _selectedId = null;

  function renderEventDayCheckin(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="' + CLS_GRID + '">' +
        '<div class="' + CLS_COL_AMBER + '" id="eventday-col-waiting"></div>' +
        '<div class="' + CLS_COL_CENTER + '" id="eventday-col-checkin"></div>' +
        '<div class="' + CLS_COL_GREEN + '" id="eventday-col-arrived"></div>' +
      '</div>';
    renderWaitingColumn();
    renderCenterColumn();
    renderArrivedColumn();
  }
  window.renderEventDayCheckin = renderEventDayCheckin;

  function renderWaitingColumn() {
    var col = document.getElementById('eventday-col-waiting');
    if (!col) return;
    var state = window.getEventDayState();
    var now = new Date();
    var waiting = (state.attendees || []).filter(function (a) { return !a.checked_in_at && a.status !== 'cancelled'; });
    var header = '<div class="' + CLS_COL_HEAD + '">' +
      '<span>⏳ ממתינים (' + waiting.length + ')</span>' +
      '<input type="search" id="crm-eventday-waiting-search" class="' + CLS_SEARCH + ' max-w-[130px]" placeholder="חיפוש..." value="' + escapeHtml(_filter) + '">' +
    '</div>';
    var filtered = filterList(waiting, _filter);
    var cards = filtered.length ? filtered.map(function (a) {
      var overdue = isOverdue(a.scheduled_time, now);
      var cls = a.id === _selectedId ? CLS_ATT_SEL : (overdue ? CLS_ATT_OVER : CLS_ATT_CARD);
      return '<div class="' + cls + '" data-select-id="' + escapeHtml(a.id) + '">' +
        '<div class="font-bold text-slate-900 text-sm truncate">' + escapeHtml(a.full_name || '') + '</div>' +
        '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
        (a.scheduled_time ? '<div class="text-xs mt-1 ' + (overdue ? 'text-amber-700 font-semibold' : 'text-slate-500') + '">🕐 ' + escapeHtml(a.scheduled_time) + '</div>' : '') +
      '</div>';
    }).join('') : '<div class="text-center text-slate-400 py-6 text-sm">—</div>';

    col.innerHTML = header + cards;
    var srch = col.querySelector('#crm-eventday-waiting-search');
    if (srch) srch.addEventListener('input', function () { _filter = srch.value || ''; renderWaitingColumn(); });
    col.querySelectorAll('[data-select-id]').forEach(function (el) {
      el.addEventListener('click', function () { _selectedId = el.getAttribute('data-select-id'); renderWaitingColumn(); renderCenterColumn(); });
    });
  }

  function renderCenterColumn() {
    var col = document.getElementById('eventday-col-checkin');
    if (!col) return;
    var state = window.getEventDayState();
    var selected = _selectedId ? (state.attendees || []).find(function (a) { return a.id === _selectedId; }) : null;

    col.innerHTML =
      '<div class="' + CLS_SCAN_IND + '"><span class="w-2 h-2 rounded-full bg-white animate-pulse"></span><span>מוכן לסריקה</span></div>' +
      '<input type="text" id="crm-eventday-barcode" class="' + CLS_BARCODE + '" placeholder="העבר ברקוד..." autocomplete="off" style="direction:ltr">' +
      '<input type="search" id="crm-eventday-search" class="' + CLS_SEARCH + ' mb-2" placeholder="🔍 חיפוש משני...">' +
      '<button type="button" class="' + CLS_BTN_SECOND + '" id="crm-eventday-quick-register">+ רישום מהיר</button>' +
      '<div id="crm-eventday-notif-area"></div>' +
      (selected
        ? renderSelectedDetail(selected) +
          '<div class="flex gap-2 mt-3">' +
            '<button type="button" class="' + CLS_BTN_CHECK + '" data-checkin-id="' + escapeHtml(selected.id) + '">✅ צ׳ק-אין</button>' +
            '<button type="button" class="' + CLS_BTN_PURCH + '" data-purchase-id="' + escapeHtml(selected.id) + '">💰 רכישה</button>' +
          '</div>'
        : '<div class="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 text-sm">בחר משתתף מהעמודה השמאלית או סרוק ברקוד</div>'
      );

    var barcode = col.querySelector('#crm-eventday-barcode');
    if (barcode) {
      barcode.focus();
      barcode.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); onBarcodeScan(barcode.value); barcode.value = ''; }
      });
    }
    var qr = col.querySelector('#crm-eventday-quick-register');
    if (qr) qr.addEventListener('click', function () { if (window.Toast) Toast.show('רישום מהיר — בקרוב'); });

    var checkBtn = col.querySelector('[data-checkin-id]');
    if (checkBtn) checkBtn.addEventListener('click', function () { doCheckIn(checkBtn.getAttribute('data-checkin-id'), checkBtn); });
    var prcBtn = col.querySelector('[data-purchase-id]');
    if (prcBtn) prcBtn.addEventListener('click', function () {
      if (typeof window.openPurchaseAmountModal === 'function') window.openPurchaseAmountModal(prcBtn.getAttribute('data-purchase-id'));
      else showNotification('רכישה — בקרוב', 'info');
    });
  }

  function renderSelectedDetail(a) {
    var status = CrmHelpers.getStatusInfo('attendee', a.status);
    return '<div class="' + CLS_SEL_CARD + '">' +
      '<div class="text-xl font-black">' + escapeHtml(a.full_name || '') + '</div>' +
      '<div class="text-sm opacity-90 mt-1" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
      '<div class="grid grid-cols-2 gap-2 mt-3 text-xs">' +
        '<div class="bg-white/15 rounded-lg px-2 py-1.5"><div class="opacity-80">סטטוס</div><div class="font-semibold mt-0.5">' + escapeHtml(status.label) + '</div></div>' +
        '<div class="bg-white/15 rounded-lg px-2 py-1.5"><div class="opacity-80">שעה</div><div class="font-semibold mt-0.5">' + escapeHtml(a.scheduled_time || '—') + '</div></div>' +
        '<div class="bg-white/15 rounded-lg px-2 py-1.5"><div class="opacity-80">צ׳ק-אין</div><div class="font-semibold mt-0.5">' + escapeHtml(formatTime(a.checked_in_at) || '—') + '</div></div>' +
        '<div class="bg-white/15 rounded-lg px-2 py-1.5"><div class="opacity-80">קופון</div><div class="font-semibold mt-0.5">' + (a.coupon_sent ? '✅' : '—') + '</div></div>' +
      '</div>' +
    '</div>';
  }

  function renderArrivedColumn() {
    var col = document.getElementById('eventday-col-arrived');
    if (!col) return;
    if (typeof window.renderEventDayArrivedColumn === 'function') {
      window.renderEventDayArrivedColumn(col);
    } else {
      col.innerHTML = '<div class="text-center text-slate-400 py-6 text-sm">—</div>';
    }
  }
  window.renderEventDayArrivedRefresh = renderArrivedColumn;

  function onBarcodeScan(code) {
    code = String(code || '').trim();
    if (!code) return;
    var state = window.getEventDayState();
    var match = (state.attendees || []).find(function (a) {
      return String(a.phone || '').endsWith(code) || a.id === code || a.lead_id === code;
    });
    if (!match) { showNotification('ברקוד לא נמצא: ' + code, 'error'); return; }
    _selectedId = match.id;
    renderWaitingColumn(); renderCenterColumn();
    doCheckIn(match.id, null);
  }

  function filterList(all, needle) {
    var s = (needle || '').trim().toLowerCase();
    if (!s) return all;
    return (all || []).filter(function (r) {
      return (r.full_name || '').toLowerCase().indexOf(s) !== -1 || (r.phone || '').toLowerCase().indexOf(s) !== -1;
    });
  }

  function isOverdue(t, now) {
    if (!t) return false;
    var parts = String(t).split(':');
    if (parts.length < 2) return false;
    var d = new Date(now); d.setHours(+parts[0] || 0, +parts[1] || 0, 0, 0);
    return d.getTime() < now.getTime() - 5 * 60 * 1000;
  }

  function formatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function showNotification(text, type) {
    var el = document.createElement('div');
    var base = 'fixed top-6 end-6 z-[9999] px-5 py-3 rounded-xl font-bold text-white shadow-lg transition';
    el.className = base + ' ' + (type === 'error' ? 'bg-rose-500' : 'bg-emerald-500');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
  }
  window.showEventDayNotification = showNotification;

  async function doCheckIn(attendeeId, btn) {
    if (!attendeeId) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      var res = await sb.rpc('check_in_attendee', { p_tenant_id: getTenantId(), p_attendee_id: attendeeId });
      if (res.error) throw new Error(res.error.message);
      var payload = res.data || {};
      if (payload.success) {
        logActivity('crm.attendee.checked_in', attendeeId);
        updateLocal(attendeeId, { checked_in_at: payload.checked_in_at, status: 'attended' });
        if (window.refreshEventDayStats) await window.refreshEventDayStats();
        showNotification('✅ הכניסה נרשמה', 'success');
        renderWaitingColumn(); renderCenterColumn(); renderArrivedColumn();
      } else if (payload.error === 'already_checked_in') {
        showNotification('המשתתף כבר נכנס ב-' + formatTime(payload.checked_in_at), 'error');
      } else {
        showNotification('שגיאה: ' + (payload.error || 'unknown'), 'error');
      }
    } catch (e) {
      showNotification('כשל: ' + (e.message || e), 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✅ צ׳ק-אין'; }
    }
  }

  function updateLocal(id, patch) {
    var state = window.getEventDayState();
    (state.attendees || []).forEach(function (a) { if (a.id === id) Object.assign(a, patch); });
  }

  function logActivity(action, entityId) {
    if (window.ActivityLog && ActivityLog.write) {
      try { ActivityLog.write({ action: action, entity_type: 'crm_event_attendees', entity_id: entityId, severity: 'info', metadata: { event_id: window.getEventDayState().eventId } }); } catch (_) {}
    }
  }
})();
