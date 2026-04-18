// EXTERNAL TRANSLATION — VALIDATION & PREVIEW & SAVE

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
  const cyrillicRegex = /[\u0400-\u04FF]/;
  const validated = [];
  let okCount = 0, warnCount = 0, errCount = 0;
  for (const row of rows) {
    const barcode = findColumn(row, 'barcode');
    if (!barcode || barcode === '---' || barcode === '#') continue;
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
    if (targetLang === 'en') {
      if (desc && cyrillicRegex.test(desc)) errors.push('Description מכיל קירילית — אולי בחרת שפה לא נכונה?');
      if (seoTitle && cyrillicRegex.test(seoTitle)) errors.push('SEO Title מכיל קירילית');
      if (seoDesc && cyrillicRegex.test(seoDesc)) errors.push('SEO Desc מכיל קירילית');
      if (altText && cyrillicRegex.test(altText)) errors.push('Alt Text מכיל קירילית');
    }
    if (targetLang === 'ru') {
      if (desc && !cyrillicRegex.test(desc)) errors.push('Description לא מכיל קירילית — אולי בחרת שפה לא נכונה?');
      if (seoTitle && !cyrillicRegex.test(seoTitle)) errors.push('SEO Title לא מכיל קירילית');
      if (seoDesc && !cyrillicRegex.test(seoDesc)) errors.push('SEO Desc לא מכיל קירילית');
    }
    const wrapperChecks = [
      { value: desc, field: 'description', label: 'Description' },
      { value: seoTitle, field: 'seo_title', label: 'SEO Title' },
      { value: seoDesc, field: 'seo_description', label: 'SEO Desc' },
      { value: altText, field: 'alt_text', label: 'Alt Text' },
    ];
    for (const chk of wrapperChecks) {
      if (chk.value) {
        const wrapperReason = _detectWrapperContamination(chk.value, chk.field);
        if (wrapperReason) errors.push(`${chk.label}: ${wrapperReason}`);
      }
    }
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

function escImport(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
      is_deleted: false,
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
