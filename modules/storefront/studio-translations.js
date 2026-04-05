// studio-translations.js — Translation Dashboard (i18n Phase 3)
// Sub-tabs: Pages | Brands | Campaigns | Shortcodes | Templates | Glossary
// Max 350 lines — glossary CRUD in studio-translation-glossary.js

const StudioTranslations = (function () {
  const TRANSLATE_FN = SUPABASE_URL + '/functions/v1/translate-content';
  const LANGS = { en: { name: 'English', flag: '🇺🇸' }, ru: { name: 'Русский', flag: '🇷🇺' } };
  const STATUS_BG = { source:'#EAF3DE', approved:'#EAF3DE', translated:'#E1F5EE', draft:'#F1EFE8', needs_update:'#FAEEDA', missing:'#FCEBEB', published:'#EAF3DE' };
  const STATUS_FG = { source:'#3B6D11', approved:'#3B6D11', translated:'#085041', draft:'#5F5E5A', needs_update:'#854F0B', missing:'#A32D2D', published:'#3B6D11' };

  let subTab = 'pages', dashData = [], tenantConfig = null, brandsData = [], brandTr = [], glossaryData = [];
  let containerId = null, _loaded = false;

  function badge(status) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:.75rem;font-weight:600;background:${STATUS_BG[status]||STATUS_BG.missing};color:${STATUS_FG[status]||STATUS_FG.missing}">${status}</span>`;
  }
  function goldBtn(text, onclick, extra) { return `<button class="btn btn-sm" onclick="${onclick}" style="font-size:.75rem;padding:2px 8px;background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;${extra||''}">${text}</button>`; }
  function supported() { return (tenantConfig?.supported_languages || ['he','en','ru']).filter(l => l !== 'he'); }

  async function init(cId) {
    containerId = cId;
    if (!_loaded) await loadAll();
    render();
  }

  async function loadAll() {
    const tid = getTenantId();
    try {
      const [d, c, b, bt, g] = await Promise.all([
        sb.from('v_translation_dashboard').select('*').eq('tenant_id', tid),
        sb.from('v_storefront_config').select('supported_languages,default_language,auto_translate_languages,auto_publish_threshold').eq('tenant_id', tid).single(),
        sb.from('brands').select('id,name,brand_description,brand_description_short,seo_title,seo_description').eq('tenant_id', tid).eq('is_deleted', false),
        sb.from('content_translations').select('*').eq('tenant_id', tid).eq('entity_type', 'brand'),
        sb.from('translation_glossary').select('*').eq('tenant_id', tid).order('term_he'),
      ]);
      dashData = d.data || []; tenantConfig = c.data || {}; brandsData = b.data || []; brandTr = bt.data || []; glossaryData = g.data || [];
      _loaded = true;
    } catch (e) { console.error('Trans load:', e); Toast.error('שגיאה בטעינת תר��ומים'); }
  }

  function render() {
    const el = document.getElementById(containerId); if (!el) return;
    el.innerHTML = renderSummary() + renderSubTabs() + '<div id="trans-sub"></div>' + renderAutoPilot();
    renderSub();
  }

  // ── Summary ���─
  function renderSummary() {
    const total = dashData.length, langs = supported();
    let h = `<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="padding:12px 16px;background:#f5f5f5;border-radius:10px;text-align:center;min-width:130px">
        <div style="font-weight:700">עברית</div><div style="font-size:1.5rem;font-weight:700">${total}</div><div style="font-size:.8rem;color:#6b7280">עמודים</div></div>`;
    for (const l of langs) {
      const ct = countStatus(l);
      h += `<div style="padding:12px 16px;background:#f5f5f5;border-radius:10px;text-align:center;min-width:130px">
        <div style="font-weight:700">${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</div>
        <div style="font-size:1.5rem;font-weight:700">${ct.done} / ${total}</div>
        <div style="font-size:.8rem">${ct.approved?`<span style="color:#3B6D11">${ct.approved}✅</span> `:''}${ct.needs_update?`<span style="color:#854F0B">${ct.needs_update}⚠</span> `:''}${ct.draft?`<span style="color:#5F5E5A">${ct.draft}📝</span>`:''}</div></div>`;
    }
    return h + '</div>';
  }
  function countStatus(lang) {
    const c = { approved:0, translated:0, draft:0, needs_update:0, missing:0 };
    for (const r of dashData) { const s = r[lang+'_page_id'] ? (r[lang+'_status']||'draft') : 'missing'; c[s] = (c[s]||0)+1; }
    c.done = c.approved + c.translated + c.draft;
    return c;
  }

  // ── Sub-tabs ──
  function renderSubTabs() {
    const tabs = [{id:'pages',l:'📄 עמודים'},{id:'brands',l:'🏷️ מותגים'},{id:'campaigns',l:'🎯 קמפיינים'},{id:'shortcodes',l:'📦 שורטקודים'},{id:'templates',l:'📑 תבניות'},{id:'glossary',l:'📖 גלוסרי'}];
    return `<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${tabs.map(t=>`<button class="btn btn-sm ${t.id===subTab?'btn-primary':''}" onclick="StudioTranslations.setSubTab('${t.id}')">${t.l}</button>`).join('')}</div>`;
  }
  function setSubTab(t) { subTab = t; render(); }
  function renderSub() {
    const el = document.getElementById('trans-sub'); if (!el) return;
    if (subTab==='pages') el.innerHTML = renderPages(false);
    else if (subTab==='campaigns') el.innerHTML = renderPages(true);
    else if (subTab==='brands') el.innerHTML = renderBrands();
    else if (subTab==='shortcodes') el.innerHTML = renderShortcodes();
    else if (subTab==='glossary') el.innerHTML = StudioTranslationGlossary.render(glossaryData);
    else el.innerHTML = '<div class="studio-empty" style="color:#6b7280">בקרוב</div>';
  }

  // ── Pages ──
  function renderPages(camp) {
    const pages = dashData.filter(r => camp ? r.page_type==='campaign' : r.page_type!=='campaign');
    if (!pages.length) return '<div class="studio-empty">אין עמוד��ם</div>';
    const langs = supported();
    let bulk = '<div style="display:flex;gap:8px;margin-bottom:12px">';
    for (const l of langs) bulk += goldBtn(`תרגם הכל ל-${LANGS[l]?.name||l}`, `StudioTranslations.bulkTranslate('${l}')`);
    bulk += '<span id="trans-bulk-prog" style="font-size:.85rem;color:#6b7280;align-self:center"></span></div>';

    const cards = pages.map(row => {
      const typeBdg = row.page_type ? `<span style="font-size:.75rem;padding:2px 8px;border-radius:6px;background:#f5f5f5;color:#6b7280">${row.page_type}</span>` : '';
      let cols = '';
      for (const l of langs) {
        const st = row[l+'_page_id'] ? (row[l+'_status']||'draft') : 'missing';
        const seo = row[l+'_seo_score']||0;
        const stale = row[l+'_stale_since'];
        cols += `<div style="min-width:120px;padding:8px;border-right:1px solid #e5e5e5">
          <div style="font-weight:600;font-size:.8rem;margin-bottom:4px">${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</div>
          ${badge(st)}${stale?'<span style="font-size:.7rem;color:#854F0B;margin-right:4px"> ⚠ שונה</span>':''}
          <div style="margin-top:4px"><div style="height:4px;border-radius:2px;background:#e5e5e5;overflow:hidden"><div style="height:100%;width:${seo}%;background:${seo>70?'#3B6D11':seo>50?'#854F0B':'#A32D2D'}"></div></div><span style="font-size:.7rem;color:#6b7280">SEO ${seo}</span></div>
          <div style="margin-top:6px;display:flex;gap:4px">
            ${goldBtn('תרגם',`StudioTranslations.translatePage('${row.he_page_id}','${l}')`)}
            ${row[l+'_page_id']?`<button class="btn btn-sm" onclick="StudioTranslationEditor.open('${row.he_page_id}','${l}')" style="font-size:.75rem;padding:2px 8px">ערוך</button>`:''}
          </div></div>`;
      }
      return `<div style="border:1px solid #e5e5e5;border-radius:10px;padding:12px;margin-bottom:8px;transition:border-color .2s" onmouseover="this.style.borderColor='#c9a555'" onmouseout="this.style.borderColor='#e5e5e5'">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-weight:600">${escapeHtml(row.title||'(ללא כותרת)')}</span>${typeBdg}</div>
        <div style="display:flex;gap:0;flex-wrap:wrap">${cols}</div></div>`;
    }).join('');
    return bulk + cards;
  }

  // ─�� Brands ──
  function renderBrands() {
    if (!brandsData.length) return '<div class="studio-empty">אין מותגים</div>';
    const langs = supported(), fields = ['brand_description','brand_description_short','seo_title','seo_description'];
    const rows = brandsData.map(b => {
      let cols = '';
      for (const l of langs) {
        const sts = fields.map(f => { const t = brandTr.find(x=>x.entity_id===b.id&&x.field_name===f&&x.lang===l); return t?t.status:'missing'; });
        const ov = sts.includes('missing')?'missing':sts.includes('draft')?'draft':'approved';
        cols += `<td>${badge(ov)}</td>`;
      }
      return `<tr><td style="font-weight:600;padding:8px">${escapeHtml(b.name)}</td><td>${badge(b.brand_description?'approved':'missing')}</td>${cols}<td>${goldBtn('תרגם',`StudioTranslations.translateBrand('${b.id}')`)}</td></tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:.9rem"><thead><tr style="border-bottom:2px solid #e5e5e5;text-align:right"><th style="padding:8px">מותג</th><th>עברית</th>${langs.map(l=>`<th>${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ── Shortcodes ──
  function renderShortcodes() {
    const groups = {
      lead_form: { label:'טופס לידים', keys:['shortcode.lead_form.placeholder_name','shortcode.lead_form.placeholder_phone','shortcode.lead_form.submit'] },
      whatsapp: { label:'כפתור וואטסאפ', keys:['shortcode.whatsapp.button_text','shortcode.whatsapp.default_message'] },
      cta: { label:'כפתור CTA', keys:['shortcode.cta.default_text'] },
    };
    const langs = supported();
    let h = '';
    for (const [g, info] of Object.entries(groups)) {
      h += `<div style="margin-bottom:16px"><h4 style="margin:0 0 8px">[${g}] — ${info.label}</h4>
        <table style="width:100%;border-collapse:collapse;font-size:.85rem"><thead><tr style="border-bottom:1px solid #e5e5e5"><th style="padding:6px;text-align:right">מפתח</th><th>עברית</th>${langs.map(l=>`<th>${LANGS[l]?.name||l}</th>`).join('')}</tr></thead><tbody>`;
      for (const key of info.keys) {
        h += `<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:6px;font-size:.8rem;color:#6b7280">${key.split('.').pop()}</td><td style="padding:6px">(ברירת מחדל)</td>`;
        for (const l of langs) h += `<td style="padding:6px"><input type="text" style="width:100%;padding:4px 8px;border:1px solid #e5e5e5;border-radius:6px;font-size:.85rem;font-family:inherit" onchange="StudioTranslations.saveOverride('${key}','${l}',this.value)"></td>`;
        h += '</tr>';
      }
      h += '</tbody></table></div>';
    }
    return h;
  }

  // ── Auto-Pilot ──
  function renderAutoPilot() {
    const al = tenantConfig?.auto_translate_languages||[], th = tenantConfig?.auto_publish_threshold||0;
    return `<div style="margin-top:24px;padding:16px;border:1px solid #e5e5e5;border-radius:10px;background:#fafafa">
      <h4 style="margin:0 0 12px">⚡ Auto-pilot</h4>
      <label style="display:flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" ${al.includes('en')?'checked':''} onchange="StudioTranslations.toggleAuto('en',this.checked)"> תרגום אוטומטי לאנגלית</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" ${al.includes('ru')?'checked':''} onchange="StudioTranslations.toggleAuto('ru',this.checked)"> תרגום אוטומטי לרוסית</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer">
        <input type="checkbox" ${th>=0.9?'checked':''} onchange="StudioTranslations.togglePublish(this.checked)"> פרסום אוטומטי (AI 90%+)</label>
    </div>`;
  }

  // ── API ──
  function showTranslating(on) {
    let ov = document.getElementById('trans-loading');
    if (on) {
      if (ov) return;
      ov = document.createElement('div'); ov.id = 'trans-loading';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999';
      ov.innerHTML = `<div style="background:#fff;border-radius:12px;padding:32px 48px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)">
        <div style="width:40px;height:40px;border:4px solid #e5e5e5;border-top-color:#c9a555;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
        <div style="font-size:1.1rem;font-weight:600">מתרגם עמוד...</div>
        <div style="font-size:.85rem;color:#6b7280;margin-top:4px">העיבוד עשוי לקחת 10-30 שניות</div>
      </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(ov);
    } else { if (ov) ov.remove(); }
  }

  async function callTranslateAPI(mode, params) {
    const jwt = sessionStorage.getItem('jwt_token');
    if (!jwt) throw new Error('לא מחובר — נא להתחבר מחדש');
    const r = await fetch(TRANSLATE_FN+'?_t='+Date.now(), {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt},
      body: JSON.stringify({ mode, tenant_id: getTenantId(), ...params }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error||'Translation failed'); }
    return r.json();
  }

  async function translatePage(srcId, lang) {
    showTranslating(true);
    try {
      await callTranslateAPI('translate_page', { source_page_id: srcId, target_lang: lang });
      Toast.success('התרגום הושלם'); _loaded = false; await init(containerId);
    } catch(e) { Toast.error('שגיאה: '+e.message); } finally { showTranslating(false); }
  }

  async function bulkTranslate(lang) {
    const todo = dashData.filter(r=>!r[lang+'_page_id']);
    if (!todo.length) { Toast.success('הכל מתורגם!'); return; }
    showTranslating(true);
    const p = document.getElementById('trans-bulk-prog');
    for (let i=0;i<todo.length;i++) {
      if(p) p.textContent = `מתרגם ${i+1}/${todo.length}...`;
      try { await callTranslateAPI('translate_page',{source_page_id:todo[i].he_page_id,target_lang:lang}); } catch(e){ console.error(e); }
    }
    showTranslating(false);
    if(p) p.textContent='הושלם!'; Toast.success(`תורגמו ${todo.length} עמו��ים`);
    _loaded=false; await init(containerId);
  }

  async function translateBrand(id) {
    const b = brandsData.find(x=>x.id===id); if(!b) return;
    showTranslating(true);
    for (const l of supported()) {
      for (const f of ['brand_description','brand_description_short','seo_title','seo_description']) {
        if(!b[f]) continue;
        try { await callTranslateAPI('translate_text',{text:b[f],target_lang:l,context:'brand_'+f}); } catch(e){ console.error(e); }
      }
    }
    showTranslating(false); Toast.success('הושלם'); _loaded=false; await init(containerId);
  }

  async function saveOverride(key, lang, val) {
    try {
      const { error } = await sb.from('tenant_i18n_overrides').upsert({ tenant_id:getTenantId(), lang, key_path:key, value:val, updated_at:new Date().toISOString() }, { onConflict:'tenant_id,lang,key_path' });
      if(error) throw error; Toast.success('נשמר');
    } catch(e) { Toast.error('שגיאה'); console.error(e); }
  }

  async function toggleAuto(lang, on) {
    let al = [...(tenantConfig?.auto_translate_languages||[])];
    if(on && !al.includes(lang)) al.push(lang); if(!on) al=al.filter(l=>l!==lang);
    try {
      await sb.from('storefront_config').update({auto_translate_languages:al}).eq('tenant_id',getTenantId());
      tenantConfig.auto_translate_languages=al; Toast.success('עודכן');
    } catch(e) { Toast.error('שגיאה'); }
  }

  async function togglePublish(on) {
    const v = on ? 0.9 : 0;
    try {
      await sb.from('storefront_config').update({auto_publish_threshold:v}).eq('tenant_id',getTenantId());
      tenantConfig.auto_publish_threshold=v; Toast.success('עודכן');
    } catch(e) { Toast.error('שגיאה'); }
  }

  async function reload() { _loaded=false; await init(containerId); }

  return { init, setSubTab, translatePage, bulkTranslate, translateBrand, saveOverride, toggleAuto, togglePublish, callTranslateAPI, reload, get glossaryData(){ return glossaryData; } };
})();
