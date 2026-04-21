/* =============================================================================
   crm-leads-detail.js — Lead detail modal (B7: gradient avatar + 5 tabs + footer)
   Data: in-memory row from crm-leads-tab.js + crm_lead_notes + v_crm_lead_event_history.
   READ-ONLY — edit + event-day entry are placeholders until a follow-up SPEC.
   ============================================================================= */
(function () {
  'use strict';

  var TABS = [
    { key: 'events',   label: 'אירועים' },
    { key: 'messages', label: 'הודעות' },
    { key: 'notes',    label: 'הערות' },
    { key: 'timeline', label: 'ציר זמן' },
    { key: 'details',  label: 'פרטים' }
  ];

  function initials(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    var parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  async function openCrmLeadDetail(leadId) {
    if (!leadId || typeof Modal === 'undefined') return;
    var lead = typeof getCrmLeadById === 'function' ? getCrmLeadById(leadId) : null;
    if (!lead) return;

    var modal = Modal.show({
      title: lead.full_name || 'ליד',
      size: 'lg',
      content: '<div class="crm-detail-empty" style="padding:20px">טוען פרטי ליד...</div>'
    });

    try {
      var data = await fetchDetailData(leadId);
      var body = modal.el.querySelector('.modal-body');
      if (body) {
        body.innerHTML = renderDetail(lead, data.notes, data.history);
        wireTabs(body, lead, data);
        wireFooter(body, lead);
      }
    } catch (e) {
      console.error('lead detail load failed:', e);
      var body2 = modal.el.querySelector('.modal-body');
      if (body2) body2.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.openCrmLeadDetail = openCrmLeadDetail;

  async function fetchDetailData(leadId) {
    var tid = getTenantId();
    var notesQ = sb.from('crm_lead_notes')
      .select('id, content, event_id, employee_id, created_at')
      .eq('lead_id', leadId).order('created_at', { ascending: false });
    if (tid) notesQ = notesQ.eq('tenant_id', tid);

    var histQ = sb.from('v_crm_lead_event_history')
      .select('total_events_attended, total_purchases, is_returning_customer, last_attended_date, event_history')
      .eq('lead_id', leadId);
    if (tid) histQ = histQ.eq('tenant_id', tid);

    var r = await Promise.all([notesQ, histQ]);
    if (r[0].error) throw new Error('notes: ' + r[0].error.message);
    if (r[1].error) throw new Error('history: ' + r[1].error.message);
    return { notes: r[0].data || [], history: (r[1].data && r[1].data[0]) || null };
  }

  // ---- Render: header (gradient avatar) + tab bar + tab panels + footer ----
  function renderDetail(lead, notes, hist) {
    var statusInfo = CrmHelpers.getStatusInfo('lead', lead.status);
    var tabBtns = TABS.map(function (t, i) {
      return '<button type="button" class="crm-detail-tab' + (i === 0 ? ' active' : '') + '" data-detail-tab="' + t.key + '">' + escapeHtml(t.label) + '</button>';
    }).join('');

    return '<div style="display:flex;gap:14px;align-items:center">' +
        '<div class="crm-avatar-gradient lg">' + escapeHtml(initials(lead.full_name)) + '</div>' +
        '<div>' +
          '<h2 style="margin:0;color:var(--crm-text-primary)">' + escapeHtml(lead.full_name || '') + '</h2>' +
          '<div style="font-size:0.88rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(lead.phone)) + '</div>' +
          '<div style="font-size:0.88rem;color:var(--crm-text-muted)">' + escapeHtml(lead.city || '') + ' · ' + escapeHtml(lead.source || '') + '</div>' +
          '<div style="margin-top:6px">' +
            '<span class="crm-badge" style="background:' + escapeHtml(statusInfo.color) + '">' + escapeHtml(statusInfo.label) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="crm-detail-tabs">' + tabBtns + '</div>' +
      '<div id="crm-lead-tab-body">' + renderTabContent('events', lead, notes, hist) + '</div>' +
      '<div class="crm-modal-footer">' +
        '<button type="button" class="crm-action-btn whatsapp" data-action="whatsapp">WhatsApp</button>' +
        '<button type="button" class="crm-action-btn sms" data-action="sms">SMS</button>' +
        '<button type="button" class="crm-action-btn edit" data-action="edit">ערוך</button>' +
        '<button type="button" class="crm-action-btn eventday" data-action="eventday">מצב יום אירוע</button>' +
      '</div>';
  }

  function renderTabContent(key, lead, notes, hist) {
    if (key === 'events')   return renderEvents(hist);
    if (key === 'messages') return '<div class="crm-detail-empty">היסטוריית הודעות — בקרוב</div>';
    if (key === 'notes')    return renderNotes(notes);
    if (key === 'timeline') return renderTimeline(notes, hist);
    if (key === 'details')  return renderFullDetails(lead);
    return '';
  }

  function renderEvents(hist) {
    if (!hist) return '<div class="crm-detail-empty">לא השתתף באירועים</div>';
    var events = Array.isArray(hist.event_history) ? hist.event_history.slice() : [];
    if (!events.length) {
      var s = 'השתתף ב-' + (hist.total_events_attended || 0) + ' אירועים';
      if (hist.total_purchases) s += ' · רכישות: ' + CrmHelpers.formatCurrency(hist.total_purchases);
      return '<div class="crm-detail-empty">' + escapeHtml(s) + '</div>';
    }
    events.sort(function (a, b) { return String(b.event_date || '').localeCompare(String(a.event_date || '')); });
    var html = '';
    events.forEach(function (e) {
      var label = '#' + (e.event_number || '?') + ' ' + (e.event_name || '');
      var amount = e.purchase_amount ? '<span data-admin-only> · ' + escapeHtml(CrmHelpers.formatCurrency(e.purchase_amount)) + '</span>' : '';
      html += '<div class="crm-attendee-row">' +
        '<div></div>' +
        '<div><strong>' + escapeHtml(label) + '</strong><div style="font-size:0.78rem;color:var(--crm-text-muted)">' + escapeHtml(CrmHelpers.formatDate(e.event_date)) + amount + '</div></div>' +
        '<div>' + CrmHelpers.statusBadgeHtml('attendee', e.attendee_status || e.status) + '</div>' +
        '<div></div>' +
      '</div>';
    });
    if (hist.total_purchases) {
      html += '<div data-admin-only style="margin-top:8px;text-align:end;font-weight:700">סה"כ: ' + escapeHtml(CrmHelpers.formatCurrency(hist.total_purchases)) + '</div>';
    }
    return html;
  }

  function renderNotes(notes) {
    if (!notes.length) return '<div class="crm-detail-empty">אין הערות</div>';
    return notes.map(function (n) {
      return '<div class="crm-detail-note">' + escapeHtml(n.content || '') +
        '<div class="crm-detail-note-meta">' + escapeHtml(CrmHelpers.formatDateTime(n.created_at)) + '</div></div>';
    }).join('');
  }

  function renderTimeline(notes, hist) {
    var items = [];
    (notes || []).forEach(function (n) { items.push({ date: n.created_at, text: '📝 ' + (n.content || '').slice(0, 80) }); });
    if (hist && Array.isArray(hist.event_history)) {
      hist.event_history.forEach(function (e) { items.push({ date: e.event_date, text: '📅 אירוע #' + (e.event_number || '?') + ' — ' + (e.event_name || '') }); });
    }
    if (!items.length) return '<div class="crm-detail-empty">אין אירועים בציר הזמן</div>';
    items.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    return items.map(function (it) {
      return '<div class="crm-activity-item">' +
        '<span class="crm-pulse-dot"></span>' +
        '<span>' + escapeHtml(it.text) + '</span>' +
        '<span class="crm-activity-time">' + escapeHtml(CrmHelpers.formatDate(it.date)) + '</span>' +
        '</div>';
    }).join('');
  }

  function renderFullDetails(lead) {
    return '<div class="crm-detail-grid">' +
      row('אימייל', lead.email || '—') +
      row('עיר', lead.city || '—') +
      row('שפה', CrmHelpers.formatLanguage(lead.language)) +
      row('מקור', lead.source || '—') +
      row('קמפיין UTM', lead.utm_campaign || '—') +
      row('מקור UTM', lead.utm_source || '—') +
      row('תנאים', lead.terms_approved ? '✅ אושרו' : '—') +
      row('שיווק', lead.marketing_consent ? '✅ מאושר' : (lead.unsubscribed_at ? '❌ הוסר' : '—')) +
      row('נוצר', CrmHelpers.formatDate(lead.created_at)) +
      row('עודכן', CrmHelpers.formatDate(lead.updated_at)) +
      '</div>' +
      (Array.isArray(lead.tag_names) && lead.tag_names.length
        ? '<div style="margin-top:10px">' + lead.tag_names.map(function (n) { return '<span class="crm-tag-pill">' + escapeHtml(n) + '</span>'; }).join('') + '</div>'
        : '') +
      (lead.client_notes ? '<div class="crm-detail-note" style="margin-top:10px">' + escapeHtml(lead.client_notes) + '</div>' : '');
  }

  function row(label, value) {
    return '<div class="crm-detail-row"><span class="crm-detail-label">' + escapeHtml(label) + ':</span>' +
      '<span class="crm-detail-value">' + escapeHtml(value == null ? '' : value) + '</span></div>';
  }

  function wireTabs(body, lead, data) {
    body.querySelectorAll('[data-detail-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.querySelectorAll('[data-detail-tab]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        var host = body.querySelector('#crm-lead-tab-body');
        if (host) host.innerHTML = renderTabContent(btn.getAttribute('data-detail-tab'), lead, data.notes, data.history);
      });
    });
  }

  function wireFooter(body, lead) {
    body.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-action');
        if (act === 'whatsapp' && lead.phone) {
          var wa = String(lead.phone).replace(/^\+/, '');
          window.open('https://wa.me/' + wa, '_blank');
        } else if (act === 'sms' && lead.phone) {
          window.location.href = 'sms:' + lead.phone;
        } else if (act === 'edit') {
          if (window.Toast) Toast.show('עריכה — בקרוב');
        } else if (act === 'eventday') {
          if (window.Toast) Toast.show('מעבר למצב יום אירוע — בקרוב');
        }
      });
    });
  }
})();
