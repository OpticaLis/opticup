// modules/storefront/studio-seo.js
// SEO scoring, AI auto-SEO, correction learning (CMS-9)

const SEO_RULES = [
  { id: 'has_meta_title', label: 'יש כותרת SEO', points: 10,
    check: (p) => !!p.meta_title?.trim() },
  { id: 'meta_title_length', label: 'כותרת SEO באורך תקין (30-60 תווים)', points: 10,
    check: (p) => { const l = (p.meta_title || '').trim().length; return l >= 30 && l <= 60; }},
  { id: 'has_meta_description', label: 'יש תיאור SEO', points: 10,
    check: (p) => !!p.meta_description?.trim() },
  { id: 'meta_description_length', label: 'תיאור SEO באורך תקין (120-160 תווים)', points: 10,
    check: (p) => { const l = (p.meta_description || '').trim().length; return l >= 120 && l <= 160; }},
  { id: 'has_slug', label: 'יש כתובת URL', points: 5,
    check: (p) => !!p.slug && p.slug !== '/' },
  { id: 'slug_readable', label: 'כתובת URL קריאה', points: 5,
    check: (p) => /^\/[a-z0-9\u0590-\u05FF\-\/]+\/?$/.test(p.slug || '') },
  { id: 'has_hero_or_title', label: 'יש כותרת ראשית (hero או text)', points: 10,
    check: (p) => (p.blocks || []).some(b =>
      (b.type === 'hero' && b.data?.title) || (b.type === 'text' && b.data?.title)) },
  { id: 'has_enough_content', label: 'יש מספיק תוכן (לפחות 3 בלוקים)', points: 10,
    check: (p) => (p.blocks || []).filter(b => !b.settings?.hidden).length >= 3 },
  { id: 'has_cta', label: 'יש קריאה לפעולה (CTA / lead_form / contact)', points: 10,
    check: (p) => (p.blocks || []).some(b => ['cta', 'lead_form', 'contact'].includes(b.type)) },
  { id: 'has_images', label: 'יש תוכן ויזואלי (תמונות, סרטונים או מוצרים)', points: 10,
    check: (p) => (p.blocks || []).some(b => ['hero', 'gallery', 'video', 'products', 'brands', 'banner'].includes(b.type)) },
  { id: 'no_empty_blocks', label: 'אין בלוקים ריקים', points: 10,
    check: (p) => !(p.blocks || []).some(b => {
      if (b.type === 'text' && !b.data?.body?.trim()) return true;
      if (b.type === 'hero' && !b.data?.title?.trim()) return true;
      if (b.type === 'faq' && (!b.data?.items || b.data.items.length === 0)) return true;
      return false;
    })},
];

/**
 * Calculate SEO score for a page
 * @returns {{ score: number, results: Array<{rule: object, passed: boolean, message: string}> }}
 */
function calculateSeoScore(page) {
  const results = SEO_RULES.map(rule => {
    const passed = rule.check(page);
    let message = '';
    if (!passed) {
      if (rule.id === 'meta_title_length') {
        const len = (page.meta_title || '').trim().length;
        message = len === 0 ? 'חסרה כותרת SEO' : `אורך נוכחי: ${len} תווים`;
      } else if (rule.id === 'meta_description_length') {
        const len = (page.meta_description || '').trim().length;
        message = len === 0 ? 'חסר תיאור SEO' : `אורך נוכחי: ${len} תווים`;
      }
    }
    return { rule, passed, message };
  });
  const score = results.reduce((sum, r) => sum + (r.passed ? r.rule.points : 0), 0);
  return { score, results };
}

/**
 * Get score color class
 */
function getSeoScoreColor(score) {
  if (score >= 80) return 'seo-good';
  if (score >= 50) return 'seo-ok';
  return 'seo-poor';
}

/**
 * Get score emoji
 */
function getSeoScoreEmoji(score) {
  if (score >= 80) return '\u{1F7E2}';
  if (score >= 50) return '\u{1F7E0}';
  return '\u{1F534}';
}

/** SEO panel collapsed state */
let seoPanelExpanded = false;

/**
 * Render SEO panel in the editor
 */
