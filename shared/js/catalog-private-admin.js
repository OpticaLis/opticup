/* catalog-private-admin.js — Store-CEO private catalog admin component
   Renders a 2-sub-tab Brand→Design→Variant UI on the unified `lens_brand`/
   `lens_design`/`lens_variant` hierarchy, filtered by product_type.

   Public API (window.CatalogPrivateAdmin.init):
     opts = {
       mountEl: HTMLElement,           // container to render into
       productType: 'glasses'|'contact_lens'|'accessory',
       sb: SupabaseClient,             // window.sb
       getTenantId: () => string,      // tenant uuid
       hasPermission: (k) => bool      // perm-key check
     }

   Behavior:
     - Sub-tab 'global': owner_tenant_id IS NULL AND product_type=opts.productType
       Read-only (no Add/Edit/Delete). Optional "Clone to Private" button on
       rows when hasPermission(<module>.catalog.private.manage).
     - Sub-tab 'private': owner_tenant_id = getTenantId() AND product_type=...
       Full CRUD gated by data-permission attr (permission-ui.js auto-hides).
   Sealed by M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED SPEC.
   Iron Rule 12: target ≤ 300 lines. */

(function () {
  'use strict';

  // Per-productType keys
  const MOD_KEY = { glasses: 'lens', contact_lens: 'contact_lens', accessory: 'accessory' };
  const CAT_LABEL = { glasses: 'עדשות', contact_lens: 'עדשות מגע', accessory: 'אביזרים' };

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg, type) {
    if (window.Toast && Toast[type || 'info']) return Toast[type || 'info'](msg);
    console.log('[catalog-private-admin]', type || 'info', msg);
  }

  // ----- DOM scaffolding -----------------------------------------------
  function buildShell(opts, state) {
    const mod = MOD_KEY[opts.productType];
    const catLabel = CAT_LABEL[opts.productType];
    const privatePerm = mod + '.catalog.private.manage';
    state.privatePerm = privatePerm;
    state.modKey = mod;

    opts.mountEl.innerHTML = `
      <div class="lens-page-title">
        📚 קטלוג ${escapeHtml(catLabel)}
        <span class="badge" data-role="active-tab-badge">גלובלי</span>
        <span style="flex:1"></span>
      </div>
      <div class="catalog-subtabs" style="display:flex;gap:6px;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">
        <button class="btn btn-g btn-sm" data-subtab="global">🌐 מותגים גלובליים</button>
        <button class="btn btn-g btn-sm" data-subtab="private" data-permission="${privatePerm}|${mod}.catalog.global.view">📖 הקטלוג שלי</button>
      </div>
      <div style="display:grid;grid-template-columns:220px 220px 240px 1fr;gap:10px;height:calc(100vh - 320px);min-height:480px">
        ${col('brands', 'מותגים')}
        ${col('designs', 'דגמים', 'בחר מותג ←')}
        ${col('variants', 'וריאציות', 'בחר דגם ←')}
        ${detailCol()}
      </div>`;

    // Wire sub-tab switcher
    opts.mountEl.querySelectorAll('button[data-subtab]').forEach(btn => {
      btn.addEventListener('click', () => switchSubtab(opts, state, btn.dataset.subtab));
    });
    // Wire Add buttons (delegated to live state.subtab)
    ['brand', 'design', 'variant'].forEach(level => {
      const btn = opts.mountEl.querySelector(`button[data-add="${level}"]`);
      if (btn) btn.addEventListener('click', () => openAddDialog(opts, state, level));
    });
    // Re-run permission-ui to honor data-permission on private sub-tab + add buttons
    if (window.PermissionUI && typeof PermissionUI.refresh === 'function') {
      try { PermissionUI.refresh(opts.mountEl); } catch (_) { /* non-fatal */ }
    }
  }

  function col(kind, title, emptyMsg) {
    return `
      <div class="lens-panel" style="display:flex;flex-direction:column">
        <div class="lens-panel-header" style="display:block">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3>${escapeHtml(title)}</h3>
            <span class="badge" data-count="${kind}">0</span>
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:4px" data-list="${kind}">
          <div class="empty-state">${escapeHtml(emptyMsg || 'טוען…')}</div>
        </div>
        <div style="padding:8px 12px;border-top:1px solid #e2e8f0">
          <button class="btn btn-g btn-sm" data-add="${kind === 'brands' ? 'brand' : kind === 'designs' ? 'design' : 'variant'}"
                  style="width:100%;display:none">➕ הוסף ${kind === 'brands' ? 'מותג' : kind === 'designs' ? 'דגם' : 'וריאציה'}</button>
        </div>
      </div>`;
  }
  function detailCol() {
    return `
      <div class="lens-panel" style="display:flex;flex-direction:column">
        <div class="lens-panel-header" style="display:block">
          <h3>📋 פרטים</h3>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px" data-detail>
          <div class="empty-state">בחר וריאציה להצגת פרטים</div>
        </div>
      </div>`;
  }

  // ----- Sub-tab switching ---------------------------------------------
  function switchSubtab(opts, state, sub) {
    state.subtab = sub;
    state.selectedBrand = state.selectedDesign = state.selectedVariant = null;
    opts.mountEl.querySelector('[data-role="active-tab-badge"]').textContent = sub === 'private' ? 'פרטי' : 'גלובלי';
    opts.mountEl.querySelectorAll('button[data-subtab]').forEach(b => b.classList.toggle('active', b.dataset.subtab === sub));
    // Show "+ Add" buttons only on private subtab and only if user has manage perm
    const showAdd = sub === 'private' && (opts.hasPermission ? opts.hasPermission(state.privatePerm) : false);
    ['brand', 'design', 'variant'].forEach(level => {
      const btn = opts.mountEl.querySelector(`button[data-add="${level}"]`);
      if (btn) btn.style.display = showAdd && level === 'brand' ? 'block' : 'none';
    });
    loadBrands(opts, state);
    setListMsg(opts.mountEl, 'designs', 'בחר מותג ←');
    setListMsg(opts.mountEl, 'variants', 'בחר דגם ←');
    setDetail(opts.mountEl, 'בחר וריאציה להצגת פרטים');
  }

  // ----- Queries -------------------------------------------------------
  async function loadBrands(opts, state) {
    let q = opts.sb.from('lens_brand')
      .select('id, name, is_published, owner_tenant_id, cloned_from_id, lifecycle_status')
      .eq('is_deleted', false);
    // Always filter: rows whose designs include opts.productType. Because brand→design
    // is 1:N, we use a sub-select to bound the brand set per product_type.
    // Simpler MVP: just filter by owner predicate; product_type filter applies at designs col.
    if (state.subtab === 'private') q = q.eq('owner_tenant_id', opts.getTenantId());
    else q = q.is('owner_tenant_id', null);
    const { data, error } = await q.order('name');
    if (error) return toast('שגיאה בטעינת מותגים: ' + error.message, 'error');
    state.brands = data || [];
    renderList(opts, state, 'brands', state.brands.map(b => ({
      id: b.id, label: b.name,
      meta: b.cloned_from_id ? '🔁 שובט' : (b.is_published ? '' : 'טיוטה'),
      onSelect: () => selectBrand(opts, state, b)
    })));
  }

  async function selectBrand(opts, state, brand) {
    state.selectedBrand = brand;
    state.selectedDesign = state.selectedVariant = null;
    let q = opts.sb.from('lens_design')
      .select('id, brand_id, name, lens_type, material, is_published, owner_tenant_id, cloned_from_id, product_type')
      .eq('brand_id', brand.id)
      .eq('product_type', opts.productType)
      .eq('is_deleted', false);
    if (state.subtab === 'private') q = q.eq('owner_tenant_id', opts.getTenantId());
    else q = q.is('owner_tenant_id', null);
    const { data, error } = await q.order('name');
    if (error) return toast('שגיאה בטעינת דגמים: ' + error.message, 'error');
    state.designs = data || [];
    renderList(opts, state, 'designs', state.designs.map(d => ({
      id: d.id, label: d.name,
      meta: (d.lens_type || '') + (d.cloned_from_id ? ' · 🔁' : ''),
      onSelect: () => selectDesign(opts, state, d)
    })));
    // Show "Add Design" button if private + has perm
    showAddBtn(opts, state, 'design');
  }

  async function selectDesign(opts, state, design) {
    state.selectedDesign = design;
    state.selectedVariant = null;
    let q = opts.sb.from('lens_variant')
      .select('id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, is_published, owner_tenant_id, cloned_from_id, design_id')
      .eq('design_id', design.id)
      .eq('is_deleted', false);
    if (state.subtab === 'private') q = q.eq('owner_tenant_id', opts.getTenantId());
    else q = q.is('owner_tenant_id', null);
    const { data, error } = await q.order('refractive_index').order('diameter_mm');
    if (error) return toast('שגיאה בטעינת וריאציות: ' + error.message, 'error');
    state.variants = data || [];
    renderList(opts, state, 'variants', state.variants.map(v => ({
      id: v.id, label: v.display_id,
      meta: `n=${v.refractive_index} · ⌀${v.diameter_mm}` + (v.cloned_from_id ? ' · 🔁' : ''),
      onSelect: () => selectVariant(opts, state, v)
    })));
    showAddBtn(opts, state, 'variant');
  }

  function selectVariant(opts, state, v) {
    state.selectedVariant = v;
    const isPrivate = !!v.owner_tenant_id;
    const canManagePrivate = isPrivate && opts.hasPermission && opts.hasPermission(state.privatePerm);
    const cloneBtnVisible = !isPrivate && opts.hasPermission && opts.hasPermission(state.privatePerm);
    const html = `
      <div style="margin-bottom:12px"><strong>${escapeHtml(v.display_id)}</strong>${isPrivate ? ' <span class="badge badge-private" title="קטלוג פרטי">פרטי</span>' : ''}</div>
      <div style="font-size:13px;color:#475569;line-height:1.7">
        <div>אינדקס: ${v.refractive_index}</div>
        <div>קוטר: ${v.diameter_mm}mm</div>
        ${v.coating ? `<div>ציפוי: ${escapeHtml(v.coating)}</div>` : ''}
        ${v.tint ? `<div>גוון: ${escapeHtml(v.tint)}</div>` : ''}
        <div>SPH: ${v.sph_min} → ${v.sph_max}</div>
        <div>סטטוס: ${v.is_published ? 'מפורסם' : 'טיוטה'}</div>
      </div>
      <div style="margin-top:16px;display:flex;gap:6px;flex-wrap:wrap">
        ${cloneBtnVisible ? `<button class="btn btn-p btn-sm" data-action="clone-variant">📋 העתק לקטלוג שלי</button>` : ''}
        ${canManagePrivate ? `<button class="btn btn-g btn-sm" data-action="edit-variant">✏️ ערוך</button>
        <button class="btn btn-r btn-sm" data-action="delete-variant">🗑 מחק</button>` : ''}
      </div>`;
    setDetail(opts.mountEl, html);
    const cloneBtn = opts.mountEl.querySelector('button[data-action="clone-variant"]');
    if (cloneBtn) cloneBtn.addEventListener('click', () => cloneToPrivate(opts, state, 'variant', v.id));
    const editBtn = opts.mountEl.querySelector('button[data-action="edit-variant"]');
    if (editBtn) editBtn.addEventListener('click', () => openEditDialog(opts, state, 'variant', v));
    const delBtn = opts.mountEl.querySelector('button[data-action="delete-variant"]');
    if (delBtn) delBtn.addEventListener('click', () => softDelete(opts, state, 'variant', v));
  }

  // ----- Clone-to-private (Brief §3.5) ---------------------------------
  async function cloneToPrivate(opts, state, entryType, sourceId) {
    const { data, error } = await opts.sb.rpc('clone_catalog_entry_to_private', {
      p_entry_type: entryType, p_source_id: sourceId, p_target_tenant_id: opts.getTenantId()
    });
    if (error) return toast('שגיאה בשכפול: ' + error.message, 'error');
    toast('שובט לקטלוג הפרטי בהצלחה. ראה ב"הקטלוג שלי" → טיוטה.', 'success');
    state.subtab = 'private';
    switchSubtab(opts, state, 'private');
  }

  // ----- Minimal Add/Edit/Delete (MVP) ---------------------------------
  async function openAddDialog(opts, state, level) {
    const label = level === 'brand' ? 'מותג' : level === 'design' ? 'דגם' : 'וריאציה';
    const name = prompt(`שם ${label} חדש:`);
    if (!name || !name.trim()) return;
    const tid = opts.getTenantId();
    if (level === 'brand') {
      const { data, error } = await opts.sb.from('lens_brand').insert({
        owner_tenant_id: tid, name: name.trim(), is_published: false, lifecycle_status: 'draft'
      }).select().single();
      if (error) return toast('שגיאה: ' + error.message, 'error');
      toast(`מותג "${name}" נוצר.`, 'success');
      loadBrands(opts, state);
    } else if (level === 'design' && state.selectedBrand) {
      const { data, error } = await opts.sb.from('lens_design').insert({
        owner_tenant_id: tid, brand_id: state.selectedBrand.id, name: name.trim(),
        lens_type: 'single_vision', product_type: opts.productType,
        is_published: false, lifecycle_status: 'draft'
      }).select().single();
      if (error) return toast('שגיאה: ' + error.message, 'error');
      toast(`דגם "${name}" נוצר.`, 'success');
      selectBrand(opts, state, state.selectedBrand);
    } else if (level === 'variant' && state.selectedDesign) {
      const did = name.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16) || ('PRV-' + Date.now().toString(36));
      const { data, error } = await opts.sb.from('lens_variant').insert({
        owner_tenant_id: tid, design_id: state.selectedDesign.id, display_id: did,
        refractive_index: 1.5, diameter_mm: 65, sph_min: -6, sph_max: 6, sph_step: 0.25,
        is_published: false, lifecycle_status: 'draft', version: 1
      }).select().single();
      if (error) return toast('שגיאה: ' + error.message, 'error');
      toast(`וריאציה "${did}" נוצרה.`, 'success');
      selectDesign(opts, state, state.selectedDesign);
    }
  }

  async function openEditDialog(opts, state, level, row) {
    const newName = prompt('שם חדש:', row.name || row.display_id);
    if (!newName || newName === (row.name || row.display_id)) return;
    const tbl = level === 'brand' ? 'lens_brand' : level === 'design' ? 'lens_design' : 'lens_variant';
    const fld = level === 'variant' ? 'display_id' : 'name';
    const { error } = await opts.sb.from(tbl).update({ [fld]: newName }).eq('id', row.id).eq('owner_tenant_id', opts.getTenantId());
    if (error) return toast('שגיאה: ' + error.message, 'error');
    toast('נשמר.', 'success');
    if (level === 'brand') loadBrands(opts, state);
    else if (level === 'design') selectBrand(opts, state, state.selectedBrand);
    else selectDesign(opts, state, state.selectedDesign);
  }

  async function softDelete(opts, state, level, row) {
    if (!confirm('למחוק?')) return;
    const tbl = level === 'brand' ? 'lens_brand' : level === 'design' ? 'lens_design' : 'lens_variant';
    const { error } = await opts.sb.from(tbl).update({ is_deleted: true }).eq('id', row.id).eq('owner_tenant_id', opts.getTenantId());
    if (error) return toast('שגיאה: ' + error.message, 'error');
    toast('נמחק.', 'success');
    if (level === 'brand') loadBrands(opts, state);
    else if (level === 'design') selectBrand(opts, state, state.selectedBrand);
    else selectDesign(opts, state, state.selectedDesign);
  }

  // ----- Render helpers ------------------------------------------------
  function renderList(opts, state, kind, items) {
    const list = opts.mountEl.querySelector(`[data-list="${kind}"]`);
    const count = opts.mountEl.querySelector(`[data-count="${kind}"]`);
    if (count) count.textContent = items.length;
    if (!items.length) {
      list.innerHTML = `<div class="empty-state">${state.subtab === 'private' ? 'אין פריטים פרטיים. לחץ + להוספה.' : 'אין מותגים גלובליים בקטגוריה זו.'}</div>`;
      return;
    }
    list.innerHTML = items.map(it => `
      <div class="list-item" data-id="${escapeHtml(it.id)}">
        <div>${escapeHtml(it.label)}<div class="item-meta">${escapeHtml(it.meta || '')}</div></div>
      </div>`).join('');
    list.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', () => {
        list.querySelectorAll('.list-item').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        const item = items.find(i => i.id === el.dataset.id);
        item && item.onSelect();
      });
    });
  }
  function setListMsg(mountEl, kind, msg) {
    const list = mountEl.querySelector(`[data-list="${kind}"]`);
    if (list) list.innerHTML = `<div class="empty-state">${escapeHtml(msg)}</div>`;
    const c = mountEl.querySelector(`[data-count="${kind}"]`);
    if (c) c.textContent = '0';
  }
  function setDetail(mountEl, html) {
    const d = mountEl.querySelector('[data-detail]');
    if (d) d.innerHTML = (typeof html === 'string' && html.indexOf('<') === -1) ? `<div class="empty-state">${escapeHtml(html)}</div>` : html;
  }
  function showAddBtn(opts, state, level) {
    const btn = opts.mountEl.querySelector(`button[data-add="${level}"]`);
    if (!btn) return;
    const can = state.subtab === 'private' && opts.hasPermission && opts.hasPermission(state.privatePerm);
    btn.style.display = can ? 'block' : 'none';
  }

  // ----- Public API ----------------------------------------------------
  window.CatalogPrivateAdmin = {
    init: function (opts) {
      if (!opts || !opts.mountEl || !opts.sb || !opts.getTenantId || !opts.productType) {
        console.error('[catalog-private-admin] missing required opts');
        return;
      }
      const state = { subtab: 'global', selectedBrand: null, selectedDesign: null, selectedVariant: null,
                       brands: [], designs: [], variants: [], privatePerm: null, modKey: null };
      buildShell(opts, state);
      switchSubtab(opts, state, 'global');
    }
  };
})();
