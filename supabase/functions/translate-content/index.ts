/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  TRANSLATABLE_FIELDS,
  TRANSLATABLE_ARRAY_FIELDS,
} from './field-maps.ts';
import {
  extractShortcodes,
  collectShortcodeTexts,
  applyTranslatedShortcodes,
  reinsertShortcodes,
} from './shortcode-handler.ts';
import {
  LANG_NAMES,
  loadContext,
  buildSystemPrompt,
  checkMemory,
  saveMemoryBatch,
  callClaude,
  setNestedValue,
  parseClaudeJson,
} from './translation-utils.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonRes(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errRes(message: string, status: number): Response {
  return jsonRes({ error: message, success: false }, status);
}

// ─── Strip RTL artifacts from translated HTML ───────────────
function cleanRtlForLtr(html: string, targetLang: string): string {
  if (targetLang === 'he') return html;
  return html
    .replace(/\s*class="ql-direction-rtl"/g, '')
    .replace(/\s*dir="rtl"/g, '');
}

// ─── Extract translatable text from blocks ───────────────────

interface TextEntry { path: string; text: string }

function extractBlockTexts(blocks: any[]): TextEntry[] {
  const entries: TextEntry[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockType = block.type || 'unknown';
    const data = block.data || {};

    // Top-level fields
    const fields = TRANSLATABLE_FIELDS[blockType] ?? [];
    for (const field of fields) {
      const val = data[field];
      if (typeof val === 'string' && val.trim()) {
        entries.push({ path: `blocks.${i}.data.${field}`, text: val });
      }
    }

    // Array fields
    const arrayFields = TRANSLATABLE_ARRAY_FIELDS[blockType] ?? {};
    for (const [arrayKey, subFields] of Object.entries(arrayFields)) {
      const arr = data[arrayKey];
      if (!Array.isArray(arr)) continue;
      for (let j = 0; j < arr.length; j++) {
        const item = arr[j];
        if (!item || typeof item !== 'object') continue;
        for (const sf of subFields) {
          const val = item[sf];
          if (typeof val === 'string' && val.trim()) {
            entries.push({ path: `blocks.${i}.data.${arrayKey}.${j}.${sf}`, text: val });
          }
        }
        // String array fields (e.g. features in campaign_tiers)
        if (blockType === 'campaign_tiers' && arrayKey === 'tiers' && Array.isArray(item.features)) {
          for (let k = 0; k < item.features.length; k++) {
            if (typeof item.features[k] === 'string' && item.features[k].trim()) {
              entries.push({
                path: `blocks.${i}.data.tiers.${j}.features.${k}`,
                text: item.features[k],
              });
            }
          }
        }
      }
    }
  }

  return entries;
}

// ─── translate_page mode ─────────────────────────────────────

