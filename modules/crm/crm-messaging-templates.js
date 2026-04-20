/* =============================================================================
   crm-messaging-templates.js — Message Templates CRUD
   Table: crm_message_templates
   Depends on: shared.js (sb, getTenantId, escapeHtml), CrmHelpers, Modal
   Exports:
     window.renderMessagingTemplates(host) — sub-tab: תבניות
     window.loadMessagingTemplates()       — public refresher
     window._crmMessagingTemplates()       — list (used by rules + broadcast)
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC' };
  var CHANNEL_COLORS = { sms: '#3b82f6', whatsapp: '#10b981', email: '#f59e0b' };
  var LANG_OPTIONS = [
    { code: 'he', label: '\u05E2\u05D1\u05E8\u05D9\u05EA' },
    { code: 'ru', label: '\u05E8\u05D5\u05E1\u05D9\u05EA' },
    { code: 'en', label: '\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA' }
  ];
  var VARIABLES = ['{{name}}', '{{phone}}', '{{phone_local}}', '{{email}}', '{{event_name}}', '{{event_date}}', '{{event_time}}', '{{event_address}}', '{{coupon}}', '{{registration_link}}', '{{unsubscribe_link}}', '{{lead_id}}', '{{source}}'];

  var _templates = [];
  var _loadPromise = null;

  function slugify(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }

  function logWrite(action, entityId, meta) {
    if (window.ActivityLog && typeof ActivityLog.write === 'function') {
      try { ActivityLog.write({ action: action, entity_type: 'crm_message_template', entity_id: entityId, severity: 'info', metadata: meta || {} }); } catch (_) {}
    }
  }
  function toast(type, msg) {
    if (window.Toast && typeof Toast[type] === 'function') Toast[type](msg);
    else if (window.Toast && typeof Toast.show === 'function') Toast.show(msg);
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
      if (res.error) throw new Error('templates load failed: ' + res.error.message);
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
      '<div class="crm-filter-bar">' +
        '<h3 style="flex:1;color:var(--primary);margin:0">\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05D4\u05D5\u05D3\u05E2\u05D4</h3>' +
        '<button type="button" class="btn btn-primary" id="btn-new-template">+ \u05EA\u05D1\u05E0\u05D9\u05EA \u05D7\u05D3\u05E9\u05D4</button>' +
      '</div>' +
      '<div id="crm-templates-table" class="crm-table-wrap"><div class="crm-detail-empty" style="padding:20px">\u05D8\u05D5\u05E2\u05DF...</div></div>';

    var btn = host.querySelector('#btn-new-template');
    if (btn) btn.addEventListener('click', function () { openTemplateModal(null); });

    loadTemplates().then(renderTable).catch(function (e) {
      var wrap = host.querySelector('#crm-templates-table');
      if (wrap) wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingTemplates = renderMessagingTemplates;

  function renderTable() {
    var wrap = document.getElementById('crm-templates-table');
    if (!wrap) return;
    if (!_templates.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">\u05D0\u05D9\u05DF \u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF. \u05DC\u05D7\u05E5 "\u05EA\u05D1\u05E0\u05D9\u05EA \u05D7\u05D3\u05E9\u05D4" \u05DC\u05D9\u05E6\u05D9\u05E8\u05EA \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4.</div>';
      return;
    }
    var html = '<table class="crm-table"><thead><tr>' +
      '<th>\u05E9\u05DD</th><th>Slug</th><th>\u05E2\u05E8\u05D5\u05E5</th><th>\u05E9\u05E4\u05D4</th><th>\u05E4\u05E2\u05D9\u05DC</th><th style="text-align:end">\u05E4\u05E2\u05D5\u05DC\u05D4</th>' +
      '</tr></thead><tbody>';
    _templates.forEach(function (r) {
      var chColor = CHANNEL_COLORS[r.channel] || '#6b7280';
      var chLabel = CHANNEL_LABELS[r.channel] || r.channel || '';
      html += '<tr data-tpl-id="' + escapeHtml(r.id) + '">' +
        '<td>' + escapeHtml(r.name || '') + '</td>' +
        '<td><code style="font-size:.82rem;color:var(--g500)">' + escapeHtml(r.slug || '') + '</code></td>' +
        '<td><span class="crm-badge" style="background:' + escapeHtml(chColor) + '">' + escapeHtml(chLabel) + '</span></td>' +
        '<td>' + escapeHtml(CrmHelpers.formatLanguage(r.language)) + '</td>' +
        '<td><button type="button" class="crm-toggle' + (r.is_active ? ' on' : '') + '" data-toggle-id="' + escapeHtml(r.id) + '" data-next="' + (r.is_active ? '0' : '1') + '">' + (r.is_active ? '\u05E4\u05E2\u05D9\u05DC' : '\u05DB\u05D1\u05D5\u05D9') + '</button></td>' +
        '<td style="text-align:end"><button type="button" class="crm-link-btn" data-edit-id="' + escapeHtml(r.id) + '">\u05E2\u05E8\u05D9\u05DB\u05D4</button></td>' +
        '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';

    wrap.querySelectorAll('button[data-edit-id]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var row = _templates.find(function (r) { return r.id === b.getAttribute('data-edit-id'); });
        if (row) openTemplateModal(row);
      });
    });
    wrap.querySelectorAll('button[data-toggle-id]').forEach(function (b) {
      b.addEventListener('click', async function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-toggle-id');
        var next = b.getAttribute('data-next') === '1';
        b.disabled = true;
        var ok = await toggleActive(id, next);
        b.disabled = false;
        if (ok) renderTable();
      });
    });
  }

  function openTemplateModal(existing) {
    var isNew = !existing;
    var row = existing || { name: '', slug: '', channel: 'whatsapp', language: 'he', subject: '', body: '', is_active: true };
    var title = isNew ? '\u05EA\u05D1\u05E0\u05D9\u05EA \u05D7\u05D3\u05E9\u05D4' : '\u05E2\u05E8\u05D9\u05DB\u05EA \u05EA\u05D1\u05E0\u05D9\u05EA';

    var chipsHtml = VARIABLES.map(function (v) {
      return '<button type="button" class="crm-msg-chip" data-var="' + v + '">' + escapeHtml(v) + '</button>';
    }).join('');

    var chOpts = ['sms', 'whatsapp', 'email'].map(function (c) {
      return '<option value="' + c + '"' + (c === row.channel ? ' selected' : '') + '>' + CHANNEL_LABELS[c] + '</option>';
    }).join('');
    var lgOpts = LANG_OPTIONS.map(function (l) {
      return '<option value="' + l.code + '"' + (l.code === row.language ? ' selected' : '') + '>' + l.label + '</option>';
    }).join('');

    var content =
      '<div class="crm-form-row"><label>\u05E9\u05DD \u05EA\u05D1\u05E0\u05D9\u05EA *</label><input type="text" id="tpl-name" value="' + escapeHtml(row.name) + '" required></div>' +
      '<div class="crm-form-row"><label>Slug (\u05DE\u05D6\u05D4\u05D4 \u05D8\u05DB\u05E0\u05D9)</label><input type="text" id="tpl-slug" value="' + escapeHtml(row.slug) + '" placeholder="\u05D9\u05D5\u05E6\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DE\u05D4\u05E9\u05DD"></div>' +
      '<div class="crm-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div><label>\u05E2\u05E8\u05D5\u05E5 *</label><select id="tpl-channel">' + chOpts + '</select></div>' +
        '<div><label>\u05E9\u05E4\u05D4 *</label><select id="tpl-language">' + lgOpts + '</select></div>' +
      '</div>' +
      '<div class="crm-form-row" id="tpl-subject-row"><label>\u05E0\u05D5\u05E9\u05D0 (\u05DC\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D1\u05DC\u05D1\u05D3)</label><input type="text" id="tpl-subject" value="' + escapeHtml(row.subject || '') + '"></div>' +
      '<div class="crm-form-row"><label>\u05EA\u05D5\u05DB\u05DF *</label><textarea id="tpl-body" rows="6" required>' + escapeHtml(row.body || '') + '</textarea></div>' +
      '<div class="crm-form-row"><label>\u05DE\u05E9\u05EA\u05E0\u05D9\u05DD \u05D6\u05DE\u05D9\u05E0\u05D9\u05DD (\u05DC\u05D7\u05E5 \u05DC\u05D4\u05E2\u05EA\u05E7\u05D4):</label><div class="crm-msg-chips">' + chipsHtml + '</div></div>';

    var modal = Modal.form({
      title: title, size: 'md', content: content,
      onSubmit: function (formEl) {
        var data = readForm(formEl);
        var err = validate(data);
        if (err) { toast('error', err); return; }
        save(row.id, data, isNew);
      }
    });

    var el = modal.el;
    var nameIn = el.querySelector('#tpl-name');
    var slugIn = el.querySelector('#tpl-slug');
    var chSel = el.querySelector('#tpl-channel');
    var subjRow = el.querySelector('#tpl-subject-row');
    var bodyEl = el.querySelector('#tpl-body');

    function toggleSubjectRow() { subjRow.style.display = (chSel.value === 'email') ? '' : 'none'; }
    toggleSubjectRow();
    chSel.addEventListener('change', toggleSubjectRow);

    if (isNew && !slugIn.value) {
      nameIn.addEventListener('input', function () {
        if (!slugIn.dataset.manual) slugIn.value = slugify(nameIn.value);
      });
      slugIn.addEventListener('input', function () { slugIn.dataset.manual = '1'; });
    }

    el.querySelectorAll('button[data-var]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        var variable = b.getAttribute('data-var');
        var start = bodyEl.selectionStart || 0;
        var end = bodyEl.selectionEnd || 0;
        var v = bodyEl.value;
        bodyEl.value = v.slice(0, start) + variable + v.slice(end);
        bodyEl.focus();
        bodyEl.setSelectionRange(start + variable.length, start + variable.length);
      });
    });
  }

  function readForm(el) {
    return {
      name: (el.querySelector('#tpl-name').value || '').trim(),
      slug: (el.querySelector('#tpl-slug').value || '').trim() || slugify(el.querySelector('#tpl-name').value),
      channel: el.querySelector('#tpl-channel').value,
      language: el.querySelector('#tpl-language').value,
      subject: (el.querySelector('#tpl-subject').value || '').trim() || null,
      body: (el.querySelector('#tpl-body').value || '').trim()
    };
  }

  function validate(d) {
    if (!d.name) return '\u05E9\u05DD \u05EA\u05D1\u05E0\u05D9\u05EA \u05D7\u05D5\u05D1\u05D4';
    if (!d.slug) return 'Slug \u05D7\u05D5\u05D1\u05D4';
    if (!d.body) return '\u05EA\u05D5\u05DB\u05DF \u05D4\u05D5\u05D3\u05E2\u05D4 \u05D7\u05D5\u05D1\u05D4';
    if (['sms', 'whatsapp', 'email'].indexOf(d.channel) === -1) return '\u05E2\u05E8\u05D5\u05E5 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF';
    return null;
  }

  async function save(id, data, isNew) {
    var tid = getTenantId();
    try {
      if (isNew) {
        var ins = await sb.from('crm_message_templates').insert({ tenant_id: tid, slug: data.slug, name: data.name, channel: data.channel, language: data.language, subject: data.subject, body: data.body, is_active: true }).select('id').single();
        if (ins.error) throw new Error(ins.error.message);
        logWrite('crm.template.create', ins.data.id, { name: data.name, channel: data.channel, language: data.language });
        toast('success', '\u05D4\u05EA\u05D1\u05E0\u05D9\u05EA \u05E0\u05D5\u05E6\u05E8\u05D4');
      } else {
        var upd = await sb.from('crm_message_templates').update({ name: data.name, slug: data.slug, channel: data.channel, language: data.language, subject: data.subject, body: data.body }).eq('id', id).eq('tenant_id', tid);
        if (upd.error) throw new Error(upd.error.message);
        logWrite('crm.template.update', id, { name: data.name, channel: data.channel });
        toast('success', '\u05D4\u05EA\u05D1\u05E0\u05D9\u05EA \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4');
      }
      await loadTemplates(true);
      renderTable();
    } catch (e) {
      toast('error', '\u05E9\u05DE\u05D9\u05E8\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4: ' + (e.message || String(e)));
    }
  }

  async function toggleActive(id, nextActive) {
    var tid = getTenantId();
    var upd = await sb.from('crm_message_templates').update({ is_active: !!nextActive }).eq('id', id).eq('tenant_id', tid);
    if (upd.error) { toast('error', '\u05DB\u05E9\u05DC'); return false; }
    logWrite('crm.template.toggle', id, { is_active: !!nextActive });
    var row = _templates.find(function (r) { return r.id === id; });
    if (row) row.is_active = !!nextActive;
    return true;
  }
})();
