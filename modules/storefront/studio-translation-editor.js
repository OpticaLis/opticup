// studio-translation-editor.js — Side-by-side translation editor (i18n Phase 3)
// Opens for a single page: source (Hebrew) left, translation right.
// Block-by-block editing with per-block translate button.

const StudioTranslationEditor = (function () {

  // Translatable fields map (mirrored from storefront translation-field-maps.ts)
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

  let sourcePage = null, targetPage = null, targetLang = null;

  async function open(sourcePageId, lang) {
    targetLang = lang;
    const tid = getTenantId();
    // Load source page
    const { data: src } = await sb.from('v_admin_pages').select('*').eq('id', sourcePageId).single();
    if (!src) { Toast.error('עמוד מקור לא נמצא'); return; }
    sourcePage = src;
    // Load target page: try translation_group_id first, fallback to slug+lang
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

  function renderEditor() {
    const el = document.getElementById('studio-translations-content');
    if (!el) return;
    const langName = targetLang === 'en' ? 'English' : targetLang === 'ru' ? 'Русский' : targetLang;
    const status = targetPage?.translation_status || 'missing';
    const stBg = { source:'#EAF3DE', approved:'#EAF3DE', translated:'#E1F5EE', draft:'#F1EFE8', needs_update:'#FAEEDA', missing:'#FCEBEB' };
    const stFg = { source:'#3B6D11', approved:'#3B6D11', translated:'#085041', draft:'#5F5E5A', needs_update:'#854F0B', missing:'#A32D2D' };

    const srcBlocks = sourcePage?.blocks || [];
    const tgtBlocks = targetPage?.blocks || [];

    let html = `<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="StudioTranslationEditor.close()" style="font-size:.85rem">← חזרה לדשבורד</button>
      <span style="font-weight:700;font-size:1.1rem">תרגום: ${escapeHtml(sourcePage?.title||'')}</span>
      <span style="padding:2px 8px;border-radius:6px;font-size:.75rem;font-weight:600;background:${stBg[status]||stBg.missing};color:${stFg[status]||stFg.missing}">${status}</span>
      <span style="font-size:.85rem;color:#6b7280">→ ${langName}</span>
      <div style="margin-right:auto;display:flex;gap:6px">
        <button class="btn btn-sm" onclick="StudioTranslationEditor.translateAll()" style="background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600">🤖 תרגם הכל</button>
        <button class="btn btn-sm" onclick="StudioTranslationEditor.saveDraft()">שמור טיוטה</button>
        <button class="btn btn-sm btn-primary" onclick="StudioTranslationEditor.publish()">אשר ופרסם</button>
      </div></div>`;

    // SEO section
    html += renderSEO();
    // Blocks
    for (let i = 0; i < srcBlocks.length; i++) {
      html += renderBlock(i, srcBlocks[i], tgtBlocks[i] || {});
    }
    el.innerHTML = html;
  }

  function renderSEO() {
    const dir = targetLang === 'he' ? 'rtl' : 'ltr';
    return `<div style="border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin-bottom:12px">
      <h4 style="margin:0 0 12px">SEO</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="background:#f9f9f9;padding:12px;border-radius:8px">
          <div style="font-size:.8rem;font-weight:600;color:#6b7280;margin-bottom:8px">עברית (מקור)</div>
          <div style="font-size:.85rem;margin-bottom:4px"><b>כותרת:</b> ${escapeHtml(sourcePage?.meta_title||sourcePage?.title||'')}</div>
          <div style="font-size:.85rem;margin-bottom:4px"><b>תיאור:</b> ${escapeHtml(sourcePage?.meta_description||'')}</div>
          <div style="font-size:.85rem"><b>Slug:</b> ${escapeHtml(sourcePage?.slug||'')}</div>
        </div>
        <div>
          <div style="font-size:.8rem;font-weight:600;color:#6b7280;margin-bottom:8px">תרגום</div>
          <label style="font-size:.8rem;display:block;margin-bottom:2px">כותרת SEO</label>
          <input id="te-seo-title" dir="${dir}" value="${escapeHtml(targetPage?.meta_title||'')}" style="width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;margin-bottom:8px">
          <label style="font-size:.8rem;display:block;margin-bottom:2px">תיאור SEO</label>
          <input id="te-seo-desc" dir="${dir}" value="${escapeHtml(targetPage?.meta_description||'')}" style="width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;margin-bottom:8px">
          <label style="font-size:.8rem;display:block;margin-bottom:2px">Slug</label>
          <input id="te-slug" dir="ltr" value="${escapeHtml(targetPage?.slug||sourcePage?.slug||'')}" style="width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;margin-bottom:8px">
          <label style="font-size:.8rem;display:flex;align-items:center;gap:6px"><input type="checkbox" id="te-noindex" ${targetPage?.noindex?'checked':''}> noindex (אל תאנדקס בגוגל)</label>
        </div>
      </div></div>`;
  }

  function renderBlock(idx, src, tgt) {
    const type = src.type || 'unknown';
    const fields = TF[type] || [];
    const arrayFields = TAF[type] || {};
    const data = src.data || {};
    const tData = tgt.data || {};
    const dir = targetLang === 'he' ? 'rtl' : 'ltr';
    const isStale = targetPage?.stale_blocks?.includes(src.id);

    let rows = '';
    // Top-level fields
    for (const f of fields) {
      const val = data[f]; if (val === undefined || val === null || val === '') continue;
      const isLong = typeof val === 'string' && (val.length > 100 || f === 'body' || f === 'html');
      rows += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
        <div style="background:#f9f9f9;padding:8px;border-radius:6px;font-size:.85rem;white-space:pre-wrap;max-height:150px;overflow-y:auto">${escapeHtml(String(val)).substring(0, 500)}</div>
        ${isLong
          ? `<textarea id="te-b${idx}-${f}" dir="${dir}" style="width:100%;min-height:80px;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;font-size:.85rem;resize:vertical">${escapeHtml(tData[f]||'')}</textarea>`
          : `<input id="te-b${idx}-${f}" dir="${dir}" value="${escapeHtml(tData[f]||'')}" style="width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;font-size:.85rem">`
        }</div>`;
    }
    // Array fields
    for (const [arrName, arrFields] of Object.entries(arrayFields)) {
      const items = data[arrName]; if (!Array.isArray(items)) continue;
      const tItems = tData[arrName] || [];
      for (let j = 0; j < items.length; j++) {
        for (const af of arrFields) {
          const val = items[j]?.[af]; if (!val) continue;
          rows += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
            <div style="background:#f9f9f9;padding:8px;border-radius:6px;font-size:.85rem">${escapeHtml(String(val))}</div>
            <input id="te-b${idx}-${arrName}-${j}-${af}" dir="${dir}" value="${escapeHtml(tItems[j]?.[af]||'')}" style="width:100%;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;font-family:inherit;font-size:.85rem">
          </div>`;
        }
      }
    }

    if (!rows) rows = '<div style="font-size:.85rem;color:#6b7280;padding:8px">אין שדות לתרגום</div>';

    return `<div style="border:1px solid ${isStale?'#FAEEDA':'#e5e5e5'};border-radius:10px;padding:12px;margin-bottom:8px${isStale?';background:#fffdf5':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:.9rem">בלוק ${idx+1}: ${type}</span>
        ${isStale?'<span style="font-size:.75rem;color:#854F0B">⚠ השתנה מאז התרגום האחרון</span>':''}
        <button class="btn btn-sm" onclick="StudioTranslationEditor.translateBlock(${idx})" style="font-size:.75rem;padding:2px 8px;background:linear-gradient(135deg,#c9a555,#e8da94);border:none;color:#1a1a1a;font-weight:600">🤖 תרגם בלוק</button>
      </div>${rows}</div>`;
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
        if (el) tgtBlocks[i].data[f] = el.value;
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

  // ── Save Draft ──
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
        const title = document.getElementById('te-seo-title')?.value || sourcePage?.title || '';
        const { data, error } = await sb.rpc('create_translated_page', {
          p_tenant_id: tid, p_source_page_id: sourcePage.id, p_target_lang: targetLang,
          p_translated_blocks: blocks, p_title: title, p_slug: slug,
          p_meta_title: seoTitle, p_meta_description: seoDesc,
        });
        if (error) throw error;
        // Update status after creation
        if (data) {
          await sb.from('storefront_pages').update({ status: pubStatus, translation_status: transStatus, noindex }).eq('id', data);
        }
      }
      // Save to translation memory
      if (transStatus === 'approved') await saveToMemory(blocks);
      Toast.success(pubStatus === 'published' ? 'פורסם בהצלחה' : 'טיוטה נשמרה');
      close();
    } catch (e) { console.error('Save translation:', e); Toast.error('שגיאה: ' + e.message); }
  }

  async function saveToMemory(blocks) {
    const srcBlocks = sourcePage?.blocks || [];
    const pairs = [];
    for (let i = 0; i < srcBlocks.length; i++) {
      const type = srcBlocks[i].type;
      for (const f of (TF[type]||[])) {
        const src = srcBlocks[i].data?.[f]; const tgt = blocks[i]?.data?.[f];
        if (src && tgt && src !== tgt) pairs.push({ source_text: src, translated_text: tgt, context: 'block_' + type + '.' + f });
      }
    }
    if (!pairs.length) return;
    try {
      await sb.rpc('save_translation_memory_batch', {
        p_tenant_id: getTenantId(), p_source_lang: 'he', p_target_lang: targetLang,
        p_pairs: pairs, p_approved_by: 'human', p_confidence: 1.0,
      });
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
        <div style="font-size:.85rem;color:#6b7280;margin-top:4px">העיבוד עשוי לקחת 10-30 שניות</div>
      </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
      document.body.appendChild(ov);
    } else { if (ov) ov.remove(); }
  }

  // ── Translate block via AI ──
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
          if (el && td[f]) el.value = td[f];
        }
        // Also fill array fields
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
      Toast.success('התרגום הושלם — טוען מחדש...');
      await open(sourcePage.id, targetLang);
    } catch (e) { Toast.error('שגיאה: ' + e.message); } finally { showTranslating(false); }
  }

  return { open, close, saveDraft, publish, translateBlock, translateAll };
})();
