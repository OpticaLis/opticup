/* stat-card-row.js — Shared stat-card row for Optic Up
   ============================================================================
   Renders a grid of 4-5 stat cards with colored border-right + label + value
   + sub-text. Click-to-filter integration via onCardClick callback.

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #2). Used in 3 mockups (Designs Selection, Pricing, Active POs List).

   API:
     StatCardRow.init(container, {
       cards: [
         { id, label, value, sub?, variant?, icon?, disabled? },
         ...
       ],
       activeId?: 'sent',
       columns?: 4,                // explicit grid template — default = cards.length
       onCardClick?: (cardId) => {}
     }) → { setActive, getActive, updateCard, destroy }

   Variants: 'default' (gold border) | 'active' (green) | 'pending' (amber) |
             'draft' | 'sent' | 'partial' | 'received' | 'overdue' | 'disabled'
   Variant maps to .stat-card-{variant} CSS class — see shared/css/stat-card.css
   for the full palette.

   Deps: stat-card.css required. No DB / Modal / Toast dep.
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function init(container, config) {
    if (!container) throw new Error('StatCardRow.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('StatCardRow.init: mount not found: ' + container);

    var cards    = Array.isArray(config && config.cards) ? config.cards.slice() : [];
    var activeId = (config && config.activeId) || null;
    var columns  = (config && config.columns) || cards.length || 1;
    var onClick  = (config && typeof config.onCardClick === 'function') ? config.onCardClick : null;
    var destroyed = false;

    function _renderCard(card) {
      var variant = card.variant || 'default';
      var classes = ['stat-card', 'stat-card-' + _esc(variant)];
      if (card.id === activeId) classes.push('active');
      if (card.disabled) classes.push('disabled');
      var attrs = ' data-card-id="' + _esc(card.id) + '"';
      var html = '<div class="' + classes.join(' ') + '"' + attrs + (card.disabled ? ' aria-disabled="true"' : '') + ' role="button" tabindex="0">';
      if (card.icon) {
        html += '<div class="stat-card-icon">' + _esc(card.icon) + '</div>';
      }
      html += '<div class="stat-card-label">' + _esc(card.label) + '</div>';
      html += '<div class="stat-card-value">' + _esc(card.value) + '</div>';
      if (card.sub) {
        html += '<div class="stat-card-sub">' + _esc(card.sub) + '</div>';
      }
      html += '</div>';
      return html;
    }

    function _render() {
      var style = 'grid-template-columns: repeat(' + columns + ', 1fr);';
      var html = '<div class="stat-card-row" style="' + style + '">';
      for (var i = 0; i < cards.length; i++) {
        html += _renderCard(cards[i]);
      }
      html += '</div>';
      mount.innerHTML = html;
    }

    function _handleClick(e) {
      var card = e.target.closest('.stat-card');
      if (!card || card.classList.contains('disabled')) return;
      var id = card.dataset.cardId;
      if (!id) return;
      setActive(id);
      if (onClick) {
        try { onClick(id); }
        catch (err) { console.error('[stat-card-row] onCardClick threw:', err); }
      }
    }

    function _handleKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.stat-card');
      if (!card) return;
      e.preventDefault();
      _handleClick(e);
    }

    function setActive(id) {
      activeId = id;
      if (destroyed) return;
      var els = mount.querySelectorAll('.stat-card');
      for (var i = 0; i < els.length; i++) {
        els[i].classList.toggle('active', els[i].dataset.cardId === id);
      }
    }
    function getActive() { return activeId; }

    function updateCard(id, patch) {
      var idx = -1;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].id === id) { idx = i; break; }
      }
      if (idx === -1) return;
      cards[idx] = Object.assign({}, cards[idx], patch);
      if (destroyed) return;
      // Re-render just that card
      var oldEl = mount.querySelector('.stat-card[data-card-id="' + CSS.escape(id) + '"]');
      if (!oldEl) return;
      var tmp = document.createElement('div');
      tmp.innerHTML = _renderCard(cards[idx]);
      oldEl.replaceWith(tmp.firstElementChild);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      mount.removeEventListener('click', _handleClick);
      mount.removeEventListener('keydown', _handleKey);
      mount.innerHTML = '';
    }

    _render();
    mount.addEventListener('click', _handleClick);
    mount.addEventListener('keydown', _handleKey);

    return { setActive: setActive, getActive: getActive, updateCard: updateCard, destroy: destroy };
  }

  window.StatCardRow = { init: init };
})();
