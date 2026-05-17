// lens-pricing-drawer.js — LensDetailsDrawer consumer for lens-pricing.
// M1_LENS_PRICING_REBUILD (2026-05-17). 2 tabs:
//   1. לוגים   (logs — price overlay history; read-only always)
//   2. הערות  (notes — lens_variant_notes CRUD; CRUD in edit mode / read-only in view mode)
//
// Direct PostgREST writes on lens_variant_notes per Foreman §0 decision.
// Tenant_id defense-in-depth on every read + write (Iron Rule 22).

(function () {
  'use strict';

  let _drawerInstance = null;

  // ─── Data fetchers ─────────────────────────────────────────────
  async function fetchLogsForVariant(variantId) {
    // Logs = recent pricing_overlay changes for offerings that target this variant.
    // For Foundation Phase, return overlays where scope_variant_id = variantId
    // (subset of the full audit trail; price-overlay-only — stock_movement logs
    // are deferred to a future SPEC).
    try {
      const tid = getTenantId();
      const { data, error } = await sb.from('pricing_overlay')
        .select('id, status, discount_pct, fixed_amount, effective_from, effective_until, created_at, updated_at')
        .eq('tenant_id', tid)
        .eq('scope_variant_id', variantId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map(r => ({
        id:    r.id,
        kind:  'price',
        date:  r.updated_at || r.created_at,
        label: 'מחיר ' + (r.status === 'proposed' ? 'הוצע' : r.status === 'active' ? 'פעיל' : r.status),
        delta: r.discount_pct != null ? '−' + r.discount_pct + '%' : (r.fixed_amount != null ? '₪' + r.fixed_amount : null),
        value: r.effective_from ? new Date(r.effective_from).toLocaleDateString('he-IL') : null
      }));
    } catch (e) {
      console.warn('[lens-pricing-drawer] fetchLogs failed:', e.message);
      return [];
    }
  }

  async function fetchNotesForVariant(variantId) {
    try {
      const tid = getTenantId();
      const { data, error } = await sb.from('lens_variant_notes')
        .select('id, body, author_id, created_at, updated_at')
        .eq('tenant_id', tid)
        .eq('variant_id', variantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Resolve author names in one batch (LensPricing keeps no author map; query users by id)
      const ids = Array.from(new Set((data || []).map(n => n.author_id))).filter(Boolean);
      let authorNames = new Map();
      if (ids.length) {
        const { data: emps } = await sb.from('employees')
          .select('id, name').eq('tenant_id', tid).in('id', ids);
        (emps || []).forEach(e => authorNames.set(e.id, e.name));
      }
      return (data || []).map(n => ({
        id:          n.id,
        body:        n.body,
        author_name: authorNames.get(n.author_id) || '—',
        created_at:  n.created_at
      }));
    } catch (e) {
      console.warn('[lens-pricing-drawer] fetchNotes failed:', e.message);
      return [];
    }
  }

  // ─── CRUD handlers ─────────────────────────────────────────────
  function _isEditMode() {
    return typeof hasPermission === 'function' && hasPermission('lens_pricing.edit');
  }
  function _currentAuthorId() {
    try {
      const emp = JSON.parse(sessionStorage.getItem('tenant_employee') || '{}');
      return emp.id || null;
    } catch (_) { return null; }
  }

  async function addNote(variantId, body) {
    if (!_isEditMode()) throw new Error('אין הרשאת עריכה');
    const tid = getTenantId();
    const authorId = _currentAuthorId();
    if (!authorId) throw new Error('משתמש לא מזוהה');
    const { data, error } = await sb.from('lens_variant_notes')
      .insert({ variant_id: variantId, tenant_id: tid, author_id: authorId, body: body })
      .select('id, body, author_id, created_at, updated_at')
      .single();
    if (error) throw error;
    return { id: data.id, body: data.body, author_name: '—', created_at: data.created_at };
  }

  async function editNote(noteId, body) {
    if (!_isEditMode()) throw new Error('אין הרשאת עריכה');
    const tid = getTenantId();
    const { data, error } = await sb.from('lens_variant_notes')
      .update({ body: body, updated_at: new Date().toISOString() })
      .eq('id', noteId).eq('tenant_id', tid)
      .select('id, body, author_id, created_at, updated_at')
      .single();
    if (error) throw error;
    return { id: data.id, body: data.body, author_name: '—', created_at: data.created_at };
  }

  async function deleteNote(noteId) {
    if (!_isEditMode()) throw new Error('אין הרשאת עריכה');
    const tid = getTenantId();
    const { error } = await sb.from('lens_variant_notes')
      .delete().eq('id', noteId).eq('tenant_id', tid);
    if (error) throw error;
  }

  // ─── Public API ───────────────────────────────────────────────
  function init() {
    if (!window.LensDetailsDrawer) {
      console.warn('[lens-pricing-drawer] LensDetailsDrawer unavailable');
      return;
    }
    const mount = document.getElementById('lensDetailsDrawer');
    if (!mount) return;
    _drawerInstance = window.LensDetailsDrawer.init(mount, {
      variantId:    null,
      mode:         _isEditMode() ? 'edit' : 'readonly',
      fetchLogs:    fetchLogsForVariant,
      fetchNotes:   fetchNotesForVariant,
      onAddNote:    addNote,
      onEditNote:   editNote,
      onDeleteNote: deleteNote
    });
    window.LensPricing.drawer = _drawerInstance;
  }

  function openForVariant(variantId) {
    if (!_drawerInstance) init();
    if (!_drawerInstance) return;
    window.LensPricing.selectedVariantId = variantId;
    _drawerInstance.open(variantId, _isEditMode() ? 'edit' : 'readonly');
  }

  function close() {
    if (_drawerInstance) _drawerInstance.close();
  }

  window.LensPricingDrawer = { init, openForVariant, close };
})();
