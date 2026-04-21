/* =============================================================================
   crm-messaging-rules.js — Automation Rules (B8 Tailwind — FINAL-04)
   Table: crm_automation_rules
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var CHANNEL_CLASSES = { sms: 'bg-sky-500', whatsapp: 'bg-emerald-500', email: 'bg-amber-500' };
  var ENTITY_LABELS = { lead: 'ליד', event: 'אירוע', attendee: 'משתתף' };
  var EVENT_LABELS = { created: 'נוצר', updated: 'עודכן', status_change: 'שינוי סטטוס' };

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
      '<div class="bg-amber-50 border-s-4 border-amber-500 text-amber-900 rounded-lg p-3 mb-4 text-sm">' +
        '⚠️ כללי אוטומטיה נשמרים אך עדיין לא פועלים אוטומטית. הפעלה אוטומטית תתווסף בשלב הבא.' +
      '</div>' +
      '<div class="flex items-center justify-between mb-4">' +
        '<h3 class="text-lg font-bold text-slate-800 m-0">כללי אוטומטיה</h3>' +
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
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין כללי אוטומטיה עדיין.</div>';
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
      var trig = (ENTITY_LABELS[r.trigger_entity] || r.trigger_entity) + ' · ' + (EVENT_LABELS[r.trigger_event] || r.trigger_event);
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

  function openRuleModal(existing) {
    var isNew = !existing;
    var row = existing || { name: '', trigger_entity: 'lead', trigger_event: 'status_change', trigger_condition: {}, action_type: 'send_message', action_config: { template_id: null, channels: [], delay_minutes: 0 }, sort_order: 0, is_active: true };
    var cfg = row.action_config || {};
    var chs = Array.isArray(cfg.channels) ? cfg.channels : [];
    var title = isNew ? 'כלל אוטומטיה חדש' : 'עריכת כלל';

    var templates = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
    var tplOptions = '<option value="">(ללא תבנית)</option>' + templates.map(function (t) {
      return '<option value="' + escapeHtml(t.id) + '"' + (cfg.template_id === t.id ? ' selected' : '') + '>' + escapeHtml(t.name) + '</option>';
    }).join('');

    var entOpts = Object.keys(ENTITY_LABELS).map(function (k) {
      return '<option value="' + k + '"' + (k === row.trigger_entity ? ' selected' : '') + '>' + ENTITY_LABELS[k] + '</option>';
    }).join('');
    var evOpts = Object.keys(EVENT_LABELS).map(function (k) {
      return '<option value="' + k + '"' + (k === row.trigger_event ? ' selected' : '') + '>' + EVENT_LABELS[k] + '</option>';
    }).join('');
    var chBoxes = ['sms', 'whatsapp', 'email'].map(function (c) {
      var chk = chs.indexOf(c) !== -1 ? ' checked' : '';
      return '<label class="inline-flex items-center gap-1.5 me-4 cursor-pointer"><input type="checkbox" name="rule-channel" value="' + c + '"' + chk + ' class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"> <span class="text-sm">' + CHANNEL_LABELS[c] + '</span></label>';
    }).join('');

    var content =
      '<div class="mb-3"><label class="' + CLS_LABEL + '">שם כלל *</label><input type="text" id="rule-name" value="' + escapeHtml(row.name) + '" required class="' + CLS_INPUT + '"></div>' +
      '<div class="grid grid-cols-2 gap-3 mb-3">' +
        '<div><label class="' + CLS_LABEL + '">ישות *</label><select id="rule-entity" class="' + CLS_INPUT + '">' + entOpts + '</select></div>' +
        '<div><label class="' + CLS_LABEL + '">אירוע *</label><select id="rule-event" class="' + CLS_INPUT + '">' + evOpts + '</select></div>' +
      '</div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">תנאים נוספים (JSON)</label><textarea id="rule-cond" rows="3" placeholder="{}" class="' + CLS_INPUT + ' font-mono text-xs" style="direction:ltr">' + escapeHtml(JSON.stringify(row.trigger_condition || {}, null, 2)) + '</textarea></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">תבנית</label><select id="rule-tpl" class="' + CLS_INPUT + '">' + tplOptions + '</select></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">ערוצים</label><div>' + chBoxes + '</div></div>' +
      '<div class="mb-3"><label class="' + CLS_LABEL + '">השהיה (דקות אחרי הטריגר)</label><input type="number" id="rule-delay" min="0" value="' + Number(cfg.delay_minutes || 0) + '" class="' + CLS_INPUT + '"></div>';

    Modal.form({
      title: title, size: 'md', content: content,
      onSubmit: function (formEl) {
        var data = readForm(formEl);
        var err = validate(data);
        if (err) { toast('error', err); return; }
        save(row.id, data, isNew);
      }
    });
  }

  function readForm(el) {
    var chs = [];
    el.querySelectorAll('input[name="rule-channel"]:checked').forEach(function (cb) { chs.push(cb.value); });
    var condRaw = (el.querySelector('#rule-cond').value || '').trim();
    var cond = {};
    if (condRaw) { try { cond = JSON.parse(condRaw); } catch (_) { cond = null; } }
    return {
      name: (el.querySelector('#rule-name').value || '').trim(),
      trigger_entity: el.querySelector('#rule-entity').value,
      trigger_event: el.querySelector('#rule-event').value,
      trigger_condition: cond,
      action_type: 'send_message',
      action_config: {
        template_id: el.querySelector('#rule-tpl').value || null,
        channels: chs,
        delay_minutes: parseInt(el.querySelector('#rule-delay').value, 10) || 0
      }
    };
  }

  function validate(d) {
    if (!d.name) return 'שם כלל חובה';
    if (!d.trigger_condition) return 'JSON תנאים לא תקין';
    if (!d.action_config.channels.length) return 'בחר לפחות ערוץ אחד';
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
