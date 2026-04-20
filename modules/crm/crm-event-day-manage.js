/* =============================================================================
   crm-event-day-manage.js — Attendee management sub-tab
   Inline edit purchase_amount, toggle coupon_sent, toggle booking_fee_paid.
   Writes directly to crm_event_attendees with tenant_id defense (Rule 22).
   Depends on: shared.js, CrmHelpers, crm-event-day.js (state + refresh)
   Exports: window.renderEventDayManage(hostEl)
   ============================================================================= */
(function () {
  'use strict';

  var _filter = '';
  var _statusFilter = '';
  var _editingId = null;

  function renderEventDayManage(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="crm-filter-bar">' +
        '<input type="search" id="crm-eventday-manage-search" class="crm-search" placeholder="חיפוש שם או טלפון..." value="' + escapeHtml(_filter) + '">' +
        '<select id="crm-eventday-manage-status"><option value="">כל הסטטוסים</option></select>' +
      '</div>' +
      '<div id="crm-eventday-manage-table" class="crm-table-wrap"></div>';

    populateStatusFilter();
    wireFilters();
    renderTable();
  }
  window.renderEventDayManage = renderEventDayManage;

  function populateStatusFilter() {
    var sel = document.getElementById('crm-eventday-manage-status');
    if (!sel) return;
    var state = window.getEventDayState();
    var slugs = CrmHelpers.distinctValues(state.attendees, 'status');
    slugs.forEach(function (slug) {
      var info = CrmHelpers.getStatusInfo('attendee', slug);
      var opt = document.createElement('option');
      opt.value = slug;
      opt.textContent = info.label;
      if (_statusFilter === slug) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function wireFilters() {
    var search = document.getElementById('crm-eventday-manage-search');
    var statusSel = document.getElementById('crm-eventday-manage-status');
    if (search) search.addEventListener('input', function () { _filter = search.value || ''; renderTable(); });
    if (statusSel) statusSel.addEventListener('change', function () { _statusFilter = statusSel.value || ''; renderTable(); });
  }

  function renderTable() {
    var wrap = document.getElementById('crm-eventday-manage-table');
    if (!wrap) return;
    var state = window.getEventDayState();
    var rows = filterRows(state.attendees);

    if (!rows.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין משתתפים להצגה</div>';
      return;
    }

    var html = '<table class="crm-table"><thead><tr>' +
      '<th>שם</th><th>טלפון</th><th>סטטוס</th><th>רכישה</th><th>קופון</th><th>דמי הזמנה</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (r) {
      html += '<tr class="readonly">' +
        '<td>' + escapeHtml(r.full_name || '') + '</td>' +
        '<td style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(r.phone)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('attendee', r.status) + '</td>' +
        '<td>' + purchaseCell(r) + '</td>' +
        '<td>' + couponCell(r) + '</td>' +
        '<td>' + feeCell(r) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wireRowActions(wrap);
  }

  function filterRows(all) {
    var s = _filter.trim().toLowerCase();
    return (all || []).filter(function (r) {
      if (_statusFilter && r.status !== _statusFilter) return false;
      if (s) {
        var name = (r.full_name || '').toLowerCase();
        var phone = (r.phone || '').toLowerCase();
        if (name.indexOf(s) === -1 && phone.indexOf(s) === -1) return false;
      }
      return true;
    });
  }

  function purchaseCell(r) {
    if (_editingId === r.id) {
      var cur = r.purchase_amount != null ? r.purchase_amount : '';
      return '<input type="number" min="0" step="1" class="crm-eventday-manage-input" data-save-purchase="' + escapeHtml(r.id) + '" value="' + escapeHtml(String(cur)) + '" autofocus>' +
        ' <button type="button" class="crm-eventday-manage-link" data-cancel-edit="' + escapeHtml(r.id) + '">ביטול</button>';
    }
    var valTxt = r.purchase_amount != null && Number(r.purchase_amount) > 0
      ? CrmHelpers.formatCurrency(r.purchase_amount)
      : '—';
    return escapeHtml(valTxt) +
      ' <button type="button" class="crm-eventday-manage-link" data-edit-purchase="' + escapeHtml(r.id) + '">ערוך</button>';
  }

  function couponCell(r) {
    if (r.coupon_sent) {
      return '<button type="button" class="crm-eventday-manage-toggle on" disabled>✅ נשלח</button>';
    }
    return '<button type="button" class="crm-eventday-manage-toggle" data-toggle-coupon="' + escapeHtml(r.id) + '">שלח</button>';
  }

  function feeCell(r) {
    if (r.booking_fee_paid) {
      return '<button type="button" class="crm-eventday-manage-toggle on" disabled>✅ שולם</button>';
    }
    return '<button type="button" class="crm-eventday-manage-toggle" data-toggle-fee="' + escapeHtml(r.id) + '">שולם</button>';
  }

  function wireRowActions(wrap) {
    wrap.querySelectorAll('button[data-edit-purchase]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _editingId = btn.getAttribute('data-edit-purchase');
        renderTable();
      });
    });
    wrap.querySelectorAll('button[data-cancel-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { _editingId = null; renderTable(); });
    });
    wrap.querySelectorAll('input[data-save-purchase]').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); savePurchase(inp); }
        else if (e.key === 'Escape') { _editingId = null; renderTable(); }
      });
      inp.addEventListener('blur', function () { setTimeout(function () { savePurchase(inp); }, 150); });
    });
    wrap.querySelectorAll('button[data-toggle-coupon]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-toggle-coupon');
        if (id) toggleCoupon(id, btn);
      });
    });
    wrap.querySelectorAll('button[data-toggle-fee]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-toggle-fee');
        if (id) toggleFee(id, btn);
      });
    });
  }

  async function savePurchase(inp) {
    var id = inp.getAttribute('data-save-purchase');
    if (!id || _editingId !== id) return;
    var raw = inp.value;
    if (raw === '' || raw == null) { _editingId = null; renderTable(); return; }
    var amount = Number(raw);
    if (!isFinite(amount) || amount < 0) { toast('error', 'סכום לא תקין'); return; }

    var state = window.getEventDayState();
    var current = (state.attendees || []).find(function (a) { return a.id === id; });
    if (!current) { _editingId = null; renderTable(); return; }
    if (Number(current.purchase_amount || 0) === amount) { _editingId = null; renderTable(); return; }

    var patch = { purchase_amount: amount };
    if (amount > 0 && current.status !== 'purchased') patch.status = 'purchased';
    if (amount > 0 && !current.purchased_at) patch.purchased_at = new Date().toISOString();

    var { error } = await sb.from('crm_event_attendees')
      .update(patch).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', 'שמירה נכשלה: ' + error.message); return; }

    logActivity('crm.attendee.purchase_update', id, { event_id: state.eventId, amount: amount });
    Object.assign(current, patch);
    _editingId = null;
    if (typeof window.refreshEventDayStats === 'function') await window.refreshEventDayStats();
    renderTable();
    toast('success', '✅ סכום רכישה נשמר');
  }

  async function toggleCoupon(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    var nowIso = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees')
      .update({ coupon_sent: true, coupon_sent_at: nowIso })
      .eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', 'שמירה נכשלה: ' + error.message); if (btn) { btn.disabled = false; btn.textContent = 'שלח'; } return; }
    logActivity('crm.attendee.coupon_sent', id, { event_id: window.getEventDayState().eventId });
    updateLocal(id, { coupon_sent: true, coupon_sent_at: nowIso });
    renderTable();
    toast('success', '✅ קופון סומן כנשלח');
  }

  async function toggleFee(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    var { error } = await sb.from('crm_event_attendees')
      .update({ booking_fee_paid: true })
      .eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', 'שמירה נכשלה: ' + error.message); if (btn) { btn.disabled = false; btn.textContent = 'שולם'; } return; }
    logActivity('crm.attendee.fee_paid', id, { event_id: window.getEventDayState().eventId });
    updateLocal(id, { booking_fee_paid: true });
    renderTable();
    toast('success', '✅ דמי הזמנה סומנו כששולמו');
  }

  function updateLocal(id, patch) {
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
