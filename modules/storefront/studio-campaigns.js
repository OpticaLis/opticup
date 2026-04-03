// modules/storefront/studio-campaigns.js
// Campaigns management: list campaigns, view pages per campaign, CRUD, reorder
// Integrated into the Pages tab as a third view (alongside "כל העמודים" and "עמודי מותג")

let studioCampaigns = [];
let selectedCampaignId = null;
let campaignsLoaded = false;

// Status display config
const CAMPAIGN_STATUS = {
  active: { label: 'פעיל', color: '#16a34a', bg: '#dcfce7' },
  paused: { label: 'מושהה', color: '#ca8a04', bg: '#fef9c3' },
  ended:  { label: 'הסתיים', color: '#6b7280', bg: '#f3f4f6' },
};

// ============================================================
// Toggle to campaigns view
// ============================================================

function toggleCampaignsView() {
  // Update toggle buttons
  document.querySelectorAll('.page-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === 'campaigns');
  });

  const pageList = document.getElementById('studio-page-list');
  const brandList = document.getElementById('studio-brand-list');
  const campaignList = document.getElementById('studio-campaign-list');
  const editorArea = document.getElementById('studio-editor');

  if (pageList) pageList.style.display = 'none';
  if (brandList) brandList.style.display = 'none';
  if (campaignList) campaignList.style.display = 'block';
  if (editorArea) editorArea.innerHTML = '<div class="studio-empty-editor"><p>בחר קמפיין מהרשימה</p></div>';

  if (!campaignsLoaded) loadCampaigns();
}

// ============================================================
// Load campaigns from DB
// ============================================================

async function loadCampaigns() {
  const container = document.getElementById('studio-campaign-list');
  if (!container) return;

  container.innerHTML = '<div class="studio-empty">טוען קמפיינים...</div>';

  try {
    const { data, error } = await sb.from('v_admin_campaigns')
      .select('*')
      .eq('tenant_id', getTenantId());
    if (error) throw error;
    studioCampaigns = data || [];
    campaignsLoaded = true;
    selectedCampaignId = null;
    renderCampaignList();
  } catch (err) {
    console.error('[Campaigns] Load error:', err);
    container.innerHTML = '<div class="studio-empty" style="color:#ef4444;">שגיאה בטעינת קמפיינים</div>';
  }
}

// ============================================================
// Render campaign list (left sidebar)
// ============================================================

