// =========================================================
// alerts-badge.js — Bell icon + unread badge + dropdown panel
// Load after: shared.js, auth-service.js, header.js
// Used on ALL pages (index, inventory, suppliers-debt, employees)
// =========================================================

let _alertsPanelOpen = false;
let _alertsRefreshTimer = null;
let _alertsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  // Wait briefly for header to render (initHeader is async)
  setTimeout(initAlertsBadge, 600);
});

// =========================================================
// 1. INIT — inject bell into header
// =========================================================
async function initAlertsBadge() {
  const header = document.getElementById('app-header');
  if (!header) return; // no header = not logged in
  const emp = JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || 'null');
  if (!emp) return;

  const leftZone = header.querySelector('.header-left');
  if (!leftZone) return;

  // Create bell wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'alerts-bell-wrapper';
  wrapper.innerHTML =
    '<button class="alerts-bell-btn" id="alertsBellBtn" title="\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA">' +
      '\uD83D\uDD14 <span class="alerts-badge" id="alertsBadge" style="display:none">0</span>' +
    '</button>';

  // Insert before logout button
  const logoutBtn = leftZone.querySelector('.header-logout');
  if (logoutBtn) {
    leftZone.insertBefore(wrapper, logoutBtn);
  } else {
    leftZone.appendChild(wrapper);
  }

  // Create dropdown panel (hidden)
  const panel = document.createElement('div');
  panel.className = 'alerts-panel';
  panel.id = 'alertsPanel';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  // Wire up click
  document.getElementById('alertsBellBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleAlertsPanel();
  });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (_alertsPanelOpen && !e.target.closest('.alerts-panel') && !e.target.closest('.alerts-bell-wrapper')) {
      closeAlertsPanel();
    }
  });

  // Initial fetch
  await refreshAlertsBadge();

  // Poll every 60s
  _alertsRefreshTimer = setInterval(refreshAlertsBadge, 60000);
}

// =========================================================
// 2. BADGE — fetch unread count
// =========================================================
async function refreshAlertsBadge() {
  const tid = getTenantId();
  if (!tid) return;

  try {
    const { count, error } = await sb.from(T.ALERTS)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tid)
      .eq('status', 'unread');

    if (error) { console.warn('alerts badge:', error.message); return; }

    const badge = document.getElementById('alertsBadge');
    if (!badge) return;

    const n = count || 0;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n > 0 ? 'inline-flex' : 'none';

    // Shake animation on new alerts
    const btn = document.getElementById('alertsBellBtn');
    if (btn && n > 0) {
      btn.classList.add('bell-shake');
      setTimeout(() => btn.classList.remove('bell-shake'), 1000);
    }
  } catch (err) {
    console.warn('alerts badge error:', err);
  }
}

// =========================================================
// 3. PANEL — toggle dropdown
// =========================================================
function toggleAlertsPanel() {
  if (_alertsPanelOpen) {
    closeAlertsPanel();
  } else {
    openAlertsPanel();
  }
}

function closeAlertsPanel() {
  const panel = document.getElementById('alertsPanel');
  if (panel) panel.style.display = 'none';
  _alertsPanelOpen = false;
}

async function openAlertsPanel() {
  const panel = document.getElementById('alertsPanel');
  if (!panel) return;

  // Position panel below bell
  const bell = document.getElementById('alertsBellBtn');
  if (bell) {
    const rect = bell.getBoundingClientRect();
    panel.style.top = (rect.bottom + 8) + 'px';
    panel.style.left = Math.max(8, rect.left - 200) + 'px';
  }

  panel.innerHTML = '<div class="alerts-panel-loading">\u05D8\u05D5\u05E2\u05DF...</div>';
  panel.style.display = 'block';
  _alertsPanelOpen = true;

  await loadAlertsList();
}

// =========================================================
// 4. LOAD — fetch last 10 unread alerts
// =========================================================
async function loadAlertsList() {
  const tid = getTenantId();
  const panel = document.getElementById('alertsPanel');
  if (!tid || !panel) return;

  try {
    const { data, error } = await sb.from(T.ALERTS)
      .select('*')
      .eq('tenant_id', tid)
      .eq('status', 'unread')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) { panel.innerHTML = '<div class="alerts-panel-empty">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA</div>'; return; }

    _alertsCache = data || [];
    renderAlertsPanel();
  } catch (err) {
    console.warn('alerts load error:', err);
  }
}

