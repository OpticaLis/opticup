/* table-builder-extensions.js — Optional extensions for TableBuilder
   ============================================================================
   Houses extension helpers that would otherwise push table-builder.js past
   Iron Rule 12's 350-line cap. Loaded BEFORE table-builder.js in HTML so the
   global is available when TableBuilder.create() runs.

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #6 — data-table extension, EXTEND verdict per RULE_21_INVESTIGATION).

   Public API (window.TableBuilderExtensions):
     renderPagination(wrapper, state) — renders or refreshes the .tb-pagination
       footer inside `wrapper`. Returns the clamped current-page number if the
       requested page was beyond available pages, else returns null (no clamp).
       state: { total, pageSize, currentPage, onPageChange(p) }

   Deps: shared/css/table.css (.tb-pagination* rules already added by this
   SPEC's group-header commit).
   ============================================================================ */

(function () {
  'use strict';

  function _mkBtn(label, page, currentPage, pageCount, onChange) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tb-pagination-btn';
    b.textContent = label;
    if (page === currentPage) b.classList.add('active');
    if (page < 1 || page > pageCount || page === currentPage) b.disabled = true;
    b.addEventListener('click', function () {
      if (b.disabled) return;
      onChange(page);
    });
    return b;
  }

  function renderPagination(wrapper, state) {
    if (!wrapper) return null;
    var old = wrapper.querySelector('.tb-pagination');
    if (old) old.remove();

    var pageSize = state.pageSize || 0;
    if (pageSize <= 0) return null;
    var total = state.total || 0;
    var pageCount = Math.max(1, Math.ceil(total / pageSize));
    var current = state.currentPage || 1;
    var clamped = null;
    if (current > pageCount) { clamped = pageCount; current = pageCount; }

    var startIdx = total === 0 ? 0 : (current - 1) * pageSize + 1;
    var endIdx   = Math.min(current * pageSize, total);

    var pag = document.createElement('div');
    pag.className = 'tb-pagination';

    var info = document.createElement('div');
    info.className = 'tb-pagination-info';
    info.textContent = startIdx + '–' + endIdx + ' / ' + total;
    pag.appendChild(info);

    var ctrls = document.createElement('div');
    ctrls.className = 'tb-pagination-controls';
    var onChange = (typeof state.onPageChange === 'function')
      ? state.onPageChange : function () {};

    ctrls.appendChild(_mkBtn('‹', current - 1, current, pageCount, onChange));
    var from = Math.max(1, current - 2);
    var to   = Math.min(pageCount, from + 4);
    for (var p = from; p <= to; p++) {
      var btn = _mkBtn(String(p), p, current, pageCount, onChange);
      // Page-number buttons should be clickable on non-active pages
      if (p !== current) btn.disabled = false;
      ctrls.appendChild(btn);
    }
    ctrls.appendChild(_mkBtn('›', current + 1, current, pageCount, onChange));

    pag.appendChild(ctrls);
    wrapper.appendChild(pag);

    return clamped;
  }

  window.TableBuilderExtensions = {
    renderPagination: renderPagination
  };
})();
