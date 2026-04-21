/* =============================================================================
   crm-leads-views.js — Kanban + Cards view renderers for the Leads tab (B7)
   Invoked from crm-leads-tab.js after filter+sort. Read-only — clicks open
   the lead detail modal via window.openCrmLeadDetail.
   Exports:
     window.renderCrmLeadsKanban(leads)
     window.renderCrmLeadsCards(leads)
   ============================================================================= */
(function () {
  'use strict';

  var KANBAN_COLUMNS = [
    { slug: 'new',       label: 'חדש',   color: '#3b82f6' },
    { slug: 'contacted', label: 'ממתין', color: '#f59e0b' },
    { slug: 'booked',    label: 'הוזמן', color: '#a855f7' },
    { slug: 'confirmed', label: 'אישר',  color: '#10b981' }
  ];

  function initials(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    var parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function openDetail(id) {
    if (typeof window.openCrmLeadDetail === 'function') window.openCrmLeadDetail(id);
  }

  // ---- Kanban view ---- (4 status columns with colored headers + left-border cards)
  function renderCrmLeadsKanban(leads) {
    var host = document.getElementById('leads-view-kanban');
    if (!host) return;
    var byStatus = {};
    KANBAN_COLUMNS.forEach(function (c) { byStatus[c.slug] = []; });
    (leads || []).forEach(function (l) {
      var k = byStatus[l.status] ? l.status : KANBAN_COLUMNS[0].slug;
      byStatus[k].push(l);
    });

    var html = '<div class="crm-kanban-grid">';
    KANBAN_COLUMNS.forEach(function (col) {
      var list = byStatus[col.slug] || [];
      html += '<div class="crm-kanban-col">' +
        '<div class="crm-kanban-col-header" style="background:' + escapeHtml(col.color) + '">' +
          '<span>' + escapeHtml(col.label) + '</span>' +
          '<span class="crm-kanban-col-count">' + list.length + '</span>' +
        '</div>';
      if (!list.length) {
        html += '<div class="crm-detail-empty" style="padding:10px">—</div>';
      } else {
        list.slice(0, 30).forEach(function (l) {
          html += '<div class="crm-kanban-card" data-lead-id="' + escapeHtml(l.id) + '" style="border-inline-end-color:' + escapeHtml(col.color) + '">' +
            '<div style="font-weight:700">' + escapeHtml(l.full_name || '') + '</div>' +
            '<div style="font-size:0.78rem;color:var(--crm-text-muted);direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(l.phone)) + '</div>' +
            '<div style="margin-top:4px">' + CrmHelpers.statusBadgeHtml('lead', l.status) + '</div>' +
            '</div>';
        });
      }
      html += '</div>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-lead-id]').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.getAttribute('data-lead-id')); });
    });
  }
  window.renderCrmLeadsKanban = renderCrmLeadsKanban;

  // ---- Cards view ---- (3-col grid with gradient avatar circles + tag pills)
  function renderCrmLeadsCards(leads) {
    var host = document.getElementById('leads-view-cards');
    if (!host) return;
    var list = (leads || []).slice(0, 60);
    if (!list.length) {
      host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">אין לידים להצגה</div>';
      return;
    }
    var html = '<div class="crm-card-grid">';
    list.forEach(function (l) {
      html += '<div class="crm-lead-card" data-lead-id="' + escapeHtml(l.id) + '">' +
        '<div class="crm-avatar-gradient md">' + escapeHtml(initials(l.full_name)) + '</div>' +
        '<div class="crm-lead-card-body">' +
          '<div class="crm-lead-card-name">' + escapeHtml(l.full_name || '') + '</div>' +
          '<div class="crm-lead-card-meta" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(l.phone)) + '</div>' +
          '<div class="crm-lead-card-meta">' + escapeHtml(l.city || '') + '</div>' +
          '<div style="margin-top:6px">' + CrmHelpers.statusBadgeHtml('lead', l.status) + ' ' + renderTagPills(l.tag_names) + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-lead-id]').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.getAttribute('data-lead-id')); });
    });
  }
  window.renderCrmLeadsCards = renderCrmLeadsCards;

  function renderTagPills(names) {
    if (!Array.isArray(names) || !names.length) return '';
    return names.slice(0, 3).map(function (n) {
      return '<span class="crm-tag-pill">' + escapeHtml(n) + '</span>';
    }).join('');
  }
})();
