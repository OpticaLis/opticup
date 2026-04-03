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

// ─── Block content extraction ────────────────────────────────
// Strip CSS/style attributes from HTML, extract only text + shortcodes + structure.

interface BlockSummary {
  index: number;
  id: string;
  type: string;
  texts: string[];       // visible text segments
  shortcodes: string[];  // [cta], [lead_form], etc.
  has_html: boolean;
}

/**
 * Extract readable text from HTML, stripping tags and inline styles.
 * Preserves shortcodes like [cta ...] and [lead_form ...].
 */
function extractText(html: string): { texts: string[]; shortcodes: string[] } {
  const shortcodes: string[] = [];
  // Capture shortcodes
  const scRegex = /\[[a-z_]+[^\]]*\]/g;
  let m;
  while ((m = scRegex.exec(html)) !== null) {
    shortcodes.push(m[0]);
  }

  // Strip HTML tags → plain text
  const plain = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // remove <style> blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // remove <script> blocks
    .replace(/<[^>]+>/g, ' ')                           // strip all tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into meaningful segments (filter out tiny fragments)
  const texts = plain.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 2);

  return { texts, shortcodes };
}

/**
 * Build a lightweight summary of template blocks for Claude.
 * No CSS, no raw HTML — just structure + text + shortcodes.
 */
function summarizeBlocks(blocks: Array<Record<string, unknown>>): BlockSummary[] {
  return blocks.map((block, index) => {
    const data = (block.data || {}) as Record<string, unknown>;
    const type = (block.type || 'custom') as string;
    const id = (block.id || `block-${index}`) as string;

    const allTexts: string[] = [];
    const allShortcodes: string[] = [];

    // Extract from HTML field (custom blocks)
    if (typeof data.html === 'string') {
      const { texts, shortcodes } = extractText(data.html);
      allTexts.push(...texts);
      allShortcodes.push(...shortcodes);
    }

    // Extract from common text fields
    for (const key of ['title', 'subtitle', 'text', 'content', 'description']) {
      if (typeof data[key] === 'string' && (data[key] as string).length > 0) {
        allTexts.push(`${key}: ${data[key]}`);
      }
    }

    // Extract from items array
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (typeof item === 'object' && item !== null) {
          const it = item as Record<string, unknown>;
          if (it.title) allTexts.push(`item: ${it.title}`);
          if (it.text) allTexts.push(`  ${it.text}`);
        }
      }
    }

    return {
      index,
      id,
      type,
      texts: allTexts.slice(0, 20), // cap at 20 segments
      shortcodes: allShortcodes,
      has_html: typeof data.html === 'string',
    };
  });
}

/**
 * Apply Claude's text modifications back into the original template blocks.
 * Claude returns an array of { index, texts } — we find each text in the
 * original HTML and replace it.
 */
