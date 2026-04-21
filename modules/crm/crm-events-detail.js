/* =============================================================================
   crm-events-detail.js — Event detail modal (B7: FINAL-03 — gradient header,
   capacity-bar, 3 sub-tabs, grouped attendee list)
   Data: crm_events + v_crm_event_attendees_full + v_crm_event_stats.
   KPI sparklines + funnel-svg + analytics chart-cards live in
   crm-events-detail-charts.js.
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'attendees', label: 'משתתפים' },
    { key: 'messages',  label: 'הודעות' },
    { key: 'analytics', label: 'סטטיסטיקות' }
  ];

  async function openCrmEventDetail(eventId) {
    if (!eventId || typeof Modal === 'undefined') return;
    var stats = typeof getCrmEventStatsById === 'function' ? getCrmEventStatsById(eventId) : null;
    var title = stats ? ('אירוע #' + (stats.event_number || '?') + ' — ' + (stats.name || '')) : 'אירוע';

    var modal = Modal.show({
      title: title, size: 'lg',
      content: '<div class="crm-detail-empty" style="padding:20px">טוען פרטי אירוע...</div>'
    });

    try {
      var data = await fetchDetail(eventId);
      var body = modal.el.querySelector('.modal-body');
      if (body) {
        body.innerHTML = renderDetail(data.event, stats, data.attendees);
        wireSubTabs(body, data.event, stats, data.attendees);
        wireEventDayEntry(modal, body);
      }
    } catch (e) {
      console.error('event detail failed:', e);
      var body2 = modal.el.querySelector('.modal-body');
      if (body2) body2.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.openCrmEventDetail = openCrmEventDetail;

  async function fetchDetail(eventId) {
    var tid = getTenantId();
    var evQ = sb.from('crm_events')
      .select('id, event_number, name, event_date, start_time, end_time, location_address, location_waze_url, status, max_capacity, booking_fee, coupon_code, registration_form_url, notes')
      .eq('id', eventId).eq('is_deleted', false);
    if (tid) evQ = evQ.eq('tenant_id', tid);
    var attQ = sb.from('v_crm_event_attendees_full')
      .select('id, lead_id, event_id, full_name, phone, email, status, status_name, status_color, purchase_amount, checked_in_at, registered_at, cancelled_at, coupon_sent, scheduled_time')
      .eq('event_id', eventId).eq('is_deleted', false).order('full_name');
    if (tid) attQ = attQ.eq('tenant_id', tid);
    var r = await Promise.all([evQ, attQ]);
    if (r[0].error) throw new Error('event: ' + r[0].error.message);
    if (r[1].error) throw new Error('attendees: ' + r[1].error.message);
    return { event: (r[0].data && r[0].data[0]) || null, attendees: r[1].data || [] };
  }

  function renderDetail(event, stats, attendees) {
    if (!event) return '<div class="crm-detail-empty">האירוע לא נמצא</div>';
    var statusInfo = CrmHelpers.getStatusInfo('event', event.status);
    var timeRange = [event.start_time, event.end_time].filter(Boolean).map(function (t) { return String(t).slice(0, 5); }).join('–');
    var wazeHtml = event.location_waze_url ? ' · <a href="' + escapeHtml(event.location_waze_url) + '" target="_blank" style="color:#fff;text-decoration:underline">Waze</a>' : '';

    var h = '';
    // ---- A. Gradient event-header with breadcrumb, controls, info grid (§2.14) ----
    h += '<div class="crm-event-header">' +
      '<div class="crm-event-header-breadcrumb">אירועים › #' + escapeHtml(String(event.event_number || '?')) + '</div>' +
      '<h2 class="crm-event-header-title">' + escapeHtml(event.name || '') + '</h2>' +
      '<div style="margin-top:4px">' +
        '<span class="crm-badge" style="background:rgba(255,255,255,0.25)">' + escapeHtml(statusInfo.label) + '</span>' +
      '</div>' +
      '<div class="crm-event-header-controls">' +
        '<button type="button">שלח הודעה</button>' +
        '<button type="button">שנה סטטוס</button>' +
        '<button type="button">ייצוא Excel</button>' +
        (event.status === 'registration_open' || event.status === 'completed'
          ? '<button type="button" data-event-day-id="' + escapeHtml(event.id) + '">מצב יום אירוע</button>'
          : '') +
      '</div>' +
      '<div class="crm-event-info-grid">' +
        '<div><strong>📅 תאריך:</strong> ' + escapeHtml(CrmHelpers.formatDate(event.event_date)) + ' ' + escapeHtml(timeRange) + '</div>' +
        '<div><strong>📍 מיקום:</strong> ' + escapeHtml(event.location_address || '—') + wazeHtml + '</div>' +
        '<div><strong>🎟️ קופון:</strong> ' + escapeHtml(event.coupon_code || '—') + '</div>' +
      '</div>' +
    '</div>';

    // ---- B. Segmented capacity-bar (§2.15) ----
    if (stats) h += renderCapacityBar(stats, event.max_capacity);

    // ---- C. KPI cards with sparkline + trend (§2.16) ----
    h += '<div id="crm-event-detail-kpis"></div>';

    // ---- D. SVG funnel visualization (§2.17) ----
    h += '<div id="crm-event-detail-funnel" data-admin-only></div>';

    // ---- E. 3 sub-tabs + panels (§2.18, §2.19) ----
    var subTabBtns = SUB_TABS.map(function (t, i) {
      return '<button type="button" class="crm-messaging-subtab sub-tab' + (i === 0 ? ' active' : '') + '" data-event-subtab="' + t.key + '">' + escapeHtml(t.label) + '</button>';
    }).join('');
    h += '<div class="crm-messaging-subtabs">' + subTabBtns + '</div>' +
      '<div id="crm-event-detail-subbody">' + renderSubTab('attendees', attendees, stats) + '</div>';

    return h;
  }

  function renderCapacityBar(stats, maxCapacity) {
    var reg = Number(stats.total_registered || 0);
    var conf = Number(stats.total_confirmed || 0);
    var att = Number(stats.total_attended || 0);
    var cap = Number(maxCapacity || 0) || Math.max(reg, 1);
    var regPct  = Math.min(100, Math.round((reg  / cap) * 100));
    var confPct = Math.min(100, Math.round((conf / cap) * 100));
    var attPct  = Math.min(100, Math.round((att  / cap) * 100));
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
      '</div>' +
    '</div>';
  }

  function renderSubTab(key, attendees, stats) {
    if (key === 'attendees') return renderAttendeesGrouped(attendees);
    if (key === 'messages')  return renderMessagesTimeline();
    if (key === 'analytics') return '<div id="crm-event-detail-analytics"></div>';
    return '';
  }

  // ---- Grouped attendee list with group-header (§2.18) ----
  function renderAttendeesGrouped(attendees) {
    if (!attendees.length) return '<div class="crm-detail-empty" style="padding:20px">אין משתתפים</div>';
    var groups = {};
    attendees.forEach(function (a) {
      var k = a.status || 'other';
      if (!groups[k]) groups[k] = [];
      groups[k].push(a);
    });
    var html = '';
    Object.keys(groups).forEach(function (slug) {
      var info = CrmHelpers.getStatusInfo('attendee', slug);
      html += '<div class="crm-group-header" style="border-inline-start:4px solid ' + escapeHtml(info.color) + '">' +
        '<span>' + escapeHtml(info.label) + '</span>' +
        '<span class="crm-badge" style="background:' + escapeHtml(info.color) + '">' + groups[slug].length + '</span>' +
      '</div>';
      html += '<div class="crm-group-content">';
      groups[slug].slice(0, 40).forEach(function (a) {
        var ini = (a.full_name || '?').trim().charAt(0);
        var amount = a.purchase_amount ? ' <span class="crm-amount-display" data-admin-only>' + escapeHtml(CrmHelpers.formatCurrency(a.purchase_amount)) + '</span>' : '';
        html += '<div class="crm-attendee-row">' +
          '<div class="crm-attendee-avatar">' + escapeHtml(ini) + '</div>' +
          '<div><strong>' + escapeHtml(a.full_name || '') + '</strong>' + amount +
            '<div style="font-size:0.78rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div></div>' +
          '<div>' + CrmHelpers.statusBadgeHtml('attendee', a.status) + '</div>' +
          '<div></div>' +
        '</div>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderMessagesTimeline() {
    return '<div class="crm-detail-empty">ציר הודעות לאירוע — בקרוב</div>';
  }

  function wireSubTabs(body, event, stats, attendees) {
    // Initial render of KPI sparklines + funnel into their host divs (B7: delegated to charts file)
    if (stats && typeof window.renderEventDetailKpiSparklines === 'function') {
      window.renderEventDetailKpiSparklines(body.querySelector('#crm-event-detail-kpis'), stats);
    }
    if (stats && typeof window.renderEventDetailFunnelSvg === 'function') {
      window.renderEventDetailFunnelSvg(body.querySelector('#crm-event-detail-funnel'), stats);
    }
    body.querySelectorAll('[data-event-subtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.querySelectorAll('[data-event-subtab]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        var key = btn.getAttribute('data-event-subtab');
        var host = body.querySelector('#crm-event-detail-subbody');
        if (!host) return;
        host.innerHTML = renderSubTab(key, attendees, stats);
        if (key === 'analytics' && typeof window.renderEventDetailAnalytics === 'function') {
          window.renderEventDetailAnalytics(body.querySelector('#crm-event-detail-analytics'), stats, attendees);
        }
      });
    });
  }

  function wireEventDayEntry(modal, body) {
    var btn = body.querySelector('button[data-event-day-id]');
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
})();
