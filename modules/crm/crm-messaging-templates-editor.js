/* =============================================================================
   crm-messaging-templates-editor.js — Logical template editor.
   Extracted from crm-messaging-templates.js on 2026-05-12 (Iron Rule 12 split).
   Owns the right-pane editor: open/render/wire + save + delete handlers.
   Parent (crm-messaging-templates.js) calls CrmTemplatesEditor.open(baseSlug, ctx)
   where ctx = { CHANNELS, CHANNEL_LABELS, CLS_*, findLogicalByBase,
                  newLogicalDraft, cloneState, loadTemplates, renderSidebar,
                  setActiveBase, toast, log }.
   ============================================================================= */
(function () {
  'use strict';

  var _editorState = null;
  var _ctx = null;

  function deriveSlugFromName(name) {
    return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }
  function chSuffix(ch) { return ch === 'sms' ? 'SMS' : ch === 'email' ? 'Email' : 'WhatsApp'; }

  function open(baseSlug, ctx) {
    _ctx = ctx;
    var main = document.getElementById('tpl-editor');
    if (!main) return;
    var g = baseSlug ? ctx.findLogicalByBase(baseSlug) : null;
    _editorState = g ? ctx.cloneState(g) : ctx.newLogicalDraft();
    _editorState._lintOverrideAcknowledged = false;
    ctx.setActiveBase(g ? g.baseSlug : null);
    var slugField = _editorState.isNew  // editable on new (Hebrew names → empty); read-only on edit
      ? '<input type="text" id="tpl-slug" value="' + escapeHtml(_editorState.baseSlug || '') + '" placeholder="slug (אנגלית, ייגזר משם אם ריק)" class="' + ctx.CLS_INPUT + ' w-64 text-xs font-mono" dir="ltr">'
      : '<span class="px-3 py-2 text-xs text-slate-500 self-center font-mono" dir="ltr">slug: ' + escapeHtml(_editorState.baseSlug) + '</span>';
    var showAuto = _editorState.showInAutomations !== false;
    var showAutoToggle = '<label class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-pointer"><input type="checkbox" id="tpl-show-auto"' + (showAuto ? ' checked' : '') + ' class="rounded"><span>הצג במסך אוטומציות</span></label>';
    main.innerHTML =
      '<div class="bg-white border border-slate-200 rounded-xl p-4">' +
        '<div class="flex flex-wrap gap-2">' +
          '<input type="text" id="tpl-name" value="' + escapeHtml(_editorState.name) + '" placeholder="שם תבנית" class="' + ctx.CLS_INPUT + ' flex-1 min-w-[200px] font-semibold">' +
          '<select id="tpl-lang" class="' + ctx.CLS_INPUT + ' w-28">' +
            [['he','עברית'],['ru','רוסית'],['en','אנגלית']].map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === _editorState.language ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') +
          '</select>' + slugField +
        '</div>' +
        '<div class="mt-2">' + showAutoToggle + '</div>' +
      '</div>' +
      '<div id="tpl-section-sms"></div><div id="tpl-section-whatsapp"></div><div id="tpl-section-email"></div>' +
      '<div class="bg-white border border-slate-200 rounded-xl p-4 flex gap-2 justify-end">' +
        (_editorState.isNew ? '' : '<button type="button" class="' + ctx.CLS_BTN_DANGER + '" id="tpl-delete">מחק תבנית</button>') +
        '<button type="button" class="' + ctx.CLS_BTN_SECOND + '" id="tpl-cancel">ביטול</button>' +
        '<button type="button" class="' + ctx.CLS_BTN_PRIMARY + '" id="tpl-save">שמור הכל</button>' +
      '</div>';
    ctx.CHANNELS.forEach(renderSection);
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
      _ctx.setActiveBase(null); _editorState = null;
      var main = document.getElementById('tpl-editor');
      if (main) main.innerHTML = '<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">בחר תבנית או לחץ "+ תבנית חדשה"</div>';
    });
    if (delB) delB.addEventListener('click', deleteLogicalTemplate);
  }

  async function saveLogicalTemplate() {
    if (!_editorState) return;
    var name = (_editorState.name || '').trim();
    if (!name) { _ctx.toast('error', 'שם תבנית חובה'); return; }
    if (!_ctx.CHANNELS.some(function (c) { return _editorState.channels[c].exists; })) { _ctx.toast('error', 'יש לסמן לפחות ערוץ אחד פעיל'); return; }
    var tid = getTenantId();
    var manualSlug = _editorState.isNew && document.getElementById('tpl-slug') ? document.getElementById('tpl-slug').value.trim() : '';
    var baseSlug = _editorState.isNew ? deriveSlugFromName(manualSlug || name) : _editorState.baseSlug;
    if (!baseSlug) { _ctx.toast('error', 'נדרש slug באנגלית — מלא ידנית את שדה ה-slug'); return; }
    var emptyCh2 = _ctx.CHANNELS.filter(function (c) { return _editorState.channels[c].exists && !((_editorState.channels[c].body || '').trim()); })[0];
    if (emptyCh2) { _ctx.toast('error', 'תוכן חסר בערוץ ' + _ctx.CHANNEL_LABELS[emptyCh2]); return; }

    // ── Layer D lint — M4_TEMPLATE_VALIDATION_UI_LINT (2026-05-19) ──────────
    // Runs AFTER name/channel/slug/empty-body guards but BEFORE building ops[].
    if (window.CrmTemplateLint && !_editorState._lintOverrideAcknowledged) {
      var paymentLinkKeys = (window.OpticupConfig && OpticupConfig.tenant && OpticupConfig.tenant.payment_links)
        ? Object.keys(OpticupConfig.tenant.payment_links) : [];
      var lintErrors = { unknownPlaceholders: [], typos: [], paymentUrlErrors: [] };
      _ctx.CHANNELS.forEach(function (ch) {
        var cs = _editorState.channels[ch];
        if (!cs.exists) return;
        var r = window.CrmTemplateLint.validate(cs.body || '', cs.subject || null,
          { paymentLinkKeys: paymentLinkKeys });
        Array.prototype.push.apply(lintErrors.unknownPlaceholders, r.unknownPlaceholders);
        Array.prototype.push.apply(lintErrors.typos, r.typos);
        Array.prototype.push.apply(lintErrors.paymentUrlErrors, r.paymentUrlErrors);
      });
      // Trace for Iron Rule 34 verification (D-AUTH-8).
      window.__lintTrace = window.__lintTrace || [];
      window.__lintTrace.push({ at: Date.now(), result: lintErrors });
      // HARD-BLOCK: typos or broken payment_url keys.
      if (lintErrors.typos.length > 0 || lintErrors.paymentUrlErrors.length > 0) {
        renderLintBanner(lintErrors, 'hard');
        _ctx.toast('error', 'בעיות באימות placeholders — תקן לפני שמירה');
        return;
      }
      // SOFT-BLOCK: genuinely-new unknowns — require override checkbox.
      if (lintErrors.unknownPlaceholders.length > 0) {
        renderLintBanner(lintErrors, 'soft');
        return; // banner sets _lintOverrideAcknowledged when checkbox is checked
      }
      // CLEAN — clear any stale banner and proceed.
      var stale = document.getElementById('tpl-lint-banner');
      if (stale) stale.remove();
    }
    // ── End Layer D lint ──────────────────────────────────────────────────────

    var showAutoEl = document.getElementById('tpl-show-auto');
    var showAuto = showAutoEl ? !!showAutoEl.checked : (_editorState.showInAutomations !== false);
    _editorState.showInAutomations = showAuto;
    var ops = [], saved = 0, deactivated = 0, created = 0;
    _ctx.CHANNELS.forEach(function (ch) {
      var cs = _editorState.channels[ch];
      var fullSlug = baseSlug + '_' + ch + '_' + (_editorState.language || 'he');
      var rowName = name + ' — ' + chSuffix(ch);
      if (cs.exists) {
        if (cs.id) {
          ops.push(sb.from('crm_message_templates').update({ name: rowName, language: _editorState.language,
            subject: ch === 'email' ? (cs.subject || null) : null, body: cs.body || '', is_active: true,
            show_in_automations: showAuto })
            .eq('id', cs.id).eq('tenant_id', tid).then(function () { saved++; }));
        } else {
          ops.push(sb.from('crm_message_templates').insert({ tenant_id: tid, slug: fullSlug, name: rowName, channel: ch,
            language: _editorState.language, subject: ch === 'email' ? (cs.subject || null) : null, body: cs.body || '', is_active: true,
            show_in_automations: showAuto })
            .select('id').single().then(function (res) { if (res && res.data) _editorState.channels[ch].id = res.data.id; created++; }));
        }
      } else if (cs.id) {
        ops.push(sb.from('crm_message_templates').update({ is_active: false }).eq('id', cs.id).eq('tenant_id', tid).then(function () { deactivated++; }));
      }
    });
    try {
      var results = await Promise.allSettled(ops);
      var failures = results.filter(function (r) { return r.status === 'rejected'; });
      if (failures.length) { _ctx.toast('error', 'שמירה חלקית: ' + failures.length + ' כשלים'); console.warn('crm-templates save failures:', failures); }
      else { _ctx.toast('success', 'נשמר (' + (saved + created) + ' נשמרו, ' + deactivated + ' בוטלו)'); }
      _ctx.log('crm.template.save', baseSlug, { name: name, saved: saved, created: created, deactivated: deactivated });
      _ctx.setActiveBase(baseSlug);
      await _ctx.loadTemplates(true);
      _ctx.renderSidebar();
      open(baseSlug, _ctx);
    } catch (e) { _ctx.toast('error', 'שמירה נכשלה: ' + (e.message || String(e))); }
  }

  // renderLintBanner — Layer D UI feedback helper (M4_TEMPLATE_VALIDATION_UI_LINT).
  // mode='hard' → red bg, Save stays disabled (no override).
  // mode='soft' → amber bg, override checkbox enables re-save.
  function renderLintBanner(errors, mode) {
    var existing = document.getElementById('tpl-lint-banner');
    if (existing) existing.remove();
    var isHard = mode === 'hard';
    var lines = [];
    errors.typos.forEach(function (t) {
      lines.push('❌ שגיאת הקלדה: <code>%' + escapeHtml(t.name) + '%</code> — כוונת <code>%' + escapeHtml(t.suggestion) + '%</code>?');
    });
    errors.paymentUrlErrors.forEach(function (p) {
      lines.push('❌ <code>%' + escapeHtml(p.name) + '%</code> — לדייר אין מפתח payment_links.' + escapeHtml(p.missingKey));
    });
    errors.unknownPlaceholders.forEach(function (u) {
      lines.push('⚠️ Placeholder לא מוכר: <code>%' + escapeHtml(u.name) + '%</code>');
    });
    var overridePart = isHard ? '' :
      '<label class="flex items-center gap-2 mt-2 cursor-pointer">' +
        '<input type="checkbox" id="tpl-lint-override">' +
        '<span class="text-sm">אני מאשר — placeholder חדש; יידרש SPEC ארכיטקט להוסיף לרזולבר</span>' +
      '</label>';
    var div = document.createElement('div');
    div.id = 'tpl-lint-banner';
    div.className = 'rounded-lg p-3 mb-2 text-sm ' + (isHard ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800');
    div.innerHTML = '<div class="font-semibold mb-1">' + (isHard ? 'שגיאות placeholder — חסום שמירה' : 'Placeholders לא מוכרים') + '</div>' +
      '<ul class="list-disc list-inside space-y-0.5">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
      overridePart;
    var footer = document.querySelector('#tpl-editor .flex.gap-2.justify-end');
    if (footer) footer.parentNode.insertBefore(div, footer);
    if (!isHard) {
      var cb = document.getElementById('tpl-lint-override');
      if (cb) cb.addEventListener('change', function () {
        _editorState._lintOverrideAcknowledged = !!cb.checked;
      });
    }
  }

  async function deleteLogicalTemplate() {
    if (!_editorState || _editorState.isNew) return;
    if (!confirm('למחוק את "' + _editorState.name + '" על כל הערוצים שלה?')) return;
    var tid = getTenantId();
    var ops = [];
    _ctx.CHANNELS.forEach(function (ch) {
      var cs = _editorState.channels[ch];
      if (cs.id) ops.push(sb.from('crm_message_templates').update({ is_active: false }).eq('id', cs.id).eq('tenant_id', tid));
    });
    try {
      var results = await Promise.allSettled(ops);
      if (results.some(function (r) { return r.status === 'rejected'; })) { _ctx.toast('error', 'מחיקה חלקית נכשלה'); return; }
      _ctx.log('crm.template.deactivate', _editorState.baseSlug, { name: _editorState.name });
      _ctx.toast('success', 'התבנית בוטלה');
      _ctx.setActiveBase(null);
      await _ctx.loadTemplates(true);
      _ctx.renderSidebar();
      var main = document.getElementById('tpl-editor');
      if (main) main.innerHTML = '<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">התבנית בוטלה</div>';
    } catch (e) { _ctx.toast('error', 'מחיקה נכשלה: ' + (e.message || String(e))); }
  }

  window.CrmTemplatesEditor = { open: open };
})();
