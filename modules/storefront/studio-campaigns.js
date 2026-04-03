// modules/storefront/studio-campaigns.js
// Campaigns management: list campaigns, view pages per campaign, CRUD
// Integrated into the Pages tab as a third view (alongside "כל העמודים" and "עמודי מותג")
// Campaign page list reuses the SAME renderPageList() from studio-pages.js

let studioCampaigns = [];
let selectedCampaignId = null;
let campaignsLoaded = false;

// Status display config
const CAMPAIGN_STATUS = {
  active: { label: 'פעיל', color: '#16a34a', bg: '#dcfce7' },
  paused: { label: 'מושהה', color: '#ca8a04', bg: '#fef9c3' },
  ended:  { label: 'הסתיים', color: '#6b7280', bg: '#f3f4f6' },
};

// Active campaign filter — when set, renderFilteredPageList filters by this campaign
window.studioActiveCampaignId = null;

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

  // Clear campaign filter when entering campaigns view (pages show inside editor, not in page-list)
  window.studioActiveCampaignId = null;

  if (!campaignsLoaded) {
    loadCampaigns();
  } else {
    renderCampaignList();
  }
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

  // Load this campaign's pages into studioPages-compatible array
  let pages = [];
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });
    if (error) throw error;
    pages = data || [];
  } catch (err) {
    console.error('[Campaigns] Load campaign pages error:', err);
  }

  renderCampaignDetail(campaign, pages);
}

// ============================================================
// Render campaign detail (right panel)
// Uses the SAME page card rendering as "כל העמודים"
// ============================================================

