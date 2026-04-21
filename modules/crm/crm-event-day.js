/* =============================================================================
   crm-event-day.js — Event Day main view (B7: FINAL-05)
   Header bar (title + breadcrumb + live clock + role toggle + back) +
   counter-bar (5 gradient counter-card variants) + sub-tab nav + body.
   Depends on: shared.js, CrmHelpers.
   Exports:
     window.loadCrmEventDay()
     window.refreshEventDayStats()
     window.getEventDayState()
     window.renderEventDaySubTab()
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'checkin',  label: '✅ כניסות' },
    { key: 'schedule', label: '🕐 זמנים' },
    { key: 'manage',   label: '📋 ניהול' }
  ];

  var _state = { eventId: null, event: null, attendees: [], stats: null, subTab: 'checkin' };
  var _clockInterval = null;
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
      panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px;color:#ef4444">שגיאה: ' + escapeHtml(e.message || String(e)) + '</div></div>';
    }
  }
  window.loadCrmEventDay = loadCrmEventDay;

  async function fetchAllEventDayData() {
    var tid = getTenantId();
    var evQ = sb.from('crm_events')
      .select('id, event_number, name, event_date, start_time, end_time, status, max_capacity, booking_fee, coupon_code')
      .eq('id', _state.eventId).eq('is_deleted', false);
    if (tid) evQ = evQ.eq('tenant_id', tid);

    var attQ = sb.from('v_crm_event_attendees_full')
      .select('id, lead_id, event_id, full_name, phone, email, status, status_name, status_color, purchase_amount, checked_in_at, registered_at, coupon_sent, coupon_sent_at, booking_fee_paid, scheduled_time')
      .eq('event_id', _state.eventId).eq('is_deleted', false)
      .order('scheduled_time', { nullsFirst: false }).order('full_name');
    if (tid) attQ = attQ.eq('tenant_id', tid);

    var statsQ = sb.from('v_crm_event_stats')
      .select('event_id, event_number, name, event_date, status, max_capacity, total_registered, total_confirmed, total_attended, total_purchased, total_revenue, spots_remaining, purchase_rate_pct')
      .eq('event_id', _state.eventId);
    if (tid) statsQ = statsQ.eq('tenant_id', tid);

    var r = await Promise.all([evQ, attQ, statsQ]);
    if (r[0].error) throw new Error('event: ' + r[0].error.message);
    if (r[1].error) throw new Error('attendees: ' + r[1].error.message);
    if (r[2].error) throw new Error('stats: ' + r[2].error.message);
    _state.event = (r[0].data && r[0].data[0]) || null;
    _state.attendees = r[1].data || [];
    _state.stats = (r[2].data && r[2].data[0]) || null;
  }

  async function refreshEventDayStats() {
    var tid = getTenantId();
    var q = sb.from('v_crm_event_stats')
      .select('event_id, total_registered, total_confirmed, total_attended, total_purchased, total_revenue, spots_remaining, purchase_rate_pct, max_capacity')
      .eq('event_id', _state.eventId);
    if (tid) q = q.eq('tenant_id', tid);
    var res = await q;
    if (res.error) { console.error('stats refresh failed:', res.error); return; }
    var row = (res.data && res.data[0]) || null;
    if (row) { _state.stats = Object.assign({}, _state.stats || {}, row); renderStatsBar(); }
  }
  window.refreshEventDayStats = refreshEventDayStats;

  function renderLayout(panel) {
    var ev = _state.event;
    var title = ev ? ('אירוע #' + (ev.event_number || '?') + ' — ' + escapeHtml(ev.name || '')) : 'מצב יום אירוע';
    var subDate = ev && ev.event_date ? CrmHelpers.formatDate(ev.event_date) : '';

    var subTabHtml = SUB_TABS.map(function (t) {
      return '<button type="button" class="crm-eventday-subtab' + (_state.subTab === t.key ? ' active' : '') + '" data-subtab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="crm-eventday-header">' +
        '<button type="button" class="crm-eventday-back" id="crm-eventday-back">▶ חזרה לאירועים</button>' +
        '<div class="crm-eventday-title">' + title + (subDate ? ' <span class="crm-eventday-date">' + escapeHtml(subDate) + '</span>' : '') + '</div>' +
        '<div style="display:inline-flex;align-items:center;gap:10px;margin-inline-start:auto">' +
          '<span class="crm-scanning-indicator"><span class="crm-scanning-dot"></span><span id="crm-eventday-clock"></span></span>' +
          '<button type="button" class="crm-btn crm-btn-secondary" id="crm-eventday-role-toggle">החלף תפקיד</button>' +
        '</div>' +
      '</div>' +
      '<div class="crm-eventday-counter-bar" id="crm-eventday-stats"></div>' +
      '<div class="crm-eventday-subtabs">' + subTabHtml + '</div>' +
      '<div id="crm-eventday-body"></div>';

    renderStatsBar();
    startClock();

    var backBtn = document.getElementById('crm-eventday-back');
    if (backBtn) backBtn.addEventListener('click', function () { stopClock(); window._currentEventDayId = null; showCrmTab('events'); });

    var roleBtn = document.getElementById('crm-eventday-role-toggle');
    if (roleBtn) roleBtn.addEventListener('click', function () { if (typeof window.toggleCrmRole === 'function') window.toggleCrmRole(); });

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

  // ---- 5 gradient counter-card variants (criterion §2.26 counter-card/counter-bar) ----
  function renderStatsBar() {
    var el = document.getElementById('crm-eventday-stats');
    if (!el) return;
    var s = _state.stats || {};
    var reg  = Number(s.total_registered || 0);
    var conf = Number(s.total_confirmed  || 0);
    var att  = Number(s.total_attended   || 0);
    var prc  = Number(s.total_purchased  || 0);
    var rev  = Number(s.total_revenue    || 0);

    el.innerHTML =
      counterCard(reg,  'נרשמו',   'blue') +
      counterCard(conf, 'אישרו',   'violet') +
      counterCard(att,  'הגיעו',   'green') +
      counterCard(prc,  'רכשו',    'gold') +
      '<div data-admin-only style="flex:1;min-width:120px">' + counterCard(CrmHelpers.formatCurrency(rev), 'הכנסות', 'emerald') + '</div>';
  }

  function counterCard(value, label, variant) {
    return '<div class="crm-counter-card ' + variant + '">' +
      '<div class="crm-counter-number">' + escapeHtml(String(value)) + '</div>' +
      '<div class="crm-counter-label">' + escapeHtml(label) + '</div>' +
    '</div>';
  }

  function startClock() {
    stopClock();
    var update = function () {
      var el = document.getElementById('crm-eventday-clock');
      if (!el) return;
      var d = new Date();
      el.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    };
    update();
    _clockInterval = setInterval(update, 1000);
  }
  function stopClock() { if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; } }

  function renderActiveSubTab() {
    var host = document.getElementById('crm-eventday-body');
    if (!host) return;
    if (_state.subTab === 'checkin' && typeof window.renderEventDayCheckin === 'function') window.renderEventDayCheckin(host);
    else if (_state.subTab === 'schedule' && typeof window.renderEventDaySchedule === 'function') window.renderEventDaySchedule(host);
    else if (_state.subTab === 'manage' && typeof window.renderEventDayManage === 'function') window.renderEventDayManage(host);
    else host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">רכיב התת-לשונית לא נטען.</div>';
  }
  window.renderEventDaySubTab = renderActiveSubTab;
})();
