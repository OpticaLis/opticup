// modules/storefront/studio-leads.js
// Leads dashboard with filters and CSV export (CMS-3)

let studioLeads = [];
let leadsFilters = { period: 'month', source: '', campaign: '', search: '' };

/**
 * Load leads for tenant
 */
async function loadLeads() {
  try {
    let query = sb.from('v_admin_leads')
      .select('*').eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false }).limit(200);

    const { data, error } = await query;
    if (error) throw error;
    studioLeads = data || [];
    renderLeadsDashboard(studioLeads);
  } catch (err) {
    console.error('Load leads error:', err);
    Toast.error('שגיאה בטעינת לידים');
  }
}

/**
 * Filter leads by current filters
 */
function getFilteredLeads() {
  let filtered = [...studioLeads];
  const now = new Date();

  // Date filter
  if (leadsFilters.period === 'today') {
    const today = now.toISOString().slice(0, 10);
    filtered = filtered.filter(l => l.created_at?.startsWith(today));
  } else if (leadsFilters.period === 'week') {
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    filtered = filtered.filter(l => l.created_at >= weekAgo);
  } else if (leadsFilters.period === 'month') {
    const monthAgo = new Date(now - 30 * 86400000).toISOString();
    filtered = filtered.filter(l => l.created_at >= monthAgo);
  }

  // Source filter
  if (leadsFilters.source) {
    filtered = filtered.filter(l => (l.utm_source || 'direct') === leadsFilters.source);
  }
  // Campaign filter
  if (leadsFilters.campaign) {
    filtered = filtered.filter(l => l.utm_campaign === leadsFilters.campaign);
  }
  // Search
  if (leadsFilters.search) {
    const q = leadsFilters.search.toLowerCase();
    filtered = filtered.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

/**
 * Render leads dashboard
 */
function renderLeadsDashboard() {
  const container = document.getElementById('studio-leads-content');
  if (!container) return;

  const filtered = getFilteredLeads();

  // Collect distinct sources and campaigns
  const sources = [...new Set(studioLeads.map(l => l.utm_source || 'direct'))].sort();
  const campaigns = [...new Set(studioLeads.map(l => l.utm_campaign).filter(Boolean))].sort();

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = studioLeads.filter(l => l.created_at?.startsWith(today)).length;
  const topSource = sources.length ? sources.reduce((a, b) =>
    studioLeads.filter(l => (l.utm_source || 'direct') === a).length >=
    studioLeads.filter(l => (l.utm_source || 'direct') === b).length ? a : b
  ) : '—';

  let html = `<div class="leads-filters">
    <select id="leads-period" class="studio-field" onchange="leadsFilters.period=this.value;renderLeadsDashboard()">
      <option value="all" ${leadsFilters.period === 'all' ? 'selected' : ''}>הכל</option>
      <option value="today" ${leadsFilters.period === 'today' ? 'selected' : ''}>היום</option>
      <option value="week" ${leadsFilters.period === 'week' ? 'selected' : ''}>שבוע אחרון</option>
      <option value="month" ${leadsFilters.period === 'month' ? 'selected' : ''}>חודש אחרון</option>
    </select>
    <select id="leads-source" class="studio-field" onchange="leadsFilters.source=this.value;renderLeadsDashboard()">
      <option value="">כל המקורות</option>
      ${sources.map(s => `<option value="${escapeAttr(s)}" ${leadsFilters.source === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
    </select>
    <select id="leads-campaign" class="studio-field" onchange="leadsFilters.campaign=this.value;renderLeadsDashboard()">
      <option value="">כל הקמפיינים</option>
      ${campaigns.map(c => `<option value="${escapeAttr(c)}" ${leadsFilters.campaign === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
    </select>
    <input type="text" id="leads-search" class="studio-field" placeholder="חיפוש שם/טלפון..." value="${escapeAttr(leadsFilters.search)}" oninput="leadsFilters.search=this.value;renderLeadsDashboard()">
    <button class="btn btn-sm" onclick="exportLeadsCSV()" title="ייצוא CSV">📥 CSV</button>
  </div>`;

  // Stats row
  html += `<div class="leads-stats">
    <div class="leads-stat"><span class="leads-stat-num">${filtered.length}</span><span class="leads-stat-label">לידים (סינון)</span></div>
    <div class="leads-stat"><span class="leads-stat-num">${todayCount}</span><span class="leads-stat-label">היום</span></div>
    <div class="leads-stat"><span class="leads-stat-num">${escapeHtml(topSource)}</span><span class="leads-stat-label">מקור מוביל</span></div>
    <div class="leads-stat"><span class="leads-stat-num">${studioLeads.length}</span><span class="leads-stat-label">סה״כ</span></div>
  </div>`;

  if (!filtered.length) {
    html += '<div class="studio-empty">אין לידים בתקופה זו</div>';
  } else {
    html += `<div class="leads-table-wrap"><table class="leads-table">
      <thead><tr>
        <th>תאריך</th><th>שם</th><th>טלפון</th><th>אימייל</th>
        <th>מקור</th><th>קמפיין</th><th>עמוד</th><th>Webhook</th>
      </tr></thead><tbody>`;

    for (const l of filtered) {
      const date = l.created_at ? new Date(l.created_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
      const whStatus = l.webhook_status === 'sent' ? '✅' : l.webhook_status === 'failed' ? '❌' : '—';
      html += `<tr class="leads-row" onclick="toggleLeadDetail(this)">
        <td>${date}</td>
        <td>${escapeHtml(l.name || '—')}</td>
        <td><a href="tel:${escapeAttr(l.phone || '')}">${escapeHtml(l.phone || '—')}</a></td>
        <td>${escapeHtml(l.email || '—')}</td>
        <td>${escapeHtml(l.utm_source || l.source || 'direct')}</td>
        <td>${escapeHtml(l.utm_campaign || '—')}</td>
        <td class="leads-page-cell">${escapeHtml(l.page_url || '—')}</td>
        <td>${whStatus}</td>
      </tr>
      <tr class="leads-detail" style="display:none"><td colspan="8">
        <div class="leads-detail-content">
          ${l.message ? `<p><strong>הודעה:</strong> ${escapeHtml(l.message)}</p>` : ''}
          <p><strong>UTM:</strong> source=${escapeHtml(l.utm_source || '')} / medium=${escapeHtml(l.utm_medium || '')} / campaign=${escapeHtml(l.utm_campaign || '')} / content=${escapeHtml(l.utm_content || '')} / term=${escapeHtml(l.utm_term || '')}</p>
          ${l.webhook_response ? `<p><strong>Webhook Response:</strong> <code>${escapeHtml(l.webhook_response)}</code></p>` : ''}
        </div>
      </td></tr>`;
    }
    html += '</tbody></table></div>';
  }
  container.innerHTML = html;
}

/**
 * Toggle lead detail row
 */
function toggleLeadDetail(rowEl) {
  const detail = rowEl.nextElementSibling;
  if (detail?.classList.contains('leads-detail')) {
    detail.style.display = detail.style.display === 'none' ? '' : 'none';
  }
}

/**
 * Export filtered leads to CSV
 */
function exportLeadsCSV() {
  const filtered = getFilteredLeads();
  if (!filtered.length) { Toast.warning('אין לידים לייצוא'); return; }

  const headers = ['תאריך', 'שם', 'טלפון', 'אימייל', 'הודעה', 'מקור', 'קמפיין', 'עמוד', 'Webhook'];
  const rows = filtered.map(l => [
    l.created_at ? new Date(l.created_at).toLocaleString('he-IL') : '',
    l.name || '', l.phone || '', l.email || '', (l.message || '').replace(/[\n\r]/g, ' '),
    l.utm_source || l.source || 'direct', l.utm_campaign || '',
    l.page_url || '', l.webhook_status || 'none'
  ]);

  // BOM for Excel Hebrew support
  let csv = '\uFEFF' + headers.join(',') + '\n';
  for (const row of rows) {
    csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `leads_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  Toast.success('הקובץ הורד');
}
