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

/**
 * Generate a URL-safe slug from Hebrew or English text.
 * Hebrew chars → transliterated, spaces → dashes, lowercase.
 */
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
    if (hebrewMap[char]) {
      result += hebrewMap[char];
    } else {
      result += char;
    }
  }

  return result
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Build the system prompt for Claude to customize campaign blocks.
 */
function buildSystemPrompt(
  templateBlocks: unknown,
  userPrompt: string,
  variables: Record<string, string>,
): string {
  return `You are a campaign page builder for an Israeli optical store website. You receive a campaign page template (as JSON blocks) and a user request to customize it.

Your job:
1. Keep the EXACT same block structure (same number of blocks, same types, same IDs)
2. Change the TEXT CONTENT to match the user's campaign description
3. Keep all shortcodes ([cta], [lead_form], [reviews], [whatsapp]) — only change their text/attributes as needed
4. Keep all CSS exactly as-is — do NOT modify any styling, CSS classes, or inline styles
5. Replace hero title, subtitle, section headings, benefit descriptions, pricing details — to match the new campaign
6. Keep the brand color scheme (gold #c9a555 / #c5a059, black, white)
7. Output ONLY valid JSON — the blocks array, nothing else
8. All text content must be in Hebrew
9. Keep all image URLs and video URLs exactly as-is (they are real assets)
10. Keep all WhatsApp numbers, Instagram URLs, and external links as-is unless the variables provide replacements

Template blocks:
${JSON.stringify(templateBlocks)}

User's campaign request:
${userPrompt}

Variables:
${JSON.stringify(variables)}

Return ONLY the modified blocks JSON array. No explanation, no markdown, no code fences.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { template_slug, prompt, variables, tenant_id, slug_override, campaign_id } =
      await req.json();

    // Validate required fields
    if (!template_slug || !prompt || !tenant_id) {
      return jsonRes(
        {
          error: "Missing required fields: template_slug, prompt, tenant_id",
          success: false,
        },
        400,
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonRes(
        { error: "ANTHROPIC_API_KEY not configured", success: false },
        500,
      );
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
      return jsonRes(
        {
          error: `Template not found: ${template_slug}`,
          details: templateError?.message,
          success: false,
        },
        404,
      );
    }

    // 2. Build Claude prompt and call API
    const vars = variables || {};
    const systemPrompt = buildSystemPrompt(template.blocks, prompt, vars);

    let aiBlocks: unknown = null;
    let lastError = "";

    // Retry up to 2 times on parse failure
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return jsonRes(
          {
            error: `Claude API error (${response.status})`,
            details: errText,
            success: false,
          },
          500,
        );
      }

      const aiResponse = await response.json();
      const contentText = aiResponse.content?.[0]?.text || "";

      try {
        // Clean up common AI response artifacts
        const cleanJson = contentText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        aiBlocks = JSON.parse(cleanJson);
        break; // Success
      } catch (_e) {
        lastError = `Parse attempt ${attempt + 1} failed. Raw: ${contentText.slice(0, 200)}`;
        // Retry
      }
    }

    if (!aiBlocks || !Array.isArray(aiBlocks)) {
      return jsonRes(
        {
          error: "Failed to parse AI response after 3 attempts",
          details: lastError,
          success: false,
        },
        500,
      );
    }

    // 3. Generate slug and page metadata
    const eventName = vars.event_name || vars.store_name || "campaign";
    const pageSlug = slug_override || generateSlug(eventName);
    const fullSlug = `/${pageSlug}/`;

    // Fill in meta_template variables
    const metaTemplate = template.meta_template || {};
    let metaTitle = metaTemplate.default_meta_title || metaTemplate.default_title || eventName;
    let metaDescription = metaTemplate.default_meta_description || "";

    // Replace {variable} placeholders in meta fields
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = `{${key}}`;
      metaTitle = metaTitle.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value as string);
      metaDescription = metaDescription.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value as string);
    }

    // 4. Create draft page in storefront_pages
    const pageInsert: Record<string, unknown> = {
      tenant_id,
      slug: fullSlug,
      title: eventName,
      blocks: aiBlocks,
      meta_title: metaTitle,
      meta_description: metaDescription,
      page_type: "campaign",
      lang: "he",
      status: "draft",
    };
    // Auto-link to campaign if campaign_id provided
    if (campaign_id) {
      pageInsert.campaign_id = campaign_id;
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from("storefront_pages")
      .insert(pageInsert)
      .select("id, slug")
      .single();

    if (pageError) {
      return jsonRes(
        {
          error: "Failed to create draft page",
          details: pageError.message,
          success: false,
        },
        500,
      );
    }

    return jsonRes({
      success: true,
      page_id: page.id,
      slug: page.slug,
      preview_url: `${page.slug}?preview=true`,
    });
  } catch (error) {
    return jsonRes(
      { error: (error as Error).message, success: false },
      500,
    );
  }
});
