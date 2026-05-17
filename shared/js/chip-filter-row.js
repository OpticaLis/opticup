/* chip-filter-row.js — Shared chip-filter row component for Optic Up
   ============================================================================
   Renders a horizontal row of pill-shaped filter chips with an optional label.
   Gold-on-white inactive, gold fill on active. Supports single + multi-select.

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per the M1 lens
   rebuild Brief §SPEC 2 #1). Used in 5 mockups (Inventory, Designs, Pricing,
   POs list, GR).

   API:
     ChipFilter.init(container, {
       chips: [{ id, label, icon?, count?, variant? }, ...],
       activeIds: ['stock'],          // initial active selection
       multiSelect: false,            // false = radio, true = checkbox
       label: 'סוג עדשה:',            // optional row label
       variant: 'gold' | 'secondary', // 'gold' default; 'secondary' = slate
       onSelect: (activeIds) => {}    // fires on every change
     }) → { setActive, getActive, destroy }

   Deps: chip-filter.css (required). No dep on shared.js / DB / Modal / Toast.
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function init(container, config) {
    if (!container) throw new Error('ChipFilter.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('ChipFilter.init: mount not found: ' + container);

    var chips        = Array.isArray(config && config.chips) ? config.chips : [];
    var activeSet    = new Set(Array.isArray(config && config.activeIds) ? config.activeIds : []);
    var multiSelect  = !!(config && config.multiSelect);
    var label        = (config && config.label) || '';
    var variant      = (config && config.variant) || 'gold';
    var onSelect     = (config && typeof config.onSelect === 'function') ? config.onSelect : null;
    var destroyed    = false;

    function _render() {
      var html = '<div class="chip-filter-row chip-filter-' + _esc(variant) + '">';
      if (label) {
        html += '<span class="chip-filter-label">' + _esc(label) + '</span>';
      }
      for (var i = 0; i < chips.length; i++) {
        var c = chips[i];
        var isActive = activeSet.has(c.id);
        var classes  = ['chip-filter-chip'];
        if (isActive) classes.push('active');
        if (c.variant === 'secondary') classes.push('secondary');
        if (c.disabled) classes.push('disabled');
        html += '<button type="button" class="' + classes.join(' ') + '"' +
                ' data-chip-id="' + _esc(c.id) + '"' +
                (c.disabled ? ' disabled' : '') + '>';
        if (c.icon)  html += '<span class="chip-filter-icon">' + _esc(c.icon) + '</span>';
        html += '<span class="chip-filter-text">' + _esc(c.label) + '</span>';
        if (c.count != null) html += '<span class="chip-filter-count">' + _esc(c.count) + '</span>';
        html += '</button>';
      }
      html += '</div>';
      mount.innerHTML = html;
    }

    function _handleClick(e) {
      var btn = e.target.closest('.chip-filter-chip');
      if (!btn || btn.disabled) return;
      var id = btn.dataset.chipId;
      if (!id) return;
      if (multiSelect) {
        if (activeSet.has(id)) activeSet.delete(id);
        else activeSet.add(id);
      } else {
        activeSet.clear();
        activeSet.add(id);
      }
      _syncUI();
      if (onSelect) {
        try { onSelect(Array.from(activeSet)); }
        catch (err) { console.error('[chip-filter] onSelect threw:', err); }
      }
    }

    function _syncUI() {
      var btns = mount.querySelectorAll('.chip-filter-chip');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        b.classList.toggle('active', activeSet.has(b.dataset.chipId));
      }
    }

    function setActive(ids) {
      activeSet = new Set(Array.isArray(ids) ? ids : [ids]);
      if (!destroyed) _syncUI();
    }
    function getActive() { return Array.from(activeSet); }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      mount.removeEventListener('click', _handleClick);
      mount.innerHTML = '';
    }

    _render();
    mount.addEventListener('click', _handleClick);

    return { setActive: setActive, getActive: getActive, destroy: destroy };
  }

  window.ChipFilter = { init: init };
})();
