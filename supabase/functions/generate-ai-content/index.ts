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

/* ── Fetch product image as base64 ── */
async function fetchImageBase64(
  db: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const { data: signedData, error } = await db.storage
      .from("frame-images")
      .createSignedUrl(storagePath, 300);
    if (error || !signedData?.signedUrl) return null;

    const res = await fetch(signedData.signedUrl);
    if (!res.ok) return null;

    const buf = new Uint8Array(await res.arrayBuffer());
    const base64 = btoa(String.fromCharCode(...buf));

    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "webp";
    const mimeMap: Record<string, string> = {
      webp: "image/webp",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    return { base64, mediaType: mimeMap[ext] ?? "image/webp" };
  } catch {
    return null;
  }
}

/* ── Build Claude prompt ── */
function buildPrompt(
  product: {
    brand_name: string;
    model: string;
    color: string;
    size: string;
    product_type: string;
    sell_price?: number;
  },
  contentTypes: string[],
  corrections: { original: string; corrected: string }[]
): string {
  const parts: string[] = [];

  parts.push(
    `אתה קופירייטר מקצועי עבור אתר חנות אופטיקה ישראלית.
כתוב תיאורים שיווקיים למוצרי משקפיים.
סגנון: מקצועי אך נגיש, כולל המלצות סטיילינג.
שפה: עברית בלבד — כתוב הכל בעברית! אל תכתוב ברוסית או באנגלית.
שמות מותגים ודגמים בלבד יכולים להישאר בשפה המקורית.`
  );

  if (corrections.length > 0) {
    parts.push(`\nבעל החנות תיקן בעבר תיאורים למותג הזה. למד מהתיקונים:\n`);
    for (const c of corrections.slice(0, 5)) {
      parts.push(`מקורי: "${c.original}"\nתיקון: "${c.corrected}"\n`);
    }
    parts.push("אמץ את הסגנון והטרמינולוגיה שהבעלים מעדיף.\n");
  }

  parts.push(`\nייצר את התוכן הבא עבור המוצר:`);

  const typeInstructions: Record<string, string> = {
    description:
      "description — תיאור שיווקי (2-3 משפטים, כולל המלצת סטיילינג)",
    seo_title: "seo_title — כותרת SEO (50-60 תווים, כולל מותג + דגם)",
    seo_description: "seo_description — תיאור מטא SEO (150-160 תווים)",
    alt_text: "alt_text — טקסט חלופי לתמונה (תיאורי, נגיש)",
  };

  for (const ct of contentTypes) {
    if (typeInstructions[ct]) parts.push(`- ${typeInstructions[ct]}`);
  }

  parts.push(
    `\nמוצר: ${product.brand_name} ${product.model}, צבע: ${product.color}, מידה: ${product.size}, סוג: ${product.product_type}`
  );
  if (product.sell_price) {
    parts.push(`מחיר: ₪${product.sell_price}`);
  }

  parts.push(`\nהחזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{${contentTypes.map((t) => `"${t}": "..."`).join(", ")}}`);

  return parts.join("\n");
}

/* ── Call Claude API with retry ── */
async function callClaude(
  prompt: string,
  imageData: { base64: string; mediaType: string } | null,
  maxRetries = 3
): Promise<Record<string, string>> {
  const content: Array<Record<string, unknown>> = [];

  if (imageData) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageData.mediaType,
        data: imageData.base64,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system:
            "You are a professional Hebrew copywriter for an Israeli optical store. " +
            "You MUST write ALL content in Hebrew (עברית) ONLY. " +
            "Never write in English, Russian, or any other language. Every single word of your output must be in Hebrew. " +
            "The only exception: brand names and model names may stay in their original language.",
          messages: [{ role: "user", content }],
        }),
      });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Claude API ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text =
        data.content?.[0]?.text ?? data.content?.[0]?.value ?? "";

      // Parse JSON from response (handle potential markdown wrapping)
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }
      return JSON.parse(cleaned);
    } catch (e) {
      if (attempt === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

/* ── Main handler ── */
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
      product_id,
      content_types = ["description", "seo_title", "seo_description", "alt_text"],
      product_data,
      image_storage_path,
      brand_corrections = [],
    } = body;

    if (!tenant_id || !product_id || !product_data) {
      return errRes("Missing required fields: tenant_id, product_id, product_data", 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch image if storage path provided
    let imageData: { base64: string; mediaType: string } | null = null;
    if (image_storage_path) {
      imageData = await fetchImageBase64(db, image_storage_path);
    }

    // Build prompt and call Claude
    const prompt = buildPrompt(product_data, content_types, brand_corrections);
    const aiResult = await callClaude(prompt, imageData);

    // Save results to ai_content table
    const saved: Record<string, string> = {};
    const errors: string[] = [];

    for (const ct of content_types) {
      const value = aiResult[ct];
      if (!value) {
        errors.push(`Missing ${ct} in AI response`);
        continue;
      }

      const { error } = await db.from("ai_content").upsert(
        {
          tenant_id,
          entity_type: "product",
          entity_id: product_id,
          content_type: ct,
          content: value,
          language: "he",
          status: "auto",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_id,entity_type,entity_id,content_type,language",
        }
      );

      if (error) {
        errors.push(`Failed to save ${ct}: ${error.message}`);
      } else {
        saved[ct] = value;
      }
    }

    // Auto-translate saved Hebrew content to EN + RU
    const translationErrors: string[] = [];
    const translateUrl = `${SUPABASE_URL}/functions/v1/translate-content`;

    for (const ct of Object.keys(saved)) {
      for (const lang of ["en", "ru"]) {
        try {
          const tRes = await fetch(translateUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              tenant_id,
              source_content: saved[ct],
              target_lang: lang,
              content_type: ct,
              entity_type: "product",
              entity_id: product_id,
            }),
          });
          if (!tRes.ok) {
            const tErr = await tRes.text();
            translationErrors.push(`${ct}→${lang}: ${tErr}`);
          }
        } catch (e) {
          translationErrors.push(
            `${ct}→${lang}: ${e instanceof Error ? e.message : "fetch failed"}`
          );
        }
      }
    }

    return jsonRes({
      success: true,
      product_id,
      saved,
      errors: errors.length > 0 ? errors : undefined,
      translation_errors:
        translationErrors.length > 0 ? translationErrors : undefined,
    });
  } catch (e) {
    return errRes(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
