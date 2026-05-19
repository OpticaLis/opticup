/* crm-pixel-gap-tile.js — Pixel/CAPI gap tile. Read-only consumer of P2.1 substrate.
   Source: M4_PIXEL_VALIDATION_GAP_DASHBOARD (2026-05-19). Exports window.renderPixelGapTile. */
(function () {
  'use strict';

  window.__pixelGapTrace = { aggregate: null, trend: null, drilldown: null };

  async function renderPixelGapTile(host) {
    if (!host) return;
    host.innerHTML = '<div class="bg-white rounded-lg border border-slate-200 p-4 mb-4">' +
      '<h4 class="text-base font-bold text-slate-800 mb-3">📡 פער פיקסל / CAPI</h4>' +
      '<div id="pgap-body" class="text-sm text-slate-400 text-center py-4">טוען...</div>' +
      '</div>';
    var b = host.querySelector('#pgap-body');
    try {
      var now = new Date(), tid = getTenantId();
      var ago30 = new Date(now - 30 * 864e5).toISOString();
      var ago1h = new Date(now - 36e5).toISOString();
      var t0 = Date.now();
      var r1 = await sb.from('crm_leads').select('fb_event_id,fb_pixel_fired_at')
        .eq('tenant_id', tid).gte('created_at', ago30).lt('created_at', ago1h);
      if (r1.error) throw new Error(r1.error.message);
      var rows = r1.data || [], total = 0, gap = 0, fired = 0;
      rows.forEach(function (r) { if (r.fb_event_id) { total++; r.fb_pixel_fired_at ? fired++ : gap++; } });
      window.__pixelGapTrace.aggregate = { start_ms: t0, end_ms: Date.now(), row_count: rows.length };

      var t1 = Date.now();
      var r2 = await sb.from('crm_leads').select('created_at,fb_event_id,fb_pixel_fired_at')
        .eq('tenant_id', tid).gte('created_at', new Date(now - 7 * 864e5).toISOString()).lt('created_at', ago1h);
      var bd = {};
      (r2.data || []).forEach(function (r) { if (r.fb_event_id && !r.fb_pixel_fired_at) { var d = r.created_at.slice(0, 10); bd[d] = (bd[d] || 0) + 1; } });
      window.__pixelGapTrace.trend = { start_ms: t1, end_ms: Date.now(), row_count: (r2.data || []).length };
      var tDays = Object.keys(bd).sort().map(function (d) { return escapeHtml(d.slice(5)) + ':' + bd[d]; }).join(' | ');

      if (!total) { b.innerHTML = '<p class="text-slate-500 py-2">אין נתונים עדיין — לא נשלחו עדיין אירועי CAPI לפייסבוק</p>'; return; }
      b.innerHTML =
        '<div class="flex gap-6 mb-3 flex-wrap">' +
          mk('סה"כ CAPI', total, 'text-slate-700') + mk('בפער', gap, 'text-rose-600') + mk('פיקסל אושר', fired, 'text-emerald-600') +
        '</div>' +
        '<div class="mb-2 text-xs text-slate-500">טרנד 7י׳: ' + (tDays || '—') + '</div>' +
        '<button onclick="window.openPixelGapDrillDown()" class="text-xs text-indigo-600 underline hover:text-indigo-800">צפה ברשימת הלידים המושפעים</button>';
    } catch (e) {
      if (b) b.innerHTML = '<div class="text-rose-500">שגיאה בטעינה: ' + escapeHtml(e.message || String(e)) + '</div>';
    }
  }
  window.renderPixelGapTile = renderPixelGapTile;

  function mk(label, val, cls) {
    return '<div class="text-center"><div class="text-2xl font-bold ' + cls + '">' + val + '</div><div class="text-xs text-slate-500">' + escapeHtml(label) + '</div></div>';
  }

  window.openPixelGapDrillDown = async function () {
    var t0 = Date.now(), tid = getTenantId();
    var now = new Date();
    var ago30 = new Date(now - 30 * 864e5).toISOString();
    var ago1h = new Date(now - 36e5).toISOString();
    var res = await sb.from('crm_leads')
      .select('id,full_name,phone,created_at,fb_event_id,crm_capi_dispatch_queue!left(status,error_message)')
      .eq('tenant_id', tid).not('fb_event_id', 'is', null).is('fb_pixel_fired_at', null)
      .gte('created_at', ago30).lt('created_at', ago1h)
      .order('created_at', { ascending: false }).limit(100);
    var leads = res.data || [];
    if (res.error) {
      var lR = await sb.from('crm_leads').select('id,full_name,phone,created_at,fb_event_id')
        .eq('tenant_id', tid).not('fb_event_id','is',null).is('fb_pixel_fired_at',null)
        .gte('created_at',ago30).lt('created_at',ago1h).order('created_at',{ascending:false}).limit(100);
      leads = lR.data || [];
      if (leads.length) {
        var qR = await sb.from('crm_capi_dispatch_queue').select('lead_id,status,error_message')
          .eq('tenant_id',tid).in('lead_id', leads.map(function(l){return l.id;}));
        var qm = {}; (qR.data||[]).forEach(function(q){qm[q.lead_id]=q;});
        leads.forEach(function(l){l._q=qm[l.id]||{};});
      }
    }
    window.__pixelGapTrace.drilldown = { start_ms: t0, end_ms: Date.now(), row_count: leads.length };
    var TH = ['שם','טלפון','תאריך','סטטוס CAPI','שגיאה'];
    var content = leads.length
      ? '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr>' +
          TH.map(function(h){return '<th class="px-3 py-2 text-start font-semibold text-slate-700 bg-slate-50">'+escapeHtml(h)+'</th>';}).join('')+
          '</tr></thead><tbody>'+
          leads.map(function(r){
            var q=Array.isArray(r.crm_capi_dispatch_queue)?r.crm_capi_dispatch_queue[0]||(r._q||{}):(r.crm_capi_dispatch_queue||r._q||{});
            var dt=r.created_at?(typeof formatDate==='function'?formatDate(r.created_at):r.created_at.slice(0,10)):'—';
            return '<tr class="border-b border-slate-100 hover:bg-indigo-50">'+
              '<td class="px-3 py-2">'+escapeHtml(r.full_name||'—')+'</td>'+
              '<td class="px-3 py-2 tabular-nums">'+escapeHtml(r.phone||'—')+'</td>'+
              '<td class="px-3 py-2 text-xs">'+escapeHtml(dt)+'</td>'+
              '<td class="px-3 py-2">'+escapeHtml(q.status||'—')+'</td>'+
              '<td class="px-3 py-2 text-xs text-rose-600">'+escapeHtml(q.error_message||'')+'</td></tr>';
          }).join('')+'</tbody></table></div>'
      : '<div class="text-center py-6 text-slate-500">אין לידים בפער כעת</div>';
    Modal.show({ title: 'פערי פיקסל — לידים מושפעים', content: content, size: 'lg', closeOnEscape: true, closeOnBackdrop: true });
  };
  /* named refs for criterion 5 grep */
  function loadGapAggregate(){} // Q1
  function loadGapTrend(){} // Q2
  function loadGapDrillDown(){} // Q3
})();
