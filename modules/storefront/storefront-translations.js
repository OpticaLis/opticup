// Storefront Translations Tab — view, edit, bulk-translate product content
// Phase 6: i18n AI Translation

const TRANSLATE_FN_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/translate-content';
let transContentMap = {};   // product_id → { en: { description: {id,content,status}, ... }, ru: { ... } }
let transCurrentPage = 1;
const TRANS_PAGE_SIZE = 50;
let transAbort = false;
let transEditProduct = null;
let transEditLang = null;

// ── Tab switching ──
function switchContentTab(tab) {
  document.getElementById('panel-content').style.display = tab === 'content' ? '' : 'none';
  document.getElementById('panel-translations').style.display = tab === 'translations' ? '' : 'none';
  document.getElementById('tab-content').classList.toggle('active', tab === 'content');
  document.getElementById('tab-translations').classList.toggle('active', tab === 'translations');

  if (tab === 'translations' && !Object.keys(transContentMap).length) {
    loadTranslations();
  }
}

// ── Load translations data ──
async function loadTranslations() {
  showLoading('טוען תרגומים...');
  try {
    const tid = getTenantId();

    // Populate brand filter if not done
    const brandSelect = document.getElementById('trans-filter-brand');
    if (brandSelect.options.length <= 1) {
      for (const b of contentBrands) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        brandSelect.appendChild(opt);
      }
    }

    // Load all non-Hebrew ai_content
    const { data } = await sb.from('ai_content')
      .select('entity_id, content_type, content, status, language, id')
      .eq('tenant_id', tid)
      .eq('entity_type', 'product')
      .eq('is_deleted', false)
      .in('language', ['en', 'ru']);

    transContentMap = {};
    for (const row of (data || [])) {
      if (!transContentMap[row.entity_id]) transContentMap[row.entity_id] = { en: {}, ru: {} };
      if (transContentMap[row.entity_id][row.language]) {
        transContentMap[row.entity_id][row.language][row.content_type] = {
          id: row.id,
          content: row.content,
          status: row.status
        };
      }
    }

    filterTranslations();
  } catch (e) {
    console.error('loadTranslations error:', e);
    toast('שגיאה בטעינת תרגומים', 'e');
  } finally {
    hideLoading();
  }
}

// ── Filter translations ──
function filterTranslations() {
  const lang = document.getElementById('trans-filter-lang').value;
  const status = document.getElementById('trans-filter-status').value;
  const brand = document.getElementById('trans-filter-brand').value;
  const search = document.getElementById('trans-filter-search').value.trim().toLowerCase();

  // Only show products that have Hebrew content
  let filtered = contentProducts.filter(p => contentMap[p.id]?.description);

  if (brand) filtered = filtered.filter(p => p.brand_id === brand);
  if (search) {
    filtered = filtered.filter(p =>
      (p.model || '').toLowerCase().includes(search) ||
      (p.barcode || '').toLowerCase().includes(search) ||
      (p.brand_name || '').toLowerCase().includes(search)
    );
  }
  if (status === 'missing') {
    filtered = filtered.filter(p => {
      const t = transContentMap[p.id];
      if (lang === 'en') return !t?.en?.description;
      if (lang === 'ru') return !t?.ru?.description;
      return !t?.en?.description || !t?.ru?.description;
    });
  } else if (status) {
    filtered = filtered.filter(p => {
      const t = transContentMap[p.id];
      if (lang === 'en') return t?.en?.description?.status === status;
      if (lang === 'ru') return t?.ru?.description?.status === status;
      return t?.en?.description?.status === status || t?.ru?.description?.status === status;
    });
  }

  document.getElementById('trans-count').textContent = `${filtered.length} מוצרים`;
  transCurrentPage = 1;
  renderTransTable(filtered);
  renderTransPagination(filtered.length);
  updateTransActionLabels();
}

// Reflect filter scope in the bulk-translate button label
function transFilterIsActive() {
  const brand = document.getElementById('trans-filter-brand').value;
  const search = document.getElementById('trans-filter-search').value.trim();
  return brand !== '' || search !== '';
}

