// Storefront AI Content Manager — view, edit, bulk-generate product content
// Phase 5A: AI descriptions, SEO meta, alt text

let contentProducts = [];
let contentBrands = [];
let contentMap = {};       // product_id → { description, seo_title, seo_description, alt_text }
let selectedContentIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 50;
let bulkAbort = false;
let editingProduct = null; // current product being edited

const EDGE_FN_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/generate-ai-content';

// ── Load page ──
async function loadContentPage() {
  showLoading('טוען מוצרים ותוכן...');
  try {
    const tid = getTenantId();

    // Load products from storefront view (only visible products)
    const { data: products } = await sb.from('v_storefront_products')
      .select('id, barcode, brand_name, brand_id, model, color, size, quantity, product_type, sell_price, images')
      .eq('tenant_id', tid);
    contentProducts = (products || []).map(p => {
      // Extract first image storage path from view's images array
      let imagePath = null;
      if (p.images && p.images.length > 0) {
        imagePath = p.images[0].replace('/api/image/', '');
      }
      return { ...p, brand_name: p.brand_name || '—', image_path: imagePath };
    });

    // Build deduplicated brand list from products (by name, to avoid duplicates from brand_type)
    const brandNames = new Map();
    for (const p of contentProducts) {
      if (p.brand_name && p.brand_name !== '—' && !brandNames.has(p.brand_name)) {
        brandNames.set(p.brand_name, p.brand_id);
      }
    }
    contentBrands = Array.from(brandNames.entries())
      .map(([name, id]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const brandSelect = document.getElementById('filter-brand');
    // Clear existing options (keep first "all" option) to prevent duplicates on reload
    while (brandSelect.options.length > 1) brandSelect.remove(1);
    for (const b of contentBrands) {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.name;
      brandSelect.appendChild(opt);
    }

    // Load AI content
    await loadAIContent(tid);

    filterContent();
  } catch (e) {
    console.error('loadContentPage error:', e);
    toast('שגיאה בטעינת תוכן', 'e');
  } finally {
    hideLoading();
  }
}

async function loadAIContent(tid) {
  const { data } = await sb.from('ai_content')
    .select('entity_id, content_type, content, status, id')
    .eq('tenant_id', tid)
    .eq('entity_type', 'product')
    .eq('language', 'he')
    .eq('is_deleted', false);

  contentMap = {};
  for (const row of (data || [])) {
    if (!contentMap[row.entity_id]) contentMap[row.entity_id] = {};
    contentMap[row.entity_id][row.content_type] = {
      id: row.id,
      content: row.content,
      status: row.status
    };
  }
}

// ── Filter + render ──
function filterContent() {
  const brandFilter = document.getElementById('filter-brand').value;
  const statusFilter = document.getElementById('filter-status').value;
  const searchFilter = document.getElementById('filter-search').value.trim().toLowerCase();

  let filtered = contentProducts;

  if (brandFilter) filtered = filtered.filter(p => p.brand_name === brandFilter);
  if (searchFilter) {
    filtered = filtered.filter(p =>
      (p.model || '').toLowerCase().includes(searchFilter) ||
      (p.barcode || '').toLowerCase().includes(searchFilter) ||
      (p.brand_name || '').toLowerCase().includes(searchFilter)
    );
  }
  if (statusFilter === 'has_content') {
    filtered = filtered.filter(p => contentMap[p.id]?.description);
  } else if (statusFilter === 'edited') {
    filtered = filtered.filter(p => contentMap[p.id]?.description?.status === 'edited');
  } else if (statusFilter === 'no_content') {
    filtered = filtered.filter(p => !contentMap[p.id]?.description);
  }

  document.getElementById('content-count').textContent = `${filtered.length} מוצרים`;
  currentPage = 1;
  renderContentTable(filtered);
  renderPagination(filtered.length);
}

function renderContentTable(products) {
  const container = document.getElementById('content-table-container');
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = products || getFilteredProducts();
  const slice = page.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    container.innerHTML = '<p style="color:var(--g400);text-align:center;padding:24px">לא נמצאו מוצרים</p>';
    return;
  }

  let html = `<table class="content-table">
    <thead><tr>
      <th><input type="checkbox" id="select-all-content" onchange="toggleSelectAllContent(this)"></th>
      <th>תמונה</th>
      <th>מותג</th>
      <th>דגם</th>
      <th>ברקוד</th>
      <th>תיאור</th>
      <th>SEO</th>
      <th>Alt</th>
    </tr></thead>
    <tbody>`;

  for (const p of slice) {
    const c = contentMap[p.id] || {};
    const descIcon = getStatusIcon(c.description);
    const seoIcon = getStatusIcon(c.seo_title);
    const altIcon = getStatusIcon(c.alt_text);
    const checked = selectedContentIds.has(p.id) ? 'checked' : '';
    const imgHtml = p.image_path
      ? `<img class="thumb" src="https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/object/sign/frame-images/${encodeURIComponent(p.image_path)}" onerror="this.outerHTML='<div class=no-thumb>📷</div>'" onclick="event.stopPropagation(); openImagePreview('${p.id}')">`
      : `<div class="no-thumb" onclick="event.stopPropagation(); openImagePreview('${p.id}')">📷</div>`;

    html += `<tr onclick="openEditModal('${p.id}')" data-pid="${p.id}">
      <td onclick="event.stopPropagation()"><input type="checkbox" class="row-cb-content" value="${p.id}" ${checked} onchange="toggleContentRow(this)"></td>
      <td>${imgHtml}</td>
      <td>${escapeHtml(p.brand_name)}</td>
      <td>${escapeHtml(p.model || '—')}</td>
      <td class="barcode-cell">${escapeHtml(p.barcode || '')}</td>
      <td class="status-icon" onclick="event.stopPropagation(); openEditModal('${p.id}','description')">${descIcon}</td>
      <td class="status-icon" onclick="event.stopPropagation(); openEditModal('${p.id}','seo_title')">${seoIcon}</td>
      <td class="status-icon" onclick="event.stopPropagation(); openEditModal('${p.id}','alt_text')">${altIcon}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function getStatusIcon(entry) {
  if (!entry) return '❌';
  if (entry.status === 'edited') return '✏️';
  return '✅';
}

function getFilteredProducts() {
  const brandFilter = document.getElementById('filter-brand').value;
  const statusFilter = document.getElementById('filter-status').value;
  const searchFilter = document.getElementById('filter-search').value.trim().toLowerCase();

  let filtered = contentProducts;
  if (brandFilter) filtered = filtered.filter(p => p.brand_name === brandFilter);
  if (searchFilter) {
    filtered = filtered.filter(p =>
      (p.model || '').toLowerCase().includes(searchFilter) ||
      (p.barcode || '').toLowerCase().includes(searchFilter) ||
      (p.brand_name || '').toLowerCase().includes(searchFilter)
    );
  }
  if (statusFilter === 'has_content') filtered = filtered.filter(p => contentMap[p.id]?.description);
  else if (statusFilter === 'edited') filtered = filtered.filter(p => contentMap[p.id]?.description?.status === 'edited');
  else if (statusFilter === 'no_content') filtered = filtered.filter(p => !contentMap[p.id]?.description);
  return filtered;
}

// ── Pagination ──
function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>→</button>
    <span class="page-info">עמוד ${currentPage} / ${pages}</span>
    <button onclick="goToPage(${currentPage + 1})" ${currentPage >= pages ? 'disabled' : ''}>←</button>`;
}

function goToPage(page) {
  const filtered = getFilteredProducts();
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  if (page < 1 || page > pages) return;
  currentPage = page;
  renderContentTable(filtered);
  renderPagination(filtered.length);
}

// ── Selection ──
function toggleContentRow(cb) {
  if (cb.checked) selectedContentIds.add(cb.value);
  else selectedContentIds.delete(cb.value);
}

function toggleSelectAllContent(cb) {
  const rows = document.querySelectorAll('.row-cb-content');
  selectedContentIds.clear();
  if (cb.checked) rows.forEach(r => { r.checked = true; selectedContentIds.add(r.value); });
  else rows.forEach(r => { r.checked = false; });
}

// ── Image preview ──
async function getSignedImageUrls(product) {
  if (!product.images || !product.images.length) return [];
  const urls = [];
  for (const img of product.images) {
    const storagePath = img.replace('/api/image/', '');
    try {
      const { data } = await sb.storage.from('frame-images').createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    } catch { /* skip failed images */ }
  }
  return urls;
}

async function openImagePreview(productId) {
  const product = contentProducts.find(p => p.id === productId);
  if (!product) return;
  const urls = await getSignedImageUrls(product);
  if (!urls.length) { toast('אין תמונות למוצר זה', 'w'); return; }
  showLightbox(urls[0]);
}

function showLightbox(url) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.onclick = () => overlay.remove();
  const img = document.createElement('img');
  img.src = url;
  img.onclick = (e) => e.stopPropagation();
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

async function loadEditImages(product) {
  const container = document.getElementById('edit-images');
  const grid = document.getElementById('edit-images-grid');
  grid.innerHTML = '';
  const urls = await getSignedImageUrls(product);
  if (!urls.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  for (const url of urls) {
    const img = document.createElement('img');
    img.className = 'edit-img-thumb';
    img.src = url;
    img.onclick = () => showLightbox(url);
    grid.appendChild(img);
  }
}

// ── Edit modal ──
function openEditModal(productId, focusField) {
  const product = contentProducts.find(p => p.id === productId);
  if (!product) return;
  editingProduct = product;

  const c = contentMap[productId] || {};
  document.getElementById('edit-title').textContent = `${product.brand_name} ${product.model || ''} (${product.barcode || ''})`;
  document.getElementById('edit-description').value = c.description?.content || '';
  document.getElementById('edit-seo-title').value = c.seo_title?.content || '';
  document.getElementById('edit-seo-desc').value = c.seo_description?.content || '';
  document.getElementById('edit-alt-text').value = c.alt_text?.content || '';

  updateCharCount('edit-seo-title', 60);
  updateCharCount('edit-seo-desc', 160);

  // Load product images into modal
  loadEditImages(product);

  const editModalEl = document.getElementById('edit-modal');
  // Force a visible gray backdrop so the title/text are readable (was transparent).
  editModalEl.style.background = 'rgba(0,0,0,0.5)';
  editModalEl.style.display = 'flex';

  // Focus the specific field if a content type was clicked
  const fieldMap = {
    description: 'edit-description',
    seo_title: 'edit-seo-title',
    seo_description: 'edit-seo-desc',
    alt_text: 'edit-alt-text'
  };
  if (focusField && fieldMap[focusField]) {
    const el = document.getElementById(fieldMap[focusField]);
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
  }
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingProduct = null;
}

function updateCharCount(fieldId, limit) {
  const field = document.getElementById(fieldId);
  const countEl = document.getElementById(fieldId + '-count');
  if (!field || !countEl) return;
  const len = field.value.length;
  if (limit) {
    countEl.textContent = `${len}/${limit}`;
    countEl.classList.toggle('warn', len > limit);
  }
}

async function saveContentEdit() {
  if (!editingProduct) return;
  const tid = getTenantId();
  const pid = editingProduct.id;
  const brandId = editingProduct.brand_id;

  const fields = {
    description: document.getElementById('edit-description').value.trim(),
    seo_title: document.getElementById('edit-seo-title').value.trim(),
    seo_description: document.getElementById('edit-seo-desc').value.trim(),
    alt_text: document.getElementById('edit-alt-text').value.trim()
  };

  showLoading('שומר...');
  try {
    for (const [ct, newVal] of Object.entries(fields)) {
      if (!newVal) continue;
      const existing = contentMap[pid]?.[ct];
      const originalContent = existing?.content || '';

      // Upsert content
      const { error } = await sb.from('ai_content').upsert({
        tenant_id: tid,
        entity_type: 'product',
        entity_id: pid,
        content_type: ct,
        content: newVal,
        language: 'he',
        status: existing ? 'edited' : 'auto',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,entity_type,entity_id,content_type,language' });

      if (error) throw error;

      // Save correction for learning (if content changed and had original)
      if (existing && originalContent !== newVal) {
        await sb.from('ai_content_corrections').insert({
          tenant_id: tid,
          ai_content_id: existing.id,
          original_content: originalContent,
          corrected_content: newVal,
          brand_id: brandId
        });
      }
    }

    // Refresh content map for this product
    await loadAIContent(tid);
    toast('התוכן נשמר בהצלחה', 's');
    closeEditModal();
    renderContentTable(getFilteredProducts());
  } catch (e) {
    console.error('saveContentEdit error:', e);
    toast('שגיאה בשמירה', 'e');
  } finally {
    hideLoading();
  }
}

// ── Regenerate for single product ──
async function regenerateForProduct() {
  if (!editingProduct) return;
  showLoading('מייצר תוכן AI...');
  try {
    const result = await generateContentForProduct(editingProduct);
    if (result) {
      await loadAIContent(getTenantId());
      openEditModal(editingProduct.id); // refresh modal
      toast('תוכן AI יוצר בהצלחה', 's');
    }
  } catch (e) {
    console.error('regenerateForProduct error:', e);
    toast('שגיאה בייצור תוכן', 'e');
  } finally {
    hideLoading();
  }
}

// ── Generate content for one product ──
async function generateContentForProduct(product) {
  const tid = getTenantId();

  // Get corrections for brand learning
  let brandCorrections = [];
  if (product.brand_id) {
    const { data } = await sb.from('ai_content_corrections')
      .select('original_content, corrected_content')
      .eq('tenant_id', tid)
      .eq('brand_id', product.brand_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5);
    brandCorrections = (data || []).map(c => ({
      original: c.original_content,
      corrected: c.corrected_content
    }));
  }

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tid,
      product_id: product.id,
      content_types: ['description', 'seo_title', 'seo_description', 'alt_text'],
      product_data: {
        brand_name: product.brand_name,
        model: product.model || '',
        color: product.color || '',
        size: product.size || '',
        product_type: product.product_type || 'eyeglasses'
      },
      image_storage_path: product.image_path || null,
      brand_corrections: brandCorrections
    })
  });

  const data = await res.json();
  if (!data.success) {
    console.error('AI generate failed:', data.error);
    return null;
  }
  return data;
}

// ── Bulk generate: missing content ──
async function bulkGenerateMissing() {
  const missing = contentProducts.filter(p => !contentMap[p.id]?.description);
  if (!missing.length) { toast('לכל המוצרים כבר יש תוכן', 's'); return; }
  await runBulkGenerate(missing, 'ייצור תוכן למוצרים חסרים');
}

// ── Bulk generate: selected products ──
async function bulkRegenerateSelected() {
  const ids = Array.from(selectedContentIds);
  if (!ids.length) { toast('בחר מוצרים מהרשימה', 'w'); return; }
  const selected = contentProducts.filter(p => ids.includes(p.id));
  await runBulkGenerate(selected, 'ייצור מחדש למוצרים נבחרים');
}

async function runBulkGenerate(products, label) {
  bulkAbort = false;
  const total = products.length;
  let success = 0;
  let errors = 0;

  const container = document.getElementById('progress-container');
  container.classList.add('active');
  updateProgress(0, total, success, errors, '');

  const errorLog = [];

  for (let i = 0; i < total; i++) {
    if (bulkAbort) break;

    const p = products[i];
    const name = `${p.brand_name} ${p.model || ''} (${p.barcode || ''})`;
    updateProgress(i, total, success, errors, name);

    let result = null;
    let lastErr = null;

    // Try once, retry once after 5s on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await generateContentForProduct(p);
        if (result?.success) break;
        lastErr = result?.errors?.join(', ') || result?.error || 'Unknown error';
        result = null;
      } catch (e) {
        lastErr = e.message || 'Network error';
        result = null;
      }
      if (attempt === 0 && !bulkAbort) {
        console.warn(`Retry in 5s: ${p.barcode || p.id} — ${lastErr}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (result?.success) {
      success++;
    } else {
      errors++;
      const errMsg = `${p.barcode || p.id}: ${lastErr}`;
      errorLog.push(errMsg);
      console.error(`Bulk generate failed: ${errMsg}`);
    }

    // Rate limiting: 2 second delay between products
    if (i < total - 1 && !bulkAbort) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Log all errors to console for debugging
  if (errorLog.length) {
    console.error('Bulk generate error summary:', errorLog);
  }

  updateProgress(total, total, success, errors, '');
  document.getElementById('progress-current').textContent = bulkAbort ? '⏸ הופסק' : '✅ הושלם';
  document.getElementById('progress-stop').textContent = '✕ סגור';
  document.getElementById('progress-stop').onclick = () => {
    container.classList.remove('active');
    document.getElementById('progress-stop').textContent = '⏸ עצור';
    document.getElementById('progress-stop').onclick = stopBulkGenerate;
  };

  // Refresh content map
  await loadAIContent(getTenantId());
  renderContentTable(getFilteredProducts());
  toast(`${label}: ${success} הצלחות, ${errors} שגיאות`, success > 0 ? 's' : 'e');
}

function updateProgress(current, total, success, errors, productName) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-count').textContent = `${current}/${total} (${pct}%)`;
  document.getElementById('progress-success').textContent = success;
  document.getElementById('progress-errors').textContent = errors;
  document.getElementById('progress-current').textContent = productName ? `מוצר נוכחי: ${productName}` : '';
}

function stopBulkGenerate() {
  bulkAbort = true;
  toast('עוצר ייצור...', 'w');
}
