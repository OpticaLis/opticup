// lens-inventory-quick-scan.js — Quick Scan drawer (Phase C C-C3)
// Right-side slide-in drawer that replaces the prior scan-IN modal.
// Flow: barcode/display_id scan -> variant lookup -> qty + supplier + submit.
// Submit delegates to window.LensInvModalShows._submitAddStock (10-arg RPC,
// Phase C-C1 extension). Supplier dropdown pre-fills from tenant default.

(function () {
  'use strict';

  function _drawer() { return document.getElementById('drawer-quick-scan'); }
  function _setOpen(open) {
    var d = _drawer();
    if (!d) return;
    d.classList.toggle('active', !!open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  async function _loadSupplierOptions() {
    var sel = document.getElementById('drawer-qs-supplier');
    if (!sel) return;
    try {
      var tid = getTenantId();
      var { data: tenantRow } = await sb.from('tenants')
        .select('default_supplier_id').eq('id', tid).single();
      var defaultId = (tenantRow && tenantRow.default_supplier_id) || '';
      var { data: suppliers, error } = await sb.from('suppliers')
        .select('id, name').eq('tenant_id', tid).eq('active', true).order('name');
      if (error) throw error;
      var html = '<option value="">— בחר ספק —</option>';
      (suppliers || []).forEach(function(s) {
        html += '<option value="' + escapeHtml(s.id) + '"' +
                (s.id === defaultId ? ' selected' : '') + '>' +
                escapeHtml(s.name) + '</option>';
      });
      sel.innerHTML = html;
    } catch (e) { console.warn('quick-scan supplier load:', e.message); }
  }

  async function _resolveBarcodeToVariant(input) {
    if (!input) return null;
    var tid = getTenantId();
    // Lens variants are global (owner_tenant_id may be null); look up by display_id first.
    try {
      var { data, error } = await sb.from('lens_variant')
        .select('id, display_id, design_id, refractive_index, diameter_mm, lens_design(brand_id, name)')
        .ilike('display_id', input.trim())
        .eq('is_deleted', false)
        .limit(1);
      if (error) throw error;
      return (data && data[0]) || null;
    } catch (e) { console.warn('barcode resolve:', e.message); return null; }
  }

  function _renderResolvedVariant(v) {
    var box = document.getElementById('drawer-qs-resolved');
    if (!box) return;
    if (!v) {
      box.innerHTML = '<div class="qs-resolved-empty">לא נמצא — הזן SPH/CYL ידנית למטה.</div>';
      var manualRow = document.getElementById('drawer-qs-manual-row');
      if (manualRow) manualRow.style.display = '';
      box.dataset.variantId = '';
      return;
    }
    var design = v.lens_design || {};
    box.innerHTML =
      '<div class="qs-resolved-line"><strong>' + escapeHtml(v.display_id) +
      '</strong> · ' + escapeHtml(design.name || '') +
      ' · IDX ' + (v.refractive_index != null ? v.refractive_index : '?') +
      ' · ⌀ ' + (v.diameter_mm != null ? v.diameter_mm : '?') + 'mm</div>';
    box.dataset.variantId = v.id;
    var manualRow = document.getElementById('drawer-qs-manual-row');
    if (manualRow) manualRow.style.display = '';
  }

  async function _onBarcodeEnter() {
    var input = document.getElementById('drawer-qs-barcode');
    if (!input) return;
    var v = await _resolveBarcodeToVariant(input.value);
    _renderResolvedVariant(v);
  }

  async function _onSubmit() {
    // Post-debt-decoupling: delivery-note + undocumented checkbox UI removed;
    // _submitAddStock no longer accepts those params.
    var resolved = document.getElementById('drawer-qs-resolved');
    var variantId = resolved && resolved.dataset.variantId ? resolved.dataset.variantId : null;
    var qty = (document.getElementById('drawer-qs-qty') || {}).value;
    var cost = (document.getElementById('drawer-qs-cost') || {}).value;
    var sph = (document.getElementById('drawer-qs-sph') || {}).value;
    var cyl = (document.getElementById('drawer-qs-cyl') || {}).value;
    var supplier = (document.getElementById('drawer-qs-supplier') || {}).value;
    if (!window.LensInvModalShows || typeof window.LensInvModalShows._submitAddStock !== 'function') {
      Toast.error('שגיאת מערכת — חסר _submitAddStock');
      return;
    }
    var receiptId = await window.LensInvModalShows._submitAddStock({
      variant_id: variantId,
      sph: sph || null,
      cyl: cyl || null,
      qty_received: qty,
      unit_cost: cost,
      supplier_id: supplier,
      source: 'quick-scan'
    });
    if (receiptId) {
      _setOpen(false);
      ['drawer-qs-barcode','drawer-qs-sph','drawer-qs-cyl','drawer-qs-qty','drawer-qs-cost']
        .forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
      _renderResolvedVariant(null);
    }
  }

  function open() {
    _setOpen(true);
    _loadSupplierOptions();
    setTimeout(function() {
      var input = document.getElementById('drawer-qs-barcode');
      if (input) { input.value = ''; input.focus(); }
    }, 80);
  }
  function close() { _setOpen(false); }

  function attach() {
    // ESC + close button + barcode Enter
    document.addEventListener('keydown', function(e) {
      var d = _drawer();
      if (e.key === 'Escape' && d && d.classList.contains('active')) close();
    });
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.id === 'drawer-qs-close') close();
      if (t && t.id === 'drawer-qs-submit') _onSubmit();
    });
    document.addEventListener('keydown', function(e) {
      var t = e.target;
      if (e.key === 'Enter' && t && t.id === 'drawer-qs-barcode') { e.preventDefault(); _onBarcodeEnter(); }
    });
  }

  window.LensInvQuickScan = { open, close, attach };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
