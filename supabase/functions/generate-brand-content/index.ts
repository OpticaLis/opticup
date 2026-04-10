/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STYLE_GUIDE, STRICT_MODE_SUFFIX } from "./style-guide.ts";
import { validateGenerateOutput, validateTranslateOutput } from "./validators.ts";

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

/** Strip code fences and sanitize literal newlines/tabs inside JSON string values */
function sanitizeJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  let result = "";
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { result += ch; escapeNext = false; continue; }
    if (ch === "\\") { result += ch; escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }
    result += ch;
  }
  return result;
}

/** Call Claude API and return parsed JSON, or throw */
async function callClaude(prompt: string, maxTokens = 4096): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText = (data.content?.[0]?.text ?? "").trim();
  const sanitized = sanitizeJsonText(rawText);
  return JSON.parse(sanitized);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    if (!ANTHROPIC_API_KEY) {
      return jsonRes({ error: "ANTHROPIC_API_KEY not configured", success: false }, 500);
    }

    // ── Translate mode ──
    if (mode === "translate") {
      const {
        brand_name: tBrand,
        source_description1,
        source_description2,
        source_tagline,
        source_seo_title,
        source_seo_description,
        target_lang,
      } = body;

      if (!tBrand || !target_lang) {
        return jsonRes({ error: "translate mode: brand_name and target_lang required", success: false }, 400);
      }

      const langName = target_lang === "en" ? "English" : target_lang === "ru" ? "Russian" : target_lang;

      const tPrompt = `Translate the following Hebrew brand page content for "${tBrand}" to ${langName}.

Rules:
- Translate like a native speaker, not literally. Adapt tone for the target audience.
- Keep brand names and proper nouns in their original Latin form (do NOT transliterate).
- Use ONLY a short hyphen (-), never an em-dash or en-dash.
- Tone: professional but warm, the same brand voice as the source.
- Preserve all HTML <p> tags exactly. Do not add or remove tags.
- For SEO title: keep the brand name visible, ~50-60 chars in target language.
- For SEO description: ~150-160 chars, include the brand name and key selling points.

SOURCE_TAGLINE: ${source_tagline || ""}
SOURCE_DESCRIPTION1:
${source_description1 || ""}
SOURCE_DESCRIPTION2:
${source_description2 || ""}
SOURCE_SEO_TITLE: ${source_seo_title || ""}
SOURCE_SEO_DESCRIPTION: ${source_seo_description || ""}

Return ONLY a JSON object (no markdown, no backticks):
{
  "tagline": "...",
  "description1": "<p>...</p><p>...</p><p>...</p>",
  "description2": "<p>...</p>",
  "seo_title": "...",
  "seo_description": "..."
}`;

      // Attempt 1
      let tResult: Record<string, unknown>;
      try {
        tResult = await callClaude(tPrompt);
      } catch (_e) {
        return jsonRes({ error: "Failed to parse translation response (attempt 1)", success: false }, 500);
      }

      const v1 = validateTranslateOutput(tResult, target_lang);
      if (v1.valid) {
        console.log(`[translate] ${tBrand} -> ${target_lang}: passed validation (attempt 1)`);
        return jsonRes({ success: true, ...tResult });
      }

      // Attempt 2 (strict mode)
      console.log(`[translate] ${tBrand} -> ${target_lang}: attempt 1 failed: ${v1.reasons.join("; ")}`);
      const strictSuffix = STRICT_MODE_SUFFIX.replace("{REASONS}", v1.reasons.join("\n"));
      try {
        tResult = await callClaude(tPrompt + strictSuffix);
      } catch (_e) {
        return jsonRes({ error: "Failed to parse translation response (attempt 2)", success: false }, 500);
      }

      const v2 = validateTranslateOutput(tResult, target_lang);
      if (v2.valid) {
        console.log(`[translate] ${tBrand} -> ${target_lang}: passed validation (attempt 2, strict)`);
        return jsonRes({ success: true, ...tResult });
      }

      console.error(`[translate] ${tBrand} -> ${target_lang}: DOUBLE FAILURE. A1: ${v1.reasons.join("; ")}. A2: ${v2.reasons.join("; ")}`);
      return jsonRes({
        error: "Translation failed validation on both attempts",
        attempt1_reasons: v1.reasons,
        attempt2_reasons: v2.reasons,
        success: false,
      }, 500);
    }

    // ── Generate mode (default) ──
    const { brand_name, tenant_id, prompt, current_content } = body;

    if (!brand_name || !tenant_id) {
      return jsonRes({ error: "Missing brand_name or tenant_id", success: false }, 400);
    }

    const userContent = prompt && current_content
      ? `${STYLE_GUIDE}

---

Brand: ${brand_name}

Current content:
- Tagline: ${current_content.tagline || '(empty)'}
- Description Part 1: ${current_content.description1 || '(empty)'}
- Description Part 2: ${current_content.description2 || '(empty)'}
- SEO Title: ${current_content.seo_title || '(empty)'}
- SEO Description: ${current_content.seo_description || '(empty)'}

User instruction: ${prompt}

Modify the content according to the user's instruction. Return ONLY a JSON object (no markdown, no backticks) with ALL fields, even those not changed:
{
  "tagline": "...",
  "description1": "...",
  "description2": "...",
  "seo_title": "...",
  "seo_description": "..."
}
Keep HTML <p> tags in descriptions. Follow the style guide.`
      : `${STYLE_GUIDE}

---

Generate brand page content for: ${brand_name}

Follow the style guide EXACTLY. Use REAL facts about ${brand_name} — founding year, country, design philosophy, signature elements. The description2 must be about why buy at Prizma, adapted with the brand name.`;

    // Attempt 1
    let parsed: Record<string, unknown>;
    try {
      parsed = await callClaude(userContent, 4000);
    } catch (_e) {
      return jsonRes({ error: "Failed to parse AI response (attempt 1)", success: false }, 500);
    }

    let validation = validateGenerateOutput(parsed);
    let logStatus = "generated";

    if (!validation.valid) {
      // Attempt 2 (strict mode)
      console.log(`[generate] ${brand_name}: attempt 1 failed: ${validation.reasons.join("; ")}`);
      const strictSuffix = STRICT_MODE_SUFFIX.replace("{REASONS}", validation.reasons.join("\n"));
      try {
        parsed = await callClaude(userContent + strictSuffix, 4000);
      } catch (_e) {
        return jsonRes({ error: "Failed to parse AI response (attempt 2)", success: false }, 500);
      }

      const v2 = validateGenerateOutput(parsed);
      if (!v2.valid) {
        console.error(`[generate] ${brand_name}: DOUBLE FAILURE. A1: ${validation.reasons.join("; ")}. A2: ${v2.reasons.join("; ")}`);
        return jsonRes({
          error: "Generation failed validation on both attempts",
          attempt1_reasons: validation.reasons,
          attempt2_reasons: v2.reasons,
          success: false,
        }, 500);
      }
      logStatus = "generated_strict";
      console.log(`[generate] ${brand_name}: passed validation (attempt 2, strict)`);
    } else {
      console.log(`[generate] ${brand_name}: passed validation (attempt 1)`);
    }

    // Log the generation to brand_content_log
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("id")
      .ilike("name", `%${brand_name}%`)
      .eq("tenant_id", tenant_id)
      .single();

    if (brand) {
      const fieldMap: Record<string, string> = {
        tagline: "brand_description_short",
        description1: "brand_description_part1",
        description2: "brand_description_part2",
        seo_title: "seo_title",
        seo_description: "seo_description",
      };

      for (const [field, dbField] of Object.entries(fieldMap)) {
        await supabaseAdmin.from("brand_content_log").insert({
          tenant_id,
          brand_id: brand.id,
          field_name: dbField,
          ai_generated: parsed[field],
          status: logStatus,
        });
      }
    }

    return jsonRes({ success: true, ...parsed });
  } catch (error) {
    return jsonRes({ error: (error as Error).message, success: false }, 500);
  }
});
