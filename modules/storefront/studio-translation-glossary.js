// studio-translation-glossary.js — Glossary CRUD (grouped view: one row per term_he)
// Schema: translation_glossary(id, tenant_id, lang, term_he, term_translated, context, source, is_deleted)
// UNIQUE(tenant_id, lang, term_he). Two rows per term (en + ru), displayed as one grouped row.

const StudioTranslationGlossary = (function () {
  function groupData(data) {
    const grouped = {};
    (data || []).forEach(row => {
      const termHe = (row.term_he || '').trim();
      if (!termHe) return; // skip malformed rows
      if (!grouped[termHe]) {
        grouped[termHe] = {
          term_he: termHe,
          context: row.context || '',
          en: '', ru: '',
          en_id: null, ru_id: null,
        };
      }
      const g = grouped[termHe];
      if (row.context && !g.context) g.context = row.context;
      const lang = (row.lang || '').trim().toLowerCase();
      const tr = row.term_translated || '';
      if (lang === 'en') { g.en = tr; g.en_id = row.id; }
      else if (lang === 'ru') { g.ru = tr; g.ru_id = row.id; }
    });
    return Object.values(grouped).sort((a, b) => a.term_he.localeCompare(b.term_he, 'he'));
  }

  function render(data) {
    const groups = groupData(data);
    const rows = groups.map(g => {
      const key = encodeURIComponent(g.term_he);
      return `<tr style="border-bottom:1px solid #f5f5f5">
        <td style="padding:8px;font-weight:600">${escapeHtml(g.term_he)}</td>
        <td style="padding:8px">${escapeHtml(g.en) || '<span style="color:#c9a555">—</span>'}</td>
        <td style="padding:8px">${escapeHtml(g.ru) || '<span style="color:#c9a555">—</span>'}</td>
        <td style="padding:8px;font-size:.8rem;color:#6b7280">${escapeHtml(g.context || '')}</td>
        <td style="padding:8px;white-space:nowrap">
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.edit('${key}')" style="font-size:.75rem;padding:2px 8px">✏️</button>
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.remove('${key}')" style="font-size:.75rem;padding:2px 8px;color:#A32D2D">🗑</button>
        </td></tr>`;
    }).join('');

    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin:0">📖 גלוסרי (${groups.length} מונחים)</h4>
      <button class="btn btn-sm btn-primary" onclick="StudioTranslationGlossary.add()">+ הוסף מונח</button>
    </div>
    <table dir="rtl" style="width:100%;border-collapse:collapse;font-size:.9rem">
      <thead><tr style="border-bottom:2px solid #c9a555;text-align:right">
        <th style="padding:8px">עברית</th><th style="padding:8px">אנגלית</th><th style="padding:8px">רוסית</th><th style="padding:8px">הקשר</th><th style="padding:8px">פעולות</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }

  function ctxSelect(sel) {
    const opts = [
      ['general', 'כללי'], ['optical', 'אופטיקה'], ['exam', 'בדיקות'],
      ['marketing', 'שיווק'], ['service', 'שירות'],
    ];
    return `<select id="gl-ctx" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      ${opts.map(([v, l]) => `<option value="${v}" ${sel === v || (!sel && v === 'general') ? 'selected' : ''}>${l}</option>`).join('')}
    </select>`;
  }

  function formBody(g, heReadOnly) {
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <label style="font-size:.85rem;color:#6b7280">עברית</label>
      <input id="gl-he" value="${escapeHtml(g?.term_he || '')}" placeholder="מונח בעברית" ${heReadOnly ? 'readonly style="background:#f5f5f5;' : 'style="'}padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <label style="font-size:.85rem;color:#6b7280">אנגלית</label>
      <input id="gl-en" value="${escapeHtml(g?.en || '')}" placeholder="English" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <label style="font-size:.85rem;color:#6b7280">רוסית</label>
      <input id="gl-ru" value="${escapeHtml(g?.ru || '')}" placeholder="Русский" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <label style="font-size:.85rem;color:#6b7280">הקשר</label>
      ${ctxSelect(g?.context)}
    </div>`;
  }

  function findGroup(termHe) {
    const groups = groupData(StudioTranslations.glossaryData || []);
    return groups.find(g => g.term_he === termHe);
  }

  function add() {
    Modal.show({
      title: 'הוסף מונח לגלוסרי',
      content: formBody(null, false),
      footer: '<button class="btn btn-primary" onclick="StudioTranslationGlossary.save()">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>',
    });
  }

  function edit(keyEnc) {
    const termHe = decodeURIComponent(keyEnc);
    const g = findGroup(termHe);
    if (!g) return;
    Modal.show({
      title: 'ערוך מונח',
      content: formBody(g, true),
      footer: `<button class="btn btn-primary" onclick="StudioTranslationGlossary.save()">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
    });
  }

  async function save() {
    const he = document.getElementById('gl-he')?.value?.trim();
    const en = document.getElementById('gl-en')?.value?.trim();
    const ru = document.getElementById('gl-ru')?.value?.trim();
    const ctx = document.getElementById('gl-ctx')?.value || 'general';
    if (!he) { Toast.error('נא להזין מונח בעברית'); return; }
    if (!en && !ru) { Toast.error('נא להזין לפחות תרגום אחד'); return; }
    try {
      const tenantId = getTenantId();
      const rows = [];
      if (en) rows.push({ tenant_id: tenantId, lang: 'en', term_he: he, term_translated: en, context: ctx, source: 'manual', is_deleted: false });
      if (ru) rows.push({ tenant_id: tenantId, lang: 'ru', term_he: he, term_translated: ru, context: ctx, source: 'manual', is_deleted: false });
      const { error } = await sb.from('translation_glossary').upsert(rows, { onConflict: 'tenant_id,lang,term_he' });
      if (error) throw error;
      Modal.close(); Toast.success('נשמר'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  async function remove(keyEnc) {
    const termHe = decodeURIComponent(keyEnc);
    if (!confirm(`האם למחוק את המונח "${termHe}"?`)) return;
    try {
      const { error } = await sb.from('translation_glossary')
        .update({ is_deleted: true })
        .eq('tenant_id', getTenantId())
        .eq('term_he', termHe);
      if (error) throw error;
      Toast.success('נמחק'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  return { render, add, edit, save, remove };
})();
