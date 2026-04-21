/* =============================================================================
   crm-lead-actions.js — CRM lead mutation helpers + UI flows (P2a)
   Load order: after shared.js, crm-helpers.js. Uses Modal, Toast, CrmHelpers.
   Exports window.CrmLeadActions:
     changeLeadStatus, bulkChangeStatus, addLeadNote, transferLeadToTier2,
     openStatusDropdown, openBulkStatusPicker, leadTier.
   Writes: crm_leads.status (UPDATE) + crm_lead_notes (INSERT), both on
   current tenant. Every write carries tenant_id: getTenantId() (Rule 22).
   ============================================================================= */
(function () {
  'use strict';

  function tid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  function statusLabel(slug) {
    var info = (CrmHelpers && CrmHelpers.getStatusInfo) ? CrmHelpers.getStatusInfo('lead', slug) : null;
    return (info && info.label) || slug || '';
  }

  // Returns 1 or 2 based on TIER1_STATUSES / TIER2_STATUSES; defaults to 1.
  function leadTier(status) {
    var t1 = window.TIER1_STATUSES || [];
    var t2 = window.TIER2_STATUSES || [];
    if (t2.indexOf(status) !== -1) return 2;
    if (t1.indexOf(status) !== -1) return 1;
    return 1;
  }

  // ---- Core writes ----

  async function changeLeadStatus(leadId, newStatus, oldStatus, opts) {
    opts = opts || {};
    var tenantId = tid();
    var upd = await sb.from('crm_leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();
    if (upd.error) throw new Error('status update failed: ' + upd.error.message);

    var content = 'סטטוס שונה מ-' + statusLabel(oldStatus) + ' ל-' + statusLabel(newStatus);
    var noteIns = await sb.from('crm_lead_notes').insert({
      tenant_id: tenantId,
      lead_id: leadId,
      content: content
    });
    if (noteIns.error) throw new Error('status note insert failed: ' + noteIns.error.message);

    if (!opts.silent && window.Toast) Toast.success('סטטוס עודכן: ' + statusLabel(newStatus));
    return { id: leadId, status: newStatus, noteContent: content };
  }

  async function bulkChangeStatus(leadIds, newStatus) {
    var tenantId = tid();
    var results = { ok: 0, fail: [] };
    // Fetch current statuses in one query to write accurate notes
    var fetch = await sb.from('crm_leads')
      .select('id, status')
      .in('id', leadIds)
      .eq('tenant_id', tenantId);
    if (fetch.error) {
      return { ok: 0, fail: leadIds.map(function (id) { return { id: id, err: fetch.error.message }; }) };
    }
    var byId = {};
    (fetch.data || []).forEach(function (r) { byId[r.id] = r.status; });

    for (var i = 0; i < leadIds.length; i++) {
      var id = leadIds[i];
      try {
        await changeLeadStatus(id, newStatus, byId[id] || '', { silent: true });
        results.ok++;
      } catch (e) {
        results.fail.push({ id: id, err: e.message || String(e) });
      }
    }
    return results;
  }

  async function addLeadNote(leadId, content) {
    if (!content || !content.trim()) throw new Error('empty note');
    var tenantId = tid();
    var res = await sb.from('crm_lead_notes')
      .insert({ tenant_id: tenantId, lead_id: leadId, content: content.trim() })
      .select('id, content, event_id, employee_id, created_at')
      .single();
    if (res.error) throw new Error('note insert failed: ' + res.error.message);
    return res.data;
  }

  async function transferLeadToTier2(leadId) {
    var tenantId = tid();
    var upd = await sb.from('crm_leads')
      .update({ status: 'waiting', updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();
    if (upd.error) throw new Error('transfer failed: ' + upd.error.message);
    var noteIns = await sb.from('crm_lead_notes').insert({
      tenant_id: tenantId,
      lead_id: leadId,
      content: 'הועבר ל-Tier 2 (אושר)'
    });
    if (noteIns.error) throw new Error('transfer note failed: ' + noteIns.error.message);
    return { id: leadId, status: 'waiting' };
  }

  // ---- Individual status dropdown (anchored to a DOM element) ----

  function closeStatusDropdown() {
    var existing = document.getElementById('crm-status-dropdown');
    if (existing) existing.remove();
  }

  function openStatusDropdown(anchorEl, tier, currentStatus, onPick) {
    closeStatusDropdown();
    var tierStatuses = (tier === 2) ? (window.TIER2_STATUSES || []) : (window.TIER1_STATUSES || []);
    var labels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    var menu = document.createElement('div');
    menu.id = 'crm-status-dropdown';
    menu.className = 'bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';

    var rows = 0;
    tierStatuses.forEach(function (slug) {
      if (slug === currentStatus) return;
      var info = labels[slug];
      if (!info) return;
      rows++;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-start px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 text-slate-700';
      btn.innerHTML =
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' +
          escapeHtml(info.color || '#9ca3af') + '"></span>' +
        '<span>' + escapeHtml(info.name_he || slug) + '</span>';
      btn.addEventListener('click', function () {
        closeStatusDropdown();
        if (typeof onPick === 'function') onPick(slug);
      });
      menu.appendChild(btn);
    });
    if (!rows) {
      var empty = document.createElement('div');
      empty.className = 'px-3 py-2 text-sm text-slate-500';
      empty.textContent = 'אין סטטוסים זמינים';
      menu.appendChild(empty);
    }

    var r = anchorEl.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.insetInlineStart = r.left + 'px';
    document.body.appendChild(menu);

    setTimeout(function () {
      document.addEventListener('click', function onDoc(e) {
        if (!menu.contains(e.target)) {
          closeStatusDropdown();
          document.removeEventListener('click', onDoc);
        }
      });
    }, 50);
  }

  // ---- Bulk status picker (modal) ----

  function openBulkStatusPicker(leadIds, tier, onDone) {
    if (!leadIds || !leadIds.length) return;
    if (typeof Modal === 'undefined') return;

    var tierStatuses = (tier === 2) ? (window.TIER2_STATUSES || []) : (window.TIER1_STATUSES || []);
    var labels = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};

    var btnsHtml = tierStatuses.map(function (slug) {
      var info = labels[slug];
      if (!info) return '';
      return '<button type="button" class="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-indigo-50 hover:border-indigo-300 flex items-center gap-2 text-slate-700" data-pick-status="' + escapeHtml(slug) + '">' +
        '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + escapeHtml(info.color || '#9ca3af') + '"></span>' +
        '<span>' + escapeHtml(info.name_he || slug) + '</span>' +
      '</button>';
    }).filter(Boolean).join('');

    var body =
      '<div class="space-y-3">' +
        '<p class="text-sm text-slate-700">בחר סטטוס חדש עבור <strong>' + leadIds.length + '</strong> לידים:</p>' +
        '<div class="grid grid-cols-2 gap-2">' + btnsHtml + '</div>' +
      '</div>';

    var modal = Modal.show({
      title: 'שינוי סטטוס',
      size: 'sm',
      content: body
    });

    modal.el.querySelectorAll('[data-pick-status]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var slug = btn.getAttribute('data-pick-status');
        modal.el.querySelectorAll('[data-pick-status]').forEach(function (b) { b.disabled = true; });
        btn.textContent = 'מעדכן...';
        try {
          var res = await bulkChangeStatus(leadIds, slug);
          if (typeof modal.close === 'function') modal.close();
          if (window.Toast) {
            var msg = 'עודכנו ' + res.ok + ' מתוך ' + leadIds.length + ' לידים';
            if (res.fail.length) msg += ' · ' + res.fail.length + ' נכשלו';
            (res.fail.length ? Toast.warning : Toast.success)(msg);
          }
          if (typeof onDone === 'function') onDone(res);
        } catch (e) {
          if (window.Toast) Toast.error('שגיאה: ' + (e.message || String(e)));
          modal.el.querySelectorAll('[data-pick-status]').forEach(function (b) { b.disabled = false; });
          btn.textContent = labels[slug] && labels[slug].name_he || slug;
        }
      });
    });
  }

  window.CrmLeadActions = {
    changeLeadStatus: changeLeadStatus,
    bulkChangeStatus: bulkChangeStatus,
    addLeadNote: addLeadNote,
    transferLeadToTier2: transferLeadToTier2,
    openStatusDropdown: openStatusDropdown,
    closeStatusDropdown: closeStatusDropdown,
    openBulkStatusPicker: openBulkStatusPicker,
    leadTier: leadTier
  };
})();
