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
        CrmHelpers.toast('success', 'הועתק: ' + v);
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
      CrmHelpers.toast('success', 'הועתק: ' + v);
    } catch (_) {
      CrmHelpers.toast('error', 'העתקה נכשלה');
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
    var q = sb.from('crm_events').select('id, event_number, name, event_date, status').eq('is_deleted', false);
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
      board: 'incoming',
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
      eventId: null,
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
      var hasTpl = !!_wizard.templateId;
      var clearBtn = hasTpl
        ? '<button type="button" id="wiz-tpl-clear" class="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-md">✕ נקה בחירת תבנית</button>'
        : '';
      // 2026-05-13 BROADCAST_EVENT_LINK_SUPPORT — dropdown linking broadcast to
      // an event so send-message EF builds %registration_url% per recipient.
      // Without an eventId, injectAutoUrls skips the registration-token branch
      // and any body referencing %registration_url% dies on the EF safety scan.
      var LINKABLE_STATUSES = ['scheduled', 'registration_open', 'event_day'];
      var linkable = _events.filter(function (e) { return LINKABLE_STATUSES.indexOf(e.status) !== -1; });
      var evtOpts = '<option value="">— ללא קישור לאירוע —</option>' + linkable.map(function (e) {
        var sel = (e.id === _wizard.eventId) ? ' selected' : '';
        return '<option value="' + escapeHtml(e.id) + '"' + sel + '>#' + e.event_number + ' — ' + escapeHtml(e.name) + ' (' + e.event_date + ')</option>';
      }).join('');
      var eventDropdownHtml = '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">קישור לאירוע (אופציונלי — נדרש עבור <code>%registration_url%</code>)</label>' +
        '<select id="wiz-event-link" class="' + CLS_INPUT + '">' + evtOpts + '</select></div>';
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 3 — תבנית</h4>' +
        '<div class="flex items-center justify-between mb-2"><span class="text-xs text-slate-500">בחר תבנית כדי להעתיק את התוכן שלה, או השאר ריק וכתוב הודעה חופשית.</span>' + clearBtn + '</div>' +
        '<div class="space-y-2 mb-3 max-h-48 overflow-y-auto">' + (opts || '<div class="text-center text-slate-400 py-4">אין תבניות פעילות</div>') + '</div>' +
        eventDropdownHtml +
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
          // Re-render so the "נקה בחירת תבנית" button appears now that a tpl is picked.
          captureStep(root); rerenderWizard(root);
        }
      });
    });
    // 2026-05-12 — "clear template selection" button. Lets the user copy a
    // template's body into the manual-text area and then strip the template
    // link so the broadcast sends as raw body (otherwise the saved templateId
    // overrides the edited body at send time).
    var clearBtn = root.querySelector('#wiz-tpl-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        captureStep(root);
        _wizard.templateId = null;
        rerenderWizard(root);
      });
    }
    if (WIZARD_STEPS[_wizard.step].key === 'template') wireVariablePanel(root, 'wiz-var');
  }

  function captureStep(root) {
    // Step 1 (recipients) — state is maintained live by CrmBroadcastFilters.wireRecipientsStep.
    var chRadio = root.querySelector('input[name="wiz-channel"]:checked'); if (chRadio) _wizard.channel = chRadio.value;
    // Template: capture the checked value if any, OR clear when the step is
    // visible but no template is checked (the user clicked "clear template
    // selection"). Without this, the wizard kept the previous selection alive
    // after the user explicitly unselected — and would send the template body
    // instead of their edited free-text.
    var tplStep = root.querySelector('input[name="wiz-tpl"]');
    if (tplStep) {
      var tplRadio = root.querySelector('input[name="wiz-tpl"]:checked');
      _wizard.templateId = tplRadio ? tplRadio.value : null;
    }
    var bodyEl = root.querySelector('#wiz-body'); if (bodyEl) _wizard.body = bodyEl.value || '';
    var evtEl = root.querySelector('#wiz-event-link'); if (evtEl) _wizard.eventId = evtEl.value || null;
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
    if (!_wizard.name) { CrmHelpers.toast('error', 'שם שליחה חובה'); _wizard.step = 3; return; }
    if (!_wizard.body && !_wizard.templateId) { CrmHelpers.toast('error', 'תוכן הודעה חובה'); _wizard.step = 2; return; }
    if (_wizard.channel !== 'sms' && _wizard.channel !== 'email') { CrmHelpers.toast('error', 'ערוץ ' + (CHANNEL_LABELS[_wizard.channel] || _wizard.channel) + ' אינו פעיל'); _wizard.step = 1; return; }
    if (!window.CrmBroadcastQueue || !CrmBroadcastQueue.enqueueBroadcast) { CrmHelpers.toast('error', 'CrmBroadcastQueue לא זמין'); return; }
    var leadIds = await CrmBroadcastFilters.buildLeadIds(_wizard);
    if (!leadIds.length) { CrmHelpers.toast('warning', 'אין נמענים'); return; }
    var emp = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
    if (!emp || !emp.id) { CrmHelpers.toast('error', 'משתמש לא מזוהה'); return; }
    try {
      // 2026-05-12 BROADCAST_QUEUE_INTEGRATION — route through crm_message_queue
      // instead of N parallel browser→send-message calls. Heavy lifting lives
      // in CrmBroadcastQueue (sibling file). dispatch-queue EF drains the queue
      // at the throttled rate (500ms email / 1000ms SMS).
      var r = await CrmBroadcastQueue.enqueueBroadcast(_wizard, leadIds, emp.id, sb);
      CrmHelpers.toast('success', r.inserted + ' הודעות הוכנסו לתור (משלוח צפוי תוך ~' + r.etaMin + ' דקות)');
      if (typeof Modal.close === 'function') Modal.close();
      if (typeof window.loadMessagingLog === 'function') window.loadMessagingLog();
    } catch (e) { CrmHelpers.toast('error', 'שגיאה: ' + (e.message || e)); }
  }
})();
