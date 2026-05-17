/* permission-ui.js — Permission-Aware UI for Optic Up
   Scans [data-permission] attributes, hides/disables elements based on hasPermission().
   Deps: hasPermission() from auth-service.js (safe fallback if missing).
   Zero deps on CSS, DB.*, Modal, Toast, Table, ActivityLog. */

(function () {
  'use strict';

  function _hasPerm(key) {
    if (typeof hasPermission !== 'function') return false;
    return hasPermission(key);
  }

  // Check a dot-notation permission string, supporting "|" OR logic
  function _checkPermStr(permStr) {
    if (!permStr) return false;
    if (permStr.indexOf('|') !== -1) {
      return permStr.split('|').some(p => _hasPerm(p.trim()));
    }
    return _hasPerm(permStr.trim());
  }

  // Process a single element
  function _processEl(el) {
    const perm = el.getAttribute('data-permission');
    if (_checkPermStr(perm)) return; // has permission — leave untouched

    const mode = el.getAttribute('data-permission-mode');
    if (mode === 'disable') {
      el.setAttribute('disabled', 'disabled');
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
      el.title = 'אין הרשאה';
    } else {
      el.style.display = 'none';
    }
  }

  // Process a single element using data-tab-permission (same logic, different attr)
  function _processTabEl(el) {
    const perm = el.getAttribute('data-tab-permission');
    if (_checkPermStr(perm)) return; // has permission — leave untouched

    const mode = el.getAttribute('data-permission-mode');
    if (mode === 'disable') {
      el.setAttribute('disabled', 'disabled');
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
      el.title = 'אין הרשאה';
    } else {
      el.style.display = 'none';
    }
  }

  // Scan a container (or document) for [data-permission] and [data-tab-permission] elements
  function _scan(root) {
    if (typeof hasPermission !== 'function') {
      console.warn('PermissionUI: hasPermission() not available — hiding all guarded elements');
    }
    var r = root || document;
    r.querySelectorAll('[data-permission]').forEach(_processEl);
    r.querySelectorAll('[data-tab-permission]').forEach(_processTabEl);
  }

  // Clear inline display:none from previously-hidden gated elements so a
  // re-scan can re-evaluate them. Necessary when permissions are seeded
  // AFTER the initial PermissionUI.apply() — e.g., a new permission key
  // added between sessions; the cached lookup returned false at first
  // scan, the button got display:none inline, and apply() has no UN-hide
  // path because it only ADDS hides. refresh() does clear+scan as a unit.
  // Added 2026-05-17 by M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED
  // Phase 1-FIX after Daniel manual verification caught new tab buttons
  // hidden despite user having the seeded perms.
  function _refresh(root) {
    var r = root || document;
    r.querySelectorAll('[data-permission], [data-tab-permission]').forEach(function (el) {
      if (el.style && el.style.display === 'none') el.style.removeProperty('display');
      if (el.hasAttribute('disabled') && el.getAttribute('data-permission-mode') === 'disable') {
        el.removeAttribute('disabled');
        if (el.style) { el.style.removeProperty('opacity'); el.style.removeProperty('pointer-events'); }
        if (el.title === 'אין הרשאה') el.removeAttribute('title');
      }
    });
    _scan(r);
  }

  window.PermissionUI = {
    apply()              { _scan(document); },
    applyTo(container)   { if (container) _scan(container); },
    check(permission)    { return _checkPermStr(permission); },
    refresh(root)        { _refresh(root); },
    refreshTo(container) { if (container) _refresh(container); }
  };
})();
