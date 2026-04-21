/* =============================================================================
   crm-leads-views.js — Kanban + Cards view (B8 Tailwind rewrite — FINAL-02)
   Invoked from crm-leads-tab.js after filter+sort. Click → openCrmLeadDetail.
   ============================================================================= */
(function () {
  'use strict';

  var KANBAN_COLUMNS = [
    { slug: 'new',       label: 'חדש',   headBg: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
    { slug: 'contacted', label: 'ממתין', headBg: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-800' },
    { slug: 'booked',    label: 'הוזמן', headBg: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-800' },
    { slug: 'confirmed', label: 'אישר',  headBg: 'bg-indigo-500',  chip: 'bg-indigo-100 text-indigo-800' }
  ];

  var CLS_KANBAN_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';
  var CLS_KANBAN_COL  = 'bg-slate-50 rounded-lg p-3 min-h-[200px] flex flex-col gap-2';
  var CLS_KANBAN_HEAD = 'flex items-center justify-between text-white px-3 py-2 rounded-md font-semibold text-sm';
  var CLS_KANBAN_CARD = 'bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 cursor-pointer transition';
  var CLS_CARD_GRID   = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  var CLS_LEAD_CARD   = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transition flex gap-3';
  var CLS_AVATAR      = 'w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shrink-0';
  var CLS_TAG_PILL    = 'inline-block text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-1';

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

  // ---- Kanban view ----
  function renderCrmLeadsKanban(leads) {
    var host = document.getElementById('leads-view-kanban');
    if (!host) return;
    var byStatus = {};
    KANBAN_COLUMNS.forEach(function (c) { byStatus[c.slug] = []; });
    (leads || []).forEach(function (l) {
      var k = byStatus[l.status] ? l.status : KANBAN_COLUMNS[0].slug;
      byStatus[k].push(l);
    });

    var html = '<div class="' + CLS_KANBAN_GRID + '">';
    KANBAN_COLUMNS.forEach(function (col) {
      var list = byStatus[col.slug] || [];
      html += '<div class="' + CLS_KANBAN_COL + '">' +
        '<div class="' + CLS_KANBAN_HEAD + ' ' + col.headBg + '">' +
          '<span>' + escapeHtml(col.label) + '</span>' +
          '<span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">' + list.length + '</span>' +
        '</div>';
      if (!list.length) {
        html += '<div class="text-center text-slate-400 text-sm py-4">—</div>';
      } else {
        list.slice(0, 30).forEach(function (l) {
          html += '<div class="' + CLS_KANBAN_CARD + '" data-lead-id="' + escapeHtml(l.id) + '">' +
            '<div class="font-bold text-slate-800 text-sm">' + escapeHtml(l.full_name || '') + '</div>' +
            '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(l.phone)) + '</div>' +
            '<div class="mt-2">' + CrmHelpers.statusBadgeHtml('lead', l.status) + '</div>' +
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

  // ---- Cards view ----
  function renderCrmLeadsCards(leads) {
    var host = document.getElementById('leads-view-cards');
    if (!host) return;
    var list = (leads || []).slice(0, 60);
    if (!list.length) {
      host.innerHTML = '<div class="text-center text-slate-400 py-10 bg-white rounded-lg border border-slate-200">אין לידים להצגה</div>';
      return;
    }
    var html = '<div class="' + CLS_CARD_GRID + '">';
    list.forEach(function (l) {
      html += '<div class="' + CLS_LEAD_CARD + '" data-lead-id="' + escapeHtml(l.id) + '">' +
        '<div class="' + CLS_AVATAR + '">' + escapeHtml(initials(l.full_name)) + '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-semibold text-slate-900 text-sm truncate">' + escapeHtml(l.full_name || '') + '</div>' +
          '<div class="text-xs text-slate-500 mt-0.5" style="direction:ltr;text-align:end">' + escapeHtml(CrmHelpers.formatPhone(l.phone)) + '</div>' +
          '<div class="text-xs text-slate-500">' + escapeHtml(l.city || '') + '</div>' +
          '<div class="mt-2">' + CrmHelpers.statusBadgeHtml('lead', l.status) + '</div>' +
          (Array.isArray(l.tag_names) && l.tag_names.length ? '<div class="mt-2">' + renderTagPills(l.tag_names) + '</div>' : '') +
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
      return '<span class="' + CLS_TAG_PILL + '">' + escapeHtml(n) + '</span>';
    }).join('');
  }
})();
