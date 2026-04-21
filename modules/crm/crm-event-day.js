/* =============================================================================
   crm-event-day.js — Event Day main (B8 Tailwind rewrite — FINAL-05)
   Header bar + 5 gradient counter cards + sub-tab nav + body shell.
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'checkin',  label: '✅ כניסות' },
    { key: 'schedule', label: '🕐 זמנים' },
    { key: 'manage',   label: '📋 ניהול' }
  ];

  // Tailwind class constants
  var CLS_HEADER      = 'flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 mb-4';
  var CLS_BACK_BTN    = 'px-3 py-1.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition';
  var CLS_TITLE       = 'flex-1 text-xl font-bold text-slate-900 flex items-center gap-3';
  var CLS_CLOCK       = 'inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums';
  var CLS_COUNTER_BAR = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4';
  var CLS_COUNTER     = 'relative overflow-hidden rounded-xl p-4 text-white shadow-md bg-gradient-to-br';
  var CLS_SUBTAB_BAR  = 'flex gap-1 bg-white rounded-t-xl border border-slate-200 p-2 border-b-0';
  var CLS_SUBTAB      = 'px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition';
  var CLS_SUBTAB_ACT  = 'px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg transition';
  var CLS_BODY        = 'bg-white rounded-b-xl border border-slate-200 p-4';

  var COUNTER_VARIANTS = {
    blue:    'from-sky-500 to-sky-600',
    violet:  'from-violet-500 to-violet-600',
    green:   'from-emerald-500 to-emerald-600',
    gold:    'from-amber-500 to-amber-600',
    emerald: 'from-teal-500 to-teal-600'
  };

  var _state = { eventId: null, event: null, attendees: [], stats: null, subTab: 'checkin' };
  var _clockInterval = null;
  window.getEventDayState = function () { return _state; };

  async function loadCrmEventDay() {
    var panel = document.getElementById('tab-event-day');
    if (!panel) return;
    var eventId = window._currentEventDayId;
    if (!eventId) {
      panel.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">לא נבחר אירוע. חזור ללשונית האירועים ובחר אירוע.</div>';
      return;
    }
    if (_state.eventId !== eventId) {
      _state = { eventId: eventId, event: null, attendees: [], stats: null, subTab: 'checkin' };
    }
    panel.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">טוען מצב יום אירוע...</div>';

    try {
      await ensureCrmStatusCache();
      await fetchAllEventDayData();
      renderLayout(panel);
      renderActiveSubTab();
    } catch (e) {
      console.error('event day load failed:', e);
      panel.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-rose-500 font-semibold">שגיאה: ' + escapeHtml(e.message || String(e)) + '</div>';
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
      return '<button type="button" class="' + (_state.subTab === t.key ? CLS_SUBTAB_ACT : CLS_SUBTAB) + '" data-subtab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="' + CLS_HEADER + '">' +
        '<button type="button" class="' + CLS_BACK_BTN + '" id="crm-eventday-back">◂ חזרה לאירועים</button>' +
        '<div class="' + CLS_TITLE + '">' + title +
          (subDate ? ' <span class="text-sm font-normal text-slate-500">' + escapeHtml(subDate) + '</span>' : '') +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<span class="' + CLS_CLOCK + '"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span id="crm-eventday-clock"></span></span>' +
          '<button type="button" class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition" id="crm-eventday-role-toggle">החלף תפקיד</button>' +
        '</div>' +
      '</div>' +
      '<div class="' + CLS_COUNTER_BAR + '" id="crm-eventday-stats"></div>' +
      '<div class="' + CLS_SUBTAB_BAR + '">' + subTabHtml + '</div>' +
      '<div class="' + CLS_BODY + '" id="crm-eventday-body"></div>';

    renderStatsBar();
    startClock();

    var backBtn = document.getElementById('crm-eventday-back');
    if (backBtn) backBtn.addEventListener('click', function () { stopClock(); window._currentEventDayId = null; showCrmTab('events'); });

    var roleBtn = document.getElementById('crm-eventday-role-toggle');
    if (roleBtn) roleBtn.addEventListener('click', function () { if (typeof window.toggleCrmRole === 'function') window.toggleCrmRole(); });

    panel.querySelectorAll('[data-subtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-subtab');
        if (!key || key === _state.subTab) return;
        _state.subTab = key;
        panel.querySelectorAll('[data-subtab]').forEach(function (b) {
          var isActive = b.getAttribute('data-subtab') === key;
          b.className = isActive ? CLS_SUBTAB_ACT : CLS_SUBTAB;
        });
        renderActiveSubTab();
      });
    });
  }

  function renderStatsBar() {
    var el = document.getElementById('crm-eventday-stats');
    if (!el) return;
    var s = _state.stats || {};
    var reg  = +s.total_registered || 0, conf = +s.total_confirmed || 0;
    var att  = +s.total_attended   || 0, prc  = +s.total_purchased  || 0;
    var rev  = +s.total_revenue    || 0;

    el.innerHTML =
      counterCard(reg,  'נרשמו', 'blue') +
      counterCard(conf, 'אישרו', 'violet') +
      counterCard(att,  'הגיעו', 'green') +
      counterCard(prc,  'רכשו',  'gold') +
      '<div data-admin-only>' + counterCard(CrmHelpers.formatCurrency(rev), 'הכנסות', 'emerald') + '</div>';
  }

  function counterCard(value, label, variant) {
    var grad = COUNTER_VARIANTS[variant] || COUNTER_VARIANTS.blue;
    return '<div class="' + CLS_COUNTER + ' ' + grad + '">' +
      '<div class="text-3xl font-black tracking-tight tabular-nums">' + escapeHtml(String(value)) + '</div>' +
      '<div class="text-xs font-semibold uppercase tracking-wider opacity-90 mt-1">' + escapeHtml(label) + '</div>' +
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
    else host.innerHTML = '<div class="text-center text-slate-400 py-8">רכיב התת-לשונית לא נטען.</div>';
  }
  window.renderEventDaySubTab = renderActiveSubTab;
})();
