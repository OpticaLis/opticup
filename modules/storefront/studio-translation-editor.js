// studio-translation-editor.js — Side-by-side translation editor (i18n Phase 3)
// Layout: Translation (LEFT, white) | Source (RIGHT, gray)

const StudioTranslationEditor = (function () {

  const TF = {
    hero:['title','subtitle','cta_text','status_text'], text:['body','title'], gallery:[], video:['section_title','subtitle'],
    products:['section_title','default_badge_text'], cta:['text','description','popup_form_title','popup_submit_text','popup_success_message'],
    lead_form:['title','submit_text','success_message'], faq:['section_title'],
    contact:['section_title','banner_title','banner_subtitle','address','hours','cta_text'],
    banner:['title','text','cta_text'], columns:['section_title'], steps:['section_title'],
    brands:['section_title'], blog_carousel:['section_title'], reviews:['section_title'],
    sticky_bar:['text','secondary_text','cta_text'], trust_badges:['section_title'], divider:[],
    custom:['html'], campaign_tiers:['title','subtitle','cta_text','cta_whatsapp_message','disclaimer_text'],
    campaign_cards:['title','subtitle','cta_text','cta_whatsapp_message','disclaimer_text','price_override_text'],
  };
  const TAF = {
    gallery:{images:['alt','caption']}, video:{videos:['title']}, faq:{items:['question','answer']},
    steps:{items:['title','description']}, columns:{items:['title','text']}, trust_badges:{badges:['title','text']},
    cta:{popup_form_fields:['label']}, lead_form:{fields:['label','placeholder']}, contact:{form_fields:['label','placeholder']},
    campaign_tiers:{tiers:['badge_text','price_label','brands_secondary_label','bottom_badge_text','cta_text']},
    campaign_cards:{products:['badge_start','badge_end']},
  };
  const HTML_FIELDS = new Set(['body','html','text','description','answer']);

  let sourcePage = null, targetPage = null, targetLang = null;

  async function open(sourcePageId, lang) {
    targetLang = lang;
    const tid = getTenantId();
    const { data: src } = await sb.from('v_admin_pages').select('*').eq('id', sourcePageId).single();
    if (!src) { Toast.error('עמוד מקור לא נמצא'); return; }
    sourcePage = src;
    targetPage = null;
    if (src.translation_group_id) {
      const { data: tgt } = await sb.from('v_admin_pages').select('*')
        .eq('translation_group_id', src.translation_group_id).eq('lang', lang).eq('tenant_id', tid).single();
      if (tgt) targetPage = tgt;
    }
    if (!targetPage && src.slug) {
      const { data: tgt } = await sb.from('v_admin_pages').select('*')
        .eq('slug', src.slug).eq('lang', lang).eq('tenant_id', tid).single();
      if (tgt) targetPage = tgt;
    }
    renderEditor();
  }

  function close() {
    const el = document.getElementById('studio-translations-content');
    if (el) el.innerHTML = '';
    StudioTranslations.init('studio-translations-content');
  }

  // ── Styles ──
  const S = {
    grid: 'display:grid;grid-template-columns:1fr 1fr;',
    srcCol: 'background:#f5f5f5;padding:12px;border-radius:8px;',
    tgtCol: 'padding:12px;border-right:3px solid #c9a555;border-radius:8px;',
    srcHead: 'background:#eee;padding:8px 12px;font-weight:700;font-size:.85rem;color:#6b7280;border-radius:8px 8px 0 0;',
    tgtHead: 'background:#fff;padding:8px 12px;font-weight:700;font-size:.85rem;color:#1a1a1a;border-right:3px solid #c9a555;border-radius:8px 8px 0 0;',
    rendered: 'font-size:.85rem;line-height:1.6;max-height:200px;overflow-y:auto;padding:8px;',
    input: 'width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;font-size:.85rem;',
    gold: 'background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600;',
  };

  function renderEditor() {
    const el = document.getElementById('studio-translations-content'); if (!el) return;
    const langName = targetLang === 'en' ? 'English' : targetLang === 'ru' ? 'Русский' : targetLang;
    const status = targetPage?.translation_status || 'missing';
    const stBg = { source:'#EAF3DE',approved:'#EAF3DE',translated:'#E1F5EE',draft:'#F1EFE8',needs_update:'#FAEEDA',missing:'#FCEBEB' };
    const stFg = { source:'#3B6D11',approved:'#3B6D11',translated:'#085041',draft:'#5F5E5A',needs_update:'#854F0B',missing:'#A32D2D' };
    const srcBlocks = sourcePage?.blocks || [], tgtBlocks = targetPage?.blocks || [];

    let h = `<div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="StudioTranslationEditor.close()">← חזרה</button>
      <span style="font-weight:700;font-size:1.05rem">תרגום: ${escapeHtml(sourcePage?.title||'')}</span>
      <span style="padding:2px 8px;border-radius:6px;font-size:.75rem;font-weight:600;background:${stBg[status]||stBg.missing};color:${stFg[status]||stFg.missing}">${status}</span>
      <span style="font-size:.85rem;color:#6b7280">→ ${langName}</span>
      <div style="margin-right:auto;display:flex;gap:6px">
        <button class="btn btn-sm" onclick="StudioTranslationEditor.translateAll()" style="${S.gold}">🤖 תרגם הכל</button>
        <button class="btn btn-sm" onclick="StudioTranslationEditor.saveDraft()">שמור טיוטה</button>
        <button class="btn btn-sm btn-primary" onclick="StudioTranslationEditor.publish()">אשר ופרסם</button>
      </div></div>`;

    // Column headers
    h += `<div style="${S.grid}gap:0;margin-bottom:0">
      <div style="${S.tgtHead}">🌐 תרגום (${langName})</div>
      <div style="${S.srcHead}">📄 מקור (עברית)</div></div>`;
    h += renderSEO();
    for (let i = 0; i < srcBlocks.length; i++) h += renderBlock(i, srcBlocks[i], tgtBlocks[i] || {});
    el.innerHTML = h;
  }

  function renderSEO() {
    const dir = targetLang === 'he' ? 'rtl' : 'ltr';
    return `<div style="${S.grid}gap:0;border:1px solid #e5e5e5;border-radius:0 0 10px 10px;margin-bottom:12px">
      <div style="${S.tgtCol}">
        <div style="font-size:.8rem;font-weight:600;margin-bottom:6px">SEO תרגום</div>
        <label style="font-size:.78rem">כותרת</label>
        <input id="te-seo-title" dir="${dir}" value="${escapeHtml(targetPage?.meta_title||'')}" style="${S.input}margin-bottom:6px">
        <label style="font-size:.78rem">תיאור</label>
        <input id="te-seo-desc" dir="${dir}" value="${escapeHtml(targetPage?.meta_description||'')}" style="${S.input}margin-bottom:6px">
        <label style="font-size:.78rem">Slug</label>
        <input id="te-slug" dir="ltr" value="${escapeHtml(targetPage?.slug||sourcePage?.slug||'')}" style="${S.input}margin-bottom:6px">
        <label style="font-size:.78rem;display:flex;align-items:center;gap:6px"><input type="checkbox" id="te-noindex" ${targetPage?.noindex?'checked':''}> noindex</label>
      </div>
      <div style="${S.srcCol}">
        <div style="font-size:.8rem;font-weight:600;margin-bottom:6px">SEO מקור</div>
        <div style="font-size:.85rem;margin-bottom:4px" dir="rtl"><b>כותרת:</b> ${escapeHtml(sourcePage?.meta_title||sourcePage?.title||'')}</div>
        <div style="font-size:.85rem;margin-bottom:4px" dir="rtl"><b>תיאור:</b> ${escapeHtml(sourcePage?.meta_description||'')}</div>
        <div style="font-size:.85rem"><b>Slug:</b> ${escapeHtml(sourcePage?.slug||'')}</div>
      </div></div>`;
  }

  function renderBlock(idx, src, tgt) {
    const type = src.type || 'unknown', fields = TF[type] || [], arrayFields = TAF[type] || {};
    const data = src.data || {}, tData = tgt.data || {};
    const dir = targetLang === 'he' ? 'rtl' : 'ltr';
    const isStale = targetPage?.stale_blocks?.includes(src.id);
    const staleMark = isStale ? '<span style="font-size:.7rem;color:#854F0B;margin-right:6px">⚠ שונה</span>' : '';

    let tgtRows = '', srcRows = '';
    for (const f of fields) {
      const val = data[f]; if (val === undefined || val === null || val === '') continue;
      const tVal = tData[f] || '';
      const isHtml = HTML_FIELDS.has(f) && typeof val === 'string' && (val.includes('<') || val.length > 100);
      // Source side — render HTML visually
      srcRows += `<div style="margin-bottom:8px">
        <div style="font-size:.75rem;color:#999;margin-bottom:2px">${f}</div>
        <div style="${S.rendered}${isHtml?'':'white-space:pre-wrap;'}" dir="rtl">${isHtml ? val : escapeHtml(String(val).substring(0, 500))}</div></div>`;
      // Translation side
      if (isHtml) {
        const teId = `te-b${idx}-${f}`;
        tgtRows += `<div style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span style="font-size:.75rem;color:#999">${f}</span>
            <button class="btn btn-sm" onclick="StudioTranslationEditor.toggleRaw('${teId}')" style="font-size:.7rem;padding:1px 6px">✏️ HTML</button>
          </div>
          <div id="${teId}-preview" style="${S.rendered}" dir="${dir}">${tVal || '<span style=color:#999>—</span>'}</div>
          <textarea id="${teId}" dir="${dir}" style="${S.input}min-height:80px;resize:vertical;display:none">${escapeHtml(tVal)}</textarea></div>`;
      } else {
        tgtRows += `<div style="margin-bottom:8px">
          <div style="font-size:.75rem;color:#999;margin-bottom:2px">${f}</div>
          <input id="te-b${idx}-${f}" dir="${dir}" value="${escapeHtml(tVal)}" style="${S.input}"></div>`;
      }
    }
    // Array fields
    for (const [arrName, arrFields] of Object.entries(arrayFields)) {
      const items = data[arrName]; if (!Array.isArray(items)) continue;
      const tItems = tData[arrName] || [];
      for (let j = 0; j < items.length; j++) {
        for (const af of arrFields) {
          const val = items[j]?.[af]; if (!val) continue;
          srcRows += `<div style="margin-bottom:6px"><div style="font-size:.7rem;color:#999">${arrName}[${j}].${af}</div>
            <div style="font-size:.85rem;padding:4px 0" dir="rtl">${escapeHtml(String(val))}</div></div>`;
          tgtRows += `<div style="margin-bottom:6px"><div style="font-size:.7rem;color:#999">${arrName}[${j}].${af}</div>
            <input id="te-b${idx}-${arrName}-${j}-${af}" dir="${dir}" value="${escapeHtml(tItems[j]?.[af]||'')}" style="${S.input}"></div>`;
        }
      }
    }
    if (!srcRows) srcRows = '<div style="font-size:.85rem;color:#999;padding:8px">אין שדות</div>';
    if (!tgtRows) tgtRows = '<div style="font-size:.85rem;color:#999;padding:8px">אין שדות לתרגום</div>';

    return `<div style="border:1px solid ${isStale?'#FAEEDA':'#e5e5e5'};border-radius:10px;margin-bottom:8px;overflow:hidden${isStale?';background:#fffdf5':''}">
      <div style="${S.grid}gap:0">
        <div style="padding:6px 12px;background:#fff;border-bottom:1px solid #e5e5e5;border-right:3px solid #c9a555;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:600;font-size:.85rem">בלוק ${idx+1}: ${type} ${staleMark}</span>
          <button class="btn btn-sm" onclick="StudioTranslationEditor.translateBlock(${idx})" style="font-size:.7rem;padding:2px 8px;${S.gold}">🤖</button>
        </div>
        <div style="padding:6px 12px;background:#eee;border-bottom:1px solid #e5e5e5;font-weight:600;font-size:.85rem;color:#6b7280">בלוק ${idx+1}: ${type}</div>
      </div>
      <div style="${S.grid}gap:0"><div style="${S.tgtCol}">${tgtRows}</div><div style="${S.srcCol}">${srcRows}</div></div></div>`;
  }

  function toggleRaw(teId) {
    const preview = document.getElementById(teId + '-preview');
    const textarea = document.getElementById(teId);
    if (!preview || !textarea) return;
    if (textarea.style.display === 'none') {
      textarea.style.display = ''; preview.style.display = 'none';
      textarea.value = preview.innerHTML;
    } else {
      preview.innerHTML = textarea.value; preview.style.display = ''; textarea.style.display = 'none';
    }
  }

  // ── Collect translated data from form ──
  function collectBlocks() {
    const srcBlocks = sourcePage?.blocks || [];
    const tgtBlocks = JSON.parse(JSON.stringify(targetPage?.blocks || srcBlocks));
    for (let i = 0; i < srcBlocks.length; i++) {
      const type = srcBlocks[i].type;
      if (!tgtBlocks[i]) tgtBlocks[i] = JSON.parse(JSON.stringify(srcBlocks[i]));
      if (!tgtBlocks[i].data) tgtBlocks[i].data = {};
      for (const f of (TF[type]||[])) {
        const el = document.getElementById(`te-b${i}-${f}`);
        if (!el) continue;
        // For HTML toggle fields, get from textarea (may be hidden) or preview
        const preview = document.getElementById(`te-b${i}-${f}-preview`);
        if (preview && el.style.display === 'none') tgtBlocks[i].data[f] = preview.innerHTML;
        else tgtBlocks[i].data[f] = el.value;
      }
      for (const [arrName, arrFields] of Object.entries(TAF[type]||{})) {
        const items = srcBlocks[i].data?.[arrName];
        if (!Array.isArray(items)) continue;
        if (!tgtBlocks[i].data[arrName]) tgtBlocks[i].data[arrName] = JSON.parse(JSON.stringify(items));
        for (let j = 0; j < items.length; j++) {
          for (const af of arrFields) {
            const el = document.getElementById(`te-b${i}-${arrName}-${j}-${af}`);
            if (el && tgtBlocks[i].data[arrName][j]) tgtBlocks[i].data[arrName][j][af] = el.value;
          }
        }
      }
    }
    return tgtBlocks;
  }

  // ── Save ──
  async function saveDraft() { await savePageTranslation('draft', 'draft'); }
  async function publish() { await savePageTranslation('published', 'approved'); }

  async function savePageTranslation(pubStatus, transStatus) {
    const blocks = collectBlocks();
    const seoTitle = document.getElementById('te-seo-title')?.value || '';
    const seoDesc = document.getElementById('te-seo-desc')?.value || '';
    const slug = document.getElementById('te-slug')?.value || sourcePage?.slug || '';
    const noindex = document.getElementById('te-noindex')?.checked || false;
    const tid = getTenantId();
    try {
      if (targetPage) {
        const { error } = await sb.from('storefront_pages').update({
          blocks, meta_title: seoTitle, meta_description: seoDesc, slug, noindex,
          status: pubStatus, translation_status: transStatus, stale_since: null, stale_blocks: null, updated_at: new Date().toISOString(),
        }).eq('id', targetPage.id);
        if (error) throw error;
      } else {
        const title = seoTitle || sourcePage?.title || '';
        const { data, error } = await sb.rpc('create_translated_page', {
          p_tenant_id: tid, p_source_page_id: sourcePage.id, p_target_lang: targetLang,
          p_translated_blocks: blocks, p_title: title, p_slug: slug,
          p_meta_title: seoTitle, p_meta_description: seoDesc,
        });
        if (error) throw error;
        if (data) await sb.from('storefront_pages').update({ status: pubStatus, translation_status: transStatus, noindex }).eq('id', data);
      }
      if (transStatus === 'approved') await saveToMemory(blocks);
      const msg = pubStatus === 'published' ? 'פורסם בהצלחה' : 'טיוטה נשמרה';
      close();
      if (window.StudioRefresh) await StudioRefresh.afterAction(Promise.resolve(), msg);
      else Toast.success(msg);
    } catch (e) { console.error('Save translation:', e); Toast.error('שגיאה: ' + e.message); }
  }

  async function saveToMemory(blocks) {
    const srcBlocks = sourcePage?.blocks || [], pairs = [];
    for (let i = 0; i < srcBlocks.length; i++) {
      const type = srcBlocks[i].type;
      for (const f of (TF[type]||[])) {
        const src = srcBlocks[i].data?.[f], tgt = blocks[i]?.data?.[f];
        if (src && tgt && src !== tgt) pairs.push({ source_text: src, translated_text: tgt, context: 'block_' + type + '.' + f });
      }
    }
    if (!pairs.length) return;
    const rows = pairs.map(p => ({
      tenant_id: getTenantId(), source_lang: 'he', target_lang: targetLang,
      source_text: p.source_text, translated_text: p.translated_text,
      context: p.context || 'general', scope: 'tenant', confidence: 1.0,
      approved_by: 'human', times_used: 0,
    }));
    try {
      const { error } = await sb.from('translation_memory').upsert(rows, {
        onConflict: 'tenant_id,source_lang,target_lang,source_text', ignoreDuplicates: false,
      });
      if (error) throw error;
    } catch (e) { console.error('Save memory:', e); }
  }

  // ── Loading overlay ──
  function showTranslating(on) {
    let ov = document.getElementById('te-loading');
    if (on) {
      if (ov) return;
      ov = document.createElement('div'); ov.id = 'te-loading';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999';
      ov.innerHTML = `<div style="background:#fff;border-radius:12px;padding:32px 48px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)">
        <div style="width:40px;height:40px;border:4px solid #e5e5e5;border-top-color:#c9a555;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
        <div style="font-size:1.1rem;font-weight:600">מתרגם...</div>
        <div style="font-size:.85rem;color:#6b7280;margin-top:4px">10-30 שניות</div>
      </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(ov);
    } else { if (ov) ov.remove(); }
  }

  // ── AI translate ──
  async function translateBlock(idx) {
    const srcBlock = sourcePage?.blocks?.[idx]; if (!srcBlock) return;
    showTranslating(true);
    try {
      const result = await StudioTranslations.callTranslateAPI('translate_blocks', {
        blocks: [srcBlock], target_lang: targetLang,
      });
      if (result?.translated_blocks?.[0]?.data) {
        const td = result.translated_blocks[0].data;
        for (const f of (TF[srcBlock.type]||[])) {
          const el = document.getElementById(`te-b${idx}-${f}`);
          const preview = document.getElementById(`te-b${idx}-${f}-preview`);
          if (el && td[f] !== undefined) { el.value = td[f]; if (preview) preview.innerHTML = td[f]; }
        }
        for (const [arrName, arrFields] of Object.entries(TAF[srcBlock.type]||{})) {
          const tItems = td[arrName]; if (!Array.isArray(tItems)) continue;
          for (let j = 0; j < tItems.length; j++) {
            for (const af of arrFields) {
              const el = document.getElementById(`te-b${idx}-${arrName}-${j}-${af}`);
              if (el && tItems[j]?.[af]) el.value = tItems[j][af];
            }
          }
        }
      }
      Toast.success('בלוק תורגם');
    } catch (e) { Toast.error('שגיאה: ' + e.message); } finally { showTranslating(false); }
  }

  async function translateAll() {
    showTranslating(true);
    try {
      await StudioTranslations.callTranslateAPI('translate_page', {
        source_page_id: sourcePage.id, target_lang: targetLang,
      });
      Toast.success('התרגום הושלם');
      await open(sourcePage.id, targetLang);
    } catch (e) { Toast.error('שגיאה: ' + e.message); } finally { showTranslating(false); }
  }

  return { open, close, saveDraft, publish, translateBlock, translateAll, toggleRaw };
})();
