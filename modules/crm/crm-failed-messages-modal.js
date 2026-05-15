/* =============================================================================
   crm-failed-messages-modal.js — Bulk acknowledge modal for failed messages.
   M4_FAILED_MESSAGE_BADGE_CLEANUP 2026-05-15.

   API:
     window.CrmFailedMessagesModal.open()  — open modal, load unacked failures
     window.CrmFailedMessagesModal.close() — close modal

   Behavior:
     - Lists all crm_message_log rows for the current tenant where status='failed'
       AND lead_id IS NOT NULL AND created_at >= now()-90d AND acknowledged_at IS NULL.
     - Per-row checkbox + "select all visible" toggle.
     - "סמן כמטופלות" button (gated on hasPermission('crm.message_log.acknowledge'))
       calls public.acknowledge_failed_messages RPC + activity_log + reloads badge counts.
     - On submit: closes modal + reloads leads-tab badges + shows toast.

   Dependencies: DB.select, sb.rpc, hasPermission, Modal, Toast, escapeHtml,
                 CrmHelpers.formatDateTime, CrmMessageErrorLabels.errorLabel,
                 reloadCrmLeadsFailedCounts.
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _state = { rows: [], leadsById: {}, page: 1, modal: null };

  function getTenantIdSafe() {
    try { return getTenantId(); } catch (e) { return null; }
  }

  async function loadRows() {
    var tid = getTenantIdSafe();
    if (!tid) return [];
    var since = new Date(Date.now() - 90 * 86400000).toISOString();
    // DB.select wrapper (Iron Rule 7). Pull failure rows + minimal join for lead name.
    var res = await DB.select('crm_message_log',
      { status: 'failed' },
      {
        columns: 'id, lead_id, channel, content, error_message, broadcast_id, created_at, crm_leads(full_name, phone)',
        rawFilters: function (q) {
          return q.not('lead_id', 'is', null)
                  .is('acknowledged_at', null)
                  .gte('created_at', since)
                  .order('created_at', { ascending: false });
        },
        silent: true
      }
    );
    if (res.error) {
      if (window.Toast) Toast.error('שגיאה בטעינת הודעות כושלות');
      return [];
    }
    return res.data || [];
  }

  function renderRow(r) {
    var lead = r.crm_leads || {};
    var chanIcon = r.channel === 'email' ? '✉️' : '📱';
    var reason = (window.CrmMessageErrorLabels && CrmMessageErrorLabels.errorLabel)
      ? CrmMessageErrorLabels.errorLabel(r.error_message) : (r.error_message || '');
    var bid = r.broadcast_id || '';
    return '<tr class="border-b border-slate-100 hover:bg-rose-50/50" data-row-id="' + escapeHtml(r.id) + '">' +
      '<td class="px-3 py-2"><input type="checkbox" class="rounded border-slate-300" data-cb-row="' + escapeHtml(r.id) + '"' + (bid ? ' data-broadcast="' + escapeHtml(bid) + '"' : '') + '></td>' +
      '<td class="px-3 py-2 text-sm font-medium text-slate-800">' + escapeHtml(lead.full_name || '—') + '</td>' +
      '<td class="px-3 py-2 text-xs text-slate-600" style="direction:ltr;text-align:end">' + escapeHtml((window.CrmHelpers && CrmHelpers.formatPhone) ? CrmHelpers.formatPhone(lead.phone) : (lead.phone || '')) + '</td>' +
      '<td class="px-3 py-2 text-xs text-slate-700">' + chanIcon + ' ' + escapeHtml(r.channel || '') + '</td>' +
      '<td class="px-3 py-2 text-xs text-rose-700 font-semibold">' + escapeHtml(reason) + '</td>' +
      '<td class="px-3 py-2 text-xs text-slate-500" style="direction:ltr;text-align:end">' + escapeHtml((window.CrmHelpers && CrmHelpers.formatDateTime) ? CrmHelpers.formatDateTime(r.created_at) : r.created_at) + '</td>' +
    '</tr>';
  }

  function renderBody() {
    var total = _state.rows.length;
    var pageStart = (_state.page - 1) * PAGE_SIZE;
    var slice = _state.rows.slice(pageStart, pageStart + PAGE_SIZE);
    var pagesTotal = Math.max(1, Math.ceil(total / PAGE_SIZE));
    var allow = (typeof hasPermission === 'function') ? hasPermission('crm.message_log.acknowledge') : true;

    if (!total) {
      return '<div class="text-center text-slate-500 py-10 text-sm">אין הודעות כושלות לא־מטופלות (90 יום אחרונים).</div>';
    }

    var distinctBroadcasts = [];
    var seenBids = {};
    _state.rows.forEach(function (r) { if (r.broadcast_id && !seenBids[r.broadcast_id]) { seenBids[r.broadcast_id] = 1; distinctBroadcasts.push(r.broadcast_id); } });

    var broadcastChip = distinctBroadcasts.length === 1
      ? '<button type="button" class="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200" data-action="select-broadcast" data-bid="' + escapeHtml(distinctBroadcasts[0]) + '">בחר את כל ההודעות מהברודקאסט</button>'
      : '';

    var html = '';
    html += '<div class="mb-3 flex items-center gap-2 flex-wrap">';
    html += '  <span class="text-sm text-slate-700"><strong>' + total + '</strong> הודעות כושלות לא־מטופלות</span>';
    html += '  <button type="button" class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-800 hover:bg-slate-200" data-action="select-all">בחר את כל הגלויים בעמוד</button>';
    html += '  ' + broadcastChip;
    html += '  <button type="button" class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-800 hover:bg-slate-200" data-action="clear-sel">נקה בחירה</button>';
    html += '  <span class="text-xs text-slate-500 ms-auto" data-role="sel-count">0 נבחרו</span>';
    html += '</div>';

    html += '<div class="overflow-x-auto rounded-lg border border-slate-200">';
    html += '<table class="w-full text-sm bg-white"><thead><tr class="bg-slate-50">';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700"></th>';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700">ליד</th>';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700">טלפון</th>';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700">ערוץ</th>';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700">שגיאה</th>';
    html += '<th class="px-3 py-2 text-start font-semibold text-slate-700">זמן</th>';
    html += '</tr></thead><tbody>';
    slice.forEach(function (r) { html += renderRow(r); });
    html += '</tbody></table></div>';

    if (pagesTotal > 1) {
      html += '<div class="mt-3 flex items-center justify-center gap-2 text-sm">';
      html += '<button type="button" class="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200" data-action="page-prev"' + (_state.page === 1 ? ' disabled' : '') + '>הקודם</button>';
      html += '<span class="text-slate-600">עמוד ' + _state.page + ' מתוך ' + pagesTotal + '</span>';
      html += '<button type="button" class="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200" data-action="page-next"' + (_state.page === pagesTotal ? ' disabled' : '') + '>הבא</button>';
      html += '</div>';
    }

    if (!allow) {
      html += '<div class="mt-3 text-xs text-slate-500">אין לך הרשאה לסמן כמטופלות.</div>';
    }

    return html;
  }

  function updateSelCount(body) {
    var n = body.querySelectorAll('[data-cb-row]:checked').length;
    var lbl = body.querySelector('[data-role="sel-count"]'); if (lbl) lbl.textContent = n + ' נבחרו';
    var submit = document.querySelector('[data-action="submit-ack"]'); if (submit) submit.disabled = (n === 0);
  }

  function wireBody(body) {
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]'); if (!t) return;
      var action = t.getAttribute('data-action');
      if (action === 'select-all') {
        body.querySelectorAll('[data-cb-row]').forEach(function (cb) { cb.checked = true; });
      } else if (action === 'clear-sel') {
        body.querySelectorAll('[data-cb-row]').forEach(function (cb) { cb.checked = false; });
      } else if (action === 'select-broadcast') {
        var bid = t.getAttribute('data-bid');
        body.querySelectorAll('[data-cb-row]').forEach(function (cb) {
          if (cb.getAttribute('data-broadcast') === bid) cb.checked = true;
        });
      } else if (action === 'page-prev') {
        if (_state.page > 1) { _state.page--; body.innerHTML = renderBody(); wireBody(body); updateSelCount(body); }
      } else if (action === 'page-next') {
        _state.page++; body.innerHTML = renderBody(); wireBody(body); updateSelCount(body);
      }
      updateSelCount(body);
    });
    body.addEventListener('change', function (e) {
      if (e.target.matches('[data-cb-row]')) updateSelCount(body);
    });
  }

  async function submitAck() {
    var modal = _state.modal; if (!modal) return;
    var body = modal.querySelector('[data-role="ack-body"]'); if (!body) return;
    var selectedIds = Array.from(body.querySelectorAll('[data-cb-row]:checked'))
      .map(function (cb) { return cb.getAttribute('data-cb-row'); });
    if (!selectedIds.length) return;
    if (typeof requirePermission === 'function') {
      try { requirePermission('crm.message_log.acknowledge'); }
      catch (e) { return; }
    }
    var btn = modal.querySelector('[data-action="submit-ack"]'); if (btn) { btn.disabled = true; btn.textContent = '🔄 מסמן...'; }
    var reason = (modal.querySelector('[data-role="ack-reason"]') || {}).value || null;
    var r = await sb.rpc('acknowledge_failed_messages', {
      p_message_log_ids: selectedIds,
      p_reason: reason || null
    });
    if (r.error) {
      if (window.Toast) Toast.error('שגיאה בסימון: ' + r.error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'סמן כמטופלות'; }
      return;
    }
    var data = r.data || {};
    var n = data.updated_count || 0;
    if (window.CrmHelpers && CrmHelpers.logActivity) {
      try { await CrmHelpers.logActivity('crm.message_log.acknowledge', 'crm_message_log', null, { count: n, reason: reason || null, surface: 'bulk_modal' }); } catch (e) { /* non-fatal */ }
    }
    if (window.Toast) Toast.success('סומנו ' + n + ' הודעות כמטופלות');
    closeModal();
    if (typeof window.reloadCrmLeadsFailedCounts === 'function') {
      try { await window.reloadCrmLeadsFailedCounts(); } catch (e) { /* ignore */ }
    }
    if (typeof window.applyFiltersAndRenderCrmLeads === 'function') {
      try { window.applyFiltersAndRenderCrmLeads(); } catch (e) { /* ignore */ }
    }
  }

  async function open() {
    if (_state.modal) return; // already open
    var rows = await loadRows();
    _state.rows = rows;
    _state.page = 1;
    var allow = (typeof hasPermission === 'function') ? hasPermission('crm.message_log.acknowledge') : true;
    var footer = allow && rows.length
      ? '<div class="flex items-center gap-2 w-full"><input type="text" data-role="ack-reason" maxlength="200" placeholder="סיבה (אופציונלי, יישמר בהיסטוריה)" class="flex-1 px-3 py-2 border border-slate-200 rounded text-sm" /><button type="button" data-action="submit-ack" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-semibold transition disabled:opacity-50" disabled>סמן כמטופלות</button></div>'
      : '';
    if (!window.Modal || typeof Modal.show !== 'function') {
      if (window.Toast) Toast.error('Modal לא זמין');
      return;
    }
    _state.modal = Modal.show({
      title: '📩 הודעות כושלות לא־מטופלות',
      size: 'lg',
      bodyHtml: '<div data-role="ack-body">' + renderBody() + '</div>',
      footerHtml: footer,
      onShow: function (modal) {
        var body = modal.querySelector('[data-role="ack-body"]');
        if (body) { wireBody(body); updateSelCount(body); }
        var submit = modal.querySelector('[data-action="submit-ack"]');
        if (submit) submit.addEventListener('click', submitAck);
      },
      onClose: function () { _state.modal = null; _state.rows = []; }
    });
  }

  function closeModal() {
    if (_state.modal && window.Modal && typeof Modal.close === 'function') {
      try { Modal.close(); } catch (e) { /* ignore */ }
    }
    _state.modal = null;
  }

  // Per-lead × button entry — confirms, queries unacked failures for lead, calls RPC.
  async function ackLead(leadId, count) {
    if (!leadId) return;
    if (typeof requirePermission === 'function') {
      try { requirePermission('crm.message_log.acknowledge'); } catch (e) { return; }
    }
    if (!window.confirm('לסמן את ' + (count || '?') + ' ההודעות הכושלות של ליד זה כמטופלות?')) return;
    var sel = await DB.select('crm_message_log', { status: 'failed', lead_id: leadId }, {
      columns: 'id',
      rawFilters: function (q) { return q.is('acknowledged_at', null); },
      silent: true
    });
    var ids = (sel.data || []).map(function (r) { return r.id; });
    if (!ids.length) { if (window.Toast) Toast.info('אין הודעות לא־מטופלות'); return; }
    var r = await sb.rpc('acknowledge_failed_messages', { p_message_log_ids: ids, p_reason: 'staff_marked_via_per_lead_x' });
    if (r.error) { if (window.Toast) Toast.error('שגיאה: ' + r.error.message); return; }
    var n = (r.data || {}).updated_count || 0;
    if (window.CrmHelpers && CrmHelpers.logActivity) {
      try { await CrmHelpers.logActivity('crm.message_log.acknowledge', 'crm_message_log', null, { count: n, reason: 'staff_marked_via_per_lead_x', surface: 'per_lead_x', lead_id: leadId }); } catch (e) { /* non-fatal */ }
    }
    if (window.Toast) Toast.success('סומנו ' + n + ' הודעות כמטופלות');
    if (typeof window.reloadCrmLeadsFailedCounts === 'function') {
      try { await window.reloadCrmLeadsFailedCounts(); } catch (e) { /* ignore */ }
    }
    if (typeof window.applyFiltersAndRenderCrmLeads === 'function') {
      try { window.applyFiltersAndRenderCrmLeads(); } catch (e) { /* ignore */ }
    }
  }

  window.CrmFailedMessagesModal = { open: open, close: closeModal, ackLead: ackLead };
})();
