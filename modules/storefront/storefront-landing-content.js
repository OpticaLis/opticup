// Storefront Landing Page Content Manager
// Phase 5C: Edit headlines, descriptions, CTA + AI regeneration

let landingPages = [];
let landingContentMap = {};
let editingPage = null;

const LANDING_EDGE_FN = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/generate-landing-content';

// ── Load landing pages from ai_content (entity_type = 'landing_page') ──
async function loadLandingPages() {
  showLoading('טוען דפי נחיתה...');
  try {
    const tid = getTenantId();

    // Load AI content for landing pages
    const { data } = await sb.from('ai_content')
      .select('entity_id, content_type, content, status, id')
      .eq('tenant_id', tid)
      .eq('entity_type', 'landing_page')
      .eq('is_deleted', false);

    // Group by entity_id
    landingContentMap = {};
    for (const row of (data || [])) {
      if (!landingContentMap[row.entity_id]) {
        landingContentMap[row.entity_id] = {};
      }
      landingContentMap[row.entity_id][row.content_type] = {
        id: row.id,
        content: row.content,
        status: row.status
      };
    }

    // Build landing pages list from known landing pages JSON + AI content
    landingPages = [];
    try {
      const res = await fetch('/api/landing-pages-list');
      if (res.ok) landingPages = await res.json();
    } catch { /* ignore */ }

    // If no API available, build from ai_content entity IDs
    if (!landingPages.length) {
      for (const entityId of Object.keys(landingContentMap)) {
        const desc = landingContentMap[entityId]?.description?.content || '';
        landingPages.push({
          id: entityId,
          title: extractTitle(desc) || entityId.substring(0, 8),
          slug: entityId
        });
      }
    }

    // If still empty, show message for creating new content
    renderLandingGrid();
  } catch (e) {
    console.error('loadLandingPages error:', e);
    toast('שגיאה בטעינת דפי נחיתה', 'e');
  } finally {
    hideLoading();
  }
}

function extractTitle(html) {
  const match = html.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
  return match ? match[1] : null;
}

function renderLandingGrid() {
  const container = document.getElementById('landing-grid-container');

  // "Create new" card
  let html = `<div class="landing-card" style="border-style:dashed;text-align:center" onclick="createNewLanding()">
    <h3 style="color:var(--primary)">+ ייצר דף נחיתה חדש</h3>
    <p class="ai-status">ייצור תוכן AI לדף נחיתה חדש</p>
  </div>`;

  for (const page of landingPages) {
    const content = landingContentMap[page.id] || {};
    const hasContent = !!content.description;
    const statusText = hasContent ? '✅ יש תוכן AI' : '❌ ללא תוכן';

    html += `<div class="landing-card" onclick="openLandingEdit('${page.id}', '${escapeHtml(page.title)}')">
      <h3>${escapeHtml(page.title)}</h3>
      <div class="slug">/${page.slug}/</div>
      <div class="ai-status">${statusText}</div>
    </div>`;
  }

  container.innerHTML = html;
}

// ── Create new landing page content via AI ──
async function createNewLanding() {
  const topic = prompt('נושא דף הנחיתה:');
  if (!topic) return;

  showLoading('מייצר תוכן AI...');
  try {
    const res = await fetch(LANDING_EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: getTenantId(),
        topic,
        page_type: 'campaign',
        tone: 'promotional'
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'AI generation failed');

    toast('תוכן דף נחיתה נוצר', 's');
    await loadLandingPages();
  } catch (e) {
    console.error('createNewLanding error:', e);
    toast('שגיאה: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

// ── Edit landing page ──
function openLandingEdit(pageId, title) {
  editingPage = { id: pageId, title };
  const content = landingContentMap[pageId] || {};

  document.getElementById('landing-edit-title').textContent = title || 'עריכת דף נחיתה';

  // Parse headline/subheadline from description if present
  const desc = content.description?.content || '';
  const headlineMatch = desc.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const subMatch = desc.match(/<h2[^>]*>([^<]+)<\/h2>/i);

  document.getElementById('landing-headline').value = headlineMatch ? headlineMatch[1] : '';
  document.getElementById('landing-subheadline').value = subMatch ? subMatch[1] : '';
  document.getElementById('landing-description').value = desc;
  document.getElementById('landing-cta').value = '';
  document.getElementById('landing-seo-title').value = content.seo_title?.content || '';
  document.getElementById('landing-seo-desc').value = content.seo_description?.content || '';

  landingCharCount('landing-seo-title', 60);
  landingCharCount('landing-seo-desc', 160);

  document.getElementById('landing-edit-modal').style.display = 'flex';
}

function closeLandingEditModal() {
  document.getElementById('landing-edit-modal').style.display = 'none';
  editingPage = null;
}

async function saveLandingEdit() {
  if (!editingPage) return;
  const tid = getTenantId();
  const entityId = editingPage.id;

  const fields = {
    description: document.getElementById('landing-description').value.trim(),
    seo_title: document.getElementById('landing-seo-title').value.trim(),
    seo_description: document.getElementById('landing-seo-desc').value.trim()
  };

  showLoading('שומר...');
  try {
    for (const [ct, newVal] of Object.entries(fields)) {
      if (!newVal) continue;
      const existing = landingContentMap[entityId]?.[ct];
      const originalContent = existing?.content || '';

      await sb.from('ai_content').upsert({
        tenant_id: tid,
        entity_type: 'landing_page',
        entity_id: entityId,
        content_type: ct,
        content: newVal,
        language: 'he',
        status: existing ? 'edited' : 'auto',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,entity_type,entity_id,content_type,language' });

      // Save correction for learning
      if (existing && originalContent !== newVal) {
        await sb.from('ai_content_corrections').insert({
          tenant_id: tid,
          ai_content_id: existing.id,
          original_content: originalContent,
          corrected_content: newVal
        });
      }
    }

    toast('התוכן נשמר', 's');
    closeLandingEditModal();
    await loadLandingPages();
  } catch (e) {
    console.error('saveLandingEdit error:', e);
    toast('שגיאה בשמירה', 'e');
  } finally {
    hideLoading();
  }
}

async function regenerateLandingContent() {
  if (!editingPage) return;

  showLoading('מייצר תוכן AI מחדש...');
  try {
    const res = await fetch(LANDING_EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: getTenantId(),
        topic: editingPage.title,
        landing_page_id: editingPage.id,
        page_type: 'campaign',
        tone: 'promotional'
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'AI generation failed');

    await loadLandingPages();
    openLandingEdit(editingPage.id, editingPage.title);
    toast('תוכן חדש יוצר', 's');
  } catch (e) {
    console.error('regenerateLandingContent error:', e);
    toast('שגיאה בייצור: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

function landingCharCount(fieldId, limit) {
  const field = document.getElementById(fieldId);
  const countEl = document.getElementById(fieldId + '-count');
  if (!field || !countEl) return;
  const len = field.value.length;
  countEl.textContent = `${len}/${limit}`;
  countEl.classList.toggle('warn', len > limit);
}
