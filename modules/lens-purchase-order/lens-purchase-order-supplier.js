// lens-purchase-order-supplier.js — supplier picker + change handler + side-card render
// Iron Rule 7: reads via fetchAll wrapper. Iron Rule 22: tenant scoped.

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function loadSuppliers() {
    const tid = getTenantId();
    if (!tid) throw new Error('tenant_id missing');
    const rows = await fetchAll(T.SUPPLIERS, [['active', 'eq', true]]);
    (rows || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
    window.LensPO.suppliers = rows || [];
    renderSupplierOptions();
    bindSupplierChange();
  }

  function renderSupplierOptions() {
    const sel = document.getElementById('po-supplier-select');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— בחר ספק —</option>';
    window.LensPO.suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = (s.supplier_number ? '#' + s.supplier_number + ' · ' : '') + (s.name || '(ללא שם)');
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  }

  function renderSupplierInfoCard(supplier) {
    const card = document.getElementById('po-supplier-info');
    const nameEl = document.getElementById('po-supplier-name');
    const metaEl = document.getElementById('po-supplier-meta-lines');
    if (!card || !nameEl || !metaEl) return;
    if (!supplier) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    nameEl.textContent = supplier.name || '(ללא שם)';
    const parts = [];
    if (supplier.phone) parts.push('טלפון: ' + esc(supplier.phone));
    if (supplier.email) parts.push('אימייל: ' + esc(supplier.email));
    if (supplier.payment_terms) parts.push('תנאי תשלום: <strong>' + esc(supplier.payment_terms) + '</strong>');
    if (supplier.default_currency) parts.push('מטבע ברירת מחדל: ' + esc(supplier.default_currency));
    metaEl.innerHTML = parts.join('<br>');
  }

  function bindSupplierChange() {
    const sel = document.getElementById('po-supplier-select');
    if (!sel) return;
    sel.addEventListener('change', async function () {
      const id = sel.value || null;
      window.LensPO.supplierId = id;
      const row = window.LensPO.suppliers.find(s => s.id === id);
      window.LensPO.supplierRow = row || null;
      // Reset on supplier change so lines never mix supplier sources
      window.LensPO.lines = [];
      window.LensPO.poId = null;
      window.LensPO.poNumber = null;
      window.LensPO.poStatus = null;
      const sentBtn = document.getElementById('btn-mark-sent');
      const cancelBtn = document.getElementById('btn-cancel-po');
      if (sentBtn) sentBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      const badge = document.getElementById('po-status-badge');
      if (badge) badge.textContent = 'טיוטה חדשה';
      renderSupplierInfoCard(row);
      if (id) {
        window.LensPO.setStep(window.LensPO.STEP.ITEMS);
        await window.LensPOShortages.reloadForCurrentSupplier();
      } else {
        window.LensPO.setStep(window.LensPO.STEP.SUPPLIER);
        const c = document.getElementById('lines-container');
        if (c) c.innerHTML = '<div class="empty-state">בחר ספק כדי לטעון חוסרים.</div>';
        const banner = document.getElementById('po-info-banner');
        if (banner) banner.style.display = 'none';
      }
      window.LensPO.recomputeSummary();
    });
  }

  window.LensPOSupplier = { loadSuppliers, renderSupplierOptions, renderSupplierInfoCard };
})();
