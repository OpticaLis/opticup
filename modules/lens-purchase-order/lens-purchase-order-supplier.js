// lens-purchase-order-supplier.js — supplier picker + supplier change handler
// Loads active suppliers for current tenant, populates the dropdown, and on change
// triggers shortages reload for the picked supplier.

(function () {
  'use strict';

  async function loadSuppliers() {
    const tid = getTenantId();
    if (!tid) throw new Error('tenant_id missing');
    // Iron Rule 7: fetchAll(tableName, filters) where filters is an array of [col, op, val] tuples
    // (per js/supabase-ops.js:78). tenant_id is auto-added by the wrapper.
    const rows = await fetchAll(T.SUPPLIERS, [['active', 'eq', true]]);
    (rows || []).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'he'); });
    window.LensPO.suppliers = rows || [];
    renderSupplierOptions();
    bindSupplierChange();
  }

  function renderSupplierOptions() {
    const sel = document.getElementById('po-supplier-select');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— בחר ספק —</option>';
    window.LensPO.suppliers.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      // escapeHtml-safe: use textContent on Option (browser handles encoding)
      opt.textContent = (s.supplier_number ? '#' + s.supplier_number + ' · ' : '') + (s.name || '(ללא שם)');
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  }

  function bindSupplierChange() {
    const sel = document.getElementById('po-supplier-select');
    if (!sel) return;
    sel.addEventListener('change', async function () {
      const id = sel.value || null;
      window.LensPO.supplierId = id;
      const row = window.LensPO.suppliers.find(function (s) { return s.id === id; });
      window.LensPO.supplierRow = row || null;
      // Reset lines on supplier change to avoid mixing supplier sources
      window.LensPO.lines = [];
      window.LensPO.poId = null;
      window.LensPO.poNumber = null;
      window.LensPO.poStatus = null;
      const sentBtn = document.getElementById('btn-mark-sent');
      if (sentBtn) sentBtn.style.display = 'none';
      const badge = document.getElementById('po-status-badge');
      if (badge) badge.textContent = 'טיוטה חדשה';
      if (id) {
        await window.LensPOShortages.reloadForCurrentSupplier();
      } else {
        const c = document.getElementById('lines-container');
        if (c) c.innerHTML = '<div class="empty-state">בחר ספק כדי לטעון חוסרים.</div>';
      }
      window.LensPO.recomputeSummary();
    });
  }

  window.LensPOSupplier = { loadSuppliers, renderSupplierOptions };
})();
