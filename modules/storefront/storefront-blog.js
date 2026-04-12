// Storefront Blog Manager — CRUD + AI generation + Quill WYSIWYG + Translation
// Phase 5B: Blog editor for managing blog_posts table

let blogPosts = [];
let groupedPosts = [];
let editingPostId = null;
let _blogQuill = null;
let _blogAiMode = 'new';

const BLOG_EDGE_FN = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/generate-blog-post';

// Decode HTML entities
function decodeEntities(str) {
  if (!str) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

// ═══════════════════════════════════════════════════
// LOAD / FILTER / RENDER
// ═══════════════════════════════════════════════════

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

function groupByTranslation(posts) {
  const groups = new Map();
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
    container.innerHTML = '<p style="color:var(--g400);text-align:center;padding:32px">אין פוסטים</p>';
    return;
  }

  const statusLabels = { published: 'מפורסם', draft: 'טיוטה', archived: 'ארכיון' };
  const statusClasses = { published: 'status-published', draft: 'status-draft', archived: 'status-archived' };
  const sourceIcons = { wordpress: '🔄', ai: '🤖', manual: '✍️' };
  const langLabels = { he: 'HE', en: 'EN', ru: 'RU' };
  const langClasses = { he: 'lang-he', en: 'lang-en', ru: 'lang-ru' };

  let html = `<div class="blog-list-header">
    <span>סטטוס</span><span>כותרת</span><span>תרגומים</span><span>תאריך</span><span>פעולות</span>
  </div>`;

  for (const g of groups) {
    const p = g.primary;
    const dateStr = p.published_at || p.created_at;
    const date = dateStr ? new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    // Translation badges — show all 3 languages with check/missing
    const transBadges = ['he', 'en', 'ru'].map(l => {
      const exists = !!g.langs[l];
      const cls = exists ? 'exists' : 'missing';
      const icon = exists ? '✓' : '—';
      const click = exists ? `onclick="event.stopPropagation(); editBlogPost('${g.langs[l].id}')"` : '';
      const cursor = exists ? 'cursor:pointer;' : '';
      return `<span class="trans-badge ${cls}" ${click} style="${cursor}" title="${l.toUpperCase()}">${langLabels[l]} ${icon}</span>`;
    }).join('');

    // Primary language pill
    const langPill = `<span class="lang-pill ${langClasses[p.lang] || ''}">${langLabels[p.lang] || p.lang}</span>`;

    const title = decodeEntities(p.title);
    const sourceIcon = sourceIcons[p.source] || '';

    html += `<div class="blog-card">
      <div><span class="status-badge ${statusClasses[p.status] || ''}">${statusLabels[p.status] || p.status}</span></div>
      <div>
        <div class="blog-card-title">${escapeHtml(title)}</div>
        <div class="blog-card-meta">${langPill} ${sourceIcon ? `<span class="source-icon">${sourceIcon}</span>` : ''}</div>
      </div>
      <div class="trans-badges">${transBadges}</div>
      <div style="font-size:.82rem;color:var(--g500);white-space:nowrap">${date}</div>
      <div class="action-btns">
        <button onclick="editBlogPost('${p.id}')" title="ערוך">✏️</button>
        <button onclick="deleteBlogPost('${p.id}')" title="מחק">🗑️</button>
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════
// QUILL EDITOR
// ═══════════════════════════════════════════════════

function initBlogQuill() {
  const el = document.getElementById('blog-content-editor');
  if (!el || typeof Quill === 'undefined') return;

  // Destroy previous instance
  if (_blogQuill) {
    _blogQuill = null;
    el.innerHTML = '';
    // Remove previous toolbar if leftover
    const wrap = el.closest('.quill-wrap');
    if (wrap) {
      const oldToolbar = wrap.querySelector('.ql-toolbar');
      if (oldToolbar) oldToolbar.remove();
    }
  }

  _blogQuill = new Quill(el, {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean']
      ]
    },
    placeholder: 'כתוב את תוכן הפוסט כאן...'
  });
}

function setQuillDirection(lang) {
  if (!_blogQuill) return;
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const align = lang === 'he' ? 'right' : 'left';
  _blogQuill.root.setAttribute('dir', dir);
  _blogQuill.root.style.textAlign = align;
}

function getQuillHtml() {
  if (!_blogQuill) return '';
  const html = _blogQuill.root.innerHTML;
  if (html === '<p><br></p>' || html === '<p></p>') return '';
  return html;
}

// ═══════════════════════════════════════════════════
// NEW / EDIT / CLOSE
// ═══════════════════════════════════════════════════

function openNewPost() {
  editingPostId = null;
  document.getElementById('blog-edit-title').textContent = 'פוסט חדש';
  document.getElementById('blog-title').value = '';
  document.getElementById('blog-slug').value = '';
  document.getElementById('blog-lang').value = 'he';
  document.getElementById('blog-categories').value = '';
  document.getElementById('blog-seo-title').value = '';
  document.getElementById('blog-seo-desc').value = '';
  document.getElementById('blog-status').value = 'draft';
  document.getElementById('blog-excerpt').value = '';

  // Hide translation section for new posts
  document.getElementById('blog-trans-section').style.display = 'none';

  const _bem = document.getElementById('blog-edit-modal');
  _bem.style.background = 'rgba(0,0,0,0.5)';
  _bem.style.display = 'flex';

  initBlogQuill();
  setQuillDirection('he');
  if (_blogQuill) _blogQuill.root.innerHTML = '';

  resetBlogAiMode();
  updateBlogSeo();
}

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
    document.getElementById('blog-seo-title').value = decodeEntities(data.seo_title) || '';
    document.getElementById('blog-seo-desc').value = decodeEntities(data.seo_description) || '';
    document.getElementById('blog-status').value = data.status || 'draft';
    document.getElementById('blog-excerpt').value = data.excerpt || '';

    const _bem2 = document.getElementById('blog-edit-modal');
    _bem2.style.background = 'rgba(0,0,0,0.5)';
    _bem2.style.display = 'flex';

    initBlogQuill();
    setQuillDirection(data.lang || 'he');
    if (_blogQuill) _blogQuill.root.innerHTML = data.content || '';

    resetBlogAiMode();
    updateBlogSeo();
    updateTranslationSection(data);
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

// ═══════════════════════════════════════════════════
// SAVE / PUBLISH / DELETE
// ═══════════════════════════════════════════════════

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
    content: getQuillHtml(),
    seo_title: document.getElementById('blog-seo-title').value.trim(),
    seo_description: document.getElementById('blog-seo-desc').value.trim(),
    status: document.getElementById('blog-status').value,
    excerpt: document.getElementById('blog-excerpt').value.trim(),
    updated_at: new Date().toISOString()
  };

  showLoading('שומר...');
  try {
    if (editingPostId) {
      // Learning loop: fetch old values for non-Hebrew posts to capture corrections
      let oldPost = null;
      if (postData.lang && postData.lang !== 'he') {
        const { data } = await sb.from('blog_posts')
          .select('title, content, excerpt, seo_title, seo_description')
          .eq('id', editingPostId)
          .single();
        oldPost = data;
      }
      const { error } = await sb.from('blog_posts')
        .update(postData)
        .eq('id', editingPostId)
        .eq('tenant_id', tid);
      if (error) throw error;
      if (oldPost) await saveBlogTranslationLearning(tid, postData, oldPost);
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

async function publishBlogPost() {
  document.getElementById('blog-status').value = 'published';
  await saveBlogPost();
}

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

// ═══════════════════════════════════════════════════
// AI CONTENT — IN-EDITOR (two modes)
// ═══════════════════════════════════════════════════

function switchBlogAiMode(mode) {
  _blogAiMode = mode;
  document.querySelectorAll('.ai-bar .btn-ai-mode').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  const promptArea = document.getElementById('blog-ai-prompt-area');
  const btn = document.getElementById('blog-ai-btn');
  if (promptArea) promptArea.style.display = mode === 'edit' ? 'block' : 'none';
  if (btn) btn.textContent = mode === 'edit' ? '🤖 שלח הנחיה' : '🤖 יצירת תוכן AI';
}

function resetBlogAiMode() {
  _blogAiMode = 'new';
  switchBlogAiMode('new');
  const prompt = document.getElementById('blog-ai-prompt');
  if (prompt) prompt.value = '';
}

async function generateBlogAI() {
  const btn = document.getElementById('blog-ai-btn');
  if (!btn) return;

  const title = document.getElementById('blog-title').value.trim();
  if (!title && _blogAiMode === 'new') {
    toast('הזן כותרת לפוסט לפני יצירת תוכן', 'w');
    return;
  }

  if (_blogAiMode === 'edit') {
    const userPrompt = document.getElementById('blog-ai-prompt')?.value.trim();
    if (!userPrompt) { toast('יש לכתוב הנחיה', 'w'); return; }
  }

  btn.disabled = true;
  btn.textContent = '🤖 מייצר תוכן...';

  try {
    const payload = {
      tenant_id: getTenantId(),
      topic: title,
      keywords: document.getElementById('blog-categories')?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
      target_length: 'medium'
    };

    if (_blogAiMode === 'edit') {
      payload.prompt = document.getElementById('blog-ai-prompt').value.trim();
      payload.current_content = getQuillHtml();
    }

    const res = await fetch(BLOG_EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'AI generation failed');

    // If the edge function returns content directly, put it in the editor
    if (data.content && _blogQuill) {
      _blogQuill.root.innerHTML = data.content;
    }
    if (data.seo_title) {
      document.getElementById('blog-seo-title').value = data.seo_title;
    }
    if (data.seo_description) {
      document.getElementById('blog-seo-desc').value = data.seo_description;
    }
    if (data.excerpt) {
      document.getElementById('blog-excerpt').value = data.excerpt;
    }

    updateBlogSeo();

    // If it returned a post_id (new post created), load and edit it
    if (data.post_id && !editingPostId) {
      await loadBlogPosts();
      await editBlogPost(data.post_id);
      return;
    }

    toast(_blogAiMode === 'edit' ? 'תוכן AI עודכן לפי ההנחיה' : 'תוכן AI נוצר — עיין ועריך', 's');
  } catch (e) {
    console.error('generateBlogAI error:', e);
    toast('שגיאה בייצור AI: ' + (e.message || ''), 'e');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = _blogAiMode === 'edit' ? '🤖 שלח הנחיה' : '🤖 יצירת תוכן AI';
    }
  }
}

// ═══════════════════════════════════════════════════
// AI — NEW POST FROM SCRATCH (topic modal)
// ═══════════════════════════════════════════════════

function openAIModal() {
  document.getElementById('ai-topic').value = '';
  document.getElementById('ai-keywords').value = '';
  document.getElementById('ai-length').value = 'medium';
  const _aim = document.getElementById('ai-topic-modal');
  _aim.style.background = 'rgba(0,0,0,0.5)';
  _aim.style.display = 'flex';
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

// ═══════════════════════════════════════════════════
// TRANSLATION
// ═══════════════════════════════════════════════════

function updateTranslationSection(postData) {
  const section = document.getElementById('blog-trans-section');
  const statusContainer = document.getElementById('blog-trans-status');
  const translateBtn = document.getElementById('blog-translate-btn');

  // Only show for saved Hebrew posts
  if (!editingPostId || postData.lang !== 'he') {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  // Find which translations exist for this post
  const postId = postData.translation_of || postData.id;
  const group = groupedPosts.find(g => g.primary.id === postId || g.langs.he?.id === postId);

  const langs = [
    { code: 'he', label: 'HE', flag: '🇮🇱' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'ru', label: 'RU', flag: '🇷🇺' }
  ];

  const missingLangs = [];
  let html = '';
  for (const l of langs) {
    const exists = group?.langs[l.code];
    html += `<span class="trans-chip ${exists ? 'exists' : 'missing'}">${l.flag} ${l.label} ${exists ? '✓' : '✗'}</span>`;
    if (!exists && l.code !== 'he') missingLangs.push(l.code);
  }
  statusContainer.innerHTML = html;

  if (missingLangs.length > 0) {
    translateBtn.style.display = '';
    translateBtn.textContent = `🌐 תרגם ל-${missingLangs.map(l => l.toUpperCase()).join(' + ')}`;
    translateBtn.dataset.langs = missingLangs.join(',');
    translateBtn.dataset.sourceId = postData.id;
  } else {
    translateBtn.style.display = 'none';
  }
}

async function translateBlogPost() {
  const btn = document.getElementById('blog-translate-btn');
  const langs = (btn.dataset.langs || '').split(',').filter(Boolean);
  const sourceId = btn.dataset.sourceId;

  if (!langs.length || !sourceId) return;

  // Save current post first
  await saveBlogPost();
  if (!editingPostId) return; // save failed

  btn.disabled = true;
  btn.textContent = '🌐 מתרגם...';

  try {
    // Get the source post content
    const { data: source, error: srcErr } = await sb.from('blog_posts')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (srcErr) throw srcErr;

    for (const lang of langs) {
      showLoading(`מתרגם ל-${lang.toUpperCase()}...`);

      // Call edge function for translation
      const res = await fetch(BLOG_EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: getTenantId(),
          mode: 'translate',
          source_lang: 'he',
          target_lang: lang,
          title: source.title,
          content: source.content,
          seo_title: source.seo_title,
          seo_description: source.seo_description,
          excerpt: source.excerpt
        })
      });

      const data = await res.json();

      if (data.success) {
        // Insert translated post
        const translatedPost = {
          tenant_id: getTenantId(),
          title: data.title || source.title,
          slug: source.slug,
          lang: lang,
          categories: source.categories,
          content: data.content || source.content,
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
          excerpt: data.excerpt || '',
          status: 'draft',
          source: 'ai',
          translation_of: sourceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertErr } = await sb.from('blog_posts').insert(translatedPost);
        if (insertErr) {
          console.error(`Translation insert error (${lang}):`, insertErr);
          toast(`שגיאה בשמירת תרגום ${lang.toUpperCase()}`, 'e');
        }
      } else {
        toast(`שגיאה בתרגום ל-${lang.toUpperCase()}: ${data.error || ''}`, 'e');
      }
    }

    toast('תרגומים נוצרו כטיוטות', 's');
    await loadBlogPosts();

    // Re-open the source post to refresh translation status
    await editBlogPost(sourceId);
  } catch (e) {
    console.error('translateBlogPost error:', e);
    toast('שגיאה בתרגום: ' + (e.message || ''), 'e');
  } finally {
    btn.disabled = false;
    btn.textContent = '🌐 תרגום אוטומטי';
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════
// SEO — LIVE PREVIEW + SCORE
// ═══════════════════════════════════════════════════

function calcBlogSeoScore() {
  const title = document.getElementById('blog-seo-title')?.value || '';
  const desc = document.getElementById('blog-seo-desc')?.value || '';
  const postTitle = document.getElementById('blog-title')?.value || '';
  const content = getQuillHtml();

  let score = 0;
  if (title.length > 0) score += 15;
  if (title.length >= 45 && title.length <= 60) score += 10;
  if (desc.length > 0) score += 15;
  if (desc.length >= 120 && desc.length <= 160) score += 10;
  if (postTitle.length > 0) score += 10;
  if ((content.match(/<\/p>/gi) || []).length >= 3) score += 15;
  if (content.length > 500) score += 15;
  if (content.includes('<h2') || content.includes('<h3')) score += 10;

  return score;
}

function updateBlogSeo() {
  // Char counts
  const seoTitle = document.getElementById('blog-seo-title');
  const seoDesc = document.getElementById('blog-seo-desc');
  const titleCount = document.getElementById('blog-seo-title-count');
  const descCount = document.getElementById('blog-seo-desc-count');

  if (seoTitle && titleCount) {
    const len = seoTitle.value.length;
    titleCount.textContent = `${len}/60`;
    titleCount.classList.toggle('warn', len > 60);
  }
  if (seoDesc && descCount) {
    const len = seoDesc.value.length;
    descCount.textContent = `${len}/160`;
    descCount.classList.toggle('warn', len > 160);
  }

  // Google preview
  const gpTitle = document.getElementById('blog-gp-title');
  const gpDesc = document.getElementById('blog-gp-desc');
  const gpUrl = document.getElementById('blog-gp-url');
  const slug = document.getElementById('blog-slug')?.value || 'slug';

  if (gpTitle) gpTitle.textContent = seoTitle?.value || 'כותרת SEO';
  if (gpDesc) gpDesc.textContent = seoDesc?.value || 'תיאור SEO';
  // TODO(B4): replace hardcoded domain with getTenantConfig('custom_domain') when added to schema
  if (gpUrl) gpUrl.textContent = `prizma-optic.co.il › בלוג › ${slug}`;

  // SEO score badge
  const score = calcBlogSeoScore();
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const headerScore = document.getElementById('blog-seo-score-header');
  if (headerScore) {
    headerScore.innerHTML = `<span class="seo-score-badge" style="background:${color}">${score}</span> <span style="font-size:.8rem;color:var(--g500);">SEO</span>`;
  }
}

// Keep legacy function name for backward compatibility
function blogCharCount(fieldId, limit) {
  updateBlogSeo();
}

// ═══════════════════════════════════════════════════
// LEARNING LOOP: capture blog translation edits
// ═══════════════════════════════════════════════════
async function saveBlogTranslationLearning(tid, newPost, oldPost) {
  try {
    const lang = newPost.lang;
    const fields = ['title', 'excerpt', 'seo_title', 'seo_description', 'content'];
    const corrections = [];
    for (const f of fields) {
      const o = (oldPost[f] || '').trim();
      const n = (newPost[f] || '').trim();
      if (o && n && o !== n) corrections.push({ field: f, original: o, corrected: n });
    }
    if (!corrections.length) return;

    // Save corrections (human-edited overrides of previous translation)
    const corrRows = corrections.map(c => ({
      tenant_id: tid, lang,
      original_translation: c.original,
      corrected_translation: c.corrected,
      is_deleted: false,
    }));
    try {
      const { error } = await sb.from('translation_corrections').insert(corrRows);
      if (error) console.error('Blog save corrections:', error.message);
    } catch (e) { console.error('Blog save corrections:', e.message); }

    // Save to translation_memory — look up matching Hebrew source by slug
    try {
      const { data: heSource } = await sb.from('blog_posts')
        .select('title, excerpt, seo_title, seo_description, content')
        .eq('tenant_id', tid).eq('slug', newPost.slug).eq('lang', 'he').maybeSingle();
      if (!heSource) return;
      const memRows = [];
      for (const c of corrections) {
        const src = (heSource[c.field] || '').trim();
        if (!src) continue;
        memRows.push({
          tenant_id: tid,
          source_lang: 'he', target_lang: lang,
          source_text: src, translated_text: c.corrected,
          context: 'blog_post.' + c.field,
          scope: 'tenant', confidence: 1.0,
          approved_by: 'human', times_used: 0,
        });
      }
      if (memRows.length) {
        const { error } = await sb.from('translation_memory').upsert(memRows, {
          onConflict: 'tenant_id,source_lang,target_lang,source_hash',
          ignoreDuplicates: false,
        });
        if (error) console.error('Blog save memory:', error.message);
      }
    } catch (e) { console.error('Blog save memory:', e.message); }
  } catch (e) {
    console.error('saveBlogTranslationLearning:', e.message);
  }
}
