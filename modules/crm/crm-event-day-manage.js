/* =============================================================================
   crm-event-day-manage.js — Manage sub-tab + B7 arrived-column widget
   Exports:
     window.renderEventDayManage(host)         — full table view (sub-tab)
     window.renderEventDayArrivedColumn(host)  — right column for checkin layout
     window.openPurchaseAmountModal(id)        — ₪ amount modal (save/cancel)
   The arrived column shows two sections (ממתינים לקנייה + קנו) with
   arrived-card / purchase-badge / amount-display styling, plus an
   admin-only running-total bar at the bottom.
   ============================================================================= */
(function () {
  'use strict';

  var _filter = '';
  var _statusFilter = '';
  var _editingId = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }

  /* ----------------------------------- MANAGE SUB-TAB (table) ----------------------------------- */

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
    if (!rows.length) { wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין משתתפים להצגה</div>'; return; }

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
      return '<input type="number" min="0" step="1" class="crm-eventday-manage-input" data-save-purchase="' + escapeHtml(r.id) + '" value="' + escapeHtml(String(r.purchase_amount == null ? '' : r.purchase_amount)) + '" autofocus>' +
        ' <button type="button" class="crm-eventday-manage-link" data-cancel-edit="' + escapeHtml(r.id) + '">ביטול</button>';
    }
    var valTxt = r.purchase_amount != null && Number(r.purchase_amount) > 0 ? CrmHelpers.formatCurrency(r.purchase_amount) : '—';
    return '<span data-admin-only>' + escapeHtml(valTxt) + '</span>' +
      ' <button type="button" class="crm-eventday-manage-link" data-edit-purchase="' + escapeHtml(r.id) + '">ערוך</button>';
  }
  function couponCell(r) {
    return r.coupon_sent
      ? '<button type="button" class="crm-eventday-manage-toggle on" disabled>✅ נשלח</button>'
      : '<button type="button" class="crm-eventday-manage-toggle" data-toggle-coupon="' + escapeHtml(r.id) + '">שלח</button>';
  }
  function feeCell(r) {
    return r.booking_fee_paid
      ? '<button type="button" class="crm-eventday-manage-toggle on" disabled>✅ שולם</button>'
      : '<button type="button" class="crm-eventday-manage-toggle" data-toggle-fee="' + escapeHtml(r.id) + '">שולם</button>';
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

  /* ----------------------------------- ARRIVED COLUMN (B7 right col) ----------------------------------- */

  // criterion §2.29: arrived-card + purchase-badge + amount-display
  // criterion §2.32: running-total + data-admin-only
  function renderEventDayArrivedColumn(host) {
    if (!host) return;
    var state = window.getEventDayState();
    var arrived = (state.attendees || []).filter(function (a) { return a.checked_in_at && a.status !== 'cancelled'; });
    var waitingPurchase = arrived.filter(function (a) { return !(Number(a.purchase_amount) > 0); });
    var purchased = arrived.filter(function (a) { return Number(a.purchase_amount) > 0; });

    var totalRevenue = purchased.reduce(function (sum, a) { return sum + Number(a.purchase_amount || 0); }, 0);
    var headerTxt = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>✅ הגיעו (' + arrived.length + ')</strong></div>';

    var pendHtml = '<div style="font-weight:700;margin:8px 0 4px">ממתינים לקנייה (' + waitingPurchase.length + ')</div>' +
      (waitingPurchase.length ? waitingPurchase.map(function (a) {
        return '<div class="crm-arrived-card" data-open-purchase="' + escapeHtml(a.id) + '">' +
          '<div style="font-weight:600">' + escapeHtml(a.full_name || '') + '</div>' +
          '<div style="font-size:0.78rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
          '<span class="crm-purchase-badge">💰 הזן סכום</span>' +
        '</div>';
      }).join('') : '<div class="crm-detail-empty">—</div>');

    var purchHtml = '<div style="font-weight:700;margin:12px 0 4px">רכישות (' + purchased.length + ')</div>' +
      (purchased.length ? purchased.map(function (a) {
        return '<div class="crm-arrived-card purchased">' +
          '<div style="font-weight:600">' + escapeHtml(a.full_name || '') + '</div>' +
          '<div style="font-size:0.78rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(a.phone)) + '</div>' +
          '<span class="crm-amount-display" data-admin-only>' + escapeHtml(CrmHelpers.formatCurrency(a.purchase_amount)) + '</span>' +
        '</div>';
      }).join('') : '<div class="crm-detail-empty">—</div>');

    var running = '<div class="crm-running-total" data-admin-only><span>הכנסות היום</span><span class="amount">' + escapeHtml(CrmHelpers.formatCurrency(totalRevenue)) + '</span></div>';

    host.innerHTML = headerTxt + pendHtml + purchHtml + running;
    host.querySelectorAll('[data-open-purchase]').forEach(function (el) {
      el.addEventListener('click', function () { openPurchaseAmountModal(el.getAttribute('data-open-purchase')); });
    });
  }
  window.renderEventDayArrivedColumn = renderEventDayArrivedColumn;

  /* ----------------------------------- PURCHASE AMOUNT MODAL (§2.30) ----------------------------------- */

  function openPurchaseAmountModal(id) {
    if (!id || typeof Modal === 'undefined') return;
    var state = window.getEventDayState();
    var a = (state.attendees || []).find(function (x) { return x.id === id; });
    if (!a) return;
    var content = '<div class="purchase-modal">' +
      '<div style="text-align:center;font-size:1.1rem;font-weight:700;margin-bottom:10px">' + escapeHtml(a.full_name || '') + '</div>' +
      '<div class="crm-form-row">' +
        '<label style="display:block;text-align:center">סכום רכישה (₪)</label>' +
        '<input type="number" id="purchase-amount" class="crm-barcode-input" min="0" step="1" value="' + escapeHtml(String(a.purchase_amount || '')) + '" placeholder="0" style="font-size:1.6rem;text-align:center">' +
      '</div>' +
    '</div>';
    var modal = Modal.show({ title: 'רכישה — ' + (a.full_name || ''), size: 'sm', content: content,
      onClose: function () {} });
    var input = modal.el.querySelector('#purchase-amount');
    if (input) { setTimeout(function () { input.focus(); input.select(); }, 50); }
    var footer = modal.el.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = '<button type="button" class="crm-btn crm-btn-primary" id="purchase-save">שמור</button>' +
        '<button type="button" class="crm-btn crm-btn-secondary" id="purchase-cancel">ביטול</button>';
      footer.querySelector('#purchase-save').addEventListener('click', function () {
        var v = Number(input.value);
        savePurchaseAmount(id, v, modal);
      });
      footer.querySelector('#purchase-cancel').addEventListener('click', function () { if (modal.close) modal.close(); });
    }
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = Number(input.value); savePurchaseAmount(id, v, modal); } });
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
    var amount = Number(raw);
    if (!isFinite(amount) || amount < 0) { toast('error', 'סכום לא תקין'); return; }
    var state = window.getEventDayState();
    var a = (state.attendees || []).find(function (x) { return x.id === id; });
    if (!a) { _editingId = null; renderTable(); return; }
    if (Number(a.purchase_amount || 0) === amount) { _editingId = null; renderTable(); return; }
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
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    var nowIso = new Date().toISOString();
    var { error } = await sb.from('crm_event_attendees').update({ coupon_sent: true, coupon_sent_at: nowIso }).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', error.message); if (btn) { btn.disabled = false; btn.textContent = 'שלח'; } return; }
    logActivity('crm.attendee.coupon_sent', id);
    updateLocal(id, { coupon_sent: true, coupon_sent_at: nowIso });
    renderTable();
  }

  async function toggleFee(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    var { error } = await sb.from('crm_event_attendees').update({ booking_fee_paid: true }).eq('id', id).eq('tenant_id', getTenantId());
    if (error) { toast('error', error.message); if (btn) { btn.disabled = false; btn.textContent = 'שולם'; } return; }
    logActivity('crm.attendee.fee_paid', id);
    updateLocal(id, { booking_fee_paid: true });
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
