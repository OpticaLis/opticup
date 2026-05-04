/* =============================================================================
   crm-confirm-send.js — Confirmation Gate for automated CRM dispatches (P20)
   P21: Two-tab layout — Messages (1 card per channel per rule), Recipients
   (sortable paginated table, dedup by lead_id). Scales to 200+ recipients.
   Load order: AFTER crm-messaging-send.js and crm-automation-engine.js.
   Uses Modal, Toast, escapeHtml, CrmMessaging, CrmHelpers.
   Exports window.CrmConfirmSend.show(sendPlan).
   Not called for: broadcast wizard, manual send dialog, lead-intake EF.
   ============================================================================= */
(function () {
  'use strict';

  var PAGE_SIZE = 50;
  var _state = { activeTab: 'messages', page: 1, sortCol: 'name', sortDir: 'asc' };

  function fmtPhone(p) {
    if (window.CrmHelpers && typeof CrmHelpers.formatPhone === 'function') return CrmHelpers.formatPhone(p);
    return p || '';
  }
  function channelLabel(ch) { return ch === 'email' ? 'אימייל' : (ch === 'whatsapp' ? 'WhatsApp' : 'SMS'); }
  function channelIcon(ch)  { return ch === 'email' ? '✉️' : (ch === 'whatsapp' ? '💬' : '📱'); }

  function renderBodyPreview(body, channel) {
    var text = String(body || '');
    if (channel === 'email') {
      var plain = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
      var lines = plain.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var head = lines.slice(0, 3).join('\n');
      return escapeHtml(head + (lines.length > 3 ? '\n…' : ''));
    }
    return escapeHtml(text);
  }

  function groupByRule(plan) {
    var groups = [], byName = {};
    plan.forEach(function (it) {
      var key = it.rule_name || 'אוטומציה';
      if (byName[key] == null) { byName[key] = groups.length; groups.push({ name: key, items: [] }); }
      groups[byName[key]].items.push(it);
    });
    return groups;
  }

  // Dedup recipients by lead_id. If same lead appears in multiple rules,
  // show once with a count badge (SPEC §2 A1).
  function dedupRecipients(plan) {
    var map = {}, out = [];
    plan.forEach(function (it) {
      var key = it.lead_id || ('#idx-' + out.length);
      var rn = it.rule_name || 'אוטומציה';
      if (map[key] != null) { out[map[key]].rules[rn] = true; return; }
      var r = it.recipient || {};
      var evtName = (it.variables && it.variables.event_name) || '';
      var rules = {}; rules[rn] = true;
      map[key] = out.length;
      out.push({ name: r.name || '', phone: r.phone || '', email: r.email || '', event: evtName, rules: rules });
    });
    return out;
  }

  function sortRecipients(rows, col, dir) {
    var sign = dir === 'desc' ? -1 : 1;
    return rows.slice().sort(function (a, b) {
      return sign * String(a[col] || '').localeCompare(String(b[col] || ''), 'he');
    });
  }

  function renderMessagesTab(plan) {
    var groups = groupByRule(plan);
    var showHdr = groups.length > 1;
    var html = groups.map(function (g) {
      var hdr = showHdr ? '<div class="text-sm font-semibold text-slate-700 mt-1 mb-2">חוק: <span class="text-indigo-700">' + escapeHtml(g.name) + '</span></div>' : '';
      var seen = {}, cards = [];
      g.items.forEach(function (it) {
        if (seen[it.channel]) return;
        seen[it.channel] = true;
        cards.push(
          '<div class="border border-slate-200 rounded-lg p-3 bg-white mb-2">' +
            '<div class="flex items-center gap-2 text-xs text-slate-600 mb-2">' +
              '<span>' + channelIcon(it.channel) + '</span>' +
              '<span class="font-semibold">' + escapeHtml(channelLabel(it.channel)) + '</span>' +
              '<span class="text-slate-400">(דוגמה — המשתנים מוחלפים לכל נמען)</span>' +
            '</div>' +
            '<pre class="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded p-2 max-h-48 overflow-auto">' + renderBodyPreview(it.composedBody, it.channel) + '</pre>' +
          '</div>'
        );
      });
      return hdr + cards.join('');
    }).join('<div class="border-t border-slate-100 my-2"></div>');
    return html || '<div class="text-center text-slate-400 py-4">אין הודעות</div>';
  }

  function renderRecipientsTab(plan) {
    var all = dedupRecipients(plan);
    var sorted = sortRecipients(all, _state.sortCol, _state.sortDir);
    var total = sorted.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (_state.page > pages) _state.page = pages;
    var start = (_state.page - 1) * PAGE_SIZE;
    var slice = sorted.slice(start, start + PAGE_SIZE);

    function th(col, label) {
      var arrow = _state.sortCol === col ? (_state.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50 cursor-pointer select-none" data-ccs-sort="' + col + '">' + escapeHtml(label) + escapeHtml(arrow) + '</th>';
    }
    var header = '<thead><tr>' + th('name','שם') + th('phone','טלפון') + th('email','מייל') + th('event','אירוע') + '</tr></thead>';
    var rows = slice.map(function (r) {
      var rc = Object.keys(r.rules).length;
      var mult = rc > 1 ? ' <span class="text-xs text-amber-600">(×' + rc + ')</span>' : '';
      return '<tr class="border-b border-slate-100">' +
        '<td class="px-3 py-2 text-slate-800">' + escapeHtml(r.name || '—') + mult + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr;text-align:end">' + escapeHtml(fmtPhone(r.phone) || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-700 text-xs" style="direction:ltr">' + escapeHtml(r.email || '—') + '</td>' +
        '<td class="px-3 py-2 text-slate-600">' + escapeHtml(r.event || '—') + '</td>' +
      '</tr>';
    }).join('');
    var table = '<div class="overflow-auto max-h-96 border border-slate-200 rounded-lg"><table class="w-full text-sm">' + header + '<tbody>' + rows + '</tbody></table></div>';

    var pag;
    if (pages > 1) {
      var lo = start + 1, hi = Math.min(start + PAGE_SIZE, total);
      pag = '<div class="flex items-center justify-between mt-3 text-xs text-slate-600">' +
        '<span>מציג ' + lo + '–' + hi + ' מתוך ' + total + '</span>' +
        '<span class="flex gap-1 items-center">' +
          (_state.page > 1 ? '<button type="button" class="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50" data-ccs-page="prev">›</button>' : '') +
          '<span class="px-2 py-1">' + _state.page + ' / ' + pages + '</span>' +
          (_state.page < pages ? '<button type="button" class="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50" data-ccs-page="next">‹</button>' : '') +
        '</span>' +
      '</div>';
    } else {
      pag = '<div class="mt-3 text-xs text-slate-600">סה״כ ' + total + ' נמענים</div>';
    }
    return table + pag;
  }

  function renderTabContent(modalEl, plan) {
    var host = modalEl.querySelector('#ccs-tab-body');
    if (!host) return;
    host.innerHTML = _state.activeTab === 'messages' ? renderMessagesTab(plan) : renderRecipientsTab(plan);
    if (_state.activeTab === 'recipients') {
      host.querySelectorAll('[data-ccs-sort]').forEach(function (t) {
        t.addEventListener('click', function () {
          var col = t.getAttribute('data-ccs-sort');
          if (_state.sortCol === col) _state.sortDir = (_state.sortDir === 'asc' ? 'desc' : 'asc');
          else { _state.sortCol = col; _state.sortDir = 'asc'; }
          _state.page = 1;
          renderTabContent(modalEl, plan);
        });
      });
      host.querySelectorAll('[data-ccs-page]').forEach(function (b) {
        b.addEventListener('click', function () {
          _state.page += (b.getAttribute('data-ccs-page') === 'prev' ? -1 : 1);
          renderTabContent(modalEl, plan);
        });
      });
    }
    modalEl.querySelectorAll('[data-ccs-tab]').forEach(function (t) {
      var on = t.getAttribute('data-ccs-tab') === _state.activeTab;
      t.className = 'px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 ' + (on ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-800');
    });
  }

  async function writePendingReviewRows(plan) {
    var tenantId = typeof getTenantId === 'function' ? getTenantId() : null;
    if (!tenantId) return { ok: false, error: 'no_tenant' };
    var rows = plan.map(function (it) {
      return {
        tenant_id: tenantId, lead_id: it.lead_id, event_id: it.event_id || null,
        template_id: it.template_id || null, channel: it.channel,
        content: it.composedBody || '', status: 'pending_review',
        run_id: it.run_id || null
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
        leadId: it.lead_id, channel: it.channel, templateSlug: it.template_slug,
        variables: it.variables || {}, eventId: it.event_id || undefined, language: it.language || 'he', runId: it.run_id || undefined
      });
    });
    var results = await Promise.allSettled(calls);
    var sent = 0, failed = 0, rejected = 0;
    var runId = (plan[0] && plan[0].run_id) || null;
    results.forEach(function (r, i) {
      var v = r.status === 'fulfilled' ? r.value : null;
      var ok = v && v.ok;
      if (ok) sent++;
      else if (v && v.error === 'phone_not_allowed') rejected++;
      else failed++;
      if (ok && runId && v.logId && window.CrmAutomationRuns) CrmAutomationRuns.stampLog(v.logId, runId);
    });
    if (window.CrmAutomationPostActions && typeof CrmAutomationPostActions.promoteWaitingLeadsToInvited === 'function') {
      try { await CrmAutomationPostActions.promoteWaitingLeadsToInvited(plan, results); }
      catch (e) { console.error('promoteWaitingLeadsToInvited:', e); }
    }
    if (runId && window.CrmAutomationRuns) await CrmAutomationRuns.finishRun(runId, 'completed');
    return { sent: sent, failed: failed, rejected: rejected };
  }

  async function show(sendPlan, onChoice) {
    // ATOMIC_CONFIRMATION_FLOW Part A: 3-button modal contract.
    // onChoice signature: async function(choice, sendPlan) where
    //   choice = { dispatch: true }  → "אישור ושלח הודעות" — status commits + dispatch
    //   choice = { dispatch: false } → "אישור ללא הודעות" — status commits only
    //   Cancel button does NOT call onChoice — modal closes, no commit.
    // Backward compat: legacy 1-arg show(planItems) — both confirm buttons call
    // approveAndSend(sendPlan) (legacy in-process dispatch). Cancel still closes
    // without commit. Only crm-automation-engine.js:306 calls 1-arg legacy and
    // it is unreachable post-Rung-2 (Rung 3 deletes it).
    if (!Array.isArray(sendPlan) || !sendPlan.length) return;
    if (typeof Modal === 'undefined') { console.error('CrmConfirmSend: Modal not available'); return; }
    _state.activeTab = 'messages'; _state.page = 1; _state.sortCol = 'name'; _state.sortDir = 'asc';

    var total = sendPlan.length;
    var recipients = dedupRecipients(sendPlan).length;
    var rules = groupByRule(sendPlan);
    var ruleLine = rules.length === 1 ? 'חוק: "' + escapeHtml(rules[0].name) + '"' : (rules.length + ' חוקים');

    var content =
      '<div class="space-y-3">' +
        '<div class="text-xs text-slate-500">' + ruleLine + '</div>' +
        '<div class="flex border-b border-slate-200">' +
          '<div data-ccs-tab="messages" class="px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 border-indigo-600 text-indigo-700">📝 הודעות</div>' +
          '<div data-ccs-tab="recipients" class="px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 border-transparent text-slate-600 hover:text-slate-800">👥 נמענים (' + recipients + ')</div>' +
        '</div>' +
        '<div id="ccs-tab-body" class="pt-2"></div>' +
      '</div>';
    // 3-button atomic modal: Cancel / Confirm-no-notify / Confirm-and-notify.
    // Per Prizma Design System Canon: outline gray for Cancel, neutral gray for
    // Confirm-no-notify, primary indigo for Confirm-and-notify.
    var footerHtml =
      '<button type="button" id="ccs-cancel" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">ביטול</button>' +
      '<button type="button" id="ccs-confirm-no-notify" class="px-4 py-2 border border-slate-400 bg-white text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition">אישור ללא הודעות</button>' +
      '<button type="button" id="ccs-confirm-notify" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm">אישור ושלח הודעות (' + total + ')</button>';

    var modal = Modal.show({ title: 'אישור פעולה', size: 'lg', content: content, footer: footerHtml });

    modal.el.querySelectorAll('[data-ccs-tab]').forEach(function (t) {
      t.addEventListener('click', function () {
        var tab = t.getAttribute('data-ccs-tab');
        if (tab === _state.activeTab) return;
        _state.activeTab = tab;
        renderTabContent(modal.el, sendPlan);
      });
    });
    renderTabContent(modal.el, sendPlan);

    var confirmNotifyBtn   = modal.el.querySelector('#ccs-confirm-notify');
    var confirmNoNotifyBtn = modal.el.querySelector('#ccs-confirm-no-notify');
    var cancelBtn          = modal.el.querySelector('#ccs-cancel');

    async function handleConfirm(choice, btnEl, busyText) {
      confirmNotifyBtn.disabled = true; confirmNoNotifyBtn.disabled = true; cancelBtn.disabled = true;
      btnEl.textContent = busyText;
      var r;
      if (typeof onChoice === 'function') {
        r = await onChoice(choice, sendPlan);
        if (!r) r = { sent: 0, failed: choice.dispatch ? sendPlan.length : 0, rejected: 0 };
      } else {
        // Legacy 1-arg path (unreachable post-Rung-2). Both confirm buttons
        // fall back to in-process approveAndSend so the path doesn't silently
        // break if something resurfaces it.
        r = await approveAndSend(sendPlan);
      }
      if (typeof modal.close === 'function') modal.close();
      if (window.Toast) {
        var msg;
        if (choice.dispatch) {
          msg = 'נשלחו ' + r.sent + ', נכשלו ' + r.failed + ', נדחו ' + (r.rejected || 0);
          if (r.failed === 0 && (r.rejected || 0) === 0) Toast.success(msg);
          else Toast.warning(msg);
        } else {
          Toast.success('הסטטוסים עודכנו (ללא שליחת הודעות)');
        }
      }
    }

    confirmNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: true }, confirmNotifyBtn, 'שולח...');
    });

    confirmNoNotifyBtn.addEventListener('click', function () {
      handleConfirm({ dispatch: false }, confirmNoNotifyBtn, 'מעדכן...');
    });

    cancelBtn.addEventListener('click', function () {
      // Cancel = atomic abort. No EF call, no DB write, no callback. Modal closes.
      if (typeof modal.close === 'function') modal.close();
    });
  }

  window.CrmConfirmSend = { show: show };
})();
