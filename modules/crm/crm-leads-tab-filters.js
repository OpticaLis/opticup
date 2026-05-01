/* =============================================================================
   crm-leads-tab-filters.js — filter-chip + pagination rendering for the leads
   tab. Extracted verbatim from crm-leads-tab.js (P31 commit 0a) to bring the
   parent file under the 320-line P31 headroom requirement. No logic changes —
   the renderChipsBar and renderPagination bodies are byte-for-byte the same as
   the originals; only the surrounding state access is parameterized through
   `opts` (callers pass current values + callbacks instead of closing over
   module-private state).

   API:
     CrmLeadsTabFilters.renderChipsBar(host, {
       search: string,
       state:  { statuses, fromDate, toDate, noResp48, source, language },
       onClearChip: function (chipKey) -> void
     })
     CrmLeadsTabFilters.renderPagination(box, {
       total:       int,
       currentPage: int,
       pageSize:    int,
       hasMoreSrv:  boolean,
       onPageChange: function (newPage) -> void,
       onLoadMore:   function () -> Promise
     })

   Tailwind class constants for the chip + pagination buttons live here too.
   ============================================================================= */
(function () {
  'use strict';

  var CLS_CHIP        = 'inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium';
  var CLS_CHIP_CLOSE  = 'cursor-pointer font-bold opacity-70 hover:opacity-100 text-base leading-none';
  var CLS_PAGE_BTN    = 'px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed';
  var CLS_PAGE_ACTIVE = 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold';

  function renderChipsBar(host, opts) {
    if (!host) return;
    var searchTxt = (opts && opts.search) || '';
    var state  = (opts && opts.state)  || {};
    var onClearChip = opts && opts.onClearChip;
    var chips = [];
    if (searchTxt) chips.push({ k: 'search', label: 'חיפוש: ' + searchTxt });
    if (window.CrmLeadFilters) chips = chips.concat(CrmLeadFilters.renderChips(state));
    if (!chips.length) { host.innerHTML = ''; return; }
    host.className = 'flex items-center gap-2 flex-wrap mb-3';
    host.innerHTML = '<span class="text-xs font-semibold text-slate-600">פילטרים פעילים:</span>' + chips.map(function (c) {
      return '<span class="' + CLS_CHIP + '" data-chip="' + c.k + '">' +
        escapeHtml(c.label) +
        '<span class="' + CLS_CHIP_CLOSE + '" data-clear-chip="' + c.k + '">×</span>' +
      '</span>';
    }).join('');
    host.querySelectorAll('[data-clear-chip]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (typeof onClearChip === 'function') onClearChip(el.getAttribute('data-clear-chip'));
      });
    });
  }

  function renderPaginationBar(box, opts) {
    if (!box) return;
    var total = (opts && opts.total) || 0;
    var pageSize = (opts && opts.pageSize) || 50;
    var currentPage = (opts && opts.currentPage) || 1;
    var hasMoreSrv = !!(opts && opts.hasMoreSrv);
    var onPageChange = opts && opts.onPageChange;
    var onLoadMore   = opts && opts.onLoadMore;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    box.className = 'flex items-center gap-2 flex-wrap mt-4';
    if (totalPages <= 1) { box.innerHTML = '<span class="text-sm text-slate-500">סה״כ ' + total + ' לידים</span>'; return; }

    var html = '<button class="' + CLS_PAGE_BTN + '" ' + (currentPage === 1 ? 'disabled' : '') + ' data-page="prev">›</button>';
    var pages = [1];
    for (var i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (totalPages > 1) pages.push(totalPages);
    pages = Array.from(new Set(pages)).sort(function (a, b) { return a - b; });
    var prev = 0;
    pages.forEach(function (p) {
      if (p - prev > 1) html += '<span class="text-slate-400 px-1">…</span>';
      html += '<button class="' + (p === currentPage ? CLS_PAGE_ACTIVE : CLS_PAGE_BTN) + '" data-page="' + p + '">' + p + '</button>';
      prev = p;
    });
    html += '<button class="' + CLS_PAGE_BTN + '" ' + (currentPage === totalPages ? 'disabled' : '') + ' data-page="next">‹</button>';
    html += '<span class="text-sm text-slate-500 ms-2">עמוד ' + currentPage + ' מתוך ' + totalPages + ' · סה״כ טעון ' + total + '</span>';
    if (hasMoreSrv) html += '<button type="button" class="' + CLS_PAGE_BTN + ' ms-2" id="load-more-leads">⬇ טען עוד מהשרת</button>';
    box.innerHTML = html;
    var moreBtn = box.querySelector('#load-more-leads');
    if (moreBtn && typeof onLoadMore === 'function') {
      moreBtn.addEventListener('click', async function () { moreBtn.disabled = true; moreBtn.textContent = 'טוען...'; await onLoadMore(); });
    }
    box.querySelectorAll('button[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-page');
        var next = currentPage;
        if (v === 'prev') next = Math.max(1, currentPage - 1);
        else if (v === 'next') next = Math.min(totalPages, currentPage + 1);
        else next = parseInt(v, 10) || 1;
        if (typeof onPageChange === 'function') onPageChange(next);
      });
    });
  }

  window.CrmLeadsTabFilters = { renderChipsBar: renderChipsBar, renderPaginationBar: renderPaginationBar };
})();
