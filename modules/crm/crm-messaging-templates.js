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

  function _tplToast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function _tplLog(a, id, m) { if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: 'crm_message_template', entity_id: id, details: m || {} }); } catch (_) {} } }
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
          showInAutomations: r.show_in_automations !== false,
          channels: { sms: emptyCh(), whatsapp: emptyCh(), email: emptyCh() } };
      }
      var g = groups[base];
      if (CHANNELS.indexOf(r.channel) !== -1) {
        g.channels[r.channel] = { exists: !!r.is_active, id: r.id, body: r.body || '', subject: r.subject || null, original: r };
        if (r.is_active) g.name = stripChannelSuffix(r.name) || g.name;
      }
      // Logical-template visibility is the AND of all channel rows (a single
      // hidden row hides the whole logical template). In practice the editor
      // saves all 3 channels with the same flag, so this is a tight invariant.
      if (r.show_in_automations === false) g.showInAutomations = false;
    });
    return Object.keys(groups).sort().map(function (k) { return groups[k]; });
  }

  async function loadTemplates(force) {
    if (force) { _loadPromise = null; _templates = []; _logical = []; }
    if (_loadPromise) return _loadPromise;
    var tid = getTenantId();
    _loadPromise = (async function () {
      var q = sb.from('crm_message_templates').select('id, slug, name, channel, language, subject, body, is_active, show_in_automations, created_at');
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
      b.addEventListener('click', async function () { _category = b.getAttribute('data-cat'); if (_category === 'auto') await _loadAutoRulesIfNeeded(); renderSidebar(); });
    });
    var srch = sb2.querySelector('#tpl-search');
    if (srch) srch.addEventListener('input', function () { _search = srch.value || ''; renderList(); });
    var nb = sb2.querySelector('#tpl-new');
    if (nb) nb.addEventListener('click', function () { openEditor(null); });
    renderList();
  }

  // Lazy cache of active automation rules — populated on first 'auto' filter click.
  // Resolves M4-DEBT-CRMUX-02 from CRM_UX_REDESIGN_TEMPLATES/FINDINGS.md (Finding 2).
  var _autoRulesCache = null;
  async function _loadAutoRulesIfNeeded() {
    if (_autoRulesCache) return _autoRulesCache;
    if (typeof window.loadMessagingRules === 'function') {
      try { await window.loadMessagingRules(); } catch (_) {}
    }
    var slugs = {};
    var tid = getTenantId();
    var q = sb.from('crm_automation_rules').select('action_config,is_active');
    if (tid) q = q.eq('tenant_id', tid);
    q = q.eq('is_active', true);
    var res = await q;
    (res.data || []).forEach(function (r) { var s = r.action_config && r.action_config.template_slug; if (s) slugs[s] = true; });
    _autoRulesCache = slugs;
    return slugs;
  }
  function _filterCategoryAuto(g) { return !!(_autoRulesCache && _autoRulesCache[g.baseSlug]); }

  function filterLogical() {
    var s = _search.trim().toLowerCase();
    return _logical.filter(function (g) {
      var active = logicalIsActive(g);
      if (_category === 'auto')   return _filterCategoryAuto(g);
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
    return { baseSlug: '', name: '', language: 'he', showInAutomations: true,
      channels: { sms: emptyCh(), whatsapp: emptyCh(), email: emptyCh() }, isNew: true };
  }
  function cloneState(g) {
    return { baseSlug: g.baseSlug, name: g.name, language: g.language,
      showInAutomations: g.showInAutomations !== false,
      channels: { sms: Object.assign({}, g.channels.sms), whatsapp: Object.assign({}, g.channels.whatsapp), email: Object.assign({}, g.channels.email) },
      isNew: !!g.isNew };
  }

  // Editor lifecycle (open/save/delete) lives in crm-messaging-templates-editor.js
  // since 2026-05-12 (Iron Rule 12 split). This shim forwards calls + ctx.
  function openEditor(baseSlug) {
    if (!window.CrmTemplatesEditor) { _tplToast('error', 'עורך תבניות לא נטען'); return; }
    window.CrmTemplatesEditor.open(baseSlug, {
      CHANNELS: CHANNELS, CHANNEL_LABELS: CHANNEL_LABELS,
      CLS_INPUT: CLS_INPUT, CLS_BTN_PRIMARY: CLS_BTN_PRIMARY,
      CLS_BTN_SECOND: CLS_BTN_SECOND, CLS_BTN_DANGER: CLS_BTN_DANGER,
      findLogicalByBase: findLogicalByBase, newLogicalDraft: newLogicalDraft,
      cloneState: cloneState, loadTemplates: loadTemplates,
      renderSidebar: renderSidebar,
      setActiveBase: function (b) { _activeBase = b; },
      toast: _tplToast, log: _tplLog
    });
  }

  // Variable substitution for previews — exposed for CrmTemplateSection.
  // Tenant-neutral placeholders (M4_HARDCODED_PRIZMA_REMOVAL): customer-facing
  // messages still substitute real values via send-message EF reading
  // tenants.business_address / .business_phone / .ui_config.storefront_url;
  // this preview just shows where each variable appears.
  function substitute(text) {
    return String(text || '')
      .replace(/%name%/g, 'דנה כהן').replace(/%event_name%/g, 'סופר-סייל אוקטובר')
      .replace(/%event_date%/g, '01.11.2026').replace(/%event_time%/g, '09:00 - 14:00')
      .replace(/%event_location%/g, '[כתובת העסק]').replace(/%coupon_code%/g, 'SuperSale24')
      .replace(/%phone%/g, '[טלפון העסק]').replace(/%email%/g, 'dana@example.com')
      .replace(/%registration_url%/g, '[storefront]/r/...')
      .replace(/%unsubscribe_url%/g, '[storefront]/u/...');
  }
  window.CrmTemplateSubstitute = substitute;
})();
