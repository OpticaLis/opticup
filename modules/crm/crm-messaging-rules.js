/* =============================================================================
   crm-messaging-rules.js — Automation Rules (B8 Tailwind — FINAL-04)
   Table: crm_automation_rules
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var CHANNEL_CLASSES = { sms: 'bg-sky-500', whatsapp: 'bg-emerald-500', email: 'bg-amber-500' };

  // P8 — trigger/condition/recipient taxonomies mirror the engine (crm-automation-engine.js).
  var TRIGGER_TYPES = {
    event_status_change: { label: 'שינוי סטטוס אירוע', entity: 'event',    event: 'status_change' },
    event_registration:  { label: 'הרשמה לאירוע',       entity: 'attendee', event: 'created'       },
    lead_status_change:  { label: 'שינוי סטטוס ליד',    entity: 'lead',     event: 'status_change' },
    lead_intake:         { label: 'ליד חדש (ידני)',     entity: 'lead',     event: 'created'       }
  };
  var CONDITION_TYPES = {
    always:          'תמיד (ללא תנאי)',
    status_equals:   'סטטוס שווה ל-',
    count_threshold: 'ספירה עוברת סף',
    source_equals:   'מקור שווה ל-'
  };
  var RECIPIENT_TYPES = {
    trigger_lead:            'הליד שהפעיל את החוק',
    tier2:                   'כל Tier 2',
    tier2_excl_registered:   'Tier 2 חוץ מרשומים',
    attendees:               'נרשמים לאירוע',
    attendees_waiting:       'רשימת המתנה'
  };
  // P21: recipient_status_filter — only offered when recipient_type is tier2*.
  // Empty filter = send to ALL tier2 statuses (backwards-compatible default).
  var TIER2_FILTER_STATUSES = [
    { slug: 'waiting',            label: 'ממתין לאירוע (waiting)' },
    { slug: 'invited',             label: 'הוזמן (invited)' },
    { slug: 'confirmed',           label: 'אישר הגעה (confirmed)' },
    { slug: 'confirmed_verified', label: 'אומת (confirmed_verified)' }
  ];
  function recipientTypeUsesStatusFilter(t) { return t === 'tier2' || t === 'tier2_excl_registered'; }
  function lookupTriggerTypeKey(entity, event) {
    for (var k in TRIGGER_TYPES) {
      if (TRIGGER_TYPES[k].entity === entity && TRIGGER_TYPES[k].event === event) return k;
    }
    return null;
  }

  var CLS_TABLE      = 'w-full text-sm bg-white';
  var CLS_TH         = 'px-4 py-3 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD         = 'px-4 py-3 text-slate-800';
  var CLS_ROW        = 'border-b border-slate-100';
  var CLS_INPUT      = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500';
  var CLS_LABEL      = 'block text-sm font-medium text-slate-700 mb-1';
  var CLS_BTN_P      = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm';
  var CLS_LINK_BTN   = 'text-sm text-indigo-600 font-medium hover:text-indigo-800 hover:underline';
  var CLS_TOGGLE_OFF = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
  var CLS_TOGGLE_ON  = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition';

  var _rules = [];
  var _loadPromise = null;

  function logWrite(action, entityId, meta) {
    if (window.ActivityLog && typeof ActivityLog.write === 'function') {
      try { ActivityLog.write({ action: action, entity_type: 'crm_automation_rule', entity_id: entityId, severity: 'info', metadata: meta || {} }); } catch (_) {}
    }
  }
  function toast(type, msg) {
    if (window.Toast && typeof Toast[type] === 'function') Toast[type](msg);
    else if (window.Toast && typeof Toast.show === 'function') Toast.show(msg);
  }

  async function loadRules(force) {
    if (force) { _loadPromise = null; _rules = []; }
    if (_loadPromise) return _loadPromise;
    var tid = getTenantId();
    _loadPromise = (async function () {
      var q = sb.from('crm_automation_rules').select('id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active, created_at');
      if (tid) q = q.eq('tenant_id', tid);
      q = q.order('sort_order').order('name');
      var res = await q;
      if (res.error) throw new Error('rules load failed: ' + res.error.message);
      _rules = res.data || [];
      return _rules;
    })().catch(function (e) { _loadPromise = null; throw e; });
    return _loadPromise;
  }
  window.loadMessagingRules = function () { return loadRules(true); };

  function renderMessagingRules(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="flex items-center justify-between mb-4">' +
        '<h3 class="text-lg font-bold text-slate-800 m-0">כללי אוטומציה</h3>' +
        '<button type="button" class="' + CLS_BTN_P + '" id="btn-new-rule">+ כלל חדש</button>' +
      '</div>' +
      '<div id="crm-rules-table" class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">' +
        '<div class="text-center text-slate-400 py-8">טוען...</div>' +
      '</div>';

    var btn = host.querySelector('#btn-new-rule');
    if (btn) btn.addEventListener('click', function () { openRuleModal(null); });

    loadRules().then(renderTable).catch(function (e) {
      var wrap = host.querySelector('#crm-rules-table');
      if (wrap) wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingRules = renderMessagingRules;

  function renderTable() {
    var wrap = document.getElementById('crm-rules-table');
    if (!wrap) return;
    if (!_rules.length) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין כללי אוטומציה עדיין.</div>';
      return;
    }
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">שם</th>' +
      '<th class="' + CLS_TH + '">טריגר</th>' +
      '<th class="' + CLS_TH + '">פעולה</th>' +
      '<th class="' + CLS_TH + '">ערוצים</th>' +
      '<th class="' + CLS_TH + '">פעיל</th>' +
      '<th class="' + CLS_TH + ' text-end">פעולה</th>' +
      '</tr></thead><tbody>';
    _rules.forEach(function (r) {
      var tKey = lookupTriggerTypeKey(r.trigger_entity, r.trigger_event);
      var trig = tKey ? TRIGGER_TYPES[tKey].label : (r.trigger_entity + ' · ' + r.trigger_event);
      var cfg = r.action_config || {};
      var chs = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : []);
      var chHtml = chs.map(function (c) {
        return '<span class="inline-block text-xs text-white font-semibold px-2 py-0.5 rounded-full me-1 ' + (CHANNEL_CLASSES[c] || 'bg-slate-500') + '">' + escapeHtml(CHANNEL_LABELS[c] || c) + '</span>';
      }).join('') || '<span class="text-slate-400 text-xs">—</span>';
      var toggleCls = r.is_active ? CLS_TOGGLE_ON : CLS_TOGGLE_OFF;
      html += '<tr class="' + CLS_ROW + '" data-rule-id="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + ' font-medium text-slate-900">' + escapeHtml(r.name || '') + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(trig) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600">' + escapeHtml(r.action_type || '') + '</td>' +
        '<td class="' + CLS_TD + '">' + chHtml + '</td>' +
        '<td class="' + CLS_TD + '"><button type="button" class="' + toggleCls + '" data-toggle-id="' + escapeHtml(r.id) + '" data-next="' + (r.is_active ? '0' : '1') + '">' + (r.is_active ? 'פעיל' : 'כבוי') + '</button></td>' +
        '<td class="' + CLS_TD + ' text-end"><button type="button" class="' + CLS_LINK_BTN + '" data-edit-id="' + escapeHtml(r.id) + '">עריכה</button></td>' +
        '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';

    wrap.querySelectorAll('button[data-edit-id]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var row = _rules.find(function (r) { return r.id === b.getAttribute('data-edit-id'); });
        if (row) openRuleModal(row);
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

  // Extract unique base-slug + name pairs from the loaded templates cache.
  // crm_message_templates.slug is fully composed (e.g. event_registration_open_sms_he);
  // the engine dispatches via base slug. We derive base = slug minus `_{channel}_{lang}`.
  function baseSlugsFromTemplates() {
    var tpls = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
    var seen = {};
    tpls.forEach(function (t) {
      if (!t || !t.slug) return;
      var sfx = '_' + (t.channel || '') + '_' + (t.language || 'he');
      var base = (t.slug.slice(-sfx.length) === sfx) ? t.slug.slice(0, -sfx.length) : t.slug;
      if (!seen[base]) seen[base] = { base: base, name: t.name || base };
    });
    return Object.keys(seen).sort().map(function (k) { return seen[k]; });
  }

  function openRuleModal(existing) {
    var isNew = !existing;
    var row = existing || { name: '', trigger_entity: 'event', trigger_event: 'status_change', trigger_condition: { type: 'always' }, action_type: 'send_message', action_config: { template_slug: '', channels: [], recipient_type: 'trigger_lead' }, sort_order: 0, is_active: true };
    var cfg = row.action_config || {};
    var chs = Array.isArray(cfg.channels) ? cfg.channels : [];
    var title = isNew ? 'כלל אוטומציה חדש' : 'עריכת כלל';
    var currentTrigger = lookupTriggerTypeKey(row.trigger_entity, row.trigger_event) || 'event_status_change';
    var cond = row.trigger_condition || {};
    var condType = cond.type || 'always';

    var triggerOpts = Object.keys(TRIGGER_TYPES).map(function (k) {
      return '<option value="' + k + '"' + (k === currentTrigger ? ' selected' : '') + '>' + escapeHtml(TRIGGER_TYPES[k].label) + '</option>';
    }).join('');
    var condOpts = Object.keys(CONDITION_TYPES).map(function (k) {
      return '<option value="' + k + '"' + (k === condType ? ' selected' : '') + '>' + escapeHtml(CONDITION_TYPES[k]) + '</option>';
    }).join('');
    var recipOpts = Object.keys(RECIPIENT_TYPES).map(function (k) {
      return '<option value="' + k + '"' + (k === cfg.recipient_type ? ' selected' : '') + '>' + escapeHtml(RECIPIENT_TYPES[k]) + '</option>';
    }).join('');
    var bases = baseSlugsFromTemplates();
    var tplOpts = '<option value="">(בחר תבנית)</option>' + bases.map(function (b) {
      return '<option value="' + escapeHtml(b.base) + '"' + (cfg.template_slug === b.base ? ' selected' : '') + '>' + escapeHtml(b.name) + ' — ' + escapeHtml(b.base) + '</option>';
    }).join('');
    var chBoxes = ['sms', 'whatsapp', 'email'].map(function (c) {
      var chk = chs.indexOf(c) !== -1 ? ' checked' : '';
      return '<label class="inline-flex items-center gap-1.5 me-4 cursor-pointer"><input type="checkbox" name="rule-channel" value="' + c + '"' + chk + ' class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"> <span class="text-sm">' + CHANNEL_LABELS[c] + '</span></label>';
    }).join('');
    var savedFilter = Array.isArray(cfg.recipient_status_filter) ? cfg.recipient_status_filter : [];
    var filterBoxes = TIER2_FILTER_STATUSES.map(function (s) {
      var chk = savedFilter.indexOf(s.slug) !== -1 ? ' checked' : '';
      return '<label class="flex items-center gap-1.5 py-0.5 cursor-pointer"><input type="checkbox" name="rule-status-filter" value="' + s.slug + '"' + chk + ' class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"> <span class="text-sm">' + escapeHtml(s.label) + '</span></label>';
    }).join('');
    var filterHidden = recipientTypeUsesStatusFilter(cfg.recipient_type) ? '' : ' hidden';
    var condValue = cond.status || cond.source || '';
    var condNum = (cond.value != null) ? cond.value : '';
    var condOp = cond.operator || '>';
    var condField = cond.field || 'attendee_count';

    var content =
      '<div class="mb-3"><label class="' + CLS_LABEL + '">שם כלל *</label><input type="text" id="rule-name" value="' + escapeHtml(row.name) + '" required class="' + CLS_INPUT + '"></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">טריגר *</label><select id="rule-trigger" class="' + CLS_INPUT + '">' + triggerOpts + '</select></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">תנאי *</label><select id="rule-cond-type" class="' + CLS_INPUT + '">' + condOpts + '</select>' +
        '<div id="rule-cond-fields" class="mt-2">' +
          '<input type="text" id="rule-cond-value" placeholder="ערך (למשל: registered, waiting_list, supersale_form)" value="' + escapeHtml(condValue) + '" class="' + CLS_INPUT + '' + (condType !== 'status_equals' && condType !== 'source_equals' ? ' hidden' : '') + '">' +
          '<div id="rule-cond-count" class="grid grid-cols-3 gap-2' + (condType !== 'count_threshold' ? ' hidden' : '') + '">' +
            '<input type="text" id="rule-cond-field" placeholder="שדה" value="' + escapeHtml(condField) + '" class="' + CLS_INPUT + '">' +
            '<select id="rule-cond-op" class="' + CLS_INPUT + '">' +
              ['>','>=','=','<','<='].map(function (o) { return '<option' + (o === condOp ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select>' +
            '<input type="number" id="rule-cond-num" placeholder="ערך" value="' + escapeHtml(String(condNum)) + '" class="' + CLS_INPUT + '">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">תבנית הודעה (slug בסיסי) *</label><select id="rule-tpl" class="' + CLS_INPUT + '">' + tplOpts + '</select></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">ערוצים *</label><div>' + chBoxes + '</div></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">נמענים *</label><select id="rule-recipient" class="' + CLS_INPUT + '">' + recipOpts + '</select></div>' +
      '<div id="rule-status-filter-block" class="mb-3' + filterHidden + '">' +
        '<label class="' + CLS_LABEL + '">סינון לפי סטטוס (אופציונלי)</label>' +
        '<div class="border border-slate-200 rounded-lg p-2 bg-slate-50">' + filterBoxes + '</div>' +
        '<div class="text-xs text-slate-500 mt-1">אם לא מסומן דבר — יישלח לכל הסטטוסים בקבוצה.</div>' +
      '</div>';

    Modal.form({
      title: title, size: 'md', content: content,
      onSubmit: function (formEl) {
        var data = readForm(formEl);
        var err = validate(data);
        if (err) { toast('error', err); return; }
        save(row.id, data, isNew);
      }
    });

    // Reveal/hide conditional field blocks based on the condition-type select.
    setTimeout(function () {
      var sel = document.querySelector('#rule-cond-type');
      if (sel) {
        sel.addEventListener('change', function () {
          var type = sel.value;
          var vEl = document.querySelector('#rule-cond-value');
          var cEl = document.querySelector('#rule-cond-count');
          if (vEl) vEl.classList.toggle('hidden', type !== 'status_equals' && type !== 'source_equals');
          if (cEl) cEl.classList.toggle('hidden', type !== 'count_threshold');
        });
      }
      // P21: show/hide status-filter block when recipient_type changes.
      var recSel = document.querySelector('#rule-recipient');
      var fBlk = document.querySelector('#rule-status-filter-block');
      if (recSel && fBlk) {
        recSel.addEventListener('change', function () {
          fBlk.classList.toggle('hidden', !recipientTypeUsesStatusFilter(recSel.value));
        });
      }
    }, 50);
  }

  function readForm(el) {
    var chs = [];
    el.querySelectorAll('input[name="rule-channel"]:checked').forEach(function (cb) { chs.push(cb.value); });
    var triggerKey = el.querySelector('#rule-trigger').value;
    var trig = TRIGGER_TYPES[triggerKey] || TRIGGER_TYPES.event_status_change;
    var condType = el.querySelector('#rule-cond-type').value || 'always';
    var cond = { type: condType };
    if (condType === 'status_equals') cond.status = (el.querySelector('#rule-cond-value').value || '').trim();
    else if (condType === 'source_equals') cond.source = (el.querySelector('#rule-cond-value').value || '').trim();
    else if (condType === 'count_threshold') {
      cond.field = (el.querySelector('#rule-cond-field').value || '').trim();
      cond.operator = el.querySelector('#rule-cond-op').value;
      cond.value = Number(el.querySelector('#rule-cond-num').value) || 0;
    }
    var recipientType = el.querySelector('#rule-recipient').value;
    var actionConfig = {
      template_slug: (el.querySelector('#rule-tpl').value || '').trim(),
      channels: chs,
      recipient_type: recipientType
    };
    if (recipientTypeUsesStatusFilter(recipientType)) {
      var picked = [];
      el.querySelectorAll('input[name="rule-status-filter"]:checked').forEach(function (cb) { picked.push(cb.value); });
      if (picked.length) actionConfig.recipient_status_filter = picked;
    }
    return {
      name: (el.querySelector('#rule-name').value || '').trim(),
      trigger_entity: trig.entity,
      trigger_event: trig.event,
      trigger_condition: cond,
      action_type: 'send_message',
      action_config: actionConfig
    };
  }

  function validate(d) {
    if (!d.name) return 'שם כלל חובה';
    if (!d.action_config.template_slug) return 'בחר תבנית';
    if (!d.action_config.channels.length) return 'בחר לפחות ערוץ אחד';
    if (!d.action_config.recipient_type) return 'בחר סוג נמענים';
    return null;
  }

  async function save(id, data, isNew) {
    var tid = getTenantId();
    try {
      if (isNew) {
        var ins = await sb.from('crm_automation_rules').insert({ tenant_id: tid, name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event, trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config, is_active: true }).select('id').single();
        if (ins.error) throw new Error(ins.error.message);
        logWrite('crm.rule.create', ins.data.id, { name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event });
        toast('success', 'הכלל נוצר');
      } else {
        var upd = await sb.from('crm_automation_rules').update({ name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event, trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config }).eq('id', id).eq('tenant_id', tid);
        if (upd.error) throw new Error(upd.error.message);
        logWrite('crm.rule.update', id, { name: data.name });
        toast('success', 'הכלל עודכן');
      }
      await loadRules(true);
      renderTable();
    } catch (e) {
      toast('error', 'שמירה נכשלה: ' + (e.message || String(e)));
    }
  }

  async function toggleActive(id, nextActive) {
    var tid = getTenantId();
    var upd = await sb.from('crm_automation_rules').update({ is_active: !!nextActive }).eq('id', id).eq('tenant_id', tid);
    if (upd.error) { toast('error', 'כשל'); return false; }
    logWrite('crm.rule.toggle', id, { is_active: !!nextActive });
    var row = _rules.find(function (r) { return r.id === id; });
    if (row) row.is_active = !!nextActive;
    return true;
  }
})();
