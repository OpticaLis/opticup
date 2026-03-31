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

    const { blocks, prompt, mode, config } = await req.json();

    if (!prompt) {
      return errRes('Missing prompt', 400);
    }

    const currentData = mode === 'component' ? config : blocks;
    if (!currentData) {
      return errRes('Missing blocks or config data', 400);
    }

    // Build system prompt based on mode
    let systemPrompt = '';
    if (mode === 'component') {
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

    const userMessage = mode === 'component'
      ? `Current component config:\n${JSON.stringify(currentData, null, 2)}\n\nInstruction: ${prompt}`
      : `Current page blocks:\n${JSON.stringify(currentData, null, 2)}\n\nInstruction: ${prompt}`;

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
    if (mode === 'component') {
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
