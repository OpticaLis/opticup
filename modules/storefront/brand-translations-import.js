// Brand Translation — Import Flow
// Import modal UI, validation, preview rendering, persistence
// Loads AFTER: brand-translations.js

function openBrandImportModal() {
  brandImportParsed = [];
  const body = `
    <div style="margin-bottom:12px">
      <label><strong>שפה:</strong></label>
      <select id="brand-import-lang" style="margin-inline-start:8px;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px">
        <option value="en">English (EN)</option>
        <option value="ru">Russian (RU)</option>
      </select>
    </div>
    <div style="margin-bottom:12px">
      <label><strong>הדבק את טבלת תרגומי המותגים:</strong></label>
      <textarea id="brand-import-textarea" rows="12" style="width:100%;font-family:monospace;font-size:12px;direction:ltr;text-align:left;padding:10px;border:1px solid #e5e5e5;border-radius:8px" placeholder="| brand_slug | field | hebrew | translation |"></textarea>
    </div>
    <div id="brand-import-preview" style="display:none;margin-bottom:12px;max-height:300px;overflow-y:auto"></div>
    <div id="brand-import-status" style="display:none;margin-bottom:12px;padding:8px;border-radius:4px"></div>
  `;
  const footer = `
    <button class="btn btn-sm" onclick="validateBrandImport()" style="background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;padding:6px 14px">🔍 בדוק</button>
    <button class="btn btn-sm" id="brand-import-save-btn" onclick="saveBrandImport()" style="display:none;background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;padding:6px 14px;margin-inline-start:8px">💾 שמור</button>
    <button class="btn btn-ghost btn-sm" onclick="closeBrandImportModal()" style="margin-inline-start:8px">ביטול</button>
  `;
  Modal.show({
    title: '📥 ייבוא תרגומי מותגים',
    size: 'lg',
    content: body,
    footer: footer,
  });
}

function closeBrandImportModal() {
  brandImportParsed = [];
  if (typeof Modal !== 'undefined' && Modal.close) Modal.close();
}

function showBrandImportStatus(msg, type) {
  const el = document.getElementById('brand-import-status');
  el.style.display = 'block';
  el.style.background = type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#ffc';
  el.style.color = '#333';
  el.textContent = msg;
}

/**
 * Detect markdown wrapper contamination in a translated value.
 * Returns null if clean, or a string reason if contaminated.
 */