async function translatePage(
  db: SupabaseClient,
  tenantId: string,
  sourcePageId: string,
  targetLang: string
): Promise<Record<string, unknown>> {
  // 1. Load source page
  const { data: page, error: pageErr } = await db
    .from('storefront_pages')
    .select('*')
    .eq('id', sourcePageId)
    .eq('tenant_id', tenantId)
    .single();

  if (pageErr || !page) throw new Error(`Source page not found: ${pageErr?.message}`);
  console.log(`[translate] Source page loaded: "${page.title}" (${page.id}), ${Array.isArray(page.blocks) ? page.blocks.length : 0} blocks, lang=${page.lang}`);

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const { glossary, corrections } = await loadContext(db, tenantId, targetLang);
  console.log(`[translate] Context loaded: ${glossary.length} glossary terms, ${corrections.length} corrections`);
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections);

  // 2. Extract all translatable texts
  const blockTexts = extractBlockTexts(blocks);
  const allSourceTexts = blockTexts.map((e) => e.text);

  // 3. Check translation memory
  const memoryHits = await checkMemory(db, tenantId, targetLang, allSourceTexts);

  // 4. Collect uncached texts (+ shortcode texts from custom/text blocks)
  const toTranslate: Record<string, string> = {};
  let fromMemory = 0;

  for (const entry of blockTexts) {
    if (memoryHits.has(entry.text)) {
      fromMemory++;
      continue;
    }
    // Handle shortcodes in text/custom blocks
    if (entry.path.includes('.html') || entry.path.includes('.body')) {
      const { cleaned, shortcodes } = extractShortcodes(entry.text);
      if (shortcodes.size > 0) {
        toTranslate[entry.path] = cleaned;
        const scTexts = collectShortcodeTexts(shortcodes);
        for (const [key, val] of Object.entries(scTexts)) {
          toTranslate[`${entry.path}::${key}`] = val;
        }
        continue;
      }
    }
    toTranslate[entry.path] = entry.text;
  }

  // 5. Add SEO fields
  if (page.meta_title) toTranslate['meta_title'] = page.meta_title;
  if (page.meta_description) toTranslate['meta_description'] = page.meta_description;
  if (page.title) toTranslate['title'] = page.title;

  console.log(`[translate] Texts: ${blockTexts.length} block entries, ${fromMemory} from memory, ${Object.keys(toTranslate).length} to translate via AI`);
  console.log(`[translate] Keys to translate:`, Object.keys(toTranslate));

  // 6. Call Claude API (one batch)
  let aiTranslations: Record<string, string> = {};
  const aiTranslated = Object.keys(toTranslate).length;

  if (aiTranslated > 0) {
    const langName = LANG_NAMES[targetLang] || targetLang;
    const userContent = `Translate the following JSON values from Hebrew to ${langName}.
Return ONLY a valid JSON object with the same keys and translated values.
Do not add explanations.

${JSON.stringify(toTranslate, null, 2)}`;

    console.log(`[translate] Calling Claude API: prompt ${systemPrompt.length} chars, user content ${userContent.length} chars, ${aiTranslated} texts`);
    const response = await callClaude(systemPrompt, userContent, 8192);
    console.log(`[translate] Claude response: ${response.length} chars`);
    console.log(`[translate] Claude response (first 500):`, response.slice(0, 500));
    aiTranslations = parseClaudeJson(response);
    console.log(`[translate] Parsed ${Object.keys(aiTranslations).length} translated fields`);
    console.log(`[translate] Translated keys:`, Object.keys(aiTranslations));

    // Check for key mismatches
    const requestedKeys = Object.keys(toTranslate);
    const returnedKeys = Object.keys(aiTranslations);
    const missing = requestedKeys.filter(k => !returnedKeys.includes(k));
    const extra = returnedKeys.filter(k => !requestedKeys.includes(k));
    if (missing.length > 0) console.warn(`[translate] ⚠ MISSING keys in Claude response:`, missing);
    if (extra.length > 0) console.warn(`[translate] ⚠ EXTRA keys in Claude response:`, extra);
  } else {
    console.log(`[translate] No texts to translate (all from memory or empty)`);
  }

  // 7. Merge memory + AI → build translated blocks
  // Wrap in object so setNestedValue can resolve "blocks.0.data.field" paths
  const wrapper = { blocks: JSON.parse(JSON.stringify(blocks)) };
  const memoryPairs: { source: string; translated: string; context: string }[] = [];

  for (const entry of blockTexts) {
    let translated: string;

    if (memoryHits.has(entry.text)) {
      translated = memoryHits.get(entry.text)!;
    } else if (entry.path.includes('.html') || entry.path.includes('.body')) {
      const { cleaned, shortcodes } = extractShortcodes(entry.text);
      let mainTranslation = aiTranslations[entry.path] ?? cleaned;
      if (shortcodes.size > 0) {
        const scTranslations: Record<string, string> = {};
        for (const key of Object.keys(aiTranslations)) {
          if (key.startsWith(`${entry.path}::`)) {
            scTranslations[key.slice(entry.path.length + 2)] = aiTranslations[key];
          }
        }
        const translatedSC = applyTranslatedShortcodes(shortcodes, scTranslations);
        mainTranslation = reinsertShortcodes(mainTranslation, translatedSC);
      }
      translated = mainTranslation;
      memoryPairs.push({ source: entry.text, translated, context: 'block_content' });
    } else {
      translated = aiTranslations[entry.path] ?? entry.text;
      memoryPairs.push({ source: entry.text, translated, context: 'block_field' });
    }

    setNestedValue(wrapper, entry.path, cleanRtlForLtr(translated, targetLang));
  }
  const translatedBlocks = wrapper.blocks;

  // 8. Create translated page via RPC (handles translation_group_id linking)
  const translatedTitle = aiTranslations['title'] ?? page.title;
  console.log(`[translate] Creating page via RPC: title="${translatedTitle}", slug="${page.slug}", lang=${targetLang}, ${translatedBlocks.length} blocks`);
  if (translatedTitle === page.title) console.warn(`[translate] ⚠ Title NOT translated — still Hebrew: "${page.title}"`);

  const { data: newPageId, error: rpcErr } = await db.rpc('create_translated_page', {
    p_tenant_id: tenantId,
    p_source_page_id: sourcePageId,
    p_target_lang: targetLang,
    p_translated_blocks: translatedBlocks,
    p_title: translatedTitle,
    p_slug: page.slug,
    p_meta_title: aiTranslations['meta_title'] ?? page.meta_title ?? null,
    p_meta_description: aiTranslations['meta_description'] ?? page.meta_description ?? null,
  });

  if (rpcErr) throw new Error(`RPC create_translated_page failed: ${rpcErr.message}`);
  console.log(`[translate] Page created via RPC, id=${newPageId}`);

  // 9. Save translation memory
  await saveMemoryBatch(db, tenantId, targetLang, memoryPairs);

  return {
    success: true,
    page_id: newPageId,
    stats: { blocks_translated: blockTexts.length, from_memory: fromMemory, ai_translated: aiTranslated },
  };
}