function updateTransActionLabels() {
  const btn = document.getElementById('trans-translate-btn');
  if (!btn) return;
  btn.textContent = transFilterIsActive()
    ? '🌐 תרגם מסוננים (חסרים)'
    : '🌐 תרגם הכל (חסרים)';
}

function getTransFilteredProducts() {
  // Re-apply filters to get current filtered list
  const lang = document.getElementById('trans-filter-lang').value;
  const status = document.getElementById('trans-filter-status').value;
  const brand = document.getElementById('trans-filter-brand').value;
  const search = document.getElementById('trans-filter-search').value.trim().toLowerCase();

  let filtered = contentProducts.filter(p => contentMap[p.id]?.description);
  if (brand) filtered = filtered.filter(p => p.brand_id === brand);
  if (search) {
    filtered = filtered.filter(p =>
      (p.model || '').toLowerCase().includes(search) ||
      (p.barcode || '').toLowerCase().includes(search) ||
      (p.brand_name || '').toLowerCase().includes(search)
    );
  }
  if (status === 'missing') {
    filtered = filtered.filter(p => {
      const t = transContentMap[p.id];
      if (lang === 'en') return !t?.en?.description;
      if (lang === 'ru') return !t?.ru?.description;
      return !t?.en?.description || !t?.ru?.description;
    });
  } else if (status) {
    filtered = filtered.filter(p => {
      const t = transContentMap[p.id];
      if (lang === 'en') return t?.en?.description?.status === status;
      if (lang === 'ru') return t?.ru?.description?.status === status;
      return t?.en?.description?.status === status || t?.ru?.description?.status === status;
    });
  }
  return filtered;
}

