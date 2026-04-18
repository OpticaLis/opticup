// HF1: AI translation API path removed — translate-content Edge Function retired.
// Manual export/import flow fully replaces it.

function escapeMdCell(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

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

async function exportForTranslation(targetLang) {
  const tid = getTenantId();
  const langLabel = targetLang === 'en' ? 'English' : 'Russian';
  const langCode = targetLang.toUpperCase();
  const TRANS_FIELDS = ['description', 'seo_title', 'seo_description', 'alt_text'];
  let exportProducts;
  let contaminationMap = {};
  if (_contaminationFilterActive) {
    exportProducts = getTransFilteredProducts().filter(p => {
      if (!contentMap[p.id]?.description) return false;
      const contaminated = _getContaminatedFields(p.id, targetLang);
      if (contaminated.length > 0) {
        contaminationMap[p.id] = new Set(contaminated.map(c => c.field));
        return true;
      }
      return false;
    });
  } else {
    exportProducts = getTransFilteredProducts().filter(p => {
      if (!contentMap[p.id]?.description) return false;
      const t = (transContentMap[p.id] || {})[targetLang] || {};
      return TRANS_FIELDS.some(f => !t[f]);
    });
  }
  if (!exportProducts.length) {
    toast(_contaminationFilterActive
      ? `אין מוצרים מזוהמים ב-${langCode}`
      : `אין מוצרים חסרי תרגום ל-${langCode}`, 's');
    return;
  }
  showLoading(`מכין קבצי ייצוא ל-${langCode}...`);
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
  const rows = exportProducts.map(p => {
    const dirty = contaminationMap[p.id];
    return {
      brand: p.brand_name || '',
      model: p.model || '',
      barcode: p.barcode || '',
      he_desc: (!dirty || dirty.has('description')) ? (contentMap[p.id]?.description?.content || '') : '',
      he_seo_title: (!dirty || dirty.has('seo_title')) ? (contentMap[p.id]?.seo_title?.content || '') : '',
      he_seo_desc: (!dirty || dirty.has('seo_description')) ? (contentMap[p.id]?.seo_description?.content || '') : '',
      he_alt: (!dirty || dirty.has('alt_text')) ? (contentMap[p.id]?.alt_text?.content || '') : '',
    };
  });
  const promptContent = buildManualTranslationPrompt(targetLang, langLabel, langCode, glossary, exampleProducts);
  const BATCH_SIZE = 25;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }
  const dataFiles = batches.map((batch, idx) => ({
    name: `PRODUCTS_${langCode}_BATCH_${String(idx + 1).padStart(2, '0')}.md`,
    content: buildDataFile(batch, langCode, idx + 1, batches.length, idx * BATCH_SIZE)
  }));
  const stamp = new Date().toISOString().slice(0, 10);
  const allFiles = [
    { name: `PROMPT_TRANSLATE_${langCode}_${stamp}.md`, content: promptContent },
    ...dataFiles
  ];
  downloadMultipleFiles(allFiles);
  hideLoading();
  const modeLabel = _contaminationFilterActive ? ' [🧹 מזוהמים]' : '';
  toast(`יוצאו ${allFiles.length} קבצים (${rows.length} מוצרים) ל-${langCode}${modeLabel}`, 's');
}

