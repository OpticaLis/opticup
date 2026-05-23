/* ============================================================
   M5 Customer Card — Tab 4 (Orders) — M7 schema deployed (NIGHT_RUN
   Track 4, 2026-05-23). Renders summary table from orders +
   sub_orders count. All CTAs route to showComingSoon('orders_m7_ui')
   because the full M7 UI is not built yet (Brief §4 + D-decisions).
   ============================================================ */
(function () {
  'use strict';

  function statusPillClass(status) {
    if (!status) return 'cust-pill-gray';
    var s = String(status).toLowerCase();
    if (s.indexOf('done') >= 0 || s.indexOf('delivered') >= 0 || s === 'נמסר') return 'cust-pill-green';
    if (s.indexOf('progress') >= 0 || s.indexOf('open') >= 0 || s === 'בעבודה') return 'cust-pill-amber';
    if (s.indexOf('cancel') >= 0) return 'cust-pill-coral';
    return 'cust-pill-navy';
  }

  async function fetchOrders(customerId) {
    // M7 schema (deployed 2026-05-23 NIGHT_RUN Track 4). Iron Rule 22 — tenant_id
    // auto-injected by DB.select. customer_id filter via key-value filter.
    // sub_orders has TWO FK to orders (order_id + repair_origin_order_id) — use
    // the explicit FK hint for the count embed. total_amount doesn't exist on
    // orders today; see FINDINGS F-3 (needs aggregation view or RPC).
    var res = await DB.select('orders', { customer_id: customerId }, {
      columns: 'id, order_number, created_at, status, sub_orders!sub_orders_order_id_fkey(count)',
      order: 'created_at.desc',
      silent: true
    });
    if (res.error) {
      window.M5Card && window.M5Card.trace('orders_fetch_error', { error: String(res.error.message || res.error) });
      return [];
    }
    return res.data || [];
  }

  function rowHtml(order) {
    var dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('he-IL') : '—';
    var subCount = (order.sub_orders && order.sub_orders[0]) ? order.sub_orders[0].count : 0;
    var subStr = subCount > 0 ? (subCount + ' תת-הזמנות') : '—';
    var statusCls = statusPillClass(order.status);
    var orderNum = order.order_number || order.id.slice(0, 8);
    return '<tr>' +
             '<td><strong>' + escapeHtml(String(orderNum)) + '</strong></td>' +
             '<td>' + escapeHtml(dateStr) + '</td>' +
             '<td>' + escapeHtml(subStr) + '</td>' +
             '<td><span class="cust-pill ' + statusCls + '">' + escapeHtml(String(order.status || '—')) + '</span></td>' +
             '<td><button class="cust-filter" data-coming-soon="orders_m7_ui">פתח</button></td>' +
           '</tr>';
  }

  window.renderTabOrders = function (pane, S) {
    var c = S.customer || {};
    pane.innerHTML =
      '<div class="cust-orders-banner">' +
        '<div class="ttl">📦 לשונית הזמנות = מסך-M7 המלא</div>' +
        '<p style="margin:6px 0;font-size:11px;color:var(--text-secondary);">' +
          'בלחיצה על הכפתורים תיפתח חוויית-M7 המלאה — UI עוד לא נבנה (' +
          escapeHtml(window.COMING_SOON_LABEL) + ').' +
        '</p>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">' +
          '<button class="go" data-coming-soon="orders_m7_ui">+ הזמנה חדשה</button>' +
          '<button class="go" data-coming-soon="orders_m7_ui" style="background:var(--success);">→ פתח מסך-M7</button>' +
        '</div>' +
      '</div>' +
      '<h2 style="font-size:14px;margin:14px 0 8px;">תקציר הזמנות</h2>' +
      '<div id="cust-orders-list">טוען…</div>';
  };

  window.mountTabOrders = async function (pane, S) {
    pane.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });

    var listHost = document.getElementById('cust-orders-list');
    if (!listHost || !S.customerId) return;

    var orders = await fetchOrders(S.customerId);
    window.M5Card && window.M5Card.trace('orders_loaded', { count: orders.length });

    if (!orders.length) {
      listHost.innerHTML = '<div class="cust-stub-panel" style="padding:24px;"><p>אין הזמנות לצפייה.</p></div>';
      return;
    }
    listHost.innerHTML =
      '<table class="cust-table">' +
        '<thead><tr><th>מספר</th><th>תאריך</th><th>תוכן</th><th>סטטוס</th><th></th></tr></thead>' +
        '<tbody>' + orders.map(rowHtml).join('') + '</tbody>' +
      '</table>';
    // Re-bind row CTAs
    listHost.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });
  };
})();
