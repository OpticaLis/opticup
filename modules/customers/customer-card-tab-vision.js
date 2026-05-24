/* ============================================================
   M5 Customer Card — Tab 2 (Vision Function History).
   Source: M6-owned view `v_customer_vision_function_history`.
   Renders a timeline of vision function exam results.
   ============================================================ */
(function () {
  'use strict';

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  }

  function renderTimeline(rows) {
    if (!rows || !rows.length) {
      return '<div class="cust-stub-panel" style="padding:24px;">' +
        '<p>אין היסטוריית תפקודי-ראייה ללקוח זה.</p>' +
        '<p style="font-size:11px;color:var(--text-tertiary);margin-top:8px;">תפקודי-ראייה ייווצרו אוטומטית כאשר מרשם יוקם במודול-מרשמים.</p>' +
      '</div>';
    }
    var html = '<div class="cust-vision-timeline">';
    rows.forEach(function (r) {
      var date = formatDate(r.exam_date || r.valid_from);
      var type = r.exam_type || '—';
      var optometrist = r.optometrist_name || '—';
      var kind = r.kind === 'contacts' ? 'עדשות-מגע' : 'משקפיים';
      html += '<div class="cust-vision-entry">' +
        '<div class="cust-vision-date">' + escapeHtml(date) + '</div>' +
        '<div class="cust-vision-body">' +
          '<div class="cust-vision-meta">' +
            '<span class="cust-pill cust-pill-navy">' + escapeHtml(kind) + '</span> ' +
            '<span>' + escapeHtml(type) + '</span> · ' +
            '<span>' + escapeHtml(optometrist) + '</span>' +
          '</div>' +
          (r.r_summary ? '<div class="cust-vision-summary">R: ' + escapeHtml(r.r_summary) + ' · L: ' + escapeHtml(r.l_summary || '—') + '</div>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  window.renderTabVision = function (pane, S) {
    pane.innerHTML =
      '<div style="background:var(--info-soft);border:0.5px solid var(--info);border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:var(--info);">' +
        '👁️ <strong>היסטוריית תפקודי-ראייה</strong> — נתונים ממודול-מרשמים (M6).' +
      '</div>' +
      '<div id="cust-vision-host">טוען…</div>';
  };

  window.mountTabVision = async function (pane, S) {
    var res = await DB.select('v_customer_vision_function_history',
      { customer_id: S.customerId },
      { order: 'valid_from.desc', silent: true });
    var host = pane.querySelector('#cust-vision-host');
    if (host) {
      host.innerHTML = renderTimeline((res && res.data) || []);
    }
  };
})();