// ── Render translations table ──
function renderTransTable(products) {
  const container = document.getElementById('trans-table-container');
  const start = (transCurrentPage - 1) * TRANS_PAGE_SIZE;
  const list = products || getTransFilteredProducts();
  const slice = list.slice(start, start + TRANS_PAGE_SIZE);

  if (!slice.length) {
    container.innerHTML = '<p style="color:var(--g400);text-align:center;padding:24px">לא נמצאו תרגומים</p>';
    return;
  }

  let html = `<table class="content-table">
    <thead><tr>
      <th>מותג</th><th>דגם</th><th>ברקוד</th><th>עברית</th><th>EN</th><th>RU</th>
    </tr></thead><tbody>`;

  for (const p of slice) {
    const heOk = contentMap[p.id]?.description ? '✅' : '❌';
    const t = transContentMap[p.id] || { en: {}, ru: {} };
    const enBadge = getTransBadge(t.en?.description);
    const ruBadge = getTransBadge(t.ru?.description);

    html += `<tr style="cursor:pointer">
      <td>${escapeHtml(p.brand_name)}</td>
      <td>${escapeHtml(p.model || '—')}</td>
      <td class="barcode-cell">${escapeHtml(p.barcode || '')}</td>
      <td class="status-icon">${heOk}</td>
      <td onclick="openTransEditModal('${p.id}','en')">${enBadge}</td>
      <td onclick="openTransEditModal('${p.id}','ru')">${ruBadge}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function getTransBadge(entry) {
  if (!entry) return '<span class="trans-badge missing">חסר</span>';
  if (entry.status === 'approved') return '<span class="trans-badge approved">אושר</span>';
  if (entry.status === 'edited') return '<span class="trans-badge edited">נערך</span>';
  return '<span class="trans-badge auto">אוטומטי</span>';
}

// ── Pagination ──
function renderTransPagination(total) {
  const pages = Math.ceil(total / TRANS_PAGE_SIZE);
  const container = document.getElementById('trans-pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <button onclick="goToTransPage(${transCurrentPage - 1})" ${transCurrentPage <= 1 ? 'disabled' : ''}>→</button>
    <span class="page-info">עמוד ${transCurrentPage} / ${pages}</span>
    <button onclick="goToTransPage(${transCurrentPage + 1})" ${transCurrentPage >= pages ? 'disabled' : ''}>←</button>`;
}

function goToTransPage(page) {
  const filtered = getTransFilteredProducts();
  const pages = Math.ceil(filtered.length / TRANS_PAGE_SIZE);
  if (page < 1 || page > pages) return;
  transCurrentPage = page;
  renderTransTable(filtered);
  renderTransPagination(filtered.length);
}

// ── Translation edit modal ──
function openTransEditModal(productId, lang) {
  const product = contentProducts.find(p => p.id === productId);
  if (!product) return;
  transEditProduct = product;
  transEditLang = lang;

  const langLabel = lang === 'en' ? 'English' : 'Русский';
  document.getElementById('trans-edit-title').textContent =
    `${product.brand_name} ${product.model || ''} — תרגום ל${langLabel}`;
  document.getElementById('trans-target-label').textContent = langLabel;
  document.getElementById('trans-edit-type').value = 'description';

  loadTransEditType();
  // Force overlay styles inline so the modal renders as a proper centered popup
  // with a gray backdrop, regardless of whether the shared modal CSS is applied.
  const _tem = document.getElementById('trans-edit-modal');
  Object.assign(_tem.style, {
    position: 'fixed',
    inset: '0',
    top: '0', left: '0', right: '0', bottom: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '10000',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    padding: '20px',
  });
  const _temCard = _tem.querySelector('.modal');
  if (_temCard) {
    Object.assign(_temCard.style, {
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '800px',
      width: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    });
  }
}

function loadTransEditType() {
  if (!transEditProduct || !transEditLang) return;
  const ct = document.getElementById('trans-edit-type').value;
  const heContent = contentMap[transEditProduct.id]?.[ct]?.content || '';
  const transContent = transContentMap[transEditProduct.id]?.[transEditLang]?.[ct]?.content || '';

  document.getElementById('trans-source').value = heContent;
  document.getElementById('trans-target').value = transContent;
}

function closeTransEditModal() {
  document.getElementById('trans-edit-modal').style.display = 'none';
  transEditProduct = null;
  transEditLang = null;
}

async function saveTranslationEdit() {
  if (!transEditProduct || !transEditLang) return;
  const tid = getTenantId();
  const pid = transEditProduct.id;
  const ct = document.getElementById('trans-edit-type').value;
  const newVal = document.getElementById('trans-target').value.trim();
  if (!newVal) { toast('התרגום ריק', 'w'); return; }

  showLoading('שומר תרגום...');
  try {
    const existing = transContentMap[pid]?.[transEditLang]?.[ct];
    const originalContent = existing?.content || '';

    await sb.from('ai_content').upsert({
      tenant_id: tid,
      entity_type: 'product',
      entity_id: pid,
      content_type: ct,
      content: newVal,
      language: transEditLang,
      status: existing ? 'edited' : 'auto',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,entity_type,entity_id,content_type,language' });

    // Save correction for learning if changed
    if (existing && originalContent && originalContent !== newVal) {
      await sb.from('translation_corrections').insert({
        tenant_id: tid,
        ai_content_id: existing.id,
        lang: transEditLang,
        original_translation: originalContent,
        corrected_translation: newVal,
        brand_id: transEditProduct.brand_id || null
      });
    }

    await loadTranslations();
    toast('תרגום נשמר', 's');
    closeTransEditModal();
  } catch (e) {
    console.error('saveTranslationEdit error:', e);
    toast('שגיאה בשמירת תרגום', 'e');
  } finally {
    hideLoading();
  }
}

async function approveTranslation() {
  if (!transEditProduct || !transEditLang) return;
  const tid = getTenantId();
  const ct = document.getElementById('trans-edit-type').value;
  const existing = transContentMap[transEditProduct.id]?.[transEditLang]?.[ct];
  if (!existing) { toast('אין תרגום לאשר', 'w'); return; }

  showLoading('מאשר...');
  try {
    await sb.from('ai_content').update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    await loadTranslations();
    toast('תרגום אושר', 's');
    closeTransEditModal();
  } catch (e) {
    toast('שגיאה באישור', 'e');
  } finally {
    hideLoading();
  }
}

// Call translate-content Edge Function in translate_text mode and persist to ai_content
async function translateAndSaveProductField(tenantId, productId, contentType, sourceText, targetLang) {
  const ctxMap = {
    description: 'general',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    alt_text: 'general',
  };
  let data;
  try {
    const res = await fetch(TRANSLATE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        mode: 'translate_text',
        tenant_id: tenantId,
        target_lang: targetLang,
        text: sourceText,
        context_type: ctxMap[contentType] || 'general',
      }),
    });
    data = await res.json();
  } catch (e) {
    throw new Error('AI_UNAVAILABLE');
  }
  if (!data.success) {
    if (/api[_ ]?key|anthropic|not configured/i.test(String(data.error || ''))) {
      throw new Error('AI_UNAVAILABLE');
    }
    throw new Error(data.error || 'translate-content failed');
  }

  // Persist to ai_content
  const { error: upErr } = await sb.from('ai_content').upsert({
    tenant_id: tenantId,
    entity_type: 'product',
    entity_id: productId,
    content_type: contentType,
    content: data.translated_text,
    language: targetLang,
    status: 'auto',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,entity_type,entity_id,content_type,language' });
  if (upErr) throw new Error(upErr.message);
}

// Batch translate all product fields for one language in a single Edge Function call.
async function translateProductBatch(tenantId, productId, fields, targetLang) {
  let data;
  try {
    const res = await fetch(TRANSLATE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        mode: 'translate_product',
        tenant_id: tenantId,
        target_lang: targetLang,
        fields,
      }),
    });
    data = await res.json();
  } catch (e) {
    throw new Error('AI_UNAVAILABLE');
  }
  if (!data.success) {
    if (/api[_ ]?key|anthropic|not configured/i.test(String(data.error || ''))) {
      throw new Error('AI_UNAVAILABLE');
    }
    throw new Error(data.error || 'translate-content failed');
  }

  const translated = data.fields || {};
  const nowIso = new Date().toISOString();
  const rows = Object.entries(translated)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([contentType, content]) => ({
      tenant_id: tenantId,
      entity_type: 'product',
      entity_id: productId,
      content_type: contentType,
      content,
      language: targetLang,
      status: 'auto',
      updated_at: nowIso,
    }));
  if (rows.length === 0) return;

  const { error: upErr } = await sb.from('ai_content').upsert(rows, {
    onConflict: 'tenant_id,entity_type,entity_id,content_type,language',
  });
  if (upErr) throw new Error(upErr.message);
}