function renderSeoPanel(page, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { score, results } = calculateSeoScore(page);
  const color = getSeoScoreColor(score);
  const emoji = getSeoScoreEmoji(score);
  const failed = results.filter(r => !r.passed);
  const passed = results.filter(r => r.passed);

  const failedHtml = failed.map(r =>
    `<div class="seo-check-item seo-check-fail">\u274C ${escapeHtml(r.rule.label)}${r.message ? ` <span class="seo-check-hint">(${escapeHtml(r.message)})</span>` : ''}</div>`
  ).join('');

  const passedHtml = passed.map(r =>
    `<div class="seo-check-item seo-check-pass">\u2705 ${escapeHtml(r.rule.label)}</div>`
  ).join('');

  const expandClass = seoPanelExpanded ? ' expanded' : '';
  const detailsStyle = seoPanelExpanded ? '' : ' style="display:none"';

  container.innerHTML = `<div class="seo-panel${expandClass}">
    <div class="seo-panel-header" onclick="toggleSeoPanel()">
      <div class="seo-score-badge ${color}">${emoji} ${score}/100</div>
      <span class="seo-panel-title">SEO Score</span>
      <span class="seo-panel-toggle">${seoPanelExpanded ? '\u25B2' : '\u25BC'}</span>
    </div>
    <div class="seo-panel-details" id="seo-panel-details"${detailsStyle}>
      ${failedHtml}
      ${passedHtml}
      <div class="seo-panel-actions">
        <button class="btn btn-sm btn-gold" onclick="requestAutoSeo()">\u{1F916} \u05E6\u05D5\u05E8 SEO \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9</button>
        <button class="btn btn-sm btn-ghost" onclick="editPageSettings('${page.id}')">\u{1F4CB} \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA SEO</button>
      </div>
    </div>
  </div>`;
  container.classList.remove('hidden');
}

function toggleSeoPanel() {
  seoPanelExpanded = !seoPanelExpanded;
  const details = document.getElementById('seo-panel-details');
  const panel = details?.closest('.seo-panel');
  if (details) details.style.display = seoPanelExpanded ? '' : 'none';
  if (panel) panel.classList.toggle('expanded', seoPanelExpanded);
  const toggle = panel?.querySelector('.seo-panel-toggle');
  if (toggle) toggle.textContent = seoPanelExpanded ? '\u25B2' : '\u25BC';
}

// --- AI Auto-SEO ---

/** In-memory correction store */
const seoCorrections = [];

function recordSeoCorrection(original, corrected, field, pageType) {
  if (original === corrected) return;
  seoCorrections.push({ field, page_type: pageType, original, corrected, timestamp: new Date().toISOString() });
  if (seoCorrections.length > 20) seoCorrections.shift();
}

function buildSeoPromptWithLearning(pageData) {
  const relevant = seoCorrections
    .filter(c => c.page_type === pageData.page_type)
    .slice(-5);
  if (!relevant.length) return '';
  let ctx = '\n\nLearning from previous corrections (the user prefers this style):\n';
  relevant.forEach(c => {
    ctx += `- ${c.field}: AI wrote "${c.original}" \u2192 User changed to "${c.corrected}"\n`;
  });
  return ctx;
}

/**
 * Build blocks content summary for AI
 */
function buildBlocksSummary(blocks) {
  return (blocks || []).map(b => {
    const d = b.data || {};
    switch (b.type) {
      case 'hero': return `hero: ${d.title || '(no title)'}`;
      case 'text': return `text: ${(d.title || d.body || '').substring(0, 30)}`;
      case 'products': return `products: ${d.limit || '?'} items (${d.style || 'grid'})`;
      case 'faq': return `faq: ${(d.items || []).length} questions`;
      case 'trust_badges': return `trust_badges: ${(d.badges || []).length} items`;
      case 'lead_form': return 'lead_form';
      case 'cta': return `cta: ${d.text || ''}`;
      case 'contact': return 'contact';
      case 'sticky_bar': return 'sticky_bar';
      default: return b.type;
    }
  }).join(', ');
}

/**
 * Request AI auto-SEO generation
 */
async function requestAutoSeo() {
  if (!currentPage) return;

  const statusEl = document.getElementById('seo-auto-status');
  showAutoSeoLoading(true);

  try {
    const learning = buildSeoPromptWithLearning(currentPage);
    const response = await fetch(AI_EDIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'seo',
        page_title: currentPage.title || '',
        page_type: currentPage.page_type || 'custom',
        blocks_summary: buildBlocksSummary(currentPage.blocks),
        current_meta_title: currentPage.meta_title || '',
        current_meta_description: currentPage.meta_description || '',
        current_slug: currentPage.slug || '',
        lang: currentPage.lang || 'he',
        learning_context: learning
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    const result = await response.json();
    showAutoSeoLoading(false);
    showAutoSeoResults(result);
  } catch (err) {
    console.error('Auto-SEO error:', err);
    showAutoSeoLoading(false);
    Toast.error('שגיאה ביצירת SEO: ' + err.message);
  }
}

function showAutoSeoLoading(loading) {
  const panel = document.querySelector('.seo-panel-actions');
  if (!panel) return;
  const btn = panel.querySelector('.btn-gold');
  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading ? '\u23F3 AI \u05DE\u05E2\u05D1\u05D3...' : '\u{1F916} \u05E6\u05D5\u05E8 SEO \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9';
  }
}

/**
 * Show AI-generated SEO results in a modal
 */
/** Store AI originals for correction tracking */
let _aiSeoOriginals = { meta_title: '', meta_description: '', slug: '' };

