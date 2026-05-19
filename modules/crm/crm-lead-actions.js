/* crm-lead-actions.js — CRM lead mutation helpers (P2a + P3a). Load after
   shared.js, crm-helpers.js. UI modal flows in crm-lead-modals.js extend the
   same window.CrmLeadActions namespace. Every write carries tenant_id (Rule 22). */
(function () {
  'use strict';

  function getTid() { return (typeof getTenantId === 'function') ? getTenantId() : null; }

  function statusLabel(slug) {
    var _info = (CrmHelpers && CrmHelpers.getStatusInfo) ? CrmHelpers.getStatusInfo('lead', slug) : null;
    return (_info && _info.label) || slug || '';
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

  // M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 1: probe→modal→commit. Same pattern
  // as changeEventStatus. Only the UPDATE fires the DB trigger; cron consumer
  // is the sole dispatcher.
  async function changeLeadStatus(leadId, newStatus, oldStatus, opts) {
    opts = opts || {};
    var tenantId = getTid();
    var content = 'סטטוס שונה מ-' + statusLabel(oldStatus) + ' ל-' + statusLabel(newStatus);

    var commit = async function (/* meta */) {
      var upd = await sb.from('crm_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId).eq('tenant_id', tenantId).select('id').single();
      if (upd.error) throw new Error('status update failed: ' + upd.error.message);
      var noteIns = await sb.from('crm_lead_notes').insert({ tenant_id: tenantId, lead_id: leadId, content: content });
      if (noteIns.error) throw new Error('status note insert failed: ' + noteIns.error.message);
      try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.status_change', entity_type: 'crm_leads', entity_id: leadId, details: { from: oldStatus, to: newStatus, from_label: statusLabel(oldStatus), to_label: statusLabel(newStatus) } }); } catch (_) {}
      if (!opts.silent && window.Toast) Toast.success('סטטוס עודכן: ' + statusLabel(newStatus));
      return { id: leadId, status: newStatus, noteContent: content };
    };

    if (opts.silent || !window.CrmAutomationClient || typeof CrmAutomationClient.probeAndCommit !== 'function') {
      return await commit({}); // bulk path stays direct (no modal noise for batch updates)
    }
    var triggerData = { leadId: leadId, newStatus: newStatus, oldStatus: oldStatus };
    var result = await CrmAutomationClient.probeAndCommit('lead_status_change', triggerData, commit, { silentToast: 'סטטוס עודכן: ' + statusLabel(newStatus), suppressSilentToast: true });
    return (result && result.data) || (result && result.committed ? { id: leadId, status: newStatus, noteContent: content } : null);
  }

  async function bulkChangeStatus(leadIds, newStatus) {
    var results = { ok: 0, fail: [] };
    // Fetch current statuses in one query to write accurate notes
    var fetch = await sb.from('crm_leads').select('id, status').in('id', leadIds).eq('tenant_id', getTid());
    if (fetch.error) return { ok: 0, fail: leadIds.map(function (id) { return { id: id, err: fetch.error.message }; }) };
    var byId = {};
    (fetch.data || []).forEach(function (r) { byId[r.id] = r.status; });
    for (var i = 0; i < leadIds.length; i++) {
      var id = leadIds[i];
      try { await changeLeadStatus(id, newStatus, byId[id] || '', { silent: true }); results.ok++; }
      catch (e) { results.fail.push({ id: id, err: e.message || String(e) }); }
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
    var phoneRaw = (data.phone || '').trim();
    var email = (data.email || '').trim();
    if (!fullName) throw new Error('missing full_name');
    if (!phoneRaw) throw new Error('missing phone');
    if (!email) throw new Error('missing email');

    var _phone = (CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(phoneRaw) : null;
    if (!_phone) return { invalidPhone: true, raw: phoneRaw };

    var existing = await sb.from('crm_leads')
      .select('id, full_name, status')
      .eq('tenant_id', tenantId)
      .eq('phone', _phone)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error('duplicate check failed: ' + existing.error.message);
    if (existing.data) return { duplicate: true, existingLead: existing.data };

    var payload = {
      tenant_id: tenantId,
      full_name: fullName,
      phone: _phone,
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
    if (ins.error) {
      // 23505: race-safety — return existing ACTIVE lead, ignore soft-deleted.
      if (ins.error.code === '23505') {
        var raced = await sb.from('crm_leads')
          .select('id, full_name, status')
          .eq('tenant_id', tenantId)
          .eq('phone', _phone)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        if (raced.data) return { duplicate: true, existingLead: raced.data };
      }
      throw new Error('lead create failed: ' + ins.error.message);
    }

    var notes = (data.notes || '').trim();
    if (notes) {
      var noteRes = await sb.from('crm_lead_notes').insert({
        tenant_id: tenantId,
        lead_id: ins.data.id,
        content: notes
      });
      if (noteRes.error) throw new Error('lead note insert failed: ' + noteRes.error.message);
    }
    try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.create', entity_type: 'crm_leads', entity_id: ins.data.id, details: { full_name: payload.full_name, phone: payload.phone, source: 'manual' } }); } catch (_) {}
    if (window.CrmAutomationClient && CrmAutomationClient.evaluate) CrmAutomationClient.evaluate('lead_intake', { leadId: ins.data.id });
    return ins.data;
  }

  async function updateLead(leadId, patch) {
    if (!leadId) throw new Error('missing lead id');
    var tenantId = getTid();
    var clean = {};
    if (patch.full_name != null) {
      var n = String(patch.full_name).trim();
      if (!n) throw new Error('missing full_name');
      clean.full_name = n;
    }
    if (patch.phone != null) {
      var pRaw = String(patch.phone).trim();
      if (!pRaw) throw new Error('missing phone');
      var pNorm = (CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(pRaw) : null;
      if (!pNorm) return { invalidPhone: true, raw: pRaw };
      var dup = await sb.from('crm_leads')
        .select('id, full_name, status')
        .eq('tenant_id', tenantId)
        .eq('phone', pNorm)
        .eq('is_deleted', false)
        .neq('id', leadId)
        .limit(1)
        .maybeSingle();
      if (dup.error) throw new Error('duplicate check failed: ' + dup.error.message);
      if (dup.data) return { duplicate: true, existingLead: dup.data };
      clean.phone = pNorm;
    }
    if (patch.email != null) {
      var e = String(patch.email).trim();
      if (!e) throw new Error('missing email');
      clean.email = e;
    }
    if (patch.city != null) clean.city = String(patch.city).trim() || null;
    if (patch.language != null) clean.language = patch.language || 'he';
    if (patch.client_notes != null) clean.client_notes = String(patch.client_notes).trim() || null;
    clean.updated_at = new Date().toISOString();

    var res = await sb.from('crm_leads')
      .update(clean)
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .select('id, full_name, phone, email, city, language, client_notes, updated_at')
      .single();
    if (res.error) {
      if (res.error.code === '23505' && clean.phone) {
        var raced = await sb.from('crm_leads')
          .select('id, full_name, status')
          .eq('tenant_id', tenantId)
          .eq('phone', clean.phone)
          .eq('is_deleted', false)
          .neq('id', leadId)
          .limit(1)
          .maybeSingle();
        if (raced.data) return { duplicate: true, existingLead: raced.data };
      }
      throw new Error('lead update failed: ' + res.error.message);
    }
    try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.update', entity_type: 'crm_leads', entity_id: leadId, details: { full_name: res.data && res.data.full_name, fields_changed: Object.keys(clean).filter(function (k) { return k !== 'updated_at'; }) } }); } catch (_) {}
    return res.data;
  }

  // Soft-delete (Iron Rule 3). Partial unique index frees the phone slot.
  async function softDeleteLead(leadId, leadName) {
    if (!leadId) throw new Error('missing lead id');
    var res = await sb.from('crm_leads')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', leadId).eq('tenant_id', getTid()).select('id').single();
    if (res.error) throw new Error('soft-delete failed: ' + res.error.message);
    try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.soft_delete', entity_type: 'crm_leads', entity_id: leadId, details: { lead_name: leadName || null } }); } catch (_) {}
    return res.data;
  }

  async function transferLeadToTier2(leadId) {
    var tenantId = getTid();
    var check = await sb.from('crm_leads')
      .select('terms_approved, status')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .single();
    if (check.error) throw new Error('lead check failed: ' + check.error.message);
    if (!check.data.terms_approved) {
      if (window.Toast) Toast.error('לא ניתן להעביר — הליד לא אישר תקנון');
      return { blocked: true, reason: 'terms_not_approved' };
    }
    var oldStatus = check.data.status;
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
    // M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 1: the lead-status UPDATE above
    // already fired trg_lead_status_change_event; cron consumer dispatches via
    // automation-engine. No browser-side evaluate call here.
    return { id: leadId, status: 'waiting' };
  }

  async function resubscribeLead(lead) {
    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId || !lead || !lead.id) throw new Error('missing context');
    var res = await sb.from('crm_leads')
      .update({ unsubscribed_at: null, updated_at: new Date().toISOString() })
      .eq('id', lead.id).eq('tenant_id', tenantId);
    if (res.error) throw new Error(res.error.message);
    try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.resubscribed', entity_type: 'crm_leads', entity_id: lead.id, details: { lead_name: lead.full_name } }); } catch (_) {}
    if (window.Toast) Toast.success('הליד הוחזר לדיוור');
    return true;
  }

  function wireResubscribeButton(host, lead, onDone) {
    var btn = host && host.querySelector('[data-action="resubscribe"]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      resubscribeLead(lead).then(function () {
        lead.unsubscribed_at = null;
        if (typeof onDone === 'function') onDone();
      }, function (err) {
        btn.disabled = false;
        if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
      });
    });
  }

  async function approveTermsManually(lead) {
    var tenantId = getTid();
    if (!tenantId || !lead || !lead.id) throw new Error('missing context');
    var nowIso = new Date().toISOString();
    var res = await sb.from('crm_leads')
      .update({ terms_approved: true, terms_approved_at: nowIso, updated_at: nowIso })
      .eq('id', lead.id).eq('tenant_id', tenantId);
    if (res.error) throw new Error(res.error.message);
    try { if (window.ActivityLog) ActivityLog.write({ action: 'crm.lead.terms_approved_manual', entity_type: 'crm_leads', entity_id: lead.id, details: { lead_name: lead.full_name } }); } catch (_) {}
    if (window.Toast) Toast.success('תקנון אושר ידנית');
    return true;
  }

  function wireApproveTermsButton(host, lead, onDone) {
    var btn = host && host.querySelector('[data-action="approve-terms"]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (typeof Modal === 'undefined' || !Modal.confirm) return;
      Modal.confirm({
        title: 'אישור תקנון ידני',
        message: 'לסמן שהליד אישר תקנון? לאחר האישור ניתן יהיה להעביר אותו ל-Tier 2.',
        confirmText: 'אישר תקנון',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
        onConfirm: function () {
          btn.disabled = true;
          approveTermsManually(lead).then(function () {
            lead.terms_approved = true;
            lead.terms_approved_at = new Date().toISOString();
            if (typeof onDone === 'function') onDone();
          }, function (err) {
            btn.disabled = false;
            if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
          });
        }
      });
    });
  }

  function termsApproveButtonHtml(lead) {
    if (!lead || lead.terms_approved) return '';
    if (leadTier(lead.status) !== 1) return '';
    return ' <button type="button" data-action="approve-terms" class="ms-2 px-2 py-0.5 rounded bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600">סמן כאישר תקנון</button>';
  }

  function wireDetailsButtons(host, lead, refresh) {
    if (!host || !lead) return;
    if (lead.unsubscribed_at) wireResubscribeButton(host, lead, refresh);
    if (!lead.terms_approved) wireApproveTermsButton(host, lead, function () {
      refresh && refresh();
      if (typeof window.reloadCrmIncomingTab === 'function') window.reloadCrmIncomingTab();
      if (typeof window.reloadCrmLeadsTab === 'function') window.reloadCrmLeadsTab();
    });
  }

  window.CrmLeadActions = window.CrmLeadActions || {};
  window.CrmLeadActions.changeLeadStatus = changeLeadStatus;
  window.CrmLeadActions.bulkChangeStatus = bulkChangeStatus;
  window.CrmLeadActions.addLeadNote = addLeadNote;
  window.CrmLeadActions.createManualLead = createManualLead;
  window.CrmLeadActions.updateLead = updateLead;
  window.CrmLeadActions.softDeleteLead = softDeleteLead;
  window.CrmLeadActions.transferLeadToTier2 = transferLeadToTier2;
  window.CrmLeadActions.leadTier = leadTier;
  window.CrmLeadActions.resubscribeLead = resubscribeLead;
  window.CrmLeadActions.wireResubscribeButton = wireResubscribeButton;
  window.CrmLeadActions.approveTermsManually = approveTermsManually;
  window.CrmLeadActions.wireApproveTermsButton = wireApproveTermsButton;
  window.CrmLeadActions.termsApproveButtonHtml = termsApproveButtonHtml;
  window.CrmLeadActions.wireDetailsButtons = wireDetailsButtons;
})();
