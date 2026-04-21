/* =============================================================================
   crm-event-day-checkin.js — Check-in sub-tab (B7: FINAL-05)
   3-column layout: LEFT = waiting list (amber / overdue / selected cards)
                    CENTER = barcode scanner with scanning-indicator + selected
                             attendee detail (gradient) + check-in/purchase buttons
                    RIGHT = arrived column (delegated to renderEventDayArrived)
   Flash notifications on successful check-in / failure.
   Depends on: shared.js, CrmHelpers, crm-event-day.js state.
   ============================================================================= */
(function () {
  'use strict';

  var _filter = '';
  var _selectedId = null;

  function renderEventDayCheckin(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="crm-eventday-grid">' +
        '<div class="crm-eventday-col crm-eventday-col-amber" id="eventday-col-waiting"></div>' +
        '<div class="crm-eventday-col crm-eventday-col-center" id="eventday-col-checkin"></div>' +
        '<div class="crm-eventday-col crm-eventday-col-green" id="eventday-col-arrived"></div>' +
      '</div>';
    renderWaitingColumn();
    renderCenterColumn();
    renderArrivedColumn();
  }
  window.renderEventDayCheckin = renderEventDayCheckin;

  // ---- Left: waiting cards ----
  function renderWaitingColumn() {
    var col = document.getElementById('eventday-col-waiting');
    if (!col) return;
    var state = window.getEventDayState();
    var now = new Date();
    var waiting = (state.attendees || []).filter(function (a) { return !a.checked_in_at && a.status !== 'cancelled'; });
    var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong>⏳ ממתינים (' + waiting.length + ')</strong>' +
      '<input type="search" id="crm-eventday-waiting-search" class="crm-search" placeholder="חיפוש..." value="' + escapeHtml(_filter) + '" style="width:130px;padding:4px 8px;border:1px solid var(--crm-border-strong);border-radius:4px">' +
    '</div>';
    var filtered = filterList(waiting, _filter);
    var cards = filtered.length ? filtered.map(function (a) {
      var overdue = isOverdue(a.scheduled_time, now);
      var cls = 'crm-attendee-card' + (overdue ? ' overdue' : '') + (a.id === _selectedId ? ' selected' : '');
      return '<div class="' + cls + '" data-select-id="' + escapeHtml(a.id) + '">' +
        '<div style="font-weight:700">' + escapeHtml(a.full_name || '') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
        (a.scheduled_time ? '<div style="font-size:0.78rem;color:' + (overdue ? 'var(--crm-warning-dark)' : 'var(--crm-text-muted)') + '">🕐 ' + escapeHtml(a.scheduled_time) + '</div>' : '') +
      '</div>';
    }).join('') : '<div class="crm-detail-empty">—</div>';

    col.innerHTML = header + cards;
    var srch = col.querySelector('#crm-eventday-waiting-search');
    if (srch) srch.addEventListener('input', function () { _filter = srch.value || ''; renderWaitingColumn(); });
    col.querySelectorAll('[data-select-id]').forEach(function (el) {
      el.addEventListener('click', function () { _selectedId = el.getAttribute('data-select-id'); renderWaitingColumn(); renderCenterColumn(); });
    });
  }

  // ---- Center: barcode scanner with scanning-indicator + selected attendee detail ----
  function renderCenterColumn() {
    var col = document.getElementById('eventday-col-checkin');
    if (!col) return;
    var state = window.getEventDayState();
    var selected = _selectedId ? (state.attendees || []).find(function (a) { return a.id === _selectedId; }) : null;

    col.innerHTML =
      '<div class="crm-scanning-indicator"><span class="crm-scanning-dot"></span><span>מוכן לסריקה</span></div>' +
      '<input type="text" id="crm-eventday-barcode" class="crm-barcode-input" placeholder="העבר ברקוד..." autocomplete="off">' +
      '<input type="search" id="crm-eventday-search" class="crm-search" placeholder="🔍 חיפוש משני..." style="width:100%;padding:8px 10px;border:1px solid var(--crm-border-strong);border-radius:6px;margin-bottom:10px">' +
      '<button type="button" class="crm-btn crm-btn-secondary" id="crm-eventday-quick-register" style="width:100%;margin-bottom:10px">+ רישום מהיר</button>' +
      '<div id="crm-eventday-notif-area"></div>' +
      (selected
        ? renderSelectedDetail(selected) +
          '<div style="display:flex;gap:10px;margin-top:10px">' +
            '<button type="button" class="crm-action-btn whatsapp" style="flex:1;height:56px;font-size:1rem" data-checkin-id="' + escapeHtml(selected.id) + '">✅ צ׳ק-אין</button>' +
            '<button type="button" class="crm-action-btn eventday" style="flex:1;height:56px;font-size:1rem" data-purchase-id="' + escapeHtml(selected.id) + '">💰 רכישה</button>' +
          '</div>'
        : '<div class="crm-detail-empty" style="padding:20px">בחר משתתף מהעמודה השמאלית או סרוק ברקוד</div>'
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

  // ---- Selected attendee detail card (gradient + status/time/notes rows) ----
  function renderSelectedDetail(a) {
    var status = CrmHelpers.getStatusInfo('attendee', a.status);
    return '<div class="crm-selected-detail selected-card">' +
      '<div style="font-size:1.2rem;font-weight:800">' + escapeHtml(a.full_name || '') + '</div>' +
      '<div style="font-size:0.88rem;direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
      '<div class="crm-attendee-detail">' +
        '<div><strong>סטטוס:</strong> <span class="crm-badge" style="background:' + escapeHtml(status.color) + '">' + escapeHtml(status.label) + '</span></div>' +
        '<div><strong>שעה:</strong> ' + escapeHtml(a.scheduled_time || '—') + '</div>' +
        '<div><strong>צ׳ק-אין:</strong> ' + escapeHtml(formatTime(a.checked_in_at) || '—') + '</div>' +
        '<div><strong>קופון:</strong> ' + (a.coupon_sent ? '✅' : '—') + '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- Right column — delegates to manage.js (criterion §2.29 lives there) ----
  function renderArrivedColumn() {
    var col = document.getElementById('eventday-col-arrived');
    if (!col) return;
    if (typeof window.renderEventDayArrivedColumn === 'function') {
      window.renderEventDayArrivedColumn(col);
    } else {
      col.innerHTML = '<div class="crm-detail-empty">—</div>';
    }
  }
  window.renderEventDayArrivedRefresh = renderArrivedColumn;

  // ---- Barcode scan (matches by phone tail or id) ----
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
    var d = new Date(now); d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
    return d.getTime() < now.getTime() - 5 * 60 * 1000;
  }

  function formatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // ---- Flash notification (criterion §2.31) ----
  function showNotification(text, type) {
    var el = document.createElement('div');
    el.className = 'crm-flash-notification' + (type === 'error' ? ' error' : '');
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
