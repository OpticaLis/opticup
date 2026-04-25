/* =============================================================================
   crm-event-day-manage.js — Manage sub-tab + Arrived column widget + Purchase modal
   (B8 Tailwind rewrite — FINAL-05)
   ============================================================================= */
(function () {
  'use strict';

  var CLS_TABLE        = 'w-full text-sm bg-white';
  var CLS_TH           = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD           = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';
  var CLS_INPUT        = 'px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_LINK_BTN     = 'text-xs text-indigo-600 font-medium hover:text-indigo-800 hover:underline';
  var CLS_TOGGLE_ON    = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700';
  var CLS_TOGGLE_OFF   = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
  var CLS_ARR_CARD     = 'bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-amber-400 hover:shadow-sm transition';
  var CLS_ARR_PURCH    = 'bg-emerald-50 border border-emerald-300 rounded-lg p-3';
  var CLS_PURCH_BADGE  = 'inline-block mt-2 text-xs bg-amber-500 text-white font-semibold px-2 py-1 rounded-full';
  var CLS_AMOUNT_DISP  = 'inline-block mt-2 text-sm bg-emerald-600 text-white font-bold px-2 py-1 rounded-md';
  var CLS_RUNNING_TOT  = 'mt-4 pt-3 border-t-2 border-emerald-300 flex justify-between items-center bg-emerald-100 rounded-lg px-3 py-2';

  var _filter = '';
  var _statusFilter = '';
  var _editingId = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }

  /* ----------------------------------- MANAGE SUB-TAB ----------------------------------- */

  function renderEventDayManage(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="flex flex-wrap gap-2 mb-3">' +
        '<input type="search" id="crm-eventday-manage-search" class="' + CLS_INPUT + ' flex-1 min-w-[200px]" placeholder="חיפוש שם או טלפון..." value="' + escapeHtml(_filter) + '">' +
        '<select id="crm-eventday-manage-status" class="' + CLS_INPUT + '"><option value="">כל הסטטוסים</option></select>' +
      '</div>' +
      '<div id="crm-eventday-manage-table" class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"></div>';
    populateStatusFilter();
    wireFilters();
    renderTable();
  }
  window.renderEventDayManage = renderEventDayManage;

  function populateStatusFilter() {
    var sel = document.getElementById('crm-eventday-manage-status');
    if (!sel) return;
    var state = window.getEventDayState();
    CrmHelpers.distinctValues(state.attendees, 'status').forEach(function (slug) {
      var info = CrmHelpers.getStatusInfo('attendee', slug);
      var opt = document.createElement('option');
      opt.value = slug; opt.textContent = info.label;
      if (_statusFilter === slug) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function wireFilters() {
    var s = document.getElementById('crm-eventday-manage-search');
    var t = document.getElementById('crm-eventday-manage-status');
    if (s) s.addEventListener('input', function () { _filter = s.value || ''; renderTable(); });
    if (t) t.addEventListener('change', function () { _statusFilter = t.value || ''; renderTable(); });
  }

  function renderTable() {
    var wrap = document.getElementById('crm-eventday-manage-table');
    if (!wrap) return;
    var state = window.getEventDayState();
    var rows = filterRows(state.attendees);
    if (!rows.length) { wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין משתתפים להצגה</div>'; return; }

    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">שם</th>' +
      '<th class="' + CLS_TH + '">טלפון</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '" data-admin-only>רכישה</th>' +
      '<th class="' + CLS_TH + '">קופון</th>' +
      '<th class="' + CLS_TH + '">דמי הזמנה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td class="' + CLS_TD + ' font-medium text-slate-900">' + escapeHtml(r.full_name || '') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td class="' + CLS_TD + '">' + CrmHelpers.statusBadgeHtml('attendee', r.status) + '</td>' +
        '<td class="' + CLS_TD + '" data-admin-only>' + purchaseCell(r) + '</td>' +
        '<td class="' + CLS_TD + '">' + couponCell(r) + '</td>' +
        '<td class="' + CLS_TD + '">' + feeCell(r) + '</td>' +
      '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
    wireRowActions(wrap);
  }

  function filterRows(all) {
    var s = _filter.trim().toLowerCase();
    return (all || []).filter(function (r) {
      if (_statusFilter && r.status !== _statusFilter) return false;
      if (s && (r.full_name || '').toLowerCase().indexOf(s) === -1 && (r.phone || '').toLowerCase().indexOf(s) === -1) return false;
      return true;
    });
  }

  function purchaseCell(r) {
    if (_editingId === r.id) {
      return '<input type="number" min="0" step="1" class="' + CLS_INPUT + ' w-24" data-save-purchase="' + escapeHtml(r.id) + '" value="' + escapeHtml(String(r.purchase_amount == null ? '' : r.purchase_amount)) + '" autofocus>' +
        ' <button type="button" class="' + CLS_LINK_BTN + ' ms-1" data-cancel-edit="' + escapeHtml(r.id) + '">ביטול</button>';
    }
    var valTxt = r.purchase_amount != null && +r.purchase_amount > 0 ? CrmHelpers.formatCurrency(r.purchase_amount) : '—';
    return '<span class="font-semibold text-emerald-700">' + escapeHtml(valTxt) + '</span>' +
      ' <button type="button" class="' + CLS_LINK_BTN + ' ms-1" data-edit-purchase="' + escapeHtml(r.id) + '">ערוך</button>';
  }
  function couponCell(r) {
    if (!r.coupon_sent) return '<button type="button" class="' + CLS_TOGGLE_OFF + '" data-toggle-coupon="' + escapeHtml(r.id) + '">שלח</button>';
    return r.checked_in_at
      ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ הגיע</span>'
      : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⚠️ לא הגיע</span>';
  }
  function feeCell(r) {
    return (r.payment_status === 'paid')
      ? '<button type="button" class="' + CLS_TOGGLE_ON + '" disabled>✅ שולם</button>'
      : '<button type="button" class="' + CLS_TOGGLE_OFF + '" data-toggle-fee="' + escapeHtml(r.id) + '">שולם</button>';
  }

  function wireRowActions(wrap) {
    wrap.querySelectorAll('[data-edit-purchase]').forEach(function (b) { b.addEventListener('click', function () { _editingId = b.getAttribute('data-edit-purchase'); renderTable(); }); });
    wrap.querySelectorAll('[data-cancel-edit]').forEach(function (b) { b.addEventListener('click', function () { _editingId = null; renderTable(); }); });
    wrap.querySelectorAll('input[data-save-purchase]').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); savePurchase(inp); } else if (e.key === 'Escape') { _editingId = null; renderTable(); } });
      inp.addEventListener('blur', function () { setTimeout(function () { savePurchase(inp); }, 150); });
    });
    wrap.querySelectorAll('[data-toggle-coupon]').forEach(function (b) { b.addEventListener('click', function () { toggleCoupon(b.getAttribute('data-toggle-coupon'), b); }); });
    wrap.querySelectorAll('[data-toggle-fee]').forEach(function (b) { b.addEventListener('click', function () { toggleFee(b.getAttribute('data-toggle-fee'), b); }); });
  }

  /* ----------------------------------- ARRIVED COLUMN ----------------------------------- */

  function renderEventDayArrivedColumn(host) {
    if (!host) return;
    var state = window.getEventDayState();
    var arrived = (state.attendees || []).filter(function (a) { return a.checked_in_at && a.status !== 'cancelled'; });
    var waitingPurchase = arrived.filter(function (a) { return !(+a.purchase_amount > 0); });
    var purchased = arrived.filter(function (a) { return +a.purchase_amount > 0; });

    var totalRevenue = purchased.reduce(function (sum, a) { return sum + (+a.purchase_amount || 0); }, 0);
    var headerTxt = '<div class="flex items-center justify-between mb-2 font-bold text-slate-800"><span>✅ הגיעו (' + arrived.length + ')</span></div>';

    var pendHtml = '<div class="font-semibold text-amber-700 text-sm mt-2 mb-2">ממתינים לקנייה (' + waitingPurchase.length + ')</div>' +
      '<div class="space-y-2">' +
      (waitingPurchase.length ? waitingPurchase.map(function (a) {
        return '<div class="' + CLS_ARR_CARD + '" data-open-purchase="' + escapeHtml(a.id) + '">' +
          '<div class="font-semibold text-slate-900 text-sm truncate">' + escapeHtml(a.full_name || '') + '</div>' +
          '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
          '<span class="' + CLS_PURCH_BADGE + '">💰 הזן סכום</span>' +
        '</div>';
      }).join('') : '<div class="text-center text-slate-400 py-2 text-sm">—</div>') +
      '</div>';

    var purchHtml = '<div class="font-semibold text-emerald-700 text-sm mt-4 mb-2">רכישות (' + purchased.length + ')</div>' +
      '<div class="space-y-2">' +
      (purchased.length ? purchased.map(function (a) {
        return '<div class="' + CLS_ARR_PURCH + '">' +
          '<div class="font-semibold text-slate-900 text-sm truncate">' + escapeHtml(a.full_name || '') + '</div>' +
          '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
          '<span class="' + CLS_AMOUNT_DISP + '" data-admin-only>' + escapeHtml(CrmHelpers.formatCurrency(a.purchase_amount)) + '</span>' +
        '</div>';
      }).join('') : '<div class="text-center text-slate-400 py-2 text-sm">—</div>') +
      '</div>';

    var running = '<div class="' + CLS_RUNNING_TOT + '" data-admin-only>' +
      '<span class="font-semibold text-emerald-900 text-sm">הכנסות היום</span>' +
      '<span class="text-xl font-black text-emerald-900 tabular-nums">' + escapeHtml(CrmHelpers.formatCurrency(totalRevenue)) + '</span>' +
    '</div>';

    host.innerHTML = headerTxt + pendHtml + purchHtml + running;
    host.querySelectorAll('[data-open-purchase]').forEach(function (el) {
      el.addEventListener('click', function () { openPurchaseAmountModal(el.getAttribute('data-open-purchase')); });
    });
  }
  window.renderEventDayArrivedColumn = renderEventDayArrivedColumn;

  /* ----------------------------------- PURCHASE AMOUNT MODAL ----------------------------------- */

  function openPurchaseAmountModal(id) {
    if (!id || typeof Modal === 'undefined') return;
    var state = window.getEventDayState();
    var a = (state.attendees || []).find(function (x) { return x.id === id; });
    if (!a) return;
    var content = '<div class="text-center py-2">' +
      '<div class="text-lg font-bold text-slate-800 mb-3">' + escapeHtml(a.full_name || '') + '</div>' +
      '<label class="block text-sm font-medium text-slate-700 mb-2">סכום רכישה (₪)</label>' +
      '<input type="number" id="purchase-amount" class="w-full px-4 py-3 text-3xl text-center border-2 border-emerald-400 rounded-xl focus:ring-4 focus:ring-emerald-200 bg-white font-black tabular-nums" min="0" step="1" value="' + escapeHtml(String(a.purchase_amount || '')) + '" placeholder="0" style="direction:ltr">' +
    '</div>';
    var modal = Modal.show({ title: 'רכישה — ' + (a.full_name || ''), size: 'sm', content: content });
    var input = modal.el.querySelector('#purchase-amount');
    if (input) { setTimeout(function () { input.focus(); input.select(); }, 50); }
    var footer = modal.el.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML =
        '<button type="button" class="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-sm" id="purchase-save">שמור</button>' +
        '<button type="button" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition" id="purchase-cancel">ביטול</button>';
      footer.querySelector('#purchase-save').addEventListener('click', function () {
        savePurchaseAmount(id, +input.value, modal);
      });
      footer.querySelector('#purchase-cancel').addEventListener('click', function () { if (modal.close) modal.close(); });
    }
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); savePurchaseAmount(id, +input.value, modal); } });
  }
  window.openPurchaseAmountModal = openPurchaseAmountModal;

  async function savePurchaseAmount(id, amount, modal) {
    if (!isFinite(amount) || amount < 0) { toast('error', 'סכום לא תקין'); return; }
    var state = window.getEventDayState();
    var a = (state.attendees || []).find(function (x) { return x.id === id; });
    if (!a) return;
    var patch = { purchase_amount: amount };
    if (amount > 0 && a.status !== 'purchased') patch.status = 'purchased';
    if (amount > 0 && !a.purchased_at) patch.purchased_at = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees').update(patch).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', 'שמירה נכשלה: ' + error.message); return; }
    logActivity('crm.attendee.purchase_update', id, { amount: amount });
    Object.assign(a, patch);
    if (window.refreshEventDayStats) await window.refreshEventDayStats();
    if (window.renderEventDayArrivedRefresh) window.renderEventDayArrivedRefresh();
    if (modal && modal.close) modal.close();
    if (window.showEventDayNotification) window.showEventDayNotification('💰 נשמרה רכישה: ' + CrmHelpers.formatCurrency(amount), 'success');
  }

  async function savePurchase(inp) {
    var id = inp.getAttribute('data-save-purchase');
    if (!id || _editingId !== id) return;
    var raw = inp.value;
    if (raw === '' || raw == null) { _editingId = null; renderTable(); return; }
    var amount = +raw;
    if (!isFinite(amount) || amount < 0) { toast('error', 'סכום לא תקין'); return; }
    var state = window.getEventDayState();
    var a = (state.attendees || []).find(function (x) { return x.id === id; });
    if (!a) { _editingId = null; renderTable(); return; }
    if ((+a.purchase_amount || 0) === amount) { _editingId = null; renderTable(); return; }
    var patch = { purchase_amount: amount };
    if (amount > 0 && a.status !== 'purchased') patch.status = 'purchased';
    if (amount > 0 && !a.purchased_at) patch.purchased_at = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees').update(patch).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', 'שמירה נכשלה: ' + error.message); return; }
    logActivity('crm.attendee.purchase_update', id, { amount: amount });
    Object.assign(a, patch);
    _editingId = null;
    if (window.refreshEventDayStats) await window.refreshEventDayStats();
    renderTable();
    toast('success', '✅ נשמר');
  }

  async function toggleCoupon(id, btn) {
    var state = window.getEventDayState();
    var ev = state.event || {};
    var attendees = state.attendees || [];
    var target = attendees.find(function (a) { return a.id === id; });
    if (!target) return;

    // Defensive re-send guard. UI hides the "שלח" button once coupon_sent=true
    // (see couponCell), so this path is not reachable from the rendered table
    // today; it protects programmatic callers and any future re-send button.
    if (target.coupon_sent) {
      var when = target.coupon_sent_at ? new Date(target.coupon_sent_at).toLocaleString('he-IL') : '—';
      if (!confirm('הקופון כבר נשלח ב-' + when + '. לשלוח שוב?')) return;
    } else {
      var totalSent = attendees.filter(function (a) { return a.coupon_sent && a.status !== 'cancelled'; }).length;
      var ceiling = (ev.max_coupons != null ? +ev.max_coupons : 50) + (+ev.extra_coupons || 0);
      if (totalSent >= ceiling) {
        toast('error', 'הגעת למכסת הקופונים (' + ceiling + '). הגדל כמות קופונים נוספת אם יש צורך.');
        return;
      }
    }

    if (!ev.coupon_code) {
      toast('error', 'לאירוע לא הוגדר קוד קופון. הגדר קוד קופון לאירוע לפני השליחה.');
      return;
    }
    if (!window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') {
      toast('error', 'CrmMessaging אינו זמין');
      return;
    }
    if (!target.phone && !target.email) {
      toast('error', 'למשתתף חסרים טלפון ואימייל — לא ניתן לשלוח קופון.');
      return;
    }

    if (!window.CrmCouponDispatch || typeof CrmCouponDispatch.dispatch !== 'function') {
      toast('error', 'CrmCouponDispatch אינו זמין');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    var dispatch = await CrmCouponDispatch.dispatch(target, ev);
    if (!dispatch.anyOk) {
      if (btn) { btn.disabled = false; btn.textContent = 'שלח'; }
      toast('error', 'שליחה נכשלה: SMS ' + (dispatch.smsError || '—') + ' | Email ' + (dispatch.emailError || '—'));
      return;
    }

    // Flag update happens AFTER at least one channel succeeds — never before.
    var nowIso = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees')
      .update({ coupon_sent: true, coupon_sent_at: nowIso })
      .eq('id', id).eq('tenant_id', getTenantId());
    if (error) {
      toast('warning', 'נשלח, אך שמירת דגל נכשלה: ' + error.message);
      if (btn) { btn.disabled = false; }
      return;
    }
    logActivity('crm.attendee.coupon_sent', id, {
      sms_ok: dispatch.smsOk, email_ok: dispatch.emailOk,
      sms_log_id: dispatch.smsLogId, email_log_id: dispatch.emailLogId
    });
    updateLocal(id, { coupon_sent: true, coupon_sent_at: nowIso });
    toast(dispatch.allOk ? 'success' : 'warning', 'הקופון נשלח: ' + dispatch.summary);
    if (window.CrmCouponDispatch && typeof CrmCouponDispatch.checkAndAutoClose === 'function') {
      try {
        var ac = await CrmCouponDispatch.checkAndAutoClose(ev);
        if (ac && ac.closed) { ev.status = 'closed'; toast('success', 'האירוע עבר ל"נסגר" — כל הקופונים הונפקו'); }
      } catch (e) { console.error('autoClose:', e); }
    }
    renderTable();
  }

  async function toggleFee(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    var nowIso = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees').update({ payment_status: 'paid', paid_at: nowIso }).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', error.message); if (btn) { btn.disabled = false; btn.textContent = 'שולם'; } return; }
    logActivity('crm.attendee.fee_paid', id);
    updateLocal(id, { payment_status: 'paid', paid_at: nowIso });
    renderTable();
  }

  function updateLocal(id, patch) {
    var state = window.getEventDayState();
    (state.attendees || []).forEach(function (a) { if (a.id === id) Object.assign(a, patch); });
  }

  function logActivity(action, entityId, metadata) {
    if (window.ActivityLog && ActivityLog.write) {
      try { ActivityLog.write({ action: action, entity_type: 'crm_event_attendees', entity_id: entityId, severity: 'info', metadata: Object.assign({ event_id: window.getEventDayState().eventId }, metadata || {}) }); } catch (_) {}
    }
  }
})();
