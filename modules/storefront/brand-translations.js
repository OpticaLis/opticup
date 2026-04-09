// ══════════════════════════════════════════════════════════════
// BRAND TRANSLATION — EXPORT / IMPORT
// Self-contained: only depends on shared globals available in
// both Studio (storefront-studio.html) and the legacy content
// page: sb, getTenantId, toast, showLoading, hideLoading, Modal.
// All markdown / parsing helpers are defined locally with _b
// prefix to avoid collisions and to work without
// storefront-translations.js being loaded.
// Stores translations in content_translations table (NOT ai_content).
// ══════════════════════════════════════════════════════════════

const BRAND_TRANS_FIELDS = ['seo_title', 'seo_description', 'brand_description_short', 'brand_description'];

let brandImportParsed = [];
let brandImportLang = 'en';

// ── Local helpers (no dependency on storefront-translations.js) ──

function _bEscapeMdCell(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function _bEscHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _bDownloadFiles(files) {
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

function _bSplitPipeLine(line) {
  const parts = line.split('|');
  if (parts.length > 0 && parts[0].trim() === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
  return parts.map(p => p.trim());
}

function _bParseMarkdownTable(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  let format = 'unknown';
  for (const line of lines) {
    if (line.includes('|') && line.split('|').length >= 4) { format = 'pipe'; break; }
    if (line.includes('\t') && line.split('\t').length >= 4) { format = 'tab'; break; }
  }
  if (format === 'unknown') return [];

  if (format === 'pipe') {
    const pipeLines = lines.filter(l => l.includes('|'));
    if (pipeLines.length < 2) return [];
    const header = _bSplitPipeLine(pipeLines[0]);
    if (header.length < 4) return [];
    const rows = [];
    for (let i = 1; i < pipeLines.length; i++) {
      const line = pipeLines[i];
      if (/^[\s|:\-]+$/.test(line)) continue;
      const cells = _bSplitPipeLine(line);
      if (cells.length < 4) continue;
      const row = {};
      header.forEach((h, idx) => { row[h] = (cells[idx] || '').replace(/\\?\|/g, '|').trim(); });
      rows.push(row);
    }
    return rows;
  }

  // tab
  const tabLines = lines.filter(l => l.includes('\t'));
  if (tabLines.length < 2) return [];
  const header = tabLines[0].split('\t').map(c => c.trim());
  if (header.length < 4) return [];
  const rows = [];
  for (let i = 1; i < tabLines.length; i++) {
    const cells = tabLines[i].split('\t').map(c => c.trim());
    if (cells.length < 4) continue;
    const row = {};
    header.forEach((h, idx) => { row[h] = (cells[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function _bFindColumn(row, ...candidates) {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return '';
}

async function loadBrandsForTranslation(tid) {
  const { data, error } = await sb
    .from('brands')
    .select('id, name, slug, seo_title, seo_description, brand_description_short, brand_description')
    .eq('tenant_id', tid)
    .eq('is_deleted', false)
    .order('name');
  if (error) throw error;
  return data || [];
}

async function loadExistingBrandTranslations(tid, lang) {
  const { data, error } = await sb
    .from('content_translations')
    .select('entity_id, field_name, value')
    .eq('tenant_id', tid)
    .eq('entity_type', 'brand')
    .eq('lang', lang)
    .in('status', ['approved', 'draft']);
  if (error) throw error;
  return data || [];
}

/**
 * Main export handler. Called from HTML button:
 *   exportBrandsForTranslation('en') / ('ru')
 * Generates: 1 prompt file + N data batch files (25 brands per batch).
 */
async function exportBrandsForTranslation(lang) {
  const tid = getTenantId();
  const langCode = lang.toUpperCase();
  const langLabel = lang === 'en' ? 'English' : 'Russian';

  try {
    showLoading(`מכין ייצוא מותגים ${langCode}...`);

    const brands = await loadBrandsForTranslation(tid);
    const existing = await loadExistingBrandTranslations(tid, lang);

    const existingMap = {};
    for (const e of existing) {
      existingMap[`${e.entity_id}|${e.field_name}`] = e.value;
    }

    let skippedEmpty = 0;
    let fullyTranslated = 0;
    const brandToRows = {};
    let totalRows = 0;

    for (const b of brands) {
      let hasAnyHebrew = false;
      let hasMissing = false;
      for (const f of BRAND_TRANS_FIELDS) {
        const he = b[f];
        if (!he || !String(he).trim()) continue;
        hasAnyHebrew = true;
        const key = `${b.id}|${f}`;
        if (!existingMap[key]) {
          hasMissing = true;
          (brandToRows[b.slug] = brandToRows[b.slug] || []).push({
            slug: b.slug,
            field: f,
            hebrew: String(he),
          });
          totalRows++;
        }
      }
      if (!hasAnyHebrew) { skippedEmpty++; continue; }
      if (!hasMissing) fullyTranslated++;
    }

    if (!totalRows) {
      hideLoading();
      toast(`כל המותגים מתורגמים ל-${langCode}`, 's');
      return;
    }

    // Prompt file
    const promptContent = buildBrandTranslationPrompt(lang, langLabel, langCode);

    // Batch by 25 brands
    const slugs = Object.keys(brandToRows);
    const BATCH = 25;
    const batches = [];
    for (let i = 0; i < slugs.length; i += BATCH) {
      const slice = slugs.slice(i, i + BATCH);
      const rows = [];
      for (const s of slice) rows.push(...brandToRows[s]);
      batches.push(rows);
    }

    const dataFiles = batches.map((batch, idx) => ({
      name: `BRANDS_${langCode}_BATCH_${String(idx + 1).padStart(2, '0')}.md`,
      content: buildBrandDataFile(batch, langCode, idx + 1, batches.length),
    }));

    const stamp = new Date().toISOString().slice(0, 10);
    const allFiles = [
      { name: `PROMPT_BRANDS_TRANSLATE_${langCode}_${stamp}.md`, content: promptContent },
      ...dataFiles,
    ];

    _bDownloadFiles(allFiles);
    hideLoading();

    alert(
      `ייצוא מותגים ל-${langCode} הושלם:\n` +
      `- ${slugs.length} מותגים לתרגום (${totalRows} שדות)\n` +
      `- ${skippedEmpty} מותגים דולגו (ללא תוכן עברי)\n` +
      `- ${batches.length} קבצי batch (${fullyTranslated} כבר מתורגמים)`
    );
  } catch (e) {
    hideLoading();
    console.error('exportBrandsForTranslation failed:', e);
    alert('שגיאה בייצוא מותגים: ' + e.message);
  }
}

function buildBrandTranslationPrompt(lang, langLabel, langCode) {
  const isEn = lang === 'en';
  const L = (en, ru) => (isEn ? en : ru);
  const md = [];

  md.push(`# Brand Translation Prompt — Hebrew → ${langLabel}`);
  md.push('');
  md.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('## Your role');
  md.push('');
  md.push(`You are a professional translator for a luxury optical retail chain (Prizma Optics, אופטיקה פריזמה). Translate brand page content from Hebrew to ${langLabel}.`);
  md.push('');
  md.push('## Glossary');
  md.push('');
  md.push(`| Hebrew | ${langLabel} |`);
  md.push('|--------|--------------|');
  md.push(`| משקפי שמש | ${L('sunglasses', 'солнцезащитные очки')} |`);
  md.push(`| משקפי ראייה | ${L('prescription glasses', 'очки для зрения')} |`);
  md.push(`| מסגרת | ${L('frame', 'оправа')} |`);
  md.push(`| עדשה | ${L('lens', 'линза')} |`);
  md.push(`| עדשות מגע | ${L('contact lenses', 'контактные линзы')} |`);
  md.push(`| אופטיקה פריזמה | Prizma Optics (NEVER translate) |`);
  md.push(`| קולקציה | ${L('collection', 'коллекция')} |`);
  md.push('');
  md.push('## Hard Rules');
  md.push('');
  md.push('1. NEVER translate brand names — Gucci stays Gucci, Dior stays Dior, etc.');
  md.push('2. Preserve ALL HTML tags exactly as they appear (`<p>`, `<strong>`, `<br>`, `<ul>`, `<li>`, etc.) — translate only the text content between tags.');
  md.push('3. Use short dash (-) only — NEVER use long dash (— or –).');
  md.push('4. Do NOT add content that doesn\'t exist in the Hebrew source.');
  md.push('5. Keep the same paragraph structure as the Hebrew.');
  md.push('');
  md.push('## Length Guidelines');
  md.push('');
  md.push('| Field | Target Length |');
  md.push('|-------|---------------|');
  md.push('| seo_title | 40–60 characters |');
  md.push('| seo_description | 130–160 characters |');
  md.push('| brand_description_short | max 200 characters |');
  md.push('| brand_description | same length as Hebrew source (±20%) |');
  md.push('');
  md.push('## Output Format');
  md.push('');
  md.push('Return ONLY a markdown table with these exact columns. Do NOT add explanations before or after.');
  md.push('Fill the `translation` column with your translation. Keep all other columns unchanged.');
  md.push('');
  md.push('| brand_slug | field | hebrew | translation |');
  md.push('|---|---|---|---|');
  return md.join('\n');
}

function buildBrandDataFile(batch, langCode, batchNum, totalBatches) {
  const md = [];
  md.push(`# Brands to Translate — ${langCode} — Batch ${batchNum}/${totalBatches}`);
  md.push('');
  md.push('Fill the empty `translation` column for each row. Return the complete table.');
  md.push('');
  md.push('| brand_slug | field | hebrew | translation |');
  md.push('|---|---|---|---|');
  for (const r of batch) {
    md.push(`| ${_bEscapeMdCell(r.slug)} | ${_bEscapeMdCell(r.field)} | ${_bEscapeMdCell(r.hebrew)} |  |`);
  }
  return md.join('\n');
}

// ══════════════════════════════════════════════════════════════
// BRAND TRANSLATION — IMPORT
// ══════════════════════════════════════════════════════════════

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

  const hebrewRegex = /[\u0590-\u05FF]/;
  const cyrillicRegex = /[\u0400-\u04FF]/;
  const validFields = new Set(BRAND_TRANS_FIELDS);

  const validated = [];
  let ok = 0, warn = 0, err = 0;

  for (const row of rows) {
    const slug = (_bFindColumn(row, 'brand_slug', 'slug') || '').trim();
    const field = (_bFindColumn(row, 'field') || '').trim();
    const translation = (_bFindColumn(row, 'translation') || '').trim();

    // Skip separator / empty rows
    if (!slug && !field && !translation) continue;
    if (slug.startsWith('---') || field.startsWith('---')) continue;

    const errors = [];
    const warnings = [];
    const brand = slugMap[slug];

    if (!brand) errors.push(`מותג ${slug} לא נמצא`);
    if (!validFields.has(field)) errors.push(`שדה לא חוקי: ${field}`);
    if (!translation) errors.push('תרגום ריק');

    if (translation && hebrewRegex.test(translation)) {
      errors.push('תו עברי בתרגום');
    }

    if (translation) {
      if (lang === 'en' && cyrillicRegex.test(translation)) {
        errors.push('קירילית בתרגום EN');
      }
      if (lang === 'ru' && !cyrillicRegex.test(translation)) {
        errors.push('אין קירילית בתרגום RU');
      }
    }

    if (field === 'seo_title' && translation.length > 70) {
      warnings.push(`seo_title ארוך (${translation.length} > 70)`);
    }
    if (field === 'seo_description' && translation.length > 200) {
      warnings.push(`seo_description ארוך (${translation.length} > 200)`);
    }
    if (field === 'brand_description_short' && translation.length > 300) {
      warnings.push(`brand_description_short ארוך (${translation.length} > 300)`);
    }

    if (field === 'brand_description' && translation && brand) {
      const hebrew = heBySlugField[`${slug}|${field}`] || '';
      const hebrewHasTags = /<[a-z]+/i.test(hebrew);
      const transHasTags = /<[a-z]+/i.test(translation);
      if (hebrewHasTags && !transHasTags) {
        warnings.push('HTML tags may be missing');
      }
    }

    let status;
    if (errors.length) { status = 'error'; err++; }
    else if (warnings.length) { status = 'warning'; warn++; }
    else { status = 'ok'; ok++; }

    validated.push({
      slug, field, translation,
      brandId: brand?.id || null,
      status, errors, warnings,
    });
  }

  brandImportParsed = validated;
  renderBrandImportPreview(validated, lang.toUpperCase(), ok, warn, err);
}

function renderBrandImportPreview(rows, langCode, okCount, warnCount, errCount) {
  const container = document.getElementById('brand-import-preview');
  let html = `<table class="data-table" style="font-size:12px;direction:ltr;text-align:left;">`;
  html += `<thead><tr><th>Status</th><th>brand_slug</th><th>field</th><th>${langCode} translation (preview)</th><th>Notes</th></tr></thead><tbody>`;

  for (const r of rows) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    const notes = [...r.errors, ...r.warnings].join('; ') || '-';
    const preview = (r.translation || '').substring(0, 80) + ((r.translation || '').length > 80 ? '...' : '');
    const rowColor = r.status === 'error' ? '#fee' : r.status === 'warning' ? '#ffc' : '';
    html += `<tr style="background:${rowColor}"><td>${icon}</td><td>${_bEscHtml(r.slug)}</td><td>${_bEscHtml(r.field)}</td><td style="direction:ltr">${_bEscHtml(preview)}</td><td>${_bEscHtml(notes)}</td></tr>`;
  }

  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-weight:bold;">✅ ${okCount} תקין &nbsp; ⚠️ ${warnCount} אזהרות &nbsp; ❌ ${errCount} שגיאות</div>`;

  container.innerHTML = html;
  container.style.display = 'block';

  const saveBtn = document.getElementById('brand-import-save-btn');
  if (errCount > 0) {
    saveBtn.style.display = 'none';
    showBrandImportStatus('תקן שגיאות לפני שמירה', 'error');
  } else {
    saveBtn.style.display = 'inline-block';
    showBrandImportStatus(`${okCount + warnCount} שורות מוכנות לשמירה`, 'success');
  }
}

async function saveBrandImport() {
  const lang = brandImportLang;
  const tid = getTenantId();

  const saveable = brandImportParsed.filter(r => r.status !== 'error' && r.brandId);
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
  let saved = 0, errors = 0;
  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH);
    const { error } = await sb
      .from('content_translations')
      .upsert(batch, {
        onConflict: 'tenant_id,entity_type,entity_id,field_name,lang',
      });
    if (error) {
      console.error('Brand import upsert error:', error);
      errors++;
    } else {
      saved += batch.length;
    }
  }

  hideLoading();

  const uniqueBrands = new Set(saveable.map(r => r.slug)).size;
  if (errors) {
    showBrandImportStatus(`נשמרו ${saved} שדות, ${errors} שגיאות upsert — בדוק console`, 'warning');
  } else {
    showBrandImportStatus(`✅ נשמרו ${saved} תרגומים ל-${uniqueBrands} מותגים`, 'success');
  }
  toast(`נשמרו ${saved} תרגומים ל-${uniqueBrands} מותגים`, 's');
  document.getElementById('brand-import-save-btn').style.display = 'none';
}
