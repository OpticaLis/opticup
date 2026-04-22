/* =============================================================================
   crm-event-register.js — Register Tier 2 lead to event (P2b)
   Load order: after shared.js, crm-helpers.js, crm-event-actions.js.
   Uses Modal, Toast, CrmHelpers. Calls register_lead_to_event RPC.
   Writes: crm_event_attendees (via RPC). Every write carries tenant_id
   (Rule 22) — handled inside the RPC.
   Exports window.CrmEventRegister:
     openRegisterLeadModal, registerLeadToEvent.
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  async function searchTier2Leads(term) {
    var tenantId = tid();
    var tier2 = window.TIER2_STATUSES || [];
    var q = sb.from('crm_leads')
      .select('id, full_name, phone, email, status')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .in('status', tier2);
    if (term) {
      var t = term.trim();
      if (t) q = q.or('full_name.ilike.%' + t + '%,phone.ilike.%' + t + '%,email.ilike.%' + t + '%');
    }
    q = q.order('full_name').limit(20);
    var res = await q;
    if (res.error) throw new Error('leads search failed: ' + res.error.message);
    return res.data || [];
  }

  async function registerLeadToEvent(leadId, eventId, method) {
    var tenantId = tid();
    var res = await sb.rpc('register_lead_to_event', {
      p_tenant_id: tenantId,
      p_lead_id: leadId,
      p_event_id: eventId,
      p_method: method || 'manual'
    });
    if (res.error) throw new Error('register_lead_to_event: ' + res.error.message);
    return res.data;
  }

  async function dispatchRegistrationConfirmation(leadId, lead, eventId, regStatus) {
    if (!window.CrmMessaging || !CrmMessaging.sendMessage || !lead) return;
    var tplBase = regStatus === 'waiting_list' ? 'event_waiting_list_confirmation' : 'event_registration_confirmation';
    var tenantId = tid();
    var evRes = await sb.from('crm_events').select('name, event_date, start_time, location_address')
      .eq('id', eventId).eq('tenant_id', tenantId).single();
    if (evRes.error || !evRes.data) return;
    var e = evRes.data;
    var date = (CrmHelpers && CrmHelpers.formatDate) ? CrmHelpers.formatDate(e.event_date) : (e.event_date || '');
    var vars = {
      event_name: e.name || '', event_date: date, event_time: e.start_time || '', event_location: e.location_address || '',
      name: lead.full_name || '', phone: lead.phone || '', email: lead.email || ''
    };
    CrmMessaging.sendMessage({ leadId: leadId, channel: 'sms', templateSlug: tplBase, variables: vars, eventId: eventId, language: 'he' });
    if (lead.email) CrmMessaging.sendMessage({ leadId: leadId, channel: 'email', templateSlug: tplBase, variables: vars, eventId: eventId, language: 'he' });
  }

  function renderLeadRow(lead) {
    var phone = (CrmHelpers && CrmHelpers.formatPhone) ? CrmHelpers.formatPhone(lead.phone) : (lead.phone || '');
    return '<button type="button" class="w-full text-start bg-white border border-slate-200 rounded-lg p-3 hover:bg-indigo-50 hover:border-indigo-300 transition flex items-center gap-3" data-lead-id="' + escapeHtml(lead.id) + '">' +
      '<div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shrink-0">' + escapeHtml((lead.full_name || '?').trim().charAt(0)) + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-semibold text-slate-800 text-sm truncate">' + escapeHtml(lead.full_name || '') + '</div>' +
        '<div class="text-xs text-slate-500" style="direction:ltr;text-align:end">' + escapeHtml(phone) + '</div>' +
      '</div>' +
    '</button>';
  }

  function toastResponse(resp) {
    if (!window.Toast) return;
    if (resp && resp.success && resp.status === 'registered') Toast.success('נרשם בהצלחה');
    else if (resp && resp.success && resp.status === 'waiting_list') Toast.warning('נרשם לרשימת המתנה (אירוע מלא)');
    else if (resp && resp.error === 'already_registered') Toast.info('כבר רשום לאירוע');
    else if (resp && resp.error === 'event_not_found') Toast.error('אירוע לא נמצא');
    else Toast.error('תגובה לא צפויה: ' + JSON.stringify(resp));
  }

  function openRegisterLeadModal(eventId, onRegistered) {
    if (typeof Modal === 'undefined') return;
    var modal = Modal.show({
      title: 'רישום משתתף לאירוע',
      size: 'md',
      content:
        '<div class="space-y-3">' +
          '<input type="text" id="crm-register-lead-search" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="חיפוש לפי שם / טלפון / אימייל...">' +
          '<p class="text-xs text-slate-500">רק לידים ב-Tier 2 (ממתינים לאירוע, הוזמנו, אישרו) מוצגים.</p>' +
          '<div id="crm-register-lead-results" class="space-y-2 max-h-[50vh] overflow-y-auto"><div class="text-center text-slate-400 py-6">טוען...</div></div>' +
        '</div>'
    });

    var input = modal.el.querySelector('#crm-register-lead-search');
    var results = modal.el.querySelector('#crm-register-lead-results');

    async function doSearch(term) {
      results.innerHTML = '<div class="text-center text-slate-400 py-4">טוען...</div>';
      try {
        var leads = await searchTier2Leads(term);
        if (!leads.length) {
          results.innerHTML = '<div class="text-center text-slate-400 py-6">לא נמצאו לידים ב-Tier 2 התואמים לחיפוש</div>';
          return;
        }
        results.innerHTML = leads.map(renderLeadRow).join('');
        results.querySelectorAll('[data-lead-id]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            btn.disabled = true; btn.classList.add('opacity-60');
            try {
              var leadId = btn.getAttribute('data-lead-id');
              var lead = leads.find(function (l) { return l.id === leadId; });
              var resp = await registerLeadToEvent(leadId, eventId, 'manual');
              toastResponse(resp);
              if (resp && resp.success && (resp.status === 'registered' || resp.status === 'waiting_list')) {
                dispatchRegistrationConfirmation(leadId, lead, eventId, resp.status);
              }
              if (typeof modal.close === 'function') modal.close();
              if (typeof onRegistered === 'function') onRegistered(resp);
            } catch (err) {
              if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
              btn.disabled = false; btn.classList.remove('opacity-60');
            }
          });
        });
      } catch (e) {
        results.innerHTML = '<div class="text-rose-600 py-4">שגיאה: ' + escapeHtml(e.message) + '</div>';
      }
    }

    var debounce = null;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { doSearch(input.value); }, 200);
    });
    doSearch('');
    setTimeout(function () { input.focus(); }, 100);
  }

  window.CrmEventRegister = {
    openRegisterLeadModal: openRegisterLeadModal,
    registerLeadToEvent: registerLeadToEvent
  };
})();
