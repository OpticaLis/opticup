// Storefront Translations Tab — view, edit, bulk-translate product content
// Phase 6: i18n (manual translation flow — AI removed per HF1)
let transContentMap = {};
let transCurrentPage = 1;
const TRANS_PAGE_SIZE = 50;
let transEditProduct = null;
let transEditLang = null;
let _contaminationFilterActive = false;
function switchContentTab(tab) {
  document.getElementById('panel-content').style.display = tab === 'content' ? '' : 'none';
  document.getElementById('panel-translations').style.display = tab === 'translations' ? '' : 'none';
  document.getElementById('tab-content').classList.toggle('active', tab === 'content');
  document.getElementById('tab-translations').classList.toggle('active', tab === 'translations');
  if (tab === 'translations' && !Object.keys(transContentMap).length) loadTranslations();
}
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
    const brandSelect = document.getElementById('trans-filter-brand');
    if (brandSelect.options.length <= 1) {
      for (const b of contentBrands) {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        brandSelect.appendChild(opt);
      }
    }
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
    _injectContaminationFilter();
    _updateContaminationUI('en');
  } catch (e) {
    console.error('loadTranslations error:', e);
    toast('שגיאה בטעינת תרגומים', 'e');
  } finally {
    hideLoading();
  }
}

function filterTranslations() {
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
  const counterLang = lang === 'en' || lang === 'ru' ? lang : 'en';
  _updateContaminationUI(counterLang);
  if (_contaminationFilterActive) {
    const filterLangs = lang === 'en' ? ['en'] : lang === 'ru' ? ['ru'] : ['en', 'ru'];
    filtered = filtered.filter(p =>
      filterLangs.some(l => _getContaminatedFields(p.id, l).length > 0)
    );
  }
  document.getElementById('trans-count').textContent = `${filtered.length} מוצרים`;
  transCurrentPage = 1;
  renderTransTable(filtered);
  renderTransPagination(filtered.length);
  updateTransActionLabels();
}

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
  if (_contaminationFilterActive) {
    const filterLangs = lang === 'en' ? ['en'] : lang === 'ru' ? ['ru'] : ['en', 'ru'];
    filtered = filtered.filter(p =>
      filterLangs.some(l => _getContaminatedFields(p.id, l).length > 0)
    );
  }
  return filtered;
}

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
      is_deleted: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,entity_type,entity_id,content_type,language' });
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
    const badge = document.getElementById('trans-unsaved-badge');
    if (badge) badge.style.display = 'none';
    const targetEl = document.getElementById('trans-target');
    if (targetEl) { targetEl.style.borderColor = ''; targetEl.style.background = ''; }
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
  } finally { hideLoading(); }
}