function _detectBrandWrapperContamination(value, fieldName) {
  if (!value || typeof value !== 'string') return null;

  const patterns = [
    { test: (s) => /^\s*#/.test(s), reason: 'starts with # heading' },
    { test: (s) => s.includes('## '), reason: "contains '## ' subheading" },
    { test: (s) => s.includes('**'), reason: "contains '**' bold markdown" },
    { test: (s) => s.includes('---'), reason: "contains '---' horizontal rule" },
    { test: (s) => /alternative/i.test(s), reason: "contains 'Alternative'" },
    { test: (s) => /character count/i.test(s), reason: "contains 'Character count'" },
    { test: (s) => s.includes('(40-55 characters)'), reason: "contains '(40-55 characters)'" },
    { test: (s) => s.includes('(50-60 characters)'), reason: "contains '(50-60 characters)'" },
    { test: (s) => s.includes('(130-160 characters)'), reason: "contains '(130-160 characters)'" },
    { test: (s) => s.includes('(150-160 characters)'), reason: "contains '(150-160 characters)'" },
    { test: (s) => /recommendation/i.test(s), reason: "contains 'Recommendation'" },
    { test: (s) => /why this works/i.test(s), reason: "contains 'Why this works'" },
    { test: (s) => s.includes('Hebrew:'), reason: "contains 'Hebrew:'" },
    { test: (s) => s.includes('Russian:'), reason: "contains 'Russian:'" },
    { test: (s) => s.includes('English:'), reason: "contains 'English:'" },
    { test: (s) => /notes on translation/i.test(s), reason: "contains 'Notes on translation'" },
    { test: (s) => /^Note:/m.test(s), reason: "contains 'Note:' at start of line" },
    { test: (s) => /^Translation:/m.test(s), reason: "contains 'Translation:' at start" },
    { test: (s) => /^Output:/m.test(s), reason: "contains 'Output:' at start" },
    { test: (s) => /translated text:/i.test(s), reason: "contains 'Translated text:'" },
  ];

  for (const p of patterns) {
    if (p.test(value)) return p.reason;
  }

  const lengthBounds = {
    brand_description_short: { min: 50, max: 250 },
    brand_description: { min: 300, max: 2000 },
    seo_title: { min: 20, max: 80 },
    seo_description: { min: 80, max: 200 },
  };

  const bounds = lengthBounds[fieldName];
  if (bounds) {
    if (value.length < bounds.min) return `too short (${value.length} < ${bounds.min} for ${fieldName})`;
    if (value.length > bounds.max) return `too long (${value.length} > ${bounds.max} for ${fieldName})`;
  }

  return null;
}

// Validation context shared between initial validate and per-row revalidate.
var _brandValidationCtx = null;

function _validateBrandRow(row, ctx) {
  const { lang, slugMap, heBySlugField } = ctx;
  const hebrewRegex = /[\u0590-\u05FF]/;
  const cyrillicRegex = /[\u0400-\u04FF]/;
  const validFields = new Set(BRAND_TRANS_FIELDS);

  const translation = (row.translation || '').trim();
  row.translation = translation;

  const brand = slugMap[row.slug];
  row.brandId = brand?.id || null;

  const errors = [];
  const warnings = [];

  if (!brand) errors.push(`מותג ${row.slug} לא נמצא`);
  if (!validFields.has(row.field)) errors.push(`שדה לא חוקי: ${row.field}`);
  if (!translation) errors.push('תרגום ריק');

  if (translation && hebrewRegex.test(translation)) {
    errors.push('תו עברי בתרגום');
  }
  if (translation) {
    if (lang === 'en' && cyrillicRegex.test(translation)) errors.push('קירילית בתרגום EN');
    if (lang === 'ru' && !cyrillicRegex.test(translation)) errors.push('אין קירילית בתרגום RU');
  }

  // Wrapper contamination detection
  if (translation) {
    const wrapperReason = _detectBrandWrapperContamination(translation, row.field);
    if (wrapperReason) errors.push(`${row.field}: ${wrapperReason}`);
  }

  if (row.field === 'seo_title' && translation.length > 70) {
    warnings.push(`seo_title ארוך (${translation.length} > 70)`);
  }
  if (row.field === 'seo_description' && translation.length > 200) {
    warnings.push(`seo_description ארוך (${translation.length} > 200)`);
  }
  if (row.field === 'brand_description_short' && translation.length > 300) {
    warnings.push(`brand_description_short ארוך (${translation.length} > 300)`);
  }

  if (row.field === 'brand_description' && translation && brand) {
    const hebrew = heBySlugField[`${row.slug}|${row.field}`] || '';
    const hebrewHasTags = /<[a-z]+/i.test(hebrew);
    const transHasTags = /<[a-z]+/i.test(translation);
    if (hebrewHasTags && !transHasTags) warnings.push('HTML tags may be missing');
  }

  row.errors = errors;
  row.warnings = warnings;
  if (errors.length) row.status = 'error';
  else if (warnings.length) row.status = 'warning';
  else row.status = 'ok';
  return row;
}

async function validateBrandImport() {
  const text = document.getElementById('brand-import-textarea').value;
  const lang = document.getElementById('brand-import-lang').value;
  brandImportLang = lang;

  if (!text.trim()) {
    showBrandImportStatus('הדבק טבלה קודם', 'error');
    return;
  }

  const rows = _bParseMarkdownTable(text);
  if (!rows.length) {
    showBrandImportStatus('לא נמצאה טבלה בטקסט שהודבק', 'error');
    return;
  }

  const tid = getTenantId();
  let brands;
  try {
    brands = await loadBrandsForTranslation(tid);
  } catch (e) {
    showBrandImportStatus('שגיאה בטעינת מותגים: ' + e.message, 'error');
    return;
  }
  const slugMap = {};
  for (const b of brands) slugMap[b.slug] = b;
  const heBySlugField = {};
  for (const b of brands) {
    for (const f of BRAND_TRANS_FIELDS) {
      heBySlugField[`${b.slug}|${f}`] = b[f] || '';
    }
  }

  _brandValidationCtx = { lang, slugMap, heBySlugField };

  const validated = [];
  for (const raw of rows) {
    const slug = (_bFindColumn(raw, 'brand_slug', 'slug') || '').trim();
    const field = (_bFindColumn(raw, 'field') || '').trim();
    const translation = (_bFindColumn(raw, 'translation') || '').trim();

    // Skip separator / empty rows
    if (!slug && !field && !translation) continue;
    if (slug.startsWith('---') || field.startsWith('---')) continue;

    const row = { slug, field, translation, brandId: null, status: 'ok', errors: [], warnings: [] };
    _validateBrandRow(row, _brandValidationCtx);
    validated.push(row);
  }

  brandImportParsed = validated;
  renderBrandImportPreview(lang.toUpperCase());
}

function renderBrandImportPreview(langCode) {
  const container = document.getElementById('brand-import-preview');
  const rows = brandImportParsed;

  let html = `<table class="data-table" style="font-size:12px;direction:ltr;text-align:left;width:100%">`;
  html += `<thead><tr><th style="width:32px">Status</th><th>brand_slug</th><th>field</th><th>${langCode} translation (ניתן לעריכה)</th><th>Notes</th></tr></thead><tbody>`;

  rows.forEach((r, idx) => {
    html += `<tr id="brand-tr-${idx}" style="background:${_brandRowBg(r.status)}">`;
    html += `<td id="brand-icon-${idx}" style="text-align:center;font-size:14px">${_brandRowIcon(r.status)}</td>`;
    html += `<td style="white-space:nowrap">${_bEscHtml(r.slug)}</td>`;
    html += `<td style="white-space:nowrap">${_bEscHtml(r.field)}</td>`;
    html += `<td style="min-width:280px">`;
    html += `<textarea data-row-idx="${idx}" rows="3" oninput="_brandRowEdit(${idx}, this.value)" onblur="_brandRowRevalidate(${idx})" style="width:100%;direction:ltr;text-align:left;font-family:inherit;font-size:12px;padding:6px;border:1px solid #d1d5db;border-radius:6px;resize:vertical">${_bEscHtml(r.translation || '')}</textarea>`;
    html += `</td>`;
    html += `<td id="brand-notes-${idx}" style="font-size:11px;color:#374151">${_bEscHtml([...r.errors, ...r.warnings].join('; ') || '-')}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  html += `<div id="brand-import-counts" style="margin-top:8px;font-weight:bold"></div>`;

  container.innerHTML = html;
  container.style.display = 'block';

  _updateBrandImportCounts();
}

// Re-run validation for a single edited row, then patch the UI in place.
function _brandRowRevalidate(idx) {
  const row = brandImportParsed[idx];
  if (!row || !_brandValidationCtx) return;

  // Pull the current textarea value (oninput may have been bypassed by paste/IME).
  const ta = document.querySelector(`textarea[data-row-idx="${idx}"]`);
  if (ta) row.translation = ta.value;

  _validateBrandRow(row, _brandValidationCtx);

  const iconEl = document.getElementById(`brand-icon-${idx}`);
  const notesEl = document.getElementById(`brand-notes-${idx}`);
  const trEl = document.getElementById(`brand-tr-${idx}`);
  if (iconEl) iconEl.textContent = _brandRowIcon(row.status);
  if (notesEl) notesEl.textContent = [...row.errors, ...row.warnings].join('; ') || '-';
  if (trEl) trEl.style.background = _brandRowBg(row.status);

  _updateBrandImportCounts();
}

function _updateBrandImportCounts() {
  let ok = 0, warn = 0, err = 0;
  for (const r of brandImportParsed) {
    if (r.status === 'ok') ok++;
    else if (r.status === 'warning') warn++;
    else err++;
  }
  const saveable = ok + warn;

  const counts = document.getElementById('brand-import-counts');
  if (counts) {
    counts.innerHTML = `✅ ${ok} תקין &nbsp; ⚠️ ${warn} אזהרות &nbsp; ❌ ${err} שגיאות`;
  }

  const saveBtn = document.getElementById('brand-import-save-btn');
  if (saveBtn) {
    if (saveable > 0) {
      saveBtn.style.display = 'inline-block';
      saveBtn.textContent = `💾 שמור ${saveable} תרגומים`;
    } else {
      saveBtn.style.display = 'none';
    }
  }

  if (err > 0 && saveable > 0) {
    showBrandImportStatus(`${saveable} שורות מוכנות לשמירה. ${err} שורות עם שגיאות ידלגו.`, 'warning');
  } else if (saveable > 0) {
    showBrandImportStatus(`${saveable} שורות מוכנות לשמירה`, 'success');
  } else {
    showBrandImportStatus('תקן שגיאות לפני שמירה', 'error');
  }
}

async function saveBrandImport() {
  const lang = brandImportLang;
  const tid = getTenantId();

  const saveable = brandImportParsed.filter(r => r.status !== 'error' && r.brandId);
  const skipped = brandImportParsed.length - saveable.length;
  if (!saveable.length) {
    showBrandImportStatus('אין שורות תקינות לשמירה', 'error');
    return;
  }

  showLoading(`שומר ${saveable.length} תרגומי מותגים...`);
  const nowIso = new Date().toISOString();

  const records = saveable.map(r => ({
    tenant_id: tid,
    entity_type: 'brand',
    entity_id: r.brandId,
    field_name: r.field,
    lang: lang,
    value: r.translation,
    status: 'approved',
    translated_by: 'human',
    updated_at: nowIso,
  }));

  const UPSERT_BATCH = 100;
  let saved = 0, upsertErrors = 0;
  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH);
    const { error } = await sb
      .from('content_translations')
      .upsert(batch, {
        onConflict: 'tenant_id,entity_type,entity_id,field_name,lang',
      });
    if (error) {
      console.error('Brand import upsert error:', error);
      upsertErrors++;
    } else {
      saved += batch.length;
    }
  }

  hideLoading();

  const uniqueBrands = new Set(saveable.map(r => r.slug)).size;
  if (upsertErrors) {
    showBrandImportStatus(`נשמרו ${saved} שדות, ${upsertErrors} שגיאות upsert — בדוק console`, 'warning');
    toast(`נשמרו ${saved} תרגומים. ${skipped} שורות דולגו (שגיאות).`, 'w');
  } e