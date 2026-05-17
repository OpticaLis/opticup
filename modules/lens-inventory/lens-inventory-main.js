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

  // ─── Header action buttons (Phase A shell — modals deferred) ───
  function attachHeaderActionStubs() {
    const messages = {
      reports: 'דוחות חוסרים/עודף — מודאל ייבנה בלשונית הבאה של ה-Pipeline',
      export: 'ייצוא Excel — ייבנה בלשונית הבאה של ה-Pipeline',
      search: 'חיפוש מתקדם — ייבנה בלשונית הבאה של ה-Pipeline',
      'scan-out': 'סריקה להורדה מהמלאי — מודאל ייבנה בלשונית הבאה של ה-Pipeline',
      'scan-in': 'סריקה להוספה למלאי — מודאל ייבנה בלשונית הבאה של ה-Pipeline',
      'bulk-add': 'Wizard הוספה מרובה — ייבנה בלשונית הבאה של ה-Pipeline',
    };
    document.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest && e.target.closest('[data-lens-inv-action]');
      if (!btn) return;
      const action = btn.dataset.lensInvAction;
      const msg = messages[action] || ('פעולה: ' + action);
      if (window.Toast && typeof Toast.info === 'function') Toast.info(msg);
      else if (window.Toast && typeof Toast.success === 'function') Toast.success(msg);
    });
  }

  // ─── Bottom-tab visual toggle (Phase A shell — tab bodies deferred) ───
  function attachBottomTabs() {
    document.addEventListener('click', function (e) {
      const tab = e.target && e.target.closest && e.target.closest('.bottom-tab');
      if (!tab) return;
      const root = tab.closest('.lens-inv-bottom-tabs-header');
      if (!root) return;
      root.querySelectorAll('.bottom-tab').forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      // Body content placeholder until follow-up Pipeline phase populates tab bodies.
      const body = document.querySelector('.lens-inv-bottom-tabs-body');
      if (body) {
        const labels = {
          movements: 'תנועות מלאי לוריאציה הנוכחית',
          pricing: 'מחירים והנחות לוריאציה הנוכחית',
          alerts: 'התראות מלאי (חוסרים / יעדים)',
          analytics: 'ניתוח מלאי — תנועה ב-30 יום',
        };
        const label = labels[tab.dataset.bottomTab] || tab.textContent;
        body.innerHTML = '<div class="empty-state">' +
          escapeHtml(label) + ' — תצוגה בלשונית הבאה של ה-Pipeline.</div>';
      }
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

  // ─── Bootstrap ───
  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;

    try {
      await window.LensInvFilters.loadBrands();
      window.LensInvFilters.attachHandlers();
      attachHeaderActionStubs();
      attachBottomTabs();
      attachVariantRangeDisplay();
      console.log('[lens-inventory] bootstrap complete (Phase A shell)');
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