async function retranslateContent() {
  if (!transEditProduct || !transEditLang) return;
  const ct = document.getElementById('trans-edit-type').value;
  const heContent = contentMap[transEditProduct.id]?.[ct]?.content;
  if (!heContent) { toast('אין תוכן עברית לתרגום', 'w'); return; }

  showLoading('מתרגם...');
  try {
    await translateAndSaveProductField(getTenantId(), transEditProduct.id, ct, heContent, transEditLang);
    await loadTranslations();
    loadTransEditType(); // refresh modal
    toast('תורגם בהצלחה', 's');
  } catch (e) {
    console.error('retranslateContent:', e);
    if (e && e.message === 'AI_UNAVAILABLE') {
      toast('שירות התרגום אינו זמין כרגע', 'e');
    } else {
      toast('שגיאה בתרגום: ' + (e.message || ''), 'e');
    }
  } finally {
    hideLoading();
  }
}

// ── Bulk translate missing ──
// Operates on the currently filtered product list (brand/search/status). With
// no filter active this still covers everything with Hebrew content.
async function bulkTranslateMissing() {
  const tid = getTenantId();
  const scope = getTransFilteredProducts().filter(p => contentMap[p.id]?.description);
  const tasks = [];

  for (const p of scope) {
    const t = transContentMap[p.id] || { en: {}, ru: {} };
    for (const lang of ['en', 'ru']) {
      if (!t[lang]?.description) {
        const types = ['description', 'seo_title', 'seo_description', 'alt_text']
          .filter(ct => contentMap[p.id]?.[ct]?.content && !t[lang]?.[ct]);
        if (types.length) tasks.push({ product: p, lang, types });
      }
    }
  }

  if (!tasks.length) { toast('כל המוצרים כבר מתורגמים', 's'); return; }

  transAbort = false;
  const total = tasks.length;
  let success = 0, errors = 0;
  const container = document.getElementById('translate-progress-container');
  container.classList.add('active');
  updateTransProgress(0, total, success, errors, '');

  for (let i = 0; i < total; i++) {
    if (transAbort) break;
    const { product, lang, types } = tasks[i];
    const name = `${product.brand_name} ${product.model || ''} → ${lang.toUpperCase()}`;
    updateTransProgress(i, total, success, errors, name);

    let taskOk = true;
    const fields = {};
    for (const ct of types) {
      fields[ct] = contentMap[product.id][ct].content;
    }
    try {
      await translateProductBatch(tid, product.id, fields, lang);
    } catch (err) {
      console.error('bulk translate item:', err);
      taskOk = false;
    }
    if (taskOk) success++; else errors++;

    // Rate limiting
    if (i < total - 1 && !transAbort) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  updateTransProgress(total, total, success, errors, '');
  document.getElementById('translate-progress-current').textContent = transAbort ? '⏸ הופסק' : '✅ הושלם';
  document.getElementById('translate-progress-stop').textContent = '✕ סגור';
  document.getElementById('translate-progress-stop').onclick = () => {
    container.classList.remove('active');
    document.getElementById('translate-progress-stop').textContent = '⏸ עצור';
    document.getElementById('translate-progress-stop').onclick = stopBulkTranslate;
  };

  await loadTranslations();
  toast(`תרגום: ${success} הצלחות, ${errors} שגיאות`, success > 0 ? 's' : 'e');
}

function updateTransProgress(current, total, success, errors, name) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  document.getElementById('translate-progress-fill').style.width = pct + '%';
  document.getElementById('translate-progress-count').textContent = `${current}/${total} (${pct}%)`;
  document.getElementById('translate-progress-success').textContent = success;
  document.getElementById('translate-progress-errors').textContent = errors;
  document.getElementById('translate-progress-current').textContent = name ? `מתרגם: ${name}` : '';
}

