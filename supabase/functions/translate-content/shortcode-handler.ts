/**
 * Shortcode extraction, translation, and reinsertion for text blocks.
 *
 * When a text/custom block contains shortcodes like [cta text="..." ...],
 * we extract them, translate their translatable attributes, and reinsert.
 */

import { SHORTCODE_TRANSLATABLE_ATTRS } from './field-maps.ts';

const SHORTCODE_REGEX = /\[(\w+)((?:\s+[\w\u0590-\u05FF]+="[^"]*")*)\s*\]/g;
const ATTR_REGEX = /([\w\u0590-\u05FF]+)="([^"]*)"/g;

interface ExtractedShortcodes {
  cleaned: string;
  shortcodes: Map<string, string>;
}

/**
 * Extract shortcodes from HTML, replacing them with placeholders.
 */
export function extractShortcodes(html: string): ExtractedShortcodes {
  const shortcodes = new Map<string, string>();
  let counter = 0;

  const cleaned = html.replace(SHORTCODE_REGEX, (match) => {
    const placeholder = `__SC_${counter}__`;
    shortcodes.set(placeholder, match);
    counter++;
    return placeholder;
  });

  return { cleaned, shortcodes };
}

/**
 * Collect translatable text from all shortcodes for batch translation.
 * Returns a map of "SC_{n}_attrName" -> text to translate.
 */
export function collectShortcodeTexts(
  shortcodes: Map<string, string>
): Record<string, string> {
  const texts: Record<string, string> = {};

  for (const [placeholder, raw] of shortcodes) {
    const typeMatch = raw.match(/^\[(\w+)/);
    if (!typeMatch) continue;
    const scType = typeMatch[1];
    const translatableAttrs = SHORTCODE_TRANSLATABLE_ATTRS[scType] ?? [];
    if (translatableAttrs.length === 0) continue;

    // Parse attributes
    let attrMatch;
    ATTR_REGEX.lastIndex = 0;
    while ((attrMatch = ATTR_REGEX.exec(raw)) !== null) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2];
      if (translatableAttrs.includes(attrName) && attrValue.trim()) {
        const key = `${placeholder}_${attrName}`;
        texts[key] = attrValue;
      }
    }
  }

  return texts;
}

/**
 * Apply translated attribute values back into shortcodes.
 */
export function applyTranslatedShortcodes(
  shortcodes: Map<string, string>,
  translations: Record<string, string>
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [placeholder, raw] of shortcodes) {
    let updated = raw;

    for (const [key, translated] of Object.entries(translations)) {
      if (!key.startsWith(placeholder + '_')) continue;
      const attrName = key.slice(placeholder.length + 1);
      // Replace the attribute value in the shortcode
      const regex = new RegExp(`(${attrName}=")([^"]*)(")`, 'g');
      updated = updated.replace(regex, `$1${translated}$3`);
    }

    result.set(placeholder, updated);
  }

  return result;
}

/**
 * Reinsert shortcodes into translated HTML, replacing placeholders.
 */
export function reinsertShortcodes(
  translatedHtml: string,
  shortcodes: Map<string, string>
): string {
  let result = translatedHtml;
  for (const [placeholder, shortcode] of shortcodes) {
    result = result.replace(placeholder, shortcode);
  }
  return result;
}
