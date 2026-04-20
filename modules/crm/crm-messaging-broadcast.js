/* =============================================================================
   crm-messaging-broadcast.js — Manual Broadcast + Message Log
   Tables: crm_broadcasts, crm_message_log, crm_leads (read), crm_events (read)
   Depends on: shared.js (sb, getTenantId, escapeHtml), CrmHelpers, Modal
   Exports:
     window.renderMessagingBroadcast(host) — sub-tab: שליחה ידנית
     window.renderMessagingLog(host)       — sub-tab: היסטוריה
     window.loadMessagingLog()             — public refresher
   ============================================================================= */
(function () {
  'use strict';

  var CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp', email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC' };
  var CHANNEL_COLORS = { sms: '#3b82f6', whatsapp: '#10b981', email: '#f59e0b' };
  var STATUS_LABELS = { sent: '\u05E0\u05E9\u05DC\u05D7', pending: '\u05D1\u05EA\u05D5\u05E8', failed: '\u05E0\u05DB\u05E9\u05DC', delivered: '\u05D4\u05D2\u05D9\u05E2' };
  var PAGE_SIZE = 50;

  var _events = [];
  var _logRows = [];
  var _logPage = 1;

  function logWrite(action, et, eid, meta) {
    if (window.ActivityLog && typeof ActivityLog.write === 'function') {
      try { ActivityLog.write({ action: action, entity_type: et, entity_id: eid, severity: 'info', metadata: meta || {} }); } catch (_) {}
    }
  }
  function toast(t, m) { if (window.Toast && typeof Toast[t] === 'function') Toast[t](m); else if (window.Toast && Toast.show) Toast.show(m); }

  /* ----------------------------------- BROADCAST ----------------------------------- */

  async function renderMessagingBroadcast(host) {
    if (!host) return;
    host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">\u05D8\u05D5\u05E2\u05DF...</div>';
    try { await ensureCrmStatusCache(); await loadEventsOnce(); renderBroadcastUI(host); }
    catch (e) { host.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">' + escapeHtml(e.message || String(e)) + '</div>'; }
  }
  window.renderMessagingBroadcast = renderMessagingBroadcast;

  async function loadEventsOnce() {
    if (_events.length) return;
    var tid = getTenantId();
    var q = sb.from('crm_events').select('id, event_number, name, event_date').eq('is_deleted', false);
    if (tid) q = q.eq('tenant_id', tid);
    q = q.order('event_date', { ascending: false });
    var res = await q;
    if (res.error) throw new Error('events load failed: ' + res.error.message);
    _events = res.data || [];
  }

  function renderBroadcastUI(host) {
    var statuses = (window.CRM_STATUSES && window.CRM_STATUSES.lead) || {};
    var stOpts = '<option value="">(\u05DB\u05DC \u05D4\u05E1\u05D8\u05D8\u05D5\u05E1\u05D9\u05DD)</option>' + Object.keys(statuses).map(function (slug) { return '<option value="' + escapeHtml(slug) + '">' + escapeHtml(statuses[slug].name_he || slug) + '</option>'; }).join('');
    var evOpts = '<option value="">(\u05DB\u05DC \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD)</option>' + _events.map(function (e) { return '<option value="' + escapeHtml(e.id) + '">#' + escapeHtml(String(e.event_number || '?')) + ' \u2014 ' + escapeHtml(e.name || '') + '</option>'; }).join('');
    var templates = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
    var tplOpts = '<option value="">(\u05DC\u05DC\u05D0 \u05EA\u05D1\u05E0\u05D9\u05EA \u2014 \u05DB\u05EA\u05D5\u05D1 \u05D7\u05D5\u05E4\u05E9\u05D9)</option>' + templates.filter(function (t) { return t.is_active; }).map(function (t) { return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name) + ' (' + escapeHtml(CHANNEL_LABELS[t.channel] || t.channel) + ')</option>'; }).join('');
    var chRadios = ['sms','whatsapp','email'].map(function (c) { return '<label style="margin-inline-end:14px;font-weight:400"><input type="radio" name="bc-channel" value="' + c + '"' + (c === 'whatsapp' ? ' checked' : '') + '> ' + CHANNEL_LABELS[c] + '</label>'; }).join('');
    host.innerHTML =
      '<h3 style="color:var(--primary);margin:0 0 12px">\u05E9\u05DC\u05D9\u05D7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA</h3>' +
      '<div class="crm-form-row"><label>\u05E9\u05DD \u05E9\u05DC\u05D9\u05D7\u05D4 *</label><input type="text" id="bc-name" placeholder="\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: \u05EA\u05D6\u05DB\u05D5\u05E8\u05EA \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2 25"></div>' +
      '<div class="crm-form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
        '<div><label>\u05E1\u05D8\u05D8\u05D5\u05E1 \u05DC\u05D9\u05D3</label><select id="bc-status">' + stOpts + '</select></div>' +
        '<div><label>\u05D0\u05D9\u05E8\u05D5\u05E2 (\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD)</label><select id="bc-event">' + evOpts + '</select></div>' +
        '<div><label>\u05E9\u05E4\u05D4</label><select id="bc-lang"><option value="">\u05D4\u05DB\u05DC</option><option value="he">\u05E2\u05D1\u05E8\u05D9\u05EA</option><option value="ru">\u05E8\u05D5\u05E1\u05D9\u05EA</option><option value="en">\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA</option></select></div>' +
      '</div>' +
      '<div class="crm-form-row"><div id="bc-recipient-count" style="padding:10px;background:var(--g100);border-radius:8px;font-weight:600;color:var(--primary)">\u05D4\u05D2\u05D3\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05DC\u05D7\u05D9\u05E9\u05D5\u05D1 \u05E0\u05DE\u05E2\u05E0\u05D9\u05DD</div></div>' +
      '<div class="crm-form-row"><label>\u05E2\u05E8\u05D5\u05E5 *</label><div>' + chRadios + '</div></div>' +
      '<div class="crm-form-row"><label>\u05EA\u05D1\u05E0\u05D9\u05EA (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)</label><select id="bc-template">' + tplOpts + '</select></div>' +
      '<div class="crm-form-row"><label>\u05EA\u05D5\u05DB\u05DF \u05D4\u05D5\u05D3\u05E2\u05D4 *</label><textarea id="bc-body" rows="5" placeholder="\u05D4\u05E7\u05DC\u05D3 \u05D4\u05D5\u05D3\u05E2\u05D4 \u05D0\u05D5 \u05D1\u05D7\u05E8 \u05EA\u05D1\u05E0\u05D9\u05EA \u05DC\u05DE\u05E2\u05DC\u05D4"></textarea></div>' +
      '<div class="crm-form-row" style="text-align:end"><button type="button" class="btn btn-primary" id="bc-send-btn">\u05E9\u05DC\u05D7</button></div>';

    wireBroadcastEvents(host);
    updateRecipientCount();
  }

  function wireBroadcastEvents(host) {
    ['bc-status', 'bc-event', 'bc-lang'].forEach(function (id) {
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', updateRecipientCount);
    });
    var tplSel = host.querySelector('#bc-template');
    var bodyEl = host.querySelector('#bc-body');
    if (tplSel && bodyEl) {
      tplSel.addEventListener('change', function () {
        if (!tplSel.value) return;
        var templates = (typeof window._crmMessagingTemplates === 'function') ? window._crmMessagingTemplates() : [];
        var t = templates.find(function (x) { return x.id === tplSel.value; });
        if (t) {
          bodyEl.value = t.body || '';
          var chRadio = host.querySelector('input[name="bc-channel"][value="' + t.channel + '"]');
          if (chRadio) chRadio.checked = true;
        }
      });
    }
    var sendBtn = host.querySelector('#bc-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', function () { submitBroadcast(host); });
  }

  async function buildLeadIdsQuery(filters) {
    var tid = getTenantId();
    var q = sb.from('crm_leads').select('id').eq('is_deleted', false).is('unsubscribed_at', null);
    if (tid) q = q.eq('tenant_id', tid);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.language) q = q.eq('language', filters.language);
    if (filters.event) {
      var att = sb.from('crm_event_attendees').select('lead_id').eq('event_id', filters.event).eq('is_deleted', false);
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

  function readBroadcastFilters(host) {
    return { status: host.querySelector('#bc-status').value || null, event: host.querySelector('#bc-event').value || null, language: host.querySelector('#bc-lang').value || null };
  }

  async function updateRecipientCount() {
    var host = document.getElementById('crm-messaging-body');
    if (!host) return;
    var el = host.querySelector('#bc-recipient-count');
    if (!el) return;
    el.textContent = '\u05DE\u05D7\u05E9\u05D1...';
    try {
      var ids = await buildLeadIdsQuery(readBroadcastFilters(host));
      el.textContent = '\u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05EA\u05D9\u05E9\u05DC\u05D7 \u05DC-' + ids.length + ' \u05E0\u05DE\u05E2\u05E0\u05D9\u05DD';
      el.dataset.count = String(ids.length);
    } catch (e) { el.textContent = '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || String(e)); }
  }

  function submitBroadcast(host) {
    var name = (host.querySelector('#bc-name').value || '').trim();
    var body = (host.querySelector('#bc-body').value || '').trim();
    var channel = (host.querySelector('input[name="bc-channel"]:checked') || {}).value;
    var templateId = host.querySelector('#bc-template').value || null;
    if (!name) { toast('error', '\u05E9\u05DD \u05E9\u05DC\u05D9\u05D7\u05D4 \u05D7\u05D5\u05D1\u05D4'); return; }
    if (!body) { toast('error', '\u05EA\u05D5\u05DB\u05DF \u05D4\u05D5\u05D3\u05E2\u05D4 \u05D7\u05D5\u05D1'); return; }
    if (!channel) { toast('error', '\u05D1\u05D7\u05E8 \u05E2\u05E8\u05D5\u05E5'); return; }
    var filters = readBroadcastFilters(host);

    buildLeadIdsQuery(filters).then(function (ids) {
      if (!ids.length) { toast('warning', '\u05D0\u05D9\u05DF \u05E0\u05DE\u05E2\u05E0\u05D9\u05DD \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u05DC\u05E1\u05D9\u05E0\u05D5\u05DF'); return; }
      Modal.confirm({
        title: '\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DC\u05D9\u05D7\u05D4',
        message: '\u05DC\u05E9\u05DC\u05D5\u05D7 ' + ids.length + ' \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05D1-' + (CHANNEL_LABELS[channel] || channel) + '?',
        confirmText: '\u05E9\u05DC\u05D7', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
        onConfirm: function () { doSend(name, channel, templateId, body, filters, ids); }
      });
    }).catch(function (e) { toast('error', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || e)); });
  }

  async function doSend(name, channel, templateId, body, filters, leadIds) {
    var tid = getTenantId();
    var session = (typeof loadSession === 'function') ? await loadSession() : null;
    var employeeId = session && session.employee && session.employee.id;
    if (!employeeId) { toast('error', '\u05D4\u05E0\u05E9\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3 \u05D7\u05E1\u05E8\u05D4'); return; }

    try {
      var ins = await sb.from('crm_broadcasts').insert({
        tenant_id: tid, employee_id: employeeId, name: name, channel: channel, template_id: templateId,
        filter_criteria: filters, total_recipients: leadIds.length, total_sent: leadIds.length, total_failed: 0, status: 'sent'
      }).select('id').single();
      if (ins.error) throw new Error(ins.error.message);
      var broadcastId = ins.data.id;
      logWrite('crm.broadcast.send', 'crm_broadcast', broadcastId, { name: name, channel: channel, recipients: leadIds.length });

      var logRows = leadIds.map(function (id) {
        return { tenant_id: tid, lead_id: id, template_id: templateId, broadcast_id: broadcastId, channel: channel, content: body, status: 'sent' };
      });
      var logRes = await sb.from('crm_message_log').insert(logRows);
      if (logRes.error) throw new Error(logRes.error.message);

      toast('success', '\u05E0\u05E9\u05DC\u05D7\u05D5 ' + leadIds.length + ' \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA');
      document.getElementById('bc-name').value = '';
      document.getElementById('bc-body').value = '';
    } catch (e) {
      toast('error', '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05D4: ' + (e.message || String(e)));
    }
  }

  /* ----------------------------------- LOG ----------------------------------- */

  async function renderMessagingLog(host) {
    if (!host) return;
    host.innerHTML =
      '<h3 style="color:var(--primary);margin:0 0 12px">\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4</h3>' +
      '<div class="crm-filter-bar">' +
        '<select id="log-channel"><option value="">\u05DB\u05DC \u05D4\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</option></select>' +
        '<select id="log-status"><option value="">\u05DB\u05DC \u05D4\u05E1\u05D8\u05D8\u05D5\u05E1\u05D9\u05DD</option><option value="sent">\u05E0\u05E9\u05DC\u05D7</option><option value="pending">\u05D1\u05EA\u05D5\u05E8</option><option value="failed">\u05E0\u05DB\u05E9\u05DC</option><option value="delivered">\u05D4\u05D2\u05D9\u05E2</option></select>' +
        '<input type="date" id="log-from" title="\u05DE\u05EA\u05D0\u05E8\u05D9\u05DA">' +
        '<input type="date" id="log-to" title="\u05E2\u05D3 \u05EA\u05D0\u05E8\u05D9\u05DA">' +
      '</div>' +
      '<div id="log-table" class="crm-table-wrap"><div class="crm-detail-empty" style="padding:20px">\u05D8\u05D5\u05E2\u05DF...</div></div>' +
      '<div id="log-pagination" class="crm-pagination"></div>';

    ['log-channel', 'log-status', 'log-from', 'log-to'].forEach(function (id) {
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
    var host = document.getElementById('crm-messaging-body');
    var ch = host ? (host.querySelector('#log-channel') || {}).value : '';
    var st = host ? (host.querySelector('#log-status') || {}).value : '';
    var df = host ? (host.querySelector('#log-from') || {}).value : '';
    var dt = host ? (host.querySelector('#log-to') || {}).value : '';

    var q = sb.from('crm_message_log').select('id, lead_id, event_id, template_id, broadcast_id, channel, content, status, created_at');
    if (tid) q = q.eq('tenant_id', tid);
    if (ch) q = q.eq('channel', ch);
    if (st) q = q.eq('status', st);
    if (df) q = q.gte('created_at', df);
    if (dt) q = q.lte('created_at', dt + 'T23:59:59');
    q = q.order('created_at', { ascending: false }).limit(500);
    var res = await q;
    if (res.error) { toast('error', '\u05DB\u05E9\u05DC \u05D1\u05D8\u05E2\u05D9\u05E0\u05D4: ' + res.error.message); _logRows = []; return; }
    _logRows = res.data || [];

    var leadIds = Array.from(new Set(_logRows.map(function (r) { return r.lead_id; }).filter(Boolean)));
    var tplIds = Array.from(new Set(_logRows.map(function (r) { return r.template_id; }).filter(Boolean)));
    var leadMap = {}, tplMap = {};
    var jobs = [];
    if (leadIds.length) {
      var lq = sb.from('crm_leads').select('id, full_name').in('id', leadIds);
      if (tid) lq = lq.eq('tenant_id', tid);
      jobs.push(lq.then(function (lr) { (lr.data || []).forEach(function (l) { leadMap[l.id] = l.full_name; }); }));
    }
    if (tplIds.length) {
      var tq = sb.from('crm_message_templates').select('id, name').in('id', tplIds);
      if (tid) tq = tq.eq('tenant_id', tid);
      jobs.push(tq.then(function (tr) { (tr.data || []).forEach(function (t) { tplMap[t.id] = t.name; }); }));
    }
    await Promise.all(jobs);
    _logRows.forEach(function (r) { r._lead_name = leadMap[r.lead_id] || '\u2014'; r._template_name = tplMap[r.template_id] || ''; });
  }

  function renderLogTable() {
    var wrap = document.getElementById('log-table');
    if (!wrap) return;
    if (!_logRows.length) {
      wrap.innerHTML = '<div class="crm-detail-empty" style="padding:20px">\u05D0\u05D9\u05DF \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05DC\u05D4\u05E6\u05D2\u05D4.</div>';
      document.getElementById('log-pagination').innerHTML = '';
      return;
    }
    var start = (_logPage - 1) * PAGE_SIZE;
    var rows = _logRows.slice(start, start + PAGE_SIZE);
    var html = '<table class="crm-table"><thead><tr>' +
      '<th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05DC\u05D9\u05D3</th><th>\u05E2\u05E8\u05D5\u05E5</th><th>\u05EA\u05D1\u05E0\u05D9\u05EA</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05EA\u05D5\u05DB\u05DF</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var chColor = CHANNEL_COLORS[r.channel] || '#6b7280';
      var preview = (r.content || '').slice(0, 60) + ((r.content || '').length > 60 ? '\u2026' : '');
      html += '<tr class="readonly">' +
        '<td>' + escapeHtml(CrmHelpers.formatDateTime(r.created_at)) + '</td>' +
        '<td>' + escapeHtml(r._lead_name) + '</td>' +
        '<td><span class="crm-badge" style="background:' + escapeHtml(chColor) + '">' + escapeHtml(CHANNEL_LABELS[r.channel] || r.channel) + '</span></td>' +
        '<td>' + escapeHtml(r._template_name) + '</td>' +
        '<td>' + escapeHtml(STATUS_LABELS[r.status] || r.status) + '</td>' +
        '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(r.content || '') + '">' + escapeHtml(preview) + '</td>' +
        '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
    renderLogPagination();
  }

  function renderLogPagination() {
    var box = document.getElementById('log-pagination');
    if (!box) return;
    var total = _logRows.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) { box.innerHTML = '<span class="crm-page-info">\u05E1\u05D4"\u05DB ' + total + ' \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA</span>'; return; }
    var html = '<button ' + (_logPage === 1 ? 'disabled' : '') + ' data-lp="prev">\u203A</button>';
    for (var i = 1; i <= pages; i++) html += '<button data-lp="' + i + '"' + (i === _logPage ? ' class="active"' : '') + '>' + i + '</button>';
    html += '<button ' + (_logPage === pages ? 'disabled' : '') + ' data-lp="next">\u2039</button>';
    box.innerHTML = html + '<span class="crm-page-info">\u05E2\u05DE\u05D5\u05D3 ' + _logPage + ' \u05DE\u05EA\u05D5\u05DA ' + pages + '</span>';
    box.querySelectorAll('button[data-lp]').forEach(function (b) {
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
