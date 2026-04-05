// studio-translation-glossary.js — Glossary CRUD for Translation Dashboard (i18n Phase 3)
// Rendered inside StudioTranslations glossary sub-tab

const StudioTranslationGlossary = (function () {

  function render(data) {
    const rows = (data || []).map(g =>
      `<tr style="border-bottom:1px solid #f5f5f5">
        <td style="padding:8px;font-weight:600">${escapeHtml(g.he_term||'')}</td>
        <td style="padding:8px">${escapeHtml(g.en_term||'')}</td>
        <td style="padding:8px">${escapeHtml(g.ru_term||'')}</td>
        <td style="padding:8px;font-size:.8rem;color:#6b7280">${escapeHtml(g.category||'')}</td>
        <td style="padding:8px">
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.edit('${g.id}')" style="font-size:.75rem;padding:2px 8px">✏️</button>
          <button class="btn btn-sm" onclick="StudioTranslationGlossary.remove('${g.id}')" style="font-size:.75rem;padding:2px 8px;color:#A32D2D">🗑</button>
        </td></tr>`
    ).join('');

    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin:0">📖 גלוסרי (${data?.length||0} מונחים)</h4>
      <button class="btn btn-sm btn-primary" onclick="StudioTranslationGlossary.add()">+ הוסף מונח</button>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.9rem">
      <thead><tr style="border-bottom:2px solid #e5e5e5;text-align:right">
        <th style="padding:8px">עברית</th><th>English</th><th>Русский</th><th>קטגוריה</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }

  function catSelect(sel) {
    return `<select id="gl-cat" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <option value="optical" ${sel==='optical'?'selected':''}>אופטיקה</option>
      <option value="medical" ${sel==='medical'?'selected':''}>רפואי</option>
      <option value="brand" ${sel==='brand'?'selected':''}>מותגים</option>
      <option value="general" ${sel==='general'||!sel?'selected':''}>כללי</option></select>`;
  }

  function formBody(g) {
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <input id="gl-he" value="${escapeHtml(g?.he_term||'')}" placeholder="עברית" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <input id="gl-en" value="${escapeHtml(g?.en_term||'')}" placeholder="English" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      <input id="gl-ru" value="${escapeHtml(g?.ru_term||'')}" placeholder="Русский" style="padding:8px 12px;border:1px solid #e5e5e5;border-radius:8px;font-family:inherit">
      ${catSelect(g?.category)}</div>`;
  }

  function add() {
    Modal.open({
      title: 'הוסף מונח לגלוסרי', body: formBody(null),
      footer: '<button class="btn btn-primary" onclick="StudioTranslationGlossary.saveNew()">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>',
    });
  }

  async function saveNew() {
    const he = document.getElementById('gl-he')?.value?.trim();
    if (!he) { Toast.error('נא להזין מונח בעברית'); return; }
    try {
      const { error } = await sb.from('translation_glossary').insert({
        tenant_id: getTenantId(), he_term: he,
        en_term: document.getElementById('gl-en')?.value?.trim() || null,
        ru_term: document.getElementById('gl-ru')?.value?.trim() || null,
        category: document.getElementById('gl-cat')?.value || 'general', source: 'manual',
      });
      if (error) throw error;
      Modal.close(); Toast.success('מונח נוסף'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  function edit(id) {
    const g = StudioTranslations.glossaryData?.find(x => x.id === id);
    if (!g) return;
    Modal.open({
      title: 'ערוך מונח', body: formBody(g),
      footer: `<button class="btn btn-primary" onclick="StudioTranslationGlossary.saveEdit('${id}')">שמור</button><button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`,
    });
  }

  async function saveEdit(id) {
    const he = document.getElementById('gl-he')?.value?.trim();
    if (!he) { Toast.error('נא להזין מונח'); return; }
    try {
      const { error } = await sb.from('translation_glossary').update({
        he_term: he, en_term: document.getElementById('gl-en')?.value?.trim() || null,
        ru_term: document.getElementById('gl-ru')?.value?.trim() || null,
        category: document.getElementById('gl-cat')?.value || 'general',
      }).eq('id', id);
      if (error) throw error;
      Modal.close(); Toast.success('עודכן'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה'); }
  }

  async function remove(id) {
    if (!confirm('למחוק מונח זה?')) return;
    try {
      const { error } = await sb.from('translation_glossary').delete().eq('id', id);
      if (error) throw error;
      Toast.success('נמחק'); StudioTranslations.reload();
    } catch (e) { Toast.error('שגיאה'); }
  }

  return { render, add, saveNew, edit, saveEdit, remove };
})();