function buildManualTranslationPrompt(targetLang, langLabel, langCode, glossary, examples) {
  const storeName = getTenantConfig('name') || '';
  const storeNameEn = getTenantConfig('name_en') || '';
  const md = [];
  md.push(`# Translation Task — ${storeNameEn} Products → ${langLabel}`);
  md.push('');
  md.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('---');
  md.push('');
  md.push('## 🛑 ABSOLUTE OUTPUT RULES — READ TWICE 🛑');
  md.push('');
  md.push('Return ONLY a markdown table. Each cell contains ONLY the raw translated text. Nothing else.');
  md.push('');
  md.push('YOU MUST NOT include any of the following in any cell:');
  md.push('❌ Headings (#, ##, ###)');
  md.push('❌ Bold or italic markdown (**, __, *, _)');
  md.push('❌ Horizontal rules (---)');
  md.push('❌ "Alternative options" / "Alternatives" / "Other options"');
  md.push('❌ "Character count" / "(50 characters)" / "(45 chars)"');
  md.push('❌ "Recommendation" / "Recommended" / "Why this works"');
  md.push('❌ "Hebrew:" / "English:" / "Russian:" labels');
  md.push('❌ "Note:" / "Notes on translation" / "Translation:"');
  md.push('❌ Explanations of your choices');
  md.push('❌ Multiple options separated by "or"');
  md.push('');
  md.push('Each cell = one translation. That is the entire output of that cell.');
  md.push('');
  md.push('EXAMPLE OF BAD OUTPUT (DO NOT DO THIS):');
  md.push('| 1 | Fendi | fendi | seo_title | יפקשמ ידנפ | # SEO Title (50-60 chars)\\n\\n**Fendi FE40004U Sunglasses - Gold Green**\\n\\n*Character count: 45*\\n\\n## Alternative options:\\n- Fendi FE40004U Black\\n\\n**Recommendation:** Use the first |');
  md.push('');
  md.push('EXAMPLE OF GOOD OUTPUT (DO THIS):');
  md.push('| 1 | Fendi | fendi | seo_title | יפקשמ ידנפ | Fendi FE40004U Sunglasses - Gold Green |');
  md.push('');
  md.push('If you violate these rules, your output will be REJECTED by the import validator and the translation work will be wasted. Be strict.');
  md.push('');
  md.push('## Your Role');
  md.push('');
  md.push(`You are a professional marketing translator specializing in optical/eyewear products. You translate Hebrew product content into polished, natural ${langLabel}.`);
  md.push('');
  md.push('## Business Context');
  md.push('');
  md.push(`**${storeNameEn}** (${storeName}) — premium optical store in Ashkelon, Israel. Approximately 40 years in business. Authorized dealer for Zeiss, Leica, Rodenstock, Hoya, Essilor, and luxury eyewear brands (Cazal, Gucci, Ray-Ban, Tom Ford, Saint Laurent, etc.).`);
  md.push('');
  md.push('**Audience:** Israeli customers seeking quality eyewear. Use ₪ for prices (never USD/EUR). The audience reads the website in Israel.');
  md.push('');
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
  md.push('## Hard Rules');
  md.push('');
  md.push('1. **Never** use the word "plastic" — always use **"acetate"** for frame material.');
  md.push('2. **Vary openings** — never start two consecutive products with the same phrase (e.g., "The frame features…", "These glasses…").');
  md.push('3. Use a short hyphen **-** only — never em-dash (—) or en-dash (–).');
  md.push('4. **Brand names, model codes, barcodes** — keep verbatim. Never translate or modify them.');
  md.push('5. Numbers, sizes, prices, and measurements — keep factually identical to the Hebrew source.');
  md.push('6. **Description:** 2-3 sentences. Marketing tone, informative, not salesy.');
  md.push('7. **SEO Title:** 40-55 characters. Format: `[Brand] [Model] - [type keyword]`. Must be unique per product.');
  md.push(`8. **SEO Description:** 130-150 characters. Informative summary with brand + model + key feature. End with " - ${storeNameEn}, Ashkelon" or equivalent.`);
  md.push('9. **Alt Text:** Concise image description, max 100 characters. Format: `[Brand] [Model] [product type] [key visual feature]`. Never start with "Image of" or "Photo of".');
  md.push('10. No emojis. No CTAs like "shop now" or "click here".');
  md.push('11. If the Hebrew text appears cut off mid-sentence, complete the thought naturally in the translation.');
  md.push('12. Return your output as a **markdown table** (pipe-delimited). Do NOT return Excel, CSV, JSON, or any other format.');
  md.push('13. **Barcodes must be returned exactly as provided** — preserve leading zeros. Barcode `0001931` must stay `0001931`, not `1931`.');
  md.push('14. Do NOT wrap the output table in a code block (no ```). Just the raw markdown table.');
  md.push('');
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
