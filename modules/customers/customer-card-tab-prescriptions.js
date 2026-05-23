/* ============================================================
   M5 Customer Card — Tab 3 (Prescriptions).
   Source: M6-owned view `v_customer_prescriptions_summary` (14 cols).
   Action: "+ מרשם חדש" → DB.rpc('create_prescription_draft', ...)
   Per-row "פתח ב-M6" + "📦 הזמנה" → coming-soon (M6/M7 UI not built).
   Client-side filtering: הכל / משקפיים / עדשות-מגע / פעילים בלבד.
   ============================================================ */
(function () {
  'use strict';

  var filter = 'all'; // 'all' | 'glasses' | 'contacts' | 'active'
  var rxRows = [];    // cache

  function kindLabel(kind) {
    if (kind === 'glasses') return 'משקפיים';
    if (kind === 'contacts') return 'עדשות-מגע';
    return String(kind || '—');
  }
  function kindPillClass(kind) {
    if (kind === 'glasses') return 'cust-pill-navy';
    if (kind === 'contacts') return 'cust-pill-coral';
    return 'cust-pill-gray';
  }
  function statusLabel(s) {
    if (!s) return '—';
    var m = { draft: 'טיוטה', active: 'פעיל', expired: 'פג', archived: 'ישן', superseded: 'ישן' };
    return m[s] || s;
  }
  function statusPillClass(s) {
    if (s === 'active') return 'cust-pill-green';
    if (s === 'draft') return 'cust-pill-amber';
    if (s === 'expired' || s === 'archived' || s === 'superseded') return 'cust-pill-gray';
    return 'cust-pill-gray';
  }

  function applyFilter(rows) {
    if (filter === 'all') return rows;
    if (filter === 'active') return rows.filter(function (r) { return r.status === 'active'; });
    if (filter === 'glasses' || filter === 'contacts') return rows.filter(function (r) { return r.kind === filter; });
    return rows;
  }

  function rowHtml(r) {
    var committedStr = r.committed_at ? new Date(r.committed_at).toLocaleDateString('he-IL') : '—';
    var expiresStr   = r.expires_at  ? new Date(r.expires_at).toLocaleDateString('he-IL')  : '—';
    var notesStr     = (r.notes_count > 0) ? (r.notes_count + ' הערות') : '—';
    var isActive     = r.status === 'active';
    var rowStyle     = isActive ? ' style="background:var(--success-soft);"' : '';
    var rSum         = r.r_summary || '—';
    var lSum         = r.l_summary || '—';
    var rxNum        = r.prescription_number != null ? r.prescription_number : '—';
    return '<tr' + rowStyle + ' data-rx-id="' + escapeHtml(r.id) + '">' +
             '<td>' + escapeHtml(committedStr) + '</td>' +
             '<td>#' + escapeHtml(String(rxNum)) + '</td>' +
             '<td><span class="cust-pill ' + kindPillClass(r.kind) + '">' + escapeHtml(kindLabel(r.kind)) + '</span></td>' +
             '<td><span class="cust-pill ' + statusPillClass(r.status) + '">' + escapeHtml(statusLabel(r.status)) + '</span></td>' +
             '<td>R: ' + escapeHtml(rSum) + '<br>L: ' + escapeHtml(lSum) + '</td>' +
             '<td>' + escapeHtml(expiresStr) + '</td>' +
             '<td>' + escapeHtml(notesStr) + '</td>' +
             '<td class="cust-row-action">' +
               '<button data-coming-soon="prescription_edit">פתח ב-M6 ←</button>' +
               (isActive ? '<button data-coming-soon="prescription_order">📦 הזמנה</button>' : '') +
             '</td>' +
           '</tr>';
  }

  function renderTable() {
    var rows = applyFilter(rxRows);
    if (!rows.length) {
      return '<div class="cust-stub-panel" style="padding:24px;"><p>אין בדיקות-ראייה לסינון הנוכחי.</p></div>';
    }
    return '<table class="cust-table">' +
             '<thead><tr>' +
               '<th>תאריך</th><th>מס\'</th><th>סוג</th><th>מצב</th>' +
               '<th>תקציר R / L</th><th>תוקף-עד</th><th>הערות</th><th>פעולות</th>' +
             '</tr></thead>' +
             '<tbody>' + rows.map(rowHtml).join('') + '</tbody>' +
           '</table>';
  }

  function renderFilters() {
    var counts = {
      all: rxRows.length,
      glasses: rxRows.filter(function (r) { return r.kind === 'glasses'; }).length,
      contacts: rxRows.filter(function (r) { return r.kind === 'contacts'; }).length,
      active: rxRows.filter(function (r) { return r.status === 'active'; }).length
    };
    var btns = [
      { id: 'all',      l: 'הכל'            },
      { id: 'glasses',  l: 'משקפיים'        },
      { id: 'contacts', l: 'עדשות-מגע'      },
      { id: 'active',   l: 'פעילים בלבד'    }
    ];
    return btns.map(function (b) {
      return '<button class="cust-filter' + (filter === b.id ? ' active' : '') + '" data-filter="' + escapeHtml(b.id) + '">' +
             escapeHtml(b.l) + ' (' + counts[b.id] + ')</button>';
    }).join('');
  }

  function chooseKindModal() {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
      bg.innerHTML =
        '<div style="background:var(--bg-surface);padding:24px 28px;border-radius:10px;min-width:280px;text-align:center;">' +
          '<h3 style="margin:0 0 14px;font-size:14px;font-weight:500;">סוג מרשם חדש</h3>' +
          '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button data-kind="glasses" class="cust-filter" style="background:var(--accent);color:#fff;border-color:var(--accent);padding:8px 16px;">משקפיים</button>' +
            '<button data-kind="contacts" class="cust-filter" style="background:var(--danger);color:#fff;border-color:var(--danger);padding:8px 16px;">עדשות-מגע</button>' +
            '<button data-kind="" class="cust-filter" style="padding:8px 16px;">ביטול</button>' +
          '</div>' +
        '</div>';
      bg.addEventListener('click', function (ev) {
        var k = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-kind');
        if (k !== null) { document.body.removeChild(bg); resolve(k || null); }
      });
      document.body.appendChild(bg);
    });
  }

  async function newPrescriptionFlow(customerId) {
    var kind = await chooseKindModal();
    if (!kind) return;
    window.M5Card.trace('create_prescription_draft_called', { kind: kind });
    var res = await DB.rpc('create_prescription_draft', {
      p_tenant_id: getTenantId(),
      p_customer_id: customerId,
      p_kind: kind
    }, { silent: true });
    window.M5Card.trace('create_prescription_draft_resolved', {
      kind: kind,
      data: res.data,
      error: res.error ? String(res.error.message || res.error) : null
    });
    if (res.error) {
      Toast.error('יצירת מרשם נכשלה: ' + (res.error.message || 'unknown'));
      return;
    }
    Toast.success('מרשם נוצר (טיוטה).');
    // Reload Tab 3 data + re-render
    await refresh(customerId);
  }

  async function refresh(customerId) {
    var res = await DB.select('v_customer_prescriptions_summary',
      { customer_id: customerId },
      { order: 'committed_at.desc', silent: true });
    rxRows = (res && res.data) || [];
    var pane = document.getElementById('cust-pane-prescriptions');
    if (pane) pane.querySelector('[data-rx-host]').innerHTML = renderTable();
    var filterHost = pane && pane.querySelector('[data-filter-host]');
    if (filterHost) filterHost.innerHTML = renderFilters();
    bindEvents(pane);
  }

  function bindEvents(pane) {
    if (!pane) return;
    pane.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });
    pane.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter');
        refresh(window.M5Card.state.customerId);
      });
    });
    var newBtn = pane.querySelector('#cust-new-rx-btn');
    if (newBtn) newBtn.addEventListener('click', function () {
      newPrescriptionFlow(window.M5Card.state.customerId);
    });
  }

  window.renderTabPrescriptions = function (pane, S) {
    pane.innerHTML =
      '<div style="background:var(--info-soft);border:0.5px solid var(--info);border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:var(--info);">' +
        '📋 <strong>תצוגת-תקציר על מודול-בדיקות ראייה נפרד (M6).</strong> ' +
        'ליצירה/עריכה מלאה — "פתח ב-M6" (UI עתידי).' +
      '</div>' +
      '<div class="cust-table-toolbar">' +
        '<div class="cust-filters" data-filter-host>' + renderFilters() + '</div>' +
        '<button class="cust-filter" id="cust-new-rx-btn" style="background:var(--accent);color:#fff;border-color:var(--accent);">+ מרשם חדש</button>' +
      '</div>' +
      '<div data-rx-host>טוען…</div>';
  };

  window.mountTabPrescriptions = async function (pane, S) {
    bindEvents(pane);
    await refresh(S.customerId);
  };
})();
