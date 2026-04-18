// ══════════════════════════════════════════════════════════════
// BRAND TRANSLATION — CORE & EXPORT UI
//
// This file contains:
// 1. Local helper functions (markdown parsing, HTML escaping, file download)
// 2. Export state management and modal UI functions
// 3. Entry point for the export flow (openBrandExportModal, toggleBrandExportAll, updateBrandExportCount)
//
// Depends on: shared globals (sb, getTenantId, toast, showLoading, hideLoading, Modal)
// Does NOT depend on: storefront-translations.js
// Loads BEFORE: brand-translations-export.js, brand-translations-import.js
// ══════════════════════════════════════════════════════════════

var BRAND_TRANS_FIELDS = ['seo_title', 'seo_description', 'brand_description_short', 'brand_description'];

var brandImportParsed = [];
var brandImportLang = 'en';

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
var _brandExportCtx = null;

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

// ── Small helpers used by brand-translations-import.js ──
function _brandRowIcon(status) {
  return status === 'ok' ? '✅' : status === 'wa