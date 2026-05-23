/* ============================================================
   M5 Customer List — Left Sidebar (Sketch 2 — Split Workspace).
   3 groups: פעולות מהירות (coming-soon) + לקוחות (3 wired + 2 blurred) +
   מודולים מקושרים (all coming-soon). Footer: tenant_location name + tenant name.
   ============================================================ */
(function () {
  'use strict';

  var SIDEBAR_GROUPS = [
    {
      header: 'פעולות מהירות',
      items: [
        { icon: '📦', label: 'מסירת הזמנה',         coming_soon: 'orders_m7_ui' },
        { icon: '🛠️', label: 'תיקונים',              coming_soon: 'orders_m7_ui' },
        { icon: '📋', label: 'משימה חדשה',           coming_soon: 'sidebar_appointments' },
        { icon: '🛒', label: 'אביזרים · לקוח כללי',  coming_soon: 'orders_m7_ui' }
      ]
    },
    {
      header: 'לקוחות',
      items: [
        { icon: '👥', label: 'כל הלקוחות',     wired: true,  pill: 'all'   },
        { icon: '🆕', label: 'לקוחות חדשים',   wired: true,  pill: 'active' },
        { icon: '📞', label: 'לידים פתוחים',    wired: true,  pill: 'leads' },
        { icon: '⭐', label: 'חברי מועדון',     coming_soon: 'sidebar_loyalty' },
        { icon: '🎁', label: 'ימי-הולדת השבוע', coming_soon: 'sidebar_birthday_filter' }
      ]
    },
    {
      header: 'מודולים מקושרים',
      items: [
        { icon: '📅', label: 'ניהול תורים',     coming_soon: 'sidebar_appointments' },
        { icon: '🔬', label: 'מעבדה (KDS)',     coming_soon: 'sidebar_kds' },
        { icon: '📊', label: 'דוחות',           coming_soon: 'sidebar_reports' },
        { icon: '🏪', label: 'ניהול מלאי',       coming_soon: 'sidebar_inventory' },
        { icon: '💬', label: 'תקשורת · WhatsApp', coming_soon: 'sidebar_comms' }
      ]
    }
  ];

  window.renderListSidebar = function (state) {
    var tenantName = (typeof getTenantConfig === 'function' && getTenantConfig('tenant_name')) ||
                     (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tenant_name_cache')) ||
                     'אופטיקה';
    var branchName = (state.branches && state.branches[0] && state.branches[0].name) || '';
    var activePill = state.activePillId || 'all';

    var html = '';
    SIDEBAR_GROUPS.forEach(function (g) {
      html += '<div class="cust-side-group">' +
                '<div class="cust-side-hdr">' + escapeHtml(g.header) + '</div>';
      g.items.forEach(function (it) {
        var cls = 'cust-side-item';
        var attrs = '';
        if (it.wired) {
          if (it.pill === activePill) cls += ' active';
          attrs = ' data-pill="' + escapeHtml(it.pill) + '"';
        } else {
          cls += ' cust-blurred';
          attrs = ' data-coming-soon="' + escapeHtml(it.coming_soon) + '"';
        }
        var count = '';
        if (it.wired && state.countsByPill && state.countsByPill[it.pill] != null) {
          count = '<span class="cust-side-num">' + escapeHtml(String(state.countsByPill[it.pill])) + '</span>';
        }
        html += '<button class="' + cls + '"' + attrs + '>' +
                  '<span class="cust-side-lab"><span class="cust-side-ic">' + escapeHtml(it.icon) + '</span> ' + escapeHtml(it.label) + '</span>' +
                  count +
                '</button>';
      });
      html += '</div>';
    });
    html += '<div class="cust-side-branch">' +
              (branchName ? '<div class="cust-side-branch-name">' + escapeHtml(branchName) + '</div>' : '') +
              '<div>' + escapeHtml(tenantName) + '</div>' +
            '</div>';
    return html;
  };

  window.bindListSidebar = function (root, state, onPillChange) {
    root.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });
    root.querySelectorAll('[data-pill]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('data-pill');
        if (typeof onPillChange === 'function') onPillChange(p);
      });
    });
  };
})();
