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

const lengthMap: Record<string, number> = {
  short: 500,
  medium: 1000,
  long: 2000,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errRes("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { mode } = body;

    // ── Translate mode: translate an existing blog post to target_lang ──
    if (mode === "translate") {
      const { source_title, source_content, source_excerpt, target_lang } = body;
      if (!source_content || !target_lang) {
        return errRes("translate mode: source_content and target_lang required", 400);
      }
      const langName = target_lang === "en" ? "English" : target_lang === "ru" ? "Russian" : target_lang;
      const tPrompt = `Translate the following Hebrew blog post to ${langName}.
Preserve all HTML tags exactly (h2, p, ul, li, strong, a, etc.). Do not add new HTML.
Keep brand names and proper nouns in their original form when common.
Return JSON only (no markdown, no backticks):
{
  "title": "translated title",
  "content": "translated HTML content",
  "excerpt": "translated excerpt",
  "seo_title": "translated SEO title (50-60 chars)",
  "seo_description": "translated meta description (150-160 chars)"
}

SOURCE_TITLE: ${source_title || ""}
SOURCE_EXCERPT: ${source_excerpt || ""}
SOURCE_CONTENT:
${source_content}`;

      const tRes = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 4096,
          messages: [{ role: "user", content: tPrompt }],
        }),
      });
      if (!tRes.ok) {
        const errText = await tRes.text();
        return errRes(`Claude API error ${tRes.status}: ${errText}`, 502);
      }
      const tData = await tRes.json();
      let tText = (tData.content?.[0]?.text ?? "").trim();
      if (tText.startsWith("```")) {
        tText = tText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const tResult = JSON.parse(tText);
      return jsonRes({ success: true, ...tResult });
    }

    // ── Generate mode (default) ──
    const {
      tenant_id,
      topic,
      style = "informative",
      target_length = "medium",
      keywords = [],
    } = body;

    if (!tenant_id || !topic) {
      return errRes("Missing required fields: tenant_id, topic", 400);
    }

    const wordCount = lengthMap[target_length] ?? 1000;

    const prompt = `אתה כותב תוכן מקצועי עבור אתר חנות אופטיקה ישראלית.
כתוב פוסט בלוג בנושא: ${topic}
סגנון: ${style === "promotional" ? "שיווקי ומושך" : "מקצועי, אינפורמטיבי, מועיל"}
שפה: עברית
אורך: כ-${wordCount} מילים
${keywords.length > 0 ? `מילות מפתח לכלול: ${keywords.join(", ")}` : ""}

כתוב את הפוסט כ-HTML תקני עם:
- כותרות H2 לסעיפים
- פסקאות <p>
- רשימות <ul>/<li> כשמתאים
- טון מקצועי אך נגיש
- כלול עצות מעשיות

בנוסף, ייצר:
- seo_title: כותרת SEO (50-60 תווים, כולל מילת מפתח ראשית)
- seo_description: תיאור מטא SEO (150-160 תווים)
- slug: slug ידידותי ל-URL (באנגלית או עברית מקודדת)
- categories: קטגוריות מומלצות (מערך מחרוזות)
- excerpt: תקציר (2-3 משפטים)

החזר JSON בלבד (בלי markdown, בלי backticks):
{
  "title": "...",
  "content": "<p>...</p>...",
  "seo_title": "...",
  "seo_description": "...",
  "slug": "...",
  "categories": ["..."],
  "excerpt": "..."
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
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return errRes(`Claude API error ${res.status}: ${errText}`, 502);
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

    // Save as draft in blog_posts
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: saved, error } = await db
      .from("blog_posts")
      .insert({
        tenant_id,
        slug: result.slug || topic.toLowerCase().replace(/\s+/g, "-"),
        lang: "he",
        title: result.title || topic,
        content: result.content,
        excerpt: result.excerpt || "",
        categories: result.categories || [],
        seo_title: result.seo_title || "",
        seo_description: result.seo_description || "",
        status: "draft",
        source: "ai",
      })
      .select("id, slug")
      .single();

    if (error) {
      return errRes(`DB save error: ${error.message}`, 500);
    }

    return jsonRes({
      success: true,
      post_id: saved.id,
      slug: saved.slug,
      ...result,
    });
  } catch (e) {
    return errRes(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
