// modules/storefront/studio-campaigns.js
// Campaigns = folder accordion in the sidebar.
// Each campaign is a collapsible folder row.
// Expanding shows pages (same cards as כל העמודים) + AI prompt at the bottom.
// Clicking a page calls selectPage() — same as כל העמודים.

let studioCampaigns = [];
let selectedCampaignId = null;   // which folder is open
let campaignPages = {};          // { campaignId: [pages] }
let campaignsLoaded = false;

const CAMPAIGN_STATUS = {
  active: { label: 'פעיל', color: '#16a34a', bg: '#dcfce7' },
  paused: { label: 'מושהה', color: '#ca8a04', bg: '#fef9c3' },
  ended:  { label: 'הסתיים', color: '#6b7280', bg: '#f3f4f6' },
};

// ── View toggle ──────────────────────────────────────────────

function toggleCampaignsView() {
  document.querySelectorAll('.page-view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === 'campaigns'));

  document.getElementById('studio-page-list').style.display = 'none';
  document.getElementById('studio-brand-list').style.display = 'none';
  document.getElementById('studio-campaign-list').style.display = 'block';

  const ed = document.getElementById('studio-editor');
  if (ed) ed.innerHTML = '<div class="studio-empty-editor"><p>בחר עמוד מתוך קמפיין לעריכה</p></div>';

  campaignsLoaded ? renderCampaignList() : loadCampaigns();
}

// ── Load campaigns ───────────────────────────────────────────

async function loadCampaigns() {
  const el = document.getElementById('studio-campaign-list');
  if (!el) return;
  el.innerHTML = '<div class="studio-empty">טוען קמפיינים...</div>';
  try {
    const { data, error } = await sb.from('v_admin_campaigns')
      .select('*').eq('tenant_id', getTenantId());
    if (error) throw error;
    studioCampaigns = data || [];
    campaignsLoaded = true;
    renderCampaignList();
  } catch (e) {
    console.error('[Campaigns] load:', e);
    el.innerHTML = '<div class="studio-empty" style="color:#ef4444;">שגיאה בטעינת קמפיינים</div>';
  }
}

// ── Render sidebar ───────────────────────────────────────────

function renderCampaignList() {
  const el = document.getElementById('studio-campaign-list');
  if (!el) return;

  let html = `<div class="camp-header">
    <span>קמפיינים (${studioCampaigns.length})</span>
    <button class="btn btn-sm btn-primary" onclick="createCampaign()">+ קמפיין</button>
  </div>`;

  if (!studioCampaigns.length) {
    el.innerHTML = html + '<div class="studio-empty" style="padding:30px;">אין קמפיינים עדיין</div>';
    return;
  }

  html += '<div class="camp-folders">';
  for (const c of studioCampaigns) {
    const open = c.id === selectedCampaignId;
    const s = CAMPAIGN_STATUS[c.status] || CAMPAIGN_STATUS.active;
    const cnt = c.page_count || 0;
    const arrow = open ? '▼' : '▶';

    // Folder row
    html += `<div class="camp-folder-row${open ? ' open' : ''}" onclick="toggleCampaignFolder('${c.id}')">
      <span class="camp-folder-icon">📁</span>
      <span class="camp-folder-name">${escapeHtml(c.name)}</span>
      <span class="camp-folder-count">${cnt}</span>
      <span class="camp-folder-status" style="background:${s.bg};color:${s.color};">${s.label}</span>
      <span class="camp-folder-arrow">${arrow}</span>
    </div>`;

    // Accordion body (pages + actions + AI prompt)
    if (open) {
      html += renderFolderBody(c);
    }
  }
  html += '</div>';

  el.innerHTML = html;
}

// ── Folder body: actions bar + pages + AI prompt ─────────────

function renderFolderBody(campaign) {
  const cid = campaign.id;
  const pages = campaignPages[cid] || [];

  // Action buttons
  const actions = `<div class="camp-folder-actions">
    <button onclick="event.stopPropagation();addPageToCampaign('${cid}')" class="camp-act-btn camp-act-add">+ עמוד</button>
    <button onclick="event.stopPropagation();editCampaignDetails('${cid}')" class="camp-act-btn">✏️</button>
    <button onclick="event.stopPropagation();changeCampaignStatus('${cid}')" class="camp-act-btn">🔄</button>
    <button onclick="event.stopPropagation();deleteCampaign('${cid}')" class="camp-act-btn" style="color:#ef4444;">🗑️</button>
  </div>`;

  // Page cards — same rendering as renderPageList in studio-pages.js
  let pagesHtml = '';
  if (!pages.length) {
    pagesHtml = '<div style="text-align:center;padding:14px 8px;color:var(--g400);font-size:.8rem;">אין עמודים. לחצו "+ עמוד"</div>';
  } else {
    const showSettings = typeof canSee === 'function' && canSee('page_settings_button');
    const showToggle = typeof canSee === 'function' && canSee('status_toggle');

    // Group by slug — show one row per logical page with language badges
    const groups = new Map();
    for (const p of pages) {
      const key = p.slug || p.id;
      if (!groups.has(key)) groups.set(key, {});
      groups.get(key)[p.lang || 'he'] = p;
    }
    const groupedPages = [];
    for (const langs of groups.values()) {
      const main = langs.he || langs.en || langs.ru || Object.values(langs)[0];
      main._langs = langs;
      groupedPages.push(main);
    }

    pagesHtml = groupedPages.map(p => {
      const icon = ({ homepage:'🏠', legal:'📜', campaign:'🎯', guide:'📖', custom:'📄' })[p.page_type] || '📄';
      const stCls = p.status === 'published' ? 'badge-published' : p.status === 'archived' ? 'badge-archived' : 'badge-draft';
      const stTxt = p.status === 'published' ? 'פורסם' : p.status === 'archived' ? 'ארכיון' : 'טיוטה';
      const active = p.id === selectedPageId ? ' active' : '';
      const title = escapeHtml(p.title || p.slug);
      const slug = escapeHtml(p.slug);
      const edited = typeof timeAgo === 'function' ? timeAgo(p.updated_at) : '';

      let seoBadge = '';
      if (typeof calculateSeoScore === 'function') {
        const { score } = calculateSeoScore(p);
        const color = typeof getSeoScoreColor === 'function' ? getSeoScoreColor(score) : '';
        seoBadge = `<span class="seo-score-mini ${color}">${score}</span>`;
      }

      const dupBtn = `<button title="שכפל" onclick="event.stopPropagation();duplicatePage('${p.id}')">📋</button>`;
      const moveBtn = `<button title="העבר לקמפיין" onclick="event.stopPropagation();campMovePage('${p.id}','${cid}')">↗️</button>`;
      const settingsBtn = showSettings ? `<button title="הגדרות" onclick="event.stopPropagation();editPageSettings('${p.id}')">⚙️</button>` : '';
      const toggleBtn = showToggle ? `<button title="${p.status==='published'?'טיוטה':'פרסם'}" onclick="event.stopPropagation();togglePageStatus('${p.id}','${p.status}')">${p.status==='published'?'📤':'📥'}</button>` : '';
      const archiveBtn = !p.is_system && p.status !== 'archived' ? `<button title="ארכיון" onclick="event.stopPropagation();archivePage('${p.id}')">📦</button>` : '';
      const restoreBtn = p.status === 'archived' ? `<button title="שחזר" onclick="event.stopPropagation();restorePage('${p.id}')">🔄</button>` : '';
      const permDeleteBtn = p.status === 'archived' ? `<button title="מחק" class="btn-danger-text" onclick="event.stopPropagation();permanentDeletePage('${p.id}')">🗑</button>` : '';
      const unlinkBtn = `<button title="הסר מקמפיין" onclick="event.stopPropagation();campUnlinkPage('${p.id}','${cid}')" style="color:#ef4444;">✕</button>`;
      const lock = p.is_system ? '<span title="מערכת">🔒</span>' : '';

      return `<div class="studio-page-item${active}" data-id="${p.id}" onclick="event.stopPropagation();selectPage('${p.id}')">
        <div class="studio-page-row-top">
          <span class="studio-page-icon">${icon}</span>
          <div class="studio-page-info">
            <div class="studio-page-title">${title}</div>
            <div class="studio-page-slug-time"><span class="studio-page-slug">/${slug}</span><span class="studio-page-edited">${edited}</span></div>
            ${typeof renderLangBadges === 'function' ? renderLangBadges(p._langs) : ''}
          </div>
          ${seoBadge}
        </div>
        <div class="studio-page-meta">
          <span class="studio-badge ${stCls}">${stTxt}</span>${lock}
          <div class="studio-page-actions-mini">${dupBtn}${moveBtn}${settingsBtn}${toggleBtn}${archiveBtn}${restoreBtn}${permDeleteBtn}${unlinkBtn}</div>
        </div>
      </div>`;
    }).join('');
  }

  // AI prompt box at the bottom — dblclick toggles expanded size
  const aiBox = `<div class="camp-ai-box" onclick="event.stopPropagation();">
    <div class="camp-ai-label">🤖 AI — בנה עמוד לקמפיין</div>
    <textarea id="camp-ai-prompt-${cid}" class="camp-ai-textarea" rows="2"
      ondblclick="this.classList.toggle('camp-ai-expanded')"
      placeholder="לדוגמא: תבנה עמוד תקנון... (לחיצה כפולה להרחבה)"></textarea>
    <div class="camp-ai-row">
      <label class="camp-ai-ctx">
        <input type="checkbox" id="camp-ai-ctx-${cid}" checked> הקשר מעמודים קיימים
      </label>
      <button class="camp-ai-send" id="camp-ai-btn-${cid}"
        onclick="event.stopPropagation();campAISend('${cid}')">🤖 שלח</button>
    </div>
  </div>`;

  return `<div class="camp-folder-body" onclick="event.stopPropagation();">
    ${actions}
    <div class="camp-folder-pages">${pagesHtml}</div>
    ${aiBox}
  </div>`;
}

// ── Toggle folder open/close ─────────────────────────────────

async function toggleCampaignFolder(campaignId) {
  if (selectedCampaignId === campaignId) {
    // Collapse
    selectedCampaignId = null;
    renderCampaignList();
    return;
  }

  // Expand — load pages
  selectedCampaignId = campaignId;
  if (!campaignPages[campaignId]) {
    await loadCampaignPages(campaignId);
  }
  renderCampaignList();
}

async function loadCampaignPages(campaignId) {
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });
    if (error) throw error;
    campaignPages[campaignId] = data || [];
  } catch (e) {
    console.error('[Campaigns] load pages:', e);
    campaignPages[campaignId] = [];
  }
}

