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

  // Scan a container (or document) for [data-permission] elements
  function _scan(root) {
    if (typeof hasPermission !== 'function') {
      console.warn('PermissionUI: hasPermission() not available — hiding all guarded elements');
    }
    const els = (root || document).querySelectorAll('[data-permission]');
    els.forEach(_processEl);
  }

  window.PermissionUI = {
    apply()            { _scan(document); },
    applyTo(container) { if (container) _scan(container); },
    check(permission)  { return _checkPermStr(permission); }
  };
})();
