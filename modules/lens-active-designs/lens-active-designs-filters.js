// lens-active-designs-filters.js — 4 chip-filter rows via ChipFilter (SPEC 2 shared component)
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17) Commit 3.
//
// 4 rows per mockup:
//   1. Production type  (Stock / Custom / Both)  — drives offering query in tree.js
//   2. Status           (All / Active / Available / Private)
//   3. Lens type        (All / single_vision / bifocal / progressive / office)
//   4. Brand            (All / per-brand chips from loaded brands)

(function () {
  'use strict';

  let _instances = { prod: null, status: null, lensType: null, brand: null };

  function _onProdChange(ids) {
    const id = ids[0] || 'stock';
    window.LensAD.productionFilter = id;
    // Production filter changes the offerings query — full catalog reload.
    window.LensAD.refreshAll();
  }

  function _onStatusChange(ids) {
    window.LensAD.statusFilter = ids[0] || 'all';
    // Status filter applies to the rendered table only (no DB re-query).
    if (window.LensADTable) window.LensADTable.refresh();
  }

  function _onLensTypeChange(ids) {
    window.LensAD.lensTypeFilter = ids[0] || 'all';
    if (window.LensADTable) window.LensADTable.refresh();
  }

  function _onBrandChange(ids) {
    const id = ids[0] || 'all';
    window.LensAD.brandIdFilter = (id === 'all') ? null : id;
    if (window.LensADTable) window.LensADTable.refresh();
  }

  function _buildBrandChips() {
    const brands = window.LensAD.brands || [];
    // Only include brands that have at least one design (drops 0-count brands per mockup)
    const designsByBrand = new Map();
    (window.LensAD.designs || []).forEach(d => {
      designsByBrand.set(d.brand_id, (designsByBrand.get(d.brand_id) || 0) + 1);
    });
    const chips = [{ id: 'all', label: 'הכל', count: window.LensAD.designs.length || 0 }];
    brands.forEach(b => {
      const count = designsByBrand.get(b.id) || 0;
      if (count === 0) return;
      chips.push({ id: b.id, label: b.name, count: count, variant: 'secondary' });
    });
    return chips;
  }

  function init() {
    if (!window.ChipFilter) { console.warn('[lens-ad-filters] ChipFilter unavailable'); return; }

    // Row 1: Production type
    const prodMount = document.getElementById('lens-ad-prod-filter-mount');
    if (prodMount) {
      _instances.prod = window.ChipFilter.init(prodMount, {
        label: 'סוג ייצור:',
        chips: [
          { id: 'stock',  label: 'מדף (Stock)', icon: '📦' },
          { id: 'custom', label: 'ייצור (Custom)', icon: '🏭' },
          { id: 'both',   label: 'שתיהן', icon: '🔀', variant: 'secondary' }
        ],
        activeIds: [window.LensAD.productionFilter],
        onSelect: _onProdChange
      });
    }

    // Row 2: Status
    const statusMount = document.getElementById('lens-ad-status-filter-mount');
    if (statusMount) {
      const s = window.LensAD.stats || {};
      _instances.status = window.ChipFilter.init(statusMount, {
        label: 'סטטוס:',
        chips: [
          { id: 'all',       label: 'הכל',          count: s.totalDesigns },
          { id: 'active',    label: '🟢 פעיל אצלי', count: s.activeDesigns },
          { id: 'available', label: '⚪ זמין',      count: s.unselected, variant: 'secondary' },
          { id: 'private',   label: '🔵 פרטי שלי',  count: s.privateSeries }
        ],
        activeIds: [window.LensAD.statusFilter],
        onSelect: _onStatusChange
      });
    }

    // Row 3: Lens type
    const lensTypeMount = document.getElementById('lens-ad-lenstype-filter-mount');
    if (lensTypeMount) {
      _instances.lensType = window.ChipFilter.init(lensTypeMount, {
        label: 'סוג עדשה:',
        chips: [
          { id: 'all',           label: 'הכל' },
          { id: 'single_vision', label: 'חד-מוקדי' },
          { id: 'bifocal',       label: 'דו-מוקדי' },
          { id: 'progressive',   label: 'מולטיפוקל' },
          { id: 'office',        label: 'פרוגרסיב משרדית' }
        ],
        activeIds: [window.LensAD.lensTypeFilter],
        onSelect: _onLensTypeChange
      });
    }

    // Row 4: Brand
    const brandMount = document.getElementById('lens-ad-brand-filter-mount');
    if (brandMount) {
      _instances.brand = window.ChipFilter.init(brandMount, {
        label: 'מותג:',
        chips: _buildBrandChips(),
        activeIds: [window.LensAD.brandIdFilter || 'all'],
        onSelect: _onBrandChange
      });
    }
  }

  function setStatus(id) {
    if (_instances.status && _instances.status.setActive) {
      _instances.status.setActive([id]);
    }
    window.LensAD.statusFilter = id;
    if (window.LensADTable) window.LensADTable.refresh();
  }

  function refresh() {
    // Brand chips depend on loaded designs/brands; status counts depend on stats.
    // Destroy + re-init both rows that source from dynamic data.
    if (_instances.status) try { _instances.status.destroy(); } catch (_) {}
    if (_instances.brand) try { _instances.brand.destroy(); } catch (_) {}
    init(); // re-mounts all 4 rows (idempotent — innerHTML replacement)
  }

  window.LensADFilters = { init, refresh, setStatus };
})();
