/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const userPrompt = `אתה מעצב דפי נחיתה מקצועי עבור אתר אופטיקה ישראלי (אופטיקה פריזמה אשקלון).
צור דף נחיתה שיווקי ומקצועי בעברית.

שם העמוד: ${title}
${prompt ? `תיאור הקמפיין מהלקוח: ${prompt}` : ""}
${references ? `כתובות לדוגמה/השראה: ${references}` : ""}

צור בלוקים (blocks) לדף נחיתה. כל בלוק הוא אובייקט JSON עם type, data, settings.
ייצר 5-7 בלוקים מהסוגים הבאים:

1. hero — כותרת מושכת ותת-כותרת. data: { title, subtitle, status_text, status_bg: "gold", title_size: "large" }. settings: { bg_color: "#1a1a1a", text_color: "#ffffff", padding: "lg" }
2. text — טקסט שיווקי ומשכנע ב-HTML עם <p> tags. data: { body: "<p>...</p><p>...</p>" }. settings: { max_width: "800px", padding: "md" }
3. cta — קריאה לפעולה. data: { title, label, action: "whatsapp" }. settings: { padding: "md" }
4. lead_form — טופס לידים. data: { title, fields: ["name","phone"], submit_text: "שלח" }. settings: { bg_color: "#f9fafb", padding: "lg" }
5. trust_badges — אייקוני אמון. data: { badges: [{ emoji, title, subtitle },...] }. settings: { padding: "md" }
6. faq — שאלות ותשובות. data: { title, items: [{question, answer},...] }. settings: { padding: "md" }
7. products — בלוק מוצרים (אם רלוונטי). data: { title, limit: 6 }. settings: { padding: "md" }

כללים:
- כתוב עברית שיווקית, מקצועית, חמה — עם טריגרים רגשיים ודחיפות
- ה-hero חייב לכלול כותרת מושכת (לא רק לחזור על השם) וכותרת משנה
- הטקסט השיווקי חייב להיות 2-3 פסקאות עם ערך אמיתי
- trust_badges חייב לכלול 3-4 אייקוני אמון עם emoji (למשל ✅, 🔬, 👁️, 💎)
- כלול לפחות 3 שאלות ותשובות רלוונטיות ב-FAQ
- הטופס חייב לכלול כותרת מזמינה
- אל תחזיר markdown — רק JSON
- כל בלוק חייב id ייחודי בפורמט: {type}-{random} (למשל hero-a1b2c3)

החזר JSON בלבד (בלי backticks):
{
  "blocks": [...],
  "seo_title": "כותרת SEO (50-60 תווים)",
  "seo_description": "תיאור מטא (150-160 תווים)"
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
        max_tokens: 6000,
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
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const result = JSON.parse(cleaned);

    // Validate blocks array exists
    if (!Array.isArray(result.blocks) || result.blocks.length === 0) {
      return errRes("AI returned no blocks", 422);
    }

    // Ensure each block has an id
    for (const block of result.blocks) {
      if (!block.id) {
        const rand = Math.random().toString(36).slice(2, 8);
        block.id = `${block.type || "block"}-${rand}`;
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
