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
      const [d, c, b, bt, g, vb] = await Promise.all([
        sb.from('v_translation_dashboard').select('*').eq('tenant_id', tid),
        sb.from('v_storefront_config').select('supported_languages,default_language,auto_translate_languages,auto_publish_threshold').eq('tenant_id', tid).single(),
        sb.from('brands').select('id,name,brand_description,brand_description_short,seo_title,seo_description,active,exclude_website').eq('tenant_id', tid).eq('is_deleted', false).eq('active', true).neq('exclude_website', true),
        sb.from('content_translations').select('*').eq('tenant_id', tid).eq('entity_type', 'brand'),
        sb.from('translation_glossary').select('*').eq('tenant_id', tid).eq('is_deleted', false).order('term_he'),
        // Allowlist: only brands that the public storefront actually exposes
        // (active, not excluded, has at least one visible product). This view
        // already enforces all of those filters.
        sb.from('v_storefront_brands').select('brand_id').eq('tenant_id', tid),
      ]);
      const visibleIds = new Set((vb.data || []).map(r => r.brand_id));
      dashData = d.data || [];
      tenantConfig = c.data || {};
      brandsData = (b.data || []).filter(row => visibleIds.has(row.id));
      brandTr = bt.data || [];
      glossaryData = g.data || [];
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
    const tabs = [{id:'pages',l:'📄 עמודים'},{id:'brands',l:'🏷️ מותגים'},{id:'campaigns',l:'🎯 קמפיינים'},{id:'glossary',l:'📖 גלוסרי'}];
    return `<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${tabs.map(t=>`<button class="btn btn-sm ${t.id===subTab?'btn-primary':''}" onclick="StudioTranslations.setSubTab('${t.id}')">${t.l}</button>`).join('')}</div>`;
  }
  function setSubTab(t) { subTab = t; render(); }
  function renderSub() {
    const el = document.getElementById('trans-sub'); if (!el) return;
    if (subTab==='pages') el.innerHTML = renderPages(false);
    else if (subTab==='campaigns') el.innerHTML = renderPages(true);
    else if (subTab==='brands') el.innerHTML = renderBrands();
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

    const STOREFRONT_BASE = (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname))
      ? 'http://localhost:4321'
      : 'https://opticup-storefront.vercel.app';
    const buildUrl = (slug, l) => {
      const clean = (slug || '').replace(/^\/+|\/+$/g, '');
      const prefix = l === 'he' ? '' : '/' + l;
      return `${STOREFRONT_BASE}${prefix}/${clean}/`.replace(/\/+$/, '/');
    };
    const cards = pages.map(row => {
      const typeBdg = row.page_type ? `<span style="font-size:.75rem;padding:2px 8px;border-radius:6px;background:#f5f5f5;color:#6b7280">${row.page_type}</span>` : '';
      const heViewBtn = `<a href="${buildUrl(row.slug,'he')}" target="_blank" rel="noopener" title="צפה באתר" style="font-size:.75rem;padding:2px 6px;border:1px solid #c9a555;color:#c9a555;background:transparent;border-radius:6px;text-decoration:none;margin-inline-start:6px">👁</a>`;
      let cols = '';
      for (const l of langs) {
        const st = row[l+'_page_id'] ? (row[l+'_status']||'draft') : 'missing';
        const seo = row[l+'_seo_score']||0;
        const stale = row[l+'_stale_since'];
        cols += `<div style="min-width:120px;padding:8px;border-right:1px solid #e5e5e5">
          <div style="font-weight:600;font-size:.8rem;margin-bottom:4px">${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</div>
          ${badge(st)}${stale?'<span style="font-size:.7rem;color:#854F0B;margin-right:4px"> ⚠ שונה</span>':''}
          <div style="margin-top:4px"><div style="height:4px;border-radius:2px;background:#e5e5e5;overflow:hidden"><div style="height:100%;width:${seo}%;background:${seo>70?'#3B6D11':seo>50?'#854F0B':'#A32D2D'}"></div></div><span style="font-size:.7rem;color:#6b7280">SEO ${seo}</span></div>
          <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
            ${goldBtn('תרגם',`StudioTranslations.translatePage('${row.he_page_id}','${l}')`)}
            <button class="btn btn-sm" onclick="StudioTranslations.manualTranslate('${row.he_page_id}','${l}')" style="font-size:.75rem;padding:2px 8px;border:1px solid #c9a555;color:#c9a555;background:transparent">תרגום ידני</button>
            ${row[l+'_page_id']?`<button class="btn btn-sm" onclick="StudioTranslationEditor.open('${row.he_page_id}','${l}')" style="font-size:.75rem;padding:2px 8px">ערוך</button><a href="${buildUrl(row.slug,l)}" target="_blank" rel="noopener" title="צפה באתר" style="font-size:.75rem;padding:2px 6px;border:1px solid #c9a555;color:#c9a555;background:transparent;border-radius:6px;text-decoration:none">👁</a><button class="btn btn-sm" title="מחק תרגום" onclick="StudioTranslations.deletePageTranslation('${row[l+'_page_id']}','${l}',${JSON.stringify(row.title||row.slug||'').replace(/"/g,'&quot;')})" style="font-size:.75rem;padding:2px 6px;color:#A32D2D;border:1px solid #fca5a5;background:transparent">🗑</button>`:''}
          </div></div>`;
      }
      return `<div style="border:1px solid #e5e5e5;border-radius:10px;padding:12px;margin-bottom:8px;transition:border-color .2s" onmouseover="this.style.borderColor='#c9a555'" onmouseout="this.style.borderColor='#e5e5e5'">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-weight:600">${escapeHtml(row.title||'(ללא כותרת)')}</span>${typeBdg}${heViewBtn}</div>
        <div style="display:flex;gap:0;flex-wrap:wrap">${cols}</div></div>`;
    }).join('');
    return bulk + cards;
  }

  // ─�� Brands ──
  const BRAND_FIELDS = ['brand_description','brand_description_short','seo_title','seo_description'];
  function brandHasHebrew(b) { return BRAND_FIELDS.some(f => (b[f]||'').trim()); }
  function renderBrands() {
    if (!brandsData.length) return '<div class="studio-empty">אין מותגים</div>';
    const langs = supported();
    const rows = brandsData.map(b => {
      let cols = '';
      for (const l of langs) {
        const sts = BRAND_FIELDS.map(f => { const t = brandTr.find(x=>x.entity_id===b.id&&x.field_name===f&&x.lang===l); return t?t.status:'missing'; });
        const ov = sts.includes('missing')?'missing':sts.includes('draft')?'draft':'approved';
        cols += `<td>${badge(ov)}</td>`;
      }
      const heHas = brandHasHebrew(b);
      const actions = heHas
        ? `${goldBtn('תרגם',`StudioTranslations.translateBrand('${b.id}')`)} <button class="btn btn-sm" onclick="StudioTranslations.openBrandEditor('${b.id}')" style="font-size:.75rem;padding:2px 8px;border:1px solid #c9a555;color:#c9a555;background:transparent">ערוך</button>`
        : `<span style="font-size:.75rem;color:#9ca3af">אין תוכן בעברית</span>`;
      return `<tr><td style="font-weight:600;padding:8px">${escapeHtml(b.name)}</td><td>${badge(heHas?'approved':'missing')}</td>${cols}<td>${actions}</td></tr>`;
    }).join('');
    const toolbar = `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">${goldBtn('📤 ייצוא מותגים EN',`exportBrandsForTranslation('en')`)}${goldBtn('📤 ייצוא מותגים RU',`exportBrandsForTranslation('ru')`)}${goldBtn('📥 ייבוא תרגומי מותגים',`openBrandImportModal()`)}</div>`;
    return `${toolbar}<table style="width:100%;border-collapse:collapse;font-size:.9rem"><thead><tr style="border-bottom:2px solid #e5e5e5;text-align:right"><th style="padding:8px">מותג</th><th>עברית</th>${langs.map(l=>`<th>${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table>`;
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
      _loaded = false;
      if (window.StudioRefresh) await StudioRefresh.afterAction(Promise.resolve(), 'התרגום הושלם');
      else { Toast.success('התרגום הושלם'); await init(containerId); }
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
    if(p) p.textContent='הושלם!';
    _loaded=false;
    if (window.StudioRefresh) await StudioRefresh.afterAction(Promise.resolve(), `תורגמו ${todo.length} עמודים`);
    else { Toast.success(`תורגמו ${todo.length} עמודים`); await init(containerId); }
  }

  async function translateBrand(id) {
    const b = brandsData.find(x=>x.id===id); if(!b) return;
    if (!brandHasHebrew(b)) { Toast.error('אין תוכן בעברית לתרגום'); return; }
    showTranslating(true);
    const errs = [];
    for (const l of supported()) {
      for (const f of BRAND_FIELDS) {
        if(!b[f]) continue;
        try { await callTranslateAPI('translate_text',{text:b[f],target_lang:l,context:'brand_'+f,entity_type:'brand',entity_id:id,field_name:f}); }
        catch(e){ console.error('translateBrand', l, f, e); errs.push(`${LANGS[l]?.name||l}/${f}: ${e.message}`); }
      }
    }
    showTranslating(false);
    if (errs.length) { Toast.error('שגיאות בתרגום: ' + errs.slice(0,2).join(' | ')); }
    else { Toast.success('הושלם'); }
    _loaded=false; await init(containerId);
  }

  const BRAND_LABELS = { brand_description:'תיאור', brand_description_short:'תיאור קצר', seo_title:'SEO Title', seo_description:'SEO Description' };
  function openBrandEditor(brandId) {
    const b = brandsData.find(x => x.id === brandId); if (!b) return;
    const cur = (l, f) => (brandTr.find(x => x.entity_id===brandId && x.field_name===f && x.lang===l)?.value) || '';
    const body = `<div style="max-height:70vh;overflow-y:auto">${supported().map(l => `<fieldset style="border:1px solid #e5e5e5;border-radius:10px;padding:12px;margin-bottom:12px"><legend style="font-weight:700;padding:0 6px">${LANGS[l]?.flag||''} ${LANGS[l]?.name||l}</legend>${BRAND_FIELDS.map(f => `<label style="display:block;margin-bottom:8px"><span style="font-size:.75rem;color:#6b7280;display:block;margin-bottom:2px">${BRAND_LABELS[f]}<br><span style="color:#9ca3af">עברית: ${escapeHtml((b[f]||'').slice(0,120))}${(b[f]||'').length>120?'…':''}</span></span><textarea data-bedit-lang="${l}" data-bedit-field="${f}" rows="${f.includes('description')?3:1}" style="width:100%;padding:8px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;font-size:.85rem">${escapeHtml(cur(l,f))}</textarea></label>`).join('')}<button class="btn btn-sm" onclick="StudioTranslations.saveBrandTranslation('${brandId}','${l}')" style="background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;padding:6px 14px">שמור ${LANGS[l]?.name||l}</button> <button class="btn btn-sm" onclick="StudioTranslations.deleteBrandTranslation('${brandId}','${l}')" style="border:1px solid #fca5a5;color:#A32D2D;background:transparent;padding:6px 14px;margin-inline-start:8px">🗑 מחק תרגום</button></fieldset>`).join('')}</div>`;
    Modal.show({ title: 'עריכת תרגום מותג: ' + b.name, size: 'lg', content: body, footer: '<button class="btn btn-ghost" onclick="Modal.close()">סגור</button>' });
  }
  async function saveBrandTranslation(brandId, lang) {
    const b = brandsData.find(x => x.id === brandId); if (!b) return;
    const tid = getTenantId();
    try {
      for (const f of BRAND_FIELDS) {
        const ta = document.querySelector(`textarea[data-bedit-lang="${lang}"][data-bedit-field="${f}"]`);
        if (!ta) continue;
        const value = ta.value.trim(); if (!value) continue;
        const { error: ctErr } = await sb.from('content_translations').upsert({ tenant_id: tid, entity_type: 'brand', entity_id: brandId, field_name: f, lang, value, status: 'approved', translated_by: 'human', confidence: 1.0, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,entity_type,entity_id,field_name,lang' });
        if (ctErr) throw ctErr;
        if (b[f]) await sb.from('translation_memory').insert({ tenant_id: tid, source_lang: 'he', target_lang: lang, source_text: b[f], translated_text: value, context: 'brand_' + f, scope: 'tenant', confidence: 1.0, approved_by: 'human' });
      }
      Toast.success(`נשמר ${LANGS[lang]?.name||lang}`);
      _loaded = false; await loadAll(); render();
    } catch (e) { Toast.error('שגיאה בשמירה: ' + e.message); console.error(e); }
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

  async function manualTranslate(srcId, lang) {
    const tid = getTenantId();
    // Check if translated page already exists
    const row = dashData.find(r => r.he_page_id === srcId);
    if (row && row[lang + '_page_id']) {
      StudioTranslationEditor.open(srcId, lang);
      return;
    }
    // Create page with Hebrew blocks copied as-is
    try {
      const { data: src, error: srcErr } = await sb.from('storefront_pages')
        .select('blocks,title,slug,meta_title,meta_description')
        .eq('id', srcId).eq('tenant_id', tid).single();
      if (srcErr || !src) { Toast.error('עמוד מקור לא נמצא'); return; }

      const { error: rpcErr } = await sb.rpc('create_translated_page', {
        p_tenant_id: tid, p_source_page_id: srcId, p_target_lang: lang,
        p_translated_blocks: src.blocks, p_title: src.title, p_slug: src.slug,
        p_meta_title: src.meta_title, p_meta_description: src.meta_description,
      });
      if (rpcErr) { Toast.error('שגיאה ביצירת עמוד: ' + rpcErr.message); return; }

      _loaded = false;
      await loadAll();
      StudioTranslationEditor.open(srcId, lang);
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  }

  async function reload() { _loaded=false; await init(containerId); }

  // ── Delete translations ──
  async function deletePageTranslation(pageId, lang, label) {
    if (lang === 'he') { Toast.error('לא ניתן למחוק את מקור העברית'); return; }
    if (!confirm(`האם למחוק את התרגום ל-${LANGS[lang]?.name||lang} של "${label}"?`)) return;
    try {
      const { error } = await sb.from('storefront_pages')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', pageId).eq('tenant_id', getTenantId()).neq('lang', 'he');
      if (error) throw error;
      Toast.success('התרגום נמחק');
      _loaded = false; await init(containerId);
    } catch (e) { Toast.error('שגיאה: ' + e.message); console.error(e); }
  }

  async function deleteBrandTranslation(brandId, lang) {
    if (lang === 'he') { Toast.error('לא ניתן למחוק את מקור העברית'); return; }
    const b = brandsData.find(x => x.id === brandId);
    const name = b?.name || '';
    if (!confirm(`האם למחוק את התרגום ל-${LANGS[lang]?.name||lang} של "${name}"?`)) return;
    try {
      const { error } = await sb.from('content_translations').delete()
        .eq('tenant_id', getTenantId())
        .eq('entity_type', 'brand')
        .eq('entity_id', brandId)
        .eq('lang', lang);
      if (error) throw error;
      Toast.success('התרגום נמחק');
      Modal.close();
      _loaded = false; await loadAll(); render();
    } catch (e) { Toast.error('שגיאה: ' + e.message); console.error(e); }
  }

  return { init, setSubTab, translatePage, manualTranslate, bulkTranslate, translateBrand, openBrandEditor, saveBrandTranslation, saveOverride, toggleAuto, togglePublish, callTranslateAPI, reload, deletePageTranslation, deleteBrandTranslation, get glossaryData(){ return glossaryData; } };
})();
