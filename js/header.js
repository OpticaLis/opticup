// =========================================================
// header.js — Sticky Header (Phase 3.8)
// Load after: shared.js, auth-service.js
// =========================================================

const FALLBACK_LOGO =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"' +
  ' stroke="currentColor" stroke-width="1.5">' +
  '<circle cx="8" cy="14" r="4"/><circle cx="16" cy="14" r="4"/>' +
  '<path d="M12 14h0"/><path d="M4 14V10"/><path d="M20 14V10"/>' +
  '</svg>';

document.addEventListener('DOMContentLoaded', initHeader);

async function initHeader() {
  const emp = JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || 'null');
  if (!emp) return;

  let tenantName = '', logoUrl = '';
  const tid = getTenantId();
  if (tid) {
    const { data } = await sb.from('tenants')
      .select('name, logo_url')
      .eq('id', tid)
      .single();
    if (data) {
      tenantName = data.name || '';
      logoUrl = data.logo_url || '';
    }
  }

  const role = sessionStorage.getItem(SK.ROLE) || '';
  buildHeader(emp, tenantName, logoUrl, role);
}

function buildHeader(emp, tenantName, logoUrl, role) {
  const logoHtml = logoUrl
    ? '<img class="header-logo" src="' + escapeHtml(logoUrl) +
      '" alt="' + escapeHtml(tenantName) + '">'
    : '<div class="header-logo-placeholder">' + FALLBACK_LOGO + '</div>';

  const el = document.createElement('header');
  el.id = 'app-header';
  el.className = 'app-header';
  el.innerHTML =
    '<div class="header-right">' +
      logoHtml +
      '<span class="header-store-name">' + escapeHtml(tenantName) + '</span>' +
    '</div>' +
    '<div class="header-center"><a href="/" style="color:inherit;text-decoration:none;cursor:pointer">Optic Up</a></div>' +
    '<div class="header-left">' +
      '<div class="header-employee">' +
        '<span class="header-emp-name">' + escapeHtml(emp.name || '') + '</span>' +
        '<span class="header-emp-role">' + escapeHtml(role) + '</span>' +
      '</div>' +
      '<button class="header-logout">\u05D9\u05E6\u05D9\u05D0\u05D4</button>' +
    '</div>';

  el.querySelector('.header-logout').addEventListener('click', clearSession);
  document.body.insertBefore(el, document.body.firstChild);
}
