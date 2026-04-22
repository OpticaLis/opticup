/* =============================================================================
   crm-messaging-broadcast.js — Broadcast wizard + Log (B8 Tailwind — FINAL-04)
   Tables: crm_broadcasts, crm_message_log, crm_leads, crm_events
   ============================================================================= */
(function () {
  'use strict';

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
  var PAGE_SIZE = 50;
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
  var CLS_TABLE  = 'w-full text-sm bg-white';
  var CLS_TH     = 'px-4 py-2.5 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD     = 'px-4 py-2.5 text-slate-800 border-b border-slate-100';

  var _events = [];
  var _logRows = [];
  var _logPage = 1;
  var _wizard = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function logWrite(a, et, eid, meta) {
    if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: et, entity_id: eid, severity: 'info', metadata: meta || {} }); } catch (_) {} }
  }

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
    renderMessagingLog(host.querySelector('#bc-history'));
  }

  function openWizard() {
    _wizard = { step: 0, status: '', event: '', language: '', channel: 'whatsapp', templateId: '', body: '', name: '', schedule: 'now', recipients: 0 };
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
      var statuses = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
      var stOpts = '<option value="">(כל הסטטוסים)</option>' + Object.keys(statuses).map(function (slug) { return '<option value="' + escapeHtml(slug) + '"' + (slug === _wizard.status ? ' selected' : '') + '>' + escapeHtml(statuses[slug].name_he || slug) + '</option>'; }).join('');
      var evOpts = '<option value="">(כל האירועים)</option>' + _events.map(function (e) { return '<option value="' + escapeHtml(e.id) + '"' + (e.id === _wizard.event ? ' selected' : '') + '>#' + e.event_number + ' ' + escapeHtml(e.name || '') + '</option>'; }).join('');
      return '<h4 class="text-base font-bold text-slate-800 mb-3">שלב 1 — נמענים</h4>' +
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">סטטוס</label><select id="wiz-status" class="' + CLS_INPUT + '">' + stOpts + '</select></div>' +
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">אירוע</label><select id="wiz-event" class="' + CLS_INPUT + '">' + evOpts + '</select></div>' +
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">שפה</label><select id="wiz-lang" class="' + CLS_INPUT + '"><option value="">הכל</option><option value="he">עברית</option><option value="ru">רוסית</option><option value="en">אנגלית</option></select></div>' +
        '<div id="wiz-count" class="px-4 py-3 bg-indigo-50 text-indigo-800 rounded-lg font-bold text-sm">מחשב...</div>';
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
        '<div class="' + CLS_ROW + '"><label class="' + CLS_LABEL + '">תוכן</label><textarea id="wiz-body" rows="4" placeholder="תוכן הודעה ידני (או בחר תבנית)" class="' + CLS_INPUT + '">' + escapeHtml(_wizard.body) + '</textarea></div>';
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
    if (_wizard.step === 0) refreshRecipientCount(root);
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
  }

  function captureStep(root) {
    var statusSel = root.querySelector('#wiz-status'); if (statusSel) _wizard.status = statusSel.value || '';
    var evSel = root.querySelector('#wiz-event');     if (evSel)     _wizard.event    = evSel.value || '';
    var langSel = root.querySelector('#wiz-lang');    if (langSel)   _wizard.language = langSel.value || '';
    var chRadio = root.querySelector('input[name="wiz-channel"]:checked'); if (chRadio) _wizard.channel = chRadio.value;
    var tplRadio = root.querySelector('input[name="wiz-tpl"]:checked');   if (tplRadio) _wizard.templateId = tplRadio.value;
    var bodyEl = root.querySelector('#wiz-body'); if (bodyEl) _wizard.body = bodyEl.value || '';
    var schRadio = root.querySelector('input[name="wiz-sched"]:checked'); if (schRadio) _wizard.schedule = schRadio.value;
    var nameEl = root.querySelector('#wiz-name'); if (nameEl) _wizard.name = nameEl.value || '';
  }

  function rerenderWizard(root) { root.innerHTML = wizardHtml(); wireWizard(root); }

  async function refreshRecipientCount(root) {
    try {
      var ids = await buildLeadIds();
      _wizard.recipients = ids.length;
      var el = root.querySelector('#wiz-count');
      if (el) el.textContent = 'נמצאו ' + ids.length + ' נמענים';
    } catch (e) {
      var el2 = root.querySelector('#wiz-count');
      if (el2) el2.textContent = 'שגיאה: ' + (e.message || e);
    }
  }

  async function buildLeadIds() {
    var tid = getTenantId();
    var q = sb.from('crm_leads').select('id').eq('is_deleted', false).is('unsubscribed_at', null);
    if (tid) q = q.eq('tenant_id', tid);
    if (_wizard.status) q = q.eq('status', _wizard.status);
    if (_wizard.language) q = q.eq('language', _wizard.language);
    if (_wizard.event) {
      var att = sb.from('crm_event_attendees').select('lead_id').eq('event_id', _wizard.event).eq('is_deleted', false);
      if (tid) att = att.eq('tenant_id', tid);
      var r = await att;
      if (r.error) throw new Error(r.error.message);
      var ids = (r.data || []).map(function (x) { return x.lead_id; }).filter(Boolean);
      if (!ids.length) return [];
      q = q.in('id', ids);
    }
    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return (res.data || []).map(function (r) { return r.id; });
  }

  async function doWizardSend() {
    if (!_wizard.name) { toast('error', 'שם שליחה חובה'); _wizard.step = 3; return; }
    if (!_wizard.body && !_wizard.templateId) { toast('error', 'תוכן הודעה חובה'); _wizard.step = 2; return; }
    if (_wizard.channel !== 'sms' && _wizard.channel !== 'email') { toast('error', 'ערוץ ' + (CHANNEL_LABELS[_wizard.channel] || _wizard.channel) + ' אינו פעיל'); _wizard.step = 1; return; }
    var leadIds = await buildLeadIds();
    if (!leadIds.length) { toast('warning', 'אין נמענים'); return; }
    if (!window.CrmMessaging || !CrmMessaging.sendMessage) { toast('error', 'CrmMessaging לא זמין'); return; }
    var tid = getTenantId(), emp = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
    if (!emp || !emp.id) { toast('error', 'משתמש לא מזוהה'); return; }
    try {
      var leadsRes = await sb.from('crm_leads').select('id, full_name, phone, email').eq('tenant_id', tid).in('id', leadIds);
      if (leadsRes.error) throw new Error(leadsRes.error.message); var leadRows = leadsRes.data || [];
      var ins = await sb.from('crm_broadcasts').insert({
        tenant_id: tid, employee_id: emp.id, name: _wizard.name, channel: _wizard.channel, template_id: _wizard.templateId || null,
        filter_criteria: { status: _wizard.status || null, event: _wizard.event || null, language: _wizard.language || null },
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
      if (typeof Modal.close === 'function') Modal.close(); loadLog().then(renderLogTable);
    } catch (e) { toast('error', 'שגיאה: ' + (e.message || e)); }
  }

  /* ----------------------------------- LOG ----------------------------------- */

  async function renderMessagingLog(host) {
    if (!host) return;
    host.innerHTML =
      '<div>' +
        '<h4 class="text-base font-bold text-slate-800 mb-3">היסטוריה</h4>' +
        '<div class="flex flex-wrap gap-2 mb-3">' +
          '<select id="log-channel" class="' + CLS_INPUT + ' max-w-[180px]"><option value="">כל הערוצים</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">אימייל</option></select>' +
          '<select id="log-status" class="' + CLS_INPUT + ' max-w-[180px]"><option value="">כל הסטטוסים</option><option value="sent">נשלח</option><option value="delivered">הגיע</option><option value="read">נקרא</option><option value="failed">נכשל</option></select>' +
        '</div>' +
        '<div id="log-table" class="bg-white rounded-lg border border-slate-200 overflow-hidden"></div>' +
        '<div id="log-pagination" class="flex items-center gap-2 mt-3"></div>' +
      '</div>';
    ['log-channel','log-status'].forEach(function (id) {
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', function () { _logPage = 1; loadLog().then(renderLogTable); });
    });
    await loadLog();
    renderLogTable();
  }
  window.renderMessagingLog = renderMessagingLog;
  window.loadMessagingLog = function () { return loadLog().then(renderLogTable); };

  async function loadLog() {
    var tid = getTenantId();
    var ch = (document.getElementById('log-channel') || {}).value || '';
    var st = (document.getElementById('log-status')  || {}).value || '';
    var q = sb.from('crm_message_log').select('id, lead_id, channel, content, status, created_at');
    if (tid) q = q.eq('tenant_id', tid);
    if (ch) q = q.eq('channel', ch);
    if (st) q = q.eq('status', st);
    q = q.order('created_at', { ascending: false }).limit(300);
    var res = await q;
    _logRows = res.error ? [] : (res.data || []);
  }

  function renderLogTable() {
    var wrap = document.getElementById('log-table');
    if (!wrap) return;
    if (!_logRows.length) { wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין הודעות</div>'; return; }
    var start = (_logPage - 1) * PAGE_SIZE;
    var rows = _logRows.slice(start, start + PAGE_SIZE);
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">תאריך</th>' +
      '<th class="' + CLS_TH + '">ערוץ</th>' +
      '<th class="' + CLS_TH + '">סטטוס</th>' +
      '<th class="' + CLS_TH + '">תוכן</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var chipCls = STATUS_CLASSES[r.status] || 'bg-slate-100 text-slate-700';
      html += '<tr>' +
        '<td class="' + CLS_TD + ' text-xs text-slate-600">' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</td>' +
        '<td class="' + CLS_TD + '">' + escapeHtml(CHANNEL_LABELS[r.channel] || r.channel) + '</td>' +
        '<td class="' + CLS_TD + '"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + chipCls + '">' + escapeHtml(STATUS_LABELS[r.status] || r.status) + '</span></td>' +
        '<td class="' + CLS_TD + ' text-slate-700 truncate max-w-xs">' + escapeHtml((r.content || '').slice(0, 80)) + '</td>' +
      '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
    renderLogPagination();
  }

  function renderLogPagination() {
    var box = document.getElementById('log-pagination');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(_logRows.length / PAGE_SIZE));
    if (pages <= 1) { box.innerHTML = '<span class="text-sm text-slate-500">סה״כ ' + _logRows.length + '</span>'; return; }
    var btn = 'px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-40';
    var act = 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold';
    var html = '<button class="' + btn + '" ' + (_logPage === 1 ? 'disabled' : '') + ' data-lp="prev">›</button>';
    for (var i = 1; i <= pages; i++) html += '<button class="' + (i === _logPage ? act : btn) + '" data-lp="' + i + '">' + i + '</button>';
    html += '<button class="' + btn + '" ' + (_logPage === pages ? 'disabled' : '') + ' data-lp="next">‹</button>';
    box.innerHTML = html;
    box.querySelectorAll('[data-lp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-lp');
        if (v === 'prev') _logPage = Math.max(1, _logPage - 1);
        else if (v === 'next') _logPage = Math.min(pages, _logPage + 1);
        else _logPage = parseInt(v, 10) || 1;
        renderLogTable();
      });
    });
  }
})();
