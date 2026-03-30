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

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
};

/* ── Build translation prompt ── */
function buildTranslationPrompt(
  sourceContent: string,
  targetLang: string,
  contentType: string,
  glossary: { term_he: string; term_translated: string }[],
  corrections: { original: string; corrected: string }[]
): string {
  const parts: string[] = [];
  const langName = LANG_NAMES[targetLang] ?? targetLang;

  parts.push(
    `You are a professional translator for an Israeli optical store website.
Translate the following Hebrew text to ${langName}.

CRITICAL RULES:
1. Maintain the same tone and style as the original.
2. Keep brand names and model numbers in their original form (e.g., "Balenciaga BB0126S").
3. ${targetLang === "ru" ? 'Use formal "вы" form.' : "Use American English spelling."}
4. Do NOT add any explanations or notes — return ONLY the translated text.`
  );

  if (glossary.length > 0) {
    parts.push(
      `\n5. Use these EXACT translations for optical terms (glossary):`
    );
    for (const g of glossary) {
      parts.push(`   "${g.term_he}" → "${g.term_translated}"`);
    }
  }

  if (corrections.length > 0) {
    parts.push(
      `\nThe store owner has corrected previous translations. Learn from these:`
    );
    for (const c of corrections.slice(0, 5)) {
      parts.push(`Original: "${c.original}"\nCorrected: "${c.corrected}"`);
    }
    parts.push("Adopt the style and terminology the owner prefers.");
  }

  const typeHints: Record<string, string> = {
    description: "This is a marketing product description (2-3 sentences).",
    seo_title: "This is an SEO title (keep 50-60 characters).",
    seo_description: "This is an SEO meta description (keep 150-160 characters).",
    alt_text: "This is image alt text (keep it descriptive and accessible).",
  };
  if (typeHints[contentType]) {
    parts.push(`\nContext: ${typeHints[contentType]}`);
  }

  parts.push(`\nText to translate:\n${sourceContent}`);

  return parts.join("\n");
}

/* ── Call Claude API ── */
async function callClaude(prompt: string, maxRetries = 3): Promise<string> {
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
          messages: [{ role: "user", content: prompt }],
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
      return (data.content?.[0]?.text ?? "").trim();
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
      source_content,
      target_lang,
      content_type,
      entity_type,
      entity_id,
      glossary: providedGlossary,
      corrections: providedCorrections,
    } = body;

    if (!tenant_id || !source_content || !target_lang || !content_type || !entity_type || !entity_id) {
      return errRes(
        "Missing required fields: tenant_id, source_content, target_lang, content_type, entity_type, entity_id",
        400
      );
    }

    if (!["en", "ru"].includes(target_lang)) {
      return errRes("target_lang must be 'en' or 'ru'", 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch glossary from DB if not provided
    let glossary = providedGlossary;
    if (!glossary) {
      const { data: glossaryData } = await db
        .from("translation_glossary")
        .select("term_he, term_translated")
        .eq("tenant_id", tenant_id)
        .eq("lang", target_lang)
        .eq("is_deleted", false);
      glossary = glossaryData ?? [];
    }

    // Fetch corrections from DB if not provided
    let corrections = providedCorrections;
    if (!corrections) {
      const { data: corrData } = await db
        .from("translation_corrections")
        .select("original_translation, corrected_translation")
        .eq("tenant_id", tenant_id)
        .eq("lang", target_lang)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10);
      corrections = (corrData ?? []).map((c: { original_translation: string; corrected_translation: string }) => ({
        original: c.original_translation,
        corrected: c.corrected_translation,
      }));
    }

    // Build prompt and call Claude
    const prompt = buildTranslationPrompt(
      source_content,
      target_lang,
      content_type,
      glossary,
      corrections
    );
    const translation = await callClaude(prompt);

    // Save to ai_content
    const { error: saveError } = await db.from("ai_content").upsert(
      {
        tenant_id,
        entity_type,
        entity_id,
        content_type,
        content: translation,
        language: target_lang,
        status: "auto",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tenant_id,entity_type,entity_id,content_type,language",
      }
    );

    if (saveError) {
      return errRes(`Failed to save translation: ${saveError.message}`, 500);
    }

    return jsonRes({
      success: true,
      entity_id,
      target_lang,
      content_type,
      translation,
    });
  } catch (e) {
    return errRes(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
