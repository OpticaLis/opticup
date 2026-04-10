/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractBlockTexts, cleanRtlForLtr } from './block-utils.ts';
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
  validateAndRetryJson,
  validateAndRetryText,
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
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  console.log(`[translate] Page "${page.title}" (${page.id}): ${blocks.length} blocks, lang=${page.lang}`);
  const { glossary, corrections } = await loadContext(db, tenantId, targetLang);

  // 2. Extract all translatable texts
  const blockTexts = extractBlockTexts(blocks);
  const allSourceTexts = blockTexts.map((e) => e.text);
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections, allSourceTexts.join('\n'));

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

  console.log(`[translate] Texts: ${blockTexts.length} block, ${fromMemory} memory, ${Object.keys(toTranslate).length} AI:`, Object.keys(toTranslate));

  // 6. Call Claude API (one batch)
  let aiTranslations: Record<string, string> = {};
  const aiTranslated = Object.keys(toTranslate).length;

  if (aiTranslated > 0) {
    const langName = LANG_NAMES[targetLang] || targetLang;
    const userContent = `Translate the following JSON values from Hebrew to ${langName}.
Return ONLY a valid JSON object with the same keys and translated values.
Do not add explanations.

${JSON.stringify(toTranslate, null, 2)}`;

    console.log(`[translate] Calling Claude API: ${aiTranslated} texts, prompt ${systemPrompt.length}+${userContent.length} chars`);
    const response = await callClaude(systemPrompt, userContent, 8192);
    console.log(`[translate] Claude response: ${response.length} chars, first 500:`, response.slice(0, 500));
    aiTranslations = parseClaudeJson(response);
    console.log(`[translate] Parsed ${Object.keys(aiTranslations).length} fields:`, Object.keys(aiTranslations));

    // Check for key mismatches
    const requestedKeys = Object.keys(toTranslate);
    const returnedKeys = Object.keys(aiTranslations);
    const missing = requestedKeys.filter(k => !returnedKeys.includes(k));
    const extra = returnedKeys.filter(k => !requestedKeys.includes(k));
    if (missing.length > 0) console.warn(`[translate] ⚠ MISSING keys in Claude response:`, missing);
    if (extra.length > 0) console.warn(`[translate] ⚠ EXTRA keys in Claude response:`, extra);

    // Validate for wrapper contamination. Page blocks use 'text' (no length
    // bounds). SEO fields use their specific contentType for length validation.
    const seoTypes: Record<string, string> = { meta_title: 'seo_title', meta_description: 'seo_description', title: 'text' };
    aiTranslations = await validateAndRetryJson(
      aiTranslations,
      (key) => seoTypes[key] || 'text',
      systemPrompt, userContent, 8192
    );
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
  console.log(`[translate] RPC: title="${translatedTitle}", slug="${page.slug}", lang=${targetLang}, ${translatedBlocks.length} blocks`);
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
  const blockTexts = extractBlockTexts(blocks);
  const toTranslate: Record<string, string> = {};
  for (const entry of blockTexts) toTranslate[entry.path] = entry.text;
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections, blockTexts.map((e) => e.text).join('\n'));

  if (Object.keys(toTranslate).length === 0) {
    return { success: true, translated_blocks: blocks };
  }

  const langName = LANG_NAMES[targetLang] || targetLang;
  const userContent = `Translate the following JSON values from Hebrew to ${langName}.
Return ONLY a valid JSON object with the same keys and translated values.

${JSON.stringify(toTranslate, null, 2)}`;

  const response = await callClaude(systemPrompt, userContent);
  const translations = await validateAndRetryJson(
    parseClaudeJson(response),
    () => 'text', // block content — no length bounds, only FORBIDDEN_PATTERNS
    systemPrompt, userContent
  );

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
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections, text);
  const hints: Record<string, string> = {
    seo_title: 'SEO title. Keep 50-60 characters.',
    seo_description: 'SEO meta description. Keep 150-160 characters.',
    page_title: 'Page title. Keep concise.',
    general: 'Translate naturally.',
  };
  const userContent = `${hints[contextType] || hints.general}\n\nTranslate:\n${text}`;
  const translated = await callClaude(systemPrompt, userContent);

  // Validate for wrapper contamination. Use the contextType directly for known
  // LENGTH_BOUNDS keys (seo_title, seo_description, description, alt_text).
  // For others (general, page_title), use 'text' — no length bounds, just pattern checks.
  const validationKey = ['seo_title', 'seo_description', 'description', 'alt_text'].includes(contextType) ? contextType : 'text';
  const validated = await validateAndRetryText(translated, validationKey, systemPrompt, userContent);

  return { success: true, translated_text: validated };
}

// ─── translate_product mode ──────────────────────────────────

async function translateProduct(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string,
  fields: Record<string, string>
): Promise<Record<string, unknown>> {
  const entries = Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim());
  if (entries.length === 0) {
    return { success: true, fields: {} };
  }
  const cleanFields: Record<string, string> = Object.fromEntries(entries);

  const { glossary, corrections } = await loadContext(db, tenantId, targetLang);
  const sourceText = entries.map(([, v]) => v).join('\n');
  const systemPrompt = buildSystemPrompt(targetLang, glossary, corrections, sourceText);

  const langName = LANG_NAMES[targetLang] || targetLang;
  const userContent = `Translate these product fields to ${langName}. Return ONLY a valid JSON object with the same keys and translated values. Do not add explanations.

seo_title: keep 50-60 characters.
seo_description: keep 150-160 characters.
description: marketing copy, 2-3 sentences.
alt_text: descriptive image alt text.

${JSON.stringify(cleanFields, null, 2)}`;

  console.log(`[translate] translate_product: ${entries.length} fields, ${sourceText.length} chars source`);
  const response = await callClaude(systemPrompt, userContent, 2048);
  const translations = await validateAndRetryJson(
    parseClaudeJson(response),
    (key) => key, // product field names match LENGTH_BOUNDS keys directly
    systemPrompt, userContent, 2048
  );

  return { success: true, fields: translations };
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errRes('Method not allowed', 405);

  try {
    const body = await req.json();
    const { mode, tenant_id, target_lang } = body;
    console.log(`[translate] mode=${mode}, tenant=${tenant_id}, lang=${target_lang}`);

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
    if (mode === 'translate_product') {
      if (!body.fields || typeof body.fields !== 'object') {
        return errRes('translate_product requires fields object', 400);
      }
      return jsonRes(await translateProduct(db, tenant_id, target_lang, body.fields));
    }

    return errRes(`Unknown mode: ${mode}`, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[translate] ❌ ERROR:', msg, error instanceof Error ? error.stack : '');
    return errRes(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