// ── Unlink page from campaign ────────────────────────────────

function campUnlinkPage(pageId, campaignId) {
  Modal.confirm({
    title: 'הסרה מקמפיין',
    message: 'להסיר את העמוד מהקמפיין? (העמוד לא יימחק)',
    confirmText: 'הסר', cancelText: 'ביטול',
    onConfirm: async () => {
      try {
        const { error } = await sb.from('storefront_pages')
          .update({ campaign_id: null }).eq('id', pageId);
        if (error) throw error;
        Toast.success('העמוד הוסר מהקמפיין');
        if (typeof loadStudioPages === 'function') loadStudioPages();
        await refreshCampaignFolder(campaignId);
      } catch (e) {
        Toast.error('שגיאה בהסרת העמוד');
      }
    }
  });
}

// ── Move page between campaigns ──────────────────────────────

function campMovePage(pageId, currentCampaignId) {
  // Build options: all campaigns (except current) + "ללא קמפיין"
  const opts = [`<option value="">— בחר יעד —</option>`,
    `<option value="__none__">כל העמודים (ללא קמפיין)</option>`];
  for (const c of studioCampaigns) {
    if (c.id === currentCampaignId) continue;
    opts.push(`<option value="${c.id}">${escapeHtml(c.name)}</option>`);
  }

  Modal.show({
    title: '↗️ העבר לקמפיין', size: 'sm',
    content: `<div class="studio-field-group">
      <label>בחר קמפיין יעד</label>
      <select id="camp-move-target" class="studio-field">${opts.join('')}</select>
    </div>`,
    footer: `<button class="btn btn-primary" onclick="submitMovePage('${pageId}','${currentCampaignId}')">העבר</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitMovePage(pageId, fromCampaignId) {
  const target = document.getElementById('camp-move-target')?.value;
  if (!target) { Toast.warning('בחר קמפיין יעד'); return; }

  const newCampaignId = target === '__none__' ? null : target;
  try {
    const { error } = await sb.from('storefront_pages')
      .update({ campaign_id: newCampaignId }).eq('id', pageId);
    if (error) throw error;
    Modal.close();
    Toast.success('העמוד הועבר');
    if (typeof loadStudioPages === 'function') loadStudioPages();
    await refreshCampaignFolder(fromCampaignId);
    // Also refresh target campaign if it's open
    if (newCampaignId && campaignPages[newCampaignId]) {
      await loadCampaignPages(newCampaignId);
    }
  } catch (e) {
    Toast.error('שגיאה בהעברה: ' + e.message);
  }
}

// ── AI prompt send ───────────────────────────────────────────

async function campAISend(campaignId) {
  const promptEl = document.getElementById('camp-ai-prompt-' + campaignId);
  const ctxEl = document.getElementById('camp-ai-ctx-' + campaignId);
  const btn = document.getElementById('camp-ai-btn-' + campaignId);
  const prompt = (promptEl?.value || '').trim();

  if (!prompt) { Toast.warning('יש להזין הוראה ל-AI'); return; }
  if (prompt.length < 10) { Toast.warning('יש להזין לפחות 10 תווים'); return; }

  // Show loading state
  if (btn) { btn.disabled = true; btn.textContent = '🤖 עובד...'; }
  const aiBox = btn?.closest('.camp-ai-box');
  let loadingEl = null;
  if (aiBox) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'camp-ai-loading';
    loadingEl.innerHTML = '<div class="camp-ai-spinner"></div><span>🤖 בונה את העמוד... (עד דקה)</span>';
    aiBox.appendChild(loadingEl);
  }
  if (promptEl) promptEl.disabled = true;

  try {
    let fullPrompt = prompt;
    const pages = campaignPages[campaignId] || [];

    // (1) If checkbox checked — add current campaign's pages as context
    if (ctxEl?.checked && pages.length) {
      const lines = pages.map(p => {
        const txt = extractBlocksText(p.blocks || []);
        return `עמוד "${p.slug}" (${p.title || ''}) — ${txt.slice(0, 300)}`;
      });
      fullPrompt += '\n\nהקשר — עמודי הקמפיין הנוכחי:\n' + lines.join('\n');
    }

    // (2) Cross-campaign reference: scan prompt for other campaign names
    //     Works whether checkbox is checked or not
    const crossCtx = await buildCrossCampaignContext(prompt, campaignId);
    if (crossCtx) fullPrompt += crossCtx;

    // Find a template — query view to avoid RLS issues
    let tplSlug = 'supersale-campaign';
    try {
      const { data } = await sb.from('v_admin_campaign_templates')
        .select('slug').limit(1);
      if (data?.length) tplSlug = data[0].slug;
    } catch (_) {}

    // Add instruction for Claude to use campaign references
    fullPrompt += '\n\nהוראה: אם המשתמש מזכיר קמפיין אחר בשמו, השתמש בהקשר שסופק על אותו קמפיין.';

    const payload = {
      template_slug: tplSlug, prompt: fullPrompt,
      variables: {}, tenant_id: getTenantId(), campaign_id: campaignId,
    };

    // Debug log — verify context is being sent
    console.log('%c[Campaigns AI] Full prompt being sent:', 'color:#c9a555;font-weight:bold');
    console.log(fullPrompt);
    console.log('[Campaigns AI] Payload:', JSON.stringify({ ...payload, prompt: payload.prompt.slice(0, 200) + '...' }));

    const res = await fetch(SUPABASE_URL + '/functions/v1/generate-campaign-page?_t=' + Date.now(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success && data.page_id) {
      Toast.success('העמוד נוצר! לחץ עליו לעריכה');
      if (promptEl) promptEl.value = '';
      if (typeof loadStudioPages === 'function') loadStudioPages();
      await refreshCampaignFolder(campaignId);
    } else {
      console.error('[Campaigns AI] Edge Function error:', data);
      Toast.error('שגיאה: ' + (data.error || 'שגיאה לא ידועה'));
    }
  } catch (e) {
    console.error('[Campaigns] AI:', e);
    Toast.error('שגיאת תקשורת');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 שלח'; }
    if (loadingEl) loadingEl.remove();
    if (promptEl) promptEl.disabled = false;
  }
}

/**
 * Cross-campaign reference: scan the user's prompt for mentions of other
 * campaign names. If found, fetch their pages and build context.
 */
async function buildCrossCampaignContext(userPrompt, currentCampaignId) {
  const lower = userPrompt.toLowerCase();
  const matched = [];

  for (const c of studioCampaigns) {
    if (c.id === currentCampaignId) continue;
    // Match by campaign name (case-insensitive) or slug
    const nameLower = (c.name || '').toLowerCase();
    const slugLower = (c.slug || '').toLowerCase();
    if (nameLower && lower.includes(nameLower)) matched.push(c);
    else if (slugLower && lower.includes(slugLower)) matched.push(c);
  }

  if (!matched.length) return '';

  // Fetch pages for matched campaigns
  const contextParts = [];
  for (const c of matched) {
    try {
      // Use cached pages if available, otherwise fetch
      let pages = campaignPages[c.id];
      if (!pages) {
        const { data } = await sb.from('v_admin_pages')
          .select('slug, title, blocks')
          .eq('tenant_id', getTenantId())
          .eq('campaign_id', c.id)
          .order('sort_order', { ascending: true });
        pages = data || [];
      }
      if (pages.length) {
        const lines = pages.map(p => {
          const txt = extractBlocksText(p.blocks || []);
          return `  עמוד "${p.slug}" (${p.title || ''}) — ${txt.slice(0, 300)}`;
        });
        contextParts.push(`הקשר מקמפיין "${c.name}":\n${lines.join('\n')}`);
      }
    } catch (_) {}
  }

  if (!contextParts.length) return '';
  console.log('[Campaigns AI] Cross-campaign reference found:', matched.map(c => c.name));
  return '\n\n' + contextParts.join('\n\n');
}

function extractBlocksText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(b => {
    const d = b.data || {};
    const p = [];
    if (d.title) p.push(d.title);
    if (d.subtitle) p.push(d.subtitle);
    if (d.text) p.push(d.text);
    if (d.html) { const t = document.createElement('div'); t.innerHTML = d.html; p.push(t.textContent || ''); }
    if (d.content) p.push(d.content);
    return p.join(' ');
  }).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

// ── Refresh a campaign folder after changes ──────────────────

async function refreshCampaignFolder(campaignId) {
  // Reload campaigns list (page_count etc.)
  try {
    const { data } = await sb.from('v_admin_campaigns')
      .select('*').eq('tenant_id', getTenantId());
    studioCampaigns = data || [];
  } catch (_) {}
  // Reload this campaign's pages
  await loadCampaignPages(campaignId);
  renderCampaignList();
}

// ── Add page to campaign ─────────────────────────────────────

async function addPageToCampaign(campaignId) {
  let unlinked = [];
  try {
    const { data } = await sb.from('v_admin_pages')
      .select('id, title, slug, status, page_type')
      .eq('tenant_id', getTenantId())
      .is('campaign_id', null)
      .neq('status', 'archived')
      .order('title', { ascending: true });
    unlinked = data || [];
  } catch (_) {}

  const opts = unlinked.map(p => {
    const t = p.title || p.slug || '(ללא שם)';
    const s = (p.slug || '').replace(/^\/|\/$/g, '');
    return `<option value="${p.id}">${escapeHtml(t)} (/${escapeHtml(s)})</option>`;
  }).join('');

  const existSec = unlinked.length ? `<div class="studio-field-group">
    <label>שייך עמוד קיים</label>
    <select id="camp-link-page" class="studio-field"><option value="">— בחר —</option>${opts}</select>
  </div><div style="text-align:center;color:var(--g400);padding:6px;font-size:.85rem;">— או —</div>` : '';

  Modal.show({
    title: '+ עמוד לקמפיין', size: 'sm',
    content: `${existSec}
      <div class="studio-field-group"><label>צור עמוד חדש</label><input type="text" id="camp-new-title" class="studio-field" placeholder="כותרת"></div>
      <div class="studio-field-group"><label>Slug</label><input type="text" id="camp-new-slug" class="studio-field" dir="ltr" placeholder="page-slug"></div>`,
    footer: `<button class="btn btn-primary" onclick="submitAddPage('${campaignId}')">הוסף</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitAddPage(campaignId) {
  const link = document.getElementById('camp-link-page')?.value;
  const title = document.getElementById('camp-new-title')?.value.trim();
  const slug = document.getElementById('camp-new-slug')?.value.trim();

  try {
    if (link) {
      const { error } = await sb.from('storefront_pages')
        .update({ campaign_id: campaignId }).eq('id', link);
      if (error) throw error;
      Toast.success('העמוד שויך לקמפיין');
    } else if (title && slug) {
      const fullSlug = slug.startsWith('/') ? slug : '/' + slug + '/';
      const { error } = await sb.from('storefront_pages').insert({
        tenant_id: getTenantId(), slug: fullSlug, title,
        page_type: 'campaign', lang: 'he', blocks: [],
        status: 'draft', is_system: false, campaign_id: campaignId,
      });
      if (error) {
        if (error.code === '23505') { Toast.error('כתובת כבר קיימת'); return; }
        throw error;
      }
      Toast.success('עמוד חדש נוצר');
      if (typeof loadStudioPages === 'function') loadStudioPages();
    } else {
      Toast.warning('בחר עמוד או מלא כותרת + slug'); return;
    }
    Modal.close();
    await refreshCampaignFolder(campaignId);
  } catch (e) {
    Toast.error('שגיאה: ' + e.message);
  }
}

// ── Create campaign ──────────────────────────────────────────

function createCampaign() {
  Modal.show({
    title: '+ קמפיין חדש', size: 'sm',
    content: `
      <div class="studio-field-group"><label>שם</label><input type="text" id="nc-name" class="studio-field" placeholder="SUPERSALE 2026" oninput="ncAutoSlug()"></div>
      <div class="studio-field-group"><label>Slug</label><input type="text" id="nc-slug" class="studio-field" dir="ltr" placeholder="supersale-2026"></div>
      <div class="studio-field-group"><label>תיאור</label><textarea id="nc-desc" class="studio-field" rows="2" placeholder="אופציונלי"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="studio-field-group"><label>התחלה</label><input type="date" id="nc-start" class="studio-field"></div>
        <div class="studio-field-group"><label>סיום</label><input type="date" id="nc-end" class="studio-field"></div>
      </div>
      <div class="studio-field-group"><label>סטטוס</label><select id="nc-status" class="studio-field">
        <option value="active">פעיל</option><option value="paused">מושהה</option><option value="ended">הסתיים</option>
      </select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitCreateCampaign()">צור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

function ncAutoSlug() {
  const n = document.getElementById('nc-name')?.value || '';
  const s = document.getElementById('nc-slug');
  if (s) s.value = n.toLowerCase().replace(/[^a-z0-9\u0590-\u05ff\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,50);
}

async function submitCreateCampaign() {
  const name = document.getElementById('nc-name')?.value.trim();
  const slug = document.getElementById('nc-slug')?.value.trim();
  const desc = document.getElementById('nc-desc')?.value.trim();
  const start = document.getElementById('nc-start')?.value || null;
  const end = document.getElementById('nc-end')?.value || null;
  const status = document.getElementById('nc-status')?.value || 'active';

  if (!name || !slug) { Toast.warning('שם ו-slug חובה'); return; }

  try {
    const { error } = await sb.from('campaigns').insert({
      tenant_id: getTenantId(), name, slug,
      description: desc || null, start_date: start, end_date: end, status,
    });
    if (error) {
      if (error.code === '23505') { Toast.error('slug כבר קיים'); return; }
      throw error;
    }
    Modal.close();
    Toast.success('קמפיין נוצר');
    await loadCampaigns();
  } catch (e) {
    Toast.error('שגיאה: ' + e.message);
  }
}

// ── Edit campaign ────────────────────────────────────────────

function editCampaignDetails(cid) {
  const c = studioCampaigns.find(x => x.id === cid);
  if (!c) return;
  Modal.show({
    title: '✏️ עריכת קמפיין', size: 'sm',
    content: `
      <div class="studio-field-group"><label>שם</label><input type="text" id="ec-name" class="studio-field" value="${escapeAttr(c.name)}"></div>
      <div class="studio-field-group"><label>תיאור</label><textarea id="ec-desc" class="studio-field" rows="2">${escapeHtml(c.description||'')}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="studio-field-group"><label>התחלה</label><input type="date" id="ec-start" class="studio-field" value="${c.start_date||''}"></div>
        <div class="studio-field-group"><label>סיום</label><input type="date" id="ec-end" class="studio-field" value="${c.end_date||''}"></div>
      </div>`,
    footer: `<button class="btn btn-primary" onclick="submitEditCampaign('${cid}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitEditCampaign(cid) {
  const name = document.getElementById('ec-name')?.value.trim();
  const desc = document.getElementById('ec-desc')?.value.trim();
  const start = document.getElementById('ec-start')?.value || null;
  const end = document.getElementById('ec-end')?.value || null;
  if (!name) { Toast.warning('שם חובה'); return; }
  try {
    const { error } = await sb.from('campaigns')
      .update({ name, description: desc||null, start_date: start, end_date: end, updated_at: new Date().toISOString() })
      .eq('id', cid);
    if (error) throw error;
    Modal.close(); Toast.success('עודכן');
    await refreshCampaignFolder(cid);
  } catch (e) { Toast.error('שגיאה'); }
}

// ── Change status ────────────────────────────────────────────

function changeCampaignStatus(cid) {
  const c = studioCampaigns.find(x => x.id === cid);
  if (!c) return;
  const opts = Object.entries(CAMPAIGN_STATUS).map(([v, cfg]) =>
    `<option value="${v}"${v===c.status?' selected':''}>${cfg.label}</option>`).join('');
  Modal.show({
    title: '🔄 סטטוס', size: 'sm',
    content: `<div class="studio-field-group"><label>סטטוס</label><select id="cs-status" class="studio-field">${opts}</select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitChangeStatus('${cid}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
  });
}

async function submitChangeStatus(cid) {
  const status = document.getElementById('cs-status')?.value;
  if (!status) return;
  try {
    const { error } = await sb.from('campaigns')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', cid);
    if (error) throw error;
    Modal.close(); Toast.success('סטטוס עודכן');
    await refreshCampaignFolder(cid);
  } catch (e) { Toast.error('שגיאה'); }
}

// ── Delete campaign ──────────────────────────────────────────

function deleteCampaign(cid) {
  Modal.confirm({
    title: 'מחיקת קמפיין',
    message: 'למחוק? (העמודים לא יימחקו, רק יוסר השיוך)',
    confirmText: 'מחק', cancelText: 'ביטול', danger: true,
    onConfirm: async () => {
      try {
        await sb.from('storefront_pages').update({ campaign_id: null }).eq('campaign_id', cid);
        const { error } = await sb.from('campaigns').update({ is_deleted: true }).eq('id', cid);
        if (error) throw error;
        Toast.success('הקמפיין נמחק');
        selectedCampaignId = null;
        delete campaignPages[cid];
        if (typeof loadStudioPages === 'function') loadStudioPages();
        await loadCampaigns();
      } catch (e) { Toast.error('שגיאה במחיקה'); }
    }
  });
}

// ── Hide campaign pages from "כל העמודים" + auto-refresh ─────

(function() {
  const iv = setInterval(() => {
    if (typeof renderFilteredPageList !== 'function') return;
    clearInterval(iv);
    const orig = renderFilteredPageList;
    window.renderFilteredPageList = function() {
      const saved = studioPages;
      studioPages = saved.filter(p => !p.campaign_id);
      orig();
      studioPages = saved;
      // If a campaign folder is open, refresh its pages
      if (selectedCampaignId) refreshCampaignFolder(selectedCampaignId);
    };
  }, 100);
})();

// Preload campaigns on init
(function() {
  const iv = setInterval(async () => {
    if (typeof sb === 'undefined' || typeof getTenantId !== 'function') return;
    try { getTenantId(); } catch (_) { return; }
    clearInterval(iv);
    try {
      const { data } = await sb.from('v_admin_campaigns').select('*').eq('tenant_id', getTenantId());
      studioCampaigns = data || [];
      campaignsLoaded = true;
    } catch (_) {}
  }, 500);
})();
