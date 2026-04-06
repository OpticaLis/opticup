// studio-translation-glossary.js — Glossary CRUD for Translation Dashboard (i18n Phase 3)
// Schema: translation_glossary(id, tenant_id, lang, term_he, term_translated, context, source, is_deleted)
// Per-row per language. Flat list with lang column.

const StudioTranslationGlossary = (function () {
  const LANGS = { en: { name: 'English', flag: '🇺🇸' }, ru: { name: 'Русский', flag: '🇷🇺' } };

  function render(data) {
    const rows = (data || []).map(g =>
      `<tr style="border-bottom:1px solid #f5f5f5">
        <td style="padding:8px">${LANGS[g.lang]?.flag || ''} ${escapeHtml(g.lang || '')}</td>
        <td style="padding:8px;font-weight:600">${escapeHtml(g.term_he || '')}</td>
        <td style="padding:8px">${escapeHtml(g.term_translated || '')}</td>
        <td style="padding:8px;font-size:.8rem;color:#6b7280">${escapeHtml(g.context || '')}</td>
        <td style="padding:8px">
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.edit('${g.id}')" style="font-size:.75rem;padding:2px 8px">✏️</button>
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.remove('${g.id}')" style="font-size:.75rem;padding:2px 8px;color:#A32D2D">🗑</button>
        </td></tr>`
    ).join('');

    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin:0">📖 גלוסרי (${data?.length || 0} מונחים)</h4>
      <button class="btn btn-sm btn-primary" onclick="StudioTranslationGlossary.add()">+ הוסף מונח</button>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.9rem">
      <thead><tr style="border-bottom:2px solid #e5e5e5;text-align:right">
        <th style="padding:8px">שפה</th><th>עברית</th><th>תרגום</th><th>הקשר</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }

  function langSelect(sel) {
    return `<select id="gl-lang" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <option value="en" ${sel === 'en' ? 'selected' : ''}>🇺🇸 English</option>
      <option value="ru" ${sel === 'ru' ? 'selected' : ''}>🇷🇺 Русский</option>
    </select>`;
  }

  function ctxSelect(sel) {
    return `<select id="gl-ctx" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <option value="general" ${sel === 'general' || !sel ? 'selected' : ''}>כללי</option>
      <option value="optical" ${sel === 'optical' ? 'selected' : ''}>אופטיקה</option>
      <option value="medical" ${sel === 'medical' ? 'selected' : ''}>רפואי</option>
      <option value="brand" ${sel === 'brand' ? 'selected' : ''}>מותגים</option>
    </select>`;
  }

  function formBody(g) {
    return `<div style="display:flex;flex-direction:column;gap:10px">
      ${langSelect(g?.lang)}
      <input id="gl-he" value="${escapeHtml(g?.term_he || '')}" placeholder="מונח בעברית" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <input id="gl-tr" value="${escapeHtml(g?.term_translated || '')}" placeholder="תרגום" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      ${ctxSelect(g?.context)}
    </div>`;
  }

  function add() {
    Modal.show({
      title: 'הוסף מונח לגלוסרי',
      content: formBody(null),
      footer: '<button class="btn btn-primary" onclick="StudioTranslationGlossary.saveNew()">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>',
    });
  }

  async function saveNew() {
    const he = document.getElementById('gl-he')?.value?.trim();
    const tr = document.getElementById('gl-tr')?.value?.trim();
    const lang = document.getElementById('gl-lang')?.value;
    if (!he || !tr) { Toast.error('נא להזין מונח ותרגום'); return; }
    try {
      const { error } = await sb.from('translation_glossary').insert({
        tenant_id: getTenantId(),
        lang,
        term_he: he,
        term_translated: tr,
        context: document.getElementById('gl-ctx')?.value || 'general',
        source: 'manual',
      });
      if (error) throw error;
      Modal.close(); Toast.success('מונח נוסף'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  function edit(id) {
    const g = StudioTranslations.glossaryData?.find(x => x.id === id);
    if (!g) return;
    Modal.show({
      title: 'ערוך מונח',
      content: formBody(g),
      footer: `<button class="btn btn-primary" onclick="StudioTranslationGlossary.saveEdit('${id}')">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
    });
  }

  async function saveEdit(id) {
    const he = document.getElementById('gl-he')?.value?.trim();
    const tr = document.getElementById('gl-tr')?.value?.trim();
    const lang = document.getElementById('gl-lang')?.value;
    if (!he || !tr) { Toast.error('נא להזין מונח ותרגום'); return; }
    try {
      const { error } = await sb.from('translation_glossary').update({
        lang,
        term_he: he,
        term_translated: tr,
        context: document.getElementById('gl-ctx')?.value || 'general',
      }).eq('id', id);
      if (error) throw error;
      Modal.close(); Toast.success('עודכן'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  async function remove(id) {
    if (!confirm('למחוק מונח זה?')) return;
    try {
      // Soft delete (table has is_deleted column)
      const { error } = await sb.from('translation_glossary').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;
      Toast.success('נמחק'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  return { render, add, saveNew, edit, saveEdit, remove };
})();
