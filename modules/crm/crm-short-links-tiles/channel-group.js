/* =============================================================================
   channel-group.js — Channel-grouping helpers for template-static short links.
   Groups channel-split links (E/S prefix convention) into logical rows and
   provides display data for the channel filter (הכל / SMS / מייל).
   Part of M4_SHORT_LINKS_CHANNEL_DASHBOARD (2026-05-24).
   Exports window.CrmShortLinksChannelGroup.
   ============================================================================= */
(function () {
  'use strict';

  function groupKey(label) {
    if (!label) return null;
    return label.replace(/_(email|sms)$/, '');
  }

  function channelFromLabel(label) {
    if (!label) return null;
    if (/_email$/.test(label)) return 'email';
    if (/_sms$/.test(label)) return 'sms';
    return null;
  }

  function buildGroups(rows) {
    var groups = {};
    var ungrouped = [];
    rows.forEach(function (r) {
      var ch = channelFromLabel(r.label);
      var gk = groupKey(r.label);
      if (!ch || !gk) { ungrouped.push(r); return; }
      if (!groups[gk]) groups[gk] = { key: gk, email: null, sms: null, total: 0, lastClicked: null, target_url: '', target_trunc: '' };
      var g = groups[gk];
      g[ch] = r;
      g.total += r.total_clicks;
      if (!g.target_url) { g.target_url = r.target_url; g.target_trunc = r.target_trunc; }
      if (r.last_clicked && (!g.lastClicked || r.last_clicked > g.lastClicked)) g.lastClicked = r.last_clicked;
    });
    return { groups: groups, ungrouped: ungrouped };
  }

  function getDisplayRows(data, activeChannel) {
    var out = [];
    var keys = Object.keys(data.groups).sort();
    keys.forEach(function (k) {
      var g = data.groups[k];
      var clicks, breakdown;
      if (activeChannel === 'email') {
        clicks = g.email ? g.email.total_clicks : 0;
        breakdown = null;
      } else if (activeChannel === 'sms') {
        clicks = g.sms ? g.sms.total_clicks : 0;
        breakdown = null;
      } else {
        clicks = g.total;
        var parts = [];
        if (g.sms) parts.push('SMS: ' + g.sms.total_clicks);
        if (g.email) parts.push('מייל: ' + g.email.total_clicks);
        breakdown = parts.length > 1 ? parts.join(' · ') : null;
      }
      var codes = [];
      if (g.email) codes.push(g.email.code);
      if (g.sms) codes.push(g.sms.code);
      out.push({ key: k, codes: codes, target_url: g.target_url, target_trunc: g.target_trunc,
                 clicks: clicks, breakdown: breakdown, lastClicked: g.lastClicked,
                 emailRow: g.email, smsRow: g.sms });
    });
    data.ungrouped.forEach(function (r) {
      out.push({ key: r.label || r.code, codes: [r.code], target_url: r.target_url,
                 target_trunc: r.target_trunc, clicks: r.total_clicks, breakdown: null,
                 lastClicked: r.last_clicked, emailRow: null, smsRow: null, ungrouped: true });
    });
    return out;
  }

  function renderFilterChips(activeChannel) {
    var channels = [
      { id: 'all',   label: 'הכל' },
      { id: 'sms',   label: 'SMS' },
      { id: 'email', label: 'מייל' }
    ];
    return channels.map(function (c) {
      var active = (activeChannel || 'all') === c.id;
      return '<button data-sl-channel="' + c.id + '" class="px-3 py-1 rounded-full text-xs font-medium border transition-colors ' +
        (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50') + '">' +
        c.label + '</button>';
    }).join('');
  }

  window.CrmShortLinksChannelGroup = {
    groupKey: groupKey,
    channelFromLabel: channelFromLabel,
    buildGroups: buildGroups,
    getDisplayRows: getDisplayRows,
    renderFilterChips: renderFilterChips
  };
})();