function showAutoSeoResults(result) {
  const mt = result.meta_title || '';
  const md = result.meta_description || '';
  const slug = result.suggested_slug || '';
  _aiSeoOriginals = { meta_title: mt, meta_description: md, slug };
  const explanation = result.explanation || '';

  const mtLen = mt.length;
  const mdLen = md.length;
  const mtStatus = mtLen >= 30 && mtLen <= 60 ? 'seo-len-ok' : (mtLen > 0 ? 'seo-len-warn' : '');
  const mdStatus = mdLen >= 120 && mdLen <= 160 ? 'seo-len-ok' : (mdLen > 0 ? 'seo-len-warn' : '');

  Modal.show({
    title: '\u{1F916} \u05D4\u05E6\u05E2\u05D5\u05EA SEO \u05DE-AI',
    size: 'md',
    content: `<div class="seo-auto-form">
      <div class="studio-field-group">
        <label>\u05DB\u05D5\u05EA\u05E8\u05EA SEO</label>
        <input type="text" id="seo-ai-title" value="${escapeAttr(mt)}" class="studio-field" oninput="updateSeoCharCount('seo-ai-title','seo-title-count',30,60)">
        <span class="seo-char-count ${mtStatus}" id="seo-title-count">${mtLen}/60 \u05EA\u05D5\u05D5\u05D9\u05DD</span>
      </div>
      <div class="studio-field-group">
        <label>\u05EA\u05D9\u05D0\u05D5\u05E8 SEO</label>
        <textarea id="seo-ai-desc" rows="3" class="studio-field" oninput="updateSeoCharCount('seo-ai-desc','seo-desc-count',120,160)">${escapeAttr(md)}</textarea>
        <span class="seo-char-count ${mdStatus}" id="seo-desc-count">${mdLen}/160 \u05EA\u05D5\u05D5\u05D9\u05DD</span>
      </div>
      <div class="studio-field-group">
        <label>\u05DB\u05EA\u05D5\u05D1\u05EA URL \u05DE\u05D5\u05E6\u05E2\u05EA</label>
        <input type="text" id="seo-ai-slug" value="${escapeAttr(slug)}" class="studio-field" dir="ltr">
      </div>
      ${explanation ? `<div class="seo-explanation">\u{1F4A1} ${escapeHtml(explanation)}</div>` : ''}
    </div>`,
    footer: `<button class="btn btn-primary" onclick="applyAutoSeo('all')">\u05D4\u05D7\u05DC \u05D4\u05DB\u05DC</button>
      <button class="btn btn-ghost" onclick="applyAutoSeo('title')">\u05DB\u05D5\u05EA\u05E8\u05EA \u05D1\u05DC\u05D1\u05D3</button>
      <button class="btn btn-ghost" onclick="applyAutoSeo('desc')">\u05EA\u05D9\u05D0\u05D5\u05E8 \u05D1\u05DC\u05D1\u05D3</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>`
  });
}

function updateSeoCharCount(inputId, countId, min, max) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  if (!input || !count) return;
  const len = input.value.length;
  count.textContent = `${len}/${max} \u05EA\u05D5\u05D5\u05D9\u05DD`;
  count.className = 'seo-char-count ' + (len >= min && len <= max ? 'seo-len-ok' : 'seo-len-warn');
}

/**
 * Apply auto-SEO results to page
 */
async function applyAutoSeo(fields) {
  if (!currentPage) return;
  const title = document.getElementById('seo-ai-title')?.value.trim() || '';
  const desc = document.getElementById('seo-ai-desc')?.value.trim() || '';
  const slug = document.getElementById('seo-ai-slug')?.value.trim() || '';

  const updates = {};
  if (fields === 'all' || fields === 'title') {
    updates.meta_title = title;
    recordSeoCorrection(_aiSeoOriginals.meta_title, title, 'meta_title', currentPage.page_type);
  }
  if (fields === 'all' || fields === 'desc') {
    updates.meta_description = desc;
    recordSeoCorrection(_aiSeoOriginals.meta_description, desc, 'meta_description', currentPage.page_type);
  }
  if (fields === 'all' || fields === 'slug') {
    if (slug && !currentPage.is_system) updates.slug = slug;
  }

  try {
    const { error } = await sb.from('storefront_pages').update(updates)
      .eq('id', currentPage.id).eq('tenant_id', getTenantId());
    if (error) throw error;
    Modal.close();
    Toast.success('SEO \u05E2\u05D5\u05D3\u05DB\u05DF');
    // Refresh page data
    const { data } = await sb.from('v_admin_pages').select('*').eq('id', currentPage.id).single();
    if (data) {
      currentPage = data;
      // Update SEO panel
      renderSeoPanel(currentPage, 'seo-panel-container');
    }
    await loadStudioPages();
  } catch (err) {
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF SEO');
  }
}