function renderAlertsPanel() {
  const panel = document.getElementById('alertsPanel');
  if (!panel) return;

  if (_alertsCache.length === 0) {
    panel.innerHTML =
      '<div class="alerts-panel-header">\uD83D\uDD14 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA</div>' +
      '<div class="alerts-panel-empty">\u05D0\u05D9\u05DF \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA</div>';
    return;
  }

  let html = '<div class="alerts-panel-header">\uD83D\uDD14 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA (' + _alertsCache.length + ' \u05D7\u05D3\u05E9\u05D5\u05EA)</div>';
  html += '<div class="alerts-panel-list">';

  for (const a of _alertsCache) {
    const severityIcon = a.severity === 'critical' ? '\uD83D\uDD34' : a.severity === 'warning' ? '\u26A0\uFE0F' : '\u2139\uFE0F';
    const severityClass = 'alert-item-' + (a.severity || 'info');
    const ago = timeAgo(a.created_at);
    const actions = buildAlertActions(a);

    html +=
      '<div class="alert-item ' + severityClass + '" id="alert-' + a.id + '">' +
        '<div class="alert-item-top">' +
          '<span class="alert-severity-icon">' + severityIcon + '</span>' +
          '<span class="alert-item-title">' + escapeHtml(a.title) + '</span>' +
        '</div>' +
        '<div class="alert-item-time">' + escapeHtml(ago) + '</div>' +
        '<div class="alert-actions">' + actions + '</div>' +
      '</div>';
  }

  html += '</div>';
  html += '<div class="alerts-panel-footer">' +
    '<button class="alerts-mark-all" onclick="markAllAlertsRead()">\u05E1\u05DE\u05DF \u05D4\u05DB\u05DC \u05DB\u05E0\u05E7\u05E8\u05D0\u05D5</button>' +
    '<a class="alerts-view-all" href="suppliers-debt.html">\uD83D\uDCCB \u05DB\u05DC \u05D4\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA</a>' +
    '</div>';

  panel.innerHTML = html;
}

// =========================================================
// 5. ACTION BUTTONS — build per alert type
// =========================================================
function buildAlertActions(alert) {
  const id = alert.id;
  let viewLabel = '\u05E6\u05E4\u05D4';
  if (alert.alert_type === 'ocr_low_confidence') viewLabel = '\u05D1\u05D3\u05D5\u05E7';

  return '<button class="alert-action-btn alert-action-view" onclick="alertAction(\'' + id + '\', \'view\')">' + viewLabel + '</button>' +
    '<button class="alert-action-btn alert-action-dismiss" onclick="alertAction(\'' + id + '\', \'dismiss\')">\u05D3\u05D7\u05D4</button>';
}

// =========================================================
// 6. ALERT ACTIONS — view / dismiss / mark read
// =========================================================
async function alertAction(alertId, action) {
  const tid = getTenantId();
  if (!tid) return;

  if (action === 'view') {
    // Find alert in cache to determine navigation
    const alert = _alertsCache.find(a => a.id === alertId);
    if (!alert) return;

    // Mark as read
    await sb.from(T.ALERTS)
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('tenant_id', tid);

    // Navigate based on entity_type
    if (alert.entity_type === 'supplier_document') {
      window.location.href = 'suppliers-debt.html';
    } else if (alert.entity_type === 'prepaid_deal') {
      window.location.href = 'suppliers-debt.html';
    } else if (alert.entity_type === 'ocr_extraction') {
      window.location.href = 'suppliers-debt.html';
    } else {
      window.location.href = 'suppliers-debt.html';
    }
    return;
  }

  if (action === 'dismiss') {
    const emp = JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || 'null');
    const { error } = await sb.from(T.ALERTS)
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_by: emp?.id || null
      })
      .eq('id', alertId)
      .eq('tenant_id', tid);

    if (error) { console.warn('dismiss error:', error.message); return; }

    // Remove from UI
    const el = document.getElementById('alert-' + alertId);
    if (el) el.remove();

    // Update cache
    _alertsCache = _alertsCache.filter(a => a.id !== alertId);

    // Refresh badge and re-render if empty
    await refreshAlertsBadge();
    if (_alertsCache.length === 0) renderAlertsPanel();
  }
}

async function markAllAlertsRead() {
  const tid = getTenantId();
  if (!tid) return;

  const { error } = await sb.from(T.ALERTS)
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('tenant_id', tid)
    .eq('status', 'unread');

  if (error) { console.warn('mark all read error:', error.message); return; }

  _alertsCache = [];
  renderAlertsPanel();
  await refreshAlertsBadge();
}

// =========================================================
// 7. TIME-AGO — Hebrew relative time
// =========================================================
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  if (diffMs < 0) return '\u05E2\u05DB\u05E9\u05D9\u05D5';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return '\u05E2\u05DB\u05E9\u05D9\u05D5';
  if (diffMin < 60) return '\u05DC\u05E4\u05E0\u05D9 ' + diffMin + ' \u05D3\u05E7\u05D5\u05EA';
  if (diffHr === 1) return '\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4';
  if (diffHr < 24) return '\u05DC\u05E4\u05E0\u05D9 ' + diffHr + ' \u05E9\u05E2\u05D5\u05EA';

  // Check if same calendar day
  if (now.toDateString() === then.toDateString()) return '\u05D4\u05D9\u05D5\u05DD';

  // Check yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === then.toDateString()) return '\u05D0\u05EA\u05DE\u05D5\u05DC';

  if (diffDay <= 7) return '\u05DC\u05E4\u05E0\u05D9 ' + diffDay + ' \u05D9\u05DE\u05D9\u05DD';
  if (diffDay <= 14) return '\u05DC\u05E4\u05E0\u05D9 \u05E9\u05D1\u05D5\u05E2';
  if (diffDay <= 30) return '\u05DC\u05E4\u05E0\u05D9 ' + Math.floor(diffDay / 7) + ' \u05E9\u05D1\u05D5\u05E2\u05D5\u05EA';
  if (diffDay <= 60) return '\u05DC\u05E4\u05E0\u05D9 \u05D7\u05D5\u05D3\u05E9';
  return '\u05DC\u05E4\u05E0\u05D9 ' + Math.floor(diffDay / 30) + ' \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD';
}