function renderCampaignDetail(campaign, pages) {
  const editorArea = document.getElementById('studio-editor');
  if (!editorArea) return;

  const s = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.active;

  // Campaign header
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
        <button class="btn btn-sm" onclick="deleteCampaign('${campaign.id}')" style="color:#ef4444;">🗑️</button>
      </div>
    </div>`;

  // AI Prompt Box
  const aiPromptHtml = `
    <div class="camp-ai-box">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:1.1rem;">🤖</span>
        <span style="font-weight:700;font-size:.95rem;">AI — בנה או ערוך עמודים בקמפיין</span>
      </div>
      <textarea id="camp-ai-prompt" class="studio-field" rows="3" placeholder="כתוב מה אתה רוצה...&#10;לדוגמא: &quot;תבנה עמוד תקנון לקמפיין&quot;&#10;&quot;תבנה עמוד הצלחה שמפנה לוואטסאפ&quot;" style="resize:vertical;min-height:80px;"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--g500);cursor:pointer;">
          <input type="checkbox" id="camp-ai-context" checked>
          קח הקשר מעמודי הקמפיין הקיימים
        </label>
        <button class="btn btn-sm" onclick="campAISend('${campaign.id}')" id="camp-ai-send-btn"
          style="background:linear-gradient(135deg,#1a1a1a,#333);color:#e8da94;font-weight:700;border:1px solid #c9a555;padding:6px 20px;">
          🤖 שלח
        </button>
      </div>
    </div>`;

  // Page list — reuse the SAME rendering as "כל העמודים"
  // We render into a dedicated container and use the shared renderPageList function
  let pagesHtml = '';
  if (pages.length === 0) {
    pagesHtml = '<div style="text-align:center;padding:40px 20px;color:var(--g400);">אין עמודים בקמפיין הזה עדיין.<br>לחצו "+ עמוד לקמפיין" להוספה, או השתמשו ב-AI.</div>';
  } else {
    pagesHtml = renderCampaignPageList(pages, campaign.id);
  }

  editorArea.innerHTML = `
    <div class="camp-detail" style="padding:20px;">
      ${headerHtml}
      <div style="margin-top:16px;">
        ${aiPromptHtml}
      </div>
      <div style="margin-top:20px;border-top:1px solid var(--g200);padding-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;font-size:1rem;font-weight:700;">עמודי הקמפיין (${pages.length})</h3>
        </div>
        ${pagesHtml}
      </div>
    </div>
    <style>
      .camp-detail-header { padding-bottom: 16px; border-bottom: 1px solid var(--g200); }
      .camp-ai-box { background: #fefdf8; border: 1px solid #e8da94; border-radius: 10px; padding: 16px; }
      .camp-unlink-btn { padding: 2px 6px; font-size: .7rem; color: #ef4444; background: var(--g100); border: 1px solid var(--g200); border-radius: 4px; cursor: pointer; white-space: nowrap; }
      .camp-unlink-btn:hover { background: #fee2e2; border-color: #ef4444; }
    </style>`;
}

// ============================================================
// Render campaign page list using the SAME card format as "כל העמודים"
// This is a clone of the renderPageList logic from studio-pages.js
// with an extra "remove from campaign" button per page
// ============================================================

function renderCampaignPageList(pages, campaignId) {
  const showSettings = typeof canSee === 'function' ? canSee('page_settings_button') : true;
  const showToggle = typeof canSee === 'function' ? canSee('status_toggle') : true;

  const PAGE_TYPE_ICONS_LOCAL = { homepage: '🏠', legal: '📜', campaign: '🎯', guide: '📖', custom: '📄' };

  return pages.map(p => {
    const icon = PAGE_TYPE_ICONS_LOCAL[p.page_type] || '📄';
    const statusClass = p.status === 'published' ? 'badge-published' : p.status === 'archived' ? 'badge-archived' : 'badge-draft';
    const statusText = p.status === 'published' ? 'פורסם' : p.status === 'archived' ? 'ארכיון' : 'טיוטה';
    const title = escapeHtml(p.title || p.slug);
    const slug = escapeHtml(p.slug);
    const edited = typeof timeAgo === 'function' ? timeAgo(p.updated_at) : '';

    // SEO score badge
    let seoBadge = '';
    if (typeof calculateSeoScore === 'function') {
      const { score } = calculateSeoScore(p);
      const color = typeof getSeoScoreColor === 'function' ? getSeoScoreColor(score) : '';
      seoBadge = `<span class="seo-score-mini ${color}">${score}</span>`;
    }

    const settingsBtn = showSettings ? `<button title="הגדרות" onclick="event.stopPropagation();editPageSettings('${p.id}')">⚙️</button>` : '';
    const dupBtn = `<button title="שכפל" onclick="event.stopPropagation();duplicatePage('${p.id}')">📋</button>`;
    const toggleBtn = showToggle
      ? `<button title="${p.status === 'published' ? 'העבר לטיוטה' : 'פרסם'}" onclick="event.stopPropagation();togglePageStatus('${p.id}','${p.status}')">${p.status === 'published' ? '📤' : '📥'}</button>`
      : '';
    const archiveBtn = !p.is_system && p.status !== 'archived'
      ? `<button title="העבר לארכיון" onclick="event.stopPropagation();archivePage('${p.id}')">📦</button>` : '';
    const restoreBtn = p.status === 'archived'
      ? `<button title="שחזר" onclick="event.stopPropagation();restorePage('${p.id}')">🔄</button>` : '';
    const systemLock = p.is_system ? `<span title="עמוד מערכת">🔒</span>` : '';

    // Extra: remove from campaign button
    const unlinkBtn = `<button class="camp-unlink-btn" title="הסר מקמפיין" onclick="event.stopPropagation();campRemovePage('${p.id}','${campaignId}')">✕ הסר</button>`;

    const tagBadges = typeof renderTagBadges === 'function' ? renderTagBadges(p.tags) : '';

    return `<div class="studio-page-item" data-id="${p.id}" onclick="campOpenPage('${p.id}')">
      <div class="studio-page-row-top">
        <span class="studio-page-icon">${icon}</span>
        <div class="studio-page-info">
          <div class="studio-page-title">${title}</div>
          <div class="studio-page-slug-time"><span class="studio-page-slug">/${slug}</span><span class="studio-page-edited">${edited}</span></div>
          ${tagBadges}
        </div>
        ${seoBadge}
      </div>
      <div class="studio-page-meta">
        <span class="studio-badge ${statusClass}">${statusText}</span>${systemLock}
        <div class="studio-page-actions-mini">${dupBtn}${settingsBtn}${toggleBtn}${archiveBtn}${restoreBtn}${unlinkBtn}</div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// AI Prompt Box — send prompt to generate-campaign-page Edge Function
// ============================================================

async function campAISend(campaignId) {
  const promptEl = document.getElementById('camp-ai-prompt');
  const contextCheck = document.getElementById('camp-ai-context');
  const sendBtn = document.getElementById('camp-ai-send-btn');
  const prompt = (promptEl?.value || '').trim();

  if (!prompt) {
    Toast.warning('יש להזין הוראה ל-AI');
    return;
  }
  if (prompt.length < 10) {
    Toast.warning('יש להזין לפחות 10 תווים');
    return;
  }

  // Disable button, show loading
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '🤖 AI עובד...'; }

  try {
    let fullPrompt = prompt;

    // If context checkbox checked — fetch campaign pages content
    if (contextCheck?.checked) {
      try {
        const { data: campPages } = await sb.from('v_admin_pages')
          .select('slug, title, blocks')
          .eq('tenant_id', getTenantId())
          .eq('campaign_id', campaignId);

        if (campPages && campPages.length > 0) {
          const contextLines = campPages.map(p => {
            const textContent = extractBlocksText(p.blocks || []);
            return `עמוד "${escapeHtml(p.slug)}" (${escapeHtml(p.title || '')}) — ${textContent.slice(0, 300)}`;
          });
          fullPrompt += '\n\nהקשר — עמודי הקמפיין הקיימים:\n' + contextLines.join('\n');
        }
      } catch (_) {
        console.warn('[Campaigns] Failed to load context pages');
      }
    }

    // Find a suitable template — use the first campaign template available
    let templateSlug = 'supersale';
    try {
      const { data: templates } = await sb.from('campaign_templates')
        .select('slug')
        .eq('is_deleted', false)
        .limit(1);
      if (templates && templates.length > 0) templateSlug = templates[0].slug;
    } catch (_) {}

    // Call Edge Function
    const edgeUrl = SUPABASE_URL + '/functions/v1/generate-campaign-page';
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON,
      },
      body: JSON.stringify({
        template_slug: templateSlug,
        prompt: fullPrompt,
        variables: {},
        tenant_id: getTenantId(),
        campaign_id: campaignId,
      }),
    });

    const data = await res.json();

    if (data.success && data.page_id) {
      Toast.success('העמוד נוצר בהצלחה! לחץ על העמוד לצפייה ועריכה');
      // Clear prompt
      if (promptEl) promptEl.value = '';
      // Refresh pages list and campaign view
      if (typeof loadStudioPages === 'function') loadStudioPages();
      await refreshCampaignData(campaignId);
    } else {
      console.error('[Campaigns] AI error:', data);
      Toast.error('שגיאה ביצירת העמוד: ' + (data.error || 'שגיאה לא ידועה'));
    }
  } catch (err) {
    console.error('[Campaigns] AI send error:', err);
    Toast.error('שגיאת תקשורת — נסו שוב');
  } finally {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '🤖 שלח'; }
  }
}

