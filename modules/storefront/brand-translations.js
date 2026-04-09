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
  // Handle escaped pipes (\|) inside cell content: swap for a sentinel
  // before splitting, then restore. The previous post-split replace was
  // a no-op because the raw '|' in '\|' had already been split on.
  const SENTINEL = '\u0001';
  const safe = line.replace(/\\\|/g, SENTINEL);
  const parts = safe.split('|');
  if (parts.length > 0 && parts[0].trim() === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
  return parts.map(p => p.split(SENTINEL).join('|').trim());
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

// Module-scoped state for the export selection modal flow.
let _brandExportCtx = null;

/**
 * Step 1 of export: open the selection modal listing brands that
 * need translation in the target language. User picks which brands
 * to include, then confirmBrandExport() actually generates the files.
 */
async function exportBrandsForTranslation(lang) {
  const tid = getTenantId();
  const langCode = lang.toUpperCase();

  try {
    showLoading(`טוען מותגים ל-${langCode}...`);

    const brands = await loadBrandsForTranslation(tid);
    const existing = await loadExistingBrandTranslations(tid, lang);

    const existingMap = {};
    for (const e of existing) {
      existingMap[`${e.entity_id}|${e.field_name}`] = e.value;
    }

    // Build per-brand snapshot of missing fields
    let skippedEmpty = 0;
    const candidates = [];
    for (const b of brands) {
      const missing = [];
      let hasAnyHebrew = false;
      for (const f of BRAND_TRANS_FIELDS) {
        const he = b[f];
        if (!he || !String(he).trim()) continue;
        hasAnyHebrew = true;
        if (!existingMap[`${b.id}|${f}`]) missing.push(f);
      }
      if (!hasAnyHebrew) { skippedEmpty++; continue; }
      if (missing.length) {
        candidates.push({ id: b.id, slug: b.slug, name: b.name, missing });
      }
    }
    candidates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    hideLoading();

    if (!candidates.length) {
      toast(`כל המותגים מתורגמים ל-${langCode}`, 's');
      return;
    }

    // Stash for confirmBrandExport()
    _brandExportCtx = { lang, langCode, brands, candidates, skippedEmpty };

    openBrandExportModal();
  } catch (e) {
    hideLoading();
    console.error('exportBrandsForTranslation failed:', e);
    toast('שגיאה בטעינת מותגים: ' + e.message, 'e');
  }
}

function openBrandExportModal() {
  const ctx = _brandExportCtx;
  if (!ctx) return;
  const { langCode, candidates, skippedEmpty } = ctx;

  const rowsHtml = candidates.map(c => `
    <label style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-bottom:1px solid #f3f4f6;cursor:pointer">
      <input type="checkbox" class="brand-export-cb" data-slug="${_bEscHtml(c.slug)}" checked onchange="updateBrandExportCount()" style="width:16px;height:16px;cursor:pointer">
      <span style="flex:1;font-weight:600">${_bEscHtml(c.name || c.slug)}</span>
      <span style="font-size:.75rem;color:#6b7280">${c.missing.length}/4 שדות חסרים</span>
    </label>
  `).join('');

  const body = `
    <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button type="button" class="btn btn-sm" onclick="toggleBrandExportAll(true)" style="padding:4px 10px;font-size:.75rem">בחר הכל</button>
      <button type="button" class="btn btn-sm" onclick="toggleBrandExportAll(false)" style="padding:4px 10px;font-size:.75rem">נקה הכל</button>
      <span style="font-size:.85rem;color:#6b7280">דולגו (ללא תוכן עברי): ${skippedEmpty}</span>
    </div>
    <div id="brand-export-count" style="font-weight:700;margin-bottom:8px">נבחרו: ${candidates.length} / ${candidates.length} מותגים</div>
    <div style="max-height:50vh;overflow-y:auto;border:1px solid #e5e5e5;border-radius:8px;padding:4px">
      ${rowsHtml}
    </div>
  `;

  const footer = `
    <button class="btn btn-sm" id="brand-export-go" onclick="confirmBrandExport()" style="background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;padding:6px 14px">📤 ייצא</button>
    <button class="btn btn-ghost btn-sm" onclick="Modal.close()" style="margin-inline-start:8px">ביטול</button>
  `;

  Modal.show({
    title: `בחר מותגים לייצוא — ${langCode}`,
    size: 'lg',
    content: body,
    footer: footer,
  });
}

function toggleBrandExportAll(checked) {
  document.querySelectorAll('.brand-export-cb').forEach(cb => { cb.checked = checked; });
  updateBrandExportCount();
}

function updateBrandExportCount() {
  const all = document.querySelectorAll('.brand-export-cb');
  const checked = document.querySelectorAll('.brand-export-cb:checked');
  const el = document.getElementById('brand-export-count');
  if (el) el.textContent = `נבחרו: ${checked.length} / ${all.length} מותגים`;
  const btn = document.getElementById('brand-export-go');
  if (btn) btn.disabled = checked.length === 0;
}

async function confirmBrandExport() {
  const ctx = _brandExportCtx;
  if (!ctx) return;
  const selected = new Set(
    Array.from(document.querySelectorAll('.brand-export-cb:checked'))
      .map(cb => cb.getAttribute('data-slug'))
  );
  if (!selected.size) { toast('לא נבחרו מותגים', 'w'); return; }

  Modal.close();
  await _runBrandExport(ctx, selected);
}

/**
 * Step 2 of export: actually generate prompt + batch files for the
 * selected brands and trigger downloads.
 */
async function _runBrandExport(ctx, selectedSlugs) {
  const { lang, langCode, brands, candidates } = ctx;
  const langLabel = lang === 'en' ? 'English' : 'Russian';
  const tid = getTenantId();

  try {
    showLoading(`מכין ייצוא מותגים ${langCode}...`);

    // Build flat row list (one row per brand × missing field)
    const slugToBrand = {};
    for (const b of brands) slugToBrand[b.slug] = b;

    const orderedBrands = candidates.filter(c => selectedSlugs.has(c.slug));
    const allRows = [];
    for (const c of orderedBrands) {
      const b = slugToBrand[c.slug];
      if (!b) continue;
      for (const f of BRAND_TRANS_FIELDS) {
        if (!c.missing.includes(f)) continue;
        const he = b[f];
        if (!he || !String(he).trim()) continue;
        allRows.push({
          brandName: b.name || b.slug,
          slug: b.slug,
          field: f,
          hebrew: String(he),
        });
      }
    }

    if (!allRows.length) {
      hideLoading();
      toast('אין שדות לייצוא', 'w');
      return;
    }

    // Glossary — same source as product export
    let glossary = [];
    try {
      const { data } = await sb.from('translation_glossary')
        .select('term_he, term_translated')
        .eq('tenant_id', tid)
        .eq('lang', lang)
        .eq('is_deleted', false)
        .order('context');
      glossary = data || [];
    } catch (e) { console.warn('glossary fetch failed:', e); }

    // Real example brands (up to 2) from approved content_translations
    const exampleBrands = await loadExampleBrands(tid, lang, brands);

    // Prompt file
    const promptContent = buildBrandPrompt(lang, langLabel, langCode, glossary, exampleBrands);

    // Batch by 5 brands per file (continuous # numbering across batches)
    const BRANDS_PER_BATCH = 5;
    const batches = [];
    for (let i = 0; i < orderedBrands.length; i += BRANDS_PER_BATCH) {
      const slice = orderedBrands.slice(i, i + BRANDS_PER_BATCH);
      const sliceSlugs = new Set(slice.map(c => c.slug));
      const batchRows = allRows.filter(r => sliceSlugs.has(r.slug));
      batches.push(batchRows);
    }

    let runningOffset = 0;
    const dataFiles = batches.map((batch, idx) => {
      const file = {
        name: `BRANDS_${langCode}_BATCH_${String(idx + 1).padStart(2, '0')}.md`,
        content: buildBrandDataFile(batch, langCode, idx + 1, batches.length, runningOffset),
      };
      runningOffset += batch.length;
      return file;
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const allFiles = [
      { name: `PROMPT_BRANDS_TRANSLATE_${langCode}_${stamp}.md`, content: promptContent },
      ...dataFiles,
    ];

    _bDownloadFiles(allFiles);
    hideLoading();

    toast(
      `יוצאו ${allFiles.length} קבצים — ${orderedBrands.length} מותגים, ${allRows.length} שדות (${batches.length} batches)`,
      's'
    );
  } catch (e) {
    hideLoading();
    console.error('_runBrandExport failed:', e);
    toast('שגיאה בייצוא: ' + e.message, 'e');
  }
}

/**
 * Load up to 2 brands that have full approved translations in `lang`,
 * for use as worked examples in the prompt file.
 * Returns: [{ brand: <row from brands>, trans: { field_name: value } }, ...]
 */
async function loadExampleBrands(tid, lang, brands) {
  try {
    const { data } = await sb
      .from('content_translations')
      .select('entity_id, field_name, value')
      .eq('tenant_id', tid)
      .eq('entity_type', 'brand')
      .eq('lang', lang)
      .eq('status', 'approved');
    if (!data || !data.length) return [];

    const byBrand = {};
    for (const r of data) {
      (byBrand[r.entity_id] = byBrand[r.entity_id] || {})[r.field_name] = r.value;
    }
    const brandById = {};
    for (const b of brands) brandById[b.id] = b;

    const out = [];
    for (const [bid, trans] of Object.entries(byBrand)) {
      if (out.length >= 2) break;
      const b = brandById[bid];
      if (!b) continue;
      const allFour = BRAND_TRANS_FIELDS.every(f => trans[f] && b[f]);
      if (!allFour) continue;
      out.push({ brand: b, trans });
    }
    return out;
  } catch (e) {
    console.warn('loadExampleBrands failed:', e);
    return [];
  }
}

/**
 * High-quality prompt — mirrors product buildTranslationPrompt() structure.
 */
function buildBrandPrompt(lang, langLabel, langCode, glossaryRows, exampleBrands) {
  const isEn = lang === 'en';
  const md = [];

  md.push(`# Translation Task — Prizma Optic Brand Pages → ${langLabel}`);
  md.push('');
  md.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('---');
  md.push('');

  // Role
  md.push('## Your Role');
  md.push('');
  md.push(`You are a professional marketing translator specializing in luxury eyewear brands. You translate Hebrew brand page content into polished, natural ${langLabel}.`);
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
  if (isEn) {
    md.push('- American English. Active voice. Short, punchy sentences.');
    md.push('- Professional, warm, luxurious — like a trusted family store, not a discount chain.');
    md.push('- Write as if the text was originally authored in English (no "translationese").');
    md.push('- Never capitalize common nouns mid-sentence (titanium, acetate, metal, elegant, classic — lowercase unless starting a sentence).');
    md.push('- "ייעוץ מקצועי" = "professional consultation" (not "fitting", not "advice").');
    md.push('- Every seo_description must end with " - Prizma Optic, Ashkelon".');
    md.push('- Vary sentence structure — do not start consecutive sentences the same way.');
  } else {
    md.push('- Formal "вы" form throughout. Natural Russian word order (no Hebrew syntax calques).');
    md.push('- Professional, warm, luxurious — like a trusted family store, not a discount chain.');
    md.push('- Write as if the text was originally authored in Russian (no "translationese").');
    md.push('- Не используйте заглавные буквы в середине предложения для обычных существительных.');
    md.push('- "ייעוץ מקצועי" = "профессиональная консультация".');
    md.push('- Каждое seo_description должно заканчиваться " - Prizma Optic, Ашкелон".');
    md.push('- Варьируйте структуру предложений.');
  }
  md.push('');

  // Field descriptions
  md.push('## What You Are Translating');
  md.push('');
  md.push('Each brand has up to 4 text fields that appear on the brand\'s page:');
  md.push('');
  md.push('| Field | Where It Appears | Guidelines |');
  md.push('|---|---|---|');
  md.push('| `seo_title` | Browser tab, Google search result title | 40-60 characters. Must contain brand name + keyword (e.g., "sunglasses", "eyeglasses", "eyewear"). |');
  md.push('| `seo_description` | Google search result snippet | Strictly 130-160 characters TOTAL (including the mandatory ending). Must end with " - Prizma Optic, Ashkelon". Count your characters — Google cuts off at ~160. Write a SHORT summary: brand name + one key feature + ending. |');
  md.push('| `brand_description_short` | Tagline under brand name on the brand page hero section | Max 200 characters. One punchy line — brand essence. |');
  md.push('| `brand_description` | Main body text on the brand page (below hero, next to gallery) | Preserve paragraph structure and length (±20% of Hebrew). Contains HTML tags — see Rule #2. |');
  md.push('');

  // Hard rules
  md.push('## Hard Rules');
  md.push('');
  md.push('1. **Brand names** — keep verbatim. NEVER translate brand names (Gucci stays Gucci, Dior stays Dior, Cazal stays Cazal).');
  md.push('2. **Capitalization** — only capitalize proper nouns (brand names, place names) and sentence beginnings. Common nouns like titanium, acetate, metal, elegant, classic, rimless stay lowercase mid-sentence. WRONG: "Ultra-lightweight Italian Titanium frames with Elegant matte finish". CORRECT: "Ultra-lightweight Italian titanium frames with elegant matte finish".');
  md.push('3. **Preserve ALL HTML tags** exactly as they appear (`<p>`, `</p>`, `<strong>`, `</strong>`, `<br>`, `<ul>`, `<li>`, etc.). Translate ONLY the text content between tags. If the Hebrew has `<p>גוצ\'י הוא מותג יוקרה</p>`, return `<p>Gucci is a luxury brand</p>`.');
  md.push('4. Use a short hyphen **-** only — never em-dash (—) or en-dash (–).');
  md.push('5. Numbers, prices (₪), measurements — keep factually identical to the Hebrew source.');
  md.push('6. **Do NOT add content** that doesn\'t exist in the Hebrew source.');
  md.push('7. If the Hebrew text appears cut off mid-sentence, complete the thought naturally.');
  md.push('8. No emojis. No CTAs like "shop now" or "click here".');
  md.push('9. Return your output as a **markdown table** (pipe-delimited). Do NOT return Excel, CSV, JSON, or any other format.');
  md.push('10. Do NOT wrap the output table in a code block (no ```). Just the raw markdown table.');
  md.push('11. **Slugs must be returned exactly as provided** — they are URL identifiers, not text to translate.');
  md.push('12. **Empty HTML paragraphs** — when the Hebrew `brand_description` contains empty spacer paragraphs like `<p> </p>` or `<p>&nbsp;</p>`, REMOVE them in the translation. Use only meaningful `<p>...</p>` blocks with actual content.');
  md.push('13. **seo_description length is strict** — MUST be 130-160 characters total. This includes the ending " - Prizma Optic, Ashkelon" (25 characters). So your actual content is only ~105-135 characters before the ending. If your draft exceeds 160 characters — shorten it. This is a strict limit, not a suggestion.');
  md.push('14. **seo_description format** — `[Brand name] [eyewear type] at Prizma Optic Ashkelon. [One key selling point] - Prizma Optic, Ashkelon`. Keep it to TWO sentences maximum before the ending.');
  md.push('');

  // Glossary
  md.push('## Glossary — Use These Exact Translations');
  md.push('');
  md.push(`| Hebrew | ${langLabel} |`);
  md.push('|---|---|');
  if (glossaryRows && glossaryRows.length) {
    for (const g of glossaryRows) {
      md.push(`| ${_bEscapeMdCell(g.term_he)} | ${_bEscapeMdCell(g.term_translated)} |`);
    }
  } else {
    const L = (en, ru) => (isEn ? en : ru);
    md.push(`| משקפי שמש | ${L('sunglasses', 'солнцезащитные очки')} |`);
    md.push(`| משקפי ראייה | ${L('prescription glasses', 'очки для зрения')} |`);
    md.push(`| מסגרת | ${L('frame', 'оправа')} |`);
    md.push(`| עדשה | ${L('lens', 'линза')} |`);
    md.push(`| עדשות מגע | ${L('contact lenses', 'контактные линзы')} |`);
    md.push(`| קולקציה | ${L('collection', 'коллекция')} |`);
    md.push(`| מותג יוקרה | ${L('luxury brand', 'люксовый бренд')} |`);
    md.push(`| ייעוץ מקצועי | ${L('professional consultation', 'профессиональная консультация')} |`);
    md.push(`| התאמה אישית | ${L('custom fitting', 'индивидуальный подбор')} |`);
    md.push(`| שירות מקצועי | ${L('professional service', 'профессиональное обслуживание')} |`);
    md.push('| אופטיקה פריזמה | Prizma Optics (NEVER translate the store name) |');
    md.push('| אשקלון | Ashkelon (NEVER translate the city name) |');
  }
  md.push('');

  // Task format
  md.push('## Task Format');
  md.push('');
  md.push('I will send you a markdown table with **6 columns:**');
  md.push('');
  md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
  md.push('|---|---|---|---|---|---|');
  md.push('');
  md.push('**Field values:** `seo_title`, `seo_description`, `brand_description_short`, `brand_description`');
  md.push('');
  md.push('You must return the **same table** with the `Translation` column filled in:');
  md.push('');
  md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
  md.push('|---|---|---|---|---|---|');
  md.push('');
  md.push('**Rules:**');
  md.push('- Return ALL rows. Do not skip any.');
  md.push('- Keep #, Brand, Slug, Field, Hebrew columns identical to the input.');
  md.push('- Fill the Translation column for every row.');
  md.push('- Return ONLY the markdown table — no explanations, no commentary before or after.');
  md.push('- Do NOT wrap the table in a code block.');
  md.push('');

  // Examples
  md.push('## Example');
  md.push('');
  if (exampleBrands && exampleBrands.length) {
    md.push('**Input:**');
    md.push('');
    md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
    md.push('|---|---|---|---|---|---|');
    let n = 1;
    for (const ex of exampleBrands) {
      for (const f of BRAND_TRANS_FIELDS) {
        md.push(`| ${n++} | ${_bEscapeMdCell(ex.brand.name)} | ${_bEscapeMdCell(ex.brand.slug)} | ${f} | ${_bEscapeMdCell(ex.brand[f])} |  |`);
      }
    }
    md.push('');
    md.push('**Expected output:**');
    md.push('');
    md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
    md.push('|---|---|---|---|---|---|');
    n = 1;
    for (const ex of exampleBrands) {
      for (const f of BRAND_TRANS_FIELDS) {
        md.push(`| ${n++} | ${_bEscapeMdCell(ex.brand.name)} | ${_bEscapeMdCell(ex.brand.slug)} | ${f} | ${_bEscapeMdCell(ex.brand[f])} | ${_bEscapeMdCell(ex.trans[f])} |`);
      }
    }
  } else {
    // Realistic placeholder example (Gucci-style)
    md.push('**Input:**');
    md.push('');
    md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
    md.push('|---|---|---|---|---|---|');
    md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י - קולקציה מלאה |  |');
    md.push('| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ\'י באופטיקה פריזמה אשקלון |  |');
    md.push('| 3 | Gucci | gucci | brand_description_short | מותג יוקרה איטלקי בעולם משקפי השמש |  |');
    md.push('| 4 | Gucci | gucci | brand_description | <p>גוצ\'י הוא מותג יוקרה איטלקי...</p> |  |');
    md.push('');
    md.push('**Expected output:**');
    md.push('');
    md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
    md.push('|---|---|---|---|---|---|');
    if (isEn) {
      md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י - קולקציה מלאה | Gucci Eyewear - Full Collection |');
      md.push('| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ\'י באופטיקה פריזמה אשקלון | Gucci eyewear at Prizma Optic Ashkelon. Italian luxury sunglasses and prescription frames, full collection in stock - Prizma Optic, Ashkelon |');
      md.push('| 3 | Gucci | gucci | brand_description_short | מותג יוקרה איטלקי בעולם משקפי השמש | Italian luxury icon in the world of sunglasses |');
      md.push('| 4 | Gucci | gucci | brand_description | <p>גוצ\'י הוא מותג יוקרה איטלקי...</p> | <p>Gucci is an Italian luxury brand...</p> |');
    } else {
      md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י - קולקציה מלאה | Очки Gucci - полная коллекция |');
      md.push('| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ\'י באופטיקה פריזמה אשקלון | Очки Gucci в Prizma Optic Ашкелон. Итальянский люксовый бренд - полная коллекция солнцезащитных и оптических очков - Prizma Optic, Ашкелон |');
      md.push('| 3 | Gucci | gucci | brand_description_short | מותג יוקרה איטלקי בעולם משקפי השמש | Итальянский люксовый бренд в мире солнцезащитных очков |');
      md.push('| 4 | Gucci | gucci | brand_description | <p>גוצ\'י הוא מותג יוקרה איטלקי...</p> | <p>Gucci - итальянский люксовый бренд...</p> |');
    }
    md.push('');
    md.push('> Note on row 2 (`seo_description`): the example above is **140 characters** for EN and **138 characters** for RU — both inside the strict 130-160 limit. Always count your characters before submitting.');
  }
  md.push('');

  // Handshake
  md.push('---');
  md.push('');
  md.push('## Ready?');
  md.push('');
  md.push('Read all instructions above carefully.');
  md.push('When you fully understand the task, reply with exactly:');
  md.push('');
  md.push(`**"Ready - send the ${langLabel} brand table."**`);
  md.push('');
  md.push('I will then send you the brands to translate in the next message.');

  return md.join('\n');
}

/**
 * Build a single batch data file with continuous # numbering.
 * 6 columns: # | Brand | Slug | Field | Hebrew | Translation
 */
function buildBrandDataFile(rows, langCode, batchNum, totalBatches, offset) {
  const md = [];
  md.push(`# Brands to Translate — ${langCode} — Batch ${batchNum}/${totalBatches}`);
  md.push('');
  md.push('Translate the empty Translation column for each row. Return the complete table with all rows.');
  md.push('');
  md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
  md.push('|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const num = offset + i + 1;
    md.push(`| ${num} | ${_bEscapeMdCell(r.brandName)} | ${_bEscapeMdCell(r.slug)} | ${r.field} | ${_bEscapeMdCell(r.hebrew)} |  |`);
  });
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

// Validation context shared between initial validate and per-row revalidate.
let _brandValidationCtx = null;

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

function _brandRowIcon(status) {
  return status === 'ok' ? '✅' : status === 'warning' ? '⚠️' : '❌';
}
function _brandRowBg(status) {
  return status === 'error' ? '#fee' : status === 'warning' ? '#ffc' : '';
}

// Inline edit handler — keep brandImportParsed in sync with the textarea.
function _brandRowEdit(idx, value) {
  const row = brandImportParsed[idx];
  if (!row) return;
  row.translation = value;
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
  } else {
    showBrandImportStatus(`✅ נשמרו ${saved} תרגומים ל-${uniqueBrands} מותגים`, 'success');
    toast(`נשמרו ${saved} תרגומים. ${skipped} שורות דולגו (שגיאות).`, 's');
  }
  const saveBtn = document.getElementById('brand-import-save-btn');
  if (saveBtn) saveBtn.style.display = 'none';
}
