/* =============================================================================
   crm-messaging-broadcast.js — Broadcast wizard (B8 Tailwind — FINAL-04, P8 split)
   Tables: crm_broadcasts, crm_message_log, crm_leads, crm_events
   Log rendering extracted to crm-messaging-log.js (P8, Rule 12 split, 2026-04-22).
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var WIZARD_STEPS = [
    { key: 'recipients', label: 'נמענים' },
    { key: 'channel',    label: 'ערוץ' },
    { key: 'template',   label: 'תבנית' },
    { key: 'timing',     label: 'תזמון' },
    { key: 'confirm',    label: 'אישור' }
  ];

  var CLS_INPUT  = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_LABEL  = 'block text-sm font-medium text-slate-700 mb-1';
  var CLS_ROW    = 'mb-3';
  var CLS_BTN_P  = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed';
  var CLS_BTN_S  = 'px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed';

  var _events = [];
  var _wizard = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function logWrite(a, et, eid, meta) {
    if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: et, entity_id: eid, severity: 'info', metadata: meta || {} }); } catch (_) {} }
  }

  function variablePanelHtml(idPrefix) {
    var vars = window.CRM_TEMPLATE_VARIABLES || [];
    if (!vars.length) return '';
    var items = vars.map(function (v) {
      return '<div class="flex items-center justify-between px-2 py-1.5 hover:bg-indigo-50 rounded cursor-pointer gap-3" data-copy-var="' + escapeHtml(v.key) + '">' +
        '<code class="text-xs text-indigo-600">' + escapeHtml(v.key) + '</code>' +
        '<span class="text-xs text-slate-500">' + escapeHtml(v.desc) + '</span>' +
      '</div>';
    }).join('');
    return '<div class="mt-2 border border-slate-200 rounded-lg bg-white">' +
      '<button type="button" class="w-full text-start px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-t-lg" id="' + idPrefix + '-toggle">משתנים זמינים (לחץ להעתקה) ▾</button>' +
      '<div class="hidden p-2 grid grid-cols-1 sm:grid-cols-2 gap-1 border-t border-slate-200" id="' + idPrefix + '-list">' + items + '</div>' +
    '</div>';
  }

  function wireVariablePanel(root, idPrefix) {
    if (!root) return;
    var toggle = root.querySelector('#' + idPrefix + '-toggle');
    var list = root.querySelector('#' + idPrefix + '-list');
    if (toggle && list) {
      toggle.addEventListener('click', function () {
        list.classList.toggle('hidden');
      });
    }
    if (list) {
      list.querySelectorAll('[data-copy-var]').forEach(function (el) {
        el.addEventListener('click', function () {
          var v = el.getAttribute('data-copy-var');
          copyVarToClipboard(v);
        });
      });
    }
  }

  function copyVarToClipboard(v) {
    if (!v) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(function () {
        toast('success', 'הועתק: ' + v);
      }).catch(function () {
        _fallbackCopy(v);
      });
    } else {
      _fallbackCopy(v);
    }
  }

  function _fallbackCopy(v) {
    try {
      var tmp = document.createElement('input');
      tmp.value = v; tmp.style.position = 'fixed'; tmp.style.top = '-1000px';
      document.body.appendChild(tmp);
      tmp.select(); document.execCommand('copy');
      document.body.removeChild(tmp);
      toast('success', 'הועתק: ' + v);
    } catch (_) {
      toast('error', 'העתקה נכשלה');
    }
  }

  window.CrmBroadcastClipboard = { copy: copyVarToClipboard, panelHtml: variablePanelHtml, wire: wireVariablePanel };

  async function renderMessagingBroadcast(host) {
    if (!host) return;
    host.innerHTML = '<div class="text-center text-slate-400 py-8">טוען...</div>';
    try { await ensureCrmStatusCache(); await loadEventsOnce(); renderBroadcastIntro(host); }
    catch (e) { host.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">' + escapeHtml(e.message || String(e)) + '</div>'; }
  }
  window.renderMessagingBroadcast = renderMessagingBroadcast;

  async function loadEventsOnce() {
    if (_events.length) return;
    var tid = getTenantId();
    var q = sb.from('crm_events').select('id, event_number, name, event_date').eq('is_deleted', false);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('event_date', { ascending: false });
    var res = await q;
    if (res.error) throw new Error(res.error.message);
    _events = res.data || [];
  }

  function renderBroadcastIntro(host) {
    host.innerHTML =
      '<div class="flex items-center justify-between mb-4">' +
        '<div>' +
          '<h3 class="text-lg font-bold text-slate-800 m-0">שליחה ידנית</h3>' +
          '<p class="text-sm text-slate-500 mt-1">אשף שליחה בן 5 שלבים: נמענים, ערוץ, תבנית, תזמון, אישור.</p>' +
        '</div>' +
        '<button type="button" class="' + CLS_BTN_P + '" id="open-wizard">+ שליחה חדשה</button>' +
      '</div>' +
      '<div id="bc-history" class="mt-4"></div>';
    var btn = host.querySelector('#open-wizard');
    if (btn) btn.addEventListener('click', openWizard);
    if (typeof window.renderMessagingLog === 'function') window.renderMessagingLog(host.querySelector('#bc-history'));
  }

  function openWizard() {
    _wizard = {
      step: 0,
      boards: ['incoming', 'registered'],
      statuses: [],
      events: [],
      openEventsOnly: false,
      language: '',
      source: '',
      channel: 'whatsapp',
      templateId: '',
      body: '',
      name: '',
      schedule: 'now',
      recipients: 0,
      _matchedLeads: []
    };
    var modal = Modal.show({ title: 'אשף שליחה', size: 'lg', content: wizardHtml() });
    var root = modal.el.querySelector('.modal-body');
    if (root) wireWizard(root);
  }

  function wizardHtml() {
    var dots = '<div class="flex items-center justify-between mb-6 px-2">' +
      WIZARD_STEPS.map(function (s, i) {
        var isActive = i === _wizard.step, isDone = i < _wizard.step;
        var dotCls = isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                   : isDone ? 'bg-emerald-500 text-white'
                   : 'bg-slate-200 text-slate-500';
        var labelCls = isActive ? 'text-indigo-700 font-bold' : 'text-slate-500';
        return '<div class="flex flex-col items-center gap-1.5 flex-1">' +
          '<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ' + dotCls + '" data-wiz-dot="' + i + '">' + (isDone ? '✓' : (i + 1)) + '</div>' +
          '<span class="text-xs ' + labelCls + '">' + escapeHtml(s.label) + '</span>' +
        '</div>' +
        (i < WIZARD_STEPS.length - 1 ? '<div class="flex-1 h-0.5 ' + (isDone ? 'bg-emerald-500' : 'bg-slate-200') + ' mt-[-20px]"></div>' : '');
      }).join('') +
    '</div>';
    var body = '<div class="py-2 min-h-[200px]" data-wiz-step="' + WIZARD_STEPS[_wizard.step].key + '">' + wizardStepBody(WIZARD_STEPS[_wizard.step].key) + '</div>';
    var nav = '<div class="flex gap-2 justify-end pt-4 border-t border-slate-200 mt-4">' +
      '<button type="button" class="' + CLS_BTN_S + '" id="wiz-back"' + (_wizard.step === 0 ? ' disabled' : '') + '>‹ חזור</button>' +
      '<button type="button" class="' + CLS_BTN_P + '" id="wiz-next">' + (_wizard.step === WIZARD_STEPS.length - 1 ? 'שלח ✓' : 'הבא ›') + '</button>' +
    '</div>';
    return dots + body + nav;
  }

  function wizardStepBody(key) {
    if (key === 'recipients') {
      if (window.CrmBroadcastFilters && typeof CrmBroadcastFilters.renderRecipientsStep === 'function') {
        return CrmBroadcastFilters.renderRecipientsStep(_wizard, _events);
      }
      return '<div class="text-rose-500">שגיאה: מודול סינון לא נטען</div>';
    }
    if (key === 'channel') {
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 2 — ערוץ</h4>' +
        '<div class="grid grid-cols-3 gap-3">' +
        ['whatsapp','sms','email'].map(function (c) {
          var chk = c === _wizard.channel;
          var box = chk ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300';
          return '<label class="flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer font-semibold transition ' + box + '"><input type="radio" name="wiz-channel" value="' + c + '"' + (chk ? ' checked' : '') + ' class="text-indigo-600 focus:ring-indigo-500"> ' + CHANNEL_LABELS[c] + '</label>';
        }).join('') + '</div>';
    }
    if (key === 'template') {
      var tpls = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
      var opts = tpls.filter(function (t) { return t.is_active; }).map(function (t) {
        return '<label class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 cursor-pointer">' +
          '<input type="radio" name="wiz-tpl" value="' + escapeHtml(t.id) + '"' + (t.id === _wizard.templateId ? ' checked' : '') + ' class="text-indigo-600">' +
          '<span class="font-medium text-sm text-slate-800">' + escapeHtml(t.name) + '</span>' +
          '<span class="text-xs text-slate-500 ms-auto">' + escapeHtml(CHANNEL_LABELS[t.channel] || t.channel) + '</span>' +
        '</label>';
      }).join('');
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 3 — תבנית</h4>' +
        '<div class="space-y-2 mb-3 max-h-48 overflow-y-auto">' + (opts || '<div class="text-center text-slate-400 py-4">אין תבניות פעילות</div>') + '</div>' +
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">תוכן</label><textarea id="wiz-body" rows="4" placeholder="תוכן הודעה ידני (או בחר תבנית)" class="' + CLS_INPUT + '">' + escapeHtml(_wizard.body) + '</textarea></div>' +
        variablePanelHtml('wiz-var');
    }
    if (key === 'timing') {
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 4 — תזמון</h4>' +
        '<div class="space-y-2 mb-3">' +
          '<label class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 cursor-pointer"><input type="radio" name="wiz-sched" value="now"' + (_wizard.schedule === 'now' ? ' checked' : '') + ' class="text-indigo-600"><span class="text-sm">שלח עכשיו</span></label>' +
          '<label class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 cursor-pointer"><input type="radio" name="wiz-sched" value="later"' + (_wizard.schedule === 'later' ? ' checked' : '') + ' class="text-indigo-600"><span class="text-sm">מתוזמן (לא נשמר ב-B7)</span></label>' +
        '</div>' +
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">שם שליחה</label><input type="text" id="wiz-name" value="' + escapeHtml(_wizard.name) + '" placeholder="לדוגמה: תזכורת לאירוע 25" class="' + CLS_INPUT + '"></div>';
    }
    if (key === 'confirm') {
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 5 — אישור</h4>' +
        '<div class="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">' +
          '<div class="flex justify-between"><span class="font-semibold text-slate-600">נמענים:</span><span class="text-indigo-700 font-bold">' + _wizard.recipients + '</span></div>' +
          '<div class="flex justify-between"><span class="font-semibold text-slate-600">ערוץ:</span><span>' + (CHANNEL_LABELS[_wizard.channel] || _wizard.channel) + '</span></div>' +
          '<div class="flex justify-between"><span class="font-semibold text-slate-600">תבנית:</span><span>' + (_wizard.templateId ? 'נבחרה' : 'חופשי') + '</span></div>' +
          '<div class="flex justify-between"><span class="font-semibold text-slate-600">תזמון:</span><span>' + (_wizard.schedule === 'now' ? 'מיידי' : 'מתוזמן') + '</span></div>' +
          '<div class="flex justify-between"><span class="font-semibold text-slate-600">שם:</span><span>' + escapeHtml(_wizard.name || '—') + '</span></div>' +
        '</div>' +
        '<div class="mt-3 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">לחץ "שלח" כדי ליצור broadcast ו-log rows.</div>';
    }
    return '';
  }

  function wireWizard(root) {
    root.querySelectorAll('[data-wiz-dot]').forEach(function (d) {
      d.addEventListener('click', function () { captureStep(root); _wizard.step = Number(d.getAttribute('data-wiz-dot')); rerenderWizard(root); });
    });
    var back = root.querySelector('#wiz-back'), next = root.querySelector('#wiz-next');
    if (back) back.addEventListener('click', function () { captureStep(root); if (_wizard.step > 0) _wizard.step--; rerenderWizard(root); });
    if (next) next.addEventListener('click', function () {
      captureStep(root);
      if (_wizard.step < WIZARD_STEPS.length - 1) { _wizard.step++; rerenderWizard(root); }
      else { doWizardSend(); }
    });
    if (_wizard.step === 0) {
      if (window.CrmBroadcastFilters && typeof CrmBroadcastFilters.wireRecipientsStep === 'function') {
        CrmBroadcastFilters.wireRecipientsStep(root, _wizard, _events, function () {
          rerenderWizard(root);
        });
      }
      var countEl = root.querySelector('#wiz-count');
      if (countEl) {
        countEl.addEventListener('click', function () {
          if (window.CrmBroadcastFilters && typeof CrmBroadcastFilters.showRecipientsPreview === 'function') {
            CrmBroadcastFilters.showRecipientsPreview(_wizard._matchedLeads || []);
          }
        });
      }
      refreshRecipientCount(root);
    }
    root.querySelectorAll('input[name="wiz-tpl"]').forEach(function (i) {
      i.addEventListener('change', function () {
        var tpls = window._crmMessagingTemplates ? window._crmMessagingTemplates() : [];
        var t = tpls.find(function (x) { return x.id === i.value; });
        if (t) {
          var bodyEl = root.querySelector('#wiz-body');
          if (bodyEl && !bodyEl.value) bodyEl.value = t.body || '';
          _wizard.channel = t.channel;
        }
      });
    });
    if (WIZARD_STEPS[_wizard.step].key === 'template') wireVariablePanel(root, 'wiz-var');
  }

  function captureStep(root) {
    // Step 1 (recipients) — state is maintained live by CrmBroadcastFilters.wireRecipientsStep.
    var chRadio = root.querySelector('input[name="wiz-channel"]:checked'); if (chRadio) _wizard.channel = chRadio.value;
    var tplRadio = root.querySelector('input[name="wiz-tpl"]:checked');   if (tplRadio) _wizard.templateId = tplRadio.value;
    var bodyEl = root.querySelector('#wiz-body'); if (bodyEl) _wizard.body = bodyEl.value || '';
    var schRadio = root.querySelector('input[name="wiz-sched"]:checked'); if (schRadio) _wizard.schedule = schRadio.value;
    var nameEl = root.querySelector('#wiz-name'); if (nameEl) _wizard.name = nameEl.value || '';
  }

  function rerenderWizard(root) { root.innerHTML = wizardHtml(); wireWizard(root); }

  async function refreshRecipientCount(root) {
    try {
      var rows = await CrmBroadcastFilters.buildLeadRows(_wizard);
      _wizard._matchedLeads = rows;
      _wizard.recipients = rows.length;
      var el = root.querySelector('#wiz-count');
      if (el) el.textContent = 'נמצאו ' + rows.length + ' נמענים';
    } catch (e) {
      var el2 = root.querySelector('#wiz-count');
      if (el2) el2.textContent = 'שגיאה: ' + (e.message || e);
    }
  }


  async function doWizardSend() {
    if (!_wizard.name) { toast('error', 'שם שליחה חובה'); _wizard.step = 3; return; }
    if (!_wizard.body && !_wizard.templateId) { toast('error', 'תוכן הודעה חובה'); _wizard.step = 2; return; }
    if (_wizard.channel !== 'sms' && _wizard.channel !== 'email') { toast('error', 'ערוץ ' + (CHANNEL_LABELS[_wizard.channel] || _wizard.channel) + ' אינו פעיל'); _wizard.step = 1; return; }
    var leadIds = await CrmBroadcastFilters.buildLeadIds(_wizard);
    if (!leadIds.length) { toast('warning', 'אין נמענים'); return; }
    if (!window.CrmMessaging || !CrmMessaging.sendMessage) { toast('error', 'CrmMessaging לא זמין'); return; }
    var tid = getTenantId(), emp = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
    if (!emp || !emp.id) { toast('error', 'משתמש לא מזוהה'); return; }
    try {
      var leadsRes = await sb.from('crm_leads').select('id, full_name, phone, email').eq('tenant_id', tid).in('id', leadIds);
      if (leadsRes.error) throw new Error(leadsRes.error.message); var leadRows = leadsRes.data || [];
      var ins = await sb.from('crm_broadcasts').insert({
        tenant_id: tid, employee_id: emp.id, name: _wizard.name, channel: _wizard.channel, template_id: _wizard.templateId || null,
        filter_criteria: {
          boards: _wizard.boards.slice(),
          statuses: _wizard.statuses.slice(),
          events: _wizard.events.slice(),
          openEventsOnly: !!_wizard.openEventsOnly,
          language: _wizard.language || null,
          source: _wizard.source || null
        },
        total_recipients: leadIds.length, total_sent: 0, total_failed: 0, status: 'queued' }).select('id').single();
      if (ins.error) throw new Error(ins.error.message);
      logWrite('crm.broadcast.send', 'crm_broadcast', ins.data.id, { name: _wizard.name, recipients: leadIds.length });
      var baseSlug = null, lang = _wizard.language || 'he', tpls = window._crmMessagingTemplates ? window._crmMessagingTemplates() : [];
      var tpl = _wizard.templateId ? tpls.find(function (t) { return t.id === _wizard.templateId; }) : null;
      if (tpl) { lang = tpl.language || lang; var sfx = '_' + tpl.channel + '_' + lang; baseSlug = (tpl.slug && tpl.slug.slice(-sfx.length) === sfx) ? tpl.slug.slice(0, -sfx.length) : (tpl.slug || null); }
      var calls = leadRows.map(function (l) { var v = { name: l.full_name || '', phone: l.phone || '', email: l.email || '' }; return baseSlug ? CrmMessaging.sendMessage({ leadId: l.id, channel: _wizard.channel, templateSlug: baseSlug, variables: v, language: lang }) : CrmMessaging.sendMessage({ leadId: l.id, channel: _wizard.channel, body: _wizard.body, subject: _wizard.name || '', variables: v, language: lang }); });
      var ok = 0, fail = 0;
      (await Promise.allSettled(calls)).forEach(function (r) { if (r.status === 'fulfilled' && r.value && r.value.ok) ok++; else fail++; });
      await sb.from('crm_broadcasts').update({ total_sent: ok, total_failed: fail, status: fail === 0 ? 'completed' : 'partial' }).eq('id', ins.data.id).eq('tenant_id', tid);
      toast(fail === 0 ? 'success' : 'warning', 'נשלחו ' + ok + ' הודעות' + (fail ? ', ' + fail + ' נכשלו' : ''));
      if (typeof Modal.close === 'function') Modal.close();
      if (typeof window.loadMessagingLog === 'function') window.loadMessagingLog();
    } catch (e) { toast('error', 'שגיאה: ' + (e.message || e)); }
  }
})();
