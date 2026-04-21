/* =============================================================================
   crm-messaging-broadcast.js — Manual Broadcast (5-step wizard) + Message Log
   Tables: crm_broadcasts, crm_message_log, crm_leads (read), crm_events (read)
   B7: wizard modal with wizard-progress + wizard-dot + wizard-step,
       message-log table with status-chip pills (sent/delivered/read/failed).
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var STATUS_LABELS  = { sent: 'נשלח', pending: 'בתור', failed: 'נכשל', delivered: 'הגיע', read: 'נקרא' };
  var PAGE_SIZE = 50;
  var WIZARD_STEPS = [
    { key: 'recipients', label: 'נמענים' },
    { key: 'channel',    label: 'ערוץ' },
    { key: 'template',   label: 'תבנית' },
    { key: 'timing',     label: 'תזמון' },
    { key: 'confirm',    label: 'אישור' }
  ];

  var _events = [];
  var _logRows = [];
  var _logPage = 1;
  var _wizard = null;

  function toast(t, m) { if (window.Toast && Toast[t]) Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }
  function logWrite(a, et, eid, meta) {
    if (window.ActivityLog && ActivityLog.write) { try { ActivityLog.write({ action: a, entity_type: et, entity_id: eid, severity: 'info', metadata: meta || {} }); } catch (_) {} }
  }

  /* ----------------------------------- BROADCAST (wizard) ----------------------------------- */

  async function renderMessagingBroadcast(host) {
    if (!host) return;
    host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">טוען...</div>';
    try { await ensureCrmStatusCache(); await loadEventsOnce(); renderBroadcastIntro(host); }
    catch (e) { host.innerHTML = '<div class="crm-detail-empty" style="color:#ef4444">' + escapeHtml(e.message || String(e)) + '</div>'; }
  }
  window.renderMessagingBroadcast = renderMessagingBroadcast;

  async function loadEventsOnce() {
    if (_events.length) return;
    var tid = getTenantId();
    var q = sb.from('crm_events').select('id, event_number, name, event_date').eq('is_deleted', false);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('event_date', { ascending: false });
    var res = await q;
    if (res.error) throw new Error(res.error.message);
    _events = res.data || [];
  }

  function renderBroadcastIntro(host) {
    host.innerHTML =
      '<h3 style="color:var(--crm-text-primary);margin:0 0 10px">שליחה ידנית</h3>' +
      '<p style="color:var(--crm-text-muted)">אשף שליחה בן 5 שלבים: בחירת נמענים, ערוץ, תבנית, תזמון, אישור.</p>' +
      '<button type="button" class="crm-btn crm-btn-primary" id="open-wizard">+ שליחה חדשה</button>' +
      '<div id="bc-history" style="margin-top:20px"></div>';
    var btn = host.querySelector('#open-wizard');
    if (btn) btn.addEventListener('click', openWizard);
    // Also render log underneath as a preview (B7 §2.25)
    renderMessagingLog(host.querySelector('#bc-history'));
  }

  function openWizard() {
    _wizard = { step: 0, status: '', event: '', language: '', channel: 'whatsapp', templateId: '', body: '', name: '', schedule: 'now', recipients: 0 };
    var modal = Modal.show({ title: 'אשף שליחה', size: 'lg', content: wizardHtml() });
    var root = modal.el.querySelector('.modal-body');
    if (root) { wireWizard(root); }
  }

  // ---- wizard-progress + 5 wizard-step panels ----
  function wizardHtml() {
    var dots = '<div class="crm-wizard-progress">' +
      WIZARD_STEPS.map(function (s, i) {
        var cls = 'crm-wizard-dot' + (i === _wizard.step ? ' active' : (i < _wizard.step ? ' done' : ''));
        return '<div class="' + cls + '" data-wiz-dot="' + i + '">' + (i + 1) + '</div>';
      }).join('') +
    '</div>';
    var steps = WIZARD_STEPS.map(function (s, i) {
      var cls = 'crm-wizard-step' + (i === _wizard.step ? ' active' : '');
      return '<div class="' + cls + '" data-wiz-step="' + s.key + '">' + wizardStepBody(s.key) + '</div>';
    }).join('');
    var nav = '<div class="crm-modal-footer">' +
      '<button type="button" class="crm-btn crm-btn-secondary" id="wiz-back"' + (_wizard.step === 0 ? ' disabled' : '') + '>‹ חזור</button>' +
      '<button type="button" class="crm-btn crm-btn-primary" id="wiz-next">' + (_wizard.step === WIZARD_STEPS.length - 1 ? 'שלח' : 'הבא ›') + '</button>' +
    '</div>';
    return dots + steps + nav;
  }

  function wizardStepBody(key) {
    if (key === 'recipients') {
      var statuses = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
      var stOpts = '<option value="">(כל הסטטוסים)</option>' + Object.keys(statuses).map(function (slug) { return '<option value="' + escapeHtml(slug) + '"' + (slug === _wizard.status ? ' selected' : '') + '>' + escapeHtml(statuses[slug].name_he || slug) + '</option>'; }).join('');
      var evOpts = '<option value="">(כל האירועים)</option>' + _events.map(function (e) { return '<option value="' + escapeHtml(e.id) + '"' + (e.id === _wizard.event ? ' selected' : '') + '>#' + e.event_number + ' ' + escapeHtml(e.name || '') + '</option>'; }).join('');
      return '<h4>שלב 1 — נמענים</h4>' +
        '<div class="crm-form-row"><label>סטטוס</label><select id="wiz-status">' + stOpts + '</select></div>' +
        '<div class="crm-form-row"><label>אירוע</label><select id="wiz-event">' + evOpts + '</select></div>' +
        '<div class="crm-form-row"><label>שפה</label><select id="wiz-lang"><option value="">הכל</option><option value="he">עברית</option><option value="ru">רוסית</option><option value="en">אנגלית</option></select></div>' +
        '<div id="wiz-count" style="padding:10px;background:var(--crm-accent-light);color:var(--crm-accent);border-radius:6px;font-weight:700">מחשב...</div>';
    }
    if (key === 'channel') {
      return '<h4>שלב 2 — ערוץ</h4>' +
        ['whatsapp','sms','email'].map(function (c) { return '<label style="display:inline-flex;align-items:center;gap:6px;margin:8px 14px 8px 0"><input type="radio" name="wiz-channel" value="' + c + '"' + (c === _wizard.channel ? ' checked' : '') + '> ' + CHANNEL_LABELS[c] + '</label>'; }).join('');
    }
    if (key === 'template') {
      var tpls = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
      var opts = tpls.filter(function (t) { return t.is_active; }).map(function (t) { return '<label style="display:block;padding:6px"><input type="radio" name="wiz-tpl" value="' + escapeHtml(t.id) + '"' + (t.id === _wizard.templateId ? ' checked' : '') + '> ' + escapeHtml(t.name) + ' (' + escapeHtml(CHANNEL_LABELS[t.channel] || t.channel) + ')</label>'; }).join('');
      return '<h4>שלב 3 — תבנית</h4>' + (opts || '<div class="crm-detail-empty">אין תבניות פעילות</div>') +
        '<div class="crm-form-row"><label>תוכן</label><textarea id="wiz-body" rows="4" placeholder="תוכן הודעה ידני (או בחר תבנית)">' + escapeHtml(_wizard.body) + '</textarea></div>';
    }
    if (key === 'timing') {
      return '<h4>שלב 4 — תזמון</h4>' +
        '<label style="display:block;margin:8px 0"><input type="radio" name="wiz-sched" value="now"' + (_wizard.schedule === 'now' ? ' checked' : '') + '> שלח עכשיו</label>' +
        '<label style="display:block;margin:8px 0"><input type="radio" name="wiz-sched" value="later"' + (_wizard.schedule === 'later' ? ' checked' : '') + '> מתוזמן (לא נשמר ב-B7)</label>' +
        '<div class="crm-form-row"><label>שם שליחה</label><input type="text" id="wiz-name" value="' + escapeHtml(_wizard.name) + '" placeholder="לדוגמה: תזכורת לאירוע 25"></div>';
    }
    if (key === 'confirm') {
      return '<h4>שלב 5 — אישור</h4>' +
        '<div class="crm-form-row"><strong>נמענים:</strong> ' + _wizard.recipients + '</div>' +
        '<div class="crm-form-row"><strong>ערוץ:</strong> ' + (CHANNEL_LABELS[_wizard.channel] || _wizard.channel) + '</div>' +
        '<div class="crm-form-row"><strong>תבנית:</strong> ' + (_wizard.templateId ? 'נבחרה' : 'חופשי') + '</div>' +
        '<div class="crm-form-row"><strong>תזמון:</strong> ' + (_wizard.schedule === 'now' ? 'מיידי' : 'מתוזמן') + '</div>' +
        '<div class="crm-form-row"><strong>שם:</strong> ' + escapeHtml(_wizard.name || '—') + '</div>' +
        '<div class="crm-detail-note">לחץ "שלח" כדי ליצור broadcast ו־log rows.</div>';
    }
    return '';
  }

  function wireWizard(root) {
    root.querySelectorAll('[data-wiz-dot]').forEach(function (d) {
      d.addEventListener('click', function () { captureStep(root); _wizard.step = Number(d.getAttribute('data-wiz-dot')); rerenderWizard(root); });
    });
    var back = root.querySelector('#wiz-back'), next = root.querySelector('#wiz-next');
    if (back) back.addEventListener('click', function () { captureStep(root); if (_wizard.step > 0) _wizard.step--; rerenderWizard(root); });
    if (next) next.addEventListener('click', function () {
      captureStep(root);
      if (_wizard.step < WIZARD_STEPS.length - 1) { _wizard.step++; rerenderWizard(root); }
      else { doWizardSend(); }
    });
    if (_wizard.step === 0) refreshRecipientCount(root);
    var tplInputs = root.querySelectorAll('input[name="wiz-tpl"]');
    tplInputs.forEach(function (i) {
      i.addEventListener('change', function () {
        var tpls = window._crmMessagingTemplates ? window._crmMessagingTemplates() : [];
        var t = tpls.find(function (x) { return x.id === i.value; });
        if (t) {
          var bodyEl = root.querySelector('#wiz-body');
          if (bodyEl && !bodyEl.value) bodyEl.value = t.body || '';
          _wizard.channel = t.channel;
        }
      });
    });
  }

  function captureStep(root) {
    var statusSel = root.querySelector('#wiz-status'); if (statusSel) _wizard.status = statusSel.value || '';
    var evSel = root.querySelector('#wiz-event');     if (evSel)     _wizard.event    = evSel.value || '';
    var langSel = root.querySelector('#wiz-lang');    if (langSel)   _wizard.language = langSel.value || '';
    var chRadio = root.querySelector('input[name="wiz-channel"]:checked'); if (chRadio) _wizard.channel = chRadio.value;
    var tplRadio = root.querySelector('input[name="wiz-tpl"]:checked');   if (tplRadio) _wizard.templateId = tplRadio.value;
    var bodyEl = root.querySelector('#wiz-body'); if (bodyEl) _wizard.body = bodyEl.value || '';
    var schRadio = root.querySelector('input[name="wiz-sched"]:checked'); if (schRadio) _wizard.schedule = schRadio.value;
    var nameEl = root.querySelector('#wiz-name'); if (nameEl) _wizard.name = nameEl.value || '';
  }

  function rerenderWizard(root) { root.innerHTML = wizardHtml(); wireWizard(root); }

  async function refreshRecipientCount(root) {
    try {
      var ids = await buildLeadIds();
      _wizard.recipients = ids.length;
      var el = root.querySelector('#wiz-count');
      if (el) el.textContent = 'נמצאו ' + ids.length + ' נמענים';
    } catch (e) {
      var el2 = root.querySelector('#wiz-count');
      if (el2) el2.textContent = 'שגיאה: ' + (e.message || e);
    }
  }

  async function buildLeadIds() {
    var tid = getTenantId();
    var q = sb.from('crm_leads').select('id').eq('is_deleted', false).is('unsubscribed_at', null);
    if (tid) q = q.eq('tenant_id', tid);
    if (_wizard.status) q = q.eq('status', _wizard.status);
    if (_wizard.language) q = q.eq('language', _wizard.language);
    if (_wizard.event) {
      var att = sb.from('crm_event_attendees').select('lead_id').eq('event_id', _wizard.event).eq('is_deleted', false);
      if (tid) att = att.eq('tenant_id', tid);
      var r = await att;
      if (r.error) throw new Error(r.error.message);
      var ids = (r.data || []).map(function (x) { return x.lead_id; }).filter(Boolean);
      if (!ids.length) return [];
      q = q.in('id', ids);
    }
    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return (res.data || []).map(function (r) { return r.id; });
  }

  async function doWizardSend() {
    if (!_wizard.name) { toast('error', 'שם שליחה חובה'); _wizard.step = 3; return; }
    if (!_wizard.body) { toast('error', 'תוכן הודעה חובה'); _wizard.step = 2; return; }
    var leadIds = await buildLeadIds();
    if (!leadIds.length) { toast('warning', 'אין נמענים'); return; }
    var tid = getTenantId();
    try {
      var ins = await sb.from('crm_broadcasts').insert({
        tenant_id: tid, name: _wizard.name, channel: _wizard.channel, template_id: _wizard.templateId || null,
        filter_criteria: { status: _wizard.status || null, event: _wizard.event || null, language: _wizard.language || null },
        total_recipients: leadIds.length, total_sent: leadIds.length, total_failed: 0, status: 'queued'
      }).select('id').single();
      if (ins.error) throw new Error(ins.error.message);
      logWrite('crm.broadcast.send', 'crm_broadcast', ins.data.id, { name: _wizard.name, recipients: leadIds.length });
      var logRows = leadIds.map(function (id) { return { tenant_id: tid, lead_id: id, template_id: _wizard.templateId || null, broadcast_id: ins.data.id, channel: _wizard.channel, content: _wizard.body, status: 'queued' }; });
      var logRes = await sb.from('crm_message_log').insert(logRows);
      if (logRes.error) throw new Error(logRes.error.message);
      toast('success', 'נשלחו ' + leadIds.length + ' הודעות');
      if (typeof Modal.close === 'function') Modal.close();
      loadLog().then(renderLogTable);
    } catch (e) { toast('error', 'שגיאה: ' + (e.message || e)); }
  }

  /* ----------------------------------- LOG (status-chip + message-log) ----------------------------------- */

  async function renderMessagingLog(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="crm-message-log-wrap">' +
        '<h4 style="margin:0 0 10px">היסטוריה</h4>' +
        '<div class="crm-filter-bar">' +
          '<select id="log-channel"><option value="">כל הערוצים</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">אימייל</option></select>' +
          '<select id="log-status"><option value="">כל הסטטוסים</option><option value="sent">נשלח</option><option value="delivered">הגיע</option><option value="read">נקרא</option><option value="failed">נכשל</option></select>' +
        '</div>' +
        '<div id="log-table" class="crm-table-wrap"></div>' +
        '<div id="log-pagination" class="crm-pagination"></div>' +
      '</div>';
    ['log-channel','log-status'].forEach(function (id) {
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', function () { _logPage = 1; loadLog().then(renderLogTable); });
    });
    await loadLog();
    renderLogTable();
  }
  window.renderMessagingLog = renderMessagingLog;
  window.loadMessagingLog = function () { return loadLog().then(renderLogTable); };

  async function loadLog() {
    var tid = getTenantId();
    var ch = (document.getElementById('log-channel') || {}).value || '';
    var st = (document.getElementById('log-status')  || {}).value || '';
    var q = sb.from('crm_message_log').select('id, lead_id, channel, content, status, created_at');
    if (tid) q = q.eq('tenant_id', tid);
    if (ch) q = q.eq('channel', ch);
    if (st) q = q.eq('status', st);
    q = q.order('created_at', { ascending: false }).limit(300);
    var res = await q;
    _logRows = res.error ? [] : (res.data || []);
  }

  function renderLogTable() {
    var wrap = document.getElementById('log-table');
    if (!wrap) return;
    if (!_logRows.length) { wrap.innerHTML = '<div class="crm-detail-empty" style="padding:16px">אין הודעות</div>'; return; }
    var start = (_logPage - 1) * PAGE_SIZE;
    var rows = _logRows.slice(start, start + PAGE_SIZE);
    var html = '<table class="crm-table"><thead><tr><th>תאריך</th><th>ערוץ</th><th>סטטוס</th><th>תוכן</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr class="readonly">' +
        '<td>' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</td>' +
        '<td>' + escapeHtml(CHANNEL_LABELS[r.channel] || r.channel) + '</td>' +
        '<td><span class="crm-status-chip ' + escapeHtml(r.status) + '">' + escapeHtml(STATUS_LABELS[r.status] || r.status) + '</span></td>' +
        '<td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml((r.content || '').slice(0, 80)) + '</td>' +
      '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
    renderLogPagination();
  }

  function renderLogPagination() {
    var box = document.getElementById('log-pagination');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(_logRows.length / PAGE_SIZE));
    if (pages <= 1) { box.innerHTML = '<span class="crm-page-info">סה"כ ' + _logRows.length + '</span>'; return; }
    var html = '<button ' + (_logPage === 1 ? 'disabled' : '') + ' data-lp="prev">›</button>';
    for (var i = 1; i <= pages; i++) html += '<button data-lp="' + i + '"' + (i === _logPage ? ' class="active"' : '') + '>' + i + '</button>';
    html += '<button ' + (_logPage === pages ? 'disabled' : '') + ' data-lp="next">‹</button>';
    box.innerHTML = html;
    box.querySelectorAll('[data-lp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-lp');
        if (v === 'prev') _logPage = Math.max(1, _logPage - 1);
        else if (v === 'next') _logPage = Math.min(pages, _logPage + 1);
        else _logPage = parseInt(v, 10) || 1;
        renderLogTable();
      });
    });
  }
})();