function renderCampaignList() {
  const container = document.getElementById('studio-campaign-list');
  if (!container) return;

  const headerHtml = `<div style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--g200);">
    <span style="font-weight:600;font-size:.9rem;">קמפיינים (${studioCampaigns.length})</span>
    <div style="display:flex;gap:6px;">
      <button class="btn btn-sm btn-primary" onclick="createCampaign()">+ קמפיין</button>
    </div>
  </div>`;

  if (studioCampaigns.length === 0) {
    container.innerHTML = headerHtml + '<div class="studio-empty" style="padding:30px;">אין קמפיינים עדיין. צרו את הקמפיין הראשון!</div>';
    return;
  }

  const listHtml = studioCampaigns.map(c => {
    const s = CAMPAIGN_STATUS[c.status] || CAMPAIGN_STATUS.active;
    const active = c.id === selectedCampaignId ? ' active' : '';
    const pageCount = c.page_count || 0;
    const dateRange = formatCampaignDates(c.start_date, c.end_date);

    return `<div class="studio-page-item${active}" data-id="${c.id}" onclick="selectCampaign('${c.id}')">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:1.2rem;">🎯</span>
        <div style="flex:1;min-width:0;">
          <div class="studio-page-title" style="font-weight:700;">${escapeHtml(c.name)}</div>
          <div style="font-size:.75rem;color:var(--g400);display:flex;gap:8px;margin-top:2px;">
            <span>${pageCount} עמודים</span>
            ${dateRange ? `<span>${dateRange}</span>` : ''}
          </div>
        </div>
        <span class="studio-badge" style="background:${s.bg};color:${s.color};">${s.label}</span>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = headerHtml + `<div style="padding:4px;overflow-y:auto;flex:1;">${listHtml}</div>`;
}

function formatCampaignDates(start, end) {
  if (!start && !end) return '';
  const fmt = d => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `מ-${fmt(start)}`;
  return `עד ${fmt(end)}`;
}

// ============================================================
// Select a campaign → show its detail in editor area
// ============================================================

async function selectCampaign(campaignId) {
  selectedCampaignId = campaignId;
  renderCampaignList(); // highlight active

  const campaign = studioCampaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  const editorArea = document.getElementById('studio-editor');
  if (!editorArea) return;

  // Load this campaign's pages
  let pages = [];
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });
    if (error) throw error;
    pages = (data || []).filter(p => p.status !== 'archived');
  } catch (err) {
    console.error('[Campaigns] Load campaign pages error:', err);
  }

  renderCampaignDetail(campaign, pages);
}

// ============================================================
// Render campaign detail (right panel)
// ============================================================

function renderCampaignDetail(campaign, pages) {
  const editorArea = document.getElementById('studio-editor');
  if (!editorArea) return;

  const s = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.active;

  // Campaign header with editable fields
  const headerHtml = `
    <div class="camp-detail-header">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:1.5rem;">🎯</span>
        <div style="flex:1;">
          <h2 style="margin:0;font-size:1.25rem;font-weight:700;">${escapeHtml(campaign.name)}</h2>
          <div style="font-size:.85rem;color:var(--g400);margin-top:2px;">/${escapeHtml(campaign.slug)}</div>
        </div>
        <span class="studio-badge" style="background:${s.bg};color:${s.color};font-size:.8rem;padding:4px 12px;">${s.label}</span>
      </div>
      ${campaign.description ? `<p style="color:var(--g500);font-size:.9rem;margin:0 0 12px;line-height:1.5;">${escapeHtml(campaign.description)}</p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="editCampaignDetails('${campaign.id}')" style="background:var(--g100);">✏️ ערוך פרטים</button>
        <button class="btn btn-sm" onclick="changeCampaignStatus('${campaign.id}')" style="background:var(--g100);">🔄 שנה סטטוס</button>
        <button class="btn btn-sm" onclick="addPageToCampaign('${campaign.id}')" style="background:linear-gradient(135deg,#c9a555,#e8da94);color:#000;font-weight:700;border:none;">+ עמוד לקמפיין</button>
        <button class="btn btn-sm" onclick="openCampaignAIBuilder('${campaign.id}')" style="background:linear-gradient(135deg,#1a1a1a,#333);color:#e8da94;font-weight:700;border:1px solid #c9a555;">🚀 קמפיין AI</button>
        <button class="btn btn-sm" onclick="deleteCampaign('${campaign.id}')" style="color:#ef4444;">🗑️</button>
      </div>
    </div>`;

  // Pages list
  let pagesHtml = '';
  if (pages.length === 0) {
    pagesHtml = '<div style="text-align:center;padding:40px 20px;color:var(--g400);">אין עמודים בקמפיין הזה עדיין.<br>לחצו "+ עמוד לקמפיין" להוספה.</div>';
  } else {
    const PAGE_TYPE_ICONS = { homepage: '🏠', legal: '📜', campaign: '🎯', guide: '📖', custom: '📄' };
    const STATUS_BADGES = {
      published: { label: 'פורסם', cls: 'badge-published' },
      draft:     { label: 'טיוטה', cls: 'badge-draft' },
      archived:  { label: 'ארכיון', cls: 'badge-archived' },
    };

    const rows = pages.map((p, idx) => {
      const icon = PAGE_TYPE_ICONS[p.page_type] || '📄';
      const statusBadge = STATUS_BADGES[p.status] || STATUS_BADGES.draft;
      const title = p.title || p.slug || '(ללא שם)';
      const slug = (p.slug || '').replace(/^\/|\/$/g, '');

      return `<div class="camp-page-row" draggable="true"
        ondragstart="campDragStart(event,'${p.id}',${idx})"
        ondragover="campDragOver(event)"
        ondrop="campDrop(event,'${p.id}',${idx},'${campaign.id}')">
        <div class="camp-drag-handle" title="גרור לשינוי סדר">⋮⋮</div>
        <span style="font-size:1rem;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</div>
          <div style="font-size:.75rem;color:var(--g400);">/${escapeHtml(slug)}</div>
        </div>
        <span class="studio-badge ${statusBadge.cls}">${statusBadge.label}</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm" onclick="event.stopPropagation();campOpenPage('${p.id}')" title="ערוך" style="padding:4px 8px;font-size:.75rem;background:var(--g100);">✏️</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();campRemovePage('${p.id}','${campaign.id}')" title="הסר מקמפיין" style="padding:4px 8px;font-size:.75rem;color:#ef4444;background:var(--g100);">✕</button>
        </div>
      </div>`;
    }).join('');

    pagesHtml = `<div class="camp-pages-list">${rows}</div>`;
  }

  editorArea.innerHTML = `
    <div class="camp-detail" style="padding:20px;">
      ${headerHtml}
      <div style="margin-top:20px;border-top:1px solid var(--g200);padding-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;font-size:1rem;font-weight:700;">עמודי הקמפיין (${pages.length})</h3>
        </div>
        ${pagesHtml}
      </div>
    </div>
    <style>
      .camp-detail-header { padding-bottom: 16px; border-bottom: 1px solid var(--g200); }
      .camp-page-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--g200); border-radius: 8px; margin-bottom: 6px; background: #fff; cursor: pointer; transition: all .15s; }
      .camp-page-row:hover { border-color: var(--primary); background: var(--g50); }
      .camp-page-row.drag-over { border-color: #c9a555; border-style: dashed; background: #fefdf8; }
      .camp-drag-handle { cursor: grab; color: var(--g300); font-size: .8rem; user-select: none; padding: 0 2px; }
      .camp-drag-handle:active { cursor: grabbing; }
    </style>`;
}

// ============================================================
// Drag and drop reorder
// ============================================================

let _campDragId = null;
let _campDragIdx = null;

function campDragStart(event, pageId, idx) {
  _campDragId = pageId;
  _campDragIdx = idx;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', pageId);
  // Slight delay to allow drag ghost
  setTimeout(() => event.target.style.opacity = '0.5', 0);
}

function campDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  // Visual feedback
  const row = event.target.closest('.camp-page-row');
  document.querySelectorAll('.camp-page-row').forEach(r => r.classList.remove('drag-over'));
  if (row) row.classList.add('drag-over');
}

async function campDrop(event, targetId, targetIdx, campaignId) {
  event.preventDefault();
  document.querySelectorAll('.camp-page-row').forEach(r => {
    r.classList.remove('drag-over');
    r.style.opacity = '1';
  });

  if (!_campDragId || _campDragId === targetId) return;

  // Reorder: swap sort_order values
  try {
    // Get current pages for this campaign
    const { data: pages } = await sb.from('v_admin_pages')
      .select('id, sort_order')
      .eq('tenant_id', getTenantId())
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });

    if (!pages) return;

    // Build new order
    const ordered = pages.map(p => p.id);
    const fromIdx = ordered.indexOf(_campDragId);
    const toIdx = ordered.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, _campDragId);

    // Update sort_order for each
    const updates = ordered.map((id, i) =>
      sb.from('storefront_pages').update({ sort_order: i }).eq('id', id)
    );
    await Promise.all(updates);

    // Refresh
    await selectCampaign(campaignId);
  } catch (err) {
    console.error('[Campaigns] Reorder error:', err);
    Toast.error('שגיאה בשינוי סדר');
  }

  _campDragId = null;
  _campDragIdx = null;
}

