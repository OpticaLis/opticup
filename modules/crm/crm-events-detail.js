/* =============================================================================
   crm-events-detail.js — Event detail modal (info + attendees table)
   Data: crm_events (single row) + v_crm_event_attendees_full (attendees)
         + v_crm_event_stats (aggregates, via cache from events-tab)
   READ-ONLY per Phase B3 SPEC.
   ============================================================================= */
(function () {
  'use strict';

  async function openCrmEventDetail(eventId) {
    if (!eventId || typeof Modal === 'undefined') return;

    var stats = typeof getCrmEventStatsById === 'function' ? getCrmEventStatsById(eventId) : null;
    var title = stats ? ('אירוע #' + (stats.event_number || '?') + ' — ' + (stats.name || '')) : 'אירוע';

    var modal = Modal.show({
      title: title,
      size: 'lg',
      content: '<div class="crm-detail-empty" style="padding:20px">טוען פרטי אירוע...</div>'
    });

    try {
      var data = await fetchDetail(eventId);
      var body = modal.el.querySelector('.modal-body');
      if (body) body.innerHTML = renderDetail(data.event, stats, data.attendees);
      wireAttendeeFilter(modal.el, data.attendees);
      wireEventDayEntry(modal);
    } catch (e) {
      console.error('event detail failed:', e);
      var body = modal.el.querySelector('.modal-body');
      if (body) body.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.openCrmEventDetail = openCrmEventDetail;

  async function fetchDetail(eventId) {
    var tid = getTenantId();

    var evQ = sb.from('crm_events')
      .select('id, event_number, name, event_date, start_time, end_time, location_address, location_waze_url, status, max_capacity, booking_fee, coupon_code, registration_form_url, notes')
      .eq('id', eventId)
      .eq('is_deleted', false);
    if (tid) evQ = evQ.eq('tenant_id', tid);

    var attQ = sb.from('v_crm_event_attendees_full')
      .select('id, lead_id, event_id, full_name, phone, email, status, status_name, status_color, purchase_amount, checked_in_at, registered_at, cancelled_at, coupon_sent, scheduled_time')
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('full_name');
    if (tid) attQ = attQ.eq('tenant_id', tid);

    var results = await Promise.all([evQ, attQ]);
    if (results[0].error) throw new Error('event: ' + results[0].error.message);
    if (results[1].error) throw new Error('attendees: ' + results[1].error.message);
    return {
      event: (results[0].data && results[0].data[0]) || null,
      attendees: results[1].data || []
    };
  }

  function renderDetail(event, stats, attendees) {
    if (!event) return '<div class="crm-detail-empty">האירוע לא נמצא</div>';

    var statusInfo = CrmHelpers.getStatusInfo('event', event.status);
    var timeRange = [event.start_time, event.end_time].filter(Boolean).map(function (t) { return String(t).slice(0, 5); }).join('–');

    var h = '<div class="crm-detail-section"><h4>פרטים</h4><div class="crm-detail-grid">' +
      detailRow('תאריך', CrmHelpers.formatDate(event.event_date)) +
      detailRow('שעות', timeRange || '—') +
      detailRow('מיקום', event.location_address || '—') +
      detailRowHtml('סטטוס', '<span class="crm-badge" style="background:' + escapeHtml(statusInfo.color) + '">' + escapeHtml(statusInfo.label) + '</span>') +
      detailRow('קופון', event.coupon_code || '—') +
      detailRow('דמי הזמנה', event.booking_fee != null ? CrmHelpers.formatCurrency(event.booking_fee) : '—') +
      detailRow('תפוסה', event.max_capacity != null ? event.max_capacity + ' מקסימום' : '—') +
      '</div></div>';

    if (event.notes) {
      h += '<div class="crm-detail-section"><h4>הערות</h4><div class="crm-detail-note">' +
        escapeHtml(event.notes) + '</div></div>';
    }

    // Event Day entry button — only when event is operational
    if (event.status === 'registration_open' || event.status === 'completed') {
      h += '<button type="button" class="crm-eventday-entry-btn" data-event-day-id="' + escapeHtml(event.id) + '">' +
        '🎯 מצב יום אירוע — כניסה למסך ניהול יום' +
      '</button>';
    }

    // Stats (from v_crm_event_stats cache)
    if (stats) {
      h += '<div class="crm-detail-section"><h4>📊 סיכום</h4><div class="crm-detail-grid">' +
        detailRow('נרשמו', String(stats.total_registered || 0)) +
        detailRow('הגיעו', String(stats.total_attended || 0)) +
        detailRow('רכשו', String(stats.total_purchased || 0)) +
        detailRow('הכנסות', CrmHelpers.formatCurrency(stats.total_revenue || 0)) +
        detailRow('% רכישה', stats.purchase_rate_pct != null ? stats.purchase_rate_pct + '%' : '—') +
        detailRow('מקומות פנויים', stats.spots_remaining != null ? String(stats.spots_remaining) : '—') +
        '</div>' + renderCapacityBar(stats, event.max_capacity) + '</div>';
    }

    // Attendees
    h += '<div class="crm-detail-section"><h4>👥 משתתפים (' + attendees.length + ')</h4>';
    h += '<div class="crm-filter-bar">' +
      '<input type="search" id="crm-attendees-search" class="crm-search" placeholder="חיפוש שם או טלפון...">' +
      '<select id="crm-attendees-filter-status"><option value="">כל הסטטוסים</option>' +
      attendeeStatusOptions(attendees) + '</select>' +
      '</div>';
    h += '<div id="crm-attendees-table-wrap" class="crm-table-wrap">' + renderAttendeesTable(attendees) + '</div>';
    h += '</div>';

    return h;
  }

  function attendeeStatusOptions(attendees) {
    var slugs = CrmHelpers.distinctValues(attendees, 'status');
    return slugs.map(function (slug) {
      var info = CrmHelpers.getStatusInfo('attendee', slug);
      return '<option value="' + escapeHtml(slug) + '">' + escapeHtml(info.label) + '</option>';
    }).join('');
  }

  function renderAttendeesTable(rows) {
    if (!rows.length) return '<div class="crm-detail-empty" style="padding:20px">אין משתתפים</div>';
    var h = '<table class="crm-table"><thead><tr>' +
      '<th>שם</th><th>טלפון</th><th>סטטוס</th><th>רכישה</th><th>שעה מתוזמנת</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr class="readonly">' +
        '<td>' + escapeHtml(r.full_name || '') + '</td>' +
        '<td style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('attendee', r.status) + '</td>' +
        '<td>' + escapeHtml(r.purchase_amount ? CrmHelpers.formatCurrency(r.purchase_amount) : '—') + '</td>' +
        '<td>' + escapeHtml(r.scheduled_time || '—') + '</td>' +
        '</tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  function wireEventDayEntry(modal) {
    var btn = modal.el.querySelector('button[data-event-day-id]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-event-day-id');
      if (!id) return;
      window._currentEventDayId = id;
      if (typeof modal.close === 'function') modal.close();
      else if (typeof Modal.close === 'function') Modal.close();
      if (typeof showCrmTab === 'function') showCrmTab('event-day');
    });
  }

  function wireAttendeeFilter(modalEl, allAttendees) {
    var search = modalEl.querySelector('#crm-attendees-search');
    var statusSel = modalEl.querySelector('#crm-attendees-filter-status');
    var wrap = modalEl.querySelector('#crm-attendees-table-wrap');
    if (!search || !statusSel || !wrap) return;

    function apply() {
      var s = (search.value || '').trim().toLowerCase();
      var statusFilter = statusSel.value || '';
      var rows = allAttendees.filter(function (r) {
        if (statusFilter && r.status !== statusFilter) return false;
        if (s) {
          var name = (r.full_name || '').toLowerCase();
          var phone = (r.phone || '').toLowerCase();
          if (name.indexOf(s) === -1 && phone.indexOf(s) === -1) return false;
        }
        return true;
      });
      wrap.innerHTML = renderAttendeesTable(rows);
    }

    search.addEventListener('input', apply);
    statusSel.addEventListener('change', apply);
  }

  // Capacity-bar: segmented progress (registered / confirmed / attended) over max_capacity.
  // Falls back gracefully when capacity is unset — segments scale to total registered instead.
  function renderCapacityBar(stats, maxCapacity) {
    var reg = Number(stats.total_registered || 0);
    var conf = Number(stats.total_confirmed || 0);
    var att = Number(stats.total_attended || 0);
    var cap = Number(maxCapacity || 0) || Math.max(reg, 1);
    var regPct = Math.min(100, Math.round((reg / cap) * 100));
    var confPct = Math.min(100, Math.round((conf / cap) * 100));
    var attPct = Math.min(100, Math.round((att / cap) * 100));
    var spotsLeft = Math.max(0, cap - reg);
    return '<div class="crm-capacity-container">' +
      '<div class="crm-capacity-label"><span>תפוסה: ' + reg + ' → ' + conf + ' → ' + att + '</span>' +
      '<span>' + spotsLeft + ' מקומות פנויים</span></div>' +
      '<div class="crm-capacity-bar">' +
      '<div class="crm-capacity-segment registered" style="width:' + regPct + '%">' + (regPct > 8 ? reg : '') + '</div>' +
      '<div class="crm-capacity-segment confirmed" style="width:' + Math.max(0, confPct - regPct) + '%">' + (confPct - regPct > 8 ? conf : '') + '</div>' +
      '<div class="crm-capacity-segment attended" style="width:' + Math.max(0, attPct - confPct) + '%">' + (attPct - confPct > 8 ? att : '') + '</div>' +
      '</div>' +
      '<div class="crm-capacity-legend">' +
      '<span class="crm-legend-item"><span class="crm-legend-dot" style="background:var(--crm-info)"></span>נרשמו (' + reg + ')</span>' +
      '<span class="crm-legend-item"><span class="crm-legend-dot" style="background:var(--crm-success)"></span>אישרו (' + conf + ')</span>' +
      '<span class="crm-legend-item"><span class="crm-legend-dot" style="background:var(--crm-warning)"></span>הגיעו (' + att + ')</span>' +
      '</div></div>';
  }

  function detailRow(label, value) {
    return '<div class="crm-detail-row">' +
      '<span class="crm-detail-label">' + escapeHtml(label) + ':</span>' +
      '<span class="crm-detail-value">' + escapeHtml(value == null ? '' : value) + '</span>' +
      '</div>';
  }

  function detailRowHtml(label, valueHtml) {
    return '<div class="crm-detail-row">' +
      '<span class="crm-detail-label">' + escapeHtml(label) + ':</span>' +
      '<span class="crm-detail-value">' + valueHtml + '</span>' +
      '</div>';
  }
})();