function applyModifications(
  originalBlocks: Array<Record<string, unknown>>,
  modifications: Array<{ index: number; texts: string[]; shortcodes?: string[] }>,
): Array<Record<string, unknown>> {
  // Deep clone
  const blocks = JSON.parse(JSON.stringify(originalBlocks));

  for (const mod of modifications) {
    const block = blocks[mod.index];
    if (!block) continue;
    const data = (block.data || {}) as Record<string, unknown>;

    // Get original summary to know what texts existed
    const origData = (originalBlocks[mod.index]?.data || {}) as Record<string, unknown>;

    // Replace simple text fields
    const textFields = ['title', 'subtitle', 'text', 'content', 'description'];
    let modTextIdx = 0;
    for (const key of textFields) {
      if (typeof origData[key] === 'string' && (origData[key] as string).length > 0) {
        // Find matching mod text (skip ones that start with "key: ")
        for (let i = modTextIdx; i < mod.texts.length; i++) {
          const t = mod.texts[i];
          if (t.startsWith(key + ': ')) {
            data[key] = t.slice(key.length + 2);
            modTextIdx = i + 1;
            break;
          }
        }
      }
    }

    // For HTML blocks: do text replacement in the HTML
    if (typeof data.html === 'string' && typeof origData.html === 'string') {
      let html = origData.html as string;
      const { texts: origTexts } = extractText(origData.html as string);

      // Build a mapping: original text → new text
      // mod.texts contains the new text segments (for html blocks, these are plain texts)
      // Filter out field-prefixed ones (title:, subtitle:, etc.)
      const htmlTexts = mod.texts.filter(t => !textFields.some(f => t.startsWith(f + ': ')));

      for (let i = 0; i < origTexts.length && i < htmlTexts.length; i++) {
        const orig = origTexts[i];
        const repl = htmlTexts[i];
        if (orig !== repl && orig.length > 2) {
          // Escape for regex
          const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(new RegExp(escaped, 'g'), repl);
        }
      }

      // Replace shortcodes if provided
      if (mod.shortcodes && mod.shortcodes.length) {
        const origSc = (origData.html as string).match(/\[[a-z_]+[^\]]*\]/g) || [];
        for (let i = 0; i < origSc.length && i < mod.shortcodes.length; i++) {
          if (origSc[i] !== mod.shortcodes[i]) {
            html = html.replace(origSc[i], mod.shortcodes[i]);
          }
        }
      }

      data.html = html;
    }

    // Replace items
    if (Array.isArray(origData.items) && Array.isArray(data.items)) {
      const itemTexts = mod.texts.filter(t => t.startsWith('item: '));
      let itemIdx = 0;
      for (let i = 0; i < (data.items as Array<Record<string, unknown>>).length; i++) {
        const item = (data.items as Array<Record<string, unknown>>)[i];
        if (itemIdx < itemTexts.length) {
          item.title = itemTexts[itemIdx].slice(6); // remove "item: "
          itemIdx++;
        }
      }
    }
  }

  return blocks;
}

function buildPrompt(
  summaries: BlockSummary[],
  userPrompt: string,
  variables: Record<string, string>,
): string {
  const blockDesc = summaries.map(s => {
    let desc = `Block ${s.index} (${s.type}, id="${s.id}"):`;
    if (s.texts.length) desc += `\n  Texts: ${JSON.stringify(s.texts)}`;
    if (s.shortcodes.length) desc += `\n  Shortcodes: ${JSON.stringify(s.shortcodes)}`;
    return desc;
  }).join('\n\n');

  return `You are a campaign page builder for an Israeli optical store website.
You receive a SUMMARY of template blocks (text content only, no CSS) and a user request.

Your job:
1. Return a JSON array with one object per block: { "index": N, "texts": [...], "shortcodes": [...] }
2. Each "texts" array must have the SAME number of elements as the input — replace content to match the campaign
3. Each "shortcodes" array: keep shortcode syntax ([cta], [lead_form] etc.) but update text/attributes if needed
4. All text must be in Hebrew
5. Keep the SAME number of blocks — one entry per block index
6. Output ONLY valid JSON array. No explanation, no markdown.

Template block summaries:
${blockDesc}

User's campaign request:
${userPrompt}

Variables:
${JSON.stringify(variables)}

Return ONLY the JSON array. Example format:
[{"index":0,"texts":["new heading","new paragraph"],"shortcodes":["[cta text=\\"לחץ\\"]"]},{"index":1,"texts":["..."],"shortcodes":[]}]`;
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

    // 2. Summarize blocks (strip CSS, extract text + shortcodes)
    const summaries = summarizeBlocks(templateBlocks);

    // 3. Build lightweight prompt for Claude
    const vars = variables || {};
    const claudePrompt = buildPrompt(summaries, prompt, vars);

    // 4. Call Claude API with timeout
    let modifications: Array<{ index: number; texts: string[]; shortcodes?: string[] }> | null = null;
    let lastError = "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 120s timeout

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
          lastError = `Parse attempt ${attempt + 1} failed. Raw: ${contentText.slice(0, 200)}`;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!modifications) {
      return jsonRes({ error: "Failed to parse AI response", details: lastError, success: false }, 500);
    }

    // 5. Apply modifications back to original template blocks (with full CSS intact)
    const finalBlocks = applyModifications(templateBlocks, modifications);

    // 6. Generate slug and page metadata
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

    // 7. Create draft page
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
    });
  } catch (error) {
    const msg = (error as Error).message || String(error);
    if (msg.includes('abort')) {
      return jsonRes({ error: "Request timed out (120s). Try a simpler prompt.", success: false }, 504);
    }
    return jsonRes({ error: msg, success: false }, 500);
  }
});
