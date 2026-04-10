/**
 * Translation utilities: context loading, prompt building, memory, Claude API.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SHORTCODE_TRANSLATABLE_ATTRS } from './field-maps.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export const LANG_NAMES: Record<string, string> = { en: 'English', ru: 'Russian' };

// ─── Load translation context (glossary + corrections) ───────

export async function loadContext(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string
): Promise<{ glossary: any[]; corrections: any[] }> {
  const [glossaryResult, correctionsResult] = await Promise.all([
    db.from('translation_glossary')
      .select('term_he, term_translated')
      .eq('tenant_id', tenantId)
      .eq('lang', targetLang)
      .eq('is_deleted', false),
    db.from('translation_corrections')
      .select('original_translation, corrected_translation')
      .eq('tenant_id', tenantId)
      .eq('lang', targetLang)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (glossaryResult.error) console.error('[translate] Glossary query ERROR:', glossaryResult.error.message, glossaryResult.error.code);
  if (correctionsResult.error) console.error('[translate] Corrections query ERROR:', correctionsResult.error.message, correctionsResult.error.code);

  return {
    glossary: glossaryResult.data ?? [],
    corrections: (correctionsResult.data ?? []).map((c: any) => ({
      original: c.original_translation,
      corrected: c.corrected_translation,
    })),
  };
}

// ─── Build system prompt ─────────────────────────────────────

export function buildSystemPrompt(
  targetLang: string,
  glossary: any[],
  corrections: any[],
  sourceText: string
): string {
  const langName = LANG_NAMES[targetLang] ?? targetLang;
  const relevantGlossary = glossary.filter((g) => sourceText.includes(g.term_he));
  const parts: string[] = [];

  parts.push(`You are writing website content for an Israeli optical store. The tone should be professional but warm and approachable — like a friendly store talking to its customers, not a lawyer drafting a contract.
Translate from Hebrew to ${langName}.

NATURAL FLUENCY:
Translate for meaning, not word-for-word. The result should read as if originally written in ${langName} by a native speaker. Hebrew sentence structures should be restructured into natural ${langName} patterns.

TONE ADAPTATION:
- Marketing copy: persuasive, warm, engaging.
- Store policies and legal pages: clear, friendly language. Avoid overly legalistic phrasing.
  BAD: "for the avoidance of doubt", "the customer will be entitled to", "subject to verification"
  GOOD: "to be clear", "you can" / "you'll receive", "after we verify"
- Product descriptions: informative yet approachable.

CULTURAL ADAPTATION:
Adapt expressions to ${langName} conventions. Hebrew formal constructions should become natural equivalents:
- "ביטול עסקה יהיה מותנה ב..." → "Returns are only accepted if..." (NOT "transaction cancellation will be conditional on")
- "subject to" → rephrase naturally ("once", "after", "if")
- "the customer will be entitled to" → "you can" or "you'll receive"
- "for the avoidance of doubt" → remove or simplify ("to be clear" or just state the fact)
- "transaction cancellation" → "cancellation" or "return"

PRESERVE EXACTLY:
- Brand names (Cazal, Gucci, Ray-Ban) — NEVER translate
- Product codes, barcodes, URLs, phone numbers — keep as-is
- ₪ symbol for prices (not ILS) — target audience is in Israel
- Addresses — keep as-is
- All numbers, prices, timeframes, and policy details must remain exactly accurate
- ALL HTML tags — only translate text content between tags
- Shortcode syntax [name attr="val"] — only translate text attribute values
- Markdown formatting (**, *, ##, etc.)
- Emojis — keep as-is

SEO: Write natural text optimized for search. No keyword stuffing — write for humans.
${targetLang === 'ru' ? 'RUSSIAN: Use formal "вы" form. Use natural Russian word order.' : 'ENGLISH: Use American English. Use active voice, short sentences.'}`);

  if (relevantGlossary.length > 0) {
    parts.push('\nGLOSSARY (use these exact translations):');
    for (const g of relevantGlossary) {
      parts.push(`  "${g.term_he}" → "${g.term_translated}"`);
    }
  }

  if (corrections.length > 0) {
    parts.push('\nOWNER CORRECTIONS (adopt their style):');
    for (const c of corrections) {
      parts.push(`  "${c.original}" → "${c.corrected}"`);
    }
  }

  const scRules = Object.entries(SHORTCODE_TRANSLATABLE_ATTRS)
    .filter(([, a]) => a.length > 0)
    .map(([t, a]) => `  [${t}]: translate: ${a.join(', ')}`)
    .join('\n');
  if (scRules) {
    parts.push(`\nSHORTCODE RULES:\n${scRules}\nKeep all other attrs unchanged.`);
  }

  return parts.join('\n');
}

// ─── Translation memory ──────────────────────────────────────

export async function checkMemory(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string,
  texts: string[]
): Promise<Map<string, string>> {
  const hits = new Map<string, string>();
  if (texts.length === 0) return hits;

  const { data } = await db
    .from('translation_memory')
    .select('source_text, translated_text')
    .eq('tenant_id', tenantId)
    .eq('target_lang', targetLang)
    .gte('confidence', 0.9)
    .in('source_text', texts.slice(0, 100));

  if (data) {
    for (const row of data) {
      hits.set(row.source_text, row.translated_text);
    }
  }
  return hits;
}

export async function saveMemoryBatch(
  db: SupabaseClient,
  tenantId: string,
  targetLang: string,
  pairs: { source: string; translated: string; context: string }[]
): Promise<void> {
  if (pairs.length === 0) return;

  const rows = pairs.map((p) => ({
    tenant_id: tenantId,
    source_lang: 'he',
    target_lang: targetLang,
    source_text: p.source,
    translated_text: p.translated,
    context: p.context,
    scope: 'tenant',
    confidence: 0.7,
  }));

  await db.from('translation_memory').upsert(rows, {
    onConflict: 'tenant_id,source_lang,target_lang,source_text',
    ignoreDuplicates: false,
  });
}

// ─── Claude API ──────────────────────────────────────────────

export async function callClaude(
  systemPrompt: string,
  userContent: string,
  maxTokens = 4096
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (res.status === 429) {
      console.warn(`[translate] Claude API 429 rate limited, retry ${attempt + 1}/3`);
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[translate] Claude API error ${res.status}:`, errText.slice(0, 500));
      throw new Error(`Claude API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = (data.content?.[0]?.text ?? '').trim();
    console.log(`[translate] Claude API success: model=${data.model}, stop=${data.stop_reason}, input=${data.usage?.input_tokens}, output=${data.usage?.output_tokens}`);
    if (!text) console.warn('[translate] ⚠ Claude returned EMPTY text!');
    return text;
  }
  throw new Error('Claude API max retries exceeded');
}

// ─── Utility: set nested value by dot path ───────────────────

export function setNestedValue(obj: any, path: string, value: string): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const idx = parseInt(key);
    current = !isNaN(idx) ? current[idx] : current[key];
    if (!current) return;
  }

  const lastKey = parts[parts.length - 1];
  const lastIdx = parseInt(lastKey);
  if (!isNaN(lastIdx)) {
    current[lastIdx] = value;
  } else {
    current[lastKey] = value;
  }
}

// ─── Parse Claude JSON response ──────────────────────────────

export function parseClaudeJson(response: string): Record<string, string> {
  let jsonStr = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Claude JSON: ${jsonStr.slice(0, 200)}`);
  }
}

// ─── Translation validation (wrapper contamination prevention) ──

const FORBIDDEN_PATTERNS: { test: (s: string) => boolean; reason: string }[] = [
  { test: (s) => /^\s*#/.test(s), reason: 'starts with # heading' },
  { test: (s) => s.includes('## '), reason: "contains '## ' subheading" },
  { test: (s) => s.includes('**'), reason: "contains '**' bold markdown" },
  { test: (s) => s.includes('---'), reason: "contains '---' horizontal rule" },
  { test: (s) => /alternative/i.test(s), reason: "contains 'Alternative'" },
  { test: (s) => /character count/i.test(s), reason: "contains 'Character count'" },
  { test: (s) => s.includes('(40-55 characters)'), reason: "contains '(40-55 characters)'" },
  { test: (s) => s.includes('(50-60 characters)'), reason: "contains '(50-60 characters)'" },
  { test: (s) => s.includes('(130-160 characters)'), reason: "contains '(130-160 characters)'" },
  { test: (s) => s.includes('(150-160 characters)'), reason: "contains '(150-160 characters)'" },
  { test: (s) => /recommendation/i.test(s), reason: "contains 'Recommendation'" },
  { test: (s) => /why this works/i.test(s), reason: "contains 'Why this works'" },
  { test: (s) => s.includes('Hebrew:'), reason: "contains 'Hebrew:'" },
  { test: (s) => s.includes('Russian:'), reason: "contains 'Russian:'" },
  { test: (s) => s.includes('English:'), reason: "contains 'English:'" },
  { test: (s) => /notes on translation/i.test(s), reason: "contains 'Notes on translation'" },
  { test: (s) => /^Note:/m.test(s), reason: "contains 'Note:' at start of line" },
  { test: (s) => /^Translation:/m.test(s), reason: "contains 'Translation:' at start" },
  { test: (s) => /^Output:/m.test(s), reason: "contains 'Output:' at start" },
  { test: (s) => /translated text:/i.test(s), reason: "contains 'Translated text:'" },
];

const LENGTH_BOUNDS: Record<string, { min: number; max: number }> = {
  seo_title: { min: 20, max: 80 },
  seo_description: { min: 80, max: 200 },
  description: { min: 100, max: 500 },
  alt_text: { min: 30, max: 200 },
};

export function validateTranslation(
  content: string,
  contentType: string
): { valid: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      return { valid: false, reason: pattern.reason };
    }
  }

  const bounds = LENGTH_BOUNDS[contentType];
  if (bounds) {
    if (content.length < bounds.min) {
      return { valid: false, reason: `too short (${content.length} < ${bounds.min} for ${contentType})` };
    }
    if (content.length > bounds.max) {
      return { valid: false, reason: `too long (${content.length} > ${bounds.max} for ${contentType})` };
    }
  }

  return { valid: true };
}

// ─── Validate+retry wrappers (wrapper contamination prevention) ────
const STRICT_SUFFIX = `\n\nSTRICT MODE: Return ONLY the raw translated text. No headings (#), no bold (**), no horizontal rules (---), no "Alternative options", no "Character count", no "Recommendation", no "Why this works", no meta-commentary. Plain text only.`;

function validateFields(data: Record<string, string>, resolver: (k: string) => string): { key: string; reason: string }[] {
  const fails: { key: string; reason: string }[] = [];
  for (const [key, value] of Object.entries(data)) {
    const r = validateTranslation(value, resolver(key));
    if (!r.valid) fails.push({ key, reason: r.reason! });
  }
  return fails;
}

/** Validates each value in a JSON translations object. Retries with STRICT MODE on failure, throws on double failure. */
export async function validateAndRetryJson(
  translations: Record<string, string>, resolver: (key: string) => string,
  systemPrompt: string, userContent: string, maxTokens = 4096,
): Promise<Record<string, string>> {
  if (validateFields(translations, resolver).length === 0) return translations;
  console.warn(`[translate] Validation failed, retrying with STRICT MODE`);
  const retried = parseClaudeJson(await callClaude(systemPrompt, userContent + STRICT_SUFFIX, maxTokens));
  const fails = validateFields(retried, resolver);
  if (fails.length > 0) throw new Error(`Validation failed after retry: ${fails.map(f => `${f.key}: ${f.reason}`).join('; ')}`);
  console.log(`[translate] Retry succeeded — all fields valid`);
  return retried;
}

/** Validates a single translated string. Retries with STRICT MODE on failure, throws on double failure. */
export async function validateAndRetryText(
  translated: string, contentType: string,
  systemPrompt: string, userContent: string, maxTokens = 4096,
): Promise<string> {
  const r = validateTranslation(translated, contentType);
  if (r.valid) return translated;
  console.warn(`[translate] Text validation failed: ${r.reason}, retrying`);
  const retried = await callClaude(systemPrompt, userContent + STRICT_SUFFIX, maxTokens);
  const r2 = validateTranslation(retried, contentType);
  if (!r2.valid) throw new Error(`Text validation failed after retry: ${r2.reason}`);
  console.log(`[translate] Text retry succeeded`);
  return retried;
}
