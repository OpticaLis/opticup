// lens-nav-strip.js — top-of-page navigation strip shared across all 7 lens department screens.
// Renders a horizontal strip of links to lens-inventory, lens-goods-receipt, lens-purchase-order,
// lens-pos-list, lens-pricing, lens-active-designs, lens-catalog-admin — gated per page's permission.
//
// Single source of truth for "what pages live in the Lens department." When an 8th lens page is
// added, append one entry to LENS_PAGES below — no other code change needed.
//
// Per Iron Rule 21 (No Orphans, No Duplicates) this widget replaces the inline `<nav id="mainNav">`
// placeholders that were noted as "Phase 1B foundation; full nav added by integration SPEC" in
// each lens HTML file. M1_LENS_PHASE_2_COMPLETION Part D IS that integration SPEC.
//
// Auto-init: looks for `<nav id="lens-nav-container">` in the DOM on DOMContentLoaded.
// If found, renders the strip into it. Each link's visibility is gated by either:
//   - `hasPermission('lens.<key>')` for the 6 staff-facing screens (per-page gate in lens-*-main.js)
//   - `is_platform_super_admin()` Supabase RPC for lens-catalog-admin.html
// Caller missing the key/role gets the link hidden (not shown disabled) — matches the existing
// index.html `renderModules` permission-locked pattern (cards hide for users without access).

(function () {
  'use strict';

  // Single source of truth: when an 8th lens page is added, append one entry here.
  var LENS_PAGES = [
    { href: 'lens-inventory.html',      label: 'מלאי',          icon: '👓', gate: 'lens.inventory.view' },
    { href: 'lens-goods-receipt.html',  label: 'קבלת סחורה',    icon: '📦', gate: 'lens.gr.create' },
    { href: 'lens-purchase-order.html', label: 'הזמנת רכש',     icon: '📝', gate: 'lens.po.create' },
    { href: 'lens-pos-list.html',       label: 'הזמנות פעילות', icon: '📋', gate: 'lens.po.view' },
    { href: 'lens-pricing.html',        label: 'מחירים',        icon: '💲', gate: 'lens.pricing.manage' },
    { href: 'lens-active-designs.html', label: 'דגמים פעילים',  icon: '✨',       gate: 'lens.designs.manage' },
    { href: 'lens-catalog-admin.html',  label: 'קטלוג מערכת',   icon: '🔧', gate: '__platform_admin__' }
  ];

  // Hash-aware tenant param — keeps `?t=...` BEFORE `#fragment`, matches index.html `urlWithTenant`.
  function urlWithTenant(u) {
    var slug = (typeof TENANT_SLUG !== 'undefined') ? TENANT_SLUG : '';
    if (!slug) return u;
    var t = encodeURIComponent(slug);
    var i = u.indexOf('#');
    return i < 0 ? u + '?t=' + t : u.slice(0, i) + '?t=' + t + u.slice(i);
  }

  function isCurrent(href) {
    var current = (window.location.pathname.split('/').pop() || 'lens-inventory.html').toLowerCase();
    return current === href.toLowerCase();
  }

  function isPlatformAdminCheck() {
    return new Promise(function (resolve) {
      try {
        if (typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') return resolve(false);
        sb.rpc('is_platform_super_admin').then(function (r) {
          resolve(!!(r && r.data));
        }).catch(function () { resolve(false); });
      } catch (_) { resolve(false); }
    });
  }

  function shouldShow(page) {
    if (page.gate === '__platform_admin__') return isPlatformAdminCheck();
    var ok = (typeof hasPermission === 'function') && hasPermission(page.gate);
    return Promise.resolve(!!ok);
  }

  function ensureStyles() {
    if (document.getElementById('lens-nav-strip-styles')) return;
    var style = document.createElement('style');
    style.id = 'lens-nav-strip-styles';
    style.textContent =
      '.lens-nav-strip { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 14px; background: #fff; ' +
        'border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }' +
      '.lens-nav-strip .home-link { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; ' +
        'border-radius: 6px; text-decoration: none; color: #5d6d7e; font-size: 12px; margin-left: 4px; border-right: 1px solid #e2e8f0; padding-right: 12px; }' +
      '.lens-nav-strip .home-link:hover { background: #f8fafc; color: #1e3a8a; }' +
      '.lens-nav-strip .lens-nav-item { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; ' +
        'border-radius: 6px; text-decoration: none; color: #475569; font-size: 13px; white-space: nowrap; ' +
        'transition: background 120ms ease; }' +
      '.lens-nav-strip .lens-nav-item:hover { background: #e0f2fe; color: #1e3a8a; }' +
      '.lens-nav-strip .lens-nav-item.active { background: #1e3a8a; color: #fff; font-weight: 600; }' +
      '.lens-nav-strip .lens-nav-icon { font-size: 14px; }';
    document.head.appendChild(style);
  }

  function renderStrip(container) {
    ensureStyles();
    container.classList.add('lens-nav-strip');

    // "← דף הבית" link first (matches existing inline pattern)
    var homeAnchor = document.createElement('a');
    homeAnchor.className = 'home-link';
    homeAnchor.href = urlWithTenant('index.html');
    homeAnchor.textContent = '← דף הבית';
    container.innerHTML = '';
    container.appendChild(homeAnchor);

    // For each LENS_PAGES entry, check gate then append link.
    // We render in parallel via Promise.all so the strip doesn't stutter.
    var promises = LENS_PAGES.map(function (p) {
      return shouldShow(p).then(function (visible) {
        return { page: p, visible: visible };
      });
    });

    Promise.all(promises).then(function (results) {
      results.forEach(function (r) {
        if (!r.visible) return;
        var a = document.createElement('a');
        a.className = 'lens-nav-item' + (isCurrent(r.page.href) ? ' active' : '');
        a.href = urlWithTenant(r.page.href);
        a.innerHTML = '<span class="lens-nav-icon">' + r.page.icon + '</span>' +
                      '<span class="lens-nav-label"></span>';
        a.querySelector('.lens-nav-label').textContent = r.page.label;
        container.appendChild(a);
      });
    });
  }

  function tryInit() {
    var c = document.getElementById('lens-nav-container');
    if (!c) return;
    // Wait briefly for hasPermission to be defined (auth-service.js may still be initializing).
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof hasPermission === 'function' || tries > 50) {
        clearInterval(t);
        renderStrip(c);
      }
    }, 100);
  }

  window.LensNavStrip = { render: renderStrip, pages: LENS_PAGES };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();
})();
