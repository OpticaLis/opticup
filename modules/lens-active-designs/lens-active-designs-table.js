// lens-active-designs-table.js — TableBuilder consumer with brand-group headers.
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17) Commit 4.
//
// Renders a 7-column table per LENS_DESIGNS_SELECTION_MOCKUP:
//   drag | סדרה | סוג | חומר | וריאנטים | סניפים פעילים | הפעל (toggle)
//
// Rows are interleaved with TableBuilder's _groupHeader synthetic rows
// (one per brand-group). Brand grouping respects the active filters
// (productionFilter via tree loader; statusFilter + lensTypeFilter +
// brandIdFilter applied client-side here).

(function () {
  'use strict';

  const LENS_TYPE_LABELS = {
    single_vision:      { label: 'חד-מוקדי',         klass: '' },
    bifocal:            { label: 'דו-מוקדי',         klass: '' },
    progressive:        { label: 'מולטיפוקל',         klass: 'progressive' },
    office:             { label: 'פרוגרסיב משרדית',  klass: 'office' },
    accessory_general:  { label: 'אביזר',              klass: '' },
    soft_contact:       { label: 'עדשת מגע',           klass: '' }
  };

  const MATERIAL_LABELS = {
    clear:        { label: 'שקוף',    klass: 'clear' },
    photochromic: { label: 'מתכהה',   klass: 'photo' },
    tinted:       { label: 'צבע',     klass: 'tint' },
    polaroid:     { label: 'פולורואיד', klass: 'tint' }
  };

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Custom renderers — return innerHTML strings; TableBuilder assigns via innerHTML.
  // All variable values are escaped through _esc.
  function _renderDesignName(_v, row) {
    const variants = row._variants || [];
    const indexes = Array.from(new Set(variants.map(v => v.refractive_index).filter(x => x != null))).sort();
    const coatings = Array.from(new Set(variants.map(v => v.coating).filter(Boolean)));
    const attrLine = (indexes.length ? indexes.join(' / ') : '') +
                     (coatings.length ? ' · ' + coatings.join(', ') : '');
    return '<div class="design-name">' + _esc(row.name) + '</div>' +
           (attrLine ? '<div class="design-attrs">' + _esc(attrLine) + '</div>' : '');
  }

  function _renderLensType(v) {
    const info = LENS_TYPE_LABELS[v] || { label: v || '—', klass: '' };
    return '<span class="lens-type-badge ' + _esc(info.klass) + '">' + _esc(info.label) + '</span>';
  }

  function _renderMaterial(v) {
    const info = MATERIAL_LABELS[v] || { label: v || '—', klass: 'clear' };
    return '<span class="material-badge ' + _esc(info.klass) + '">' + _esc(info.label) + '</span>';
  }

  function _renderVariantsCount(_v, row) {
    const count = (row._variants && row._variants.length) || 0;
    return '<span class="variants-pill">' + _esc(count) + ' וריאנטים</span>';
  }

  function _renderLocations(_v, row) {
    // For Phase 1 we show "active" badge if the design has ANY active offering.
    // Per-location toggle is in the side panel; the table only shows aggregate state.
    if (!row._anyActive) return '<span style="font-size:11px; color:#95a5a6;">— לא פעיל —</span>';
    return '<div class="location-pills">' +
           '<span class="location-pill active">ראשי</span>' +
           '<span class="location-pill active">שני</span>' +
           '</div>';
  }

  function _renderToggle(_v, row) {
    const checked = row._anyActive ? 'checked' : '';
    // We attach a custom onClick via TableBuilder.onRowClick OR a global delegated
    // handler — TableBuilder's row click fires for the whole row. To isolate the
    // toggle, we use a delegated listener on the table container (see _attachToggleHandler).
    return '<label class="toggle-switch" data-design-id="' + _esc(row.id) + '">' +
           '<input type="checkbox" ' + checked + ' data-design-id="' + _esc(row.id) + '" />' +
           '<span class="toggle-slider"></span></label>';
  }

  // ─── Visible-row filter ─────────────────────────────────────────
  function _applyFilters(designs) {
    const status   = window.LensAD.statusFilter   || 'all';
    const lensType = window.LensAD.lensTypeFilter || 'all';
    const brandId  = window.LensAD.brandIdFilter  || null;
    const offByDesign = window.LensAD.offeringsByDesign;
    const activeByOfferingId = new Map(
      (window.LensAD.activeOfferings || []).map(a => [a.offering_id, a])
    );
    const tid = getTenantId();
    const privateBrandIds = new Set(
      (window.LensAD.brands || []).filter(b => b.owner_tenant_id === tid).map(b => b.id)
    );

    return designs
      .filter(d => {
        const offs = offByDesign.get(d.id) || [];
        if (offs.length === 0) return false; // designs without offerings don't show
        const anyActive = offs.some(o => {
          const a = activeByOfferingId.get(o.id);
          return a && a.is_active === true;
        });
        d._anyActive = anyActive;
        d._variants = window.LensAD.variantsByDesign.get(d.id) || [];
        d._isPrivate = privateBrandIds.has(d.brand_id);

        if (brandId && d.brand_id !== brandId) return false;
        if (lensType !== 'all' && d.lens_type !== lensType) return false;
        if (status === 'active'    && !d._anyActive) return false;
        if (status === 'available' &&  d._anyActive) return false;
        if (status === 'private'   && !d._isPrivate) return false;
        return true;
      });
  }

  function _buildRows() {
    // Group designs by brand, then sort brands by name, then designs by name.
    const designs = _applyFilters(window.LensAD.designs || []);
    const brandsById = new Map((window.LensAD.brands || []).map(b => [b.id, b]));
    const designsByBrand = new Map();
    designs.forEach(d => {
      if (!designsByBrand.has(d.brand_id)) designsByBrand.set(d.brand_id, []);
      designsByBrand.get(d.brand_id).push(d);
    });
    // Build the interleaved row array: [group-header, ...designs, group-header, ...designs]
    const rows = [];
    const brandIds = Array.from(designsByBrand.keys()).sort((a, b) => {
      const an = (brandsById.get(a) || {}).name || '';
      const bn = (brandsById.get(b) || {}).name || '';
      return an.localeCompare(bn, 'he');
    });
    brandIds.forEach(bid => {
      const brand = brandsById.get(bid) || { name: '(unknown brand)' };
      const brandDesigns = designsByBrand.get(bid);
      const activeCount = brandDesigns.filter(d => d._anyActive).length;
      const totalCount  = brandDesigns.length;
      const tid = getTenantId();
      const isPrivate = brand.owner_tenant_id === tid;
      rows.push({
        _groupHeader: true,
        sourceType: isPrivate ? 'purple' : 'blue',
        label: brand.name + (isPrivate ? '  · פרטי שלי' : ''),
        count: activeCount + ' / ' + totalCount + ' פעיל',
        icon: isPrivate ? '★' : '🏷️'
      });
      brandDesigns
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'))
        .forEach(d => rows.push(d));
    });
    return rows;
  }

  function _attachToggleHandler(containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.toggleWired === '1') return;
    container.dataset.toggleWired = '1';
    container.addEventListener('change', function (e) {
      const inp = e.target && e.target.matches('.toggle-switch input[type="checkbox"]') ? e.target : null;
      if (!inp) return;
      const designId = inp.dataset.designId;
      const makeActive = !!inp.checked;
      // For the table-level toggle, we activate/deactivate ALL offerings of this design.
      // (Side panel offers per-location granularity.)
      _toggleAllOfferingsForDesign(designId, makeActive).catch(err => {
        console.error('[lens-ad-table] toggle failed', err);
        if (window.Toast) Toast.error('שגיאה: ' + (err.message || err));
        // Revert checkbox state if toggle failed
        inp.checked = !makeActive;
      });
    });
    // Row click → open side panel
    container.addEventListener('click', function (e) {
      // Ignore clicks on toggle / inside controls
      if (e.target.closest('.toggle-switch')) return;
      const tr = e.target.closest('tr.tb-row');
      if (!tr) return;
      const designId = tr.getAttribute('data-row-id');
      if (designId && window.LensADDetail) window.LensADDetail.show(designId);
    });
  }

  async function _toggleAllOfferingsForDesign(designId, makeActive) {
    const offs = window.LensAD.offeringsByDesign.get(designId) || [];
    if (!offs.length) return;
    // Use the existing toggle.js RPC sequentially (Promise.all for parallelism).
    // The RPC is atomic per (offering, location); we toggle for null location = all.
    await Promise.all(offs.map(o => window.LensADToggle.toggleOfferingSilent(o.id, makeActive)));
    if (window.Toast) Toast.success(makeActive ? 'הסדרה הופעלה' : 'הסדרה בוטלה');
    await window.LensAD.refreshAll();
  }

  function init() {
    if (!window.TableBuilder) { console.warn('[lens-ad-table] TableBuilder unavailable'); return; }

    const instance = window.TableBuilder.create({
      containerId: 'lens-ad-designs-table',
      columns: [
        { key: '_drag',          label: '',                     width: '32px',  render: () => '<span style="color:#cbd5e0;">⋮⋮</span>' },
        { key: 'name',           label: 'סדרה',                                 render: _renderDesignName },
        { key: 'lens_type',      label: 'סוג',                                  render: _renderLensType },
        { key: 'material',       label: 'חומר',                                 render: _renderMaterial },
        { key: '_variants_count',label: 'וריאנטים',                             render: _renderVariantsCount },
        { key: '_locations',     label: 'סניפים פעילים',                        render: _renderLocations },
        { key: '_toggle',        label: 'הפעל',          cssClass: 'tb-td-center', render: _renderToggle }
      ],
      rowId: 'id',
      emptyState: { icon: '🔍', text: 'אין סדרות תואמות לסינון הנוכחי' },
      stickyHeader: true
    });
    window.LensAD.table = instance;
    instance.setData(_buildRows());
    _attachToggleHandler('lens-ad-designs-table');
  }

  function refresh() {
    if (!window.LensAD.table) { init(); return; }
    window.LensAD.table.setData(_buildRows());
  }

  window.LensADTable = { init, refresh };
})();