// ─── translate_blocks mode ───────────────────────────────────

async function translateBlocks(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string,
  blocks: any[]
): Promise<Record<string, unknown>> {
  const { glossary, corrections } = await loadContext(db, tenantId, targetLang);
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections);
  const blockTexts = extractBlockTexts(blocks);
  const toTranslate: Record<string, string> = {};
  for (const entry of blockTexts) toTranslate[entry.path] = entry.text;

  if (Object.keys(toTranslate).length === 0) {
    return { success: true, translated_blocks: blocks };
  }

  const langName = LANG_NAMES[targetLang] || targetLang;
  const response = await callClaude(systemPrompt,
    `Translate the following JSON values from Hebrew to ${langName}.
Return ONLY a valid JSON object with the same keys and translated values.

${JSON.stringify(toTranslate, null, 2)}`);

  const translations = parseClaudeJson(response);
  const wrapper = { blocks: JSON.parse(JSON.stringify(blocks)) };
  for (const entry of blockTexts) {
    if (translations[entry.path]) setNestedValue(wrapper, entry.path, cleanRtlForLtr(translations[entry.path], targetLang));
  }
  return { success: true, translated_blocks: wrapper.blocks };
}

// ─── translate_text mode ─────────────────────────────────────

async function translateText(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string,
  text: string,
  contextType: string
): Promise<Record<string, unknown>> {
  const { glossary, corrections } = await loadContext(db, tenantId, targetLang);
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections);
  const hints: Record<string, string> = {
    seo_title: 'SEO title. Keep 50-60 characters.',
    seo_description: 'SEO meta description. Keep 150-160 characters.',
    page_title: 'Page title. Keep concise.',
    general: 'Translate naturally.',
  };
  const translated = await callClaude(systemPrompt,
    `${hints[contextType] || hints.general}\n\nTranslate:\n${text}`);
  return { success: true, translated_text: translated };
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errRes('Method not allowed', 405);

  try {
    const body = await req.json();
    const { mode, tenant_id, target_lang } = body;
    console.log(`[translate] Request: mode=${mode}, tenant_id=${tenant_id}, target_lang=${target_lang}, source_page_id=${body.source_page_id || 'N/A'}`);

    if (!mode || !tenant_id || !target_lang) {
      return errRes('Missing: mode, tenant_id, target_lang', 400);
    }
    if (!['en', 'ru'].includes(target_lang)) {
      return errRes("target_lang must be 'en' or 'ru'", 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (mode === 'translate_page') {
      if (!body.source_page_id) return errRes('translate_page requires source_page_id', 400);
      return jsonRes(await translatePage(db, tenant_id, body.source_page_id, target_lang));
    }
    if (mode === 'translate_blocks') {
      if (!Array.isArray(body.blocks)) return errRes('translate_blocks requires blocks array', 400);
      return jsonRes(await translateBlocks(db, tenant_id, target_lang, body.blocks));
    }
    if (mode === 'translate_text') {
      if (!body.text) return errRes('translate_text requires text', 400);
      return jsonRes(await translateText(db, tenant_id, target_lang, body.text, body.context_type || 'general'));
    }

    return errRes(`Unknown mode: ${mode}`, 400);
  } catch (error) {
    console.error('[translate] ❌ ERROR:', error instanceof Error ? error.message : error);
    console.error('[translate] Stack:', error instanceof Error ? error.stack : 'no stack');
    return errRes(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
