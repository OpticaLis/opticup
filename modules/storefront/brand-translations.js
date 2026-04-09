// ══════════════════════════════════════════════════════════════
// BRAND TRANSLATION — EXPORT / IMPORT
// Depends on globals from storefront-translations.js:
//   sb, getTenantId, toast, showLoading, hideLoading,
//   escapeMdCell, downloadMultipleFiles, parseMarkdownTable,
//   findColumn, escImport
// Stores translations in content_translations table (NOT ai_content).
// ══════════════════════════════════════════════════════════════

const BRAND_TRANS_FIELDS = ['seo_title', 'seo_description', 'brand_description_short', 'brand_description'];

let brandImportParsed = [];
let brandImportLang = 'en';

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

    downloadMultipleFiles(allFiles);
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
    md.push(`| ${escapeMdCell(r.slug)} | ${escapeMdCell(r.field)} | ${escapeMdCell(r.hebrew)} |  |`);
  }
  return md.join('\n');
}
