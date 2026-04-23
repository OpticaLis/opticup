/* =============================================================================
   crm-confirm-send.js — Confirmation Gate for automated CRM dispatches (P20)
   Preview modal shown before ANY automated send (event status change, event
   registration, future automation rules). Prevents accidental mass-sends.
   Load order: AFTER crm-messaging-send.js and crm-automation-engine.js.
   Uses Modal, Toast, escapeHtml, CrmMessaging, CrmHelpers.
   Exports window.CrmConfirmSend.show(sendPlan).
   Not called for: broadcast wizard, manual send dialog, lead-intake EF.
   ============================================================================= */
(function () {
  'use strict';

  function fmtPhone(p) {
    if (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') return CrmHelpers.formatPhone(p);
    return p || '';
  }

  function channelLabel(ch) { return ch === 'email' ? 'אימייל' : (ch === 'whatsapp' ? 'WhatsApp' : 'SMS'); }
  function channelIcon(ch)  { return ch === 'email' ? '✉️' : (ch === 'whatsapp' ? '💬' : '📱'); }

  function renderBodyPreview(item) {
    var body = String(item.composedBody || '');
    if (item.channel === 'email') {
      // Strip simple HTML tags for preview, keep first 3 lines.
      var plain = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
      var lines = plain.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var head = lines.slice(0, 3).join('\n');
      var more = lines.length > 3 ? '\n…' : '';
      return escapeHtml(head + more);
    }
    return escapeHtml(body);
  }

  function renderCard(item) {
    var rcpt = item.recipient || {};
    var addr = item.channel === 'email' ? (rcpt.email || '') : fmtPhone(rcpt.phone);
    return (
      '<div class="border border-slate-200 rounded-lg p-3 bg-white">' +
        '<div class="flex items-center gap-2 text-xs text-slate-600 mb-2">' +
          '<span>' + channelIcon(item.channel) + '</span>' +
          '<span class="font-semibold">' + escapeHtml(channelLabel(item.channel)) + '</span>' +
          '<span>→</span>' +
          '<span class="text-slate-800">' + escapeHtml(rcpt.name || '—') + '</span>' +
          (addr ? '<span class="text-slate-500" style="direction:ltr">(' + escapeHtml(addr) + ')</span>' : '') +
        '</div>' +
        '<pre class="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-40 overflow-auto">' + renderBodyPreview(item) + '</pre>' +
      '</div>'
    );
  }

  function renderGroup(ruleName, items) {
    var cards = items.map(renderCard).join('');
    return (
      '<div class="space-y-2">' +
        '<div class="text-sm font-semibold text-slate-700">חוק: <span class="text-indigo-700">' + escapeHtml(ruleName) + '</span> <span class="text-xs text-slate-500">(' + items.length + ')</span></div>' +
        cards +
      '</div>'
    );
  }

  function groupByRule(plan) {
    var groups = [];
    var byName = {};
    plan.forEach(function (it) {
      var key = it.rule_name || 'אוטומציה';
      if (byName[key] == null) { byName[key] = groups.length; groups.push({ name: key, items: [] }); }
      groups[byName[key]].items.push(it);
    });
    return groups;
  }

  async function writePendingReviewRows(plan) {
    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId) return { ok: false, error: 'no_tenant' };
    var rows = plan.map(function (it) {
      return {
        tenant_id: tenantId,
        lead_id: it.lead_id,
        event_id: it.event_id || null,
        template_id: it.template_id || null,
        channel: it.channel,
        content: it.composedBody || '',
        status: 'pending_review'
      };
    });
    var res = await sb.from('crm_message_log').insert(rows);
    if (res.error) { console.error('CrmConfirmSend cancel log write failed', res.error); return { ok: false, error: res.error.message }; }
    return { ok: true, count: rows.length };
  }

  async function approveAndSend(plan) {
    if (!window.CrmMessaging || typeof CrmMessaging.sendMessage !== 'function') {
      if (window.Toast) Toast.error('CrmMessaging אינו זמין');
      return { sent: 0, failed: plan.length };
    }
    var calls = plan.map(function (it) {
      return CrmMessaging.sendMessage({
        leadId: it.lead_id,
        channel: it.channel,
        templateSlug: it.template_slug,
        variables: it.variables || {},
        eventId: it.event_id || undefined,
        language: it.language || 'he'
      });
    });
    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0;
    results.forEach(function (r) { if (r.status === 'fulfilled' && r.value && r.value.ok) sent++; else failed++; });
    return { sent: sent, failed: failed };
  }

  async function show(sendPlan) {
    if (!Array.isArray(sendPlan) || !sendPlan.length) return;
    if (typeof Modal === 'undefined') { console.error('CrmConfirmSend: Modal not available'); return; }

    var total = sendPlan.length;
    var groups = groupByRule(sendPlan);
    var content =
      '<div class="space-y-4">' +
        '<div class="text-xs text-slate-500">אישור שליחה של ' + total + ' הודעות אוטומטיות. ניתן לאשר או לבטל — ביטול ישמור את ההודעות בלוג לעריכה ושליחה מאוחר יותר.</div>' +
        groups.map(function (g) { return renderGroup(g.name, g.items); }).join('<div class="border-t border-slate-100"></div>') +
      '</div>';

    var footerHtml =
      '<button type="button" id="ccs-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">בטל</button>' +
      '<button type="button" id="ccs-approve" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">אשר ושלח (' + total + ')</button>';

    var modal = Modal.show({
      title: '📩 אישור שליחת הודעות (' + total + ')',
      size: 'md',
      content: content,
      footer: footerHtml
    });

    var approveBtn = modal.el.querySelector('#ccs-approve');
    var cancelBtn  = modal.el.querySelector('#ccs-cancel');

    approveBtn.addEventListener('click', async function () {
      approveBtn.disabled = true;
      approveBtn.textContent = 'שולח...';
      cancelBtn.disabled = true;
      var r = await approveAndSend(sendPlan);
      if (typeof modal.close === 'function') modal.close();
      if (window.Toast) {
        if (r.failed === 0) Toast.success('נשלחו ' + r.sent + ' הודעות');
        else Toast.warning('נשלחו ' + r.sent + ', ' + r.failed + ' נכשלו');
      }
    });

    cancelBtn.addEventListener('click', async function () {
      cancelBtn.disabled = true;
      approveBtn.disabled = true;
      cancelBtn.textContent = 'מבטל...';
      var r = await writePendingReviewRows(sendPlan);
      if (typeof modal.close === 'function') modal.close();
      if (window.Toast) {
        if (r.ok) Toast.info('ההודעות בוטלו ונשמרו בלוג — ניתן לערוך ולשלוח מחדש');
        else Toast.error('שגיאה בשמירת ההודעות: ' + (r.error || 'unknown'));
      }
    });
  }

  window.CrmConfirmSend = { show: show };
})();
