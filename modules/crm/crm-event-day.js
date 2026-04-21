/* =============================================================================
   crm-event-day.js — Event Day main view (layout, stats bar, sub-tabs, state)
   Depends on: shared.js, CrmHelpers, crm-init.js
   View exposes:
     window.loadCrmEventDay()      — entry point invoked by showCrmTab('event-day')
     window.refreshEventDayStats() — re-fetches v_crm_event_stats, re-renders bar
     window.getEventDayState()     — { eventId, event, attendees, stats }
     window.renderEventDaySubTab() — routes to active sub-tab renderer
   Sub-tab renderers (registered by sibling files):
     window.renderEventDayCheckin()
     window.renderEventDaySchedule()
     window.renderEventDayManage()
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'checkin',  label: '\u2705 \u05DB\u05E0\u05D9\u05E1\u05D5\u05EA' },
    { key: 'schedule', label: '\uD83D\uDD50 \u05D6\u05DE\u05E0\u05D9\u05DD' },
    { key: 'manage',   label: '\uD83D\uDCCB \u05E0\u05D9\u05D4\u05D5\u05DC' }
  ];

  var _state = {
    eventId: null,
    event: null,
    attendees: [],
    stats: null,
    subTab: 'checkin'
  };
  window.getEventDayState = function () { return _state; };

  async function loadCrmEventDay() {
    var panel = document.getElementById('tab-event-day');
    if (!panel) return;
    var eventId = window._currentEventDayId;
    if (!eventId) {
      panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px">לא נבחר אירוע. חזור ללשונית האירועים ובחר אירוע.</div></div>';
      return;
    }

    if (_state.eventId !== eventId) {
      _state = { eventId: eventId, event: null, attendees: [], stats: null, subTab: 'checkin' };
    }

    panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px">טוען מצב יום אירוע...</div></div>';

    try {
      await ensureCrmStatusCache();
      await fetchAllEventDayData();
      renderLayout(panel);
      renderActiveSubTab();
    } catch (e) {
      console.error('event day load failed:', e);
      panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px;color:#ef4444">שגיאה בטעינה: ' +
        escapeHtml(e.message || String(e)) + '</div></div>';
    }
  }
  window.loadCrmEventDay = loadCrmEventDay;

  async function fetchAllEventDayData() {
    var tid = getTenantId();
    var evQ = sb.from('crm_events')
      .select('id, event_number, name, event_date, start_time, end_time, status, max_capacity, booking_fee, coupon_code')
      .eq('id', _state.eventId)
      .eq('is_deleted', false);
    if (tid) evQ = evQ.eq('tenant_id', tid);

    var attQ = sb.from('v_crm_event_attendees_full')
      .select('id, lead_id, event_id, full_name, phone, email, status, status_name, status_color, purchase_amount, checked_in_at, registered_at, coupon_sent, coupon_sent_at, booking_fee_paid, scheduled_time')
      .eq('event_id', _state.eventId)
      .eq('is_deleted', false)
      .order('scheduled_time', { nullsFirst: false })
      .order('full_name');
    if (tid) attQ = attQ.eq('tenant_id', tid);

    var statsQ = sb.from('v_crm_event_stats')
      .select('event_id, event_number, name, event_date, status, max_capacity, total_registered, total_attended, total_purchased, total_revenue, spots_remaining, purchase_rate_pct')
      .eq('event_id', _state.eventId);
    if (tid) statsQ = statsQ.eq('tenant_id', tid);

    var results = await Promise.all([evQ, attQ, statsQ]);
    if (results[0].error) throw new Error('event: ' + results[0].error.message);
    if (results[1].error) throw new Error('attendees: ' + results[1].error.message);
    if (results[2].error) throw new Error('stats: ' + results[2].error.message);

    _state.event = (results[0].data && results[0].data[0]) || null;
    _state.attendees = results[1].data || [];
    _state.stats = (results[2].data && results[2].data[0]) || null;
  }

  async function refreshEventDayStats() {
    var tid = getTenantId();
    var q = sb.from('v_crm_event_stats')
      .select('event_id, total_registered, total_attended, total_purchased, total_revenue, spots_remaining, purchase_rate_pct, max_capacity')
      .eq('event_id', _state.eventId);
    if (tid) q = q.eq('tenant_id', tid);
    var res = await q;
    if (res.error) { console.error('stats refresh failed:', res.error); return; }
    var row = (res.data && res.data[0]) || null;
    if (row) {
      _state.stats = Object.assign({}, _state.stats || {}, row);
      renderStatsBar();
    }
  }
  window.refreshEventDayStats = refreshEventDayStats;

  function renderLayout(panel) {
    var ev = _state.event;
    var title = ev
      ? ('\uD83D\uDCC5 \u05D0\u05D9\u05E8\u05D5\u05E2 #' + (ev.event_number || '?') + ' \u2014 ' + escapeHtml(ev.name || ''))
      : '\u05DE\u05E6\u05D1 \u05D9\u05D5\u05DD \u05D0\u05D9\u05E8\u05D5\u05E2';
    var subDate = ev && ev.event_date ? CrmHelpers.formatDate(ev.event_date) : '';

    var subTabHtml = SUB_TABS.map(function (t) {
      var cls = 'crm-eventday-subtab' + (_state.subTab === t.key ? ' active' : '');
      return '<button type="button" class="' + cls + '" data-subtab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="crm-eventday-header">' +
        '<button type="button" class="crm-eventday-back" id="crm-eventday-back">\u25B6 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD</button>' +
        '<div class="crm-eventday-title">' + title + (subDate ? ' <span class="crm-eventday-date">' + escapeHtml(subDate) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="card crm-eventday-stats" id="crm-eventday-stats"></div>' +
      '<div class="crm-eventday-subtabs">' + subTabHtml + '</div>' +
      '<div class="card crm-eventday-body" id="crm-eventday-body"></div>';

    renderStatsBar();

    var backBtn = document.getElementById('crm-eventday-back');
    if (backBtn) backBtn.addEventListener('click', function () {
      window._currentEventDayId = null;
      showCrmTab('events');
    });

    panel.querySelectorAll('.crm-eventday-subtab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-subtab');
        if (!key || key === _state.subTab) return;
        _state.subTab = key;
        panel.querySelectorAll('.crm-eventday-subtab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderActiveSubTab();
      });
    });
  }

  function renderStatsBar() {
    var el = document.getElementById('crm-eventday-stats');
    if (!el) return;
    var s = _state.stats || {};
    var registered = Number(s.total_registered || 0);
    var attended = Number(s.total_attended || 0);
    var purchased = Number(s.total_purchased || 0);
    var revenue = Number(s.total_revenue || 0);
    var waiting = Math.max(0, registered - attended);

    el.innerHTML =
      card(attended + ' / ' + registered, '\u05E0\u05DB\u05E0\u05E1\u05D5', 'accent-success') +
      card(String(purchased), '\u05E8\u05DB\u05E9\u05D5', 'accent-info') +
      card(CrmHelpers.formatCurrency(revenue), '\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA', '') +
      card(String(waiting), '\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD', 'accent-warn');
  }

  function card(value, label, accent) {
    return '<div class="crm-stat-card ' + accent + '">' +
      '<div class="crm-stat-value">' + escapeHtml(value) + '</div>' +
      '<div class="crm-stat-label">' + escapeHtml(label) + '</div>' +
    '</div>';
  }

  function renderActiveSubTab() {
    var host = document.getElementById('crm-eventday-body');
    if (!host) return;
    if (_state.subTab === 'checkin' && typeof window.renderEventDayCheckin === 'function') {
      window.renderEventDayCheckin(host);
    } else if (_state.subTab === 'schedule' && typeof window.renderEventDaySchedule === 'function') {
      window.renderEventDaySchedule(host);
    } else if (_state.subTab === 'manage' && typeof window.renderEventDayManage === 'function') {
      window.renderEventDayManage(host);
    } else {
      host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">רכיב התת-לשונית לא נטען.</div>';
    }
  }
  window.renderEventDaySubTab = renderActiveSubTab;
})();
