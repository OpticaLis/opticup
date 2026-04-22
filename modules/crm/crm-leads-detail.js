/* =============================================================================
   crm-leads-detail.js — Lead detail modal (B8 Tailwind rewrite — FINAL-02)
   Gradient header avatar + 5 tabs + 4 action buttons footer. READ-ONLY.
   Data: in-memory row + crm_lead_notes + v_crm_lead_event_history.
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

  // Reusable classes
  var CLS_TAB_BTN        = 'px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 border-b-2 border-transparent transition';
  var CLS_TAB_BTN_ACTIVE = 'px-4 py-2 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition';
  var CLS_TAB_BAR        = 'flex gap-2 border-b border-slate-200 mt-4 mb-4 overflow-x-auto';
  var CLS_ACTION_BTN     = 'flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition hover:shadow-md';
  var CLS_DETAIL_ROW     = 'flex items-center justify-between py-2 border-b border-slate-100';
  var CLS_NOTE           = 'bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2 text-sm text-slate-700';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var STATUS_LABELS  = { sent: 'נשלח', pending: 'בתור', failed: 'נכשל', delivered: 'הגיע', read: 'נקרא', queued: 'בתור' };
  var STATUS_CLASSES = {
    sent:      'bg-sky-100 text-sky-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    read:      'bg-indigo-100 text-indigo-800',
    failed:    'bg-rose-100 text-rose-800',
    queued:    'bg-slate-100 text-slate-700',
    pending:   'bg-slate-100 text-slate-700'
  };

  function initials(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    var parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  async function openCrmLeadDetail(leadId) {
    if (!leadId || typeof Modal === 'undefined') return;
    var lead = (typeof getCrmLeadById === 'function') ? getCrmLeadById(leadId) : null;
    if (!lead && typeof getCrmIncomingLeadById === 'function') lead = getCrmIncomingLeadById(leadId);
    if (!lead) return;

    var modal = Modal.show({
      title: lead.full_name || 'ליד',
      size: 'lg',
      content: '<div class="text-center text-slate-400 py-10">טוען פרטי ליד...</div>'
    });

    try {
      var data = await fetchDetailData(leadId);
      var body = modal.el.querySelector('.modal-body');
      if (body) {
        body.innerHTML = renderDetail(lead, data.notes, data.history, data.messages);
        wireTabs(body, lead, data);
        wireFooter(body, lead);
      }
    } catch (e) {
      console.error('lead detail load failed:', e);
      var body2 = modal.el.querySelector('.modal-body');
      if (body2) body2.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
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

    // P8: per-lead message history from crm_message_log filtered by lead_id.
    var msgQ = sb.from('crm_message_log')
      .select('id, channel, content, status, error_message, created_at, crm_message_templates(name, slug)')
      .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50);
    if (tid) msgQ = msgQ.eq('tenant_id', tid);

    var r = await Promise.all([notesQ, histQ, msgQ]);
    if (r[0].error) throw new Error('notes: ' + r[0].error.message);
    if (r[1].error) throw new Error('history: ' + r[1].error.message);
    if (r[2].error) throw new Error('messages: ' + r[2].error.message);
    return { notes: r[0].data || [], history: (r[1].data && r[1].data[0]) || null, messages: r[2].data || [] };
  }

  // ---- Render ----
  function renderDetail(lead, notes, hist, messages) {
    var statusInfo = CrmHelpers.getStatusInfo('lead', lead.status);
    var tabBtns = TABS.map(function (t, i) {
      return '<button type="button" class="' + (i === 0 ? CLS_TAB_BTN_ACTIVE : CLS_TAB_BTN) + '" data-detail-tab="' + t.key + '">' + escapeHtml(t.label) + '</button>';
    }).join('');

    return '<div class="flex gap-4 items-center bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 mb-2">' +
        '<div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">' + escapeHtml(initials(lead.full_name)) + '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<h2 class="text-xl font-bold text-slate-900 m-0 truncate">' + escapeHtml(lead.full_name || '') + '</h2>' +
          '<div class="text-sm text-slate-600 mt-1" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(lead.phone)) + '</div>' +
          '<div class="text-sm text-slate-500">' + escapeHtml(lead.city || '') + ' · ' + escapeHtml(lead.source || '') + '</div>' +
          '<div class="mt-2">' +
            '<button type="button" data-action="status" class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white hover:opacity-90 transition cursor-pointer" style="background:' + escapeHtml(statusInfo.color) + '">' +
              '<span data-status-label>' + escapeHtml(statusInfo.label) + '</span>' +
              '<span aria-hidden="true">▾</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="' + CLS_TAB_BAR + '">' + tabBtns + '</div>' +
      '<div id="crm-lead-tab-body" class="min-h-[120px]">' + renderTabContent('events', lead, notes, hist, []) + '</div>' +
      '<div class="flex gap-2 mt-4 pt-4 border-t border-slate-200">' +
        '<button type="button" class="' + CLS_ACTION_BTN + ' bg-emerald-500 hover:bg-emerald-600" data-action="whatsapp">WhatsApp</button>' +
        '<button type="button" class="' + CLS_ACTION_BTN + ' bg-sky-500 hover:bg-sky-600" data-action="sms">SMS</button>' +
        '<button type="button" class="' + CLS_ACTION_BTN + ' bg-indigo-500 hover:bg-indigo-600" data-action="edit">ערוך</button>' +
        '<button type="button" class="' + CLS_ACTION_BTN + ' bg-amber-500 hover:bg-amber-600" data-action="eventday">מצב יום אירוע</button>' +
      '</div>';
  }

  function renderTabContent(key, lead, notes, hist, messages) {
    if (key === 'events')   return renderEvents(hist);
    if (key === 'messages') return renderMessages(messages || []);
    if (key === 'notes')    return renderNotes(notes);
    if (key === 'timeline') return renderTimeline(notes, hist);
    if (key === 'details')  return renderFullDetails(lead);
    return '';
  }

  // P8: per-lead message history. Reuses the styling conventions from
  // crm-messaging-log.js (chip colours, channel labels) for visual consistency.
  function renderMessages(messages) {
    if (!messages.length) return '<div class="text-center text-slate-400 py-8">אין היסטוריית הודעות לליד זה</div>';
    var html = '<div class="space-y-2">';
    messages.forEach(function (m) {
      var chipCls = STATUS_CLASSES[m.status] || 'bg-slate-100 text-slate-700';
      var tpl = m.crm_message_templates || {};
      var preview = (m.content || '').replace(/\s+/g, ' ').slice(0, 80);
      var err = m.error_message ? '<div class="text-xs text-rose-600 mt-1">' + escapeHtml(m.error_message) + '</div>' : '';
      html += '<div class="bg-white border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition" data-msg-row="' + escapeHtml(m.id) + '">' +
        '<div class="flex items-center gap-2 flex-wrap mb-1">' +
          '<span class="text-xs font-semibold text-slate-500">' + escapeHtml(CrmHelpers.formatDateTime(m.created_at)) + '</span>' +
          '<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">' + escapeHtml(CHANNEL_LABELS[m.channel] || m.channel) + '</span>' +
          '<span class="text-xs px-2 py-0.5 rounded-full font-medium ' + chipCls + '">' + escapeHtml(STATUS_LABELS[m.status] || m.status) + '</span>' +
          (tpl.name ? '<span class="text-xs text-slate-500">· ' + escapeHtml(tpl.name) + '</span>' : '') +
        '</div>' +
        '<div class="text-sm text-slate-800 truncate">' + escapeHtml(preview) + '</div>' +
        err +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderEvents(hist) {
    if (!hist) return '<div class="text-center text-slate-400 py-6">לא השתתף באירועים</div>';
    var events = Array.isArray(hist.event_history) ? hist.event_history.slice() : [];
    if (!events.length) {
      var s = 'השתתף ב-' + (hist.total_events_attended || 0) + ' אירועים';
      if (hist.total_purchases) s += ' · רכישות: ' + CrmHelpers.formatCurrency(hist.total_purchases);
      return '<div class="text-center text-slate-500 py-6 text-sm">' + escapeHtml(s) + '</div>';
    }
    events.sort(function (a, b) { return String(b.event_date || '').localeCompare(String(a.event_date || '')); });
    var html = '<div class="space-y-2">';
    events.forEach(function (e) {
      var label = '#' + (e.event_number || '?') + ' ' + (e.event_name || '');
      var amount = e.purchase_amount ? '<span data-admin-only class="text-emerald-600 font-semibold"> · ' + escapeHtml(CrmHelpers.formatCurrency(e.purchase_amount)) + '</span>' : '';
      html += '<div class="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-semibold text-slate-800 text-sm truncate">' + escapeHtml(label) + '</div>' +
          '<div class="text-xs text-slate-500 mt-0.5">' + escapeHtml(CrmHelpers.formatDate(e.event_date)) + amount + '</div>' +
        '</div>' +
        '<div>' + CrmHelpers.statusBadgeHtml('attendee', e.attendee_status || e.status) + '</div>' +
      '</div>';
    });
    html += '</div>';
    if (hist.total_purchases) {
      html += '<div data-admin-only class="mt-3 text-end font-bold text-emerald-700">סה״כ: ' + escapeHtml(CrmHelpers.formatCurrency(hist.total_purchases)) + '</div>';
    }
    return html;
  }

  function renderNotes(notes) {
    var form =
      '<div class="flex gap-2 mb-3" data-note-form>' +
        '<textarea data-note-input class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 resize-y min-h-[44px]" rows="1" placeholder="הוסף הערה..." maxlength="2000"></textarea>' +
        '<button type="button" data-note-submit class="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">הוסף</button>' +
      '</div>';
    var list = notes.length
      ? '<div data-notes-list>' + notes.map(function (n) {
          return '<div class="' + CLS_NOTE + '">' + escapeHtml(n.content || '') +
            '<div class="text-xs text-slate-500 mt-1">' + escapeHtml(CrmHelpers.formatDateTime(n.created_at)) + '</div></div>';
        }).join('') + '</div>'
      : '<div data-notes-list class="text-center text-slate-400 py-6">אין הערות</div>';
    return form + list;
  }

  function renderTimeline(notes, hist) {
    var items = [];
    (notes || []).forEach(function (n) { items.push({ date: n.created_at, text: '📝 ' + (n.content || '').slice(0, 80) }); });
    if (hist && Array.isArray(hist.event_history)) {
      hist.event_history.forEach(function (e) { items.push({ date: e.event_date, text: '📅 אירוע #' + (e.event_number || '?') + ' — ' + (e.event_name || '') }); });
    }
    if (!items.length) return '<div class="text-center text-slate-400 py-6">אין אירועים בציר הזמן</div>';
    items.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    return '<div class="space-y-2">' + items.map(function (it) {
      return '<div class="flex items-start gap-3 py-2 border-b border-slate-100">' +
        '<div class="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0"></div>' +
        '<div class="flex-1 min-w-0"><p class="text-sm text-slate-800 truncate">' + escapeHtml(it.text) + '</p></div>' +
        '<div class="text-xs text-slate-500 shrink-0">' + escapeHtml(CrmHelpers.formatDate(it.date)) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderFullDetails(lead) {
    var html = '<div class="space-y-1">' +
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
      '</div>';
    if (Array.isArray(lead.tag_names) && lead.tag_names.length) {
      html += '<div class="mt-3 flex flex-wrap gap-1">' + lead.tag_names.map(function (n) {
        return '<span class="inline-block text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">' + escapeHtml(n) + '</span>';
      }).join('') + '</div>';
    }
    if (lead.client_notes) {
      html += '<div class="' + CLS_NOTE + ' mt-3">' + escapeHtml(lead.client_notes) + '</div>';
    }
    return html;
  }

  function row(label, value) {
    return '<div class="' + CLS_DETAIL_ROW + '">' +
      '<span class="text-sm font-medium text-slate-600">' + escapeHtml(label) + ':</span>' +
      '<span class="text-sm text-slate-900">' + escapeHtml(value == null ? '' : value) + '</span>' +
    '</div>';
  }

  function wireTabs(body, lead, data) {
    body.querySelectorAll('[data-detail-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.querySelectorAll('[data-detail-tab]').forEach(function (b) {
          b.className = (b === btn) ? CLS_TAB_BTN_ACTIVE : CLS_TAB_BTN;
        });
        var host = body.querySelector('#crm-lead-tab-body');
        var key = btn.getAttribute('data-detail-tab');
        if (host) host.innerHTML = renderTabContent(key, lead, data.notes, data.history, data.messages);
        if (key === 'notes') wireNoteForm(host, lead, data);
      });
    });
  }

  function wireNoteForm(host, lead, data) {
    if (!host || !window.CrmLeadActions) return;
    var input = host.querySelector('[data-note-input]');
    var btn = host.querySelector('[data-note-submit]');
    if (!input || !btn) return;

    async function submit() {
      var text = (input.value || '').trim();
      if (!text) return;
      btn.disabled = true;
      var oldText = btn.textContent;
      btn.textContent = 'שומר...';
      try {
        var newNote = await CrmLeadActions.addLeadNote(lead.id, text);
        data.notes.unshift(newNote);
        var list = host.querySelector('[data-notes-list]');
        var itemHtml = '<div class="' + CLS_NOTE + '">' + escapeHtml(newNote.content || '') +
          '<div class="text-xs text-slate-500 mt-1">' + escapeHtml(CrmHelpers.formatDateTime(newNote.created_at)) + '</div></div>';
        if (list && list.classList.contains('text-center')) {
          list.outerHTML = '<div data-notes-list>' + itemHtml + '</div>';
        } else if (list) {
          list.insertAdjacentHTML('afterbegin', itemHtml);
        }
        input.value = '';
      } catch (err) {
        if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    });
  }

  function wireFooter(body, lead) {
    body.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var act = btn.getAttribute('data-action');
        if (act === 'whatsapp' && lead.phone) {
          var wa = String(lead.phone).replace(/^\+/, '');
          window.open('https://wa.me/' + wa, '_blank');
        } else if (act === 'sms' && lead.phone) {
          window.location.href = 'sms:' + lead.phone;
        } else if (act === 'edit' && window.CrmLeadActions && CrmLeadActions.openEditLeadModal) {
          CrmLeadActions.openEditLeadModal(lead, function (updated) {
            if (updated) Object.keys(updated).forEach(function (k) { lead[k] = updated[k]; });
            if (typeof window.reloadCrmLeadsTab === 'function') window.reloadCrmLeadsTab();
            if (typeof window.reloadCrmIncomingTab === 'function') window.reloadCrmIncomingTab();
          });
        } else if (act === 'eventday') {
          if (window.Toast) Toast.show('מעבר למצב יום אירוע — בקרוב');
        } else if (act === 'status' && window.CrmLeadActions) {
          e.stopPropagation();
          var tier = CrmLeadActions.leadTier(lead.status);
          CrmLeadActions.openStatusDropdown(btn, tier, lead.status, async function (newStatus) {
            try {
              await CrmLeadActions.changeLeadStatus(lead.id, newStatus, lead.status);
              lead.status = newStatus;
              var info = CrmHelpers.getStatusInfo('lead', newStatus);
              var labelEl = btn.querySelector('[data-status-label]');
              if (labelEl) labelEl.textContent = info.label;
              btn.style.background = info.color;
              if (typeof window.reloadCrmLeadsTab === 'function') window.reloadCrmLeadsTab();
              if (typeof window.reloadCrmIncomingTab === 'function') window.reloadCrmIncomingTab();
            } catch (err) {
              if (window.Toast) Toast.error('שגיאה: ' + (err.message || String(err)));
            }
          });
        }
      });
    });
  }
})();
