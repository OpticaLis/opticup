/* =============================================================================
   crm-event-actions.js — CRM event mutation helpers + UI flows (P2b)
   Load order: after shared.js, crm-helpers.js. Uses Modal, Toast, CrmHelpers.
   Exports window.CrmEventActions:
     openCreateEventModal, createEvent.
   Writes: crm_events (INSERT). Every write carries tenant_id: getTenantId()
   (Rule 22). Auto-numbering via next_crm_event_number RPC (Rule 11).
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  // ---- Create ----

  async function loadCampaigns() {
    var tenantId = tid();
    var q = sb.from('crm_campaigns')
      .select('id, slug, name, default_location, default_hours, default_max_capacity, default_booking_fee')
      .eq('is_active', true);
    if (tenantId) q = q.eq('tenant_id', tenantId);
    q = q.order('name');
    var res = await q;
    if (res.error) throw new Error('campaigns load failed: ' + res.error.message);
    return res.data || [];
  }

  async function createEvent(data) {
    var tenantId = tid();
    if (!tenantId) throw new Error('tenant not resolved');
    if (!data.campaign_id) throw new Error('campaign required');

    var rpc = await sb.rpc('next_crm_event_number', {
      p_tenant_id: tenantId,
      p_campaign_id: data.campaign_id
    });
    if (rpc.error) throw new Error('next_crm_event_number: ' + rpc.error.message);
    var eventNumber = rpc.data;

    var row = {
      tenant_id: tenantId,
      campaign_id: data.campaign_id,
      event_number: eventNumber,
      name: data.name,
      event_date: data.event_date,
      start_time: data.start_time || '09:00',
      end_time: data.end_time || '14:00',
      location_address: data.location_address,
      location_waze_url: data.location_waze_url || null,
      max_capacity: data.max_capacity != null ? data.max_capacity : 50,
      booking_fee: data.booking_fee != null ? data.booking_fee : 50,
      coupon_code: data.coupon_code
    };
    var ins = await sb.from('crm_events').insert(row).select('id, event_number').single();
    if (ins.error) throw new Error('event insert failed: ' + ins.error.message);
    return ins.data;
  }

  function renderCreateForm(campaigns) {
    var camp0 = campaigns[0] || {};
    var campOptions = campaigns.map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name || c.slug) + '</option>';
    }).join('');

    // Default date = tomorrow (YYYY-MM-DD)
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var yyyy = tomorrow.getFullYear();
    var mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    var dd = String(tomorrow.getDate()).padStart(2, '0');
    var defaultDate = yyyy + '-' + mm + '-' + dd;

    var inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
    var labelCls = 'block text-sm font-semibold text-slate-700 mb-1';

    return '<form id="crm-create-event-form" class="space-y-3">' +
      '<div><label class="' + labelCls + '">קמפיין</label>' +
      '<select name="campaign_id" class="' + inputCls + '" required>' + campOptions + '</select></div>' +
      '<div><label class="' + labelCls + '">שם אירוע</label>' +
      '<input type="text" name="name" class="' + inputCls + '" required placeholder="אירוע #X"></div>' +
      '<div class="grid grid-cols-3 gap-2">' +
      '<div class="col-span-1"><label class="' + labelCls + '">תאריך</label>' +
      '<input type="date" name="event_date" class="' + inputCls + '" value="' + defaultDate + '" required></div>' +
      '<div><label class="' + labelCls + '">התחלה</label>' +
      '<input type="time" name="start_time" class="' + inputCls + '" value="09:00"></div>' +
      '<div><label class="' + labelCls + '">סיום</label>' +
      '<input type="time" name="end_time" class="' + inputCls + '" value="14:00"></div>' +
      '</div>' +
      '<div><label class="' + labelCls + '">מיקום</label>' +
      '<input type="text" name="location_address" class="' + inputCls + '" required value="' + escapeHtml(camp0.default_location || '') + '" placeholder="כתובת מלאה"></div>' +
      '<div><label class="' + labelCls + '">קישור Waze (אופציונלי)</label>' +
      '<input type="url" name="location_waze_url" class="' + inputCls + '" placeholder="https://waze.com/..."></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="' + labelCls + '">קיבולת מקסימלית</label>' +
      '<input type="number" name="max_capacity" class="' + inputCls + '" value="' + (camp0.default_max_capacity || 50) + '" min="1" required></div>' +
      '<div><label class="' + labelCls + '">דמי רישום (₪)</label>' +
      '<input type="number" name="booking_fee" class="' + inputCls + '" value="' + (camp0.default_booking_fee || 50) + '" min="0" step="0.01" required></div>' +
      '</div>' +
      '<div><label class="' + labelCls + '">קוד קופון</label>' +
      '<input type="text" name="coupon_code" class="' + inputCls + '" required placeholder="SUPERSALE5"></div>' +
      '<div id="crm-create-event-error" class="text-sm text-rose-600 font-semibold hidden"></div>' +
      '</form>';
  }

  async function openCreateEventModal(onCreated) {
    if (typeof Modal === 'undefined') { if (window.Toast) Toast.error('Modal לא זמין'); return; }
    var modal = Modal.show({
      title: 'יצירת אירוע חדש',
      size: 'md',
      content: '<div class="text-center text-slate-400 py-8">טוען קמפיינים...</div>'
    });

    var campaigns;
    try {
      campaigns = await loadCampaigns();
    } catch (e) {
      var body0 = modal.el.querySelector('.modal-body');
      if (body0) body0.innerHTML = '<div class="text-rose-600 py-4">שגיאה בטעינה: ' + escapeHtml(e.message) + '</div>';
      return;
    }
    if (!campaigns.length) {
      var body1 = modal.el.querySelector('.modal-body');
      if (body1) body1.innerHTML = '<div class="text-amber-700 py-4">אין קמפיינים פעילים. יש ליצור קמפיין לפני יצירת אירוע.</div>';
      return;
    }

    var body = modal.el.querySelector('.modal-body');
    if (!body) return;
    body.innerHTML = renderCreateForm(campaigns);

    var footer = modal.el.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML =
        '<button type="button" id="crm-create-event-submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-sm">צור אירוע</button>' +
        '<button type="button" id="crm-create-event-cancel" class="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition">ביטול</button>';

      footer.querySelector('#crm-create-event-cancel').addEventListener('click', function () {
        if (typeof modal.close === 'function') modal.close();
      });

      // Re-seed location default when campaign changes
      var form = body.querySelector('#crm-create-event-form');
      var campSel = form.querySelector('[name="campaign_id"]');
      campSel.addEventListener('change', function () {
        var picked = campaigns.find(function (c) { return c.id === campSel.value; }) || {};
        var locInput = form.querySelector('[name="location_address"]');
        var capInput = form.querySelector('[name="max_capacity"]');
        var feeInput = form.querySelector('[name="booking_fee"]');
        if (locInput && !locInput.value) locInput.value = picked.default_location || '';
        if (capInput) capInput.value = picked.default_max_capacity || 50;
        if (feeInput) feeInput.value = picked.default_booking_fee || 50;
      });

      footer.querySelector('#crm-create-event-submit').addEventListener('click', async function () {
        var errBox = body.querySelector('#crm-create-event-error');
        errBox.classList.add('hidden');
        var fd = new FormData(form);
        var data = {
          campaign_id: fd.get('campaign_id'),
          name: (fd.get('name') || '').trim(),
          event_date: fd.get('event_date'),
          start_time: fd.get('start_time'),
          end_time: fd.get('end_time'),
          location_address: (fd.get('location_address') || '').trim(),
          location_waze_url: (fd.get('location_waze_url') || '').trim(),
          max_capacity: parseInt(fd.get('max_capacity'), 10),
          booking_fee: parseFloat(fd.get('booking_fee')),
          coupon_code: (fd.get('coupon_code') || '').trim()
        };
        if (!data.name || !data.event_date || !data.location_address || !data.coupon_code) {
          errBox.textContent = 'שדות חובה חסרים';
          errBox.classList.remove('hidden');
          return;
        }
        var submit = footer.querySelector('#crm-create-event-submit');
        submit.disabled = true; submit.textContent = 'יוצר...';
        try {
          var created = await createEvent(data);
          if (window.Toast) Toast.success('אירוע #' + created.event_number + ' נוצר');
          if (typeof modal.close === 'function') modal.close();
          if (typeof onCreated === 'function') onCreated(created);
        } catch (e) {
          errBox.textContent = 'שגיאה: ' + (e.message || String(e));
          errBox.classList.remove('hidden');
          submit.disabled = false; submit.textContent = 'צור אירוע';
        }
      });
    }
  }

  // ---- Status change ----

  function eventStatusLabel(slug) {
    var info = (CrmHelpers && CrmHelpers.getStatusInfo) ? CrmHelpers.getStatusInfo('event', slug) : null;
    return (info && info.label) || slug || '';
  }

  async function changeEventStatus(eventId, newStatus) {
    var tenantId = tid();
    var upd = await sb.from('crm_events')
      .update({ status: newStatus })
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .select('id, status')
      .single();
    if (upd.error) throw new Error('event status update failed: ' + upd.error.message);
    return upd.data;
  }

  function closeEventStatusDropdown() {
    var existing = document.getElementById('crm-event-status-dropdown');
    if (existing) existing.remove();
  }

  function openEventStatusDropdown(anchorEl, currentStatus, onPick) {
    closeEventStatusDropdown();
    var all = (window.CRM_STATUSES && window.CRM_STATUSES._all) || [];
    var eventRows = all.filter(function (r) { return r.entity_type === 'event'; });
    var menu = document.createElement('div');
    menu.id = 'crm-event-status-dropdown';
    menu.className = 'bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px] max-h-[60vh] overflow-y-auto';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';

    var rows = 0;
    eventRows.forEach(function (r) {
      if (r.slug === currentStatus) return;
      rows++;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-start px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 text-slate-700';
      btn.innerHTML =
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' +
          escapeHtml(r.color || '#9ca3af') + '"></span>' +
        '<span>' + escapeHtml(r.name_he || r.slug) + '</span>';
      btn.addEventListener('click', function () {
        closeEventStatusDropdown();
        if (typeof onPick === 'function') onPick(r.slug);
      });
      menu.appendChild(btn);
    });
    if (!rows) {
      var empty = document.createElement('div');
      empty.className = 'px-3 py-2 text-sm text-slate-500';
      empty.textContent = 'אין סטטוסים זמינים';
      menu.appendChild(empty);
    }

    var rect = anchorEl.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.insetInlineStart = rect.left + 'px';
    document.body.appendChild(menu);

    setTimeout(function () {
      document.addEventListener('click', function onDoc(e) {
        if (!menu.contains(e.target)) {
          closeEventStatusDropdown();
          document.removeEventListener('click', onDoc);
        }
      });
    }, 50);
  }

  window.CrmEventActions = {
    openCreateEventModal: openCreateEventModal,
    createEvent: createEvent,
    changeEventStatus: changeEventStatus,
    openEventStatusDropdown: openEventStatusDropdown,
    closeEventStatusDropdown: closeEventStatusDropdown
  };
})();
