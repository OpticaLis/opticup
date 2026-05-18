// lens-pricing-grid.js — TableBuilder consumer for the pricing table.
// M1_LENS_PRICING_REBUILD (2026-05-17). 8 columns per mockup:
//   select | סדרה / וריאנט | מותג | מחיר קטלוגי | הנחה % | מחיר סופי | עלות (gated) | פרטים
//
// Cost column carries .col-permission-gated + data-permission="inventory.view_cost_price"
// (PermissionUI hides for users without the key). Sell-price column shows the
// LensPriceResolver result (catalog price × overlay discount = final).
// In view-mode=readonly, the inline-edit inputs become read-only spans.

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _isEditMode() {
    return window.LensPricing.viewMode === 'edit';
  }

  function _applyFilters(offerings) {
    const sup   = window.LensPricing.supplierFilter;
    const brand = window.LensPricing.brandFilter;
    const variantById = new Map(window.LensPricing.variants.map(v => [v.id, v]));
    const designById  = new Map(window.LensPricing.designs.map(d => [d.id, d]));
    return offerings.filter(o => {
      if (sup !== 'all' && o.supplier_id !== sup) return false;
      const v = variantById.get(o.variant_id);
      if (!v) return false;
      const d = designById.get(v.design_id);
      if (!d) return false;
      if (brand !== 'all' && d.brand_id !== brand) return false;
      return true;
    });
  }

  function _buildRows() {
    const variantById = new Map(window.LensPricing.variants.map(v => [v.id, v]));
    const designById  = new Map(window.LensPricing.designs.map(d => [d.id, d]));
    const brandById   = new Map(window.LensPricing.brands.map(b => [b.id, b]));
    const filtered = _applyFilters(window.LensPricing.offerings || []);
    return filtered.map(o => {
      const v = variantById.get(o.variant_id) || {};
      const d = designById.get(v.design_id) || {};
      const b = brandById.get(d.brand_id) || {};
      const price = window.LensPricing.effectivePrices.get(o.id);
      return {
        id: o.id,
        offering: o,
        _variant: v,
        _design: d,
        _brand_name: b.name,
        _price: price
      };
    });
  }

  // ─── Column renderers ──────────────────────────────────────────
  function _renderSelect(_v, row) {
    if (!_isEditMode()) return '<span style="opacity:0.4;">—</span>';
    const checked = window.LensPricing.selectedRowIds.has(row.id) ? 'checked' : '';
    return '<input type="checkbox" data-select-offering="' + _esc(row.id) + '" ' + checked + ' />';
  }

  function _renderDesignVariant(_v, row) {
    const v = row._variant || {};
    const d = row._design || {};
    const sub = [v.refractive_index || '?', v.diameter_mm ? v.diameter_mm + 'mm' : '?', v.coating || ''].filter(Boolean).join(' · ');
    return '<div style="font-weight:600;">' + _esc(d.name || '—') + '</div>' +
           '<div style="font-size:11px; color:#94a3b8;">' + _esc(sub) + '</div>';
  }

  function _renderBrand(_v, row) {
    return '<span style="color:#1e3a8a; font-weight:500;">' + _esc(row._brand_name || '—') + '</span>';
  }

  function _renderCatalogPrice(_v, row) {
    const amt = row.offering && row.offering.price_amount;
    if (amt == null) return '<span style="color:#94a3b8;">—</span>';
    return '<span class="currency-tag">₪</span> <span style="font-weight:600;">' + _esc(Number(amt).toFixed(0)) + '</span>';
  }

  function _renderDiscount(_v, _row) {
    return '<span style="color:#64748b; font-size:11px;">—</span>';
  }

  function _renderFinalPrice(_v, row) {
    if (row._price == null) return '<span style="color:#94a3b8;">—</span>';
    if (!_isEditMode()) {
      return '<span style="font-weight:600; color:#27ae60;">₪' + _esc(Number(row._price).toFixed(0)) + '</span>';
    }
    return '<input type="text" class="edit-only" data-edit-price="' + _esc(row.id) + '" value="₪' + _esc(Number(row._price).toFixed(0)) + '" style="width:70px; padding:4px 6px; border:1px solid #d0d4d9; border-radius:4px; font-size:12px; font-weight:600; color:#27ae60;" />';
  }

  function _renderCost(_v, row) {
    const cost = row.offering && row.offering.cost_amount;
    if (cost == null) return '<span style="color:#94a3b8;">—</span>';
    return '<span>₪' + _esc(Number(cost).toFixed(0)) + '</span>';
  }

  function _renderDetailsBtn(_v, row) {
    return '<button type="button" class="row-action-btn" data-open-drawer="' + _esc(row.offering.variant_id || '') + '" style="font-size:11px; padding:5px 10px; border:1px solid #1e3a8a; color:#1e3a8a; background:white; border-radius:4px; cursor:pointer;">פרטים נוספים</button>';
  }

  // ─── Delegated handlers ───────────────────────────────────────
  function _attachHandlers(containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.wired === '1') return;
    container.dataset.wired = '1';
    container.addEventListener('change', function (e) {
      const cb = e.target && e.target.matches('[data-select-offering]') ? e.target : null;
      if (!cb) return;
      const id = cb.dataset.selectOffering;
      if (cb.checked) window.LensPricing.selectedRowIds.add(id);
      else window.LensPricing.selectedRowIds.delete(id);
      _updateBulkToolbar();
    });
    container.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest && e.target.closest('[data-open-drawer]');
      if (!btn) return;
      const variantId = btn.dataset.openDrawer;
      if (variantId && window.LensPricingDrawer && window.LensPricingDrawer.openForVariant) {
        window.LensPricingDrawer.openForVariant(variantId);
      }
    });
  }

  function _updateBulkToolbar() {
    const toolbar = document.getElementById('lens-pricing-bulk-toolbar');
    if (!toolbar) return;
    const count = window.LensPricing.selectedRowIds.size;
    if (!_isEditMode() || count === 0) { toolbar.style.display = 'none'; return; }
    toolbar.style.display = '';
    const countEl = document.getElementById('bulk-selected-count');
    if (countEl) countEl.textContent = String(count);
  }

  function _updateMeta() {
    const el = document.getElementById('lens-pricing-table-meta');
    if (!el) return;
    const total = window.LensPricing.offerings.length;
    const shown = _applyFilters(window.LensPricing.offerings).length;
    el.textContent = shown + ' / ' + total + ' שורות';
  }

  function init() {
    if (!window.TableBuilder) return;
    const instance = window.TableBuilder.create({
      containerId: 'lens-pricing-grid',
      columns: [
        { key: '_select',         label: '',              width: '34px', render: _renderSelect },
        { key: '_design_variant', label: 'סדרה / וריאנט',                render: _renderDesignVariant },
        { key: '_brand',          label: 'מותג',                          render: _renderBrand },
        { key: '_catalog_price',  label: 'מחיר קטלוגי',                   render: _renderCatalogPrice },
        { key: '_discount',       label: 'הנחה %',                        render: _renderDiscount },
        { key: '_final_price',    label: 'מחיר סופי',                     render: _renderFinalPrice },
        { key: '_cost',           label: 'עלות',          permission: 'inventory.view_cost_price', cssClass: 'col-permission-gated', render: _renderCost },
        { key: '_details',        label: 'פרטים',         cssClass: 'tb-td-center', render: _renderDetailsBtn }
      ],
      rowId: 'id',
      emptyState: { icon: '💰', text: 'אין הצעות מסחר תואמות לסינון הנוכחי' },
      stickyHeader: true
    });
    window.LensPricing.table = instance;
    instance.setData(_buildRows());
    _attachHandlers('lens-pricing-grid');
    _updateMeta();
    _updateBulkToolbar();
  }

  function refresh() {
    if (!window.LensPricing.table) { init(); return; }
    window.LensPricing.table.setData(_buildRows());
    _updateMeta();
    _updateBulkToolbar();
  }

  window.LensPricingGrid = { init, refresh };
})();
