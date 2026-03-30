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

/* ── Detect image media type from file bytes (magic numbers) ── */
function detectMediaTypeFromBytes(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return null;
}

/* ── Detect image media type from file extension ── */
function getMediaTypeFromExt(storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
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

    // Byte detection is authoritative; fall back to extension
    const mediaType = detectMediaTypeFromBytes(buf) ?? getMediaTypeFromExt(storagePath);
    return { base64, mediaType };
  } catch {
    return null;
  }
}

/* ── Build Claude prompt — Mode A (with images) ── */
function buildPromptWithImages(
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
שמות מותגים ודגמים בלבד יכולים להישאר בשפה המקורית.
תמונת המוצר מצורפת — השתמש בה לתיאור סגנון המסגרת, למי היא מתאימה, ולאילו אירועים.`
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
      "description — תיאור שיווקי מלא (2-3 משפטים, כולל סגנון המסגרת, למי מתאים, לאילו אירועים, והמלצת סטיילינג)",
    seo_title: "seo_title — כותרת SEO (50-60 תווים, כולל מותג + דגם)",
    seo_description: "seo_description — תיאור מטא SEO (150-160 תווים)",
    alt_text: "alt_text — טקסט חלופי לתמונה (תיאורי ונגיש, מבוסס על מה שנראה בתמונה)",
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

/* ── Build Claude prompt — Mode B (no images) ── */
function buildPromptNoImages(
  product: {
    brand_name: string;
    model: string;
    color: string;
    size: string;
    product_type: string;
    sell_price?: number;
  },
  contentTypes: string[]
): string {
  const parts: string[] = [];

  // Filter out alt_text — it's a simple template for no-image products
  const filteredTypes = contentTypes.filter((t) => t !== "alt_text");

  parts.push(
    `אתה קופירייטר עבור אתר חנות אופטיקה ישראלית.
כתוב תיאורים עובדתיים בלבד למוצרי משקפיים — ללא תמונה זמינה.
אל תכתוב המלצות סטיילינג, אל תכתוב "נראה נהדר עם", אל תתאר איך המסגרת נראית.
כתוב רק עובדות: מותג, דגם, צבע, חומר, סוג.
שפה: עברית בלבד — כתוב הכל בעברית! אל תכתוב ברוסית או באנגלית.
שמות מותגים ודגמים בלבד יכולים להישאר בשפה המקורית.`
  );

  parts.push(`\nייצר את התוכן הבא עבור המוצר:`);

  const typeInstructions: Record<string, string> = {
    description:
      "description — תיאור עובדתי קצר (1-2 משפטים, מותג + דגם + צבע + סוג בלבד, ללא סטיילינג)",
    seo_title: "seo_title — כותרת SEO (50-60 תווים, כולל מותג + דגם)",
    seo_description: "seo_description — תיאור מטא SEO בסיסי (150-160 תווים, מבוסס על נתונים זמינים בלבד)",
  };

  for (const ct of filteredTypes) {
    if (typeInstructions[ct]) parts.push(`- ${typeInstructions[ct]}`);
  }

  parts.push(
    `\nמוצר: ${product.brand_name} ${product.model}, צבע: ${product.color}, מידה: ${product.size}, סוג: ${product.product_type}`
  );
  if (product.sell_price) {
    parts.push(`מחיר: ₪${product.sell_price}`);
  }

  parts.push(`\nהחזר JSON בלבד בפורמט הבא (בלי markdown, בלי backticks):
{${filteredTypes.map((t) => `"${t}": "..."`).join(", ")}}`);

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
      bulk = false,
    } = body;

    if (!tenant_id || !product_id || !product_data) {
      return errRes("Missing required fields: tenant_id, product_id, product_data", 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Determine if product has images
    const hasImages = !!image_storage_path;

    // Bulk generate: skip products without images entirely
    if (bulk && !hasImages) {
      return jsonRes({
        success: true,
        product_id,
        skipped: true,
        reason: "No images — skipped in bulk mode",
        saved: {},
      });
    }

    // Fetch image if available (Mode A)
    let imageData: { base64: string; mediaType: string } | null = null;
    if (hasImages) {
      imageData = await fetchImageBase64(db, image_storage_path);
    }

    // Build prompt based on mode
    let prompt: string;
    let aiResult: Record<string, string>;

    if (imageData) {
      // Mode A — with images: full marketing content via Claude Vision
      prompt = buildPromptWithImages(product_data, content_types, brand_corrections);
      aiResult = await callClaude(prompt, imageData);
    } else {
      // Mode B — no images: factual content only, no Vision
      prompt = buildPromptNoImages(product_data, content_types);
      aiResult = await callClaude(prompt, null);
      // Alt text is a simple template for no-image products
      if (content_types.includes("alt_text")) {
        aiResult["alt_text"] =
          `${product_data.brand_name} ${product_data.model} ${product_data.color} ${product_data.product_type}`;
      }
    }

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
