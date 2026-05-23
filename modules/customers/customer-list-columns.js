/* ============================================================
   M5 Customer List — Configurable columns (per tenant, Pattern P19).
   Storage: tenant_settings.customer_list_preferences jsonb,
   written by DB.rpc('update_customer_display_preferences', ...).
   Shape: { list_columns: [<col_id>, ...] } — order = display order,
   presence = visibility.
   ============================================================ */
(function () {
  'use strict';

  // 11 wired columns (data exists today in v_customer_for_exam +
  // v_customer_full merge — customer-list.js already fetches all of these).
  // 4 future columns shown as disabled "coming soon" rows in the picker;
  // they light up automatically when their owning module ships (M6/M7/M13).
  window.CUSTOMER_LIST_COLUMNS = [
    // Wired
    { id: 'name',             label: 'שם',              wired: true,  render: 'name' },
    { id: 'phone',            label: 'נייד',            wired: true,  render: 'phone' },
    { id: 'phone_secondary',  label: 'טלפון-עבודה',     wired: true,  render: 'phone_secondary' },
    { id: 'email',            label: 'אימייל',          wired: true,  render: 'email' },
    { id: 'city',             label: 'עיר',             wired: true,  render: 'city' },
    { id: 'id_number',        label: 'ת.ז',             wired: true,  render: 'id_number' },
    { id: 'source',           label: 'מקור',            wired: true,  render: 'source' },
    { id: 'lifecycle_stage',  label: 'מצב',             wired: true,  render: 'lifecycle' },
    { id: 'customer_number',  label: 'מס\' לקוח',       wired: true,  render: 'customer_number_display' },
    { id: 'health_fund',      label: 'קופ"ח',           wired: true,  render: 'health_fund_name' },
    { id: 'created_at',       label: 'נוצר',            wired: true,  render: 'created_at' },
    // Future (coming soon)
    { id: 'last_exam_date',   label: 'בדיקה אחרונה',    wired: false, coming_soon: 'list_col_last_exam'  },
    { id: 'last_order_date',  label: 'הזמנה אחרונה',    wired: false, coming_soon: 'list_col_last_order' },
    { id: 'club_tier',        label: 'דרגת מועדון',     wired: false, coming_soon: 'list_col_club_tier'  },
    { id: 'age',              label: 'גיל',             wired: false, coming_soon: 'list_col_age'        }
  ];

  // Default for a new tenant (or no tenant_settings row yet).
  window.DEFAULT_LIST_COLUMNS = ['name', 'phone', 'city', 'health_fund'];

  function colById(id) {
    for (var i = 0; i < window.CUSTOMER_LIST_COLUMNS.length; i++) {
      if (window.CUSTOMER_LIST_COLUMNS[i].id === id) return window.CUSTOMER_LIST_COLUMNS[i];
    }
    return null;
  }

  /**
   * Load the tenant's chosen list_columns array from tenant_settings.
   * Returns an array of column IDs (filtered to only wired ones — future cols
   * never appear in the visible set even if accidentally saved). Falls back
   * to DEFAULT_LIST_COLUMNS if no row exists or list_columns is missing.
   */
  window.loadTenantListColumns = async function () {
    try {
      var res = await DB.select('tenant_settings', { tenant_id: getTenantId() }, {
        columns: 'customer_list_preferences', single: true, silent: true
      });
      var prefs = (res && res.data && res.data.customer_list_preferences) || null;
      var cols = (prefs && Array.isArray(prefs.list_columns)) ? prefs.list_columns : null;
      if (!cols || !cols.length) return window.DEFAULT_LIST_COLUMNS.slice();
      // Strip any future/unwired entries defensively
      return cols.filter(function (id) {
        var c = colById(id);
        return c && c.wired;
      });
    } catch (e) {
      return window.DEFAULT_LIST_COLUMNS.slice();
    }
  };

  /**
   * Save the tenant's chosen list_columns array via the existing
   * update_customer_display_preferences RPC (UPSERT on tenant_settings).
   * @param {string[]} colIds — wired column IDs in display order
   */
  window.saveTenantListColumns = async function (colIds) {
    var prefs = { list_columns: colIds };
    var res = await DB.rpc('update_customer_display_preferences', {
      p_tenant_id: getTenantId(),
      p_prefs: prefs
    }, { silent: true });
    return res;
  };

  /**
   * Render a single picker checkbox row for a column definition.
   */
  function pickerRow(col, isOn) {
    if (col.wired) {
      return '<label class="cust-colpick-row">' +
               '<input type="checkbox" data-col-id="' + escapeHtml(col.id) + '"' + (isOn ? ' checked' : '') + '>' +
               '<span>' + escapeHtml(col.label) + '</span>' +
             '</label>';
    }
    // Coming-soon: rendered disabled; clicking the label fires showComingSoon
    return '<label class="cust-colpick-row cust-blurred" data-coming-soon="' + escapeHtml(col.coming_soon) + '">' +
             '<input type="checkbox" disabled>' +
             '<span>' + escapeHtml(col.label) + ' <span class="cust-colpick-future">(בקרוב)</span></span>' +
           '</label>';
  }

  /**
   * Open the column picker modal. Reads current visible columns from
   * `window.M5CardList.activeColumns` (set by customer-list.js after loadTenantListColumns).
   * On submit: saves via RPC + reapplies + re-renders list.
   */
  window.openColumnPicker = async function () {
    var active = (window.__customerListState && window.__customerListState.activeColumns) || window.DEFAULT_LIST_COLUMNS;
    var activeSet = {};
    active.forEach(function (id) { activeSet[id] = true; });

    var wiredRows = window.CUSTOMER_LIST_COLUMNS.filter(function (c) { return c.wired; })
      .map(function (c) { return pickerRow(c, !!activeSet[c.id]); }).join('');
    var futureRows = window.CUSTOMER_LIST_COLUMNS.filter(function (c) { return !c.wired; })
      .map(function (c) { return pickerRow(c, false); }).join('');

    var host = document.createElement('div');
    host.innerHTML =
      '<div class="cust-colpick-bg" id="cust-colpick-bg">' +
        '<div class="cust-colpick-modal">' +
          '<h3>בחירת עמודות</h3>' +
          '<p class="cust-colpick-hint">בחר/הסר עמודות לרשימה. ההגדרה נשמרת פר-tenant. עמודות עתידיות נדלקות אוטומטית כשהמודול הרלוונטי ייפתח.</p>' +
          '<div class="cust-colpick-group"><div class="cust-colpick-grp-hdr">זמינות עכשיו</div>' + wiredRows + '</div>' +
          '<div class="cust-colpick-group"><div class="cust-colpick-grp-hdr">עתידי (בקרוב)</div>' + futureRows + '</div>' +
          '<div class="cust-colpick-actions">' +
            '<button id="cust-colpick-cancel" class="cust-filter">ביטול</button>' +
            '<button id="cust-colpick-save" class="cust-list-new">שמור</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(host.firstChild);

    var bg = document.getElementById('cust-colpick-bg');
    bg.addEventListener('click', function (ev) { if (ev.target === bg) bg.remove(); });
    document.getElementById('cust-colpick-cancel').addEventListener('click', function () { bg.remove(); });

    // Bind future-column coming-soon
    bg.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      window.bindComingSoon(el, el.getAttribute('data-coming-soon'));
    });

    document.getElementById('cust-colpick-save').addEventListener('click', async function () {
      var chosen = [];
      bg.querySelectorAll('input[data-col-id]').forEach(function (input) {
        if (input.checked) chosen.push(input.getAttribute('data-col-id'));
      });
      if (!chosen.length) chosen = window.DEFAULT_LIST_COLUMNS.slice();
      try {
        if (window.M5Card && window.M5Card.trace) window.M5Card.trace('save_list_columns_called', { cols: chosen });
      } catch (_) {}
      var res = await window.saveTenantListColumns(chosen);
      try {
        if (window.M5Card && window.M5Card.trace) window.M5Card.trace('save_list_columns_resolved', { error: res.error ? String(res.error.message || res.error) : null });
      } catch (_) {}
      if (res.error) {
        Toast.error('שמירת העמודות נכשלה: ' + (res.error.message || 'unknown'));
        return;
      }
      Toast.success('עמודות נשמרו.');
      bg.remove();
      // Update the live list state + re-render
      if (window.__customerListState) {
        window.__customerListState.activeColumns = chosen;
      }
      if (typeof window.__customerListRerender === 'function') {
        window.__customerListRerender();
      }
    });
  };
})();
