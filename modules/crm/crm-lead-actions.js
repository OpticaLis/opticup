/* =============================================================================
   crm-lead-actions.js — CRM lead mutation helpers (P2a + P3a)
   Load order: after shared.js, crm-helpers.js. Uses Toast, CrmHelpers.
   UI modal flows live in crm-lead-modals.js and extend the same
   window.CrmLeadActions namespace.
   Exports (writes + leadTier):
     changeLeadStatus, bulkChangeStatus, addLeadNote, createManualLead,
     transferLeadToTier2, leadTier.
   Writes: crm_leads (UPDATE/INSERT) + crm_lead_notes (INSERT), both on
   current tenant. Every write carries tenant_id: getTenantId() (Rule 22).
   ============================================================================= */
(function () {
  'use strict';

  function getTid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

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
    var tenantId = getTid();
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
    var tenantId = getTid();
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
    var tenantId = getTid();
    var res = await sb.from('crm_lead_notes')
      .insert({ tenant_id: tenantId, lead_id: leadId, content: content.trim() })
      .select('id, content, event_id, employee_id, created_at')
      .single();
    if (res.error) throw new Error('note insert failed: ' + res.error.message);
    return res.data;
  }

  async function createManualLead(data) {
    var tenantId = getTid();
    var fullName = (data.full_name || '').trim();
    var phone = (data.phone || '').trim();
    var email = (data.email || '').trim();
    if (!fullName) throw new Error('missing full_name');
    if (!phone) throw new Error('missing phone');
    if (!email) throw new Error('missing email');

    var payload = {
      tenant_id: tenantId,
      full_name: fullName,
      phone: phone,
      email: email,
      city: (data.city || '').trim() || null,
      language: data.language || 'he',
      status: 'pending_terms',
      source: 'manual',
      terms_approved: false,
      marketing_consent: false
    };
    var ins = await sb.from('crm_leads')
      .insert(payload)
      .select('id, full_name, status')
      .single();
    if (ins.error) throw new Error('lead create failed: ' + ins.error.message);

    var notes = (data.notes || '').trim();
    if (notes) {
      var noteRes = await sb.from('crm_lead_notes').insert({
        tenant_id: tenantId,
        lead_id: ins.data.id,
        content: notes
      });
      if (noteRes.error) throw new Error('lead note insert failed: ' + noteRes.error.message);
    }
    return ins.data;
  }

  async function transferLeadToTier2(leadId) {
    var tenantId = getTid();
    var check = await sb.from('crm_leads')
      .select('terms_approved')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .single();
    if (check.error) throw new Error('lead check failed: ' + check.error.message);
    if (!check.data.terms_approved) {
      if (window.Toast) Toast.error('לא ניתן להעביר — הליד לא אישר תקנון');
      return { blocked: true, reason: 'terms_not_approved' };
    }
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

  window.CrmLeadActions = window.CrmLeadActions || {};
  window.CrmLeadActions.changeLeadStatus = changeLeadStatus;
  window.CrmLeadActions.bulkChangeStatus = bulkChangeStatus;
  window.CrmLeadActions.addLeadNote = addLeadNote;
  window.CrmLeadActions.createManualLead = createManualLead;
  window.CrmLeadActions.transferLeadToTier2 = transferLeadToTier2;
  window.CrmLeadActions.leadTier = leadTier;
})();
