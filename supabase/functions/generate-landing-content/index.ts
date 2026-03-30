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
    const {
      tenant_id,
      page_type = "campaign",
      topic,
      products_context = [],
      tone = "promotional",
      landing_page_id,
    } = body;

    if (!tenant_id || !topic) {
      return errRes("Missing: tenant_id, topic", 400);
    }

    const toneDesc =
      tone === "promotional"
        ? "שיווקי ומושך, עם קריאה לפעולה ברורה"
        : "מקצועי ואינפורמטיבי";

    const prompt = `אתה קופירייטר מקצועי עבור אתר חנות אופטיקה ישראלית.
ייצר תוכן לדף נחיתה בנושא: ${topic}
סוג דף: ${page_type}
טון: ${toneDesc}
שפה: עברית
${products_context.length > 0 ? `מותגים/מוצרים רלוונטיים: ${products_context.join(", ")}` : ""}

ייצר את הפריטים הבאים:
1. headline — כותרת ראשית (מושכת, 5-10 מילים)
2. subheadline — כותרת משנה (משפט אחד)
3. description — תיאור (2-3 פסקאות HTML, מקצועי ומושך)
4. cta_text — טקסט כפתור קריאה לפעולה (2-4 מילים)
5. seo_title — כותרת SEO (50-60 תווים)
6. seo_description — תיאור מטא (150-160 תווים)

החזר JSON בלבד (בלי markdown):
{
  "headline": "...",
  "subheadline": "...",
  "description": "<p>...</p>",
  "cta_text": "...",
  "seo_title": "...",
  "seo_description": "..."
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
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
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

    // Save to ai_content table
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const entityId = landing_page_id || crypto.randomUUID();

    const contentTypes = [
      { type: "description", content: result.description },
      { type: "seo_title", content: result.seo_title },
      { type: "seo_description", content: result.seo_description },
    ];

    for (const ct of contentTypes) {
      if (!ct.content) continue;
      await db.from("ai_content").upsert(
        {
          tenant_id,
          entity_type: "landing_page",
          entity_id: entityId,
          content_type: ct.type,
          content: ct.content,
          language: "he",
          status: "auto",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "tenant_id,entity_type,entity_id,content_type,language",
        }
      );
    }

    return jsonRes({
      success: true,
      entity_id: entityId,
      ...result,
    });
  } catch (e) {
    return errRes(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
