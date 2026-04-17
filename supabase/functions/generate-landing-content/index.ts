/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

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

function errRes(message: string, status: number): Response {
  return jsonRes({ error: message, success: false }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errRes("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { tenant_id, title, prompt, references } = body;

    if (!tenant_id || !title) {
      return errRes("Missing: tenant_id, title", 400);
    }

    const userPrompt = `You are a premium landing page designer for an Israeli optical store (אופטיקה פריזמה אשקלון).
Generate a high-converting Hebrew (RTL) landing page.

Page title: ${title}
${prompt ? `Campaign brief from client: ${prompt}` : ""}
${references ? `Reference URLs for inspiration: ${references}` : ""}

CRITICAL RULES:
- Return a JSON object with "blocks" array and "seo_title" and "seo_description"
- Each block: { "id": "custom-XXXXX", "type": "custom", "data": { "html": "..." }, "settings": {} }
- Generate 2-4 custom blocks with COMPLETE, SELF-CONTAINED HTML+CSS inside data.html
- ALL styles must be inline or in a <style> tag within the block HTML
- Design must be PREMIUM and MODERN — like a luxury brand campaign page
- Colors ONLY: gold #c9a555 / #e8da94, black #000 / #1a1a1a, white #fff, gray #f5f5f5 — NO BLUE, NO GREEN (except success), NO PURPLE
- Direction: RTL throughout (dir="rtl")
- Mobile responsive
- Font: inherit (site uses Rubik)
- Hebrew language — professional, warm, persuasive marketing copy
- Use emotional triggers, urgency, social proof
- Do NOT just echo the client's brief — write compelling ORIGINAL copy

AVAILABLE SHORTCODES (the rendering engine processes these):
- [lead_form title="כותרת" fields="name,phone" submit_text="שלח" display="inline"] — renders a styled form
- [whatsapp text="דברו איתנו" message="שלום, אשמח לפרטים" size="large" rounded="true"] — WhatsApp button
- [cta type="primary" action="whatsapp" rounded="true"]טקסט כפתור[/cta] — gold CTA button
- [reviews style="carousel" limit="3"] — Google reviews carousel

STRUCTURE — Generate these blocks:

BLOCK 1 — HERO (full-width, dramatic):
<div style="background:linear-gradient(135deg, #000 0%, #1a1a1a 100%); min-height:70vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:3rem 1.5rem; direction:rtl;">
  <div style="max-width:800px;">
    <span style="display:inline-block; padding:0.5rem 1.5rem; background:rgba(201,165,85,0.15); border:1px solid #c9a555; border-radius:999px; color:#e8da94; font-size:0.875rem; font-weight:600; margin-bottom:1.5rem;">STATUS PILL TEXT</span>
    <h1 style="font-size:clamp(2rem,5vw,3.5rem); font-weight:800; color:#fff; line-height:1.2; margin:0 0 1rem;">COMPELLING HEADLINE</h1>
    <p style="font-size:1.25rem; color:rgba(255,255,255,0.8); max-width:600px; margin:0 auto 2rem; line-height:1.7;">SUBTITLE</p>
    <a href="#lead-form" style="display:inline-block; padding:1rem 3rem; background:linear-gradient(135deg,#c9a555,#e8da94); color:#000; font-weight:700; font-size:1.125rem; border-radius:999px; text-decoration:none; box-shadow:0 4px 15px rgba(201,165,85,0.3);">CTA TEXT</a>
  </div>
</div>

BLOCK 2 — BENEFITS/CONTENT (white or light background):
- Use a grid or alternating layout with icons/emoji
- Trust indicators with gold accents
- Campaign details in clear, scannable format
- Styled cards or feature boxes
- Example structure: 3-4 benefit cards in a responsive flex/grid layout

BLOCK 3 — LEAD CAPTURE (warm background #faf6ee or similar):
- Use the shortcode: [lead_form title="..." fields="name,phone" submit_text="..." display="inline"]
- Surround with compelling copy and design
- Add urgency text below the form
- The shortcode renders the actual form — just wrap it in nice HTML

BLOCK 4 (optional) — FAQ or FINAL CTA:
- Accordion-style FAQ with <details>/<summary> tags
- Or a final WhatsApp CTA using: [whatsapp text="..." message="..." size="large" rounded="true"]

QUALITY STANDARD:
- Each block should look like it was designed in Figma and hand-coded
- Use box-shadow, border-radius, gradients, spacing for premium feel
- Icons: use emoji (✅ 🔬 👁️ 💎 🏆 ⭐ 🎯 💫) for visual elements
- Ensure responsive: use max-width, clamp(), flex-wrap, percentage widths

Return ONLY valid JSON (no markdown backticks):
{
  "blocks": [
    { "id": "custom-hero1", "type": "custom", "data": { "html": "<div>...</div>" }, "settings": {} },
    { "id": "custom-benefits1", "type": "custom", "data": { "html": "<div>...</div>" }, "settings": {} },
    { "id": "custom-form1", "type": "custom", "data": { "html": "<div>...</div>" }, "settings": {} }
  ],
  "seo_title": "SEO title 50-60 chars in Hebrew",
  "seo_description": "Meta description 150-160 chars in Hebrew"
}`;

    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return errRes(`Claude API ${res.status}: ${errText}`, 502);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    let cleaned = text.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const result = JSON.parse(cleaned);

    if (!Array.isArray(result.blocks) || result.blocks.length === 0) {
      return errRes("AI returned no blocks", 422);
    }

    // Ensure each block has id and type=custom
    for (const block of result.blocks) {
      if (!block.id) {
        block.id = "custom-" + Math.random().toString(36).slice(2, 8);
      }
      if (block.type !== "custom") {
        block.type = "custom";
      }
      // Ensure data.html exists
      if (!block.data?.html && block.data) {
        block.data = { html: block.data.html || "" };
      }
    }

    return jsonRes({
      success: true,
      blocks: result.blocks,
      seo_title: result.seo_title || "",
      seo_description: result.seo_description || "",
    });
  } catch (e) {
    return errRes(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
