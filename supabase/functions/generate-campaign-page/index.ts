/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateSlug(text: string): string {
  const hebrewMap: Record<string, string> = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v',
    'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k',
    'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'p', 'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k',
    'ר': 'r', 'ש': 'sh', 'ת': 't',
  };
  let result = '';
  for (const char of text) {
    result += hebrewMap[char] || char;
  }
  return result.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// ─── Text extraction: find text between HTML tags ────────────
// These are the EXACT strings that appear in the HTML, so replacement
// is a simple string.replace() — no regex matching issues.

function extractTextNodes(html: string): string[] {
  // Remove style/script blocks first
  const cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  const texts: string[] = [];
  // Match text content between > and <
  const regex = />([^<]+)</g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    const text = m[1].trim();
    // Skip empty, whitespace-only, or HTML entity fragments
    if (text.length > 2 && !/^[\s&;#\d.,%]+$/.test(text) && !/^[\u200f\u200e\s]+$/.test(text)) {
      texts.push(text);
    }
  }
  return texts;
}

function extractShortcodes(html: string): string[] {
  const sc: string[] = [];
  const regex = /\[[a-z_]+[^\]]*\]/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    sc.push(m[0]);
  }
  return sc;
}

// ─── Apply text replacements back into HTML ──────────────────

function replaceTextsInHtml(
  html: string,
  origTexts: string[],
  newTexts: string[],
): { html: string; replacements: number } {
  let result = html;
  let replacements = 0;
  for (let i = 0; i < origTexts.length && i < newTexts.length; i++) {
    const orig = origTexts[i];
    const repl = newTexts[i];
    if (orig !== repl && orig.length > 2) {
      // Replace first occurrence — the text appears verbatim in the HTML
      const idx = result.indexOf(orig);
      if (idx !== -1) {
        result = result.slice(0, idx) + repl + result.slice(idx + orig.length);
        replacements++;
      }
    }
  }
  return { html: result, replacements };
}

// ─── Build Claude prompt ─────────────────────────────────────

