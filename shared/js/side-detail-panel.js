/* side-detail-panel.js — Right-pinned detail panel for Optic Up
   ============================================================================
   Renders a right-aligned card with a gradient header + scrollable body
   organized into sections. Distinct from modal (overlay-centered) and from
   the right-pinned DRAWERS (full-height overlays). This is a regular
   layout-flow side panel that sits next to main content.

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #3). Used in 4 mockups (Inventory, Designs, Pricing, GR).

   API:
     SideDetailPanel.init(container, {
       title: 'פרטי וריאנט',
       headerVariant?: 'gold' | 'navy' | 'success' | 'amber',
       sections: [
         {
           id, title?, body, footer?, variant?: 'highlight'|'warn'|'info'
         },
         ...
       ]
     }) → { addSection, removeSection, updateSection, setTitle, destroy }

     // body can be: string (escaped) | HTMLElement (appended) | DocumentFragment
     // OR { html: '...' } — opt-in unescaped HTML, caller-trusted

   Deps: side-detail.css required. No DB / Modal / Toast.
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _setSectionBody(bodyEl, body) {
    bodyEl.innerHTML = '';
    if (body == null) return;
    if (body instanceof HTMLElement || body instanceof DocumentFragment) {
      bodyEl.appendChild(body);
      return;
    }
    if (typeof body === 'object' && typeof body.html === 'string') {
      bodyEl.innerHTML = body.html;  // caller opt-in
      return;
    }
    bodyEl.textContent = String(body);
  }

  function init(container, config) {
    if (!container) throw new Error('SideDetailPanel.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('SideDetailPanel.init: mount not found: ' + container);

    var title         = (config && config.title) || '';
    var headerVariant = (config && config.headerVariant) || 'gold';
    var sections      = Array.isArray(config && config.sections) ? config.sections.slice() : [];
    var destroyed     = false;

    var root, headerEl, titleEl, bodyEl;

    function _build() {
      root = document.createElement('div');
      root.className = 'side-detail-panel';

      headerEl = document.createElement('div');
      headerEl.className = 'side-detail-header side-detail-header-' + _esc(headerVariant);
      titleEl = document.createElement('h3');
      titleEl.className = 'side-detail-title';
      titleEl.textContent = title;
      headerEl.appendChild(titleEl);
      root.appendChild(headerEl);

      bodyEl = document.createElement('div');
      bodyEl.className = 'side-detail-body';
      root.appendChild(bodyEl);

      mount.innerHTML = '';
      mount.appendChild(root);

      _renderSections();
    }

    function _renderSection(sec) {
      var secEl = document.createElement('div');
      secEl.className = 'side-detail-section';
      if (sec.variant) secEl.classList.add('side-detail-section-' + sec.variant);
      secEl.setAttribute('data-section-id', sec.id || '');

      if (sec.title) {
        var t = document.createElement('div');
        t.className = 'side-detail-section-title';
        t.textContent = sec.title;
        secEl.appendChild(t);
      }
      var body = document.createElement('div');
      body.className = 'side-detail-section-body';
      _setSectionBody(body, sec.body);
      secEl.appendChild(body);

      if (sec.footer) {
        var f = document.createElement('div');
        f.className = 'side-detail-section-footer';
        _setSectionBody(f, sec.footer);
        secEl.appendChild(f);
      }
      return secEl;
    }

    function _renderSections() {
      bodyEl.innerHTML = '';
      for (var i = 0; i < sections.length; i++) {
        bodyEl.appendChild(_renderSection(sections[i]));
      }
    }

    function addSection(sec) {
      sections.push(sec);
      if (!destroyed) bodyEl.appendChild(_renderSection(sec));
    }

    function removeSection(id) {
      sections = sections.filter(function (s) { return s.id !== id; });
      if (destroyed) return;
      var el = bodyEl.querySelector('.side-detail-section[data-section-id="' + CSS.escape(id) + '"]');
      if (el) el.remove();
    }

    function updateSection(id, patch) {
      var idx = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].id === id) { idx = i; break; }
      }
      if (idx === -1) return;
      sections[idx] = Object.assign({}, sections[idx], patch);
      if (destroyed) return;
      var old = bodyEl.querySelector('.side-detail-section[data-section-id="' + CSS.escape(id) + '"]');
      if (!old) return;
      old.replaceWith(_renderSection(sections[idx]));
    }

    function setTitle(newTitle) {
      title = newTitle || '';
      if (!destroyed) titleEl.textContent = title;
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      mount.innerHTML = '';
    }

    _build();
    return {
      addSection: addSection,
      removeSection: removeSection,
      updateSection: updateSection,
      setTitle: setTitle,
      destroy: destroy
    };
  }

  window.SideDetailPanel = { init: init };
})();
