// supabase/functions/generate-brand-content/validators.ts

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

const REQUIRED_FIELDS = ["tagline", "description1", "description2", "seo_title", "seo_description"] as const;

// Patterns that indicate wrapper contamination (markdown, commentary, meta-text)
const WRAPPER_PATTERNS: RegExp[] = [
  /^#{1,3}\s/m,                        // Lines starting with #, ##, ###
  /\*\*[^*]+\*\*/,                     // **bold**
  /__[^_]+__/,                         // __bold__
  /^---$/m,                            // Horizontal rule
  /```/,                               // Code fences
  /Alternative:/i,
  /Recommendation:/i,
  /Why this works:/i,
  /Notes on translation:/i,
  /Notes:/i,
  /Hebrew:/i,
  /English:/i,
  /Russian:/i,
  /\(50-60 characters\)/i,
  /\(approximately/i,
  /\(around /i,
  /\[Hebrew\]/i,
  /\[Translation\]/i,
  /Character count:/i,
  /Char count:/i,
];

interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export function validateGenerateOutput(output: unknown): ValidationResult {
  const reasons: string[] = [];
  const obj = output as Record<string, unknown>;

  // Required fields check
  for (const field of REQUIRED_FIELDS) {
    if (!obj[field] || typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      reasons.push(`Missing or empty required field: ${field}`);
    }
  }

  // If fields are missing, skip further checks
  if (reasons.length > 0) {
    return { valid: false, reasons };
  }

  const tagline = obj.tagline as string;
  const desc1 = obj.description1 as string;
  const desc2 = obj.description2 as string;
  const seoTitle = obj.seo_title as string;
  const seoDesc = obj.seo_description as string;

  const fields: Record<string, string> = { tagline, description1: desc1, description2: desc2, seo_title: seoTitle, seo_description: seoDesc };

  // Wrapper detection on all fields
  for (const [name, value] of Object.entries(fields)) {
    for (const pat of WRAPPER_PATTERNS) {
      if (pat.test(value)) {
        reasons.push(`Wrapper contamination in ${name}: matched pattern ${pat.source}`);
        break; // one failure per field is enough
      }
    }
  }

  // Length checks (plain text via stripHtml)
  const taglinePlain = stripHtml(tagline);
  const desc1Plain = stripHtml(desc1);
  const desc2Plain = stripHtml(desc2);

  if (taglinePlain.length < 30 || taglinePlain.length > 100) {
    reasons.push(`tagline plain length ${taglinePlain.length} outside 30-100 range`);
  }
  if (desc1Plain.length < 400 || desc1Plain.length > 700) {
    reasons.push(`description1 plain length ${desc1Plain.length} outside 400-700 range`);
  }
  if (desc2Plain.length < 100 || desc2Plain.length > 300) {
    reasons.push(`description2 plain length ${desc2Plain.length} outside 100-300 range`);
  }
  if (seoTitle.length < 40 || seoTitle.length > 70) {
    reasons.push(`seo_title raw length ${seoTitle.length} outside 40-70 range`);
  }
  if (seoDesc.length < 120 || seoDesc.length > 180) {
    reasons.push(`seo_description raw length ${seoDesc.length} outside 120-180 range`);
  }

  // HTML structure checks
  const desc1PCount = (desc1.match(/<p[\s>]/g) || []).length;
  if (desc1PCount < 3) {
    reasons.push(`description1 has ${desc1PCount} <p> tags, need at least 3`);
  }
  const desc2PCount = (desc2.match(/<p[\s>]/g) || []).length;
  if (desc2PCount < 1) {
    reasons.push(`description2 has ${desc2PCount} <p> tags, need at least 1`);
  }

  // tagline, seo_title, seo_description must NOT contain HTML tags
  for (const name of ["tagline", "seo_title", "seo_description"] as const) {
    const val = fields[name];
    if (/<[a-z][^>]*>/i.test(val)) {
      reasons.push(`${name} must not contain HTML tags`);
    }
  }

  // Local SEO: description2 must contain Ashkelon + Prizma
  if (!desc2.includes("\u05D0\u05E9\u05E7\u05DC\u05D5\u05DF")) {
    reasons.push(`description2 missing "\u05D0\u05E9\u05E7\u05DC\u05D5\u05DF" (Ashkelon)`);
  }
  if (!desc2.includes("\u05E4\u05E8\u05D9\u05D6\u05DE\u05D4")) {
    reasons.push(`description2 missing "\u05E4\u05E8\u05D9\u05D6\u05DE\u05D4" (Prizma)`);
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateTranslateOutput(
  output: unknown,
  targetLang: "en" | "ru",
): ValidationResult {
  const reasons: string[] = [];
  const obj = output as Record<string, unknown>;

  // Required fields check
  for (const field of REQUIRED_FIELDS) {
    if (!obj[field] || typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      reasons.push(`Missing or empty required field: ${field}`);
    }
  }

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }

  const tagline = obj.tagline as string;
  const desc1 = obj.description1 as string;
  const desc2 = obj.description2 as string;
  const seoTitle = obj.seo_title as string;
  const seoDesc = obj.seo_description as string;

  const fields: Record<string, string> = { tagline, description1: desc1, description2: desc2, seo_title: seoTitle, seo_description: seoDesc };

  // Wrapper detection on all fields
  for (const [name, value] of Object.entries(fields)) {
    for (const pat of WRAPPER_PATTERNS) {
      if (pat.test(value)) {
        reasons.push(`Wrapper contamination in ${name}: matched pattern ${pat.source}`);
        break;
      }
    }
  }

  // Length checks (same loose bounds as generate)
  const taglinePlain = stripHtml(tagline);
  const desc1Plain = stripHtml(desc1);
  const desc2Plain = stripHtml(desc2);

  if (taglinePlain.length < 30 || taglinePlain.length > 100) {
    reasons.push(`tagline plain length ${taglinePlain.length} outside 30-100 range`);
  }
  if (desc1Plain.length < 400 || desc1Plain.length > 700) {
    reasons.push(`description1 plain length ${desc1Plain.length} outside 400-700 range`);
  }
  if (desc2Plain.length < 100 || desc2Plain.length > 300) {
    reasons.push(`description2 plain length ${desc2Plain.length} outside 100-300 range`);
  }
  if (seoTitle.length < 40 || seoTitle.length > 70) {
    reasons.push(`seo_title raw length ${seoTitle.length} outside 40-70 range`);
  }
  if (seoDesc.length < 120 || seoDesc.length > 180) {
    reasons.push(`seo_description raw length ${seoDesc.length} outside 120-180 range`);
  }

  // HTML structure checks
  const desc1PCount = (desc1.match(/<p[\s>]/g) || []).length;
  if (desc1PCount < 3) {
    reasons.push(`description1 has ${desc1PCount} <p> tags, need at least 3`);
  }
  const desc2PCount = (desc2.match(/<p[\s>]/g) || []).length;
  if (desc2PCount < 1) {
    reasons.push(`description2 has ${desc2PCount} <p> tags, need at least 1`);
  }

  for (const name of ["tagline", "seo_title", "seo_description"] as const) {
    const val = fields[name];
    if (/<[a-z][^>]*>/i.test(val)) {
      reasons.push(`${name} must not contain HTML tags`);
    }
  }

  // Language script check (replaces Hebrew keywords check)
  const HEBREW_RE = /[\u0590-\u05FF]/;
  const CYRILLIC_RE = /[\u0400-\u04FF]/;
  const LATIN_RE = /[a-zA-Z]/g;
  const CYRILLIC_LETTER_RE = /[\u0400-\u04FF]/g;

  for (const [name, value] of Object.entries(fields)) {
    const plain = stripHtml(value);

    if (targetLang === "en") {
      const latinCount = (plain.match(LATIN_RE) || []).length;
      if (latinCount < 5) {
        reasons.push(`${name}: expected at least 5 Latin letters for EN, found ${latinCount}`);
      }
      if (HEBREW_RE.test(plain)) {
        reasons.push(`${name}: contains Hebrew characters, forbidden in EN translation`);
      }
      if (CYRILLIC_RE.test(plain)) {
        reasons.push(`${name}: contains Cyrillic characters, forbidden in EN translation`);
      }
    } else if (targetLang === "ru") {
      const cyrCount = (plain.match(CYRILLIC_LETTER_RE) || []).length;
      if (cyrCount < 5) {
        reasons.push(`${name}: expected at least 5 Cyrillic letters for RU, found ${cyrCount}`);
      }
      if (HEBREW_RE.test(plain)) {
        reasons.push(`${name}: contains Hebrew characters, forbidden in RU translation`);
      }
      // Latin allowed in RU (brand names)
    }
  }

  return { valid: reasons.length === 0, reasons };
}
