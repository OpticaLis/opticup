/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

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

const BLOCK_TYPE_REFERENCE = `
Available block types and their data fields:

1. hero: { youtube_id, image, overlay (0-1), title, subtitle, cta_text, cta_url, cta_style (gold/primary), status_text (badge above title), status_bg (gold/green/red), title_size (normal/large/huge) }
2. text: { title, body (Markdown), alignment (right/center/left) }
3. gallery: { images: [{src, alt, caption}], style (grid/slider), columns (2/3/4) }
4. video: { videos: [{youtube_id, title}], style (standard/shorts), section_title }
5. products: { filter (bestsellers/new/all), selected_products (barcode array for manual selection), limit, style (carousel/grid), section_title, show_more_url, grid_columns_desktop (2-5), grid_columns_mobile (1-2), show_out_of_stock, out_of_stock_warning, card_style (standard/campaign/minimal), show_price, show_original_price, show_image_gallery, show_badges, default_badge_text, badge_bg_color (red/gold/black) }
6. cta: { text, url, style (gold/primary/secondary/outline), description, target (_self/_blank) }
7. lead_form: { title, fields: [{name, label, type, required}], submit_text, success_message, webhook_url }
8. faq: { section_title, items: [{question, answer}] }
9. contact: { section_title, show_map, map_embed_url, phone, email, address, hours, show_form, cta_text, cta_url }
10. banner: { title, text, image, cta_text, cta_url, style (full/card/slim), countdown_to }
11. columns: { layout (equal/image-text/text-image), section_title, columns (2/3/4), items: [{icon, image, title, text, url}] }
12. steps: { section_title, items: [{number, title, description, image, youtube_id}] }
13. brands: { section_title, style (carousel/grid), limit, show_more_url }
14. blog_carousel: { section_title, limit, style (carousel/grid), show_more_url }
15. reviews: { section_title, style (carousel/grid), show_rating_summary (boolean), limit }
16. sticky_bar: { text, secondary_text, cta_text, cta_url, position (top/bottom), bg_color (black/gold/white), text_color (white/black), dismissible, show_countdown, countdown_to (ISO date) }
17. trust_badges: { section_title, badges: [{icon (emoji), title, text}], style (row/grid) }
18. divider: { style (line/space/dots/wave), color (gold/gray/black), height (e.g. "60px") }

Each block also has optional settings: { bg_color (white/black/gold/gray/transparent), padding, max_width (narrow/standard/wide/full), hidden, css_class }

Important rules:
- Every block must have a unique "id" field (string)
- Colors: white, black, gold only — NEVER use blue
- Font: Rubik
- The site is Hebrew (RTL) — all content in Hebrew unless specified otherwise
- Never add blocks not in the list above
- Never remove blocks unless explicitly asked
- Keep all existing block IDs unchanged unless the block is being replaced
`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return errRes('ANTHROPIC_API_KEY not configured', 500);
    }

    const body = await req.json();
    const { blocks, prompt, mode, config, mode_data } = body;

    // Custom mode uses mode_data.prompt instead of top-level prompt
    if (mode !== 'seo' && mode !== 'custom' && !prompt) {
      return errRes('Missing prompt', 400);
    }

    if (mode === 'custom' && (!mode_data?.prompt)) {
      return errRes('Missing mode_data.prompt for custom mode', 400);
    }

    if (mode !== 'seo' && mode !== 'custom') {
      const currentData = mode === 'component' ? config : blocks;
      if (!currentData) {
        return errRes('Missing blocks or config data', 400);
      }
    }

    // Build system prompt based on mode
    let systemPrompt = '';
    let userMessage = '';

    if (mode === 'seo') {
      const { page_title, page_type, blocks_summary, current_meta_title,
              current_meta_description, current_slug, lang, learning_context } = body;

      systemPrompt = `You are an SEO expert for Optic Up, an Israeli optical store website.
Generate optimized SEO metadata in Hebrew for the given page.
Return ONLY valid JSON with: meta_title, meta_description, suggested_slug, explanation.

Rules:
- meta_title: 30-60 characters, include page name + business name "אופטיקה פריזמה"
- meta_description: 120-160 characters, include value proposition, keywords, call to action
- slug: short, readable, Hebrew OK, dashes between words, wrapped with /
- All text in Hebrew
- Focus on optical industry keywords: משקפיים, עדשות, מסגרות, בדיקת ראייה, אופטיקה
${learning_context || ''}`;

      userMessage = `Page: ${page_title || '(untitled)'}
Type: ${page_type || 'custom'}
Content summary: ${blocks_summary || '(empty)'}
Current meta_title: ${current_meta_title || '(empty)'}
Current meta_description: ${current_meta_description || '(empty)'}
Current slug: ${current_slug || '/'}`;

    } else if (mode === 'component') {
      systemPrompt = `You are a CMS editor assistant for Optic Up, an optical store website management system.
You receive the current JSON config of a reusable component and a user instruction in Hebrew.
Return a JSON object with exactly two keys:
1. "config" — the updated config object
2. "explanation" — a brief explanation in Hebrew of what you changed (1-3 sentences)

Keep all fields that weren't mentioned in the instruction unchanged.
The site uses Hebrew (RTL). Colors: white, black, gold only.
Return ONLY valid JSON. No markdown backticks, no extra text.`;
    } else {
      systemPrompt = `You are a CMS editor assistant for Optic Up, an optical store website management system.
You receive the current blocks JSON array of a webpage and a user instruction in Hebrew.
Return a JSON object with exactly two keys:
1. "blocks" — the updated blocks array
2. "explanation" — a brief explanation in Hebrew of what you changed (1-3 sentences)

${BLOCK_TYPE_REFERENCE}

Rules:
- Return ONLY valid JSON. No markdown backticks, no extra text.
- Keep all blocks that weren't mentioned in the instruction unchanged.
- Preserve existing block IDs unless replacing a block entirely.
- When adding a new block, generate an ID like "type-timestamp" (e.g., "banner-1712345").
- If the instruction is unclear, make your best judgment and explain in the explanation field.
- If the instruction asks to do something impossible (e.g., add an unsupported block type), explain why in the explanation field and return the original blocks unchanged.`;
    }

    // Custom mode: generate raw HTML+CSS
    if (mode === 'custom') {
      systemPrompt = `You are a web developer building custom HTML+CSS sections for Optic Up, an Israeli optical store website.
You receive the current HTML+CSS code of a custom block and a user instruction in Hebrew.
Return a JSON object with exactly two keys:
1. "html" — the updated HTML+CSS code (include <style> tags for CSS within the HTML)
2. "explanation" — a brief explanation in Hebrew of what you changed (1-3 sentences)

Design rules:
- Direction: RTL (Hebrew text)
- Font: Rubik (already loaded globally via Google Fonts)
- Colors: primarily white, black, gold (#D4A853). Avoid blue.
- Mobile responsive: use @media (max-width: 768px) for mobile styles
- Use class names prefixed with the block context to avoid collisions (e.g., .supersale-hero, .multi-grid)
- Clean, modern, professional design
- All text in Hebrew unless specified otherwise
- Return ONLY valid JSON. No markdown backticks, no extra text.`;

      userMessage = mode_data.prompt;
      if (mode_data.current_html) {
        userMessage = `Current code:\n${mode_data.current_html}\n\nInstruction: ${mode_data.prompt}`;
      }
    }

    // Build user message for non-SEO modes (SEO sets userMessage above)
    if (mode === 'component') {
      userMessage = `Current component config:\n${JSON.stringify(config, null, 2)}\n\nInstruction: ${prompt}`;
    } else if (mode !== 'seo' && mode !== 'custom') {
      userMessage = `Current page blocks:\n${JSON.stringify(blocks, null, 2)}\n\nInstruction: ${prompt}`;
    }

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return errRes(`Claude API error: ${response.status}`, 502);
    }

    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text || '';

    let result;
    try {
      const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    } catch (_parseErr) {
      console.error('Failed to parse AI response:', rawText);
      return errRes('Failed to parse AI response', 422);
    }

    // Validate and return
    if (mode === 'custom') {
      const html = result.html || rawText;
      return jsonRes({
        html,
        explanation: result.explanation || 'הקוד עודכן',
      });
    } else if (mode === 'seo') {
      return jsonRes({
        meta_title: result.meta_title || '',
        meta_description: result.meta_description || '',
        suggested_slug: result.suggested_slug || '',
        explanation: result.explanation || '',
      });
    } else if (mode === 'component') {
      const cfg = result.config || result;
      return jsonRes({
        config: cfg,
        explanation: result.explanation || 'הרכיב עודכן בהצלחה',
      });
    } else {
      const blks = result.blocks;
      if (!blks || !Array.isArray(blks)) {
        return errRes('AI returned invalid blocks structure', 422);
      }
      return jsonRes({
        blocks: blks,
        explanation: result.explanation || 'העמוד עודכן',
      });
    }
  } catch (err) {
    console.error('Edge function error:', err);
    return errRes(err.message, 500);
  }
});
