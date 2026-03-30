// Storefront Blog Manager — CRUD + AI generation
// Phase 5B: Blog editor for managing blog_posts table

let blogPosts = [];     // raw rows from DB
let groupedPosts = [];  // grouped by translation
let editingPostId = null;

const BLOG_EDGE_FN = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/generate-blog-post';

// Decode HTML entities (same logic as content-cleaner)
function decodeEntities(str) {
  if (!str) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

// ── Load posts ──
async function loadBlogPosts() {
  showLoading('טוען פוסטים...');
  try {
    const tid = getTenantId();
    const { data, error } = await sb.from('blog_posts')
      .select('id, slug, lang, title, status, source, categories, published_at, created_at, translation_of')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    blogPosts = data || [];
    groupedPosts = groupByTranslation(blogPosts);
    filterBlogPosts();
  } catch (e) {
    console.error('loadBlogPosts error:', e);
    toast('שגיאה בטעינת פוסטים', 'e');
  } finally {
    hideLoading();
  }
}

// Group posts: originals + their translations shown as one row
function groupByTranslation(posts) {
  const groups = new Map(); // key = original post id → { primary, langs: {he,en,ru} }
  const originals = posts.filter(p => !p.translation_of);
  const translations = posts.filter(p => p.translation_of);

  for (const p of originals) {
    groups.set(p.id, { primary: p, langs: { [p.lang]: p } });
  }
  for (const t of translations) {
    const group = groups.get(t.translation_of);
    if (group) {
      group.langs[t.lang] = t;
    } else {
      // Orphan translation — show as its own group
      groups.set(t.id, { primary: t, langs: { [t.lang]: t } });
    }
  }
  return Array.from(groups.values());
}

function filterBlogPosts() {
  const statusFilter = document.getElementById('filter-status').value;
  const langFilter = document.getElementById('filter-lang').value;

  let filtered = groupedPosts;
  if (statusFilter) filtered = filtered.filter(g => g.primary.status === statusFilter);
  if (langFilter) filtered = filtered.filter(g => g.langs[langFilter]);

  renderBlogTable(filtered);
}

function renderBlogTable(groups) {
  const container = document.getElementById('blog-table-container');

  if (!groups.length) {
    container.innerHTML = '<p style="color:var(--g400);text-align:center;padding:24px">אין פוסטים</p>';
    return;
  }

  const statusLabels = { published: 'מפורסם', draft: 'טיוטה', archived: 'ארכיון' };
  const statusClasses = { published: 'status-published', draft: 'status-draft', archived: 'status-archived' };
  const sourceIcons = { wordpress: '🔄', ai: '🤖', manual: '✍️' };
  const langFlags = { he: '🇮🇱', en: '🇬🇧', ru: '🇷🇺' };

  let html = `<table class="blog-table">
    <thead><tr>
      <th>סטטוס</th>
      <th>שפות</th>
      <th>כותרת</th>
      <th>מקור</th>
      <th>תאריך</th>
      <th>פעולות</th>
    </tr></thead>
    <tbody>`;

  for (const g of groups) {
    const p = g.primary;
    const dateStr = p.published_at || p.created_at;
    const date = dateStr ? new Date(dateStr).toLocaleDateString('he-IL') : '—';

    // Language badges — one per available language
    const langBadges = ['he', 'en', 'ru']
      .filter(l => g.langs[l])
      .map(l => `<span class="lang-badge" title="${l}" onclick="event.stopPropagation(); editBlogPost('${g.langs[l].id}')">${langFlags[l]}</span>`)
      .join(' ');

    const title = decodeEntities(p.title);

    html += `<tr>
      <td><span class="status-badge ${statusClasses[p.status] || ''}">${statusLabels[p.status] || p.status}</span></td>
      <td>${langBadges}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(title)}</td>
      <td>${sourceIcons[p.source] || ''}</td>
      <td style="font-size:.85rem">${date}</td>
      <td class="action-btns">
        <button onclick="editBlogPost('${p.id}')">✏️</button>
        <button onclick="deleteBlogPost('${p.id}')">🗑️</button>
      </td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── New post ──
function openNewPost() {
  editingPostId = null;
  document.getElementById('blog-edit-title').textContent = 'פוסט חדש';
  document.getElementById('blog-title').value = '';
  document.getElementById('blog-slug').value = '';
  document.getElementById('blog-lang').value = 'he';
  document.getElementById('blog-categories').value = '';
  document.getElementById('blog-content').value = '';
  document.getElementById('blog-seo-title').value = '';
  document.getElementById('blog-seo-desc').value = '';
  document.getElementById('blog-status').value = 'draft';
  document.getElementById('blog-excerpt').value = '';
  document.getElementById('blog-edit-modal').style.display = 'flex';
}

// ── Edit post ──
async function editBlogPost(postId) {
  showLoading('טוען פוסט...');
  try {
    const { data, error } = await sb.from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;

    editingPostId = postId;
    document.getElementById('blog-edit-title').textContent = 'עריכת פוסט';
    document.getElementById('blog-title').value = decodeEntities(data.title) || '';
    document.getElementById('blog-slug').value = data.slug || '';
    document.getElementById('blog-lang').value = data.lang || 'he';
    document.getElementById('blog-categories').value = (data.categories || []).join(', ');
    document.getElementById('blog-content').value = data.content || '';
    document.getElementById('blog-seo-title').value = decodeEntities(data.seo_title) || '';
    document.getElementById('blog-seo-desc').value = decodeEntities(data.seo_description) || '';
    document.getElementById('blog-status').value = data.status || 'draft';
    document.getElementById('blog-excerpt').value = data.excerpt || '';
    document.getElementById('blog-edit-modal').style.display = 'flex';
  } catch (e) {
    console.error('editBlogPost error:', e);
    toast('שגיאה בטעינת פוסט', 'e');
  } finally {
    hideLoading();
  }
}

function closeBlogEditModal() {
  document.getElementById('blog-edit-modal').style.display = 'none';
  editingPostId = null;
}

// ── Save ──
async function saveBlogPost() {
  const tid = getTenantId();
  const title = document.getElementById('blog-title').value.trim();
  const slug = document.getElementById('blog-slug').value.trim();
  if (!title || !slug) { toast('כותרת ו-Slug חובה', 'w'); return; }

  const postData = {
    tenant_id: tid,
    title,
    slug,
    lang: document.getElementById('blog-lang').value,
    categories: document.getElementById('blog-categories').value.split(',').map(s => s.trim()).filter(Boolean),
    content: document.getElementById('blog-content').value,
    seo_title: document.getElementById('blog-seo-title').value.trim(),
    seo_description: document.getElementById('blog-seo-desc').value.trim(),
    status: document.getElementById('blog-status').value,
    excerpt: document.getElementById('blog-excerpt').value.trim(),
    updated_at: new Date().toISOString()
  };

  showLoading('שומר...');
  try {
    if (editingPostId) {
      const { error } = await sb.from('blog_posts')
        .update(postData)
        .eq('id', editingPostId)
        .eq('tenant_id', tid);
      if (error) throw error;
    } else {
      postData.source = 'manual';
      const { error } = await sb.from('blog_posts')
        .insert(postData);
      if (error) throw error;
    }

    toast('הפוסט נשמר', 's');
    closeBlogEditModal();
    await loadBlogPosts();
  } catch (e) {
    console.error('saveBlogPost error:', e);
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

// ── Publish ──
async function publishBlogPost() {
  document.getElementById('blog-status').value = 'published';
  await saveBlogPost();
}

// ── Delete (soft) ──
async function deleteBlogPost(postId) {
  if (!confirm('למחוק את הפוסט?')) return;

  try {
    const { error } = await sb.from('blog_posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;
    toast('הפוסט נמחק', 's');
    await loadBlogPosts();
  } catch (e) {
    console.error('deleteBlogPost error:', e);
    toast('שגיאה במחיקה', 'e');
  }
}

// ── AI generate ──
function openAIModal() {
  document.getElementById('ai-topic').value = '';
  document.getElementById('ai-keywords').value = '';
  document.getElementById('ai-length').value = 'medium';
  document.getElementById('ai-topic-modal').style.display = 'flex';
}

function closeAIModal() {
  document.getElementById('ai-topic-modal').style.display = 'none';
}

async function generateAIBlogPost() {
  const topic = document.getElementById('ai-topic').value.trim();
  if (!topic) { toast('הזן נושא', 'w'); return; }

  const keywords = document.getElementById('ai-keywords').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const targetLength = document.getElementById('ai-length').value;

  closeAIModal();
  showLoading('מייצר פוסט AI...');

  try {
    const res = await fetch(BLOG_EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: getTenantId(),
        topic,
        keywords,
        target_length: targetLength
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'AI generation failed');

    toast('פוסט AI נוצר כטיוטה', 's');
    await loadBlogPosts();

    // Open the generated post for editing
    if (data.post_id) {
      await editBlogPost(data.post_id);
    }
  } catch (e) {
    console.error('generateAIBlogPost error:', e);
    toast('שגיאה בייצור AI: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

// ── Char count helper ──
function blogCharCount(fieldId, limit) {
  const field = document.getElementById(fieldId);
  const countEl = document.getElementById(fieldId + '-count');
  if (!field || !countEl) return;
  const len = field.value.length;
  countEl.textContent = `${len}/${limit}`;
  countEl.classList.toggle('warn', len > limit);
}
