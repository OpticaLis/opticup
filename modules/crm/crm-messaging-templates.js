/* =============================================================================
   crm-messaging-templates.js — Messaging templates (B7: FINAL-04 rewrite)
   Split layout: sidebar (category-tabs + search + filterTemplates + template cards)
                 + main (toolbar + code-editor with line-numbers + variable-menu +
                         3-panel preview: whatsapp-frame / sms-frame / email-frame)
   Table: crm_message_templates. Depends on: shared.js, CrmHelpers, Modal.
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var CHANNEL_COLORS = { sms: '#3b82f6', whatsapp: '#10b981', email: '#f59e0b' };
  var VARIABLES = [
    { key: '{{name}}',              desc: 'שם הליד' },
    { key: '{{phone}}',             desc: 'טלפון' },
    { key: '{{event_name}}',        desc: 'שם האירוע' },
    { key: '{{event_date}}',        desc: 'תאריך האירוע' },
    { key: '{{event_time}}',        desc: 'שעת האירוע' },
    { key: '{{event_address}}',     desc: 'כתובת' },
    { key: '{{coupon}}',            desc: 'קוד קופון' },
    { key: '{{registration_link}}', desc: 'קישור רישום' },
    { key: '{{unsubscribe_link}}',  desc: 'קישור הסרה' }
  ];
  var CATEGORIES = [
    { key: 'all',     label: 'הכל' },
    { key: 'auto',    label: 'אוטומטי' },
    { key: 'manual',  label: 'ידני' },
    { key: 'drafts',  label: 'טיוטות' }
  ];

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
      var q = sb.from('crm_message_templates').select('id, slug, name, channel, language, subject, body, is_active, created_at, send_count, last_sent_at, is_auto');
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

  // ---- Entry: split layout inside host ----
  function renderMessagingTemplates(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="crm-messaging-split">' +
        '<aside class="crm-messaging-sidebar" id="tpl-sidebar"></aside>' +
        '<main class="crm-messaging-main" id="tpl-editor">' +
          '<div class="crm-detail-empty" style="padding:20px">בחר תבנית מהרשימה או לחץ "+ תבנית חדשה"</div>' +
        '</main>' +
      '</div>';
    loadTemplates().then(function () {
      renderSidebar();
      if (_activeId) openEditor(_activeId);
    }).catch(function (e) {
      var sb2 = host.querySelector('#tpl-sidebar');
      if (sb2) sb2.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingTemplates = renderMessagingTemplates;

  // ---- Sidebar: category-tabs + search + template cards ----
  function renderSidebar() {
    var sb2 = document.getElementById('tpl-sidebar');
    if (!sb2) return;
    var tabsHtml = '<div class="crm-category-tabs">' +
      CATEGORIES.map(function (c) {
        return '<button type="button" class="crm-category-tab ' + c.key + (c.key === _category ? ' active' : '') + '" data-cat="' + c.key + '">' + escapeHtml(c.label) + '</button>';
      }).join('') +
    '</div>';
    var searchHtml = '<input type="search" class="crm-search" id="tpl-search" placeholder="חיפוש תבנית..." value="' + escapeHtml(_search) + '" style="width:100%;margin-bottom:8px;padding:8px 10px;border:1px solid var(--crm-border-strong);border-radius:var(--crm-radius-sm)">';
    var newBtn = '<button type="button" class="crm-btn crm-btn-primary" id="tpl-new" style="width:100%;margin-bottom:10px">+ תבנית חדשה</button>';
    sb2.innerHTML = tabsHtml + searchHtml + newBtn + '<div id="tpl-list"></div>';
    sb2.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { _category = b.getAttribute('data-cat'); renderSidebar(); });
    });
    var srch = sb2.querySelector('#tpl-search');
    if (srch) srch.addEventListener('input', function () { _search = srch.value || ''; renderList(); });
    var nb = sb2.querySelector('#tpl-new');
    if (nb) nb.addEventListener('click', function () { openEditor(null); });
    renderList();
  }

  // ---- filterTemplates + template card list ----
  function filterTemplates() {
    var s = _search.trim().toLowerCase();
    return _templates.filter(function (t) {
      if (_category === 'auto'   && !t.is_auto) return false;
      if (_category === 'manual' && t.is_auto)  return false;
      if (_category === 'drafts' && t.is_active) return false;
      if (s && (t.name || '').toLowerCase().indexOf(s) === -1 && (t.slug || '').toLowerCase().indexOf(s) === -1) return false;
      return true;
    });
  }

  function renderList() {
    var list = document.getElementById('tpl-list');
    if (!list) return;
    var rows = filterTemplates();
    if (!rows.length) { list.innerHTML = '<div class="crm-detail-empty">אין תבניות</div>'; return; }
    list.innerHTML = rows.map(function (t) {
      var ch = CHANNEL_LABELS[t.channel] || t.channel;
      var dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (t.is_active ? 'var(--crm-success)' : 'var(--crm-text-muted)') + ';margin-inline-end:6px"></span>';
      var cls = 'crm-template-card' + (_activeId === t.id ? ' active' : '');
      return '<div class="' + cls + '" data-open-tpl="' + escapeHtml(t.id) + '">' +
        '<div style="font-weight:700">' + dot + escapeHtml(t.name || '') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--crm-text-muted)">' +
          '<span class="crm-badge" style="background:' + escapeHtml(CHANNEL_COLORS[t.channel] || '#6b7280') + '">' + escapeHtml(ch) + '</span> ' +
          (t.send_count ? t.send_count + ' נשלחו' : 'לא נשלח') + ' · ' + escapeHtml(CrmHelpers.formatDate(t.last_sent_at) || '—') +
        '</div>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-open-tpl]').forEach(function (el) {
      el.addEventListener('click', function () { _activeId = el.getAttribute('data-open-tpl'); renderList(); openEditor(_activeId); });
    });
  }

  // ---- Editor: toolbar + code-editor (line-numbers) + variable-menu + 3-panel preview ----
  function openEditor(id) {
    var main = document.getElementById('tpl-editor');
    if (!main) return;
    var tpl = id ? _templates.find(function (t) { return t.id === id; }) : { name: '', slug: '', channel: 'whatsapp', language: 'he', subject: '', body: '', is_active: true };
    if (!tpl) return;
    _activeId = id;

    main.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">' +
        '<input type="text" id="tpl-name" value="' + escapeHtml(tpl.name) + '" placeholder="שם תבנית" style="flex:1;min-width:180px;padding:8px 10px;border:1px solid var(--crm-border-strong);border-radius:var(--crm-radius-sm)">' +
        '<select id="tpl-channel" style="padding:8px;border:1px solid var(--crm-border-strong);border-radius:var(--crm-radius-sm)">' +
          ['whatsapp','sms','email'].map(function (c) { return '<option value="' + c + '"' + (c === tpl.channel ? ' selected' : '') + '>' + CHANNEL_LABELS[c] + '</option>'; }).join('') +
        '</select>' +
        '<select id="tpl-lang" style="padding:8px;border:1px solid var(--crm-border-strong);border-radius:var(--crm-radius-sm)">' +
          [['he','עברית'],['ru','רוסית'],['en','אנגלית']].map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === tpl.language ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<input type="text" id="tpl-subject" value="' + escapeHtml(tpl.subject || '') + '" placeholder="נושא (רק לאימייל)" style="width:100%;padding:8px 10px;border:1px solid var(--crm-border-strong);border-radius:var(--crm-radius-sm);margin-bottom:8px">' +
      // ---- toolbar ----
      '<div class="crm-editor-toolbar">' +
        '<button type="button" class="crm-toolbar-btn" data-fmt="bold"><strong>B</strong></button>' +
        '<button type="button" class="crm-toolbar-btn" data-fmt="italic"><em>I</em></button>' +
        '<button type="button" class="crm-toolbar-btn" data-fmt="underline"><u>U</u></button>' +
        '<button type="button" class="crm-toolbar-btn" data-fmt="emoji">😀</button>' +
        '<span class="crm-variable-menu">' +
          '<button type="button" class="crm-toolbar-btn" id="tpl-var-btn">משתנים ▾</button>' +
          '<div class="crm-variable-menu-list" id="tpl-var-list" style="display:none">' +
            VARIABLES.map(function (v) { return '<div class="crm-variable-item" data-insert-var="' + escapeHtml(v.key) + '"><code>' + escapeHtml(v.key) + '</code><span>' + escapeHtml(v.desc) + '</span></div>'; }).join('') +
          '</div>' +
        '</span>' +
      '</div>' +
      // ---- code editor with line-numbers ----
      '<div class="crm-code-editor">' +
        '<div class="crm-line-numbers" id="tpl-linenums"></div>' +
        '<textarea class="crm-editor-input" id="tpl-body" rows="8">' + escapeHtml(tpl.body || '') + '</textarea>' +
      '</div>' +
      // ---- 3-panel preview ----
      '<div class="crm-preview-container" id="tpl-preview"></div>' +
      // ---- action buttons ----
      '<div class="crm-modal-footer">' +
        '<button type="button" class="crm-btn crm-btn-primary" id="tpl-save">שמור והפעל</button>' +
        '<button type="button" class="crm-btn crm-btn-secondary" id="tpl-draft">שמור טיוטה</button>' +
        '<button type="button" class="crm-btn crm-btn-danger" id="tpl-delete"' + (id ? '' : ' disabled') + '>מחק</button>' +
      '</div>';

    wireEditor(tpl);
    updatePreview();
    updateLineNumbers();
  }

  function wireEditor(tpl) {
    var body = document.getElementById('tpl-body');
    var varBtn = document.getElementById('tpl-var-btn');
    var varList = document.getElementById('tpl-var-list');
    if (varBtn && varList) varBtn.addEventListener('click', function () { varList.style.display = varList.style.display === 'none' ? 'block' : 'none'; });
    document.querySelectorAll('[data-insert-var]').forEach(function (it) {
      it.addEventListener('click', function () { insertVariable(it.getAttribute('data-insert-var')); if (varList) varList.style.display = 'none'; });
    });
    if (body) {
      body.addEventListener('input', function () { updatePreview(); updateLineNumbers(); });
    }
    var save = document.getElementById('tpl-save');
    var draft = document.getElementById('tpl-draft');
    var del = document.getElementById('tpl-delete');
    if (save)  save.addEventListener('click', function () { saveTemplate(tpl, true); });
    if (draft) draft.addEventListener('click', function () { saveTemplate(tpl, false); });
    if (del && tpl.id) del.addEventListener('click', function () { deleteTemplate(tpl); });
  }

  function insertVariable(v) {
    var body = document.getElementById('tpl-body');
    if (!body) return;
    var s = body.selectionStart || 0, e = body.selectionEnd || 0;
    body.value = body.value.slice(0, s) + v + body.value.slice(e);
    body.focus(); body.setSelectionRange(s + v.length, s + v.length);
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

  // ---- 3-panel preview: whatsapp-frame / sms-frame / email-frame ----
  function updatePreview() {
    var host = document.getElementById('tpl-preview');
    if (!host) return;
    var body = (document.getElementById('tpl-body') || {}).value || '';
    var subj = (document.getElementById('tpl-subject') || {}).value || '';
    var rendered = substitute(body);
    host.innerHTML =
      '<div class="crm-preview-panel whatsapp-frame crm-whatsapp-frame">' +
        '<div class="crm-preview-header">WhatsApp</div>' +
        '<div class="crm-preview-body"><div class="crm-preview-bubble">' + escapeHtml(rendered) + '</div></div>' +
      '</div>' +
      '<div class="crm-preview-panel sms-frame crm-sms-frame">' +
        '<div class="crm-preview-header">SMS</div>' +
        '<div class="crm-preview-body"><div class="crm-preview-bubble">' + escapeHtml(rendered) + '</div></div>' +
      '</div>' +
      '<div class="crm-preview-panel email-frame crm-email-frame">' +
        '<div class="crm-preview-header">אימייל</div>' +
        '<div class="crm-preview-body"><strong>' + escapeHtml(substitute(subj)) + '</strong><br>' + escapeHtml(rendered) + '</div>' +
      '</div>';
  }

  function substitute(text) {
    return String(text || '')
      .replace(/\{\{name\}\}/g, 'דנה כהן')
      .replace(/\{\{event_name\}\}/g, 'סופר-סייל אוקטובר')
      .replace(/\{\{event_date\}\}/g, '01.11.2026')
      .replace(/\{\{event_time\}\}/g, '19:00')
      .replace(/\{\{event_address\}\}/g, 'ויצמן 10, כפר סבא')
      .replace(/\{\{coupon\}\}/g, 'SAVE20')
      .replace(/\{\{phone\}\}/g, '050-717-5675')
      .replace(/\{\{registration_link\}\}/g, 'opticalis.co.il/r/...')
      .replace(/\{\{unsubscribe_link\}\}/g, 'opticalis.co.il/u/...');
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
    if (main) main.innerHTML = '<div class="crm-detail-empty" style="padding:20px">התבנית בוטלה</div>';
  }
})();