function buildPrompt(
  blocks: Array<Record<string, unknown>>,
  userPrompt: string,
  variables: Record<string, string>,
): { prompt: string; blockTextMap: Array<{ index: number; texts: string[]; shortcodes: string[] }> } {

  const blockTextMap: Array<{ index: number; texts: string[]; shortcodes: string[] }> = [];

  const blockDescriptions = blocks.map((block, index) => {
    const data = (block.data || {}) as Record<string, unknown>;
    const type = (block.type || 'custom') as string;
    const allTexts: string[] = [];
    const allShortcodes: string[] = [];

    // Extract from HTML
    if (typeof data.html === 'string') {
      allTexts.push(...extractTextNodes(data.html));
      allShortcodes.push(...extractShortcodes(data.html));
    }

    // Extract from data fields
    for (const key of ['title', 'subtitle', 'text', 'content', 'description']) {
      if (typeof data[key] === 'string' && (data[key] as string).length > 0) {
        allTexts.push(data[key] as string);
      }
    }

    blockTextMap.push({ index, texts: allTexts, shortcodes: allShortcodes });

    // Build numbered text list for Claude
    const numberedTexts = allTexts.map((t, i) => `  ${i + 1}. "${t}"`).join('\n');
    const scList = allShortcodes.length
      ? `\n  Shortcodes: ${allShortcodes.map(s => `"${s}"`).join(', ')}`
      : '';

    return `Block ${index} (type: ${type}, ${allTexts.length} texts):
${numberedTexts}${scList}`;
  }).join('\n\n');

  const prompt = `You are rewriting campaign page content for an Israeli optical store website.

CRITICAL INSTRUCTIONS:
- You MUST rewrite ALL text to match the user's request below
- Do NOT keep the original text. Every heading, paragraph, benefit, CTA must be rewritten
- Replace ALL product names, event names, brand mentions, prices, descriptions
- All text must be in Hebrew
- Keep shortcode syntax ([cta], [lead_form], [whatsapp]) but update their text attributes

The template has these text blocks. Rewrite EVERY text for the new campaign:

${blockDescriptions}

USER'S REQUEST (this is what the page should be about):
${userPrompt}

Variables: ${JSON.stringify(variables)}

RESPOND with ONLY a JSON array. One object per block:
[
  {"index": 0, "texts": ["new text 1", "new text 2", ...], "shortcodes": ["[cta text=\\"new\\"]"]},
  {"index": 1, "texts": ["..."], "shortcodes": []}
]

RULES:
- Each block's "texts" array MUST have the SAME number of elements as the input
- EVERY text MUST be different from the original — rewritten for the new campaign
- Keep shortcodes functional but update their display text
- Output valid JSON only. No markdown, no explanation.`;

  return { prompt, blockTextMap };
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { template_slug, prompt, variables, tenant_id, slug_override, campaign_id } =
      await req.json();

    if (!template_slug || !prompt || !tenant_id) {
      return jsonRes({ error: "Missing required fields: template_slug, prompt, tenant_id", success: false }, 400);
    }
    if (!ANTHROPIC_API_KEY) {
      return jsonRes({ error: "ANTHROPIC_API_KEY not configured", success: false }, 500);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Fetch the template
    const { data: template, error: templateError } = await supabaseAdmin
      .from("campaign_templates")
      .select("*")
      .eq("slug", template_slug)
      .eq("is_deleted", false)
      .single();

    if (templateError || !template) {
      return jsonRes({ error: `Template not found: ${template_slug}`, details: templateError?.message, success: false }, 404);
    }

    const templateBlocks = template.blocks as Array<Record<string, unknown>>;

    // 2. Build prompt (extracts text nodes from HTML, builds numbered list)
    const vars = variables || {};
    const { prompt: claudePrompt, blockTextMap } = buildPrompt(templateBlocks, prompt, vars);

    console.log(`[generate-campaign-page] Prompt length: ${claudePrompt.length} chars`);
    console.log(`[generate-campaign-page] Blocks: ${blockTextMap.length}, total texts: ${blockTextMap.reduce((s, b) => s + b.texts.length, 0)}`);

    // 3. Call Claude API with timeout
    type Modification = { index: number; texts: string[]; shortcodes?: string[] };
    let modifications: Modification[] | null = null;
    let lastError = "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 8000,
            messages: [{ role: "user", content: claudePrompt }],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          return jsonRes({ error: `Claude API error (${response.status})`, details: errText, success: false }, 500);
        }

        const aiResponse = await response.json();
        const contentText = aiResponse.content?.[0]?.text || "";

        console.log(`[generate-campaign-page] Claude response length: ${contentText.length}`);
        console.log(`[generate-campaign-page] Claude response preview: ${contentText.slice(0, 500)}`);

        try {
          const cleanJson = contentText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
            modifications = parsed;
            break;
          }
        } catch (_e) {
          lastError = `Parse attempt ${attempt + 1} failed. Raw: ${contentText.slice(0, 300)}`;
          console.log(`[generate-campaign-page] ${lastError}`);
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!modifications) {
      return jsonRes({ error: "Failed to parse AI response", details: lastError, success: false }, 500);
    }

    // 4. Apply modifications back into original blocks (CSS stays intact)
    const finalBlocks = JSON.parse(JSON.stringify(templateBlocks));
    let totalReplacements = 0;

    for (const mod of modifications) {
      const block = finalBlocks[mod.index];
      if (!block) {
        console.log(`[generate-campaign-page] WARNING: mod.index ${mod.index} out of range`);
        continue;
      }
      const data = (block.data || {}) as Record<string, unknown>;
      const orig = blockTextMap[mod.index];
      if (!orig) continue;

      // Get the texts that came from HTML vs data fields
      const origHtmlTexts: string[] = [];
      const origFieldTexts: string[] = [];

      if (typeof data.html === 'string') {
        origHtmlTexts.push(...extractTextNodes(data.html));
      }
      const fieldKeys = ['title', 'subtitle', 'text', 'content', 'description'];
      for (const key of fieldKeys) {
        if (typeof data[key] === 'string' && (data[key] as string).length > 0) {
          origFieldTexts.push(key);
        }
      }

      const htmlTextCount = origHtmlTexts.length;
      const newHtmlTexts = mod.texts.slice(0, htmlTextCount);
      const newFieldTexts = mod.texts.slice(htmlTextCount);

      // Replace text in HTML
      if (typeof data.html === 'string' && newHtmlTexts.length > 0) {
        const { html: newHtml, replacements } = replaceTextsInHtml(
          data.html, origHtmlTexts, newHtmlTexts
        );
        data.html = newHtml;
        totalReplacements += replacements;
      }

      // Replace shortcodes in HTML
      if (typeof data.html === 'string' && mod.shortcodes && mod.shortcodes.length) {
        const origSc = extractShortcodes(data.html);
        for (let i = 0; i < origSc.length && i < mod.shortcodes.length; i++) {
          if (origSc[i] !== mod.shortcodes[i]) {
            data.html = (data.html as string).replace(origSc[i], mod.shortcodes[i]);
            totalReplacements++;
          }
        }
      }

      // Replace data fields
      for (let i = 0; i < origFieldTexts.length && i < newFieldTexts.length; i++) {
        const key = origFieldTexts[i];
        if (newFieldTexts[i] && newFieldTexts[i] !== data[key]) {
          data[key] = newFieldTexts[i];
          totalReplacements++;
        }
      }
    }

    console.log(`[generate-campaign-page] Total replacements applied: ${totalReplacements}`);
    if (totalReplacements === 0) {
      console.log(`[generate-campaign-page] WARNING: Zero replacements! Claude may have returned identical text.`);
    }

    // 5. Generate slug and page metadata
    const eventName = vars.event_name || vars.store_name || "campaign";
    const pageSlug = slug_override || generateSlug(eventName);
    const fullSlug = `/${pageSlug}/`;

    const metaTemplate = template.meta_template || {};
    let metaTitle = metaTemplate.default_meta_title || metaTemplate.default_title || eventName;
    let metaDescription = metaTemplate.default_meta_description || "";

    for (const [key, value] of Object.entries(vars)) {
      const placeholder = `{${key}}`;
      const re = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      metaTitle = metaTitle.replace(re, value as string);
      metaDescription = metaDescription.replace(re, value as string);
    }

    // 6. Create draft page
    const pageInsert: Record<string, unknown> = {
      tenant_id, slug: fullSlug, title: eventName,
      blocks: finalBlocks, meta_title: metaTitle,
      meta_description: metaDescription, page_type: "campaign",
      lang: "he", status: "draft",
    };
    if (campaign_id) pageInsert.campaign_id = campaign_id;

    const { data: page, error: pageError } = await supabaseAdmin
      .from("storefront_pages")
      .insert(pageInsert)
      .select("id, slug")
      .single();

    if (pageError) {
      return jsonRes({ error: "Failed to create draft page", details: pageError.message, success: false }, 500);
    }

    return jsonRes({
      success: true,
      page_id: page.id,
      slug: page.slug,
      preview_url: `${page.slug}?preview=true`,
      stats: { blocks: modifications.length, replacements: totalReplacements },
    });
  } catch (error) {
    const msg = (error as Error).message || String(error);
    if (msg.includes('abort')) {
      return jsonRes({ error: "Request timed out (120s). Try a simpler prompt.", success: false }, 504);
    }
    return jsonRes({ error: msg, success: false }, 500);
  }
});
