/* crm-confirm-send-v2-render.js — Pure presentation for CrmConfirmSendV2.
   M4_DRY_RUN_PREVIEW_AND_DISPATCH Phases 3-7 (2026-05-14).
   All functions are pure: they read `state` + return HTML strings; never
   mutate state, never touch the DOM. The controller (crm-confirm-send-v2.js)
   owns state, event wiring, and DOM patching.
   Exposes window.__CcsV2Render. Iron Rule 8: bodies via escapeHtml + <pre>. */
(function () {
  'use strict';

  // ---------- formatting helpers ----------

  function fmtPhone(p) {
    if (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') return CrmHelpers.formatPhone(p);
    return p || '';
  }
  function channelLabel(ch) { return ch === 'email' ? 'אימייל' : (ch === 'whatsapp' ? 'WhatsApp' : 'SMS'); }
  function channelIcon(ch)  { return ch === 'email' ? '✉️' : (ch === 'whatsapp' ? '💬' : '📱'); }

  function fmtDate(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso);
    return m[3] + '.' + m[2] + '.' + m[1];
  }

  // ---------- filter predicates ----------

  function matchesSearch(r, term) {
    if (!term) return true;
    var t = term.toLowerCase();
    var name  = String(r.full_name || '').toLowerCase();
    var phone = String(r.phone || '').replace(/[^\d]/g, '');
    var email = String(r.email || '').toLowerCase();
    var tDigits = t.replace(/[^\d]/g, '');
    return name.indexOf(t) !== -1
        || (tDigits && phone.indexOf(tDigits) !== -1)
        || email.indexOf(t) !== -1;
  }

  // Brief §3.9 — chip predicates. "all" = no filter; others apply additive
  // with search. Uses EF-supplied recipient fields populated in Phase 2.
  var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  function matchesChip(r, chip) {
    if (!chip || chip === 'all') return true;
    if (chip === 'last_30_days') {
      if (!r.created_at) return false;
      var d = new Date(r.created_at).getTime();
      if (isNaN(d)) return false;
      return (Date.now() - d) <= THIRTY_DAYS_MS;
    }
    if (chip === 'no_prior_registration') {
      return (r.prior_active_attendee_count || 0) === 0;
    }
    if (chip === 'customers') {
      return (r.attended_event_count || 0) >= 1;
    }
    return true;
  }

  function visibleRecipients(state) {
    if (!state) return [];
    return state.recipients.filter(function (r) {
      return matchesSearch(r, state.search || '') && matchesChip(r, state.chip || 'all');
    });
  }

  // ---------- atomic renderers ----------

  function renderHistoryLine(r) {
    // Brief §3.10 — last-message-sent indicator inside the body-expand panel.
    if (!r.last_message_sent_at) {
      return '<div class="text-xs text-slate-400 mb-1">📩 אין הודעות קודמות לנמען זה.</div>';
    }
    return '<div class="text-xs text-slate-500 mb-1">📩 הודעה אחרונה: <strong>' + escapeHtml(fmtDate(r.last_message_sent_at)) + '</strong>' +
      (r.last_template_slug ? ' — <span class="font-mono">' + escapeHtml(r.last_template_slug) + '</span>' : '') +
      '</div>';
  }

  function renderExpandedBody(r) {
    var historyLine = renderHistoryLine(r);
    var smsBlock = '';
    if (r.message_body_sms && r.message_body_sms.length) {
      smsBlock =
        '<div class="border border-slate-200 rounded-lg p-2 bg-white mb-2">' +
          '<div class="text-xs text-slate-500 mb-1">📱 ' + escapeHtml(channelLabel('sms')) + '</div>' +
          '<pre class="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-48 overflow-auto">' + escapeHtml(r.message_body_sms) + '</pre>' +
        '</div>';
    }
    var emailBlock = '';
    if (r.message_body_email && r.message_body_email.length) {
      emailBlock =
        '<div class="border border-slate-200 rounded-lg p-2 bg-white mb-2">' +
          '<div class="text-xs text-slate-500 mb-1">✉️ ' + escapeHtml(channelLabel('email')) + ' (HTML source)</div>' +
          '<pre class="whitespace-pre-wrap text-xs text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-48 overflow-auto" style="direction:ltr">' + escapeHtml(r.message_body_email) + '</pre>' +
        '</div>';
    }
    if (!smsBlock && !emailBlock) return historyLine + '<div class="text-center text-slate-400 py-2">אין תוכן הודעה לנמען זה.</div>';
    return historyLine + smsBlock + emailBlock;
  }

  function renderRecipientRow(r, state) {
    var leadId = r.lead_id || '';
    var checked = (!state || !state.excluded.has(leadId)) ? 'checked' : '';
    var expanded = state && state.expanded.has(leadId);
    var caret = expanded ? '▼' : '◀';
    var testBadge = (state && state.testSent.has(leadId))
      ? ' <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ms-1">📤 נשלח טסט</span>'
      : '';
    var mainRow =
      '<tr class="border-b border-slate-100" data-ccsv2-row="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '">' +
        '<td class="px-2 py-2 align-middle"><input type="checkbox" data-ccsv2-cb="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '" ' + checked + ' class="cursor-pointer"></td>' +
        '<td class="px-3 py-2 text-slate-800 cursor-pointer" data-ccsv2-expand="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '"><span class="text-slate-400 me-1">' + caret + '</span>' + escapeHtml(r.full_name || '—') + testBadge + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr;text-align:end">' + escapeHtml(fmtPhone(r.phone) || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr">' + escapeHtml(r.email || '—') + '</td>' +
      '</tr>';
    if (!expanded) return mainRow;
    var expandRow =
      '<tr class="bg-slate-50" data-ccsv2-expand-row="1" data-ccsv2-lead-id="' + escapeHtml(leadId) + '">' +
        '<td colspan="4" class="px-3 py-2">' + renderExpandedBody(r) + '</td>' +
      '</tr>';
    return mainRow + expandRow;
  }

  function renderRecipientTable(state) {
    var visible = visibleRecipients(state);
    if (!visible.length) {
      return '<div class="text-center text-slate-400 py-6">אין נמענים תואמים לפילטר.</div>';
    }
    var header =
      '<thead><tr>' +
        '<th class="px-2 py-2 text-start font-semibold text-slate-700 bg-slate-50" style="width:1.5rem">&nbsp;</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">שם</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">טלפון</th>' +
        '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">מייל</th>' +
      '</tr></thead>';
    var rows = visible.map(function (r) { return renderRecipientRow(r, state); }).join('');
    return (
      '<div class="overflow-auto max-h-[50vh] border border-slate-200 rounded-lg">' +
        '<table class="w-full text-sm">' + header + '<tbody data-ccsv2-tbody="1">' + rows + '</tbody></table>' +
      '</div>'
    );
  }

  function renderHeader(state) {
    var pv = state && state.previewResponse;
    if (!pv) return '';
    var rules = Array.isArray(pv.rules) ? pv.rules : [];
    var channels = Array.isArray(pv.channels) ? pv.channels : [];
    var ruleLine = rules.length === 1
      ? 'חוק: "' + escapeHtml(rules[0].rule_name || '') + '"'
      : (rules.length + ' חוקים');
    var channelChips = channels.map(function (c) {
      return '<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 me-1">' + channelIcon(c) + ' ' + escapeHtml(channelLabel(c)) + '</span>';
    }).join('');
    return '<div class="text-xs text-slate-500 mb-2">' + ruleLine + ' &nbsp;·&nbsp; ' + channelChips + '</div>';
  }

  // Brief §3.9 — quick filter chips. "customers" disabled if no recipient
  // qualifies; the Phase 2 EF response includes attended_event_count.
  function renderChips(state) {
    if (!state) return '';
    var activeChip = state.chip || 'all';
    var customersCount = state.recipients.filter(function (r) { return (r.attended_event_count || 0) >= 1; }).length;
    var customersDisabled = customersCount === 0;
    function chip(slug, label, disabled) {
      var on = (slug === activeChip);
      var classes = 'inline-block text-xs px-2.5 py-1 rounded-full cursor-pointer me-1 transition border';
      classes += on
        ? ' bg-indigo-600 text-white border-indigo-600'
        : ' bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
      if (disabled) classes += ' opacity-40 cursor-not-allowed';
      var attrs = 'data-ccsv2-chip="' + escapeHtml(slug) + '"';
      if (disabled) attrs += ' aria-disabled="true"';
      return '<span class="' + classes + '" ' + attrs + '>' + escapeHtml(label) + '</span>';
    }
    return (
      '<div class="flex flex-wrap items-center gap-1 mb-2">' +
        chip('all',                    'הכל', false) +
        chip('last_30_days',           '30 ימים אחרונים', false) +
        chip('no_prior_registration',  'ללא הרשמה לאירוע קודם', false) +
        chip('customers',              'לקוחות' + (customersCount ? ' (' + customersCount + ')' : ''), customersDisabled) +
      '</div>'
    );
  }

  function renderControls(state) {
    var searchVal = state && state.search ? escapeHtml(state.search) : '';
    return (
      renderChips(state) +
      '<div class="flex items-center gap-2 mb-2">' +
        '<input type="text" data-ccsv2-search="1" value="' + searchVal + '" placeholder="🔎 חיפוש לפי שם, טלפון, או מייל" class="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">' +
      '</div>'
    );
  }

  // Brief §3.8 — incremental count text. Three states:
  //  loading      → "🔄 מחשב נמענים..."
  //  count_only   → "<N> נמענים נמצאו. טוען פרטים..."  (interim, unused today)
  //  loaded       → "<N> נמענים (<K> נבחרו, <T> נשלחו טסט)"
  function renderCountLine(state) {
    if (!state || state.phase === 'loading') {
      return '<div class="text-sm text-slate-700 mb-2" data-ccsv2-count="1">🔄 מחשב נמענים...</div>';
    }
    var total = state.recipients.length;
    var sel = total - state.excluded.size;
    return '<div class="text-sm text-slate-700 mb-2" data-ccsv2-count="1">' + total + ' נמענים (' + sel + ' נבחרו, ' + state.testSent.size + ' נשלחו טסט)</div>';
  }

  // M4_V2_MODAL_SESSION_RESTORE_FIX (2026-05-14): notice + quick-undo shown
  // when the modal opened with a non-empty restored excluded set from
  // sessionStorage. Brief §3.1 — "Restored your previous selections" surface.
  function renderRestoredNotice(state) {
    if (!state || !state.restored) return '';
    var n = state.excluded.size;
    if (n === 0) return '';
    return (
      '<div class="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900" data-ccsv2-restored-notice="1">' +
        '<span>♻️ שוחזרו ' + n + ' בחירות קודמות (התעלמויות שמורות).</span>' +
        '<button type="button" data-ccsv2-undo-restore="1" class="ms-auto px-2 py-0.5 border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 rounded text-xs cursor-pointer">בטל שחזור</button>' +
      '</div>'
    );
  }

  function renderBody(state) {
    if (!state || state.phase === 'loading') {
      return (
        '<div class="text-xs text-slate-500 mb-2" data-ccsv2-header="1">🔄</div>' +
        renderCountLine(state) +
        '<div class="text-center text-slate-400 py-10">טוען פרטי נמענים מהשרת...</div>'
      );
    }
    return (
      renderHeader(state) +
      renderRestoredNotice(state) +
      renderControls(state) +
      renderCountLine(state) +
      renderRecipientTable(state)
    );
  }

  function renderFooter(state) {
    var total = state ? state.recipients.length : 0;
    var testDisabled = total < 3 ? ' disabled' : '';
    return (
      '<button type="button" id="ccsv2-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="ccsv2-test-send" class="px-4 py-2 border border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed" data-ccsv2-test="1"' + testDisabled + '>📤 שלח טסט ל-3 הראשונים</button>' +
      '<button type="button" id="ccsv2-confirm-no-notify" class="px-4 py-2 border border-slate-400 bg-white text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition">אישור ללא הודעות</button>' +
      '<button type="button" id="ccsv2-confirm-notify" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm" data-ccsv2-approve="1">אישור ושלח הודעות (' + total + ')</button>'
    );
  }

  window.__CcsV2Render = {
    visibleRecipients: visibleRecipients,
    renderBody: renderBody,
    renderFooter: renderFooter,
    renderRecipientTable: renderRecipientTable,
    renderCountLine: renderCountLine,
  };
})();
