/* crm-rule-editor.js — board-led rule editor for Automation Rules screen
   (CRM_UX_REDESIGN_AUTOMATION). Public API: window.CrmRuleEditor.{open,
   _boardOf, _summaryFor, BOARDS}. Consumed by crm-messaging-rules.js. */
(function () {
  'use strict';

  var BOARDS = {
    incoming:  { key: 'incoming',  icon: '📥', label: 'לידים נכנסים',     color: 'orange',  entity: 'lead',     event: 'created'       },
    tier2:     { key: 'tier2',     icon: '👥', label: 'רשומים',           color: 'blue',    entity: 'lead',     event: 'status_change' },
    events:    { key: 'events',    icon: '📅', label: 'אירועים',          color: 'violet',  entity: 'event',    event: 'status_change' },
    attendees: { key: 'attendees', icon: '✅', label: 'נרשמים לאירוע',    color: 'emerald', entity: 'attendee', event: 'created'       }
  };
  var BOARD_KEYS = ['incoming','tier2','events','attendees'];

  var COND_BY_BOARD = {
    incoming:  [['always','תמיד (כל ליד חדש)'], ['source_equals','מקור הליד שווה ל-']],
    tier2:     [['status_equals','סטטוס ליד משתנה ל-']],
    events:    [['status_equals','סטטוס אירוע משתנה ל-'], ['count_threshold','ספירה עוברת סף']],
    attendees: [['status_equals','סטטוס הרשמה הוא']]
  };

  var RECIP_BY_BOARD = {
    incoming:  [['trigger_lead','הליד שהפעיל את החוק']],
    tier2:     [['trigger_lead','הליד שהפעיל את החוק']],
    events:    [['tier2','כל Tier 2 (כל הרשומים)'],['tier2_excl_registered','Tier 2 חוץ מהנרשמים לאירוע'],['attendees','נרשמים לאירוע'],['attendees_waiting','רשימת המתנה'],['attendees_all_statuses','כל המשתתפים'],['leads_by_status','לידים לפי סטטוס']],
    attendees: [['trigger_lead','הליד שהפעיל את החוק']]
  };

  var STATUSES_BY_BOARD = {
    events:    [['registration_open','נפתחה הרשמה'],['invite_new','הזמנה לחדשים'],['invite_waiting_list','הזמנה ממתינים'],['will_open_tomorrow','ייפתח מחר'],['2_3d_before','2-3 ימים לפני'],['event_day','יום אירוע'],['closed','אירוע נסגר'],['completed','אירוע הושלם'],['waiting_list','רשימת המתנה']],
    tier2:     [['waiting','ממתין לאירוע'],['invited','הוזמן'],['confirmed','אישר הגעה'],['confirmed_verified','אומת']],
    attendees: [['registered','נרשם'],['waiting_list','רשימת המתנה'],['confirmed','אישר'],['attended','הגיע'],['no_show','לא הגיע'],['purchased','רכש']]
  };

  var TIER2_FILTERS = [
    ['waiting','ממתין לאירוע'],['invited','הוזמן'],['confirmed','אישר הגעה'],['confirmed_verified','אומת']
  ];

  var CHANNELS = [['sms','SMS','sky'],['whatsapp','WhatsApp','emerald'],['email','אימייל','amber']];

  var BOARD_TPL_PREFIX = { incoming: ['lead_intake_'], tier2: ['lead_intake_'], events: ['event_'], attendees: ['event_'] };

  function _esc(s) { return window.escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }

  function _boardOf(entity, ev) {
    for (var k in BOARDS) { if (BOARDS[k].entity === entity && BOARDS[k].event === ev) return k; }
    return null;
  }

  function _baseSlugsFromTemplates() {
    var tpls = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
    var seen = {};
    tpls.forEach(function (t) {
      if (!t || !t.slug) return;
      var sfx = '_' + (t.channel || '') + '_' + (t.language || 'he');
      var base = (t.slug.slice(-sfx.length) === sfx) ? t.slug.slice(0, -sfx.length) : t.slug;
      if (!seen[base]) seen[base] = { base: base, name: (t.name || base).replace(/\s*[—-]\s*(SMS|Email|אימייל|WhatsApp)\s*$/i,'').trim() };
    });
    return Object.keys(seen).sort().map(function (k) { return seen[k]; });
  }

  function _filterTemplatesByBoard(boardKey) {
    var prefixes = BOARD_TPL_PREFIX[boardKey] || [];
    return _baseSlugsFromTemplates().filter(function (t) { return prefixes.some(function (p) { return t.base.indexOf(p) === 0; }); });
  }

  function _summaryFor(s) {
    if (!s.boardKey) return '';
    var b = BOARDS[s.boardKey];
    var chList = (s.channels || []).map(function (c) { return ({ sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' })[c] || c; });
    var chTxt = chList.length ? chList.join(' + ') : '<em>(לא נבחר ערוץ)</em>';
    var tplTxt = s.templateSlug ? _esc(s.templateSlug) : '<em>(לא נבחרה תבנית)</em>';
    var recipMap = {}; (RECIP_BY_BOARD[s.boardKey] || []).forEach(function (r) { recipMap[r[0]] = r[1]; });
    var recipTxt = recipMap[s.recipientType] || s.recipientType || '<em>(נמענים)</em>';
    if (s.recipientStatusFilter && s.recipientStatusFilter.length) {
      recipTxt += ' (סינון סטטוסים: ' + _esc(s.recipientStatusFilter.join(', ')) + ')';
    }
    var trig;
    if (s.boardKey === 'incoming') {
      trig = (s.conditionType === 'source_equals') ? ('בכל ליד חדש שמקורו <strong>' + _esc(s.conditionValue || '?') + '</strong>') : 'בכל ליד חדש';
    } else if (s.boardKey === 'tier2') {
      trig = 'כשסטטוס הליד משתנה ל-<strong>' + _esc(s.conditionValue || '?') + '</strong>';
    } else if (s.boardKey === 'events') {
      if (s.conditionType === 'count_threshold') trig = 'כשספירת ' + _esc(s.countField || '?') + ' ' + _esc(s.countOp || '?') + ' ' + _esc(String(s.countNum || 0));
      else trig = 'כשסטטוס האירוע משתנה ל-<strong>' + _esc(s.conditionValue || '?') + '</strong>';
    } else if (s.boardKey === 'attendees') {
      trig = 'כשמישהו נרשם לאירוע עם סטטוס <strong>' + _esc(s.conditionValue || '?') + '</strong>';
    }
    return trig + ', יישלח <strong>' + chTxt + '</strong> מהתבנית "' + tplTxt + '" ל-<strong>' + _esc(recipTxt).replace('&lt;em&gt;','<em>').replace('&lt;/em&gt;','</em>') + '</strong>.';
  }

  function _renderBoardPicker(activeKey) {
    return BOARD_KEYS.map(function (k) {
      var b = BOARDS[k];
      var active = activeKey === k;
      var bg = active ? ('bg-' + b.color + '-100 border-2 border-' + b.color + '-500 shadow-md') : ('bg-' + b.color + '-50 border-2 border-' + b.color + '-200 hover:border-' + b.color + '-400');
      return '<button type="button" class="' + bg + ' rounded-xl p-3 text-center transition" data-board-pick="' + k + '">' +
        '<div class="text-2xl mb-1">' + b.icon + '</div>' +
        '<div class="font-bold text-' + b.color + '-900 text-sm">' + _esc(b.label) + '</div>' +
        (active ? '<div class="text-[10px] text-' + b.color + '-700 mt-0.5">✓ נבחר</div>' : '') +
      '</button>';
    }).join('');
  }

  function open(existing, callbacks) {
    callbacks = callbacks || {};
    var s = _stateFromRow(existing);
    var content = _renderShell(s);
    Modal.form({
      title: existing ? 'עריכת חוק אוטומציה' : 'חוק אוטומציה חדש',
      size: 'lg', content: content,
      onSubmit: function (formEl) {
        _readForm(formEl, s);
        var err = _validate(s);
        if (err) { if (window.Toast && Toast.error) Toast.error(err); return; }
        var data = _buildSaveData(s, existing);
        if (callbacks.onSave) callbacks.onSave(data, !existing);
      }
    });
    setTimeout(function () { _wire(s, callbacks); }, 50);
  }

  function _stateFromRow(row) {
    if (!row) return { isNew: true, name: '', boardKey: null, conditionType: 'always', conditionValue: '', countField: 'attendee_count', countOp: '>', countNum: 0, templateSlug: '', channels: [], recipientType: '', recipientStatusFilter: [], _origActionConfig: null };
    var cfg = row.action_config || {};
    var cond = row.trigger_condition || {};
    return {
      isNew: false, ruleId: row.id, name: row.name || '',
      boardKey: _boardOf(row.trigger_entity, row.trigger_event),
      conditionType: cond.type || 'always',
      conditionValue: cond.status || cond.source || '',
      countField: cond.field || 'attendee_count', countOp: cond.operator || '>', countNum: cond.value || 0,
      templateSlug: cfg.template_slug || '',
      channels: Array.isArray(cfg.channels) ? cfg.channels.slice() : [],
      recipientType: cfg.recipient_type || '',
      recipientStatusFilter: Array.isArray(cfg.recipient_status_filter) ? cfg.recipient_status_filter.slice() : [],
      _origActionConfig: cfg
    };
  }

  function _renderShell(s) {
    var nameRow = '<div class="mb-3"><label class="block text-sm font-medium text-slate-700 mb-1">שם תיאורי לחוק *</label><input type="text" id="rule-name" value="' + _esc(s.name) + '" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>';
    var boardRow = '<div class="mb-3"><label class="block text-sm font-medium text-slate-700 mb-2">איזה בורד מפעיל את החוק? *</label><div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="rule-board-picker">' + _renderBoardPicker(s.boardKey) + '</div></div>';
    var condBlock = '<div id="rule-cond-block" class="' + (s.boardKey ? '' : 'hidden ') + 'rounded-xl p-4 mb-3 border ' + (s.boardKey ? ('bg-' + BOARDS[s.boardKey].color + '-50 border-' + BOARDS[s.boardKey].color + '-200') : '') + '"></div>';
    var tplRow = '<div class="mb-3"><label class="block text-sm font-medium text-slate-700 mb-1">תבנית הודעה *</label><select id="rule-tpl" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></select><div class="text-xs text-slate-500 mt-1">סוננו אוטומטית רק תבניות שמתאימות לבורד.</div></div>';
    var chRow = '<div class="mb-3"><label class="block text-sm font-medium text-slate-700 mb-1">ערוצים *</label><div class="flex gap-3 flex-wrap" id="rule-channels"></div></div>';
    var sumRow = '<div id="rule-summary" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm ' + (s.boardKey ? '' : 'hidden') + '"><div class="font-semibold text-emerald-900 mb-1">📋 סיכום בעברית</div><div class="text-emerald-800" id="rule-summary-text"></div></div>';
    return nameRow + boardRow + condBlock + tplRow + chRow + sumRow;
  }

  function _renderCondBlock(s) {
    if (!s.boardKey) return '';
    var color = BOARDS[s.boardKey].color;
    var condOpts = (COND_BY_BOARD[s.boardKey] || []).map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === s.conditionType ? ' selected' : '') + '>' + _esc(c[1]) + '</option>'; }).join('');
    var statusOpts = (STATUSES_BY_BOARD[s.boardKey] || []).map(function (st) { return '<option value="' + st[0] + '"' + (st[0] === s.conditionValue ? ' selected' : '') + '>' + _esc(st[1]) + ' (' + st[0] + ')</option>'; }).join('');
    var recipOpts = (RECIP_BY_BOARD[s.boardKey] || []).map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === s.recipientType ? ' selected' : '') + '>' + _esc(r[1]) + '</option>'; }).join('');
    var statusVisible = (s.conditionType === 'status_equals') ? '' : 'hidden';
    var sourceVisible = (s.conditionType === 'source_equals') ? '' : 'hidden';
    var countVisible = (s.conditionType === 'count_threshold') ? '' : 'hidden';
    var tier2FilterVisible = (s.recipientType === 'tier2' || s.recipientType === 'tier2_excl_registered') ? '' : 'hidden';
    var tier2Boxes = TIER2_FILTERS.map(function (f) {
      var chk = s.recipientStatusFilter.indexOf(f[0]) !== -1 ? ' checked' : '';
      return '<label class="inline-flex items-center gap-1.5 me-3 text-xs cursor-pointer"><input type="checkbox" name="rule-status-filter" value="' + f[0] + '"' + chk + '> <span>' + _esc(f[1]) + '</span></label>';
    }).join('');
    return '<div class="text-xs text-' + color + '-700 font-semibold flex items-center gap-2 mb-2"><span>' + BOARDS[s.boardKey].icon + '</span><span>הגדרות בורד ' + _esc(BOARDS[s.boardKey].label) + '</span></div>' +
      '<div class="space-y-3">' +
        '<div><label class="block text-sm font-medium text-slate-700 mb-1">מתי החוק יופעל?</label><select id="rule-cond-type" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">' + condOpts + '</select></div>' +
        '<div id="rule-cond-status" class="' + statusVisible + '"><label class="block text-sm font-medium text-slate-700 mb-1">לאיזה סטטוס?</label><select id="rule-cond-status-val" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">' + statusOpts + '</select></div>' +
        '<div id="rule-cond-source" class="' + sourceVisible + '"><label class="block text-sm font-medium text-slate-700 mb-1">מקור הליד</label><input type="text" id="rule-cond-source-val" value="' + _esc(s.conditionValue) + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>' +
        '<div id="rule-cond-count" class="' + countVisible + ' grid grid-cols-3 gap-2"><input type="text" id="rule-cond-field" placeholder="שדה" value="' + _esc(s.countField) + '" class="px-3 py-2 border border-slate-300 rounded-lg text-sm"><select id="rule-cond-op" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">' + ['>','>=','=','<','<='].map(function (o) { return '<option' + (o === s.countOp ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select><input type="number" id="rule-cond-num" placeholder="ערך" value="' + _esc(String(s.countNum)) + '" class="px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>' +
        '<div><label class="block text-sm font-medium text-slate-700 mb-1">למי לשלוח?</label><select id="rule-recipient" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">' + recipOpts + '</select></div>' +
        '<div id="rule-tier2-filter" class="' + tier2FilterVisible + ' bg-white border border-slate-200 rounded p-2"><div class="text-xs text-slate-500 font-semibold mb-1">סינון לפי סטטוס ליד (אופציונלי)</div>' + tier2Boxes + '</div>' +
      '</div>';
  }

  function _renderChannels(s) {
    return CHANNELS.map(function (c) {
      var checked = s.channels.indexOf(c[0]) !== -1;
      var bg = checked ? ('bg-' + c[2] + '-50 border-2 border-' + c[2] + '-300') : 'bg-slate-50 border-2 border-slate-200';
      var txt = checked ? ('text-' + c[2] + '-700') : 'text-slate-600';
      return '<label class="' + bg + ' inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"><input type="checkbox" name="rule-channel" value="' + c[0] + '"' + (checked ? ' checked' : '') + '> <span class="text-sm font-semibold ' + txt + '">' + _esc(c[1]) + '</span></label>';
    }).join('');
  }

  function _renderTemplateOptions(s) {
    var bases = s.boardKey ? _filterTemplatesByBoard(s.boardKey) : [];
    return '<option value="">(בחר תבנית)</option>' + bases.map(function (b) { return '<option value="' + _esc(b.base) + '"' + (s.templateSlug === b.base ? ' selected' : '') + '>' + _esc(b.name) + ' — ' + _esc(b.base) + '</option>'; }).join('');
  }

  function _wire(s, callbacks) {
    function rerenderCond() { var blk = document.querySelector('#rule-cond-block'); if (!blk) return; blk.innerHTML = _renderCondBlock(s); blk.className = (s.boardKey ? '' : 'hidden ') + 'rounded-xl p-4 mb-3 border ' + (s.boardKey ? ('bg-' + BOARDS[s.boardKey].color + '-50 border-' + BOARDS[s.boardKey].color + '-200') : ''); wireCondBlockListeners(); }
    function rerenderTpl() { var sel = document.querySelector('#rule-tpl'); if (sel) sel.innerHTML = _renderTemplateOptions(s); }
    function rerenderChannels() { var host = document.querySelector('#rule-channels'); if (host) { host.innerHTML = _renderChannels(s); wireChannelListeners(); } }
    function rerenderBoards() { var host = document.querySelector('#rule-board-picker'); if (host) { host.innerHTML = _renderBoardPicker(s.boardKey); wireBoardListeners(); } }
    function refreshSummary() { var box = document.querySelector('#rule-summary'), txt = document.querySelector('#rule-summary-text'); if (!box || !txt) return; if (!s.boardKey) { box.classList.add('hidden'); return; } box.classList.remove('hidden'); txt.innerHTML = _summaryFor(s); }

    function applyBoardSwitch(nextKey) {
      if (s.boardKey && s.boardKey !== nextKey) {
        s.conditionType = (COND_BY_BOARD[nextKey] || [['always']])[0][0];
        s.conditionValue = ''; s.templateSlug = ''; s.channels = []; s.recipientType = (RECIP_BY_BOARD[nextKey] || [['']])[0][0]; s.recipientStatusFilter = [];
      } else if (!s.boardKey) {
        s.conditionType = (COND_BY_BOARD[nextKey] || [['always']])[0][0];
        s.recipientType = (RECIP_BY_BOARD[nextKey] || [['']])[0][0];
      }
      s.boardKey = nextKey;
      rerenderBoards(); rerenderCond(); rerenderTpl(); rerenderChannels(); refreshSummary();
    }
    function wireBoardListeners() {
      document.querySelectorAll('[data-board-pick]').forEach(function (b) {
        b.addEventListener('click', function () {
          var nextKey = b.getAttribute('data-board-pick');
          if (s.boardKey && s.boardKey !== nextKey) {
            if (window.Modal && Modal.confirm) { Modal.confirm({ title: 'שינוי בורד', message: 'שינוי בורד יאפס את התנאים, להמשיך?', confirmText: 'אישור', cancelText: 'ביטול', onConfirm: function () { applyBoardSwitch(nextKey); } }); return; }
            if (!window.confirm('שינוי בורד יאפס את התנאים, להמשיך?')) return;
          }
          applyBoardSwitch(nextKey);
        });
      });
    }
    function wireCondBlockListeners() {
      var ct = document.querySelector('#rule-cond-type');
      if (ct) ct.addEventListener('change', function () { s.conditionType = ct.value; s.conditionValue = ''; rerenderCond(); refreshSummary(); });
      var sv = document.querySelector('#rule-cond-status-val');
      if (sv) sv.addEventListener('change', function () { s.conditionValue = sv.value; refreshSummary(); });
      var srcv = document.querySelector('#rule-cond-source-val');
      if (srcv) srcv.addEventListener('input', function () { s.conditionValue = srcv.value; refreshSummary(); });
      var cf = document.querySelector('#rule-cond-field'); if (cf) cf.addEventListener('input', function () { s.countField = cf.value; refreshSummary(); });
      var co = document.querySelector('#rule-cond-op');    if (co) co.addEventListener('change', function () { s.countOp = co.value; refreshSummary(); });
      var cn = document.querySelector('#rule-cond-num');   if (cn) cn.addEventListener('input', function () { s.countNum = Number(cn.value) || 0; refreshSummary(); });
      var rs = document.querySelector('#rule-recipient');
      if (rs) rs.addEventListener('change', function () { s.recipientType = rs.value; var f = document.querySelector('#rule-tier2-filter'); if (f) f.classList.toggle('hidden', !(s.recipientType === 'tier2' || s.recipientType === 'tier2_excl_registered')); refreshSummary(); });
      document.querySelectorAll('input[name="rule-status-filter"]').forEach(function (cb) {
        cb.addEventListener('change', function () { s.recipientStatusFilter = Array.from(document.querySelectorAll('input[name="rule-status-filter"]:checked')).map(function (x) { return x.value; }); refreshSummary(); });
      });
    }
    function wireChannelListeners() {
      document.querySelectorAll('input[name="rule-channel"]').forEach(function (cb) {
        cb.addEventListener('change', function () { s.channels = Array.from(document.querySelectorAll('input[name="rule-channel"]:checked')).map(function (x) { return x.value; }); rerenderChannels(); refreshSummary(); });
      });
    }
    var nameEl = document.querySelector('#rule-name');
    if (nameEl) nameEl.addEventListener('input', function () { s.name = nameEl.value; refreshSummary(); });
    var tplSel = document.querySelector('#rule-tpl');
    if (tplSel) { tplSel.innerHTML = _renderTemplateOptions(s); tplSel.addEventListener('change', function () { s.templateSlug = tplSel.value; refreshSummary(); }); }
    rerenderChannels(); wireBoardListeners();
    if (s.boardKey) { rerenderCond(); refreshSummary(); }
  }

  function _readForm(formEl, s) {
    s.name = (document.querySelector('#rule-name') || {}).value || s.name;
    var tpl = document.querySelector('#rule-tpl'); if (tpl) s.templateSlug = tpl.value || '';
  }

  function _validate(s) {
    if (!s.name || !s.name.trim()) return 'שם חוק חובה';
    if (!s.boardKey) return 'יש לבחור בורד';
    if (!s.templateSlug) return 'יש לבחור תבנית';
    if (!s.channels.length) return 'יש לבחור לפחות ערוץ אחד';
    if (!s.recipientType) return 'יש לבחור סוג נמענים';
    if ((s.conditionType === 'status_equals' || s.conditionType === 'source_equals') && !s.conditionValue) return 'יש להזין ערך לתנאי';
    return null;
  }

  function _buildSaveData(s, existing) {
    var b = BOARDS[s.boardKey];
    var cond = { type: s.conditionType };
    if (s.conditionType === 'status_equals') cond.status = s.conditionValue;
    else if (s.conditionType === 'source_equals') cond.source = s.conditionValue;
    else if (s.conditionType === 'count_threshold') { cond.field = s.countField; cond.operator = s.countOp; cond.value = s.countNum; }
    var actionConfig = Object.assign({}, s._origActionConfig || {}, { template_slug: s.templateSlug, channels: s.channels.slice(), recipient_type: s.recipientType });
    if (s.recipientType === 'tier2' || s.recipientType === 'tier2_excl_registered') {
      if (s.recipientStatusFilter && s.recipientStatusFilter.length) actionConfig.recipient_status_filter = s.recipientStatusFilter.slice();
      else delete actionConfig.recipient_status_filter;
    } else { delete actionConfig.recipient_status_filter; }
    return { name: s.name.trim(), trigger_entity: b.entity, trigger_event: b.event, trigger_condition: cond, action_type: 'send_message', action_config: actionConfig };
  }

  window.CrmRuleEditor = { open: open, _boardOf: _boardOf, _summaryFor: _summaryFor, BOARDS: BOARDS };
})();
