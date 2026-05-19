/* =============================================================================
   crm-weekly-brief-panel.js — Weekly Optimization Brief panel
   Reads funnel_weekly_briefs (most recent + last 10) for current tenant.
   Exports window.renderWeeklyBriefPanel(host).
   Source: M4_WEEKLY_OPTIMIZATION_BRIEF (2026-05-19). Phase 2.5 Deliverable B.
   Iron Rules: 7 (sb helpers), 8 (escapeHtml — no innerHTML w/ user data),
               22 (tenant_id on every read), 34 (window.__weeklyBriefTrace).
   D-AUTH-10: renders summary as escaped text — no raw innerHTML of DB content.
   ============================================================================= */
(function () {
  'use strict';

  /* ── MAIN EXPORT ──────────────────────────────────────────────────────────── */
  async function renderWeeklyBriefPanel(host) {
    if (!host) return;
    host.innerHTML = '<div class="wb-panel"><h3 class="wb-title">&#128203; תקציר שבועי</h3>' +
      '<div class="wb-loading">טוען...</div></div>';

    var tid = getTenantId();
    if (!tid) { host.innerHTML = '<div class="wb-panel wb-empty">אין זהות שוכרת</div>'; return; }

    var result = await sb.from('funnel_weekly_briefs')
      .select('week_start,summary,improvements,concerns,steady,generated_at,classifier_version')
      .eq('tenant_id', tid)
      .order('week_start', { ascending: false })
      .limit(10);

    // Iron Rule 34 trace (D-AUTH-8)
    window.__weeklyBriefTrace = window.__weeklyBriefTrace || [];
    window.__weeklyBriefTrace.push({
      at: Date.now(),
      error: result.error ? result.error.message : null,
      rows: result.data ? result.data.length : 0,
      latest_week: result.data && result.data.length > 0 ? result.data[0].week_start : null,
    });

    if (result.error || !result.data || result.data.length === 0) {
      host.innerHTML = '<div class="wb-panel"><h3 class="wb-title">&#128203; תקציר שבועי</h3>' +
        '<div class="wb-empty">אין תקצירים עדיין. הראשון ייווצר ביום ראשון הקרוב.</div></div>';
      return;
    }

    var data = result.data;
    var current = data[0];
    var panel = document.createElement('div');
    panel.className = 'wb-panel';
    panel.innerHTML = buildBriefHtml(current) + buildDropdownHtml(data);
    host.innerHTML = '';
    host.appendChild(panel);
    wireDropdown(host, data);
  }

  /* ── RENDER BRIEF HTML ────────────────────────────────────────────────────── */
  function buildBriefHtml(brief) {
    var parts = [];
    parts.push('<h3 class="wb-title">&#128203; תקציר שבועי — ' + escapeHtml(brief.week_start) + '</h3>');
    parts.push('<div class="wb-meta wb-version">' +
      escapeHtml(brief.classifier_version || 'v1-deterministic') +
      ' · נוצר אוטומטית</div>');
    parts.push('<p class="wb-summary">' + escapeHtml(brief.summary || '') + '</p>');

    var improvements = brief.improvements || [];
    if (improvements.length > 0) {
      parts.push('<h4 class="wb-section-title">&#128200; שיפור</h4><ul class="wb-list">');
      improvements.forEach(function (item) {
        var d = Number(item.delta_pct || 0).toFixed(1);
        parts.push('<li class="wb-item wb-improve"><span class="wb-label">' + escapeHtml(item.label || item.metric) +
          '</span><span class="wb-delta wb-up">+' + escapeHtml(d) + '%</span></li>');
      });
      parts.push('</ul>');
    }

    var concerns = brief.concerns || [];
    if (concerns.length > 0) {
      parts.push('<h4 class="wb-section-title">&#128201; דאגות</h4><ul class="wb-list">');
      concerns.forEach(function (item) {
        var d = Number(item.delta_pct || 0);
        var sign = d >= 0 ? '+' : '';
        parts.push('<li class="wb-item wb-concern"><span class="wb-label">' + escapeHtml(item.label || item.metric) +
          '</span><span class="wb-delta wb-dn">' + escapeHtml(sign + d.toFixed(1)) + '%</span>' +
          (item.focus_suggestion ? '<div class="wb-focus">' + escapeHtml(item.focus_suggestion) + '</div>' : '') +
          '</li>');
      });
      parts.push('</ul>');
    }

    var steady = brief.steady || [];
    if (steady.length > 0) {
      parts.push('<h4 class="wb-section-title">&#8594; יציב</h4><ul class="wb-list wb-steady-list">');
      steady.forEach(function (item) {
        parts.push('<li class="wb-item wb-steady"><span class="wb-label">' + escapeHtml(item.label || item.metric) + '</span></li>');
      });
      parts.push('</ul>');
    }
    return parts.join('');
  }

  /* ── WEEK DROPDOWN ────────────────────────────────────────────────────────── */
  function buildDropdownHtml(data) {
    if (data.length <= 1) return '';
    var opts = data.map(function (b, i) {
      return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' +
        escapeHtml(b.week_start) + '</option>';
    }).join('');
    return '<div class="wb-nav"><label class="wb-nav-label">שבוע:</label>' +
      '<select class="wb-week-select">' + opts + '</select></div>';
  }

  function wireDropdown(host, data) {
    var sel = host.querySelector('.wb-week-select');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var idx = parseInt(sel.value, 10);
      var panel = host.querySelector('.wb-panel');
      if (!panel || !data[idx]) return;
      // Replace brief content but keep the dropdown
      var dropdown = buildDropdownHtml(data);
      panel.innerHTML = buildBriefHtml(data[idx]) + dropdown;
      // Re-wire (rebuild replaces DOM node, so re-query)
      var newSel = panel.querySelector('.wb-week-select');
      if (newSel) {
        newSel.value = String(idx);
        wireDropdown(host, data);
      }
    });
  }

  window.renderWeeklyBriefPanel = renderWeeklyBriefPanel;
})();
