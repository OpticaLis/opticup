// lens-goods-receipt-supplier.js — supplier picker + context banner
// Loads active suppliers; on change loads expected lines + reveals supplier-context banner.

(function () {
  'use strict';

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  async function loadSuppliers() {
    const tid = getTenantId();
    if (!tid) throw new Error('tenant_id missing');
    const rows = await fetchAll(T.SUPPLIERS, {
      select: 'id, name, supplier_number, default_currency, contact, phone, email',
      filter: { tenant_id: tid, active: true },
      order: { column: 'name', ascending: true },
    });
    window.LensGR.suppliers = rows || [];
    renderOptions();
    bindChange();
  }

  function renderOptions() {
    const sel = document.getElementById('gr-supplier-select');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— בחר ספק —</option>';
    window.LensGR.suppliers.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = (s.supplier_number ? '#' + s.supplier_number + ' · ' : '') + (s.name || '(ללא שם)');
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  }

  function bindChange() {
    const sel = document.getElementById('gr-supplier-select');
    if (!sel) return;
    sel.addEventListener('change', async function () {
      const id = sel.value || null;
      window.LensGR.supplierId = id;
      const row = window.LensGR.suppliers.find(function (s) { return s.id === id; });
      window.LensGR.supplierRow = row || null;
      window.LensGR.expectedLines = [];
      window.LensGR.receiptLines = [];
      // Keep manual lines across supplier changes? No — they are supplier-scoped. Reset.
      window.LensGR.manualLines = [];
      updateContextBanner();
      if (id) await window.LensGRLines.loadExpectedLines();
      else {
        const c = document.getElementById('lines-container');
        if (c) c.innerHTML = '<div class="empty-state">בחר ספק כדי לטעון הזמנות פתוחות.</div>';
      }
      window.LensGR.recomputeSummary();
    });
  }

  function updateContextBanner() {
    const ctx = document.getElementById('supplier-context');
    const row = window.LensGR.supplierRow;
    if (!ctx) return;
    if (!row) { ctx.classList.remove('visible'); return; }
    ctx.classList.add('visible');
    const nameEl = document.getElementById('ctx-supplier-name');
    if (nameEl) nameEl.textContent = row.name || '(ללא שם)';
    const metaEl = document.getElementById('ctx-supplier-meta');
    if (metaEl) {
      const bits = [];
      if (row.contact) bits.push('איש קשר: ' + row.contact);
      if (row.phone) bits.push(row.phone);
      if (row.email) bits.push(row.email);
      metaEl.textContent = bits.join(' · ') || '—';
    }
  }

  window.LensGRSupplier = { loadSuppliers, updateContextBanner };
})();
