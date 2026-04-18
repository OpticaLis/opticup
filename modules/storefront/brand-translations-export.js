// Brand Translation — Export Execution
// Export logic, prompt builder, data file builder
// Loads AFTER: brand-translations.js

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
 * High-quality prompt — mirrors product buildManualTranslationPrompt() structure.
 */
function buildBrandPrompt(lang, langLabel, langCode, glossaryRows, exampleBrands) {
  const isEn = lang === 'en';
  const storeName = getTenantConfig('name') || '';
  const storeNameEn = getTenantConfig('name_en') || '';
  const md = [];

  md.push(`# Translation Task — ${storeNameEn} Brand Pages → ${langLabel}`);
  md.push('');
  md.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('---');
  md.push('');

  // ABSOLUTE OUTPUT RULES — top of prompt
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
  md.push('Note: `brand_description` may contain HTML tags (<p>, <strong>, etc.) — that is fine. Do NOT use markdown formatting (**, ##, ---) instead of or in addition to HTML.');
  md.push('');
  md.push('EXAMPLE OF BAD OUTPUT (DO NOT DO THIS):');
  md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י | # SEO Title\\n\\n**Gucci Eyewear**\\n\\n*Character count: 25*\\n\\n## Alternatives:\\n- Gucci Sunglasses\\n\\n**Recommendation:** Use the first |');
  md.push('');
  md.push('EXAMPLE OF GOOD OUTPUT (DO THIS):');
  md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י | Gucci Eyewear - Full Collection |');
  md.push('');
  md.push('If you violate these rules, your output will be REJECTED by the import validator and the translation work will be wasted. Be strict.');
  md.push('');

  // Role
  md.push('## Your Role');
  md.push('');
  md.push(`You are a professional marketing translator specializing in luxury eyewear brands. You translate Hebrew brand page content into polished, natural ${langLabel}.`);
  md.push('');

  // Business context
  md.push('## Business Context');
  md.push('');
  md.push(`**${storeNameEn}** (${storeName}) — premium optical store in Ashkelon, Israel. Approximately 40 years in business. Authorized dealer for Zeiss, Leica, Rodenstock, Hoya, Essilor, and luxury eyewear brands (Cazal, Gucci, Ray-Ban, Tom Ford, Saint Laurent, etc.).`);
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
    md.push(`- Every seo_description must end with " - ${storeNameEn}, Ashkelon".`);
    md.push('- Vary sentence structure — do not start consecutive sentences the same way.');
  } else {
    md.push('- Formal "вы" form throughout. Natural Russian word order (no Hebrew syntax calques).');
    md.push('- Professional, warm, luxurious — like a trusted family store, not a discount chain.');
    md.push('- Write as if the text was originally authored in Russian (no "translationese").');
    md.push('- Не используйте заглавные буквы в середине предложения для обычных существительных.');
    md.push('- "ייעוץ מקצועי" = "профессиональная консультация".');
    md.push(`- Каждое seo_description должно заканчиваться " - ${storeNameEn}, Ашкелон".`);
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
  md.push(`| \`seo_description\` | Google search result snippet | Strictly 130-160 characters TOTAL (including the mandatory ending). Must end with " - ${storeNameEn}, Ashkelon". Count your characters — Google cuts off at ~160. Write a SHORT summary: brand name + one key feature + ending. |`);
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
  md.push(`13. **seo_description length is strict** — MUST be 130-160 characters total. This includes the ending " - ${storeNameEn}, Ashkelon" (~25 characters). So your actual content is only ~105-135 characters before the ending. If your draft exceeds 160 characters — shorten it. This is a strict limit, not a suggestion.`);
  md.push(`14. **seo_description format** — \`[Brand name] [eyewear type] at ${storeNameEn} Ashkelon. [One key selling point] - ${storeNameEn}, Ashkelon\`. Keep it to TWO sentences maximum before the ending.`);
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
    md.push(`| ${storeName} | ${storeNameEn} (NEVER translate the store name) |`);
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
    md.push(`| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ'י ב${storeName} אשקלון |  |`);
    md.push('| 3 | Gucci | gucci | brand_description_short | מותג יוקרה איטלקי בעולם משקפי השמש |  |');
    md.push('| 4 | Gucci | gucci | brand_description | <p>גוצ\'י הוא מותג יוקרה איטלקי...</p> |  |');
    md.push('');
    md.push('**Expected output:**');
    md.push('');
    md.push('| # | Brand | Slug | Field | Hebrew | Translation |');
    md.push('|---|---|---|---|---|---|');
    if (isEn) {
      md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י - קולקציה מלאה | Gucci Eyewear - Full Collection |');
      md.push(`| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ'י ב${storeName} אשקלון | Gucci eyewear at ${storeNameEn} Ashkelon. Italian luxury sunglasses and prescription frames, full collection in stock - ${storeNameEn}, Ashkelon |`);
      md.push('| 3 | Gucci | gucci | brand_description_short | מותג יוקרה איטלקי בעולם משקפי השמש | Italian luxury icon in the world of sunglasses |');
      md.push('| 4 | Gucci | gucci | brand_description | <p>גוצ\'י הוא מותג יוקרה איטלקי...</p> | <p>Gucci is an Italian luxury brand...</p> |');
    } else {
      md.push('| 1 | Gucci | gucci | seo_title | משקפי גוצ\'י - קולקציה מלאה | Очки Gucci - полная коллекция |');
      md.push(`| 2 | Gucci | gucci | seo_description | גלו את קולקציית משקפי גוצ'י ב${storeName} אשקלון | Очки Gucci в ${storeNameEn} Ашкелон. Итальянский люксовый бренд - полная коллекция солнцезащитных и оптических очков - ${storeNameEn}, Ашкелон |`);
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
