/* =============================================================================
   crm-short-links-stats.js — Orchestrator: Short Link Stats tab (M4 CRM).
   Coordinates 4 tiles: filter-bar, template-static-card, broadcasts-table,
   drilldown. Stable entry point: window.loadCrmShortLinksStats(host).
   Redesigned by M4_SHORT_LINKS_DASHBOARD_REDESIGN (2026-05-20).
   Sub-tiles live in modules/crm/crm-short-links-tiles/*.js.
   ============================================================================= */
(function () {
  'use strict';

  /* Section containers — created once inside #short-links-host. */
  var _elTemplateStatic = null;
  var _elFilterBar      = null;
  var _elBroadcasts     = null;
  var _elDrilldown      = null;

  /* Main entry point — called by crm-init.js / crm-bootstrap.js. */
  async function loadCrmShortLinksStats(host) {
    if (!host) return;

    /* Scaffold: 4 sibling sections inside the host div. */
    host.innerHTML =
      '<div class="space-y-4">' +
        '<div>' +
          '<h4 class="text-base font-bold text-slate-800 mb-1">&#x1F517; קישורים קצרים — סטטיסטיקה</h4>' +
          '<p class="text-xs text-slate-500 mb-3">ניתוח ביצועי שידורים + קישורי תשתית סטטיים. לחץ על שורת שידור לפירוט קישורים.</p>' +
        '</div>' +
        '<div id="sl-template-static"></div>' +
        '<div id="sl-filter-bar"></div>' +
        '<div id="sl-broadcasts"></div>' +
        '<div id="sl-drilldown"></div>' +
      '</div>';

    _elTemplateStatic = host.querySelector('#sl-template-static');
    _elFilterBar      = host.querySelector('#sl-filter-bar');
    _elBroadcasts     = host.querySelector('#sl-broadcasts');
    _elDrilldown      = host.querySelector('#sl-drilldown');

    /* Initialize drilldown shell (starts hidden). */
    CrmShortLinksDrilldown.init(_elDrilldown);

    /* Render filter bar (uses shared state). */
    CrmShortLinksFilterBar.render(_elFilterBar, _onFilterChange);

    /* Load template-static card and broadcasts table in parallel. */
    await Promise.all([
      _renderTemplateStatic(),
      _renderBroadcasts()
    ]);
  }

  window.loadCrmShortLinksStats = loadCrmShortLinksStats;

  /* Called whenever any filter chip changes. */
  function _onFilterChange(state) {
    /* Date change → full reload (new DB query needed). */
    /* Toggle / link-type change → client-side re-filter only. */
    CrmShortLinksBroadcastsTable.applyFilter(state);
  }

  async function _renderTemplateStatic() {
    try {
      await CrmShortLinksTemplateStaticCard.render(_elTemplateStatic);
    } catch (e) {
      console.error('template-static-card render error:', e);
      _elTemplateStatic.innerHTML =
        '<div class="text-rose-500 text-sm py-4 text-center">שגיאה בטעינת קישורים סטטיים: ' +
        escapeHtml(e.message || String(e)) + '</div>';
    }
  }

  async function _renderBroadcasts() {
    var state = CrmShortLinksFilterBar.getState();
    try {
      await CrmShortLinksBroadcastsTable.render(
        _elBroadcasts,
        state,
        _onBroadcastRowClick
      );
    } catch (e) {
      console.error('broadcasts-table render error:', e);
      _elBroadcasts.innerHTML =
        '<div class="text-rose-500 text-sm py-4 text-center">שגיאה בטעינת שידורים: ' +
        escapeHtml(e.message || String(e)) + '</div>';
    }
  }

  /* Triggered when user clicks a broadcast row in Component B. */
  function _onBroadcastRowClick(broadcastId, broadcastName) {
    var state = CrmShortLinksFilterBar.getState();
    CrmShortLinksDrilldown.openForBroadcast(broadcastId, broadcastName, state);
    /* Scroll drill-down into view (smooth, non-blocking). */
    if (_elDrilldown) {
      setTimeout(function () {
        _elDrilldown.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
})();
