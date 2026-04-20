/* =============================================================================
   crm-leads-detail.js — Lead detail modal
   Uses Modal.show() from shared/js/modal-builder.js.
   Data: in-memory row from crm-leads-tab.js + crm_lead_notes + v_crm_lead_event_history.
   READ-ONLY per Phase B3 SPEC (editing deferred to a follow-up SPEC).
   ============================================================================= */
(function () {
  'use strict';

  // ---- Entrypoint ----
  async function openCrmLeadDetail(leadId) {
    if (!leadId || typeof Modal === 'undefined') return;
    var lead = typeof getCrmLeadById === 'function' ? getCrmLeadById(leadId) : null;
    if (!lead) return;

    var modal = Modal.show({
      title: lead.full_name || 'ליד',
      size: 'lg',
      content: renderLoading()
    });

    try {
      var data = await fetchDetailData(leadId);
      var body = modal.el.querySelector('.modal-body');
      if (body) body.innerHTML = renderDetail(lead, data.notes, data.history);
    } catch (e) {
      console.error('lead detail load failed:', e);
      var body = modal.el.querySelector('.modal-body');
      if (body) body.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.openCrmLeadDetail = openCrmLeadDetail;

  function renderLoading() {
    return '<div class="crm-detail-empty" style="padding:20px">טוען פרטי ליד...</div>';
  }

  // ---- Fetch notes + history in parallel ----
  async function fetchDetailData(leadId) {
    var tid = getTenantId();
    var notesQ = sb.from('crm_lead_notes')
      .select('id, content, event_id, employee_id, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (tid) notesQ = notesQ.eq('tenant_id', tid);

    var histQ = sb.from('v_crm_lead_event_history')
      .select('total_events_attended, total_purchases, is_returning_customer, last_attended_date, event_history')
      .eq('lead_id', leadId);
    if (tid) histQ = histQ.eq('tenant_id', tid);

    var results = await Promise.all([notesQ, histQ]);
    if (results[0].error) throw new Error('notes: ' + results[0].error.message);
    if (results[1].error) throw new Error('history: ' + results[1].error.message);
    return {
      notes: results[0].data || [],
      history: (results[1].data && results[1].data[0]) || null
    };
  }

  // ---- Render detail body ----
  function renderDetail(lead, notes, hist) {
    var statusInfo = CrmHelpers.getStatusInfo('lead', lead.status);
    var h = '';

    // Details section
    h += '<div class="crm-detail-section"><h4>פרטים</h4><div class="crm-detail-grid">' +
      detailRow('טלפון', CrmHelpers.formatPhone(lead.phone), true) +
      detailRow('אימייל', lead.email || '—') +
      detailRow('עיר', lead.city || '—') +
      detailRow('שפה', CrmHelpers.formatLanguage(lead.language)) +
      detailRowHtml('סטטוס', '<span class="crm-badge" style="background:' + escapeHtml(statusInfo.color) + '">' + escapeHtml(statusInfo.label) + '</span>') +
      detailRow('מקור', lead.source || '—') +
      detailRow('קמפיין UTM', lead.utm_campaign || '—') +
      detailRow('מקור UTM', lead.utm_source || '—') +
      detailRow('תנאים', lead.terms_approved ? '✅ אושרו' + (lead.terms_approved_at ? ' (' + CrmHelpers.formatDate(lead.terms_approved_at) + ')' : '') : '—') +
      detailRow('שיווק', lead.marketing_consent ? '✅ מאושר' : (lead.unsubscribed_at ? '❌ הוסר' : '—')) +
      detailRow('נוצר', CrmHelpers.formatDate(lead.created_at)) +
      detailRow('עודכן', CrmHelpers.formatDate(lead.updated_at)) +
      '</div></div>';

    // Tags section
    if (Array.isArray(lead.tag_names) && lead.tag_names.length) {
      h += '<div class="crm-detail-section"><h4>🏷️ תגים</h4>' +
        lead.tag_names.map(function (n, i) {
          var color = (Array.isArray(lead.tag_colors) && lead.tag_colors[i]) ? lead.tag_colors[i] : '#e5e7eb';
          return '<span class="crm-tag-chip" style="background:' + escapeHtml(color) + ';color:#fff">' +
            escapeHtml(n) + '</span>';
        }).join(' ') +
        '</div>';
    }

    // Notes section
    h += '<div class="crm-detail-section"><h4>📝 הערות (' + notes.length + ')</h4>';
    if (!notes.length) {
      h += '<div class="crm-detail-empty">אין הערות</div>';
    } else {
      notes.forEach(function (n) {
        h += '<div class="crm-detail-note">' + escapeHtml(n.content || '') +
          '<div class="crm-detail-note-meta">' + escapeHtml(CrmHelpers.formatDateTime(n.created_at)) + '</div></div>';
      });
    }
    h += '</div>';

    // Event history section
    h += '<div class="crm-detail-section"><h4>📅 היסטוריית אירועים</h4>';
    h += renderEventHistory(hist);
    h += '</div>';

    // Client notes (free text on the lead itself, separate from crm_lead_notes)
    if (lead.client_notes) {
      h += '<div class="crm-detail-section"><h4>הערות לקוח (שדה ישיר)</h4>' +
        '<div class="crm-detail-note">' + escapeHtml(lead.client_notes) + '</div></div>';
    }

    return h;
  }

  function renderEventHistory(hist) {
    if (!hist) return '<div class="crm-detail-empty">לא השתתף באירועים</div>';
    var events = Array.isArray(hist.event_history) ? hist.event_history : [];
    if (!events.length) {
      var summary = 'השתתף ב-' + (hist.total_events_attended || 0) + ' אירועים';
      if (hist.total_purchases) summary += ' · רכישות: ' + CrmHelpers.formatCurrency(hist.total_purchases);
      return '<div class="crm-detail-empty">' + escapeHtml(summary) + '</div>';
    }

    events.sort(function (a, b) {
      return String(b.event_date || '').localeCompare(String(a.event_date || ''));
    });

    var h = '<table class="crm-table"><thead><tr><th>אירוע</th><th>תאריך</th><th>סטטוס</th><th>רכישה</th></tr></thead><tbody>';
    events.forEach(function (e) {
      var label = '#' + (e.event_number || '?') + ' ' + (e.event_name || '');
      h += '<tr class="readonly">' +
        '<td>' + escapeHtml(label) + '</td>' +
        '<td>' + escapeHtml(CrmHelpers.formatDate(e.event_date)) + '</td>' +
        '<td>' + CrmHelpers.statusBadgeHtml('attendee', e.attendee_status || e.status) + '</td>' +
        '<td>' + escapeHtml(e.purchase_amount ? CrmHelpers.formatCurrency(e.purchase_amount) : '—') + '</td>' +
        '</tr>';
    });
    h += '</tbody></table>';
    if (hist.total_purchases) {
      h += '<div style="margin-top:8px;text-align:end;font-weight:600">סה"כ רכישות: ' + escapeHtml(CrmHelpers.formatCurrency(hist.total_purchases)) + '</div>';
    }
    return h;
  }

  function detailRow(label, value, ltr) {
    var style = ltr ? ' style="direction:ltr;text-align:end"' : '';
    return '<div class="crm-detail-row">' +
      '<span class="crm-detail-label">' + escapeHtml(label) + ':</span>' +
      '<span class="crm-detail-value"' + style + '>' + escapeHtml(value == null ? '' : value) + '</span>' +
      '</div>';
  }

  function detailRowHtml(label, valueHtml) {
    return '<div class="crm-detail-row">' +
      '<span class="crm-detail-label">' + escapeHtml(label) + ':</span>' +
      '<span class="crm-detail-value">' + valueHtml + '</span>' +
      '</div>';
  }
})();
