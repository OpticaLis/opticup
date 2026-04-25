/* =============================================================================
   crm-messaging-templates.js — Templates Center editor (CRM_UX_REDESIGN_TEMPLATES)
   Logical-template grouping by base slug; 3 accordion sections via
   window.CrmTemplateSection. Save diffs each channel → INSERT / UPDATE / SOFT-
   DELETE. Backward-compat: 4 public globals preserved.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
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
  var CATEGORIES = [['all','הכל'], ['auto','אוטומטי'], ['manual','ידני'], ['drafts','טיוטות']];

  var CLS_SPLIT      = 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 min-h-[500px]';
  var CLS_SIDEBAR    = 'bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2';
  var CLS_EDITOR     = 'space-y-3';
  var CLS_CAT_TABS   = 'flex gap-1 bg-white rounded-lg p-1 border border-slate-200';
  var CLS_CAT_BTN    = 'flex-1 px-2 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100 transition';
  var CLS_CAT_ACTIVE = 'flex-1 px-2 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md transition';
  var CLS_INPUT      = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  var CLS_BTN_PRIMARY= 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm';
  var CLS_BTN_SECOND = 'px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-sm transition';
  var CLS_BTN_DANGER = 'px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg text-sm transition';
  var CLS_TPL_CARD   = 'bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition';
  var CLS_TPL_ACTIVE = 'bg-indigo-50 border-2 border-indigo-500 rounded-lg p-3 cursor-pointer shadow-sm transition';

  var CHANNELS = ['sms','whatsapp','email'];
  var _templates = [], _logical = [], _loadPromise = null;
  var _category = 'all', _search = '', _activeBase = null, _editorState = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function logWrite(a, id, m) {
    if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: 'crm_message_template', entity_id: id, severity: 'info', metadata: m || {} }); } catch (_) {} }
  }
  function stripChannelSuffix(name) { return String(name || '').replace(/\s*[—-]\s*(SMS|Email|אימייל|WhatsApp)\s*$/i, '').trim(); }
  function deriveBaseSlug(row) {
    if (!row || !row.slug) return null;
    var sfx = '_' + (row.channel || '') + '_' + (row.language || 'he');
    return (row.slug.slice(-sfx.length) === sfx) ? row.slug.slice(0, -sfx.length) : row.slug;
  }
  function emptyCh() { return { exists: false, id: null, body: '', subject: null, original: null }; }
  function logicalIsActive(g) { return CHANNELS.some(function (c) { return g.channels[c].exists; }); }

  function groupByBaseSlug(rows) {
    var groups = {};
    rows.forEach(function (r) {
      var base = deriveBaseSlug(r);
      if (!base) return;
      if (!groups[base]) {
        groups[base] = { baseSlug: base, name: stripChannelSuffix(r.name) || base, language: r.language || 'he',
          channels: { sms: emptyCh(), whatsapp: emptyCh(), email: emptyCh() } };
      }
      var g = groups[base];
      if (CHANNELS.indexOf(r.channel) !== -1) {
        g.channels[r.channel] = { exists: !!r.is_active, id: r.id, body: r.body || '', subject: r.subject || null, original: r };
        if (r.is_active) g.name = stripChannelSuffix(r.name) || g.name;
      }
    });
    return Object.keys(groups).sort().map(function (k) { return groups[k]; });
  }

  async function loadTemplates(force) {
    if (force) { _loadPromise = null; _templates = []; _logical = []; }
    if (_loadPromise) return _loadPromise;
    var tid = getTenantId();
    _loadPromise = (async function () {
      var q = sb.from('crm_message_templates').select('id, slug, name, channel, language, subject, body, is_active, created_at');
      if (tid) q = q.eq('tenant_id', tid);
      q = q.order('name');
      var res = await q;
      if (res.error) throw new Error('templates: ' + res.error.message);
      _templates = res.data || [];
      _logical = groupByBaseSlug(_templates);
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
          '<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">בחר תבנית מהרשימה או לחץ "+ תבנית חדשה"</div>' +
        '</main>' +
      '</div>';
    loadTemplates().then(function () {
      renderSidebar();
      if (_activeBase) openEditor(_activeBase);
    }).catch(function (e) {
      var sb2 = host.querySelector('#tpl-sidebar');
      if (sb2) sb2.innerHTML = '<div class="text-rose-500 py-4 text-sm font-semibold">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingTemplates = renderMessagingTemplates;

  function renderSidebar() {
    var sb2 = document.getElementById('tpl-sidebar');
    if (!sb2) return;
    var tabsHtml = '<div class="' + CLS_CAT_TABS + '">' + CATEGORIES.map(function (c) {
      return '<button type="button" class="' + (c[0] === _category ? CLS_CAT_ACTIVE : CLS_CAT_BTN) + '" data-cat="' + c[0] + '">' + escapeHtml(c[1]) + '</button>';
    }).join('') + '</div>';
    sb2.innerHTML = tabsHtml +
      '<input type="search" class="' + CLS_INPUT + '" id="tpl-search" placeholder="חיפוש תבנית..." value="' + escapeHtml(_search) + '">' +
      '<button type="button" class="' + CLS_BTN_PRIMARY + ' w-full" id="tpl-new">+ תבנית חדשה</button>' +
      '<div class="flex flex-col gap-2 overflow-y-auto max-h-[500px]" id="tpl-list"></div>';
    sb2.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { _category = b.getAttribute('data-cat'); renderSidebar(); });
    });
    var srch = sb2.querySelector('#tpl-search');
    if (srch) srch.addEventListener('input', function () { _search = srch.value || ''; renderList(); });
    var nb = sb2.querySelector('#tpl-new');
    if (nb) nb.addEventListener('click', function () { openEditor(null); });
    renderList();
  }

  function filterLogical() {
    var s = _search.trim().toLowerCase();
    return _logical.filter(function (g) {
      var active = logicalIsActive(g);
      if (_category === 'auto') return false;
      if (_category === 'manual' && !active) return false;
      if (_category === 'drafts' && active) return false;
      if (s && (g.name || '').toLowerCase().indexOf(s) === -1 && (g.baseSlug || '').toLowerCase().indexOf(s) === -1) return false;
      return true;
    });
  }

  function channelBadge(ch, active) {
    var color = active ? ({ sms: 'bg-sky-500', whatsapp: 'bg-emerald-500', email: 'bg-amber-500' })[ch] : 'bg-slate-300';
    var label = ({ sms: 'SMS', whatsapp: 'WA', email: 'EMAIL' })[ch];
    var txt = active ? 'text-white' : 'text-slate-500';
    return '<span class="' + color + ' ' + txt + ' px-1.5 py-0.5 rounded text-[10px] font-bold">' + label + '</span>';
  }

  function renderList() {
    var list = document.getElementById('tpl-list');
    if (!list) return;
    var rows = filterLogical();
    if (!rows.length) { list.innerHTML = '<div class="text-center text-slate-400 py-4 text-sm">אין תבניות</div>'; return; }
    list.innerHTML = rows.map(function (g) {
      var anyActive = logicalIsActive(g);
      var dotCls = anyActive ? 'bg-emerald-500' : 'bg-slate-400';
      var cls = _activeBase === g.baseSlug ? CLS_TPL_ACTIVE : CLS_TPL_CARD;
      var badges = CHANNELS.map(function (c) { return channelBadge(c, g.channels[c].exists); }).join(' ');
      return '<div class="' + cls + '" data-open-base="' + escapeHtml(g.baseSlug) + '">' +
        '<div class="flex items-center gap-2 font-bold text-sm text-slate-900">' +
          '<span class="w-2 h-2 rounded-full ' + dotCls + ' shrink-0"></span>' +
          '<span class="truncate">' + escapeHtml(g.name || g.baseSlug) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-1.5 text-xs mt-1.5">' + badges + '</div>' +
        '<div class="text-[11px] text-slate-500 mt-1 truncate" style="direction:ltr;text-align:end">' + escapeHtml(g.baseSlug) + '</div>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-open-base]').forEach(function (el) {
      el.addEventListener('click', function () { _activeBase = el.getAttribute('data-open-base'); renderList(); openEditor(_activeBase); });
    });
  }

  function findLogicalByBase(base) { return _logical.filter(function (g) { return g.baseSlug === base; })[0] || null; }

  function newLogicalDraft() {
    return { baseSlug: '', name: '', language: 'he',
      channels: { sms: emptyCh(), whatsapp: emptyCh(), email: emptyCh() }, isNew: true };
  }
  function cloneState(g) {
    return { baseSlug: g.baseSlug, name: g.name, language: g.language,
      channels: { sms: Object.assign({}, g.channels.sms), whatsapp: Object.assign({}, g.channels.whatsapp), email: Object.assign({}, g.channels.email) },
      isNew: !!g.isNew };
  }

  function openEditor(baseSlug) {
    var main = document.getElementById('tpl-editor');
    if (!main) return;
    var g = baseSlug ? findLogicalByBase(baseSlug) : null;
    _editorState = g ? cloneState(g) : newLogicalDraft();
    _activeBase = g ? g.baseSlug : null;
    var slugDisplay = _editorState.isNew ? '<span class="px-3 py-2 text-xs text-slate-400 self-center">slug: יווצר אוטומטית</span>' :
      '<span class="px-3 py-2 text-xs text-slate-500 self-center">slug: ' + escapeHtml(_editorState.baseSlug) + '</span>';
    main.innerHTML =
      '<div class="bg-white border border-slate-200 rounded-xl p-4">' +
        '<div class="flex flex-wrap gap-2">' +
          '<input type="text" id="tpl-name" value="' + escapeHtml(_editorState.name) + '" placeholder="שם תבנית" class="' + CLS_INPUT + ' flex-1 min-w-[200px] font-semibold">' +
          '<select id="tpl-lang" class="' + CLS_INPUT + ' w-28">' +
            [['he','עברית'],['ru','רוסית'],['en','אנגלית']].map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === _editorState.language ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') +
          '</select>' + slugDisplay +
        '</div>' +
      '</div>' +
      '<div id="tpl-section-sms"></div><div id="tpl-section-whatsapp"></div><div id="tpl-section-email"></div>' +
      '<div class="bg-white border border-slate-200 rounded-xl p-4 flex gap-2 justify-end">' +
        (_editorState.isNew ? '' : '<button type="button" class="' + CLS_BTN_DANGER + '" id="tpl-delete">מחק תבנית</button>') +
        '<button type="button" class="' + CLS_BTN_SECOND + '" id="tpl-cancel">ביטול</button>' +
        '<button type="button" class="' + CLS_BTN_PRIMARY + '" id="tpl-save">שמור הכל</button>' +
      '</div>';
    CHANNELS.forEach(renderSection);
    wireEditor();
  }

  function renderSection(channel) {
    var host = document.getElementById('tpl-section-' + channel);
    if (!host || !window.CrmTemplateSection) return;
    var st = _editorState.channels[channel];
    if (!!_editorState.isNew && channel === 'sms' && !st.exists) { st.exists = true; }
    host.innerHTML = window.CrmTemplateSection.render(channel, st, { open: st.exists, language: _editorState.language });
    window.CrmTemplateSection.wire(host.firstChild, channel, st, {
      onActiveChange: function (ch, active) { _editorState.channels[ch].exists = active; renderSection(ch); },
      onBodyChange: function (ch, val) { _editorState.channels[ch].body = val; },
      onSubjectChange: function (ch, val) { _editorState.channels[ch].subject = val; }
    });
  }

  function wireEditor() {
    var nameEl = document.getElementById('tpl-name');
    var langEl = document.getElementById('tpl-lang');
    var saveB = document.getElementById('tpl-save');
    var cancelB = document.getElementById('tpl-cancel');
    var delB = document.getElementById('tpl-delete');
    if (nameEl) nameEl.addEventListener('input', function () { _editorState.name = nameEl.value; });
    if (langEl) langEl.addEventListener('change', function () { _editorState.language = langEl.value; });
    if (saveB) saveB.addEventListener('click', saveLogicalTemplate);
    if (cancelB) cancelB.addEventListener('click', function () {
      _activeBase = null; _editorState = null;
      var main = document.getElementById('tpl-editor');
      if (main) main.innerHTML = '<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">בחר תבנית או לחץ "+ תבנית חדשה"</div>';
    });
    if (delB) delB.addEventListener('click', deleteLogicalTemplate);
  }

  function deriveSlugFromName(name) {
    return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }
  function chSuffix(ch) { return ch === 'sms' ? 'SMS' : ch === 'email' ? 'Email' : 'WhatsApp'; }

  async function saveLogicalTemplate() {
    if (!_editorState) return;
    var name = (_editorState.name || '').trim();
    if (!name) { toast('error', 'שם תבנית חובה'); return; }
    if (!CHANNELS.some(function (c) { return _editorState.channels[c].exists; })) { toast('error', 'יש לסמן לפחות ערוץ אחד פעיל'); return; }
    var tid = getTenantId();
    var baseSlug = _editorState.isNew ? deriveSlugFromName(name) : _editorState.baseSlug;
    if (!baseSlug) { toast('error', 'לא ניתן לגזור slug משם זה'); return; }
    var emptyCh2 = CHANNELS.filter(function (c) { return _editorState.channels[c].exists && !((_editorState.channels[c].body || '').trim()); })[0];
    if (emptyCh2) { toast('error', 'תוכן חסר בערוץ ' + CHANNEL_LABELS[emptyCh2]); return; }

    var ops = [], saved = 0, deactivated = 0, created = 0;
    CHANNELS.forEach(function (ch) {
      var cs = _editorState.channels[ch];
      var fullSlug = baseSlug + '_' + ch + '_' + (_editorState.language || 'he');
      var rowName = name + ' — ' + chSuffix(ch);
      if (cs.exists) {
        if (cs.id) {
          ops.push(sb.from('crm_message_templates').update({ name: rowName, language: _editorState.language,
            subject: ch === 'email' ? (cs.subject || null) : null, body: cs.body || '', is_active: true })
            .eq('id', cs.id).eq('tenant_id', tid).then(function () { saved++; }));
        } else {
          ops.push(sb.from('crm_message_templates').insert({ tenant_id: tid, slug: fullSlug, name: rowName, channel: ch,
            language: _editorState.language, subject: ch === 'email' ? (cs.subject || null) : null, body: cs.body || '', is_active: true })
            .select('id').single().then(function (res) { if (res && res.data) _editorState.channels[ch].id = res.data.id; created++; }));
        }
      } else if (cs.id) {
        ops.push(sb.from('crm_message_templates').update({ is_active: false }).eq('id', cs.id).eq('tenant_id', tid).then(function () { deactivated++; }));
      }
    });
    try {
      var results = await Promise.allSettled(ops);
      var failures = results.filter(function (r) { return r.status === 'rejected'; });
      if (failures.length) { toast('error', 'שמירה חלקית: ' + failures.length + ' כשלים'); console.warn('crm-templates save failures:', failures); }
      else { toast('success', 'נשמר (' + (saved + created) + ' נשמרו, ' + deactivated + ' בוטלו)'); }
      logWrite('crm.template.save', baseSlug, { name: name, saved: saved, created: created, deactivated: deactivated });
      _activeBase = baseSlug;
      await loadTemplates(true);
      renderSidebar();
      openEditor(baseSlug);
    } catch (e) { toast('error', 'שמירה נכשלה: ' + (e.message || String(e))); }
  }

  async function deleteLogicalTemplate() {
    if (!_editorState || _editorState.isNew) return;
    if (!confirm('למחוק את "' + _editorState.name + '" על כל הערוצים שלה?')) return;
    var tid = getTenantId();
    var ops = [];
    CHANNELS.forEach(function (ch) {
      var cs = _editorState.channels[ch];
      if (cs.id) ops.push(sb.from('crm_message_templates').update({ is_active: false }).eq('id', cs.id).eq('tenant_id', tid));
    });
    try {
      var results = await Promise.allSettled(ops);
      if (results.some(function (r) { return r.status === 'rejected'; })) { toast('error', 'מחיקה חלקית נכשלה'); return; }
      logWrite('crm.template.deactivate', _editorState.baseSlug, { name: _editorState.name });
      toast('success', 'התבנית בוטלה');
      _activeBase = null;
      await loadTemplates(true);
      renderSidebar();
      var main = document.getElementById('tpl-editor');
      if (main) main.innerHTML = '<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">התבנית בוטלה</div>';
    } catch (e) { toast('error', 'מחיקה נכשלה: ' + (e.message || String(e))); }
  }

  // Variable substitution for previews — exposed for CrmTemplateSection.
  function substitute(text) {
    return String(text || '')
      .replace(/%name%/g, 'דנה כהן').replace(/%event_name%/g, 'סופר-סייל אוקטובר')
      .replace(/%event_date%/g, '01.11.2026').replace(/%event_time%/g, '09:00 - 14:00')
      .replace(/%event_location%/g, 'הרצל 32, אשקלון').replace(/%coupon_code%/g, 'SuperSale24')
      .replace(/%phone%/g, '050-717-5675').replace(/%email%/g, 'dana@example.com')
      .replace(/%registration_url%/g, 'prizma-optic.co.il/r/...')
      .replace(/%unsubscribe_url%/g, 'prizma-optic.co.il/u/...');
  }
  window.CrmTemplateSubstitute = substitute;
})();