// ============================================================
// Open page in the regular editor (switch back to pages view)
// ============================================================

function campOpenPage(pageId) {
  // Switch to pages view
  toggleBrandPagesView(false);
  // Select the page
  if (typeof selectPage === 'function') {
    selectPage(pageId);
  }
}

// ============================================================
// Remove page from campaign (unlink, don't delete)
// ============================================================

async function campRemovePage(pageId, campaignId) {
  if (!confirm('להסיר את העמוד מהקמפיין? (העמוד לא יימחק)')) return;

  try {
    const { error } = await sb.from('storefront_pages')
      .update({ campaign_id: null })
      .eq('id', pageId);
    if (error) throw error;
    Toast.success('העמוד הוסר מהקמפיין');
    await refreshCampaignData(campaignId);
  } catch (err) {
    console.error('[Campaigns] Remove page error:', err);
    Toast.error('שגיאה בהסרת העמוד');
  }
}

// ============================================================
// Add existing or new page to campaign
// ============================================================

async function addPageToCampaign(campaignId) {
  // Get pages that are NOT in any campaign
  let unlinkedPages = [];
  try {
    const { data } = await sb.from('v_admin_pages')
      .select('id, title, slug, status, page_type')
      .eq('tenant_id', getTenantId())
      .is('campaign_id', null)
      .neq('status', 'archived')
      .order('title', { ascending: true });
    unlinkedPages = data || [];
  } catch (_) {}

  const optionsHtml = unlinkedPages.length > 0
    ? unlinkedPages.map(p => {
        const title = p.title || p.slug || '(ללא שם)';
        const slug = (p.slug || '').replace(/^\/|\/$/g, '');
        return `<option value="${p.id}">${escapeHtml(title)} (/${escapeHtml(slug)})</option>`;
      }).join('')
    : '';

  const existingSection = unlinkedPages.length > 0
    ? `<div class="studio-field-group">
        <label>שייך עמוד קיים</label>
        <select id="camp-link-page" class="studio-field">
          <option value="">— בחר עמוד —</option>
          ${optionsHtml}
        </select>
      </div>
      <div style="text-align:center;color:var(--g400);padding:8px;font-size:.85rem;">— או —</div>`
    : '';

  Modal.show({
    title: '+ עמוד לקמפיין',
    size: 'sm',
    content: `${existingSection}
      <div class="studio-field-group">
        <label>צור עמוד חדש</label>
        <input type="text" id="camp-new-title" class="studio-field" placeholder="כותרת העמוד החדש">
      </div>
      <div class="studio-field-group">
        <label>Slug</label>
        <input type="text" id="camp-new-slug" class="studio-field" dir="ltr" placeholder="page-slug">
      </div>`,
    footer: `<button class="btn btn-primary" onclick="submitAddPageToCampaign('${campaignId}')">הוסף</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitAddPageToCampaign(campaignId) {
  const linkExisting = document.getElementById('camp-link-page')?.value;
  const newTitle = document.getElementById('camp-new-title')?.value.trim();
  const newSlug = document.getElementById('camp-new-slug')?.value.trim();

  try {
    if (linkExisting) {
      // Link existing page
      const { error } = await sb.from('storefront_pages')
        .update({ campaign_id: campaignId })
        .eq('id', linkExisting);
      if (error) throw error;
      Toast.success('העמוד שויך לקמפיין');
    } else if (newTitle && newSlug) {
      // Create new page
      const slug = newSlug.startsWith('/') ? newSlug : '/' + newSlug + '/';
      const { error } = await sb.from('storefront_pages').insert({
        tenant_id: getTenantId(),
        slug,
        title: newTitle,
        page_type: 'campaign',
        lang: 'he',
        blocks: [],
        status: 'draft',
        is_system: false,
        campaign_id: campaignId,
      });
      if (error) {
        if (error.code === '23505' || (error.message || '').includes('unique')) {
          Toast.error('כתובת העמוד כבר קיימת');
          return;
        }
        throw error;
      }
      Toast.success('עמוד חדש נוצר בקמפיין');
      // Also refresh the global pages list
      if (typeof loadStudioPages === 'function') loadStudioPages();
    } else {
      Toast.warning('יש לבחור עמוד קיים או למלא כותרת + slug');
      return;
    }

    Modal.close();
    await refreshCampaignData(campaignId);
  } catch (err) {
    console.error('[Campaigns] Add page error:', err);
    Toast.error('שגיאה בהוספת עמוד: ' + err.message);
  }
}

// ============================================================
// Create new campaign
// ============================================================

function createCampaign() {
  Modal.show({
    title: '+ קמפיין חדש',
    size: 'sm',
    content: `
      <div class="studio-field-group"><label>שם הקמפיין</label><input type="text" id="nc-name" class="studio-field" placeholder="SUPERSALE 2026" oninput="ncAutoSlug()"></div>
      <div class="studio-field-group"><label>Slug</label><input type="text" id="nc-slug" class="studio-field" dir="ltr" placeholder="supersale-2026"></div>
      <div class="studio-field-group"><label>תיאור (אופציונלי)</label><textarea id="nc-desc" class="studio-field" rows="2" placeholder="תיאור קצר של הקמפיין"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="studio-field-group"><label>תאריך התחלה</label><input type="date" id="nc-start" class="studio-field"></div>
        <div class="studio-field-group"><label>תאריך סיום</label><input type="date" id="nc-end" class="studio-field"></div>
      </div>
      <div class="studio-field-group"><label>סטטוס</label><select id="nc-status" class="studio-field">
        <option value="active">פעיל</option><option value="paused">מושהה</option><option value="ended">הסתיים</option>
      </select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitCreateCampaign()">צור קמפיין</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

function ncAutoSlug() {
  const name = document.getElementById('nc-name')?.value || '';
  const slugEl = document.getElementById('nc-slug');
  if (slugEl) {
    slugEl.value = name
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05ff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  }
}

async function submitCreateCampaign() {
  const name = document.getElementById('nc-name')?.value.trim();
  const slug = document.getElementById('nc-slug')?.value.trim();
  const description = document.getElementById('nc-desc')?.value.trim();
  const start_date = document.getElementById('nc-start')?.value || null;
  const end_date = document.getElementById('nc-end')?.value || null;
  const status = document.getElementById('nc-status')?.value || 'active';

  if (!name || !slug) {
    Toast.warning('יש למלא שם ו-slug');
    return;
  }

  try {
    const { error } = await sb.from('campaigns').insert({
      tenant_id: getTenantId(),
      name,
      slug,
      description: description || null,
      start_date,
      end_date,
      status,
    });
    if (error) {
      if (error.code === '23505' || (error.message || '').includes('unique')) {
        Toast.error('slug כבר קיים — בחר שם אחר');
        return;
      }
      throw error;
    }
    Modal.close();
    Toast.success('קמפיין נוצר בהצלחה');
    await loadCampaigns();
  } catch (err) {
    console.error('[Campaigns] Create error:', err);
    Toast.error('שגיאה ביצירת קמפיין: ' + err.message);
  }
}

// ============================================================
// Edit campaign details
// ============================================================

function editCampaignDetails(campaignId) {
  const c = studioCampaigns.find(x => x.id === campaignId);
  if (!c) return;

  Modal.show({
    title: '✏️ עריכת קמפיין',
    size: 'sm',
    content: `
      <div class="studio-field-group"><label>שם</label><input type="text" id="ec-name" class="studio-field" value="${escapeAttr(c.name)}"></div>
      <div class="studio-field-group"><label>תיאור</label><textarea id="ec-desc" class="studio-field" rows="2">${escapeHtml(c.description || '')}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="studio-field-group"><label>תאריך התחלה</label><input type="date" id="ec-start" class="studio-field" value="${c.start_date || ''}"></div>
        <div class="studio-field-group"><label>תאריך סיום</label><input type="date" id="ec-end" class="studio-field" value="${c.end_date || ''}"></div>
      </div>`,
    footer: `<button class="btn btn-primary" onclick="submitEditCampaign('${campaignId}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitEditCampaign(campaignId) {
  const name = document.getElementById('ec-name')?.value.trim();
  const description = document.getElementById('ec-desc')?.value.trim();
  const start_date = document.getElementById('ec-start')?.value || null;
  const end_date = document.getElementById('ec-end')?.value || null;

  if (!name) { Toast.warning('שם חובה'); return; }

  try {
    const { error } = await sb.from('campaigns')
      .update({ name, description: description || null, start_date, end_date, updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    if (error) throw error;
    Modal.close();
    Toast.success('הקמפיין עודכן');
    await loadCampaigns();
    await selectCampaign(campaignId);
  } catch (err) {
    console.error('[Campaigns] Edit error:', err);
    Toast.error('שגיאה בעדכון');
  }
}

// ============================================================
// Change campaign status
// ============================================================

function changeCampaignStatus(campaignId) {
  const c = studioCampaigns.find(x => x.id === campaignId);
  if (!c) return;

  const options = Object.entries(CAMPAIGN_STATUS).map(([val, cfg]) => {
    const selected = val === c.status ? ' selected' : '';
    return `<option value="${val}"${selected}>${cfg.label}</option>`;
  }).join('');

  Modal.show({
    title: '🔄 שינוי סטטוס',
    size: 'sm',
    content: `<div class="studio-field-group"><label>סטטוס חדש</label><select id="cs-status" class="studio-field">${options}</select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitChangeStatus('${campaignId}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitChangeStatus(campaignId) {
  const status = document.getElementById('cs-status')?.value;
  if (!status) return;

  try {
    const { error } = await sb.from('campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    if (error) throw error;
    Modal.close();
    Toast.success('סטטוס עודכן');
    await loadCampaigns();
    await selectCampaign(campaignId);
  } catch (err) {
    console.error('[Campaigns] Status change error:', err);
    Toast.error('שגיאה בשינוי סטטוס');
  }
}

// ============================================================
// Delete campaign (soft delete)
// ============================================================

async function deleteCampaign(campaignId) {
  if (!confirm('למחוק את הקמפיין? (העמודים לא יימחקו, רק יוסר השיוך שלהם)')) return;

  try {
    // Unlink all pages first
    await sb.from('storefront_pages')
      .update({ campaign_id: null })
      .eq('campaign_id', campaignId);

    // Soft delete campaign
    const { error } = await sb.from('campaigns')
      .update({ is_deleted: true })
      .eq('id', campaignId);
    if (error) throw error;

    Toast.success('הקמפיין נמחק');
    selectedCampaignId = null;
    await loadCampaigns();
    const editorArea = document.getElementById('studio-editor');
    if (editorArea) editorArea.innerHTML = '<div class="studio-empty-editor"><p>בחר קמפיין מהרשימה</p></div>';
  } catch (err) {
    console.error('[Campaigns] Delete error:', err);
    Toast.error('שגיאה במחיקה');
  }
}

// ============================================================
// AI Campaign Builder — launched from within a campaign context
// ============================================================

function openCampaignAIBuilder(campaignId) {
  // Use the existing campaign builder but pass the campaign context
  if (typeof openCampaignBuilder === 'function') {
    // Set campaign context so generated page gets linked
    window._campaignBuilderTargetId = campaignId;
    openCampaignBuilder();
  } else {
    Toast.error('מודול AI Campaign Builder לא נטען');
  }
}

// ============================================================
// Refresh helpers
// ============================================================

async function refreshCampaignData(campaignId) {
  // Reload campaigns list to update page_count
  try {
    const { data } = await sb.from('v_admin_campaigns')
      .select('*')
      .eq('tenant_id', getTenantId());
    studioCampaigns = data || [];
  } catch (_) {}
  renderCampaignList();
  if (campaignId) await selectCampaign(campaignId);
}

// ============================================================
// Campaign filter for "כל העמודים" view
// ============================================================

function renderCampaignFilterDropdown() {
  if (!studioCampaigns.length && !campaignsLoaded) return '';

  const options = studioCampaigns.map(c =>
    `<option value="${c.id}"${window._pageFilterCampaignId === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  return `<select class="studio-field page-filter-select" onchange="filterPagesByCampaign(this.value)" style="max-width:140px;">
    <option value="">כל הקמפיינים</option>
    ${options}
  </select>`;
}

function filterPagesByCampaign(campaignId) {
  window._pageFilterCampaignId = campaignId || null;
  if (typeof renderFilteredPageList === 'function') renderFilteredPageList();
}

// Hook into existing page filtering — add campaign filter
// This extends the existing renderFilteredPageList behavior
const _origRenderFilteredPageList = typeof renderFilteredPageList === 'function' ? renderFilteredPageList : null;

if (_origRenderFilteredPageList) {
  window.renderFilteredPageList = function() {
    _origRenderFilteredPageList();
  };
}

// Monkey-patch renderPageSearchBar to add campaign dropdown
const _origRenderPageSearchBar = typeof renderPageSearchBar === 'function' ? renderPageSearchBar : null;

if (_origRenderPageSearchBar) {
  window.renderPageSearchBar = function() {
    let html = _origRenderPageSearchBar();
    // Inject campaign filter dropdown before the closing </div>
    const campDropdown = renderCampaignFilterDropdown();
    if (campDropdown) {
      html = html.replace(/<\/div>\s*$/, campDropdown + '</div>');
    }
    return html;
  };
}

// Also hook filtering logic: filter by campaign_id if set
const _origFilterFn = typeof filterByTag === 'function' ? filterByTag : null;

window.filterByCampaign = function(pages) {
  const cid = window._pageFilterCampaignId;
  if (!cid) return pages;
  return pages.filter(p => p.campaign_id === cid);
};

// Patch renderFilteredPageList to include campaign filter
(function() {
  // Wait for studio-pages.js to define renderFilteredPageList
  const patchInterval = setInterval(() => {
    if (typeof renderFilteredPageList !== 'function') return;
    clearInterval(patchInterval);

    const origFn = renderFilteredPageList;
    window.renderFilteredPageList = function() {
      // Temporarily patch studioPages to include campaign filter
      const cid = window._pageFilterCampaignId;
      if (cid) {
        const origPages = studioPages;
        studioPages = origPages.filter(p => p.campaign_id === cid);
        origFn();
        studioPages = origPages;
      } else {
        origFn();
      }
    };
  }, 100);
})();

// Load campaigns data on init (for the filter dropdown) without switching views
(function() {
  const initInterval = setInterval(async () => {
    if (typeof sb === 'undefined' || typeof getTenantId !== 'function') return;
    try { getTenantId(); } catch (_) { return; }
    clearInterval(initInterval);
    try {
      const { data } = await sb.from('v_admin_campaigns')
        .select('*')
        .eq('tenant_id', getTenantId());
      studioCampaigns = data || [];
      campaignsLoaded = true;
    } catch (_) {}
  }, 500);
})();
