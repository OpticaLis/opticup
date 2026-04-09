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
// Page through v_ai_content for one language, 1000 rows at a time, until a
// short page tells us we're done. The PostgREST default cap is 1000 even when
// .range() asks for more, so we have to drive pagination explicitly.
async function fetchAiContentPage(tid, lang) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('v_ai_content')
      .select('entity_id, content_type, content, language, id')
      .eq('tenant_id', tid)
      .eq('entity_type', 'product')
      .eq('is_deleted', false)
      .eq('language', lang)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

async function loadTranslations() {
  console.log('[loadTrans] BUILD=2026-04-09-v4 — paginated per-language reads');
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

    // Load all non-Hebrew translations via the v_ai_content view. We used to
    // query the ai_content table directly, but RLS on the table was hiding
    // EN/RU rows under the Studio JWT (HE rows came through, EN/RU did not),
    // so the bulk-translate UI showed "חסר" even after a successful save.
    // The view exposes the same rows without that filter, but has no `status`
    // column — until the view is enriched, every translation renders with the
    // "auto" badge (edited/approved badges are not shown in the table).
    const [enRows, ruRows] = await Promise.all([
      fetchAiContentPage(tid, 'en'),
      fetchAiContentPage(tid, 'ru'),
    ]);
    const data = [...enRows, ...ruRows];
    console.log('[loadTrans] result:', { enRows: enRows.length, ruRows: ruRows.length, total: data.length });

    transContentMap = {};
    for (const row of (data || [])) {
      if (!transContentMap[row.entity_id]) transContentMap[row.entity_id] = { en: {}, ru: {} };
      if (transContentMap[row.entity_id][row.language]) {
        transContentMap[row.entity_id][row.language][row.content_type] = {
          id: row.id,
          content: row.content,
          status: 'auto',
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
      is_deleted: false,    // Fragile Area #8 — reset soft-delete on upsert
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

  // Persist to ai_content. is_deleted: false resets any soft-deleted row that
  // matches the conflict key — otherwise the update would leave is_deleted=true
  // and loadTranslations() would filter the row out.
  const { error: upErr } = await sb.from('ai_content').upsert({
    tenant_id: tenantId,
    entity_type: 'product',
    entity_id: productId,
    content_type: contentType,
    content: data.translated_text,
    language: targetLang,
    status: 'auto',
    is_deleted: false,
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
      // Reset is_deleted on conflict — otherwise upsert updates a soft-deleted
      // row and loadTranslations() filters it out, masking the write.
      is_deleted: false,
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

// ══════════════════════════════════════════════════════════════
// EXTERNAL TRANSLATION — EXPORT
// ══════════════════════════════════════════════════════════════

function escapeMdCell(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Download multiple files sequentially with 400ms delay between each.
 * Uses Blob + temporary <a> element (same pattern as old export).
 */
function downloadMultipleFiles(files) {
  files.forEach((file, i) => {
    setTimeout(() => {
      const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, i * 400);
  });
}

/**
 * Main export handler. Called from HTML button: exportForTranslation('en') or ('ru').
 * Generates: 1 prompt file + N data batch files.
 */
async function exportForTranslation(targetLang) {
  const tid = getTenantId();
  const langLabel = targetLang === 'en' ? 'English' : 'Russian';
  const langCode = targetLang.toUpperCase();

  // 1. Find products missing this language's description
  const missingProducts = getTransFilteredProducts().filter(p => {
    if (!contentMap[p.id]?.description) return false;
    const t = transContentMap[p.id] || {};
    return !t[targetLang]?.description;
  });

  if (!missingProducts.length) {
    toast(`אין מוצרים חסרי תרגום ל-${langCode}`, 's');
    return;
  }

  showLoading(`מכין קבצי ייצוא ל-${langCode}...`);

  // 2. Load glossary
  let glossary = [];
  try {
    const { data } = await sb.from('translation_glossary')
      .select('term_he, term_translated')
      .eq('tenant_id', tid)
      .eq('lang', targetLang)
      .eq('is_deleted', false)
      .order('context');
    glossary = data || [];
  } catch (e) { console.warn('glossary fetch failed:', e); }

  // 3. Find 2-3 example products (have HE + target lang content for all 4 fields)
  const exampleProducts = [];
  for (const p of contentProducts) {
    if (exampleProducts.length >= 3) break;
    const he = contentMap[p.id];
    const tr = (transContentMap[p.id] || {})[targetLang];
    if (he?.description && he?.seo_title && he?.seo_description &&
        tr?.description && tr?.seo_title && tr?.seo_description) {
      exampleProducts.push({
        brand: p.brand_name || '',
        model: p.model || '',
        barcode: p.barcode || '',
        he_desc: he.description.content || '',
        he_seo_title: he.seo_title.content || '',
        he_seo_desc: he.seo_description.content || '',
        he_alt: (he.alt_text?.content) || '',
        tr_desc: tr.description.content || '',
        tr_seo_title: tr.seo_title.content || '',
        tr_seo_desc: tr.seo_description.content || '',
        tr_alt: (tr.alt_text?.content) || '',
      });
    }
  }

  // 4. Build product rows for export
  const rows = missingProducts.map(p => ({
    brand: p.brand_name || '',
    model: p.model || '',
    barcode: p.barcode || '',
    he_desc: contentMap[p.id]?.description?.content || '',
    he_seo_title: contentMap[p.id]?.seo_title?.content || '',
    he_seo_desc: contentMap[p.id]?.seo_description?.content || '',
    he_alt: contentMap[p.id]?.alt_text?.content || '',
  }));

  // 5. Build prompt file
  const promptContent = buildTranslationPrompt(targetLang, langLabel, langCode, glossary, exampleProducts);

  // 6. Split into batches of 25
  const BATCH_SIZE = 25;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  // 7. Build data files
  const dataFiles = batches.map((batch, idx) => ({
    name: `PRODUCTS_${langCode}_BATCH_${String(idx + 1).padStart(2, '0')}.md`,
    content: buildDataFile(batch, langCode, idx + 1, batches.length, idx * BATCH_SIZE)
  }));

  // 8. Download all files
  const stamp = new Date().toISOString().slice(0, 10);
  const allFiles = [
    { name: `PROMPT_TRANSLATE_${langCode}_${stamp}.md`, content: promptContent },
    ...dataFiles
  ];

  downloadMultipleFiles(allFiles);
  hideLoading();
  toast(`יוצאו ${allFiles.length} קבצים (${rows.length} מוצרים) ל-${langCode}`, 's');
}

/**
 * Build the translation prompt file content (instructions, glossary, examples).
 */
function buildTranslationPrompt(targetLang, langLabel, langCode, glossary, examples) {
  const md = [];

  md.push(`# Translation Task — Prizma Optic Products → ${langLabel}`);
  md.push('');
  md.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('---');
  md.push('');

  // Role
  md.push('## Your Role');
  md.push('');
  md.push(`You are a professional marketing translator specializing in optical/eyewear products. You translate Hebrew product content into polished, natural ${langLabel}.`);
  md.push('');

  // Business context
  md.push('## Business Context');
  md.push('');
  md.push('**Prizma Optic** (אופטיקה פריזמה) — premium optical store in Ashkelon, Israel. Approximately 40 years in business. Authorized dealer for Zeiss, Leica, Rodenstock, Hoya, Essilor, and luxury eyewear brands (Cazal, Gucci, Ray-Ban, Tom Ford, Saint Laurent, etc.).');
  md.push('');
  md.push('**Audience:** Israeli customers seeking quality eyewear. Use ₪ for prices (never USD/EUR). The audience reads the website in Israel.');
  md.push('');

  // Tone
  md.push('## Tone & Style');
  md.push('');
  if (targetLang === 'en') {
    md.push('- American English. Active voice. Short, punchy sentences.');
    md.push('- Professional, warm, luxurious — like a trusted family store, not a discount chain.');
    md.push('- Write as if the text was originally authored in English (no "translationese").');
  } else {
    md.push('- Formal "вы" form throughout. Natural Russian word order (no Hebrew syntax calques).');
    md.push('- Professional, warm, luxurious — like a trusted family store, not a discount chain.');
    md.push('- Write as if the text was originally authored in Russian (no "translationese").');
  }
  md.push('');

  // Hard rules
  md.push('## Hard Rules');
  md.push('');
  md.push('1. **Never** use the word "plastic" — always use **"acetate"** for frame material.');
  md.push('2. **Vary openings** — never start two consecutive products with the same phrase (e.g., "The frame features…", "These glasses…").');
  md.push('3. Use a short hyphen **-** only — never em-dash (—) or en-dash (–).');
  md.push('4. **Brand names, model codes, barcodes** — keep verbatim. Never translate or modify them.');
  md.push('5. Numbers, sizes, prices, and measurements — keep factually identical to the Hebrew source.');
  md.push('6. **Description:** 2-3 sentences. Marketing tone, informative, not salesy.');
  md.push('7. **SEO Title:** 50-60 characters. Format: `[Brand] [Model] - [type keyword]`. Must be unique per product.');
  md.push('8. **SEO Description:** 150-160 characters. Informative summary with brand + model + key feature. End with " - Prizma Optic, Ashkelon" or equivalent.');
  md.push('9. **Alt Text:** Concise image description, max 125 characters. Format: `[Brand] [Model] [product type] [key visual feature]`. Never start with "Image of" or "Photo of".');
  md.push('10. No emojis. No CTAs like "shop now" or "click here".');
  md.push('11. If the Hebrew text appears cut off mid-sentence, complete the thought naturally in the translation.');
  md.push('12. Return your output as a **markdown table** (pipe-delimited). Do NOT return Excel, CSV, JSON, or any other format.');
  md.push('13. **Barcodes must be returned exactly as provided** — preserve leading zeros. Barcode `0001931` must stay `0001931`, not `1931`.');
  md.push('14. Do NOT wrap the output table in a code block (no ```). Just the raw markdown table.');
  md.push('');

  // Glossary
  if (glossary.length) {
    md.push('## Glossary — Use These Exact Translations');
    md.push('');
    md.push(`| Hebrew | ${langLabel} |`);
    md.push('|---|---|');
    for (const g of glossary) {
      md.push(`| ${escapeMdCell(g.term_he)} | ${escapeMdCell(g.term_translated)} |`);
    }
    md.push('');
  }

  // Output format
  md.push('## Task Format');
  md.push('');
  md.push('I will send you a markdown table with **8 columns:**');
  md.push('');
  md.push(`| # | Brand | Model | Barcode | HE Description | HE SEO Title | HE SEO Desc | HE Alt Text |`);
  md.push('');
  md.push(`You must return a **new table** with **8 columns:**`);
  md.push('');
  md.push(`| # | Brand | Model | Barcode | ${langCode} Description | ${langCode} SEO Title | ${langCode} SEO Desc | ${langCode} Alt Text |`);
  md.push('');
  md.push('**Rules:**');
  md.push('- Return ALL rows. Do not skip any.');
  md.push('- Keep #, Brand, Model, Barcode identical to the input.');
  md.push(`- Fill all 4 ${langCode} columns for every row.`);
  md.push('- Return ONLY the markdown table — no explanations, no commentary before or after.');
  md.push('- Do NOT return the result as an Excel file, spreadsheet, or code block.');
  md.push('- Do not wrap the table in a code block.');
  md.push('');

  // Examples
  if (examples.length) {
    md.push('## Example');
    md.push('');
    md.push('**Input:**');
    md.push('');
    md.push('| # | Brand | Model | Barcode | HE Description | HE SEO Title | HE SEO Desc | HE Alt Text |');
    md.push('|---|---|---|---|---|---|---|---|');
    examples.forEach((ex, i) => {
      md.push(`| ${i + 1} | ${escapeMdCell(ex.brand)} | ${escapeMdCell(ex.model)} | ${escapeMdCell(ex.barcode)} | ${escapeMdCell(ex.he_desc)} | ${escapeMdCell(ex.he_seo_title)} | ${escapeMdCell(ex.he_seo_desc)} | ${escapeMdCell(ex.he_alt)} |`);
    });
    md.push('');
    md.push('**Expected output:**');
    md.push('');
    md.push(`| # | Brand | Model | Barcode | ${langCode} Description | ${langCode} SEO Title | ${langCode} SEO Desc | ${langCode} Alt Text |`);
    md.push('|---|---|---|---|---|---|---|---|');
    examples.forEach((ex, i) => {
      md.push(`| ${i + 1} | ${escapeMdCell(ex.brand)} | ${escapeMdCell(ex.model)} | ${escapeMdCell(ex.barcode)} | ${escapeMdCell(ex.tr_desc)} | ${escapeMdCell(ex.tr_seo_title)} | ${escapeMdCell(ex.tr_seo_desc)} | ${escapeMdCell(ex.tr_alt)} |`);
    });
    md.push('');
  }

  // Ready handshake
  md.push('---');
  md.push('');
  md.push('## Ready?');
  md.push('');
  md.push('Read all instructions above carefully.');
  md.push('When you fully understand the task, reply with exactly:');
  md.push('');
  md.push(`**"Ready - send the ${langLabel} product table."**`);
  md.push('');
  md.push('I will then send you the products to translate in the next message.');

  return md.join('\n');
}

/**
 * Build a single data batch file.
 */
function buildDataFile(batch, langCode, batchNum, totalBatches, offset) {
  const md = [];
  md.push(`# Products to Translate — ${langCode} — Batch ${batchNum}/${totalBatches}`);
  md.push('');
  md.push(`Translate all 4 empty ${langCode} columns for each row. Return the complete output table.`);
  md.push('');
  md.push('| # | Brand | Model | Barcode | HE Description | HE SEO Title | HE SEO Desc | HE Alt Text |');
  md.push('|---|---|---|---|---|---|---|---|');
  batch.forEach((r, i) => {
    const num = offset + i + 1;
    md.push(`| ${num} | ${escapeMdCell(r.brand)} | ${escapeMdCell(r.model)} | ${escapeMdCell(r.barcode)} | ${escapeMdCell(r.he_desc)} | ${escapeMdCell(r.he_seo_title)} | ${escapeMdCell(r.he_seo_desc)} | ${escapeMdCell(r.he_alt)} |`);
  });
  return md.join('\n');
}

// ══════════════════════════════════════════════════════════════
// EXTERNAL TRANSLATION — IMPORT
// ══════════════════════════════════════════════════════════════

let importParsedRows = []; // validated rows ready for save

function openImportModal() {
  document.getElementById('import-textarea').value = '';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-preview').innerHTML = '';
  document.getElementById('import-status').style.display = 'none';
  document.getElementById('import-save-btn').style.display = 'none';
  importParsedRows = [];
  document.getElementById('import-modal').style.display = 'flex';
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  importParsedRows = [];
}

/**
 * Parse a markdown table from pasted text.
 */
function parseMarkdownTable(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) return [];

  const headerCells = lines[0].split('|').map(c => c.trim()).filter(c => c !== '');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\|[\s\-:]+\|/.test(line) && !line.match(/[a-zA-Zא-ת0-9]/)) continue;
    const rawCells = line.split('|');
    if (rawCells[0].trim() === '') rawCells.shift();
    if (rawCells[rawCells.length - 1].trim() === '') rawCells.pop();
    const cleanCells = rawCells.map(c => c.trim());

    if (cleanCells.length >= headerCells.length - 1) {
      const row = {};
      headerCells.forEach((h, idx) => {
        row[h.toLowerCase()] = (cleanCells[idx] || '').replace(/\\?\|/g, '|');
      });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Find the column value by trying multiple possible header names.
 */
function findColumn(row, ...candidates) {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return '';
}

/**
 * Validate pasted text: parse table, match barcodes, check fields.
 */
function validateImport() {
  const text = document.getElementById('import-textarea').value;
  const targetLang = document.getElementById('import-lang').value;
  const langCode = targetLang.toUpperCase();

  if (!text.trim()) {
    showImportStatus('הדבק טבלה קודם', 'error');
    return;
  }

  const rows = parseMarkdownTable(text);
  if (!rows.length) {
    showImportStatus('לא נמצאה טבלת Markdown בטקסט שהודבק', 'error');
    return;
  }

  const barcodeMap = {};
  for (const p of contentProducts) {
    if (p.barcode) barcodeMap[p.barcode] = p;
  }

  const hebrewRegex = /[\u0590-\u05FF]/;

  const validated = [];
  let okCount = 0, warnCount = 0, errCount = 0;

  for (const row of rows) {
    const barcode = findColumn(row, 'barcode');
    if (!barcode || barcode === '---' || barcode === '#') continue;

    // Smart barcode lookup: exact match first, then try zero-padded variations
    let product = barcodeMap[barcode];
    if (!product && /^\d+$/.test(barcode)) {
      const padded7 = barcode.padStart(7, '0');
      const padded6 = barcode.padStart(6, '0');
      const padded8 = barcode.padStart(8, '0');
      product = barcodeMap[padded7] || barcodeMap[padded6] || barcodeMap[padded8];
    }
    const desc = findColumn(row, `${langCode} desc`, `${langCode.toLowerCase()} desc`, 'description', 'desc');
    const seoTitle = findColumn(row, `${langCode} seo title`, `${langCode.toLowerCase()} seo title`, 'seo title', 'seo_title');
    const seoDesc = findColumn(row, `${langCode} seo desc`, `${langCode.toLowerCase()} seo desc`, 'seo desc', 'seo_desc');
    const altText = findColumn(row, `${langCode} alt`, `${langCode.toLowerCase()} alt`, 'alt text', 'alt_text', 'alt');

    const brand = findColumn(row, 'brand') || product?.brand_name || '?';
    const model = findColumn(row, 'model') || product?.model || '?';

    const errors = [];
    const warnings = [];

    if (!product) {
      errors.push(`ברקוד ${barcode} לא נמצא במוצרים`);
    }

    if (!desc) errors.push('חסר Description');
    if (!seoTitle) errors.push('חסר SEO Title');
    if (!seoDesc) errors.push('חסר SEO Desc');
    if (!altText) warnings.push('חסר Alt Text');

    if (desc && hebrewRegex.test(desc)) errors.push('Description מכיל עברית');
    if (seoTitle && hebrewRegex.test(seoTitle)) errors.push('SEO Title מכיל עברית');
    if (seoDesc && hebrewRegex.test(seoDesc)) errors.push('SEO Desc מכיל עברית');
    if (altText && hebrewRegex.test(altText)) errors.push('Alt Text מכיל עברית');

    if (seoTitle && seoTitle.length > 70) errors.push(`SEO Title ארוך מדי (${seoTitle.length} > 70)`);
    else if (seoTitle && seoTitle.length > 60) warnings.push(`SEO Title ארוך (${seoTitle.length} > 60)`);

    if (seoDesc && seoDesc.length > 200) errors.push(`SEO Desc ארוך מדי (${seoDesc.length} > 200)`);
    else if (seoDesc && seoDesc.length > 160) warnings.push(`SEO Desc ארוך (${seoDesc.length} > 160)`);

    if (altText && altText.length > 150) errors.push(`Alt Text ארוך מדי (${altText.length} > 150)`);
    else if (altText && altText.length > 125) warnings.push(`Alt Text ארוך (${altText.length} > 125)`);

    let status;
    if (errors.length) { status = 'error'; errCount++; }
    else if (warnings.length) { status = 'warning'; warnCount++; }
    else { status = 'ok'; okCount++; }

    validated.push({
      barcode,
      brand,
      model,
      entityId: product?.id || null,
      desc,
      seoTitle,
      seoDesc,
      altText,
      status,
      errors,
      warnings,
    });
  }

  importParsedRows = validated;

  renderImportPreview(validated, langCode, okCount, warnCount, errCount);
}

function showImportStatus(msg, type) {
  const el = document.getElementById('import-status');
  el.style.display = 'block';
  el.style.background = type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#ffc';
  el.style.color = '#333';
  el.textContent = msg;
}

function renderImportPreview(rows, langCode, okCount, warnCount, errCount) {
  const container = document.getElementById('import-preview');
  const saveable = okCount + warnCount;

  let html = `<table class="data-table" style="font-size:12px;direction:ltr;text-align:left;">`;
  html += `<thead><tr><th>Status</th><th>Brand</th><th>Model</th><th>Barcode</th><th>${langCode} Description</th><th>Notes</th></tr></thead>`;
  html += `<tbody>`;

  for (const r of rows) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    const notes = [...r.errors, ...r.warnings].join('; ') || '-';
    const descPreview = (r.desc || '').substring(0, 60) + ((r.desc || '').length > 60 ? '...' : '');
    const rowColor = r.status === 'error' ? '#fee' : r.status === 'warning' ? '#ffc' : '';
    html += `<tr style="background:${rowColor}"><td>${icon}</td><td>${escImport(r.brand)}</td><td>${escImport(r.model)}</td><td>${escImport(r.barcode)}</td><td style="direction:ltr">${escImport(descPreview)}</td><td>${escImport(notes)}</td></tr>`;
  }

  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-weight:bold;">✅ ${okCount} תקין &nbsp; ⚠️ ${warnCount} אזהרות &nbsp; ❌ ${errCount} שגיאות &nbsp; | &nbsp; ${saveable} ישמרו</div>`;

  container.innerHTML = html;
  container.style.display = 'block';

  document.getElementById('import-save-btn').style.display = saveable > 0 ? 'inline-block' : 'none';

  if (errCount > 0) {
    showImportStatus(`${errCount} שורות עם שגיאות ידלגו. ${saveable} ישמרו.`, 'warning');
  } else {
    showImportStatus(`הכל תקין! ${saveable} מוצרים מוכנים לשמירה.`, 'success');
  }
}

// Minimal HTML escaper for preview table
function escImport(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Save validated translations to ai_content.
 */
async function saveImport() {
  const targetLang = document.getElementById('import-lang').value;
  const tid = getTenantId();
  const nowIso = new Date().toISOString();

  const saveableRows = importParsedRows.filter(r =>
    (r.status === 'ok' || r.status === 'warning') && r.entityId
  );

  if (!saveableRows.length) {
    showImportStatus('אין שורות תקינות לשמירה', 'error');
    return;
  }

  showLoading(`שומר ${saveableRows.length} תרגומים...`);

  const records = [];
  for (const r of saveableRows) {
    const base = {
      tenant_id: tid,
      entity_type: 'product',
      entity_id: r.entityId,
      language: targetLang,
      status: 'edited',
      is_deleted: false,        // CRITICAL — Fragile Area #8
      updated_at: nowIso,
    };

    if (r.desc) records.push({ ...base, content_type: 'description', content: r.desc });
    if (r.seoTitle) records.push({ ...base, content_type: 'seo_title', content: r.seoTitle });
    if (r.seoDesc) records.push({ ...base, content_type: 'seo_description', content: r.seoDesc });
    if (r.altText) records.push({ ...base, content_type: 'alt_text', content: r.altText });
  }

  const UPSERT_BATCH = 100;
  let saved = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH);
    const { error } = await sb.from('ai_content').upsert(batch, {
      onConflict: 'tenant_id,entity_type,entity_id,content_type,language',
    });
    if (error) {
      console.error('Import upsert error:', error);
      errors++;
    } else {
      saved += batch.length;
    }
  }

  hideLoading();

  if (errors) {
    showImportStatus(`נשמרו ${saved} שדות, ${errors} שגיאות upsert — בדוק console`, 'warning');
  } else {
    showImportStatus(`✅ נשמרו ${saved} שדות (${saveableRows.length} מוצרים) בהצלחה!`, 'success');
  }

  await loadTranslations();
  renderTransTable();

  document.getElementById('import-save-btn').style.display = 'none';

  toast(`יובאו ${saveableRows.length} תרגומים ל-${targetLang.toUpperCase()}`, 's');
}
