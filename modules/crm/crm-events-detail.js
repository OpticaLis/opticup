/* =============================================================================
   crm-events-detail.js — Event detail modal (B8 Tailwind rewrite — FINAL-03)
   Gradient header, capacity bar, KPI cards (from charts.js), 3 sub-tabs,
   grouped attendee list. Funnel + analytics live in crm-events-detail-charts.js.
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'attendees', label: 'משתתפים' },
    { key: 'messages',  label: 'הודעות' },
    { key: 'analytics', label: 'סטטיסטיקות' }
  ];

  var CLS_HEADER       = 'bg-gradient-to-br from-indigo-700 to-violet-900 text-white rounded-xl p-6 mb-4 shadow-lg relative overflow-hidden';
  var CLS_HEAD_BTN     = 'bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-3 py-1.5 rounded-lg backdrop-blur transition';
  var CLS_INFO_GRID    = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm';
  var CLS_CAP_BOX      = 'bg-white border border-slate-200 rounded-xl p-4 mb-4';
  var CLS_SUBTAB_BAR   = 'flex gap-2 border-b border-slate-200 mb-4 mt-4 overflow-x-auto';
  var CLS_SUBTAB       = 'px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 border-b-2 border-transparent transition';
  var CLS_SUBTAB_ACT   = 'px-4 py-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition';
  var CLS_ATT_ROW      = 'flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3';

  async function openCrmEventDetail(eventId) {
    if (!eventId || typeof Modal === 'undefined') return;
    var stats = typeof getCrmEventStatsById === 'function' ? getCrmEventStatsById(eventId) : null;
    var title = stats ? ('אירוע #' + (stats.event_number || '?') + ' — ' + (stats.name || '')) : 'אירוע';

    var modal = Modal.show({
      title: title, size: 'lg',
      content: '<div class="text-center text-slate-400 py-10">טוען פרטי אירוע...</div>'
    });

    try {
      var data = await fetchDetail(eventId);
      var body = modal.el.querySelector('.modal-body');
      if (body) {
        body.innerHTML = renderDetail(data.event, stats, data.attendees);
        wireSubTabs(body, data.event, stats, data.attendees);
        wireEventDayEntry(modal, body);
        wireStatusChange(modal, body, data.event, stats);
        wireExtraCouponsEdit(modal, body, data.event, data.attendees);
        wireInviteWaitingList(modal, body, data.event);
        (function(b){ if(b && window.CrmEventEdit) b.addEventListener('click',function(){ CrmEventEdit.open(data.event,function(u){ Object.assign(data.event,u); if(modal.close) modal.close(); }); }); })(body.querySelector('button[data-action="edit-event"]'));
        if (window.CrmEventSendMessage && CrmEventSendMessage.wire) CrmEventSendMessage.wire(body, data.event, data.attendees);
      }
    } catch (e) {
      console.error('event detail failed:', e);
      var body2 = modal.el.querySelector('.modal-body');
      if (body2) body2.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.openCrmEventDetail = openCrmEventDetail;

  async function fetchDetail(eventId) {
    var tid = getTenantId();
    var evQ = sb.from('crm_events')
      .select('id, event_number, name, event_date, start_time, end_time, location_address, location_waze_url, status, max_capacity, booking_fee, coupon_code, max_coupons, extra_coupons, registration_form_url, notes')
      .eq('id', eventId).eq('is_deleted', false);
    if (tid) evQ = evQ.eq('tenant_id', tid);
    var attQ = sb.from('v_crm_event_attendees_full')
      .select('id, lead_id, event_id, full_name, phone, email, status, status_name, status_color, purchase_amount, checked_in_at, registered_at, cancelled_at, coupon_sent, booking_fee_paid, scheduled_time')
      .eq('event_id', eventId).eq('is_deleted', false).order('full_name');
    if (tid) attQ = attQ.eq('tenant_id', tid);
    var r = await Promise.all([evQ, attQ]);
    if (r[0].error) throw new Error('event: ' + r[0].error.message);
    if (r[1].error) throw new Error('attendees: ' + r[1].error.message);
    return { event: (r[0].data && r[0].data[0]) || null, attendees: r[1].data || [] };
  }

  function renderDetail(event, stats, attendees) {
    if (!event) return '<div class="text-center text-slate-400 py-8">האירוע לא נמצא</div>';
    var statusInfo = CrmHelpers.getStatusInfo('event', event.status);
    var timeRange = [event.start_time, event.end_time].filter(Boolean).map(function (t) { return String(t).slice(0, 5); }).join('–');
    var wazeHtml = event.location_waze_url ? ' · <a href="' + escapeHtml(event.location_waze_url) + '" target="_blank" class="underline text-white/90 hover:text-white">Waze</a>' : '';
    var maxCoupons = +event.max_coupons || 0;
    var extraCoupons = +event.extra_coupons || 0;
    var couponCeiling = maxCoupons + extraCoupons;
    var couponsSent = (attendees || []).filter(function (a) { return a.coupon_sent && a.status !== 'cancelled'; }).length;
    var hasWaitingList = (attendees || []).some(function (a) { return a.status === 'waiting_list'; });

    var h = '';
    // Gradient header
    h += '<div class="' + CLS_HEADER + '">' +
      '<div class="text-xs uppercase tracking-wider opacity-80">אירועים › #' + escapeHtml(String(event.event_number || '?')) + '</div>' +
      '<h2 class="text-2xl font-black mt-1 mb-2">' + escapeHtml(event.name || '') + '</h2>' +
      '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur" data-role="event-status-badge">' + escapeHtml(statusInfo.label) + '</span>' +
      '<div class="flex flex-wrap gap-2 mt-4">' +
        '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="send-message">שלח הודעה</button>' +
        '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="change-status">שנה סטטוס</button>' +
        '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="edit-event">✏️ ערוך פרטים</button>' +
        '<button type="button" class="' + CLS_HEAD_BTN + '">ייצוא Excel</button>' +
        '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="edit-extra-coupons">➕ הגדר קופונים נוספים</button>' +
        (hasWaitingList
          ? '<button type="button" class="' + CLS_HEAD_BTN + ' bg-sky-500/90 hover:bg-sky-500" data-action="invite-waiting-list">📩 הזמן סופית את רשימת הממתינים</button>'
          : '') +
        '<button type="button" class="' + CLS_HEAD_BTN + ' bg-amber-500/90 hover:bg-amber-500" data-event-day-id="' + escapeHtml(event.id) + '">מצב יום אירוע</button>' +
      '</div>' +
      '<div class="' + CLS_INFO_GRID + '">' +
        '<div class="bg-white/10 rounded-lg px-3 py-2"><span class="opacity-80">📅 תאריך:</span> ' + escapeHtml(CrmHelpers.formatDate(event.event_date)) + ' ' + escapeHtml(timeRange) + '</div>' +
        '<div class="bg-white/10 rounded-lg px-3 py-2"><span class="opacity-80">📍 מיקום:</span> ' + escapeHtml(event.location_address || '—') + wazeHtml + '</div>' +
        '<div class="bg-white/10 rounded-lg px-3 py-2"><span class="opacity-80">🎟️ קופון:</span> ' + escapeHtml(event.coupon_code || '—') + '</div>' +
        '<div class="bg-white/10 rounded-lg px-3 py-2" data-role="coupon-info"><span class="opacity-80">🎫 קופונים:</span> ' + couponsSent + ' / ' + couponCeiling + (extraCoupons > 0 ? ' <span class="opacity-80">(+' + extraCoupons + ' נוספים)</span>' : '') + '</div>' +
      '</div>' +
    '</div>';

    if (stats) h += renderCapacityBar(stats, event.max_capacity);
    h += renderCouponFunnel(attendees) + '<div id="crm-event-detail-kpis"></div><div id="crm-event-detail-funnel" data-admin-only></div>';
    var subTabBtns = SUB_TABS.map(function (t, i) { return '<button type="button" class="' + (i === 0 ? CLS_SUBTAB_ACT : CLS_SUBTAB) + '" data-event-subtab="' + t.key + '">' + escapeHtml(t.label) + '</button>'; }).join('');
    return h + '<div class="' + CLS_SUBTAB_BAR + '">' + subTabBtns + '</div><div id="crm-event-detail-subbody">' + renderSubTab('attendees', attendees, stats) + '</div>';
  }

  function renderCapacityBar(stats, maxCapacity) {
    var reg = +stats.total_registered || 0, conf = +stats.total_confirmed || 0, att = +stats.total_attended || 0;
    var cap = +maxCapacity || 0 || Math.max(reg, 1);
    var regPct  = Math.min(100, Math.round(reg  / cap * 100));
    var confPct = Math.min(100, Math.round(conf / cap * 100));
    var attPct  = Math.min(100, Math.round(att  / cap * 100));
    var spotsLeft = Math.max(0, cap - reg);
    return '<div class="' + CLS_CAP_BOX + '">' +
      '<div class="flex items-center justify-between mb-2 text-sm font-medium text-slate-700">' +
        '<span>תפוסה: ' + reg + ' → ' + conf + ' → ' + att + ' מתוך ' + cap + '</span>' +
        '<span class="text-indigo-600">' + spotsLeft + ' מקומות פנויים</span>' +
      '</div>' +
      '<div class="flex h-6 rounded-lg overflow-hidden bg-slate-100">' +
        '<div class="bg-gradient-to-r from-indigo-500 to-indigo-400 flex items-center justify-center text-white text-xs font-semibold" style="width:' + regPct + '%">' + (regPct > 8 ? reg : '') + '</div>' +
        '<div class="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white text-xs font-semibold" style="width:' + Math.max(0, confPct - regPct) + '%">' + (confPct - regPct > 8 ? conf : '') + '</div>' +
        '<div class="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-xs font-semibold" style="width:' + Math.max(0, attPct - confPct) + '%">' + (attPct - confPct > 8 ? att : '') + '</div>' +
      '</div>' +
      '<div class="flex gap-4 mt-3 text-xs">' +
        '<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-indigo-500"></span>נרשמו (' + reg + ')</span>' +
        '<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500"></span>אישרו (' + conf + ')</span>' +
        '<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-500"></span>הגיעו (' + att + ')</span>' +
      '</div>' +
    '</div>';
  }

  function renderCouponFunnel(attendees) {
    var wc = (attendees || []).filter(function (a) { return a.coupon_sent && a.status !== 'cancelled'; });
    if (!wc.length) return '';
    var arr = 0, pur = 0, noShow = [];
    wc.forEach(function (a) { if (a.checked_in_at) arr++; else noShow.push(a); if (+a.purchase_amount > 0) pur++; });
    var cb = 'flex-1 min-w-[110px] rounded-lg p-4 text-center text-white shadow-sm bg-gradient-to-br';
    var arrow = '<div class="text-2xl text-slate-400 shrink-0">→</div>';
    function card(grad, n, lbl) { return '<div class="' + cb + ' ' + grad + '"><div class="text-3xl font-black tabular-nums">' + n + '</div><div class="text-xs mt-1 opacity-90">' + lbl + '</div></div>'; }
    var cards = '<div class="flex items-center gap-2 sm:gap-3 mb-4 overflow-x-auto">' +
      card('from-indigo-500 to-indigo-600', wc.length, 'קיבלו קופון') + arrow +
      card('from-emerald-500 to-emerald-600', arr, 'הגיעו') + arrow +
      card('from-amber-500 to-amber-600', pur, 'רכשו') + '</div>';
    var nsBlock = '';
    if (noShow.length) {
      var yes = '<span class="text-emerald-600 font-bold">✓</span>', th = 'px-3 py-2 font-semibold text-slate-700';
      var rows = noShow.map(function (a) {
        return '<tr><td class="px-3 py-2 text-slate-800">' + escapeHtml(a.full_name || '') + '</td>' +
          '<td class="px-3 py-2 text-slate-600" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</td>' +
          '<td class="px-3 py-2 text-center">' + (a.booking_fee_paid ? yes : '<span class="text-slate-400">✗</span>') + '</td><td class="px-3 py-2 text-center">' + yes + '</td></tr>';
      }).join('');
      nsBlock = '<div class="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3 text-sm font-semibold text-amber-800">⚠️ ' + noShow.length + ' קיבלו קופון ולא הגיעו</div>' +
        '<div class="overflow-x-auto border border-slate-200 rounded-lg"><table class="w-full text-sm"><thead><tr class="bg-slate-50">' +
        '<th class="' + th + ' text-start">שם</th><th class="' + th + ' text-start">טלפון</th><th class="' + th + ' text-center">פיקדון</th><th class="' + th + ' text-center">קופון</th>' +
        '</tr></thead><tbody class="divide-y divide-slate-100">' + rows + '</tbody></table></div>';
    }
    return '<details class="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden"><summary class="flex items-center justify-between px-4 py-3 cursor-pointer font-semibold text-slate-800 hover:bg-slate-50 select-none" style="list-style:none">' +
      '<span>🎫 מעקב קופונים</span><span class="text-slate-400 text-sm">▾</span></summary>' +
      '<div class="border-t border-slate-200 p-4">' + cards + nsBlock + '</div></details>';
  }

  function renderSubTab(key, attendees, stats) {
    if (key === 'attendees') {
      return '<div class="flex justify-end mb-3">' +
          '<button type="button" id="crm-register-lead-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition shadow-sm">רשום משתתף +</button>' +
        '</div>' + renderAttendeesGrouped(attendees);
    }
    if (key === 'messages')  return '<div class="text-center text-slate-400 py-8">ציר הודעות לאירוע — בקרוב</div>';
    if (key === 'analytics') return '<div id="crm-event-detail-analytics"></div>';
    return '';
  }

  function renderAttendeesGrouped(attendees) {
    if (!attendees.length) return '<div class="text-center text-slate-400 py-8">אין משתתפים</div>';
    var groups = {};
    attendees.forEach(function (a) {
      var k = a.status || 'other';
      if (!groups[k]) groups[k] = [];
      groups[k].push(a);
    });
    var html = '<div class="space-y-4">';
    Object.keys(groups).forEach(function (slug) {
      var info = CrmHelpers.getStatusInfo('attendee', slug);
      html += '<div>' +
        '<div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-2 border-s-4" style="border-inline-start-color:' + escapeHtml(info.color) + '">' +
          '<span class="font-semibold text-slate-700">' + escapeHtml(info.label) + '</span>' +
          '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style="background:' + escapeHtml(info.color) + '">' + groups[slug].length + '</span>' +
        '</div>' +
        '<div class="space-y-2">';
      groups[slug].slice(0, 40).forEach(function (a) {
        var ini = (a.full_name || '?').trim().charAt(0);
        var amount = a.purchase_amount ? ' <span class="text-emerald-600 font-semibold" data-admin-only>' + escapeHtml(CrmHelpers.formatCurrency(a.purchase_amount)) + '</span>' : '';
        var fee = a.booking_fee_paid ? ' <span class="inline-block text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded" title="פיקדון שולם">💰</span>' : '';
        html += '<div class="' + CLS_ATT_ROW + '">' +
          '<div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shrink-0">' + escapeHtml(ini) + '</div>' +
          '<div class="flex-1 min-w-0"><div class="font-semibold text-slate-800 text-sm truncate">' + escapeHtml(a.full_name || '') + amount + fee + '</div>' +
            '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div></div>' +
          '<div>' + CrmHelpers.statusBadgeHtml('attendee', a.status) + '</div>' +
        '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function wireRegisterButton(body, event, reloadDetail) {
    var btn = body.querySelector('#crm-register-lead-btn');
    if (!btn || !window.CrmEventRegister) return;
    btn.addEventListener('click', function () {
      CrmEventRegister.openRegisterLeadModal(event.id, function () {
        if (typeof reloadDetail === 'function') reloadDetail();
      });
    });
  }

  function wireSubTabs(body, event, stats, attendees) {
    if (stats && typeof window.renderEventDetailKpiSparklines === 'function') {
      window.renderEventDetailKpiSparklines(body.querySelector('#crm-event-detail-kpis'), stats);
    }
    if (stats && typeof window.renderEventDetailFunnelSvg === 'function') {
      window.renderEventDetailFunnelSvg(body.querySelector('#crm-event-detail-funnel'), stats);
    }
    var reloadDetail = function () {
      if (typeof openCrmEventDetail === 'function') {
        // close then reopen to refresh attendees
        if (typeof Modal !== 'undefined' && Modal.close) Modal.close();
        setTimeout(function () { openCrmEventDetail(event.id); }, 50);
      }
    };
    wireRegisterButton(body, event, reloadDetail);
    body.querySelectorAll('[data-event-subtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.querySelectorAll('[data-event-subtab]').forEach(function (b) {
          b.className = (b === btn) ? CLS_SUBTAB_ACT : CLS_SUBTAB;
        });
        var key = btn.getAttribute('data-event-subtab');
        var host = body.querySelector('#crm-event-detail-subbody');
        if (!host) return;
        host.innerHTML = renderSubTab(key, attendees, stats);
        if (key === 'attendees') wireRegisterButton(body, event, reloadDetail);
        if (key === 'analytics' && typeof window.renderEventDetailAnalytics === 'function') {
          window.renderEventDetailAnalytics(body.querySelector('#crm-event-detail-analytics'), stats, attendees);
        }
      });
    });
  }

  function wireStatusChange(modal, body, event, stats) {
    var btn = body.querySelector('button[data-action="change-status"]');
    if (!btn || !window.CrmEventActions) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      CrmEventActions.openEventStatusDropdown(btn, event.status, async function (newStatus) {
        try {
          await CrmEventActions.changeEventStatus(event.id, newStatus);
          event.status = newStatus;
          var info = CrmHelpers.getStatusInfo('event', newStatus);
          var badge = body.querySelector('[data-role="event-status-badge"]');
          if (badge) badge.textContent = info.label;
          if (window.Toast) Toast.success('סטטוס עודכן: ' + info.label);
          if (typeof window.reloadCrmEventsTab === 'function') reloadCrmEventsTab();
        } catch (err) {
          if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
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
      if (typeof modal.close === 'function') modal.close(); else if (typeof Modal.close === 'function') Modal.close();
      if (typeof showCrmTab === 'function') showCrmTab('event-day');
    });
  }

  function wireExtraCouponsEdit(modal, body, event, attendees) {
    var btn = body.querySelector('button[data-action="edit-extra-coupons"]');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var current = +event.extra_coupons || 0;
      var raw = window.prompt('כמות קופונים נוספת (מעבר ל-' + (+event.max_coupons || 0) + '):', String(current));
      if (raw == null) return;
      var next = parseInt(String(raw).trim(), 10);
      if (!isFinite(next) || next < 0) { if (window.Toast) Toast.error('ערך לא תקין'); return; }
      if (next === current) return;
      var { error } = await sb.from('crm_events')
        .update({ extra_coupons: next })
        .eq('id', event.id).eq('tenant_id', getTenantId());
      if (error) { if (window.Toast) Toast.error('עדכון נכשל: ' + error.message); return; }
      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.event.extra_coupons_update', entity_type: 'crm_events', entity_id: event.id, details: { from: current, to: next } }); } catch (_) {}
      event.extra_coupons = next;
      var maxC = +event.max_coupons || 0;
      var sent = (attendees || []).filter(function (a) { return a.coupon_sent && a.status !== 'cancelled'; }).length;
      var cell = body.querySelector('[data-role="coupon-info"]');
      if (cell) {
        cell.innerHTML = '<span class="opacity-80">🎫 קופונים:</span> ' + sent + ' / ' + (maxC + next) +
          (next > 0 ? ' <span class="opacity-80">(+' + next + ' נוספים)</span>' : '');
      }
      if (window.Toast) Toast.success('קופונים נוספים: ' + next);
    });
  }

  function wireInviteWaitingList(modal, body, event) {
    var btn = body.querySelector('button[data-action="invite-waiting-list"]');
    if (!btn || !window.CrmEventActions) return;
    btn.addEventListener('click', function () {
      if (typeof Modal === 'undefined' || typeof Modal.confirm !== 'function') return;
      Modal.confirm({
        title: 'הזמן סופית את רשימת הממתינים',
        message: 'תישלח הזמנת הצטרפות לכל מי שכרגע ברשימת ההמתנה של האירוע. להמשיך?',
        confirmText: 'שלח הזמנה',
        onConfirm: async function () {
          var original = btn.textContent;
          btn.disabled = true; btn.textContent = 'שולח...';
          try {
            await CrmEventActions.changeEventStatus(event.id, 'invite_waiting_list');
            event.status = 'invite_waiting_list';
            var info = CrmHelpers.getStatusInfo('event', 'invite_waiting_list');
            var badge = body.querySelector('[data-role="event-status-badge"]');
            if (badge && info) badge.textContent = info.label;
            if (window.Toast) Toast.success('הזמנות נשלחו לרשימת ההמתנה');
          } catch (e) {
            if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
            btn.disabled = false; btn.textContent = original;
          }
        }
      });
    });
  }

})();
