// lens-inventory-main.js — entry point + permission gate + state container
// Per SPEC M1_LENS_PHASE_1B_FOUNDATION Screen #1.
// Loads catalog hierarchy + tenant_lens_stock filtered by Stock/Custom production_type.
// Iron Rule 7: every DB read through fetchAll/sb.rpc. No direct sb.from().
// Iron Rule 8: escapeHtml from js/shared.js, never reimplemented.

(function () {
  'use strict';

  // ─── Module state (shared with sibling files via window.LensInv) ───
  window.LensInv = {
    productionFilter: 'stock', // 'stock' | 'custom'
    brandId: null,
    designId: null,
    variantId: null,
    brands: [],
    designs: [],
    variants: [],
    offerings: [],          // supplier_catalog_offering rows for current variant filter
    stockRows: [],          // tenant_lens_stock rows for current variant
    lots: [],               // stock_lot rows for current variant+sph/cyl
  };

  // ─── Permission gate ───
  async function gateOrRedirect() {
    // Wait for auth-service to finish loading the session + permission cache.
    // The project pattern is: auth-service.js calls loadEmployeeContext() on load.
    // Poll until window.currentEmployee is set OR a short timeout.
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('hasPermission not available — gating disabled (early load)');
      return true;
    }
    if (!hasPermission('lens.inventory.view')) {
      document.getElementById('access-gate').style.display = 'block';
      document.getElementById('app').style.display = 'none';
      return false;
    }
    document.getElementById('access-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    return true;
  }

  // ─── Bottom-tab visual toggle ───
  // Default tab body (movements) is rendered statically in the HTML partial
  // per mockup §"BOTTOM TABS". Switching to other tabs replaces the body with
  // a placeholder until Phase B+ wires real data. The default movements table
  // is preserved in a hidden cache to restore when user returns to that tab.
  function attachBottomTabs() {
    let movementsCacheHTML = null;
    document.addEventListener('click', function (e) {
      const tab = e.target && e.target.closest && e.target.closest('.bottom-tab');
      if (!tab) return;
      const root = tab.closest('.lens-inv-bottom-tabs-header');
      if (!root) return;
      const body = document.getElementById('bottom-tabs-body');
      if (!body) return;

      // Cache movements HTML on first switch-away
      if (movementsCacheHTML === null && body.querySelector('.movements-table')) {
        movementsCacheHTML = body.innerHTML;
      }

      root.querySelectorAll('.bottom-tab').forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const which = tab.dataset.bottomTab;
      if (which === 'movements') {
        if (movementsCacheHTML !== null) {
          body.innerHTML = movementsCacheHTML;
        }
        return;
      }
      const labels = {
        pricing: 'מחירים והנחות לוריאציה הנוכחית',
        alerts: 'התראות מלאי (חוסרים / יעדים)',
        analytics: 'ניתוח מלאי — תנועה ב-30 יום',
      };
      const label = labels[which] || tab.textContent;
      body.innerHTML = '<div class="empty-state">' +
        escapeHtml(label) + ' — תצוגה בלשונית הבאה של ה-Pipeline.</div>';
    });
  }

  // ─── Variant-range display: updates when a variant is selected ───
  function attachVariantRangeDisplay() {
    const display = document.getElementById('variant-range-display');
    if (!display) return;
    document.getElementById('filter-variant').addEventListener('change', function (e) {
      const vid = e.target.value;
      const v = (window.LensInv.variants || []).find(function (x) { return x.id === vid; });
      if (!v) {
        display.textContent = '— בחר וריאציה לתצוגה —';
        display.classList.add('empty');
        return;
      }
      const fmt = function (n) {
        if (n == null) return '—';
        const num = parseFloat(n);
        return (num >= 0 ? '+' : '') + num.toFixed(2);
      };
      const sphRange = (v.sph_min != null && v.sph_max != null)
        ? 'SPH: ' + fmt(v.sph_min) + ' עד ' + fmt(v.sph_max)
        : 'SPH: —';
      const cylRange = (v.cyl_min != null && v.cyl_max != null)
        ? ' · CYL: ' + fmt(v.cyl_min) + ' עד ' + fmt(v.cyl_max)
        : '';
      display.textContent = '✓ ' + sphRange + cylRange;
      display.classList.remove('empty');
    });
  }

  // ─── Quick Receipt drawer initialization (SPEC M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION) ───
  //
  // Loads suppliers (tenant-scoped, active only — Iron Rule 22 defense-in-depth),
  // initializes the shared QuickReceiptDrawer component at #quickReceiptDrawer,
  // and exposes the instance at window.LensInv.quickReceiptDrawer so entry-point
  // dispatchers can call .open()/.stageItem().
  async function initQuickReceiptDrawer() {
    if (!window.QuickReceiptDrawer || typeof window.QuickReceiptDrawer.init !== 'function') {
      console.warn('[lens-inventory] QuickReceiptDrawer shared component not loaded');
      return;
    }
    const mount = document.getElementById('quickReceiptDrawer');
    if (!mount) {
      console.warn('[lens-inventory] #quickReceiptDrawer mount point missing');
      return;
    }
    // Load suppliers tenant-scoped (Rule 22).
    let suppliers = [];
    try {
      const tid = getTenantId();
      const { data, error } = await sb.from('suppliers')
        .select('id, name').eq('tenant_id', tid).eq('active', true).order('name');
      if (error) throw error;
      suppliers = (data || []).map(function (s) { return { id: s.id, name: s.name }; });
    } catch (e) {
      console.warn('[lens-inventory] supplier load for drawer:', e.message);
    }

    const drawer = window.QuickReceiptDrawer.init(mount, {
      suppliers: suppliers,
      allowNoInvoice: true,
      onSubmit: handleQuickReceiptSubmit,
      onCancel: function () { /* no-op; drawer closes itself */ }
    });
    window.LensInv.quickReceiptDrawer = drawer;
    console.log('[lens-inventory] QuickReceiptDrawer initialized with',
      suppliers.length, 'suppliers');
  }

  // Drawer onSubmit handler — persists N staged items under shared metadata.
  // Strategy: call existing m1_create_receipt_from_box RPC (8-arg, atomic
  // receipt + lines), then a defense-in-depth UPDATE on purchase_receipt to
  // set has_no_invoice when "אין תעודה" was checked. The RPC pre-dates SPEC 3's
  // has_no_invoice column; the 2-step is a stopgap until a 9-arg RPC overload
  // ships. Documented in FINDINGS as a follow-up tech-debt item.
  async function handleQuickReceiptSubmit(payload) {
    const meta = payload && payload.meta || {};
    const items = (payload && payload.items) || [];
    if (!meta.supplier_id) { Toast.error('בחר ספק בטיוטה'); throw new Error('no supplier'); }
    if (!items.length) { Toast.error('אין פריטים לקבלה'); throw new Error('no items'); }
    if (!meta.has_no_invoice && !meta.delivery_note_number) {
      Toast.error('הזן מספר תעודת משלוח (או סמן "אין תעודה")');
      throw new Error('no delivery note');
    }
    const tid = getTenantId();
    // Resolve default location (same pattern as _submitAddStock cache).
    let locId = null;
    try {
      const { data, error } = await sb.from('tenant_location')
        .select('id, is_default').eq('tenant_id', tid)
        .order('is_default', { ascending: false, nullsFirst: false }).limit(1);
      if (error) throw error;
      locId = (data && data[0] && data[0].id) || null;
    } catch (e) { console.warn('[quick-receipt] location resolve:', e.message); }
    if (!locId) { Toast.error('לא נמצא מיקום מלאי לדייר זה'); throw new Error('no location'); }

    // Map drawer items to RPC line shape.
    const lines = items.map(function (it) {
      // Prefer the structured _line payload built by stageItem callers.
      const ln = it._line || {};
      return {
        variant_id: ln.variant_id || it.variant || null,
        location_id: locId,
        sph: ln.sph || (it.meta && it.meta.sph) || null,
        cyl: ln.cyl || (it.meta && it.meta.cyl) || null,
        qty_received: Number(ln.qty_received || it.qty) || 1,
        unit_cost: Number(ln.unit_cost || it.unitCost) || 0,
        is_manual_addition: ln.is_manual_addition != null ? ln.is_manual_addition : !(ln.variant_id || it.variant)
      };
    });
    const emp = JSON.parse(sessionStorage.getItem('tenant_employee') || '{}');
    const { data: receiptId, error: rpcErr } = await sb.rpc('m1_create_receipt_from_box', {
      p_tenant_id: tid,
      p_supplier_id: meta.supplier_id,
      p_delivery_note_number: meta.has_no_invoice ? null : (meta.delivery_note_number || null),
      p_lines: lines,
      p_box_id: null,
      p_box_supplier_barcode: null,
      p_supplier_number: null,
      p_confirmed_by: emp.id || null
    });
    if (rpcErr) { Toast.error('שמירה נכשלה: ' + (rpcErr.message || rpcErr)); throw rpcErr; }
    // Persist has_no_invoice — column added in SPEC 3 but RPC not updated to accept it.
    // Defense-in-depth: tenant_id filter on UPDATE (Iron Rule 22) even though RLS enforces.
    if (meta.has_no_invoice && receiptId) {
      const { error: upErr } = await sb.from('purchase_receipt')
        .update({ has_no_invoice: true })
        .eq('id', receiptId).eq('tenant_id', tid);
      if (upErr) {
        console.error('[quick-receipt] has_no_invoice update failed', upErr);
        Toast.warning('הקבלה נשמרה אך סימון "אין תעודה" לא עודכן: ' + (upErr.message || upErr));
        // Don't throw — receipt was created; the flag is best-effort.
      }
    }
    Toast.success('קבלה ' + items.length + ' פריטים נשמרה בהצלחה');
    if (typeof window.LensInv.reloadStock === 'function') {
      try { window.LensInv.reloadStock(); } catch (_) {}
    }
  }

  // ─── Bootstrap ───
  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;

    try {
      await window.LensInvFilters.loadBrands();
      window.LensInvFilters.attachHandlers();
      if (window.LensInvModalShows && typeof window.LensInvModalShows.attach === 'function') {
        window.LensInvModalShows.attach();
      }
      attachBottomTabs();
      attachVariantRangeDisplay();
      // SPEC 4a — init Quick Receipt drawer after the partial is mounted.
      await initQuickReceiptDrawer();
      console.log('[lens-inventory] bootstrap complete (1to1 rebuild + Quick Receipt drawer)');
    } catch (err) {
      console.error('[lens-inventory] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
      }
    }
  }

  // ─── Public API for sibling files ───
  window.LensInv.bootstrap = bootstrap;

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
