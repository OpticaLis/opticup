/* crm-messaging-rules.js — Automation Rules orchestrator
   (CRM_UX_REDESIGN_AUTOMATION). Owns rules-list + table + pill bar; the
   editor is delegated to window.CrmRuleEditor (crm-rule-editor.js).
   Backward-compat: window.{renderMessagingRules, loadMessagingRules}
   preserve unchanged signatures. */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var CHANNEL_CLASSES = { sms: 'bg-sky-500', whatsapp: 'bg-emerald-500', email: 'bg-amber-500' };

  var BOARD_META = {
    incoming:  { icon: '📥', label: 'לידים נכנסים',     color: 'orange',  entity: 'lead',     event: 'created'       },
    tier2:     { icon: '👥', label: 'רשומים',           color: 'blue',    entity: 'lead',     event: 'status_change' },
    events:    { icon: '📅', label: 'אירועים',          color: 'violet',  entity: 'event',    event: 'status_change' },
    attendees: { icon: '✅', label: 'נרשמים לאירוע',    color: 'emerald', entity: 'attendee', event: 'created'       }
  };
  var BOARD_KEYS = ['incoming','tier2','events','attendees'];
  function boardOf(entity, ev) { for (var k in BOARD_META) { if (BOARD_META[k].entity === entity && BOARD_META[k].event === ev) return k; } return null; }

  var CLS_TABLE      = 'w-full text-sm bg-white';
  var CLS_TH         = 'px-4 py-3 text-start font-semibold text-slate-700 bg-slate-50';
  var CLS_TD         = 'px-4 py-3 text-slate-800';
  var CLS_ROW        = 'border-b border-slate-100 cursor-pointer hover:bg-slate-50';
  var CLS_BTN_P      = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-sm';
  var CLS_LINK_BTN   = 'text-sm text-indigo-600 font-medium hover:text-indigo-800 hover:underline';
  var CLS_TOGGLE_OFF = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
  var CLS_TOGGLE_ON  = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition';

  var _rules = [];
  var _loadPromise = null;
  var _pillFilter = 'all';

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

  function rulesForPill(pill) {
    if (pill === 'all') return _rules.filter(function (r) { return r.is_active; });
    var meta = BOARD_META[pill]; if (!meta) return [];
    return _rules.filter(function (r) { return r.is_active && r.trigger_entity === meta.entity && r.trigger_event === meta.event; });
  }

  function renderPillBar(host) {
    var counts = { all: _rules.filter(function (r) { return r.is_active; }).length };
    BOARD_KEYS.forEach(function (k) { counts[k] = rulesForPill(k).length; });
    var allActive = _pillFilter === 'all';
    var html = '<div class="flex items-center gap-2 flex-wrap mb-3">' +
      '<button type="button" data-pill="all" class="px-3 py-1.5 rounded-full text-xs font-semibold transition ' +
        (allActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300') + '">הכל (' + counts.all + ')</button>';
    BOARD_KEYS.forEach(function (k) {
      var b = BOARD_META[k]; var on = _pillFilter === k;
      var bg = on ? ('bg-' + b.color + '-100 border-2 border-' + b.color + '-500 text-' + b.color + '-800 shadow-sm') : ('bg-' + b.color + '-50 border border-' + b.color + '-200 text-' + b.color + '-700 hover:border-' + b.color + '-400');
      html += '<button type="button" data-pill="' + k + '" class="' + bg + ' px-3 py-1.5 rounded-full text-xs font-semibold transition">' + b.icon + ' ' + escapeHtml(b.label) + ' (' + counts[k] + ')</button>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-pill]').forEach(function (b) {
      b.addEventListener('click', function () { _pillFilter = b.getAttribute('data-pill'); renderPillBar(host); renderTable(); });
    });
  }

  function renderMessagingRules(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="flex items-center justify-between mb-3">' +
        '<h3 class="text-lg font-bold text-slate-800 m-0">כללי אוטומציה</h3>' +
        '<button type="button" class="' + CLS_BTN_P + '" id="btn-new-rule">+ חוק חדש</button>' +
      '</div>' +
      '<div id="crm-rules-pillbar"></div>' +
      '<div id="crm-rules-table" class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">' +
        '<div class="text-center text-slate-400 py-8">טוען...</div>' +
      '</div>';
    var btn = host.querySelector('#btn-new-rule');
    if (btn) btn.addEventListener('click', function () { openRuleModal(null); });
    loadRules().then(function () {
      renderPillBar(host.querySelector('#crm-rules-pillbar'));
      renderTable();
    }).catch(function (e) {
      var wrap = host.querySelector('#crm-rules-table');
      if (wrap) wrap.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">' + escapeHtml(e.message || String(e)) + '</div>';
    });
  }
  window.renderMessagingRules = renderMessagingRules;

  function boardChip(entity, ev) {
    var k = boardOf(entity, ev); if (!k) return '<span class="text-slate-400 text-xs">—</span>';
    var b = BOARD_META[k];
    return '<span class="bg-' + b.color + '-100 text-' + b.color + '-700 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">' + b.icon + ' ' + escapeHtml(b.label) + '</span>';
  }

  function triggerLabel(r) {
    var k = boardOf(r.trigger_entity, r.trigger_event);
    if (!k) return r.trigger_entity + ' · ' + r.trigger_event;
    var cond = r.trigger_condition || {};
    if (cond.type === 'always') return 'תמיד';
    if (cond.type === 'status_equals') return 'סטטוס = ' + (cond.status || '?');
    if (cond.type === 'source_equals') return 'מקור = ' + (cond.source || '?');
    if (cond.type === 'count_threshold') return (cond.field || '?') + ' ' + (cond.operator || '?') + ' ' + (cond.value || 0);
    return '—';
  }

  function renderTable() {
    var wrap = document.getElementById('crm-rules-table');
    if (!wrap) return;
    var rows = rulesForPill(_pillFilter);
    if (!rows.length) {
      wrap.innerHTML = '<div class="text-center text-slate-400 py-8">אין חוקים בבורד הזה.</div>';
      return;
    }
    var html = '<table class="' + CLS_TABLE + '"><thead><tr>' +
      '<th class="' + CLS_TH + '">שם</th>' +
      '<th class="' + CLS_TH + '">בורד</th>' +
      '<th class="' + CLS_TH + '">טריגר</th>' +
      '<th class="' + CLS_TH + '">תבנית</th>' +
      '<th class="' + CLS_TH + '">ערוצים</th>' +
      '<th class="' + CLS_TH + '">פעיל</th>' +
      '<th class="' + CLS_TH + ' text-end">פעולה</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var cfg = r.action_config || {};
      var chs = Array.isArray(cfg.channels) ? cfg.channels : (cfg.channel ? [cfg.channel] : []);
      var chHtml = chs.map(function (c) {
        return '<span class="inline-block text-xs text-white font-semibold px-2 py-0.5 rounded-full me-1 ' + (CHANNEL_CLASSES[c] || 'bg-slate-500') + '">' + escapeHtml(CHANNEL_LABELS[c] || c) + '</span>';
      }).join('') || '<span class="text-slate-400 text-xs">—</span>';
      var toggleCls = r.is_active ? CLS_TOGGLE_ON : CLS_TOGGLE_OFF;
      html += '<tr class="' + CLS_ROW + '" data-rule-id="' + escapeHtml(r.id) + '">' +
        '<td class="' + CLS_TD + ' font-medium text-slate-900">' + escapeHtml(r.name || '') + '</td>' +
        '<td class="' + CLS_TD + '">' + boardChip(r.trigger_entity, r.trigger_event) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600 text-xs">' + escapeHtml(triggerLabel(r)) + '</td>' +
        '<td class="' + CLS_TD + ' text-slate-600 text-xs">' + escapeHtml((cfg.template_slug || '—')) + '</td>' +
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
        if (ok) { var r = _rules.find(function (rr) { return rr.id === id; }); if (r) r.is_active = !!next; renderPillBar(document.getElementById('crm-rules-pillbar')); renderTable(); }
      });
    });
  }

  function openRuleModal(existing) {
    if (!window.CrmRuleEditor || typeof CrmRuleEditor.open !== 'function') {
      toast('error', 'עורך חוקים לא נטען');
      return;
    }
    CrmRuleEditor.open(existing, {
      onSave: function (data, isNew) { save(existing ? existing.id : null, data, isNew); },
      onCancel: function () {}
    });
  }

  async function save(id, data, isNew) {
    var tid = getTenantId();
    try {
      if (isNew) {
        var ins = await sb.from('crm_automation_rules').insert({
          tenant_id: tid, name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event,
          trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config, is_active: true
        }).select('id').single();
        if (ins.error) throw new Error(ins.error.message);
        logWrite('crm.rule.create', ins.data.id, { name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event });
        toast('success', 'הכלל נוצר');
      } else {
        var upd = await sb.from('crm_automation_rules').update({
          name: data.name, trigger_entity: data.trigger_entity, trigger_event: data.trigger_event,
          trigger_condition: data.trigger_condition, action_type: data.action_type, action_config: data.action_config
        }).eq('id', id).eq('tenant_id', tid);
        if (upd.error) throw new Error(upd.error.message);
        logWrite('crm.rule.update', id, { name: data.name });
        toast('success', 'הכלל עודכן');
      }
      await loadRules(true);
      renderPillBar(document.getElementById('crm-rules-pillbar'));
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
    return true;
  }
})();
