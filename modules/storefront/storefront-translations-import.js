// EXTERNAL TRANSLATION — IMPORT

let importParsedRows = [];

function openImportModal() {
  document.getElementById('import-textarea').value = '';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-preview').innerHTML = '';
  document.getElementById('import-status').style.display = 'none';
  document.getElementById('import-save-btn').style.display = 'none';
  importParsedRows = [];
  const _im = document.getElementById('import-modal');
  Object.assign(_im.style, {
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
  const _imCard = _im.querySelector('.modal');
  if (_imCard) {
    Object.assign(_imCard.style, {
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '900px',
      width: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    });
  }
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  importParsedRows = [];
}

function parseMarkdownTable(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];
  let format = 'unknown';
  for (const line of lines) {
    if (line.includes('|') && line.split('|').length >= 4) {
      format = 'pipe';
      break;
    }
    if (line.includes('\t') && line.split('\t').length >= 4) {
      format = 'tab';
      break;
    }
  }
  if (format === 'unknown') return [];
  if (format === 'pipe') return parsePipeTable(lines);
  return parseTabTable(lines);
}

function parsePipeTable(lines) {
  const pipeLines = lines.filter(l => l.startsWith('|') || l.includes('|'));
  if (pipeLines.length < 2) return [];
  const headerCells = splitPipeLine(pipeLines[0]);
  if (headerCells.length < 4) return [];
  const rows = [];
  for (let i = 1; i < pipeLines.length; i++) {
    const line = pipeLines[i];
    if (/^[\s|:\-]+$/.test(line)) continue;
    const cells = splitPipeLine(line);
    if (cells.length < 4) continue;
    const row = {};
    headerCells.forEach((h, idx) => {
      row[h] = (cells[idx] || '').replace(/\\?\|/g, '|').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitPipeLine(line) {
  const parts = line.split('|');
  if (parts.length > 0 && parts[0].trim() === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
  return parts.map(p => p.trim());
}

function parseTabTable(lines) {
  const tabLines = lines.filter(l => l.includes('\t'));
  if (tabLines.length < 2) return [];
  const headerCells = tabLines[0].split('\t').map(c => c.trim());
  if (headerCells.length < 4) return [];
  const rows = [];
  for (let i = 1; i < tabLines.length; i++) {
    const cells = tabLines[i].split('\t').map(c => c.trim());
    if (cells.length < 4) continue;
    const row = {};
    headerCells.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function findColumn(row, ...candidates) {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return '';
}

function _detectWrapperContamination(value, fieldName) {
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
    seo_title: { min: 20, max: 80 },
    seo_description: { min: 80, max: 200 },
    description: { min: 100, max: 500 },
    alt_text: { min: 30, max: 200 },
  };
  const bounds = lengthBounds[fieldName];
  if (bounds) {
    if (value.length < bounds.min) return `too short (${value.length} < ${bounds.min} for ${fieldName})`;
    if (value.length > bounds.max) return `too long (${value.length} > ${bounds.max} for ${fieldName})`;
  }
  return null;
}

function _getContaminatedFields(productId, lang) {
  const FIELDS = ['description', 'seo_title', 'seo_description', 'alt_text'];
  const t = (transContentMap[productId] || {})[lang] || {};
  const results = [];
  for (const f of FIELDS) {
    const entry = t[f];
    if (!entry || !entry.content) continue;
    const reason = _detectWrapperContamination(entry.content, f);
    if (reason) results.push({ field: f, reason });
  }
  return results;
}

function _updateContaminationUI(targetLang) {
  const lang = targetLang || 'en';
  const FIELDS = ['description', 'seo_title', 'seo_description', 'alt_text'];
  let productCount = 0;
  let fieldCount = 0;
  const products = contentProducts.filter(p => contentMap[p.id]?.description);
  for (const p of products) {
    const contaminated = _getContaminatedFields(p.id, lang);
    if (contaminated.length > 0) {
      productCount++;
      fieldCount += contaminated.length;
    }
  }
  const counter = document.getElementById('contamination-counter');
  if (counter) {
    counter.textContent = `סה"כ: ${productCount} מוצרים, ${fieldCount} שדות מזוהמים`;
  }
  return { productCount, fieldCount };
}

function _injectContaminationFilter() {
  if (document.getElementById('contamination-filter-box')) return;
  const actionsDiv = document.querySelector('#panel-translations .content-actions');
  if (!actionsDiv) return;
  const box = document.createElement('div');
  box.id = 'contamination-filter-box';
  box.style.cssText = 'background:#fff8e1;border:1px solid #e8da94;border-radius:8px;padding:10px 14px;margin-bottom:10px;direction:rtl;';
  box.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:14px;">
      <input type="checkbox" id="contamination-filter-cb" onchange="_onContaminationToggle()" style="width:18px;height:18px;accent-color:#c9a555;">
      🧹 הצג רק מוצרים מזוהמים ב-markdown wrappers
    </label>
    <div style="font-size:12px;color:#6b7280;margin-top:4px;margin-right:26px;">
      כשהאופציה דלוקה: רק מוצרים עם wrapper מזוהם יוצגו, ורק השדות המזוהמים יסומנו אוטומטית לייצוא.
    </div>
    <div id="contamination-counter" style="font-size:13px;font-weight:600;color:#c9a555;margin-top:6px;margin-right:26px;"></div>
  `;
  actionsDiv.parentNode.insertBefore(box, actionsDiv);
}

function _onContaminationToggle() {
  const cb = document.getElementById('contamination-filter-cb');
  _contaminationFilterActive = cb ? cb.checked : false;
  filterTranslations();
}
