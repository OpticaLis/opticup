// cat-sidebar.js — Module 1.5 reusable category sidebar component (ES Module).
// Sealed by M1_5_CAT_SIDEBAR_COMPONENT SPEC §2 Part A (2026-05-17).
//
// Renders a right-side category navigation sidebar inside a mount point.
// Renders <aside id="inv-sidebar"> with .inv-cat-item children — byte-equivalent
// to the inline HTML it replaces in inventory.html (so inventory-shell.js's
// existing event delegation queries continue to work without modification).
//
// API:
//   import { initCatSidebar } from '/shared/js/cat-sidebar.js';
//   initCatSidebar({
//     container: '#cat-sidebar-mount',
//     categories: [{ id, icon, label, permission?, active?, feature? }, ...],
//     crossCategories: [...same shape...],
//     onSelect: (categoryId) => { /* handler */ },
//     defaultCategory: 'frames',
//     urlParamName: 'cat'
//   });
//
// Conventions:
//   - DG-1.A ES Module export (divergent from existing M1.5 IIFE+window pattern;
//     documented in SPEC §11 as intentional forward-compatible architectural call)
//   - DG-4.A mount slot (#cat-sidebar-mount) separate from rendered output (#inv-sidebar)
//   - F-3 refinement: reads ?cat= on init only; does NOT pushState on click
//     (delegates URL management to host onSelect handler)
//   - F-4 confirmation: PermissionUI scans data-permission attrs post-render;
//     component itself does no gating — adds attrs and trusts the scanner
//   - F-6 refinement: keeps position:fixed sidebar layout (CSS-level); grid
//     wrapper provides structural protection independently

function escHtml(s) {
  // Inline escape — keeps component self-contained / no shared.js dep.
  // Sidebar labels are author-controlled config, not user input; this is
  // defensive hygiene per Iron Rule 8.
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

function renderItem(item, isActive) {
  // <div class="inv-cat-item [active] [disabled]" data-category="..." data-permission="..." data-feature="...">
  //   <span class="inv-cat-icon">ICON</span>
  //   <span class="inv-cat-label">LABEL</span>
  // </div>
  const classes = ['inv-cat-item'];
  if (isActive) classes.push('active');
  if (item.disabled) classes.push('disabled');

  let attrs = ' data-category="' + escHtml(item.id) + '"';
  if (item.permission) attrs += ' data-permission="' + escHtml(item.permission) + '"';
  if (item.feature)    attrs += ' data-feature="'    + escHtml(item.feature)    + '"';
  if (item.title)      attrs += ' title="'           + escHtml(item.title)      + '"';

  return '<div class="' + classes.join(' ') + '"' + attrs + '>' +
    '<span class="inv-cat-icon">' + escHtml(item.icon || '') + '</span>' +
    '<span class="inv-cat-label">' + escHtml(item.label || '') + '</span>' +
  '</div>';
}

function renderGroup(title, items, activeId) {
  if (!items || !items.length) return '';
  const titleClass = title.spaced ? 'inv-sidebar-title spaced' : 'inv-sidebar-title';
  let html = '<div class="' + titleClass + '">' + escHtml(title.text) + '</div>';
  for (let i = 0; i < items.length; i++) {
    html += renderItem(items[i], items[i].id === activeId);
  }
  return html;
}

function readUrlCat(paramName) {
  if (!paramName || typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get(paramName);
    return v ? v : null;
  } catch (_) {
    return null;
  }
}

function applyPermissionScan() {
  // Re-run PermissionUI scan post-render so [data-permission] attrs on the
  // freshly-injected DOM are processed by the existing global scanner.
  // PermissionUI exposes a global applyUIPermissions() function per project
  // convention; if not present (early load before auth-service ready), no-op
  // and let auth-service's later applyUIPermissions() call pick up.
  if (typeof window === 'undefined') return;
  if (typeof window.applyUIPermissions === 'function') {
    try { window.applyUIPermissions(); }
    catch (e) { console.warn('[cat-sidebar] applyUIPermissions failed', e); }
  }
}

/**
 * Initialize the category sidebar component.
 *
 * @param {object} config
 * @param {string} config.container — CSS selector for mount point
 * @param {Array}  config.categories — primary categories: [{id, icon, label, permission?, active?, feature?, disabled?, title?}, ...]
 * @param {Array}  config.crossCategories — secondary entries (same shape)
 * @param {Function} config.onSelect — (categoryId) => void; called on click
 * @param {string} [config.defaultCategory] — fallback active id if no URL param
 * @param {string} [config.urlParamName='cat'] — query param read on init for active id
 * @param {object} [config.sidebarTitleText] — { primary: '...', secondary: '...' } Hebrew labels
 * @returns {{ setActive: (id) => void, getActive: () => string, destroy: () => void }}
 */
export function initCatSidebar(config) {
  if (!config || !config.container) {
    console.error('[cat-sidebar] initCatSidebar: config.container is required');
    return null;
  }

  const mount = (typeof config.container === 'string')
    ? document.querySelector(config.container)
    : config.container;

  if (!mount) {
    console.error('[cat-sidebar] initCatSidebar: mount point not found:', config.container);
    return null;
  }

  const urlParamName = config.urlParamName || 'cat';
  const titles = config.sidebarTitleText || {};

  // Determine initial active category: URL param first, then defaultCategory,
  // then the first category marked active:true in the config, then first item.
  let activeId = readUrlCat(urlParamName) ||
                 config.defaultCategory ||
                 (config.categories && config.categories.find(c => c.active) || {}).id ||
                 (config.categories && config.categories[0] || {}).id ||
                 null;

  // Render full sidebar HTML
  function render() {
    const primaryTitle   = { text: titles.primary   || '📦 קטגוריות מלאי', spaced: false };
    const secondaryTitle = { text: titles.secondary || '🔄 חוצה-קטגוריות', spaced: true };
    // 📦 = 📦, 🔄 = 🔄. Unicode-escaped to keep file ASCII-safe.

    const html = '<aside id="inv-sidebar">' +
      renderGroup(primaryTitle, config.categories || [], activeId) +
      renderGroup(secondaryTitle, config.crossCategories || [], activeId) +
    '</aside>';

    mount.innerHTML = html;
    applyPermissionScan();
  }

  // Click delegation — host's onSelect receives the categoryId.
  // Skip clicks on disabled items (visual cue + click-block consistent with
  // pre-component behavior). Active-state DOM toggle is the host's
  // responsibility (it controls when state transitions are valid).
  function handleClick(e) {
    const item = e.target.closest('.inv-cat-item');
    if (!item) return;
    if (item.classList.contains('disabled')) return;
    const id = item.dataset.category;
    if (!id) return;
    if (typeof config.onSelect === 'function') {
      try { config.onSelect(id); }
      catch (err) { console.error('[cat-sidebar] onSelect handler threw:', err); }
    }
  }

  // Public API: setActive lets the host toggle visual state after async work
  // (e.g., the host's setActiveCategory may want to validate the click first).
  function setActive(id) {
    activeId = id;
    if (!mount) return;
    const items = mount.querySelectorAll('.inv-cat-item');
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      el.classList.toggle('active', el.dataset.category === id);
    }
  }

  function getActive() {
    return activeId;
  }

  function destroy() {
    if (mount) {
      mount.removeEventListener('click', handleClick);
      mount.innerHTML = '';
    }
  }

  // Wire up + initial render
  render();
  mount.addEventListener('click', handleClick);

  return { setActive, getActive, destroy };
}
