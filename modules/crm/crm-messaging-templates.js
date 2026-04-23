/* =============================================================================
   crm-messaging-templates.js — Templates (B8 Tailwind rewrite — FINAL-04)
   Split layout: sidebar (category tabs + search + cards) + editor (toolbar +
   code editor + variable menu + 3-panel preview). Table: crm_message_templates.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var CHANNEL_COLORS = { sms: 'bg-sky-500', whatsapp: 'bg-emerald-500', email: 'bg-amber-500' };
  var VARIABLES = [
    { key: '%name%',             desc: 'שם הלקוח' },
    { key: '%phone%',            desc: 'טלפון' },
    { key: '%email%',            desc: 'אימייל' },
    { key: '%event_name%',       desc: 'שם האירוע' },
    { key: '%event_date%',       desc: 'תאריך האירוע' },
    { key: '%event_time%',       desc: 'שעות האירוע' },
    { key: '%event_location%',   desc: 'מיקום האירוע' },
    { key: '%coupon_code%',      desc: 'קוד קופון' },
    { key: '%registration_url%', desc: 'קישור הרשמה' },
    { key: '%unsubscribe_url%',  desc: 'קישור הסרה' }
  ];
  window.CRM_TEMPLATE_VARIABLES = VARIABLES;
  var CATEGORIES = [
    { key: 'all',    label: 'הכל' },
    { key: 'auto',   label: 'אוטומטי' },
    { key: 'manual', label: 'ידני' },
    { key: 'drafts', label: 'טיוטות' }
  ];

  // Tailwind class constants
  var CLS_SPLIT      = 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 min-h-[500px]';
  var CLS_SIDEBAR    = 'bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2';
  var CLS_EDITOR     = 'bg-white border border-slate-200 rounded-xl p-4';
  var CLS_CAT_TABS   = 'flex gap-1 bg-white rounded-lg p-1 border border-slate-200';
  var CLS_CAT_BTN    = 'flex-1 px-2 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100 transition';
  var CLS_CAT_ACTIVE = 'flex-1 px-2 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md transition';
  var CLS_INPUT      = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  var CLS_BTN_PRIMARY= 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm';
  var CLS_BTN_SECOND = 'px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-sm transition';
  var CLS_BTN_DANGER = 'px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed';
  var CLS_TPL_CARD   = 'bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition';
  var CLS_TPL_ACTIVE = 'bg-indigo-50 border-2 border-indigo-500 rounded-lg p-3 cursor-pointer shadow-sm transition';
  var CLS_TB_BTN     = 'px-2.5 py-1.5 text-sm bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition';
  var CLS_CH_BADGE   = 'inline-block text-xs text-white px-2 py-0.5 rounded-full font-semibold';
  var CLS_PREVIEW    = 'grid grid-cols-1 md:grid-cols-3 gap-3 mt-4';

  var _templates = [];
  var _loadPromise = null;
  var _category = 'all';
  var _search = '';
  var _activeId = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function logWrite(a, id, m) {
    if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: 'crm_message_template', entity_id: id, severity: 'info', metadata: m || {} }); } catch (_) {} }
  }

  async function loadTemplates(force) {
    if (force) { _loadPromise = null; _templates = []; }
    if (_loadPromise) return _loadPromise;
    var tid = getTenantId();
    _loadPromise = (async function () {
      var q = sb.from('crm_message_templates').select('id, slug, name, channel, language, subject, body, is_active, created_at');
      if (tid) q = q.eq('tenant_id', tid);
      q = q.order('name');
      var res = await q;
      if (res.error) throw new Error('templates: ' + res.error.message);
      _templates = res.data || [];
      return _templates;
    })().catch(function (e) { _loadPromise = null; throw e; });
    return _loadPromise;
  }
  window.loadMessagingTemplates = function () { return loadTemplates(true); };
  window._crmMessagingTemplates = function () { return _templates.slice(); };

  function renderMessagingTemplates(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="' + CLS_SPLIT + '">' +
        '<aside class="' + CLS_SIDEBAR + '" id="tpl-sidebar"></aside>' +
        '<main class="' + CLS_EDITOR + '" id="tpl-editor">' +
          '<div class="text-center text-slate-400 py-10">בחר תבנית מהרשימה או לחץ "+ תבנית חדשה"</div>' +
        '</main>' +
      '</div>';
    loadTemplates().then(function () {
      renderSidebar();
      if (_activeId) openEditor(_activeId);
    }).catch(function (e) {
      var sb2 = host.querySelector('#tpl-sidebar');
      if (sb2) sb2.innerHTML = '<div class="text-rose-500 py-4 text-sm font-semibold">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingTemplates = renderMessagingTemplates;

  function renderSidebar() {
    var sb2 = document.getElementById('tpl-sidebar');
    if (!sb2) return;
    var tabsHtml = '<div class="' + CLS_CAT_TABS + '">' +
      CATEGORIES.map(function (c) {
        return '<button type="button" class="' + (c.key === _category ? CLS_CAT_ACTIVE : CLS_CAT_BTN) + '" data-cat="' + c.key + '">' + escapeHtml(c.label) + '</button>';
      }).join('') +
    '</div>';
    var searchHtml = '<input type="search" class="' + CLS_INPUT + '" id="tpl-search" placeholder="חיפוש תבנית..." value="' + escapeHtml(_search) + '">';
    var newBtn = '<button type="button" class="' + CLS_BTN_PRIMARY + ' w-full" id="tpl-new">+ תבנית חדשה</button>';
    sb2.innerHTML = tabsHtml + searchHtml + newBtn + '<div class="flex flex-col gap-2 overflow-y-auto max-h-[500px]" id="tpl-list"></div>';
    sb2.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { _category = b.getAttribute('data-cat'); renderSidebar(); });
    });
    var srch = sb2.querySelector('#tpl-search');
    if (srch) srch.addEventListener('input', function () { _search = srch.value || ''; renderList(); });
    var nb = sb2.querySelector('#tpl-new');
    if (nb) nb.addEventListener('click', function () { openEditor(null); });
    renderList();
  }

  function filterTemplates() {
    var s = _search.trim().toLowerCase();
    return _templates.filter(function (t) {
      if (_category === 'auto')   return false;
      if (_category === 'manual' && !t.is_active) return false;
      if (_category === 'drafts' && t.is_active) return false;
      if (s && (t.name || '').toLowerCase().indexOf(s) === -1 && (t.slug || '').toLowerCase().indexOf(s) === -1) return false;
      return true;
    });
  }

  function renderList() {
    var list = document.getElementById('tpl-list');
    if (!list) return;
    var rows = filterTemplates();
    if (!rows.length) { list.innerHTML = '<div class="text-center text-slate-400 py-4 text-sm">אין תבניות</div>'; return; }
    list.innerHTML = rows.map(function (t) {
      var ch = CHANNEL_LABELS[t.channel] || t.channel;
      var dotCls = t.is_active ? 'bg-emerald-500' : 'bg-slate-400';
      var cls = _activeId === t.id ? CLS_TPL_ACTIVE : CLS_TPL_CARD;
      return '<div class="' + cls + '" data-open-tpl="' + escapeHtml(t.id) + '">' +
        '<div class="flex items-center gap-2 font-bold text-sm text-slate-900">' +
          '<span class="w-2 h-2 rounded-full ' + dotCls + ' shrink-0"></span>' +
          '<span class="truncate">' + escapeHtml(t.name || '') + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2 text-xs text-slate-500 mt-1">' +
          '<span class="' + CLS_CH_BADGE + ' ' + (CHANNEL_COLORS[t.channel] || 'bg-slate-500') + '">' + escapeHtml(ch) + '</span>' +
          escapeHtml(CrmHelpers.formatDate(t.created_at) || '—') +
        '</div>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-open-tpl]').forEach(function (el) {
      el.addEventListener('click', function () { _activeId = el.getAttribute('data-open-tpl'); renderList(); openEditor(_activeId); });
    });
  }

  function openEditor(id) {
    var main = document.getElementById('tpl-editor');
    if (!main) return;
    var tpl = id ? _templates.find(function (t) { return t.id === id; }) : { name: '', slug: '', channel: 'whatsapp', language: 'he', subject: '', body: '', is_active: true };
    if (!tpl) return;
    _activeId = id;

    main.innerHTML =
      '<div class="flex flex-wrap gap-2 mb-3">' +
        '<input type="text" id="tpl-name" value="' + escapeHtml(tpl.name) + '" placeholder="שם תבנית" class="' + CLS_INPUT + ' flex-1 min-w-[180px]">' +
        '<select id="tpl-channel" class="' + CLS_INPUT + ' w-32">' +
          ['whatsapp','sms','email'].map(function (c) { return '<option value="' + c + '"' + (c === tpl.channel ? ' selected' : '') + '>' + CHANNEL_LABELS[c] + '</option>'; }).join('') +
        '</select>' +
        '<select id="tpl-lang" class="' + CLS_INPUT + ' w-28">' +
          [['he','עברית'],['ru','רוסית'],['en','אנגלית']].map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === tpl.language ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<input type="text" id="tpl-subject" value="' + escapeHtml(tpl.subject || '') + '" placeholder="נושא (רק לאימייל)" class="' + CLS_INPUT + ' mb-3">' +
      '<div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-2 mb-0">' +
        '<button type="button" class="' + CLS_TB_BTN + '" data-fmt="bold"><strong>B</strong></button>' +
        '<button type="button" class="' + CLS_TB_BTN + '" data-fmt="italic"><em>I</em></button>' +
        '<button type="button" class="' + CLS_TB_BTN + '" data-fmt="underline"><u>U</u></button>' +
        '<button type="button" class="' + CLS_TB_BTN + '" data-fmt="emoji">😀</button>' +
        '<span class="relative ms-2">' +
          '<button type="button" class="' + CLS_TB_BTN + '" id="tpl-var-btn">משתנים ▾</button>' +
          '<div class="absolute z-10 end-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1 min-w-[220px] hidden" id="tpl-var-list">' +
            VARIABLES.map(function (v) { return '<div class="flex items-center justify-between px-2 py-1.5 hover:bg-indigo-50 rounded cursor-pointer gap-3" data-insert-var="' + escapeHtml(v.key) + '"><code class="text-xs text-indigo-600">' + escapeHtml(v.key) + '</code><span class="text-xs text-slate-500">' + escapeHtml(v.desc) + '</span></div>'; }).join('') +
          '</div>' +
        '</span>' +
      '</div>' +
      '<div class="flex bg-slate-900 border border-slate-900 rounded-b-lg overflow-hidden">' +
        '<div class="bg-slate-800 text-slate-500 text-xs text-end p-2 select-none font-mono whitespace-pre" id="tpl-linenums"></div>' +
        '<textarea class="flex-1 bg-slate-900 text-slate-100 p-2 border-0 focus:ring-0 resize-y font-mono text-sm" id="tpl-body" rows="8" style="direction:ltr;text-align:start">' + escapeHtml(tpl.body || '') + '</textarea>' +
      '</div>' +
      '<div class="' + CLS_PREVIEW + '" id="tpl-preview"></div>' +
      '<div class="flex gap-2 mt-4 pt-4 border-t border-slate-200 justify-end">' +
        '<button type="button" class="' + CLS_BTN_PRIMARY + '" id="tpl-save">שמור והפעל</button>' +
        '<button type="button" class="' + CLS_BTN_SECOND + '" id="tpl-draft">שמור טיוטה</button>' +
        '<button type="button" class="' + CLS_BTN_DANGER + '" id="tpl-delete"' + (id ? '' : ' disabled') + '>מחק</button>' +
      '</div>';

    wireEditor(tpl);
    updatePreview();
    updateLineNumbers();
  }

  function wireEditor(tpl) {
    var body = document.getElementById('tpl-body');
    var varBtn = document.getElementById('tpl-var-btn');
    var varList = document.getElementById('tpl-var-list');
    if (varBtn && varList) varBtn.addEventListener('click', function () { varList.classList.toggle('hidden'); });
    document.querySelectorAll('[data-insert-var]').forEach(function (it) {
      it.addEventListener('click', function () { insertVariable(it.getAttribute('data-insert-var')); if (varList) varList.classList.add('hidden'); });
    });
    if (body) body.addEventListener('input', function () { updatePreview(); updateLineNumbers(); });
    var save = document.getElementById('tpl-save'), draft = document.getElementById('tpl-draft'), del = document.getElementById('tpl-delete');
    if (save)  save.addEventListener('click', function () { saveTemplate(tpl, true); });
    if (draft) draft.addEventListener('click', function () { saveTemplate(tpl, false); });
    if (del && tpl.id) del.addEventListener('click', function () { deleteTemplate(tpl); });
  }

  function insertVariable(v) {
    var body = document.getElementById('tpl-body');
    if (!body) return;
    var savedScroll = window.scrollY;
    var s = body.selectionStart || 0, e = body.selectionEnd || 0;
    body.value = body.value.slice(0, s) + v + body.value.slice(e);
    body.focus({ preventScroll: true });
    body.setSelectionRange(s + v.length, s + v.length);
    window.scrollTo(0, savedScroll);
    updatePreview(); updateLineNumbers();
  }

  function updateLineNumbers() {
    var body = document.getElementById('tpl-body');
    var ln = document.getElementById('tpl-linenums');
    if (!body || !ln) return;
    var lines = (body.value || '').split('\n').length;
    var out = '';
    for (var i = 1; i <= lines; i++) out += i + '\n';
    ln.textContent = out;
  }

  function updatePreview() {
    var host = document.getElementById('tpl-preview');
    if (!host) return;
    var body = (document.getElementById('tpl-body') || {}).value || '';
    var subj = (document.getElementById('tpl-subject') || {}).value || '';
    var rendered = substitute(body);
    host.innerHTML = previewPanel('WhatsApp', 'emerald', rendered, '') +
                     previewPanel('SMS',      'sky',     rendered, '') +
                     previewPanel('אימייל',   'amber',   rendered, substitute(subj));
  }

  function previewPanel(title, color, body, subject) {
    var headerBg = { emerald: 'bg-emerald-500', sky: 'bg-sky-500', amber: 'bg-amber-500' }[color] || 'bg-slate-500';
    return '<div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">' +
      '<div class="' + headerBg + ' text-white text-xs font-bold px-3 py-2">' + escapeHtml(title) + '</div>' +
      '<div class="p-3 bg-slate-50 min-h-[120px]">' +
        (subject ? '<div class="font-bold text-sm text-slate-800 mb-2">' + escapeHtml(subject) + '</div>' : '') +
        '<div class="bg-white rounded-lg p-2.5 text-sm text-slate-700 border border-slate-100 whitespace-pre-wrap">' + escapeHtml(body) + '</div>' +
      '</div>' +
    '</div>';
  }

  function substitute(text) {
    return String(text || '')
      .replace(/%name%/g, 'דנה כהן')
      .replace(/%event_name%/g, 'סופר-סייל אוקטובר')
      .replace(/%event_date%/g, '01.11.2026')
      .replace(/%event_time%/g, '09:00 - 14:00')
      .replace(/%event_location%/g, 'הרצל 32, אשקלון')
      .replace(/%coupon_code%/g, 'SuperSale24')
      .replace(/%phone%/g, '050-717-5675')
      .replace(/%email%/g, 'dana@example.com')
      .replace(/%registration_url%/g, 'prizma-optic.co.il/r/...')
      .replace(/%unsubscribe_url%/g, 'prizma-optic.co.il/u/...');
  }

  async function saveTemplate(existing, activate) {
    var name = (document.getElementById('tpl-name') || {}).value || '';
    var channel = (document.getElementById('tpl-channel') || {}).value;
    var language = (document.getElementById('tpl-lang') || {}).value;
    var subject = (document.getElementById('tpl-subject') || {}).value || null;
    var body = (document.getElementById('tpl-body') || {}).value || '';
    if (!name.trim()) { toast('error', 'שם תבנית חובה'); return; }
    if (!body.trim()) { toast('error', 'תוכן חובה'); return; }

    var tid = getTenantId();
    var slug = (existing && existing.slug) || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
    try {
      if (existing && existing.id) {
        var upd = await sb.from('crm_message_templates').update({ name: name, channel: channel, language: language, subject: subject, body: body, is_active: !!activate }).eq('id', existing.id).eq('tenant_id', tid);
        if (upd.error) throw new Error(upd.error.message);
        logWrite('crm.template.update', existing.id, { name: name });
      } else {
        var ins = await sb.from('crm_message_templates').insert({ tenant_id: tid, slug: slug, name: name, channel: channel, language: language, subject: subject, body: body, is_active: !!activate }).select('id').single();
        if (ins.error) throw new Error(ins.error.message);
        _activeId = ins.data.id;
        logWrite('crm.template.create', ins.data.id, { name: name });
      }
      toast('success', 'נשמר');
      await loadTemplates(true); renderList();
    } catch (e) { toast('error', 'שמירה נכשלה: ' + (e.message || e)); }
  }

  async function deleteTemplate(tpl) {
    if (!confirm('למחוק את "' + tpl.name + '"?')) return;
    var upd = await sb.from('crm_message_templates').update({ is_active: false }).eq('id', tpl.id).eq('tenant_id', getTenantId());
    if (upd.error) { toast('error', upd.error.message); return; }
    logWrite('crm.template.deactivate', tpl.id, { name: tpl.name });
    _activeId = null;
    await loadTemplates(true);
    renderSidebar();
    var main = document.getElementById('tpl-editor');
    if (main) main.innerHTML = '<div class="text-center text-slate-400 py-10">התבנית בוטלה</div>';
  }
})();
