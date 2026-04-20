/* =============================================================================
   crm-messaging-rules.js — Automation Rules CRUD
   Table: crm_automation_rules
   Depends on: shared.js (sb, getTenantId, escapeHtml), CrmHelpers, Modal,
               window._crmMessagingTemplates() from crm-messaging-templates.js
   Exports:
     window.renderMessagingRules(host) — sub-tab: כללי אוטומציה
     window.loadMessagingRules()       — public refresher
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC' };
  var CHANNEL_COLORS = { sms: '#3b82f6', whatsapp: '#10b981', email: '#f59e0b' };
  var ENTITY_LABELS = { lead: '\u05DC\u05D9\u05D3', event: '\u05D0\u05D9\u05E8\u05D5\u05E2', attendee: '\u05DE\u05E9\u05EA\u05EA\u05E3' };
  var EVENT_LABELS = { created: '\u05E0\u05D5\u05E6\u05E8', updated: '\u05E2\u05D5\u05D3\u05DB\u05DF', status_change: '\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D8\u05D8\u05D5\u05E1' };

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
      '<div style="padding:10px 14px;margin-bottom:12px;background:#fef3c7;border-inline-start:4px solid var(--warn);border-radius:6px;color:var(--g700);font-size:.9rem">' +
        '\u26A0\uFE0F \u05DB\u05DC\u05DC\u05D9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05D0\u05DA \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E4\u05D5\u05E2\u05DC\u05D9\u05DD \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA. \u05D4\u05E4\u05E2\u05DC\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05EA\u05EA\u05D5\u05D5\u05E1\u05E3 \u05D1\u05E9\u05DC\u05D1 \u05D4\u05D1\u05D0.' +
      '</div>' +
      '<div class="crm-filter-bar">' +
        '<h3 style="flex:1;color:var(--primary);margin:0">\u05DB\u05DC\u05DC\u05D9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D4</h3>' +
        '<button type="button" class="btn btn-primary" id="btn-new-rule">+ \u05DB\u05DC\u05DC \u05D7\u05D3\u05E9</button>' +
      '</div>' +
      '<div id="crm-rules-table" class="crm-table-wrap"><div class="crm-detail-empty" style="padding:20px">\u05D8\u05D5\u05E2\u05DF...</div></div>';

    var btn = host.querySelector('#btn-new-rule');
    if (btn) btn.addEventListener('click', function () { openRuleModal(null); });

    loadRules().then(renderTable).catch(function (e) {
      var wrap = host.querySelector('#crm-rules-table');
      if (wrap) wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingRules = renderMessagingRules;

  function renderTable() {
    var wrap = document.getElementById('crm-rules-table');
    if (!wrap) return;
    if (!_rules.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">\u05D0\u05D9\u05DF \u05DB\u05DC\u05DC\u05D9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D4 \u05E2\u05D3\u05D9\u05D9\u05DF.</div>';
      return;
    }
    var html = '<table class="crm-table"><thead><tr>' +
      '<th>\u05E9\u05DD</th><th>\u05D8\u05E8\u05D9\u05D2\u05E8</th><th>\u05E4\u05E2\u05D5\u05DC\u05D4</th><th>\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD</th><th>\u05E4\u05E2\u05D9\u05DC</th><th style="text-align:end">\u05E4\u05E2\u05D5\u05DC\u05D4</th>' +
      '</tr></thead><tbody>';
    _rules.forEach(function (r) {
      var trig = (ENTITY_LABELS[r.trigger_entity] || r.trigger_entity) + ' \u00B7 ' + (EVENT_LABELS[r.trigger_event] || r.trigger_event);
      var cfg = r.action_config || {};
      var chs = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : []);
      var chHtml = chs.map(function (c) {
        return '<span class="crm-badge" style="background:' + (CHANNEL_COLORS[c] || '#6b7280') + ';margin-inline-end:4px">' + escapeHtml(CHANNEL_LABELS[c] || c) + '</span>';
      }).join('') || '<span style="color:var(--g400)">\u2014</span>';
      html += '<tr data-rule-id="' + escapeHtml(r.id) + '">' +
        '<td>' + escapeHtml(r.name || '') + '</td>' +
        '<td>' + escapeHtml(trig) + '</td>' +
        '<td>' + escapeHtml(r.action_type || '') + '</td>' +
        '<td>' + chHtml + '</td>' +
        '<td><button type="button" class="crm-toggle' + (r.is_active ? ' on' : '') + '" data-toggle-id="' + escapeHtml(r.id) + '" data-next="' + (r.is_active ? '0' : '1') + '">' + (r.is_active ? '\u05E4\u05E2\u05D9\u05DC' : '\u05DB\u05D1\u05D5\u05D9') + '</button></td>' +
        '<td style="text-align:end"><button type="button" class="crm-link-btn" data-edit-id="' + escapeHtml(r.id) + '">\u05E2\u05E8\u05D9\u05DB\u05D4</button></td>' +
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
    var title = isNew ? '\u05DB\u05DC\u05DC \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D4 \u05D7\u05D3\u05E9' : '\u05E2\u05E8\u05D9\u05DB\u05EA \u05DB\u05DC\u05DC';

    var templates = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
    var tplOptions = '<option value="">(\u05DC\u05DC\u05D0 \u05EA\u05D1\u05E0\u05D9\u05EA)</option>' + templates.map(function (t) {
      var sel = (cfg.template_id === t.id) ? ' selected' : '';
      return '<option value="' + escapeHtml(t.id) + '"' + sel + '>' + escapeHtml(t.name) + '</option>';
    }).join('');

    var entOpts = Object.keys(ENTITY_LABELS).map(function (k) {
      return '<option value="' + k + '"' + (k === row.trigger_entity ? ' selected' : '') + '>' + ENTITY_LABELS[k] + '</option>';
    }).join('');
    var evOpts = Object.keys(EVENT_LABELS).map(function (k) {
      return '<option value="' + k + '"' + (k === row.trigger_event ? ' selected' : '') + '>' + EVENT_LABELS[k] + '</option>';
    }).join('');
    var chBoxes = ['sms', 'whatsapp', 'email'].map(function (c) {
      var chk = chs.indexOf(c) !== -1 ? ' checked' : '';
      return '<label style="margin-inline-end:14px;font-weight:400"><input type="checkbox" name="rule-channel" value="' + c + '"' + chk + '> ' + CHANNEL_LABELS[c] + '</label>';
    }).join('');

    var content =
      '<div class="crm-form-row"><label>\u05E9\u05DD \u05DB\u05DC\u05DC *</label><input type="text" id="rule-name" value="' + escapeHtml(row.name) + '" required></div>' +
      '<div class="crm-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div><label>\u05D9\u05E9\u05D5\u05EA *</label><select id="rule-entity">' + entOpts + '</select></div>' +
        '<div><label>\u05D0\u05D9\u05E8\u05D5\u05E2 *</label><select id="rule-event">' + evOpts + '</select></div>' +
      '</div>' +
      '<div class="crm-form-row"><label>\u05EA\u05E0\u05D0\u05D9\u05DD \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD (JSON)</label><textarea id="rule-cond" rows="3" placeholder=\'{}\'>' + escapeHtml(JSON.stringify(row.trigger_condition || {}, null, 2)) + '</textarea></div>' +
      '<div class="crm-form-row"><label>\u05EA\u05D1\u05E0\u05D9\u05EA</label><select id="rule-tpl">' + tplOptions + '</select></div>' +
      '<div class="crm-form-row"><label>\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD</label><div>' + chBoxes + '</div></div>' +
      '<div class="crm-form-row"><label>\u05D4\u05E9\u05D4\u05D9\u05D4 (\u05D3\u05E7\u05D5\u05EA \u05D0\u05D7\u05E8\u05D9 \u05D4\u05D8\u05E8\u05D9\u05D2\u05E8)</label><input type="number" id="rule-delay" min="0" value="' + Number(cfg.delay_minutes || 0) + '"></div>';

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
    if (!d.name) return '\u05E9\u05DD \u05DB\u05DC\u05DC \u05D7\u05D5\u05D1\u05D4';
    if (!d.trigger_condition) return 'JSON \u05EA\u05E0\u05D0\u05D9\u05DD \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF';
    if (!d.action_config.channels.length) return '\u05D1\u05D7\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05E2\u05E8\u05D5\u05E5 \u05D0\u05D7\u05D3';
    return null;
  }

  async function save(id, data, isNew) {
    var tid = getTenantId();
    try {
      if (isNew) {
        var ins = await sb.from('crm_automation_rules').insert({ tenant_id: tid, name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event, trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config, is_active: true }).select('id').single();
        if (ins.error) throw new Error(ins.error.message);
        logWrite('crm.rule.create', ins.data.id, { name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event });
        toast('success', '\u05D4\u05DB\u05DC\u05DC \u05E0\u05D5\u05E6\u05E8');
      } else {
        var upd = await sb.from('crm_automation_rules').update({ name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event, trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config }).eq('id', id).eq('tenant_id', tid);
        if (upd.error) throw new Error(upd.error.message);
        logWrite('crm.rule.update', id, { name: data.name });
        toast('success', '\u05D4\u05DB\u05DC\u05DC \u05E2\u05D5\u05D3\u05DB\u05DF');
      }
      await loadRules(true);
      renderTable();
    } catch (e) {
      toast('error', '\u05E9\u05DE\u05D9\u05E8\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4: ' + (e.message || String(e)));
    }
  }

  async function toggleActive(id, nextActive) {
    var tid = getTenantId();
    var upd = await sb.from('crm_automation_rules').update({ is_active: !!nextActive }).eq('id', id).eq('tenant_id', tid);
    if (upd.error) { toast('error', '\u05DB\u05E9\u05DC'); return false; }
    logWrite('crm.rule.toggle', id, { is_active: !!nextActive });
    var row = _rules.find(function (r) { return r.id === id; });
    if (row) row.is_active = !!nextActive;
    return true;
  }
})();