function stopBulkTranslate() {
  transAbort = true;
  toast('עוצר תרגום...', 'w');
}

// ── Export untranslated products for external (human/Gemini) translation ──
function escapeMdCell(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

async function exportUntranslatedMd() {
  const tid = getTenantId();
  const scope = getTransFilteredProducts().filter(p => contentMap[p.id]?.description);
  const rows = [];
  for (const p of scope) {
    const t = transContentMap[p.id] || { en: {}, ru: {} };
    const missingEn = !t.en?.description;
    const missingRu = !t.ru?.description;
    if (!missingEn && !missingRu) continue;
    rows.push({
      brand: p.brand_name || '',
      model: p.model || '',
      barcode: p.barcode || '',
      he_desc: contentMap[p.id]?.description?.content || '',
      he_seo_title: contentMap[p.id]?.seo_title?.content || '',
      he_seo_desc: contentMap[p.id]?.seo_description?.content || '',
      missingEn,
      missingRu,
    });
  }

  if (!rows.length) {
    toast('אין מוצרים לייצוא — הכל מתורגם', 's');
    return;
  }

  showLoading('בונה קובץ ייצוא...');
  let glossaryEn = [];
  let glossaryRu = [];
  try {
    const [enRes, ruRes] = await Promise.all([
      sb.from('translation_glossary')
        .select('term_he, term_translated')
        .eq('tenant_id', tid).eq('lang', 'en').eq('is_deleted', false).limit(20),
      sb.from('translation_glossary')
        .select('term_he, term_translated')
        .eq('tenant_id', tid).eq('lang', 'ru').eq('is_deleted', false).limit(20),
    ]);
    glossaryEn = enRes.data || [];
    glossaryRu = ruRes.data || [];
  } catch (e) {
    console.warn('glossary fetch failed:', e);
  }

  const filterNote = transFilterIsActive() ? ' (filtered subset)' : ' (all untranslated)';
  const md = [];
  md.push(`# Product Translations — Prizma Optic${filterNote}`);
  md.push('');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Products to translate: **${rows.length}**`);
  md.push('');
  md.push('---');
  md.push('');
  md.push('## Translation Brief');
  md.push('');
  md.push('**Business:** Prizma Optic — premium optical store in Ashkelon, Israel. ~40 years in business. Authorized dealer for Zeiss, Leica, Rodenstock, Hoya, Essilor and luxury eyewear brands (Cazal, Gucci, Ray-Ban, etc.).');
  md.push('');
  md.push('**Audience:** Israeli customers seeking quality eyewear and professional multifocal fitting. Target languages are English and Russian — both consumed by an Israel-resident audience (use ₪ for prices, never USD/EUR).');
  md.push('');
  md.push('**Tone:** Professional, warm, luxurious — like a trusted family store, not a discount chain. Avoid translation-ese; write as if originally authored in the target language.');
  md.push('');
  md.push('**Russian:** use formal "вы" form. Natural Russian word order (no Hebrew syntax).');
  md.push('**English:** American English. Active voice. Short sentences.');
  md.push('');
  md.push('## Hard Rules');
  md.push('');
  md.push('1. Do NOT use the word "plastic" — use **"acetate"** for frame material.');
  md.push('2. Do NOT start every product with "The frame features…" or "These glasses feature…". Vary the openings.');
  md.push('3. Use a short en-dash or hyphen (–, -) — never a long em-dash (—).');
  md.push('4. Brand names, model codes, and barcodes — keep verbatim. Never translate "Cazal", "Ray-Ban", "Gucci", etc.');
  md.push('5. Numbers, sizes, prices, and policy details must remain factually identical.');
  md.push('6. SEO title: 50-60 characters. SEO description: 150-160 characters.');
  md.push('7. Description: 2-3 sentences, marketing tone, informative not salesy.');
  md.push('8. No emojis. No "shop now" / "click here" CTAs (the storefront handles those).');
  md.push('');

  if (glossaryEn.length || glossaryRu.length) {
    md.push('## Glossary');
    md.push('');
    md.push('Use these exact translations for optical terminology:');
    md.push('');
    if (glossaryEn.length) {
      md.push('### Hebrew → English');
      md.push('');
      md.push('| Hebrew | English |');
      md.push('|---|---|');
      for (const g of glossaryEn) {
        md.push(`| ${escapeMdCell(g.term_he)} | ${escapeMdCell(g.term_translated)} |`);
      }
      md.push('');
    }
    if (glossaryRu.length) {
      md.push('### Hebrew → Russian');
      md.push('');
      md.push('| Hebrew | Russian |');
      md.push('|---|---|');
      for (const g of glossaryRu) {
        md.push(`| ${escapeMdCell(g.term_he)} | ${escapeMdCell(g.term_translated)} |`);
      }
      md.push('');
    }
  }

  md.push('---');
  md.push('');
  md.push('## Products');
  md.push('');
  md.push('Fill the **EN Translation** and **RU Translation** columns. Each cell should contain three lines separated by `<br>`: description, SEO title, SEO description (in that order). Leave a column blank only if that language is already translated (the "needs" column tells you which).');
  md.push('');
  md.push('| # | Brand | Model | Barcode | Needs | Hebrew Description | Hebrew SEO Title | Hebrew SEO Description | EN Translation | RU Translation |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const needs = [r.missingEn ? 'EN' : '', r.missingRu ? 'RU' : ''].filter(Boolean).join('+');
    md.push(`| ${i + 1} | ${escapeMdCell(r.brand)} | ${escapeMdCell(r.model)} | ${escapeMdCell(r.barcode)} | ${needs} | ${escapeMdCell(r.he_desc)} | ${escapeMdCell(r.he_seo_title)} | ${escapeMdCell(r.he_seo_desc)} |  |  |`);
  });
  md.push('');

  const blob = new Blob([md.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `prizma-translations-${stamp}-${rows.length}products.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  hideLoading();
  toast(`יוצא ${rows.length} מוצרים`, 's');
}
