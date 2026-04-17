// Storefront Glossary Manager — CRUD for optical translation terms
// Phase 6: i18n AI Translation

let glossaryTerms = [];
let editingTermId = null;

const CTX_LABELS = {
  general: 'כללי', lens_type: 'סוגי עדשות', material: 'חומרים',
  eyewear_type: 'סוגי משקפיים', part: 'חלקי משקפיים', exam: 'בדיקת ראייה',
  marketing: 'שיווק', service: 'שירות'
};

async function loadGlossary() {
  showLoading('טוען מילון מונחים...');
  try {
    const tid = getTenantId();
    const lang = document.getElementById('gl-lang').value;

    const { data, error } = await sb.from('translation_glossary')
      .select('*')
      .eq('tenant_id', tid)
      .eq('lang', lang)
      .eq('is_deleted', false)
      .order('context')
      .order('term_he');

    if (error) throw error;
    glossaryTerms = data || [];
    renderGlossary();
  } catch (e) {
    console.error('loadGlossary error:', e);
    toast('שגיאה בטעינת מילון', 'e');
  } finally {
    hideLoading();
  }
}

function renderGlossary() {
  const ctxFilter = document.getElementById('gl-context').value;
  const srcFilter = document.getElementById('gl-source').value;
  const search = document.getElementById('gl-search').value.trim().toLowerCase();

  let filtered = glossaryTerms;
  if (ctxFilter) filtered = filtered.filter(t => t.context === ctxFilter);
  if (srcFilter) filtered = filtered.filter(t => t.source === srcFilter);
  if (search) {
    filtered = filtered.filter(t =>
      t.term_he.toLowerCase().includes(search) ||
      t.term_translated.toLowerCase().includes(search)
    );
  }

  document.getElementById('gl-count').textContent = `${filtered.length} מונחים`;

  const container = document.getElementById('gl-table-container');
  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--g400);text-align:center;padding:24px">לא נמצאו מונחים</p>';
    return;
  }

  let html = `<table class="gl-table">
    <thead><tr><th>עברית</th><th>תרגום</th><th>קטגוריה</th><th>מקור</th><th>פעולות</th></tr></thead>
    <tbody>`;

  for (const t of filtered) {
    const ctxLabel = CTX_LABELS[t.context] || t.context;
    const srcClass = t.source === 'learned' ? 'learned' : 'manual';
    const srcLabel = t.source === 'learned' ? '🧠 נלמד' : '✍️ ידני';

    html += `<tr>
      <td>${escapeHtml(t.term_he)}</td>
      <td dir="ltr" style="text-align:left">${escapeHtml(t.term_translated)}</td>
      <td><span class="ctx-badge">${ctxLabel}</span></td>
      <td><span class="src-badge ${srcClass}">${srcLabel}</span></td>
      <td style="white-space:nowrap">
        <button class="gl-btn gl-btn-edit" onclick="openEditTermModal('${t.id}')">✏️</button>
        <button class="gl-btn gl-btn-del" onclick="deleteGlossaryTerm('${t.id}')">🗑️</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function openAddTermModal() {
  editingTermId = null;
  document.getElementById('gl-modal-title').textContent = 'הוספת מונח';
  document.getElementById('gl-term-he').value = '';
  document.getElementById('gl-term-trans').value = '';
  document.getElementById('gl-term-ctx').value = 'general';
  const _glm = document.getElementById('gl-modal');
  _glm.style.background = 'rgba(0,0,0,0.5)';
  _glm.style.display = 'flex';
}

function openEditTermModal(termId) {
  const term = glossaryTerms.find(t => t.id === termId);
  if (!term) return;
  editingTermId = termId;
  document.getElementById('gl-modal-title').textContent = 'עריכת מונח';
  document.getElementById('gl-term-he').value = term.term_he;
  document.getElementById('gl-term-trans').value = term.term_translated;
  document.getElementById('gl-term-ctx').value = term.context || 'general';
  const _glm2 = document.getElementById('gl-modal');
  _glm2.style.background = 'rgba(0,0,0,0.5)';
  _glm2.style.display = 'flex';
}

function closeGlModal() {
  document.getElementById('gl-modal').style.display = 'none';
  editingTermId = null;
}

async function saveGlossaryTerm() {
  const termHe = document.getElementById('gl-term-he').value.trim();
  const termTrans = document.getElementById('gl-term-trans').value.trim();
  const context = document.getElementById('gl-term-ctx').value;
  const lang = document.getElementById('gl-lang').value;

  if (!termHe || !termTrans) { toast('נא למלא את כל השדות', 'w'); return; }

  showLoading('שומר...');
  try {
    const tid = getTenantId();
    if (editingTermId) {
      const { error } = await sb.from('translation_glossary')
        .update({ term_he: termHe, term_translated: termTrans, context })
        .eq('id', editingTermId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('translation_glossary')
        .upsert({
          tenant_id: tid, lang, term_he: termHe,
          term_translated: termTrans, context, source: 'manual'
        }, { onConflict: 'tenant_id,lang,term_he' });
      if (error) throw error;
    }

    closeGlModal();
    await loadGlossary();
    toast('מונח נשמר', 's');
  } catch (e) {
    console.error('saveGlossaryTerm error:', e);
    toast('שגיאה בשמירה', 'e');
  } finally {
    hideLoading();
  }
}

async function deleteGlossaryTerm(termId) {
  if (!confirm('למחוק מונח זה?')) return;
  showLoading('מוחק...');
  try {
    await sb.from('translation_glossary')
      .update({ is_deleted: true })
      .eq('id', termId);
    await loadGlossary();
    toast('מונח נמחק', 's');
  } catch (e) {
    toast('שגיאה במחיקה', 'e');
  } finally {
    hideLoading();
  }
}
