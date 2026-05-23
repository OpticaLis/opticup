/* ============================================================
   M5 Customer List — Filters + phone-query normalization.
   normalizePhoneQuery: strip non-digits + leading zero. Used so a
   user typing "050-3348349" / "0503348349" / "503348349" matches
   against the +972 E.164 storage format via suffix ILIKE.
   ============================================================ */
(function () {
  'use strict';

  /**
   * Normalize a phone search query to digit-suffix matching.
   * Strips non-digit chars + a single leading '0' (Israeli local prefix).
   * Example: "050-3348349" → "503348349"; "0503348349" → "503348349";
   *          "+972503348349" → "972503348349". The caller then does ILIKE %<n>%.
   * @param {string} q
   * @returns {string} digit-only suffix; '' if input had no digits
   */
  window.normalizePhoneQuery = function (q) {
    if (!q) return '';
    var digits = String(q).replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.charAt(0) === '0') digits = digits.slice(1);
    return digits;
  };

  // Lifecycle filter pills — top filter pills row in the mockup.
  // 3 wired filters (the lifecycle subset), 7 blurred coming-soon.
  window.CUSTOMER_LIST_PILLS = [
    { id: 'all',       label: 'הכל',                wired: true,  filter: null },
    { id: 'active',    label: 'פעילים',             wired: true,  filter: { lifecycle_stage: 'active' } },
    { id: 'leads',     label: 'לידים',              wired: true,  filter: { lifecycle_stage: 'lead' } },
    { id: 'queue_today', label: 'תור היום',         wired: false, coming_soon: 'sidebar_appointments' },
    { id: 'ready_pickup', label: 'מוכנים-לאיסוף',   wired: false, coming_soon: 'orders_m7_ui' },
    { id: 'in_lab',    label: 'במעבדה',             wired: false, coming_soon: 'sidebar_kds' },
    { id: 'repairs',   label: 'תיקונים',            wired: false, coming_soon: 'orders_m7_ui' },
    { id: 'tasks',     label: 'משימות',             wired: false, coming_soon: 'sidebar_appointments' },
    { id: 'loyalty',   label: 'חברי-מועדון',        wired: false, coming_soon: 'loyalty_tier' },
    { id: 'open_debt', label: 'חוב פתוח',           wired: false, coming_soon: 'orders_m7_ui' }
  ];

  window.renderListFilterPills = function (activeId) {
    activeId = activeId || 'all';
    return '<div class="cust-list-pills">' +
      window.CUSTOMER_LIST_PILLS.map(function (p) {
        var cls = 'cust-list-pill' +
                  (p.wired ? '' : ' cust-blurred') +
                  (p.id === activeId && p.wired ? ' active' : '');
        var attrs = ' data-pill-id="' + escapeHtml(p.id) + '"';
        if (!p.wired) attrs += ' data-coming-soon="' + escapeHtml(p.coming_soon) + '"';
        return '<button class="' + cls + '"' + attrs + '>' + escapeHtml(p.label) + '</button>';
      }).join('') + '</div>';
  };

  /**
   * Apply pill filter to a list of customer rows (client-side, after the
   * initial fetch). For Prizma scale (1,296 rows) the server-side LIMIT
   * keeps the fetch bounded; pill filtering then narrows the visible set.
   * @param {Array} rows
   * @param {string} pillId
   * @param {Object} lifecycleById  — { customer_id: lifecycle_stage } for join lookups
   */
  window.applyListPillFilter = function (rows, pillId, lifecycleById) {
    var pill = window.CUSTOMER_LIST_PILLS.find(function (p) { return p.id === pillId; });
    if (!pill || !pill.wired || !pill.filter) return rows;
    var f = pill.filter;
    return rows.filter(function (r) {
      if (f.lifecycle_stage) {
        return (lifecycleById && lifecycleById[r.id]) === f.lifecycle_stage;
      }
      return true;
    });
  };

  /**
   * Apply free-text search to rows. Name = full_name/first_name/last_name (case-insensitive
   * substring); id_number = substring; phone = normalized suffix ILIKE.
   * Returns the filtered subset.
   */
  window.applyListSearch = function (rows, query) {
    if (!query) return rows;
    var q = String(query).trim();
    if (!q) return rows;
    var qLower = q.toLowerCase();
    var phoneNorm = window.normalizePhoneQuery(q);

    return rows.filter(function (r) {
      // Name (most common)
      var name = (r.full_name || '').toLowerCase();
      var fn   = (r.first_name || '').toLowerCase();
      var ln   = (r.last_name || '').toLowerCase();
      if (name.indexOf(qLower) >= 0 || fn.indexOf(qLower) >= 0 || ln.indexOf(qLower) >= 0) return true;
      // id_number
      if (r.id_number && String(r.id_number).indexOf(q) >= 0) return true;
      // phone — normalized suffix match
      if (phoneNorm && r.phone) {
        var phoneDigits = String(r.phone).replace(/[^0-9]/g, '');
        if (phoneDigits.indexOf(phoneNorm) >= 0) return true;
      }
      // customer_number display ("02STA00001" → match on the numeric portion)
      if (r.customer_number_display && String(r.customer_number_display).toLowerCase().indexOf(qLower) >= 0) return true;
      return false;
    });
  };
})();