/** Extract text content from blocks for AI context */
function extractBlocksText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(b => {
    const d = b.data || {};
    // Collect all text-like fields
    const parts = [];
    if (d.title) parts.push(d.title);
    if (d.subtitle) parts.push(d.subtitle);
    if (d.text) parts.push(d.text);
    if (d.html) {
      // Strip HTML tags to get plain text
      const tmp = document.createElement('div');
      tmp.innerHTML = d.html;
      parts.push(tmp.textContent || '');
    }
    if (d.content) parts.push(d.content);
    if (d.items && Array.isArray(d.items)) {
      d.items.forEach(item => {
        if (item.title) parts.push(item.title);
        if (item.text) parts.push(item.text);
      });
    }
    return parts.join(' ');
  }).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
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

function campRemovePage(pageId, campaignId) {
  Modal.confirm({
    title: 'הסרה מקמפיין',
    message: 'להסיר את העמוד מהקמפיין? (העמוד לא יימחק)',
    confirmText: 'הסר',
    cancelText: 'ביטול',
    onConfirm: async function() {
      try {
        const { error } = await sb.from('storefront_pages')
          .update({ campaign_id: null })
          .eq('id', pageId);
        if (error) throw error;
        Toast.success('העמוד הוסר מהקמפיין');
        if (typeof loadStudioPages === 'function') loadStudioPages();
        await refreshCampaignData(campaignId);
      } catch (err) {
        console.error('[Campaigns] Remove page error:', err);
        Toast.error('שגיאה בהסרת העמוד');
      }
    }
  });
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

function deleteCampaign(campaignId) {
  Modal.confirm({
    title: 'מחיקת קמפיין',
    message: 'למחוק את הקמפיין? (העמודים לא יימחקו, רק יוסר השיוך שלהם)',
    confirmText: 'מחק',
    cancelText: 'ביטול',
    danger: true,
    onConfirm: async function() {
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
        if (typeof loadStudioPages === 'function') loadStudioPages();
        const editorArea = document.getElementById('studio-editor');
        if (editorArea) editorArea.innerHTML = '<div class="studio-empty-editor"><p>בחר קמפיין מהרשימה</p></div>';
      } catch (err) {
        console.error('[Campaigns] Delete error:', err);
        Toast.error('שגיאה במחיקה');
      }
    }
  });
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
// Hide campaign pages from "כל העמודים" — they belong in the campaigns tab
// ============================================================

(function() {
  const patchInterval = setInterval(() => {
    if (typeof renderFilteredPageList !== 'function') return;
    clearInterval(patchInterval);

    const origFn = renderFilteredPageList;
    window.renderFilteredPageList = function() {
      // Temporarily filter out pages that belong to a campaign
      const origPages = studioPages;
      studioPages = origPages.filter(p => !p.campaign_id);
      origFn();
      studioPages = origPages;
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
